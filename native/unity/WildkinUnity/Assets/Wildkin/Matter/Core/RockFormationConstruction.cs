using System;
using System.Collections.Generic;

namespace Wildkin.Matter
{
    public enum RockConstructionMode : byte
    {
        U4Control,
        DistinctCluster,
        SelectiveFormation
    }

    public enum RockFormationArchetype : byte
    {
        Auto,
        StackedLedge,
        Buttress,
        BrokenRidge,
        SplitCluster
    }

    public enum RockStoneRole : byte
    {
        Foundation,
        MainBody,
        SideBlock,
        Capstone,
        Shoulder,
        Filler,
        RearBrace,
        Accent
    }

    public readonly struct RockStoneClipPlane
    {
        public readonly MatterFloat3 Normal;
        public readonly float Offset;

        public RockStoneClipPlane(MatterFloat3 normal, float offset)
        {
            Normal = normal;
            Offset = offset;
        }
    }

    /// <summary>One bounded, faceted half-space stone recipe. It is discarded after MatterWorld resolution.</summary>
    public sealed class RockStoneRecipe
    {
        private readonly RockStoneClipPlane[] _clipPlanes;

        public int Id { get; }
        public RockStoneRole Role { get; }
        public int ConnectionGroup { get; }
        public MatterFloat3 Center { get; }
        public MatterFloat3 HalfExtents { get; }
        public MatterFloat3 RotationRadians { get; }
        public float BevelMeters { get; }
        public IReadOnlyList<RockStoneClipPlane> ClipPlanes => _clipPlanes;

        internal RockStoneRecipe(int id, RockStoneRole role, int connectionGroup, MatterFloat3 center,
            MatterFloat3 halfExtents, MatterFloat3 rotationRadians, float bevelMeters,
            RockStoneClipPlane[] clipPlanes)
        {
            Id = id;
            Role = role;
            ConnectionGroup = connectionGroup;
            Center = center;
            HalfExtents = halfExtents;
            RotationRadians = rotationRadians;
            BevelMeters = bevelMeters;
            _clipPlanes = clipPlanes ?? Array.Empty<RockStoneClipPlane>();
        }

        public float Evaluate(float x, float y, float z)
        {
            MatterFloat3 local = RockFormationRecipe.RotateInverse(
                x - Center.X, y - Center.Y, z - Center.Z, RotationRadians);
            float result = Math.Min(HalfExtents.X - Math.Abs(local.X),
                Math.Min(HalfExtents.Y - Math.Abs(local.Y), HalfExtents.Z - Math.Abs(local.Z)));
            for (int index = 0; index < _clipPlanes.Length; index++)
            {
                RockStoneClipPlane plane = _clipPlanes[index];
                float face = plane.Offset - (plane.Normal.X * local.X + plane.Normal.Y * local.Y + plane.Normal.Z * local.Z);
                result = RockFormationRecipe.SmoothMinimum(result, face, BevelMeters);
            }
            return result;
        }

        public bool HasFiniteBoundedParameters(float maxExtentMeters = 2.8f)
        {
            return RockFormationRecipe.Finite(Center.X) && RockFormationRecipe.Finite(Center.Y) && RockFormationRecipe.Finite(Center.Z) &&
                   RockFormationRecipe.Finite(HalfExtents.X) && RockFormationRecipe.Finite(HalfExtents.Y) && RockFormationRecipe.Finite(HalfExtents.Z) &&
                   HalfExtents.X >= 0.35f && HalfExtents.Y >= 0.28f && HalfExtents.Z >= 0.35f &&
                   HalfExtents.X <= maxExtentMeters && HalfExtents.Y <= maxExtentMeters && HalfExtents.Z <= maxExtentMeters &&
                   RockFormationRecipe.Finite(RotationRadians.X) && RockFormationRecipe.Finite(RotationRadians.Y) && RockFormationRecipe.Finite(RotationRadians.Z) &&
                   RockFormationRecipe.Finite(BevelMeters) && BevelMeters >= 0.025f && BevelMeters <= 0.20f &&
                   _clipPlanes.Length >= 2 && _clipPlanes.Length <= 4;
        }
    }

    /// <summary>Composition recipe separating individual stone shape from formation layout.</summary>
    public sealed class RockFormationRecipe
    {
        public const float SelectiveCoreBlendMeters = 0.40f;
        private readonly RockStoneRecipe[] _stones;

        public int Seed { get; }
        public RockFormationArchetype Archetype { get; }
        public IReadOnlyList<RockStoneRecipe> Stones => _stones;
        public int StoneCount => _stones.Length;
        public string RoleSummary { get; }

