using System;
using Unity.Pipeline.Commands;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.Rendering;
using UnityEngine.Rendering.HighDefinition;
using Wildkin.Matter;
using Wildkin.Matter.Unity;

namespace Wildkin.AgentTools.Editor
{
    public static class MatterDebugSceneCommands
    {
        private const string ScenePath = "Assets/Wildkin/Scenes/Tech/MatterKernelDebug.unity";
        private const string DebugFolder = "Assets/Wildkin/Matter/Debug";
        private const string MeshPath = DebugFolder + "/MatterKernelSamples.asset";
        private const string RockMaterialPath = DebugFolder + "/MatterDebugRock.mat";
        private const string DirtMaterialPath = DebugFolder + "/MatterDebugDirt.mat";
        private const string VolumeProfilePath = DebugFolder + "/MatterDebugVolume.asset";

        [Serializable]
        private sealed class SceneResult
        {
            public string scenePath;
            public int sourceSeed;
            public float sampleSpacingMeters;
            public int brickCellSize;
            public int sampleCount;
            public int solidCount;
            public int rockCount;
            public int dirtCount;
            public int markerMeshVertices;
        }

        [CliCommand(
            "create_matter_kernel_debug_scene",
            "Create the bounded U2 Tech scene from the qualification MatterWorld and save its combined sample marker mesh.",
            MainThreadRequired = true,
            Tags = new[] { "matter", "scenes" })]
        public static string CreateMatterKernelDebugScene()
        {
            EnsureFolder("Assets/Wildkin/Matter", "Debug");
            DeleteIfPresent(ScenePath);
            DeleteIfPresent(MeshPath);
            DeleteIfPresent(RockMaterialPath);
            DeleteIfPresent(DirtMaterialPath);
            DeleteIfPresent(VolumeProfilePath);

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var viewObject = new GameObject("Matter Kernel Sample Region");
            MatterRegionDebugView debugView = viewObject.AddComponent<MatterRegionDebugView>();
            var bounds = new MatterBounds(
                new MatterInt3(-8, -4, -8),
                new MatterInt3(9, 5, 9));
            debugView.Configure(
                MatterWorldFactory.DefaultSourceSeed,
                MatterWorldFactory.DefaultSampleSpacingMeters,
                bounds);

            MatterRegionSnapshot snapshot = debugView.CaptureSnapshot();
            MatterDebugCounts counts = CountSamples(snapshot);
            Mesh markerMesh = debugView.BuildSampleMarkerMesh();
            AssetDatabase.CreateAsset(markerMesh, MeshPath);

            Material rockMaterial = CreateMaterial(
                RockMaterialPath, MatterMaterialRegistry.Get(MatterMaterialId.Rock));
            Material dirtMaterial = CreateMaterial(
                DirtMaterialPath, MatterMaterialRegistry.Get(MatterMaterialId.Dirt));
            MeshFilter meshFilter = viewObject.AddComponent<MeshFilter>();
            MeshRenderer meshRenderer = viewObject.AddComponent<MeshRenderer>();
            meshFilter.sharedMesh = markerMesh;
            meshRenderer.sharedMaterials = new[] { rockMaterial, dirtMaterial };
            meshRenderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            meshRenderer.receiveShadows = false;

            CreateCameraAndLight();
            CreateExposureVolume();
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.12f, 0.14f, 0.17f);
            scene.name = "MatterKernelDebug";
            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene, ScenePath);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            var result = new SceneResult
            {
                scenePath = ScenePath,
                sourceSeed = MatterWorldFactory.DefaultSourceSeed,
                sampleSpacingMeters = MatterWorldFactory.DefaultSampleSpacingMeters,
                brickCellSize = MatterBrickLayout.CellSize,
                sampleCount = snapshot.SampleCount,
                solidCount = counts.Solid,
                rockCount = counts.Rock,
                dirtCount = counts.Dirt,
                markerMeshVertices = markerMesh.vertexCount
            };
            return JsonUtility.ToJson(result, true);
        }

        private static void EnsureFolder(string parent, string child)
        {
            string path = parent + "/" + child;
            if (!AssetDatabase.IsValidFolder(path))
                AssetDatabase.CreateFolder(parent, child);
        }

        private static void DeleteIfPresent(string path)
        {
            if (AssetDatabase.LoadMainAssetAtPath(path) != null)
                AssetDatabase.DeleteAsset(path);
        }

        private static Material CreateMaterial(string path, MatterMaterialProfile profile)
        {
            Shader shader = Shader.Find("HDRP/Unlit");
            if (shader == null)
                throw new InvalidOperationException("Could not find the HDRP Unlit shader for the debug scene.");

            var material = new Material(shader) { name = profile.DisplayName + " Debug" };
            var color = new Color(profile.DebugColor.R, profile.DebugColor.G, profile.DebugColor.B, 1f);
            if (material.HasProperty("_UnlitColor")) material.SetColor("_UnlitColor", color);
            if (material.HasProperty("_Color")) material.SetColor("_Color", color);
            material.enableInstancing = true;
            AssetDatabase.CreateAsset(material, path);
            return material;
        }

        private static void CreateCameraAndLight()
        {
            var cameraObject = new GameObject("Matter Debug Camera");
            cameraObject.tag = "MainCamera";
            cameraObject.transform.position = new Vector3(10f, 7f, -12f);
            cameraObject.transform.LookAt(new Vector3(0f, -0.8f, 0f));
            Camera camera = cameraObject.AddComponent<Camera>();
            camera.orthographic = true;
            camera.orthographicSize = 6.2f;
            camera.nearClipPlane = 0.1f;
            camera.farClipPlane = 100f;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.075f, 0.095f, 0.12f, 1f);
            HDAdditionalCameraData additionalCameraData = cameraObject.AddComponent<HDAdditionalCameraData>();
            additionalCameraData.clearColorMode = HDAdditionalCameraData.ClearColorMode.Color;
            additionalCameraData.backgroundColorHDR = camera.backgroundColor;
            additionalCameraData.volumeLayerMask = 1;

            var lightObject = new GameObject("Matter Debug Key Light");
            lightObject.transform.rotation = Quaternion.Euler(38f, -32f, 0f);
            Light light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.4f;
            light.color = new Color(1f, 0.92f, 0.82f);
        }

        private static void CreateExposureVolume()
        {
            VolumeProfile profile = ScriptableObject.CreateInstance<VolumeProfile>();
            AssetDatabase.CreateAsset(profile, VolumeProfilePath);
            Exposure exposure = profile.Add<Exposure>(true);
            exposure.mode.overrideState = true;
            exposure.mode.value = ExposureMode.Fixed;
            exposure.fixedExposure.overrideState = true;
            exposure.fixedExposure.value = 0f;

            var volumeObject = new GameObject("Matter Debug Exposure");
            Volume volume = volumeObject.AddComponent<Volume>();
            volume.isGlobal = true;
            volume.priority = 100f;
            volume.sharedProfile = profile;
        }

        private static MatterDebugCounts CountSamples(MatterRegionSnapshot snapshot)
        {
            var counts = new MatterDebugCounts();
            for (int index = 0; index < snapshot.SampleCount; index++)
            {
                if (snapshot.Densities[index] <= 0f) continue;
                MatterMaterialId material = (MatterMaterialId)snapshot.Materials[index];
                if (!MatterMaterialRegistry.Get(material).IsSolid) continue;
                counts.Solid++;
                if (material == MatterMaterialId.Rock) counts.Rock++;
                else if (material == MatterMaterialId.Dirt) counts.Dirt++;
            }
            return counts;
        }

        private struct MatterDebugCounts
        {
            public int Solid;
            public int Rock;
            public int Dirt;
        }
    }
}
