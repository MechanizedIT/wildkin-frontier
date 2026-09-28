using System;
using System.Collections.Generic;
using System.Diagnostics;

namespace Wildkin.Matter
{
    public readonly struct MatterDomainRegionHash
    {
        public readonly MatterBrickAddress Address;
        public readonly ulong Hash;
        public MatterDomainRegionHash(MatterBrickAddress address, ulong hash)
        { Address = address; Hash = hash; }
    }

    /// <summary>Measurements and immutable-for-this-build mesh snapshot from one domain revision.</summary>
    public sealed class MatterDomainMeshBuildResult
    {
        private readonly object _domainPublicationIdentity;
        public string DomainId { get; }
        public long ContentRevision { get; }
        public MatterMeshData Mesh { get; }
        public int RegionCount { get; }
        public int DirectlyChangedRegionCount { get; }
        public IReadOnlyList<MatterBrickAddress> DirectlyChangedRegions { get; }
        public int RebuiltRegionCount { get; }
        public IReadOnlyList<MatterBrickAddress> RebuiltRegions { get; }
        public int ReusedRegionCount { get; }
        public int ChangedSampleCount { get; }
        public double RebuiltMesherCpuMilliseconds { get; }
        public double RebuiltRegionWallMilliseconds { get; }
        public double CombineMilliseconds { get; }
        public double PublicationMilliseconds { get; private set; }
        public bool Published { get; private set; }

        internal MatterDomainMeshBuildResult(string domainId, long contentRevision, object domainPublicationIdentity,
            MatterMeshData mesh,
            int regionCount, IReadOnlyList<MatterBrickAddress> directlyChangedRegions,
            IReadOnlyList<MatterBrickAddress> rebuiltRegions, int directlyChangedRegionCount,
            int rebuiltRegionCount, int reusedRegionCount, int changedSampleCount,
            double rebuiltMesherCpuMilliseconds, double rebuiltRegionWallMilliseconds, double combineMilliseconds)
        {
            DomainId = domainId;
            ContentRevision = contentRevision;
            _domainPublicationIdentity = domainPublicationIdentity ?? throw new ArgumentNullException(nameof(domainPublicationIdentity));
            Mesh = mesh;
            RegionCount = regionCount;
            DirectlyChangedRegions = Array.AsReadOnly(Copy(directlyChangedRegions));
            RebuiltRegions = Array.AsReadOnly(Copy(rebuiltRegions));
            DirectlyChangedRegionCount = directlyChangedRegionCount;
            RebuiltRegionCount = rebuiltRegionCount;
            ReusedRegionCount = reusedRegionCount;
            ChangedSampleCount = changedSampleCount;
            RebuiltMesherCpuMilliseconds = rebuiltMesherCpuMilliseconds;
            RebuiltRegionWallMilliseconds = rebuiltRegionWallMilliseconds;
            CombineMilliseconds = combineMilliseconds;
        }

        private static MatterBrickAddress[] Copy(IReadOnlyList<MatterBrickAddress> values)
        {
            if (values == null || values.Count == 0) return Array.Empty<MatterBrickAddress>();
            var copy = new MatterBrickAddress[values.Count];
            for (int index = 0; index < values.Count; index++) copy[index] = values[index];
            return copy;
        }

        /// <summary>Publishes only to the exact domain instance and content revision that was meshed.</summary>
        public bool TryPublishTo(MatterDomain domain)
        {
            if (domain == null) throw new ArgumentNullException(nameof(domain));
            var watch = Stopwatch.StartNew();
            bool accepted = ReferenceEquals(domain.PublicationIdentity, _domainPublicationIdentity) &&
                string.Equals(domain.Id, DomainId, StringComparison.Ordinal) &&
                domain.TryPublishMesh(ContentRevision, Mesh.DeterministicHash);
            watch.Stop();
            PublicationMilliseconds += watch.Elapsed.TotalMilliseconds;
            Published = accepted;
            return accepted;
        }
    }

    /// <summary>
    /// Incremental fixed-resolution Surface Nets for one bounded local domain. Each local tile
    /// owns the same 16-cell region and one-sample halo contract as MatterWorld. Tiles never
    /// exchange samples or resample one another; their shared surface keys weld only identical
    /// patches from the one authoritative domain field.
    /// </summary>
    public sealed class MatterDomainSurfaceNetsMesher
    {
        private readonly MatterSurfaceNetsMesher _mesher = new MatterSurfaceNetsMesher();
        private Dictionary<MatterBrickAddress, MatterMeshData> _regions;
        private MatterDomainMeshBuildResult _lastBuild;
        private object _domainPublicationIdentity;
        private MatterBounds _bounds;
        private float _spacing;
        private long _cachedContentRevision = -1;

