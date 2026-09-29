using System;
using System.Collections.Generic;
using System.Diagnostics;

namespace Wildkin.Matter
{
    /// <summary>A deterministic orthonormal frame for bounded U4E.2 pose adjustments.</summary>
    public readonly struct U4E2ContactFrame
    {
        public MatterFloat3 N { get; }
        public MatterFloat3 U { get; }
        public MatterFloat3 V { get; }

        public U4E2ContactFrame(MatterFloat3 normal)
        {
            N = U4EContactFitter.Normalize(normal);
            MatterFloat3 reference = Math.Abs(N.X) <= Math.Abs(N.Y) && Math.Abs(N.X) <= Math.Abs(N.Z)
                ? new MatterFloat3(1f, 0f, 0f)
                : Math.Abs(N.Y) <= Math.Abs(N.Z)
                    ? new MatterFloat3(0f, 1f, 0f)
                    : new MatterFloat3(0f, 0f, 1f);
            U = Normalize(Cross(N, reference));
            V = Normalize(Cross(N, U));
        }

        private static MatterFloat3 Cross(MatterFloat3 a, MatterFloat3 b)
            => new MatterFloat3(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);

        private static MatterFloat3 Normalize(MatterFloat3 value)
        {
            double length = Math.Sqrt((double)value.X * value.X + (double)value.Y * value.Y + (double)value.Z * value.Z);
            return new MatterFloat3((float)(value.X / length), (float)(value.Y / length), (float)(value.Z / length));
        }
    }

    /// <summary>One fixed matter grid used for parent, terrain, or frozen-sibling validation.</summary>
    public sealed class U4E2PoseAnchor
    {
        public string Id { get; }
        public MatterDomain Domain { get; }
        public IMatterReadOnlyGrid Grid { get; }
        public MatterBounds Bounds { get; }
        public MatterDomainPose Pose { get; }
        public U4ESurfaceProbeSet SurfaceProbes { get; }

        private U4E2PoseAnchor(string id, MatterDomain domain, IMatterReadOnlyGrid grid,
            MatterBounds bounds, MatterDomainPose pose, U4ESurfaceProbeSet surfaceProbes)
        {
            if (string.IsNullOrEmpty(id)) throw new ArgumentException("An anchor needs a stable id.", nameof(id));
            if (domain == null && grid == null) throw new ArgumentNullException(nameof(grid));
            if (surfaceProbes == null) throw new ArgumentNullException(nameof(surfaceProbes));
            Id = id;
            Domain = domain;
            Grid = domain ?? grid;
            Bounds = domain == null ? bounds : domain.SampleBounds;
            Pose = domain == null ? pose : domain.Pose;
            SurfaceProbes = surfaceProbes;
        }

        public static U4E2PoseAnchor ForDomain(MatterDomain domain, U4ESurfaceProbeSet surfaceProbes)
        {
            if (domain == null) throw new ArgumentNullException(nameof(domain));
            return new U4E2PoseAnchor(domain.Id, domain, domain, domain.SampleBounds, domain.Pose, surfaceProbes);
        }

        public static U4E2PoseAnchor ForGrid(string id, IMatterReadOnlyGrid grid, MatterBounds bounds,
            MatterDomainPose pose, U4ESurfaceProbeSet surfaceProbes)
            => new U4E2PoseAnchor(id, null, grid, bounds, pose, surfaceProbes);

        internal U4EDirectionalContactPatchMeasurement MeasurePatch(MatterDomain moving,
            U4ESurfaceProbeSet movingProbes, MatterFloat3 direction, float targetGapMeters, bool captureWitnesses)
        {
            if (Domain != null)
                return U4EContactProbe.MeasureDirectionalPatch(moving, movingProbes, Domain,
                    direction, targetGapMeters, captureWitnesses);
            return U4EContactProbe.MeasureDirectionalPatch(moving, movingProbes, Grid, Bounds,
                Pose, direction, targetGapMeters, captureWitnesses);
        }

