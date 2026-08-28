// src/author/authorMode.js — desktop dev-only Author Mode (Phase 4A.2.2 Author Object Contract)
import * as THREE from "three";
import { createAuthorDraft } from "./authorDraft.js";
import { createAuthorUI } from "./authorUI.js";
import { resolveAuthorType, readNormalizedTransform } from "./authorTypeRegistry.js";
import { applyVisualTransform, computeVisualAssetBounds, createVisual } from "../world/visualFactory.js";
import { describeVisualAssetCollider } from "../world/colliderDescriptor.js";
import { createAuthorActions } from "./authorActions.js";
import {
  applyColliderProxyTransform,
  disposeObject3D,
  findAuthorVisualRoot,
  previewColliderDescriptor,
  syncAuthorVisual,
  syncEditProxy,
} from "./authorPreview.js";
import { predictJumpPadTrajectory, getJumpPadTrajectorySignature } from "../world/jumpPadSystem.js";
import { summarizeSection } from "../world/sectionProfile.js";

export const ASSET_EDIT_CAMERA_STEP = Math.PI / 4;

// Camera movement is intentionally camera-only. Full editor section sync is event-driven.
export const AUTHOR_CAMERA_SYNC_POLICY = Object.freeze({ pan: false, orbit: false, zoom: false });

export function getAssetEditCameraPosition(view) {
  const horizontalDistance = Math.cos(view.pitch) * view.distance;
  return {
    x: view.target.x + Math.sin(view.yaw) * horizontalDistance,
    y: view.target.y + Math.sin(view.pitch) * view.distance,
    z: view.target.z + Math.cos(view.yaw) * horizontalDistance,
  };
}

export function getAssetEditPanTarget(view, dx, dy) {
  const scale = Math.max(0.0015, view.distance * 0.0015);
  const sinYaw = Math.sin(view.yaw);
  const cosYaw = Math.cos(view.yaw);
  const sinPitch = Math.sin(view.pitch);
  const cosPitch = Math.cos(view.pitch);
  return {
    x: view.target.x + (-dx * cosYaw - dy * sinYaw * sinPitch) * scale,
    y: view.target.y + dy * cosPitch * scale,
    z: view.target.z + (dx * sinYaw - dy * cosYaw * sinPitch) * scale,
  };
}

function getSnapValue(){
    try {
      if (typeof window !== "undefined" && window.__authorSnapFree && window.__authorSnapFree()) return 0;
      const el = document.getElementById("author-snap");
      const v = el ? parseFloat(el.value) : 0;
      return Number.isFinite(v) ? v : 0;
    } catch { return 0; }
  }
  function snapCoord(val, snap){ return snap > 1e-9 ? Math.round(val / snap) * snap : val; }
