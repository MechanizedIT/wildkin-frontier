import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '../vendor/rapier.js';
import { createPhysicsWorld } from '../src/physics/createPhysicsWorld.js';
import { createCharacterPhysics } from '../src/physics/createCharacterPhysics.js';
import { createFrontierChunkRuntime } from '../src/world/frontierChunkRuntime.js';
import { createExpeditionSession } from '../src/session/expeditionSession.js';
import { createExpeditionPersistence } from '../src/session/expeditionPersistence.js';
import { findSupportedResumeFeet, frontierCoastResumeCandidates } from '../src/session/resumePosition.js';
import { createFieldTool } from '../src/tools/fieldTool.js';
import { createPlayerCombat } from '../src/combat/playerCombat.js';
import { getCompanionAbilityPresentation } from '../src/ui/betaShell.js';

await RAPIER.init();

function physicsFixture() {
  const playground = {
    terrainSurfaces: [],
    groundPatches: [{ id: 'camp-floor', x: 0, y: 0, z: 0, w: 100, h: .5, d: 100, sectionId: 'camp' }],
    obstacles: [], platforms: [], boundaries: [],
  };
  const physics = createPhysicsWorld(RAPIER, playground);
  physics.setActiveSection('camp');
  return physics;
}

test('real streamed terrain retires every floor and grass resident in deep ocean, then republishes the shore within its cap', t => {
  const physics = physicsFixture(), parent = new THREE.Group();
  const runtime = createFrontierChunkRuntime({ parent, physicsWorld: physics });
  t.after(() => { runtime.dispose(); physics.world.free(); });

  runtime.update({ x: 325, z: 100 }, { activeSectionId: 'camp' });
  assert.ok(runtime.root.getObjectByName('frontier_ground'));
  assert.ok(runtime.root.getObjectByName('frontier_groundcover'));
  const shoreGroups = [...runtime.root.children];
  const shoreGroundGeometries = [];
  runtime.root.traverse(node => { if (node.name === 'frontier_ground') shoreGroundGeometries.push(node.geometry); });
  let disposedGroundGeometries = 0;
  shoreGroundGeometries.forEach(geometry => geometry.addEventListener('dispose', () => { disposedGroundGeometries += 1; }));
  assert.ok(runtime.getDebugState().residentCount <= 25);

  runtime.update({ x: 800, z: 100 }, { activeSectionId: 'camp' });
  assert.equal(runtime.root.getObjectByName('frontier_ground'), undefined);
  assert.equal(runtime.root.getObjectByName('frontier_groundcover'), undefined);
  assert.equal(physics.staticColliders.some(collider => /^-?\d+,-?\d+$/.test(String(physics.getColliderSurfaceId(collider)))), false,
    'no empty streamed trimeshes are registered');
  assert.ok(shoreGroups.every(group => group.parent === null), 'retired shore roots are detached');
  assert.equal(disposedGroundGeometries, shoreGroundGeometries.length, 'retired shore geometry releases its owned buffers');
  const deepGroups = [...runtime.root.children];
  assert.ok(deepGroups.length > 0 && deepGroups.every(group => group.children.length === 0));

  runtime.update({ x: 325, z: 100 }, { activeSectionId: 'camp' });
  assert.ok(runtime.root.getObjectByName('frontier_ground'));
  assert.ok(physics.staticColliders.length > 1);
  assert.ok(runtime.getDebugState().residentCount <= 25);
  assert.ok(deepGroups.every(group => group.parent === null));
});

