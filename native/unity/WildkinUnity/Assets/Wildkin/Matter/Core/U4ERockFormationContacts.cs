using System;
using System.Collections.Generic;
using System.Globalization;

namespace Wildkin.Matter
{
    [Serializable]
    public sealed class U4EContactMeasurement
    {
        public string nodeA;
        public string nodeB;
        public float spacingAMeters;
        public float spacingBMeters;
        public float minimumSurfaceGapMeters;
        public int nearContactWitnessCount;
        public int aToBPositiveSampleCount;
        public int bToAPositiveSampleCount;
        public double aToBOverlapEstimateCubicMeters;
        public double bToAOverlapEstimateCubicMeters;
        public bool acceptedContact;
        public string rejectionReason;
        public MatterFloat3 witnessOnAWorldMeters;
        public MatterFloat3 witnessOnBWorldMeters;
        public float fittingAdjustmentMeters;
        public int fittingIterations;

        public bool HasZeroSampledOverlap => aToBPositiveSampleCount == 0 && bToAPositiveSampleCount == 0;
    }

    [Serializable]
    public sealed class U4EContactFitResult
    {
        public bool accepted;
        public string rejectionReason;
        public float adjustmentMeters;
        public int iterations;
        public U4EContactMeasurement measurement;
    }

    /// <summary>Deterministic surface vertices and triangle centroids used as bounded contact probes.</summary>
    public sealed class U4ESurfaceProbeSet
    {
        public MatterFloat3[] LocalPoints { get; }

        public U4ESurfaceProbeSet(MatterMeshData mesh)
        {
            if (mesh == null) throw new ArgumentNullException(nameof(mesh));
            var points = new List<MatterFloat3>(mesh.Vertices.Length + mesh.TriangleCount);
            for (int index = 0; index < mesh.Vertices.Length; index++)
                points.Add(mesh.Vertices[index].PositionMeters);
            for (int index = 0; index < mesh.Indices.Length; index += 3)
            {
                MatterFloat3 a = mesh.Vertices[mesh.Indices[index]].PositionMeters;
                MatterFloat3 b = mesh.Vertices[mesh.Indices[index + 1]].PositionMeters;
                MatterFloat3 c = mesh.Vertices[mesh.Indices[index + 2]].PositionMeters;
                points.Add(new MatterFloat3((a.X + b.X + c.X) / 3f,
                    (a.Y + b.Y + c.Y) / 3f, (a.Z + b.Z + c.Z) / 3f));
            }
            if (points.Count == 0) throw new ArgumentException("A contact probe set requires a non-empty surface mesh.", nameof(mesh));
            LocalPoints = points.ToArray();
        }
    }

    /// <summary>Geometry-derived contact and sampled double-ownership diagnostics. No physics is involved.</summary>
    public static class U4EContactProbe
    {
        public const string OverlapMethod = "For each direction, test positive authoritative sample centers against trilinearly sampled density in the other domain. The volume is a sample-center estimate, not an analytic CSG intersection.";

        public static U4EContactMeasurement MeasureDomains(MatterDomain a, U4ESurfaceProbeSet probesA,
            MatterDomain b, U4ESurfaceProbeSet probesB)
        {
            if (a == null || b == null) throw new ArgumentNullException(a == null ? nameof(a) : nameof(b));
            U4EContactMeasurement result = MeasureDomainSurfaces(a, probesA, b, probesB);
            CountSolidOverlap(a, b, out int aToB, out double aVolume, out int bToA, out double bVolume);
            result.aToBPositiveSampleCount = aToB;
            result.bToAPositiveSampleCount = bToA;
            result.aToBOverlapEstimateCubicMeters = aVolume;
            result.bToAOverlapEstimateCubicMeters = bVolume;
            ApplyContactDecision(result);
            return result;
        }

