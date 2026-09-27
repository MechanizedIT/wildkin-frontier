using System;
using System.Collections.Generic;
using NUnit.Framework;
using Wildkin.Matter;

namespace Wildkin.Tests.EditMode
{
    public sealed class MatterMesherTests
    {
        private static readonly IMatterMesher SurfaceNets = new MatterSurfaceNetsMesher();
        private static readonly IMatterMesher DualContouring = new MatterDualContouringMesher();

        [Test]
        public void MeshingRegion_IncludesTheRequiredSharedCornerWindowAndOwnedEdgeHalo()
        {
            MatterWorld world = MatterFixtureWorldFactory.Create(MatterFixtureId.SmoothOrganic, 0.5f);
            MatterMeshingRegion lower = MatterMeshingRegion.Capture(world, new MatterBrickAddress(0, 0, 0));
            MatterMeshingRegion upper = MatterMeshingRegion.Capture(world, new MatterBrickAddress(1, 0, 0));

            Assert.That(lower.Samples.Dimensions.X, Is.EqualTo(18));
            Assert.That(lower.Samples.Dimensions.Y, Is.EqualTo(18));
            Assert.That(lower.Samples.Dimensions.Z, Is.EqualTo(18));
            Assert.That(lower.Samples.Bounds.Contains(new MatterSampleAddress(16, 8, 8)), Is.True,
                "Each 16-cell region must include the +1 global corner plane (x=16). ");
            Assert.That(lower.Samples.SampleCount, Is.EqualTo(18 * 18 * 18),
                "The required 17^3 corner volume is retained, with one extra negative halo plane for dual-edge ownership.");

            MatterSample shared = world.ReadSample(new MatterSampleAddress(16, 8, 8));
            Assert.That(lower.GetSample(new MatterInt3(16, 8, 8)), Is.EqualTo(shared));
            Assert.That(upper.GetSample(new MatterInt3(16, 8, 8)), Is.EqualTo(shared));
        }

        [TestCase(MatterFixtureId.SmoothOrganic)]
        [TestCase(MatterFixtureId.LayeredRock)]
        [TestCase(MatterFixtureId.CliffCave)]
        [TestCase(MatterFixtureId.MaterialBoundary)]
        [TestCase(MatterFixtureId.MinedCavity)]
        [TestCase(MatterFixtureId.DetachedIrregular)]
        public void BothMeshers_ProduceDeterministicFiniteTopologyForEveryFrozenField(MatterFixtureId fixture)
        {
            MatterWorld world = MatterFixtureWorldFactory.Create(fixture, 0.5f);
            MatterMeshingRegion region = MatterMeshingRegion.Capture(world, new MatterBrickAddress(0, 0, 0));

            MatterMeshData surfaceFirst = SurfaceNets.Generate(region);
            MatterMeshData surfaceSecond = SurfaceNets.Generate(region);
            MatterMeshData dualFirst = DualContouring.Generate(region);
            MatterMeshData dualSecond = DualContouring.Generate(region);

            AssertMeshValid(surfaceFirst);
            AssertMeshValid(dualFirst);
            Assert.That(surfaceFirst.DeterministicHash, Is.EqualTo(surfaceSecond.DeterministicHash), fixture.ToString());
            Assert.That(dualFirst.DeterministicHash, Is.EqualTo(dualSecond.DeterministicHash), fixture.ToString());
            Assert.That(surfaceFirst.TriangleCount, Is.GreaterThan(0), fixture.ToString());
            Assert.That(dualFirst.TriangleCount, Is.GreaterThan(0), fixture.ToString());
            Assert.That(HasPositionDifference(surfaceFirst, dualFirst), Is.True,
                $"{fixture} should exercise the actual QEF placement path rather than a Surface Nets centroid alias.");
        }

