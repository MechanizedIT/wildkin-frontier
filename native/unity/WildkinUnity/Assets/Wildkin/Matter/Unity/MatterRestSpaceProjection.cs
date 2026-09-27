using UnityEngine;
using Wildkin.Matter;

namespace Wildkin.Matter.Unity
{
    public enum MatterProjectionAxis : byte { X, Y, Z }

    public readonly struct MatterProjectionFrame
    {
        public readonly MatterProjectionAxis Axis;
        public readonly Vector4 Tangent;
        public MatterProjectionFrame(MatterProjectionAxis axis, Vector4 tangent)
        { Axis = axis; Tangent = tangent; }
    }

    /// <summary>Stable per-face planar texture coordinates derived only from mesher rest data.</summary>
    public static class MatterRestSpaceProjection
    {
        public const float TextureRepeatPerMeter = 0.48f;

        public static MatterProjectionFrame Frame(MatterMeshVertex a, MatterMeshVertex b, MatterMeshVertex c)
        {
            float nx = a.Normal.X + b.Normal.X + c.Normal.X;
            float ny = a.Normal.Y + b.Normal.Y + c.Normal.Y;
            float nz = a.Normal.Z + b.Normal.Z + c.Normal.Z;
            float ax = Mathf.Abs(nx), ay = Mathf.Abs(ny), az = Mathf.Abs(nz);
            if (ay >= ax && ay >= az)
                return new MatterProjectionFrame(MatterProjectionAxis.Y, new Vector4(1f, 0f, 0f, ny >= 0f ? -1f : 1f));
            if (ax >= az)
                return new MatterProjectionFrame(MatterProjectionAxis.X, new Vector4(0f, 0f, 1f, nx >= 0f ? -1f : 1f));
            return new MatterProjectionFrame(MatterProjectionAxis.Z, new Vector4(1f, 0f, 0f, nz >= 0f ? 1f : -1f));
        }

        public static Vector2 Project(MatterFloat3 restPosition, MatterProjectionAxis axis)
        {
            switch (axis)
            {
                case MatterProjectionAxis.X: return new Vector2(restPosition.Z, restPosition.Y) * TextureRepeatPerMeter;
                case MatterProjectionAxis.Y: return new Vector2(restPosition.X, restPosition.Z) * TextureRepeatPerMeter;
                default: return new Vector2(restPosition.X, restPosition.Y) * TextureRepeatPerMeter;
            }
        }
    }
}
