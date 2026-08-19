import * as THREE from "three";

// Centralized camera config — Phase 1 can tune height/tilt/follow without rewriting scene creation.
export const CAMERA_CONFIG = {
  fov: 42,
  near: 0.1,
  far: 60,
  // High third-person / near top-down portrait framing
  height: 14,
  distance: 10,
  lookAt: { x: 0, y: 0, z: 0 },
};

export function createCamera(aspect) {
  const cfg = CAMERA_CONFIG;
  const camera = new THREE.PerspectiveCamera(cfg.fov, aspect, cfg.near, cfg.far);
  positionCamera(camera);
  return camera;
}

export function positionCamera(camera) {
  const cfg = CAMERA_CONFIG;
  camera.position.set(0, cfg.height, cfg.distance);
  camera.lookAt(cfg.lookAt.x, cfg.lookAt.y, cfg.lookAt.z);
}

export function updateCameraAspect(camera, aspect) {
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}
