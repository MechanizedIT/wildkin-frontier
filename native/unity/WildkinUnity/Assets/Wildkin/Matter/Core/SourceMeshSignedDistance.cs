using System;

namespace Wildkin.Matter
{
    /// <summary>Exact triangle distance and deterministic parity, with solid-angle fallback for ambiguous edge hits.</summary>
    public sealed class SourceMeshSignedDistance
    {
        private readonly SculptedStoneMesh _mesh;
        private static readonly D3 RayDirection = new D3(.901, .317, .293).Normalized;
        public SourceMeshSignedDistance(SculptedStoneMesh mesh)
        {
            _mesh = mesh ?? throw new ArgumentNullException(nameof(mesh));
            if (!mesh.Validate(out string issue)) throw new ArgumentException(issue, nameof(mesh));
        }

        public float Sample(MatterFloat3 position)
        {
            if (float.IsNaN(position.X) || float.IsNaN(position.Y) || float.IsNaN(position.Z) ||
                float.IsInfinity(position.X) || float.IsInfinity(position.Y) || float.IsInfinity(position.Z))
                throw new ArgumentOutOfRangeException(nameof(position));
            D3 p = new D3(position);
            double nearestSquared = double.MaxValue;
            int crossings = 0; bool ambiguous = false;
            for (int triangle = 0; triangle < _mesh.TriangleCount; triangle++)
            {
                D3 a = Vertex(triangle, 0), b = Vertex(triangle, 1), c = Vertex(triangle, 2);
                nearestSquared = Math.Min(nearestSquared, DistanceSquared(p, a, b, c));
                D3 e1 = b - a, e2 = c - a, h = D3.Cross(RayDirection, e2);
                double determinant = D3.Dot(e1, h);
                if (Math.Abs(determinant) < 1e-12) continue;
                D3 offset = p - a; double inverse = 1d / determinant;
                double u = D3.Dot(offset, h) * inverse;
                D3 q = D3.Cross(offset, e1); double v = D3.Dot(RayDirection, q) * inverse;
                double t = D3.Dot(e2, q) * inverse;
                if (t <= 0 || u < -1e-8 || v < -1e-8 || u + v > 1d + 1e-8) continue;
                if (u <= 1e-8 || v <= 1e-8 || u + v >= 1d - 1e-8) ambiguous = true;
                if (u >= 0 && v >= 0 && u + v <= 1) crossings++;
            }
            double distance = Math.Sqrt(nearestSquared);
            if (distance < 1e-7) return 0;
            bool inside = ambiguous ? IsInsideByWinding(p) : crossings % 2 != 0;
            return (float)(inside ? distance : -distance);
        }

        private bool IsInsideByWinding(D3 p)
        {
            double solidAngle = 0;
            for (int triangle = 0; triangle < _mesh.TriangleCount; triangle++)
            {
                D3 a = Vertex(triangle, 0) - p, b = Vertex(triangle, 1) - p, c = Vertex(triangle, 2) - p;
                double la = a.Length, lb = b.Length, lc = c.Length;
                solidAngle += 2 * Math.Atan2(D3.Dot(a, D3.Cross(b, c)),
                    la * lb * lc + D3.Dot(a, b) * lc + D3.Dot(b, c) * la + D3.Dot(c, a) * lb);
            }
            return Math.Abs(solidAngle) > 2 * Math.PI;
        }

        private D3 Vertex(int triangle, int corner) => new D3(_mesh.GetVertex(_mesh.GetIndex(triangle * 3 + corner)));

        // Closest point on triangle, including face, edge and vertex Voronoi regions.
        private static double DistanceSquared(D3 p, D3 a, D3 b, D3 c)
        {
            D3 ab = b - a, ac = c - a, ap = p - a;
            double d1 = D3.Dot(ab, ap), d2 = D3.Dot(ac, ap);
            if (d1 <= 0 && d2 <= 0) return ap.Squared;
            D3 bp = p - b; double d3 = D3.Dot(ab, bp), d4 = D3.Dot(ac, bp);
            if (d3 >= 0 && d4 <= d3) return bp.Squared;
            double vc = d1 * d4 - d3 * d2;
            if (vc <= 0 && d1 >= 0 && d3 <= 0) return (p - (a + ab * (d1 / (d1 - d3)))).Squared;
            D3 cp = p - c; double d5 = D3.Dot(ab, cp), d6 = D3.Dot(ac, cp);
            if (d6 >= 0 && d5 <= d6) return cp.Squared;
            double vb = d5 * d2 - d1 * d6;
            if (vb <= 0 && d2 >= 0 && d6 <= 0) return (p - (a + ac * (d2 / (d2 - d6)))).Squared;
            double va = d3 * d6 - d5 * d4;
            if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0)
                return (p - (b + (c - b) * ((d4 - d3) / ((d4 - d3) + (d5 - d6))))).Squared;
            double inverse = 1d / (va + vb + vc);
            return (p - (a + ab * (vb * inverse) + ac * (vc * inverse))).Squared;
        }

        private readonly struct D3
        {
            public readonly double X, Y, Z;
            public D3(double x, double y, double z) { X = x; Y = y; Z = z; }
            public D3(MatterFloat3 p) { X = p.X; Y = p.Y; Z = p.Z; }
            public double Squared => X * X + Y * Y + Z * Z;
            public double Length => Math.Sqrt(Squared);
            public D3 Normalized => this * (1 / Length);
            public static D3 operator +(D3 a, D3 b) => new D3(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
            public static D3 operator -(D3 a, D3 b) => new D3(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
            public static D3 operator *(D3 a, double s) => new D3(a.X * s, a.Y * s, a.Z * s);
            public static double Dot(D3 a, D3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;
            public static D3 Cross(D3 a, D3 b) => new D3(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);
        }
    }
}
