// src/ui/runResultCard.js — recovery/loss card over Camp (Phase 4A)

export function createRunResultCard(opts = {}) {
  const app = document.getElementById("app");
  if (!app) return { show(){}, hide(){}, isVisible:()=>false, destroy(){} };
  const onContinue = opts.onContinue ?? (()=>{});

  const overlay = document.createElement("div");
  overlay.id = "run-result-overlay";
  overlay.style.cssText = "position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;background:rgba(10,14,22,0.78);backdrop-filter:blur(4px);z-index:23;padding:max(18px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));pointer-events:auto;text-align:center;";
  app.appendChild(overlay);

  const card = document.createElement("div");
  card.style.cssText = "background:rgba(14,20,32,0.96);border:1px solid rgba(255,255,255,0.14);border-radius:12px;padding:16px 14px 14px;min-width:min(360px, 92vw);max-width:92vw;color:#e6ebf5;box-shadow:0 8px 28px rgba(0,0,0,0.45);";
  overlay.appendChild(card);

  const titleEl = document.createElement("div");
  titleEl.style.cssText = "font-size:18px;font-weight:900;letter-spacing:0.06em;margin-bottom:10px;";
  card.appendChild(titleEl);

  const bodyEl = document.createElement("div");
  bodyEl.style.cssText = "font-size:13px;line-height:1.55;color:rgba(230,235,245,0.90);background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px;margin-bottom:12px;text-align:left;";
  card.appendChild(bodyEl);

  const bankEl = document.createElement("div");
  bankEl.style.cssText = "font-size:11px;color:rgba(230,235,245,0.65);margin-bottom:12px;";
  card.appendChild(bankEl);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "CONTINUE";
  btn.style.cssText = "appearance:none;border:none;background:#2f7d32;color:#eaffea;font-size:14px;font-weight:900;letter-spacing:0.04em;padding:10px 18px;border-radius:10px;cursor:pointer;min-width:140px;";
  card.appendChild(btn);

  let visible = false;

  function show(data) {
    // data: { type: "extracted"|"lost", snapshot: { cargo, xp, kills?, newWaypoints?, newBeacons? }, bankedResources, bankedXp, frontierProgress? }
    const isExtract = data.type === "extracted";
    titleEl.textContent = isExtract ? "EXPEDITION COMPLETE" : "EXPEDITION LOST";
    titleEl.style.color = isExtract ? "#8fe08e" : "#ff6b6b";
    const cargo = data.snapshot?.cargo ?? data.cargo ?? { wood:0, stone:0, fiber:0 };
    const xp = data.snapshot?.xp ?? data.xp ?? 0;
    const newWps = data.snapshot?.newWaypoints ?? data.newWaypoints ?? [];
    const newBcs = data.snapshot?.newBeacons ?? data.newBeacons ?? [];

    let html = "";
    if (isExtract) html += `<div style="font-weight:800;margin-bottom:6px;">Recovered</div>`;
    else html += `<div style="font-weight:800;margin-bottom:6px;">Lost</div>`;
    const rows = [];
    if (cargo.wood) rows.push(`Wood <strong>+${cargo.wood}</strong>`); else if (!isExtract && cargo.wood===0) {} else if (isExtract && cargo.wood===0) {}
    // For extracted, show +; for lost, show without +
    const fmt = (label, val) => {
      if (!val) return null;
      return `<div style="display:flex;justify-content:space-between;"><span>${label}</span><span>${isExtract ? "+" : ""}${val}</span></div>`;
    };
    const lines = [];
    const wLine = fmt("Wood", cargo.wood);
    const sLine = fmt("Stone", cargo.stone);
    const fLine = fmt("Fiber", cargo.fiber);
    const xpLine = fmt("XP", xp);
    if (wLine) lines.push(wLine);
    if (sLine) lines.push(sLine);
    if (fLine) lines.push(fLine);
    if (xpLine) lines.push(xpLine);
    if (lines.length === 0) lines.push(`<div style="color:rgba(230,235,245,0.65)">No resources carried</div>`);
    html += lines.join("");

    if (newWps.length || newBcs.length) {
      html += `<div style="margin-top:10px;font-weight:800;">Frontier Progress</div>`;
      for (const wp of newWps) {
        const regName = data.regionNames?.[wp] ?? wp;
        html += `<div>New Waypoint: ${regName}</div>`;
      }
      for (const bc of newBcs) html += `<div>Beacon discovered: ${bc}</div>`;
      if (isExtract) {} else {
        html += `<div style="margin-top:6px;color:#8fe08e;">Frontier Progress Kept</div>`;
      }
    } else if (!isExtract) {
      // still show kept progress header if none new? Show nothing
    }

    bodyEl.innerHTML = html;

    if (data.bankedResources) {
      bankEl.textContent = `Banked Total — Wood ${data.bankedResources.wood} · Stone ${data.bankedResources.stone} · Fiber ${data.bankedResources.fiber} · XP ${data.bankedXp ?? 0}`;
    } else {
      bankEl.textContent = "";
    }

    overlay.style.display = "flex";
    visible = true;
  }

  function hide() {
    overlay.style.display = "none";
    visible = false;
  }

  btn.addEventListener("click", () => { hide(); onContinue(); });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) { /* ignore */ } });

  return {
    show,
    hide,
    isVisible: () => visible,
    element: overlay,
    button: btn,
    destroy: () => overlay.remove(),
  };
}