        public static U4EContactMeasurement MeasureDomainAgainstGrid(MatterDomain domain,
            U4ESurfaceProbeSet domainProbes, IMatterReadOnlyGrid grid, MatterBounds gridBounds,
            MatterDomainPose gridPose, U4ESurfaceProbeSet gridSurfaceProbes)
        {
            if (domain == null || grid == null) throw new ArgumentNullException(domain == null ? nameof(domain) : nameof(grid));
            U4EContactMeasurement result = MeasureDomainGridSurfaces(domain, domainProbes, grid,
                gridBounds, gridPose, gridSurfaceProbes);
            CountSolidOverlap(domain, grid, gridBounds, gridPose,
                out int domainToGrid, out double domainVolume, out int gridToDomain, out double gridVolume);
            result.aToBPositiveSampleCount = domainToGrid;
            result.bToAPositiveSampleCount = gridToDomain;
            result.aToBOverlapEstimateCubicMeters = domainVolume;
            result.bToAOverlapEstimateCubicMeters = gridVolume;
            ApplyContactDecision(result);
            return result;
        }

        public static U4EContactMeasurement MeasureDomainSurfaces(MatterDomain a, U4ESurfaceProbeSet probesA,
            MatterDomain b, U4ESurfaceProbeSet probesB)
        {
            if (a == null || b == null) throw new ArgumentNullException(a == null ? nameof(a) : nameof(b));
            return MeasureSurfacePair(a.Id, a, a.SampleBounds, a.Pose, probesA,
                b.Id, b, b.SampleBounds, b.Pose, probesB);
        }

        public static U4EContactMeasurement MeasureDomainGridSurfaces(MatterDomain domain,
            U4ESurfaceProbeSet domainProbes, IMatterReadOnlyGrid grid, MatterBounds gridBounds,
            MatterDomainPose gridPose, U4ESurfaceProbeSet gridSurfaceProbes)
        {
            if (domain == null || grid == null) throw new ArgumentNullException(domain == null ? nameof(domain) : nameof(grid));
            return MeasureSurfacePair(domain.Id, domain, domain.SampleBounds, domain.Pose, domainProbes,
                U4EFormationConfiguration.TerrainNodeId, grid, gridBounds, gridPose, gridSurfaceProbes);
        }

        public static float SampleDensityAtWorldPoint(IMatterReadOnlyGrid grid, MatterBounds bounds,
            MatterDomainPose pose, MatterFloat3 worldPoint)
        {
            if (grid == null) throw new ArgumentNullException(nameof(grid));
            return TrilinearDensity(grid, bounds, pose.InverseTransformPoint(worldPoint));
        }

        public static void CountSolidOverlap(MatterDomain a, MatterDomain b,
            out int aToBCount, out double aToBVolume, out int bToACount, out double bToAVolume)
        {
            CountDomainSamplesInsideGrid(a, b, b.SampleBounds, b.Pose, out aToBCount, out aToBVolume);
            CountDomainSamplesInsideGrid(b, a, a.SampleBounds, a.Pose, out bToACount, out bToAVolume);
        }

        public static void CountSolidOverlap(MatterDomain domain, IMatterReadOnlyGrid grid,
            MatterBounds gridBounds, MatterDomainPose gridPose,
            out int domainToGridCount, out double domainToGridVolume,
            out int gridToDomainCount, out double gridToDomainVolume)
        {
            CountDomainSamplesInsideGrid(domain, grid, gridBounds, gridPose, out domainToGridCount, out domainToGridVolume);
            CountGridSamplesInsideDomain(grid, gridBounds, gridPose, domain, out gridToDomainCount, out gridToDomainVolume);
        }

