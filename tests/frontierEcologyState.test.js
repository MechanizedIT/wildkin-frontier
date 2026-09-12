import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrontierEcologyState, makeFrontierResourceId, normalizeFrontierEcologyState, MAX_FRONTIER_RESOURCE_RECORDS, FRONTIER_ECOLOGY_DEFAULT_SEED } from '../src/world/frontierEcologyState.js';

test('creates a canonical empty ecology ledger and stable bounded resource IDs', () => {
  assert.deepEqual(createFrontierEcologyState(), { edition: 1, seed: FRONTIER_ECOLOGY_DEFAULT_SEED, resources: {} });
  assert.equal(makeFrontierResourceId(-2, 7, 3), 'f1:r:-2:7:3');
  assert.equal(makeFrontierResourceId(1.2, 0, 0), null);
  assert.equal(makeFrontierResourceId(1000001, 0, 0), null);
});

test('strictly validates supplied ecology and capacity', () => {
  assert.throws(() => normalizeFrontierEcologyState({ edition: 2, seed: FRONTIER_ECOLOGY_DEFAULT_SEED, resources: {} }), /unsupported-ecology-edition/);
  assert.throws(() => normalizeFrontierEcologyState({ edition: 1, seed: 12, resources: {} }), /invalid-ecology-seed/);
  assert.throws(() => normalizeFrontierEcologyState({ edition: 1, seed: FRONTIER_ECOLOGY_DEFAULT_SEED, resources: { 'bad': 1 } }), /invalid-ecology-resource/);
  const resources = Object.fromEntries(Array.from({ length: MAX_FRONTIER_RESOURCE_RECORDS + 1 }, (_, i) => [`f1:r:0:0:${i % 8192}`, 1]));
  // Duplicate IDs collapse, so use distinct chunk coordinates.
  const many = Object.fromEntries(Array.from({ length: MAX_FRONTIER_RESOURCE_RECORDS + 1 }, (_, i) => [`f1:r:${i}:0:0`, 1]));
  assert.equal(Object.keys(resources).length, MAX_FRONTIER_RESOURCE_RECORDS);
  assert.throws(() => normalizeFrontierEcologyState({ edition: 1, seed: FRONTIER_ECOLOGY_DEFAULT_SEED, resources: many }), /ecology-capacity-exceeded/);
});
