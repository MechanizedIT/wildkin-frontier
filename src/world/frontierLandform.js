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

// Conservative content-clearance and slope-check envelope. The actual raised
// surface stays inset so its detailed mesh can meet ordinary neighboring chunks
// on their unchanged two-metre edge curves.
export const SKYBREAK_BOUNDS = Object.freeze({ minX: -34, maxX: 49, minZ: -249, maxZ: -152 });
export const SKYBREAK_ANCHORS = Object.freeze({
  base: Object.freeze({ x: 4, z: -153 }),
  entryShelf: Object.freeze({ x: 4, z: -166 }),
  crown: Object.freeze({ x: 12, z: -228 }),
  northHorn: Object.freeze({ x: -14, z: -239 }),
});

export function isSkybreakArea(x, z, margin = 0) {
  const m = Number.isFinite(margin) ? Math.max(0, margin) : 0;
  return Number.isFinite(x) && Number.isFinite(z)
    && x >= SKYBREAK_BOUNDS.minX - m && x <= SKYBREAK_BOUNDS.maxX + m
    && z >= SKYBREAK_BOUNDS.minZ - m && z <= SKYBREAK_BOUNDS.maxZ + m;
}

export const SKYBREAK_ROUTE = Object.freeze([
  Object.freeze({ x: 4, z: -153, lift: 0 }),
  Object.freeze({ x: 4, z: -166, lift: 4.5 }),
  Object.freeze({ x: -7, z: -184, lift: 10.8 }),
  Object.freeze({ x: 5, z: -204, lift: 21 }),
  Object.freeze({ x: 12, z: -228, lift: 30.6 }),
  Object.freeze({ x: 29, z: -213, lift: 23.5 }),
  Object.freeze({ x: 36, z: -188, lift: 12 }),
  Object.freeze({ x: 32, z: -156, lift: 0 }),
]);

function nearestRouteAt(x, z) {
  let nearest = { distance: Infinity, lift: 0, segment: 0, t: 0 };
  for (let i = 1; i < SKYBREAK_ROUTE.length; i += 1) {
    const a = SKYBREAK_ROUTE[i - 1], b = SKYBREAK_ROUTE[i];
    const dx = b.x - a.x, dz = b.z - a.z;
    const t = clamp01(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz));
    const distance = Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
    if (distance < nearest.distance) nearest = { distance, lift: a.lift + (b.lift - a.lift) * t, segment: i - 1, t };
  }
  return nearest;
}

function lobeSample(x, z, lobe) {
  const wx = x - lobe.x, wz = z - lobe.z;
  const qz = wz / lobe.rz;
  const qx = wx / lobe.rx + qz * (lobe.skew ?? 0);
  const angle = Math.atan2(qz, qx);
  // Low-frequency lobes establish the silhouette. A tight inward harmonic makes
  // one eroded bite while a broad outward harmonic prevents regular polygon pads.
  const bulge = Math.max(0, Math.cos(angle - lobe.phase - 0.75)) ** 4;
  const bite = Math.max(0, Math.cos(angle - lobe.phase + 1.2)) ** 8;
  const edge = Math.max(0.66, 1
    + Math.sin(angle * 3 + lobe.phase) * 0.13
    + Math.sin(angle * 5 - lobe.phase * 1.3) * 0.065
    + Math.sin(angle * 8 + lobe.phase * 0.7) * 0.035
    + bulge * 0.11 - bite * 0.17);
  const distance = Math.hypot(qx, qz) / edge;
  const shoulder = lobe.shoulder * (0.86 + (0.5 + Math.sin(angle * 4 - lobe.phase) * 0.5) * 0.28);
  const cliff = lobe.lift * (1 - smoothstep(1, 1 + shoulder, distance));
  // A lower, wider asymmetric toe catches the cliff before it becomes a single
  // curtain wall and fades into ordinary ground as an eroded talus buttress.
  const toeStart = 1 + shoulder * 0.55;
  const toeReach = (lobe.talus ?? 0.62) * (0.76 + (0.5 + Math.sin(angle * 3 + lobe.phase * 1.7) * 0.5) * 0.42);
  const toeLift = Math.min(5.4, Math.max(1.1, lobe.lift * 0.22));
  const toe = toeLift * (1 - smoothstep(toeStart, toeStart + toeReach, distance));
  return {
    height: Math.max(cliff, toe),
    top: distance <= 1,
    distance,
    role: lobe.role,
  };
}

