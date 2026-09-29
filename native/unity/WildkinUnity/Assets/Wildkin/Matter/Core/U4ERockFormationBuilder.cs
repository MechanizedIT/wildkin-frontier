using System;
using System.Collections.Generic;
using System.Diagnostics;

namespace Wildkin.Matter
{
    public sealed class U4EFormationChildBuild
    {
        public U4ERockFormationChildRecipe Recipe { get; }
        public MatterDomain Domain { get; }
        public MatterDomainSurfaceNetsMesher Mesher { get; }
        public MatterDomainMeshBuildResult MeshBuild { get; internal set; }
        public U4ESurfaceProbeSet SurfaceProbes { get; internal set; }
        public ulong SourceGeometryHash { get; }
        public bool SourceReferenceDiscardedAfterBake { get; }
        public U4EContactFitResult Fit { get; }

        internal U4EFormationChildBuild(U4ERockFormationChildRecipe recipe, MatterDomain domain,
            MatterDomainSurfaceNetsMesher mesher, MatterDomainMeshBuildResult meshBuild,
            U4ESurfaceProbeSet surfaceProbes, ulong sourceGeometryHash, U4EContactFitResult fit)
        {
            Recipe = recipe;
            Domain = domain;
            Mesher = mesher;
            MeshBuild = meshBuild;
            SurfaceProbes = surfaceProbes;
            SourceGeometryHash = sourceGeometryHash;
            SourceReferenceDiscardedAfterBake = true;
            Fit = fit;
        }
    }

    public sealed class U4EFormationBuildResult
    {
        public bool Accepted { get; internal set; }
        public int Seed { get; internal set; }
        public int AttemptIndex { get; internal set; }
        public U4EFormationArchetype Archetype { get; internal set; }
        public string RejectionReason { get; internal set; }
        public MatterDomainPose RootPose { get; internal set; }
        public MatterBounds TerrainBounds { get; internal set; }
        public MatterMeshData TerrainMesh { get; internal set; }
        public U4ESurfaceProbeSet TerrainSurfaceProbes { get; internal set; }
        public MatterWorld TerrainWorld { get; internal set; }
        public IReadOnlyList<U4EFormationChildBuild> Children { get; internal set; }
        public IReadOnlyList<U4EContactMeasurement> CandidateMeasurements { get; internal set; }
        public string[] CandidateAttemptDiagnostics { get; internal set; } = Array.Empty<string>();
        public U4EContactGraph ContactGraph { get; internal set; }
        public U4ERockFormationRecipe Recipe { get; internal set; }
        public U4EPristineFormationDescriptor PristineDescriptor { get; internal set; }
        public double SourceAndBakeMilliseconds { get; internal set; }
        public double MeshingMilliseconds { get; internal set; }
        public double ContactMilliseconds { get; internal set; }
        public long TotalDomainPayloadBytes { get; internal set; }
        public int TotalDomainSamples { get; internal set; }
        public string SourceGeometryHash { get; internal set; }
        public string FormationHash { get; internal set; }
        public double TerrainMeshingMilliseconds { get; internal set; }
    }

    public sealed class U4EFormationEditResult
    {
        public bool Changed { get; internal set; }
        public string DomainId { get; internal set; }
        public int ChangedSampleCount { get; internal set; }
        public int SamplesExamined { get; internal set; }
        public int DirectlyChangedRegionCount { get; internal set; }
        public int RebuiltRegionCount { get; internal set; }
        public int ReusedRegionCount { get; internal set; }
        public string BeforeContentHash { get; internal set; }
        public string AfterContentHash { get; internal set; }
        public string BeforeMeshHash { get; internal set; }
        public string AfterMeshHash { get; internal set; }
        public string[] InvalidatedPairKeys { get; internal set; } = Array.Empty<string>();
        public bool ContactGraphConnectedToTerrain { get; internal set; }
        public U4EContactGraph ContactGraph { get; internal set; }
    }

