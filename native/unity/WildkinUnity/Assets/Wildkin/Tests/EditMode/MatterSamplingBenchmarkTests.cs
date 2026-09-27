using NUnit.Framework;
using Wildkin.Matter;

namespace Wildkin.Tests.EditMode
{
    public sealed class MatterSamplingBenchmarkTests
    {
        [Test]
        public void FixedRegionBenchmark_ReportsMatchingDirectAndResolvedSamples()
        {
            MatterWorld world = MatterWorldFactory.CreateQualificationWorld();
            var bounds = new MatterBounds(
                new MatterInt3(-8, -8, -8),
                new MatterInt3(8, 8, 8));

            MatterSamplingBenchmarkResult result =
                MatterSamplingBenchmark.Run(world, bounds, repetitions: 4);

            Assert.That(result.SampleCount, Is.EqualTo(4096));
            Assert.That(result.Repetitions, Is.EqualTo(4));
            Assert.That(result.ResultsMatch, Is.True);
            Assert.That(result.DirectSourceElapsedTicks, Is.GreaterThanOrEqualTo(0));
            Assert.That(result.ResolvedReadElapsedTicks, Is.GreaterThanOrEqualTo(0));
        }
    }
}
