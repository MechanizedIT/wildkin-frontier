import { DEFAULT_FRONTIER_WORLD, frontierDomainSeed, normalizeFrontierWorld } from './frontierWorld.js';

export const FRONTIER_CONTINENT_CONFIG = Object.freeze({
  center: Object.freeze({ x: -700, z: -900 }),
  innerRadii: Object.freeze({ x: 1120, z: 1670 }),
  outerRadii: Object.freeze({ x: 1200, z: 1750 }),
  harmonics: Object.freeze([
    Object.freeze({ frequency: 3, amplitude: 70, key: 0x11 }),
    Object.freeze({ frequency: 5, amplitude: 40, key: 0x29 }),
    Object.freeze({ frequency: 7, amplitude: 25, key: 0x47 }),
    Object.freeze({ frequency: 29, amplitude: 12, key: 0x09 }),
    Object.freeze({ frequency: 47, amplitude: 7, key: 0x86 }),
  ]),
  smoothMaxWidth: 24,
  seaLevel: -2,
  inlandExactDistance: 90,
  shallowDistance: 12,
  shelfDistance: 32,
  shallowDepth: .75,
  shelfDepth: 5,
  deepDepth: 12,
  deepDepthDistance: 96,
  contentMargin: 2,
});

const COAST_DOMAIN = 'continent-coast';
const COAST_SALT = 0xdebd2186;
const SAMPLER_CACHE_CAP = 4;
const TAU = Math.PI * 2;
const clamp01 = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp01(value); return t * t * (3 - 2 * t); };
const smoother = value => { const t = clamp01(value); return t * t * t * (t * (t * 6 - 15) + 10); };

function unitHash(seed, key) {
  let value = Math.imul((seed ^ key) >>> 0, 2246822519);
  value = (value ^ (value >>> 13)) >>> 0;
  return value / 0xffffffff;
}

function ellipseRadius(angle, radii) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return 1 / Math.sqrt(cos * cos / (radii.x * radii.x) + sin * sin / (radii.z * radii.z));
}

// This rounded maximum is always at least the protected inner ellipse. It
// removes the hard join without allowing an inward harmonic to breach it.
function smoothMaximum(a, b, width) {
  const difference = Math.abs(a - b);
  const maximum = Math.max(a, b);
  if (!(width > 0) || difference >= width) return maximum;
  return maximum + (width - difference) ** 2 / (4 * width);
}

function resolveSeed(world) {
  return frontierDomainSeed(normalizeFrontierWorld(world ?? DEFAULT_FRONTIER_WORLD), COAST_DOMAIN, COAST_SALT);
}

function createResolvedSampler(world) {
  const descriptor = normalizeFrontierWorld(world ?? DEFAULT_FRONTIER_WORLD);
  const seed = resolveSeed(descriptor);
  const phases = FRONTIER_CONTINENT_CONFIG.harmonics.map(harmonic => unitHash(seed, harmonic.key) * TAU);
  const token = seed.toString(16).padStart(8, '0');
  return (rawX, rawZ) => {
    const x = Number.isFinite(rawX) ? rawX : 0;
    const z = Number.isFinite(rawZ) ? rawZ : 0;
    const dx = x - FRONTIER_CONTINENT_CONFIG.center.x;
    const dz = z - FRONTIER_CONTINENT_CONFIG.center.z;
    const radialDistance = Math.hypot(dx, dz);
    const angle = radialDistance > 0 ? Math.atan2(dz, dx) : 0;
    const protectedRadius = ellipseRadius(angle, FRONTIER_CONTINENT_CONFIG.innerRadii);
    let irregularRadius = ellipseRadius(angle, FRONTIER_CONTINENT_CONFIG.outerRadii);
    for (let index = 0; index < FRONTIER_CONTINENT_CONFIG.harmonics.length; index += 1) {
      const harmonic = FRONTIER_CONTINENT_CONFIG.harmonics[index];
      irregularRadius += harmonic.amplitude * Math.sin(harmonic.frequency * angle + phases[index]);
    }
    const coastRadius = smoothMaximum(protectedRadius, irregularRadius, FRONTIER_CONTINENT_CONFIG.smoothMaxWidth);
    const coastDistance = coastRadius - radialDistance;
    const offshoreDistance = Math.max(0, -coastDistance);
    let waterDepth = 0;
    if (offshoreDistance > 0 && offshoreDistance <= FRONTIER_CONTINENT_CONFIG.shallowDistance) {
      waterDepth = FRONTIER_CONTINENT_CONFIG.shallowDepth * smooth(offshoreDistance / FRONTIER_CONTINENT_CONFIG.shallowDistance);
    } else if (offshoreDistance > FRONTIER_CONTINENT_CONFIG.shallowDistance
      && offshoreDistance <= FRONTIER_CONTINENT_CONFIG.shelfDistance) {
      const t = smooth((offshoreDistance - FRONTIER_CONTINENT_CONFIG.shallowDistance)
        / (FRONTIER_CONTINENT_CONFIG.shelfDistance - FRONTIER_CONTINENT_CONFIG.shallowDistance));
      waterDepth = FRONTIER_CONTINENT_CONFIG.shallowDepth
        + (FRONTIER_CONTINENT_CONFIG.shelfDepth - FRONTIER_CONTINENT_CONFIG.shallowDepth) * t;
    } else if (offshoreDistance > FRONTIER_CONTINENT_CONFIG.shelfDistance) {
      const t = smooth((offshoreDistance - FRONTIER_CONTINENT_CONFIG.shelfDistance)
        / FRONTIER_CONTINENT_CONFIG.deepDepthDistance);
      waterDepth = FRONTIER_CONTINENT_CONFIG.shelfDepth
        + (FRONTIER_CONTINENT_CONFIG.deepDepth - FRONTIER_CONTINENT_CONFIG.shelfDepth) * t;
    }
    const land = coastDistance >= 0;
    return Object.freeze({
      id: `f1:continent:${token}`,
      coastDistance,
      seaLevel: FRONTIER_CONTINENT_CONFIG.seaLevel,
      land,
      contentLand: coastDistance > FRONTIER_CONTINENT_CONFIG.contentMargin,
      hasTerrain: coastDistance >= -FRONTIER_CONTINENT_CONFIG.shelfDistance,
      waterDepth,
      kind: land ? (coastDistance < FRONTIER_CONTINENT_CONFIG.inlandExactDistance ? 'coast' : 'interior')
        : coastDistance >= -FRONTIER_CONTINENT_CONFIG.shelfDistance ? 'shelf' : 'deep-ocean',
      inlandDirection: Object.freeze(radialDistance > 0
        ? { x: -dx / radialDistance, z: -dz / radialDistance }
        : { x: 1, z: 0 }),
    });
  };
}

