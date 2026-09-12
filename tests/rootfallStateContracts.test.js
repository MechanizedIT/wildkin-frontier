import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { createResourceSystem } from '../src/resources/resourceSystem.js';
import { createCampClearing } from '../src/base/campClearing.js';
import { CAMP_DEBRIS_IDS } from '../src/base/campLayout.js';
import { createFrontierProgress } from '../src/save/frontierProgress.js';
import { createCompanionSystem } from '../src/companions/companionSystem.js';
import { COMPANION_BY_ID } from '../src/companions/companionCatalog.js';

await RAPIER.init();
const far = { x: 50, y: .522, z: 50 };
const campId = CAMP_DEBRIS_IDS[0];
function resourcesFixture(t) {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  t.after(() => world.free());
  const resources = createResourceSystem(new THREE.Scene(), { world, RAPIER }, [
    { id: campId, type: 'tree', regionId: 'camp', pos: { x: 0, y: 0, z: 0 } },
    { id: 'cut_test', type: 'tree', regionId: 'rootfall', pos: { x: 12, y: 0, z: 0 } },
  ]);
  return { resources, world };
}
function assertRemoved(r, n) {
  const near = { x: n.state.position.x - 1.4, y: .522, z: 0 };
  assert.equal(n.group.visible, false);
  assert.equal(n.collider, null); assert.equal(n.remnantCollider, null);
  assert.equal(n.haloMesh.visible, false); assert.equal(n.respawnGroup.visible, false);
  assert.equal(r.getActiveNodes().includes(n), false);
  assert.equal(r.getManualTargets(near).includes(n), false);
  assert.equal(r.getHaloTargets(near, 'IDLE').includes(n), false);
  assert.equal(r.canAutoHarvestNow(n, near, 'IDLE'), false);
  assert.equal(r.applyHit(n, () => assert.fail('removed node cannot yield')), false);
}

for (const owners of [['camp', 'rootfall'], ['rootfall', 'camp']]) {
  test(`resource removal union survives replacement, overlaps and default clears (${owners.join(' then ')})`, t => {
    const { resources: r, world } = resourcesFixture(t);
    const ids = { camp: [campId], rootfall: ['cut_test'] };
    for (const owner of owners) r.setRemovedResourceIds(ids[owner], owner);
    for (const n of r.nodes) assertRemoved(r, n);
    r.setRemovedResourceIds([]); // One-argument callers own only the default mask.
    r.resetDepleted(); r.update(1000, far, 'IDLE');
    for (const n of r.nodes) assertRemoved(r, n);
    const overlap = new Set([campId, 'cut_test']);
    r.setRemovedResourceIds(overlap, 'rootfall'); overlap.clear();
    r.setRemovedResourceIds([], 'camp');
    for (const n of r.nodes) assertRemoved(r, n);
    r.setRemovedResourceIds(['cut_test'], 'rootfall');
    r.update(.1, { x: 0, y: .522, z: 0 }, 'IDLE');
    assert.equal(r.nodes[0].group.visible, true);
    assert.equal(r.nodes[0].collider, null, 'unmask must not restore a collider around the player');
    r.update(.1, far, 'IDLE'); assert.ok(r.nodes[0].collider);
    assertRemoved(r, r.nodes[1]); assert.equal(world.colliders.len(), 1);
    r.setRemovedResourceIds([campId]); r.setRemovedResourceIds(null, 'rootfall');
    r.update(.1, far, 'IDLE'); assertRemoved(r, r.nodes[0]); assert.ok(r.nodes[1].collider);
    r.setRemovedResourceIds([]); r.update(.1, far, 'IDLE');
    assert.equal(world.colliders.len(), 2);
  });
}

test('Camp Author-like hide and region activation clear only the Camp contribution', t => {
  const { resources: r, world } = resourcesFixture(t);
  r.setRemovedResourceIds(['cut_test'], 'rootfall');
  const camp = createCampClearing({ resources: r, isCamp: () => true,
    progress: { getBaseState: () => ({ layout: { clearedDebrisIds: [campId] } }) } });
  for (const n of r.nodes) assertRemoved(r, n);
  r.setActiveRegions(['rootfall']); camp.update(.3, { hidden: true });
  r.update(.1, far, 'IDLE'); assert.equal(r.nodes[0].group.visible, false);
  assert.equal(r.nodes[0].collider, null); assertRemoved(r, r.nodes[1]);
  r.setActiveRegions(['camp']); r.update(.1, far, 'IDLE');
  assert.ok(r.nodes[0].collider); assert.equal(r.nodes[0].group.visible, true);
  camp.update(.3, { hidden: false });
  r.setActiveRegions(null); r.update(.1, far, 'IDLE');
  for (const n of r.nodes) assertRemoved(r, n);
  assert.equal(world.colliders.len(), 0);
});

test('a depleted node remains removed until its last contributing owner clears', t => {
  const { resources: r } = resourcesFixture(t), n = r.nodes[1];
  while (n.state.remainingChunks) assert.equal(r.applyHit(n), true);
  const state = { ...n.state };
  r.setRemovedResourceIds(['cut_test'], 'camp');
  r.setRemovedResourceIds(['cut_test'], 'rootfall');
  r.setRemovedResourceIds([], 'camp');
  r.resetDepleted(); r.update(1000, far, 'IDLE');
  r.setActiveRegions(['camp']); r.setActiveRegions(['rootfall']);
  r.update(1000, far, 'IDLE'); assertRemoved(r, n);
  assert.equal(n.state.nodeState, state.nodeState);
  assert.equal(n.state.respawnRemaining, state.respawnRemaining);
  r.setRemovedResourceIds([], 'rootfall'); r.resetDepleted(); r.update(.1, far, 'IDLE');
  assert.equal(n.state.nodeState, 'READY'); assert.ok(n.collider);
});

