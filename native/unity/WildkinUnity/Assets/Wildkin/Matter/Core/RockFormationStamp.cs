using System;
using System.Collections.Generic;

namespace Wildkin.Matter
{
    public enum RockStampPrimitiveKind : byte { RoundedBox, Slab, Ellipsoid, Wedge }

    /// <summary>One versioned, seed-driven recipe for a coherent stylized rock formation.</summary>
    public sealed class RockFormationProfile
    {
        public string Name { get; }
        public float MaxWidthMeters { get; }
        public float MaxHeightMeters { get; }
        public float SmoothUnionMeters { get; }
        public float WarpMeters { get; }

        public RockFormationProfile(string name, float maxWidthMeters = 8.2f,
            float maxHeightMeters = 4.2f, float smoothUnionMeters = 0.22f, float warpMeters = 0.035f)
        {
            if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("A profile needs a name.", nameof(name));
            if (!Finite(maxWidthMeters) || maxWidthMeters <= 0f || !Finite(maxHeightMeters) || maxHeightMeters <= 0f ||
                !Finite(smoothUnionMeters) || smoothUnionMeters < 0f || !Finite(warpMeters) || warpMeters < 0f)
                throw new ArgumentOutOfRangeException(nameof(maxWidthMeters), "Stamp profile dimensions and blends must be finite and positive.");
            Name = name;
            MaxWidthMeters = maxWidthMeters;
            MaxHeightMeters = maxHeightMeters;
            SmoothUnionMeters = smoothUnionMeters;
            WarpMeters = warpMeters;
        }

        public static RockFormationProfile WildkinClast => new RockFormationProfile("WildkinClast-v1",
            maxWidthMeters: 8.2f, maxHeightMeters: 4.2f, smoothUnionMeters: 0.18f, warpMeters: 0.055f);
        private static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
    }

    public readonly struct RockStampPrimitive
    {
        public readonly RockStampPrimitiveKind Kind;
        public readonly MatterFloat3 Center;
        public readonly MatterFloat3 HalfExtents;
        public readonly MatterFloat3 RotationRadians;
        public readonly float Roundness;
        public readonly float WedgeSlope;

        internal RockStampPrimitive(RockStampPrimitiveKind kind, MatterFloat3 center,
            MatterFloat3 halfExtents, MatterFloat3 rotationRadians, float roundness, float wedgeSlope)
        {
            Kind = kind;
            Center = center;
            HalfExtents = halfExtents;
            RotationRadians = rotationRadians;
            Roundness = roundness;
            WedgeSlope = wedgeSlope;
        }
    }

    /// <summary>
    /// Engine-light seed output. The primitive list is generation input only: Resolve() writes
    /// ordinary density/material samples into an air-backed MatterWorld and retains no recipe.
    /// </summary>
    public sealed class RockFormationStamp
    {
        public const float AnchorX = 8f;
        public const float AnchorZ = 8f;
        public int Seed { get; }
        public RockFormationProfile Profile { get; }
        public string LayoutName { get; }
        public IReadOnlyList<RockStampPrimitive> Primitives => _primitives;
        public int PrimitiveCount => _primitives.Length;
        public string PrimitiveDistribution { get; }
        private readonly RockStampPrimitive[] _primitives;
        private readonly bool _hasPocket;
        private readonly MatterFloat3 _pocketCenter;
        private readonly MatterFloat3 _pocketRadii;
        private readonly float _phaseX, _phaseY, _phaseZ;

        internal RockFormationStamp(int seed, RockFormationProfile profile, string layoutName, RockStampPrimitive[] primitives,
            bool hasPocket, MatterFloat3 pocketCenter, MatterFloat3 pocketRadii,
            float phaseX, float phaseY, float phaseZ)
        {
            Seed = seed;
            Profile = profile ?? throw new ArgumentNullException(nameof(profile));
            LayoutName = layoutName ?? throw new ArgumentNullException(nameof(layoutName));
            _primitives = primitives ?? throw new ArgumentNullException(nameof(primitives));
            _hasPocket = hasPocket;
            _pocketCenter = pocketCenter;
            _pocketRadii = pocketRadii;
            _phaseX = phaseX;
            _phaseY = phaseY;
            _phaseZ = phaseZ;
            int boxes = 0, slabs = 0, ellipsoids = 0, wedges = 0;
            for (int i = 0; i < primitives.Length; i++)
            {
                switch (primitives[i].Kind)
                {
                    case RockStampPrimitiveKind.RoundedBox: boxes++; break;
                    case RockStampPrimitiveKind.Slab: slabs++; break;
                    case RockStampPrimitiveKind.Ellipsoid: ellipsoids++; break;
                    case RockStampPrimitiveKind.Wedge: wedges++; break;
                }
            }
            PrimitiveDistribution = $"roundedBox:{boxes},slab:{slabs},ellipsoid:{ellipsoids},wedge:{wedges}";
        }

