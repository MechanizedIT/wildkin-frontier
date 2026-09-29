using System.Collections.Generic;
using NUnit.Framework;
using Wildkin.Matter;

namespace Wildkin.Tests.EditMode
{
    public sealed class U4E2LocalPoseSearchTests
    {
        private static readonly MatterBounds FixtureBounds = new MatterBounds(
            new MatterInt3(-8, -8, -8), new MatterInt3(9, 9, 9));

        [Test]
        public void ContactFrame_IsDeterministicOrthonormalForAxisAndDiagonalNormals()
        {
            AssertFrame(new MatterFloat3(0f, -1f, 0f));
            AssertFrame(new MatterFloat3(.26726124f, -.5345225f, .8017837f));
        }

        [Test]
        public void TranslationSearch_SlidesIntoBroadSupportAndLeavesDomainIdentityUntouched()
        {
            U4E2PoseSearchContext context = CreateFinitePatchContext(
                "u4e2-translation", Pose(.45f, .60f, 0f), MakeFlatPatchProbesAtY(1f, 12, -.5f), .45f, true);
            MatterDomain moving = context.MovingDomain;
            ulong contentBefore = moving.ComputeContentHash();
            Assert.That(moving.TryPublishMesh(moving.ContentRevision, 0x123456789ABCDEF0UL), Is.True);
            long meshRevisionBefore = moving.MeshRevision;
            ulong meshHashBefore = moving.PublishedMeshHash;
            MatterDomainPose poseBefore = moving.Pose;
            moving.SetPose(Pose(.45f, .225f, 0f));
            U4EContactProbe.CountSolidOverlap(moving, context.IntendedParent.Grid,
                context.IntendedParent.Bounds, context.IntendedParent.Pose,
                out int directToParent, out _, out int parentToDirect, out _);
            Assert.That(directToParent + parentToDirect, Is.GreaterThan(0),
                "A normal-only approach on this fixed rotation enters the platform.");
            moving.SetPose(poseBefore);
            U4E2PoseCandidate baseline = U4E2LocalPoseSearch.ValidateFixedPose(context, poseBefore);

            U4E2PoseSearchResult result = U4E2LocalPoseSearch.SearchTranslation(context);
            if (!result.accepted) Assert.That(Describe(result), Is.EqualTo("accepted"));

            Assert.That(result.accepted, Is.True, Describe(result));
            Assert.That(result.selected, Is.Not.Null);
            Assert.That(System.Math.Sqrt(result.selected.offsetUMeters * result.selected.offsetUMeters +
                result.selected.offsetVMeters * result.selected.offsetVMeters), Is.GreaterThan(.25f),
                "The fixture requires a tangential slide.");
            Assert.That(result.selected.directionalPatch.acceptedPatchAreaSquareMeters,
                Is.GreaterThan(baseline.directionalPatch.acceptedPatchAreaSquareMeters));
            Assert.That(result.selected.validation.parent.measurement.HasZeroSampledOverlap, Is.True);
            Assert.That(result.selected.validation.terrain.measurement.HasZeroSampledOverlap, Is.True);
            Assert.That(result.selected.validation.parent.measurement.aToBPositiveSampleCount, Is.Zero);
            Assert.That(result.selected.validation.parent.measurement.bToAPositiveSampleCount, Is.Zero);
            Assert.That(moving.Pose.PositionMeters.X, Is.EqualTo(poseBefore.PositionMeters.X).Within(.0001f));
            Assert.That(moving.Pose.PositionMeters.Y, Is.EqualTo(poseBefore.PositionMeters.Y).Within(.0001f));
            Assert.That(moving.ComputeContentHash(), Is.EqualTo(contentBefore));
            Assert.That(moving.MeshRevision, Is.EqualTo(meshRevisionBefore));
            Assert.That(moving.PublishedMeshHash, Is.EqualTo(meshHashBefore));
            Assert.That(result.counters.candidateOrientations, Is.EqualTo(1));
            Assert.That(result.counters.fullOverlapValidationCandidates, Is.LessThanOrEqualTo(8));
            Assert.That(result.counters.candidateTranslations, Is.LessThanOrEqualTo(81 + 8 * 121));
            Assert.That(result.counters.candidateTranslations, Is.GreaterThan(81));
            foreach (U4E2PoseCandidate candidate in result.refinementSeeds)
                AssertWithinTangentialBounds(candidate);
            foreach (U4E2PoseCandidate candidate in result.validatedFinalists)
                AssertWithinTangentialBounds(candidate);
        }

