// src/world/staticWorldBuilder.js — data-driven static world instantiation (Phase 4A.1)
// Builds visual meshes and collision data from normalized authored world data.
// One source: world.json -> normalized -> worldRegistry -> this builder.

import * as THREE from "three";
import { disposeExternalModelInstance } from "../assets/modelAssetRuntime.js";
import { MOVEMENT_CONFIG } from "../game/config.js";
import { normalizeStaticDescriptor } from "./staticDescriptor.js";
import {
  applyVisualTransform,
  createVisual,
  getVisualRecipeKey,
  tagVisualRoot,
} from "./visualFactory.js";
import { describeVisualAssetCollider, getColliderCenter } from "./colliderDescriptor.js";
import { resolveJumpPadVisual, resolveParkourMarkerVisual, resolvePortalGateVisual } from "./playerFacingVisuals.js";
import { applyTerrainSurface } from "../presentation/terrainSurface.js";
import { createAuthoredTerrain } from "../presentation/authoredTerrain.js";
import { getSurfaceHeight } from "./terrainSurfaceModel.js";

function parseColor(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    let s = value.trim();
    if (s.startsWith("0x")) s = "#" + s.slice(2);
    if (!s.startsWith("#")) s = "#" + s;
    // validate hex
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return parseInt(s.slice(1), 16);
    return fallback;
  }
  return fallback;
}

function shouldCloneMaterial(mat, needsTint, needsOpacity) {
  return needsTint || needsOpacity;
}

