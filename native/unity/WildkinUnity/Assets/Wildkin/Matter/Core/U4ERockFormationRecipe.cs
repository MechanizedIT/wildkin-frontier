using System;
using System.Collections.Generic;
using System.Globalization;

namespace Wildkin.Matter
{
    public enum U4EFormationArchetype : byte
    {
        LowStackedShelf,
        LeaningCluster,
        ButtressedOutcrop,
        BrokenSteppedRidge
    }

    public static class U4EFormationConfiguration
    {
        public const string RecipeVersion = "U4E-MultiDomainFormation-v1";
        public const string IdentitySchemaVersion = "U4E-SlotIdentity-v1";
        public const float OrdinarySpacingMeters = .25f;
        public const float HeroSpacingMeters = .125f;
        public const float TargetContactGapMeters = .025f;
        public const float MaximumContactGapMeters = .06f;
        public const float MaximumContactPenetrationMeters = .0125f;
        public const float ContactPositionQuantumMeters = .001f;
        public const float MaximumFitAdjustmentMeters = 3.25f;
        public const int MaximumFitIterations = 8;
        public const int MaximumCandidateAttempts = 5;
        public const int MinimumContactWitnesses = 2;
        public const int MinimumChildren = 4;
        public const int MaximumChildren = 8;
        public const int GallerySeedStart = 7000;
        public const int GallerySeedCount = 20;
        public const string TerrainNodeId = "terrain";
    }

    [Serializable]
    public sealed class U4ERockFormationChildRecipe
    {
        public string slotId;
        public string parentSlotId;
        public string stableDomainId;
        public string relation;
        public SourceRockArchetype sourceArchetype;
        public int sourceSeed;
        public float sampleSpacingMeters;
        public float physicalScale;
        public float yawDegrees;
        public MatterFloat3 proposedLocalPosition;
        public MatterFloat3 fitDirectionLocal;
        public SculptedStoneRecipe sourceRecipe;
        public ulong sourceRecipeHash;

        public U4ERockFormationChildRecipe Clone()
        {
            return new U4ERockFormationChildRecipe
            {
                slotId = slotId,
                parentSlotId = parentSlotId,
                stableDomainId = stableDomainId,
                relation = relation,
                sourceArchetype = sourceArchetype,
                sourceSeed = sourceSeed,
                sampleSpacingMeters = sampleSpacingMeters,
                physicalScale = physicalScale,
                yawDegrees = yawDegrees,
                proposedLocalPosition = proposedLocalPosition,
                fitDirectionLocal = fitDirectionLocal,
                sourceRecipe = CloneSourceRecipe(sourceRecipe),
                sourceRecipeHash = sourceRecipeHash
            };
        }

        private static SculptedStoneRecipe CloneSourceRecipe(SculptedStoneRecipe value)
        {
            if (value == null) return null;
            return new SculptedStoneRecipe
            {
                archetype = value.archetype,
                seed = value.seed,
                radiusX = value.radiusX,
                radiusY = value.radiusY,
                radiusZ = value.radiusZ,
                exponent = value.exponent,
                sideFullness = value.sideFullness,
                frontFullness = value.frontFullness,
                taper = value.taper,
                lean = value.lean,
                skew = value.skew,
                twist = value.twist,
                topTilt = value.topTilt,
                quadrantCompression = value.quadrantCompression,
                baseFraction = value.baseFraction,
                subdivisions = value.subdivisions
            };
        }
    }

    [Serializable]
    public sealed class U4ERockFormationRecipe
    {
        public string version = U4EFormationConfiguration.RecipeVersion;
        public string identitySchemaVersion = U4EFormationConfiguration.IdentitySchemaVersion;
        public int seed;
        public int attemptIndex;
        public U4EFormationArchetype archetype;
        public U4ERockFormationChildRecipe[] children = Array.Empty<U4ERockFormationChildRecipe>();

        public string FormationId => "u4e-v1-" + seed.ToString("D8", CultureInfo.InvariantCulture);
    }

    /// <summary>Compact pristine identity. Matter arrays, source vertices and meshes are deliberately absent.</summary>
    [Serializable]
    public sealed class U4EPristineFormationDescriptor
    {
        public string schemaVersion = "U4E-PristineDescriptor-v1";
        public string recipeVersion = U4EFormationConfiguration.RecipeVersion;
        public int formationSeed;
        public int acceptedAttemptIndex;
        public U4EFormationArchetype archetype;
        public float rootPositionX;
        public float rootPositionY;
        public float rootPositionZ;
        public float rootRotationX;
        public float rootRotationY;
        public float rootRotationZ;
        public float rootRotationW = 1f;
    }