        private static U4EContactMeasurement MeasureSurfacePair(string idA, IMatterReadOnlyGrid gridA,
            MatterBounds boundsA, MatterDomainPose poseA, U4ESurfaceProbeSet probesA,
            string idB, IMatterReadOnlyGrid gridB, MatterBounds boundsB, MatterDomainPose poseB,
            U4ESurfaceProbeSet probesB)
        {
            if (probesA == null || probesB == null) throw new ArgumentNullException(probesA == null ? nameof(probesA) : nameof(probesB));
            var result = new U4EContactMeasurement
            {
                nodeA = idA,
                nodeB = idB,
                spacingAMeters = gridA.SampleSpacingMeters,
                spacingBMeters = gridB.SampleSpacingMeters,
                minimumSurfaceGapMeters = float.PositiveInfinity
            };
            MeasureOneDirection(probesA.LocalPoints, poseA, gridB, boundsB, poseB, result, true);
            MeasureOneDirection(probesB.LocalPoints, poseB, gridA, boundsA, poseA, result, false);
            return result;
        }

        private static void MeasureOneDirection(MatterFloat3[] sourcePoints, MatterDomainPose sourcePose,
            IMatterReadOnlyGrid otherGrid, MatterBounds otherBounds, MatterDomainPose otherPose,
            U4EContactMeasurement result, bool sourceIsA)
        {
            for (int index = 0; index < sourcePoints.Length; index++)
            {
                MatterFloat3 sourceWorld = sourcePose.TransformPoint(sourcePoints[index]);
                MatterFloat3 otherLocal = otherPose.InverseTransformPoint(sourceWorld);
                float otherDensity = TrilinearDensity(otherGrid, otherBounds, otherLocal);
                float gap = -otherDensity;
                if (gap < result.minimumSurfaceGapMeters)
                {
                    result.minimumSurfaceGapMeters = gap;
                    MatterFloat3 otherWitness = EstimateSurfaceWitness(sourceWorld, otherLocal,
                        otherDensity, otherGrid, otherBounds, otherPose);
                    if (sourceIsA)
                    {
                        result.witnessOnAWorldMeters = sourceWorld;
                        result.witnessOnBWorldMeters = otherWitness;
                    }
                    else
                    {
                        result.witnessOnAWorldMeters = otherWitness;
                        result.witnessOnBWorldMeters = sourceWorld;
                    }
                }
                if (Math.Abs(gap) <= U4EFormationConfiguration.MaximumContactGapMeters)
                    result.nearContactWitnessCount++;
            }
        }

        private static MatterFloat3 EstimateSurfaceWitness(MatterFloat3 sourceWorld, MatterFloat3 localPoint,
            float density, IMatterReadOnlyGrid grid, MatterBounds bounds, MatterDomainPose pose)
        {
            float step = grid.SampleSpacingMeters * .5f;
            float dx = (TrilinearDensity(grid, bounds, new MatterFloat3(localPoint.X + step, localPoint.Y, localPoint.Z)) -
                        TrilinearDensity(grid, bounds, new MatterFloat3(localPoint.X - step, localPoint.Y, localPoint.Z))) / (2f * step);
            float dy = (TrilinearDensity(grid, bounds, new MatterFloat3(localPoint.X, localPoint.Y + step, localPoint.Z)) -
                        TrilinearDensity(grid, bounds, new MatterFloat3(localPoint.X, localPoint.Y - step, localPoint.Z))) / (2f * step);
            float dz = (TrilinearDensity(grid, bounds, new MatterFloat3(localPoint.X, localPoint.Y, localPoint.Z + step)) -
                        TrilinearDensity(grid, bounds, new MatterFloat3(localPoint.X, localPoint.Y, localPoint.Z - step))) / (2f * step);
            MatterFloat3 localGradient = NormalizeOrDefault(new MatterFloat3(dx, dy, dz));
            MatterFloat3 gradientPoint = pose.TransformPoint(localGradient);
            MatterFloat3 worldGradient = new MatterFloat3(gradientPoint.X - pose.PositionMeters.X,
                gradientPoint.Y - pose.PositionMeters.Y, gradientPoint.Z - pose.PositionMeters.Z);
            return new MatterFloat3(sourceWorld.X - density * worldGradient.X,
                sourceWorld.Y - density * worldGradient.Y, sourceWorld.Z - density * worldGradient.Z);
        }