        [TestCase(MatterFixtureId.SmoothOrganic, 0.5f)]
        [TestCase(MatterFixtureId.SmoothOrganic, 0.25f)]
        [TestCase(MatterFixtureId.LayeredRock, 0.5f)]
        [TestCase(MatterFixtureId.LayeredRock, 0.25f)]
        [TestCase(MatterFixtureId.CliffCave, 0.5f)]
        [TestCase(MatterFixtureId.CliffCave, 0.25f)]
        [TestCase(MatterFixtureId.MaterialBoundary, 0.5f)]
        [TestCase(MatterFixtureId.MaterialBoundary, 0.25f)]
        [TestCase(MatterFixtureId.MinedCavity, 0.5f)]
        [TestCase(MatterFixtureId.MinedCavity, 0.25f)]
        [TestCase(MatterFixtureId.DetachedIrregular, 0.5f)]
        [TestCase(MatterFixtureId.DetachedIrregular, 0.25f)]
        public void EveryDatasetAndUniformResolution_ProducesMatchedValidMeshes(MatterFixtureId fixture, float spacing)
        {
            MatterWorld world = MatterFixtureWorldFactory.Create(fixture, spacing);
            MatterMeshingRegion region = MatterMeshingRegion.Capture(world, new MatterBrickAddress(0, 0, 0));
            AssertMeshValid(SurfaceNets.Generate(region));
            AssertMeshValid(DualContouring.Generate(region));
        }

        [Test]
        public void DualContouring_UsesARealPlanarQefAndDocumentsTheRankDeficientFallback()
        {
            var world = new MatterWorld(991, 0.5f, new ObliquePlaneSource());
            MatterMeshingRegion region = MatterMeshingRegion.Capture(world, new MatterBrickAddress(0, 0, 0));
            MatterMeshData dual = DualContouring.Generate(region);

            AssertMeshValid(dual);
            Assert.That(dual.QefFallbackCount, Is.GreaterThan(0),
                "Planar rank-deficient cells must exercise the Hermite-centroid numerical fallback.");
            Assert.That(dual.Vertices.Length, Is.GreaterThan(0));
            for (int i = 0; i < dual.Vertices.Length; i++)
            {
                MatterMeshVertex vertex = dual.Vertices[i];
                double planeResidual = Math.Abs(3d - (0.37d * vertex.PositionMeters.X +
                    0.43d * vertex.PositionMeters.Y + 0.26d * vertex.PositionMeters.Z));
                Assert.That(planeResidual, Is.LessThan(0.002d), $"Vertex {i} should remain on the oblique plane.");
                double planeNormalLength = Math.Sqrt(0.37d * 0.37d + 0.43d * 0.43d + 0.26d * 0.26d);
                double normalDot = (vertex.Normal.X * 0.37d + vertex.Normal.Y * 0.43d + vertex.Normal.Z * 0.26d) /
                    planeNormalLength;
                Assert.That(normalDot, Is.GreaterThan(0.98d), $"Vertex {i} should have a finite-difference Hermite normal.");
                Assert.That(vertex.PositionMeters.X, Is.InRange(-0.5f, 8.0f));
                Assert.That(vertex.PositionMeters.Y, Is.InRange(-0.5f, 8.0f));
                Assert.That(vertex.PositionMeters.Z, Is.InRange(-0.5f, 8.0f));
            }
        }

        [Test]
        public void AdjacentBrickMeshes_OwnEachCrossingEdgeOnceWithoutDuplicateOrMissingQuads()
        {
            MatterWorld world = MatterFixtureWorldFactory.Create(MatterFixtureId.SmoothOrganic, 0.5f);
            AssertMesherSeams(world, SurfaceNets);
            AssertMesherSeams(world, DualContouring);
        }

        [Test]
        public void MaterialBoundary_ProducesDeterministicRockAndDirtWeights()
        {
            MatterWorld world = MatterFixtureWorldFactory.Create(MatterFixtureId.MaterialBoundary, 0.5f);
            MatterMeshingRegion region = MatterMeshingRegion.Capture(world, new MatterBrickAddress(0, 0, 0));
            MatterMeshData first = DualContouring.Generate(region);
            MatterMeshData second = DualContouring.Generate(region);
            Assert.That(first.DeterministicHash, Is.EqualTo(second.DeterministicHash));

            bool hasRock = false, hasDirt = false, hasBlend = false;
            foreach (MatterMeshVertex vertex in first.Vertices)
            {
                hasRock |= vertex.RockWeight > 0;
                hasDirt |= vertex.DirtWeight > 0;
                hasBlend |= vertex.RockWeight > 0 && vertex.DirtWeight > 0;
                Assert.That(vertex.RockWeight + vertex.DirtWeight, Is.EqualTo(255));
            }
            Assert.That(hasRock, Is.True);
            Assert.That(hasDirt, Is.True);
            Assert.That(hasBlend, Is.True);
        }

