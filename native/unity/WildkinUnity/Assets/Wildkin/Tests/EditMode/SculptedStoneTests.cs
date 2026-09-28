using System;
using System.Collections.Generic;
using NUnit.Framework;
using Wildkin.Matter;

namespace Wildkin.Tests.EditMode
{
    public sealed class SculptedStoneTests
    {
        [TestCase(SourceRockArchetype.CapstoneSlab, 4101)]
        [TestCase(SourceRockArchetype.ChunkyBoulder, 4102)]
        [TestCase(SourceRockArchetype.ButtressWedge, 4103)]
        public void Archetype_IsOneFiniteOutwardWoundManifoldWithGroundedBase(SourceRockArchetype archetype, int seed)
        {
            SculptedStoneMesh mesh = SculptedStoneGenerator.Generate(archetype, seed);
            Assert.That(mesh.Validate(out string issue), Is.True, issue);
            Assert.That(mesh.VertexCount, Is.InRange(80, 200));
            Assert.That(mesh.TriangleCount, Is.InRange(150, 396));
            Assert.That(mesh.SignedVolume, Is.InRange(1d, 40d));
            Assert.That(mesh.BoundsMin.Y, Is.Zero);
            Assert.That(mesh.BoundsMax.Y, Is.InRange(1f, 4.5f));
            Assert.That(mesh.BoundsMax.X - mesh.BoundsMin.X, Is.LessThan(5f));
            Assert.That(mesh.BoundsMax.Z - mesh.BoundsMin.Z, Is.LessThan(4f));
            int grounded = 0;
            for (int i = 0; i < mesh.VertexCount; i++)
            {
                MatterFloat3 p = mesh.GetVertex(i);
                Assert.That(float.IsNaN(p.X) || float.IsNaN(p.Y) || float.IsNaN(p.Z), Is.False);
                Assert.That(float.IsInfinity(p.X) || float.IsInfinity(p.Y) || float.IsInfinity(p.Z), Is.False);
                if (p.Y == 0) grounded++;
            }
            Assert.That(grounded, Is.GreaterThanOrEqualTo(9), "Broad contact patch, rather than a point support.");
        }

        [TestCase(SourceRockArchetype.CapstoneSlab, 4101)]
        [TestCase(SourceRockArchetype.ChunkyBoulder, 4102)]
        [TestCase(SourceRockArchetype.ButtressWedge, 4103)]
        public void SameRecipe_ReproducesEveryVertexIndexAndHash(SourceRockArchetype archetype, int seed)
        {
            SculptedStoneMesh a = SculptedStoneGenerator.Generate(archetype, seed);
            SculptedStoneMesh b = SculptedStoneGenerator.Build(SculptedStoneGenerator.CreateRecipe(archetype, seed));
            Assert.That(a.GeometryHash, Is.EqualTo(b.GeometryHash));
            for (int i = 0; i < a.VertexCount; i++) Assert.That(a.GetVertex(i), Is.EqualTo(b.GetVertex(i)));
            for (int i = 0; i < a.TriangleCount * 3; i++) Assert.That(a.GetIndex(i), Is.EqualTo(b.GetIndex(i)));
        }

        [TestCase(SourceRockArchetype.CapstoneSlab, 4101, "881447DF8B9C5082")]
        [TestCase(SourceRockArchetype.ChunkyBoulder, 4102, "EA991B6C6C2D132D")]
        [TestCase(SourceRockArchetype.ButtressWedge, 4103, "EF8ACF6528F0C296")]
        public void ReviewedSource_HasPinnedGeometryHash(SourceRockArchetype archetype, int seed, string expected)
            => Assert.That(SculptedStoneGenerator.Generate(archetype, seed).GeometryHash.ToString("X16"), Is.EqualTo(expected));

        [TestCase(SourceRockArchetype.CapstoneSlab, 4101)]
        [TestCase(SourceRockArchetype.ChunkyBoulder, 4102)]
        [TestCase(SourceRockArchetype.ButtressWedge, 4103)]
        public void AllTriangles_FaceAwayFromAnInteriorPoint(SourceRockArchetype archetype, int seed)
        {
            SculptedStoneMesh mesh = SculptedStoneGenerator.Generate(archetype, seed);
            double cx = 0, cy = 0, cz = 0;
            for (int i = 0; i < mesh.VertexCount; i++)
            { MatterFloat3 p = mesh.GetVertex(i); cx += p.X; cy += p.Y; cz += p.Z; }
            cx /= mesh.VertexCount; cy /= mesh.VertexCount; cz /= mesh.VertexCount;
            for (int i = 0; i < mesh.TriangleCount; i++)
            {
                MatterFloat3 a = mesh.GetVertex(mesh.GetIndex(i * 3));
                MatterFloat3 b = mesh.GetVertex(mesh.GetIndex(i * 3 + 1));
                MatterFloat3 c = mesh.GetVertex(mesh.GetIndex(i * 3 + 2));
                double nx = (b.Y - a.Y) * (c.Z - a.Z) - (b.Z - a.Z) * (c.Y - a.Y);
                double ny = (b.Z - a.Z) * (c.X - a.X) - (b.X - a.X) * (c.Z - a.Z);
                double nz = (b.X - a.X) * (c.Y - a.Y) - (b.Y - a.Y) * (c.X - a.X);
                Assert.That(nx * (a.X - cx) + ny * (a.Y - cy) + nz * (a.Z - cz), Is.GreaterThan(1e-7d));
            }
        }

        [TestCase(SourceRockArchetype.CapstoneSlab)]
        [TestCase(SourceRockArchetype.ChunkyBoulder)]
        [TestCase(SourceRockArchetype.ButtressWedge)]
        public void SeedVariation_ChangesMacroShapeAndRetainsOneShell(SourceRockArchetype archetype)
        {
            var hashes = new HashSet<ulong>();
            foreach (int seed in new[] { int.MinValue, -9, 0, 1, 12, 4101, 4102, 4103, int.MaxValue })
            {
                SculptedStoneMesh mesh = SculptedStoneGenerator.Generate(archetype, seed);
                Assert.That(mesh.Validate(out string issue), Is.True, issue);
                Assert.That(hashes.Add(mesh.GeometryHash), Is.True);
            }
        }

        [Test]
        public void InvalidRecipe_RejectsNonfiniteAndOutOfEnvelopeParameters()
        {
            SculptedStoneRecipe recipe = SculptedStoneGenerator.CreateRecipe(SourceRockArchetype.ChunkyBoulder, 1);
            recipe.radiusX = float.NaN;
            Assert.Throws<ArgumentException>(() => SculptedStoneGenerator.Build(recipe));
            recipe.radiusX = 1f; recipe.lean = float.PositiveInfinity;
            Assert.Throws<ArgumentException>(() => SculptedStoneGenerator.Build(recipe));
            Assert.Throws<ArgumentOutOfRangeException>(() => SculptedStoneGenerator.CreateRecipe((SourceRockArchetype)99, 1));
            recipe.lean = .1f; recipe.archetype = (SourceRockArchetype)99;
            Assert.Throws<ArgumentOutOfRangeException>(() => SculptedStoneGenerator.Build(recipe));
        }
    }
}
