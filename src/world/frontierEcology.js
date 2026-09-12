import { FRONTIER_TERRAIN_CONFIG, isCampChunk, sampleFrontier } from './frontierTerrain.js';
import { makeFrontierResourceId } from './frontierEcologyState.js';

const EDGE = 3;
const CAMP_CLEARANCE = 6;
const SLOPE_SAMPLE = .8;
const MAX_SLOPE = .42;
const TERRACE_MINERAL_ASSET_BY_INDEX = Object.freeze({
  2: 'asset_iron_ore_rock',
  4: 'asset_crystal',
  7: 'asset_iron_ore_rock',
});

function random(cx, cz, index, salt = 0) {
  let value = Math.imul(cx | 0, 73856093) ^ Math.imul(cz | 0, 19349663) ^ Math.imul(index + salt, 83492791);
  value = Math.imul(value ^ (value >>> 16), 2246822519);
  return ((value ^ (value >>> 13)) >>> 0) / 4294967295;
}
function outsideCampApron(x, z) {
  const b = FRONTIER_TERRAIN_CONFIG.campBounds;
  return x < b.minX - CAMP_CLEARANCE || x > b.maxX + CAMP_CLEARANCE || z < b.minZ - CAMP_CLEARANCE || z > b.maxZ + CAMP_CLEARANCE;
}
function harvestableBerry(visualAssets) {
  const asset = (visualAssets ?? []).find(candidate => candidate?.id === 'asset_berry_bush');
  return asset?.gameplay?.role === 'harvestable' && asset.gameplay.harvestable ? asset : null;
}
function terraceMineral(cx, cz, index, kind, visualAssets) {
  if (cx !== 0 || cz !== -3 || kind.type !== 'rock') return kind;
  const assetId = TERRACE_MINERAL_ASSET_BY_INDEX[index];
  if (!assetId) return kind;
  const asset = (visualAssets ?? []).find(candidate => candidate?.id === assetId);
  return asset?.gameplay?.role === 'harvestable' && asset.gameplay.harvestable
    ? { ...kind, visualAsset: asset }
    : kind;
}
function typeFor(sample, roll, berry) {
  // Wetland produces visible low forage; upland favors solid sapwood/rock.
  if (sample.habitatBlend.wetland >= sample.habitatBlend.fernUpland) {
    if (berry && roll < .30) return { type: 'fiber', visualAsset: berry };
    return roll < .68 ? { type: 'fiber' } : { type: 'tree' };
  }
  return roll < .48 ? { type: 'tree' } : roll < .78 ? { type: 'rock' } : { type: 'fiber' };
}

/** Pure, per-chunk generated forage. Saved depletion is intentionally excluded. */
export function sampleFrontierForageChunk(cx, cz, { getHeight, visualAssets, terrainOptions } = {}) {
  if (!Number.isSafeInteger(cx) || !Number.isSafeInteger(cz) || isCampChunk(cx, cz)) return [];
  const size = FRONTIER_TERRAIN_CONFIG.chunkSize;
  const count = 6 + Math.floor(random(cx, cz, 0, 11) * 3);
  const berry = harvestableBerry(visualAssets);
  const placements = [];
  for (let index = 0; index < 32 && placements.length < count; index++) {
    const group = Math.floor(index / 3);
    const camp = FRONTIER_TERRAIN_CONFIG.campBounds;
    const northApproach = cz === Math.floor((camp.minZ - size * 2) / size) && (cx === -1 || cx === 0);
    // The first outbound north chunk inherits a small visible field group from
    // the Camp boundary; every other cluster is still coordinate-seeded.
    const approachCenters = cx < 0
      ? [[-5, (cz + 1) * size - 20], [-15, (cz + 1) * size - 26], [-7, (cz + 1) * size - 33]]
      : [[5, (cz + 1) * size - 20], [15, (cz + 1) * size - 26], [7, (cz + 1) * size - 33]];
    const centerX = northApproach ? approachCenters[group % approachCenters.length][0] : cx * size + EDGE + random(cx, cz, group, 31) * (size - EDGE * 2);
    const centerZ = northApproach ? approachCenters[group % approachCenters.length][1] : cz * size + EDGE + random(cx, cz, group, 53) * (size - EDGE * 2);
    const slot = index % 3;
    const angle = slot * Math.PI * 2 / 3 + random(cx, cz, group, 137) * .35;
    const radius = 1.75 + random(cx, cz, index, 151) * .35;
    const x = centerX + Math.cos(angle) * radius;
    const z = centerZ + Math.sin(angle) * radius;
    if (x < cx * size + EDGE || x > (cx + 1) * size - EDGE || z < cz * size + EDGE || z > (cz + 1) * size - EDGE) continue;
    if (!outsideCampApron(x, z)) continue;
    const height = typeof getHeight === 'function' ? getHeight(x, z) : sampleFrontier(x, z, terrainOptions).height;
    const dx = (typeof getHeight === 'function' ? getHeight(x + SLOPE_SAMPLE, z) - getHeight(x - SLOPE_SAMPLE, z) : sampleFrontier(x + SLOPE_SAMPLE, z, terrainOptions).height - sampleFrontier(x - SLOPE_SAMPLE, z, terrainOptions).height) / (SLOPE_SAMPLE * 2);
    const dz = (typeof getHeight === 'function' ? getHeight(x, z + SLOPE_SAMPLE) - getHeight(x, z - SLOPE_SAMPLE) : sampleFrontier(x, z + SLOPE_SAMPLE, terrainOptions).height - sampleFrontier(x, z - SLOPE_SAMPLE, terrainOptions).height) / (SLOPE_SAMPLE * 2);
    if (!Number.isFinite(height) || Math.hypot(dx, dz) > MAX_SLOPE) continue;
    const stagedBerry = northApproach && group === 0 && slot === 0 && berry;
    const baseKind = stagedBerry ? { type: 'fiber', visualAsset: berry } : typeFor(sampleFrontier(x, z, terrainOptions), random(cx, cz, index, 79), berry);
    const kind = terraceMineral(cx, cz, index, baseKind, visualAssets);
    const uniformScale = kind.type === 'tree' ? .72 + random(cx, cz, index, 107) * .08
      : kind.type === 'fiber' ? 1.08 + random(cx, cz, index, 107) * .14
        : .9 + random(cx, cz, index, 107) * .14;
    placements.push({ ...kind, id: makeFrontierResourceId(cx, cz, index), chunkId: `${cx},${cz}`, placementIndex: index, regionId: 'camp', persistentFinite: true, pos: { x, y: height, z }, rotY: random(cx, cz, index, 97) * Math.PI * 2, uniformScale, tint: kind.type === 'fiber' && !kind.visualAsset ? '#8eb65a' : undefined });
  }
  return placements;
}
