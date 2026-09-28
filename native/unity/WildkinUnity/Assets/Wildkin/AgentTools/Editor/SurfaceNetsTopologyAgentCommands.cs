using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using Unity.Pipeline.Commands;
using Wildkin.Matter;
using Wildkin.Matter.Unity;

namespace Wildkin.AgentTools.Editor
{
    public static class SurfaceNetsTopologyAgentCommands
    {
        private const string PlayerScenePath = "Assets/Wildkin/Scenes/Tech/U4C3TopologySafeSurfaceNets.unity";

        [Serializable] private sealed class ErrorSummary { public double median, p95, max; }
        [Serializable] private sealed class U4C2Receipt { public U4C2MatterGate matterGate; }
        [Serializable] private sealed class U4C2MatterGate { public U4C2Row[] matrix; }
        [Serializable] private sealed class U4C2Row
        {
            public string label, encoding, sourceHash, reconstructedHash, topologyIssue;
            public float spacingMeters;
            public int sourceVertices, sourceTriangles, samples, occupied, reconstructedVertices, reconstructedTriangles, regions, skippedDegenerateTriangles;
            public double sourceGenerationMilliseconds, samplingMilliseconds, surfaceNetsMilliseconds, publicationMilliseconds;
            public ErrorSummary reconstructedToSourceMeters, sourceToFieldMeters;
            public bool closedConnectedManifold;
        }
        [Serializable] private sealed class U4C3Row
        {
            public string label, encoding, sourceHash, reconstructedHash, topologyIssue;
            public float spacingMeters;
            public int sourceVertices, sourceTriangles, samples, occupied, reconstructedVertices, reconstructedTriangles, regions;
            public int skippedDegenerateTriangles, activeCells, ambiguousFaces, ambiguousCells, multiComponentCells;
            public int maximumComponentsPerCell, additionalSurfaceVertices, mappedCrossingEdges, missingCrossingEdgeMappings;
            public double sourceGenerationMilliseconds, samplingMilliseconds, surfaceNetsMilliseconds, kernelMilliseconds, publicationMilliseconds;
            public ErrorSummary reconstructedToSourceMeters, sourceToFieldMeters;
            public bool closedConnectedManifold, sourceHashUnchanged, sdfMetricsUnchanged;
        }
        [Serializable] private sealed class MatrixEntry
        { public U4C2Row before; public U4C3Row after; }
        [Serializable] private sealed class MatrixEvidence
        {
            public string phase = "Unity U4C3 — Topology-Safe Surface Nets";
            public string baselineEvidence = "../u4c2-sculpted-source/receipt.json";
            public MatrixEntry[] rows;
            public MatrixEntry clippedB125Control;
        }
        [Serializable] private sealed class CellEvidence
        {
            public int[] globalCell;
            public string signMask, crossingEdgeMask;
            public float[] cornerDensities;
            public int ambiguousFaces, componentCount;
            public string[] componentMasks;
            public float[][] vertexPositionsMeters;
        }
        [Serializable] private sealed class AmbiguityEvidence
        {
            public string phase = "Unity U4C3 — before/after topology diagnostic";
            public string label, sourceHash, reconstructedHash;
            public int seed, samples, occupied, regions, vertices, triangles;
            public float spacingMeters;
            public int skippedDegenerateTriangles, missingCrossingEdgeMappings, activeCells;
            public int ambiguousFaces, ambiguousCells, multiComponentCells, maximumComponentsPerCell, additionalSurfaceVertices;
            public bool sourceValid, meshValid;
            public string sourceIssue, meshIssue;
            public CellEvidence[] knownCells;
        }

        public static string EvidenceFolder
            => Path.GetFullPath(Path.Combine(Application.dataPath, "../../../../native/evidence/unity/u4c3-topology-safe-surface-nets"));

