import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { createPhysicsWorld } from '../src/physics/createPhysicsWorld.js';
import { createCharacterPhysics } from '../src/physics/createCharacterPhysics.js';
import { createPlayerController } from '../src/player/playerController.js';
import { MOVEMENT_CONFIG } from '../src/game/config.js';

await RAPIER.init();

function slopeSurface(degrees, id = `slope-${degrees}`) {
  const rise = Math.tan(degrees * Math.PI / 180);
  // y rises toward +x; gravity's tangent therefore points toward -x.
  const vertices = new Float32Array([
    -20, -20 * rise, -10,  20, 20 * rise, -10,
    -20, -20 * rise,  10,  20, 20 * rise,  10,
  ]);
  return { id, sectionId: 'slope', traversalSurface: 'terrain', vertices, indices: new Uint32Array([0, 2, 1, 1, 2, 3]) };
}

function fixture(t, degrees) {
  const physics = createPhysicsWorld(RAPIER, { terrainSurfaces: [], groundPatches: [{ collisionEnabled: false }], obstacles: [], platforms: [], boundaries: [] });
  physics.updateTerrainSurfaces({ add: [slopeSurface(degrees)] });
  t.after(() => physics.world.free());
  const character = createCharacterPhysics(RAPIER, physics.world, { x: 0, y: 1.1, z: 0 }, { isTerrainCollider: physics.isTerrainColliderActive });
  return { physics, character };
}

test('50 degree terrain provides terrain-only slide support and slides downhill without input', t => {
  const { character } = fixture(t, 50);
  // Settle the capsule against the real triangle mesh first.
  for (let i = 0; i < 8; i += 1) character.move({ x: 0, y: -.12, z: 0 });
  const support = character.getTerrainSupport();
  assert.equal(support?.slidable, true, '50° terrain is in the slide band');
  const player = new THREE.Group();
  const camera = new THREE.PerspectiveCamera();
  camera.lookAt(0, 0, -1);
  const controller = createPlayerController(player, { getGroundHeight: () => 0, jumpTraversals: [], climbables: [] }, camera, MOVEMENT_CONFIG, character);
  controller.state.grounded = true; // approach from ordinary footing; KCC rejects the steep support this step.
  controller.update(1 / 60, { moveX: 0, moveY: 0, moveMagnitude: 0, jumpRequested: false, dodgeRequested: false });
  assert.equal(controller.state.mode, 'SLIDE');
  const startX = controller.state.pos.x;
  for (let i = 0; i < 90; i += 1) controller.update(1 / 60, { moveX: 0, moveY: 0, moveMagnitude: 0, jumpRequested: false, dodgeRequested: false });
  assert.equal(controller.state.mode, 'SLIDE', 'sustained contact remains a controlled slide');
  assert.ok(controller.state.pos.x < startX - 1, `slides downhill (${startX.toFixed(2)} -> ${controller.state.pos.x.toFixed(2)})`);
});

test('45/60 degree edges classify walk, slide, and fall exactly', t => {
  for (const [degrees, expected] of [[45, 'walkable'], [45.01, 'slidable'], [60, 'slidable'], [60.01, 'none'], [65, 'none']]) {
    const { character } = fixture(t, degrees);
    for (let i = 0; i < 8; i += 1) character.move({ x: 0, y: -.12, z: 0 });
    const support = character.getTerrainSupport();
    if (expected === 'walkable') assert.equal(support?.walkable, true, '45° remains walkable');
    else if (expected === 'slidable') assert.equal(support?.slidable, true, '60° remains slidable');
    else assert.equal(support, null, 'over 60° is not a terrain foothold');
  }
});

test('65 degree terrain transitions from ordinary movement into FALL and never claims slide support', t => {
  const { character } = fixture(t, 65);
  const player = new THREE.Group();
  const camera = new THREE.PerspectiveCamera();
  camera.lookAt(0, 0, -1);
  const controller = createPlayerController(player, { getGroundHeight: () => 0, jumpTraversals: [], climbables: [] }, camera, MOVEMENT_CONFIG, character);
  controller.state.grounded = true;
  controller.state.mode = 'IDLE';
  const idle = { moveX: 0, moveY: 0, moveMagnitude: 0, jumpRequested: false, dodgeRequested: false };
  controller.update(1 / 60, idle);
  assert.equal(controller.state.mode, 'FALL', 'steeper terrain leaves ordinary movement through the existing FALL path');
  assert.equal(character.getTerrainSupport(), null, 'no eligible terrain contact exists');
  for (let i = 0; i < 240 && controller.state.mode === 'FALL'; i += 1) controller.update(1 / 60, idle);
  assert.equal(controller.state.mode, 'IDLE', 'the existing FALL landing path remains responsible for the eventual landing');
  assert.ok(controller.state.pos.y < -28, 'the fall lands on the existing safety floor instead of treating the steep face as ground');
});

