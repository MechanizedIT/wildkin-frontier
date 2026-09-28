using System;
using System.Collections.Generic;

namespace Wildkin.Matter
{
    /// <summary>
    /// Rigid pose for a local matter domain. Matter coordinates remain in the domain's local
    /// metric frame; changing this pose never changes sample identity or content revision.
    /// </summary>
    public readonly struct MatterDomainPose
    {
        public MatterFloat3 PositionMeters { get; }
        public float RotationX { get; }
        public float RotationY { get; }
        public float RotationZ { get; }
        public float RotationW { get; }
        public bool IsValid
        {
            get
            {
                double lengthSquared = (double)RotationX * RotationX + (double)RotationY * RotationY +
                    (double)RotationZ * RotationZ + (double)RotationW * RotationW;
                return Finite(PositionMeters.X) && Finite(PositionMeters.Y) && Finite(PositionMeters.Z) &&
                    Finite(RotationX) && Finite(RotationY) && Finite(RotationZ) && Finite(RotationW) &&
                    Math.Abs(lengthSquared - 1d) <= 1e-5d;
            }
        }

        public static MatterDomainPose Identity => new MatterDomainPose(default, 0f, 0f, 0f, 1f);

        public MatterDomainPose(MatterFloat3 positionMeters, float rotationX, float rotationY,
            float rotationZ, float rotationW)
        {
            if (!Finite(positionMeters.X) || !Finite(positionMeters.Y) || !Finite(positionMeters.Z))
                throw new ArgumentOutOfRangeException(nameof(positionMeters));
            if (!Finite(rotationX) || !Finite(rotationY) || !Finite(rotationZ) || !Finite(rotationW))
                throw new ArgumentOutOfRangeException(nameof(rotationW));
            double lengthSquared = (double)rotationX * rotationX + (double)rotationY * rotationY +
                (double)rotationZ * rotationZ + (double)rotationW * rotationW;
            if (lengthSquared < 1e-12d)
                throw new ArgumentOutOfRangeException(nameof(rotationW), "A domain rotation must be nonzero.");
            if (Math.Abs(lengthSquared - 1d) > 1e-6d)
            {
                double inverseLength = 1d / Math.Sqrt(lengthSquared);
                rotationX = (float)(rotationX * inverseLength);
                rotationY = (float)(rotationY * inverseLength);
                rotationZ = (float)(rotationZ * inverseLength);
                rotationW = (float)(rotationW * inverseLength);
            }
            if (rotationW < 0f)
            {
                rotationX = -rotationX; rotationY = -rotationY;
                rotationZ = -rotationZ; rotationW = -rotationW;
            }
            PositionMeters = positionMeters;
            RotationX = rotationX; RotationY = rotationY; RotationZ = rotationZ; RotationW = rotationW;
        }

        public MatterFloat3 TransformPoint(MatterFloat3 localMeters)
        {
            MatterFloat3 rotated = Rotate(localMeters, RotationX, RotationY, RotationZ, RotationW);
            return new MatterFloat3(PositionMeters.X + rotated.X,
                PositionMeters.Y + rotated.Y, PositionMeters.Z + rotated.Z);
        }

        public MatterFloat3 InverseTransformPoint(MatterFloat3 worldMeters)
        {
            var translated = new MatterFloat3(worldMeters.X - PositionMeters.X,
                worldMeters.Y - PositionMeters.Y, worldMeters.Z - PositionMeters.Z);
            return Rotate(translated, -RotationX, -RotationY, -RotationZ, RotationW);
        }

        private static MatterFloat3 Rotate(MatterFloat3 value, float qx, float qy, float qz, float qw)
        {
            // q*v*q^-1, expanded without temporary quaternion allocations.
            float tx = 2f * (qy * value.Z - qz * value.Y);
            float ty = 2f * (qz * value.X - qx * value.Z);
            float tz = 2f * (qx * value.Y - qy * value.X);
            return new MatterFloat3(
                value.X + qw * tx + qy * tz - qz * ty,
                value.Y + qw * ty + qz * tx - qx * tz,
                value.Z + qw * tz + qx * ty - qy * tx);
        }

        private static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
    }

