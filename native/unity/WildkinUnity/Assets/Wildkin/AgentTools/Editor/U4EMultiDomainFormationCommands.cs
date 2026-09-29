using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using Unity.Pipeline.Commands;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.HighDefinition;
using UnityEngine.SceneManagement;
using Wildkin.Matter;
using Wildkin.Matter.Unity;
using Process = System.Diagnostics.Process;
using ProcessStartInfo = System.Diagnostics.ProcessStartInfo;

namespace Wildkin.AgentTools.Editor
{
    /// <summary>Reproducible U4E scene, gallery, contact, edit, capture, and Player commands.</summary>
    public static class U4EMultiDomainFormationCommands
    {
        private const string ScenePath = "Assets/Wildkin/Scenes/Tech/U4EMultiDomainFormation.unity";
        private const string MaterialPath = "Assets/Wildkin/Matter/Materials/U4B/U4BStylizedRockDirt.mat";
        private const string ExposurePath = "Assets/Wildkin/Matter/Materials/U4C/U4CNeutralExposure.asset";
        private const string EvidenceRelativePath = "native/evidence/unity/u4e-multi-domain-formations";
        private const string U4E1EvidenceRelativePath = "native/evidence/unity/u4e1-directional-contact";
        private static readonly int[] U4E1FrozenSeeds = { 7000, 7004, 7010, 7015, 7017, 7019 };
        private const int GalleryColumns = 5;
        private const float GalleryTileSpacing = 15.5f;

        [Serializable]
        private sealed class GalleryReceipt
        {
            public string phase = "U4E 20-seed deterministic multi-domain gallery";
            public int requestedSeedCount;
            public int acceptedSeedCount;
            public int rejectedSeedCount;
            public bool allSeedsAccepted;
            public int distinctArchetypeCount;
            public string resolutionTierPolicy = "One deterministic silhouette-critical child per formation at 0.125 m; all siblings at 0.25 m.";
            public string contactMethod = U4EContactProbe.OverlapMethod;
            public string[] heroSeeds;
            public string[] alternateAngleSeeds;
            public string weakestAcceptedSeed;
            public GalleryRow[] formations;
        }

        [Serializable]
        private sealed class GalleryRow
        {
            public int seed;
            public int attemptIndex;
            public string archetype;
            public bool accepted;
            public string rejectionReason;
            public string[] candidateAttemptDiagnostics;
            public string formationHash;
            public string sourceGeometryHash;
            public string graphHash;
            public int childCount;
            public int tier0125Count;
            public int tier025Count;
            public int acceptedContactEdges;
            public int crossTierContactEdges;
            public int possiblePairs;
            public bool graphConnectedToTerrain;
            public int zeroOverlapPairs;
            public int zeroSiblingOverlapPairs;
            public int zeroTerrainOverlapPairs;
            public float minimumContactGapMeters;
            public float maximumContactGapMeters;
            public float maximumFitAdjustmentMeters;
            public long descriptorBytes;
            public double descriptorPercentOfRawMatter;
            public float formationWidthMeters;
            public float formationHeightMeters;
            public float formationDepthMeters;
            public double sourceAndBakeMilliseconds;
            public double terrainMeshingMilliseconds;
            public double domainMeshingMilliseconds;
            public double contactMeasurementMilliseconds;
            public long rawDomainBytes;
            public U4EMultiDomainFormationView.U4EFormationSummary receipt;
        }

        [Serializable]
        private sealed class EvidenceSequenceReceipt
        {
            public string phase = "U4E capture, edit, persistence, and regeneration evidence";
            public string representativeSeed;
            public string descriptorPath;
            public long descriptorUtf8Bytes;
            public long rawChildMatterBytes;
            public bool descriptorBelowTenPercentOfMatter;
            public string initialFormationHash;
            public string regeneratedFormationHash;
            public bool regeneratedHashMatches;
            public string initialSourceGeometryHash;
            public string regeneratedSourceGeometryHash;
            public bool sourceGeometryHashMatches;
            public string initialContactGraphHash;
            public string regeneratedContactGraphHash;
            public bool contactGraphHashMatches;
            public string[] pristineChildIds;
            public string[] regeneratedChildIds;
            public string[] pristineChildContentHashes;
            public string[] regeneratedChildContentHashes;
            public string[] pristineChildMeshHashes;
            public string[] regeneratedChildMeshHashes;
            public string[] pristineChildSourceGeometryHashes;
            public string[] regeneratedChildSourceGeometryHashes;
            public bool childIdsMatch;
            public bool childContentHashesMatch;
            public bool childMeshHashesMatch;
            public bool childSourceGeometryHashesMatch;
            public string editDomainId;
            public int editChangedSampleCount;
            public int editDirectRegions;
            public int editRebuiltRegions;
            public int editReusedRegions;
            public string editBeforeContentHash;
            public string editAfterContentHash;
            public string editBeforeMeshHash;
            public string editAfterMeshHash;
            public string[] invalidatedContactPairs;
            public bool worldRevisionUnchanged;
            public string contactGraphPath;
            public string editedContactGraphPath;
        }

        [Serializable]
        private sealed class EditEvidenceReceipt
        {
            public string phase = "One-child local carve, regional remesh, and incident-contact refresh";
            public bool changed;
            public string editedDomainId;
            public int changedSampleCount;
            public int samplesExamined;
            public int directRegions;
            public int rebuiltRegions;
            public int reusedRegions;
            public string beforeContentHash;
            public string afterContentHash;
            public string beforeMeshHash;
            public string afterMeshHash;
            public string[] invalidatedContactPairs;
            public bool contactGraphConnectedToTerrain;
            public long terrainRevisionBefore;
            public long terrainRevisionAfter;
            public int terrainEditCountBefore;
            public int terrainEditCountAfter;
            public bool terrainUnchanged;
            public SiblingEditReceipt[] siblings;
            public bool siblingsUnchanged;
        }

        [Serializable]
        private sealed class SiblingEditReceipt
        {
            public string domainId;
            public string beforeContentHash;
            public string afterContentHash;
            public string beforeMeshHash;
            public string afterMeshHash;
            public bool unchanged;
        }

        [Serializable]
        private sealed class PlayerBuildReceipt
        {
            public string unityVersion;
            public string result;
            public string outputPath;
            public string scenePath;
            public int processExitCode;
            public ulong outputBytes;
            public int errors;
            public int warnings;
            public double buildSeconds;
            public string capturePath;
            public bool playerReceiptPresent;
            public bool playerCapturePresent;
        }

        [Serializable]
        private sealed class U4E1BakeoffReceipt
        {
            public string result = "UNREVIEWED_PENDING_INDEPENDENT_VISUAL_REVIEW";
            public string disposition;
            public string unityVersion;
            public string baselineEvidencePath;
            public string baselineHoldDisposition;
            public bool allBaselineSeedsReproduced;
            public bool allBaselineGraphHashesMatch;
            public bool allBaselineFormationHashesMatch;
            public bool baselineCapturePixelsMatchWhereReferenceExists;
            public bool sourceAndMatterInvariantAcrossMethods;
            public bool allCandidateMethodsPreserveZeroSampledOverlap;
            public bool allCandidateMethodsRemainConnectedToTerrain;
            public float minimumNormalAlignmentDot = U4EContactProbe.DirectionalNormalAlignmentMinDot;
            public float directionalContactBandHalfWidthMeters = U4EContactProbe.DirectionalContactBandHalfWidthMeters;
            public int focusedBaselineAttemptCount;
            public int baselineCaptureComparisonCount;
            public int baselineCapturePixelMatchCount;
            public int bAcceptedSeedCount;
            public int cAcceptedSeedCount;
            public string playerMethod;
            public U4E1CaptureParity[] baselineCaptureComparisons = Array.Empty<U4E1CaptureParity>();
            public U4E1SeedComparison[] seeds = Array.Empty<U4E1SeedComparison>();
        }

        [Serializable]
        private sealed class U4E1SeedComparison
        {
            public int seed;
            public int attemptIndex;
            public bool baselineMetricsMatch;
            public bool baselineGraphHashMatch;
            public bool baselineFormationHashMatch;
            public string regeneratedGraphHash;
            public string regeneratedFormationHash;
            public string baselineMismatch;
            public U4E1MethodComparison[] methods = Array.Empty<U4E1MethodComparison>();
        }

        [Serializable]
        private sealed class U4E1MethodComparison
        {
            public string method;
            public bool accepted;
            public bool completeFormation;
            public string rejectionReason;
            public string formationHash;
            public string sourceGeometryHash;
            public string contactGraphHash;
            public bool graphConnectedToTerrain;
            public int acceptedContactEdges;
            public int possibleContactEdges;
            public bool pairOverlapValidationComplete;
            public int zeroOverlapPairs;
            public bool zeroOverlapAllPairs;
            public bool sourceMatterInvariantToA;
            public bool partialSourceMatterInvariantToA;
            public int fittingCandidateEvaluations;
            public float maximumSurfacePenetrationMeters;
            public U4E1ChildHash[] children = Array.Empty<U4E1ChildHash>();
            public U4E1IntendedContact[] intendedContacts = Array.Empty<U4E1IntendedContact>();
            public string primaryCapturePath;
            public string alternateCapturePath;
        }

        [Serializable]
        private sealed class U4E1ChildHash
        {
            public string id;
            public string slot;
            public string sourceRecipeHash;
            public string sourceGeometryHash;
            public string contentHash;
            public string meshHash;
            public float sampleSpacingMeters;
            public long meshRevision;
        }

        [Serializable]
        private sealed class U4E1IntendedContact
        {
            public string slot;
            public string parentSlot;
            public float spacingMovingMeters;
            public float spacingAnchorMeters;
            public float globalMinimumGapMeters;
            public float directionalMinimumGapMeters;
            public float directionalMedianGapMeters;
            public int supportFacingTriangleCount;
            public int acceptedPatchTriangleCount;
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
            public string fitRejectionReason;
            public int contactWitnessPositionCount;
            public bool contactWitnessPositionsTruncated;
            public string weakPatchReason;
            public U4EContactWitness[] supportFacingWitnesses = Array.Empty<U4EContactWitness>();
            public U4EContactWitness[] contactWitnesses = Array.Empty<U4EContactWitness>();
        }

        [Serializable]
        private sealed class U4E1CaptureParity
        {
            public int seed;
            public string view;
            public string referencePath;
            public bool pixelMatch;
        }

        [Serializable]
        private sealed class U4E1ContactLedger
        {
            public string phase = "U4E.1 intended-parent directional contact measurements";
            public string normalFilter = "outward triangle normal dot directionTowardAnchor >= fixed threshold";
            public float minimumNormalAlignmentDot;
            public float contactBandHalfWidthMeters;
            public U4E1ContactLedgerRow[] contacts = Array.Empty<U4E1ContactLedgerRow>();
        }

        [Serializable]
        private sealed class U4E1ContactLedgerRow
        {
            public int seed;
            public int attemptIndex;
            public string method;
            public U4E1IntendedContact contact;
        }

        [Serializable]
        private sealed class U4E1PlayerBuildReceipt
        {
            public string method;
            public int seed;
            public int attemptIndex;
            public string unityVersion;
            public string result;
            public string outputPath;
            public string scenePath;
            public int processExitCode;
            public ulong outputBytes;
            public int errors;
            public int warnings;
            public double buildSeconds;
            public string capturePath;
            public bool playerReceiptPresent;
            public bool playerCapturePresent;
        }

        private sealed class GalleryRun
        {
            public U4EFormationBuildResult Formation;
            public U4EMultiDomainFormationView View;
            public int Seed;
        }

