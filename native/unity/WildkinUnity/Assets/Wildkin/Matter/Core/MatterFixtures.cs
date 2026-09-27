using System;

namespace Wildkin.Matter
{
    public enum MatterFixtureId : byte
    {
        SmoothOrganic = 0,
        LayeredRock = 1,
        CliffCave = 2,
        MaterialBoundary = 3,
        MinedCavity = 4,
        DetachedIrregular = 5
    }

    /// <summary>
    /// Frozen engine-light scalar fixtures used by every U3 mesher and resolution comparison.
    /// Coordinates are evaluated in metres from global integer sample addresses.
    /// </summary>
    public sealed class MatterFixtureSource : IMatterSampleSource
    {
        public const int FixtureSourceVersion = 1;
        public const int DefaultSeed = 20260927;

        public int SourceVersion => FixtureSourceVersion;
        public MatterFixtureId Fixture { get; }

        public MatterFixtureSource(MatterFixtureId fixture)
        {
            if (!Enum.IsDefined(typeof(MatterFixtureId), fixture))
                throw new ArgumentOutOfRangeException(nameof(fixture));
            Fixture = fixture;
        }

        public MatterSample Sample(MatterSampleAddress address, int worldSeed, float sampleSpacingMeters)
        {
            if (!IsFinite(sampleSpacingMeters) || sampleSpacingMeters <= 0f)
                throw new ArgumentOutOfRangeException(nameof(sampleSpacingMeters));

            double x = (double)address.X * sampleSpacingMeters;
            double y = (double)address.Y * sampleSpacingMeters;
            double z = (double)address.Z * sampleSpacingMeters;
            double density;
            MatterMaterialId material = MatterMaterialId.Rock;

            switch (Fixture)
            {
                case MatterFixtureId.SmoothOrganic:
                    density = Ellipsoid(x, y, z, 0d, 0.15d, 0d, 2.65d, 1.75d, 2.15d);
                    density += ValueNoise(x * 0.47d, y * 0.53d, z * 0.49d, worldSeed + 17) * 0.15d;
                    break;

                case MatterFixtureId.LayeredRock:
                    density = LayeredRock(x, y, z, worldSeed);
                    break;

                case MatterFixtureId.CliffCave:
                    density = CliffCave(x, y, z, worldSeed);
                    break;

                case MatterFixtureId.MaterialBoundary:
                    double dirtSurface = 0.42d + ValueNoise(x * 0.28d, 0d, z * 0.31d, worldSeed + 31) * 0.10d - y;
                    double dirtShape = RoundedBox(x, y, z, 0d, -0.52d, 0d,
                        2.55d, 1.35d, 2.20d, 0.22d, -0.16d);
                    double dirt = Math.Min(dirtSurface, dirtShape);
                    double rock = RoundedBox(x, y, z, -0.05d, -0.42d, 0.10d,
                        1.85d, 1.20d, 1.60d, 0.24d, -0.16d);
                    density = Math.Max(dirt, rock);
                    material = rock > dirt ? MatterMaterialId.Rock : MatterMaterialId.Dirt;
                    break;

                case MatterFixtureId.MinedCavity:
                    density = Ellipsoid(x, y, z, 0d, 0.05d, 0d, 2.75d, 1.80d, 2.30d);
                    density += ValueNoise(x * 0.39d, y * 0.43d, z * 0.41d, worldSeed + 53) * 0.08d;
                    double bite = Ellipsoid(x, y, z, 0.50d, 0.05d, -1.72d, 1.05d, 0.98d, 1.32d);
                    density = Math.Min(density, -bite);
                    break;

                case MatterFixtureId.DetachedIrregular:
                    density = DetachedIrregular(x, y, z, worldSeed);
                    break;

                default:
                    throw new ArgumentOutOfRangeException(nameof(Fixture));
            }

            if (!IsFinite(density))
                throw new InvalidOperationException("A deterministic matter fixture produced a non-finite density.");
            return density > 0d
                ? new MatterSample((float)density, material)
                : MatterSample.Air((float)Math.Min(density, 0d));
        }

        private static double LayeredRock(double x, double y, double z, int seed)
        {
            double shift = MatterDeterministicNoise.Signed(seed, 1, 0, 71) * 0.10d;
            double baseMass = RoundedBox(x, y, z, 0d, 0.18d, 0.08d,
                1.88d, 1.08d, 1.58d, 0.30d, 0.12d);
            double lowerMass = RoundedBox(x, y, z, -1.08d + shift, -0.47d, 0.11d,
                1.25d, 0.72d, 1.47d, 0.20d, -0.23d);
            double upperMass = RoundedBox(x, y, z, 0.82d - shift, 1.03d, -0.16d,
                1.15d, 0.68d, 1.13d, 0.18d, 0.25d);
            double shelf = RoundedBox(x, y, z, 0.08d, -0.15d, 1.18d,
                1.24d, 0.34d, 0.52d, 0.13d, -0.08d);
            double union = SmoothMax(baseMass, lowerMass, 0.30d);
            union = SmoothMax(union, upperMass, 0.25d);
            union = SmoothMax(union, shelf, 0.16d);
            return union + ValueNoise(x * 0.54d, y * 0.47d, z * 0.56d, seed + 83) * 0.035d;
        }

