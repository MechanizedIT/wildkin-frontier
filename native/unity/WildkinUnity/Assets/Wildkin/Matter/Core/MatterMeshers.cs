using System;
using System.Collections.Generic;
using System.Diagnostics;

namespace Wildkin.Matter
{
    public enum MatterMesherKind : byte
    {
        SurfaceNets = 0,
        DualContouring = 1
    }

    /// <summary>
    /// A brick-sized output domain. The scalar window contains the 17^3 corners required by
    /// sixteen cells plus a one-sample negative halo so edge-owned dual faces can be emitted
    /// exactly once across independent neighboring meshes.
    /// </summary>
    public sealed class MatterMeshingRegion
    {
        public const int OwnedCellCount = MatterBrickLayout.CellSize;
        public const int ScalarWindowSide = OwnedCellCount + 2;
        public const int HaloCellCount = OwnedCellCount + 1;

        public MatterBrickAddress Brick { get; }
        public MatterInt3 CellOrigin { get; }
        public MatterInt3 SampleOrigin { get; }
        public MatterRegionSnapshot Samples { get; }
        public int ScalarSampleCount => Samples.SampleCount;
        public int ScalarBytes => ScalarSampleCount * MatterBrickLayout.RawBytesPerSample;

        private MatterMeshingRegion(MatterBrickAddress brick, MatterRegionSnapshot samples)
        {
            Brick = brick;
            MatterInt3 ownerOrigin = new MatterInt3(
                checked(brick.X * MatterBrickLayout.CellSize),
                checked(brick.Y * MatterBrickLayout.CellSize),
                checked(brick.Z * MatterBrickLayout.CellSize));
            CellOrigin = ownerOrigin - new MatterInt3(1, 1, 1);
            SampleOrigin = CellOrigin;
            Samples = samples;
        }

        public static MatterMeshingRegion Capture(MatterWorld world, MatterBrickAddress brick)
        {
            if (world == null) throw new ArgumentNullException(nameof(world));
            var owner = new MatterInt3(
                checked(brick.X * MatterBrickLayout.CellSize),
                checked(brick.Y * MatterBrickLayout.CellSize),
                checked(brick.Z * MatterBrickLayout.CellSize));
            var min = owner - new MatterInt3(1, 1, 1);
            var max = owner + new MatterInt3(MatterBrickLayout.CellSize + 1,
                MatterBrickLayout.CellSize + 1, MatterBrickLayout.CellSize + 1);
            MatterRegionSnapshot snapshot = MatterRegionSnapshot.Capture(world, new MatterBounds(min, max));
            return new MatterMeshingRegion(brick, snapshot);
        }

        public static MatterMeshingRegion CaptureGrid(IMatterReadOnlyGrid grid, MatterBrickAddress brick)
        {
            if (grid == null) throw new ArgumentNullException(nameof(grid));
            if (!(grid.SampleSpacingMeters > 0) || float.IsInfinity(grid.SampleSpacingMeters))
                throw new ArgumentOutOfRangeException(nameof(grid), "Read-only sample spacing must be finite and positive.");
            int side = MatterBrickLayout.CellSize;
            var owner = new MatterInt3(checked(brick.X * side), checked(brick.Y * side), checked(brick.Z * side));
            var bounds = new MatterBounds(owner - new MatterInt3(1, 1, 1), owner + new MatterInt3(side + 1, side + 1, side + 1));
            return new MatterMeshingRegion(brick, new MatterRegionSnapshot(grid, bounds));
        }

        public MatterSample GetSample(MatterInt3 globalAddress)
        {
            MatterInt3 local = globalAddress - SampleOrigin;
            return Samples.GetLocal(local);
        }

        internal MatterSample GetLocalSample(int x, int y, int z) => Samples.GetLocal(new MatterInt3(x, y, z));
    }

    public readonly struct MatterMeshVertex
    {
        public readonly MatterFloat3 PositionMeters;
        public readonly MatterFloat3 SourcePositionMeters;
        public readonly MatterFloat3 Normal;
        public readonly byte RockWeight;
        public readonly byte DirtWeight;

        public MatterMeshVertex(MatterFloat3 position, MatterFloat3 normal, byte rockWeight, byte dirtWeight)
        {
            PositionMeters = position;
            SourcePositionMeters = position;
            Normal = normal;
            RockWeight = rockWeight;
            DirtWeight = dirtWeight;
        }
    }

