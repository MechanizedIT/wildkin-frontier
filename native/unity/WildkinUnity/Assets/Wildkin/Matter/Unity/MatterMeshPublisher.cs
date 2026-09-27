using System;
using System.Runtime.InteropServices;
using System.Diagnostics;
using Unity.Collections;
using UnityEngine;
using UnityEngine.Rendering;
using Wildkin.Matter;

namespace Wildkin.Matter.Unity
{
    public static class MatterManagedAllocationCounter
    {
        private static readonly bool CounterAvailable = Probe();
        public static bool IsAvailable => CounterAvailable;
        public static string Description => CounterAvailable
            ? "GC.GetAllocatedBytesForCurrentThread; verified with a 1 KiB allocation probe."
            : "Unavailable: GC.GetAllocatedBytesForCurrentThread returned no increase for a 1 KiB allocation probe; -1 is used as the unavailable sentinel. GC collection counts remain reported.";

        private static bool Probe()
        {
            long before = GC.GetAllocatedBytesForCurrentThread();
            var probe = new byte[1024];
            probe[0] = 1;
            long after = GC.GetAllocatedBytesForCurrentThread();
            GC.KeepAlive(probe);
            return after > before;
        }
    }

    public readonly struct MatterMeshPublicationTimings
    {
        public readonly double MeshDataFillMilliseconds;
        public readonly double ApplyMilliseconds;
        public readonly double UploadMilliseconds;
        public double TotalMilliseconds => MeshDataFillMilliseconds + ApplyMilliseconds + UploadMilliseconds;

        public MatterMeshPublicationTimings(double fill, double apply, double upload)
        {
            MeshDataFillMilliseconds = fill;
            ApplyMilliseconds = apply;
            UploadMilliseconds = upload;
        }
    }

    /// <summary>Publishes engine-light MatterMeshData using Unity's writable MeshData path.</summary>
    public static class MatterMeshPublisher
    {
        [StructLayout(LayoutKind.Sequential)]
        private struct PublishedVertex
        {
            public Vector3 Position;
            public Vector3 Normal;
            public Vector4 Tangent;
            public Color32 VertexColor;
            public Vector2 StableUv;
            public Color32 MaterialWeights;
            public Vector3 SourcePosition;
            public Color32 DisplayColor;
        }

        private static readonly VertexAttributeDescriptor[] VertexLayout =
        {
            new VertexAttributeDescriptor(VertexAttribute.Position, VertexAttributeFormat.Float32, 3, 0),
            new VertexAttributeDescriptor(VertexAttribute.Normal, VertexAttributeFormat.Float32, 3, 0),
            new VertexAttributeDescriptor(VertexAttribute.Tangent, VertexAttributeFormat.Float32, 4, 0),
            new VertexAttributeDescriptor(VertexAttribute.Color, VertexAttributeFormat.UNorm8, 4, 0),
            new VertexAttributeDescriptor(VertexAttribute.TexCoord0, VertexAttributeFormat.Float32, 2, 0),
            new VertexAttributeDescriptor(VertexAttribute.TexCoord1, VertexAttributeFormat.UNorm8, 4, 0),
            new VertexAttributeDescriptor(VertexAttribute.TexCoord2, VertexAttributeFormat.Float32, 3, 0),
            new VertexAttributeDescriptor(VertexAttribute.TexCoord3, VertexAttributeFormat.UNorm8, 4, 0)
        };

