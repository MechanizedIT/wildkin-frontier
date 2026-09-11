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

const record = () => ({ runId: 'same-run-123', startAnchorId: 'camp_gate', sectionId: 'section_2',
  feet: { x: -27, y: 1.4, z: 9 }, facingYaw: -1.25, health: 3.5, xp: 3_000_000_001,
  companions: ['tidefin'], corePending: true, kills: 8, maxDepth: 2,
  newWaypoints: ['wp_section_2'], newBeacons: ['beacon_2'] });

test('active run validation clones only the run contract, never a second inventory', () => {
  const raw = { ...record(), cargo: { wood: 999 }, pack: [1] };
  const result = normalizeActiveRun(raw);
  assert.equal(result.ok, true);
  assert.deepEqual(result.run, record());
  raw.feet.x = 100; raw.companions.push('mossling'); raw.newWaypoints.push('other');
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
    { companions: ['constructor'] }, { companions: ['mossling', 'mossling'] },
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
  let secured = [], capacity = 2, saveOk = false, spent = 0;
  const saves = [], messages = [], pulses = [];
  const progress = { getState: () => ({ securedCompanions: secured, activeCompanionId: null, completedPoiIds: [] }),
    getModifiers: () => ({ captureCapacity: capacity }),
    consumeFieldSupply: () => { spent++; return { consumed: true }; },
    checkpointRun: patch => {
      assert.equal(target.state.bondCaptured, false, 'save happens before wild removal');
      saves.push(patch); return { ok: saveOk, reason: saveOk ? null : 'storage' };
    } };
  const system = createCompanionSystem({ scene, registry: { getLootChestById: () => null, getSectionById: () => null },
    progress, creatures, playerController: { getState: () => player },
    isActive: () => true, getSectionId: () => 'field', toast: (...args) => messages.push(args),
    pulse: (...args) => pulses.push(args) });
  return { system, target, creatures, player, saves, messages, pulses,
    setSecured: ids => { secured = ids; }, setCapacity: n => { capacity = n; },
    allowSave: () => { saveOk = true; }, spent: () => spent };
}

test('pending restore has one owner, filters secured species, rejects invalid/capacity atomically', () => {
  const f = companionFixture(); f.setSecured(['mossling']);
  const ids = ['mossling', 'tidefin'];
  assert.deepEqual(f.system.restorePending(ids), { ok: true, companions: ['tidefin'] });
  ids[1] = 'skydancer';
  assert.deepEqual(f.system.getPending().map(s => s.id), ['tidefin']);
  f.setCapacity(1);
  for (const invalid of [['constructor'], ['tidefin', 'tidefin'], new Array(1), ['tidefin', 'emberhorn']]) {
    assert.equal(f.system.restorePending(invalid).ok, false);
    assert.deepEqual(f.system.getPending().map(s => s.id), ['tidefin']);
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
  assert.deepEqual(f.system.getPending().map(s => s.id), ['tidefin']);
  assert.equal(f.system.getFieldTamingState(), null);
  assert.deepEqual(f.saves, [{ companions: ['tidefin'] }, { companions: ['tidefin'] }]);
});

test('restoring bonds clears unfinished paid taming without a refund, capture or checkpoint', () => {
  const f = companionFixture(); f.system.beginBond('wild');
  assert.notEqual(f.system.getFieldTamingState(), null);
  assert.equal(f.system.restorePending(['mossling']).ok, true);
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
