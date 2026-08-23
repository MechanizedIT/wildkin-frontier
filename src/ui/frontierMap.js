// src/ui/frontierMap.js — top-right Map with inspect vs start-selection modes (Phase 4A)
// One Map UI, no teleport/start from inspect, only unlocked MajorWaypoints selectable in start mode.

export function createFrontierMap(opts = {}) {
  const worldRegistry = opts.worldRegistry;
  const frontierProgress = opts.frontierProgress;
  const onStartSelected = opts.onStartSelected ?? (() => {});
  const onClose = opts.onClose ?? (() => {});
  const onOpen = opts.onOpen ?? (() => {});

  const app = document.getElementById("app");
  if (!app) return { openInspect(){}, openStartSelection(){}, close(){}, isOpen:()=>false, destroy(){}, setEnabled(){}};

  // Create Map button (top-right)
  let mapButton = document.getElementById("frontier-map-button");
  if (!mapButton) {
    mapButton = document.createElement("button");
    mapButton.id = "frontier-map-button";
    mapButton.type = "button";
    mapButton.textContent = "MAP";
    mapButton.setAttribute("aria-label", "Open Map");
    mapButton.style.cssText = "position:absolute;right:max(10px, env(safe-area-inset-right));top:max(10px, env(safe-area-inset-top));z-index:8;background:rgba(14,20,32,0.88);color:#e6ebf5;border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:7px 12px;font-size:12px;font-weight:800;letter-spacing:0.06em;backdrop-filter:blur(6px);cursor:pointer;pointer-events:auto;";
    app.appendChild(mapButton);
  }

  // Overlay
  const overlay = document.createElement("div");
  overlay.id = "frontier-map-overlay";
  overlay.style.cssText = "position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;background:rgba(10,14,22,0.78);backdrop-filter:blur(4px);z-index:22;padding:max(18px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));pointer-events:auto;";
  app.appendChild(overlay);

  const panel = document.createElement("div");
  panel.id = "frontier-map-panel";
  panel.style.cssText = "background:rgba(14,20,32,0.96);border:1px solid rgba(255,255,255,0.14);border-radius:12px;padding:14px 14px 12px;min-width:min(360px, 92vw);max-width:92vw;max-height:82vh;overflow:auto;color:#e6ebf5;box-shadow:0 8px 28px rgba(0,0,0,0.45);";
  overlay.appendChild(panel);

  const titleEl = document.createElement("div");
  titleEl.style.cssText = "font-size:15px;font-weight:900;letter-spacing:0.06em;margin-bottom:6px;";
  panel.appendChild(titleEl);

  const subtitleEl = document.createElement("div");
  subtitleEl.style.cssText = "font-size:12px;color:rgba(230,235,245,0.72);margin-bottom:10px;";
  panel.appendChild(subtitleEl);

  const listEl = document.createElement("div");
  listEl.style.cssText = "display:flex;flex-direction:column;gap:8px;margin-bottom:12px;";
  panel.appendChild(listEl);

  const actionsEl = document.createElement("div");
  actionsEl.style.cssText = "display:flex;gap:8px;justify-content:flex-end;";
  panel.appendChild(actionsEl);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "CLOSE";
  closeBtn.style.cssText = "appearance:none;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#e6ebf5;font-size:13px;font-weight:700;padding:8px 14px;border-radius:10px;cursor:pointer;";
  actionsEl.appendChild(closeBtn);

  let mode = null; // "inspect" | "startSelection"
  let isOpen = false;
  let enabled = true;

  function setEnabled(v) {
    enabled = !!v;
    // visual disable but keep pointerEvents for layout? Just dim button
    mapButton.style.opacity = enabled ? "1" : "0.45";
    mapButton.style.pointerEvents = enabled ? "auto" : "none";
  }

  function hide() {
    overlay.style.display = "none";
    isOpen = false;
    mode = null;
    onClose();
  }

  function show() {
    overlay.style.display = "flex";
    isOpen = true;
    onOpen(mode);
  }

  function buildList() {
    listEl.innerHTML = "";
    const prog = frontierProgress ? frontierProgress.getState() : { unlockedMajorWaypointIds: [], discoveredBeaconIds: [], hasDepartedOnce: false };
    const gateId = worldRegistry.getFrontierGateId();
    const gatePos = worldRegistry.getFrontierGatePos();
    const waypoints = worldRegistry.getAllWaypoints().filter(w => w.regionId !== "camp" || w.id === "wp_camp_gate");
    // Separate camp gate waypoint vs frontier waypoints
    const frontierWaypoints = worldRegistry.getAllWaypoints().filter(w => w.id !== "wp_camp_gate" && w.regionId !== "camp");
    // For inspect fresh save: hide frontierWaypoints if not departed
    const showFrontierWaypoints = !(mode === "inspect" && !prog.hasDepartedOnce);

    // Gate row always
    const gateRow = document.createElement("div");
    gateRow.style.cssText = "display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:8px 10px;";
    gateRow.innerHTML = `<span style="width:10px;height:10px;background:#c9b48a;border-radius:2px;flex-shrink:0"></span><span style="flex:1;font-size:13px;font-weight:700;">Frontier Gate</span>`;
    listEl.appendChild(gateRow);

    // Camp row
    const camp = worldRegistry.getCamp();
    if (camp) {
      const campRow = document.createElement("div");
      campRow.style.cssText = gateRow.style.cssText;
      campRow.innerHTML = `<span style="width:10px;height:10px;background:#7bb26a;border-radius:50%;flex-shrink:0"></span><span style="flex:1;font-size:13px;font-weight:700;">Camp</span>`;
      listEl.insertBefore(campRow, gateRow);
    }

    if (!showFrontierWaypoints) {
      const unknown = document.createElement("div");
      unknown.style.cssText = "font-size:12px;color:rgba(230,235,245,0.62);background:rgba(255,255,255,0.04);border:1px dashed rgba(255,255,255,0.12);border-radius:10px;padding:8px 10px;";
      unknown.textContent = "Frontier beyond gate — walk through the gate to choose your first expedition start.";
      listEl.appendChild(unknown);
      return;
    }

    // Waypoints
    const wpToShow = frontierWaypoints;
    for (const wp of wpToShow) {
      const unlocked = prog.unlockedMajorWaypointIds.includes(wp.id);
      const label = worldRegistry.getAnchorDisplayName(wp);
      const row = document.createElement("div");
      const isStartMode = mode === "startSelection";
      const selectable = isStartMode && unlocked;
      row.style.cssText = selectable
        ? "display:flex;align-items:center;gap:8px;background:rgba(79,195,247,0.14);border:1px solid rgba(79,195,247,0.35);border-radius:10px;padding:8px 10px;cursor:pointer;"
        : unlocked
          ? "display:flex;align-items:center;gap:8px;background:rgba(79,195,247,0.10);border:1px solid rgba(79,195,247,0.20);border-radius:10px;padding:8px 10px;"
          : "display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:8px 10px;opacity:0.55;";
      const iconColor = unlocked ? "#4fc3f7" : "#888";
      const lockText = unlocked ? (selectable ? "TAP TO START" : "Unlocked") : "Locked";
      row.innerHTML = `<span style="width:10px;height:10px;background:${iconColor};border-radius:2px;flex-shrink:0;transform:rotate(45deg)"></span><span style="flex:1;font-size:13px;font-weight:700;">${label}</span><span style="font-size:11px;font-weight:800;color:${selectable ? '#4fc3f7':'rgba(230,235,245,0.5)'}">${lockText}</span>`;
      if (selectable) {
        row.setAttribute("role", "button");
        row.tabIndex = 0;
        row.addEventListener("click", () => {
          onStartSelected(wp.id);
        });
        row.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { onStartSelected(wp.id); }});
      }
      // In inspect mode, rows are non-interactive even if unlocked
      if (mode === "inspect" && unlocked) {
        // ensure no click
        row.style.cursor = "default";
      }
      listEl.appendChild(row);
    }

    // Beacons (never selectable)
    const beacons = worldRegistry.getAllBeacons();
    const discovered = prog.discoveredBeaconIds;
    for (const bc of beacons) {
      const isDiscovered = discovered.includes(bc.id);
      if (!isDiscovered) continue;
      const label = worldRegistry.getAnchorDisplayName(bc);
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:8px;background:rgba(255,112,67,0.10);border:1px solid rgba(255,112,67,0.18);border-radius:10px;padding:8px 10px;";
      row.innerHTML = `<span style="width:10px;height:10px;background:#ff7043;border-radius:50%;flex-shrink:0"></span><span style="flex:1;font-size:13px;font-weight:700;">${label}</span><span style="font-size:11px;color:rgba(230,235,245,0.45)">Extraction only</span>`;
      listEl.appendChild(row);
    }
    if (discovered.length === 0 && mode === "inspect" && prog.hasDepartedOnce) {
      // no beacons yet
    }

    // Bank summary if available
    if (prog.bankedResources) {
      const total = prog.bankedResources.wood + prog.bankedResources.stone + prog.bankedResources.fiber;
      if (total > 0 || prog.bankedXp > 0) {
        const bankRow = document.createElement("div");
        bankRow.style.cssText = "font-size:11px;color:rgba(230,235,245,0.65);background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:8px 10px;";
        bankRow.textContent = `Banked — Wood ${prog.bankedResources.wood} · Stone ${prog.bankedResources.stone} · Fiber ${prog.bankedResources.fiber} · XP ${prog.bankedXp}`;
        listEl.appendChild(bankRow);
      }
    }
  }

  function openInspect() {
    if (!enabled) return false;
    if (isOpen) return false;
    mode = "inspect";
    titleEl.textContent = "FRONTIER MAP";
    subtitleEl.textContent = "Inspect your frontier progress. Tap CLOSE to return.";
    buildList();
    show();
    return true;
  }

  function openStartSelection() {
    if (isOpen) return false;
    mode = "startSelection";
    titleEl.textContent = "CHOOSE START";
    subtitleEl.textContent = "Select an unlocked Major Waypoint to begin your expedition.";
    buildList();
    show();
    return true;
  }

  function close() {
    if (!isOpen) return false;
    hide();
    return true;
  }

  mapButton.addEventListener("click", () => {
    if (!enabled) return;
    if (isOpen && mode === "inspect") close();
    else if (!isOpen) openInspect();
  });
  closeBtn.addEventListener("click", () => close());
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  return {
    openInspect,
    openStartSelection,
    close,
    isOpen: () => isOpen,
    getMode: () => mode,
    isEnabled: () => enabled,
    setEnabled,
    element: overlay,
    button: mapButton,
    buildList,
    destroy: () => { overlay.remove(); },
  };
}