        public float Evaluate(float xMeters, float yMeters, float zMeters)
        {
            float value = float.NegativeInfinity;
            for (int i = 0; i < _primitives.Length; i++)
                value = SmoothMaximum(value, EvaluatePrimitive(_primitives[i], xMeters - AnchorX,
                    yMeters, zMeters - AnchorZ), Profile.SmoothUnionMeters);

            float warp = Profile.WarpMeters *
                (float)(Math.Sin(xMeters * 1.25 + _phaseX) * Math.Sin(yMeters * 1.1 + _phaseY) +
                        0.45 * Math.Sin(zMeters * 1.65 + _phaseZ) * Math.Sin(xMeters * 0.8 - _phaseY));
            value -= warp;
            if (_hasPocket)
            {
                float pocket = EllipsoidField(xMeters - _pocketCenter.X, yMeters - _pocketCenter.Y,
                    zMeters - _pocketCenter.Z, _pocketRadii.X, _pocketRadii.Y, _pocketRadii.Z);
                value = Math.Min(value, -pocket);
            }
            return value;
        }

        public RockStampResolution Resolve(float sampleSpacingMeters = MatterWorldFactory.DefaultSampleSpacingMeters)
        {
            if (!Finite(sampleSpacingMeters) || sampleSpacingMeters <= 0f)
                throw new ArgumentOutOfRangeException(nameof(sampleSpacingMeters));
            const float halfBound = 4.15f;
            const float bottom = -0.55f;
            float top = Profile.MaxHeightMeters;
            int minX = (int)Math.Floor((AnchorX - halfBound) / sampleSpacingMeters);
            int maxX = (int)Math.Ceiling((AnchorX + halfBound) / sampleSpacingMeters);
            int minY = (int)Math.Floor(bottom / sampleSpacingMeters);
            int maxY = (int)Math.Ceiling(top / sampleSpacingMeters);
            int minZ = (int)Math.Floor((AnchorZ - halfBound) / sampleSpacingMeters);
            int maxZ = (int)Math.Ceiling((AnchorZ + halfBound) / sampleSpacingMeters);
            MatterWorld world = MatterWorldFactory.CreateResolvedMatterWorld(Seed, sampleSpacingMeters);
            var occupied = new HashSet<MatterSampleAddress>();
            int occupiedMinX = int.MaxValue, occupiedMinY = int.MaxValue, occupiedMinZ = int.MaxValue;
            int occupiedMaxX = int.MinValue, occupiedMaxY = int.MinValue, occupiedMaxZ = int.MinValue;
            ulong hash = 14695981039346656037UL;
            const ulong prime = 1099511628211UL;

            for (int y = minY; y <= maxY; y++)
            for (int z = minZ; z <= maxZ; z++)
            for (int x = minX; x <= maxX; x++)
            {
                float px = x * sampleSpacingMeters;
                float py = y * sampleSpacingMeters;
                float pz = z * sampleSpacingMeters;
                float density = Evaluate(px, py, pz);
                MatterSampleAddress address = new MatterSampleAddress(x, y, z);
                HashInt(ref hash, x, prime); HashInt(ref hash, y, prime); HashInt(ref hash, z, prime);
                HashInt(ref hash, (int)Math.Round(density * 1000000.0, MidpointRounding.AwayFromZero), prime);
                if (density <= 0f) continue;

                // The lower skirt reads as a warmer, softer dirt seam; the overlying mass is rock.
                MatterMaterialId material = py < 0.36f ? MatterMaterialId.Dirt : MatterMaterialId.Rock;
                float resolvedDensity = Math.Min(density, sampleSpacingMeters * 1.5f);
                world.SetSample(address, new MatterSample(resolvedDensity, material));
                occupied.Add(address);
                occupiedMinX = Math.Min(occupiedMinX, x); occupiedMinY = Math.Min(occupiedMinY, y); occupiedMinZ = Math.Min(occupiedMinZ, z);
                occupiedMaxX = Math.Max(occupiedMaxX, x); occupiedMaxY = Math.Max(occupiedMaxY, y); occupiedMaxZ = Math.Max(occupiedMaxZ, z);
            }

            int components = CountComponents(occupied);
            return new RockStampResolution(world, occupied.Count, components, hash,
                occupied.Count == 0 ? minX : occupiedMinX,
                occupied.Count == 0 ? minY : occupiedMinY,
                occupied.Count == 0 ? minZ : occupiedMinZ,
                occupied.Count == 0 ? maxX + 1 : occupiedMaxX + 1,
                occupied.Count == 0 ? maxY + 1 : occupiedMaxY + 1,
                occupied.Count == 0 ? maxZ + 1 : occupiedMaxZ + 1,
                sampleSpacingMeters);
        }

