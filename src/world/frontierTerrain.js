// Deterministic, dependency-free terrain foundation for the streamed frontier.
import { ROCKY_TERRACE, sampleFrontierLandform } from './frontierLandform.js';
import { DEFAULT_FRONTIER_WORLD, frontierDomainSeed } from './frontierWorld.js';

export const FRONTIER_TERRAIN_CONFIG = Object.freeze({
  chunkSize: 50,
  segments: 25,
  skybreakSegments: 50,
  campBounds: Object.freeze({ minX: -50, maxX: 50, minZ: -50, maxZ: 50 }),
  campBlendDistance: 58,
  minHeight: 0,
  maxHeight: 16,
  defaultSeed: DEFAULT_FRONTIER_WORLD.seed,
});
// Short alias retained for callers that use the original slice API.
export const config = FRONTIER_TERRAIN_CONFIG;

const SKYBREAK_REGULAR_AXIS = Object.freeze(Array.from(
  { length: FRONTIER_TERRAIN_CONFIG.skybreakSegments + 1 },
  (_, i) => i * FRONTIER_TERRAIN_CONFIG.chunkSize / FRONTIER_TERRAIN_CONFIG.skybreakSegments,
));
const SKYBREAK_TERRACE_X_AXIS = Object.freeze(Array.from(new Set([
  ...SKYBREAK_REGULAR_AXIS,
  ...ROCKY_TERRACE.xBreaks.filter(value => value > 0 && value < FRONTIER_TERRAIN_CONFIG.chunkSize),
])).sort((a, b) => a - b));
const SKYBREAK_REGULAR_AXES = Object.freeze({ xs: SKYBREAK_REGULAR_AXIS, zs: SKYBREAK_REGULAR_AXIS });
const SKYBREAK_TERRACE_AXES = Object.freeze({ xs: SKYBREAK_TERRACE_X_AXIS, zs: SKYBREAK_REGULAR_AXIS });

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

function surfaceKindFor(landformKind) {
  if (landformKind === 'skybreak-crown' || landformKind === 'skybreak-table') return 'skybreak-cap';
  if (landformKind === 'skybreak-buttress' || landformKind === 'skybreak-cliff') return 'skybreak-shoulder';
  return landformKind === 'skybreak-lowland' ? 'skybreak-lowland' : null;
}

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
    hillAt(x, z, -1, -92, 12, 28, 1.65)
    + hillAt(x, z, 13, -89, 12, 28, -.95)
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

function sampleFrontierRaw(x, z, options = {}) {
  x = finite(x); z = finite(z);
  // Explicit legacy seed calls remain stable. A world descriptor instead owns
  // the terrain stream and keeps its random domain independent of content.
  const seed = (options.world === undefined
    ? finite(options.seed, config.defaultSeed)
    : frontierDomainSeed(options.world, 'terrain', config.defaultSeed)) | 0;
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
    surfaceKind: surfaceKindFor(landform.kind),
  };
}

export function worldToChunk(x, z) {
  return { cx: Math.floor(finite(x) / config.chunkSize), cz: Math.floor(finite(z) / config.chunkSize) };
}

export function isSkybreakDetailChunk(cx, cz) {
  return (cx === -1 || cx === 0) && (cz === -5 || cz === -4);
}

function coarseEdgeHeight(x, z, alongX, options) {
  const step = config.chunkSize / config.segments;
  const value = alongX ? x : z;
  let low = Math.floor(value / step) * step, high = low + step;
  // The preserved terrace owns an extra 42.08m vertex on its south boundary.
  // Match that actual neighbor curve instead of assuming every coarse edge has
  // a uniform stride.
  if (alongX && z === -150) {
    const edgeBreaks = ROCKY_TERRACE.xBreaks.filter(v => v > low && v < high);
    for (const breakpoint of edgeBreaks) {
      if (value < breakpoint) high = Math.min(high, breakpoint);
      else low = Math.max(low, breakpoint);
    }
  }
  const t = (value - low) / (high - low);
  const a = alongX ? sampleFrontierRaw(low, z, options).height : sampleFrontierRaw(x, low, options).height;
  const b = alongX ? sampleFrontierRaw(high, z, options).height : sampleFrontierRaw(x, high, options).height;
  return a + (b - a) * t;
}

function detailedVertexHeight(x, z, options) {
  const onOuterX = x === -50 || x === 50;
  const onOuterZ = z === -250 || z === -150;
  if (onOuterX && onOuterZ) return Math.fround(sampleFrontierRaw(x, z, options).height);
  if (onOuterX) return Math.fround(coarseEdgeHeight(x, z, false, options));
  if (onOuterZ) return Math.fround(coarseEdgeHeight(x, z, true, options));
  return Math.fround(sampleFrontierRaw(x, z, options).height);
}

function detailAxes(cx, cz) {
  return cx === ROCKY_TERRACE.chunk.cx ? SKYBREAK_TERRACE_AXES : SKYBREAK_REGULAR_AXES;
}

