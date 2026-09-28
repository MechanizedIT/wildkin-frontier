using System;
using NUnit.Framework;
using Wildkin.Matter;
using Wildkin.Matter.Unity;

namespace Wildkin.Tests.EditMode
{
    public sealed class MatterDomainSaveTests
    {
        [Test]
        public void EditedMovedDomain_ReloadsFromMatterOnlyAndRemeshesDeterministically()
        {
            const float spacing = .125f;
            var source = new SphereGrid(spacing, 1.8f);
            MatterBounds bounds = new MatterBounds(new MatterInt3(-20, -20, -20), new MatterInt3(21, 21, 21));
            MatterDomain original = MatterDomain.Bake("save-rock-0125", bounds, spacing, source,
                MatterDomainPose.Identity);
            MatterDomainEditResult edit = original.RemoveSphereLocal(new MatterFloat3(.5f, 0f, 0f), .38f);
            Assert.That(edit.Changed, Is.True);
            original.SetPose(new MatterDomainPose(new MatterFloat3(8.25f, 3.5f, -6.75f), 0f,
                (float)Math.Sqrt(.5d), 0f, (float)Math.Sqrt(.5d)));
            ulong expectedContentHash = original.ComputeContentHash();
            var firstMesher = new MatterDomainSurfaceNetsMesher();
            ulong expectedMeshHash = firstMesher.Build(original).Mesh.DeterministicHash;
            source.ClearToAir();
            source = null;

            string json = MatterDomainSaveCodec.Write(original);
            Assert.That(json, Does.Contain("densityMaterialBase64"));
            Assert.That(json, Does.Not.Contain("sourceMesh"));
            Assert.That(json, Does.Not.Contain("unityMesh"));
            MatterDomain destroyedRuntimeInstance = original;
            original = null;
            destroyedRuntimeInstance = null;

            MatterDomain loaded = MatterDomainSaveCodec.Read(json);
            var secondMesher = new MatterDomainSurfaceNetsMesher();
            ulong actualMeshHash = secondMesher.Build(loaded).Mesh.DeterministicHash;

            Assert.That(loaded.Id, Is.EqualTo("save-rock-0125"));
            Assert.That(loaded.SampleSpacingMeters, Is.EqualTo(spacing));
            Assert.That(loaded.SampleBounds.MinInclusive, Is.EqualTo(bounds.MinInclusive));
            Assert.That(loaded.SampleBounds.MaxExclusive, Is.EqualTo(bounds.MaxExclusive));
            Assert.That(loaded.ContentRevision, Is.EqualTo(1));
            Assert.That(loaded.ComputeContentHash(), Is.EqualTo(expectedContentHash));
            Assert.That(loaded.Pose.PositionMeters.X, Is.EqualTo(8.25f));
            Assert.That(loaded.Pose.PositionMeters.Y, Is.EqualTo(3.5f));
            Assert.That(loaded.Pose.PositionMeters.Z, Is.EqualTo(-6.75f));
            Assert.That(loaded.Pose.RotationY, Is.EqualTo((float)Math.Sqrt(.5d)).Within(1e-6f));
            Assert.That(loaded.ReadSample(new MatterSampleAddress(4, 0, 0)).IsSolid, Is.False,
                "The carved cavity remains in the loaded matter authority.");
            Assert.That(actualMeshHash, Is.EqualTo(expectedMeshHash),
                "A source-free remesh must match the geometry built before the runtime instance was discarded.");
            Assert.That(loaded.RawPayloadBytes, Is.EqualTo(loaded.SampleCount * 5L));
        }

        [Test]
        public void SaveCodec_RejectsWrongSchemaCorruptPayloadAndInvalidMaterial()
        {
            MatterDomain domain = MatterDomain.Bake("bad-save", new MatterBounds(
                new MatterInt3(-2, -2, -2), new MatterInt3(3, 3, 3)), .125f,
                new SphereGrid(.125f, .2f), MatterDomainPose.Identity);
            string json = MatterDomainSaveCodec.Write(domain);
            string wrongSchema = json.Replace("\"schemaVersion\": 1", "\"schemaVersion\": 91");
            Assert.Throws<FormatException>(() => MatterDomainSaveCodec.Read(wrongSchema));

            int payloadStart = json.IndexOf("\"densityMaterialBase64\": \"", StringComparison.Ordinal);
            Assert.That(payloadStart, Is.GreaterThanOrEqualTo(0));
            int valueStart = json.IndexOf('"', payloadStart + "\"densityMaterialBase64\": ".Length) + 1;
            int valueEnd = json.IndexOf('"', valueStart);
            char original = json[valueStart];
            char replacement = original == 'A' ? 'B' : 'A';
            string corruptPayload = json.Substring(0, valueStart) + replacement + json.Substring(valueStart + 1);
            Assert.Throws<FormatException>(() => MatterDomainSaveCodec.Read(corruptPayload));

            byte[] payload = Convert.FromBase64String(json.Substring(valueStart, valueEnd - valueStart));
            payload[4] = 250;
            string invalidMaterialBase64 = Convert.ToBase64String(payload);
            string invalidMaterial = json.Substring(0, valueStart) + invalidMaterialBase64 + json.Substring(valueEnd);
            Assert.Throws<FormatException>(() => MatterDomainSaveCodec.Read(invalidMaterial));
        }

        private sealed class SphereGrid : IMatterReadOnlyGrid
        {
            private readonly float _radius;
            private bool _cleared;
            public float SampleSpacingMeters { get; }
            public SphereGrid(float spacing, float radius) { SampleSpacingMeters = spacing; _radius = radius; }
            public MatterSample ReadSample(MatterSampleAddress address)
            {
                if (_cleared) return MatterSample.Air(-SampleSpacingMeters);
                double x = address.X * (double)SampleSpacingMeters;
                double y = address.Y * (double)SampleSpacingMeters;
                double z = address.Z * (double)SampleSpacingMeters;
                float density = (float)(_radius - Math.Sqrt(x * x + y * y + z * z));
                return density > 0f ? new MatterSample(density, MatterMaterialId.Rock) : MatterSample.Air(density);
            }
            public void ClearToAir() => _cleared = true;
        }
    }
}