    /// <summary>Deterministic semantic-slot recipe and generation-time source deformation for U4E.</summary>
    public static class U4ERockFormationGenerator
    {
        private readonly struct SlotDefinition
        {
            public readonly string Slot;
            public readonly string Parent;
            public readonly string Relation;
            public readonly SourceRockArchetype Archetype;
            public readonly float Scale;
            public readonly float Spacing;
            public readonly MatterFloat3 Position;
            public readonly MatterFloat3 FitDirection;
            public readonly float Yaw;

            public SlotDefinition(string slot, string parent, string relation,
                SourceRockArchetype archetype, float scale, float spacing,
                MatterFloat3 position, MatterFloat3 fitDirection, float yaw)
            {
                Slot = slot; Parent = parent; Relation = relation; Archetype = archetype;
                Scale = scale; Spacing = spacing; Position = position; FitDirection = fitDirection; Yaw = yaw;
            }
        }

        public static U4ERockFormationRecipe CreateRecipe(int formationSeed, int attemptIndex = 0)
        {
            if (attemptIndex < 0 || attemptIndex >= U4EFormationConfiguration.MaximumCandidateAttempts)
                throw new ArgumentOutOfRangeException(nameof(attemptIndex));

            U4EFormationArchetype archetype = (U4EFormationArchetype)PositiveModulo(formationSeed, 4);
            var slots = BuildLayout(archetype, formationSeed, attemptIndex);
            if (slots.Count < U4EFormationConfiguration.MinimumChildren ||
                slots.Count > U4EFormationConfiguration.MaximumChildren)
                throw new InvalidOperationException("U4E layouts must contain between four and eight semantic children.");

            var result = new U4ERockFormationRecipe
            {
                seed = formationSeed,
                attemptIndex = attemptIndex,
                archetype = archetype,
                children = new U4ERockFormationChildRecipe[slots.Count]
            };
            var seen = new HashSet<string>(StringComparer.Ordinal);
            for (int index = 0; index < slots.Count; index++)
            {
                SlotDefinition definition = slots[index];
                if (!seen.Add(definition.Slot)) throw new InvalidOperationException("Duplicate U4E semantic slot: " + definition.Slot);
                int sourceSeed = DeriveSeed(formationSeed, attemptIndex, definition.Slot, 11);
                SculptedStoneRecipe source = CreateVariant(definition, formationSeed, attemptIndex, sourceSeed);
                result.children[index] = new U4ERockFormationChildRecipe
                {
                    slotId = definition.Slot,
                    parentSlotId = definition.Parent,
                    stableDomainId = CreateStableDomainId(formationSeed, definition.Slot),
                    relation = definition.Relation,
                    sourceArchetype = definition.Archetype,
                    sourceSeed = sourceSeed,
                    sampleSpacingMeters = definition.Spacing,
                    physicalScale = definition.Scale,
                    yawDegrees = definition.Yaw + Jitter(formationSeed, attemptIndex, definition.Slot, 23) * 17f,
                    proposedLocalPosition = JitterPosition(definition.Position, formationSeed, attemptIndex, definition.Slot),
                    fitDirectionLocal = definition.FitDirection,
                    sourceRecipe = source,
                    sourceRecipeHash = ComputeSourceRecipeHash(source)
                };
            }

            // Keep the gallery's resolution policy legible: one deterministic silhouette-critical
            // child gets the selected 0.125 m tier, while all siblings stay at the ordinary 0.25 m tier.
            var heroCandidates = new List<int>();
            for (int index = 0; index < result.children.Length; index++)
                if (result.children[index].physicalScale >= .4f) heroCandidates.Add(index);
            int selectedHero = (int)(Mix(formationSeed, attemptIndex, "hero-tier", 91) % (uint)heroCandidates.Count);
            for (int index = 0; index < result.children.Length; index++)
                result.children[index].sampleSpacingMeters = index == heroCandidates[selectedHero]
                    ? U4EFormationConfiguration.HeroSpacingMeters
                    : U4EFormationConfiguration.OrdinarySpacingMeters;
            return result;
        }

        public static string CreateStableDomainId(int formationSeed, string semanticSlot)
        {
            if (string.IsNullOrWhiteSpace(semanticSlot)) throw new ArgumentException("A semantic slot is required.", nameof(semanticSlot));
            return "u4e-v1-" + formationSeed.ToString("D8", CultureInfo.InvariantCulture) + "-" + semanticSlot;
        }

