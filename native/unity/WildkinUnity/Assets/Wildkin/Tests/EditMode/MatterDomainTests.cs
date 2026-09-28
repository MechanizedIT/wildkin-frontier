using System;
using System.Collections.Generic;
using NUnit.Framework;
using Wildkin.Matter;
using Wildkin.Matter.Unity;

namespace Wildkin.Tests.EditMode
{
    public sealed class MatterDomainTests
    {
        [Test]
        public void Domains_KeepIndependentIdsAndSpacingAndCopyTheirSourceSamples()
        {
            MatterBounds bounds = Bounds(-24, 24);
            var sourceA = new AnalyticSphereGrid(.25f, 2.4f);
            var sourceB = new AnalyticSphereGrid(.125f, 2.4f);
            MatterDomain domainA = MatterDomain.Bake("rock-025", bounds, .25f, sourceA, MatterDomainPose.Identity);
            MatterDomain domainB = MatterDomain.Bake("rock-0125", bounds, .125f, sourceB, MatterDomainPose.Identity);
            ulong hashA = domainA.ComputeContentHash();
            ulong hashB = domainB.ComputeContentHash();
            sourceA.ClearToAir();
            sourceB.ClearToAir();

            var collection = new MatterDomainCollection();
            collection.Add(domainA);
            collection.Add(domainB);

            Assert.That(collection.Count, Is.EqualTo(2));
            Assert.That(domainA.SampleSpacingMeters, Is.EqualTo(.25f));
            Assert.That(domainB.SampleSpacingMeters, Is.EqualTo(.125f));
            Assert.That(domainA.Id, Is.Not.EqualTo(domainB.Id));
            Assert.That(domainA.ComputeContentHash(), Is.EqualTo(hashA));
            Assert.That(domainB.ComputeContentHash(), Is.EqualTo(hashB));
            Assert.That(domainA.ReadSample(new MatterSampleAddress(0, 0, 0)).IsSolid, Is.True);
            Assert.That(domainB.ReadSample(new MatterSampleAddress(0, 0, 0)).IsSolid, Is.True);
            Assert.Throws<ArgumentException>(() => collection.Add(domainA));

            domainA.RemoveSphereLocal(new MatterFloat3(0f, 0f, 0f), .25f);
            Assert.That(domainA.ContentRevision, Is.EqualTo(1));
            Assert.That(domainB.ContentRevision, Is.Zero);
            Assert.That(domainB.ComputeContentHash(), Is.EqualTo(hashB));
            Assert.That(domainA.SampleSpacingMeters, Is.EqualTo(.25f));
            Assert.That(domainB.SampleSpacingMeters, Is.EqualTo(.125f));
        }

        [Test]
        public void DomainCoordinates_RoundTripNegativeSamplesThroughTranslationAndRotation()
        {
            MatterDomain domain = CreateSphereDomain("rotated", .125f, 2.4f);
            var pose = new MatterDomainPose(new MatterFloat3(10f, 2f, -3f), 0f,
                (float)Math.Sqrt(.5d), 0f, (float)Math.Sqrt(.5d));
            MatterSampleAddress localAddress = new MatterSampleAddress(-8, -4, 6);
            MatterFloat3 localMeters = domain.LocalSampleToMeters(localAddress);
            MatterFloat3 world = pose.TransformPoint(localMeters);
            domain.SetPose(pose);

            Assert.That(localMeters.X, Is.EqualTo(-1f).Within(1e-6f));
            Assert.That(localMeters.Y, Is.EqualTo(-.5f).Within(1e-6f));
            Assert.That(localMeters.Z, Is.EqualTo(.75f).Within(1e-6f));
            MatterFloat3 returnedLocal = domain.Pose.InverseTransformPoint(world);
            Assert.That(returnedLocal.X, Is.EqualTo(localMeters.X).Within(1e-5f));
            Assert.That(returnedLocal.Y, Is.EqualTo(localMeters.Y).Within(1e-5f));
            Assert.That(returnedLocal.Z, Is.EqualTo(localMeters.Z).Within(1e-5f));
            Assert.That(domain.WorldToNearestSample(world), Is.EqualTo(localAddress));
            Assert.That(domain.LocalMetersToFloorSample(new MatterFloat3(-.126f, -.001f, .249f)),
                Is.EqualTo(new MatterSampleAddress(-2, -1, 1)));
        }

