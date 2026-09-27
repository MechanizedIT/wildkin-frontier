using System;
using Unity.Pipeline.Commands;
using UnityEngine;
using Wildkin.Matter;

namespace Wildkin.AgentTools.Editor
{
    public static class MatterAgentCommands
    {
        [Serializable]
        private sealed class AddressData
        {
            public int x;
            public int y;
            public int z;

            public AddressData(MatterInt3 value)
            {
                x = value.X;
                y = value.Y;
                z = value.Z;
            }
        }

        [Serializable]
        private sealed class BoundsData
        {
            public AddressData minInclusive;
            public AddressData maxExclusive;
        }

        [Serializable]
        private sealed class BenchmarkData
        {
            public int samplesPerPass;
            public int repetitions;
            public double directSourceMilliseconds;
            public double resolvedReadMilliseconds;
            public ulong directChecksum;
            public ulong resolvedChecksum;
            public bool resultsMatch;
        }

        [Serializable]
        private sealed class InspectionData
        {
            public BoundsData bounds;
            public int sourceSeed;
            public int sampleCount;
            public int solidCount;
            public int rockCount;
            public int dirtCount;
            public int editCount;
            public long revision;
            public int bytesPerBrick;
            public BenchmarkData sampleBenchmark;
        }

        [CliCommand(
            "inspect_matter_region",
            "Count resolved samples in one half-open global region using the shared qualification MatterWorld.",
            MainThreadRequired = true,
            Tags = new[] { "matter", "observability" })]
        public static string InspectMatterRegion(
            [CliArg("min_x", "Inclusive global sample X.")] int minX,
            [CliArg("min_y", "Inclusive global sample Y.")] int minY,
            [CliArg("min_z", "Inclusive global sample Z.")] int minZ,
            [CliArg("max_x", "Exclusive global sample X.")] int maxX,
            [CliArg("max_y", "Exclusive global sample Y.")] int maxY,
            [CliArg("max_z", "Exclusive global sample Z.")] int maxZ,
            [CliArg("seed", "Procedural source seed.")]
            int seed = MatterWorldFactory.DefaultSourceSeed)
        {
            var bounds = new MatterBounds(
                new MatterInt3(minX, minY, minZ),
                new MatterInt3(maxX, maxY, maxZ));
            MatterWorld world = MatterWorldFactory.CreateQualificationWorld(seed);
            MatterRegionSnapshot snapshot = MatterRegionSnapshot.Capture(world, bounds);

            int solidCount = 0;
            int rockCount = 0;
            int dirtCount = 0;
            for (int index = 0; index < snapshot.SampleCount; index++)
            {
                float density = snapshot.Densities[index];
                MatterMaterialId material = (MatterMaterialId)snapshot.Materials[index];
                MatterMaterialProfile profile = MatterMaterialRegistry.Get(material);
                if (density <= 0f || !profile.IsSolid) continue;
                solidCount++;
                if (material == MatterMaterialId.Rock) rockCount++;
                else if (material == MatterMaterialId.Dirt) dirtCount++;
            }

            var benchmarkBounds = new MatterBounds(
                new MatterInt3(-8, -8, -8),
                new MatterInt3(8, 8, 8));
            MatterSamplingBenchmarkResult benchmark =
                MatterSamplingBenchmark.Run(world, benchmarkBounds);

            var result = new InspectionData
            {
                bounds = new BoundsData
                {
                    minInclusive = new AddressData(bounds.MinInclusive),
                    maxExclusive = new AddressData(bounds.MaxExclusive)
                },
                sourceSeed = world.SourceSeed,
                sampleCount = snapshot.SampleCount,
                solidCount = solidCount,
                rockCount = rockCount,
                dirtCount = dirtCount,
                editCount = world.EditCount,
                revision = world.Revision,
                bytesPerBrick = world.BytesPerBrick,
                sampleBenchmark = new BenchmarkData
                {
                    samplesPerPass = benchmark.SampleCount,
                    repetitions = benchmark.Repetitions,
                    directSourceMilliseconds = benchmark.DirectSourceMilliseconds,
                    resolvedReadMilliseconds = benchmark.ResolvedReadMilliseconds,
                    directChecksum = benchmark.DirectChecksum,
                    resolvedChecksum = benchmark.ResolvedChecksum,
                    resultsMatch = benchmark.ResultsMatch
                }
            };
            return JsonUtility.ToJson(result, true);
        }
    }
}
