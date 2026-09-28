using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using UnityEngine;
using UnityEngine.Rendering;
using Wildkin.Matter;
using Stopwatch = System.Diagnostics.Stopwatch;

namespace Wildkin.Matter.Unity
{
    /// <summary>Deterministic U4D scene owner and evidence driver. It owns domains, meshes, and preview objects.</summary>
    public sealed class MatterDomainQualificationView : MonoBehaviour
    {
        private const int SourceSeed = 4102;
        private const float WorldSpacing = .5f;
        private const string Domain025Id = "u4d-rock-025-capstone";
        private const string Domain0125Id = "u4d-rock-0125-boulder";
        private const string TopologyScope = "U4C3 qualified recorded genus-zero source family, all 256 sign masks/orientations, face-saddle decider, deterministic stress; arbitrary trilinear interior connectivity and higher-genus surfaces remain unqualified.";
        private const float RestSpaceProofTextureScale = 6f;
        private const float RestSpaceProofNormalStrength = 1f;
        private const float DomainAabbOverlapToleranceMeters = .05f;

        [SerializeField] private Material _surfaceMaterial;
        [SerializeField] private bool _autoInitialize = true;
        [SerializeField] private bool _showDomainBounds;
        [SerializeField] private bool _showMeshingRegions;

        private readonly List<GameObject> _generatedObjects = new List<GameObject>();
        private readonly List<Mesh> _generatedMeshes = new List<Mesh>();
        private readonly List<GameObject> _overlayObjects = new List<GameObject>();
        private readonly List<Mesh> _overlayMeshes = new List<Mesh>();
        private readonly List<Material> _overlayMaterials = new List<Material>();
        private readonly Dictionary<string, DomainRuntime> _runtimeDomains = new Dictionary<string, DomainRuntime>(StringComparer.Ordinal);
        private MatterDomainCollection _domains;
        private MatterWorld _world;
        private MatterMeshData _worldMeshData;
        private GameObject _worldObject;
        private Material _runtimeSurfaceMaterial;
        private Material _fallbackSurfaceMaterial;
        private WorldMetrics _worldMetrics;
        private SequenceMetrics _sequence;
        private bool _initialized;

        private Material ActiveSurfaceMaterial => _runtimeSurfaceMaterial != null
            ? _runtimeSurfaceMaterial : _fallbackSurfaceMaterial;

        public bool IsInitialized => _initialized;
        public MatterWorld World => _world;
        public MatterDomainCollection Domains => _domains;

        public void ConfigureSceneMaterial(Material material, bool autoInitialize = true)
        {
            _surfaceMaterial = material;
            _autoInitialize = autoInitialize;
        }

        /// <summary>Remove transient preview meshes before saving the reproducible Player scene.</summary>
        public void PrepareSceneForBuild()
        {
            ClearGenerated();
            _domains = null;
            _runtimeDomains.Clear();
            _world = null;
            _worldMetrics = null;
            _sequence = null;
        }

        public string InspectDomainJson(string id)
        {
            EnsureInitialized();
            DomainRuntime runtime = GetRuntime(id);
            RefreshDomainMetrics(runtime);
            return JsonUtility.ToJson(runtime.Metrics, true);
        }

        public string ListDomainsJson()
            => JsonUtility.ToJson(new DomainIdList { ids = ListDomainIds() }, true);

        [Serializable]
        private sealed class DomainIdList { public string[] ids; }

        private sealed class DomainRuntime
        {
            public MatterDomain Domain;
            public MatterDomainSurfaceNetsMesher Mesher;
            public MatterDomainMeshBuildResult LastBuild;
            public GameObject Root;
            public Mesh UnityMesh;
            public DomainMetrics Metrics;
        }

        [Serializable]
        private sealed class ReportDocument
        {
            public string phase = "U4D Local High-Resolution MatterDomain qualification";
            public string topologyScope = TopologyScope;
            public bool optionalSpacing0625Tested;
            public WorldMetrics world;
            public DomainMetrics[] domains;
            public SequenceMetrics sequence;
        }

        [Serializable]
        private sealed class WorldMetrics
        {
            public float sampleSpacingMeters;
            public string stableFixture = "MatterWorldFactory qualification world";
            public int sourceSeed = MatterWorldFactory.DefaultSourceSeed;
            public int sourceVersion = MatterWorldFactory.QualificationSourceVersion;
            public int sampleCount;
            public string hashBoundsMin;
            public string hashBoundsMaxExclusive;
            public string initialContentHash;
            public string finalContentHash;
            public long initialRevision;
            public long finalRevision;
            public int initialEditCount;
            public int finalEditCount;
            public int surfaceRegions;
            public double surfaceMesherCpuMilliseconds;
            public double surfaceRegionWallMilliseconds;
            public double surfaceCombineMilliseconds;
            public string surfaceMeshHash;
            public int surfaceVertices;
            public int surfaceTriangles;
            public string objectName = "U4D World Terrain 0.50m";
        }

        [Serializable]
        private sealed class DomainMetrics
        {
            public string id;
            public string sourceArchetype;
            public int sourceSeed;
            public string sourceGeometryHash;
            public bool sourceReferenceDiscardedAfterBake;
            public float sampleSpacingMeters;
            public string minInclusive;
            public string maxExclusive;
            public string dimensions;
            public int sampleCount;
            public int occupiedSampleCount;
            public long rawPayloadBytes;
            public string managedOverhead = "Not estimated; raw density+material payload is reported separately.";
            public long contentRevision;
            public long meshRevision;
            public long meshContentRevision;
            public long initialRevision;
            public string initialContentHash;
            public string initialMeshHash;
            public string contentHash;
            public string meshHash;
            public float positionX, positionY, positionZ;
            public float rotationX, rotationY, rotationZ, rotationW;
            public int meshingRegions;
            public int activeCells;
            public int ambiguousFaces;
            public int ambiguousCells;
            public int multiComponentCells;
            public int maxComponentsPerCell;
            public int extraSurfaceVertices;
            public int missingCrossingEdgeMappings;
            public int vertexCount;
            public int triangleCount;
            public bool connectedManifoldWithinU4C3Scope;
            public string topologyValidationIssue;
            public double sourceSdfBakeMilliseconds;
            public double domainCopyMilliseconds;
            public double initialMesherCpuMilliseconds;
            public double initialRegionWallMilliseconds;
            public double initialCombineMilliseconds;
            public double initialMeshFillMilliseconds;
            public double initialMeshApplyMilliseconds;
            public double initialMeshUploadMilliseconds;
            public int terrainOverlapSolidSampleCount;
            public double estimatedTerrainOverlapCubicMeters;
            public string worldBoundsMinMeters;
            public string worldBoundsMaxMeters;
            public int occupiedWorldSampleCentersInsideDomainAabb;
            public double estimatedWorldOccupancyInsideAabbCubicMeters;
            public float aabbOverlapToleranceMeters;
            public string aabbOverlapAuthorityResolution;
            public float terrainContactHeightMeters;
            public float objectBottomHeightMeters;
            public float contactGapMeters;
            public bool aabbOverlapBeyondTolerance;
            public bool initialContactRecorded;
            public float initialTerrainContactHeightMeters;
            public float initialObjectBottomHeightMeters;
            public float initialContactGapMeters;
            public float placementClearanceAdjustmentMeters;
            public EditMetrics lastEdit;
        }

        [Serializable]
        public sealed class EditMetrics
        {
            public bool changed;
            public float centerLocalX, centerLocalY, centerLocalZ;
            public float radiusMeters;
            public float centerWorldX, centerWorldY, centerWorldZ;
            public int samplesExamined;
            public int changedSamples;
            public int directChangedRegions;
            public int rebuiltRegions;
            public int reusedRegions;
            public int totalRegions;
            public double regionMesherCpuMilliseconds;
            public double regionWallMilliseconds;
            public double combinedMeshMilliseconds;
            public double domainPublicationMilliseconds;
            public double unityMeshFillMilliseconds;
            public double unityMeshApplyMilliseconds;
            public double unityMeshUploadMilliseconds;
            public double editToVisibleMilliseconds;
            public long contentRevision;
            public long meshRevision;
            public string contentHash;
            public string meshHash;
            public bool topologyManifoldWithinU4C3Scope;
            public string topologyValidationIssue;
            public bool movedPoseWorldEdit;
            public string expectedTargetLocalAddress;
            public bool expectedTargetSampleIsAir;
            public string changedLocalSamples;
        }

        [Serializable]
        public sealed class PersistenceMetrics
        {
            public double saveMilliseconds;
            public double loadMilliseconds;
            public long jsonBytes;
            public string savedFile;
            public bool runtimeDomainRemovedBeforeReload;
            public bool sourceMeshAvailableDuringReload;
            public bool contentHashMatches;
            public bool transformMatches;
            public bool remeshedGeometryMatches;
            public bool editedCavityRemainsAir;
            public bool loadedDomainPublished;
            public double sourceFreeRemeshCpuMilliseconds;
            public double sourceFreeCombineMilliseconds;
            public double sourceFreeUnityPublicationMilliseconds;
            public string loadedContentHash;
            public string loadedMeshHash;
        }

        [Serializable]
        private sealed class SequenceMetrics
        {
            public bool worldAndDomainsUseIndependentSpacing;
            public bool onlyOneLocalDomainWasEdited;
            public bool worldContentUnchanged;
            public bool otherDomainUnchanged;
            public bool editRemeshedOnlyAffectedRegions;
            public bool movedTransformPreservedMatterHash;
            public bool movedTransformDidNotRemesh;
            public bool movedWorldTargetMappedCorrectly;
            public bool oldPoseTargetWasNoOp;
            public bool saveReloadUsedNoSourceGeometry;
            public bool savedCavityRemainedRemoved;
            public bool savedMeshDeterministicallyRebuilt;
            public bool sourceHighResolutionObjectSpansMultipleRegions;
            public bool restSpacePoseProofPreservedMatterHash;
            public bool restSpacePoseProofPreservedMeshHash;
            public bool worldBoundsAndAabbOverlapRecorded;
            public bool noPositiveLocalSampleOverlapWithWorld;
            public bool noAdaptiveTerrainStitching;
            public string restSpacePoseBCapture;
            public float restSpaceProofTextureScale;
            public float restSpaceProofNormalStrength;
            public string aabbOverlapInterpretation;
            public string topologyScope = TopologyScope;
            public string oldPoseTargetIssue;
            public string localCavityAddress;
            public string targetLocalAddress;
            public string outputRoot;
            public EditMetrics localEdit;
            public EditMetrics movedWorldEdit;
            public PersistenceMetrics persistence;
        }

