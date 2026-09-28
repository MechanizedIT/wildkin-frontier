using System;

namespace Wildkin.Matter
{
    /// <summary>Allocation-free topology partition for the twelve Hermite edges of one cube.</summary>
    public readonly struct MatterSurfaceCellClassification
    {
        private readonly ushort _component0, _component1, _component2, _component3;
        private readonly ushort _component4, _component5, _component6, _component7;
        private readonly ushort _component8, _component9, _component10, _component11;

        public ushort CrossingEdgeMask { get; }
        public byte ComponentCount { get; }
        public byte AmbiguousFaceCount { get; }

        internal MatterSurfaceCellClassification(ushort crossingEdgeMask, byte componentCount,
            byte ambiguousFaceCount, ReadOnlySpan<ushort> components)
        {
            CrossingEdgeMask = crossingEdgeMask;
            ComponentCount = componentCount;
            AmbiguousFaceCount = ambiguousFaceCount;
            _component0 = components[0]; _component1 = components[1];
            _component2 = components[2]; _component3 = components[3];
            _component4 = components[4]; _component5 = components[5];
            _component6 = components[6]; _component7 = components[7];
            _component8 = components[8]; _component9 = components[9];
            _component10 = components[10]; _component11 = components[11];
        }

        public ushort GetComponentEdgeMask(int index)
        {
            switch (index)
            {
                case 0: return _component0; case 1: return _component1;
                case 2: return _component2; case 3: return _component3;
                case 4: return _component4; case 5: return _component5;
                case 6: return _component6; case 7: return _component7;
                case 8: return _component8; case 9: return _component9;
                case 10: return _component10; case 11: return _component11;
                default: throw new ArgumentOutOfRangeException(nameof(index));
            }
        }

        public int GetComponentIndexForEdge(int edgeIndex)
        {
            if (edgeIndex < 0 || edgeIndex >= MatterSurfaceNetsTopology.CubeEdgeCount)
                throw new ArgumentOutOfRangeException(nameof(edgeIndex));
            ushort bit = (ushort)(1 << edgeIndex);
            for (int i = 0; i < ComponentCount; i++)
                if ((GetComponentEdgeMask(i) & bit) != 0) return i;
            return -1;
        }
    }

    /// <summary>
    /// Partitions crossing cube edges by their contour connectivity on the six bilinear faces.
    /// Each shared face uses the same +axis corner order from either neighboring cell. Checkerboard
    /// faces use the bilinear saddle sign; a saddle within four float-precision ulps is resolved by
    /// treating the positive-solid phase as connected through the face.
    /// </summary>
    public static class MatterSurfaceNetsTopology
    {
        public const int CubeEdgeCount = 12;
        public const int MaximumComponentCount = 4;
        private const double NearTieRelativeTolerance = 4d * 1.1920928955078125e-7d;

        private static readonly byte[] EdgeA = { 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3 };
        private static readonly byte[] EdgeB = { 1, 2, 3, 0, 5, 6, 7, 4, 4, 5, 6, 7 };
        private static readonly byte[] FaceCorners =
        {
            0,1,2,3,  4,5,6,7,  0,3,7,4,
            1,2,6,5,  0,1,5,4,  3,2,6,7
        };
        private static readonly byte[] FaceEdges =
        {
            0,1,2,3,  4,5,6,7,  3,11,7,8,
            1,10,5,9,  0,9,4,8,  2,10,6,11
        };
        private static readonly MatterSurfaceCellClassification[] UnambiguousSignMaskLookup = BuildUnambiguousSignMaskLookup();

        /// <summary>Classifies one cube from its eight corner densities in MatterMeshers corner order.</summary>
        public static MatterSurfaceCellClassification Classify(ReadOnlySpan<float> cornerDensities)
        {
            if (cornerDensities.Length != 8)
                throw new ArgumentException("Surface Nets cells require exactly eight corner densities.", nameof(cornerDensities));
            return Classify(cornerDensities[0], cornerDensities[1], cornerDensities[2], cornerDensities[3],
                cornerDensities[4], cornerDensities[5], cornerDensities[6], cornerDensities[7]);
        }

