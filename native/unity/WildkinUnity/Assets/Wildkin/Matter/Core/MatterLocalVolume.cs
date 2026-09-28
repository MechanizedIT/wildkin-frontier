using System;
using System.Collections.Generic;
using System.Diagnostics;

namespace Wildkin.Matter
{
    public interface IMatterReadOnlyGrid
    {
        float SampleSpacingMeters { get; }
        MatterSample ReadSample(MatterSampleAddress address);
    }

    /// <summary>Bounded U4C2 experiment: contiguous true-SDF densities and materials, no edits/persistence/physics.</summary>
    public sealed class MatterLocalVolume : IMatterReadOnlyGrid
    {
        private readonly float[] _density;
        private readonly byte[] _material;
        public MatterBounds Bounds { get; }
        public float SampleSpacingMeters { get; }
        public int SampleCount => _density.Length;
        public int OccupiedCount { get; private set; }
        public long RawBytes => SampleCount * 5L;
        public double SamplingMilliseconds { get; }
        public bool ClippedControl { get; }
        public int SkippedDegenerateTriangles { get; private set; }

        public MatterLocalVolume(SculptedStoneMesh source, float spacing, bool clippedControl = false)
        {
            if (source == null) throw new ArgumentNullException(nameof(source));
            if (spacing != .5f && spacing != .25f && spacing != .125f && spacing != .0625f)
                throw new ArgumentOutOfRangeException(nameof(spacing));
            SampleSpacingMeters = spacing; ClippedControl = clippedControl;
            MatterFloat3 min = source.BoundsMin, max = source.BoundsMax;
            Bounds = new MatterBounds(new MatterInt3((int)Math.Floor(min.X / spacing) - 2, (int)Math.Floor(min.Y / spacing) - 2,
                (int)Math.Floor(min.Z / spacing) - 2), new MatterInt3((int)Math.Ceiling(max.X / spacing) + 3,
                (int)Math.Ceiling(max.Y / spacing) + 3, (int)Math.Ceiling(max.Z / spacing) + 3));
            int count = checked(Bounds.Size.X * Bounds.Size.Y * Bounds.Size.Z);
            if (count > 2 * 1024 * 1024) throw new ArgumentOutOfRangeException(nameof(source), "Local fidelity experiment capped at two million samples.");
            _density = new float[count]; _material = new byte[count];
            var sampler = new SourceMeshSignedDistance(source); var watch = Stopwatch.StartNew();
            for (int z = 0; z < Bounds.Size.Z; z++)
            for (int y = 0; y < Bounds.Size.Y; y++)
            for (int x = 0; x < Bounds.Size.X; x++)
            {
                float d = sampler.Sample(new MatterFloat3((Bounds.MinInclusive.X + x) * spacing,
                    (Bounds.MinInclusive.Y + y) * spacing, (Bounds.MinInclusive.Z + z) * spacing));
                int index = Index(x, y, z);
                // Historical control retains positive interior distance, but replaces all exterior distances with fixed air.
                _density[index] = clippedControl && d <= 0 ? -spacing : d;
                _material[index] = d > 0 ? (byte)MatterMaterialId.Rock : (byte)MatterMaterialId.Air;
                if (d > 0) OccupiedCount++;
            }
            watch.Stop(); SamplingMilliseconds = watch.Elapsed.TotalMilliseconds;
        }

        public MatterSample ReadSample(MatterSampleAddress address)
        {
            if (!Bounds.Contains(address)) return new MatterSample(-SampleSpacingMeters, MatterMaterialId.Air);
            MatterInt3 local = address.Coordinates - Bounds.MinInclusive;
            int index = Index(local.X, local.Y, local.Z);
            return new MatterSample(_density[index], (MatterMaterialId)_material[index]);
        }

        public float Trilinear(MatterFloat3 p)
        {
            double x = p.X / SampleSpacingMeters, y = p.Y / SampleSpacingMeters, z = p.Z / SampleSpacingMeters;
            int ix = (int)Math.Floor(x), iy = (int)Math.Floor(y), iz = (int)Math.Floor(z);
            double result = 0;
            for (int dz = 0; dz <= 1; dz++)
            for (int dy = 0; dy <= 1; dy++)
            for (int dx = 0; dx <= 1; dx++)
                result += ReadSample(new MatterSampleAddress(ix + dx, iy + dy, iz + dz)).Density *
                    (dx == 0 ? 1 - (x - ix) : x - ix) * (dy == 0 ? 1 - (y - iy) : y - iy) * (dz == 0 ? 1 - (z - iz) : z - iz);
            return (float)result;
        }

        public SculptedStoneMesh Reconstruct(out double meshingMilliseconds, out int regionCount)
        {
            var watch = Stopwatch.StartNew();
            var vertices = new List<MatterFloat3>(); var triangles = new List<int>();
            // Surface Nets owns one vertex per integer cell, not per rounded position.
            // Distinct cells can legitimately produce coincident points at a sharp sampled corner.
            var welded = new Dictionary<MatterInt3, int>();
            MatterBrickLayout.Resolve(new MatterSampleAddress(Bounds.MinInclusive), out MatterBrickAddress min, out _);
            MatterBrickLayout.Resolve(new MatterSampleAddress(Bounds.MaxExclusive - new MatterInt3(1, 1, 1)), out MatterBrickAddress max, out _);
            regionCount = 0; SkippedDegenerateTriangles = 0; var mesher = new MatterSurfaceNetsMesher();
            for (int z = min.Z; z <= max.Z; z++)
            for (int y = min.Y; y <= max.Y; y++)
            for (int x = min.X; x <= max.X; x++)
            {
                MatterMeshData part = mesher.Generate(MatterMeshingRegion.CaptureGrid(this, new MatterBrickAddress(x, y, z)));
                regionCount++;
                SkippedDegenerateTriangles += part.SkippedDegenerateTriangles;
                foreach (int index in part.Indices)
                {
                    MatterFloat3 p = part.Vertices[index].PositionMeters;
                    MatterInt3 key = part.VertexCellAddresses[index];
                    if (!welded.TryGetValue(key, out int global))
                    { global = vertices.Count; welded.Add(key, global); vertices.Add(p); }
                    triangles.Add(global);
                }
            }
            watch.Stop(); meshingMilliseconds = watch.Elapsed.TotalMilliseconds;
            return new SculptedStoneMesh(vertices.ToArray(), triangles.ToArray());
        }
        private int Index(int x, int y, int z) => x + Bounds.Size.X * (y + Bounds.Size.Y * z);
    }
}
