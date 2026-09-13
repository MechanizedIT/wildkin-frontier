import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCompanionSystem } from '../src/companions/companionSystem.js';
import { COMPANION_BY_ID } from '../src/companions/companionCatalog.js';

function fixture({ speciesId = 'mossling', chests = [], health = 5, maxHealth = 5, saveSeal = true, completed = [] } = {}) {
  const completedPoiIds = [...completed], events = [], position = { x: 0, y: .5, z: 0 };
  let canSaveSeal = saveSeal;
  const progress = {
    getActiveWildkin: () => speciesId ? { id: `wildkin_${speciesId}`, speciesId } : null,
    getOwnedWildkin: () => speciesId ? [{ id: `wildkin_${speciesId}`, speciesId }] : [],
    getState: () => ({ completedPoiIds }),
    getModifiers: () => ({ captureCapacity: 2, fieldToolDamageMultiplier: 1, abilityCooldownMultiplier: 1 }),
    completePoi(id) {
      events.push(`save:${id}`);
      if (!canSaveSeal) return false;
      completedPoiIds.push(id);
      return true;
    },
  };
  const registry = {
    getLootChestsForSection: sectionId => chests.filter(chest => chest.sectionId === sectionId),
    getLootChestById: id => chests.find(chest => chest.id === id) ?? null,
  };
  const creatures = {
    getActiveAliveCreatures: () => [], getCreatures: () => [], setBondingTarget() {},
    hasClearSightToCreature: () => true, setFieldTamingIntent() {}, clearFieldTamingIntent() {},
  };
  const system = createCompanionSystem({ scene: new THREE.Scene(), registry, progress, creatures,
    playerController: { getState: () => ({ pos: position, grounded: true }), launchFromJumpPad() { events.push('launch'); } },
    playerCombat: { getHealth: () => health, getMaxHealth: () => maxHealth, heal() { events.push('heal'); }, grantWard() { events.push('ward'); } },
    isActive: () => true, getSectionId: () => 'camp', toast() { events.push('toast'); },
    pulse() { events.push('pulse'); }, audio: { playParkour() { events.push('audio'); } }, onAbility() { events.push('ability'); },
    hasCacheMechanism: id => chests.find(chest => chest.id === id)?.opensOnSeal === true,
  });
  return { system, events, completedPoiIds, position, setSaveSeal(value) { canSaveSeal = value; } };
}

const grove = (id, x, z = 0, companion = 'mossling') => ({
  id, sectionId: 'camp', pos: { x, y: 0, z }, requiredCompanionId: companion, opensOnSeal: true,
});

test('generated seals require the matching selected companion and keep no-companion access retryable', t => {
  const chest = grove('f1:d:1:2:lush-root-cache', 2);
  const wrong = fixture({ speciesId: 'tidefin', chests: [chest] });
  const none = fixture({ speciesId: null, chests: [chest] });
  t.after(() => { wrong.system.dispose(); none.system.dispose(); });
  assert.equal(wrong.system.lootAccess(chest).ok, false);
  assert.equal(wrong.system.useAbility().ok, true, 'another companion retains its ordinary ability');
  assert.deepEqual(wrong.completedPoiIds, []);
  assert.equal(none.system.useAbility().ok, false);
  assert.equal(none.system.lootAccess(chest).ok, false);
});

test('Bloom seals the nearest matching resident, breaks exact ties by stable id, and can open a second site later', t => {
  const farther = grove('f1:d:9:9:lush-root-cache', 4);
  const tieB = grove('f1:d:2:0:lush-root-cache', 3);
  const tieA = grove('f1:d:1:0:lush-root-cache', -3);
  const wrongSpecies = grove('f1:d:0:0:lush-root-cache', 1, 0, 'tidefin');
  const f = fixture({ chests: [farther, tieB, tieA, wrongSpecies] });
  t.after(() => f.system.dispose());
  assert.equal(f.system.useAbility().ok, true);
  assert.equal(f.completedPoiIds[0], tieA.id);
  f.system.reset();
  f.position.x = 4;
  assert.equal(f.system.useAbility().ok, true);
  assert.equal(f.completedPoiIds[1], farther.id);
});

test('healthy Bloom commits the grove seal before effects and a failed commit spends nothing', t => {
  const chest = grove('f1:d:3:4:lush-root-cache', 2);
  const healthy = fixture({ chests: [chest] });
  const failed = fixture({ chests: [chest], saveSeal: false, health: 3 });
  t.after(() => { healthy.system.dispose(); failed.system.dispose(); });
  assert.deepEqual(healthy.system.useAbility(), { ok: true, message: 'The cache is opening.' });
  assert.equal(healthy.events[0], `save:${chest.id}`);
  assert.ok(healthy.events.indexOf('heal') > 0);
  assert.equal(healthy.system.getAbility().ready, false);
  assert.equal(failed.system.useAbility().ok, false);
  assert.deepEqual(failed.events, [`save:${chest.id}`]);
  assert.equal(failed.system.getAbility().ready, true);
  assert.equal(failed.system.lootAccess(chest).ok, false);
  failed.setSaveSeal(true);
  assert.equal(failed.system.useAbility().ok, true);
  assert.equal(failed.completedPoiIds.includes(chest.id), true);
});

test('fixed species secrets remain a fallback when section enumeration omits the legacy chest', t => {
  const species = COMPANION_BY_ID.mossling;
  const chest = { id: species.secret, sectionId: 'camp', pos: { x: 2, y: 0, z: 0 } };
  const f = fixture({ chests: [chest], health: 3 });
  f.system.dispose();
  const registry = { getLootChestsForSection: () => [], getLootChestById: id => id === chest.id ? chest : null };
  const reopened = createCompanionSystem({ scene: new THREE.Scene(), registry,
    progress: { getActiveWildkin: () => ({ id: 'm', speciesId: 'mossling' }), getOwnedWildkin: () => [],
      getState: () => ({ completedPoiIds: [] }), getModifiers: () => ({ captureCapacity: 1, abilityCooldownMultiplier: 1 }), completePoi: id => id === chest.id },
    creatures: { getActiveAliveCreatures: () => [], getCreatures: () => [], setBondingTarget() {}, hasClearSightToCreature: () => true, setFieldTamingIntent() {}, clearFieldTamingIntent() {} },
    playerController: { getState: () => ({ pos: { x: 0, y: .5, z: 0 }, grounded: true }) },
    playerCombat: { getHealth: () => 3, getMaxHealth: () => 5, heal() {} }, isActive: () => true, getSectionId: () => 'camp', toast() {}, pulse() {}, audio: {},
  });
  t.after(() => reopened.dispose());
  assert.equal(reopened.useAbility().ok, true);
});