    /// <summary>
    /// Builds independent, editable child domains from deterministic source recipes and fits them
    /// to the unchanged 0.50 m MatterWorld using sampled geometry only.
    /// </summary>
    public static class U4ERockFormationBuilder
    {
        private const int TerrainSourceSeed = MatterWorldFactory.DefaultSourceSeed;
        private const float TerrainSpacingMeters = MatterWorldFactory.DefaultSampleSpacingMeters;

        public static U4EFormationBuildResult Build(int seed, MatterDomainPose rootPose,
            MatterBounds? terrainBounds = null)
        {
            MatterBounds bounds = terrainBounds ?? DefaultTerrainBounds;
            string lastFailure = "No candidate formation attempt was evaluated.";
            var diagnostics = new List<string>(U4EFormationConfiguration.MaximumCandidateAttempts);
            for (int attempt = 0; attempt < U4EFormationConfiguration.MaximumCandidateAttempts; attempt++)
            {
                U4ERockFormationRecipe recipe = U4ERockFormationGenerator.CreateRecipe(seed, attempt);
                U4EFormationBuildResult result = BuildCandidate(recipe, rootPose, bounds);
                if (result.Accepted)
                {
                    result.CandidateAttemptDiagnostics = diagnostics.ToArray();
                    return result;
                }
                lastFailure = result.RejectionReason;
                diagnostics.Add("attempt " + attempt.ToString(System.Globalization.CultureInfo.InvariantCulture) + ": " + lastFailure);
            }
            return new U4EFormationBuildResult
            {
                Accepted = false,
                Seed = seed,
                AttemptIndex = U4EFormationConfiguration.MaximumCandidateAttempts - 1,
                Archetype = (U4EFormationArchetype)PositiveModulo(seed, 4),
                RootPose = rootPose,
                TerrainBounds = bounds,
                RejectionReason = "All bounded deterministic candidate attempts failed. Last reason: " + lastFailure,
                Children = Array.Empty<U4EFormationChildBuild>(),
                CandidateMeasurements = Array.Empty<U4EContactMeasurement>(),
                CandidateAttemptDiagnostics = diagnostics.ToArray()
            };
        }

        public static U4EFormationBuildResult RegeneratePristine(U4EPristineFormationDescriptor descriptor,
            MatterBounds? terrainBounds = null)
        {
            MatterDomainPose rootPose = PoseFromDescriptor(descriptor);
            U4ERockFormationRecipe recipe = U4ERockFormationGenerator.CreateRecipe(
                descriptor.formationSeed, descriptor.acceptedAttemptIndex);
            return BuildCandidate(recipe, rootPose, terrainBounds ?? DefaultTerrainBounds);
        }

        public static MatterBounds DefaultTerrainBounds => new MatterBounds(
            new MatterInt3(-12, -4, -12), new MatterInt3(13, 5, 13));

        private sealed class WorldGridView : IMatterReadOnlyGrid
        {
            private readonly MatterWorld _world;
            public float SampleSpacingMeters => _world.SampleSpacingMeters;
            public WorldGridView(MatterWorld world) => _world = world ?? throw new ArgumentNullException(nameof(world));
            public MatterSample ReadSample(MatterSampleAddress address) => _world.ReadSample(address);
        }

        public static U4EPristineFormationDescriptor CreateDescriptor(U4EFormationBuildResult result)
        {
            if (result == null || !result.Accepted) throw new ArgumentException("Only an accepted formation can produce a pristine descriptor.", nameof(result));
            return new U4EPristineFormationDescriptor
            {
                formationSeed = result.Seed,
                acceptedAttemptIndex = result.AttemptIndex,
                archetype = result.Archetype,
                rootPositionX = result.RootPose.PositionMeters.X,
                rootPositionY = result.RootPose.PositionMeters.Y,
                rootPositionZ = result.RootPose.PositionMeters.Z,
                rootRotationX = result.RootPose.RotationX,
                rootRotationY = result.RootPose.RotationY,
                rootRotationZ = result.RootPose.RotationZ,
                rootRotationW = result.RootPose.RotationW
            };
        }

