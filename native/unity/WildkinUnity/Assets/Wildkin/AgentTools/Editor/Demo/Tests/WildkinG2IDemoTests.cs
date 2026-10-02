#if UNITY_EDITOR
using System;
using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using Wildkin.AgentTools.Editor.Demo;
using Wildkin.Matter;
using Wildkin.Matter.Unity;

namespace Wildkin.Tests.Editor.Demo
{
    public sealed class WildkinG2IDemoTests
    {
        [Test]
        public void CatalogFilesAndScenesExistInDeterministicChapterOrder()
        {
            foreach (string path in WildkinG2IDemoCatalog.ReferencedFiles)
                Assert.That(File.Exists(WildkinG2IDemoCatalog.RepositoryFile(path)), Is.True, path);
            foreach (string path in new[] { WildkinG2IDemoCatalog.U4DScene, WildkinG2IDemoCatalog.U4EScene,
                         WildkinG2IDemoCatalog.ViewCode, WildkinG2IDemoCatalog.CoreCode })
                Assert.That(AssetDatabase.LoadMainAssetAtPath(path), Is.Not.Null, path);
            Assert.That(WildkinG2IDemoCatalog.Chapters.Select(c => c.Title), Is.EqualTo(new[]
            {
                "1 — Wildkin Frontier", "2 — Unity Native Matter", "3 — How I Direct AI Work",
                "4 — Evaluation: Passing Tests Isn't Enough", "5 — AI Asset Pipeline: Stop Bad Output Early"
            }));
            Assert.That(typeof(WildkinG2IDemoWindow).Assembly.GetName().Name, Is.EqualTo("Wildkin.G2IDemo.Editor"));
            string assembly = File.ReadAllText(Path.Combine(WildkinG2IDemoCatalog.ProjectRoot,
                "Assets/Wildkin/AgentTools/Editor/Demo/Wildkin.G2IDemo.Editor.asmdef"));
            Assert.That(assembly, Does.Contain("\"includePlatforms\": [\"Editor\"]"));
        }

        [Test]
        public void DisposableOutputCannotEscapeLibraryOrEnterEvidence()
        {
            string path = WildkinG2IDemoCatalog.TemporaryFile("hero.save.json");
            Assert.That(path, Does.StartWith(Path.Combine(WildkinG2IDemoCatalog.ProjectRoot, "Library", "WildkinG2IDemo") + Path.DirectorySeparatorChar));
            Assert.That(path.Replace('\\', '/'), Does.Not.Contain("native/evidence/"));
            foreach (string bad in new[] { "../hero.json", "..\\hero.json", "C:\\native\\evidence\\x.json", "/tmp/x", "..", ".", "" })
                Assert.Throws<ArgumentException>(() => WildkinG2IDemoCatalog.TemporaryFile(bad));
        }

        [Test]
        public void ExistingEvidenceImagesDecodeAndWindowReleasesTextures()
        {
            var window = ScriptableObject.CreateInstance<WildkinG2IDemoWindow>();
            Texture2D[] textures;
            try
            {
                textures = new[] { WildkinG2IDemoCatalog.TargetImage, WildkinG2IDemoCatalog.RawImage,
                    WildkinG2IDemoCatalog.CleanupImage }.Select(window.LoadImage).ToArray();
                Assert.That(textures.All(t => t.width > 100 && t.height > 100), Is.True);
            }
            finally { UnityEngine.Object.DestroyImmediate(window); }
            Assert.That(textures.All(t => t == null), Is.True);
        }

        [Test]
        public void U4DResetRepeatableAndExistingEditMoveReloadPathPreservesIsolation()
        {
            using (var session = new WildkinG2IDemoSession())
            {
                session.OpenU4D();
                var canonicalView = session.U4D.gameObject.scene.GetRootGameObjects()
                    .SelectMany(r => r.GetComponentsInChildren<MatterDomainQualificationView>())
                    .Single(v => v != session.U4D);
                string serializedBefore = EditorJsonUtility.ToJson(canonicalView);
                ulong initial = session.U4D.GetDomain(WildkinG2IDemoCatalog.HeroId).ComputeContentHash();
                string world = MatterWorldSaveCodec.Write(session.U4D.World);
                string siblingId = session.U4D.ListDomainIds().Single(id => id != WildkinG2IDemoCatalog.HeroId);
                ulong sibling = session.U4D.GetDomain(siblingId).ComputeContentHash();
                Assert.That(session.CarveHero().changed, Is.True);
                ulong carved = session.U4D.GetDomain(WildkinG2IDemoCatalog.HeroId).ComputeContentHash();
                Assert.That(carved, Is.Not.EqualTo(initial));
                session.MoveHero();
                Assert.That(session.U4D.GetDomain(WildkinG2IDemoCatalog.HeroId).ComputeContentHash(), Is.EqualTo(carved));
                var reloaded = session.SaveReloadHero();
                Assert.That(reloaded.contentHashMatches && reloaded.transformMatches && reloaded.remeshedGeometryMatches, Is.True);
                Assert.That(MatterWorldSaveCodec.Write(session.U4D.World), Is.EqualTo(world));
                Assert.That(session.U4D.GetDomain(siblingId).ComputeContentHash(), Is.EqualTo(sibling));
                session.Reset();
                Assert.That(session.U4D.GetDomain(WildkinG2IDemoCatalog.HeroId).ComputeContentHash(), Is.EqualTo(initial));
                Assert.That(session.U4D.GetDomain(WildkinG2IDemoCatalog.HeroId).ContentRevision, Is.Zero);
                session.ToggleBounds(); session.ToggleBounds();
                Assert.That(EditorJsonUtility.ToJson(canonicalView), Is.EqualTo(serializedBefore),
                    "Authored view configuration must remain untouched.");
                Assert.That(session.U4D.gameObject.hideFlags & HideFlags.DontSave, Is.EqualTo(HideFlags.DontSave),
                    "Demo view must never be serialized into the canonical scene.");
            }
        }