        [Test]
        public void SphereSubtraction_PreservesSignedValuesAndComposesWithoutChangingWorld()
        {
            const int seed = 24117;
            MatterWorld world = MatterWorldFactory.CreateQualificationWorld(seed, .5f);
            var worldGrid = new WorldGridAdapter(world);
            ulong worldHash = HashGrid(worldGrid, new MatterBounds(new MatterInt3(-8, -8, -8), new MatterInt3(9, 9, 9)));
            long worldRevision = world.Revision;
            int worldEdits = world.EditCount;
            MatterDomain domain = CreateSphereDomain("editable", .125f, 2f);
            ulong startingHash = domain.ComputeContentHash();

            MatterDomainEditResult first = domain.RemoveSphereLocal(new MatterFloat3(0f, 0f, 0f), .5f);
            Assert.That(first.Changed, Is.True);
            Assert.That(first.SamplesExamined, Is.GreaterThan(first.ChangedSampleCount));
            Assert.That(first.ChangedSampleCount, Is.GreaterThan(0));
            Assert.That(domain.ContentRevision, Is.EqualTo(1));
            Assert.That(domain.ComputeContentHash(), Is.Not.EqualTo(startingHash));
            Assert.That(domain.ReadSample(new MatterSampleAddress(0, 0, 0)).Material, Is.EqualTo(MatterMaterialId.Air));
            Assert.That(domain.ReadSample(new MatterSampleAddress(3, 0, 0)).Density, Is.EqualTo(-.125f).Within(1e-5f));
            Assert.That(domain.ReadSample(new MatterSampleAddress(5, 0, 0)).Density, Is.EqualTo(.125f).Within(1e-5f));
            Assert.That(domain.ReadSample(new MatterSampleAddress(0, 0, 23)), Is.EqualTo(new MatterSample(-.875f, MatterMaterialId.Air)));

            MatterDomainEditResult repeat = domain.RemoveSphereLocal(new MatterFloat3(0f, 0f, 0f), .5f);
            Assert.That(repeat.Changed, Is.False);
            Assert.That(domain.ContentRevision, Is.EqualTo(1));
            MatterDomainEditResult nearby = domain.RemoveSphereLocal(new MatterFloat3(.375f, 0f, 0f), .45f);
            Assert.That(nearby.Changed, Is.True);
            Assert.That(domain.ContentRevision, Is.EqualTo(2));

            Assert.That(HashGrid(worldGrid, new MatterBounds(new MatterInt3(-8, -8, -8), new MatterInt3(9, 9, 9))),
                Is.EqualTo(worldHash));
            Assert.That(world.Revision, Is.EqualTo(worldRevision));
            Assert.That(world.EditCount, Is.EqualTo(worldEdits));
            Assert.That(world.SampleSpacingMeters, Is.EqualTo(.5f));
        }

        [Test]
        public void WorldSpaceEdit_UsesMovedPoseAndOldPoseTargetIsNoOp()
        {
            MatterDomain domain = CreateSphereDomain("world-target", .125f, 2.4f);
            var oldPose = MatterDomainPose.Identity;
            var movedPose = new MatterDomainPose(new MatterFloat3(25f, 8f, -13f), 0f,
                (float)Math.Sqrt(.5d), 0f, (float)Math.Sqrt(.5d));
            var localTarget = new MatterFloat3(.875f, 0f, 0f);
            MatterFloat3 movedWorldTarget = movedPose.TransformPoint(localTarget);
            domain.SetPose(movedPose);

            MatterDomainEditResult movedEdit = domain.RemoveSphereWorld(movedWorldTarget, .3f);
            Assert.That(movedEdit.Changed, Is.True);
            Assert.That(movedEdit.ChangedSamples, Does.Contain(new MatterSampleAddress(7, 0, 0)));
            long revisionAfterMovedTarget = domain.ContentRevision;
            MatterFloat3 oldWorldTarget = oldPose.TransformPoint(localTarget);
            MatterDomainEditResult oldPoseEdit = domain.RemoveSphereWorld(oldWorldTarget, .3f);

            Assert.That(oldPoseEdit.Changed, Is.False);
            Assert.That(domain.ContentRevision, Is.EqualTo(revisionAfterMovedTarget));
            Assert.That(domain.Pose.TransformPoint(localTarget).X, Is.EqualTo(25f).Within(1e-5f));
        }

