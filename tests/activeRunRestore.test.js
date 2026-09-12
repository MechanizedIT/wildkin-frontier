import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { normalizeActiveRun, cloneActiveRun } from '../src/session/activeRunState.js';
import { createExpeditionSession } from '../src/session/expeditionSession.js';
import { createPlayerCombat } from '../src/combat/playerCombat.js';
import { createCompanionSystem } from '../src/companions/companionSystem.js';
import { createCreatureSystem } from '../src/creatures/creatureSystem.js';
import { createFieldTaming } from '../src/companions/fieldTaming.js';
import { COMPANION_BY_ID } from '../src/companions/companionCatalog.js';
import { createWildkinGenome } from '../src/creatures/wildkinGenome.js';
import { getWildkinSex } from '../src/creatures/wildkinIndividual.js';

const wildkin = (id, speciesId = 'tidefin', originId = `f1:w:0:0:${id}`, acquiredRunId = 'same-run-123') => ({
  version: 1, id, speciesId, originId, acquiredRunId,
  sex: getWildkinSex(originId), lineage: null,
  genome: speciesId === 'mossling' ? createWildkinGenome(originId) : null,
});
const record = () => ({ runId: 'same-run-123', startAnchorId: 'camp_gate', sectionId: 'section_2',
  feet: { x: -27, y: 1.4, z: 9 }, facingYaw: -1.25, health: 3.5, xp: 3_000_000_001,
  companions: [wildkin('wildkin_tidefin')], corePending: true, kills: 8, maxDepth: 2,
  frontierDeparted: false,
  newWaypoints: ['wp_section_2'], newBeacons: ['beacon_2'] });

test('active run validation clones only the run contract, never a second inventory', () => {
  const raw = { ...record(), cargo: { wood: 999 }, pack: [1] };
  const result = normalizeActiveRun(raw);
  assert.equal(result.ok, true);
  assert.deepEqual(result.run, record());
  raw.feet.x = 100; raw.companions.push(wildkin('wildkin_mossling', 'mossling')); raw.newWaypoints.push('other');
  assert.deepEqual(result.run, record());
  const copy = cloneActiveRun(result.run);
  copy.newBeacons.push('another'); copy.feet.y = 50;
  assert.deepEqual(result.run, record());
  assert.deepEqual(normalizeActiveRun(null), { ok: true, run: null, reason: null });
  assert.equal(cloneActiveRun(null), null);
});

test('malformed run identity, values and companion/discovery lists reject rather than coerce', () => {
  for (const patch of [
    { runId: '' }, { startAnchorId: 'bad id' }, { sectionId: null },
    { feet: { x: 0, y: NaN, z: 0 } }, { feet: { x: 1_000_001, y: 0, z: 0 } },
    { facingYaw: Infinity }, { health: 0 }, { health: 21 }, { health: '3' },
    { xp: -1 }, { xp: Number.MAX_SAFE_INTEGER + 1 }, { kills: .5 }, { maxDepth: -1 },
    { companions: ['constructor'] }, { companions: [wildkin('wildkin_tidefin'), wildkin('wildkin_tidefin')] }, { frontierDeparted: 'yes' },
    { companions: new Array(1) }, { corePending: 1 },
    { newWaypoints: ['same', 'same'] }, { newBeacons: new Array(1) },
  ]) {
    const result = normalizeActiveRun({ ...record(), ...patch });
    assert.equal(result.ok, false, JSON.stringify(patch));
    assert.equal(result.run, null);
    assert.equal(typeof result.reason, 'string');
  }
});

test('session restores the same run from a resolved state and can resolve exactly once', () => {
  const session = createExpeditionSession();
  session.setCargo({ wood: 9 }); session.tryResolveDeath('fall');
  const raw = record();
  assert.equal(session.restoreActiveRun(raw).ok, true);
  raw.newWaypoints.push('mutated');
  const state = session.getState();
  assert.equal(state.status, 'active'); assert.equal(state.resolved, false);
  assert.equal(state.extractionOutcome, null); assert.equal(state.currentPocketId, null);
  assert.equal(state.currentRegionId, 'section_2'); assert.equal(state.runId, 'same-run-123');
  assert.equal(state.runXp, record().xp); assert.equal(state.kills, 8); assert.equal(state.maxDepth, 2);
  assert.deepEqual(state.runDiscoveries.newWaypoints, ['wp_section_2']);
  assert.deepEqual(state.unsecuredWildkin, []);
  assert.equal(Object.values(state.unsecuredCargo).every(n => n === 0), true);
  const before = session.getState();
  assert.equal(session.restoreActiveRun({ ...record(), xp: -1 }).ok, false);
  assert.deepEqual(session.getState(), before);
  session.setXp(record().xp);
  assert.equal(session.getRunXp(), record().xp, 'XP owner callback must not truncate signed 32-bit values');
  assert.equal(session.tryResolveExtract().runId, record().runId);
  assert.equal(session.tryResolveExtract(), null); assert.equal(session.tryResolveDeath(), null);
});