        [Test]
        public void InterlockSearch_RotationResolvesTiltThatTranslationCannotBroaden()
        {
            MatterDomainPose tilted = Pose(0f, .10f, 0f, RotationAroundX(10f));
            U4E2PoseSearchContext context = CreateInfinitePlaneContext(
                "u4e2-rotation", tilted, MakeFlatPatchProbes(2f, 14));
            U4E2PoseSearchResult translation = U4E2LocalPoseSearch.SearchTranslation(context);
            bool translationMeetsBroadFixtureCriterion = translation.accepted && translation.selected != null &&
                translation.selected.directionalPatch.contactPatchAreaRatio >= .80f;
            Assert.That(translationMeetsBroadFixtureCriterion, Is.False,
                "Translation must not meet the fixture's broad-contact criterion. " + Describe(translation));

            U4E2PoseSearchResult interlock = U4E2LocalPoseSearch.SearchInterlock(context, translation);

            Assert.That(interlock.accepted, Is.True, Describe(interlock));
            Assert.That(interlock.counters.candidateOrientations, Is.EqualTo(75));
            Assert.That(interlock.counters.candidateTranslations, Is.EqualTo(75 * translation.refinementSeeds.Length));
            Assert.That(interlock.selected.directionalPatch.contactPatchAreaRatio,
                Is.GreaterThanOrEqualTo(.80f));
            Assert.That(System.Math.Abs(interlock.selected.tiltUDegrees) +
                System.Math.Abs(interlock.selected.tiltVDegrees), Is.GreaterThanOrEqualTo(10f));
            Assert.That(interlock.selected.directionalPatch.minimumDirectionalGapMeters,
                Is.GreaterThanOrEqualTo(-U4E2LocalPoseSearch.MaximumPenetrationMeters));
            Assert.That(interlock.selected.validation.parent.measurement.HasZeroSampledOverlap, Is.True);
        }

        [Test]
        public void SearchTranslation_IsDeterministicAndDoesNotMutateOriginalPose()
        {
            U4E2PoseSearchContext context = CreateFinitePatchContext(
                "u4e2-repeat", Pose(.45f, .08f, 0f), MakeFlatPatchProbes(1f, 10), .45f);
            U4E2PoseSearchResult first = U4E2LocalPoseSearch.SearchTranslation(context);
            U4E2PoseSearchResult second = U4E2LocalPoseSearch.SearchTranslation(context);
            if (!first.accepted) throw new System.Exception(Describe(first));
            if (!second.accepted) throw new System.Exception(Describe(second));

            Assert.That(first.accepted, Is.EqualTo(second.accepted));
            Assert.That(first.selected, Is.Not.Null, Describe(first));
            Assert.That(second.selected, Is.Not.Null, Describe(second));
            Assert.That(first.selected.offsetUMeters, Is.EqualTo(second.selected.offsetUMeters));
            Assert.That(first.selected.offsetVMeters, Is.EqualTo(second.selected.offsetVMeters));
            Assert.That(first.selected.offsetNMeters, Is.EqualTo(second.selected.offsetNMeters));
            Assert.That(first.selected.directionalPatch.acceptedPatchAreaSquareMeters,
                Is.EqualTo(second.selected.directionalPatch.acceptedPatchAreaSquareMeters));
            Assert.That(context.MovingDomain.Pose.PositionMeters.X, Is.EqualTo(.45f).Within(.0001f));
        }

        [Test]
        public void ContextValidation_RejectsTerrainOverlap()
        {
            U4E2PoseSearchContext context = CreatePhysicalContactContext("u4e2-terrain-overlap", true, null);
            U4E2PoseCandidate candidate = U4E2LocalPoseSearch.ValidateFixedPose(context, context.MovingDomain.Pose);

            Assert.That(candidate.accepted, Is.False);
            Assert.That(candidate.validation.parent.measurement.HasZeroSampledOverlap, Is.True);
            Assert.That(candidate.validation.terrain.measurement.HasZeroSampledOverlap, Is.False);
            Assert.That(candidate.validation.rejectionReason, Does.Contain("Terrain pair"));
        }

