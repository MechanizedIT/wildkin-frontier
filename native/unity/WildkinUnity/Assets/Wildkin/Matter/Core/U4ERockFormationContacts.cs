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
        public U4EDirectionalContactPatchMeasurement directionalPatch;

        public bool HasZeroSampledOverlap => aToBPositiveSampleCount == 0 && bToAPositiveSampleCount == 0;
    }

    public enum U4EContactFitMode : byte
    {
        GlobalMin25mm,
        DirectionalPatch0mm,
        DirectionalPatchMinus5mm
    }

    [Serializable]
    public struct U4EContactWitness
    {
        public float x;
        public float y;
        public float z;
        public float signedGapMeters;
        public float triangleAreaSquareMeters;
        public bool acceptedContactBand;
    }

    [Serializable]
    public sealed class U4EDirectionalContactPatchMeasurement
    {
        public string movingDomainId;
        public string anchorId;
        public float directionX;
        public float directionY;
        public float directionZ;
        public float targetGapMeters;
        public float contactBandHalfWidthMeters;
        public float minimumNormalAlignmentDot;
        public bool hasSupportFacingTriangles;
        public bool hasAcceptedPatch;
        public int supportFacingTriangleCount;
        public int acceptedPatchTriangleCount;
        public float supportFacingSurfaceAreaSquareMeters;
        public float acceptedPatchAreaSquareMeters;
        public float minimumDirectionalGapMeters;
        public float areaWeightedP10DirectionalGapMeters;
        public float areaWeightedMedianDirectionalGapMeters;
        public float areaWeightedP90DirectionalGapMeters;
        public float contactPatchAreaRatio;
        public float witnessSpanAMeters;
        public float witnessSpanBMeters;
        public float contactPatchDiagonalMeters;
        public bool degeneratePointCluster;
        public string weakPatchReason;
        public U4EContactWitness[] supportFacingWitnesses = Array.Empty<U4EContactWitness>();
        public U4EContactWitness[] contactWitnesses = Array.Empty<U4EContactWitness>();
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

    /// <summary>Deterministic global-min points and oriented, area-weighted triangle probes for U4E contacts.</summary>
    public sealed class U4ESurfaceProbeSet
    {
        public MatterFloat3[] LocalPoints { get; }
        public U4EDirectionalSurfaceProbe[] DirectionalTriangles { get; }

        public U4ESurfaceProbeSet(MatterMeshData mesh)
            : this(ExtractPositions(mesh), ExtractNormals(mesh), mesh == null ? null : mesh.Indices)
        {
        }

        /// <summary>
        /// Creates probes from a triangle mesh. This engine-light overload also allows small
        /// deterministic geometric fixtures to exercise the contact metric without Unity objects.
        /// </summary>
        public U4ESurfaceProbeSet(MatterFloat3[] positions, MatterFloat3[] vertexNormals, int[] indices)
        {
            if (positions == null) throw new ArgumentNullException(nameof(positions));
            if (vertexNormals == null) throw new ArgumentNullException(nameof(vertexNormals));
            if (indices == null) throw new ArgumentNullException(nameof(indices));
            if (positions.Length != vertexNormals.Length)
                throw new ArgumentException("Contact probe positions and normals must have the same length.");
            if (indices.Length == 0 || indices.Length % 3 != 0)
                throw new ArgumentException("A contact probe mesh requires a non-empty triangle index list.", nameof(indices));

            var points = new List<MatterFloat3>(positions.Length + indices.Length / 3);
            for (int index = 0; index < positions.Length; index++) points.Add(positions[index]);
            var triangles = new List<U4EDirectionalSurfaceProbe>(indices.Length / 3);
            for (int index = 0; index < indices.Length; index += 3)
            {
                int ia = indices[index], ib = indices[index + 1], ic = indices[index + 2];
                if (ia < 0 || ia >= positions.Length || ib < 0 || ib >= positions.Length || ic < 0 || ic >= positions.Length)
                    throw new ArgumentOutOfRangeException(nameof(indices), "Contact probe triangle index is outside the vertex array.");
                MatterFloat3 a = positions[ia];
                MatterFloat3 b = positions[ib];
                MatterFloat3 c = positions[ic];
                points.Add(new MatterFloat3((a.X + b.X + c.X) / 3f,
                    (a.Y + b.Y + c.Y) / 3f, (a.Z + b.Z + c.Z) / 3f));
                MatterFloat3 edgeAB = Subtract(b, a);
                MatterFloat3 edgeAC = Subtract(c, a);
                MatterFloat3 cross = Cross(edgeAB, edgeAC);
                double crossLength = Length(cross);
                if (crossLength <= 1e-12) continue;
                MatterFloat3 faceNormal = Scale(cross, (float)(1d / crossLength));
                MatterFloat3 averageVertexNormal = Add(Add(vertexNormals[ia], vertexNormals[ib]), vertexNormals[ic]);
                if (Dot(faceNormal, averageVertexNormal) < 0f) faceNormal = Scale(faceNormal, -1f);
                triangles.Add(new U4EDirectionalSurfaceProbe(
                    new MatterFloat3((a.X + b.X + c.X) / 3f,
                        (a.Y + b.Y + c.Y) / 3f, (a.Z + b.Z + c.Z) / 3f),
                    faceNormal, (float)(crossLength * .5d), index / 3));
            }
            if (points.Count == 0) throw new ArgumentException("A contact probe set requires a non-empty surface mesh.", nameof(positions));
            LocalPoints = points.ToArray();
            DirectionalTriangles = triangles.ToArray();
        }

        private static MatterFloat3[] ExtractPositions(MatterMeshData mesh)
        {
            if (mesh == null) throw new ArgumentNullException(nameof(mesh));
            var positions = new MatterFloat3[mesh.Vertices.Length];
            for (int index = 0; index < positions.Length; index++) positions[index] = mesh.Vertices[index].PositionMeters;
            return positions;
        }

        private static MatterFloat3[] ExtractNormals(MatterMeshData mesh)
        {
            if (mesh == null) throw new ArgumentNullException(nameof(mesh));
            var normals = new MatterFloat3[mesh.Vertices.Length];
            for (int index = 0; index < normals.Length; index++) normals[index] = mesh.Vertices[index].Normal;
            return normals;
        }

        private static MatterFloat3 Subtract(MatterFloat3 a, MatterFloat3 b)
            => new MatterFloat3(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
        private static MatterFloat3 Add(MatterFloat3 a, MatterFloat3 b)
            => new MatterFloat3(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
        private static MatterFloat3 Scale(MatterFloat3 value, float scale)
            => new MatterFloat3(value.X * scale, value.Y * scale, value.Z * scale);
        private static MatterFloat3 Cross(MatterFloat3 a, MatterFloat3 b)
            => new MatterFloat3(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);
        private static float Dot(MatterFloat3 a, MatterFloat3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;
        private static double Length(MatterFloat3 value)
            => Math.Sqrt((double)value.X * value.X + (double)value.Y * value.Y + (double)value.Z * value.Z);
    }

    public readonly struct U4EDirectionalSurfaceProbe
    {
        public readonly MatterFloat3 Centroid;
        public readonly MatterFloat3 OutwardNormal;
        public readonly float AreaSquareMeters;
        public readonly int TriangleIndex;

        public U4EDirectionalSurfaceProbe(MatterFloat3 centroid, MatterFloat3 outwardNormal,
            float areaSquareMeters, int triangleIndex)
        {
            Centroid = centroid;
            OutwardNormal = outwardNormal;
            AreaSquareMeters = areaSquareMeters;
            TriangleIndex = triangleIndex;
        }
    }

    /// <summary>Geometry-derived contact and sampled double-ownership diagnostics. No physics is involved.</summary>
    public static class U4EContactProbe
    {
        public const string OverlapMethod = "For each direction, test positive authoritative sample centers against trilinearly sampled density in the other domain. The volume is a sample-center estimate, not an analytic CSG intersection.";
        public const float DirectionalNormalAlignmentMinDot = .35f;
        public const float DirectionalContactBandHalfWidthMeters = .025f;

        private readonly struct GapAreaSample
        {
            public readonly float Gap;
            public readonly float Area;
            public GapAreaSample(float gap, float area) { Gap = gap; Area = area; }
        }

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

        public static U4EDirectionalContactPatchMeasurement MeasureDirectionalPatch(MatterDomain moving,
            U4ESurfaceProbeSet movingProbes, MatterDomain anchor, MatterFloat3 directionTowardAnchor,
            float targetGapMeters)
        {
            if (anchor == null) throw new ArgumentNullException(nameof(anchor));
            return MeasureDirectionalPatch(moving, movingProbes, anchor.Id, anchor, anchor.SampleBounds,
                anchor.Pose, directionTowardAnchor, targetGapMeters, true);
        }

        public static U4EDirectionalContactPatchMeasurement MeasureDirectionalPatch(MatterDomain moving,
            U4ESurfaceProbeSet movingProbes, IMatterReadOnlyGrid anchor, MatterBounds anchorBounds,
            MatterDomainPose anchorPose, MatterFloat3 directionTowardAnchor, float targetGapMeters)
            => MeasureDirectionalPatch(moving, movingProbes, U4EFormationConfiguration.TerrainNodeId,
                anchor, anchorBounds, anchorPose, directionTowardAnchor, targetGapMeters, true);

        internal static U4EDirectionalContactPatchMeasurement MeasureDirectionalPatch(MatterDomain moving,
            U4ESurfaceProbeSet movingProbes, IMatterReadOnlyGrid anchor, MatterBounds anchorBounds,
            MatterDomainPose anchorPose, MatterFloat3 directionTowardAnchor, float targetGapMeters,
            bool captureWitnesses)
            => MeasureDirectionalPatch(moving, movingProbes, U4EFormationConfiguration.TerrainNodeId,
                anchor, anchorBounds, anchorPose, directionTowardAnchor, targetGapMeters, captureWitnesses);

        internal static U4EDirectionalContactPatchMeasurement MeasureDirectionalPatch(MatterDomain moving,
            U4ESurfaceProbeSet movingProbes, MatterDomain anchor, MatterFloat3 directionTowardAnchor,
            float targetGapMeters, bool captureWitnesses)
        {
            if (anchor == null) throw new ArgumentNullException(nameof(anchor));
            return MeasureDirectionalPatch(moving, movingProbes, anchor.Id, anchor, anchor.SampleBounds,
                anchor.Pose, directionTowardAnchor, targetGapMeters, captureWitnesses);
        }

        private static U4EDirectionalContactPatchMeasurement MeasureDirectionalPatch(MatterDomain moving,
            U4ESurfaceProbeSet movingProbes, string anchorId, IMatterReadOnlyGrid anchor,
            MatterBounds anchorBounds, MatterDomainPose anchorPose, MatterFloat3 directionTowardAnchor,
            float targetGapMeters, bool captureWitnesses)
        {
            if (moving == null || movingProbes == null || anchor == null)
                throw new ArgumentNullException(moving == null ? nameof(moving) : movingProbes == null ? nameof(movingProbes) : nameof(anchor));
            MatterFloat3 direction = U4EContactFitter.Normalize(directionTowardAnchor);
            MatterFloat3 axisA = PerpendicularAxis(direction);
            MatterFloat3 axisB = Cross(direction, axisA);
            var gaps = new List<GapAreaSample>();
            var supportWitnesses = captureWitnesses ? new List<U4EContactWitness>() : null;
            var contactWitnesses = captureWitnesses ? new List<U4EContactWitness>() : null;
            double supportArea = 0d;
            double contactArea = 0d;
            float minimumGap = float.PositiveInfinity;
            int supportCount = 0;
            int contactCount = 0;
            float minA = float.PositiveInfinity, maxA = float.NegativeInfinity;
            float minB = float.PositiveInfinity, maxB = float.NegativeInfinity;

            U4EDirectionalSurfaceProbe[] triangles = movingProbes.DirectionalTriangles;
            for (int index = 0; index < triangles.Length; index++)
            {
                U4EDirectionalSurfaceProbe triangle = triangles[index];
                MatterFloat3 worldNormal = TransformDirection(moving.Pose, triangle.OutwardNormal);
                if (Dot(worldNormal, direction) < DirectionalNormalAlignmentMinDot) continue;

                MatterFloat3 worldPoint = moving.Pose.TransformPoint(triangle.Centroid);
                MatterFloat3 anchorLocal = anchorPose.InverseTransformPoint(worldPoint);
                float gap = -TrilinearDensity(anchor, anchorBounds, anchorLocal);
                bool inBand = Math.Abs(gap - targetGapMeters) <= DirectionalContactBandHalfWidthMeters;
                supportArea += triangle.AreaSquareMeters;
                supportCount++;
                if (gap < minimumGap) minimumGap = gap;
                gaps.Add(new GapAreaSample(gap, triangle.AreaSquareMeters));
                var witness = new U4EContactWitness
                {
                    x = worldPoint.X,
                    y = worldPoint.Y,
                    z = worldPoint.Z,
                    signedGapMeters = gap,
                    triangleAreaSquareMeters = triangle.AreaSquareMeters,
                    acceptedContactBand = inBand
                };
                if (captureWitnesses) supportWitnesses.Add(witness);
                if (!inBand) continue;
                contactArea += triangle.AreaSquareMeters;
                contactCount++;
                float projectedA = Dot(worldPoint, axisA), projectedB = Dot(worldPoint, axisB);
                minA = Math.Min(minA, projectedA); maxA = Math.Max(maxA, projectedA);
                minB = Math.Min(minB, projectedB); maxB = Math.Max(maxB, projectedB);
                if (captureWitnesses) contactWitnesses.Add(witness);
            }

            float spanA = contactCount == 0 ? 0f : Math.Max(0f, maxA - minA);
            float spanB = contactCount == 0 ? 0f : Math.Max(0f, maxB - minB);
            float diagonal = (float)Math.Sqrt((double)spanA * spanA + (double)spanB * spanB);
            var result = new U4EDirectionalContactPatchMeasurement
            {
                movingDomainId = moving.Id,
                anchorId = anchorId,
                directionX = direction.X,
                directionY = direction.Y,
                directionZ = direction.Z,
                targetGapMeters = targetGapMeters,
                contactBandHalfWidthMeters = DirectionalContactBandHalfWidthMeters,
                minimumNormalAlignmentDot = DirectionalNormalAlignmentMinDot,
                hasSupportFacingTriangles = supportCount > 0,
                hasAcceptedPatch = contactCount > 0,
                supportFacingTriangleCount = supportCount,
                acceptedPatchTriangleCount = contactCount,
                supportFacingSurfaceAreaSquareMeters = (float)supportArea,
                acceptedPatchAreaSquareMeters = (float)contactArea,
                minimumDirectionalGapMeters = float.IsInfinity(minimumGap) ? 0f : minimumGap,
                areaWeightedP10DirectionalGapMeters = WeightedQuantile(gaps, supportArea, .10d),
                areaWeightedMedianDirectionalGapMeters = WeightedQuantile(gaps, supportArea, .50d),
                areaWeightedP90DirectionalGapMeters = WeightedQuantile(gaps, supportArea, .90d),
                contactPatchAreaRatio = supportArea <= 1e-12 ? 0f : (float)(contactArea / supportArea),
                witnessSpanAMeters = spanA,
                witnessSpanBMeters = spanB,
                contactPatchDiagonalMeters = diagonal,
                degeneratePointCluster = contactCount > 0 && diagonal <= 1e-4f,
                weakPatchReason = supportCount == 0 ? "No triangle met the fixed support-facing normal threshold." :
                    contactCount == 0 ? "No support-facing triangle centroid entered the fixed directional contact band." :
                    diagonal <= 1e-4f ? "Accepted contact witnesses have essentially zero projected spread." : string.Empty,
                supportFacingWitnesses = captureWitnesses ? supportWitnesses.ToArray() : Array.Empty<U4EContactWitness>(),
                contactWitnesses = captureWitnesses ? contactWitnesses.ToArray() : Array.Empty<U4EContactWitness>()
            };
            return result;
        }

        private static MatterFloat3 TransformDirection(MatterDomainPose pose, MatterFloat3 localDirection)
        {
            MatterFloat3 worldPoint = pose.TransformPoint(localDirection);
            return U4EContactFitter.Normalize(new MatterFloat3(
                worldPoint.X - pose.PositionMeters.X,
                worldPoint.Y - pose.PositionMeters.Y,
                worldPoint.Z - pose.PositionMeters.Z));
        }

        private static MatterFloat3 PerpendicularAxis(MatterFloat3 direction)
        {
            MatterFloat3 reference;
            float absX = Math.Abs(direction.X), absY = Math.Abs(direction.Y), absZ = Math.Abs(direction.Z);
            if (absX <= absY && absX <= absZ) reference = new MatterFloat3(1f, 0f, 0f);
            else if (absY <= absZ) reference = new MatterFloat3(0f, 1f, 0f);
            else reference = new MatterFloat3(0f, 0f, 1f);
            return U4EContactFitter.Normalize(Cross(direction, reference));
        }

        private static float WeightedQuantile(List<GapAreaSample> values, double totalArea, double quantile)
        {
            if (values == null || values.Count == 0 || totalArea <= 1e-12) return 0f;
            values.Sort((left, right) => left.Gap.CompareTo(right.Gap));
            double targetArea = totalArea * quantile;
            double accumulated = 0d;
            for (int index = 0; index < values.Count; index++)
            {
                accumulated += values[index].Area;
                if (accumulated + 1e-12 >= targetArea) return values[index].Gap;
            }
            return values[values.Count - 1].Gap;
        }

        private static MatterFloat3 Cross(MatterFloat3 a, MatterFloat3 b)
            => new MatterFloat3(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);
        private static float Dot(MatterFloat3 a, MatterFloat3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;

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
        private sealed class DirectionalCandidate
        {
            public float AdjustmentMeters;
            public U4EContactMeasurement Measurement;
            public U4EDirectionalContactPatchMeasurement Patch;
        }

        private const float DirectionalCoarseSearchStepMeters = .25f;
        private const float DirectionalFineSearchStepMeters = .025f;

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

        public static U4EContactFitResult FitDirectionalPatchDomainToDomain(MatterDomain moving,
            U4ESurfaceProbeSet movingProbes, MatterDomain anchor, U4ESurfaceProbeSet anchorProbes,
            MatterFloat3 directionTowardAnchor, float targetGapMeters,
            float maximumAdjustmentMeters = U4EFormationConfiguration.MaximumFitAdjustmentMeters)
        {
            if (moving == null || anchor == null) throw new ArgumentNullException(moving == null ? nameof(moving) : nameof(anchor));
            MatterDomainPose originalPose = moving.Pose;
            U4EContactFitResult globalBracket = FitDomainToDomain(moving, movingProbes, anchor, anchorProbes,
                directionTowardAnchor, maximumAdjustmentMeters);
            moving.SetPose(originalPose);
            return FitDirectionalPatch(moving, directionTowardAnchor, targetGapMeters, maximumAdjustmentMeters,
                globalBracket.accepted ? globalBracket.adjustmentMeters : 0f,
                capturePatch: () => U4EContactProbe.MeasureDirectionalPatch(moving, movingProbes, anchor,
                    directionTowardAnchor, targetGapMeters, false),
                captureFinalPatch: () => U4EContactProbe.MeasureDirectionalPatch(moving, movingProbes, anchor,
                    directionTowardAnchor, targetGapMeters, true),
                fullMeasure: () => U4EContactProbe.MeasureDomains(moving, movingProbes, anchor, anchorProbes));
        }

        public static U4EContactFitResult FitDirectionalPatchDomainToGrid(MatterDomain moving,
            U4ESurfaceProbeSet movingProbes, IMatterReadOnlyGrid anchor, MatterBounds anchorBounds,
            MatterDomainPose anchorPose, U4ESurfaceProbeSet anchorProbes,
            MatterFloat3 directionTowardAnchor, float targetGapMeters,
            float maximumAdjustmentMeters = U4EFormationConfiguration.MaximumFitAdjustmentMeters)
        {
            if (moving == null || anchor == null) throw new ArgumentNullException(moving == null ? nameof(moving) : nameof(anchor));
            MatterDomainPose originalPose = moving.Pose;
            U4EContactFitResult globalBracket = FitDomainToGrid(moving, movingProbes, anchor,
                anchorBounds, anchorPose, anchorProbes, directionTowardAnchor, maximumAdjustmentMeters);
            moving.SetPose(originalPose);
            return FitDirectionalPatch(moving, directionTowardAnchor, targetGapMeters, maximumAdjustmentMeters,
                globalBracket.accepted ? globalBracket.adjustmentMeters : 0f,
                capturePatch: () => U4EContactProbe.MeasureDirectionalPatch(moving, movingProbes, anchor,
                    anchorBounds, anchorPose, directionTowardAnchor, targetGapMeters, false),
                captureFinalPatch: () => U4EContactProbe.MeasureDirectionalPatch(moving, movingProbes, anchor,
                    anchorBounds, anchorPose, directionTowardAnchor, targetGapMeters, true),
                fullMeasure: () => U4EContactProbe.MeasureDomainAgainstGrid(moving, movingProbes, anchor,
                    anchorBounds, anchorPose, anchorProbes));
        }

        private static U4EContactFitResult FitDirectionalPatch(MatterDomain moving,
            MatterFloat3 directionTowardAnchor, float targetGapMeters, float maximumAdjustmentMeters,
            float preferredRefinementAdjustment,
            Func<U4EDirectionalContactPatchMeasurement> capturePatch,
            Func<U4EDirectionalContactPatchMeasurement> captureFinalPatch,
            Func<U4EContactMeasurement> fullMeasure)
        {
            if (!Finite(maximumAdjustmentMeters) || maximumAdjustmentMeters <= 0f)
                throw new ArgumentOutOfRangeException(nameof(maximumAdjustmentMeters));
            if (!Finite(targetGapMeters)) throw new ArgumentOutOfRangeException(nameof(targetGapMeters));
            MatterFloat3 direction = Normalize(directionTowardAnchor);
            MatterDomainPose original = moving.Pose;
            DirectionalCandidate best = null;
            int evaluations = 0;
            var evaluatedAdjustments = new HashSet<int>();
            float refinementAnchorAdjustment = 0f;
            float refinementAnchorError = float.PositiveInfinity;
            float diagnosticAdjustment = 0f;
            float diagnosticError = float.PositiveInfinity;
            string diagnosticRejection = "No directional candidate met the fixed contact and overlap constraints.";

            Action<float> evaluate = adjustment =>
            {
                float bounded = Clamp(adjustment, -maximumAdjustmentMeters, maximumAdjustmentMeters);
                int quantizedMillimeters = (int)Math.Round(bounded / U4EFormationConfiguration.ContactPositionQuantumMeters,
                    MidpointRounding.AwayFromZero);
                if (!evaluatedAdjustments.Add(quantizedMillimeters)) return;
                bounded = quantizedMillimeters * U4EFormationConfiguration.ContactPositionQuantumMeters;
                moving.SetPose(Offset(original, direction, bounded));
                U4EDirectionalContactPatchMeasurement patch = capturePatch();
                U4EContactMeasurement measurement = fullMeasure();
                measurement.directionalPatch = patch;
                measurement.fittingAdjustmentMeters = bounded;
                evaluations++;

                float searchGap = patch.hasSupportFacingTriangles
                    ? patch.areaWeightedMedianDirectionalGapMeters
                    : measurement.minimumSurfaceGapMeters;
                float searchError = Math.Abs(searchGap - targetGapMeters);
                if (Finite(searchError) && searchError < refinementAnchorError)
                {
                    refinementAnchorError = searchError;
                    refinementAnchorAdjustment = bounded;
                }

                string rejection = !measurement.HasZeroSampledOverlap
                    ? "Candidate has bidirectional positive-solid sample-center overlap."
                    : !measurement.acceptedContact
                        ? measurement.rejectionReason
                        : !patch.hasSupportFacingTriangles || !patch.hasAcceptedPatch
                            ? patch.weakPatchReason
                            : patch.minimumDirectionalGapMeters < -U4EFormationConfiguration.MaximumContactPenetrationMeters
                                ? "Directional surface penetration exceeds the fixed 12.5 mm limit."
                                : string.Empty;
                if (!string.IsNullOrEmpty(rejection))
                {
                    if (searchError < diagnosticError)
                    {
                        diagnosticError = searchError;
                        diagnosticAdjustment = bounded;
                        diagnosticRejection = rejection;
                    }
                    return;
                }

                var candidate = new DirectionalCandidate
                {
                    AdjustmentMeters = bounded,
                    Measurement = measurement,
                    Patch = patch
                };
                if (best == null || IsBetterDirectionalCandidate(candidate, best)) best = candidate;
            };

            int coarseIntervals = (int)Math.Ceiling(maximumAdjustmentMeters / DirectionalCoarseSearchStepMeters);
            for (int interval = -coarseIntervals; interval <= coarseIntervals; interval++)
                evaluate(interval * DirectionalCoarseSearchStepMeters);

            if (Finite(refinementAnchorError))
            {
                float searchMin = Math.Max(-maximumAdjustmentMeters, refinementAnchorAdjustment - DirectionalCoarseSearchStepMeters);
                float searchMax = Math.Min(maximumAdjustmentMeters, refinementAnchorAdjustment + DirectionalCoarseSearchStepMeters);
                int fineIntervals = (int)Math.Ceiling((searchMax - searchMin) / DirectionalFineSearchStepMeters);
                for (int interval = 0; interval <= fineIntervals; interval++)
                    evaluate(Math.Min(searchMax, searchMin + interval * DirectionalFineSearchStepMeters));
            }
            if (Finite(preferredRefinementAdjustment))
            {
                float searchMin = Math.Max(-maximumAdjustmentMeters,
                    preferredRefinementAdjustment - DirectionalCoarseSearchStepMeters);
                float searchMax = Math.Min(maximumAdjustmentMeters,
                    preferredRefinementAdjustment + DirectionalCoarseSearchStepMeters);
                int fineIntervals = (int)Math.Ceiling((searchMax - searchMin) / DirectionalFineSearchStepMeters);
                for (int interval = 0; interval <= fineIntervals; interval++)
                    evaluate(Math.Min(searchMax, searchMin + interval * DirectionalFineSearchStepMeters));
            }

            if (best == null)
            {
                moving.SetPose(Offset(original, direction, diagnosticAdjustment));
                U4EDirectionalContactPatchMeasurement diagnosticPatch = captureFinalPatch();
                U4EContactMeasurement rejected = fullMeasure();
                rejected.directionalPatch = diagnosticPatch;
                rejected.fittingAdjustmentMeters = diagnosticAdjustment;
                rejected.fittingIterations = evaluations;
                moving.SetPose(original);
                rejected.acceptedContact = false;
                rejected.rejectionReason = diagnosticRejection;
                return new U4EContactFitResult
                {
                    accepted = false,
                    rejectionReason = diagnosticRejection,
                    adjustmentMeters = diagnosticAdjustment,
                    iterations = evaluations,
                    measurement = rejected
                };
            }

            moving.SetPose(Offset(original, direction, best.AdjustmentMeters));
            U4EDirectionalContactPatchMeasurement finalPatch = captureFinalPatch();
            U4EContactMeasurement finalMeasurement = fullMeasure();
            finalMeasurement.directionalPatch = finalPatch;
            finalMeasurement.fittingAdjustmentMeters = best.AdjustmentMeters;
            finalMeasurement.fittingIterations = evaluations;
            if (!finalMeasurement.HasZeroSampledOverlap || !finalMeasurement.acceptedContact ||
                !finalPatch.hasSupportFacingTriangles || !finalPatch.hasAcceptedPatch ||
                finalPatch.minimumDirectionalGapMeters < -U4EFormationConfiguration.MaximumContactPenetrationMeters)
            {
                moving.SetPose(original);
                finalMeasurement.acceptedContact = false;
                finalMeasurement.rejectionReason = "Selected directional candidate failed its final contact/overlap recheck.";
                return new U4EContactFitResult
                {
                    accepted = false,
                    rejectionReason = finalMeasurement.rejectionReason,
                    adjustmentMeters = best.AdjustmentMeters,
                    iterations = evaluations,
                    measurement = finalMeasurement
                };
            }
            return new U4EContactFitResult
            {
                accepted = true,
                rejectionReason = string.Empty,
                adjustmentMeters = best.AdjustmentMeters,
                iterations = evaluations,
                measurement = finalMeasurement
            };
        }

        private static bool IsBetterDirectionalCandidate(DirectionalCandidate candidate, DirectionalCandidate current)
        {
            const double epsilon = 1e-8;
            double candidateArea = candidate.Patch.acceptedPatchAreaSquareMeters;
            double currentArea = current.Patch.acceptedPatchAreaSquareMeters;
            if (candidateArea > currentArea + epsilon) return true;
            if (candidateArea < currentArea - epsilon) return false;
            if (candidate.Patch.contactPatchAreaRatio > current.Patch.contactPatchAreaRatio + epsilon) return true;
            if (candidate.Patch.contactPatchAreaRatio < current.Patch.contactPatchAreaRatio - epsilon) return false;
            if (candidate.Patch.contactPatchDiagonalMeters > current.Patch.contactPatchDiagonalMeters + epsilon) return true;
            if (candidate.Patch.contactPatchDiagonalMeters < current.Patch.contactPatchDiagonalMeters - epsilon) return false;
            float candidateGap = Math.Abs(candidate.Measurement.minimumSurfaceGapMeters);
            float currentGap = Math.Abs(current.Measurement.minimumSurfaceGapMeters);
            if (candidateGap < currentGap - epsilon) return true;
            if (candidateGap > currentGap + epsilon) return false;
            return Math.Abs(candidate.AdjustmentMeters) < Math.Abs(current.AdjustmentMeters) - epsilon;
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
