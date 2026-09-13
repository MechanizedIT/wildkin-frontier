import { sampleFrontierForageChunk } from './frontierEcology.js';
import { hasFootprintSupport } from './frontierPlacement.js';
import { sampleFrontierSceneryChunk } from './frontierScenery.js';
import { FRONTIER_TERRAIN_CONFIG, sampleFrontier } from './frontierTerrain.js';
import { sampleFrontierWildlifeChunk } from './frontierWildlife.js';
import { DEFAULT_FRONTIER_WORLD } from './frontierWorld.js';
import { FRONTIER_CONTINENT_CONFIG, hasFrontierLandFootprint } from './frontierContinent.js';
import { sampleFrontierRegionalPlaceChunk } from './frontierRegionalPlace.js';

export const FRONTIER_SIGNAL_CACHE = Object.freeze({
  id: 'f1:d:3:1:0',
  chunkId: '3,1',
  sectionId: 'camp',
  x: 170,
  z: 50,
  chestOffset: Object.freeze({ x: 1.8, z: 2.8 }),
  displayName: 'Sunscar Signal Cache',
  chestAssetId: 'asset_chest',
  receiverAssetId: 'asset_fen_observatory',
  lootTableId: 'loot_secret_section_1',
  footprintRadius: 4.5,
});

const ADMITTED_MODEL_PATH = Object.freeze({
  asset_chest: 'assets/models/field-chest-v1/model.glb',
  asset_fen_observatory: 'assets/models/fen-observatory-v1/model.glb',
});
const CLEARANCE = Object.freeze({ forage: 6, scenery: 5, wildlife: 10 });

const MAX_HARMONIC_REACH = FRONTIER_CONTINENT_CONFIG.harmonics
  .reduce((sum, harmonic) => sum + Math.abs(harmonic.amplitude), 0)
  + FRONTIER_CONTINENT_CONFIG.smoothMaxWidth / 4;
const xReach = FRONTIER_CONTINENT_CONFIG.outerRadii.x + MAX_HARMONIC_REACH;
const zReach = FRONTIER_CONTINENT_CONFIG.outerRadii.z + MAX_HARMONIC_REACH;
const chunkSize = FRONTIER_TERRAIN_CONFIG.chunkSize;

/** Conservative finite scan bounds containing every possible default-continent place center. */
export const FRONTIER_DISCOVERY_CHUNK_BOUNDS = Object.freeze({
  minCx: Math.floor((FRONTIER_CONTINENT_CONFIG.center.x - xReach) / chunkSize),
  maxCx: Math.floor((FRONTIER_CONTINENT_CONFIG.center.x + xReach) / chunkSize),
  minCz: Math.floor((FRONTIER_CONTINENT_CONFIG.center.z - zReach) / chunkSize),
  maxCz: Math.floor((FRONTIER_CONTINENT_CONFIG.center.z + zReach) / chunkSize),
});

function admittedAsset(visualAssets, id) {
  const asset = visualAssets?.find(candidate => candidate?.id === id);
  return asset?.model?.path === ADMITTED_MODEL_PATH[id]
    && asset.gameplay?.role === 'prop'
    && asset.collision?.shape === 'box' ? asset : null;
}

function distanceTo(source, x, z) {
  const pos = source?.pos ?? source?.homePos ?? source;
  return Number.isFinite(pos?.x) && Number.isFinite(pos?.z) ? Math.hypot(pos.x - x, pos.z - z) : Infinity;
}

function clearsBothObjects(entry, distance, source, chestX, chestZ) {
  return distanceTo(entry, source.x, source.z) >= distance && distanceTo(entry, chestX, chestZ) >= distance;
}

function neighboringRecipes(cx, cz, options) {
  const forage = [], scenery = [], wildlife = [];
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    forage.push(...options.sampleForageChunk(cx + dx, cz + dz, options.recipeOptions));
    scenery.push(...options.sampleSceneryChunk(cx + dx, cz + dz, options.recipeOptions));
    wildlife.push(...options.sampleWildlifeChunk(cx + dx, cz + dz, options.recipeOptions));
  }
  return { forage, scenery, wildlife };
}