        [Test]
        public void ContextValidation_RejectsFrozenNonParentSiblingOverlap()
        {
            U4E2PoseAnchor sibling = U4E2PoseAnchor.ForGrid("u4e2-sibling",
                new BoxGrid(.25f, new MatterFloat3(.5f, .5f, .5f)), FixtureBounds,
                Pose(0f, .25f, 0f), MakeFlatPatchProbesAtY(.5f, 2, -.5f));
            U4E2PoseSearchContext context = CreatePhysicalContactContext("u4e2-sibling-overlap", false,
                new[] { sibling });
            U4E2PoseCandidate candidate = U4E2LocalPoseSearch.ValidateFixedPose(context, context.MovingDomain.Pose);

            Assert.That(candidate.accepted, Is.False);
            Assert.That(candidate.validation.parent.measurement.HasZeroSampledOverlap, Is.True);
            Assert.That(candidate.validation.terrain.measurement.HasZeroSampledOverlap, Is.True);
            Assert.That(candidate.validation.siblings, Has.Length.EqualTo(1));
            Assert.That(candidate.validation.siblings[0].measurement.HasZeroSampledOverlap, Is.False);
            Assert.That(candidate.validation.rejectionReason, Does.Contain("Frozen sibling pair"));
        }

        private static U4E2PoseSearchContext CreatePhysicalContactContext(string id,
            bool terrainOverlaps, U4E2PoseAnchor[] siblings)
        {
            U4E2PoseAnchor parent = U4E2PoseAnchor.ForGrid(id + "-parent", new PlaneGrid(.25f, 0f),
                FixtureBounds, MatterDomainPose.Identity, MakeFlatPatchProbes(.5f, 2));
            U4E2PoseAnchor terrain = terrainOverlaps
                ? U4E2PoseAnchor.ForGrid(id + "-terrain", new BoxGrid(.25f,
                    new MatterFloat3(.5f, .5f, .5f)), FixtureBounds, Pose(0f, .25f, 0f),
                    MakeFlatPatchProbesAtY(.5f, 2, -.5f))
                : null;
            return CreateContext(id, Pose(0f, .25f, 0f), MakeFlatPatchProbesAtY(.5f, 2, -.25f),
                parent, new MatterFloat3(0f, -1f, 0f), true, terrain, siblings, .25f);
        }

        private static U4E2PoseSearchContext CreateFinitePatchContext(string id,
            MatterDomainPose movingPose, U4ESurfaceProbeSet movingProbes, float halfExtent,
            bool solidMoving = false)
        {
            var parentGrid = new FinitePlatformGrid(.25f, halfExtent, halfExtent);
            U4ESurfaceProbeSet parentProbes = MakeFlatPatchProbes(halfExtent * 2f, 2);
            U4E2PoseAnchor parent = U4E2PoseAnchor.ForGrid(id + "-parent", parentGrid,
                FixtureBounds, MatterDomainPose.Identity, parentProbes);
            return CreateContext(id, movingPose, movingProbes, parent, new MatterFloat3(0f, -1f, 0f),
                solidMoving, null, null);
        }

        private static U4E2PoseSearchContext CreateInfinitePlaneContext(string id,
            MatterDomainPose movingPose, U4ESurfaceProbeSet movingProbes)
        {
            var parentGrid = new PlaneGrid(.25f, 0f);
            U4ESurfaceProbeSet parentProbes = MakeFlatPatchProbes(2f, 2);
            U4E2PoseAnchor parent = U4E2PoseAnchor.ForGrid(id + "-parent", parentGrid,
                FixtureBounds, MatterDomainPose.Identity, parentProbes);
            return CreateContext(id, movingPose, movingProbes, parent, new MatterFloat3(0f, -1f, 0f),
                false, null, null);
        }

