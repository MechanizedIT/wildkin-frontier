using System;
using System.Collections.Generic;
using System.Collections;
using System.IO;
using UnityEngine;
using UnityEngine.Rendering;
using Wildkin.Matter;

namespace Wildkin.Matter.Unity
{
    public sealed class SculptedStoneGalleryView : MonoBehaviour
    {
        [SerializeField] private SourceRockArchetype _archetype;
        [SerializeField] private int _seed = 4101;
        [SerializeField] private float _matterSpacing;
        [SerializeField] private Shader _surfaceShader;
        [SerializeField] private Shader _wireShader;
        private readonly List<Mesh> _meshes = new List<Mesh>();
        private Material _material, _wireMaterial;
        public SculptedStoneMesh Source { get; private set; }
        public MatterLocalVolume Volume { get; private set; }
        public void SetShaderReferences(Shader surface, Shader wire)
        {
            _surfaceShader = surface; _wireShader = wire;
        }

        public void Configure(SourceRockArchetype archetype, int seed, bool wireframe)
        {
            ClearPreview(); _archetype = archetype; _seed = seed; _matterSpacing = 0; Volume = null;
            Source = SculptedStoneGenerator.Generate(archetype, seed);
            Show(Source, wireframe);
        }

        public void ConfigureMatter(SourceRockArchetype archetype, int seed, float spacing)
        {
            _archetype = archetype; _seed = seed; _matterSpacing = spacing;
            SculptedStoneMesh source = SculptedStoneGenerator.Generate(archetype, seed);
            Volume = new MatterLocalVolume(source, spacing);
            SculptedStoneMesh reconstructed = Volume.Reconstruct(out double meshMilliseconds, out int regions);
            Show(reconstructed, false);
            _playerReceipt = new PlayerReceipt
            {
                sourceHash = source.GeometryHash.ToString("X16"), reconstructedHash = reconstructed.GeometryHash.ToString("X16"),
                spacing = spacing, samples = Volume.SampleCount, rawBytes = Volume.RawBytes,
                vertices = reconstructed.VertexCount, triangles = reconstructed.TriangleCount, regions = regions,
                samplingMilliseconds = Volume.SamplingMilliseconds, meshingMilliseconds = meshMilliseconds,
                activeCells = Volume.LastActiveCellCount, ambiguousFaces = Volume.LastAmbiguousFaceCount,
                ambiguousCells = Volume.LastAmbiguousCellCount, multiComponentCells = Volume.LastMultiComponentCellCount,
                maximumComponentsPerCell = Volume.LastMaximumComponentsPerCell,
                additionalSurfaceVertices = Volume.LastAdditionalSurfaceVertexCount,
                mappedCrossingEdges = Volume.LastMappedCrossingEdgeCount,
                missingCrossingEdgeMappings = Volume.LastMissingCrossingEdgeMappings,
                skippedDegenerateTriangles = Volume.SkippedDegenerateTriangles,
                manifold = reconstructed.Validate(out string issue), issue = issue
            };
        }

        [Serializable] private sealed class PlayerReceipt
        {
            public string sourceHash, reconstructedHash, issue;
            public float spacing;
            public int samples, vertices, triangles, regions, activeCells, ambiguousFaces, ambiguousCells;
            public int multiComponentCells, maximumComponentsPerCell, additionalSurfaceVertices;
            public int mappedCrossingEdges, missingCrossingEdgeMappings, skippedDegenerateTriangles;
            public long rawBytes;
            public double samplingMilliseconds, meshingMilliseconds;
            public bool manifold;
            public string environment = "Windows x64 Development Player, one cold qualification run";
        }
        private PlayerReceipt _playerReceipt;

