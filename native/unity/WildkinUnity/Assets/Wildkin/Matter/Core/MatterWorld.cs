using System;
using System.Collections.Generic;

namespace Wildkin.Matter
{
    public readonly struct MatterSparseEdit
    {
        public readonly MatterSampleAddress Address;
        public readonly MatterSample Sample;
        public MatterSparseEdit(MatterSampleAddress address, MatterSample sample)
        {
            Address = address;
            Sample = sample;
        }
    }

    /// <summary>
    /// One deterministic sample authority with lazily materialized source bricks and a sparse global edit layer.
    /// A brick stores only its unique half-open samples; mesher corner/halo reads come from neighboring owners.
    /// </summary>
    public sealed class MatterWorld
    {
        private readonly IMatterSampleSource _source;
        private readonly Dictionary<MatterBrickAddress, MatterBrick> _bricks =
            new Dictionary<MatterBrickAddress, MatterBrick>();
        private readonly Dictionary<MatterSampleAddress, MatterSample> _edits =
            new Dictionary<MatterSampleAddress, MatterSample>();

        public int SourceSeed { get; }
        public int SourceVersion => _source.SourceVersion;
        public float SampleSpacingMeters { get; }
        public long Revision { get; private set; }
        public int EditCount => _edits.Count;
        public int MaterializedBrickCount => _bricks.Count;
        public int BytesPerBrick => MatterBrickLayout.RawBytesPerBrick;

        public MatterWorld(int sourceSeed, float sampleSpacingMeters, IMatterSampleSource source)
        {
            if (float.IsNaN(sampleSpacingMeters) || float.IsInfinity(sampleSpacingMeters) ||
                sampleSpacingMeters <= 0f)
                throw new ArgumentOutOfRangeException(nameof(sampleSpacingMeters));
            _source = source ?? throw new ArgumentNullException(nameof(source));
            SourceSeed = sourceSeed;
            SampleSpacingMeters = sampleSpacingMeters;
        }

        public MatterSample ReadSample(MatterSampleAddress address)
        {
            if (_edits.TryGetValue(address, out MatterSample edited))
                return edited;
            MatterBrickLayout.Resolve(address, out MatterBrickAddress brickAddress, out MatterLocalAddress localAddress);
            return GetOrCreateBrick(brickAddress).Read(localAddress);
        }

        public MatterSample EvaluateSourceDirect(MatterSampleAddress address)
            => _source.Sample(address, SourceSeed, SampleSpacingMeters);

        public bool Remove(MatterSampleAddress address)
        {
            MatterSample current = ReadSample(address);
            if (!current.IsSolid) return false;
            return SetSample(address, MatterSample.Air(-Math.Abs(current.Density)));
        }

        public bool SetMaterial(MatterSampleAddress address, MatterMaterialId material)
        {
            if (!MatterMaterialRegistry.IsValidSolidMaterial(material))
                throw new ArgumentOutOfRangeException(nameof(material), "Material edits require a registered solid material.");
            MatterSample current = ReadSample(address);
            if (!current.IsSolid) return false;
            return SetSample(address, new MatterSample(current.Density, material));
        }

        public bool SetSample(MatterSampleAddress address, MatterSample sample)
        {
            MatterSample current = ReadSample(address);
            if (current == sample) return false;

            long nextRevision = checked(Revision + 1);
            MatterSample generated = EvaluateSourceDirect(address);
            if (sample == generated)
                _edits.Remove(address);
            else
                _edits[address] = sample;

            Revision = nextRevision;
            MatterBrickLayout.Resolve(address, out MatterBrickAddress brickAddress, out _);
            GetOrCreateBrick(brickAddress).MarkDirty(Revision);
            return true;
        }

        public MatterSparseEdit[] GetSparseEditsSorted()
        {
            var records = new MatterSparseEdit[_edits.Count];
            int index = 0;
            foreach (KeyValuePair<MatterSampleAddress, MatterSample> edit in _edits)
                records[index++] = new MatterSparseEdit(edit.Key, edit.Value);
            Array.Sort(records, (left, right) => left.Address.CompareTo(right.Address));
            return records;
        }

        public void RestoreSparseState(IReadOnlyList<MatterSparseEdit> edits, long revision)
        {
            if (edits == null) throw new ArgumentNullException(nameof(edits));
            if (revision < edits.Count)
                throw new ArgumentOutOfRangeException(nameof(revision), "Revision cannot be less than the number of accepted edits.");
            if (_edits.Count != 0 || Revision != 0)
                throw new InvalidOperationException("Sparse state can only be restored into a new matter world.");

            for (int index = 0; index < edits.Count; index++)
            {
                MatterSparseEdit edit = edits[index];
                if (edit.Sample == EvaluateSourceDirect(edit.Address))
                    throw new ArgumentException("Sparse save contains an edit equal to its procedural source.", nameof(edits));
                if (_edits.ContainsKey(edit.Address))
                    throw new ArgumentException("Sparse save contains duplicate global sample addresses.", nameof(edits));
                MatterBrickLayout.Resolve(edit.Address, out MatterBrickAddress brickAddress, out _);
                _edits.Add(edit.Address, edit.Sample);
                GetOrCreateBrick(brickAddress).MarkDirty(revision);
            }
            Revision = revision;
        }

        private MatterBrick GetOrCreateBrick(MatterBrickAddress address)
        {
            if (_bricks.TryGetValue(address, out MatterBrick brick))
                return brick;
            brick = new MatterBrick(address, _source, SourceSeed, SampleSpacingMeters);
            _bricks.Add(address, brick);
            return brick;
        }
    }

    public static class MatterWorldFactory
    {
        public const int QualificationSourceVersion = 1;
        public const int DefaultSourceSeed = 20260926;
        public const float DefaultSampleSpacingMeters = 0.5f;

        public static MatterWorld CreateQualificationWorld(
            int sourceSeed = DefaultSourceSeed, float sampleSpacingMeters = DefaultSampleSpacingMeters)
        {
            var sources = new MatterSourceComposer(
                QualificationSourceVersion,
                MatterSourceLayer.DirtPlane(0f, 0.08f, 31),
                MatterSourceLayer.SolidEllipsoid(
                    MatterMaterialId.Rock, new MatterFloat3(0f, -0.6f, 0f),
                    new MatterFloat3(1.4f, 1.0f, 1.35f)),
                MatterSourceLayer.AirCutEllipsoid(
                    new MatterFloat3(0.55f, -0.15f, 0.05f),
                    new MatterFloat3(0.35f, 0.65f, 0.48f)));
            return new MatterWorld(sourceSeed, sampleSpacingMeters, sources);
        }

        public static MatterWorld RestoreQualificationWorld(
            int sourceSeed, int sourceVersion, float sampleSpacingMeters,
            long revision, IReadOnlyList<MatterSparseEdit> edits)
        {
            if (sourceVersion != QualificationSourceVersion)
                throw new ArgumentOutOfRangeException(nameof(sourceVersion), "Unsupported procedural source version.");
            MatterWorld world = CreateQualificationWorld(sourceSeed, sampleSpacingMeters);
            world.RestoreSparseState(edits, revision);
            return world;
        }
    }
}