        private static U4E2PoseSearchContext CreateContext(string id, MatterDomainPose movingPose,
            U4ESurfaceProbeSet movingProbes, U4E2PoseAnchor parent, MatterFloat3 direction,
            bool solidMoving, U4E2PoseAnchor terrainOverride, U4E2PoseAnchor[] siblings,
            float movingHalfExtent = .5f)
        {
            MatterDomain moving = MatterDomain.Bake(id + "-moving", FixtureBounds, .25f,
                solidMoving ? (IMatterReadOnlyGrid)new BoxGrid(.25f, new MatterFloat3(movingHalfExtent, movingHalfExtent, movingHalfExtent)) : new AllAirGrid(.25f),
                movingPose);
            U4E2PoseAnchor terrain = terrainOverride ?? U4E2PoseAnchor.ForGrid(id + "-terrain",
                new AllAirGrid(.25f), FixtureBounds, MatterDomainPose.Identity, MakeFlatPatchProbes(.5f, 2));
            return new U4E2PoseSearchContext(moving, movingProbes, parent, direction, terrain, siblings);
        }

        private static U4ESurfaceProbeSet MakeFlatPatchProbes(float width, int subdivisions)
            => MakeFlatPatchProbesAtY(width, subdivisions, 0f);

        private static U4ESurfaceProbeSet MakeFlatPatchProbesAtY(float width, int subdivisions, float y)
        {
            var positions = new List<MatterFloat3>();
            var normals = new List<MatterFloat3>();
            var indices = new List<int>();
            float half = width * .5f;
            for (int xIndex = 0; xIndex < subdivisions; xIndex++)
            for (int zIndex = 0; zIndex < subdivisions; zIndex++)
            {
                float x0 = -half + width * xIndex / subdivisions;
                float x1 = -half + width * (xIndex + 1) / subdivisions;
                float z0 = -half + width * zIndex / subdivisions;
                float z1 = -half + width * (zIndex + 1) / subdivisions;
                AddTriangle(new MatterFloat3(x0, y, z0), new MatterFloat3(x1, y, z0),
                    new MatterFloat3(x0, y, z1));
                AddTriangle(new MatterFloat3(x1, y, z0), new MatterFloat3(x1, y, z1),
                    new MatterFloat3(x0, y, z1));
            }
            return new U4ESurfaceProbeSet(positions.ToArray(), normals.ToArray(), indices.ToArray());

            void AddTriangle(MatterFloat3 a, MatterFloat3 b, MatterFloat3 c)
            {
                MatterFloat3 normal = new MatterFloat3(0f, -1f, 0f);
                int start = positions.Count;
                positions.Add(a); positions.Add(b); positions.Add(c);
                normals.Add(normal); normals.Add(normal); normals.Add(normal);
                indices.Add(start); indices.Add(start + 1); indices.Add(start + 2);
            }
        }

        private static void AssertFrame(MatterFloat3 normal)
        {
            U4E2ContactFrame first = new U4E2ContactFrame(normal);
            U4E2ContactFrame second = new U4E2ContactFrame(normal);
            Assert.That(Dot(first.N, first.U), Is.EqualTo(0f).Within(.00001f));
            Assert.That(Dot(first.N, first.V), Is.EqualTo(0f).Within(.00001f));
            Assert.That(Dot(first.U, first.V), Is.EqualTo(0f).Within(.00001f));
            Assert.That(Dot(first.U, first.U), Is.EqualTo(1f).Within(.00001f));
            Assert.That(first.U.X, Is.EqualTo(second.U.X));
            Assert.That(first.U.Y, Is.EqualTo(second.U.Y));
            Assert.That(first.U.Z, Is.EqualTo(second.U.Z));
        }

        private static void AssertWithinTangentialBounds(U4E2PoseCandidate candidate)
        {
            Assert.That(System.Math.Abs(candidate.offsetUMeters),
                Is.LessThanOrEqualTo(U4E2LocalPoseSearch.TangentialBoundMeters));
            Assert.That(System.Math.Abs(candidate.offsetVMeters),
                Is.LessThanOrEqualTo(U4E2LocalPoseSearch.TangentialBoundMeters));
        }