        internal RockFormationRecipe(int seed, RockFormationArchetype archetype, RockStoneRecipe[] stones)
        {
            Seed = seed;
            Archetype = archetype;
            _stones = stones ?? throw new ArgumentNullException(nameof(stones));
            int foundation = 0, body = 0, sides = 0, caps = 0, shoulders = 0, fillers = 0, braces = 0, accents = 0;
            for (int index = 0; index < _stones.Length; index++)
            {
                switch (_stones[index].Role)
                {
                    case RockStoneRole.Foundation: foundation++; break;
                    case RockStoneRole.MainBody: body++; break;
                    case RockStoneRole.SideBlock: sides++; break;
                    case RockStoneRole.Capstone: caps++; break;
                    case RockStoneRole.Shoulder: shoulders++; break;
                    case RockStoneRole.Filler: fillers++; break;
                    case RockStoneRole.RearBrace: braces++; break;
                    case RockStoneRole.Accent: accents++; break;
                }
            }
            RoleSummary = $"foundation:{foundation},main:{body},side:{sides},cap:{caps},shoulder:{shoulders},filler:{fillers},brace:{braces},accent:{accents}";
        }

        public float Evaluate(float x, float y, float z, RockConstructionMode mode)
        {
            float group0 = float.NegativeInfinity;
            float group1 = float.NegativeInfinity;
            float group2 = float.NegativeInfinity;
            for (int index = 0; index < _stones.Length; index++)
            {
                RockStoneRecipe stone = _stones[index];
                float value = stone.Evaluate(x, y, z);
                float blend = mode == RockConstructionMode.SelectiveFormation && stone.ConnectionGroup == 0
                    ? SelectiveCoreBlendMeters : 0f;
                switch (stone.ConnectionGroup)
                {
                    case 0: group0 = SmoothMaximum(group0, value, blend); break;
                    case 1: group1 = SmoothMaximum(group1, value, blend); break;
                    default: group2 = SmoothMaximum(group2, value, blend); break;
                }
            }
            // Only the authored core group receives the restrained union. Capstones and accent
            // stones remain separate matter where their recipe leaves a real gap.
            return Math.Max(group0, Math.Max(group1, group2));
        }

        public bool HasValidStructure()
        {
            if (_stones.Length < 4 || _stones.Length > 9) return false;
            for (int index = 0; index < _stones.Length; index++)
                if (!_stones[index].HasFiniteBoundedParameters()) return false;
            return true;
        }

        internal static float SmoothMinimum(float a, float b, float radius)
        {
            if (float.IsPositiveInfinity(a)) return b;
            if (radius <= 0f) return Math.Min(a, b);
            float h = Math.Max(radius - Math.Abs(a - b), 0f) / radius;
            return Math.Min(a, b) - h * h * radius * 0.25f;
        }

        internal static float SmoothMaximum(float a, float b, float radius)
        {
            if (float.IsNegativeInfinity(a)) return b;
            if (radius <= 0f) return Math.Max(a, b);
            float h = Math.Max(radius - Math.Abs(a - b), 0f) / radius;
            return Math.Max(a, b) + h * h * radius * 0.25f;
        }

        internal static MatterFloat3 RotateInverse(float x, float y, float z, MatterFloat3 euler)
        {
            float cx = (float)Math.Cos(euler.X), sx = (float)Math.Sin(euler.X);
            float cy = (float)Math.Cos(euler.Y), sy = (float)Math.Sin(euler.Y);
            float cz = (float)Math.Cos(euler.Z), sz = (float)Math.Sin(euler.Z);
            float rzX = cz * x + sz * y, rzY = -sz * x + cz * y;
            float ryX = cy * rzX - sy * z, ryZ = sy * rzX + cy * z;
            float rxY = cx * rzY + sx * ryZ, rxZ = -sx * rzY + cx * ryZ;
            return new MatterFloat3(ryX, rxY, rxZ);
        }

        internal static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
    }

    public static class RockFormationRecipeGenerator
    {
        public static RockFormationRecipe Generate(int seed, RockFormationArchetype archetype, int variationAttempt = 0)
        {
            if (archetype == RockFormationArchetype.Auto) archetype = ArchetypeForSeed(seed);
            if (archetype < RockFormationArchetype.StackedLedge || archetype > RockFormationArchetype.SplitCluster)
                throw new ArgumentOutOfRangeException(nameof(archetype));
            if (variationAttempt < 0 || variationAttempt > 3) throw new ArgumentOutOfRangeException(nameof(variationAttempt));

            var random = new RecipeRandom(unchecked((uint)seed) ^ ((uint)archetype * 0x9E3779B9u) ^
                                          ((uint)variationAttempt * 0x85EBCA6Bu) ^ 0xD1B54A35u);
            var stones = new List<RockStoneRecipe>(8);
            switch (archetype)
            {
                case RockFormationArchetype.StackedLedge: BuildStackedLedge(stones, ref random); break;
                case RockFormationArchetype.Buttress: BuildButtress(stones, ref random); break;
                case RockFormationArchetype.BrokenRidge: BuildBrokenRidge(stones, ref random); break;
                case RockFormationArchetype.SplitCluster: BuildSplitCluster(stones, ref random); break;
            }
            return new RockFormationRecipe(seed, archetype, stones.ToArray());
        }

