using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using Unity.Pipeline.Commands;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;
using Wildkin.Matter;
using Wildkin.Matter.Unity;

namespace Wildkin.AgentTools.Editor
{
    /// <summary>Focused U4E.2 baseline/D/E replay, validation, metrics, and matched evidence capture.</summary>
    public static class U4E2InterlockPoseSearchCommands
    {
        private const string ScenePath = "Assets/Wildkin/Scenes/Tech/U4EMultiDomainFormation.unity";
        private const string MaterialPath = "Assets/Wildkin/Matter/Materials/U4B/U4BStylizedRockDirt.mat";
        private const string OutputRelativePath = "native/evidence/unity/u4e2-interlock-pose-search";
        private static readonly Fixture[] Fixtures =
        {
            new Fixture(7000, "shoulder-right", "foundation", "core shoulder interlock"),
            new Fixture(7004, "accent", "shoulder-left", "stress accent interlock"),
            new Fixture(7010, "buttress-left", "foundation", "core buttress interlock"),
            new Fixture(7015, "ridge-left", "foundation", "core ridge interlock"),
            new Fixture(7017, "leaning-mass", "foundation", "core leaning-mass interlock")
        };

        [Serializable]
        private sealed class Fixture
        {
            public int Seed;
            public string MovingSlot;
            public string ParentSlot;
            public string Intent;
            public Fixture(int seed, string movingSlot, string parentSlot, string intent)
            { Seed = seed; MovingSlot = movingSlot; ParentSlot = parentSlot; Intent = intent; }
        }

        private sealed class TerrainGridView : IMatterReadOnlyGrid
        {
            private readonly MatterWorld _world;
            public float SampleSpacingMeters => _world.SampleSpacingMeters;
            public TerrainGridView(MatterWorld world) => _world = world ?? throw new ArgumentNullException(nameof(world));
            public MatterSample ReadSample(MatterSampleAddress address) => _world.ReadSample(address);
        }

        [Serializable]
        private sealed class RunReceipt
        {
            public string phase = "U4E.2 bounded local interlock pose search";
            public string result = "U4E2_LOCAL_POSE_SEARCH_HOLD_UNREVIEWED";
            public string unityVersion;
            public string runUtc;
            public string outputPath;
            public string editorScenePath = ScenePath;
            public string controlMode = "U4E original GLOBAL_MIN_25MM at frozen attempt index 0; no global fitter/default generator changes";
            public int requestedFixtureCount;
            public int acceptedTranslationCount;
            public int acceptedInterlockCount;
            public bool allControlsAccepted;
            public bool allSourceAndMatterInvariant;
            public bool allContextPairsOverlapFree;
            public bool independentVisualReviewPending = true;
            public bool noPlayerBuildRequested = true;
            public string[] fixtureMetrics = Array.Empty<string>();
            public string[] captureFiles = Array.Empty<string>();
            public string[] preservedBoundaries =
            {
                "No U5 implementation.", "No source-rock redesign or global fitter/default generator change.",
                "No historical U4E/U4E.1 evidence edited.", "No Player build in this slice."
            };
        }

        [Serializable]
        public sealed class FixtureMetrics
        {
            public int seed;
            public int attemptIndex;
            public string archetype;
            public string intent;
            public string movingSlot;
            public string movingDomainId;
            public string intendedParentSlot;
            public string intendedParentId;
            public bool acceptedFrozenControl;
            public string frozenControlRejectionReason;
            public ControlParity u4e1ControlParity;
            public DomainSnapshot[] frozenChildSnapshots = Array.Empty<DomainSnapshot>();
            public MethodMetrics A;
            public MethodMetrics D;
            public MethodMetrics E;
            public bool sourceRecipeGeometryMatterAndMeshInvariantAcrossPoses;
            public bool siblingPairsFrozenExceptMovingChild;
            public string pairCapturePath;
            public string contextCapturePath;
            public string debugCapturePath;
        }

        [Serializable]
        public sealed class ControlParity
        {
            public string referencePath;
            public bool referenceFound;
            public bool attemptIndexMatches;
            public bool sourceGeometryHashMatches;
            public bool childCountMatches;
            public bool sourceRecipeHashesMatch;
            public bool sourceGeometryHashesMatch;
            public bool contentHashesMatch;
            public bool meshHashesMatch;
            public bool sampleSpacingsMatch;
            public bool sourceAndDomainHashesMatch;
            public string note = "Formation and contact-graph hashes are intentionally not parity gates: U4E.1 already records expected pose-specific hash mismatches.";
        }

        [Serializable]
        public sealed class MethodMetrics
        {
            public string method;
            public bool searchAccepted;
            public bool contextAccepted;
            public string rejectionReason;
            public PoseMetrics pose;
            public PatchMetrics patch;
            public PairMetrics parent;
            public PairMetrics terrain;
            public PairMetrics[] frozenSiblings = Array.Empty<PairMetrics>();
            public string[] newSiblingContacts = Array.Empty<string>();
            public U4E2SearchCounters searchCounters;
            public U4E2SearchCounters finalRevalidationCounters;
            public bool tangentialBoundsSatisfied;
            public bool rotationBoundsSatisfied;
            public bool poseOnlyInvariantToA;
            public DomainSnapshot[] childSnapshotsAfterPose = Array.Empty<DomainSnapshot>();
            public float acceptedAreaImprovementSquareMeters;
            public float contactPatchAreaRatioImprovement;
            public float diagonalImprovementMeters;
        }

        [Serializable]
        public sealed class PoseMetrics
        {
            public float positionX;
            public float positionY;
            public float positionZ;
            public float rotationX;
            public float rotationY;
            public float rotationZ;
            public float rotationW;
            public float offsetUMeters;
            public float offsetVMeters;
            public float offsetNMeters;
            public float tiltUDegrees;
            public float tiltVDegrees;
            public float twistNDegrees;
            public float tangentialDisplacementMeters;
            public float totalTranslationFromAmeters;
            public float angularChangeDegrees;
        }