    /// <summary>Stable identity for one connected crossing-edge patch in a global cell.</summary>
    public readonly struct MatterSurfaceVertexKey : IEquatable<MatterSurfaceVertexKey>
    {
        public readonly MatterInt3 GlobalCellAddress;
        public readonly ushort CrossingEdgeComponentMask;

        public MatterSurfaceVertexKey(MatterInt3 globalCellAddress, ushort crossingEdgeComponentMask)
        { GlobalCellAddress = globalCellAddress; CrossingEdgeComponentMask = crossingEdgeComponentMask; }

        public bool Equals(MatterSurfaceVertexKey other)
            => GlobalCellAddress.Equals(other.GlobalCellAddress) && CrossingEdgeComponentMask == other.CrossingEdgeComponentMask;
        public override bool Equals(object obj) => obj is MatterSurfaceVertexKey other && Equals(other);
        public override int GetHashCode()
        {
            unchecked
            {
                int hash = GlobalCellAddress.GetHashCode();
                hash = (hash * 397) ^ CrossingEdgeComponentMask;
                return hash;
            }
        }
        public static bool operator ==(MatterSurfaceVertexKey left, MatterSurfaceVertexKey right) => left.Equals(right);
        public static bool operator !=(MatterSurfaceVertexKey left, MatterSurfaceVertexKey right) => !left.Equals(right);
    }

    public sealed class MatterMeshData
    {
        public MatterMesherKind Mesher { get; }
        public MatterMeshVertex[] Vertices { get; }
        public MatterInt3[] VertexCellAddresses { get; }
        public MatterSurfaceVertexKey[] VertexSurfaceKeys { get; }
        public int[] Indices { get; }
        public int TriangleCount => Indices.Length / 3;
        public int SkippedDegenerateTriangles { get; }
        public int QefFallbackCount { get; }
        public int QefClampedVertexCount { get; }
        public ulong DeterministicHash { get; }
        public float CellSpacingMeters { get; }
        public int ActiveCellCount { get; }
        public int AmbiguousCellCount { get; }
        public int AmbiguousFaceCount { get; }
        public int MultiComponentCellCount { get; }
        public int MaximumComponentsPerCell { get; }
        public int AdditionalSurfaceVertexCount { get; }
        public int MappedCrossingEdgeCount { get; }
        public int MissingCrossingEdgeMappings { get; }
        public double GenerationMilliseconds { get; }

        internal MatterMeshData(MatterMesherKind mesher, MatterMeshVertex[] vertices, int[] indices,
            int skippedDegenerateTriangles, int qefFallbackCount, int qefClampedVertexCount,
            float cellSpacingMeters, MatterInt3[] vertexCellAddresses, MatterSurfaceVertexKey[] vertexSurfaceKeys,
            int activeCellCount, int ambiguousCellCount, int ambiguousFaceCount, int multiComponentCellCount,
            int maximumComponentsPerCell, int additionalSurfaceVertexCount, int mappedCrossingEdgeCount,
            int missingCrossingEdgeMappings, double generationMilliseconds)
        {
            Mesher = mesher;
            Vertices = vertices;
            VertexCellAddresses = vertexCellAddresses;
            VertexSurfaceKeys = vertexSurfaceKeys;
            Indices = indices;
            SkippedDegenerateTriangles = skippedDegenerateTriangles;
            QefFallbackCount = qefFallbackCount;
            QefClampedVertexCount = qefClampedVertexCount;
            CellSpacingMeters = cellSpacingMeters;
            ActiveCellCount = activeCellCount;
            AmbiguousCellCount = ambiguousCellCount;
            AmbiguousFaceCount = ambiguousFaceCount;
            MultiComponentCellCount = multiComponentCellCount;
            MaximumComponentsPerCell = maximumComponentsPerCell;
            AdditionalSurfaceVertexCount = additionalSurfaceVertexCount;
            MappedCrossingEdgeCount = mappedCrossingEdgeCount;
            MissingCrossingEdgeMappings = missingCrossingEdgeMappings;
            GenerationMilliseconds = generationMilliseconds;
            DeterministicHash = ComputeHash(vertices, indices, mesher);
        }

        private static ulong ComputeHash(MatterMeshVertex[] vertices, int[] indices, MatterMesherKind mesher)
        {
            const ulong offsetBasis = 14695981039346656037UL;
            const ulong prime = 1099511628211UL;
            ulong hash = offsetBasis;
            HashByte(ref hash, (byte)mesher, prime);
            HashInt(ref hash, vertices.Length, prime);
            HashInt(ref hash, indices.Length, prime);
            for (int i = 0; i < vertices.Length; i++)
            {
                MatterMeshVertex vertex = vertices[i];
                HashFloat(ref hash, vertex.PositionMeters.X, prime);
                HashFloat(ref hash, vertex.PositionMeters.Y, prime);
                HashFloat(ref hash, vertex.PositionMeters.Z, prime);
                HashFloat(ref hash, vertex.Normal.X, prime);
                HashFloat(ref hash, vertex.Normal.Y, prime);
                HashFloat(ref hash, vertex.Normal.Z, prime);
                HashByte(ref hash, vertex.RockWeight, prime);
                HashByte(ref hash, vertex.DirtWeight, prime);
            }
            for (int i = 0; i < indices.Length; i++) HashInt(ref hash, indices[i], prime);
            return hash;
        }