        internal U4EContactMeasurement MeasurePair(MatterDomain moving, U4ESurfaceProbeSet movingProbes)
        {
            if (Domain != null)
                return U4EContactProbe.MeasureDomains(moving, movingProbes, Domain, SurfaceProbes);
            return U4EContactProbe.MeasureDomainAgainstGrid(moving, movingProbes, Grid,
                Bounds, Pose, SurfaceProbes);
        }
    }

    /// <summary>Frozen context for a single moving-child local-pose search.</summary>
    public sealed class U4E2PoseSearchContext
    {
        public MatterDomain MovingDomain { get; }
        public U4ESurfaceProbeSet MovingSurfaceProbes { get; }
        public U4E2PoseAnchor IntendedParent { get; }
        public MatterFloat3 DirectionTowardParent { get; }
        public U4E2PoseAnchor Terrain { get; }
        public U4E2PoseAnchor[] FrozenSiblings { get; }

        public U4E2PoseSearchContext(MatterDomain movingDomain, U4ESurfaceProbeSet movingSurfaceProbes,
            U4E2PoseAnchor intendedParent, MatterFloat3 directionTowardParent,
            U4E2PoseAnchor terrain, U4E2PoseAnchor[] frozenSiblings)
        {
            MovingDomain = movingDomain ?? throw new ArgumentNullException(nameof(movingDomain));
            MovingSurfaceProbes = movingSurfaceProbes ?? throw new ArgumentNullException(nameof(movingSurfaceProbes));
            IntendedParent = intendedParent ?? throw new ArgumentNullException(nameof(intendedParent));
            if (terrain == null) throw new ArgumentNullException(nameof(terrain));
            Terrain = terrain;
            DirectionTowardParent = U4EContactFitter.Normalize(directionTowardParent);
            FrozenSiblings = frozenSiblings == null ? Array.Empty<U4E2PoseAnchor>() : (U4E2PoseAnchor[])frozenSiblings.Clone();
            for (int i = 0; i < FrozenSiblings.Length; i++)
            {
                if (FrozenSiblings[i] == null) throw new ArgumentException("A frozen sibling anchor cannot be null.", nameof(frozenSiblings));
                if (FrozenSiblings[i].Id == IntendedParent.Id)
                    throw new ArgumentException("The intended parent must not be repeated as a frozen sibling.", nameof(frozenSiblings));
            }
        }
    }

    [Serializable]
    public sealed class U4E2SearchCounters
    {
        public int candidateOrientations;
        public int candidateTranslations;
        public int directionalPatchEvaluations;
        public int fullOverlapValidationCandidates;
        public int contextPairOverlapScans;
        public double elapsedMilliseconds;
    }

    [Serializable]
    public sealed class U4E2ContextPairResult
    {
        public string anchorId;
        public bool isTerrain;
        public bool isIntendedParent;
        public U4EContactMeasurement measurement;
    }

    [Serializable]
    public sealed class U4E2PoseValidation
    {
        public bool accepted;
        public string rejectionReason;
        public U4EDirectionalContactPatchMeasurement directionalPatch;
        public U4E2ContextPairResult parent;
        public U4E2ContextPairResult terrain;
        public U4E2ContextPairResult[] siblings = Array.Empty<U4E2ContextPairResult>();
        public string[] newSiblingContacts = Array.Empty<string>();
    }

    [Serializable]
    public sealed class U4E2PoseCandidate
    {
        public MatterDomainPose pose;
        public float offsetUMeters;
        public float offsetVMeters;
        public float offsetNMeters;
        public float tiltUDegrees;
        public float tiltVDegrees;
        public float twistNDegrees;
        public U4EDirectionalContactPatchMeasurement directionalPatch;
        public U4E2PoseValidation validation;
        public bool accepted;
        public string rejectionReason;
    }

    [Serializable]
    public sealed class U4E2PoseSearchResult
    {
        public bool accepted;
        public string rejectionReason;
        public U4E2PoseCandidate selected;
        public U4E2PoseCandidate[] validatedFinalists = Array.Empty<U4E2PoseCandidate>();
        public U4E2PoseCandidate[] refinementSeeds = Array.Empty<U4E2PoseCandidate>();
        public U4E2SearchCounters counters = new U4E2SearchCounters();
    }

