using System;
using System.Diagnostics;
using System.IO;
using NUnit.Framework;
using Unity.Burst;
using Unity.Collections;
using Unity.Jobs;
using UnityEngine;
using Wildkin.Matter;

namespace Wildkin.Tests.EditMode
{
    public sealed class MatterBurstReadinessTests
    {
        private const int FixtureSeed = MatterFixtureSource.DefaultSeed;
        private const int RegionAxis = 4;
        private const int RegionCount = RegionAxis * RegionAxis * RegionAxis;
        private const int SampleWindowSide = MatterMeshingRegion.ScalarWindowSide;
        private const int CellSide = MatterMeshingRegion.HaloCellCount;
        private const int SamplesPerRegion = SampleWindowSide * SampleWindowSide * SampleWindowSide;
        private const int CellsPerRegion = CellSide * CellSide * CellSide;
        private const int WarmupRuns = 2;
        private const int MeasuredRuns = 7;

        [Test]
        public void BurstActiveCellProbe_MatchesScalarAndWritesReadinessReport()
        {
            Assert.IsTrue(BurstCompiler.IsEnabled,
                "The readiness probe must run with Burst enabled, not silently fall back to managed execution.");
            var world = new MatterWorld(FixtureSeed, 0.25f,
                new MatterFixtureSource(MatterFixtureId.LayeredRock));
            var densityValues = new float[RegionCount * SamplesPerRegion];
            int regionIndex = 0;
            for (int z = -2; z < 2; z++)
            for (int y = -2; y < 2; y++)
            for (int x = -2; x < 2; x++)
            {
                MatterMeshingRegion region = MatterMeshingRegion.Capture(
                    world, new MatterBrickAddress(x, y, z));
                region.Samples.Densities.CopyTo(
                    densityValues.AsSpan(regionIndex * SamplesPerRegion, SamplesPerRegion));
                regionIndex++;
            }

            int cellCount = RegionCount * CellsPerRegion;
            var scalarOutput = new byte[cellCount];
            var scalarScratch = new byte[cellCount];
            ScalarActiveCellScan(densityValues, scalarScratch);
            int scalarActiveCount = CountActive(scalarScratch);

            using (var nativeDensities = new NativeArray<float>(densityValues, Allocator.TempJob))
            using (var nativeOutput = new NativeArray<byte>(cellCount, Allocator.TempJob,
                       NativeArrayOptions.UninitializedMemory))
            {
                var job = new ActiveCellProbeJob
                {
                    Densities = nativeDensities,
                    ActiveCells = nativeOutput
                };

                for (int run = 0; run < WarmupRuns; run++)
                {
                    ScalarActiveCellScan(densityValues, scalarScratch);
                    job.Schedule(cellCount, 128).Complete();
                }

                var scalarTimes = new double[MeasuredRuns];
                var jobTimes = new double[MeasuredRuns];
                for (int run = 0; run < MeasuredRuns; run++)
                {
                    long scalarStart = Stopwatch.GetTimestamp();
                    ScalarActiveCellScan(densityValues, scalarOutput);
                    long scalarEnd = Stopwatch.GetTimestamp();

                    long jobStart = Stopwatch.GetTimestamp();
                    job.Schedule(cellCount, 128).Complete();
                    long jobEnd = Stopwatch.GetTimestamp();
                    nativeOutput.CopyTo(scalarScratch);

                    scalarTimes[run] = Milliseconds(scalarEnd - scalarStart);
                    jobTimes[run] = Milliseconds(jobEnd - jobStart);
                    CollectionAssert.AreEqual(scalarOutput, scalarScratch,
                        "Burst job active-cell classification must match the scalar implementation.");
                }

                Assert.AreEqual(scalarActiveCount, CountActive(scalarOutput));
                double scalarMedian = Median(scalarTimes);
                double jobMedian = Median(jobTimes);
                double speedup = jobMedian <= 0d ? 0d : scalarMedian / jobMedian;
                string report = BuildReport(scalarActiveCount, cellCount, densityValues.Length,
                    scalarTimes, jobTimes, scalarMedian, jobMedian, speedup);
                string outputPath = Path.GetFullPath(Path.Combine(Application.dataPath,
                    "..", "..", "..", "..", "native", "evidence", "unity", "u3-mesher-resolution",
                    "burst-readiness-editor.json"));
                File.WriteAllText(outputPath, report);
                TestContext.WriteLine(report);
            }
        }

        private static void ScalarActiveCellScan(float[] densities, byte[] output)
        {
            for (int index = 0; index < output.Length; index++)
            {
                int localIndex = index % CellsPerRegion;
                int x = localIndex % CellSide;
                int y = localIndex / CellSide % CellSide;
                int z = localIndex / (CellSide * CellSide);
                int sampleBase = (index / CellsPerRegion) * SamplesPerRegion;
                output[index] = IsActive(densities, sampleBase, x, y, z) ? (byte)1 : (byte)0;
            }
        }