        private static void CountDomainSamplesInsideGrid(MatterDomain owner, IMatterReadOnlyGrid other,
            MatterBounds otherBounds, MatterDomainPose otherPose, out int overlapCount, out double overlapVolume)
        {
            overlapCount = 0;
            for (int z = owner.SampleBounds.MinInclusive.Z; z < owner.SampleBounds.MaxExclusive.Z; z++)
            for (int y = owner.SampleBounds.MinInclusive.Y; y < owner.SampleBounds.MaxExclusive.Y; y++)
            for (int x = owner.SampleBounds.MinInclusive.X; x < owner.SampleBounds.MaxExclusive.X; x++)
            {
                var address = new MatterSampleAddress(x, y, z);
                if (!owner.ReadSample(address).IsSolid) continue;
                MatterFloat3 world = owner.Pose.TransformPoint(owner.LocalSampleToMeters(address));
                if (SampleDensityAtWorldPoint(other, otherBounds, otherPose, world) > 0f) overlapCount++;
            }
            overlapVolume = overlapCount * Math.Pow(owner.SampleSpacingMeters, 3d);
        }

        private static void CountGridSamplesInsideDomain(IMatterReadOnlyGrid grid, MatterBounds gridBounds,
            MatterDomainPose gridPose, MatterDomain domain, out int overlapCount, out double overlapVolume)
        {
            overlapCount = 0;
            for (int z = gridBounds.MinInclusive.Z; z < gridBounds.MaxExclusive.Z; z++)
            for (int y = gridBounds.MinInclusive.Y; y < gridBounds.MaxExclusive.Y; y++)
            for (int x = gridBounds.MinInclusive.X; x < gridBounds.MaxExclusive.X; x++)
            {
                var address = new MatterSampleAddress(x, y, z);
                if (!grid.ReadSample(address).IsSolid) continue;
                MatterFloat3 world = gridPose.TransformPoint(new MatterFloat3(x * grid.SampleSpacingMeters,
                    y * grid.SampleSpacingMeters, z * grid.SampleSpacingMeters));
                if (SampleDensityAtWorldPoint(domain, world) > 0f) overlapCount++;
            }
            overlapVolume = overlapCount * Math.Pow(grid.SampleSpacingMeters, 3d);
        }

        private static float SampleDensityAtWorldPoint(MatterDomain domain, MatterFloat3 worldPoint)
            => SampleDensityAtWorldPoint(domain, domain.SampleBounds, domain.Pose, worldPoint);

        private static float TrilinearDensity(IMatterReadOnlyGrid grid, MatterBounds bounds, MatterFloat3 local)
        {
            MatterInt3 first = bounds.MinInclusive;
            MatterInt3 last = bounds.MaxExclusive - new MatterInt3(1, 1, 1);
            double spacing = grid.SampleSpacingMeters;
            double minX = first.X * spacing, minY = first.Y * spacing, minZ = first.Z * spacing;
            double maxX = last.X * spacing, maxY = last.Y * spacing, maxZ = last.Z * spacing;
            double outsideX = local.X < minX ? minX - local.X : local.X > maxX ? local.X - maxX : 0d;
            double outsideY = local.Y < minY ? minY - local.Y : local.Y > maxY ? local.Y - maxY : 0d;
            double outsideZ = local.Z < minZ ? minZ - local.Z : local.Z > maxZ ? local.Z - maxZ : 0d;
            if (outsideX > 0d || outsideY > 0d || outsideZ > 0d)
                return (float)(-Math.Sqrt(outsideX * outsideX + outsideY * outsideY + outsideZ * outsideZ) - spacing);

            double x = local.X / spacing, y = local.Y / spacing, z = local.Z / spacing;
            int ix = (int)Math.Floor(x), iy = (int)Math.Floor(y), iz = (int)Math.Floor(z);
            double tx = x - ix, ty = y - iy, tz = z - iz;
            double density = 0d;
            for (int dz = 0; dz <= 1; dz++)
            for (int dy = 0; dy <= 1; dy++)
            for (int dx = 0; dx <= 1; dx++)
            {
                double weight = (dx == 0 ? 1d - tx : tx) * (dy == 0 ? 1d - ty : ty) * (dz == 0 ? 1d - tz : tz);
                density += grid.ReadSample(new MatterSampleAddress(ix + dx, iy + dy, iz + dz)).Density * weight;
            }
            return (float)density;
        }