export function createStaticWorld(worldData) {
  const group = new THREE.Group();
  group.name = "movement-playground";

  const obstacles = [];
  const platforms = [];
  const jumpTraversals = [];
  const climbables = [];
  const groundPatches = [];
  const terrainSurfaces = [];
  const boundaries = [];
  const sectionGroups = new Map();
  const portalVisualRoots = new Map();
  let currentSectionId = null;
  let currentSectionGroup = group;
  let activeSectionId = null;

  // Base materials (shared)
  const platformMat = new THREE.MeshStandardMaterial({ color: 0x8d7a5a, flatShading: true });
  const obstacleMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, flatShading: true });
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8b7a5a, flatShading: true });
  const gateMat = new THREE.MeshStandardMaterial({ color: 0xc9b48a, flatShading: true, emissive: 0x332200, emissiveIntensity: 0.15 });
  const forestMat = new THREE.MeshStandardMaterial({ color: 0x2d4a2e, flatShading: true });
  const waterMatBase = new THREE.MeshStandardMaterial({ color: 0x4a90a8, flatShading: true, transparent: true, opacity: 0.55 });
  const islandMat = new THREE.MeshStandardMaterial({ color: 0xc2b280, flatShading: true });
  const dropPodMat = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, flatShading: true, metalness: 0.3 });
  const resonatorMat = new THREE.MeshStandardMaterial({ color: 0x7ab8ff, flatShading: true, emissive: 0x1a3a5a, emissiveIntensity: 0.25 });
  const waypointMat = new THREE.MeshStandardMaterial({ color: 0x4fc3f7, flatShading: true, emissive: 0x0a2a3a, emissiveIntensity: 0.2 });
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0xff7043, flatShading: true, emissive: 0x442200, emissiveIntensity: 0.2 });
  const chestMat = new THREE.MeshStandardMaterial({ color: 0xffd54f, flatShading: true, emissive: 0x332200, emissiveIntensity: 0.12 });
  const barrierMat = new THREE.MeshStandardMaterial({ color: 0x777777, flatShading: true });
  const groundMatBase = new THREE.MeshStandardMaterial({ color: 0x7bb26a, flatShading: true, roughness: 0.95 });
  const boundaryMatBase = new THREE.MeshStandardMaterial({ color: 0x5a6a7a, flatShading: true, transparent: true, opacity: 0.28 });

  function getBaseMatForSubtype(subtype) {
    if (subtype === "fence") return fenceMat;
    if (subtype === "gate") return gateMat;
    if (subtype === "forestBoundary") return forestMat;
    if (subtype === "water") return waterMatBase;
    if (subtype === "island") return islandMat;
    if (subtype === "dropPod") return dropPodMat;
    if (subtype === "resonator") return resonatorMat;
    if (subtype === "box") return obstacleMat;
    if (subtype === "groundPatch") return groundMatBase;
    if (subtype === "boundaryCollider") return boundaryMatBase;
    return obstacleMat;
  }

  function createTintedMaterial(baseMat, prop) {
    const hasTint = prop.color !== undefined || prop.tint !== undefined;
    const rawColor = prop.color ?? prop.tint;
    const hasOpacity = prop.opacity !== undefined && prop.opacity < 1 - 1e-6;
    if (!hasTint && !hasOpacity) return baseMat;
    const mat = baseMat.clone();
    if (hasTint) {
      const col = parseColor(rawColor, baseMat.color.getHex());
      mat.color.setHex(col);
    }
    if (hasOpacity) {
      mat.transparent = true;
      mat.opacity = prop.opacity;
      // ensure depthWrite false for semi-transparent? Keep true for opaque
      if (prop.opacity < 1) mat.transparent = true;
    } else if (baseMat.transparent && baseMat.opacity < 1) {
      // keep base transparency
    }
    return mat;
  }

  function addFactoryVisual({ id, visualId, visualRef: suppliedVisualRef, size, position, rotationY = 0, options = {}, metadata = {} }) {
    const visualRef = suppliedVisualRef ?? { kind: "builtin", id: visualId };
    const visualOptions = { objectId: id, size, ...options };
    const root = tagVisualRoot(createVisual(visualRef, visualOptions), {
      objectId: id,
      visualRef,
      recipeKey: getVisualRecipeKey(visualRef, visualOptions),
    });
    root.name = id;
    Object.assign(root.userData, { sectionId: currentSectionId, regionId: currentSectionId }, metadata);
    applyVisualTransform(root, { position, rotationY, uniformScale: options.uniformScale, sizeMode: options.sizeMode });
    currentSectionGroup.add(root);
    return root;
  }

  function disposeFactoryRoot(root) {
    if (disposeExternalModelInstance(root)) return;
    root?.traverse((object) => {
      if (object.geometry && !object.geometry.userData?.isSharedAssetGeometry) object.geometry.dispose?.();
      const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
      for (const material of materials) if (!material.userData?.isSharedAssetMaterial) material.dispose?.();
    });
  }

  function applyFactoryPresentation(root, prop, visibleInPlay, opacity) {
    root.visible = visibleInPlay;
    const tint = prop.color ?? prop.tint;
    root.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      if (tint === undefined && opacity >= 1) return;
      object.material = object.material.clone();
      if (root.userData.externalModelInstance) object.material.userData = { ...object.material.userData, externalModelInstanceMaterial: true };
      if (tint !== undefined && object.material.color) {
        object.material.color.setHex(parseColor(tint, object.material.color.getHex()));
      }
      if (opacity < 1) {
        object.material.transparent = true;
        object.material.opacity = opacity;
      }
    });
  }

  function addPropMesh(prop) {
    if (prop.subtype === "visualAsset") {
      const asset = (worldData.visualAssets ?? []).find((entry) => entry.id === prop.visualAssetId);
      if (!asset) throw new Error(`Visual Asset ${prop.visualAssetId} not found for ${prop.id}`);
      if (asset.gameplay?.role === "harvestable" || asset.gameplay?.role === "wildkin") return;
      const scale = prop.uniformScale ?? 1;
      const position = { x: prop.pos.x, y: prop.pos.y ?? 0, z: prop.pos.z };
      const rotationY = prop.rotY ?? 0;
      const visibleInPlay = prop.visibleInPlay !== false;
      const collisionEnabled = prop.collisionEnabled !== false;
      const opacity = prop.opacity ?? 1;
      const root = addFactoryVisual({
        id: prop.id,
        visualRef: { kind: "asset", id: prop.visualAssetId },
        position,
        rotationY,
        options: { visualAssets: worldData.visualAssets ?? [], uniformScale: scale, sizeMode: "uniform" },
        metadata: {
          propId: prop.id,
          propSubtype: prop.subtype,
          visualAssetId: prop.visualAssetId,
          sectionId: currentSectionId,
          regionId: currentSectionId,
          visibleInPlay,
          collisionEnabled,
          opacity,
        },
      });
      applyFactoryPresentation(root, prop, visibleInPlay, opacity);
      const descriptor = describeVisualAssetCollider({
        collision: asset.collision,
        uniformScale: scale,
        position,
        rotationY,
        enabled: collisionEnabled,
      });
      if (descriptor.enabled && descriptor.shape === "box") {
        const center = getColliderCenter(descriptor);
        const w = descriptor.size.width;
        const height = descriptor.size.height;
        const d = descriptor.size.depth;
        const cos = Math.abs(Math.cos(rotationY));
        const sin = Math.abs(Math.sin(rotationY));
        const hx = cos * w / 2 + sin * d / 2;
        const hz = sin * w / 2 + cos * d / 2;
        obstacles.push({
          id: prop.id,
          sectionId: currentSectionId,
          regionId: currentSectionId,
          x: center.x,
          z: center.z,
          w,
          h: d,
          height,
          baseY: center.y - height / 2,
          rotY: rotationY,
          aabb: { minX: center.x - hx, maxX: center.x + hx, minZ: center.z - hz, maxZ: center.z + hz },
          visibleInPlay,
          collisionEnabled,
          opacity,
          visualAssetId: prop.visualAssetId,
        });
      }
      return;
    }
    // Use canonical descriptor for rectangular statics where applicable
    let desc = null;
    try{
      desc = normalizeStaticDescriptor({ id: prop.id, pos: prop.pos, size: prop.size || {w:1,h:1,d:1}, rotY: prop.rotY, visibleInPlay: prop.visibleInPlay, collisionEnabled: prop.collisionEnabled, opacity: prop.opacity, color: prop.color ?? prop.tint }, "props");
    }catch(e){}
    const pos = desc ? desc.position : prop.pos;
    const baseY = desc ? desc.baseY : (pos.y ?? 0);
    const size = desc ? desc.size : (prop.size || { w: 1, h: 1, d: 1 });
    const w = desc ? desc.size.width : (size.w ?? size.x ?? 1);
    const h = desc ? desc.size.height : (size.h ?? size.y ?? 1);
    const d = desc ? desc.size.depth : (size.d ?? size.z ?? 1);
    const height = h;
    const rotY = desc ? desc.rotationY : (prop.rotY ?? 0);
    const visibleInPlay = desc ? desc.visibleInPlay : (prop.visibleInPlay !== undefined ? !!prop.visibleInPlay : true);
    const collisionEnabled = desc ? desc.collisionEnabled : (prop.collisionEnabled !== undefined ? !!prop.collisionEnabled : true);
    const opacity = desc ? desc.opacity : (prop.opacity ?? 1);
    const subtype = prop.subtype || "box";
    const visualSubtype = ["box", "fence", "gate", "forestBoundary", "water", "island", "dropPod", "resonator"].includes(subtype) ? subtype : "box";
    const root = addFactoryVisual({
      id: prop.id,
      visualId: `prop/${visualSubtype}`,
      size: { width: w, height, depth: d, w, h: height, d },
      position: { x: pos.x, y: baseY, z: pos.z },
      rotationY: rotY,
      metadata: { propId: prop.id, propSubtype: subtype, baseY, visibleInPlay, collisionEnabled, opacity },
    });
    applyFactoryPresentation(root, prop, visibleInPlay, opacity);
    if (subtype === "forestBoundary") root.traverse((object) => { if (object.isMesh) object.userData.isForestBoundary = true; });

    const isWater = subtype === "water";
    if (isWater) {
      // water no collision regardless
      if (!visibleInPlay) {
        // proxy for hidden water? water hidden still needs proxy? Provide
        root.visible = false;
      }
      return;
    }

    const blockingSubtypes = new Set(["fence", "gate", "box", "forestBoundary", "boundary", "obstacle", "barrier", "dropPod", "resonator"]);
    const isBlocking = blockingSubtypes.has(subtype) || prop.blocking === true;
    if (isBlocking) {
      // Gate truthful collision: if gate collisionEnabled true (closed), create collider
      if (!collisionEnabled) return;
      const rot = rotY ?? 0;
      const cos = Math.abs(Math.cos(rot)), sin = Math.abs(Math.sin(rot));
      const halfW = w/2, halfD = d/2;
      const hx = cos*halfW + sin*halfD;
      const hz = sin*halfW + cos*halfD;
      obstacles.push({ id: prop.id, sectionId: currentSectionId, regionId: currentSectionId, x: pos.x, z: pos.z, w, h: d, height, baseY, rotY: rot, aabb: { minX: pos.x - hx, maxX: pos.x + hx, minZ: pos.z - hz, maxZ: pos.z + hz }, visibleInPlay, collisionEnabled, opacity });
    } else {
      if (!collisionEnabled) return;
      // non-blocking but collisionEnabled true? If subtype not blocking but collisionEnabled true, still add? That's unusual but allow as generic collider
      if (collisionEnabled && !isBlocking) {
        // treat as blocker if explicitly enabled?
        // For decoration like box with collisionEnabled false -> no collider; if true -> collider
        // We already handled blocking set, now include generic? Simpler: if collisionEnabled and not water/gate, add collider
        // But to avoid adding for every deco, we already gate via blocking check; if you want invisible collider you should use Boundary type.
      }
    }
  }

  function addGroundPatch(patch) {
    let desc=null;
    try{ desc = normalizeStaticDescriptor({ id: patch.id, pos: patch.pos, size: patch.size, rotY: patch.rotY, visibleInPlay: patch.visibleInPlay, collisionEnabled: patch.collisionEnabled, opacity: patch.opacity, color: patch.color }, "groundPatches"); }catch(e){}
    const pos = desc ? desc.position : patch.pos;
    const size = desc ? desc.size : patch.size;
    const w = desc ? desc.size.width : size.w, h = desc ? desc.size.height : size.h, d = desc ? desc.size.depth : size.d;
    const rotY = desc ? desc.rotationY : (patch.rotY ?? 0);
    const visibleInPlay = desc ? desc.visibleInPlay : (patch.visibleInPlay !== false);
    const collisionEnabled = desc ? desc.collisionEnabled : (patch.collisionEnabled !== false);
    const opacity = desc ? desc.opacity : (patch.opacity ?? 1);
    const color = parseColor(desc ? desc.color : patch.color, 0x7bb26a);
    const baseY = pos.y ?? -0.25;
    const root = addFactoryVisual({
      id: patch.id,
      visualId: "groundPatch",
      size: { width: w, height: h, depth: d, w, h, d },
      position: { x: pos.x, y: baseY, z: pos.z },
      rotationY: rotY,
      metadata: { groundPatchId: patch.id, visibleInPlay, collisionEnabled },
    });
    applyFactoryPresentation(root, patch, visibleInPlay, opacity);
    applyTerrainSurface(root, { width: w, depth: d, position: pos });

    const cos = Math.abs(Math.cos(rotY)), sin = Math.abs(Math.sin(rotY));
    const hx = cos * w / 2 + sin * d / 2;
    const hz = sin * w / 2 + cos * d / 2;
    const aabb = { minX: pos.x - hx, maxX: pos.x + hx, minZ: pos.z - hz, maxZ: pos.z + hz };
    groundPatches.push({ id: patch.id, sectionId: currentSectionId, regionId: currentSectionId, x: pos.x, y: baseY, z: pos.z, w, h, d, rotY, color, opacity, visibleInPlay, collisionEnabled, aabb });

    if (collisionEnabled) {
      // Add to obstacles as flat platform? For physics we will create collider separately in createPhysicsWorld via playground.groundPatches
      obstacles.push({ id: patch.id, sectionId: currentSectionId, regionId: currentSectionId, x: pos.x, z: pos.z, w, h: d, height: h, baseY, rotY, aabb, isGround: true, visibleInPlay, collisionEnabled });
    }
  }

  function addBoundaryCollider(bc) {
    // Use canonical descriptor: pos.y is base
    const desc = normalizeStaticDescriptor({ id: bc.id, pos: bc.pos, size: bc.size, rotY: bc.rotY, visibleInPlay: bc.visibleInPlay, collisionEnabled: bc.collisionEnabled, opacity: bc.opacity, color: bc.color }, "boundaryColliders");
    const pos = bc.pos;
    const size = bc.size;
    const w = size.w, h = size.h, d = size.d;
    const rotY = desc.rotationY;
    const visibleInPlay = desc.visibleInPlay;
    const collisionEnabled = desc.collisionEnabled;
    const opacity = bc.opacity ?? 0.5;
    const color = parseColor(bc.color, 0x5a6a7a);
    const root = addFactoryVisual({
      id: bc.id,
      visualId: "boundaryCollider",
      size: { width: w, height: h, depth: d, w, h, d },
      position: { x: pos.x, y: desc.baseY, z: pos.z },
      rotationY: rotY,
      metadata: { boundaryId: bc.id, visibleInPlay, collisionEnabled },
    });
    applyFactoryPresentation(root, bc, visibleInPlay, opacity);
    boundaries.push({ id: bc.id, sectionId: currentSectionId, regionId: currentSectionId, x: pos.x, y: desc.baseY, z: pos.z, w, h, d, rotY, color, opacity, visibleInPlay, collisionEnabled });

    if (collisionEnabled) {
      const rot = rotY;
      const cos = Math.abs(Math.cos(rot)), sin = Math.abs(Math.sin(rot));
      const hx = cos*(w/2) + sin*(d/2);
      const hz = sin*(w/2) + cos*(d/2);
      const height = h;
      const baseY2 = desc.baseY;
      obstacles.push({ id: bc.id, sectionId: currentSectionId, regionId: currentSectionId, x: pos.x, z: pos.z, w, h: d, height, baseY: baseY2, rotY: rot, isBoundary: true, aabb: { minX: pos.x - hx, maxX: pos.x + hx, minZ: pos.z - hz, maxZ: pos.z + hz }, visibleInPlay, collisionEnabled });
    }
  }

  // Per-region build
  const regions = worldData?.regions ?? [];
  // Determine if any ground patches exist globally; if none, fallback to old global ground for legacy tests
  let hasAuthoredGround = false;
  for (const r of regions) if (r.surface || r.groundPatches?.length > 0) hasAuthoredGround = true;
  if (!hasAuthoredGround) {
    // Legacy fallback: global floor as before (for tests without groundPatches)
    const groundGeo = new THREE.BoxGeometry(26, 0.5, 24);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x7bb26a, flatShading: true, roughness: 0.95 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    applyTerrainSurface(ground, { width: 26, depth: 24, position: { x: 0, z: 0 } });
    ground.position.set(0, -0.25, 0);
    ground.name = "legacy_ground";
    group.add(ground);
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x5f8a52, flatShading: true });
    const edge = new THREE.Mesh(new THREE.BoxGeometry(27, 0.25, 25), edgeMat);
    edge.position.y = -0.58;
    edge.name = "legacy_edge";
    group.add(edge);
  } else {
    // Safety floor far below gameplay (not walkable when ground deleted)
    const safetyGeo = new THREE.BoxGeometry(60, 1, 60);
    const safetyMat = new THREE.MeshBasicMaterial({ color: 0x0e1420, transparent: true, opacity: 0.0 });
    const safety = new THREE.Mesh(safetyGeo, safetyMat);
    safety.position.set(0, -30, 0);
    safety.name = "safety_floor";
    safety.visible = false;
    safety.userData.isSafetyFloor = true;
    group.add(safety);
  }

  for (const region of regions) {
    currentSectionId = region.id;
    currentSectionGroup = new THREE.Group();
    currentSectionGroup.name = `section_${region.id}`;
    currentSectionGroup.userData.sectionId = region.id;
    group.add(currentSectionGroup);
    sectionGroups.set(region.id, currentSectionGroup);
    // Ground patches (authored)
    if (region.surface) {
      const terrain = createAuthoredTerrain(region);
      currentSectionGroup.add(terrain.group);
      terrainSurfaces.push(terrain);
    }
    for (const gp of region.groundPatches ?? []) {
      // A region's continuous surface replaces its former flat base only.
      if (!region.surface) addGroundPatch(gp);
    }
    // Props
    for (const prop of region.props ?? []) {
      addPropMesh(prop);
    }
    // Boundary colliders (authored)
    for (const bc of region.boundaryColliders ?? []) {
      addBoundaryCollider(bc);
    }

    // Traversal platforms — baseY from plat.y / plat.baseY / pos.y (authored elevation)
    for (const plat of region.traversal?.platforms ?? []) {
      const baseY = plat.baseY ?? plat.y ?? (plat.pos?.y) ?? 0;
      const rotY = plat.rotY ?? 0;
      addFactoryVisual({
        id: plat.id,
        visualId: "traversal/platform",
        size: { w: plat.w, h: plat.h, height: plat.height },
        position: { x: plat.x, y: baseY, z: plat.z },
        rotationY: rotY,
        metadata: { platformId: plat.id, regionId: region.id, baseY },
      });
      const cos = Math.abs(Math.cos(rotY)), sin = Math.abs(Math.sin(rotY));
      const hx = cos * plat.w / 2 + sin * plat.h / 2;
      const hz = sin * plat.w / 2 + cos * plat.h / 2;
      const aabb = { minX: plat.x - hx, maxX: plat.x + hx, minZ: plat.z - hz, maxZ: plat.z + hz };
      platforms.push({ id: plat.id, sectionId: region.id, x: plat.x, z: plat.z, w: plat.w, h: plat.h, height: plat.height, baseY, rotY, aabb, regionId: region.id });
    }

    // Traversal obstacles — support authored Y
    for (const obs of region.traversal?.obstacles ?? []) {
      const baseY = obs.baseY ?? obs.y ?? (obs.pos?.y) ?? 0;
      const h = obs.height ?? 1.0;
      const rotY = obs.rotY ?? 0;
      addFactoryVisual({
        id: obs.id,
        visualId: "traversal/obstacle",
        size: { w: obs.w, h: obs.h, height: h },
        position: { x: obs.x, y: baseY, z: obs.z },
        rotationY: rotY,
        metadata: { baseY },
      });
      const cos = Math.abs(Math.cos(rotY)), sin = Math.abs(Math.sin(rotY));
      const hx = cos * obs.w / 2 + sin * obs.h / 2;
      const hz = sin * obs.w / 2 + cos * obs.h / 2;
      obstacles.push({ id: obs.id, sectionId: region.id, regionId: region.id, x: obs.x, z: obs.z, w: obs.w, h: obs.h, height: h, baseY, rotY, aabb: { minX: obs.x - hx, maxX: obs.x + hx, minZ: obs.z - hz, maxZ: obs.z + hz } });
    }

    // Climbables
    for (const cl of region.traversal?.climbables ?? []) {
      addFactoryVisual({
        id: cl.id,
        visualId: "traversal/ladder",
        size: { width: cl.w, height: cl.topY - cl.bottomY, depth: cl.h },
        position: { x: cl.x, y: cl.bottomY, z: cl.z },
        rotationY: cl.rotY ?? 0,
        metadata: { climbableId: cl.id },
      });
      climbables.push({ ...cl, sectionId: region.id, regionId: region.id });
    }

    // Jump traversals — data only, but add gap markers for visibility
    for (const jt of region.traversal?.jumpTraversals ?? []) {
      jumpTraversals.push({ ...jt, sectionId: region.id, regionId: region.id });
      const gapGeo = new THREE.BoxGeometry(Math.max(1.2, jt.triggerRadius * 1.2), 0.02, Math.max(1.2, jt.triggerRadius * 1.2));
      const gapMat = new THREE.MeshStandardMaterial({ color: 0x4a6a3a, transparent: true, opacity: 0.35 });
      const gap = new THREE.Mesh(gapGeo, gapMat);
      gap.position.set(jt.triggerCenter.x, -0.12, jt.triggerCenter.z);
      gap.name = jt.id;
      gap.userData.sectionId = region.id;
      gap.userData.regionId = region.id;
      currentSectionGroup.add(gap);
    }

    // Anchors & POIs placeholders — support authored Y and displayName
    for (const wp of region.majorWaypoints ?? []) {
      const baseY = wp.pos.y ?? 0;
      addFactoryVisual({
        id: wp.id,
        visualRef: wp.visualAssetId ? { kind: "asset", id: wp.visualAssetId } : { kind: "builtin", id: "anchor/waypoint" },
        position: { x: wp.pos.x, y: baseY, z: wp.pos.z },
        rotationY: wp.rotY ?? 0,
        options: { visualAssets: worldData.visualAssets ?? [], uniformScale: wp.uniformScale ?? 1, sizeMode: "uniform" },
        metadata: { anchorId: wp.id, anchorType: wp.type, baseY, displayName: wp.displayName, visualAssetId: wp.visualAssetId ?? null },
      });
    }
    for (const bc of region.extractionBeacons ?? []) {
      const baseY = bc.pos.y ?? 0;
      addFactoryVisual({
        id: bc.id,
        visualRef: bc.visualAssetId ? { kind: "asset", id: bc.visualAssetId } : { kind: "builtin", id: "anchor/beacon" },
        position: { x: bc.pos.x, y: baseY, z: bc.pos.z },
        rotationY: bc.rotY ?? 0,
        options: { visualAssets: worldData.visualAssets ?? [], uniformScale: bc.uniformScale ?? 1, sizeMode: "uniform" },
        metadata: { anchorId: bc.id, anchorType: bc.type, baseY, displayName: bc.displayName, visualAssetId: bc.visualAssetId ?? null },
      });
    }
    for (const poi of region.pois ?? []) {
      if (poi.type === "pond" || poi.type === "water") { continue; }
      const baseY = poi.pos.y ?? 0;
      const visualType = poi.type === "chest" || poi.type === "barrier" ? poi.type : "generic";
      addFactoryVisual({
        id: poi.id,
        visualId: `poi/${visualType}`,
        position: { x: poi.pos.x, y: baseY, z: poi.pos.z },
        rotationY: poi.rotY ?? 0,
        options: { poiType: poi.type, requires: poi.requires ?? null },
        metadata: { poiId: poi.id, poiType: poi.type, baseY, displayName: poi.displayName ?? poi.type },
      });
    }

    // Entry Points and course bounds remain editor-only. Gates, pads, and
    // Parkour markers use the same player-facing resolvers as Author.
    for (const gate of region.portalGates ?? []) {
      const resolved = resolvePortalGateVisual(gate, gate.state, worldData.visualAssets ?? []);
      const root = addFactoryVisual({
        id: gate.id,
        visualRef: resolved.visualRef,
        size: resolved.size,
        position: gate.pos,
        rotationY: gate.rotY ?? 0,
        options: { visualAssets: worldData.visualAssets ?? [], uniformScale: gate.uniformScale ?? 1, sizeMode: resolved.sizeMode },
        metadata: { portalGateId: gate.id, portalState: resolved.effectiveState, visibleInPlay: true, collisionEnabled: false },
      });
      portalVisualRoots.set(gate.id, root);
    }
    for (const pad of region.jumpPads ?? []) {
      const resolved = resolveJumpPadVisual(pad, worldData.visualAssets ?? []);
      addFactoryVisual({
        id: pad.id,
        visualRef: resolved.visualRef,
        size: resolved.size,
        position: pad.pos,
        rotationY: pad.rotY ?? 0,
        options: { visualAssets: worldData.visualAssets ?? [], uniformScale: pad.uniformScale ?? 1, sizeMode: resolved.sizeMode, triggerRadius: pad.triggerRadius, powerPreset: pad.powerPreset },
        metadata: { jumpPadId: pad.id, visibleInPlay: true, collisionEnabled: false },
      });
    }
    for (const [collection, kind] of [[region.parkourStarts, "start"], [region.parkourCheckpoints, "checkpoint"], [region.parkourEnds, "end"]]) {
      for (const marker of collection ?? []) {
        const resolved = resolveParkourMarkerVisual(marker, kind, worldData.visualAssets ?? []);
        addFactoryVisual({
          id: marker.id,
          visualRef: resolved.visualRef,
          position: marker.pos,
          rotationY: marker.rotY ?? 0,
          options: { visualAssets: worldData.visualAssets ?? [], uniformScale: marker.uniformScale ?? 1, sizeMode: resolved.sizeMode, triggerRadius: marker.triggerRadius, markerKind: kind },
          metadata: { parkourMarkerId: marker.id, parkourMarkerKind: kind, courseId: marker.courseId, visibleInPlay: true, collisionEnabled: false },
        });
      }
    }
    for (const chest of region.lootChests ?? []) {
      addFactoryVisual({
        id: chest.id,
        visualRef: chest.visualAssetId ? { kind: "asset", id: chest.visualAssetId } : { kind: "builtin", id: "poi/chest" },
        position: chest.pos,
        rotationY: chest.rotY ?? 0,
        options: { visualAssets: worldData.visualAssets ?? [], uniformScale: chest.uniformScale ?? 1, sizeMode: "uniform" },
        metadata: { lootChestId: chest.id, visibleInPlay: true, collisionEnabled: false },
      });
    }
    for (const hazard of region.killVolumes ?? []) {
      addFactoryVisual({
        id: hazard.id,
        visualId: "hazard/thornbed",
        size: hazard.size,
        position: hazard.pos,
        rotationY: hazard.rotY ?? 0,
        metadata: { hazardId: hazard.id, courseId: hazard.courseId, visibleInPlay: true, collisionEnabled: false },
      });
    }
  }

  // Derived structures
  const platformSideColliders = platforms.map((p) => ({
    id: `side_${p.id}`,
    platformId: p.id,
    height: p.height,
    aabb: { ...p.aabb },
    w: p.w,
    h: p.h,
    x: p.x,
    z: p.z,
    sectionId: p.sectionId,
    regionId: p.regionId,
  }));

  function getGroundHeight(x, z, currentY) {
    const surface = regions.find(r => r.id === activeSectionId)?.surface;
    const terrainHeight = getSurfaceHeight(surface, x, z);
    const check = (p) => x >= p.aabb.minX && x <= p.aabb.maxX && z >= p.aabb.minZ && z <= p.aabb.maxZ;
    for (const p of platforms) {
      if (activeSectionId && p.sectionId !== activeSectionId) continue;
      if (!check(p)) continue;
      if (currentY === undefined || currentY === null) {
        return p.baseY + p.height;
      } else {
        const threshold = p.baseY + p.height - 0.45;
        if (currentY < threshold) return terrainHeight;
      }
      return p.baseY + p.height;
    }
    return terrainHeight;
  }

  function getCollisionObstaclesForHeight(posY) {
    const active = obstacles.filter((entry) => !activeSectionId || entry.sectionId === activeSectionId);
    for (const c of platformSideColliders) {
      if (activeSectionId && c.sectionId !== activeSectionId) continue;
      const threshold = c.height - 0.18;
      if (posY < threshold) active.push(c);
    }
    return active;
  }

  function resolveStuckPosition(pos, radius, posY) {
    const active = getCollisionObstaclesForHeight(posY);
    for (const c of active) {
      if (!c.id || !c.id.startsWith("side_")) continue;
      const closestX = Math.max(c.aabb.minX, Math.min(pos.x, c.aabb.maxX));
      const closestZ = Math.max(c.aabb.minZ, Math.min(pos.z, c.aabb.maxZ));
      const dx = pos.x - closestX;
      const dz = pos.z - closestZ;
      if (dx * dx + dz * dz < radius * radius - 1e-6) {
        const distX = Math.min(Math.abs(pos.x - c.aabb.minX), Math.abs(pos.x - c.aabb.maxX));
        const distZ = Math.min(Math.abs(pos.z - c.aabb.minZ), Math.abs(pos.z - c.aabb.maxZ));
        const push = radius + 0.08;
        if (distX < distZ) {
          pos.x = pos.x < c.x ? c.aabb.minX - push : c.aabb.maxX + push;
        } else {
          pos.z = pos.z < c.z ? c.aabb.minZ - push : c.aabb.maxZ + push;
        }
        return true;
      }
    }
    return false;
  }

  function isBlockedByPlatformSide(x, z, radius, posY) {
    const colliders = getCollisionObstaclesForHeight(posY).filter((o) => o.id && o.id.startsWith("side_"));
    for (const c of colliders) {
      const closestX = Math.max(c.aabb.minX, Math.min(x, c.aabb.maxX));
      const closestZ = Math.max(c.aabb.minZ, Math.min(z, c.aabb.maxZ));
      const dx = x - closestX;
      const dz = z - closestZ;
      if (dx * dx + dz * dz < radius * radius) return true;
    }
    return false;
  }

  const jumpLinks = jumpTraversals.map((t) => ({
    id: t.id,
    start: { ...t.triggerCenter },
    end: {
      x: (t.landingRegion.minX + t.landingRegion.maxX) / 2,
      z: (t.landingRegion.minZ + t.landingRegion.maxZ) / 2,
    },
    radius: t.triggerRadius,
    direction: { ...t.direction },
    heightStart: platforms.find((p) => p.id === t.landingPlatformId)?.height ?? 1.25,
    heightEnd: t.landingRegion.height,
  }));

  function setActiveSection(sectionId) {
    if (activeSectionId === sectionId) return { changed: false, sectionId };
    activeSectionId = sectionId;
    for (const [id, sectionGroup] of sectionGroups) sectionGroup.visible = id === sectionId;
    return { changed: true, sectionId };
  }

  function refreshPortalGateVisual(gateId, effectiveState) {
    const gate = regions.flatMap((section) => section.portalGates ?? []).find((entry) => entry.id === gateId);
    const oldRoot = portalVisualRoots.get(gateId);
    if (!gate || !oldRoot?.parent) return null;
    const parent = oldRoot.parent;
    const resolved = resolvePortalGateVisual(gate, effectiveState, worldData.visualAssets ?? []);
    const previousSectionId = currentSectionId;
    const previousGroup = currentSectionGroup;
    currentSectionId = oldRoot.userData.sectionId;
    currentSectionGroup = parent;
    parent.remove(oldRoot);
    disposeFactoryRoot(oldRoot);
    const root = addFactoryVisual({
      id: gate.id,
      visualRef: resolved.visualRef,
      size: resolved.size,
      position: gate.pos,
      rotationY: gate.rotY ?? 0,
      options: { visualAssets: worldData.visualAssets ?? [], uniformScale: gate.uniformScale ?? 1, sizeMode: resolved.sizeMode },
      metadata: { portalGateId: gate.id, portalState: resolved.effectiveState, visibleInPlay: true, collisionEnabled: false },
    });
    portalVisualRoots.set(gateId, root);
    currentSectionId = previousSectionId;
    currentSectionGroup = previousGroup;
    return root;
  }

  return {
    group,
    obstacles,
    platforms,
    platformSideColliders,
    jumpLinks,
    jumpTraversals,
    climbables,
    groundPatches,
    terrainSurfaces,
    boundaries,
    sectionGroups,
    setActiveSection,
    refreshPortalGateVisual,
    getActiveSectionId: () => activeSectionId,
    getGroundHeight,
    getCollisionObstaclesForHeight,
    resolveStuckPosition,
    isBlockedByPlatformSide,
    getBoundsForSection: (sectionId) => {
      const section = regions.find((entry) => entry.id === sectionId);
      return section ? { ...section.bounds } : null;
    },
    get bounds() { return regions.find((entry) => entry.id === activeSectionId)?.bounds ?? MOVEMENT_CONFIG.worldBounds; },
  };
}