        private sealed class ReadOnlyWorldGrid : IMatterReadOnlyGrid
        {
            private readonly MatterWorld _matterWorld;
            public float SampleSpacingMeters => _matterWorld.SampleSpacingMeters;
            public ReadOnlyWorldGrid(MatterWorld matterWorld) => _matterWorld = matterWorld;
            public MatterSample ReadSample(MatterSampleAddress address) => _matterWorld.ReadSample(address);
        }

        private static readonly MatterBounds WorldRenderBounds = new MatterBounds(
            new MatterInt3(-24, -8, -24), new MatterInt3(24, 3, 24));

        private IEnumerator Start()
        {
            if (!_autoInitialize) yield break;
            InitializeQualification();
            string evidenceRoot = ReadArgument("--u4d-evidence-root=");
            if (string.IsNullOrWhiteSpace(evidenceRoot)) yield break;
            RunFlagshipSequence(evidenceRoot);
            WriteEvidence(evidenceRoot);
            Camera playerCamera = FindSceneCamera();
            if (playerCamera == null) throw new InvalidOperationException("U4D Player capture requires the scene's tagged camera.");
            FrameOverview(playerCamera);
            // Let delayed destruction of the temporary debug overlays complete before
            // the standalone overview is rendered, and give HDRP temporal AA a few
            // clean frames after the synchronous sequence/camera moves.
            yield return null;
            for (int frame = 0; frame < 8; frame++) yield return new WaitForEndOfFrame();
            string playerCapture = Path.Combine(evidenceRoot, "player", "capture.png");
            RockStampGalleryView.Capture(FindSceneCamera(), playerCapture, 1920, 1080);
            WritePlayerReceipt(Path.Combine(evidenceRoot, "player", "receipt.json"), playerCapture);
#if !UNITY_EDITOR
            Application.Quit(0);
#endif
        }

        public void InitializeQualification()
        {
            ClearGenerated();
            _domains = new MatterDomainCollection();
            _runtimeDomains.Clear();
            _sequence = new SequenceMetrics { noAdaptiveTerrainStitching = true };
            EnsureSurfaceMaterial();

            _world = MatterWorldFactory.CreateQualificationWorld(MatterWorldFactory.DefaultSourceSeed, WorldSpacing);
            _worldMetrics = CreateWorldMesh();
            CreateDomain(Domain025Id, SourceRockArchetype.CapstoneSlab, 4101, .25f, -3.5f, 0f);
            CreateDomain(Domain0125Id, SourceRockArchetype.ChunkyBoulder, SourceSeed, .125f, 3.5f, -9f);
            _worldMetrics.finalContentHash = _worldMetrics.initialContentHash;
            _worldMetrics.finalRevision = _world.Revision;
            _worldMetrics.finalEditCount = _world.EditCount;
            _initialized = true;
            SetDebugOverlays(_showDomainBounds, _showMeshingRegions);
            UpdateContactMetrics();
        }

        public MatterDomain GetDomain(string id)
        {
            EnsureInitialized();
            return _domains.GetRequired(id);
        }

        public string[] ListDomainIds()
        {
            EnsureInitialized();
            MatterDomain[] domains = _domains.GetAllSorted();
            var ids = new string[domains.Length];
            for (int index = 0; index < domains.Length; index++) ids[index] = domains[index].Id;
            return ids;
        }

        public MatterDomain CreateDomain(string id, SourceRockArchetype archetype, int seed,
            float spacing, MatterFloat3 worldPosition, float yawDegrees = 0f)
        {
            EnsureInitialized();
            return CreateDomainInternal(id, archetype, seed, spacing, worldPosition.X,
                new Vector3(worldPosition.X, worldPosition.Y, worldPosition.Z), yawDegrees).Domain;
        }

        public EditMetrics EditLocal(string id, MatterFloat3 center, float radius)
            => Edit(id, center, radius, false);

        public EditMetrics EditWorld(string id, MatterFloat3 center, float radius)
            => Edit(id, center, radius, true);

        public void MoveDomain(string id, MatterFloat3 position, float yawDegrees)
        {
            EnsureInitialized();
            DomainRuntime runtime = GetRuntime(id);
            Quaternion rotation = Quaternion.Euler(0f, yawDegrees, 0f);
            MatterDomainPose pose = ToPose(position, rotation);
            runtime.Domain.SetPose(pose);
            ApplyPose(runtime);
            RefreshDomainMetrics(runtime);
            SetDebugOverlays(_showDomainBounds, _showMeshingRegions);
        }

        public PersistenceMetrics SaveReloadDomain(string id, string savePath)
        {
            EnsureInitialized();
            if (string.IsNullOrWhiteSpace(savePath)) throw new ArgumentException("Save path is required.", nameof(savePath));
            DomainRuntime runtime = GetRuntime(id);
            var metrics = new PersistenceMetrics { savedFile = Path.GetFullPath(savePath) };
            MatterDomain original = runtime.Domain;
            ulong expectedContentHash = original.ComputeContentHash();
            ulong expectedMeshHash = runtime.LastBuild.Mesh.DeterministicHash;
            MatterDomainPose expectedPose = original.Pose;
            MatterSampleAddress firstCavity = ParseAddress(_sequence.localCavityAddress);
            bool hasMovedCavity = !string.IsNullOrEmpty(_sequence.targetLocalAddress);
            MatterSampleAddress movedCavity = hasMovedCavity ? ParseAddress(_sequence.targetLocalAddress) : default;
            string saveJson;
            var saveWatch = Stopwatch.StartNew();
            saveJson = MatterDomainSaveCodec.Write(original);
            string fullPath = Path.GetFullPath(savePath);
            Directory.CreateDirectory(Path.GetDirectoryName(fullPath));
            File.WriteAllText(fullPath, saveJson);
            saveWatch.Stop();
            metrics.saveMilliseconds = saveWatch.Elapsed.TotalMilliseconds;
            metrics.jsonBytes = new FileInfo(fullPath).Length;

            _domains.Remove(id);
            _runtimeDomains.Remove(id);
            DestroyRuntimeRecord(runtime);
            original = null;
            GC.Collect();
            metrics.runtimeDomainRemovedBeforeReload = !_domains.TryGet(id, out _) && runtime.Domain == null &&
                runtime.Mesher == null && runtime.LastBuild == null;
            if (!metrics.runtimeDomainRemovedBeforeReload)
                throw new InvalidOperationException("The original MatterDomain runtime, mesher, or mesh build is still retained during reload.");
            metrics.sourceMeshAvailableDuringReload = false;

            var loadWatch = Stopwatch.StartNew();
            MatterDomain loaded = MatterDomainSaveCodec.Read(File.ReadAllText(fullPath));
            loadWatch.Stop();
            metrics.loadMilliseconds = loadWatch.Elapsed.TotalMilliseconds;
            metrics.contentHashMatches = loaded.ComputeContentHash() == expectedContentHash;
            metrics.transformMatches = SamePose(loaded.Pose, expectedPose);
            bool firstCavityAir = !loaded.ReadSample(firstCavity).IsSolid;
            bool movedCavityAir = !hasMovedCavity || !loaded.ReadSample(movedCavity).IsSolid;
            metrics.editedCavityRemainsAir = firstCavityAir && movedCavityAir;

            DomainMetrics persistedDiagnostics = runtime.Metrics;
            var newRuntime = new DomainRuntime
            {
                Domain = loaded,
                Mesher = new MatterDomainSurfaceNetsMesher(),
                Metrics = persistedDiagnostics
            };
            newRuntime.LastBuild = newRuntime.Mesher.Build(loaded);
            metrics.sourceFreeRemeshCpuMilliseconds = newRuntime.LastBuild.RebuiltMesherCpuMilliseconds;
            metrics.sourceFreeCombineMilliseconds = newRuntime.LastBuild.CombineMilliseconds;
            var publishWatch = Stopwatch.StartNew();
            PublishDomainMesh(newRuntime, newRuntime.LastBuild);
            publishWatch.Stop();
            metrics.sourceFreeUnityPublicationMilliseconds = publishWatch.Elapsed.TotalMilliseconds;
            metrics.loadedDomainPublished = newRuntime.Domain.MeshContentRevision == newRuntime.Domain.ContentRevision;
            metrics.remeshedGeometryMatches = newRuntime.LastBuild.Mesh.DeterministicHash == expectedMeshHash;
            metrics.loadedContentHash = "0x" + loaded.ComputeContentHash().ToString("X16");
            metrics.loadedMeshHash = "0x" + newRuntime.LastBuild.Mesh.DeterministicHash.ToString("X16");
            _domains.Add(loaded);
            _runtimeDomains.Add(id, newRuntime);
            RefreshDomainMetrics(newRuntime);
            SetDebugOverlays(_showDomainBounds, _showMeshingRegions);
            _sequence.persistence = metrics;
            _sequence.saveReloadUsedNoSourceGeometry = metrics.runtimeDomainRemovedBeforeReload &&
                !metrics.sourceMeshAvailableDuringReload && metrics.contentHashMatches && metrics.transformMatches &&
                metrics.remeshedGeometryMatches && metrics.editedCavityRemainsAir && metrics.loadedDomainPublished;
            UpdateContactMetrics();
            return metrics;
        }

        public void SetDebugOverlays(bool showBounds, bool showRegions)
        {
            _showDomainBounds = showBounds;
            _showMeshingRegions = showRegions;
            ClearOverlays();
            if (!_initialized && _world == null) return;
            if (showBounds)
            {
                CreateWorldBoundsOverlay();
                if (_domains != null)
                    foreach (MatterDomain domain in _domains.GetAllSorted())
                        CreateDomainBoundsOverlay(GetRuntime(domain.Id));
            }
            if (showRegions && _runtimeDomains.Count > 0)
                foreach (DomainRuntime runtime in _runtimeDomains.Values)
                    CreateDomainRegionsOverlay(runtime);
        }

