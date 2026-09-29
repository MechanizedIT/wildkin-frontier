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
