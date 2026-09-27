using System;
using UnityEngine;

namespace Wildkin.Matter.Unity
{
    public sealed class MatterRockTextureSet
    {
        public Texture2D RockAlbedo { get; }
        public Texture2D DirtAlbedo { get; }
        public Texture2D RockNormal { get; }
        public Texture2D DirtNormal { get; }
        public Texture2D RockMask { get; }
        public Texture2D DirtMask { get; }
        public Texture2D LayerMask { get; }
        public Texture2D[] All => new[] { RockAlbedo, DirtAlbedo, RockNormal, DirtNormal, RockMask, DirtMask, LayerMask };

        public MatterRockTextureSet(Texture2D rockAlbedo, Texture2D dirtAlbedo,
            Texture2D rockNormal, Texture2D dirtNormal, Texture2D rockMask, Texture2D dirtMask,
            Texture2D layerMask = null)
        {
            RockAlbedo = rockAlbedo; DirtAlbedo = dirtAlbedo;
            RockNormal = rockNormal; DirtNormal = dirtNormal;
            RockMask = rockMask; DirtMask = dirtMask;
            LayerMask = layerMask;
        }
    }

    /// <summary>Fully generated first-party albedo, tangent normal, and HDRP mask textures.</summary>
    public static class MatterRockMaterialFactory
    {
        public const int TextureSize = 128;
        public const int TextureGeneratorVersion = 1;

        public static MatterRockTextureSet GenerateTextures()
            => new MatterRockTextureSet(
                GenerateAlbedo("U4 Rock Albedo", 0x19422091u, new Color(0.43f, 0.45f, 0.44f, 1f), false),
                GenerateAlbedo("U4 Dirt Albedo", 0xA5C3E72Du, new Color(0.49f, 0.33f, 0.19f, 1f), true),
                GenerateNormal("U4 Rock Normal", 0x702C9B31u, 0.18f),
                GenerateNormal("U4 Dirt Normal", 0xF7C04A69u, 0.11f),
                GenerateMask("U4 Rock Mask", 0x23ABBD19u, 0.33f),
                GenerateMask("U4 Dirt Mask", 0xD1047713u, 0.22f),
                GenerateLayerMask());

        public static Material CreateMaterial(MatterRockTextureSet textures, string name = "U4 Stylized Rock Dirt")
        {
            if (textures == null) throw new ArgumentNullException(nameof(textures));
            Shader shader = Shader.Find("Wildkin/MatterRockDirt");
            if (shader == null) throw new InvalidOperationException("Wildkin/MatterRockDirt was not found; compile the first-party HDRP shader first.");
            var material = new Material(shader) { name = name, enableInstancing = true };
            material.SetTexture("_RockAlbedo", textures.RockAlbedo);
            material.SetTexture("_DirtAlbedo", textures.DirtAlbedo);
            material.SetTexture("_RockNormal", textures.RockNormal);
            material.SetTexture("_DirtNormal", textures.DirtNormal);
            material.SetTexture("_RockMask", textures.RockMask);
            material.SetTexture("_DirtMask", textures.DirtMask);
            material.SetColor("_RockTint", new Color(0.98f, 0.98f, 0.96f, 1f));
            material.SetColor("_DirtTint", new Color(1f, 0.96f, 0.86f, 1f));
            material.SetFloat("_TextureScale", 1f);
            material.SetFloat("_NormalStrength", 0.50f);
            material.SetFloat("_RockSmoothness", 1f);
            material.SetFloat("_DirtSmoothness", 0.72f);
            material.SetVector("_KeyDirection", new Vector4(0.43f, 0.56f, -0.71f, 0f));
            material.SetColor("_KeyColor", new Color(0.92f, 0.80f, 0.64f, 1f));
            material.SetColor("_AmbientColor", new Color(0.26f, 0.28f, 0.30f, 1f));
            return material;
        }

        public static Material CreateDebugMaterial(string mode)
        {
            if (string.Equals(mode, "weights", StringComparison.OrdinalIgnoreCase))
                return MatterMeshPublisher.CreateVertexColorMaterial("U4 Material Weight Debug");
            Color color;
            if (string.Equals(mode, "rock", StringComparison.OrdinalIgnoreCase)) color = new Color(0.42f, 0.47f, 0.47f, 1f);
            else if (string.Equals(mode, "dirt", StringComparison.OrdinalIgnoreCase)) color = new Color(0.52f, 0.34f, 0.17f, 1f);
            else throw new ArgumentException("Debug mode must be off, weights, rock, or dirt.", nameof(mode));
            return MatterMeshPublisher.CreateDebugMaterial(color, "U4 " + mode + " Debug", true);
        }

