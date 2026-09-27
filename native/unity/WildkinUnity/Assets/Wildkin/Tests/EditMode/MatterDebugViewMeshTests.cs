using NUnit.Framework;
using UnityEngine;
using Wildkin.Matter;
using Wildkin.Matter.Unity;

namespace Wildkin.Tests.EditMode
{
    public sealed class MatterDebugViewMeshTests
    {
        [Test]
        public void SampleCubeMesh_AllTriangleWindingsMatchOutwardNormals()
        {
            var gameObject = new GameObject("Matter Debug Mesh Test");
            Mesh mesh = null;
            try
            {
                MatterRegionDebugView view = gameObject.AddComponent<MatterRegionDebugView>();
                view.Configure(
                    MatterWorldFactory.DefaultSourceSeed,
                    MatterWorldFactory.DefaultSampleSpacingMeters,
                    new MatterBounds(new MatterInt3(5, -2, 5), new MatterInt3(6, -1, 6)));

                mesh = view.BuildSampleMarkerMesh();
                Assert.That(mesh.vertexCount, Is.EqualTo(24));

                Vector3[] vertices = mesh.vertices;
                Vector3[] normals = mesh.normals;
                int triangleCount = 0;
                for (int submesh = 0; submesh < mesh.subMeshCount; submesh++)
                {
                    int[] triangles = mesh.GetTriangles(submesh);
                    for (int index = 0; index < triangles.Length; index += 3)
                    {
                        int a = triangles[index];
                        int b = triangles[index + 1];
                        int c = triangles[index + 2];
                        Vector3 geometricNormal = Vector3.Cross(vertices[b] - vertices[a], vertices[c] - vertices[a]);
                        Assert.That(
                            Vector3.Dot(geometricNormal, normals[a]),
                            Is.GreaterThan(0f),
                            $"Triangle {index / 3} in submesh {submesh} is wound against its assigned normal.");
                        triangleCount++;
                    }
                }

                Assert.That(triangleCount, Is.EqualTo(12));
            }
            finally
            {
                if (mesh != null) Object.DestroyImmediate(mesh);
                Object.DestroyImmediate(gameObject);
            }
        }
    }
}
