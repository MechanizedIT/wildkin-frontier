// src/world/visualFactory.js — pure deterministic visual constructors (Phase 4A.2.2)
// Shared by Author Edit and Runtime Play. Must be side-effect free:
// - returns local-space THREE.Object3D (Group or Mesh), NOT added to scene
// - no Rapier bodies, no AI, no timers, no DOM, no private rAF
// - deterministic for same objectId/data

import * as THREE from "three";

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
  return new THREE.MeshStandardMaterial({ color, flatShading: true, ...opts });
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

function getCachedStandardMaterial(color, optsKey = "") {
  const key = `${String(color)}::${optsKey}`;
  if(_matCache.has(key)) return _matCache.get(key);
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.82, metalness: 0.05 });
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

export function createFenceVisual({ size } = {}) {
  return createBoxVisual({ size, color: 0x8b7a5a });
}
export function createGateVisual({ size } = {}) {
  return createBoxVisual({ size, color: 0xc9b48a });
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
  return group;
}

export function createDropPodVisual({ size } = {}) {
  const group = new THREE.Group();
  const podMat = matStandard(0xd0d0d0, { metalness: 0.3 });
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 1.2, 8), podMat);
  cyl.position.y = 0.6;
  cyl.name = "dropPod_cyl";
  group.add(cyl);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), podMat);
  top.position.y = 1.2;
  group.add(top);
  const baseRing = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.85, 12), matBasic(0xffffff, { transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
  baseRing.rotation.x = -Math.PI / 2;
  baseRing.position.y = 0.02;
  group.add(baseRing);
  group.userData.visualKind = "prop/dropPod";
  return applyAuthoredBounds(group, size, { width: 1.7, height: 1.8, depth: 1.7 });
}
export function createResonatorVisual({ size } = {}) {
  const group = new THREE.Group();
  const mat = matStandard(0x7ab8ff, { emissive: 0x1a3a5a, emissiveIntensity: 0.25 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.9), mat);
  base.position.y = 0.15;
  group.add(base);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), mat);
  crystal.position.y = 0.75;
  group.add(crystal);
  group.userData.visualKind = "prop/resonator";
  return applyAuthoredBounds(group, size, { width: 0.9, height: 1.2, depth: 0.9 });
}

export function createPlatformVisual({ size = { w:3, height:1.25, h:3 } } = {}) {
  const w = size?.w ?? size?.width ?? 3;
  const h = size?.h ?? size?.depth ?? 3; // h is depth in platform spec
  const height = size?.height ?? 1.25;
  const geo = new THREE.BoxGeometry(w, height, h);
  const mesh = new THREE.Mesh(geo, matStandard(0x8d7a5a));
  mesh.position.set(0, height / 2 - 0.02, 0);
  mesh.name = "visual_platform";
  const g = new THREE.Group();
  g.add(mesh);
  if (height <= 1.5) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.04, 0.6),
      matStandard(0xc9b48a),
    );
    step.position.set(0, 0.04, h / 2 + 0.7);
    step.name = "platform_step";
    g.add(step);
  }
  g.userData.visualKind = "traversal/platform";
  return g;
}
export function createObstacleVisual({ size = { w:1.8, height:1.0, h:1.8 } } = {}) {
  const w = size?.w ?? size?.width ?? 1.8;
  // platform obstacle uses h as depth, height as vertical
  const d = size?.h ?? size?.depth ?? 1.8;
  const height = size?.height ?? 1.0;
  const geo = new THREE.BoxGeometry(w, height, d);
  const mesh = new THREE.Mesh(geo, matStandard(0x9aa0a6));
  mesh.position.set(0, height / 2 - 0.02, 0);
  mesh.name = "visual_obstacle";
  const g = new THREE.Group();
  g.add(mesh);
  g.userData.visualKind = "traversal/obstacle";
  return g;
}

export function createLadderVisual({ size = { width:1.9, height:2.4, depth:0.5 } } = {}) {
  const w = size?.width ?? size?.w ?? 1.9;
  const hDepth = size?.depth ?? size?.h ?? 0.5;
  const height = size?.height ?? 2.4;
  const group = new THREE.Group();
  const wallMat = matStandard(0xb89a5a, { emissive: 0x332200, emissiveIntensity: 0.12 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, height, hDepth), wallMat);
  wall.position.set(0, height / 2 - 0.02, 0);
  wall.name = "ladder_wall";
  group.add(wall);
  const rungCount = Math.max(2, Math.round(height / 0.48));
  for (let i = 0; i < rungCount; i++) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w, 1.4), 0.06, 0.09), matStandard(0x6b4a2b));
    const y = ((i + 1) / (rungCount + 1)) * height;
    // rung slightly in front of wall
    rung.position.set(0, y, hDepth / 2 + 0.12);
    rung.name = `ladder_rung_${i}`;
    group.add(rung);
  }
  const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.45, 6), matStandard(0xfff3b0));
  marker.position.set(0, height + 0.25, 0);
  group.add(marker);
  group.userData.visualKind = "traversal/ladder";
  return group;
}