        public static MatterMeshPublicationTimings Publish(MatterMeshData source, string meshName, out Mesh mesh)
        {
            if (source == null) throw new ArgumentNullException(nameof(source));
            if (source.Vertices.Length == 0 || source.Indices.Length == 0)
            {
                mesh = null;
                return default;
            }

            Bounds bounds = CalculateBounds(source.Vertices);
            long fillStart = Stopwatch.GetTimestamp();
            Mesh.MeshDataArray meshDataArray = Mesh.AllocateWritableMeshData(1);
            Mesh.MeshData meshData = meshDataArray[0];
            int publishedVertexCount = source.Indices.Length;
            meshData.SetVertexBufferParams(publishedVertexCount, VertexLayout);
            meshData.SetIndexBufferParams(source.Indices.Length, IndexFormat.UInt32);
            NativeArray<PublishedVertex> vertices = meshData.GetVertexData<PublishedVertex>(0);
            NativeArray<uint> indices = meshData.GetIndexData<uint>();
            for (int triangle = 0; triangle < source.Indices.Length; triangle += 3)
            {
                MatterMeshVertex a = source.Vertices[source.Indices[triangle]];
                MatterMeshVertex b = source.Vertices[source.Indices[triangle + 1]];
                MatterMeshVertex c = source.Vertices[source.Indices[triangle + 2]];
                MatterProjectionFrame projection = MatterRestSpaceProjection.Frame(a, b, c);
                for (int corner = 0; corner < 3; corner++)
                {
                    MatterMeshVertex value = corner == 0 ? a : corner == 1 ? b : c;
                    int output = triangle + corner;
                    MatterFloat3 rest = value.SourcePositionMeters;
                    Vector2 uv = MatterRestSpaceProjection.Project(rest, projection.Axis);
                    vertices[output] = new PublishedVertex
                    {
                        Position = new Vector3(value.PositionMeters.X, value.PositionMeters.Y, value.PositionMeters.Z),
                        Normal = new Vector3(value.Normal.X, value.Normal.Y, value.Normal.Z),
                        Tangent = projection.Tangent,
                        VertexColor = new Color32(value.DirtWeight, 0, 0, 255),
                        StableUv = uv,
                        MaterialWeights = new Color32(value.RockWeight, value.DirtWeight, 0, 255),
                        SourcePosition = new Vector3(rest.X, rest.Y, rest.Z),
                        DisplayColor = CalculateDisplayColor(value, bounds)
                    };
                    indices[output] = (uint)output;
                }
            }
            meshData.subMeshCount = 1;
            meshData.SetSubMesh(0, new SubMeshDescriptor(0, source.Indices.Length, MeshTopology.Triangles)
            {
                bounds = bounds,
                vertexCount = publishedVertexCount
            }, MeshUpdateFlags.DontRecalculateBounds);
            double fillMilliseconds = ToMilliseconds(Stopwatch.GetTimestamp() - fillStart);

            mesh = new Mesh
            {
                name = meshName,
                indexFormat = IndexFormat.UInt32
            };
            long applyStart = Stopwatch.GetTimestamp();
            Mesh.ApplyAndDisposeWritableMeshData(meshDataArray, mesh, MeshUpdateFlags.DontRecalculateBounds);
            mesh.bounds = bounds;
            double applyMilliseconds = ToMilliseconds(Stopwatch.GetTimestamp() - applyStart);

            long uploadStart = Stopwatch.GetTimestamp();
            mesh.UploadMeshData(false);
            double uploadMilliseconds = ToMilliseconds(Stopwatch.GetTimestamp() - uploadStart);
            return new MatterMeshPublicationTimings(fillMilliseconds, applyMilliseconds, uploadMilliseconds);
        }

        public static Mesh CreateWireframe(MatterMeshData source, string meshName)
        {
            if (source == null) throw new ArgumentNullException(nameof(source));
            if (source.Vertices.Length == 0 || source.Indices.Length == 0) return null;
            int lineIndexCount = source.TriangleCount * 6;
            Mesh.MeshDataArray meshDataArray = Mesh.AllocateWritableMeshData(1);
            Mesh.MeshData meshData = meshDataArray[0];
            meshData.SetVertexBufferParams(source.Vertices.Length, VertexLayout);
            meshData.SetIndexBufferParams(lineIndexCount, IndexFormat.UInt32);
            NativeArray<PublishedVertex> vertices = meshData.GetVertexData<PublishedVertex>(0);
            for (int i = 0; i < source.Vertices.Length; i++)
            {
                MatterMeshVertex value = source.Vertices[i];
                vertices[i] = new PublishedVertex
                {
                    Position = new Vector3(value.PositionMeters.X + value.Normal.X * 0.004f,
                        value.PositionMeters.Y + value.Normal.Y * 0.004f,
                        value.PositionMeters.Z + value.Normal.Z * 0.004f),
                    Normal = new Vector3(value.Normal.X, value.Normal.Y, value.Normal.Z),
                    Tangent = new Vector4(1f, 0f, 0f, 1f),
                    VertexColor = new Color32(0, 0, 0, 255),
                    StableUv = Vector2.zero,
                    MaterialWeights = new Color32(255, 255, 255, 255),
                    SourcePosition = new Vector3(value.SourcePositionMeters.X, value.SourcePositionMeters.Y, value.SourcePositionMeters.Z),
                    DisplayColor = new Color32(255, 255, 255, 255)
                };
            }
            NativeArray<uint> lines = meshData.GetIndexData<uint>();
            int cursor = 0;
            for (int i = 0; i < source.Indices.Length; i += 3)
            {
                uint a = (uint)source.Indices[i], b = (uint)source.Indices[i + 1], c = (uint)source.Indices[i + 2];
                lines[cursor++] = a; lines[cursor++] = b;
                lines[cursor++] = b; lines[cursor++] = c;
                lines[cursor++] = c; lines[cursor++] = a;
            }
            Bounds bounds = CalculateBounds(source.Vertices);
            meshData.subMeshCount = 1;
            meshData.SetSubMesh(0, new SubMeshDescriptor(0, lineIndexCount, MeshTopology.Lines)
            {
                bounds = bounds,
                vertexCount = source.Vertices.Length
            }, MeshUpdateFlags.DontRecalculateBounds);
            var mesh = new Mesh { name = meshName, indexFormat = IndexFormat.UInt32 };
            Mesh.ApplyAndDisposeWritableMeshData(meshDataArray, mesh, MeshUpdateFlags.DontRecalculateBounds);
            mesh.bounds = bounds;
            mesh.UploadMeshData(false);
            return mesh;
        }

