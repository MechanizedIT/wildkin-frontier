// src/ui/contextualInteraction.js — single contextual frontier action owner (Phase 4A.2)
// Answers current interaction label/target, exposes E + mobile button, coexists with Field Tool.

import { projectInteractionPoint, placeInteractionLabel } from "./worldInteractionAnchor.js";
import { iconMarkup } from "./itemIcons.js";
import { createContextualGesture } from './contextualGesture.js';

const interactionIcon = (info) => {
  if (info?.type === 'cliffClimb') return 'climb';
  if (["portalGate", "gate", "majorWaypoint", "extractionBeacon"].includes(info?.type)) return "map";
  if (info?.type === "lootChest") return "backpack";
  if (info?.type === 'campYard') return 'shield';
  if (info?.type === 'rootfall') return 'axe';
  if (info?.type === 'berryGarden') return 'berries';
  if (["campSanctuary", "companion", "bond", "wildkinBed"].includes(info?.type)) return "paw";
  return "axe";
};

export function createContextualInteraction(opts = {}) {
  const app = document.getElementById("app");
  const onActivate = opts.onActivate ?? (()=>{});
  let current = null; // {id, type, label}
  let buttonEl = null;
  let secondaryEl = null;
  let captionEl = null, choicePresented = false;
  const primaryGesture = createContextualGesture(), secondaryGesture = createContextualGesture();
  let markerEl = null, presented = false, portraitPresented = false;
  let presentationKey = "";
  let leaderEl = null;
  let safeEl = null;
  let size = null;
  let pressedTarget = null;
  const protectedSelectors = '.beta-hud-actions,.beta-action-cluster,.beta-quick,.beta-field-guide,#joystick-origin,.viewport-fullscreen,#combat-hud,#frontier-map-button,#auto-harvest-toggle,.beta-objective,.beta-toast,#activation-toast';
  let obstacles = [], layoutTimer = 1;
  let bodyRectangle = null;
  let lastPlacement = null;
  let residency = opts.getResidency?.();
  function setPresented(value, portrait = false) {
    presented = value;
    const next = value && portrait;
    if (next !== portraitPresented) { portraitPresented = next; opts.onPortraitVisibilityChanged?.(next); }
    const choice = value && current?.pairChoice === true;
    if (choice !== choicePresented) { choicePresented = choice; app?.classList.toggle('nursery-choice-open', choice); }
  }
  const hide = () => {
    if (buttonEl) buttonEl.hidden = true; if (secondaryEl) secondaryEl.hidden = true;
    if (leaderEl) leaderEl.hidden = true; if (markerEl) markerEl.hidden = true;
    if (captionEl) captionEl.hidden = true;
    pressedTarget = null; primaryGesture.cancel(); secondaryGesture.cancel(); setPresented(false);
  };

  if (app) {
    buttonEl = document.createElement("button");
    buttonEl.id = "contextual-action-button";
    buttonEl.type = "button";
    buttonEl.hidden = true;
    app.appendChild(buttonEl);
    secondaryEl = document.createElement('button');
    secondaryEl.id = 'contextual-secondary-action-button'; secondaryEl.type = 'button'; secondaryEl.hidden = true;
    app.appendChild(secondaryEl);
    captionEl = document.createElement('span');
    captionEl.id = 'contextual-action-caption'; captionEl.hidden = true;
    app.appendChild(captionEl);
    secondaryEl.addEventListener('pointerdown', e => { e.stopPropagation(); secondaryGesture.begin(current, true); });
    secondaryEl.addEventListener('pointerup', e => e.stopPropagation());
    secondaryEl.addEventListener('pointercancel', () => secondaryGesture.cancel());
    secondaryEl.addEventListener('click', e => {
      e.stopPropagation();
      if (secondaryGesture.complete(current, { secondary: true, keyboard: e.detail === 0, visible: presented })) onActivate({ ...current, action: current.secondary.action });
    });
    leaderEl = document.createElement('i');
    leaderEl.className = 'contextual-action-leader'; leaderEl.hidden = true;
    safeEl = document.createElement('i'); safeEl.className = 'contextual-action-safe-area';
    app.append(leaderEl, safeEl);
    markerEl = document.createElement('i'); markerEl.className = 'contextual-target-marker'; markerEl.hidden = true;
    markerEl.setAttribute('aria-hidden', 'true'); app.appendChild(markerEl);
    // A native click handles touch and mouse exactly once. Keep world gestures
    // from starting underneath this control without globally blocking movement.
    buttonEl.addEventListener('pointerdown', e => { e.stopPropagation(); pressedTarget = current; primaryGesture.begin(current); });
    buttonEl.addEventListener('pointerup', e => e.stopPropagation());
    buttonEl.addEventListener('pointercancel', () => { pressedTarget = null; primaryGesture.cancel(); });
    buttonEl.addEventListener('pointerleave', e => { if (!e.buttons) pressedTarget = null; });
    window.addEventListener('pointerup', e => {
      if (!buttonEl.contains(e.target)) { pressedTarget = null; primaryGesture.cancel(); }
      if (!secondaryEl.contains(e.target)) secondaryGesture.cancel();
    });
    window.addEventListener('blur', hide);
    window.addEventListener('resize', hide);
    document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
    buttonEl.addEventListener('click', e => {
      e.stopPropagation();
      pressedTarget = null;
      if (primaryGesture.complete(current, { keyboard: e.detail === 0, visible: presented })) onActivate(current);
    });
  }

  function setInteraction(info) {
    // info: {id, type, label} or null
    if(current?.id!==info?.id || current?.type!==info?.type)lastPlacement=null;
    current = info;
    if (!buttonEl) return;
    const nextKey = info ? `${info.id}|${info.type}|${info.label}|${!!info.disabled}|${info.nourishment}|${info.growthStage}|${info.secondary?.label}|${info.secondary?.color}|${info.caption}|${info.pairChoice}|${info.bonus}|${JSON.stringify(info.cost ?? info.reward ?? null)}` : "";
    // Countdown/accessibility detail can change without moving or rebuilding a
    // held action. Only its visible label/identity/availability affects layout.
    if (info) {
      const title = info.detail ?? info.label, aria = info.detail ? `${info.label}. ${info.detail}` : info.label;
      if (buttonEl.title !== title) buttonEl.title = title;
      if (buttonEl.getAttribute('aria-label') !== aria) buttonEl.setAttribute('aria-label', aria);
    }
    if (presentationKey === nextKey) return;
    presentationKey = nextKey;
    buttonEl.disabled = info?.disabled === true;
    buttonEl.classList.toggle('nursery-action', (info?.type === 'wildkinBed' && (info.nourishment !== null || info.growthStage != null)) || !!info?.bonus);
    secondaryEl.textContent = info?.secondary?.label ?? '';
    if (info?.secondary?.color) {
      const swatch = document.createElement('i'); swatch.className = 'contextual-action__swatch';
      swatch.style.backgroundColor = info.secondary.color; swatch.setAttribute('aria-hidden', 'true');
      secondaryEl.prepend(swatch);
    }
    captionEl.textContent = info?.caption ?? '';
    for (const el of [buttonEl, secondaryEl]) {
      if (info?.caption) el.setAttribute('aria-describedby', captionEl.id);
      else el.removeAttribute('aria-describedby');
    }
    size = null; layoutTimer = 1; hide();
    if (!info) {

      buttonEl.textContent = "";
      buttonEl.removeAttribute("title");
      buttonEl.removeAttribute("aria-label");
    } else {
      buttonEl.textContent = "";
      markerEl.innerHTML = iconMarkup(interactionIcon(info), { size: 22, label: '' });
      // This is only populated for a real nearby interaction.  Its icon
      // distinguishes a usable cache/gate/companion from ordinary scenery
      // without turning the world into a field of permanent labels.
      const icon = document.createRange().createContextualFragment(iconMarkup(interactionIcon(info), { size: 28, label: "" }));
      icon.firstElementChild?.classList.add("contextual-action__icon");
      const label = document.createElement("span");
      label.className = "contextual-action__label";
      const actionLabel = info.label.split(' — ')[0];
      label.textContent = info.type === 'lootChest' ? ({ 'CHEST EMPTY': 'EMPTY', 'CHEST REFILLING': 'REFILLING' }[actionLabel] ?? actionLabel) : actionLabel;
      buttonEl.append(icon, label);
      if (['campYard','rootfall','wildkinBed','berryGarden'].includes(info.type) && (info.cost || info.reward)) {
        const costs=document.createElement('small');costs.className='contextual-action__cost';
        for(const [id,count] of Object.entries(info.cost || info.reward)) {
          const item=document.createElement('span');
          item.append(document.createRange().createContextualFragment(iconMarkup(id,{size:20,label:id})),document.createTextNode(String(count)));
          costs.append(item);
        }
        label.append(costs);
      }
      if (info.type === 'wildkinBed' && (info.nourishment !== null || info.growthStage != null)) {
        const dots = document.createElement('small'); dots.className = 'contextual-action__nourishment'; dots.setAttribute('aria-hidden','true');
        for (let i=0;i<3;i++) { const dot=document.createElement('i'); dot.className=i<(info.growthStage ?? info.nourishment)?'filled':''; dots.append(dot); }
        label.append(dots);
      }
      if (info.bonus) {
        const bonus=document.createElement('small');bonus.className='contextual-action__bonus';bonus.textContent=info.bonus;label.append(bonus);
      }

    }
  }

  function update(dt, { hidden = false } = {}) {
    if (!buttonEl || !current || hidden) { hide(); return; }
    const anchor = opts.anchor?.getPoint(current);
    if (!anchor) { hide(); return; }
    const frame = app.getBoundingClientRect();
    const pinned = current.type === 'cliffClimb' && current.action === 'drop';
    const point = projectInteractionPoint(anchor, opts.camera, frame.width, frame.height)
      ?? (pinned ? {x:frame.width*.5,y:frame.height*.55} : null);
    if (!point || (!pinned && opts.anchor.isOccluded(opts.camera, anchor, dt))) { hide(); return; }
    buttonEl.hidden = false;
    secondaryEl.hidden = !current.secondary;
    captionEl.hidden = !current.caption;
    const portrait = frame.width < frame.height;
    const statusOnly = portrait && current.disabled === true;
    buttonEl.classList.toggle('portrait-context-status', statusOnly);
    setPresented(true, portrait && !statusOnly);
    if (portrait) {
      // Fixed thumb controls share the existing transaction owner. The small
      // world marker identifies the live target without laying a panel over it.
      markerEl.hidden = statusOnly || pinned; leaderEl.hidden = true;
      markerEl.style.left = `${point.x}px`; markerEl.style.top = `${point.y}px`;
      buttonEl.style.left = ''; buttonEl.style.top = '';
      if (statusOnly) {
        buttonEl.style.setProperty('--context-x', `${Math.max(8,Math.min(frame.width-116,point.x-54))}px`);
        buttonEl.style.setProperty('--context-y', `${Math.max(8,point.y-44)}px`);
      }
      secondaryEl.style.left = ''; secondaryEl.style.top = '';
      captionEl.style.left = ''; captionEl.style.top = '';
      size = null; lastPlacement = null;
      return;
    }
    markerEl.hidden = true;
    // Let Go is a player-state control. A large cliff's body envelope must
    // never hide the only release action when the phone turns sideways.
    if (pinned) {
      leaderEl.hidden = true;
      buttonEl.style.left = `${Math.max(8, frame.width - buttonEl.offsetWidth - 18)}px`;
      buttonEl.style.top = `${Math.max(8, frame.height - buttonEl.offsetHeight - 20)}px`;
      size = null; lastPlacement = null;
      return;
    }
    const captionHeight = current.caption ? captionEl.offsetHeight + 6 : 0;
    if (!size) size = { width: Math.max(buttonEl.offsetWidth, current.secondary ? secondaryEl.offsetWidth : 0, current.caption ? captionEl.offsetWidth : 0), height: captionHeight + buttonEl.offsetHeight + (current.secondary ? secondaryEl.offsetHeight + 5 : 0) };
    layoutTimer += dt;
    // This only projects eight cached corners; moving body bounds must track
    // the same frame as the anchor, independently of throttled DOM layout.
    bodyRectangle = opts.anchor.getBodyRectangle?.(opts.camera, frame.width, frame.height) ?? null;
    if (layoutTimer >= .1) {
      layoutTimer = 0;
      const selectors = current.type === 'bond' || current.type === 'companion' ? `${protectedSelectors},#frontier-indicators>div` : protectedSelectors;
      obstacles = [...app.querySelectorAll(selectors)].filter(el => {
        if (el.hidden || !el.getClientRects().length) return false;
        const style = getComputedStyle(el);
        return style.display !== 'none' && Number(style.opacity) > .05;
      }).map(el => {
        const r = el.getBoundingClientRect();
        return { left: r.left - frame.left, right: r.right - frame.left, top: r.top - frame.top, bottom: r.bottom - frame.top };
      });
    }
    const safe = safeEl.getBoundingClientRect();
    const playerPosition = opts.getPlayerPosition?.();
    const playerPoint = playerPosition && projectInteractionPoint(playerPosition, opts.camera, frame.width, frame.height);
    const protectedAreas = playerPoint ? [...obstacles, { left: playerPoint.x - 25, right: playerPoint.x + 25, top: playerPoint.y - 48, bottom: playerPoint.y + 25 }] : obstacles;
    if (opts.anchor.hasBodyEnvelope?.() && !bodyRectangle) { hide(); return; }
    // Preserve a valid held target even if its body moves through a different
    // placement candidate while the finger is down. Visibility still wins above.
    if (pressedTarget?.id === current.id && pressedTarget?.type === current.type) return;
    const preferred = lastPlacement ? {left:lastPlacement.left+point.x-lastPlacement.anchorX,top:lastPlacement.top+point.y-lastPlacement.anchorY} : null;
    const position = placeInteractionLabel(point, size, { left: safe.left - frame.left, right: safe.right - frame.left, top: safe.top - frame.top, bottom: safe.bottom - frame.top }, protectedAreas, bodyRectangle, preferred);
    if (!position) { hide(); return; }
    lastPlacement={left:position.left,top:position.top,anchorX:point.x,anchorY:point.y};
    // Hold the touch target under the finger until release; don't chase a
    // moving creature midway through the user's tap.
    buttonEl.style.left = `${position.left}px`; buttonEl.style.top = `${position.top + captionHeight}px`;
    if (current.caption) { captionEl.style.left = `${position.left}px`; captionEl.style.top = `${position.top}px`; }
    if (current.secondary) { secondaryEl.style.left = `${position.left}px`; secondaryEl.style.top = `${position.top + captionHeight + buttonEl.offsetHeight + 5}px`; }
    const dx = point.x - position.endX, dy = point.y - position.endY;
    leaderEl.style.left = `${position.endX}px`; leaderEl.style.top = `${position.endY}px`;
    leaderEl.style.width = `${Math.hypot(dx, dy)}px`;
    leaderEl.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    leaderEl.hidden = false;
  }

  function getCurrent() { return current; }
  function isAvailable() { return presented && !!current && !current.disabled; }
  function activate() {
    if (isAvailable()) onActivate(current);
  }

  // desktop E key handling — caller should call handleKey in global keydown
  function handleKey(e) {
    if (e.key.toLowerCase() !== "e") return false;
    if (!isAvailable()) return false;
    // don't trigger if focused in input
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || document.activeElement?.isContentEditable) return false;
    e.preventDefault();
    onActivate(current);
    return true;
  }

  const canPresent = info => {
    const next = opts.getResidency?.();
    if (next !== residency) { residency = next; invalidate(); }
    return !!info && opts.anchor.canPresent(info, opts.camera);
  };
  function invalidate() { opts.anchor.invalidate(); hide(); }
  return { update, setInteraction, getCurrent, isAvailable, activate, handleKey, canPresent, invalidate, element: buttonEl };
}
