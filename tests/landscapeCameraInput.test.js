import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as THREE from "three";
import { CAMERA_CONFIG, createCamera } from "../src/game/createCamera.js";
import { createCameraFollow } from "../src/camera/cameraFollow.js";

describe("landscape camera orbit", () => {
  it('zooms within bounds without changing pitch, heading or the player and retains zoom across resize',()=>{
    const target=new THREE.Group(),camera=createCamera(16/9);
    const follow=createCameraFollow(camera,target,{landscapeZoom:.85,minZoom:.72,maxZoom:1.3},CAMERA_CONFIG);
    follow.orbitBy(.7);follow.snap();
    const direction=camera.getWorldDirection(new THREE.Vector3()),before=target.matrix.clone();
    follow.zoomByFactor(.5);follow.prepareForInput();
    assert.equal(follow.getZoom(),.72);
    let center=new THREE.Vector3().fromArray(follow._debug().center);
    assert.ok(Math.abs(camera.position.distanceTo(center)-CAMERA_CONFIG.distance*.85*.72)<1e-8);
    assert.ok(camera.getWorldDirection(new THREE.Vector3()).distanceTo(direction)<1e-8);
    follow.zoomByFactor(10);follow.snap();assert.equal(follow.getZoom(),1.3);
    follow.zoomByFactor(NaN);follow.setZoom(Infinity);assert.equal(follow.getZoom(),1.3);
    camera.aspect=9/16;follow.prepareForInput();
    assert.ok(Math.abs(camera.position.distanceTo(center)-CAMERA_CONFIG.distance*1.3)<1e-8);
    assert.equal(follow.getYaw(),.7);assert.deepEqual(target.matrix.elements,before.elements);
  });
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

  it("clamps vertical orbit while leaving yaw and the player transform independent", () => {
    const target = new THREE.Group();
    const camera = createCamera(16 / 9);
    const follow = createCameraFollow(camera, target, { pitch: .5, minPitch: .35, maxPitch: .8 }, CAMERA_CONFIG);
    const before = target.matrix.clone();
    follow.orbitBy(.4, 10); follow.snap();
    assert.equal(follow.getYaw(), .4);
    assert.equal(follow.getPitch(), .8);
    assert.deepEqual(target.matrix.elements, before.elements);
    const highPitchMovementBasis = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
    follow.orbitBy(0, -10); follow.prepareForInput();
    assert.equal(follow.getPitch(), .35);
    const lowPitchMovementBasis = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
    assert.ok(highPitchMovementBasis.distanceTo(lowPitchMovementBasis) < 1e-9, "pitch cannot change yaw-relative movement basis");
  });

  it("keeps requested zoom separate from a temporary collision bound and recovers smoothly", () => {
    const target = new THREE.Group();
    const camera = createCamera(16 / 9);
    let safeDistance = 2;
    const probe = { resolveDistance: ({ requestedDistance }) => Math.min(safeDistance, requestedDistance) };
    const follow = createCameraFollow(camera, target, { landscapeZoom: 1, collisionRecoveryLerp: 4 }, CAMERA_CONFIG, { collisionProbe: probe });
    follow.snap();
    const blocked = follow._debug();
    assert.equal(follow.getZoom(), 1);
    assert.equal(blocked.effectiveDistance, 2);
    assert.ok(blocked.requestedDistance > blocked.effectiveDistance);
    safeDistance = CAMERA_CONFIG.distance;
    follow.update(.1, 0, null);
    const recovering = follow._debug();
    assert.equal(follow.getZoom(), 1);
    assert.ok(recovering.effectiveDistance > 2 && recovering.effectiveDistance < recovering.requestedDistance);
    follow.zoomByFactor(.5); follow.prepareForInput();
    assert.equal(follow.getZoom(), .72);
    assert.ok(follow._debug().effectiveDistance <= follow._debug().requestedDistance);
  });

  it("retains yaw-relative movement orientation when collision retracts camera to focus", () => {
    const target = new THREE.Group();
    const camera = createCamera(16 / 9);
    const probe = { resolveDistance: () => 0 };
    const follow = createCameraFollow(camera, target, { landscapeZoom: 1, pitch: .7 }, CAMERA_CONFIG, { collisionProbe: probe });
    follow.orbitBy(.65); follow.snap();
    assert.equal(follow._debug().effectiveDistance, 0);
    const direction = camera.getWorldDirection(new THREE.Vector3());
    const expected = new THREE.Vector3(-Math.sin(.65), 0, -Math.cos(.65)).normalize();
    direction.y = 0; direction.normalize();
    assert.ok(direction.distanceTo(expected) < 1e-9, "zero-distance camera preserves yaw movement basis");
    assert.ok(Number.isFinite(camera.quaternion.x) && Number.isFinite(camera.quaternion.y));
  });
});
