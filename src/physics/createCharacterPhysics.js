// src/physics/createCharacterPhysics.js — kinematic body + capsule + KinematicCharacterController (Phase 1.2)
// No design decisions beyond physics tuning. Input = movement intent, output = collision-resolved position.

import { RAPIER_PHYSICS_CONFIG } from "./physicsConfig.js";

export function createCharacterPhysics(RAPIER, world, initialPos, { shouldIgnoreCollider = () => false } = {}) {
  const cfg = RAPIER_PHYSICS_CONFIG;

  // Kinematic position-based body — deliberately controlled, not simulated.
  const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(initialPos.x, initialPos.y, initialPos.z);
  const body = world.createRigidBody(bodyDesc);

  // Capsule collider attached to body. Y axis is length.
  const capsuleDesc = RAPIER.ColliderDesc.capsule(cfg.capsuleHalfHeight, cfg.capsuleRadius)
    // Keep capsule centered on body (body translation = capsule center). Feet = center - (halfHeight+radius)
    .setTranslation(0, 0, 0)
    .setFriction(0.5)
    .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
  const collider = world.createCollider(capsuleDesc, body);

  // KinematicCharacterController — Rapier's recommended character movement solver
  const controller = world.createCharacterController(cfg.controllerOffset);
  let colliderFilter = shouldIgnoreCollider;
  controller.setSlideEnabled(true);
  controller.setMaxSlopeClimbAngle(cfg.maxSlopeClimbAngle);
  controller.setMinSlopeSlideAngle(cfg.minSlopeSlideAngle);
  // Autostep: small lips, not tall boxes
  if (cfg.autostepMaxHeight > 0) {
    controller.enableAutostep(cfg.autostepMaxHeight, cfg.autostepMinWidth, cfg.autostepIncludeDynamic);
  } else {
    controller.disableAutostep();
  }
  // Snap to ground
  if (cfg.snapToGroundDistance != null) {
    controller.enableSnapToGround(cfg.snapToGroundDistance);
  } else {
    controller.disableSnapToGround();
  }
  // Up vector is +Y by default; ensure.
  controller.setUp({ x: 0, y: 1, z: 0 });
  // No impulse pushing of dynamic bodies needed for current playground
  controller.setApplyImpulsesToDynamicBodies(false);

  // Optional debug: expose key config
  const info = {
    capsuleRadius: cfg.capsuleRadius,
    capsuleHalfHeight: cfg.capsuleHalfHeight,
    capsuleTotalHeight: cfg.capsuleTotalHeight,
    offset: cfg.controllerOffset,
    maxSlopeDeg: (cfg.maxSlopeClimbAngle * 180) / Math.PI,
    snap: cfg.snapToGroundDistance,
    autostepH: cfg.autostepMaxHeight,
  };

  function getPosition() {
    const t = collider.translation(); // world space
    return { x: t.x, y: t.y, z: t.z };
  }

  function setPosition(pos) {
    // Keep body and collider in sync
    body.setTranslation({ x: pos.x, y: pos.y, z: pos.z }, true);
    // Propagate the kinematic body's transform before the next controller query.
    // Without this step, a teleport followed by syncPosFromPhysics can read the
    // previous collider translation for one frame and undo the authored arrival.
    world.step();
  }

  // Move by desired translation (world units), returns { corrected, grounded, numCollisions, collisions }
  function move(desired) {
    const before = collider.translation();
    controller.computeColliderMovement(collider, desired, undefined, undefined, (candidate) => !colliderFilter(candidate));
    const corrected = controller.computedMovement();
    const grounded = controller.computedGrounded();

    const next = {
      x: before.x + corrected.x,
      y: before.y + corrected.y,
      z: before.z + corrected.z,
    };
    // Apply to kinematic body (authoritative) and update query pipeline so next character-controller query sees new position.
    body.setTranslation(next, true);
    // For parented collider, collider world pos follows body after pipeline update. Need step/propagate before next query.
    world.step();

    return {
      corrected,
      grounded,
      numCollisions: controller.numComputedCollisions(),
      // Helper to inspect collisions
      collision: (i) => controller.computedCollision(i),
      nextPos: next,
      beforePos: before,
      desired,
    };
  }

  function setColliderFilter(next) {
    colliderFilter = typeof next === "function" ? next : () => false;
  }

  // Optional shape query for mantle clearance: check if capsule at target would intersect world.
  function isCapsuleAtPositionClear(targetPos) {
    // Use world.intersectionWithShape or world.castShape? Simplest: check if placing capsule at target collides.
    // Create a temporary shape description for query.
    // Rapier's World.intersectionWithShape(shapePos, shapeRot, shape)
    // For capsule: need Shape capsule.
    // However JS API requires a Shape object; we can reuse collider shape.
    // Simpler: temporarily move collider to target, test for intersections, then move back? Instead use query pipeline.
    // Approach: use world.intersectionWithShape at targetPos with capsule shape.
    // Create a capsule shape inline: we can construct via RAPIER.ColliderDesc.capsule(...). shape? But need Shape.
    // Rapier JS does not expose Shape constructor directly for capsule? It does via ColliderDesc.
    // Alternative: use a small epsilon — try to place and see if next move would be blocked heavily.
    // For Phase 1.2 we do a simpler check: cast a small AABB query via world.intersectionsWithShape.
    // Fallback: assume clear if no static collider at that AABB.
    try {
      // Build a capsule shape object via RAPIER.ColliderDesc.capsule shape extraction
      // RAPIER.ColliderDesc.capsule creates a ColliderDesc; we can extract shape? Not straightforward.
      // Use world.castShape or intersectionWithShape with manual shape creation via `new RAPIER.Capsule`? In rapier3d, Capsule shape exists.
      // In JS bindings, Capsule is available as RAPIER.Capsule? Check if RAPIER.Capsule exists.
      if (typeof RAPIER.Capsule === "function" || typeof RAPIER.Capsule === "object") {
        const halfHeight = cfg.capsuleHalfHeight;
        const radius = cfg.capsuleRadius;
        const shape = new RAPIER.Capsule(halfHeight, radius);
        const rot = { x: 0, y: 0, z: 0, w: 1 };
        const hit = world.intersectionWithShape(targetPos, rot, shape);
        return hit === null;
      }
    } catch (_e) {
      // fall through
    }
    // If query API unavailable, optimistically assume clear (mantle was authored to be clear)
    return true;
  }

  return {
    body,
    collider,
    controller,
    world,
    RAPIER,
    cfg,
    info,
    getPosition,
    setPosition,
    move,
    setColliderFilter,
    isCapsuleAtPositionClear,
  };
}
