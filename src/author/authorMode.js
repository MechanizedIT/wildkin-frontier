// src/author/authorMode.js — desktop dev-only Author Mode (Phase 3.5B.1 usability & correctness)
import * as THREE from "three";
import { createAuthorDraft } from "./authorDraft.js";
import { normalizeStaticDescriptor, getVisualCenter } from "../world/staticDescriptor.js";
import { createAuthorUI } from "./authorUI.js";

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
  // Live preview: sync a single object's mesh to draft position/rotation/size (canonical descriptor authority)
  function syncPreviewForId(id) {
    const found = draftApi.findObjectById(id);
    if (!found) return;
    const obj = found.obj;
    const meshes = findAllMeshesByAuthorId(id);
    let target = findMeshByAuthorId(id);
    if (!target && found.type!=="campSpawn" && found.type!=="runSpawn") return;
    let top = target;
    while (top && top.parent && top.parent.userData && top.parent.userData.authorId === id) top = top.parent;
    const draftPos = obj.pos || (obj.x !== undefined ? { x: obj.x, y: obj.y ?? obj.baseY ?? 0, z: obj.z } : null);
    if (!draftPos && found.type !== "campSpawn" && found.type !== "runSpawn" && found.collection!=="campSpawn" && found.collection!=="runSpawn") {
      if(!obj.pos) return;
    }
    const baseY = draftPos ? (draftPos.y ?? obj.y ?? obj.baseY ?? 0) : (obj.pos?.y ?? 0);
    if (found.type === "creature") {
      if(top) top.position.set(draftPos.x, baseY, draftPos.z);
    } else if (found.type === "resource") {
      if(top) top.position.set(draftPos.x, baseY, draftPos.z);
    } else if (found.collection === "props") {
      const height = (obj.size?.h ?? 1);
      const isWater = obj.subtype === "water";
      if (obj.subtype === "dropPod") {
        if(top) { top.position.set(draftPos.x, baseY, draftPos.z); top.rotation.y = obj.rotY ?? 0; }
      } else {
        for (const m of meshes) {
          if (m.isMesh && m.geometry?.type === "BoxGeometry") {
            const desiredW = obj.size?.w ?? m.geometry.parameters?.width ?? 1;
            const desiredH = obj.size?.h ?? 1;
            const desiredD = obj.size?.d ?? 1;
            const gp = m.geometry.parameters;
            if (gp && (Math.abs(gp.width - desiredW) > 0.01 || Math.abs(gp.height - desiredH) > 0.01 || Math.abs(gp.depth - desiredD) > 0.01)) {
              const newGeo = new THREE.BoxGeometry(desiredW, desiredH, desiredD);
              m.geometry.dispose();
              m.geometry = newGeo;
            }
            m.position.set(draftPos.x, isWater ? baseY -0.04 : baseY + desiredH/2 -0.02, draftPos.z);
            m.rotation.y = obj.rotY ?? 0;
          } else if (m.isMesh) {
            m.position.set(draftPos.x, isWater ? baseY -0.04 : baseY + height/2 -0.02, draftPos.z);
            m.rotation.y = obj.rotY ?? 0;
          }
        }
        if (top && top.isGroup) { top.position.set(draftPos.x, baseY, draftPos.z); top.rotation.y = obj.rotY ?? 0; }
      }
    } else if (found.type === "platform" || found.type === "obstacle") {
      const h = obj.height ?? 1;
      const by = obj.y ?? obj.baseY ?? 0;
      const desiredW = obj.w ?? 1, desiredH = h, desiredD = obj.h ?? 1;
      for (const m of meshes) if (m.isMesh && m.geometry?.type === "BoxGeometry") {
        const gp = m.geometry.parameters;
        if (gp && (Math.abs(gp.width - desiredW) > 0.01 || Math.abs(gp.height - desiredH) > 0.01 || Math.abs(gp.depth - desiredD) > 0.01)) {
          const newGeo = new THREE.BoxGeometry(desiredW, desiredH, desiredD);
          m.geometry.dispose(); m.geometry = newGeo;
        }
        m.position.set(obj.x, by + h/2 -0.02, obj.z);
        m.rotation.y = obj.rotY ?? 0;
      }
    } else if (found.type === "climbable") {
      for (const m of meshes) if (m.isMesh && m.geometry?.type === "BoxGeometry") {
        const by = (obj.bottomY + obj.topY)/2 -0.02;
        m.position.set(obj.x, by, obj.z);
      }
    } else if (found.type === "majorWaypoint" || found.type === "extractionBeacon" || found.type === "poi") {
      const base = baseY;
      const h = found.type === "majorWaypoint" ? 1.6 : found.type === "extractionBeacon" ? 1.2 : 0.6;
      for (const m of meshes) if (m.isMesh) {
        if (m.geometry?.type === "CylinderGeometry" || m.geometry?.type === "BoxGeometry") {
          m.position.set(draftPos.x, base + h/2, draftPos.z);
        } else if (m.geometry?.type === "RingGeometry") {
          m.position.set(draftPos.x, base + 0.06, draftPos.z);
        } else if (m.geometry?.type === "SphereGeometry") {
          m.position.set(draftPos.x, base + h + 0.35, draftPos.z);
        }
      }
    } else if (found.type === "groundPatch" || found.type === "boundaryCollider") {
      try{
        const desc = normalizeStaticDescriptor({ id: obj.id, pos: obj.pos, size: obj.size, rotY: obj.rotY, visibleInPlay: obj.visibleInPlay, collisionEnabled: obj.collisionEnabled, opacity: obj.opacity, color: obj.color }, found.collection);
        const center = getVisualCenter(desc);
        const w = desc.size.width, h = desc.size.height, d = desc.size.depth;
        const rotY = desc.rotationY;
        for (const m of meshes) {
          if (m.userData && m.userData.isEditProxy) continue;
          if (m.isMesh && m.geometry?.type === "BoxGeometry") {
            const gp = m.geometry.parameters;
            if (gp && (Math.abs(gp.width - w) > 0.01 || Math.abs(gp.height - h) > 0.01 || Math.abs(gp.depth - d) > 0.01)) {
              const newGeo = new THREE.BoxGeometry(w, h, d);
              m.geometry.dispose(); m.geometry = newGeo;
            }
            m.position.set(center.x, center.y, center.z);
            m.rotation.y = rotY;
          }
        }
        scene.traverse((o)=>{
          if(o.userData && o.userData.isEditProxy && o.userData.proxyFor===id){
            const pg = o.geometry.parameters;
            if(pg && (Math.abs(pg.width - w) > 0.01 || Math.abs(pg.height - h) > 0.01 || Math.abs(pg.depth - d) > 0.01)){
              const newGeo = new THREE.BoxGeometry(w,h,d);
              o.geometry.dispose(); o.geometry = newGeo;
            }
            o.position.set(center.x, center.y, center.z);
            o.rotation.y = rotY;
          }
        });
      }catch(e){
        for(const m of meshes) if(m.isMesh){ m.position.set(draftPos.x, baseY + (obj.size?.h??0.5)/2, draftPos.z); m.rotation.y = obj.rotY ?? 0; }
      }
    }
    if (found.type === "campSpawn" || found.type === "runSpawn") {
      const group = meshes.find(m=> m.userData && m.userData.isSpawnMarkerGroup) || top;
      if(group && group.userData && group.userData.isSpawnMarkerGroup){
        const facing = obj.facingYaw ?? 0;
        const by = draftPos.y ?? 0;
        group.position.set(draftPos.x, by, draftPos.z);
        group.rotation.y = facing;
      }
    }
    if (found.type === "prop" || found.type === "groundPatch" || found.type === "boundaryCollider") {
      const vis = obj.visibleInPlay !== false;
      const op = obj.opacity ?? 1;
      const col = obj.color ?? obj.tint;
      for (const m of meshes) {
        if (m.userData && m.userData.isEditProxy) continue;
        if (m.isMesh) {
          m.visible = vis;
          const needsTint = col !== undefined;
          const needsOpacity = op < 1 - 1e-6;
          if (needsTint || needsOpacity) {
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
          } else if (m.userData.hasClonedMaterial) {
            if (m.userData.baseColor !== undefined) m.material.color.setHex(m.userData.baseColor);
            m.material.transparent = !!m.userData.baseTransparent;
            m.material.opacity = m.userData.baseOpacity ?? 1;
          }
        }
      }
      scene.traverse((o) => {
        if (o.userData && o.userData.isEditProxy && o.userData.proxyFor === id) {
          o.visible = isEdit && !vis;
        }
        if (o.userData && o.userData.proxyMesh && o.userData.proxyMesh.userData && o.userData.proxyMesh.userData.proxyFor === id) {
          o.userData.proxyMesh.visible = isEdit && !vis;
        }
      });
    }
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
    const obj = found.obj;
    // If mesh already exists, just sync
    if(findMeshByAuthorId(id)) { syncPreviewForId(id); return; }
    if (found.type === "resource") {
      const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const mat = new THREE.MeshStandardMaterial({ color: obj.type==="tree"?0x2f7d32: obj.type==="rock"?0x8d8d8d:0x6abf69 });
      const mesh = new THREE.Mesh(geo, mat);
      const baseY = obj.pos.y ?? 0;
      mesh.position.set(obj.pos.x, baseY+0.25, obj.pos.z);
      mesh.name = obj.id;
      mesh.userData.authorId = obj.id;
      mesh.userData.resourceId = obj.id;
      scene.add(mesh);
    } else if (found.type === "creature") {
      const geo = new THREE.BoxGeometry(0.5, 0.7, 0.5);
      const mat = new THREE.MeshStandardMaterial({ color: obj.type==="rusher"?0xe14b2a:0x7a4de8 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(obj.pos.x, (obj.pos.y??0)+0.35, obj.pos.z);
      mesh.name = obj.id;
      mesh.userData.authorId = obj.id;
      mesh.userData.creatureId = obj.id;
      scene.add(mesh);
    } else if (found.type === "groundPatch" || found.type === "boundaryCollider") {
      // Use canonical descriptor for static preview + immediate proxy for hidden colliders
      try{
        const desc = normalizeStaticDescriptor({ id: obj.id, pos: obj.pos, size: obj.size, rotY: obj.rotY, visibleInPlay: obj.visibleInPlay, collisionEnabled: obj.collisionEnabled, opacity: obj.opacity, color: obj.color }, found.collection);
        const center = getVisualCenter(desc);
        const w = desc.size.width, h = desc.size.height, d = desc.size.depth;
        const rotY = desc.rotationY;
        const geo = new THREE.BoxGeometry(w,h,d);
        let baseMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6 });
        if(found.type==="groundPatch") baseMat = new THREE.MeshStandardMaterial({ color: 0x7bb26a, flatShading:true });
        else if(found.type==="boundaryCollider") baseMat = new THREE.MeshStandardMaterial({ color: 0x5a6a7a, transparent:true, opacity:0.28 });
        const mesh = new THREE.Mesh(geo, baseMat);
        mesh.position.set(center.x, center.y, center.z);
        mesh.rotation.y = rotY;
        mesh.name = id;
        mesh.userData.authorId = id;
        mesh.userData.visibleInPlay = desc.visibleInPlay;
        mesh.userData.collisionEnabled = desc.collisionEnabled;
        mesh.visible = desc.visibleInPlay;
        scene.add(mesh);
        if(!desc.visibleInPlay){
          const proxyGeo = new THREE.BoxGeometry(w,h,d);
          const proxyMat = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe:true, transparent:true, opacity:0.42 });
          const proxy = new THREE.Mesh(proxyGeo, proxyMat);
          proxy.position.copy(mesh.position);
          proxy.rotation.y = rotY;
          proxy.name = `${id}__proxy`;
          proxy.userData.authorId = id;
          proxy.userData.isEditProxy = true;
          proxy.userData.proxyFor = id;
          proxy.visible = isEdit;
          scene.add(proxy);
          mesh.userData.proxyMesh = proxy;
        }
      }catch(e){
        const geo = new THREE.BoxGeometry(obj.size?.w ?? 1, obj.size?.h ?? 1, obj.size?.d ?? 1);
        const mat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6 });
        const mesh = new THREE.Mesh(geo, mat);
        const baseY = obj.pos?.y ?? 0;
        const h = obj.size?.h ?? 1;
        mesh.position.set(obj.pos.x, baseY + h/2, obj.pos.z);
        mesh.name = id;
        mesh.userData.authorId = id;
        scene.add(mesh);
      }
    } else {
      const meshes = findAllMeshesByAuthorId(id);
      if (meshes.length===0) {
        const geo = new THREE.BoxGeometry(obj.size?.w ?? obj.w ?? 1, obj.size?.h ?? obj.height ?? 1, obj.size?.d ?? obj.h ?? 1);
        const mat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6 });
        const mesh = new THREE.Mesh(geo, mat);
        const baseY = obj.pos?.y ?? obj.y ?? obj.baseY ?? 0;
        const h = obj.height ?? obj.size?.h ?? 1;
        if (obj.pos) mesh.position.set(obj.pos.x, baseY + h/2, obj.pos.z);
        else mesh.position.set(obj.x, baseY + h/2, obj.z);
        mesh.name = id;
        mesh.userData.authorId = id;
        scene.add(mesh);
      }
    }
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
        const curPos = found.obj.pos || { x: found.obj.x ?? 0, z: found.obj.z ?? 0 };
        dragOffset.x = curPos.x - pt.x;
        dragOffset.z = curPos.z - pt.z;
        // capture preview state without mutating canonical
        const baseY = found.obj.pos ? (found.obj.pos.y ?? 0) : (found.obj.y ?? found.obj.baseY ?? 0);
        const curFacing = found.obj.facingYaw ?? found.obj.rotY ?? 0;
        dragState = {
          id: selectedId,
          startPos: found.obj.pos ? { x: found.obj.pos.x, y: baseY, z: found.obj.pos.z } : { x: found.obj.x, y: baseY, z: found.obj.z },
          previewPos: found.obj.pos ? { x: found.obj.pos.x, y: baseY, z: found.obj.pos.z } : { x: found.obj.x, y: baseY, z: found.obj.z },
          startFacing: curFacing,
          previewFacing: curFacing,
          isSpawn: found.type==="campSpawn" || found.type==="runSpawn",
          isCreature: found.type==="creature"
        };
      }
      e.preventDefault(); e.stopPropagation();
      renderer.domElement.setPointerCapture(e.pointerId);
    }
  }
  let dragStartPos = null;
  let dragStartHome = null;
  function applyPreviewTransform(id, previewPos, previewFacing){
    // update mesh preview directly without touching draft
    const found = draftApi.findObjectById(id);
    if(!found) return;
    // find meshes and apply
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
      // update line to waypoint for runSpawn preview
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
    // For other types, update meshes via temporary preview by directly setting mesh positions (live)
    // Use similar logic to syncPreview but with previewPos overriding draftPos
    // For static rectangular families, previewPos contains x,y,z; we update mesh positions accordingly
    const baseY = previewPos.y ?? 0;
    if (found.type === "creature" || found.type === "resource") {
      if(top) top.position.set(previewPos.x, baseY, previewPos.z);
    } else if (found.collection === "props") {
      for(const m of meshes){
        if(m.isMesh){
          // approximate: assume box geometry; position center
          const h = found.obj.size?.h ?? 1;
          const isWater = found.obj.subtype === "water";
          m.position.set(previewPos.x, isWater ? baseY -0.04 : baseY + h/2 -0.02, previewPos.z);
        }
      }
      if(top && top.isGroup) top.position.set(previewPos.x, baseY, previewPos.z);
    } else if (found.type === "groundPatch" || found.type === "boundaryCollider") {
      try{
        const desc = normalizeStaticDescriptor({ id: found.obj.id, pos: previewPos, size: found.obj.size, rotY: found.obj.rotY, visibleInPlay: found.obj.visibleInPlay, collisionEnabled: found.obj.collisionEnabled }, found.collection);
        const center = getVisualCenter(desc);
        for(const m of meshes){
          if(m.userData && m.userData.isEditProxy) continue;
          if(m.isMesh) { m.position.set(center.x, center.y, center.z); }
        }
        scene.traverse((o)=>{
          if(o.userData && o.userData.isEditProxy && o.userData.proxyFor===id){
            o.position.set(center.x, center.y, center.z);
          }
        });
      }catch{}
    } else if (found.type === "platform" || found.type === "obstacle") {
      for(const m of meshes) if(m.isMesh) m.position.set(previewPos.x, (previewPos.y ?? 0)+ (found.obj.height??1)/2 -0.02, previewPos.z);
    } else if (found.type === "majorWaypoint" || found.type === "extractionBeacon" || found.type === "poi") {
      for(const m of meshes) if(m.isMesh){
        const h = found.type==="majorWaypoint"?1.6: found.type==="extractionBeacon"?1.2:0.6;
        if(m.geometry?.type==="CylinderGeometry" || m.geometry?.type==="BoxGeometry") m.position.set(previewPos.x, baseY + h/2, previewPos.z);
        else if(m.geometry?.type==="RingGeometry") m.position.set(previewPos.x, baseY+0.06, previewPos.z);
        else if(m.geometry?.type==="SphereGeometry") m.position.set(previewPos.x, baseY + h +0.35, previewPos.z);
      }
    } else {
      if(top) top.position.set(previewPos.x, baseY, previewPos.z);
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
    // preview only, no canonical mutation
    applyPreviewTransform(selectedId, dragState.previewPos, dragState.previewFacing);
    e.preventDefault();
  }
  function onPointerUp(e) {
    if (isDragging) {
      isDragging = false;
      if(dragState && selectedId === dragState.id){
        const previewPos = { ...dragState.previewPos };
        dragState = null;
        const patch = { pos: previewPos };
        const res = draftApi.updateTransform(selectedId, patch);
        if (!res.ok) {
          ui.setStatus("⚠ "+res.error, true);
          // snap back to canonical
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
      const isSpawn = f.type==="campSpawn" || f.type==="runSpawn";
      if(isSpawn){
        const cur = f.obj.facingYaw ?? 0;
        const patch = { facingYaw: cur - (15 * Math.PI/180) };
        const res = draftApi.updateTransform(selectedId, patch);
        if (!res.ok) ui.setStatus(res.error, true); else { ui.setStatus(`Rotated ${selectedId}`, false); syncPreviewForId(selectedId); updateSpawnMarkers(); ui.setSelected(selectedId); updateHighlight(); }
      } else {
        const cur = f.obj.rotY ?? 0;
        const patch = { rotY: cur - (15 * Math.PI/180) };
        const res = draftApi.updateTransform(selectedId, patch);
        if (!res.ok) ui.setStatus(res.error, true); else { ui.setStatus(`Rotated ${selectedId}`, false); syncPreviewForId(selectedId); ui.setSelected(selectedId); updateHighlight(); }
      }
      return;
    } else if (k === "e") {
      if (!isEdit) return;
      e.preventDefault();
      const f = draftApi.findObjectById(selectedId);
      if (!f) return;
      const isSpawn = f.type==="campSpawn" || f.type==="runSpawn";
      if(isSpawn){
        const cur = f.obj.facingYaw ?? 0;
        const patch = { facingYaw: cur + (15 * Math.PI/180) };
        const res = draftApi.updateTransform(selectedId, patch);
        if (!res.ok) ui.setStatus(res.error, true); else { ui.setStatus(`Rotated ${selectedId}`, false); syncPreviewForId(selectedId); updateSpawnMarkers(); ui.setSelected(selectedId); updateHighlight(); }
      } else {
        const cur = f.obj.rotY ?? 0;
        const patch = { rotY: cur + (15 * Math.PI/180) };
        const res = draftApi.updateTransform(selectedId, patch);
        if (!res.ok) ui.setStatus(res.error, true); else { ui.setStatus(`Rotated ${selectedId}`, false); syncPreviewForId(selectedId); ui.setSelected(selectedId); updateHighlight(); }
      }
      return;
    } else if (k === " " || k === "c") {
      // raise/lower: Space / C (C conflicts with sneak but in author mode we use Space for up and C for down)
      e.preventDefault();
      const f = draftApi.findObjectById(selectedId);
      if (!f) return;
      const isUp = k === " ";
      const delta = isUp ? 0.2 : -0.2;
      if (f.type === "platform" || f.type === "obstacle") {
        const curY = f.obj.y ?? f.obj.baseY ?? 0; const ny = Math.max(-1, curY + delta);
        const res = draftApi.updateTransform(selectedId, { y: ny });
        if (!res.ok) ui.setStatus(res.error, true); else { ui.setStatus(`Elevation ${selectedId}`, false); syncPreviewForId(selectedId); ui.setSelected(selectedId); updateHighlight(); }
        return;
      }
      if (f.obj.pos) {
        const ny = Math.max(-1, (f.obj.pos.y ?? 0) + delta);
        const res = draftApi.updateTransform(selectedId, { pos: { x: f.obj.pos.x, y: ny, z: f.obj.pos.z } });
        if (!res.ok) ui.setStatus(res.error, true); else { syncPreviewForId(selectedId); ui.setSelected(selectedId); updateHighlight(); }
        return;
      }
      return;
    } else if (k === "pageup") {
      e.preventDefault();
      const f = draftApi.findObjectById(selectedId);
      if (!f) return;
      if (f.type === "platform" || f.type === "obstacle") {
        const curY = f.obj.y ?? f.obj.baseY ?? 0; const ny = curY + 0.2;
        const res = draftApi.updateTransform(selectedId, { y: ny }); if (!res.ok) ui.setStatus(res.error,true); else { syncPreviewForId(selectedId); ui.setSelected(selectedId); updateHighlight(); }
        return;
      }
      if (f.obj.pos) {
        const ny = (f.obj.pos.y ?? 0) + 0.2;
        const res = draftApi.updateTransform(selectedId, { pos: { x: f.obj.pos.x, y: ny, z: f.obj.pos.z } }); if (!res.ok) ui.setStatus(res.error,true); else { syncPreviewForId(selectedId); ui.setSelected(selectedId); updateHighlight(); }
        return;
      }
      return;
    } else if (k === "pagedown") {
      e.preventDefault();
      const f = draftApi.findObjectById(selectedId);
      if (!f) return;
      if (f.type === "platform" || f.type === "obstacle") {
        const curY = f.obj.y ?? f.obj.baseY ?? 0; const ny = Math.max(-1, curY -0.2);
        const res = draftApi.updateTransform(selectedId,{y:ny}); if (!res.ok) ui.setStatus(res.error,true); else { syncPreviewForId(selectedId); ui.setSelected(selectedId); updateHighlight(); }
        return;
      }
      if (f.obj.pos) {
        const ny = Math.max(-1, (f.obj.pos.y ?? 0) - 0.2);
        const res = draftApi.updateTransform(selectedId, { pos: { x: f.obj.pos.x, y: ny, z: f.obj.pos.z } }); if (!res.ok) ui.setStatus(res.error,true); else { syncPreviewForId(selectedId); ui.setSelected(selectedId); updateHighlight(); }
        return;
      }
      return;
    } else if (dx === 0 && dz === 0) return;
    if (dx !== 0 || dz !== 0) {
      e.preventDefault();
      const found = draftApi.findObjectById(selectedId);
      if (!found) return;
      const newX = (found.obj.pos ? found.obj.pos.x : found.obj.x) + dx;
      const newZ = (found.obj.pos ? found.obj.pos.z : found.obj.z) + dz;
      let patch = {};
      if (found.obj.pos) patch.pos = { x: newX, y: found.obj.pos.y ?? 0, z: newZ };
      else if (found.obj.x !== undefined) patch = { x: newX, z: newZ };
      const res = draftApi.updateTransform(selectedId, patch);
      if (!res.ok) ui.setStatus(res.error, true);
      else { syncPreviewForId(selectedId); updateHomeMarker(); ui.setSelected(selectedId); updateHighlight(); updateEditorVisibility(); }
    }
  }

  function updateHighlight() {
    if (highlightMesh) { scene.remove(highlightMesh); highlightMesh = null; }
    if (!selectedId) { if (homeMarker) { scene.remove(homeMarker); homeMarker = null; } return; }
    const found = draftApi.findObjectById(selectedId);
    if (!found) { if (homeMarker) { scene.remove(homeMarker); homeMarker = null; } return; }
    const obj = found.obj;
    const pos = obj.pos || (obj.x !== undefined ? { x: obj.x, y: obj.y ?? obj.baseY ?? 0, z: obj.z } : null);
    if (!pos) return;
    const y = (pos.y ?? obj.y ?? obj.baseY ?? 0) + 0.8;
    const geo = new THREE.RingGeometry(0.45, 0.58, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(geo, mat); ring.rotation.x = -Math.PI / 2; ring.position.set(pos.x, y, pos.z);
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6), new THREE.MeshBasicMaterial({ color: 0xffd54f })); cyl.position.set(pos.x, y + 0.6, pos.z);
    const group = new THREE.Group(); group.add(ring); group.add(cyl); group.name = "selection-highlight"; scene.add(group); highlightMesh = group;
    updateHomeMarker();
  }

  return { init, setSystems, draftApi, ui, isEditMode: () => isEdit, suppressGameplay: () => suppressGameplay, getSelectedId: () => selectedId, updateHighlight, updateOverlays, updateEditorVisibility, findMeshByAuthorId, syncPreviewForId };
}
