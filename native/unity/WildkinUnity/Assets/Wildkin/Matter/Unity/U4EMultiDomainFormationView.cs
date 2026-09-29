using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using UnityEngine;
using UnityEngine.Rendering;
using Wildkin.Matter;

namespace Wildkin.Matter.Unity
{
    /// <summary>Runtime presentation and bounded evidence surface for the engine-light U4E formation builder.</summary>
    public sealed class U4EMultiDomainFormationView : MonoBehaviour
    {
        [SerializeField] private Material _surfaceMaterial;
        [SerializeField] private int _startupSeed = U4EFormationConfiguration.GallerySeedStart;
        [SerializeField] private int _startupAttemptIndex;
        [SerializeField] private U4EContactFitMode _startupContactFitMode = U4EContactFitMode.GlobalMin25mm;
        [SerializeField] private bool _generateOnStart;
        [SerializeField] private bool _showBoundaryOverlay;
        [SerializeField] private bool _showContactGraph;
        private bool _showDirectionalDebug;

        private readonly Dictionary<string, GameObject> _childObjects = new Dictionary<string, GameObject>(StringComparer.Ordinal);
        private readonly List<GameObject> _transientObjects = new List<GameObject>();
        private readonly List<Mesh> _transientMeshes = new List<Mesh>();
        private GameObject _presentationRoot;
        private Material _fallbackMaterial;
        private Material _overlayMaterial;
        private Material _directionalPatchMaterial;
        private Material _directionalRejectedMaterial;
        private Material _directionalFitMaterial;
        private U4EFormationBuildResult _formation;
        private bool _playerEvidenceRun;

        public U4EFormationBuildResult Formation => _formation;
        public int RenderedDomainCount => _childObjects.Count;
        public int RenderedMeshCount => GetComponentsInChildren<MeshRenderer>(true).Length;

        private void Start()
        {
            if (!_generateOnStart) return;
            bool experimentOverride = TryReadPlayerArgument("--u4e-fit-mode=", out string fitModeArgument) ||
                                      TryReadPlayerArgument("--u4e-attempt=", out _);
            int startupSeed = ReadPlayerIntArgument("--u4e-seed=", _startupSeed);
            int startupAttempt = ReadPlayerIntArgument("--u4e-attempt=", _startupAttemptIndex);
            U4EContactFitMode startupMode = _startupContactFitMode;
            if (!string.IsNullOrEmpty(fitModeArgument) && !Enum.TryParse(fitModeArgument, true, out startupMode))
            {
                Debug.LogError("Unknown U4E contact fit mode: " + fitModeArgument);
                Application.Quit(1);
                return;
            }
            U4EFormationBuildResult startup = experimentOverride
                ? GenerateExperiment(startupSeed, startupAttempt, startupMode,
                    transform.position, transform.eulerAngles.y)
                : Generate(startupSeed, transform.position, transform.eulerAngles.y);
            if (!startup.Accepted)
            {
                Debug.LogError("U4E Player startup formation was rejected: " + startup.RejectionReason);
                Application.Quit(1);
                return;
            }
            if (!Application.isEditor && HasPlayerEvidenceArgument() && !_playerEvidenceRun)
            {
                _playerEvidenceRun = true;
                StartCoroutine(CapturePlayerEvidenceAfterRender());
            }
        }

        public void Configure(Material material, int seed, bool generateOnStart = false)
        {
            _surfaceMaterial = material;
            _startupSeed = seed;
            _startupAttemptIndex = 0;
            _startupContactFitMode = U4EContactFitMode.GlobalMin25mm;
            _generateOnStart = generateOnStart;
        }

        public void SetOverlayConfiguration(bool boundaries, bool contactGraph)
        {
            _showBoundaryOverlay = boundaries;
            _showContactGraph = contactGraph;
            RefreshOverlays();
        }

        public void SetDirectionalDebugOverlays(bool enabled)
        {
            _showDirectionalDebug = enabled;
            RefreshOverlays();
        }

        public U4EFormationBuildResult Generate(int seed, Vector3 rootPosition, float rootYawDegrees)
        {
            Quaternion rootRotation = Quaternion.Euler(0f, rootYawDegrees, 0f);
            MatterDomainPose pose = ToMatterPose(rootPosition, rootRotation);
            U4EFormationBuildResult result = U4ERockFormationBuilder.Build(seed, pose);
            if (!result.Accepted) throw new InvalidOperationException("U4E rejected seed " + seed + ": " + result.RejectionReason);
            _startupSeed = seed;
            _formation = result;
            BuildPresentation(result);
            return result;
        }

