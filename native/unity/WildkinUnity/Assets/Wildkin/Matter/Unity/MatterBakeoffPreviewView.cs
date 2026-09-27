using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using UnityEngine;
using UnityEngine.Rendering;
using Wildkin.Matter;

namespace Wildkin.Matter.Unity
{
    [Serializable]
    public sealed class MatterBakeoffCase
    {
        public string label;
        public MatterFixtureId fixture;
        public MatterMesherKind mesher;
        public float spacingMeters = 0.5f;
        public Vector3 offset;
        public bool fullVolume = true;
        public bool wireframe;
    }

    [Serializable]
    public sealed class MatterBakeoffCaseReport
    {
        public string label;
        public string fixture;
        public string mesher;
        public int seed;
        public float spacingMeters;
        public int regionCount;
        public int scalarSampleCount;
        public int scalarMemoryBytes;
        public int sourceBrickCount;
        public int vertices;
        public int triangles;
        public int qefFallbackCount;
        public int qefClampedVertexCount;
        public string meshHashes;
        public long sourceRevision;
        public long managedAllocatedBytes;
        public bool managedAllocationBytesAvailable;
        public string managedAllocationMethod;
        public int gen0Collections;
        public double snapshotMilliseconds;
        public double pureMesherMilliseconds;
        public double meshDataFillMilliseconds;
        public double applyMilliseconds;
        public double uploadMilliseconds;
        public double totalRebuildMilliseconds;
    }

    /// <summary>
    /// Thin Unity view for the U3 comparison. The runtime path is the same World -> Snapshot ->
    /// pure mesher -> writable MeshData publisher path exercised by EditMode tests and benchmarks.
    /// </summary>
    public sealed class MatterBakeoffPreviewView : MonoBehaviour
    {
        [SerializeField] private int _seed = MatterFixtureSource.DefaultSeed;
        [SerializeField] private MatterBakeoffCase[] _cases = Array.Empty<MatterBakeoffCase>();
        [SerializeField] private string _playerCaptureOutputPath;
        [SerializeField] private string _playerMetricsOutputPath;
        [SerializeField] private bool _quitAfterPlayerCapture;
        [SerializeField] private Material _vertexColorMaterialAsset;

        private readonly List<Mesh> _ownedMeshes = new List<Mesh>();
        private readonly List<Material> _ownedMaterials = new List<Material>();
        private readonly List<MatterBakeoffCaseReport> _reports = new List<MatterBakeoffCaseReport>();
        private Material[] _surfaceMaterials;
        private Material _wireMaterial;

        public IReadOnlyList<MatterBakeoffCaseReport> Reports => _reports;
        public int Seed => _seed;

        private void Start()
        {
            Regenerate();
            string capturePath = ReadPlayerArgument("-u3-capture", _playerCaptureOutputPath);
            string metricsPath = ReadPlayerArgument("-u3-metrics", _playerMetricsOutputPath);
            bool quitAfterCapture = _quitAfterPlayerCapture || HasPlayerArgument("-u3-quit");
            if (!Application.isEditor && !string.IsNullOrEmpty(capturePath) &&
                !string.IsNullOrEmpty(metricsPath))
            {
                _playerCaptureOutputPath = capturePath;
                _playerMetricsOutputPath = metricsPath;
                _quitAfterPlayerCapture = quitAfterCapture;
                StartCoroutine(CapturePlayerObservation());
            }
        }

        public void Configure(int seed, MatterBakeoffCase[] cases,
            string playerCaptureOutputPath = null, string playerMetricsOutputPath = null,
            bool quitAfterPlayerCapture = false, Material vertexColorMaterialAsset = null)
        {
            if (cases == null || cases.Length == 0) throw new ArgumentException("At least one comparison case is required.", nameof(cases));
            _seed = seed;
            _cases = (MatterBakeoffCase[])cases.Clone();
            _playerCaptureOutputPath = playerCaptureOutputPath;
            _playerMetricsOutputPath = playerMetricsOutputPath;
            _quitAfterPlayerCapture = quitAfterPlayerCapture;
            if (vertexColorMaterialAsset != null) _vertexColorMaterialAsset = vertexColorMaterialAsset;
            Regenerate();
        }

        public void Regenerate()
        {
            DestroyGenerated();
            _reports.Clear();
            EnsureMaterials();
            for (int caseIndex = 0; caseIndex < _cases.Length; caseIndex++)
                BuildCase(_cases[caseIndex]);
        }

        public string ReportJson()
        {
            var wrapper = new ReportWrapper { seed = _seed, cases = _reports.ToArray() };
            return JsonUtility.ToJson(wrapper, true);
        }

