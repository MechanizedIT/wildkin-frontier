using System;
using System.Runtime.InteropServices;

namespace Wildkin.Matter
{
    public enum MatterSourceOperation : byte { AddSolid = 0, Subtract = 1 }
    public enum MatterSourceShape : byte { HorizontalPlane = 0, Ellipsoid = 1 }

    /// <summary>Engine-light source contract used by MatterWorld to resolve globally owned samples.</summary>
    public interface IMatterSampleSource
    {
        int SourceVersion { get; }
        MatterSample Sample(MatterSampleAddress address, int worldSeed, float sampleSpacingMeters);
    }

    /// <summary>Empty deterministic baseline for resolved formations and saved sparse worlds.</summary>
    public sealed class MatterAirSource : IMatterSampleSource
    {
        public int SourceVersion { get; }
        public MatterAirSource(int sourceVersion = 2)
        {
            if (sourceVersion <= 0) throw new ArgumentOutOfRangeException(nameof(sourceVersion));
            SourceVersion = sourceVersion;
        }
        public MatterSample Sample(MatterSampleAddress address, int worldSeed, float sampleSpacingMeters)
            => MatterSample.Air(-sampleSpacingMeters);
    }

    [StructLayout(LayoutKind.Sequential)]
    public readonly struct MatterSourceLayer
    {
        public readonly MatterSourceOperation Operation;
        public readonly MatterSourceShape Shape;
        public readonly MatterMaterialId Material;
        public readonly float SurfaceHeightMeters;
        public readonly float SurfaceNoiseMeters;
        public readonly int NoiseSeedOffset;
        public readonly MatterFloat3 CenterMeters;
        public readonly MatterFloat3 RadiiMeters;

        private MatterSourceLayer(
            MatterSourceOperation operation, MatterSourceShape shape, MatterMaterialId material,
            float surfaceHeightMeters, float surfaceNoiseMeters, int noiseSeedOffset,
            MatterFloat3 centerMeters, MatterFloat3 radiiMeters)
        {
            Operation = operation;
            Shape = shape;
            Material = material;
            SurfaceHeightMeters = surfaceHeightMeters;
            SurfaceNoiseMeters = surfaceNoiseMeters;
            NoiseSeedOffset = noiseSeedOffset;
            CenterMeters = centerMeters;
            RadiiMeters = radiiMeters;
        }

        public static MatterSourceLayer DirtPlane(
            float surfaceHeightMeters, float surfaceNoiseMeters = 0f, int noiseSeedOffset = 0)
        {
            if (!IsFinite(surfaceHeightMeters) || !IsFinite(surfaceNoiseMeters) || surfaceNoiseMeters < 0f)
                throw new ArgumentOutOfRangeException(nameof(surfaceHeightMeters));
            return new MatterSourceLayer(
                MatterSourceOperation.AddSolid, MatterSourceShape.HorizontalPlane, MatterMaterialId.Dirt,
                surfaceHeightMeters, surfaceNoiseMeters, noiseSeedOffset, default, default);
        }

        public static MatterSourceLayer SolidEllipsoid(
            MatterMaterialId material, MatterFloat3 centerMeters, MatterFloat3 radiiMeters)
        {
            if (!MatterMaterialRegistry.IsValidSolidMaterial(material))
                throw new ArgumentOutOfRangeException(nameof(material), "A solid source needs a registered solid material.");
            ValidateRadii(radiiMeters);
            return new MatterSourceLayer(
                MatterSourceOperation.AddSolid, MatterSourceShape.Ellipsoid, material,
                0f, 0f, 0, centerMeters, radiiMeters);
        }

        public static MatterSourceLayer AirCutEllipsoid(MatterFloat3 centerMeters, MatterFloat3 radiiMeters)
        {
            ValidateRadii(radiiMeters);
            return new MatterSourceLayer(
                MatterSourceOperation.Subtract, MatterSourceShape.Ellipsoid, MatterMaterialId.Air,
                0f, 0f, 0, centerMeters, radiiMeters);
        }

        internal float EvaluateDensity(MatterSampleAddress address, int worldSeed, float sampleSpacingMeters)
        {
            if (Shape == MatterSourceShape.HorizontalPlane)
            {
                double y = (double)address.Y * sampleSpacingMeters;
                double noise = MatterDeterministicNoise.Signed(worldSeed, address.X, address.Z, NoiseSeedOffset);
                return (float)(SurfaceHeightMeters + noise * SurfaceNoiseMeters - y);
            }

            double sx = (double)address.X * sampleSpacingMeters;
            double sy = (double)address.Y * sampleSpacingMeters;
            double sz = (double)address.Z * sampleSpacingMeters;
            double nx = (sx - CenterMeters.X) / RadiiMeters.X;
            double ny = (sy - CenterMeters.Y) / RadiiMeters.Y;
            double nz = (sz - CenterMeters.Z) / RadiiMeters.Z;
            double normalizedDistance = Math.Sqrt(nx * nx + ny * ny + nz * nz);
            double smallestRadius = Math.Min(RadiiMeters.X, Math.Min(RadiiMeters.Y, RadiiMeters.Z));
            return (float)((1d - normalizedDistance) * smallestRadius);
        }

        private static void ValidateRadii(MatterFloat3 radii)
        {
            if (!IsFinite(radii.X) || !IsFinite(radii.Y) || !IsFinite(radii.Z) ||
                radii.X <= 0f || radii.Y <= 0f || radii.Z <= 0f)
                throw new ArgumentOutOfRangeException(nameof(radii), "Ellipsoid radii must be finite and positive.");
        }

        private static bool IsFinite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
    }