        [Serializable]
        public sealed class PatchMetrics
        {
            public bool hasSupportFacingTriangles;
            public bool hasAcceptedPatch;
            public bool degeneratePointCluster;
            public int supportFacingTriangleCount;
            public int acceptedPatchTriangleCount;
            public float supportFacingSurfaceAreaSquareMeters;
            public float acceptedPatchAreaSquareMeters;
            public float contactPatchAreaRatio;
            public float minimumDirectionalGapMeters;
            public float areaWeightedP10DirectionalGapMeters;
            public float areaWeightedMedianDirectionalGapMeters;
            public float areaWeightedP90DirectionalGapMeters;
            public float witnessSpanAMeters;
            public float witnessSpanBMeters;
            public float contactPatchDiagonalMeters;
            public float maximumDirectionalPenetrationMeters;
            public string weakPatchReason;
            public U4EContactWitness[] acceptedWitnesses = Array.Empty<U4EContactWitness>();
            public int acceptedWitnessCount;
            public bool acceptedWitnessesTruncated;
        }

        [Serializable]
        public sealed class PairMetrics
        {
            public string anchorId;
            public bool isTerrain;
            public bool isIntendedParent;
            public bool acceptedGeometryContact;
            public bool zeroSampledOverlap;
            public int movingToAnchorPositiveSampleCount;
            public int anchorToMovingPositiveSampleCount;
            public double movingToAnchorOverlapEstimateCubicMeters;
            public double anchorToMovingOverlapEstimateCubicMeters;
            public float minimumSurfaceGapMeters;
            public int nearContactWitnessCount;
        }

        [Serializable]
        public sealed class DomainSnapshot
        {
            public string slot;
            public string id;
            public string sourceRecipeHash;
            public string sourceGeometryHash;
            public string contentHash;
            public string meshHash;
            public float spacingMeters;
            public long meshRevision;
        }

        [Serializable]
        public sealed class U4E1Reference
        {
            public int seed;
            public int attemptIndex;
            public U4E1MethodReference[] methods;
        }

        [Serializable]
        public sealed class U4E1MethodReference
        {
            public string method;
            public string sourceGeometryHash;
            public U4E1ChildReference[] children;
        }

        [Serializable]
        public sealed class U4E1ChildReference
        {
            public string slot;
            public string id;
            public string sourceRecipeHash;
            public string sourceGeometryHash;
            public string contentHash;
            public string meshHash;
            public float sampleSpacingMeters;
        }

