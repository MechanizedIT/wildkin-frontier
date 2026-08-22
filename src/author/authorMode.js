// src/author/authorMode.js — desktop dev-only Author Mode orchestration (Phase 3.5B)
import * as THREE from "three";
import { createAuthorDraft } from "./authorDraft.js";
import { createAuthorUI } from "./authorUI.js";

export function createAuthorMode(opts) {
  const scene = opts.scene;
  const camera = opts.camera;
  const renderer = opts.renderer;
  const worldRegistry = opts.worldRegistry;
  const draftSeed = opts.draftSeed; // repo normalized data
  const onRebuild = opts.onRebuild; // callback to rebuild world from draft (via reload)

  const draftApi = createAuthorDraft(draftSeed);
  // If persisted draft exists, load it (author enabled)
  const persisted = draftApi.loadPersisted();
  const usingDraft = persisted !== null;
  if (usingDraft) {
    // draftApi already holds persisted
  } else {
    // Ensure draft is clone of repo (not reference)
    draftApi.setDraft(draftSeed);
  }

  let isEdit = false;
  let selectedId = null;
  let highlightMesh = null;
  let regionOverlays = [];
  let raycaster = new THREE.Raycaster();
  let mouse = new THREE.Vector2();
  let editorCameraState = null;
  let suppressGameplay = false;

  const ui = createAuthorUI({
    draftApi,
    worldRegistry,
    onCreate: (item) => {
      // Determine region to place in: currently selected region or first
      const regionId = ui.element.querySelector("#author-region-select")?.value || draftApi.getDraft().regions[0]?.id;
      const res = draftApi.createObject(regionId, item.kind, item.subtype);
      if (res.ok) {
        ui.refreshRegionSelects();
        ui.setSelected(res.id);
        selectedId = res.id;
        updateHighlight();
        updateOverlays();
        // Auto validate
        const v = draftApi.validate();
        ui.setStatus(v.ok ? `Placed ${res.id}` : v.error, !v.ok);
      } else ui.setStatus(res.error, true);
    },
    onToggleEdit: (edit) => {
      isEdit = edit;
      suppressGameplay = edit;
      if (edit) enterEdit();
      else exitEdit();
    },
    onPlay: () => {
      // Validate already done, persist and rebuild via reload (simplest deterministic, avoids duplicate colliders)
      draftApi.validate();
      // Persist already done
      ui.setStatus("Applying draft — reloading...", false);
      if (onRebuild) onRebuild(draftApi.getDraft());
      else window.location.reload();
    },
    onDraftChanged: (id) => {
      if (id) { selectedId = id; ui.setSelected(id); }
      updateHighlight();
      updateOverlays();
    },
    onValidate: (ok, err) => {
      if (ok) ui.setStatus("✓ Valid", false); else ui.setStatus("⚠ " + err, true);
    },
    onSelectRegion: () => updateOverlays()
  });

  function isEnabled() {
    const params = new URLSearchParams(window.location.search);
    return params.get("author") === "1";
  }

  function init() {
    if (!isEnabled()) {
      ui.hide();
      return { enabled: false, draftApi, ui, isEditMode: () => false, suppressGameplay: () => false, selectedId: () => null };
    }
    // Show UI
    ui.show();
    // Add region overlays group
    createOverlays();
    // Hook raycast selection
    const canvas = renderer.domElement;
    canvas.addEventListener("click", onCanvasClick);
    canvas.addEventListener("pointerdown", onPointerDown);
    // Keyboard nudge
    window.addEventListener("keydown", onKeyDown);
    // Editor pan/zoom via mouse drag when editing
    // Simple: drag with right button or ctrl+drag pans
    let isDragging = false;
    let lastX = 0, lastY = 0;
    canvas.addEventListener("mousedown", (e) => {
      if (!isEdit) return;
      if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
        isDragging = true;
        lastX = e.clientX; lastY = e.clientY;
        e.preventDefault();
      }
    });
    canvas.addEventListener("mousemove", (e) => {
      if (!isDragging || !isEdit) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      // Pan top-down camera: move camera target
      panEditorCamera(dx * -0.04, dy * 0.04);
    });
    canvas.addEventListener("mouseup", () => isDragging = false);
    canvas.addEventListener("wheel", (e) => {
      if (!isEdit) return;
      e.preventDefault();
      zoomEditorCamera(e.deltaY * 0.02);
    }, { passive: false });
    // Prevent context menu on right drag
    canvas.addEventListener("contextmenu", (e) => { if (isEdit) e.preventDefault(); });

    // Add simple top-down hint
    ui.setStatus(usingDraft ? "Loaded draft from localStorage" : "Using repo world — edit to create draft", false);

    return { enabled: true, draftApi, ui, isEditMode: () => isEdit, suppressGameplay: () => suppressGameplay, getSelectedId: () => selectedId };
  }

  function enterEdit() {
    // Switch camera to near-top-down
    editorCameraState = { pos: camera.position.clone(), rot: camera.rotation.clone(), fov: camera.fov };
    // Find world center
    const bounds = { minX: -12.5, maxX: 12.5, minZ: -11.5, maxZ: 11.5 };
    const cx = (bounds.minX + bounds.maxX) * 0.5;
    const cz = (bounds.minZ + bounds.maxZ) * 0.5;
    camera.position.set(cx, 28, cz + 0.1);
    camera.lookAt(cx, 0, cz);
    camera.updateMatrixWorld();
    // Show overlays
    setOverlaysVisible(true);
  }

  function exitEdit() {
    // Restore camera
    if (editorCameraState) {
      camera.position.copy(editorCameraState.pos);
      camera.rotation.copy(editorCameraState.rot);
      camera.fov = editorCameraState.fov;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      editorCameraState = null;
    }
    setOverlaysVisible(false);
    // Keep highlight but gameplay will resume
  }

  function panEditorCamera(dx, dz) {
    camera.position.x += dx;
    camera.position.z += dz;
    // Also move lookAt? For top-down, lookAt is directly below
    // Keep vertical look: adjust position only, lookAt stays at same offset? Simpler: move both
  }

  function zoomEditorCamera(delta) {
    camera.position.y = Math.max(8, Math.min(40, camera.position.y + delta));
    camera.updateProjectionMatrix();
  }

  function createOverlays() {
    // Region bounds lines
    const draft = draftApi.getDraft();
    for (const region of draft.regions) {
      const b = region.bounds;
      const pts = [
        new THREE.Vector3(b.minX, 0.08, b.minZ),
        new THREE.Vector3(b.maxX, 0.08, b.minZ),
        new THREE.Vector3(b.maxX, 0.08, b.maxZ),
        new THREE.Vector3(b.minX, 0.08, b.maxZ),
        new THREE.Vector3(b.minX, 0.08, b.minZ),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.9 });
      const line = new THREE.Line(geo, mat);
      line.name = `overlay_${region.id}`;
      line.userData.regionId = region.id;
      line.visible = false;
      scene.add(line);
      regionOverlays.push(line);
      // Label sprite (simple canvas texture)
      const label = makeLabel(region.id, b);
      scene.add(label);
      regionOverlays.push(label);
    }
  }

  function makeLabel(text, bounds) {
    const canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(15,20,32,0.85)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#4fc3f7";
    ctx.font = "bold 20px system-ui";
    ctx.fillText(text, 12, 38);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    const cx = (bounds.minX + bounds.maxX) * 0.5;
    const cz = (bounds.minZ + bounds.maxZ) * 0.5;
    sprite.position.set(cx, 1.2, cz);
    sprite.scale.set(3.5, 0.9, 1);
    sprite.visible = false;
    sprite.name = `label_${text}`;
    return sprite;
  }

  function setOverlaysVisible(visible) {
    for (const o of regionOverlays) o.visible = visible;
    // Also highlight selected's region
    highlightOverlayForSelected();
  }

  function highlightOverlayForSelected() {
    for (const line of regionOverlays) {
      if (line.isLine && line.userData.regionId) {
        const isSelRegion = selectedId && draftApi.findObjectById(selectedId)?.region.id === line.userData.regionId;
        line.material.color.set(isSelRegion ? 0xffd54f : 0x4fc3f7);
        line.material.opacity = isSelRegion ? 1.0 : 0.7;
      }
    }
  }

  function updateOverlays() {
    // Rebuild overlays if draft changed significantly (bounds changed)
    // For simplicity, update existing line geometries if bounds changed
    const draft = draftApi.getDraft();
    for (const line of regionOverlays) {
      if (line.isLine && line.userData.regionId) {
        const region = draft.regions.find(r => r.id === line.userData.regionId);
        if (!region) continue;
        const b = region.bounds;
        const pts = [
          new THREE.Vector3(b.minX, 0.08, b.minZ),
          new THREE.Vector3(b.maxX, 0.08, b.minZ),
          new THREE.Vector3(b.maxX, 0.08, b.maxZ),
          new THREE.Vector3(b.minX, 0.08, b.maxZ),
          new THREE.Vector3(b.minX, 0.08, b.minZ),
        ];
        line.geometry.setFromPoints(pts);
      }
    }
    highlightOverlayForSelected();
    updateHighlight();
  }

  function onCanvasClick(e) {
    if (!isEdit) return;
    // Don't select if dragging?
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    // Collect selectable meshes: playground meshes + resource/creature/anchor placeholders
    // We'll raycast against scene children (all meshes with name)
    const intersects = raycaster.intersectObjects(scene.children, true);
    let picked = null;
    for (const hit of intersects) {
      const obj = hit.object;
      // Find if this mesh corresponds to a world object via userData or name
      // Check ancestor chain for userData
      let cur = obj;
      while (cur) {
        if (cur.userData && (cur.userData.propId || cur.userData.platformId || cur.userData.anchorId || cur.userData.poiId)) {
          const id = cur.userData.propId || cur.userData.platformId || cur.userData.anchorId || cur.userData.poiId;
          picked = id;
          break;
        }
        if (cur.name && draftApi.findObjectById(cur.name)) { picked = cur.name; break; }
        cur = cur.parent;
      }
      if (picked) break;
      // Also check if name is resource/creature id: need to search draft objects positions? For now handle via prop/platform etc.
      // As fallback, find nearest object by distance to hit point
    }
    if (!picked) {
      // Try to find nearest world object to hit point on ground
      const hitPoint = intersects.find(h => h.object.name === "movement-playground" || h.object.geometry?.type === "BoxGeometry");
      let groundPoint = null;
      if (intersects[0]) groundPoint = intersects[0].point;
      if (groundPoint) {
        // Find nearest object (resource/creature/anchor) within 1.5
        let best = null; let bestDist = 1.5;
        for (const region of draftApi.getDraft().regions) {
          const candidates = [
            ...(region.resources ?? []),
            ...(region.creatures ?? []),
            ...(region.majorWaypoints ?? []),
            ...(region.extractionBeacons ?? []),
            ...(region.pois ?? []),
            ...(region.props ?? []),
          ];
          for (const c of candidates) {
            const pos = c.pos || (c.x !== undefined ? { x: c.x, z: c.z } : null);
            if (!pos) continue;
            const d = Math.hypot(pos.x - groundPoint.x, pos.z - groundPoint.z);
            if (d < bestDist) { bestDist = d; best = c.id; }
          }
        }
        if (best) picked = best;
      }
    }
    if (picked) {
      selectedId = picked;
      ui.setSelected(picked);
      updateHighlight();
      highlightOverlayForSelected();
    }
  }

  function onPointerDown(e) {
    // For dragging selected object on ground plane in edit mode
    if (!isEdit || !selectedId) return;
    if (e.button !== 0) return;
    // Could implement drag; for now use click selection only. Movement via nudge/buttons.
  }

  function onKeyDown(e) {
    if (!isEdit || !selectedId) return;
    const step = e.shiftKey ? 1.0 : 0.2;
    let dx = 0, dz = 0;
    if (e.key === "ArrowUp") dz = -step;
    else if (e.key === "ArrowDown") dz = step;
    else if (e.key === "ArrowLeft") dx = -step;
    else if (e.key === "ArrowRight") dx = step;
    else if (e.key === "PageUp") { // elevate
      const f = draftApi.findObjectById(selectedId);
      if (f && f.obj.pos) { f.obj.pos.y = (f.obj.pos.y ?? 0) + 0.2; draftApi.updateTransform(selectedId, {}); ui.setSelected(selectedId); updateHighlight(); e.preventDefault(); }
      return;
    } else if (e.key === "PageDown") {
      const f = draftApi.findObjectById(selectedId);
      if (f && f.obj.pos) { f.obj.pos.y = Math.max(-1, (f.obj.pos.y ?? 0) - 0.2); draftApi.updateTransform(selectedId, {}); ui.setSelected(selectedId); updateHighlight(); e.preventDefault(); }
      return;
    } else return;
    if (dx !== 0 || dz !== 0) {
      const found = draftApi.findObjectById(selectedId);
      if (found) {
        if (found.obj.pos) { found.obj.pos.x += dx; found.obj.pos.z += dz; }
        else if (found.obj.x !== undefined) { found.obj.x += dx; found.obj.z += dz; }
        draftApi.updateTransform(selectedId, {});
        ui.setSelected(selectedId);
        updateHighlight();
        e.preventDefault();
      }
    }
  }

  function updateHighlight() {
    // Remove old highlight
    if (highlightMesh) { scene.remove(highlightMesh); highlightMesh = null; }
    if (!selectedId) return;
    const found = draftApi.findObjectById(selectedId);
    if (!found) return;
    const obj = found.obj;
    const pos = obj.pos || (obj.x !== undefined ? { x: obj.x, y: (obj.y ?? 0), z: obj.z } : null);
    if (!pos) return;
    const y = (pos.y ?? 0) + 0.8;
    const geo = new THREE.RingGeometry(0.45, 0.58, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, y, pos.z);
    // Add vertical marker
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6), new THREE.MeshBasicMaterial({ color: 0xffd54f }));
    cyl.position.set(pos.x, y + 0.6, pos.z);
    const group = new THREE.Group();
    group.add(ring); group.add(cyl);
    group.name = "selection-highlight";
    scene.add(group);
    highlightMesh = group;
  }

  return { init, draftApi, ui, isEditMode: () => isEdit, suppressGameplay: () => suppressGameplay, getSelectedId: () => selectedId, updateHighlight, updateOverlays };
}