        public static Material CreateDebugMaterial(Color color, string name, bool unlit = false)
        {
            string shaderName = unlit ? "HDRP/Unlit" : "HDRP/Lit";
            Shader shader = Shader.Find(shaderName);
            if (shader == null) throw new InvalidOperationException("Could not find " + shaderName + " for U3 matter visualization.");
            var material = new Material(shader) { name = name, enableInstancing = true };
            if (material.HasProperty("_UnlitColor")) material.SetColor("_UnlitColor", color);
            if (material.HasProperty("_Color")) material.SetColor("_Color", color);
            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", color);
            return material;
        }

        public static Material CreateVertexColorMaterial(string name)
        {
            const string shaderName = "Hidden/Wildkin/U3VertexColor";
            Shader shader = Shader.Find(shaderName);
            if (shader == null) throw new InvalidOperationException("Could not find " + shaderName + " for U3 matter visualization.");
            return new Material(shader) { name = name, enableInstancing = true };
        }

        private static Color32 CalculateDisplayColor(MatterMeshVertex value, Bounds bounds)
        {
            MatterMaterialProfile rock = MatterMaterialRegistry.Get(MatterMaterialId.Rock);
            MatterMaterialProfile dirt = MatterMaterialRegistry.Get(MatterMaterialId.Dirt);
            float rockWeight = value.RockWeight / 255f;
            float dirtWeight = value.DirtWeight / 255f;
            float total = rockWeight + dirtWeight;
            if (total <= 1e-5f)
            {
                rockWeight = 1f;
                dirtWeight = 0f;
                total = 1f;
            }
            rockWeight /= total;
            dirtWeight /= total;

            var normal = new Vector3(value.Normal.X, value.Normal.Y, value.Normal.Z);
            if (normal.sqrMagnitude > 1e-8f) normal.Normalize();
            else normal = Vector3.up;
            Vector3 key = new Vector3(-0.48f, 0.79f, -0.38f).normalized;
            float keyLight = Mathf.Max(0f, Vector3.Dot(normal, key));
            float hemiLight = Mathf.Clamp01(normal.y * 0.5f + 0.5f);
            float lighting = 0.50f + 0.39f * keyLight + 0.11f * hemiLight;
            float height = Mathf.InverseLerp(bounds.min.y, bounds.max.y, value.PositionMeters.Y);
            float heightTint = 0.94f + height * 0.06f;

            float r = (rock.DebugColor.R * rockWeight + dirt.DebugColor.R * dirtWeight) * lighting * heightTint;
            float g = (rock.DebugColor.G * rockWeight + dirt.DebugColor.G * dirtWeight) * lighting * heightTint;
            float b = (rock.DebugColor.B * rockWeight + dirt.DebugColor.B * dirtWeight) * lighting * heightTint;
            return new Color(r, g, b, 1f);
        }

        private static Bounds CalculateBounds(MatterMeshVertex[] vertices)
        {
            Vector3 minimum = new Vector3(float.PositiveInfinity, float.PositiveInfinity, float.PositiveInfinity);
            Vector3 maximum = new Vector3(float.NegativeInfinity, float.NegativeInfinity, float.NegativeInfinity);
            for (int i = 0; i < vertices.Length; i++)
            {
                MatterFloat3 p = vertices[i].PositionMeters;
                minimum = Vector3.Min(minimum, new Vector3(p.X, p.Y, p.Z));
                maximum = Vector3.Max(maximum, new Vector3(p.X, p.Y, p.Z));
            }
            return new Bounds((minimum + maximum) * 0.5f, maximum - minimum);
        }

        private static double ToMilliseconds(long ticks)
            => ticks * 1000.0 / Stopwatch.Frequency;
    }
}