const SKYBREAK_LOBES = Object.freeze([
  // Six unequal route-bearing mesas with open lowland between their shoulders.
  Object.freeze({ x: 4, z: -166, lift: 4.5, rx: 10, rz: 6.5, shoulder: 0.48, talus: 0.68, skew: -0.12, phase: 2.2, role: 'table' }),
  Object.freeze({ x: -7, z: -184, lift: 10.8, rx: 10, rz: 7, shoulder: 0.44, talus: 0.64, skew: 0.15, phase: 1.1, role: 'table' }),
  Object.freeze({ x: 5, z: -204, lift: 21, rx: 11, rz: 7.5, shoulder: 0.44, talus: 0.7, skew: -0.16, phase: 2.8, role: 'table' }),
  Object.freeze({ x: 29, z: -213, lift: 23.5, rx: 10, rz: 7.5, shoulder: 0.44, talus: 0.66, skew: 0.17, phase: 5.2, role: 'table' }),
  Object.freeze({ x: 36, z: -188, lift: 12, rx: 9, rz: 7.5, shoulder: 0.46, talus: 0.72, skew: -0.13, phase: 0.8, role: 'table' }),
  // Dominant crown: one broad table with asymmetric same-height lobes.
  Object.freeze({ x: 12, z: -228, lift: 30.6, rx: 9, rz: 6.6, shoulder: 0.56, talus: 0.72, skew: -0.11, phase: 1.8, role: 'crown' }),
  Object.freeze({ x: 6, z: -232, lift: 29.9, rx: 7.5, rz: 6.3, shoulder: 0.5, talus: 0.66, skew: 0.17, phase: 3.0, role: 'crown' }),
  Object.freeze({ x: 18, z: -225, lift: 30.1, rx: 7.4, rz: 5.8, shoulder: 0.52, talus: 0.7, skew: -0.18, phase: 4.8, role: 'crown' }),
  // The detached side landmark is a narrow bitten tower, not another round pad.
  Object.freeze({ x: -14, z: -239, lift: 24, rx: 4.2, rz: 7.4, shoulder: 0.48, talus: 0.64, skew: 0.2, phase: 3.8, role: 'horn' }),
]);

const SKYBREAK_ROUTE_WIDTHS = Object.freeze([
  Object.freeze({ core: 4.2, blend: 6.5 }),
  Object.freeze({ core: 3.5, blend: 6.2 }),
  Object.freeze({ core: 4.4, blend: 7.1 }),
  Object.freeze({ core: 4, blend: 6.8 }),
  Object.freeze({ core: 4.6, blend: 7.2 }),
  Object.freeze({ core: 3.7, blend: 6.4 }),
  Object.freeze({ core: 4.8, blend: 7.4 }),
]);

function sampleSkybreak(x, z) {
  if (!isSkybreakArea(x, z)) return null;
  const route = nearestRouteAt(x, z);
  let strongest = { height: 0, top: false, distance: Infinity, role: null };
  let nearestLobeDistance = Infinity;
  for (const lobe of SKYBREAK_LOBES) {
    const sample = lobeSample(x, z, lobe);
    nearestLobeDistance = Math.min(nearestLobeDistance, sample.distance);
    if (sample.height > strongest.height) strongest = sample;
  }
  let heightOffset = strongest.height;
  let buttressWeight = 0;
  // Route help stays inside a narrow local corridor. Surrounding table pixels stay
  // lobe-owned, so traversal crosses broad faces without a global height baseline.
  const routeWidth = SKYBREAK_ROUTE_WIDTHS[route.segment];
  const widthPulse = 0.88 + (0.5 + Math.sin((route.t + route.segment * 0.37) * Math.PI * 2) * 0.5) * 0.24;
  const coreWidth = strongest.top ? 2.6 : routeWidth.core * widthPulse;
  const blendWidth = strongest.top ? 3.8 : routeWidth.blend * widthPulse;
  if (route.distance < blendWidth) {
    const lateral = 1 - smoothstep(coreWidth, blendWidth, route.distance);
    buttressWeight = lateral;
    heightOffset += (route.lift - heightOffset) * buttressWeight;
  }
  const boundaryFade = smoothstep(SKYBREAK_BOUNDS.minX, SKYBREAK_BOUNDS.minX + 2, x)
    * (1 - smoothstep(SKYBREAK_BOUNDS.maxX - 2, SKYBREAK_BOUNDS.maxX, x))
    * smoothstep(SKYBREAK_BOUNDS.minZ, SKYBREAK_BOUNDS.minZ + 2, z)
    * (1 - smoothstep(SKYBREAK_BOUNDS.maxZ - 2, SKYBREAK_BOUNDS.maxZ, z));
  heightOffset *= boundaryFade;
  if (heightOffset <= 0.015) {
    if (nearestLobeDistance < 2.15) {
      return { heightOffset: 0, colorRGB: [0.18, 0.3, 0.25], colorBlend: 0.14, kind: 'skybreak-lowland' };
    }
    return null;
  }

  if (strongest.top) {
    const crown = heightOffset > 26;
    return { heightOffset, colorRGB: crown ? [0.2, 0.4, 0.12] : [0.19, 0.36, 0.13], colorBlend: crown ? 0.54 : 0.48, kind: crown ? 'skybreak-crown' : 'skybreak-table' };
  }
  if (strongest.role === null && buttressWeight > 0.45) {
    return { heightOffset, colorRGB: [0.25, 0.38, 0.18], colorBlend: 0.32, kind: 'skybreak-buttress' };
  }
  const strata = ((Math.floor(x * 0.7 - z * 0.45) & 1) ? 0.025 : -0.02);
  return { heightOffset, colorRGB: [0.4 + strata, 0.32 + strata, 0.21 + strata], colorBlend: 0.86, kind: 'skybreak-cliff' };
}

export function sampleFrontierLandform(x, z) {
  const skybreak = sampleSkybreak(x, z);
  if (skybreak) return skybreak;

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
