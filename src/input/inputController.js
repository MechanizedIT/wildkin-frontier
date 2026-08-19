// src/input/inputController.js — merges keyboard + touch into unified intent
export function createInputController(appElement, moveCfg, inputCfg) {
  // Dynamic imports to avoid circular
  // Lazy load to keep this file as composition root
  let touch = null;
  let keyboard = null;

  // Import synchronously via functions created above? We'll import here
  // But to avoid async, caller should pass already created sub-controllers.
  // This module is now a simple merger used by caller.

  // This file intentionally left as re-export helper; real merging is done inline in main.js
  // Provide utility to merge two intents priority: touch wins if active
  return {
    mergeIntents(touchIntent, keyboardIntent) {
      // touch intent when joystick active OR dodge pending has priority
      const touchActive = touchIntent && (touchIntent.moveMagnitude > 0.01 || touchIntent.dodgeRequested);
      const touchHasMove = touchIntent && touchIntent.moveMagnitude > 0.01;
      if (touchActive) {
        // If touch has move, use it; otherwise fall through to keyboard for movement but keep touch dodge
        if (touchHasMove) return touchIntent;
        // dodge-only touch with idle stick: merge dodge flag with keyboard move
        if (touchIntent.dodgeRequested) {
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
      }
      return keyboardIntent;
    },
  };
}

// Pure merge function for testing
export function mergeIntentsPure(touchIntent, keyboardIntent) {
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
