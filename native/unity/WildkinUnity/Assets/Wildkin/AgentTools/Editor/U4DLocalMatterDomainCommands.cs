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
using Process = System.Diagnostics.Process;
using ProcessStartInfo = System.Diagnostics.ProcessStartInfo;

namespace Wildkin.AgentTools.Editor
{
    /// <summary>U4D commands act on the authored scene's real MatterDomainQualificationView.</summary>
    public static class U4DLocalMatterDomainCommands
    {
        private const string ScenePath = "Assets/Wildkin/Scenes/Tech/U4DLocalMatterDomain.unity";
        private const string MaterialPath = "Assets/Wildkin/Matter/Materials/U4B/U4BStylizedRockDirt.mat";
        private const string ExposurePath = "Assets/Wildkin/Matter/Materials/U4C/U4CNeutralExposure.asset";
        private const string EvidenceRelativePath = "native/evidence/unity/u4d-local-matter-domain";

        [Serializable]
        private sealed class SceneReceipt
        {
            public string scenePath;
            public string evidencePath;
            public float worldSpacingMeters = .5f;
            public float domain025SpacingMeters = .25f;
            public float domain0125SpacingMeters = .125f;
            public string initialization = "The saved scene stores only the repeatable view configuration; runtime meshes and domains are rebuilt from bounded matter/source inputs.";
        }

        [Serializable]
        private sealed class BuildReceipt
        {
            public string unityVersion;
            public string result;
            public string output;
            public string scene;
            public string playerExitCode;
            public ulong bytes;
            public int errors;
            public int warnings;
            public double seconds;
            public string capture;
            public bool editorSequenceFilesPresent;
        }

        [CliCommand("u4d_prepare_scene", "Create or open the clean U4D scene with the 0.50 m world and local-domain qualification view.",
            MainThreadRequired = true, Tags = new[] { "u4d", "matter", "scenes" })]
        public static string PrepareScene()
        {
            EnsureAssetFolder("Assets/Wildkin/Scenes");
            EnsureAssetFolder("Assets/Wildkin/Scenes/Tech");
            MatterDomainQualificationView view = FindOrCreateView(out Scene scene, out Scene previousActive);
            Material material = AssetDatabase.LoadAssetAtPath<Material>(MaterialPath);
            if (material == null) throw new FileNotFoundException("The accepted U4B rock/dirt material is missing.", MaterialPath);
            view.ConfigureSceneMaterial(material, true);
            ApplyEnvironment(scene);
            EditorUtility.SetDirty(view);
            EditorSceneManager.MarkSceneDirty(scene);
            if (!EditorSceneManager.SaveScene(scene, ScenePath))
                throw new IOException("Could not save the clean U4D scene configuration.");
            AssetDatabase.SaveAssets();
            if (previousActive.IsValid() && previousActive.isLoaded && previousActive.path != ScenePath)
                SceneManager.SetActiveScene(previousActive);
            string report = JsonUtility.ToJson(new SceneReceipt
            {
                scenePath = ScenePath,
                evidencePath = EvidencePath()
            }, true);
            return report;
        }

        [CliCommand("u4d_create_matter_domain", "Bake one accepted sculpted source into an independent editable MatterDomain.",
            MainThreadRequired = true, Tags = new[] { "u4d", "matter" })]
        public static string CreateMatterDomain(
            [CliArg("id", "Stable ID unique among domains owned by this U4D scene.")] string id,
            [CliArg("archetype", "CapstoneSlab, ChunkyBoulder, or ButtressWedge.")] string archetype,
            [CliArg("spacing", "Independent local sample spacing in metres.")] float spacing,
            [CliArg("x", "Domain world position X in metres.")] float x,
            [CliArg("y", "Domain world position Y offset above its baked base in metres.")] float y,
            [CliArg("z", "Domain world position Z in metres.")] float z,
            [CliArg("seed", "Deterministic accepted source seed.")] int seed = 4102)
        {
            var parsed = (SourceRockArchetype)Enum.Parse(typeof(SourceRockArchetype), archetype, true);
            MatterDomainQualificationView view = GetView();
            view.CreateDomain(id, parsed, seed, spacing, new MatterFloat3(x, y, z));
            return view.InspectDomainJson(id);
        }

        [CliCommand("u4d_inspect_matter_domain", "Inspect one runtime MatterDomain including pose, matter/mesh revisions, hashes, topology, and memory.",
            MainThreadRequired = true, Tags = new[] { "u4d", "matter", "observability" })]
        public static string InspectMatterDomain([CliArg("id", "Stable local MatterDomain ID.")] string id)
            => GetView().InspectDomainJson(id);

