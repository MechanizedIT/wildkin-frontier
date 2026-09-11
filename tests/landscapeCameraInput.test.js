import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as THREE from "three";
import { CAMERA_CONFIG, createCamera } from "../src/game/createCamera.js";
import { createCameraFollow } from "../src/camera/cameraFollow.js";

describe("landscape camera orbit", () => {
  it("keeps the requested fixed pitch while following terrain height at every cardinal yaw", () => {
    const target = new THREE.Group();
    target.position.set(4, 2, -3);
    const camera = createCamera(16 / 9);
    const follow = createCameraFollow(camera, target, {}, CAMERA_CONFIG);
    const expectedPitch = Math.atan2(CAMERA_CONFIG.height-CAMERA_CONFIG.focusHeight, CAMERA_CONFIG.horizontalDistance);

    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      follow.orbitBy(yaw - follow.getYaw());
      follow.snap();
      const dx = camera.position.x - target.position.x;
      const dz = camera.position.z - target.position.z;
      assert.ok(Math.abs(Math.hypot(dx, dz) - CAMERA_CONFIG.horizontalDistance) < 1e-9);
      assert.ok(Math.abs(camera.position.y - target.position.y - CAMERA_CONFIG.height) < 1e-9);
      const direction=camera.getWorldDirection(new THREE.Vector3());
      assert.ok(Math.abs(Math.atan2(-direction.y, Math.hypot(direction.x,direction.z)) - expectedPitch) < 1e-9);
      const projected=target.position.clone().project(camera);
      assert.ok(projected.y<0, 'Explorer stays below the optical center');
    }
  });

  it("changes camera heading immediately without changing the player transform", () => {
    const target = new THREE.Group();
    target.position.set(1, .5, 2);
    const camera = createCamera(16 / 9);
    const follow = createCameraFollow(camera, target, {}, CAMERA_CONFIG);
    follow.snap();
    const before = target.position.clone();
    const beforeDirection = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
    follow.orbitBy(Math.PI / 2);
    follow.prepareForInput();
    const afterDirection = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
    assert.deepEqual(target.position.toArray(), before.toArray());
    assert.ok(beforeDirection.angleTo(afterDirection) > 1.4);
  });

  it("keeps distance and pitch exact during successive drag-sized yaw updates", () => {
    const target = new THREE.Group();
    const camera = createCamera(16 / 9);
    const follow = createCameraFollow(camera, target, {}, CAMERA_CONFIG);
    follow.snap();
    const expectedPitch = Math.atan2(CAMERA_CONFIG.height-CAMERA_CONFIG.focusHeight, CAMERA_CONFIG.horizontalDistance);
    for (let step = 0; step < 90; step++) {
      follow.orbitBy(.017);
      target.position.set(step * .01, .5 + Math.sin(step * .1) * .3, -step * .015);
      follow.update(1 / 60, 0, null);
      const center = follow._debug().center;
      const dx = camera.position.x - center[0], dy = camera.position.y - center[1], dz = camera.position.z - center[2];
      assert.ok(Math.abs(Math.hypot(dx, dz) - CAMERA_CONFIG.horizontalDistance) < 1e-9);
      assert.ok(Math.abs(Math.atan2(dy, Math.hypot(dx, dz)) - expectedPitch) < 1e-9);
    }
  });
});
