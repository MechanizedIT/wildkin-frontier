// src/input/gesture.js — tap/hold/swipe classification (pure)
// Mobile: right-side TAP = one swing, HOLD = repeat at cadence, SWIPE = dodge (precedence)

export const GESTURE_CONFIG = {
  holdThresholdMs: 220, // 0.20-0.25 sec centralized
  dodgeMinDistance: 34,
  dodgeMinVelocity: 0.32,
  dodgeMaxDuration: 300,
  // after hold established, tiny drift should not become dodge
  holdLockDrift: 12, // px
};

// Classify swipe vs hold vs tap from pointer history
// pointer: { downX, downY, downTime, upX, upY, upTime, moveDistMax, pointerType? }
// Returns "DODGE" | "TAP" | "HOLD" | "NONE"
export function classifyGesture({ downX, downY, downTime, upX, upY, upTime, moveDist, duration, velocity }, cfg = GESTURE_CONFIG) {
  const dist = moveDist ?? Math.hypot((upX ?? downX) - downX, (upY ?? downY) - downY);
  const dur = duration ?? (upTime - downTime);
  const vel = velocity ?? (dur > 0 ? dist / dur : 0);

  // Dodge takes precedence: must be swipe before attack commit
  // Use same thresholds as dodge gesture
  if (dist >= (cfg.dodgeMinDistance ?? 34) && dur <= (cfg.dodgeMaxDuration ?? 300) && vel >= (cfg.dodgeMinVelocity ?? 0.32)) {
    return "DODGE";
  }

  // If still held beyond threshold, it's HOLD (should be detected on down duration, not up)
  // For pointer-up classification, holdAlreadyEstablished case is handled separately
  if (dur >= (cfg.holdThresholdMs ?? 220)) {
    // If hold was already established, up should not become dodge (handled above) — treat as HOLD release
    return "HOLD";
  }

  // Quick release within threshold and not swipe => TAP
  if (dur < (cfg.holdThresholdMs ?? 220)) {
    // Ensure not already classified as dodge
    return "TAP";
  }
  return "NONE";
}

// Held-state logic: while pointer down, determine if attackHeld should be true
export function isHoldActive({ downTime, now, moveDistMax }, cfg = GESTURE_CONFIG) {
  const dur = now - downTime;
  if (dur < (cfg.holdThresholdMs ?? 220)) return false;
  // Once hold established, tiny drift (holdLockDrift) should not revert
  // moveDistMax already tracked; if drift tiny, still hold
  // If moveDistMax > holdLockDrift + dodge distance, it would have been dodge earlier
  return true;
}

// For pure tests: evaluate hold threshold directly
export function holdThresholdMs(cfg = GESTURE_CONFIG) {
  return cfg.holdThresholdMs;
}
