// src/world/staticWorldBuilder.js — data-driven static world instantiation (Phase 3.5B)
// Builds visual meshes and collision data from normalized authored world data.
// One source: world.json -> normalized -> worldRegistry -> this builder.

import * as THREE from "three";
import { MOVEMENT_CONFIG } from "../game/config.js";

export function createStaticWorld(worldData) {
  const group = new THREE.Group();
  group.name = "movement-playground";

  // Base ground — large plane covering worldBounds (always active)
  const groundGeo = new THREE.BoxGeometry(26, 0.5, 24);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x7bb26a, flatShading: true, roughness: 0.95 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.set(0, -0.25, 0);
  group.add(ground);
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x5f8a52, flatShading: true });
  const edge = new THREE.Mesh(new THREE.BoxGeometry(27, 0.25, 25), edgeMat);
  edge.position.y = -0.58;
  group.add(edge);

  const obstacles = [];
  const platforms = [];
  const jumpTraversals = [];
  const climbables = [];

  // Materials
  const platformMat = new THREE.MeshStandardMaterial({ color: 0x8d7a5a, flatShading: true });
  const obstacleMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, flatShading: true });
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8b7a5a, flatShading: true });
  const gateMat = new THREE.MeshStandardMaterial({ color: 0xc9b48a, flatShading: true, emissive: 0x332200, emissiveIntensity: 0.15 });
  const forestMat = new THREE.MeshStandardMaterial({ color: 0x2d4a2e, flatShading: true });
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x4a90a8, flatShading: true, transparent: true, opacity: 0.55 });
  const islandMat = new THREE.MeshStandardMaterial({ color: 0xc2b280, flatShading: true });
  const dropPodMat = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, flatShading: true, metalness: 0.3 });
  const resonatorMat = new THREE.MeshStandardMaterial({ color: 0x7ab8ff, flatShading: true, emissive: 0x1a3a5a, emissiveIntensity: 0.25 });
  const waypointMat = new THREE.MeshStandardMaterial({ color: 0x4fc3f7, flatShading: true, emissive: 0x0a2a3a, emissiveIntensity: 0.2 });
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0xff7043, flatShading: true, emissive: 0x442200, emissiveIntensity: 0.2 });
  const chestMat = new THREE.MeshStandardMaterial({ color: 0xffd54f, flatShading: true, emissive: 0x332200, emissiveIntensity: 0.12 });
  const barrierMat = new THREE.MeshStandardMaterial({ color: 0x777777, flatShading: true });

  function addObstacle(x, z, w, h, height, id) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, h), obstacleMat);
    mesh.position.set(x, height / 2 - 0.02, z);
    mesh.name = id || "obstacle";
    group.add(mesh);
    obstacles.push({ id: id || `obs_${x}_${z}`, x, z, w, h, height, aabb: { minX: x - w / 2, maxX: x + w / 2, minZ: z - h / 2, maxZ: z + h / 2 } });
  }

  function addPropMesh(prop) {
    const pos = prop.pos;
    const size = prop.size || { w: 1, h: 1, d: 1 };
    const w = size.w ?? size.x ?? 1;
    const h = size.h ?? size.y ?? 1;
    const d = size.d ?? size.z ?? 1;
    const height = h;
    const rotY = prop.rotY ?? 0;
    let mat = obstacleMat;
    let geo;
    const subtype = prop.subtype || "box";
    if (subtype === "fence") mat = fenceMat;
    else if (subtype === "gate") mat = gateMat;
    else if (subtype === "forestBoundary") mat = forestMat;
    else if (subtype === "water") mat = waterMat;
    else if (subtype === "island") mat = islandMat;
    else if (subtype === "dropPod") {
      // drop pod as capsule-like: cylinder + hemisphere
      const podGroup = new THREE.Group();
      podGroup.position.set(pos.x, 0, pos.z);
      podGroup.rotation.y = rotY;
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 1.2, 8), dropPodMat);
      cyl.position.y = 0.6;
      podGroup.add(cyl);
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), dropPodMat);
      top.position.y = 1.2;
      podGroup.add(top);
      const baseRing = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.85, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
      baseRing.rotation.x = -Math.PI / 2;
      baseRing.position.y = 0.02;
      baseRing.position.x = pos.x - pos.x; // relative
      // For raycast selection, add invisible box collider proxy?
      podGroup.name = prop.id;
      podGroup.userData.propId = prop.id;
      podGroup.userData.propSubtype = subtype;
      group.add(podGroup);
      // Collider: treat as obstacle for physics if needed? Drop pod is solid short
      obstacles.push({ id: prop.id, x: pos.x, z: pos.z, w, h: d, height: 1.0, aabb: { minX: pos.x - w / 2, maxX: pos.x + w / 2, minZ: pos.z - d / 2, maxZ: pos.z + d / 2 } });
      return;
    } else if (subtype === "resonator") mat = resonatorMat;
    else if (subtype === "box") mat = obstacleMat;

    geo = new THREE.BoxGeometry(w, height, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, height / 2 - 0.02, pos.z);
    mesh.rotation.y = rotY;
    mesh.name = prop.id;
    mesh.userData.propId = prop.id;
    mesh.userData.propSubtype = subtype;
    group.add(mesh);

    // Determine if prop should block physics (most props except water/island maybe)
    const blockingSubtypes = new Set(["fence", "gate", "box", "forestBoundary", "boundary", "obstacle", "barrier", "dropPod", "resonator"]);
    const isBlocking = blockingSubtypes.has(subtype) || prop.blocking === true;
    const isWater = subtype === "water";
    if (isWater) {
      mesh.position.y = -0.04; // slightly below ground for water
      // water is not solid - no collider
      return;
    }
    if (isBlocking) {
      // Gate is traversable? For Camp gate we want opening — but gate prop itself is solid? Actually gate gap is empty between fences, gate mesh is traversable visual only?
      // Keep gate as non-blocking so player can pass
      if (subtype === "gate") return;
      obstacles.push({ id: prop.id, x: pos.x, z: pos.z, w, h: d, height, aabb: { minX: pos.x - w / 2, maxX: pos.x + w / 2, minZ: pos.z - d / 2, maxZ: pos.z + d / 2 } });
    }
  }

  // Per-region build
  const regions = worldData?.regions ?? [];
  for (const region of regions) {
    // Region ground overlay slightly above base
    const b = region.bounds;
    const gw = b.maxX - b.minX;
    const gz = b.maxZ - b.minZ;
    const cx = (b.minX + b.maxX) * 0.5;
    const cz = (b.minZ + b.maxZ) * 0.5;
    const groundColor = region.ground?.color ?? 0x7bb26a;
    const regGround = new THREE.Mesh(new THREE.BoxGeometry(gw, 0.06, gz), new THREE.MeshStandardMaterial({ color: groundColor, flatShading: true, roughness: 0.95 }));
    regGround.position.set(cx, -0.22, cz);
    regGround.receiveShadow = false;
    regGround.name = `ground_${region.id}`;
    group.add(regGround);

    // Props
    for (const prop of region.props ?? []) {
      addPropMesh(prop);
    }

    // Traversal platforms
    for (const plat of region.traversal?.platforms ?? []) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(plat.w, plat.height, plat.h), platformMat);
      mesh.position.set(plat.x, plat.height / 2 - 0.02, plat.z);
      mesh.name = plat.id;
      mesh.userData.platformId = plat.id;
      mesh.userData.regionId = region.id;
      group.add(mesh);
      const aabb = { minX: plat.x - plat.w / 2, maxX: plat.x + plat.w / 2, minZ: plat.z - plat.h / 2, maxZ: plat.z + plat.h / 2 };
      platforms.push({ id: plat.id, x: plat.x, z: plat.z, w: plat.w, h: plat.h, height: plat.height, aabb, regionId: region.id });
      // Add step marker for visibility
      if (plat.height <= 1.5) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.6), new THREE.MeshStandardMaterial({ color: 0xc9b48a }));
        const sx = plat.x;
        const sz = plat.aabb ? plat.aabb.minZ - 0.5 : plat.z + plat.h / 2 + 0.6;
        // place step just south of platform
        step.position.set(sx, 0.04, plat.z + plat.h / 2 + 0.7);
        group.add(step);
      }
    }

    // Traversal obstacles
    for (const obs of region.traversal?.obstacles ?? []) {
      addObstacle(obs.x, obs.z, obs.w, obs.h, obs.height ?? 1.0, obs.id);
    }

    // Climbables
    for (const cl of region.traversal?.climbables ?? []) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(cl.w, cl.topY - cl.bottomY, cl.h), new THREE.MeshStandardMaterial({ color: 0xb89a5a, flatShading: true, emissive: 0x332200, emissiveIntensity: 0.12 }));
      wall.position.set(cl.x, (cl.bottomY + cl.topY) / 2 - 0.02, cl.z);
      wall.name = cl.id;
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

    // Anchors & POIs placeholders — visually distinct
    for (const wp of region.majorWaypoints ?? []) {
      const h = 1.6;
      const geo = new THREE.CylinderGeometry(0.25, 0.32, h, 8);
      const mesh = new THREE.Mesh(geo, waypointMat);
      mesh.position.set(wp.pos.x, h / 2, wp.pos.z);
      mesh.name = wp.id;
      mesh.userData.anchorId = wp.id;
      mesh.userData.anchorType = wp.type;
      group.add(mesh);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.55, 14), new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(wp.pos.x, 0.06, wp.pos.z);
      group.add(ring);
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshBasicMaterial({ color: 0xaeeaff }));
      top.position.set(wp.pos.x, h + 0.18, wp.pos.z);
      group.add(top);
    }
    for (const bc of region.extractionBeacons ?? []) {
      const h = 1.2;
      const geo = new THREE.BoxGeometry(0.5, h, 0.5);
      const mesh = new THREE.Mesh(geo, beaconMat);
      mesh.position.set(bc.pos.x, h / 2, bc.pos.z);
      mesh.name = bc.id;
      mesh.userData.anchorId = bc.id;
      mesh.userData.anchorType = bc.type;
      group.add(mesh);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.42, 12), new THREE.MeshBasicMaterial({ color: 0xff7043, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(bc.pos.x, 0.05, bc.pos.z);
      group.add(ring);
    }
    for (const poi of region.pois ?? []) {
      let mat = chestMat;
      let h = 0.6;
      if (poi.type === "barrier") { mat = barrierMat; h = 1.0; }
      else if (poi.type === "pond" || poi.type === "water") { continue; } // water already handled via prop
      const geo = new THREE.BoxGeometry(0.7, h, 0.7);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(poi.pos.x, h / 2, poi.pos.z);
      mesh.name = poi.id;
      mesh.userData.poiId = poi.id;
      mesh.userData.poiType = poi.type;
      group.add(mesh);
      // Locked indicator if requires
      if (poi.requires) {
        const lock = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.75 }));
        lock.position.set(poi.pos.x, h + 0.35, poi.pos.z);
        group.add(lock);
      }
    }
  }

  // Boundary visual low walls (always)
  const boundMat = new THREE.MeshStandardMaterial({ color: 0x5a6a7a, flatShading: true, transparent: true, opacity: 0.28 });
  const halfX = MOVEMENT_CONFIG.worldBounds.maxX;
  const halfZ = MOVEMENT_CONFIG.worldBounds.maxZ;
  const wallNS = new THREE.BoxGeometry(halfX * 2 + 1, 0.6, 0.35);
  const northWall = new THREE.Mesh(wallNS, boundMat);
  northWall.position.set(0, 0.3, -halfZ - 0.18);
  group.add(northWall);
  const southWall = new THREE.Mesh(wallNS, boundMat);
  southWall.position.set(0, 0.3, halfZ + 0.18);
  group.add(southWall);
  const wallEW = new THREE.BoxGeometry(0.35, 0.6, halfZ * 2 + 1);
  const westWall = new THREE.Mesh(wallEW, boundMat);
  westWall.position.set(-halfX - 0.18, 0.3, 0);
  group.add(westWall);
  const eastWall = new THREE.Mesh(wallEW, boundMat);
  eastWall.position.set(halfX + 0.18, 0.3, 0);
  group.add(eastWall);

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
    getGroundHeight,
    getCollisionObstaclesForHeight,
    resolveStuckPosition,
    isBlockedByPlatformSide,
    bounds: MOVEMENT_CONFIG.worldBounds,
  };
}
