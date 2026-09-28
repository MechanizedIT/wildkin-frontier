using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEditor.Build.Reporting;
using UnityEngine;
using UnityEngine.SceneManagement;
using Unity.Pipeline.Commands;
using Wildkin.Matter;
using Wildkin.Matter.Unity;

namespace Wildkin.AgentTools.Editor
{
    public static class StoneFidelityAgentCommands
    {
        [Serializable] private sealed class ErrorSummary { public double median, p95, max; }
        [Serializable] private sealed class Row
        {
            public string label, encoding, sourceHash, reconstructedHash;
            public float spacingMeters;
            public int sourceVertices, sourceTriangles, samples, occupied, reconstructedVertices, reconstructedTriangles, regions, skippedDegenerateTriangles;
            public int[] volumeDimensions, sampleOrigin;
            public long rawFieldBytes;
            public double sourceGenerationMilliseconds, samplingMilliseconds, surfaceNetsMilliseconds, publicationMilliseconds;
            public ErrorSummary reconstructedToSourceMeters, sourceToFieldMeters;
            public bool closedConnectedManifold;
            public string topologyIssue;
            public string allocationBytes = "unavailable; raw field payload only is measured";
        }

        [CliCommand("capture_stone_fidelity", "Sample an accepted U4C2 source into a local field and capture its existing Surface Nets reconstruction.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4c2", "fidelity" })]
        public static string CaptureRow(
            [CliArg("label", "A, B, or C accepted fixed source.")] string label = "B",
            [CliArg("spacing", "0.5, 0.25, 0.125, or 0.0625 metres.")] float spacing = .125f,
            [CliArg("clipped", "Historical positive-interior / fixed-exterior-air scalar control.")] bool clipped = false)
        {
            if (label != "A" && label != "B" && label != "C") throw new ArgumentException("Label must be A, B, or C.");
            int index = label[0] - 'A';
            var watch = Stopwatch.StartNew();
            SculptedStoneMesh source = SculptedStoneGenerator.Generate((SourceRockArchetype)index, 4101 + index);
            watch.Stop(); double generation = watch.Elapsed.TotalMilliseconds;
            var volume = new MatterLocalVolume(source, spacing, clipped);
            SculptedStoneMesh reconstructed = volume.Reconstruct(out double meshing, out int regions);
            var sampler = new SourceMeshSignedDistance(source);
            var toSource = new List<double>(); var toField = new List<double>();
            for (int i = 0; i < reconstructed.VertexCount; i++) toSource.Add(Math.Abs(sampler.Sample(reconstructed.GetVertex(i))));
            for (int i = 0; i < source.VertexCount; i++) toField.Add(Math.Abs(volume.Trilinear(source.GetVertex(i))));
            // Deterministic face-interior and edge samples complement the retained source vertices.
            for (int i = 0; i < source.TriangleCount; i++)
            {
                MatterFloat3 a = source.GetVertex(source.GetIndex(i * 3)), b = source.GetVertex(source.GetIndex(i * 3 + 1)),
                    c = source.GetVertex(source.GetIndex(i * 3 + 2));
                toField.Add(Math.Abs(volume.Trilinear(new MatterFloat3((a.X + b.X + c.X) / 3,
                    (a.Y + b.Y + c.Y) / 3, (a.Z + b.Z + c.Z) / 3))));
                toField.Add(Math.Abs(volume.Trilinear(new MatterFloat3((a.X + b.X) * .5f, (a.Y + b.Y) * .5f, (a.Z + b.Z) * .5f))));
            }
            string stem = "matter-" + label + "-" + spacing.ToString("0.####", CultureInfo.InvariantCulture) + (clipped ? "-clipped" : "-sdf");
            SculptedStoneGalleryView preview = SculptedStoneAgentCommands.PrepareScene();
            watch.Restart(); preview.Show(reconstructed, false); watch.Stop(); double publication = watch.Elapsed.TotalMilliseconds;
            Camera camera = FindCamera(preview.gameObject.scene);
            foreach (string angle in new[] { "beauty", "angle2" })
            {
                SculptedStoneAgentCommands.Frame(camera, source, angle == "angle2" ? 58 : 0);
                SourceRockAgentCommands.CaptureInScene(preview.gameObject.scene, camera,
                    Path.Combine(SculptedStoneAgentCommands.EvidenceFolder, stem + "-" + angle + ".png"), 1920, 1080);
            }
            if (label == "B" && spacing <= .125f)
            {
                SculptedStoneAgentCommands.Frame(camera, source, 0); camera.orthographicSize = 1.25f;
                SourceRockAgentCommands.CaptureInScene(preview.gameObject.scene, camera,
                    Path.Combine(SculptedStoneAgentCommands.EvidenceFolder, stem + "-closeup.png"), 1920, 1080);
            }
            var row = new Row
            {
                label = label, encoding = clipped ? "positive-distance-inside / fixed-air-outside" : "true signed distance, positive solid",
                sourceHash = source.GeometryHash.ToString("X16"), reconstructedHash = reconstructed.GeometryHash.ToString("X16"),
                spacingMeters = spacing, sourceVertices = source.VertexCount, sourceTriangles = source.TriangleCount,
                samples = volume.SampleCount, occupied = volume.OccupiedCount, rawFieldBytes = volume.RawBytes,
                volumeDimensions = new[] { volume.Bounds.Size.X, volume.Bounds.Size.Y, volume.Bounds.Size.Z },
                sampleOrigin = new[] { volume.Bounds.MinInclusive.X, volume.Bounds.MinInclusive.Y, volume.Bounds.MinInclusive.Z },
                sourceGenerationMilliseconds = generation, samplingMilliseconds = volume.SamplingMilliseconds,
                surfaceNetsMilliseconds = meshing, publicationMilliseconds = publication, regions = regions,
                skippedDegenerateTriangles = volume.SkippedDegenerateTriangles,
                reconstructedVertices = reconstructed.VertexCount, reconstructedTriangles = reconstructed.TriangleCount,
                reconstructedToSourceMeters = Summarize(toSource), sourceToFieldMeters = Summarize(toField),
                closedConnectedManifold = reconstructed.Validate(out string issue), topologyIssue = issue
            };
            string json = JsonUtility.ToJson(row, true);
            File.WriteAllText(Path.Combine(SculptedStoneAgentCommands.EvidenceFolder, stem + "-metrics.json"), json);
            return json;
        }

