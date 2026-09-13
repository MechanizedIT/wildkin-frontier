import { FRONTIER_TERRAIN_CONFIG, isCampChunk, sampleFrontier } from './frontierTerrain.js';
import { sampleFrontierForageChunk } from './frontierEcology.js';
import { sampleFrontierWildlifeChunk } from './frontierWildlife.js';
import { DEFAULT_FRONTIER_WORLD, frontierDomainSeed } from './frontierWorld.js';
import { isSkybreakArea } from './frontierLandform.js';
import { hasFootprintSupport } from './frontierPlacement.js';
import { hasRegionalPlaceAssets, sampleFrontierRegionalPlaceChunk } from './frontierRegionalPlace.js';

export const FRONTIER_SCENERY_CONFIG = Object.freeze({
  maxNear: 18,
  maxOuter: 16,
  maxOuterDesired: 8,
  maxTotal: 34,
  maxCanopies: 12,
});

const EDGE = 4;
const MAX_SLOPE = .32;
const SLOPE_STEP = .8;
const FOOTPRINT_RADIUS = Object.freeze({ canopy: 1.45, low: .62, 'ground-cover': .38 });
// Low props are authored meshes rather than point sprites. Retain the
// established category minimum, then expand it to the actual scaled planform
// so a larger landmark cannot pass a small-prop support check on a cliff lip.
const ASSET_FOOTPRINT_RADIUS = Object.freeze({
  asset_cloudflower: .75,
  asset_trail_stones: 1.4,
  asset_mushroom_ring: 1.05,
  asset_fen_reed: .85,
});
const CAMP_CLEARANCE = 6;
const FORAGE_CLEARANCE = 3.2;
// Solid trunks and stones keep a true walk lane. Soft foliage may frame that
// lane more closely, which is what makes the portrait route read as habitat.
const ROUTE_CLEARANCE = 1.15;
const SOLID_ROUTE_CLEARANCE = 2.1;
const GROUND_COVER_CLEARANCE = Object.freeze({ route: .65, forage: 1.4, wildlife: 1.4 });
const EXCLUSION_RECIPE_CACHE = Symbol('frontier-scenery-exclusion-recipe-cache');
const RECIPE_CACHE_ACCESS = Symbol('frontier-scenery-recipe-cache-access');
const REGIONAL_PLACE_LOOKUP = Symbol('frontier-scenery-regional-place-lookup');
export const FRONTIER_SCENERY_POINT_MEMO_CAP = 8192;
export const FRONTIER_SCENERY_PLACE_LOOKUP_CAP = 81;
const TERRACE_CLEARANCE = Object.freeze({ minX: 18, maxX: 46, minZ: -150, maxZ: -108 });
const NORTH_ROUTE = Object.freeze([
  Object.freeze([0, -56]), Object.freeze([7, -68]), Object.freeze([7, -85]), Object.freeze([20, -95]), Object.freeze([24, -118]),
]);