// Resource visuals — deterministic variation based on objectId
export function createTreeVisual({ objectId = "tree_default" } = {}) {
  const rng = makeRng(objectId, "tree");
  const group = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(0.38, 0.46, 0.52, 8);
  const trunkMat = matStandard(0x6b4a2b);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 0.26;
  trunk.name = "tree_trunk";
  group.add(trunk);
  const foliageMat = matStandard(0x2f7d32);
  const foliageMat2 = matStandard(0x3a9a3a);
  const blobPos = [
    { x: 0, y: 0.78, z: 0, s: 0.92, mat: foliageMat },
    { x: 0.68, y: 0.62, z: 0.38, s: 0.66, mat: foliageMat2 },
    { x: -0.66, y: 0.58, z: 0.40, s: 0.64, mat: foliageMat },
    { x: 0.42, y: 0.70, z: -0.52, s: 0.58, mat: foliageMat2 },
    { x: -0.40, y: 0.52, z: -0.42, s: 0.56, mat: foliageMat },
  ];
  for (let i = 0; i < 5; i++) {
    const cfg = blobPos[i];
    const g = new THREE.ConeGeometry(cfg.s, 1.10, 7);
    const m = new THREE.Mesh(g, cfg.mat);
    m.position.set(cfg.x, cfg.y, cfg.z);
    m.name = `tree_chunk_${i}`;
    m.rotation.y = (rng() * 0.4 - 0.2);
    group.add(m);
  }
  // stump remnant hidden but included for completeness (not visible in READY)
  // We keep group deterministic; variation only in rotations above.
  group.userData.visualKind = "resource/tree";
  return group;
}

export function createRockVisual({ objectId = "rock_default" } = {}) {
  const rng = makeRng(objectId, "rock");
  const group = new THREE.Group();
  const rockMat = matStandard(0x8d8d8d);
  const rockMat2 = matStandard(0xa8a8a8);
  const darkRock = matStandard(0x6e6e6e);
  const lobes = [
    { x: 0, y: 0.52, z: 0, s: 0.58, mat: rockMat },
    { x: 0.46, y: 0.46, z: 0.26, s: 0.44, mat: rockMat2 },
    { x: -0.43, y: 0.40, z: 0.30, s: 0.41, mat: darkRock },
    { x: 0.20, y: 0.62, z: -0.36, s: 0.37, mat: rockMat },
  ];
  for (let i = 0; i < lobes.length; i++) {
    const cfg = lobes[i];
    const g = new THREE.DodecahedronGeometry(cfg.s, 0);
    const m = new THREE.Mesh(g, cfg.mat);
    m.position.set(cfg.x, cfg.y, cfg.z);
    m.rotation.set(rng() * 0.6, rng() * 0.6, rng() * 0.6);
    m.name = `rock_chunk_${i}`;
    group.add(m);
  }
  group.userData.visualKind = "resource/rock";
  return group;
}

export function createFiberVisual({ objectId = "fiber_default" } = {}) {
  // fiber variation is subtle; still deterministic but we can keep fixed positions (no random)
  const group = new THREE.Group();
  const bushMat = matStandard(0x6abf69);
  const bushMat2 = matStandard(0x4a9a4a);
  const tufts = [
    { x: 0, y: 0.42, z: 0, s: 0.45 },
    { x: 0.35, y: 0.36, z: 0.19, s: 0.35 },
    { x: -0.32, y: 0.38, z: 0.22, s: 0.38 },
  ];
  for (let i = 0; i < tufts.length; i++) {
    const cfg = tufts[i];
    const g = new THREE.SphereGeometry(cfg.s, 7, 5);
    g.scale(1, 0.65, 1);
    const mat = i % 2 === 0 ? bushMat : bushMat2;
    const m = new THREE.Mesh(g, mat);
    m.position.set(cfg.x, cfg.y, cfg.z);
    m.name = `fiber_tuft_${i}`;
    group.add(m);
  }
  group.userData.visualKind = "resource/fiber";
  return group;
}