test('wading and swimming retain last dry feet while checkpoints still save live health, XP, cargo events, and pending companions', () => {
  globalThis.document = new EventTarget(); document.hidden = false;
  globalThis.window = new EventTarget();
  let provider = null, stored = null, health = 5, xp = 10;
  const state = { pos: { x: 325, y: -.11 + .52, z: 100 }, facing: .4, grounded: true, waterborne: false, mode: 'WALK' };
  const companions = [{ id: 'pending-a' }];
  const progress = {
    setRunSnapshotProvider(value) { provider = value; },
    getActiveRun: () => stored,
    checkpointRun() { const next = provider?.(); if (next) stored = structuredClone(next); return { ok: true }; },
  };
  const session = createExpeditionSession({ initialStatus: 'active', initialRegionId: 'camp' });
  session.setCargo({ crystal_shard: 2 });
  const persistence = createExpeditionPersistence({ progress, session, getPlayerState: () => state,
    getHealth: () => health, getXp: () => xp, getSectionId: () => 'camp',
    getExtras: () => ({ companions, coreSecured: false }), validateFeet: feet => ({ ...feet }), capsuleExtent: .52 });
  try {
    persistence.checkpoint();
    const dryFeet = structuredClone(stored.feet);
    Object.assign(state, { pos: { x: 340, y: -1.4, z: 100 }, grounded: true, waterborne: true, mode: 'WADE' });
    health = 4; xp = 14; companions.push({ id: 'pending-b' }); session.addKill();
    persistence.checkpoint();
    assert.deepEqual(stored.feet, dryFeet);
    assert.deepEqual({ health: stored.health, xp: stored.xp, kills: stored.kills }, { health: 4, xp: 14, kills: 1 });
    assert.equal(stored.companions.length, 2);
    Object.assign(state, { pos: { x: 360, y: -1.86, z: 100 }, grounded: false, mode: 'SWIM' });
    health = 3; xp = 18; session.setCargo({ crystal_shard: 3 });
    persistence.checkpoint();
    assert.deepEqual(stored.feet, dryFeet);
    assert.deepEqual({ health: stored.health, xp: stored.xp }, { health: 3, xp: 18 });
    assert.equal(session.getCargo().crystal_shard, 3);
    Object.assign(state, { pos: { x: 320, y: .4, z: 100 }, grounded: true, waterborne: false, mode: 'WALK' });
    persistence.checkpoint();
    assert.deepEqual(stored.feet, { x: 320, y: -.12, z: 100 });
  } finally {
    persistence.destroy(); delete globalThis.document; delete globalThis.window;
  }
});

test('coast resume keeps the saved candidate first and only accepts the corrected shore or Camp fallback after a real Rapier support query', t => {
  const physics = physicsFixture(), runtime = createFrontierChunkRuntime({ parent: new THREE.Group(), physicsWorld: physics });
  runtime.update({ x: 335, z: 100 }, { activeSectionId: 'camp' });
  const terrain = runtime.sample(335, 100), oldFeet = { x: 335, y: 4, z: 100 }, camp = { x: 0, y: 0, z: 0 };
  const candidates = frontierCoastResumeCandidates(oldFeet, terrain, camp);
  assert.strictEqual(candidates[0], oldFeet);
  assert.deepEqual(candidates[1], { x: 335, y: terrain.height, z: 100 });
  const characterPhysics = createCharacterPhysics(RAPIER, physics.world, { x: 335, y: terrain.height + .545, z: 100 });
  const validate = feet => findSupportedResumeFeet({ feet, bounds: { minX: -1000, maxX: 1000, minZ: -1000, maxZ: 1000 },
    characterPhysics });
  assert.equal(validate(candidates[0]), null);
  const corrected = validate(candidates[1]);
  assert.ok(corrected && Math.abs(corrected.y - terrain.height) < .04);

  const water = runtime.sample(350, 100), unsafeCamp = { x: 0, y: 9, z: 0 };
  const waterCandidates = frontierCoastResumeCandidates({ x: 350, y: 4, z: 100 }, water, unsafeCamp);
  assert.deepEqual(waterCandidates.at(-1), unsafeCamp);
  assert.equal(validate(unsafeCamp), null, 'candidate generation cannot bypass the ordinary support validator');
  t.after(() => { runtime.dispose(); physics.world.free(); });
});

test('entering swim cancels an active field swing, hides field and ability controls, and blocks combat callbacks', () => {
  const player = new THREE.Group(), tool = createFieldTool(player);
  let harvests = 0, combatHits = 0;
  const options = {
    getHarvestTargets: () => [{ id: 'shore-rock' }],
    getCombatTargets: () => [{ id: 'wildkin' }],
    onHarvestImpact: () => { harvests += 1; },
    onCombatImpact: () => { combatHits += 1; },
    autoHarvestEnabled: true, canAttack: true,
  };
  tool.update(1 / 60, { x: 0, y: 0, z: 0 }, { mode: 'IDLE', speed: 0 }, options);
  assert.equal(tool.isSwinging, true);
  tool.update(1 / 60, { x: 0, y: 0, z: 0 }, { mode: 'SWIM', waterborne: true, speed: 0 },
    { ...options, attackRequested: true });
  assert.equal(tool.isSwinging, false);
  assert.equal(tool.toolGroup.visible, false);
  assert.deepEqual({ harvests, combatHits }, { harvests: 0, combatHits: 0 });

  const swimmingState = { mode: 'SWIM', traversalMode: null };
  const combat = createPlayerCombat({ playerMesh: player, getPlayerState: () => swimmingState });
  assert.equal(combat.canAttack(), false);
  assert.equal(combat.startAttack(), false);
  const hud = getCompanionAbilityPresentation({ isCamp: false, swimming: true,
    ability: { name: 'Tidal Ward', speciesId: 'tidefin', ready: true, activeRemaining: 0, activeDuration: 3 } });
  assert.equal(hud.visible, false);
});
