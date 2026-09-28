using System;
using System.Collections.Generic;
using NUnit.Framework;
using Wildkin.Matter;

namespace Wildkin.Tests.EditMode
{
    public sealed class MatterSurfaceNetsTopologyTests
    {
        private static readonly int[] EdgeA = { 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3 };
        private static readonly int[] EdgeB = { 1, 2, 3, 0, 5, 6, 7, 4, 4, 5, 6, 7 };
        private static readonly int[] CornerX = { 0, 1, 1, 0, 0, 1, 1, 0 };
        private static readonly int[] CornerY = { 0, 0, 1, 1, 0, 0, 1, 1 };
        private static readonly int[] CornerZ = { 0, 0, 0, 0, 1, 1, 1, 1 };

        [Test]
        public void Classifier_PartitionsAll256SignMasksDeterministicallyAndAcrossCubeOrientations()
        {
            List<int[]> orientations = CubeOrientations();
            for (int signMask = 0; signMask < 256; signMask++)
            {
                var values = new float[8];
                for (int corner = 0; corner < 8; corner++) values[corner] = (signMask & (1 << corner)) != 0 ? 1f : -1f;
                MatterSurfaceCellClassification first = MatterSurfaceNetsTopology.Classify(values);
                MatterSurfaceCellClassification repeated = MatterSurfaceNetsTopology.Classify(values);
                Assert.That(first.CrossingEdgeMask, Is.EqualTo(repeated.CrossingEdgeMask), "repeat crossing mask " + signMask);
                Assert.That(first.ComponentCount, Is.EqualTo(repeated.ComponentCount), "repeat component count " + signMask);

                ushort expectedCrossings = 0, assigned = 0;
                for (int edge = 0; edge < 12; edge++)
                    if ((values[EdgeA[edge]] > 0f) != (values[EdgeB[edge]] > 0f)) expectedCrossings |= (ushort)(1 << edge);
                Assert.That(first.CrossingEdgeMask, Is.EqualTo(expectedCrossings), "crossing mask " + signMask);
                var signatures = new List<ushort>();
                for (int component = 0; component < first.ComponentCount; component++)
                {
                    ushort componentMask = first.GetComponentEdgeMask(component);
                    Assert.That(componentMask, Is.Not.Zero, "empty component " + signMask);
                    Assert.That(assigned & componentMask, Is.Zero, "crossing edge assigned twice " + signMask);
                    assigned |= componentMask;
                    signatures.Add(componentMask);
                    for (int edge = 0; edge < 12; edge++)
                        if ((componentMask & (1 << edge)) != 0)
                            Assert.That(first.GetComponentIndexForEdge(edge), Is.EqualTo(component), "edge lookup " + signMask);
                }
                Assert.That(assigned, Is.EqualTo(expectedCrossings), "unassigned crossing edge " + signMask);
                signatures.Sort();

                foreach (int[] orientation in orientations)
                {
                    var orientedValues = new float[8];
                    for (int corner = 0; corner < 8; corner++) orientedValues[orientation[corner]] = values[corner];
                    MatterSurfaceCellClassification oriented = MatterSurfaceNetsTopology.Classify(orientedValues);
                    var transformedBack = new List<ushort>();
                    for (int component = 0; component < oriented.ComponentCount; component++)
                    {
                        ushort orientedMask = oriented.GetComponentEdgeMask(component), originalMask = 0;
                        for (int edge = 0; edge < 12; edge++)
                        {
                            int rotatedEdge = FindEdge(orientation[EdgeA[edge]], orientation[EdgeB[edge]]);
                            if ((orientedMask & (1 << rotatedEdge)) != 0) originalMask |= (ushort)(1 << edge);
                        }
                        transformedBack.Add(originalMask);
                    }
                    transformedBack.Sort();
                    CollectionAssert.AreEqual(signatures, transformedBack,
                        "cube orientation changed the scalar contour classes for sign mask " + signMask);
                }
            }
        }

