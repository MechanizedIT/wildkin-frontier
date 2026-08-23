// src/author/authorUI.js — desktop Author Mode panel (Phase 4A.1 categorized + presentation controls)

export function createAuthorUI(opts) {
  const draftApi = opts.draftApi;
  const onPlay = opts.onPlay;
  const onValidate = opts.onValidate;
  const onSelectRegion = opts.onSelectRegion;
  let selectedId = null;
  let editMode = false;

  const container = document.createElement("div");
  container.id = "author-panel";
  container.style.cssText = "position:fixed;top:8px;left:8px;width:300px;max-height:92vh;overflow:auto;background:#0f1420f2;color:#d0d8e8;font:12px system-ui;border:1px solid #2a3a5a;border-radius:8px;z-index:9999;padding:8px;display:none;backdrop-filter:blur(6px)";
  container.innerHTML = `
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <button id="author-toggle" style="flex:1;padding:7px 8px;background:#2a7fff;color:#fff;border:none;border-radius:6px;font-weight:800">EDIT</button>
      <span id="author-mode-badge" style="font-size:10px;font-weight:700;padding:4px 6px;border-radius:4px;background:#1a243a;color:#8aa0c0">PLAY TEST</span>
    </div>
    <div id="author-status" style="font-size:11px;color:#8aa0c0;margin-bottom:8px;min-height:14px">Author Mode — READY</div>
    <div id="author-place-hint" style="display:none;font-size:11px;color:#ffd54f;background:#2a2410;border:1px solid #6a5a20;border-radius:6px;padding:6px;margin-bottom:8px"></div>
    <details id="sec-palette" open style="margin-bottom:8px">
      <summary style="font-weight:700;cursor:pointer;list-style:none">Palette — Click to place ▼</summary>
      <div id="author-palette" style="display:flex;flex-direction:column;gap:6px;margin-top:6px"></div>
    </details>
    <details id="sec-selected" open style="margin-bottom:8px">
      <summary style="font-weight:700;cursor:pointer">Selected</summary>
      <div id="author-selected" style="background:#0a0f1e;border:1px solid #1e2a4a;border-radius:6px;padding:6px;margin-top:6px">
        <div id="author-selected-none" style="color:#6a7a96">Click any object (prop, tree, Wildkin, waypoint) to select</div>
        <div id="author-selected-form" style="display:none">
          <div style="font-size:11px;color:#8aa0c0;margin-bottom:4px" id="author-sel-id"></div>
          <label style="display:block;margin:2px 0;font-size:11px">Region <select id="author-sel-region" style="width:100%;font-size:12px"></select></label>
          <div id="row-pos" style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px">
            <label>X <input id="author-x" type="number" step="0.1" style="width:100%"></label>
            <label>Z <input id="author-z" type="number" step="0.1" style="width:100%"></label>
          </div>
          <div id="row-y" style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px">
            <label>Y <input id="author-y" type="number" step="0.1" style="width:100%"></label>
            <label id="wrap-rot">RotY° <input id="author-rot" type="number" step="5" style="width:100%"></label>
          </div>
          <div id="row-size" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:4px">
            <label>W <input id="author-w" type="number" step="0.1" style="width:100%"></label>
            <label>D <input id="author-h" type="number" step="0.1" style="width:100%"></label>
            <label>Height <input id="author-height" type="number" step="0.1" style="width:100%"></label>
          </div>
          <div id="author-presentation" style="display:none;margin-top:6px;border-top:1px solid #1e2a4a;padding-top:6px">
            <div style="font-weight:600;margin-bottom:4px">Presentation / Physics</div>
            <label style="display:flex;align-items:center;gap:6px;margin:2px 0"><input type="checkbox" id="author-visible"> Visible in Play</label>
            <label style="display:flex;align-items:center;gap:6px;margin:2px 0"><input type="checkbox" id="author-collision"> Collision</label>
            <label style="display:block;margin:2px 0">Opacity <input id="author-opacity" type="number" min="0" max="1" step="0.05" style="width:100%"></label>
            <label style="display:block;margin:2px 0">Tint <input id="author-tint" type="color" style="width:100%;height:24px;padding:2px"><input id="author-tint-text" placeholder="#RRGGBB or empty" style="width:100%;margin-top:2px;font-size:11px"></label>
          </div>
          <div id="author-displayname-row" style="display:none;margin-top:6px">
            <label>Display Name <input id="author-displayname" placeholder="Readable name" style="width:100%"></label>
          </div>
          <div id="author-creature-fields" style="display:none;margin-top:6px;border-top:1px solid #1e2a4a;padding-top:4px">
            <div style="font-weight:600;margin-bottom:2px">Creature</div>
            <label>Type <select id="author-creature-type"><option value="rusher">rusher</option><option value="spitter">spitter</option></select></label>
            <label>Temperament <select id="author-temper"><option>AGGRESSIVE</option><option>TERRITORIAL</option><option>DEFENSIVE</option><option>SKITTISH</option></select></label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px">
              <label>Spawn X <input id="author-spawn-x" type="number" step="0.1" style="width:100%"></label>
              <label>Spawn Z <input id="author-spawn-z" type="number" step="0.1" style="width:100%"></label>
              <label>Home X <input id="author-home-x" type="number" step="0.1" style="width:100%"></label>
              <label>Home Z <input id="author-home-z" type="number" step="0.1" style="width:100%"></label>
              <label>Roam <input id="author-roam" type="number" step="0.1" style="width:100%"></label>
              <label>Notice <input id="author-notice" type="number" step="0.1" style="width:100%"></label>
              <label>Personal <input id="author-personal" type="number" step="0.1" style="width:100%"></label>
              <label>Leash <input id="author-leash" type="number" step="0.1" style="width:100%"></label>
            </div>
            <label style="display:flex;align-items:center;gap:6px;margin-top:6px;font-size:11px"><input type="checkbox" id="author-move-home" checked> Move Home With Spawn</label>
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
            <button id="author-up" style="flex:1;padding:4px;display:none">Y+0.2</button>
            <button id="author-down" style="flex:1;padding:4px;display:none">Y-0.2</button>
          </div>
          <div style="font-size:10px;color:#6a7a8a;margin-top:4px">Drag object in Edit to move X/Z · Y via buttons/field</div>
        </div>
      </div>
    </details>
    <details id="sec-hierarchy" open style="margin-bottom:8px">
      <summary style="font-weight:700;cursor:pointer">Hierarchy</summary>
      <input id="author-filter" placeholder="filter id/type" style="width:100%;margin-top:4px;font-size:11px;padding:4px;border-radius:4px;border:1px solid #2a3a5a;background:#0a0f1e;color:#d0d8e8">
      <div id="author-hierarchy" style="max-height:240px;overflow:auto;margin-top:4px;border:1px solid #1e2a4a;border-radius:4px;padding:4px;background:#0a0f1e;font-size:11px"></div>
    </details>
    <details id="sec-region" style="margin-bottom:8px">
      <summary style="font-weight:700;cursor:pointer">Region</summary>
      <div style="background:#0a0f1e;border:1px solid #1e2a4a;border-radius:6px;padding:6px;margin-top:6px">
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
    </details>
    <div style="display:flex;gap:6px;margin-bottom:6px">
      <button id="author-validate" style="flex:1;padding:6px;background:#2a2a1a;color:#ffea66;border:1px solid #6a5a2a;border-radius:6px">Validate</button>
      <button id="author-export" style="flex:1;padding:6px;background:#1a3a2a;color:#aaffaa;border:1px solid #2a6a4a;border-radius:6px">Export</button>
    </div>
    <button id="author-reset" style="width:100%;padding:6px;background:#3a1a1a;color:#ffaaaa;border:1px solid #6a2a2a;border-radius:6px">Reset Draft From Repo</button>
    <div style="font-size:10px;color:#5a6a8a;margin-top:6px">Edit hides joystick · Right-drag pan (inverted) · Wheel zoom · Esc cancels place</div>
  `;
  document.body.appendChild(container);

  const toggleBtn = container.querySelector("#author-toggle");
  const badge = container.querySelector("#author-mode-badge");
  const statusEl = container.querySelector("#author-status");
  const placeHint = container.querySelector("#author-place-hint");
  const paletteEl = container.querySelector("#author-palette");
  const regionSelectEl = container.querySelector("#author-region-select");
  const selRegionEl = container.querySelector("#author-sel-region");
  const selectedNone = container.querySelector("#author-selected-none");
  const selectedForm = container.querySelector("#author-selected-form");
  const selIdEl = container.querySelector("#author-sel-id");

  const paletteCategories = [
    { title: "World", items: [
      { label: "Ground Patch", kind: "groundPatch" },
      { label: "Boundary Collider", kind: "boundaryCollider" },
    ]},
    { title: "Environment / Props", items: [
      { label: "Box", kind: "prop", subtype: "box" },
      { label: "Fence", kind: "fence" },
      { label: "Gate", kind: "gate" },
      { label: "Forest Boundary", kind: "forestBoundary" },
      { label: "Water", kind: "water" },
      { label: "Island", kind: "island" },
      { label: "Drop Pod", kind: "dropPod" },
      { label: "Resonator", kind: "resonator" },
    ]},
    { title: "Traversal", items: [
      { label: "Platform", kind: "platform" },
      { label: "Obstacle", kind: "obstacle" },
      { label: "Ladder", kind: "climbable" },
    ]},
    { title: "Resources", items: [
      { label: "Tree", kind: "tree" },
      { label: "Rock", kind: "rock" },
      { label: "Fiber", kind: "fiber" },
    ]},
    { title: "Wildkin", items: [
      { label: "Rusher", kind: "rusher" },
      { label: "Spitter", kind: "spitter" },
    ]},
    { title: "Frontier / POI", items: [
      { label: "Major Waypoint", kind: "majorWaypoint" },
      { label: "Extraction Beacon", kind: "extractionBeacon" },
      { label: "POI Chest", kind: "poi", subtype: "chest" },
    ]},
  ];
  for (const cat of paletteCategories) {
    const det = document.createElement("details");
    det.open = cat.title === "World" || cat.title === "Environment / Props";
    det.style.border = "1px solid #1e2a4a";
    det.style.borderRadius = "4px";
    det.style.padding = "4px";
    const sum = document.createElement("summary");
    sum.textContent = cat.title;
    sum.style.cursor = "pointer";
    sum.style.fontWeight = "700";
    sum.style.fontSize = "11px";
    det.appendChild(sum);
    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "1fr 1fr";
    grid.style.gap = "4px";
    grid.style.marginTop = "4px";
    for (const item of cat.items) {
      const b = document.createElement("button");
      b.textContent = item.label;
      b.style.cssText = "padding:6px 4px;background:#1a243a;color:#c0d0e8;border:1px solid #2a3a5a;border-radius:4px;font-size:11px;cursor:pointer";
      b.addEventListener("click", () => opts.onCreate?.(item));
      grid.appendChild(b);
    }
    det.appendChild(grid);
    paletteEl.appendChild(det);
  }

  function refreshRegionSelects() {
    const regions = draftApi.getDraft().regions;
    const curSel = regionSelectEl.value;
    regionSelectEl.innerHTML = "";
    selRegionEl.innerHTML = "";
    for (const r of regions) {
      const o1 = document.createElement("option"); o1.value = r.id; o1.textContent = r.id; regionSelectEl.appendChild(o1);
      const o2 = document.createElement("option"); o2.value = r.id; o2.textContent = r.id; selRegionEl.appendChild(o2);
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
  const hierarchyEl = container.querySelector("#author-hierarchy");
  const filterEl = container.querySelector("#author-filter");
  if (filterEl) filterEl.addEventListener("input", refreshHierarchy);
  function refreshHierarchy() {
    if (!hierarchyEl) return;
    const draft = draftApi.getDraft();
    const filter = (filterEl?.value || "").toLowerCase().trim();
    hierarchyEl.innerHTML = "";
    for (const region of draft.regions) {
      const cats = [
        { label: "Ground", items: region.groundPatches ?? [] },
        { label: "Boundaries / Colliders", items: region.boundaryColliders ?? [] },
        { label: "Props", items: region.props ?? [] },
        { label: "Traversal", items: [...(region.traversal?.platforms??[]), ...(region.traversal?.obstacles??[]), ...(region.traversal?.climbables??[])] },
        { label: "Resources", items: region.resources ?? [] },
        { label: "Wildkin", items: region.creatures ?? [] },
        { label: "Anchors", items: [...(region.majorWaypoints??[]), ...(region.extractionBeacons??[])] },
        { label: "POIs", items: region.pois ?? [] },
      ];
      let hasVisible = !filter || region.id.toLowerCase().includes(filter) || (region.displayName&&region.displayName.toLowerCase().includes(filter));
      for (const c of cats) for (const o of c.items) if (!filter || o.id.toLowerCase().includes(filter) || (o.type&&o.type.toLowerCase().includes(filter)) || (o.subtype&&o.subtype.toLowerCase().includes(filter)) || (o.displayName&&o.displayName.toLowerCase().includes(filter))) hasVisible=true;
      if (!hasVisible) continue;
      const det = document.createElement("details"); det.open = !!filter || region.id===regionSelectEl.value; det.style.marginBottom="4px";
      const sum = document.createElement("summary"); sum.textContent = region.id; sum.style.cursor="pointer"; sum.style.fontWeight="700"; det.appendChild(sum);
      for (const cat of cats) {
        if (cat.items.length===0) continue;
        const filtered = cat.items.filter(o=> !filter || o.id.toLowerCase().includes(filter) || (o.type&&o.type.toLowerCase().includes(filter)) || (o.subtype&&o.subtype.toLowerCase().includes(filter)) || (o.displayName&&o.displayName.toLowerCase().includes(filter)));
        if (filtered.length===0) continue;
        const catDet = document.createElement("details"); catDet.style.marginLeft="8px"; catDet.open = !!filter;
        const catSum = document.createElement("summary"); catSum.textContent = `${cat.label} (${filtered.length})`; catSum.style.cursor="pointer"; catSum.style.color="#8aa0c0"; catDet.appendChild(catSum);
        for (const obj of filtered) {
          const label = obj.displayName ? `${obj.id} [${obj.type ?? obj.subtype} · ${obj.displayName}]` : obj.id + (obj.type?` [${obj.type}]`: obj.subtype?` [${obj.subtype}]`:"");
          const row = document.createElement("div"); row.textContent = label; row.dataset.id = obj.id; row.style.padding="2px 4px"; row.style.borderRadius="3px"; row.style.cursor="pointer"; row.style.display="flex"; row.style.justifyContent="space-between"; row.style.alignItems="center";
          if (obj.id===selectedId) { row.style.background="#2a3a5a"; row.style.color="#ffd54f"; }
          row.addEventListener("click", ()=>{ setSelected(obj.id); opts.onDraftChanged?.(obj.id); });
          const focusBtn = document.createElement("button"); focusBtn.textContent="◉"; focusBtn.title="Focus camera"; focusBtn.style.cssText="font-size:10px;padding:1px 4px;margin-left:4px;background:#1a243a;color:#8aa0c0;border:1px solid #2a3a5a;border-radius:3px;cursor:pointer";
          focusBtn.addEventListener("click", (e)=>{ e.stopPropagation(); opts.onFocusObject?.(obj.id); });
          row.appendChild(focusBtn);
          row.addEventListener("dblclick", ()=> opts.onFocusObject?.(obj.id));
          catDet.appendChild(row);
        }
        det.appendChild(catDet);
      }
      hierarchyEl.appendChild(det);
    }
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
      if (v.ok) { st.textContent = "Region applied — validated"; st.style.color="#aaffaa"; if (onSelectRegion) onSelectRegion(rid); refreshHierarchy(); }
      else { st.textContent = v.error; st.style.color="#ffaaaa"; }
    } else { st.textContent = res.error; st.style.color="#ffaaaa"; }
  });

  function supportsY(type) {
    if (type === "climbable") return false;
    return true;
  }
  function supportsRot(type) {
    if (type === "climbable" || type === "platform" || type === "obstacle") return false;
    if (type === "resource" || type === "creature" || type === "majorWaypoint" || type === "extractionBeacon" || type === "poi") return false;
    return true;
  }
  function supportsSize(type) {
    if (type === "resource" || type === "creature" || type === "majorWaypoint" || type === "extractionBeacon" || type === "poi") return false;
    return true;
  }
  function supportsPresentation(type) {
    // static families that share presentation/collision path: props, groundPatch, boundaryCollider, fence/boundary etc
    if (type === "prop" || type === "groundPatch" || type === "boundaryCollider") return true;
    // For fence/forestBoundary etc they are props with subtype fence -> already prop
    return false;
  }

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
    selIdEl.textContent = `${found.type} — ${found.obj.id} — region: ${found.region ? found.region.id : "camp"}`;
    if (found.region) selRegionEl.value = found.region.id;
    const obj = found.obj;
    const pos = obj.pos || (obj.x !== undefined ? { x: obj.x, y: obj.y ?? obj.baseY ?? 0, z: obj.z } : { x: 0, y: 0, z: 0 });
    container.querySelector("#author-x").value = pos.x ?? 0;
    container.querySelector("#author-z").value = pos.z ?? 0;
    container.querySelector("#author-y").value = pos.y ?? obj.y ?? obj.baseY ?? 0;
    const rotYdeg = ((obj.rotY ?? 0) * 180 / Math.PI).toFixed(1);
    container.querySelector("#author-rot").value = rotYdeg;
    const size = obj.size || {};
    container.querySelector("#author-w").value = size.w ?? obj.w ?? "";
    container.querySelector("#author-h").value = size.d ?? obj.h ?? "";
    container.querySelector("#author-height").value = obj.height ?? size.h ?? "";
    const yRow = container.querySelector("#row-y");
    const rotWrap = container.querySelector("#wrap-rot");
    const sizeRow = container.querySelector("#row-size");
    const upBtn = container.querySelector("#author-up");
    const downBtn = container.querySelector("#author-down");
    const ySupported = supportsY(found.type);
    yRow.style.display = ySupported ? "" : "none";
    upBtn.style.display = ySupported ? "" : "none";
    downBtn.style.display = ySupported ? "" : "none";
    rotWrap.style.display = supportsRot(found.type) ? "" : "none";
    sizeRow.style.display = supportsSize(found.type) ? "" : "none";
    if (found.type === "climbable") {
      rotWrap.style.display = "none";
      yRow.style.display = "none";
      upBtn.style.display = "none";
      downBtn.style.display = "none";
      sizeRow.style.display = "none";
    }
    const presentation = container.querySelector("#author-presentation");
    const supportsPres = supportsPresentation(found.type);
    if (supportsPres) {
      presentation.style.display = "";
      container.querySelector("#author-visible").checked = obj.visibleInPlay !== false;
      container.querySelector("#author-collision").checked = obj.collisionEnabled !== false;
      container.querySelector("#author-opacity").value = obj.opacity ?? 1;
      const tintVal = obj.color ?? obj.tint ?? "";
      let hex = "";
      if (typeof tintVal === "number") hex = "#" + tintVal.toString(16).padStart(6,"0");
      else if (typeof tintVal === "string") hex = tintVal.startsWith("#") ? tintVal : "#"+tintVal;
      else hex = "#ffffff";
      // color input expects valid hex, default to white if none
      const colorInput = container.querySelector("#author-tint");
      const textInput = container.querySelector("#author-tint-text");
      if (obj.color !== undefined || obj.tint !== undefined) {
        try { colorInput.value = hex; textInput.value = hex; } catch { colorInput.value = "#ffffff"; textInput.value = ""; }
      } else {
        colorInput.value = "#ffffff"; textInput.value = "";
      }
    } else presentation.style.display = "none";

    const displayRow = container.querySelector("#author-displayname-row");
    if (found.type === "majorWaypoint" || found.type === "extractionBeacon") {
      displayRow.style.display = "";
      container.querySelector("#author-displayname").value = obj.displayName ?? "";
    } else displayRow.style.display = "none";

    const creatureFields = container.querySelector("#author-creature-fields");
    if (found.type === "creature") {
      creatureFields.style.display="";
      container.querySelector("#author-creature-type").value = obj.type;
      container.querySelector("#author-temper").value = obj.temperament;
      container.querySelector("#author-spawn-x").value = obj.pos?.x ?? "";
      container.querySelector("#author-spawn-z").value = obj.pos?.z ?? "";
      container.querySelector("#author-home-x").value = obj.homePos?.x ?? "";
      container.querySelector("#author-home-z").value = obj.homePos?.z ?? "";
      container.querySelector("#author-roam").value = obj.roamRadius ?? "";
      container.querySelector("#author-notice").value = obj.noticeRadius ?? "";
      container.querySelector("#author-personal").value = obj.personalSpace ?? "";
      container.querySelector("#author-leash").value = obj.leashRadius ?? "";
    } else creatureFields.style.display="none";
    const anchorFields = container.querySelector("#author-anchor-fields");
    if (found.type === "majorWaypoint" || found.type === "extractionBeacon" || found.type === "poi") {
      anchorFields.style.display="";
      container.querySelector("#author-anchor-type").value = obj.type;
      const rEl = container.querySelector("#author-requires");
      rEl.value = obj.requires ? JSON.stringify(obj.requires) : "";
      rEl.style.display = found.type === "poi" ? "" : "none";
      rEl.parentElement.style.display = found.type === "poi" ? "" : "none";
      if (found.type !== "poi") container.querySelector("#author-requires").style.display="none";
    } else anchorFields.style.display="none";
  }

  function getSelectedPatch() {
    const patch = {};
    const x = parseFloat(container.querySelector("#author-x").value);
    const z = parseFloat(container.querySelector("#author-z").value);
    const y = parseFloat(container.querySelector("#author-y").value);
    const rotDeg = parseFloat(container.querySelector("#author-rot").value);
    const w = parseFloat(container.querySelector("#author-w").value);
    const d = parseFloat(container.querySelector("#author-h").value);
    const height = parseFloat(container.querySelector("#author-height").value);
    const found = selectedId ? draftApi.findObjectById(selectedId) : null;
    if (!isNaN(x) && !isNaN(z)) {
      if (found && (found.type === "platform" || found.type === "obstacle")) {
        patch.x = x; patch.z = z; if (!isNaN(y)) patch.y = y;
      } else {
        patch.pos = { x, y: isNaN(y)?0:y, z };
      }
    } else if (!isNaN(x) && found && (found.type === "platform" || found.type === "obstacle")) {
      patch.x = x;
    }
    if (!isNaN(rotDeg)) patch.rotY = rotDeg * Math.PI / 180;
    if (found && found.type === "prop") {
      const size = {};
      if (!isNaN(w)) size.w = w;
      if (!isNaN(d)) size.d = d;
      if (!isNaN(height)) size.h = height;
      if (Object.keys(size).length) patch.size = size;
    } else if (found && (found.type === "groundPatch" || found.type === "boundaryCollider")) {
      const size = {};
      if (!isNaN(w)) size.w = w;
      if (!isNaN(d)) size.d = d;
      if (!isNaN(height)) size.h = height;
      if (Object.keys(size).length) patch.size = size;
    } else if (found && (found.type === "platform" || found.type === "obstacle")) {
      if (!isNaN(w)) patch.w = w;
      if (!isNaN(d)) patch.h = d;
      if (!isNaN(height)) patch.height = height;
    } else {
      if (!isNaN(height)) patch.height = height;
    }
    const selRegion = selRegionEl.value;
    if (selRegion) patch.regionId = selRegion;
    if (found && found.type === "creature") {
      patch.creatureType = container.querySelector("#author-creature-type").value;
      patch.temperament = container.querySelector("#author-temper").value;
    }
    if (found && (found.type === "majorWaypoint" || found.type === "extractionBeacon" || found.type === "poi")) {
      const t = container.querySelector("#author-anchor-type").value.trim();
      if (t) patch.type = t;
    }
    if (found && (found.type === "majorWaypoint" || found.type === "extractionBeacon")) {
      const dn = container.querySelector("#author-displayname").value.trim();
      if (dn) patch.displayName = dn;
      else patch.displayName = "";
    }
    if (found && (found.type === "prop" || found.type === "groundPatch" || found.type === "boundaryCollider")) {
      const vis = container.querySelector("#author-visible");
      const coll = container.querySelector("#author-collision");
      const op = parseFloat(container.querySelector("#author-opacity").value);
      const tintText = container.querySelector("#author-tint-text").value.trim();
      const tintColor = container.querySelector("#author-tint").value;
      if (vis) patch.visibleInPlay = vis.checked;
      if (coll) patch.collisionEnabled = coll.checked;
      if (!isNaN(op)) patch.opacity = Math.max(0, Math.min(1, op));
      if (tintText) patch.color = tintText;
      else if (tintColor && tintColor !== "#ffffff") patch.color = tintColor;
      else if (!tintText && (found.obj.color !== undefined || found.obj.tint !== undefined)) {
        // if user cleared, keep empty? We'll treat empty as no override - handled via display logic? For now if cleared, set to undefined by deleting?
        // We'll set color to undefined to remove tint? But patch.color empty would keep previous; need to allow clearing.
        // If text empty and color is #ffffff (default), we interpret as no tint if originally no tint
        if (found.obj.color !== undefined || found.obj.tint !== undefined) {
          // user cleared text and color is white -> remove
          if (!tintText) patch.color = undefined;
        }
      }
    }
    return patch;
  }

  const formInputs = container.querySelectorAll("#author-selected-form input, #author-selected-form select");
  for (const inp of formInputs) {
    inp.addEventListener("change", () => {
      if (!selectedId) return;
      const patch = getSelectedPatch();
      const found = draftApi.findObjectById(selectedId);
      if (found && (found.type === "poi" || found.type === "majorWaypoint" || found.type === "extractionBeacon")) {
        const t = container.querySelector("#author-anchor-type").value.trim();
        if (t && found.obj.type !== t) found.obj.type = t;
        if (found.type === "poi") {
          const reqStr = container.querySelector("#author-requires").value.trim();
          if (reqStr) { try { found.obj.requires = JSON.parse(reqStr); } catch { found.obj.requires = reqStr; } }
          else found.obj.requires = null;
        }
        if (found.type === "majorWaypoint" || found.type === "extractionBeacon") {
          const dn = container.querySelector("#author-displayname").value.trim();
          if (dn) found.obj.displayName = dn;
          else delete found.obj.displayName;
        }
      }
      if (found && found.type === "creature") {
        const roam = parseFloat(container.querySelector("#author-roam").value); if (!isNaN(roam)) found.obj.roamRadius = roam;
        const notice = parseFloat(container.querySelector("#author-notice").value); if (!isNaN(notice)) found.obj.noticeRadius = notice;
        const personal = parseFloat(container.querySelector("#author-personal").value); if (!isNaN(personal)) found.obj.personalSpace = personal;
        const leash = parseFloat(container.querySelector("#author-leash").value); if (!isNaN(leash)) found.obj.leashRadius = leash;
        const sx = parseFloat(container.querySelector("#author-spawn-x").value);
        const sz = parseFloat(container.querySelector("#author-spawn-z").value);
        const hx = parseFloat(container.querySelector("#author-home-x").value);
        const hz = parseFloat(container.querySelector("#author-home-z").value);
        const moveHome = container.querySelector("#author-move-home")?.checked;
        if (!isNaN(sx) && !isNaN(sz)) {
          const oldX = found.obj.pos.x, oldZ = found.obj.pos.z;
          const dx = sx - oldX, dz = sz - oldZ;
          if (dx !== 0 || dz !== 0) {
            found.obj.pos.x = sx; found.obj.pos.z = sz;
            if (moveHome && found.obj.homePos) { found.obj.homePos.x += dx; found.obj.homePos.z += dz; container.querySelector("#author-home-x").value = found.obj.homePos.x.toFixed(1); container.querySelector("#author-home-z").value = found.obj.homePos.z.toFixed(1); }
          }
        } else {
          if (!isNaN(sx)) found.obj.pos.x = sx;
          if (!isNaN(sz)) found.obj.pos.z = sz;
        }
        if (!isNaN(hx)) found.obj.homePos.x = hx;
        if (!isNaN(hz)) found.obj.homePos.z = hz;
      }
      if (found && (found.type === "prop" || found.type === "groundPatch" || found.type === "boundaryCollider")) {
        const vis = container.querySelector("#author-visible");
        const coll = container.querySelector("#author-collision");
        if (vis) found.obj.visibleInPlay = vis.checked;
        if (coll) found.obj.collisionEnabled = coll.checked;
        const op = parseFloat(container.querySelector("#author-opacity").value);
        if (!isNaN(op)) found.obj.opacity = Math.max(0, Math.min(1, op));
        const tintText = container.querySelector("#author-tint-text").value.trim();
        const tintColor = container.querySelector("#author-tint").value;
        if (tintText) found.obj.color = tintText;
        else if (tintColor && tintColor !== "#ffffff") found.obj.color = tintColor;
        else if (!tintText && tintColor === "#ffffff" && (found.obj.color !== undefined || found.obj.tint !== undefined)) {
          // user cleared -> remove color override if was present
          delete found.obj.color; delete found.obj.tint;
        }
        const dn2 = container.querySelector("#author-displayname");
        if (dn2 && (found.type === "majorWaypoint" || found.type === "extractionBeacon") && dn2.parentElement.style.display !== "none") {
          // already handled
        }
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
  // Tint color picker live sync to text
  const tintColorInput = container.querySelector("#author-tint");
  const tintTextInput = container.querySelector("#author-tint-text");
  if (tintColorInput && tintTextInput) {
    tintColorInput.addEventListener("input", () => { tintTextInput.value = tintColorInput.value; });
    tintTextInput.addEventListener("input", () => {
      const v = tintTextInput.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) tintColorInput.value = v;
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
      refreshRegionSelects(); refreshHierarchy();
      setSelected(res.newId);
      opts.onDraftChanged?.(res.newId);
      opts.onSelectNew?.(res.newId);
    } else statusEl.textContent = res.error;
  });
  container.querySelector("#author-delete").addEventListener("click", () => {
    if (!selectedId) return;
    const res = draftApi.deleteObject(selectedId);
    if (res.ok) {
      statusEl.textContent = "Deleted " + selectedId;
      const deleted = selectedId;
      setSelected(null);
      refreshRegionSelects(); refreshHierarchy();
      opts.onDraftChanged?.(null, deleted);
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
      const moveHome = document.getElementById("author-move-home")?.checked ?? true;
      if (obj.pos) { obj.pos.x += dx; obj.pos.z += dz; if (found.type==="creature" && obj.homePos && moveHome){ obj.homePos.x+=dx; obj.homePos.z+=dz; } }
      else if (obj.x !== undefined) { obj.x += dx; obj.z += dz; }
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
    if (f.type==="platform"||f.type==="obstacle") {
      const curY = f.obj.y ?? f.obj.baseY ?? 0;
      const ny = curY + 0.2; f.obj.y = ny; f.obj.baseY = ny; draftApi.updateTransform(selectedId, { y: ny }); setSelected(selectedId); opts.onDraftChanged?.(selectedId); return;
    }
    if (f.obj.pos) { f.obj.pos.y = (f.obj.pos.y ?? 0) + 0.2; if (f.type==="creature"&&f.obj.homePos) f.obj.homePos.y+=0.2; draftApi.updateTransform(selectedId, {}); setSelected(selectedId); opts.onDraftChanged?.(selectedId); }
  });
  container.querySelector("#author-down").addEventListener("click", () => {
    if (!selectedId) return;
    const f = draftApi.findObjectById(selectedId);
    if (!f) return;
    if (f.type==="platform"||f.type==="obstacle") {
      const curY = f.obj.y ?? f.obj.baseY ?? 0; const ny = Math.max(0, curY -0.2); f.obj.y=ny; f.obj.baseY=ny; draftApi.updateTransform(selectedId,{y:ny}); setSelected(selectedId); opts.onDraftChanged?.(selectedId); return;
    }
    if (f.obj.pos) { f.obj.pos.y = Math.max(-1, (f.obj.pos.y ?? 0) - 0.2); if (f.type==="creature"&&f.obj.homePos) f.obj.homePos.y=Math.max(-1,(f.obj.homePos.y??0)-0.2); draftApi.updateTransform(selectedId, {}); setSelected(selectedId); opts.onDraftChanged?.(selectedId); }
  });

  toggleBtn.addEventListener("click", () => {
    editMode = !editMode;
    toggleBtn.textContent = editMode ? "PLAY" : "EDIT";
    toggleBtn.style.background = editMode ? "#1a8a4a" : "#2a7fff";
    badge.textContent = editMode ? "EDITING" : "PLAY TEST";
    badge.style.background = editMode ? "#1a3a2a" : "#1a243a";
    badge.style.color = editMode ? "#6aff8a" : "#8aa0c0";
    statusEl.textContent = editMode ? "EDIT — drag objects, click palette then world" : "PLAY — testing draft";
    opts.onToggleEdit?.(editMode);
    if (!editMode) {
      const v = draftApi.validate();
      if (!v.ok) { statusEl.textContent = "⚠ " + v.error; statusEl.style.color="#ffaaaa"; editMode = true; toggleBtn.textContent="EDIT"; badge.textContent="EDITING"; return; }
      onPlay?.();
    }
  });

  container.querySelector("#author-validate").addEventListener("click", () => {
    const v = draftApi.validate();
    if (v.ok) { statusEl.textContent = "✓ Valid — " + draftApi.getDraft().regions.length + " regions"; statusEl.style.color="#aaffaa"; if (onValidate) onValidate(true); }
    else { statusEl.textContent = "⚠ " + v.error; statusEl.style.color="#ffaaaa"; if (onValidate) onValidate(false, v.error); }
  });
  container.querySelector("#author-export").addEventListener("click", () => {
    const v = draftApi.validate();
    if (!v.ok) { statusEl.textContent = "⚠ " + v.error; statusEl.style.color="#ffaaaa"; return; }
    const json = draftApi.exportStableJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "world.json"; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    if (navigator.clipboard) navigator.clipboard.writeText(json).catch(()=>{});
    statusEl.textContent = "Exported world.json — replace src/world/data/world.json then npm run world:generate";
    statusEl.style.color="#aaffaa";
  });
  container.querySelector("#author-reset").addEventListener("click", () => {
    if (confirm("Reset draft to repo world.json? This clears local edits.")) {
      draftApi.clearPersisted(); draftApi.cloneRepo(); refreshRegionSelects(); setSelected(null);
      statusEl.textContent = "Reset to repo — reloading..."; setTimeout(()=>window.location.reload(),300);
    }
  });

  function show() { container.style.display = ""; refreshRegionSelects(); refreshHierarchy(); }
  function hide() { container.style.display = "none"; }
  function isEditMode() { return editMode; }
  function getSelectedId() { return selectedId; }
  function setStatus(text, isError) { statusEl.textContent = text; statusEl.style.color = isError ? "#ffaaaa" : "#8aa0c0"; }
  function showPlaceHint(text) { placeHint.textContent = text; placeHint.style.display = text ? "" : "none"; }
  function hidePlaceHint() { placeHint.style.display = "none"; }

  return { element: container, show, hide, isEditMode, getSelectedId, setSelected, setStatus, refreshRegionSelects, refreshHierarchy, showPlaceHint, hidePlaceHint };
}
