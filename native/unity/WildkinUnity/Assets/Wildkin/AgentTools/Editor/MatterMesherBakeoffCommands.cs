using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Diagnostics;
using Unity.Pipeline.Commands;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.HighDefinition;
using UnityEngine.SceneManagement;
using Wildkin.Matter;
using Wildkin.Matter.Unity;

namespace Wildkin.AgentTools.Editor
{
    /// <summary>U3 authoring and evidence commands. Every path starts with the shared MatterWorld authority.</summary>
    public static class MatterMesherBakeoffCommands
    {
        public const string SceneAssetPath = "Assets/Wildkin/Scenes/Tech/U3MesherResolution.unity";
        private const string VolumeProfilePath = "Assets/Wildkin/Matter/Debug/U3BakeoffExposure.asset";
        private const string VertexColorMaterialPath = "Assets/Wildkin/Matter/Debug/U3VertexColor.mat";
        private const float BenchmarkDomainExtentMeters = 16f;
        private const int BenchmarkRuns = 5;

        [CliCommand("u3_bakeoff_create_preview",
            "Create a matched single-fixture preview for one frozen source, mesher, and uniform resolution.",
            MainThreadRequired = true, Tags = new[] { "matter", "u3", "scenes" })]
        public static string CreatePreview(
            [CliArg("fixture", "SmoothOrganic | LayeredRock | CliffCave | MaterialBoundary | MinedCavity | DetachedIrregular.")] string fixture = "LayeredRock",
            [CliArg("mesher", "SurfaceNets or DualContouring.")] string mesher = "SurfaceNets",
            [CliArg("resolution", "Uniform sample spacing in metres (0.5 or 0.25).")] float resolution = 0.5f,
            [CliArg("wireframe", "Overlay triangle edges for topology inspection.")] bool wireframe = false,
            [CliArg("full_volume", "Render the matching eight half-open bricks around the fixture.")] bool fullVolume = true)
        {
            MatterFixtureId fixtureId = ParseEnum<MatterFixtureId>(fixture);
            MatterMesherKind mesherKind = ParseEnum<MatterMesherKind>(mesher);
            ValidateResolution(resolution);
            var item = new MatterBakeoffCase
            {
                label = fixtureId + " / " + mesherKind + " / " + resolution.ToString("0.00") + "m",
                fixture = fixtureId,
                mesher = mesherKind,
                spacingMeters = resolution,
                offset = Vector3.zero,
                fullVolume = fullVolume,
                wireframe = wireframe
            };
            return CreateScene(new[] { item }, CameraMode.Hero);
        }

        [CliCommand("u3_bakeoff_create_comparison_board",
            "Generate the six-field matched Surface Nets/Dual Contouring and 0.50m/0.25m comparison board.",
            MainThreadRequired = true, Tags = new[] { "matter", "u3", "scenes" })]
        public static string CreateComparisonBoard()
        {
            var cases = new MatterBakeoffCase[24];
            MatterFixtureId[] fixtures = (MatterFixtureId[])Enum.GetValues(typeof(MatterFixtureId));
            MatterMesherKind[] meshers = { MatterMesherKind.SurfaceNets, MatterMesherKind.DualContouring,
                MatterMesherKind.SurfaceNets, MatterMesherKind.DualContouring };
            float[] resolutions = { 0.5f, 0.5f, 0.25f, 0.25f };
            for (int row = 0; row < fixtures.Length; row++)
            for (int column = 0; column < 4; column++)
            {
                int index = row * 4 + column;
                float x = (column - 1.5f) * 8.0f;
                float z = (row - 2.5f) * 8.2f;
                cases[index] = CreateCase(fixtures[row], meshers[column], resolutions[column],
                    x, z, fullVolume: true, wireframe: false,
                    label: fixtures[row] + "  " + ShortMesher(meshers[column]) + "  " + resolutions[column].ToString("0.00") + "m");
            }
            return CreateScene(cases, CameraMode.Board);
        }