        private void BuildCase(MatterBakeoffCase item)
        {
            if (item == null) throw new InvalidOperationException("Comparison case cannot be null.");
            IMatterMesher mesher = item.mesher == MatterMesherKind.SurfaceNets
                ? (IMatterMesher)new MatterSurfaceNetsMesher()
                : new MatterDualContouringMesher();
            MatterWorld world = MatterFixtureWorldFactory.Create(item.fixture, item.spacingMeters, _seed);
            GameObject caseObject = new GameObject(string.IsNullOrEmpty(item.label) ? item.fixture + " " + item.mesher : item.label);
            caseObject.transform.SetParent(transform, false);
            caseObject.transform.localPosition = item.offset;
            CreateLabel(caseObject.transform, caseObject.name);

            MatterBakeoffCaseReport report = new MatterBakeoffCaseReport
            {
                label = caseObject.name,
                fixture = item.fixture.ToString(),
                mesher = item.mesher.ToString(),
                seed = _seed,
                spacingMeters = item.spacingMeters,
                sourceRevision = world.Revision
            };
            bool canMeasureManagedBytes = MatterManagedAllocationCounter.IsAvailable;
            long allocatedBefore = canMeasureManagedBytes ? GC.GetAllocatedBytesForCurrentThread() : -1L;
            int gcBefore = GC.CollectionCount(0);
            double totalRebuild = 0d;
            double snapshotMilliseconds = 0d, pureMesherMilliseconds = 0d;
            double fillMilliseconds = 0d, applyMilliseconds = 0d, uploadMilliseconds = 0d;
            var hashes = new List<string>();

            int minBrick = item.fullVolume ? -1 : 0;
            int maxBrick = 0;
            for (int z = minBrick; z <= maxBrick; z++)
            for (int y = minBrick; y <= maxBrick; y++)
            for (int x = minBrick; x <= maxBrick; x++)
            {
                long captureStart = Stopwatch.GetTimestamp();
                MatterMeshingRegion region = MatterMeshingRegion.Capture(world, new MatterBrickAddress(x, y, z));
                snapshotMilliseconds += ToMilliseconds(Stopwatch.GetTimestamp() - captureStart);
                report.scalarSampleCount += region.ScalarSampleCount;
                report.scalarMemoryBytes += region.ScalarBytes;

                long generateStart = Stopwatch.GetTimestamp();
                MatterMeshData data = mesher.Generate(region);
                pureMesherMilliseconds += ToMilliseconds(Stopwatch.GetTimestamp() - generateStart);
                report.vertices += data.Vertices.Length;
                report.triangles += data.TriangleCount;
                report.qefFallbackCount += data.QefFallbackCount;
                report.qefClampedVertexCount += data.QefClampedVertexCount;
                hashes.Add(data.DeterministicHash.ToString("X16"));
                if (data.Vertices.Length == 0 || data.Indices.Length == 0) continue;

                MatterMeshPublicationTimings timing = MatterMeshPublisher.Publish(data,
                    caseObject.name + " Brick " + x + "," + y + "," + z, out Mesh mesh);
                fillMilliseconds += timing.MeshDataFillMilliseconds;
                applyMilliseconds += timing.ApplyMilliseconds;
                uploadMilliseconds += timing.UploadMilliseconds;
                _ownedMeshes.Add(mesh);
                var chunk = new GameObject("Mesh Brick " + x + "," + y + "," + z);
                chunk.transform.SetParent(caseObject.transform, false);
                chunk.AddComponent<MeshFilter>().sharedMesh = mesh;
                MeshRenderer renderer = chunk.AddComponent<MeshRenderer>();
                renderer.sharedMaterials = _surfaceMaterials;
                renderer.shadowCastingMode = ShadowCastingMode.Off;
                renderer.receiveShadows = true;

                if (item.wireframe)
                {
                    Mesh wire = MatterMeshPublisher.CreateWireframe(data, mesh.name + " Wireframe");
                    if (wire != null)
                    {
                        _ownedMeshes.Add(wire);
                        var overlay = new GameObject("Triangle Wire Overlay");
                        overlay.transform.SetParent(chunk.transform, false);
                        overlay.AddComponent<MeshFilter>().sharedMesh = wire;
                        MeshRenderer overlayRenderer = overlay.AddComponent<MeshRenderer>();
                        overlayRenderer.sharedMaterial = _wireMaterial;
                        overlayRenderer.shadowCastingMode = ShadowCastingMode.Off;
                        overlayRenderer.receiveShadows = false;
                    }
                }
            }

            report.regionCount = item.fullVolume ? 8 : 1;
            report.sourceBrickCount = world.MaterializedBrickCount;
            report.meshHashes = string.Join(";", hashes);
            report.gen0Collections = GC.CollectionCount(0) - gcBefore;
            report.managedAllocationBytesAvailable = canMeasureManagedBytes;
            report.managedAllocationMethod = MatterManagedAllocationCounter.Description;
            report.managedAllocatedBytes = canMeasureManagedBytes
                ? GC.GetAllocatedBytesForCurrentThread() - allocatedBefore
                : -1L;
            report.snapshotMilliseconds = snapshotMilliseconds;
            report.pureMesherMilliseconds = pureMesherMilliseconds;
            report.meshDataFillMilliseconds = fillMilliseconds;
            report.applyMilliseconds = applyMilliseconds;
            report.uploadMilliseconds = uploadMilliseconds;
            totalRebuild = snapshotMilliseconds + pureMesherMilliseconds + fillMilliseconds + applyMilliseconds + uploadMilliseconds;
            report.totalRebuildMilliseconds = totalRebuild;
            _reports.Add(report);
        }

