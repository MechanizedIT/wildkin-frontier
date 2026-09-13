import { FRONTIER_TERRAIN_CONFIG, sampleFrontier } from './frontierTerrain.js';
import { hasFootprintSupport } from './frontierPlacement.js';
import { DEFAULT_FRONTIER_WORLD, frontierDomainSeed } from './frontierWorld.js';
import { hasFrontierLandFootprint } from './frontierContinent.js';

export const FRONTIER_REGIONAL_PLACE_RADIUS = 7;
export const FRONTIER_REGIONAL_PLACE_RESOURCE_SLOTS = Object.freeze({ main: 200, outer: 201 });

const MACRO_SIZE = 4;
const CENTER_INSET = 15;
const CENTER_SPAN = 20;
const MAX_SLOPE = .28;
const SUNSCAR_PURITY = .65;
const STARTER_SCENERY_BUFFER = 107;
const SIGNAL_CACHE = Object.freeze({ x: 170, z: 50, clearance: 30 });
const ASSET_RADIUS = Object.freeze({
  asset_crystal: 1.3,
  asset_fen_stone: 1.14,
  asset_cloudflower: 1.02,
  asset_trail_stones: 1.57,
});
const APPROACH = Object.freeze({ x: 0, z: 4.8, radius: 1.15 });

const FAN_PARTS = Object.freeze([
  Object.freeze({ role: 'resource', index: 200, assetId: 'asset_crystal', type: 'rock', x: .08, z: .58, uniformScale: .72, yaw: .11 }),
  Object.freeze({ role: 'scenery', key: 'rear-stone-left', assetId: 'asset_fen_stone', kind: 'low', x: -1.78, z: -1.58, scale: .45, yaw: -.31 }),
  Object.freeze({ role: 'scenery', key: 'rear-stone-right', assetId: 'asset_fen_stone', kind: 'low', x: 1.86, z: -1.96, scale: .45, yaw: .14 }),
  Object.freeze({ role: 'scenery', key: 'flower-left', assetId: 'asset_cloudflower', kind: 'low', x: -1.38, z: .38, scale: .5, yaw: -.24 }),
  Object.freeze({ role: 'scenery', key: 'flower-right', assetId: 'asset_cloudflower', kind: 'low', x: 1.48, z: 1.02, scale: .5, yaw: .12 }),
  Object.freeze({ role: 'scenery', key: 'flower-front', assetId: 'asset_cloudflower', kind: 'low', x: -.62, z: 2.48, scale: .5, yaw: .38 }),
  Object.freeze({ role: 'scenery', key: 'trail-stones-left', assetId: 'asset_trail_stones', kind: 'low', x: -2.38, z: 2.18, scale: .56, yaw: -.52 }),
  Object.freeze({ role: 'scenery', key: 'trail-stones-right', assetId: 'asset_trail_stones', kind: 'low', x: 2.28, z: 2.58, scale: .56, yaw: .21 }),
]);

const CLEFT_PARTS = Object.freeze([
  Object.freeze({ role: 'resource', index: 200, assetId: 'asset_crystal', type: 'rock', x: -1.16, z: .35, uniformScale: .72, yaw: -.12 }),
  Object.freeze({ role: 'resource', index: 201, assetId: 'asset_crystal', type: 'rock', x: 1.38, z: .12, uniformScale: .5, yaw: .2 }),
  Object.freeze({ role: 'scenery', key: 'rear-stone-left', assetId: 'asset_fen_stone', kind: 'low', x: -2.05, z: -1.72, scale: .45, yaw: -.37 }),
  Object.freeze({ role: 'scenery', key: 'rear-stone-right', assetId: 'asset_fen_stone', kind: 'low', x: 2.12, z: -2.05, scale: .45, yaw: .17 }),
  Object.freeze({ role: 'scenery', key: 'flower-left', assetId: 'asset_cloudflower', kind: 'low', x: -1.95, z: 1.65, scale: .5, yaw: -.28 }),
  Object.freeze({ role: 'scenery', key: 'flower-right', assetId: 'asset_cloudflower', kind: 'low', x: 1.88, z: 1.38, scale: .5, yaw: .1 }),
  Object.freeze({ role: 'scenery', key: 'flower-front', assetId: 'asset_cloudflower', kind: 'low', x: -.55, z: 2.55, scale: .5, yaw: .44 }),
  Object.freeze({ role: 'scenery', key: 'trail-stones-left', assetId: 'asset_trail_stones', kind: 'low', x: -2.55, z: 3.1, scale: .56, yaw: -.58 }),
  Object.freeze({ role: 'scenery', key: 'trail-stones-right', assetId: 'asset_trail_stones', kind: 'low', x: 2.42, z: 2.72, scale: .56, yaw: .16 }),
]);

