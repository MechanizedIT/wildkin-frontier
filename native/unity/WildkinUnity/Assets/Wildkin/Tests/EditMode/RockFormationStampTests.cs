using System;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using Wildkin.Matter;
using Wildkin.Matter.Unity;

namespace Wildkin.Tests.EditMode
{
    public sealed class RockFormationStampTests
    {
        [Test]
        public void SameSeed_RepeatsRecipeResolvedFieldAndSurfaceNetsMesh()
        {
            const int seed = 24017;
            RockFormationStamp firstStamp = RockFormationStampGenerator.Generate(seed);
            RockFormationStamp repeatedStamp = RockFormationStampGenerator.Generate(seed);
            RockStampResolution first = firstStamp.Resolve(0.5f);
            RockStampResolution repeated = repeatedStamp.Resolve(0.5f);

            Assert.That(firstStamp.PrimitiveCount, Is.EqualTo(repeatedStamp.PrimitiveCount));
            Assert.That(firstStamp.PrimitiveDistribution, Is.EqualTo(repeatedStamp.PrimitiveDistribution));
            Assert.That(firstStamp.LayoutName, Is.EqualTo(repeatedStamp.LayoutName));
            Assert.That(first.FieldHash, Is.EqualTo(repeated.FieldHash));
            Assert.That(first.OccupiedSamples, Is.EqualTo(repeated.OccupiedSamples));
            Assert.That(first.World.EditCount, Is.EqualTo(first.OccupiedSamples));
            Assert.That(StampMeshHash(first.World), Is.EqualTo(StampMeshHash(repeated.World)));
        }

        [Test]
        public void GallerySeeds_AreMeasurablyDifferentFiniteConnectedStylizedFormations()
        {
            var hashes = new HashSet<ulong>();
            var layouts = new HashSet<string>(StringComparer.Ordinal);
            for (int seed = 1; seed <= 20; seed++)
            {
                RockFormationStamp stamp = RockFormationStampGenerator.Generate(seed, "WildkinClast-v1");
                RockStampResolution resolved = stamp.Resolve(0.5f);
                Assert.That(stamp.PrimitiveCount, Is.InRange(6, 7), $"seed {seed}");
                layouts.Add(stamp.LayoutName);
                Assert.That(resolved.OccupiedSamples, Is.GreaterThan(100), $"seed {seed}");
                Assert.That(resolved.ConnectedComponents, Is.EqualTo(1), $"seed {seed} must be one intended formation.");
                Assert.That(resolved.Bounds.MaxExclusive.X - resolved.Bounds.MinInclusive.X, Is.InRange(2, 16), $"seed {seed} width");
                Assert.That(resolved.Bounds.MaxExclusive.Y - resolved.Bounds.MinInclusive.Y, Is.InRange(2, 12), $"seed {seed} height");
                Assert.That(hashes.Add(resolved.FieldHash), Is.True, $"seed {seed} repeated a resolved field.");
                for (int sample = 0; sample < 100; sample++)
                {
                    float x = (sample % 10) * 1.6f;
                    float y = -0.5f + (sample / 10) * 0.45f;
                    float z = ((sample * 7) % 10) * 1.6f;
                    float density = stamp.Evaluate(x, y, z);
                    AssertFinite(density);
                }
            }
            Assert.That(layouts.Count, Is.EqualTo(4), "The shared profile should automatically exercise every explainable layout family.");
        }