function sampleSignalCache({
  visualAssets, lootTables, world, getTerrainSample, getHeight,
  sampleForageChunk, sampleSceneryChunk, sampleWildlifeChunk,
}) {
  const source = FRONTIER_SIGNAL_CACHE;
  const chestAsset = admittedAsset(visualAssets, source.chestAssetId);
  const receiverAsset = admittedAsset(visualAssets, source.receiverAssetId);
  if (!chestAsset || !receiverAsset || !lootTables.some(table => table?.id === source.lootTableId)) return null;
  const terrain = getTerrainSample(source.x, source.z);
  if (!Number.isFinite(terrain?.height) || terrain.provinceKind !== 'sunscar' || !(terrain.provinceInfluence >= .9)
    || !hasFrontierLandFootprint(source.x, source.z, { radius: source.footprintRadius, getTerrainSample, world })) return null;
  if (!hasFootprintSupport(source.x, source.z, { getHeight, radius: source.footprintRadius, maxSlope: .18 })) return null;
  const chestX = source.x + source.chestOffset.x, chestZ = source.z + source.chestOffset.z;
  const chestCollision = chestAsset.collision.size;
  const chestRadius = Math.hypot(chestCollision.w, chestCollision.d) * .5;
  if (!hasFrontierLandFootprint(chestX, chestZ, { radius: chestRadius, getTerrainSample, world })
    || !hasFootprintSupport(chestX, chestZ, { getHeight, radius: chestRadius, maxSlope: .18 })) return null;
  const recipeOptions = { visualAssets, world, getTerrainSample, getHeight };
  const nearby = neighboringRecipes(3, 1, { sampleForageChunk, sampleSceneryChunk, sampleWildlifeChunk, recipeOptions });
  if (nearby.forage.some(entry => !clearsBothObjects(entry, CLEARANCE.forage, source, chestX, chestZ))
    || nearby.scenery.some(entry => !clearsBothObjects(entry, CLEARANCE.scenery, source, chestX, chestZ))
    || nearby.wildlife.some(entry => !clearsBothObjects(entry, CLEARANCE.wildlife, source, chestX, chestZ))) return null;
  const chestHeight = getHeight(chestX, chestZ);
  if (!Number.isFinite(chestHeight)) return null;
  return Object.freeze({
    id: source.id,
    placementKind: 'fixed-authored',
    chunkId: source.chunkId,
    sectionId: source.sectionId,
    regionId: source.sectionId,
    displayName: source.displayName,
    landmarkPos: Object.freeze({ x: source.x, y: terrain.height, z: source.z }),
    pos: Object.freeze({ x: chestX, y: chestHeight, z: chestZ }),
    rotY: 0,
    uniformScale: 1,
    visualAssetId: source.chestAssetId,
    receiverAssetId: source.receiverAssetId,
    lootTableId: source.lootTableId,
    refillSeconds: null,
    triggerRadius: 1.4,
    collisionEnabled: true,
  });
}

function sampleRegionalDiscoveryCatalog({
  visualAssets, lootTables, world, getTerrainSample, getHeight,
  sampleRegionalPlaceChunk, chunkBounds,
}) {
  if (!admittedAsset(visualAssets, 'asset_chest')
    || !lootTables.some(table => table?.id === 'loot_lush_root_cache')) return [];
  const discoveries = [];
  for (let cz = chunkBounds.minCz; cz <= chunkBounds.maxCz; cz += 1) {
    for (let cx = chunkBounds.minCx; cx <= chunkBounds.maxCx; cx += 1) {
      const place = sampleRegionalPlaceChunk(cx, cz, { visualAssets, world, getTerrainSample, getHeight });
      if (place?.kind !== 'lush-root-cache' || !place.chest
        || !Number.isFinite(place.chest.x) || !Number.isFinite(place.chest.z)) continue;
      const y = getHeight(place.chest.x, place.chest.z);
      if (!Number.isFinite(y)) continue;
      discoveries.push(Object.freeze({
        id: `f1:d:${cx}:${cz}:lush-root-cache`,
        placementKind: 'generated-regional',
        chunkId: `${cx},${cz}`,
        sectionId: 'camp',
        regionId: 'camp',
        displayName: 'Lush Root Cache',
        pos: Object.freeze({ x: place.chest.x, y, z: place.chest.z }),
        rotY: place.chest.yaw,
        uniformScale: place.chest.scale ?? 1,
        visualAssetId: 'asset_chest',
        lootTableId: 'loot_lush_root_cache',
        refillSeconds: null,
        triggerRadius: 1.4,
        collisionEnabled: true,
        requiredCompanionId: 'mossling',
        opensOnSeal: true,
      }));
    }
  }
  return discoveries;
}

/** Enumerates every canonical finite-continent discovery before save normalization. */
export function sampleFrontierDiscoveries({
  visualAssets = [], lootTables = [], world = DEFAULT_FRONTIER_WORLD,
  getTerrainSample = (x, z) => sampleFrontier(x, z, { world }),
  getHeight = (x, z) => getTerrainSample(x, z).height,
  sampleForageChunk = sampleFrontierForageChunk,
  sampleSceneryChunk = sampleFrontierSceneryChunk,
  sampleWildlifeChunk = sampleFrontierWildlifeChunk,
  sampleRegionalPlaceChunk = sampleFrontierRegionalPlaceChunk,
  chunkBounds = FRONTIER_DISCOVERY_CHUNK_BOUNDS,
} = {}) {
  if (world?.edition !== DEFAULT_FRONTIER_WORLD.edition || world?.seed !== DEFAULT_FRONTIER_WORLD.seed) return [];
  const signal = sampleSignalCache({
    visualAssets, lootTables, world, getTerrainSample, getHeight,
    sampleForageChunk, sampleSceneryChunk, sampleWildlifeChunk,
  });
  const regional = sampleRegionalDiscoveryCatalog({
    visualAssets, lootTables, world, getTerrainSample, getHeight,
    sampleRegionalPlaceChunk, chunkBounds,
  });
  return signal ? [signal, ...regional] : regional;
}