        [Test]
        public void CheckerboardFaceDecider_IsValueSensitiveAndHasDeterministicNearTiePolicy()
        {
            Assert.That(MatterSurfaceNetsTopology.PositivePhaseConnectsThroughFace(2f, -1f, 2f, -1f), Is.True,
                "The positive bilinear saddle connects the positive diagonal despite the fixed signs.");
            Assert.That(MatterSurfaceNetsTopology.PositivePhaseConnectsThroughFace(1f, -2f, 1f, -2f), Is.False,
                "Changing only the magnitudes moves the saddle into the negative phase.");
            Assert.That(MatterSurfaceNetsTopology.PositivePhaseConnectsThroughFace(-1f, 2f, -1f, 2f), Is.True,
                "The decision is based on saddle sign, not face traversal orientation.");
            Assert.That(MatterSurfaceNetsTopology.PositivePhaseConnectsThroughFace(1f, -1f, 1f, -1f), Is.True,
                "An exact saddle tie deterministically connects positive solid.");
            Assert.That(MatterSurfaceNetsTopology.PositivePhaseConnectsThroughFace(1f, -1f, 1f, -1.0000002f), Is.True,
                "A tie within the documented float-precision band uses the same policy.");
            Assert.That(MatterSurfaceNetsTopology.PositivePhaseConnectsThroughFace(1f, -1f, 1f, -1.00001f), Is.False,
                "A value outside the near-tie band follows the actual saddle sign.");

            MatterSurfaceCellClassification positive = MatterSurfaceNetsTopology.Classify(
                2f, -1f, 2f, -1f, 8f, 8f, 8f, 8f);
            MatterSurfaceCellClassification negative = MatterSurfaceNetsTopology.Classify(
                1f, -2f, 1f, -2f, 8f, 8f, 8f, 8f);
            Assert.That(positive.GetComponentIndexForEdge(0), Is.EqualTo(positive.GetComponentIndexForEdge(1)));
            Assert.That(positive.GetComponentIndexForEdge(2), Is.EqualTo(positive.GetComponentIndexForEdge(3)));
            Assert.That(negative.GetComponentIndexForEdge(3), Is.EqualTo(negative.GetComponentIndexForEdge(0)));
            Assert.That(negative.GetComponentIndexForEdge(1), Is.EqualTo(negative.GetComponentIndexForEdge(2)));
            Assert.That(positive.GetComponentEdgeMask(0), Is.Not.EqualTo(negative.GetComponentEdgeMask(0)));
        }

        [Test]
        public void KnownUnsupportedInteriorAmbiguity_OppositePositiveCornersStaySeparateWithoutCheckerboardFaces()
        {
            // This documents the intentional limit of the face-only classifier. Corners 0 and 6
            // are +1; all others are -0.1. The trilinear field stays positive along their body
            // diagonal, yet no face is checkerboard-ambiguous, so the current boundary graph has
            // two components. This is not a claim that the classifier matches interior topology.
            float[] density = { 1f, -0.1f, -0.1f, -0.1f, -0.1f, -0.1f, 1f, -0.1f };
            MatterSurfaceCellClassification classification = MatterSurfaceNetsTopology.Classify(density);

            Assert.That(classification.AmbiguousFaceCount, Is.Zero);
            Assert.That(classification.ComponentCount, Is.EqualTo(2));
            for (int sample = 0; sample <= 4; sample++)
            {
                float t = sample * 0.25f;
                float positiveCornerWeight = (1f - t) * (1f - t) * (1f - t) + t * t * t;
                float trilinearValue = 1.1f * positiveCornerWeight - 0.1f;
                Assert.That(trilinearValue, Is.GreaterThan(0f), "body-diagonal sample t=" + t);
            }
        }

