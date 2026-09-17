import { FRONTIER_TERRAIN_CONFIG, isCampChunk, sampleFrontier } from './frontierTerrain.js';
import { createWildkinGenome } from '../creatures/wildkinGenome.js';
import { DEFAULT_FRONTIER_WORLD, frontierDomainSeed } from './frontierWorld.js';
import { isSkybreakArea } from './frontierLandform.js';
import { hasFootprintSupport } from './frontierPlacement.js';
import { hasRegionalPlaceAssets, sampleFrontierRegionalPlaceChunk } from './frontierRegionalPlace.js';
import { hasFrontierLandFootprint } from './frontierContinent.js';
import { FRONTIER_CALDERA_CONFIG, sampleFrontierCalderaFeature } from './frontierCaldera.js';
import { FRONTIER_FUNGAL_CONFIG, overlapsFrontierFungalOuting } from './frontierFungalHollow.js';

const EDGE = 5;
const SLOPE_SAMPLE = .8;
const MAX_SLOPE = .32;
const HOME_FOOTPRINT_RADIUS = 4.9;
const SKYBREAK_HOME_RADIUS = 3.1;
const SKYBREAK_HOME_GRID = .5;
const CALDERA_HOME_GRID = 2;
const FUNGAL_HOME_GRID = 2;
const ROOTBOUND_TRAILGLOAM_HOME_RADIUS = 3.3;
const ROOTBOUND_TRAILGLOAM_HOME_GRID = .5;
const ROOTBOUND_TRAILGLOAM_AUTHORED_ROAM_SPEED = .21212121212121213;
// `wander` deliberately uses 35% of this existing rusher value. Keep its
// ordinary drift aligned with the fitted WalkDiagnostic clip; flee and return
// retain their existing rusher multipliers.
const ROOTBOUND_TRAILGLOAM_MOVE_SPEED = ROOTBOUND_TRAILGLOAM_AUTHORED_ROAM_SPEED / .35;

export const FRONTIER_ROOTBOUND_TRAILGLOAM_ANCHOR = Object.freeze({
  index: 700, cx: -10, cz: 13,
  x: -463, z: 685,
  roamRadius: 1.8, leashRadius: 3, fleeLeashRadius: ROOTBOUND_TRAILGLOAM_HOME_RADIUS,
});
export const FRONTIER_ROOTBOUND_MEADOW_MOSSLING_ANCHOR = Object.freeze({
  // East of the arrival trail: visible from the low Meadow route, with open
  // ground for its first retreat and the root gallery behind it.
  index: 701, cx: -10, cz: 11,
  x: -458, z: 591,
  roamRadius: 4.4, leashRadius: 8.5,
});

export const FRONTIER_CALDERA_WILDLIFE_ANCHOR = Object.freeze({
  index: 300, cx: 17, cz: -40,
  x: FRONTIER_CALDERA_CONFIG.bowlRefuge.x,
  z: FRONTIER_CALDERA_CONFIG.bowlRefuge.z,
  speciesId: 'emberhorn', movementRadius: FRONTIER_CALDERA_CONFIG.bowlRefuge.radius,
});
export const FRONTIER_FUNGAL_WILDLIFE_ANCHOR = FRONTIER_FUNGAL_CONFIG.outing.thornHome;

// These two recipes deliberately mirror the admitted wildkin catalog. The
// generated creature path does not otherwise hydrate gameplay from its visual
// asset, so keep the behavior values explicit and covered against that catalog.
const SIDE_ENCOUNTERS = Object.freeze({
  tidefin: Object.freeze({
    type: 'spitter', speciesTag: 'tidefin', temperament: 'DEFENSIVE',
    roamRadius: 4.5, noticeRadius: 7, personalSpace: 2, leashRadius: 10,
    visualAssetId: 'asset_wildkin_tidefin', facingYaw: Math.atan2(-4, 6),
    configOverrides: Object.freeze({ health: 8, moveSpeed: 2.2, damage: 1, respawnSeconds: 28 }),
  }),
  emberhorn: Object.freeze({
    type: 'rusher', speciesTag: 'emberhorn', temperament: 'TERRITORIAL',
    roamRadius: 4.5, noticeRadius: 7, personalSpace: 2, leashRadius: 10,
    visualAssetId: 'asset_wildkin_emberhorn', facingYaw: 0,
    configOverrides: Object.freeze({ health: 12, moveSpeed: 2.1, damage: 2, respawnSeconds: 28 }),
  }),
});