export function createFrontierContinentSampler(world = DEFAULT_FRONTIER_WORLD) {
  return createResolvedSampler(world);
}

const DEFAULT_CONTINENT_SAMPLER = createResolvedSampler(DEFAULT_FRONTIER_WORLD);
const samplerCache = new Map([[`${DEFAULT_FRONTIER_WORLD.edition}:${DEFAULT_FRONTIER_WORLD.seed}`, DEFAULT_CONTINENT_SAMPLER]]);

export function sampleFrontierContinent(x, z, { world = DEFAULT_FRONTIER_WORLD } = {}) {
  const descriptor = normalizeFrontierWorld(world);
  const key = `${descriptor.edition}:${descriptor.seed}`;
  let sampler = samplerCache.get(key);
  if (!sampler) {
    sampler = createResolvedSampler(descriptor);
    if (samplerCache.size < SAMPLER_CACHE_CAP) samplerCache.set(key, sampler);
  }
  return sampler(x, z);
}

export function sampleFrontierWater(x, z, { world = DEFAULT_FRONTIER_WORLD, continentSampler } = {}) {
  const sample = typeof continentSampler === 'function' ? continentSampler(x, z) : sampleFrontierContinent(x, z, { world });
  if (sample.land) return null;
  return Object.freeze({
    surfaceY: sample.seaLevel,
    bedY: sample.seaLevel - sample.waterDepth,
    depth: sample.waterDepth,
    offshoreDistance: -sample.coastDistance,
    inlandDirection: sample.inlandDirection,
  });
}

export function hasFrontierLandFootprint(x, z, {
  radius = 0,
  margin = FRONTIER_CONTINENT_CONFIG.contentMargin,
  getTerrainSample,
  continentSampler,
  world = DEFAULT_FRONTIER_WORLD,
} = {}) {
  if (![x, z, radius, margin].every(Number.isFinite) || radius < 0 || margin < 0) return false;
  const sample = (sx, sz) => {
    if (typeof getTerrainSample === 'function') {
      const value = getTerrainSample(sx, sz);
      // Focused callers may deliberately inject a complete legacy/flat terrain
      // fixture. Production terrain always supplies the signed coast field.
      return Number.isFinite(value?.coastDistance) ? value.coastDistance : Number.MAX_SAFE_INTEGER;
    }
    const continent = typeof continentSampler === 'function' ? continentSampler(sx, sz)
      : sampleFrontierContinent(sx, sz, { world });
    return continent?.coastDistance;
  };
  const points = [[0, 0]];
  if (radius > 0) for (let index = 0; index < 8; index += 1) {
    const angle = index * TAU / 8;
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  return points.every(([ox, oz]) => {
    const distance = sample(x + ox, z + oz);
    return Number.isFinite(distance) && distance > margin;
  });
}

export function blendFrontierCoastHeight(inlandHeight, continent) {
  const finiteHeight = Number.isFinite(inlandHeight) ? inlandHeight : FRONTIER_CONTINENT_CONFIG.seaLevel;
  const distance = continent?.coastDistance;
  if (!Number.isFinite(distance) || distance >= FRONTIER_CONTINENT_CONFIG.inlandExactDistance) return finiteHeight;
  if (distance <= 0) return FRONTIER_CONTINENT_CONFIG.seaLevel - (continent?.waterDepth ?? 0);
  const t = smoother(distance / FRONTIER_CONTINENT_CONFIG.inlandExactDistance);
  const gentleApproach = FRONTIER_CONTINENT_CONFIG.seaLevel + distance * .12;
  return gentleApproach + (finiteHeight - gentleApproach) * t;
}