        [Test]
        public void SurfaceNets_DeterministicNoisyClosedFieldsRemainManifoldAcrossFixedSeeds()
        {
            const int seedCount = 96;
            int totalAmbiguousCells = 0, totalMultiComponentCells = 0;
            var mesher = new MatterSurfaceNetsMesher();
            for (int seed = 1; seed <= seedCount; seed++)
            {
                var grid = new NoisySphereGrid(seed);
                MatterMeshingRegion region = MatterMeshingRegion.CaptureGrid(grid, new MatterBrickAddress(0, 0, 0));
                MatterMeshData first = mesher.Generate(region), second = mesher.Generate(region);
                Assert.That(first.DeterministicHash, Is.EqualTo(second.DeterministicHash), "mesh hash seed " + seed);
                Assert.That(first.MissingCrossingEdgeMappings, Is.Zero, "edge mapping seed " + seed);
                Assert.That(first.SkippedDegenerateTriangles, Is.Zero, "degenerate triangle seed " + seed);
                Assert.That(first.TriangleCount, Is.GreaterThan(0), "empty field seed " + seed);
                AssertFiniteAndIndexed(first, seed);
                AssertAllCrossingEdgesMapped(region, first, seed);
                AssertClosedManifold(first, seed);
                totalAmbiguousCells += first.AmbiguousCellCount;
                totalMultiComponentCells += first.MultiComponentCellCount;
            }
            Assert.That(totalAmbiguousCells, Is.GreaterThan(0), "The fixed stress fields must include ambiguous face cells.");
            Assert.That(totalMultiComponentCells, Is.GreaterThan(0), "The fixed stress fields must include multi-patch cells.");
        }

        [Test]
        public void AmbiguousMultiPatchCellOnBrickSeam_StitchesByComponentKeyWithoutCracksOrDuplicateFaces()
        {
            var grid = new TwoLobeSeamGrid();
            var lower = MatterMeshingRegion.CaptureGrid(grid, new MatterBrickAddress(0, 0, 0));
            var upper = MatterMeshingRegion.CaptureGrid(grid, new MatterBrickAddress(1, 0, 0));
            var mesher = new MatterSurfaceNetsMesher();
            MatterMeshData left = mesher.Generate(lower), right = mesher.Generate(upper);
            var seamCell = new MatterInt3(15, 8, 8);
            ushort[] leftMasks = ComponentMasksAt(left, seamCell), rightMasks = ComponentMasksAt(right, seamCell);
            Assert.That(leftMasks.Length, Is.EqualTo(2), "Two disconnected local surface patches meet this seam cell.");
            CollectionAssert.AreEqual(leftMasks, rightMasks, "The halo capture must produce the same component signatures.");
            Assert.That(left.MissingCrossingEdgeMappings + right.MissingCrossingEdgeMappings, Is.Zero);

            var vertices = new List<MatterFloat3>();
            var keys = new Dictionary<MatterSurfaceVertexKey, int>();
            var orderedKeys = new List<MatterSurfaceVertexKey>();
            var combinedIndices = new List<int>();
            var uniqueFaces = new HashSet<string>(StringComparer.Ordinal);
            AddPart(left, keys, orderedKeys, vertices, combinedIndices, uniqueFaces, "lower");
            AddPart(right, keys, orderedKeys, vertices, combinedIndices, uniqueFaces, "upper");
            Assert.That(combinedIndices.Count % 3, Is.Zero);
            Assert.That(uniqueFaces.Count, Is.EqualTo(combinedIndices.Count / 3), "No overlapping brick face was emitted twice.");

            int seamPatch0 = keys[new MatterSurfaceVertexKey(seamCell, leftMasks[0])];
            int seamPatch1 = keys[new MatterSurfaceVertexKey(seamCell, leftMasks[1])];
            Assert.That(seamPatch0, Is.Not.EqualTo(seamPatch1), "Distinct patch identities in one cell must not be welded together.");
            Assert.That(ConnectedVertexComponents(vertices.Count, combinedIndices), Is.EqualTo(2),
                "The two scalar lobes remain separate while both stay closed.");
            ValidateEachConnectedShell(vertices, combinedIndices);
        }

