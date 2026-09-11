// src/ui/contextualInteraction.js — single contextual frontier action owner (Phase 4A.2)
// Answers current interaction label/target, exposes E + mobile button, coexists with Field Tool.

import { projectInteractionPoint, placeInteractionLabel } from "./worldInteractionAnchor.js";
import { iconMarkup } from "./itemIcons.js";

const interactionIcon = (info) => {
  if (["portalGate", "gate", "majorWaypoint", "extractionBeacon"].includes(info?.type)) return "map";
  if (info?.type === "lootChest") return "backpack";
  if (["campSanctuary", "companion", "bond"].includes(info?.type)) return "paw";
  return "axe";
};

export function createContextualInteraction(opts = {}) {
  const app = document.getElementById("app");
  const onActivate = opts.onActivate ?? (()=>{});
  let current = null; // {id, type, label}
  let buttonEl = null;
  let presentationKey = "";
  let leaderEl = null;
  let safeEl = null;
  let size = null;
  let pressedTarget = null;
  const protectedSelectors = '.beta-hud-actions,.beta-action-cluster,.beta-quick,.beta-field-guide,.beta-joystick-home,#combat-hud,#frontier-map-button,#auto-harvest-toggle,.beta-objective,.beta-toast,#activation-toast';
  let obstacles = [], layoutTimer = 1;
  const hide = () => { if (buttonEl) buttonEl.hidden = true; if (leaderEl) leaderEl.hidden = true; };

  if (app) {
    buttonEl = document.createElement("button");
    buttonEl.id = "contextual-action-button";
    buttonEl.type = "button";
    buttonEl.hidden = true;
    app.appendChild(buttonEl);
    leaderEl = document.createElement('i');
    leaderEl.className = 'contextual-action-leader'; leaderEl.hidden = true;
    safeEl = document.createElement('i'); safeEl.className = 'contextual-action-safe-area';
    app.append(leaderEl, safeEl);
    // A native click handles touch and mouse exactly once. Keep world gestures
    // from starting underneath this control without globally blocking movement.
    buttonEl.addEventListener('pointerdown', e => { e.stopPropagation(); pressedTarget = current; });
    buttonEl.addEventListener('pointerup', e => e.stopPropagation());
    buttonEl.addEventListener('pointercancel', () => { pressedTarget = null; });
    buttonEl.addEventListener('pointerleave', e => { if (!e.buttons) pressedTarget = null; });
    window.addEventListener('pointerup', e => { if (!buttonEl.contains(e.target)) pressedTarget = null; });
    window.addEventListener('blur', () => { pressedTarget = null; });
    buttonEl.addEventListener('click', e => {
      e.stopPropagation();
      const sameTarget = !pressedTarget || (pressedTarget.id === current?.id && pressedTarget.type === current?.type);
      pressedTarget = null;
      if (current && sameTarget) onActivate(current);
    });
  }

  function setInteraction(info) {
    // info: {id, type, label} or null
    current = info;
    if (!buttonEl) return;
    const nextKey = info ? `${info.id}|${info.type}|${info.label}|${info.detail ?? ""}` : "";
    if (presentationKey === nextKey) return;
    presentationKey = nextKey;
    size = null; layoutTimer = 1; hide();
    if (!info) {

      buttonEl.textContent = "";
      buttonEl.removeAttribute("title");
      buttonEl.removeAttribute("aria-label");
    } else {
      buttonEl.textContent = "";
      // This is only populated for a real nearby interaction.  Its icon
      // distinguishes a usable cache/gate/companion from ordinary scenery
      // without turning the world into a field of permanent labels.
      const icon = document.createRange().createContextualFragment(iconMarkup(interactionIcon(info), { size: 28, label: "" }));
      icon.firstElementChild?.classList.add("contextual-action__icon");
      const label = document.createElement("span");
      label.className = "contextual-action__label";
      label.textContent = info.label.split(' — ')[0];
      buttonEl.append(icon, label);
      buttonEl.title = info.detail ?? info.label;
      buttonEl.setAttribute("aria-label", info.detail ? `${info.label}. ${info.detail}` : info.label);

    }
  }

  function update(dt, { hidden = false } = {}) {
    if (!buttonEl || !current || hidden) { hide(); return; }
    const anchor = opts.anchor?.getPoint(current);
    if (!anchor) { hide(); return; }
    const frame = app.getBoundingClientRect();
    const point = projectInteractionPoint(anchor, opts.camera, frame.width, frame.height);
    if (!point || opts.anchor.isOccluded(opts.camera, anchor, dt)) { hide(); return; }
    buttonEl.hidden = false;
    if (!size) size = { width: buttonEl.offsetWidth, height: buttonEl.offsetHeight };
    layoutTimer += dt;
    if (layoutTimer >= .1) {
      layoutTimer = 0;
      obstacles = [...app.querySelectorAll(protectedSelectors)].filter(el => !el.hidden && el.getClientRects().length && getComputedStyle(el).display !== 'none' && Number(getComputedStyle(el).opacity) > .05).map(el => {
        const r = el.getBoundingClientRect();
        return { left: r.left - frame.left, right: r.right - frame.left, top: r.top - frame.top, bottom: r.bottom - frame.top };
      });
    }
    const safe = safeEl.getBoundingClientRect();
    const playerPosition = opts.getPlayerPosition?.();
    const playerPoint = playerPosition && projectInteractionPoint(playerPosition, opts.camera, frame.width, frame.height);
    const protectedAreas = playerPoint ? [...obstacles, { left: playerPoint.x - 25, right: playerPoint.x + 25, top: playerPoint.y - 48, bottom: playerPoint.y + 25 }] : obstacles;
    const position = placeInteractionLabel(point, size, { left: safe.left - frame.left, right: safe.right - frame.left, top: safe.top - frame.top, bottom: safe.bottom - frame.top }, protectedAreas);
    if (!position) { hide(); return; }
    // Hold the touch target under the finger until release; don't chase a
    // moving creature midway through the user's tap.
    if (pressedTarget?.id === current.id && pressedTarget?.type === current.type) return;
    buttonEl.style.left = `${position.left}px`; buttonEl.style.top = `${position.top}px`;
    const dx = point.x - position.endX, dy = point.y - position.endY;
    leaderEl.style.left = `${position.endX}px`; leaderEl.style.top = `${position.endY}px`;
    leaderEl.style.width = `${Math.hypot(dx, dy)}px`;
    leaderEl.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    leaderEl.hidden = false;
  }

  function getCurrent() { return current; }
  function isAvailable() { return !!current; }
  function activate() {
    if (current) onActivate(current);
  }

  // desktop E key handling — caller should call handleKey in global keydown
  function handleKey(e) {
    if (e.key.toLowerCase() !== "e") return false;
    if (!current) return false;
    // don't trigger if focused in input
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || document.activeElement?.isContentEditable) return false;
    e.preventDefault();
    onActivate(current);
    return true;
  }

  return { update, setInteraction, getCurrent, isAvailable, activate, handleKey, element: buttonEl };
}