        [CliCommand("u4d_list_matter_domains", "List the independent local MatterDomains owned by the open U4D scene.",
            MainThreadRequired = true, Tags = new[] { "u4d", "matter", "observability" })]
        public static string ListMatterDomains()
            => GetView().ListDomainsJson();

        [CliCommand("u4d_edit_matter_domain_local", "Subtract a sphere from one MatterDomain in local metric coordinates.",
            MainThreadRequired = true, Tags = new[] { "u4d", "matter", "edit" })]
        public static string EditMatterDomainLocal(
            [CliArg("id", "Stable local MatterDomain ID.")] string id,
            [CliArg("x", "Local metric-space center X.")] float x,
            [CliArg("y", "Local metric-space center Y.")] float y,
            [CliArg("z", "Local metric-space center Z.")] float z,
            [CliArg("radius", "Subtractive sphere radius in metres.")] float radius)
            => JsonUtility.ToJson(GetView().EditLocal(id, new MatterFloat3(x, y, z), radius), true);

        [CliCommand("u4d_edit_matter_domain_world", "Subtract a sphere from one MatterDomain using a world-space query point.",
            MainThreadRequired = true, Tags = new[] { "u4d", "matter", "edit" })]
        public static string EditMatterDomainWorld(
            [CliArg("id", "Stable local MatterDomain ID.")] string id,
            [CliArg("x", "World-space center X.")] float x,
            [CliArg("y", "World-space center Y.")] float y,
            [CliArg("z", "World-space center Z.")] float z,
            [CliArg("radius", "Subtractive sphere radius in metres.")] float radius)
            => JsonUtility.ToJson(GetView().EditWorld(id, new MatterFloat3(x, y, z), radius), true);

        [CliCommand("u4d_move_matter_domain", "Set a local domain's world translation and yaw without resampling or remeshing its matter.",
            MainThreadRequired = true, Tags = new[] { "u4d", "matter", "transform" })]
        public static string MoveMatterDomain(
            [CliArg("id", "Stable local MatterDomain ID.")] string id,
            [CliArg("x", "World position X in metres.")] float x,
            [CliArg("y", "World position Y in metres.")] float y,
            [CliArg("z", "World position Z in metres.")] float z,
            [CliArg("yaw", "World yaw in degrees.")] float yaw)
        {
            MatterDomainQualificationView view = GetView();
            view.MoveDomain(id, new MatterFloat3(x, y, z), yaw);
            return view.InspectDomainJson(id);
        }

        [CliCommand("u4d_save_reload_matter_domain", "Write a source-free domain snapshot, destroy its runtime object, and rebuild it from the saved matter.",
            MainThreadRequired = true, Tags = new[] { "u4d", "matter", "persistence" })]
        public static string SaveReloadMatterDomain(
            [CliArg("id", "Stable local MatterDomain ID.")] string id,
            [CliArg("path", "Absolute or repository-relative snapshot JSON path.")] string path = "")
        {
            if (string.IsNullOrWhiteSpace(path)) path = Path.Combine(EvidencePath(), "metrics", "manual-" + id + ".save.json");
            return JsonUtility.ToJson(GetView().SaveReloadDomain(id, path), true);
        }

        [CliCommand("u4d_capture_scene", "Capture the overview, local detail, debug overlay, edit, moved-pose, and source-free reload sequence.",
            MainThreadRequired = true, Tags = new[] { "u4d", "matter", "evidence" })]
        public static string CaptureU4DScene([CliArg("output", "Evidence directory; defaults to the U4D evidence folder.")] string output = "")
        {
            string root = string.IsNullOrWhiteSpace(output) ? EvidencePath() : Path.GetFullPath(output);
            MatterDomainQualificationView view = GetView();
            view.InitializeQualification();
            view.RunFlagshipSequence(root);
            view.WriteEvidence(root);
            return view.ReportJson();
        }

        [CliCommand("u4d_export_receipt", "Export machine-readable domain, isolation, transform, topology, and persistence diagnostics.",
            MainThreadRequired = true, Tags = new[] { "u4d", "matter", "evidence" })]
        public static string ExportU4DReceipt([CliArg("path", "Absolute receipt JSON path; defaults inside U4D evidence.")] string path = "")
        {
            MatterDomainQualificationView view = GetView();
            string report = view.ReportJson();
            if (string.IsNullOrWhiteSpace(path)) path = Path.Combine(EvidencePath(), "receipt.json");
            string fullPath = Path.GetFullPath(path);
            Directory.CreateDirectory(Path.GetDirectoryName(fullPath));
            File.WriteAllText(fullPath, report);
            return report;
        }