// This one authored grouping gives the first portrait route a readable leafy
// west wall and damp east verge. It still passes every ordinary clearance rule.
const STAGED = Object.freeze(new Map([
  ['0,-3', Object.freeze([
    Object.freeze({ key: 'tree-north', assetId: 'asset_verge_canopy_tall', x: 6, z: -106, scale: .9, kind: 'canopy' }),
  ])],
  ['0,-2', Object.freeze([
    Object.freeze({ key: 'tree-west-1', assetId: 'asset_verge_canopy', x: 4.85, z: -78.5, scale: .82, yaw: .2, kind: 'canopy' }),
    Object.freeze({ key: 'tree-west-2', assetId: 'asset_verge_canopy_spread', x: 1.8, z: -85, scale: .72, yaw: -.35, kind: 'canopy' }),
    Object.freeze({ key: 'fen-1', assetId: 'asset_fen_reed', x: 8.7, z: -75.8, scale: .42, kind: 'low' }),
    Object.freeze({ key: 'fen-2', assetId: 'asset_fen_lily', x: 8.7, z: -76.8, scale: .55, kind: 'low' }),
    Object.freeze({ key: 'fen-3', assetId: 'asset_mushroom_ring', x: 5.2, z: -77.4, scale: .8, kind: 'low' }),
    Object.freeze({ key: 'fen-4', assetId: 'asset_fen_reed', x: 8.8, z: -78, scale: .5, kind: 'low' }),
    Object.freeze({ key: 'fen-5', assetId: 'asset_fen_lily', x: 9.1, z: -78.1, scale: .5, kind: 'low' }),
    Object.freeze({ key: 'fen-6', assetId: 'asset_fen_stone', x: 9.2, z: -78.8, scale: .32, kind: 'low' }),
    Object.freeze({ key: 'fen-7', assetId: 'asset_fen_reed', x: 9, z: -80, scale: .38, kind: 'low' }),
    Object.freeze({ key: 'fen-8', assetId: 'asset_fen_lily', x: 8.7, z: -79.9, scale: .46, kind: 'low' }),
  ])],
  // Skybreak uses the same admitted low-poly assets, but its ecology is tied to
  // the actual sampled surface. The lowland thicket frames the early supplies;
  // cap flowers and loose east-side stones make the climb readable without
  // painting a path across the landform.
  ['-1,-4', Object.freeze([
    Object.freeze({ key: 'skybreak-berry-leaves', assetId: 'asset_verge_canopy_spread', x: -26, z: -169, scale: 1.1, yaw: .28, kind: 'canopy' }),
    Object.freeze({ key: 'skybreak-berry-reeds', assetId: 'asset_fen_reed', x: -26, z: -170, scale: 1.2, yaw: -.42, kind: 'low' }),
    Object.freeze({ key: 'skybreak-berry-mushrooms', assetId: 'asset_mushroom_ring', x: -25, z: -170, scale: 1.18, yaw: .16, kind: 'low' }),
  ])],
  ['0,-5', Object.freeze([
    Object.freeze({ key: 'skybreak-crown-cloudflower-west', assetId: 'asset_cloudflower', x: 13, z: -232, scale: 1.3, yaw: .18, kind: 'low' }),
    Object.freeze({ key: 'skybreak-crown-cloudflower-center', assetId: 'asset_cloudflower', x: 13.5, z: -231.5, scale: 1.35, yaw: -.1, kind: 'low' }),
    Object.freeze({ key: 'skybreak-crown-cloudflower-east', assetId: 'asset_cloudflower', x: 15, z: -231, scale: 1.28, yaw: .32, kind: 'low' }),
    Object.freeze({ key: 'skybreak-east-stones-high-west', assetId: 'asset_trail_stones', x: 32, z: -218, scale: 1.1, yaw: -.24, kind: 'low' }),
    Object.freeze({ key: 'skybreak-east-stones-high-center', assetId: 'asset_trail_stones', x: 34, z: -218, scale: 1.14, yaw: .42, kind: 'low' }),
    Object.freeze({ key: 'skybreak-east-stones-high-east', assetId: 'asset_trail_stones', x: 36, z: -218, scale: 1.1, yaw: .08, kind: 'low' }),
  ])],
  ['0,-4', Object.freeze([
    Object.freeze({ key: 'skybreak-fiber-leaves', assetId: 'asset_verge_canopy_spread', x: 42, z: -170, scale: 1.1, yaw: -.36, kind: 'canopy' }),
    Object.freeze({ key: 'skybreak-fiber-reeds', assetId: 'asset_fen_reed', x: 42, z: -162, scale: 1.24, yaw: .42, kind: 'low' }),
    Object.freeze({ key: 'skybreak-fiber-mushrooms', assetId: 'asset_mushroom_ring', x: 44, z: -169, scale: 1.16, yaw: -.12, kind: 'low' }),
    Object.freeze({ key: 'skybreak-east-stones-mid-west', assetId: 'asset_trail_stones', x: 41, z: -187, scale: 1.1, yaw: .68, kind: 'low' }),
    Object.freeze({ key: 'skybreak-east-stones-mid-center', assetId: 'asset_trail_stones', x: 41, z: -185, scale: 1.16, yaw: -.3, kind: 'low' }),
    Object.freeze({ key: 'skybreak-east-stones-mid-east', assetId: 'asset_trail_stones', x: 43, z: -185, scale: 1.1, yaw: .18, kind: 'low' }),
    Object.freeze({ key: 'skybreak-east-stones-low-west', assetId: 'asset_trail_stones', x: 24, z: -166, scale: 1.1, yaw: -.28, kind: 'low' }),
    Object.freeze({ key: 'skybreak-east-stones-low-center', assetId: 'asset_trail_stones', x: 22, z: -164, scale: 1.15, yaw: .26, kind: 'low' }),
    Object.freeze({ key: 'skybreak-east-stones-low-east', assetId: 'asset_trail_stones', x: 24, z: -164, scale: 1.1, yaw: .04, kind: 'low' }),
  ])],
]));

function random(cx, cz, index, salt = 0, world = DEFAULT_FRONTIER_WORLD) {
  salt += frontierDomainSeed(world, 'scenery');
  let value = Math.imul(cx | 0, 73856093) ^ Math.imul(cz | 0, 19349663) ^ Math.imul(index + salt, 83492791);
  value = Math.imul(value ^ (value >>> 16), 2246822519);
  return ((value ^ (value >>> 13)) >>> 0) / 4294967295;
}

function distanceToSegment(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], lengthSq = dx * dx + dz * dz;
  const t = lengthSq ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / lengthSq)) : 0;
  return Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t));
}