        private static void HashFloat(ref ulong hash, float value, ulong prime)
        {
            int quantized = (int)Math.Round(value * 1000000.0, MidpointRounding.AwayFromZero);
            HashInt(ref hash, quantized, prime);
        }

        private static void HashInt(ref ulong hash, int value, ulong prime)
        {
            unchecked
            {
                uint bits = (uint)value;
                HashByte(ref hash, (byte)bits, prime);
                HashByte(ref hash, (byte)(bits >> 8), prime);
                HashByte(ref hash, (byte)(bits >> 16), prime);
                HashByte(ref hash, (byte)(bits >> 24), prime);
            }
        }

        private static void HashByte(ref ulong hash, byte value, ulong prime)
        {
            unchecked { hash = (hash ^ value) * prime; }
        }
    }

    public interface IMatterMesher
    {
        MatterMesherKind Kind { get; }
        MatterMeshData Generate(MatterMeshingRegion region);
    }

    /// <summary>
    /// One dual vertex per connected crossing-edge patch in each active cell, placed at that
    /// patch's Hermite-intersection centroid. Faces are emitted by globally edge-owned sample
    /// anchors, including the negative halo.
    /// </summary>
    public sealed class MatterSurfaceNetsMesher : IMatterMesher
    {
        public MatterMesherKind Kind => MatterMesherKind.SurfaceNets;
        public MatterMeshData Generate(MatterMeshingRegion region)
            => MatterMesherKernel.Generate(region, MatterMesherKind.SurfaceNets);
    }

    /// <summary>
    /// Bounded dual contouring with trilinear finite-difference Hermite normals, a regularized
    /// 3x3 least-squares QEF, cell clamping, and Hermite-centroid fallback for rank/number failure.
    /// </summary>
    public sealed class MatterDualContouringMesher : IMatterMesher
    {
        public MatterMesherKind Kind => MatterMesherKind.DualContouring;
        public MatterMeshData Generate(MatterMeshingRegion region)
            => MatterMesherKernel.Generate(region, MatterMesherKind.DualContouring);
    }

    internal static class MatterMesherKernel
    {
        private const double QefPivotEpsilon = 1e-10;
        private const double QefRegularization = 1e-7;
        private const float DegenerateAreaSquared = 1e-12f;
        private const int CellSide = MatterMeshingRegion.HaloCellCount;
        private const int CellCapacity = CellSide * CellSide * CellSide;
        private const int CellEdgeCapacity = CellCapacity * MatterSurfaceNetsTopology.CubeEdgeCount;
        private const int EdgeAnchorSide = MatterBrickLayout.CellSize;
        private const int MaxIndexCount = EdgeAnchorSide * EdgeAnchorSide * EdgeAnchorSide * 3 * 6;

        private static readonly byte[] EdgeA = { 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3 };
        private static readonly byte[] EdgeB = { 1, 2, 3, 0, 5, 6, 7, 4, 4, 5, 6, 7 };
        private static readonly byte[] CornerX = { 0, 1, 1, 0, 0, 1, 1, 0 };
        private static readonly byte[] CornerY = { 0, 0, 1, 1, 0, 0, 1, 1 };
        private static readonly byte[] CornerZ = { 0, 0, 0, 0, 1, 1, 1, 1 };
        private static readonly byte[] XIncidentEdges = { 6, 4, 0, 2 };
        private static readonly byte[] YIncidentEdges = { 5, 1, 3, 7 };
        private static readonly byte[] ZIncidentEdges = { 10, 11, 8, 9 };