        public void RunFlagshipSequence(string evidenceRoot)
        {
            EnsureInitialized();
            if (string.IsNullOrWhiteSpace(evidenceRoot)) throw new ArgumentException("Evidence root is required.", nameof(evidenceRoot));
            string root = Path.GetFullPath(evidenceRoot);
            Directory.CreateDirectory(Path.Combine(root, "captures"));
            Directory.CreateDirectory(Path.Combine(root, "metrics"));
            Directory.CreateDirectory(Path.Combine(root, "player"));
            _sequence.outputRoot = root;

            Camera camera = FindSceneCamera();
            if (camera == null) throw new InvalidOperationException("U4D evidence requires the scene's tagged camera.");
            Transform cameraTransform = camera.transform;
            Vector3 previousPosition = cameraTransform.position;
            Quaternion previousRotation = cameraTransform.rotation;
            float previousSize = camera.orthographicSize;
            bool previousOrthographic = camera.orthographic;
            try
            {
                SetDebugOverlays(false, false);
                FrameOverview(camera);
                Capture(camera, Path.Combine(root, "captures", "01-overview.png"));

                DomainRuntime coarse = GetRuntime(Domain025Id);
                FrameCloseup(camera, coarse, 2.5f);
                Capture(camera, Path.Combine(root, "captures", "02-025-domain.png"));

                DomainRuntime hero = GetRuntime(Domain0125Id);
                FrameCloseup(camera, hero, 2.0f);
                Capture(camera, Path.Combine(root, "captures", "03-0125-domain.png"));

                FrameOverview(camera);
                SetDebugOverlays(true, true);
                Capture(camera, Path.Combine(root, "captures", "04-debug-domains.png"));
                SetDebugOverlays(false, false);

                MatterDomainPose originalPose = hero.Domain.Pose;
                ulong restSpaceContentHash = hero.Domain.ComputeContentHash();
                ulong restSpaceMeshHash = hero.LastBuild.Mesh.DeterministicHash;
                MatterDomainPose restSpacePoseB = CreateMovedPose(originalPose);
                hero.Domain.SetPose(restSpacePoseB);
                ApplyPose(hero);
                MatterDomainMeshBuildResult restSpacePoseBuild = hero.Mesher.Build(hero.Domain);
                FrameCloseup(camera, hero, 2.0f);
                string restSpaceCapture = "captures/04b-rest-space-pose-b.png";
                Capture(camera, Path.Combine(root, restSpaceCapture));
                _sequence.restSpacePoseProofPreservedMatterHash = hero.Domain.ComputeContentHash() == restSpaceContentHash;
                _sequence.restSpacePoseProofPreservedMeshHash = restSpacePoseBuild.RebuiltRegionCount == 0 &&
                    restSpacePoseBuild.Mesh.DeterministicHash == restSpaceMeshHash;
                _sequence.restSpacePoseBCapture = restSpaceCapture;
                _sequence.restSpaceProofTextureScale = RestSpaceProofTextureScale;
                _sequence.restSpaceProofNormalStrength = RestSpaceProofNormalStrength;
                hero.Domain.SetPose(originalPose);
                ApplyPose(hero);
                hero.Mesher.Build(hero.Domain);
                if (!_sequence.restSpacePoseProofPreservedMatterHash || !_sequence.restSpacePoseProofPreservedMeshHash)
                    throw new InvalidOperationException("The rest-space pose proof changed matter identity or rebuilt its local mesh.");

                MatterSampleAddress oldPoseTargetLocal = FindSolidSampleNear(hero.Domain, new MatterInt3(4, 0, 4));
                MatterFloat3 oldPoseTargetWorld = originalPose.TransformPoint(hero.Domain.LocalSampleToMeters(oldPoseTargetLocal));
                MatterSampleAddress localCavity = FindSolidSampleNear(hero.Domain, new MatterInt3(0, 0, -10));
                MatterFloat3 localCut = hero.Domain.LocalSampleToMeters(localCavity);
                _sequence.localCavityAddress = localCavity.ToString();
                EditMetrics localEdit = EditLocal(Domain0125Id, localCut, .42f);
                if (!localEdit.changed) throw new InvalidOperationException("The selected U4D local cavity did not change solid samples.");
                hero = GetRuntime(Domain0125Id);
                AssertCurrentDomainManifold(hero, out bool localManifold, out string localIssue);
                localEdit.topologyManifoldWithinU4C3Scope = localManifold;
                localEdit.topologyValidationIssue = localIssue;
                _sequence.localEdit = localEdit;
                FrameCloseup(camera, hero, 2.0f);
                Capture(camera, Path.Combine(root, "captures", "05-edited-domain.png"));

                ulong contentBeforeMove = hero.Domain.ComputeContentHash();
                ulong meshBeforeMove = hero.LastBuild.Mesh.DeterministicHash;
                long meshRevisionBeforeMove = hero.Domain.MeshRevision;
                MatterDomainPose movedPose = CreateMovedPose(originalPose);
                hero.Domain.SetPose(movedPose);
                ApplyPose(hero);
                MatterDomainMeshBuildResult movedBuild = hero.Mesher.Build(hero.Domain);
                _sequence.movedTransformPreservedMatterHash = hero.Domain.ComputeContentHash() == contentBeforeMove;
                _sequence.movedTransformDidNotRemesh = movedBuild.RebuiltRegionCount == 0 &&
                    movedBuild.Mesh.DeterministicHash == meshBeforeMove && hero.Domain.MeshRevision == meshRevisionBeforeMove;

                MatterDomainEditResult oldPoseEdit = hero.Domain.RemoveSphereWorld(oldPoseTargetWorld, .22f);
                _sequence.oldPoseTargetWasNoOp = !oldPoseEdit.Changed && hero.Domain.ContentRevision == localEdit.contentRevision;
                _sequence.oldPoseTargetIssue = oldPoseEdit.Changed
                    ? "The previous world coordinate still modified the moved domain."
                    : "No samples changed at the previous pose coordinate.";

                MatterSampleAddress movedLocalTarget = FindSolidSampleNear(hero.Domain, new MatterInt3(4, 2, 4));
                MatterFloat3 movedWorldTarget = hero.Domain.LocalSampleToWorld(movedLocalTarget);
                EditMetrics worldEdit = EditWorld(Domain0125Id, movedWorldTarget, .24f);
                worldEdit.movedPoseWorldEdit = true;
                worldEdit.expectedTargetLocalAddress = movedLocalTarget.ToString();
                worldEdit.expectedTargetSampleIsAir = !hero.Domain.ReadSample(movedLocalTarget).IsSolid;
                _sequence.targetLocalAddress = movedLocalTarget.ToString();
                _sequence.movedWorldTargetMappedCorrectly = worldEdit.changed && worldEdit.expectedTargetSampleIsAir;
                _sequence.movedWorldEdit = worldEdit;
                hero = GetRuntime(Domain0125Id);
                AssertCurrentDomainManifold(hero, out bool movedManifold, out string movedIssue);
                worldEdit.topologyManifoldWithinU4C3Scope = movedManifold;
                worldEdit.topologyValidationIssue = movedIssue;
                FrameCloseup(camera, hero, 2.3f);
                Capture(camera, Path.Combine(root, "captures", "06-moved-domain.png"));

                string snapshotPath = Path.Combine(root, "metrics", "persistence-0125.save.json");
                PersistenceMetrics persistence = SaveReloadDomain(Domain0125Id, snapshotPath);
                DomainRuntime reloaded = GetRuntime(Domain0125Id);
                FrameCloseup(camera, reloaded, 2.3f);
                Capture(camera, Path.Combine(root, "captures", "07-reloaded-domain.png"));

                DomainRuntime currentCoarse = GetRuntime(Domain025Id);
                ulong worldHashFinal = HashGrid(new ReadOnlyWorldGrid(_world), WorldRenderBounds);
                _worldMetrics.finalContentHash = ToHashString(worldHashFinal);
                _worldMetrics.finalRevision = _world.Revision;
                _worldMetrics.finalEditCount = _world.EditCount;
                RefreshDomainMetrics(currentCoarse);
                RefreshDomainMetrics(reloaded);
                UpdateContactMetrics();

                _sequence.worldAndDomainsUseIndependentSpacing = WorldSpacing == _world.SampleSpacingMeters &&
                    currentCoarse.Domain.SampleSpacingMeters == .25f && reloaded.Domain.SampleSpacingMeters == .125f;
                _sequence.onlyOneLocalDomainWasEdited = currentCoarse.Domain.ContentRevision == 0 &&
                    _world.Revision == 0 && reloaded.Domain.ContentRevision >= 2;
                _sequence.worldContentUnchanged = _worldMetrics.initialContentHash == _worldMetrics.finalContentHash &&
                    _worldMetrics.initialRevision == _worldMetrics.finalRevision &&
                    _worldMetrics.initialEditCount == _worldMetrics.finalEditCount;
                _sequence.otherDomainUnchanged = currentCoarse.Domain.ContentRevision == 0 &&
                    currentCoarse.Metrics.initialRevision == currentCoarse.Domain.ContentRevision &&
                    currentCoarse.Metrics.initialContentHash == currentCoarse.Metrics.contentHash;
                _sequence.editRemeshedOnlyAffectedRegions = localEdit.rebuiltRegions > 0 &&
                    localEdit.reusedRegions > 0 && localEdit.rebuiltRegions < localEdit.totalRegions;
                _sequence.saveReloadUsedNoSourceGeometry = persistence.runtimeDomainRemovedBeforeReload &&
                    !persistence.sourceMeshAvailableDuringReload && persistence.remeshedGeometryMatches;
                _sequence.savedCavityRemainedRemoved = persistence.editedCavityRemainsAir;
                _sequence.savedMeshDeterministicallyRebuilt = persistence.remeshedGeometryMatches;
                _sequence.sourceHighResolutionObjectSpansMultipleRegions = reloaded.Metrics.meshingRegions > 1;
                _sequence.persistence = persistence;
                _sequence.worldBoundsAndAabbOverlapRecorded = currentCoarse.Metrics.worldBoundsMinMeters != null &&
                    currentCoarse.Metrics.worldBoundsMaxMeters != null && reloaded.Metrics.worldBoundsMinMeters != null &&
                    reloaded.Metrics.worldBoundsMaxMeters != null &&
                    currentCoarse.Metrics.aabbOverlapToleranceMeters > 0f && reloaded.Metrics.aabbOverlapToleranceMeters > 0f &&
                    !string.IsNullOrEmpty(currentCoarse.Metrics.aabbOverlapAuthorityResolution) &&
                    !string.IsNullOrEmpty(reloaded.Metrics.aabbOverlapAuthorityResolution);
                _sequence.noPositiveLocalSampleOverlapWithWorld =
                    currentCoarse.Metrics.terrainOverlapSolidSampleCount == 0 &&
                    reloaded.Metrics.terrainOverlapSolidSampleCount == 0;
                _sequence.aabbOverlapInterpretation = "The transformed sample-center bounds include air padding. The AABB diagnostic counts occupied 0.50m world sample centers inside its 0.05m-eroded envelope and estimates their sample volume; it is a placement broad-phase measure, not solid overlap. For this isolated U4D scene only, the query policy is positive local-domain density wins inside that domain, otherwise the unchanged MatterWorld density remains authoritative. Direct evaluation at every positive local-domain sample records zero world-solid overlap (0 m3). No cross-domain query, physics, or transfer system is qualified, so the padded AABB intersection is retained only as a coexistence diagnostic.";
                if (!_sequence.worldBoundsAndAabbOverlapRecorded)
                    throw new InvalidOperationException("The local domains are missing transformed world bounds or AABB occupancy diagnostics.");
                if (!_sequence.noPositiveLocalSampleOverlapWithWorld)
                    throw new InvalidOperationException("A positive local-domain sample overlaps occupied MatterWorld density.");
                cameraTransform.position = previousPosition;
                cameraTransform.rotation = previousRotation;
                camera.orthographic = previousOrthographic;
                camera.orthographicSize = previousSize;
            }
            finally
            {
                SetDebugOverlays(false, false);
                cameraTransform.position = previousPosition;
                cameraTransform.rotation = previousRotation;
                camera.orthographic = previousOrthographic;
                camera.orthographicSize = previousSize;
            }
        }

