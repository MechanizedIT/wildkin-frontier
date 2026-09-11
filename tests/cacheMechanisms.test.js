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