        public static MatterMeshData Generate(MatterMeshingRegion region, MatterMesherKind kind)
        {
            if (region == null) throw new ArgumentNullException(nameof(region));
            var watch = Stopwatch.StartNew();
            int[] vertexByCell = kind == MatterMesherKind.DualContouring ? new int[CellCapacity] : null;
            int[] vertexByCellEdge = kind == MatterMesherKind.SurfaceNets ? new int[CellEdgeCapacity] : null;
            if (vertexByCell != null) for (int i = 0; i < vertexByCell.Length; i++) vertexByCell[i] = -1;
            if (vertexByCellEdge != null) for (int i = 0; i < vertexByCellEdge.Length; i++) vertexByCellEdge[i] = -1;
            int vertexCapacity = kind == MatterMesherKind.SurfaceNets
                ? CellCapacity * MatterSurfaceNetsTopology.MaximumComponentCount : CellCapacity;
            var vertices = new MatterMeshVertex[vertexCapacity];
            var vertexCells = new MatterInt3[vertexCapacity];
            var vertexKeys = new MatterSurfaceVertexKey[vertexCapacity];
            int vertexCount = 0;
            int qefFallbackCount = 0, qefClampedVertexCount = 0;
            int activeCellCount = 0, ambiguousCellCount = 0, ambiguousFaceCount = 0;
            int multiComponentCellCount = 0, maximumComponentsPerCell = 0, additionalSurfaceVertexCount = 0;
            int mappedCrossingEdgeCount = 0;
            float spacing = region.Samples.SampleSpacingMeters;
            float inverseSpacing = 1f / spacing;
            MatterInt3 ownerOrigin = new MatterInt3(
                region.Brick.X * MatterBrickLayout.CellSize,
                region.Brick.Y * MatterBrickLayout.CellSize,
                region.Brick.Z * MatterBrickLayout.CellSize);

            for (int z = 0; z < CellSide; z++)
            for (int y = 0; y < CellSide; y++)
            for (int x = 0; x < CellSide; x++)
            {
                int cellIndex = CellIndex(x, y, z);
                MatterInt3 cellAddress = region.CellOrigin + new MatterInt3(x, y, z);
                if (kind == MatterMesherKind.SurfaceNets)
                {
                    LoadCorners(region, x, y, z, out CornerField corners);
                    MatterSurfaceCellClassification classification = MatterSurfaceNetsTopology.Classify(
                        corners.Density0, corners.Density1, corners.Density2, corners.Density3,
                        corners.Density4, corners.Density5, corners.Density6, corners.Density7);
                    if (classification.ComponentCount == 0) continue;
                    activeCellCount++;
                    ambiguousFaceCount += classification.AmbiguousFaceCount;
                    if (classification.AmbiguousFaceCount > 0) ambiguousCellCount++;
                    if (classification.ComponentCount > 1) multiComponentCellCount++;
                    maximumComponentsPerCell = Math.Max(maximumComponentsPerCell, classification.ComponentCount);
                    additionalSurfaceVertexCount += classification.ComponentCount - 1;
                    for (int component = 0; component < classification.ComponentCount; component++)
                    {
                        ushort componentMask = classification.GetComponentEdgeMask(component);
                        if (!TryBuildCellVertex(region, kind, x, y, z, inverseSpacing, componentMask,
                            out MatterMeshVertex vertex, out bool qefFallback, out bool qefClamped))
                            throw new InvalidOperationException("A classified Surface Nets patch has no Hermite crossings.");
                        if (qefFallback) qefFallbackCount++;
                        if (qefClamped) qefClampedVertexCount++;
                        vertexCells[vertexCount] = cellAddress;
                        vertexKeys[vertexCount] = new MatterSurfaceVertexKey(cellAddress, componentMask);
                        vertices[vertexCount] = vertex;
                        for (int edge = 0; edge < MatterSurfaceNetsTopology.CubeEdgeCount; edge++)
                            if ((componentMask & (1 << edge)) != 0)
                            {
                                vertexByCellEdge[cellIndex * MatterSurfaceNetsTopology.CubeEdgeCount + edge] = vertexCount;
                                mappedCrossingEdgeCount++;
                            }
                        vertexCount++;
                    }
                }
                else
                {
                    if (!TryBuildCellVertex(region, kind, x, y, z, inverseSpacing, ushort.MaxValue,
                        out MatterMeshVertex vertex, out bool qefFallback, out bool qefClamped)) continue;
                    if (qefFallback) qefFallbackCount++;
                    if (qefClamped) qefClampedVertexCount++;
                    activeCellCount++;
                    vertexByCell[cellIndex] = vertexCount;
                    vertexCells[vertexCount] = cellAddress;
                    vertexKeys[vertexCount] = new MatterSurfaceVertexKey(cellAddress, 0);
                    vertices[vertexCount++] = vertex;
                }
            }

            int[] indices = new int[MaxIndexCount];
            int indexCount = 0;
            int skippedDegenerate = 0;
            int missingCrossingEdgeMappings = 0;
            for (int z = 0; z < EdgeAnchorSide; z++)
            for (int y = 0; y < EdgeAnchorSide; y++)
            for (int x = 0; x < EdgeAnchorSide; x++)
            {
                MatterInt3 anchor = ownerOrigin + new MatterInt3(x, y, z);
                EmitCrossingEdge(region, anchor, 0, vertexByCell, vertexByCellEdge, vertices, indices,
                    ref indexCount, ref skippedDegenerate, ref missingCrossingEdgeMappings);
                EmitCrossingEdge(region, anchor, 1, vertexByCell, vertexByCellEdge, vertices, indices,
                    ref indexCount, ref skippedDegenerate, ref missingCrossingEdgeMappings);
                EmitCrossingEdge(region, anchor, 2, vertexByCell, vertexByCellEdge, vertices, indices,
                    ref indexCount, ref skippedDegenerate, ref missingCrossingEdgeMappings);
            }

            var exactVertices = new MatterMeshVertex[vertexCount];
            Array.Copy(vertices, exactVertices, vertexCount);
            var exactVertexCells = new MatterInt3[vertexCount];
            Array.Copy(vertexCells, exactVertexCells, vertexCount);
            var exactVertexKeys = new MatterSurfaceVertexKey[vertexCount];
            Array.Copy(vertexKeys, exactVertexKeys, vertexCount);
            var exactIndices = new int[indexCount];
            Array.Copy(indices, exactIndices, indexCount);
            watch.Stop();
            return new MatterMeshData(kind, exactVertices, exactIndices, skippedDegenerate,
                qefFallbackCount, qefClampedVertexCount, spacing, exactVertexCells, exactVertexKeys,
                activeCellCount, ambiguousCellCount, ambiguousFaceCount, multiComponentCellCount,
                maximumComponentsPerCell, additionalSurfaceVertexCount, mappedCrossingEdgeCount,
                missingCrossingEdgeMappings, watch.Elapsed.TotalMilliseconds);
        }