        [CliCommand("u4c3_capture_matrix", "Recompute the fixed U4C2 true-SDF matrix with U4C3 topology, fidelity, timing, and matched captures.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4c3", "topology", "evidence" })]
        public static string CaptureMatrix()
        {
            Directory.CreateDirectory(EvidenceFolder);
            Directory.CreateDirectory(Path.Combine(EvidenceFolder, "matrix"));
            Directory.CreateDirectory(Path.Combine(EvidenceFolder, "before-after"));
            Directory.CreateDirectory(Path.Combine(EvidenceFolder, "diagnostics"));
            string baselinePath = Path.Combine(SculptedStoneAgentCommands.EvidenceFolder, "receipt.json");
            U4C2Receipt receipt = JsonUtility.FromJson<U4C2Receipt>(File.ReadAllText(baselinePath));
            if (receipt == null || receipt.matterGate == null || receipt.matterGate.matrix == null)
                throw new InvalidDataException("The preserved U4C2 receipt does not contain its original matrix.");

            SculptedStoneGalleryView preview = SculptedStoneAgentCommands.PrepareScene();
            Scene scene = preview.gameObject.scene;
            Camera camera = FindCamera(scene);
            var entries = new List<MatrixEntry>(12);
            string[] labels = { "A", "B", "C" };
            float[] spacings = { .5f, .25f, .125f, .0625f };
            foreach (string label in labels)
            foreach (float spacing in spacings)
            {
                int index = label[0] - 'A';
                var archetype = (SourceRockArchetype)index;
                int seed = 4101 + index;
                var sourceWatch = Stopwatch.StartNew();
                SculptedStoneMesh source = SculptedStoneGenerator.Generate(archetype, seed);
                sourceWatch.Stop();
                var volume = new MatterLocalVolume(source, spacing);
                SculptedStoneMesh reconstructed = volume.Reconstruct(out double meshingMilliseconds, out int regions);
                var sampler = new SourceMeshSignedDistance(source);
                List<double> toSource = new List<double>(reconstructed.VertexCount);
                List<double> toField = new List<double>(source.VertexCount + source.TriangleCount * 2);
                for (int i = 0; i < reconstructed.VertexCount; i++)
                    toSource.Add(Math.Abs(sampler.Sample(reconstructed.GetVertex(i))));
                for (int i = 0; i < source.VertexCount; i++)
                    toField.Add(Math.Abs(volume.Trilinear(source.GetVertex(i))));
                for (int i = 0; i < source.TriangleCount; i++)
                {
                    MatterFloat3 a = source.GetVertex(source.GetIndex(i * 3));
                    MatterFloat3 b = source.GetVertex(source.GetIndex(i * 3 + 1));
                    MatterFloat3 c = source.GetVertex(source.GetIndex(i * 3 + 2));
                    toField.Add(Math.Abs(volume.Trilinear(new MatterFloat3((a.X + b.X + c.X) / 3,
                        (a.Y + b.Y + c.Y) / 3, (a.Z + b.Z + c.Z) / 3))));
                    toField.Add(Math.Abs(volume.Trilinear(new MatterFloat3((a.X + b.X) * .5f,
                        (a.Y + b.Y) * .5f, (a.Z + b.Z) * .5f))));
                }

                var publicationWatch = Stopwatch.StartNew();
                preview.Show(reconstructed, false);
                SculptedStoneAgentCommands.Frame(camera, source, 0f);
                publicationWatch.Stop();
                if ((label == "B" && spacing == .0625f) || (label == "C" && spacing == .125f) ||
                    (label == "A" && spacing == .25f))
                {
                    string filename = label + "-" + spacing.ToString("0.####", CultureInfo.InvariantCulture) + "-after.png";
                    SourceRockAgentCommands.CaptureInScene(scene, camera,
                        Path.Combine(EvidenceFolder, "before-after", filename), 1920, 1080);
                }

                U4C2Row before = FindBaseline(receipt.matterGate.matrix, label, spacing);
                bool valid = reconstructed.Validate(out string issue);
                var after = new U4C3Row
                {
                    label = label, encoding = "true signed distance, positive solid",
                    sourceHash = source.GeometryHash.ToString("X16"), reconstructedHash = reconstructed.GeometryHash.ToString("X16"),
                    spacingMeters = spacing, sourceVertices = source.VertexCount, sourceTriangles = source.TriangleCount,
                    samples = volume.SampleCount, occupied = volume.OccupiedCount, regions = regions,
                    reconstructedVertices = reconstructed.VertexCount, reconstructedTriangles = reconstructed.TriangleCount,
                    skippedDegenerateTriangles = volume.SkippedDegenerateTriangles,
                    activeCells = volume.LastActiveCellCount, ambiguousFaces = volume.LastAmbiguousFaceCount,
                    ambiguousCells = volume.LastAmbiguousCellCount, multiComponentCells = volume.LastMultiComponentCellCount,
                    maximumComponentsPerCell = volume.LastMaximumComponentsPerCell,
                    additionalSurfaceVertices = volume.LastAdditionalSurfaceVertexCount,
                    mappedCrossingEdges = volume.LastMappedCrossingEdgeCount,
                    missingCrossingEdgeMappings = volume.LastMissingCrossingEdgeMappings,
                    sourceGenerationMilliseconds = sourceWatch.Elapsed.TotalMilliseconds,
                    samplingMilliseconds = volume.SamplingMilliseconds, surfaceNetsMilliseconds = meshingMilliseconds,
                    kernelMilliseconds = volume.LastKernelMilliseconds, publicationMilliseconds = publicationWatch.Elapsed.TotalMilliseconds,
                    reconstructedToSourceMeters = Summarize(toSource), sourceToFieldMeters = Summarize(toField),
                    closedConnectedManifold = valid, topologyIssue = issue,
                    sourceHashUnchanged = before.sourceHash == source.GeometryHash.ToString("X16"),
                    sdfMetricsUnchanged = before.sourceHash == source.GeometryHash.ToString("X16") &&
                        before.samples == volume.SampleCount && before.occupied == volume.OccupiedCount &&
                        Same(before.sourceToFieldMeters, Summarize(toField))
                };
                entries.Add(new MatrixEntry { before = before, after = after });
            }

            var clippedSourceWatch = Stopwatch.StartNew();
            var clippedSource = SculptedStoneGenerator.Generate(SourceRockArchetype.ChunkyBoulder, 4102);
            clippedSourceWatch.Stop();
            var clipped = new MatterLocalVolume(clippedSource, .125f, true);
            SculptedStoneMesh clippedMesh = clipped.Reconstruct(out double clippedTiming, out int clippedRegions);
            clippedMesh.Validate(out string clippedIssue);
            U4C2Row clippedBefore = FindBaseline(receipt.matterGate.matrix, "B", .125f,
                "positive-distance-inside / fixed-air-outside");
            var clippedAfter = MakeAfter("B", .125f, clippedSource, clipped, clippedMesh, clippedRegions,
                clippedTiming, 0d, clippedBefore.encoding);
            clippedAfter.sourceGenerationMilliseconds = clippedSourceWatch.Elapsed.TotalMilliseconds;
            clippedAfter.sourceHashUnchanged = clippedBefore.sourceHash == clippedAfter.sourceHash;
            clippedAfter.sdfMetricsUnchanged = clippedAfter.sourceHashUnchanged &&
                clippedBefore.samples == clippedAfter.samples && clippedBefore.occupied == clippedAfter.occupied &&
                Same(clippedBefore.sourceToFieldMeters, clippedAfter.sourceToFieldMeters);
            var evidence = new MatrixEvidence { rows = entries.ToArray(), clippedB125Control = new MatrixEntry { before = clippedBefore, after = clippedAfter } };
            File.WriteAllText(Path.Combine(EvidenceFolder, "matrix", "u4c3-matrix.json"), JsonUtility.ToJson(evidence, true));
            WriteAmbiguity("B-0.0625", SourceRockArchetype.ChunkyBoulder, 4102, .0625f,
                new MatterBrickAddress(-1, 2, 0), new[] { new MatterInt3(-5, 32, 10), new MatterInt3(-5, 33, 10) });
            WriteAmbiguity("C-0.125", SourceRockArchetype.ButtressWedge, 4103, .125f,
                new MatterBrickAddress(0, 0, -1), new[] { new MatterInt3(1, 8, -7), new MatterInt3(1, 8, -6) });
            preview.ClearPreview();
            return JsonUtility.ToJson(evidence, true);
        }

