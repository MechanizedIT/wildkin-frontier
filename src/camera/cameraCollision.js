// Presentation-only Rapier camera clearance. This never moves a body, changes
// player intent, or owns user zoom; it only reports a safe camera distance.
export function createCameraCollisionProbe({ RAPIER, physicsWorld, playerCollider = null, getTerrainHeight = null, cfg = {} } = {}) {
  const world = physicsWorld?.world;
  const staticColliders = physicsWorld?.staticColliders;
  if (!RAPIER?.Ball || !world?.castShape || !Array.isArray(staticColliders)) return null;

  // Static colliders are constructed once for a runtime world. Section and
  // object activation uses collider.setEnabled, which Rapier respects during
  // the query; this set therefore has no stale inactive-section members.
  const cameraColliders = physicsWorld?.cameraColliders ?? new Set(staticColliders);
  const radius = cfg.collisionRadius ?? .22;
  const margin = cfg.collisionMargin ?? .12;
  const nearDistance = cfg.collisionNearDistance ?? 1.35;
  const shape = new RAPIER.Ball(radius);
  const rotation = { x: 0, y: 0, z: 0, w: 1 };
  const velocity = { x: 0, y: 0, z: 0 };
  const flags = (RAPIER.QueryFilterFlags?.EXCLUDE_DYNAMIC ?? 0)
    | (RAPIER.QueryFilterFlags?.EXCLUDE_KINEMATIC ?? 0)
    | (RAPIER.QueryFilterFlags?.EXCLUDE_SENSORS ?? 0);
  let last = { hit: false, overlap: false, tightClearance: false, toi: null, distance: null };

  function isActiveCameraSolid(collider) {
    return cameraColliders.has(collider) && (typeof collider.isEnabled !== 'function' || collider.isEnabled());
  }

  function isFocusClear(focus) {
    if (!focus || !world.intersectionWithShape) return true;
    return !world.intersectionWithShape(
      focus, rotation, shape, flags, undefined, playerCollider, undefined,
      isActiveCameraSolid,
    );
  }

  function hasClearCorridor(from, to) {
    if (!from || !to) return false;
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const length = Math.hypot(dx, dy, dz);
    if (length < 1e-6) return true;
    velocity.x = dx / length; velocity.y = dy / length; velocity.z = dz / length;
    const hit = world.castShape(
      from, rotation, velocity, shape,
      0, length, true,
      flags, undefined, playerCollider, undefined,
      isActiveCameraSolid,
    );
    return !hit;
  }

  function isLocalFocusClear(focus) {
    // A terrain trimesh has no enclosing volume below its surface, so point
    // overlap alone can say "clear" underneath it. The active terrain height
    // is the authoritative below-ground check; it intentionally does not
    // reject a valid player focus beneath a doorway lintel or overhang.
    const terrain = getTerrainHeight?.(focus.x, focus.z);
    return isFocusClear(focus) && (!Number.isFinite(terrain) || focus.y >= terrain + radius);
  }

  function recoverFocus({ focus, desiredFocus }) {
    if (!desiredFocus) return { focus, status: 'blocked' };
    const desiredClear = isLocalFocusClear(desiredFocus);
    // Accept a smoothing point only while it remains connected to the clear
    // current player focus. This detects it crossing a terrain surface even
    // when it is wholly below a one-sided terrain mesh.
    if (desiredClear && isFocusClear(focus) && hasClearCorridor(desiredFocus, focus)) return { focus, status: 'clear' };
    if (desiredClear) return { focus: desiredFocus, status: 'desired' };
    return { focus, status: 'blocked' };
  }

  function resolveDistance({ focus, direction, requestedDistance }) {
    if (!focus || !direction || !Number.isFinite(requestedDistance) || requestedDistance <= 0) return requestedDistance;
    velocity.x = direction.x; velocity.y = direction.y; velocity.z = direction.z;
    // Rapier 0.20 uses targetDistance then maxToi and returns
    // `time_of_impact` (not the newer shorthand `toi`).
    const hit = world.castShape(
      focus, rotation, velocity, shape,
      0, requestedDistance, true,
      flags, undefined, playerCollider, undefined,
      isActiveCameraSolid,
    );
    const toi = Number(hit?.time_of_impact);
    if (!Number.isFinite(toi)) {
      last = { hit: false, overlap: false, tightClearance: false, toi: null, distance: requestedDistance };
      return requestedDistance;
    }
    // `nearDistance` is the preferred near-plane clearance, never a license
    // to put the camera past a nearer wall. A start-overlap is explicitly
    // exposed for diagnosis; it collapses safely toward focus this frame.
    const unobstructed = Math.max(0, toi - margin);
    const distance = Math.min(requestedDistance, unobstructed);
    last = { hit: true, overlap: toi <= margin, tightClearance: unobstructed < nearDistance, toi, distance };
    return distance;
  }

  return { resolveDistance, recoverFocus, isFocusClear, isLocalFocusClear, _debug: () => ({ radius, margin, nearDistance, staticCount: cameraColliders.size, ...last }) };
}