        public static MatterSurfaceCellClassification Classify(float d0, float d1, float d2, float d3,
            float d4, float d5, float d6, float d7)
        {
            if (!Finite(d0) || !Finite(d1) || !Finite(d2) || !Finite(d3) ||
                !Finite(d4) || !Finite(d5) || !Finite(d6) || !Finite(d7))
                throw new ArgumentOutOfRangeException(nameof(d0), "Surface Nets corner densities must be finite.");

            int signMask = (d0 > 0f ? 1 : 0) | (d1 > 0f ? 2 : 0) | (d2 > 0f ? 4 : 0) | (d3 > 0f ? 8 : 0) |
                           (d4 > 0f ? 16 : 0) | (d5 > 0f ? 32 : 0) | (d6 > 0f ? 64 : 0) | (d7 > 0f ? 128 : 0);
            MatterSurfaceCellClassification cached = UnambiguousSignMaskLookup[signMask];
            if (cached.ComponentCount != byte.MaxValue) return cached;

            Span<float> density = stackalloc float[8];
            density[0] = d0; density[1] = d1; density[2] = d2; density[3] = d3;
            density[4] = d4; density[5] = d5; density[6] = d6; density[7] = d7;
            Span<byte> parent = stackalloc byte[CubeEdgeCount];
            Span<ushort> componentMasks = stackalloc ushort[CubeEdgeCount];
            Span<sbyte> componentByRoot = stackalloc sbyte[CubeEdgeCount];
            for (int edge = 0; edge < CubeEdgeCount; edge++)
            {
                parent[edge] = (byte)edge;
                componentMasks[edge] = 0;
                componentByRoot[edge] = -1;
            }

            ushort crossingMask = 0;
            for (int edge = 0; edge < CubeEdgeCount; edge++)
                if ((density[EdgeA[edge]] > 0f) != (density[EdgeB[edge]] > 0f))
                    crossingMask |= (ushort)(1 << edge);

            byte ambiguousFaces = 0;
            for (int face = 0; face < 6; face++)
            {
                int faceOffset = face * 4;
                int first = -1, crossingCount = 0;
                for (int side = 0; side < 4; side++)
                {
                    int edge = FaceEdges[faceOffset + side];
                    if ((crossingMask & (1 << edge)) == 0) continue;
                    if (first < 0) first = edge;
                    crossingCount++;
                }

                if (crossingCount == 2)
                {
                    int second = -1;
                    for (int side = 0; side < 4; side++)
                    {
                        int edge = FaceEdges[faceOffset + side];
                        if (edge != first && (crossingMask & (1 << edge)) != 0) { second = edge; break; }
                    }
                    Union(parent, first, second);
                }
                else if (crossingCount == 4)
                {
                    ambiguousFaces++;
                    int c0 = FaceCorners[faceOffset], c1 = FaceCorners[faceOffset + 1];
                    int c2 = FaceCorners[faceOffset + 2], c3 = FaceCorners[faceOffset + 3];
                    bool positiveSaddle = PositivePhaseConnectsThroughFace(
                        density[c0], density[c1], density[c2], density[c3]);
                    for (int corner = 0; corner < 4; corner++)
                    {
                        int cornerIndex = FaceCorners[faceOffset + corner];
                        bool positiveCorner = density[cornerIndex] > 0f;
                        if (positiveCorner == positiveSaddle) continue;
                        int beforeEdge = FaceEdges[faceOffset + ((corner + 3) & 3)];
                        int afterEdge = FaceEdges[faceOffset + corner];
                        Union(parent, beforeEdge, afterEdge);
                    }
                }
            }

            byte componentCount = 0;
            for (int edge = 0; edge < CubeEdgeCount; edge++)
            {
                if ((crossingMask & (1 << edge)) == 0) continue;
                int root = Find(parent, edge);
                if (componentByRoot[root] < 0)
                    componentByRoot[root] = checked((sbyte)componentCount++);
                componentMasks[componentByRoot[root]] |= (ushort)(1 << edge);
            }
            if (componentCount > MaximumComponentCount)
                throw new InvalidOperationException("The cube-face contour graph exceeded its proven four-loop bound.");
            return new MatterSurfaceCellClassification(crossingMask, componentCount, ambiguousFaces, componentMasks);
        }

