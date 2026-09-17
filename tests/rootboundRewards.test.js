import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrontierProgress } from '../src/save/frontierProgress.js';
import { sampleFrontierDiscoveries } from '../src/world/frontierDiscovery.js';
import { sampleFrontierForageChunk } from '../src/world/frontierEcology.js';
import { makeFrontierResourceId } from '../src/world/frontierEcologyState.js';
import { hasFootprintSupport } from '../src/world/frontierPlacement.js';
import { sampleFrontier } from '../src/world/frontierTerrain.js';
import { createLootRegistryOverlay } from '../src/world/lootRegistryOverlay.js';
import { createWorldRegistry } from '../src/world/worldRegistry.js';
import { ROOTBOUND_REWARD_CHESTS, ROOTBOUND_REWARD_POCKETS, ROOTBOUND_REWARD_RESOURCES } from '../src/world/rootboundRewards.js';
import { WORLD_DATA } from '../src/world/data/world.generated.js';

const assets = WORLD_DATA.visualAssets;
const lootTables = WORLD_DATA.lootTables;
const height = (x, z) => sampleFrontier(x, z).height;
const footprintRadius = anchor => ({
  tree: 1.35,
  fiber: anchor.assetId === 'asset_berry_bush' ? 1.29 : .55,
  rock: anchor.assetId === 'asset_crystal' ? 1.3 : .93,
}[anchor.type]) * anchor.uniformScale;

test('Rootbound pockets publish seven fixed, grounded resource identities before ordinary forage', () => {
  assert.deepEqual(ROOTBOUND_REWARD_POCKETS.map(pocket => [pocket.key, pocket.x, pocket.z]), [
    ['meadow-supplies', -481, 600], ['gallery-alcove', -484, 678], ['lantern-cache', -452, 680],
    ['verge-minerals', -419, 700], ['crown-cache', -475, 716],
  ]);
  const chunks = [...new Map(ROOTBOUND_REWARD_RESOURCES.map(anchor => [`${anchor.cx},${anchor.cz}`, anchor])).values()];
  const resources = chunks.flatMap(anchor => (
    sampleFrontierForageChunk(anchor.cx, anchor.cz, { visualAssets: assets }).filter(node => node.rootboundReward)
  ));
  assert.equal(resources.length, 7);
  assert.deepEqual(resources.map(node => [node.id, node.placementIndex, node.pos.x, node.pos.z]), ROOTBOUND_REWARD_RESOURCES.map(anchor => [
    makeFrontierResourceId(anchor.cx, anchor.cz, anchor.index), anchor.index, anchor.x, anchor.z,
  ]));
  assert.ok(resources.every(node => node.placementIndex >= 600 && node.placementIndex < 608));
  for (const anchor of ROOTBOUND_REWARD_RESOURCES) {
    assert.equal(sampleFrontier(anchor.x, anchor.z).habitatId, 'rootbound-wildwood', anchor.key);
    assert.equal(hasFootprintSupport(anchor.x, anchor.z, {
      getHeight: height, radius: footprintRadius(anchor), maxSlope: .18,
    }), true, anchor.key);
  }
});

test('Rootbound chests enumerate into the default-world registry and stay grounded', () => {
  const discoveries = sampleFrontierDiscoveries({ visualAssets: assets, lootTables });
  const chests = discoveries.filter(entry => entry.id.includes('rootbound-'));
  assert.deepEqual(chests.map(chest => [chest.id, chest.displayName, chest.pos.x, chest.pos.z, chest.lootTableId]), [
    ['f1:d:-10:13:rootbound-lantern-cache', 'Lantern Root Cache', -452, 680, 'loot_lush_root_cache'],
    ['f1:d:-10:14:rootbound-crown-cache', 'Crown Root Cache', -475, 716, 'loot_lush_root_cache'],
  ]);
  for (const chest of chests) {
    assert.equal(chest.pos.y, height(chest.pos.x, chest.pos.z));
    assert.equal(hasFootprintSupport(chest.pos.x, chest.pos.z, { getHeight: height, radius: .851, maxSlope: .42 }), true, chest.id);
  }
  const overlay = createLootRegistryOverlay(createWorldRegistry(WORLD_DATA), discoveries);
  assert.ok(chests.every(chest => overlay.getLootChestById(chest.id) === chest));
});

test('Rootbound rewards preserve existing finite-save linkage and reject alternate worlds', () => {
  const storage = new Map();
  const previous = globalThis.localStorage;
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  try {
    const progress = createFrontierProgress();
    progress.load();
    const anchor = ROOTBOUND_REWARD_RESOURCES[0];
    const id = makeFrontierResourceId(anchor.cx, anchor.cz, anchor.index);
    assert.equal(progress.commitFrontierResourceState(id, 2).ok, true);
    const reloaded = createFrontierProgress();
    reloaded.load();
    assert.equal(reloaded.getFrontierEcologyState().resources[id], 2);
  } finally {
    globalThis.localStorage = previous;
  }
  assert.deepEqual(sampleFrontierDiscoveries({ visualAssets: assets, lootTables, world: { edition: 2, seed: 1 } }), []);
  assert.equal(ROOTBOUND_REWARD_CHESTS.length, 2);
});
