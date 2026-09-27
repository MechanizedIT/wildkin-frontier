using NUnit.Framework;
using Wildkin.Matter;

namespace Wildkin.Tests.EditMode
{
    public sealed class MatterRegionSnapshotTests
    {
        [Test]
        public void Snapshot_CopiesResolvedSamplesAcrossPositiveAndNegativeBrickBoundaries()
        {
            MatterWorld world = MatterWorldFactory.CreateQualificationWorld();
            var bounds = new MatterBounds(
                new MatterInt3(14, -17, -2),
                new MatterInt3(19, -14, 3));
            MatterRegionSnapshot snapshot = MatterRegionSnapshot.Capture(world, bounds);

            Assert.That(snapshot.SampleCount, Is.EqualTo(5 * 3 * 5));
            Assert.That(snapshot.Densities.Length, Is.EqualTo(snapshot.SampleCount));
            Assert.That(snapshot.Materials.Length, Is.EqualTo(snapshot.SampleCount));
            Assert.That(snapshot.Origin, Is.EqualTo(bounds.MinInclusive));

            var local = new MatterInt3(2, 1, 1);
            MatterSampleAddress global = snapshot.AddressFromLocal(local);
            Assert.That(global, Is.EqualTo(new MatterSampleAddress(16, -16, -1)));
            Assert.That(snapshot.GetLocal(local), Is.EqualTo(world.ReadSample(global)));
            Assert.That(snapshot.TryLocalFromAddress(global, out MatterInt3 returned), Is.True);
            Assert.That(returned, Is.EqualTo(local));
        }

        [Test]
        public void ActorLocalMatterCoordinates_AreIndependentOfWorldBrickIdentity()
        {
            MatterWorld world = MatterWorldFactory.CreateQualificationWorld();
            var bounds = new MatterBounds(
                new MatterInt3(15, -2, -1),
                new MatterInt3(17, 0, 1));
            MatterRegionSnapshot actorLocalMatter = MatterRegionSnapshot.Capture(world, bounds);

            MatterSampleAddress firstGlobal = actorLocalMatter.AddressFromLocal(new MatterInt3(0, 0, 0));
            MatterSampleAddress nextGlobal = actorLocalMatter.AddressFromLocal(new MatterInt3(1, 0, 0));
            MatterBrickLayout.Resolve(firstGlobal, out MatterBrickAddress firstBrick, out _);
            MatterBrickLayout.Resolve(nextGlobal, out MatterBrickAddress nextBrick, out _);

            Assert.That(firstBrick, Is.Not.EqualTo(nextBrick));
            Assert.That(actorLocalMatter.GetLocal(new MatterInt3(0, 0, 0)),
                Is.EqualTo(world.ReadSample(firstGlobal)));
            Assert.That(actorLocalMatter.GetLocal(new MatterInt3(1, 0, 0)),
                Is.EqualTo(world.ReadSample(nextGlobal)));
            Assert.That(actorLocalMatter.AddressFromLocal(new MatterInt3(1, 0, 0)).X, Is.EqualTo(16));
        }

        [Test]
        public void Snapshot_RejectsOutOfBoundsLocalAndGlobalWriteback()
        {
            MatterWorld world = MatterWorldFactory.CreateQualificationWorld();
            var bounds = new MatterBounds(
                new MatterInt3(5, -2, 5),
                new MatterInt3(7, 0, 7));
            MatterRegionSnapshot snapshot = MatterRegionSnapshot.Capture(world, bounds);
            long startingRevision = world.Revision;
            var air = MatterSample.Air(-1f);

            Assert.That(snapshot.TrySetLocal(new MatterInt3(-1, 0, 0), air), Is.False);
            Assert.That(snapshot.TrySetLocal(new MatterInt3(2, 0, 0), air), Is.False);
            Assert.That(snapshot.TryWriteBackSample(
                world, new MatterSampleAddress(4, -1, 5), air), Is.False);
            Assert.That(world.Revision, Is.EqualTo(startingRevision));
            Assert.That(world.EditCount, Is.Zero);
        }

        [Test]
        public void SnapshotWriteback_AppliesOnlyChangedSamplesInsideItsBounds()
        {
            MatterWorld world = MatterWorldFactory.CreateQualificationWorld();
            var bounds = new MatterBounds(
                new MatterInt3(5, -2, 5),
                new MatterInt3(7, 0, 7));
            MatterRegionSnapshot snapshot = MatterRegionSnapshot.Capture(world, bounds);
            Assert.That(snapshot.TrySetLocal(new MatterInt3(0, 0, 0), MatterSample.Air(-1f)), Is.True);

            int accepted = snapshot.WriteBack(world);

            Assert.That(accepted, Is.EqualTo(1));
            Assert.That(world.Revision, Is.EqualTo(1));
            Assert.That(world.ReadSample(new MatterSampleAddress(5, -2, 5)).Material,
                Is.EqualTo(MatterMaterialId.Air));
            Assert.That(world.ReadSample(new MatterSampleAddress(6, -2, 5)).IsSolid, Is.True);
        }
    }
}
