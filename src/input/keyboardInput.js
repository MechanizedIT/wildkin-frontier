// src/input/keyboardInput.js — desktop fallback, feeds unified intent

import { classifyMovementBand } from "../movement/movementBands.js";

export function createKeyboardInput(moveCfg) {
  const pressed = new Set();
  let spacePressed = false;
  let spaceConsumed = false;

  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift", "control", "c", " "].includes(k) || e.code === "Space") {
      // prevent scroll on arrows/space when game has focus
      if (k === " " || k.startsWith("arrow")) e.preventDefault();
    }
    pressed.add(k);
    if (e.code === "Space" || k === " ") spacePressed = true;
  }
  function onKeyUp(e) {
    const k = e.key.toLowerCase();
    pressed.delete(k);
    if (e.code === "Space" || k === " ") {
      spacePressed = false;
      spaceConsumed = false;
    }
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  function getIntent() {
    let x = 0;
    let y = 0; // y will be mapped to world Z later (forward/back)
    // WASD + arrows
    if (pressed.has("w") || pressed.has("arrowup")) y -= 1;
    if (pressed.has("s") || pressed.has("arrowdown")) y += 1;
    if (pressed.has("a") || pressed.has("arrowleft")) x -= 1;
    if (pressed.has("d") || pressed.has("arrowright")) x += 1;

    const len = Math.hypot(x, y);
    let nx = 0;
    let ny = 0;
    let mag = 0;
    let band = "idle";
    if (len > 0) {
      nx = x / len;
      ny = y / len;
      // Decide band via modifier keys
      const isShift = pressed.has("shift");
      const isSneak = pressed.has("control") || pressed.has("c");
      let targetMag;
      if (isSneak) targetMag = 0.30;
      else if (isShift) targetMag = 0.90;
      else targetMag = 0.55;
      band = classifyMovementBand(targetMag, moveCfg);
      mag = targetMag;
      // For actual move vector, keep normalized; magnitude indicates band zone
    }

    // Dodge requested: space once per press
    let dodgeRequested = false;
    if (spacePressed && !spaceConsumed && len >= 0) {
      // allow dodge even with no movement (dodge in facing direction)
      dodgeRequested = true;
      spaceConsumed = true;
    }

    // For keyboard dodge direction: use movement direction if any, else null (player facing)
    const dodgeX = nx;
    const dodgeY = ny;

    return {
      moveX: nx,
      moveY: ny,
      moveMagnitude: mag,
      movementBand: band,
      dodgeRequested,
      dodgeX,
      dodgeY,
    };
  }

  // Called by player controller after consuming dodge
  function consumeDodge() {
    if (spacePressed && spaceConsumed) {
      // keep consumed until release
    }
  }

  function resetDodge() {
    spaceConsumed = true;
  }

  function destroy() {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  }

  return { getIntent, consumeDodge, resetDodge, destroy, _pressed: pressed };
}