        public U4EFormationBuildResult GenerateExperiment(int seed, int attemptIndex,
            U4EContactFitMode fitMode, Vector3 rootPosition, float rootYawDegrees)
        {
            Quaternion rootRotation = Quaternion.Euler(0f, rootYawDegrees, 0f);
            MatterDomainPose pose = ToMatterPose(rootPosition, rootRotation);
            U4EFormationBuildResult result = U4ERockFormationBuilder.BuildExperiment(seed,
                attemptIndex, fitMode, pose);
            _formation = result;
            if (result.Accepted) BuildPresentation(result);
            else ClearPresentation();
            return result;
        }

        public U4EFormationBuildResult RegeneratePristine()
        {
            if (_formation == null || _formation.PristineDescriptor == null)
                throw new InvalidOperationException("The active formation has no pristine descriptor.");
            U4EFormationBuildResult result = U4ERockFormationBuilder.RegeneratePristine(_formation.PristineDescriptor);
            if (!result.Accepted) throw new InvalidOperationException("U4E pristine regeneration was rejected: " + result.RejectionReason);
            _formation = result;
            BuildPresentation(result);
            return result;
        }

        public U4EFormationEditResult EditChildLocal(string domainId, MatterFloat3 center, float radius)
        {
            EnsureFormation();
            U4EFormationEditResult edit = U4ERockFormationBuilder.RemoveSphereLocal(_formation, domainId, center, radius);
            if (edit.Changed)
            {
                U4EFormationChildBuild child = FindChild(domainId);
                ReplaceDomainMesh(child);
                RefreshOverlays();
            }
            return edit;
        }

        public U4EFormationEditResult MoveChild(string domainId, Vector3 position, float yawDegrees)
        {
            EnsureFormation();
            U4EFormationChildBuild child = FindChild(domainId);
            Quaternion rotation = Quaternion.Euler(0f, yawDegrees, 0f);
            MatterDomainPose pose = ToMatterPose(position, rotation);
            U4EFormationEditResult edit = U4ERockFormationBuilder.SetDomainPose(_formation, domainId, pose);
            GameObject childObject = _childObjects[domainId];
            SetChildLocalPose(childObject.transform, child.Domain.Pose);
            RefreshOverlays();
            return edit;
        }

        public string InspectFormationJson()
        {
            EnsureFormation();
            return JsonUtility.ToJson(CreateSummary(_formation), true);
        }

        public string InspectDomainJson(string domainId)
        {
            EnsureFormation();
            U4EFormationChildBuild child = FindChild(domainId);
            return JsonUtility.ToJson(new DomainReceipt
            {
                id = child.Domain.Id,
                slot = child.Recipe.slotId,
                parentSlot = child.Recipe.parentSlotId ?? string.Empty,
                relation = child.Recipe.relation,
                spacingMeters = child.Domain.SampleSpacingMeters,
                physicalScale = child.Recipe.physicalScale,
                sourceSeed = child.Recipe.sourceSeed,
                sourceRecipeHash = "0x" + child.Recipe.sourceRecipeHash.ToString("X16", CultureInfo.InvariantCulture),
                sourceGeometryHash = "0x" + child.SourceGeometryHash.ToString("X16", CultureInfo.InvariantCulture),
                sourceReferenceDiscardedAfterBake = child.SourceReferenceDiscardedAfterBake,
                contentHash = "0x" + child.Domain.ComputeContentHash().ToString("X16", CultureInfo.InvariantCulture),
                meshHash = "0x" + child.MeshBuild.Mesh.DeterministicHash.ToString("X16", CultureInfo.InvariantCulture),
                positionX = child.Domain.Pose.PositionMeters.X,
                positionY = child.Domain.Pose.PositionMeters.Y,
                positionZ = child.Domain.Pose.PositionMeters.Z,
                contentRevision = child.Domain.ContentRevision,
                meshRevision = child.Domain.MeshRevision,
                sampleCount = child.Domain.SampleCount,
                occupiedSampleCount = child.Domain.OccupiedCount,
                rawPayloadBytes = child.Domain.RawPayloadBytes,
                regionCount = child.MeshBuild.RegionCount,
                rebuiltRegionCount = child.MeshBuild.RebuiltRegionCount,
                reusedRegionCount = child.MeshBuild.ReusedRegionCount,
                vertices = child.MeshBuild.Mesh.Vertices.Length,
                triangles = child.MeshBuild.Mesh.TriangleCount,
                published = child.MeshBuild.Published
            }, true);
        }

        public string ContactGraphJson()
        {
            EnsureFormation();
            return JsonUtility.ToJson(_formation.ContactGraph, true);
        }

