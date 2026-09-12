import test from 'node:test';
import assert from 'node:assert/strict';
import {
  config, chunkKey, worldToChunk, sampleFrontier, createFrontierChunk, isCampChunk,
} from '../src/world/frontierTerrain.js';

test('chunk ownership floors negative coordinates and keys are stable', () => {
  assert.deepEqual(worldToChunk(-0.01, -50), { cx: -1, cz: -1 });
  assert.deepEqual(worldToChunk(-50, 50), { cx: -1, cz: 1 });
  assert.equal(chunkKey(-2, 3), '-2,3');
  assert.equal(isCampChunk(-1, -1), true);
  assert.equal(isCampChunk(1, 0), false);
});

test('adjacent chunks have identical shared edge data', () => {
  const left = createFrontierChunk(1, 2, { seed: 1234 });
  const right = createFrontierChunk(2, 2, { seed: 1234 });
  const stride = config.segments + 1;
  for (let iz = 0; iz <= config.segments; iz++) {
    const a = iz * stride + config.segments;
    const b = iz * stride;
    assert.equal(left.vertices[a * 3 + 1], right.vertices[b * 3 + 1]);
    assert.deepEqual(Array.from(left.normals.slice(a * 3, a * 3 + 3)), Array.from(right.normals.slice(b * 3, b * 3 + 3)));
    assert.deepEqual(Array.from(left.colors.slice(a * 3, a * 3 + 3)), Array.from(right.colors.slice(b * 3, b * 3 + 3)));
  }
});

test('camp boundary honors callback and blends smoothly outside the footprint', () => {
  const campHeight = (x, z) => 3 + x * 0.01 - z * 0.005;
  const inside = sampleFrontier(50, 12, { seed: 77, campHeight });
  const edge = sampleFrontier(50.001, 12, { seed: 77, campHeight });
  const outside = sampleFrontier(70, 12, { seed: 77, campHeight });
  assert.equal(inside.height, campHeight(50, 12));
  assert.ok(Math.abs(edge.height - inside.height) < 0.2);
  assert.ok(outside.height >= config.minHeight && outside.height <= config.maxHeight);
});

test('camp callback preserves finite negative and raised heights', () => {
  const campHeight = (x, z) => x < 0 ? -24 : 31;
  assert.equal(sampleFrontier(-20, -20, { campHeight }).height, -24);
  assert.equal(sampleFrontier(20, 20, { campHeight }).height, 31);
});

test('mesh vertices, normals and colors are finite and repeatable', () => {
  const first = createFrontierChunk(-3, 4, { seed: 9001 });
  const second = createFrontierChunk(-3, 4, { seed: 9001 });
  assert.deepEqual(Array.from(first.vertices), Array.from(second.vertices));
  assert.deepEqual(Array.from(first.indices), Array.from(second.indices));
  for (const array of [first.vertices, first.normals, first.colors]) for (const value of array) assert.ok(Number.isFinite(value));
  assert.ok(first.vertices.every((value, i) => i % 3 !== 1 || (value >= config.minHeight && value <= config.maxHeight)));
  assert.notDeepEqual(Array.from(first.vertices), Array.from(createFrontierChunk(-3, 4, { seed: 9002 }).vertices));
});