    /// <summary>
    /// Bounded, deterministic pose-only D/E experiments. This module never rebakes or remeshes a domain,
    /// and always restores the caller's pose before returning.
    /// </summary>
    public static class U4E2LocalPoseSearch
    {
        public const float TangentialBoundMeters = .50f;
        public const float CoarseTangentialStepMeters = .125f;
        public const float FineTangentialRadiusMeters = .125f;
        public const float FineTangentialStepMeters = .025f;
        public const int MaximumShortlistCandidates = 8;
        public const int NormalSolveIterations = 6;
        public const float DirectionalTargetGapMeters = 0f;
        public const float MaximumPenetrationMeters = .0125f;

        private const float Millimeter = .001f;
        private const double ScoreEpsilon = 1e-8;
        private static readonly float[] TiltAngles = { -20f, -10f, 0f, 10f, 20f };
        private static readonly float[] TwistAngles = { -15f, 0f, 15f };

        private sealed class CandidateEntry
        {
            public U4E2PoseCandidate Candidate;
            public U4E2ContactFrame Frame;
        }

        public static U4E2PoseSearchResult SearchTranslation(U4E2PoseSearchContext context)
        {
            if (context == null) throw new ArgumentNullException(nameof(context));
            var watch = Stopwatch.StartNew();
            var counters = new U4E2SearchCounters { candidateOrientations = 1 };
            MatterDomain moving = context.MovingDomain;
            MatterDomainPose originalPose = moving.Pose;
            U4E2ContactFrame frame = new U4E2ContactFrame(context.DirectionTowardParent);
            var candidates = new List<CandidateEntry>();
            var seen = new HashSet<string>(StringComparer.Ordinal);
            try
            {
                for (int uIndex = -4; uIndex <= 4; uIndex++)
                for (int vIndex = -4; vIndex <= 4; vIndex++)
                {
                    CandidateEntry candidate = EvaluateTranslation(context, originalPose, frame,
                        uIndex * CoarseTangentialStepMeters, vIndex * CoarseTangentialStepMeters,
                        0f, 0f, 0f, counters);
                    AddCandidate(candidates, seen, candidate);
                }

                SortCandidates(candidates);
                int coarseCount = Math.Min(MaximumShortlistCandidates, candidates.Count);
                var refinementSeeds = new U4E2PoseCandidate[coarseCount];
                for (int i = 0; i < coarseCount; i++) refinementSeeds[i] = CloneCandidate(candidates[i].Candidate);

                for (int seedIndex = 0; seedIndex < coarseCount; seedIndex++)
                {
                    U4E2PoseCandidate seed = refinementSeeds[seedIndex];
                    for (int uStep = -5; uStep <= 5; uStep++)
                    for (int vStep = -5; vStep <= 5; vStep++)
                    {
                        float u = seed.offsetUMeters + uStep * FineTangentialStepMeters;
                        float v = seed.offsetVMeters + vStep * FineTangentialStepMeters;
                        if (Math.Abs(u) > TangentialBoundMeters + 1e-5f || Math.Abs(v) > TangentialBoundMeters + 1e-5f)
                            continue;
                        CandidateEntry candidate = EvaluateTranslation(context, originalPose, frame,
                            u, v, 0f, 0f, 0f, counters);
                        AddCandidate(candidates, seen, candidate);
                    }
                }

                return ValidateShortlist(context, candidates, refinementSeeds, counters, watch);
            }
            finally
            {
                moving.SetPose(originalPose);
                watch.Stop();
                counters.elapsedMilliseconds = watch.Elapsed.TotalMilliseconds;
            }
        }

