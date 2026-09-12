import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { createCompanionSystem } from '../src/companions/companionSystem.js';
import { canBond } from '../src/companions/bondingLogic.js';
import { createObservationMarker, findFieldPlacement } from '../src/companions/fieldTamingVisual.js';
import { createWildkinGenome } from '../src/creatures/wildkinGenome.js';

function record(id, originId, genome = createWildkinGenome(originId)) {
  return { version: 1, id, speciesId: 'mossling', originId, acquiredRunId: 'run_one', genome: { ...genome } };
}

test('bond eligibility permits same-species individuals and rejects an already captured source', () => {
  const first = record('moss_a', 'source_a');
  assert.equal(canBond({ speciesId: 'mossling', originId: 'source_b', secured: [first] }).ok, true);
  assert.equal(canBond({ speciesId: 'mossling', originId: 'source_a', secured: [first] }).ok, false);
  assert.equal(canBond({ speciesId: 'mossling', originId: 'source_b', sourceCaptured: true }).ok, false);
});

test('field gear samples generated terrain before the authored fallback', () => {
  const point = findFieldPlacement({
    player: { pos: { x: 100, y: 10.6, z: 100 }, facing: 0 },
    target: { state: { pos: { x: 100, y: 10.5, z: 103 } } },
    registry: { getSectionById: () => ({ surface: null }) }, sectionId: 'frontier',
    getTerrainHeight: () => 10,
  });
  assert.deepEqual(point, { x: 100, y: 10, z: 101.5 });
});

test('observation marker follows one subject and advances without rebuilding UI', () => {
  const scene = new THREE.Scene();
  const marker = createObservationMarker(scene);
  const target = { state: { pos: { x: 4, y: 2, z: -3 } }, group: { scale: { y: .8 } } };
  marker.update({ id: 'wild_a', progress: .25, complete: false, reason: null }, target, null);
  const first = marker.getState();
  assert.equal(first.visible, true);
  assert.equal(first.subjectId, 'wild_a');
  assert.equal(first.progress, .25);
  assert.deepEqual(first.position, [4, 2.9, -3]);
  marker.update({ id: 'wild_a', progress: .75, complete: false, reason: null }, target, null);
  assert.ok(marker.getState().drawCount > first.drawCount);
  marker.update({ id: 'wild_a', progress: 1, complete: true }, target, null);
  assert.equal(marker.getState().visible, false);
  marker.dispose();
  assert.equal(scene.getObjectByName('observationMarker'), undefined);
});

test('pending restore retains two exact Mosslings and exposes defensive record clones', () => {
  const records = [record('moss_a', 'source_a'), record('moss_b', 'source_b')];
  const system = createCompanionSystem({ scene: new THREE.Scene(),
    registry: { data: { visualAssets: [] }, getLootChestById: () => null, getSectionById: () => null },
    progress: { getState: () => ({ securedCompanions: [], completedPoiIds: [] }), getOwnedWildkin: () => [],
      getActiveWildkin: () => null, getModifiers: () => ({ captureCapacity: 2 }), discoverSpecies() {}, earnObservationClue() {} },
    creatures: { getActiveAliveCreatures: () => [], getCreatures: () => [], hasClearSightToCreature: () => true, setBondingTarget() {} },
    playerController: { getState: () => ({ pos: { x: 0, y: .6, z: 0 }, grounded: true, facing: 0 }) },
    isActive: () => true, getSectionId: () => 'camp', toast() {}, pulse() {} });
  assert.deepEqual(system.restorePending(records), { ok: true, companions: records });
  records[0].genome.baseColor = 'mutated';
  const pending = system.getPending();
  assert.equal(pending.length, 2);
  assert.equal(pending[0].speciesId, 'mossling');
  assert.notEqual(pending[0].genome.baseColor, 'mutated');
  pending[0].genome.baseColor = 'also-mutated';
  assert.notEqual(system.getPending()[0].genome.baseColor, 'also-mutated');
  system.dispose();
});

