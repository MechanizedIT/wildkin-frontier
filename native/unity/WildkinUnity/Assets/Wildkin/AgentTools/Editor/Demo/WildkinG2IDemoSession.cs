#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using Wildkin.Matter;
using Wildkin.Matter.Unity;

namespace Wildkin.AgentTools.Editor.Demo
{
    /// <summary>Only presentation glue. Domain ownership/edit/remesh/persistence stay in the existing views.</summary>
    public sealed class WildkinG2IDemoSession : IDisposable
    {
        private Scene scene, previousScene;
        private MatterDomainQualificationView u4d;
        private U4EMultiDomainFormationView u4e;
        private bool bounds, graph;
        private bool ownsScene;
        private bool ownerAddedContent;
        private readonly HashSet<GameObject> originalRoots = new HashSet<GameObject>();
        private readonly HashSet<GameObject> ownedRoots = new HashSet<GameObject>();
        private readonly List<Light> disabledExternalLights = new List<Light>();
        public Camera Camera { get; private set; }
        public bool HasU4D => u4d != null;
        public bool HasU4E => u4e != null;
        public MatterDomainQualificationView U4D => u4d;
        public U4EMultiDomainFormationView U4E => u4e;

        public void OpenU4D()
        {
            OpenCanonical(WildkinG2IDemoCatalog.U4DScene);
            u4d = CopyView(Find<MatterDomainQualificationView>());
            Reset();
        }

        public void OpenU4E()
        {
            OpenCanonical(WildkinG2IDemoCatalog.U4EScene);
            u4e = CopyView(Find<U4EMultiDomainFormationView>());
            ShowFormation(WildkinG2IDemoCatalog.HeroSeed);
        }