    public sealed class MatterDomainEditResult
    {
        private readonly MatterSampleAddress[] _changedSamples;
        public bool Changed => _changedSamples.Length != 0;
        public int ChangedSampleCount => _changedSamples.Length;
        public int SamplesExamined { get; }
        public IReadOnlyList<MatterSampleAddress> ChangedSamples => Array.AsReadOnly(_changedSamples);

        internal MatterDomainEditResult(List<MatterSampleAddress> changedSamples, int samplesExamined)
        {
            _changedSamples = changedSamples.ToArray();
            SamplesExamined = samplesExamined;
        }
    }

    /// <summary>
    /// One bounded, editable and source-independent local matter authority. Addresses are integer
    /// coordinates in this domain, and local meters are address * this domain's spacing.
    /// </summary>
    public sealed class MatterDomain : IMatterReadOnlyGrid
    {
        private const int MaximumSampleCount = 2 * 1024 * 1024;
        private readonly float[] _densities;
        private readonly byte[] _materials;
        private readonly object _publicationIdentity = new object();

        public string Id { get; }
        public MatterBounds SampleBounds { get; }
        public float SampleSpacingMeters { get; }
        public MatterDomainPose Pose { get; private set; }
        public int SampleCount => _densities.Length;
        public int OccupiedCount { get; private set; }
        public long RawPayloadBytes => SampleCount * MatterBrickLayout.RawBytesPerSample;
        public long ContentRevision { get; private set; }
        public long MeshRevision { get; private set; }
        public long MeshContentRevision { get; private set; } = -1;
        public ulong PublishedMeshHash { get; private set; }
        internal object PublicationIdentity => _publicationIdentity;

        private MatterDomain(string id, MatterBounds sampleBounds, float spacing,
            float[] densities, byte[] materials, long contentRevision, MatterDomainPose pose)
        {
            ValidateId(id);
            ValidateSpacing(spacing);
            if (densities == null || materials == null || densities.Length != materials.Length)
                throw new ArgumentException("A domain requires matching dense density and material arrays.");
            if (contentRevision < 0) throw new ArgumentOutOfRangeException(nameof(contentRevision));
            int expectedCount = GetSampleCount(sampleBounds);
            if (expectedCount > MaximumSampleCount)
                throw new ArgumentOutOfRangeException(nameof(sampleBounds), "A local domain is capped at two million samples.");
            if (densities.Length != expectedCount)
                throw new ArgumentException("The sample payload does not match the declared domain bounds.");
            if (!pose.IsValid)
                throw new ArgumentException("A matter domain requires a normalized finite pose.", nameof(pose));

            Id = id;
            SampleBounds = sampleBounds;
            SampleSpacingMeters = spacing;
            Pose = pose;
            ContentRevision = contentRevision;
            _densities = (float[])densities.Clone();
            _materials = (byte[])materials.Clone();
            for (int index = 0; index < _densities.Length; index++)
            {
                var sample = new MatterSample(_densities[index], (MatterMaterialId)_materials[index]);
                if (sample.IsSolid) OccupiedCount++;
            }
        }

        /// <summary>Copies a bounded grid into independent domain-owned arrays; the grid is not retained.</summary>
        public static MatterDomain Bake(string id, MatterBounds sampleBounds, float spacing,
            IMatterReadOnlyGrid sourceGrid, MatterDomainPose pose)
        {
            if (sourceGrid == null) throw new ArgumentNullException(nameof(sourceGrid));
            ValidateSpacing(spacing);
            if (!spacing.Equals(sourceGrid.SampleSpacingMeters))
                throw new ArgumentException("The source grid spacing must match the new domain spacing.", nameof(sourceGrid));
            int count = GetSampleCount(sampleBounds);
            if (count > MaximumSampleCount)
                throw new ArgumentOutOfRangeException(nameof(sampleBounds), "A local domain is capped at two million samples.");
            var densities = new float[count];
            var materials = new byte[count];
            MatterInt3 size = sampleBounds.Size;
            int cursor = 0;
            for (int z = 0; z < size.Z; z++)
            for (int y = 0; y < size.Y; y++)
            for (int x = 0; x < size.X; x++)
            {
                MatterInt3 address = sampleBounds.MinInclusive + new MatterInt3(x, y, z);
                MatterSample sample = sourceGrid.ReadSample(new MatterSampleAddress(address));
                densities[cursor] = sample.Density;
                materials[cursor] = (byte)sample.Material;
                cursor++;
            }
            return new MatterDomain(id, sampleBounds, spacing, densities, materials, 0, pose);
        }

