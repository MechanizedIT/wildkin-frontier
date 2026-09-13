import test from 'node:test';
import assert from 'node:assert/strict';
import WORLD_DATA from '../src/world/data/world.js';
import { BASE_PIECES } from '../src/base/baseCatalog.js';
import { createCampLayout } from '../src/base/campLayout.js';
import { findInitialPlacement, getCampReserved, validatePlacement } from '../src/base/basePlacement.js';
import { createWorldRegistry } from '../src/world/worldRegistry.js';

function freshCampOptions() {
  const registry = createWorldRegistry(WORLD_DATA);
  return {
    tier: 0,
    layout: createCampLayout(),
    structures: [],
    playerPosition: {x: 0, y: 0, z: 2},
    reserved: getCampReserved(registry),
    surface: registry.getSectionById('camp').surface,
  };
}

test('fresh Camp bed search finds the locked portrait witness from the player origin', () => {
  const options = freshCampOptions();
  const result = findInitialPlacement({type: 'bed', yaw: 0, pos: {x: 0, z: 2}}, options);
  assert.deepEqual(result, {ok: true, pos: {x: 3, y: 0, z: 2}, supportId: null});
  assert.deepEqual(findInitialPlacement({type: 'bed', yaw: 0, pos: {x: 0, z: 2}}, options), result);
});

test('every build family returns a result accepted by the unchanged placement validator', () => {
  const options = freshCampOptions();
  const before = structuredClone(options);
  for (const definition of BASE_PIECES) {
    const request = {type: definition.id, yaw: 0, pos: {x: 0, z: 2}};
    const result = findInitialPlacement(request, options);
    assert.ok(result?.ok, `${definition.id} should have a bounded fresh-Camp candidate`);
    assert.deepEqual(validatePlacement({type: definition.id, yaw: 0, pos: result.pos}, options), result);
  }
  assert.deepEqual(options, before);
});

test('the final four-metre ring remains available after nearer candidates fail', () => {
  const result = findInitialPlacement({type: 'lantern', pos: {x: 0, z: 18}}, {
    playerPosition: {x: 0, z: 18},
    reserved: [{pos: {x: 0, z: 18}, radius: 3.3}],
  });
  assert.deepEqual(result, {ok: true, pos: {x: 4, y: 0, z: 18}, supportId: null});
});

test('an exhausted search returns null after the bounded deduplicated candidate set', () => {
  let validations = 0;
  const options = new Proxy({
    tier: 0,
    playerPosition: {x: 0, z: 18},
    reserved: [{pos: {x: 0, z: 18}, radius: 20}],
  }, {
    get(target, key, receiver) {
      if (key === 'tier') validations++;
      return Reflect.get(target, key, receiver);
    },
  });
  assert.equal(findInitialPlacement({type: 'bed', pos: {x: 0, z: 18}}, options), null);
  assert.equal(validations, 40, 'legacy +X2.5 duplicates the matching ring point and is validated once');
});