function routeIsClear(x, z, candidate) {
  if (x >= TERRACE_CLEARANCE.minX && x <= TERRACE_CLEARANCE.maxX && z >= TERRACE_CLEARANCE.minZ && z <= TERRACE_CLEARANCE.maxZ) return false;
  const clearance = candidate.kind === 'ground-cover' ? GROUND_COVER_CLEARANCE.route
    : candidate.kind === 'canopy' || candidate.assetId === 'asset_fen_stone' ? SOLID_ROUTE_CLEARANCE : ROUTE_CLEARANCE;
  for (let i = 1; i < NORTH_ROUTE.length; i++) if (distanceToSegment(x, z, NORTH_ROUTE[i - 1], NORTH_ROUTE[i]) < clearance) return false;
  return true;
}

function outsideCampApron(x, z) {
  const b = FRONTIER_TERRAIN_CONFIG.campBounds;
  return x < b.minX - CAMP_CLEARANCE || x > b.maxX + CAMP_CLEARANCE || z < b.minZ - CAMP_CLEARANCE || z > b.maxZ + CAMP_CLEARANCE;
}

function terrainSample(x, z, options) {
  return typeof options.getTerrainSample === 'function' ? options.getTerrainSample(x, z) : sampleFrontier(x, z, { ...options.terrainOptions, world: options.world ?? DEFAULT_FRONTIER_WORLD });
}

function provinceMix(sample) {
  const influence = Math.max(0, Math.min(1, Number(sample?.provinceInfluence) || 0));
  const weights = sample?.provinceWeights;
  if (!(influence > 0) || !weights || typeof weights !== 'object') return null;
  const lush = Math.max(0, Number(weights.lush) || 0);
  const sunscar = Math.max(0, Number(weights.sunscar) || 0);
  const ironspine = Math.max(0, Number(weights.ironspine) || 0);
  const total = lush + sunscar + ironspine;
  return total > 0 ? { influence, lush: lush / total, sunscar: sunscar / total, ironspine: ironspine / total } : null;
}

function weightedProvince(mix, roll) {
  return roll < mix.lush ? 'lush' : roll < mix.lush + mix.sunscar ? 'sunscar' : 'ironspine';
}

function groundCoverFor(sample) {
  const mix = provinceMix(sample);
  if (!mix) return null;
  const regionalDensity = mix.lush + mix.sunscar * .18 + mix.ironspine * .4;
  return Object.freeze({
    density: 1 + (regionalDensity - 1) * mix.influence,
    dryWeight: mix.sunscar,
    highWeight: mix.ironspine,
    influence: mix.influence,
  });
}

function heightAt(x, z, options) {
  return typeof options.getHeight === 'function' ? options.getHeight(x, z) : terrainSample(x, z, options).height;
}

function hasSafeGround(x, z, options) {
  const h = heightAt(x, z, options);
  if (!Number.isFinite(h)) return false;
  const dx = (heightAt(x + SLOPE_STEP, z, options) - heightAt(x - SLOPE_STEP, z, options)) / (SLOPE_STEP * 2);
  const dz = (heightAt(x, z + SLOPE_STEP, options) - heightAt(x, z - SLOPE_STEP, options)) / (SLOPE_STEP * 2);
  return Number.isFinite(dx) && Number.isFinite(dz) && Math.hypot(dx, dz) <= MAX_SLOPE;
}

function settleSunscarPatchCenter(x, z, cx, cz, options) {
  const mix = provinceMix(terrainSample(x, z, options));
  if (!mix || mix.influence * mix.sunscar < .6) return { x, z };
  const size = FRONTIER_TERRAIN_CONFIG.chunkSize;
  let best = { x, z, height: heightAt(x, z, options) };
  for (const [ox, oz] of [[-8, 0], [8, 0], [0, -8], [0, 8], [-6, -6], [6, -6], [-6, 6], [6, 6]]) {
    const px = x + ox, pz = z + oz;
    if (px < cx * size + EDGE + 2 || px > (cx + 1) * size - EDGE - 2 || pz < cz * size + EDGE + 2 || pz > (cz + 1) * size - EDGE - 2) continue;
    const candidateMix = provinceMix(terrainSample(px, pz, options));
    if (!candidateMix || candidateMix.influence * candidateMix.sunscar < .6 || !hasSafeGround(px, pz, options)) continue;
    const height = heightAt(px, pz, options);
    if (height < best.height) best = { x: px, z: pz, height };
  }
  return { x: best.x, z: best.z };
}

function regionalSceneryScale(sample, assetId, baseScale, variationRoll) {
  const mix = provinceMix(sample);
  const dry = mix ? mix.influence * mix.sunscar : 0;
  if (!(dry > 0) || !['asset_trail_stones', 'asset_fen_stone'].includes(assetId)) return baseScale;
  const gain = assetId === 'asset_trail_stones' ? .42 + variationRoll * .42 : .18 + variationRoll * .2;
  return baseScale * (1 + dry * gain);
}