        public MatterDomainRegionHash[] GetRegionHashesSorted()
        {
            if (_regions == null) return Array.Empty<MatterDomainRegionHash>();
            var ordered = SortRegions(_regions.Keys);
            var result = new MatterDomainRegionHash[ordered.Count];
            for (int index = 0; index < ordered.Count; index++)
                result[index] = new MatterDomainRegionHash(ordered[index], _regions[ordered[index]].DeterministicHash);
            return result;
        }

        public MatterDomainMeshBuildResult Build(MatterDomain domain,
            IReadOnlyList<MatterSampleAddress> changedSamples = null)
        {
            if (domain == null) throw new ArgumentNullException(nameof(domain));
            bool sameLayout = _regions != null && ReferenceEquals(_domainPublicationIdentity, domain.PublicationIdentity) &&
                _bounds.MinInclusive == domain.SampleBounds.MinInclusive &&
                _bounds.MaxExclusive == domain.SampleBounds.MaxExclusive && _spacing.Equals(domain.SampleSpacingMeters);
            bool noChange = sameLayout && _cachedContentRevision == domain.ContentRevision &&
                (changedSamples == null || changedSamples.Count == 0);
            if (noChange)
            {
                _lastBuild = new MatterDomainMeshBuildResult(domain.Id, domain.ContentRevision,
                    domain.PublicationIdentity, _lastBuild.Mesh,
                    _regions.Count, null, null, 0, 0, _regions.Count, 0, 0d, 0d, 0d);
                return _lastBuild;
            }

            bool incremental = sameLayout && changedSamples != null && changedSamples.Count > 0 &&
                _cachedContentRevision < long.MaxValue && domain.ContentRevision == _cachedContentRevision + 1;
            var nextRegions = sameLayout
                ? new Dictionary<MatterBrickAddress, MatterMeshData>(_regions)
                : new Dictionary<MatterBrickAddress, MatterMeshData>();
            HashSet<MatterBrickAddress> rebuild = incremental
                ? GetAffectedRegions(changedSamples)
                : GetAllRegions(domain.SampleBounds);
            List<MatterBrickAddress> directlyChangedRegions = changedSamples == null || changedSamples.Count == 0
                ? new List<MatterBrickAddress>()
                : SortRegions(GetDirectlyChangedRegions(changedSamples));
            if (incremental)
            {
                // Fixed bounds mean every candidate should already have a cache entry. If not,
                // abandon the partial update and rebuild the full bounded set.
                foreach (MatterBrickAddress key in rebuild)
                    if (!nextRegions.ContainsKey(key)) { incremental = false; break; }
                if (!incremental)
                {
                    nextRegions.Clear();
                    rebuild = GetAllRegions(domain.SampleBounds);
                }
            }

            var regionWatch = Stopwatch.StartNew();
            double mesherCpuMilliseconds = 0d;
            foreach (MatterBrickAddress key in SortRegions(rebuild))
            {
                MatterMeshData part = _mesher.Generate(MatterMeshingRegion.CaptureGrid(domain, key));
                nextRegions[key] = part;
                mesherCpuMilliseconds += part.GenerationMilliseconds;
            }
            regionWatch.Stop();

            var combineWatch = Stopwatch.StartNew();
            MatterMeshData combined = Combine(nextRegions);
            combineWatch.Stop();

            int regionCount = nextRegions.Count;
            int rebuiltCount = rebuild.Count;
            int reusedCount = Math.Max(0, regionCount - rebuiltCount);
            List<MatterBrickAddress> rebuiltRegions = SortRegions(rebuild);
            var result = new MatterDomainMeshBuildResult(domain.Id, domain.ContentRevision,
                domain.PublicationIdentity, combined,
                regionCount, directlyChangedRegions, rebuiltRegions, directlyChangedRegions.Count, rebuiltCount, reusedCount,
                incremental ? changedSamples.Count : changedSamples?.Count ?? 0,
                mesherCpuMilliseconds, regionWatch.Elapsed.TotalMilliseconds, combineWatch.Elapsed.TotalMilliseconds);

            _regions = nextRegions;
            _domainPublicationIdentity = domain.PublicationIdentity;
            _bounds = domain.SampleBounds;
            _spacing = domain.SampleSpacingMeters;
            _cachedContentRevision = domain.ContentRevision;
            _lastBuild = result;
            return result;
        }