        [Test]
        public void ContentHash_TracksMatterButIgnoresDomainPose()
        {
            MatterDomain domain = CreateSphereDomain("hash", .125f, 1.5f);
            ulong initial = domain.ComputeContentHash();
            domain.SetPose(new MatterDomainPose(new MatterFloat3(-4f, 12f, 8f), 0f,
                (float)Math.Sqrt(.5d), 0f, (float)Math.Sqrt(.5d)));
            Assert.That(domain.ComputeContentHash(), Is.EqualTo(initial));
            domain.RemoveSphereLocal(new MatterFloat3(0f, 0f, 0f), .25f);
            Assert.That(domain.ComputeContentHash(), Is.Not.EqualTo(initial));
        }

        [Test]
        public void HighResolutionSculptedRock_IsSourceIndependentAndIncrementallyRemeshesAcrossRegions()
        {
            const float spacing = .125f;
            SculptedStoneMesh source = SculptedStoneGenerator.Generate(SourceRockArchetype.ChunkyBoulder, 4102);
            var localVolume = new MatterLocalVolume(source, spacing);
            MatterDomain domain = MatterDomain.Bake("hero-boulder-0125", localVolume.Bounds, spacing,
                localVolume, MatterDomainPose.Identity);
            source = null;
            localVolume = null;
            GC.Collect();

            var regionalMesher = new MatterDomainSurfaceNetsMesher();
            MatterDomainMeshBuildResult initial = regionalMesher.Build(domain);
            Assert.That(initial.RegionCount, Is.GreaterThan(1), "The high-detail domain must span multiple 16-cell regions.");
            Assert.That(initial.RebuiltRegionCount, Is.EqualTo(initial.RegionCount));
            Assert.That(initial.ReusedRegionCount, Is.Zero);
            Assert.That(initial.Mesh.CellSpacingMeters, Is.EqualTo(spacing));
            Assert.That(initial.Mesh.MissingCrossingEdgeMappings, Is.Zero);
            Assert.That(initial.Mesh.Vertices.Length, Is.GreaterThan(0));
            Assert.That(new HashSet<MatterSurfaceVertexKey>(initial.Mesh.VertexSurfaceKeys).Count,
                Is.EqualTo(initial.Mesh.VertexSurfaceKeys.Length), "A shared topology-safe patch key must be welded once.");
            var reconstructed = SculptedStoneMesh.FromIndexedGeometry(Positions(initial.Mesh), initial.Mesh.Indices);
            Assert.That(reconstructed.Validate(out string issue), Is.True, issue);
            Assert.That(initial.TryPublishTo(domain), Is.True);
            Assert.That(domain.MeshContentRevision, Is.EqualTo(domain.ContentRevision));
            Assert.That(domain.RawPayloadBytes, Is.EqualTo(domain.SampleCount * 5L));

            MatterDomainRegionHash[] before = regionalMesher.GetRegionHashesSorted();
            MatterDomainEditResult edit = domain.RemoveSphereLocal(new MatterFloat3(.5f, 0f, 0f), .28f);
            Assert.That(edit.Changed, Is.True);
            MatterDomainMeshBuildResult updated = regionalMesher.Build(domain, edit.ChangedSamples);
            Assert.That(updated.DirectlyChangedRegionCount, Is.GreaterThan(0));
            Assert.That(updated.RebuiltRegionCount, Is.LessThan(updated.RegionCount));
            Assert.That(updated.ReusedRegionCount, Is.EqualTo(updated.RegionCount - updated.RebuiltRegionCount));
            Assert.That(updated.RebuiltRegionCount, Is.GreaterThanOrEqualTo(updated.DirectlyChangedRegionCount));
            Assert.That(updated.Mesh.DeterministicHash, Is.Not.EqualTo(initial.Mesh.DeterministicHash));
            Assert.That(updated.TryPublishTo(domain), Is.True);

            MatterDomainRegionHash[] after = regionalMesher.GetRegionHashesSorted();
            var beforeHashes = new Dictionary<MatterBrickAddress, ulong>();
            foreach (MatterDomainRegionHash row in before) beforeHashes.Add(row.Address, row.Hash);
            var rebuilt = new HashSet<MatterBrickAddress>(updated.RebuiltRegions);
            int verifiedReused = 0;
            foreach (MatterDomainRegionHash row in after)
            {
                if (rebuilt.Contains(row.Address)) continue;
                verifiedReused++;
                Assert.That(row.Hash, Is.EqualTo(beforeHashes[row.Address]), row.Address.ToString());
            }
            Assert.That(verifiedReused, Is.EqualTo(updated.ReusedRegionCount));
            Assert.That(updated.Mesh.MissingCrossingEdgeMappings, Is.Zero);
            var editedMesh = SculptedStoneMesh.FromIndexedGeometry(Positions(updated.Mesh), updated.Mesh.Indices);
            Assert.That(editedMesh.Validate(out string editedIssue), Is.True, editedIssue);

            ulong movedMatterHash = domain.ComputeContentHash();
            domain.SetPose(new MatterDomainPose(new MatterFloat3(3f, 2f, -5f), 0f,
                (float)Math.Sqrt(.5d), 0f, (float)Math.Sqrt(.5d)));
            MatterDomainMeshBuildResult moved = regionalMesher.Build(domain);
            Assert.That(moved.RebuiltRegionCount, Is.Zero);
            Assert.That(moved.Mesh.DeterministicHash, Is.EqualTo(updated.Mesh.DeterministicHash));
            Assert.That(domain.ComputeContentHash(), Is.EqualTo(movedMatterHash));
        }

