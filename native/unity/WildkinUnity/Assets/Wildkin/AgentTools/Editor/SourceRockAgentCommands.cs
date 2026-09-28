using System;
using System.IO;
using System.Text;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.Rendering;
using UnityEngine.Rendering.HighDefinition;
using Unity.Pipeline.Commands;
using Wildkin.Matter;
using Wildkin.Matter.Unity;

namespace Wildkin.AgentTools.Editor
{
    public static class SourceRockAgentCommands
    {
        private const string ScenePath = "Assets/Wildkin/Scenes/Tech/U4CSourceMatterFidelity.unity";
        private const string ExposurePath = "Assets/Wildkin/Matter/Materials/U4C/U4CNeutralExposure.asset";
        private const string EvidenceRelativePath = "native/evidence/unity/u4c-source-matter-fidelity";
        private const float SourceGeometryExposureEv = 0f;
        private const float DefaultCameraTargetY = 1.15f;
        private static readonly Vector3 DefaultCameraOffset = new Vector3(6.7f, 6.2f, -10.5f);

        [Serializable]
        private sealed class SourceRockSetReport
        {
            public string phase = "U4C_SOURCE_GATE";
            public SourceRockPreviewReport[] rocks;
            public string evidenceDirectory;
        }

        [Serializable]
        private sealed class SourceRockRecipeSet
        {
            public string recipeVersion = "BeveledCompositeHalfSpaceRock-v2";
            public SourceRockRecipeReport[] rocks;
        }

        [Serializable]
        private sealed class SourceRockRecipeReport
        {
            public string label;
            public string archetype;
            public int seed;
            public ulong geometryHash;
            public int componentCount;
            public SourceRockRecipePartReport[] components;
        }

        [Serializable]
        private sealed class SourceRockRecipePartReport
        {
            public float[] offset;
            public SourceRockPlaneReport[] planes;
        }

        [Serializable]
        private sealed class SourceRockPlaneReport
        {
            public float[] normal;
            public float distance;
        }

        [Serializable]
        private sealed class CaptureReport
        {
            public string imagePath;
            public string metricsPath;
            public string archetype;
            public int seed;
            public string view;
        }

        private struct BehaviourState
        {
            public Behaviour behaviour;
            public bool enabled;

            public BehaviourState(Behaviour behaviour)
            {
                this.behaviour = behaviour;
                enabled = behaviour.enabled;
            }
        }

        private struct RendererState
        {
            public Renderer renderer;
            public bool enabled;

            public RendererState(Renderer renderer)
            {
                this.renderer = renderer;
                enabled = renderer.enabled;
            }
        }

        [CliCommand("generate_source_rock",
            "Generate one direct plane-set U4C source rock without voxelizing it.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4c", "source_geometry" })]
        public static string GenerateSourceRock(
            [CliArg("archetype", "A/Capstone Slab, B/Chunky Boulder, or C/Buttress Wedge.")] string archetype = "A",
            [CliArg("seed", "Deterministic source recipe seed.")] int seed = 4101,
            [CliArg("wireframe", "Show source triangles for topology inspection.")] bool wireframe = false)
        {
            SourceRockArchetype parsed = ParseArchetype(archetype);
            SourceRockGalleryView view = PrepareScene(parsed, seed, wireframe);
            FrameSourceCamera(FindCamera(SceneManager.GetSceneByPath(ScenePath)), view.Source, 0f);
            return view.ReportJson();
        }

