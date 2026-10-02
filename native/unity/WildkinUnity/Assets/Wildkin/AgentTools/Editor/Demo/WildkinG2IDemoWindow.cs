#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
using Unity.Pipeline.Commands;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

namespace Wildkin.AgentTools.Editor.Demo
{
    public sealed class WildkinG2IDemoWindow : EditorWindow
    {
        [SerializeField] private int chapter;
        private WildkinG2IDemoSession session;
        private readonly Dictionary<string, Texture2D> images = new Dictionary<string, Texture2D>();
        private RenderTexture preview;
        private Vector2 scroll;
        private string status = "Presentation only • current R&D stop: U4FC1_RENDER_SOURCE_HOLD";
        private bool error;
        private GUIStyle titleStyle, textStyle, buttonStyle, badgeStyle;

        [MenuItem("Wildkin/G2i Demo Console")]
        public static void Open() => GetWindow<WildkinG2IDemoWindow>("G2i Demo Console").Show();

        private void OnEnable()
        {
            minSize = new Vector2(680f, 620f);
            session = new WildkinG2IDemoSession();
            AssemblyReloadEvents.beforeAssemblyReload += Cleanup;
            EditorApplication.playModeStateChanged += OnPlayMode;
        }

        private void OnDisable()
        {
            AssemblyReloadEvents.beforeAssemblyReload -= Cleanup;
            EditorApplication.playModeStateChanged -= OnPlayMode;
            Cleanup();
        }

        private void OnPlayMode(PlayModeStateChange change)
        {
            if (change == PlayModeStateChange.ExitingEditMode) Cleanup();
        }

        private void Cleanup()
        {
            session?.Dispose();
            foreach (Texture2D texture in images.Values) if (texture != null) DestroyImmediate(texture);
            images.Clear();
            if (preview != null) { preview.Release(); DestroyImmediate(preview); preview = null; }
        }

        private void OnInspectorUpdate() => Repaint();

        private void OnGUI()
        {
            EnsureStyles();
            chapter = Mathf.Clamp(chapter, 0, 4);
            if (Event.current.type == EventType.KeyDown &&
                (Event.current.keyCode == KeyCode.LeftArrow || Event.current.keyCode == KeyCode.RightArrow))
            {
                int next = Mathf.Clamp(chapter + (Event.current.keyCode == KeyCode.RightArrow ? 1 : -1), 0, 4);
                Event.current.Use(); ChangeChapter(next);
            }
            GUILayout.Space(10);
            using (new EditorGUILayout.HorizontalScope())
            {
                using (new EditorGUI.DisabledScope(chapter == 0))
                    if (GUILayout.Button("Previous", buttonStyle, GUILayout.Height(40))) ChangeChapter(chapter - 1);
                GUILayout.Label($"Chapter {chapter + 1} / 5", badgeStyle, GUILayout.Width(150), GUILayout.Height(40));
                using (new EditorGUI.DisabledScope(chapter == 4))
                    if (GUILayout.Button("Next", buttonStyle, GUILayout.Height(40))) ChangeChapter(chapter + 1);
            }
            scroll = EditorGUILayout.BeginScrollView(scroll);
            var page = WildkinG2IDemoCatalog.Chapters[chapter];
            GUILayout.Label(page.Title, titleStyle);
            GUILayout.Label(page.Purpose, textStyle);
            GUILayout.Space(8);
            using (new EditorGUILayout.VerticalScope(EditorStyles.helpBox))
            {
                GUILayout.Label("WHAT THIS PROVES", badgeStyle);
                GUILayout.Label(page.Proves, textStyle);
            }
            GUILayout.Space(8);
            using (new EditorGUI.DisabledScope(EditorApplication.isPlayingOrWillChangePlaymode))
            {
                switch (chapter)
                {
                    case 0:
                        Button("Open Browser Gameplay", () => Application.OpenURL(WildkinG2IDemoCatalog.BrowserUrl));
                        Button("Open Wildkin README", () => OpenDocument("README.md"));
                        GUILayout.Label("Run the browser helper before recording. Scout: WASD, Space/C, Shift; drag to look. Use Continue or start a local game.", textStyle);
                        break;
                    case 1: DrawMatter(); break;
                    case 2:
                        GUILayout.Label("Chris defines the goal, constraints, acceptance criteria and quality bar. The coding agent performs substantial implementation. Chris then tests/reviews the result and determines whether it is actually accepted.", textStyle);
                        Button("Open Spec", () => OpenDocument(WildkinG2IDemoCatalog.Spec));
                        Button("Open Implementation", OpenCode);
                        Button("Open Evidence", () => OpenDocument(WildkinG2IDemoCatalog.U4DProof));
                        Button("Open Current Slice", () => OpenDocument(WildkinG2IDemoCatalog.CurrentSlice));
                        GUILayout.Label("U4D spec: primary question (§1), ownership (§3), isolation (§22), validation (§25–28, §38), independent review (§39), PASS/HOLD (§40). This is the historical contract; its future recommendations are not demo authorization.", textStyle);
                        break;
                    case 3: DrawEvaluation(); break;
                    case 4: DrawAssets(); break;
                }
            }
            EditorGUILayout.HelpBox(status, error ? MessageType.Error : MessageType.Info);
            EditorGUILayout.EndScrollView();
        }