test('a real FALL landing on 50 degree terrain records once, slides, then falls after terrain contact ends', t => {
  const { character } = fixture(t, 50);
  character.setPosition({ x: 0, y: 4, z: 0 });
  const player = new THREE.Group();
  const camera = new THREE.PerspectiveCamera();
  camera.lookAt(0, 0, -1);
  const controller = createPlayerController(player, { getGroundHeight: () => 0, jumpTraversals: [], climbables: [] }, camera, MOVEMENT_CONFIG, character);
  controller.state.grounded = false;
  controller.state.mode = 'FALL';
  const idle = { moveX: 0, moveY: 0, moveMagnitude: 0, jumpRequested: false, dodgeRequested: false };
  for (let i = 0; i < 180 && controller.state.mode !== 'SLIDE'; i += 1) controller.update(1 / 60, idle);
  assert.equal(controller.state.mode, 'SLIDE', 'descending physical contact enters controlled terrain slide');
  assert.ok(controller.consumeLandingImpact(), 'the falling approach records one landing impact before sliding');
  assert.equal(controller.consumeLandingImpact(), null, 'the same terrain contact cannot emit a second impact');
  character.setPosition({ x: -25, y: -25, z: 0 });
  controller.syncPosFromPhysics();
  controller.update(1 / 60, idle);
  assert.equal(controller.state.mode, 'FALL', 'leaving the terrain surface returns to the existing fall path');
});

test('slide support cannot start a fresh ordinary jump', t => {
  const { character } = fixture(t, 50);
  for (let i = 0; i < 8; i += 1) character.move({ x: 0, y: -.12, z: 0 });
  const player = new THREE.Group();
  const camera = new THREE.PerspectiveCamera();
  camera.lookAt(0, 0, -1);
  const controller = createPlayerController(player, { getGroundHeight: () => 0, jumpTraversals: [], climbables: [] }, camera, MOVEMENT_CONFIG, character);
  controller.state.mode = 'SLIDE';
  controller.state.grounded = true;
  controller.state.slideVelocity = { x: 0, z: 0 };
  controller.update(1 / 60, { moveX: 0, moveY: 0, moveMagnitude: 0, jumpRequested: true, dodgeRequested: false });
  assert.equal(controller.state.mode, 'SLIDE', 'a slide contact is not treated as a jump foothold');
});

test('reset and jump-pad launch clear slide state', t => {
  const { character } = fixture(t, 50);
  const player = new THREE.Group();
  const camera = new THREE.PerspectiveCamera();
  camera.lookAt(0, 0, -1);
  const controller = createPlayerController(player, { getGroundHeight: () => 0, jumpTraversals: [], climbables: [] }, camera, MOVEMENT_CONFIG, character);
  controller.state.mode = 'SLIDE';
  controller.state.grounded = true;
  controller.state.slideVelocity = { x: -2, z: .4 };
  controller.resetJumpState();
  assert.equal(controller.state.mode, 'IDLE', 'reset exits a slide state');
  assert.equal(controller.state.slideVelocity, null, 'reset clears retained downhill momentum');
  controller.state.mode = 'SLIDE';
  controller.state.slideVelocity = { x: -2, z: .4 };
  assert.equal(controller.launchFromJumpPad({ verticalLaunch: 4 }), true);
  assert.equal(controller.state.mode, 'JUMP', 'authored jump-pad launch keeps its active jump authority');
  assert.equal(controller.state.slideVelocity, null, 'jump-pad launch cannot carry slide state into the arc');
});

test('scenery colliders are never tagged as slide terrain', t => {
  const physics = createPhysicsWorld(RAPIER, {
    terrainSurfaces: [], groundPatches: [{ collisionEnabled: false }], platforms: [], boundaries: [],
    obstacles: [{ id: 'tree-trunk', x: 0, z: 0, w: 2, h: 2, height: 4, baseY: 0 }],
  });
  t.after(() => physics.world.free());
  assert.equal(physics.terrainColliders.size, 0, 'tree/box scenery stays outside the terrain-only tag');
});