        public string PristineDescriptorJson()
        {
            EnsureFormation();
            return JsonUtility.ToJson(_formation.PristineDescriptor, true);
        }

        public void PrepareForBuild(int startupSeed)
        {
            ClearPresentation();
            _formation = null;
            _startupSeed = startupSeed;
            _startupAttemptIndex = 0;
            _startupContactFitMode = U4EContactFitMode.GlobalMin25mm;
            _generateOnStart = true;
            _showBoundaryOverlay = false;
            _showContactGraph = false;
            _showDirectionalDebug = false;
        }

        public void PrepareForExperimentBuild(int startupSeed, int attemptIndex, U4EContactFitMode fitMode)
        {
            ClearPresentation();
            _formation = null;
            _startupSeed = startupSeed;
            _startupAttemptIndex = attemptIndex;
            _startupContactFitMode = fitMode;
            _generateOnStart = true;
            _showBoundaryOverlay = false;
            _showContactGraph = false;
            _showDirectionalDebug = false;
        }

        public void ClearPreview()
        {
            ClearPresentation();
            _formation = null;
        }

        public void BuildPresentation(U4EFormationBuildResult result)
        {
            if (result == null || !result.Accepted) throw new ArgumentException("An accepted U4E build result is required.", nameof(result));
            ClearPresentation();
            _formation = result;
            EnsureMaterials();
            _presentationRoot = new GameObject("U4E Formation " + result.Seed.ToString(CultureInfo.InvariantCulture));
            _presentationRoot.transform.SetParent(transform, false);
            _presentationRoot.transform.SetPositionAndRotation(ToUnity(result.RootPose.PositionMeters), ToUnity(result.RootPose));

            CreateMeshObject(_presentationRoot.transform, "0.50m MatterWorld Terrain", result.TerrainMesh,
                Vector3.zero, Quaternion.identity, ActiveMaterial, false);
            for (int i = 0; i < result.Children.Count; i++)
            {
                U4EFormationChildBuild child = result.Children[i];
                GameObject childObject = CreateMeshObject(_presentationRoot.transform,
                    child.Recipe.slotId + " | " + child.Domain.Id, child.MeshBuild.Mesh,
                    ToLocalPosition(result.RootPose, child.Domain.Pose.PositionMeters),
                    ToLocalRotation(result.RootPose, child.Domain.Pose), ActiveMaterial, true);
                _childObjects.Add(child.Domain.Id, childObject);
            }
            RefreshOverlays();
        }

        public U4EFormationSummary CreateSummary()
        {
            EnsureFormation();
            return CreateSummary(_formation);
        }

        private void ReplaceDomainMesh(U4EFormationChildBuild child)
        {
            GameObject target = _childObjects[child.Domain.Id];
            Mesh oldMesh = target.GetComponent<MeshFilter>().sharedMesh;
            MatterMeshPublisher.Publish(child.MeshBuild.Mesh, target.name, out Mesh mesh);
            target.GetComponent<MeshFilter>().sharedMesh = mesh;
            _transientMeshes.Add(mesh);
            ReleaseMesh(oldMesh);
        }

        private void RefreshOverlays()
        {
            ClearTransientOverlays();
            if (_formation == null || _presentationRoot == null) return;
            EnsureMaterials();
            if (_showBoundaryOverlay)
            {
                for (int i = 0; i < _formation.Children.Count; i++)
                {
                    U4EFormationChildBuild child = _formation.Children[i];
                    Mesh wire = MatterMeshPublisher.CreateWireframe(child.MeshBuild.Mesh,
                        "U4E boundary " + child.Recipe.slotId);
                    if (wire == null) continue;
                    _transientMeshes.Add(wire);
                    var boundary = new GameObject("Boundary | " + child.Recipe.slotId);
                    boundary.transform.SetParent(_presentationRoot.transform, false);
                    boundary.transform.SetLocalPositionAndRotation(
                        ToLocalPosition(_formation.RootPose, child.Domain.Pose.PositionMeters),
                        ToLocalRotation(_formation.RootPose, child.Domain.Pose));
                    boundary.AddComponent<MeshFilter>().sharedMesh = wire;
                    var renderer = boundary.AddComponent<MeshRenderer>();
                    renderer.sharedMaterial = _overlayMaterial;
                    renderer.shadowCastingMode = ShadowCastingMode.Off;
                    renderer.receiveShadows = false;
                    _transientObjects.Add(boundary);
                }
            }
            if (_showContactGraph)
            {
                foreach (U4EContactMeasurement edge in _formation.ContactGraph.measurements)
                {
                    if (!edge.acceptedContact) continue;
                    var lineObject = new GameObject("Measured contact | " + edge.nodeA + " | " + edge.nodeB);
                    lineObject.transform.SetParent(_presentationRoot.transform, false);
                    var line = lineObject.AddComponent<LineRenderer>();
                    line.useWorldSpace = false;
                    line.positionCount = 2;
                    line.startWidth = .08f;
                    line.endWidth = .08f;
                    line.sharedMaterial = _overlayMaterial;
                    line.startColor = new Color(1f, .76f, .16f, 1f);
                    line.endColor = line.startColor;
                    line.SetPosition(0, ToRootLocal(edge.witnessOnAWorldMeters));
                    line.SetPosition(1, ToRootLocal(edge.witnessOnBWorldMeters));
                    _transientObjects.Add(lineObject);
                }
            }
            if (_showDirectionalDebug) RefreshDirectionalDebugOverlays();
        }

