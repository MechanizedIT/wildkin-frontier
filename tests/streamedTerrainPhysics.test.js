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

test('failed incoming collider allocation preserves old support and all public indexes, then retries', t => {
  const physics = fixture(); t.after(() => physics.world.free());
  const oldSurface = { ...surface('old'), traversalSurface: 'terrain' };
  physics.updateTerrainSurfaces({ add: [oldSurface] });
  physics.setActiveSection('camp');
  const published = [...physics.staticColliders];
  const old = published.find(collider => physics.getColliderSurfaceId(collider) === 'old');
  const create = physics.world.createCollider.bind(physics.world);
  let allocations = 0, stagedEnabled, indexesDuringPreparation;
  physics.world.createCollider = desc => {
    if (++allocations === 2) throw new Error('incoming allocation fixture');
    const staged = create(desc);
    stagedEnabled = staged.isEnabled();
    indexesDuringPreparation = [...physics.staticColliders];
    return staged;
  };
  const batch = { remove: ['old'], add: [surface('first', 'camp', { x: 5, z: 0 }), surface('second', 'camp', { x: 10, z: 0 })] };
  assert.throws(() => physics.updateTerrainSurfaces(batch), /incoming allocation fixture/);
  physics.world.createCollider = create;
  assert.equal(stagedEnabled, false, 'prepared support is not query-active');
  assert.deepEqual(indexesDuringPreparation, published, 'staged shapes have no published indexes');
  assert.deepEqual(physics.staticColliders, published);
  assert.equal(physics.cameraColliders.has(old), true);
  assert.equal(physics.isTraversalColliderActive(old), true);
  assert.equal(physics.getColliderSurfaceId(old), 'old');
  assert.ok(downRay(physics, 0, 0), 'old broadphase support survives without another step');
  assert.equal(downRay(physics, 5, 0), null);
  let count = 0; physics.world.forEachCollider(() => count++);
  assert.equal(count, published.length, 'failed staging left no orphan Rapier collider');
  assert.deepEqual(physics.updateTerrainSurfaces(batch), { added: 2, removed: 1, ignored: 0, active: 2 });
  assert.equal(downRay(physics, 0, 0), null);
  assert.ok(downRay(physics, 5, 0)); assert.ok(downRay(physics, 10, 0));
});

test('terrain, rock scenery and discovery surfaces publish together with one broadphase refresh', t => {
  const physics = fixture(); t.after(() => physics.world.free());
  const authoredCount = physics.staticColliders.length;
  physics.setActiveSection('camp');
  let steps = 0; const step = physics.world.step.bind(physics.world);
  physics.world.step = () => { steps++; return step(); };
  const types = ['terrain', 'rock', 'scenery'];
  const sources = types.map((type, i) => ({ ...surface(type, 'camp', { x: i * 5, z: 0 }), traversalSurface: type }));
  physics.updateTerrainSurfaces({ add: sources });
  assert.equal(steps, 1);
  for (let i = 0; i < sources.length; i++) {
    assert.ok(downRay(physics, i * 5, 0));
    const collider = physics.staticColliders.find(c => physics.getColliderSurfaceId(c) === types[i]);
    assert.equal(physics.cameraColliders.has(collider), true);
    assert.equal(physics.isTraversalColliderActive(collider), i < 2);
  }
  physics.updateTerrainSurfaces({ add: sources, remove: ['terrain', 'rock', 'scenery'] });
  assert.equal(steps, 2, 'replacement refreshes once after all additions and removals');
  assert.equal(physics.staticColliders.length, authoredCount + 3);
  assert.ok(downRay(physics, 10, 0));
});

test('same-id replacement preserves explicit disablement and active-section filtering', t => {
  const physics = fixture(); t.after(() => physics.world.free());
  physics.setActiveSection('camp');
  physics.updateTerrainSurfaces({ add: [surface('disabled'), surface('other', 'field', { x: 10, z: 0 })] });
  physics.setStaticObjectEnabled('disabled', false);
  physics.updateTerrainSurfaces({ remove: ['disabled'], add: [surface('disabled', 'camp', { x: 5, z: 0 })] });
  assert.equal(downRay(physics, 0, 0), null);
  assert.equal(downRay(physics, 5, 0), null);
  assert.equal(downRay(physics, 10, 0), null);
  physics.setStaticObjectEnabled('disabled', true);
  assert.ok(downRay(physics, 5, 0));
  physics.setActiveSection('field');
  assert.equal(downRay(physics, 5, 0), null);
  assert.ok(downRay(physics, 10, 0));
});