test('health restoration resets combat transients with one final HUD update and no damage effects', () => {
  const player = new THREE.Group(), healthEvents = [];
  let deaths = 0, damageEffects = 0;
  const combat = createPlayerCombat({ playerMesh: player, characterPhysics: {},
    getPlayerState: () => ({ pos: new THREE.Vector3(0, .52, 0), facing: 0, mode: 'IDLE' }),
    onHealthChanged: (...args) => healthEvents.push(args), onDeath: () => deaths++,
    onDamageFeedback: () => damageEffects++ });
  combat.configure({ maxHealth: 8 }); combat.startAttack();
  combat.takeDamage(20, { x: 1, z: 0 });
  assert.equal(combat.isDead(), true); assert.notEqual(combat.getKnockback(), null);
  const beforeEffects = [deaths, damageEffects]; healthEvents.length = 0;
  assert.deepEqual(combat.restoreHealth(3.5), { ok: true, health: 3.5, maxHealth: 8 });
  assert.deepEqual(healthEvents, [[3.5, 8]]);
  assert.deepEqual([deaths, damageEffects], beforeEffects);
  assert.equal(combat.isDead(), false); assert.equal(combat.isInvulnerable(), false);
  assert.equal(combat.isAttacking(), false); assert.equal(combat.getKnockback(), null);
  assert.equal(combat.isCombatRecentlyActive(), false);
  for (const value of [0, -1, NaN, Infinity, '2']) {
    const before = combat.getState();
    assert.equal(combat.restoreHealth(value).ok, false); assert.deepEqual(combat.getState(), before);
  }
  assert.equal(healthEvents.length, 1);
  combat.restoreHealth(20); assert.equal(combat.getHealth(), 8);
  combat.restoreHealth(2); combat.reset(); assert.equal(combat.getHealth(), 8);
});

function companionFixture() {
  const scene = new THREE.Scene();
  const player = { pos: new THREE.Vector3(0, .52, -4), grounded: true, speed: 0, facing: 0 };
  const species = COMPANION_BY_ID.tidefin;
  const creatures = createCreatureSystem(scene, null, null, { spawns: [{ id: 'wild', type: 'rusher',
    pos: { x: 0, y: 0, z: 0 }, regionId: 'field', temperament: 'DEFENSIVE', visualAsset: { id: species.assetId } }] });
  const target = creatures.getCreatures()[0];
  creatures.setPlayerState(player); creatures.setPlayerPos(player.pos);
  let owned = [], capacity = 2, saveOk = false, spent = 0;
  const capturedSources = new Map();
  const saves = [], messages = [], pulses = [];
  const progress = { getState: () => ({ securedCompanions: owned.map(record => record.speciesId), activeCompanionId: null, completedPoiIds: [] }),
    getOwnedWildkin: () => owned.map(record => ({ ...record, genome: record.genome ? { ...record.genome } : null })),
    isWildkinSourceCaptured: originId => capturedSources.has(originId),
    getModifiers: () => ({ captureCapacity: capacity }),
    consumeFieldSupply: () => { spent++; return { consumed: true }; },
    commitWildkinCapture: (record, pendingRecords) => {
      assert.equal(target.state.bondCaptured, false, 'save happens before wild removal');
      saves.push({ record, pendingRecords });
      if (!saveOk) return { ok: false, reason: 'storage' };
      capturedSources.set(record.originId, record.id);
      return { ok: true, reason: null };
    } };
  const system = createCompanionSystem({ scene, registry: { getLootChestById: () => null, getSectionById: () => null },
    progress, creatures, playerController: { getState: () => player },
    isActive: () => true, getSectionId: () => 'field', getRunId: () => 'capture_run', toast: (...args) => messages.push(args),
    pulse: (...args) => pulses.push(args) });
  return { system, target, creatures, player, saves, messages, pulses,
    setOwned: records => { owned = records; }, setCapacity: n => { capacity = n; },
    allowSave: () => { saveOk = true; }, spent: () => spent };
}