        [CliCommand("capture_stone_fidelity_strips", "Assemble the five matched native captures in source/0.50/0.25/0.125/0.0625 order.",
            MainThreadRequired = true, Tags = new[] { "u4c2", "capture" })]
        public static string CaptureStrips()
        {
            foreach (string label in new[] { "A", "B", "C" })
            {
                string[] stems = { "stone-" + label, "matter-" + label + "-0.5-sdf", "matter-" + label + "-0.25-sdf",
                    "matter-" + label + "-0.125-sdf", "matter-" + label + "-0.0625-sdf" };
                foreach (string angle in new[] { "beauty", "angle2" })
                {
                    var strip = new Texture2D(5400, 1080, TextureFormat.RGB24, false);
                    for (int i = 0; i < stems.Length; i++)
                    {
                        var input = new Texture2D(2, 2); input.LoadImage(File.ReadAllBytes(Path.Combine(SculptedStoneAgentCommands.EvidenceFolder, stems[i] + "-" + angle + ".png")));
                        strip.SetPixels(i * 1080, 0, 1080, 1080, input.GetPixels(420, 0, 1080, 1080));
                        UnityEngine.Object.DestroyImmediate(input);
                    }
                    strip.Apply(); File.WriteAllBytes(Path.Combine(SculptedStoneAgentCommands.EvidenceFolder, "resolution-" + label + "-" + angle + ".png"), strip.EncodeToPNG());
                    UnityEngine.Object.DestroyImmediate(strip);
                }
            }
            return "Wrote matched native source / 0.50 / 0.25 / 0.125 / 0.0625 resolution strips.";
        }

        [CliCommand("u4c2_build_windows_development", "Build the bounded U4C2 source scene as a Windows Development Player.",
            MainThreadRequired = true, Tags = new[] { "u4c2", "build" })]
        public static string BuildWindows()
        {
            SculptedStoneGalleryView preview = SculptedStoneAgentCommands.PrepareScene();
            preview.ConfigureMatter(SourceRockArchetype.ChunkyBoulder, 4102, .125f);
            SculptedStoneAgentCommands.Frame(FindCamera(preview.gameObject.scene),
                SculptedStoneGenerator.Generate(SourceRockArchetype.ChunkyBoulder, 4102), 0);
            preview.ClearPreview();
            EditorSceneManager.MarkSceneDirty(preview.gameObject.scene);
            EditorSceneManager.SaveScene(preview.gameObject.scene, SculptedStoneAgentCommands.ScenePath);
            string output = Path.GetFullPath(Path.Combine(Application.dataPath, "../Builds/U4C2/Wildkin-U4C2.exe"));
            Directory.CreateDirectory(Path.GetDirectoryName(output));
            BuildReport report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { SculptedStoneAgentCommands.ScenePath }, locationPathName = output,
                target = BuildTarget.StandaloneWindows64, options = BuildOptions.Development | BuildOptions.AllowDebugging
            });
            string json = JsonUtility.ToJson(new BuildEvidence
            {
                unityVersion = Application.unityVersion, result = report.summary.result.ToString(),
                errors = report.summary.totalErrors, warnings = report.summary.totalWarnings, bytes = report.summary.totalSize,
                seconds = report.summary.totalTime.TotalSeconds, output = output,
                scene = SculptedStoneAgentCommands.ScenePath
            }, true);
            File.WriteAllText(Path.Combine(SculptedStoneAgentCommands.EvidenceFolder, "build-provenance.json"), json);
            if (report.summary.result != BuildResult.Succeeded) throw new InvalidOperationException(json);
            return json;
        }

        [Serializable] private sealed class BuildEvidence
        { public string unityVersion, result, output, scene; public int errors, warnings; public ulong bytes; public double seconds; }
        private static ErrorSummary Summarize(List<double> values)
        { values.Sort(); return new ErrorSummary { median = values[values.Count / 2], p95 = values[(int)((values.Count - 1) * .95)], max = values[values.Count - 1] }; }
        private static Camera FindCamera(Scene scene)
        {
            foreach (GameObject root in scene.GetRootGameObjects()) if (root.TryGetComponent(out Camera camera)) return camera;
            throw new InvalidOperationException("Missing comparison camera.");
        }
    }
}
