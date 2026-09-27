using System;
using System.Runtime.InteropServices;

namespace Wildkin.Matter
{
    [StructLayout(LayoutKind.Sequential)]
    public readonly struct MatterInt3 : IEquatable<MatterInt3>, IComparable<MatterInt3>
    {
        public readonly int X;
        public readonly int Y;
        public readonly int Z;

        public MatterInt3(int x, int y, int z)
        {
            X = x;
            Y = y;
            Z = z;
        }

        public static MatterInt3 Zero => new MatterInt3(0, 0, 0);
        public static MatterInt3 operator +(MatterInt3 left, MatterInt3 right)
            => new MatterInt3(checked(left.X + right.X), checked(left.Y + right.Y), checked(left.Z + right.Z));
        public static MatterInt3 operator -(MatterInt3 left, MatterInt3 right)
            => new MatterInt3(checked(left.X - right.X), checked(left.Y - right.Y), checked(left.Z - right.Z));
        public bool Equals(MatterInt3 other) => X == other.X && Y == other.Y && Z == other.Z;
        public override bool Equals(object obj) => obj is MatterInt3 other && Equals(other);

        public override int GetHashCode()
        {
            unchecked { return ((X * 397) ^ Y) * 397 ^ Z; }
        }

        public int CompareTo(MatterInt3 other)
        {
            int x = X.CompareTo(other.X);
            if (x != 0) return x;
            int y = Y.CompareTo(other.Y);
            return y != 0 ? y : Z.CompareTo(other.Z);
        }

        public override string ToString() => $"({X},{Y},{Z})";
        public static bool operator ==(MatterInt3 left, MatterInt3 right) => left.Equals(right);
        public static bool operator !=(MatterInt3 left, MatterInt3 right) => !left.Equals(right);
    }