function hasSunscarPocketCue(x, z, options) {
  const mix = provinceMix(terrainSample(x, z, options));
  if (!mix || mix.influence * mix.sunscar < .6) return true;
  const height = heightAt(x, z, options);
  const neighborHeights = [
    heightAt(x - 8, z, options), heightAt(x + 8, z, options),
    heightAt(x, z - 8, options), heightAt(x, z + 8, options),
  ];
  if (![height, ...neighborHeights].every(Number.isFinite)) return false;
  const neighboringHigh = Math.max(...neighborHeights);
  const localRelief = neighboringHigh - Math.min(height, ...neighborHeights);
  return localRelief < .05 || neighboringHigh - height >= .25;
}

function hasSafeFootprint(x, z, candidate, options) {
  const radius = footprintRadius(candidate);
  if (!provinceMix(terrainSample(x, z, options)) && !isSkybreakArea(x, z, radius)) return true;
  return hasFootprintSupport(x, z, { getHeight: (sx, sz) => heightAt(sx, sz, options), radius, maxSlope: MAX_SLOPE });
}

function footprintRadius(candidate) {
  const categoryRadius = FOOTPRINT_RADIUS[candidate.kind] ?? FOOTPRINT_RADIUS.low;
  const assetRadius = ASSET_FOOTPRINT_RADIUS[candidate.assetId] ?? 0;
  const scale = Number.isFinite(candidate.scale) ? Math.max(0, candidate.scale) : 1;
  return Math.max(categoryRadius, assetRadius * scale);
}

function createRegionalPlaceLookup(options) {
  const values = new Map();
  const enabled = hasRegionalPlaceAssets(options.visualAssets);
  const sample = typeof options.sampleRegionalPlaceChunk === 'function'
    ? options.sampleRegionalPlaceChunk : sampleFrontierRegionalPlaceChunk;
  const get = (cx, cz) => {
    if (!enabled) return null;
    const key = `${cx},${cz}`;
    if (values.has(key)) return values.get(key);
    const place = sample(cx, cz, {
      getHeight: (x, z) => heightAt(x, z, options),
      getTerrainSample: (x, z) => terrainSample(x, z, options),
      terrainOptions: options.terrainOptions,
      visualAssets: options.visualAssets,
      world: options.world ?? DEFAULT_FRONTIER_WORLD,
    }) ?? null;
    if (values.size < FRONTIER_SCENERY_PLACE_LOOKUP_CAP) values.set(key, place);
    return place;
  };
  const clear = () => values.clear();
  const getDebugState = () => Object.freeze({ placeCount: values.size });
  return Object.freeze({ get, clear, getDebugState });
}

function placeLookup(options) {
  return options[REGIONAL_PLACE_LOOKUP] ?? createRegionalPlaceLookup(options);
}

function nearbyRegionalPlaces(cx, cz, options) {
  const lookup = placeLookup(options), places = [];
  for (let pz = cz - 1; pz <= cz + 1; pz++) for (let px = cx - 1; px <= cx + 1; px++) {
    const place = lookup.get(px, pz);
    if (place?.center && Number.isFinite(place.center.x) && Number.isFinite(place.center.z) && Number.isFinite(place.radius) && place.radius > 0) places.push(place);
  }
  return places;
}

function outsideRegionalPlaces(x, z, candidate, options) {
  const size = FRONTIER_TERRAIN_CONFIG.chunkSize;
  const cx = Math.floor(x / size), cz = Math.floor(z / size);
  const radius = footprintRadius(candidate);
  return nearbyRegionalPlaces(cx, cz, options)
    .every(place => Math.hypot(x - place.center.x, z - place.center.z) >= place.radius + radius);
}

function cachedExclusionRecipe(kind, cx, cz, options, sample) {
  const cache = options[EXCLUSION_RECIPE_CACHE];
  return cache?.[RECIPE_CACHE_ACCESS]?.get(kind, cx, cz, sample) ?? sample();
}

function exclusionsFor(cx, cz, options) {
  const world = options.world ?? DEFAULT_FRONTIER_WORLD;
  const forage = [];
  // Specs close to a chunk edge can visually reach an adjacent resource. Keep
  // the same local neighborhood as wildlife so chunk ownership never creates
  // a seam in interaction clearance.
  for (let fz = cz - 1; fz <= cz + 1; fz++) for (let fx = cx - 1; fx <= cx + 1; fx++) {
    const sample = typeof options.sampleForageChunk === 'function' ? options.sampleForageChunk : sampleFrontierForageChunk;
    forage.push(...cachedExclusionRecipe('forage', fx, fz, options, () => sample(fx, fz, {
      getHeight: (x, z) => heightAt(x, z, options), terrainOptions: options.terrainOptions,
      getTerrainSample: (x, z) => terrainSample(x, z, options), visualAssets: options.visualAssets, world,
    })));
  }
  const wildlife = [];
  for (let wz = cz - 1; wz <= cz + 1; wz++) for (let wx = cx - 1; wx <= cx + 1; wx++) {
    const sample = typeof options.sampleWildlifeChunk === 'function' ? options.sampleWildlifeChunk : sampleFrontierWildlifeChunk;
    wildlife.push(...cachedExclusionRecipe('wildlife', wx, wz, options,
      () => sample(wx, wz, { getTerrainSample: (x, z) => terrainSample(x, z, options), terrainOptions: options.terrainOptions, world })));
  }
  return { forage, wildlife };
}