        public static U4E2PoseSearchResult SearchInterlock(U4E2PoseSearchContext context,
            U4E2PoseSearchResult translationResult)
        {
            if (context == null) throw new ArgumentNullException(nameof(context));
            if (translationResult == null) throw new ArgumentNullException(nameof(translationResult));
            var watch = Stopwatch.StartNew();
            var counters = new U4E2SearchCounters();
            MatterDomain moving = context.MovingDomain;
            MatterDomainPose originalPose = moving.Pose;
            U4E2ContactFrame frame = new U4E2ContactFrame(context.DirectionTowardParent);
            var candidates = new List<CandidateEntry>();
            var seen = new HashSet<string>(StringComparer.Ordinal);
            U4E2PoseCandidate[] seeds = translationResult.refinementSeeds ?? Array.Empty<U4E2PoseCandidate>();
            try
            {
                foreach (float tiltU in TiltAngles)
                foreach (float tiltV in TiltAngles)
                foreach (float twistN in TwistAngles)
                {
                    counters.candidateOrientations++;
                    for (int seedIndex = 0; seedIndex < seeds.Length; seedIndex++)
                    {
                        U4E2PoseCandidate seed = seeds[seedIndex];
                        CandidateEntry candidate = EvaluateTranslation(context, originalPose, frame,
                            seed.offsetUMeters, seed.offsetVMeters, tiltU, tiltV, twistN, counters);
                        AddCandidate(candidates, seen, candidate);
                    }
                }

                SortCandidates(candidates);
                int finalistsCount = Math.Min(MaximumShortlistCandidates, candidates.Count);
                var finalists = new U4E2PoseCandidate[finalistsCount];
                for (int i = 0; i < finalistsCount; i++) finalists[i] = candidates[i].Candidate;
                return ValidateShortlist(context, candidates, seeds, counters, watch, finalists);
            }
            finally
            {
                moving.SetPose(originalPose);
                watch.Stop();
                counters.elapsedMilliseconds = watch.Elapsed.TotalMilliseconds;
            }
        }

        /// <summary>Measures and fully context-validates an unchanged baseline pose, without changing it.</summary>
        public static U4E2PoseCandidate ValidateFixedPose(U4E2PoseSearchContext context,
            MatterDomainPose pose, U4E2SearchCounters counters = null)
        {
            if (context == null) throw new ArgumentNullException(nameof(context));
            counters = counters ?? new U4E2SearchCounters();
            MatterDomain moving = context.MovingDomain;
            MatterDomainPose previousPose = moving.Pose;
            try
            {
                moving.SetPose(pose);
                U4EDirectionalContactPatchMeasurement patch = context.IntendedParent.MeasurePatch(moving,
                    context.MovingSurfaceProbes, context.DirectionTowardParent, DirectionalTargetGapMeters, true);
                counters.directionalPatchEvaluations++;
                var candidate = new U4E2PoseCandidate { pose = pose, directionalPatch = patch };
                candidate.validation = ValidateContext(context, candidate, counters);
                candidate.accepted = candidate.validation.accepted;
                candidate.rejectionReason = candidate.validation.rejectionReason;
                return candidate;
            }
            finally
            {
                moving.SetPose(previousPose);
            }
        }