        private static int CountComponents(HashSet<MatterSampleAddress> occupied)
        {
            if (occupied.Count == 0) return 0;
            var remaining = new HashSet<MatterSampleAddress>(occupied);
            var queue = new Queue<MatterSampleAddress>();
            int count = 0;
            while (remaining.Count > 0)
            {
                MatterSampleAddress start = default;
                foreach (MatterSampleAddress item in remaining) { start = item; break; }
                remaining.Remove(start);
                queue.Enqueue(start);
                count++;
                while (queue.Count > 0)
                {
                    MatterSampleAddress current = queue.Dequeue();
                    Visit(current.X + 1, current.Y, current.Z); Visit(current.X - 1, current.Y, current.Z);
                    Visit(current.X, current.Y + 1, current.Z); Visit(current.X, current.Y - 1, current.Z);
                    Visit(current.X, current.Y, current.Z + 1); Visit(current.X, current.Y, current.Z - 1);
                }
            }
            return count;

            void Visit(int x, int y, int z)
            {
                MatterSampleAddress next = new MatterSampleAddress(x, y, z);
                if (remaining.Remove(next)) queue.Enqueue(next);
            }
        }

        private static float EvaluatePrimitive(RockStampPrimitive item, float x, float y, float z)
        {
            MatterFloat3 p = RotateInverse(x - item.Center.X, y - item.Center.Y, z - item.Center.Z, item.RotationRadians);
            switch (item.Kind)
            {
                case RockStampPrimitiveKind.Ellipsoid:
                    return EllipsoidField(p.X, p.Y, p.Z, item.HalfExtents.X, item.HalfExtents.Y, item.HalfExtents.Z);
                case RockStampPrimitiveKind.Wedge:
                    float box = BoxSignedDistance(p.X, p.Y, p.Z, item.HalfExtents, item.Roundness);
                    float slopedTop = p.Y - (item.HalfExtents.Y + item.WedgeSlope * (item.HalfExtents.X - Math.Abs(p.X)));
                    return -Math.Max(box, slopedTop);
                default:
                    return -BoxSignedDistance(p.X, p.Y, p.Z, item.HalfExtents, item.Roundness);
            }
        }

        private static float BoxSignedDistance(float x, float y, float z, MatterFloat3 half, float roundness)
        {
            float qx = Math.Abs(x) - Math.Max(0.01f, half.X - roundness);
            float qy = Math.Abs(y) - Math.Max(0.01f, half.Y - roundness);
            float qz = Math.Abs(z) - Math.Max(0.01f, half.Z - roundness);
            float ox = Math.Max(qx, 0f), oy = Math.Max(qy, 0f), oz = Math.Max(qz, 0f);
            float outside = (float)Math.Sqrt(ox * ox + oy * oy + oz * oz);
            return outside + Math.Min(Math.Max(qx, Math.Max(qy, qz)), 0f) - roundness;
        }

        private static float EllipsoidField(float x, float y, float z, float rx, float ry, float rz)
        {
            float k0 = (float)Math.Sqrt(x * x / (rx * rx) + y * y / (ry * ry) + z * z / (rz * rz));
            float k1 = (float)Math.Sqrt(x * x / (rx * rx * rx * rx) + y * y / (ry * ry * ry * ry) + z * z / (rz * rz * rz * rz));
            float distance = k1 > 1e-6f ? k0 * (k0 - 1f) / k1 : -Math.Min(rx, Math.Min(ry, rz));
            return -distance;
        }