        [CliCommand("u4c3_prepare_player_scene", "Create a separate U4C3 Windows player scene for B / 0.0625 without changing U4C2.",
            MainThreadRequired = true, Tags = new[] { "matter", "u4c3", "build" })]
        public static string PreparePlayerScene()
        {
            if (!File.Exists(PlayerScenePath) && !AssetDatabase.CopyAsset(SculptedStoneAgentCommands.ScenePath, PlayerScenePath))
                throw new IOException("Could not copy the accepted U4C2 camera/material scene into the U4C3 player scene.");
            AssetDatabase.Refresh();
            Scene scene = SceneManager.GetSceneByPath(PlayerScenePath);
            if (!scene.IsValid() || !scene.isLoaded) scene = EditorSceneManager.OpenScene(PlayerScenePath, OpenSceneMode.Additive);
            SculptedStoneGalleryView preview = FindPreview(scene);
            SculptedStoneMesh source = SculptedStoneGenerator.Generate(SourceRockArchetype.ChunkyBoulder, 4102);
            preview.ConfigureMatter(SourceRockArchetype.ChunkyBoulder, 4102, .0625f);
            preview.ClearPreview();
            SculptedStoneAgentCommands.Frame(FindCamera(scene), source, 0f);
            EditorSceneManager.MarkSceneDirty(scene);
            if (!EditorSceneManager.SaveScene(scene, PlayerScenePath)) throw new IOException("Could not save the separate U4C3 player scene.");
            return "Prepared " + PlayerScenePath + " for B / 4102 / 0.0625 m. U4C2 scene was not saved or modified.";
        }