        private static CandidateEntry EvaluateTranslation(U4E2PoseSearchContext context,
            MatterDomainPose basePose, U4E2ContactFrame frame, float offsetU, float offsetV,
            float tiltU, float tiltV, float twistN, U4E2SearchCounters counters)
        {
            counters.candidateTranslations++;
            float u = Quantize(offsetU);
            float v = Quantize(offsetV);
            var entry = new CandidateEntry
            {
                Candidate = new U4E2PoseCandidate
                {
                    offsetUMeters = u,
                    offsetVMeters = v,
                    tiltUDegrees = tiltU,
                    tiltVDegrees = tiltV,
                    twistNDegrees = twistN
                },
                Frame = frame
            };
            MatterDomain moving = context.MovingDomain;
            MatterDomainPose original = moving.Pose;
            try
            {
                MatterDomainPose orientationPose = ApplyContactFrameRotation(basePose, frame, tiltU, tiltV, twistN);
                float n = 0f;
                U4EDirectionalContactPatchMeasurement patch = null;
                for (int iteration = 0; iteration < NormalSolveIterations; iteration++)
                {
                    MatterDomainPose pose = ComposePose(basePose, frame, u, v, n, orientationPose);
                    moving.SetPose(pose);
                    patch = context.IntendedParent.MeasurePatch(moving, context.MovingSurfaceProbes,
                        context.DirectionTowardParent, DirectionalTargetGapMeters, false);
                    counters.directionalPatchEvaluations++;
                    if (!patch.hasSupportFacingTriangles || !Finite(patch.minimumDirectionalGapMeters))
                        break;
                    // Solve the nearest support-facing directional surface to 0 mm. The median is
                    // still recorded/scored, but outside-footprint triangles must not pull the
                    // moving child through an otherwise valid support patch.
                    float error = patch.minimumDirectionalGapMeters - DirectionalTargetGapMeters;
                    if (Math.Abs(error) <= Millimeter) break;
                    float next = Quantize(Clamp(n + error,
                        -U4EFormationConfiguration.MaximumFitAdjustmentMeters,
                        U4EFormationConfiguration.MaximumFitAdjustmentMeters));
                    if (next.Equals(n)) break;
                    n = next;
                }

                MatterDomainPose finalPose = ComposePose(basePose, frame, u, v, n, orientationPose);
                moving.SetPose(finalPose);
                if (patch == null || !finalPose.IsValid) return null;
                patch = context.IntendedParent.MeasurePatch(moving, context.MovingSurfaceProbes,
                    context.DirectionTowardParent, DirectionalTargetGapMeters, false);
                counters.directionalPatchEvaluations++;
                entry.Candidate.offsetNMeters = n;
                entry.Candidate.pose = finalPose;
                entry.Candidate.directionalPatch = patch;
                entry.Candidate.accepted = HasHardDirectionalValidity(patch, out string failure);
                entry.Candidate.rejectionReason = entry.Candidate.accepted ? string.Empty : failure;
                if (!entry.Candidate.accepted) return null;
                return entry;
            }
            finally
            {
                moving.SetPose(original);
            }
        }

        private static MatterDomainPose ComposePose(MatterDomainPose basePose, U4E2ContactFrame frame,
            float u, float v, float n, MatterDomainPose orientationPose)
        {
            MatterFloat3 position = basePose.PositionMeters;
            position = Add(position, Scale(frame.U, u));
            position = Add(position, Scale(frame.V, v));
            position = Add(position, Scale(frame.N, n));
            position = new MatterFloat3(Quantize(position.X), Quantize(position.Y), Quantize(position.Z));
            return new MatterDomainPose(position, orientationPose.RotationX, orientationPose.RotationY,
                orientationPose.RotationZ, orientationPose.RotationW);
        }

        private static MatterDomainPose ApplyContactFrameRotation(MatterDomainPose basePose,
            U4E2ContactFrame frame, float tiltU, float tiltV, float twistN)
        {
            QuaternionParts qU = AxisAngle(frame.U, tiltU);
            QuaternionParts qV = AxisAngle(frame.V, tiltV);
            QuaternionParts qN = AxisAngle(frame.N, twistN);
            QuaternionParts combined = Multiply(qN, Multiply(qV, Multiply(qU,
                new QuaternionParts(basePose.RotationX, basePose.RotationY, basePose.RotationZ, basePose.RotationW))));
            return new MatterDomainPose(basePose.PositionMeters, combined.X, combined.Y, combined.Z, combined.W);
        }

        private readonly struct QuaternionParts
        {
            public readonly float X, Y, Z, W;
            public QuaternionParts(float x, float y, float z, float w) { X = x; Y = y; Z = z; W = w; }
        }

        private static QuaternionParts AxisAngle(MatterFloat3 axis, float degrees)
        {
            double halfRadians = degrees * Math.PI / 360d;
            float sin = (float)Math.Sin(halfRadians);
            return new QuaternionParts(axis.X * sin, axis.Y * sin, axis.Z * sin, (float)Math.Cos(halfRadians));
        }