        private static MatterFloat3 RotateInverse(float x, float y, float z, MatterFloat3 euler)
        {
            float cx = (float)Math.Cos(euler.X), sx = (float)Math.Sin(euler.X);
            float cy = (float)Math.Cos(euler.Y), sy = (float)Math.Sin(euler.Y);
            float cz = (float)Math.Cos(euler.Z), sz = (float)Math.Sin(euler.Z);
            // Apply inverse Z, then Y, then X to a point in world coordinates.
            float rzX = cz * x + sz * y, rzY = -sz * x + cz * y;
            float ryX = cy * rzX - sy * z, ryZ = sy * rzX + cy * z;
            float rxY = cx * rzY + sx * ryZ, rxZ = -sx * rzY + cx * ryZ;
            return new MatterFloat3(ryX, rxY, rxZ);
        }

        private static float SmoothMaximum(float a, float b, float k)
        {
            if (float.IsNegativeInfinity(a)) return b;
            if (k <= 0f) return Math.Max(a, b);
            float h = Math.Max(k - Math.Abs(a - b), 0f) / k;
            return Math.Max(a, b) + h * h * k * 0.25f;
        }

        private static void HashInt(ref ulong hash, int value, ulong prime)
        {
            unchecked
            {
                uint bits = (uint)value;
                for (int shift = 0; shift < 32; shift += 8) { hash ^= (byte)(bits >> shift); hash *= prime; }
            }
        }
        private static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
    }

    public readonly struct RockStampResolution
    {
        public readonly MatterWorld World;
        public readonly int OccupiedSamples;
        public readonly int ConnectedComponents;
        public readonly ulong FieldHash;
        public readonly MatterBounds Bounds;
        public readonly float SampleSpacingMeters;

        internal RockStampResolution(MatterWorld world, int occupiedSamples, int connectedComponents,
            ulong fieldHash, int minX, int minY, int minZ, int maxX, int maxY, int maxZ, float spacing)
        {
            World = world;
            OccupiedSamples = occupiedSamples;
            ConnectedComponents = connectedComponents;
            FieldHash = fieldHash;
            Bounds = new MatterBounds(new MatterInt3(minX, minY, minZ), new MatterInt3(maxX, maxY, maxZ));
            SampleSpacingMeters = spacing;
        }
    }

    public static class RockFormationStampGenerator
    {
        public static RockFormationStamp Generate(int seed, string profile = "WildkinClast-v1")
        {
            if (!string.Equals(profile, "WildkinClast-v1", StringComparison.Ordinal))
                throw new ArgumentException("Unknown rock formation profile: " + profile, nameof(profile));
            return Generate(seed, RockFormationProfile.WildkinClast);
        }

