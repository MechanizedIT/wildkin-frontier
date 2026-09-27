using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using UnityEngine;
using UnityEngine.Rendering;
using Wildkin.Matter;

namespace Wildkin.Matter.Unity
{
    [Serializable]
    public sealed class RockStampSeedReport
    {
        public int seed;
        public string profile;
        public string layoutName;
        public string boundsMeters;
        public int occupiedSamples;
        public double occupiedVolumeEstimateCubicMeters;
        public float widthHeightRatio;
        public float depthHeightRatio;
        public string primitiveDistribution;
        public int primitiveCount;
        public int connectedResolvedComponents;
        public int vertices;
        public int triangles;
        public string fieldHash;
        public string meshHash;
        public double parameterGenerationMilliseconds;
        public double scalarWorldResolutionMilliseconds;
        public double snapshotMilliseconds;
        public double surfaceNetsMilliseconds;
        public double meshDataFillMilliseconds;
        public double applyMilliseconds;
        public double uploadMilliseconds;
        public long rawMatterAndMeshPayloadBytes;
        public string rejectionReason;
    }

    [Serializable]
    public sealed class RockStampGalleryReport
    {
        public string profile;
        public float sampleSpacingMeters;
        public int seedStart;
        public int seedCount;
        public int rejectedSeeds;
        public int observedFrameCount;
        public double observedAverageFrameMilliseconds;
        public double observedMaximumFrameMilliseconds;
        public string gpuFrameObservation;
        public string memoryEstimateMethod;
        public RockStampSeedReport[] seeds;
    }

    /// <summary>Runtime generator, MatterWorld resolver and Surface Nets publisher for U4 art captures.</summary>
    public sealed class RockStampGalleryView : MonoBehaviour
    {
        [SerializeField] private int _seedStart = 1;
        [SerializeField] private int _seedCount = 20;
        [SerializeField] private string _profile = "WildkinClast-v1";
        [SerializeField] private float _sampleSpacingMeters = 0.5f;
        [SerializeField] private bool _galleryLayout = true;
        [SerializeField] private bool _wireframe;
        [SerializeField] private Material _surfaceMaterialAsset;
        [SerializeField] private string _playerCaptureOutputPath;
        [SerializeField] private string _playerMetricsOutputPath;
        [SerializeField] private bool _quitAfterPlayerCapture;

        private readonly List<GameObject> _ownedRoots = new List<GameObject>();
        private readonly List<Mesh> _ownedMeshes = new List<Mesh>();
        private readonly List<Material> _ownedMaterials = new List<Material>();
        private readonly List<Material> _ownedDebugMaterials = new List<Material>();
        private readonly List<GameObject> _ownedLabels = new List<GameObject>();
        private readonly List<RockMatterRuntimeObject> _matterObjects = new List<RockMatterRuntimeObject>();
        private readonly List<RockStampSeedReport> _seedReports = new List<RockStampSeedReport>();
        private readonly List<double> _frameMilliseconds = new List<double>();
        private Material _normalMaterial;
        private Material _wireMaterial;

        public IReadOnlyList<RockStampSeedReport> SeedReports => _seedReports;
        public Material SurfaceMaterial => _surfaceMaterialAsset;
        public bool HasRuntimeMatter => _matterObjects.Count > 0;

        public void Configure(int seedStart, int count, string profile = "WildkinClast-v1",
            float sampleSpacingMeters = 0.5f, bool galleryLayout = true, bool wireframe = false,
            Material materialAsset = null)
        {
            if (count <= 0 || count > 64) throw new ArgumentOutOfRangeException(nameof(count), "Gallery count must be in [1,64].");
            if (float.IsNaN(sampleSpacingMeters) || float.IsInfinity(sampleSpacingMeters) || sampleSpacingMeters <= 0f)
                throw new ArgumentOutOfRangeException(nameof(sampleSpacingMeters));
            _seedStart = seedStart;
            _seedCount = count;
            _profile = string.IsNullOrWhiteSpace(profile) ? "WildkinClast-v1" : profile;
            _sampleSpacingMeters = sampleSpacingMeters;
            _galleryLayout = galleryLayout;
            _wireframe = wireframe;
            if (materialAsset != null) _surfaceMaterialAsset = materialAsset;
            Regenerate();
        }

