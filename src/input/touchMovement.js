// src/input/touchMovement.js — floating joystick only. The empty right half is
// reserved for camera orbit; Field Tool and Dodge arrive through explicit UI.
import { classifyMovementBand } from "../movement/movementBands.js";

export function createTouchMovement(appElement, moveCfg, inputCfg) {
  const maxRadius = inputCfg.joystickMaxRadius ?? 68;
  let enabled = true;
  function clearActive() {
    if (hasActive) {
      const id = activeId;
      hasActive = false; activeId = null; band = "idle"; magnitude = 0; nx = 0; ny = 0;
      hideVisuals(); try { appElement.releasePointerCapture(id); } catch {}
    }
    swipe.active = false; swipe.id = null; swipe.holdEstablished = false;
    attackHeld = false; dodgePending = false; attackPending = false;
  }
  function setEnabled(v) {
    enabled = !!v;
    if (!enabled) clearActive();
  }
  function isEnabled() { return enabled; }

  // State
  let activeId = null;
  let origin = { x: 0, y: 0 };
  let current = { x: 0, y: 0 };
  let hasActive = false;
  let band = "idle";
  let magnitude = 0;
  let nx = 0;
  let ny = 0;

  // Dodge + Attack gesture state (right side) — Phase 3.1 tap/hold/swipe
  let dodgePending = false;
  let dodgeX = 0;
  let dodgeY = 0;
  let attackPending = false; // one-frame tap
  let attackHeld = false; // intentional hold
  const swipe = { active: false, id: null, sx: 0, sy: 0, st: 0, lastX: 0, lastY: 0, maxDist: 0, holdEstablished: false };

  // Visual elements (created lazily)
  let originEl = null;
  let stickEl = null;
  let containerEl = null;

  function ensureVisuals() {
    if (containerEl) return;
    containerEl = document.getElementById("joystick-layer");
    if (!containerEl) {
      containerEl = document.createElement("div");
      containerEl.id = "joystick-layer";
      containerEl.style.position = "absolute";
      containerEl.style.inset = "0";
      containerEl.style.pointerEvents = "none";
      containerEl.style.display = "none";
      appElement.appendChild(containerEl);
    }
    originEl = document.getElementById("joystick-origin");
    stickEl = document.getElementById("joystick-stick");
    if (!originEl) {
      originEl = document.createElement("div");
      originEl.id = "joystick-origin";
      originEl.style.position = "absolute";
      originEl.style.width = maxRadius * 2 + "px";
      originEl.style.height = maxRadius * 2 + "px";
      originEl.style.borderRadius = "50%";
      originEl.style.border = "1px solid rgba(255,255,255,0.18)";
      originEl.style.background = "rgba(255,255,255,0.06)";
      originEl.style.transform = "translate(-50%, -50%)";
      originEl.style.pointerEvents = "none";
      containerEl.appendChild(originEl);

      // Band rings visualization
      const sneakR = maxRadius * (moveCfg.deadzone + (moveCfg.sneakThreshold - moveCfg.deadzone) * 0.5);
      // Create 3 rings
      [moveCfg.deadzone, moveCfg.sneakThreshold, moveCfg.walkThreshold].forEach((thr) => {
        const ring = document.createElement("div");
        ring.className = "joy-ring";
        ring.style.position = "absolute";
        ring.style.left = "50%";
        ring.style.top = "50%";
        ring.style.width = maxRadius * 2 * thr + "px";
        ring.style.height = maxRadius * 2 * thr + "px";
        ring.style.borderRadius = "50%";
        ring.style.border = "1px dashed rgba(255,255,255,0.16)";
        ring.style.transform = "translate(-50%, -50%)";
        ring.style.pointerEvents = "none";
        originEl.appendChild(ring);
      });
    }
    if (!stickEl) {
      stickEl = document.createElement("div");
      stickEl.id = "joystick-stick";
      stickEl.style.position = "absolute";
      stickEl.style.width = "44px";
      stickEl.style.height = "44px";
      stickEl.style.borderRadius = "50%";
      stickEl.style.background = "rgba(255,255,255,0.88)";
      stickEl.style.border = "2px solid rgba(14,20,32,0.9)";
      stickEl.style.transform = "translate(-50%, -50%)";
      stickEl.style.boxShadow = "0 4px 12px rgba(0,0,0,0.35)";
      stickEl.style.pointerEvents = "none";
      containerEl.appendChild(stickEl);
    }
  }

  function showVisuals(x, y) {
    ensureVisuals();
    containerEl.style.display = "block";
    originEl.style.left = x + "px";
    originEl.style.top = y + "px";
    stickEl.style.left = x + "px";
    stickEl.style.top = y + "px";
  }

  function moveVisuals(x, y) {
    if (!stickEl) return;
    stickEl.style.left = x + "px";
    stickEl.style.top = y + "px";
  }

  function hideVisuals() {
    if (containerEl) containerEl.style.display = "none";
  }

  function isInMovementArea(clientX, clientY) {
    const rect = appElement.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    // movement zone: left ~58% and bottom ~62%
    const w = rect.width;
    const h = rect.height;
    // top boundary for joystick spawn: allow anywhere but prefer lower part;
    // we allow upper spawns too but bias to not steal right action region swipe start
    const movementLeftThreshold = w * 0.58;
    const movementTopThreshold = h * 0.38;
    return relX < movementLeftThreshold && relY > movementTopThreshold;
  }

  function isInActionArea(clientX) {
    const rect = appElement.getBoundingClientRect();
    const relX = clientX - rect.left;
    return relX >= rect.width * 0.5;
  }

  function handleDown(e) {
    if (!enabled) return;
    // Input ownership: mouse → desktop/keyboard only, touch → touchMovement, pen → touch-like
    if (e.pointerType === "mouse") return;
    if (e.pointerType === "pen") { /* allow pen as touch */ }
    if (e.button !== undefined && e.button !== 0) return;
    const targetIsButton = e.target.closest && e.target.closest("button, a");
    if (targetIsButton) return;

    const rect = appElement.getBoundingClientRect();
    const id = e.pointerId;

    // The camera-orbit adapter owns every empty right-half pointer.
    if (isInActionArea(e.clientX)) return;

    // Joystick starts in movement area and not already active
    if (hasActive) return;
    if (!isInMovementArea(e.clientX, e.clientY)) return;

    activeId = id;
    origin.x = e.clientX;
    origin.y = e.clientY;
    current.x = e.clientX;
    current.y = e.clientY;
    hasActive = true;
    updateFromCurrent();

    ensureVisuals();
    showVisuals(origin.x - rect.left, origin.y - rect.top);

    try { appElement.setPointerCapture(id); } catch {}
    if (e.cancelable) e.preventDefault();
  }

  function handleMove(e) {
    if (!enabled) return;
    if (e.pointerType === "mouse") return;
    if (e.pointerId === activeId && hasActive) {
      current.x = e.clientX;
      current.y = e.clientY;
      updateFromCurrent();
      const rect = appElement.getBoundingClientRect();
      const dx = current.x - origin.x;
      const dy = current.y - origin.y;
      const len = Math.hypot(dx, dy);
      let visX = current.x;
      let visY = current.y;
      if (len > maxRadius) {
        visX = origin.x + (dx / len) * maxRadius;
        visY = origin.y + (dy / len) * maxRadius;
      }
      moveVisuals(visX - rect.left, visY - rect.top);
      if (e.cancelable) e.preventDefault();
    }
  }

  function handleUp(e) {
    if (e.pointerType === "mouse") {
      // mouse not owned by touch adapter; ignore but clear if by chance
      if (!enabled) { hasActive = false; activeId = null; hideVisuals(); swipe.active = false; swipe.id = null; attackHeld = false; return; }
      // still process but only if id matches (which it won't since we never captured mouse)
    }
    if (!enabled) { // clear any lingering state
      hasActive = false; activeId = null; hideVisuals();
      swipe.active = false; swipe.id = null; attackHeld = false; return;
    }
    if (e.pointerId === activeId && hasActive) {
      hasActive = false;
      activeId = null;
      band = "idle";
      magnitude = 0;
      nx = 0;
      ny = 0;
      hideVisuals();
      try { appElement.releasePointerCapture(e.pointerId); } catch {}
    }
  }

  function updateFromCurrent() {
    const dx = current.x - origin.x;
    const dy = current.y - origin.y;
    // dy positive down = +Z; we keep that mapping for world.
    const rawMag = Math.hypot(dx, dy) / maxRadius;
    const clampedMag = Math.min(1, rawMag);
    const len = Math.hypot(dx, dy);
    if (len > 1e-6) {
      nx = dx / len;
      ny = dy / len;
    } else {
      nx = 0;
      ny = 0;
    }
    magnitude = clampedMag;
    band = classifyMovementBand(magnitude, moveCfg);
  }

  // Attach
  appElement.addEventListener("pointerdown", handleDown, { passive: false });
  appElement.addEventListener("pointermove", handleMove, { passive: false });
  appElement.addEventListener("pointerup", handleUp, { passive: false });
  appElement.addEventListener("pointercancel", handleUp, { passive: false });
  const onVisibilityChange = () => { if (globalThis.document?.hidden) clearActive(); };
  globalThis.window?.addEventListener?.("blur", clearActive);
  globalThis.document?.addEventListener?.("visibilitychange", onVisibilityChange);

  function getIntent() {
    if (!enabled) return { moveX: 0, moveY: 0, moveMagnitude: 0, movementBand: "idle", dodgeRequested: false, dodgeX: 0, dodgeY: 0, attackRequested: false, attackHeld: false };
    const base = {
      dodgeRequested: dodgePending,
      dodgeX,
      dodgeY,
      attackRequested: attackPending,
      attackHeld: attackHeld,
    };
    if (!hasActive) {
      return {
        moveX: 0,
        moveY: 0,
        moveMagnitude: 0,
        movementBand: "idle",
        ...base,
      };
    }
    return {
      moveX: nx,
      moveY: ny,
      moveMagnitude: magnitude,
      movementBand: band,
      ...base,
    };
  }

  function consumeDodge() {
    dodgePending = false;
  }

  function consumeAttack() {
    attackPending = false;
  }
  function consumeAttackHeld() {
    // not used directly; hold clears on pointer up
  }

  // Legacy test seam: gameplay gestures no longer claim right-side input.
  function simulateGesture(dist, dur, vel) {
    return "orbit";
  }
  function simulateHold(durationMs) {
    return "orbit";
  }

  function destroy() {
    appElement.removeEventListener("pointerdown", handleDown);
    appElement.removeEventListener("pointermove", handleMove);
    appElement.removeEventListener("pointerup", handleUp);
    appElement.removeEventListener("pointercancel", handleUp);
    globalThis.window?.removeEventListener?.("blur", clearActive);
    globalThis.document?.removeEventListener?.("visibilitychange", onVisibilityChange);
  }

  return { getIntent, consumeDodge, consumeAttack, simulateGesture, simulateHold, destroy, clear: clearActive, setEnabled, isEnabled, _debug: () => ({ hasActive, nx, ny, magnitude, band, dodgePending, attackPending, attackHeld, swipe, enabled }) };
}
