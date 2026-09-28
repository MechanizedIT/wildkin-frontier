using System;
using System.Collections.Generic;

namespace Wildkin.Matter
{
    [Serializable]
    public sealed class SculptedStoneRecipe
    {
        public const string Version = "SculptedCubeSuperquadric-v2-large-cuts";
        public SourceRockArchetype archetype;
        public int seed;
        public float radiusX, radiusY, radiusZ, exponent;
        public float sideFullness, frontFullness, taper, lean, skew, twist;
        public float topTilt, quadrantCompression, baseFraction;
        public int subdivisions = 4;
    }

    /// <summary>One welded cube-derived shell. Source geometry only; never runtime matter authority.</summary>
    public sealed class SculptedStoneMesh
    {
        private readonly MatterFloat3[] _vertices;
        private readonly int[] _indices;
        public int VertexCount => _vertices.Length;
        public int TriangleCount => _indices.Length / 3;
        public MatterFloat3 BoundsMin { get; }
        public MatterFloat3 BoundsMax { get; }
        public ulong GeometryHash { get; }
        public MatterFloat3 GetVertex(int index) => _vertices[index];
        public int GetIndex(int index) => _indices[index];
        public double SignedVolume { get; }

        public static SculptedStoneMesh FromIndexedGeometry(MatterFloat3[] vertices, int[] indices)
        {
            if (vertices == null || indices == null || vertices.Length < 4 || indices.Length < 12)
                throw new ArgumentException("An indexed source mesh needs vertices and triangles.");
            // Check indices before the constructor computes signed volume.
            foreach (int index in indices) if (index < 0 || index >= vertices.Length) throw new ArgumentOutOfRangeException(nameof(indices));
            var mesh = new SculptedStoneMesh(vertices, indices);
            if (!mesh.Validate(out string issue)) throw new ArgumentException(issue);
            return mesh;
        }

        internal SculptedStoneMesh(MatterFloat3[] vertices, int[] indices)
        {
            _vertices = (MatterFloat3[])vertices.Clone();
            _indices = (int[])indices.Clone();
            float minX = float.MaxValue, minY = float.MaxValue, minZ = float.MaxValue;
            float maxX = float.MinValue, maxY = float.MinValue, maxZ = float.MinValue;
            ulong hash = 14695981039346656037UL;
            Hash(ref hash, vertices.Length); Hash(ref hash, indices.Length);
            foreach (MatterFloat3 p in vertices)
            {
                minX = Math.Min(minX, p.X); minY = Math.Min(minY, p.Y); minZ = Math.Min(minZ, p.Z);
                maxX = Math.Max(maxX, p.X); maxY = Math.Max(maxY, p.Y); maxZ = Math.Max(maxZ, p.Z);
                Hash(ref hash, (int)Math.Round(p.X * 1000000d, MidpointRounding.AwayFromZero));
                Hash(ref hash, (int)Math.Round(p.Y * 1000000d, MidpointRounding.AwayFromZero));
                Hash(ref hash, (int)Math.Round(p.Z * 1000000d, MidpointRounding.AwayFromZero));
            }
            double volume = 0;
            for (int i = 0; i < indices.Length; i++) Hash(ref hash, indices[i]);
            for (int i = 0; i < indices.Length; i += 3)
                volume += Dot(vertices[indices[i]], Cross(vertices[indices[i + 1]], vertices[indices[i + 2]])) / 6d;
            BoundsMin = new MatterFloat3(minX, minY, minZ);
            BoundsMax = new MatterFloat3(maxX, maxY, maxZ);
            GeometryHash = hash;
            SignedVolume = volume;
        }

