using NUnit.Framework;
using Wildkin.Matter;

namespace Wildkin.Tests.EditMode
{
    public sealed class MatterCoordinatesTests
    {
        [TestCase(0, 0, 0)]
        [TestCase(1, 0, 1)]
        [TestCase(15, 0, 15)]
        [TestCase(16, 1, 0)]
        [TestCase(17, 1, 1)]
        [TestCase(-1, -1, 15)]
        [TestCase(-15, -1, 1)]
        [TestCase(-16, -1, 0)]
        [TestCase(-17, -2, 15)]
        [TestCase(-32, -2, 0)]
        public void SampleMapping_UsesFloorDivisionAndHalfOpenOwnership(
            int sampleX, int expectedBrickX, int expectedLocalX)
        {
            MatterBrickLayout.Resolve(
                new MatterSampleAddress(sampleX, 0, 0),
                out MatterBrickAddress brick,
                out MatterLocalAddress local);

            Assert.That(brick.X, Is.EqualTo(expectedBrickX));
            Assert.That(local.X, Is.EqualTo(expectedLocalX));
            Assert.That(local.Y, Is.Zero);
            Assert.That(local.Z, Is.Zero);
        }

        [TestCase(-1, -1, 15)]
        [TestCase(0, 0, 0)]
        [TestCase(15, 0, 15)]
        [TestCase(16, 1, 0)]
        [TestCase(31, 1, 15)]
        [TestCase(32, 2, 0)]
        public void Mapping_RoundTripsPositiveAndNegativeBrickBoundaries(
            int coordinate, int expectedBrick, int expectedLocal)
        {
            var address = new MatterSampleAddress(coordinate, -17, 32);
            MatterBrickLayout.Resolve(address, out MatterBrickAddress brick, out MatterLocalAddress local);

            Assert.That(brick.X, Is.EqualTo(expectedBrick));
            Assert.That(local.X, Is.EqualTo(expectedLocal));
            Assert.That(MatterBrickLayout.ToGlobal(brick, local), Is.EqualTo(address));
        }

        [Test]
        public void BrickBoundary_SampleHasOneOwnerAndNeighborCellCornerIsNotDuplicated()
        {
            MatterBrickLayout.Resolve(new MatterSampleAddress(15, 0, 0), out var leftBrick, out var leftLocal);
            MatterBrickLayout.Resolve(new MatterSampleAddress(16, 0, 0), out var rightBrick, out var rightLocal);

            Assert.That(leftBrick, Is.Not.EqualTo(rightBrick));
            Assert.That(leftLocal.X, Is.EqualTo(15));
            Assert.That(rightLocal.X, Is.Zero);
            Assert.That(MatterBrickLayout.ToGlobal(leftBrick, leftLocal).X, Is.EqualTo(15));
            Assert.That(MatterBrickLayout.ToGlobal(rightBrick, rightLocal).X, Is.EqualTo(16));
        }

        [Test]
        public void QualificationBrick_IsSixteenCellIntervalsWithContiguousUniqueSamples()
        {
            Assert.That(MatterBrickLayout.CellSize, Is.EqualTo(16));
            Assert.That(MatterBrickLayout.SamplesPerBrick, Is.EqualTo(4096));
            Assert.That(MatterBrickLayout.RawBytesPerBrick, Is.EqualTo(20480));
        }
    }
}
