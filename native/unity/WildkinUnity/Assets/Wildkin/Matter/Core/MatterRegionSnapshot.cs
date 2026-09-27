using System;

namespace Wildkin.Matter
{
    /// <summary>
    /// A bounded, contiguous copy of resolved matter. Local indexing starts at the global origin
    /// and is independent of which world bricks supplied those samples.
    /// </summary>
    public sealed class MatterRegionSnapshot
    {
        private readonly float[] _densities;
        private readonly byte[] _materials;

        public MatterBounds Bounds { get; }
        public MatterInt3 Origin => Bounds.MinInclusive;
        public MatterInt3 Dimensions => Bounds.Size;
        public int SampleCount => _densities.Length;
        public int SourceSeed { get; }
        public int SourceVersion { get; }
        public float SampleSpacingMeters { get; }
        public long SourceRevision { get; }
        public ReadOnlySpan<float> Densities => _densities;
        public ReadOnlySpan<byte> Materials => _materials;

        private MatterRegionSnapshot(MatterWorld world, MatterBounds bounds)
        {
            Bounds = bounds;
            SourceSeed = world.SourceSeed;
            SourceVersion = world.SourceVersion;
            SampleSpacingMeters = world.SampleSpacingMeters;
            SourceRevision = world.Revision;

            MatterInt3 dimensions = bounds.Size;
            int count = checked(checked(dimensions.X * dimensions.Y) * dimensions.Z);
            if (count > 16 * 1024 * 1024)
                throw new ArgumentOutOfRangeException(nameof(bounds), "Qualification snapshots are capped at 16 million samples.");
            _densities = new float[count];
            _materials = new byte[count];

            for (int z = 0; z < dimensions.Z; z++)
            for (int y = 0; y < dimensions.Y; y++)
            for (int x = 0; x < dimensions.X; x++)
            {
                MatterSample sample = world.ReadSample(AddressFromLocal(new MatterInt3(x, y, z)));
                int index = Index(x, y, z, dimensions);
                _densities[index] = sample.Density;
                _materials[index] = (byte)sample.Material;
            }
        }

        public static MatterRegionSnapshot Capture(MatterWorld world, MatterBounds bounds)
        {
            if (world == null) throw new ArgumentNullException(nameof(world));
            return new MatterRegionSnapshot(world, bounds);
        }

        public MatterSample GetLocal(MatterInt3 local)
        {
            MatterInt3 dimensions = Dimensions;
            if (!Bounds.ContainsLocal(local, dimensions))
                throw new ArgumentOutOfRangeException(nameof(local));
            int index = Index(local.X, local.Y, local.Z, dimensions);
            return new MatterSample(_densities[index], (MatterMaterialId)_materials[index]);
        }

        public bool TrySetLocal(MatterInt3 local, MatterSample sample)
        {
            MatterInt3 dimensions = Dimensions;
            if (!Bounds.ContainsLocal(local, dimensions)) return false;
            int index = Index(local.X, local.Y, local.Z, dimensions);
            _densities[index] = sample.Density;
            _materials[index] = (byte)sample.Material;
            return true;
        }

        public MatterSampleAddress AddressFromLocal(MatterInt3 local)
        {
            if (!Bounds.ContainsLocal(local, Dimensions))
                throw new ArgumentOutOfRangeException(nameof(local));
            return new MatterSampleAddress(Origin + local);
        }

        public bool TryLocalFromAddress(MatterSampleAddress address, out MatterInt3 local)
        {
            if (!Bounds.Contains(address))
            {
                local = default;
                return false;
            }
            local = address.Coordinates - Origin;
            return true;
        }

        public bool TryWriteBackSample(
            MatterWorld world, MatterSampleAddress address, MatterSample sample)
        {
            if (world == null) throw new ArgumentNullException(nameof(world));
            if (!IsCompatible(world) || !Bounds.Contains(address)) return false;
            return world.SetSample(address, sample);
        }

        public int WriteBack(MatterWorld world)
        {
            if (world == null) throw new ArgumentNullException(nameof(world));
            if (!IsCompatible(world))
                throw new ArgumentException("Snapshot and world source settings do not match.", nameof(world));

            int acceptedEdits = 0;
            MatterInt3 dimensions = Dimensions;
            for (int z = 0; z < dimensions.Z; z++)
            for (int y = 0; y < dimensions.Y; y++)
            for (int x = 0; x < dimensions.X; x++)
            {
                int index = Index(x, y, z, dimensions);
                var sample = new MatterSample(_densities[index], (MatterMaterialId)_materials[index]);
                if (world.SetSample(AddressFromLocal(new MatterInt3(x, y, z)), sample))
                    acceptedEdits++;
            }
            return acceptedEdits;
        }

        private bool IsCompatible(MatterWorld world)
            => world.SourceSeed == SourceSeed &&
               world.SourceVersion == SourceVersion &&
               world.SampleSpacingMeters.Equals(SampleSpacingMeters);

        private static int Index(int x, int y, int z, MatterInt3 dimensions)
            => x + dimensions.X * (y + dimensions.Y * z);
    }
}
