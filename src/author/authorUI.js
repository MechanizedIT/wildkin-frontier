// src/author/authorUI.js — minimal desktop Author Mode panel (Phase 3.5B)

export function createAuthorUI(opts) {
  const draftApi = opts.draftApi;
  const onPlay = opts.onPlay;
  const onValidate = opts.onValidate;
  const onSelectRegion = opts.onSelectRegion;
  const worldRegistry = opts.worldRegistry; // for region list
  let selectedId = null;
  let editMode = false; // false = Play, true = Edit

  const container = document.createElement("div");
  container.id = "author-panel";
  container.style.cssText = "position:fixed;top:8px;left:8px;width:300px;max-height:92vh;overflow:auto;background:#0f1420ee;color:#d0d8e8;font:12px system-ui;border:1px solid #2a3a5a;border-radius:8px;z-index:9999;padding:8px;display:none;backdrop-filter:blur(6px)";
  container.innerHTML = `
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <button id="author-toggle" style="flex:1;padding:6px 8px;background:#2a7fff;color:#fff;border:none;border-radius:6px;font-weight:700">EDIT</button>
      <button id="author-export" style="padding:6px 8px;background:#1a3a2a;color:#aaffaa;border:1px solid #2a6a4a;border-radius:6px">Export</button>
      <button id="author-validate" style="padding:6px 8px;background:#2a2a1a;color:#ffea66;border:1px solid #6a5a2a;border-radius:6px">Validate</button>
    </div>
    <div id="author-status" style="font-size:11px;color:#8aa0c0;margin-bottom:6px">Author Mode — READY</div>
    <div style="border-top:1px solid #2a3a5a;margin:6px 0"></div>
    <div style="font-weight:700;margin-bottom:4px">Palette — Place</div>
    <div id="author-palette" style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px"></div>
    <div style="font-weight:700;margin:4px 0">Selected</div>
    <div id="author-selected" style="background:#0a0f1e;border:1px solid #1e2a4a;border-radius:6px;padding:6px;margin-bottom:6px">
      <div id="author-selected-none" style="color:#6a7a96">Click object in scene to select</div>
      <div id="author-selected-form" style="display:none">
        <div style="font-size:11px;color:#8aa0c0;margin-bottom:4px" id="author-sel-id"></div>
        <label style="display:block;margin:2px 0">Region <select id="author-sel-region" style="width:100%"></select></label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
          <label>X <input id="author-x" type="number" step="0.1" style="width:100%"></label>
          <label>Z <input id="author-z" type="number" step="0.1" style="width:100%"></label>
          <label>Y <input id="author-y" type="number" step="0.1" style="width:100%"></label>
          <label>RotY° <input id="author-rot" type="number" step="5" style="width:100%"></label>
          <label>W <input id="author-w" type="number" step="0.1" style="width:100%"></label>
          <label>H <input id="author-h" type="number" step="0.1" style="width:100%"></label>
          <label>D <input id="author-d" type="number" step="0.1" style="width:100%"></label>
          <label>Height <input id="author-height" type="number" step="0.1" style="width:100%"></label>
        </div>
        <div id="author-creature-fields" style="display:none;margin-top:6px;border-top:1px solid #1e2a4a;padding-top:4px">
          <div style="font-weight:600;margin-bottom:2px">Creature</div>
          <label>Type <select id="author-creature-type"><option value="rusher">rusher</option><option value="spitter">spitter</option></select></label>
          <label>Temperament <select id="author-temper"><option>AGGRESSIVE</option><option>TERRITORIAL</option><option>DEFENSIVE</option><option>SKITTISH</option></select></label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px">
            <label>Roam <input id="author-roam" type="number" step="0.1" style="width:100%"></label>
            <label>Notice <input id="author-notice" type="number" step="0.1" style="width:100%"></label>
            <label>Personal <input id="author-personal" type="number" step="0.1" style="width:100%"></label>
            <label>Leash <input id="author-leash" type="number" step="0.1" style="width:100%"></label>
          </div>
        </div>
        <div id="author-anchor-fields" style="display:none;margin-top:6px;border-top:1px solid #1e2a4a;padding-top:4px">
          <div style="font-weight:600;margin-bottom:2px">Anchor / POI</div>
          <label>Type <input id="author-anchor-type" style="width:100%"></label>
          <label>Requires (JSON) <input id="author-requires" placeholder='null or {"type":"companionAbility","id":"swim"}' style="width:100%"></label>
        </div>
        <div style="display:flex;gap:6px;margin-top:6px">
          <button id="author-duplicate" style="flex:1;padding:6px;background:#2a3a5a;color:#fff;border:none;border-radius:4px">Duplicate</button>
          <button id="author-delete" style="flex:1;padding:6px;background:#5a1a1a;color:#ffaaaa;border:none;border-radius:4px">Delete</button>
        </div>
        <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">
          <button class="nudge" data-dx="0" data-dz="-0.2" style="flex:1;padding:4px">↑</button>
          <button class="nudge" data-dx="-0.2" data-dz="0" style="flex:1;padding:4px">←</button>
          <button class="nudge" data-dx="0.2" data-dz="0" style="flex:1;padding:4px">→</button>
          <button class="nudge" data-dx="0" data-dz="0.2" style="flex:1;padding:4px">↓</button>
          <button id="author-up" style="flex:1;padding:4px">Y+0.2</button>
          <button id="author-down" style="flex:1;padding:4px">Y-0.2</button>
        </div>
      </div>
    </div>
    <div style="font-weight:700;margin:4px 0">Region / Pocket</div>
    <div style="background:#0a0f1e;border:1px solid #1e2a4a;border-radius:6px;padding:6px;margin-bottom:6px">
      <label>Region <select id="author-region-select" style="width:100%"></select></label>
      <div id="author-region-form" style="margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:4px">
        <label>Display <input id="author-region-name" style="width:100%"></label>
        <label>Neighbors <input id="author-region-neighbors" placeholder="comma list" style="width:100%"></label>
        <label>minX <input id="author-b-minX" type="number" step="0.5" style="width:100%"></label>
        <label>maxX <input id="author-b-maxX" type="number" step="0.5" style="width:100%"></label>
        <label>minZ <input id="author-b-minZ" type="number" step="0.5" style="width:100%"></label>
        <label>maxZ <input id="author-b-maxZ" type="number" step="0.5" style="width:100%"></label>
      </div>
      <button id="author-region-apply" style="margin-top:6px;width:100%;padding:6px;background:#1e2a4a;color:#aaccff;border:none;border-radius:4px">Apply Region</button>
      <div id="author-region-status" style="font-size:11px;color:#8aa0c0;margin-top:4px"></div>
    </div>
    <div style="display:flex;gap:6px">
      <button id="author-reset" style="flex:1;padding:6px;background:#3a1a1a;color:#ffaaaa;border:1px solid #6a2a2a;border-radius:6px">Reset Draft From Repo</button>
    </div>
    <div style="font-size:10px;color:#5a6a8a;margin-top:6px">Desktop only — Edit pauses gameplay. Palette places at region center. Use precise inputs for placement.</div>
  `;
  document.body.appendChild(container);

  const toggleBtn = container.querySelector("#author-toggle");
  const statusEl = container.querySelector("#author-status");
  const exportBtn = container.querySelector("#author-export");
  const validateBtn = container.querySelector("#author-validate");
  const paletteEl = container.querySelector("#author-palette");
  const regionSelectEl = container.querySelector("#author-region-select");
  const selRegionEl = container.querySelector("#author-sel-region");
  const selectedNone = container.querySelector("#author-selected-none");
  const selectedForm = container.querySelector("#author-selected-form");
  const selIdEl = container.querySelector("#author-sel-id");

  // Build palette buttons
  const paletteItems = [
    { label: "Box", kind: "prop", subtype: "box" },
    { label: "Fence", kind: "fence" },
    { label: "Gate", kind: "gate" },
    { label: "Boundary", kind: "forestBoundary" },
    { label: "Platform", kind: "platform" },
    { label: "Obstacle", kind: "obstacle" },
    { label: "Ladder", kind: "climbable" },
    { label: "Tree", kind: "tree" },
    { label: "Rock", kind: "rock" },
    { label: "Fiber", kind: "fiber" },
    { label: "Rusher", kind: "rusher" },
    { label: "Spitter", kind: "spitter" },
    { label: "Waypoint", kind: "majorWaypoint" },
    { label: "Beacon", kind: "extractionBeacon" },
    { label: "POI Chest", kind: "poi", subtype: "chest" },
    { label: "Drop Pod", kind: "dropPod" },
    { label: "Resonator", kind: "resonator" },
  ];
  for (const item of paletteItems) {
    const b = document.createElement("button");
    b.textContent = item.label;
    b.style.cssText = "padding:6px 4px;background:#1a243a;color:#c0d0e8;border:1px solid #2a3a5a;border-radius:4px;font-size:11px";
    b.addEventListener("click", () => {
      opts.onCreate?.(item);
    });
    paletteEl.appendChild(b);
  }

  function refreshRegionSelects() {
    const regions = draftApi.getDraft().regions;
    const curSel = regionSelectEl.value;
    regionSelectEl.innerHTML = "";
    selRegionEl.innerHTML = "";
    for (const r of regions) {
      const o1 = document.createElement("option");
      o1.value = r.id; o1.textContent = r.id;
      regionSelectEl.appendChild(o1);
      const o2 = document.createElement("option");
      o2.value = r.id; o2.textContent = r.id;
      selRegionEl.appendChild(o2);
    }
    if (regions.find(r => r.id === curSel)) regionSelectEl.value = curSel;
    else if (regions[0]) regionSelectEl.value = regions[0].id;
    refreshRegionForm();
  }

  function refreshRegionForm() {
    const rid = regionSelectEl.value;
    const r = draftApi.findRegion(rid);
    if (!r) return;
    container.querySelector("#author-region-name").value = r.displayName || "";
    container.querySelector("#author-region-neighbors").value = (r.neighbors || []).join(", ");
    container.querySelector("#author-b-minX").value = r.bounds.minX;
    container.querySelector("#author-b-maxX").value = r.bounds.maxX;
    container.querySelector("#author-b-minZ").value = r.bounds.minZ;
    container.querySelector("#author-b-maxZ").value = r.bounds.maxZ;
  }

  regionSelectEl.addEventListener("change", refreshRegionForm);
  container.querySelector("#author-region-apply").addEventListener("click", () => {
    const rid = regionSelectEl.value;
    const patch = {
      displayName: container.querySelector("#author-region-name").value,
      neighbors: container.querySelector("#author-region-neighbors").value.split(",").map(s=>s.trim()).filter(Boolean),
      bounds: {
        minX: parseFloat(container.querySelector("#author-b-minX").value),
        maxX: parseFloat(container.querySelector("#author-b-maxX").value),
        minZ: parseFloat(container.querySelector("#author-b-minZ").value),
        maxZ: parseFloat(container.querySelector("#author-b-maxZ").value),
      }
    };
    const res = draftApi.updateRegion(rid, patch);
    const st = container.querySelector("#author-region-status");
    if (res.ok) {
      const v = draftApi.validate();
      if (v.ok) { st.textContent = "Region applied — validated"; st.style.color="#aaffaa"; if (onSelectRegion) onSelectRegion(rid); }
      else { st.textContent = v.error; st.style.color="#ffaaaa"; }
    } else { st.textContent = res.error; st.style.color="#ffaaaa"; }
  });

  // Selected form bindings
  function setSelected(id) {
    selectedId = id;
    if (!id) {
      selectedNone.style.display = "";
      selectedForm.style.display = "none";
      return;
    }
    const found = draftApi.findObjectById(id);
    if (!found) { selectedId = null; selectedNone.style.display=""; selectedForm.style.display="none"; return; }
    selectedNone.style.display="none";
    selectedForm.style.display="";
    selIdEl.textContent = `${found.type} — ${found.obj.id} — region: ${found.region.id}`;
    selRegionEl.value = found.region.id;
    const obj = found.obj;
    const pos = obj.pos || (obj.x !== undefined ? { x: obj.x, y: 0, z: obj.z } : { x: 0, y: 0, z: 0 });
    container.querySelector("#author-x").value = pos.x ?? 0;
    container.querySelector("#author-z").value = pos.z ?? 0;
    container.querySelector("#author-y").value = pos.y ?? 0;
    const rotYdeg = ((obj.rotY ?? 0) * 180 / Math.PI).toFixed(1);
    container.querySelector("#author-rot").value = rotYdeg;
    const size = obj.size || {};
    container.querySelector("#author-w").value = size.w ?? obj.w ?? "";
    container.querySelector("#author-h").value = size.d ?? obj.h ?? "";
    container.querySelector("#author-d").value = size.d ?? "";
    container.querySelector("#author-height").value = obj.height ?? size.h ?? "";
    // creature fields
    const creatureFields = container.querySelector("#author-creature-fields");
    if (found.type === "creature") {
      creatureFields.style.display="";
      container.querySelector("#author-creature-type").value = obj.type;
      container.querySelector("#author-temper").value = obj.temperament;
      container.querySelector("#author-roam").value = obj.roamRadius ?? "";
      container.querySelector("#author-notice").value = obj.noticeRadius ?? "";
      container.querySelector("#author-personal").value = obj.personalSpace ?? "";
      container.querySelector("#author-leash").value = obj.leashRadius ?? "";
    } else creatureFields.style.display="none";
    // anchor/poi fields
    const anchorFields = container.querySelector("#author-anchor-fields");
    if (found.type === "majorWaypoint" || found.type === "extractionBeacon" || found.type === "poi") {
      anchorFields.style.display="";
      const tEl = container.querySelector("#author-anchor-type");
      tEl.value = obj.type;
      const rEl = container.querySelector("#author-requires");
      rEl.value = obj.requires ? JSON.stringify(obj.requires) : "";
      rEl.style.display = found.type === "poi" ? "" : "none";
      rEl.previousElementSibling?.tagName; // noop
      // For POI, show requires; for anchor, hide requires
      if (found.type !== "poi") {
        container.querySelector("#author-requires").style.display="none";
      } else {
        container.querySelector("#author-requires").style.display="";
      }
    } else anchorFields.style.display="none";
  }

  function getSelectedPatch() {
    const patch = {};
    const x = parseFloat(container.querySelector("#author-x").value);
    const z = parseFloat(container.querySelector("#author-z").value);
    const y = parseFloat(container.querySelector("#author-y").value);
    if (!isNaN(x) && !isNaN(z)) patch.pos = { x, y: isNaN(y)?0:y, z };
    else if (!isNaN(x)) patch.pos = { x, y: 0, z: 0 };
    const rotDeg = parseFloat(container.querySelector("#author-rot").value);
    if (!isNaN(rotDeg)) patch.rotY = rotDeg * Math.PI / 180;
    const w = parseFloat(container.querySelector("#author-w").value);
    const h = parseFloat(container.querySelector("#author-h").value);
    const d = parseFloat(container.querySelector("#author-d").value);
    const height = parseFloat(container.querySelector("#author-height").value);
    const size = {};
    if (!isNaN(w)) size.w = w;
    if (!isNaN(h)) size.d = h; // h input maps to d (depth) for props? Keep both
    if (!isNaN(d)) size.d = d;
    if (Object.keys(size).length) patch.size = size;
    if (!isNaN(w) && isNaN(d)) { patch.w = w; patch.h = h; }
    if (!isNaN(height)) patch.height = height;
    const selRegion = selRegionEl.value;
    if (selRegion) patch.regionId = selRegion;
    // creature patches
    const found = selectedId ? draftApi.findObjectById(selectedId) : null;
    if (found && found.type === "creature") {
      patch.creatureType = container.querySelector("#author-creature-type").value;
      patch.temperament = container.querySelector("#author-temper").value;
      const roam = parseFloat(container.querySelector("#author-roam").value); if (!isNaN(roam)) found.obj.roamRadius = roam;
      const notice = parseFloat(container.querySelector("#author-notice").value); if (!isNaN(notice)) found.obj.noticeRadius = notice;
      const personal = parseFloat(container.querySelector("#author-personal").value); if (!isNaN(personal)) found.obj.personalSpace = personal;
      const leash = parseFloat(container.querySelector("#author-leash").value); if (!isNaN(leash)) found.obj.leashRadius = leash;
      // Also apply directly to object for creature extra fields
      if (!isNaN(roam)) patch.roamRadius = roam;
    }
    if (found && (found.type === "majorWaypoint" || found.type === "extractionBeacon" || found.type === "poi")) {
      const t = container.querySelector("#author-anchor-type").value.trim();
      if (t) patch.type = t; // misuse: but updateTransform handles type for resource etc. For anchor we need direct set
      const reqStr = container.querySelector("#author-requires").value.trim();
      if (found.type === "poi") {
        if (reqStr) { try { found.obj.requires = JSON.parse(reqStr); } catch { found.obj.requires = reqStr; } }
        else found.obj.requires = null;
      }
    }
    return patch;
  }

  // Wire input changes — apply on blur/change
  const formInputs = container.querySelectorAll("#author-selected-form input, #author-selected-form select");
  for (const inp of formInputs) {
    inp.addEventListener("change", () => {
      if (!selectedId) return;
      const patch = getSelectedPatch();
      // Need to handle creature extra fields already set directly; but we also need to apply patch for pos/region/size
      // For anchor type, set directly
      const found = draftApi.findObjectById(selectedId);
      if (found && (found.type === "poi" || found.type === "majorWaypoint" || found.type === "extractionBeacon")) {
        const t = container.querySelector("#author-anchor-type").value.trim();
        if (t && found.obj.type !== t) found.obj.type = t;
      }
      // For platform/obstacle x/z handling, patch.pos will be used but objects use x/z
      if (found && (found.type === "platform" || found.type === "obstacle" || found.type === "climbable")) {
        if (patch.pos) { found.obj.x = patch.pos.x; found.obj.z = patch.pos.z; if (patch.pos.y !== undefined) found.obj.y = patch.pos.y; delete patch.pos; patch.x = found.obj.x; patch.z = found.obj.z; }
      }
      const res = draftApi.updateTransform(selectedId, patch);
      if (res.ok) {
        const v = draftApi.validate();
        if (!v.ok) statusEl.textContent = "⚠ " + v.error, statusEl.style.color="#ffaaaa";
        else statusEl.textContent = "Edited — " + selectedId, statusEl.style.color="#aaffaa";
        opts.onDraftChanged?.(selectedId);
      } else { statusEl.textContent = res.error; statusEl.style.color="#ffaaaa"; }
    });
  }
  selRegionEl.addEventListener("change", () => {
    if (!selectedId) return;
    const newRegion = selRegionEl.value;
    const res = draftApi.updateTransform(selectedId, { regionId: newRegion });
    if (res.ok) {
      const v = draftApi.validate();
      if (!v.ok) statusEl.textContent = "⚠ " + v.error;
      else statusEl.textContent = "Moved to " + newRegion;
      opts.onDraftChanged?.(selectedId);
    } else statusEl.textContent = res.error;
  });

  container.querySelector("#author-duplicate").addEventListener("click", () => {
    if (!selectedId) return;
    const res = draftApi.duplicateObject(selectedId);
    if (res.ok) {
      statusEl.textContent = "Duplicated → " + res.newId;
      statusEl.style.color="#aaffaa";
      refreshRegionSelects();
      setSelected(res.newId);
      opts.onDraftChanged?.(res.newId);
    } else statusEl.textContent = res.error;
  });
  container.querySelector("#author-delete").addEventListener("click", () => {
    if (!selectedId) return;
    const res = draftApi.deleteObject(selectedId);
    if (res.ok) {
      statusEl.textContent = "Deleted " + selectedId;
      setSelected(null);
      refreshRegionSelects();
      opts.onDraftChanged?.(null);
    } else statusEl.textContent = res.error;
  });
  for (const btn of container.querySelectorAll(".nudge")) {
    btn.addEventListener("click", () => {
      if (!selectedId) return;
      const dx = parseFloat(btn.dataset.dx);
      const dz = parseFloat(btn.dataset.dz);
      const found = draftApi.findObjectById(selectedId);
      if (!found) return;
      const obj = found.obj;
      if (obj.pos) { obj.pos.x += dx; obj.pos.z += dz; }
      else if (obj.x !== undefined) { obj.x += dx; obj.z += dz; }
      // Trigger update via draftApi
      draftApi.updateTransform(selectedId, {});
      setSelected(selectedId);
      const v = draftApi.validate();
      statusEl.textContent = v.ok ? `Nudged ${dx},${dz}` : v.error;
      opts.onDraftChanged?.(selectedId);
    });
  }
  container.querySelector("#author-up").addEventListener("click", () => {
    if (!selectedId) return;
    const f = draftApi.findObjectById(selectedId);
    if (!f) return;
    if (f.obj.pos) f.obj.pos.y = (f.obj.pos.y ?? 0) + 0.2;
    else if (f.obj.y !== undefined) f.obj.y += 0.2;
    else f.obj.pos = { x: f.obj.x ?? 0, y: 0.2, z: f.obj.z ?? 0 };
    draftApi.updateTransform(selectedId, {});
    setSelected(selectedId);
    opts.onDraftChanged?.(selectedId);
  });
  container.querySelector("#author-down").addEventListener("click", () => {
    if (!selectedId) return;
    const f = draftApi.findObjectById(selectedId);
    if (!f) return;
    if (f.obj.pos) f.obj.pos.y = Math.max(-1, (f.obj.pos.y ?? 0) - 0.2);
    draftApi.updateTransform(selectedId, {});
    setSelected(selectedId);
    opts.onDraftChanged?.(selectedId);
  });

  toggleBtn.addEventListener("click", () => {
    editMode = !editMode;
    toggleBtn.textContent = editMode ? "PLAY" : "EDIT";
    toggleBtn.style.background = editMode ? "#1a8a4a" : "#2a7fff";
    statusEl.textContent = editMode ? "EDIT mode — gameplay paused" : "PLAY mode — testing draft";
    opts.onToggleEdit?.(editMode);
    if (!editMode) {
      // Transition to Play — validate and trigger onPlay
      const v = draftApi.validate();
      if (!v.ok) { statusEl.textContent = "⚠ " + v.error; statusEl.style.color="#ffaaaa"; editMode = true; toggleBtn.textContent="EDIT"; return; }
      onPlay?.();
    }
  });

  validateBtn.addEventListener("click", () => {
    const v = draftApi.validate();
    if (v.ok) { statusEl.textContent = "✓ Valid — " + draftApi.getDraft().regions.length + " regions"; statusEl.style.color="#aaffaa"; if (onValidate) onValidate(true); }
    else { statusEl.textContent = "⚠ " + v.error; statusEl.style.color="#ffaaaa"; if (onValidate) onValidate(false, v.error); }
  });

  exportBtn.addEventListener("click", () => {
    const v = draftApi.validate();
    if (!v.ok) { statusEl.textContent = "⚠ " + v.error; statusEl.style.color="#ffaaaa"; return; }
    const json = draftApi.exportStableJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "world.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    // Also copy to clipboard if available
    if (navigator.clipboard) navigator.clipboard.writeText(json).catch(()=>{});
    statusEl.textContent = "Exported world.json — replace src/world/data/world.json then npm run world:generate";
    statusEl.style.color="#aaffaa";
  });

  container.querySelector("#author-reset").addEventListener("click", () => {
    if (confirm("Reset draft to repo world.json? This clears local edits.")) {
      draftApi.clearPersisted();
      draftApi.cloneRepo();
      refreshRegionSelects();
      setSelected(null);
      statusEl.textContent = "Reset to repo — reloading...";
      // Trigger reload to re-instantiate from repo
      setTimeout(() => window.location.reload(), 300);
    }
  });

  function show() { container.style.display = ""; refreshRegionSelects(); }
  function hide() { container.style.display = "none"; }
  function isEditMode() { return editMode; }
  function getSelectedId() { return selectedId; }
  function setStatus(text, isError) { statusEl.textContent = text; statusEl.style.color = isError ? "#ffaaaa" : "#8aa0c0"; }

  // Expose
  return { element: container, show, hide, isEditMode, getSelectedId, setSelected, setStatus, refreshRegionSelects };
}
