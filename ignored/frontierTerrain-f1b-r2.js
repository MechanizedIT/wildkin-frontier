// Deterministic, dependency-free terrain foundation for the streamed frontier.
import { ROCKY_TERRACE, sampleFrontierLandform } from './frontierLandform.js';

export const FRONTIER_TERRAIN_CONFIG = Object.freeze({
  chunkSize: 50,
  segments: 25,
  campBounds: Object.freeze({ minX: -50, maxX: 50, minZ: -50, maxZ: 50 }),
  campBlendDistance: 58,
  minHeight: 0,
  maxHeight: 16,
  defaultSeed: 0x4f1a2b3c,
});
// Short alias retained for callers that use the original slice API.
export const config = FRONTIER_TERRAIN_CONFIG;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

// A coordinate-seeded integer hash keeps the function independent of chunk order.
function hash2(x, z, seed) {
  let h = (Math.imul(x | 0, 0x45d9f3b) ^ Math.imul(z | 0, 0x119de1f3) ^ (seed | 0)) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function smooth(t) { return t * t * (3 - 2 * t); }
function valueNoise(x, z, seed, scale) {
  const px = x / scale, pz = z / scale;
  const x0 = Math.floor(px), z0 = Math.floor(pz);
  const tx = smooth(px - x0), tz = smooth(pz - z0);
  const a = hash2(x0, z0, seed), b = hash2(x0 + 1, z0, seed);
  const c = hash2(x0, z0 + 1, seed), d = hash2(x0 + 1, z0 + 1, seed);
  return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
}

function hillAt(x, z, cx, cz, rx, rz, height) {
  return height * Math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2));
}

function rollingTransitionOffset(x, z) {
  const transitionFade = smooth(clamp((z + 110) / 12, 0, 1));
  return (
    hillAt(x, z, -4, -92, 18, 32, 1.45)
    + hillAt(x, z, 19, -89, 17, 30, -.75)
  ) * transitionFade;
}

function globalHeight(x, z, seed, rollingTransition) {
  const broad = valueNoise(x, z, seed, 145) * 2 - 1;
  const middle = valueNoise(x + 37, z - 19, seed ^ 0x6e624eb7, 52) * 2 - 1;
  const detail = valueNoise(x - 11, z + 29, seed ^ 0x1f123bb5, 25) * 2 - 1;
  // These wide, global-space forms give the Camp approach an actual horizon:
  // a soft left shoulder, a shallow blue-green right valley, and distant rolls.
  const shoulder = hillAt(x, z, -82, -106, 88, 64, 3.0) + hillAt(x, z, 30, -176, 138, 72, 2.3);
  const basin = hillAt(x, z, 94, -108, 70, 55, 3.4) + hillAt(x, z, 48, -42, 82, 65, 1.05);
  const ridge = 1 - Math.abs(valueNoise(x + 91, z - 67, seed ^ 0x3c6ef372, 105) * 2 - 1);
  return clamp(4.8 + broad * 2.1 + middle * 1.05 + detail * .26 + shoulder + (ridge - .5) * .9 - basin + rollingTransition, config.minHeight, config.maxHeight);
}

function campSample(x, z, options) {
  const bounds = config.campBounds;
  const inside = x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;
  const callback = typeof options.campHeight === 'function' ? options.campHeight : () => 0;
  if (inside) return { edge: finite(callback(x, z), 0), t: 0, x, z };
  const cx = clamp(x, bounds.minX, bounds.maxX), cz = clamp(z, bounds.minZ, bounds.maxZ);
  const distance = Math.max(Math.abs(x - cx), Math.abs(z - cz));
  if (distance >= config.campBlendDistance) return null;
  const edge = finite(callback(cx, cz), 0);
  const t = smooth(distance / config.campBlendDistance);
  return { edge, t, x: cx, z: cz };
}

