using System;
using System.Collections.Generic;

namespace Wildkin.Matter
{
    public enum SourceRockArchetype : byte
    {
        CapstoneSlab = 0,
        ChunkyBoulder = 1,
        ButtressWedge = 2
    }

    /// <summary>A normalized outward half-space plane: dot(Normal, point) <= Distance.</summary>
    public readonly struct SourceRockPlane
    {
        public readonly MatterFloat3 Normal;
        public readonly float Distance;

        public SourceRockPlane(MatterFloat3 normal, float distance)
        {
            double lengthSquared = (double)normal.X * normal.X +
                                   (double)normal.Y * normal.Y +
                                   (double)normal.Z * normal.Z;
            if (!(lengthSquared > 1e-16d) || double.IsNaN(lengthSquared) || double.IsInfinity(lengthSquared) ||
                !IsFinite(distance))
                throw new ArgumentOutOfRangeException(nameof(normal), "A source-rock plane needs a finite nonzero normal and distance.");

            double inverseLength = 1d / Math.Sqrt(lengthSquared);
            Normal = new MatterFloat3((float)(normal.X * inverseLength), (float)(normal.Y * inverseLength),
                (float)(normal.Z * inverseLength));
            Distance = (float)(distance * inverseLength);
        }

        public double SignedHalfSpaceValue(MatterFloat3 point)
            => (double)Normal.X * point.X + (double)Normal.Y * point.Y + (double)Normal.Z * point.Z - Distance;

        private static bool IsFinite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
    }

    public sealed class SourceRockRecipe
    {
        private readonly SourceRockPlane[][] _parts;
        private readonly MatterFloat3[] _offsets;
        public SourceRockArchetype Archetype { get; }
        public int Seed { get; }
        public string RecipeVersion => "BeveledCompositeHalfSpaceRock-v2";
        public int PartCount => _parts.Length;
        public int PlaneCount
        {
            get
            {
                int count = 0;
                for (int i = 0; i < _parts.Length; i++) count += _parts[i].Length;
                return count;
            }
        }

        internal SourceRockRecipe(SourceRockArchetype archetype, int seed, SourceRockPlane[][] parts,
            MatterFloat3[] offsets)
        {
            if (parts == null || offsets == null || parts.Length == 0 || parts.Length != offsets.Length)
                throw new ArgumentException("A composite source recipe needs matching plane sets and offsets.");
            Archetype = archetype;
            Seed = seed;
            _parts = new SourceRockPlane[parts.Length][];
            _offsets = (MatterFloat3[])offsets.Clone();
            for (int i = 0; i < parts.Length; i++)
                _parts[i] = (SourceRockPlane[])parts[i].Clone();
        }

        public bool Contains(MatterFloat3 point, double tolerance = 1e-8d)
        {
            for (int part = 0; part < _parts.Length; part++)
            {
                MatterFloat3 local = Subtract(point, _offsets[part]);
                bool inside = true;
                for (int plane = 0; plane < _parts[part].Length; plane++)
                    if (_parts[part][plane].SignedHalfSpaceValue(local) > tolerance)
                    { inside = false; break; }
                if (inside) return true;
            }
            return false;
        }

        public bool TryIntersectThree(int first, int second, int third, out MatterFloat3 point)
        {
            if (!TryLocatePlane(first, out int firstPart, out int firstLocal) ||
                !TryLocatePlane(second, out int secondPart, out int secondLocal) ||
                !TryLocatePlane(third, out int thirdPart, out int thirdLocal) ||
                firstPart != secondPart || firstPart != thirdPart)
            { point = default; return false; }
            if (!TryIntersect(_parts[firstPart][firstLocal], _parts[secondPart][secondLocal],
                    _parts[thirdPart][thirdLocal], out MatterFloat3 local))
            { point = default; return false; }
            point = Add(local, _offsets[firstPart]);
            return true;
        }

        public SourceRockPlane GetPlane(int index)
        {
            if (!TryLocatePlane(index, out int part, out int local)) throw new ArgumentOutOfRangeException(nameof(index));
            return _parts[part][local];
        }

        public int GetPartPlaneCount(int partIndex) => _parts[partIndex].Length;
        public SourceRockPlane GetPartPlane(int partIndex, int planeIndex) => _parts[partIndex][planeIndex];
        public MatterFloat3 GetPartOffset(int partIndex) => _offsets[partIndex];

