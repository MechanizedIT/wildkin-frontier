using System;
using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using Wildkin.Matter;

namespace Wildkin.Tests.EditMode
{
    public sealed class MatterReferenceContractTests
    {
        [Serializable]
        private sealed class Phase05EReference
        {
            public string[] matterInvariants;
        }

        [Test]
        public void Phase05EReference_PreservesArchitectureAndMatterInvariants()
        {
            Phase05EReference reference = ReadReference();
            string[] required =
            {
                "authoritative matter, render surface, and rigid-body physics proxy are separate concerns",
                "chunks or bricks are spatial/render partitions, not physical owners",
                "detachment and ownership transfer do not create resource rewards",
                "detached MatterActors own resolved local matter and remain recursively destructible",
                "unknown structural support fails closed rather than causing speculative collapse",
                "procedural source matter does not regenerate after accepted runtime removal or extraction"
            };

            foreach (string invariant in required)
                Assert.That(reference.matterInvariants, Does.Contain(invariant), invariant);
        }

        [Test]
        public void MatterDomainAssembly_HasNoUnityEngineDependency()
        {
            string[] references = typeof(MatterWorld).Assembly.GetReferencedAssemblies()
                .Select(item => item.Name).ToArray();

            Assert.That(references, Has.None.StartsWith("UnityEngine"));
        }

        [TestCase(MatterSupportKnowledge.Unknown, false)]
        [TestCase(MatterSupportKnowledge.Supported, false)]
        [TestCase(MatterSupportKnowledge.Unsupported, true)]
        public void UnknownSupport_IsFailClosedAndOnlyCompleteUnsupportedEvidenceAllowsDetach(
            MatterSupportKnowledge knowledge, bool expected)
        {
            Assert.That(MatterSupportContract.MayDetach(knowledge), Is.EqualTo(expected));
        }

        private static Phase05EReference ReadReference()
        {
            string path = Path.GetFullPath(Path.Combine(
                Application.dataPath, "..", "..", "..", "shared", "reference", "PHASE05E_REFERENCE.json"));
            Assert.That(File.Exists(path), Is.True, "Expected the shared Phase 0.5E reference at " + path);
            Phase05EReference reference = JsonUtility.FromJson<Phase05EReference>(File.ReadAllText(path));
            Assert.That(reference, Is.Not.Null);
            Assert.That(reference.matterInvariants, Is.Not.Null);
            return reference;
        }
    }
}
