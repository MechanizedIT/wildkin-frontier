using System;
using NUnit.Framework;
using Wildkin.Matter;

namespace Wildkin.Tests.EditMode
{
    public sealed class SourceMeshFidelityTests
    {
        private static SculptedStoneMesh Box()
        {
            var p = new[]
            {
                new MatterFloat3(-1,-1,-1), new MatterFloat3(1,-1,-1), new MatterFloat3(1,1,-1), new MatterFloat3(-1,1,-1),
                new MatterFloat3(-1,-1,1), new MatterFloat3(1,-1,1), new MatterFloat3(1,1,1), new MatterFloat3(-1,1,1)
            };
            return SculptedStoneMesh.FromIndexedGeometry(p, new[]
            { 0,2,1, 0,3,2, 4,5,6, 4,6,7, 0,1,5, 0,5,4, 3,7,6, 3,6,2, 0,4,7, 0,7,3, 1,2,6, 1,6,5 });
        }

        [TestCase(0f, 0f, 0f, 1f)]
        [TestCase(.9f, 0f, 0f, .1f)]
        [TestCase(1f, 0f, 0f, 0f)]
        [TestCase(1f, 1f, 0f, 0f)]
        [TestCase(1f, 1f, 1f, 0f)]
        [TestCase(1.25f, 0f, 0f, -.25f)]
        [TestCase(1.3f, 1.4f, 0f, -.5f)]
        [TestCase(1.2f, 1.3f, 1.6f, -.7f)]
        [TestCase(-1.25f, -.2f, .3f, -.25f)]
        public void AnalyticBox_HasTrueSignedFaceEdgeAndCornerDistances(float x, float y, float z, float expected)
            => Assert.That(new SourceMeshSignedDistance(Box()).Sample(new MatterFloat3(x, y, z)), Is.EqualTo(expected).Within(1e-5f));

        [Test]
        public void ParityAtRayEdgeAndVertex_IsStableOnBothSides()
        {
            var sampler = new SourceMeshSignedDistance(Box());
            foreach (MatterFloat3 hit in new[] { new MatterFloat3(1,1,.4f), new MatterFloat3(1,1,1) })
            {
                var inside = new MatterFloat3(hit.X - .901f * .5f, hit.Y - .317f * .5f, hit.Z - .293f * .5f);
                var outside = new MatterFloat3(hit.X + .901f * .5f, hit.Y + .317f * .5f, hit.Z + .293f * .5f);
                Assert.That(sampler.Sample(inside), Is.GreaterThan(0));
                Assert.That(sampler.Sample(outside), Is.LessThan(0));
            }
            Assert.Throws<ArgumentOutOfRangeException>(() => sampler.Sample(new MatterFloat3(float.NaN, 0, 0)));
        }

        [Test]
        public void ManifoldValidation_RejectsTwoClosedShellsPinchedAtOneVertex()
        {
            var points = new[]
            {
                new MatterFloat3(0,0,0), new MatterFloat3(1,0,0), new MatterFloat3(0,1,0), new MatterFloat3(0,0,1),
                new MatterFloat3(-1,.2f,0), new MatterFloat3(.2f,-1,0), new MatterFloat3(.1f,.1f,1)
            };
            var indices = new[]
            {
                0,2,1, 0,1,3, 0,3,2, 1,2,3,
                0,5,4, 0,4,6, 0,6,5, 4,5,6
            };
            ArgumentException exception = Assert.Throws<ArgumentException>(
                () => SculptedStoneMesh.FromIndexedGeometry(points, indices));
            StringAssert.Contains("Vertex one-ring contains disconnected triangle fans", exception.Message);
        }

