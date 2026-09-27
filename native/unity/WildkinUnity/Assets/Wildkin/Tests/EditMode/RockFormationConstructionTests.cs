using System;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using Wildkin.Matter;
using Wildkin.Matter.Unity;

namespace Wildkin.Tests.EditMode
{
    public sealed class RockFormationConstructionTests
    {
        [Test]
        public void ProceduralStoneRecipes_AreBoundedFacetedAndFinite()
        {
            for (int archetypeIndex = 1; archetypeIndex <= 4; archetypeIndex++)
            {
                RockFormationArchetype archetype = (RockFormationArchetype)archetypeIndex;
                RockFormationRecipe recipe = RockFormationRecipeGenerator.Generate(1200 + archetypeIndex, archetype);
                Assert.That(recipe.StoneCount, Is.InRange(4, 9));
                Assert.That(recipe.HasValidStructure(), Is.True, archetype.ToString());
                Assert.That(HasRole(recipe, RockStoneRole.Foundation), Is.True);
                Assert.That(HasRole(recipe, RockStoneRole.MainBody), Is.True);

                foreach (RockStoneRecipe stone in recipe.Stones)
                {
                    Assert.That(stone.ClipPlanes.Count, Is.InRange(2, 6));
                    Assert.That(stone.HasFiniteBoundedParameters(), Is.True, "stone " + stone.Id);
                    for (int sample = 0; sample < 20; sample++)
                    {
                        float x = stone.Center.X + ((sample % 5) - 2) * 0.43f;
                        float y = stone.Center.Y + ((sample / 5) - 2) * 0.37f;
                        float z = stone.Center.Z + (((sample * 3) % 5) - 2) * 0.41f;
                        AssertFinite(stone.Evaluate(x, y, z));
                    }
                }
            }
        }

        [Test]
        public void FormationModes_AreDeterministicAcrossRecipeRetryResolutionAndMesh()
        {
            for (int seed = 1; seed <= 20; seed++)
            foreach (RockConstructionMode mode in new[] { RockConstructionMode.DistinctCluster, RockConstructionMode.SelectiveFormation })
            {
                RockFormationGenerationResult first = RockFormationStampGenerator.GenerateForMode(seed,
                    RockFormationArchetype.Auto, mode);
                RockFormationGenerationResult repeated = RockFormationStampGenerator.GenerateForMode(seed,
                    RockFormationArchetype.Auto, mode);
                Assert.That(first.ValidationIssue, Is.Null, $"seed {seed} / {mode} must resolve within the bounded target");
                Assert.That(repeated.ValidationIssue, Is.Null, $"repeated seed {seed} / {mode} must resolve within the bounded target");
                Assert.That(first.Stamp.ConstructionMode, Is.EqualTo(mode), $"seed {seed} / {mode}");
                Assert.That(first.Stamp.ArchetypeName, Is.EqualTo(repeated.Stamp.ArchetypeName));
                Assert.That(first.Stamp.RecipeElementCount, Is.InRange(4, 9));
                Assert.That(first.Resolution.FieldHash, Is.EqualTo(repeated.Resolution.FieldHash), $"seed {seed} / {mode}");
                Assert.That(first.Resolution.ConnectedComponents, Is.InRange(1, first.Stamp.RecipeElementCount));
                Assert.That(first.Resolution.ComponentSampleCounts, Is.EqualTo(repeated.Resolution.ComponentSampleCounts));
                Assert.That(first.GenerationAttempts, Is.EqualTo(repeated.GenerationAttempts));
                Assert.That(first.RejectedAttempts, Is.EqualTo(first.GenerationAttempts - (first.ValidationIssue == null ? 1 : 0)));
                Assert.That(first.Resolution.OccupiedSamples, Is.GreaterThan(100));
                Assert.That(first.Resolution.ComponentBounds.Length, Is.EqualTo(first.Resolution.ConnectedComponents));
            }
        }

