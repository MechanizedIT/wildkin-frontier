import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { createCompanionSystem } from '../src/companions/companionSystem.js';
import { COMPANION_BY_ID } from '../src/companions/companionCatalog.js';

await RAPIER.init();

const owned = { version: 1, id: 'shore_moss', speciesId: 'mossling', originId: 'shore_source', acquiredRunId: 'run_shore' };
const waterAt = position => position?.z >= 0
  ? { surfaceY: 0, bedY: -1, depth: 1, offshoreDistance: position.z, inlandDirection: { x: 0, z: -1 } }
  : null;

function followerFixture(t, initialPlayer) {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.createCollider(RAPIER.ColliderDesc.cuboid(20, .1, 20).setTranslation(0, -.1, -20));
  world.step();
  let player = initialPlayer;
  const system = createCompanionSystem({
    scene: new THREE.Scene(), physicsWorld: { world, RAPIER },
    registry: {
      data: { visualAssets: [{ id: 'asset_wildkin_mossling', parts: [] }] },
      getLootChestById: () => null,
      getSectionById: () => ({ surface: null }),
    },
    progress: {
      getState: () => ({ securedCompanions: ['mossling'], completedPoiIds: [], discoveredSpecies: [], observationClues: {} }),
      getOwnedWildkin: () => [owned], getActiveWildkin: () => owned,
      getModifiers: () => ({ captureCapacity: 2 }), discoverSpecies() {}, earnObservationClue() {},
    },
    creatures: {
      getActiveAliveCreatures: () => [], getCreatures: () => [], hasClearSightToCreature: () => true,
      setBondingTarget() {}, setFieldTamingIntent() {}, clearFieldTamingIntent() {},
    },
    playerController: { getState: () => player }, playerCombat: { getHealth: () => 5 },
    isActive: () => true, getSectionId: () => 'frontier', getTerrainHeight: () => 0,
    getSurfaceWater: waterAt, toast() {}, pulse() {},
  });
  t.after(() => { system.dispose(); world.free(); });
  return { system, setPlayer: next => { player = next; } };
}

test('a follower waits on supported shore while its player is waterborne, then rejoins on land', t => {
  const dry = { pos: { x: 0, y: .52, z: -8 }, lastDryPosition: { x: 0, y: 0, z: -8 },
    grounded: true, facing: 0, mode: 'IDLE', waterborne: false };
  const { system, setPlayer } = followerFixture(t, dry);
  system.updateFixed(1 / 60, { sectionId: 'frontier' });
  const initial = system.getFollowerDiagnostics()[0].position;

  setPlayer({ pos: { x: 0, y: .14, z: 6 }, lastDryPosition: { x: 0, y: 0, z: -.6 },
    grounded: false, facing: Math.PI, mode: 'SWIM', waterborne: true });
  for (let frame = 0; frame < 180; frame++) system.updateFixed(1 / 60, { sectionId: 'frontier' });
  const waiting = system.getFollowerDiagnostics()[0];
  assert.equal(waiting.mode, 'SHORE_WAIT');
  assert.ok(waiting.position[2] > initial[2], 'the follower reaches toward the last supported shore');
  assert.ok(waiting.position[2] <= -.35, 'its full capsule and margin remain outside surface water');
  assert.equal(waiting.grounded, true);

  setPlayer({ pos: { x: 0, y: .52, z: -12 }, lastDryPosition: { x: 0, y: 0, z: -12 },
    grounded: true, facing: 0, mode: 'RUN', waterborne: false });
  for (let frame = 0; frame < 150; frame++) system.updateFixed(1 / 60, { sectionId: 'frontier' });
  const rejoined = system.getFollowerDiagnostics()[0];
  assert.notEqual(rejoined.mode, 'SHORE_WAIT');
  assert.ok(rejoined.position[2] < waiting.position[2], 'ordinary land following resumes after the player exits');
});

test('a wet initial formation falls back to the player dry footprint instead of spawning in water', t => {
  const player = { pos: { x: 0, y: .52, z: -2 }, lastDryPosition: { x: 0, y: 0, z: -2 },
    grounded: true, facing: Math.PI, mode: 'IDLE', waterborne: false };
  const { system } = followerFixture(t, player);
  system.updateFixed(1 / 60, { sectionId: 'frontier' });
  const follower = system.getFollowerDiagnostics()[0];
  assert.ok(Math.abs(follower.position[0]) < .01 && Math.abs(follower.position[2] + 2) < .01,
    'the dry player footprint is the bounded fallback when the behind-player slot crosses shore');
});

