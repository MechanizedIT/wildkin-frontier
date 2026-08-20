// src/input/keyboardInput.js — desktop fallback, feeds unified intent (Phase 1.1)

import { classifyMovementBand } from "../movement/movementBands.js";

export function createKeyboardInput(moveCfg) {
  const pressed = new Set();
  let spacePressed = false;
  let spaceConsumed = false;

  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    // Phase 1.1: C is primary sneak. X added as ergonomic alternative next to WASD (Alt would conflict with browser, see note).
    // Alt handling: we capture it but avoid using it as primary due to browser shortcuts (Alt+D, Alt+F, Alt+Space).
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift", "c", "x", "alt", " "].includes(k) || e.code === "Space" || e.altKey) {
      if (k === " " || k.startsWith("arrow") || k === "alt") e.preventDefault();
    }
    pressed.add(k);
    if (e.altKey) pressed.add("alt");
    if (e.code === "Space" || k === " ") spacePressed = true;
  }
  function onKeyUp(e) {
    const k = e.key.toLowerCase();
    pressed.delete(k);
    if (!e.altKey) pressed.delete("alt");
    if (e.code === "Space" || k === " ") {
      spacePressed = false;
      spaceConsumed = false;
    }
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  function getIntent() {
    let x = 0;
    let y = 0;
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
      const isShift = pressed.has("shift");
      const isSneak = pressed.has("c") || pressed.has("x") || pressed.has("alt");
      let targetMag;
      if (isSneak) targetMag = 0.30;
      else if (isShift) targetMag = 0.90;
      else targetMag = 0.55;
      band = classifyMovementBand(targetMag, moveCfg);
      mag = targetMag;
    }

    let dodgeRequested = false;
    if (spacePressed && !spaceConsumed && len >= 0) {
      dodgeRequested = true;
      spaceConsumed = true;
    }

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