        [CliCommand("u4e2_run_local_pose_search", "Run frozen U4E controls plus bounded U4E.2 D/E pose search and matched Unity evidence captures.",
            MainThreadRequired = true, Tags = new[] { "u4e2", "matter", "evidence" })]
        public static string RunLocalPoseSearch()
        {
            string repositoryRoot = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", "..", ".."));
            string outputRoot = Path.Combine(repositoryRoot, OutputRelativePath.Replace('/', Path.DirectorySeparatorChar));
            string metricsRoot = Path.Combine(outputRoot, "metrics");
            string capturesRoot = Path.Combine(outputRoot, "captures");
            string debugRoot = Path.Combine(capturesRoot, "debug");
            Directory.CreateDirectory(metricsRoot);
            Directory.CreateDirectory(capturesRoot);
            Directory.CreateDirectory(debugRoot);

            Scene scene = EnsureEvidenceScene();
            Scene previousActiveScene = SceneManager.GetActiveScene();
            if (scene.IsValid()) SceneManager.SetActiveScene(scene);
            Camera camera = FindSceneCamera(scene);
            if (camera == null) throw new InvalidOperationException("The U4E qualification scene camera is missing.");
            Material material = AssetDatabase.LoadAssetAtPath<Material>(MaterialPath);
            if (material == null) throw new InvalidOperationException("Could not load U4E rock material at " + MaterialPath);
            U4EMultiDomainFormationView view = FindFormationView(scene);
            view.Configure(material, Fixtures[0].Seed, false);
            view.SetOverlayConfiguration(false, false);
            view.SetDirectionalDebugOverlays(false);

            Vector3 originalCameraPosition = camera.transform.position;
            Quaternion originalCameraRotation = camera.transform.rotation;
            bool originalOrthographic = camera.orthographic;
            float originalOrthoSize = camera.orthographicSize;
            float originalFieldOfView = camera.fieldOfView;
            float originalAspect = camera.aspect;
            CameraClearFlags originalClearFlags = camera.clearFlags;
            Color originalBackground = camera.backgroundColor;
            bool originalEnabled = camera.enabled;
            var directionalShadows = new List<KeyValuePair<Light, LightShadows>>();
            foreach (Light light in UnityEngine.Object.FindObjectsOfType<Light>(true))
                if (light.gameObject.scene == scene && light.type == LightType.Directional && light.shadows != LightShadows.None)
                {
                    directionalShadows.Add(new KeyValuePair<Light, LightShadows>(light, light.shadows));
                    light.shadows = LightShadows.None;
                }

            var metricsPaths = new List<string>();
            var capturePaths = new List<string>();
            int acceptedD = 0, acceptedE = 0, acceptedControls = 0;
            bool allInvariant = true, allOverlapFree = true;
            try
            {
                for (int fixtureIndex = 0; fixtureIndex < Fixtures.Length; fixtureIndex++)
                {
                    Fixture fixture = Fixtures[fixtureIndex];
                    U4EFormationBuildResult formation = U4ERockFormationBuilder.BuildExperiment(fixture.Seed,
                        0, U4EContactFitMode.GlobalMin25mm, MatterDomainPose.Identity);
                    if (formation == null || !formation.Accepted)
                        throw new InvalidOperationException("Frozen U4E control failed for seed " + fixture.Seed + ": " +
                            (formation == null ? "no result" : formation.RejectionReason));
                    if (formation.AttemptIndex != 0)
                        throw new InvalidOperationException("U4E.2 requires frozen U4E.1 attemptIndex=0; got " + formation.AttemptIndex + " for seed " + fixture.Seed);
                    acceptedControls++;

                    U4EFormationChildBuild moving = FindChild(formation, fixture.MovingSlot);
                    U4EFormationChildBuild parent = FindChild(formation, fixture.ParentSlot);
                    if (!string.Equals(moving.Recipe.parentSlotId, fixture.ParentSlot, StringComparison.Ordinal))
                        throw new InvalidOperationException("Frozen parent slot mismatch for seed " + fixture.Seed + ": " + moving.Recipe.parentSlotId);
                    U4E2PoseSearchContext context = CreateSearchContext(formation, moving, parent);
                    DomainSnapshot[] frozenSnapshots = CaptureSnapshots(formation.Children);
                    U4E2SearchCounters baselineCounters = new U4E2SearchCounters();
                    MatterDomainPose baselinePose = moving.Domain.Pose;
                    U4E2PoseCandidate baselineCandidate = U4E2LocalPoseSearch.ValidateFixedPose(context,
                        baselinePose, baselineCounters);
                    U4E2PoseSearchResult dResult = U4E2LocalPoseSearch.SearchTranslation(context);
                    U4E2PoseSearchResult eResult = U4E2LocalPoseSearch.SearchInterlock(context, dResult);

                    U4E2PoseCandidate dSelected = dResult.selected ?? dResult.validatedFinalists.FirstOrDefault() ??
                        U4E2LocalPoseSearch.ValidateFixedPose(context, baselinePose, new U4E2SearchCounters());
                    U4E2PoseCandidate eSelected = eResult.selected ?? eResult.validatedFinalists.FirstOrDefault() ??
                        U4E2LocalPoseSearch.ValidateFixedPose(context, baselinePose, new U4E2SearchCounters());
                    U4E2SearchCounters dRevalidation = new U4E2SearchCounters();
                    U4E2SearchCounters eRevalidation = new U4E2SearchCounters();
                    if (dResult.selected != null)
                    {
                        U4E2PoseCandidate validation = U4E2LocalPoseSearch.ValidateFixedPose(
                            context, dResult.selected.pose, dRevalidation);
                        dSelected.validation = validation.validation;
                        dSelected.accepted = validation.accepted;
                        dSelected.rejectionReason = validation.rejectionReason;
                    }
                    if (eResult.selected != null)
                    {
                        U4E2PoseCandidate validation = U4E2LocalPoseSearch.ValidateFixedPose(
                            context, eResult.selected.pose, eRevalidation);
                        eSelected.validation = validation.validation;
                        eSelected.accepted = validation.accepted;
                        eSelected.rejectionReason = validation.rejectionReason;
                    }

                    FixtureMetrics metric = new FixtureMetrics
                    {
                        seed = fixture.Seed,
                        attemptIndex = formation.AttemptIndex,
                        archetype = formation.Archetype.ToString(),
                        intent = fixture.Intent,
                        movingSlot = fixture.MovingSlot,
                        movingDomainId = moving.Domain.Id,
                        intendedParentSlot = fixture.ParentSlot,
                        intendedParentId = parent.Domain.Id,
                        acceptedFrozenControl = formation.Accepted,
                        frozenControlRejectionReason = formation.RejectionReason,
                        u4e1ControlParity = CompareToU4E1Reference(repositoryRoot, formation),
                        frozenChildSnapshots = frozenSnapshots,
                        A = CreateMethodMetrics("A_ORIGINAL_U4E_POSE", baselineCandidate, null,
                            baselineCounters, new U4E2SearchCounters(), baselinePose, formation.Children, moving.Domain),
                        D = CreateMethodMetrics("D_MULTI_AXIS_TRANSLATION", dSelected, dResult,
                            dResult.counters, dRevalidation, baselinePose, formation.Children, moving.Domain),
                        E = CreateMethodMetrics("E_MULTI_AXIS_INTERLOCK_POSE", eSelected, eResult,
                            eResult.counters, eRevalidation, baselinePose, formation.Children, moving.Domain)
                    };
                    metric.D.acceptedAreaImprovementSquareMeters = metric.D.patch.acceptedPatchAreaSquareMeters - metric.A.patch.acceptedPatchAreaSquareMeters;
                    metric.D.contactPatchAreaRatioImprovement = metric.D.patch.contactPatchAreaRatio - metric.A.patch.contactPatchAreaRatio;
                    metric.D.diagonalImprovementMeters = metric.D.patch.contactPatchDiagonalMeters - metric.A.patch.contactPatchDiagonalMeters;
                    metric.E.acceptedAreaImprovementSquareMeters = metric.E.patch.acceptedPatchAreaSquareMeters - metric.A.patch.acceptedPatchAreaSquareMeters;
                    metric.E.contactPatchAreaRatioImprovement = metric.E.patch.contactPatchAreaRatio - metric.A.patch.contactPatchAreaRatio;
                    metric.E.diagonalImprovementMeters = metric.E.patch.contactPatchDiagonalMeters - metric.A.patch.contactPatchDiagonalMeters;
                    metric.sourceRecipeGeometryMatterAndMeshInvariantAcrossPoses =
                        metric.A.poseOnlyInvariantToA && metric.D.poseOnlyInvariantToA && metric.E.poseOnlyInvariantToA;
                    metric.siblingPairsFrozenExceptMovingChild = metric.D.childSnapshotsAfterPose.Length == frozenSnapshots.Length &&
                        metric.E.childSnapshotsAfterPose.Length == frozenSnapshots.Length;
                    allInvariant &= metric.sourceRecipeGeometryMatterAndMeshInvariantAcrossPoses && metric.siblingPairsFrozenExceptMovingChild;
                    metric.pairCapturePath = string.Empty;
                    metric.contextCapturePath = string.Empty;
                    metric.debugCapturePath = string.Empty;

                    if (dResult.accepted) acceptedD++;
                    if (eResult.accepted) acceptedE++;
                    allOverlapFree &= (!metric.D.searchAccepted || ContextOverlapFree(metric.D)) &&
                                      (!metric.E.searchAccepted || ContextOverlapFree(metric.E));

                    string seedKey = "seed-" + fixture.Seed.ToString(CultureInfo.InvariantCulture);
                    string metricPath = Path.Combine(metricsRoot, seedKey + ".json");
                    File.WriteAllText(metricPath, JsonUtility.ToJson(metric, true));
                    metricsPaths.Add(ToRepoRelative(repositoryRoot, metricPath));

                    if (fixture.Seed != 7004)
                    {
                        string pairPath = Path.Combine(capturesRoot, seedKey + "-pair.png");
                        string contextPath = Path.Combine(capturesRoot, seedKey + "-context.png");
                        CaptureComparisonBoard(scene, camera, view, formation, moving, parent,
                            baselinePose, dSelected, eSelected, pairOnly: true, pairPath);
                        CaptureComparisonBoard(scene, camera, view, formation, moving, parent,
                            baselinePose, dSelected, eSelected, pairOnly: false, contextPath);
                        metric.pairCapturePath = ToRepoRelative(repositoryRoot, pairPath);
                        metric.contextCapturePath = ToRepoRelative(repositoryRoot, contextPath);
                        capturePaths.Add(metric.pairCapturePath);
                        capturePaths.Add(metric.contextCapturePath);
                        if (fixture.Seed == 7000 || fixture.Seed == 7015 || fixture.Seed == 7017)
                        {
                            U4E2PoseCandidate debugMethod = eResult.accepted ? eSelected : dSelected;
                            string debugPath = Path.Combine(debugRoot, "debug-" + fixture.Seed.ToString(CultureInfo.InvariantCulture) + ".png");
                            CapturePoseDebug(scene, camera, view, formation, moving, parent,
                                baselinePose, debugMethod, debugPath);
                            ClearCaptureObjects(scene);
                            metric.debugCapturePath = ToRepoRelative(repositoryRoot, debugPath);
                            capturePaths.Add(metric.debugCapturePath);
                        }
                        File.WriteAllText(metricPath, JsonUtility.ToJson(metric, true));
                    }
                }

                var receipt = new RunReceipt
                {
                    unityVersion = Application.unityVersion,
                    runUtc = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture),
                    outputPath = ToRepoRelative(repositoryRoot, outputRoot),
                    requestedFixtureCount = Fixtures.Length,
                    acceptedTranslationCount = acceptedD,
                    acceptedInterlockCount = acceptedE,
                    allControlsAccepted = acceptedControls == Fixtures.Length,
                    allSourceAndMatterInvariant = allInvariant,
                    allContextPairsOverlapFree = allOverlapFree,
                    fixtureMetrics = metricsPaths.ToArray(),
                    captureFiles = capturePaths.ToArray()
                };
                File.WriteAllText(Path.Combine(metricsRoot, "summary.json"), JsonUtility.ToJson(receipt, true));
                File.WriteAllText(Path.Combine(outputRoot, "receipt.json"), JsonUtility.ToJson(receipt, true));
                WriteReadme(outputRoot, receipt);
                WritePendingReview(outputRoot);
                return JsonUtility.ToJson(receipt, true);
            }
            finally
            {
                ClearCaptureObjects(scene);
                camera.transform.SetPositionAndRotation(originalCameraPosition, originalCameraRotation);
                camera.orthographic = originalOrthographic;
                camera.orthographicSize = originalOrthoSize;
                camera.fieldOfView = originalFieldOfView;
                camera.aspect = originalAspect;
                camera.clearFlags = originalClearFlags;
                camera.backgroundColor = originalBackground;
                camera.enabled = originalEnabled;
                foreach (KeyValuePair<Light, LightShadows> pair in directionalShadows)
                    if (pair.Key != null) pair.Key.shadows = pair.Value;
                if (previousActiveScene.IsValid() && previousActiveScene.isLoaded) SceneManager.SetActiveScene(previousActiveScene);
            }
        }

