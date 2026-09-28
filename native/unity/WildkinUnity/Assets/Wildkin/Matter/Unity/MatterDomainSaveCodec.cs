using System;
using System.Globalization;
using System.Runtime.InteropServices;
using UnityEngine;
using Wildkin.Matter;

namespace Wildkin.Matter.Unity
{
    /// <summary>Standalone qualification snapshot for local matter; it stores no source or mesh reference.</summary>
    public static class MatterDomainSaveCodec
    {
        private const int SchemaVersion = 1;

        [Serializable]
        private sealed class SaveDocument
        {
            public int schemaVersion;
            public string id;
            public float sampleSpacingMeters;
            public Address minInclusive;
            public Address maxExclusive;
            public long contentRevision;
            public Pose pose;
            public string contentHash;
            public string densityMaterialBase64;
        }

        [Serializable]
        private struct Address
        {
            public int x;
            public int y;
            public int z;
        }

        [Serializable]
        private struct Pose
        {
            public float x;
            public float y;
            public float z;
            public float qx;
            public float qy;
            public float qz;
            public float qw;
        }

        [StructLayout(LayoutKind.Explicit)]
        private struct FloatUInt
        {
            [FieldOffset(0)] public float Float;
            [FieldOffset(0)] public uint UInt;
        }

        public static string Write(MatterDomain domain)
        {
            if (domain == null) throw new ArgumentNullException(nameof(domain));
            float[] densities = domain.CopyDensitySamples();
            byte[] materials = domain.CopyMaterialSamples();
            byte[] payload = new byte[checked(densities.Length * MatterBrickLayout.RawBytesPerSample)];
            for (int i = 0, offset = 0; i < densities.Length; i++, offset += MatterBrickLayout.RawBytesPerSample)
            {
                uint bits = new FloatUInt { Float = densities[i] }.UInt;
                payload[offset] = (byte)bits;
                payload[offset + 1] = (byte)(bits >> 8);
                payload[offset + 2] = (byte)(bits >> 16);
                payload[offset + 3] = (byte)(bits >> 24);
                payload[offset + 4] = materials[i];
            }

            MatterDomainPose pose = domain.Pose;
            var document = new SaveDocument
            {
                schemaVersion = SchemaVersion,
                id = domain.Id,
                sampleSpacingMeters = domain.SampleSpacingMeters,
                minInclusive = ToAddress(domain.SampleBounds.MinInclusive),
                maxExclusive = ToAddress(domain.SampleBounds.MaxExclusive),
                contentRevision = domain.ContentRevision,
                pose = new Pose
                {
                    x = pose.PositionMeters.X, y = pose.PositionMeters.Y, z = pose.PositionMeters.Z,
                    qx = pose.RotationX, qy = pose.RotationY, qz = pose.RotationZ, qw = pose.RotationW
                },
                contentHash = domain.ComputeContentHash().ToString("x16", CultureInfo.InvariantCulture),
                densityMaterialBase64 = Convert.ToBase64String(payload)
            };
            return JsonUtility.ToJson(document, true);
        }

        public static MatterDomain Read(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
                throw new ArgumentException("Local matter domain save JSON is empty.", nameof(json));

            SaveDocument document;
            try
            {
                document = JsonUtility.FromJson<SaveDocument>(json);
            }
            catch (Exception exception)
            {
                throw new FormatException("Local matter domain JSON could not be parsed.", exception);
            }

            if (document == null || document.schemaVersion != SchemaVersion)
                throw new FormatException("Unsupported or missing local matter domain save schema version.");
            if (string.IsNullOrWhiteSpace(document.id) || document.id.Length > 128)
                throw new FormatException("Local matter domain stable ID is missing or invalid.");
            if (float.IsNaN(document.sampleSpacingMeters) || float.IsInfinity(document.sampleSpacingMeters) ||
                document.sampleSpacingMeters <= 0f)
                throw new FormatException("Local matter domain spacing must be finite and positive.");
            if (document.contentRevision < 0)
                throw new FormatException("Local matter domain content revision is invalid.");
            if (string.IsNullOrEmpty(document.densityMaterialBase64))
                throw new FormatException("Local matter domain density/material payload is missing.");

            byte[] payload;
            try
            {
                payload = Convert.FromBase64String(document.densityMaterialBase64);
            }
            catch (FormatException exception)
            {
                throw new FormatException("Local matter domain sample payload is not valid Base64.", exception);
            }

            MatterBounds bounds;
            int sampleCount;
            try
            {
                bounds = new MatterBounds(ToInt3(document.minInclusive), ToInt3(document.maxExclusive));
                MatterInt3 size = bounds.Size;
                sampleCount = checked(checked(size.X * size.Y) * size.Z);
            }
            catch (Exception exception) when (exception is ArgumentException || exception is OverflowException)
            {
                throw new FormatException("Local matter domain sample bounds are invalid.", exception);
            }
            if (sampleCount > 2 * 1024 * 1024 || payload.Length != checked(sampleCount * MatterBrickLayout.RawBytesPerSample))
                throw new FormatException("Local matter domain payload length does not match its bounded sample dimensions.");

            var densities = new float[sampleCount];
            var materials = new byte[sampleCount];
            for (int i = 0, offset = 0; i < sampleCount; i++, offset += MatterBrickLayout.RawBytesPerSample)
            {
                uint bits = (uint)payload[offset] | ((uint)payload[offset + 1] << 8) |
                    ((uint)payload[offset + 2] << 16) | ((uint)payload[offset + 3] << 24);
                densities[i] = new FloatUInt { UInt = bits }.Float;
                materials[i] = payload[offset + 4];
            }

            MatterDomainPose pose;
            try
            {
                pose = new MatterDomainPose(new MatterFloat3(document.pose.x, document.pose.y, document.pose.z),
                    document.pose.qx, document.pose.qy, document.pose.qz, document.pose.qw);
                MatterDomain domain = MatterDomain.Restore(document.id, bounds, document.sampleSpacingMeters,
                    densities, materials, document.contentRevision, pose);
                if (!string.Equals(domain.ComputeContentHash().ToString("x16", CultureInfo.InvariantCulture),
                        document.contentHash, StringComparison.OrdinalIgnoreCase))
                    throw new FormatException("Local matter domain content hash does not match its sample payload.");
                return domain;
            }
            catch (Exception exception) when (exception is ArgumentException || exception is InvalidOperationException)
            {
                throw new FormatException("Local matter domain pose or sample payload is invalid.", exception);
            }
        }

        private static Address ToAddress(MatterInt3 value)
            => new Address { x = value.X, y = value.Y, z = value.Z };

        private static MatterInt3 ToInt3(Address value) => new MatterInt3(value.x, value.y, value.z);
    }
}