        private void RefreshDirectionalDebugOverlays()
        {
            EnsureDirectionalDebugMaterials();
            for (int childIndex = 0; childIndex < _formation.Children.Count; childIndex++)
            {
                U4EFormationChildBuild child = _formation.Children[childIndex];
                U4EDirectionalContactPatchMeasurement patch = child.Fit == null || child.Fit.measurement == null
                    ? null : child.Fit.measurement.directionalPatch;
                if (patch == null) continue;

                MatterFloat3 start = child.Domain.Pose.PositionMeters;
                MatterFloat3 end = new MatterFloat3(start.X + patch.directionX * 1.25f,
                    start.Y + patch.directionY * 1.25f, start.Z + patch.directionZ * 1.25f);
                var lineObject = new GameObject("Directional fit | " + child.Recipe.slotId);
                lineObject.transform.SetParent(_presentationRoot.transform, false);
                var line = lineObject.AddComponent<LineRenderer>();
                line.useWorldSpace = false;
                line.positionCount = 2;
                line.startWidth = .035f;
                line.endWidth = .012f;
                line.sharedMaterial = _directionalFitMaterial;
                line.startColor = new Color(.05f, .92f, 1f, 1f);
                line.endColor = line.startColor;
                line.SetPosition(0, ToRootLocal(start));
                line.SetPosition(1, ToRootLocal(end));
                _transientObjects.Add(lineObject);

                U4EContactWitness[] witnesses = patch.supportFacingWitnesses;
                if (witnesses == null || witnesses.Length == 0) continue;
                int stride = Math.Max(1, (witnesses.Length + 159) / 160);
                for (int witnessIndex = 0; witnessIndex < witnesses.Length; witnessIndex += stride)
                {
                    U4EContactWitness witness = witnesses[witnessIndex];
                    var marker = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                    marker.name = witness.acceptedContactBand
                        ? "Directional patch | " + child.Recipe.slotId
                        : "Directional support | " + child.Recipe.slotId;
                    marker.transform.SetParent(_presentationRoot.transform, false);
                    marker.transform.localPosition = ToRootLocal(new MatterFloat3(witness.x, witness.y, witness.z));
                    marker.transform.localScale = Vector3.one * .045f;
                    Collider collider = marker.GetComponent<Collider>();
                    if (collider != null) DestroyObject(collider);
                    MeshRenderer renderer = marker.GetComponent<MeshRenderer>();
                    renderer.sharedMaterial = witness.acceptedContactBand
                        ? _directionalPatchMaterial : _directionalRejectedMaterial;
                    renderer.shadowCastingMode = ShadowCastingMode.Off;
                    renderer.receiveShadows = false;
                    _transientObjects.Add(marker);
                }
            }
            Camera camera = FindSceneCameraForLegend();
            if (camera != null)
            {
                var legend = new GameObject("Directional contact legend");
                legend.transform.SetParent(camera.transform, false);
                legend.transform.localPosition = new Vector3(-2.65f, 1.25f, 4f);
                legend.transform.localRotation = Quaternion.identity;
                TextMesh text = legend.AddComponent<TextMesh>();
                text.text = "CYAN  fit direction\nGREEN  accepted patch\nMAGENTA  support-facing outside band";
                text.anchor = TextAnchor.UpperLeft;
                text.alignment = TextAlignment.Left;
                text.fontSize = 48;
                text.characterSize = .025f;
                text.color = Color.white;
                _transientObjects.Add(legend);
            }
        }

