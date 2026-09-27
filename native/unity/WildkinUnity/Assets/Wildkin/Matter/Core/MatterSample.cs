using System;
using System.Runtime.InteropServices;

namespace Wildkin.Matter
{
    public enum MatterMaterialId : byte
    {
        Air = 0,
        Rock = 1,
        Dirt = 2
    }

    [StructLayout(LayoutKind.Sequential)]
    public readonly struct MatterRgbColor
    {
        public readonly float R;
        public readonly float G;
        public readonly float B;
        public MatterRgbColor(float r, float g, float b) { R = r; G = g; B = b; }
    }

    [StructLayout(LayoutKind.Sequential)]
    public readonly struct MatterMaterialProfile
    {
        public readonly MatterMaterialId Id;
        public readonly bool IsSolid;
        public readonly byte CompositionPriority;
        public readonly sbyte RenderSlot;
        public readonly MatterRgbColor DebugColor;
        public readonly string DisplayName;

        public MatterMaterialProfile(
            MatterMaterialId id, bool isSolid, byte compositionPriority,
            sbyte renderSlot, MatterRgbColor debugColor, string displayName)
        {
            Id = id;
            IsSolid = isSolid;
            CompositionPriority = compositionPriority;
            RenderSlot = renderSlot;
            DebugColor = debugColor;
            DisplayName = displayName;
        }
    }

    public static class MatterMaterialRegistry
    {
        private static readonly MatterMaterialProfile[] Profiles =
        {
            new MatterMaterialProfile(MatterMaterialId.Air, false, 0, -1,
                new MatterRgbColor(0.12f, 0.16f, 0.2f), "Air"),
            new MatterMaterialProfile(MatterMaterialId.Rock, true, 20, 0,
                new MatterRgbColor(0.39f, 0.44f, 0.50f), "Rock"),
            new MatterMaterialProfile(MatterMaterialId.Dirt, true, 10, 1,
                new MatterRgbColor(0.48f, 0.30f, 0.17f), "Dirt")
        };

        public const int SolidRenderSlotCount = 2;

        public static MatterMaterialProfile Get(MatterMaterialId id)
        {
            int index = (byte)id;
            if (index >= Profiles.Length || Profiles[index].Id != id)
                throw new ArgumentOutOfRangeException(nameof(id), id, "Unknown matter material.");
            return Profiles[index];
        }

        public static bool TryGet(byte id, out MatterMaterialProfile profile)
        {
            if (id < Profiles.Length && Profiles[id].Id == (MatterMaterialId)id)
            {
                profile = Profiles[id];
                return true;
            }
            profile = default;
            return false;
        }

        public static bool IsValidSolidMaterial(MatterMaterialId id)
            => TryGet((byte)id, out MatterMaterialProfile profile) && profile.IsSolid;
    }

    [StructLayout(LayoutKind.Sequential)]
    public readonly struct MatterSample : IEquatable<MatterSample>
    {
        public readonly float Density;
        public readonly MatterMaterialId Material;
        public bool IsSolid => Density > 0f && MatterMaterialRegistry.Get(Material).IsSolid;

        public MatterSample(float density, MatterMaterialId material)
        {
            if (float.IsNaN(density) || float.IsInfinity(density))
                throw new ArgumentOutOfRangeException(nameof(density), "Density must be finite.");
            MatterMaterialProfile profile = MatterMaterialRegistry.Get(material);
            if ((density > 0f) != profile.IsSolid)
                throw new ArgumentException(
                    "Positive density must use a solid material; non-positive density must use Air.",
                    nameof(material));
            Density = density;
            Material = material;
        }

        public static MatterSample Air(float density = -1f)
        {
            if (density > 0f)
                throw new ArgumentOutOfRangeException(nameof(density), "Air density must be non-positive.");
            return new MatterSample(density, MatterMaterialId.Air);
        }

        public bool Equals(MatterSample other) => Density.Equals(other.Density) && Material == other.Material;
        public override bool Equals(object obj) => obj is MatterSample other && Equals(other);
        public override int GetHashCode()
        {
            unchecked { return (Density.GetHashCode() * 397) ^ (byte)Material; }
        }
        public override string ToString() => $"{Material} ({Density:R})";
        public static bool operator ==(MatterSample left, MatterSample right) => left.Equals(right);
        public static bool operator !=(MatterSample left, MatterSample right) => !left.Equals(right);
    }
}