function isClear(x, z, candidate, exclusions, surfaceKind = null) {
  if (!outsideCampApron(x, z) || !routeIsClear(x, z, candidate)) return false;
  const groundCover = candidate.kind === 'ground-cover';
  if (exclusions.forage.some(node => Math.hypot(x - node.pos.x, z - node.pos.z) < (groundCover ? GROUND_COVER_CLEARANCE.forage : FORAGE_CLEARANCE))) return false;
  const capFlower = candidate.kind === 'low' && candidate.assetId === 'asset_cloudflower' && surfaceKind === 'skybreak-cap';
  if (exclusions.wildlife.some(animal => Math.hypot(x - animal.homePos.x, z - animal.homePos.z) < (groundCover ? GROUND_COVER_CLEARANCE.wildlife : capFlower ? 3.1 : animal.roamRadius + 2.5))) return false;
  return true;
}

// Build-only filter: soft grass can occupy roaming ground, while the same
// route, Camp, terrace and encounter sources preserve readable feet/access.
export function createFrontierGroundCoverFilter(options = {}) {
  const filterOptions = { ...options };
  filterOptions[REGIONAL_PLACE_LOOKUP] = options[REGIONAL_PLACE_LOOKUP] ?? createRegionalPlaceLookup(filterOptions);
  const exclusions = new Map();
  const candidate = Object.freeze({ kind: 'ground-cover' });
  return (x, z) => {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    const size = FRONTIER_TERRAIN_CONFIG.chunkSize;
    const cx = Math.floor(x / size), cz = Math.floor(z / size), key = `${cx},${cz}`;
    if (!exclusions.has(key)) exclusions.set(key, exclusionsFor(cx, cz, filterOptions));
    return isClear(x, z, candidate, exclusions.get(key)) && outsideRegionalPlaces(x, z, candidate, filterOptions)
      && hasSafeGround(x, z, filterOptions) && hasSafeFootprint(x, z, candidate, filterOptions);
  };
}

function lowAsset(sample, habitatRoll, detailRoll, profileRoll = 1, provinceRoll = 0) {
  if (sample.surfaceKind === 'skybreak-cap') return 'asset_cloudflower';
  if (sample.surfaceKind === 'skybreak-lowland') return detailRoll < .56 ? 'asset_fen_reed' : 'asset_mushroom_ring';
  const mix = provinceMix(sample);
  if (mix && profileRoll < mix.influence) {
    const province = weightedProvince(mix, provinceRoll);
    if (province === 'lush') return detailRoll < .42 ? 'asset_fen_reed' : detailRoll < .72 ? 'asset_fen_lily' : detailRoll < .94 ? 'asset_mushroom_ring' : 'asset_fen_stone';
    if (province === 'sunscar') return detailRoll < .84 ? 'asset_trail_stones' : 'asset_fen_stone';
    return detailRoll < .58 ? 'asset_trail_stones' : detailRoll < .84 ? 'asset_fen_stone' : 'asset_mushroom_ring';
  }
  const wet = habitatRoll < (sample.habitatBlend?.wetland ?? 0);
  if (wet) return detailRoll < .48 ? 'asset_fen_reed' : detailRoll < .78 ? 'asset_fen_lily' : 'asset_fen_stone';
  return detailRoll < .68 ? 'asset_mushroom_ring' : 'asset_trail_stones';
}

function makeSpec(cx, cz, key, candidate, options, sample = terrainSample(candidate.x, candidate.z, options)) {
  const y = heightAt(candidate.x, candidate.z, options);
  const groundCover = groundCoverFor(sample);
  return Object.freeze({
    id: `f2c:s:${cx}:${cz}:${key}`,
    chunkId: `${cx},${cz}`,
    assetId: candidate.assetId,
    x: candidate.x, y, z: candidate.z,
    scale: candidate.scale,
    yaw: candidate.yaw ?? random(cx, cz, Math.round((candidate.x + candidate.z) * 10), 211, options.world) * Math.PI * 2,
    kind: candidate.kind,
    ...(groundCover ? { groundCover } : {}),
  });
}