        private void EnsureDirectionalDebugMaterials()
        {
            if (_directionalPatchMaterial == null)
                _directionalPatchMaterial = MatterMeshPublisher.CreateDebugMaterial(new Color(.1f, 1f, .2f),
                    "U4E1 accepted directional patch", true);
            if (_directionalRejectedMaterial == null)
                _directionalRejectedMaterial = MatterMeshPublisher.CreateDebugMaterial(new Color(1f, .1f, .75f),
                    "U4E1 support-facing non-contact", true);
            if (_directionalFitMaterial == null)
                _directionalFitMaterial = MatterMeshPublisher.CreateDebugMaterial(new Color(.05f, .92f, 1f),
                    "U4E1 intended fit direction", true);
        }

        private Camera FindSceneCameraForLegend()
        {
            Camera[] cameras = Camera.allCameras;
            for (int index = 0; index < cameras.Length; index++)
                if (cameras[index].gameObject.scene == gameObject.scene) return cameras[index];
            return null;
        }

        private GameObject CreateMeshObject(Transform parent, string objectName, MatterMeshData data,
            Vector3 localPosition, Quaternion localRotation, Material material, bool isChild)
        {
            MatterMeshPublisher.Publish(data, objectName, out Mesh mesh);
            if (mesh == null || mesh.vertexCount == 0 || mesh.subMeshCount == 0)
                throw new InvalidOperationException("U4E Surface Nets produced no renderable triangles for " + objectName + ".");
            _transientMeshes.Add(mesh);
            var root = new GameObject(objectName);
            root.transform.SetParent(parent, false);
            root.transform.SetLocalPositionAndRotation(localPosition, localRotation);
            root.AddComponent<MeshFilter>().sharedMesh = mesh;
            var renderer = root.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = material;
            renderer.shadowCastingMode = ShadowCastingMode.On;
            renderer.receiveShadows = true;
            _transientObjects.Add(root);
            if (!isChild) return root;
            return root;
        }

        private void EnsureMaterials()
        {
            if (_surfaceMaterial == null && _fallbackMaterial == null)
                _fallbackMaterial = MatterMeshPublisher.CreateDebugMaterial(new Color(.47f, .49f, .51f),
                    "U4E neutral formation surface");
            if (_overlayMaterial == null)
                _overlayMaterial = MatterMeshPublisher.CreateDebugMaterial(new Color(.1f, .85f, .92f),
                    "U4E domain and contact overlay", true);
        }

        private Material ActiveMaterial => _surfaceMaterial != null ? _surfaceMaterial : _fallbackMaterial;

        private void ClearPresentation()
        {
            ClearTransientOverlays();
            _childObjects.Clear();
            for (int i = _transientObjects.Count - 1; i >= 0; i--) DestroyObject(_transientObjects[i]);
            _transientObjects.Clear();
            for (int i = _transientMeshes.Count - 1; i >= 0; i--) ReleaseMesh(_transientMeshes[i]);
            _transientMeshes.Clear();
            if (_presentationRoot != null) DestroyObject(_presentationRoot);
            _presentationRoot = null;
        }

        private void ClearTransientOverlays()
        {
            // Overlay objects and meshes are kept in the same ownership lists as rendered geometry.
            // Rebuild the lists from the non-overlay objects after removing the overlay prefix.
            for (int i = _transientObjects.Count - 1; i >= 0; i--)
            {
                GameObject value = _transientObjects[i];
                if (value == null || value.name.StartsWith("Boundary | ", StringComparison.Ordinal) ||
                    value.name.StartsWith("Measured contact | ", StringComparison.Ordinal) ||
                    value.name.StartsWith("Directional fit | ", StringComparison.Ordinal) ||
                    value.name.StartsWith("Directional patch | ", StringComparison.Ordinal) ||
                    value.name.StartsWith("Directional support | ", StringComparison.Ordinal) ||
                    value.name.StartsWith("Directional contact legend", StringComparison.Ordinal))
                {
                    if (value != null) DestroyObject(value);
                    _transientObjects.RemoveAt(i);
                }
            }
            // Wires are only created while overlays are enabled; release those no longer referenced by filters.
            var referenced = new HashSet<Mesh>();
            foreach (GameObject value in _transientObjects)
            {
                if (value == null) continue;
                MeshFilter filter = value.GetComponent<MeshFilter>();
                if (filter != null && filter.sharedMesh != null) referenced.Add(filter.sharedMesh);
            }
            for (int i = _transientMeshes.Count - 1; i >= 0; i--)
            {
                Mesh mesh = _transientMeshes[i];
                if (mesh == null || !referenced.Contains(mesh))
                {
                    _transientMeshes.RemoveAt(i);
                    DestroyObject(mesh);
                }
            }
        }

        private void ReleaseMesh(Mesh mesh)
        {
            if (mesh == null) return;
            _transientMeshes.Remove(mesh);
            DestroyObject(mesh);
        }