        [CliCommand("u3_bakeoff_create_hero_pair",
            "Generate a matched Surface Nets and Dual Contouring hero pair for a frozen rock or cliff field.",
            MainThreadRequired = true, Tags = new[] { "matter", "u3", "scenes" })]
        public static string CreateHeroPair(
            [CliArg("fixture", "Frozen fixture name; use LayeredRock or CliffCave for the hero pairs.")] string fixture = "LayeredRock",
            [CliArg("resolution", "Shared sample spacing in metres.")] float resolution = 0.5f)
        {
            MatterFixtureId fixtureId = ParseEnum<MatterFixtureId>(fixture);
            ValidateResolution(resolution);
            var cases = new[]
            {
                CreateCase(fixtureId, MatterMesherKind.SurfaceNets, resolution, -3.9f, 0f, true, false,
                    "Surface Nets  " + resolution.ToString("0.00") + "m"),
                CreateCase(fixtureId, MatterMesherKind.DualContouring, resolution, 3.9f, 0f, true, false,
                    "Dual Contouring  " + resolution.ToString("0.00") + "m")
            };
            return CreateScene(cases, CameraMode.HeroPair);
        }

        [CliCommand("u3_bakeoff_create_seam_pair",
            "Generate same-resolution adjacent-brick seam close-ups with the debug edge overlay off and on.",
            MainThreadRequired = true, Tags = new[] { "matter", "u3", "seams" })]
        public static string CreateSeamPair(
            [CliArg("fixture", "Frozen fixture, default SmoothOrganic.")] string fixture = "SmoothOrganic",
            [CliArg("mesher", "SurfaceNets or DualContouring.")] string mesher = "DualContouring",
            [CliArg("resolution", "Same spacing on both sides of the tested seams.")] float resolution = 0.5f)
        {
            MatterFixtureId fixtureId = ParseEnum<MatterFixtureId>(fixture);
            MatterMesherKind mesherKind = ParseEnum<MatterMesherKind>(mesher);
            ValidateResolution(resolution);
            var cases = new[]
            {
                CreateCase(fixtureId, mesherKind, resolution, -4f, 0f, true, false, "Seam / overlay OFF"),
                CreateCase(fixtureId, mesherKind, resolution, 4f, 0f, true, true, "Seam / overlay ON")
            };
            return CreateScene(cases, CameraMode.Seam);
        }

        [CliCommand("u3_bakeoff_create_material_closeup",
            "Generate a matched rock/dirt boundary close-up using the same authority and runtime mesh path.",
            MainThreadRequired = true, Tags = new[] { "matter", "u3", "materials" })]
        public static string CreateMaterialBoundaryCloseup(
            [CliArg("mesher", "SurfaceNets or DualContouring.")] string mesher = "DualContouring",
            [CliArg("resolution", "Sample spacing in metres.")] float resolution = 0.25f)
        {
            MatterMesherKind mesherKind = ParseEnum<MatterMesherKind>(mesher);
            ValidateResolution(resolution);
            return CreateScene(new[] { CreateCase(MatterFixtureId.MaterialBoundary, mesherKind, resolution,
                0f, 0f, true, false, "Rock / Dirt Material Boundary  " + resolution.ToString("0.00") + "m") },
                CameraMode.Closeup);
        }

        [CliCommand("u3_bakeoff_create_wireframe",
            "Generate a matched layered-rock triangulation view with a small depth-biased triangle-edge overlay.",
            MainThreadRequired = true, Tags = new[] { "matter", "u3", "topology" })]
        public static string CreateWireframe(
            [CliArg("mesher", "SurfaceNets or DualContouring.")] string mesher = "DualContouring",
            [CliArg("resolution", "Sample spacing in metres.")] float resolution = 0.5f)
        {
            MatterMesherKind mesherKind = ParseEnum<MatterMesherKind>(mesher);
            ValidateResolution(resolution);
            return CreateScene(new[] { CreateCase(MatterFixtureId.LayeredRock, mesherKind, resolution,
                0f, 0f, true, true, "Layered Rock / Triangle Wireframe") }, CameraMode.Closeup);
        }

        [CliCommand("u3_bakeoff_create_local_refinement_pair",
            "Compare a 0.50m base rock/cliff volume with a bounded 0.25m central-region refinement sample.",
            MainThreadRequired = true, Tags = new[] { "matter", "u3", "refinement" })]
        public static string CreateLocalRefinementPair(
            [CliArg("fixture", "Frozen fixture, default CliffCave.")] string fixture = "CliffCave",
            [CliArg("mesher", "SurfaceNets or DualContouring.")] string mesher = "DualContouring")
        {
            MatterFixtureId fixtureId = ParseEnum<MatterFixtureId>(fixture);
            MatterMesherKind mesherKind = ParseEnum<MatterMesherKind>(mesher);
            var cases = new[]
            {
                CreateCase(fixtureId, mesherKind, 0.5f, -4.5f, 0f, true, false, "Base 0.50m / full field"),
                // The finer eight-brick footprint is half-width in world space ([-4,4]); it is an
                // isolated detail sample and intentionally does not claim a stitched transition.
                CreateCase(fixtureId, mesherKind, 0.25f, 4.5f, 0f, true, true, "Local 0.25m / bounded region")
            };
            return CreateScene(cases, CameraMode.HeroPair);
        }