        /// <summary>Restores a source-free snapshot. Arrays are copied and every sample is validated.</summary>
        public static MatterDomain Restore(string id, MatterBounds sampleBounds, float spacing,
            float[] densities, byte[] materials, long contentRevision, MatterDomainPose pose)
            => new MatterDomain(id, sampleBounds, spacing, densities, materials, contentRevision, pose);

        public MatterSample ReadSample(MatterSampleAddress address)
        {
            if (!SampleBounds.Contains(address)) return MatterSample.Air(-SampleSpacingMeters);
            int index = Index(address.Coordinates - SampleBounds.MinInclusive, SampleBounds.Size);
            return new MatterSample(_densities[index], (MatterMaterialId)_materials[index]);
        }

        public MatterFloat3 LocalSampleToMeters(MatterSampleAddress address)
            => new MatterFloat3(address.X * SampleSpacingMeters,
                address.Y * SampleSpacingMeters, address.Z * SampleSpacingMeters);

        public MatterFloat3 LocalSampleToWorld(MatterSampleAddress address)
            => Pose.TransformPoint(LocalSampleToMeters(address));

        public MatterSampleAddress LocalMetersToFloorSample(MatterFloat3 localMeters)
            => new MatterSampleAddress(FloorToInt(localMeters.X / SampleSpacingMeters),
                FloorToInt(localMeters.Y / SampleSpacingMeters), FloorToInt(localMeters.Z / SampleSpacingMeters));

        public MatterSampleAddress LocalMetersToNearestSample(MatterFloat3 localMeters)
            => new MatterSampleAddress(RoundToInt(localMeters.X / SampleSpacingMeters),
                RoundToInt(localMeters.Y / SampleSpacingMeters), RoundToInt(localMeters.Z / SampleSpacingMeters));

        public MatterSampleAddress WorldToNearestSample(MatterFloat3 worldMeters)
            => LocalMetersToNearestSample(Pose.InverseTransformPoint(worldMeters));

        public bool TrySampleWorldPoint(MatterFloat3 worldMeters, out MatterSample sample,
            out MatterSampleAddress localAddress)
        {
            localAddress = WorldToNearestSample(worldMeters);
            if (!SampleBounds.Contains(localAddress))
            {
                sample = default;
                return false;
            }
            sample = ReadSample(localAddress);
            return true;
        }

        /// <summary>Removes a sphere using positive-solid SDF subtraction: min(old, distanceToCenter - radius).</summary>
        public MatterDomainEditResult RemoveSphereLocal(MatterFloat3 centerMeters, float radiusMeters)
            => RemoveSphereInLocalSpace(centerMeters, radiusMeters);

        public MatterDomainEditResult RemoveSphereWorld(MatterFloat3 worldCenterMeters, float radiusMeters)
            => RemoveSphereInLocalSpace(Pose.InverseTransformPoint(worldCenterMeters), radiusMeters);

        public void SetPose(MatterDomainPose pose)
        {
            if (!pose.IsValid) throw new ArgumentException("A matter domain requires a normalized finite pose.", nameof(pose));
            Pose = pose;
        }

        /// <summary>
        /// Accepts only a mesh built from the current content revision. A stale staged result leaves
        /// the published mesh revision/hash unchanged, making a later asynchronous mesher safe to add.
        /// </summary>
        public bool TryPublishMesh(long expectedContentRevision, ulong meshHash)
        {
            if (expectedContentRevision != ContentRevision) return false;
            MeshRevision = checked(MeshRevision + 1);
            MeshContentRevision = expectedContentRevision;
            PublishedMeshHash = meshHash;
            return true;
        }

        public float[] CopyDensitySamples() => (float[])_densities.Clone();
        public byte[] CopyMaterialSamples() => (byte[])_materials.Clone();