        /// <summary>Checks finite geometry, closed oriented edges, one connected shell, and a single triangle fan at each vertex.</summary>
        public bool Validate(out string issue)
        {
            if (VertexCount < 4 || TriangleCount < 4 || _indices.Length % 3 != 0)
                { issue = "Empty or malformed source shell."; return false; }
            foreach (MatterFloat3 p in _vertices)
                if (!Finite(p.X) || !Finite(p.Y) || !Finite(p.Z))
                { issue = "Nonfinite source vertex."; return false; }
            var uses = new Dictionary<ulong, int>();
            var directions = new Dictionary<ulong, int>();
            var edgeTriangles = new Dictionary<ulong, List<int>>();
            var adjacency = new List<int>[VertexCount];
            var incidentTriangles = new List<int>[VertexCount];
            for (int i = 0; i < adjacency.Length; i++)
            { adjacency[i] = new List<int>(); incidentTriangles[i] = new List<int>(); }
            for (int i = 0; i < _indices.Length; i += 3)
            {
                int triangle = i / 3;
                int a = _indices[i], b = _indices[i + 1], c = _indices[i + 2];
                if (a < 0 || b < 0 || c < 0 || a >= VertexCount || b >= VertexCount || c >= VertexCount ||
                    a == b || b == c || c == a)
                { issue = "Invalid source triangle indices."; return false; }
                MatterFloat3 normal = Cross(Subtract(_vertices[b], _vertices[a]), Subtract(_vertices[c], _vertices[a]));
                if (Dot(normal, normal) < 1e-12d)
                { issue = "Zero area source triangle " + (i / 3) + " (cross squared=" + Dot(normal, normal).ToString("R", System.Globalization.CultureInfo.InvariantCulture) + ")."; return false; }
                incidentTriangles[a].Add(triangle); incidentTriangles[b].Add(triangle); incidentTriangles[c].Add(triangle);
                AddEdge(a, b, triangle, uses, directions, edgeTriangles, adjacency);
                AddEdge(b, c, triangle, uses, directions, edgeTriangles, adjacency);
                AddEdge(c, a, triangle, uses, directions, edgeTriangles, adjacency);
            }
            foreach (ulong edge in uses.Keys)
            {
                if (uses[edge] < 2) { issue = "Open boundary edge has one incident triangle."; return false; }
                if (uses[edge] > 2) { issue = "Nonmanifold edge has " + uses[edge] + " incident triangles."; return false; }
                if (directions[edge] != 0) { issue = "Inconsistent winding across a shared edge."; return false; }
            }

            // Edge counts alone do not reject two surface sheets pinched together at one vertex.
            // A closed 2-manifold has one connected cycle of incident triangles at every vertex.
            int[] fanMarks = new int[TriangleCount];
            int[] fanStack = new int[TriangleCount];
            for (int vertex = 0; vertex < VertexCount; vertex++)
            {
                List<int> faces = incidentTriangles[vertex];
                if (faces.Count < 3) { issue = "Vertex has no closed one-ring triangle fan."; return false; }
                int stamp = vertex + 1, pendingCount = 1, visitedFans = 0;
                fanStack[0] = faces[0]; fanMarks[faces[0]] = stamp;
                while (pendingCount > 0)
                {
                    int triangle = fanStack[--pendingCount]; visitedFans++;
                    int i = triangle * 3;
                    int a = _indices[i], b = _indices[i + 1], c = _indices[i + 2];
                    int neighborA, neighborB;
                    if (a == vertex) { neighborA = b; neighborB = c; }
                    else if (b == vertex) { neighborA = c; neighborB = a; }
                    else { neighborA = a; neighborB = b; }
                    int faceA = OtherTriangle(edgeTriangles[EdgeKey(vertex, neighborA)], triangle);
                    int faceB = OtherTriangle(edgeTriangles[EdgeKey(vertex, neighborB)], triangle);
                    if (faceA == faceB)
                    { issue = "Vertex one-ring repeats one triangle instead of forming a surface fan."; return false; }
                    if (fanMarks[faceA] != stamp) { fanMarks[faceA] = stamp; fanStack[pendingCount++] = faceA; }
                    if (fanMarks[faceB] != stamp) { fanMarks[faceB] = stamp; fanStack[pendingCount++] = faceB; }
                }
                if (visitedFans != faces.Count)
                { issue = "Vertex one-ring contains disconnected triangle fans."; return false; }
            }
            var visited = new HashSet<int>();
            var pending = new Stack<int>(); pending.Push(0);
            while (pending.Count != 0)
            {
                int vertex = pending.Pop();
                if (!visited.Add(vertex)) continue;
                foreach (int neighbor in adjacency[vertex]) pending.Push(neighbor);
            }
            if (visited.Count != VertexCount || VertexCount - uses.Count + TriangleCount != 2)
            { issue = "Source must have one connected genus-zero shell without unused vertices."; return false; }
            if (!(SignedVolume > 1e-5d))
            { issue = "Source has inward winding or zero volume."; return false; }
            issue = null; return true;
        }

