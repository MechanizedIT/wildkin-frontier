import { isEditableKeyboardTarget } from '../input/keyboardInput.js';

/** Copy a save on first read, then keep all scout writes in this page only. */
export function createScoutStorage(source) {
  const values = new Map();
  return {
    getItem(key) { if (!values.has(key)) values.set(key, source.getItem(key)); return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.set(key, null); },
  };
}

export function createScoutSession({ enabled, app, keyboard, canControl, getGroundHeight, onToggle = () => {} }) {
  if (!enabled) return { getFlightOptions: () => null, isFlying: () => false, destroy() {} };
  let flying = true, lift = 0;
  const bar = document.createElement('div');
  bar.dataset.uiControl = 'scout'; bar.id = 'scout-controls';
  bar.style.cssText = 'position:absolute;left:50%;top:160px;transform:translateX(-50%);z-index:9;width:min(460px,calc(100% - 24px));padding:8px 10px;border:1px solid #ffd184;border-radius:12px;background:#102e37ef;color:#fff2cc;font:12px system-ui;text-align:center;pointer-events:auto;';
  bar.innerHTML = '<b>SCOUT · progress is not saved</b><div style="display:flex;gap:5px;justify-content:center;margin:6px 0"><button id="scout-flight" type="button">Flight ON (G)</button><button id="scout-up" type="button" aria-label="Hold to fly up">↑ Up (Space)</button><button id="scout-down" type="button" aria-label="Hold to fly down">↓ Down (C)</button><button id="scout-exit" type="button">Exit scout</button></div><small>WASD / joystick · Space/C up/down · Shift faster · drag right side to look</small>';
  for (const button of bar.querySelectorAll('button')) button.style.cssText = 'border:1px solid #a1bab1;background:#20454b;color:#fff4d8;border-radius:6px;min-height:34px;padding:5px 8px;font:inherit;cursor:pointer;';
  app.appendChild(bar);
  const toggleButton = bar.querySelector('#scout-flight');
  const clear = () => { lift = 0; };
  const toggle = () => { if (!canControl()) return; flying = !flying; clear(); onToggle(); toggleButton.textContent = flying ? 'Flight ON (G)' : 'Walk · protected (G)'; toggleButton.setAttribute('aria-pressed', String(flying)); };
  toggleButton.setAttribute('aria-pressed', 'true'); toggleButton.onclick = toggle;
  const onKey = event => { if (event.code === 'KeyG' && !event.repeat && !isEditableKeyboardTarget(event.target) && !isEditableKeyboardTarget(document.activeElement)) { event.preventDefault(); toggle(); } };
  for (const [id, value] of [['scout-up', 1], ['scout-down', -1]]) {
    const button = bar.querySelector('#' + id);
    button.onpointerdown = event => { if (!canControl() || !flying) return; event.preventDefault(); button.setPointerCapture(event.pointerId); lift = value; };
    button.onpointerup = clear; button.onpointercancel = clear; button.onlostpointercapture = clear;
  }
  bar.querySelector('#scout-exit').onclick = () => { clear(); const url = new URL(location.href); url.searchParams.delete('scout'); location.assign(url.href); };
  window.addEventListener('keydown', onKey); window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear);
  return {
    isFlying: () => flying,
    getFlightOptions() {
      if (!flying) return null;
      if (!canControl()) { clear(); return null; }
      const input = keyboard.getFlightIntent();
      return { vertical: Math.max(-1, Math.min(1, input.vertical + lift)), fast: input.fast, floorAt: getGroundHeight };
    },
    destroy() { clear(); bar.remove(); window.removeEventListener('keydown', onKey); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear); },
  };
}
