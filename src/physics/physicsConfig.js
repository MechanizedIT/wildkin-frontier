// src/physics/physicsConfig.js — Rapier character controller tuning (Phase 1.2)
// Centralized, mirrored in src/game/config.js RAPIER_CONFIG for external tuning.

export const RAPIER_PHYSICS_CONFIG = {
  // Fixed timestep
  fixedDt: 1 / 60,
  maxSubsteps: 4,
  maxDelta: 0.10, // clamp large frame gaps (tab switch)

  // Player capsule (radius / halfHeight -> total = 2*halfHeight + 2*radius)
  // Target total 0.95-1.05 to match visual body.
  capsuleRadius: 0.32,
  capsuleHalfHeight: 0.20, // total = 0.40 + 0.64 = 1.04
  // For debug: total height
  get capsuleTotalHeight() {
    return this.capsuleHalfHeight * 2 + this.capsuleRadius * 2;
  },

  // Character controller
  controllerOffset: 0.02, // skin/gap, 0.01-0.03 spec
  // slide enabled
  // slope angles in radians
  maxSlopeClimbAngle: (45 * Math.PI) / 180,
  minSlopeSlideAngle: (30 * Math.PI) / 180,
  // autostep — small lips may step, tall brown boxes (1.25h) must not
  autostepMaxHeight: 0.20,
  autostepMinWidth: 0.18,
  autostepIncludeDynamic: false,
  // snap-to-ground — stabilizes small drops without canceling jumps
  snapToGroundDistance: 0.20,

  // Ground/world friction (static colliders)
  worldFriction: 0.6,
};

export const RAPIER_TUNING_INFO = `capsule r=${RAPIER_PHYSICS_CONFIG.capsuleRadius} hHalf=${RAPIER_PHYSICS_CONFIG.capsuleHalfHeight} total=${RAPIER_PHYSICS_CONFIG.capsuleTotalHeight.toFixed(2)} offset=${RAPIER_PHYSICS_CONFIG.controllerOffset} snap=${RAPIER_PHYSICS_CONFIG.snapToGroundDistance} autostep h=${RAPIER_PHYSICS_CONFIG.autostepMaxHeight}`;