        private static void DestroyObject(UnityEngine.Object value)
        {
            if (value == null) return;
            if (Application.isPlaying) Destroy(value);
            else DestroyImmediate(value);
        }

        private void OnDestroy()
        {
            ClearPresentation();
            if (_fallbackMaterial != null) DestroyObject(_fallbackMaterial);
            if (_overlayMaterial != null) DestroyObject(_overlayMaterial);
            if (_directionalPatchMaterial != null) DestroyObject(_directionalPatchMaterial);
            if (_directionalRejectedMaterial != null) DestroyObject(_directionalRejectedMaterial);
            if (_directionalFitMaterial != null) DestroyObject(_directionalFitMaterial);
        }

        private void EnsureFormation()
        {
            if (_formation == null || !_formation.Accepted) throw new InvalidOperationException("Generate a U4E formation first.");
        }

        private U4EFormationChildBuild FindChild(string domainId)
        {
            for (int i = 0; i < _formation.Children.Count; i++)
                if (string.Equals(_formation.Children[i].Domain.Id, domainId, StringComparison.Ordinal)) return _formation.Children[i];
            throw new KeyNotFoundException("U4E child domain not found: " + domainId);
        }

        private Vector3 ToRootLocal(MatterFloat3 world)
        {
            Vector3 local = _presentationRoot.transform.InverseTransformPoint(ToUnity(world));
            return local;
        }

        private void SetChildLocalPose(Transform target, MatterDomainPose domainPose)
        {
            target.SetLocalPositionAndRotation(ToLocalPosition(_formation.RootPose, domainPose.PositionMeters),
                ToLocalRotation(_formation.RootPose, domainPose));
        }

        private static Vector3 ToLocalPosition(MatterDomainPose rootPose, MatterFloat3 worldPosition)
            => ToUnity(rootPose.InverseTransformPoint(worldPosition));

        private static Quaternion ToLocalRotation(MatterDomainPose rootPose, MatterDomainPose domainPose)
            => Quaternion.Inverse(ToUnity(rootPose)) * ToUnity(domainPose);

        private static MatterDomainPose ToMatterPose(Vector3 position, Quaternion rotation)
            => new MatterDomainPose(new MatterFloat3(position.x, position.y, position.z),
                rotation.x, rotation.y, rotation.z, rotation.w);

        private static Vector3 ToUnity(MatterFloat3 value) => new Vector3(value.X, value.Y, value.Z);

        private static Quaternion ToUnity(MatterDomainPose value)
            => new Quaternion(value.RotationX, value.RotationY, value.RotationZ, value.RotationW);

        private static U4EFormationSummary CreateSummary(U4EFormationBuildResult result)
        {
            var children = new U4EFormationDomainSummary[result.Children.Count];
            for (int i = 0; i < children.Length; i++)
            {
                U4EFormationChildBuild child = result.Children[i];
                children[i] = new U4EFormationDomainSummary
                {
                    id = child.Domain.Id,
                    slot = child.Recipe.slotId,
                    parentSlot = child.Recipe.parentSlotId ?? string.Empty,
                    spacingMeters = child.Domain.SampleSpacingMeters,
                    sourceRecipeHash = "0x" + child.Recipe.sourceRecipeHash.ToString("X16", CultureInfo.InvariantCulture),
                    sourceGeometryHash = "0x" + child.SourceGeometryHash.ToString("X16", CultureInfo.InvariantCulture),
                    contentHash = "0x" + child.Domain.ComputeContentHash().ToString("X16", CultureInfo.InvariantCulture),
                    meshHash = "0x" + child.MeshBuild.Mesh.DeterministicHash.ToString("X16", CultureInfo.InvariantCulture),
                    contentRevision = child.Domain.ContentRevision,
                    meshRevision = child.Domain.MeshRevision,
                    sampleCount = child.Domain.SampleCount,
                    occupiedSampleCount = child.Domain.OccupiedCount,
                    rawPayloadBytes = child.Domain.RawPayloadBytes,
                    regionCount = child.MeshBuild.RegionCount,
                    rebuiltRegionCount = child.MeshBuild.RebuiltRegionCount,
                    reusedRegionCount = child.MeshBuild.ReusedRegionCount,
                    vertices = child.MeshBuild.Mesh.Vertices.Length,
                    triangles = child.MeshBuild.Mesh.TriangleCount,
                    sourceReferenceDiscardedAfterBake = child.SourceReferenceDiscardedAfterBake
                };
            }
            return new U4EFormationSummary
            {
                phase = "U4E Procedural Multi-Domain Rock Formation",
                contactFitMode = result.ContactFitMode.ToString(),
                accepted = result.Accepted,
                seed = result.Seed,
                attemptIndex = result.AttemptIndex,
                archetype = result.Archetype.ToString(),
                formationHash = result.FormationHash,
                sourceGeometryHash = result.SourceGeometryHash,
                terrainSourceSeed = result.TerrainWorld.SourceSeed,
                terrainSourceVersion = result.TerrainWorld.SourceVersion,
                terrainSpacingMeters = result.TerrainWorld.SampleSpacingMeters,
                terrainBoundsMin = result.TerrainBounds.MinInclusive.ToString(),
                terrainBoundsMaxExclusive = result.TerrainBounds.MaxExclusive.ToString(),
                sourceAndBakeMilliseconds = result.SourceAndBakeMilliseconds,
                terrainMeshingMilliseconds = result.TerrainMeshingMilliseconds,
                domainMeshingMilliseconds = result.MeshingMilliseconds,
                contactMeasurementMilliseconds = result.ContactMilliseconds,
                totalDomainSamples = result.TotalDomainSamples,
                totalDomainPayloadBytes = result.TotalDomainPayloadBytes,
                contactGraphHash = result.ContactGraph.graphHash,
                acceptedContactEdgeCount = result.ContactGraph.acceptedEdgeCount,
                possiblePairCount = result.ContactGraph.possiblePairCount,
                connectedNodeCount = result.ContactGraph.connectedNodeCount,
                connectedToTerrain = result.ContactGraph.allChildrenConnectedToTerrain,
                candidateAttemptDiagnostics = result.CandidateAttemptDiagnostics,
                children = children,
                intendedContacts = CreateIntendedContactSummaries(result)
            };
        }

