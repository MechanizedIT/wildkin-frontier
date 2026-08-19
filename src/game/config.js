// src/game/config.js — centralized tuning for Phase 1 movement + world feel
// All feel-affecting constants live here for phone playtest iteration.

export const MOVEMENT_CONFIG = {
  // Joystick band thresholds (normalized 0..1)
  deadzone: 0.16,
  sneakThreshold: 0.40, // upper bound of sneak
  walkThreshold: 0.70, // upper bound of walk; above is run

  // Band speeds (world units / sec)
  sneakSpeed: 1.6,
  walkSpeed: 3.3,
  runSpeed: 6.0,

  // Acceleration model
  acceleration: 28,
  deceleration: 36,
  turnSpeed: 14, // angular lerp speed (rad/s equivalent)

  // Frame safety
  maxDelta: 0.05,

  // Dodge — mobility burst only (no i-frames, no stamina)
  dodgeDuration: 0.22,
  dodgeCooldown: 0.55,
  dodgeSpeed: 11.0, // ~2.42 units over duration (2x run step)
  dodgeBufferWindow: 0.08, // not used yet, placeholder

  // Jump traversal — automatic
  jumpDuration: 0.48,
  jumpArcHeight: 1.45,
  jumpMaxDistance: 6.0,
  jumpAutoTriggerRadius: 1.35,
  jumpDirectionDotThreshold: 0.35,

  // Climb — explicit surfaces only
  climbSpeed: 2.0,
  climbEnterDot: 0.30,
  climbExitDot: -0.25,
  climbProximity: 1.05,
  climbSnapRadius: 1.25,

  // Character + collision
  playerRadius: 0.42,
  playerHeight: 0.95,

  // World bounds
  worldBounds: { minX: -12.5, maxX: 12.5, minZ: -11.5, maxZ: 11.5 },
};

export const CAMERA_CONFIG_FOLLOW = {
  // Inherits base CAMERA_CONFIG height/distance/fov from createCamera.js
  // Follow tuning
  followLerp: 5.0,
  lookAtLerp: 6.0,
  // Optional look-ahead while running
  lookAheadRun: 1.1,
  lookAheadLerp: 2.2,
  lookAheadMax: 1.6,
};

export const INPUT_CONFIG = {
  joystickMaxRadius: 68,
  // Visualization radii proportional to maxRadius * thresholds
  dodgeMinDistance: 34,
  dodgeMaxDuration: 300, // ms
  dodgeMinVelocity: 0.32, // px/ms
};

export const WORLD_CONFIG = {
  // playground extents referenced by camera framing
  playgroundHalfX: 12,
  playgroundHalfZ: 11,
};