function regionalPlaceScenerySpecs(place, options) {
  if (!place?.id || !Number.isSafeInteger(place.cx) || !Number.isSafeInteger(place.cz) || !Array.isArray(place.scenery)) return [];
  const chunkId = `${place.cx},${place.cz}`;
  const specs = [];
  for (const candidate of place.scenery) {
    if (!candidate?.key || !candidate.assetId || candidate.kind !== 'low'
      || !Number.isFinite(candidate.x) || !Number.isFinite(candidate.y) || !Number.isFinite(candidate.z)
      || !Number.isFinite(candidate.scale) || candidate.scale <= 0 || !Number.isFinite(candidate.yaw)) return [];
    const groundCover = groundCoverFor(terrainSample(candidate.x, candidate.z, options));
    specs.push(Object.freeze({
      id: `f2c:p:${place.id}:${candidate.key}`,
      chunkId,
      regionalPlaceId: place.id,
      assetId: candidate.assetId,
      x: candidate.x, y: candidate.y, z: candidate.z,
      scale: candidate.scale, yaw: candidate.yaw, kind: 'low',
      ...(groundCover ? { groundCover } : {}),
    }));
  }
  return specs;
}

export function sampleFrontierSceneryChunk(cx, cz, options = {}) {
  if (!Number.isSafeInteger(cx) || !Number.isSafeInteger(cz) || isCampChunk(cx, cz)) return [];
  const world = options.world ?? DEFAULT_FRONTIER_WORLD;
  const roll = (index, salt = 0) => random(cx, cz, index, salt, world);
  const sampleOptions = { ...options, world };
  sampleOptions[REGIONAL_PLACE_LOOKUP] = options[REGIONAL_PLACE_LOOKUP] ?? createRegionalPlaceLookup(sampleOptions);
  const size = FRONTIER_TERRAIN_CONFIG.chunkSize, exclusions = exclusionsFor(cx, cz, sampleOptions), specs = [];
  const centerSample = terrainSample((cx + .5) * size, (cz + .5) * size, sampleOptions);
  const centerMix = provinceMix(centerSample);
  const regionalCanopyChance = centerMix ? centerMix.lush * .88 + centerMix.sunscar * .015 + centerMix.ironspine * .2 : 1;
  const canopyChance = centerMix ? 1 + (regionalCanopyChance - 1) * centerMix.influence : 1;
  const chunkCanopyAllowed = roll(0, 149) < canopyChance;
  const accept = (key, candidate, curated = false) => {
    if (Math.floor(candidate.x / size) !== cx || Math.floor(candidate.z / size) !== cz) return;
    if (!curated && (candidate.x < cx * size + EDGE || candidate.x > (cx + 1) * size - EDGE || candidate.z < cz * size + EDGE || candidate.z > (cz + 1) * size - EDGE)) return;
    const surfaceKind = terrainSample(candidate.x, candidate.z, sampleOptions).surfaceKind;
    if (surfaceKind === 'skybreak-shoulder') return;
    if (candidate.assetId === 'asset_cloudflower' && surfaceKind !== 'skybreak-cap') return;
    if (!outsideRegionalPlaces(candidate.x, candidate.z, candidate, sampleOptions)
      || !hasSunscarPocketCue(candidate.x, candidate.z, sampleOptions) || !hasSafeGround(candidate.x, candidate.z, sampleOptions)
      || !hasSafeFootprint(candidate.x, candidate.z, candidate, sampleOptions) || !isClear(candidate.x, candidate.z, candidate, exclusions, surfaceKind)) return;
    specs.push(makeSpec(cx, cz, key, candidate, sampleOptions, terrainSample(candidate.x, candidate.z, sampleOptions)));
  };
  for (const candidate of STAGED.get(`${cx},${cz}`) ?? []) accept(`stage-${candidate.key}`, candidate, true);
  const place = placeLookup(sampleOptions).get(cx, cz);

  // Three seeded patches make a visible verge/fen rhythm without filling the
  // walking lane with a uniform scatter. Slot zero is the patch silhouette;
  // later slots build its low habitat detail.
  for (let attempt = 0; attempt < 30 && specs.length < 6; attempt++) {
    const group = attempt % 3, slot = Math.floor(attempt / 3);
    const rawCenterX = cx * size + 10 + roll(group, 31) * (size - 20);
    const rawCenterZ = cz * size + 10 + roll(group, 53) * (size - 20);
    const center = settleSunscarPatchCenter(rawCenterX, rawCenterZ, cx, cz, sampleOptions);
    const centerX = center.x, centerZ = center.z;
    const angle = roll(attempt, 71) * Math.PI * 2, radius = slot ? 2.2 + roll(attempt, 83) * 5.8 : 0;
    const x = centerX + Math.cos(angle) * radius, z = centerZ + Math.sin(angle) * radius;
    const sample = terrainSample(x, z, sampleOptions);
    if (sample.surfaceKind === 'skybreak-shoulder') continue;
    const canopy = sample.surfaceKind === 'skybreak-cap' ? false : chunkCanopyAllowed && !specs.some(spec => spec.kind === 'canopy');
    const canopyRoll = roll(attempt, 97);
    const assetId = canopy
      ? (canopyRoll < .34 ? 'asset_verge_canopy' : canopyRoll < .67 ? 'asset_verge_canopy_tall' : 'asset_verge_canopy_spread')
      : lowAsset(sample, roll(attempt, 101), roll(attempt, 107), roll(attempt, 151), roll(attempt, 157));
    const baseScale = canopy ? .72 + roll(attempt, 113) * .34 : .76 + roll(attempt, 127) * .3;
    const scale = regionalSceneryScale(sample, assetId, baseScale, roll(attempt, 163));
    accept(`seed-${attempt}`, { x, z, assetId, kind: canopy ? 'canopy' : 'low', scale, yaw: roll(attempt, 131) * Math.PI * 2 });
  }
  // A coherent regional formation must not consume this chunk's established
  // ordinary attempt budget. Safe old props remain eligible and compete only
  // at the existing residency cap; footprint overlaps were already rejected.
  specs.push(...regionalPlaceScenerySpecs(place, sampleOptions));
  return specs;
}