        public static MatterDomainPose PoseFromDescriptor(U4EPristineFormationDescriptor descriptor)
        {
            if (descriptor == null) throw new ArgumentNullException(nameof(descriptor));
            if (!string.Equals(descriptor.schemaVersion, "U4E-PristineDescriptor-v1", StringComparison.Ordinal) ||
                !string.Equals(descriptor.recipeVersion, U4EFormationConfiguration.RecipeVersion, StringComparison.Ordinal))
                throw new ArgumentException("Unsupported U4E pristine descriptor schema or recipe version.", nameof(descriptor));
            return new MatterDomainPose(new MatterFloat3(descriptor.rootPositionX, descriptor.rootPositionY,
                descriptor.rootPositionZ), descriptor.rootRotationX, descriptor.rootRotationY,
                descriptor.rootRotationZ, descriptor.rootRotationW);
        }

        public static U4EFormationEditResult RemoveSphereLocal(U4EFormationBuildResult formation,
            string domainId, MatterFloat3 localCenterMeters, float radiusMeters)
        {
            U4EFormationChildBuild child = FindChild(formation, domainId);
            string beforeContent = FormatHash(child.Domain.ComputeContentHash());
            string beforeMesh = FormatHash(child.MeshBuild.Mesh.DeterministicHash);
            MatterDomainEditResult edit = child.Domain.RemoveSphereLocal(localCenterMeters, radiusMeters);
            if (!edit.Changed)
                return new U4EFormationEditResult
                {
                    Changed = false,
                    DomainId = domainId,
                    SamplesExamined = edit.SamplesExamined,
                    BeforeContentHash = beforeContent,
                    AfterContentHash = beforeContent,
                    BeforeMeshHash = beforeMesh,
                    AfterMeshHash = beforeMesh,
                    ContactGraph = formation.ContactGraph,
                    ContactGraphConnectedToTerrain = formation.ContactGraph.allChildrenConnectedToTerrain
                };

            MatterDomainMeshBuildResult updated = child.Mesher.Build(child.Domain, edit.ChangedSamples);
            if (!updated.TryPublishTo(child.Domain))
                throw new InvalidOperationException("The edited child mesh did not publish to its current content revision.");
            child.MeshBuild = updated;
            child.SurfaceProbes = new U4ESurfaceProbeSet(updated.Mesh);
            string[] invalidated = ReevaluateIncidentContacts(formation, domainId);
            formation.FormationHash = ComputeFormationHash(formation.Recipe, formation.Children, formation.ContactGraph);
            return new U4EFormationEditResult
            {
                Changed = true,
                DomainId = domainId,
                ChangedSampleCount = edit.ChangedSampleCount,
                SamplesExamined = edit.SamplesExamined,
                DirectlyChangedRegionCount = updated.DirectlyChangedRegionCount,
                RebuiltRegionCount = updated.RebuiltRegionCount,
                ReusedRegionCount = updated.ReusedRegionCount,
                BeforeContentHash = beforeContent,
                AfterContentHash = FormatHash(child.Domain.ComputeContentHash()),
                BeforeMeshHash = beforeMesh,
                AfterMeshHash = FormatHash(updated.Mesh.DeterministicHash),
                InvalidatedPairKeys = invalidated,
                ContactGraph = formation.ContactGraph,
                ContactGraphConnectedToTerrain = formation.ContactGraph.allChildrenConnectedToTerrain
            };
        }

        public static U4EFormationEditResult SetDomainPose(U4EFormationBuildResult formation,
            string domainId, MatterDomainPose pose)
        {
            U4EFormationChildBuild child = FindChild(formation, domainId);
            string beforeContent = FormatHash(child.Domain.ComputeContentHash());
            string beforeMesh = FormatHash(child.MeshBuild.Mesh.DeterministicHash);
            child.Domain.SetPose(pose);
            string[] invalidated = ReevaluateIncidentContacts(formation, domainId);
            formation.FormationHash = ComputeFormationHash(formation.Recipe, formation.Children, formation.ContactGraph);
            return new U4EFormationEditResult
            {
                Changed = true,
                DomainId = domainId,
                BeforeContentHash = beforeContent,
                AfterContentHash = FormatHash(child.Domain.ComputeContentHash()),
                BeforeMeshHash = beforeMesh,
                AfterMeshHash = FormatHash(child.MeshBuild.Mesh.DeterministicHash),
                InvalidatedPairKeys = invalidated,
                ContactGraph = formation.ContactGraph,
                ContactGraphConnectedToTerrain = formation.ContactGraph.allChildrenConnectedToTerrain
            };
        }

