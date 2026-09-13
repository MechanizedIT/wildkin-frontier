import { DEFAULT_FRONTIER_WORLD, frontierDomainSeed, normalizeFrontierWorld } from './frontierWorld.js';

export const FRONTIER_REGION_CONFIG = Object.freeze({
  siteSpacing: 600,
  siteJitter: 150,
  supportRadius: 740,
  reserveFade: 70,
  minHeight: 0,
  maxHeight: 84,
});

const REGION_DOMAIN = 'terrain-regions';
const REGION_SALT = 0x72a4f19d;
const CANDIDATE_RADIUS = 1;

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const clamp01 = value => clamp(value, 0, 1);
const smooth = value => { const t = clamp01(value); return t * t * (3 - 2 * t); };

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
  // The first rectangle preserves Camp and its complete 58m authored blend
  // apron. The connected corridor preserves the starter route, terrace and
  // selected Skybreak fixture. Provinces remain coherent beneath the reserve.
  const camp = distanceToRect(x, z, -108, 108, -108, 108);
  const corridor = distanceToRect(x, z, -75, 75, -275, -50);
  return smooth(Math.min(camp, corridor) / FRONTIER_REGION_CONFIG.reserveFade);
}

function kernel(distance) {
  const q = clamp01(1 - distance / FRONTIER_REGION_CONFIG.supportRadius);
  // A powered Wendland C2 kernel has zero value and slope at its compact edge.
  // Summing every supported site avoids nearest-two discontinuities at triples.
  const base = q ** 4 * (1 + 4 * (1 - q));
  return base * base * base;
}