test('capture retries the exact individual record without charging again, then allows a second Mossling', () => {
  const player = { pos: new THREE.Vector3(0, .6, -4), grounded: true, speed: 0, facing: 0 };
  const targets = ['source_a', 'source_b'].map((originId, index) => ({
    state: { id: `actor_${index}`, originId, genome: createWildkinGenome(originId), visualAssetId: 'asset_wildkin_mossling',
      pos: new THREE.Vector3(index * 4, .5, 0), health: 6, playerDamaged: false, isDead: false },
  }));
  let held = null, failFirst = true, spent = 0;
  const capturedSources = new Set(), commits = [];
  const creatures = {
    getActiveAliveCreatures: () => targets.filter(target => !target.state.bondCaptured),
    getCreatures: () => targets,
    hasClearSightToCreature: () => true,
    setFieldTamingIntent() {}, clearFieldTamingIntent() {},
    setBondingTarget(id) { held = id; return targets.find(target => target.state.id === id && !target.state.bondCaptured) ?? null; },
    secureBondTarget(id) { const target = targets.find(candidate => candidate.state.id === id && held === id); if (!target) return null; target.state.bondCaptured = true; held = null; return target; },
  };
  const progress = {
    getState: () => ({ securedCompanions: [], completedPoiIds: [], discoveredSpecies: [], observationClues: {} }),
    getOwnedWildkin: () => [], getActiveWildkin: () => null,
    getModifiers: () => ({ captureCapacity: 2 }),
    isWildkinSourceCaptured: originId => capturedSources.has(originId),
    consumeFieldSupply: () => { spent++; return { consumed: true }; }, discoverSpecies() {}, earnObservationClue() {},
    commitWildkinCapture(individual, pending) {
      commits.push({ individual, pending });
      if (failFirst) { failFirst = false; return { ok: false, reason: 'storage' }; }
      capturedSources.add(individual.originId); return { ok: true };
    },
  };
  const system = createCompanionSystem({ scene: new THREE.Scene(),
    registry: { data: { visualAssets: [{ id: 'asset_wildkin_mossling', parts: [] }] }, getLootChestById: () => null,
      getSectionById: () => ({ surface: null }) }, progress, creatures,
    playerController: { getState: () => player }, playerCombat: { getHealth: () => 6 },
    isActive: () => true, getSectionId: () => 'field', getRunId: () => 'run_one', toast() {}, pulse() {} });

  function readyAndBond(target, expectSuccess) {
    player.pos.set(target.state.pos.x, .6, target.state.pos.z - 4);
    assert.equal(system.beginBond(target.state.id), true);
    const point = system.getFieldTamingState().point;
    target.state.pos.set(point.x, .5, point.z);
    player.pos.set(point.x, .6, point.z - 4);
    for (let i = 0; i < 31; i++) system.updateFixed(.1, { sectionId: 'field' });
    assert.equal(system.getFieldTamingState().stage, 'ready');
    player.pos.set(point.x, .6, point.z - 1);
    assert.equal(system.beginBond(target.state.id), expectSuccess);
  }

  readyAndBond(targets[0], false);
  assert.equal(spent, 1);
  assert.equal(targets[0].state.bondCaptured, undefined);
  assert.equal(system.beginBond(targets[0].state.id), true);
  assert.equal(spent, 1);
  assert.strictEqual(commits[0].individual, commits[1].individual);
  assert.deepEqual(commits[0].pending, commits[1].pending);
  readyAndBond(targets[1], true);
  assert.equal(spent, 2);
  const pending = system.getPending();
  assert.deepEqual(pending.map(individual => individual.speciesId), ['mossling', 'mossling']);
  assert.equal(new Set(pending.map(individual => individual.id)).size, 2);
  assert.deepEqual(pending.map(individual => individual.genome), targets.map(target => ({ ...target.state.genome })));
  system.dispose();
});

