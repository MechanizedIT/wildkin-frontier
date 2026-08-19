// src/movement/movementBands.js — pure joystick/input band classification
// Testable without Three.js or DOM.

export function classifyMovementBand(magnitude, cfg) {
  const deadzone = cfg.deadzone ?? 0.16;
  const sneakT = cfg.sneakThreshold ?? 0.40;
  const walkT = cfg.walkThreshold ?? 0.70;
  if (!Number.isFinite(magnitude) || magnitude < 0) return "idle";
  if (magnitude < deadzone) return "idle";
  if (magnitude < sneakT) return "sneak";
  if (magnitude < walkT) return "walk";
  return "run";
}

export function getBandSpeed(band, moveCfg) {
  switch (band) {
    case "sneak":
      return moveCfg.sneakSpeed;
    case "walk":
      return moveCfg.walkSpeed;
    case "run":
      return moveCfg.runSpeed;
    default:
      return 0;
  }
}

// Normalize a 2D vector (x,y) — returns { x, y, mag } where mag is original length.
// Safe for zero.
export function normalize2D(x, y) {
  const mag = Math.hypot(x, y);
  if (mag < 1e-9) return { x: 0, y: 0, mag: 0 };
  return { x: x / mag, y: y / mag, mag };
}

// Clamp diagonal input to unit circle (keeps max magnitude at 1 even on corners).
export function clampToUnitCircle(x, y) {
  const mag = Math.hypot(x, y);
  if (mag <= 1) return { x, y, mag };
  return { x: x / mag, y: y / mag, mag: 1 };
}

export function isValidIntent(intent) {
  if (!intent || typeof intent !== "object") return false;
  if (!Number.isFinite(intent.moveX) || !Number.isFinite(intent.moveY)) return false;
  if (!Number.isFinite(intent.moveMagnitude)) return false;
  return true;
}