        public static ulong ComputeSourceRecipeHash(SculptedStoneRecipe recipe)
        {
            if (recipe == null) throw new ArgumentNullException(nameof(recipe));
            ulong hash = OffsetBasis;
            HashText(ref hash, SculptedStoneRecipe.Version);
            HashInt(ref hash, (int)recipe.archetype);
            HashInt(ref hash, recipe.seed);
            HashFloat(ref hash, recipe.radiusX); HashFloat(ref hash, recipe.radiusY); HashFloat(ref hash, recipe.radiusZ);
            HashFloat(ref hash, recipe.exponent); HashFloat(ref hash, recipe.sideFullness); HashFloat(ref hash, recipe.frontFullness);
            HashFloat(ref hash, recipe.taper); HashFloat(ref hash, recipe.lean); HashFloat(ref hash, recipe.skew);
            HashFloat(ref hash, recipe.twist); HashFloat(ref hash, recipe.topTilt);
            HashFloat(ref hash, recipe.quadrantCompression); HashFloat(ref hash, recipe.baseFraction);
            HashInt(ref hash, recipe.subdivisions);
            return hash;
        }

        public static string DisplayName(U4EFormationArchetype archetype)
        {
            switch (archetype)
            {
                case U4EFormationArchetype.LowStackedShelf: return "LOW SHELF";
                case U4EFormationArchetype.LeaningCluster: return "LEANING CLUSTER";
                case U4EFormationArchetype.ButtressedOutcrop: return "BUTTRESSED OUTCROP";
                case U4EFormationArchetype.BrokenSteppedRidge: return "STEPPED RIDGE";
                default: throw new ArgumentOutOfRangeException(nameof(archetype));
            }
        }

