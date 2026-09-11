// src/world/visualFactory.js — pure deterministic visual constructors (Phase 4A.2.2)
// Shared by Author Edit and Runtime Play. Must be side-effect free:
// - returns local-space THREE.Object3D (Group or Mesh), NOT added to scene
// - no Rapier bodies, no AI, no timers, no DOM, no private rAF
// - deterministic for same objectId/data

import * as THREE from "three";
import { createHarvestTree, createHarvestRock, createHarvestFiber, createOutpostFence, createNavigationPillar, createExtractionBeacon, createCrystalResonator, createMasonryPlatform, createTrailMarker } from './runtimePropMeshKit.js';
import { createFrontierPropMeshVisual } from './frontierPropMeshKit.js';
import { createLandmarkMeshVisual } from './landmarkMeshKit.js';
import { createWildkinMeshVisual } from './wildkinMeshKit.js';
import { createThornBedVisual } from "./hazardVisual.js";
import { createExternalModelVisual, getModelTemplate } from "../assets/modelAssetRuntime.js";
import { SAPWOOD_VISUAL_ASSET } from "../resources/resourceConfig.js";

// Simple deterministic RNG based on string seed
function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRng(objectId, salt = "") {
  const seed = hashString(`${objectId}::${salt}`);
  return mulberry32(seed);
}

// Helpers to create shared materials (cloned per visual if needed)
function matStandard(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.92, metalness: 0, ...opts });
}
function matBasic(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color, ...opts });
}

// --- Performance caches (Step 1a) — shared unit geometries & deterministic recipe hashing ---
const _assetGeoCache = new Map();
const _cachedGeoSet = new WeakSet();
const _matCache = new Map();

// Exposed for tests / debug only — not gameplay API
export function __getAssetGeoCacheSize(){ return _assetGeoCache.size; }
export function clearVisualFactoryCaches(){ _assetGeoCache.clear(); _matCache.clear(); }

function getCachedAssetGeometry(shape){
  if(_assetGeoCache.has(shape)) return _assetGeoCache.get(shape);
  let geo;
  if (shape === "box") geo = new THREE.BoxGeometry(1, 1, 1);
  else if (shape === "cylinder") geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  else if (shape === "cone") geo = new THREE.ConeGeometry(0.5, 1, 12);
  else if (shape === "sphere") geo = new THREE.SphereGeometry(0.5, 12, 8);
  else if (shape === "capsule") geo = new THREE.CapsuleGeometry(0.35, 0.3, 6, 10);
  else if (shape === "icosahedron") geo = new THREE.IcosahedronGeometry(0.5, 0);
  else throw new Error(`Unsupported Visual Asset shape ${shape}`);
  _assetGeoCache.set(shape, geo);
  _cachedGeoSet.add(geo);
  geo.userData = geo.userData || {};
  geo.userData.isSharedAssetGeometry = true;
  return geo;
}
function isCachedGeometry(geo){ return _cachedGeoSet.has(geo); }

function getAuthoredMeshGeometry(part) {
  // The cache is content-addressed; changing an authored mesh cannot leave a
  // stale visual in preview, bounds fitting, runtime or exported worlds.
  const key=`mesh:${JSON.stringify(part.geometry)}`;
  if(_assetGeoCache.has(key))return _assetGeoCache.get(key);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(part.geometry.positions,3));
  geometry.setIndex(part.geometry.indices);geometry.computeVertexNormals();
  geometry.userData.isSharedAssetGeometry=true;
  _assetGeoCache.set(key,geometry);_cachedGeoSet.add(geometry);
  return geometry;
}

function getCachedStandardMaterial(color, optsKey = "", options = {}) {
  const key = `${String(color)}::${optsKey}`;
  if(_matCache.has(key)) return _matCache.get(key);
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.92, metalness: 0, ...options });
  mat.userData = mat.userData || {};
  mat.userData.isSharedAssetMaterial = true;
  // optsKey is hash of opts; for asset parts opts is constant, so cache hit
  _matCache.set(key, mat);
  return mat;
}

