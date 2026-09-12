const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smoothstep = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export const ROCKY_TERRACE = Object.freeze({
  chunk: Object.freeze({ cx: 0, cz: -3 }),
  height: 3,
  // World-space breakpoints. The paired 8cm rows make the exposed lips actual
  // geometry rather than a steep interpolation across the regular 2m grid.
  xBreaks: Object.freeze([20, 22, 26, 28, 40, 42, 42.08, 44]),
  zBreaks: Object.freeze([-148, -146, -143, -128, -127, -124.08, -124, -116, -110]),
});

export function sampleFrontierLandform(x, z) {
  if (x < 20 || x > 44 || z < -148 || z > -110) {
    return { heightOffset: 0, colorRGB: null, colorBlend: 0, kind: null };
  }

  const north = smoothstep(-148, -146, z);
  const southLip = 1 - smoothstep(-124.08, -124, z);
  const left = smoothstep(26, 28, x);
  const rightLip = 1 - smoothstep(42, 42.08, x);
  const shelf = north * southLip * left * rightLip;

  // Four clear metres across the left route (x=22..26), rising 3m over 12m.
  const rampWidth = smoothstep(20, 22, x) * (1 - smoothstep(26, 28, x));
  const rampRise = 1 - smoothstep(-128, -116, z);
  const ramp = north * rampWidth * rampRise;
  // The ramp's right fade and shelf's left rise intentionally overlap. Their
  // sum keeps the upper route continuous across x=26..28; max() would carve an
  // analytic trough between two full-height mesh vertices.
  const heightOffset = ROCKY_TERRACE.height * Math.min(1, shelf + ramp);

  const onSouthFace = x >= 28 && x <= 42.08 && z >= -124.08 && z <= -124;
  const onRightFace = x >= 42 && x <= 42.08 && z >= -146 && z <= -124.08;
  if ((onSouthFace || onRightFace) && heightOffset < ROCKY_TERRACE.height * 0.98) {
    const strata = ((Math.floor((x * 1.7 - z * 1.3)) & 1) ? 0.018 : -0.018);
    return { heightOffset, colorRGB: [0.31 + strata, 0.30 + strata, 0.27 + strata], colorBlend: 0.94, kind: 'cliff' };
  }
  if (ramp > shelf && rampWidth > 0.5) {
    return { heightOffset, colorRGB: [0.48, 0.39, 0.22], colorBlend: 0.72, kind: 'ramp' };
  }
  if (heightOffset > 0.05) {
    return { heightOffset, colorRGB: [0.25, 0.43, 0.18], colorBlend: 0.24, kind: 'shelf' };
  }
  return { heightOffset: 0, colorRGB: null, colorBlend: 0, kind: null };
}
