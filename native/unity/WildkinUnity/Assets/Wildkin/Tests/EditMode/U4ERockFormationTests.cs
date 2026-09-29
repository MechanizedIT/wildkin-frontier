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
        public void DirectionalPatch_FiltersDownwardSidewaysAndDiagonalOutwardNormals()
        {
            U4ESurfaceProbeSet probes = CreateTriangles(
                Triangle(new MatterFloat3(0f, 0f, 0f), new MatterFloat3(1f, 0f, 0f), new MatterFloat3(0f, 0f, 1f)),
                Triangle(new MatterFloat3(2f, 0f, 0f), new MatterFloat3(2f, 1f, 0f), new MatterFloat3(2f, 0f, 1f)),
                Triangle(new MatterFloat3(4f, 0f, 0f), new MatterFloat3(4.7071068f, .7071068f, 0f), new MatterFloat3(4f, 0f, 1f)));
            MatterDomain moving = CreateFixtureDomain("directional-filter", new AllAirGrid(.25f));
            var bounds = FixtureBounds;

            U4EDirectionalContactPatchMeasurement downward = U4EContactProbe.MeasureDirectionalPatch(moving,
                probes, new AllAirGrid(.25f), bounds, MatterDomainPose.Identity,
                new MatterFloat3(0f, -1f, 0f), 0f);
            U4EDirectionalContactPatchMeasurement sideways = U4EContactProbe.MeasureDirectionalPatch(moving,
                probes, new AllAirGrid(.25f), bounds, MatterDomainPose.Identity,
                new MatterFloat3(1f, 0f, 0f), 0f);
            U4EDirectionalContactPatchMeasurement diagonal = U4EContactProbe.MeasureDirectionalPatch(moving,
                probes, new AllAirGrid(.25f), bounds, MatterDomainPose.Identity,
                new MatterFloat3(.7071068f, -.7071068f, 0f), 0f);

            Assert.That(downward.supportFacingTriangleCount, Is.EqualTo(2));
            Assert.That(sideways.supportFacingTriangleCount, Is.EqualTo(2));
            Assert.That(diagonal.supportFacingTriangleCount, Is.EqualTo(3));
        }

        [Test]
        public void DirectionalPatch_AreaRatioUsesTriangleAreaRatherThanWitnessCount()
        {
            U4ESurfaceProbeSet probes = CreateTriangles(
                Triangle(new MatterFloat3(0f, .001f, 0f), new MatterFloat3(.1f, .001f, 0f), new MatterFloat3(0f, .001f, .1f)),
                Triangle(new MatterFloat3(1f, .001f, 0f), new MatterFloat3(3f, .001f, 0f), new MatterFloat3(1f, .001f, 2f)),
                Triangle(new MatterFloat3(4f, .1f, 0f), new MatterFloat3(6f, .1f, 0f), new MatterFloat3(4f, .1f, 2f)));
            MatterDomain moving = CreateFixtureDomain("area-weighted", new AllAirGrid(.25f));
            var measurement = U4EContactProbe.MeasureDirectionalPatch(moving, probes,
                new PlaneGrid(.25f, 0f), FixtureBounds, MatterDomainPose.Identity,
                new MatterFloat3(0f, -1f, 0f), 0f);

            Assert.That(measurement.supportFacingTriangleCount, Is.EqualTo(3));
            Assert.That(measurement.acceptedPatchTriangleCount, Is.EqualTo(2));
            Assert.That(measurement.supportFacingSurfaceAreaSquareMeters, Is.EqualTo(4.005f).Within(.0001f));
            Assert.That(measurement.acceptedPatchAreaSquareMeters, Is.EqualTo(2.005f).Within(.0001f));
            Assert.That(measurement.contactPatchAreaRatio, Is.EqualTo(2.005f / 4.005f).Within(.0001f));
            Assert.That(measurement.areaWeightedMedianDirectionalGapMeters, Is.EqualTo(.001f).Within(.001f));
        }

        [Test]
        public void DirectionalPatch_DistinguishesCornerProximityFromBroadSupportWhenGlobalMinimumMatches()
        {
            U4ESurfaceProbeSet pointContact = CreateTriangles(
                Triangle(new MatterFloat3(0f, .001f, 0f), new MatterFloat3(.1f, .001f, 0f), new MatterFloat3(0f, .001f, .1f)),
                Triangle(new MatterFloat3(1f, .1f, 0f), new MatterFloat3(3f, .1f, 0f), new MatterFloat3(1f, .1f, 2f)));
            U4ESurfaceProbeSet broadSupport = CreateTriangles(
                Triangle(new MatterFloat3(0f, .001f, 0f), new MatterFloat3(2f, .001f, 0f), new MatterFloat3(0f, .001f, 2f)),
                Triangle(new MatterFloat3(2f, .001f, 0f), new MatterFloat3(2f, .001f, 2f), new MatterFloat3(0f, .001f, 2f)));
            MatterDomain moving = CreateFixtureDomain("point-versus-broad-moving", new AllAirGrid(.25f));
            MatterDomain anchor = CreateFixtureDomain("point-versus-broad-anchor", new PlaneGrid(.25f, 0f));
            var anchorProbes = broadSupport;
            U4EContactMeasurement pointGlobal = U4EContactProbe.MeasureDomainSurfaces(moving,
                pointContact, anchor, anchorProbes);
            U4EContactMeasurement broadGlobal = U4EContactProbe.MeasureDomainSurfaces(moving,
                broadSupport, anchor, anchorProbes);
            U4EDirectionalContactPatchMeasurement pointPatch = U4EContactProbe.MeasureDirectionalPatch(moving,
                pointContact, anchor, new MatterFloat3(0f, -1f, 0f), 0f);
            U4EDirectionalContactPatchMeasurement broadPatch = U4EContactProbe.MeasureDirectionalPatch(moving,
                broadSupport, anchor, new MatterFloat3(0f, -1f, 0f), 0f);

            Assert.That(pointGlobal.minimumSurfaceGapMeters, Is.EqualTo(broadGlobal.minimumSurfaceGapMeters).Within(.001f));
            Assert.That(pointGlobal.minimumSurfaceGapMeters, Is.EqualTo(.001f).Within(.001f));
            Assert.That(pointPatch.contactPatchAreaRatio, Is.LessThan(.01f));
            Assert.That(pointPatch.degeneratePointCluster, Is.True);
            Assert.That(broadPatch.contactPatchAreaRatio, Is.EqualTo(1f).Within(.0001f));
            Assert.That(broadPatch.contactPatchDiagonalMeters, Is.GreaterThan(.8f));
        }

        [Test]
        public void DirectionalFitter_IsDeterministicAndChangesPoseWithoutChangingMatterOrMesh()
        {
            MatterDomain anchor = CreateFitBox("directional-fit-anchor", MatterDomainPose.Identity);
            MatterDomain first = CreateFitBox("directional-fit-first", Pose(2.4f, 0f, 0f));
            MatterDomain second = CreateFitBox("directional-fit-second", Pose(2.4f, 0f, 0f));
            MatterDomain minusFive = CreateFitBox("directional-fit-minus-five", Pose(2.4f, 0f, 0f));
            var anchorMesh = new MatterDomainSurfaceNetsMesher().Build(anchor);
            var firstMesh = new MatterDomainSurfaceNetsMesher().Build(first);
            var secondMesh = new MatterDomainSurfaceNetsMesher().Build(second);
            var minusFiveMesh = new MatterDomainSurfaceNetsMesher().Build(minusFive);
            var anchorProbes = new U4ESurfaceProbeSet(anchorMesh.Mesh);
            var firstProbes = new U4ESurfaceProbeSet(firstMesh.Mesh);
            var secondProbes = new U4ESurfaceProbeSet(secondMesh.Mesh);
            var minusFiveProbes = new U4ESurfaceProbeSet(minusFiveMesh.Mesh);
            ulong firstContent = first.ComputeContentHash();
            ulong firstMeshHash = firstMesh.Mesh.DeterministicHash;
            long firstMeshRevision = first.MeshRevision;
            ulong secondContent = second.ComputeContentHash();
            ulong secondMeshHash = secondMesh.Mesh.DeterministicHash;
            long secondMeshRevision = second.MeshRevision;
            ulong minusFiveContent = minusFive.ComputeContentHash();
            ulong minusFiveMeshHash = minusFiveMesh.Mesh.DeterministicHash;
            long minusFiveMeshRevision = minusFive.MeshRevision;

            U4EContactFitResult firstFit = U4EContactFitter.FitDirectionalPatchDomainToDomain(first,
                firstProbes, anchor, anchorProbes, new MatterFloat3(-1f, 0f, 0f), 0f);
            U4EContactFitResult secondFit = U4EContactFitter.FitDirectionalPatchDomainToDomain(second,
                secondProbes, anchor, anchorProbes, new MatterFloat3(-1f, 0f, 0f), 0f);
            U4EContactFitResult minusFiveFit = U4EContactFitter.FitDirectionalPatchDomainToDomain(minusFive,
                minusFiveProbes, anchor, anchorProbes, new MatterFloat3(-1f, 0f, 0f), -.005f);

            Assert.That(firstFit.accepted, Is.True, firstFit.rejectionReason +
                $" gap={firstFit.measurement.minimumSurfaceGapMeters:R} overlap={firstFit.measurement.aToBPositiveSampleCount}/{firstFit.measurement.bToAPositiveSampleCount} adjustment={firstFit.adjustmentMeters:R}");
            Assert.That(secondFit.accepted, Is.True, secondFit.rejectionReason);
            Assert.That(minusFiveFit.accepted, Is.True, minusFiveFit.rejectionReason);
            Assert.That(firstFit.adjustmentMeters, Is.EqualTo(secondFit.adjustmentMeters));
            Assert.That(first.Pose.PositionMeters.X, Is.EqualTo(second.Pose.PositionMeters.X));
            Assert.That(firstFit.measurement.directionalPatch.hasAcceptedPatch, Is.True);
            Assert.That(firstFit.measurement.HasZeroSampledOverlap, Is.True);
            Assert.That(minusFiveFit.measurement.directionalPatch.targetGapMeters, Is.EqualTo(-.005f));
            Assert.That(minusFiveFit.measurement.HasZeroSampledOverlap, Is.True);
            Assert.That(minusFiveFit.measurement.minimumSurfaceGapMeters,
                Is.GreaterThanOrEqualTo(-U4EFormationConfiguration.MaximumContactPenetrationMeters));
            Assert.That(first.ComputeContentHash(), Is.EqualTo(firstContent));
            Assert.That(second.ComputeContentHash(), Is.EqualTo(secondContent));
            Assert.That(first.MeshRevision, Is.EqualTo(firstMeshRevision));
            Assert.That(second.MeshRevision, Is.EqualTo(secondMeshRevision));
            Assert.That(minusFive.ComputeContentHash(), Is.EqualTo(minusFiveContent));
            Assert.That(minusFive.MeshRevision, Is.EqualTo(minusFiveMeshRevision));
            Assert.That(firstMesh.Mesh.DeterministicHash, Is.EqualTo(firstMeshHash));
            Assert.That(secondMesh.Mesh.DeterministicHash, Is.EqualTo(secondMeshHash));
            Assert.That(minusFiveMesh.Mesh.DeterministicHash, Is.EqualTo(minusFiveMeshHash));
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

        private static MatterDomain CreateFitBox(string id, MatterDomainPose pose)
        {
            const float spacing = .25f;
            var bounds = new MatterBounds(new MatterInt3(-8, -8, -8), new MatterInt3(9, 9, 9));
            var grid = new BoxGrid(spacing, new MatterFloat3(1f, 1f, 1f));
            return MatterDomain.Bake(id, bounds, spacing, grid, pose);
        }

        private static U4ESurfaceProbeSet CreateTriangles(params MatterFloat3[][] triangles)
        {
            var positions = new List<MatterFloat3>();
            var normals = new List<MatterFloat3>();
            var indices = new List<int>();
            foreach (MatterFloat3[] triangle in triangles)
            {
                Assert.That(triangle, Is.Not.Null);
                Assert.That(triangle.Length, Is.EqualTo(3));
                MatterFloat3 normal = Normalize(Cross(Subtract(triangle[1], triangle[0]),
                    Subtract(triangle[2], triangle[0])));
                for (int corner = 0; corner < 3; corner++)
                {
                    indices.Add(positions.Count);
                    positions.Add(triangle[corner]);
                    normals.Add(normal);
                }
            }
            return new U4ESurfaceProbeSet(positions.ToArray(), normals.ToArray(), indices.ToArray());
        }

        private static MatterFloat3[] Triangle(MatterFloat3 a, MatterFloat3 b, MatterFloat3 c) => new[] { a, b, c };

        private static MatterBounds FixtureBounds => new MatterBounds(
            new MatterInt3(-8, -8, -8), new MatterInt3(9, 9, 9));

        private static MatterDomain CreateFixtureDomain(string id, IMatterReadOnlyGrid grid)
            => MatterDomain.Bake(id, FixtureBounds, grid.SampleSpacingMeters, grid, MatterDomainPose.Identity);

        private static MatterFloat3 Subtract(MatterFloat3 a, MatterFloat3 b)
            => new MatterFloat3(a.X - b.X, a.Y - b.Y, a.Z - b.Z);

        private static MatterFloat3 Cross(MatterFloat3 a, MatterFloat3 b)
            => new MatterFloat3(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);

        private static MatterFloat3 Normalize(MatterFloat3 value)
        {
            double length = Math.Sqrt((double)value.X * value.X + (double)value.Y * value.Y + (double)value.Z * value.Z);
            return new MatterFloat3((float)(value.X / length), (float)(value.Y / length), (float)(value.Z / length));
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

        private sealed class BoxGrid : IMatterReadOnlyGrid
        {
            private readonly MatterFloat3 _halfExtents;
            public float SampleSpacingMeters { get; }

            public BoxGrid(float spacing, MatterFloat3 halfExtents)
            {
                SampleSpacingMeters = spacing;
                _halfExtents = halfExtents;
            }

            public MatterSample ReadSample(MatterSampleAddress address)
            {
                float x = Math.Abs(address.X * SampleSpacingMeters);
                float y = Math.Abs(address.Y * SampleSpacingMeters);
                float z = Math.Abs(address.Z * SampleSpacingMeters);
                float density = Math.Min(_halfExtents.X - x, Math.Min(_halfExtents.Y - y, _halfExtents.Z - z));
                return density > 0f ? new MatterSample(density, MatterMaterialId.Rock) : MatterSample.Air(density);
            }
        }

        private sealed class AllAirGrid : IMatterReadOnlyGrid
        {
            public float SampleSpacingMeters { get; }
            public AllAirGrid(float spacing) => SampleSpacingMeters = spacing;
            public MatterSample ReadSample(MatterSampleAddress address)
                => MatterSample.Air(-SampleSpacingMeters);
        }

        private sealed class PlaneGrid : IMatterReadOnlyGrid
        {
            private readonly float _surfaceY;
            public float SampleSpacingMeters { get; }
            public PlaneGrid(float spacing, float surfaceY) { SampleSpacingMeters = spacing; _surfaceY = surfaceY; }
            public MatterSample ReadSample(MatterSampleAddress address)
            {
                float density = _surfaceY - address.Y * SampleSpacingMeters;
                return density > 0f
                    ? new MatterSample(density, MatterMaterialId.Rock)
                    : MatterSample.Air(density);
            }
        }
    }
}
