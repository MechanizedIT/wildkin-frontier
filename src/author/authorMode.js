// src/author/authorMode.js — desktop dev-only Author Mode (Phase 4A.2.2 Author Object Contract)
import * as THREE from "three";
import { createAuthorDraft } from "./authorDraft.js";
import { normalizeStaticDescriptor, getVisualCenter } from "../world/staticDescriptor.js";
import { createAuthorUI } from "./authorUI.js";
import { resolveAuthorType, readNormalizedTransform, getAuthorVisualRef } from "./authorTypeRegistry.js";
import { createVisual } from "../world/visualFactory.js";
import { getColliderDescriptor as getColliderDescFromRegistry } from "./authorTypeRegistry.js";

export function createAuthorMode(opts) {
  const scene = opts.scene;
  const camera = opts.camera;
  const renderer = opts.renderer;
  const worldRegistry = opts.worldRegistry;
  const draftSeed = opts.draftSeed;
  const onRebuild = opts.onRebuild;
  // Systems for live preview and visibility (optional, set later if not provided)
  let resourceSystem = opts.resourceSystem || null;
  let creatureSystem = opts.creatureSystem || null;
  let regionManager = opts.regionManager || null;

  const draftApi = createAuthorDraft(draftSeed);
  const persisted = draftApi.loadPersisted();
  const usingDraft = persisted !== null;
  if (!usingDraft) draftApi.setDraft(draftSeed);

  let isEdit = false;
  let selectedId = null;
  let highlightMesh = null;
  let homeMarker = null;
  let regionOverlays = [];
  let raycaster = new THREE.Raycaster();
  let mouse = new THREE.Vector2();
  let editorCameraState = null;
  let suppressGameplay = false;
  let pendingPlace = null; // {kind, subtype, label}
  let isDragging = false;
  let dragOffset = { x: 0, z: 0 };
  let dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let dragState = null; // {id, startPos, previewPos, startFacing, previewFacing} preview-only, no canonical mutation
  let originalFog = null;
  let forestMats = [];
  let hudHidden = [];

  const ui = createAuthorUI({
    draftApi,
    worldRegistry,
    onCreate: (item) => {
      if (!isEdit) {
        isEdit = true; suppressGameplay = true;
        // Enter edit mode visually if not already
        enterEdit();
        ui.element.querySelector("#author-toggle").textContent = "PLAY";
        ui.element.querySelector("#author-toggle").style.background = "#1a8a4a";
        const badge = ui.element.querySelector("#author-mode-badge");
        if (badge) { badge.textContent = "EDITING"; badge.style.background = "#1a3a2a"; badge.style.color = "#6aff8a"; }
      }
      enterPlaceMode(item);
    },
    onToggleEdit: (edit) => {
      isEdit = edit;
      suppressGameplay = edit;
      if (edit) enterEdit();
      else exitEdit();
    },
    onPlay: () => {
      const v = draftApi.validate();
      if(!v.ok){ ui.setStatus("⚠ "+v.error, true); return; }
      ui.setStatus("Applying draft — reloading...", false);
      if (onRebuild) onRebuild(draftApi.getDraft());
      else window.location.reload();
    },
    onDraftChanged: (id, deletedId) => {
      reconcilePreview();
      if (id) {
        selectedId = id; ui.setSelected(id);
      }
      if (deletedId && selectedId===deletedId) { selectedId=null; ui.setSelected(null); }
      updateHighlight();
    },
    onSelectNew: (id) => {
      selectedId = id;
      ui.setSelected(id);
      syncPreviewForId(id);
      updateHighlight();
      updateHomeMarker();
      if (ui.refreshHierarchy) ui.refreshHierarchy();
    },
    onValidate: (ok, err) => {
      if (ok) ui.setStatus("✓ Valid", false); else ui.setStatus("⚠ " + err, true);
    },
    onSelectRegion: () => { updateOverlays(); if (ui.refreshHierarchy) ui.refreshHierarchy(); },
    onFocusObject: (id) => {
      const found = draftApi.findObjectById(id);
      if (!found) return;
      const pos = found.obj.pos || { x: found.obj.x, z: found.obj.z };
      if (!pos) return;
      camera.position.x = pos.x;
      camera.position.z = pos.z + 5;
      camera.lookAt(pos.x, 0, pos.z);
      camera.updateMatrixWorld();
      selectedId = id; ui.setSelected(id); updateHighlight(); updateHomeMarker(); updateEditorVisibility();
    }
  });

  function isEnabled() {
    try { return new URLSearchParams(window.location.search).get("author") === "1"; } catch { return false; }
  }

  // Helper: find mesh by authorId (prop, resource, creature, anchor, etc.)
  function findMeshByAuthorId(id) {
    let found = null;
    scene.traverse((obj) => {
      if (found) return;
      if (obj.userData && (obj.userData.authorId === id || obj.userData.propId === id || obj.userData.resourceId === id || obj.userData.creatureId === id || obj.userData.anchorId === id || obj.userData.poiId === id || obj.userData.platformId === id || obj.userData.climbableId === id)) {
        // Prefer the mesh that is the visual (not highlight)
        if (obj.name !== "selection-highlight" && !obj.parent?.name?.includes("selection")) found = obj;
      }
      if (!found && obj.name === id) found = obj;
    });
    return found;
  }

  function findAllMeshesByAuthorId(id) {
    const arr = [];
    scene.traverse((obj) => {
      if (obj.userData && (obj.userData.authorId === id || obj.userData.propId === id || obj.userData.resourceId === id || obj.userData.creatureId === id || obj.userData.anchorId === id || obj.userData.poiId === id || obj.userData.platformId === id)) {
        arr.push(obj);
      }
    });
    return arr;
  }

  function parseTintColor(v, fallback) {
    if (v === undefined || v === null) return fallback;
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      let s = v.trim();
      if (s.startsWith("0x")) s = "#" + s.slice(2);
      if (!s.startsWith("#")) s = "#" + s;
      if (/^#[0-9a-fA-F]{6}$/.test(s)) return parseInt(s.slice(1), 16);
    }
    return fallback;
  }
  // Live preview: sync a single object's mesh via normalized Author transform (registry-driven)
  function syncPreviewForId(id) {
    const found = draftApi.findObjectById(id);
    if (!found) return;
    const def = resolveAuthorType(found);
    if (!def) return;
    const norm = readNormalizedTransform(found);
    if (!norm) return;

    // Special spawn handling (group)
    if (found.type === "campSpawn" || found.type === "runSpawn") {
      const meshes = findAllMeshesByAuthorId(id);
      let target = findMeshByAuthorId(id);
      let top = target;
      while (top && top.parent && top.parent.userData && top.parent.userData.authorId === id) top = top.parent;
      const group = meshes.find(m=> m.userData && m.userData.isSpawnMarkerGroup) || top;
      if(group && group.userData && group.userData.isSpawnMarkerGroup){
        const facing = norm.rotationY ?? 0;
        const by = norm.position.y ?? 0;
        group.position.set(norm.position.x, by, norm.position.z);
        group.rotation.y = facing;
      }
      updateHighlight(); updateHomeMarker(); return;
    }

    // Generic visual root: find top
    let target = findMeshByAuthorId(id);
    if (!target) return;
    let top = target;
    while (top && top.parent && top.parent.userData && top.parent.userData.authorId === id) top = top.parent;

    const sizeMode = def.capabilities?.sizeMode ?? def.sizeMode ?? "box";

    if (sizeMode === "uniform") {
      const scale = norm.uniformScale ?? 1;
      // top could be Group (visualFactory) or legacy Mesh
      if (top.isGroup) {
        top.position.set(norm.position.x, norm.position.y ?? 0, norm.position.z);
        top.rotation.y = norm.rotationY ?? 0;
        top.scale.set(scale, scale, scale);
      } else if (top.isMesh) {
        // legacy path: position base
        top.position.set(norm.position.x, norm.position.y ?? 0, norm.position.z);
        top.rotation.y = norm.rotationY ?? 0;
        top.scale.set(scale, scale, scale);
      }
    } else if (sizeMode === "box") {
      const size = norm.size;
      const baseY = norm.position.y ?? 0;
      if (!size) {
        top.position.set(norm.position.x, baseY, norm.position.z);
        top.rotation.y = norm.rotationY ?? 0;
      } else if (top.isMesh && top.geometry?.type === "BoxGeometry") {
        const desiredW = size.width, desiredH = size.height, desiredD = size.depth;
        const gp = top.geometry.parameters;
        if (gp && (Math.abs(gp.width - desiredW) > 0.01 || Math.abs(gp.height - desiredH) > 0.01 || Math.abs(gp.depth - desiredD) > 0.01)) {
          const newGeo = new THREE.BoxGeometry(desiredW, desiredH, desiredD);
          top.geometry.dispose(); top.geometry = newGeo;
        }
        const center = { x: norm.position.x, y: baseY + size.height / 2, z: norm.position.z };
        // For ground/boundary which use center, vs props which also use center: both center logic same (base + h/2)
        // For water, offset is -0.04: handle via subtype check
        const isWater = found.obj.subtype === "water";
        if (isWater) top.position.set(center.x, baseY - 0.04, center.z);
        else top.position.set(center.x, center.y, center.z);
        top.rotation.y = norm.rotationY ?? 0;
      } else if (top.isGroup) {
        top.position.set(norm.position.x, baseY, norm.position.z);
        top.rotation.y = norm.rotationY ?? 0;
        // Update child box geometry sizes
        for (const child of top.children) {
          if (child.isMesh && child.geometry?.type === "BoxGeometry") {
            const desiredW = size.width, desiredH = size.height, desiredD = size.depth;
            const gp = child.geometry.parameters;
            if (gp && (Math.abs(gp.width - desiredW) > 0.01 || Math.abs(gp.height - desiredH) > 0.01 || Math.abs(gp.depth - desiredD) > 0.01)) {
              const newGeo = new THREE.BoxGeometry(desiredW, desiredH, desiredD);
              child.geometry.dispose(); child.geometry = newGeo;
            }
            // water child offset differs
            const isWaterChild = found.obj.subtype === "water";
            child.position.set(0, isWaterChild ? -0.04 : size.height / 2 - 0.02, 0);
            child.rotation.y = 0; // group handles rotation
          }
        }
        // Ladder special: its wall at height/2, rungs handled via recreate size? For ladder visual, wall height changes with size.height, we need to ensure wall geometry height matches.
        // For ladder, the visualFactory already creates wall with current size; resizing via generic box logic above handles first child (wall) but rungs positions should be recomputed? For now handle wall only.
        if (found.type === "climbable" || found.collection === "climbables") {
          // For climbable, ensure wall height and rung distribution coherent: we can simply recreate visual via visualFactory if size changed significantly
          // Simpler: if size.height changed more than 0.01, rebuild visual group via createVisual
          // But to keep simple, we will just update wall mesh height; rungs will stay at old positions (acceptable for now). Full rebuild can be added later.
        }
      } else {
        top.position.set(norm.position.x, baseY, norm.position.z);
        top.rotation.y = norm.rotationY ?? 0;
      }
    } else {
      // none (waypoint/beacon/poi without scale) — just position/rotation
      top.position.set(norm.position.x, norm.position.y ?? 0, norm.position.z);
      top.rotation.y = norm.rotationY ?? 0;
    }

    // Presentation / proxy handling (generic for all types that support presentation)
    const obj = found.obj;
    const vis = obj.visibleInPlay !== false;
    const op = obj.opacity ?? 1;
    const col = obj.color ?? obj.tint;
    const meshes = findAllMeshesByAuthorId(id);
    // Apply visibility/opacity/tint to non-proxy meshes
    for (const m of meshes) {
      if (m.userData && m.userData.isEditProxy) continue;
      if (m.isMesh) {
        // For waypoints etc which hide not applicable? Still keep visible as per vis
        if (def.capabilities.presentation || def.capabilities.collisionControl || found.collection === "props" || found.collection === "groundPatches" || found.collection === "boundaryColliders") {
          m.visible = vis;
        }
        const needsTint = col !== undefined;
        const needsOpacity = op < 1 - 1e-6;
        if ((needsTint || needsOpacity) && (found.collection === "props" || found.collection === "groundPatches" || found.collection === "boundaryColliders")) {
          if (!m.userData.hasClonedMaterial) {
            m.material = m.material.clone();
            m.userData.hasClonedMaterial = true;
            if (m.userData.baseColor === undefined) m.userData.baseColor = m.material.color.getHex();
            m.userData.baseTransparent = m.material.transparent;
            m.userData.baseOpacity = m.material.opacity ?? 1;
          }
          if (needsTint) {
            const hex = parseTintColor(col, m.userData.baseColor ?? m.material.color.getHex());
            m.material.color.setHex(hex);
          } else if (m.userData.baseColor !== undefined) {
            m.material.color.setHex(m.userData.baseColor);
          }
          if (needsOpacity) { m.material.transparent = true; m.material.opacity = op; }
          else { m.material.transparent = false; m.material.opacity = 1; }
        } else if (m.userData.hasClonedMaterial && (found.collection === "props" || found.collection === "groundPatches")) {
          if (m.userData.baseColor !== undefined) m.material.color.setHex(m.userData.baseColor);
          m.material.transparent = !!m.userData.baseTransparent;
          m.material.opacity = m.userData.baseOpacity ?? 1;
        }
      } else if (m.isGroup && (def.capabilities.presentation || found.collection === "props")) {
        m.visible = vis;
      }
    }

    // Live proxy lifecycle: ensure proxy exists when hidden+collidable, remove/hide when visible
    const enabled = obj.collisionEnabled !== false;
    // Only types with collisionControl or presentation get proxy semantics; but for safety, consider all with enabled collision
    const shouldHaveProxy = !vis && enabled;
    // Find existing proxies
    let proxies = [];
    scene.traverse(o=>{ if(o.userData && o.userData.isEditProxy && o.userData.proxyFor===id) proxies.push(o); });
    if (shouldHaveProxy && proxies.length===0) {
      // Create proxy immediately (no Play→Edit needed)
      const size = norm.size ?? { width: 1, height: 1, depth: 1 };
      const baseY2 = norm.position.y ?? 0;
      const w=size.width, h=size.height, d=size.depth;
      const rotY = norm.rotationY ?? 0;
      let proxyColor = 0xffff00;
      if (found.collection==="groundPatches") proxyColor = 0x7bb26a;
      else if (found.collection==="boundaryColliders") proxyColor = 0x5a6a7a;
      else if (found.obj.subtype==="fence") proxyColor = 0x8b7a5a;
      else if (found.obj.subtype==="forestBoundary") proxyColor = 0x2d4a2e;
      const geo = new THREE.BoxGeometry(w,h,d);
      const mat = new THREE.MeshBasicMaterial({ color: proxyColor, wireframe: true, transparent: true, opacity: 0.42 });
      const proxy = new THREE.Mesh(geo, mat);
      // position at same as visual center
      if (sizeMode==="box") {
        proxy.position.set(norm.position.x, baseY2 + h/2, norm.position.z);
        proxy.rotation.y = rotY;
      } else {
        proxy.position.set(norm.position.x, baseY2, norm.position.z);
        proxy.rotation.y = rotY;
        const s = norm.uniformScale ?? 1;
        proxy.scale.set(s,s,s);
      }
      proxy.name = `${id}__proxy`;
      proxy.userData.authorId=id;
      proxy.userData.isEditProxy=true;
      proxy.userData.proxyFor=id;
      proxy.visible = isEdit;
      scene.add(proxy);
      proxies=[proxy];
      if(top) top.userData.proxyMesh = proxy;
    }
    for (const p of proxies) {
      p.visible = isEdit && shouldHaveProxy;
      // keep transform coherent
      if (sizeMode==="box" && norm.size) {
        const w=norm.size.width, h=norm.size.height, d=norm.size.depth;
        const gp = p.geometry.parameters;
        if(gp && (Math.abs(gp.width-w)>0.01 || Math.abs(gp.height-h)>0.01 || Math.abs(gp.depth-d)>0.01)){
          const newGeo=new THREE.BoxGeometry(w,h,d);
          p.geometry.dispose(); p.geometry=newGeo;
        }
        const baseY2 = norm.position.y ??0;
        p.position.set(norm.position.x, baseY2 + h/2, norm.position.z);
        p.rotation.y = norm.rotationY ??0;
      } else if (sizeMode==="uniform") {
        p.position.set(norm.position.x, norm.position.y ??0, norm.position.z);
        p.rotation.y = norm.rotationY ??0;
        const s = norm.uniformScale ??1;
        p.scale.set(s,s,s);
      } else {
        p.position.set(norm.position.x, norm.position.y ??0, norm.position.z);
        p.rotation.y = norm.rotationY ??0;
      }
    }
    // Also handle old proxyMesh linkage
    scene.traverse(o=>{
      if(o.userData && o.userData.proxyMesh && o.userData.proxyMesh.userData && o.userData.proxyMesh.userData.proxyFor===id){
        o.userData.proxyMesh.visible = isEdit && shouldHaveProxy;
      }
    });

    updateHighlight();
    updateHomeMarker();
  }

  function removePreviewMesh(id) {
    const meshes = findAllMeshesByAuthorId(id);
    for (const m of meshes) {
      if (m.parent) m.parent.remove(m);
    }
    if (highlightMesh) { scene.remove(highlightMesh); highlightMesh = null; }
    if (homeMarker) { scene.remove(homeMarker); homeMarker = null; }
  }
  function updateHomeMarker() {
    if (homeMarker) { scene.remove(homeMarker); homeMarker = null; }
    if (!selectedId) return;
    const found = draftApi.findObjectById(selectedId);
    if (!found || found.type !== "creature") return;
    const spawn = found.obj.pos;
    const home = found.obj.homePos;
    if (!spawn || !home) return;
    const group = new THREE.Group(); group.name = "home-marker";
    const geo = new THREE.CylinderGeometry(0.12, 0.12, 1.0, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x30d158, emissive: 0x0a3a1a, emissiveIntensity: 0.2 });
    const pillar = new THREE.Mesh(geo, mat); pillar.position.set(home.x, 0.5, home.z); group.add(pillar);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.45, 16), new THREE.MeshBasicMaterial({ color: 0x30d158, transparent: true, opacity: 0.6, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI/2; ring.position.set(home.x, 0.07, home.z); group.add(ring);
    if (Math.hypot(spawn.x - home.x, spawn.z - home.z) > 0.1) {
      const pts = [new THREE.Vector3(spawn.x, 0.1, spawn.z), new THREE.Vector3(home.x, 0.1, home.z)];
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x30d158, transparent: true, opacity: 0.7 }));
      group.add(line);
    }
    if (found.obj.roamRadius) {
      const roamGeo = new THREE.RingGeometry(Math.max(0.1, found.obj.roamRadius -0.05), found.obj.roamRadius +0.05, 24);
      const roamMat = new THREE.MeshBasicMaterial({ color: 0x30d158, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
      const roamRing = new THREE.Mesh(roamGeo, roamMat); roamRing.rotation.x = -Math.PI/2; roamRing.position.set(home.x, 0.06, home.z); group.add(roamRing);
    }
    scene.add(group); homeMarker = group;
  }

  let spawnMarkers = [];
  function clearSpawnMarkers() {
    for (const m of spawnMarkers) scene.remove(m);
    spawnMarkers = [];
  }
  function ensureSpawnMarkers() {
    clearSpawnMarkers();
    // Camp spawn
    const campFound = draftApi.findObjectById("camp_spawn");
    if (campFound) createSpawnMarker("camp_spawn", campFound.obj.pos, campFound.obj.facingYaw ?? 0, 0x7ab8ff);
    for (const region of draftApi.getDraft().regions) {
      for (const wp of region.majorWaypoints ?? []) {
        const id = wp.id + "__runSpawn";
        const found = draftApi.findObjectById(id);
        if (!found) continue;
        createSpawnMarker(id, found.obj.pos, found.obj.facingYaw ?? 0, 0xffd54f);
        // line from waypoint to run spawn
        const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(wp.pos.x, (wp.pos.y??0)+0.1, wp.pos.z), new THREE.Vector3(found.obj.pos.x, (found.obj.pos.y??0)+0.1, found.obj.pos.z)]);
        const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x8aa0c0, transparent:true, opacity:0.5, linewidth:1 }));
        line.userData.authorId = id;
        line.userData.isSpawnLine = true;
        scene.add(line); spawnMarkers.push(line);
      }
    }
  }
  function createSpawnMarker(id, pos, facing, color) {
    const baseY = pos.y ?? 0;
    const group = new THREE.Group();
    group.position.set(pos.x, baseY, pos.z);
    group.rotation.y = facing;
    group.userData.authorId = id;
    group.userData.isSpawnMarkerGroup = true;
    group.name = id;
    const capsuleGeo = new THREE.CapsuleGeometry(0.32, 0.4, 8, 12);
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.18, transparent:true, opacity:0.92 });
    const capsule = new THREE.Mesh(capsuleGeo, mat);
    capsule.position.y = 0.52;
    capsule.userData.authorId = id; capsule.userData.isSpawnMarker = true;
    group.add(capsule);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 16), new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.45, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI/2; ring.position.y = 0.06; ring.userData.authorId = id; ring.userData.isSpawnRing = true;
    group.add(ring);
    const arrowGeo = new THREE.ConeGeometry(0.18, 0.35, 8);
    const arrowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity:0.2 });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.position.set(0, 0.12, 0.55);
    arrow.rotation.x = Math.PI/2;
    arrow.userData.authorId = id; arrow.userData.isSpawnArrow = true;
    group.add(arrow);
    // foot print
    const footGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.04, 12);
    const foot = new THREE.Mesh(footGeo, new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.28 }));
    foot.position.y = 0.02; foot.userData.authorId = id; foot.userData.isSpawnMarker = true;
    group.add(foot);
    scene.add(group); spawnMarkers.push(group);
    // also add individual meshes for findAllMeshesByAuthorId
  }
  function updateSpawnMarkers() {
    for (const id of ["camp_spawn"]) {
      const found = draftApi.findObjectById(id);
      if (!found) continue;
      syncPreviewForId(id);
    }
    for (const region of draftApi.getDraft().regions) for (const wp of region.majorWaypoints ?? []) {
      const id = wp.id + "__runSpawn";
      syncPreviewForId(id);
    }
    // update line geometry for run spawns
    for (const line of spawnMarkers) if (line.isLine && line.userData.isSpawnLine) {
      const id = line.userData.authorId;
      const baseId = id.replace("__runSpawn","");
      const wp = draftApi.getDraft().regions.flatMap(r=>r.majorWaypoints??[]).find(w=>w.id===baseId);
      const rs = draftApi.findObjectById(id);
      if (wp && rs) {
        const pts = [new THREE.Vector3(wp.pos.x, (wp.pos.y??0)+0.1, wp.pos.z), new THREE.Vector3(rs.obj.pos.x, (rs.obj.pos.y??0)+0.1, rs.obj.pos.z)];
        line.geometry.setFromPoints(pts);
      }
    }
  }

  function createPreviewMeshForNewObject(id) {
    const found = draftApi.findObjectById(id);
    if (!found) return;
    // If mesh already exists, just sync
    if(findMeshByAuthorId(id)) { syncPreviewForId(id); return; }
    const def = resolveAuthorType(found);
    if (!def) {
      // fallback simple box
      const geo = new THREE.BoxGeometry(1,1,1);
      const mat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = id;
      mesh.userData.authorId = id;
      scene.add(mesh);
      syncPreviewForId(id);
      return;
    }
    const visualRef = getAuthorVisualRef(found);
    const norm = readNormalizedTransform(found);
    // Prepare visual creation opts with size where applicable
    const opts = { objectId: id };
    if (norm && norm.size) opts.size = norm.size;
    if (norm && norm.uniformScale) opts.uniformScale = norm.uniformScale;
    if (found.obj.type) opts.poiType = found.obj.type;
    if (found.obj.subtype) opts.subtype = found.obj.subtype;
    const visual = createVisual(visualRef, opts);
    visual.name = id;
    visual.userData.authorId = id;
    // Propagate authorId to children for raycast picking
    visual.traverse((child)=>{ if(child.isMesh) { child.userData.authorId = id; } });
    // Set initial transform from normalized (so preview appears immediately at correct location)
    if (norm) {
      if (def.capabilities.sizeMode === "uniform") {
        const s = norm.uniformScale ?? 1;
        visual.position.set(norm.position.x, norm.position.y ?? 0, norm.position.z);
        visual.rotation.y = norm.rotationY ?? 0;
        visual.scale.set(s,s,s);
      } else if (def.capabilities.sizeMode === "box") {
        // For box, visual's child offset handles height; group at base
        visual.position.set(norm.position.x, norm.position.y ?? 0, norm.position.z);
        visual.rotation.y = norm.rotationY ?? 0;
        // Geometry size already may need adjustment; syncPreview will handle resizing
      } else {
        visual.position.set(norm.position.x, norm.position.y ?? 0, norm.position.z);
        visual.rotation.y = norm.rotationY ?? 0;
      }
    } else {
      const pos = found.obj.pos ?? { x: found.obj.x ?? 0, y: found.obj.y ?? 0, z: found.obj.z ?? 0 };
      visual.position.set(pos.x, pos.y ?? 0, pos.z);
    }
    scene.add(visual);
    syncPreviewForId(id);
  }

  function collectHudElements() {
    const els = [];
    const hud = document.getElementById("hud");
    if (hud) els.push(hud);
    const auto = document.getElementById("auto-harvest-toggle");
    if (auto) els.push(auto);
    const joy = document.getElementById("joystick-layer");
    if (joy) els.push(joy);
    const inv = document.getElementById("run-inventory-hud");
    if (inv) els.push(inv);
    const combat = document.getElementById("combat-hud");
    if (combat) els.push(combat);
    const inv2 = document.getElementById("hud"); // already
    return els;
  }
  function setHudVisible(visible) {
    const els = collectHudElements();
    for (const el of els) {
      if (!visible) {
        el.dataset.prevDisplay = el.style.display;
        el.style.display = "none";
      } else {
        el.style.display = el.dataset.prevDisplay || "";
        delete el.dataset.prevDisplay;
      }
    }
    // Also ensure joystick visuals hidden: if hidden, the touchMovement still may show via showVisuals; our touch edit guard prevents, but also hide container
    const joy = document.getElementById("joystick-layer");
    if (joy && !visible) joy.style.display = "none";
  }
  function setFogForEdit(edit) {
    if (edit) {
      originalFog = scene.fog;
      scene.fog = null;
    } else {
      scene.fog = originalFog;
    }
  }
  function setForestTransparency(edit) {
    if (edit) {
      forestMats = [];
      scene.traverse((obj) => {
        if (obj.isMesh && obj.userData && obj.userData.isForestBoundary) {
          forestMats.push({ mesh: obj, opacity: obj.material.opacity, transparent: obj.material.transparent });
          obj.material.transparent = true;
          obj.material.opacity = 0.22;
          obj.material.wireframe = false;
        }
      });
    } else {
      for (const entry of forestMats) {
        entry.mesh.material.opacity = entry.opacity;
        entry.mesh.material.transparent = entry.transparent;
      }
      forestMats = [];
    }
  }
  function setProxyVisibility(edit) {
    scene.traverse((obj) => {
      if (obj.userData && obj.userData.isEditProxy) {
        obj.visible = !!edit;
      }
      if (obj.userData && obj.userData.proxyMesh) {
        const proxy = obj.userData.proxyMesh;
        // proxy visible only in Edit when real is hidden
        if (proxy) proxy.visible = !!edit && !obj.visible;
      }
    });
  }

  function reconcilePreview(){
    // Reconcile canonical draft vs scene preview (commit/undo/redo/place/delete)
    const allIds = draftApi.getAllObjectIds ? draftApi.getAllObjectIds() : [];
    const idSet = new Set(allIds);
    // Remove stale meshes
    const toRemove=[];
    scene.traverse((o)=>{
      if(o.userData && o.userData.authorId){
        const aid = o.userData.authorId;
        // keep spawn marker group children? They share authorId but parent group is the owner
        // Check if aid not in canonical and not a proxy for existing? Proxies share same aid but should remain if owner hidden
        if(!idSet.has(aid) && !o.userData.isEditProxy && !o.userData.proxyFor){
          // also check if it's spawn line proxy? Those have isSpawnLine but same aid as spawn, but if spawn still exists, keep
          // For now, if aid is like "something__runSpawn" and not in set but base waypoint exists? Actually runSpawn ids are in set
          toRemove.push(o);
        } else if(o.userData.isSpawnLine || o.userData.isSpawnMarkerGroup){
          // spawn lines/markers: check if corresponding spawn still exists
          if(!idSet.has(aid)) toRemove.push(o);
        }
      }
      if(o.userData && o.userData.isEditProxy && o.userData.proxyFor){
        if(!idSet.has(o.userData.proxyFor)) toRemove.push(o);
      }
    });
    for(const o of toRemove){
      if(o.parent) o.parent.remove(o);
      if(o.geometry) try{ o.geometry.dispose(); }catch{}
      if(o.material) try{ if(Array.isArray(o.material)) o.material.forEach(m=>m.dispose()); else o.material.dispose(); }catch{}
    }
    // Ensure meshes for existing ids
    for(const id of allIds){
      if(id==="camp_spawn" || id.endsWith("__runSpawn")) continue;
      if(!findMeshByAuthorId(id)){
        createPreviewMeshForNewObject(id);
      }
      syncPreviewForId(id);
    }
    // Spawn markers
    if(isEdit){ ensureSpawnMarkers(); updateSpawnMarkers(); }
    updateHighlight();
    updateHomeMarker();
    updateOverlays();
    if(isEdit) updateEditorVisibility();
    if(ui.refreshHierarchy) ui.refreshHierarchy();
  }
  function updateEditorVisibility() {
    if (!isEdit) return;
    const focus = { x: camera.position.x, z: camera.position.z };
    let focusRegion = null;
    try { focusRegion = draftApi.findContainingRegion({ x: focus.x, z: focus.z }); if (!focusRegion) focusRegion = draftApi.findNearestRegion({ x: focus.x, z: focus.z }); } catch {}
    if (!focusRegion) return;
    // Use draft-derived neighbor expansion: draft neighbors for that region
    const draftRegion = draftApi.findRegion(focusRegion);
    let activeSet = new Set([focusRegion]);
    if (draftRegion && Array.isArray(draftRegion.neighbors)) for (const nid of draftRegion.neighbors) activeSet.add(nid);
    const activeIds = [...activeSet];
    if (resourceSystem) resourceSystem.setActiveRegions(activeIds);
    if (creatureSystem) creatureSystem.setActiveRegions(activeIds);
    highlightOverlayForSelected();
  }

  // Place mode
  function enterPlaceMode(item) {
    pendingPlace = item;
    const label = item.label || item.kind;
    ui.showPlaceHint(`Click world to place ${label} — Esc to cancel`);
    // Change cursor
    renderer.domElement.style.cursor = "crosshair";
  }
  function exitPlaceMode() {
    pendingPlace = null;
    ui.hidePlaceHint();
    renderer.domElement.style.cursor = "";
  }

  function handlePlaceClick(worldPos) {
    if (!pendingPlace) return false;
    let regionId = draftApi.findContainingRegion({ x: worldPos.x, z: worldPos.z });
    if (!regionId) regionId = draftApi.findNearestRegion({ x: worldPos.x, z: worldPos.z });
    const targetRegion = regionId || draftApi.getDraft().regions[0]?.id;
    const kind = pendingPlace.kind;
    const subtype = pendingPlace.subtype;
    // Atomic creation at final intended position (no intermediate mutate)
    const res = draftApi.createObjectAtPosition(kind, subtype, worldPos, targetRegion);
    if (!res.ok) { ui.setStatus("⚠ "+res.error, true); return true; }
    const newId = res.id;
    const v = draftApi.validate();
    if (!v.ok) { ui.setStatus("⚠ " + v.error, true); }
    else ui.setStatus(`Placed ${newId} at ${worldPos.x.toFixed(1)}, ${worldPos.z.toFixed(1)}`, false);
    ui.refreshRegionSelects();
    ui.setSelected(newId);
    selectedId = newId;
    reconcilePreview();
    syncPreviewForId(newId);
    updateHighlight();
    updateEditorVisibility();
    exitPlaceMode();
    return true;
  }

  function init() {
    if (!isEnabled()) {
      ui.hide();
      return { enabled: false, draftApi, ui, isEditMode: () => false, suppressGameplay: () => false, selectedId: () => null, updateEditorVisibility: () => {} };
    }
    ui.show();
    createOverlays();
    const canvas = renderer.domElement;
    // Selection / placement / drag handling
    canvas.addEventListener("pointerdown", onPointerDown, true);
    canvas.addEventListener("pointermove", onPointerMove, true);
    canvas.addEventListener("pointerup", onPointerUp, true);
    canvas.addEventListener("click", onCanvasClick, true);
    window.addEventListener("keydown", onKeyDown);
    // Editor pan/zoom
    let isPanning = false;
    let lastX = 0, lastY = 0;
    canvas.addEventListener("mousedown", (e) => {
      if (!isEdit) return;
      if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
        isPanning = true; lastX = e.clientX; lastY = e.clientY; e.preventDefault();
      }
    }, true);
    canvas.addEventListener("mousemove", (e) => {
      if (!isPanning || !isEdit) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      panEditorCamera(dx * -0.04, dy * -0.04); // inverted vertical per 3.5B.1
      updateEditorVisibility();
    }, true);
    canvas.addEventListener("mouseup", () => isPanning = false, true);
    canvas.addEventListener("wheel", (e) => {
      if (!isEdit) return;
      e.preventDefault();
      zoomEditorCamera(e.deltaY * 0.02);
      updateEditorVisibility();
    }, { passive: false });
    canvas.addEventListener("contextmenu", (e) => { if (isEdit) e.preventDefault(); }, true);
    // Also hide context menu on place mode right click cancel
    canvas.addEventListener("mousedown", (e) => {
      if (pendingPlace && e.button === 2) { exitPlaceMode(); e.preventDefault(); e.stopPropagation(); }
    }, true);
    ui.setStatus(usingDraft ? "Loaded draft from localStorage" : "Using repo world — edit to create draft", false);
    // Initial editor visibility will be set on enterEdit
    return { enabled: true, draftApi, ui, isEditMode: () => isEdit, suppressGameplay: () => suppressGameplay, getSelectedId: () => selectedId, updateEditorVisibility };
  }

  // Expose setter for systems after init (main.js may call)
  function setSystems(systems) {
    if (systems.resourceSystem) resourceSystem = systems.resourceSystem;
    if (systems.creatureSystem) creatureSystem = systems.creatureSystem;
    if (systems.regionManager) regionManager = systems.regionManager;
    if (systems.worldRegistry) { /* already */ }
  }

  function enterEdit() {
    editorCameraState = { pos: camera.position.clone(), rot: camera.rotation.clone(), fov: camera.fov, fog: scene.fog };
    const ext = draftApi.getWorldExtents ? draftApi.getWorldExtents() : { minX: -12.5, maxX: 12.5, minZ: -11.5, maxZ: 11.5 };
    const cx = (ext.minX + ext.maxX) * 0.5;
    const cz = (ext.minZ + ext.maxZ) * 0.5;
    const span = Math.max(ext.maxX - ext.minX, ext.maxZ - ext.minZ);
    const height = Math.max(22, Math.min(42, span * 1.1));
    camera.position.set(cx, height, cz + 0.1);
    camera.lookAt(cx, 0, cz);
    camera.updateMatrixWorld();
    setOverlaysVisible(true);
    setFogForEdit(true);
    setHudVisible(false);
    setForestTransparency(true);
    setProxyVisibility(true);
    ensureSpawnMarkers();
    updateEditorVisibility();
    renderer.domElement.style.cursor = pendingPlace ? "crosshair" : "";
  }
  function exitEdit() {
    if (editorCameraState) {
      camera.position.copy(editorCameraState.pos);
      camera.rotation.copy(editorCameraState.rot);
      camera.fov = editorCameraState.fov;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      editorCameraState = null;
    }
    setOverlaysVisible(false);
    setFogForEdit(false);
    setHudVisible(true);
    setForestTransparency(false);
    setProxyVisibility(false);
    clearSpawnMarkers();
    exitPlaceMode();
    renderer.domElement.style.cursor = "";
  }
  function panEditorCamera(dx, dz) {
    camera.position.x += dx;
    camera.position.z += dz;
  }
  function zoomEditorCamera(delta) {
    camera.position.y = Math.max(8, Math.min(40, camera.position.y + delta));
    camera.updateProjectionMatrix();
  }
  function createOverlays() {
    const draft = draftApi.getDraft();
    for (const region of draft.regions) {
      const b = region.bounds;
      const pts = [ new THREE.Vector3(b.minX, 0.08, b.minZ), new THREE.Vector3(b.maxX, 0.08, b.minZ), new THREE.Vector3(b.maxX, 0.08, b.maxZ), new THREE.Vector3(b.minX, 0.08, b.maxZ), new THREE.Vector3(b.minX, 0.08, b.minZ) ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.9 });
      const line = new THREE.Line(geo, mat);
      line.name = `overlay_${region.id}`;
      line.userData.regionId = region.id;
      line.visible = false;
      scene.add(line);
      regionOverlays.push(line);
      const label = makeLabel(region.id, b);
      scene.add(label);
      regionOverlays.push(label);
    }
  }
  function makeLabel(text, bounds) {
    const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext("2d"); ctx.fillStyle = "rgba(15,20,32,0.85)"; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle = "#4fc3f7"; ctx.font = "bold 20px system-ui"; ctx.fillText(text, 12, 38);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    const cx = (bounds.minX + bounds.maxX) * 0.5; const cz = (bounds.minZ + bounds.maxZ) * 0.5;
    sprite.position.set(cx, 1.2, cz); sprite.scale.set(3.5, 0.9, 1); sprite.visible = false; sprite.name = `label_${text}`; return sprite;
  }
  function setOverlaysVisible(visible) {
    for (const o of regionOverlays) o.visible = visible;
    highlightOverlayForSelected();
  }
  function highlightOverlayForSelected() {
    for (const line of regionOverlays) {
      if (line.isLine && line.userData.regionId) {
        const isSel = selectedId && draftApi.findObjectById(selectedId)?.region.id === line.userData.regionId;
        line.material.color.set(isSel ? 0xffd54f : 0x4fc3f7);
        line.material.opacity = isSel ? 1.0 : 0.7;
      }
    }
  }
  function updateOverlays() {
    const draft = draftApi.getDraft();
    for (const line of regionOverlays) {
      if (line.isLine && line.userData.regionId) {
        const region = draft.regions.find(r => r.id === line.userData.regionId);
        if (!region) continue;
        const b = region.bounds;
        const pts = [ new THREE.Vector3(b.minX, 0.08, b.minZ), new THREE.Vector3(b.maxX, 0.08, b.minZ), new THREE.Vector3(b.maxX, 0.08, b.maxZ), new THREE.Vector3(b.minX, 0.08, b.maxZ), new THREE.Vector3(b.minX, 0.08, b.minZ) ];
        line.geometry.setFromPoints(pts);
      }
    }
    highlightOverlayForSelected();
    updateHighlight();
  }

  // Raycast helpers
  function getGroundIntersection(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
    const pt = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, pt);
    return pt;
  }

  function onPointerDown(e) {
    if (!isEdit) return;
    if (pendingPlace) return;
    if (e.button !== 0) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    let hitSelected = false;
    for (const hit of hits) {
      let cur = hit.object;
      while (cur) {
        if (cur.userData && cur.userData.authorId === selectedId) { hitSelected = true; break; }
        if (cur.name === selectedId) { hitSelected = true; break; }
        cur = cur.parent;
      }
      if (hitSelected) break;
    }
    if (hitSelected && selectedId) {
      isDragging = true;
      const pt = getGroundIntersection(e);
      const found = draftApi.findObjectById(selectedId);
      if (found) {
        const def = resolveAuthorType(found);
        const norm = def ? readNormalizedTransform(found) : null;
        const curPos = norm ? norm.position : (found.obj.pos || { x: found.obj.x ?? 0, y: found.obj.y ?? 0, z: found.obj.z ?? 0 });
        const curY = curPos.y ?? 0;
        dragOffset.x = curPos.x - pt.x;
        dragOffset.z = curPos.z - pt.z;
        const curFacing = norm ? (norm.rotationY ?? 0) : (found.obj.facingYaw ?? found.obj.rotY ?? 0);
        dragState = {
          id: selectedId,
          startPos: { x: curPos.x, y: curY, z: curPos.z },
          previewPos: { x: curPos.x, y: curY, z: curPos.z },
          startFacing: curFacing,
          previewFacing: curFacing,
          isSpawn: found.type==="campSpawn" || found.type==="runSpawn",
          isCreature: found.type==="creature",
          defKey: def ? def.key : null
        };
      }
      e.preventDefault(); e.stopPropagation();
      renderer.domElement.setPointerCapture(e.pointerId);
    }
  }
  let dragStartPos = null;
  let dragStartHome = null;
  function applyPreviewTransform(id, previewPos, previewFacing){
    const found = draftApi.findObjectById(id);
    if(!found) return;
    const def = resolveAuthorType(found);
    const meshes = findAllMeshesByAuthorId(id);
    let target = findMeshByAuthorId(id);
    let top = target;
    while (top && top.parent && top.parent.userData && top.parent.userData.authorId === id) top = top.parent;
    const isSpawn = found.type==="campSpawn" || found.type==="runSpawn";
    if(isSpawn){
      const group = meshes.find(m=> m.userData && m.userData.isSpawnMarkerGroup) || top;
      if(group){
        const by = previewPos.y ?? 0;
        group.position.set(previewPos.x, by, previewPos.z);
        if(previewFacing!==undefined) group.rotation.y = previewFacing;
      }
      if(id.endsWith("__runSpawn")){
        const baseId = id.replace("__runSpawn","");
        for(const line of spawnMarkers) if(line.isLine && line.userData.isSpawnLine && line.userData.authorId===id){
          const wp = draftApi.getDraft().regions.flatMap(r=>r.majorWaypoints??[]).find(w=>w.id===baseId);
          if(wp){
            const pts = [new THREE.Vector3(wp.pos.x, (wp.pos.y??0)+0.1, wp.pos.z), new THREE.Vector3(previewPos.x, (previewPos.y??0)+0.1, previewPos.z)];
            line.geometry.setFromPoints(pts);
          }
        }
      }
      updateHighlight();
      return;
    }
    // Generic preview using normalized transform: construct preview norm by overriding position
    const baseNorm = def ? readNormalizedTransform(found) : null;
    const previewNorm = baseNorm ? { ...baseNorm, position: { ...previewPos }, rotationY: previewFacing ?? baseNorm.rotationY } : { position: previewPos, rotationY: previewFacing };
    // Reuse sync logic but with previewNorm: emulate by temporarily finding top and applying similar to syncPreviewForId but with previewNorm values
    // For simplicity, directly set top transform as sync would
    if (!def || !baseNorm) {
      if(top) top.position.set(previewPos.x, previewPos.y ??0, previewPos.z);
      updateHighlight(); updateHomeMarker(); return;
    }
    const sizeMode = def.capabilities?.sizeMode ?? def.sizeMode ?? "box";
    if (sizeMode === "uniform") {
      const scale = previewNorm.uniformScale ?? 1;
      if(top) {
        if(top.isGroup) {
          top.position.set(previewPos.x, previewPos.y ??0, previewPos.z);
          top.rotation.y = previewNorm.rotationY ??0;
          top.scale.set(scale,scale,scale);
        } else {
          top.position.set(previewPos.x, previewPos.y ??0, previewPos.z);
          top.rotation.y = previewNorm.rotationY ??0;
          top.scale.set(scale,scale,scale);
        }
      }
    } else if (sizeMode === "box") {
      const size = previewNorm.size;
      const baseY = previewPos.y ??0;
      if(top && top.isMesh && top.geometry?.type==="BoxGeometry") {
        const center = { x: previewPos.x, y: baseY + (size ? size.height/2 : 0.5), z: previewPos.z };
        const isWater = found.obj.subtype === "water";
        if(isWater) top.position.set(center.x, baseY -0.04, center.z);
        else top.position.set(center.x, center.y, center.z);
        top.rotation.y = previewNorm.rotationY ??0;
      } else if(top && top.isGroup) {
        top.position.set(previewPos.x, baseY, previewPos.z);
        top.rotation.y = previewNorm.rotationY ??0;
      } else if(top) {
        top.position.set(previewPos.x, baseY, previewPos.z);
        top.rotation.y = previewNorm.rotationY ??0;
      }
      // also update individual meshes for box case where meshes are direct children not group root
      if(def.key.startsWith("prop:") || def.key==="groundPatch" || def.key==="boundaryCollider") {
        for(const m of meshes){
          if(m.userData && m.userData.isEditProxy) continue;
          if(m.isMesh && m.geometry?.type==="BoxGeometry"){
            const isWater = found.obj.subtype === "water";
            const h = size ? size.height : 1;
            m.position.set(previewPos.x, isWater ? baseY -0.04 : baseY + h/2 -0.02, previewPos.z);
            m.rotation.y = previewNorm.rotationY ??0;
          }
        }
      }
    } else {
      if(top) top.position.set(previewPos.x, previewPos.y ??0, previewPos.z);
      if(top) top.rotation.y = previewNorm.rotationY ??0;
    }
    updateHighlight();
    updateHomeMarker();
  }
  function onPointerMove(e) {
    if (!isEdit || !isDragging || !selectedId || !dragState) return;
    const pt = getGroundIntersection(e);
    const newX = pt.x + dragOffset.x;
    const newZ = pt.z + dragOffset.z;
    dragState.previewPos.x = newX;
    dragState.previewPos.z = newZ;
    applyPreviewTransform(selectedId, dragState.previewPos, dragState.previewFacing);
    e.preventDefault();
  }
  function onPointerUp(e) {
    if (isDragging) {
      isDragging = false;
      if(dragState && selectedId === dragState.id){
        const previewPos = { ...dragState.previewPos };
        const previewFacing = dragState.previewFacing;
        dragState = null;
        // Use normalized transform write via registry
        const found = draftApi.findObjectById(selectedId);
        const def = found ? resolveAuthorType(found) : null;
        let res;
        if (def) {
          const baseNorm = readNormalizedTransform(found);
          const normalized = { ...baseNorm, position: previewPos };
          if (previewFacing !== undefined) normalized.rotationY = previewFacing;
          // Preserve size/uniformScale from base
          res = draftApi.updateNormalizedTransform(selectedId, normalized);
        } else {
          const patch = { pos: previewPos };
          res = draftApi.updateTransform(selectedId, patch);
        }
        if (!res.ok) {
          ui.setStatus("⚠ "+res.error, true);
          syncPreviewForId(selectedId);
          updateSpawnMarkers();
        } else {
          ui.setStatus(`Moved ${selectedId}`, false);
          reconcilePreview();
          syncPreviewForId(selectedId);
          updateSpawnMarkers();
          ui.setSelected(selectedId);
          if(ui.refreshHierarchy) ui.refreshHierarchy();
        }
      } else {
        dragState = null;
        syncPreviewForId(selectedId);
      }
      dragStartPos = null; dragStartHome = null;
      updateEditorVisibility();
      try { renderer.domElement.releasePointerCapture(e.pointerId); } catch {}
      e.preventDefault(); e.stopPropagation();
    }
  }

  function onCanvasClick(e) {
    if (!isEdit) return;
    // If dragging just finished, ignore click
    if (isDragging) return;
    // If pending place, place object at click ground
    if (pendingPlace) {
      const pt = getGroundIntersection(e);
      e.preventDefault(); e.stopPropagation();
      handlePlaceClick(pt);
      return;
    }
    // Don't treat right-click or ctrl as selection
    if (e.button !== 0) return;
    // Avoid selecting when we just dragged (mouse moved)
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    let picked = null;
    // Prefer direct authorId hits
    for (const hit of intersects) {
      let cur = hit.object;
      while (cur) {
        if (cur.userData && cur.userData.authorId) { picked = cur.userData.authorId; break; }
        if (cur.userData && (cur.userData.propId || cur.userData.resourceId || cur.userData.creatureId || cur.userData.anchorId || cur.userData.poiId || cur.userData.platformId)) {
          picked = cur.userData.propId || cur.userData.resourceId || cur.userData.creatureId || cur.userData.anchorId || cur.userData.poiId || cur.userData.platformId; break;
        }
        if (cur.name && draftApi.findObjectById(cur.name)) { picked = cur.name; break; }
        cur = cur.parent;
      }
      if (picked) break;
    }
    // If no direct hit, try ground plane nearest (fallback only if very close)
    // We already have reliable pick proxies, so no fallback nearest needed
    if (picked) {
      selectedId = picked;
      ui.setSelected(picked);
      updateHighlight();
      highlightOverlayForSelected();
      e.preventDefault(); e.stopPropagation();
    } else {
      // Click empty ground deselect? Keep selected but allow place mode cancel?
      // Don't deselect on empty click if pendingPlace? Already handled
      // Optionally deselect:
      // selectedId = null; ui.setSelected(null); updateHighlight();
    }
  }

  function isTextEditingTarget(el) {
    if (!el) return false;
    const tag = el.tagName ? el.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (el.isContentEditable) return true;
    return false;
  }
  function onKeyDown(e) {
    // bounded workflow: only in Edit and not when editing fields
    if (isTextEditingTarget(document.activeElement)) return;
    if (e.key === "Escape") {
      if (pendingPlace) { exitPlaceMode(); e.preventDefault(); return; }
      if (isDragging || dragState) {
        isDragging = false;
        if(dragState){
          // cancel preview, restore canonical presentation
          syncPreviewForId(dragState.id);
          updateSpawnMarkers();
          dragState=null;
        }
        dragStartPos=null; dragStartHome=null; e.preventDefault(); return;
      }
    }
    if (!isEdit) return;
    const isCtrl = e.ctrlKey || e.metaKey;
    if (isCtrl && e.key.toLowerCase() === "z" && !e.shiftKey) {
      e.preventDefault();
      const res = draftApi.undo();
      if (res.ok) {
        ui.setStatus("Undo", false);
        if (selectedId && !draftApi.findObjectById(selectedId)) { selectedId = null; ui.setSelected(null); }
        reconcilePreview();
      } else ui.setStatus(res.error, true);
      return;
    }
    if (isCtrl && ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y")) {
      e.preventDefault();
      const res = draftApi.redo();
      if (res.ok) {
        ui.setStatus("Redo", false);
        reconcilePreview();
      } else ui.setStatus(res.error, true);
      return;
    }
    if (!selectedId) return;
    // Delete
    if (e.key === "Delete" || e.key === "Backspace") {
      if (isTextEditingTarget(e.target)) return;
      e.preventDefault();
      const res = draftApi.deleteObject(selectedId);
      if (res.ok) {
        const deleted = selectedId;
        selectedId = null; ui.setSelected(null);
        reconcilePreview();
        ui.setStatus(`Deleted ${deleted}`, false);
      } else ui.setStatus(res.error, true);
      return;
    }
    // Focus
    if (e.key.toLowerCase() === "f" && !isCtrl) {
      e.preventDefault();
      const found = draftApi.findObjectById(selectedId);
      if (!found) return;
      const pos = found.obj.pos || { x: found.obj.x, z: found.obj.z };
      if (!pos) return;
      camera.position.x = pos.x;
      camera.position.z = pos.z + 5;
      camera.lookAt(pos.x, 0, pos.z);
      camera.updateMatrixWorld();
      updateHighlight(); updateHomeMarker(); updateEditorVisibility();
      return;
    }
    const step = e.shiftKey ? 1.0 : 0.2;
    let dx = 0, dz = 0;
    // WASD + arrows
    const k = e.key.toLowerCase();
    if (k === "arrowup" || k === "w") dz = -step;
    else if (k === "arrowdown" || k === "s") dz = step;
    else if (k === "arrowleft" || k === "a") dx = -step;
    else if (k === "arrowright" || k === "d") dx = step;
    else if (k === "q") {
      e.preventDefault();
      const f = draftApi.findObjectById(selectedId);
      if (!f) return;
      const def = resolveAuthorType(f);
      const base = readNormalizedTransform(f);
      if (!base) return;
      const delta = -15 * Math.PI/180;
      const newRot = (base.rotationY ?? 0) + delta;
      const normalized = { ...base, rotationY: newRot };
      // For spawns, rotation maps to facingYaw; read already gave rotationY as facingYaw
      const res = draftApi.updateNormalizedTransform(selectedId, normalized);
      if (!res.ok) ui.setStatus(res.error, true);
      else {
        ui.setStatus(`Rotated ${selectedId}`, false);
        syncPreviewForId(selectedId);
        if (f.type==="campSpawn"||f.type==="runSpawn") updateSpawnMarkers();
        ui.setSelected(selectedId); updateHighlight();
      }
      return;
    } else if (k === "e") {
      if (!isEdit) return;
      e.preventDefault();
      const f = draftApi.findObjectById(selectedId);
      if (!f) return;
      const base = readNormalizedTransform(f);
      if (!base) return;
      const newRot = (base.rotationY ?? 0) + (15 * Math.PI/180);
      const normalized = { ...base, rotationY: newRot };
      const res = draftApi.updateNormalizedTransform(selectedId, normalized);
      if (!res.ok) ui.setStatus(res.error, true);
      else {
        ui.setStatus(`Rotated ${selectedId}`, false);
        syncPreviewForId(selectedId);
        if (f.type==="campSpawn"||f.type==="runSpawn") updateSpawnMarkers();
        ui.setSelected(selectedId); updateHighlight();
      }
      return;
    } else if (k === " " || k === "c") {
      e.preventDefault();
      const f = draftApi.findObjectById(selectedId);
      if (!f) return;
      const base = readNormalizedTransform(f);
      if (!base) return;
      const isUp = k === " ";
      const delta = isUp ? 0.2 : -0.2;
      const curY = base.position.y ?? 0;
      const ny = isUp ? curY + delta : Math.max(-1, curY + delta);
      const normalized = { ...base, position: { ...base.position, y: ny } };
      const res = draftApi.updateNormalizedTransform(selectedId, normalized);
      if (!res.ok) ui.setStatus(res.error, true);
      else { syncPreviewForId(selectedId); ui.setSelected(selectedId); updateHighlight(); }
      return;
    } else if (k === "pageup") {
      e.preventDefault();
      const f = draftApi.findObjectById(selectedId);
      if (!f) return;
      const base = readNormalizedTransform(f);
      if (!base) return;
      const ny = (base.position.y ?? 0) + 0.2;
      const normalized = { ...base, position: { ...base.position, y: ny } };
      const res = draftApi.updateNormalizedTransform(selectedId, normalized);
      if (!res.ok) ui.setStatus(res.error,true); else { syncPreviewForId(selectedId); ui.setSelected(selectedId); updateHighlight(); }
      return;
    } else if (k === "pagedown") {
      e.preventDefault();
      const f = draftApi.findObjectById(selectedId);
      if (!f) return;
      const base = readNormalizedTransform(f);
      if (!base) return;
      const ny = Math.max(-1, (base.position.y ?? 0) - 0.2);
      const normalized = { ...base, position: { ...base.position, y: ny } };
      const res = draftApi.updateNormalizedTransform(selectedId, normalized);
      if (!res.ok) ui.setStatus(res.error,true); else { syncPreviewForId(selectedId); ui.setSelected(selectedId); updateHighlight(); }
      return;
    } else if (dx === 0 && dz === 0) return;
    if (dx !== 0 || dz !== 0) {
      e.preventDefault();
      const found = draftApi.findObjectById(selectedId);
      if (!found) return;
      const base = readNormalizedTransform(found);
      if (!base) return;
      const newX = base.position.x + dx;
      const newZ = base.position.z + dz;
      const normalized = { ...base, position: { ...base.position, x: newX, z: newZ } };
      const res = draftApi.updateNormalizedTransform(selectedId, normalized);
      if (!res.ok) ui.setStatus(res.error, true);
      else { syncPreviewForId(selectedId); updateHomeMarker(); ui.setSelected(selectedId); updateHighlight(); updateEditorVisibility(); }
    }
  }

  function updateHighlight() {
    if (highlightMesh) { scene.remove(highlightMesh); highlightMesh = null; }
    if (!selectedId) { if (homeMarker) { scene.remove(homeMarker); homeMarker = null; } return; }
    const found = draftApi.findObjectById(selectedId);
    if (!found) { if (homeMarker) { scene.remove(homeMarker); homeMarker = null; } return; }
    const norm = readNormalizedTransform(found);
    const pos = norm ? norm.position : (found.obj.pos || (found.obj.x !== undefined ? { x: found.obj.x, y: found.obj.y ?? found.obj.baseY ?? 0, z: found.obj.z } : null));
    if (!pos) return;
    const y = (pos.y ?? 0) + 0.8;
    const geo = new THREE.RingGeometry(0.45, 0.58, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(geo, mat); ring.rotation.x = -Math.PI / 2; ring.position.set(pos.x, y, pos.z);
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6), new THREE.MeshBasicMaterial({ color: 0xffd54f })); cyl.position.set(pos.x, y + 0.6, pos.z);
    const group = new THREE.Group(); group.add(ring); group.add(cyl); group.name = "selection-highlight"; scene.add(group); highlightMesh = group;
    updateHomeMarker();
  }

  return { init, setSystems, draftApi, ui, isEditMode: () => isEdit, suppressGameplay: () => suppressGameplay, getSelectedId: () => selectedId, updateHighlight, updateOverlays, updateEditorVisibility, findMeshByAuthorId, syncPreviewForId };
}