test('followers key by individual ID, resolve species assets and spawn on injected terrain', async t => {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  t.after(() => world.free());
  const active = record('moss_a', 'source_a');
  const pending = record('moss_b', 'source_b');
  const system = createCompanionSystem({ scene: new THREE.Scene(), physicsWorld: { world, RAPIER },
    registry: { data: { visualAssets: [{ id: 'asset_wildkin_mossling', parts: [] }] }, getLootChestById: () => null,
      getSectionById: () => ({ surface: null }) },
    progress: { getState: () => ({ securedCompanions: ['mossling'], completedPoiIds: [], discoveredSpecies: [], observationClues: {} }),
      getOwnedWildkin: () => [active], getActiveWildkin: () => active, getModifiers: () => ({ captureCapacity: 2 }),
      discoverSpecies() {}, earnObservationClue() {} },
    creatures: { getActiveAliveCreatures: () => [], getCreatures: () => [], hasClearSightToCreature: () => true, setBondingTarget() {} },
    playerController: { getState: () => ({ pos: { x: 20, y: 7.6, z: 10 }, grounded: true, facing: 0 }) },
    playerCombat: { getHealth: () => 6 }, isActive: () => true, getSectionId: () => 'frontier',
    getTerrainHeight: () => 7, toast() {}, pulse() {} });
  assert.equal(system.restorePending([pending]).ok, true);
  system.updateFixed(.01, { sectionId: 'frontier' });
  const followers = system.getFollowerDiagnostics();
  assert.deepEqual(followers.map(follower => follower.id).sort(), ['moss_a', 'moss_b']);
  assert.ok(followers.every(follower => follower.speciesId === 'mossling'));
  assert.ok(followers.every(follower => follower.position[1] > 6.9), 'generated terrain height seeds both capsules');
  assert.deepEqual(system.getAbility(), { individualId: 'moss_a', speciesId: 'mossling', name: 'Bloom', ready: true, cooldown: 0 });
  system.dispose();
});

test('one owned individual docks at its Camp bed, undocks into formation, and never duplicates', async t => {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  t.after(() => world.free());
  const owned = record('moss_nursery', 'source_nursery');
  let active = owned;
  let careAnchor = { wildkinId: owned.id, anchorPos: { x: 4, y: 1.25, z: 6 }, yaw: .75 };
  const system = createCompanionSystem({ scene: new THREE.Scene(), physicsWorld: { world, RAPIER },
    registry: { data: { visualAssets: [{ id: 'asset_wildkin_mossling', parts: [] }] }, getLootChestById: () => null,
      getSectionById: () => ({ surface: null }) },
    progress: { getState: () => ({ securedCompanions: ['mossling'], completedPoiIds: [], discoveredSpecies: [], observationClues: {} }),
      getOwnedWildkin: () => [owned], getActiveWildkin: () => active, getModifiers: () => ({ captureCapacity: 2 }),
      discoverSpecies() {}, earnObservationClue() {} },
    creatures: { getActiveAliveCreatures: () => [], getCreatures: () => [], hasClearSightToCreature: () => true, setBondingTarget() {} },
    playerController: { getState: () => ({ pos: { x: 0, y: .6, z: 0 }, grounded: true, facing: 0 }) },
    playerCombat: { getHealth: () => 6 }, isActive: () => true, getSectionId: () => 'camp',
    getTerrainHeight: () => 0, getCampCareAnchor: () => careAnchor, toast() {}, pulse() {} });

  system.updateFixed(.01, { sectionId: 'camp' });
  let followers = system.getFollowerDiagnostics();
  assert.equal(followers.length, 1, 'active and assigned references share one follower');
  assert.deepEqual(followers[0].position, [4, 1.25, 6]);
  assert.equal(followers[0].mode, 'DOCKED');
  assert.equal(followers[0].docked, true);
  assert.equal(followers[0].physicsEnabled, false);

  careAnchor = null;
  system.updateFixed(.01, { sectionId: 'camp' });
  followers = system.getFollowerDiagnostics();
  assert.equal(followers[0].docked, false, 'release undocks the same visual');
  assert.equal(followers[0].physicsEnabled, true);
  assert.equal(followers[0].visible, true);
  assert.notDeepEqual(followers[0].position, [4, 1.25, 6]);

  active = null;
  careAnchor = { wildkinId: owned.id, anchorPos: { x: 4, y: 1.25, z: 6 }, yaw: .75 };
  system.updateFixed(.01, { sectionId: 'camp' });
  assert.equal(system.getFollowerDiagnostics()[0].docked, true, 'an assigned unselected Mossling still rests at Camp');
  careAnchor = null;
  system.updateFixed(.01, { sectionId: 'frontier' });
  followers = system.getFollowerDiagnostics();
  assert.equal(followers[0].visible, false, 'an unselected assignment stays hidden outside Camp');
  assert.equal(followers[0].docked, false);
  assert.equal(followers[0].physicsEnabled, false);
  system.dispose();
});