        /// <summary>One-shot regional mesh from any read-only grid, used for immutable world previews.</summary>
        public static MatterMeshData BuildReadOnlyGrid(IMatterReadOnlyGrid grid, MatterBounds sampleBounds,
            out int regionCount, out double mesherCpuMilliseconds, out double regionWallMilliseconds,
            out double combineMilliseconds)
        {
            if (grid == null) throw new ArgumentNullException(nameof(grid));
            if (float.IsNaN(grid.SampleSpacingMeters) || float.IsInfinity(grid.SampleSpacingMeters) ||
                grid.SampleSpacingMeters <= 0f)
                throw new ArgumentOutOfRangeException(nameof(grid), "Read-only grid spacing must be finite and positive.");

            var keys = GetAllRegions(sampleBounds);
            var ordered = SortRegions(keys);
            var parts = new Dictionary<MatterBrickAddress, MatterMeshData>(keys.Count);
            var mesher = new MatterSurfaceNetsMesher();
            mesherCpuMilliseconds = 0d;
            var regionWatch = Stopwatch.StartNew();
            foreach (MatterBrickAddress key in ordered)
            {
                MatterMeshData part = mesher.Generate(MatterMeshingRegion.CaptureGrid(grid, key));
                parts.Add(key, part);
                mesherCpuMilliseconds += part.GenerationMilliseconds;
            }
            regionWatch.Stop();
            regionCount = parts.Count;
            regionWallMilliseconds = regionWatch.Elapsed.TotalMilliseconds;
            var combineWatch = Stopwatch.StartNew();
            MatterMeshData combined = Combine(parts);
            combineWatch.Stop();
            combineMilliseconds = combineWatch.Elapsed.TotalMilliseconds;
            return combined;
        }

        public void Clear()
        {
            _regions = null;
            _lastBuild = null;
            _domainPublicationIdentity = null;
            _cachedContentRevision = -1;
        }

        private static MatterMeshData Combine(Dictionary<MatterBrickAddress, MatterMeshData> regions)
        {
            var ordered = SortRegions(regions.Keys);
            var vertexIndices = new Dictionary<MatterSurfaceVertexKey, int>();
            var vertices = new List<MatterMeshVertex>();
            var cells = new List<MatterInt3>();
            var surfaceKeys = new List<MatterSurfaceVertexKey>();
            var indices = new List<int>();
            int skipped = 0, qefFallbacks = 0, qefClamped = 0;
            int activeCells = 0, ambiguousCells = 0, ambiguousFaces = 0, multiComponentCells = 0;
            int maximumComponents = 0, additionalVertices = 0, mappedEdges = 0, missingMappings = 0;
            double kernelMilliseconds = 0d;

            foreach (MatterBrickAddress key in ordered)
            {
                MatterMeshData part = regions[key];
                skipped += part.SkippedDegenerateTriangles;
                qefFallbacks += part.QefFallbackCount;
                qefClamped += part.QefClampedVertexCount;
                activeCells += part.ActiveCellCount;
                ambiguousCells += part.AmbiguousCellCount;
                ambiguousFaces += part.AmbiguousFaceCount;
                multiComponentCells += part.MultiComponentCellCount;
                maximumComponents = Math.Max(maximumComponents, part.MaximumComponentsPerCell);
                additionalVertices += part.AdditionalSurfaceVertexCount;
                mappedEdges += part.MappedCrossingEdgeCount;
                missingMappings += part.MissingCrossingEdgeMappings;
                kernelMilliseconds += part.GenerationMilliseconds;

                for (int triangleIndex = 0; triangleIndex < part.Indices.Length; triangleIndex++)
                {
                    int localIndex = part.Indices[triangleIndex];
                    MatterSurfaceVertexKey surfaceKey = part.VertexSurfaceKeys[localIndex];
                    if (!vertexIndices.TryGetValue(surfaceKey, out int combinedIndex))
                    {
                        combinedIndex = vertices.Count;
                        vertexIndices.Add(surfaceKey, combinedIndex);
                        vertices.Add(part.Vertices[localIndex]);
                        cells.Add(part.VertexCellAddresses[localIndex]);
                        surfaceKeys.Add(surfaceKey);
                    }
                    else if (!SameVertex(vertices[combinedIndex], part.Vertices[localIndex]))
                    {
                        throw new InvalidOperationException("Neighboring local tiles disagree on a shared topology-safe surface key.");
                    }
                    indices.Add(combinedIndex);
                }
            }

            return new MatterMeshData(MatterMesherKind.SurfaceNets, vertices.ToArray(), indices.ToArray(),
                skipped, qefFallbacks, qefClamped, regions.Count == 0 ? 0f : regions[ordered[0]].CellSpacingMeters,
                cells.ToArray(), surfaceKeys.ToArray(), activeCells, ambiguousCells, ambiguousFaces,
                multiComponentCells, maximumComponents, additionalVertices, mappedEdges, missingMappings,
                kernelMilliseconds);
        }