        [CliCommand("u4d_build_windows_development", "Build the clean U4D scene and capture the standalone Windows x64 Development Player proof.",
            MainThreadRequired = true, Tags = new[] { "u4d", "matter", "build" })]
        public static string BuildAndRunWindowsDevelopmentPlayer()
        {
            Scene scene = SceneManager.GetSceneByPath(ScenePath);
            if (!scene.IsValid() || !scene.isLoaded) scene = EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Additive);
            MatterDomainQualificationView view = FindView(scene);
            view.PrepareSceneForBuild();
            EditorSceneManager.MarkSceneDirty(scene);
            if (!EditorSceneManager.SaveScene(scene, ScenePath))
                throw new IOException("Could not save the clean U4D Player configuration.");

            string root = EvidencePath();
            string playerFolder = Path.Combine(root, "player");
            Directory.CreateDirectory(playerFolder);
            string buildDirectory = Path.Combine(Path.GetTempPath(), "U4DLocalMatterDomain");
            Directory.CreateDirectory(buildDirectory);
            string output = Path.Combine(buildDirectory, "Wildkin-U4D.exe");
            var buildWatch = Stopwatch.StartNew();
            BuildReport build = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = output,
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.Development | BuildOptions.AllowDebugging
            });
            buildWatch.Stop();
            if (build.summary.result != BuildResult.Succeeded)
                throw new InvalidOperationException("U4D Windows Player build ended with " + build.summary.result +
                    "; errors=" + build.summary.totalErrors + ", warnings=" + build.summary.totalWarnings + ".");

            var startInfo = new ProcessStartInfo
            {
                FileName = output,
                Arguments = "--u4d-evidence-root=" + root,
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
                WorkingDirectory = buildDirectory
            };
            using (Process process = Process.Start(startInfo))
            {
                if (process == null) throw new InvalidOperationException("Could not start the U4D standalone Player.");
                if (!process.WaitForExit(300000))
                {
                    process.Kill();
                    throw new TimeoutException("U4D standalone Player evidence sequence exceeded five minutes.");
                }
                if (process.ExitCode != 0)
                    throw new InvalidOperationException("U4D standalone Player exited with code " + process.ExitCode + ".");
            }

            string capture = Path.Combine(playerFolder, "capture.png");
            string playerReceipt = Path.Combine(playerFolder, "receipt.json");
            bool evidencePresent = File.Exists(capture) && new FileInfo(capture).Length > 4096 &&
                File.Exists(playerReceipt) && File.Exists(Path.Combine(root, "captures", "07-reloaded-domain.png"));
            var receipt = new BuildReceipt
            {
                unityVersion = Application.unityVersion,
                result = build.summary.result.ToString(),
                output = output,
                scene = ScenePath,
                playerExitCode = "0",
                bytes = build.summary.totalSize,
                errors = build.summary.totalErrors,
                warnings = build.summary.totalWarnings,
                seconds = buildWatch.Elapsed.TotalSeconds,
                capture = capture,
                editorSequenceFilesPresent = evidencePresent
            };
            File.WriteAllText(Path.Combine(playerFolder, "build-provenance.json"), JsonUtility.ToJson(receipt, true));
            if (!evidencePresent) throw new InvalidOperationException("The U4D Player exited but did not write the complete evidence capture set.");

            // Restore a live Editor preview for owner inspection; generated objects stay unsaved.
            view.InitializeQualification();
            return JsonUtility.ToJson(receipt, true);
        }

        private static MatterDomainQualificationView GetView()
        {
            Scene scene = SceneManager.GetSceneByPath(ScenePath);
            if (!scene.IsValid() || !scene.isLoaded) scene = EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Additive);
            return FindView(scene);
        }

        private static MatterDomainQualificationView FindOrCreateView(out Scene scene, out Scene previousActive)
        {
            previousActive = SceneManager.GetActiveScene();
            scene = SceneManager.GetSceneByPath(ScenePath);
            if (!scene.IsValid() || !scene.isLoaded)
            {
                if (File.Exists(ScenePath))
                {
                    scene = EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Additive);
                }
                else
                {
                    scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Additive);
                    scene.name = "U4DLocalMatterDomain";
                    SceneManager.SetActiveScene(scene);
                    CreateEnvironment(scene);
                    var host = new GameObject("U4D Local MatterDomain Qualification");
                    SceneManager.MoveGameObjectToScene(host, scene);
                    host.AddComponent<MatterDomainQualificationView>();
                    EditorSceneManager.MarkSceneDirty(scene);
                    if (!EditorSceneManager.SaveScene(scene, ScenePath))
                        throw new IOException("Could not create the U4D local-domain scene.");
                }
            }
            SceneManager.SetActiveScene(scene);
            MatterDomainQualificationView view = FindView(scene);
            return view;
        }

        private static MatterDomainQualificationView FindView(Scene scene)
        {
            foreach (GameObject root in scene.GetRootGameObjects())
            {
                MatterDomainQualificationView view = root.GetComponentInChildren<MatterDomainQualificationView>(true);
                if (view != null) return view;
            }
            throw new InvalidOperationException("The saved U4D scene does not contain MatterDomainQualificationView.");
        }

        private static void CreateEnvironment(Scene scene)
        {
            GameObject cameraObject = new GameObject("U4D Qualification Camera");
            SceneManager.MoveGameObjectToScene(cameraObject, scene);
            Camera camera = cameraObject.AddComponent<Camera>();
            camera.tag = "MainCamera";
            camera.nearClipPlane = .1f;
            camera.farClipPlane = 150f;
            camera.orthographic = true;
            camera.orthographicSize = 6.8f;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(.078f, .105f, .12f, 1f);
            HDAdditionalCameraData cameraData = cameraObject.AddComponent<HDAdditionalCameraData>();
            cameraData.clearColorMode = HDAdditionalCameraData.ClearColorMode.Color;
            cameraData.backgroundColorHDR = camera.backgroundColor;
            cameraData.volumeLayerMask = 1 << 1;
            cameraData.volumeAnchorOverride = camera.transform;
            Vector3 cameraPosition = new Vector3(0f, 8f, -15f);
            camera.transform.SetPositionAndRotation(cameraPosition,
                Quaternion.LookRotation(new Vector3(0f, .7f, 0f) - cameraPosition, Vector3.up));

            GameObject keyObject = new GameObject("U4D Broad Face Key");
            SceneManager.MoveGameObjectToScene(keyObject, scene);
            keyObject.transform.rotation = Quaternion.Euler(34f, -31f, 0f);
            Light key = keyObject.AddComponent<Light>();
            key.type = LightType.Directional;
            key.intensity = 2.3f;
            key.color = Color.white;
            key.shadows = LightShadows.None;

            GameObject fillObject = new GameObject("U4D Soft Fill");
            SceneManager.MoveGameObjectToScene(fillObject, scene);
            fillObject.transform.rotation = Quaternion.Euler(24f, 147f, 0f);
            Light fill = fillObject.AddComponent<Light>();
            fill.type = LightType.Directional;
            fill.intensity = .38f;
            fill.color = new Color(.9f, .92f, .94f);
            fill.shadows = LightShadows.None;

            VolumeProfile profile = AssetDatabase.LoadAssetAtPath<VolumeProfile>(ExposurePath);
            if (profile == null) throw new FileNotFoundException("U4D requires the existing U4C fixed-exposure profile.", ExposurePath);
            var volumeObject = new GameObject("U4D Fixed Exposure Volume");
            SceneManager.MoveGameObjectToScene(volumeObject, scene);
            volumeObject.layer = 1;
            Volume volume = volumeObject.AddComponent<Volume>();
            volume.isGlobal = true;
            volume.priority = 100f;
            volume.sharedProfile = profile;
            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(.18f, .2f, .22f);
        }

        private static void ApplyEnvironment(Scene scene)
        {
            foreach (GameObject root in scene.GetRootGameObjects())
            {
                Light light = root.GetComponent<Light>();
                if (light == null) continue;
                if (root.name == "U4D Broad Face Key") light.intensity = 2.3f;
                else if (root.name == "U4D Soft Fill") light.intensity = .38f;
                EditorUtility.SetDirty(light);
            }
            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(.18f, .2f, .22f);
        }

        private static void EnsureAssetFolder(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;
            string parent = Path.GetDirectoryName(path).Replace('\\', '/');
            string leaf = Path.GetFileName(path);
            if (!AssetDatabase.IsValidFolder(parent)) EnsureAssetFolder(parent);
            AssetDatabase.CreateFolder(parent, leaf);
        }

        private static string EvidencePath()
        {
            string repositoryRoot = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", "..", ".."));
            return Path.Combine(repositoryRoot, EvidenceRelativePath.Replace('/', Path.DirectorySeparatorChar));
        }
    }
}
