// src/world/staticWorldBuilder.js — data-driven static world instantiation (Phase 4A.1)
// Builds visual meshes and collision data from normalized authored world data.
// One source: world.json -> normalized -> worldRegistry -> this builder.

import * as THREE from "three";
import { MOVEMENT_CONFIG } from "../game/config.js";
import { normalizeStaticDescriptor, getVisualCenter } from "./staticDescriptor.js";

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
  const boundaries = [];

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

  function createProxyBox(id, pos, size, rotY, color) {
    const w = size.w ?? size.x ?? 1;
    const h = size.h ?? size.y ?? 1;
    const d = size.d ?? size.z ?? 1;
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshBasicMaterial({ color: color ?? 0xffff00, wireframe: true, transparent: true, opacity: 0.42 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, (pos.y ?? 0) + h/2 - 0.02, pos.z);
    mesh.rotation.y = rotY ?? 0;
    mesh.name = `${id}__proxy`;
    mesh.userData.authorId = id;
    mesh.userData.isEditProxy = true;
    mesh.userData.proxyFor = id;
    // proxy should be selectable via same id
    mesh.userData.originalVisibleInPlay = false;
    group.add(mesh);
    return mesh;
  }

  function addPropMesh(prop) {
    const pos = prop.pos;
    const baseY = pos.y ?? 0;
    const size = prop.size || { w: 1, h: 1, d: 1 };
    const w = size.w ?? size.x ?? 1;
    const h = size.h ?? size.y ?? 1;
    const d = size.d ?? size.z ?? 1;
    const height = h;
    const rotY = prop.rotY ?? 0;
    const visibleInPlay = prop.visibleInPlay !== undefined ? !!prop.visibleInPlay : true;
    const collisionEnabled = prop.collisionEnabled !== undefined ? !!prop.collisionEnabled : true;
    const opacity = prop.opacity ?? 1;
    const hasTint = prop.color !== undefined || prop.tint !== undefined;

    const subtype = prop.subtype || "box";
    let baseMat = getBaseMatForSubtype(subtype);
    let mat = createTintedMaterial(baseMat, prop);

    // Handle dropPod special group
    if (subtype === "dropPod") {
      // For dropPod we still need to handle visibility/collision proxy
      const podGroup = new THREE.Group();
      podGroup.position.set(pos.x, baseY, pos.z);
      podGroup.rotation.y = rotY;
      // Use tinted dropPod mat if needed? For simplicity use base dropPodMat tinted
      let podMat = dropPodMat;
      if (hasTint || opacity < 1) {
        podMat = dropPodMat.clone();
        if (hasTint) podMat.color.setHex(parseColor(prop.color ?? prop.tint, dropPodMat.color.getHex()));
        if (opacity < 1) { podMat.transparent = true; podMat.opacity = opacity; }
      }
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 1.2, 8), podMat);
      cyl.position.y = 0.6;
      podGroup.add(cyl);
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), podMat);
      top.position.y = 1.2;
      podGroup.add(top);
      const baseRing = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.85, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
      baseRing.rotation.x = -Math.PI / 2;
      baseRing.position.y = 0.02;
      podGroup.name = prop.id;
      podGroup.userData.propId = prop.id;
      podGroup.userData.authorId = prop.id;
      podGroup.userData.propSubtype = subtype;
      podGroup.userData.baseY = baseY;
      podGroup.userData.visibleInPlay = visibleInPlay;
      podGroup.userData.collisionEnabled = collisionEnabled;
      // visibility in Play: hide if not visibleInPlay
      podGroup.visible = visibleInPlay;
      group.add(podGroup);
      // proxy for hidden in Edit
      if (!visibleInPlay) {
        createProxyBox(prop.id, pos, { w, h: 1.0, d }, rotY, 0x7ab8ff);
      } else if (opacity < 1) {
        // already handled via mat opacity
      }
      if (collisionEnabled) {
        obstacles.push({ id: prop.id, x: pos.x, z: pos.z, w, h: d, height: 1.0, baseY, aabb: { minX: pos.x - w / 2, maxX: pos.x + w / 2, minZ: pos.z - d / 2, maxZ: pos.z + d / 2 }, visibleInPlay, collisionEnabled, opacity });
      }
      return;
    }

    // Non-dropPod props
    const geo = new THREE.BoxGeometry(w, height, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, baseY + height / 2 - 0.02, pos.z);
    mesh.rotation.y = rotY;
    mesh.name = prop.id;
    mesh.userData.propId = prop.id;
    mesh.userData.authorId = prop.id;
    mesh.userData.propSubtype = subtype;
    mesh.userData.baseY = baseY;
    mesh.userData.visibleInPlay = visibleInPlay;
    mesh.userData.collisionEnabled = collisionEnabled;
    mesh.userData.opacity = opacity;
    if (subtype === "forestBoundary") mesh.userData.isForestBoundary = true;
    mesh.visible = visibleInPlay;
    // Opacity already via material
    group.add(mesh);

    const isWater = subtype === "water";
    if (isWater) {
      mesh.position.set(pos.x, baseY -0.04, pos.z);
      // water no collision regardless
      if (!visibleInPlay) {
        // proxy for hidden water? water hidden still needs proxy? Provide
        mesh.visible = false;
        createProxyBox(prop.id, pos, { w, h: 0.2, d }, rotY, 0x4a90a8);
      }
      return;
    }

    // Create Edit proxy for hidden objects
    if (!visibleInPlay) {
      const proxyColor = subtype === "fence" ? 0x8b7a5a : subtype === "forestBoundary" ? 0x2d4a2e : 0x9aa0a6;
      createProxyBox(prop.id, pos, { w, h: height, d }, rotY, proxyColor);
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
      obstacles.push({ id: prop.id, x: pos.x, z: pos.z, w, h: d, height, baseY, rotY: rot, aabb: { minX: pos.x - hx, maxX: pos.x + hx, minZ: pos.z - hz, maxZ: pos.z + hz }, visibleInPlay, collisionEnabled, opacity });
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
    const pos = patch.pos;
    const size = patch.size;
    const w = size.w, h = size.h, d = size.d;
    const rotY = patch.rotY ?? 0;
    const visibleInPlay = patch.visibleInPlay !== false;
    const collisionEnabled = patch.collisionEnabled !== false;
    const opacity = patch.opacity ?? 1;
    const color = parseColor(patch.color, 0x7bb26a);
    let baseMat = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.95 });
    if (patch.color !== undefined) baseMat = createTintedMaterial(groundMatBase, patch);
    else if (opacity < 1) {
      baseMat = groundMatBase.clone();
      baseMat.transparent = true;
      baseMat.opacity = opacity;
    } else baseMat = groundMatBase;
    if (patch.color !== undefined) {
      baseMat = baseMat.clone ? baseMat.clone() : baseMat;
      baseMat.color.setHex(color);
    }
    // Actually createTinted handles both
    const mat = createTintedMaterial(groundMatBase, { color: patch.color, opacity, visibleInPlay, collisionEnabled });
    // Override color if specified
    if (patch.color !== undefined) mat.color.setHex(parseColor(patch.color, 0x7bb26a));
    if (opacity < 1) { mat.transparent = true; mat.opacity = opacity; }

    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    const baseY = pos.y ?? -0.25;
    mesh.position.set(pos.x, baseY + h/2, pos.z);
    mesh.rotation.y = rotY;
    mesh.name = patch.id;
    mesh.userData.authorId = patch.id;
    mesh.userData.groundPatchId = patch.id;
    mesh.userData.visibleInPlay = visibleInPlay;
    mesh.userData.collisionEnabled = collisionEnabled;
    mesh.visible = visibleInPlay;
    group.add(mesh);

    if (!visibleInPlay) {
      createProxyBox(patch.id, pos, size, rotY, color ?? 0x7bb26a);
    }

    groundPatches.push({ id: patch.id, x: pos.x, y: baseY, z: pos.z, w, h, d, rotY, color, opacity, visibleInPlay, collisionEnabled, aabb: { minX: pos.x - w/2, maxX: pos.x + w/2, minZ: pos.z - d/2, maxZ: pos.z + d/2 } });

    if (collisionEnabled) {
      // Add to obstacles as flat platform? For physics we will create collider separately in createPhysicsWorld via playground.groundPatches
      obstacles.push({ id: patch.id, x: pos.x, z: pos.z, w, h: d, height: h, baseY, rotY, aabb: { minX: pos.x - w/2, maxX: pos.x + w/2, minZ: pos.z - d/2, maxZ: pos.z + d/2 }, isGround: true, visibleInPlay, collisionEnabled });
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
    const matBase = boundaryMatBase;
    const mat = createTintedMaterial(matBase, { color: bc.color, opacity, visibleInPlay });
    if (bc.color !== undefined) mat.color.setHex(color);
    if (opacity < 1) { mat.transparent = true; mat.opacity = opacity; }

    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    const center = getVisualCenter(desc);
    mesh.position.set(center.x, center.y, center.z);
    mesh.rotation.y = rotY;
    mesh.name = bc.id;
    mesh.userData.authorId = bc.id;
    mesh.userData.boundaryId = bc.id;
    mesh.userData.visibleInPlay = visibleInPlay;
    mesh.userData.collisionEnabled = collisionEnabled;
    mesh.visible = visibleInPlay;
    group.add(mesh);

    const proxyMat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.55 });
    const proxyGeo = new THREE.BoxGeometry(w, h, d);
    const proxy = new THREE.Mesh(proxyGeo, proxyMat);
    proxy.position.copy(mesh.position);
    proxy.rotation.y = rotY;
    proxy.name = `${bc.id}__proxy`;
    proxy.userData.authorId = bc.id;
    proxy.userData.isEditProxy = true;
    proxy.userData.proxyFor = bc.id;
    proxy.visible = false;
    group.add(proxy);
    mesh.userData.proxyMesh = proxy;

    boundaries.push({ id: bc.id, x: pos.x, y: desc.baseY, z: pos.z, w, h, d, rotY, color, opacity, visibleInPlay, collisionEnabled });

    if (collisionEnabled) {
      const rot = rotY;
      const cos = Math.abs(Math.cos(rot)), sin = Math.abs(Math.sin(rot));
      const hx = cos*(w/2) + sin*(d/2);
      const hz = sin*(w/2) + cos*(d/2);
      const height = h;
      const baseY2 = desc.baseY;
      obstacles.push({ id: bc.id, x: pos.x, z: pos.z, w, h: d, height, baseY: baseY2, rotY: rot, isBoundary: true, aabb: { minX: pos.x - hx, maxX: pos.x + hx, minZ: pos.z - hz, maxZ: pos.z + hz }, visibleInPlay, collisionEnabled });
    }
  }

  // Per-region build
  const regions = worldData?.regions ?? [];
  // Determine if any ground patches exist globally; if none, fallback to old global ground for legacy tests
  let hasAuthoredGround = false;
  for (const r of regions) if (r.groundPatches && r.groundPatches.length > 0) hasAuthoredGround = true;
  if (!hasAuthoredGround) {
    // Legacy fallback: global floor as before (for tests without groundPatches)
    const groundGeo = new THREE.BoxGeometry(26, 0.5, 24);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x7bb26a, flatShading: true, roughness: 0.95 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
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
    // Ground patches (authored)
    for (const gp of region.groundPatches ?? []) {
      addGroundPatch(gp);
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
      const baseY = plat.y ?? plat.baseY ?? (plat.pos?.y) ?? 0;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(plat.w, plat.height, plat.h), platformMat);
      mesh.position.set(plat.x, baseY + plat.height / 2 - 0.02, plat.z);
      mesh.name = plat.id;
      mesh.userData.platformId = plat.id;
      mesh.userData.authorId = plat.id;
      mesh.userData.regionId = region.id;
      mesh.userData.baseY = baseY;
      group.add(mesh);
      const aabb = { minX: plat.x - plat.w / 2, maxX: plat.x + plat.w / 2, minZ: plat.z - plat.h / 2, maxZ: plat.z + plat.h / 2 };
      platforms.push({ id: plat.id, x: plat.x, z: plat.z, w: plat.w, h: plat.h, height: plat.height, baseY, aabb, regionId: region.id });
      if (plat.height <= 1.5) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.6), new THREE.MeshStandardMaterial({ color: 0xc9b48a }));
        step.position.set(plat.x, 0.04, plat.z + plat.h / 2 + 0.7);
        group.add(step);
      }
    }

    // Traversal obstacles — support authored Y
    for (const obs of region.traversal?.obstacles ?? []) {
      const baseY = obs.y ?? obs.baseY ?? (obs.pos?.y) ?? 0;
      const h = obs.height ?? 1.0;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(obs.w, h, obs.h), obstacleMat);
      mesh.position.set(obs.x, baseY + h / 2 - 0.02, obs.z);
      mesh.rotation.y = obs.rotY ?? 0;
      mesh.name = obs.id;
      mesh.userData.authorId = obs.id;
      mesh.userData.baseY = baseY;
      group.add(mesh);
      obstacles.push({ id: obs.id, x: obs.x, z: obs.z, w: obs.w, h: obs.h, height: h, baseY, aabb: { minX: obs.x - obs.w / 2, maxX: obs.x + obs.w / 2, minZ: obs.z - obs.h / 2, maxZ: obs.z + obs.h / 2 } });
    }

    // Climbables
    for (const cl of region.traversal?.climbables ?? []) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(cl.w, cl.topY - cl.bottomY, cl.h), new THREE.MeshStandardMaterial({ color: 0xb89a5a, flatShading: true, emissive: 0x332200, emissiveIntensity: 0.12 }));
      wall.position.set(cl.x, (cl.bottomY + cl.topY) / 2 - 0.02, cl.z);
      wall.name = cl.id;
      wall.userData.authorId = cl.id;
      wall.userData.climbableId = cl.id;
      wall.rotation.y = 0;
      group.add(wall);
      for (let i = 0; i < 5; i++) {
        const rung = new THREE.Mesh(new THREE.BoxGeometry(Math.min(cl.w, 1.4), 0.06, 0.09), new THREE.MeshStandardMaterial({ color: 0x6b4a2b }));
        const y = cl.bottomY + 0.35 + i * 0.42;
        rung.position.set(cl.x, y, cl.z + cl.h / 2 + 0.12);
        group.add(rung);
      }
      const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.45, 6), new THREE.MeshStandardMaterial({ color: 0xfff3b0 }));
      marker.position.set(cl.x, cl.topY + 0.25, cl.z);
      group.add(marker);
      climbables.push({ ...cl });
    }

    // Jump traversals — data only, but add gap markers for visibility
    for (const jt of region.traversal?.jumpTraversals ?? []) {
      jumpTraversals.push({ ...jt });
      const gapGeo = new THREE.BoxGeometry(Math.max(1.2, jt.triggerRadius * 1.2), 0.02, Math.max(1.2, jt.triggerRadius * 1.2));
      const gapMat = new THREE.MeshStandardMaterial({ color: 0x4a6a3a, transparent: true, opacity: 0.35 });
      const gap = new THREE.Mesh(gapGeo, gapMat);
      gap.position.set(jt.triggerCenter.x, -0.12, jt.triggerCenter.z);
      gap.name = jt.id;
      group.add(gap);
    }

    // Anchors & POIs placeholders — support authored Y and displayName
    for (const wp of region.majorWaypoints ?? []) {
      const h = 1.6;
      const baseY = wp.pos.y ?? 0;
      const geo = new THREE.CylinderGeometry(0.25, 0.32, h, 8);
      const mesh = new THREE.Mesh(geo, waypointMat);
      // If tint override? waypoints not tinted now; keep simple
      mesh.position.set(wp.pos.x, baseY + h / 2, wp.pos.z);
      mesh.name = wp.id;
      mesh.userData.anchorId = wp.id;
      mesh.userData.authorId = wp.id;
      mesh.userData.anchorType = wp.type;
      mesh.userData.baseY = baseY;
      mesh.userData.displayName = wp.displayName;
      group.add(mesh);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.55, 14), new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(wp.pos.x, baseY + 0.06, wp.pos.z);
      ring.userData.authorId = wp.id;
      group.add(ring);
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshBasicMaterial({ color: 0xaeeaff }));
      top.position.set(wp.pos.x, baseY + h + 0.18, wp.pos.z);
      top.userData.authorId = wp.id;
      group.add(top);
    }
    for (const bc of region.extractionBeacons ?? []) {
      const h = 1.2;
      const baseY = bc.pos.y ?? 0;
      const geo = new THREE.BoxGeometry(0.5, h, 0.5);
      const mesh = new THREE.Mesh(geo, beaconMat);
      mesh.position.set(bc.pos.x, baseY + h / 2, bc.pos.z);
      mesh.name = bc.id;
      mesh.userData.anchorId = bc.id;
      mesh.userData.authorId = bc.id;
      mesh.userData.anchorType = bc.type;
      mesh.userData.baseY = baseY;
      mesh.userData.displayName = bc.displayName;
      group.add(mesh);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.42, 12), new THREE.MeshBasicMaterial({ color: 0xff7043, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(bc.pos.x, baseY + 0.05, bc.pos.z);
      ring.userData.authorId = bc.id;
      group.add(ring);
    }
    for (const poi of region.pois ?? []) {
      let mat = chestMat;
      let h = 0.6;
      if (poi.type === "barrier") { mat = barrierMat; h = 1.0; }
      else if (poi.type === "pond" || poi.type === "water") { continue; }
      const baseY = poi.pos.y ?? 0;
      const geo = new THREE.BoxGeometry(0.7, h, 0.7);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(poi.pos.x, baseY + h / 2, poi.pos.z);
      mesh.name = poi.id;
      mesh.userData.poiId = poi.id;
      mesh.userData.authorId = poi.id;
      mesh.userData.poiType = poi.type;
      mesh.userData.baseY = baseY;
      mesh.userData.displayName = poi.displayName ?? poi.type;
      group.add(mesh);
      if (poi.requires) {
        const lock = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.75 }));
        lock.position.set(poi.pos.x, baseY + h + 0.35, poi.pos.z);
        lock.userData.authorId = poi.id;
        group.add(lock);
      }
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
  }));

  function getGroundHeight(x, z, currentY) {
    const check = (p) => x >= p.aabb.minX && x <= p.aabb.maxX && z >= p.aabb.minZ && z <= p.aabb.maxZ;
    for (const p of platforms) {
      if (!check(p)) continue;
      if (currentY === undefined || currentY === null) {
        return p.height;
      } else {
        const threshold = p.height - 0.45;
        if (currentY < threshold) return 0;
      }
      return p.height;
    }
    return 0;
  }

  function getCollisionObstaclesForHeight(posY) {
    const active = [...obstacles];
    for (const c of platformSideColliders) {
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

  return {
    group,
    obstacles,
    platforms,
    platformSideColliders,
    jumpLinks,
    jumpTraversals,
    climbables,
    groundPatches,
    boundaries,
    getGroundHeight,
    getCollisionObstaclesForHeight,
    resolveStuckPosition,
    isBlockedByPlatformSide,
    bounds: MOVEMENT_CONFIG.worldBounds,
  };
}