        [Test]
        public void ResolvedWorld_UsesOrdinaryRockAndDirtMatterAndRoundTripsWithoutStampSource()
        {
            RockStampResolution resolved = RockFormationStampGenerator.Generate(832).Resolve(0.5f);
            MatterWorld world = resolved.World;
            Assert.That(world.SourceVersion, Is.EqualTo(MatterWorldFactory.ResolvedMatterSourceVersion));
            Assert.That(world.EditCount, Is.EqualTo(resolved.OccupiedSamples));
            Assert.That(world.EvaluateSourceDirect(new MatterSampleAddress(8, 2, 8)).IsSolid, Is.False,
                "The post-resolution source is air; the primitive recipe is not runtime sampling authority.");

            bool hasRock = false, hasDirt = false;
            foreach (MatterSparseEdit edit in world.GetSparseEditsSorted())
            {
                Assert.That(edit.Sample.IsSolid, Is.True);
                Assert.That(world.EvaluateSourceDirect(edit.Address).IsSolid, Is.False);
                hasRock |= edit.Sample.Material == MatterMaterialId.Rock;
                hasDirt |= edit.Sample.Material == MatterMaterialId.Dirt;
            }
            Assert.That(hasRock, Is.True);
            Assert.That(hasDirt, Is.True);

            MatterWorld restored = MatterWorldSaveCodec.Read(MatterWorldSaveCodec.Write(world));
            Assert.That(restored.SourceVersion, Is.EqualTo(MatterWorldFactory.ResolvedMatterSourceVersion));
            Assert.That(restored.EditCount, Is.EqualTo(world.EditCount));
            Assert.That(restored.Revision, Is.EqualTo(world.Revision));
            Assert.That(restored.GetSparseEditsSorted().Length, Is.EqualTo(world.GetSparseEditsSorted().Length));
            Assert.That(restored.ReadSample(new MatterSampleAddress(8, 2, 8)),
                Is.EqualTo(world.ReadSample(new MatterSampleAddress(8, 2, 8))));
        }

        [Test]
        public void SurfaceNets_ProducesValidConnectedMeshAcrossTheStampBrickSeams()
        {
            MatterWorld world = RockFormationStampGenerator.Generate(907).Resolve(0.5f).World;
            IMatterMesher mesher = new MatterSurfaceNetsMesher();
            var emittedTriangles = new HashSet<string>(StringComparer.Ordinal);
            int totalTriangles = 0;
            for (int z = 0; z <= 1; z++)
            for (int y = -1; y <= 0; y++)
            for (int x = 0; x <= 1; x++)
            {
                MatterMeshingRegion region = MatterMeshingRegion.Capture(world, new MatterBrickAddress(x, y, z));
                MatterMeshData mesh = mesher.Generate(region);
                AssertMeshValid(mesh);
                int crossings = CountOwnedCrossingEdges(region);
                Assert.That(mesh.TriangleCount + mesh.SkippedDegenerateTriangles, Is.EqualTo(crossings * 2),
                    $"Surface Nets must emit each crossing edge once in brick ({x},{y},{z}).");
                totalTriangles += mesh.TriangleCount;
                for (int i = 0; i < mesh.Indices.Length; i += 3)
                {
                    string a = PositionKey(mesh.Vertices[mesh.Indices[i]].PositionMeters);
                    string b = PositionKey(mesh.Vertices[mesh.Indices[i + 1]].PositionMeters);
                    string c = PositionKey(mesh.Vertices[mesh.Indices[i + 2]].PositionMeters);
                    var keys = new[] { a, b, c };
                    Array.Sort(keys, StringComparer.Ordinal);
                    Assert.That(emittedTriangles.Add(keys[0] + "|" + keys[1] + "|" + keys[2]), Is.True,
                        "Adjacent chunk ownership must not emit duplicate surface triangles.");
                }
            }
            Assert.That(totalTriangles, Is.GreaterThan(0));
        }