        private static bool IsActive(float[] densities, int sampleBase, int x, int y, int z)
        {
            int plane = SampleWindowSide * SampleWindowSide;
            int p = sampleBase + z * plane + y * SampleWindowSide + x;
            float d0 = densities[p];
            float d1 = densities[p + 1];
            float d2 = densities[p + SampleWindowSide + 1];
            float d3 = densities[p + SampleWindowSide];
            float d4 = densities[p + plane];
            float d5 = densities[p + plane + 1];
            float d6 = densities[p + plane + SampleWindowSide + 1];
            float d7 = densities[p + plane + SampleWindowSide];
            bool hasSolid = d0 > 0f || d1 > 0f || d2 > 0f || d3 > 0f ||
                            d4 > 0f || d5 > 0f || d6 > 0f || d7 > 0f;
            bool hasAir = d0 <= 0f || d1 <= 0f || d2 <= 0f || d3 <= 0f ||
                          d4 <= 0f || d5 <= 0f || d6 <= 0f || d7 <= 0f;
            return hasSolid && hasAir;
        }

        private static int CountActive(byte[] values)
        {
            int count = 0;
            for (int i = 0; i < values.Length; i++) count += values[i];
            return count;
        }

        private static double Milliseconds(long ticks) => ticks * 1000d / Stopwatch.Frequency;

        private static double Median(double[] values)
        {
            double[] ordered = (double[])values.Clone();
            Array.Sort(ordered);
            return ordered[ordered.Length / 2];
        }

        private static double NearestRankP95(double[] values)
        {
            double[] ordered = (double[])values.Clone();
            Array.Sort(ordered);
            return ordered[(int)Math.Ceiling(0.95d * ordered.Length) - 1];
        }

        private static string BuildReport(int activeCells, int cellCount, int sampleCount,
            double[] scalarTimes, double[] jobTimes, double scalarMedian, double jobMedian, double speedup)
        {
            return "{\n" +
                   "  \"unityVersion\": \"" + Application.unityVersion + "\",\n" +
                   "  \"fixture\": \"LayeredRock\",\n" +
                   "  \"fixtureSourceVersion\": " + MatterFixtureSource.FixtureSourceVersion + ",\n" +
                   "  \"seed\": " + FixtureSeed + ",\n" +
                   "  \"spacingMeters\": 0.25,\n" +
                   "  \"matchedDomainMeters\": 16.0,\n" +
                   "  \"regions\": " + RegionCount + ",\n" +
                   "  \"cellClassificationCountPerRun\": " + cellCount + ",\n" +
                   "  \"scalarSamplesCopiedBeforeTiming\": " + sampleCount + ",\n" +
                   "  \"activeCells\": " + activeCells + ",\n" +
                   "  \"burstEnabled\": " + (BurstCompiler.IsEnabled ? "true" : "false") + ",\n" +
                   "  \"warmupRuns\": " + WarmupRuns + ",\n" +
                   "  \"measuredRuns\": " + MeasuredRuns + ",\n" +
                   "  \"batchSize\": 128,\n" +
                   "  \"scalarMedianMilliseconds\": " + scalarMedian.ToString("R", System.Globalization.CultureInfo.InvariantCulture) + ",\n" +
                   "  \"scalarP95Milliseconds\": " + NearestRankP95(scalarTimes).ToString("R", System.Globalization.CultureInfo.InvariantCulture) + ",\n" +
                   "  \"jobScheduleAndCompleteMedianMilliseconds\": " + jobMedian.ToString("R", System.Globalization.CultureInfo.InvariantCulture) + ",\n" +
                   "  \"jobScheduleAndCompleteP95Milliseconds\": " + NearestRankP95(jobTimes).ToString("R", System.Globalization.CultureInfo.InvariantCulture) + ",\n" +
                   "  \"speedupScalarOverJob\": " + speedup.ToString("R", System.Globalization.CultureInfo.InvariantCulture) + ",\n" +
                   "  \"measurementScope\": \"Active-cell sign classification only. Input region snapshots and NativeArray copy/allocation are pre-timed; scheduling plus completion is timed. This is a readiness probe, not a replacement production mesher or end-to-end speedup claim.\"\n" +
                   "}\n";
        }

        [BurstCompile(CompileSynchronously = true, FloatMode = FloatMode.Strict)]
        private struct ActiveCellProbeJob : IJobParallelFor
        {
            [ReadOnly] public NativeArray<float> Densities;
            [WriteOnly] public NativeArray<byte> ActiveCells;

            public void Execute(int index)
            {
                int localIndex = index % CellsPerRegion;
                int x = localIndex % CellSide;
                int y = localIndex / CellSide % CellSide;
                int z = localIndex / (CellSide * CellSide);
                int sampleBase = (index / CellsPerRegion) * SamplesPerRegion;
                int plane = SampleWindowSide * SampleWindowSide;
                int p = sampleBase + z * plane + y * SampleWindowSide + x;
                float d0 = Densities[p];
                float d1 = Densities[p + 1];
                float d2 = Densities[p + SampleWindowSide + 1];
                float d3 = Densities[p + SampleWindowSide];
                float d4 = Densities[p + plane];
                float d5 = Densities[p + plane + 1];
                float d6 = Densities[p + plane + SampleWindowSide + 1];
                float d7 = Densities[p + plane + SampleWindowSide];
                bool hasSolid = d0 > 0f || d1 > 0f || d2 > 0f || d3 > 0f ||
                                d4 > 0f || d5 > 0f || d6 > 0f || d7 > 0f;
                bool hasAir = d0 <= 0f || d1 <= 0f || d2 <= 0f || d3 <= 0f ||
                              d4 <= 0f || d5 <= 0f || d6 <= 0f || d7 <= 0f;
                ActiveCells[index] = hasSolid && hasAir ? (byte)1 : (byte)0;
            }
        }
    }
}
