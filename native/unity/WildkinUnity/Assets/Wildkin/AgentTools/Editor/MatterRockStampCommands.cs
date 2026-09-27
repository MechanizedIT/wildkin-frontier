using System;
using System.Diagnostics;
using System.IO;
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
    /// <summary>Reproducible U4 authoring, capture, inspection and build commands.</summary>
    public static class MatterRockStampCommands
    {
        private const string GalleryScenePath = "Assets/Wildkin/Scenes/Tech/U4RockGallery.unity";
        private const string StampScenePath = "Assets/Wildkin/Scenes/Tech/U4RockStamp.unity";
        private const string SeamScenePath = "Assets/Wildkin/Scenes/Tech/U4RockSeam.unity";
        private const string MaterialFolder = "Assets/Wildkin/Matter/Materials/U4";
        private const string TextureFolder = MaterialFolder + "/Textures";
        private const string MaterialAssetPath = MaterialFolder + "/U4StylizedRockDirt.mat";
        private const string ExposurePath = MaterialFolder + "/U4FixedExposure.asset";
        private const string TextureBasePath = TextureFolder + "/";
        private const string EvidenceRelativePath = "native/evidence/unity/u4-material-rock-stamp";
        private const string U4BScenePath = "Assets/Wildkin/Scenes/Tech/U4BRockConstruction.unity";
        private const string U4BMaterialFolder = "Assets/Wildkin/Matter/Materials/U4B";
        private const string U4BTextureFolder = U4BMaterialFolder + "/Textures";
        private const string U4BMaterialAssetPath = U4BMaterialFolder + "/U4BStylizedRockDirt.mat";
        private const string U4BExposurePath = U4BMaterialFolder + "/U4BFixedExposure.asset";
        private const string U4BTextureBasePath = U4BTextureFolder + "/";
        private const string U4BEvidenceRelativePath = "native/evidence/unity/u4b-rock-construction";
        private const int TextureAssetCount = 7;

        [Serializable]
        private sealed class BuildProvenance
        {
            public string unityVersion;
            public string activeBuildTarget;
            public string requestedBuildTarget;
            public string result;
            public string outputPath;
            public string evidencePath;
            public ulong totalSizeBytes;
            public int totalErrors;
            public int totalWarnings;
            public double elapsedSeconds;
            public string scenePath;
            public string options;
        }

        [Serializable]
        private sealed class InspectionResult
        {
            public RockStampSeedReport seed;
            public int sourceVersion;
            public int authoritativeSparseMatterSamples;
            public int nonAirSourceReadsInOccupiedRegion;
            public int brickCount;
            public int crossingBrickCount;
            public string authorityNote;
        }

        [Serializable]
        private sealed class U4BInspectionResult
        {
            public RockStampSeedReport formation;
            public int sourceVersion;
            public int authoritativeSparseMatterSamples;
            public int nonAirSourceReadsInOccupiedRegion;
            public int resolvedComponentCount;
            public int[] componentSampleCounts;
            public float largestComponentFraction;
            public float minimumMajorComponentBoundsGapMeters;
            public string authorityNote;
        }

        [CliCommand("generate_rock_stamp",
            "Resolve one deterministic WildkinClast stamp into MatterWorld and publish a single HDRP Surface Nets object.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4", "rocks" })]
        public static string GenerateRockStamp(
            [CliArg("seed", "Deterministic integer seed for this formation.")] int seed,
            [CliArg("profile", "Shared profile; currently WildkinClast-v1.")] string profile = "WildkinClast-v1",
            [CliArg("resolution", "Uniform spacing; use 0.50m or a bounded 0.25m hero comparison.")] float resolution = 0.5f,
            [CliArg("wireframe", "Overlay only for a separate topology inspection view.")] bool wireframe = false)
        {
            ValidateResolution(resolution);
            Material material = EnsureRockMaterial();
            string json = CreateScene(StampScenePath, seed, 1, profile, resolution, false, wireframe,
                CameraKind.Hero, material);
            return json;
        }

        [CliCommand("generate_rock_gallery",
            "Generate one shared profile for 20 or more consecutive seeds and publish all resolved Surface Nets formations.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4", "rocks", "gallery" })]
        public static string GenerateRockGallery(
            [CliArg("seed_start", "First deterministic seed in the gallery.")] int seedStart,
            [CliArg("count", "Number of consecutive seeds; 20 is the minimum review gallery.")] int count = 20,
            [CliArg("profile", "Shared profile; currently WildkinClast-v1.")] string profile = "WildkinClast-v1")
        {
            if (count < 20 || count > 64) throw new ArgumentOutOfRangeException(nameof(count), "The U4 review gallery needs 20-64 seeds.");
            Material material = EnsureRockMaterial();
            return CreateScene(GalleryScenePath, seedStart, count, profile, 0.5f, true, false,
                CameraKind.Gallery, material);
        }

        [CliCommand("generate_rock_formation", "Generate one U4B formation from a selected archetype and construction method.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4b", "rocks" })]
        public static string GenerateRockFormation(
            [CliArg("seed", "Deterministic formation seed.")] int seed,
            [CliArg("archetype", "Auto, Stacked Ledge, Buttress, Broken Ridge, or Split Cluster.")] string archetype = "Auto",
            [CliArg("construction_mode", "U4Control, DistinctCluster, or SelectiveFormation.")] string constructionMode = "DistinctCluster",
            [CliArg("resolution", "Uniform spacing; 0.50m default, one bounded 0.25m hero is allowed.")] float resolution = 0.5f,
            [CliArg("wireframe", "Show Surface Nets topology for a diagnostic capture.")] bool wireframe = false)
        {
            ValidateResolution(resolution);
            RockConstructionMode mode = RockFormationNames.ParseMode(constructionMode);
            RockFormationArchetype family = RockFormationNames.ParseArchetype(archetype);
            return CreateU4BScene(U4BScenePath, seed, 1, "WildkinClast-v1", resolution, false,
                wireframe, CameraKind.Hero, EnsureU4BMaterial(), mode.ToString(), RockFormationNames.Display(family));
        }

        [CliCommand("generate_construction_comparison", "Generate six matched U4 control, distinct-cluster, and selective-formation rows.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4b", "comparison" })]
        public static string GenerateConstructionComparison(
            [CliArg("seed_set", "Exactly six comma-separated deterministic seeds, for example 3,8,12,14,19,20.")] string seedSet = "3,8,12,14,19,20")
        {
            int[] seeds = ParseSeedSet(seedSet);
            return CreateU4BScene(U4BScenePath, seeds[0], seeds.Length * 3, "WildkinClast-v1", 0.5f,
                true, false, CameraKind.Comparison, EnsureU4BMaterial(), "U4Control", "Auto", true, seedSet);
        }

        [CliCommand("generate_formation_gallery", "Generate a reproducible U4B gallery with at least 20 seeds of one construction method.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4b", "gallery" })]
        public static string GenerateFormationGallery(
            [CliArg("seed_start", "First deterministic seed.")] int seedStart,
            [CliArg("count", "Number of seeds, from 20 to 64.")] int count = 20,
            [CliArg("construction_mode", "DistinctCluster or SelectiveFormation; the U4 control remains available for comparisons.")] string constructionMode = "DistinctCluster")
        {
            if (count < 20 || count > 64) throw new ArgumentOutOfRangeException(nameof(count), "The U4B gallery requires 20-64 seeds.");
            RockConstructionMode mode = RockFormationNames.ParseMode(constructionMode);
            return CreateU4BScene(U4BScenePath, seedStart, count, "WildkinClast-v1", 0.5f,
                true, false, CameraKind.Gallery, EnsureU4BMaterial(), mode.ToString(), "Auto");
        }

        [CliCommand("capture_formation_gallery", "Capture the active U4B scene and write the same-view machine-readable metrics.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4b", "capture" })]
        public static string CaptureFormationGallery(
            [CliArg("filename", "PNG filename inside the U4B evidence directory.")] string filename = "final-20-seed-gallery.png",
            [CliArg("width", "Capture width in pixels.")] int width = 3200,
            [CliArg("height", "Capture height in pixels.")] int height = 2400)
        {
            ValidateEvidenceFilename(filename, ".png");
            RockStampGalleryView view = RequireActivePreview();
            Camera camera = Camera.main;
            if (camera == null) throw new InvalidOperationException("Generate a U4B scene before capturing it.");
            string imagePath = EvidencePath(filename, true);
            RockStampGalleryView.Capture(camera, imagePath, width, height);
            string metricsPath = EvidencePath(Path.GetFileNameWithoutExtension(filename) + "-metrics.json", true);
            File.WriteAllText(metricsPath, view.ReportJson());
            return JsonUtility.ToJson(new CaptureResult { imagePath = imagePath, metricsPath = metricsPath,
                seedCount = view.SeedReports.Count }, true);
        }

        [CliCommand("capture_formation_view", "Capture a beauty, second-angle, or wireframe view of the active single U4B formation.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4b", "capture" })]
        public static string CaptureFormationView(
            [CliArg("filename", "PNG filename inside the U4B evidence directory.")] string filename,
            [CliArg("view", "beauty, second_angle, or wireframe.")] string view = "beauty",
            [CliArg("width", "Capture width in pixels.")] int width = 1920,
            [CliArg("height", "Capture height in pixels.")] int height = 1080)
        {
            ValidateEvidenceFilename(filename, ".png");
            RockStampGalleryView preview = RequireActivePreview();
            Camera camera = Camera.main;
            if (camera == null) throw new InvalidOperationException("The active U4B scene has no MainCamera.");
            Vector3 oldPosition = camera.transform.position;
            Quaternion oldRotation = camera.transform.rotation;
            bool oldWireframe = preview.WireframeEnabled;
            if (string.Equals(view, "second_angle", StringComparison.OrdinalIgnoreCase))
            {
                Vector3 target = new Vector3(0f, 1.1f, 0f);
                camera.transform.position = target + Quaternion.Euler(0f, 64f, 0f) * (oldPosition - target);
                camera.transform.LookAt(target);
            }
            else if (string.Equals(view, "wireframe", StringComparison.OrdinalIgnoreCase))
            {
                oldWireframe = false;
                preview.SetWireframe(true);
            }
            else if (!string.Equals(view, "beauty", StringComparison.OrdinalIgnoreCase))
                throw new ArgumentException("View must be beauty, second_angle, or wireframe.", nameof(view));
            try
            {
                string path = EvidencePath(filename, true);
                RockStampGalleryView.Capture(Camera.main, path, width, height);
                File.WriteAllText(EvidencePath(Path.GetFileNameWithoutExtension(filename) + "-metrics.json", true), preview.ReportJson());
                return "{\"imagePath\":\"" + EscapeJson(path) + "\",\"view\":\"" + EscapeJson(view) + "\"}";
            }
            finally
            {
                camera.transform.position = oldPosition;
                camera.transform.rotation = oldRotation;
                if (string.Equals(view, "wireframe", StringComparison.OrdinalIgnoreCase)) preview.SetWireframe(oldWireframe);
            }
        }

        [CliCommand("capture_formation_component_debug", "Capture resolved component bounds over the shared Surface Nets matter surface.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4b", "diagnostics" })]
        public static string CaptureFormationComponentDebug(
            [CliArg("filename", "PNG filename inside the U4B evidence directory.")] string filename = "component-contact-debug.png",
            [CliArg("width", "Capture width in pixels.")] int width = 1920,
            [CliArg("height", "Capture height in pixels.")] int height = 1080)
        {
            ValidateEvidenceFilename(filename, ".png");
            RockStampGalleryView preview = RequireActivePreview();
            if (Camera.main == null) throw new InvalidOperationException("The active U4B scene has no MainCamera.");
            bool oldDebug = preview.ComponentDebugEnabled;
            preview.SetComponentDebug(true);
            string path = EvidencePath(filename, true);
            try { RockStampGalleryView.Capture(Camera.main, path, width, height); }
            finally { preview.SetComponentDebug(oldDebug); }
            return "{\"imagePath\":\"" + EscapeJson(path) + "\",\"componentDiagnostics\":true}";
        }

        [CliCommand("inspect_rock_formation", "Inspect recipe roles, resolved components, authoritative MatterWorld samples, and mesh metrics.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4b", "inspection" })]
        public static string InspectRockFormation(
            [CliArg("seed", "Deterministic formation seed.")] int seed,
            [CliArg("archetype", "Auto, Stacked Ledge, Buttress, Broken Ridge, or Split Cluster.")] string archetype = "Auto",
            [CliArg("construction_mode", "U4Control, DistinctCluster, or SelectiveFormation.")] string constructionMode = "DistinctCluster",
            [CliArg("resolution", "Uniform sample spacing.")] float resolution = 0.5f)
        {
            ValidateResolution(resolution);
            RockFormationGenerationResult generation = RockFormationStampGenerator.GenerateForMode(seed,
                RockFormationNames.ParseArchetype(archetype), RockFormationNames.ParseMode(constructionMode), null, resolution);
            RockStampSeedReport report = MeasureResolved(generation.Stamp, generation.Resolution,
                generation.GenerationMilliseconds, generation.ResolutionMilliseconds);
            report.generationAttempts = generation.GenerationAttempts;
            report.rejectedAttempts = generation.RejectedAttempts;
            report.rejectionReason = generation.ValidationIssue;
            int nonAirSource = 0;
            MatterBounds bounds = generation.Resolution.Bounds;
            for (int z = bounds.MinInclusive.Z; z < bounds.MaxExclusive.Z; z++)
            for (int y = bounds.MinInclusive.Y; y < bounds.MaxExclusive.Y; y++)
            for (int x = bounds.MinInclusive.X; x < bounds.MaxExclusive.X; x++)
            {
                MatterSampleAddress address = new MatterSampleAddress(x, y, z);
                if (generation.Resolution.World.ReadSample(address).IsSolid &&
                    !generation.Resolution.World.EvaluateSourceDirect(address).IsSolid) nonAirSource++;
            }
            var result = new U4BInspectionResult
            {
                formation = report,
                sourceVersion = generation.Resolution.World.SourceVersion,
                authoritativeSparseMatterSamples = generation.Resolution.World.EditCount,
                nonAirSourceReadsInOccupiedRegion = nonAirSource,
                resolvedComponentCount = generation.Resolution.ConnectedComponents,
                componentSampleCounts = generation.Resolution.ComponentSampleCounts,
                largestComponentFraction = generation.Resolution.LargestComponentFraction,
                minimumMajorComponentBoundsGapMeters = generation.Resolution.MinimumMajorComponentBoundsGapMeters,
                authorityNote = "Stone recipes are generation metadata only. Resolution stores ordinary matter samples in an all-air-backed MatterWorld; no source stone is retained by runtime matter authority."
            };
            return JsonUtility.ToJson(result, true);
        }

        [CliCommand("set_rock_construction_mode", "Regenerate the active U4B gallery with one selected construction method.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4b", "rocks" })]
        public static string SetRockConstructionMode(
            [CliArg("mode", "U4Control, DistinctCluster, or SelectiveFormation.")] string mode)
        {
            RockStampGalleryView preview = RequireActivePreview();
            preview.SetConstructionMode(mode);
            return preview.ReportJson();
        }

        [CliCommand("capture_formation_projection", "Capture before/after motion proof for stable rest-space mapping on resolved U4B matter.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4b", "projection" })]
        public static string CaptureFormationProjection(
            [CliArg("before_filename", "Before-transform PNG filename.")] string beforeFilename = "projection-before.png",
            [CliArg("after_filename", "After-transform PNG filename.")] string afterFilename = "projection-after.png")
        {
            ValidateEvidenceFilename(beforeFilename, ".png");
            ValidateEvidenceFilename(afterFilename, ".png");
            RockStampGalleryView view = RequireActivePreview();
            string before = EvidencePath(beforeFilename, true), after = EvidencePath(afterFilename, true);
            view.CaptureMotionProof(before, after);
            return "{\"before\":\"" + EscapeJson(before) + "\",\"after\":\"" + EscapeJson(after) + "\",\"objectMoved\":true}";
        }

        [CliCommand("capture_rock_gallery",
            "Capture the active U4 rock scene from its deterministic HDRP camera and save image plus metrics into phase evidence.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4", "capture" })]
        public static string CaptureRockGallery(
            [CliArg("filename", "PNG filename inside the U4 evidence directory.")] string filename = "gallery-contact-sheet.png",
            [CliArg("width", "Capture width in pixels.")] int width = 2560,
            [CliArg("height", "Capture height in pixels.")] int height = 1440)
        {
            ValidateEvidenceFilename(filename, ".png");
            RockStampGalleryView view = RequireActivePreview();
            Camera camera = Camera.main;
            if (camera == null) throw new InvalidOperationException("Create a U4 rock scene before capturing it.");
            string imagePath = EvidencePath(filename);
            RockStampGalleryView.Capture(camera, imagePath, width, height);
            string metricsPath = EvidencePath(Path.GetFileNameWithoutExtension(filename) + "-metrics.json");
            File.WriteAllText(metricsPath, view.ReportJson());
            return JsonUtility.ToJson(new CaptureResult { imagePath = imagePath, metricsPath = metricsPath,
                seedCount = view.SeedReports.Count }, true);
        }

        [CliCommand("inspect_rock_stamp",
            "Inspect one deterministic stamp's resolved MatterWorld, profile descriptors, component count and Surface Nets metrics.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4", "inspection" })]
        public static string InspectRockStamp(
            [CliArg("seed", "Deterministic integer seed to inspect.")] int seed,
            [CliArg("profile", "Shared profile; currently WildkinClast-v1.")] string profile = "WildkinClast-v1",
            [CliArg("resolution", "Uniform spacing; use 0.50m except bounded hero comparison.")] float resolution = 0.5f)
        {
            ValidateResolution(resolution);
            long generation = Stopwatch.GetTimestamp();
            RockFormationStamp stamp = RockFormationStampGenerator.Generate(seed, profile);
            double generationMs = ToMilliseconds(Stopwatch.GetTimestamp() - generation);
            long resolve = Stopwatch.GetTimestamp();
            RockStampResolution resolved = stamp.Resolve(resolution);
            double resolveMs = ToMilliseconds(Stopwatch.GetTimestamp() - resolve);
            RockStampSeedReport report = MeasureResolved(stamp, resolved, generationMs, resolveMs);
            int nonAirSource = 0, brickCount = 0;
            var seenBricks = new System.Collections.Generic.HashSet<MatterBrickAddress>();
            MatterBounds bounds = resolved.Bounds;
            for (int z = bounds.MinInclusive.Z; z < bounds.MaxExclusive.Z; z++)
            for (int y = bounds.MinInclusive.Y; y < bounds.MaxExclusive.Y; y++)
            for (int x = bounds.MinInclusive.X; x < bounds.MaxExclusive.X; x++)
            {
                MatterSampleAddress address = new MatterSampleAddress(x, y, z);
                if (resolved.World.ReadSample(address).IsSolid && !resolved.World.EvaluateSourceDirect(address).IsSolid) nonAirSource++;
                MatterBrickLayout.Resolve(address, out MatterBrickAddress brick, out _);
                seenBricks.Add(brick);
            }
            brickCount = seenBricks.Count;
            var result = new InspectionResult
            {
                seed = report,
                sourceVersion = resolved.World.SourceVersion,
                authoritativeSparseMatterSamples = resolved.World.EditCount,
                nonAirSourceReadsInOccupiedRegion = nonAirSource,
                brickCount = brickCount,
                crossingBrickCount = brickCount,
                authorityNote = "Stamp primitives are not retained; resolved MatterWorld v2 has an all-air procedural baseline and stores each occupied rock/dirt sample as ordinary sparse matter."
            };
            return JsonUtility.ToJson(result, true);
        }

        [CliCommand("set_surface_material_debug",
            "Switch the active U4 object's surface to authored HDRP material or one isolated material-weight debug view.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4", "materials" })]
        public static string SetSurfaceMaterialDebug(
            [CliArg("mode", "off (normal rock/dirt), weights, rock, or dirt.")] string mode)
        {
            RockStampGalleryView view = RequireActivePreview();
            view.SetDebugMaterial(mode);
            return "{\"mode\":\"" + EscapeJson(mode) + "\",\"rendererCount\":" + view.SeedReports.Count + "}";
        }

        [CliCommand("u4_rock_generate_seam_closeup",
            "Create a fixed-lighting close rock/dirt seam view from the same resolved stamp and one-submesh material path.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4", "seams" })]
        public static string GenerateSeamCloseup(
            [CliArg("seed", "Seed to resolve for the material boundary detail.")] int seed = 1,
            [CliArg("resolution", "Uniform spacing: 0.50m, or 0.25m for bounded hero inspection.")] float resolution = 0.5f)
        {
            ValidateResolution(resolution);
            return CreateScene(SeamScenePath, seed, 1, "WildkinClast-v1", resolution, false, false,
                CameraKind.Seam, EnsureRockMaterial());
        }

        [CliCommand("u4_rock_capture_motion_proof",
            "Capture matching object-relative before/after images while the resolved matter object is translated and rotated.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4", "projection" })]
        public static string CaptureMotionProof(
            [CliArg("before_filename", "Before-transform PNG filename.")] string beforeFilename = "projection-before.png",
            [CliArg("after_filename", "After-transform PNG filename.")] string afterFilename = "projection-after.png",
            [CliArg("width", "Capture width in pixels.")] int width = 1920,
            [CliArg("height", "Capture height in pixels.")] int height = 1080)
        {
            ValidateEvidenceFilename(beforeFilename, ".png");
            ValidateEvidenceFilename(afterFilename, ".png");
            RockStampGalleryView view = RequireActivePreview();
            string before = EvidencePath(beforeFilename), after = EvidencePath(afterFilename);
            view.CaptureMotionProof(before, after, width, height);
            return "{\"before\":\"" + EscapeJson(before) + "\",\"after\":\"" + EscapeJson(after) + "\",\"objectMoved\":true,\"cameraFraming\":\"matched in object space\"}";
        }

        [CliCommand("u4_rock_save_metrics",
            "Save per-seed field, meshing, publication, memory and frame observations for the active U4 scene.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4", "evidence" })]
        public static string SaveMetrics(
            [CliArg("filename", "JSON filename inside U4 evidence.")] string filename = "active-gallery-metrics.json")
        {
            ValidateEvidenceFilename(filename, ".json");
            RockStampGalleryView view = RequireActivePreview();
            string path = EvidencePath(filename);
            File.WriteAllText(path, view.ReportJson());
            return "{\"metricsPath\":\"" + EscapeJson(path) + "\",\"seedCount\":" + view.SeedReports.Count + "}";
        }

        [CliCommand("u4_rock_prepare_windows_scene",
            "Save the deterministic U4 gallery configuration without transient preview meshes or runtime matter components.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4", "build" })]
        public static string PrepareWindowsScene()
        {
            RockStampGalleryView view = PrepareCleanGalleryScene();
            view.Regenerate();
            return "{\"scenePath\":\"" + GalleryScenePath + "\",\"savedTransientPreview\":false,\"seedCount\":" + view.SeedReports.Count + "}";
        }

        [CliCommand("u4_rock_build_windows_development",
            "Build the saved U4 Windows x64 Development Player scene and write build provenance.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4", "build" })]
        public static string BuildWindowsDevelopment(
            [CliArg("output", "Output executable path; use a new U4-specific folder.")] string output = "Builds/U4-MaterialRock/Wildkin-U4.exe")
        {
            if (!File.Exists(Path.Combine(Application.dataPath, "Wildkin/Scenes/Tech/U4RockGallery.unity")))
                throw new FileNotFoundException("Generate the U4 gallery scene before building.", GalleryScenePath);
            string outputPath = Path.GetFullPath(output);
            string directory = Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
            RockStampGalleryView view = PrepareCleanGalleryScene();
            BuildReport build;
            try
            {
                build = BuildPipeline.BuildPlayer(new BuildPlayerOptions
                {
                    scenes = new[] { GalleryScenePath },
                    locationPathName = outputPath,
                    target = BuildTarget.StandaloneWindows64,
                    options = BuildOptions.Development | BuildOptions.AllowDebugging
                });
            }
            finally
            {
                if (view != null) view.Regenerate();
            }
            if (build.summary.result != BuildResult.Succeeded)
                throw new InvalidOperationException("U4 Windows Development Build ended with " + build.summary.result +
                    " (" + build.summary.totalErrors + " errors).");
            var provenance = new BuildProvenance
            {
                unityVersion = Application.unityVersion,
                activeBuildTarget = EditorUserBuildSettings.activeBuildTarget.ToString(),
                requestedBuildTarget = BuildTarget.StandaloneWindows64.ToString(),
                result = build.summary.result.ToString(), outputPath = outputPath,
                totalSizeBytes = build.summary.totalSize, totalErrors = build.summary.totalErrors,
                totalWarnings = build.summary.totalWarnings, elapsedSeconds = build.summary.totalTime.TotalSeconds,
                scenePath = GalleryScenePath, options = "Development, AllowDebugging"
            };
            string evidence = EvidencePath("build-provenance.json");
            File.WriteAllText(evidence, JsonUtility.ToJson(provenance, true));
            provenance.evidencePath = evidence;
            string json = JsonUtility.ToJson(provenance, true);
            File.WriteAllText(evidence, json);
            return json;
        }

        [CliCommand("u4b_build_windows_development", "Build the selected U4B Windows x64 Development Player and write separate provenance.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4b", "build" })]
        public static string BuildU4BWindowsDevelopment(
            [CliArg("output", "Optional Windows executable path outside tracked evidence.")] string output = "")
        {
            if (!File.Exists(Path.Combine(Application.dataPath, "Wildkin/Scenes/Tech/U4BRockConstruction.unity")))
                throw new FileNotFoundException("Generate the selected U4B gallery scene before building.", U4BScenePath);
            if (string.IsNullOrWhiteSpace(output))
                output = Path.Combine(Path.GetTempPath(), "wildkin-u4b-rock-construction", "Wildkin-U4B.exe");
            string outputPath = Path.GetFullPath(output);
            string directory = Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
            RockStampGalleryView view = PrepareCleanU4BScene();
            BuildReport build;
            try
            {
                build = BuildPipeline.BuildPlayer(new BuildPlayerOptions
                {
                    scenes = new[] { U4BScenePath },
                    locationPathName = outputPath,
                    target = BuildTarget.StandaloneWindows64,
                    options = BuildOptions.Development | BuildOptions.AllowDebugging
                });
            }
            finally
            {
                if (view != null) view.Regenerate();
            }
            if (build.summary.result != BuildResult.Succeeded)
                throw new InvalidOperationException("U4B Windows Development Build ended with " + build.summary.result +
                    " (" + build.summary.totalErrors + " errors).");
            var provenance = new BuildProvenance
            {
                unityVersion = Application.unityVersion,
                activeBuildTarget = EditorUserBuildSettings.activeBuildTarget.ToString(),
                requestedBuildTarget = BuildTarget.StandaloneWindows64.ToString(),
                result = build.summary.result.ToString(), outputPath = outputPath,
                totalSizeBytes = build.summary.totalSize, totalErrors = build.summary.totalErrors,
                totalWarnings = build.summary.totalWarnings, elapsedSeconds = build.summary.totalTime.TotalSeconds,
                scenePath = U4BScenePath, options = "Development, AllowDebugging"
            };
            string evidence = EvidencePath("build-provenance.json", true);
            provenance.evidencePath = evidence;
            string json = JsonUtility.ToJson(provenance, true);
            File.WriteAllText(evidence, json);
            string playerCapture = EvidencePath("windows-player-observation.png", true);
            string playerMetrics = EvidencePath("windows-player-metrics.json", true);
            var startInfo = new ProcessStartInfo(outputPath,
                "-u4-capture \"" + playerCapture + "\" -u4-metrics \"" + playerMetrics + "\" -u4-quit")
            { UseShellExecute = false, CreateNoWindow = true, WorkingDirectory = directory };
            using (Process player = Process.Start(startInfo))
            {
                if (player == null || !player.WaitForExit(90000))
                {
                    if (player != null && !player.HasExited) player.Kill();
                    provenance.options += "; player observation timed out after 90s";
                }
                else provenance.options += "; player observation exit=" + player.ExitCode;
            }
            json = JsonUtility.ToJson(provenance, true);
            File.WriteAllText(evidence, json);
            provenance.outputPath = Path.GetFullPath(outputPath);
            return json;
        }

        [CliCommand("generate_formation_seam", "Create the bounded U4B rock/dirt shared-surface seam view.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4b", "materials" })]
        public static string GenerateFormationSeam(
            [CliArg("seed", "Deterministic formation seed.")] int seed = 14,
            [CliArg("construction_mode", "DistinctCluster or SelectiveFormation.")] string constructionMode = "DistinctCluster",
            [CliArg("resolution", "Uniform sample spacing.")] float resolution = 0.5f)
        {
            ValidateResolution(resolution);
            RockConstructionMode mode = RockFormationNames.ParseMode(constructionMode);
            return CreateU4BScene(U4BScenePath, seed, 1, "WildkinClast-v1", resolution, false,
                false, CameraKind.Seam, EnsureU4BMaterial(), mode.ToString(), "Auto");
        }

        private static string CreateScene(string scenePath, int seedStart, int count, string profile,
            float resolution, bool gallery, bool wireframe, CameraKind cameraKind, Material material)
        {
            EnsureFolders();
            Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            scene.name = Path.GetFileNameWithoutExtension(scenePath);
            EditorSceneManager.SetActiveScene(scene);
            ConfigureEnvironment(cameraKind);
            var root = new GameObject("U4 Runtime Rock Stamp Gallery");
            RockStampGalleryView view = root.AddComponent<RockStampGalleryView>();
            view.Configure(seedStart, count, profile, resolution, gallery, wireframe, material);
            view.ClearPreviewForSceneSave();
            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene, scenePath);
            AssetDatabase.SaveAssets();
            view.Regenerate();
            return view.ReportJson();
        }

        private static string CreateU4BScene(string scenePath, int seedStart, int count, string profile,
            float resolution, bool gallery, bool wireframe, CameraKind cameraKind, Material material,
            string constructionMode, string archetype, bool matchedComparison = false,
            string matchedSeedsCsv = null, bool componentDebug = false)
        {
            EnsureFolders();
            Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            scene.name = Path.GetFileNameWithoutExtension(scenePath);
            EditorSceneManager.SetActiveScene(scene);
            ConfigureEnvironment(cameraKind, true);
            var root = new GameObject("U4B Runtime Rock Formation Gallery");
            RockStampGalleryView view = root.AddComponent<RockStampGalleryView>();
            view.ConfigureU4B(seedStart, count, profile, resolution, gallery, wireframe, material,
                constructionMode, archetype, matchedComparison, matchedSeedsCsv, componentDebug, 0.28f);
            view.ClearPreviewForSceneSave();
            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene, scenePath);
            AssetDatabase.SaveAssets();
            view.Regenerate();
            return view.ReportJson();
        }

        private static Material EnsureRockMaterial()
        {
            EnsureFolders();
            MatterRockTextureSet generated = MatterRockMaterialFactory.GenerateTextures();
            string[] texturePaths =
            {
                TextureBasePath + "U4_RockAlbedo.asset", TextureBasePath + "U4_DirtAlbedo.asset",
                TextureBasePath + "U4_RockNormal.asset", TextureBasePath + "U4_DirtNormal.asset",
                TextureBasePath + "U4_RockMask.asset", TextureBasePath + "U4_DirtMask.asset",
                TextureBasePath + "U4_LayerMask.asset"
            };
            Texture2D[] sourceTextures = generated.All;
            var textures = new Texture2D[TextureAssetCount];
            for (int i = 0; i < sourceTextures.Length; i++)
                textures[i] = CreateOrUpdateTexture(texturePaths[i], sourceTextures[i]);
            var assetSet = new MatterRockTextureSet(textures[0], textures[1], textures[2], textures[3],
                textures[4], textures[5], textures[6]);
            Material generatedMaterial = MatterRockMaterialFactory.CreateMaterial(assetSet);
            Material material = AssetDatabase.LoadAssetAtPath<Material>(MaterialAssetPath);
            if (material == null)
            {
                generatedMaterial.name = "U4 Stylized Rock Dirt";
                AssetDatabase.CreateAsset(generatedMaterial, MaterialAssetPath);
                material = generatedMaterial;
            }
            else
            {
                EditorUtility.CopySerialized(generatedMaterial, material);
                // Unity's generic CopySerialized path does not reliably refresh native material
                // property blocks when a shader's serialized property set has changed.
                material.shader = generatedMaterial.shader;
                material.CopyPropertiesFromMaterial(generatedMaterial);
                material.enableInstancing = generatedMaterial.enableInstancing;
                material.name = "U4 Stylized Rock Dirt";
                EditorUtility.SetDirty(material);
                UnityEngine.Object.DestroyImmediate(generatedMaterial);
            }
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            return material;
        }

        private static Material EnsureU4BMaterial()
        {
            EnsureFolders();
            MatterRockTextureSet generated = MatterRockMaterialFactory.GenerateU4BTextures();
            string[] paths =
            {
                U4BTextureBasePath + "U4B_RockAlbedo.asset", U4BTextureBasePath + "U4B_DirtAlbedo.asset",
                U4BTextureBasePath + "U4B_RockNormal.asset", U4BTextureBasePath + "U4B_DirtNormal.asset",
                U4BTextureBasePath + "U4B_RockMask.asset", U4BTextureBasePath + "U4B_DirtMask.asset",
                U4BTextureBasePath + "U4B_LayerMask.asset"
            };
            Texture2D[] sourceTextures = generated.All;
            var textures = new Texture2D[sourceTextures.Length];
            for (int index = 0; index < sourceTextures.Length; index++)
                textures[index] = CreateOrUpdateTexture(paths[index], sourceTextures[index]);
            var assetSet = new MatterRockTextureSet(textures[0], textures[1], textures[2], textures[3],
                textures[4], textures[5], textures[6]);
            Material created = MatterRockMaterialFactory.CreateU4BMaterial(assetSet);
            Material material = AssetDatabase.LoadAssetAtPath<Material>(U4BMaterialAssetPath);
            if (material == null)
            {
                created.name = "U4B Stylized Rock Dirt";
                AssetDatabase.CreateAsset(created, U4BMaterialAssetPath);
                material = created;
            }
            else
            {
                EditorUtility.CopySerialized(created, material);
                material.shader = created.shader;
                material.CopyPropertiesFromMaterial(created);
                material.enableInstancing = created.enableInstancing;
                material.name = "U4B Stylized Rock Dirt";
                EditorUtility.SetDirty(material);
                UnityEngine.Object.DestroyImmediate(created);
            }
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            return material;
        }

        private static Texture2D CreateOrUpdateTexture(string path, Texture2D generated)
        {
            Texture2D existing = AssetDatabase.LoadAssetAtPath<Texture2D>(path);
            if (existing == null)
            {
                AssetDatabase.CreateAsset(generated, path);
                return generated;
            }
            EditorUtility.CopySerialized(generated, existing);
            EditorUtility.SetDirty(existing);
            UnityEngine.Object.DestroyImmediate(generated);
            return existing;
        }

        private static RockStampSeedReport MeasureResolved(RockFormationStamp stamp, RockStampResolution resolved,
            double generationMs, double resolveMs)
        {
            var report = new RockStampSeedReport
            {
                seed = stamp.Seed, profile = stamp.Profile.Name, layoutName = stamp.LayoutName,
                constructionMode = stamp.ConstructionMode.ToString(), archetype = stamp.ArchetypeName,
                primitiveDistribution = stamp.PrimitiveDistribution,
                primitiveCount = stamp.PrimitiveCount,
                stoneCount = stamp.RecipeElementCount,
                stoneRoleSummary = stamp.ConstructionMode == RockConstructionMode.U4Control
                    ? "legacy U4 rounded-box/slab/ellipsoid/wedge placements" : stamp.PrimitiveDistribution,
                generationAttempts = 1,
                parameterGenerationMilliseconds = generationMs, scalarWorldResolutionMilliseconds = resolveMs,
                occupiedSamples = resolved.OccupiedSamples,
                occupiedVolumeEstimateCubicMeters = resolved.OccupiedSamples * resolved.SampleSpacingMeters *
                    resolved.SampleSpacingMeters * resolved.SampleSpacingMeters,
                connectedResolvedComponents = resolved.ConnectedComponents,
                componentSampleCounts = resolved.ComponentSampleCounts,
                smallestSubstantialComponentSamples = resolved.SmallestSubstantialComponentSamples,
                largestComponentFraction = resolved.LargestComponentFraction,
                minimumMajorComponentBoundsGapMeters = resolved.MinimumMajorComponentBoundsGapMeters,
                fieldHash = resolved.FieldHash.ToString("X16")
            };
            MatterBounds bounds = resolved.Bounds;
            float spacing = resolved.SampleSpacingMeters;
            report.boundsMeters = $"[{bounds.MinInclusive.X * spacing:0.00},{bounds.MinInclusive.Y * spacing:0.00},{bounds.MinInclusive.Z * spacing:0.00}]..[{bounds.MaxExclusive.X * spacing:0.00},{bounds.MaxExclusive.Y * spacing:0.00},{bounds.MaxExclusive.Z * spacing:0.00}]";
            if (stamp.ConstructionMode == RockConstructionMode.U4Control && resolved.ConnectedComponents != 1)
                report.rejectionReason = "U4 control resolved to " + resolved.ConnectedComponents + " components";
            IMatterMesher mesher = new MatterSurfaceNetsMesher();
            long meshHash = 1469598103934665603L;
            MatterInt3 min = bounds.MinInclusive, max = bounds.MaxExclusive;
            int minX = MatterBrickLayout.FloorDiv(min.X, MatterBrickLayout.CellSize),
                minY = MatterBrickLayout.FloorDiv(min.Y, MatterBrickLayout.CellSize),
                minZ = MatterBrickLayout.FloorDiv(min.Z, MatterBrickLayout.CellSize),
                maxX = MatterBrickLayout.FloorDiv(max.X - 1, MatterBrickLayout.CellSize),
                maxY = MatterBrickLayout.FloorDiv(max.Y - 1, MatterBrickLayout.CellSize),
                maxZ = MatterBrickLayout.FloorDiv(max.Z - 1, MatterBrickLayout.CellSize);
            for (int z = minZ; z <= maxZ; z++)
            for (int y = minY; y <= maxY; y++)
            for (int x = minX; x <= maxX; x++)
            {
                long snapshot = Stopwatch.GetTimestamp();
                MatterMeshingRegion region = MatterMeshingRegion.Capture(resolved.World, new MatterBrickAddress(x, y, z));
                report.snapshotMilliseconds += ToMilliseconds(Stopwatch.GetTimestamp() - snapshot);
                long mesh = Stopwatch.GetTimestamp();
                MatterMeshData data = mesher.Generate(region);
                report.surfaceNetsMilliseconds += ToMilliseconds(Stopwatch.GetTimestamp() - mesh);
                report.vertices += data.Vertices.Length; report.triangles += data.TriangleCount;
                unchecked { meshHash ^= (long)data.DeterministicHash; meshHash *= 1099511628211L; }
            }
            report.meshHash = unchecked((ulong)meshHash).ToString("X16");
            return report;
        }

        private static void ConfigureEnvironment(CameraKind kind, bool u4b = false)
        {
            var cameraObject = new GameObject("U4 Matter Camera");
            Camera camera = cameraObject.AddComponent<Camera>();
            camera.tag = "MainCamera";
            camera.nearClipPlane = 0.1f; camera.farClipPlane = 300f;
            camera.cullingMask = ~0;
            camera.targetTexture = null;
            camera.rect = new Rect(0f, 0f, 1f, 1f);
            camera.targetDisplay = 0;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.078f, 0.105f, 0.12f, 1f);
            HDAdditionalCameraData cameraData = cameraObject.AddComponent<HDAdditionalCameraData>();
            cameraData.clearColorMode = HDAdditionalCameraData.ClearColorMode.Color;
            cameraData.backgroundColorHDR = camera.backgroundColor;
            cameraData.volumeLayerMask = 1;
            cameraData.volumeAnchorOverride = camera.transform;
            if (kind == CameraKind.Gallery)
            {
                camera.orthographic = true; camera.orthographicSize = u4b ? 14.4f : 13.5f;
                cameraObject.transform.position = new Vector3(0f, 27f, -43f);
                cameraObject.transform.LookAt(new Vector3(0f, 0.5f, 0f));
            }
            else if (kind == CameraKind.Comparison)
            {
                camera.orthographic = true; camera.orthographicSize = u4b ? 12.4f : 18.2f;
                cameraObject.transform.position = new Vector3(0f, 37f, -54f);
                cameraObject.transform.LookAt(new Vector3(0f, 0.5f, 0f));
            }
            else if (kind == CameraKind.Seam)
            {
                camera.orthographic = true; camera.orthographicSize = 2.8f;
                cameraObject.transform.position = new Vector3(1.8f, 2.6f, -4.8f);
                cameraObject.transform.LookAt(new Vector3(0f, 0.55f, 0f));
            }
            else
            {
                camera.orthographic = true; camera.orthographicSize = 3.5f;
                cameraObject.transform.position = new Vector3(7f, 7.2f, -12f);
                cameraObject.transform.LookAt(new Vector3(0f, 1.25f, 0f));
            }

            var keyObject = new GameObject(u4b ? "U4B Neutral Stylized Key" : "U4 Warm Stylized Key");
            keyObject.transform.rotation = Quaternion.Euler(34f, -31f, 0f);
            Light key = keyObject.AddComponent<Light>();
            key.type = LightType.Directional; key.intensity = 2.3f;
            key.color = u4b ? new Color(0.90f, 0.95f, 1f) : new Color(1f, 0.91f, 0.77f); key.shadows = LightShadows.Soft;
            var fillObject = new GameObject("U4 Cool Fill");
            fillObject.transform.rotation = Quaternion.Euler(24f, 147f, 0f);
            Light fill = fillObject.AddComponent<Light>();
            fill.type = LightType.Directional; fill.intensity = 0.38f;
            fill.color = new Color(0.66f, 0.78f, 1f); fill.shadows = LightShadows.None;

            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = u4b ? new Color(0.18f, 0.22f, 0.27f) : new Color(0.25f, 0.28f, 0.30f);
            EnsureFolders();
            string exposurePath = u4b ? U4BExposurePath : ExposurePath;
            VolumeProfile profile = AssetDatabase.LoadAssetAtPath<VolumeProfile>(exposurePath);
            if (profile == null)
            {
                profile = ScriptableObject.CreateInstance<VolumeProfile>();
                profile.name = u4b ? "U4B Fixed Exposure" : "U4 Fixed Exposure";
                AssetDatabase.CreateAsset(profile, exposurePath);
            }
            if (!profile.TryGet(out Exposure exposure))
            {
                exposure = profile.Add<Exposure>(true);
                AssetDatabase.AddObjectToAsset(exposure, profile);
            }
            exposure.mode.overrideState = true; exposure.mode.value = ExposureMode.Fixed;
            exposure.fixedExposure.overrideState = true; exposure.fixedExposure.value = 0f;
            profile.Reset();
            EditorUtility.SetDirty(exposure);
            EditorUtility.SetDirty(profile);
            var volumeObject = new GameObject("U4 Fixed Exposure Volume");
            Volume volume = volumeObject.AddComponent<Volume>();
            volume.isGlobal = true; volume.priority = 100f; volume.sharedProfile = profile;
        }

        private static void EnsureFolders()
        {
            EnsureFolder("Assets/Wildkin/Matter", "Materials");
            EnsureFolder("Assets/Wildkin/Matter/Materials", "U4");
            EnsureFolder("Assets/Wildkin/Matter/Materials", "U4B");
            EnsureFolder(MaterialFolder, "Textures");
            EnsureFolder(U4BMaterialFolder, "Textures");
        }

        private static RockStampGalleryView RequireActivePreview()
        {
            RockStampGalleryView view = UnityEngine.Object.FindFirstObjectByType<RockStampGalleryView>();
            if (view == null) throw new InvalidOperationException("No active U4 rock stamp/gallery is loaded.");
            // Editor domain reloads discard generated meshes/lists, while the saved scene retains
            // deterministic seed/profile settings. Rebuild through the same runtime authority.
            if (!view.HasRuntimeMatter) view.Regenerate();
            return view;
        }

        private static RockStampGalleryView PrepareCleanGalleryScene()
        {
            if (!File.Exists(Path.Combine(Application.dataPath, "Wildkin/Scenes/Tech/U4RockGallery.unity")))
                throw new FileNotFoundException("Generate the U4 gallery scene before preparing its player build.", GalleryScenePath);
            EditorSceneManager.OpenScene(GalleryScenePath, OpenSceneMode.Single);
            RockStampGalleryView view = UnityEngine.Object.FindFirstObjectByType<RockStampGalleryView>();
            if (view == null) throw new InvalidOperationException("The saved U4 gallery scene has no RockStampGalleryView runtime configuration.");
            view.ClearPreviewForSceneSave();
            Scene scene = SceneManager.GetActiveScene();
            EditorSceneManager.MarkSceneDirty(scene);
            if (!EditorSceneManager.SaveScene(scene, GalleryScenePath))
                throw new InvalidOperationException("Could not save the clean U4 gallery scene.");
            return view;
        }

        private static RockStampGalleryView PrepareCleanU4BScene()
        {
            if (!File.Exists(Path.Combine(Application.dataPath, "Wildkin/Scenes/Tech/U4BRockConstruction.unity")))
                throw new FileNotFoundException("Generate the U4B gallery scene before preparing its player build.", U4BScenePath);
            EditorSceneManager.OpenScene(U4BScenePath, OpenSceneMode.Single);
            RockStampGalleryView view = UnityEngine.Object.FindFirstObjectByType<RockStampGalleryView>();
            if (view == null) throw new InvalidOperationException("The saved U4B scene has no RockStampGalleryView runtime configuration.");
            view.ClearPreviewForSceneSave();
            Scene scene = SceneManager.GetActiveScene();
            EditorSceneManager.MarkSceneDirty(scene);
            if (!EditorSceneManager.SaveScene(scene, U4BScenePath))
                throw new InvalidOperationException("Could not save the clean U4B scene.");
            return view;
        }

        private static void EnsureFolder(string parent, string name)
        {
            string path = parent + "/" + name;
            if (!AssetDatabase.IsValidFolder(path)) AssetDatabase.CreateFolder(parent, name);
        }

        private static string EvidencePath(string filename)
            => EvidencePath(filename, false);

        private static string EvidencePath(string filename, bool u4b)
        {
            string projectRoot = Directory.GetParent(Application.dataPath).FullName;
            string repositoryRoot = Directory.GetParent(Directory.GetParent(Directory.GetParent(projectRoot).FullName).FullName).FullName;
            string folder = Path.Combine(repositoryRoot, u4b ? U4BEvidenceRelativePath : EvidenceRelativePath);
            Directory.CreateDirectory(folder);
            return Path.Combine(folder, filename);
        }

        private static void ValidateEvidenceFilename(string filename, string extension)
        {
            if (string.IsNullOrWhiteSpace(filename) || Path.GetFileName(filename) != filename ||
                !filename.EndsWith(extension, StringComparison.OrdinalIgnoreCase))
                throw new ArgumentException("Use a simple evidence filename with extension " + extension + ".", nameof(filename));
        }

        private static void ValidateResolution(float spacing)
        {
            if (Math.Abs(spacing - 0.5f) > 0.0001f && Math.Abs(spacing - 0.25f) > 0.0001f)
                throw new ArgumentOutOfRangeException(nameof(spacing), "U4 supports uniform 0.50m or bounded hero 0.25m only.");
        }

        private static string EscapeJson(string value) => value.Replace("\\", "\\\\").Replace("\"", "\\\"");
        private static double ToMilliseconds(long ticks) => ticks * 1000d / Stopwatch.Frequency;
        private static int[] ParseSeedSet(string csv)
        {
            if (string.IsNullOrWhiteSpace(csv)) throw new ArgumentException("Provide six comma-separated matched seeds.", nameof(csv));
            string[] tokens = csv.Split(',');
            if (tokens.Length != 6) throw new ArgumentException("The matched construction bakeoff requires exactly six seeds.", nameof(csv));
            var seeds = new int[tokens.Length];
            var unique = new System.Collections.Generic.HashSet<int>();
            for (int index = 0; index < tokens.Length; index++)
            {
                if (!int.TryParse(tokens[index].Trim(), out seeds[index]) || !unique.Add(seeds[index]))
                    throw new ArgumentException("Matched seeds must be six distinct integers.", nameof(csv));
            }
            return seeds;
        }

        private enum CameraKind { Gallery, Comparison, Hero, Seam }
        [Serializable] private sealed class CaptureResult { public string imagePath; public string metricsPath; public int seedCount; }
    }
}