        private static void AddEdge(int a, int b, int triangle, Dictionary<ulong, int> uses,
            Dictionary<ulong, int> directions, Dictionary<ulong, List<int>> edgeTriangles,
            List<int>[] adjacency)
        {
            ulong key = EdgeKey(a, b);
            uses.TryGetValue(key, out int count); uses[key] = count + 1;
            directions.TryGetValue(key, out int direction); directions[key] = direction + (a < b ? 1 : -1);
            if (!edgeTriangles.TryGetValue(key, out List<int> triangles))
            { triangles = new List<int>(2); edgeTriangles.Add(key, triangles); }
            triangles.Add(triangle);
            adjacency[a].Add(b); adjacency[b].Add(a);
        }
        private static int OtherTriangle(List<int> incident, int triangle)
            => incident[0] == triangle ? incident[1] : incident[0];
        private static ulong EdgeKey(int a, int b)
            => ((ulong)(uint)Math.Min(a, b) << 32) | (uint)Math.Max(a, b);
        private static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
        private static void Hash(ref ulong hash, int value)
        {
            unchecked
            {
                uint bits = (uint)value;
                for (int shift = 0; shift < 32; shift += 8) hash = (hash ^ (byte)(bits >> shift)) * 1099511628211UL;
            }
        }
        internal static MatterFloat3 Subtract(MatterFloat3 a, MatterFloat3 b)
            => new MatterFloat3(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
        internal static MatterFloat3 Cross(MatterFloat3 a, MatterFloat3 b)
            => new MatterFloat3(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);
        internal static double Dot(MatterFloat3 a, MatterFloat3 b) => (double)a.X * b.X + (double)a.Y * b.Y + (double)a.Z * b.Z;
    }

    public static class SculptedStoneGenerator
    {
        // Wider central panels and narrower corner bands give deliberate face hierarchy.
        private static readonly double[] Stations = { -1d, -0.64d, 0d, 0.64d, 1d };

        public static SculptedStoneRecipe CreateRecipe(SourceRockArchetype archetype, int seed)
        {
            var recipe = new SculptedStoneRecipe { archetype = archetype, seed = seed };
            switch (archetype)
            {
                case SourceRockArchetype.CapstoneSlab:
                    recipe.radiusX = 1.95f; recipe.radiusY = .68f; recipe.radiusZ = 1.28f;
                    recipe.exponent = 3.8f; recipe.taper = -.08f; recipe.lean = .10f;
                    recipe.topTilt = -.14f; recipe.quadrantCompression = .16f;
                    break;
                case SourceRockArchetype.ChunkyBoulder:
                    recipe.radiusX = 1.35f; recipe.radiusY = 1.25f; recipe.radiusZ = 1.15f;
                    recipe.exponent = 3.2f; recipe.taper = .22f; recipe.lean = -.16f;
                    recipe.topTilt = .13f; recipe.quadrantCompression = .20f;
                    break;
                case SourceRockArchetype.ButtressWedge:
                    recipe.radiusX = 1.15f; recipe.radiusY = 1.8f; recipe.radiusZ = .90f;
                    recipe.exponent = 3.1f; recipe.taper = .38f; recipe.lean = .37f;
                    recipe.topTilt = -.18f; recipe.quadrantCompression = .23f;
                    break;
                default: throw new ArgumentOutOfRangeException(nameof(archetype));
            }
            recipe.sideFullness = .10f + Jitter(seed, 1) * .06f;
            recipe.frontFullness = -.08f + Jitter(seed, 2) * .05f;
            recipe.skew = .09f + Jitter(seed, 3) * .05f;
            recipe.twist = .09f + Jitter(seed, 4) * .04f;
            recipe.lean += Jitter(seed, 5) * .055f;
            recipe.topTilt += Jitter(seed, 6) * .06f;
            recipe.exponent += Jitter(seed, 7) * .22f;
            recipe.radiusX *= 1f + Jitter(seed, 8) * .07f;
            recipe.radiusZ *= 1f + Jitter(seed, 9) * .07f;
            recipe.baseFraction = .16f;
            return recipe;
        }

        public static SculptedStoneMesh Generate(SourceRockArchetype archetype, int seed)
            => Build(CreateRecipe(archetype, seed));

