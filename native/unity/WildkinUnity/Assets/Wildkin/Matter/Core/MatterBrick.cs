using System;

namespace Wildkin.Matter
{
    /// <summary>
    /// Dense derived source samples for one unique half-open brick address.
    /// A brick is a data/render partition and owns no physics objects.
    /// </summary>
    public sealed class MatterBrick
    {
        private readonly float[] _densities;
        private readonly byte[] _materials;

        public MatterBrickAddress Address { get; }
        public long DirtyRevision { get; private set; }
        public int SampleCount => _densities.Length;
        public int RawPayloadBytes => MatterBrickLayout.RawBytesPerBrick;

        internal MatterBrick(
            MatterBrickAddress address, MatterSourceComposer source, int worldSeed, float sampleSpacingMeters)
        {
            Address = address;
            _densities = new float[MatterBrickLayout.SamplesPerBrick];
            _materials = new byte[MatterBrickLayout.SamplesPerBrick];

            int originX = checked(address.X * MatterBrickLayout.CellSize);
            int originY = checked(address.Y * MatterBrickLayout.CellSize);
            int originZ = checked(address.Z * MatterBrickLayout.CellSize);
            for (int z = 0; z < MatterBrickLayout.SamplesPerAxis; z++)
            for (int y = 0; y < MatterBrickLayout.SamplesPerAxis; y++)
            for (int x = 0; x < MatterBrickLayout.SamplesPerAxis; x++)
            {
                int index = Index(x, y, z);
                var global = new MatterSampleAddress(originX + x, originY + y, originZ + z);
                MatterSample sample = source.Sample(global, worldSeed, sampleSpacingMeters);
                _densities[index] = sample.Density;
                _materials[index] = (byte)sample.Material;
            }
        }

        public MatterSample Read(MatterLocalAddress localAddress)
        {
            int index = Index(localAddress.X, localAddress.Y, localAddress.Z);
            return new MatterSample(_densities[index], (MatterMaterialId)_materials[index]);
        }

        public ReadOnlySpan<float> Densities => _densities;
        public ReadOnlySpan<byte> Materials => _materials;

        internal void MarkDirty(long revision)
        {
            if (revision < DirtyRevision) throw new ArgumentOutOfRangeException(nameof(revision));
            DirtyRevision = revision;
        }

        internal static int Index(int x, int y, int z)
            => x + MatterBrickLayout.SamplesPerAxis * (y + MatterBrickLayout.SamplesPerAxis * z);
    }
}