        private static U4EIntendedContactSummary[] CreateIntendedContactSummaries(U4EFormationBuildResult result)
        {
            var contacts = new List<U4EIntendedContactSummary>();
            for (int index = 0; index < result.Children.Count; index++)
            {
                U4EFormationChildBuild child = result.Children[index];
                U4EContactMeasurement measurement = child.Fit == null ? null : child.Fit.measurement;
                U4EDirectionalContactPatchMeasurement patch = measurement == null ? null : measurement.directionalPatch;
                if (measurement == null || patch == null) continue;
                contacts.Add(new U4EIntendedContactSummary
                {
                    slot = child.Recipe.slotId,
                    parentSlot = child.Recipe.parentSlotId ?? U4EFormationConfiguration.TerrainNodeId,
                    spacingMovingMeters = measurement.spacingAMeters,
                    spacingAnchorMeters = measurement.spacingBMeters,
                    globalMinimumGapMeters = measurement.minimumSurfaceGapMeters,
                    directionalMinimumGapMeters = patch.minimumDirectionalGapMeters,
                    directionalMedianGapMeters = patch.areaWeightedMedianDirectionalGapMeters,
                    supportFacingTriangleCount = patch.supportFacingTriangleCount,
                    supportFacingAreaSquareMeters = patch.supportFacingSurfaceAreaSquareMeters,
                    acceptedPatchAreaSquareMeters = patch.acceptedPatchAreaSquareMeters,
                    patchAreaRatio = patch.contactPatchAreaRatio,
                    witnessSpanAMeters = patch.witnessSpanAMeters,
                    witnessSpanBMeters = patch.witnessSpanBMeters,
                    patchDiagonalMeters = patch.contactPatchDiagonalMeters,
                    fittingTranslationMeters = measurement.fittingAdjustmentMeters,
                    aToBPositiveSampleCount = measurement.aToBPositiveSampleCount,
                    bToAPositiveSampleCount = measurement.bToAPositiveSampleCount,
                    maximumSurfacePenetrationMeters = Math.Max(0f,
                        -Math.Min(measurement.minimumSurfaceGapMeters, patch.minimumDirectionalGapMeters)),
                    accepted = child.Fit.accepted && measurement.HasZeroSampledOverlap,
                    weakPatchReason = patch.weakPatchReason,
                    supportFacingWitnesses = patch.supportFacingWitnesses,
                    contactWitnesses = patch.contactWitnesses
                });
            }
            return contacts.ToArray();
        }

        private IEnumerator CapturePlayerEvidenceAfterRender()
        {
            yield return null;
            yield return new WaitForEndOfFrame();
            string root = GetPlayerEvidenceRoot();
            if (string.IsNullOrWhiteSpace(root)) yield break;
            string player = Path.Combine(root, "player");
            Directory.CreateDirectory(player);
            ScreenCapture.CaptureScreenshot(Path.Combine(player, "capture.png"));
            File.WriteAllText(Path.Combine(player, "receipt.json"), InspectFormationJson());
            yield return null;
            yield return null;
            Application.Quit(0);
        }

