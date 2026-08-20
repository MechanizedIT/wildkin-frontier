// src/input/inputController.js — unified intent merge helper (Phase 1.1)
// Single clear API: mergeIntents (pure). Removed redundant createInputController wrapper.

export function mergeIntents(touchIntent, keyboardIntent) {
  const touchActive = touchIntent && (touchIntent.moveMagnitude > 0.01 || touchIntent.dodgeRequested);
  const touchHasMove = touchIntent && touchIntent.moveMagnitude > 0.01;
  if (touchActive && touchHasMove) return touchIntent;
  if (touchActive && touchIntent.dodgeRequested) {
    return {
      moveX: keyboardIntent.moveX,
      moveY: keyboardIntent.moveY,
      moveMagnitude: keyboardIntent.moveMagnitude,
      movementBand: keyboardIntent.movementBand,
      dodgeRequested: true,
      dodgeX: touchIntent.dodgeX,
      dodgeY: touchIntent.dodgeY,
    };
  }
  return keyboardIntent;
}

// Backwards compat alias for existing imports/tests
export const mergeIntentsPure = mergeIntents;