export function createRusherVisual({ objectId = "rusher_default" } = {}) {
  const group = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(0.72, 0.42, 0.86);
  const bodyMat = matStandard(0xe14b2a);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.36;
  body.name = "rusherBody";
  group.add(body);
  const headGeo = new THREE.ConeGeometry(0.22, 0.38, 6);
  const headMat = matStandard(0xff8a4a);
  const head = new THREE.Mesh(headGeo, headMat);
  head.rotation.x = Math.PI / 2;
  head.position.set(0, 0.42, 0.52);
  group.add(head);
  const eyeGeo = new THREE.SphereGeometry(0.06, 5, 5);
  const eyeMat = matStandard(0xffffff);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(0.18, 0.48, 0.42);
  group.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.set(-0.18, 0.48, 0.42);
  group.add(eyeR);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 12), matBasic(0x000000, { transparent: true, opacity: 0.18 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  shadow.name = "shadow";
  group.add(shadow);
  group.userData.visualKind = "creature/rusher";
  return group;
}

export function createSpitterVisual({ objectId = "spitter_default" } = {}) {
  const group = new THREE.Group();
  const bodyGeo = new THREE.CylinderGeometry(0.28, 0.34, 0.62, 7);
  const bodyMat = matStandard(0x7a4de8);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.42;
  body.name = "spitterBody";
  group.add(body);
  const sackGeo = new THREE.SphereGeometry(0.22, 7, 6);
  sackGeo.scale(1, 0.75, 1.2);
  const sackMat = matStandard(0x4ad4d4, { emissive: 0x0a4444, emissiveIntensity: 0.2 });
  const sack = new THREE.Mesh(sackGeo, sackMat);
  sack.position.set(0, 0.38, 0.38);
  sack.name = "spitterSack";
  group.add(sack);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 12), matBasic(0x000000, { transparent: true, opacity: 0.18 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);
  group.userData.visualKind = "creature/spitter";
  return group;
}

export function createWaypointVisual({ objectId = "waypoint_default" } = {}) {
  const group = new THREE.Group();
  const waypointMat = matStandard(0x4fc3f7, { emissive: 0x0a2a3a, emissiveIntensity: 0.2 });
  const h = 1.6;
  const geo = new THREE.CylinderGeometry(0.25, 0.32, h, 8);
  const mesh = new THREE.Mesh(geo, waypointMat);
  mesh.position.y = h / 2;
  mesh.name = "waypoint_cyl";
  group.add(mesh);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.55, 14), matBasic(0x4fc3f7, { transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  group.add(ring);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), matBasic(0xaeeaff));
  top.position.set(0, h + 0.18, 0);
  group.add(top);
  group.userData.visualKind = "anchor/waypoint";
  return group;
}

export function createBeaconVisual({ objectId = "beacon_default" } = {}) {
  const group = new THREE.Group();
  const beaconMat = matStandard(0xff7043, { emissive: 0x442200, emissiveIntensity: 0.2 });
  const h = 1.2;
  const geo = new THREE.BoxGeometry(0.5, h, 0.5);
  const mesh = new THREE.Mesh(geo, beaconMat);
  mesh.position.y = h / 2;
  group.add(mesh);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.42, 12), matBasic(0xff7043, { transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);
  group.userData.visualKind = "anchor/beacon";
  return group;
}

export function createPoiVisual({ poiType = "chest", objectId = "poi_default", requires = null } = {}) {
  const group = new THREE.Group();
  let mat = matStandard(0xffd54f, { emissive: 0x332200, emissiveIntensity: 0.12 });
  let h = 0.6;
  if (poiType === "barrier") { mat = matStandard(0x777777); h = 1.0; }
  const geo = new THREE.BoxGeometry(0.7, h, 0.7);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = h / 2;
  group.add(mesh);
  if (requires) {
    const lock = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 6, 6),
      matBasic(0xff4444, { transparent: true, opacity: 0.75 }),
    );
    lock.position.set(0, h + 0.35, 0);
    lock.name = "poi_lock";
    group.add(lock);
  }
  group.userData.visualKind = `poi/${poiType}`;
  return group;
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
  const group = new THREE.Group();
  group.userData.visualKind = `asset/${asset.id}`;
  group.userData.visualAssetId = asset.id;
  for (const part of asset.parts ?? []) {
    const geometry = getCachedAssetGeometry(part.shape);
    // Cached material per color — asset parts share flat roughness 0.82/metalness 0.05
    const material = getCachedStandardMaterial(part.color, "asset:0.82:0.05");
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${asset.id}:${part.id}`;
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
const _RECIPE_KEY_CACHE_LIMIT = 256;
function hashStable(value){
  // Use hashString on sorted JSON for assetRecipe only; small fields stay inline
  try { return String(hashString(JSON.stringify(stableRecipeValue(value)))); } catch { return String(Math.random()).slice(2); }
}
export function getVisualRecipeKey(visualRef, opts = {}) {
  if (visualRef?.kind === "asset") {
    const asset = findVisualAsset(opts.visualAssets, visualRef.id);
    // hash asset recipe if present — cache per asset content hash
    const assetHash = asset ? hashStable(asset) : "missing";
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