        public string ReportJson()
        {
            EnsureInitialized();
            var domains = _domains.GetAllSorted();
            var rows = new DomainMetrics[domains.Length];
            for (int index = 0; index < domains.Length; index++)
            {
                DomainRuntime runtime = GetRuntime(domains[index].Id);
                RefreshDomainMetrics(runtime);
                rows[index] = runtime.Metrics;
            }
            return JsonUtility.ToJson(new ReportDocument
            {
                world = _worldMetrics,
                domains = rows,
                sequence = _sequence
            }, true);
        }

        public void WriteEvidence(string evidenceRoot)
        {
            string root = Path.GetFullPath(evidenceRoot);
            Directory.CreateDirectory(Path.Combine(root, "metrics"));
            Directory.CreateDirectory(Path.Combine(root, "player"));
            foreach (string id in ListDomainIds())
            {
                DomainRuntime runtime = GetRuntime(id);
                RefreshDomainMetrics(runtime);
                string filename = runtime.Domain.SampleSpacingMeters == .25f ? "domain-025.json" : "domain-0125.json";
                File.WriteAllText(Path.Combine(root, "metrics", filename), JsonUtility.ToJson(runtime.Metrics, true));
            }
            DomainRuntime hero = GetRuntime(Domain0125Id);
            EditMetrics localEdit = _sequence.localEdit ?? hero.Metrics.lastEdit;
            if (localEdit != null)
                File.WriteAllText(Path.Combine(root, "metrics", "edit-0125.json"), JsonUtility.ToJson(localEdit, true));
            if (_sequence.persistence != null)
                File.WriteAllText(Path.Combine(root, "metrics", "persistence-0125.json"),
                    JsonUtility.ToJson(_sequence.persistence, true));
            File.WriteAllText(Path.Combine(root, "receipt.json"), ReportJson());
        }

        public void WritePlayerReceipt(string path, string capturePath)
        {
            string fullPath = Path.GetFullPath(path);
            Directory.CreateDirectory(Path.GetDirectoryName(fullPath));
            var wrapper = new PlayerEvidence
            {
                environment = "Windows x64 Development Player, standalone process",
                capture = Path.GetFullPath(capturePath),
                unityVersion = Application.unityVersion,
                completedUtc = DateTime.UtcNow.ToString("O"),
                reportJson = ReportJson()
            };
            File.WriteAllText(fullPath, JsonUtility.ToJson(wrapper, true));
        }

        [Serializable]
        private sealed class PlayerEvidence
        {
            public string environment;
            public string capture;
            public string unityVersion;
            public string completedUtc;
            public string reportJson;
        }

        private WorldMetrics CreateWorldMesh()
        {
            MatterMeshData mesh = MatterDomainSurfaceNetsMesher.BuildReadOnlyGrid(new ReadOnlyWorldGrid(_world),
                WorldRenderBounds, out int regions, out double cpu, out double wall, out double combine);
            _worldMeshData = mesh;
            _worldObject = CreateMeshObject("U4D World Terrain 0.50m", mesh, MatterDomainPose.Identity, "world");
            return new WorldMetrics
            {
                sampleSpacingMeters = _world.SampleSpacingMeters,
                sourceSeed = _world.SourceSeed,
                sourceVersion = _world.SourceVersion,
                sampleCount = checked(WorldRenderBounds.Size.X * WorldRenderBounds.Size.Y * WorldRenderBounds.Size.Z),
                hashBoundsMin = WorldRenderBounds.MinInclusive.ToString(),
                hashBoundsMaxExclusive = WorldRenderBounds.MaxExclusive.ToString(),
                initialContentHash = ToHashString(HashGrid(new ReadOnlyWorldGrid(_world), WorldRenderBounds)),
                finalContentHash = ToHashString(HashGrid(new ReadOnlyWorldGrid(_world), WorldRenderBounds)),
                initialRevision = _world.Revision,
                finalRevision = _world.Revision,
                initialEditCount = _world.EditCount,
                finalEditCount = _world.EditCount,
                surfaceRegions = regions,
                surfaceMesherCpuMilliseconds = cpu,
                surfaceRegionWallMilliseconds = wall,
                surfaceCombineMilliseconds = combine,
                surfaceMeshHash = ToHashString(mesh.DeterministicHash),
                surfaceVertices = mesh.Vertices.Length,
                surfaceTriangles = mesh.TriangleCount
            };
        }

        private DomainRuntime CreateDomain(string id, SourceRockArchetype archetype, int seed,
            float spacing, float worldX, float yawDegrees)
        {
            var position = new Vector3(worldX, 0f, 0f);
            return CreateDomainInternal(id, archetype, seed, spacing, worldX, position, yawDegrees);
        }

        private DomainRuntime CreateDomainInternal(string id, SourceRockArchetype archetype, int seed,
            float spacing, float worldX, Vector3 requestedPosition, float yawDegrees)
        {
            if (_domains.TryGet(id, out _)) throw new ArgumentException("MatterDomain ID already exists: " + id, nameof(id));
            var outerWatch = Stopwatch.StartNew();
            SculptedStoneMesh source = SculptedStoneGenerator.Generate(archetype, seed);
            ulong sourceHash = source.GeometryHash;
            float sourceBottom = source.BoundsMin.Y;
            var sourceWatch = Stopwatch.StartNew();
            var localVolume = new MatterLocalVolume(source, spacing);
            sourceWatch.Stop();
            var copyWatch = Stopwatch.StartNew();
            MatterDomain provisional = MatterDomain.Bake(id, localVolume.Bounds, spacing, localVolume,
                MatterDomainPose.Identity);
            copyWatch.Stop();
            // Drop every source-geometry reference before meshing the independent runtime owner.
            source = null;
            localVolume = null;
            GC.Collect();

            var runtime = new DomainRuntime
            {
                Domain = provisional,
                Mesher = new MatterDomainSurfaceNetsMesher(),
                Metrics = CreateDomainMetrics(provisional, archetype.ToString(), seed,
                    sourceHash.ToString("X16"), sourceWatch.Elapsed.TotalMilliseconds,
                    copyWatch.Elapsed.TotalMilliseconds)
            };
            // Mesh in the domain's own coordinates once; pose changes below do not rebuild this geometry.
            runtime.LastBuild = runtime.Mesher.Build(provisional);
            if (runtime.LastBuild.Mesh.Vertices.Length == 0)
                throw new InvalidOperationException("The accepted source produced an empty local matter domain mesh.");
            Quaternion rotation = Quaternion.Euler(0f, yawDegrees, 0f);
            float localMeshBottom = float.PositiveInfinity;
            foreach (MatterMeshVertex vertex in runtime.LastBuild.Mesh.Vertices)
                localMeshBottom = Math.Min(localMeshBottom, vertex.PositionMeters.Y);

            // Place the actual meshed lower surface above the world field at its footprint. The AABB
            // is recorded independently below, while the sampled-density check catches field overlap.
            float terrainAtFootprint = float.NegativeInfinity;
            float contactBand = spacing * .35f;
            foreach (MatterMeshVertex vertex in runtime.LastBuild.Mesh.Vertices)
            {
                if (vertex.PositionMeters.Y > localMeshBottom + contactBand) continue;
                Vector3 rotated = rotation * ToUnity(vertex.PositionMeters);
                terrainAtFootprint = Math.Max(terrainAtFootprint,
                    EstimateWorldSurfaceHeight(requestedPosition.x + rotated.x, requestedPosition.z + rotated.z));
            }
            if (float.IsNegativeInfinity(terrainAtFootprint))
                terrainAtFootprint = EstimateWorldSurfaceHeight(requestedPosition.x, requestedPosition.z);
            float baseY = terrainAtFootprint + .02f - localMeshBottom + requestedPosition.y;
            MatterDomainPose pose = ToPose(new MatterFloat3(requestedPosition.x, baseY, requestedPosition.z), rotation);
            provisional.SetPose(pose);
            int overlapSamples = CountDomainSamplesInsideWorldMatter(provisional);
            float initialPoseY = pose.PositionMeters.Y;
            if (overlapSamples > 0)
            {
                float overlappingY = initialPoseY;
                float step = spacing * .5f;
                float clearY = initialPoseY;
                bool foundClearPose = false;
                for (int searchStep = 0; searchStep < 12; searchStep++)
                {
                    clearY += step;
                    provisional.SetPose(ToPose(new MatterFloat3(requestedPosition.x, clearY,
                        requestedPosition.z), rotation));
                    overlapSamples = CountDomainSamplesInsideWorldMatter(provisional);
                    if (overlapSamples == 0) { foundClearPose = true; break; }
                    overlappingY = clearY;
                    step *= 2f;
                }
                if (foundClearPose)
                {
                    for (int searchStep = 0; searchStep < 12; searchStep++)
                    {
                        float middleY = (overlappingY + clearY) * .5f;
                        provisional.SetPose(ToPose(new MatterFloat3(requestedPosition.x, middleY,
                            requestedPosition.z), rotation));
                        if (CountDomainSamplesInsideWorldMatter(provisional) == 0) clearY = middleY;
                        else overlappingY = middleY;
                    }
                    pose = ToPose(new MatterFloat3(requestedPosition.x, clearY, requestedPosition.z), rotation);
                    provisional.SetPose(pose);
                    overlapSamples = CountDomainSamplesInsideWorldMatter(provisional);
                }
            }
            if (overlapSamples > 0)
                throw new InvalidOperationException("U4D local domain could not be placed without sampled world-matter overlap.");
            runtime.Metrics.placementClearanceAdjustmentMeters = pose.PositionMeters.Y - initialPoseY;

            PublishDomainMesh(runtime, runtime.LastBuild);
            runtime.Metrics.initialMesherCpuMilliseconds = runtime.LastBuild.RebuiltMesherCpuMilliseconds;
            runtime.Metrics.initialRegionWallMilliseconds = runtime.LastBuild.RebuiltRegionWallMilliseconds;
            runtime.Metrics.initialCombineMilliseconds = runtime.LastBuild.CombineMilliseconds;
            runtime.Root.transform.position = ToUnity(provisional.Pose.PositionMeters);
            runtime.Root.transform.rotation = rotation;
            _domains.Add(provisional);
            _runtimeDomains.Add(id, runtime);
            outerWatch.Stop();
            runtime.Metrics.sourceSdfBakeMilliseconds = sourceWatch.Elapsed.TotalMilliseconds;
            runtime.Metrics.domainCopyMilliseconds = copyWatch.Elapsed.TotalMilliseconds;
            RefreshDomainMetrics(runtime);
            runtime.Metrics.initialContentHash = runtime.Metrics.contentHash;
            runtime.Metrics.initialMeshHash = runtime.Metrics.meshHash;
            runtime.Metrics.initialRevision = runtime.Metrics.contentRevision;
            provisional = null;
            GC.KeepAlive(outerWatch);
            return runtime;
        }