function axisCell(axis, value) {
  let low = 0, high = axis.length - 1;
  while (low + 1 < high) {
    const middle = (low + high) >> 1;
    if (axis[middle] <= value) low = middle;
    else high = middle;
  }
  return Math.min(low, axis.length - 2);
}

function detailedTriangleHeight(x, z, cx, cz, options) {
  const originX = cx * config.chunkSize, originZ = cz * config.chunkSize;
  const localX = clamp(x - originX, 0, config.chunkSize);
  const localZ = clamp(z - originZ, 0, config.chunkSize);
  const { xs, zs } = detailAxes(cx, cz);
  const ix = axisCell(xs, localX), iz = axisCell(zs, localZ);
  const x0 = originX + xs[ix], x1 = originX + xs[ix + 1];
  const z0 = originZ + zs[iz], z1 = originZ + zs[iz + 1];
  const tx = (x - x0) / (x1 - x0), tz = (z - z0) / (z1 - z0);
  const a = detailedVertexHeight(x0, z0, options);
  const b = detailedVertexHeight(x1, z0, options);
  const c = detailedVertexHeight(x0, z1, options);
  const d = detailedVertexHeight(x1, z1, options);
  if (tx + tz <= 1) return a + (b - a) * tx + (c - a) * tz;
  return b * (1 - tz) + c * (1 - tx) + d * (tx + tz - 1);
}

export function sampleFrontier(x, z, options = {}) {
  x = finite(x); z = finite(z);
  const sample = sampleFrontierRaw(x, z, options);
  const { cx, cz } = worldToChunk(x, z);
  if (!isSkybreakDetailChunk(cx, cz)) return sample;
  return { ...sample, height: finite(detailedTriangleHeight(x, z, cx, cz, options)) };
}

export function chunkKey(cx, cz) { return `${Math.trunc(cx)},${Math.trunc(cz)}`; }

export function isCampChunk(cx, cz) { return cx === -1 || cx === 0 ? (cz === -1 || cz === 0) : false; }
export function createFrontierChunk(cx, cz, options = {}) {
  cx = Math.trunc(cx); cz = Math.trunc(cz);
  const detailed = isSkybreakDetailChunk(cx, cz);
  const n = detailed ? config.skybreakSegments : config.segments;
  const step = config.chunkSize / n;
  const normalStep = config.chunkSize / config.segments;
  const origin = { x: cx * config.chunkSize, z: cz * config.chunkSize };
  const regularAxis = detailed ? null : Array.from({ length: n + 1 }, (_, i) => i * step);
  const mergeAxis = (axis, breaks, worldOrigin) => Array.from(new Set([
    ...axis, ...breaks.map(value => value - worldOrigin).filter(value => value > 0 && value < config.chunkSize),
  ])).sort((a, b) => a - b);
  const special = cx === ROCKY_TERRACE.chunk.cx && cz === ROCKY_TERRACE.chunk.cz;
  const detailedAxes = detailed ? detailAxes(cx, cz) : null;
  const xs = detailed ? detailedAxes.xs : (special ? mergeAxis(regularAxis, ROCKY_TERRACE.xBreaks, origin.x) : regularAxis);
  const zs = detailed ? detailedAxes.zs : (special ? mergeAxis(regularAxis, ROCKY_TERRACE.zBreaks, origin.z) : regularAxis);
  const nxCount = xs.length, nzCount = zs.length;
  const count = nxCount * nzCount, vertices = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let iz = 0; iz < nzCount; iz++) for (let ix = 0; ix < nxCount; ix++) {
    const i = iz * nxCount + ix, x = origin.x + xs[ix], z = origin.z + zs[iz];
    const sample = sampleFrontierRaw(x, z, options);
    const height = detailed ? detailedVertexHeight(x, z, options) : sample.height;
    vertices[i * 3] = xs[ix]; vertices[i * 3 + 1] = height; vertices[i * 3 + 2] = zs[iz];
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
    const l = sampleFrontier(wx - normalStep, wz, options).height, r = sampleFrontier(wx + normalStep, wz, options).height;
    const d = sampleFrontier(wx, wz - normalStep, options).height, u = sampleFrontier(wx, wz + normalStep, options).height;
    const nx = (l - r) / (2 * normalStep), nz = (d - u) / (2 * normalStep), length = Math.hypot(nx, 1, nz) || 1;
    normals.set([nx / length, 1 / length, nz / length], i * 3);
  }
  let minY = Infinity, maxY = -Infinity;
  for (let i = 1; i < vertices.length; i += 3) { minY = Math.min(minY, vertices[i]); maxY = Math.max(maxY, vertices[i]); }
  return { id: chunkKey(cx, cz), traversalSurface: 'terrain', origin, vertices, indices, normals, colors,
    grid: { xs: Float32Array.from(xs), zs: Float32Array.from(zs) },
    bounds: { min: { x: 0, y: minY, z: 0 }, max: { x: config.chunkSize, y: maxY, z: config.chunkSize } } };
}