        private static void AddPart(MatterMeshData mesh, Dictionary<MatterSurfaceVertexKey, int> keys,
            List<MatterSurfaceVertexKey> orderedKeys,
            List<MatterFloat3> vertices, List<int> indices, HashSet<string> uniqueFaces, string label)
        {
            int[] remap = new int[mesh.Vertices.Length];
            for (int i = 0; i < mesh.Vertices.Length; i++)
            {
                MatterSurfaceVertexKey key = mesh.VertexSurfaceKeys[i];
                if (!keys.TryGetValue(key, out int global))
                {
                    global = vertices.Count; keys.Add(key, global); orderedKeys.Add(key); vertices.Add(mesh.Vertices[i].PositionMeters);
                }
                else
                {
                    MatterFloat3 a = vertices[global], b = mesh.Vertices[i].PositionMeters;
                    Assert.That(DistanceSquared(a, b), Is.LessThan(1e-12f), label + " halo vertex position " + key.GlobalCellAddress);
                }
                remap[i] = global;
            }
            for (int i = 0; i < mesh.Indices.Length; i += 3)
            {
                int a = remap[mesh.Indices[i]], b = remap[mesh.Indices[i + 1]], c = remap[mesh.Indices[i + 2]];
                string signature = FaceSignature(orderedKeys, a, b, c);
                Assert.That(uniqueFaces.Add(signature), Is.True, label + " duplicate face " + signature);
                indices.Add(a); indices.Add(b); indices.Add(c);
            }
        }

        private static string FaceSignature(List<MatterSurfaceVertexKey> keys, int a, int b, int c)
        {
            MatterSurfaceVertexKey ka = keys[a], kb = keys[b], kc = keys[c];
            var sorted = new[] { ka, kb, kc };
            Array.Sort(sorted, CompareKeys);
            return KeyText(sorted[0]) + "|" + KeyText(sorted[1]) + "|" + KeyText(sorted[2]);
        }
        private static int CompareKeys(MatterSurfaceVertexKey a, MatterSurfaceVertexKey b)
        {
            int cell = a.GlobalCellAddress.CompareTo(b.GlobalCellAddress);
            return cell != 0 ? cell : a.CrossingEdgeComponentMask.CompareTo(b.CrossingEdgeComponentMask);
        }
        private static string KeyText(MatterSurfaceVertexKey key)
            => key.GlobalCellAddress.X + "," + key.GlobalCellAddress.Y + "," + key.GlobalCellAddress.Z + ":" + key.CrossingEdgeComponentMask.ToString("X3");

        private static int ConnectedVertexComponents(int vertexCount, List<int> indices)
        {
            var adjacency = new List<int>[vertexCount];
            for (int i = 0; i < vertexCount; i++) adjacency[i] = new List<int>();
            for (int i = 0; i < indices.Count; i += 3)
            {
                AddAdjacent(adjacency, indices[i], indices[i + 1]);
                AddAdjacent(adjacency, indices[i + 1], indices[i + 2]);
                AddAdjacent(adjacency, indices[i + 2], indices[i]);
            }
            var visited = new bool[vertexCount]; int components = 0;
            for (int start = 0; start < vertexCount; start++)
            {
                if (visited[start]) continue;
                components++; var pending = new Stack<int>(); pending.Push(start);
                while (pending.Count > 0)
                { int current = pending.Pop(); if (visited[current]) continue; visited[current] = true; foreach (int next in adjacency[current]) pending.Push(next); }
            }
            return components;
        }

        private static void ValidateEachConnectedShell(List<MatterFloat3> vertices, List<int> indices)
        {
            var adjacency = new List<int>[vertices.Count];
            for (int i = 0; i < adjacency.Length; i++) adjacency[i] = new List<int>();
            for (int i = 0; i < indices.Count; i += 3)
            {
                AddAdjacent(adjacency, indices[i], indices[i + 1]);
                AddAdjacent(adjacency, indices[i + 1], indices[i + 2]);
                AddAdjacent(adjacency, indices[i + 2], indices[i]);
            }
            var component = new int[vertices.Count]; Array.Fill(component, -1);
            var groups = new List<List<int>>();
            for (int start = 0; start < vertices.Count; start++)
            {
                if (component[start] >= 0) continue;
                int id = groups.Count; var members = new List<int>(); groups.Add(members);
                var pending = new Stack<int>(); pending.Push(start); component[start] = id;
                while (pending.Count > 0)
                {
                    int current = pending.Pop(); members.Add(current);
                    foreach (int next in adjacency[current]) if (component[next] < 0) { component[next] = id; pending.Push(next); }
                }
            }
            Assert.That(groups.Count, Is.EqualTo(2));
            for (int id = 0; id < groups.Count; id++)
            {
                var remap = new Dictionary<int, int>(); var points = new MatterFloat3[groups[id].Count];
                for (int i = 0; i < groups[id].Count; i++) { remap.Add(groups[id][i], i); points[i] = vertices[groups[id][i]]; }
                var localIndices = new List<int>();
                for (int i = 0; i < indices.Count; i += 3)
                    if (component[indices[i]] == id)
                    { localIndices.Add(remap[indices[i]]); localIndices.Add(remap[indices[i + 1]]); localIndices.Add(remap[indices[i + 2]]); }
                SculptedStoneMesh shell = SculptedStoneMesh.FromIndexedGeometry(points, localIndices.ToArray());
                Assert.That(shell.Validate(out string issue), Is.True, issue);
            }
        }

