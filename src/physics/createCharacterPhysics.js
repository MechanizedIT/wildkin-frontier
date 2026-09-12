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
    controller.computeColliderMovement(collider, desired, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, (candidate) => !colliderFilter(candidate));
    const corrected = controller.computedMovement();
    const computedGrounded = controller.computedGrounded();

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
      // A contact against a steep face can be reported grounded by the KCC.
      // Only actual walkable support under the capsule may complete a fall.
      grounded: computedGrounded && hasGroundSupport(next),
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

  const queryFlags = RAPIER.QueryFilterFlags?.EXCLUDE_SENSORS ?? 0;
  const queryRotation = { x: 0, y: 0, z: 0, w: 1 };
  const queryCapsule = typeof RAPIER.Capsule === "function"
    ? new RAPIER.Capsule(cfg.capsuleHalfHeight, cfg.capsuleRadius)
    : null;

  function queryPredicate(acceptCollider) {
    return (candidate) => {
      if (!candidate || candidate === collider || colliderFilter(candidate)) return false;
      if (typeof candidate.isEnabled === "function" && !candidate.isEnabled()) return false;
      return typeof acceptCollider !== "function" || acceptCollider(candidate);
    };
  }

  function castRay(origin, direction, maxDistance, { acceptCollider } = {}) {
    const length = Math.hypot(direction?.x ?? 0, direction?.y ?? 0, direction?.z ?? 0);
    if (!world.castRayAndGetNormal || !RAPIER.Ray || length < 1e-7 || !(maxDistance > 0)) return null;
    try {
      const dir = { x: direction.x / length, y: direction.y / length, z: direction.z / length };
      const hit = world.castRayAndGetNormal(
        new RAPIER.Ray(origin, dir), maxDistance, true,
        queryFlags, undefined, collider, body, queryPredicate(acceptCollider),
      );
      if (!hit?.collider || !Number.isFinite(hit.timeOfImpact)) return null;
      return {
        collider: hit.collider,
        colliderHandle: hit.collider.handle,
        distance: hit.timeOfImpact,
        point: {
          x: origin.x + dir.x * hit.timeOfImpact,
          y: origin.y + dir.y * hit.timeOfImpact,
          z: origin.z + dir.z * hit.timeOfImpact,
        },
        normal: { x: hit.normal.x, y: hit.normal.y, z: hit.normal.z },
      };
    } catch (_error) {
      return null;
    }
  }

  function castCapsule(origin, direction, maxDistance, { acceptCollider } = {}) {
    const length = Math.hypot(direction?.x ?? 0, direction?.y ?? 0, direction?.z ?? 0);
    if (!world.castShape || !queryCapsule || length < 1e-7 || !(maxDistance > 0)) return null;
    try {
      const dir = { x: direction.x / length, y: direction.y / length, z: direction.z / length };
      const hit = world.castShape(
        origin, queryRotation, dir, queryCapsule, 0, maxDistance, true,
        queryFlags, undefined, collider, body, queryPredicate(acceptCollider),
      );
      const distance = Number(hit?.time_of_impact);
      if (!hit?.collider || !Number.isFinite(distance)) return null;
      return {
        collider: hit.collider,
        colliderHandle: hit.collider.handle,
        distance,
        point: hit.witness1 ? { x: hit.witness1.x, y: hit.witness1.y, z: hit.witness1.z } : null,
        normal: hit.normal1 ? { x: hit.normal1.x, y: hit.normal1.y, z: hit.normal1.z } : null,
      };
    } catch (_error) {
      return null;
    }
  }

  function hasGroundSupport(position = getPosition()) {
    const feetY = position.y - cfg.capsuleTotalHeight / 2;
    const walkableNormalY = Math.cos(cfg.maxSlopeClimbAngle);
    const rayOriginLift = 0.08;
    const flatSupportGap = 0.05;
    // The central sole avoids treating a ledge behind the capsule as a new
    // landing after it has left the lip. Its allowable ray distance expands
    // for the curved capsule on a walkable incline, up to the configured
    // slope limit, while a flat floor remains only .05m below the feet.
    const maxSlopeRise = cfg.capsuleRadius * (1 / walkableNormalY - 1);
    const hit = castRay(
      { x: position.x, y: feetY + rayOriginLift, z: position.z },
      { x: 0, y: -1, z: 0 },
      rayOriginLift + flatSupportGap + maxSlopeRise,
    );
    if (!hit || hit.normal.y < walkableNormalY - 1e-5) return false;
    const allowedDistance = rayOriginLift + flatSupportGap + cfg.capsuleRadius * (1 / hit.normal.y - 1);
    return hit.distance <= allowedDistance + 1e-5;
  }

  // Fail closed: traversal enters a position only after a positive Rapier
  // clearance result with the same filters as ordinary character movement.
  function isCapsuleAtPositionClear(targetPos, { acceptCollider } = {}) {
    if (!world.intersectionWithShape || !queryCapsule) return false;
    try {
      return !world.intersectionWithShape(
        targetPos, queryRotation, queryCapsule,
        queryFlags, undefined, collider, body, queryPredicate(acceptCollider),
      );
    } catch (_error) {
      return false;
    }
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
    castRay,
    castCapsule,
    hasGroundSupport,
    isCapsuleAtPositionClear,
  };
}
