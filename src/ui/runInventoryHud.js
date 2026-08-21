// src/ui/runInventoryHud.js — compact Wood/Stone/Fiber HUD counters
export function createRunInventoryHud() {
  // create container inserted into #hud
  const hud = document.getElementById("hud");
  if (!hud) return { update() {}, pulse() {}, element: null };

  const container = document.createElement("div");
  container.id = "run-inventory-hud";
  container.style.cssText = "position:absolute;left:50%;top:8px;transform:translateX(-50%);display:flex;gap:8px;pointer-events:none;z-index:4;";
  hud.appendChild(container);

  function makeBadge(label, color) {
    const el = document.createElement("div");
    el.style.cssText = `background:rgba(14,20,32,0.86);color:#e6ebf5;border:1px solid rgba(255,255,255,0.13);border-radius:10px;padding:6px 8px;font-size:12px;line-height:1;text-align:center;min-width:56px;backdrop-filter:blur(6px);transition:transform 0.18s, background 0.18s;`;
    el.innerHTML = `<div style="font-weight:700;letter-spacing:0.02em;font-size:11px;opacity:0.95">${label}</div><div style="font-size:14px;font-weight:800;margin-top:2px"><span data-count>0</span></div><div style="width:10px;height:10px;border-radius:50%;background:${color};margin:4px auto 0;box-shadow:0 0 6px ${color}99"></div>`;
    container.appendChild(el);
    return el;
  }

  const badges = {
    wood: makeBadge("WOOD", "#8d5a2b"),
    stone: makeBadge("STONE", "#9a9a9a"),
    fiber: makeBadge("FIBER", "#6abf69"),
  };

  // floating +1 text
  function spawnFloating(resourceId) {
    const colors = { wood: "#c9a86a", stone: "#d0d0d0", fiber: "#8fe08e" };
    const names = { wood: "+1 Wood", stone: "+1 Stone", fiber: "+1 Fiber" };
    const el = document.createElement("div");
    el.textContent = names[resourceId] ?? "+1";
    el.style.cssText = `position:absolute;left:50%;top:42px;transform:translateX(-50%) translateY(0);font-size:12px;font-weight:800;color:${colors[resourceId] ?? "#fff"};text-shadow:0 1px 6px rgba(0,0,0,0.6);opacity:0;pointer-events:none;transition:transform 0.6s ease-out, opacity 0.6s;z-index:6;`;
    hud.appendChild(el);
    requestAnimationFrame(() => {
      el.style.transform = "translateX(-50%) translateY(-18px)";
      el.style.opacity = "1";
    });
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateX(-50%) translateY(-28px)";
      setTimeout(() => el.remove(), 650);
    }, 520);
  }

  function pulse(resourceId) {
    const badge = badges[resourceId];
    if (!badge) return;
    badge.style.transform = "scale(1.14)";
    badge.style.background = "rgba(255,255,255,0.12)";
    setTimeout(() => {
      badge.style.transform = "scale(1)";
      badge.style.background = "rgba(14,20,32,0.86)";
    }, 180);
    spawnFloating(resourceId);
  }

  function update(inventory) {
    for (const key of ["wood", "stone", "fiber"]) {
      const badge = badges[key];
      const span = badge?.querySelector("[data-count]");
      if (span) span.textContent = String(inventory[key] ?? 0);
    }
  }

  function destroy() {
    container.remove();
  }

  return { update, pulse, spawnFloating, badges, element: container, destroy };
}