        public void Regenerate()
        {
            DestroyGenerated();
            _seedReports.Clear();
            _frameMilliseconds.Clear();
            for (int i = 0; i < _seedCount; i++) BuildSeed(checked(_seedStart + i), i);
            if (_surfaceMaterialAsset == null)
                throw new InvalidOperationException("U4 requires the first-party Wildkin/MatterRockDirt HDRP material asset.");
            _normalMaterial = _surfaceMaterialAsset;
        }

        public RockStampGalleryReport BuildReport()
        {
            double total = 0d, maximum = 0d;
            for (int i = 0; i < _frameMilliseconds.Count; i++)
            {
                double value = _frameMilliseconds[i];
                total += value;
                if (value > maximum) maximum = value;
            }
            int rejected = 0;
            for (int i = 0; i < _seedReports.Count; i++)
                if (!string.IsNullOrEmpty(_seedReports[i].rejectionReason)) rejected++;
            return new RockStampGalleryReport
            {
                profile = _profile,
                sampleSpacingMeters = _sampleSpacingMeters,
                seedStart = _seedStart,
                seedCount = _seedCount,
                rejectedSeeds = rejected,
                observedFrameCount = _frameMilliseconds.Count,
                observedAverageFrameMilliseconds = _frameMilliseconds.Count == 0 ? 0d : total / _frameMilliseconds.Count,
                observedMaximumFrameMilliseconds = maximum,
                gpuFrameObservation = "Unavailable: no GPU timing result is inferred from editor camera.Render or PlayerLoop deltaTime.",
                memoryEstimateMethod = "Raw density/material bytes for sparse resolved MatterWorld edits plus 72-byte published vertex and 32-bit index payload; excludes managed dictionary, mesh-driver, texture and renderer overhead.",
                seeds = _seedReports.ToArray()
            };
        }

        public string ReportJson() => JsonUtility.ToJson(BuildReport(), true);

        /// <summary>Keep generated runtime meshes out of the scene file; PlayerLoop recreates them from the saved profile/seed list.</summary>
        public void ClearPreviewForSceneSave()
        {
            DestroyGenerated();
            _seedReports.Clear();
            _frameMilliseconds.Clear();
        }

        public void SetDebugMaterial(string mode)
        {
            if (string.Equals(mode, "off", StringComparison.OrdinalIgnoreCase))
            {
                for (int i = 0; i < _matterObjects.Count; i++) _matterObjects[i].SetSurfaceMaterial(_normalMaterial);
                for (int i = 0; i < _ownedDebugMaterials.Count; i++) DestroyObject(_ownedDebugMaterials[i]);
                _ownedDebugMaterials.Clear();
                return;
            }
            Material debug = MatterRockMaterialFactory.CreateDebugMaterial(mode);
            _ownedDebugMaterials.Add(debug);
            for (int i = 0; i < _matterObjects.Count; i++) _matterObjects[i].SetSurfaceMaterial(debug);
        }

        public void CaptureMotionProof(string beforePath, string afterPath, int width = 1920, int height = 1080)
        {
            if (_matterObjects.Count == 0) throw new InvalidOperationException("No resolved runtime matter object is available for projection proof.");
            Camera camera = Camera.main;
            if (camera == null) throw new InvalidOperationException("Projection proof needs the gallery MainCamera.");
            RockMatterRuntimeObject matter = _matterObjects[0];
            Transform target = matter.transform;
            Vector3 oldPosition = target.position;
            Quaternion oldRotation = target.rotation;
            Vector3 cameraLocalPosition = target.InverseTransformPoint(camera.transform.position);
            Quaternion cameraLocalRotation = Quaternion.Inverse(target.rotation) * camera.transform.rotation;
            Capture(camera, beforePath, width, height);
            target.position = oldPosition + new Vector3(1.25f, 0.45f, -0.75f);
            target.rotation = oldRotation * Quaternion.Euler(0f, 37f, 11f);
            camera.transform.position = target.TransformPoint(cameraLocalPosition);
            camera.transform.rotation = target.rotation * cameraLocalRotation;
            Capture(camera, afterPath, width, height);
            target.position = oldPosition;
            target.rotation = oldRotation;
            camera.transform.position = target.TransformPoint(cameraLocalPosition);
            camera.transform.rotation = target.rotation * cameraLocalRotation;
        }

