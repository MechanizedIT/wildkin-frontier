import { FRONTIER_TERRAIN_CONFIG, isCampChunk, sampleFrontier } from './frontierTerrain.js';
import { createWildkinGenome } from '../creatures/wildkinGenome.js';
import { DEFAULT_FRONTIER_WORLD, frontierDomainSeed } from './frontierWorld.js';
import { isSkybreakArea } from './frontierLandform.js';
import { hasFootprintSupport } from './frontierPlacement.js';

const EDGE = 5;
const SLOPE_SAMPLE = .8;
const MAX_SLOPE = .32;
// Skybreak homes need a whole ordinary Mossling roam circle plus its body
// margin, rather than merely a locally level spawn point. This establishes
// safe ordinary roaming around home; pursuit/flee paths remain dynamic.
const HOME_FOOTPRINT_RADIUS = 4.9;

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

function slopeAt(x, z, options) {
  const dx = (terrainSample(x + SLOPE_SAMPLE, z, options).height - terrainSample(x - SLOPE_SAMPLE, z, options).height) / (SLOPE_SAMPLE * 2);
  const dz = (terrainSample(x, z + SLOPE_SAMPLE, options).height - terrainSample(x, z - SLOPE_SAMPLE, options).height) / (SLOPE_SAMPLE * 2);
  return Math.hypot(dx, dz);
}

function hasSafeHome(x, z, options) {
  if (!isSkybreakArea(x, z, HOME_FOOTPRINT_RADIUS)) return true;
  return hasFootprintSupport(x, z, {
    getHeight: (sx, sz) => terrainSample(sx, sz, options).height,
    radius: HOME_FOOTPRINT_RADIUS,
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
  return Object.freeze({
    ...base,
    type: 'rusher',
    speciesTag: 'mossling',
    temperament: 'SKITTISH',
    facingYaw: random(cx, cz, index, 71, options.world) * Math.PI * 2,
    // Only the first clearing receives a tight, readable scare/return loop.
    // Other generated Mosslings retain the ordinary broader wildlife range.
    roamRadius: stagedShelf ? 2.6 : 4.4,
    leashRadius: stagedShelf ? 4.2 : 8.5,
    fleeLeashRadius: stagedShelf ? 3.5 : null,
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

/** Pure, stable Wildkin sources for a terrain chunk. */
export function sampleFrontierWildlifeChunk(cx, cz, options = {}) {
  if (!Number.isSafeInteger(cx) || !Number.isSafeInteger(cz) || isCampChunk(cx, cz)) return [];
  const size = FRONTIER_TERRAIN_CONFIG.chunkSize;
  // The first northbound chunk is intentionally staged on its low, open
  // wetland shelf: (10,-85) currently samples a .116 slope.
  const starterShelf = cx === 0 && cz === -2;
  const emberShelf = cx === 0 && cz === -3;
  // Other chunks stay sparse and coordinate-seeded; no population simulation.
  const world = options.world ?? DEFAULT_FRONTIER_WORLD;
  const roll = (index, salt = 0) => random(cx, cz, index, salt, world);
  const sampleOptions = { ...options, world };
  if (!starterShelf && !emberShelf && roll(0, 13) >= .22) return [];
  const candidates = starterShelf
    ? [[7, -85], [20, -95], [17, -79]]
    : emberShelf
      ? [[0, -111]]
    : Array.from({ length: 8 }, (_, attempt) => [
        cx * size + EDGE + roll(attempt, 31) * (size - EDGE * 2),
        cz * size + EDGE + roll(attempt, 53) * (size - EDGE * 2),
      ]);
  if (starterShelf || emberShelf) {
    const placements = [];
    for (let index = 0; index < candidates.length; index += 1) {
      const [x, z] = candidates[index];
      const sample = terrainSample(x, z, sampleOptions);
      if (!Number.isFinite(sample.height) || slopeAt(x, z, sampleOptions) > MAX_SLOPE || !hasSafeHome(x, z, sampleOptions)) continue;
      if (starterShelf && index < 2) placements.push(makeMosslingPlacement(cx, cz, index, x, z, sampleOptions));
      else if (starterShelf) placements.push(makeSideEncounter(cx, cz, index, x, z, 'tidefin', 2, sampleOptions));
      else placements.push(makeSideEncounter(cx, cz, index, x, z, 'emberhorn', 3, sampleOptions));
    }
    return placements;
  }
  for (const [x, z] of candidates) {
    const sample = terrainSample(x, z, sampleOptions);
    if (Number.isFinite(sample.height) && slopeAt(x, z, sampleOptions) <= MAX_SLOPE && hasSafeHome(x, z, sampleOptions)) return [makeMosslingPlacement(cx, cz, 0, x, z, sampleOptions)];
  }
  return [];
}
