import * as THREE from "three";

// Landscape gameplay camera: a fixed 32° pitch and user-controlled horizontal yaw.
export const CAMERA_CONFIG = {
  fov: 52,
  near: 0.1,
  far: 60,
  // Frame the explorer below center so the route ahead remains visible.
  // The viewing offset is (4.1 up, 6.55 back): a stable 32° pitch.
  height: 5.0,
  focusHeight: .9,
  horizontalDistance: 6.55,
  distance: Math.hypot(4.1, 6.55),
  lookAt: { x: 0, y: .9, z: 0 },
};

export function createCamera(aspect) {
  const cfg = CAMERA_CONFIG;
  const camera = new THREE.PerspectiveCamera(cfg.fov, aspect, cfg.near, cfg.far);
  positionCamera(camera);
  return camera;
}

export function positionCamera(camera) {
  const cfg = CAMERA_CONFIG;
  camera.position.set(0, cfg.height, cfg.horizontalDistance);
  camera.lookAt(cfg.lookAt.x, cfg.lookAt.y, cfg.lookAt.z);
}

export function updateCameraAspect(camera, aspect) {
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}