        private static void WriteAmbiguity(string label, SourceRockArchetype archetype, int seed, float spacing,
            MatterBrickAddress brick, MatterInt3[] cells)
        {
            SculptedStoneMesh source = SculptedStoneGenerator.Generate(archetype, seed);
            var volume = new MatterLocalVolume(source, spacing);
            SculptedStoneMesh reconstructed = volume.Reconstruct(out _, out int regions);
            MatterMeshData part = new MatterSurfaceNetsMesher().Generate(MatterMeshingRegion.CaptureGrid(volume, brick));
            var cellEvidence = new CellEvidence[cells.Length];
            for (int i = 0; i < cells.Length; i++)
            {
                MatterInt3 cell = cells[i];
                var densities = new float[8]; int mask = 0;
                int[] edgeA = { 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3 };
                int[] edgeB = { 1, 2, 3, 0, 5, 6, 7, 4, 4, 5, 6, 7 };
                int[] cx = { 0, 1, 1, 0, 0, 1, 1, 0 };
                int[] cy = { 0, 0, 1, 1, 0, 0, 1, 1 };
                int[] cz = { 0, 0, 0, 0, 1, 1, 1, 1 };
                for (int corner = 0; corner < 8; corner++)
                    densities[corner] = volume.ReadSample(new MatterSampleAddress(cell + new MatterInt3(cx[corner], cy[corner], cz[corner]))).Density;
                for (int corner = 0; corner < 8; corner++) if (densities[corner] > 0f) mask |= 1 << corner;
                MatterSurfaceCellClassification classification = MatterSurfaceNetsTopology.Classify(densities);
                var patchMasks = new List<string>(); var positions = new List<float[]>();
                for (int vertex = 0; vertex < part.VertexSurfaceKeys.Length; vertex++)
                    if (part.VertexSurfaceKeys[vertex].GlobalCellAddress == cell)
                    {
                        patchMasks.Add("0x" + part.VertexSurfaceKeys[vertex].CrossingEdgeComponentMask.ToString("X3"));
                        MatterFloat3 p = part.Vertices[vertex].PositionMeters;
                        positions.Add(new[] { p.X, p.Y, p.Z });
                    }
                cellEvidence[i] = new CellEvidence
                {
                    globalCell = new[] { cell.X, cell.Y, cell.Z }, signMask = "0x" + mask.ToString("X2"),
                    crossingEdgeMask = "0x" + classification.CrossingEdgeMask.ToString("X3"),
                    cornerDensities = densities, ambiguousFaces = classification.AmbiguousFaceCount,
                    componentCount = classification.ComponentCount, componentMasks = patchMasks.ToArray(),
                    vertexPositionsMeters = positions.ToArray()
                };
            }
            var report = new AmbiguityEvidence
            {
                label = label, seed = seed, spacingMeters = spacing, sourceHash = source.GeometryHash.ToString("X16"),
                reconstructedHash = reconstructed.GeometryHash.ToString("X16"), samples = volume.SampleCount,
                occupied = volume.OccupiedCount, regions = regions, vertices = reconstructed.VertexCount,
                triangles = reconstructed.TriangleCount, skippedDegenerateTriangles = volume.SkippedDegenerateTriangles,
                missingCrossingEdgeMappings = volume.LastMissingCrossingEdgeMappings,
                activeCells = volume.LastActiveCellCount, ambiguousFaces = volume.LastAmbiguousFaceCount,
                ambiguousCells = volume.LastAmbiguousCellCount, multiComponentCells = volume.LastMultiComponentCellCount,
                maximumComponentsPerCell = volume.LastMaximumComponentsPerCell,
                additionalSurfaceVertices = volume.LastAdditionalSurfaceVertexCount,
                sourceValid = source.Validate(out string sourceIssue), sourceIssue = sourceIssue,
                meshValid = reconstructed.Validate(out string meshIssue), meshIssue = meshIssue,
                knownCells = cellEvidence
            };
            File.WriteAllText(Path.Combine(EvidenceFolder, "diagnostics", label + "-ambiguity.json"), JsonUtility.ToJson(report, true));
        }