        private static MatterSurfaceCellClassification[] BuildUnambiguousSignMaskLookup()
        {
            var lookup = new MatterSurfaceCellClassification[256];
            for (int signMask = 0; signMask < lookup.Length; signMask++)
                lookup[signMask] = HasCheckerboardFace(signMask)
                    ? new MatterSurfaceCellClassification(0, byte.MaxValue, 0, stackalloc ushort[CubeEdgeCount])
                    : ClassifyUnambiguousSignMask(signMask);
            return lookup;
        }

        private static bool HasCheckerboardFace(int signMask)
        {
            for (int face = 0; face < 6; face++)
            {
                int offset = face * 4;
                bool a = (signMask & (1 << FaceCorners[offset])) != 0;
                bool b = (signMask & (1 << FaceCorners[offset + 1])) != 0;
                bool c = (signMask & (1 << FaceCorners[offset + 2])) != 0;
                bool d = (signMask & (1 << FaceCorners[offset + 3])) != 0;
                if (a == c && b == d && a != b) return true;
            }
            return false;
        }

        private static MatterSurfaceCellClassification ClassifyUnambiguousSignMask(int signMask)
        {
            Span<byte> parent = stackalloc byte[CubeEdgeCount];
            Span<ushort> componentMasks = stackalloc ushort[CubeEdgeCount];
            Span<sbyte> componentByRoot = stackalloc sbyte[CubeEdgeCount];
            for (int edge = 0; edge < CubeEdgeCount; edge++)
            {
                parent[edge] = (byte)edge;
                componentMasks[edge] = 0;
                componentByRoot[edge] = -1;
            }

            ushort crossingMask = 0;
            for (int edge = 0; edge < CubeEdgeCount; edge++)
            {
                bool a = (signMask & (1 << EdgeA[edge])) != 0;
                bool b = (signMask & (1 << EdgeB[edge])) != 0;
                if (a != b) crossingMask |= (ushort)(1 << edge);
            }

            for (int face = 0; face < 6; face++)
            {
                int offset = face * 4;
                int first = -1, second = -1;
                for (int side = 0; side < 4; side++)
                {
                    int edge = FaceEdges[offset + side];
                    if ((crossingMask & (1 << edge)) == 0) continue;
                    if (first < 0) first = edge;
                    else if (second < 0) second = edge;
                    else throw new InvalidOperationException("A non-checkerboard cube face cannot have more than two crossings.");
                }
                if (second >= 0) Union(parent, first, second);
            }

            byte componentCount = 0;
            for (int edge = 0; edge < CubeEdgeCount; edge++)
            {
                if ((crossingMask & (1 << edge)) == 0) continue;
                int root = Find(parent, edge);
                if (componentByRoot[root] < 0)
                    componentByRoot[root] = checked((sbyte)componentCount++);
                componentMasks[componentByRoot[root]] |= (ushort)(1 << edge);
            }
            return new MatterSurfaceCellClassification(crossingMask, componentCount, 0, componentMasks);
        }

        /// <summary>
        /// Returns whether the bilinear saddle joins positive corners for cyclic face values
        /// (00,10,11,01). At a scale-relative near-tie, positive-solid connectivity wins.
        /// </summary>
        public static bool PositivePhaseConnectsThroughFace(float d0, float d1, float d2, float d3)
        {
            double q = (double)d0 - d1 + d2 - d3;
            double diagonal0 = (double)d0 * d2;
            double diagonal1 = (double)d1 * d3;
            double determinant = diagonal0 - diagonal1;
            double scale = Math.Max(Math.Abs(diagonal0), Math.Abs(diagonal1));
            if (Math.Abs(determinant) <= scale * NearTieRelativeTolerance) return true;
            // For a checkerboard, q is nonzero and the bilinear saddle is determinant / q.
            return (determinant > 0d) == (q > 0d);
        }

        private static int Find(Span<byte> parent, int edge)
        {
            int root = edge;
            while (parent[root] != root) root = parent[root];
            while (parent[edge] != edge)
            {
                int next = parent[edge];
                parent[edge] = (byte)root;
                edge = next;
            }
            return root;
        }

        private static void Union(Span<byte> parent, int first, int second)
        {
            int a = Find(parent, first), b = Find(parent, second);
            if (a != b) parent[Math.Max(a, b)] = (byte)Math.Min(a, b);
        }

        private static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
    }
}