        private static string[] ReevaluateIncidentContacts(U4EFormationBuildResult formation, string domainId)
        {
            var terrainMeasurements = new List<U4EContactMeasurement>();
            var domainMeasurements = new List<U4EContactMeasurement>();
            var invalidated = new List<string>();
            var childById = new Dictionary<string, U4EFormationChildBuild>(StringComparer.Ordinal);
            for (int i = 0; i < formation.Children.Count; i++) childById.Add(formation.Children[i].Domain.Id, formation.Children[i]);

            foreach (U4EContactMeasurement previous in formation.ContactGraph.measurements)
            {
                if (!string.Equals(previous.nodeA, domainId, StringComparison.Ordinal) &&
                    !string.Equals(previous.nodeB, domainId, StringComparison.Ordinal))
                {
                    AddByTerrain(terrainMeasurements, domainMeasurements, previous);
                    continue;
                }

                string otherId = string.Equals(previous.nodeA, domainId, StringComparison.Ordinal)
                    ? previous.nodeB : previous.nodeA;
                U4EFormationChildBuild changed = childById[domainId];
                U4EContactMeasurement current;
                if (string.Equals(otherId, U4EFormationConfiguration.TerrainNodeId, StringComparison.Ordinal))
                {
                    current = U4EContactProbe.MeasureDomainAgainstGrid(changed.Domain, changed.SurfaceProbes,
                        new WorldGridView(formation.TerrainWorld), formation.TerrainBounds, formation.RootPose,
                        formation.TerrainSurfaceProbes);
                    terrainMeasurements.Add(current);
                }
                else
                {
                    U4EFormationChildBuild other = childById[otherId];
                    current = U4EContactProbe.MeasureDomains(changed.Domain, changed.SurfaceProbes,
                        other.Domain, other.SurfaceProbes);
                    domainMeasurements.Add(current);
                }
                invalidated.Add(U4EContactGraph.PairKey(domainId, otherId));
            }

            var ids = new string[formation.Children.Count];
            for (int i = 0; i < formation.Children.Count; i++) ids[i] = formation.Children[i].Domain.Id;
            formation.ContactGraph = U4EContactGraph.Build(ids, terrainMeasurements, domainMeasurements);
            formation.CandidateMeasurements = formation.ContactGraph.measurements;
            return invalidated.ToArray();
        }

        private static void AddByTerrain(List<U4EContactMeasurement> terrain,
            List<U4EContactMeasurement> pairs, U4EContactMeasurement measurement)
        {
            if (string.Equals(measurement.nodeA, U4EFormationConfiguration.TerrainNodeId, StringComparison.Ordinal) ||
                string.Equals(measurement.nodeB, U4EFormationConfiguration.TerrainNodeId, StringComparison.Ordinal))
                terrain.Add(measurement);
            else
                pairs.Add(measurement);
        }

        private static U4EFormationChildBuild FindChild(U4EFormationBuildResult formation, string domainId)
        {
            if (formation == null || !formation.Accepted)
                throw new ArgumentException("A built formation is required.", nameof(formation));
            for (int i = 0; i < formation.Children.Count; i++)
                if (string.Equals(formation.Children[i].Domain.Id, domainId, StringComparison.Ordinal)) return formation.Children[i];
            throw new KeyNotFoundException("U4E formation child domain not found: " + domainId);
        }

