// src/input/keyboardInput.js — desktop fallback, feeds unified intent (Phase 1.1)

import { classifyMovementBand } from "../movement/movementBands.js";

export function createKeyboardInput(moveCfg, appElement = null) {
  const pressed = new Set();
  let spacePressed = false;
  let spaceConsumed = false;
  let attackPending = false;
  let attackConsumed = false;
  let mouseAttackPending = false;

  function requestAttack() {
    if (!attackConsumed) {
      attackPending = true;
      attackConsumed = true;
    }
  }

  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    // Phase 3: F is attack fallback + left click elsewhere handles attack
    if (k === "f") {
      if (!attackConsumed) { attackPending = true; attackConsumed = true; }
      e.preventDefault();
    }
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
    if (k === "f") {
      attackPending = false;
      attackConsumed = false;
    }
  }

  function onMouseDown(e) {
    // Left click = attack (desktop). Ignore if target is UI button.
    if (e.button !== 0) return;
    if (e.target.closest && e.target.closest("button, a")) return;
    // Only for mouse pointer
    if (e.pointerType && e.pointerType !== "mouse") return;
    // Treat any left click on app canvas as attack request (one-frame)
    mouseAttackPending = true;
  }
  // Also handle generic click for fallback if pointerdown not captured
  function onPointerUpForMouse(e) {
    if (e.button !== 0) return;
    // Already handled via mousedown; keep pending until consumed
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  // Desktop attack via left mouse click on document (filtered to not be on buttons)
  const clickTarget = appElement ?? (typeof document !== "undefined" ? document : null);
  if (clickTarget && clickTarget.addEventListener) {
    // Use pointerdown for immediate attack
    clickTarget.addEventListener("pointerdown", onMouseDown);
    // Also allow mousedown fallback
    clickTarget.addEventListener("mousedown", onMouseDown);
  } else {
    window.addEventListener("pointerdown", onMouseDown);
    window.addEventListener("mousedown", onMouseDown);
  }

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

    let attackRequested = false;
    if (attackPending && !attackConsumed) {
      // already set
    }
    if (attackPending || mouseAttackPending) attackRequested = true;

    return {
      moveX: nx,
      moveY: ny,
      moveMagnitude: mag,
      movementBand: band,
      dodgeRequested,
      dodgeX,
      dodgeY,
      attackRequested,
    };
  }

  function consumeDodge() {
    if (spacePressed && spaceConsumed) {
      // keep consumed until release
    }
  }

  function consumeAttack() {
    attackPending = false;
    mouseAttackPending = false;
    attackConsumed = false;
  }

  function resetDodge() {
    spaceConsumed = true;
  }

  function destroy() {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    const t = appElement ?? (typeof document !== "undefined" ? document : null);
    if (t && t.removeEventListener) {
      t.removeEventListener("pointerdown", onMouseDown);
      t.removeEventListener("mousedown", onMouseDown);
    } else {
      window.removeEventListener("pointerdown", onMouseDown);
      window.removeEventListener("mousedown", onMouseDown);
    }
  }

  return { getIntent, consumeDodge, consumeAttack, resetDodge, triggerAttack: requestAttack, destroy, _pressed: pressed, get _attackPending() { return attackPending || mouseAttackPending; } };
}
