// src/game/config.js — centralized tuning for Phase 1.2 movement + traversal + Rapier
// All feel-affecting constants live here for playtest iteration.
// See src/physics/physicsConfig.js for Rapier controller constants (mirrored here for discovery).

export const MOVEMENT_CONFIG = {
  // Joystick band thresholds (normalized 0..1)
  deadzone: 0.16,
  sneakThreshold: 0.40,
  walkThreshold: 0.70,

  // Band speeds (world units / sec)
  sneakSpeed: 1.6,
  walkSpeed: 3.3,
  runSpeed: 6.0,

  // Acceleration model
  acceleration: 28,
  deceleration: 36,
  turnSpeed: 14,
  maxDelta: 0.05,

  // Dodge — mobility burst only (no i-frames, no stamina)
  dodgeDuration: 0.22,
  dodgeCooldown: 0.55,
  dodgeSpeed: 11.0,
  dodgeBufferWindow: 0.08,

  // Jump — kinematic model (Phase 1.1)
  // vertical: v += gravity*dt ; y += v*dt ; horizontal += hVel*dt
  jumpInitialVerticalVelocity: 5.8,
  jumpGravity: 12.0,
  // air control as fraction of ground steering
  jumpAirControlFactor: 0.28,
  jumpAirMaxSpeed: 7.2,
  // validity gating
  jumpMinTakeoffSpeed: 2.2,
  jumpTriggerRadius: 1.45,
  jumpDirectionDotThreshold: 0.35,
  jumpMaxLandingCorrection: 1.4,
  jumpLandingSnapRadius: 1.6,
  // fallback legacy (kept for backwards compat with old tests, unused)
  jumpDuration: 0.48,
  jumpArcHeight: 1.45,
  jumpMaxDistance: 6.0,
  jumpAutoTriggerRadius: 1.35,
  jumpDirectionDotThresholdLegacy: 0.35,

  // Climb — explicit surfaces only (Phase 1.1 refined)
  climbSpeedUp: 1.9,
  climbSpeedDown: 1.7,
  climbProximity: 1.05,
  climbEnterDot: 0.30,
  climbExitDot: -0.28,
  climbSnapRadius: 1.25,
  // legacy single speed (alias)
  climbSpeed: 2.0,
  // Top-entry / mantle
  climbTopEntryDot: 0.22,
  climbTopEntryRadius: 1.15,
  mantleDuration: 0.28,
  mantleOffset: 0.65,

  // Character — Rapier capsule now authoritative (playerRadius kept for legacy tests/docs)
  playerRadius: 0.32,
  playerHeight: 0.95,
  // Gravity for falling/jump (explicit, Rapier world gravity is 0)
  gravity: -12.0,

  // Airborne horizontal control — shared by JUMP and FALL (Phase 1.2 refinement)
  // Grounded bands ignored in air; direction only with constant accel/decel and frozen cap.
  airAcceleration: 10,
  airDeceleration: 5,
  airMinSpeedCap: 3.3, // == walkSpeed, ensures falling from standstill still steerable

  // World bounds
  // Crescent Basin's authored retreat route extends north-to-south from Camp to Threshold Rise.
  worldBounds: { minX: -14.5, maxX: 14.5, minZ: -36.5, maxZ: 15.5 },
};

export const CAMERA_CONFIG_FOLLOW = {
  followLerp: 5.0,
  lookAtLerp: 6.0,
  lookAheadRun: 1.1,
  lookAheadLerp: 2.2,
  lookAheadMax: 1.6,
};

export const INPUT_CONFIG = {
  joystickMaxRadius: 68,
  dodgeMinDistance: 34,
  dodgeMaxDuration: 300,
  dodgeMinVelocity: 0.32,
};

export const WORLD_CONFIG = {
  playgroundHalfX: 14,
  playgroundHalfZ: 36,
};

// Rapier physics tuning — also defined in src/physics/physicsConfig.js (single source of truth is physicsConfig)
// Mirrored here so all gameplay tuning is discoverable from src/game/config.js
export const RAPIER_CONFIG = {
  fixedDt: 1 / 60,
  maxSubsteps: 4,
  maxDelta: 0.10,
  capsuleRadius: 0.32,
  capsuleHalfHeight: 0.20,
  capsuleTotalHeight: 1.04,
  controllerOffset: 0.02,
  maxSlopeClimbAngle: (45 * Math.PI) / 180,
  minSlopeSlideAngle: (30 * Math.PI) / 180,
  autostepMaxHeight: 0.20,
  autostepMinWidth: 0.18,
  autostepIncludeDynamic: false,
  snapToGroundDistance: 0.20,
};