        private static U4E2PoseSearchContext CreateSearchContext(U4EFormationBuildResult formation,
            U4EFormationChildBuild moving, U4EFormationChildBuild intendedParent)
        {
            MatterFloat3 direction = TransformDirection(formation.RootPose, moving.Recipe.fitDirectionLocal);
            var parentAnchor = U4E2PoseAnchor.ForDomain(intendedParent.Domain, intendedParent.SurfaceProbes);
            var terrainAnchor = U4E2PoseAnchor.ForGrid(U4EFormationConfiguration.TerrainNodeId,
                new TerrainGridView(formation.TerrainWorld), formation.TerrainBounds, formation.RootPose, formation.TerrainSurfaceProbes);
            var siblings = new List<U4E2PoseAnchor>();
            foreach (U4EFormationChildBuild child in formation.Children)
            {
                if (child.Domain.Id == moving.Domain.Id || child.Domain.Id == intendedParent.Domain.Id) continue;
                siblings.Add(U4E2PoseAnchor.ForDomain(child.Domain, child.SurfaceProbes));
            }
            return new U4E2PoseSearchContext(moving.Domain, moving.SurfaceProbes,
                parentAnchor, direction, terrainAnchor, siblings.ToArray());
        }

        private static MethodMetrics CreateMethodMetrics(string name, U4E2PoseCandidate candidate,
            U4E2PoseSearchResult search, U4E2SearchCounters searchCounters,
            U4E2SearchCounters revalidationCounters, MatterDomainPose baselinePose,
            IReadOnlyList<U4EFormationChildBuild> children, MatterDomain moving)
        {
            DomainSnapshot[] baselineSnapshots = CaptureSnapshots(children);
            MatterDomainPose previousPose = moving.Pose;
            DomainSnapshot[] afterPose = baselineSnapshots;
            bool poseOnlyInvariant;
            try
            {
                moving.SetPose(candidate.pose);
                afterPose = CaptureSnapshots(children);
                poseOnlyInvariant = SameSnapshots(baselineSnapshots, afterPose);
            }
            finally { moving.SetPose(previousPose); }
            U4E2PoseValidation validation = candidate.validation;
            return new MethodMetrics
            {
                method = name,
                searchAccepted = search == null || search.accepted,
                contextAccepted = candidate.accepted,
                rejectionReason = candidate.rejectionReason ?? (search == null ? string.Empty : search.rejectionReason),
                pose = CreatePoseMetrics(candidate, baselinePose),
                patch = CreatePatchMetrics(candidate.directionalPatch),
                parent = CreatePairMetrics(validation == null ? null : validation.parent),
                terrain = CreatePairMetrics(validation == null ? null : validation.terrain),
                frozenSiblings = validation == null ? Array.Empty<PairMetrics>() : validation.siblings.Select(CreatePairMetrics).ToArray(),
                newSiblingContacts = validation == null ? Array.Empty<string>() : validation.newSiblingContacts,
                searchCounters = searchCounters,
                finalRevalidationCounters = revalidationCounters,
                tangentialBoundsSatisfied = Math.Abs(candidate.offsetUMeters) <= U4E2LocalPoseSearch.TangentialBoundMeters + .0001f &&
                                            Math.Abs(candidate.offsetVMeters) <= U4E2LocalPoseSearch.TangentialBoundMeters + .0001f,
                rotationBoundsSatisfied = Math.Abs(candidate.tiltUDegrees) <= 20f && Math.Abs(candidate.tiltVDegrees) <= 20f &&
                                         Math.Abs(candidate.twistNDegrees) <= 15f,
                poseOnlyInvariantToA = poseOnlyInvariant,
                childSnapshotsAfterPose = afterPose,
                acceptedAreaImprovementSquareMeters = candidate.directionalPatch.acceptedPatchAreaSquareMeters,
                contactPatchAreaRatioImprovement = candidate.directionalPatch.contactPatchAreaRatio,
                diagonalImprovementMeters = candidate.directionalPatch.contactPatchDiagonalMeters
            };
        }

