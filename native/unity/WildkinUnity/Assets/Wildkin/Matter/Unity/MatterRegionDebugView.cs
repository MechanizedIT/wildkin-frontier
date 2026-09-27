using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace Wildkin.Matter.Unity
{
    /// <summary>
    /// Small Tech-scene visualization of resolved matter sample occupancy and material.
    /// The combined mesh is generated from the same MatterWorld used by tests and agent inspection.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class MatterRegionDebugView : MonoBehaviour
    {
        private static readonly int[,] FaceCorners =
        {
            { 1, 5, 7, 3 }, // +X
            { 0, 2, 6, 4 }, // -X
            { 4, 6, 7, 5 }, // +Y
            { 0, 1, 2, 3 }, // -Y
            { 3, 2, 6, 7 }, // +Z
            { 0, 4, 5, 1 }  // -Z
        };

        private static readonly Vector3[] FaceNormals =
        {
            Vector3.right, Vector3.left, Vector3.up,
            Vector3.down, Vector3.forward, Vector3.back
        };

        [SerializeField] private int _sourceSeed = MatterWorldFactory.DefaultSourceSeed;
        [SerializeField] private float _sampleSpacingMeters = MatterWorldFactory.DefaultSampleSpacingMeters;
        [SerializeField] private Vector3Int _minInclusive = new Vector3Int(-8, -4, -8);
        [SerializeField] private Vector3Int _maxExclusive = new Vector3Int(9, 5, 9);

        public int SourceSeed => _sourceSeed;
        public float SampleSpacingMeters => _sampleSpacingMeters;
        public MatterBounds Bounds => new MatterBounds(ToMatterInt3(_minInclusive), ToMatterInt3(_maxExclusive));

        public void Configure(int sourceSeed, float sampleSpacingMeters, MatterBounds bounds)
        {
            _sourceSeed = sourceSeed;
            _sampleSpacingMeters = sampleSpacingMeters;
            _minInclusive = ToVector3Int(bounds.MinInclusive);
            _maxExclusive = ToVector3Int(bounds.MaxExclusive);
        }

        public MatterRegionSnapshot CaptureSnapshot()
        {
            MatterWorld world = MatterWorldFactory.CreateQualificationWorld(_sourceSeed, _sampleSpacingMeters);
            return MatterRegionSnapshot.Capture(world, Bounds);
        }

        public Mesh BuildSampleMarkerMesh()
        {
            MatterRegionSnapshot snapshot = CaptureSnapshot();
            MatterInt3 dimensions = snapshot.Dimensions;
            float half = _sampleSpacingMeters * 0.32f;
            var vertices = new List<Vector3>(snapshot.SampleCount * 12);
            var normals = new List<Vector3>(snapshot.SampleCount * 12);
            var triangles = new[]
            {
                new List<int>(snapshot.SampleCount * 18),
                new List<int>(snapshot.SampleCount * 18)
            };

            int sampleIndex = 0;
            for (int z = 0; z < dimensions.Z; z++)
            for (int y = 0; y < dimensions.Y; y++)
            for (int x = 0; x < dimensions.X; x++, sampleIndex++)
            {
                MatterMaterialId material = (MatterMaterialId)snapshot.Materials[sampleIndex];
                float density = snapshot.Densities[sampleIndex];
                if (density <= 0f) continue;

                MatterMaterialProfile profile = MatterMaterialRegistry.Get(material);
                int slot = profile.RenderSlot;
                if (!profile.IsSolid || slot < 0 || slot >= triangles.Length)
                    throw new InvalidOperationException("Solid debug samples need a registered render slot.");

                Vector3 center = new Vector3(
                    (_minInclusive.x + x) * _sampleSpacingMeters,
                    (_minInclusive.y + y) * _sampleSpacingMeters,
                    (_minInclusive.z + z) * _sampleSpacingMeters);
                AddCube(center, half, slot, vertices, normals, triangles);
            }

            var mesh = new Mesh
            {
                name = "Matter Kernel Resolved Samples",
                indexFormat = IndexFormat.UInt32
            };
            mesh.SetVertices(vertices);
            mesh.SetNormals(normals);
            mesh.subMeshCount = MatterMaterialRegistry.SolidRenderSlotCount;
            for (int slot = 0; slot < triangles.Length; slot++)
                mesh.SetTriangles(triangles[slot], slot, false);
            mesh.RecalculateBounds();
            return mesh;
        }

        private void OnDrawGizmosSelected()
        {
            MatterInt3 size = Bounds.Size;
            Vector3 center = new Vector3(
                (_minInclusive.x + (size.X - 1) * 0.5f) * _sampleSpacingMeters,
                (_minInclusive.y + (size.Y - 1) * 0.5f) * _sampleSpacingMeters,
                (_minInclusive.z + (size.Z - 1) * 0.5f) * _sampleSpacingMeters);
            Vector3 extent = new Vector3(
                size.X * _sampleSpacingMeters,
                size.Y * _sampleSpacingMeters,
                size.Z * _sampleSpacingMeters);
            Gizmos.color = Color.white;
            Gizmos.DrawWireCube(center, extent);
        }

        private static void AddCube(
            Vector3 center, float half, int slot,
            List<Vector3> vertices, List<Vector3> normals, List<int>[] triangles)
        {
            int[,] corners = FaceCorners;
            List<int> indices = triangles[slot];
            for (int face = 0; face < 6; face++)
            {
                int firstVertex = vertices.Count;
                for (int corner = 0; corner < 4; corner++)
                {
                    Vector3 position = Corner(corners[face, corner], center, half);
                    vertices.Add(position);
                    normals.Add(FaceNormals[face]);
                }
                indices.Add(firstVertex);
                indices.Add(firstVertex + 1);
                indices.Add(firstVertex + 2);
                indices.Add(firstVertex);
                indices.Add(firstVertex + 2);
                indices.Add(firstVertex + 3);
            }
        }

        private static Vector3 Corner(int index, Vector3 center, float half)
        {
            float x = (index & 1) == 0 ? -half : half;
            float y = (index & 4) == 0 ? -half : half;
            float z = (index & 2) == 0 ? -half : half;
            return center + new Vector3(x, y, z);
        }

        private static MatterInt3 ToMatterInt3(Vector3Int value)
            => new MatterInt3(value.x, value.y, value.z);

        private static Vector3Int ToVector3Int(MatterInt3 value)
            => new Vector3Int(value.X, value.Y, value.Z);
    }
}
