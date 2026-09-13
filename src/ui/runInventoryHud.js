// Compact icon-only carried inventory. Values remain owned by pickupSystem.
import { getOrCreateHudStack } from "./hudStack.js";
import { getResourceDrops } from "../resources/resourceDropCatalog.js";
import { getCarriedXpViewModel } from "./progressionModels.js";
import { iconMarkup } from "./itemIcons.js";

export const RUN_INVENTORY_RECENT_MS = 2200;

// Owns the HUD's short presentation callbacks so refreshed pulses and teardown
// cannot leave stale expiry or floating-gain work behind.
function createRunInventoryHudTiming({
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout,
  requestFrame = globalThis.requestAnimationFrame,
  cancelFrame = globalThis.cancelAnimationFrame,
} = {}) {
  const recent = new Map(), gains = new Set();
  function clearRecent(row) {
    const timer = recent.get(row);
    if (timer !== undefined) clearTimeoutFn(timer);
    recent.delete(row);
    row?.classList?.remove("is-recent");
  }
  function showRecent(row) {
    if (!row) return;
    clearRecent(row);
    row.classList.add("is-recent");
    const timer = setTimeoutFn(() => {
      if (recent.get(row) !== timer) return;
      recent.delete(row);
      row.classList.remove("is-recent");
    }, RUN_INVENTORY_RECENT_MS);
    recent.set(row, timer);
  }
  function showGain(element) {
    const record = { element, frame: null, timer: null };
    gains.add(record);
    record.frame = requestFrame(() => {
      record.frame = null;
      element.classList.add("show");
    });
    record.timer = setTimeoutFn(() => {
      record.timer = null;
      if (record.frame !== null) cancelFrame?.(record.frame);
      record.frame = null;
      element.remove();
      gains.delete(record);
    }, 700);
  }
  function destroy() {
    for (const row of [...recent.keys()]) clearRecent(row);
    for (const record of gains) {
      if (record.frame !== null) cancelFrame?.(record.frame);
      if (record.timer !== null) clearTimeoutFn(record.timer);
      record.element.remove();
    }
    gains.clear();
  }
  return Object.freeze({ showRecent, clearRecent, showGain, destroy });
}

export function createRunInventoryHud(resourceDrops, { timingOptions } = {}) {
  const hud = document.getElementById("hud");
  if (!hud) return { update() {}, pulse() {}, pulseXp() {}, element: null, destroy() {} };
  const timing = createRunInventoryHudTiming(timingOptions);
  const stack = getOrCreateHudStack() || hud;
  const container = document.createElement("div");
  container.id = "run-inventory-hud";
  container.setAttribute("aria-label", "Carried resources"); container.hidden = true;
  stack.appendChild(container);
  const drops = getResourceDrops(resourceDrops);
  const rows = {};
  function makeRow(drop) {
    const row = document.createElement("div");
    row.className = "run-inventory-hud__item"; row.dataset.resource = drop.id; row.title = drop.displayName;
    row.innerHTML = `${iconMarkup(drop.id, { size: 26, label: drop.displayName })}<b data-count>0</b>`;
    container.appendChild(row); return row;
  }
  for (const drop of drops) rows[drop.id] = makeRow(drop);
  rows.xp = makeRow({ id: "xp", displayName: "Unsecured XP" });
  function spawnFloating(resourceId) {
    const row = rows[resourceId]; if (!row) return;
    const el = document.createElement("i"); el.className = "run-inventory-hud__gain"; el.textContent = "+1"; row.appendChild(el);
    timing.showGain(el);
  }
  function pulse(resourceId) {
    const row = rows[resourceId];
    if (!row || row.hidden) return;
    timing.showRecent(row);
    row.classList.remove("pulse"); void row.offsetWidth; row.classList.add("pulse");
    spawnFloating(resourceId);
  }
  function update(inventory, carriedXp = 0) {
    container.hidden = false;
    const xp = getCarriedXpViewModel(carriedXp);
    for (const [id,row] of Object.entries(rows)) {
      const value = id === "xp" ? xp.count : Math.max(0, Number(inventory?.[id]) || 0);
      row.querySelector("[data-count]").textContent = String(value);
      row.hidden = value <= 0;
      if (row.hidden) timing.clearRecent(row);
    }
  }
  return { update, pulse, pulseXp: () => pulse("xp"), spawnFloating, rows, element: container,
    destroy: () => { timing.destroy(); container.remove(); } };
}
