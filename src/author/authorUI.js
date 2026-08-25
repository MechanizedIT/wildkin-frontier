// src/author/authorUI.js — desktop Author Mode panel (Phase 4A.2.2 registry-driven)
import { resolveAuthorType, readNormalizedTransform } from "./authorTypeRegistry.js";
import { createAuthorActions } from "./authorActions.js";

export function createAuthorUI(opts) {
  const draftApi = opts.draftApi;
  const actions = opts.actions ?? createAuthorActions(draftApi);
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
          <div id="row-scale" style="display:none;margin-top:4px">
            <label>Uniform Scale <input id="author-scale" type="number" min="0.2" max="3" step="0.1" style="width:100%"></label>
          </div>
          <div id="author-presentation" style="display:none;margin-top:6px;border-top:1px solid #1e2a4a;padding-top:6px">
            <div style="font-weight:600;margin-bottom:4px">Presentation / Physics</div>
            <label style="display:flex;align-items:center;gap:6px;margin:2px 0"><input type="checkbox" id="author-visible"> Visible in Play</label>
            <label style="display:flex;align-items:center;gap:6px;margin:2px 0"><input type="checkbox" id="author-collision"> Collision</label>
            <label style="display:block;margin:2px 0">Opacity <input id="author-opacity" type="number" min="0" max="1" step="0.05" style="width:100%"></label>
            <label style="display:block;margin:2px 0">Tint <input id="author-tint" type="color" style="width:100%;height:24px;padding:2px"><input id="author-tint-text" placeholder="#RRGGBB or empty" style="width:100%;margin-top:2px;font-size:11px"></label>
          </div>
          <div id="author-custom-fields" style="display:none;margin-top:6px;border-top:1px solid #1e2a4a;padding-top:4px"></div>
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
  let expandedState = new Map();
  function saveExpandedState() {
    expandedState.clear();
    for (const det of hierarchyEl.querySelectorAll("details")) {
      const key = det.dataset.key;
      if (key) expandedState.set(key, det.open);
    }
  }
  function isExpanded(key, fallback) {
    if (filterEl?.value) return true;
    if (expandedState.has(key)) return expandedState.get(key);
    return fallback;
  }
  function refreshHierarchy() {
    saveExpandedState();
    if (!hierarchyEl) return;
    const draft = draftApi.getDraft();
    const filter = (filterEl?.value || "").toLowerCase().trim();
    // preserve scroll
    const scrollTop = hierarchyEl.scrollTop;
    hierarchyEl.innerHTML = "";
    for (const region of draft.regions) {
      // Build categories, including virtual spawns
      const spawnItems = [];
      if (region.id === "camp") {
        const campSpawn = draftApi.findObjectById("camp_spawn");
        if (campSpawn) spawnItems.push({ id: "camp_spawn", type: "campSpawn", displayName: "Camp Spawn", pos: campSpawn.obj.pos });
      }
      for (const wp of region.majorWaypoints ?? []) {
        const rsId = wp.id + "__runSpawn";
        const rs = draftApi.findObjectById(rsId);
        if (rs) spawnItems.push({ id: rsId, type: "runSpawn", displayName: `${wp.displayName ?? wp.id} Run Spawn`, parentWp: wp.id, pos: rs.obj.pos });
      }
      const cats = [
        { label: "Ground", items: region.groundPatches ?? [], key: "ground" },
        { label: "Boundaries / Colliders", items: region.boundaryColliders ?? [], key: "boundaries" },
        { label: "Props", items: region.props ?? [], key: "props" },
        { label: "Traversal", items: [...(region.traversal?.platforms??[]), ...(region.traversal?.obstacles??[]), ...(region.traversal?.climbables??[])] , key: "traversal" },
        { label: "Resources", items: region.resources ?? [], key: "resources" },
        { label: "Wildkin", items: region.creatures ?? [], key: "wildkin" },
        { label: "Anchors", items: [...(region.majorWaypoints??[]), ...(region.extractionBeacons??[])] , key: "anchors" },
        { label: "Spawns", items: spawnItems, key: "spawns" },
        { label: "POIs", items: region.pois ?? [], key: "pois" },
      ];
      let hasVisible = !filter || region.id.toLowerCase().includes(filter) || (region.displayName&&region.displayName.toLowerCase().includes(filter));
      for (const c of cats) for (const o of c.items) if (!filter || o.id.toLowerCase().includes(filter) || (o.type&&o.type.toLowerCase().includes(filter)) || (o.subtype&&o.subtype.toLowerCase().includes(filter)) || (o.displayName&&o.displayName.toLowerCase().includes(filter))) hasVisible=true;
      if (!hasVisible) continue;
      const regionKey = `region:${region.id}`;
      const det = document.createElement("details"); det.dataset.key = regionKey; det.open = isExpanded(regionKey, region.id===regionSelectEl.value); det.style.marginBottom="4px";
      const sum = document.createElement("summary"); sum.textContent = region.id; sum.style.cursor="pointer"; sum.style.fontWeight="700"; det.appendChild(sum);
      for (const cat of cats) {
        if (cat.items.length===0) continue;
        const filtered = cat.items.filter(o=> !filter || o.id.toLowerCase().includes(filter) || (o.type&&o.type.toLowerCase().includes(filter)) || (o.subtype&&o.subtype.toLowerCase().includes(filter)) || (o.displayName&&o.displayName.toLowerCase().includes(filter)));
        if (filtered.length===0) continue;
        const catKey = `cat:${region.id}:${cat.key}`;
        const catDet = document.createElement("details"); catDet.dataset.key = catKey; catDet.style.marginLeft="8px"; catDet.open = isExpanded(catKey, !!filter);
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
          if (obj.id===selectedId) setTimeout(()=> row.scrollIntoView({ block:"nearest" }), 0);
        }
        det.appendChild(catDet);
      }
      hierarchyEl.appendChild(det);
    }
    hierarchyEl.scrollTop = scrollTop;
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

  function readPath(object, path) {
    return path.split(".").reduce((value, key) => value?.[key], object);
  }

  function fieldId(key) {
    return `author-field-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  }

  function renderCustomFields(found, def) {
    const host = container.querySelector("#author-custom-fields");
    host.innerHTML = "";
    const fields = def?.inspector ?? [];
    host.style.display = fields.length ? "" : "none";
    for (const field of fields) {
      const label = document.createElement("label");
      label.style.cssText = field.type === "boolean"
        ? "display:flex;align-items:center;gap:6px;margin:4px 0"
        : "display:block;margin:4px 0";
      label.append(document.createTextNode(field.label + " "));
      let input;
      if (field.type === "enum") {
        input = document.createElement("select");
        for (const option of field.options ?? []) {
          const optionEl = document.createElement("option");
          optionEl.value = option;
          optionEl.textContent = option;
          input.append(optionEl);
        }
      } else {
        input = document.createElement("input");
        input.type = field.type === "number" ? "number" : field.type === "boolean" ? "checkbox" : "text";
        if (field.type === "number") {
          if (field.min !== undefined) input.min = field.min;
          if (field.max !== undefined) input.max = field.max;
          input.step = field.step ?? "0.1";
        }
        if (field.type === "json") input.placeholder = "null or JSON object";
      }
      input.id = fieldId(field.key);
      input.dataset.authorField = field.key;
      input.dataset.authorFieldType = field.type;
      if (field.editorOnly) input.dataset.authorEditorOnly = "true";
      input.style.width = field.type === "boolean" ? "auto" : "100%";
      const raw = field.editorOnly
        ? (field.defaultValue ?? false)
        : readPath(found.obj, field.path ?? field.key);
      if (field.type === "boolean") input.checked = !!raw;
      else if (field.type === "json") input.value = raw == null ? "" : JSON.stringify(raw);
      else input.value = raw ?? "";
      label.append(input);
      host.append(label);
    }
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
    // Registry-driven transform display: use normalized author transform
    const def = resolveAuthorType(found);
    const caps = def ? def.capabilities : null;
    const norm = readNormalizedTransform(found);
    const nPos = norm ? norm.position : (obj.pos || { x: obj.x ?? 0, y: obj.y ?? obj.baseY ?? 0, z: obj.z ?? 0 });
    const nRot = norm ? (norm.rotationY ?? 0) : (obj.facingYaw ?? obj.rotY ?? 0);
    container.querySelector("#author-x").value = nPos.x ?? 0;
    container.querySelector("#author-z").value = nPos.z ?? 0;
    container.querySelector("#author-y").value = nPos.y ?? 0;
    const rotYdeg = (nRot * 180 / Math.PI).toFixed(1);
    container.querySelector("#author-rot").value = rotYdeg;
    // Size handling: box vs uniform
    const size = norm && norm.size ? norm.size : (obj.size || {});
    const uniformScale = norm ? (norm.uniformScale ?? 1) : 1;
    container.querySelector("#author-w").value = size.width ?? size.w ?? obj.w ?? "";
    container.querySelector("#author-h").value = size.depth ?? size.d ?? obj.h ?? "";
    container.querySelector("#author-height").value = size.height ?? obj.height ?? size.h ?? "";
    container.querySelector("#author-scale").value = uniformScale;
    const yRow = container.querySelector("#row-y");
    const rotWrap = container.querySelector("#wrap-rot");
    const sizeRow = container.querySelector("#row-size");
    const scaleRow = container.querySelector("#row-scale");
    const upBtn = container.querySelector("#author-up");
    const downBtn = container.querySelector("#author-down");
    const ySupported = caps ? !!caps.elevation : true;
    const rotSupported = caps ? !!caps.rotation : false;
    const resizeSupported = caps ? !!caps.resize : false;
    const sizeMode = caps ? (caps.sizeMode ?? def.sizeMode) : "box";
    yRow.style.display = ySupported ? "" : "none";
    upBtn.style.display = ySupported ? "" : "none";
    downBtn.style.display = ySupported ? "" : "none";
    rotWrap.style.display = rotSupported ? "" : "none";
    if (resizeSupported) {
      if (sizeMode === "uniform") {
        sizeRow.style.display = "none";
        scaleRow.style.display = "";
      } else if (sizeMode === "box") {
        sizeRow.style.display = "";
        scaleRow.style.display = "none";
      } else {
        sizeRow.style.display = "none";
        scaleRow.style.display = "none";
      }
    } else {
      sizeRow.style.display = "none";
      scaleRow.style.display = "none";
    }
    const presentation = container.querySelector("#author-presentation");
    const showPres = !!(caps?.presentation || caps?.collisionControl);
    if (showPres) {
      presentation.style.display = "";
      const visibleEl = container.querySelector("#author-visible");
      visibleEl.closest("label").style.display = caps.presentation ? "" : "none";
      visibleEl.checked = obj.visibleInPlay !== false;
      const collEl = container.querySelector("#author-collision");
      const collRow = collEl.closest("label");
      collRow.style.display = caps.collisionControl ? "" : "none";
      collEl.checked = obj.collisionEnabled !== false;
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

    renderCustomFields(found, def);
    container.querySelector("#author-duplicate").style.display = caps?.duplicatable ? "" : "none";
    container.querySelector("#author-delete").style.display = caps?.deletable ? "" : "none";
  }

  const commonTransformIds = new Set([
    "author-x", "author-y", "author-z", "author-rot",
    "author-w", "author-h", "author-height", "author-scale",
  ]);

  function parseNumber(id) {
    const value = Number(container.querySelector(`#${id}`).value);
    return Number.isFinite(value) ? value : undefined;
  }

  function commitCommonTransform() {
    if (!selectedId) return;
    const moveHome = container.querySelector('[data-author-field="moveHomeWithSpawn"]');
    const result = actions.commitInspectorTransform(selectedId, {
      x: parseNumber("author-x"),
      y: parseNumber("author-y"),
      z: parseNumber("author-z"),
      rotationY: (parseNumber("author-rot") ?? 0) * Math.PI / 180,
      width: parseNumber("author-w"),
      depth: parseNumber("author-h"),
      height: parseNumber("author-height"),
      uniformScale: parseNumber("author-scale"),
      moveHomeWithSpawn: moveHome ? moveHome.checked : undefined,
    });
    if (!result.ok) {
      setStatus(result.error, true);
      setSelected(selectedId);
      return;
    }
    setStatus(`Edited — ${selectedId}`, false);
    opts.onDraftChanged?.(selectedId);
  }

  container.querySelector("#author-selected-form").addEventListener("change", (event) => {
    if (!selectedId) return;
    const input = event.target;
    if (commonTransformIds.has(input.id)) {
      commitCommonTransform();
      return;
    }
    const presentationMap = {
      "author-visible": ["visibleInPlay", input.checked],
      "author-collision": ["collisionEnabled", input.checked],
      "author-opacity": ["opacity", Number(input.value)],
      "author-tint-text": ["color", input.value.trim() || undefined],
      "author-tint": ["color", input.value],
    };
    if (presentationMap[input.id]) {
      const [key, value] = presentationMap[input.id];
      const result = actions.commitInspectorField(selectedId, key, value);
      if (!result.ok) setStatus(result.error, true);
      else { setStatus(`Edited — ${selectedId}`, false); opts.onDraftChanged?.(selectedId); }
      return;
    }
    const key = input.dataset.authorField;
    if (!key || input.dataset.authorEditorOnly === "true") return;
    const type = input.dataset.authorFieldType;
    const value = type === "number" ? Number(input.value) : type === "boolean" ? input.checked : input.value;
    const result = actions.commitInspectorField(selectedId, key, value);
    if (!result.ok) {
      setStatus(result.error, true);
      setSelected(selectedId);
      return;
    }
    setStatus(`Edited ${key} — ${selectedId}`, false);
    opts.onDraftChanged?.(selectedId);
  });
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
    const found = draftApi.findObjectById(selectedId);
    const normalized = found ? readNormalizedTransform(found) : null;
    const res = normalized
      ? draftApi.updateNormalizedTransform(selectedId, { ...normalized, regionId: newRegion })
      : { ok: false, error: "object is not authorable" };
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
      const normalized = readNormalizedTransform(found);
      if (!normalized) return;
      const res = actions.commitTransform(selectedId, {
        position: { ...normalized.position, x: normalized.position.x + dx, z: normalized.position.z + dz },
      });
      if(!res.ok){ statusEl.textContent = res.error; statusEl.style.color="#ffaaaa"; return; }
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
    const normalized = readNormalizedTransform(f);
    if (!normalized) return;
    const res = actions.commitTransform(selectedId, { position: { ...normalized.position, y: normalized.position.y + 0.2 } });
    if(!res.ok) { statusEl.textContent=res.error; statusEl.style.color="#ffaaaa"; return; }
    setSelected(selectedId); opts.onDraftChanged?.(selectedId);
  });
  container.querySelector("#author-down").addEventListener("click", () => {
    if (!selectedId) return;
    const f = draftApi.findObjectById(selectedId);
    if (!f) return;
    const normalized = readNormalizedTransform(f);
    if (!normalized) return;
    const res = actions.commitTransform(selectedId, { position: { ...normalized.position, y: Math.max(-1, normalized.position.y - 0.2) } });
    if(!res.ok) { statusEl.textContent=res.error; statusEl.style.color="#ffaaaa"; return; }
    setSelected(selectedId); opts.onDraftChanged?.(selectedId);
  });

  toggleBtn.addEventListener("click", () => {
    if(!editMode){
      // currently in PLAY, want to go to EDIT - always allowed
      editMode = true;
      toggleBtn.textContent = "PLAY";
      toggleBtn.style.background = "#1a8a4a";
      badge.textContent = "EDITING";
      badge.style.background = "#1a3a2a";
      badge.style.color = "#6aff8a";
      statusEl.textContent = "EDIT — drag objects, click palette then world";
      opts.onToggleEdit?.(true);
      return;
    } else {
      // currently in EDIT, wants PLAY - validate first before any state change
      const v = draftApi.validate();
      if (!v.ok) {
        statusEl.textContent = "⚠ " + v.error;
        statusEl.style.color="#ffaaaa";
        // stay in EDIT, no state change
        return;
      }
      editMode = false;
      toggleBtn.textContent = "EDIT";
      toggleBtn.style.background = "#2a7fff";
      badge.textContent = "PLAY TEST";
      badge.style.background = "#1a243a";
      badge.style.color = "#8aa0c0";
      statusEl.textContent = "PLAY — testing draft";
      opts.onToggleEdit?.(false);
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