        [CliCommand("u4e_prepare_scene", "Create the isolated U4E formation scene and reproducible startup configuration.",
            MainThreadRequired = true, Tags = new[] { "u4e", "matter", "scene" })]
        public static string PrepareScene()
        {
            EnsureAssetFolder("Assets/Wildkin/Scenes");
            EnsureAssetFolder("Assets/Wildkin/Scenes/Tech");
            Scene previousActive = SceneManager.GetActiveScene();
            Scene scene = SceneManager.GetSceneByPath(ScenePath);
            if (!scene.IsValid() || !scene.isLoaded)
            {
                if (File.Exists(ScenePath)) scene = EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Additive);
                else
                {
                    scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Additive);
                    scene.name = "U4EMultiDomainFormation";
                    SceneManager.SetActiveScene(scene);
                    CreateEnvironment(scene);
                    var host = new GameObject("U4E Multi-Domain Formation Qualification");
                    SceneManager.MoveGameObjectToScene(host, scene);
                    host.AddComponent<U4EMultiDomainFormationView>();
                }
            }
            SceneManager.SetActiveScene(scene);
            U4EMultiDomainFormationView view = FindView(scene);
            Material material = AssetDatabase.LoadAssetAtPath<Material>(MaterialPath);
            if (material == null) throw new FileNotFoundException("The accepted U4B stylized rock/dirt material is missing.", MaterialPath);
            view.Configure(material, U4EFormationConfiguration.GallerySeedStart, false);
            EditorUtility.SetDirty(view);
            EditorSceneManager.MarkSceneDirty(scene);
            if (!EditorSceneManager.SaveScene(scene, ScenePath)) throw new IOException("Could not save the U4E scene.");
            AssetDatabase.SaveAssets();
            if (previousActive.IsValid() && previousActive.isLoaded && previousActive.path != ScenePath)
                SceneManager.SetActiveScene(previousActive);
            return JsonUtility.ToJson(new SceneReceipt
            {
                scenePath = ScenePath,
                evidencePath = EvidencePath(),
                unityVersion = Application.unityVersion,
                target = "Windows x64 Development Player",
                materialPath = MaterialPath,
                startupSeed = U4EFormationConfiguration.GallerySeedStart
            }, true);
        }

        [CliCommand("u4e_generate_formation", "Generate one deterministic U4E seed in the active qualification scene.",
            MainThreadRequired = true, Tags = new[] { "u4e", "matter", "generate" })]
        public static string GenerateFormation(
            [CliArg("seed", "Deterministic formation seed.")] int seed = U4EFormationConfiguration.GallerySeedStart,
            [CliArg("boundaries", "Show separate child-domain mesh boundaries.")] bool boundaries = false,
            [CliArg("contacts", "Show geometry-measured contact graph edges.")] bool contacts = false)
        {
            U4EMultiDomainFormationView view = GetView();
            view.Generate(seed, Vector3.zero, 0f);
            view.SetOverlayConfiguration(boundaries, contacts);
            FrameHeroCamera(Vector3.zero, 0f);
            return view.InspectFormationJson();
        }

        [CliCommand("u4e_inspect_formation", "Return the active U4E child, resolution, mesh, graph, and performance receipt.",
            MainThreadRequired = true, Tags = new[] { "u4e", "matter", "inspect" })]
        public static string InspectFormation() => GetView().InspectFormationJson();

        [CliCommand("u4e_inspect_child_domain", "Inspect one independent U4E child MatterDomain and its mesh regions.",
            MainThreadRequired = true, Tags = new[] { "u4e", "matter", "inspect" })]
        public static string InspectChildDomain([CliArg("id", "Stable U4E child domain ID.")] string id)
            => GetView().InspectDomainJson(id);

        [CliCommand("u4e_inspect_contact_graph", "Inspect measured U4E surface gaps, witnesses, overlap counts, and graph connectivity.",
            MainThreadRequired = true, Tags = new[] { "u4e", "matter", "contact" })]
        public static string InspectContactGraph() => GetView().ContactGraphJson();

        [CliCommand("u4e_edit_child_local", "Subtract from one U4E child, incrementally remesh it, and refresh only its incident contact pairs.",
            MainThreadRequired = true, Tags = new[] { "u4e", "matter", "edit" })]
        public static string EditChildLocal(
            [CliArg("id", "Stable U4E child domain ID.")] string id,
            [CliArg("x", "Local metric-space center X.")] float x,
            [CliArg("y", "Local metric-space center Y.")] float y,
            [CliArg("z", "Local metric-space center Z.")] float z,
            [CliArg("radius", "Subtractive radius in metres.")] float radius)
            => JsonUtility.ToJson(GetView().EditChildLocal(id, new MatterFloat3(x, y, z), radius), true);

        [CliCommand("u4e_regenerate_pristine", "Destroy the current presentation and rebuild it from its compact pristine descriptor.",
            MainThreadRequired = true, Tags = new[] { "u4e", "matter", "persistence" })]
        public static string RegeneratePristine()
        {
            U4EMultiDomainFormationView view = GetView();
            U4EFormationBuildResult result = view.RegeneratePristine();
            return view.InspectFormationJson();
        }

        [CliCommand("u4e_generate_20_seed_gallery", "Generate the bounded deterministic 20-seed U4E contact sheet and machine-readable metrics.",
            MainThreadRequired = true, Tags = new[] { "u4e", "matter", "gallery", "evidence" })]
        public static string Generate20SeedGallery()
        {
            GalleryRun[] gallery = BuildGallery(GetView());
            GalleryReceipt receipt = CreateGalleryReceipt(gallery);
            string root = EvidencePath();
            Directory.CreateDirectory(Path.Combine(root, "metrics"));
            WriteJson(Path.Combine(root, "metrics", "gallery.json"), receipt);
            SaveCameraCapture(FindSceneCamera(), Path.Combine(root, "captures", "gallery-20.png"), 2048, 1536);
            return JsonUtility.ToJson(receipt, true);
        }

        [CliCommand("u4e_capture_evidence_sequence", "Capture the gallery, heroes, alternate views, weakest accepted seed, boundaries, graph, edit, and descriptor regeneration.",
            MainThreadRequired = true, Tags = new[] { "u4e", "matter", "evidence" })]
        public static string CaptureEvidenceSequence()
        {
            string root = EvidencePath();
            EnsureEvidenceFolders(root);
            U4EMultiDomainFormationView view = GetView();
            GalleryRun[] gallery = BuildGallery(view);
            GalleryReceipt galleryReceipt = CreateGalleryReceipt(gallery);
            WriteJson(Path.Combine(root, "metrics", "gallery.json"), galleryReceipt);
            SaveCameraCapture(FindSceneCamera(), Path.Combine(root, "captures", "gallery-20.png"), 2048, 1536);

            GalleryRun[] heroes = SelectHeroes(gallery);
            string[] heroSeeds = new string[heroes.Length];
            for (int i = 0; i < heroes.Length; i++)
            {
                heroSeeds[i] = heroes[i].Seed.ToString(CultureInfo.InvariantCulture);
                ClearGallery(view, gallery);
                U4EFormationBuildResult hero = view.Generate(heroes[i].Seed, Vector3.zero, 0f);
                view.SetOverlayConfiguration(false, false);
                FrameHeroCamera(Vector3.zero, 22f + i * 37f);
                string heroPath = Path.Combine(root, "captures", "heroes", "hero-" + hero.Seed.ToString(CultureInfo.InvariantCulture) + ".png");
                SaveCameraCapture(FindSceneCamera(), heroPath, 1920, 1080);
                WriteJson(Path.Combine(root, "metrics", "hero-" + hero.Seed.ToString(CultureInfo.InvariantCulture) + ".json"), view.CreateSummary());
                if (i < 3)
                {
                    FrameHeroCamera(Vector3.zero, 112f + i * 41f);
                    SaveCameraCapture(FindSceneCamera(), Path.Combine(root, "captures", "alternate", "alternate-" + hero.Seed.ToString(CultureInfo.InvariantCulture) + ".png"), 1920, 1080);
                }
            }

            GalleryRun weakest = SelectWeakest(gallery);
            ClearGallery(view, gallery);
            view.Generate(weakest.Seed, Vector3.zero, 0f);
            view.SetOverlayConfiguration(false, false);
            FrameHeroCamera(Vector3.zero, 35f);
            SaveCameraCapture(FindSceneCamera(), Path.Combine(root, "captures", "weakest", "weakest-" + weakest.Seed.ToString(CultureInfo.InvariantCulture) + ".png"), 1920, 1080);

            // Seed 7000 is the edit/remesh regression fixture covered by the focused EditMode test.
            // Keep gallery-selected hero seeds for presentation, and use this stable fixture for stateful evidence.
            GalleryRun representativeRow = gallery[0];
            U4EFormationBuildResult representative = view.Generate(representativeRow.Seed, Vector3.zero, 0f);
            view.SetOverlayConfiguration(true, false);
            FrameHeroCamera(Vector3.zero, 29f);
            SaveCameraCapture(FindSceneCamera(), Path.Combine(root, "captures", "domain-boundaries.png"), 1920, 1080);
            view.SetOverlayConfiguration(false, true);
            SaveCameraCapture(FindSceneCamera(), Path.Combine(root, "captures", "contact-graph.png"), 1920, 1080);

            string pristineHash = representative.FormationHash;
            string graphPath = Path.Combine(root, "contact", "representative-graph.json");
            string descriptorPath = Path.Combine(root, "persistence", "pristine-descriptor.json");
            string summaryPath = Path.Combine(root, "metrics", "representative-formation.json");
            string descriptorJson = view.PristineDescriptorJson();
            string[] pristineChildIds = ChildIds(representative.Children);
            string[] pristineContentHashes = ChildContentHashes(representative.Children);
            string[] pristineMeshHashes = ChildMeshHashes(representative.Children);
            string[] pristineSourceGeometryHashes = ChildSourceGeometryHashes(representative.Children);
            string initialContactGraphHash = representative.ContactGraph.graphHash;
            SiblingEditReceipt[] siblingSnapshots = representative.Children
                .Where(child => !string.Equals(child.Domain.Id, representative.Children[0].Domain.Id, StringComparison.Ordinal))
                .Select(child => new SiblingEditReceipt
                {
                    domainId = child.Domain.Id,
                    beforeContentHash = HexHash(child.Domain.ComputeContentHash()),
                    afterContentHash = HexHash(child.Domain.ComputeContentHash()),
                    beforeMeshHash = HexHash(child.MeshBuild.Mesh.DeterministicHash),
                    afterMeshHash = HexHash(child.MeshBuild.Mesh.DeterministicHash),
                    unchanged = true
                }).ToArray();
            File.WriteAllText(descriptorPath, descriptorJson);
            File.WriteAllText(graphPath, view.ContactGraphJson());
            File.WriteAllText(summaryPath, view.InspectFormationJson());

            U4EFormationChildBuild target = representative.Children[0];
            MatterSampleAddress solid = FindSolidSample(target.Domain);
            MatterFloat3 editCenter = target.Domain.LocalSampleToMeters(solid);
            long worldRevision = representative.TerrainWorld.Revision;
            int worldEdits = representative.TerrainWorld.EditCount;
            SaveCameraCapture(FindSceneCamera(), Path.Combine(root, "captures", "edit-before.png"), 1920, 1080);
            U4EFormationEditResult edit = view.EditChildLocal(target.Domain.Id, editCenter,
                target.Domain.SampleSpacingMeters * 1.75f);
            SaveCameraCapture(FindSceneCamera(), Path.Combine(root, "captures", "edit-after.png"), 1920, 1080);
            for (int i = 0; i < siblingSnapshots.Length; i++)
            {
                U4EFormationChildBuild sibling = representative.Children.First(child =>
                    string.Equals(child.Domain.Id, siblingSnapshots[i].domainId, StringComparison.Ordinal));
                siblingSnapshots[i].afterContentHash = HexHash(sibling.Domain.ComputeContentHash());
                siblingSnapshots[i].afterMeshHash = HexHash(sibling.MeshBuild.Mesh.DeterministicHash);
                siblingSnapshots[i].unchanged = siblingSnapshots[i].beforeContentHash == siblingSnapshots[i].afterContentHash &&
                    siblingSnapshots[i].beforeMeshHash == siblingSnapshots[i].afterMeshHash;
            }
            long worldRevisionAfterEdit = representative.TerrainWorld.Revision;
            int worldEditsAfterEdit = representative.TerrainWorld.EditCount;
            string editedGraphPath = Path.Combine(root, "contact", "edited-graph.json");
            File.WriteAllText(editedGraphPath, view.ContactGraphJson());
            bool terrainUnchanged = representative.TerrainWorld.Revision == worldRevision &&
                                    representative.TerrainWorld.EditCount == worldEdits;
            WriteJson(Path.Combine(root, "metrics", "edit.json"), new EditEvidenceReceipt
            {
                changed = edit.Changed,
                editedDomainId = edit.DomainId,
                changedSampleCount = edit.ChangedSampleCount,
                samplesExamined = edit.SamplesExamined,
                directRegions = edit.DirectlyChangedRegionCount,
                rebuiltRegions = edit.RebuiltRegionCount,
                reusedRegions = edit.ReusedRegionCount,
                beforeContentHash = edit.BeforeContentHash,
                afterContentHash = edit.AfterContentHash,
                beforeMeshHash = edit.BeforeMeshHash,
                afterMeshHash = edit.AfterMeshHash,
                invalidatedContactPairs = edit.InvalidatedPairKeys,
                contactGraphConnectedToTerrain = edit.ContactGraphConnectedToTerrain,
                terrainRevisionBefore = worldRevision,
                terrainRevisionAfter = worldRevisionAfterEdit,
                terrainEditCountBefore = worldEdits,
                terrainEditCountAfter = worldEditsAfterEdit,
                terrainUnchanged = terrainUnchanged,
                siblings = siblingSnapshots,
                siblingsUnchanged = siblingSnapshots.All(sibling => sibling.unchanged)
            });
            U4EFormationBuildResult regenerated = view.RegeneratePristine();
            view.SetOverlayConfiguration(false, false);
            FrameHeroCamera(Vector3.zero, 29f);
            SaveCameraCapture(FindSceneCamera(), Path.Combine(root, "captures", "regenerated.png"), 1920, 1080);
            WriteJson(Path.Combine(root, "persistence", "regenerated-summary.json"), view.CreateSummary());
            long descriptorBytes = Encoding.UTF8.GetByteCount(descriptorJson);
            string[] regeneratedChildIds = ChildIds(regenerated.Children);
            string[] regeneratedContentHashes = ChildContentHashes(regenerated.Children);
            string[] regeneratedMeshHashes = ChildMeshHashes(regenerated.Children);
            string[] regeneratedSourceGeometryHashes = ChildSourceGeometryHashes(regenerated.Children);
            var evidence = new EvidenceSequenceReceipt
            {
                representativeSeed = representative.Seed.ToString(CultureInfo.InvariantCulture),
                descriptorPath = RelativeToRepository(descriptorPath),
                descriptorUtf8Bytes = descriptorBytes,
                rawChildMatterBytes = representative.TotalDomainPayloadBytes,
                descriptorBelowTenPercentOfMatter = descriptorBytes < representative.TotalDomainPayloadBytes * .1d,
                initialFormationHash = pristineHash,
                regeneratedFormationHash = regenerated.FormationHash,
                regeneratedHashMatches = string.Equals(pristineHash, regenerated.FormationHash, StringComparison.Ordinal),
                initialSourceGeometryHash = representative.SourceGeometryHash,
                regeneratedSourceGeometryHash = regenerated.SourceGeometryHash,
                sourceGeometryHashMatches = string.Equals(representative.SourceGeometryHash,
                    regenerated.SourceGeometryHash, StringComparison.Ordinal),
                initialContactGraphHash = initialContactGraphHash,
                regeneratedContactGraphHash = regenerated.ContactGraph.graphHash,
                contactGraphHashMatches = string.Equals(initialContactGraphHash,
                    regenerated.ContactGraph.graphHash, StringComparison.Ordinal),
                pristineChildIds = pristineChildIds,
                regeneratedChildIds = regeneratedChildIds,
                pristineChildContentHashes = pristineContentHashes,
                regeneratedChildContentHashes = regeneratedContentHashes,
                pristineChildMeshHashes = pristineMeshHashes,
                regeneratedChildMeshHashes = regeneratedMeshHashes,
                pristineChildSourceGeometryHashes = pristineSourceGeometryHashes,
                regeneratedChildSourceGeometryHashes = regeneratedSourceGeometryHashes,
                childIdsMatch = SameStrings(pristineChildIds, regeneratedChildIds),
                childContentHashesMatch = SameStrings(pristineContentHashes, regeneratedContentHashes),
                childMeshHashesMatch = SameStrings(pristineMeshHashes, regeneratedMeshHashes),
                childSourceGeometryHashesMatch = SameStrings(pristineSourceGeometryHashes, regeneratedSourceGeometryHashes),
                editDomainId = target.Domain.Id,
                editChangedSampleCount = edit.ChangedSampleCount,
                editDirectRegions = edit.DirectlyChangedRegionCount,
                editRebuiltRegions = edit.RebuiltRegionCount,
                editReusedRegions = edit.ReusedRegionCount,
                editBeforeContentHash = edit.BeforeContentHash,
                editAfterContentHash = edit.AfterContentHash,
                editBeforeMeshHash = edit.BeforeMeshHash,
                editAfterMeshHash = edit.AfterMeshHash,
                invalidatedContactPairs = edit.InvalidatedPairKeys,
                worldRevisionUnchanged = terrainUnchanged,
                contactGraphPath = RelativeToRepository(graphPath),
                editedContactGraphPath = RelativeToRepository(editedGraphPath)
            };
            WriteJson(Path.Combine(root, "metrics", "persistence.json"), evidence);
            WriteJson(Path.Combine(root, "receipt.json"), new FinalReceipt
            {
                result = galleryReceipt.allSeedsAccepted ? "U4E_MULTI_DOMAIN_FORMATION_CANDIDATE" : "U4E_MULTI_DOMAIN_FORMATION_HOLD",
                acceptedSeeds = galleryReceipt.acceptedSeedCount,
                rejectedSeeds = galleryReceipt.rejectedSeedCount,
                heroSeeds = heroSeeds,
                alternateAngleSeeds = galleryReceipt.alternateAngleSeeds,
                weakestSeed = galleryReceipt.weakestAcceptedSeed,
                descriptorBelowTenPercent = evidence.descriptorBelowTenPercentOfMatter,
                regenerationMatches = evidence.regeneratedHashMatches,
                editInvalidatedPairCount = evidence.invalidatedContactPairs.Length,
                unityVersion = Application.unityVersion
            });
            return JsonUtility.ToJson(evidence, true);
        }

        [CliCommand("u4e_export_receipt", "Write the active U4E scene's formation, graph, and compact descriptor receipts.",
            MainThreadRequired = true, Tags = new[] { "u4e", "matter", "evidence" })]
        public static string ExportReceipt()
        {
            U4EMultiDomainFormationView view = GetView();
            string root = EvidencePath();
            EnsureEvidenceFolders(root);
            string summary = view.InspectFormationJson();
            string graph = view.ContactGraphJson();
            string descriptor = view.PristineDescriptorJson();
            File.WriteAllText(Path.Combine(root, "metrics", "representative-formation.json"), summary);
            File.WriteAllText(Path.Combine(root, "contact", "representative-graph.json"), graph);
            File.WriteAllText(Path.Combine(root, "persistence", "pristine-descriptor.json"), descriptor);
            return summary;
        }

        [CliCommand("u4e1_run_directional_bakeoff", "Reproduce the six frozen U4E controls, compare directional 0 mm / -5 mm contact fitting, and capture matched evidence.",
            MainThreadRequired = true, Tags = new[] { "u4e1", "u4e", "matter", "evidence" })]
        public static string RunDirectionalContactBakeoff()
        {
            string root = EvidencePathForU4E1();
            EnsureU4E1EvidenceFolders(root);
            string baselinePath = Path.Combine(EvidencePath(), "metrics", "gallery.json");
            var receipt = new U4E1BakeoffReceipt
            {
                unityVersion = Application.unityVersion,
                baselineEvidencePath = RelativeToRepository(baselinePath),
                minimumNormalAlignmentDot = U4EContactProbe.DirectionalNormalAlignmentMinDot,
                directionalContactBandHalfWidthMeters = U4EContactProbe.DirectionalContactBandHalfWidthMeters
            };
            var ledger = new List<U4E1ContactLedgerRow>();
            var captures = new List<U4E1CaptureParity>();
            if (!File.Exists(baselinePath))
            {
                receipt.result = "U4E1_BASELINE_MISSING_HOLD";
                receipt.baselineHoldDisposition = "Committed U4E gallery receipt was not found; directional variants were not evaluated.";
                WriteJson(Path.Combine(root, "receipt.json"), receipt);
                return JsonUtility.ToJson(receipt, true);
            }

            GalleryReceipt baseline = JsonUtility.FromJson<GalleryReceipt>(File.ReadAllText(baselinePath));
            if (baseline == null || baseline.formations == null)
            {
                receipt.result = "U4E1_BASELINE_UNREADABLE_HOLD";
                receipt.baselineHoldDisposition = "Committed U4E gallery receipt could not be decoded; directional variants were not evaluated.";
                WriteJson(Path.Combine(root, "receipt.json"), receipt);
                return JsonUtility.ToJson(receipt, true);
            }

            Scene scene = GetScene();
            U4EMultiDomainFormationView view = FindView(scene);
            Camera camera = FindSceneCamera();
            bool sceneWasDirty = scene.isDirty;
            Vector3 originalCameraPosition = camera.transform.position;
            Quaternion originalCameraRotation = camera.transform.rotation;
            bool originalOrthographic = camera.orthographic;
            float originalOrthographicSize = camera.orthographicSize;
            float originalFieldOfView = camera.fieldOfView;
            float originalNearClip = camera.nearClipPlane;
            float originalFarClip = camera.farClipPlane;
            float originalAspect = camera.aspect;
            var baselineBuilds = new Dictionary<int, U4EFormationBuildResult>();
            var seedRows = new List<U4E1SeedComparison>(U4E1FrozenSeeds.Length);

            try
            {
                // Verify every control against the committed U4E evidence before evaluating B or C.
                for (int index = 0; index < U4E1FrozenSeeds.Length; index++)
                {
                    int seed = U4E1FrozenSeeds[index];
                    GalleryRow baselineRow = baseline.formations.FirstOrDefault(row => row.seed == seed);
                    var seedRow = new U4E1SeedComparison { seed = seed };
                    seedRows.Add(seedRow);
                    if (baselineRow == null || baselineRow.receipt == null)
                    {
                        seedRow.baselineMetricsMatch = false;
                        seedRow.baselineMismatch = "Frozen seed is absent from committed U4E gallery evidence.";
                        break;
                    }
                    seedRow.attemptIndex = baselineRow.attemptIndex;
                    U4EFormationBuildResult rebuilt = U4ERockFormationBuilder.BuildExperiment(seed,
                        baselineRow.attemptIndex, U4EContactFitMode.GlobalMin25mm, MatterDomainPose.Identity);
                    seedRow.baselineGraphHashMatch = rebuilt.ContactGraph != null &&
                        string.Equals(rebuilt.ContactGraph.graphHash, baselineRow.graphHash, StringComparison.Ordinal);
                    seedRow.baselineFormationHashMatch = string.Equals(rebuilt.FormationHash,
                        baselineRow.formationHash, StringComparison.Ordinal);
                    seedRow.regeneratedGraphHash = rebuilt.ContactGraph == null ? string.Empty : rebuilt.ContactGraph.graphHash;
                    seedRow.regeneratedFormationHash = rebuilt.FormationHash ?? string.Empty;
                    string mismatch = BaselineMismatch(rebuilt, baselineRow);
                    seedRow.baselineMetricsMatch = string.IsNullOrEmpty(mismatch);
                    seedRow.baselineMismatch = mismatch;
                    if (!seedRow.baselineMetricsMatch) break;
                    baselineBuilds.Add(seed, rebuilt);
                    receipt.focusedBaselineAttemptCount++;
                }

                receipt.allBaselineSeedsReproduced = seedRows.Count == U4E1FrozenSeeds.Length &&
                    seedRows.All(row => row.baselineMetricsMatch);
                receipt.allBaselineGraphHashesMatch = seedRows.Count == U4E1FrozenSeeds.Length &&
                    seedRows.All(row => row.baselineGraphHashMatch);
                receipt.allBaselineFormationHashesMatch = seedRows.Count == U4E1FrozenSeeds.Length &&
                    seedRows.All(row => row.baselineFormationHashMatch);
                if (!receipt.allBaselineSeedsReproduced)
                {
                    receipt.result = "U4E1_BASELINE_MISMATCH_HOLD";
                    receipt.baselineHoldDisposition = seedRows.LastOrDefault(row => !row.baselineMetricsMatch)?.baselineMismatch ??
                        "Not all frozen controls were rebuilt.";
                    receipt.seeds = seedRows.ToArray();
                    WriteJson(Path.Combine(root, "receipt.json"), receipt);
                    foreach (U4E1SeedComparison row in seedRows)
                        WriteJson(Path.Combine(root, "metrics", "seed-" + row.seed.ToString(CultureInfo.InvariantCulture) + ".json"), row);
                    return JsonUtility.ToJson(receipt, true);
                }

                U4EContactFitMode[] modes =
                {
                    U4EContactFitMode.GlobalMin25mm,
                    U4EContactFitMode.DirectionalPatch0mm,
                    U4EContactFitMode.DirectionalPatchMinus5mm
                };
                bool allSourceMatterInvariant = true;
                bool allCandidateMethodsZeroOverlap = true;
                bool allCandidateMethodsConnected = true;
                int acceptedB = 0, acceptedC = 0;

                for (int seedIndex = 0; seedIndex < U4E1FrozenSeeds.Length; seedIndex++)
                {
                    int seed = U4E1FrozenSeeds[seedIndex];
                    U4E1SeedComparison seedRow = seedRows[seedIndex];
                    int attempt = seedRow.attemptIndex;
                    U4EFormationBuildResult baselineA = baselineBuilds[seed];
                    var builds = new Dictionary<U4EContactFitMode, U4EFormationBuildResult>
                    {
                        [U4EContactFitMode.GlobalMin25mm] = baselineA
                    };
                    foreach (U4EContactFitMode mode in modes)
                    {
                        U4EFormationBuildResult result = mode == U4EContactFitMode.GlobalMin25mm
                            ? baselineA
                            : U4ERockFormationBuilder.BuildExperiment(seed, attempt, mode, MatterDomainPose.Identity);
                        builds[mode] = result;
                    }

                    var reports = new List<U4E1MethodComparison>(modes.Length);
                    for (int modeIndex = 0; modeIndex < modes.Length; modeIndex++)
                    {
                        U4EContactFitMode mode = modes[modeIndex];
                        U4EFormationBuildResult result = builds[mode];
                        U4E1MethodComparison report = CreateMethodComparison(result);
                        report.method = MethodName(mode);
                        report.sourceMatterInvariantToA = mode == U4EContactFitMode.GlobalMin25mm ||
                            SourceMatterMatches(baselineA, result);
                        report.partialSourceMatterInvariantToA = mode == U4EContactFitMode.GlobalMin25mm ||
                            BuiltChildrenMatterMatches(baselineA, result);
                        if (mode != U4EContactFitMode.GlobalMin25mm && !report.sourceMatterInvariantToA)
                            allSourceMatterInvariant = false;
                        if (mode != U4EContactFitMode.GlobalMin25mm)
                        {
                            allCandidateMethodsZeroOverlap &= report.zeroOverlapAllPairs;
                            allCandidateMethodsConnected &= report.graphConnectedToTerrain;
                            if (mode == U4EContactFitMode.DirectionalPatch0mm && result.Accepted) acceptedB++;
                            if (mode == U4EContactFitMode.DirectionalPatchMinus5mm && result.Accepted) acceptedC++;
                        }

                        if (result.Accepted)
                        {
                            view.BuildPresentation(result);
                            view.SetOverlayConfiguration(false, false);
                            view.SetDirectionalDebugOverlays(false);
                            float primaryYaw = PrimaryEvidenceYaw(seed);
                            FrameHeroCamera(Vector3.zero, primaryYaw);
                            string primaryPath = Path.Combine(root, "captures", "raw", "primary",
                                "seed-" + seed.ToString(CultureInfo.InvariantCulture) + "-" + MethodName(mode) + ".png");
                            SaveCameraCapture(camera, primaryPath, 640, 360);
                            report.primaryCapturePath = RelativeToRepository(primaryPath);

                            if (mode == U4EContactFitMode.GlobalMin25mm)
                                CaptureBaselineParity(seed, "primary", primaryYaw, ExistingBaselineCapture(seed, "primary"),
                                    view, camera, captures);

                            float alternateYaw = AlternateEvidenceYaw(seed);
                            FrameHeroCamera(Vector3.zero, alternateYaw);
                            string alternatePath = Path.Combine(root, "captures", "raw", "alternate",
                                "seed-" + seed.ToString(CultureInfo.InvariantCulture) + "-" + MethodName(mode) + ".png");
                            SaveCameraCapture(camera, alternatePath, 640, 360);
                            report.alternateCapturePath = RelativeToRepository(alternatePath);

                            if (mode == U4EContactFitMode.GlobalMin25mm)
                                CaptureBaselineParity(seed, "alternate", alternateYaw, ExistingBaselineCapture(seed, "alternate"),
                                    view, camera, captures);

                            if (IsDebugSeed(seed))
                            {
                                view.SetDirectionalDebugOverlays(true);
                                FrameHeroCamera(Vector3.zero, primaryYaw);
                                string debugPath = Path.Combine(root, "captures",
                                    "contact-debug-" + MethodName(mode) + "-" + seed.ToString(CultureInfo.InvariantCulture) + ".png");
                                SaveCameraCapture(camera, debugPath, 1920, 1080);
                                view.SetDirectionalDebugOverlays(false);
                            }
                        }
                        else
                        {
                            view.ClearPreview();
                        }
                        reports.Add(report);
                        foreach (U4E1IntendedContact contact in report.intendedContacts)
                            ledger.Add(new U4E1ContactLedgerRow
                            {
                                seed = seed,
                                attemptIndex = attempt,
                                method = report.method,
                                contact = contact
                            });
                    }
                    seedRow.methods = reports.ToArray();
                    WriteJson(Path.Combine(root, "metrics", "seed-" + seed.ToString(CultureInfo.InvariantCulture) + ".json"), seedRow);
                }

                receipt.seeds = seedRows.ToArray();
                receipt.baselineCaptureComparisons = captures.ToArray();
                receipt.baselineCaptureComparisonCount = captures.Count;
                receipt.baselineCapturePixelMatchCount = captures.Count(capture => capture.pixelMatch);
                receipt.baselineCapturePixelsMatchWhereReferenceExists = captures.Count > 0 &&
                    receipt.baselineCapturePixelMatchCount == captures.Count;
                receipt.sourceAndMatterInvariantAcrossMethods = allSourceMatterInvariant;
                receipt.allCandidateMethodsPreserveZeroSampledOverlap = allCandidateMethodsZeroOverlap;
                receipt.allCandidateMethodsRemainConnectedToTerrain = allCandidateMethodsConnected;
                receipt.bAcceptedSeedCount = acceptedB;
                receipt.cAcceptedSeedCount = acceptedC;
                receipt.disposition = "AWAITING_INDEPENDENT_VISUAL_REVIEW";
                receipt.focusedBaselineAttemptCount = U4E1FrozenSeeds.Length;
                WriteJson(Path.Combine(root, "receipt.json"), receipt);
                WriteJson(Path.Combine(root, "metrics", "contacts.json"), new U4E1ContactLedger
                {
                    minimumNormalAlignmentDot = U4EContactProbe.DirectionalNormalAlignmentMinDot,
                    contactBandHalfWidthMeters = U4EContactProbe.DirectionalContactBandHalfWidthMeters,
                    contacts = ledger.ToArray()
                });
                return JsonUtility.ToJson(receipt, true);
            }
            finally
            {
                view.ClearPreview();
                camera.transform.SetPositionAndRotation(originalCameraPosition, originalCameraRotation);
                camera.orthographic = originalOrthographic;
                camera.orthographicSize = originalOrthographicSize;
                camera.fieldOfView = originalFieldOfView;
                camera.nearClipPlane = originalNearClip;
                camera.farClipPlane = originalFarClip;
                camera.aspect = originalAspect;
                if (!sceneWasDirty && scene.isDirty)
                    EditorSceneManager.SaveScene(scene, ScenePath);
            }
        }

        [CliCommand("u4e1_build_windows_development", "Build and run one accepted U4E.1 directional-fit seed in the Windows x64 Development Player.",
            MainThreadRequired = true, Tags = new[] { "u4e1", "u4e", "matter", "build" })]
        public static string BuildU4E1WindowsDevelopmentPlayer(
            [CliArg("seed", "Representative frozen U4E seed.")] int seed = 7000,
            [CliArg("method", "DIRECTIONAL_PATCH_0MM or DIRECTIONAL_PATCH_MINUS_5MM.")] string method = "DIRECTIONAL_PATCH_0MM")
        {
            U4EContactFitMode mode = ParseMethodName(method);
            if (mode == U4EContactFitMode.GlobalMin25mm)
                throw new ArgumentException("U4E.1 Player proof requires experimental method B or C.", nameof(method));
            string root = EvidencePathForU4E1();
            string seedPath = Path.Combine(root, "metrics", "seed-" + seed.ToString(CultureInfo.InvariantCulture) + ".json");
            if (!File.Exists(seedPath)) throw new FileNotFoundException("Run the U4E.1 bakeoff before building its Player proof.", seedPath);
            U4E1SeedComparison seedReceipt = JsonUtility.FromJson<U4E1SeedComparison>(File.ReadAllText(seedPath));
            U4E1MethodComparison candidate = seedReceipt == null || seedReceipt.methods == null
                ? null : seedReceipt.methods.FirstOrDefault(row => string.Equals(row.method, MethodName(mode), StringComparison.Ordinal));
            if (candidate == null || !candidate.accepted)
                throw new InvalidOperationException("The requested U4E.1 method did not produce an accepted seed " + seed + ".");

            string scene = ScenePath;
            string buildFolder = Path.Combine(Path.GetTempPath(), "Wildkin-U4E1-DirectionalContact");
            Directory.CreateDirectory(buildFolder);
            string output = Path.Combine(buildFolder, "Wildkin-U4E1.exe");
            var watch = Stopwatch.StartNew();
            BuildReport build = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { scene },
                locationPathName = output,
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.Development | BuildOptions.AllowDebugging
            });
            watch.Stop();
            if (build.summary.result != BuildResult.Succeeded)
                throw new InvalidOperationException("U4E.1 Windows Player build ended with " + build.summary.result +
                    "; errors=" + build.summary.totalErrors + ", warnings=" + build.summary.totalWarnings + ".");

            string playerDirectory = Path.Combine(root, "player");
            Directory.CreateDirectory(playerDirectory);
            string arguments = "--u4e-evidence-root=\"" + root + "\" --u4e-fit-mode=" + mode +
                " --u4e-attempt=" + seedReceipt.attemptIndex.ToString(CultureInfo.InvariantCulture) +
                " --u4e-seed=" + seed.ToString(CultureInfo.InvariantCulture);
            var startInfo = new ProcessStartInfo
            {
                FileName = output,
                Arguments = arguments,
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
                WorkingDirectory = buildFolder
            };
            int exitCode;
            using (Process process = Process.Start(startInfo))
            {
                if (process == null) throw new InvalidOperationException("Could not start the U4E.1 Windows Player.");
                if (!process.WaitForExit(300000))
                {
                    process.Kill();
                    throw new TimeoutException("U4E.1 Windows Player evidence run exceeded five minutes.");
                }
                exitCode = process.ExitCode;
            }
            string capturePath = Path.Combine(playerDirectory, "capture.png");
            string playerReceiptPath = Path.Combine(playerDirectory, "receipt.json");
            var receipt = new U4E1PlayerBuildReceipt
            {
                method = MethodName(mode),
                seed = seed,
                attemptIndex = seedReceipt.attemptIndex,
                unityVersion = Application.unityVersion,
                result = build.summary.result.ToString(),
                outputPath = output,
                scenePath = scene,
                processExitCode = exitCode,
                outputBytes = build.summary.totalSize,
                errors = (int)build.summary.totalErrors,
                warnings = (int)build.summary.totalWarnings,
                buildSeconds = watch.Elapsed.TotalSeconds,
                capturePath = RelativeToRepository(capturePath),
                playerReceiptPresent = File.Exists(playerReceiptPath),
                playerCapturePresent = File.Exists(capturePath) && new FileInfo(capturePath).Length > 4096
            };
            WriteJson(Path.Combine(playerDirectory, "build-provenance.json"), receipt);
            if (exitCode != 0) throw new InvalidOperationException("U4E.1 standalone Player exited with code " + exitCode + ".");
            if (!receipt.playerReceiptPresent || !receipt.playerCapturePresent)
                throw new InvalidOperationException("U4E.1 Player exited successfully but did not write both its receipt and screenshot.");
            WriteJson(Path.Combine(playerDirectory, "build-provenance.json"), receipt);
            return JsonUtility.ToJson(receipt, true);
        }

        [CliCommand("u4e_build_windows_development", "Build and run the isolated U4E Windows x64 Development Player, capturing its scene and machine receipt.",
            MainThreadRequired = true, Tags = new[] { "u4e", "matter", "build" })]
        public static string BuildWindowsDevelopmentPlayer(
            [CliArg("seed", "Representative accepted formation seed.")] int seed = U4EFormationConfiguration.GallerySeedStart)
        {
            Scene scene = GetScene();
            U4EMultiDomainFormationView view = FindView(scene);
            Material material = AssetDatabase.LoadAssetAtPath<Material>(MaterialPath);
            if (material == null) throw new FileNotFoundException("The accepted U4B stylized rock/dirt material is missing.", MaterialPath);
            view.Configure(material, seed, true);
            view.PrepareForBuild(seed);
            FrameHeroCamera(Vector3.zero, 29f);
            EditorUtility.SetDirty(view);
            EditorSceneManager.MarkSceneDirty(scene);
            if (!EditorSceneManager.SaveScene(scene, ScenePath)) throw new IOException("Could not save the clean U4E Player configuration.");

            string root = EvidencePath();
            string playerEvidence = Path.Combine(root, "player");
            Directory.CreateDirectory(playerEvidence);
            string buildFolder = Path.Combine(Path.GetTempPath(), "Wildkin-U4E-MultiDomainFormation");
            Directory.CreateDirectory(buildFolder);
            string output = Path.Combine(buildFolder, "Wildkin-U4E.exe");
            var watch = Stopwatch.StartNew();
            BuildReport build = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = output,
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.Development | BuildOptions.AllowDebugging
            });
            watch.Stop();
            if (build.summary.result != BuildResult.Succeeded)
                throw new InvalidOperationException("U4E Windows Player build ended with " + build.summary.result +
                    "; errors=" + build.summary.totalErrors + ", warnings=" + build.summary.totalWarnings + ".");

            var startInfo = new ProcessStartInfo
            {
                FileName = output,
                Arguments = "--u4e-evidence-root=\"" + root + "\"",
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
                WorkingDirectory = buildFolder
            };
            int exitCode;
            using (Process process = Process.Start(startInfo))
            {
                if (process == null) throw new InvalidOperationException("Could not start the U4E Windows Player.");
                if (!process.WaitForExit(300000))
                {
                    process.Kill();
                    throw new TimeoutException("U4E Windows Player evidence run exceeded five minutes.");
                }
                exitCode = process.ExitCode;
            }
            if (exitCode != 0) throw new InvalidOperationException("U4E standalone Player exited with code " + exitCode + ".");
            string capturePath = Path.Combine(playerEvidence, "capture.png");
            string playerReceiptPath = Path.Combine(playerEvidence, "receipt.json");
            var receipt = new PlayerBuildReceipt
            {
                unityVersion = Application.unityVersion,
                result = build.summary.result.ToString(),
                outputPath = output,
                scenePath = ScenePath,
                processExitCode = exitCode,
                outputBytes = build.summary.totalSize,
                errors = (int)build.summary.totalErrors,
                warnings = (int)build.summary.totalWarnings,
                buildSeconds = watch.Elapsed.TotalSeconds,
                capturePath = RelativeToRepository(capturePath),
                playerReceiptPresent = File.Exists(playerReceiptPath),
                playerCapturePresent = File.Exists(capturePath) && new FileInfo(capturePath).Length > 4096
            };
            WriteJson(Path.Combine(playerEvidence, "build-provenance.json"), receipt);
            if (!receipt.playerReceiptPresent || !receipt.playerCapturePresent)
                throw new InvalidOperationException("Player exited successfully but did not write both its receipt and screenshot.");
            return JsonUtility.ToJson(receipt, true);
        }

        private static GalleryRun[] BuildGallery(U4EMultiDomainFormationView primaryView)
        {
            Scene scene = primaryView.gameObject.scene;
            List<U4EMultiDomainFormationView> oldViews = FindViews(scene);
            for (int i = oldViews.Count - 1; i >= 0; i--)
            {
                U4EMultiDomainFormationView view = oldViews[i];
                view.ClearPreview();
                if (view == primaryView) continue;
                UnityEngine.Object.DestroyImmediate(view.gameObject);
            }
            ClearLabels(scene);
            Material material = AssetDatabase.LoadAssetAtPath<Material>(MaterialPath);
            var runs = new GalleryRun[U4EFormationConfiguration.GallerySeedCount];
            Camera camera = FindSceneCamera();
            int rows = (runs.Length + GalleryColumns - 1) / GalleryColumns;
            for (int index = 0; index < runs.Length; index++)
            {
                int seed = U4EFormationConfiguration.GallerySeedStart + index;
                int column = index % GalleryColumns;
                int row = index / GalleryColumns;
                var position = new Vector3((column - (GalleryColumns - 1) * .5f) * GalleryTileSpacing,
                    0f, ((rows - 1) * .5f - row) * GalleryTileSpacing);
                U4EMultiDomainFormationView view;
                if (index == 0)
                {
                    view = primaryView;
                }
                else
                {
                    var host = new GameObject("U4E Gallery Seed " + seed.ToString(CultureInfo.InvariantCulture));
                    SceneManager.MoveGameObjectToScene(host, scene);
                    view = host.AddComponent<U4EMultiDomainFormationView>();
                }
                view.Configure(material, seed, false);
                float yaw = StableYaw(seed);
                Quaternion rotation = Quaternion.Euler(0f, yaw, 0f);
                U4EFormationBuildResult formation = U4ERockFormationBuilder.Build(seed,
                    new MatterDomainPose(new MatterFloat3(position.x, position.y, position.z),
                        rotation.x, rotation.y, rotation.z, rotation.w));
                if (formation.Accepted) view.BuildPresentation(formation);
                else view.ClearPreview();
                runs[index] = new GalleryRun { Formation = formation, View = view, Seed = seed };
            }

            camera.orthographic = true;
            camera.orthographicSize = 31.5f;
            camera.nearClipPlane = .1f;
            camera.farClipPlane = 250f;
            Vector3 target = new Vector3(0f, .8f, 0f);
            Vector3 cameraPosition = target + new Vector3(0f, 48f, -18f);
            camera.transform.SetPositionAndRotation(cameraPosition, Quaternion.LookRotation(target - cameraPosition, Vector3.up));
            for (int i = 0; i < runs.Length; i++) CreateLabel(scene, camera, runs[i]);
            return runs;
        }

        private static GalleryReceipt CreateGalleryReceipt(GalleryRun[] runs)
        {
            var rows = new GalleryRow[runs.Length];
            var archetypes = new HashSet<string>(StringComparer.Ordinal);
            int accepted = 0;
            for (int i = 0; i < runs.Length; i++)
            {
                U4EFormationBuildResult formation = runs[i].Formation;
                var row = new GalleryRow
                {
                    seed = runs[i].Seed,
                    attemptIndex = formation.AttemptIndex,
                    archetype = formation.Archetype.ToString(),
                    accepted = formation.Accepted,
                    rejectionReason = formation.RejectionReason,
                    candidateAttemptDiagnostics = formation.CandidateAttemptDiagnostics,
                    formationHash = formation.FormationHash,
                    sourceGeometryHash = formation.SourceGeometryHash,
                    graphHash = formation.ContactGraph == null ? string.Empty : formation.ContactGraph.graphHash,
                    childCount = formation.Children.Count,
                    possiblePairs = formation.ContactGraph == null ? 0 : formation.ContactGraph.possiblePairCount,
                    acceptedContactEdges = formation.ContactGraph == null ? 0 : formation.ContactGraph.acceptedEdgeCount,
                    graphConnectedToTerrain = formation.ContactGraph != null && formation.ContactGraph.allChildrenConnectedToTerrain,
                    sourceAndBakeMilliseconds = formation.SourceAndBakeMilliseconds,
                    terrainMeshingMilliseconds = formation.TerrainMeshingMilliseconds,
                    domainMeshingMilliseconds = formation.MeshingMilliseconds,
                    contactMeasurementMilliseconds = formation.ContactMilliseconds,
                    rawDomainBytes = formation.TotalDomainPayloadBytes,
                    receipt = formation.Accepted ? runs[i].View.CreateSummary() : null
                };
                if (formation.Accepted)
                {
                    accepted++;
                    archetypes.Add(row.archetype);
                    int ordinary = 0, hero = 0, zeroOverlap = 0, zeroSiblingOverlap = 0, zeroTerrainOverlap = 0;
                    int crossTierContacts = 0;
                    float minGap = float.PositiveInfinity, maxGap = float.NegativeInfinity, maxAdjustment = 0f;
                    MatterFloat3 min, max;
                    GetFormationBounds(formation, out min, out max);
                    row.formationWidthMeters = max.X - min.X;
                    row.formationHeightMeters = max.Y - min.Y;
                    row.formationDepthMeters = max.Z - min.Z;
                    foreach (U4EFormationChildBuild child in formation.Children)
                    {
                        if (child.Domain.SampleSpacingMeters == U4EFormationConfiguration.HeroSpacingMeters) hero++;
                        else ordinary++;
                        maxAdjustment = Math.Max(maxAdjustment, Math.Abs(child.Fit.adjustmentMeters));
                    }
                    foreach (U4EContactMeasurement edge in formation.ContactGraph.measurements)
                    {
                        bool isTerrainEdge = string.Equals(edge.nodeA, U4EFormationConfiguration.TerrainNodeId, StringComparison.Ordinal) ||
                                             string.Equals(edge.nodeB, U4EFormationConfiguration.TerrainNodeId, StringComparison.Ordinal);
                        if (edge.HasZeroSampledOverlap)
                        {
                            zeroOverlap++;
                            if (isTerrainEdge) zeroTerrainOverlap++;
                            else zeroSiblingOverlap++;
                        }
                        if (edge.acceptedContact)
                        {
                            minGap = Math.Min(minGap, edge.minimumSurfaceGapMeters);
                            maxGap = Math.Max(maxGap, edge.minimumSurfaceGapMeters);
                            if (!isTerrainEdge && !Mathf.Approximately(edge.spacingAMeters, edge.spacingBMeters))
                                crossTierContacts++;
                        }
                    }
                    row.tier0125Count = hero;
                    row.tier025Count = ordinary;
                    row.zeroOverlapPairs = zeroOverlap;
                    row.zeroSiblingOverlapPairs = zeroSiblingOverlap;
                    row.zeroTerrainOverlapPairs = zeroTerrainOverlap;
                    row.crossTierContactEdges = crossTierContacts;
                    row.minimumContactGapMeters = Finite(minGap) ? minGap : float.NaN;
                    row.maximumContactGapMeters = Finite(maxGap) ? maxGap : float.NaN;
                    row.maximumFitAdjustmentMeters = maxAdjustment;
                    string descriptor = JsonUtility.ToJson(formation.PristineDescriptor);
                    int descriptorBytes = Encoding.UTF8.GetByteCount(descriptor);
                    row.descriptorBytes = descriptorBytes;
                    row.descriptorPercentOfRawMatter = formation.TotalDomainPayloadBytes == 0 ? 0d :
                        descriptorBytes * 100d / formation.TotalDomainPayloadBytes;
                }
                rows[i] = row;
            }
            var receipt = new GalleryReceipt
            {
                requestedSeedCount = runs.Length,
                acceptedSeedCount = accepted,
                rejectedSeedCount = runs.Length - accepted,
                allSeedsAccepted = accepted == runs.Length,
                distinctArchetypeCount = archetypes.Count,
                heroSeeds = ToSeedStrings(SelectHeroes(runs)),
                alternateAngleSeeds = ToSeedStrings(SelectHeroes(runs).Take(3).ToArray()),
                weakestAcceptedSeed = runs.Where(run => run.Formation.Accepted)
                    .OrderByDescending(WeaknessScore).Select(run => run.Seed.ToString(CultureInfo.InvariantCulture)).FirstOrDefault() ?? string.Empty,
                formations = rows
            };
            return receipt;
        }

        private static GalleryRun[] SelectHeroes(GalleryRun[] runs)
        {
            var result = new List<GalleryRun>(4);
            for (int archetype = 0; archetype < 4; archetype++)
            {
                string name = ((U4EFormationArchetype)archetype).ToString();
                GalleryRun selected = runs.Where(run => run.Formation.Accepted && run.Formation.Archetype.ToString() == name)
                    .OrderBy(run => WeaknessScore(run)).ThenBy(run => run.Seed).FirstOrDefault();
                if (selected != null) result.Add(selected);
            }
            return result.ToArray();
        }

        private static GalleryRun SelectWeakest(GalleryRun[] runs)
            => runs.Where(run => run.Formation.Accepted).OrderByDescending(WeaknessScore).ThenBy(run => run.Seed).First();

        private static double WeaknessScore(GalleryRun run)
        {
            U4EFormationBuildResult formation = run.Formation;
            if (formation == null || !formation.Accepted) return double.PositiveInfinity;
            double score = 0d;
            foreach (U4EFormationChildBuild child in formation.Children)
                score += Math.Abs(child.Fit.adjustmentMeters) / U4EFormationConfiguration.MaximumFitAdjustmentMeters;
            foreach (U4EContactMeasurement edge in formation.ContactGraph.measurements)
            {
                if (!edge.acceptedContact) continue;
                score += Math.Abs(edge.minimumSurfaceGapMeters - U4EFormationConfiguration.TargetContactGapMeters) /
                    U4EFormationConfiguration.MaximumContactGapMeters;
            }
            score /= Math.Max(1, formation.Children.Count + formation.ContactGraph.acceptedEdgeCount);
            return score;
        }

        private static string[] ToSeedStrings(GalleryRun[] values)
        {
            var output = new string[values.Length];
            for (int i = 0; i < values.Length; i++) output[i] = values[i].Seed.ToString(CultureInfo.InvariantCulture);
            return output;
        }

        private static void GetFormationBounds(U4EFormationBuildResult formation, out MatterFloat3 min, out MatterFloat3 max)
        {
            min = new MatterFloat3(float.PositiveInfinity, float.PositiveInfinity, float.PositiveInfinity);
            max = new MatterFloat3(float.NegativeInfinity, float.NegativeInfinity, float.NegativeInfinity);
            for (int i = 0; i < formation.Children.Count; i++)
            {
                MatterDomain domain = formation.Children[i].Domain;
                MatterInt3 lo = domain.SampleBounds.MinInclusive;
                MatterInt3 hi = domain.SampleBounds.MaxExclusive - new MatterInt3(1, 1, 1);
                for (int corner = 0; corner < 8; corner++)
                {
                    var local = new MatterFloat3(
                        ((corner & 1) == 0 ? lo.X : hi.X) * domain.SampleSpacingMeters,
                        ((corner & 2) == 0 ? lo.Y : hi.Y) * domain.SampleSpacingMeters,
                        ((corner & 4) == 0 ? lo.Z : hi.Z) * domain.SampleSpacingMeters);
                    MatterFloat3 world = domain.Pose.TransformPoint(local);
                    min = new MatterFloat3(Math.Min(min.X, world.X), Math.Min(min.Y, world.Y), Math.Min(min.Z, world.Z));
                    max = new MatterFloat3(Math.Max(max.X, world.X), Math.Max(max.Y, world.Y), Math.Max(max.Z, world.Z));
                }
            }
        }

        private static void ClearGallery(U4EMultiDomainFormationView primary, GalleryRun[] gallery)
        {
            Scene scene = primary.gameObject.scene;
            for (int i = 0; i < gallery.Length; i++)
            {
                U4EMultiDomainFormationView view = gallery[i].View;
                if (view == null) continue;
                view.ClearPreview();
                if (view != primary) UnityEngine.Object.DestroyImmediate(view.gameObject);
            }
            ClearLabels(scene);
        }

        private static void CreateLabel(Scene scene, Camera camera, GalleryRun run)
        {
            MatterFloat3 root = run.Formation.RootPose.PositionMeters;
            var gameObject = new GameObject("U4E Gallery Label " + run.Seed.ToString(CultureInfo.InvariantCulture));
            SceneManager.MoveGameObjectToScene(gameObject, scene);
            gameObject.transform.position = new Vector3(root.X, root.Y, root.Z) + camera.transform.up * 4.25f;
            gameObject.transform.rotation = camera.transform.rotation;
            TextMesh text = gameObject.AddComponent<TextMesh>();
            text.text = run.Seed.ToString(CultureInfo.InvariantCulture) + "\n" + U4ERockFormationGenerator.DisplayName(run.Formation.Archetype);
            text.anchor = TextAnchor.MiddleCenter;
            text.alignment = TextAlignment.Center;
            text.fontSize = 64;
            text.characterSize = .08f;
            text.color = new Color(.94f, .94f, .91f, 1f);
            _ = gameObject.GetComponent<MeshRenderer>();
        }

        private static void ClearLabels(Scene scene)
        {
            foreach (GameObject root in scene.GetRootGameObjects())
                if (root.name.StartsWith("U4E Gallery Label ", StringComparison.Ordinal)) UnityEngine.Object.DestroyImmediate(root);
        }

        private static void FrameHeroCamera(Vector3 root, float yawDegrees)
        {
            Camera camera = FindSceneCamera();
            camera.orthographic = false;
            camera.fieldOfView = 38f;
            camera.nearClipPlane = .1f;
            camera.farClipPlane = 100f;
            Vector3 focus = root + new Vector3(0f, 2f, 0f);
            Vector3 arm = Quaternion.Euler(25f, yawDegrees, 0f) * new Vector3(0f, 1f, -7.7f);
            Vector3 position = focus + arm;
            camera.transform.SetPositionAndRotation(position, Quaternion.LookRotation(focus - position, Vector3.up));
        }

        private static string BaselineMismatch(U4EFormationBuildResult rebuilt, GalleryRow baseline)
        {
            if (baseline == null || !baseline.accepted || baseline.receipt == null)
                return "Committed U4E row was not accepted or did not include child hashes.";
            if (rebuilt == null || !rebuilt.Accepted)
                return "Regenerated current-fitter control failed: " + (rebuilt == null ? "no build result" : rebuilt.RejectionReason);
            if (rebuilt.AttemptIndex != baseline.attemptIndex)
                return "Accepted attempt index changed.";
            if (!string.Equals(rebuilt.SourceGeometryHash, baseline.sourceGeometryHash, StringComparison.Ordinal))
                return "Source geometry hash differs from committed U4E evidence.";
            if (rebuilt.Children.Count != baseline.receipt.children.Length)
                return "Child count differs from committed U4E evidence.";
            for (int index = 0; index < rebuilt.Children.Count; index++)
            {
                U4EFormationChildBuild actual = rebuilt.Children[index];
                U4EMultiDomainFormationView.U4EFormationDomainSummary expected = baseline.receipt.children.FirstOrDefault(child =>
                    string.Equals(child.slot, actual.Recipe.slotId, StringComparison.Ordinal));
                if (expected == null) return "Child slot is missing from committed evidence: " + actual.Recipe.slotId;
                if (!string.Equals(actual.Domain.Id, expected.id, StringComparison.Ordinal))
                    return "Stable child ID differs for slot " + actual.Recipe.slotId + ".";
                if (!string.Equals(HexHash(actual.Recipe.sourceRecipeHash), expected.sourceRecipeHash, StringComparison.Ordinal))
                    return "Source recipe hash differs for slot " + actual.Recipe.slotId + ".";
                if (!string.Equals(HexHash(actual.SourceGeometryHash), expected.sourceGeometryHash, StringComparison.Ordinal))
                    return "Source geometry hash differs for slot " + actual.Recipe.slotId + ".";
                if (!string.Equals(HexHash(actual.Domain.ComputeContentHash()), expected.contentHash, StringComparison.Ordinal))
                    return "Content hash differs for slot " + actual.Recipe.slotId + ".";
                if (!string.Equals(HexHash(actual.MeshBuild.Mesh.DeterministicHash), expected.meshHash, StringComparison.Ordinal))
                    return "Mesh hash differs for slot " + actual.Recipe.slotId + ".";
                if (!actual.Domain.SampleSpacingMeters.Equals(expected.spacingMeters))
                    return "Sample spacing differs for slot " + actual.Recipe.slotId + ".";
            }
            return string.Empty;
        }

        private static U4E1MethodComparison CreateMethodComparison(U4EFormationBuildResult result)
        {
            var report = new U4E1MethodComparison
            {
                accepted = result != null && result.Accepted,
                completeFormation = result != null && result.Accepted,
                rejectionReason = result == null ? "No build result." : result.RejectionReason,
                formationHash = result == null ? string.Empty : result.FormationHash ?? string.Empty,
                sourceGeometryHash = result == null ? string.Empty : result.SourceGeometryHash ?? string.Empty,
                contactGraphHash = result == null || result.ContactGraph == null ? string.Empty : result.ContactGraph.graphHash,
                graphConnectedToTerrain = result != null && result.ContactGraph != null && result.ContactGraph.allChildrenConnectedToTerrain,
                acceptedContactEdges = result == null || result.ContactGraph == null ? 0 : result.ContactGraph.acceptedEdgeCount,
                possibleContactEdges = result == null || result.ContactGraph == null ? 0 : result.ContactGraph.possiblePairCount
            };
            if (result == null) return report;
            if (result.ContactGraph != null)
            {
                report.zeroOverlapPairs = result.ContactGraph.measurements.Count(measurement => measurement.HasZeroSampledOverlap);
                report.zeroOverlapAllPairs = report.zeroOverlapPairs == result.ContactGraph.measurements.Length;
            }
            report.children = result.Children.Select(child => new U4E1ChildHash
            {
                id = child.Domain.Id,
                slot = child.Recipe.slotId,
                sourceRecipeHash = HexHash(child.Recipe.sourceRecipeHash),
                sourceGeometryHash = HexHash(child.SourceGeometryHash),
                contentHash = HexHash(child.Domain.ComputeContentHash()),
                meshHash = HexHash(child.MeshBuild.Mesh.DeterministicHash),
                sampleSpacingMeters = child.Domain.SampleSpacingMeters,
                meshRevision = child.Domain.MeshRevision
            }).ToArray();
            var intendedContacts = result.Children
                .Where(child => child.Fit != null && child.Fit.measurement != null && child.Fit.measurement.directionalPatch != null)
                .Select(child => CreateIntendedContact(child)).ToList();
            var recordedSlots = new HashSet<string>(intendedContacts.Select(contact => contact.slot), StringComparer.Ordinal);
            if (result.Recipe != null && result.CandidateMeasurements != null)
            {
                foreach (U4EContactMeasurement measurement in result.CandidateMeasurements)
                {
                    if (measurement == null || measurement.directionalPatch == null) continue;
                    U4ERockFormationChildRecipe recipe = result.Recipe.children.FirstOrDefault(child =>
                        string.Equals(child.stableDomainId, measurement.nodeA, StringComparison.Ordinal));
                    if (recipe == null || !recordedSlots.Add(recipe.slotId)) continue;
                    intendedContacts.Add(CreateIntendedContact(recipe, measurement, false,
                        measurement.rejectionReason));
                }
            }
            report.intendedContacts = intendedContacts.ToArray();
            report.pairOverlapValidationComplete = result.Accepted && result.ContactGraph != null &&
                result.ContactGraph.measurements.Length > 0;
            report.fittingCandidateEvaluations = result.CandidateMeasurements == null ? 0 :
                result.CandidateMeasurements.Sum(measurement => measurement == null ? 0 : measurement.fittingIterations);
            report.maximumSurfacePenetrationMeters = report.intendedContacts.Length == 0 ? 0f :
                report.intendedContacts.Max(contact => contact.maximumSurfacePenetrationMeters);
            return report;
        }

        private static U4E1IntendedContact CreateIntendedContact(U4EFormationChildBuild child)
        {
            U4EContactMeasurement measurement = child.Fit.measurement;
            return CreateIntendedContact(child.Recipe, measurement, child.Fit.accepted,
                child.Fit.rejectionReason);
        }

        private static U4E1IntendedContact CreateIntendedContact(U4ERockFormationChildRecipe recipe,
            U4EContactMeasurement measurement, bool fitAccepted, string fitRejectionReason)
        {
            U4EDirectionalContactPatchMeasurement patch = measurement.directionalPatch;
            U4EContactWitness[] contactWitnesses = LimitPersistedWitnesses(patch.contactWitnesses, 256);
            return new U4E1IntendedContact
            {
                slot = recipe.slotId,
                parentSlot = recipe.parentSlotId ?? U4EFormationConfiguration.TerrainNodeId,
                spacingMovingMeters = measurement.spacingAMeters,
                spacingAnchorMeters = measurement.spacingBMeters,
                globalMinimumGapMeters = measurement.minimumSurfaceGapMeters,
                directionalMinimumGapMeters = patch.minimumDirectionalGapMeters,
                directionalMedianGapMeters = patch.areaWeightedMedianDirectionalGapMeters,
                supportFacingTriangleCount = patch.supportFacingTriangleCount,
                acceptedPatchTriangleCount = patch.acceptedPatchTriangleCount,
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
                accepted = fitAccepted && measurement.HasZeroSampledOverlap,
                fitRejectionReason = fitRejectionReason ?? string.Empty,
                contactWitnessPositionCount = patch.contactWitnesses == null ? 0 : patch.contactWitnesses.Length,
                contactWitnessPositionsTruncated = patch.contactWitnesses != null && patch.contactWitnesses.Length > contactWitnesses.Length,
                weakPatchReason = patch.weakPatchReason,
                supportFacingWitnesses = Array.Empty<U4EContactWitness>(),
                contactWitnesses = contactWitnesses
            };
        }

        private static U4EContactWitness[] LimitPersistedWitnesses(U4EContactWitness[] witnesses, int maximumCount)
        {
            if (witnesses == null || witnesses.Length == 0) return Array.Empty<U4EContactWitness>();
            if (witnesses.Length <= maximumCount) return witnesses;
            var sampled = new U4EContactWitness[maximumCount];
            for (int index = 0; index < maximumCount; index++)
            {
                int sourceIndex = (int)Math.Round(index * (witnesses.Length - 1d) / (maximumCount - 1d),
                    MidpointRounding.AwayFromZero);
                sampled[index] = witnesses[sourceIndex];
            }
            return sampled;
        }

        private static bool SourceMatterMatches(U4EFormationBuildResult baseline, U4EFormationBuildResult variant)
        {
            if (baseline == null || variant == null || !variant.Accepted || baseline.Children.Count != variant.Children.Count)
                return false;
            var baselineBySlot = baseline.Children.ToDictionary(child => child.Recipe.slotId, StringComparer.Ordinal);
            foreach (U4EFormationChildBuild child in variant.Children)
            {
                if (!baselineBySlot.TryGetValue(child.Recipe.slotId, out U4EFormationChildBuild original)) return false;
                if (!string.Equals(child.Domain.Id, original.Domain.Id, StringComparison.Ordinal) ||
                    !string.Equals(HexHash(child.Recipe.sourceRecipeHash), HexHash(original.Recipe.sourceRecipeHash), StringComparison.Ordinal) ||
                    !string.Equals(HexHash(child.SourceGeometryHash), HexHash(original.SourceGeometryHash), StringComparison.Ordinal) ||
                    !string.Equals(HexHash(child.Domain.ComputeContentHash()), HexHash(original.Domain.ComputeContentHash()), StringComparison.Ordinal) ||
                    !string.Equals(HexHash(child.MeshBuild.Mesh.DeterministicHash), HexHash(original.MeshBuild.Mesh.DeterministicHash), StringComparison.Ordinal) ||
                    !child.Domain.SampleSpacingMeters.Equals(original.Domain.SampleSpacingMeters) ||
                    child.Domain.MeshRevision != original.Domain.MeshRevision)
                    return false;
            }
            return true;
        }

        private static bool BuiltChildrenMatterMatches(U4EFormationBuildResult baseline,
            U4EFormationBuildResult variant)
        {
            if (baseline == null || variant == null || variant.Children == null || variant.Children.Count == 0)
                return false;
            var baselineBySlot = baseline.Children.ToDictionary(child => child.Recipe.slotId, StringComparer.Ordinal);
            foreach (U4EFormationChildBuild child in variant.Children)
            {
                if (!baselineBySlot.TryGetValue(child.Recipe.slotId, out U4EFormationChildBuild original)) return false;
                if (!string.Equals(child.Domain.Id, original.Domain.Id, StringComparison.Ordinal) ||
                    !string.Equals(HexHash(child.Recipe.sourceRecipeHash), HexHash(original.Recipe.sourceRecipeHash), StringComparison.Ordinal) ||
                    !string.Equals(HexHash(child.SourceGeometryHash), HexHash(original.SourceGeometryHash), StringComparison.Ordinal) ||
                    !string.Equals(HexHash(child.Domain.ComputeContentHash()), HexHash(original.Domain.ComputeContentHash()), StringComparison.Ordinal) ||
                    !string.Equals(HexHash(child.MeshBuild.Mesh.DeterministicHash), HexHash(original.MeshBuild.Mesh.DeterministicHash), StringComparison.Ordinal) ||
                    !child.Domain.SampleSpacingMeters.Equals(original.Domain.SampleSpacingMeters) ||
                    child.Domain.MeshRevision != original.Domain.MeshRevision)
                    return false;
            }
            return true;
        }

        private static string MethodName(U4EContactFitMode mode)
        {
            switch (mode)
            {
                case U4EContactFitMode.GlobalMin25mm: return "GLOBAL_MIN_25MM";
                case U4EContactFitMode.DirectionalPatch0mm: return "DIRECTIONAL_PATCH_0MM";
                case U4EContactFitMode.DirectionalPatchMinus5mm: return "DIRECTIONAL_PATCH_MINUS_5MM";
                default: throw new ArgumentOutOfRangeException(nameof(mode));
            }
        }

        private static U4EContactFitMode ParseMethodName(string method)
        {
            if (string.Equals(method, "GLOBAL_MIN_25MM", StringComparison.OrdinalIgnoreCase))
                return U4EContactFitMode.GlobalMin25mm;
            if (string.Equals(method, "DIRECTIONAL_PATCH_0MM", StringComparison.OrdinalIgnoreCase))
                return U4EContactFitMode.DirectionalPatch0mm;
            if (string.Equals(method, "DIRECTIONAL_PATCH_MINUS_5MM", StringComparison.OrdinalIgnoreCase))
                return U4EContactFitMode.DirectionalPatchMinus5mm;
            throw new ArgumentException("Unknown U4E.1 fitting method: " + method, nameof(method));
        }

        private static float PrimaryEvidenceYaw(int seed)
        {
            switch (seed)
            {
                case 7004: return 22f;
                case 7017: return 59f;
                case 7010: return 96f;
                case 7015: return 133f;
                case 7019: return 35f;
                default: return 29f;
            }
        }

        private static float AlternateEvidenceYaw(int seed)
        {
            switch (seed)
            {
                case 7017: return 153f;
                case 7010: return 194f;
                default: return 112f;
            }
        }

        private static string ExistingBaselineCapture(int seed, string view)
        {
            string root = EvidencePath();
            if (string.Equals(view, "alternate", StringComparison.Ordinal))
            {
                if (seed != 7004 && seed != 7017 && seed != 7010) return string.Empty;
                return Path.Combine(root, "captures", "alternate", "alternate-" + seed.ToString(CultureInfo.InvariantCulture) + ".png");
            }
            if (seed == 7004 || seed == 7017 || seed == 7010 || seed == 7015)
                return Path.Combine(root, "captures", "heroes", "hero-" + seed.ToString(CultureInfo.InvariantCulture) + ".png");
            if (seed == 7019)
                return Path.Combine(root, "captures", "weakest", "weakest-" + seed.ToString(CultureInfo.InvariantCulture) + ".png");
            return string.Empty;
        }

        private static void CaptureBaselineParity(int seed, string viewName, float yaw,
            string referencePath, U4EMultiDomainFormationView view, Camera camera,
            List<U4E1CaptureParity> output)
        {
            if (string.IsNullOrEmpty(referencePath) || !File.Exists(referencePath)) return;
            FrameHeroCamera(Vector3.zero, yaw);
            string actual = Path.Combine(Path.GetTempPath(), "u4e1-baseline-" + seed.ToString(CultureInfo.InvariantCulture) + "-" + viewName + ".png");
            SaveCameraCapture(camera, actual, 1920, 1080);
            bool matches = PngPixelsMatch(referencePath, actual);
            output.Add(new U4E1CaptureParity
            {
                seed = seed,
                view = viewName,
                referencePath = RelativeToRepository(referencePath),
                pixelMatch = matches
            });
            if (File.Exists(actual)) File.Delete(actual);
        }

        private static bool PngPixelsMatch(string firstPath, string secondPath)
        {
            Texture2D first = null, second = null;
            try
            {
                first = new Texture2D(2, 2, TextureFormat.RGBA32, false, true);
                second = new Texture2D(2, 2, TextureFormat.RGBA32, false, true);
                if (!first.LoadImage(File.ReadAllBytes(firstPath)) || !second.LoadImage(File.ReadAllBytes(secondPath)) ||
                    first.width != second.width || first.height != second.height) return false;
                Color32[] firstPixels = first.GetPixels32();
                Color32[] secondPixels = second.GetPixels32();
                if (firstPixels.Length != secondPixels.Length) return false;
                for (int index = 0; index < firstPixels.Length; index++)
                    if (!firstPixels[index].Equals(secondPixels[index])) return false;
                return true;
            }
            catch { return false; }
            finally
            {
                if (first != null) UnityEngine.Object.DestroyImmediate(first);
                if (second != null) UnityEngine.Object.DestroyImmediate(second);
            }
        }

        private static bool IsDebugSeed(int seed) => seed == 7000 || seed == 7004 || seed == 7017;

        private static float StableYaw(int seed)
        {
            unchecked { return ((uint)seed * 2654435761u) % 360u; }
        }

        private static MatterSampleAddress FindSolidSample(MatterDomain domain)
        {
            MatterBounds bounds = domain.SampleBounds;
            for (int z = bounds.MinInclusive.Z; z < bounds.MaxExclusive.Z; z++)
            for (int y = bounds.MinInclusive.Y; y < bounds.MaxExclusive.Y; y++)
            for (int x = bounds.MinInclusive.X; x < bounds.MaxExclusive.X; x++)
            {
                var address = new MatterSampleAddress(x, y, z);
                if (domain.ReadSample(address).IsSolid) return address;
            }
            throw new InvalidOperationException("U4E child domain contains no positive solid samples.");
        }

        private static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);

        private static string[] ChildIds(IReadOnlyList<U4EFormationChildBuild> children)
            => children.Select(child => child.Domain.Id).ToArray();

        private static string[] ChildContentHashes(IReadOnlyList<U4EFormationChildBuild> children)
            => children.Select(child => HexHash(child.Domain.ComputeContentHash())).ToArray();

        private static string[] ChildMeshHashes(IReadOnlyList<U4EFormationChildBuild> children)
            => children.Select(child => HexHash(child.MeshBuild.Mesh.DeterministicHash)).ToArray();

        private static string[] ChildSourceGeometryHashes(IReadOnlyList<U4EFormationChildBuild> children)
            => children.Select(child => HexHash(child.SourceGeometryHash)).ToArray();

        private static string HexHash(ulong value) => "0x" + value.ToString("X16", CultureInfo.InvariantCulture);

        private static bool SameStrings(string[] left, string[] right)
            => left != null && right != null && left.SequenceEqual(right, StringComparer.Ordinal);

        private static void SaveCameraCapture(Camera camera, string path, int width, int height)
        {
            if (camera == null) throw new InvalidOperationException("The active U4E scene camera is missing.");
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            RenderTexture previousTarget = camera.targetTexture;
            RenderTexture previousActive = RenderTexture.active;
            float previousAspect = camera.aspect;
            var render = new RenderTexture(width, height, 24, RenderTextureFormat.ARGB32)
            {
                antiAliasing = 1,
                name = "U4E evidence capture"
            };
            var image = new Texture2D(width, height, TextureFormat.RGB24, false, false);
            try
            {
                camera.aspect = width / (float)height;
                camera.targetTexture = render;
                camera.Render();
                RenderTexture.active = render;
                image.ReadPixels(new Rect(0, 0, width, height), 0, 0);
                image.Apply(false, false);
                File.WriteAllBytes(path, image.EncodeToPNG());
            }
            finally
            {
                camera.targetTexture = previousTarget;
                camera.aspect = previousAspect;
                RenderTexture.active = previousActive;
                UnityEngine.Object.DestroyImmediate(image);
                render.Release();
                UnityEngine.Object.DestroyImmediate(render);
            }
        }

        private static U4EMultiDomainFormationView GetView()
            => FindView(GetScene());

        private static Scene GetScene()
        {
            Scene scene = SceneManager.GetSceneByPath(ScenePath);
            if (!scene.IsValid() || !scene.isLoaded) scene = EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Additive);
            SceneManager.SetActiveScene(scene);
            return scene;
        }

        private static U4EMultiDomainFormationView FindView(Scene scene)
        {
            foreach (GameObject root in scene.GetRootGameObjects())
            {
                U4EMultiDomainFormationView view = root.GetComponentInChildren<U4EMultiDomainFormationView>(true);
                if (view != null) return view;
            }
            throw new InvalidOperationException("The U4E scene has no U4EMultiDomainFormationView; run u4e_prepare_scene first.");
        }

        private static List<U4EMultiDomainFormationView> FindViews(Scene scene)
        {
            var views = new List<U4EMultiDomainFormationView>();
            foreach (GameObject root in scene.GetRootGameObjects())
                views.AddRange(root.GetComponentsInChildren<U4EMultiDomainFormationView>(true));
            return views;
        }

        private static Camera FindSceneCamera()
        {
            Scene scene = GetScene();
            foreach (GameObject root in scene.GetRootGameObjects())
            {
                Camera camera = root.GetComponentInChildren<Camera>(true);
                if (camera != null) return camera;
            }
            throw new InvalidOperationException("The U4E scene camera is missing.");
        }

        private static void CreateEnvironment(Scene scene)
        {
            var cameraObject = new GameObject("U4E Formation Camera");
            SceneManager.MoveGameObjectToScene(cameraObject, scene);
            Camera camera = cameraObject.AddComponent<Camera>();
            camera.tag = "MainCamera";
            camera.nearClipPlane = .1f;
            camera.farClipPlane = 100f;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(.055f, .075f, .09f, 1f);
            HDAdditionalCameraData cameraData = cameraObject.AddComponent<HDAdditionalCameraData>();
            cameraData.clearColorMode = HDAdditionalCameraData.ClearColorMode.Color;
            cameraData.backgroundColorHDR = camera.backgroundColor;
            cameraData.volumeLayerMask = 1 << 1;
            cameraData.volumeAnchorOverride = camera.transform;
            camera.transform.SetPositionAndRotation(new Vector3(0f, 7f, -13f),
                Quaternion.LookRotation(new Vector3(0f, 1.3f, 0f) - new Vector3(0f, 7f, -13f), Vector3.up));

            var keyObject = new GameObject("U4E Broad Face Key");
            SceneManager.MoveGameObjectToScene(keyObject, scene);
            keyObject.transform.rotation = Quaternion.Euler(33f, -28f, 0f);
            Light key = keyObject.AddComponent<Light>();
            key.type = LightType.Directional;
            key.intensity = 2.25f;
            key.shadows = LightShadows.Soft;

            var fillObject = new GameObject("U4E Cool Fill");
            SceneManager.MoveGameObjectToScene(fillObject, scene);
            fillObject.transform.rotation = Quaternion.Euler(22f, 144f, 0f);
            Light fill = fillObject.AddComponent<Light>();
            fill.type = LightType.Directional;
            fill.intensity = .42f;
            fill.color = new Color(.83f, .88f, .94f);
            fill.shadows = LightShadows.None;

            VolumeProfile profile = AssetDatabase.LoadAssetAtPath<VolumeProfile>(ExposurePath);
            if (profile == null) throw new FileNotFoundException("U4E requires the accepted fixed-exposure U4C volume profile.", ExposurePath);
            var volumeObject = new GameObject("U4E Fixed Exposure");
            SceneManager.MoveGameObjectToScene(volumeObject, scene);
            volumeObject.layer = 1;
            Volume volume = volumeObject.AddComponent<Volume>();
            volume.isGlobal = true;
            volume.priority = 100f;
            volume.sharedProfile = profile;
            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(.19f, .21f, .23f);
        }

        private static void EnsureEvidenceFolders(string root)
        {
            Directory.CreateDirectory(root);
            foreach (string folder in new[] { "tests", "metrics", "contact", "persistence", "captures", "captures/heroes",
                "captures/alternate", "captures/weakest", "player" }) Directory.CreateDirectory(Path.Combine(root, folder));
        }

        private static void EnsureU4E1EvidenceFolders(string root)
        {
            foreach (string folder in new[] { "metrics", "captures", "captures/raw", "captures/raw/primary",
                "captures/raw/alternate", "player" }) Directory.CreateDirectory(Path.Combine(root, folder));
        }

        private static void WriteJson<T>(string path, T value)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            File.WriteAllText(path, JsonUtility.ToJson(value, true));
        }

        private static string EvidencePath()
        {
            string repositoryRoot = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", "..", ".."));
            return Path.Combine(repositoryRoot, EvidenceRelativePath.Replace('/', Path.DirectorySeparatorChar));
        }

        private static string EvidencePathForU4E1()
        {
            string repositoryRoot = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", "..", ".."));
            return Path.Combine(repositoryRoot, U4E1EvidenceRelativePath.Replace('/', Path.DirectorySeparatorChar));
        }

        private static string RelativeToRepository(string path)
        {
            string root = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", "..", ".."));
            Uri rootUri = new Uri(root.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar);
            Uri targetUri = new Uri(Path.GetFullPath(path));
            return Uri.UnescapeDataString(rootUri.MakeRelativeUri(targetUri).ToString()).Replace('/', Path.DirectorySeparatorChar);
        }

        private static void EnsureAssetFolder(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;
            string parent = Path.GetDirectoryName(path).Replace('\\', '/');
            string leaf = Path.GetFileName(path);
            if (!AssetDatabase.IsValidFolder(parent)) EnsureAssetFolder(parent);
            AssetDatabase.CreateFolder(parent, leaf);
        }

        [Serializable]
        private sealed class SceneReceipt
        {
            public string scenePath;
            public string evidencePath;
            public string unityVersion;
            public string target;
            public string materialPath;
            public int startupSeed;
        }

        [Serializable]
        private sealed class FinalReceipt
        {
            public string result;
            public int acceptedSeeds;
            public int rejectedSeeds;
            public string[] heroSeeds;
            public string[] alternateAngleSeeds;
            public string weakestSeed;
            public bool descriptorBelowTenPercent;
            public bool regenerationMatches;
            public int editInvalidatedPairCount;
            public string unityVersion;
        }
    }
}