        private static QuaternionParts Multiply(QuaternionParts a, QuaternionParts b)
            => new QuaternionParts(a.W * b.X + a.X * b.W + a.Y * b.Z - a.Z * b.Y,
                a.W * b.Y - a.X * b.Z + a.Y * b.W + a.Z * b.X,
                a.W * b.Z + a.X * b.Y - a.Y * b.X + a.Z * b.W,
                a.W * b.W - a.X * b.X - a.Y * b.Y - a.Z * b.Z);

        private static bool HasHardDirectionalValidity(U4EDirectionalContactPatchMeasurement patch,
            out string rejection)
        {
            rejection = string.Empty;
            if (patch == null || !patch.hasSupportFacingTriangles)
                rejection = "Candidate has no support-facing triangles.";
            else if (!patch.hasAcceptedPatch || patch.acceptedPatchTriangleCount <= 0 ||
                     !Finite(patch.acceptedPatchAreaSquareMeters) || patch.acceptedPatchAreaSquareMeters <= 0f)
                rejection = string.IsNullOrEmpty(patch.weakPatchReason)
                    ? "Candidate has no accepted directional contact patch." : patch.weakPatchReason;
            else if (patch.degeneratePointCluster || !Finite(patch.contactPatchDiagonalMeters) ||
                     patch.contactPatchDiagonalMeters <= 0f || !Finite(patch.witnessSpanAMeters) ||
                     !Finite(patch.witnessSpanBMeters))
                rejection = "Candidate directional patch has degenerate or non-finite spread.";
            else if (!Finite(patch.minimumDirectionalGapMeters) ||
                     patch.minimumDirectionalGapMeters < -MaximumPenetrationMeters)
                rejection = "Candidate directional surface penetration exceeds 12.5 mm.";
            else if (!Finite(patch.areaWeightedMedianDirectionalGapMeters) ||
                     !Finite(patch.contactPatchAreaRatio))
                rejection = "Candidate directional patch metrics are non-finite.";
            return string.IsNullOrEmpty(rejection);
        }

        private static U4E2PoseSearchResult ValidateShortlist(U4E2PoseSearchContext context,
            List<CandidateEntry> candidates, U4E2PoseCandidate[] refinementSeeds,
            U4E2SearchCounters counters, Stopwatch watch, U4E2PoseCandidate[] providedFinalists = null)
        {
            SortCandidates(candidates);
            int count = Math.Min(MaximumShortlistCandidates, candidates.Count);
            var finalists = providedFinalists ?? new U4E2PoseCandidate[count];
            if (providedFinalists == null)
                for (int i = 0; i < count; i++) finalists[i] = candidates[i].Candidate;
            U4E2PoseCandidate selected = null;
            for (int i = 0; i < finalists.Length; i++)
            {
                U4E2PoseCandidate candidate = finalists[i];
                if (candidate == null) continue;
                counters.fullOverlapValidationCandidates++;
                candidate.validation = ValidateCandidateContext(context, candidate, counters);
                candidate.accepted = candidate.validation.accepted;
                candidate.rejectionReason = candidate.validation.rejectionReason;
                if (candidate.accepted && selected == null) selected = candidate;
            }
            watch.Stop();
            counters.elapsedMilliseconds = watch.Elapsed.TotalMilliseconds;
            return new U4E2PoseSearchResult
            {
                accepted = selected != null,
                rejectionReason = selected == null ? "No shortlisted pose passed parent, terrain, sibling, overlap, and penetration constraints." : string.Empty,
                selected = selected,
                validatedFinalists = finalists,
                refinementSeeds = refinementSeeds ?? Array.Empty<U4E2PoseCandidate>(),
                counters = counters
            };
        }

        private static U4E2PoseValidation ValidateCandidateContext(U4E2PoseSearchContext context,
            U4E2PoseCandidate candidate, U4E2SearchCounters counters)
        {
            MatterDomain moving = context.MovingDomain;
            MatterDomainPose oldPose = moving.Pose;
            try
            {
                moving.SetPose(candidate.pose);
                U4E2PoseValidation validation = ValidateContext(context, candidate, counters);
                return validation;
            }
            finally { moving.SetPose(oldPose); }
        }