        [CliCommand("u3_bakeoff_regenerate",
            "Rebuild the active U3 preview from its frozen fixture settings and authoritative MatterWorld.",
            MainThreadRequired = true, Tags = new[] { "matter", "u3", "mesh" })]
        public static string RegeneratePreview()
        {
            MatterBakeoffPreviewView view = UnityEngine.Object.FindObjectOfType<MatterBakeoffPreviewView>();
            if (view == null) throw new InvalidOperationException("No U3 matter preview is present in the active scene.");
            view.Regenerate();
            return view.ReportJson();
        }

        [CliCommand("u3_bakeoff_report",
            "Return authoritative source, mesh, and runtime publication statistics for the active U3 comparison.",
            MainThreadRequired = true, Tags = new[] { "matter", "u3", "observability" })]
        public static string ReportPreview()
        {
            MatterBakeoffPreviewView view = UnityEngine.Object.FindObjectOfType<MatterBakeoffPreviewView>();
            if (view == null) throw new InvalidOperationException("No U3 matter preview is present in the active scene.");
            return view.ReportJson();
        }

        [CliCommand("u3_bakeoff_save_report",
            "Save the active preview's authoritative runtime mesh report under the U3 evidence folder.",
            MainThreadRequired = true, Tags = new[] { "matter", "u3", "evidence" })]
        public static string SavePreviewReport(
            [CliArg("filename", "Evidence filename, without a directory.")] string filename = "active-preview-report.json")
        {
            if (string.IsNullOrWhiteSpace(filename) || Path.GetFileName(filename) != filename ||
                !filename.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
                throw new ArgumentException("Use a simple .json filename without directory components.", nameof(filename));
            MatterBakeoffPreviewView view = UnityEngine.Object.FindObjectOfType<MatterBakeoffPreviewView>();
            if (view == null) throw new InvalidOperationException("No U3 matter preview is present in the active scene.");
            string path = GetEvidencePath(filename);
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            File.WriteAllText(path, view.ReportJson());
            return "{\"evidencePath\":\"" + EscapeJson(path) + "\",\"caseCount\":" + view.Reports.Count + "}";
        }

        [CliCommand("u3_bakeoff_capture",
            "Capture the active comparison camera to a deterministic PNG path at the requested resolution.",
            MainThreadRequired = true, Tags = new[] { "matter", "u3", "capture" })]
        public static string Capture(
            [CliArg("path", "Absolute PNG output path.")] string path,
            [CliArg("width", "Output width in pixels.")] int width = 1920,
            [CliArg("height", "Output height in pixels.")] int height = 1080)
        {
            if (width < 320 || height < 240) throw new ArgumentOutOfRangeException(nameof(width), "Capture dimensions are too small.");
            Camera camera = Camera.main;
            if (camera == null) throw new InvalidOperationException("The U3 preview scene has no MainCamera.");
            string fullPath = Path.GetFullPath(path);
            string directory = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
            var texture = new Texture2D(width, height, TextureFormat.RGB24, false, false);
            RenderTexture target = RenderTexture.GetTemporary(width, height, 24, RenderTextureFormat.ARGB32,
                RenderTextureReadWrite.sRGB);
            RenderTexture oldTarget = camera.targetTexture;
            RenderTexture oldActive = RenderTexture.active;
            float oldAspect = camera.aspect;
            try
            {
                camera.aspect = (float)width / height;
                camera.targetTexture = target;
                camera.Render();
                RenderTexture.active = target;
                texture.ReadPixels(new Rect(0, 0, width, height), 0, 0, false);
                texture.Apply(false, false);
                File.WriteAllBytes(fullPath, texture.EncodeToPNG());
            }
            finally
            {
                camera.targetTexture = oldTarget;
                camera.aspect = oldAspect;
                RenderTexture.active = oldActive;
                RenderTexture.ReleaseTemporary(target);
                UnityEngine.Object.DestroyImmediate(texture);
            }
            return "{\"path\":\"" + EscapeJson(fullPath) + "\",\"width\":" + width + ",\"height\":" + height + "}";
        }

        [CliCommand("u3_bakeoff_benchmark_matrix",
            "Run five measured fresh-world rebuilds per fixture/mesher/resolution over a matched 16m cube after one warm-up.",
            MainThreadRequired = true, Tags = new[] { "matter", "u3", "benchmark" })]
        public static string RunBenchmarkMatrix(
            [CliArg("runs", "Measured repetitions per matrix row (3-9).")]
            int runs = BenchmarkRuns)
        {
            if (runs < 3 || runs > 9) throw new ArgumentOutOfRangeException(nameof(runs), "Use 3-9 repeated runs.");
            var rows = new List<BenchmarkRow>();
            MatterFixtureId[] fixtures = (MatterFixtureId[])Enum.GetValues(typeof(MatterFixtureId));
            MatterMesherKind[] meshers = (MatterMesherKind[])Enum.GetValues(typeof(MatterMesherKind));
            float[] spacings = { 0.5f, 0.25f };
            foreach (MatterFixtureId fixture in fixtures)
            foreach (MatterMesherKind mesher in meshers)
            foreach (float spacing in spacings)
            {
                int bricksPerAxis = Mathf.RoundToInt(BenchmarkDomainExtentMeters /
                    (MatterBrickLayout.CellSize * spacing));
                float measuredExtent = bricksPerAxis * MatterBrickLayout.CellSize * spacing;
                if (Mathf.Abs(measuredExtent - BenchmarkDomainExtentMeters) > 1e-4f)
                    throw new InvalidOperationException("Benchmark resolution does not divide the matched physical domain.");
                RunOne(fixture, mesher, spacing, bricksPerAxis, false); // unmeasured warm-up
                var measured = new List<BenchmarkMeasurement>(runs);
                for (int repetition = 0; repetition < runs; repetition++)
                {
                    GC.Collect();
                    measured.Add(RunOne(fixture, mesher, spacing, bricksPerAxis, true));
                }
                rows.Add(Summarize(fixture, mesher, spacing, measuredExtent, bricksPerAxis, measured));
            }

            var output = new BenchmarkReport
            {
                unityVersion = Application.unityVersion,
                platform = Application.platform.ToString(),
                seed = MatterFixtureSource.DefaultSeed,
                warmupRunsPerRow = 1,
                measuredRunsPerRow = runs,
                matchedPhysicalDomainMeters = BenchmarkDomainExtentMeters,
                physicalDomainRationale = "Each dataset is sampled over the same aligned 16m cube centered around sample origin; .50m uses 2^3 meshing regions and .25m uses 4^3 regions.",
                sampleWindow = "18^3 scalar values per 16^3 half-open cell region; includes 17^3 core corners and a one-sample negative edge-owner halo",
                statistics = "median and nearest-rank p95; with five runs p95 equals the maximum measured run",
                managedAllocationMeasurement = MatterManagedAllocationCounter.Description,
                rows = rows.ToArray()
            };
            string json = JsonUtility.ToJson(output, true);
            string outputPath = GetEvidencePath("benchmark-matrix-editor.json");
            Directory.CreateDirectory(Path.GetDirectoryName(outputPath));
            File.WriteAllText(outputPath, json);
            output.evidencePath = outputPath;
            json = JsonUtility.ToJson(output, true);
            File.WriteAllText(outputPath, json);
            return json;
        }

        [CliCommand("u3_bakeoff_build_windows_development",
            "Build the U3 runtime preview scene as a Windows x64 Development Player and write build provenance.",
            MainThreadRequired = true, Tags = new[] { "matter", "u3", "build" })]
        public static string BuildWindowsDevelopment(
            [CliArg("output", "Absolute output path for the .exe.")] string output = "Builds/U3-MesherResolution/Wildkin-U3.exe")
        {
            if (!File.Exists(Path.Combine(Application.dataPath, "Wildkin/Scenes/Tech/U3MesherResolution.unity")))
                throw new FileNotFoundException("Create a U3 preview scene before building.", SceneAssetPath);
            string outputPath = Path.GetFullPath(output);
            string outputDirectory = Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(outputDirectory)) Directory.CreateDirectory(outputDirectory);
            EditorSceneManager.SaveOpenScenes();
            var options = new BuildPlayerOptions
            {
                scenes = new[] { SceneAssetPath },
                locationPathName = outputPath,
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.Development | BuildOptions.AllowDebugging
            };
            BuildReport build = BuildPipeline.BuildPlayer(options);
            if (build.summary.result != BuildResult.Succeeded)
                throw new InvalidOperationException("U3 Windows Development Build ended with " + build.summary.result +
                    " (" + build.summary.totalErrors + " errors).");
            var provenance = new BuildProvenance
            {
                unityVersion = Application.unityVersion,
                activeBuildTarget = EditorUserBuildSettings.activeBuildTarget.ToString(),
                requestedBuildTarget = BuildTarget.StandaloneWindows64.ToString(),
                result = build.summary.result.ToString(),
                outputPath = outputPath,
                totalSizeBytes = build.summary.totalSize,
                totalErrors = build.summary.totalErrors,
                totalWarnings = build.summary.totalWarnings,
                elapsedSeconds = build.summary.totalTime.TotalSeconds,
                scenePath = SceneAssetPath,
                options = "Development, AllowDebugging"
            };
            string json = JsonUtility.ToJson(provenance, true);
            string provenancePath = GetEvidencePath("build-provenance.json");
            Directory.CreateDirectory(Path.GetDirectoryName(provenancePath));
            File.WriteAllText(provenancePath, json);
            provenance.evidencePath = provenancePath;
            json = JsonUtility.ToJson(provenance, true);
            File.WriteAllText(provenancePath, json);
            return json;
        }