        public ulong ComputeContentHash()
        {
            const ulong offset = 14695981039346656037UL;
            const ulong prime = 1099511628211UL;
            ulong hash = offset;
            MatterInt3 size = SampleBounds.Size;
            HashInt(ref hash, size.X, prime); HashInt(ref hash, size.Y, prime); HashInt(ref hash, size.Z, prime);
            HashInt(ref hash, SampleBounds.MinInclusive.X, prime);
            HashInt(ref hash, SampleBounds.MinInclusive.Y, prime);
            HashInt(ref hash, SampleBounds.MinInclusive.Z, prime);
            HashUInt(ref hash, FloatBits(SampleSpacingMeters), prime);
            for (int index = 0; index < _densities.Length; index++)
            {
                HashUInt(ref hash, FloatBits(_densities[index]), prime);
                HashByte(ref hash, _materials[index], prime);
            }
            return hash;
        }

        private MatterDomainEditResult RemoveSphereInLocalSpace(MatterFloat3 centerMeters, float radiusMeters)
        {
            if (!Finite(centerMeters.X) || !Finite(centerMeters.Y) || !Finite(centerMeters.Z))
                throw new ArgumentOutOfRangeException(nameof(centerMeters));
            if (!Finite(radiusMeters) || radiusMeters <= 0f)
                throw new ArgumentOutOfRangeException(nameof(radiusMeters));

            // Two samples beyond the cut surface retain a signed exterior band for the new contour.
            double reach = radiusMeters + 2d * SampleSpacingMeters;
            if (!TrySampleRange(centerMeters.X, reach, SampleBounds.MinInclusive.X, SampleBounds.MaxExclusive.X - 1,
                    out int minX, out int maxX) ||
                !TrySampleRange(centerMeters.Y, reach, SampleBounds.MinInclusive.Y, SampleBounds.MaxExclusive.Y - 1,
                    out int minY, out int maxY) ||
                !TrySampleRange(centerMeters.Z, reach, SampleBounds.MinInclusive.Z, SampleBounds.MaxExclusive.Z - 1,
                    out int minZ, out int maxZ))
                return new MatterDomainEditResult(new List<MatterSampleAddress>(), 0);
            var changed = new List<MatterSampleAddress>();
            int examined = 0;
            MatterInt3 size = SampleBounds.Size;
            for (int z = minZ; z <= maxZ; z++)
            for (int y = minY; y <= maxY; y++)
            for (int x = minX; x <= maxX; x++)
            {
                examined++;
                var address = new MatterSampleAddress(x, y, z);
                MatterFloat3 localMeters = LocalSampleToMeters(address);
                double dx = localMeters.X - centerMeters.X;
                double dy = localMeters.Y - centerMeters.Y;
                double dz = localMeters.Z - centerMeters.Z;
                float cutDensity = (float)(Math.Sqrt(dx * dx + dy * dy + dz * dz) - radiusMeters);
                int index = Index(address.Coordinates - SampleBounds.MinInclusive, size);
                float oldDensity = _densities[index];
                float newDensity = Math.Min(oldDensity, cutDensity);
                if (newDensity.Equals(oldDensity)) continue;
                var oldSample = new MatterSample(oldDensity, (MatterMaterialId)_materials[index]);
                MatterMaterialId material = newDensity > 0f
                    ? (oldSample.IsSolid ? oldSample.Material : MatterMaterialId.Rock)
                    : MatterMaterialId.Air;
                // Constructing the value verifies the positive-solid/non-positive-air invariant.
                var updated = new MatterSample(newDensity, material);
                _densities[index] = updated.Density;
                _materials[index] = (byte)updated.Material;
                if (oldSample.IsSolid && !updated.IsSolid) OccupiedCount--;
                else if (!oldSample.IsSolid && updated.IsSolid) OccupiedCount++;
                changed.Add(address);
            }

            if (changed.Count != 0) ContentRevision = checked(ContentRevision + 1);
            return new MatterDomainEditResult(changed, examined);
        }

        private static int GetSampleCount(MatterBounds bounds)
        {
            MatterInt3 size = bounds.Size;
            return checked(checked(size.X * size.Y) * size.Z);
        }

        private static int Index(MatterInt3 local, MatterInt3 size)
            => local.X + size.X * (local.Y + size.Y * local.Z);

