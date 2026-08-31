import * as THREE from "three";

export function createCameraFollow(camera, target, cfg, baseCameraCfg) {
  const offset = new THREE.Vector3(cfg.offsetX ?? 0, cfg.offsetY ?? baseCameraCfg.height, cfg.offsetZ ?? baseCameraCfg.distance);
  // For lookAt tracking, we keep a separate smoothed lookAt point slightly ahead when running
  const smoothedLookAt = new THREE.Vector3(target.position.x, 0, target.position.z);
  const smoothedPos = new THREE.Vector3().copy(camera.position);
  const desiredPos = new THREE.Vector3();
  const lookAtTarget = new THREE.Vector3();

  let lookAheadX = 0;
  let lookAheadZ = 0;

  function update(dt, speed, moveDir) {
    // Desired camera position = target + offset
    desiredPos.set(target.position.x + offset.x, offset.y, target.position.z + offset.z);

    // Look-ahead when running
    const isRunning = speed > 5.0;
    const targetAheadX = isRunning && moveDir ? moveDir.x * (cfg.lookAheadRun ?? 1.1) : 0;
    const targetAheadZ = isRunning && moveDir ? moveDir.z * (cfg.lookAheadRun ?? 1.1) : 0;
    const lerpA = Math.min(1, (cfg.lookAheadLerp ?? 2.2) * dt);
    lookAheadX += (targetAheadX - lookAheadX) * lerpA;
    lookAheadZ += (targetAheadZ - lookAheadZ) * lerpA;
    // clamp
    const maxAhead = cfg.lookAheadMax ?? 1.6;
    const aheadLen = Math.hypot(lookAheadX, lookAheadZ);
    if (aheadLen > maxAhead) {
      lookAheadX = (lookAheadX / aheadLen) * maxAhead;
      lookAheadZ = (lookAheadZ / aheadLen) * maxAhead;
    }

    lookAtTarget.set(target.position.x + lookAheadX, 0, target.position.z + lookAheadZ);

    // Smooth both pos and lookAt
    const posLerp = 1 - Math.exp(-(cfg.followLerp ?? 5) * dt);
    const lookLerp = 1 - Math.exp(-(cfg.lookAtLerp ?? 6) * dt);

    smoothedPos.lerp(desiredPos, posLerp);
    smoothedLookAt.lerp(lookAtTarget, lookLerp);

    camera.position.copy(smoothedPos);
    camera.lookAt(smoothedLookAt.x, smoothedLookAt.y, smoothedLookAt.z);
  }

  function snap() {
    smoothedPos.set(target.position.x + offset.x, offset.y, target.position.z + offset.z);
    smoothedLookAt.set(target.position.x, 0, target.position.z);
    camera.position.copy(smoothedPos);
    camera.lookAt(smoothedLookAt.x, smoothedLookAt.y, smoothedLookAt.z);
  }

  return { update, snap };
}