        private static bool TryBuildCellVertex(MatterMeshingRegion region, MatterMesherKind kind,
            int cellX, int cellY, int cellZ, float inverseSpacing, ushort componentEdgeMask, out MatterMeshVertex vertex,
            out bool qefFallback, out bool qefClamped)
        {
            qefFallback = false;
            qefClamped = false;
            // Named corner fields avoid per-cell managed allocation.
            LoadCorners(region, cellX, cellY, cellZ, out CornerField corners);
            bool anySolid = false, anyAir = false;
            for (int i = 0; i < 8; i++)
            {
                float d = corners.GetDensity(i);
                anySolid |= d > 0f;
                anyAir |= d <= 0f;
            }
            if (!anySolid || !anyAir)
            {
                vertex = default;
                return false;
            }

            double sumX = 0d, sumY = 0d, sumZ = 0d;
            double normalSumX = 0d, normalSumY = 0d, normalSumZ = 0d;
            double matrix00 = 0d, matrix01 = 0d, matrix02 = 0d;
            double matrix11 = 0d, matrix12 = 0d, matrix22 = 0d;
            double rhs0 = 0d, rhs1 = 0d, rhs2 = 0d;
            int intersections = 0;
            double rockMass = 0d, dirtMass = 0d;
            MatterFloat3 firstNormal = default;

            for (int edge = 0; edge < 12; edge++)
            {
                if ((componentEdgeMask & (1 << edge)) == 0) continue;
                float d0 = corners.GetDensity(EdgeA[edge]);
                float d1 = corners.GetDensity(EdgeB[edge]);
                if ((d0 > 0f) == (d1 > 0f)) continue;
                float denominator = d0 - d1;
                float t = Math.Abs(denominator) > 1e-20f ? d0 / denominator : 0.5f;
                t = Clamp01(t);
                float u = CornerX[EdgeA[edge]] + (CornerX[EdgeB[edge]] - CornerX[EdgeA[edge]]) * t;
                float v = CornerY[EdgeA[edge]] + (CornerY[EdgeB[edge]] - CornerY[EdgeA[edge]]) * t;
                float w = CornerZ[EdgeA[edge]] + (CornerZ[EdgeB[edge]] - CornerZ[EdgeA[edge]]) * t;
                var point = new MatterFloat3(u * region.Samples.SampleSpacingMeters,
                    v * region.Samples.SampleSpacingMeters, w * region.Samples.SampleSpacingMeters);
                MatterFloat3 gradient = EvaluateGradient(corners, u, v, w, inverseSpacing);
                float edgeDirectionSign = d0 > 0f ? 1f : -1f;
                MatterFloat3 edgeFallback = NormalizeOrDefault(
                    edgeDirectionSign * (CornerX[EdgeB[edge]] - CornerX[EdgeA[edge]]),
                    edgeDirectionSign * (CornerY[EdgeB[edge]] - CornerY[EdgeA[edge]]),
                    edgeDirectionSign * (CornerZ[EdgeB[edge]] - CornerZ[EdgeA[edge]]),
                    new MatterFloat3(0f, 1f, 0f));
                MatterFloat3 outward = NormalizeOrDefault(-gradient.X, -gradient.Y, -gradient.Z, edgeFallback);
                if (intersections == 0) firstNormal = outward;
                normalSumX += outward.X; normalSumY += outward.Y; normalSumZ += outward.Z;
                sumX += point.X; sumY += point.Y; sumZ += point.Z;
                if (kind == MatterMesherKind.DualContouring)
                {
                    double nx = outward.X, ny = outward.Y, nz = outward.Z;
                    double dot = nx * point.X + ny * point.Y + nz * point.Z;
                    matrix00 += nx * nx; matrix01 += nx * ny; matrix02 += nx * nz;
                    matrix11 += ny * ny; matrix12 += ny * nz; matrix22 += nz * nz;
                    rhs0 += nx * dot; rhs1 += ny * dot; rhs2 += nz * dot;
                }
                MatterSample materialSample = d0 > 0f ? corners.GetSample(EdgeA[edge]) : corners.GetSample(EdgeB[edge]);
                double materialMass = Math.Max(0.0001d, Math.Abs((double)d0) + Math.Abs((double)d1));
                if (materialSample.Material == MatterMaterialId.Rock) rockMass += materialMass;
                else if (materialSample.Material == MatterMaterialId.Dirt) dirtMass += materialMass;
                intersections++;
            }

            if (intersections == 0)
            {
                vertex = default;
                return false;
            }

            double localX = sumX / intersections;
            double localY = sumY / intersections;
            double localZ = sumZ / intersections;
            if (kind == MatterMesherKind.DualContouring)
            {
                // Regularization stabilizes weak axes; the pivot test still rejects underconstrained QEFs.
                matrix00 += QefRegularization;
                matrix11 += QefRegularization;
                matrix22 += QefRegularization;
                rhs0 += QefRegularization * localX;
                rhs1 += QefRegularization * localY;
                rhs2 += QefRegularization * localZ;
                if (TrySolveSymmetric3x3(matrix00, matrix01, matrix02, matrix11, matrix12,
                    matrix22, rhs0, rhs1, rhs2, out double solvedX, out double solvedY, out double solvedZ))
                {
                    double clampedX = Clamp(solvedX, 0d, region.Samples.SampleSpacingMeters);
                    double clampedY = Clamp(solvedY, 0d, region.Samples.SampleSpacingMeters);
                    double clampedZ = Clamp(solvedZ, 0d, region.Samples.SampleSpacingMeters);
                    qefClamped = !clampedX.Equals(solvedX) || !clampedY.Equals(solvedY) || !clampedZ.Equals(solvedZ);
                    localX = clampedX;
                    localY = clampedY;
                    localZ = clampedZ;
                }
                else qefFallback = true;
                // Failed/rank-deficient/non-finite QEF: retain the bounded Hermite intersection centroid.
            }

            MatterInt3 cellAddress = region.CellOrigin + new MatterInt3(cellX, cellY, cellZ);
            float spacing = region.Samples.SampleSpacingMeters;
            var position = new MatterFloat3(cellAddress.X * spacing + (float)localX,
                cellAddress.Y * spacing + (float)localY, cellAddress.Z * spacing + (float)localZ);
            MatterFloat3 normal = NormalizeOrDefault((float)normalSumX, (float)normalSumY,
                (float)normalSumZ, firstNormal);
            double totalMass = rockMass + dirtMass;
            byte rockWeight = totalMass > 0d ? (byte)Math.Round(255d * rockMass / totalMass) : (byte)0;
            byte dirtWeight = (byte)(255 - rockWeight);
            vertex = new MatterMeshVertex(position, normal, rockWeight, dirtWeight);
            return true;
        }

