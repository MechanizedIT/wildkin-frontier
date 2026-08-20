// src/game/config.js — centralized tuning for Phase 1.1 movement + traversal
// All feel-affecting constants live here for playtest iteration.

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

  // Character + collision
  playerRadius: 0.42,
  playerHeight: 0.95,

  // World bounds
  worldBounds: { minX: -12.5, maxX: 12.5, minZ: -11.5, maxZ: 11.5 },
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
  playgroundHalfX: 12,
  playgroundHalfZ: 11,
};
