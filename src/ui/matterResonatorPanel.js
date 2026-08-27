// src/ui/matterResonatorPanel.js — compact Camp-only Matter Attractor I purchase.

import { MATTER_ATTRACTOR_I, canAffordMatterAttractorI, getMatterAttractorMissing } from "../progression/matterAttractor.js";
import { getResourceDrops } from "../resources/resourceDropCatalog.js";

export function createMatterResonatorPanel(opts = {}) {
  const app = document.getElementById("app");
  if (!app) return { show(){}, hide(){}, refresh(){}, isVisible:()=>false, destroy(){} };
  const frontierProgress = opts.frontierProgress;
  const onPurchase = opts.onPurchase ?? (() => ({ purchased: false, reason: "unavailable" }));
  const onClose = opts.onClose ?? (() => {});
  const drops = getResourceDrops(opts.resourceDrops);
  const names = new Map(drops.map((drop) => [drop.id, drop.displayName]));

  const overlay = document.createElement("div");
  overlay.id = "matter-resonator-overlay";
  overlay.style.cssText = "position:absolute;inset:0;display:none;align-items:flex-end;justify-content:center;background:rgba(10,14,22,0.44);z-index:22;padding:0 max(14px,env(safe-area-inset-right)) max(18px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left));pointer-events:auto;";
  app.appendChild(overlay);

  const panel = document.createElement("div");
  panel.style.cssText = "width:min(390px,96%);background:rgba(14,20,32,0.97);border:1px solid rgba(109,229,239,0.38);border-radius:14px;padding:14px;color:#e6ebf5;box-shadow:0 10px 30px rgba(0,0,0,0.5);";
  overlay.appendChild(panel);

  const top = document.createElement("div");
  top.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;";
  panel.appendChild(top);

  const title = document.createElement("div");
  title.textContent = "MATTER RESONATOR";
  title.style.cssText = "font-size:13px;font-weight:900;letter-spacing:0.12em;color:#6de5ef;";
  top.appendChild(title);

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "CLOSE";
  close.style.cssText = "border:0;background:transparent;color:rgba(230,235,245,0.72);font-size:11px;font-weight:800;padding:6px;cursor:pointer;";
  top.appendChild(close);

  const upgradeName = document.createElement("div");
  upgradeName.textContent = MATTER_ATTRACTOR_I.displayName;
  upgradeName.style.cssText = "font-size:18px;font-weight:900;margin-bottom:4px;";
  panel.appendChild(upgradeName);

  const description = document.createElement("div");
  description.textContent = MATTER_ATTRACTOR_I.description;
  description.style.cssText = "font-size:12px;line-height:1.4;color:rgba(230,235,245,0.78);margin-bottom:10px;";
  panel.appendChild(description);

  const costEl = document.createElement("div");
  costEl.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;";
  panel.appendChild(costEl);

  const status = document.createElement("div");
  status.style.cssText = "min-height:18px;font-size:11px;color:rgba(230,235,245,0.72);margin-bottom:8px;";
  panel.appendChild(status);

  const sync = document.createElement("button");
  sync.type = "button";
  sync.textContent = "SYNC";
  sync.style.cssText = "width:100%;border:0;border-radius:10px;background:#2f7d32;color:#eaffea;font-size:14px;font-weight:900;letter-spacing:0.08em;padding:11px 16px;cursor:pointer;";
  panel.appendChild(sync);

  let visible = false;

  function refresh(message = "") {
    const state = frontierProgress?.getState?.() ?? { bankedResources: {}, matterAttractorI: false };
    const owned = !!state.matterAttractorI;
    const bank = state.bankedResources ?? {};
    costEl.replaceChildren();
    for (const [id, required] of Object.entries(MATTER_ATTRACTOR_I.cost)) {
      const have = bank[id] ?? 0;
      const chip = document.createElement("div");
      chip.textContent = `${names.get(id) ?? id} ${have}/${required}`;
      chip.style.cssText = `border-radius:999px;padding:5px 8px;font-size:11px;font-weight:800;background:${have >= required ? "rgba(47,125,50,0.34)" : "rgba(158,93,42,0.34)"};border:1px solid ${have >= required ? "rgba(143,224,142,0.35)" : "rgba(255,179,107,0.35)"};`;
      costEl.appendChild(chip);
    }

    if (owned) {
      status.textContent = message || "Synchronized. Pickup attraction is enhanced on every expedition.";
      status.style.color = "#8fe08e";
      sync.textContent = "SYNCHRONIZED";
      sync.disabled = true;
      sync.style.opacity = "0.68";
    } else {
      const affordable = canAffordMatterAttractorI(bank);
      const missing = getMatterAttractorMissing(bank);
      status.textContent = message || (affordable
        ? "Recovered matter is ready to synchronize."
        : `Missing ${Object.entries(missing).map(([id, amount]) => `${names.get(id) ?? id} ${amount}`).join(" · ")}`);
      status.style.color = affordable ? "#8fe08e" : "rgba(230,235,245,0.72)";
      sync.textContent = affordable ? "SYNC" : "NEED MATERIALS";
      sync.disabled = !affordable;
      sync.style.opacity = affordable ? "1" : "0.55";
    }
  }

  function show() {
    refresh();
    overlay.style.display = "flex";
    visible = true;
  }

  function hide() {
    overlay.style.display = "none";
    visible = false;
    onClose();
  }

  close.addEventListener("click", hide);
  sync.addEventListener("click", () => {
    if (sync.disabled) return;
    const result = onPurchase();
    refresh(result?.purchased ? "Matter Attractor I synchronized. Your next run will pull pickups sooner." : "Synchronization failed; no matter was spent.");
  });

  return { show, hide, refresh, isVisible: () => visible, element: overlay, destroy: () => overlay.remove() };
}