        private static U4EFormationBuildResult BuildCandidate(U4ERockFormationRecipe recipe,
            MatterDomainPose rootPose, MatterBounds terrainBounds)
        {
            var terrainWatch = Stopwatch.StartNew();
            MatterWorld world = MatterWorldFactory.CreateQualificationWorld(TerrainSourceSeed, TerrainSpacingMeters);
            var worldGrid = new WorldGridView(world);
            var terrainPose = rootPose;
            MatterMeshData terrainMesh = MatterDomainSurfaceNetsMesher.BuildReadOnlyGrid(worldGrid, terrainBounds,
                out _, out _, out _, out _);
            var terrainProbes = new U4ESurfaceProbeSet(terrainMesh);
            terrainWatch.Stop();
            var children = new List<U4EFormationChildBuild>(recipe.children.Length);
            var childBySlot = new Dictionary<string, U4EFormationChildBuild>(StringComparer.Ordinal);
            var terrainMeasurements = new List<U4EContactMeasurement>(recipe.children.Length);
            var domainMeasurements = new List<U4EContactMeasurement>(recipe.children.Length * (recipe.children.Length - 1) / 2);
            var allMeasurements = new List<U4EContactMeasurement>();
            double sourceAndBakeMilliseconds = 0d;
            double meshingMilliseconds = 0d;
            double contactMilliseconds = 0d;
            string failure = null;

            for (int index = 0; index < recipe.children.Length; index++)
            {
                U4ERockFormationChildRecipe childRecipe = recipe.children[index];
                SculptedStoneMesh sourceMesh;
                MatterDomain domain;
                MatterDomainPose initialPose = ChildPose(rootPose, childRecipe);
                var childWatch = Stopwatch.StartNew();
                try
                {
                    sourceMesh = SculptedStoneGenerator.Build(childRecipe.sourceRecipe);
                    var local = new MatterLocalVolume(sourceMesh, childRecipe.sampleSpacingMeters);
                    domain = MatterDomain.Bake(childRecipe.stableDomainId, local.Bounds,
                        childRecipe.sampleSpacingMeters, local, initialPose);
                }
                catch (Exception exception)
                {
                    childWatch.Stop();
                    sourceAndBakeMilliseconds += childWatch.Elapsed.TotalMilliseconds;
                    failure = "Source generation or bounded domain bake failed for slot '" + childRecipe.slotId + "': " + exception.Message;
                    break;
                }
                childWatch.Stop();
                sourceAndBakeMilliseconds += childWatch.Elapsed.TotalMilliseconds;
                ulong sourceHash = sourceMesh.GeometryHash;
                sourceMesh = null;

                var mesher = new MatterDomainSurfaceNetsMesher();
                MatterDomainMeshBuildResult meshBuild;
                var meshWatch = Stopwatch.StartNew();
                try
                {
                    meshBuild = mesher.Build(domain);
                    if (!meshBuild.TryPublishTo(domain))
                        throw new InvalidOperationException("The initial domain mesh did not publish to its own revision.");
                }
                catch (Exception exception)
                {
                    meshWatch.Stop();
                    meshingMilliseconds += meshWatch.Elapsed.TotalMilliseconds;
                    failure = "Surface Nets meshing failed for slot '" + childRecipe.slotId + "': " + exception.Message;
                    break;
                }
                meshWatch.Stop();
                meshingMilliseconds += meshWatch.Elapsed.TotalMilliseconds;
                var probes = new U4ESurfaceProbeSet(meshBuild.Mesh);

                var contactWatch = Stopwatch.StartNew();
                U4EContactFitResult fit;
                MatterFloat3 fitDirection = RotateDirection(rootPose, childRecipe.fitDirectionLocal);
                if (string.IsNullOrEmpty(childRecipe.parentSlotId))
                {
                    fit = U4EContactFitter.FitDomainToGrid(domain, probes, worldGrid, terrainBounds,
                        terrainPose, terrainProbes, fitDirection);
                    allMeasurements.Add(fit.measurement);
                }
                else
                {
                    if (!childBySlot.TryGetValue(childRecipe.parentSlotId, out U4EFormationChildBuild parent))
                    {
                        failure = "Semantic parent slot '" + childRecipe.parentSlotId + "' was not built before '" + childRecipe.slotId + "'.";
                        break;
                    }
                    fit = U4EContactFitter.FitDomainToDomain(domain, probes, parent.Domain,
                        parent.SurfaceProbes, fitDirection);
                    allMeasurements.Add(fit.measurement);
                }
                contactWatch.Stop();
                contactMilliseconds += contactWatch.Elapsed.TotalMilliseconds;
                if (!fit.accepted)
                {
                    failure = "Measured parent contact failed for slot '" + childRecipe.slotId + "': " + fit.rejectionReason;
                    break;
                }

                // The fitter changes only the child pose; samples, mesh, and region cache remain fixed.
                var childBuild = new U4EFormationChildBuild(childRecipe, domain, mesher, meshBuild,
                    probes, sourceHash, fit);
                children.Add(childBuild);
                childBySlot.Add(childRecipe.slotId, childBuild);
            }

            if (failure == null)
            {
                var contactWatch = Stopwatch.StartNew();
                for (int i = 0; i < children.Count && failure == null; i++)
                {
                    U4EFormationChildBuild child = children[i];
                    U4EContactMeasurement terrain = U4EContactProbe.MeasureDomainAgainstGrid(child.Domain,
                        child.SurfaceProbes, worldGrid, terrainBounds, terrainPose, terrainProbes);
                    terrainMeasurements.Add(terrain);
                    allMeasurements.Add(terrain);
                    if (!terrain.HasZeroSampledOverlap)
                        failure = "Terrain overlap detected for slot '" + child.Recipe.slotId + "'.";

                    for (int j = 0; j < i; j++)
                    {
                        U4EFormationChildBuild other = children[j];
                        U4EContactMeasurement pair = U4EContactProbe.MeasureDomains(child.Domain,
                            child.SurfaceProbes, other.Domain, other.SurfaceProbes);
                        domainMeasurements.Add(pair);
                        allMeasurements.Add(pair);
                        if (!pair.HasZeroSampledOverlap)
                        {
                            failure = "Sampled solid overlap detected between slots '" + other.Recipe.slotId + "' and '" + child.Recipe.slotId + "'.";
                            break;
                        }
                    }
                }
                contactWatch.Stop();
                contactMilliseconds += contactWatch.Elapsed.TotalMilliseconds;
            }

            U4EContactGraph graph = null;
            if (failure == null)
            {
                var ids = new string[children.Count];
                for (int i = 0; i < children.Count; i++) ids[i] = children[i].Domain.Id;
                graph = U4EContactGraph.Build(ids, terrainMeasurements, domainMeasurements);
                if (!graph.allChildrenConnectedToTerrain)
                    failure = "Measured contact graph is not fully connected to the terrain node.";
            }

            var result = new U4EFormationBuildResult
            {
                Accepted = failure == null,
                Seed = recipe.seed,
                AttemptIndex = recipe.attemptIndex,
                Archetype = recipe.archetype,
                RejectionReason = failure ?? string.Empty,
                RootPose = rootPose,
                TerrainBounds = terrainBounds,
                TerrainMesh = terrainMesh,
                TerrainSurfaceProbes = terrainProbes,
                TerrainWorld = world,
                Children = children.ToArray(),
                CandidateMeasurements = allMeasurements.ToArray(),
                ContactGraph = graph,
                Recipe = recipe,
                SourceAndBakeMilliseconds = sourceAndBakeMilliseconds,
                MeshingMilliseconds = meshingMilliseconds,
                ContactMilliseconds = contactMilliseconds,
                TerrainMeshingMilliseconds = terrainWatch.Elapsed.TotalMilliseconds,
                TotalDomainPayloadBytes = SumPayloadBytes(children),
                TotalDomainSamples = SumSampleCounts(children),
                SourceGeometryHash = ComputeSourceHash(children),
                FormationHash = graph == null ? string.Empty : ComputeFormationHash(recipe, children, graph)
            };
            if (result.Accepted) result.PristineDescriptor = CreateDescriptor(result);
            return result;
        }