        private static void AddAdjacent(List<int>[] adjacency, int a, int b)
        { adjacency[a].Add(b); adjacency[b].Add(a); }

        private static ushort[] ComponentMasksAt(MatterMeshData mesh, MatterInt3 cell)
        {
            var masks = new List<ushort>();
            for (int i = 0; i < mesh.VertexSurfaceKeys.Length; i++)
                if (mesh.VertexSurfaceKeys[i].GlobalCellAddress == cell) masks.Add(mesh.VertexSurfaceKeys[i].CrossingEdgeComponentMask);
            masks.Sort(); return masks.ToArray();
        }

        private static MatterFloat3[] Positions(MatterMeshData mesh)
        {
            var positions = new MatterFloat3[mesh.Vertices.Length];
            for (int i = 0; i < positions.Length; i++) positions[i] = mesh.Vertices[i].PositionMeters;
            return positions;
        }

        private static void AssertFiniteAndIndexed(MatterMeshData mesh, int seed)
        {
            Assert.That(mesh.Indices.Length % 3, Is.Zero, "triangle index count seed " + seed);
            Assert.That(mesh.VertexSurfaceKeys.Length, Is.EqualTo(mesh.Vertices.Length));
            foreach (int index in mesh.Indices) Assert.That(index, Is.InRange(0, mesh.Vertices.Length - 1), "index seed " + seed);
            foreach (MatterMeshVertex vertex in mesh.Vertices)
            {
                Assert.That(float.IsNaN(vertex.PositionMeters.X) || float.IsInfinity(vertex.PositionMeters.X), Is.False, "finite x seed " + seed);
                Assert.That(float.IsNaN(vertex.PositionMeters.Y) || float.IsInfinity(vertex.PositionMeters.Y), Is.False, "finite y seed " + seed);
                Assert.That(float.IsNaN(vertex.PositionMeters.Z) || float.IsInfinity(vertex.PositionMeters.Z), Is.False, "finite z seed " + seed);
            }
            for (int i = 0; i < mesh.Indices.Length; i += 3)
            {
                Assert.That(mesh.Indices[i], Is.Not.EqualTo(mesh.Indices[i + 1]));
                Assert.That(mesh.Indices[i + 1], Is.Not.EqualTo(mesh.Indices[i + 2]));
                Assert.That(mesh.Indices[i + 2], Is.Not.EqualTo(mesh.Indices[i]));
            }
        }

        private static List<int[]> CubeOrientations()
        {
            int[][] permutations =
            {
                new[]{0,1,2}, new[]{0,2,1}, new[]{1,0,2},
                new[]{1,2,0}, new[]{2,0,1}, new[]{2,1,0}
            };
            var result = new List<int[]>();
            foreach (int[] p in permutations) for (int flips = 0; flips < 8; flips++)
            {
                var map = new int[8];
                for (int corner = 0; corner < 8; corner++)
                {
                    int[] xyz = { CornerX[corner], CornerY[corner], CornerZ[corner] };
                    int x = xyz[p[0]] ^ ((flips & 1) != 0 ? 1 : 0);
                    int y = xyz[p[1]] ^ ((flips & 2) != 0 ? 1 : 0);
                    int z = xyz[p[2]] ^ ((flips & 4) != 0 ? 1 : 0);
                    map[corner] = FindCorner(x, y, z);
                }
                result.Add(map);
            }
            return result;
        }