        public static RockFormationStamp Generate(int seed, RockFormationProfile profile)
        {
            if (profile == null) throw new ArgumentNullException(nameof(profile));
            var rng = new StampRandom(unchecked((uint)seed) ^ 0xA511E9B3u);
            int layout = (int)(rng.Next() % 4u);
            string layoutName = layout == 0 ? "Crown Stack" : layout == 1 ? "Leaning Ridge" :
                layout == 2 ? "Split Shoulders" : "Bent Buttress";
            float wx = Lerp(0.88f, 1.12f, rng.Next01());
            float wz = Lerp(0.88f, 1.12f, rng.Next01());
            float yaw = Lerp(-0.85f, 0.85f, rng.Next01());
            float tilt = Lerp(-0.14f, 0.14f, rng.Next01());
            float dirX = (float)Math.Cos(yaw), dirZ = (float)Math.Sin(yaw);
            float sideX = -dirZ, sideZ = dirX;

            float baseHx = (layout == 1 ? Lerp(1.78f, 2.28f, rng.Next01()) : Lerp(1.45f, 2.02f, rng.Next01())) * wx;
            float baseHy = layout == 3 ? Lerp(0.38f, 0.56f, rng.Next01()) : Lerp(0.28f, 0.47f, rng.Next01());
            float baseHz = (layout == 1 ? Lerp(0.86f, 1.23f, rng.Next01()) : Lerp(1.25f, 1.87f, rng.Next01())) * wz;
            float baseX = Lerp(-0.18f, 0.18f, rng.Next01());
            float baseZ = Lerp(-0.18f, 0.18f, rng.Next01());
            float baseY = baseHy - 0.27f;
            RockStampPrimitiveKind baseKind = layout == 1 ? RockStampPrimitiveKind.Slab :
                layout == 3 ? RockStampPrimitiveKind.Wedge : RockStampPrimitiveKind.RoundedBox;
            var pieces = new List<RockStampPrimitive>(8)
            {
                Make(baseKind, baseX, baseY, baseZ, baseHx, baseHy, baseHz,
                    tilt * 0.45f, yaw, tilt * 0.35f, Lerp(0.08f, 0.22f, rng.Next01()), 0f)
            };

            float bodyHx = (layout == 1 ? Lerp(1.55f, 2.08f, rng.Next01()) :
                layout == 0 ? Lerp(1.05f, 1.55f, rng.Next01()) : Lerp(1.22f, 1.76f, rng.Next01())) * wx;
            float bodyHy = layout == 1 ? Lerp(0.76f, 1.06f, rng.Next01()) :
                layout == 3 ? Lerp(1.18f, 1.55f, rng.Next01()) :
                layout == 0 ? Lerp(1.12f, 1.58f, rng.Next01()) : Lerp(0.90f, 1.25f, rng.Next01());
            float bodyHz = (layout == 1 ? Lerp(0.62f, 0.96f, rng.Next01()) :
                layout == 2 ? Lerp(1.16f, 1.55f, rng.Next01()) : Lerp(0.88f, 1.42f, rng.Next01())) * wz;
            float bodyX = baseX + Lerp(-0.30f, 0.30f, rng.Next01());
            float bodyZ = baseZ + Lerp(-0.30f, 0.30f, rng.Next01());
            float baseTop = baseY + baseHy;
            float bodyY = baseTop + bodyHy * 0.32f;
            float bodyTop = bodyY + bodyHy;
            RockStampPrimitiveKind bodyKind = layout == 0 || layout == 3 ? RockStampPrimitiveKind.Wedge :
                layout == 1 ? RockStampPrimitiveKind.Slab : RockStampPrimitiveKind.RoundedBox;
            pieces.Add(Make(bodyKind, bodyX, bodyY, bodyZ, bodyHx, bodyHy, bodyHz,
                tilt, yaw, Lerp(-0.10f, 0.10f, rng.Next01()), Lerp(0.08f, 0.18f, rng.Next01()),
                layout == 0 || layout == 3 ? Lerp(-0.42f, 0.42f, rng.Next01()) : 0f));

            // Overlapping shoulders make distinct asymmetry while remaining visibly supported by the core.
            float shoulderDistance = Math.Min(1.02f, bodyHx * 0.50f + Lerp(0.10f, 0.43f, rng.Next01()));
            float shoulderHx = Lerp(0.62f, 0.94f, rng.Next01());
            float shoulderHy = Lerp(0.54f, 0.88f, rng.Next01());
            float shoulderHz = Lerp(0.60f, 1.02f, rng.Next01());
            RockStampPrimitiveKind shoulderKind = layout == 1 ? RockStampPrimitiveKind.Wedge : RockStampPrimitiveKind.RoundedBox;
            pieces.Add(Make(shoulderKind, bodyX + dirX * shoulderDistance,
                baseTop + bodyHy * 0.34f, bodyZ + dirZ * shoulderDistance,
                shoulderHx, shoulderHy, shoulderHz, tilt * 0.6f, yaw + Lerp(-0.42f, 0.42f, rng.Next01()),
                0f, Lerp(0.06f, 0.17f, rng.Next01()), Lerp(-0.30f, 0.30f, rng.Next01())));

            float backDistance = Math.Min(0.96f, bodyHz * 0.44f + Lerp(0.08f, 0.36f, rng.Next01()));
            float rearHx = Lerp(0.56f, 0.90f, rng.Next01());
            float rearHy = Lerp(0.44f, 0.76f, rng.Next01());
            float rearHz = Lerp(0.58f, 0.94f, rng.Next01());
            pieces.Add(Make(layout == 2 ? RockStampPrimitiveKind.Wedge : RockStampPrimitiveKind.RoundedBox,
                bodyX - dirX * backDistance, baseTop + bodyHy * 0.12f, bodyZ - dirZ * backDistance,
                rearHx, rearHy, rearHz, 0f, yaw + Lerp(-0.50f, 0.50f, rng.Next01()), 0f,
                Lerp(0.07f, 0.18f, rng.Next01()), layout == 2 ? Lerp(-0.35f, 0.35f, rng.Next01()) : 0f));

            // A narrow, off-axis ledge and an inset crown read as strata/capstone rather than a cube stack.
            float ledgeSide = rng.Next01() < 0.5f ? -1f : 1f;
            pieces.Add(Make(RockStampPrimitiveKind.Slab,
                bodyX + sideX * ledgeSide * Lerp(0.54f, 0.92f, rng.Next01()),
                baseTop + bodyHy * Lerp(0.44f, 0.70f, rng.Next01()),
                bodyZ + sideZ * ledgeSide * Lerp(0.54f, 0.92f, rng.Next01()),
                Lerp(0.62f, 1.06f, rng.Next01()), Lerp(0.20f, 0.38f, rng.Next01()),
                Lerp(0.72f, 1.18f, rng.Next01()), tilt * 0.5f,
                yaw + Lerp(-0.55f, 0.55f, rng.Next01()), 0f, 0.10f, 0f));

            float capHy = Lerp(0.36f, 0.65f, rng.Next01());
            float capX = bodyX + Lerp(-0.58f, 0.58f, rng.Next01());
            float capZ = bodyZ + Lerp(-0.58f, 0.58f, rng.Next01());
            pieces.Add(Make(layout == 1 ? RockStampPrimitiveKind.RoundedBox :
                    layout == 2 ? RockStampPrimitiveKind.Slab : RockStampPrimitiveKind.Wedge,
                capX, bodyTop + capHy - Lerp(0.52f, 0.72f, rng.Next01()), capZ,
                Lerp(0.44f, 0.76f, rng.Next01()), capHy, Lerp(0.44f, 0.78f, rng.Next01()),
                Lerp(-0.14f, 0.14f, rng.Next01()), yaw + Lerp(-0.62f, 0.62f, rng.Next01()),
                Lerp(-0.12f, 0.12f, rng.Next01()), 0.08f,
                layout == 2 ? 0f : Lerp(-0.38f, 0.38f, rng.Next01())));

            bool secondCap = rng.Next01() < 0.48f;
            if (secondCap)
            {
                float smallHy = Lerp(0.30f, 0.48f, rng.Next01());
                pieces.Add(Make(layout == 3 ? RockStampPrimitiveKind.RoundedBox : RockStampPrimitiveKind.Wedge,
                    bodyX - sideX * ledgeSide * Lerp(0.35f, 0.70f, rng.Next01()),
                    bodyTop - Lerp(0.52f, 0.72f, rng.Next01()) + smallHy,
                    bodyZ - sideZ * ledgeSide * Lerp(0.35f, 0.70f, rng.Next01()),
                    Lerp(0.38f, 0.60f, rng.Next01()), smallHy, Lerp(0.36f, 0.58f, rng.Next01()),
                    tilt * 0.6f, yaw + Lerp(-0.75f, 0.75f, rng.Next01()), 0f, 0.08f,
                    Lerp(-0.30f, 0.30f, rng.Next01())));
            }

            bool pocket = rng.Next01() < 0.24f;
            float pocketSide = rng.Next01() < 0.5f ? -1f : 1f;
            MatterFloat3 pocketCenter = new MatterFloat3(
                RockFormationStamp.AnchorX + bodyX + sideX * pocketSide * (bodyHz * 0.90f),
                baseTop + bodyHy * Lerp(0.34f, 0.68f, rng.Next01()),
                RockFormationStamp.AnchorZ + bodyZ + sideZ * pocketSide * (bodyHz * 0.90f));
            MatterFloat3 pocketRadii = new MatterFloat3(Lerp(0.29f, 0.40f, rng.Next01()),
                Lerp(0.34f, 0.48f, rng.Next01()), Lerp(0.29f, 0.40f, rng.Next01()));
            return new RockFormationStamp(seed, profile, layoutName, pieces.ToArray(), pocket, pocketCenter,
                pocketRadii, rng.Next01() * 6.28318f, rng.Next01() * 6.28318f, rng.Next01() * 6.28318f);
        }

        private static RockStampPrimitive Make(RockStampPrimitiveKind kind, float x, float y, float z,
            float hx, float hy, float hz, float rx, float ry, float rz, float roundness, float slope)
            => new RockStampPrimitive(kind, new MatterFloat3(x, y, z), new MatterFloat3(hx, hy, hz),
                new MatterFloat3(rx, ry, rz), roundness, slope);

        private static float Lerp(float a, float b, float t) => a + (b - a) * t;

        private struct StampRandom
        {
            private uint _state;
            public StampRandom(uint seed) => _state = seed == 0 ? 0x6D2B79F5u : seed;
            public uint Next()
            {
                uint value = _state;
                value ^= value << 13; value ^= value >> 17; value ^= value << 5;
                _state = value;
                return value;
            }
            public float Next01() => (Next() >> 8) * (1f / 16777216f);
        }
    }
}