// ---- Pure visual constructors ----

export function createBoxVisual({ size = { w: 1, h: 1, d: 1 }, color = 0x9aa0a6 } = {}) {
  const w = size.w ?? size.width ?? 1;
  const h = size.h ?? size.height ?? 1;
  const d = size.d ?? size.depth ?? 1;
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, matStandard(color));
  // Local offset: box centered at height/2 above base (base at 0,0,0)
  mesh.position.set(0, h / 2 - 0.02, 0);
  mesh.name = "visual_box";
  const group = new THREE.Group();
  group.add(mesh);
  // expose meta for tests
  group.userData.visualKind = "prop/box";
  return group;
}

export function createFenceVisual({size}={}) { return createOutpostFence(size); }
export function createGateVisual({size}={}) {
  const group=createFrontierPropMeshVisual('asset_frontier_portal_outpost');
  group.userData.visualKind='prop/gate';return fitBuiltinModel(group,size,{width:2.2,height:2.25,depth:.5});
}
export function createForestBoundaryVisual({ size } = {}) {
  return createBoxVisual({ size, color: 0x2d4a2e });
}
export function createGroundVisual({ size, color = 0x7bb26a } = {}) {
  return createBoxVisual({ size, color });
}
export function createBoundaryVisual({ size, color = 0x5a6a7a } = {}) {
  // boundary also box but we keep same
  return createBoxVisual({ size, color });
}
export function createWaterVisual({ size } = {}) {
  const g = createBoxVisual({ size, color: 0x4a90a8 });
  // water is flat, make transparent
  for (const c of g.children) if (c.isMesh) { c.material.transparent = true; c.material.opacity = 0.55; c.position.y = -0.04; }
  g.userData.visualKind = "prop/water";
  return g;
}
export function createIslandVisual({ size } = {}) {
  return createBoxVisual({ size, color: 0xc2b280 });
}
function fitBuiltinModel(group,size,nativeSize) {
  group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(group),extent=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  const wrapper=new THREE.Group();wrapper.userData={...group.userData};group.position.sub(new THREE.Vector3(center.x,bounds.min.y,center.z));wrapper.add(group);
  return applyAuthoredBounds(wrapper,size??nativeSize,{width:extent.x,height:extent.y,depth:extent.z});
}
function applyAuthoredBounds(group, size, nativeSize) {
  if (!size) return group;
  const width = size.width ?? size.w ?? nativeSize.width;
  const height = size.height ?? size.h ?? nativeSize.height;
  const depth = size.depth ?? size.d ?? nativeSize.depth;
  group.scale.set(
    width / nativeSize.width,
    height / nativeSize.height,
    depth / nativeSize.depth,
  );
  // Authored root placement is applied later. Keep this geometry fit below it
  // so placement does not overwrite the constructor's dimensional transform.
  const root=new THREE.Group();root.userData={...group.userData};root.add(group);return root;
}

export function createDropPodVisual({size}={}) {
  const group=createFrontierPropMeshVisual('asset_drop_pod');
  group.userData.visualKind='prop/dropPod';return fitBuiltinModel(group,size,{width:2.1,height:1.72,depth:2.1});
}
export function createResonatorVisual({size}={}) { return applyAuthoredBounds(createCrystalResonator(),size,{width:1.9,height:1.35,depth:1.9}); }

export function createPlatformVisual({size={}}={}) { return createMasonryPlatform(size.w??size.width??3,size.height??1.25,size.h??size.depth??3); }
export function createObstacleVisual({size={}}={}) { return createMasonryPlatform(size.w??size.width??1.8,size.height??1,size.h??size.depth??1.8,{obstacle:true}); }

export function createLadderVisual({size={}}={}) { return createMasonryPlatform(size.width??size.w??1.9,size.height??2.4,size.depth??size.h??.5,{ladder:true}); }

