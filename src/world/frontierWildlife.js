import { FRONTIER_TERRAIN_CONFIG, isCampChunk, sampleFrontier } from './frontierTerrain.js';
import { createWildkinGenome } from '../creatures/wildkinGenome.js';

const EDGE = 5;
const SLOPE_SAMPLE = .8;
const MAX_SLOPE = .32;

function random(cx, cz, index, salt = 0) {
  let value = Math.imul(cx | 0, 73856093) ^ Math.imul(cz | 0, 19349663) ^ Math.imul(index + salt, 83492791);
  value = Math.imul(value ^ (value >>> 16), 2246822519);
  return ((value ^ (value >>> 13)) >>> 0) / 4294967295;
}

function terrainSample(x, z, { getTerrainSample, terrainOptions } = {}) {
  return typeof getTerrainSample === 'function' ? getTerrainSample(x, z) : sampleFrontier(x, z, terrainOptions);
}

function slopeAt(x, z, options) {
  const dx = (terrainSample(x + SLOPE_SAMPLE, z, options).height - terrainSample(x - SLOPE_SAMPLE, z, options).height) / (SLOPE_SAMPLE * 2);
  const dz = (terrainSample(x, z + SLOPE_SAMPLE, options).height - terrainSample(x, z - SLOPE_SAMPLE, options).height) / (SLOPE_SAMPLE * 2);
  return Math.hypot(dx, dz);
}

function habitatEcotype(sample) {
  return sample.habitatBlend.wetland >= sample.habitatBlend.fernUpland ? 'fen' : 'grove';
}

function makePlacement(cx, cz, index, x, z, options) {
  const sample = terrainSample(x, z, options);
  const originId = `f1:w:${cx}:${cz}:${index}`;
  const stagedShelf = cx === 0 && cz === -2;
  return Object.freeze({
    id: originId,
    originId,
    chunkId: `${cx},${cz}`,
    generatedChunkId: `${cx},${cz}`,
    isGeneratedResident: true,
    type: 'rusher',
    speciesTag: 'mossling',
    temperament: 'SKITTISH',
    regionId: 'camp',
    pos: Object.freeze({ x, y: sample.height, z }),
    homePos: Object.freeze({ x, y: sample.height, z }),
    facingYaw: random(cx, cz, index, 71) * Math.PI * 2,
    // Only the first clearing receives a tight, readable scare/return loop.
    // Other generated Mosslings retain the ordinary broader wildlife range.
    roamRadius: stagedShelf ? 2.6 : 4.4,
    leashRadius: stagedShelf ? 4.2 : 8.5,
    fleeLeashRadius: stagedShelf ? 3.5 : null,
    noticeRadius: 7,
    personalSpace: 2.1,
    visualAssetId: 'asset_wildkin_mossling',
    genome: createWildkinGenome(originId, habitatEcotype(sample)),
  });
}

/** Pure, stable Mossling sources for a terrain chunk. */
export function sampleFrontierWildlifeChunk(cx, cz, options = {}) {
  if (!Number.isSafeInteger(cx) || !Number.isSafeInteger(cz) || isCampChunk(cx, cz)) return [];
  const size = FRONTIER_TERRAIN_CONFIG.chunkSize;
  // The first northbound chunk is intentionally staged on its low, open
  // wetland shelf: (10,-85) currently samples a .116 slope.
  const staged = cx === 0 && cz === -2;
  // Other chunks stay sparse and coordinate-seeded; no population simulation.
  if (!staged && random(cx, cz, 0, 13) >= .22) return [];
  const candidates = staged
    ? [[7, -85], [20, -95]]
    : Array.from({ length: 8 }, (_, attempt) => [
        cx * size + EDGE + random(cx, cz, attempt, 31) * (size - EDGE * 2),
        cz * size + EDGE + random(cx, cz, attempt, 53) * (size - EDGE * 2),
      ]);
  if (staged) {
    const placements = [];
    for (let index = 0; index < candidates.length; index += 1) {
      const [x, z] = candidates[index];
      const sample = terrainSample(x, z, options);
      if (Number.isFinite(sample.height) && slopeAt(x, z, options) <= MAX_SLOPE) placements.push(makePlacement(cx, cz, index, x, z, options));
    }
    return placements;
  }
  for (const [x, z] of candidates) {
    const sample = terrainSample(x, z, options);
    if (Number.isFinite(sample.height) && slopeAt(x, z, options) <= MAX_SLOPE) return [makePlacement(cx, cz, 0, x, z, options)];
  }
  return [];
}