        private static int FindCorner(int x, int y, int z)
        {
            for (int corner = 0; corner < 8; corner++)
                if (CornerX[corner] == x && CornerY[corner] == y && CornerZ[corner] == z) return corner;
            throw new InvalidOperationException("Orientation did not map a cube corner.");
        }

        private static int FindEdge(int a, int b)
        {
            for (int edge = 0; edge < 12; edge++)
                if ((EdgeA[edge] == a && EdgeB[edge] == b) || (EdgeA[edge] == b && EdgeB[edge] == a)) return edge;
            throw new InvalidOperationException("Orientation did not map a cube edge to a cube edge.");
        }

        private static void AssertClosedManifold(MatterMeshData mesh, int seed)
        {
            var edgeUses = new Dictionary<ulong, int>();
            var edgeDirections = new Dictionary<ulong, int>();
            var edgeFaces = new Dictionary<ulong, List<int>>();
            var incidentFaces = new List<int>[mesh.Vertices.Length];
            for (int i = 0; i < incidentFaces.Length; i++) incidentFaces[i] = new List<int>();
            for (int face = 0; face < mesh.TriangleCount; face++)
            {
                int offset = face * 3;
                int a = mesh.Indices[offset], b = mesh.Indices[offset + 1], c = mesh.Indices[offset + 2];
                incidentFaces[a].Add(face); incidentFaces[b].Add(face); incidentFaces[c].Add(face);
                AddManifoldEdge(a, b, face, edgeUses, edgeDirections, edgeFaces);
                AddManifoldEdge(b, c, face, edgeUses, edgeDirections, edgeFaces);
                AddManifoldEdge(c, a, face, edgeUses, edgeDirections, edgeFaces);
            }
            foreach (var pair in edgeUses)
            {
                Assert.That(pair.Value, Is.EqualTo(2), "edge incidence seed " + seed);
                Assert.That(edgeDirections[pair.Key], Is.Zero, "opposite edge winding seed " + seed);
            }
            var fanMarks = new int[mesh.TriangleCount];
            var fanStack = new int[mesh.TriangleCount];
            for (int vertex = 0; vertex < incidentFaces.Length; vertex++)
            {
                List<int> faces = incidentFaces[vertex];
                Assert.That(faces.Count, Is.GreaterThanOrEqualTo(3), "vertex fan seed " + seed);
                int stamp = vertex + 1, pending = 1, visited = 0;
                fanStack[0] = faces[0]; fanMarks[faces[0]] = stamp;
                while (pending > 0)
                {
                    int face = fanStack[--pending]; visited++;
                    int offset = face * 3;
                    int a = mesh.Indices[offset], b = mesh.Indices[offset + 1], c = mesh.Indices[offset + 2];
                    int otherA = a == vertex ? b : b == vertex ? c : a;
                    int otherB = a == vertex ? c : b == vertex ? a : b;
                    int faceA = OtherFace(edgeFaces[EdgeKey(vertex, otherA)], face);
                    int faceB = OtherFace(edgeFaces[EdgeKey(vertex, otherB)], face);
                    Assert.That(faceA, Is.Not.EqualTo(faceB), "repeated fan edge seed " + seed);
                    if (fanMarks[faceA] != stamp) { fanMarks[faceA] = stamp; fanStack[pending++] = faceA; }
                    if (fanMarks[faceB] != stamp) { fanMarks[faceB] = stamp; fanStack[pending++] = faceB; }
                }
                Assert.That(visited, Is.EqualTo(faces.Count), "connected vertex fan seed " + seed);
            }
        }