// Resource visuals — deterministic variation based on objectId
export function createTreeVisual({objectId='tree_default'}={}) {
  if (getModelTemplate(SAPWOOD_VISUAL_ASSET.model.path)) {
    const root = createExternalModelVisual(SAPWOOD_VISUAL_ASSET);
    root.userData.visualKind = 'resource/tree';
    return root;
  }
  // Standalone recipe/test consumers can construct without browser preloading.
  return createHarvestTree(makeRng(objectId,'tree'));
}

export function createRockVisual({objectId='rock_default'}={}) { return createHarvestRock(makeRng(objectId,'rock')); }

export function createFiberVisual() { return createHarvestFiber(); }

export function createRusherVisual() {
  const group=createWildkinMeshVisual('asset_thornprowler');group.userData.visualKind='creature/rusher';return fitBuiltinModel(group,null,{width:.88,height:.86,depth:1.25});
}

export function createSpitterVisual() {
  const group=createWildkinMeshVisual('asset_wildkin_tidefin');group.userData.visualKind='creature/spitter';return fitBuiltinModel(group,null,{width:.8,height:1,depth:1.1});
}

export function createWaypointVisual() { return createNavigationPillar(); }

export function createBeaconVisual() { return createExtractionBeacon(); }

export function createPoiVisual({poiType='chest',requires=null}={}) {
  const model=poiType==='barrier'?createLandmarkMeshVisual('asset_vault_barrier'):createFrontierPropMeshVisual('asset_chest');
  const group=fitBuiltinModel(model,null,{width:.8,height:poiType==='barrier'?1.25:.65,depth:.8});
  if(requires){const lock=new THREE.Mesh(new THREE.OctahedronGeometry(.13),matBasic(0xffc267));lock.name='poi_lock';lock.position.set(0,(poiType==='barrier'?1.45:.85)/group.scale.y,0);group.add(lock);}
  group.userData.visualKind=`poi/${poiType}`;return group;
}

export function createSpawnMarkerVisual({ color = 0x7ab8ff } = {}) {
  const group = new THREE.Group();
  const capsuleGeo = new THREE.CapsuleGeometry(0.32, 0.4, 8, 12);
  const mat = matStandard(color, { emissive: color, emissiveIntensity: 0.18, transparent: true, opacity: 0.92 });
  const capsule = new THREE.Mesh(capsuleGeo, mat);
  capsule.position.y = 0.52;
  group.add(capsule);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 16), matBasic(color, { transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; group.add(ring);
  const arrowGeo = new THREE.ConeGeometry(0.18, 0.35, 8);
  const arrowMat = matStandard(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.2 });
  const arrow = new THREE.Mesh(arrowGeo, arrowMat);
  arrow.position.set(0, 0.12, 0.55);
  arrow.rotation.x = Math.PI / 2;
  group.add(arrow);
  const footGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.04, 12);
  const foot = new THREE.Mesh(footGeo, matBasic(color, { transparent: true, opacity: 0.28 }));
  foot.position.y = 0.02; group.add(foot);
  group.userData.visualKind = "spawn/marker";
  return group;
}

function createEditorRingMarker({ color, visualKind, arrow = false } = {}) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.52, 0.72, 20),
    matBasic(color, { transparent: true, opacity: 0.82, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8),
    matBasic(color, { transparent: true, opacity: 0.9 }),
  );
  post.position.y = 0.62;
  group.add(post);
  const cap = new THREE.Mesh(
    arrow ? new THREE.ConeGeometry(0.24, 0.46, 8) : new THREE.OctahedronGeometry(0.2, 0),
    matStandard(color, { emissive: color, emissiveIntensity: 0.35 }),
  );
  cap.position.set(0, arrow ? 0.24 : 1.3, arrow ? 0.72 : 0);
  if (arrow) cap.rotation.x = Math.PI / 2;
  group.add(cap);
  group.userData.visualKind = visualKind;
  group.userData.editorHelperOnly = true;
  return group;
}

