import { FRONTIER_REGION_CATALOG } from './frontierRegionCatalog.js';
import { DEFAULT_FRONTIER_WORLD, frontierDomainSeed, normalizeFrontierWorld } from './frontierWorld.js';

export const FRONTIER_REGION_CONFIG = Object.freeze({
  blendGap: 180,
  reserveFade: 70,
  minHeight: 0,
  maxHeight: 84,
});

const REGION_DOMAIN = 'terrain-regions';
const REGION_SALT = 0x72a4f19d;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const clamp01 = value => clamp(value, 0, 1);
const smooth = value => { const t = clamp01(value); return t * t * (3 - 2 * t); };
const sanitizeCoordinate = value => Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER ? value : 0;

function hash2(x, z, seed) {
  let value = (Math.imul(x | 0, 0x45d9f3b) ^ Math.imul(z | 0, 0x119de1f3) ^ (seed | 0)) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

function unitHash(x, z, seed) { return hash2(x, z, seed) / 0xffffffff; }

function valueNoise(x, z, seed, scale) {
  const px = x / scale, pz = z / scale;
  const x0 = Math.floor(px), z0 = Math.floor(pz);
  const tx = smooth(px - x0), tz = smooth(pz - z0);
  const a = unitHash(x0, z0, seed), b = unitHash(x0 + 1, z0, seed);
  const c = unitHash(x0, z0 + 1, seed), d = unitHash(x0 + 1, z0 + 1, seed);
  return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
}

function distanceToRect(x, z, minX, maxX, minZ, maxZ) {
  const dx = Math.max(minX - x, 0, x - maxX);
  const dz = Math.max(minZ - z, 0, z - maxZ);
  return Math.hypot(dx, dz);
}

export function frontierRegionInfluence(x, z) {
  const camp = distanceToRect(x, z, -108, 108, -108, 108);
  const corridor = distanceToRect(x, z, -75, 75, -275, -50);
  return smooth(Math.min(camp, corridor) / FRONTIER_REGION_CONFIG.reserveFade);
}

function resolveSeed(options) {
  if (options.world !== undefined) {
    return frontierDomainSeed(normalizeFrontierWorld(options.world), REGION_DOMAIN, REGION_SALT);
  }
  if (Number.isInteger(options.seed) && options.seed >= 0 && options.seed <= 0xffffffff) return options.seed >>> 0;
  return frontierDomainSeed(DEFAULT_FRONTIER_WORLD, REGION_DOMAIN, REGION_SALT);
}

function lushHeight(x, z, seed) {
  const broad = valueNoise(x, z, seed ^ 0x1835a7c9, 250) * 2 - 1;
  const roll = valueNoise(x + 83, z - 41, seed ^ 0x6c8e9cf5, 105) * 2 - 1;
  return clamp(10 + broad * 5.5 + roll * 2.2, 2, 19);
}

function sunscarHeight(x, z, seed) {
  const angle = unitHash(17, -31, seed ^ 0xa54ff53a) * Math.PI;
  const axis = x * Math.cos(angle) + z * Math.sin(angle);
  const bend = (valueNoise(x - 140, z + 90, seed ^ 0x510e527f, 300) - .5) * 70;
  const phase = (axis + bend - 33) * Math.PI * 2 / 92;
  const asymmetric = Math.cos(phase) + Math.cos(phase * 2 + .82) * .24
    + Math.sin(phase * 3 - .38) * .09;
  const pinch = valueNoise(x + 115, z - 65, seed ^ 0x7f4a7c15, 145) - .5;
  const rib = .5 + .5 * Math.tanh((asymmetric - pinch * .55 - .12) * 1.65);
  const broken = .62 + valueNoise(x - 75, z + 125, seed ^ 0x3bd39e10, 175) * .38;
  const basin = valueNoise(x + 210, z - 170, seed ^ 0x9b05688c, 420);
  return clamp(3.5 + basin * 3.2 + rib * 14 * broken, 2.5, 21.5);
}

function ironspineHeight(x, z, seed) {
  const angle = unitHash(-53, 29, seed ^ 0x1f83d9ab) * Math.PI;
  const cross = x * -Math.sin(angle) + z * Math.cos(angle);
  const bend = (valueNoise(x + 330, z - 260, seed ^ 0x5be0cd19, 520) - .5) * 150;
  const ridgeWave = (1 + Math.cos((cross + bend) * Math.PI / 190)) * .5;
  const ridgeBreak = .58 + valueNoise(x - 95, z + 155, seed ^ 0xcbbb9d5d, 240) * .42;
  return clamp(8 + ridgeWave ** 2 * 70 * ridgeBreak
    + (valueNoise(x, z, seed ^ 0x629a292a, 620) - .5) * 8, 4, 84);
}

const PALETTES = Object.freeze({
  lush: Object.freeze([0.18, 0.43, 0.2]),
  ironspine: Object.freeze([0.25, 0.31, 0.32]),
});
const SUNSCAR_TROUGH = Object.freeze([0.39, 0.27, 0.29]);
const SUNSCAR_RIDGE = Object.freeze([0.78, 0.59, 0.34]);
const RESERVED_WEIGHTS = Object.freeze({ lush: 0, sunscar: 0, ironspine: 0 });
const RESERVED_COLOR = Object.freeze([0, 0, 0]);

function blendRGB(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function calculateHabitatWeights(x, z) {
  const distances = FRONTIER_REGION_CATALOG.map((record, index) => ({
    record,
    index,
    distance: Math.hypot(x - record.x, z - record.z),
  })).sort((a, b) => a.distance - b.distance || a.index - b.index);
  const nearest = distances[0];
  let total = 0;
  const contributors = [];
  for (const candidate of distances) {
    const q = clamp01(1 - (candidate.distance - nearest.distance) / FRONTIER_REGION_CONFIG.blendGap);
    if (q <= 0) break;
    const weight = smooth(q);
    total += weight;
    contributors.push({ record: candidate.record, weight });
  }
  const habitatWeights = {};
  for (const contributor of contributors) {
    contributor.weight /= total;
    habitatWeights[contributor.record.habitatId] = contributor.weight;
  }
  return { owner: nearest.record, contributors, habitatWeights };
}

function sampleResolved(x, z, seed) {
  const influence = frontierRegionInfluence(x, z);
  const { owner, contributors, habitatWeights } = calculateHabitatWeights(x, z);
  if (influence === 0) {
    return {
      id: null,
      kind: null,
      influence: 0,
      height: 0,
      colorRGB: RESERVED_COLOR,
      weights: RESERVED_WEIGHTS,
      habitatId: owner.habitatId,
      habitatName: owner.name,
      habitatWeights,
    };
  }

  const weights = { lush: 0, sunscar: 0, ironspine: 0 };
  for (const { record, weight } of contributors) weights[record.baseKind] += weight;
  const heights = {
    lush: weights.lush > 0 ? lushHeight(x, z, seed) : 0,
    sunscar: weights.sunscar > 0 ? sunscarHeight(x, z, seed) : 0,
    ironspine: weights.ironspine > 0 ? ironspineHeight(x, z, seed) : 0,
  };
  const height = clamp(heights.lush * weights.lush + heights.sunscar * weights.sunscar
    + heights.ironspine * weights.ironspine, FRONTIER_REGION_CONFIG.minHeight, FRONTIER_REGION_CONFIG.maxHeight);
  const sunscarColor = blendRGB(SUNSCAR_TROUGH, SUNSCAR_RIDGE, smooth((heights.sunscar - 5) / 13));
  const colorRGB = [
    PALETTES.lush[0] * weights.lush + sunscarColor[0] * weights.sunscar + PALETTES.ironspine[0] * weights.ironspine,
    PALETTES.lush[1] * weights.lush + sunscarColor[1] * weights.sunscar + PALETTES.ironspine[1] * weights.ironspine,
    PALETTES.lush[2] * weights.lush + sunscarColor[2] * weights.sunscar + PALETTES.ironspine[2] * weights.ironspine,
  ];
  return {
    id: `f1:habitat:${owner.habitatId}`,
    kind: owner.baseKind,
    influence,
    height,
    colorRGB,
    weights,
    habitatId: owner.habitatId,
    habitatName: owner.name,
    habitatWeights,
  };
}

export function sampleFrontierRegion(x, z, options = {}) {
  return sampleResolved(sanitizeCoordinate(x), sanitizeCoordinate(z), resolveSeed(options));
}

export function createFrontierRegionSampler(world = DEFAULT_FRONTIER_WORLD) {
  const seed = resolveSeed({ world: normalizeFrontierWorld(world) });
  return (x, z) => sampleResolved(sanitizeCoordinate(x), sanitizeCoordinate(z), seed);
}