        private static string CreateScene(MatterBakeoffCase[] cases, CameraMode cameraMode)
        {
            Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            scene.name = "U3MesherResolution";
            ConfigureRenderEnvironment(cameraMode);
            Material vertexColorMaterial = LoadOrCreateVertexColorMaterial();
            var root = new GameObject("U3 Matter Bakeoff");
            MatterBakeoffPreviewView view = root.AddComponent<MatterBakeoffPreviewView>();
            view.Configure(MatterFixtureSource.DefaultSeed, cases, vertexColorMaterialAsset: vertexColorMaterial);
            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene, SceneAssetPath);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            return view.ReportJson();
        }

        private static Material LoadOrCreateVertexColorMaterial()
        {
            Material material = AssetDatabase.LoadAssetAtPath<Material>(VertexColorMaterialPath);
            if (material != null) return material;
            material = MatterMeshPublisher.CreateVertexColorMaterial("U3 Vertex Ramp");
            AssetDatabase.CreateAsset(material, VertexColorMaterialPath);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            return material;
        }

        private static void ConfigureRenderEnvironment(CameraMode mode)
        {
            Camera camera = CreateCamera(mode);
            camera.tag = "MainCamera";
            HDAdditionalCameraData additional = camera.gameObject.AddComponent<HDAdditionalCameraData>();
            additional.clearColorMode = HDAdditionalCameraData.ClearColorMode.Color;
            additional.backgroundColorHDR = camera.backgroundColor;
            additional.volumeLayerMask = 1;

            var lightObject = new GameObject("U3 Comparison Key Light");
            lightObject.transform.rotation = Quaternion.Euler(32f, -28f, 0f);
            Light key = lightObject.AddComponent<Light>();
            key.type = LightType.Directional;
            key.intensity = 2.0f;
            key.color = new Color(1f, 0.93f, 0.82f);
            key.shadows = LightShadows.Soft;

            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.16f, 0.18f, 0.22f);
            VolumeProfile sharedProfile = LoadOrCreateFixedExposureProfile();
            var volumeObject = new GameObject("U3 Fixed Exposure");
            Volume volume = volumeObject.AddComponent<Volume>();
            volume.isGlobal = true;
            volume.priority = 100f;
            volume.sharedProfile = sharedProfile;
        }

        private static VolumeProfile LoadOrCreateFixedExposureProfile()
        {
            VolumeProfile profile = AssetDatabase.LoadAssetAtPath<VolumeProfile>(VolumeProfilePath);
            if (profile != null) return profile;
            profile = ScriptableObject.CreateInstance<VolumeProfile>();
            profile.name = "U3 Bakeoff Fixed Exposure";
            AssetDatabase.CreateAsset(profile, VolumeProfilePath);
            Exposure exposure = profile.Add<Exposure>(true);
            exposure.mode.overrideState = true;
            exposure.mode.value = ExposureMode.Fixed;
            exposure.fixedExposure.overrideState = true;
            exposure.fixedExposure.value = 0f;
            EditorUtility.SetDirty(profile);
            AssetDatabase.SaveAssets();
            return profile;
        }

        private static Camera CreateCamera(CameraMode mode)
        {
            var cameraObject = new GameObject("U3 Matter Comparison Camera");
            Camera camera = cameraObject.AddComponent<Camera>();
            camera.orthographic = true;
            camera.nearClipPlane = 0.1f;
            camera.farClipPlane = 250f;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.075f, 0.09f, 0.115f, 1f);
            switch (mode)
            {
                case CameraMode.Board:
                    camera.orthographicSize = 21.0f;
                    cameraObject.transform.position = new Vector3(0f, 44f, -57f);
                    cameraObject.transform.LookAt(Vector3.zero);
                    break;
                case CameraMode.Seam:
                    camera.orthographicSize = 4.8f;
                    cameraObject.transform.position = new Vector3(0f, 10f, -18f);
                    cameraObject.transform.LookAt(Vector3.zero);
                    break;
                case CameraMode.Closeup:
                    camera.orthographicSize = 4.3f;
                    cameraObject.transform.position = new Vector3(7f, 6f, -10f);
                    cameraObject.transform.LookAt(Vector3.zero);
                    break;
                case CameraMode.HeroPair:
                    camera.orthographicSize = 5.5f;
                    cameraObject.transform.position = new Vector3(0f, 13f, -18f);
                    cameraObject.transform.LookAt(Vector3.zero);
                    break;
                default:
                    camera.orthographicSize = 5.5f;
                    cameraObject.transform.position = new Vector3(8f, 7f, -12f);
                    cameraObject.transform.LookAt(Vector3.zero);
                    break;
            }
            return camera;
        }

        private static MatterBakeoffCase CreateCase(MatterFixtureId fixture, MatterMesherKind mesher,
            float spacing, float x, float z, bool fullVolume, bool wireframe, string label)
        {
            ValidateResolution(spacing);
            return new MatterBakeoffCase
            {
                label = label,
                fixture = fixture,
                mesher = mesher,
                spacingMeters = spacing,
                offset = new Vector3(x, 0f, z),
                fullVolume = fullVolume,
                wireframe = wireframe
            };
        }

        private static BenchmarkMeasurement RunOne(MatterFixtureId fixture, MatterMesherKind kind,
            float spacing, int bricksPerAxis, bool collectMetrics)
        {
            IMatterMesher mesher = kind == MatterMesherKind.SurfaceNets
                ? (IMatterMesher)new MatterSurfaceNetsMesher()
                : new MatterDualContouringMesher();
            MatterWorld world = MatterFixtureWorldFactory.Create(fixture, spacing);
            var measurement = new BenchmarkMeasurement();
            measurement.bricksPerAxis = bricksPerAxis;
            measurement.regionCount = bricksPerAxis * bricksPerAxis * bricksPerAxis;
            bool canMeasureManagedBytes = MatterManagedAllocationCounter.IsAvailable;
            long allocationStart = canMeasureManagedBytes ? GC.GetAllocatedBytesForCurrentThread() : -1L;
            int gc0Start = GC.CollectionCount(0), gc1Start = GC.CollectionCount(1), gc2Start = GC.CollectionCount(2);
            long totalStart = Stopwatch.GetTimestamp();
            int firstBrick = -(bricksPerAxis / 2);
            int lastBrick = firstBrick + bricksPerAxis - 1;
            for (int z = firstBrick; z <= lastBrick; z++)
            for (int y = firstBrick; y <= lastBrick; y++)
            for (int x = firstBrick; x <= lastBrick; x++)
            {
                long stageStart = Stopwatch.GetTimestamp();
                MatterMeshingRegion region = MatterMeshingRegion.Capture(world, new MatterBrickAddress(x, y, z));
                measurement.snapshotMs += ToMilliseconds(Stopwatch.GetTimestamp() - stageStart);
                measurement.scalarSampleCount += region.ScalarSampleCount;
                measurement.scalarMemoryBytes += region.ScalarBytes;

                stageStart = Stopwatch.GetTimestamp();
                MatterMeshData data = mesher.Generate(region);
                measurement.pureMesherMs += ToMilliseconds(Stopwatch.GetTimestamp() - stageStart);
                measurement.vertices += data.Vertices.Length;
                measurement.triangles += data.TriangleCount;
                measurement.qefFallbacks += data.QefFallbackCount;
                measurement.qefClamped += data.QefClampedVertexCount;
                if (data.Vertices.Length != 0 && data.Indices.Length != 0)
                {
                    MatterMeshPublicationTimings timings = MatterMeshPublisher.Publish(data,
                        "U3 Benchmark " + fixture + " " + kind + " " + spacing.ToString("0.00"), out Mesh mesh);
                    measurement.fillMs += timings.MeshDataFillMilliseconds;
                    measurement.applyMs += timings.ApplyMilliseconds;
                    measurement.uploadMs += timings.UploadMilliseconds;
                    UnityEngine.Object.DestroyImmediate(mesh);
                }
            }
            measurement.sourceAuthorityBrickCount = world.MaterializedBrickCount;
            measurement.totalMs = ToMilliseconds(Stopwatch.GetTimestamp() - totalStart);
            measurement.allocatedBytes = canMeasureManagedBytes
                ? GC.GetAllocatedBytesForCurrentThread() - allocationStart
                : -1L;
            measurement.gc0 = GC.CollectionCount(0) - gc0Start;
            measurement.gc1 = GC.CollectionCount(1) - gc1Start;
            measurement.gc2 = GC.CollectionCount(2) - gc2Start;
            if (!collectMetrics) return measurement;
            return measurement;
        }

        private static BenchmarkRow Summarize(MatterFixtureId fixture, MatterMesherKind mesher,
            float spacing, float domainExtentMeters, int bricksPerAxis, List<BenchmarkMeasurement> runs)
        {
            BenchmarkMeasurement first = runs[0];
            return new BenchmarkRow
            {
                fixture = fixture.ToString(),
                mesher = mesher.ToString(),
                resolutionMeters = spacing,
                matchedDomainExtentMeters = domainExtentMeters,
                bricksPerAxis = bricksPerAxis,
                meshingRegionCount = first.regionCount,
                sourceAuthorityBrickCount = first.sourceAuthorityBrickCount,
                measuredRuns = runs.Count,
                scalarSampleCountAcrossDomain = first.scalarSampleCount,
                scalarSnapshotBytesAcrossDomain = first.scalarMemoryBytes,
                verticesAcrossDomain = first.vertices,
                trianglesAcrossDomain = first.triangles,
                qefFallbackVertices = first.qefFallbacks,
                qefClampedVertices = first.qefClamped,
                snapshotMilliseconds = Summarize(runs.Select(v => v.snapshotMs).ToList()),
                pureMesherMilliseconds = Summarize(runs.Select(v => v.pureMesherMs).ToList()),
                meshDataFillMilliseconds = Summarize(runs.Select(v => v.fillMs).ToList()),
                applyMilliseconds = Summarize(runs.Select(v => v.applyMs).ToList()),
                uploadMilliseconds = Summarize(runs.Select(v => v.uploadMs).ToList()),
                totalRebuildMilliseconds = Summarize(runs.Select(v => v.totalMs).ToList()),
                managedAllocatedBytes = SummarizeLong(runs.Select(v => v.allocatedBytes).ToList()),
                managedAllocationBytesAvailable = MatterManagedAllocationCounter.IsAvailable,
                gen0Collections = SummarizeInt(runs.Select(v => v.gc0).ToList()),
                gen1Collections = SummarizeInt(runs.Select(v => v.gc1).ToList()),
                gen2Collections = SummarizeInt(runs.Select(v => v.gc2).ToList())
            };
        }

        private static DoubleSummary Summarize(List<double> values)
        {
            values.Sort();
            return new DoubleSummary
            {
                median = Median(values),
                p95NearestRank = values[(int)Math.Ceiling(values.Count * 0.95d) - 1]
            };
        }

        private static LongSummary SummarizeLong(List<long> values)
        {
            values.Sort();
            return new LongSummary
            {
                median = Median(values),
                p95NearestRank = values[(int)Math.Ceiling(values.Count * 0.95d) - 1]
            };
        }

        private static IntSummary SummarizeInt(List<int> values)
        {
            values.Sort();
            return new IntSummary
            {
                median = Median(values),
                p95NearestRank = values[(int)Math.Ceiling(values.Count * 0.95d) - 1]
            };
        }

        private static double Median(List<double> sorted)
            => sorted.Count % 2 == 0 ? (sorted[sorted.Count / 2 - 1] + sorted[sorted.Count / 2]) * 0.5d : sorted[sorted.Count / 2];
        private static long Median(List<long> sorted)
            => sorted.Count % 2 == 0 ? (sorted[sorted.Count / 2 - 1] + sorted[sorted.Count / 2]) / 2L : sorted[sorted.Count / 2];
        private static int Median(List<int> sorted)
            => sorted.Count % 2 == 0 ? (sorted[sorted.Count / 2 - 1] + sorted[sorted.Count / 2]) / 2 : sorted[sorted.Count / 2];

        private static T ParseEnum<T>(string value) where T : struct
        {
            if (string.IsNullOrWhiteSpace(value) || !Enum.TryParse(value, true, out T parsed) || !Enum.IsDefined(typeof(T), parsed))
                throw new ArgumentException("Unknown " + typeof(T).Name + ": " + value);
            return parsed;
        }

        private static void ValidateResolution(float spacing)
        {
            if (!spacing.Equals(0.5f) && !spacing.Equals(0.25f))
                throw new ArgumentOutOfRangeException(nameof(spacing), "U3 only admits uniform 0.50m and 0.25m resolutions.");
        }

        private static string ShortMesher(MatterMesherKind kind)
            => kind == MatterMesherKind.SurfaceNets ? "SN" : "DC";

        private static string GetEvidencePath(string filename)
        {
            string projectRoot = Directory.GetParent(Application.dataPath).FullName;
            string repositoryRoot = Directory.GetParent(Directory.GetParent(Directory.GetParent(projectRoot).FullName).FullName).FullName;
            return Path.Combine(repositoryRoot, "native", "evidence", "unity", "u3-mesher-resolution", filename);
        }

        private static string EscapeJson(string value)
            => value.Replace("\\", "\\\\").Replace("\"", "\\\"");

        private static double ToMilliseconds(long ticks) => ticks * 1000.0 / Stopwatch.Frequency;

        private enum CameraMode { Hero, HeroPair, Board, Seam, Closeup }

        private sealed class BenchmarkMeasurement
        {
            public int bricksPerAxis, regionCount, sourceAuthorityBrickCount;
            public int scalarSampleCount, scalarMemoryBytes, vertices, triangles, qefFallbacks, qefClamped;
            public int gc0, gc1, gc2;
            public long allocatedBytes;
            public double snapshotMs, pureMesherMs, fillMs, applyMs, uploadMs, totalMs;
        }

        [Serializable] private sealed class BenchmarkReport
        {
            public string unityVersion;
            public string platform;
            public int seed;
            public int warmupRunsPerRow;
            public int measuredRunsPerRow;
            public float matchedPhysicalDomainMeters;
            public string physicalDomainRationale;
            public string sampleWindow;
            public string statistics;
            public string managedAllocationMeasurement;
            public string evidencePath;
            public BenchmarkRow[] rows;
        }

        [Serializable] private sealed class BenchmarkRow
        {
            public string fixture;
            public string mesher;
            public float resolutionMeters;
            public float matchedDomainExtentMeters;
            public int bricksPerAxis;
            public int meshingRegionCount;
            public int sourceAuthorityBrickCount;
            public int measuredRuns;
            public int scalarSampleCountAcrossDomain;
            public int scalarSnapshotBytesAcrossDomain;
            public int verticesAcrossDomain;
            public int trianglesAcrossDomain;
            public int qefFallbackVertices;
            public int qefClampedVertices;
            public DoubleSummary snapshotMilliseconds;
            public DoubleSummary pureMesherMilliseconds;
            public DoubleSummary meshDataFillMilliseconds;
            public DoubleSummary applyMilliseconds;
            public DoubleSummary uploadMilliseconds;
            public DoubleSummary totalRebuildMilliseconds;
            public LongSummary managedAllocatedBytes;
            public bool managedAllocationBytesAvailable;
            public IntSummary gen0Collections;
            public IntSummary gen1Collections;
            public IntSummary gen2Collections;
        }

        [Serializable] private sealed class DoubleSummary
        {
            public double median;
            public double p95NearestRank;
        }

        [Serializable] private sealed class LongSummary
        {
            public long median;
            public long p95NearestRank;
        }

        [Serializable] private sealed class IntSummary
        {
            public int median;
            public int p95NearestRank;
        }

        [Serializable] private sealed class BuildProvenance
        {
            public string unityVersion;
            public string activeBuildTarget;
            public string requestedBuildTarget;
            public string result;
            public string outputPath;
            public ulong totalSizeBytes;
            public int totalErrors;
            public int totalWarnings;
            public double elapsedSeconds;
            public string scenePath;
            public string options;
            public string evidencePath;
        }
    }
}