export function selectFrontierScenery(residency, options = {}) {
  const center = residency?.center;
  if (!Number.isSafeInteger(center?.cx) || !Number.isSafeInteger(center?.cz)) return [];
  const chunks = [...new Map((residency.chunks ?? []).filter(chunk => Number.isSafeInteger(chunk?.cx) && Number.isSafeInteger(chunk?.cz)).map(chunk => [`${chunk.cx},${chunk.cz}`, chunk])).values()];
  const near = [], outer = [];
  for (const chunk of chunks) {
    const dx = chunk.cx - center.cx, dz = chunk.cz - center.cz;
    const distance = Math.max(Math.abs(dx), Math.abs(dz)), centerDistance = dx * dx + dz * dz;
    const specs = sampleFrontierSceneryChunk(chunk.cx, chunk.cz, options);
    if (distance <= 1) near.push(...specs.map(spec => ({ spec, centerDistance })));
    else if (distance <= 2) outer.push(...specs.filter(spec => spec.kind === 'canopy').slice(0, 1).map(spec => ({ spec, centerDistance })));
  }
  const stableSort = (a, b) => Number(!a.spec.id.includes(':stage-')) - Number(!b.spec.id.includes(':stage-')) || a.centerDistance - b.centerDistance || a.spec.id.localeCompare(b.spec.id);
  near.sort(stableSort); outer.sort((a, b) => a.centerDistance - b.centerDistance || a.spec.id.localeCompare(b.spec.id));
  const nearSpecs = near.map(entry => entry.spec), outerSpecs = outer.map(entry => entry.spec);
  const staged = nearSpecs.filter(spec => spec.id.includes(':stage-'));
  const regionalGroups = new Map();
  for (const spec of nearSpecs) if (spec.regionalPlaceId) {
    if (!regionalGroups.has(spec.regionalPlaceId)) regionalGroups.set(spec.regionalPlaceId, []);
    regionalGroups.get(spec.regionalPlaceId).push(spec);
  }
  const chosenNear = staged.slice(0, FRONTIER_SCENERY_CONFIG.maxNear);
  for (const group of regionalGroups.values()) {
    if (chosenNear.length + group.length <= FRONTIER_SCENERY_CONFIG.maxNear) chosenNear.push(...group);
  }
  const chosen = new Set(chosenNear);
  const generalCanopies = nearSpecs.filter(spec => !chosen.has(spec) && !spec.regionalPlaceId && spec.kind === 'canopy' && !spec.id.includes(':stage-'))
    .slice(0, Math.max(0, 4 - staged.filter(spec => spec.kind === 'canopy').length));
  chosenNear.push(...generalCanopies.slice(0, Math.max(0, FRONTIER_SCENERY_CONFIG.maxNear - chosenNear.length)));
  generalCanopies.forEach(spec => chosen.add(spec));
  for (const kind of ['low', 'canopy']) for (const spec of nearSpecs) {
    if (chosenNear.length >= FRONTIER_SCENERY_CONFIG.maxNear) break;
    if (!chosen.has(spec) && !spec.regionalPlaceId && spec.kind === kind) { chosenNear.push(spec); chosen.add(spec); }
  }
  const canopyRoom = Math.max(0, FRONTIER_SCENERY_CONFIG.maxCanopies - chosenNear.filter(spec => spec.kind === 'canopy').length);
  const chosenOuter = outerSpecs.slice(0, Math.min(FRONTIER_SCENERY_CONFIG.maxOuterDesired, FRONTIER_SCENERY_CONFIG.maxOuter, canopyRoom));
  return Object.freeze([...chosenNear, ...chosenOuter].slice(0, FRONTIER_SCENERY_CONFIG.maxTotal));
}