        private static bool HasPlayerEvidenceArgument()
        {
            string[] args = Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length; i++) if (args[i].StartsWith("--u4e-evidence-root=", StringComparison.Ordinal)) return true;
            return false;
        }

        private static int ReadPlayerIntArgument(string prefix, int fallback)
        {
            if (!TryReadPlayerArgument(prefix, out string value) ||
                !int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out int parsed)) return fallback;
            return parsed;
        }

        private static bool TryReadPlayerArgument(string prefix, out string value)
        {
            string[] args = Environment.GetCommandLineArgs();
            for (int index = 0; index < args.Length; index++)
            {
                if (!args[index].StartsWith(prefix, StringComparison.Ordinal)) continue;
                value = args[index].Substring(prefix.Length);
                return true;
            }
            value = string.Empty;
            return false;
        }

        private static string GetPlayerEvidenceRoot()
        {
            string[] args = Environment.GetCommandLineArgs();
            const string prefix = "--u4e-evidence-root=";
            for (int i = 0; i < args.Length; i++)
                if (args[i].StartsWith(prefix, StringComparison.Ordinal)) return Path.GetFullPath(args[i].Substring(prefix.Length));
            return string.Empty;
        }

        [Serializable]
        public sealed class U4EFormationSummary
        {
            public string phase;
            public string contactFitMode;
            public bool accepted;
            public int seed;
            public int attemptIndex;
            public string archetype;
            public string formationHash;
            public string sourceGeometryHash;
            public int terrainSourceSeed;
            public int terrainSourceVersion;
            public float terrainSpacingMeters;
            public string terrainBoundsMin;
            public string terrainBoundsMaxExclusive;
            public double sourceAndBakeMilliseconds;
            public double terrainMeshingMilliseconds;
            public double domainMeshingMilliseconds;
            public double contactMeasurementMilliseconds;
            public int totalDomainSamples;
            public long totalDomainPayloadBytes;
            public string contactGraphHash;
            public int acceptedContactEdgeCount;
            public int possiblePairCount;
            public int connectedNodeCount;
            public bool connectedToTerrain;
            public string[] candidateAttemptDiagnostics;
            public U4EFormationDomainSummary[] children;
            public U4EIntendedContactSummary[] intendedContacts;
        }

        [Serializable]
        public sealed class U4EIntendedContactSummary
        {
            public string slot;
            public string parentSlot;
            public float spacingMovingMeters;
            public float spacingAnchorMeters;
            public float globalMinimumGapMeters;
            public float directionalMinimumGapMeters;
            public float directionalMedianGapMeters;
            public int supportFacingTriangleCount;
            public float supportFacingAreaSquareMeters;
            public float acceptedPatchAreaSquareMeters;
            public float patchAreaRatio;
            public float witnessSpanAMeters;
            public float witnessSpanBMeters;
            public float patchDiagonalMeters;
            public float fittingTranslationMeters;
            public int aToBPositiveSampleCount;
            public int bToAPositiveSampleCount;
            public float maximumSurfacePenetrationMeters;
            public bool accepted;
            public string weakPatchReason;
            public U4EContactWitness[] supportFacingWitnesses;
            public U4EContactWitness[] contactWitnesses;
        }

        [Serializable]
        public sealed class U4EFormationDomainSummary
        {
            public string id;
            public string slot;
            public string parentSlot;
            public float spacingMeters;
            public string sourceRecipeHash;
            public string sourceGeometryHash;
            public string contentHash;
            public string meshHash;
            public long contentRevision;
            public long meshRevision;
            public int sampleCount;
            public int occupiedSampleCount;
            public long rawPayloadBytes;
            public int regionCount;
            public int rebuiltRegionCount;
            public int reusedRegionCount;
            public int vertices;
            public int triangles;
            public bool sourceReferenceDiscardedAfterBake;
        }

        [Serializable]
        private sealed class DomainReceipt
        {
            public string id;
            public string slot;
            public string parentSlot;
            public string relation;
            public float spacingMeters;
            public float physicalScale;
            public int sourceSeed;
            public string sourceRecipeHash;
            public string sourceGeometryHash;
            public bool sourceReferenceDiscardedAfterBake;
            public string contentHash;
            public string meshHash;
            public float positionX, positionY, positionZ;
            public long contentRevision;
            public long meshRevision;
            public int sampleCount;
            public int occupiedSampleCount;
            public long rawPayloadBytes;
            public int regionCount;
            public int rebuiltRegionCount;
            public int reusedRegionCount;
            public int vertices;
            public int triangles;
            public bool published;
        }
    }
}
