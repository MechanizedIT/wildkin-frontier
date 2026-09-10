// Compact icon-only carried inventory. Values remain owned by pickupSystem.
import { getOrCreateHudStack } from "./hudStack.js";
import { getResourceDrops } from "../resources/resourceDropCatalog.js";
import { getCarriedXpViewModel } from "./progressionModels.js";
import { iconMarkup } from "./itemIcons.js";

export function createRunInventoryHud(resourceDrops) {
  const hud = document.getElementById("hud");
  if (!hud) return { update() {}, pulse() {}, element: null };
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
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => el.remove(), 700);
  }
  function pulse(resourceId) { const row = rows[resourceId]; if (!row) return; row.classList.remove("pulse"); void row.offsetWidth; row.classList.add("pulse"); spawnFloating(resourceId); }
  function update(inventory, carriedXp = 0) { container.hidden = false; const xp = getCarriedXpViewModel(carriedXp); for (const [id,row] of Object.entries(rows)) { const value = id === "xp" ? xp.count : Math.max(0, Number(inventory?.[id]) || 0); row.querySelector("[data-count]").textContent = String(value); row.hidden = value <= 0; } }
  return { update, pulse, pulseXp: () => pulse("xp"), spawnFloating, rows, element: container, destroy: () => container.remove() };
}
