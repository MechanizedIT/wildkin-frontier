import * as THREE from "three";

export function createCameraFollow(camera, target, cfg, baseCameraCfg) {
  const horizontalDistance = cfg.horizontalDistance ?? baseCameraCfg.horizontalDistance ?? baseCameraCfg.distance;
  const height = cfg.offsetY ?? baseCameraCfg.height;
  const focusHeight = cfg.focusHeight ?? baseCameraCfg.focusHeight ?? 0;
  const verticalOffset = height - focusHeight;
  const smoothedCenter = new THREE.Vector3(target.position.x, target.position.y + focusHeight, target.position.z);
  const desiredCenter = new THREE.Vector3();
  let yaw = 0;

  function setDesiredCenter() {
    desiredCenter.set(target.position.x, target.position.y + focusHeight, target.position.z);
  }
  // Rotate a rigid offset around one smoothed follow center. Smoothing a camera
  // position around an orbit would cut across the circle and break fixed pitch.
  function applyCamera() {
    camera.position.set(
      smoothedCenter.x + Math.sin(yaw) * horizontalDistance,
      smoothedCenter.y + verticalOffset,
      smoothedCenter.z + Math.cos(yaw) * horizontalDistance,
    );
    camera.lookAt(smoothedCenter);
  }

  function update(dt, speed, moveDir) {
    setDesiredCenter();
    const centerLerp = 1 - Math.exp(-(cfg.followLerp ?? 5) * dt);
    smoothedCenter.lerp(desiredCenter, centerLerp);
    applyCamera();
  }

  function snap() {
    setDesiredCenter();
    smoothedCenter.copy(desiredCenter);
    applyCamera();
  }

  // Called before player physics. It makes camera-relative movement use the
  // exact yaw the player sees this frame, without jumping the follow center.
  function prepareForInput() {
    applyCamera();
  }
  function orbitBy(delta) { yaw += Number.isFinite(delta) ? delta : 0; }
  function getYaw() { return yaw; }

  return { update, snap, prepareForInput, orbitBy, getYaw, _debug: () => ({ yaw, horizontalDistance, height, center: smoothedCenter.toArray() }) };
}