        private static PoseMetrics CreatePoseMetrics(U4E2PoseCandidate candidate, MatterDomainPose baseline)
        {
            MatterFloat3 p = candidate.pose.PositionMeters;
            MatterFloat3 b = baseline.PositionMeters;
            float dx = p.X - b.X, dy = p.Y - b.Y, dz = p.Z - b.Z;
            float dot = Math.Abs(candidate.pose.RotationX * baseline.RotationX + candidate.pose.RotationY * baseline.RotationY +
                candidate.pose.RotationZ * baseline.RotationZ + candidate.pose.RotationW * baseline.RotationW);
            float angle = 2f * (float)Math.Acos(Math.Max(-1f, Math.Min(1f, dot))) * Mathf.Rad2Deg;
            return new PoseMetrics
            {
                positionX = p.X, positionY = p.Y, positionZ = p.Z,
                rotationX = candidate.pose.RotationX, rotationY = candidate.pose.RotationY,
                rotationZ = candidate.pose.RotationZ, rotationW = candidate.pose.RotationW,
                offsetUMeters = candidate.offsetUMeters, offsetVMeters = candidate.offsetVMeters,
                offsetNMeters = candidate.offsetNMeters, tiltUDegrees = candidate.tiltUDegrees,
                tiltVDegrees = candidate.tiltVDegrees, twistNDegrees = candidate.twistNDegrees,
                tangentialDisplacementMeters = (float)Math.Sqrt(candidate.offsetUMeters * candidate.offsetUMeters + candidate.offsetVMeters * candidate.offsetVMeters),
                totalTranslationFromAmeters = (float)Math.Sqrt(dx * dx + dy * dy + dz * dz), angularChangeDegrees = angle
            };
        }

        private static PatchMetrics CreatePatchMetrics(U4EDirectionalContactPatchMeasurement value)
        {
            U4EContactWitness[] witnesses = value.contactWitnesses ?? Array.Empty<U4EContactWitness>();
            const int maximumStoredWitnesses = 256;
            int count = Math.Min(maximumStoredWitnesses, witnesses.Length);
            var clipped = new U4EContactWitness[count];
            Array.Copy(witnesses, clipped, count);
            return new PatchMetrics
            {
                hasSupportFacingTriangles = value.hasSupportFacingTriangles,
                hasAcceptedPatch = value.hasAcceptedPatch,
                degeneratePointCluster = value.degeneratePointCluster,
                supportFacingTriangleCount = value.supportFacingTriangleCount,
                acceptedPatchTriangleCount = value.acceptedPatchTriangleCount,
                supportFacingSurfaceAreaSquareMeters = value.supportFacingSurfaceAreaSquareMeters,
                acceptedPatchAreaSquareMeters = value.acceptedPatchAreaSquareMeters,
                contactPatchAreaRatio = value.contactPatchAreaRatio,
                minimumDirectionalGapMeters = value.minimumDirectionalGapMeters,
                areaWeightedP10DirectionalGapMeters = value.areaWeightedP10DirectionalGapMeters,
                areaWeightedMedianDirectionalGapMeters = value.areaWeightedMedianDirectionalGapMeters,
                areaWeightedP90DirectionalGapMeters = value.areaWeightedP90DirectionalGapMeters,
                witnessSpanAMeters = value.witnessSpanAMeters,
                witnessSpanBMeters = value.witnessSpanBMeters,
                contactPatchDiagonalMeters = value.contactPatchDiagonalMeters,
                maximumDirectionalPenetrationMeters = Math.Max(0f, -value.minimumDirectionalGapMeters),
                weakPatchReason = value.weakPatchReason ?? string.Empty,
                acceptedWitnesses = clipped,
                acceptedWitnessCount = witnesses.Length,
                acceptedWitnessesTruncated = witnesses.Length > count
            };
        }

        private static PairMetrics CreatePairMetrics(U4E2ContextPairResult pair)
        {
            if (pair == null || pair.measurement == null) return new PairMetrics();
            U4EContactMeasurement m = pair.measurement;
            return new PairMetrics
            {
                anchorId = pair.anchorId,
                isTerrain = pair.isTerrain,
                isIntendedParent = pair.isIntendedParent,
                acceptedGeometryContact = m.acceptedContact,
                zeroSampledOverlap = m.HasZeroSampledOverlap,
                movingToAnchorPositiveSampleCount = m.aToBPositiveSampleCount,
                anchorToMovingPositiveSampleCount = m.bToAPositiveSampleCount,
                movingToAnchorOverlapEstimateCubicMeters = m.aToBOverlapEstimateCubicMeters,
                anchorToMovingOverlapEstimateCubicMeters = m.bToAOverlapEstimateCubicMeters,
                minimumSurfaceGapMeters = m.minimumSurfaceGapMeters,
                nearContactWitnessCount = m.nearContactWitnessCount
            };
        }

        private static bool ContextOverlapFree(MethodMetrics method)
        {
            if (method == null || !method.contextAccepted || method.parent == null || method.terrain == null ||
                !method.parent.zeroSampledOverlap || !method.terrain.zeroSampledOverlap) return false;
            return method.frozenSiblings.All(pair => pair.zeroSampledOverlap);
        }