        public static void Capture(Camera camera, string path, int width = 1920, int height = 1080)
        {
            if (camera == null) throw new ArgumentNullException(nameof(camera));
            string fullPath = Path.GetFullPath(path);
            string directory = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
            var image = new Texture2D(width, height, TextureFormat.RGB24, false, false);
            RenderTexture target = RenderTexture.GetTemporary(width, height, 24, RenderTextureFormat.ARGB32,
                RenderTextureReadWrite.sRGB);
            RenderTexture oldTarget = camera.targetTexture;
            RenderTexture oldActive = RenderTexture.active;
            float oldAspect = camera.aspect;
            try
            {
                camera.aspect = (float)width / height;
                camera.targetTexture = target;
                var request = new RenderPipeline.StandardRequest { destination = target };
                if (!RenderPipeline.SupportsRenderRequest(camera, request))
                    throw new InvalidOperationException("The active Scriptable Render Pipeline does not support explicit camera render requests.");
                RenderPipeline.SubmitRenderRequest(camera, request);
                RenderTexture.active = target;
                image.ReadPixels(new Rect(0, 0, width, height), 0, 0, false);
                image.Apply(false, false);
                File.WriteAllBytes(fullPath, image.EncodeToPNG());
            }
            finally
            {
                camera.targetTexture = oldTarget;
                camera.aspect = oldAspect;
                RenderTexture.active = oldActive;
                RenderTexture.ReleaseTemporary(target);
                DestroyObject(image);
            }
        }

        private void Start()
        {
            if (_seedReports.Count == 0) Regenerate();
            string capture = ReadPlayerArgument("-u4-capture", _playerCaptureOutputPath);
            string metrics = ReadPlayerArgument("-u4-metrics", _playerMetricsOutputPath);
            if (!Application.isEditor && !string.IsNullOrEmpty(capture) && !string.IsNullOrEmpty(metrics))
            {
                _playerCaptureOutputPath = capture;
                _playerMetricsOutputPath = metrics;
                _quitAfterPlayerCapture = HasPlayerArgument("-u4-quit") || _quitAfterPlayerCapture;
                StartCoroutine(CapturePlayerObservation());
            }
        }

        private IEnumerator CapturePlayerObservation()
        {
            float started = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - started < 3f) yield return null;
            Camera camera = Camera.main;
            Capture(camera, _playerCaptureOutputPath, 1920, 1080);
            File.WriteAllText(_playerMetricsOutputPath, ReportJson());
            if (_quitAfterPlayerCapture) Application.Quit(0);
        }