        public static RockFormationArchetype ArchetypeForSeed(int seed)
            => (RockFormationArchetype)(1 + (int)(unchecked((uint)seed) % 4u));

        private static void BuildStackedLedge(List<RockStoneRecipe> stones, ref RecipeRandom r)
        {
            Add(stones, ref r, RockStoneRole.Foundation, 0, 0f, 0.38f, 0f, 2.0f, 0.40f, 1.34f, 0.02f, 0.10f, 0f);
            Add(stones, ref r, RockStoneRole.MainBody, 0, -0.82f, 1.24f, 0.02f, 1.10f, 0.76f, 1.02f, -0.03f, -0.08f, 0.02f);
            Add(stones, ref r, RockStoneRole.SideBlock, 0, 1.08f, 1.02f, 0.16f, 0.91f, 0.66f, 0.92f, 0.04f, 0.12f, -0.03f);
            Add(stones, ref r, RockStoneRole.Shoulder, 0, -0.12f, 1.85f, 0.46f, 1.14f, 0.55f, 0.72f, 0.06f, -0.04f, -0.08f);
            Add(stones, ref r, RockStoneRole.Capstone, 1, 0.26f, 2.74f, -0.08f, 1.12f, 0.37f, 0.88f, -0.06f, 0.15f, 0.02f);
            Add(stones, ref r, RockStoneRole.RearBrace, 0, 0.10f, 1.15f, 1.33f, 0.72f, 0.67f, 0.52f, 0.02f, 0.20f, 0.03f);
            // Keep one readable loose stone outside the ledge footprint. Its bounded gap is
            // intentional: resolving to ordinary matter must preserve a substantial second component.
            Add(stones, ref r, RockStoneRole.Accent, 2, -3.60f, 1.34f, -0.18f, 0.68f, 0.66f, 0.68f, 0.06f, -0.18f, 0.05f);
        }

        private static void BuildButtress(List<RockStoneRecipe> stones, ref RecipeRandom r)
        {
            Add(stones, ref r, RockStoneRole.Foundation, 0, 0f, 0.34f, 0f, 1.83f, 0.40f, 1.24f, 0.03f, -0.06f, 0f);
            Add(stones, ref r, RockStoneRole.MainBody, 0, -0.06f, 1.88f, -0.02f, 1.02f, 1.55f, 0.91f, 0.02f, 0.04f, -0.04f);
            Add(stones, ref r, RockStoneRole.SideBlock, 0, 0.91f, 1.18f, 0.05f, 0.72f, 0.82f, 0.83f, -0.03f, -0.12f, 0.04f);
            Add(stones, ref r, RockStoneRole.RearBrace, 0, -0.23f, 1.40f, 1.06f, 0.72f, 0.83f, 0.63f, 0.02f, 0.08f, 0.03f);
            Add(stones, ref r, RockStoneRole.Shoulder, 1, -1.63f, 1.05f, 0.12f, 0.67f, 0.88f, 0.76f, 0.06f, 0.14f, -0.02f);
            Add(stones, ref r, RockStoneRole.Capstone, 0, 0.12f, 3.34f, -0.06f, 0.91f, 0.40f, 0.78f, -0.04f, -0.10f, 0.02f);
            Add(stones, ref r, RockStoneRole.Accent, 2, 1.78f, 0.82f, -0.05f, 0.56f, 0.50f, 0.67f, 0.04f, 0.10f, 0.02f);
        }