        private static void ApplyContactDecision(U4EContactMeasurement measurement)
        {
            if (!measurement.HasZeroSampledOverlap)
                measurement.rejectionReason = "Positive-solid sample-center overlap was detected in at least one direction.";
            else if (!Finite(measurement.minimumSurfaceGapMeters))
                measurement.rejectionReason = "No finite symmetric surface separation measurement was available.";
            else if (measurement.minimumSurfaceGapMeters > U4EFormationConfiguration.MaximumContactGapMeters)
                measurement.rejectionReason = "Measured surface gap exceeds the fixed U4E contact tolerance.";
            else if (measurement.minimumSurfaceGapMeters < -U4EFormationConfiguration.MaximumContactPenetrationMeters)
                measurement.rejectionReason = "Surface probes report penetration beyond the fixed U4E tolerance.";
            else if (measurement.nearContactWitnessCount < U4EFormationConfiguration.MinimumContactWitnesses)
                measurement.rejectionReason = "Too few symmetric surface probes witness the near-contact band.";
            else
            {
                measurement.acceptedContact = true;
                measurement.rejectionReason = string.Empty;
                return;
            }
            measurement.acceptedContact = false;
        }

        private static MatterFloat3 NormalizeOrDefault(MatterFloat3 value)
        {
            double length = Math.Sqrt((double)value.X * value.X + (double)value.Y * value.Y + (double)value.Z * value.Z);
            return length < 1e-9 ? default : new MatterFloat3((float)(value.X / length), (float)(value.Y / length), (float)(value.Z / length));
        }

        private static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
    }

    /// <summary>Moves one child along a prescribed direction to a geometry-measured gap; no physics is used.</summary>
    public static class U4EContactFitter
    {
        public static U4EContactFitResult FitDomainToDomain(MatterDomain moving, U4ESurfaceProbeSet movingProbes,
            MatterDomain anchor, U4ESurfaceProbeSet anchorProbes,
            MatterFloat3 directionTowardContact,
            float maximumAdjustmentMeters = U4EFormationConfiguration.MaximumFitAdjustmentMeters)
        {
            if (moving == null || anchor == null) throw new ArgumentNullException(moving == null ? nameof(moving) : nameof(anchor));
            return Fit(moving, directionTowardContact, maximumAdjustmentMeters,
                () => U4EContactProbe.MeasureDomainSurfaces(moving, movingProbes, anchor, anchorProbes),
                () => U4EContactProbe.MeasureDomains(moving, movingProbes, anchor, anchorProbes));
        }

        public static U4EContactFitResult FitDomainToGrid(MatterDomain moving, U4ESurfaceProbeSet movingProbes,
            IMatterReadOnlyGrid anchor, MatterBounds anchorBounds, MatterDomainPose anchorPose,
            U4ESurfaceProbeSet anchorProbes, MatterFloat3 directionTowardContact,
            float maximumAdjustmentMeters = U4EFormationConfiguration.MaximumFitAdjustmentMeters)
        {
            if (moving == null || anchor == null) throw new ArgumentNullException(moving == null ? nameof(moving) : nameof(anchor));
            return Fit(moving, directionTowardContact, maximumAdjustmentMeters,
                () => U4EContactProbe.MeasureDomainGridSurfaces(moving, movingProbes, anchor,
                    anchorBounds, anchorPose, anchorProbes),
                () => U4EContactProbe.MeasureDomainAgainstGrid(moving, movingProbes, anchor,
                    anchorBounds, anchorPose, anchorProbes));
        }

