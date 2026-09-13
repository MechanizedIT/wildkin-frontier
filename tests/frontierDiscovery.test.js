import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FRONTIER_DISCOVERY_CHUNK_BOUNDS,
  FRONTIER_SIGNAL_CACHE,
  sampleFrontierDiscoveries,
} from '../src/world/frontierDiscovery.js';
import { sampleFrontier } from '../src/world/frontierTerrain.js';
import { hasFootprintSupport } from '../src/world/frontierPlacement.js';
import { WORLD_DATA } from '../src/world/data/world.generated.js';
import { FRONTIER_GROVE_CATALOG_CHUNK_BOUNDS } from '../src/world/frontierRegionalPlace.js';

test('fixed Signal Cache is admitted, deterministic, supported, and clear of generated life', () => {
  const first = sampleFrontierDiscoveries({ visualAssets: WORLD_DATA.visualAssets, lootTables: WORLD_DATA.lootTables });
  assert.deepEqual(sampleFrontierDiscoveries({ visualAssets: WORLD_DATA.visualAssets, lootTables: WORLD_DATA.lootTables }), first);
  const cache = first.find(source => source.id === FRONTIER_SIGNAL_CACHE.id);
  assert.ok(cache);
  assert.equal(cache.id, 'f1:d:3:1:0');
  assert.equal(cache.placementKind, 'fixed-authored');
  assert.equal(cache.chunkId, '3,1');
  assert.deepEqual(cache.landmarkPos, { x: 170, y: sampleFrontier(170, 50).height, z: 50 });
  assert.deepEqual(cache.pos, { x: 171.8, y: sampleFrontier(171.8, 52.8).height, z: 52.8 });
  assert.equal(cache.visualAssetId, 'asset_chest');
  assert.equal(cache.receiverAssetId, 'asset_fen_observatory');
  assert.equal(cache.lootTableId, 'loot_secret_section_1');
  assert.equal(cache.refillSeconds, null);
  assert.equal(cache.uniformScale, 1);
  assert.equal(hasFootprintSupport(cache.landmarkPos.x, cache.landmarkPos.z, { getHeight: (x, z) => sampleFrontier(x, z).height, radius: FRONTIER_SIGNAL_CACHE.footprintRadius, maxSlope: .18 }), true);
});

test('real Lush witness carries its scaled chest into the canonical discovery identity', () => {
  const definitions = sampleFrontierDiscoveries({ visualAssets: WORLD_DATA.visualAssets, lootTables: WORLD_DATA.lootTables });
  const grove = definitions.find(source => source.id === 'f1:d:-5:9:lush-root-cache');
  assert.deepEqual(grove?.pos, {
    x: -221.5929992648261,
    y: sampleFrontier(-221.5929992648261, 480.7331449235579).height,
    z: 480.7331449235579,
  });
  assert.equal(grove?.uniformScale, .7);
});

