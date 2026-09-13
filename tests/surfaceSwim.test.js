import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '../vendor/rapier.js';
import { MOVEMENT_CONFIG } from '../src/game/config.js';
import { createCharacterPhysics } from '../src/physics/createCharacterPhysics.js';
import { createPlayerController } from '../src/player/playerController.js';
import {
  SURFACE_SWIM_CONFIG,
  isSurfaceSwimming,
  resolveSurfaceSwimVelocity,
  surfaceWaterMode,
} from '../src/movement/surfaceSwim.js';

await RAPIER.init();

const DT = 1 / 60;
const idle = Object.freeze({ moveX: 0, moveY: 0, moveMagnitude: 0, jumpRequested: false, dodgeRequested: false });
const forward = Object.freeze({ ...idle, moveY: -1, moveMagnitude: 1 });
const backward = Object.freeze({ ...idle, moveY: 1, moveMagnitude: 1 });

function bedY(z) { return -.8 * Math.max(0, Math.min(1, (z + 1) / 3.5)); }
function waterAt(position) {
  if (!(position?.z >= -1)) return null;
  const bed = bedY(position.z);
  return { surfaceY: .1, bedY: bed, depth: .1 - bed, offshoreDistance: position.z + 1,
    inlandDirection: { x: 0, z: -1 } };
}

function fixture(t, initial = { x: 0, y: .545, z: -2 }) {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  // A real sloped shelf ends at z=2.5. Beyond it swimming has no hidden floor.
  const vertices = new Float32Array([
    -10, 0, -5, 10, 0, -5, -10, 0, -1, 10, 0, -1,
    -10, -.8, 2.5, 10, -.8, 2.5,
  ]);
  const indices = new Uint32Array([0, 2, 1, 1, 2, 3, 2, 4, 3, 3, 4, 5]);
  world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices).setFriction(.6));
  world.step();
  const physics = createCharacterPhysics(RAPIER, world, initial);
  const camera = new THREE.PerspectiveCamera(); camera.position.set(0, 4, -5); camera.lookAt(0, 0, 5); camera.updateMatrixWorld();
  const playground = { getGroundHeight: (_x, z) => bedY(z), jumpTraversals: [], climbables: [] };
  const controller = createPlayerController(new THREE.Group(), playground, camera, MOVEMENT_CONFIG, physics, { getSurfaceWater: waterAt });
  controller.syncPosFromPhysics();
  t.after(() => world.free());
  return { controller, physics };
}

test('pure water classification waits for contact and the offshore current wins gradually', () => {
  const water = { surfaceY: 0, bedY: -2, depth: 2, offshoreDistance: 10, inlandDirection: { x: 0, z: -1 } };
  assert.equal(surfaceWaterMode({ water, positionY: 3, grounded: false }), 'DRY', 'a body above water remains a real fall');
  assert.equal(surfaceWaterMode({ water, positionY: .5, grounded: false }), 'SWIM');
  assert.equal(isSurfaceSwimming({ mode: 'SWIM' }), true);
  assert.equal(isSurfaceSwimming({ mode: 'WADE', waterborne: true }), false, 'grounded wading keeps ordinary touch and keyboard actions');
  assert.equal(isSurfaceSwimming({ mode: 'FALL', waterborne: false }), false);
  const before = resolveSurfaceSwimVelocity({ water, inputDirection: { x: 0, z: 1 }, inputMagnitude: 1, dt: 1 });
  const band = resolveSurfaceSwimVelocity({ water: { ...water, offshoreDistance: 34 }, inputDirection: { x: 0, z: 1 }, inputMagnitude: 1, dt: 1 });
  const outside = resolveSurfaceSwimVelocity({ water: { ...water, offshoreDistance: 45 }, inputDirection: { x: 0, z: 1 }, inputMagnitude: 1, dt: 1 });
  assert.equal(before.currentStrength, 0);
  assert.ok(band.currentStrength > 0 && band.currentStrength < 1 && band.z < before.z);
  assert.equal(outside.currentStrength, 1);
  assert.ok(outside.z < 0, 'the full visible current carries the swimmer landward');
});

test('current is a gradual velocity field independent of fixed-step frequency', () => {
  const water = { surfaceY: 0, depth: 5, offshoreDistance: 28, inlandDirection: { x: 0, z: -1 } };
  function settled(dt) {
    let velocity = { x: 0, z: 0 };
    for (let t = 0; t < 3; t += dt) velocity = resolveSurfaceSwimVelocity({ water, inputDirection: { x: 0, z: 1 }, inputMagnitude: 1, velocity, dt });
    return velocity;
  }
  const slow = settled(1 / 30), fast = settled(1 / 60);
  assert.ok(fast.z > 1, 'the near edge slows outward swimming without becoming a wall');
  assert.ok(Math.abs(slow.z - fast.z) < .001, 'current must not accumulate once per simulation tick');
});