        private static Texture2D GenerateAlbedo(string name, uint seed, Color baseColor, bool dirt)
        {
            var texture = CreateTexture(name);
            var pixels = new Color[TextureSize * TextureSize];
            for (int y = 0; y < TextureSize; y++)
            for (int x = 0; x < TextureSize; x++)
            {
                float u = x / (float)TextureSize, v = y / (float)TextureSize;
                float macro = ValueNoise(seed, u, v, 3) * 0.48f + ValueNoise(seed + 31, u, v, 7) * 0.31f +
                              ValueNoise(seed + 73, u, v, 15) * 0.15f + ValueNoise(seed + 109, u, v, 37) * 0.06f;
                float fleck = ValueNoise(seed + 211, u, v, 63) - 0.5f;
                float value = Mathf.Clamp(0.86f + macro * 0.42f + fleck * (dirt ? 0.06f : 0.045f), 0.68f, 1.14f);
                float warm = ValueNoise(seed + 307, u, v, 5) - 0.5f;
                float r = baseColor.r * value + warm * (dirt ? 0.025f : 0.012f);
                float g = baseColor.g * value + warm * (dirt ? -0.006f : 0.003f);
                float b = baseColor.b * value - warm * (dirt ? 0.018f : 0.005f);
                pixels[y * TextureSize + x] = new Color(r, g, b, 1f);
            }
            texture.SetPixels(pixels);
            texture.Apply(true, false);
            return texture;
        }

        private static Texture2D GenerateNormal(string name, uint seed, float strength)
        {
            var texture = CreateTexture(name);
            var pixels = new Color[TextureSize * TextureSize];
            for (int y = 0; y < TextureSize; y++)
            for (int x = 0; x < TextureSize; x++)
            {
                float u = x / (float)TextureSize, v = y / (float)TextureSize;
                float dx = Height(seed, u + 1f / TextureSize, v) - Height(seed, u - 1f / TextureSize, v);
                float dy = Height(seed, u, v + 1f / TextureSize) - Height(seed, u, v - 1f / TextureSize);
                Vector3 normal = new Vector3(-dx * strength * 26f, -dy * strength * 26f, 1f).normalized;
                pixels[y * TextureSize + x] = new Color(normal.x * 0.5f + 0.5f,
                    normal.y * 0.5f + 0.5f, normal.z * 0.5f + 0.5f, 1f);
            }
            texture.SetPixels(pixels);
            texture.Apply(true, false);
            return texture;
        }

        private static Texture2D GenerateMask(string name, uint seed, float smoothness)
        {
            var texture = CreateTexture(name);
            var pixels = new Color[TextureSize * TextureSize];
            for (int y = 0; y < TextureSize; y++)
            for (int x = 0; x < TextureSize; x++)
            {
                float u = x / (float)TextureSize, v = y / (float)TextureSize;
                float variation = ValueNoise(seed, u, v, 9) - 0.5f;
                float ao = Mathf.Clamp01(0.90f + (ValueNoise(seed + 19, u, v, 17) - 0.5f) * 0.10f);
                pixels[y * TextureSize + x] = new Color(0f, ao, 0f,
                    Mathf.Clamp(smoothness + variation * 0.10f, 0.08f, 0.48f));
            }
            texture.SetPixels(pixels);
            texture.Apply(true, false);
            return texture;
        }

        private static Texture2D GenerateLayerMask()
        {
            var texture = CreateTexture("U4 Layer Mask");
            var pixels = new Color[TextureSize * TextureSize];
            for (int i = 0; i < pixels.Length; i++) pixels[i] = Color.white;
            texture.SetPixels(pixels);
            texture.Apply(true, false);
            return texture;
        }

        private static Texture2D CreateTexture(string name)
            => new Texture2D(TextureSize, TextureSize, TextureFormat.RGBA32, true, true)
            {
                name = name,
                wrapMode = TextureWrapMode.Repeat,
                filterMode = FilterMode.Trilinear,
                anisoLevel = 4
            };

        private static float Height(uint seed, float u, float v)
            => ValueNoise(seed, u, v, 5) * 0.62f + ValueNoise(seed + 19, u, v, 17) * 0.27f + ValueNoise(seed + 41, u, v, 47) * 0.11f;

        private static float ValueNoise(uint seed, float u, float v, int cells)
        {
            float x = u * cells, y = v * cells;
            int x0 = Mathf.FloorToInt(x), y0 = Mathf.FloorToInt(y);
            float tx = Smooth(x - x0), ty = Smooth(y - y0);
            float a = Lerp(HashNoise(seed, x0, y0, cells), HashNoise(seed, x0 + 1, y0, cells), tx);
            float b = Lerp(HashNoise(seed, x0, y0 + 1, cells), HashNoise(seed, x0 + 1, y0 + 1, cells), tx);
            return Lerp(a, b, ty);
        }

        private static float HashNoise(uint seed, int x, int y, int cells)
        {
            unchecked
            {
                uint value = seed ^ ((uint)(x % cells + cells) % (uint)cells * 0x9E3779B9u) ^
                             ((uint)(y % cells + cells) % (uint)cells * 0x85EBCA6Bu);
                value ^= value >> 16; value *= 0x7FEB352Du;
                value ^= value >> 15; value *= 0x846CA68Bu;
                value ^= value >> 16;
                return value / (float)uint.MaxValue;
            }
        }

        private static float Smooth(float value) => value * value * (3f - 2f * value);
        private static float Lerp(float a, float b, float t) => a + (b - a) * t;
    }
}