        [Test]
        public void QuarterMeterResolution_UsesTheSamePhysicalBoundsAsHalfMeterResolution()
        {
            RockFormationGenerationResult halfMeter = RockFormationStampGenerator.GenerateForMode(6,
                RockFormationArchetype.BrokenRidge, RockConstructionMode.SelectiveFormation,
                null, 0.5f);
            RockFormationGenerationResult quarterMeter = RockFormationStampGenerator.GenerateForMode(6,
                RockFormationArchetype.BrokenRidge, RockConstructionMode.SelectiveFormation,
                null, 0.25f);

            Assert.That(halfMeter.ValidationIssue, Is.Null);
            Assert.That(quarterMeter.ValidationIssue, Is.Null);
            Assert.That(quarterMeter.GenerationAttempts, Is.EqualTo(1), "The same seed should retain its first valid recipe at both resolutions.");
            Assert.That(quarterMeter.Resolution.SampleSpacingMeters, Is.EqualTo(0.25f));
            MatterInt3 min = quarterMeter.Resolution.Bounds.MinInclusive;
            MatterInt3 max = quarterMeter.Resolution.Bounds.MaxExclusive;
            Assert.That((max.X - min.X) * quarterMeter.Resolution.SampleSpacingMeters, Is.LessThanOrEqualTo(9.5f));
            Assert.That((max.Y - min.Y) * quarterMeter.Resolution.SampleSpacingMeters, Is.LessThanOrEqualTo(5.5f));
            Assert.That((max.Z - min.Z) * quarterMeter.Resolution.SampleSpacingMeters, Is.LessThanOrEqualTo(9.5f));
        }

        [Test]
        public void SelectiveUnion_ChangesOnlyTheCoreBlendAndLeavesAccentGroupsHard()
        {
            RockFormationRecipe recipe = RockFormationRecipeGenerator.Generate(812, RockFormationArchetype.StackedLedge);
            bool coreChanged = false;
            for (float y = 0.4f; y <= 3.5f && !coreChanged; y += 0.1f)
            for (float z = -1.8f; z <= 1.8f && !coreChanged; z += 0.1f)
            for (float x = -2.8f; x <= 2.8f; x += 0.1f)
            {
                float distinct = recipe.Evaluate(x, y, z, RockConstructionMode.DistinctCluster);
                float selective = recipe.Evaluate(x, y, z, RockConstructionMode.SelectiveFormation);
                if (Math.Abs(distinct - selective) > 0.0001f) { coreChanged = true; break; }
            }
            Assert.That(coreChanged, Is.True, "The selective mode must demonstrate a bounded core-only union difference.");

            foreach (RockStoneRecipe stone in recipe.Stones)
            {
                if (stone.ConnectionGroup == 0) continue;
                float distinct = recipe.Evaluate(stone.Center.X, stone.Center.Y, stone.Center.Z, RockConstructionMode.DistinctCluster);
                float selective = recipe.Evaluate(stone.Center.X, stone.Center.Y, stone.Center.Z, RockConstructionMode.SelectiveFormation);
                Assert.That(selective, Is.EqualTo(distinct).Within(0.00001f), "Capstones and accents stay hard-unioned.");
            }
        }

        [Test]
        public void AtLeastOneSeedResolvesAsMultipleSubstantialOrdinaryMatterComponents()
        {
            bool foundMultiple = false;
            foreach (RockConstructionMode mode in new[] { RockConstructionMode.DistinctCluster, RockConstructionMode.SelectiveFormation })
            for (int seed = 1; seed <= 20; seed++)
            {
                RockFormationGenerationResult result = RockFormationStampGenerator.GenerateForMode(seed,
                    RockFormationArchetype.Auto, mode);
                if (result.Resolution.ConnectedComponents <= 1) continue;
                foundMultiple = true;
                Assert.That(result.ValidationIssue, Is.Null, $"seed {seed} / {mode}");
                Assert.That(result.Resolution.ComponentSampleCounts.Length, Is.EqualTo(result.Resolution.ConnectedComponents));
                foreach (int count in result.Resolution.ComponentSampleCounts) Assert.That(count, Is.GreaterThanOrEqualTo(8));
            }
            Assert.That(foundMultiple, Is.True, "The formation policy allows and demonstrates substantial disconnected stones.");
        }