        [Test]
        public void PublishedSurface_UsesOneSubmeshAndStableRestProjectionWithRockDirtWeights()
        {
            MatterWorld world = RockFormationStampGenerator.Generate(337).Resolve(0.5f).World;
            MatterMeshingRegion region = MatterMeshingRegion.Capture(world, new MatterBrickAddress(0, 0, 0));
            MatterMeshData data = new MatterSurfaceNetsMesher().Generate(region);
            MatterMeshPublicationTimings timing = MatterMeshPublisher.Publish(data, "U4 Published Test", out Mesh mesh);
            try
            {
                Assert.That(mesh.subMeshCount, Is.EqualTo(1), "Rock/dirt is blended on one surface; no triangle-majority material teeth.");
                Assert.That(mesh.vertexCount, Is.EqualTo(data.Indices.Length), "Each triangle owns one rest-projection face basis.");
                Assert.That(mesh.GetIndexCount(0), Is.EqualTo(data.Indices.Length));
                var restCoordinates = new List<Vector3>();
                var restUvs = new List<Vector2>();
                var masks = new List<Color32>();
                mesh.GetUVs(2, restCoordinates);
                mesh.GetUVs(0, restUvs);
                mesh.GetColors(masks);
                Assert.That(restCoordinates.Count, Is.EqualTo(mesh.vertexCount));
                Assert.That(restUvs.Count, Is.EqualTo(mesh.vertexCount));
                Assert.That(masks.Count, Is.EqualTo(mesh.vertexCount));
                bool hasDirt = false, hasRock = false, hasMixed = false;
                for (int i = 0; i < data.Indices.Length; i++)
                {
                    MatterMeshVertex source = data.Vertices[data.Indices[i]];
                    Assert.That(restCoordinates[i], Is.EqualTo(new Vector3(source.SourcePositionMeters.X,
                        source.SourcePositionMeters.Y, source.SourcePositionMeters.Z)));
                    Assert.That(masks[i].r, Is.EqualTo(source.DirtWeight));
                    Assert.That(masks[i].a, Is.EqualTo(255));
                    hasDirt |= source.DirtWeight > 0;
                    hasRock |= source.RockWeight > 0;
                    hasMixed |= source.DirtWeight > 0 && source.RockWeight > 0;
                    Assert.That(restUvs[i].x + restUvs[i].y, Is.Not.NaN);
                }
                Assert.That(hasDirt && hasRock && hasMixed, Is.True);
                Assert.That(timing.TotalMilliseconds, Is.GreaterThanOrEqualTo(0d));
            }
            finally { UnityEngine.Object.DestroyImmediate(mesh); }
        }

        [Test]
        public void RestProjection_IsInvariantUnderObjectTranslationAndRotationWhileWorldPointChanges()
        {
            var rest = new MatterFloat3(2.25f, 1.4f, -3.1f);
            MatterProjectionAxis axis = MatterProjectionAxis.Y;
            Vector2 storedUv = MatterRestSpaceProjection.Project(rest, axis);
            Matrix4x4 before = Matrix4x4.TRS(new Vector3(1f, 0.2f, -2f), Quaternion.identity, Vector3.one);
            Vector3 worldBefore = before.MultiplyPoint3x4(new Vector3(rest.X, rest.Y, rest.Z));
            Matrix4x4 after = Matrix4x4.TRS(new Vector3(4f, 1.1f, 0.7f), Quaternion.Euler(17f, 43f, -9f), Vector3.one);
            Vector3 worldAfter = after.MultiplyPoint3x4(new Vector3(rest.X, rest.Y, rest.Z));
            Vector2 afterSampleCoordinates = MatterRestSpaceProjection.Project(rest, axis);

            Assert.That((worldAfter - worldBefore).sqrMagnitude, Is.GreaterThan(1f));
            Assert.That(afterSampleCoordinates, Is.EqualTo(storedUv));
            Vector3 returnedToRest = after.inverse.MultiplyPoint3x4(worldAfter);
            Assert.That(Vector3.Distance(returnedToRest, new Vector3(rest.X, rest.Y, rest.Z)), Is.LessThan(0.00001f));
        }

        private static ulong StampMeshHash(MatterWorld world)
        {
            ulong hash = 14695981039346656037UL;
            const ulong prime = 1099511628211UL;
            IMatterMesher mesher = new MatterSurfaceNetsMesher();
            for (int z = 0; z <= 1; z++)
            for (int y = -1; y <= 0; y++)
            for (int x = 0; x <= 1; x++)
            {
                ulong part = mesher.Generate(MatterMeshingRegion.Capture(world, new MatterBrickAddress(x, y, z))).DeterministicHash;
                unchecked { for (int shift = 0; shift < 64; shift += 8) { hash ^= (byte)(part >> shift); hash *= prime; } }
            }
            return hash;
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
                AssertFinite(vertex.PositionMeters.X); AssertFinite(vertex.PositionMeters.Y); AssertFinite(vertex.PositionMeters.Z);
                AssertFinite(vertex.Normal.X); AssertFinite(vertex.Normal.Y); AssertFinite(vertex.Normal.Z);
                Assert.That(vertex.RockWeight + vertex.DirtWeight, Is.EqualTo(255));
            }
        }

        private static string PositionKey(MatterFloat3 value)
            => $"{Math.Round(value.X * 1000000f):F0},{Math.Round(value.Y * 1000000f):F0},{Math.Round(value.Z * 1000000f):F0}";

        private static void AssertFinite(float value)
            => Assert.That(float.IsNaN(value) || float.IsInfinity(value), Is.False);
    }
}
