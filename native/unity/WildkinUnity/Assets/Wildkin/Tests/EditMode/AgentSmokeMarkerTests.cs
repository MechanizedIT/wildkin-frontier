using NUnit.Framework;
using Wildkin.Core;

namespace Wildkin.Tests.EditMode
{
    public sealed class AgentSmokeMarkerTests
    {
        [TestCase(2f, 45f, 90f)]
        [TestCase(10f, 36f, 0f)]
        [TestCase(5f, 36f, 180f)]
        public void AngleAfter_IsDeterministicAndWraps(float elapsedSeconds, float speed, float expected)
        {
            float first = AgentSmokeMarker.AngleAfter(elapsedSeconds, speed);
            float second = AgentSmokeMarker.AngleAfter(elapsedSeconds, speed);

            Assert.That(first, Is.EqualTo(expected).Within(0.0001f));
            Assert.That(second, Is.EqualTo(first).Within(0.0001f));
        }
    }
}
