using NUnit.Framework;
using Wildkin.Matter;

namespace Wildkin.Tests.EditMode
{
    public sealed class MatterEditsTests
    {
        [Test]
        public void RemovingGeneratedMatter_StoresGlobalAirTombstoneWithoutRegeneration()
        {
            MatterWorld world = MatterWorldFactory.CreateQualificationWorld();
            var address = new MatterSampleAddress(5, -2, 5);
            MatterSample generated = world.ReadSample(address);
            Assert.That(generated.IsSolid, Is.True);

            Assert.That(world.Remove(address), Is.True);
            Assert.That(world.Revision, Is.EqualTo(1));
            Assert.That(world.EditCount, Is.EqualTo(1));
            Assert.That(world.ReadSample(address).Material, Is.EqualTo(MatterMaterialId.Air));
            Assert.That(world.ReadSample(address).IsSolid, Is.False);
            Assert.That(world.Remove(address), Is.False);
            Assert.That(world.Revision, Is.EqualTo(1), "A repeated removal is a no-op.");
            Assert.That(world.EvaluateSourceDirect(address).IsSolid, Is.True);
            Assert.That(world.ReadSample(address).Material, Is.EqualTo(MatterMaterialId.Air));

            MatterSparseEdit edit = world.GetSparseEditsSorted()[0];
            Assert.That(edit.Address, Is.EqualTo(address));
            Assert.That(edit.Sample.Material, Is.EqualTo(MatterMaterialId.Air));
        }

        [Test]
        public void MaterialEdit_PreservesDensityAndNoOpDoesNotRevise()
        {
            MatterWorld world = MatterWorldFactory.CreateQualificationWorld();
            var address = new MatterSampleAddress(5, -2, 5);
            MatterSample before = world.ReadSample(address);
            Assert.That(before.Material, Is.EqualTo(MatterMaterialId.Dirt));

            Assert.That(world.SetMaterial(address, MatterMaterialId.Rock), Is.True);
            MatterSample after = world.ReadSample(address);
            Assert.That(after.Material, Is.EqualTo(MatterMaterialId.Rock));
            Assert.That(after.Density, Is.EqualTo(before.Density));
            Assert.That(world.Revision, Is.EqualTo(1));
            Assert.That(world.SetMaterial(address, MatterMaterialId.Rock), Is.False);
            Assert.That(world.Revision, Is.EqualTo(1));
        }

        [Test]
        public void SettingCurrentSample_IsNoOpAndReturningToSourceRemovesOverride()
        {
            MatterWorld world = MatterWorldFactory.CreateQualificationWorld();
            var address = new MatterSampleAddress(5, -2, 5);
            MatterSample generated = world.ReadSample(address);

            Assert.That(world.SetSample(address, generated), Is.False);
            Assert.That(world.Revision, Is.Zero);
            Assert.That(world.SetMaterial(address, MatterMaterialId.Rock), Is.True);
            Assert.That(world.EditCount, Is.EqualTo(1));
            Assert.That(world.SetSample(address, generated), Is.True);
            Assert.That(world.ReadSample(address), Is.EqualTo(generated));
            Assert.That(world.EditCount, Is.Zero);
            Assert.That(world.Revision, Is.EqualTo(2));
        }
    }
}