test('real KCC walks diagonally through wade into floorless surface swim and exits onto support', t => {
  const { controller } = fixture(t);
  let sawWade = false, sawSwim = false;
  const diagonal = { ...forward, moveX: .22 };
  for (let frame = 0; frame < 600 && !sawSwim; frame++) {
    controller.update(DT, diagonal);
    sawWade ||= controller.state.mode === 'WADE';
    sawSwim ||= controller.state.mode === 'SWIM';
  }
  assert.equal(sawWade, true);
  assert.equal(sawSwim, true);
  for (let frame = 0; frame < 120; frame++) controller.update(DT, diagonal);
  assert.equal(controller.state.grounded, false);
  assert.ok(controller.state.pos.z > 2.7);
  assert.ok(Math.abs(controller.state.pos.y - (.1 + SURFACE_SWIM_CONFIG.floatCenterOffset)) < .12,
    'buoyancy holds the upright capsule at the surface over omitted support');
  const lastDryPosition = controller.getState().lastDryPosition;
  assert.ok(lastDryPosition.z < -1);
  assert.ok(Math.abs(lastDryPosition.y) < .04, 'the safe dry anchor is a feet position suitable for persistence');

  let exited = false;
  for (let frame = 0; frame < 900 && !exited; frame++) {
    controller.update(DT, backward);
    exited = controller.state.mode === 'WADE' && controller.state.grounded;
  }
  assert.equal(exited, true, 'the same sloped shelf supports automatic swim-to-wade exit');
  for (let frame = 0; frame < 240 && controller.state.waterborne; frame++) controller.update(DT, backward);
  assert.equal(controller.state.waterborne, false);
  assert.equal(controller.state.grounded, true);
});

test('airborne water entry cancels the pending fall impact only at surface contact', t => {
  const { controller } = fixture(t, { x: 0, y: 4, z: 1.8 });
  controller.state.mode = 'FALL'; controller.state.grounded = false;
  controller.state.fallHVel = { x: 0, z: 0 }; controller.state.airCap = MOVEMENT_CONFIG.walkSpeed;
  controller.update(DT, idle);
  assert.equal(controller.state.mode, 'FALL');
  assert.ok(controller.state.pos.y < 4);
  for (let frame = 0; frame < 240 && controller.state.mode !== 'SWIM'; frame++) controller.update(DT, idle);
  assert.equal(controller.state.mode, 'SWIM');
  assert.equal(controller.consumeLandingImpact(), null, 'water contact cannot become delayed ground damage');
});

test('swimming ignores jump/dodge, bounds knockback, pauses cleanly and reset removes water mode', t => {
  const { controller, physics } = fixture(t, { x: 0, y: .24, z: 2 });
  controller.state.grounded = false;
  controller.update(DT, idle);
  assert.equal(controller.state.mode, 'SWIM');
  const beforePause = controller.state.pos.clone();
  controller.update(0, { ...forward, jumpRequested: true, dodgeRequested: true });
  assert.ok(controller.state.pos.distanceTo(beforePause) < 1e-9);
  controller.update(DT, { ...forward, jumpRequested: true, dodgeRequested: true },
    { knockback: { remaining: 1, dir: { x: 1, z: 0 }, speed: 100 } });
  assert.equal(controller.state.mode, 'SWIM');
  assert.equal(controller.state.jumpData, null);
  assert.equal(controller.state.dodgeTime, 0);
  assert.ok(controller.state.pos.x - beforePause.x < SURFACE_SWIM_CONFIG.maxKnockbackSpeed * DT + .01);
  for (let frame = 0; frame < 120; frame++) controller.update(DT, idle,
    { knockback: { remaining: 1, dir: { x: 1, z: 0 }, speed: 100 } });
  assert.ok(controller.state.speed <= SURFACE_SWIM_CONFIG.maxCombinedSpeed + 1e-6,
    'sustained horizontal knockback cannot accumulate without bound');
  assert.equal(controller.launchFromJumpPad({ verticalLaunch: 8 }), false);
  controller.resetJumpState();
  assert.equal(controller.state.mode, 'IDLE');
  assert.equal(controller.state.waterborne, false);
  physics.setPosition({ x: 0, y: .545, z: -2 }); controller.syncPosFromPhysics(); controller.state.grounded = true;
  controller.update(DT, idle);
  assert.equal(controller.state.mode, 'IDLE');
});
