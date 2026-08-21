// src/creatures/steering.js — lightweight obstacle steering (pure decision, no A*, no navmesh)
// Keep Rapier collision-resolved locomotion plus lightweight steering

// Angle normalize
function normAngle(a) {
  let r = a;
  while (r > Math.PI) r -= Math.PI * 2;
  while (r < -Math.PI) r += Math.PI * 2;
  return r;
}

// Choose steering direction given direct desired angle and blocked probes
// probes: { directBlocked, left45Blocked, right45Blocked, left90Blocked, right90Blocked }
// Returns chosen angle (radians) or null if none
export function chooseSteeringDirection({ desiredAngle, probeResults, preferLeft = null }) {
  const { directBlocked, left45Blocked, right45Blocked, left90Blocked, right90Blocked } = probeResults;
  if (!directBlocked) return desiredAngle;
  // If direct blocked, try 45 deg sides
  const left45Angle = desiredAngle + Math.PI / 4;
  const right45Angle = desiredAngle - Math.PI / 4;
  const left90Angle = desiredAngle + Math.PI / 2.2; // ~82 deg
  const right90Angle = desiredAngle - Math.PI / 2.2;

  const left45Ok = !left45Blocked;
  const right45Ok = !right45Blocked;
  if (left45Ok && right45Ok) {
    // choose side that still advances toward goal — both do; optionally prefer continuity
    if (preferLeft === true) return left45Angle;
    if (preferLeft === false) return right45Angle;
    // default prefer right slightly? choose whichever less blocked in 90; if both ok pick 45 closest
    return left45Angle; // deterministic
  }
  if (left45Ok) return left45Angle;
  if (right45Ok) return right45Angle;
  // Try 80-90 deg
  const left90Ok = !left90Blocked;
  const right90Ok = !right90Blocked;
  if (left90Ok && right90Ok) {
    if (preferLeft === true) return left90Angle;
    if (preferLeft === false) return right90Angle;
    return left90Angle;
  }
  if (left90Ok) return left90Angle;
  if (right90Ok) return right90Angle;
  // All blocked — stay (null)
  return null;
}

// Pure stall detection: if corrected movement magnitude << desired, consider blocked
export function isMovementStalled({ desiredMag, correctedMag, threshold = 0.35 }) {
  if (desiredMag < 1e-6) return false;
  return correctedMag < desiredMag * threshold;
}

// Helper to compute probe positions for testing (does not use Rapier, pure geometry)
export function probePositionBlocked({ from, angle, distance, radius, isBlockedFn }) {
  const to = {
    x: from.x + Math.cos(angle) * distance,
    y: from.y,
    z: from.z + Math.sin(angle) * distance,
  };
  // In real game, use Rapier cast; here delegate to isBlockedFn(to)
  return isBlockedFn(to, from, radius);
}

export const STEERING_CONFIG = {
  probeDistance: 0.9,
  holdDuration: 0.35, // retain steering choice briefly to avoid oscillation
  separationRadius: 0.65,
  separationStrength: 0.35,
};