        private static void BuildBrokenRidge(List<RockStoneRecipe> stones, ref RecipeRandom r)
        {
            Add(stones, ref r, RockStoneRole.Foundation, 0, 0.04f, 0.32f, 0f, 2.13f, 0.34f, 0.99f, 0f, 0.06f, 0.03f);
            Add(stones, ref r, RockStoneRole.MainBody, 0, -1.52f, 0.92f, 0.04f, 0.88f, 0.70f, 0.79f, 0.02f, -0.18f, 0.04f);
            Add(stones, ref r, RockStoneRole.MainBody, 0, 0.06f, 1.22f, -0.10f, 1.02f, 1.01f, 0.80f, -0.05f, 0.14f, 0.02f);
            Add(stones, ref r, RockStoneRole.SideBlock, 1, 1.74f, 0.87f, 0.12f, 0.83f, 0.66f, 0.73f, 0.04f, -0.06f, -0.04f);
            Add(stones, ref r, RockStoneRole.Capstone, 0, -0.54f, 2.05f, 0.04f, 0.78f, 0.38f, 0.64f, 0.02f, 0.16f, -0.03f);
            Add(stones, ref r, RockStoneRole.Shoulder, 1, 2.88f, 1.31f, -0.04f, 0.58f, 0.78f, 0.71f, -0.04f, 0.14f, 0.06f);
            Add(stones, ref r, RockStoneRole.Accent, 2, -2.66f, 0.82f, 0.02f, 0.54f, 0.54f, 0.60f, 0.03f, 0.22f, -0.01f);
        }

        private static void BuildSplitCluster(List<RockStoneRecipe> stones, ref RecipeRandom r)
        {
            Add(stones, ref r, RockStoneRole.Foundation, 0, -0.18f, 0.32f, 0f, 1.78f, 0.32f, 1.12f, 0.02f, -0.04f, 0f);
            Add(stones, ref r, RockStoneRole.MainBody, 0, -1.35f, 1.56f, -0.02f, 1.02f, 1.16f, 0.96f, -0.04f, 0.12f, 0.03f);
            Add(stones, ref r, RockStoneRole.MainBody, 1, 1.42f, 1.58f, 0.05f, 1.01f, 1.18f, 0.94f, 0.03f, -0.16f, -0.02f);
            Add(stones, ref r, RockStoneRole.Shoulder, 0, -1.97f, 0.82f, 0.12f, 0.64f, 0.65f, 0.72f, 0.04f, 0.19f, -0.03f);
            Add(stones, ref r, RockStoneRole.Shoulder, 1, 2.02f, 0.86f, -0.02f, 0.63f, 0.67f, 0.68f, -0.05f, -0.12f, 0.04f);
            Add(stones, ref r, RockStoneRole.Capstone, 0, -1.00f, 2.78f, 0.06f, 0.80f, 0.40f, 0.72f, 0.04f, -0.11f, 0.02f);
            Add(stones, ref r, RockStoneRole.Capstone, 1, 1.06f, 2.81f, -0.02f, 0.83f, 0.42f, 0.75f, -0.03f, 0.16f, -0.02f);
            Add(stones, ref r, RockStoneRole.Filler, 2, 0f, 0.53f, -0.92f, 0.62f, 0.50f, 0.54f, 0.02f, 0.07f, -0.03f);
        }

        private static void Add(List<RockStoneRecipe> stones, ref RecipeRandom r, RockStoneRole role,
            int group, float x, float y, float z, float hx, float hy, float hz, float pitch, float yaw, float roll)
        {
            float jitter = role == RockStoneRole.Foundation ? 0.08f : role == RockStoneRole.Accent ? 0.10f : 0.20f;
            var extents = new MatterFloat3(hx * r.Range(0.93f, 1.07f), hy * r.Range(0.92f, 1.08f), hz * r.Range(0.93f, 1.07f));
            var center = new MatterFloat3(x + r.Range(-jitter, jitter), y + r.Range(-jitter * 0.45f, jitter * 0.45f), z + r.Range(-jitter, jitter));
            var rotation = new MatterFloat3(pitch + r.Range(-0.065f, 0.065f), yaw + r.Range(-0.18f, 0.18f), roll + r.Range(-0.065f, 0.065f));
            float bevel = r.Range(0.055f, 0.13f);
            var clips = new RockStoneClipPlane[2 + (r.Next() % 2u == 0u ? 0 : 1)];
            for (int index = 0; index < clips.Length; index++)
            {
                float signX = (r.Next() & 1u) == 0u ? -1f : 1f;
                float signZ = (r.Next() & 1u) == 0u ? -1f : 1f;
                if (index == 1) signX = -signX;
                float nx = signX * r.Range(0.54f, 0.72f);
                float ny = (r.Next() & 1u) == 0u ? -r.Range(0.12f, 0.33f) : r.Range(0.12f, 0.33f);
                float nz = signZ * r.Range(0.56f, 0.77f);
                float length = (float)Math.Sqrt(nx * nx + ny * ny + nz * nz);
                var normal = new MatterFloat3(nx / length, ny / length, nz / length);
                float support = Math.Abs(normal.X) * extents.X + Math.Abs(normal.Y) * extents.Y + Math.Abs(normal.Z) * extents.Z;
                float largestCut = Math.Min(0.40f, Math.Min(extents.X, Math.Min(extents.Y, extents.Z)) * 0.50f);
                float cut = r.Range(0.18f, Math.Max(0.19f, largestCut));
                clips[index] = new RockStoneClipPlane(normal, support - cut);
            }
            stones.Add(new RockStoneRecipe(stones.Count, role, group, center, extents, rotation, bevel, clips));
        }