        private void BuildSeed(int seed, int index)
        {
            var item = new RockStampSeedReport { seed = seed, profile = _profile };
            long generationStart = Stopwatch.GetTimestamp();
            RockFormationStamp stamp = RockFormationStampGenerator.Generate(seed, _profile);
            item.layoutName = stamp.LayoutName;
            item.parameterGenerationMilliseconds = ToMilliseconds(Stopwatch.GetTimestamp() - generationStart);
            long resolveStart = Stopwatch.GetTimestamp();
            RockStampResolution resolved = stamp.Resolve(_sampleSpacingMeters);
            item.scalarWorldResolutionMilliseconds = ToMilliseconds(Stopwatch.GetTimestamp() - resolveStart);
            item.occupiedSamples = resolved.OccupiedSamples;
            item.occupiedVolumeEstimateCubicMeters = resolved.OccupiedSamples * _sampleSpacingMeters * _sampleSpacingMeters * _sampleSpacingMeters;
            item.connectedResolvedComponents = resolved.ConnectedComponents;
            item.fieldHash = resolved.FieldHash.ToString("X16");
            item.primitiveDistribution = stamp.PrimitiveDistribution;
            item.primitiveCount = stamp.PrimitiveCount;
            MatterBounds sampleBounds = resolved.Bounds;
            item.boundsMeters = $"[{sampleBounds.MinInclusive.X * _sampleSpacingMeters:0.00},{sampleBounds.MinInclusive.Y * _sampleSpacingMeters:0.00},{sampleBounds.MinInclusive.Z * _sampleSpacingMeters:0.00}]..[{sampleBounds.MaxExclusive.X * _sampleSpacingMeters:0.00},{sampleBounds.MaxExclusive.Y * _sampleSpacingMeters:0.00},{sampleBounds.MaxExclusive.Z * _sampleSpacingMeters:0.00}]";
            if (resolved.ConnectedComponents != 1) item.rejectionReason = "resolved occupancy component count was " + resolved.ConnectedComponents;

            GameObject root = new GameObject("Matter Seed " + seed);
            root.transform.SetParent(transform, false);
            Vector3 gridPosition = GetGridPosition(index);
            root.transform.localPosition = gridPosition + new Vector3(-RockFormationStamp.AnchorX, 0.35f, -RockFormationStamp.AnchorZ);
            _ownedRoots.Add(root);
            if (_galleryLayout) CreateLabel(seed, gridPosition, index);

            IMatterMesher mesher = new MatterSurfaceNetsMesher();
            ulong meshHash = 14695981039346656037UL;
            const ulong prime = 1099511628211UL;
            MatterInt3 min = sampleBounds.MinInclusive;
            MatterInt3 max = sampleBounds.MaxExclusive;
            int minBx = MatterBrickLayout.FloorDiv(min.X, MatterBrickLayout.CellSize);
            int minBy = MatterBrickLayout.FloorDiv(min.Y, MatterBrickLayout.CellSize);
            int minBz = MatterBrickLayout.FloorDiv(min.Z, MatterBrickLayout.CellSize);
            int maxBx = MatterBrickLayout.FloorDiv(max.X - 1, MatterBrickLayout.CellSize);
            int maxBy = MatterBrickLayout.FloorDiv(max.Y - 1, MatterBrickLayout.CellSize);
            int maxBz = MatterBrickLayout.FloorDiv(max.Z - 1, MatterBrickLayout.CellSize);
            double snapshotMs = 0d, meshMs = 0d, fillMs = 0d, applyMs = 0d, uploadMs = 0d;
            Vector3 meshMin = new Vector3(float.PositiveInfinity, float.PositiveInfinity, float.PositiveInfinity);
            Vector3 meshMax = new Vector3(float.NegativeInfinity, float.NegativeInfinity, float.NegativeInfinity);
            for (int z = minBz; z <= maxBz; z++)
            for (int y = minBy; y <= maxBy; y++)
            for (int x = minBx; x <= maxBx; x++)
            {
                long snapshotStart = Stopwatch.GetTimestamp();
                MatterMeshingRegion region = MatterMeshingRegion.Capture(resolved.World, new MatterBrickAddress(x, y, z));
                snapshotMs += ToMilliseconds(Stopwatch.GetTimestamp() - snapshotStart);
                long meshStart = Stopwatch.GetTimestamp();
                MatterMeshData data = mesher.Generate(region);
                meshMs += ToMilliseconds(Stopwatch.GetTimestamp() - meshStart);
                HashMesh(ref meshHash, data.DeterministicHash, prime);
                item.vertices += data.Vertices.Length;
                item.triangles += data.TriangleCount;
                for (int vertex = 0; vertex < data.Vertices.Length; vertex++)
                {
                    MatterFloat3 p = data.Vertices[vertex].PositionMeters;
                    meshMin = Vector3.Min(meshMin, new Vector3(p.X, p.Y, p.Z));
                    meshMax = Vector3.Max(meshMax, new Vector3(p.X, p.Y, p.Z));
                }
                if (data.Indices.Length == 0) continue;
                MatterMeshPublicationTimings publication = MatterMeshPublisher.Publish(data,
                    "U4 Seed " + seed + " Brick " + x + "," + y + "," + z, out Mesh mesh);
                _ownedMeshes.Add(mesh);
                fillMs += publication.MeshDataFillMilliseconds;
                applyMs += publication.ApplyMilliseconds;
                uploadMs += publication.UploadMilliseconds;
                item.rawMatterAndMeshPayloadBytes += (long)data.Indices.Length * (72 + sizeof(uint));
                var chunk = new GameObject("Surface Nets " + x + "," + y + "," + z);
                chunk.transform.SetParent(root.transform, false);
                chunk.AddComponent<MeshFilter>().sharedMesh = mesh;
                MeshRenderer renderer = chunk.AddComponent<MeshRenderer>();
                renderer.sharedMaterial = _surfaceMaterialAsset;
                renderer.shadowCastingMode = ShadowCastingMode.On;
                renderer.receiveShadows = true;
                if (_wireframe)
                {
                    Mesh wire = MatterMeshPublisher.CreateWireframe(data, "U4 Wire " + seed);
                    if (wire != null)
                    {
                        _ownedMeshes.Add(wire);
                        var wireObject = new GameObject("Triangle Wire Overlay");
                        wireObject.transform.SetParent(chunk.transform, false);
                        wireObject.AddComponent<MeshFilter>().sharedMesh = wire;
                        MeshRenderer wireRenderer = wireObject.AddComponent<MeshRenderer>();
                        wireRenderer.sharedMaterial = GetWireMaterial();
                        wireRenderer.shadowCastingMode = ShadowCastingMode.Off;
                        wireRenderer.receiveShadows = false;
                    }
                }
            }
            item.rawMatterAndMeshPayloadBytes += (long)resolved.World.EditCount * MatterBrickLayout.RawBytesPerSample;
            var matterObject = root.AddComponent<RockMatterRuntimeObject>();
            matterObject.Initialize(resolved.World, _surfaceMaterialAsset);
            _matterObjects.Add(matterObject);
            item.snapshotMilliseconds = snapshotMs;
            item.surfaceNetsMilliseconds = meshMs;
            item.meshDataFillMilliseconds = fillMs;
            item.applyMilliseconds = applyMs;
            item.uploadMilliseconds = uploadMs;
            item.meshHash = meshHash.ToString("X16");
            if (item.vertices > 0 && meshMin.x < float.PositiveInfinity)
            {
                float width = meshMax.x - meshMin.x, height = meshMax.y - meshMin.y, depth = meshMax.z - meshMin.z;
                item.widthHeightRatio = height > 1e-6f ? width / height : 0f;
                item.depthHeightRatio = height > 1e-6f ? depth / height : 0f;
            }
            if (item.vertices == 0 || item.triangles == 0) item.rejectionReason = "Surface Nets produced no resolved surface triangles.";
            _seedReports.Add(item);
        }

