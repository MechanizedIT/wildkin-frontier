// Small independent Rapier capsule for a companion. It deliberately follows
// world collision but filters the player and other companions so a party never
// shoves, blocks, or forms a rigid chain behind the explorer.

export const COMPANION_PHYSICS_TUNING = Object.freeze({
  radius: 0.23,
  halfHeight: 0.17,
  controllerOffset: 0.015,
  footClearance: 0.025,
  maxSlopeClimbAngle: (45 * Math.PI) / 180,
  minSlopeSlideAngle: (30 * Math.PI) / 180,
  autostepHeight: 0.16,
  autostepWidth: 0.14,
  snapDistance: 0.18,
});

export function createCompanionPhysics({ physicsWorld, initialPosition, shouldIgnoreCollider = () => false, tuning = COMPANION_PHYSICS_TUNING }) {
  const RAPIER = physicsWorld?.RAPIER;
  const world = physicsWorld?.world;
  if (!RAPIER || !world) return null;

  const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(initialPosition.x, initialPosition.y, initialPosition.z));
  const collider = world.createCollider(
    RAPIER.ColliderDesc.capsule(tuning.halfHeight, tuning.radius)
      .setFriction(0.5)
      .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL),
    body,
  );
  const controller = world.createCharacterController(tuning.controllerOffset);
  controller.setSlideEnabled(true);
  controller.setMaxSlopeClimbAngle(tuning.maxSlopeClimbAngle);
  controller.setMinSlopeSlideAngle(tuning.minSlopeSlideAngle);
  controller.enableAutostep(tuning.autostepHeight, tuning.autostepWidth, false);
  controller.enableSnapToGround(tuning.snapDistance);
  controller.setUp({ x: 0, y: 1, z: 0 });
  controller.setApplyImpulsesToDynamicBodies(false);
  world.propagateModifiedBodyPositionsToColliders();

  let enabled = true;
  function getPosition() {
    const p = collider.translation();
    return { x: p.x, y: p.y, z: p.z };
  }
  function setPosition(position) {
    body.setTranslation(position, true);
    world.propagateModifiedBodyPositionsToColliders();
  }
  function move(desired) {
    if (!enabled) return { corrected: { x: 0, y: 0, z: 0 }, grounded: false };
    const before = collider.translation();
    const filter = candidate => !shouldIgnoreCollider(candidate);
    // Rapier's final argument is the predicate. Existing/static world geometry
    // remains in the query; only party members are filtered out.
    controller.computeColliderMovement(collider, desired, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, filter);
    const corrected = controller.computedMovement();
    const next = { x: before.x + corrected.x, y: before.y + corrected.y, z: before.z + corrected.z };
    body.setTranslation(next, true);
    world.propagateModifiedBodyPositionsToColliders();
    return { corrected, grounded: controller.computedGrounded() };
  }
  function setEnabled(next) {
    enabled = !!next;
    collider.setEnabled(enabled);
  }
  function dispose() {
    try { world.removeCharacterController(controller); } catch {}
    try { world.removeCollider(collider, true); } catch {}
    try { world.removeRigidBody(body); } catch {}
  }
  return { body, collider, controller, tuning, getPosition, setPosition, move, setEnabled, dispose, get enabled() { return enabled; } };
}