        private static List<SlotDefinition> BuildLayout(U4EFormationArchetype archetype, int seed, int attempt)
        {
            bool addAccent = (Mix(seed, attempt, "layout", 71) & 1u) != 0;
            bool addSecondary = (Mix(seed, attempt, "layout", 72) & 2u) != 0;
            var slots = new List<SlotDefinition>(6);
            switch (archetype)
            {
                case U4EFormationArchetype.LowStackedShelf:
                    slots.Add(Slot("foundation", null, "terrain anchor", SourceRockArchetype.CapstoneSlab, .94f, .25f, 0, 0, 0, 0, -1, 0, 0));
                    slots.Add(Slot("shoulder-left", "foundation", "left shoulder braces foundation", SourceRockArchetype.ButtressWedge, .55f, .25f, -1.35f, .18f, .03f, 1, -.25f, 0, 27));
                    slots.Add(Slot("shoulder-right", "foundation", "right shoulder braces foundation", SourceRockArchetype.ChunkyBoulder, .51f, .25f, 1.32f, .18f, -.08f, -1, -.25f, 0, -31));
                    slots.Add(Slot("cap", "foundation", "cap rests on foundation", SourceRockArchetype.ChunkyBoulder, .53f, .125f, .05f, 1.35f, .03f, 0, -1, 0, 8));
                    if (addSecondary) slots.Add(Slot("rear-support", "foundation", "rear support meets foundation", SourceRockArchetype.ButtressWedge, .42f, .25f, .08f, .12f, 1.25f, 0, -.1f, -1, 11));
                    if (addAccent) slots.Add(Slot("accent", addSecondary ? "rear-support" : "shoulder-left", "small accent braces outer shoulder", SourceRockArchetype.CapstoneSlab, .31f, .125f, -1.9f, .2f, .55f, .7f, -.35f, -.35f, -19));
                    break;
                case U4EFormationArchetype.LeaningCluster:
                    slots.Add(Slot("foundation", null, "terrain anchor", SourceRockArchetype.ChunkyBoulder, .90f, .25f, 0, 0, 0, 0, -1, 0, 0));
                    slots.Add(Slot("leaning-mass", "foundation", "leaning mass braces foundation", SourceRockArchetype.ButtressWedge, .75f, .125f, 1.02f, .42f, .08f, -.8f, -.6f, -.1f, 24));
                    slots.Add(Slot("low-shoulder", "foundation", "low shoulder closes left flank", SourceRockArchetype.CapstoneSlab, .46f, .25f, -1.08f, .12f, .18f, 1, -.2f, -.1f, -24));
                    slots.Add(Slot("high-cap", "leaning-mass", "high cap rests on leaning mass", SourceRockArchetype.ChunkyBoulder, .40f, .125f, 1.12f, 1.72f, .12f, -.28f, -1, 0, -14));
                    if (addSecondary) slots.Add(Slot("shelf", "leaning-mass", "shelf locks the upper shoulder", SourceRockArchetype.CapstoneSlab, .47f, .25f, .08f, 1.48f, -.7f, 0, -1, .2f, 17));
                    if (addAccent) slots.Add(Slot("toe-accent", "low-shoulder", "toe accent joins low shoulder", SourceRockArchetype.ChunkyBoulder, .29f, .125f, -1.95f, .12f, .26f, 1, -.2f, 0, 16));
                    break;
                case U4EFormationArchetype.ButtressedOutcrop:
                    slots.Add(Slot("foundation", null, "terrain anchor", SourceRockArchetype.CapstoneSlab, .92f, .25f, 0, 0, 0, 0, -1, 0, 0));
                    slots.Add(Slot("core", "foundation", "core stacks on foundation", SourceRockArchetype.ChunkyBoulder, .78f, .125f, .12f, .56f, .04f, 0, -1, 0, 6));
                    slots.Add(Slot("buttress-left", "foundation", "left buttress locks the outer foot", SourceRockArchetype.ButtressWedge, .61f, .25f, -1.55f, .12f, .05f, 1, -.15f, 0, 34));
                    slots.Add(Slot("buttress-right", "foundation", "right buttress locks the outer foot", SourceRockArchetype.ButtressWedge, .55f, .25f, 1.58f, .12f, -.05f, -1, -.15f, 0, -29));
                    slots.Add(Slot("broken-cap", "core", "broken cap rests on core", SourceRockArchetype.CapstoneSlab, .45f, .125f, .18f, 1.85f, .02f, 0, -1, 0, -9));
                    if (addAccent) slots.Add(Slot("outer-accent", "buttress-left", "small outer accent joins left buttress", SourceRockArchetype.ChunkyBoulder, .30f, .125f, -2.15f, .16f, .48f, 1, -.15f, -.2f, 22));
                    break;
                case U4EFormationArchetype.BrokenSteppedRidge:
                    slots.Add(Slot("foundation", null, "terrain anchor", SourceRockArchetype.CapstoneSlab, .94f, .25f, 0, 0, 0, 0, -1, 0, 0));
                    slots.Add(Slot("ridge-left", "foundation", "left ridge mass stacks on the foundation", SourceRockArchetype.ButtressWedge, .54f, .25f, -1.08f, .58f, .04f, 0, -1, 0, -20));
                    slots.Add(Slot("ridge-right", "foundation", "right ridge mass stacks on the foundation", SourceRockArchetype.ChunkyBoulder, .48f, .25f, 1.08f, .58f, -.06f, 0, -1, 0, 18));
                    slots.Add(Slot("step-left", "ridge-left", "upper left step stacks above the left ridge", SourceRockArchetype.ButtressWedge, .42f, .25f, -.55f, 1.55f, .12f, 0, -1, 0, 31));
                    slots.Add(Slot("step-right", "ridge-right", "upper right step stacks above the right ridge", SourceRockArchetype.CapstoneSlab, .40f, .25f, .55f, 1.45f, -.16f, 0, -1, 0, -28));
                    break;
                default: throw new ArgumentOutOfRangeException(nameof(archetype));
            }
            return slots;
        }

        private static SlotDefinition Slot(string slot, string parent, string relation,
            SourceRockArchetype archetype, float scale, float spacing,
            float x, float y, float z, float fitX, float fitY, float fitZ, float yaw)
            => new SlotDefinition(slot, parent, relation, archetype, scale, spacing,
                new MatterFloat3(x, y, z), Normalize(new MatterFloat3(fitX, fitY, fitZ)), yaw);