        private Vector3 GetGridPosition(int index)
        {
            if (!_galleryLayout) return Vector3.zero;
            const int columns = 4;
            const float xSpacing = 9.1f;
            const float zSpacing = 7.8f;
            int rows = Mathf.CeilToInt(_seedCount / (float)columns);
            int column = index % columns;
            int row = index / columns;
            return new Vector3((column - (columns - 1) * 0.5f) * xSpacing, 0f,
                (row - (rows - 1) * 0.5f) * zSpacing);
        }

        private void CreateLabel(int seed, Vector3 gridPosition, int index)
        {
            Font font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            if (font == null || Camera.main == null) return;
            var label = new GameObject("Seed Label " + seed);
            label.transform.SetParent(transform, false);
            // Each caption belongs in the narrow gap between this row and the row behind it.
            // The farthest row needs no adjustment; screen-up/down is camera-relative because
            // the gallery camera is pitched above the scene.
            int rows = Mathf.CeilToInt(_seedCount / 4f);
            int row = index / 4;
            float rowDrop = row < rows - 1 ? -2.5f : 0f;
            label.transform.localPosition = gridPosition + new Vector3(0f, 7.2f, -2f) + Camera.main.transform.up * rowDrop;
            if (Camera.main != null) label.transform.rotation = Camera.main.transform.rotation;
            TextMesh text = label.AddComponent<TextMesh>();
            text.text = "SEED " + seed;
            text.font = font;
            text.fontSize = 72;
            text.characterSize = _galleryLayout ? 0.08f : 0.055f;
            text.anchor = TextAnchor.MiddleCenter;
            text.alignment = TextAlignment.Center;
            text.color = new Color(0.97f, 0.93f, 0.82f, 1f);
            _ownedLabels.Add(label);
        }