        [Test]
        public void StagedMesh_CannotPublishAfterNewContentRevision()
        {
            MatterDomain domain = CreateSphereDomain("stale", .125f, 1.5f);
            var mesher = new MatterDomainSurfaceNetsMesher();
            MatterDomainMeshBuildResult staged = mesher.Build(domain);
            domain.RemoveSphereLocal(new MatterFloat3(0f, 0f, 0f), .4f);

            Assert.That(staged.TryPublishTo(domain), Is.False);
            Assert.That(domain.MeshRevision, Is.Zero);
            MatterDomainMeshBuildResult current = mesher.Build(domain);
            Assert.That(current.TryPublishTo(domain), Is.True);
            Assert.That(domain.MeshRevision, Is.EqualTo(1));
            Assert.That(domain.MeshContentRevision, Is.EqualTo(domain.ContentRevision));
        }

        [Test]
        public void MeshCacheAndStagedPublication_RejectReplacementWithSameIdAndRevision()
        {
            MatterDomain original = CreateSphereDomain("reused-id", .125f, 1.5f);
            var mesher = new MatterDomainSurfaceNetsMesher();
            MatterDomainMeshBuildResult staged = mesher.Build(original);
            MatterDomain replacement = CreateSphereDomain("reused-id", .125f, .875f);

            Assert.That(replacement.ContentRevision, Is.EqualTo(original.ContentRevision));
            Assert.That(replacement.ComputeContentHash(), Is.Not.EqualTo(original.ComputeContentHash()));
            Assert.That(staged.TryPublishTo(replacement), Is.False);
            Assert.That(replacement.MeshRevision, Is.Zero);

            MatterDomainMeshBuildResult rebuilt = mesher.Build(replacement);
            Assert.That(rebuilt.RebuiltRegionCount, Is.EqualTo(rebuilt.RegionCount));
            Assert.That(rebuilt.Mesh.DeterministicHash, Is.Not.EqualTo(staged.Mesh.DeterministicHash));
            Assert.That(rebuilt.TryPublishTo(replacement), Is.True);
            Assert.That(replacement.MeshContentRevision, Is.EqualTo(replacement.ContentRevision));
        }

