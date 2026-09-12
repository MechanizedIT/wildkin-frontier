import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { createPhysicsWorld } from '../src/physics/createPhysicsWorld.js';

await RAPIER.init();
const wedge = { shape: 'convexHull',
  vertices: [-1,-.5,-1, 1,-.5,-1, -1,-.5,1, -1,.5,-1, 1,.5,-1, -1,.5,1],
  indices: [0,2,1, 3,4,5, 0,1,4, 0,4,3, 1,2,5, 1,5,4, 2,0,3, 2,3,5] };
function fixture(t) {
  const physics = createPhysicsWorld(RAPIER, {
    obstacles: [
      { id: 'box', x: 0, z: 0, w: 2, h: 2, height: 1, sectionId: 'A' },
      { id: 'hull', x: 5, z: 0, w: 2, h: 2, height: 1, baseY: 0, collider: wedge, sectionId: 'A' },
      { id: 'neighbor', x: 10, z: 0, w: 2, h: 2, height: 1, sectionId: 'A' },
      { id: 'global', x: 15, z: 0, w: 2, h: 2, height: 1 },
      { id: 'no_collision', x: 30, z: 0, w: 2, h: 2, height: 1, collisionEnabled: false },
    ],
    platforms: [{ id: 'platform', x: 20, z: 0, w: 2, h: 2, height: 1, regionId: 'A' }],
    boundaries: [{ id: 'boundary', x: 25, z: 0, w: 2, h: 1, d: 2, sectionId: 'A' }],
    groundPatches: [],
  });
  t.after(() => physics.world.free());
  const hit = (x, z = -.5) => physics.world.castRay(new RAPIER.Ray({ x, y: 5, z }, { x: 0, y: -1, z: 0 }), 4.9, true);
  return { physics, hit };
}

for (const [id, x] of [['box', -.5], ['hull', 4.5], ['platform', 19.5], ['boundary', 24.5]]) {
  test(`${id} mask survives travel and restores only in its active section`, t => {
    const { physics: p, hit } = fixture(t);
    p.setActiveSection('A'); assert.ok(hit(x)); assert.ok(hit(10));
    const count = p.staticColliders.length;
    assert.equal(p.setStaticObjectEnabled(id, false), true);
    assert.equal(hit(x), null, 'disable refreshes real broadphase immediately');
    assert.ok(hit(10), 'another authored object remains solid');
    p.setActiveSection('B'); assert.equal(hit(10), null); assert.ok(hit(15));
    p.setActiveSection('A'); assert.equal(hit(x), null); assert.ok(hit(10));
    p.setActiveSection('B');
    assert.equal(p.setStaticObjectEnabled(id, true), true);
    assert.equal(hit(x), null, 'unmask does not activate a different section');
    p.setActiveSection('A'); assert.ok(hit(x));
    assert.equal(p.staticColliders.length, count, 'activation reuses the authored collider');
    if (id === 'hull') assert.equal(hit(5.75, .75), null, 'restored convex prop keeps its empty corner');
    assert.equal(p.setStaticObjectEnabled(id, false), true); assert.equal(hit(x), null);
    assert.equal(p.setStaticObjectEnabled(id, true), true); assert.ok(hit(x), 'reenable refreshes immediately');
  });
}

test('unknown IDs, repeated masks and inactive unmask do no unnecessary physics work', t => {
  const { physics: p, hit } = fixture(t);
  let steps = 0; const step = p.world.step.bind(p.world);
  p.world.step = (...args) => { steps++; return step(...args); };
  assert.equal(p.setStaticObjectEnabled('missing', false), false);
  assert.equal(p.setStaticObjectEnabled('no_collision', true), false);
  assert.equal(p.setStaticObjectEnabled('box', true), true);
  assert.equal(steps, 0); assert.ok(hit(-.5));
  p.setStaticObjectEnabled('box', false); assert.equal(steps, 1); assert.equal(hit(-.5), null);
  p.setStaticObjectEnabled('box', false); assert.equal(steps, 1);
  p.setActiveSection('B'); const inactiveSteps = steps;
  p.setStaticObjectEnabled('box', true); assert.equal(steps, inactiveSteps); assert.equal(hit(-.5), null);
  p.setActiveSection('A'); assert.ok(hit(-.5));
  p.setStaticObjectEnabled('global', false); p.setActiveSection('B'); assert.equal(hit(15), null);
  p.setStaticObjectEnabled('global', true); assert.ok(hit(15), 'global ownership remains active in any section');
});

test('initial masks apply before section selection and later null retains existing global-only semantics', t => {
  const { physics: p, hit } = fixture(t);
  assert.equal(p.getActiveSectionId(), null); assert.ok(hit(-.5));
  p.setStaticObjectEnabled('box', false); assert.equal(hit(-.5), null);
  p.setActiveSection('B'); p.setActiveSection(null);
  assert.equal(hit(-.5), null); assert.equal(hit(10), null); assert.ok(hit(15));
  p.setStaticObjectEnabled('box', true); assert.equal(hit(-.5), null);
  p.setActiveSection('A'); assert.ok(hit(-.5));
});