        private bool TryLocatePlane(int flattenedIndex, out int part, out int local)
        {
            if (flattenedIndex < 0) { part = local = -1; return false; }
            int remaining = flattenedIndex;
            for (part = 0; part < _parts.Length; part++)
            {
                if (remaining < _parts[part].Length) { local = remaining; return true; }
                remaining -= _parts[part].Length;
            }
            part = local = -1;
            return false;
        }

        private static MatterFloat3 Subtract(MatterFloat3 a, MatterFloat3 b)
            => new MatterFloat3(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
        private static MatterFloat3 Add(MatterFloat3 a, MatterFloat3 b)
            => new MatterFloat3(a.X + b.X, a.Y + b.Y, a.Z + b.Z);

        public static bool TryIntersect(SourceRockPlane a, SourceRockPlane b, SourceRockPlane c,
            out MatterFloat3 point)
        {
            Double3 n1 = new Double3(a.Normal.X, a.Normal.Y, a.Normal.Z);
            Double3 n2 = new Double3(b.Normal.X, b.Normal.Y, b.Normal.Z);
            Double3 n3 = new Double3(c.Normal.X, c.Normal.Y, c.Normal.Z);
            Double3 n2CrossN3 = Double3.Cross(n2, n3);
            double determinant = Double3.Dot(n1, n2CrossN3);
            if (Math.Abs(determinant) < 1e-10d || double.IsNaN(determinant) || double.IsInfinity(determinant))
            {
                point = default;
                return false;
            }

            Double3 numerator = a.Distance * n2CrossN3 +
                                b.Distance * Double3.Cross(n3, n1) +
                                c.Distance * Double3.Cross(n1, n2);
            Double3 result = numerator / determinant;
            if (!result.IsFinite)
            {
                point = default;
                return false;
            }
            point = new MatterFloat3((float)result.X, (float)result.Y, (float)result.Z);
            return IsFinite(point.X) && IsFinite(point.Y) && IsFinite(point.Z);
        }

        private static bool IsFinite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);