        private void EnsureStyles()
        {
            if (titleStyle != null) return;
            titleStyle = new GUIStyle(EditorStyles.boldLabel) { fontSize = 23, wordWrap = true, margin = new RectOffset(8, 8, 12, 8) };
            textStyle = new GUIStyle(EditorStyles.label) { fontSize = 15, wordWrap = true, margin = new RectOffset(8, 8, 5, 7) };
            buttonStyle = new GUIStyle(GUI.skin.button) { fontSize = 16, wordWrap = true };
            badgeStyle = new GUIStyle(EditorStyles.boldLabel) { fontSize = 15, wordWrap = true, alignment = TextAnchor.MiddleCenter };
        }

        public void ChangeChapter(int index)
        {
            chapter = Mathf.Clamp(index, 0, 4); scroll = Vector2.zero;
            error = false;
            status = "Presentation only • current R&D stop: U4FC1_RENDER_SOURCE_HOLD";
            if (chapter == 1 && !session.HasU4D) Run("U4D loaded; inspect overview then focus the 0.125 m rock.", session.OpenU4D);
            if (chapter == 3 && !session.HasU4E) Run("U4E hero 7004: technical acceptance, visual HOLD.", session.OpenU4E);
            Repaint();
        }

        private void DrawMatter()
        {
            using (new EditorGUILayout.HorizontalScope())
            {
                Button("Open U4D", session.OpenU4D);
                Button("Reset", session.Reset);
                Button("Overview", session.Overview);
            }
            using (new EditorGUILayout.HorizontalScope())
            {
                Button("Focus 0.125 m Domain", session.FocusHero);
                Button("Toggle Domain Bounds", session.ToggleBounds);
            }
            using (new EditorGUILayout.HorizontalScope())
            {
                Button("Carve Hero", () =>
                {
                    var result = session.CarveHero();
                    status = $"Carved {result.changedSamples} samples; rebuilt {result.rebuiltRegions} regions, reused {result.reusedRegions}.";
                });
                Button("Move Hero", () => { session.MoveHero(); status = "Translated + rotated 45°; matter hash and mesh revision unchanged."; });
                Button("Save + Reload Hero", () => { session.SaveReloadHero(); status = "Original removed; source-free reload preserved matter, pose and reconstructed mesh. Saved under Library only."; });
            }
            Button("Open Relevant C#", OpenCode);
            GUILayout.Label("0.50 m world + independent 0.25 / 0.125 m local matter. A transform moves the local state; it does not resample it. Qualification scope only: no physics, collapse or terrain stitching.", textStyle);
            DrawPreview();
        }