        [Serializable] private sealed class Gallery { public Row[] formations; public string[] heroSeeds; public string weakestAcceptedSeed; }
        [Serializable] private sealed class Row { public int seed; public string sourceGeometryHash; public Receipt receipt; }
        [Serializable] private sealed class Receipt { public Child[] children; }
        [Serializable] private sealed class Child { public string contentHash; public string meshHash; public string sourceGeometryHash; }

        [Test]
        public void U4ECommittedSeedsReproduceAndPreservePinnedSourceAndDomainEvidence()
        {
            var gallery = JsonUtility.FromJson<Gallery>(File.ReadAllText(WildkinG2IDemoCatalog.RepositoryFile(WildkinG2IDemoCatalog.U4EGallery)));
            Assert.That(gallery.heroSeeds, Does.Contain(WildkinG2IDemoCatalog.HeroSeed.ToString()));
            Assert.That(gallery.weakestAcceptedSeed, Is.EqualTo(WildkinG2IDemoCatalog.WeakSeed.ToString()));
            using (var session = new WildkinG2IDemoSession())
            {
                session.OpenU4E();
                var canonicalView = session.U4E.gameObject.scene.GetRootGameObjects()
                    .SelectMany(r => r.GetComponentsInChildren<U4EMultiDomainFormationView>())
                    .Single(v => v != session.U4E);
                string serializedBefore = EditorJsonUtility.ToJson(canonicalView);
                foreach (int seed in new[] { WildkinG2IDemoCatalog.HeroSeed, WildkinG2IDemoCatalog.WeakSeed })
                {
                    if (seed != WildkinG2IDemoCatalog.HeroSeed) session.ShowFormation(seed);
                    U4EFormationBuildResult first = session.U4E.Formation;
                    Assert.That(first.Accepted, Is.True);
                    Row committed = gallery.formations.Single(r => r.seed == seed);
                    Assert.That(first.SourceGeometryHash, Is.EqualTo(committed.sourceGeometryHash));
                    Assert.That(first.Children.Select(c => "0x" + c.Domain.ComputeContentHash().ToString("X16")),
                        Is.EqualTo(committed.receipt.children.Select(c => c.contentHash)));
                    Assert.That(first.Children.Select(c => "0x" + c.MeshBuild.Mesh.DeterministicHash.ToString("X16")),
                        Is.EqualTo(committed.receipt.children.Select(c => c.meshHash)));
                    string hash = first.FormationHash;
                    session.ShowFormation(seed);
                    Assert.That(session.U4E.Formation.FormationHash, Is.EqualTo(hash));
                }
                session.ToggleGraph(); session.ToggleBounds(); session.ToggleGraph(); session.ToggleBounds();
                Assert.That(EditorJsonUtility.ToJson(canonicalView), Is.EqualTo(serializedBefore));
            }
        }

        [Test]
        public void CleanupPreservesOwnerObjectAddedBetweenDemoActions()
        {
            var session = new WildkinG2IDemoSession();
            GameObject ownerObject = null;
            try
            {
                session.OpenU4D();
                ownerObject = new GameObject("Test owner object (must survive demo cleanup)");
                UnityEngine.SceneManagement.SceneManager.MoveGameObjectToScene(ownerObject, session.U4D.gameObject.scene);
                session.ToggleBounds();
                Assert.That(ownerObject.hideFlags, Is.EqualTo(HideFlags.None));
                session.Dispose();
                Assert.That(ownerObject != null, Is.True);
            }
            finally
            {
                session.Dispose();
                if (ownerObject != null) UnityEngine.Object.DestroyImmediate(ownerObject);
            }
        }
    }
}
#endif
