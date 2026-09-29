using System;
using System.Collections.Generic;
using NUnit.Framework;
using Wildkin.Matter;

namespace Wildkin.Tests.EditMode
{
    public sealed class U4ERockFormationTests
    {
        [Test]
        public void Recipe_IsRepeatableSlotStableVariedAndUsesOneSelectedHeroTier()
        {
            U4ERockFormationRecipe first = U4ERockFormationGenerator.CreateRecipe(7042, 0);
            U4ERockFormationRecipe repeated = U4ERockFormationGenerator.CreateRecipe(7042, 0);
            U4ERockFormationRecipe retry = U4ERockFormationGenerator.CreateRecipe(7042, 1);
            U4ERockFormationRecipe otherSeed = U4ERockFormationGenerator.CreateRecipe(7046, 0);

            Assert.That(first.children.Length, Is.InRange(U4EFormationConfiguration.MinimumChildren,
                U4EFormationConfiguration.MaximumChildren));
            Assert.That(repeated.children.Length, Is.EqualTo(first.children.Length));
            Assert.That(first.children[0].sourceRecipeHash, Is.EqualTo(repeated.children[0].sourceRecipeHash));
            Assert.That(first.children[0].proposedLocalPosition.X, Is.EqualTo(repeated.children[0].proposedLocalPosition.X));
            Assert.That(first.children[0].stableDomainId, Is.EqualTo(retry.children[0].stableDomainId),
                "A failed candidate attempt must preserve the semantic domain identity.");
            Assert.That(first.children[0].sourceRecipeHash, Is.Not.EqualTo(otherSeed.children[0].sourceRecipeHash));

            int heroCount = 0;
            var slots = new HashSet<string>(StringComparer.Ordinal);
            for (int i = 0; i < first.children.Length; i++)
            {
                U4ERockFormationChildRecipe child = first.children[i];
                Assert.That(slots.Add(child.slotId), Is.True, "Semantic slots must be unique.");
                Assert.That(child.stableDomainId, Is.EqualTo(U4ERockFormationGenerator.CreateStableDomainId(first.seed, child.slotId)));
                Assert.That(child.sourceRecipeHash, Is.EqualTo(U4ERockFormationGenerator.ComputeSourceRecipeHash(child.sourceRecipe)));
                Assert.That(child.sampleSpacingMeters == .25f || child.sampleSpacingMeters == .125f, Is.True);
                if (child.sampleSpacingMeters == .125f) heroCount++;
            }
            Assert.That(heroCount, Is.EqualTo(1), "Each candidate has one selected hero domain; siblings use the ordinary tier.");

            bool geometryDiffers = false;
            for (int i = 0; i < first.children.Length; i++)
            {
                SculptedStoneMesh a = SculptedStoneGenerator.Build(first.children[i].sourceRecipe);
                SculptedStoneMesh b = SculptedStoneGenerator.Build(otherSeed.children[i].sourceRecipe);
                geometryDiffers |= a.GeometryHash != b.GeometryHash;
            }
            Assert.That(geometryDiffers, Is.True, "Different formation seeds must create different source geometry.");
        }

        [Test]
        public void ContactProbe_FitsDisjointSpheresAndDetectsSampledOverlapSymmetrically()
        {
            MatterDomain anchor = CreateSphere("contact-anchor", 1f, MatterDomainPose.Identity);
            MatterDomain moving = CreateSphere("contact-moving", 1f, Pose(2.4f, 0f, 0f));
            var anchorMesher = new MatterDomainSurfaceNetsMesher();
            var movingMesher = new MatterDomainSurfaceNetsMesher();
            MatterDomainMeshBuildResult anchorMesh = anchorMesher.Build(anchor);
            MatterDomainMeshBuildResult movingMesh = movingMesher.Build(moving);
            var anchorProbes = new U4ESurfaceProbeSet(anchorMesh.Mesh);
            var movingProbes = new U4ESurfaceProbeSet(movingMesh.Mesh);

            U4EContactFitResult fit = U4EContactFitter.FitDomainToDomain(moving, movingProbes,
                anchor, anchorProbes, new MatterFloat3(-1f, 0f, 0f));
            Assert.That(fit.accepted, Is.True, fit.rejectionReason);
            Assert.That(fit.measurement.HasZeroSampledOverlap, Is.True);
            Assert.That(fit.measurement.minimumSurfaceGapMeters,
                Is.InRange(-U4EFormationConfiguration.MaximumContactPenetrationMeters,
                    U4EFormationConfiguration.MaximumContactGapMeters));
            Assert.That(fit.measurement.nearContactWitnessCount,
                Is.GreaterThanOrEqualTo(U4EFormationConfiguration.MinimumContactWitnesses));

            moving.SetPose(Pose(1.5f, 0f, 0f));
            U4EContactMeasurement overlap = U4EContactProbe.MeasureDomains(moving, movingProbes, anchor, anchorProbes);
            Assert.That(overlap.aToBPositiveSampleCount, Is.GreaterThan(0));
            Assert.That(overlap.bToAPositiveSampleCount, Is.GreaterThan(0));
            Assert.That(overlap.aToBOverlapEstimateCubicMeters, Is.GreaterThan(0d));
            Assert.That(overlap.bToAOverlapEstimateCubicMeters, Is.GreaterThan(0d));
            Assert.That(overlap.acceptedContact, Is.False);
        }