        private DomainMetrics CreateDomainMetrics(MatterDomain domain, string archetype, int seed,
            string sourceHash, double sourceBakeMs, double domainCopyMs)
        {
            MatterInt3 size = domain.SampleBounds.Size;
            return new DomainMetrics
            {
                id = domain.Id,
                sourceArchetype = archetype,
                sourceSeed = seed,
                sourceGeometryHash = sourceHash,
                sourceReferenceDiscardedAfterBake = true,
                sampleSpacingMeters = domain.SampleSpacingMeters,
                minInclusive = domain.SampleBounds.MinInclusive.ToString(),
                maxExclusive = domain.SampleBounds.MaxExclusive.ToString(),
                dimensions = size.ToString(),
                sampleCount = domain.SampleCount,
                occupiedSampleCount = domain.OccupiedCount,
                rawPayloadBytes = domain.RawPayloadBytes,
                contentRevision = domain.ContentRevision,
                meshRevision = domain.MeshRevision,
                meshContentRevision = domain.MeshContentRevision,
                contentHash = ToHashString(domain.ComputeContentHash()),
                positionX = domain.Pose.PositionMeters.X, positionY = domain.Pose.PositionMeters.Y,
                positionZ = domain.Pose.PositionMeters.Z,
                rotationX = domain.Pose.RotationX, rotationY = domain.Pose.RotationY,
                rotationZ = domain.Pose.RotationZ, rotationW = domain.Pose.RotationW,
                sourceSdfBakeMilliseconds = sourceBakeMs,
                domainCopyMilliseconds = domainCopyMs
            };
        }

        private EditMetrics Edit(string id, MatterFloat3 center, float radius, bool worldSpace)
        {
            EnsureInitialized();
            DomainRuntime runtime = GetRuntime(id);
            var editWatch = Stopwatch.StartNew();
            MatterDomainPose editPose = runtime.Domain.Pose;
            MatterFloat3 worldCenter = worldSpace ? center : editPose.TransformPoint(center);
            MatterDomainEditResult edit = worldSpace
                ? runtime.Domain.RemoveSphereWorld(center, radius)
                : runtime.Domain.RemoveSphereLocal(center, radius);
            var result = new EditMetrics
            {
                changed = edit.Changed,
                centerLocalX = worldSpace ? runtime.Domain.Pose.InverseTransformPoint(center).X : center.X,
                centerLocalY = worldSpace ? runtime.Domain.Pose.InverseTransformPoint(center).Y : center.Y,
                centerLocalZ = worldSpace ? runtime.Domain.Pose.InverseTransformPoint(center).Z : center.Z,
                radiusMeters = radius,
                centerWorldX = worldCenter.X, centerWorldY = worldCenter.Y, centerWorldZ = worldCenter.Z,
                samplesExamined = edit.SamplesExamined,
                changedSamples = edit.ChangedSampleCount,
                contentRevision = runtime.Domain.ContentRevision
            };
            var addresses = new List<string>();
            foreach (MatterSampleAddress address in edit.ChangedSamples)
            {
                if (addresses.Count == 128) break;
                addresses.Add(address.ToString());
            }
            result.changedLocalSamples = string.Join(",", addresses);

            if (edit.Changed)
            {
                MatterDomainMeshBuildResult build = runtime.Mesher.Build(runtime.Domain, edit.ChangedSamples);
                runtime.LastBuild = build;
                result.directChangedRegions = build.DirectlyChangedRegionCount;
                result.rebuiltRegions = build.RebuiltRegionCount;
                result.reusedRegions = build.ReusedRegionCount;
                result.totalRegions = build.RegionCount;
                result.regionMesherCpuMilliseconds = build.RebuiltMesherCpuMilliseconds;
                result.regionWallMilliseconds = build.RebuiltRegionWallMilliseconds;
                result.combinedMeshMilliseconds = build.CombineMilliseconds;
                bool publish = PublishDomainMesh(runtime, build);
                if (!publish) throw new InvalidOperationException("A stale local domain mesh result was rejected during publication.");
                result.domainPublicationMilliseconds = build.PublicationMilliseconds;
                result.unityMeshFillMilliseconds = runtime.Metrics.initialMeshFillMilliseconds;
                result.unityMeshApplyMilliseconds = runtime.Metrics.initialMeshApplyMilliseconds;
                result.unityMeshUploadMilliseconds = runtime.Metrics.initialMeshUploadMilliseconds;
                result.meshHash = ToHashString(build.Mesh.DeterministicHash);
                AssertCurrentDomainManifold(runtime, out result.topologyManifoldWithinU4C3Scope,
                    out result.topologyValidationIssue);
            }
            else
            {
                result.meshHash = ToHashString(runtime.LastBuild.Mesh.DeterministicHash);
                result.totalRegions = runtime.LastBuild.RegionCount;
                result.reusedRegions = runtime.LastBuild.RegionCount;
            }
            editWatch.Stop();
            result.editToVisibleMilliseconds = editWatch.Elapsed.TotalMilliseconds;
            result.contentHash = ToHashString(runtime.Domain.ComputeContentHash());
            result.contentRevision = runtime.Domain.ContentRevision;
            result.meshRevision = runtime.Domain.MeshRevision;
            runtime.Metrics.lastEdit = result;
            RefreshDomainMetrics(runtime);
            UpdateContactMetrics();
            SetDebugOverlays(_showDomainBounds, _showMeshingRegions);
            return result;
        }

        private bool PublishDomainMesh(DomainRuntime runtime, MatterDomainMeshBuildResult build)
        {
            if (runtime.Domain.ContentRevision != build.ContentRevision) return false;
            var watch = Stopwatch.StartNew();
            MatterMeshPublicationTimings timing = MatterMeshPublisher.Publish(build.Mesh,
                "U4D " + runtime.Domain.Id + " Surface Nets", out Mesh newMesh);
            watch.Stop();
            if (!build.TryPublishTo(runtime.Domain))
            {
                DestroyTransient(newMesh);
                return false;
            }
            if (runtime.UnityMesh != null) DestroyTransient(runtime.UnityMesh);
            runtime.UnityMesh = newMesh;
            _generatedMeshes.Add(newMesh);
            if (runtime.Root == null)
            {
                runtime.Root = new GameObject("U4D MatterDomain " + runtime.Domain.Id);
                _generatedObjects.Add(runtime.Root);
            }
            runtime.Root.transform.position = ToUnity(runtime.Domain.Pose.PositionMeters);
            runtime.Root.transform.rotation = ToUnityRotation(runtime.Domain.Pose);
            var filter = runtime.Root.GetComponent<MeshFilter>();
            if (filter == null) filter = runtime.Root.AddComponent<MeshFilter>();
            filter.sharedMesh = newMesh;
            var renderer = runtime.Root.GetComponent<MeshRenderer>();
            if (renderer == null) renderer = runtime.Root.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = ActiveSurfaceMaterial;
            renderer.shadowCastingMode = ShadowCastingMode.On;
            renderer.receiveShadows = true;
            runtime.Metrics.initialMeshFillMilliseconds = timing.MeshDataFillMilliseconds;
            runtime.Metrics.initialMeshApplyMilliseconds = timing.ApplyMilliseconds;
            runtime.Metrics.initialMeshUploadMilliseconds = timing.UploadMilliseconds;
            runtime.Metrics.meshRevision = runtime.Domain.MeshRevision;
            runtime.Metrics.meshContentRevision = runtime.Domain.MeshContentRevision;
            GC.KeepAlive(watch);
            return true;
        }