        private static ControlParity CompareToU4E1Reference(string repositoryRoot, U4EFormationBuildResult formation)
        {
            string relative = "native/evidence/unity/u4e1-directional-contact/metrics/seed-" +
                formation.Seed.ToString(CultureInfo.InvariantCulture) + ".json";
            string path = Path.Combine(repositoryRoot, relative.Replace('/', Path.DirectorySeparatorChar));
            var parity = new ControlParity { referencePath = relative, referenceFound = File.Exists(path) };
            if (!parity.referenceFound) return parity;
            U4E1Reference reference = JsonUtility.FromJson<U4E1Reference>(File.ReadAllText(path));
            U4E1MethodReference control = reference == null || reference.methods == null ? null :
                reference.methods.FirstOrDefault(method => string.Equals(method.method, "GLOBAL_MIN_25MM", StringComparison.Ordinal));
            if (control == null) return parity;
            parity.attemptIndexMatches = reference.attemptIndex == formation.AttemptIndex;
            parity.sourceGeometryHashMatches = string.Equals(control.sourceGeometryHash, formation.SourceGeometryHash, StringComparison.Ordinal);
            U4E1ChildReference[] expected = control.children ?? Array.Empty<U4E1ChildReference>();
            parity.childCountMatches = expected.Length == formation.Children.Count;
            bool recipes = parity.childCountMatches, geometry = parity.childCountMatches;
            bool contents = parity.childCountMatches, meshes = parity.childCountMatches, spacings = parity.childCountMatches;
            foreach (U4EFormationChildBuild actual in formation.Children)
            {
                U4E1ChildReference prior = expected.FirstOrDefault(child => child.slot == actual.Recipe.slotId);
                if (prior == null) { recipes = geometry = contents = meshes = spacings = false; continue; }
                recipes &= prior.sourceRecipeHash == Hex(actual.Recipe.sourceRecipeHash);
                geometry &= prior.sourceGeometryHash == Hex(actual.SourceGeometryHash);
                contents &= prior.contentHash == Hex(actual.Domain.ComputeContentHash());
                meshes &= prior.meshHash == Hex(actual.MeshBuild.Mesh.DeterministicHash);
                spacings &= Math.Abs(prior.sampleSpacingMeters - actual.Domain.SampleSpacingMeters) < 1e-6f;
            }
            parity.sourceRecipeHashesMatch = recipes;
            parity.sourceGeometryHashesMatch = geometry;
            parity.contentHashesMatch = contents;
            parity.meshHashesMatch = meshes;
            parity.sampleSpacingsMatch = spacings;
            parity.sourceAndDomainHashesMatch = parity.attemptIndexMatches && parity.sourceGeometryHashMatches &&
                recipes && geometry && contents && meshes && spacings;
            return parity;
        }

        private static DomainSnapshot[] CaptureSnapshots(IReadOnlyList<U4EFormationChildBuild> children)
            => children.Select(child => new DomainSnapshot
            {
                slot = child.Recipe.slotId,
                id = child.Domain.Id,
                sourceRecipeHash = Hex(child.Recipe.sourceRecipeHash),
                sourceGeometryHash = Hex(child.SourceGeometryHash),
                contentHash = Hex(child.Domain.ComputeContentHash()),
                meshHash = Hex(child.MeshBuild.Mesh.DeterministicHash),
                spacingMeters = child.Domain.SampleSpacingMeters,
                meshRevision = child.Domain.MeshRevision
            }).ToArray();

        private static bool SameSnapshots(DomainSnapshot[] a, DomainSnapshot[] b)
        {
            if (a == null || b == null || a.Length != b.Length) return false;
            for (int i = 0; i < a.Length; i++)
            {
                DomainSnapshot x = a[i], y = b.FirstOrDefault(value => value.slot == x.slot);
                if (y == null || x.id != y.id || x.sourceRecipeHash != y.sourceRecipeHash ||
                    x.sourceGeometryHash != y.sourceGeometryHash || x.contentHash != y.contentHash ||
                    x.meshHash != y.meshHash || x.meshRevision != y.meshRevision || !x.spacingMeters.Equals(y.spacingMeters)) return false;
            }
            return true;
        }

        private static U4EFormationChildBuild FindChild(U4EFormationBuildResult formation, string slot)
        {
            U4EFormationChildBuild child = formation.Children.FirstOrDefault(value => value.Recipe.slotId == slot);
            return child ?? throw new InvalidOperationException("Seed " + formation.Seed + " is missing frozen slot '" + slot + "'.");
        }

        private static MatterFloat3 TransformDirection(MatterDomainPose pose, MatterFloat3 direction)
        {
            MatterFloat3 origin = pose.TransformPoint(default);
            MatterFloat3 tip = pose.TransformPoint(direction);
            return U4EContactFitter.Normalize(new MatterFloat3(tip.X - origin.X, tip.Y - origin.Y, tip.Z - origin.Z));
        }

        private static void CaptureComparisonBoard(Scene scene, Camera camera, U4EMultiDomainFormationView view,
            U4EFormationBuildResult formation, U4EFormationChildBuild moving,
            U4EFormationChildBuild parent, MatterDomainPose baselinePose,
            U4E2PoseCandidate d, U4E2PoseCandidate e, bool pairOnly, string path)
        {
            var root = NewCaptureRoot(scene, "U4E.2 " + (pairOnly ? "pair" : "context") + " comparison board");
            float[] offsets = pairOnly ? new[] { -4.5f, 0f, 4.5f } : new[] { -9f, 0f, 9f };
            MatterDomainPose[] poses = { baselinePose, d.pose, e.pose };
            string[] labels = { "A  FROZEN CONTROL", "D  TRANSLATION", "E  INTERLOCK" };
            try
            {
                view.BuildPresentation(formation);
                Transform source = FindPresentationRoot(view, formation.Seed);
                FrameComparisonCamera(camera, pairOnly);
                for (int column = 0; column < offsets.Length; column++)
                {
                    Vector3 offset = new Vector3(offsets[column], 0f, 0f);
                    GameObject clone = UnityEngine.Object.Instantiate(source.gameObject);
                    clone.name = "U4E.2 " + labels[column];
                    clone.transform.SetParent(root.transform, true);
                    clone.transform.position += offset;
                    Transform movingObject = clone.transform.Find(moving.Recipe.slotId + " | " + moving.Domain.Id);
                    if (movingObject == null) throw new InvalidOperationException("U4E view is missing moving slot " + moving.Recipe.slotId);
                    movingObject.SetPositionAndRotation(ToUnity(poses[column].PositionMeters) + offset, ToUnity(poses[column]));
                    if (pairOnly)
                    {
                        foreach (U4EFormationChildBuild child in formation.Children)
                        {
                            bool visiblePair = child.Domain.Id == moving.Domain.Id || child.Domain.Id == parent.Domain.Id;
                            Transform childObject = clone.transform.Find(child.Recipe.slotId + " | " + child.Domain.Id);
                            if (childObject != null) childObject.gameObject.SetActive(visiblePair);
                        }
                        Transform terrain = clone.transform.Find("0.50m MatterWorld Terrain");
                        if (terrain != null) terrain.gameObject.SetActive(false);
                    }
                    CreateBoardLabel(root.transform, labels[column], offset + new Vector3(0f, pairOnly ? 2.4f : 8.0f, 0f), camera);
                }
                source.gameObject.SetActive(false);
                SaveCameraCapture(camera, path, 1920, 1080);
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(root);
                view.ClearPreview();
            }
        }