        [Test]
        public void Formation_BuildsRegeneratesEditsOneDomainAndInvalidatesOnlyIncidentPairs()
        {
            U4EFormationBuildResult formation = U4ERockFormationBuilder.Build(7000, MatterDomainPose.Identity);
            Assert.That(formation.Accepted, Is.True, formation.RejectionReason);
            Assert.That(formation.Children.Count, Is.InRange(U4EFormationConfiguration.MinimumChildren,
                U4EFormationConfiguration.MaximumChildren));
            Assert.That(formation.ContactGraph.allChildrenConnectedToTerrain, Is.True);
            Assert.That(formation.ContactGraph.possiblePairCount,
                Is.EqualTo(formation.Children.Count * (formation.Children.Count + 1) / 2));
            Assert.That(formation.TotalDomainSamples, Is.GreaterThan(0));
            Assert.That(formation.TotalDomainPayloadBytes, Is.EqualTo(formation.TotalDomainSamples * 5L));

            var originalContentHashes = new Dictionary<string, ulong>(StringComparer.Ordinal);
            var originalMeshHashes = new Dictionary<string, ulong>(StringComparer.Ordinal);
            for (int i = 0; i < formation.Children.Count; i++)
            {
                U4EFormationChildBuild child = formation.Children[i];
                originalContentHashes.Add(child.Domain.Id, child.Domain.ComputeContentHash());
                originalMeshHashes.Add(child.Domain.Id, child.MeshBuild.Mesh.DeterministicHash);
                Assert.That(child.SourceReferenceDiscardedAfterBake, Is.True);
                Assert.That(child.MeshBuild.Published, Is.True);
            }

            U4EPristineFormationDescriptor descriptor = U4ERockFormationBuilder.CreateDescriptor(formation);
            string descriptorJson = UnityEngine.JsonUtility.ToJson(descriptor);
            Assert.That(descriptorJson, Does.Not.Contain("density"));
            Assert.That(descriptorJson, Does.Not.Contain("mesh"));
            U4EPristineFormationDescriptor roundTrip = UnityEngine.JsonUtility.FromJson<U4EPristineFormationDescriptor>(descriptorJson);
            U4EFormationBuildResult regenerated = U4ERockFormationBuilder.RegeneratePristine(roundTrip);
            Assert.That(regenerated.Accepted, Is.True, regenerated.RejectionReason);
            Assert.That(regenerated.FormationHash, Is.EqualTo(formation.FormationHash));
            Assert.That(regenerated.SourceGeometryHash, Is.EqualTo(formation.SourceGeometryHash));
            Assert.That(regenerated.ContactGraph.graphHash, Is.EqualTo(formation.ContactGraph.graphHash));

            U4EFormationChildBuild edited = formation.Children[0];
            MatterSampleAddress firstSolid = FindSolid(edited.Domain);
            MatterFloat3 center = edited.Domain.LocalSampleToMeters(firstSolid);
            long worldRevision = formation.TerrainWorld.Revision;
            int worldEditCount = formation.TerrainWorld.EditCount;
            U4EFormationEditResult edit = U4ERockFormationBuilder.RemoveSphereLocal(formation,
                edited.Domain.Id, center, edited.Domain.SampleSpacingMeters * 1.75f);
            Assert.That(edit.Changed, Is.True);
            Assert.That(edit.ChangedSampleCount, Is.GreaterThan(0));
            Assert.That(edit.DirectlyChangedRegionCount, Is.GreaterThan(0));
            Assert.That(edit.RebuiltRegionCount, Is.GreaterThanOrEqualTo(edit.DirectlyChangedRegionCount));
            Assert.That(edit.AfterContentHash, Is.Not.EqualTo(edit.BeforeContentHash));
            Assert.That(edit.AfterMeshHash, Is.Not.EqualTo(edit.BeforeMeshHash));
            Assert.That(edit.RebuiltRegionCount + edit.ReusedRegionCount, Is.EqualTo(edited.MeshBuild.RegionCount));
            Assert.That(edit.InvalidatedPairKeys.Length, Is.EqualTo(formation.Children.Count));
            foreach (string pair in edit.InvalidatedPairKeys)
                Assert.That(pair, Does.Contain(edited.Domain.Id));

            for (int i = 1; i < formation.Children.Count; i++)
            {
                U4EFormationChildBuild unchanged = formation.Children[i];
                Assert.That(unchanged.Domain.ComputeContentHash(), Is.EqualTo(originalContentHashes[unchanged.Domain.Id]));
                Assert.That(unchanged.MeshBuild.Mesh.DeterministicHash, Is.EqualTo(originalMeshHashes[unchanged.Domain.Id]));
            }
            Assert.That(formation.TerrainWorld.Revision, Is.EqualTo(worldRevision));
            Assert.That(formation.TerrainWorld.EditCount, Is.EqualTo(worldEditCount));

            ulong contentBeforeMove = edited.Domain.ComputeContentHash();
            ulong meshBeforeMove = edited.MeshBuild.Mesh.DeterministicHash;
            long meshRevisionBeforeMove = edited.Domain.MeshRevision;
            MatterDomainPose poseBeforeMove = edited.Domain.Pose;
            U4EFormationEditResult moved = U4ERockFormationBuilder.SetDomainPose(formation, edited.Domain.Id,
                new MatterDomainPose(new MatterFloat3(poseBeforeMove.PositionMeters.X + .2f,
                    poseBeforeMove.PositionMeters.Y, poseBeforeMove.PositionMeters.Z), poseBeforeMove.RotationX,
                    poseBeforeMove.RotationY, poseBeforeMove.RotationZ, poseBeforeMove.RotationW));
            Assert.That(moved.InvalidatedPairKeys.Length, Is.EqualTo(formation.Children.Count));
            Assert.That(edited.Domain.ComputeContentHash(), Is.EqualTo(contentBeforeMove));
            Assert.That(edited.MeshBuild.Mesh.DeterministicHash, Is.EqualTo(meshBeforeMove));
            Assert.That(edited.Domain.MeshRevision, Is.EqualTo(meshRevisionBeforeMove));
        }

