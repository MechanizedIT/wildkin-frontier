using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using Unity.Pipeline.Commands;
using Wildkin.Matter;
using Wildkin.Matter.Unity;

namespace Wildkin.AgentTools.Editor
{
    public static class SculptedStoneAgentCommands
    {
        public const string ScenePath = "Assets/Wildkin/Scenes/Tech/U4C2SculptedSource.unity";
        public static string EvidenceFolder
            => Path.GetFullPath(Path.Combine(Application.dataPath, "../../../../native/evidence/unity/u4c2-sculpted-source"));

        [Serializable]
        private sealed class SourceReport
        {
            public string method = SculptedStoneRecipe.Version;
            public SculptedStoneRecipe recipe;
            public int vertices, triangles, connectedComponents = 1;
            public bool closedManifold;
            public string issue, geometryHash;
            public double volumeMetersCubed;
            public float[] boundsMin, boundsMax;
        }

        [CliCommand("capture_sculpted_stone_set", "Capture U4C2's three single-shell sculpted stones before matter conversion.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4c2", "capture" })]
        public static string CaptureSet()
        {
            Directory.CreateDirectory(EvidenceFolder);
            SculptedStoneGalleryView preview = PrepareScene();
            Scene scene = preview.gameObject.scene;
            Camera camera = null;
            foreach (GameObject root in scene.GetRootGameObjects())
                if (root.TryGetComponent(out Camera found)) camera = found;
            for (int index = 0; index < 3; index++)
            {
                var archetype = (SourceRockArchetype)index;
                int seed = 4101 + index;
                SculptedStoneRecipe recipe = SculptedStoneGenerator.CreateRecipe(archetype, seed);
                SculptedStoneMesh source = SculptedStoneGenerator.Build(recipe);
                string label = ((char)('A' + index)).ToString();
                var report = new SourceReport
                {
                    recipe = recipe, vertices = source.VertexCount, triangles = source.TriangleCount,
                    closedManifold = source.Validate(out string issue), issue = issue,
                    geometryHash = source.GeometryHash.ToString("X16"), volumeMetersCubed = source.SignedVolume,
                    boundsMin = Values(source.BoundsMin), boundsMax = Values(source.BoundsMax)
                };
                File.WriteAllText(Path.Combine(EvidenceFolder, "stone-" + label + "-metrics.json"), JsonUtility.ToJson(report, true));
                foreach (string view in new[] { "beauty", "angle2", "wireframe" })
                {
                    preview.Configure(archetype, seed, view == "wireframe");
                    Frame(camera, source, view == "angle2" ? 58f : 0f);
                    SourceRockAgentCommands.CaptureInScene(scene, camera,
                        Path.Combine(EvidenceFolder, "stone-" + label + "-" + view + ".png"), 1920, 1080);
                }
            }
            preview.Configure(SourceRockArchetype.CapstoneSlab, 4101, false);
            Frame(camera, preview.Source, 0);
            preview.ClearPreview(); EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene, ScenePath);
            preview.Configure(SourceRockArchetype.CapstoneSlab, 4101, false);
            return "Captured three sculpted single-shell stones in " + EvidenceFolder;
        }

        public static SculptedStoneGalleryView PrepareScene()
        {
            Scene scene = SceneManager.GetSceneByPath(ScenePath);
            if (!scene.IsValid() || !scene.isLoaded)
            {
                if (File.Exists(ScenePath)) scene = EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Additive);
                else
                {
                    scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Additive);
                    scene.name = "U4C2SculptedSource";
                    SourceRockAgentCommands.CreateEnvironment(scene);
                    var root = new GameObject("U4C2 Sculpted Stone Preview");
                    SceneManager.MoveGameObjectToScene(root, scene);
                    root.AddComponent<SculptedStoneGalleryView>();
                }
            }
            foreach (GameObject root in scene.GetRootGameObjects())
                if (root.TryGetComponent(out SculptedStoneGalleryView view))
                {
                    // Serialized references make both source and matter presentation shaders build dependencies.
                    view.SetShaderReferences(Shader.Find("Wildkin/MatterRockDirt"), Shader.Find("HDRP/Unlit"));
                    return view;
                }
            throw new InvalidOperationException("Missing U4C2 source preview.");
        }

        public static void Frame(Camera camera, SculptedStoneMesh source, float yaw)
        {
            Vector3 target = (Point(source.BoundsMin) + Point(source.BoundsMax)) * .5f;
            camera.orthographic = true; camera.orthographicSize = 2.8f;
            camera.transform.position = target + Quaternion.Euler(0, yaw, 0) * new Vector3(6.7f, 6.2f, -10.5f);
            camera.transform.LookAt(target);
        }
        private static Vector3 Point(MatterFloat3 p) => new Vector3(p.X, p.Y, p.Z);
        private static float[] Values(MatterFloat3 p) => new[] { p.X, p.Y, p.Z };
    }
}
