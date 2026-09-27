using NUnit.Framework;
using Wildkin.Matter;
using Wildkin.Matter.Unity;

namespace Wildkin.Tests.EditMode
{
    public sealed class MatterWorldSaveTests
    {
        [Test]
        public void QualificationJson_RoundTripsSeedSpacingEditsRevisionAndRemovedMatter()
        {
            const int seed = 81391;
            MatterWorld world = MatterWorldFactory.CreateQualificationWorld(seed, 0.5f);
            var removed = new MatterSampleAddress(5, -2, 5);
            var relabeled = new MatterSampleAddress(-5, -2, -5);
            float relabeledDensity = world.ReadSample(relabeled).Density;
            Assert.That(world.Remove(removed), Is.True);
            Assert.That(world.SetMaterial(relabeled, MatterMaterialId.Rock), Is.True);

            string json = MatterWorldSaveCodec.Write(world);
            MatterWorld restored = MatterWorldSaveCodec.Read(json);

            Assert.That(restored.SourceSeed, Is.EqualTo(seed));
            Assert.That(restored.SourceVersion, Is.EqualTo(world.SourceVersion));
            Assert.That(restored.SampleSpacingMeters, Is.EqualTo(world.SampleSpacingMeters));
            Assert.That(restored.Revision, Is.EqualTo(world.Revision));
            Assert.That(restored.EditCount, Is.EqualTo(2));
            Assert.That(restored.ReadSample(removed).Material, Is.EqualTo(MatterMaterialId.Air));
            Assert.That(restored.ReadSample(removed).IsSolid, Is.False);
            Assert.That(restored.EvaluateSourceDirect(removed).IsSolid, Is.True);
            Assert.That(restored.ReadSample(relabeled).Material, Is.EqualTo(MatterMaterialId.Rock));
            Assert.That(restored.ReadSample(relabeled).Density, Is.EqualTo(relabeledDensity));
            Assert.That(restored.GetSparseEditsSorted()[0].Address.CompareTo(
                restored.GetSparseEditsSorted()[1].Address), Is.LessThan(0));
        }

        [Test]
        public void QualificationJson_EmptyEditSetPreservesSeedAndZeroRevision()
        {
            MatterWorld world = MatterWorldFactory.CreateQualificationWorld(77);
            MatterWorld restored = MatterWorldSaveCodec.Read(MatterWorldSaveCodec.Write(world));

            Assert.That(restored.SourceSeed, Is.EqualTo(77));
            Assert.That(restored.Revision, Is.Zero);
            Assert.That(restored.EditCount, Is.Zero);
            Assert.That(restored.ReadSample(new MatterSampleAddress(4, -2, 3)),
                Is.EqualTo(world.ReadSample(new MatterSampleAddress(4, -2, 3))));
        }

        [Test]
        public void QualificationJson_RejectsUnsupportedSchemaAndSourceVersions()
        {
            const string wrongSchema =
                "{\"schemaVersion\":99,\"brickCellSize\":16,\"sourceSeed\":1,\"sourceVersion\":1,\"sampleSpacingMeters\":0.5,\"worldRevision\":0,\"edits\":[]}";
            const string wrongSource =
                "{\"schemaVersion\":1,\"brickCellSize\":16,\"sourceSeed\":1,\"sourceVersion\":99,\"sampleSpacingMeters\":0.5,\"worldRevision\":0,\"edits\":[]}";

            Assert.Throws<System.FormatException>(() => MatterWorldSaveCodec.Read(wrongSchema));
            Assert.Throws<System.FormatException>(() => MatterWorldSaveCodec.Read(wrongSource));
        }
    }
}
