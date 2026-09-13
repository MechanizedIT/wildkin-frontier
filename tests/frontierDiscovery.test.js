import test from 'node:test';
import assert from 'node:assert/strict';
import { FRONTIER_SIGNAL_CACHE, sampleFrontierDiscoveries } from '../src/world/frontierDiscovery.js';
import { sampleFrontier } from '../src/world/frontierTerrain.js';
import { hasFootprintSupport } from '../src/world/frontierPlacement.js';
import { WORLD_DATA } from '../src/world/data/world.generated.js';

test('fixed Signal Cache is admitted, deterministic, supported, and clear of generated life', () => {
  const first = sampleFrontierDiscoveries({ visualAssets: WORLD_DATA.visualAssets, lootTables: WORLD_DATA.lootTables });
  assert.deepEqual(sampleFrontierDiscoveries({ visualAssets: WORLD_DATA.visualAssets, lootTables: WORLD_DATA.lootTables }), first);
  assert.equal(first.length, 1);
  const [cache] = first;
  assert.equal(cache.id, 'f1:d:3:1:0');
  assert.equal(cache.placementKind, 'fixed-authored');
  assert.equal(cache.chunkId, '3,1');
  assert.deepEqual(cache.landmarkPos, { x: 170, y: sampleFrontier(170, 50).height, z: 50 });
  assert.deepEqual(cache.pos, { x: 171.8, y: sampleFrontier(171.8, 52.8).height, z: 52.8 });
  assert.equal(cache.visualAssetId, 'asset_chest');
  assert.equal(cache.receiverAssetId, 'asset_fen_observatory');
  assert.equal(cache.lootTableId, 'loot_secret_section_1');
  assert.equal(cache.refillSeconds, null);
  assert.equal(hasFootprintSupport(cache.landmarkPos.x, cache.landmarkPos.z, { getHeight: (x, z) => sampleFrontier(x, z).height, radius: FRONTIER_SIGNAL_CACHE.footprintRadius, maxSlope: .18 }), true);
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