    [StructLayout(LayoutKind.Sequential)]
    public readonly struct MatterFloat3
    {
        public readonly float X;
        public readonly float Y;
        public readonly float Z;

        public MatterFloat3(float x, float y, float z)
        {
            X = x;
            Y = y;
            Z = z;
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public readonly struct MatterSampleAddress : IEquatable<MatterSampleAddress>, IComparable<MatterSampleAddress>
    {
        public readonly MatterInt3 Coordinates;
        public MatterSampleAddress(int x, int y, int z) : this(new MatterInt3(x, y, z)) { }
        public MatterSampleAddress(MatterInt3 coordinates) => Coordinates = coordinates;
        public int X => Coordinates.X;
        public int Y => Coordinates.Y;
        public int Z => Coordinates.Z;
        public bool Equals(MatterSampleAddress other) => Coordinates == other.Coordinates;
        public override bool Equals(object obj) => obj is MatterSampleAddress other && Equals(other);
        public override int GetHashCode() => Coordinates.GetHashCode();
        public int CompareTo(MatterSampleAddress other) => Coordinates.CompareTo(other.Coordinates);
        public override string ToString() => Coordinates.ToString();
        public static bool operator ==(MatterSampleAddress left, MatterSampleAddress right) => left.Equals(right);
        public static bool operator !=(MatterSampleAddress left, MatterSampleAddress right) => !left.Equals(right);
    }

    [StructLayout(LayoutKind.Sequential)]
    public readonly struct MatterBrickAddress : IEquatable<MatterBrickAddress>, IComparable<MatterBrickAddress>
    {
        public readonly MatterInt3 Coordinates;
        public MatterBrickAddress(int x, int y, int z) : this(new MatterInt3(x, y, z)) { }
        public MatterBrickAddress(MatterInt3 coordinates) => Coordinates = coordinates;
        public int X => Coordinates.X;
        public int Y => Coordinates.Y;
        public int Z => Coordinates.Z;
        public bool Equals(MatterBrickAddress other) => Coordinates == other.Coordinates;
        public override bool Equals(object obj) => obj is MatterBrickAddress other && Equals(other);
        public override int GetHashCode() => Coordinates.GetHashCode();
        public int CompareTo(MatterBrickAddress other) => Coordinates.CompareTo(other.Coordinates);
        public override string ToString() => Coordinates.ToString();
        public static bool operator ==(MatterBrickAddress left, MatterBrickAddress right) => left.Equals(right);
        public static bool operator !=(MatterBrickAddress left, MatterBrickAddress right) => !left.Equals(right);
    }

    [StructLayout(LayoutKind.Sequential)]
    public readonly struct MatterLocalAddress : IEquatable<MatterLocalAddress>
    {
        public readonly int X;
        public readonly int Y;
        public readonly int Z;

        public MatterLocalAddress(int x, int y, int z)
        {
            if (!MatterBrickLayout.IsValidLocalCoordinate(x) ||
                !MatterBrickLayout.IsValidLocalCoordinate(y) ||
                !MatterBrickLayout.IsValidLocalCoordinate(z))
                throw new ArgumentOutOfRangeException(nameof(x), "Brick-local coordinates must be in [0, 16).");
            X = x;
            Y = y;
            Z = z;
        }

        public bool Equals(MatterLocalAddress other) => X == other.X && Y == other.Y && Z == other.Z;
        public override bool Equals(object obj) => obj is MatterLocalAddress other && Equals(other);
        public override int GetHashCode()
        {
            unchecked { return ((X * 397) ^ Y) * 397 ^ Z; }
        }
    }

    public static class MatterBrickLayout
    {
        public const int CellSize = 16;
        public const int SamplesPerAxis = CellSize;
        public const int SamplesPerBrick = SamplesPerAxis * SamplesPerAxis * SamplesPerAxis;
        public const int RawBytesPerSample = sizeof(float) + sizeof(byte);
        public const int RawBytesPerBrick = SamplesPerBrick * RawBytesPerSample;

        public static bool IsValidLocalCoordinate(int coordinate)
            => coordinate >= 0 && coordinate < SamplesPerAxis;

        public static void Resolve(
            MatterSampleAddress sampleAddress,
            out MatterBrickAddress brickAddress,
            out MatterLocalAddress localAddress)
        {
            int brickX = FloorDiv(sampleAddress.X, CellSize);
            int brickY = FloorDiv(sampleAddress.Y, CellSize);
            int brickZ = FloorDiv(sampleAddress.Z, CellSize);
            brickAddress = new MatterBrickAddress(brickX, brickY, brickZ);
            localAddress = new MatterLocalAddress(
                sampleAddress.X - brickX * CellSize,
                sampleAddress.Y - brickY * CellSize,
                sampleAddress.Z - brickZ * CellSize);
        }

        public static MatterSampleAddress ToGlobal(
            MatterBrickAddress brickAddress,
            MatterLocalAddress localAddress)
        {
            return new MatterSampleAddress(
                checked(brickAddress.X * CellSize + localAddress.X),
                checked(brickAddress.Y * CellSize + localAddress.Y),
                checked(brickAddress.Z * CellSize + localAddress.Z));
        }

        public static int FloorDiv(int value, int positiveDivisor)
        {
            if (positiveDivisor <= 0)
                throw new ArgumentOutOfRangeException(nameof(positiveDivisor));
            int quotient = value / positiveDivisor;
            int remainder = value % positiveDivisor;
            return remainder < 0 ? quotient - 1 : quotient;
        }
    }

    public readonly struct MatterBounds
    {
        public readonly MatterInt3 MinInclusive;
        public readonly MatterInt3 MaxExclusive;
        public MatterInt3 Size => MaxExclusive - MinInclusive;

        public MatterBounds(MatterInt3 minInclusive, MatterInt3 maxExclusive)
        {
            if (maxExclusive.X <= minInclusive.X ||
                maxExclusive.Y <= minInclusive.Y ||
                maxExclusive.Z <= minInclusive.Z)
                throw new ArgumentException("Matter bounds must have positive size on every axis.");
            MinInclusive = minInclusive;
            MaxExclusive = maxExclusive;
        }

        public bool Contains(MatterSampleAddress address)
            => address.X >= MinInclusive.X && address.X < MaxExclusive.X &&
               address.Y >= MinInclusive.Y && address.Y < MaxExclusive.Y &&
               address.Z >= MinInclusive.Z && address.Z < MaxExclusive.Z;

        public bool ContainsLocal(MatterInt3 local, MatterInt3 size)
            => local.X >= 0 && local.X < size.X &&
               local.Y >= 0 && local.Y < size.Y &&
               local.Z >= 0 && local.Z < size.Z;
    }
}