        private static MatterDomainPose ChildPose(MatterDomainPose rootPose, U4ERockFormationChildRecipe recipe)
        {
            MatterFloat3 position = rootPose.TransformPoint(recipe.proposedLocalPosition);
            double radians = recipe.yawDegrees * Math.PI / 180d;
            float sy = (float)Math.Sin(radians * .5d), cy = (float)Math.Cos(radians * .5d);
            float qx = rootPose.RotationX, qy = rootPose.RotationY, qz = rootPose.RotationZ, qw = rootPose.RotationW;
            return new MatterDomainPose(position,
                qx * cy + qz * sy,
                qy * cy + qw * sy,
                qz * cy - qx * sy,
                qw * cy - qy * sy);
        }

        private static MatterFloat3 RotateDirection(MatterDomainPose pose, MatterFloat3 direction)
        {
            MatterFloat3 point = pose.TransformPoint(direction);
            return U4EContactFitter.Normalize(new MatterFloat3(point.X - pose.PositionMeters.X,
                point.Y - pose.PositionMeters.Y, point.Z - pose.PositionMeters.Z));
        }

        private static long SumPayloadBytes(IReadOnlyList<U4EFormationChildBuild> children)
        {
            long total = 0;
            for (int i = 0; i < children.Count; i++) total += children[i].Domain.RawPayloadBytes;
            return total;
        }

