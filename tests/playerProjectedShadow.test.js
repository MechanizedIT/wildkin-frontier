import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { getProjectedShadowStyle } from "../src/presentation/playerProjectedShadow.js";
import { createJumpPadSystem } from "../src/world/jumpPadSystem.js";
import { createPlayerController, resolveJumpPadLaunchVelocity } from "../src/player/playerController.js";
import { MOVEMENT_CONFIG } from "../src/game/config.js";

test("projected shadow is tight on the support and fades while airborne", () => {
  const grounded = getProjectedShadowStyle({ playerCenterY: 0.52, supportY: 0, capsuleTotalHeight: 1.04 });
  const airborne = getProjectedShadowStyle({ playerCenterY: 3.52, supportY: 0, capsuleTotalHeight: 1.04 });
  assert.equal(grounded.visible, true);
  assert.equal(grounded.gap, 0);
  assert.ok(airborne.opacity < grounded.opacity);
  assert.ok(airborne.scale > grounded.scale);
  assert.equal(getProjectedShadowStyle({ playerCenterY: 8, supportY: 0 }).visible, false);
});

test("authored jump-pad thrust launches a stationary player in its authored direction", () => {
  const launches = [];
  const pad = { id: "pad", pos: { x: 2, y: 0, z: 3 }, rotY: Math.PI / 2, verticalLaunch: 6, horizontalLaunch: 5, triggerRadius: 1 };
  const registry = { getJumpPadsForSection: () => [pad] };
  const system = createJumpPadSystem(registry, { getActiveSectionId: () => "section", now: () => 0, launchPlayer: (launch) => { launches.push(launch); return true; } });
  system.update(pad.pos);
  assert.equal(launches.length, 1);
  assert.equal(launches[0].horizontalLaunch, 5);
  assert.ok(Math.abs(launches[0].direction.x - 1) < 1e-9);
  assert.ok(Math.abs(launches[0].direction.z) < 1e-9);
  assert.deepEqual(resolveJumpPadLaunchVelocity({ x: 0, z: 0 }, 6, { x: 5, z: 0 }), { x: 5, y: 6, z: 0 });
});

test("unconfigured pads preserve normal movement velocity", () => {
  assert.deepEqual(resolveJumpPadLaunchVelocity({ x: 3, z: -4 }, 6), { x: 3, y: 6, z: -4 });
});

test("player controller applies authored pad thrust from rest and retains ordinary momentum otherwise", () => {
  const camera = new THREE.PerspectiveCamera();
  const playground = { getGroundHeight: () => 0, jumpTraversals: [], climbables: [] };
  const controller = createPlayerController(new THREE.Group(), playground, camera, MOVEMENT_CONFIG, null);
  assert.equal(controller.setMoveSpeedMultiplier(1.08), 1.08);
  assert.equal(controller.setMoveSpeedMultiplier(9), 1.5);
  assert.equal(controller.setMoveSpeedMultiplier(0), 0.5);
  assert.equal(controller.launchFromJumpPad({ verticalLaunch: 6, horizontalLaunch: 5, direction: { x: 0, z: -1 } }), true);
  assert.deepEqual(controller.state.jumpData.hVel, { x: 0, z: -5 });
  assert.equal(controller.state.jumpData.lockHorizontal, true);
  controller.state.mode = "IDLE";
  controller.state.vel.set(3, 0, -4);
  assert.equal(controller.launchFromJumpPad({ verticalLaunch: 6 }), true);
  assert.deepEqual(controller.state.jumpData.hVel, { x: 3, z: -4 });
  assert.equal(controller.state.jumpData.lockHorizontal, false);
});