export function sampleFrontier(x, z, options = {}) {
  x = finite(x); z = finite(z);
  const seed = finite(options.seed, config.defaultSeed) | 0;
  // One signed world-space relief sample drives geometry and its restrained
  // drainage cue, so color cannot drift away from the rolling landform.
  const rollingTransition = rollingTransitionOffset(x, z);
  const terrain = globalHeight(x, z, seed, rollingTransition);
  const camp = campSample(x, z, options);
  const baseHeight = camp === null ? terrain : camp.edge * (1 - camp.t) + terrain * camp.t;
  const landform = sampleFrontierLandform(x, z);
  const height = baseHeight + landform.heightOffset;
  const wetNoise = valueNoise(x + 180, z - 220, seed ^ 0x51ed270b, 80);
  const lowland = clamp((8.0 - height) / 4.5, 0, 1);
  const wetland = clamp(wetNoise * 0.65 + lowland * 0.55, 0, 1);
  const upland = 1 - wetland;
  const macro = valueNoise(x - 70, z + 34, seed ^ 0x2f6e2b1, 34) * 2 - 1;
  let red = .235 * upland + .15 * wetland + macro * .025;
  let green = .43 * upland + .34 * wetland + macro * .035;
  let blue = .18 * upland + .32 * wetland + macro * .02;
  const dryRelief = clamp(rollingTransition / 1.1, 0, 1);
  const wetRelief = clamp(-rollingTransition / .42, 0, 1);
  red += dryRelief * .065 - wetRelief * .055;
  green += dryRelief * .05 - wetRelief * .04;
  blue += dryRelief * .015 + wetRelief * .025;
  if (camp !== null && typeof options.campColor === 'function') {
    const color = options.campColor(camp.x, camp.z);
    if (Array.isArray(color) && color.length === 3) {
      red = color[0] * (1 - camp.t) + red * camp.t;
      green = color[1] * (1 - camp.t) + green * camp.t;
      blue = color[2] * (1 - camp.t) + blue * camp.t;
    }
  }
  if (landform.colorRGB) {
    const t = landform.colorBlend;
    red += (landform.colorRGB[0] - red) * t;
    green += (landform.colorRGB[1] - green) * t;
    blue += (landform.colorRGB[2] - blue) * t;
  }
  return {
    // Camp authoring owns its exact finite height, including deliberate raised or sunk values.
    height: finite(height),
    habitatBlend: { fernUpland: upland, wetland },
    groundColorRGB: [clamp(red, 0, 1), clamp(green, 0, 1), clamp(blue, 0, 1)],
  };
}

export function worldToChunk(x, z) {
  return { cx: Math.floor(finite(x) / config.chunkSize), cz: Math.floor(finite(z) / config.chunkSize) };
}

export function chunkKey(cx, cz) { return `${Math.trunc(cx)},${Math.trunc(cz)}`; }

export function isCampChunk(cx, cz) { return cx === -1 || cx === 0 ? (cz === -1 || cz === 0) : false; }
export function createFrontierChunk(cx, cz, options = {}) {
  cx = Math.trunc(cx); cz = Math.trunc(cz);
  const n = config.segments, step = config.chunkSize / n;
  const origin = { x: cx * config.chunkSize, z: cz * config.chunkSize };
  const regularAxis = Array.from({ length: n + 1 }, (_, i) => i * step);
  const mergeAxis = (axis, breaks, worldOrigin) => Array.from(new Set([
    ...axis, ...breaks.map(value => value - worldOrigin).filter(value => value > 0 && value < config.chunkSize),
  ])).sort((a, b) => a - b);
  const special = cx === ROCKY_TERRACE.chunk.cx && cz === ROCKY_TERRACE.chunk.cz;
  const xs = special ? mergeAxis(regularAxis, ROCKY_TERRACE.xBreaks, origin.x) : regularAxis;
  const zs = special ? mergeAxis(regularAxis, ROCKY_TERRACE.zBreaks, origin.z) : regularAxis;
  const nxCount = xs.length, nzCount = zs.length;
  const count = nxCount * nzCount, vertices = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let iz = 0; iz < nzCount; iz++) for (let ix = 0; ix < nxCount; ix++) {
    const i = iz * nxCount + ix, x = origin.x + xs[ix], z = origin.z + zs[iz];
    const sample = sampleFrontier(x, z, options);
    vertices[i * 3] = xs[ix]; vertices[i * 3 + 1] = sample.height; vertices[i * 3 + 2] = zs[iz];
    colors.set(sample.groundColorRGB, i * 3);
  }
  const indices = new Uint32Array((nxCount - 1) * (nzCount - 1) * 6);
  let cursor = 0;
  for (let iz = 0; iz < nzCount - 1; iz++) for (let ix = 0; ix < nxCount - 1; ix++) {
    const a = iz * nxCount + ix, b = a + 1, c = a + nxCount, d = c + 1;
    indices.set([a, c, b, b, c, d], cursor); cursor += 6;
  }
  const normals = new Float32Array(count * 3);
  for (let iz = 0; iz < nzCount; iz++) for (let ix = 0; ix < nxCount; ix++) {
    const i = iz * nxCount + ix, wx = origin.x + xs[ix], wz = origin.z + zs[iz];
    // Sample in world space so an edge vertex has the same gradient in either chunk.
    const l = sampleFrontier(wx - step, wz, options).height, r = sampleFrontier(wx + step, wz, options).height;
    const d = sampleFrontier(wx, wz - step, options).height, u = sampleFrontier(wx, wz + step, options).height;
    const nx = (l - r) / (2 * step), nz = (d - u) / (2 * step), length = Math.hypot(nx, 1, nz) || 1;
    normals.set([nx / length, 1 / length, nz / length], i * 3);
  }
  let minY = Infinity, maxY = -Infinity;
  for (let i = 1; i < vertices.length; i += 3) { minY = Math.min(minY, vertices[i]); maxY = Math.max(maxY, vertices[i]); }
  return { id: chunkKey(cx, cz), traversalSurface: 'terrain', origin, vertices, indices, normals, colors,
    bounds: { min: { x: 0, y: minY, z: 0 }, max: { x: config.chunkSize, y: maxY, z: config.chunkSize } } };
}