        private static int SumSampleCounts(IReadOnlyList<U4EFormationChildBuild> children)
        {
            int total = 0;
            for (int i = 0; i < children.Count; i++) total = checked(total + children[i].Domain.SampleCount);
            return total;
        }

        private static string ComputeSourceHash(IReadOnlyList<U4EFormationChildBuild> children)
        {
            ulong hash = 14695981039346656037UL;
            for (int i = 0; i < children.Count; i++)
            {
                U4EFormationChildBuild child = children[i];
                HashText(ref hash, child.Recipe.slotId);
                HashInt(ref hash, unchecked((int)child.SourceGeometryHash));
                HashInt(ref hash, unchecked((int)(child.SourceGeometryHash >> 32)));
            }
            return "0x" + hash.ToString("X16", System.Globalization.CultureInfo.InvariantCulture);
        }

        private static string ComputeFormationHash(U4ERockFormationRecipe recipe,
            IReadOnlyList<U4EFormationChildBuild> children, U4EContactGraph graph)
        {
            ulong hash = 14695981039346656037UL;
            HashText(ref hash, recipe.version);
            HashInt(ref hash, recipe.seed);
            HashInt(ref hash, recipe.attemptIndex);
            HashText(ref hash, graph.graphHash);
            for (int i = 0; i < children.Count; i++)
            {
                U4EFormationChildBuild child = children[i];
                HashText(ref hash, child.Domain.Id);
                ulong contentHash = child.Domain.ComputeContentHash();
                HashInt(ref hash, unchecked((int)contentHash));
                HashInt(ref hash, unchecked((int)(contentHash >> 32)));
                HashInt(ref hash, unchecked((int)child.MeshBuild.Mesh.DeterministicHash));
                HashInt(ref hash, unchecked((int)(child.MeshBuild.Mesh.DeterministicHash >> 32)));
                HashInt(ref hash, QuantizeMillimeters(child.Domain.Pose.PositionMeters.X));
                HashInt(ref hash, QuantizeMillimeters(child.Domain.Pose.PositionMeters.Y));
                HashInt(ref hash, QuantizeMillimeters(child.Domain.Pose.PositionMeters.Z));
            }
            return "0x" + hash.ToString("X16", System.Globalization.CultureInfo.InvariantCulture);
        }

        private static void HashText(ref ulong hash, string value)
        {
            foreach (char character in value) HashInt(ref hash, character);
        }

        private static void HashInt(ref ulong hash, int value)
        {
            unchecked { uint bits = (uint)value; for (int shift = 0; shift < 32; shift += 8) hash = (hash ^ (byte)(bits >> shift)) * 1099511628211UL; }
        }

        private static int QuantizeMillimeters(float value)
            => (int)Math.Round(value * 1000d, MidpointRounding.AwayFromZero);

        private static string FormatHash(ulong hash)
            => "0x" + hash.ToString("X16", System.Globalization.CultureInfo.InvariantCulture);

        private static int PositiveModulo(int value, int divisor)
        {
            int remainder = value % divisor;
            return remainder < 0 ? remainder + divisor : remainder;
        }
    }
}