        private static U4E2PoseValidation ValidateContext(U4E2PoseSearchContext context,
            U4E2PoseCandidate candidate, U4E2SearchCounters counters)
        {
            var siblings = new U4E2ContextPairResult[context.FrozenSiblings.Length];
            var newContacts = new List<string>();
            U4E2ContextPairResult parent = MeasurePair(context.IntendedParent, context, counters, true, false);
            U4E2ContextPairResult terrain = MeasurePair(context.Terrain, context, counters, false, true);
            bool hasZeroOverlap = parent.measurement.HasZeroSampledOverlap && terrain.measurement.HasZeroSampledOverlap;
            for (int i = 0; i < siblings.Length; i++)
            {
                siblings[i] = MeasurePair(context.FrozenSiblings[i], context, counters, false, false);
                hasZeroOverlap &= siblings[i].measurement.HasZeroSampledOverlap;
                if (siblings[i].measurement.acceptedContact) newContacts.Add(siblings[i].anchorId);
            }

            bool directionalValid = HasHardDirectionalValidity(candidate.directionalPatch, out string patchFailure);
            string rejection = !directionalValid ? patchFailure
                : !parent.measurement.HasZeroSampledOverlap ? "Intended-parent pair has sampled positive-solid overlap."
                : !terrain.measurement.HasZeroSampledOverlap ? "Terrain pair has sampled positive-solid overlap."
                : FirstSiblingOverlap(siblings);
            bool accepted = directionalValid && hasZeroOverlap;
            return new U4E2PoseValidation
            {
                accepted = accepted,
                rejectionReason = rejection,
                directionalPatch = candidate.directionalPatch,
                parent = parent,
                terrain = terrain,
                siblings = siblings,
                newSiblingContacts = newContacts.ToArray()
            };
        }

        private static U4E2ContextPairResult MeasurePair(U4E2PoseAnchor anchor,
            U4E2PoseSearchContext context, U4E2SearchCounters counters, bool parent, bool terrain)
        {
            counters.contextPairOverlapScans++;
            return new U4E2ContextPairResult
            {
                anchorId = anchor.Id,
                isIntendedParent = parent,
                isTerrain = terrain,
                measurement = anchor.MeasurePair(context.MovingDomain, context.MovingSurfaceProbes)
            };
        }

        private static string FirstSiblingOverlap(U4E2ContextPairResult[] siblings)
        {
            for (int i = 0; i < siblings.Length; i++)
                if (!siblings[i].measurement.HasZeroSampledOverlap)
                    return "Frozen sibling pair " + siblings[i].anchorId + " has sampled positive-solid overlap.";
            return string.Empty;
        }

        private static void AddCandidate(List<CandidateEntry> candidates, HashSet<string> seen, CandidateEntry candidate)
        {
            if (candidate == null) return;
            U4E2PoseCandidate value = candidate.Candidate;
            string key = QuantizedMillimeters(value.offsetUMeters) + ":" + QuantizedMillimeters(value.offsetVMeters) + ":" +
                         QuantizedMillimeters(value.offsetNMeters) + ":" + QuantizedMilliDegrees(value.tiltUDegrees) + ":" +
                         QuantizedMilliDegrees(value.tiltVDegrees) + ":" + QuantizedMilliDegrees(value.twistNDegrees);
            if (seen.Add(key)) candidates.Add(candidate);
        }

        private static void SortCandidates(List<CandidateEntry> candidates)
            => candidates.Sort((a, b) => CompareCandidates(a.Candidate, b.Candidate));