        private void EnsureMaterials()
        {
            if (_surfaceMaterials != null) return;
            _surfaceMaterials = new[]
            {
                CreateMaterial("U3 Rock Gray"),
                CreateMaterial("U3 Dirt Ochre")
            };
            MatterRgbColor wireColor = new MatterRgbColor(0.05f, 0.85f, 0.92f);
            _wireMaterial = MatterMeshPublisher.CreateDebugMaterial(
                new Color(wireColor.R, wireColor.G, wireColor.B, 1f), "U3 Triangle Wire", true);
            _ownedMaterials.AddRange(_surfaceMaterials);
            _ownedMaterials.Add(_wireMaterial);
        }

        private Material CreateMaterial(string materialName)
        {
            if (_vertexColorMaterialAsset == null)
                return MatterMeshPublisher.CreateVertexColorMaterial(materialName);
            Material material = new Material(_vertexColorMaterialAsset) { name = materialName, enableInstancing = true };
            return material;
        }

        private static void CreateLabel(Transform caseRoot, string text)
        {
            Font font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            if (font == null) return;
            var label = new GameObject("Label " + text);
            label.transform.SetParent(caseRoot, false);
            label.transform.localPosition = new Vector3(0f, 3.8f, -0.1f);
            if (Camera.main != null) label.transform.rotation = Camera.main.transform.rotation;
            TextMesh textMesh = label.AddComponent<TextMesh>();
            textMesh.text = text;
            textMesh.font = font;
            textMesh.fontSize = 48;
            textMesh.characterSize = 0.05f;
            textMesh.anchor = TextAnchor.MiddleCenter;
            textMesh.alignment = TextAlignment.Center;
            textMesh.color = new Color(0.95f, 0.96f, 0.98f, 1f);
        }

        private IEnumerator CapturePlayerObservation()
        {
            yield return new WaitForEndOfFrame();
            try
            {
                string json = ReportJson();
                string metricsDirectory = System.IO.Path.GetDirectoryName(_playerMetricsOutputPath);
                if (!string.IsNullOrEmpty(metricsDirectory)) System.IO.Directory.CreateDirectory(metricsDirectory);
                System.IO.File.WriteAllText(_playerMetricsOutputPath, json);
                string captureDirectory = System.IO.Path.GetDirectoryName(_playerCaptureOutputPath);
                if (!string.IsNullOrEmpty(captureDirectory)) System.IO.Directory.CreateDirectory(captureDirectory);
                ScreenCapture.CaptureScreenshot(_playerCaptureOutputPath, 2);
                yield return new WaitForSeconds(2f);
            }
            finally
            {
                if (_quitAfterPlayerCapture) Application.Quit(0);
            }
        }

        private void DestroyGenerated()
        {
            for (int i = 0; i < _ownedMeshes.Count; i++) DestroyObject(_ownedMeshes[i]);
            _ownedMeshes.Clear();
            for (int i = 0; i < _ownedMaterials.Count; i++) DestroyObject(_ownedMaterials[i]);
            _ownedMaterials.Clear();
            _surfaceMaterials = null;
            _wireMaterial = null;
            for (int child = transform.childCount - 1; child >= 0; child--)
                DestroyObject(transform.GetChild(child).gameObject);
        }

        private void DestroyObject(UnityEngine.Object value)
        {
            if (value == null) return;
            if (Application.isPlaying) Destroy(value);
            else DestroyImmediate(value);
        }

        private static double ToMilliseconds(long ticks) => ticks * 1000.0 / Stopwatch.Frequency;

        private static string ReadPlayerArgument(string flag, string fallback)
        {
            string[] arguments = Environment.GetCommandLineArgs();
            for (int i = 0; i < arguments.Length; i++)
            {
                if (arguments[i].StartsWith(flag + "=", StringComparison.Ordinal))
                    return arguments[i].Substring(flag.Length + 1);
                if (arguments[i] == flag && i + 1 < arguments.Length)
                    return arguments[i + 1];
            }
            return fallback;
        }

        private static bool HasPlayerArgument(string flag)
        {
            string[] arguments = Environment.GetCommandLineArgs();
            for (int i = 0; i < arguments.Length; i++)
                if (arguments[i] == flag) return true;
            return false;
        }

        private void OnDestroy() => DestroyGenerated();

        [Serializable]
        private sealed class ReportWrapper
        {
            public int seed;
            public MatterBakeoffCaseReport[] cases;
        }
    }
}
