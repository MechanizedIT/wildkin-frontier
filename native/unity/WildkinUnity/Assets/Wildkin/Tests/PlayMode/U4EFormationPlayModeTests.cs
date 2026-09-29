using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using Wildkin.Matter;
using Wildkin.Matter.Unity;

namespace Wildkin.Tests.PlayMode
{
    public sealed class U4EFormationPlayModeTests
    {
        [UnityTest]
        public IEnumerator RuntimeFormation_RendersIndependentDomainsAndRegeneratesPristineDescriptor()
        {
            var host = new GameObject("U4E PlayMode Qualification");
            U4EMultiDomainFormationView view = host.AddComponent<U4EMultiDomainFormationView>();
            view.Configure(null, 7000);
            var first = view.Generate(7000, Vector3.zero, 0f);
            yield return null;

            Assert.That(first.Accepted, Is.True, first.RejectionReason);
            Assert.That(view.RenderedDomainCount, Is.EqualTo(first.Children.Count));
            Assert.That(view.RenderedMeshCount, Is.EqualTo(first.Children.Count + 1));
            Assert.That(first.ContactGraph.allChildrenConnectedToTerrain, Is.True);
            for (int i = 0; i < first.Children.Count; i++)
            {
                Assert.That(first.Children[i].Domain.Id, Does.Contain("-" + first.Children[i].Recipe.slotId));
                Assert.That(first.Children[i].MeshBuild.Mesh.Vertices.Length, Is.GreaterThan(0));
            }

            string initialHash = first.FormationHash;
            U4EFormationBuildResult regenerated = view.RegeneratePristine();
            yield return null;
            Assert.That(regenerated.Accepted, Is.True, regenerated.RejectionReason);
            Assert.That(regenerated.FormationHash, Is.EqualTo(initialHash));
            Assert.That(view.RenderedDomainCount, Is.EqualTo(regenerated.Children.Count));
            Assert.That(view.RenderedMeshCount, Is.EqualTo(regenerated.Children.Count + 1));

            Object.Destroy(host);
            yield return null;
        }
    }
}