        [TestCase(SourceRockArchetype.CapstoneSlab, 4101)]
        [TestCase(SourceRockArchetype.ChunkyBoulder, 4102)]
        [TestCase(SourceRockArchetype.ButtressWedge, 4103)]
        public void SourceVerticesAndFaceInteriors_AreZeroDistanceWithCorrectLocalSigns(SourceRockArchetype archetype, int seed)
        {
            SculptedStoneMesh mesh = SculptedStoneGenerator.Generate(archetype, seed);
            var sampler = new SourceMeshSignedDistance(mesh);
            for (int i = 0; i < mesh.VertexCount; i++) Assert.That(sampler.Sample(mesh.GetVertex(i)), Is.EqualTo(0).Within(2e-6f));
            int largest = 0; double bestArea = 0;
            for (int i = 0; i < mesh.TriangleCount; i++)
            {
                MatterFloat3 a = mesh.GetVertex(mesh.GetIndex(i * 3)), b = mesh.GetVertex(mesh.GetIndex(i * 3 + 1)), c = mesh.GetVertex(mesh.GetIndex(i * 3 + 2));
                double nx = (b.Y-a.Y)*(c.Z-a.Z)-(b.Z-a.Z)*(c.Y-a.Y), ny=(b.Z-a.Z)*(c.X-a.X)-(b.X-a.X)*(c.Z-a.Z), nz=(b.X-a.X)*(c.Y-a.Y)-(b.Y-a.Y)*(c.X-a.X);
                double area=nx*nx+ny*ny+nz*nz; if(area>bestArea){bestArea=area;largest=i;}
            }
            MatterFloat3 pa=mesh.GetVertex(mesh.GetIndex(largest*3)),pb=mesh.GetVertex(mesh.GetIndex(largest*3+1)),pc=mesh.GetVertex(mesh.GetIndex(largest*3+2));
            double dx=(pb.Y-pa.Y)*(pc.Z-pa.Z)-(pb.Z-pa.Z)*(pc.Y-pa.Y),dy=(pb.Z-pa.Z)*(pc.X-pa.X)-(pb.X-pa.X)*(pc.Z-pa.Z),dz=(pb.X-pa.X)*(pc.Y-pa.Y)-(pb.Y-pa.Y)*(pc.X-pa.X);
            double length=Math.Sqrt(dx*dx+dy*dy+dz*dz);
            var center=new MatterFloat3((pa.X+pb.X+pc.X)/3,(pa.Y+pb.Y+pc.Y)/3,(pa.Z+pb.Z+pc.Z)/3);
            Assert.That(sampler.Sample(center),Is.EqualTo(0).Within(2e-6f));
            foreach(float offset in new[]{-.02f,.02f})
                Assert.That(sampler.Sample(new MatterFloat3(center.X+(float)(dx/length)*offset,center.Y+(float)(dy/length)*offset,center.Z+(float)(dz/length)*offset)),Is.EqualTo(-offset).Within(2e-5f));
        }

        [Test]
        public void LocalVolume_RetainsExactExteriorDistanceDeterminismAndMaterialSign()
        {
            SculptedStoneMesh source = Box(); var sampler = new SourceMeshSignedDistance(source);
            var a = new MatterLocalVolume(source, .5f); var b = new MatterLocalVolume(source, .5f);
            for (int z=a.Bounds.MinInclusive.Z;z<a.Bounds.MaxExclusive.Z;z++)
            for (int y=a.Bounds.MinInclusive.Y;y<a.Bounds.MaxExclusive.Y;y++)
            for (int x=a.Bounds.MinInclusive.X;x<a.Bounds.MaxExclusive.X;x++)
            {
                var address=new MatterSampleAddress(x,y,z); MatterSample sample=a.ReadSample(address);
                Assert.That(sample,Is.EqualTo(b.ReadSample(address)));
                Assert.That(sample.Density,Is.EqualTo(sampler.Sample(new MatterFloat3(x*.5f,y*.5f,z*.5f))));
                Assert.That(sample.Material,Is.EqualTo(sample.Density>0?MatterMaterialId.Rock:MatterMaterialId.Air));
                Assert.That(a.Trilinear(new MatterFloat3(x*.5f,y*.5f,z*.5f)),Is.EqualTo(sample.Density));
            }
            var control=new MatterLocalVolume(source,.5f,true);
            Assert.That(control.OccupiedCount,Is.EqualTo(a.OccupiedCount));
            var exterior=new MatterSampleAddress(4,0,0);
            Assert.That(a.ReadSample(exterior).Density,Is.EqualTo(-1f));
            Assert.That(control.ReadSample(exterior).Density,Is.EqualTo(-.5f));
        }