test('a grounded wading player still leaves its follower waiting on dry shore', t => {
  const dry = { pos: { x: 0, y: .52, z: -8 }, lastDryPosition: { x: 0, y: 0, z: -8 },
    grounded: true, facing: 0, mode: 'IDLE', waterborne: false };
  const { system, setPlayer } = followerFixture(t, dry);
  system.updateFixed(1 / 60, { sectionId: 'frontier' });
  setPlayer({ pos: { x: 0, y: .52, z: .2 }, lastDryPosition: { x: 0, y: 0, z: -.6 },
    grounded: true, facing: Math.PI, mode: 'WADE', waterborne: true });
  for (let frame = 0; frame < 180; frame++) system.updateFixed(1 / 60, { sectionId: 'frontier' });
  const waiting = system.getFollowerDiagnostics()[0];
  assert.equal(waiting.mode, 'SHORE_WAIT');
  assert.equal(waiting.grounded, true);
  assert.ok(waiting.position[2] <= -.35, 'the follower does not enter shallow water beside the grounded player');
});

test('swimming cancels field taming and rejects new taming or abilities before spending and effects', t => {
  const mossling = { state: { id: 'wild_moss', originId: 'wild_moss', visualAssetId: 'asset_wildkin_mossling',
    pos: new THREE.Vector3(0, .5, 2), health: 4 } };
  let mode = 'SWIM', spent = 0, seals = 0, strikes = 0, damage = 0, effects = 0;
  const completedPoiIds = [];
  const chest = { id: COMPANION_BY_ID.emberhorn.secret, sectionId: 'frontier', pos: { x: 0, y: 0, z: 0 } };
  const system = createCompanionSystem({
    scene: new THREE.Scene(),
    registry: { data: { visualAssets: [] }, getSectionById: () => ({ surface: null }),
      getLootChestById: id => id === chest.id ? chest : null },
    progress: {
      getState: () => ({ completedPoiIds, securedCompanions: [], discoveredSpecies: [], observationClues: {} }),
      getOwnedWildkin: () => [], getActiveWildkin: () => ({ id: 'owned_ember', speciesId: 'emberhorn' }),
      getModifiers: () => ({ captureCapacity: 2, fieldToolDamageMultiplier: 1, abilityCooldownMultiplier: 1 }),
      isWildkinSourceCaptured: () => false, consumeFieldSupply: () => { spent++; return { consumed: true }; },
      completePoi: () => { seals++; return true; }, discoverSpecies() {}, earnObservationClue() {},
    },
    creatures: {
      getActiveAliveCreatures: () => [mossling], getCreatures: () => [mossling], hasClearSightToCreature: () => true,
      setBondingTarget() {}, secureBondTarget() {}, setFieldTamingIntent() {}, clearFieldTamingIntent() {},
      damageCreature: () => { damage++; },
    },
    playerController: { getState: () => ({ pos: { x: 0, y: .5, z: 0 }, facing: 0, grounded: mode !== 'SWIM', mode,
      waterborne: mode === 'SWIM', lastDryPosition: { x: 0, y: 0, z: -1 } }) },
    playerCombat: { getHealth: () => 3, getMaxHealth: () => 5, heal: () => { effects++; }, grantWard: () => { effects++; } },
    isActive: () => true, getSectionId: () => 'frontier', getTerrainHeight: () => 0,
    getSurfaceWater: waterAt, strikeMinerals: () => { strikes++; return { hits: 1, sources: 1, depleted: 0, interrupted: false }; },
    onAbility: () => { effects++; }, toast() {}, pulse() {}, audio: {},
  });
  t.after(() => system.dispose());

  assert.equal(system.getNearbyInteraction({ x: 0, y: .5, z: 0 }), null);
  assert.equal(system.beginBond(mossling.state.id), false);
  assert.equal(spent, 0, 'a waterborne taming press never consumes field gear');
  assert.deepEqual(system.useAbility(), { ok: false, message: 'Return to shore before calling a companion ability.' });
  assert.equal(seals, 0); assert.equal(strikes, 0); assert.equal(damage, 0); assert.equal(effects, 0);
  assert.equal(system.getAbility().ready, true, 'the rejected call spends no cooldown');

  mode = 'IDLE';
  assert.equal(system.beginBond(mossling.state.id), true);
  assert.equal(spent, 1);
  mode = 'SWIM';
  system.updateFixed(1 / 60, { sectionId: 'frontier' });
  assert.equal(system.getFieldTamingState(), null, 'entering surface swim clears the active field attempt');
  assert.equal(spent, 1, 'cancellation cannot trigger another supply transaction');
});
