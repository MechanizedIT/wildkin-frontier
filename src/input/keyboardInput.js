// src/input/keyboardInput.js — desktop fallback, feeds unified intent (Phase 1.1)

import { classifyMovementBand } from "../movement/movementBands.js";
import { GESTURE_CONFIG } from "./gesture.js";

export function isEditableKeyboardTarget(target) {
  if (!target) return false;
  const tag = target.tagName?.toLowerCase?.() ?? "";
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  return !!target.closest?.("input, textarea, select, [contenteditable='true']");
}

export function shouldHandleGameplayKeyboardEvent(event, enabled = true, activeElement = globalThis.document?.activeElement) {
  return !!enabled && !isEditableKeyboardTarget(event?.target) && !isEditableKeyboardTarget(activeElement);
}

export function createKeyboardInput(moveCfg, appElement = null) {
  let enabled = true;
  function clearState() {
    pressed.clear(); spacePressed = false; spaceConsumed = false; attackPending = false; attackConsumed = false;
    mouseAttackPending = false; mouseDown = false; isFDown = false; externalAttackHeld = false; externalDodgePending = false;
  }
  function setEnabled(v) {
    enabled = !!v;
    if (!enabled) clearState();
  }
  function isEnabled() { return enabled; }
  const pressed = new Set();
  let spacePressed = false;
  let spaceConsumed = false;
  let attackPending = false;
  let attackConsumed = false;
  let mouseAttackPending = false;
  let mouseDown = false;
  let mouseDownTime = 0;
  let fDownTime = 0;
  let isFDown = false;
  let externalAttackHeld = false;
  let externalDodgePending = false;

  function requestAttack() {
    if (!attackConsumed) {
      attackPending = true;
      attackConsumed = true;
    }
  }
  function requestDodge() { externalDodgePending = true; }
  function setFieldToolHeld(value) { externalAttackHeld = !!value; }

  function onKeyDown(e) {
    if (!shouldHandleGameplayKeyboardEvent(e, enabled)) return;
    const k = e.key.toLowerCase();
    // Phase 3.1: F tap = one swing, hold = repeat
    if (k === "f") {
      if (!attackConsumed) { attackPending = true; attackConsumed = true; }
      if (!isFDown) { isFDown = true; fDownTime = performance.now(); }
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
      isFDown = false;
    }
  }

  function onMouseDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest && e.target.closest("button, a")) return;
    if (e.pointerType && e.pointerType !== "mouse") return;
    const rect = appElement?.getBoundingClientRect?.();
    if (rect && e.clientX - rect.left >= rect.width * .5) return;
    mouseAttackPending = true;
    mouseDown = true;
    mouseDownTime = performance.now();
  }
  function onMouseUp(e) {
    if (e.button !== 0) return;
    mouseDown = false;
  }
  function onPointerUpForMouse(e) {
    if (e.button !== 0) return;
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearState);
  window.addEventListener("pointerup", onMouseUp);
  window.addEventListener("mouseup", onMouseUp);
  const clickTarget = appElement ?? (typeof document !== "undefined" ? document : null);
  if (clickTarget && clickTarget.addEventListener) {
    clickTarget.addEventListener("pointerdown", onMouseDown);
    clickTarget.addEventListener("mousedown", onMouseDown);
    clickTarget.addEventListener("pointerup", onMouseUp);
    clickTarget.addEventListener("mouseup", onMouseUp);
  } else {
    window.addEventListener("pointerdown", onMouseDown);
    window.addEventListener("mousedown", onMouseDown);
  }

  function getIntent() {
    if (!enabled) return { moveX: 0, moveY: 0, moveMagnitude: 0, movementBand: "idle", dodgeRequested: false, dodgeX: 0, dodgeY: 0, attackRequested: false, attackHeld: false };
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
    if ((spacePressed && !spaceConsumed && len >= 0) || externalDodgePending) {
      dodgeRequested = true;
      spaceConsumed = true;
    }

    const dodgeX = nx;
    const dodgeY = ny;

    let attackRequested = false;
    if (attackPending || mouseAttackPending) attackRequested = true;

    // Hold detection (desktop parity): if mouse or F held beyond threshold, set attackHeld
    let attackHeld = false;
    const now = performance.now();
    if (mouseDown && now - mouseDownTime >= (GESTURE_CONFIG.holdThresholdMs ?? 220)) attackHeld = true;
    if (isFDown && now - fDownTime >= (GESTURE_CONFIG.holdThresholdMs ?? 220)) attackHeld = true;
    if (externalAttackHeld) attackHeld = true;

    return {
      moveX: nx,
      moveY: ny,
      moveMagnitude: mag,
      movementBand: band,
      dodgeRequested,
      dodgeX,
      dodgeY,
      attackRequested,
      attackHeld,
    };
  }

  function consumeDodge() {
    if (spacePressed && spaceConsumed) {
      // keep consumed until release
    }
    externalDodgePending = false;
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
    window.removeEventListener("blur", clearState);
    window.removeEventListener("pointerup", onMouseUp);
    window.removeEventListener("mouseup", onMouseUp);
    const t = appElement ?? (typeof document !== "undefined" ? document : null);
    if (t && t.removeEventListener) {
      t.removeEventListener("pointerdown", onMouseDown);
      t.removeEventListener("mousedown", onMouseDown);
      t.removeEventListener("pointerup", onMouseUp);
      t.removeEventListener("mouseup", onMouseUp);
    } else {
      window.removeEventListener("pointerdown", onMouseDown);
      window.removeEventListener("mousedown", onMouseDown);
    }
  }

  return { getIntent, consumeDodge, consumeAttack, resetDodge, triggerAttack: requestAttack, requestDodge, setFieldToolHeld, isAttackDown: () => isFDown || mouseDown || externalAttackHeld, destroy, _pressed: pressed, setEnabled, isEnabled, get _attackPending() { return attackPending || mouseAttackPending; } };
}
