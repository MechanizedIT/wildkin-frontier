// src/ui/runInventoryHud.js — compact upper-left icon+count list (Phase 4A: hide zeros, upper-left, readable carry)
import { getOrCreateHudStack } from "./hudStack.js";
export function createRunInventoryHud() {
  const hud = document.getElementById("hud");
  if (!hud) return { update() {}, pulse() {}, element: null };

  const stack = getOrCreateHudStack() || hud;
  const container = document.createElement("div");
  container.id = "run-inventory-hud";
  container.style.cssText = "display:flex;flex-direction:column;gap:6px;pointer-events:none;align-items:flex-start;max-height:32vh;overflow:auto;";
  // ensure stack children pointerEvents handling
  container.style.pointerEvents = "none";
  stack.appendChild(container);

  const iconSvg = {
    wood: '<div style="width:16px;height:16px;background:#8d5a2b;border-radius:2px;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.2)"></div>',
    stone: '<div style="width:14px;height:14px;background:#9a9a9a;border-radius:3px;transform:rotate(12deg);box-shadow:inset 0 0 0 1px rgba(0,0,0,0.2)"></div>',
    fiber: '<div style="width:15px;height:15px;background:#6abf69;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.18)"></div>',
  };

  function makeRow(key, color) {
    const row = document.createElement("div");
    row.dataset.resource = key;
    row.style.cssText = `display:flex;align-items:center;gap:8px;background:rgba(14,20,32,0.86);color:#e6ebf5;border:1px solid rgba(255,255,255,0.13);border-radius:10px;padding:5px 9px;min-width:78px;backdrop-filter:blur(6px);transition:transform 0.18s, background 0.18s;justify-content:flex-end;`;
    row.innerHTML = `<span class="inv-icon" style="display:flex;align-items:center">${iconSvg[key]}</span><span data-count style="font-size:14px;font-weight:800;min-width:18px;text-align:right">0</span>`;
    container.appendChild(row);
    return row;
  }

  const rows = {
    wood: makeRow("wood", "#8d5a2b"),
    stone: makeRow("stone", "#9a9a9a"),
    fiber: makeRow("fiber", "#6abf69"),
  };

  function spawnFloating(resourceId) {
    const row = rows[resourceId];
    if (!row) return;
    const colors = { wood: "#c9a86a", stone: "#d0d0d0", fiber: "#8fe08e" };
    const el = document.createElement("div");
    el.textContent = "+1";
    el.style.cssText = `position:absolute;right:0;top:50%;transform:translateY(-50%) translateX(0);font-size:11px;font-weight:800;color:${colors[resourceId] ?? "#fff"};background:rgba(14,20,32,0.72);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:2px 5px;opacity:0;pointer-events:none;transition:transform 0.55s ease-out, opacity 0.55s;z-index:6;`;
    row.style.position = "relative";
    row.appendChild(el);
    requestAnimationFrame(() => {
      el.style.transform = "translateY(-50%) translateX(8px) translateY(-12px)";
      el.style.opacity = "1";
    });
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(-50%) translateX(8px) translateY(-20px)";
      setTimeout(() => el.remove(), 620);
    }, 500);
  }

  function pulse(resourceId) {
    const row = rows[resourceId];
    if (!row) return;
    row.style.transform = "scale(1.12)";
    row.style.background = "rgba(255,255,255,0.14)";
    setTimeout(() => {
      row.style.transform = "scale(1)";
      row.style.background = "rgba(14,20,32,0.86)";
    }, 180);
    spawnFloating(resourceId);
  }

  function update(inventory) {
    for (const key of ["wood", "stone", "fiber"]) {
      const row = rows[key];
      const span = row?.querySelector("[data-count]");
      const val = inventory[key] ?? 0;
      if (span) span.textContent = String(val);
      if (row) row.style.display = val > 0 ? "flex" : "none";
    }
  }

  function destroy() {
    container.remove();
  }

  return { update, pulse, spawnFloating, rows, element: container, destroy };
}