        private static void AssertAllCrossingEdgesMapped(MatterMeshingRegion region, MatterMeshData mesh, int seed)
        {
            int expected = 0;
            for (int z = 0; z < MatterMeshingRegion.HaloCellCount; z++)
            for (int y = 0; y < MatterMeshingRegion.HaloCellCount; y++)
            for (int x = 0; x < MatterMeshingRegion.HaloCellCount; x++)
            {
                MatterInt3 cell = region.CellOrigin + new MatterInt3(x, y, z);
                bool c0 = region.GetSample(cell).Density > 0f;
                for (int edge = 0; edge < 12; edge++)
                {
                    MatterInt3 a = cell + new MatterInt3(CornerX[EdgeA[edge]], CornerY[EdgeA[edge]], CornerZ[EdgeA[edge]]);
                    MatterInt3 b = cell + new MatterInt3(CornerX[EdgeB[edge]], CornerY[EdgeB[edge]], CornerZ[EdgeB[edge]]);
                    if ((region.GetSample(a).Density > 0f) != (region.GetSample(b).Density > 0f)) expected++;
                }
            }
            Assert.That(mesh.MappedCrossingEdgeCount, Is.EqualTo(expected), "each active cell crossing maps once; seed " + seed);
        }

        private static void AddManifoldEdge(int a, int b, int face, Dictionary<ulong, int> uses,
            Dictionary<ulong, int> directions, Dictionary<ulong, List<int>> faces)
        {
            ulong key = EdgeKey(a, b);
            uses.TryGetValue(key, out int count); uses[key] = count + 1;
            directions.TryGetValue(key, out int direction); directions[key] = direction + (a < b ? 1 : -1);
            if (!faces.TryGetValue(key, out List<int> incident)) { incident = new List<int>(2); faces.Add(key, incident); }
            incident.Add(face);
        }

        private static ulong EdgeKey(int a, int b)
            => ((ulong)(uint)Math.Min(a, b) << 32) | (uint)Math.Max(a, b);

        private static int OtherFace(List<int> faces, int face)
            => faces[0] == face ? faces[1] : faces[0];

        private static float DistanceSquared(MatterFloat3 a, MatterFloat3 b)
        { float x=a.X-b.X,y=a.Y-b.Y,z=a.Z-b.Z; return x*x+y*y+z*z; }

        private sealed class NoisySphereGrid : IMatterReadOnlyGrid
        {
            private readonly int _seed;
            public NoisySphereGrid(int seed) { _seed = seed; }
            public float SampleSpacingMeters => 1f;
            public MatterSample ReadSample(MatterSampleAddress address)
            {
                int x=address.X,y=address.Y,z=address.Z;
                if (x<0||x>6||y<0||y>6||z<0||z>6||x==0||x==6||y==0||y==6||z==0||z==6)
                    return MatterSample.Air(-.65f);
                double dx=x-3d,dy=y-3d,dz=z-3d;
                double distance=Math.Sqrt(dx*dx+dy*dy+dz*dz);
                float noise=Noise(_seed,x,y,z);
                float density;
                if (distance<=1.7d) density=.8f+noise*.08f;
                else if (distance>=3d) density=-.35f+noise*.08f;
                else density=(float)(2.65d-distance)+noise*.58f;
                return density>0f?new MatterSample(density,MatterMaterialId.Rock):MatterSample.Air(density);
            }
        }

        private sealed class TwoLobeSeamGrid : IMatterReadOnlyGrid
        {
            public float SampleSpacingMeters => 1f;
            public MatterSample ReadSample(MatterSampleAddress address)
            {
                int x=address.X,y=address.Y,z=address.Z;
                float density=-Math.Max(.05f,Math.Min(Math.Abs(x-16),Math.Min(Math.Abs(y-8),Math.Abs(z-8))));
                if (x==16&&y==8&&z==8) density=.3f;
                if (x==16&&y==9&&z==9) density=.3f;
                if (x==16&&y==9&&z==8) density=-.7f;
                if (x==16&&y==8&&z==9) density=-.7f;
                return density>0f?new MatterSample(density,MatterMaterialId.Rock):MatterSample.Air(density);
            }
        }

        private static float Noise(int seed,int x,int y,int z)
        {
            unchecked
            {
                uint value=(uint)seed*0x9E3779B9u^(uint)x*0x85EBCA6Bu^(uint)y*0xC2B2AE35u^(uint)z*0x27D4EB2Fu;
                value^=value>>16;value*=0x7FEB352Du;value^=value>>15;value*=0x846CA68Bu;value^=value>>16;
                return (value&0x00FFFFFFu)/8388607.5f-1f;
            }
        }
    }
}