export function createEntryPointHelperVisual() {
  return createEditorRingMarker({ color: 0x9be7ff, visualKind: "editor/entry-point", arrow: true });
}
export function createParkourStartHelperVisual() {
  return createEditorRingMarker({ color: 0x35f2c0, visualKind: "editor/parkour-start" });
}
export function createParkourCheckpointHelperVisual() {
  return createEditorRingMarker({ color: 0x4fa3ff, visualKind: "editor/parkour-checkpoint" });
}
export function createParkourEndHelperVisual() {
  return createEditorRingMarker({ color: 0xffd54f, visualKind: "editor/parkour-end" });
}
export function createKillVolumeHelperVisual({ size = { width: 1, height: 1, depth: 1 } } = {}) {
  const width = size.width ?? size.w ?? 1;
  const height = size.height ?? size.h ?? 1;
  const depth = size.depth ?? size.d ?? 1;
  const group = new THREE.Group();
  const volume = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    matBasic(0xff2f3d, { transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide }),
  );
  volume.position.y = 0;
  group.add(volume);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(volume.geometry),
    new THREE.LineBasicMaterial({ color: 0xff6470, transparent: true, opacity: 0.95 }),
  );
  edges.position.copy(volume.position);
  group.add(edges);
  group.userData.visualKind = "editor/kill-volume";
  group.userData.editorHelperOnly = true;
  return group;
}

export function createParkourCourseZoneHelperVisual({ size = { width: 1, height: 1, depth: 1 } } = {}) {
  const group = createKillVolumeHelperVisual({ size });
  group.traverse((object) => {
    if (!object.material?.color) return;
    object.material = object.material.clone();
    object.material.color.setHex(0x39bde8);
    object.material.opacity = object.material.wireframe ? 0.78 : 0.14;
  });
  group.userData.parkourCourseZone = true;
  return group;
}

