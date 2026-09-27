using System;
using System.Diagnostics;

namespace Wildkin.Matter
{
    public readonly struct MatterSamplingBenchmarkResult
    {
        public readonly int SampleCount;
        public readonly int Repetitions;
        public readonly long DirectSourceElapsedTicks;
        public readonly long ResolvedReadElapsedTicks;
        public readonly ulong DirectChecksum;
        public readonly ulong ResolvedChecksum;

        public MatterSamplingBenchmarkResult(
            int sampleCount, int repetitions, long directTicks, long resolvedTicks,
            ulong directChecksum, ulong resolvedChecksum)
        {
            SampleCount = sampleCount;
            Repetitions = repetitions;
            DirectSourceElapsedTicks = directTicks;
            ResolvedReadElapsedTicks = resolvedTicks;
            DirectChecksum = directChecksum;
            ResolvedChecksum = resolvedChecksum;
        }

        public double DirectSourceMilliseconds => DirectSourceElapsedTicks * 1000d / Stopwatch.Frequency;
        public double ResolvedReadMilliseconds => ResolvedReadElapsedTicks * 1000d / Stopwatch.Frequency;
        public bool ResultsMatch => DirectChecksum == ResolvedChecksum;
    }

    public static class MatterSamplingBenchmark
    {
        public static MatterSamplingBenchmarkResult Run(
            MatterWorld world, MatterBounds bounds, int repetitions = 32)
        {
            if (world == null) throw new ArgumentNullException(nameof(world));
            if (repetitions <= 0) throw new ArgumentOutOfRangeException(nameof(repetitions));
            if (world.EditCount != 0)
                throw new InvalidOperationException("The deterministic source/cache comparison requires an unedited world.");

            MatterInt3 size = bounds.Size;
            int sampleCount = checked(checked(size.X * size.Y) * size.Z);
            if (sampleCount > 16 * 1024 * 1024) throw new ArgumentOutOfRangeException(nameof(bounds));

            RunDirect(world, bounds, 1);
            RunResolved(world, bounds, 1);
            RunDirect(world, bounds, 1);
            RunResolved(world, bounds, 1);

            long directStart = Stopwatch.GetTimestamp();
            ulong directChecksum = RunDirect(world, bounds, repetitions);
            long directTicks = Stopwatch.GetTimestamp() - directStart;
            long resolvedStart = Stopwatch.GetTimestamp();
            ulong resolvedChecksum = RunResolved(world, bounds, repetitions);
            long resolvedTicks = Stopwatch.GetTimestamp() - resolvedStart;
            return new MatterSamplingBenchmarkResult(
                sampleCount, repetitions, directTicks, resolvedTicks, directChecksum, resolvedChecksum);
        }

        private static ulong RunDirect(MatterWorld world, MatterBounds bounds, int repetitions)
        {
            ulong checksum = 14695981039346656037UL;
            MatterInt3 size = bounds.Size;
            for (int repeat = 0; repeat < repetitions; repeat++)
            for (int z = 0; z < size.Z; z++)
            for (int y = 0; y < size.Y; y++)
            for (int x = 0; x < size.X; x++)
            {
                var address = new MatterSampleAddress(
                    bounds.MinInclusive.X + x, bounds.MinInclusive.Y + y, bounds.MinInclusive.Z + z);
                checksum = Mix(checksum, world.EvaluateSourceDirect(address));
            }
            return checksum;
        }

        private static ulong RunResolved(MatterWorld world, MatterBounds bounds, int repetitions)
        {
            ulong checksum = 14695981039346656037UL;
            MatterInt3 size = bounds.Size;
            for (int repeat = 0; repeat < repetitions; repeat++)
            for (int z = 0; z < size.Z; z++)
            for (int y = 0; y < size.Y; y++)
            for (int x = 0; x < size.X; x++)
            {
                var address = new MatterSampleAddress(
                    bounds.MinInclusive.X + x, bounds.MinInclusive.Y + y, bounds.MinInclusive.Z + z);
                checksum = Mix(checksum, world.ReadSample(address));
            }
            return checksum;
        }

        private static ulong Mix(ulong checksum, MatterSample sample)
        {
            unchecked
            {
                int densityMilliUnits = (int)Math.Round(
                    sample.Density * 1000d, MidpointRounding.AwayFromZero);
                checksum = (checksum ^ (uint)densityMilliUnits) * 1099511628211UL;
                return (checksum ^ (byte)sample.Material) * 1099511628211UL;
            }
        }
    }
}
