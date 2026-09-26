using System;
using Unity.Pipeline.Commands;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;
using Wildkin.Core;

namespace Wildkin.AgentTools.Editor
{
    public static class AgentSmokeInspectCommand
    {
        [Serializable]
        private sealed class PositionData
        {
            public float x;
            public float y;
            public float z;
        }

        [Serializable]
        private sealed class InspectionData
        {
            public string sceneName;
            public string objectName;
            public PositionData worldPosition;
            public bool hasSmokeMarker;
            public float rotationSpeedDegreesPerSecond;
            public float elapsedSimulationSeconds;
            public string unityVersion;
            public string renderPipeline;
        }

        [CliCommand(
            "wildkin_agent_smoke_inspect",
            "Return a JSON snapshot of the active Wildkin agent smoke scene.",
            MainThreadRequired = true)]
        public static string Inspect()
        {
            Scene activeScene = SceneManager.GetActiveScene();
            GameObject markerObject = GameObject.Find("Wildkin Smoke Marker");
            AgentSmokeMarker marker = markerObject == null ? null : markerObject.GetComponent<AgentSmokeMarker>();
            Vector3 position = markerObject == null ? Vector3.zero : markerObject.transform.position;
            RenderPipelineAsset pipeline = GraphicsSettings.currentRenderPipeline;

            var data = new InspectionData
            {
                sceneName = activeScene.name,
                objectName = markerObject == null ? string.Empty : markerObject.name,
                worldPosition = new PositionData { x = position.x, y = position.y, z = position.z },
                hasSmokeMarker = marker != null,
                rotationSpeedDegreesPerSecond = marker == null ? 0f : marker.RotationSpeedDegreesPerSecond,
                elapsedSimulationSeconds = marker == null ? 0f : marker.ElapsedSimulationSeconds,
                unityVersion = Application.unityVersion,
                renderPipeline = pipeline == null ? "BuiltIn" : pipeline.GetType().FullName
            };

            return JsonUtility.ToJson(data, true);
        }
    }
}