function random(cx, cz, index, salt = 0, world = DEFAULT_FRONTIER_WORLD) {
  salt += frontierDomainSeed(world, 'wildlife');
  let value = Math.imul(cx | 0, 73856093) ^ Math.imul(cz | 0, 19349663) ^ Math.imul(index + salt, 83492791);
  value = Math.imul(value ^ (value >>> 16), 2246822519);
  return ((value ^ (value >>> 13)) >>> 0) / 4294967295;
}

function terrainSample(x, z, { getTerrainSample, terrainOptions, world = DEFAULT_FRONTIER_WORLD } = {}) {
  return typeof getTerrainSample === 'function' ? getTerrainSample(x, z) : sampleFrontier(x, z, { ...terrainOptions, world });
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
function calderaWeight(sample) {
  return Math.max(0, Math.min(1, Number(sample?.habitatWeights?.[FRONTIER_CALDERA_CONFIG.habitatId]) || 0));
}

function weightedProvince(mix, roll) {
  return roll < mix.lush ? 'lush' : roll < mix.lush + mix.sunscar ? 'sunscar' : 'ironspine';
}

function slopeAt(x, z, options) {
  const dx = (terrainSample(x + SLOPE_SAMPLE, z, options).height - terrainSample(x - SLOPE_SAMPLE, z, options).height) / (SLOPE_SAMPLE * 2);
  const dz = (terrainSample(x, z + SLOPE_SAMPLE, options).height - terrainSample(x, z - SLOPE_SAMPLE, options).height) / (SLOPE_SAMPLE * 2);
  return Math.hypot(dx, dz);
}

function hasSafeHome(x, z, options) {
  const regional = provinceMix(terrainSample(x, z, options));
  if (!regional && !isSkybreakArea(x, z, HOME_FOOTPRINT_RADIUS)) return true;
  return hasFootprintSupport(x, z, {
    getHeight: (sx, sz) => terrainSample(sx, sz, options).height,
    radius: HOME_FOOTPRINT_RADIUS,
    maxSlope: MAX_SLOPE,
  });
}

// The cap is locally rippled despite having a level center and outer ring.
// Check each half-metre step across the complete movement disk and its next
// outward step so the creature controller never has to return across a lip.
function hasSafeSkybreakHome(x, z, options) {
  const steps = Math.ceil(SKYBREAK_HOME_RADIUS / SKYBREAK_HOME_GRID);
  for (let ix = -steps; ix <= steps; ix += 1) {
    for (let iz = -steps; iz <= steps; iz += 1) {
      const dx = ix * SKYBREAK_HOME_GRID, dz = iz * SKYBREAK_HOME_GRID;
      if (dx * dx + dz * dz > SKYBREAK_HOME_RADIUS * SKYBREAK_HOME_RADIUS) continue;
      const sx = x + dx, sz = z + dz;
      const sample = terrainSample(sx, sz, options);
      if (!Number.isFinite(sample.height) || sample.surfaceKind !== 'skybreak-cap') return false;
      for (const [ox, oz] of [[SKYBREAK_HOME_GRID, 0], [0, SKYBREAK_HOME_GRID]]) {
        const neighbor = terrainSample(sx + ox, sz + oz, options);
        if (!Number.isFinite(neighbor.height) || Math.abs(neighbor.height - sample.height) / SKYBREAK_HOME_GRID > MAX_SLOPE) return false;
      }
    }
  }
  return hasFootprintSupport(x, z, {
    getHeight: (sx, sz) => terrainSample(sx, sz, options).height,
    radius: SKYBREAK_HOME_RADIUS,
    maxSlope: MAX_SLOPE,
  });
}

function hasSafeCalderaHome(x, z, options) {
  const radius = FRONTIER_CALDERA_WILDLIFE_ANCHOR.movementRadius;
  const steps = Math.ceil(radius / CALDERA_HOME_GRID);
  for (let ix = -steps; ix <= steps; ix += 1) {
    for (let iz = -steps; iz <= steps; iz += 1) {
      const dx = ix * CALDERA_HOME_GRID, dz = iz * CALDERA_HOME_GRID;
      if (dx * dx + dz * dz > radius * radius) continue;
      const sx = x + dx, sz = z + dz;
      const sample = terrainSample(sx, sz, options);
      const feature = sampleFrontierCalderaFeature(sx, sz);
      if (!Number.isFinite(sample.height) || sample.habitatId !== FRONTIER_CALDERA_CONFIG.habitatId
        || !['bowl', 'breach'].includes(feature.zone)) return false;
      for (const [ox, oz] of [[CALDERA_HOME_GRID, 0], [0, CALDERA_HOME_GRID]]) {
        if ((dx + ox) ** 2 + (dz + oz) ** 2 > radius * radius) continue;
        const neighbor = terrainSample(sx + ox, sz + oz, options);
        if (!Number.isFinite(neighbor.height)
          || Math.abs(neighbor.height - sample.height) / CALDERA_HOME_GRID > MAX_SLOPE) return false;
      }
    }
  }
  return hasFootprintSupport(x, z, {
    getHeight: (sx, sz) => terrainSample(sx, sz, options).height,
    radius,
    maxSlope: MAX_SLOPE,
  });
}

function hasSafeFungalHome(x, z, options) {
  const radius = FRONTIER_FUNGAL_WILDLIFE_ANCHOR.radius;
  const steps = Math.ceil(radius / FUNGAL_HOME_GRID);
  for (let ix = -steps; ix <= steps; ix += 1) {
    for (let iz = -steps; iz <= steps; iz += 1) {
      const dx = ix * FUNGAL_HOME_GRID, dz = iz * FUNGAL_HOME_GRID;
      if (dx * dx + dz * dz > radius * radius) continue;
      const sx = x + dx, sz = z + dz;
      const sample = terrainSample(sx, sz, options);
      if (!Number.isFinite(sample.height) || sample.habitatId !== FRONTIER_FUNGAL_CONFIG.habitatId
        || sample.contentLand === false || sample.land === false) return false;
      for (const [ox, oz] of [[FUNGAL_HOME_GRID, 0], [0, FUNGAL_HOME_GRID]]) {
        if ((dx + ox) ** 2 + (dz + oz) ** 2 > radius * radius) continue;
        const neighbor = terrainSample(sx + ox, sz + oz, options);
        if (!Number.isFinite(neighbor.height)
          || Math.abs(neighbor.height - sample.height) / FUNGAL_HOME_GRID > MAX_SLOPE) return false;
      }
    }
  }
  return hasFootprintSupport(x, z, {
    getHeight: (sx, sz) => terrainSample(sx, sz, options).height,
    radius,
    maxSlope: MAX_SLOPE,
  });
}

function defaultWorld(world) {
  return world?.edition === DEFAULT_FRONTIER_WORLD.edition && world?.seed === DEFAULT_FRONTIER_WORLD.seed;
}

function hasSafeRootboundTrailgloamHome(x, z, options) {
  const radius = ROOTBOUND_TRAILGLOAM_HOME_RADIUS;
  const steps = Math.ceil(radius / ROOTBOUND_TRAILGLOAM_HOME_GRID);
  for (let ix = -steps; ix <= steps; ix += 1) {
    for (let iz = -steps; iz <= steps; iz += 1) {
      const dx = ix * ROOTBOUND_TRAILGLOAM_HOME_GRID, dz = iz * ROOTBOUND_TRAILGLOAM_HOME_GRID;
      if (dx * dx + dz * dz > radius * radius) continue;
      const sample = terrainSample(x + dx, z + dz, options);
      if (!Number.isFinite(sample.height) || sample.habitatId !== 'rootbound-wildwood') return false;
      for (const [ox, oz] of [[ROOTBOUND_TRAILGLOAM_HOME_GRID, 0], [0, ROOTBOUND_TRAILGLOAM_HOME_GRID]]) {
        if ((dx + ox) ** 2 + (dz + oz) ** 2 > radius * radius) continue;
        const neighbor = terrainSample(x + dx + ox, z + dz + oz, options);
        if (!Number.isFinite(neighbor.height)
          || Math.abs(neighbor.height - sample.height) / ROOTBOUND_TRAILGLOAM_HOME_GRID > MAX_SLOPE) return false;
      }
    }
  }
  return hasFootprintSupport(x, z, {
    getHeight: (sx, sz) => terrainSample(sx, sz, options).height,
    radius,
    maxSlope: MAX_SLOPE,
  });
}

function hasSafeRootboundMeadowMosslingHome(x, z, options) {
  const radius = FRONTIER_ROOTBOUND_MEADOW_MOSSLING_ANCHOR.leashRadius;
  return hasFootprintSupport(x, z, {
    getHeight: (sx, sz) => terrainSample(sx, sz, options).height,
    radius,
    maxSlope: MAX_SLOPE,
  });
}

function habitatEcotype(sample) {
  return sample.habitatBlend.wetland >= sample.habitatBlend.fernUpland ? 'fen' : 'grove';
}

function placementBase(cx, cz, index, x, z, options) {
  const sample = terrainSample(x, z, options);
  const originId = `f1:w:${cx}:${cz}:${index}`;
  return { sample, originId, base: {
    id: originId,
    originId,
    chunkId: `${cx},${cz}`,
    generatedChunkId: `${cx},${cz}`,
    isGeneratedResident: true,
    regionId: 'camp',
    pos: Object.freeze({ x, y: sample.height, z }),
    homePos: Object.freeze({ x, y: sample.height, z }),
  } };
}

function makeMosslingPlacement(cx, cz, index, x, z, options) {
  const { sample, originId, base } = placementBase(cx, cz, index, x, z, options);
  const stagedShelf = cx === 0 && cz === -2;
  const skybreakCrown = cx === 0 && cz === -5;
  return Object.freeze({
    ...base,
    type: 'rusher',
    speciesTag: 'mossling',
    temperament: 'SKITTISH',
    facingYaw: random(cx, cz, index, 71, options.world) * Math.PI * 2,
    // Only the first clearing receives a tight, readable scare/return loop.
    // The cap source uses tighter movement inside its continuously checked 3.1m
    // crown disk so its first escape step turns back before any local lip.
    // Other generated Mosslings retain the ordinary broader wildlife range.
    roamRadius: stagedShelf ? 2.6 : skybreakCrown ? 2.4 : 4.4,
    leashRadius: stagedShelf ? 4.2 : skybreakCrown ? 2.8 : 8.5,
    fleeLeashRadius: stagedShelf ? 3.5 : skybreakCrown ? 2.2 : null,
    noticeRadius: 7,
    personalSpace: 2.1,
    visualAssetId: 'asset_wildkin_mossling',
    genome: createWildkinGenome(frontierDomainSeed(options.world, 'wildlife') ? `${originId}:${frontierDomainSeed(options.world, 'wildlife')}` : originId, habitatEcotype(sample)),
    residentPriority: stagedShelf ? index : 100,
  });
}

function makeSideEncounter(cx, cz, index, x, z, speciesId, residentPriority, options) {
  const { base } = placementBase(cx, cz, index, x, z, options);
  const recipe = SIDE_ENCOUNTERS[speciesId];
  return Object.freeze({
    ...base,
    ...recipe,
    hostileSpecies: Object.freeze([]),
    genome: null,
    residentPriority,
  });
}

function makeRegionalPlacement(cx, cz, index, x, z, options) {
  const sample = terrainSample(x, z, options);
  const caldera = calderaWeight(sample);
  if (caldera > 0 && random(cx, cz, index, 181, options.world) < caldera) {
    return Object.freeze({ ...makeSideEncounter(cx, cz, index, x, z, 'emberhorn', 90, options), regionalSignature: true });
  }
  const mix = provinceMix(sample);
  if (!mix || random(cx, cz, index, 181, options.world) >= mix.influence) return makeMosslingPlacement(cx, cz, index, x, z, options);
  const province = weightedProvince(mix, random(cx, cz, index, 183, options.world));
  const detail = random(cx, cz, index, 185, options.world);
  const speciesId = province === 'lush' ? (detail < .28 ? 'tidefin' : null)
    : province === 'sunscar' ? (detail < .58 ? 'emberhorn' : null)
      : detail < .42 ? 'emberhorn' : null;
  if (!speciesId) return makeMosslingPlacement(cx, cz, index, x, z, options);
  return Object.freeze({ ...makeSideEncounter(cx, cz, index, x, z, speciesId, 90, options), regionalSignature: true });
}

function admittedWildkinAsset(visualAssets, speciesId) {
  const asset = (visualAssets ?? []).find(candidate => candidate?.id === `asset_wildkin_${speciesId}`);
  const recipe = asset?.gameplay?.wildkin;
  return asset?.gameplay?.role === 'wildkin' && recipe?.speciesTag === speciesId ? asset : null;
}

function admittedThornprowlerAsset(visualAssets) {
  const asset = (visualAssets ?? []).find(candidate => candidate?.id === 'asset_thornprowler');
  const recipe = asset?.gameplay?.wildkin;
  const positiveFields = ['roamRadius', 'noticeRadius', 'personalSpace', 'leashRadius', 'health', 'moveSpeed', 'damage', 'respawnSeconds'];
  return asset?.gameplay?.role === 'wildkin'
    && recipe?.speciesTag === 'thornprowler'
    && recipe.archetype === 'rusher'
    && recipe.temperament === 'AGGRESSIVE'
    && positiveFields.every(field => Number.isFinite(recipe[field]) && recipe[field] > 0)
    ? { asset, recipe } : null;
}

function admittedRootboundTrailgloamAsset(visualAssets) {
  const asset = (visualAssets ?? []).find(candidate => candidate?.id === 'asset_wildkin_trailgloam');
  const recipe = asset?.gameplay?.wildkin;
  const model = asset?.model;
  return asset?.gameplay?.role === 'wildkin'
    && recipe?.speciesTag === 'trailgloam'
    && recipe.archetype === 'rusher'
    && recipe.temperament === 'SKITTISH'
    && recipe.health === 6
    && recipe.moveSpeed === ROOTBOUND_TRAILGLOAM_MOVE_SPEED
    && recipe.damage === 1
    && recipe.respawnSeconds === 28
    && recipe.roamRadius === 1.8
    && recipe.noticeRadius === 7
    && recipe.personalSpace === 2
    && recipe.leashRadius === 3
    && Array.isArray(recipe.hostileSpecies) && recipe.hostileSpecies.length === 0
    && model?.path === 'assets/models/trailgloam-fitted-r1/model.glb'
    && model?.scale === 1
    && model?.pivot?.x === 0 && model?.pivot?.y === 0 && model?.pivot?.z === 0
    && model?.clips?.idle === 'Loaded'
    && model?.clips?.walk === 'WalkDiagnostic'
    && model?.locomotion?.walk === ROOTBOUND_TRAILGLOAM_AUTHORED_ROAM_SPEED
    ? asset : null;
}

function movementDiskIntersectsCalderaCore(placement) {
  const radius = Math.max(0, placement.roamRadius ?? 0, placement.leashRadius ?? 0, placement.fleeLeashRadius ?? 0);
  return Math.hypot(
    placement.homePos.x - FRONTIER_CALDERA_CONFIG.center.x,
    placement.homePos.z - FRONTIER_CALDERA_CONFIG.center.z,
  ) < Math.max(FRONTIER_CALDERA_CONFIG.outerRadius.x, FRONTIER_CALDERA_CONFIG.outerRadius.z) + radius;
}

function movementDiskIntersectsFungalOuting(placement) {
  const radius = Math.max(0, placement.roamRadius ?? 0, placement.leashRadius ?? 0, placement.fleeLeashRadius ?? 0);
  return overlapsFrontierFungalOuting(placement.homePos.x, placement.homePos.z, radius);
}

function makeFixedCalderaEncounter(options) {
  const anchor = FRONTIER_CALDERA_WILDLIFE_ANCHOR;
  if (!admittedWildkinAsset(options.visualAssets, anchor.speciesId)) return null;
  const sample = terrainSample(anchor.x, anchor.z, options);
  if (!Number.isFinite(sample.height) || sample.habitatId !== FRONTIER_CALDERA_CONFIG.habitatId
    || !hasSafeCalderaHome(anchor.x, anchor.z, options)) return null;
  const placement = makeSideEncounter(anchor.cx, anchor.cz, anchor.index, anchor.x, anchor.z, anchor.speciesId, 1, options);
  if (!homeDiskIsLand(placement, options)) return null;
  return Object.freeze({
    ...placement,
    facingYaw: Math.PI,
    regionalSignature: true,
    calderaFeature: true,
  });
}

function makeFixedFungalEncounter(options) {
  const admitted = admittedThornprowlerAsset(options.visualAssets);
  if (!admitted) return null;
  const anchor = FRONTIER_FUNGAL_WILDLIFE_ANCHOR;
  const sample = terrainSample(anchor.x, anchor.z, options);
  if (!Number.isFinite(sample.height) || sample.habitatId !== FRONTIER_FUNGAL_CONFIG.habitatId
    || !hasSafeFungalHome(anchor.x, anchor.z, options)) return null;
  const { asset, recipe } = admitted;
  const { base } = placementBase(anchor.cx, anchor.cz, anchor.index, anchor.x, anchor.z, options);
  const placement = Object.freeze({
    ...base,
    type: recipe.archetype,
    speciesTag: recipe.speciesTag,
    temperament: recipe.temperament,
    roamRadius: recipe.roamRadius,
    noticeRadius: recipe.noticeRadius,
    personalSpace: recipe.personalSpace,
    leashRadius: recipe.leashRadius,
    visualAssetId: asset.id,
    facingYaw: 0,
    hostileSpecies: Object.freeze([...(recipe.hostileSpecies ?? [])]),
    configOverrides: Object.freeze({
      health: recipe.health,
      moveSpeed: recipe.moveSpeed,
      damage: recipe.damage,
      respawnSeconds: recipe.respawnSeconds,
    }),
    genome: null,
    residentPriority: 1,
    regionalSignature: true,
    fungalFeature: true,
  });
  return homeDiskIsLand(placement, options) ? placement : null;
}

function makeFixedRootboundTrailgloamEncounter(options) {
  if (!defaultWorld(options.world)) return null;
  const asset = admittedRootboundTrailgloamAsset(options.visualAssets);
  if (!asset) return null;
  const anchor = FRONTIER_ROOTBOUND_TRAILGLOAM_ANCHOR;
  const sample = terrainSample(anchor.x, anchor.z, options);
  if (!Number.isFinite(sample.height) || sample.habitatId !== 'rootbound-wildwood'
    || !hasSafeRootboundTrailgloamHome(anchor.x, anchor.z, options)) return null;
  const { base } = placementBase(anchor.cx, anchor.cz, anchor.index, anchor.x, anchor.z, options);
  const placement = Object.freeze({
    ...base,
    type: 'rusher',
    speciesTag: 'trailgloam',
    temperament: 'SKITTISH',
    roamRadius: anchor.roamRadius,
    noticeRadius: 7,
    personalSpace: 2,
    leashRadius: anchor.leashRadius,
    fleeLeashRadius: anchor.fleeLeashRadius,
    visualAssetId: asset.id,
    facingYaw: .8,
    hostileSpecies: Object.freeze([]),
    configOverrides: Object.freeze({
      health: 6, moveSpeed: ROOTBOUND_TRAILGLOAM_MOVE_SPEED, damage: 1, respawnSeconds: 28,
      // The fitted central shell is low and broad. This existing rusher
      // capsule intentionally covers that body only; feet and fronds remain
      // decorative until a later anatomy-specific collision decision.
      capsuleRadius: .48, capsuleHalfHeight: .02,
    }),
    genome: null,
    residentPriority: 1,
    rootboundTrailgloamFeature: true,
  });
  return homeDiskIsLand(placement, options) ? placement : null;
}

function makeFixedRootboundMeadowMosslingEncounter(options) {
  if (!defaultWorld(options.world) || !admittedWildkinAsset(options.visualAssets, 'mossling')) return null;
  const anchor = FRONTIER_ROOTBOUND_MEADOW_MOSSLING_ANCHOR;
  const sample = terrainSample(anchor.x, anchor.z, options);
  if (!Number.isFinite(sample.height) || sample.habitatId !== 'rootbound-wildwood'
    || !hasSafeRootboundMeadowMosslingHome(anchor.x, anchor.z, options)) return null;
  const placement = makeMosslingPlacement(anchor.cx, anchor.cz, anchor.index, anchor.x, anchor.z, options);
  const fixed = Object.freeze({
    ...placement,
    roamRadius: anchor.roamRadius,
    leashRadius: anchor.leashRadius,
    // Face the open Meadow approach; the native skittish controller retreats
    // away from an approaching player toward the Gallery-side root cover.
    facingYaw: Math.PI,
    residentPriority: 1,
    rootboundMeadowMosslingFeature: true,
  });
  return homeDiskIsLand(fixed, options) ? fixed : null;
}

function nearbyRegionalPlaces(cx, cz, options) {
  if (!hasRegionalPlaceAssets(options.visualAssets)) return [];
  const places = [];
  for (let dz = -1; dz <= 1; dz += 1) for (let dx = -1; dx <= 1; dx += 1) {
    const place = sampleFrontierRegionalPlaceChunk(cx + dx, cz + dz, options);
    if (place) places.push(place);
  }
  return places;
}

function homeDiskIntersectsPlace(placement, places) {
  const movementRadius = Math.max(0, placement.roamRadius ?? 0, placement.leashRadius ?? 0, placement.fleeLeashRadius ?? 0);
  return places.some(place => Math.hypot(placement.homePos.x - place.center.x, placement.homePos.z - place.center.z) < movementRadius + place.radius);
}

function homeDiskIsLand(placement, options) {
  const movementRadius = Math.max(0, placement.roamRadius ?? 0, placement.leashRadius ?? 0, placement.fleeLeashRadius ?? 0);
  return hasFrontierLandFootprint(placement.homePos.x, placement.homePos.z, {
    radius: movementRadius,
    getTerrainSample: (x, z) => terrainSample(x, z, options),
    world: options.world ?? DEFAULT_FRONTIER_WORLD,
  });
}

/** Pure, stable Wildkin sources for a terrain chunk. */
export function sampleFrontierWildlifeChunk(cx, cz, options = {}) {
  if (!Number.isSafeInteger(cx) || !Number.isSafeInteger(cz) || isCampChunk(cx, cz)) return [];
  const size = FRONTIER_TERRAIN_CONFIG.chunkSize;
  // The first northbound chunk is intentionally staged on its low, open
  // wetland shelf: (10,-85) currently samples a .116 slope.
  const starterShelf = cx === 0 && cz === -2;
  const emberShelf = cx === 0 && cz === -3;
  const skybreakCrown = cx === 0 && cz === -5;
  // Other chunks stay sparse and coordinate-seeded; no population simulation.
  const world = options.world ?? DEFAULT_FRONTIER_WORLD;
  const roll = (index, salt = 0) => random(cx, cz, index, salt, world);
  const sampleOptions = { ...options, world };
  if (cx === FRONTIER_CALDERA_WILDLIFE_ANCHOR.cx && cz === FRONTIER_CALDERA_WILDLIFE_ANCHOR.cz) {
    const fixed = makeFixedCalderaEncounter(sampleOptions);
    return fixed ? [fixed] : [];
  }
  if (cx === FRONTIER_FUNGAL_WILDLIFE_ANCHOR.cx && cz === FRONTIER_FUNGAL_WILDLIFE_ANCHOR.cz) {
    const fixed = makeFixedFungalEncounter(sampleOptions);
    return fixed ? [fixed] : [];
  }
  if (cx === FRONTIER_ROOTBOUND_TRAILGLOAM_ANCHOR.cx && cz === FRONTIER_ROOTBOUND_TRAILGLOAM_ANCHOR.cz) {
    const fixed = makeFixedRootboundTrailgloamEncounter(sampleOptions);
    if (fixed) return [fixed];
  }
  if (cx === FRONTIER_ROOTBOUND_MEADOW_MOSSLING_ANCHOR.cx && cz === FRONTIER_ROOTBOUND_MEADOW_MOSSLING_ANCHOR.cz) {
    const fixed = makeFixedRootboundMeadowMosslingEncounter(sampleOptions);
    if (fixed) return [fixed];
  }
  if (!starterShelf && !emberShelf && !skybreakCrown && roll(0, 13) >= .22) return [];
  // Sample each neighboring owner at most once for this chunk. A place center
  // is inset from its owner edge, but a creature's complete movement disk can
  // still cross the seam from an adjacent chunk.
  const places = nearbyRegionalPlaces(cx, cz, sampleOptions);
  const candidates = starterShelf
    ? [[7, -85], [20, -95], [17, -79]]
    : emberShelf
      ? [[0, -111]]
      : skybreakCrown
        ? [[9.5, -231.5]]
      : Array.from({ length: 8 }, (_, attempt) => [
        cx * size + EDGE + roll(attempt, 31) * (size - EDGE * 2),
        cz * size + EDGE + roll(attempt, 53) * (size - EDGE * 2),
      ]);
  if (starterShelf || emberShelf || skybreakCrown) {
    const placements = [];
    for (let index = 0; index < candidates.length; index += 1) {
      const [x, z] = candidates[index];
      const sample = terrainSample(x, z, sampleOptions);
      if (!Number.isFinite(sample.height) || slopeAt(x, z, sampleOptions) > MAX_SLOPE
        || (skybreakCrown ? !hasSafeSkybreakHome(x, z, sampleOptions) : !hasSafeHome(x, z, sampleOptions))) continue;
      let placement = null;
      if (starterShelf && index < 2) placement = makeMosslingPlacement(cx, cz, index, x, z, sampleOptions);
      else if (starterShelf) placement = makeSideEncounter(cx, cz, index, x, z, 'tidefin', 2, sampleOptions);
      else if (emberShelf) placement = makeSideEncounter(cx, cz, index, x, z, 'emberhorn', 3, sampleOptions);
      else if (sample.surfaceKind === 'skybreak-cap') {
        placement = Object.freeze({ ...makeMosslingPlacement(cx, cz, 100, x, z, sampleOptions), residentPriority: 4 });
      }
      if (placement && homeDiskIsLand(placement, sampleOptions) && !homeDiskIntersectsPlace(placement, places)) placements.push(placement);
    }
    return placements;
  }
  for (const [x, z] of candidates) {
    const sample = terrainSample(x, z, sampleOptions);
    if (Number.isFinite(sample.height) && slopeAt(x, z, sampleOptions) <= MAX_SLOPE && hasSafeHome(x, z, sampleOptions)) {
      const placement = makeRegionalPlacement(cx, cz, 0, x, z, sampleOptions);
      if (homeDiskIsLand(placement, sampleOptions) && !homeDiskIntersectsPlace(placement, places)
        && !movementDiskIntersectsCalderaCore(placement)
        && !movementDiskIntersectsFungalOuting(placement)) return [placement];
    }
  }
  return [];
}
