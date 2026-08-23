// src/ui/anchorPrompt.js — EXTRACT / KEEP GOING prompt for Waypoint/Beacon/Gate return (Phase 4A)

export function createAnchorPrompt(opts = {}) {
  const app = document.getElementById("app");
  if (!app) return { show(){}, hide(){}, isVisible:()=>false, destroy(){} };
  const onExtract = opts.onExtract ?? (()=>{});
  const onKeepGoing = opts.onKeepGoing ?? (()=>{});

  const overlay = document.createElement("div");
  overlay.id = "anchor-prompt-overlay";
  overlay.style.cssText = "position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;background:rgba(10,14,22,0.58);backdrop-filter:blur(3px);z-index:21;padding:max(18px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));pointer-events:auto;text-align:center;";
  app.appendChild(overlay);

  const card = document.createElement("div");
  card.style.cssText = "background:rgba(14,20,32,0.96);border:1px solid rgba(255,255,255,0.14);border-radius:12px;padding:16px 14px 14px;min-width:min(340px, 92vw);max-width:92vw;color:#e6ebf5;box-shadow:0 8px 28px rgba(0,0,0,0.45);";
  overlay.appendChild(card);

  const titleEl = document.createElement("div");
  titleEl.style.cssText = "font-size:16px;font-weight:900;letter-spacing:0.06em;margin-bottom:8px;";
  card.appendChild(titleEl);

  const summaryEl = document.createElement("div");
  summaryEl.style.cssText = "font-size:12px;line-height:1.5;color:rgba(230,235,245,0.85);background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:8px 10px;margin-bottom:12px;";
  card.appendChild(summaryEl);

  const btnRow = document.createElement("div");
  btnRow.style.cssText = "display:flex;gap:10px;justify-content:center;";
  card.appendChild(btnRow);

  const extractBtn = document.createElement("button");
  extractBtn.type = "button";
  extractBtn.style.cssText = "appearance:none;border:none;background:#2f7d32;color:#eaffea;font-size:14px;font-weight:900;letter-spacing:0.04em;padding:10px 18px;border-radius:10px;cursor:pointer;flex:1;max-width:150px;";
  btnRow.appendChild(extractBtn);

  const keepBtn = document.createElement("button");
  keepBtn.type = "button";
  keepBtn.textContent = "KEEP GOING";
  keepBtn.style.cssText = "appearance:none;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#e6ebf5;font-size:14px;font-weight:800;padding:10px 18px;border-radius:10px;cursor:pointer;flex:1;max-width:150px;";
  btnRow.appendChild(keepBtn);

  let visible = false;
  let current = null; // { id, type }

  function formatCargo(cargo, xp) {
    const parts = [];
    if (cargo.wood) parts.push(`Wood ${cargo.wood}`);
    if (cargo.stone) parts.push(`Stone ${cargo.stone}`);
    if (cargo.fiber) parts.push(`Fiber ${cargo.fiber}`);
    const cargoStr = parts.length ? parts.join(" · ") : "No resources";
    return `${cargoStr} · XP ${xp ?? 0}`;
  }

  function show(data) {
    current = data;
    let title = data.title;
    const dn = data.displayName ? String(data.displayName).toUpperCase() : null;
    if (!title) {
      if (data.type === "majorWaypoint") {
        if (dn) title = data.isNew ? `${dn} ACTIVATED` : `${dn} WAYPOINT`;
        else title = data.isNew ? "WAYPOINT ACTIVATED" : "WAYPOINT";
      } else if (data.type === "extractionBeacon") {
        title = dn ? dn : "EXTRACTION BEACON";
      } else if (data.type === "gate") title = "RETURN TO CAMP";
      else title = dn ?? "FRONTIER ANCHOR";
    }
    titleEl.textContent = title;
    if (data.type === "gate") {
      summaryEl.textContent = `Secure everything you are carrying? — ${formatCargo(data.cargo ?? {wood:0,stone:0,fiber:0}, data.xp ?? 0)}`;
      extractBtn.textContent = "RETURN & SECURE";
    } else if (data.type === "majorWaypoint") {
      const sub = data.isNew ? "New expedition start unlocked. Extract now or keep going?" : "Extract to Camp and secure this run, or keep going?";
      summaryEl.textContent = `${formatCargo(data.cargo ?? {wood:0,stone:0,fiber:0}, data.xp ?? 0)} — ${sub}`;
      extractBtn.textContent = "EXTRACT";
    } else {
      const sub = "Extraction available. Secure this run and return to Camp?";
      summaryEl.textContent = `${formatCargo(data.cargo ?? {wood:0,stone:0,fiber:0}, data.xp ?? 0)} — ${sub}`;
      extractBtn.textContent = "EXTRACT";
    }
    overlay.style.display = "flex";
    visible = true;
  }

  function hide() {
    overlay.style.display = "none";
    visible = false;
    current = null;
  }

  extractBtn.addEventListener("click", () => {
    if (!current) return;
    const cur = current;
    hide();
    onExtract(cur);
  });
  keepBtn.addEventListener("click", () => {
    if (!current) return;
    const cur = current;
    hide();
    onKeepGoing(cur);
  });

  return {
    show,
    hide,
    isVisible: () => visible,
    getCurrent: () => current,
    element: overlay,
    extractButton: extractBtn,
    keepButton: keepBtn,
    destroy: () => overlay.remove(),
  };
}
