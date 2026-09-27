using System;
using System.Collections.Generic;
using UnityEngine;

namespace Wildkin.Matter.Unity
{
    /// <summary>
    /// Provisional qualification JSON. This is not the production save schema.
    /// </summary>
    public static class MatterWorldSaveCodec
    {
        private const int SchemaVersion = 1;

        [Serializable]
        private sealed class SaveDocument
        {
            public int schemaVersion;
            public int brickCellSize;
            public int sourceSeed;
            public int sourceVersion;
            public float sampleSpacingMeters;
            public long worldRevision;
            public SaveEdit[] edits;
        }

        [Serializable]
        private struct SaveEdit
        {
            public int x;
            public int y;
            public int z;
            public float density;
            public byte material;
        }

        public static string Write(MatterWorld world)
        {
            if (world == null) throw new ArgumentNullException(nameof(world));
            MatterSparseEdit[] edits = world.GetSparseEditsSorted();
            var records = new SaveEdit[edits.Length];
            for (int index = 0; index < edits.Length; index++)
            {
                MatterSparseEdit edit = edits[index];
                records[index] = new SaveEdit
                {
                    x = edit.Address.X,
                    y = edit.Address.Y,
                    z = edit.Address.Z,
                    density = edit.Sample.Density,
                    material = (byte)edit.Sample.Material
                };
            }

            var document = new SaveDocument
            {
                schemaVersion = SchemaVersion,
                brickCellSize = MatterBrickLayout.CellSize,
                sourceSeed = world.SourceSeed,
                sourceVersion = world.SourceVersion,
                sampleSpacingMeters = world.SampleSpacingMeters,
                worldRevision = world.Revision,
                edits = records
            };
            return JsonUtility.ToJson(document, true);
        }

        public static MatterWorld Read(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
                throw new ArgumentException("Qualification save JSON is empty.", nameof(json));

            SaveDocument document;
            try
            {
                document = JsonUtility.FromJson<SaveDocument>(json);
            }
            catch (Exception exception)
            {
                throw new FormatException("Qualification save JSON could not be parsed.", exception);
            }

            if (document == null || document.schemaVersion != SchemaVersion)
                throw new FormatException("Unsupported or missing qualification save schema version.");
            if (document.brickCellSize != MatterBrickLayout.CellSize)
                throw new FormatException("Qualification save brick layout does not match this kernel.");
            if (document.edits == null)
                throw new FormatException("Qualification save is missing its sparse edits array.");
            if (document.worldRevision < 0 || document.worldRevision < document.edits.Length)
                throw new FormatException("Qualification save revision is invalid.");
            if (float.IsNaN(document.sampleSpacingMeters) ||
                float.IsInfinity(document.sampleSpacingMeters) ||
                document.sampleSpacingMeters <= 0f)
                throw new FormatException("Qualification save sample spacing is invalid.");

            var edits = new List<MatterSparseEdit>(document.edits.Length);
            for (int index = 0; index < document.edits.Length; index++)
            {
                SaveEdit record = document.edits[index];
                if (!MatterMaterialRegistry.TryGet(record.material, out _))
                    throw new FormatException("Qualification save contains an unknown material id.");

                MatterSample sample;
                try
                {
                    sample = new MatterSample(record.density, (MatterMaterialId)record.material);
                }
                catch (ArgumentException exception)
                {
                    throw new FormatException("Qualification save contains an invalid resolved sample.", exception);
                }

                edits.Add(new MatterSparseEdit(
                    new MatterSampleAddress(record.x, record.y, record.z), sample));
            }

            try
            {
                return MatterWorldFactory.RestoreQualificationWorld(
                    document.sourceSeed,
                    document.sourceVersion,
                    document.sampleSpacingMeters,
                    document.worldRevision,
                    edits);
            }
            catch (Exception exception) when (
                exception is ArgumentException || exception is InvalidOperationException)
            {
                throw new FormatException("Qualification save sparse state is invalid.", exception);
            }
        }
    }
}
