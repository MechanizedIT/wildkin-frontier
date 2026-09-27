using System;
using System.Collections.Generic;
using System.Globalization;
using UnityEngine;
using UnityEngine.Rendering;
using Wildkin.Matter;

namespace Wildkin.Matter.Unity
{
    [Serializable]
    public sealed class SourceRockPreviewReport
    {
        public string archetype;
        public int seed;
        public string recipeVersion;
        public int componentCount;
        public int planeCount;
        public int faceCount;
        public int uniqueVertices;
        public int triangles;
        public bool closedManifold;
        public string manifoldIssue;
        public string boundsMinMeters;
        public string boundsMaxMeters;
        public string geometryHash;
        public string sourceAuthorityNote;
    }

    /// <summary>Editor/player presentation for the direct procedural source-rock visual gate.</summary>
    public sealed class SourceRockGalleryView : MonoBehaviour
    {
        [SerializeField] private SourceRockArchetype _archetype = SourceRockArchetype.CapstoneSlab;
        [SerializeField] private int _seed = 4101;
        [SerializeField] private bool _wireframe;
        [SerializeField] private Material _surfaceMaterialAsset;

        private readonly List<GameObject> _ownedObjects = new List<GameObject>();
        private readonly List<Mesh> _ownedMeshes = new List<Mesh>();
        private Material _surfaceMaterial;
        private Material _wireMaterial;
        private SourceRockMesh _source;
        private bool _built;

        public SourceRockArchetype Archetype => _archetype;
        public int Seed => _seed;
        public bool Wireframe => _wireframe;
        public bool IsBuilt => _built;
        public SourceRockMesh Source => _source;

        public void Configure(SourceRockArchetype archetype, int seed, bool wireframe = false,
            Material materialAsset = null)
        {
            _archetype = archetype;
            _seed = seed;
            _wireframe = wireframe;
            if (materialAsset != null) _surfaceMaterialAsset = materialAsset;
            Regenerate();
        }

        public void Regenerate()
        {
            DestroyGenerated();
            _source = ProceduralSourceRockGenerator.Generate(_archetype, _seed);
            if (_surfaceMaterialAsset == null)
                _surfaceMaterial = CreateSurfaceMaterial();
            else
                _surfaceMaterial = _surfaceMaterialAsset;
            GameObject root = new GameObject("U4C " + Name(_archetype) + " Source Geometry");
            root.transform.SetParent(transform, false);
            _ownedObjects.Add(root);

            Mesh mesh = CreateFacetedMesh(_source, "U4C Direct Source - " + Name(_archetype));
            _ownedMeshes.Add(mesh);
            GameObject surface = new GameObject("Direct Source Mesh");
            surface.transform.SetParent(root.transform, false);
            surface.AddComponent<MeshFilter>().sharedMesh = mesh;
            MeshRenderer renderer = surface.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = _surfaceMaterial;
            renderer.shadowCastingMode = ShadowCastingMode.Off;
            renderer.receiveShadows = false;

            if (_wireframe)
            {
                Mesh wire = CreateWireMesh(_source, "U4C Direct Source Wireframe");
                _ownedMeshes.Add(wire);
                GameObject overlay = new GameObject("Source Triangle Wireframe");
                overlay.transform.SetParent(root.transform, false);
                overlay.AddComponent<MeshFilter>().sharedMesh = wire;
                MeshRenderer wireRenderer = overlay.AddComponent<MeshRenderer>();
                wireRenderer.sharedMaterial = GetWireMaterial();
                wireRenderer.shadowCastingMode = ShadowCastingMode.Off;
                wireRenderer.receiveShadows = false;
            }
            _built = true;
        }

        /// <summary>Remove generated meshes before saving a reproducible scene; Start rebuilds them.</summary>
        public void ClearPreviewForSceneSave()
        {
            DestroyGenerated();
            _source = null;
        }

        public string ReportJson()
        {
            if (_source == null) Regenerate();
            bool manifold = _source.IsClosedManifold(out string issue);
            var report = new SourceRockPreviewReport
            {
                archetype = Name(_archetype),
                seed = _seed,
                recipeVersion = _source.Recipe.RecipeVersion,
                componentCount = _source.ComponentCount,
                planeCount = _source.Recipe.PlaneCount,
                faceCount = _source.FaceCount,
                uniqueVertices = _source.VertexCount,
                triangles = _source.TriangleCount,
                closedManifold = manifold,
                manifoldIssue = issue,
                boundsMinMeters = VectorText(_source.BoundsMin),
                boundsMaxMeters = VectorText(_source.BoundsMax),
                geometryHash = _source.DeterministicHash.ToString("X16", CultureInfo.InvariantCulture),
                sourceAuthorityNote = "This direct plane-set mesh is generation input only. U4C visual review must pass before this exact mesh is sampled into matter."
            };
            return JsonUtility.ToJson(report, true);
        }

