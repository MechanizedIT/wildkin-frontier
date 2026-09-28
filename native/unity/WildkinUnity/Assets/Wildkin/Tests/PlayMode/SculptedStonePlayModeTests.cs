using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using Wildkin.Matter;
using Wildkin.Matter.Unity;

namespace Wildkin.Tests.PlayMode
{
    public sealed class SculptedStonePlayModeTests
    {
        [UnityTest]
        public IEnumerator DirectSourceAndMatterPreview_ReplaceAndDisposeTheirTransientGeometry()
        {
            var root = new GameObject("U4C2 PlayMode Qualification");
            var view = root.AddComponent<SculptedStoneGalleryView>();
            view.Configure(SourceRockArchetype.CapstoneSlab,4101,false);
            yield return null;
            Assert.That(root.GetComponentsInChildren<MeshRenderer>().Length,Is.EqualTo(1));
            Assert.That(view.Source.Validate(out string issue),Is.True,issue);
            view.ConfigureMatter(SourceRockArchetype.ChunkyBoulder,4102,.125f);
            yield return null;
            Assert.That(view.Volume.SampleSpacingMeters,Is.EqualTo(.125f));
            Assert.That(view.Source.Validate(out issue),Is.True,issue);
            Assert.That(root.GetComponentsInChildren<MeshRenderer>().Length,Is.EqualTo(1));
            view.ClearPreview();
            yield return null;
            Assert.That(root.GetComponentsInChildren<MeshRenderer>().Length,Is.Zero);
            Object.Destroy(root); yield return null;
        }
    }
}