function profileKind(index) {
  return index === 1 ? 'sunscar' : index === 2 ? 'ironspine' : 'lush';
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
  // The fixed Sunscar arrival faces north (-Z). This global phase places a
  // readable near flank in that view without making the province camera-aware.
  const phase = (axis + bend - 33) * Math.PI * 2 / 92;
  // Unequal harmonics keep successive 92m ribs long and directional without
  // turning them into identical sine stripes. A second broad field breaks and
  // lowers portions of a crest while leaving connected approaches around it.
  const asymmetric = Math.cos(phase) + Math.cos(phase * 2 + .82) * .24
    + Math.sin(phase * 3 - .38) * .09;
  const pinch = valueNoise(x + 115, z - 65, seed ^ 0x7f4a7c15, 145) - .5;
  // A smooth sigmoid avoids the prior clipped basin floor and hard mask edge.
  // The slow threshold shift pinches and offsets successive crest portions.
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

function blendRGB(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/**
 * Pure broad-province sample. `height` is an absolute regional target; terrain
 * integration decides how to combine it with the protected legacy surface.
 */
function createSite(siteXCell, siteZCell, seed) {
  const token = hash2(siteXCell, siteZCell, seed ^ 0x13198a2e);
  return Object.freeze({
    xCell: siteXCell,
    zCell: siteZCell,
    token,
    kind: token % 3,
    x: (siteXCell + .5) * FRONTIER_REGION_CONFIG.siteSpacing
      + (unitHash(siteXCell, siteZCell, seed ^ 0x03707344) * 2 - 1) * FRONTIER_REGION_CONFIG.siteJitter,
    z: (siteZCell + .5) * FRONTIER_REGION_CONFIG.siteSpacing
      + (unitHash(siteXCell, siteZCell, seed ^ 0xa4093822) * 2 - 1) * FRONTIER_REGION_CONFIG.siteJitter,
  });
}

const RESERVED_WEIGHTS = Object.freeze({ lush: 0, sunscar: 0, ironspine: 0 });
const RESERVED_COLOR = Object.freeze([0, 0, 0]);

function sampleResolved(x, z, seed, getSiteWindow = null) {
  const influence = frontierRegionInfluence(x, z);
  if (influence === 0) {
    return { id: null, kind: null, influence: 0, height: 0, colorRGB: RESERVED_COLOR, weights: RESERVED_WEIGHTS };
  }
  const spacing = FRONTIER_REGION_CONFIG.siteSpacing;
  const warpX = (valueNoise(x, z, seed ^ 0x243f6a88, 1150) - .5) * 150;
  const warpZ = (valueNoise(x + 417, z - 263, seed ^ 0x85a308d3, 1150) - .5) * 150;
  const qx = x + warpX, qz = z + warpZ;
  // Center the 3x3 candidate window on warped space. At a cell boundary, every
  // entering/leaving site is at least 750m away, beyond the 740m support.
  const centerX = Math.floor(qx / spacing), centerZ = Math.floor(qz / spacing);
  let total = 0, lushWeight = 0, sunscarWeight = 0, ironspineWeight = 0;
  let strongestWeight = -1, strongestX = 0, strongestZ = 0, strongestKind = 0, strongestToken = 0;
  const sites = getSiteWindow?.(centerX, centerZ);
  if (sites) {
    for (const site of sites) {
      const weight = kernel(Math.hypot(qx - site.x, qz - site.z));
      if (weight <= 0) continue;
      const kind = site.kind;
      total += weight;
      if (kind === 0) lushWeight += weight;
      else if (kind === 1) sunscarWeight += weight;
      else ironspineWeight += weight;
      if (weight > strongestWeight) {
        strongestWeight = weight; strongestX = site.xCell; strongestZ = site.zCell;
        strongestKind = kind; strongestToken = site.token;
      }
    }
  } else {
    for (let dz = -CANDIDATE_RADIUS; dz <= CANDIDATE_RADIUS; dz += 1) {
      for (let dx = -CANDIDATE_RADIUS; dx <= CANDIDATE_RADIUS; dx += 1) {
        const site = createSite(centerX + dx, centerZ + dz, seed);
        const weight = kernel(Math.hypot(qx - site.x, qz - site.z));
        if (weight <= 0) continue;
        const kind = site.kind;
        total += weight;
        if (kind === 0) lushWeight += weight;
        else if (kind === 1) sunscarWeight += weight;
        else ironspineWeight += weight;
        if (weight > strongestWeight) {
          strongestWeight = weight; strongestX = site.xCell; strongestZ = site.zCell;
          strongestKind = kind; strongestToken = site.token;
        }
      }
    }
  }
  // The support radius and jitter bounds guarantee coverage; retain a finite
  // fallback so malformed numeric inputs still cannot poison terrain arrays.
  if (!(total > 0)) { total = 1; lushWeight = 1; strongestKind = 0; strongestToken = hash2(strongestX, strongestZ, seed); }
  lushWeight /= total; sunscarWeight /= total; ironspineWeight /= total;
  // Province cores normally evaluate one two-or-three-noise grammar. Only an
  // ecotone pays for multiple grammar heights.
  const lush = lushWeight > 0 ? lushHeight(x, z, seed) : 0;
  const sunscar = sunscarWeight > 0 ? sunscarHeight(x, z, seed) : 0;
  const ironspine = ironspineWeight > 0 ? ironspineHeight(x, z, seed) : 0;
  const height = clamp(lush * lushWeight + sunscar * sunscarWeight + ironspine * ironspineWeight,
  FRONTIER_REGION_CONFIG.minHeight, FRONTIER_REGION_CONFIG.maxHeight);
  // The locked Sunscar target reads its diagonal structure through color as
  // well as silhouette: mauve-tan troughs rise into broad pale mineral ribs.
  const sunscarColor = blendRGB(SUNSCAR_TROUGH, SUNSCAR_RIDGE, smooth((sunscar - 5) / 13));
  const colorRGB = [
    PALETTES.lush[0] * lushWeight + sunscarColor[0] * sunscarWeight + PALETTES.ironspine[0] * ironspineWeight,
    PALETTES.lush[1] * lushWeight + sunscarColor[1] * sunscarWeight + PALETTES.ironspine[1] * ironspineWeight,
    PALETTES.lush[2] * lushWeight + sunscarColor[2] * sunscarWeight + PALETTES.ironspine[2] * ironspineWeight,
  ];
  return {
    id: `f1:region:${strongestToken.toString(16).padStart(8, '0')}:${strongestX}:${strongestZ}`,
    kind: profileKind(strongestKind),
    influence,
    height,
    colorRGB,
    weights: { lush: lushWeight, sunscar: sunscarWeight, ironspine: ironspineWeight },
  };
}

export function sampleFrontierRegion(x, z, options = {}) {
  x = Number.isFinite(x) ? x : 0;
  z = Number.isFinite(z) ? z : 0;
  return sampleResolved(x, z, resolveSeed(options));
}

export function createFrontierRegionSampler(world = DEFAULT_FRONTIER_WORLD) {
  const descriptor = normalizeFrontierWorld(world);
  const seed = resolveSeed({ world: descriptor });
  const windows = new Map();
  function getSiteWindow(centerX, centerZ) {
    const key = `${centerX},${centerZ}`;
    let sites = windows.get(key);
    if (sites) return sites;
    sites = [];
    for (let dz = -CANDIDATE_RADIUS; dz <= CANDIDATE_RADIUS; dz += 1) {
      for (let dx = -CANDIDATE_RADIUS; dx <= CANDIDATE_RADIUS; dx += 1) sites.push(createSite(centerX + dx, centerZ + dz, seed));
    }
    sites = Object.freeze(sites);
    if (windows.size >= 16) windows.delete(windows.keys().next().value);
    windows.set(key, sites);
    return sites;
  }
  return (x, z) => {
    x = Number.isFinite(x) ? x : 0;
    z = Number.isFinite(z) ? z : 0;
    return sampleResolved(x, z, seed, getSiteWindow);
  };
}