        public void Show(SculptedStoneMesh mesh, bool wireframe)
        {
            ClearPreview(); Source = mesh;
            var positions = new List<Vector3>();
            var normals = new List<Vector3>();
            var indices = new List<int>();
            // Flat source normals expose the actual geometry rather than concealing it with texture.
            for (int triangle = 0; triangle < mesh.TriangleCount; triangle++)
            {
                Vector3 a = Point(mesh.GetVertex(mesh.GetIndex(triangle * 3)));
                Vector3 b = Point(mesh.GetVertex(mesh.GetIndex(triangle * 3 + 1)));
                Vector3 c = Point(mesh.GetVertex(mesh.GetIndex(triangle * 3 + 2)));
                Vector3 normal = Vector3.Cross(b - a, c - a).normalized;
                int first = positions.Count;
                positions.Add(a); positions.Add(b); positions.Add(c);
                normals.Add(normal); normals.Add(normal); normals.Add(normal);
                indices.Add(first); indices.Add(first + 1); indices.Add(first + 2);
            }
            var surface = new Mesh { name = "U4C2 Faceted Sculpted Stone", indexFormat = IndexFormat.UInt32 };
            surface.SetVertices(positions); surface.SetNormals(normals); surface.SetTriangles(indices, 0);
            _meshes.Add(surface); _material = NeutralMaterial();
            AddRenderer("Sculpted Stone Surface", surface, _material);
            if (!wireframe) return;
            var wirePositions = new Vector3[mesh.VertexCount];
            for (int i = 0; i < wirePositions.Length; i++) wirePositions[i] = Point(mesh.GetVertex(i));
            var lines = new List<int>(); var edges = new HashSet<ulong>();
            for (int i = 0; i < mesh.TriangleCount; i++)
            for (int edge = 0; edge < 3; edge++)
            {
                int a = mesh.GetIndex(i * 3 + edge), b = mesh.GetIndex(i * 3 + (edge + 1) % 3);
                ulong key = ((ulong)(uint)Math.Min(a, b) << 32) | (uint)Math.Max(a, b);
                if (edges.Add(key)) { lines.Add(a); lines.Add(b); }
            }
            var wire = new Mesh { name = "U4C2 Welded Topology" }; wire.vertices = wirePositions;
            wire.SetIndices(lines, MeshTopology.Lines, 0); wire.bounds.Expand(.02f); _meshes.Add(wire);
            _wireMaterial = new Material(_wireShader != null ? _wireShader : Shader.Find("HDRP/Unlit"));
            _wireMaterial.SetColor("_UnlitColor", new Color(.15f, .88f, .95f));
            AddRenderer("Sculpted Stone Wireframe", wire, _wireMaterial);
        }

        private void AddRenderer(string label, Mesh mesh, Material material)
        {
            var child = new GameObject(label); child.transform.SetParent(transform, false);
            child.AddComponent<MeshFilter>().sharedMesh = mesh;
            var renderer = child.AddComponent<MeshRenderer>(); renderer.sharedMaterial = material;
            renderer.shadowCastingMode = ShadowCastingMode.Off; renderer.receiveShadows = false;
        }

        private Material NeutralMaterial()
        {
            Shader shader = _surfaceShader != null ? _surfaceShader : Shader.Find("Wildkin/MatterRockDirt");
            if (shader == null) throw new InvalidOperationException("The U4C2 scene must retain its neutral surface shader for player builds.");
            var material = new Material(shader);
            foreach (string channel in new[] { "Rock", "Dirt" })
            {
                material.SetTexture("_" + channel + "Albedo", Texture2D.whiteTexture);
                material.SetTexture("_" + channel + "Normal", Texture2D.normalTexture);
                material.SetTexture("_" + channel + "Mask", Texture2D.whiteTexture);
                material.SetColor("_" + channel + "Tint", new Color(.55f, .56f, .57f));
                material.SetFloat("_" + channel + "Smoothness", .12f);
            }
            material.SetVector("_KeyDirection", new Vector4(.43f, .56f, -.71f, 0));
            material.SetColor("_KeyColor", new Color(.94f, .95f, .96f));
            material.SetColor("_AmbientColor", new Color(.22f, .23f, .24f));
            material.SetFloat("_NormalStrength", 0); material.SetFloat("_TextureScale", 1);
            return material;
        }

        public void ClearPreview()
        {
            for (int i = transform.childCount - 1; i >= 0; i--) Dispose(transform.GetChild(i).gameObject);
            foreach (Mesh mesh in _meshes) Dispose(mesh); _meshes.Clear();
            Dispose(_material); Dispose(_wireMaterial); _material = _wireMaterial = null;
        }
        private static void Dispose(UnityEngine.Object value)
        {
            if (value == null) return;
            if (Application.isPlaying) Destroy(value); else DestroyImmediate(value);
        }
        private static Vector3 Point(MatterFloat3 p) => new Vector3(p.X, p.Y, p.Z);
        private IEnumerator Start()
        {
            if (_matterSpacing > 0) ConfigureMatter(_archetype, _seed, _matterSpacing);
            else Configure(_archetype, _seed, false);
            string path = null;
            foreach (string argument in Environment.GetCommandLineArgs())
                if (argument.StartsWith("--u4c2-capture=", StringComparison.Ordinal)) path = argument.Substring("--u4c2-capture=".Length);
            if (string.IsNullOrWhiteSpace(path)) yield break;
            yield return null; yield return new WaitForEndOfFrame();
            RockStampGalleryView.Capture(Camera.main, path, 1920, 1080);
            if (_playerReceipt != null) File.WriteAllText(Path.ChangeExtension(path, ".json"), JsonUtility.ToJson(_playerReceipt, true));
            Debug.Log("U4C2 player capture complete.");
            Application.Quit(0);
        }
        private void OnDestroy() => ClearPreview();
    }
}
