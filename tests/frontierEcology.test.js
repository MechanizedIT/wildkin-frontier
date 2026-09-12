import test from 'node:test';
import assert from 'node:assert/strict';
import WORLD_DATA from '../src/world/data/world.js';
import { createRuntimeResourcePlacements } from '../src/resources/resourceSystem.js';
import { sampleFrontierForageChunk } from '../src/world/frontierEcology.js';

test('frontier forage is deterministic, bounded, stable-IDed, and clear of Camp', () => {
  const first = sampleFrontierForageChunk(3, 2), second = sampleFrontierForageChunk(3, 2);
  assert.deepEqual(second, first);
  assert.ok(first.length >= 6 && first.length <= 8);
  assert.equal(new Set(first.map(node => node.id)).size, first.length);
  for (const node of first) {
    assert.match(node.id, /^f1:r:3:2:\d+$/);
    assert.equal(node.chunkId, '3,2');
    assert.equal(node.regionId, 'camp');
    assert.equal(node.persistentFinite, true);
    assert.ok(node.pos.x >= 153 && node.pos.x <= 197 && node.pos.z >= 103 && node.pos.z <= 147);
  }
  assert.deepEqual(sampleFrontierForageChunk(0, 0), []);
});

test('habitats select different broad forage mixes and reject injected steep terrain', () => {
  const wet = sampleFrontierForageChunk(4, -3, { getHeight: () => 1 });
  const dry = sampleFrontierForageChunk(-4, 4, { getHeight: () => 1 });
  assert.notDeepEqual(wet.map(node => node.type), dry.map(node => node.type));
  assert.deepEqual(sampleFrontierForageChunk(3, 3, { getHeight: x => x * 2 }), []);
});

test('north Camp approach starts with a nearby deterministic forage group', () => {
  const approach = sampleFrontierForageChunk(0, -3);
  assert.ok(approach.filter(node => Math.hypot(node.pos.x, node.pos.z + 114) >= 5 && Math.hypot(node.pos.x, node.pos.z + 114) <= 9).length >= 2);
});

test('north terrace rock slots use admitted mineral assets with canonical IDs and sufficient yield', () => {
  const assets = WORLD_DATA.visualAssets.filter(asset => ['asset_iron_ore_rock', 'asset_crystal'].includes(asset.id));
  assert.deepEqual(assets.map(asset => asset.id).sort(), ['asset_crystal', 'asset_iron_ore_rock']);
  const sampled = sampleFrontierForageChunk(0, -3, { visualAssets: assets });
  const minerals = sampled.filter(node => node.visualAsset && assets.includes(node.visualAsset));
  assert.deepEqual(minerals.map(node => [node.placementIndex, node.id, node.type, node.visualAsset.id]), [
    [2, 'f1:r:0:-3:2', 'rock', 'asset_iron_ore_rock'],
    [4, 'f1:r:0:-3:4', 'rock', 'asset_crystal'],
    [7, 'f1:r:0:-3:7', 'rock', 'asset_iron_ore_rock'],
  ]);
  assert.deepEqual(minerals.map(node => [Number(node.pos.x.toFixed(2)), Number(node.pos.z.toFixed(2))]), [
    [4.2, -121.62], [13.74, -124.34], [6, -131.36],
  ]);

  const runtime = createRuntimeResourcePlacements(minerals);
  assert.deepEqual(runtime.map(node => [node.resourceType.resourceId, node.resourceType.maxChunks]), [
    ['iron_ore', 5], ['crystal_shard', 4], ['iron_ore', 5],
  ]);
  assert.ok(runtime.every(node => node.resourceType.solid && node.resourceType.assetCollision === node.visualAsset.collision));
  const yieldByResource = runtime.reduce((totals, node) => {
    totals[node.resourceType.resourceId] = (totals[node.resourceType.resourceId] ?? 0) + node.resourceType.maxChunks;
    return totals;
  }, {});
  assert.ok(yieldByResource.iron_ore >= 8);
  assert.ok(yieldByResource.crystal_shard >= 2);
});

test('missing or non-harvestable mineral assets preserve the ordinary rock recipes', () => {
  const ordinary = sampleFrontierForageChunk(0, -3);
  const invalid = sampleFrontierForageChunk(0, -3, {
    visualAssets: [
      { id: 'asset_iron_ore_rock', gameplay: { role: 'prop' } },
      { id: 'asset_crystal', gameplay: { role: 'harvestable' } },
    ],
  });
  for (const index of [2, 4, 7]) {
    const expected = ordinary.find(node => node.placementIndex === index);
    const actual = invalid.find(node => node.placementIndex === index);
    assert.equal(expected.type, 'rock');
    assert.equal(actual.type, 'rock');
    assert.equal(actual.visualAsset, undefined);
    assert.equal(actual.id, expected.id);
    assert.deepEqual(actual.pos, expected.pos);
  }
});
