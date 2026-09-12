import test from 'node:test';
import assert from 'node:assert/strict';
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