        private static float Dot(MatterFloat3 a, MatterFloat3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;

        private static string Describe(U4E2PoseSearchResult result)
        {
            var rows = new System.Text.StringBuilder("orientations=").Append(result.counters.candidateOrientations)
                .Append(" translations=").Append(result.counters.candidateTranslations)
                .Append(" patches=").Append(result.counters.directionalPatchEvaluations)
                .Append(" finalists=").Append(result.validatedFinalists == null ? -1 : result.validatedFinalists.Length)
                .Append("; ").Append(result.rejectionReason ?? string.Empty);
            if (result.validatedFinalists != null)
                for (int i = 0; i < result.validatedFinalists.Length; i++)
                {
                    U4E2PoseCandidate c = result.validatedFinalists[i];
                    if (c == null) continue;
                    U4EDirectionalContactPatchMeasurement p = c.directionalPatch;
                    rows.Append(" | u=").Append(c.offsetUMeters).Append(" v=").Append(c.offsetVMeters)
                        .Append(" n=").Append(c.offsetNMeters).Append(" area=").Append(p.acceptedPatchAreaSquareMeters)
                        .Append(" ratio=").Append(p.contactPatchAreaRatio).Append(" diag=").Append(p.contactPatchDiagonalMeters)
                        .Append(" minGap=").Append(p.minimumDirectionalGapMeters).Append(" rejected=")
                        .Append(c.rejectionReason);
                    if (c.validation != null)
                    {
                        rows.Append(" parentOverlap=").Append(c.validation.parent.measurement.aToBPositiveSampleCount)
                            .Append('/').Append(c.validation.parent.measurement.bToAPositiveSampleCount)
                            .Append(" terrainOverlap=").Append(c.validation.terrain.measurement.aToBPositiveSampleCount)
                            .Append('/').Append(c.validation.terrain.measurement.bToAPositiveSampleCount);
                    }
                }
            return rows.ToString();
        }

        private static MatterDomainPose Pose(float x, float y, float z, MatterDomainPose rotation = default)
            => new MatterDomainPose(new MatterFloat3(x, y, z), rotation.RotationX, rotation.RotationY,
                rotation.RotationZ, rotation.RotationW == 0f ? 1f : rotation.RotationW);

        private static MatterDomainPose RotationAroundX(float degrees)
        {
            double half = degrees * System.Math.PI / 360d;
            return new MatterDomainPose(default, (float)System.Math.Sin(half), 0f, 0f, (float)System.Math.Cos(half));
        }

        private sealed class AllAirGrid : IMatterReadOnlyGrid
        {
            public float SampleSpacingMeters { get; }
            public AllAirGrid(float spacing) => SampleSpacingMeters = spacing;
            public MatterSample ReadSample(MatterSampleAddress address) => MatterSample.Air(-1f);
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
                float x = System.Math.Abs(address.X * SampleSpacingMeters);
                float y = System.Math.Abs(address.Y * SampleSpacingMeters);
                float z = System.Math.Abs(address.Z * SampleSpacingMeters);
                float density = System.Math.Min(_halfExtents.X - x,
                    System.Math.Min(_halfExtents.Y - y, _halfExtents.Z - z));
                return density > 0f ? new MatterSample(density, MatterMaterialId.Rock) : MatterSample.Air(density);
            }
        }

        private sealed class PlaneGrid : IMatterReadOnlyGrid
        {
            private readonly float _surfaceY;
            public float SampleSpacingMeters { get; }
            public PlaneGrid(float spacing, float surfaceY) { SampleSpacingMeters = spacing; _surfaceY = surfaceY; }
            public MatterSample ReadSample(MatterSampleAddress address)
            {
                float density = _surfaceY - address.Y * SampleSpacingMeters;
                return density > 0f ? new MatterSample(density, MatterMaterialId.Rock) : MatterSample.Air(density);
            }
        }

        private sealed class FinitePlatformGrid : IMatterReadOnlyGrid
        {
            private readonly float _halfX;
            private readonly float _halfZ;
            public float SampleSpacingMeters { get; }
            public FinitePlatformGrid(float spacing, float halfX, float halfZ)
            {
                SampleSpacingMeters = spacing;
                _halfX = halfX;
                _halfZ = halfZ;
            }
            public MatterSample ReadSample(MatterSampleAddress address)
            {
                float x = address.X * SampleSpacingMeters;
                float y = address.Y * SampleSpacingMeters;
                float z = address.Z * SampleSpacingMeters;
                float density = System.Math.Min(-y, System.Math.Min(_halfX - System.Math.Abs(x), _halfZ - System.Math.Abs(z)));
                return density > 0f ? new MatterSample(density, MatterMaterialId.Rock) : MatterSample.Air(density);
            }
        }
    }
}