function roll(mx, mz, key, world) {
  const salt = frontierDomainSeed(world, 'regional-bloom', 0x7319);
  let hash = Math.imul(mx, 73856093) ^ Math.imul(mz, 19349663) ^ Math.imul(key + salt, 83492791);
  hash = Math.imul(hash ^ (hash >>> 16), 2246822519);
  return ((hash ^ (hash >>> 13)) >>> 0) / 4294967295;
}

function ownerOffset(value) {
  return Math.max(0, Math.min(MACRO_SIZE - 1, Math.floor(value * MACRO_SIZE)));
}

function rawOwnerCandidate(mx, mz, world) {
  return {
    mx, mz,
    cx: mx * MACRO_SIZE + ownerOffset(roll(mx, mz, 1, world)),
    cz: mz * MACRO_SIZE + ownerOffset(roll(mx, mz, 2, world)),
    priority: roll(mx, mz, 7, world),
  };
}

function precedes(candidate, other) {
  return candidate.priority > other.priority
    || (candidate.priority === other.priority
      && (candidate.mx < other.mx || (candidate.mx === other.mx && candidate.mz < other.mz)));
}

function survivesSpatialThinning(candidate, world) {
  for (let dmz = -1; dmz <= 1; dmz += 1) for (let dmx = -1; dmx <= 1; dmx += 1) {
    if (dmx === 0 && dmz === 0) continue;
    const other = rawOwnerCandidate(candidate.mx + dmx, candidate.mz + dmz, world);
    if (Math.max(Math.abs(candidate.cx - other.cx), Math.abs(candidate.cz - other.cz)) <= 2
      && precedes(other, candidate)) return false;
  }
  return true;
}

function rotate(localX, localZ, yaw) {
  const cos = Math.cos(yaw), sin = Math.sin(yaw);
  // Match Three.js rotation.y: local +Z turns toward world +X.
  return { x: localX * cos + localZ * sin, z: -localX * sin + localZ * cos };
}

function sampleTerrain(x, z, options, world) {
  return typeof options.getTerrainSample === 'function'
    ? options.getTerrainSample(x, z)
    : sampleFrontier(x, z, { ...options.terrainOptions, world });
}

function getHeight(x, z, options, world) {
  return typeof options.getHeight === 'function' ? options.getHeight(x, z) : sampleTerrain(x, z, options, world).height;
}

function supported(x, z, radius, options, world) {
  return hasFootprintSupport(x, z, {
    getHeight: (sx, sz) => getHeight(sx, sz, options, world),
    radius,
    maxSlope: MAX_SLOPE,
  });
}

function distanceToRect(x, z, minX, maxX, minZ, maxZ) {
  return Math.hypot(Math.max(minX - x, 0, x - maxX), Math.max(minZ - z, 0, z - maxZ));
}

function clearsExactReserve(x, z) {
  const camp = distanceToRect(x, z, -108, 108, -108, 108);
  const northRoute = distanceToRect(x, z, -75, 75, -275, -50);
  return Math.min(camp, northRoute) >= STARTER_SCENERY_BUFFER;
}

function usableParts(asset) {
  return Array.isArray(asset?.parts) && asset.parts.length > 0
    && asset.parts.every(part => {
      const positions = part?.geometry?.positions;
      const indices = part?.geometry?.indices;
      if (part?.shape !== 'mesh' || !Array.isArray(positions) || positions.length < 9 || positions.length % 3 !== 0
        || !Array.isArray(indices) || indices.length < 3 || indices.length % 3 !== 0
        || !positions.every(Number.isFinite)) return false;
      const vertexCount = positions.length / 3;
      return indices.every(index => Number.isSafeInteger(index) && index >= 0 && index < vertexCount);
    });
}

