import * as THREE from "three";

export function createCameraFollow(camera, target, cfg, baseCameraCfg, { collisionProbe = null } = {}) {
  const horizontalDistance = cfg.horizontalDistance ?? baseCameraCfg.horizontalDistance ?? baseCameraCfg.distance;
  const height = cfg.offsetY ?? baseCameraCfg.height;
  const focusHeight = cfg.focusHeight ?? baseCameraCfg.focusHeight ?? 0;
  const verticalOffset = height - focusHeight;
  const baseDistance = Math.hypot(horizontalDistance, verticalOffset);
  const smoothedCenter = new THREE.Vector3(target.position.x, target.position.y + focusHeight, target.position.z);
  const desiredCenter = new THREE.Vector3();
  const orbitDirection = new THREE.Vector3();
  let yaw = 0;
  let pitch = cfg.pitch ?? Math.atan2(verticalOffset, horizontalDistance);
  const minPitch = cfg.minPitch ?? (20 * Math.PI / 180);
  const maxPitch = cfg.maxPitch ?? (64 * Math.PI / 180);
  pitch = Math.max(minPitch, Math.min(maxPitch, pitch));
  let userZoom = 1;
  let collisionDistance = null;
  let requestedDistance = baseDistance;
  let effectiveDistance = baseDistance;
  let focusRecovery = 'clear';
  const minZoom = cfg.minZoom ?? .72;
  const maxZoom = cfg.maxZoom ?? 1.3;

  function setDesiredCenter() {
    desiredCenter.set(target.position.x, target.position.y + focusHeight, target.position.z);
  }
  function getRequestedDistance() {
    const distanceScale = userZoom * (camera.aspect > 1 ? (cfg.landscapeZoom ?? 1) : 1);
    return baseDistance * distanceScale;
  }
  function setOrbitDirection() {
    const horizontal = Math.cos(pitch);
    orbitDirection.set(Math.sin(yaw) * horizontal, Math.sin(pitch), Math.cos(yaw) * horizontal);
  }
  // Rotate a rigid spherical offset around one smoothed follow center. The
  // temporary collision bound only shortens this visual offset, so it cannot
  // affect player state, yaw-relative movement, or the requested user zoom.
  function applyCamera(dt = 0, queryCollision = false) {
    if (queryCollision && collisionProbe?.recoverFocus) {
      const recovered = collisionProbe.recoverFocus({ focus: smoothedCenter, desiredFocus: desiredCenter });
      if (recovered?.focus) smoothedCenter.copy(recovered.focus);
      focusRecovery = recovered?.status ?? 'unavailable';
    }
    requestedDistance = getRequestedDistance();
    if (collisionDistance == null || requestedDistance < collisionDistance) collisionDistance = requestedDistance;
    setOrbitDirection();
    if (queryCollision && collisionProbe?.resolveDistance) {
      const solved = collisionProbe.resolveDistance({ focus: smoothedCenter, direction: orbitDirection, requestedDistance });
      if (Number.isFinite(solved)) {
        const bounded = Math.max(0, Math.min(requestedDistance, solved));
        if (bounded <= collisionDistance) collisionDistance = bounded;
        else collisionDistance += (bounded - collisionDistance) * (1 - Math.exp(-(cfg.collisionRecoveryLerp ?? 6) * Math.max(0, dt)));
      }
    } else if (!collisionProbe) {
      collisionDistance = requestedDistance;
    }
    effectiveDistance = Math.min(requestedDistance, collisionDistance ?? requestedDistance);
    camera.position.set(
      smoothedCenter.x + orbitDirection.x * effectiveDistance,
      smoothedCenter.y + orbitDirection.y * effectiveDistance,
      smoothedCenter.z + orbitDirection.z * effectiveDistance,
    );
    // An overlap may safely retract all the way to focus. Looking at focus
    // from that exact point is undefined and can discard yaw, which would
    // change camera-relative movement. Keep the orbit look direction explicit.
    camera.lookAt(
      camera.position.x - orbitDirection.x,
      camera.position.y - orbitDirection.y,
      camera.position.z - orbitDirection.z,
    );
  }

  function update(dt, speed, moveDir) {
    setDesiredCenter();
    const centerLerp = 1 - Math.exp(-(cfg.followLerp ?? 5) * dt);
    smoothedCenter.lerp(desiredCenter, centerLerp);
    applyCamera(dt, true);
  }

  function snap() {
    setDesiredCenter();
    smoothedCenter.copy(desiredCenter);
    collisionDistance = getRequestedDistance();
    applyCamera(0, true);
  }

  // Called before player physics. It makes camera-relative movement use the
  // exact yaw the player sees this frame, without jumping the follow center.
  function prepareForInput() {
    applyCamera(0, false);
  }
  function orbitBy(yawDelta, pitchDelta = 0) {
    yaw += Number.isFinite(yawDelta) ? yawDelta : 0;
    if (Number.isFinite(pitchDelta)) pitch = Math.max(minPitch, Math.min(maxPitch, pitch + pitchDelta));
  }
  function getYaw() { return yaw; }
  function getPitch() { return pitch; }
  function setZoom(value) { if (Number.isFinite(value)) userZoom = Math.max(minZoom, Math.min(maxZoom, value)); }
  function zoomByFactor(factor) { if (Number.isFinite(factor) && factor > 0) setZoom(userZoom * factor); }
  function getZoom() { return userZoom; }

  return { update, snap, prepareForInput, orbitBy, getYaw, getPitch, setZoom, zoomByFactor, getZoom, _debug: () => ({ yaw, pitch, zoom: userZoom, userZoom, requestedDistance, collisionDistance, effectiveDistance, focusRecovery, horizontalDistance, height, center: smoothedCenter.toArray() }) };
}