function createJumpPadBuiltinVisual(opts = {}) {
  const radius = Math.max(0.65, Number(opts.triggerRadius) || 1.1);
  const group = new THREE.Group();
  const color = opts.powerPreset === "low" ? 0x69d98a : opts.powerPreset === "high" ? 0xff8a5b : 0x6de5ef;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.22, 20), matStandard(0x263746, { roughness: 0.92 }));
  base.position.y = 0.11;
  group.add(base);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.78, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.78, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.235;
  group.add(ring);
  const trigger = new THREE.Mesh(new THREE.RingGeometry(Math.max(0.05, radius - 0.035), radius, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
  trigger.rotation.x = -Math.PI / 2;
  trigger.position.y = 0.04;
  group.add(trigger);
  return group;
}

function createParkourMarkerBuiltinVisual(opts={}) {
  const group=createTrailMarker({...opts,markerKind:opts.markerKind??'start'});
  group.getObjectByName('parkour_marker_ring').userData.parkourTriggerRing=true;
  return group;
}

export const VISUAL_ASSET_SHAPES = Object.freeze([
  "box",
  "cylinder",
  "cone",
  "sphere",
  "capsule",
  "icosahedron",
]);

function createAssetPartGeometry(shape) {
  return getCachedAssetGeometry(shape);
}
// Keep original non-cached creator for explicit disposal paths (bounds calc)
function createAssetPartGeometryUncached(shape) {
  if (shape === "box") return new THREE.BoxGeometry(1, 1, 1);
  if (shape === "cylinder") return new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  if (shape === "cone") return new THREE.ConeGeometry(0.5, 1, 12);
  if (shape === "sphere") return new THREE.SphereGeometry(0.5, 12, 8);
  if (shape === "capsule") return new THREE.CapsuleGeometry(0.35, 0.3, 6, 10);
  if (shape === "icosahedron") return new THREE.IcosahedronGeometry(0.5, 0);
  throw new Error(`Unsupported Visual Asset shape ${shape}`);
}

export function findVisualAsset(visualAssets, assetId) {
  return (visualAssets ?? []).find((asset) => asset.id === assetId) ?? null;
}

export function createVisualAssetVisual(asset) {
  if (!asset) throw new Error("Visual Asset recipe is required");
  if (asset.model) {
    const model = createExternalModelVisual(asset);
    model.userData.visualKind = `asset/${asset.id}`;
    model.userData.visualAssetId = asset.id;
    return model;
  }
  const group = new THREE.Group();
  group.userData.visualKind = `asset/${asset.id}`;
  group.userData.visualAssetId = asset.id;
  for (const part of asset.parts ?? []) {
    const geometry = part.shape === 'mesh' ? getAuthoredMeshGeometry(part) : getCachedAssetGeometry(part.shape);
    // Asset recipes stay matte by default; parts retain authored roughness and side.
    const style={flatShading:part.flatShading??true,roughness:part.roughness??.92,metalness:0,side:part.side??THREE.FrontSide};
    const material = getCachedStandardMaterial(part.color, JSON.stringify(style), style);
    const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `${asset.id}:${part.id}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    mesh.position.set(part.position.x, part.position.y, part.position.z);
    mesh.rotation.set(part.rotation.x, part.rotation.y, part.rotation.z, "XYZ");
    mesh.scale.set(part.scale.x, part.scale.y, part.scale.z);
    mesh.userData.assetPartId = part.id;
    mesh.userData.visualAssetId = asset.id;
    group.add(mesh);
  }
  return group;
}

export function computeVisualAssetBounds(asset) {
  // Use cached geometries — do not dispose shared buffers
  const root = createVisualAssetVisual(asset);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  if (bounds.isEmpty()) {
    // No disposal of cached geometry/material — just drop the transient group
    root.clear();
    throw new Error(`Visual Asset ${asset?.id ?? "unknown"} has no visual bounds`);
  }
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  root.clear();
  return {
    offset: { x: center.x, y: center.y, z: center.z },
    size: { w: size.x, h: size.y, d: size.z },
  };
}

// Map VisualRef to constructor
const BUILTIN_MAP = {
  "prop/box": createBoxVisual,
  "prop/fence": createFenceVisual,
  "prop/gate": createGateVisual,
  "prop/forestBoundary": createForestBoundaryVisual,
  "prop/water": createWaterVisual,
  "prop/island": createIslandVisual,
  "prop/dropPod": createDropPodVisual,
  "prop/resonator": createResonatorVisual,
  "groundPatch": createGroundVisual,
  "boundaryCollider": createBoundaryVisual,
  "traversal/platform": createPlatformVisual,
  "traversal/obstacle": createObstacleVisual,
  "traversal/ladder": createLadderVisual,
  "resource/tree": createTreeVisual,
  "resource/rock": createRockVisual,
  "resource/fiber": createFiberVisual,
  "creature/rusher": createRusherVisual,
  "creature/spitter": createSpitterVisual,
  "anchor/waypoint": createWaypointVisual,
  "anchor/beacon": createBeaconVisual,
  "poi/chest": createPoiVisual,
  "poi/barrier": createPoiVisual,
  "poi/generic": createPoiVisual,
  "spawn/marker": createSpawnMarkerVisual,
  "editor/entry-point": createEntryPointHelperVisual,
  "editor/parkour-start": createParkourStartHelperVisual,
  "editor/parkour-checkpoint": createParkourCheckpointHelperVisual,
  "editor/parkour-end": createParkourEndHelperVisual,
  "editor/kill-volume": createKillVolumeHelperVisual,
  "hazard/thornbed": createThornBedVisual,
  "editor/parkour-course-zone": createParkourCourseZoneHelperVisual,
  "traversal/jump-pad": createJumpPadBuiltinVisual,
  "parkour/start": createParkourMarkerBuiltinVisual,
  "parkour/checkpoint": createParkourMarkerBuiltinVisual,
  "parkour/end": createParkourMarkerBuiltinVisual,
};

export function resolveVisualRef(visualRef) {
  if (!visualRef || typeof visualRef !== "object") return null;
  if (visualRef.kind === "builtin") {
    return BUILTIN_MAP[visualRef.id] ?? null;
  }
  return null;
}

export function createVisual(visualRef, opts = {}) {
  if (visualRef?.kind === "asset") {
    const asset = findVisualAsset(opts.visualAssets, visualRef.id);
    if (!asset) throw new Error(`Visual Asset ${visualRef.id} not found`);
    return createVisualAssetVisual(asset);
  }
  const ctor = resolveVisualRef(visualRef);
  if (!ctor) {
    // fallback simple box for unknown
    const g = createBoxVisual({ size: { w: 1, h: 1, d: 1 }, color: 0x9aa0a6 });
    g.userData.visualKind = visualRef?.id ?? "unknown";
    g.userData.fallback = true;
    return g;
  }
  // Deterministic: forward objectId for variation and size where applicable
  const args = { ...opts, objectId: opts.objectId ?? "unknown" };
  if (opts.size) args.size = opts.size;
  // For poi generic, forward poiType
  if (visualRef.id.startsWith("poi/") && opts.poiType) args.poiType = opts.poiType;
  return ctor(args);
}

function stableRecipeValue(value) {
  if (Array.isArray(value)) return value.map(stableRecipeValue);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = stableRecipeValue(value[key]);
    return out;
  }
  return value;
}

// Fast hashed recipe key — stable, deterministic, distinguishes asset edits without deep stringify each frame
const _recipeKeyCache = new Map();
const _immutableAssetHashes = new WeakMap();
const _RECIPE_KEY_CACHE_LIMIT = 256;
function hashStable(value){
  // Use hashString on sorted JSON for assetRecipe only; small fields stay inline
  try { return String(hashString(JSON.stringify(stableRecipeValue(value)))); } catch { return String(Math.random()).slice(2); }
}
export function getVisualRecipeKey(visualRef, opts = {}) {
  if (visualRef?.kind === "asset") {
    const asset = findVisualAsset(opts.visualAssets, visualRef.id);
    // hash asset recipe if present — cache per asset content hash
    let assetHash = asset ? _immutableAssetHashes.get(asset) : 'missing';
    if(asset&&assetHash===undefined){assetHash=hashStable(asset);if(Object.isFrozen(asset))_immutableAssetHashes.set(asset,assetHash);}
    const small = `${visualRef.kind}:${visualRef.id}|a:${assetHash}|s:${JSON.stringify(opts.size ?? null)}|p:${opts.poiType ?? ""}|t:${opts.subtype ?? ""}|r:${JSON.stringify(opts.requires ?? null)}`;
    // tiny LRU for repeated calls within same draft generation
    if (_recipeKeyCache.has(small)) return _recipeKeyCache.get(small);
    const key = `${small}`;
    if (_recipeKeyCache.size >= _RECIPE_KEY_CACHE_LIMIT) _recipeKeyCache.delete(_recipeKeyCache.keys().next().value);
    _recipeKeyCache.set(small, key);
    return key;
  }
  // Builtin: cheap JSON of visualRef + small opts (no asset)
  const assetRecipe = null;
  return JSON.stringify(stableRecipeValue({
    visualRef,
    assetRecipe,
    size: opts.size ?? null,
    poiType: opts.poiType ?? null,
    subtype: opts.subtype ?? null,
    requires: opts.requires ?? null,
  }));
}

export function tagVisualRoot(root, { objectId, visualRef, recipeKey } = {}) {
  root.userData.authorId = objectId;
  root.userData.authorVisualRoot = true;
  root.userData.visualRef = visualRef;
  root.userData.visualRecipeKey = recipeKey ?? getVisualRecipeKey(visualRef);
  root.traverse((child) => {
    child.userData.authorId = objectId;
  });
  return root;
}

export function applyVisualTransform(root, transform) {
  const position = transform?.position ?? { x: 0, y: 0, z: 0 };
  root.position.set(position.x, position.y ?? 0, position.z);
  root.rotation.y = transform?.rotationY ?? 0;
  const scale = transform?.uniformScale ?? 1;
  if (transform?.sizeMode === "uniform") root.scale.set(scale, scale, scale);
  return root;
}

export function getVisualSignature(group) {
  // Helper for tests: returns concatenated geometry types
  const types = [];
  group.traverse((o) => { if (o.isMesh && o.geometry) types.push(o.geometry.type); });
  return types.sort().join(",");
}