test('Signal Cache fails closed without exact admitted assets, loot, province, support, or clearance', () => {
  const options = { visualAssets: WORLD_DATA.visualAssets, lootTables: WORLD_DATA.lootTables };
  assert.deepEqual(sampleFrontierDiscoveries({ ...options, visualAssets: options.visualAssets.filter(asset => asset.id !== 'asset_chest') }), []);
  assert.deepEqual(sampleFrontierDiscoveries({ ...options, visualAssets: options.visualAssets.map(asset => asset.id === 'asset_chest' ? { ...asset, model: { ...asset.model, path: 'wrong.glb' } } : asset) }), []);
  assert.deepEqual(sampleFrontierDiscoveries({ ...options, lootTables: [] }), []);
  assert.deepEqual(sampleFrontierDiscoveries({ ...options, world: { edition: 1, seed: 2 } }), []);
  assert.deepEqual(sampleFrontierDiscoveries({ ...options, getTerrainSample: () => ({ height: 4, provinceKind: 'lush', provinceInfluence: 1 }), getHeight: () => 4 }), []);
  assert.deepEqual(sampleFrontierDiscoveries({ ...options, getTerrainSample: () => ({ height: 4, provinceKind: 'sunscar', provinceInfluence: 1 }), getHeight: x => x }), []);
  assert.deepEqual(sampleFrontierDiscoveries({ ...options,
    getTerrainSample: () => ({ height: 4, coastDistance: -1, provinceKind: 'sunscar', provinceInfluence: 1 }),
    getHeight: () => 4 }), [], 'the whole landmark fails closed at the waterline');
  const flat = () => ({ height: 4, provinceKind: 'sunscar', provinceInfluence: 1, habitatBlend: { wetland: 0, fernUpland: 1 } });
  assert.deepEqual(sampleFrontierDiscoveries({ ...options, getTerrainSample: flat, getHeight: () => 4,
    sampleForageChunk: () => [{ pos: { x: 170, z: 50 } }], sampleSceneryChunk: () => [], sampleWildlifeChunk: () => [] }), []);
  assert.deepEqual(sampleFrontierDiscoveries({ ...options, getTerrainSample: flat, getHeight: () => 4,
    sampleForageChunk: () => [{ pos: { x: 174, z: 56 } }], sampleSceneryChunk: () => [], sampleWildlifeChunk: () => [] }), [],
  'clearance includes the offset chest rather than only the receiver anchor');
  assert.deepEqual(sampleFrontierDiscoveries({ ...options, getTerrainSample: flat,
    getHeight: (x, z) => Math.hypot(x - 171.8, z - 52.8) < .4 ? 8 : 4,
    sampleForageChunk: () => [], sampleSceneryChunk: () => [], sampleWildlifeChunk: () => [] }), [],
  'the chest collision footprint must have support independently of the receiver');
});

test('finite catalog eagerly enumerates stable grove identities independently of the Signal receiver', () => {
  const chest = WORLD_DATA.visualAssets.find(asset => asset.id === 'asset_chest');
  const calls = [];
  const discoveries = sampleFrontierDiscoveries({
    visualAssets: [chest],
    lootTables: [{ id: 'loot_lush_root_cache' }],
    getTerrainSample: () => ({ height: 11, provinceKind: 'lush', provinceInfluence: 1, coastDistance: 100 }),
    getHeight: () => 11,
    chunkBounds: { minCx: -5, maxCx: -5, minCz: 9, maxCz: 9 },
    sampleRegionalPlaceChunk: (cx, cz) => {
      calls.push([cx, cz]);
      return { kind: 'lush-root-cache', chest: { x: -222.5, z: 479.5, yaw: .4 } };
    },
  });
  assert.deepEqual(calls, [[-5, 9]]);
  assert.deepEqual(discoveries, [{
    id: 'f1:d:-5:9:lush-root-cache',
    placementKind: 'generated-regional',
    chunkId: '-5,9',
    sectionId: 'camp',
    regionId: 'camp',
    displayName: 'Lush Root Cache',
    pos: { x: -222.5, y: 11, z: 479.5 },
    rotY: .4,
    uniformScale: 1,
    visualAssetId: 'asset_chest',
    lootTableId: 'loot_lush_root_cache',
    refillSeconds: null,
    triggerRadius: 1.4,
    collisionEnabled: true,
    requiredCompanionId: 'mossling',
    opensOnSeal: true,
  }]);
});

test('canonical catalog shares the finite grove admission domain and visits each chunk exactly once', () => {
  assert.equal(FRONTIER_DISCOVERY_CHUNK_BOUNDS, FRONTIER_GROVE_CATALOG_CHUNK_BOUNDS);
  assert.deepEqual(FRONTIER_DISCOVERY_CHUNK_BOUNDS, { minCx: -42, maxCx: 13, minCz: -57, maxCz: 20 });
  const chest = WORLD_DATA.visualAssets.find(asset => asset.id === 'asset_chest');
  let calls = 0;
  sampleFrontierDiscoveries({
    visualAssets: [chest],
    lootTables: [{ id: 'loot_lush_root_cache' }],
    getTerrainSample: () => ({ height: 1, provinceKind: 'lush', provinceInfluence: 1, coastDistance: 100 }),
    getHeight: () => 1,
    sampleRegionalPlaceChunk: () => { calls += 1; return null; },
  });
  assert.equal(calls, 56 * 78);
});