        private void RefreshDomainMetrics(DomainRuntime runtime)
        {
            DomainMetrics metrics = runtime.Metrics;
            MatterDomain domain = runtime.Domain;
            MatterInt3 size = domain.SampleBounds.Size;
            metrics.sampleSpacingMeters = domain.SampleSpacingMeters;
            metrics.minInclusive = domain.SampleBounds.MinInclusive.ToString();
            metrics.maxExclusive = domain.SampleBounds.MaxExclusive.ToString();
            metrics.dimensions = size.ToString();
            metrics.sampleCount = domain.SampleCount;
            metrics.occupiedSampleCount = domain.OccupiedCount;
            metrics.rawPayloadBytes = domain.RawPayloadBytes;
            metrics.contentRevision = domain.ContentRevision;
            metrics.meshRevision = domain.MeshRevision;
            metrics.meshContentRevision = domain.MeshContentRevision;
            metrics.contentHash = ToHashString(domain.ComputeContentHash());
            metrics.meshHash = ToHashString(runtime.LastBuild.Mesh.DeterministicHash);
            metrics.positionX = domain.Pose.PositionMeters.X; metrics.positionY = domain.Pose.PositionMeters.Y;
            metrics.positionZ = domain.Pose.PositionMeters.Z;
            metrics.rotationX = domain.Pose.RotationX; metrics.rotationY = domain.Pose.RotationY;
            metrics.rotationZ = domain.Pose.RotationZ; metrics.rotationW = domain.Pose.RotationW;
            metrics.meshingRegions = runtime.LastBuild.RegionCount;
            metrics.activeCells = runtime.LastBuild.Mesh.ActiveCellCount;
            metrics.ambiguousFaces = runtime.LastBuild.Mesh.AmbiguousFaceCount;
            metrics.ambiguousCells = runtime.LastBuild.Mesh.AmbiguousCellCount;
            metrics.multiComponentCells = runtime.LastBuild.Mesh.MultiComponentCellCount;
            metrics.maxComponentsPerCell = runtime.LastBuild.Mesh.MaximumComponentsPerCell;
            metrics.extraSurfaceVertices = runtime.LastBuild.Mesh.AdditionalSurfaceVertexCount;
            metrics.missingCrossingEdgeMappings = runtime.LastBuild.Mesh.MissingCrossingEdgeMappings;
            metrics.vertexCount = runtime.LastBuild.Mesh.Vertices.Length;
            metrics.triangleCount = runtime.LastBuild.Mesh.TriangleCount;
            AssertCurrentDomainManifold(runtime, out metrics.connectedManifoldWithinU4C3Scope,
                out metrics.topologyValidationIssue);
        }

        private void UpdateContactMetrics()
        {
            if (_worldMetrics == null || _runtimeDomains.Count == 0) return;
            foreach (DomainRuntime runtime in _runtimeDomains.Values)
            {
                int overlap = CountDomainSamplesInsideWorldMatter(runtime.Domain);
                GetWorldSampleBoundsAabb(runtime.Domain, out MatterFloat3 worldMin, out MatterFloat3 worldMax);
                int occupiedWorldSamplesInAabb = CountWorldOccupiedSampleCentersInsideAabb(worldMin, worldMax,
                    DomainAabbOverlapToleranceMeters);
                MeasureDomainContact(runtime, out float terrainY, out float bottom, out float gap);
                runtime.Metrics.terrainOverlapSolidSampleCount = overlap;
                runtime.Metrics.estimatedTerrainOverlapCubicMeters = overlap *
                    runtime.Domain.SampleSpacingMeters * runtime.Domain.SampleSpacingMeters * runtime.Domain.SampleSpacingMeters;
                runtime.Metrics.worldBoundsMinMeters = FormatVector(worldMin);
                runtime.Metrics.worldBoundsMaxMeters = FormatVector(worldMax);
                runtime.Metrics.occupiedWorldSampleCentersInsideDomainAabb = occupiedWorldSamplesInAabb;
                runtime.Metrics.estimatedWorldOccupancyInsideAabbCubicMeters = occupiedWorldSamplesInAabb *
                    WorldSpacing * WorldSpacing * WorldSpacing;
                runtime.Metrics.aabbOverlapToleranceMeters = DomainAabbOverlapToleranceMeters;
                runtime.Metrics.aabbOverlapAuthorityResolution = "U4D diagnostic policy only: positive local-domain density wins inside its bounds; otherwise the unchanged MatterWorld density remains authoritative. This is not a shared cross-domain query implementation. Positive local-domain samples checked against world density: " + overlap.ToString(CultureInfo.InvariantCulture) + ".";
                runtime.Metrics.terrainContactHeightMeters = terrainY;
                runtime.Metrics.objectBottomHeightMeters = bottom;
                runtime.Metrics.contactGapMeters = gap;
                runtime.Metrics.aabbOverlapBeyondTolerance = occupiedWorldSamplesInAabb > 0;
                if (!runtime.Metrics.initialContactRecorded)
                {
                    runtime.Metrics.initialContactRecorded = true;
                    runtime.Metrics.initialTerrainContactHeightMeters = terrainY;
                    runtime.Metrics.initialObjectBottomHeightMeters = bottom;
                    runtime.Metrics.initialContactGapMeters = gap;
                }
            }
        }

        private void MeasureDomainContact(DomainRuntime runtime, out float terrainY, out float objectY,
            out float minimumGap)
        {
            MatterMeshVertex[] vertices = runtime.LastBuild.Mesh.Vertices;
            MatterDomainPose pose = runtime.Domain.Pose;
            float meshBottom = float.PositiveInfinity;
            foreach (MatterMeshVertex vertex in vertices)
                meshBottom = Math.Min(meshBottom, vertex.PositionMeters.Y);

            float contactBand = runtime.Domain.SampleSpacingMeters * .5f;
            terrainY = 0f;
            objectY = 0f;
            minimumGap = float.PositiveInfinity;
            foreach (MatterMeshVertex vertex in vertices)
            {
                if (vertex.PositionMeters.Y > meshBottom + contactBand) continue;
                MatterFloat3 world = pose.TransformPoint(vertex.PositionMeters);
                float localTerrainY = EstimateWorldSurfaceHeight(world.X, world.Z);
                float gap = world.Y - localTerrainY;
                if (gap >= minimumGap) continue;
                minimumGap = gap;
                terrainY = localTerrainY;
                objectY = world.Y;
            }
            if (float.IsPositiveInfinity(minimumGap))
            {
                MatterFloat3 origin = pose.PositionMeters;
                terrainY = EstimateWorldSurfaceHeight(origin.X, origin.Z);
                objectY = origin.Y + meshBottom;
                minimumGap = objectY - terrainY;
            }
        }

        private int CountDomainSamplesInsideWorldMatter(MatterDomain domain)
        {
            var grid = new ReadOnlyWorldGrid(_world);
            MatterInt3 size = domain.SampleBounds.Size;
            int overlap = 0;
            for (int z = 0; z < size.Z; z++)
            for (int y = 0; y < size.Y; y++)
            for (int x = 0; x < size.X; x++)
            {
                MatterSampleAddress address = new MatterSampleAddress(domain.SampleBounds.MinInclusive + new MatterInt3(x, y, z));
                if (!domain.ReadSample(address).IsSolid) continue;
                if (Trilinear(grid, domain.LocalSampleToWorld(address)).Density > 0f) overlap++;
            }
            return overlap;
        }

        private int CountWorldOccupiedSampleCentersInsideAabb(MatterFloat3 worldMin, MatterFloat3 worldMax,
            float toleranceMeters)
        {
            var grid = new ReadOnlyWorldGrid(_world);
            int minX = CeilToInt((worldMin.X + toleranceMeters) / WorldSpacing);
            int minY = CeilToInt((worldMin.Y + toleranceMeters) / WorldSpacing);
            int minZ = CeilToInt((worldMin.Z + toleranceMeters) / WorldSpacing);
            int maxX = FloorToInt((worldMax.X - toleranceMeters) / WorldSpacing);
            int maxY = FloorToInt((worldMax.Y - toleranceMeters) / WorldSpacing);
            int maxZ = FloorToInt((worldMax.Z - toleranceMeters) / WorldSpacing);
            int occupied = 0;
            for (int z = minZ; z <= maxZ; z++)
            for (int y = minY; y <= maxY; y++)
            for (int x = minX; x <= maxX; x++)
                if (grid.ReadSample(new MatterSampleAddress(x, y, z)).Density > 0f) occupied++;
            return occupied;
        }

        private static void GetWorldSampleBoundsAabb(MatterDomain domain, out MatterFloat3 worldMin,
            out MatterFloat3 worldMax)
        {
            MatterInt3 min = domain.SampleBounds.MinInclusive;
            MatterInt3 max = domain.SampleBounds.MaxExclusive - new MatterInt3(1, 1, 1);
            worldMin = new MatterFloat3(float.PositiveInfinity, float.PositiveInfinity, float.PositiveInfinity);
            worldMax = new MatterFloat3(float.NegativeInfinity, float.NegativeInfinity, float.NegativeInfinity);
            for (int z = 0; z < 2; z++)
            for (int y = 0; y < 2; y++)
            for (int x = 0; x < 2; x++)
            {
                var address = new MatterSampleAddress(x == 0 ? min.X : max.X,
                    y == 0 ? min.Y : max.Y, z == 0 ? min.Z : max.Z);
                MatterFloat3 world = domain.LocalSampleToWorld(address);
                worldMin = new MatterFloat3(Math.Min(worldMin.X, world.X), Math.Min(worldMin.Y, world.Y),
                    Math.Min(worldMin.Z, world.Z));
                worldMax = new MatterFloat3(Math.Max(worldMax.X, world.X), Math.Max(worldMax.Y, world.Y),
                    Math.Max(worldMax.Z, world.Z));
            }
        }

        private static int CeilToInt(float value) => checked((int)Math.Ceiling(value));
        private static int FloorToInt(float value) => checked((int)Math.Floor(value));

