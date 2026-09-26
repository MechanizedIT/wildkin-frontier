using UnityEngine;

namespace Wildkin.Core
{
    /// <summary>
    /// Small deterministic runtime marker used to verify the Unity agent workflow.
    /// </summary>
    public sealed class AgentSmokeMarker : MonoBehaviour
    {
        [SerializeField, Min(0f)] private float rotationSpeedDegreesPerSecond = 35f;
        [SerializeField, Min(0f)] private float bobAmplitude = 0.2f;
        [SerializeField, Min(0.1f)] private float bobFrequencyHz = 0.5f;

        private Vector3 baseLocalPosition;
        private float elapsedSimulationSeconds;

        public float RotationSpeedDegreesPerSecond
        {
            get => rotationSpeedDegreesPerSecond;
            set => rotationSpeedDegreesPerSecond = Mathf.Max(0f, value);
        }

        public float ElapsedSimulationSeconds => elapsedSimulationSeconds;

        private void Awake()
        {
            baseLocalPosition = transform.localPosition;
            elapsedSimulationSeconds = 0f;
        }

        private void Update()
        {
            float deltaTime = Time.deltaTime;
            if (deltaTime <= 0f)
            {
                return;
            }

            elapsedSimulationSeconds += deltaTime;

            Vector3 euler = transform.eulerAngles;
            euler.y = AngleAfter(elapsedSimulationSeconds, rotationSpeedDegreesPerSecond);
            transform.rotation = Quaternion.Euler(euler);

            Vector3 position = baseLocalPosition;
            position.y += Mathf.Sin(elapsedSimulationSeconds * bobFrequencyHz * Mathf.PI * 2f) * bobAmplitude;
            transform.localPosition = position;
        }

        public static float AngleAfter(float elapsedSeconds, float speedDegreesPerSecond)
        {
            return Mathf.Repeat(elapsedSeconds * speedDegreesPerSecond, 360f);
        }
    }
}
