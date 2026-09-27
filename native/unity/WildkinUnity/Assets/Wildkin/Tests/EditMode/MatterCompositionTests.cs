using System.Linq;
using NUnit.Framework;
using Wildkin.Matter;

namespace Wildkin.Tests.EditMode
{
    public sealed class MatterCompositionTests
    {
        [Test]
        public void QualificationSource_IsDeterministicForSeedAndAddress()
        {
            MatterWorld world = MatterWorldFactory.CreateQualificationWorld(741);
            var address = new MatterSampleAddress(-3, -2, 4);

            MatterSample first = world.EvaluateSourceDirect(address);
            MatterSample second = world.EvaluateSourceDirect(address);

            Assert.That(second, Is.EqualTo(first));
            Assert.That(world.EvaluateSourceDirect(address), Is.EqualTo(first));
        }

        [Test]
        public void Composition_IsIndependentOfSourceEvaluationOrder()
        {
            MatterSourceLayer[] layers =
            {
                MatterSourceLayer.DirtPlane(0.25f, 0.12f, 13),
                MatterSourceLayer.SolidEllipsoid(
                    MatterMaterialId.Rock, new MatterFloat3(-0.5f, -0.75f, 0.5f),
                    new MatterFloat3(1.5f, 1.0f, 1.25f)),
                MatterSourceLayer.AirCutEllipsoid(
                    new MatterFloat3(0f, -0.5f, 0f), new MatterFloat3(0.6f, 0.7f, 0.5f))
            };
            var forward = new MatterSourceComposer(1, layers);
            var reversed = new MatterSourceComposer(1, layers.Reverse().ToArray());

            for (int z = -4; z <= 4; z++)
            for (int y = -4; y <= 2; y++)
            for (int x = -4; x <= 4; x++)
            {
                var address = new MatterSampleAddress(x, y, z);
                Assert.That(
                    reversed.Sample(address, 1234, 0.5f),
                    Is.EqualTo(forward.Sample(address, 1234, 0.5f)),
                    $"Resolved sample changed with source order at {address}.");
            }
        }

        [Test]
        public void EqualDensityRockAndDirt_UseRegistryCompositionPrecedence()
        {
            var composer = new MatterSourceComposer(
                1,
                MatterSourceLayer.DirtPlane(1f),
                MatterSourceLayer.SolidEllipsoid(
                    MatterMaterialId.Rock, new MatterFloat3(0f, 0f, 0f),
                    new MatterFloat3(1f, 1f, 1f)));

            MatterSample sample = composer.Sample(new MatterSampleAddress(0, 0, 0), 1, 0.5f);

            Assert.That(sample.Density, Is.EqualTo(1f).Within(0.00001f));
            Assert.That(sample.Material, Is.EqualTo(MatterMaterialId.Rock));
        }

        [Test]
        public void AirCut_SubtractsFromComposedSolidAndResolvesOneAirMaterial()
        {
            var composer = new MatterSourceComposer(
                1,
                MatterSourceLayer.SolidEllipsoid(
                    MatterMaterialId.Rock, new MatterFloat3(0f, 0f, 0f),
                    new MatterFloat3(2f, 2f, 2f)),
                MatterSourceLayer.DirtPlane(-0.1f),
                MatterSourceLayer.AirCutEllipsoid(
                    new MatterFloat3(0f, 0f, 0f), new MatterFloat3(0.5f, 0.5f, 0.5f)));

            MatterSample sample = composer.Sample(new MatterSampleAddress(0, 0, 0), 5, 0.5f);

            Assert.That(sample.Density, Is.LessThanOrEqualTo(0f));
            Assert.That(sample.Material, Is.EqualTo(MatterMaterialId.Air));
            Assert.That(sample.IsSolid, Is.False);
        }

        [Test]
        public void ResolvedSample_RejectsCompetingDensityAndMaterialIdentity()
        {
            Assert.Throws<System.ArgumentException>(
                () => new MatterSample(0.25f, MatterMaterialId.Air));
            Assert.Throws<System.ArgumentException>(
                () => new MatterSample(-0.25f, MatterMaterialId.Rock));
            Assert.That(new MatterSample(0f, MatterMaterialId.Air).Material, Is.EqualTo(MatterMaterialId.Air));
        }
    }
}
