using System;
using System.Collections.Generic;

namespace Wildkin.Matter
{
    /// <summary>Three large subtractive cuts through a single sculpted shell; closed caps share boundary indices.</summary>
    internal static class SculptedStoneCuts
    {
        public static void Apply(SourceRockArchetype archetype, List<MatterFloat3> vertices, List<int> triangles)
        {
            if (archetype == SourceRockArchetype.CapstoneSlab)
            {
                Cut(vertices, triangles, new MatterFloat3(.12f, 1f, -.23f), .80);
                Cut(vertices, triangles, new MatterFloat3(.9f, .12f, -.72f), .78);
                Cut(vertices, triangles, new MatterFloat3(-.75f, .32f, .6f), .87);
            }
            else if (archetype == SourceRockArchetype.ChunkyBoulder)
            {
                Cut(vertices, triangles, new MatterFloat3(.46f, 1f, -.38f), .74);
                Cut(vertices, triangles, new MatterFloat3(-1f, .27f, -.48f), .79);
                Cut(vertices, triangles, new MatterFloat3(.42f, -.14f, 1f), .88);
            }
            else
            {
                Cut(vertices, triangles, new MatterFloat3(.82f, .72f, -.14f), .72);
                Cut(vertices, triangles, new MatterFloat3(-.84f, .24f, .72f), .80);
                Cut(vertices, triangles, new MatterFloat3(.12f, -.24f, -1f), .88);
            }
        }

        private static void Cut(List<MatterFloat3> vertices, List<int> triangles, MatterFloat3 normal, double fraction)
        {
            double invLength = 1d / Math.Sqrt(SculptedStoneMesh.Dot(normal, normal));
            normal = new MatterFloat3((float)(normal.X * invLength), (float)(normal.Y * invLength), (float)(normal.Z * invLength));
            double minimum = double.MaxValue, maximum = double.MinValue;
            foreach (MatterFloat3 p in vertices)
            {
                double projection = SculptedStoneMesh.Dot(normal, p);
                minimum = Math.Min(minimum, projection); maximum = Math.Max(maximum, projection);
            }
            double distance = minimum + (maximum - minimum) * fraction;
            // A cut almost through an existing vertex produces numerical sliver triangles.
            // Move only that cut by a sub-centimetre bounded amount, before constructing intersections.
            double clearance = (maximum - minimum) * .001d;
            bool separated = false;
            for (int attempt = 0; attempt < 32; attempt++)
            {
                separated = true;
                foreach (MatterFloat3 p in vertices)
                    if (Math.Abs(SculptedStoneMesh.Dot(normal, p) - distance) < clearance)
                    { separated = false; break; }
                if (separated) break;
                distance += clearance * 1.37d;
            }
            if (!separated) throw new InvalidOperationException("Cut could not avoid existing vertices within the numerical repair bound.");
            var output = new List<int>();
            var intersections = new Dictionary<ulong, int>();
            var boundary = new HashSet<int>();
            for (int i = 0; i < triangles.Count; i += 3)
            {
                var polygon = new List<int>(4);
                for (int edge = 0; edge < 3; edge++)
                {
                    int a = triangles[i + edge], b = triangles[i + (edge + 1) % 3];
                    double da = SculptedStoneMesh.Dot(normal, vertices[a]) - distance;
                    double db = SculptedStoneMesh.Dot(normal, vertices[b]) - distance;
                    if (da <= 0) polygon.Add(a);
                    if ((da <= 0) == (db <= 0)) continue;
                    ulong key = ((ulong)(uint)Math.Min(a, b) << 32) | (uint)Math.Max(a, b);
                    if (!intersections.TryGetValue(key, out int intersection))
                    {
                        double t = da / (da - db); MatterFloat3 pa = vertices[a], pb = vertices[b];
                        intersection = vertices.Count;
                        vertices.Add(new MatterFloat3((float)(pa.X + t * (pb.X - pa.X)),
                            (float)(pa.Y + t * (pb.Y - pa.Y)), (float)(pa.Z + t * (pb.Z - pa.Z))));
                        intersections.Add(key, intersection);
                    }
                    polygon.Add(intersection); boundary.Add(intersection);
                }
                for (int p = 1; p + 1 < polygon.Count; p++)
                { output.Add(polygon[0]); output.Add(polygon[p]); output.Add(polygon[p + 1]); }
            }
            if (boundary.Count < 3) throw new InvalidOperationException("A deliberate cut must intersect one broad shell face.");
            double cx = 0, cy = 0, cz = 0;
            foreach (int index in boundary)
            { MatterFloat3 p = vertices[index]; cx += p.X; cy += p.Y; cz += p.Z; }
            var center = new MatterFloat3((float)(cx / boundary.Count), (float)(cy / boundary.Count), (float)(cz / boundary.Count));
            MatterFloat3 axis = Math.Abs(normal.Y) < .8f ? new MatterFloat3(0, 1, 0) : new MatterFloat3(1, 0, 0);
            MatterFloat3 u = SculptedStoneMesh.Cross(axis, normal), v = SculptedStoneMesh.Cross(normal, u);
            // Equal lengths are required for angle sorting on the cut plane.
            double uLength = Math.Sqrt(SculptedStoneMesh.Dot(u, u));
            u = new MatterFloat3((float)(u.X / uLength), (float)(u.Y / uLength), (float)(u.Z / uLength));
            v = SculptedStoneMesh.Cross(normal, u);
            var ring = new List<int>(boundary); ring.Sort((a, b) =>
            {
                MatterFloat3 pa = SculptedStoneMesh.Subtract(vertices[a], center), pb = SculptedStoneMesh.Subtract(vertices[b], center);
                double aa = Math.Atan2(SculptedStoneMesh.Dot(pa, v), SculptedStoneMesh.Dot(pa, u));
                double ab = Math.Atan2(SculptedStoneMesh.Dot(pb, v), SculptedStoneMesh.Dot(pb, u));
                int comparison = aa.CompareTo(ab); return comparison != 0 ? comparison : a.CompareTo(b);
            });
            int centerIndex = vertices.Count; vertices.Add(center);
            for (int i = 0; i < ring.Count; i++)
            { output.Add(centerIndex); output.Add(ring[i]); output.Add(ring[(i + 1) % ring.Count]); }
            // Drop discarded vertices so topology/hash/connectivity describe the actual retained shell.
            var used = new bool[vertices.Count]; foreach (int index in output) used[index] = true;
            var remap = new int[vertices.Count]; var compact = new List<MatterFloat3>();
            for (int i = 0; i < vertices.Count; i++)
                if (used[i]) { remap[i] = compact.Count; compact.Add(vertices[i]); }
            for (int i = 0; i < output.Count; i++) output[i] = remap[output[i]];
            vertices.Clear(); vertices.AddRange(compact); triangles.Clear(); triangles.AddRange(output);
        }
    }
}
