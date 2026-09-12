import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { createPhysicsWorld } from '../src/physics/createPhysicsWorld.js';

await RAPIER.init();

function surface(id, sectionId = 'camp', origin = { x: 0, z: 0 }) {
  // Local x/z coordinates with a real (non-offset) y coordinate.
  return {
    id, sectionId, origin,
    vertices: new Float32Array([-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1]),
    indices: new Uint32Array([0, 2, 1, 0, 3, 2]),
  };
}

function fixture() {
  const physics = createPhysicsWorld(RAPIER, {
    terrainSurfaces: [], groundPatches: [{ collisionEnabled: false }], obstacles: [], platforms: [], boundaries: [],
  });
  return physics;
}

function downRay(physics, x, z) {
  return physics.world.castRay(
    new RAPIER.Ray({ x, y: 5, z }, { x: 0, y: -1, z: 0 }), 10, true,
  );
}

test('real Rapier ray hits a streamed surface immediately after add', t => {
  const physics = fixture(); t.after(() => physics.world.free());
  assert.equal(downRay(physics, 0, 0), null);
  const result = physics.updateTerrainSurfaces({ add: [surface('ground')] });
  assert.deepEqual(result, { added: 1, removed: 0, ignored: 0, active: 1 });
  assert.ok(downRay(physics, 0, 0), 'the batched update refreshes queries immediately');
});

test('streamed terrain origin translates local x/z into world coordinates', t => {
  const physics = fixture(); t.after(() => physics.world.free());
  physics.updateTerrainSurfaces({ add: [surface('translated', 'camp', { x: 10, z: 20 })] });
  assert.equal(downRay(physics, 0, 0), null);
  assert.ok(downRay(physics, 10, 20));
});

test('removing a streamed surface retires its ground and indexes', t => {
  const physics = fixture(); t.after(() => physics.world.free());
  physics.updateTerrainSurfaces({ add: [surface('temporary')] });
  const collider = physics.staticColliders.find(c => physics.colliderSections.get(c) === 'camp');
  assert.ok(collider);
  assert.ok(physics.cameraColliders.has(collider));
  const result = physics.updateTerrainSurfaces({ remove: ['temporary'] });
  assert.deepEqual(result, { added: 0, removed: 1, ignored: 0, active: 0 });
  assert.equal(downRay(physics, 0, 0), null);
  assert.equal(physics.staticColliders.includes(collider), false);
  assert.equal(physics.cameraColliders.has(collider), false);
  assert.equal(physics.colliderSections.has(collider), false);
});

test('active Camp selection isolates streamed sections', t => {
  const physics = fixture(); t.after(() => physics.world.free());
  physics.updateTerrainSurfaces({ add: [surface('camp-ground', 'camp'), surface('field-ground', 'field', { x: 5, z: 0 })] });
  physics.setActiveSection('camp');
  assert.ok(downRay(physics, 0, 0));
  assert.equal(downRay(physics, 5, 0), null);
  physics.setActiveSection('field');
  assert.equal(downRay(physics, 0, 0), null);
  assert.ok(downRay(physics, 5, 0));
});

test('duplicate streamed ids are ignored without creating duplicate colliders', t => {
  const physics = fixture(); t.after(() => physics.world.free());
  const first = physics.updateTerrainSurfaces({ add: [surface('stable')] });
  const count = physics.staticColliders.length;
  const second = physics.updateTerrainSurfaces({ add: [surface('stable', 'field', { x: 20, z: 0 })] });
  assert.deepEqual(first, { added: 1, removed: 0, ignored: 0, active: 1 });
  assert.deepEqual(second, { added: 0, removed: 0, ignored: 1, active: 1 });
  assert.equal(physics.staticColliders.length, count);
  assert.ok(downRay(physics, 0, 0));
  assert.equal(downRay(physics, 20, 0), null);
});