        private static U4EContactFitResult Fit(MatterDomain moving, MatterFloat3 directionTowardContact,
            float maximumAdjustmentMeters, Func<U4EContactMeasurement> surfaceMeasure,
            Func<U4EContactMeasurement> fullMeasure)
        {
            if (!Finite(maximumAdjustmentMeters) || maximumAdjustmentMeters <= 0f)
                throw new ArgumentOutOfRangeException(nameof(maximumAdjustmentMeters));
            MatterFloat3 direction = Normalize(directionTowardContact);
            MatterDomainPose original = moving.Pose;
            float adjustment = 0f;
            int iterations = 0;
            for (; iterations < U4EFormationConfiguration.MaximumFitIterations; iterations++)
            {
                moving.SetPose(Offset(original, direction, adjustment));
                U4EContactMeasurement surface = surfaceMeasure();
                float error = surface.minimumSurfaceGapMeters - U4EFormationConfiguration.TargetContactGapMeters;
                if (!Finite(error)) break;
                if (Math.Abs(error) <= U4EFormationConfiguration.ContactPositionQuantumMeters * 2f &&
                    surface.nearContactWitnessCount >= U4EFormationConfiguration.MinimumContactWitnesses) break;
                float maxStep = Math.Max(.20f, maximumAdjustmentMeters / 4f);
                adjustment = Quantize(adjustment + Clamp(error, -maxStep, maxStep));
                if (Math.Abs(adjustment) > maximumAdjustmentMeters) break;
            }
            moving.SetPose(Offset(original, direction, adjustment));
            U4EContactMeasurement measurement = fullMeasure();
            measurement.fittingAdjustmentMeters = adjustment;
            measurement.fittingIterations = Math.Min(iterations + 1, U4EFormationConfiguration.MaximumFitIterations);
            if (!measurement.acceptedContact) moving.SetPose(original);
            return new U4EContactFitResult
            {
                accepted = measurement.acceptedContact,
                rejectionReason = measurement.rejectionReason,
                adjustmentMeters = adjustment,
                iterations = measurement.fittingIterations,
                measurement = measurement
            };
        }

        public static MatterDomainPose Offset(MatterDomainPose pose, MatterFloat3 normalizedDirection, float distance)
            => new MatterDomainPose(new MatterFloat3(
                Quantize(pose.PositionMeters.X + normalizedDirection.X * distance),
                Quantize(pose.PositionMeters.Y + normalizedDirection.Y * distance),
                Quantize(pose.PositionMeters.Z + normalizedDirection.Z * distance)),
                pose.RotationX, pose.RotationY, pose.RotationZ, pose.RotationW);

        public static MatterFloat3 Normalize(MatterFloat3 value)
        {
            double length = Math.Sqrt((double)value.X * value.X + (double)value.Y * value.Y + (double)value.Z * value.Z);
            if (double.IsNaN(length) || double.IsInfinity(length) || length < 1e-9)
                throw new ArgumentException("A contact fitting direction must be finite and nonzero.", nameof(value));
            return new MatterFloat3((float)(value.X / length), (float)(value.Y / length), (float)(value.Z / length));
        }

        private static float Clamp(float value, float minimum, float maximum) => Math.Max(minimum, Math.Min(maximum, value));
        private static float Quantize(float value)
            => (float)(Math.Round(value / U4EFormationConfiguration.ContactPositionQuantumMeters, MidpointRounding.AwayFromZero) * U4EFormationConfiguration.ContactPositionQuantumMeters);
        private static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
    }

    [Serializable]
    public sealed class U4EContactGraph
    {
        public string[] nodeIds = Array.Empty<string>();
        public U4EContactMeasurement[] measurements = Array.Empty<U4EContactMeasurement>();
        public string[] edgeKeys = Array.Empty<string>();
        public string graphHash;
        public bool allChildrenConnectedToTerrain;
        public int connectedNodeCount;
        public int possiblePairCount;
        public int acceptedEdgeCount;