        private static void CapturePoseDebug(Scene scene, Camera camera, U4EMultiDomainFormationView view,
            U4EFormationBuildResult formation, U4EFormationChildBuild moving,
            U4EFormationChildBuild parent, MatterDomainPose baselinePose,
            U4E2PoseCandidate candidate, string path)
        {
            var root = NewCaptureRoot(scene, "U4E.2 patch witness debug");
            Mesh ghost = null;
            try
            {
                view.BuildPresentation(formation);
                Transform source = FindPresentationRoot(view, formation.Seed);
                GameObject clone = UnityEngine.Object.Instantiate(source.gameObject);
                clone.name = "U4E.2 selected pose context";
                clone.transform.SetParent(root.transform, true);
                source.gameObject.SetActive(false);
                Transform movingObject = clone.transform.Find(moving.Recipe.slotId + " | " + moving.Domain.Id);
                if (movingObject == null) throw new InvalidOperationException("U4E view is missing moving slot " + moving.Recipe.slotId);
                movingObject.SetPositionAndRotation(ToUnity(candidate.pose.PositionMeters), ToUnity(candidate.pose));

                ghost = MatterMeshPublisher.CreateWireframe(moving.MeshBuild.Mesh, "U4E.2 original-pose ghost");
                var ghostObject = new GameObject("Original A pose wire ghost");
                ghostObject.transform.SetParent(root.transform, false);
                ghostObject.transform.SetPositionAndRotation(ToUnity(baselinePose.PositionMeters), ToUnity(baselinePose));
                ghostObject.AddComponent<MeshFilter>().sharedMesh = ghost;
                var ghostRenderer = ghostObject.AddComponent<MeshRenderer>();
                ghostRenderer.sharedMaterial = GetUnlitMaterial(new Color(.35f, .85f, 1f, 1f));

                MatterFloat3 frameDirection = TransformDirection(formation.RootPose, moving.Recipe.fitDirectionLocal);
                U4E2ContactFrame frame = new U4E2ContactFrame(frameDirection);
                AddAxes(root.transform, candidate.pose.PositionMeters, frame);
                AddWitnesses(root.transform, candidate.directionalPatch.supportFacingWitnesses,
                    new Color(.95f, .28f, .18f, 1f), "Support-facing probe", 4);
                AddWitnesses(root.transform, candidate.directionalPatch.contactWitnesses,
                    new Color(1f, .82f, .08f, 1f), "Accepted patch probe", 1);
                FrameDebugCamera(camera, candidate.pose.PositionMeters);
                SaveCameraCapture(camera, path, 1920, 1080);
            }
            finally
            {
                if (ghost != null) UnityEngine.Object.DestroyImmediate(ghost);
                UnityEngine.Object.DestroyImmediate(root);
                view.ClearPreview();
            }
        }

        private static void AddAxes(Transform root, MatterFloat3 worldPosition, U4E2ContactFrame frame)
        {
            Vector3 origin = ToUnity(worldPosition);
            CreateAxis(root, origin, ToUnity(frame.N), 1.25f, Color.red, "N toward parent");
            CreateAxis(root, origin, ToUnity(frame.U), 1.0f, Color.green, "U tangent");
            CreateAxis(root, origin, ToUnity(frame.V), 1.0f, Color.blue, "V tangent");
        }

        private static void AddWitnesses(Transform root, U4EContactWitness[] witnesses,
            Color color, string label, int stride)
        {
            witnesses = witnesses ?? Array.Empty<U4EContactWitness>();
            int boundedStride = Math.Max(Math.Max(1, stride), (witnesses.Length + 159) / 160);
            for (int index = 0; index < witnesses.Length; index += boundedStride)
            {
                U4EContactWitness witness = witnesses[index];
                var point = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                point.name = label;
                point.transform.SetParent(root.transform, false);
                point.transform.position = new Vector3(witness.x, witness.y, witness.z);
                point.transform.localScale = Vector3.one * (witness.acceptedContactBand ? .075f : .05f);
                Collider collider = point.GetComponent<Collider>();
                if (collider != null) UnityEngine.Object.DestroyImmediate(collider);
                point.GetComponent<Renderer>().sharedMaterial = GetUnlitMaterial(color);
            }
        }

        private static Transform FindPresentationRoot(U4EMultiDomainFormationView view, int seed)
        {
            Transform target = view.transform.Find("U4E Formation " + seed.ToString(CultureInfo.InvariantCulture));
            return target != null ? target : throw new InvalidOperationException("U4E formation view did not create its presentation root.");
        }

        private static void CreateAxis(Transform root, Vector3 origin, Vector3 direction,
            float length, Color color, string label)
        {
            var line = new GameObject(label).AddComponent<LineRenderer>();
            line.transform.SetParent(root, false);
            line.useWorldSpace = true;
            line.positionCount = 2;
            line.SetPosition(0, origin);
            line.SetPosition(1, origin + direction.normalized * length);
            line.startWidth = line.endWidth = .035f;
            line.material = GetUnlitMaterial(color);
            line.startColor = line.endColor = color;
        }

        private static void CreateBoardLabel(Transform root, string text, Vector3 position, Camera camera)
        {
            var label = new GameObject(text);
            label.transform.SetParent(root, false);
            label.transform.position = position;
            label.transform.rotation = Quaternion.LookRotation(-camera.transform.forward, camera.transform.up) * Quaternion.Euler(0f, 180f, 0f);
            TextMesh mesh = label.AddComponent<TextMesh>();
            mesh.text = text;
            mesh.anchor = TextAnchor.MiddleCenter;
            mesh.alignment = TextAlignment.Center;
            mesh.fontSize = 32;
            mesh.characterSize = .05f;
            mesh.color = Color.white;
        }

        private static Material GetUnlitMaterial(Color color)
        {
            Shader shader = Shader.Find("HDRP/Unlit") ?? Shader.Find("Unlit/Color") ?? Shader.Find("Standard");
            var material = new Material(shader) { color = color, name = "U4E.2 debug overlay" };
            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", color);
            if (material.HasProperty("_Color")) material.SetColor("_Color", color);
            return material;
        }

        private static GameObject NewCaptureRoot(Scene scene, string name)
        {
            var root = new GameObject(name);
            if (scene.IsValid() && scene.isLoaded) SceneManager.MoveGameObjectToScene(root, scene);
            return root;
        }