/** Owns only pure, deterministic exclusion recipes for one expanded residency window. */
export function createFrontierSceneryRecipeCache() {
  const recipes = { forage: new Map(), wildlife: new Map() };
  let bounds = null;
  function clear() {
    recipes.forage.clear(); recipes.wildlife.clear(); bounds = null;
  }
  function prepare(center) {
    if (!Number.isSafeInteger(center?.cx) || !Number.isSafeInteger(center?.cz)) { clear(); return; }
    bounds = { minCx: center.cx - 4, maxCx: center.cx + 4, minCz: center.cz - 4, maxCz: center.cz + 4 };
    for (const values of Object.values(recipes)) for (const key of values.keys()) {
      const [cx, cz] = key.split(',').map(Number);
      if (cx < bounds.minCx || cx > bounds.maxCx || cz < bounds.minCz || cz > bounds.maxCz) values.delete(key);
    }
  }
  function get(kind, cx, cz, sample) {
    const values = recipes[kind];
    if (!values || !bounds || cx < bounds.minCx || cx > bounds.maxCx || cz < bounds.minCz || cz > bounds.maxCz) return sample();
    const key = `${cx},${cz}`;
    if (!values.has(key)) values.set(key, sample());
    return values.get(key);
  }
  function getDebugState() { return Object.freeze({ forageCount: recipes.forage.size, wildlifeCount: recipes.wildlife.size }); }
  return Object.freeze({ prepare, clear, getDebugState, [RECIPE_CACHE_ACCESS]: Object.freeze({ get }) });
}

function createPointMemo(options) {
  const samples = new Map(), heights = new Map();
  const sampleSource = typeof options.getTerrainSample === 'function'
    ? options.getTerrainSample : (x, z) => sampleFrontier(x, z, { ...options.terrainOptions, world: options.world ?? DEFAULT_FRONTIER_WORLD });
  const keyFor = (x, z) => `${x},${z}`;
  const getTerrainSample = (x, z) => {
    const key = keyFor(x, z);
    if (samples.has(key)) return samples.get(key);
    const value = sampleSource(x, z);
    if (samples.size < FRONTIER_SCENERY_POINT_MEMO_CAP) samples.set(key, value);
    return value;
  };
  const heightSource = typeof options.getHeight === 'function'
    ? options.getHeight : (x, z) => getTerrainSample(x, z)?.height;
  const getHeight = (x, z) => {
    const key = keyFor(x, z);
    if (heights.has(key)) return heights.get(key);
    const value = heightSource(x, z);
    if (heights.size < FRONTIER_SCENERY_POINT_MEMO_CAP) heights.set(key, value);
    return value;
  };
  const clear = () => { samples.clear(); heights.clear(); };
  const getDebugState = () => Object.freeze({ heightCount: heights.size, sampleCount: samples.size });
  return Object.freeze({ getHeight, getTerrainSample, clear, getDebugState });
}

/** Builds one residency using a bounded cache shared by selection and grass clearance. */
export function createFrontierSceneryBuild(residency, options = {}, recipeCache = createFrontierSceneryRecipeCache()) {
  const pointMemo = createPointMemo(options);
  const center = residency?.center;
  if (!Number.isSafeInteger(center?.cx) || !Number.isSafeInteger(center?.cz)) {
    recipeCache.clear();
    return Object.freeze({ specs: Object.freeze([]), canPlaceGroundCover: () => false,
      getHeight: pointMemo.getHeight, getTerrainSample: pointMemo.getTerrainSample,
      releaseTerrainMemo: pointMemo.clear, getTerrainMemoDebugState: pointMemo.getDebugState });
  }
  // Outer patches can spill one chunk past the 5x5 resident window. Their
  // clearance neighborhood fits in this fixed 9x9 source envelope.
  recipeCache.prepare(center);
  const buildOptions = { ...options, getHeight: pointMemo.getHeight, getTerrainSample: pointMemo.getTerrainSample,
    [EXCLUSION_RECIPE_CACHE]: recipeCache };
  const regionalPlaces = createRegionalPlaceLookup(buildOptions);
  buildOptions[REGIONAL_PLACE_LOOKUP] = regionalPlaces;
  const releaseBuildMemo = () => { pointMemo.clear(); regionalPlaces.clear(); };
  try {
    return Object.freeze({
      specs: selectFrontierScenery(residency, buildOptions),
      canPlaceGroundCover: createFrontierGroundCoverFilter(buildOptions),
      getHeight: pointMemo.getHeight,
      getTerrainSample: pointMemo.getTerrainSample,
      releaseTerrainMemo: releaseBuildMemo,
      getTerrainMemoDebugState: pointMemo.getDebugState,
      getRegionalPlaceLookupDebugState: regionalPlaces.getDebugState,
    });
  } catch (error) {
    releaseBuildMemo();
    throw error;
  }
}