        public static U4EContactGraph Build(IReadOnlyList<string> childIds,
            IReadOnlyList<U4EContactMeasurement> terrainMeasurements,
            IReadOnlyList<U4EContactMeasurement> domainMeasurements)
        {
            if (childIds == null || terrainMeasurements == null || domainMeasurements == null)
                throw new ArgumentNullException(childIds == null ? nameof(childIds) : terrainMeasurements == null ? nameof(terrainMeasurements) : nameof(domainMeasurements));
            var nodes = new List<string>(childIds.Count + 1) { U4EFormationConfiguration.TerrainNodeId };
            for (int i = 0; i < childIds.Count; i++) nodes.Add(childIds[i]);
            nodes.Sort(StringComparer.Ordinal);
            var measurements = new List<U4EContactMeasurement>(terrainMeasurements.Count + domainMeasurements.Count);
            measurements.AddRange(terrainMeasurements);
            measurements.AddRange(domainMeasurements);
            measurements.Sort(CompareMeasurements);
            var adjacency = new Dictionary<string, List<string>>(StringComparer.Ordinal);
            foreach (string node in nodes) adjacency[node] = new List<string>();
            var edges = new List<string>();
            foreach (U4EContactMeasurement measurement in measurements)
            {
                if (!measurement.acceptedContact) continue;
                adjacency[measurement.nodeA].Add(measurement.nodeB);
                adjacency[measurement.nodeB].Add(measurement.nodeA);
                edges.Add(PairKey(measurement.nodeA, measurement.nodeB));
            }
            edges.Sort(StringComparer.Ordinal);
            var visited = new HashSet<string>(StringComparer.Ordinal);
            var pending = new Queue<string>();
            pending.Enqueue(U4EFormationConfiguration.TerrainNodeId);
            while (pending.Count > 0)
            {
                string node = pending.Dequeue();
                if (!visited.Add(node)) continue;
                foreach (string neighbor in adjacency[node]) if (!visited.Contains(neighbor)) pending.Enqueue(neighbor);
            }
            ulong hash = 14695981039346656037UL;
            foreach (string node in nodes) HashText(ref hash, node);
            foreach (U4EContactMeasurement measurement in measurements)
            {
                HashText(ref hash, PairKey(measurement.nodeA, measurement.nodeB));
                HashInt(ref hash, QuantizeMillimeters(measurement.minimumSurfaceGapMeters));
                HashInt(ref hash, measurement.nearContactWitnessCount);
                HashInt(ref hash, measurement.aToBPositiveSampleCount);
                HashInt(ref hash, measurement.bToAPositiveSampleCount);
                HashInt(ref hash, measurement.acceptedContact ? 1 : 0);
            }
            return new U4EContactGraph
            {
                nodeIds = nodes.ToArray(),
                measurements = measurements.ToArray(),
                edgeKeys = edges.ToArray(),
                graphHash = "0x" + hash.ToString("X16", CultureInfo.InvariantCulture),
                allChildrenConnectedToTerrain = visited.Count == nodes.Count,
                connectedNodeCount = visited.Count,
                possiblePairCount = measurements.Count,
                acceptedEdgeCount = edges.Count
            };
        }

        private static int CompareMeasurements(U4EContactMeasurement a, U4EContactMeasurement b)
            => StringComparer.Ordinal.Compare(PairKey(a.nodeA, a.nodeB), PairKey(b.nodeA, b.nodeB));

        public static string PairKey(string a, string b)
            => StringComparer.Ordinal.Compare(a, b) <= 0 ? a + "|" + b : b + "|" + a;

        private static int QuantizeMillimeters(float value)
            => float.IsInfinity(value) || float.IsNaN(value) ? int.MaxValue : (int)Math.Round(value * 1000d, MidpointRounding.AwayFromZero);
        private static void HashText(ref ulong hash, string value)
        {
            foreach (char c in value) HashInt(ref hash, c);
        }
        private static void HashInt(ref ulong hash, int value)
        {
            unchecked { uint bits = (uint)value; for (int shift = 0; shift < 32; shift += 8) hash = (hash ^ (byte)(bits >> shift)) * 1099511628211UL; }
        }
    }
}