        private sealed class WorldGrid : IMatterReadOnlyGrid
        {
            public readonly MatterWorld World;
            public WorldGrid(MatterWorld world){World=world;}
            public float SampleSpacingMeters=>World.SampleSpacingMeters;
            public MatterSample ReadSample(MatterSampleAddress address)=>World.ReadSample(address);
        }

        [TestCase(MatterFixtureId.SmoothOrganic)]
        [TestCase(MatterFixtureId.LayeredRock)]
        [TestCase(MatterFixtureId.CliffCave)]
        [TestCase(MatterFixtureId.MaterialBoundary)]
        [TestCase(MatterFixtureId.MinedCavity)]
        [TestCase(MatterFixtureId.DetachedIrregular)]
        public void ReadOnlyGridAdapter_PreservesWorldMeshHashesAndCannotWriteBack(MatterFixtureId fixture)
        {
            var world=new MatterWorld(MatterFixtureSource.DefaultSeed,.5f,new MatterFixtureSource(fixture));
            var grid=new WorldGrid(world);
            foreach(var brick in new[]{new MatterBrickAddress(0,0,0),new MatterBrickAddress(-1,-1,-1),new MatterBrickAddress(1,0,-1)})
            {
                MatterMeshingRegion a=MatterMeshingRegion.Capture(world,brick),b=MatterMeshingRegion.CaptureGrid(grid,brick);
                foreach(IMatterMesher mesher in new IMatterMesher[]{new MatterSurfaceNetsMesher(),new MatterDualContouringMesher()})
                {
                    MatterMeshData original=mesher.Generate(a),adapted=mesher.Generate(b);
                    Assert.That(adapted.DeterministicHash,Is.EqualTo(original.DeterministicHash));
                    CollectionAssert.AreEqual(original.VertexCellAddresses,adapted.VertexCellAddresses);
                    CollectionAssert.AreEqual(original.VertexSurfaceKeys,adapted.VertexSurfaceKeys);
                }
                Assert.That(b.Samples.TryWriteBackSample(world,new MatterSampleAddress(b.SampleOrigin),new MatterSample(-1,MatterMaterialId.Air)),Is.False);
                Assert.Throws<ArgumentException>(()=>b.Samples.WriteBack(world));
            }
        }

        [Test]
        public void ClippedControl_B125RemainsClosedAndSeparateFromTheTrueSdfQualificationMatrix()
        {
            SculptedStoneMesh source=SculptedStoneGenerator.Generate(SourceRockArchetype.ChunkyBoulder,4102);
            Assert.That(source.GeometryHash.ToString("X16"),Is.EqualTo("EA991B6C6C2D132D"));
            var volume=new MatterLocalVolume(source,.125f,true);
            SculptedStoneMesh mesh=volume.Reconstruct(out _,out _);
            Assert.That(mesh.Validate(out string issue),Is.True,issue);
            Assert.That(volume.SkippedDegenerateTriangles,Is.Zero);
            Assert.That(volume.LastMissingCrossingEdgeMappings,Is.Zero);
        }

        [TestCase(SourceRockArchetype.ButtressWedge,4103,.125f,"EF8ACF6528F0C296")]
        [TestCase(SourceRockArchetype.ChunkyBoulder,4102,.0625f,"EA991B6C6C2D132D")]
        public void Qualification_ReconstructsTheRecordedFourUseSurfaceNetsCasesAsManifold(
            SourceRockArchetype archetype,int seed,float spacing,string expectedSourceHash)
        {
            SculptedStoneMesh source=SculptedStoneGenerator.Generate(archetype,seed);
            Assert.That(source.Validate(out string sourceIssue),Is.True,sourceIssue);
            Assert.That(source.GeometryHash.ToString("X16"),Is.EqualTo(expectedSourceHash),"Exact U4C2 source is retained.");
            var volume=new MatterLocalVolume(source,spacing);
            SculptedStoneMesh mesh=volume.Reconstruct(out _,out _);
            Assert.That(volume.SkippedDegenerateTriangles,Is.Zero);
            Assert.That(volume.LastMissingCrossingEdgeMappings,Is.Zero);
            Assert.That(volume.LastMultiComponentCellCount,Is.GreaterThan(0),"The repair must split scalar patches generically.");
            Assert.That(mesh.Validate(out string issue),Is.True,issue);
            var uses=new System.Collections.Generic.Dictionary<ulong,int>();
            for(int i=0;i<mesh.TriangleCount;i++)for(int edge=0;edge<3;edge++)
            {
                int a=mesh.GetIndex(i*3+edge),b=mesh.GetIndex(i*3+(edge+1)%3);
                ulong key=((ulong)(uint)System.Math.Min(a,b)<<32)|(uint)System.Math.Max(a,b);
                uses.TryGetValue(key,out int count);uses[key]=count+1;
            }
            int fourUseEdges=0;foreach(int count in uses.Values)if(count==4)fourUseEdges++;
            Assert.That(fourUseEdges,Is.Zero);
            foreach(int count in uses.Values)Assert.That(count,Is.EqualTo(2),"Every closed manifold edge has two uses.");
        }

