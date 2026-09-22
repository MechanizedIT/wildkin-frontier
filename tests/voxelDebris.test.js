import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '../vendor/rapier.js';
import { createDebrisGeometry, debrisReferenceCenter, geometryBounds } from '../lab/voxel/debris.js';
import { LabPhysics } from '../lab/voxel/physics.js';

function smoothRecord(spacing) {
  const cells = [], samples = [];
  for (let z = -2; z <= 2; z++) for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) { cells.push([x, y + 5, z]); samples.push(x*x + y*y + z*z - 5.2); }
  return { id: `smooth-${spacing}`, mode: 'smooth', spacing, cells, samples, position: [0, 5, 0], rotation: { x: 0, y: 0, z: 0, w: 1 }, status: 'ACTIVE' };
}

test('smooth debris snapshots make a bounded fractional mesh with a stable source reference', () => {
  for (const spacing of [.5, .25]) {
    const record = smoothRecord(spacing), mesh = createDebrisGeometry(record), bounds = geometryBounds(mesh);
    assert.equal(mesh.mode, 'smooth'); assert.ok(mesh.indices.length > 0); assert.ok(bounds.halfExtents.every(v => v > 0));
    assert.deepEqual(mesh.referenceCenter, debrisReferenceCenter(record));
    assert.ok(Array.from(mesh.positions).some(v => Math.abs(v / spacing - Math.round(v / spacing)) > 1e-4), 'surface vertices interpolate between samples');
    const moved = { ...record, position: [100, -30, 8] };
    assert.deepEqual(Array.from(createDebrisGeometry(moved).positions), Array.from(mesh.positions), 'saved fall pose never changes local source geometry');
  }
});

test('smooth debris uses one bounded Rapier proxy, falls, and retains global pose through origin shifts', async () => {
  await RAPIER.init();
  for (const spacing of [.5, .25]) {
    const physics = new LabPhysics(RAPIER), record = smoothRecord(spacing);
    physics.syncActors([record]); const actor = physics.actors.get(record.id);
    assert.equal(actor.body.numColliders(), 1, 'one convex bounded actor proxy'); assert.equal(actor.mode, 'smooth');
    const before = physics.poses()[0].position; physics.shiftOrigin([256, -256, 256]);
    assert.ok(physics.poses()[0].position.every((v, i) => Math.abs(v - before[i]) < 1e-5));
    for (let i = 0; i < 120; i++) physics.step();
    assert.ok(physics.poses()[0].position[1] < before[1] - 1, 'dynamic component falls'); physics.dispose();
  }
});