        private void OpenCanonical(string path)
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode)
                throw new InvalidOperationException("Leave Play Mode before using the recording console.");
            Dispose();
            previousScene = SceneManager.GetActiveScene();
            // Open the canonical scene, but operate ONLY on DontSave copies of its view/camera.
            // No serialized source component is mutated, and no save API is used.
            scene = SceneManager.GetSceneByPath(path);
            ownsScene = !scene.IsValid() || !scene.isLoaded;
            if (ownsScene) scene = EditorSceneManager.OpenScene(path, OpenSceneMode.Additive);
            foreach (GameObject root in scene.GetRootGameObjects()) originalRoots.Add(root);
            SceneManager.SetActiveScene(scene);
            Camera sourceCamera = Find<Camera>();
            var cameraRoot = UnityEngine.Object.Instantiate(sourceCamera.gameObject);
            cameraRoot.name = "G2i disposable camera";
            Camera = cameraRoot.GetComponent<Camera>();
            Camera.enabled = false;
            Camera.overrideSceneCullingMask = EditorSceneManager.GetSceneCullingMask(scene);
            IsolateSceneLighting();
            ProtectTransientObjects();
        }

        private T CopyView<T>(T source) where T : Component
        {
            var root = new GameObject("G2i disposable " + typeof(T).Name) { hideFlags = HideFlags.DontSave };
            var copy = root.AddComponent<T>();
            ownedRoots.Add(root);
            EditorUtility.CopySerialized(source, copy);
            return copy;
        }

        private T Find<T>() where T : Component
        {
            T result = scene.GetRootGameObjects().SelectMany(r => r.GetComponentsInChildren<T>(true)).FirstOrDefault();
            if (result == null) throw new InvalidOperationException("The canonical scene is missing " + typeof(T).Name + ".");
            return result;
        }

        public void Reset()
        {
            RequireU4D();
            PreserveNewOwnerRoots();
            SceneManager.SetActiveScene(scene);
            u4d.InitializeQualification();
            bounds = false;
            u4d.SetDebugOverlays(false, false);
            ProtectTransientObjects();
            Overview();
        }

        public void Overview()
        {
            RequireU4D();
            Frame(new Vector3(0f, .7f, -2f), new Vector3(0f, 8f, -15f), 6.8f);
        }

        public void FocusHero()
        {
            RequireU4D();
            var domain = u4d.GetDomain(WildkinG2IDemoCatalog.HeroId);
            // Frame the real generated mesh, including its current edited/moved/reloaded pose.
            var renderer = scene.GetRootGameObjects().SelectMany(r => r.GetComponentsInChildren<MeshRenderer>(true))
                .First(r => r.name.Contains(WildkinG2IDemoCatalog.HeroId));
            Vector3 center = renderer.bounds.center;
            Frame(center, center + new Vector3(0f, 3.2f, -6.2f), 2.0f);
        }

        public MatterDomainQualificationView.EditMetrics CarveHero()
        {
            RequireU4D();
            PreserveNewOwnerRoots();
            SceneManager.SetActiveScene(scene);
            // Same deterministic local sample neighborhood and radius as the committed U4D proof.
            MatterDomain domain = u4d.GetDomain(WildkinG2IDemoCatalog.HeroId);
            MatterSampleAddress sample = FindSolidNear(domain, new MatterInt3(0, 0, -10));
            var result = u4d.EditLocal(domain.Id, domain.LocalSampleToMeters(sample), .42f);
            ProtectTransientObjects(); FocusHero();
            return result;
        }

        private static MatterSampleAddress FindSolidNear(MatterDomain domain, MatterInt3 preferred)
        {
            for (int distance = 0; distance <= 32; distance++)
            for (int z = -distance; z <= distance; z++)
            for (int y = -distance; y <= distance; y++)
            for (int x = -distance; x <= distance; x++)
            {
                if (Math.Max(Math.Abs(x), Math.Max(Math.Abs(y), Math.Abs(z))) != distance) continue;
                var sample = new MatterSampleAddress(preferred + new MatterInt3(x, y, z));
                if (domain.SampleBounds.Contains(sample) && domain.ReadSample(sample).IsSolid) return sample;
            }
            throw new InvalidOperationException("No solid sample near the U4D carve witness.");
        }

        public void MoveHero()
        {
            RequireU4D();
            PreserveNewOwnerRoots();
            MatterDomain domain = u4d.GetDomain(WildkinG2IDemoCatalog.HeroId);
            MatterFloat3 p = domain.Pose.PositionMeters;
            ulong hash = domain.ComputeContentHash();
            long meshRevision = domain.MeshRevision;
            u4d.MoveDomain(domain.Id, new MatterFloat3(p.X + 4f, p.Y, p.Z + .35f), 45f);
            if (domain.ComputeContentHash() != hash || domain.MeshRevision != meshRevision)
                throw new InvalidOperationException("Transform changed matter or mesh revision.");
            ProtectTransientObjects(); FocusHero();
        }

        public MatterDomainQualificationView.PersistenceMetrics SaveReloadHero()
        {
            RequireU4D();
            PreserveNewOwnerRoots();
            SceneManager.SetActiveScene(scene);
            var result = u4d.SaveReloadDomain(WildkinG2IDemoCatalog.HeroId,
                WildkinG2IDemoCatalog.TemporaryFile("hero.save.json"));
            if (!result.contentHashMatches || !result.transformMatches || !result.remeshedGeometryMatches ||
                !result.runtimeDomainRemovedBeforeReload || result.sourceMeshAvailableDuringReload)
                throw new InvalidOperationException("Source-free reload did not preserve matter/pose/mesh.");
            ProtectTransientObjects(); FocusHero();
            return result;
        }

        public void ShowFormation(int seed)
        {
            if (!HasU4E) throw new InvalidOperationException("Open U4E first.");
            PreserveNewOwnerRoots();
            SceneManager.SetActiveScene(scene);
            u4e.Generate(seed, Vector3.zero, 0f);
            u4e.SetOverlayConfiguration(bounds, graph);
            // Use the committed primary hero (22 degrees) / weakest (35 degrees) framing.
            float yaw = seed == WildkinG2IDemoCatalog.WeakSeed ? 35f : 22f;
            Vector3 center = new Vector3(0f, 2f, 0f);
            Vector3 arm = Quaternion.Euler(25f, yaw, 0f) * new Vector3(0f, 1f, -7.7f);
            Camera.orthographic = false; Camera.fieldOfView = 38f;
            Camera.nearClipPlane = .1f; Camera.farClipPlane = 100f;
            Camera.transform.SetPositionAndRotation(center + arm, Quaternion.LookRotation(-arm, Vector3.up));
            ProtectTransientObjects(); SyncSceneView(center, arm.magnitude);
        }

        public void ToggleBounds()
        {
            bounds = !bounds;
            PreserveNewOwnerRoots();
            SceneManager.SetActiveScene(scene);
            if (HasU4D) u4d.SetDebugOverlays(bounds, false);
            else if (HasU4E) u4e.SetOverlayConfiguration(bounds, graph);
            else throw new InvalidOperationException("Open a tech scene first.");
            ProtectTransientObjects();
        }

        public void ToggleGraph()
        {
            if (!HasU4E) throw new InvalidOperationException("Open U4E first.");
            PreserveNewOwnerRoots();
            graph = !graph;
            u4e.SetOverlayConfiguration(bounds, graph);
            ProtectTransientObjects();
        }

        private void Frame(Vector3 center, Vector3 position, float size)
        {
            Camera.orthographic = true; Camera.orthographicSize = size;
            Camera.transform.SetPositionAndRotation(position, Quaternion.LookRotation(center - position, Vector3.up));
            SyncSceneView(center, size * 1.8f);
        }

        private void SyncSceneView(Vector3 center, float size)
        {
            var view = SceneView.lastActiveSceneView;
            if (view != null) { view.orthographic = Camera.orthographic; view.LookAtDirect(center, Camera.transform.rotation, size); view.Repaint(); }
            EditorApplication.QueuePlayerLoopUpdate();
        }

        private void ProtectTransientObjects()
        {
            foreach (GameObject root in scene.GetRootGameObjects())
            {
                if (originalRoots.Contains(root)) continue;
                ownedRoots.Add(root);
                foreach (Transform child in root.GetComponentsInChildren<Transform>(true))
                    child.gameObject.hideFlags |= HideFlags.DontSave;
            }
        }

        private void PreserveNewOwnerRoots()
        {
            // If Chris adds something between demo actions, it belongs to him, not cleanup.
            foreach (GameObject root in scene.GetRootGameObjects())
                if (!ownedRoots.Contains(root) && !originalRoots.Contains(root))
                { originalRoots.Add(root); ownerAddedContent = true; }
        }

        private void RequireU4D()
        { if (!HasU4D) throw new InvalidOperationException("Open U4D first."); }

        public void RenderPreview(RenderTexture target)
        {
            // HDRP allows only one shadow-casting directional light. Other owner/test scenes
            // can remain loaded additively. Keep their lights paused until demo cleanup so
            // ordinary Scene/Game repaints also avoid a competing shadow atlas request.
            IsolateSceneLighting();
            float aspect = Camera.aspect;
            try
            {
                Camera.aspect = 16f / 9f;
                var request = new UnityEngine.Rendering.RenderPipeline.StandardRequest { destination = target };
                if (!UnityEngine.Rendering.RenderPipeline.SupportsRenderRequest(Camera, request))
                    throw new InvalidOperationException("HDRP preview render request unavailable.");
                UnityEngine.Rendering.RenderPipeline.SubmitRenderRequest(Camera, request);
            }
            finally
            {
                Camera.aspect = aspect;
            }
        }

        private void IsolateSceneLighting()
        {
            foreach (Light light in UnityEngine.Object.FindObjectsByType<Light>(FindObjectsSortMode.None))
                if (light.enabled && light.gameObject.scene != scene)
                { disabledExternalLights.Add(light); light.enabled = false; }
        }

        public void Dispose()
        {
            if (scene.IsValid() && scene.isLoaded)
            {
                foreach (GameObject root in ownedRoots)
                    if (root != null) UnityEngine.Object.DestroyImmediate(root);
                // Retain a scene if owner-authored content was added after the original opening.
                if (ownsScene && !scene.isDirty && !ownerAddedContent) EditorSceneManager.CloseScene(scene, true);
            }
            originalRoots.Clear(); ownedRoots.Clear(); ownsScene = false; ownerAddedContent = false;
            foreach (Light light in disabledExternalLights) if (light != null) light.enabled = true;
            disabledExternalLights.Clear();
            u4d = null; u4e = null; Camera = null; bounds = false; graph = false;
            scene = default;
            if (previousScene.IsValid() && previousScene.isLoaded) SceneManager.SetActiveScene(previousScene);
        }
    }
}
#endif
