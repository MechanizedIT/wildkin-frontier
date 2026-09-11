import test from 'node:test';
import assert from 'node:assert/strict';
import { Group } from 'three';
import { createCacheMechanisms } from '../src/presentation/cacheMechanisms.js';

function fixture() {
  const completedPoiIds = [], claims = new Set(), roots = new Map();
  const chests = ['a', 'b'].map(id => ({ id, sectionId: id, refillSeconds: null }));
  for (const chest of chests) {
    const root = new Group();
    for (const name of ['CacheDoorLeft', 'CacheDoorRight', 'CacheTray', 'CacheCore']) {
      const part = new Group(); part.name = name; root.add(part);
    }
    root.getObjectByName('CacheDoorLeft').position.x = -.25;
    root.getObjectByName('CacheDoorRight').position.x = .25;
    roots.set(chest.id, root);
  }
  const registry = { data: { regions: chests.map(c => ({ id: c.id })) }, getLootChestsForSection: id => chests.filter(c => c.sectionId === id) };
  const progress = { getState: () => ({ completedPoiIds }), getLootChestAvailability: id => ({ available: !claims.has(id) }) };
  const presentation = createCacheMechanisms({ registry, progress, getVisualRoot: id => roots.get(id) });
  const part = (id, name) => roots.get(id).getObjectByName(name);
  return { presentation, completedPoiIds, claims, part };
}

test('cache doors open before tray and other instances remain closed', () => {
  const f = fixture();
  f.presentation.update(0, { sectionId: 'a' });
  f.completedPoiIds.push('a');
  f.presentation.update(.7, { sectionId: 'a' });
  assert.equal(f.presentation.access('a').busy, true);
  assert.ok(f.part('a', 'CacheDoorLeft').position.x < -.25);
  assert.equal(f.part('a', 'CacheTray').position.z, 0);
  assert.equal(f.part('b', 'CacheDoorLeft').position.x, -.25);
  f.presentation.update(.7, { sectionId: 'a' });
  assert.equal(f.part('a', 'CacheDoorLeft').position.x, -.765);
  assert.equal(f.part('a', 'CacheDoorRight').position.x, .765);
  assert.equal(f.part('a', 'CacheTray').position.z, .25);
  assert.equal(f.presentation.access('a').ok, true);
  assert.ok(f.part('a', 'CacheCore').visible);
  f.claims.add('a');
  f.presentation.update(0, { sectionId: 'a' });
  assert.equal(f.part('a', 'CacheCore').visible, false);
});

test('pause freezes parts; Author resets and saved reentry snaps to persistent state', () => {
  const f = fixture();
  f.presentation.update(0, { sectionId: 'a' });
  f.completedPoiIds.push('a');
  f.presentation.update(.4, { sectionId: 'a' });
  const pausedX = f.part('a', 'CacheDoorLeft').position.x;
  f.presentation.update(1, { sectionId: 'a', paused: true });
  assert.equal(f.part('a', 'CacheDoorLeft').position.x, pausedX);
  f.presentation.update(0, { sectionId: 'a', hidden: true });
  assert.equal(f.part('a', 'CacheDoorLeft').position.x, -.25);
  f.presentation.update(0, { sectionId: 'a' });
  assert.equal(f.part('a', 'CacheDoorLeft').position.x, -.765);
  f.presentation.update(0, { sectionId: 'b' });
  assert.equal(f.part('b', 'CacheTray').position.z, 0);
  f.presentation.update(0, { sectionId: 'a' });
  assert.equal(f.part('a', 'CacheTray').position.z, .25);
});

test('reduced motion shows completed state without creating a reward or altering claims', () => {
  const f = fixture();
  f.presentation.update(0, { sectionId: 'a' });
  f.completedPoiIds.push('a');
  f.presentation.update(0, { sectionId: 'a', reducedMotion: true });
  assert.equal(f.part('a', 'CacheTray').position.z, .25);
  assert.equal(f.claims.size, 0);
  assert.equal(f.presentation.has('missing'), false);
});