        public static SculptedStoneMesh Build(SculptedStoneRecipe r)
        {
            if (r == null) throw new ArgumentNullException(nameof(r));
            if (r.archetype < SourceRockArchetype.CapstoneSlab || r.archetype > SourceRockArchetype.ButtressWedge)
                throw new ArgumentOutOfRangeException(nameof(r.archetype));
            if (r.subdivisions != 4 || !Positive(r.radiusX) || !Positive(r.radiusY) || !Positive(r.radiusZ) ||
                !Positive(r.exponent) || r.exponent < 2f || r.exponent > 5f ||
                !Bounded(r.sideFullness, .3f) || !Bounded(r.frontFullness, .3f) ||
                !Bounded(r.taper, .45f) || !Bounded(r.lean, .5f) || !Bounded(r.skew, .2f) ||
                !Bounded(r.twist, .2f) || !Bounded(r.topTilt, .3f) ||
                !Bounded(r.quadrantCompression, .3f) || !Positive(r.baseFraction) || r.baseFraction > .25f)
                throw new ArgumentException("Sculpted stone parameters exceed the bounded modeler envelope.");
            var vertices = new List<MatterFloat3>(98);
            var indices = new List<int>(576);
            var welded = new Dictionary<int, int>();
            for (int axis = 0; axis < 3; axis++)
            for (int side = 0; side <= 4; side += 4)
            for (int u = 0; u < 4; u++)
            for (int v = 0; v < 4; v++)
            {
                int a = Vertex(axis, side, u, v, r, welded, vertices);
                int b = Vertex(axis, side, u + 1, v, r, welded, vertices);
                int c = Vertex(axis, side, u + 1, v + 1, r, welded, vertices);
                int d = Vertex(axis, side, u, v + 1, r, welded, vertices);
                // Cyclic axes make u cross v the positive face axis, before the deformation.
                if (side == 0) { int temporary = b; b = d; d = temporary; }
                if ((u + v + axis) % 2 == 0)
                { indices.Add(a); indices.Add(b); indices.Add(c); indices.Add(a); indices.Add(c); indices.Add(d); }
                else
                { indices.Add(a); indices.Add(b); indices.Add(d); indices.Add(b); indices.Add(c); indices.Add(d); }
            }
            float minimumY = float.MaxValue;
            foreach (MatterFloat3 p in vertices) minimumY = Math.Min(minimumY, p.Y);
            for (int i = 0; i < vertices.Count; i++)
            {
                MatterFloat3 p = vertices[i]; vertices[i] = new MatterFloat3(p.X, p.Y - minimumY, p.Z);
            }
            // Sculpt the existing connected shell. These are subtractive face cuts, never component assembly.
            SculptedStoneCuts.Apply(r.archetype, vertices, indices);
            var mesh = new SculptedStoneMesh(vertices.ToArray(), indices.ToArray());
            if (!mesh.Validate(out string issue)) throw new InvalidOperationException(issue);
            return mesh;
        }

        private static int Vertex(int axis, int side, int u, int v, SculptedStoneRecipe r,
            Dictionary<int, int> welded, List<MatterFloat3> vertices)
        {
            int ix = axis == 0 ? side : axis == 1 ? v : u;
            int iy = axis == 1 ? side : axis == 2 ? v : u;
            int iz = axis == 2 ? side : axis == 0 ? v : u;
            int key = ix + 5 * (iy + 5 * iz);
            if (welded.TryGetValue(key, out int found)) return found;
            double x = Stations[ix], y = Stations[iy], z = Stations[iz];
            double inverse = 1d / Math.Pow(Math.Pow(Math.Abs(x), r.exponent) +
                Math.Pow(Math.Abs(y), r.exponent) + Math.Pow(Math.Abs(z), r.exponent), 1d / r.exponent);
            x *= inverse; y *= inverse; z *= inverse;
            double height = (y + 1d) * .5d;
            double compression = 1d - r.quadrantCompression * Math.Max(0, x) * Math.Max(0, z) * height;
            double scale = (1d - r.taper * height) * compression;
            double px = x * r.radiusX * scale * (1d + r.sideFullness * x);
            double pz = z * r.radiusZ * scale * (1d + r.frontFullness * z);
            double twist = r.twist * (height - .5d);
            double rotatedX = px * Math.Cos(twist) - pz * Math.Sin(twist);
            double rotatedZ = px * Math.Sin(twist) + pz * Math.Cos(twist);
            px = rotatedX + r.lean * r.radiusY * (y + 1d) + r.skew * z * height;
            pz = rotatedZ + .06d * r.radiusZ * x * height;
            double py = y * r.radiusY + r.topTilt * x * r.radiusY * height;
            // One broad contact plane; the welded topology is retained through base shaping.
            py = Math.Max(py, -r.radiusY * (1d - r.baseFraction));
            int index = vertices.Count; welded.Add(key, index);
            vertices.Add(new MatterFloat3((float)px, (float)py, (float)pz));
            return index;
        }

        private static bool Positive(float v) => v > 0 && !float.IsNaN(v) && !float.IsInfinity(v);
        private static bool Bounded(float v, float limit) => !float.IsNaN(v) && Math.Abs(v) <= limit;
        private static float Jitter(int seed, uint channel)
        {
            unchecked
            {
                uint n = (uint)seed ^ (channel * 0x9E3779B9u);
                n ^= n >> 16; n *= 0x7FEB352Du; n ^= n >> 15; n *= 0x846CA68Bu; n ^= n >> 16;
                return (n & 0xFFFFFFu) / 8388607.5f - 1f;
            }
        }
    }
}