        private static SculptedStoneRecipe CreateVariant(SlotDefinition slot, int formationSeed, int attempt, int sourceSeed)
        {
            SculptedStoneRecipe recipe = SculptedStoneGenerator.CreateRecipe(slot.Archetype, sourceSeed);
            float rx = Unit(formationSeed, attempt, slot.Slot, 31);
            float ry = Unit(formationSeed, attempt, slot.Slot, 32);
            float rz = Unit(formationSeed, attempt, slot.Slot, 33);
            recipe.radiusX *= slot.Scale * (.91f + rx * .16f);
            recipe.radiusY *= slot.Scale * (.92f + ry * .14f);
            recipe.radiusZ *= slot.Scale * (.91f + rz * .16f);
            recipe.exponent = Clamp(recipe.exponent + Jitter(formationSeed, attempt, slot.Slot, 34) * .22f, 2.35f, 4.55f);
            recipe.lean = Clamp(recipe.lean + Jitter(formationSeed, attempt, slot.Slot, 35) * .05f, -.46f, .46f);
            recipe.skew = Clamp(recipe.skew + Jitter(formationSeed, attempt, slot.Slot, 36) * .03f, -.17f, .17f);
            recipe.twist = Clamp(recipe.twist + Jitter(formationSeed, attempt, slot.Slot, 37) * .024f, -.17f, .17f);
            recipe.topTilt = Clamp(recipe.topTilt + Jitter(formationSeed, attempt, slot.Slot, 38) * .05f, -.26f, .26f);
            recipe.taper = Clamp(recipe.taper + Jitter(formationSeed, attempt, slot.Slot, 39) * .05f, -.25f, .42f);
            recipe.sideFullness = Clamp(recipe.sideFullness + Jitter(formationSeed, attempt, slot.Slot, 40) * .04f, -.26f, .26f);
            recipe.frontFullness = Clamp(recipe.frontFullness + Jitter(formationSeed, attempt, slot.Slot, 41) * .04f, -.26f, .26f);
            recipe.quadrantCompression = Clamp(recipe.quadrantCompression + Jitter(formationSeed, attempt, slot.Slot, 42) * .035f, .015f, .28f);
            return recipe;
        }

        private static MatterFloat3 JitterPosition(MatterFloat3 position, int seed, int attempt, string slot)
        {
            if (string.Equals(slot, "foundation", StringComparison.Ordinal)) return position;
            return new MatterFloat3(
                Quantize(position.X + Jitter(seed, attempt, slot, 51) * .16f, .01f),
                Quantize(position.Y + Jitter(seed, attempt, slot, 52) * .11f, .01f),
                Quantize(position.Z + Jitter(seed, attempt, slot, 53) * .16f, .01f));
        }

        private static int DeriveSeed(int seed, int attempt, string slot, uint channel)
            => (int)(Mix(seed, attempt, slot, channel) & 0x7FFFFFFFu);

        private static uint Mix(int seed, int attempt, string slot, uint channel)
        {
            unchecked
            {
                uint hash = 2166136261u;
                hash = (hash ^ (uint)seed) * 16777619u;
                hash = (hash ^ (uint)attempt) * 16777619u;
                for (int i = 0; i < slot.Length; i++) hash = (hash ^ slot[i]) * 16777619u;
                hash = (hash ^ channel) * 16777619u;
                hash ^= hash >> 16; hash *= 0x7FEB352Du;
                hash ^= hash >> 15; hash *= 0x846CA68Bu;
                return hash ^ (hash >> 16);
            }
        }

        private static float Unit(int seed, int attempt, string slot, uint channel)
            => (Mix(seed, attempt, slot, channel) & 0xFFFFFFu) / 16777215f;

        private static float Jitter(int seed, int attempt, string slot, uint channel)
            => Unit(seed, attempt, slot, channel) * 2f - 1f;

        private static float Clamp(float value, float minimum, float maximum)
            => Math.Max(minimum, Math.Min(maximum, value));

        private static MatterFloat3 Normalize(MatterFloat3 value)
        {
            double length = Math.Sqrt((double)value.X * value.X + (double)value.Y * value.Y + (double)value.Z * value.Z);
            if (length < 1e-9) throw new ArgumentException("U4E fit directions must be nonzero.");
            return new MatterFloat3((float)(value.X / length), (float)(value.Y / length), (float)(value.Z / length));
        }

        private static float Quantize(float value, float step)
            => (float)(Math.Round(value / step, MidpointRounding.AwayFromZero) * step);

        private static int PositiveModulo(int value, int divisor)
        {
            int remainder = value % divisor;
            return remainder < 0 ? remainder + divisor : remainder;
        }

        private const ulong OffsetBasis = 14695981039346656037UL;
        private static void HashText(ref ulong hash, string value)
        {
            foreach (char c in value) HashInt(ref hash, c);
        }
        private static void HashFloat(ref ulong hash, float value)
            => HashInt(ref hash, (int)Math.Round(value * 1000000d, MidpointRounding.AwayFromZero));
        private static void HashInt(ref ulong hash, int value)
        {
            unchecked { uint bits = (uint)value; for (int shift = 0; shift < 32; shift += 8) hash = (hash ^ (byte)(bits >> shift)) * 1099511628211UL; }
        }
    }
}