        [Test]
        public void ResolvedFormation_DoesNotRetainStoneRecipeAsMatterAuthority()
        {
            RockFormationGenerationResult result = RockFormationStampGenerator.GenerateForMode(46,
                RockFormationArchetype.SplitCluster, RockConstructionMode.DistinctCluster);
            MatterWorld world = result.Resolution.World;
            Assert.That(world.SourceVersion, Is.EqualTo(MatterWorldFactory.ResolvedMatterSourceVersion));
            Assert.That(world.EditCount, Is.EqualTo(result.Resolution.OccupiedSamples));
            Assert.That(world.EvaluateSourceDirect(new MatterSampleAddress(16, 2, 16)).IsSolid, Is.False);
            foreach (MatterSparseEdit edit in world.GetSparseEditsSorted())
            {
                Assert.That(edit.Sample.IsSolid, Is.True);
                Assert.That(world.EvaluateSourceDirect(edit.Address).IsSolid, Is.False);
            }

            MatterWorld restored = MatterWorldSaveCodec.Read(MatterWorldSaveCodec.Write(world));
            Assert.That(restored.EditCount, Is.EqualTo(world.EditCount));
            Assert.That(restored.Revision, Is.EqualTo(world.Revision));
            Assert.That(restored.GetSparseEditsSorted().Length, Is.EqualTo(world.GetSparseEditsSorted().Length));
        }

        [Test]
        public void U4BMaterialTextures_AreDeterministicWithCoolerRockAndWarmDirt()
        {
            MatterRockTextureSet first = MatterRockMaterialFactory.GenerateU4BTextures();
            MatterRockTextureSet repeated = MatterRockMaterialFactory.GenerateU4BTextures();
            try
            {
                Assert.That(MatterRockMaterialFactory.U4BTextureGeneratorVersion, Is.EqualTo(1));
                Assert.That(TextureHash(first.RockAlbedo), Is.EqualTo(TextureHash(repeated.RockAlbedo)));
                Assert.That(TextureHash(first.DirtAlbedo), Is.EqualTo(TextureHash(repeated.DirtAlbedo)));
                Color rock = Mean(first.RockAlbedo.GetPixels());
                Color dirt = Mean(first.DirtAlbedo.GetPixels());
                Assert.That(rock.b, Is.GreaterThan(rock.r + 0.08f));
                Assert.That(dirt.r, Is.GreaterThan(dirt.b + 0.12f));
            }
            finally
            {
                foreach (Texture2D texture in first.All) UnityEngine.Object.DestroyImmediate(texture);
                foreach (Texture2D texture in repeated.All) UnityEngine.Object.DestroyImmediate(texture);
            }
        }

        private static bool HasRole(RockFormationRecipe recipe, RockStoneRole role)
        {
            foreach (RockStoneRecipe stone in recipe.Stones) if (stone.Role == role) return true;
            return false;
        }

        private static ulong TextureHash(Texture2D texture)
        {
            ulong hash = 14695981039346656037UL;
            const ulong prime = 1099511628211UL;
            foreach (Color32 pixel in texture.GetPixels32())
            {
                unchecked { hash ^= pixel.r; hash *= prime; hash ^= pixel.g; hash *= prime; hash ^= pixel.b; hash *= prime; hash ^= pixel.a; hash *= prime; }
            }
            return hash;
        }

        private static Color Mean(Color[] pixels)
        {
            Color sum = Color.clear;
            foreach (Color pixel in pixels) sum += pixel;
            return sum / pixels.Length;
        }

        private static void AssertFinite(float value)
            => Assert.That(float.IsNaN(value) || float.IsInfinity(value), Is.False);
    }
}
