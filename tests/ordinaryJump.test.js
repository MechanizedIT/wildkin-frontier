import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { MOVEMENT_CONFIG } from "../src/game/config.js";
import { createPlayerController } from "../src/player/playerController.js";

function createMockCharacterPhysics({ ceilingY = Infinity } = {}) {
  const position = { x: 0, y: 0, z: 0 };
  let forceGroundNextMove = false;
  return {
    cfg: { capsuleTotalHeight: 1.04 },
    getPosition: () => ({ ...position }),
    setPosition(next) {
      position.x = next.x;
      position.y = next.y;
      position.z = next.z;
    },
    landNextMove() { forceGroundNextMove = true; },
    move(desired) {
      let dy = desired.y;
      let nextY = position.y + dy;
      if (nextY > ceilingY) {
        dy = ceilingY - position.y;
        nextY = ceilingY;
      }
      if (forceGroundNextMove || nextY <= 0) {
        dy = -position.y;
        nextY = 0;
        forceGroundNextMove = false;
      }
      position.x += desired.x;
      position.y = nextY;
      position.z += desired.z;
      return { corrected: { x: desired.x, y: dy, z: desired.z }, grounded: nextY === 0 && desired.y <= 0 || nextY === 0 && forceGroundNextMove === false && dy !== desired.y };
    },
  };
}

function createController(physics = createMockCharacterPhysics()) {
  const camera = new THREE.PerspectiveCamera();
  camera.lookAt(0, 0, -1);
  const playground = { getGroundHeight: () => 0, jumpTraversals: [], climbables: [] };
  return { controller: createPlayerController(new THREE.Group(), playground, camera, MOVEMENT_CONFIG, physics), physics };
}

const idle = { moveX: 0, moveY: 0, moveMagnitude: 0, movementBand: "idle", jumpRequested: false, dodgeRequested: false, attackRequested: false, attackHeld: false };

test("ordinary jump consumes one grounded edge and does not auto-hop while held", () => {
  const { controller, physics } = createController();
  controller.update(1 / 60, { ...idle, jumpRequested: true });
  assert.equal(controller.state.mode, "JUMP");
  assert.equal(controller.state.jumpData.source, "ordinary");
  assert.ok(controller.state.pos.y > 0, "ordinary jump leaves the ground");

  physics.landNextMove();
  controller.update(1 / 60, { ...idle, jumpRequested: true });
  assert.equal(controller.state.mode, "IDLE", "the first jump may land while the button remains held");
  controller.update(1 / 60, { ...idle, jumpRequested: true });
  assert.equal(controller.state.mode, "IDLE", "a held request does not produce a second jump");
});

test("ordinary jump accepts coyote and buffered landing requests", () => {
  const coyote = createController().controller;
  coyote.state.mode = "FALL";
  coyote.state.grounded = false;
  coyote.state.coyoteRemaining = MOVEMENT_CONFIG.jumpCoyoteWindow;
  coyote.update(1 / 60, { ...idle, jumpRequested: true });
  assert.equal(coyote.state.mode, "JUMP", "a fresh edge during coyote time jumps");

  const { controller: buffered, physics: bufferedPhysics } = createController();
  bufferedPhysics.setPosition({ x: 0, y: 1, z: 0 });
  buffered.syncPosFromPhysics();
  buffered.state.mode = "FALL";
  buffered.state.grounded = false;
  buffered.update(1 / 60, { ...idle, jumpRequested: true });
  assert.equal(buffered.state.mode, "FALL", "air input remains buffered until a landing is available");
  buffered.state.mode = "IDLE";
  buffered.state.grounded = true;
  buffered.update(1 / 60, idle);
  assert.equal(buffered.state.mode, "JUMP", "a recent input jumps on the first grounded step");
});

test("ordinary jumps respect a ceiling, reject air jumps, and reset cleanly", () => {
  const { controller } = createController(createMockCharacterPhysics({ ceilingY: 0 }));
  controller.update(1 / 60, { ...idle, jumpRequested: true });
  assert.equal(controller.state.verticalVelocity, 0, "Rapier ceiling correction stops upward velocity");

  const airborne = createController().controller;
  airborne.update(1 / 60, { ...idle, jumpRequested: true });
  airborne.update(1 / 60, idle);
  const timeBeforeSecondPress = airborne.state.jumpData.time;
  airborne.update(1 / 60, { ...idle, jumpRequested: true });
  assert.equal(airborne.state.mode, "JUMP");
  assert.ok(airborne.state.jumpData.time > timeBeforeSecondPress, "an air press continues the existing jump instead of restarting it");

  airborne.cancelPendingJump();
  assert.equal(airborne.state.jumpBufferRemaining, 0);
  airborne.resetJumpState();
  assert.equal(airborne.state.mode, "IDLE");
  assert.equal(airborne.state.jumpData, null);
  assert.equal(airborne.state.verticalVelocity, 0);
});