        public static string Name(SourceRockArchetype archetype)
        {
            switch (archetype)
            {
                case SourceRockArchetype.CapstoneSlab: return "Capstone Slab";
                case SourceRockArchetype.ChunkyBoulder: return "Chunky Boulder";
                case SourceRockArchetype.ButtressWedge: return "Buttress Wedge";
                default: throw new ArgumentOutOfRangeException(nameof(archetype), archetype, "Unknown source-rock archetype.");
            }
        }

        public static bool TryParse(string value, out SourceRockArchetype archetype)
        {
            if (string.Equals(value, "A", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(value, "Capstone", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(value, "Capstone Slab", StringComparison.OrdinalIgnoreCase))
            { archetype = SourceRockArchetype.CapstoneSlab; return true; }
            if (string.Equals(value, "B", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(value, "Chunky Boulder", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(value, "Boulder", StringComparison.OrdinalIgnoreCase))
            { archetype = SourceRockArchetype.ChunkyBoulder; return true; }
            if (string.Equals(value, "C", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(value, "Buttress Wedge", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(value, "Buttress", StringComparison.OrdinalIgnoreCase))
            { archetype = SourceRockArchetype.ButtressWedge; return true; }
            archetype = default;
            return false;
        }

        private static Mesh CreateFacetedMesh(SourceRockMesh source, string meshName)
        {
            var positions = new List<Vector3>(source.TriangleCount * 3);
            var normals = new List<Vector3>(source.TriangleCount * 3);
            var indices = new List<int>(source.TriangleCount * 3);
            for (int faceIndex = 0; faceIndex < source.FaceCount; faceIndex++)
            {
                SourceRockFace face = source.GetFace(faceIndex);
                int first = positions.Count;
                for (int i = 0; i < face.VertexIndices.Length; i++)
                {
                    MatterFloat3 p = source.GetVertex(face.VertexIndices[i]);
                    positions.Add(new Vector3(p.X, p.Y, p.Z));
                    normals.Add(new Vector3(face.Normal.X, face.Normal.Y, face.Normal.Z));
                }
                for (int i = 1; i < face.VertexIndices.Length - 1; i++)
                {
                    indices.Add(first); indices.Add(first + i); indices.Add(first + i + 1);
                }
            }
            var mesh = new Mesh { name = meshName, indexFormat = IndexFormat.UInt32 };
            mesh.SetVertices(positions);
            mesh.SetNormals(normals);
            mesh.SetTriangles(indices, 0, true);
            mesh.RecalculateBounds();
            return mesh;
        }

        private static Mesh CreateWireMesh(SourceRockMesh source, string meshName)
        {
            var positions = new Vector3[source.VertexCount];
            for (int i = 0; i < positions.Length; i++)
            {
                MatterFloat3 p = source.GetVertex(i);
                positions[i] = new Vector3(p.X, p.Y, p.Z);
            }
            var lines = new List<int>(source.TriangleCount * 6);
            var seen = new HashSet<ulong>();
            for (int i = 0; i < source.TriangleCount; i++)
            {
                int a = source.GetTriangleIndex(i * 3), b = source.GetTriangleIndex(i * 3 + 1), c = source.GetTriangleIndex(i * 3 + 2);
                AddLine(a, b, seen, lines); AddLine(b, c, seen, lines); AddLine(c, a, seen, lines);
            }
            var mesh = new Mesh { name = meshName, indexFormat = IndexFormat.UInt32 };
            mesh.vertices = positions;
            mesh.SetIndices(lines, MeshTopology.Lines, 0, false);
            mesh.RecalculateBounds();
            mesh.bounds.Expand(0.02f);
            return mesh;
        }

        private static void AddLine(int a, int b, HashSet<ulong> seen, List<int> lines)
        {
            uint low = (uint)Math.Min(a, b), high = (uint)Math.Max(a, b);
            ulong key = ((ulong)low << 32) | high;
            if (!seen.Add(key)) return;
            lines.Add(a); lines.Add(b);
        }

        private Material CreateSurfaceMaterial()
        {
            Shader shader = Shader.Find("Wildkin/MatterRockDirt");
            if (shader == null)
                throw new InvalidOperationException("U4C requires the shared Wildkin/MatterRockDirt stylized surface shader.");
            var material = new Material(shader) { name = "U4C Neutral Source Rock" };
            Color neutralStone = new Color(0.55f, 0.56f, 0.57f, 1f);
            material.SetTexture("_RockAlbedo", Texture2D.whiteTexture);
            material.SetTexture("_DirtAlbedo", Texture2D.whiteTexture);
            material.SetTexture("_RockNormal", Texture2D.normalTexture);
            material.SetTexture("_DirtNormal", Texture2D.normalTexture);
            material.SetTexture("_RockMask", Texture2D.whiteTexture);
            material.SetTexture("_DirtMask", Texture2D.whiteTexture);
            material.SetColor("_RockTint", neutralStone);
            material.SetColor("_DirtTint", neutralStone);
            material.SetVector("_KeyDirection", new Vector4(0.43f, 0.56f, -0.71f, 0f));
            material.SetColor("_KeyColor", new Color(0.94f, 0.95f, 0.96f, 1f));
            material.SetColor("_AmbientColor", new Color(0.22f, 0.23f, 0.24f, 1f));
            material.SetFloat("_TextureScale", 1f);
            material.SetFloat("_NormalStrength", 0f);
            material.SetFloat("_RockSmoothness", 0.12f);
            material.SetFloat("_DirtSmoothness", 0.12f);
            _ownedSurfaceMaterial = material;
            return material;
        }

        private Material _ownedSurfaceMaterial;

        private Material GetWireMaterial()
        {
            if (_wireMaterial != null) return _wireMaterial;
            Shader shader = Shader.Find("HDRP/Unlit");
            if (shader == null) shader = Shader.Find("Unlit/Color");
            _wireMaterial = new Material(shader) { name = "U4C Source Wireframe" };
            Color cyan = new Color(0.15f, 0.88f, 0.95f, 1f);
            if (_wireMaterial.HasProperty("_UnlitColor")) _wireMaterial.SetColor("_UnlitColor", cyan);
            if (_wireMaterial.HasProperty("_BaseColor")) _wireMaterial.SetColor("_BaseColor", cyan);
            if (_wireMaterial.HasProperty("_Color")) _wireMaterial.SetColor("_Color", cyan);
            return _wireMaterial;
        }

        private void DestroyGenerated()
        {
            for (int i = 0; i < _ownedObjects.Count; i++) DestroyGeneratedObject(_ownedObjects[i]);
            _ownedObjects.Clear();
            // Editor domain reloads reset the nonserialized ownership lists while leaving scene children alive.
            for (int i = transform.childCount - 1; i >= 0; i--)
            {
                Transform child = transform.GetChild(i);
                if (child.name.StartsWith("U4C ", StringComparison.Ordinal) &&
                    child.name.EndsWith(" Source Geometry", StringComparison.Ordinal))
                    DestroyGeneratedObject(child.gameObject);
            }
            for (int i = 0; i < _ownedMeshes.Count; i++) DestroyGeneratedObject(_ownedMeshes[i]);
            _ownedMeshes.Clear();
            if (_ownedSurfaceMaterial != null) DestroyGeneratedObject(_ownedSurfaceMaterial);
            if (_wireMaterial != null) DestroyGeneratedObject(_wireMaterial);
            _ownedSurfaceMaterial = null;
            _wireMaterial = null;
            _surfaceMaterial = null;
            _built = false;
        }

        private void Start()
        {
            // A mesh built for Edit Mode is transient and may be invalidated during play entry/domain reload.
            Regenerate();
        }

        private void OnDestroy() => DestroyGenerated();

        private static void DestroyGeneratedObject(UnityEngine.Object value)
        {
            if (value == null) return;
            if (Application.isPlaying) UnityEngine.Object.Destroy(value);
            else UnityEngine.Object.DestroyImmediate(value);
        }

        private static string VectorText(MatterFloat3 value)
            => string.Format(CultureInfo.InvariantCulture, "({0:F4}, {1:F4}, {2:F4})", value.X, value.Y, value.Z);
    }
}