        private static void EmitCrossingEdge(MatterMeshingRegion region, MatterInt3 anchor, int axis,
            int[] vertexByCell, int[] vertexByCellEdge, MatterMeshVertex[] vertices, int[] indices,
            ref int indexCount, ref int skippedDegenerate, ref int missingCrossingEdgeMappings)
        {
            MatterInt3 step = axis == 0 ? new MatterInt3(1, 0, 0) :
                axis == 1 ? new MatterInt3(0, 1, 0) : new MatterInt3(0, 0, 1);
            if ((region.GetSample(anchor).Density > 0f) == (region.GetSample(anchor + step).Density > 0f)) return;

            int i0, i1, i2, i3;
            if (axis == 0)
            {
                i0 = FindIncidentVertex(region, vertexByCell, vertexByCellEdge, anchor + new MatterInt3(0, -1, -1), XIncidentEdges[0]);
                i1 = FindIncidentVertex(region, vertexByCell, vertexByCellEdge, anchor + new MatterInt3(0, 0, -1), XIncidentEdges[1]);
                i2 = FindIncidentVertex(region, vertexByCell, vertexByCellEdge, anchor, XIncidentEdges[2]);
                i3 = FindIncidentVertex(region, vertexByCell, vertexByCellEdge, anchor + new MatterInt3(0, -1, 0), XIncidentEdges[3]);
            }
            else if (axis == 1)
            {
                i0 = FindIncidentVertex(region, vertexByCell, vertexByCellEdge, anchor + new MatterInt3(-1, 0, -1), YIncidentEdges[0]);
                i1 = FindIncidentVertex(region, vertexByCell, vertexByCellEdge, anchor + new MatterInt3(-1, 0, 0), YIncidentEdges[1]);
                i2 = FindIncidentVertex(region, vertexByCell, vertexByCellEdge, anchor, YIncidentEdges[2]);
                i3 = FindIncidentVertex(region, vertexByCell, vertexByCellEdge, anchor + new MatterInt3(0, 0, -1), YIncidentEdges[3]);
            }
            else
            {
                i0 = FindIncidentVertex(region, vertexByCell, vertexByCellEdge, anchor + new MatterInt3(-1, -1, 0), ZIncidentEdges[0]);
                i1 = FindIncidentVertex(region, vertexByCell, vertexByCellEdge, anchor + new MatterInt3(0, -1, 0), ZIncidentEdges[1]);
                i2 = FindIncidentVertex(region, vertexByCell, vertexByCellEdge, anchor, ZIncidentEdges[2]);
                i3 = FindIncidentVertex(region, vertexByCell, vertexByCellEdge, anchor + new MatterInt3(-1, 0, 0), ZIncidentEdges[3]);
            }
            if (i0 < 0 || i1 < 0 || i2 < 0 || i3 < 0)
            { missingCrossingEdgeMappings++; return; }

            bool startSolid = region.GetSample(anchor).Density > 0f;
            if (!startSolid) { int temp = i1; i1 = i3; i3 = temp; }
            float diag02 = DistanceSquared(vertices[i0].PositionMeters, vertices[i2].PositionMeters);
            float diag13 = DistanceSquared(vertices[i1].PositionMeters, vertices[i3].PositionMeters);
            bool use02 = diag02 < diag13 || (diag02.Equals(diag13) && ((anchor.X + anchor.Y + anchor.Z + axis) & 1) == 0);
            if (use02)
            {
                AddTriangle(i0, i1, i2, vertices, indices, ref indexCount, ref skippedDegenerate);
                AddTriangle(i0, i2, i3, vertices, indices, ref indexCount, ref skippedDegenerate);
            }
            else
            {
                AddTriangle(i0, i1, i3, vertices, indices, ref indexCount, ref skippedDegenerate);
                AddTriangle(i1, i2, i3, vertices, indices, ref indexCount, ref skippedDegenerate);
            }
        }