        private Material GetWireMaterial()
        {
            if (_wireMaterial == null)
                _wireMaterial = MatterMeshPublisher.CreateDebugMaterial(new Color(0.08f, 0.82f, 0.88f, 1f),
                    "U4 Triangle Wire", true);
            return _wireMaterial;
        }

        private void DestroyGenerated()
        {
            for (int i = 0; i < _ownedRoots.Count; i++) DestroyObject(_ownedRoots[i]);
            for (int i = 0; i < _ownedLabels.Count; i++) DestroyObject(_ownedLabels[i]);
            for (int i = 0; i < _ownedMeshes.Count; i++) DestroyObject(_ownedMeshes[i]);
            for (int i = 0; i < _ownedMaterials.Count; i++) DestroyObject(_ownedMaterials[i]);
            for (int i = 0; i < _ownedDebugMaterials.Count; i++) DestroyObject(_ownedDebugMaterials[i]);
            DestroyObject(_wireMaterial);
            _ownedRoots.Clear(); _ownedMeshes.Clear(); _ownedMaterials.Clear(); _matterObjects.Clear();
            _ownedLabels.Clear();
            _ownedDebugMaterials.Clear();
            _wireMaterial = null;

            // The ownership lists are intentionally runtime-only. If a preview was accidentally saved
            // into a tech scene, reopening it restores the child objects but not these lists. The view
            // transform is a dedicated generated-preview root, so clear any orphaned serialized children
            // before regenerating or preparing a player scene.
            for (int child = transform.childCount - 1; child >= 0; child--)
                DestroyObject(transform.GetChild(child).gameObject);
        }

        private void LateUpdate()
        {
            // PlayerLoop observation is diagnostic only; edit-mode camera rendering is not reported as player performance.
            if (!Application.isEditor && Time.unscaledDeltaTime > 0f)
                _frameMilliseconds.Add(Time.unscaledDeltaTime * 1000d);
        }

        private static void HashMesh(ref ulong hash, ulong value, ulong prime)
        {
            unchecked { for (int shift = 0; shift < 64; shift += 8) { hash ^= (byte)(value >> shift); hash *= prime; } }
        }

        private static double ToMilliseconds(long ticks) => ticks * 1000d / Stopwatch.Frequency;
        private static void DestroyObject(UnityEngine.Object value)
        {
            if (value == null) return;
            if (Application.isPlaying) UnityEngine.Object.Destroy(value);
            else UnityEngine.Object.DestroyImmediate(value);
        }
        private static string ReadPlayerArgument(string name, string fallback)
        {
            string[] args = Environment.GetCommandLineArgs();
            for (int i = 0; i + 1 < args.Length; i++) if (args[i] == name) return args[i + 1];
            return fallback;
        }
        private static bool HasPlayerArgument(string name)
        {
            string[] args = Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length; i++) if (args[i] == name) return true;
            return false;
        }

        private void OnDestroy() => DestroyGenerated();
    }

    /// <summary>Owns only resolved matter; the construction stamp is deliberately not retained.</summary>
    public sealed class RockMatterRuntimeObject : MonoBehaviour
    {
        public MatterWorld Authority { get; private set; }
        private Renderer[] _renderers;
        public void Initialize(MatterWorld authority, Material surface)
        {
            Authority = authority ?? throw new ArgumentNullException(nameof(authority));
            _renderers = GetComponentsInChildren<Renderer>(true);
            for (int i = 0; i < _renderers.Length; i++) _renderers[i].sharedMaterial = surface;
        }
        public void SetSurfaceMaterial(Material surface)
        {
            if (_renderers == null) _renderers = GetComponentsInChildren<Renderer>(true);
            for (int i = 0; i < _renderers.Length; i++) _renderers[i].sharedMaterial = surface;
        }
    }
}