/** One admission contract shared by every system that reserves or emits a bloom. */
export function hasRegionalPlaceAssets(visualAssets) {
  if (!Array.isArray(visualAssets)) return false;
  const asset = id => visualAssets.find(candidate => candidate?.id === id);
  const crystal = asset('asset_crystal');
  const harvestable = crystal?.gameplay?.harvestable;
  const collision = crystal?.collision;
  if (!usableParts(crystal) || crystal?.gameplay?.role !== 'harvestable'
    || harvestable?.dropId !== 'crystal_shard' || harvestable?.maxChunks !== 4
    || harvestable?.feedbackProfile !== 'stone' || harvestable?.respawnSeconds !== 28
    || collision?.shape !== 'box' || collision?.size?.w !== 2.04
    || collision?.size?.h !== 1.55 || collision?.size?.d !== 1.6
    || collision?.offset?.x !== .016 || collision?.offset?.y !== .775 || collision?.offset?.z !== .024) return false;
  return ['asset_fen_stone', 'asset_cloudflower', 'asset_trail_stones'].every(id => {
    const decor = asset(id);
    return decor?.gameplay?.role === 'prop' && usableParts(decor);
  });
}

/** Pure, deterministic crystal-bloom recipe returned only by its owner chunk. */
export function sampleFrontierRegionalPlaceChunk(cx, cz, options = {}) {
  if (!Number.isSafeInteger(cx) || !Number.isSafeInteger(cz)) return null;
  const world = options.world ?? DEFAULT_FRONTIER_WORLD;
  const mx = Math.floor(cx / MACRO_SIZE), mz = Math.floor(cz / MACRO_SIZE);
  const owner = rawOwnerCandidate(mx, mz, world);
  if (cx !== owner.cx || cz !== owner.cz || !survivesSpatialThinning(owner, world)) return null;

  const size = FRONTIER_TERRAIN_CONFIG.chunkSize;
  const centerX = cx * size + CENTER_INSET + roll(mx, mz, 3, world) * CENTER_SPAN;
  const centerZ = cz * size + CENTER_INSET + roll(mx, mz, 4, world) * CENTER_SPAN;
  const centerSample = sampleTerrain(centerX, centerZ, options, world);
  if (centerSample?.provinceKind !== 'sunscar' || !(centerSample.provinceInfluence >= .95)
    || !(centerSample.provinceWeights?.sunscar >= SUNSCAR_PURITY)
    || centerSample.surfaceKind || !clearsExactReserve(centerX, centerZ)
    || Math.hypot(centerX - SIGNAL_CACHE.x, centerZ - SIGNAL_CACHE.z) < SIGNAL_CACHE.clearance
    || !hasFrontierLandFootprint(centerX, centerZ, {
      radius: FRONTIER_REGIONAL_PLACE_RADIUS,
      getTerrainSample: (x, z) => sampleTerrain(x, z, options, world),
      world,
    })
    || !supported(centerX, centerZ, FRONTIER_REGIONAL_PLACE_RADIUS, options, world)) return null;

  const yaw = roll(mx, mz, 5, world) * Math.PI * 2;
  const layout = roll(mx, mz, 6, world) < .5 ? 'fan' : 'cleft';
  const parts = layout === 'fan' ? FAN_PARTS : CLEFT_PARTS;
  const resources = [], scenery = [];
  for (const part of parts) {
    const offset = rotate(part.x, part.z, yaw);
    const x = centerX + offset.x, z = centerZ + offset.z;
    const radius = ASSET_RADIUS[part.assetId] * (part.uniformScale ?? part.scale);
    if (!supported(x, z, radius, options, world)) return null;
    if (part.role === 'resource') resources.push(Object.freeze({
      index: part.index, assetId: part.assetId, type: part.type, x, z,
      uniformScale: part.uniformScale, yaw: yaw + part.yaw,
    }));
    else {
      const y = getHeight(x, z, options, world);
      if (!Number.isFinite(y)) return null;
      scenery.push(Object.freeze({
        key: `regional-bloom:${cx}:${cz}:${part.key}`,
        assetId: part.assetId, kind: part.kind, x, z, y,
        scale: part.scale, yaw: yaw + part.yaw,
      }));
    }
  }
  const approachOffset = rotate(APPROACH.x, APPROACH.z, yaw);
  if (!supported(centerX + approachOffset.x, centerZ + approachOffset.z, APPROACH.radius, options, world)) return null;

  return Object.freeze({
    id: `f1:p:${cx}:${cz}:sunscar-bloom`, cx, cz, kind: 'sunscar-bloom',
    center: Object.freeze({ x: centerX, z: centerZ }), yaw, layout,
    radius: FRONTIER_REGIONAL_PLACE_RADIUS,
    resources: Object.freeze(resources), scenery: Object.freeze(scenery),
  });
}