        [Test]
        public void EditAndRemesh_UsesNewRevisionWithoutMutatingPreviouslyPublishedMeshData()
        {
            MatterWorld world = MatterFixtureWorldFactory.Create(MatterFixtureId.SmoothOrganic, 0.5f);
            var brick = new MatterBrickAddress(0, 0, 0);
            MatterMeshingRegion beforeRegion = MatterMeshingRegion.Capture(world, brick);
            MatterMeshData before = DualContouring.Generate(beforeRegion);
            ulong beforeHash = before.DeterministicHash;
            long beforeRevision = beforeRegion.Samples.SourceRevision;
            MatterSampleAddress edit = new MatterSampleAddress(3, 1, 1);
            Assert.That(world.ReadSample(edit).IsSolid, Is.True, "The fixture point must begin inside the solid.");
            Assert.That(world.SetSample(edit, MatterSample.Air(-1f)), Is.True);

            MatterMeshingRegion afterRegion = MatterMeshingRegion.Capture(world, brick);
            MatterMeshData after = DualContouring.Generate(afterRegion);
            Assert.That(afterRegion.Samples.SourceRevision, Is.GreaterThan(beforeRevision));
            Assert.That(after.DeterministicHash, Is.Not.EqualTo(beforeHash));
            Assert.That(before.DeterministicHash, Is.EqualTo(beforeHash), "The previous mesh remains immutable after remesh.");
        }

        private static void AssertMesherSeams(MatterWorld world, IMatterMesher mesher)
        {
            var brickCoordinates = new[]
            {
                new MatterBrickAddress(-1, -1, 0), new MatterBrickAddress(0, -1, 0),
                new MatterBrickAddress(-1, 0, 0), new MatterBrickAddress(0, 0, 0)
            };
            var allTriangles = new HashSet<string>(StringComparer.Ordinal);
            int totalTriangles = 0, totalDegenerate = 0;
            foreach (MatterBrickAddress brick in brickCoordinates)
            {
                MatterMeshingRegion region = MatterMeshingRegion.Capture(world, brick);
                MatterMeshData mesh = mesher.Generate(region);
                AssertMeshValid(mesh);
                int crossingEdges = CountOwnedCrossingEdges(region);
                Assert.That(mesh.TriangleCount + mesh.SkippedDegenerateTriangles,
                    Is.EqualTo(crossingEdges * 2), $"{mesher.Kind} did not emit both triangles for each owned crossing edge in {brick}.");
                totalTriangles += mesh.TriangleCount;
                totalDegenerate += mesh.SkippedDegenerateTriangles;
                for (int i = 0; i < mesh.Indices.Length; i += 3)
                {
                    string a = PositionKey(mesh.Vertices[mesh.Indices[i]].PositionMeters);
                    string b = PositionKey(mesh.Vertices[mesh.Indices[i + 1]].PositionMeters);
                    string c = PositionKey(mesh.Vertices[mesh.Indices[i + 2]].PositionMeters);
                    if (StringComparer.Ordinal.Compare(a, b) > 0) Swap(ref a, ref b);
                    if (StringComparer.Ordinal.Compare(b, c) > 0) Swap(ref b, ref c);
                    if (StringComparer.Ordinal.Compare(a, b) > 0) Swap(ref a, ref b);
                    Assert.That(allTriangles.Add(a + "|" + b + "|" + c), Is.True,
                        $"{mesher.Kind} emitted duplicate triangle geometry across adjacent bricks.");
                }
            }
            Assert.That(totalTriangles, Is.GreaterThan(0));
            Assert.That(totalDegenerate, Is.GreaterThanOrEqualTo(0));
        }