        [CliCommand("inspect_source_rock",
            "Return plane recipe, direct source topology, bounds, and deterministic geometry hash.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4c", "inspection" })]
        public static string InspectSourceRock(
            [CliArg("archetype", "A/Capstone Slab, B/Chunky Boulder, or C/Buttress Wedge.")] string archetype = "A",
            [CliArg("seed", "Deterministic source recipe seed.")] int seed = 4101)
        {
            SourceRockArchetype parsed = ParseArchetype(archetype);
            SourceRockMesh source = ProceduralSourceRockGenerator.Generate(parsed, seed);
            SourceRockPreviewReport report = JsonUtility.FromJson<SourceRockPreviewReport>(
                CreatePreviewReport(parsed, seed, source));
            SourceRockRecipeReport recipe = MakeRecipeReport(parsed, seed, source);
            return "{\"mesh\":" + JsonUtility.ToJson(report, true) + ",\"recipe\":" +
                   JsonUtility.ToJson(recipe, true) + "}";
        }

        [CliCommand("capture_source_rock",
            "Capture the direct source mesh beauty, second angle, or wireframe view before voxelization.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4c", "capture" })]
        public static string CaptureSourceRock(
            [CliArg("archetype", "A/Capstone Slab, B/Chunky Boulder, or C/Buttress Wedge.")] string archetype = "A",
            [CliArg("view", "beauty, second_angle, or wireframe.")] string view = "beauty",
            [CliArg("filename", "PNG filename in the U4C evidence folder; defaults from archetype/view.")] string filename = "",
            [CliArg("seed", "Deterministic source recipe seed.")] int seed = 4101,
            [CliArg("width", "Capture width in pixels.")] int width = 1920,
            [CliArg("height", "Capture height in pixels.")] int height = 1080)
        {
            SourceRockArchetype parsed = ParseArchetype(archetype);
            bool wire = string.Equals(view, "wireframe", StringComparison.OrdinalIgnoreCase);
            if (!wire && !string.Equals(view, "beauty", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(view, "second_angle", StringComparison.OrdinalIgnoreCase))
                throw new ArgumentException("View must be beauty, second_angle, or wireframe.", nameof(view));
            if (string.IsNullOrWhiteSpace(filename)) filename = CaptureFilename(parsed, view);
            ValidateEvidenceFilename(filename, ".png");
            SourceRockGalleryView preview = PrepareScene(parsed, seed, wire);
            Camera camera = FindCamera(SceneManager.GetSceneByPath(ScenePath));
            Vector3 oldPosition = camera.transform.position;
            Quaternion oldRotation = camera.transform.rotation;
            try
            {
                FrameSourceCamera(camera, preview.Source,
                    string.Equals(view, "second_angle", StringComparison.OrdinalIgnoreCase) ? 58f : 0f);
                string imagePath = EvidencePath(filename);
                CaptureInScene(SceneManager.GetSceneByPath(ScenePath), camera, imagePath, width, height);
                string metricsPath = EvidencePath(Path.GetFileNameWithoutExtension(filename) + "-metrics.json");
                File.WriteAllText(metricsPath, preview.ReportJson());
                return JsonUtility.ToJson(new CaptureReport
                {
                    imagePath = imagePath, metricsPath = metricsPath,
                    archetype = SourceRockGalleryView.Name(parsed), seed = seed, view = view
                }, true);
            }
            finally
            {
                camera.transform.SetPositionAndRotation(oldPosition, oldRotation);
            }
        }

        [CliCommand("capture_source_rock_set",
            "Capture the three direct source-rock beauty, second-angle, and wireframe views plus their fixed recipes.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4c", "capture" })]
        public static string CaptureSourceRockSet()
        {
            SourceRockArchetype[] archetypes =
            {
                SourceRockArchetype.CapstoneSlab,
                SourceRockArchetype.ChunkyBoulder,
                SourceRockArchetype.ButtressWedge
            };
            var reports = new SourceRockPreviewReport[archetypes.Length];
            var recipes = new SourceRockRecipeReport[archetypes.Length];
            for (int index = 0; index < archetypes.Length; index++)
            {
                SourceRockArchetype archetype = archetypes[index];
                int seed = FixedSeed(archetype);
                SourceRockGalleryView preview = PrepareScene(archetype, seed, false);
                Scene scene = SceneManager.GetSceneByPath(ScenePath);
                Camera camera = FindCamera(scene);
                reports[index] = JsonUtility.FromJson<SourceRockPreviewReport>(preview.ReportJson());
                SourceRockMesh source = preview.Source;
                recipes[index] = MakeRecipeReport(archetype, seed, source);
                string label = Label(archetype);
                File.WriteAllText(EvidencePath("source-rock-" + label + "-metrics.json"),
                    JsonUtility.ToJson(reports[index], true));
                Vector3 oldPosition = camera.transform.position;
                Quaternion oldRotation = camera.transform.rotation;
                try
                {
                    FrameSourceCamera(camera, source, 0f);
                    CaptureInScene(scene, camera, EvidencePath("source-rock-" + label + "-beauty.png"), 1920, 1080);
                    FrameSourceCamera(camera, source, 58f);
                    CaptureInScene(scene, camera, EvidencePath("source-rock-" + label + "-angle2.png"), 1920, 1080);
                }
                finally { camera.transform.SetPositionAndRotation(oldPosition, oldRotation); }

                try
                {
                    preview.Configure(archetype, seed, true);
                    FrameSourceCamera(camera, source, 0f);
                    CaptureInScene(scene, camera, EvidencePath("source-rock-" + label + "-wireframe.png"), 1920, 1080);
                }
                finally
                {
                    preview.Configure(archetype, seed, false);
                    camera.transform.SetPositionAndRotation(oldPosition, oldRotation);
                }
            }
            string recipePath = EvidencePath("source-rock-recipes.json");
            File.WriteAllText(recipePath, JsonUtility.ToJson(new SourceRockRecipeSet { rocks = recipes }, true));
            return JsonUtility.ToJson(new SourceRockSetReport
            {
                rocks = reports,
                evidenceDirectory = Path.GetDirectoryName(recipePath)
            }, true);
        }

        private static SourceRockGalleryView PrepareScene(SourceRockArchetype archetype, int seed, bool wireframe)
        {
            Scene scene = SceneManager.GetSceneByPath(ScenePath);
            if (!scene.IsValid() || !scene.isLoaded)
            {
                scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Additive);
                scene.name = "U4CSourceMatterFidelity";
                CreateEnvironment(scene);
                GameObject root = new GameObject("U4C Source Rock Preview");
                SceneManager.MoveGameObjectToScene(root, scene);
                root.AddComponent<SourceRockGalleryView>();
                EditorSceneManager.MarkSceneDirty(scene);
                if (!EditorSceneManager.SaveScene(scene, ScenePath))
                    throw new InvalidOperationException("Could not save the U4C source preview scene.");
            }

            Scene previous = SceneManager.GetActiveScene();
            SceneManager.SetActiveScene(scene);
            ApplyEnvironment(scene);
            SourceRockGalleryView view = FindView(scene);
            view.Configure(archetype, seed, wireframe);
            EditorSceneManager.MarkSceneDirty(scene);
            view.ClearPreviewForSceneSave();
            if (!EditorSceneManager.SaveScene(scene, ScenePath))
                throw new InvalidOperationException("Could not save the clean U4C scene configuration.");
            view.Configure(archetype, seed, wireframe);
            if (previous.IsValid() && previous.isLoaded && previous.path != ScenePath)
                SceneManager.SetActiveScene(previous);
            return view;
        }

        private static void ApplyEnvironment(Scene scene)
        {
            GameObject[] roots = scene.GetRootGameObjects();
            for (int i = 0; i < roots.Length; i++)
            {
                Light light = roots[i].GetComponent<Light>();
                if (light == null) continue;
                if (roots[i].name == "U4C Broad Face Key")
                {
                    light.type = LightType.Directional;
                    light.intensity = 2.3f;
                    light.color = Color.white;
                    light.shadows = LightShadows.None;
                    EditorUtility.SetDirty(light);
                }
                else if (roots[i].name == "U4C Soft Fill")
                {
                    light.type = LightType.Directional;
                    light.intensity = 0.38f;
                    light.color = new Color(0.90f, 0.92f, 0.94f);
                    light.shadows = LightShadows.None;
                    EditorUtility.SetDirty(light);
                }
                Volume volume = roots[i].GetComponent<Volume>();
                if (volume != null && volume.sharedProfile != null &&
                    volume.sharedProfile.TryGet(out Exposure exposure))
                {
                    exposure.mode.overrideState = true;
                    exposure.mode.value = ExposureMode.Fixed;
                    exposure.fixedExposure.overrideState = true;
                    exposure.fixedExposure.value = SourceGeometryExposureEv;
                    EditorUtility.SetDirty(exposure);
                    EditorUtility.SetDirty(volume.sharedProfile);
                }
            }
            AssetDatabase.SaveAssets();
            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.18f, 0.20f, 0.22f);
        }

        private static SourceRockGalleryView FindView(Scene scene)
        {
            GameObject[] roots = scene.GetRootGameObjects();
            for (int i = 0; i < roots.Length; i++)
            {
                SourceRockGalleryView view = roots[i].GetComponentInChildren<SourceRockGalleryView>(true);
                if (view != null) return view;
            }
            throw new InvalidOperationException("The U4C scene has no SourceRockGalleryView root.");
        }

        private static Camera FindCamera(Scene scene)
        {
            GameObject[] roots = scene.GetRootGameObjects();
            for (int i = 0; i < roots.Length; i++)
            {
                Camera camera = roots[i].GetComponentInChildren<Camera>(true);
                if (camera != null) return camera;
            }
            throw new InvalidOperationException("The U4C scene has no comparison camera.");
        }

        internal static void CreateEnvironment(Scene scene)
        {
            GameObject cameraObject = new GameObject("U4C Neutral Geometry Camera");
            SceneManager.MoveGameObjectToScene(cameraObject, scene);
            Camera camera = cameraObject.AddComponent<Camera>();
            camera.tag = "MainCamera";
            camera.nearClipPlane = 0.1f; camera.farClipPlane = 100f;
            camera.orthographic = true; camera.orthographicSize = 2.8f;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.078f, 0.105f, 0.12f, 1f);
            HDAdditionalCameraData cameraData = cameraObject.AddComponent<HDAdditionalCameraData>();
            cameraData.clearColorMode = HDAdditionalCameraData.ClearColorMode.Color;
            cameraData.backgroundColorHDR = camera.backgroundColor;
            cameraData.volumeLayerMask = 1 << 1;
            cameraData.volumeAnchorOverride = camera.transform;
            Vector3 target = new Vector3(0f, DefaultCameraTargetY, 0f);
            camera.transform.position = target + DefaultCameraOffset;
            camera.transform.LookAt(target);

            GameObject keyObject = new GameObject("U4C Broad Face Key");
            SceneManager.MoveGameObjectToScene(keyObject, scene);
            keyObject.transform.rotation = Quaternion.Euler(34f, -31f, 0f);
            Light key = keyObject.AddComponent<Light>();
            key.type = LightType.Directional; key.intensity = 2.3f;
            key.color = Color.white; key.shadows = LightShadows.None;
            GameObject fillObject = new GameObject("U4C Soft Fill");
            SceneManager.MoveGameObjectToScene(fillObject, scene);
            fillObject.transform.rotation = Quaternion.Euler(24f, 147f, 0f);
            Light fill = fillObject.AddComponent<Light>();
            fill.type = LightType.Directional; fill.intensity = 0.38f;
            fill.color = new Color(0.90f, 0.92f, 0.94f); fill.shadows = LightShadows.None;

            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.18f, 0.20f, 0.22f);
            VolumeProfile profile = EnsureExposureProfile();
            GameObject volumeObject = new GameObject("U4C Fixed Exposure Volume");
            SceneManager.MoveGameObjectToScene(volumeObject, scene);
            volumeObject.layer = 1;
            Volume volume = volumeObject.AddComponent<Volume>();
            volume.isGlobal = true; volume.priority = 100f; volume.sharedProfile = profile;
        }

        private static VolumeProfile EnsureExposureProfile()
        {
            EnsureFolder("Assets/Wildkin/Matter", "Materials");
            EnsureFolder("Assets/Wildkin/Matter/Materials", "U4C");
            VolumeProfile profile = AssetDatabase.LoadAssetAtPath<VolumeProfile>(ExposurePath);
            if (profile == null)
            {
                profile = ScriptableObject.CreateInstance<VolumeProfile>();
                profile.name = "U4C Neutral Geometry Exposure";
                AssetDatabase.CreateAsset(profile, ExposurePath);
            }
            if (!profile.TryGet(out Exposure exposure)) exposure = profile.Add<Exposure>(true);
            if (!AssetDatabase.Contains(exposure)) AssetDatabase.AddObjectToAsset(exposure, profile);
            exposure.mode.overrideState = true; exposure.mode.value = ExposureMode.Fixed;
            exposure.fixedExposure.overrideState = true; exposure.fixedExposure.value = SourceGeometryExposureEv;
            EditorUtility.SetDirty(exposure); EditorUtility.SetDirty(profile);
            AssetDatabase.SaveAssetIfDirty(profile);
            AssetDatabase.SaveAssets();
            return profile;
        }

        private static void FrameSourceCamera(Camera camera, SourceRockMesh source, float yawDegrees)
        {
            MatterFloat3 minimum = source.BoundsMin, maximum = source.BoundsMax;
            Vector3 target = new Vector3((minimum.X + maximum.X) * 0.5f,
                (minimum.Y + maximum.Y) * 0.5f, (minimum.Z + maximum.Z) * 0.5f);
            Vector3 offset = yawDegrees == 0f
                ? DefaultCameraOffset
                : Quaternion.Euler(0f, yawDegrees, 0f) * DefaultCameraOffset;
            camera.transform.position = target + offset;
            camera.transform.LookAt(target);
        }

        internal static void CaptureInScene(Scene scene, Camera camera, string path, int width, int height)
        {
            Scene previous = SceneManager.GetActiveScene();
            if (!scene.IsValid() || !scene.isLoaded)
                throw new InvalidOperationException("The U4C source comparison scene is not loaded.");
            bool changed = previous.handle != scene.handle;
            if (changed && !SceneManager.SetActiveScene(scene))
                throw new InvalidOperationException("Could not activate the U4C source comparison scene for capture.");
            var hiddenBehaviours = new System.Collections.Generic.List<BehaviourState>();
            var hiddenRenderers = new System.Collections.Generic.List<RendererState>();
            try
            {
                for (int sceneIndex = 0; sceneIndex < SceneManager.sceneCount; sceneIndex++)
                {
                    Scene other = SceneManager.GetSceneAt(sceneIndex);
                    if (!other.IsValid() || !other.isLoaded || other.handle == scene.handle) continue;
                    GameObject[] roots = other.GetRootGameObjects();
                    for (int rootIndex = 0; rootIndex < roots.Length; rootIndex++)
                    {
                        SuppressRenderers(roots[rootIndex], hiddenRenderers);
                        Suppress<Light>(roots[rootIndex], hiddenBehaviours);
                        Suppress<Camera>(roots[rootIndex], hiddenBehaviours);
                        Suppress<Volume>(roots[rootIndex], hiddenBehaviours);
                        Suppress<ReflectionProbe>(roots[rootIndex], hiddenBehaviours);
                    }
                }
                RockStampGalleryView.Capture(camera, path, width, height);
            }
            finally
            {
                for (int i = hiddenBehaviours.Count - 1; i >= 0; i--)
                    if (hiddenBehaviours[i].behaviour != null)
                        hiddenBehaviours[i].behaviour.enabled = hiddenBehaviours[i].enabled;
                for (int i = hiddenRenderers.Count - 1; i >= 0; i--)
                    if (hiddenRenderers[i].renderer != null)
                        hiddenRenderers[i].renderer.enabled = hiddenRenderers[i].enabled;
                if (changed && previous.IsValid() && previous.isLoaded)
                    SceneManager.SetActiveScene(previous);
            }
        }

        private static void SuppressRenderers(GameObject root,
            System.Collections.Generic.List<RendererState> hiddenRenderers)
        {
            Renderer[] components = root.GetComponentsInChildren<Renderer>(true);
            for (int i = 0; i < components.Length; i++)
            {
                if (!components[i].enabled) continue;
                hiddenRenderers.Add(new RendererState(components[i]));
                components[i].enabled = false;
            }
        }

        private static void Suppress<T>(GameObject root,
            System.Collections.Generic.List<BehaviourState> hiddenBehaviours) where T : Behaviour
        {
            T[] components = root.GetComponentsInChildren<T>(true);
            for (int i = 0; i < components.Length; i++)
            {
                if (!components[i].enabled) continue;
                hiddenBehaviours.Add(new BehaviourState(components[i]));
                components[i].enabled = false;
            }
        }

        private static string CreatePreviewReport(SourceRockArchetype archetype, int seed, SourceRockMesh source)
        {
            return JsonUtility.ToJson(new SourceRockPreviewReport
            {
                archetype = SourceRockGalleryView.Name(archetype), seed = seed,
                recipeVersion = source.Recipe.RecipeVersion, componentCount = source.ComponentCount,
                planeCount = source.Recipe.PlaneCount,
                faceCount = source.FaceCount, uniqueVertices = source.VertexCount, triangles = source.TriangleCount,
                closedManifold = source.IsClosedManifold(out string issue), manifoldIssue = issue,
                boundsMinMeters = Format(source.BoundsMin), boundsMaxMeters = Format(source.BoundsMax),
                geometryHash = source.DeterministicHash.ToString("X16"),
                sourceAuthorityNote = "Direct source geometry. Matter conversion is withheld until the independent visual gate passes."
            }, true);
        }

        private static SourceRockRecipeReport MakeRecipeReport(SourceRockArchetype archetype, int seed, SourceRockMesh source)
        {
            var report = new SourceRockRecipeReport
            {
                label = Label(archetype), archetype = SourceRockGalleryView.Name(archetype), seed = seed,
                geometryHash = source.DeterministicHash, componentCount = source.ComponentCount,
                components = new SourceRockRecipePartReport[source.ComponentCount]
            };
            for (int partIndex = 0; partIndex < report.components.Length; partIndex++)
            {
                MatterFloat3 offset = source.Recipe.GetPartOffset(partIndex);
                int planeCount = source.Recipe.GetPartPlaneCount(partIndex);
                var component = new SourceRockRecipePartReport
                {
                    offset = new[] { offset.X, offset.Y, offset.Z },
                    planes = new SourceRockPlaneReport[planeCount]
                };
                for (int planeIndex = 0; planeIndex < planeCount; planeIndex++)
                {
                    SourceRockPlane plane = source.Recipe.GetPartPlane(partIndex, planeIndex);
                    component.planes[planeIndex] = new SourceRockPlaneReport
                    {
                        normal = new[] { plane.Normal.X, plane.Normal.Y, plane.Normal.Z },
                        distance = plane.Distance
                    };
                }
                report.components[partIndex] = component;
            }
            return report;
        }

        private static SourceRockArchetype ParseArchetype(string value)
        {
            if (SourceRockGalleryView.TryParse(value, out SourceRockArchetype parsed)) return parsed;
            throw new ArgumentException("Archetype must be A/Capstone Slab, B/Chunky Boulder, or C/Buttress Wedge.", nameof(value));
        }

        private static int FixedSeed(SourceRockArchetype archetype)
            => archetype == SourceRockArchetype.CapstoneSlab ? 4101 :
               archetype == SourceRockArchetype.ChunkyBoulder ? 4102 : 4103;

        private static string Label(SourceRockArchetype archetype)
            => archetype == SourceRockArchetype.CapstoneSlab ? "A" :
               archetype == SourceRockArchetype.ChunkyBoulder ? "B" : "C";

        private static string CaptureFilename(SourceRockArchetype archetype, string view)
        {
            string suffix = string.Equals(view, "second_angle", StringComparison.OrdinalIgnoreCase) ? "angle2" :
                string.Equals(view, "wireframe", StringComparison.OrdinalIgnoreCase) ? "wireframe" : "beauty";
            return "source-rock-" + Label(archetype) + "-" + suffix + ".png";
        }

        private static string EvidencePath(string filename)
        {
            string projectRoot = Directory.GetParent(Application.dataPath).FullName;
            string repositoryRoot = Directory.GetParent(Directory.GetParent(Directory.GetParent(projectRoot).FullName).FullName).FullName;
            string folder = Path.Combine(repositoryRoot, EvidenceRelativePath);
            Directory.CreateDirectory(folder);
            return Path.Combine(folder, filename);
        }

        private static void ValidateEvidenceFilename(string filename, string extension)
        {
            if (string.IsNullOrWhiteSpace(filename) || Path.GetFileName(filename) != filename ||
                !filename.EndsWith(extension, StringComparison.OrdinalIgnoreCase))
                throw new ArgumentException("Use a simple evidence filename with extension " + extension + ".", nameof(filename));
        }

        private static string Format(MatterFloat3 value)
            => string.Format(System.Globalization.CultureInfo.InvariantCulture, "({0:F4}, {1:F4}, {2:F4})", value.X, value.Y, value.Z);

        private static void EnsureFolder(string parent, string name)
        {
            string path = parent + "/" + name;
            if (!AssetDatabase.IsValidFolder(path)) AssetDatabase.CreateFolder(parent, name);
        }
    }
}