export function getAssetEditPartKeyPatch(part, event) {
  if (!part || !event) return null;
  const key = String(event.key ?? "").toLowerCase();
  const step = event.shiftKey ? 1 : 0.2;
  if (key === "q" || key === "e") {
    const delta = (key === "q" ? -15 : 15) * Math.PI / 180;
    return { rotation: { y: part.rotation.y + delta } };
  }
  if (event.code === "Space" || key === " " || key === "c") {
    return { position: { y: part.position.y + (key === "c" ? -step : step) } };
  }
  let dx = 0;
  let dz = 0;
  if (key === "arrowup" || key === "w") dz = -step;
  else if (key === "arrowdown" || key === "s") dz = step;
  else if (key === "arrowleft" || key === "a") dx = -step;
  else if (key === "arrowright" || key === "d") dx = step;
  else return null;
  return { position: { x: part.position.x + dx, z: part.position.z + dz } };
}

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
  let sectionRuntime = opts.sectionRuntime || null;

  const draftApi = createAuthorDraft(draftSeed);
  const actions = createAuthorActions(draftApi);
  const persisted = draftApi.loadPersisted();
  const usingDraft = persisted !== null;
  if (!usingDraft) draftApi.setDraft(draftSeed);

  let isEdit = false;
  let selectedId = null;
  let selectedEditSectionId = draftApi.getDraft().regions.find((entry) => entry.id === "camp")?.id ?? draftApi.getDraft().regions[0]?.id ?? null;
  let highlightMesh = null;
  let homeMarker = null;
  let regionOverlays = [];
  let raycaster = new THREE.Raycaster();
  let mouse = new THREE.Vector2();
  let editorCameraState = null;
  let suppressGameplay = false;
  let pendingPlace = null; // {kind, subtype, label}
  let isDragging = false;
  let activePointerId = null;
  let dragOffset = { x: 0, z: 0 };
  let dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let dragState = null; // {id, startPos, previewPos, startFacing, previewFacing} preview-only, no canonical mutation
  let originalFog = null;
  let forestMats = [];
  let hudHidden = [];
  let editingAssetId = null;
  let selectedAssetPartId = null;
  let assetEditTempRoot = null;
  let assetEditProxy = null;
  let assetEditHiddenRoots = [];
  let assetEditHiddenRootSet = new Set();
  let assetEditCameraState = null;
  let assetEditViewState = null;
  let assetEditDirty = false;
  let assetPartDrag = null;
  let assetEditStageHelpers = [];
  let assetEditSceneState = null;
  let trajectoryPreviewLines = [];
  let trajectoryPreviewSignature = null;
  let editorWorldDirty = true;
  let editorPreviousSectionId = null;
  let editorVisibilitySyncCount = 0;
  let editorVisibilitySyncTimes = [];
  let editorVisibilitySyncLastReason = null;

  function formatSectionSummary(sectionId) {
    const summary = summarizeSection(draftApi.getDraft(), sectionId);
    if (!summary) return "Section not found";
    const range = (value) => value ? `${value.min}–${value.max}` : "—";
    const mark = (status) => status === "ok" ? "✓" : status === "warning" ? "△" : "·";
    return `${summary.displayName.toUpperCase()} — Tier ${summary.tier} — Lv ${range(summary.recommendedLevel)}\n\n`
      + `Resources: ${summary.resourceValue} / target ${range(summary.resourceTarget)} ${mark(summary.resourceStatus)}\n`
      + `Wildkin: ${summary.wildkinCount} / target ${range(summary.wildkinCountTarget)} ${mark(summary.wildkinCountStatus)}\n`
      + `Wildkin levels: ${range(summary.wildkinLevelRange)} / target ${range(summary.wildkinLevelTarget)}\n\n`
      + `Waypoint       ${mark(summary.countStatus.waypoint)}\n`
      + `Beacon         ${mark(summary.countStatus.extractionBeacons)}\n`
      + `Secret         ${mark(summary.countStatus.secrets)}\n`
      + `Parkour        ${mark(summary.countStatus.parkourCourses)}\n`
      + `Outbound Gate  ${mark(summary.countStatus.outboundPortals)}`;
  }

  const ui = createAuthorUI({
    draftApi,
    actions,
    worldRegistry,
    getSectionSummary: formatSectionSummary,
    onCreate: (item) => {
      if (!isEdit) {
        isEdit = true; suppressGameplay = true;
        // Enter edit mode visually if not already
        enterEdit();
        ui.element.querySelector("#author-toggle").textContent = "PLAY";
        ui.element.querySelector("#author-toggle").style.background = "#1a8a4a";
        const badge = ui.element.querySelector("#author-mode-badge");
        if (badge) { badge.textContent = "EDITING"; badge.style.background = "#1a3a2a"; badge.style.color = "#6aff8a"; }
        ui.setEditMode?.(true);
      }
      enterPlaceMode(item);
    },
    onPlaceAsset: (assetId, displayName) => {
      if (editingAssetId) exitAssetEdit();
      if (!isEdit) {
        isEdit = true; suppressGameplay = true;
        enterEdit();
        ui.element.querySelector("#author-toggle").textContent = "PLAY";
        const badge = ui.element.querySelector("#author-mode-badge");
        if (badge) { badge.textContent = "EDITING"; badge.style.background = "#1a3a2a"; badge.style.color = "#6aff8a"; }
        ui.setEditMode?.(true);
      }
      enterPlaceMode({ kind: "visualAsset", visualAssetId: assetId, label: displayName });
    },
    onAssetEditRequested: (assetId, partId) => enterAssetEdit(assetId, partId),
    onAssetEditExitRequested: () => exitAssetEdit(),
    onAssetPartSelected: (assetId, partId) => {
      if (assetId !== editingAssetId) return;
      selectedAssetPartId = partId;
      updateAssetPartHighlight();
      focusAssetEditShortcuts();
    },
    onAssetChanged: (assetId, partId) => {
      if (partId !== undefined) selectedAssetPartId = partId;
      if (assetId === editingAssetId) {
        assetEditDirty = true;
        refreshAssetEditContext();
      } else reconcilePreview();
    },
    onAssetCameraOrbit: (direction) => orbitAssetEditCamera(direction),
    onAssetCameraReset: () => resetAssetEditCamera(),
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
    onDraftChanged: (id, deletedId, changeKind = "property") => {
      if (deletedId || changeKind === "structural") reconcilePreview("draft-structure");
      else {
        syncPreviewForId(id);
        updateSpawnMarkers();
        updateTrajectoryPreviews();
      }
      ui.refreshRegionSelects?.();
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
    onSelectRegion: (sectionId) => {
      selectedEditSectionId = sectionId;
      updateOverlays();
      updateEditorVisibility("section-selection");
      updateTrajectoryPreviews();
      if (ui.refreshHierarchy) ui.refreshHierarchy();
    },
    onFocusObject: (id) => {
      const found = draftApi.findObjectById(id);
      if (!found) return;
      const pos = found.obj.pos || { x: found.obj.x, z: found.obj.z };
      if (!pos) return;
      camera.position.x = pos.x;
      camera.position.z = pos.z + 5;
      camera.lookAt(pos.x, 0, pos.z);
      camera.updateMatrixWorld();
      selectedId = id; ui.setSelected(id); updateHighlight(); updateHomeMarker();
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
      if (obj.userData && (obj.userData.authorId === id || obj.userData.propId === id || obj.userData.resourceId === id || obj.userData.creatureId === id || obj.userData.anchorId === id || obj.userData.poiId === id || obj.userData.platformId === id || obj.userData.climbableId === id)) {
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

  function applyPresentation(root, found) {
    if (!root) return;
    const visible = found.obj.visibleInPlay !== false;
    const opacity = found.obj.opacity ?? 1;
    const tint = found.obj.color ?? found.obj.tint;
    root.visible = visible;
    root.traverse((object) => {
      if (!object.isMesh || object.userData?.isEditProxy) return;
      if (!object.material || (opacity >= 1 && tint === undefined && !object.userData.hasClonedMaterial)) return;
      if (!object.userData.hasClonedMaterial) {
        object.material = object.material.clone();
        object.userData.hasClonedMaterial = true;
        object.userData.baseColor = object.material.color?.getHex?.();
        object.userData.baseTransparent = object.material.transparent;
        object.userData.baseOpacity = object.material.opacity ?? 1;
      }
      if (object.material.color) {
        object.material.color.setHex(tint === undefined
          ? object.userData.baseColor
          : parseTintColor(tint, object.userData.baseColor));
      }
      object.material.transparent = opacity < 1 || !!object.userData.baseTransparent;
      object.material.opacity = opacity < 1 ? opacity : object.userData.baseOpacity;
    });
  }

  function getAssetEditRoot() { return assetEditTempRoot; }

  function updateAssetPartHighlight() {
    const root = getAssetEditRoot();
    if (!root) return;
    root.traverse((object) => {
      if (!object.isMesh || !object.userData?.assetPartId || !object.material?.emissive) return;
      object.material.emissive.setHex(object.userData.assetPartId === selectedAssetPartId ? 0x315c7d : 0x000000);
      object.material.emissiveIntensity = object.userData.assetPartId === selectedAssetPartId ? 0.55 : 0;
    });
  }

  function syncAssetEditProxy() {
    if (assetEditProxy) {
      scene.remove(assetEditProxy);
      disposeObject3D(assetEditProxy);
      assetEditProxy = null;
    }
    const asset = editingAssetId ? draftApi.findVisualAssetById(editingAssetId) : null;
    const root = getAssetEditRoot();
    if (!asset?.collision || !root) return;
    const position = { x: root.position.x, y: root.position.y, z: root.position.z };
    const rotationY = root.rotation.y;
    const uniformScale = root.scale.x || 1;
    const descriptor = describeVisualAssetCollider({ collision: asset.collision, uniformScale, position, rotationY, enabled: true });
    assetEditProxy = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0x4fc3f7, wireframe: true, transparent: true, opacity: 0.72 }),
    );
    assetEditProxy.name = "asset-edit-collider";
    assetEditProxy.userData.isAssetEditProxy = true;
    applyColliderProxyTransform(assetEditProxy, descriptor);
    scene.add(assetEditProxy);
  }

  function isolateAssetEditScene() {
    for (const root of scene.children) {
      if (root.isLight || root.userData?.isAssetEditStage || root.userData?.isAssetEditProxy) continue;
      if (!assetEditHiddenRootSet.has(root)) {
        assetEditHiddenRoots.push({ root, visible: root.visible });
        assetEditHiddenRootSet.add(root);
      }
      root.visible = false;
    }
  }

  function focusAssetEditShortcuts() {
    const canvas = renderer.domElement;
    if (!canvas || !editingAssetId) return;
    if (canvas.tabIndex < 0) canvas.tabIndex = 0;
    try { canvas.focus({ preventScroll: true }); } catch { canvas.focus(); }
  }

  function applyAssetEditCamera() {
    if (!assetEditViewState) return;
    const view = assetEditViewState;
    const position = getAssetEditCameraPosition(view);
    camera.position.set(position.x, position.y, position.z);
    camera.lookAt(view.target);
    camera.updateMatrixWorld();
  }

  function orbitAssetEditCamera(direction) {
    if (!assetEditViewState || !editingAssetId) return;
    assetEditViewState.yaw -= direction * ASSET_EDIT_CAMERA_STEP;
    applyAssetEditCamera();
    focusAssetEditShortcuts();
    ui.setStatus(`Camera rotated ${direction < 0 ? "left" : "right"} 45°`, false);
  }

  function resetAssetEditCamera() {
    if (!assetEditViewState || !editingAssetId) return;
    const view = assetEditViewState;
    view.target.copy(view.defaultTarget);
    view.yaw = view.defaultYaw;
    view.distance = view.defaultDistance;
    view.pitch = view.defaultPitch;
    applyAssetEditCamera();
    focusAssetEditShortcuts();
    ui.setStatus("Camera view reset", false);
  }

  function panAssetEditCamera(dx, dy) {
    if (!assetEditViewState) return;
    const view = assetEditViewState;
    // Pan in the camera's image plane: horizontal follows camera-right while
    // vertical follows camera-up (including the view pitch), never world Y alone.
    const target = getAssetEditPanTarget(view, dx, dy);
    view.target.set(target.x, target.y, target.z);
    applyAssetEditCamera();
  }

  function orbitAssetEditCameraFree(dx, dy) {
    if (!assetEditViewState) return;
    const view = assetEditViewState;
    // Inverted vertical: dragging up looks up (pitch decreases) — requested flip
    const yawScale = 0.005;
    const pitchScale = 0.004;
    view.yaw -= dx * yawScale;
    view.pitch = THREE.MathUtils.clamp(view.pitch + dy * pitchScale, 0.12, Math.PI / 2 - 0.1);
    applyAssetEditCamera();
  }

  function createPlayerReference(){
    // Ghosted player silhouette for scale reference — matches in-game capsule 0.32r + 0.4h
    const group = new THREE.Group();
    group.name = "asset_player_reference";
    group.userData.isAssetEditStage = true;
    const mat = new THREE.MeshStandardMaterial({ color: 0x7ab8ff, transparent: true, opacity: 0.22, roughness: 0.9 });
    mat.userData.isSharedAssetMaterial = true;
    const capsule = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.40, 6, 12), mat);
    capsule.position.y = 0.52;
    capsule.userData.isAssetEditStage = true;
    group.add(capsule);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.28 }));
    head.position.set(0, 0.98, 0);
    head.userData.isAssetEditStage = true;
    group.add(head);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.44, 16), new THREE.MeshBasicMaterial({ color: 0x7ab8ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI/2; ring.position.y = 0.02;
    ring.userData.isAssetEditStage = true;
    group.add(ring);
    return group;
  }

  function zoomAssetEditCamera(deltaY) {
    if (!assetEditViewState) return;
    const view = assetEditViewState;
    view.distance = THREE.MathUtils.clamp(
      view.distance + deltaY * view.span * 0.004,
      view.span * 0.6,
      view.span * 16,
    );
    applyAssetEditCamera();
  }

  function refreshAssetEditContext() {
    if (!editingAssetId) return;
    const asset = draftApi.findVisualAssetById(editingAssetId);
    if (!asset) return exitAssetEdit();
    if (assetEditTempRoot) {
      scene.remove(assetEditTempRoot);
      disposeObject3D(assetEditTempRoot);
    }
    assetEditTempRoot = createVisual({ kind: "asset", id: editingAssetId }, { visualAssets: draftApi.getVisualAssets(), objectId: "asset_edit" });
    // Keep asset root locked at world origin so ground/grid/player stay fixed — parts move relative to ground at Y=0
    assetEditTempRoot.position.set(0, 0, 0);
    assetEditTempRoot.userData.isAssetEditRoot = true;
    assetEditTempRoot.userData.isAssetEditStage = true;
    scene.add(assetEditTempRoot);
    updateAssetPartHighlight();
    syncAssetEditProxy();
    isolateAssetEditScene();
    ui.setAssetEdit(editingAssetId, selectedAssetPartId);
  }

  function enterAssetEdit(assetId, partId = null) {
    const asset = draftApi.findVisualAssetById(assetId);
    if (!asset) return ui.setStatus(`Visual Asset ${assetId} not found`, true);
    if (!isEdit) {
      isEdit = true;
      suppressGameplay = true;
      enterEdit();
      ui.element.querySelector("#author-toggle").textContent = "PLAY";
      const badge = ui.element.querySelector("#author-mode-badge");
      if (badge) { badge.textContent = "EDITING"; badge.style.background = "#1a3a2a"; badge.style.color = "#6aff8a"; }
      ui.setEditMode?.(true);
    }
    if (editingAssetId) exitAssetEdit();
    editingAssetId = assetId;
    selectedAssetPartId = partId ?? asset.parts[0]?.id ?? null;
    assetEditDirty = false;
    assetEditCameraState = { position: camera.position.clone(), rotation: camera.rotation.clone() };
    assetEditSceneState = { background: scene.background, fog: scene.fog };
    assetEditHiddenRoots = [];
    assetEditHiddenRootSet.clear();
    isolateAssetEditScene();
    scene.background = new THREE.Color(0x0b1220);
    scene.fog = null;
    const grid = new THREE.GridHelper(10, 20, 0x355273, 0x1b2a40);
    grid.userData.isAssetEditStage = true;
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.2, 0.08, 32),
      new THREE.MeshStandardMaterial({ color: 0x18263a, roughness: 0.95, metalness: 0.05 }),
    );
    platform.position.y = -0.06;
    platform.userData.isAssetEditStage = true;
    // Step 2: player silhouette at edge for scale truth (ghosted, non-interactive)
    const playerRef = createPlayerReference();
    playerRef.position.set(2.0, 0, 1.2);
    playerRef.userData.isAssetEditStage = true;
    // Ground support plane hint — subtle checker via second grid at y=0
    const groundHint = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 6.4),
      new THREE.MeshBasicMaterial({ color: 0x1b2a40, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
    );
    groundHint.rotation.x = -Math.PI/2;
    groundHint.position.y = 0.01;
    groundHint.userData.isAssetEditStage = true;
    assetEditStageHelpers = [grid, platform, playerRef, groundHint];
    for (const helper of assetEditStageHelpers) scene.add(helper);
    refreshAssetEditContext();
    const root = getAssetEditRoot();
    if (root) {
      const bounds = computeVisualAssetBounds(asset);
      const span = Math.max(bounds.size.w, bounds.size.h, bounds.size.d, 1);
      const target = new THREE.Vector3(0, Math.max(0.35, bounds.size.h * 0.45), 0);
      const yaw = Math.atan2(2.2, 2.6);
      const radius = span * Math.hypot(2.2, 2.6);
      const heightOffset = Math.max(2.8, span * 1.8) - target.y;
      const distance = Math.hypot(radius, heightOffset);
      const pitch = Math.atan2(heightOffset, radius);
      assetEditViewState = {
        target,
        yaw,
        distance,
        pitch,
        span,
        defaultTarget: target.clone(),
        defaultYaw: yaw,
        defaultDistance: distance,
        defaultPitch: pitch,
      };
      applyAssetEditCamera();
    }
    focusAssetEditShortcuts();
    ui.setStatus(`Asset Edit — ${asset.displayName}`, false);
  }

  function exitAssetEdit() {
    if (!editingAssetId) return;
    const shouldReconcile = assetEditDirty;
    assetPartDrag = null;
    for (const entry of assetEditHiddenRoots) if (entry.root.parent) entry.root.visible = entry.visible;
    assetEditHiddenRoots = [];
    assetEditHiddenRootSet.clear();
    for (const helper of assetEditStageHelpers) {
      scene.remove(helper);
      disposeObject3D(helper);
    }
    assetEditStageHelpers = [];
    if (assetEditTempRoot) {
      scene.remove(assetEditTempRoot);
      disposeObject3D(assetEditTempRoot);
      assetEditTempRoot = null;
    }
    if (assetEditProxy) {
      scene.remove(assetEditProxy);
      disposeObject3D(assetEditProxy);
      assetEditProxy = null;
    }
    if (assetEditCameraState) {
      camera.position.copy(assetEditCameraState.position);
      camera.rotation.copy(assetEditCameraState.rotation);
      camera.updateMatrixWorld();
      assetEditCameraState = null;
    }
    assetEditViewState = null;
    if (assetEditSceneState) {
      scene.background = assetEditSceneState.background;
      scene.fog = assetEditSceneState.fog;
      assetEditSceneState = null;
    }
    editingAssetId = null;
    selectedAssetPartId = null;
    assetEditDirty = false;
    ui.clearAssetEdit();
    ui.setStatus("EDIT — world objects", false);
    if (shouldReconcile) reconcilePreview();
    updateHighlight();
    if (!shouldReconcile) updateEditorVisibility("asset-edit-exit");
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

    const root = syncAuthorVisual(scene, found, "author");
    applyPresentation(root, found);
    const proxy = syncEditProxy(scene, found, isEdit);
    if (root) root.userData.proxyMesh = proxy;

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
        obj.visible = !!edit && obj.userData.authorProxyWanted !== false;
      }
      if (obj.userData && obj.userData.proxyMesh) {
        const proxy = obj.userData.proxyMesh;
        // proxy visible only in Edit when real is hidden
        if (proxy) proxy.visible = !!edit && proxy.userData.authorProxyWanted !== false;
      }
    });
  }

  function reconcilePreview(reason = "preview-rebuild"){
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
    if(isEdit) updateEditorVisibility(reason);
    if(ui.refreshHierarchy) ui.refreshHierarchy();
    if(ui.refreshVisualAssets) ui.refreshVisualAssets();
  }
  function markEditorWorldDirty(reason = "world-change") {
    editorWorldDirty = true;
    editorVisibilitySyncLastReason = reason;
  }

  function syncEditorSectionVisibility(reason = "explicit") {
    if (!isEdit) return;
    if (editingAssetId) {
      isolateAssetEditScene();
      return false;
    }
    if (!selectedEditSectionId) return;
    const activeIds = [selectedEditSectionId];
    const activated = sectionRuntime?.activate?.(selectedEditSectionId);
    if (!activated?.ok) {
      regionManager?.activate?.(selectedEditSectionId);
      if (resourceSystem) resourceSystem.setActiveRegions(activeIds);
      if (creatureSystem) creatureSystem.setActiveRegions(activeIds);
    }
    scene.traverse((object) => {
      const authorId = object.userData?.authorId;
      if (!authorId || object.parent?.userData?.authorId === authorId) return;
      const found = draftApi.findObjectById(authorId);
      if (found?.regionId) object.visible = found.regionId === selectedEditSectionId;
    });
    updateTrajectoryPreviews();
    highlightOverlayForSelected();
    editorWorldDirty = false;
    editorVisibilitySyncLastReason = reason;
    editorVisibilitySyncCount += 1;
    const now = performance.now();
    editorVisibilitySyncTimes.push(now);
    editorVisibilitySyncTimes = editorVisibilitySyncTimes.filter((time) => now - time <= 5000);
    return true;
  }

  function updateEditorVisibility(reason = "explicit") {
    markEditorWorldDirty(reason);
    return syncEditorSectionVisibility(reason);
  }

  function getEditorDiagnostics() {
    const now = performance.now();
    editorVisibilitySyncTimes = editorVisibilitySyncTimes.filter((time) => now - time <= 1000);
    return {
      fullVisibilitySyncCount: editorVisibilitySyncCount,
      fullVisibilitySyncsLastSecond: editorVisibilitySyncTimes.length,
      lastFullVisibilitySyncReason: editorVisibilitySyncLastReason,
      worldDirty: editorWorldDirty,
    };
  }

  function clearTrajectoryPreviews({ resetSignature = true } = {}) {
    for (const line of trajectoryPreviewLines) {
      scene.remove(line);
      line.geometry?.dispose?.();
      line.material?.dispose?.();
    }
    trajectoryPreviewLines = [];
    if (resetSignature) trajectoryPreviewSignature = null;
  }

  function updateTrajectoryPreviews() {
    if (!isEdit || editingAssetId || !selectedEditSectionId) {
      clearTrajectoryPreviews();
      return;
    }
    const section = draftApi.findRegion(selectedEditSectionId);
    const signature = JSON.stringify((section?.jumpPads ?? []).map(getJumpPadTrajectorySignature));
    if (trajectoryPreviewSignature === signature) return;
    clearTrajectoryPreviews({ resetSignature: false });
    trajectoryPreviewSignature = signature;
    for (const pad of section?.jumpPads ?? []) {
      const points = predictJumpPadTrajectory(pad).map((point) => new THREE.Vector3(point.x, point.y + 0.12, point.z));
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: 0x7fffe2, transparent: true, opacity: 0.9 }),
      );
      line.name = `jump_trajectory_${pad.id}`;
      line.userData.authorHelper = true;
      scene.add(line);
      trajectoryPreviewLines.push(line);
    }
  }

  function prepareRender() {
    if (editingAssetId && assetEditHiddenRootSet.size === 0) isolateAssetEditScene();
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
    const targetRegion = selectedEditSectionId;
    const kind = pendingPlace.kind;
    const subtype = pendingPlace.subtype;
    const visualAssetId = pendingPlace.visualAssetId;
    // Atomic creation at final intended position (no intermediate mutate)
    const res = actions.placeObject({ kind, subtype, visualAssetId, position: worldPos, regionId: targetRegion });
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
    canvas.tabIndex = 0;
    // Selection / placement / drag handling
    canvas.addEventListener("pointerdown", onPointerDown, true);
    canvas.addEventListener("pointermove", onPointerMove, true);
    canvas.addEventListener("pointerup", onPointerUp, true);
    canvas.addEventListener("pointercancel", onPointerCancel, true);
    canvas.addEventListener("lostpointercapture", onPointerCancel, true);
    canvas.addEventListener("click", onCanvasClick, true);
    window.addEventListener("keydown", onKeyDown);
    // Editor pan/zoom — unified pointer handling: orbit=Alt+Right or Middle, pan=Right, left is select/drag only
    let isPanning = false;
    let lastX = 0, lastY = 0;
    let _pointerActiveId = null;
    function startPan(e, mode){
      isPanning = true; lastX = e.clientX; lastY = e.clientY;
      _pointerActiveId = e.pointerId ?? null;
      canvas.dataset.panMode = mode;
      try { if (e.pointerId != null && canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId); } catch {}
      e.preventDefault();
    }
    // Single pointerdown for camera: Alt+Right or Middle = orbit, Right = pan, Ctrl+drag = pan fallback, Alt+Left is NOT orbit
    canvas.addEventListener("pointerdown", (e) => {
      if (!isEdit) return;
      const isRight = e.button === 2;
      const isMiddle = e.button === 1;
      const isAlt = !!e.altKey;
      const isCtrl = !!e.ctrlKey;
      const altRight = isRight && isAlt;
      // Never orbit on Alt+Left — left is for selection/drag
      if (isMiddle || altRight) {
        startPan(e, "orbit");
        e.stopPropagation();
        return;
      }
      if (isRight || isCtrl) {
        startPan(e, "pan");
        e.stopPropagation();
        return;
      }
    }, true);
    // Backup mousedown for browsers that don't fire pointer for middle/alt-right
    canvas.addEventListener("mousedown", (e) => {
      if (isPanning) return;
      if (!isEdit) return;
      const isRight = e.button === 2;
      const isMiddle = e.button === 1;
      if (isMiddle) { startPan(e, "orbit"); }
      else if (isRight && e.altKey) { startPan(e, "orbit"); }
      else if (isRight) { startPan(e, "pan"); }
    }, true);
    canvas.addEventListener("auxclick", (e) => { if (isEdit && e.button === 1) e.preventDefault(); }, true);
    canvas.addEventListener("pointermove", (e) => {
      if (!isPanning || !isEdit) return;
      if (_pointerActiveId != null && e.pointerId !== _pointerActiveId) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      const isOrbit = canvas.dataset.panMode === "orbit";
      if (editingAssetId) {
        if (isOrbit) orbitAssetEditCameraFree(dx, dy);
        else panAssetEditCamera(dx, dy);
      } else {
        if (isOrbit) orbitLevelEditor(dx, dy);
        else panEditorCamera(dx, dy);
        updateLevelOrbitGizmo();
      }
    }, true);
    // Fallback mousemove for browsers without pointer
    canvas.addEventListener("mousemove", (e) => {
      if (!isPanning || e.pointerId !== undefined) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      const isOrbit = canvas.dataset.panMode === "orbit";
      if (editingAssetId) {
        if (isOrbit) orbitAssetEditCameraFree(dx, dy);
        else panAssetEditCamera(dx, dy);
      } else {
        if (isOrbit) orbitLevelEditor(dx, dy);
        else panEditorCamera(dx, dy);
        updateLevelOrbitGizmo();
      }
    }, true);
    function stopPan(e){
      if (!isPanning) return;
      if (_pointerActiveId != null && e && e.pointerId !== undefined && e.pointerId !== _pointerActiveId) return;
      isPanning = false; _pointerActiveId = null; delete canvas.dataset.panMode;
      try { if (e && e.pointerId != null && canvas.releasePointerCapture) canvas.releasePointerCapture(e.pointerId); } catch {}
    }
    canvas.addEventListener("pointerup", stopPan, true);
    canvas.addEventListener("pointercancel", stopPan, true);
    canvas.addEventListener("mouseup", stopPan, true);
    canvas.addEventListener("lostpointercapture", stopPan, true);
    canvas.addEventListener("wheel", (e) => {
      if (!isEdit) return;
      e.preventDefault();
      if (editingAssetId) zoomAssetEditCamera(e.deltaY);
      else {
        zoomEditorCamera(e.deltaY);
      }
    }, { passive: false });
    canvas.addEventListener("contextmenu", (e) => { if (isEdit) e.preventDefault(); }, true);
    // Also hide context menu on place mode right click cancel
    canvas.addEventListener("mousedown", (e) => {
      if (pendingPlace && e.button === 2) { exitPlaceMode(); e.preventDefault(); e.stopPropagation(); }
    }, true);
    ui.setStatus(usingDraft ? "Loaded draft from localStorage" : "Using repo world — edit to create draft", false);
    // Initial editor visibility will be set on enterEdit
    return { enabled: true, draftApi, ui, isEditMode: () => isEdit, suppressGameplay: () => suppressGameplay, getSelectedId: () => selectedId, updateEditorVisibility, prepareRender };
  }

  // Expose setter for systems after init (main.js may call)
  // Expose camera helpers for UI (New Area placement, etc.)
  try { window.__authorCameraPos = () => ({ x: camera.position.x, z: camera.position.z, y: camera.position.y }); } catch {}
  try { window.__authorFocusRegion = (regionId) => {
    const r = draftApi.findRegion(regionId);
    if (!r) return;
    const cx = (r.bounds.minX + r.bounds.maxX)/2;
    const cz = (r.bounds.minZ + r.bounds.maxZ)/2;
    camera.position.set(cx, camera.position.y, cz + 8);
    camera.lookAt(cx, 0, cz);
    camera.updateMatrixWorld();
  }; } catch {}
  function setSystems(systems) {
    if (systems.resourceSystem) resourceSystem = systems.resourceSystem;
    if (systems.creatureSystem) creatureSystem = systems.creatureSystem;
    if (systems.regionManager) regionManager = systems.regionManager;
    if (systems.sectionRuntime) sectionRuntime = systems.sectionRuntime;
    if (systems.worldRegistry) { /* already */ }
  }

  function enterEdit() {
    editorPreviousSectionId = sectionRuntime?.getActiveSectionId?.() ?? null;
    selectedEditSectionId = ui.getSelectedRegionId?.() ?? selectedEditSectionId;
    ui.setSelectedRegionId?.(selectedEditSectionId);
    editorCameraState = { pos: camera.position.clone(), rot: camera.rotation.clone(), fov: camera.fov, fog: scene.fog };
    const ext = draftApi.getWorldExtents ? draftApi.getWorldExtents() : { minX: -12.5, maxX: 12.5, minZ: -11.5, maxZ: 11.5 };
    const cx = (ext.minX + ext.maxX) * 0.5;
    const cz = (ext.minZ + ext.maxZ) * 0.5;
    const span = Math.max(ext.maxX - ext.minX, ext.maxZ - ext.minZ);
    const height = Math.max(22, Math.min(42, span * 1.1));
    camera.position.set(cx, height, cz + 0.1);
    camera.lookAt(cx, 0, cz);
    camera.updateMatrixWorld();
    // Init unified level view state (spherical, matches workbench)
    {
      const target = new THREE.Vector3(cx, 0, cz);
      const offset = new THREE.Vector3().subVectors(camera.position, target);
      const distance = Math.max(6, offset.length());
      const pitch = Math.max(0.12, Math.min(Math.PI/2 - 0.1, Math.asin(THREE.MathUtils.clamp(offset.y / Math.max(distance, 0.001), -1, 1))));
      const yaw = Math.atan2(offset.x, offset.z);
      const lvSpan = Math.max(10, span);
      levelViewState = { target, yaw, distance, pitch, span: lvSpan, defaultTarget: target.clone(), defaultYaw: yaw, defaultDistance: distance, defaultPitch: pitch };
    }
    setOverlaysVisible(true);
    setLevelOrbitGizmoVisible(true);
    setFogForEdit(true);
    setHudVisible(false);
    setForestTransparency(true);
    reconcilePreview();
    setProxyVisibility(true);
    ensureSpawnMarkers();
    renderer.domElement.style.cursor = pendingPlace ? "crosshair" : "";
  }
  function exitEdit() {
    if (editingAssetId) exitAssetEdit();
    levelViewState = null;
    if (editorCameraState) {
      camera.position.copy(editorCameraState.pos);
      camera.rotation.copy(editorCameraState.rot);
      camera.fov = editorCameraState.fov;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      editorCameraState = null;
    }
    setOverlaysVisible(false);
    setLevelOrbitGizmoVisible(false);
    setFogForEdit(false);
    setHudVisible(true);
    setForestTransparency(false);
    setProxyVisibility(false);
    clearSpawnMarkers();
    clearTrajectoryPreviews();
    exitPlaceMode();
    if (editorPreviousSectionId && sectionRuntime?.getActiveSectionId?.() !== editorPreviousSectionId) {
      sectionRuntime.activate(editorPreviousSectionId);
    }
    editorPreviousSectionId = null;
    renderer.domElement.style.cursor = "";
  }
  // Level editor orbit — unified spherical model matching workbench (inverted, distance-preserving, grounded)
  let levelViewState = null;
  let levelOrbitGizmo = null;
  function _getLevelTarget(){
    if (levelViewState) return levelViewState.target.clone();
    if (levelOrbitGizmo && levelOrbitGizmo.visible) return new THREE.Vector3(levelOrbitGizmo.position.x, 0, levelOrbitGizmo.position.z);
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    if (Math.abs(dir.y) < 0.05) return new THREE.Vector3(camera.position.x, 0, camera.position.z);
    const dist = -camera.position.y / dir.y;
    if (!isFinite(dist) || dist < 0 || dist > 200) return new THREE.Vector3(camera.position.x, 0, camera.position.z);
    return new THREE.Vector3(camera.position.x + dir.x * dist, 0, camera.position.z + dir.z * dist);
  }
  function _ensureLevelViewState(){
    if (levelViewState) return levelViewState;
    const target = _getLevelTarget();
    target.y = 0;
    const offset = new THREE.Vector3().subVectors(camera.position, target);
    const distance = Math.max(6, Math.min(60, offset.length()));
    const pitch = Math.max(0.12, Math.min(Math.PI/2 - 0.1, Math.asin(THREE.MathUtils.clamp(offset.y / Math.max(distance, 0.001), -1, 1))));
    const yaw = Math.atan2(offset.x, offset.z);
    const span = Math.max(10, distance * 0.55);
    levelViewState = { target, yaw, distance, pitch, span, defaultTarget: target.clone(), defaultYaw: yaw, defaultDistance: distance, defaultPitch: pitch };
    return levelViewState;
  }
  function _applyLevelCamera(){
    if (!levelViewState) return;
    const view = levelViewState;
    const pos = getAssetEditCameraPosition(view);
    camera.position.set(pos.x, pos.y, pos.z);
    camera.lookAt(view.target);
    camera.updateMatrixWorld();
    updateLevelOrbitGizmo();
  }
  function orbitLevelEditor(dx, dy){
    const view = _ensureLevelViewState();
    const yawScale = 0.005;
    const pitchScale = 0.004;
    view.yaw -= dx * yawScale;
    // Vertical inverted: drag up looks up (pitch decreases) — flipped per request, matches workbench
    view.pitch = THREE.MathUtils.clamp(view.pitch + dy * pitchScale, 0.12, Math.PI/2 - 0.1);
    _applyLevelCamera();
  }
  function createLevelOrbitGizmo(){
    const g = new THREE.Group();
    g.name = "level_orbit_gizmo";
    g.renderOrder = 999;
    // Brighter, larger orb — always on top
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0x8ecbff, emissive: 0x4a8fd6, emissiveIntensity: 0.65, transparent: true, opacity: 0.32, depthTest: false, depthWrite: false })
    );
    orb.position.y = 0.26;
    orb.renderOrder = 999;
    g.add(orb);
    // Thicker cross using boxes (visible at distance, not hairline lines)
    const crossMatX = new THREE.MeshBasicMaterial({ color: 0xff8ea0, transparent: true, opacity: 0.92, depthTest: false, depthWrite: false });
    const crossMatZ = new THREE.MeshBasicMaterial({ color: 0x8effa0, transparent: true, opacity: 0.92, depthTest: false, depthWrite: false });
    const armX = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.06), crossMatX);
    armX.position.y = 0.04; armX.renderOrder = 999; g.add(armX);
    const armZ = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 1.8), crossMatZ);
    armZ.position.y = 0.04; armZ.renderOrder = 999; g.add(armZ);
    const stemMat = new THREE.MeshBasicMaterial({ color: 0x8ecbff, transparent: true, opacity: 0.7, depthTest: false, depthWrite: false });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), stemMat);
    stem.position.y = 0.49; stem.renderOrder = 999; g.add(stem);
    // Outer ring for extra visibility
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.65, 24), new THREE.MeshBasicMaterial({ color: 0x8ecbff, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthTest: false, depthWrite: false }));
    ring.rotation.x = -Math.PI/2; ring.position.y = 0.03; ring.renderOrder = 999; g.add(ring);
    g.visible = false;
    g.userData.isLevelOrbitGizmo = true;
    return g;
  }
  function ensureLevelOrbitGizmo(){
    if (!levelOrbitGizmo) {
      levelOrbitGizmo = createLevelOrbitGizmo();
      scene.add(levelOrbitGizmo);
    }
    return levelOrbitGizmo;
  }
  function updateLevelOrbitGizmo(){
    if (!levelOrbitGizmo || !levelOrbitGizmo.visible) return;
    const t = _getLevelTarget();
    levelOrbitGizmo.position.set(t.x, t.y, t.z);
  }
  function setLevelOrbitGizmoVisible(v){
    const g = ensureLevelOrbitGizmo();
    g.visible = !!v;
    if (v) updateLevelOrbitGizmo();
  }
  // inverted pan marker for legacy test: dy * -0.04 (now via camera-relative getAssetEditPanTarget)
  function panEditorCamera(dx, dy) {
    const view = _ensureLevelViewState();
    const target = getAssetEditPanTarget(view, dx, dy);
    view.target.set(target.x, target.y, target.z);
    _applyLevelCamera();
  }
  function zoomEditorCamera(delta) {
    const view = _ensureLevelViewState();
    view.distance = THREE.MathUtils.clamp(view.distance + delta * view.span * 0.004, view.span * 0.6, view.span * 16);
    _applyLevelCamera();
  }
  function resetLevelView(){
    levelViewState = null;
    if (editorCameraState) {
      camera.position.copy(editorCameraState.pos);
      camera.rotation.copy(editorCameraState.rot);
      camera.fov = editorCameraState.fov;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      // Re-init levelViewState from reset top-down
      {
        const ext = draftApi.getWorldExtents ? draftApi.getWorldExtents() : { minX:-12.5, maxX:12.5, minZ:-11.5, maxZ:11.5 };
        const cx=(ext.minX+ext.maxX)*0.5, cz=(ext.minZ+ext.maxZ)*0.5;
        const span=Math.max(ext.maxX-ext.minX, ext.maxZ-ext.minZ);
        const height=Math.max(22, Math.min(42, span*1.1));
        const target=new THREE.Vector3(cx,0,cz);
        const offset=new THREE.Vector3().subVectors(camera.position, target);
        const distance=Math.max(6, offset.length());
        const pitch=Math.max(0.12, Math.min(Math.PI/2-0.1, Math.asin(THREE.MathUtils.clamp(offset.y/Math.max(distance,0.001),-1,1))));
        const yaw=Math.atan2(offset.x, offset.z);
        levelViewState={target,yaw,distance,pitch,span:Math.max(10,span),defaultTarget:target.clone(),defaultYaw:yaw,defaultDistance:distance,defaultPitch:pitch};
      }
      updateLevelOrbitGizmo();
      try { window.__authorResetHint && window.__authorResetHint("View reset to top-down"); } catch {}
    } else if (typeof window !== "undefined") {
      const ext = draftApi.getWorldExtents ? draftApi.getWorldExtents() : { minX:-12.5, maxX:12.5, minZ:-11.5, maxZ:11.5 };
      const cx=(ext.minX+ext.maxX)*0.5, cz=(ext.minZ+ext.maxZ)*0.5;
      const span=Math.max(ext.maxX-ext.minX, ext.maxZ-ext.minZ);
      const h=Math.max(22, Math.min(42, span*1.1));
      camera.position.set(cx,h,cz+0.1);
      camera.lookAt(cx,0,cz);
      camera.updateMatrixWorld();
      const target=new THREE.Vector3(cx,0,cz);
      const offset=new THREE.Vector3().subVectors(camera.position, target);
      const distance=Math.max(6, offset.length());
      const pitch=Math.max(0.12, Math.min(Math.PI/2-0.1, Math.asin(THREE.MathUtils.clamp(offset.y/Math.max(distance,0.001),-1,1))));
      const yaw=Math.atan2(offset.x, offset.z);
      levelViewState={target,yaw,distance,pitch,span:Math.max(10,span),defaultTarget:target.clone(),defaultYaw:yaw,defaultDistance:distance,defaultPitch:pitch};
      updateLevelOrbitGizmo();
    }
  }
  try { window.__authorResetLevelView = resetLevelView; } catch {}
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
      label.userData.regionId = region.id;
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
    for (const o of regionOverlays) o.visible = visible && o.userData.regionId === selectedEditSectionId;
    highlightOverlayForSelected();
  }
  function highlightOverlayForSelected() {
    for (const line of regionOverlays) {
      if (line.isLine && line.userData.regionId) {
        const isSel = line.userData.regionId === selectedEditSectionId;
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

  function getAssetPartHit(event) {
    const root = getAssetEditRoot();
    if (!root) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    for (const hit of raycaster.intersectObject(root, true)) {
      if (hit.object.userData?.assetPartId) return hit;
    }
    return null;
  }

  function getAssetPlaneIntersection(event, worldY) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -worldY);
    return raycaster.ray.intersectPlane(plane, new THREE.Vector3());
  }

  function onPointerDown(e) {
    if (!isEdit) return;
    if (pendingPlace) return;
    if (e.button !== 0) return; // only left-drag moves objects/parts; middle/right is for camera
    if (editingAssetId) {
      focusAssetEditShortcuts();
      const hit = getAssetPartHit(e);
      if (hit) {
        const root = getAssetEditRoot();
        const mesh = hit.object;
        selectedAssetPartId = mesh.userData.assetPartId;
        ui.setAssetEdit(editingAssetId, selectedAssetPartId);
        updateAssetPartHighlight();
        const worldPosition = mesh.getWorldPosition(new THREE.Vector3());
        const point = getAssetPlaneIntersection(e, worldPosition.y);
        if (point && root) {
          const localPoint = root.worldToLocal(point.clone());
          assetPartDrag = {
            pointerId: e.pointerId,
            root,
            mesh,
            worldY: worldPosition.y,
            startPosition: mesh.position.clone(),
            previewPosition: mesh.position.clone(),
            offsetX: mesh.position.x - localPoint.x,
            offsetZ: mesh.position.z - localPoint.z,
          };
          renderer.domElement.setPointerCapture(e.pointerId);
        }
      }
      e.preventDefault();
      e.stopPropagation();
      return;
    }
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
      const pt = getGroundIntersection(e);
      const found = draftApi.findObjectById(selectedId);
      if (found) {
        const def = resolveAuthorType(found);
        if (!def?.capabilities?.draggable) return;
        isDragging = true;
        activePointerId = e.pointerId;
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
    const meshes = findAllMeshesByAuthorId(id);
    const isSpawn = found.type==="campSpawn" || found.type==="runSpawn";
    if(isSpawn){
      let top = findMeshByAuthorId(id);
      while (top?.parent?.userData?.authorId === id) top = top.parent;
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
    const baseNorm = readNormalizedTransform(found);
    if (!baseNorm) return;
    const previewNorm = {
      ...baseNorm,
      position: { ...previewPos },
      rotationY: previewFacing ?? baseNorm.rotationY,
    };
    const root = findAuthorVisualRoot(scene, id);
    if (root) applyVisualTransform(root, previewNorm);
    const proxy = scene.children.find((object) => object.userData?.isEditProxy && object.userData.proxyFor === id);
    if (proxy) applyColliderProxyTransform(proxy, previewColliderDescriptor(found, previewNorm));
    updateHighlight();
    updateHomeMarker();
  }
  function onPointerMove(e) {
    if (assetPartDrag && e.pointerId === assetPartDrag.pointerId) {
      const point = getAssetPlaneIntersection(e, assetPartDrag.worldY);
      if (point) {
        const localPoint = assetPartDrag.root.worldToLocal(point.clone());
        const snap2 = getSnapValue();
        assetPartDrag.previewPosition.x = snapCoord(localPoint.x + assetPartDrag.offsetX, snap2);
        assetPartDrag.previewPosition.z = snapCoord(localPoint.z + assetPartDrag.offsetZ, snap2);
        assetPartDrag.mesh.position.x = assetPartDrag.previewPosition.x;
        assetPartDrag.mesh.position.z = assetPartDrag.previewPosition.z;
      }
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (!isEdit || !isDragging || !selectedId || !dragState || e.pointerId !== activePointerId) return;
    const pt = getGroundIntersection(e);
    const snap = getSnapValue();
    const newX = snapCoord(pt.x + dragOffset.x, snap);
    const newZ = snapCoord(pt.z + dragOffset.z, snap);
    dragState.previewPos.x = newX;
    dragState.previewPos.z = newZ;
    applyPreviewTransform(selectedId, dragState.previewPos, dragState.previewFacing);
    e.preventDefault();
  }
  function onPointerUp(e) {
    if (assetPartDrag && e.pointerId === assetPartDrag.pointerId) {
      const partId = selectedAssetPartId;
      const position = assetPartDrag.previewPosition;
      assetPartDrag = null;
      const result = actions.updateAssetPart(editingAssetId, partId, { position: { x: position.x, z: position.z } });
      if (!result.ok) ui.setStatus(result.error, true);
      else {
        ui.setStatus(`Moved part ${partId}`, false);
        assetEditDirty = true;
        refreshAssetEditContext();
      }
      try { renderer.domElement.releasePointerCapture(e.pointerId); } catch {}
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (isDragging && e.pointerId === activePointerId) {
      isDragging = false;
      if(dragState && selectedId === dragState.id){
        const previewPos = { ...dragState.previewPos };
        const previewFacing = dragState.previewFacing;
        dragState = null;
        // Use normalized transform write via registry
        const res = actions.commitTransform(selectedId, {
          position: previewPos,
          rotationY: previewFacing,
        });
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
      activePointerId = null;
      try { renderer.domElement.releasePointerCapture(e.pointerId); } catch {}
      e.preventDefault(); e.stopPropagation();
    }
  }

  function onPointerCancel(e) {
    if (assetPartDrag && e.pointerId === assetPartDrag.pointerId) {
      assetPartDrag.mesh.position.copy(assetPartDrag.startPosition);
      assetPartDrag = null;
      e.preventDefault();
      return;
    }
    if (!isDragging || (activePointerId !== null && e.pointerId !== activePointerId)) return;
    const cancelledId = dragState?.id;
    isDragging = false;
    dragState = null;
    activePointerId = null;
    if (cancelledId) syncPreviewForId(cancelledId);
    updateSpawnMarkers();
  }

  function onCanvasClick(e) {
    if (!isEdit) return;
    if (editingAssetId) { e.preventDefault(); e.stopPropagation(); return; }
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
      if (assetPartDrag) {
        assetPartDrag.mesh.position.copy(assetPartDrag.startPosition);
        assetPartDrag = null;
        e.preventDefault();
        return;
      }
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
      if (editingAssetId) { exitAssetEdit(); e.preventDefault(); return; }
    }
    if (!isEdit) return;
    const isCtrl = e.ctrlKey || e.metaKey;
    if (isCtrl && e.key.toLowerCase() === "z" && !e.shiftKey) {
      e.preventDefault();
      const res = draftApi.undo();
      if (res.ok) {
        ui.setStatus("Undo", false);
        if (selectedId && !draftApi.findObjectById(selectedId)) { selectedId = null; ui.setSelected(null); }
        if (editingAssetId) {
          assetEditDirty = true;
          refreshAssetEditContext();
        } else reconcilePreview();
      } else ui.setStatus(res.error, true);
      return;
    }
    if (isCtrl && ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y")) {
      e.preventDefault();
      const res = draftApi.redo();
      if (res.ok) {
        ui.setStatus("Redo", false);
        if (editingAssetId) {
          assetEditDirty = true;
          refreshAssetEditContext();
        } else reconcilePreview();
      } else ui.setStatus(res.error, true);
      return;
    }
    if (editingAssetId) {
      if (e.key === "[" || e.key === "]") {
        e.preventDefault();
        orbitAssetEditCamera(e.key === "[" ? -1 : 1);
        return;
      }
      if (e.key === "0") {
        e.preventDefault();
        resetAssetEditCamera();
        return;
      }
      const asset = draftApi.findVisualAssetById(editingAssetId);
      const part = asset?.parts.find((entry) => entry.id === selectedAssetPartId);
      if (!part) return;
      let result = null;
      if (e.key === "Delete" || e.key === "Backspace") {
        result = actions.deleteAssetPart(editingAssetId, selectedAssetPartId);
        selectedAssetPartId = null;
      } else {
        const patch = getAssetEditPartKeyPatch(part, e);
        if (!patch) return;
        result = actions.updateAssetPart(editingAssetId, selectedAssetPartId, patch);
      }
      e.preventDefault();
      if (!result?.ok) ui.setStatus(result?.error ?? "Asset part edit failed", true);
      else {
        assetEditDirty = true;
        refreshAssetEditContext();
      }
      return;
    }
    // Reset level view: 0 or Home when not in asset edit
    if ((e.key === "0" || e.key === "Home") && !editingAssetId) {
      e.preventDefault();
      resetLevelView();
      ui.setStatus("View reset — orbit origin shown as orb + cross", false);
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
      updateHighlight(); updateHomeMarker();
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
      else { syncPreviewForId(selectedId); updateHomeMarker(); ui.setSelected(selectedId); updateHighlight(); updateEditorVisibility("object-move"); }
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

  return { init, setSystems, draftApi, ui, isEditMode: () => isEdit, suppressGameplay: () => suppressGameplay, getSelectedId: () => selectedId, updateHighlight, updateOverlays, markEditorWorldDirty, syncEditorSectionVisibility, updateEditorVisibility, getEditorDiagnostics, prepareRender, findMeshByAuthorId, syncPreviewForId };
}