        private readonly struct Double3
        {
            public readonly double X, Y, Z;
            public bool IsFinite => !(double.IsNaN(X) || double.IsNaN(Y) || double.IsNaN(Z) ||
                                     double.IsInfinity(X) || double.IsInfinity(Y) || double.IsInfinity(Z));
            public Double3(double x, double y, double z) { X = x; Y = y; Z = z; }
            public static double Dot(Double3 a, Double3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;
            public static Double3 Cross(Double3 a, Double3 b)
                => new Double3(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);
            public static Double3 operator +(Double3 a, Double3 b) => new Double3(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
            public static Double3 operator *(double scalar, Double3 value)
                => new Double3(scalar * value.X, scalar * value.Y, scalar * value.Z);
            public static Double3 operator /(Double3 value, double scalar)
                => new Double3(value.X / scalar, value.Y / scalar, value.Z / scalar);
        }
    }

    public readonly struct SourceRockFace
    {
        public readonly int ComponentIndex;
        public readonly int PlaneIndex;
        public readonly MatterFloat3 Normal;
        public readonly int[] VertexIndices;

        internal SourceRockFace(int componentIndex, int planeIndex, MatterFloat3 normal, int[] vertexIndices)
        {
            ComponentIndex = componentIndex;
            PlaneIndex = planeIndex;
            Normal = normal;
            VertexIndices = vertexIndices;
        }
    }

    public sealed class SourceRockMesh
    {
        public const double VertexMergeEpsilonMeters = 1e-5d;
        private readonly MatterFloat3[] _vertices;
        private readonly int[] _triangles;
        private readonly SourceRockFace[] _faces;

        public SourceRockRecipe Recipe { get; }
        public int VertexCount => _vertices.Length;
        public int TriangleCount => _triangles.Length / 3;
        public int FaceCount => _faces.Length;
        public int ComponentCount => Recipe.PartCount;
        public MatterFloat3 GetVertex(int index) => _vertices[index];
        public int GetTriangleIndex(int index) => _triangles[index];
        public SourceRockFace GetFace(int index) => _faces[index];
        public ulong DeterministicHash { get; }
        public MatterFloat3 BoundsMin { get; }
        public MatterFloat3 BoundsMax { get; }

        internal SourceRockMesh(SourceRockRecipe recipe, MatterFloat3[] vertices, int[] triangles,
            SourceRockFace[] faces)
        {
            Recipe = recipe ?? throw new ArgumentNullException(nameof(recipe));
            _vertices = (MatterFloat3[])vertices.Clone();
            _triangles = (int[])triangles.Clone();
            _faces = (SourceRockFace[])faces.Clone();
            BoundsMin = CalculateBounds(_vertices, true);
            BoundsMax = CalculateBounds(_vertices, false);
            DeterministicHash = HashGeometry(_vertices, _triangles, _faces);
        }

        public MatterFloat3 GetTriangleNormal(int triangleIndex)
        {
            int offset = triangleIndex * 3;
            MatterFloat3 a = _vertices[_triangles[offset]];
            MatterFloat3 b = _vertices[_triangles[offset + 1]];
            MatterFloat3 c = _vertices[_triangles[offset + 2]];
            return Normalize(Cross(Subtract(b, a), Subtract(c, a)));
        }

        public bool IsClosedManifold(out string issue)
        {
            if (_vertices.Length < 4 || _triangles.Length < 12 || _triangles.Length % 3 != 0 || _faces.Length < 4)
            {
                issue = "A closed rock needs at least four vertices, faces and triangles.";
                return false;
            }

            var edgeUse = new Dictionary<ulong, int>();
            for (int i = 0; i < _triangles.Length; i += 3)
            {
                int a = _triangles[i], b = _triangles[i + 1], c = _triangles[i + 2];
                if (a < 0 || a >= _vertices.Length || b < 0 || b >= _vertices.Length || c < 0 || c >= _vertices.Length ||
                    a == b || b == c || c == a)
                {
                    issue = "Triangle index is invalid or degenerate.";
                    return false;
                }
                AddEdge(edgeUse, a, b);
                AddEdge(edgeUse, b, c);
                AddEdge(edgeUse, c, a);
            }
            foreach (KeyValuePair<ulong, int> edge in edgeUse)
                if (edge.Value != 2)
                {
                    issue = "An undirected mesh edge is used by " + edge.Value + " triangles instead of two.";
                    return false;
                }

            issue = null;
            return true;
        }

        private static MatterFloat3 CalculateBounds(MatterFloat3[] vertices, bool minimum)
        {
            float x = vertices[0].X, y = vertices[0].Y, z = vertices[0].Z;
            for (int i = 1; i < vertices.Length; i++)
            {
                MatterFloat3 p = vertices[i];
                x = minimum ? Math.Min(x, p.X) : Math.Max(x, p.X);
                y = minimum ? Math.Min(y, p.Y) : Math.Max(y, p.Y);
                z = minimum ? Math.Min(z, p.Z) : Math.Max(z, p.Z);
            }
            return new MatterFloat3(x, y, z);
        }

        private static ulong HashGeometry(MatterFloat3[] vertices, int[] triangles, SourceRockFace[] faces)
        {
            const ulong offset = 14695981039346656037UL;
            const ulong prime = 1099511628211UL;
            ulong hash = offset;
            HashInt(ref hash, vertices.Length, prime);
            HashInt(ref hash, triangles.Length, prime);
            HashInt(ref hash, faces.Length, prime);
            for (int i = 0; i < vertices.Length; i++)
            {
                HashInt(ref hash, Quantize(vertices[i].X), prime);
                HashInt(ref hash, Quantize(vertices[i].Y), prime);
                HashInt(ref hash, Quantize(vertices[i].Z), prime);
            }
            for (int i = 0; i < triangles.Length; i++) HashInt(ref hash, triangles[i], prime);
            return hash;
        }

        private static int Quantize(float value) => (int)Math.Round(value * 1000000d, MidpointRounding.AwayFromZero);
        private static void HashInt(ref ulong hash, int value, ulong prime)
        {
            unchecked
            {
                uint bits = (uint)value;
                hash = (hash ^ (byte)bits) * prime;
                hash = (hash ^ (byte)(bits >> 8)) * prime;
                hash = (hash ^ (byte)(bits >> 16)) * prime;
                hash = (hash ^ (byte)(bits >> 24)) * prime;
            }
        }
        private static void AddEdge(Dictionary<ulong, int> counts, int a, int b)
        {
            uint low = (uint)Math.Min(a, b), high = (uint)Math.Max(a, b);
            ulong key = ((ulong)low << 32) | high;
            counts.TryGetValue(key, out int count);
            counts[key] = count + 1;
        }
        private static MatterFloat3 Subtract(MatterFloat3 a, MatterFloat3 b)
            => new MatterFloat3(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
        private static MatterFloat3 Cross(MatterFloat3 a, MatterFloat3 b)
            => new MatterFloat3(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);
        private static MatterFloat3 Normalize(MatterFloat3 value)
        {
            double lengthSquared = (double)value.X * value.X + (double)value.Y * value.Y + (double)value.Z * value.Z;
            if (!(lengthSquared > 1e-20d)) return default;
            double inv = 1d / Math.Sqrt(lengthSquared);
            return new MatterFloat3((float)(value.X * inv), (float)(value.Y * inv), (float)(value.Z * inv));
        }
    }

    /// <summary>Deterministic half-space modeler for three deliberately different source-rock shapes.</summary>
    public static class ProceduralSourceRockGenerator
    {
        private const double RetainEpsilon = 1e-7d;
        private const double FaceEpsilon = 2e-5d;
        private const double TriangleAreaSquaredEpsilon = 1e-12d;

        public static SourceRockRecipe CreateRecipe(SourceRockArchetype archetype, int seed)
        {
            var parts = new List<SourceRockPlane[]>(3);
            var offsets = new List<MatterFloat3>(3);
            switch (archetype)
            {
                case SourceRockArchetype.CapstoneSlab:
                    AddCapstoneParts(parts, offsets, seed);
                    break;
                case SourceRockArchetype.ChunkyBoulder:
                    AddBoulderParts(parts, offsets, seed);
                    break;
                case SourceRockArchetype.ButtressWedge:
                    AddButtressParts(parts, offsets, seed);
                    break;
                default:
                    throw new ArgumentOutOfRangeException(nameof(archetype), archetype, "Unknown source-rock archetype.");
            }

            return new SourceRockRecipe(archetype, seed, parts.ToArray(), offsets.ToArray());
        }

        public static SourceRockMesh Generate(SourceRockArchetype archetype, int seed)
            => Build(CreateRecipe(archetype, seed));

        public static SourceRockMesh Build(SourceRockRecipe recipe)
        {
            if (recipe == null) throw new ArgumentNullException(nameof(recipe));
            var vertices = new List<MatterFloat3>(32);
            var faces = new List<SourceRockFace>(recipe.PlaneCount);
            var triangles = new List<int>(recipe.PlaneCount * 6);
            for (int partIndex = 0; partIndex < recipe.PartCount; partIndex++)
                BuildPart(recipe, partIndex, vertices, triangles, faces);
            if (vertices.Count < 4)
                throw new InvalidOperationException("The source-rock plane sets did not form bounded polyhedra.");

            var result = new SourceRockMesh(recipe, vertices.ToArray(), triangles.ToArray(), faces.ToArray());
            if (!result.IsClosedManifold(out string issue))
                throw new InvalidOperationException("Generated source rock is not a closed manifold: " + issue);
            return result;
        }

        private static void BuildPart(SourceRockRecipe recipe, int partIndex, List<MatterFloat3> allVertices,
            List<int> allTriangles, List<SourceRockFace> allFaces)
        {
            int planeCount = recipe.GetPartPlaneCount(partIndex);
            var planes = new SourceRockPlane[planeCount];
            for (int i = 0; i < planeCount; i++) planes[i] = recipe.GetPartPlane(partIndex, i);
            var vertices = new List<MatterFloat3>(32);
            for (int a = 0; a < planeCount - 2; a++)
            for (int b = a + 1; b < planeCount - 1; b++)
            for (int c = b + 1; c < planeCount; c++)
            {
                if (!SourceRockRecipe.TryIntersect(planes[a], planes[b], planes[c], out MatterFloat3 point)) continue;
                bool retained = true;
                for (int p = 0; p < planeCount; p++)
                    if (planes[p].SignedHalfSpaceValue(point) > RetainEpsilon) { retained = false; break; }
                if (retained) AddUniqueVertex(vertices, point);
            }
            if (vertices.Count < 4)
                throw new InvalidOperationException("A source-rock component plane set did not form a bounded polyhedron.");

            int vertexOffset = allVertices.Count;
            int[] globalIndex = new int[vertices.Count];
            MatterFloat3 translation = recipe.GetPartOffset(partIndex);
            for (int i = 0; i < vertices.Count; i++)
            {
                MatterFloat3 point = Add(vertices[i], translation);
                globalIndex[i] = vertexOffset + i;
                allVertices.Add(point);
            }

            for (int planeIndex = 0; planeIndex < planeCount; planeIndex++)
            {
                SourceRockPlane plane = planes[planeIndex];
                var faceIndices = new List<int>(8);
                MatterFloat3 centroid = default;
                for (int vertexIndex = 0; vertexIndex < vertices.Count; vertexIndex++)
                {
                    MatterFloat3 vertex = vertices[vertexIndex];
                    if (Math.Abs(plane.SignedHalfSpaceValue(vertex)) > FaceEpsilon) continue;
                    faceIndices.Add(vertexIndex);
                    centroid = Add(centroid, vertex);
                }
                if (faceIndices.Count < 3) continue;
                centroid = Multiply(centroid, 1f / faceIndices.Count);
                MatterFloat3 u = MakePlaneAxis(plane.Normal);
                MatterFloat3 v = Cross(plane.Normal, u);
                faceIndices.Sort((left, right) =>
                {
                    MatterFloat3 l = Subtract(vertices[left], centroid);
                    MatterFloat3 r = Subtract(vertices[right], centroid);
                    double angleL = Math.Atan2(Dot(l, v), Dot(l, u));
                    double angleR = Math.Atan2(Dot(r, v), Dot(r, u));
                    int comparison = angleL.CompareTo(angleR);
                    return comparison != 0 ? comparison : left.CompareTo(right);
                });

                int[] loop = faceIndices.ToArray();
                MatterFloat3 polygonNormal = PolygonNormal(vertices, loop);
                if (Dot(polygonNormal, plane.Normal) < 0d) Array.Reverse(loop);
                var globalLoop = new int[loop.Length];
                for (int i = 0; i < loop.Length; i++) globalLoop[i] = globalIndex[loop[i]];
                allFaces.Add(new SourceRockFace(partIndex, planeIndex, plane.Normal, globalLoop));

                for (int i = 1; i < loop.Length - 1; i++)
                {
                    int first = globalIndex[loop[0]], second = globalIndex[loop[i]], third = globalIndex[loop[i + 1]];
                    MatterFloat3 ab = Subtract(allVertices[second], allVertices[first]);
                    MatterFloat3 ac = Subtract(allVertices[third], allVertices[first]);
                    MatterFloat3 cross = Cross(ab, ac);
                    if (Dot(cross, cross) <= TriangleAreaSquaredEpsilon) continue;
                    if (Dot(cross, plane.Normal) < 0f) { int swap = second; second = third; third = swap; }
                    allTriangles.Add(first); allTriangles.Add(second); allTriangles.Add(third);
                }
            }
        }

        private static void AddCapstoneParts(List<SourceRockPlane[]> parts, List<MatterFloat3> offsets, int seed)
        {
            var main = BeveledBox(1.75f, 0.44f, 1.35f, 0.48f, 0.28f);
            main.Add(new SourceRockPlane(new MatterFloat3(0.14f, 0.98f, -0.09f), 1.18f));
            AddPart(parts, offsets, main, new MatterFloat3(0f, 0f, 0f), seed, 0);

            // A slightly offset cap makes a clear top shelf with a narrow source-space seam.
            var cap = BeveledBox(0.82f, 0.22f, 0.72f, 0f, 0.12f);
            cap.Add(new SourceRockPlane(new MatterFloat3(-0.12f, 0.98f, 0.08f), 0.20f));
            AddPart(parts, offsets, cap, new MatterFloat3(-0.40f, 1.17f, 0.20f), seed, 1);

            // The low side stone extends the asymmetric footprint without intersecting the slab.
            var shelf = BeveledBox(0.34f, 0.30f, 0.58f, 0f, 0.10f);
            AddPart(parts, offsets, shelf, new MatterFloat3(2.13f, 0.34f, -0.18f), seed, 2);
        }

        private static void AddBoulderParts(List<SourceRockPlane[]> parts, List<MatterFloat3> offsets, int seed)
        {
            var core = BeveledBox(1.13f, 1.14f, 1.10f, 1.17f, 0.37f);
            core.Add(new SourceRockPlane(new MatterFloat3(0.20f, 0.96f, -0.15f), 2.47f));
            AddPart(parts, offsets, core, new MatterFloat3(0f, 0f, 0f), seed, 0);

            // A lower shoulder and a crown chip establish three distinct scales and a broken outline.
            var shoulder = BeveledBox(0.50f, 0.54f, 0.57f, 0f, 0.20f);
            shoulder.Add(new SourceRockPlane(new MatterFloat3(0.16f, 0.96f, 0.21f), 0.48f));
            AddPart(parts, offsets, shoulder, new MatterFloat3(-1.72f, 0.57f, 0.18f), seed, 1);

            var crown = BeveledBox(0.56f, 0.24f, 0.48f, 0f, 0.16f);
            AddPart(parts, offsets, crown, new MatterFloat3(0.42f, 2.60f, -0.32f), seed, 2);
        }

        private static void AddButtressParts(List<SourceRockPlane[]> parts, List<MatterFloat3> offsets, int seed)
        {
            var spine = BeveledBox(0.74f, 1.52f, 0.76f, 1.52f, 0.24f);
            spine.Add(new SourceRockPlane(new MatterFloat3(-0.32f, 0.94f, 0.10f), 2.97f)); // dominant rake
            spine.Add(new SourceRockPlane(new MatterFloat3(0.69f, 0.34f, 0.28f), 1.07f));
            AddPart(parts, offsets, spine, new MatterFloat3(0f, 0f, 0f), seed, 0);

            var support = BeveledBox(0.31f, 0.72f, 0.41f, 0.72f, 0.14f);
            support.Add(new SourceRockPlane(new MatterFloat3(-0.18f, 0.96f, 0.20f), 1.30f));
            AddPart(parts, offsets, support, new MatterFloat3(1.10f, 0f, 0.10f), seed, 1);

            var ledge = BeveledBox(0.54f, 0.22f, 0.66f, 0f, 0.16f);
            ledge.Add(new SourceRockPlane(new MatterFloat3(0.18f, 0.97f, -0.14f), 0.27f));
            AddPart(parts, offsets, ledge, new MatterFloat3(-0.34f, 3.31f, -0.02f), seed, 2);
        }

        private static List<SourceRockPlane> BeveledBox(float halfX, float halfY, float halfZ,
            float centerY, float bevel)
        {
            var planes = new List<SourceRockPlane>(16);
            AddBoxPlanes(planes, halfX, halfY, halfZ, centerY);
            for (int sx = -1; sx <= 1; sx += 2)
            for (int sy = -1; sy <= 1; sy += 2)
            for (int sz = -1; sz <= 1; sz += 2)
            {
                float variation = 1f + 0.13f * (sx * 0.6f - sy * 0.35f + sz * 0.45f);
                double distance = halfX + halfY + halfZ - bevel * variation * Math.Sqrt(3d);
                planes.Add(new SourceRockPlane(new MatterFloat3(sx, sy, sz), (float)distance));
            }
            return planes;
        }

        private static void AddPart(List<SourceRockPlane[]> parts, List<MatterFloat3> offsets,
            List<SourceRockPlane> planes, MatterFloat3 offset, int seed, int partIndex)
        {
            ApplySeedVariation(planes, unchecked(seed + partIndex * 101));
            parts.Add(planes.ToArray());
            offsets.Add(offset);
        }

        private static void AddBoxPlanes(List<SourceRockPlane> planes, float halfX, float halfY, float halfZ, float centerY)
        {
            planes.Add(new SourceRockPlane(new MatterFloat3(1f, 0f, 0f), halfX));
            planes.Add(new SourceRockPlane(new MatterFloat3(-1f, 0f, 0f), halfX));
            planes.Add(new SourceRockPlane(new MatterFloat3(0f, 1f, 0f), halfY + centerY));
            planes.Add(new SourceRockPlane(new MatterFloat3(0f, -1f, 0f), halfY - centerY));
            planes.Add(new SourceRockPlane(new MatterFloat3(0f, 0f, 1f), halfZ));
            planes.Add(new SourceRockPlane(new MatterFloat3(0f, 0f, -1f), halfZ));
        }

        private static void ApplySeedVariation(List<SourceRockPlane> planes, int seed)
        {
            uint state = Mix(unchecked((uint)seed) ^ 0x9E3779B9u);
            for (int i = 7; i < planes.Count; i++)
            {
                SourceRockPlane plane = planes[i];
                float nx = NextSigned(ref state), ny = NextSigned(ref state), nz = NextSigned(ref state);
                float distanceJitter = NextSigned(ref state) * 0.035f;
                var normal = new MatterFloat3(plane.Normal.X + nx * 0.018f,
                    plane.Normal.Y + ny * 0.018f, plane.Normal.Z + nz * 0.018f);
                planes[i] = new SourceRockPlane(normal, plane.Distance + distanceJitter);
            }
        }

        private static uint Mix(uint value)
        {
            unchecked
            {
                value ^= value >> 16; value *= 0x7FEB352Du; value ^= value >> 15;
                value *= 0x846CA68Bu; value ^= value >> 16;
                return value;
            }
        }
        private static float NextSigned(ref uint state)
        {
            unchecked { state = state * 1664525u + 1013904223u; }
            return (state / (float)uint.MaxValue) * 2f - 1f;
        }
        private static void AddUniqueVertex(List<MatterFloat3> vertices, MatterFloat3 point)
        {
            double epsilonSquared = SourceRockMesh.VertexMergeEpsilonMeters * SourceRockMesh.VertexMergeEpsilonMeters;
            for (int i = 0; i < vertices.Count; i++)
                if (DistanceSquared(vertices[i], point) <= epsilonSquared) return;
            vertices.Add(point);
        }
        private static MatterFloat3 MakePlaneAxis(MatterFloat3 normal)
        {
            MatterFloat3 reference = Math.Abs(normal.Y) < 0.85f
                ? new MatterFloat3(0f, 1f, 0f) : new MatterFloat3(1f, 0f, 0f);
            return Normalize(Cross(reference, normal));
        }
        private static MatterFloat3 PolygonNormal(List<MatterFloat3> vertices, int[] loop)
        {
            MatterFloat3 sum = default;
            for (int i = 0; i < loop.Length; i++)
            {
                MatterFloat3 current = vertices[loop[i]], next = vertices[loop[(i + 1) % loop.Length]];
                sum = Add(sum, new MatterFloat3((current.Y - next.Y) * (current.Z + next.Z),
                    (current.Z - next.Z) * (current.X + next.X), (current.X - next.X) * (current.Y + next.Y)));
            }
            return sum;
        }
        private static double Dot(MatterFloat3 a, MatterFloat3 b) => (double)a.X * b.X + (double)a.Y * b.Y + (double)a.Z * b.Z;
        private static double DistanceSquared(MatterFloat3 a, MatterFloat3 b)
        {
            double x = a.X - b.X, y = a.Y - b.Y, z = a.Z - b.Z;
            return x * x + y * y + z * z;
        }
        private static MatterFloat3 Add(MatterFloat3 a, MatterFloat3 b)
            => new MatterFloat3(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
        private static MatterFloat3 Subtract(MatterFloat3 a, MatterFloat3 b)
            => new MatterFloat3(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
        private static MatterFloat3 Multiply(MatterFloat3 a, float scalar)
            => new MatterFloat3(a.X * scalar, a.Y * scalar, a.Z * scalar);
        private static MatterFloat3 Cross(MatterFloat3 a, MatterFloat3 b)
            => new MatterFloat3(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);
        private static MatterFloat3 Normalize(MatterFloat3 value)
        {
            double lengthSquared = Dot(value, value);
            if (!(lengthSquared > 1e-20d)) throw new InvalidOperationException("Cannot normalize a degenerate face basis.");
            double inverse = 1d / Math.Sqrt(lengthSquared);
            return new MatterFloat3((float)(value.X * inverse), (float)(value.Y * inverse), (float)(value.Z * inverse));
        }
    }
}