        private static int FindVertex(MatterMeshingRegion region, int[] vertexByCell, MatterInt3 globalCell)
        {
            MatterInt3 local = globalCell - region.CellOrigin;
            if (local.X < 0 || local.X >= CellSide || local.Y < 0 || local.Y >= CellSide ||
                local.Z < 0 || local.Z >= CellSide) return -1;
            return vertexByCell[CellIndex(local.X, local.Y, local.Z)];
        }

        private static int FindIncidentVertex(MatterMeshingRegion region, int[] vertexByCell,
            int[] vertexByCellEdge, MatterInt3 globalCell, int localCubeEdge)
        {
            if (vertexByCellEdge == null) return FindVertex(region, vertexByCell, globalCell);
            MatterInt3 local = globalCell - region.CellOrigin;
            if (local.X < 0 || local.X >= CellSide || local.Y < 0 || local.Y >= CellSide ||
                local.Z < 0 || local.Z >= CellSide) return -1;
            int cellIndex = CellIndex(local.X, local.Y, local.Z);
            return vertexByCellEdge[cellIndex * MatterSurfaceNetsTopology.CubeEdgeCount + localCubeEdge];
        }

        private static int CellIndex(int x, int y, int z) => x + CellSide * (y + CellSide * z);

        private static float DistanceSquared(MatterFloat3 a, MatterFloat3 b)
        {
            float x = a.X - b.X, y = a.Y - b.Y, z = a.Z - b.Z;
            return x * x + y * y + z * z;
        }

        private static void AddTriangle(int a, int b, int c, MatterMeshVertex[] vertices, int[] indices,
            ref int indexCount, ref int skippedDegenerate)
        {
            MatterFloat3 p0 = vertices[a].PositionMeters, p1 = vertices[b].PositionMeters, p2 = vertices[c].PositionMeters;
            float abx = p1.X - p0.X, aby = p1.Y - p0.Y, abz = p1.Z - p0.Z;
            float acx = p2.X - p0.X, acy = p2.Y - p0.Y, acz = p2.Z - p0.Z;
            float cx = aby * acz - abz * acy, cy = abz * acx - abx * acz, cz = abx * acy - aby * acx;
            if (cx * cx + cy * cy + cz * cz <= DegenerateAreaSquared)
            {
                skippedDegenerate++;
                return;
            }
            indices[indexCount++] = a;
            indices[indexCount++] = b;
            indices[indexCount++] = c;
        }

