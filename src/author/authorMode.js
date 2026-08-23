// src/author/authorMode.js — desktop dev-only Author Mode (Phase 3.5B.1 usability & correctness)
import * as THREE from "three";
import { createAuthorDraft } from "./authorDraft.js";
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
      draftApi.validate();
      ui.setStatus("Applying draft — reloading...", false);
      if (onRebuild) onRebuild(draftApi.getDraft());
      else window.location.reload();
    },
    onDraftChanged: (id, deletedId) => {
      if (id) {
        selectedId = id; ui.setSelected(id);
        if (!findMeshByAuthorId(id)) createPreviewMeshForNewObject(id);
        syncPreviewForId(id);
        updateHomeMarker();
        if (ui.refreshHierarchy) ui.refreshHierarchy();
      }
      if (deletedId) { removePreviewMesh(deletedId); if (ui.refreshHierarchy) ui.refreshHierarchy(); }
      updateHighlight();
      updateOverlays();
      if (isEdit) updateEditorVisibility();
      updateHomeMarker();
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
  // Live preview: sync a single object's mesh to draft position/rotation/size
  function syncPreviewForId(id) {
    const found = draftApi.findObjectById(id);
    if (!found) return;
    const obj = found.obj;
    const meshes = findAllMeshesByAuthorId(id);
    let target = findMeshByAuthorId(id);
    if (!target) return;
    let top = target;
    while (top.parent && top.parent.userData && top.parent.userData.authorId === id) top = top.parent;
    const draftPos = obj.pos || (obj.x !== undefined ? { x: obj.x, y: obj.y ?? obj.baseY ?? 0, z: obj.z } : null);
    if (!draftPos) return;
    const baseY = draftPos.y ?? obj.y ?? obj.baseY ?? 0;
    if (found.type === "creature") {
      top.position.set(draftPos.x, baseY, draftPos.z);
    } else if (found.type === "resource") {
      top.position.set(draftPos.x, baseY, draftPos.z);
    } else if (found.collection === "props") {
      const height = (obj.size?.h ?? 1);
      const isWater = obj.subtype === "water";
      if (obj.subtype === "dropPod") {
        top.position.set(draftPos.x, baseY, draftPos.z);
        top.rotation.y = obj.rotY ?? 0;
      } else {
        for (const m of meshes) {
          if (m.isMesh && m.geometry?.type === "BoxGeometry") {
            // Live resize: recreate geometry if size changed
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
        if (top.isGroup) { top.position.set(draftPos.x, baseY, draftPos.z); top.rotation.y = obj.rotY ?? 0; }
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
    }
    // Presentation live preview for static families (visible/collision not affecting position, but visible/material)
    if (found.type === "prop" || found.type === "groundPatch" || found.type === "boundaryCollider") {
      const vis = obj.visibleInPlay !== false;
      const op = obj.opacity ?? 1;
      const col = obj.color ?? obj.tint;
      for (const m of meshes) {
        if (m.userData && m.userData.isEditProxy) continue;
        if (m.isMesh) {
          m.visible = vis;
          if (col !== undefined || op < 1) {
            if (!m.userData.hasClonedMaterial) {
              m.material = m.material.clone();
              m.userData.hasClonedMaterial = true;
              if (m.userData.baseColor === undefined) m.userData.baseColor = m.material.color.getHex();
            }
            if (col !== undefined) {
              const hex = parseTintColor(col, m.userData.baseColor ?? m.material.color.getHex());
              m.material.color.setHex(hex);
            }
            if (op < 1) { m.material.transparent = true; m.material.opacity = op; } else { m.material.transparent = false; m.material.opacity = 1; }
          }
        }
      }
      // proxy visibility
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

  function createPreviewMeshForNewObject(id) {
    // For live preview of newly placed object without reload, we could create a simple mesh via staticWorld logic
    // Simpler: instead of creating preview, just force a partial rebuild of static world for that region?
    // For now, call a lightweight rebuild: remove old playground static meshes and rebuild from draft for that region only?
    // Simplest: rebuild entire static world preview layer without touching physics/resources/creatures
    // We will recreate static meshes for the new object by directly building it
    // As fallback, just trigger full visual rebuild for props/platforms: we can call sync? Actually newly created object has no mesh yet, so we need to create it.
    // We'll create a minimal mesh via addProp-like logic: find draft object and create mesh as staticWorldBuilder does.
    const found = draftApi.findObjectById(id);
    if (!found) return;
    const obj = found.obj;
    // For props/resources/creatures, we need to add to respective systems: resources/creatures need resourceSystem/creatureSystem to spawn.
    // For simplicity after place/duplicate/delete we trigger a lightweight rebuild via reload? But spec requires immediate visible in editor.
    // For resources/creatures, we can directly create a preview group and add to scene.
    if (found.type === "resource") {
      // Create a simple placeholder box for preview (will be correctly rendered after PLAY reload, but enough for Edit)
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
    } else {
      // For static props/platforms: rebuild static world preview for that object by creating mesh directly (reuse builder logic minimal)
      // As simplest, trigger a full static preview rebuild without physics: we can rebuild static world group from draft and replace?
      // We'll do minimal: create a box as placeholder if not found
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

  function updateEditorVisibility() {
    if (!isEdit) return;
    // Camera-centered visibility
    const focus = { x: camera.position.x, z: camera.position.z };
    // Resolve focus region
    let focusRegion = null;
    try { focusRegion = worldRegistry.getRegionForPosition({ x: focus.x, y: 0, z: focus.z }); } catch {}
    if (!focusRegion) return;
    let activeSet = null;
    try { activeSet = worldRegistry.getActiveSetForRegion(focusRegion); } catch {}
    if (!activeSet) activeSet = new Set([focusRegion]);
    // For tiny world, include neighbors already; activeSet already includes neighbors
    const activeIds = [...activeSet];
    if (resourceSystem) resourceSystem.setActiveRegions(activeIds);
    if (creatureSystem) creatureSystem.setActiveRegions(activeIds);
    // Also ensure static world meshes for those regions are visible (they are always visible via ground, but resources need visible)
    // For static props/platforms, they are always visible; but we could hide distant forest etc? Not needed.
    // Update region overlays highlight
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
    const regionId = worldRegistry.getRegionForPosition({ x: worldPos.x, y: 0, z: worldPos.z });
    const targetRegion = regionId || draftApi.getDraft().regions[0]?.id;
    // Create object at worldPos
    const kind = pendingPlace.kind;
    const subtype = pendingPlace.subtype;
    // We need to create via draftApi but at specific position, not region center
    // Use draftApi.createObject then override pos, or directly construct object for precise pos
    // createObject places at center, then we update
    const res = draftApi.createObject(targetRegion, kind, subtype);
    if (!res.ok) { ui.setStatus(res.error, true); return true; }
    const newId = res.id;
    // Now set precise pos
    const found = draftApi.findObjectById(newId);
    if (found) {
      if (found.obj.pos) {
        found.obj.pos.x = worldPos.x;
        found.obj.pos.z = worldPos.z;
        found.obj.pos.y = worldPos.y ?? 0;
        if (found.type === "creature" && found.obj.homePos) {
          found.obj.homePos.x = worldPos.x;
          found.obj.homePos.z = worldPos.z;
          found.obj.homePos.y = worldPos.y ?? 0;
        }
      } else if (found.obj.x !== undefined) {
        found.obj.x = worldPos.x;
        found.obj.z = worldPos.z;
        if (found.obj.y !== undefined || found.obj.baseY !== undefined) {
          found.obj.y = worldPos.y ?? 0;
          found.obj.baseY = worldPos.y ?? 0;
        }
      }
      draftApi.updateTransform(newId, {}); // persist
    }
    // Validate
    const v = draftApi.validate();
    if (!v.ok) { ui.setStatus("⚠ " + v.error, true); // rollback?
    } else ui.setStatus(`Placed ${newId} at ${worldPos.x.toFixed(1)}, ${worldPos.z.toFixed(1)}`, false);
    ui.refreshRegionSelects();
    ui.setSelected(newId);
    selectedId = newId;
    createPreviewMeshForNewObject(newId);
    syncPreviewForId(newId);
    updateHighlight();
    updateEditorVisibility();
    // Stay in place mode for successive placements? Spec says click palette → click world → becomes selected. Keep place mode active until Esc? For now exit after one.
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
    const bounds = { minX: -12.5, maxX: 12.5, minZ: -11.5, maxZ: 11.5 };
    const cx = (bounds.minX + bounds.maxX) * 0.5;
    const cz = (bounds.minZ + bounds.maxZ) * 0.5;
    camera.position.set(cx, 28, cz + 0.1);
    camera.lookAt(cx, 0, cz);
    camera.updateMatrixWorld();
    setOverlaysVisible(true);
    setFogForEdit(true);
    setHudVisible(false);
    setForestTransparency(true);
    setProxyVisibility(true);
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
    // If pending place, handled in click; ignore drag start for placement
    if (pendingPlace) return;
    if (e.button !== 0) return;
    // Check if we hit selected object — start drag
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
      }
      e.preventDefault(); e.stopPropagation();
      renderer.domElement.setPointerCapture(e.pointerId);
    }
  }
  function onPointerMove(e) {
    if (!isEdit || !isDragging || !selectedId) return;
    const pt = getGroundIntersection(e);
    const found = draftApi.findObjectById(selectedId);
    if (!found) return;
    const newX = pt.x + dragOffset.x;
    const newZ = pt.z + dragOffset.z;
    const nx = Math.max(-12.3, Math.min(12.3, newX));
    const nz = Math.max(-11.3, Math.min(11.3, newZ));
    const oldX = found.obj.pos ? found.obj.pos.x : found.obj.x;
    const oldZ = found.obj.pos ? found.obj.pos.z : found.obj.z;
    const dx = nx - oldX, dz = nz - oldZ;
    if (found.obj.pos) {
      found.obj.pos.x = nx; found.obj.pos.z = nz;
      if (found.type === "creature" && found.obj.homePos) {
        const moveHome = document.getElementById("author-move-home")?.checked ?? true;
        if (moveHome) { found.obj.homePos.x += dx; found.obj.homePos.z += dz; }
      }
    } else if (found.obj.x !== undefined) {
      found.obj.x = nx; found.obj.z = nz;
    }
    syncPreviewForId(selectedId);
    updateHomeMarker();
    ui.setSelected(selectedId);
    e.preventDefault();
  }
  function onPointerUp(e) {
    if (isDragging) {
      isDragging = false;
      // Persist draft
      draftApi.updateTransform(selectedId, {});
      const v = draftApi.validate();
      ui.setStatus(v.ok ? `Moved ${selectedId}` : "⚠ "+v.error, !v.ok);
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

  function onKeyDown(e) {
    if (e.key === "Escape") {
      if (pendingPlace) { exitPlaceMode(); e.preventDefault(); return; }
    }
    if (!isEdit || !selectedId) return;
    const step = e.shiftKey ? 1.0 : 0.2;
    let dx = 0, dz = 0;
    if (e.key === "ArrowUp") dz = -step;
    else if (e.key === "ArrowDown") dz = step;
    else if (e.key === "ArrowLeft") dx = -step;
    else if (e.key === "ArrowRight") dx = step;
    else if (e.key === "PageUp") {
      const f = draftApi.findObjectById(selectedId);
      if (!f) return;
      if (f.type === "platform" || f.type === "obstacle") {
        const curY = f.obj.y ?? f.obj.baseY ?? 0; const ny = curY + 0.2; f.obj.y = ny; f.obj.baseY = ny; draftApi.updateTransform(selectedId, { y: ny }); syncPreviewForId(selectedId); ui.setSelected(selectedId); updateHighlight(); e.preventDefault(); return;
      }
      if (f.obj.pos) { f.obj.pos.y = (f.obj.pos.y ?? 0) + 0.2; if (f.type==="creature"&&f.obj.homePos) f.obj.homePos.y+=0.2; draftApi.updateTransform(selectedId, {}); syncPreviewForId(selectedId); ui.setSelected(selectedId); updateHighlight(); e.preventDefault(); }
      return;
    } else if (e.key === "PageDown") {
      const f = draftApi.findObjectById(selectedId);
      if (!f) return;
      if (f.type === "platform" || f.type === "obstacle") {
        const curY = f.obj.y ?? f.obj.baseY ?? 0; const ny = Math.max(0, curY -0.2); f.obj.y=ny; f.obj.baseY=ny; draftApi.updateTransform(selectedId,{y:ny}); syncPreviewForId(selectedId); ui.setSelected(selectedId); updateHighlight(); e.preventDefault(); return;
      }
      if (f.obj.pos) { f.obj.pos.y = Math.max(-1, (f.obj.pos.y ?? 0) - 0.2); if (f.type==="creature"&&f.obj.homePos) f.obj.homePos.y=Math.max(-1,(f.obj.homePos.y??0)-0.2); draftApi.updateTransform(selectedId, {}); syncPreviewForId(selectedId); ui.setSelected(selectedId); updateHighlight(); e.preventDefault(); }
      return;
    } else return;
    if (dx !== 0 || dz !== 0) {
      const found = draftApi.findObjectById(selectedId);
      if (found) {
        const moveHome = document.getElementById("author-move-home")?.checked ?? true;
        if (found.obj.pos) { found.obj.pos.x += dx; found.obj.pos.z += dz; if (found.type==="creature"&&found.obj.homePos && moveHome){ found.obj.homePos.x+=dx; found.obj.homePos.z+=dz; } }
        else if (found.obj.x !== undefined) { found.obj.x += dx; found.obj.z += dz; }
        draftApi.updateTransform(selectedId, {});
        syncPreviewForId(selectedId);
        updateHomeMarker();
        ui.setSelected(selectedId);
        updateHighlight();
        updateEditorVisibility();
        e.preventDefault();
      }
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