        private static U4C3Row MakeAfter(string label, float spacing, SculptedStoneMesh source, MatterLocalVolume volume,
            SculptedStoneMesh mesh, int regions, double meshingMilliseconds, double publicationMilliseconds, string encoding)
        {
            bool valid = mesh.Validate(out string issue);
            var sampler = new SourceMeshSignedDistance(source);
            var toSource = new List<double>(mesh.VertexCount);
            var toField = new List<double>(source.VertexCount + source.TriangleCount * 2);
            for (int i = 0; i < mesh.VertexCount; i++) toSource.Add(Math.Abs(sampler.Sample(mesh.GetVertex(i))));
            for (int i = 0; i < source.VertexCount; i++) toField.Add(Math.Abs(volume.Trilinear(source.GetVertex(i))));
            for (int i = 0; i < source.TriangleCount; i++)
            {
                MatterFloat3 a = source.GetVertex(source.GetIndex(i * 3));
                MatterFloat3 b = source.GetVertex(source.GetIndex(i * 3 + 1));
                MatterFloat3 c = source.GetVertex(source.GetIndex(i * 3 + 2));
                toField.Add(Math.Abs(volume.Trilinear(new MatterFloat3((a.X + b.X + c.X) / 3,
                    (a.Y + b.Y + c.Y) / 3, (a.Z + b.Z + c.Z) / 3))));
                toField.Add(Math.Abs(volume.Trilinear(new MatterFloat3((a.X + b.X) * .5f,
                    (a.Y + b.Y) * .5f, (a.Z + b.Z) * .5f))));
            }
            return new U4C3Row
            {
                label = label, spacingMeters = spacing, encoding = encoding, sourceHash = source.GeometryHash.ToString("X16"),
                reconstructedHash = mesh.GeometryHash.ToString("X16"), samples = volume.SampleCount, occupied = volume.OccupiedCount,
                sourceVertices = source.VertexCount, sourceTriangles = source.TriangleCount, reconstructedVertices = mesh.VertexCount,
                reconstructedTriangles = mesh.TriangleCount, regions = regions, skippedDegenerateTriangles = volume.SkippedDegenerateTriangles,
                activeCells = volume.LastActiveCellCount, ambiguousFaces = volume.LastAmbiguousFaceCount,
                ambiguousCells = volume.LastAmbiguousCellCount, multiComponentCells = volume.LastMultiComponentCellCount,
                maximumComponentsPerCell = volume.LastMaximumComponentsPerCell, additionalSurfaceVertices = volume.LastAdditionalSurfaceVertexCount,
                mappedCrossingEdges = volume.LastMappedCrossingEdgeCount, missingCrossingEdgeMappings = volume.LastMissingCrossingEdgeMappings,
                sourceGenerationMilliseconds = 0, samplingMilliseconds = volume.SamplingMilliseconds,
                surfaceNetsMilliseconds = meshingMilliseconds, kernelMilliseconds = volume.LastKernelMilliseconds,
                publicationMilliseconds = publicationMilliseconds,
                reconstructedToSourceMeters = Summarize(toSource), sourceToFieldMeters = Summarize(toField),
                closedConnectedManifold = valid, topologyIssue = issue
            };
        }

        private static U4C2Row FindBaseline(U4C2Row[] rows, string label, float spacing, string encoding = "true signed distance, positive solid")
        {
            foreach (U4C2Row row in rows)
                if (row.label == label && Math.Abs(row.spacingMeters - spacing) < 1e-7f && row.encoding == encoding) return row;
            throw new InvalidDataException("Missing preserved U4C2 matrix row " + label + " / " + spacing + " / " + encoding);
        }

        private static bool Same(ErrorSummary a, ErrorSummary b)
            => a != null && b != null && Math.Abs(a.median - b.median) < 1e-9 &&
               Math.Abs(a.p95 - b.p95) < 1e-9 && Math.Abs(a.max - b.max) < 1e-9;
        private static ErrorSummary Summarize(List<double> values)
        {
            values.Sort();
            return new ErrorSummary { median = values[values.Count / 2], p95 = values[(int)((values.Count - 1) * .95)], max = values[values.Count - 1] };
        }
        private static SculptedStoneGalleryView FindPreview(Scene scene)
        {
            foreach (GameObject root in scene.GetRootGameObjects())
                if (root.TryGetComponent(out SculptedStoneGalleryView preview)) return preview;
            throw new InvalidOperationException("The copied U4C2 scene has no SculptedStoneGalleryView.");
        }
        private static Camera FindCamera(Scene scene)
        {
            foreach (GameObject root in scene.GetRootGameObjects())
                if (root.TryGetComponent(out Camera camera)) return camera;
            throw new InvalidOperationException("The sculpted-source scene has no root camera.");
        }
    }
}