        private void DrawEvaluation()
        {
            using (new EditorGUILayout.HorizontalScope())
            {
            using (new EditorGUILayout.VerticalScope(EditorStyles.helpBox, GUILayout.Width((position.width - 40f) * .35f)))
            {
                GUILayout.Label("U4D — LOCAL_DOMAIN_0_125_PASS", badgeStyle);
                GUILayout.Label("Independent 0.50 / 0.25 / 0.125 m matter; localized edit/remesh; movable local matter; source-free save/reload. Automated tests and standalone-player evidence. Accepted within documented scope, with topology and production-scale limits retained.", textStyle);
                Button("Open U4D PASS Evidence", () => OpenDocument(WildkinG2IDemoCatalog.U4DReview));
            }
            using (new EditorGUILayout.VerticalScope(EditorStyles.helpBox))
            {
                GUILayout.Label("U4E — TECHNICAL GATES PASSED / VISUAL GATE HOLD", badgeStyle);
                GUILayout.Label("Automated and structural checks passed, but several formations still looked separated/floating rather than naturally interlocked. The result was rejected for the perceptual requirement.", textStyle);
                using (new EditorGUILayout.HorizontalScope())
                {
                    Button("Open U4E", session.OpenU4E);
                    Button("Hero Formation", () => session.ShowFormation(WildkinG2IDemoCatalog.HeroSeed));
                    Button("Known Weak Formation", () => session.ShowFormation(WildkinG2IDemoCatalog.WeakSeed));
                }
                using (new EditorGUILayout.HorizontalScope())
                {
                    Button("Toggle Contact Graph", session.ToggleGraph);
                    Button("Toggle Domain Bounds", session.ToggleBounds);
                    Button("Open U4E Review", () => OpenDocument(WildkinG2IDemoCatalog.U4EReview));
                }
                GUILayout.Label("Committed examples: hero 7004 / weakest accepted 7019. Technical acceptance does not mean visual acceptance. Current replay is a demo, not a replacement for the committed captures.", textStyle);
            }
            }
            DrawPreview();
        }

        private void DrawAssets()
        {
            string[] paths = { WildkinG2IDemoCatalog.TargetImage, WildkinG2IDemoCatalog.RawImage, WildkinG2IDemoCatalog.CleanupImage };
            string[] labels = { "Owner-approved visual target", "U4F-G1 — RAW SOURCE CANDIDATE", "U4F-C1 — RENDER SOURCE HOLD" };
            using (new EditorGUILayout.HorizontalScope())
            for (int i = 0; i < paths.Length; i++)
            using (new EditorGUILayout.VerticalScope(GUILayout.Width((position.width - 46f) / 3f)))
            {
                GUILayout.Label(labels[i], badgeStyle, GUILayout.Height(52));
                Rect rect = GUILayoutUtility.GetRect(100, Mathf.Clamp(position.height * .37f, 180f, 330f), GUILayout.ExpandWidth(true));
                try { GUI.DrawTexture(rect, LoadImage(paths[i]), ScaleMode.ScaleToFit); }
                catch (Exception exception) { EditorGUI.HelpBox(rect, exception.Message, MessageType.Error); }
            }
            GUILayout.Label("Topology could be closed, but severe striping/moiré, underside artifacts and mismatch with the target's broad plane hierarchy made the result visually unacceptable.", textStyle);
            using (new EditorGUILayout.HorizontalScope())
            {
                Button("Open G1 Review", () => OpenDocument(WildkinG2IDemoCatalog.G1Review));
                Button("Open C1 Review", () => OpenDocument(WildkinG2IDemoCatalog.C1Review));
            }
            GUILayout.Label("Existing committed images only. U4FC1_RENDER_SOURCE_HOLD remains active; no pristine asset or stamp was admitted.", textStyle);
        }

        public Texture2D LoadImage(string relativePath)
        {
            if (images.TryGetValue(relativePath, out Texture2D cached)) return cached;
            string path = WildkinG2IDemoCatalog.RepositoryFile(relativePath);
            var texture = new Texture2D(2, 2) { hideFlags = HideFlags.HideAndDontSave };
            try
            {
                if (!texture.LoadImage(File.ReadAllBytes(path), true)) throw new IOException("Cannot decode " + relativePath);
                images.Add(relativePath, texture); return texture;
            }
            catch { DestroyImmediate(texture); throw; }
        }

