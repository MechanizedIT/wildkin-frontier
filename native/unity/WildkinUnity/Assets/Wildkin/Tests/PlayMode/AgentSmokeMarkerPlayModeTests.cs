using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using Wildkin.Core;

namespace Wildkin.Tests.PlayMode
{
    public sealed class AgentSmokeMarkerPlayModeTests
    {
        [UnityTest]
        public IEnumerator Marker_ChangesRotationDuringPlay()
        {
            var markerObject = new GameObject("PlayMode Smoke Marker");
            AgentSmokeMarker marker = markerObject.AddComponent<AgentSmokeMarker>();
            marker.RotationSpeedDegreesPerSecond = 120f;
            Quaternion initialRotation = markerObject.transform.rotation;

            yield return new WaitForSecondsRealtime(0.1f);

            Assert.That(Quaternion.Angle(initialRotation, markerObject.transform.rotation), Is.GreaterThan(1f));
            Assert.That(marker.ElapsedSimulationSeconds, Is.GreaterThan(0f));

            Object.Destroy(markerObject);
            yield return null;
        }
    }
}