        private static void FrameComparisonCamera(Camera camera, bool pairOnly)
        {
            camera.orthographic = true;
            camera.orthographicSize = pairOnly ? 4.5f : 8.5f;
            Vector3 cameraPosition = pairOnly ? new Vector3(0f, 5.5f, -18f) : new Vector3(0f, 11.5f, -36f);
            Vector3 cameraTarget = pairOnly ? new Vector3(0f, .5f, 0f) : new Vector3(0f, 4f, 0f);
            camera.transform.SetPositionAndRotation(cameraPosition,
                Quaternion.LookRotation(cameraTarget - cameraPosition, Vector3.up));
            camera.backgroundColor = new Color(.055f, .07f, .09f, 1f);
            camera.clearFlags = CameraClearFlags.SolidColor;
        }

        private static void FrameDebugCamera(Camera camera, MatterFloat3 focusPoint)
        {
            Vector3 focus = ToUnity(focusPoint);
            camera.orthographic = true;
            camera.orthographicSize = 5.5f;
            Vector3 position = focus + new Vector3(0f, 7f, -22f);
            camera.transform.SetPositionAndRotation(position, Quaternion.LookRotation(focus - position, Vector3.up));
            camera.backgroundColor = new Color(.055f, .07f, .09f, 1f);
            camera.clearFlags = CameraClearFlags.SolidColor;
        }

        private static void SaveCameraCapture(Camera camera, string path, int width, int height)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            RenderTexture oldTarget = camera.targetTexture;
            RenderTexture oldActive = RenderTexture.active;
            float oldAspect = camera.aspect;
            var target = new RenderTexture(width, height, 24, RenderTextureFormat.ARGB32) { antiAliasing = 1 };
            var image = new Texture2D(width, height, TextureFormat.RGB24, false, false);
            try
            {
                camera.targetTexture = target;
                camera.aspect = width / (float)height;
                camera.Render();
                RenderTexture.active = target;
                image.ReadPixels(new Rect(0, 0, width, height), 0, 0);
                image.Apply(false, false);
                File.WriteAllBytes(path, image.EncodeToPNG());
            }
            finally
            {
                camera.targetTexture = oldTarget;
                camera.aspect = oldAspect;
                RenderTexture.active = oldActive;
                UnityEngine.Object.DestroyImmediate(image);
                target.Release();
                UnityEngine.Object.DestroyImmediate(target);
            }
        }

        private static void ClearCaptureObjects(Scene scene)
        {
            if (!scene.IsValid() || !scene.isLoaded) return;
            foreach (GameObject root in scene.GetRootGameObjects())
                if (root.name.StartsWith("U4E.2 ", StringComparison.Ordinal))
                    UnityEngine.Object.DestroyImmediate(root);
        }

        private static Scene EnsureEvidenceScene()
        {
            Scene scene = SceneManager.GetSceneByPath(ScenePath);
            if (scene.IsValid() && scene.isLoaded) return scene;
            return EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Additive);
        }

        private static U4EMultiDomainFormationView FindFormationView(Scene scene)
        {
            foreach (U4EMultiDomainFormationView view in UnityEngine.Object.FindObjectsOfType<U4EMultiDomainFormationView>(true))
                if (view.gameObject.scene == scene) return view;
            throw new InvalidOperationException("The U4E qualification scene is missing U4EMultiDomainFormationView.");
        }

        private static Camera FindSceneCamera(Scene scene)
        {
            foreach (Camera camera in UnityEngine.Object.FindObjectsOfType<Camera>(true))
                if (camera.gameObject.scene == scene) return camera;
            return null;
        }

        private static string RepositoryRoot()
            => Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", "..", ".."));

        private static string ToRepoRelative(string root, string path)
            => path.Replace(root + Path.DirectorySeparatorChar, string.Empty).Replace('\\', '/');

        private static string Hex(ulong value) => "0x" + value.ToString("X16", CultureInfo.InvariantCulture);
        private static Vector3 ToUnity(MatterFloat3 value) => new Vector3(value.X, value.Y, value.Z);
        private static Quaternion ToUnity(MatterDomainPose pose)
            => new Quaternion(pose.RotationX, pose.RotationY, pose.RotationZ, pose.RotationW);

        private static void WriteReadme(string outputRoot, RunReceipt receipt)
        {
            string readme = "# U4E.2 — Interlock pose search\n\n" +
                "This bounded Unity Editor experiment compares the original frozen U4E pose (A), deterministic three-axis translation (D), and bounded local-frame interlock pose (E) for five U4E.1 attempt-index-0 fixtures. All candidate validation uses the fixed directional patch metric, 12.5 mm maximum penetration, bidirectional zero sampled overlap, and frozen terrain/sibling context.\n\n" +
                "Search bounds are U/V ±0.50 m; the D coarse lattice is 125 mm with up to eight coarse seeds refined inside ±125 mm at 25 mm increments. E evaluates the 5×5×3 orientation lattice (U/V ±20° in 10° increments, N twist ±15°) on those D seeds. N solving targets the nearest support-facing directional surface at 0 mm to avoid using out-of-footprint probes as a push-through signal; area-weighted median remains a recorded score, never a global-min-primary ranking.\n\n" +
                "Evidence is unreviewed. Machine acceptance does not establish visual plausibility. Independent review must inspect every matched A/D/E pair/context board and the patch-debug captures before disposition. No Windows Player build was requested.\n\n" +
                "Result: `" + receipt.result + "`\n\n" +
                "Per-seed metrics live in `metrics/`; matched 1920×1080 PNGs live in `captures/`. `receipt.json` records the run summary.\n";
            File.WriteAllText(Path.Combine(outputRoot, "README.md"), readme);
        }

        private static void WritePendingReview(string outputRoot)
        {
            File.WriteAllText(Path.Combine(outputRoot, "review.md"),
                "# Independent visual review\n\n" +
                "Status: UNREVIEWED — pending a separate read-only visual review.\n\n" +
                "Do not change this to PASS from implementation or automated evidence alone. Review the matched A/D/E pair and full-context captures for seeds 7000, 7010, 7015, and 7017, plus debug captures 7000, 7015, and 7017. Record readable contact footprint, believable semantic placement, clipping/embedding, and whether the selected interlock is visually superior without looking like arbitrary reorientation.\n");
        }
    }
}
