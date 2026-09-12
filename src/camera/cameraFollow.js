import * as THREE from "three";

export function createCameraFollow(camera, target, cfg, baseCameraCfg) {
  const horizontalDistance = cfg.horizontalDistance ?? baseCameraCfg.horizontalDistance ?? baseCameraCfg.distance;
  const height = cfg.offsetY ?? baseCameraCfg.height;
  const focusHeight = cfg.focusHeight ?? baseCameraCfg.focusHeight ?? 0;
  const verticalOffset = height - focusHeight;
  const smoothedCenter = new THREE.Vector3(target.position.x, target.position.y + focusHeight, target.position.z);
  const desiredCenter = new THREE.Vector3();
  let yaw = 0;
  let zoom = 1;
  const minZoom = cfg.minZoom ?? .72;
  const maxZoom = cfg.maxZoom ?? 1.3;

  function setDesiredCenter() {
    desiredCenter.set(target.position.x, target.position.y + focusHeight, target.position.z);
  }
  // Rotate a rigid offset around one smoothed follow center. Smoothing a camera
  // position around an orbit would cut across the circle and break fixed pitch.
  function applyCamera() {
    const distanceScale = zoom * (camera.aspect > 1 ? (cfg.landscapeZoom ?? 1) : 1);
    camera.position.set(
      smoothedCenter.x + Math.sin(yaw) * horizontalDistance * distanceScale,
      smoothedCenter.y + verticalOffset * distanceScale,
      smoothedCenter.z + Math.cos(yaw) * horizontalDistance * distanceScale,
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
  function setZoom(value) { if (Number.isFinite(value)) zoom = Math.max(minZoom, Math.min(maxZoom, value)); }
  function zoomByFactor(factor) { if (Number.isFinite(factor) && factor > 0) setZoom(zoom * factor); }
  function getZoom() { return zoom; }

  return { update, snap, prepareForInput, orbitBy, getYaw, setZoom, zoomByFactor, getZoom, _debug: () => ({ yaw, zoom, horizontalDistance, height, center: smoothedCenter.toArray() }) };
}