        private static void LoadCorners(MatterMeshingRegion region, int x, int y, int z, out CornerField corners)
        {
            corners = new CornerField(
                region.GetLocalSample(x, y, z), region.GetLocalSample(x + 1, y, z),
                region.GetLocalSample(x + 1, y + 1, z), region.GetLocalSample(x, y + 1, z),
                region.GetLocalSample(x, y, z + 1), region.GetLocalSample(x + 1, y, z + 1),
                region.GetLocalSample(x + 1, y + 1, z + 1), region.GetLocalSample(x, y + 1, z + 1));
        }

        private static MatterFloat3 EvaluateGradient(CornerField c, float x, float y, float z, float inverseSpacing)
        {
            float dx0 = Lerp(c.Density1 - c.Density0, c.Density2 - c.Density3, y);
            float dx1 = Lerp(c.Density5 - c.Density4, c.Density6 - c.Density7, y);
            float dx = Lerp(dx0, dx1, z) * inverseSpacing;
            float dy0 = Lerp(c.Density3 - c.Density0, c.Density2 - c.Density1, x);
            float dy1 = Lerp(c.Density7 - c.Density4, c.Density6 - c.Density5, x);
            float dy = Lerp(dy0, dy1, z) * inverseSpacing;
            float dz0 = Lerp(c.Density4 - c.Density0, c.Density5 - c.Density1, x);
            float dz1 = Lerp(c.Density7 - c.Density3, c.Density6 - c.Density2, x);
            float dz = Lerp(dz0, dz1, y) * inverseSpacing;
            return new MatterFloat3(dx, dy, dz);
        }

        private static bool TrySolveSymmetric3x3(double a00, double a01, double a02,
            double a11, double a12, double a22, double b0, double b1, double b2,
            out double x, out double y, out double z)
        {
            // Closed-form adjugate solve avoids allocating a tiny matrix per active cell. Weakly
            // constrained systems take the documented Hermite-centroid fallback instead.
            double c00 = a11 * a22 - a12 * a12;
            double c01 = a02 * a12 - a01 * a22;
            double c02 = a01 * a12 - a02 * a11;
            double c11 = a00 * a22 - a02 * a02;
            double c12 = a01 * a02 - a00 * a12;
            double c22 = a00 * a11 - a01 * a01;
            double determinant = a00 * c00 + a01 * c01 + a02 * c02;
            double scale = Math.Max(a00, Math.Max(a11, a22));
            if (!(scale > 0d) || double.IsNaN(determinant) || double.IsInfinity(determinant) ||
                determinant <= Math.Max(QefPivotEpsilon, scale * scale * scale * 1e-9d))
            { x = y = z = 0d; return false; }

            double inverse = 1d / determinant;
            x = (c00 * b0 + c01 * b1 + c02 * b2) * inverse;
            y = (c01 * b0 + c11 * b1 + c12 * b2) * inverse;
            z = (c02 * b0 + c12 * b1 + c22 * b2) * inverse;
            return !(double.IsNaN(x) || double.IsNaN(y) || double.IsNaN(z) ||
                     double.IsInfinity(x) || double.IsInfinity(y) || double.IsInfinity(z));
        }

        private static MatterFloat3 NormalizeOrDefault(float x, float y, float z, MatterFloat3 fallback)
        {
            double lengthSquared = (double)x * x + (double)y * y + (double)z * z;
            if (!(lengthSquared > 1e-20d) || double.IsNaN(lengthSquared) || double.IsInfinity(lengthSquared))
                return fallback;
            double inverseLength = 1d / Math.Sqrt(lengthSquared);
            return new MatterFloat3((float)(x * inverseLength), (float)(y * inverseLength), (float)(z * inverseLength));
        }

        private static float Lerp(float a, float b, float t) => a + (b - a) * t;
        private static float Clamp01(float v) => v < 0f ? 0f : v > 1f ? 1f : v;
        private static double Clamp(double v, double min, double max) => v < min ? min : v > max ? max : v;

        private readonly struct CornerField
        {
            public readonly MatterSample C0, C1, C2, C3, C4, C5, C6, C7;
            public float Density0 => C0.Density; public float Density1 => C1.Density;
            public float Density2 => C2.Density; public float Density3 => C3.Density;
            public float Density4 => C4.Density; public float Density5 => C5.Density;
            public float Density6 => C6.Density; public float Density7 => C7.Density;
            public CornerField(MatterSample c0, MatterSample c1, MatterSample c2, MatterSample c3,
                MatterSample c4, MatterSample c5, MatterSample c6, MatterSample c7)
            { C0 = c0; C1 = c1; C2 = c2; C3 = c3; C4 = c4; C5 = c5; C6 = c6; C7 = c7; }
            public float GetDensity(int index) => GetSample(index).Density;
            public MatterSample GetSample(int index)
            {
                switch (index)
                {
                    case 0: return C0; case 1: return C1; case 2: return C2; case 3: return C3;
                    case 4: return C4; case 5: return C5; case 6: return C6; default: return C7;
                }
            }
        }
    }
}