test('hinged loot follows claims/refill without bypassing companion seals or moving siblings', () => {
  const claims = new Set(), completedPoiIds = ['sealed'], roots = new Map();
  const chests = ['common', 'sealed'].map(id => ({ id, sectionId: 'field', refillSeconds: 30 }));
  for (const chest of chests) {
    const root = new Group(), lid = new Group(); lid.name = 'ChestLidPivot'; root.add(lid);
    for (const name of ['ChestLatchLeft', 'ChestLatchRight']) { const part = new Group(); part.name = name; lid.add(part); }
    roots.set(chest.id, root);
  }
  const presentation = createCacheMechanisms({
    registry: { data: { regions: [{ id: 'field' }] }, getLootChestsForSection: () => chests },
    progress: { getState: () => ({ completedPoiIds }), getLootChestAvailability: id => ({ available: !claims.has(id) }) },
    getVisualRoot: id => roots.get(id),
  });
  const part = (id, name) => roots.get(id).getObjectByName(name);
  presentation.update(0, { sectionId: 'field' });
  assert.equal(presentation.has('sealed'), false, 'claim-driven lids preserve existing seal ward');
  assert.equal(presentation.access('common').ok, true);
  assert.equal(part('sealed', 'ChestLidPivot').rotation.x, 0, 'seal activation alone does not empty a chest');
  claims.add('common'); presentation.update(.19, { sectionId: 'field' });
  assert.ok(part('common', 'ChestLatchLeft').rotation.x < -.79);
  assert.ok(Math.abs(part('common', 'ChestLidPivot').rotation.x) < 1e-10, 'latches clear first');
  presentation.update(1, { sectionId: 'field', paused: true });
  assert.ok(Math.abs(part('common', 'ChestLidPivot').rotation.x) < 1e-10);
  presentation.update(.76, { sectionId: 'field' });
  assert.ok(Math.abs(part('common', 'ChestLidPivot').rotation.x + 100 * Math.PI / 180) < 1e-10);
  assert.ok(Math.abs(part('common', 'ChestLatchLeft').rotation.x) < 1e-10, 'open catches fold flush to the lid');
  assert.equal(part('sealed', 'ChestLidPivot').rotation.x, 0);
  presentation.update(0, { sectionId: 'field', hidden: true });
  assert.equal(part('common', 'ChestLidPivot').rotation.x, 0);
  presentation.update(0, { sectionId: 'field' });
  assert.ok(part('common', 'ChestLidPivot').rotation.x < -1.7, 'saved claim restores open');
  claims.clear(); presentation.update(.95, { sectionId: 'field' });
  assert.equal(part('common', 'ChestLidPivot').rotation.x, 0);
  assert.equal(part('common', 'ChestLatchLeft').rotation.x, 0, 'refill closes before latching');
  claims.add('common'); presentation.update(0, { sectionId: 'field', reducedMotion: true });
  assert.ok(part('common', 'ChestLidPivot').rotation.x < -1.7);
});

test('lid observes authoritative transient availability even before a persistent claim', () => {
  const root = new Group(), lid = new Group(); lid.name = 'ChestLidPivot'; root.add(lid);
  let claimedForRun = false;
  const presentation = createCacheMechanisms({
    registry: { data: { regions: [{ id: 'vault' }] }, getLootChestsForSection: () => [{ id: 'core', sectionId: 'vault' }] },
    progress: { getState: () => ({ completedPoiIds: [] }), getLootChestAvailability: () => ({ available: true }) },
    getVisualRoot: () => root, getAvailability: () => ({ available: !claimedForRun }),
  });
  presentation.update(0, { sectionId: 'vault' });
  claimedForRun = true; presentation.update(.95, { sectionId: 'vault' });
  assert.ok(lid.rotation.x < -1.7);
  claimedForRun = false; presentation.reset(); presentation.update(0, { sectionId: 'vault' });
  assert.equal(lid.rotation.x, 0, 'losing the run restores an available closed container');
});