        private static string FormatVector(MatterFloat3 value)
            => "(" + value.X.ToString("R", CultureInfo.InvariantCulture) + "," +
                value.Y.ToString("R", CultureInfo.InvariantCulture) + "," +
                value.Z.ToString("R", CultureInfo.InvariantCulture) + ")";

        private float EstimateWorldSurfaceHeight(float x, float z)
        {
            var grid = new ReadOnlyWorldGrid(_world);
            float lower = -.5f, upper = .5f;
            for (int iteration = 0; iteration < 18; iteration++)
            {
                float middle = (lower + upper) * .5f;
                if (Trilinear(grid, new MatterFloat3(x, middle, z)).Density > 0f) lower = middle;
                else upper = middle;
            }
            return (lower + upper) * .5f;
        }

        private static MatterSample Trilinear(IMatterReadOnlyGrid grid, MatterFloat3 worldPoint)
        {
            double spacing = grid.SampleSpacingMeters;
            double x = worldPoint.X / spacing, y = worldPoint.Y / spacing, z = worldPoint.Z / spacing;
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
            float value = (float)density;
            return value > 0f ? new MatterSample(value, MatterMaterialId.Dirt) : MatterSample.Air(value);
        }

        private static ulong HashGrid(IMatterReadOnlyGrid grid, MatterBounds bounds)
        {
            ulong hash = 14695981039346656037UL;
            MatterInt3 size = bounds.Size;
            HashInt(ref hash, size.X); HashInt(ref hash, size.Y); HashInt(ref hash, size.Z);
            HashInt(ref hash, bounds.MinInclusive.X); HashInt(ref hash, bounds.MinInclusive.Y); HashInt(ref hash, bounds.MinInclusive.Z);
            HashUInt(ref hash, new FloatUInt { Float = grid.SampleSpacingMeters }.UInt);
            for (int z = bounds.MinInclusive.Z; z < bounds.MaxExclusive.Z; z++)
            for (int y = bounds.MinInclusive.Y; y < bounds.MaxExclusive.Y; y++)
            for (int x = bounds.MinInclusive.X; x < bounds.MaxExclusive.X; x++)
            {
                MatterSample sample = grid.ReadSample(new MatterSampleAddress(x, y, z));
                HashUInt(ref hash, new FloatUInt { Float = sample.Density }.UInt);
                HashByte(ref hash, (byte)sample.Material);
            }
            return hash;
        }

        private void AssertCurrentDomainManifold(DomainRuntime runtime, out bool valid, out string issue)
        {
            try
            {
                var points = new MatterFloat3[runtime.LastBuild.Mesh.Vertices.Length];
                for (int index = 0; index < points.Length; index++)
                    points[index] = runtime.LastBuild.Mesh.Vertices[index].PositionMeters;
                SculptedStoneMesh mesh = SculptedStoneMesh.FromIndexedGeometry(points, runtime.LastBuild.Mesh.Indices);
                valid = mesh.Validate(out issue);
            }
            catch (Exception exception)
            {
                valid = false;
                issue = exception.Message;
            }
        }

        private MatterSampleAddress FindSolidSampleNear(MatterDomain domain, MatterInt3 preferred)
        {
            int maxDistance = Math.Max(domain.SampleBounds.Size.X, Math.Max(domain.SampleBounds.Size.Y, domain.SampleBounds.Size.Z));
            for (int distance = 0; distance <= maxDistance; distance++)
            for (int dz = -distance; dz <= distance; dz++)
            for (int dy = -distance; dy <= distance; dy++)
            for (int dx = -distance; dx <= distance; dx++)
            {
                if (Math.Max(Math.Abs(dx), Math.Max(Math.Abs(dy), Math.Abs(dz))) != distance) continue;
                var address = new MatterSampleAddress(preferred + new MatterInt3(dx, dy, dz));
                if (domain.SampleBounds.Contains(address) && domain.ReadSample(address).IsSolid) return address;
            }
            throw new InvalidOperationException("No solid target sample was found in the selected local domain.");
        }

        private void FrameOverview(Camera camera)
        {
            camera.orthographic = true;
            camera.orthographicSize = 6.8f;
            Vector3 position = new Vector3(0f, 8f, -15f);
            camera.transform.position = position;
            camera.transform.rotation = Quaternion.LookRotation(new Vector3(0f, .7f, 0f) - position, Vector3.up);
        }

        private void FrameCloseup(Camera camera, DomainRuntime runtime, float size)
        {
            camera.orthographic = true;
            camera.orthographicSize = size;
            Vector3 localCenter = runtime.UnityMesh.bounds.center;
            MatterFloat3 posedCenter = runtime.Domain.Pose.TransformPoint(
                new MatterFloat3(localCenter.x, localCenter.y, localCenter.z));
            Vector3 center = ToUnity(posedCenter);
            Vector3 position = center + new Vector3(0f, 3.2f, -6.2f);
            camera.transform.position = position;
            camera.transform.rotation = Quaternion.LookRotation(center - position, Vector3.up);
        }

        private static void Capture(Camera camera, string path)
            => RockStampGalleryView.Capture(camera, path, 1920, 1080);

        private void CreateWorldBoundsOverlay()
        {
            var points = new List<Vector3>(24);
            AddWorldBox(points, WorldRenderBounds.MinInclusive, WorldRenderBounds.MaxExclusive, WorldSpacing);
            CreateWireOverlay("U4D world extent", points, new Color(.16f, .68f, .95f, 1f));
        }

        private void CreateDomainBoundsOverlay(DomainRuntime runtime)
        {
            MatterBounds bounds = runtime.Domain.SampleBounds;
            MatterInt3 min = bounds.MinInclusive;
            MatterInt3 max = bounds.MaxExclusive;
            MatterFloat3 low = new MatterFloat3(min.X * runtime.Domain.SampleSpacingMeters,
                min.Y * runtime.Domain.SampleSpacingMeters, min.Z * runtime.Domain.SampleSpacingMeters);
            MatterFloat3 high = new MatterFloat3(max.X * runtime.Domain.SampleSpacingMeters,
                max.Y * runtime.Domain.SampleSpacingMeters, max.Z * runtime.Domain.SampleSpacingMeters);
            var points = new List<Vector3>(24);
            AddDomainBox(points, runtime.Domain.Pose, low, high);
            CreateWireOverlay("U4D bounds " + runtime.Domain.Id, points,
                runtime.Domain.SampleSpacingMeters == .125f ? new Color(1f, .52f, .13f, 1f) : new Color(.28f, .88f, .56f, 1f));
        }

        private void CreateDomainRegionsOverlay(DomainRuntime runtime)
        {
            var points = new List<Vector3>();
            float spacing = runtime.Domain.SampleSpacingMeters;
            foreach (MatterDomainRegionHash row in runtime.Mesher.GetRegionHashesSorted())
            {
                float x = row.Address.X * MatterBrickLayout.CellSize * spacing;
                float y = row.Address.Y * MatterBrickLayout.CellSize * spacing;
                float z = row.Address.Z * MatterBrickLayout.CellSize * spacing;
                float side = MatterBrickLayout.CellSize * spacing;
                AddDomainBox(points, runtime.Domain.Pose,
                    new MatterFloat3(x, y, z), new MatterFloat3(x + side, y + side, z + side));
            }
            CreateWireOverlay("U4D 16-cell regions " + runtime.Domain.Id, points,
                runtime.Domain.SampleSpacingMeters == .125f ? new Color(1f, .28f, .1f, 1f) : new Color(.12f, .86f, .5f, 1f));
        }

        private static void AddWorldBox(List<Vector3> target, MatterInt3 min, MatterInt3 max, float spacing)
        {
            MatterDomainPose identity = MatterDomainPose.Identity;
            AddDomainBox(target, identity, new MatterFloat3(min.X * spacing, min.Y * spacing, min.Z * spacing),
                new MatterFloat3(max.X * spacing, max.Y * spacing, max.Z * spacing));
        }

        private static void AddDomainBox(List<Vector3> target, MatterDomainPose pose, MatterFloat3 min, MatterFloat3 max)
        {
            Vector3[] p =
            {
                ToUnity(pose.TransformPoint(min)),
                ToUnity(pose.TransformPoint(new MatterFloat3(max.X, min.Y, min.Z))),
                ToUnity(pose.TransformPoint(new MatterFloat3(max.X, max.Y, min.Z))),
                ToUnity(pose.TransformPoint(new MatterFloat3(min.X, max.Y, min.Z))),
                ToUnity(pose.TransformPoint(new MatterFloat3(min.X, min.Y, max.Z))),
                ToUnity(pose.TransformPoint(new MatterFloat3(max.X, min.Y, max.Z))),
                ToUnity(pose.TransformPoint(max)),
                ToUnity(pose.TransformPoint(new MatterFloat3(min.X, max.Y, max.Z)))
            };
            int[] edges = { 0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7 };
            for (int index = 0; index < edges.Length; index++) target.Add(p[edges[index]]);
        }

        private void CreateWireOverlay(string label, List<Vector3> points, Color color)
        {
            if (points.Count == 0) return;
            var mesh = new Mesh { name = label, indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 };
            mesh.SetVertices(points);
            var indices = new int[points.Count];
            for (int index = 0; index < indices.Length; index++) indices[index] = index;
            mesh.SetIndices(indices, MeshTopology.Lines, 0, false);
            mesh.bounds.Expand(.02f);
            Shader shader = Shader.Find("HDRP/Unlit");
            if (shader == null) throw new InvalidOperationException("U4D debug overlays require HDRP/Unlit.");
            var material = new Material(shader) { name = label + " material" };
            if (material.HasProperty("_UnlitColor")) material.SetColor("_UnlitColor", color);
            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", color);
            if (material.HasProperty("_Color")) material.SetColor("_Color", color);
            var root = new GameObject(label);
            root.AddComponent<MeshFilter>().sharedMesh = mesh;
            root.AddComponent<MeshRenderer>().sharedMaterial = material;
            _overlayObjects.Add(root);
            _overlayMeshes.Add(mesh);
            _overlayMaterials.Add(material);
        }