    internal static class MatterDeterministicNoise
    {
        public static double Signed(int worldSeed, int x, int z, int offset)
        {
            unchecked
            {
                uint value = (uint)worldSeed ^ ((uint)x * 0x9E3779B9u) ^
                             ((uint)z * 0x85EBCA6Bu) ^ (uint)offset;
                value ^= value >> 16;
                value *= 0x7FEB352Du;
                value ^= value >> 15;
                value *= 0x846CA68Bu;
                value ^= value >> 16;
                return (value / (double)uint.MaxValue) * 2d - 1d;
            }
        }
    }

    public sealed class MatterSourceComposer : IMatterSampleSource
    {
        private readonly MatterSourceLayer[] _layers;
        public int SourceVersion { get; }
        public int LayerCount => _layers.Length;

        public MatterSourceComposer(int sourceVersion, params MatterSourceLayer[] layers)
        {
            if (sourceVersion <= 0) throw new ArgumentOutOfRangeException(nameof(sourceVersion));
            if (layers == null || layers.Length == 0)
                throw new ArgumentException("At least one matter source layer is required.", nameof(layers));
            SourceVersion = sourceVersion;
            _layers = (MatterSourceLayer[])layers.Clone();
        }

        public MatterSample Sample(MatterSampleAddress address, int worldSeed, float sampleSpacingMeters)
        {
            if (float.IsNaN(sampleSpacingMeters) || float.IsInfinity(sampleSpacingMeters) || sampleSpacingMeters <= 0f)
                throw new ArgumentOutOfRangeException(nameof(sampleSpacingMeters));

            float greatestSolidDensity = float.NegativeInfinity;
            byte winningPriority = 0;
            MatterMaterialId winningMaterial = MatterMaterialId.Air;
            bool hasSolidSource = false;
            float greatestCutDensity = float.NegativeInfinity;

            for (int index = 0; index < _layers.Length; index++)
            {
                MatterSourceLayer layer = _layers[index];
                float density = layer.EvaluateDensity(address, worldSeed, sampleSpacingMeters);
                if (layer.Operation == MatterSourceOperation.Subtract)
                {
                    if (density > greatestCutDensity) greatestCutDensity = density;
                    continue;
                }

                byte priority = MatterMaterialRegistry.Get(layer.Material).CompositionPriority;
                if (!hasSolidSource || density > greatestSolidDensity ||
                    (density.Equals(greatestSolidDensity) && priority > winningPriority))
                {
                    hasSolidSource = true;
                    greatestSolidDensity = density;
                    winningPriority = priority;
                    winningMaterial = layer.Material;
                }
            }

            float composedDensity = hasSolidSource ? greatestSolidDensity : -sampleSpacingMeters;
            if (!float.IsNegativeInfinity(greatestCutDensity))
                composedDensity = Math.Min(composedDensity, -greatestCutDensity);

            return composedDensity <= 0f
                ? MatterSample.Air(composedDensity)
                : new MatterSample(composedDensity, winningMaterial);
        }
    }
}
