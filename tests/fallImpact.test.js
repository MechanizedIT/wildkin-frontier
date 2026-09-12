import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { MOVEMENT_CONFIG } from "../src/game/config.js";
import { calculateFallImpact, FALL_IMPACT_CONFIG } from "../src/player/fallImpact.js";
import { createPlayerController } from "../src/player/playerController.js";

const idle = { moveX: 0, moveY: 0, moveMagnitude: 0, jumpRequested: false, dodgeRequested: false };

function createPhysics({ positionY = 0, groundY = 0 } = {}) {
  const position = { x: 0, y: positionY, z: 0 };
  let floor = groundY;
  return {
    cfg: { capsuleTotalHeight: 1.04 },
    getPosition: () => ({ ...position }),
    setGroundY(value) { floor = value; },
    setPosition(next) { Object.assign(position, next); },
    move(desired) {
      const nextY = position.y + desired.y;
      const lands = desired.y <= 0 && nextY <= floor;
      const correctedY = lands ? floor - position.y : desired.y;
      position.x += desired.x;
      position.y += correctedY;
      position.z += desired.z;
      return { corrected: { x: desired.x, y: correctedY, z: desired.z }, grounded: lands };
    },
  };
}

function createController(options) {
  const physics = createPhysics(options);
  const camera = new THREE.PerspectiveCamera();
  camera.lookAt(0, 0, -1);
  const playground = { getGroundHeight: () => 0, jumpTraversals: [], climbables: [] };
  return { physics, controller: createPlayerController(new THREE.Group(), playground, camera, MOVEMENT_CONFIG, physics) };
}

function runUntilGrounded(controller, limit = 360) {
  for (let i = 0; i < limit && (controller.state.mode === "JUMP" || controller.state.mode === "FALL"); i++) {
    controller.update(1 / 60, idle);
  }
  assert.equal(controller.state.grounded, true, "the simulated ballistic arc lands");
}

test("fall impact rule keeps ordinary height safe and scales larger drops", () => {
  assert.equal(calculateFallImpact(2.4, 0), null);
  assert.deepEqual(calculateFallImpact(2.8, 0), { damage: 1, dropMeters: 2.8, peakFeetY: 2.8, landingFeetY: 0 });
  assert.equal(calculateFallImpact(4.3, 0).damage, 2);
  assert.equal(calculateFallImpact(100, 0).damage, FALL_IMPACT_CONFIG.maxDamage);
});

test("an ordinary jump and a small stepped drop produce no harmful landing", () => {
  const ordinary = createController().controller;
  ordinary.update(1 / 60, { ...idle, jumpRequested: true });
  runUntilGrounded(ordinary);
  assert.equal(ordinary.consumeLandingImpact(), null, "the 1.4m ordinary apex stays safe");

  const stepped = createController({ positionY: 1.5 }).controller;
  stepped.state.mode = "FALL";
  stepped.state.grounded = false;
  runUntilGrounded(stepped);
  assert.equal(stepped.consumeLandingImpact(), null, "a small terrain step stays safe");
});

test("jumping from a high ledge retains the apex and produces one landing receipt", () => {
  const { controller, physics } = createController({ positionY: 10, groundY: 10 });
  controller.update(1 / 60, { ...idle, jumpRequested: true });
  physics.setGroundY(0);
  for (let i = 0; i < 600 && !(controller.state.pos.y === 0 && controller.state.grounded); i++) {
    controller.update(1 / 60, idle);
  }
  assert.equal(controller.state.pos.y, 0, "the real ground contact occurs after the jump timeout fallback");

  const impact = controller.consumeLandingImpact();
  assert.ok(impact.dropMeters > 11, "drop includes the jump apex above the ledge");
  assert.equal(impact.damage, FALL_IMPACT_CONFIG.maxDamage);
  assert.equal(controller.consumeLandingImpact(), null, "the same landing cannot be consumed twice");
});

test("a direct harmful fall produces one receipt", () => {
  const { controller } = createController({ positionY: 3 });
  controller.state.mode = "FALL";
  controller.state.grounded = false;
  runUntilGrounded(controller);
  assert.equal(controller.consumeLandingImpact().damage, 1);
  assert.equal(controller.consumeLandingImpact(), null);
});

test("sustained knockback off a ledge tracks the full fall and lands once", () => {
  const { controller, physics } = createController({ positionY: 4, groundY: 4 });
  physics.setGroundY(0);
  const knockback = { knockback: { remaining: 1, dir: { x: 1, z: 0 }, speed: 2 } };

  controller.update(1 / 60, idle, knockback);
  assert.equal(controller.state.mode, "FALL", "losing support during the hit begins a real fall");
  for (let i = 0; i < 240 && !controller.state.grounded; i++) controller.update(1 / 60, idle, knockback);

  assert.equal(controller.state.pos.y, 0);
  assert.equal(controller.state.mode, "IDLE");
  assert.equal(controller.consumeLandingImpact()?.damage, 1);
  controller.update(1 / 60, idle, knockback);
  assert.equal(controller.consumeLandingImpact(), null, "continued knockback cannot duplicate the landing");
});

test("knockback landing during an existing jump preserves its airborne peak", () => {
  const { controller, physics } = createController({ positionY: 8, groundY: 8 });
  controller.update(1 / 60, { ...idle, jumpRequested: true });
  physics.setGroundY(0);
  const knockback = { knockback: { remaining: 1, dir: { x: 0, z: 1 }, speed: 1 } };
  for (let i = 0; i < 360 && !controller.state.grounded; i++) controller.update(1 / 60, idle, knockback);

  assert.equal(controller.state.pos.y, 0);
  assert.equal(controller.state.mode, "IDLE");
  assert.ok(controller.consumeLandingImpact().dropMeters > 8, "the hit does not restart tracking below the jump apex");
  controller.update(1 / 60, idle, knockback);
  assert.equal(controller.consumeLandingImpact(), null);
});

test("resetting an in-progress fall prevents a phantom impact after teleport", () => {
  const { controller, physics } = createController({ positionY: 5 });
  controller.state.mode = "FALL";
  controller.state.grounded = false;
  controller.update(1 / 60, idle);
  controller.resetJumpState();
  physics.setPosition({ x: 0, y: 0, z: 0 });
  controller.syncPosFromPhysics();
  controller.state.grounded = true;
  controller.update(1 / 60, idle);
  assert.equal(controller.consumeLandingImpact(), null);
});
