import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as THREE from "three";
import RAPIER from "../vendor/rapier.js";
import { createCameraCollisionProbe } from "../src/camera/cameraCollision.js";
import { createCameraFollow } from "../src/camera/cameraFollow.js";
import { CAMERA_CONFIG, createCamera } from "../src/game/createCamera.js";

await RAPIER.init();

function staticBox(world, translation, { sensor = false, kinematic = false } = {}) {
  let parent;
  if (kinematic) parent = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());
  const desc = RAPIER.ColliderDesc.cuboid(.5, 2, .2).setTranslation(translation.x, translation.y, translation.z);
  if (sensor) desc.setSensor(true);
  return world.createCollider(desc, parent);
}

function terrainPlane(world, y = 2) {
  const vertices = new Float32Array([-5, y, -5, 5, y, -5, 5, y, 5, -5, y, 5]);
  return world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, new Uint32Array([0, 1, 2, 0, 2, 3])));
}

describe("camera collision probe", () => {
  it("uses the vendored time_of_impact result while excluding sensors and kinematic companions", () => {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const sensor = staticBox(world, { x: 0, y: 1, z: 1 }, { sensor: true });
    const companion = staticBox(world, { x: 0, y: 1, z: 1.5 }, { kinematic: true });
    const wall = staticBox(world, { x: 0, y: 1, z: 3 });
    // Rapier's query pipeline is populated by the normal world step. The
    // production factory performs this once after static collider creation.
    world.step();
    const probe = createCameraCollisionProbe({ RAPIER, physicsWorld: { world, staticColliders: [sensor, companion, wall] }, cfg: { collisionRadius: .2, collisionMargin: .1, collisionNearDistance: 1 } });
    const distance = probe.resolveDistance({ focus: { x: 0, y: 1, z: 0 }, direction: { x: 0, y: 0, z: 1 }, requestedDistance: 6 });
    assert.ok(distance > 2.4 && distance < 2.6, `expected wall clearance, got ${distance}`);
    assert.ok(probe._debug().toi > 2.5 && probe._debug().toi < 2.7);
  });

  it("ignores disabled section colliders and reports a start-overlap without passing through it", () => {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const wall = staticBox(world, { x: 0, y: 1, z: .4 });
    world.step();
    const probe = createCameraCollisionProbe({ RAPIER, physicsWorld: { world, staticColliders: [wall] }, cfg: { collisionNearDistance: 1.35 } });
    const blocked = probe.resolveDistance({ focus: { x: 0, y: 1, z: 0 }, direction: { x: 0, y: 0, z: 1 }, requestedDistance: .6 });
    assert.ok(blocked >= 0 && blocked < .6);
    assert.equal(probe._debug().overlap, true);
    assert.equal(probe._debug().tightClearance, true);
    wall.setEnabled(false);
    world.step();
    assert.equal(probe.resolveDistance({ focus: { x: 0, y: 1, z: 0 }, direction: { x: 0, y: 0, z: 1 }, requestedDistance: 6 }), 6);
  });

  it("uses a conservative sphere for the low-pitch near plane on the widest supported landscape view", () => {
    const near = .1;
    const verticalHalfFov = 52 * Math.PI / 360;
    const widestLandscapeAspect = 844 / 390;
    const nearPlaneCorner = Math.hypot(
      Math.tan(verticalHalfFov) * near * widestLandscapeAspect,
      Math.tan(verticalHalfFov) * near,
    );
    assert.ok(.24 > nearPlaneCorner, `camera sphere .24 must cover near-plane corner ${nearPlaneCorner}`);
  });

  it("recovers a smoothing focus that enters a solid toward the clear current player focus", () => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const wall = staticBox(world, { x: 0, y: .9, z: 1 });
    world.step();
    const probe = createCameraCollisionProbe({ RAPIER, physicsWorld: { world, staticColliders: [wall] } });
    const target = new THREE.Group();
    const camera = createCamera(16 / 9);
    const follow = createCameraFollow(camera, target, { landscapeZoom: 1, followLerp: 5 }, CAMERA_CONFIG, { collisionProbe: probe });
    follow.snap();
    target.position.z = 2;
    follow.update(.1, 0, null);
    const debug = follow._debug();
    assert.equal(debug.focusRecovery, 'desired');
    assert.ok(Math.abs(debug.center[2] - 2) < 1e-9, 'the blocked interpolated focus is not retained');
    assert.equal(probe.isFocusClear({ x: debug.center[0], y: debug.center[1], z: debug.center[2] }), true);
  });

  it("sees registered runtime construction but drops it on lifecycle unregistration", () => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const cameraColliders = new Set();
    const probe = createCameraCollisionProbe({ RAPIER, physicsWorld: { world, staticColliders: [], cameraColliders } });
    const construction = staticBox(world, { x: 0, y: 1, z: 3 });
    cameraColliders.add(construction); world.step();
    assert.ok(probe.resolveDistance({ focus: { x: 0, y: 1, z: 0 }, direction: { x: 0, y: 0, z: 1 }, requestedDistance: 6 }) < 3);
    cameraColliders.delete(construction); world.removeCollider(construction, true); world.step();
    assert.equal(probe.resolveDistance({ focus: { x: 0, y: 1, z: 0 }, direction: { x: 0, y: 0, z: 1 }, requestedDistance: 6 }), 6);
  });

  it("resets a moving follow focus that crosses below a terrain trimesh to the clear player focus", () => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const terrain = terrainPlane(world, 2); world.step();
    const probe = createCameraCollisionProbe({ RAPIER, physicsWorld: { world, staticColliders: [terrain] } });
    const target = new THREE.Group(); target.position.y = .1; // initial focus y = 1
    const camera = createCamera(16 / 9);
    const follow = createCameraFollow(camera, target, { landscapeZoom: 1, followLerp: 5 }, CAMERA_CONFIG, { collisionProbe: probe });
    follow.snap();
    target.position.y = 2.5; // current player focus y = 3.4, clear above the step
    follow.update(.01, 0, null);
    const debug = follow._debug();
    assert.equal(debug.focusRecovery, 'desired');
    assert.ok(Math.abs(debug.center[1] - 3.4) < 1e-9, 'below-mesh smoothed focus is discarded');
    assert.ok(camera.position.y > 2, 'camera cannot remain below the crossed terrain surface');
  });

  it("reports an unresolvable player focus below terrain instead of calling it clear", () => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const terrain = terrainPlane(world, 2); world.step();
    const probe = createCameraCollisionProbe({ RAPIER, physicsWorld: { world, staticColliders: [terrain] }, getTerrainHeight: () => 2 });
    const desiredFocus = { x: 0, y: 1, z: 0 };
    assert.equal(probe.isFocusClear(desiredFocus), true, 'point overlap alone cannot classify terrain below-side');
    assert.equal(probe.isLocalFocusClear(desiredFocus), false);
    assert.equal(probe.recoverFocus({ focus: desiredFocus, desiredFocus }).status, 'blocked');
  });

  it("keeps a valid player focus under a low doorway lintel when terrain is clear", () => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const lintel = world.createCollider(RAPIER.ColliderDesc.cuboid(1, .1, 1).setTranslation(0, 1.55, 0));
    world.step();
    const probe = createCameraCollisionProbe({ RAPIER, physicsWorld: { world, staticColliders: [lintel] }, getTerrainHeight: () => 0 });
    const playerFocus = { x: 0, y: .9, z: 0 };
    assert.equal(probe.isLocalFocusClear(playerFocus), true);
    assert.equal(probe.recoverFocus({ focus: playerFocus, desiredFocus: playerFocus }).status, 'clear');
  });
});