        private static double CliffCave(double x, double y, double z, int seed)
        {
            double cliff = RoundedBox(x, y, z, 0d, 0.38d, 0.38d,
                2.85d, 2.10d, 1.95d, 0.30d, 0.02d);
            double lowerLedge = RoundedBox(x, y, z, 0.08d, -1.03d, -0.38d,
                2.70d, 0.72d, 2.20d, 0.22d, -0.04d);
            double mass = SmoothMax(cliff, lowerLedge, 0.22d);
            double cave = Ellipsoid(x, y, z, 0.06d, -0.18d, -1.34d,
                1.48d, 1.03d, 2.42d);
            double shallowCut = Ellipsoid(x, y, z, -0.10d, 0.86d, -0.88d,
                0.82d, 0.38d, 1.35d);
            mass = Math.Min(mass, -cave);
            mass = Math.Min(mass, -shallowCut);
            return mass + ValueNoise(x * 0.36d, y * 0.32d, z * 0.38d, seed + 97) * 0.04d;
        }

        private static double DetachedIrregular(double x, double y, double z, int seed)
        {
            double shift = MatterDeterministicNoise.Signed(seed, 7, 0, 113) * 0.18d;
            double shardA = Ellipsoid(x, y, z, -0.78d + shift, -0.08d, 0.18d,
                1.38d, 0.92d, 1.60d);
            double shardB = RoundedBox(x, y, z, 0.55d, 0.22d, -0.16d,
                1.15d, 0.78d, 1.18d, 0.17d, 0.37d);
            double shardC = Ellipsoid(x, y, z, 0.25d, -0.68d, 0.66d,
                0.83d, 0.58d, 0.96d);
            double union = SmoothMax(shardA, shardB, 0.12d);
            union = SmoothMax(union, shardC, 0.10d);
            return union + ValueNoise(x * 0.61d, y * 0.58d, z * 0.64d, seed + 127) * 0.045d;
        }

        private static double Ellipsoid(
            double x, double y, double z, double cx, double cy, double cz,
            double rx, double ry, double rz)
        {
            double nx = (x - cx) / rx;
            double ny = (y - cy) / ry;
            double nz = (z - cz) / rz;
            return (1d - Math.Sqrt(nx * nx + ny * ny + nz * nz)) * Math.Min(rx, Math.Min(ry, rz));
        }

        private static double RoundedBox(
            double x, double y, double z, double cx, double cy, double cz,
            double hx, double hy, double hz, double bevel, double yawRadians)
        {
            double cosine = Math.Cos(yawRadians);
            double sine = Math.Sin(yawRadians);
            double dx = x - cx;
            double dz = z - cz;
            double localX = cosine * dx + sine * dz;
            double localZ = -sine * dx + cosine * dz;
            double qx = Math.Abs(localX) - (hx - bevel);
            double qy = Math.Abs(y - cy) - (hy - bevel);
            double qz = Math.Abs(localZ) - (hz - bevel);
            double ox = Math.Max(qx, 0d);
            double oy = Math.Max(qy, 0d);
            double oz = Math.Max(qz, 0d);
            double outside = Math.Sqrt(ox * ox + oy * oy + oz * oz);
            double inside = Math.Min(Math.Max(qx, Math.Max(qy, qz)), 0d);
            return bevel - outside - inside;
        }

        private static double SmoothMax(double a, double b, double radius)
        {
            if (radius <= 0d) return Math.Max(a, b);
            double h = Math.Max(radius - Math.Abs(a - b), 0d) / radius;
            return Math.Max(a, b) + h * h * radius * 0.25d;
        }

        private static double ValueNoise(double x, double y, double z, int seed)
        {
            int ix = FloorToInt(x);
            int iy = FloorToInt(y);
            int iz = FloorToInt(z);
            double tx = Smooth01(x - ix);
            double ty = Smooth01(y - iy);
            double tz = Smooth01(z - iz);
            double z00 = Lerp(HashValue(ix, iy, iz, seed), HashValue(ix + 1, iy, iz, seed), tx);
            double z10 = Lerp(HashValue(ix, iy + 1, iz, seed), HashValue(ix + 1, iy + 1, iz, seed), tx);
            double z01 = Lerp(HashValue(ix, iy, iz + 1, seed), HashValue(ix + 1, iy, iz + 1, seed), tx);
            double z11 = Lerp(HashValue(ix, iy + 1, iz + 1, seed), HashValue(ix + 1, iy + 1, iz + 1, seed), tx);
            return Lerp(Lerp(z00, z10, ty), Lerp(z01, z11, ty), tz);
        }

        private static double HashValue(int x, int y, int z, int seed)
        {
            unchecked
            {
                uint value = (uint)seed ^ ((uint)x * 0x9E3779B9u) ^
                    ((uint)y * 0x85EBCA6Bu) ^ ((uint)z * 0xC2B2AE35u);
                value ^= value >> 16;
                value *= 0x7FEB352Du;
                value ^= value >> 15;
                value *= 0x846CA68Bu;
                value ^= value >> 16;
                return value / (double)uint.MaxValue * 2d - 1d;
            }
        }

        private static int FloorToInt(double value)
        {
            int truncated = (int)value;
            return value < truncated ? truncated - 1 : truncated;
        }

        private static double Smooth01(double value) => value * value * (3d - 2d * value);
        private static double Lerp(double a, double b, double t) => a + (b - a) * t;
        private static bool IsFinite(double value) => !double.IsNaN(value) && !double.IsInfinity(value);
        private static bool IsFinite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
    }

    public static class MatterFixtureWorldFactory
    {
        public const float UniformSpacingCoarse = 0.50f;
        public const float UniformSpacingFine = 0.25f;

        public static MatterWorld Create(
            MatterFixtureId fixture,
            float sampleSpacingMeters,
            int seed = MatterFixtureSource.DefaultSeed)
        {
            return new MatterWorld(seed, sampleSpacingMeters, new MatterFixtureSource(fixture));
        }
    }
}