        [TestCase(SourceRockArchetype.CapstoneSlab,4101,.5f,"881447DF8B9C5082")]
        [TestCase(SourceRockArchetype.CapstoneSlab,4101,.25f,"881447DF8B9C5082")]
        [TestCase(SourceRockArchetype.CapstoneSlab,4101,.125f,"881447DF8B9C5082")]
        [TestCase(SourceRockArchetype.CapstoneSlab,4101,.0625f,"881447DF8B9C5082")]
        [TestCase(SourceRockArchetype.ChunkyBoulder,4102,.5f,"EA991B6C6C2D132D")]
        [TestCase(SourceRockArchetype.ChunkyBoulder,4102,.25f,"EA991B6C6C2D132D")]
        [TestCase(SourceRockArchetype.ChunkyBoulder,4102,.125f,"EA991B6C6C2D132D")]
        [TestCase(SourceRockArchetype.ChunkyBoulder,4102,.0625f,"EA991B6C6C2D132D")]
        [TestCase(SourceRockArchetype.ButtressWedge,4103,.5f,"EF8ACF6528F0C296")]
        [TestCase(SourceRockArchetype.ButtressWedge,4103,.25f,"EF8ACF6528F0C296")]
        [TestCase(SourceRockArchetype.ButtressWedge,4103,.125f,"EF8ACF6528F0C296")]
        [TestCase(SourceRockArchetype.ButtressWedge,4103,.0625f,"EF8ACF6528F0C296")]
        public void TrueSdfReconstruction_FullU4C2MatrixRemainsClosedAndConnected(
            SourceRockArchetype archetype,int seed,float spacing,string expectedSourceHash)
        {
            SculptedStoneMesh source=SculptedStoneGenerator.Generate(archetype,seed);
            Assert.That(source.GeometryHash.ToString("X16"),Is.EqualTo(expectedSourceHash));
            Assert.That(source.Validate(out string sourceIssue),Is.True,sourceIssue);
            var volume=new MatterLocalVolume(source,spacing);
            SculptedStoneMesh mesh=volume.Reconstruct(out _,out _);
            Assert.That(mesh.Validate(out string issue),Is.True,$"{archetype} / {spacing}: {issue}");
            Assert.That(volume.SkippedDegenerateTriangles,Is.Zero);
            Assert.That(volume.LastMissingCrossingEdgeMappings,Is.Zero);
            Assert.That(mesh.TriangleCount,Is.GreaterThan(0));
            Assert.That(volume.LastMappedCrossingEdgeCount,Is.GreaterThan(0));
        }

        [Test]
        public void SurfaceNets_LocalFieldHasClosedDeterministicReconstructionAndImprovesWithSpacing()
        {
            SculptedStoneMesh source=Box(); var coarse=new MatterLocalVolume(source,.5f);var fine=new MatterLocalVolume(source,.25f);
            SculptedStoneMesh a=coarse.Reconstruct(out _,out _),b=coarse.Reconstruct(out _,out _),c=fine.Reconstruct(out _,out _);
            Assert.That(a.Validate(out string issue),Is.True,issue);
            Assert.That(c.Validate(out issue),Is.True,issue);
            Assert.That(a.GeometryHash,Is.EqualTo(b.GeometryHash));
            Assert.That(c.TriangleCount,Is.GreaterThan(a.TriangleCount));
            Assert.That(Math.Abs(c.SignedVolume-source.SignedVolume),Is.LessThan(Math.Abs(a.SignedVolume-source.SignedVolume)));
        }
    }
}