        private static MatterDomain CreateSphere(string id, float radius, MatterDomainPose pose)
        {
            const float spacing = .25f;
            var bounds = new MatterBounds(new MatterInt3(-8, -8, -8), new MatterInt3(9, 9, 9));
            var grid = new SphereGrid(spacing, radius);
            return MatterDomain.Bake(id, bounds, spacing, grid, pose);
        }

        private static MatterDomainPose Pose(float x, float y, float z)
            => new MatterDomainPose(new MatterFloat3(x, y, z), 0f, 0f, 0f, 1f);

        private static MatterSampleAddress FindSolid(MatterDomain domain)
        {
            MatterBounds bounds = domain.SampleBounds;
            for (int z = bounds.MinInclusive.Z; z < bounds.MaxExclusive.Z; z++)
            for (int y = bounds.MinInclusive.Y; y < bounds.MaxExclusive.Y; y++)
            for (int x = bounds.MinInclusive.X; x < bounds.MaxExclusive.X; x++)
            {
                var address = new MatterSampleAddress(x, y, z);
                if (domain.ReadSample(address).IsSolid) return address;
            }
            throw new InvalidOperationException("Formation child has no solid samples.");
        }

        private sealed class SphereGrid : IMatterReadOnlyGrid
        {
            private readonly float _radius;
            public float SampleSpacingMeters { get; }
            public SphereGrid(float spacing, float radius) { SampleSpacingMeters = spacing; _radius = radius; }
            public MatterSample ReadSample(MatterSampleAddress address)
            {
                double x = address.X * (double)SampleSpacingMeters;
                double y = address.Y * (double)SampleSpacingMeters;
                double z = address.Z * (double)SampleSpacingMeters;
                float density = (float)(_radius - Math.Sqrt(x * x + y * y + z * z));
                return density > 0f ? new MatterSample(density, MatterMaterialId.Rock) : MatterSample.Air(density);
            }
        }
    }
}