        private static void ValidateId(string id)
        {
            if (string.IsNullOrWhiteSpace(id) || id.Length > 128)
                throw new ArgumentException("A matter domain needs a stable non-empty ID of at most 128 characters.", nameof(id));
        }

        private static void ValidateSpacing(float spacing)
        {
            if (!Finite(spacing) || spacing <= 0f)
                throw new ArgumentOutOfRangeException(nameof(spacing), "Domain spacing must be finite and positive.");
        }

        private static int FloorToInt(float value)
        {
            if (!Finite(value) || value < int.MinValue || value > int.MaxValue)
                throw new ArgumentOutOfRangeException(nameof(value));
            return (int)Math.Floor(value);
        }

        private static int CeilingToInt(float value)
        {
            if (!Finite(value) || value < int.MinValue || value > int.MaxValue)
                throw new ArgumentOutOfRangeException(nameof(value));
            return (int)Math.Ceiling(value);
        }

        private static int RoundToInt(float value)
        {
            if (!Finite(value) || value < int.MinValue || value > int.MaxValue)
                throw new ArgumentOutOfRangeException(nameof(value));
            return (int)Math.Round(value, MidpointRounding.AwayFromZero);
        }

        private bool TrySampleRange(float centerMeters, double reachMeters, int boundsMin, int boundsMax,
            out int minAddress, out int maxAddress)
        {
            double spacing = SampleSpacingMeters;
            double low = ((double)centerMeters - reachMeters) / spacing;
            double high = ((double)centerMeters + reachMeters) / spacing;
            if (high < boundsMin || low > boundsMax)
            {
                minAddress = maxAddress = 0;
                return false;
            }
            minAddress = (int)Math.Max(boundsMin, Math.Floor(low));
            maxAddress = (int)Math.Min(boundsMax, Math.Ceiling(high));
            return minAddress <= maxAddress;
        }

        private static uint FloatBits(float value)
            => new FloatUInt { Float = value }.UInt;

        private static void HashInt(ref ulong hash, int value, ulong prime)
            => HashUInt(ref hash, unchecked((uint)value), prime);

        private static void HashUInt(ref ulong hash, uint value, ulong prime)
        {
            HashByte(ref hash, (byte)value, prime); HashByte(ref hash, (byte)(value >> 8), prime);
            HashByte(ref hash, (byte)(value >> 16), prime); HashByte(ref hash, (byte)(value >> 24), prime);
        }

        private static void HashByte(ref ulong hash, byte value, ulong prime)
        {
            unchecked { hash = (hash ^ value) * prime; }
        }

        private static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);

        [System.Runtime.InteropServices.StructLayout(System.Runtime.InteropServices.LayoutKind.Explicit)]
        private struct FloatUInt
        {
            [System.Runtime.InteropServices.FieldOffset(0)] public float Float;
            [System.Runtime.InteropServices.FieldOffset(0)] public uint UInt;
        }
    }

    /// <summary>Per-scene collection; IDs are unique within this owner and never stored globally.</summary>
    public sealed class MatterDomainCollection
    {
        private readonly Dictionary<string, MatterDomain> _domains = new Dictionary<string, MatterDomain>(StringComparer.Ordinal);
        public int Count => _domains.Count;

        public void Add(MatterDomain domain)
        {
            if (domain == null) throw new ArgumentNullException(nameof(domain));
            if (_domains.ContainsKey(domain.Id))
                throw new ArgumentException("A domain with ID '" + domain.Id + "' is already registered.", nameof(domain));
            _domains.Add(domain.Id, domain);
        }

        public bool TryGet(string id, out MatterDomain domain)
            => _domains.TryGetValue(id, out domain);

        public MatterDomain GetRequired(string id)
        {
            if (!_domains.TryGetValue(id, out MatterDomain domain))
                throw new KeyNotFoundException("No matter domain is registered with ID '" + id + "'.");
            return domain;
        }

        public MatterDomain[] GetAllSorted()
        {
            var result = new MatterDomain[_domains.Count];
            _domains.Values.CopyTo(result, 0);
            Array.Sort(result, (left, right) => string.CompareOrdinal(left.Id, right.Id));
            return result;
        }

        public bool Remove(string id) => _domains.Remove(id);
    }
}