        private void DrawPreview()
        {
            if (session.Camera == null) return;
            float height = Mathf.Clamp(position.height - (chapter == 3 ? 510f : 460f), 180f, 410f);
            Rect rect = GUILayoutUtility.GetRect(100f, height, GUILayout.ExpandWidth(true));
            if (Event.current.type == EventType.Repaint)
            {
                try
                {
                    if (preview == null) { preview = new RenderTexture(1280, 720, 24) { hideFlags = HideFlags.HideAndDontSave }; preview.Create(); }
                    session.RenderPreview(preview);
                    GUI.DrawTexture(rect, preview, ScaleMode.ScaleToFit, false);
                }
                catch (Exception exception) { EditorGUI.HelpBox(rect, exception.Message, MessageType.Error); }
            }
        }

        private void Button(string label, Action action)
        { if (GUILayout.Button(label, buttonStyle, GUILayout.Height(38))) Run(label, action); }

        private void Run(string message, Action action)
        {
            error = false; status = message;
            try { action(); }
            catch (Exception exception) { error = true; status = exception.Message; Debug.LogException(exception); }
            Repaint();
        }

        public static void OpenDocument(string relativePath)
        {
            string path = WildkinG2IDemoCatalog.RepositoryFile(relativePath);
            if (!File.Exists(path)) throw new FileNotFoundException("Missing demo document", path);
            UnityEditorInternal.InternalEditorUtility.OpenFileAtLineExternal(path, 1);
        }

        private static void OpenCode()
        {
            var script = AssetDatabase.LoadAssetAtPath<MonoScript>(WildkinG2IDemoCatalog.ViewCode);
            Selection.activeObject = script; EditorGUIUtility.PingObject(script); AssetDatabase.OpenAsset(script, 322);
            // Select core ownership as a second findable source; avoid opening a pile of tabs.
            EditorGUIUtility.PingObject(AssetDatabase.LoadAssetAtPath<MonoScript>(WildkinG2IDemoCatalog.CoreCode));
        }

        // Narrow command for stepping the same window/actions during validation. No R&D commands.
        [CliCommand("g2i_demo", "Step the presentation-only G2i console; no qualification evidence is written.", MainThreadRequired = true)]
        public static string DemoAction([CliArg("action", "chapter1..chapter5, reset, overview, focus, carve, move, reload, hero, weak, bounds, graph, close")] string action)
        {
            var window = GetWindow<WildkinG2IDemoWindow>("G2i Demo Console");
            window.position = new Rect(10, 30, 1200, 780);
            if (action.StartsWith("chapter", StringComparison.Ordinal) && int.TryParse(action.Substring(7), out int index)) window.ChangeChapter(index - 1);
            else
            {
                switch (action)
                {
                    case "reset": window.session.Reset(); break;
                    case "overview": window.session.Overview(); break;
                    case "focus": window.session.FocusHero(); break;
                    case "carve": window.session.CarveHero(); break;
                    case "move": window.session.MoveHero(); break;
                    case "reload": window.session.SaveReloadHero(); break;
                    case "hero": window.session.ShowFormation(WildkinG2IDemoCatalog.HeroSeed); break;
                    case "weak": window.session.ShowFormation(WildkinG2IDemoCatalog.WeakSeed); break;
                    case "bounds": window.session.ToggleBounds(); break;
                    case "graph": window.session.ToggleGraph(); break;
                    case "close": window.Close(); break;
                    default: throw new ArgumentException("Unknown demo action: " + action);
                }
                window.Repaint();
            }
            return "{\"action\":\"" + action + "\",\"chapter\":" + (window.chapter + 1) + ",\"error\":" + (window.error ? "true" : "false") + "}";
        }
    }
}
#endif