        private static int CountOwnedCrossingEdges(MatterMeshingRegion region)
        {
            int crossings = 0;
            MatterInt3 owner = new MatterInt3(region.Brick.X * 16, region.Brick.Y * 16, region.Brick.Z * 16);
            for (int z = 0; z < 16; z++)
            for (int y = 0; y < 16; y++)
            for (int x = 0; x < 16; x++)
            {
                MatterInt3 anchor = owner + new MatterInt3(x, y, z);
                if ((region.GetSample(anchor).Density > 0f) != (region.GetSample(anchor + new MatterInt3(1, 0, 0)).Density > 0f)) crossings++;
                if ((region.GetSample(anchor).Density > 0f) != (region.GetSample(anchor + new MatterInt3(0, 1, 0)).Density > 0f)) crossings++;
                if ((region.GetSample(anchor).Density > 0f) != (region.GetSample(anchor + new MatterInt3(0, 0, 1)).Density > 0f)) crossings++;
            }
            return crossings;
        }

        private static void AssertMeshValid(MatterMeshData mesh)
        {
            Assert.That(mesh.Indices.Length % 3, Is.Zero);
            foreach (int index in mesh.Indices) Assert.That(index, Is.InRange(0, mesh.Vertices.Length - 1));
            foreach (MatterMeshVertex vertex in mesh.Vertices)
            {
                AssertFinite(vertex.PositionMeters.X);
                AssertFinite(vertex.PositionMeters.Y);
                AssertFinite(vertex.PositionMeters.Z);
                AssertFinite(vertex.SourcePositionMeters.X);
                AssertFinite(vertex.SourcePositionMeters.Y);
                AssertFinite(vertex.SourcePositionMeters.Z);
                AssertFinite(vertex.Normal.X);
                AssertFinite(vertex.Normal.Y);
                AssertFinite(vertex.Normal.Z);
                Assert.That(vertex.Normal.X * vertex.Normal.X + vertex.Normal.Y * vertex.Normal.Y +
                    vertex.Normal.Z * vertex.Normal.Z, Is.GreaterThan(0.5f));
                Assert.That(vertex.SourcePositionMeters.X, Is.EqualTo(vertex.PositionMeters.X));
                Assert.That(vertex.SourcePositionMeters.Y, Is.EqualTo(vertex.PositionMeters.Y));
                Assert.That(vertex.SourcePositionMeters.Z, Is.EqualTo(vertex.PositionMeters.Z));
                Assert.That(vertex.RockWeight + vertex.DirtWeight, Is.EqualTo(255));
            }
        }

        private static void AssertFinite(float value)
            => Assert.That(float.IsNaN(value) || float.IsInfinity(value), Is.False);

        private static bool HasPositionDifference(MatterMeshData left, MatterMeshData right)
        {
            if (left.Vertices.Length != right.Vertices.Length) return true;
            for (int i = 0; i < left.Vertices.Length; i++)
            {
                MatterFloat3 a = left.Vertices[i].PositionMeters, b = right.Vertices[i].PositionMeters;
                float dx = a.X - b.X, dy = a.Y - b.Y, dz = a.Z - b.Z;
                if (dx * dx + dy * dy + dz * dz > 1e-8f) return true;
            }
            return false;
        }

        private static string PositionKey(MatterFloat3 p)
            => $"{Math.Round(p.X * 1000000f):F0},{Math.Round(p.Y * 1000000f):F0},{Math.Round(p.Z * 1000000f):F0}";

        private static void Swap(ref string left, ref string right)
        {
            string temp = left;
            left = right;
            right = temp;
        }

        private sealed class ObliquePlaneSource : IMatterSampleSource
        {
            public int SourceVersion => 1;
            public MatterSample Sample(MatterSampleAddress address, int worldSeed, float sampleSpacingMeters)
            {
                double x = address.X * sampleSpacingMeters;
                double y = address.Y * sampleSpacingMeters;
                double z = address.Z * sampleSpacingMeters;
                float density = (float)(3d - (0.37d * x + 0.43d * y + 0.26d * z));
                return density > 0f ? new MatterSample(density, MatterMaterialId.Rock) : MatterSample.Air(density);
            }
        }
    }
}