        private static MatterDomain CreateSphereDomain(string id, float spacing, float radius)
        {
            var grid = new AnalyticSphereGrid(spacing, radius);
            return MatterDomain.Bake(id, Bounds(-24, 24), spacing, grid, MatterDomainPose.Identity);
        }

        private static MatterBounds Bounds(int min, int maxExclusive)
            => new MatterBounds(new MatterInt3(min, min, min), new MatterInt3(maxExclusive, maxExclusive, maxExclusive));

        private static MatterFloat3[] Positions(MatterMeshData mesh)
        {
            var positions = new MatterFloat3[mesh.Vertices.Length];
            for (int i = 0; i < positions.Length; i++) positions[i] = mesh.Vertices[i].PositionMeters;
            return positions;
        }

        private static ulong HashGrid(IMatterReadOnlyGrid grid, MatterBounds bounds)
        {
            ulong hash = 14695981039346656037UL;
            MatterInt3 size = bounds.Size;
            HashInt(ref hash, size.X); HashInt(ref hash, size.Y); HashInt(ref hash, size.Z);
            HashInt(ref hash, BitConverter.ToInt32(BitConverter.GetBytes(grid.SampleSpacingMeters), 0));
            for (int z = bounds.MinInclusive.Z; z < bounds.MaxExclusive.Z; z++)
            for (int y = bounds.MinInclusive.Y; y < bounds.MaxExclusive.Y; y++)
            for (int x = bounds.MinInclusive.X; x < bounds.MaxExclusive.X; x++)
            {
                MatterSample sample = grid.ReadSample(new MatterSampleAddress(x, y, z));
                HashInt(ref hash, BitConverter.ToInt32(BitConverter.GetBytes(sample.Density), 0));
                hash = (hash ^ (byte)sample.Material) * 1099511628211UL;
            }
            return hash;
        }

        private static void HashInt(ref ulong hash, int value)
        {
            unchecked
            {
                uint bits = (uint)value;
                for (int shift = 0; shift < 32; shift += 8) hash = (hash ^ (byte)(bits >> shift)) * 1099511628211UL;
            }
        }

        private sealed class AnalyticSphereGrid : IMatterReadOnlyGrid
        {
            private readonly float _radius;
            private bool _cleared;
            public float SampleSpacingMeters { get; }
            public AnalyticSphereGrid(float spacing, float radius) { SampleSpacingMeters = spacing; _radius = radius; }
            public MatterSample ReadSample(MatterSampleAddress address)
            {
                if (_cleared) return MatterSample.Air(-SampleSpacingMeters);
                double x = address.X * (double)SampleSpacingMeters;
                double y = address.Y * (double)SampleSpacingMeters;
                double z = address.Z * (double)SampleSpacingMeters;
                float density = (float)(_radius - Math.Sqrt(x * x + y * y + z * z));
                return density > 0f ? new MatterSample(density, MatterMaterialId.Rock) : MatterSample.Air(density);
            }
            public void ClearToAir() => _cleared = true;
        }

        private sealed class WorldGridAdapter : IMatterReadOnlyGrid
        {
            private readonly MatterWorld _world;
            public float SampleSpacingMeters => _world.SampleSpacingMeters;
            public WorldGridAdapter(MatterWorld world) => _world = world;
            public MatterSample ReadSample(MatterSampleAddress address) => _world.ReadSample(address);
        }
    }
}