        private struct RecipeRandom
        {
            private uint _state;
            public RecipeRandom(uint seed) => _state = seed == 0u ? 0x6D2B79F5u : seed;
            public uint Next()
            {
                uint value = _state;
                value ^= value << 13; value ^= value >> 17; value ^= value << 5;
                _state = value;
                return value;
            }
            public float Next01() => (Next() >> 8) * (1f / 16777216f);
            public float Range(float min, float max) => min + (max - min) * Next01();
        }
    }

    public readonly struct RockComponentBounds
    {
        public readonly MatterInt3 MinInclusive;
        public readonly MatterInt3 MaxInclusive;
        public RockComponentBounds(MatterInt3 minInclusive, MatterInt3 maxInclusive)
        { MinInclusive = minInclusive; MaxInclusive = maxInclusive; }
    }

    public sealed class RockFormationGenerationResult
    {
        public RockFormationStamp Stamp { get; }
        public RockStampResolution Resolution { get; }
        public int GenerationAttempts { get; }
        public int RejectedAttempts { get; }
        public double GenerationMilliseconds { get; }
        public double ResolutionMilliseconds { get; }
        public string ValidationIssue { get; }

        internal RockFormationGenerationResult(RockFormationStamp stamp, RockStampResolution resolution,
            int attempts, int rejectedAttempts, double generationMilliseconds, double resolutionMilliseconds,
            string validationIssue)
        {
            Stamp = stamp;
            Resolution = resolution;
            GenerationAttempts = attempts;
            RejectedAttempts = rejectedAttempts;
            GenerationMilliseconds = generationMilliseconds;
            ResolutionMilliseconds = resolutionMilliseconds;
            ValidationIssue = validationIssue;
        }
    }

    public static class RockFormationNames
    {
        public static RockConstructionMode ParseMode(string value)
        {
            if (string.Equals(value, "U4Control", StringComparison.OrdinalIgnoreCase) || string.Equals(value, "control", StringComparison.OrdinalIgnoreCase)) return RockConstructionMode.U4Control;
            if (string.Equals(value, "DistinctCluster", StringComparison.OrdinalIgnoreCase) || string.Equals(value, "distinct", StringComparison.OrdinalIgnoreCase)) return RockConstructionMode.DistinctCluster;
            if (string.Equals(value, "SelectiveFormation", StringComparison.OrdinalIgnoreCase) || string.Equals(value, "selective", StringComparison.OrdinalIgnoreCase)) return RockConstructionMode.SelectiveFormation;
            throw new ArgumentException("Construction mode must be U4Control, DistinctCluster, or SelectiveFormation.", nameof(value));
        }

        public static RockFormationArchetype ParseArchetype(string value)
        {
            string normalized = (value ?? "Auto").Replace(" ", "").Replace("-", "").Replace("_", "");
            if (string.Equals(normalized, "Auto", StringComparison.OrdinalIgnoreCase)) return RockFormationArchetype.Auto;
            if (string.Equals(normalized, "StackedLedge", StringComparison.OrdinalIgnoreCase)) return RockFormationArchetype.StackedLedge;
            if (string.Equals(normalized, "Buttress", StringComparison.OrdinalIgnoreCase)) return RockFormationArchetype.Buttress;
            if (string.Equals(normalized, "BrokenRidge", StringComparison.OrdinalIgnoreCase)) return RockFormationArchetype.BrokenRidge;
            if (string.Equals(normalized, "SplitCluster", StringComparison.OrdinalIgnoreCase)) return RockFormationArchetype.SplitCluster;
            throw new ArgumentException("Archetype must be Auto, Stacked Ledge, Buttress, Broken Ridge, or Split Cluster.", nameof(value));
        }

        public static string Display(RockFormationArchetype archetype)
        {
            switch (archetype)
            {
                case RockFormationArchetype.StackedLedge: return "Stacked Ledge";
                case RockFormationArchetype.Buttress: return "Buttress";
                case RockFormationArchetype.BrokenRidge: return "Broken Ridge";
                case RockFormationArchetype.SplitCluster: return "Split Cluster";
                default: return "Auto";
            }
        }
    }
}