test('pending restore has one owner, filters owned identities, rejects invalid/capacity atomically', () => {
  const f = companionFixture(); f.setOwned([wildkin('wildkin_owned_moss', 'mossling', 'f1:w:0:0:owned', 'old_run')]);
  const records = [wildkin('wildkin_owned_moss', 'mossling', 'f1:w:0:0:owned', 'old_run'), wildkin('wildkin_pending_tide', 'tidefin', 'f1:w:0:0:pending', 'capture_run')];
  assert.deepEqual(f.system.restorePending(records), { ok: true, companions: [records[1]] });
  records[1].id = 'mutated';
  assert.deepEqual(f.system.getPending().map(s => s.id), ['wildkin_pending_tide']);
  f.setCapacity(1);
  for (const invalid of [[{ id: 'missing-fields' }], [wildkin('wildkin_duplicate'), wildkin('wildkin_duplicate')], new Array(1), [wildkin('wildkin_extra_a'), wildkin('wildkin_extra_b')]]) {
    assert.equal(f.system.restorePending(invalid).ok, false, JSON.stringify(invalid));
    assert.deepEqual(f.system.getPending().map(s => s.id), ['wildkin_pending_tide']);
  }
  assert.equal(f.spent(), 0); assert.equal(f.saves.length, 0); assert.equal(f.messages.length, 0);
  f.system.reset(); assert.deepEqual(f.system.getPending(), []);
});

test('actual companion capture saves before removal; failed save preserves paid attempt and retry costs nothing', () => {
  const f = companionFixture();
  assert.equal(f.system.beginBond('wild'), true); assert.equal(f.spent(), 1);
  f.target.state.pos.set(0, .46, -2.5); f.player.pos.z = -6;
  f.system.updateFixed(.1, { sectionId: 'field' });
  assert.equal(f.system.getFieldTamingState().stage, 'trapped');
  f.player.pos.z = -4;
  assert.equal(f.system.beginBond('wild'), false);
  assert.equal(f.system.getFieldTamingState().stage, 'trapped');
  assert.equal(f.target.state.bondCaptured, false); assert.equal(f.target.state.bondingHeld, false);
  assert.deepEqual(f.system.getPending(), []); assert.equal(f.pulses.length, 0);
  assert.equal(f.messages.at(-1)[0], 'Bond could not be saved');
  f.allowSave(); assert.equal(f.system.beginBond('wild'), true);
  assert.equal(f.spent(), 1); assert.equal(f.target.state.bondCaptured, true);
  assert.deepEqual(f.system.getPending().map(s => s.speciesId), ['tidefin']);
  assert.equal(f.system.getFieldTamingState(), null);
  assert.equal(f.saves.length, 2);
  assert.equal(f.saves[0].record.id, f.saves[1].record.id, 'retry keeps the original individual identity');
  assert.deepEqual(f.saves.map(save => save.pendingRecords.map(record => record.id)), [[f.saves[0].record.id], [f.saves[0].record.id]]);
});

test('restoring bonds clears unfinished paid taming without a refund, capture or checkpoint', () => {
  const f = companionFixture(); f.system.beginBond('wild');
  assert.notEqual(f.system.getFieldTamingState(), null);
  assert.equal(f.system.restorePending([wildkin('wildkin_restored_moss', 'mossling', 'f1:w:0:0:restored', 'capture_run')]).ok, true);
  assert.equal(f.system.getFieldTamingState(), null); assert.equal(f.spent(), 1);
  assert.equal(f.saves.length, 0); assert.equal(f.target.state.bondCaptured, false);
});

test('Emberhorn final paid berry offer is not charged again after a capture-save failure', () => {
  const player = { pos: { x: 0, y: 0, z: -1 }, speed: 0, grounded: true };
  const target = { state: { pos: { x: 0, y: 0, z: 0 }, health: 5, dodgedChargeSerial: 0, fieldTamingRecoveryRemaining: 2 } };
  const paid = []; let saves = 0;
  const taming = createFieldTaming({ getPlayer: () => player, getTarget: () => target,
    getSectionId: () => 'field', isActive: () => true, canStart: () => ({ ok: true }),
    consume: id => { paid.push(id); return { consumed: true }; }, setIntent() {}, clearIntent() {},
    capture: () => ++saves === 1 ? { ok: false, reason: 'save-failed' } : true });
  assert.equal(taming.begin('wild', COMPANION_BY_ID.emberhorn), true);
  target.state.dodgedChargeSerial = 1; taming.update(.1);
  assert.equal(taming.act(), true); assert.equal(taming.getState().stage, 'offer');
  assert.equal(taming.act(), false); assert.equal(taming.getState().stage, 'offer');
  assert.equal(taming.act(), true); assert.equal(taming.getState(), null);
  assert.deepEqual(paid, ['reinforced_tether', 'berry_lure']);
});