        private void ClearOverlays()
        {
            // In Play Mode Destroy is deferred until later in the frame. The Editor evidence
            // sequence renders captures synchronously, so deactivate before destroying to keep
            // the prior overlay out of the next screenshot.
            foreach (GameObject value in _overlayObjects)
            {
                if (value == null) continue;
                value.SetActive(false);
                DestroyTransient(value);
            }
            foreach (Mesh value in _overlayMeshes) DestroyTransient(value);
            foreach (Material value in _overlayMaterials) DestroyTransient(value);
            _overlayObjects.Clear(); _overlayMeshes.Clear(); _overlayMaterials.Clear();
        }

        private void OnGUI()
        {
            if (!Application.isPlaying || !_initialized) return;
            GUI.Box(new Rect(16f, 16f, 255f, 94f), "U4D Local MatterDomain");
            bool bounds = GUI.Toggle(new Rect(28f, 45f, 220f, 22f), _showDomainBounds, "Domain bounds");
            bool regions = GUI.Toggle(new Rect(28f, 72f, 220f, 22f), _showMeshingRegions, "16-cell region overlay");
            if (bounds != _showDomainBounds || regions != _showMeshingRegions) SetDebugOverlays(bounds, regions);
        }

        private void EnsureSurfaceMaterial()
        {
            if (_runtimeSurfaceMaterial != null || _fallbackSurfaceMaterial != null) return;
            if (_surfaceMaterial != null)
            {
                _runtimeSurfaceMaterial = new Material(_surfaceMaterial) { name = "U4D rest-space detail qualification" };
                if (_runtimeSurfaceMaterial.HasProperty("_TextureScale"))
                    _runtimeSurfaceMaterial.SetFloat("_TextureScale", RestSpaceProofTextureScale);
                if (_runtimeSurfaceMaterial.HasProperty("_NormalStrength"))
                    _runtimeSurfaceMaterial.SetFloat("_NormalStrength", RestSpaceProofNormalStrength);
                return;
            }
            Shader shader = Shader.Find("Wildkin/MatterRockDirt");
            if (shader != null)
            {
                _fallbackSurfaceMaterial = new Material(shader) { name = "U4D runtime fallback rock/dirt" };
                _fallbackSurfaceMaterial.SetTexture("_RockAlbedo", Texture2D.whiteTexture);
                _fallbackSurfaceMaterial.SetTexture("_DirtAlbedo", Texture2D.whiteTexture);
                _fallbackSurfaceMaterial.SetTexture("_RockNormal", Texture2D.normalTexture);
                _fallbackSurfaceMaterial.SetTexture("_DirtNormal", Texture2D.normalTexture);
                _fallbackSurfaceMaterial.SetTexture("_RockMask", Texture2D.whiteTexture);
                _fallbackSurfaceMaterial.SetTexture("_DirtMask", Texture2D.whiteTexture);
                _fallbackSurfaceMaterial.SetFloat("_NormalStrength", 0f);
                _fallbackSurfaceMaterial.SetFloat("_TextureScale", 1f);
            }
            else
            {
                _fallbackSurfaceMaterial = MatterMeshPublisher.CreateDebugMaterial(new Color(.48f, .5f, .52f),
                    "U4D runtime fallback surface", true);
            }
        }

        private GameObject CreateMeshObject(string objectName, MatterMeshData meshData, MatterDomainPose pose, string kind)
        {
            MatterMeshPublisher.Publish(meshData, objectName, out Mesh mesh);
            if (mesh == null) throw new InvalidOperationException("U4D " + kind + " mesher produced no renderable triangles.");
            _generatedMeshes.Add(mesh);
            var root = new GameObject(objectName);
            root.transform.position = ToUnity(pose.PositionMeters);
            root.transform.rotation = ToUnityRotation(pose);
            root.AddComponent<MeshFilter>().sharedMesh = mesh;
            var renderer = root.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = ActiveSurfaceMaterial;
            renderer.shadowCastingMode = ShadowCastingMode.On;
            renderer.receiveShadows = true;
            _generatedObjects.Add(root);
            return root;
        }

        private DomainRuntime GetRuntime(string id)
        {
            if (!_runtimeDomains.TryGetValue(id, out DomainRuntime runtime))
                throw new KeyNotFoundException("No local matter domain presentation is registered with ID '" + id + "'.");
            return runtime;
        }

        private Camera FindSceneCamera()
        {
            if (!gameObject.scene.IsValid() || !gameObject.scene.isLoaded)
                return Camera.main;
            foreach (GameObject root in gameObject.scene.GetRootGameObjects())
            {
                Camera camera = root.GetComponentInChildren<Camera>(true);
                if (camera != null) return camera;
            }
            return Camera.main;
        }

        private void ApplyPose(DomainRuntime runtime)
        {
            if (runtime.Root == null) return;
            runtime.Root.transform.position = ToUnity(runtime.Domain.Pose.PositionMeters);
            runtime.Root.transform.rotation = ToUnityRotation(runtime.Domain.Pose);
        }

        private void DestroyRuntimeRecord(DomainRuntime runtime)
        {
            if (runtime == null) return;
            if (runtime.Root != null)
            {
                DestroyImmediately(runtime.Root);
                _generatedObjects.Remove(runtime.Root);
            }
            if (runtime.UnityMesh != null)
            {
                DestroyImmediately(runtime.UnityMesh);
                _generatedMeshes.Remove(runtime.UnityMesh);
            }
            runtime.Root = null;
            runtime.UnityMesh = null;
            runtime.Mesher?.Clear();
            runtime.Mesher = null;
            runtime.LastBuild = null;
            runtime.Domain = null;
        }

        private void ClearGenerated()
        {
            ClearOverlays();
            foreach (GameObject value in _generatedObjects) DestroyTransient(value);
            foreach (Mesh value in _generatedMeshes) DestroyTransient(value);
            _generatedObjects.Clear(); _generatedMeshes.Clear();
            if (_runtimeSurfaceMaterial != null) DestroyTransient(_runtimeSurfaceMaterial);
            _runtimeSurfaceMaterial = null;
            if (_fallbackSurfaceMaterial != null) DestroyTransient(_fallbackSurfaceMaterial);
            _fallbackSurfaceMaterial = null;
            _worldObject = null;
            _worldMeshData = null;
            _initialized = false;
        }

        private static void DestroyTransient(UnityEngine.Object value)
        {
            if (value == null) return;
            if (Application.isPlaying) Destroy(value);
            else DestroyImmediate(value);
        }

        private static void DestroyImmediately(UnityEngine.Object value)
        {
            if (value != null) DestroyImmediate(value);
        }

        private static MatterDomainPose ToPose(MatterFloat3 position, Quaternion rotation)
            => new MatterDomainPose(position, rotation.x, rotation.y, rotation.z, rotation.w);

        private static MatterDomainPose CreateMovedPose(MatterDomainPose originalPose)
        {
            const double proofYawDegrees = 45d;
            double halfYawRadians = proofYawDegrees * Math.PI / 360d;
            return new MatterDomainPose(
                new MatterFloat3(originalPose.PositionMeters.X + 4f, originalPose.PositionMeters.Y,
                    originalPose.PositionMeters.Z + .35f),
                0f, (float)Math.Sin(halfYawRadians), 0f, (float)Math.Cos(halfYawRadians));
        }

        private static Vector3 ToUnity(MatterFloat3 value) => new Vector3(value.X, value.Y, value.Z);

        private static Quaternion ToUnityRotation(MatterDomainPose pose)
            => new Quaternion(pose.RotationX, pose.RotationY, pose.RotationZ, pose.RotationW);

        private static string ToHashString(ulong value) => "0x" + value.ToString("X16");

        private static bool SamePose(MatterDomainPose left, MatterDomainPose right)
            => left.PositionMeters.X.Equals(right.PositionMeters.X) && left.PositionMeters.Y.Equals(right.PositionMeters.Y) &&
               left.PositionMeters.Z.Equals(right.PositionMeters.Z) && left.RotationX.Equals(right.RotationX) &&
               left.RotationY.Equals(right.RotationY) && left.RotationZ.Equals(right.RotationZ) &&
               left.RotationW.Equals(right.RotationW);

        private static MatterSampleAddress ParseAddress(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return default;
            int start = value.IndexOf('('), end = value.IndexOf(')');
            if (start < 0 || end <= start) return default;
            string[] fields = value.Substring(start + 1, end - start - 1).Split(',');
            if (fields.Length != 3 || !int.TryParse(fields[0], out int x) || !int.TryParse(fields[1], out int y) ||
                !int.TryParse(fields[2], out int z)) return default;
            return new MatterSampleAddress(x, y, z);
        }

        private static string ReadArgument(string prefix)
        {
            foreach (string argument in Environment.GetCommandLineArgs())
                if (argument.StartsWith(prefix, StringComparison.Ordinal)) return argument.Substring(prefix.Length).Trim('"');
            return null;
        }

        private static void HashInt(ref ulong hash, int value)
            => HashUInt(ref hash, unchecked((uint)value));

        private static void HashUInt(ref ulong hash, uint value)
        {
            HashByte(ref hash, (byte)value); HashByte(ref hash, (byte)(value >> 8));
            HashByte(ref hash, (byte)(value >> 16)); HashByte(ref hash, (byte)(value >> 24));
        }

        private static void HashByte(ref ulong hash, byte value)
        {
            unchecked { hash = (hash ^ value) * 1099511628211UL; }
        }

        [System.Runtime.InteropServices.StructLayout(System.Runtime.InteropServices.LayoutKind.Explicit)]
        private struct FloatUInt
        {
            [System.Runtime.InteropServices.FieldOffset(0)] public float Float;
            [System.Runtime.InteropServices.FieldOffset(0)] public uint UInt;
        }

        private void EnsureInitialized()
        {
            if (!_initialized) InitializeQualification();
        }

        private void OnDestroy()
        {
            ClearGenerated();
        }

        // The qualification command uses this wrapper so that the domain construction path stays the same.
        private sealed class ImmutableDomainGrid : IMatterReadOnlyGrid
        {
            public MatterDomain Domain { get; }
            public float SampleSpacingMeters => Domain.SampleSpacingMeters;
            public ImmutableDomainGrid(MatterDomain domain) => Domain = domain;
            public MatterSample ReadSample(MatterSampleAddress address) => Domain.ReadSample(address);
        }
    }
}
