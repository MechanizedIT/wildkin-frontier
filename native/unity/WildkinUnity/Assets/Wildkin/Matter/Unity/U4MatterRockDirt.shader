Shader "Wildkin/MatterRockDirt"
{
    Properties
    {
        [NoScaleOffset] _RockAlbedo("Generated Rock Albedo", 2D) = "white" {}
        [NoScaleOffset] _DirtAlbedo("Generated Dirt Albedo", 2D) = "white" {}
        [NoScaleOffset] _RockNormal("Generated Rock Tangent Normal", 2D) = "bump" {}
        [NoScaleOffset] _DirtNormal("Generated Dirt Tangent Normal", 2D) = "bump" {}
        [NoScaleOffset] _RockMask("Generated Rock AO / Smoothness", 2D) = "white" {}
        [NoScaleOffset] _DirtMask("Generated Dirt AO / Smoothness", 2D) = "white" {}
        _RockTint("Rock Macro Tint", Color) = (1, 1, 1, 1)
        _DirtTint("Dirt Macro Tint", Color) = (1, 1, 1, 1)
        _TextureScale("Rest-Space Texture Scale", Float) = 1
        _NormalStrength("Normal Detail Strength", Range(0, 1)) = 0.5
        _RockSmoothness("Rock Smoothness Scale", Range(0, 1)) = 1
        _DirtSmoothness("Dirt Smoothness Scale", Range(0, 1)) = 0.72
        _KeyDirection("Stylized Key Direction", Vector) = (0.43, 0.56, -0.71, 0)
        _KeyColor("Stylized Warm Key", Color) = (0.92, 0.80, 0.64, 1)
        _AmbientColor("Stylized Cool Ambient", Color) = (0.26, 0.28, 0.30, 1)
    }

    SubShader
    {
        Tags { "RenderPipeline" = "HDRenderPipeline" "RenderType" = "Opaque" "Queue" = "Geometry" }
        Pass
        {
            Name "ForwardOnly"
            Tags { "LightMode" = "ForwardOnly" }
            Cull Back
            ZWrite On
            ZTest LEqual

            HLSLPROGRAM
            #pragma target 4.5
            #pragma only_renderers d3d11 d3d12 vulkan metal xboxone xboxseries
            #pragma vertex Vert
            #pragma fragment Frag

            #include "Packages/com.unity.render-pipelines.core/ShaderLibrary/Common.hlsl"
            #include "Packages/com.unity.render-pipelines.high-definition/Runtime/ShaderLibrary/ShaderVariables.hlsl"

            TEXTURE2D(_RockAlbedo); SAMPLER(sampler_RockAlbedo);
            TEXTURE2D(_DirtAlbedo); SAMPLER(sampler_DirtAlbedo);
            TEXTURE2D(_RockNormal); SAMPLER(sampler_RockNormal);
            TEXTURE2D(_DirtNormal); SAMPLER(sampler_DirtNormal);
            TEXTURE2D(_RockMask); SAMPLER(sampler_RockMask);
            TEXTURE2D(_DirtMask); SAMPLER(sampler_DirtMask);

            float4 _RockTint;
            float4 _DirtTint;
            float4 _KeyDirection;
            float4 _KeyColor;
            float4 _AmbientColor;
            float _TextureScale;
            float _NormalStrength;
            float _RockSmoothness;
            float _DirtSmoothness;

            struct Attributes
            {
                float3 positionOS : POSITION;
                float3 normalOS : NORMAL;
                float4 tangentOS : TANGENT;
                float2 restUV : TEXCOORD0;
                float4 color : COLOR;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float3 positionWS : TEXCOORD0;
                float3 normalWS : TEXCOORD1;
                float4 tangentWS : TEXCOORD2;
                float2 restUV : TEXCOORD3;
                float dirtWeight : TEXCOORD4;
            };

            Varyings Vert(Attributes input)
            {
                Varyings output;
                output.positionWS = TransformObjectToWorld(input.positionOS);
                output.positionCS = TransformWorldToHClip(output.positionWS);
                output.normalWS = TransformObjectToWorldNormal(input.normalOS);
                output.tangentWS = float4(TransformObjectToWorldDir(input.tangentOS.xyz), input.tangentOS.w);
                output.restUV = input.restUV * _TextureScale;
                output.dirtWeight = saturate(input.color.r);
                return output;
            }

            float3 DecodeTangentNormal(float3 encoded, float strength)
            {
                float3 normalTS = encoded * 2.0 - 1.0;
                normalTS.xy *= strength;
                normalTS.z = sqrt(saturate(1.0 - dot(normalTS.xy, normalTS.xy)));
                return normalize(normalTS);
            }

            float4 Frag(Varyings input) : SV_Target
            {
                float dirt = saturate(input.dirtWeight);
                float4 rockAlbedo = SAMPLE_TEXTURE2D(_RockAlbedo, sampler_RockAlbedo, input.restUV) * _RockTint;
                float4 dirtAlbedo = SAMPLE_TEXTURE2D(_DirtAlbedo, sampler_DirtAlbedo, input.restUV) * _DirtTint;
                float4 rockMask = SAMPLE_TEXTURE2D(_RockMask, sampler_RockMask, input.restUV);
                float4 dirtMask = SAMPLE_TEXTURE2D(_DirtMask, sampler_DirtMask, input.restUV);
                float3 rockNormal = DecodeTangentNormal(SAMPLE_TEXTURE2D(_RockNormal, sampler_RockNormal, input.restUV).xyz, _NormalStrength);
                float3 dirtNormal = DecodeTangentNormal(SAMPLE_TEXTURE2D(_DirtNormal, sampler_DirtNormal, input.restUV).xyz, _NormalStrength);
                float3 normalTS = normalize(lerp(rockNormal, dirtNormal, dirt));

                float3 N = normalize(input.normalWS);
                float3 T = normalize(input.tangentWS.xyz - N * dot(N, input.tangentWS.xyz));
                float3 B = normalize(cross(N, T)) * (input.tangentWS.w < 0.0 ? -1.0 : 1.0);
                N = normalize(T * normalTS.x + B * normalTS.y + N * normalTS.z);

                float3 baseColor = lerp(rockAlbedo.rgb, dirtAlbedo.rgb, dirt);
                float ao = saturate(lerp(rockMask.g, dirtMask.g, dirt));
                float smoothness = saturate(lerp(rockMask.a * _RockSmoothness, dirtMask.a * _DirtSmoothness, dirt));
                float3 L = normalize(_KeyDirection.xyz);
                float3 V = normalize(_WorldSpaceCameraPos.xyz - input.positionWS);
                float3 H = normalize(L + V);
                float lambert = saturate(dot(N, L));
                float diffuse = saturate(0.34 + lambert * 0.76);
                float3 color = baseColor * (_AmbientColor.rgb + _KeyColor.rgb * diffuse) * lerp(0.70, 1.0, ao);
                float specularPower = lerp(18.0, 54.0, smoothness);
                float specularStrength = lerp(0.012, 0.055, smoothness) * (1.0 - dirt * 0.45);
                color += _KeyColor.rgb * pow(saturate(dot(N, H)), specularPower) * specularStrength;
                return float4(color, 1.0);
            }
            ENDHLSL
        }
    }
    FallBack Off
}
