using System;
using System.Collections.Generic;
using NUnit.Framework;
using Wildkin.Matter;

namespace Wildkin.Tests.EditMode
{
    public sealed class ProceduralSourceRockTests
    {
        private static readonly SourceRockArchetype[] Archetypes =
        {
            SourceRockArchetype.CapstoneSlab,
            SourceRockArchetype.ChunkyBoulder,
            SourceRockArchetype.ButtressWedge
        };

        [Test]
        public void PlaneSet_TriplePlaneIntersectionsAreFiniteAndRejectParallelTriples()
        {
            var x = new SourceRockPlane(new MatterFloat3(1f, 0f, 0f), 1f);
            var y = new SourceRockPlane(new MatterFloat3(0f, 1f, 0f), 2f);
            var z = new SourceRockPlane(new MatterFloat3(0f, 0f, 1f), 3f);
            Assert.That(SourceRockRecipe.TryIntersect(x, y, z, out MatterFloat3 point), Is.True);
            Assert.That(point.X, Is.EqualTo(1f).Within(1e-6f));
            Assert.That(point.Y, Is.EqualTo(2f).Within(1e-6f));
            Assert.That(point.Z, Is.EqualTo(3f).Within(1e-6f));

            var parallelA = new SourceRockPlane(new MatterFloat3(1f, 0f, 0f), 0f);
            var parallelB = new SourceRockPlane(new MatterFloat3(2f, 0f, 0f), 1f);
            Assert.That(SourceRockRecipe.TryIntersect(parallelA, parallelB, z, out _), Is.False);
        }

        [Test]
        public void ThreeSourceArchetypes_AreClosedBoundedFacetedAndOutwardWound()
        {
            foreach (SourceRockArchetype archetype in Archetypes)
            {
                SourceRockMesh mesh = ProceduralSourceRockGenerator.Generate(archetype, FixedSeed(archetype));
                Assert.That(mesh.ComponentCount, Is.EqualTo(3), archetype.ToString());
                Assert.That(mesh.FaceCount, Is.InRange(24, 64), archetype.ToString());
                Assert.That(mesh.VertexCount, Is.InRange(24, 96), archetype.ToString());
                Assert.That(mesh.TriangleCount, Is.GreaterThan(mesh.FaceCount), archetype.ToString());
                Assert.That(mesh.IsClosedManifold(out string issue), Is.True, issue);
                Assert.That(mesh.BoundsMax.X - mesh.BoundsMin.X, Is.LessThanOrEqualTo(5f));
                Assert.That(mesh.BoundsMax.Y - mesh.BoundsMin.Y, Is.LessThanOrEqualTo(5f));
                Assert.That(mesh.BoundsMax.Z - mesh.BoundsMin.Z, Is.LessThanOrEqualTo(5f));

                for (int i = 0; i < mesh.VertexCount; i++)
                {
                    MatterFloat3 vertex = mesh.GetVertex(i);
                    AssertFinite(vertex.X); AssertFinite(vertex.Y); AssertFinite(vertex.Z);
                    Assert.That(mesh.Recipe.Contains(vertex, 2e-5d), Is.True,
                        archetype + " retained vertex is outside every recipe component.");
                }

                for (int faceIndex = 0; faceIndex < mesh.FaceCount; faceIndex++)
                {
                    SourceRockFace face = mesh.GetFace(faceIndex);
                    Assert.That(face.VertexIndices.Length, Is.GreaterThanOrEqualTo(3));
                    var unique = new HashSet<int>(face.VertexIndices);
                    Assert.That(unique.Count, Is.EqualTo(face.VertexIndices.Length));
                    for (int triangle = 0; triangle < mesh.TriangleCount; triangle++)
                    {
                        MatterFloat3 normal = mesh.GetTriangleNormal(triangle);
                        AssertFinite(normal.X); AssertFinite(normal.Y); AssertFinite(normal.Z);
                    }
                    for (int i = 1; i < face.VertexIndices.Length - 1; i++)
                    {
                        MatterFloat3 normal = FaceNormal(mesh.GetVertex(face.VertexIndices[0]),
                            mesh.GetVertex(face.VertexIndices[i]), mesh.GetVertex(face.VertexIndices[i + 1]));
                        double dot = (double)normal.X * face.Normal.X + (double)normal.Y * face.Normal.Y + (double)normal.Z * face.Normal.Z;
                        Assert.That(dot, Is.GreaterThan(0.99d), archetype + " face loop does not wind outward.");
                    }
                }

                for (int triangle = 0; triangle < mesh.TriangleCount; triangle++)
                {
                    MatterFloat3 normal = mesh.GetTriangleNormal(triangle);
                    Assert.That(LengthSquared(normal), Is.GreaterThan(0.99d));
                }
            }
        }

        [Test]
        public void FixedSourceRecipes_ReproduceStableHashesAndDistinctShapes()
        {
            var hashes = new HashSet<ulong>();
            foreach (SourceRockArchetype archetype in Archetypes)
            {
                int seed = FixedSeed(archetype);
                SourceRockMesh first = ProceduralSourceRockGenerator.Generate(archetype, seed);
                SourceRockMesh repeated = ProceduralSourceRockGenerator.Generate(archetype, seed);
                Assert.That(first.DeterministicHash, Is.EqualTo(repeated.DeterministicHash), archetype.ToString());
                Assert.That(first.VertexCount, Is.EqualTo(repeated.VertexCount));
                Assert.That(first.TriangleCount, Is.EqualTo(repeated.TriangleCount));
                Assert.That(hashes.Add(first.DeterministicHash), Is.True, archetype + " should have a distinct silhouette recipe.");
            }
        }

        private static int FixedSeed(SourceRockArchetype archetype)
            => archetype == SourceRockArchetype.CapstoneSlab ? 4101 :
               archetype == SourceRockArchetype.ChunkyBoulder ? 4102 : 4103;

        private static MatterFloat3 FaceNormal(MatterFloat3 a, MatterFloat3 b, MatterFloat3 c)
        {
            float abx = b.X - a.X, aby = b.Y - a.Y, abz = b.Z - a.Z;
            float acx = c.X - a.X, acy = c.Y - a.Y, acz = c.Z - a.Z;
            float x = aby * acz - abz * acy, y = abz * acx - abx * acz, z = abx * acy - aby * acx;
            double length = Math.Sqrt((double)x * x + (double)y * y + (double)z * z);
            return length > 1e-12d ? new MatterFloat3((float)(x / length), (float)(y / length), (float)(z / length)) : default;
        }

        private static double LengthSquared(MatterFloat3 value)
            => (double)value.X * value.X + (double)value.Y * value.Y + (double)value.Z * value.Z;

        private static void AssertFinite(float value)
            => Assert.That(float.IsNaN(value) || float.IsInfinity(value), Is.False);
    }
}