        private static bool SameVertex(MatterMeshVertex left, MatterMeshVertex right)
            => left.PositionMeters.X.Equals(right.PositionMeters.X) &&
               left.PositionMeters.Y.Equals(right.PositionMeters.Y) &&
               left.PositionMeters.Z.Equals(right.PositionMeters.Z) &&
               left.Normal.X.Equals(right.Normal.X) && left.Normal.Y.Equals(right.Normal.Y) &&
               left.Normal.Z.Equals(right.Normal.Z) && left.RockWeight == right.RockWeight &&
               left.DirtWeight == right.DirtWeight;

        private static HashSet<MatterBrickAddress> GetAffectedRegions(IReadOnlyList<MatterSampleAddress> samples)
        {
            var affected = new HashSet<MatterBrickAddress>();
            for (int i = 0; i < samples.Count; i++)
            {
                MatterSampleAddress sample = samples[i];
                int minX = FloorDiv((long)sample.X - 1, MatterBrickLayout.CellSize);
                int minY = FloorDiv((long)sample.Y - 1, MatterBrickLayout.CellSize);
                int minZ = FloorDiv((long)sample.Z - 1, MatterBrickLayout.CellSize);
                int maxX = MatterBrickLayout.FloorDiv(sample.X, MatterBrickLayout.CellSize);
                int maxY = MatterBrickLayout.FloorDiv(sample.Y, MatterBrickLayout.CellSize);
                int maxZ = MatterBrickLayout.FloorDiv(sample.Z, MatterBrickLayout.CellSize);
                for (int z = minZ; z <= maxZ; z++)
                for (int y = minY; y <= maxY; y++)
                for (int x = minX; x <= maxX; x++) affected.Add(new MatterBrickAddress(x, y, z));
            }
            return affected;
        }

        private static HashSet<MatterBrickAddress> GetDirectlyChangedRegions(IReadOnlyList<MatterSampleAddress> samples)
        {
            var direct = new HashSet<MatterBrickAddress>();
            for (int index = 0; index < samples.Count; index++)
            {
                MatterSampleAddress sample = samples[index];
                MatterBrickLayout.Resolve(sample, out MatterBrickAddress address, out _);
                direct.Add(address);
            }
            return direct;
        }

        private static HashSet<MatterBrickAddress> GetAllRegions(MatterBounds bounds)
        {
            int minX = FloorDiv((long)bounds.MinInclusive.X - 1, MatterBrickLayout.CellSize);
            int minY = FloorDiv((long)bounds.MinInclusive.Y - 1, MatterBrickLayout.CellSize);
            int minZ = FloorDiv((long)bounds.MinInclusive.Z - 1, MatterBrickLayout.CellSize);
            int maxX = MatterBrickLayout.FloorDiv(bounds.MaxExclusive.X - 1, MatterBrickLayout.CellSize);
            int maxY = MatterBrickLayout.FloorDiv(bounds.MaxExclusive.Y - 1, MatterBrickLayout.CellSize);
            int maxZ = MatterBrickLayout.FloorDiv(bounds.MaxExclusive.Z - 1, MatterBrickLayout.CellSize);
            var result = new HashSet<MatterBrickAddress>();
            for (int z = minZ; z <= maxZ; z++)
            for (int y = minY; y <= maxY; y++)
            for (int x = minX; x <= maxX; x++) result.Add(new MatterBrickAddress(x, y, z));
            return result;
        }

        private static int FloorDiv(long value, int divisor)
        {
            long quotient = value / divisor;
            long remainder = value % divisor;
            if (remainder < 0) quotient--;
            return checked((int)quotient);
        }

        private static List<MatterBrickAddress> SortRegions(IEnumerable<MatterBrickAddress> regions)
        {
            var ordered = new List<MatterBrickAddress>(regions);
            ordered.Sort((left, right) =>
            {
                int z = left.Z.CompareTo(right.Z);
                if (z != 0) return z;
                int y = left.Y.CompareTo(right.Y);
                return y != 0 ? y : left.X.CompareTo(right.X);
            });
            return ordered;
        }
    }
}