const resourceDrops = ['wood', 'stone', 'fiber', 'berries'].map(id => ({ id, displayName: id }));
function progressFixture(t) {
  const original = globalThis.localStorage;
  let stored = null, failing = false, writes = 0;
  globalThis.localStorage = { getItem: () => stored, setItem: (_key, value) => {
    writes++; if (failing) throw Error('quota'); stored = value;
  }, removeItem: () => { stored = null; } };
  t.after(() => { globalThis.localStorage = original; });
  return { progress: createFrontierProgress({ resourceDrops }), fail: value => { failing = value; },
    saved: () => stored, writes: () => writes };
}

test('POI final-cut save rolls back the entire snapshot, retries once and survives reload/import', t => {
  const f = progressFixture(t), p = f.progress;
  assert.equal(p.collectResources({ wood: 3, medkit: 1 }).ok, true);
  assert.equal(p.assignQuickSlot(2, 'medkit').ok, true);
  assert.equal(p.completePoi('heartwood_core_secured'), true);
  const live = { runId: 'run_cut', startAnchorId: 'entry', sectionId: 'section_1',
    feet: { x: 0, y: 0, z: 24 }, facingYaw: 0, health: 4, xp: 5, companions: [],
    corePending: false, kills: 0, maxDepth: 1, newWaypoints: [], newBeacons: [] };
  p.setRunSnapshotProvider(() => live); assert.equal(p.checkpointRun().ok, true);
  const before = p.getState(), saved = f.saved(); live.xp = 9;
  f.fail(true); assert.equal(p.completePoi('cut_a_test'), false);
  assert.deepEqual(p.getState(), before); assert.equal(f.saved(), saved);
  f.fail(false); const writes = f.writes();
  assert.equal(p.completePoi('cut_a_test'), true); assert.equal(f.writes(), writes + 1);
  assert.equal(p.getActiveRun().xp, 9);
  assert.deepEqual(p.getInventoryState(), before.inventory);
  assert.deepEqual(p.getLoadout(), before.loadout);
  const committed = p.getState(); live.xp = 20;
  f.fail(true); assert.equal(p.completePoi('cut_a_test'), false);
  assert.equal(f.writes(), writes + 1); assert.deepEqual(p.getState(), committed);
  f.fail(false); assert.equal(p.completePoi('cut_b_test'), true);
  const expected = p.getState(), exported = p.exportSave().payload;
  p.load(); assert.deepEqual(p.getState(), expected);
  p.clear(); assert.equal(p.importSave(exported).ok, true); assert.deepEqual(p.getState(), expected);
  assert.deepEqual(p.getState().completedPoiIds, ['heartwood_core_secured', 'cut_a_test', 'cut_b_test']);
  assert.deepEqual(p.getState().repairedPortalGateIds, [], 'cut markers do not open the brace/portal');
  const invalidWrites = f.writes();
  for (const id of [null, '', 7, 'heartwood_core_secured']) assert.equal(p.completePoi(id), false);
  assert.equal(f.writes(), invalidWrites);
});

for (const speciesId of ['mossling', 'tidefin', 'emberhorn', 'skydancer']) {
  test(`${speciesId} seal failure blocks effects/cooldown, retry opens, duplicate stays ordinary ability`, t => {
    const f = progressFixture(t), p = f.progress, species = COMPANION_BY_ID[speciesId];
    assert.equal(p.secureCompanions([speciesId], 'test_bond').added, true);
    const chest = { id: species.secret, sectionId: 'verge', pos: { x: 0, y: 0, z: 0 } };
    let effects = 0; const messages = [];
    const system = createCompanionSystem({ scene: new THREE.Scene(), progress: p,
      registry: { getLootChestById: id => id === chest.id ? chest : null },
      creatures: { getActiveAliveCreatures: () => [], setBondingTarget: () => {} },
      playerController: { getState: () => ({ pos: { x: 0, y: .5, z: 0 }, grounded: true }), launchFromJumpPad: () => { effects++; } },
      playerCombat: { getHealth: () => 2, getMaxHealth: () => 4, heal: () => { effects++; }, grantInvulnerability: () => { effects++; } },
      isActive: () => true, getSectionId: () => 'verge', toast: (...args) => messages.push(args),
      pulse: () => { effects++; }, audio: { playParkour: () => { effects++; } }, onAbility: () => { effects++; } });
    t.after(() => system.dispose());
    f.fail(true); const before = p.getState();
    const failed = system.useAbility(); assert.equal(failed.ok, false); assert.match(failed.message, /save/i);
    assert.deepEqual(p.getState(), before); assert.equal(system.lootAccess(chest).ok, false);
    assert.equal(system.getAbility().ready, true); assert.equal(effects, 0); assert.equal(messages.length, 0);
    f.fail(false); assert.equal(system.useAbility().ok, true);
    assert.equal(system.lootAccess(chest).ok, true); assert.equal(messages.length, 1);
    const writes = f.writes(); system.reset();
    assert.equal(system.useAbility().ok, true); assert.equal(f.writes(), writes);
    assert.equal(messages.length, 1, 'already opened seal has no duplicate save or awakening toast');
  });
}