        private static int CompareCandidates(U4E2PoseCandidate a, U4E2PoseCandidate b)
        {
            U4EDirectionalContactPatchMeasurement pa = a.directionalPatch;
            U4EDirectionalContactPatchMeasurement pb = b.directionalPatch;
            int comparison = CompareDescending(pa.acceptedPatchAreaSquareMeters, pb.acceptedPatchAreaSquareMeters);
            if (comparison != 0) return comparison;
            comparison = CompareDescending(pa.contactPatchAreaRatio, pb.contactPatchAreaRatio);
            if (comparison != 0) return comparison;
            comparison = CompareDescending(pa.contactPatchDiagonalMeters, pb.contactPatchDiagonalMeters);
            if (comparison != 0) return comparison;
            comparison = Math.Abs(pa.areaWeightedMedianDirectionalGapMeters).CompareTo(Math.Abs(pb.areaWeightedMedianDirectionalGapMeters));
            if (comparison != 0) return comparison;
            float tangentialA = a.offsetUMeters * a.offsetUMeters + a.offsetVMeters * a.offsetVMeters;
            float tangentialB = b.offsetUMeters * b.offsetUMeters + b.offsetVMeters * b.offsetVMeters;
            comparison = tangentialA.CompareTo(tangentialB);
            if (comparison != 0) return comparison;
            float rotationA = Math.Abs(a.tiltUDegrees) + Math.Abs(a.tiltVDegrees) + Math.Abs(a.twistNDegrees);
            float rotationB = Math.Abs(b.tiltUDegrees) + Math.Abs(b.tiltVDegrees) + Math.Abs(b.twistNDegrees);
            comparison = rotationA.CompareTo(rotationB);
            if (comparison != 0) return comparison;
            comparison = a.offsetUMeters.CompareTo(b.offsetUMeters);
            if (comparison != 0) return comparison;
            comparison = a.offsetVMeters.CompareTo(b.offsetVMeters);
            if (comparison != 0) return comparison;
            comparison = a.offsetNMeters.CompareTo(b.offsetNMeters);
            if (comparison != 0) return comparison;
            comparison = a.tiltUDegrees.CompareTo(b.tiltUDegrees);
            if (comparison != 0) return comparison;
            comparison = a.tiltVDegrees.CompareTo(b.tiltVDegrees);
            return comparison != 0 ? comparison : a.twistNDegrees.CompareTo(b.twistNDegrees);
        }

        private static int CompareDescending(float a, float b)
        {
            bool finiteA = Finite(a), finiteB = Finite(b);
            if (finiteA != finiteB) return finiteA ? -1 : 1;
            if (!finiteA) return 0;
            if (a > b + ScoreEpsilon) return -1;
            if (a < b - ScoreEpsilon) return 1;
            return 0;
        }

        private static U4E2PoseCandidate CloneCandidate(U4E2PoseCandidate source)
            => new U4E2PoseCandidate
            {
                pose = source.pose,
                offsetUMeters = source.offsetUMeters,
                offsetVMeters = source.offsetVMeters,
                offsetNMeters = source.offsetNMeters,
                tiltUDegrees = source.tiltUDegrees,
                tiltVDegrees = source.tiltVDegrees,
                twistNDegrees = source.twistNDegrees,
                directionalPatch = source.directionalPatch,
                accepted = source.accepted,
                rejectionReason = source.rejectionReason
            };

        private static string QuantizedMillimeters(float value)
            => Math.Round(value / Millimeter, MidpointRounding.AwayFromZero).ToString(System.Globalization.CultureInfo.InvariantCulture);
        private static string QuantizedMilliDegrees(float value)
            => Math.Round(value * 1000f, MidpointRounding.AwayFromZero).ToString(System.Globalization.CultureInfo.InvariantCulture);
        private static float Quantize(float value)
            => (float)(Math.Round(value / Millimeter, MidpointRounding.AwayFromZero) * Millimeter);
        private static float Clamp(float value, float minimum, float maximum)
            => Math.Max(minimum, Math.Min(maximum, value));
        private static MatterFloat3 Add(MatterFloat3 a, MatterFloat3 b)
            => new MatterFloat3(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
        private static MatterFloat3 Scale(MatterFloat3 value, float scale)
            => new MatterFloat3(value.X * scale, value.Y * scale, value.Z * scale);
        private static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
    }
}
