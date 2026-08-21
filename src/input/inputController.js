// src/input/inputController.js — unified intent merge helper (Phase 1.1)
// Single clear API: mergeIntents (pure). Removed redundant createInputController wrapper.

export function classifyDodgeGesture(dist, dur, vel, cfg) {
  const minDist = cfg.dodgeMinDistance ?? 34;
  const minVel = cfg.dodgeMinVelocity ?? 0.32;
  const maxDur = cfg.dodgeMaxDuration ?? 300;
  return dist >= minDist && dur <= maxDur && vel >= minVel;
}

export function mergeIntents(touchIntent, keyboardIntent) {
  const touchActive = touchIntent && (touchIntent.moveMagnitude > 0.01 || touchIntent.dodgeRequested || touchIntent.attackRequested);
  const touchHasMove = touchIntent && touchIntent.moveMagnitude > 0.01;
  // Merge attack/dodge requests from both sources (OR logic)
  const mergedAttack = !!(touchIntent?.attackRequested || keyboardIntent?.attackRequested);
  const mergedDodge = !!(touchIntent?.dodgeRequested || keyboardIntent?.dodgeRequested);
  const mergedDodgeX = touchIntent?.dodgeRequested ? touchIntent.dodgeX : keyboardIntent.dodgeX;
  const mergedDodgeY = touchIntent?.dodgeRequested ? touchIntent.dodgeY : keyboardIntent.dodgeY;

  if (touchActive && touchHasMove) {
    // Preserve identity for backward compat when no attack merging needed
    if (!mergedAttack && mergedDodge === !!touchIntent.dodgeRequested && !touchIntent.attackRequested && !keyboardIntent.attackRequested) {
      // Also need attackRequested field absent originally; return as-is for test identity
      return touchIntent;
    }
    return {
      moveX: touchIntent.moveX,
      moveY: touchIntent.moveY,
      moveMagnitude: touchIntent.moveMagnitude,
      movementBand: touchIntent.movementBand,
      dodgeRequested: mergedDodge,
      dodgeX: mergedDodgeX,
      dodgeY: mergedDodgeY,
      attackRequested: mergedAttack,
    };
  }
  if (touchActive && (touchIntent.dodgeRequested || touchIntent.attackRequested)) {
    return {
      moveX: keyboardIntent.moveX,
      moveY: keyboardIntent.moveY,
      moveMagnitude: keyboardIntent.moveMagnitude,
      movementBand: keyboardIntent.movementBand,
      dodgeRequested: mergedDodge,
      dodgeX: mergedDodgeX,
      dodgeY: mergedDodgeY,
      attackRequested: mergedAttack,
    };
  }
  if (!mergedAttack && mergedDodge === !!keyboardIntent.dodgeRequested) {
    // No attack to merge, return keyboard identity for compat (tests expect kb reference)
    if (!touchIntent?.attackRequested && !keyboardIntent?.attackRequested) return keyboardIntent;
  }
  return {
    moveX: keyboardIntent.moveX,
    moveY: keyboardIntent.moveY,
    moveMagnitude: keyboardIntent.moveMagnitude,
    movementBand: keyboardIntent.movementBand,
    dodgeRequested: mergedDodge,
    dodgeX: mergedDodgeX,
    dodgeY: mergedDodgeY,
    attackRequested: mergedAttack,
  };
}

// Backwards compat alias for existing imports/tests
export const mergeIntentsPure = mergeIntents;
