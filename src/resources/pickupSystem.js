// src/resources/pickupSystem.js — visible pickups with pooling, shared geometries, radius-aware collision & rescue magnetization
import * as THREE from "three";
import { HARVEST_CONFIG } from "./resourceConfig.js";
import { findResourceDrop, getResourceDrops, makeEmptyResourceMap } from "./resourceDropCatalog.js";
import { computeVisualAssetBounds, createVisual } from "../world/visualFactory.js";

export const PICKUP_CONFIG = {
  woodCubeSize: 0.42,
  stoneRadius: 0.32,
  fiberRadius: 0.28,
  glowScale: 1.8,
  restHeight: 0.26,
  collectionRadius: 0.52,
  spawnMargin: 0.14,
  retentionRecallRadius: 6,
  capacityRetrySeconds: 0.75,
  pickupRadius: { wood: 0.26, stone: 0.32, fiber: 0.28 },
};

function getPickupRadius(resourceId) {
  return PICKUP_CONFIG.pickupRadius[resourceId] ?? 0.26;
}

let SHARED = null;
function getShared() {
  if (SHARED) return SHARED;
  const woodGeo = new THREE.BoxGeometry(PICKUP_CONFIG.woodCubeSize, PICKUP_CONFIG.woodCubeSize, PICKUP_CONFIG.woodCubeSize);
  const stoneGeo = new THREE.DodecahedronGeometry(PICKUP_CONFIG.stoneRadius, 0);
  const fiberGeo = new THREE.SphereGeometry(PICKUP_CONFIG.fiberRadius, 7, 5);
  fiberGeo.scale(1, 0.85, 1);
  const glowGeo = new THREE.SphereGeometry(PICKUP_CONFIG.woodCubeSize * 0.68, 6, 6);
  const woodMatProto = new THREE.MeshStandardMaterial({ color: 0x8d5a2b, flatShading: true, emissive: 0x332000, emissiveIntensity: 0.18 });
  const stoneMatProto = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, flatShading: true });
  const fiberMatProto = new THREE.MeshStandardMaterial({ color: 0x6abf69, flatShading: true, emissive: 0x123412, emissiveIntensity: 0.12 });
  const glowMatProto = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 });
  SHARED = { woodGeo, stoneGeo, fiberGeo, glowGeo, woodMatProto, stoneMatProto, fiberMatProto, glowMatProto };
  return SHARED;
}

export function createPickupSystem(scene, physicsWorld = null, playground = null, onInventoryChanged, opts = {}) {
  if (typeof physicsWorld === "function" && playground == null) {
    onInventoryChanged = physicsWorld;
    physicsWorld = null;
    playground = null;
  }
  if (physicsWorld && typeof physicsWorld === "object" && !physicsWorld.world && !physicsWorld.RAPIER) {
    if (physicsWorld.obstacles && !playground) {
      playground = physicsWorld;
      physicsWorld = null;
    }
  }

  const shared = getShared();
  const resourceDrops = getResourceDrops(opts.resourceDrops);
  const visualAssets = opts.visualAssets ?? [];
  const visualAssetMap = new Map(visualAssets.map((asset) => [asset.id, asset]));
  const pickups = [];
  const pool = [];
  // Pack quantities belong to the injected inventory owner. This map contains
  // only unclaimed world yields: at most one record per finite resource node.
  const inventoryAccess = opts.inventory;
  const pendingYields = new Map();
  let activeRegions = null, regionRegistry = null;
  let magnetRadius = HARVEST_CONFIG.pickupMagnetRadius;
  let magnetSpeed = HARVEST_CONFIG.pickupMagnetSpeed;
  let magnetAccel = HARVEST_CONFIG.pickupMagnetAccel;
  let nextId = 0;
  const MAX_ACTIVE = 32;
  const STALE_SECONDS = 30;
  let RAPIER = physicsWorld?.RAPIER ?? null;
  if (!RAPIER && physicsWorld && physicsWorld.RAPIER) RAPIER = physicsWorld.RAPIER;
  let playerCollider = null;

  function setPlayerCollider(collider) { playerCollider = collider ?? null; }
  function setPhysicsWorld(pw) { physicsWorld = pw; RAPIER = pw?.RAPIER ?? RAPIER; }

  function getSurfaceY(x, z) {
    const authoredSurface = playground?.getGroundHeight?.(x, z);
    if (Number.isFinite(authoredSurface)) return authoredSurface;
    if (playground && playground.platforms) {
      for (const p of playground.platforms) {
        if (x >= p.aabb.minX && x <= p.aabb.maxX && z >= p.aabb.minZ && z <= p.aabb.maxZ) return (p.baseY ?? 0) + p.height;
      }
    }
    return 0;
  }

  function isSegmentBlockedAABB(a, b) {
    const obstacles = [];
    if (playground) {
      if (playground.obstacles) obstacles.push(...playground.obstacles);
      if (playground.platforms) { for (const p of playground.platforms) obstacles.push({ aabb: p.aabb, height: p.height }); }
    }
    if (obstacles.length === 0) return false;
    const yA = a.y, yB = b.y;
    const yMin = Math.min(yA, yB) - 0.14;
    for (const o of obstacles) {
      const h = o.height ?? 1.0;
      if (yMin > h + 0.15) continue;
      const aabb = o.aabb; if (!aabb) continue;
      const minX = aabb.minX, maxX = aabb.maxX, minZ = aabb.minZ, maxZ = aabb.maxZ;
      const segMinX = Math.min(a.x, b.x), segMaxX = Math.max(a.x, b.x);
      const segMinZ = Math.min(a.z, b.z), segMaxZ = Math.max(a.z, b.z);
      if (segMaxX < minX || segMinX > maxX || segMaxZ < minZ || segMinZ > maxZ) continue;
      const midX = (a.x + b.x) * 0.5, midZ = (a.z + b.z) * 0.5;
      if (midX >= minX && midX <= maxX && midZ >= minZ && midZ <= maxZ) { const midY = (yA + yB) * 0.5; if (midY < h + 0.25) return true; }
      if (a.x >= minX && a.x <= maxX && a.z >= minZ && a.z <= maxZ && yA < h + 0.25) return true;
      if (b.x >= minX && b.x <= maxX && b.z >= minZ && b.z <= maxZ && yB < h + 0.25) return true;
    }
    return false;
  }

  function isSegmentBlockedAABBExpanded(a, b, radius) {
    const obstacles = [];
    if (playground) {
      if (playground.obstacles) obstacles.push(...playground.obstacles);
      if (playground.platforms) { for (const p of playground.platforms) obstacles.push({ aabb: p.aabb, height: p.height }); }
    }
    if (obstacles.length === 0) return false;
    const yA = a.y, yB = b.y;
    const yMin = Math.min(yA, yB) - radius - 0.05;
    for (const o of obstacles) {
      const h = o.height ?? 1.0;
      if (yMin > h + radius + 0.05) continue;
      const aabb = o.aabb; if (!aabb) continue;
      const minX = aabb.minX - radius, maxX = aabb.maxX + radius;
      const minZ = aabb.minZ - radius, maxZ = aabb.maxZ + radius;
      const segMinX = Math.min(a.x, b.x), segMaxX = Math.max(a.x, b.x);
      const segMinZ = Math.min(a.z, b.z), segMaxZ = Math.max(a.z, b.z);
      if (segMaxX < minX || segMinX > maxX || segMaxZ < minZ || segMinZ > maxZ) continue;
      // also check if at height overlapping
      const midY = (yA + yB) * 0.5;
      if (midY < h + radius + 0.10) return true;
      if (a.y < h + radius + 0.10 && a.x >= minX && a.x <= maxX && a.z >= minZ && a.z <= maxZ) return true;
      if (b.y < h + radius + 0.10 && b.x >= minX && b.x <= maxX && b.z >= minZ && b.z <= maxZ) return true;
      // segment overlaps expanded box -> consider blocked
      if (segMinX <= maxX && segMaxX >= minX && segMinZ <= maxZ && segMaxZ >= minZ) return true;
    }
    return false;
  }

  function isPositionOverlappingAABB(pos, radius) {
    if (!playground) return false;
    const obstacles = [];
    if (playground.obstacles) obstacles.push(...playground.obstacles);
    if (playground.platforms) { for (const p of playground.platforms) obstacles.push({ aabb: p.aabb, height: p.height }); }
    const y = pos.y;
    for (const o of obstacles) {
      const h = o.height ?? 1.0;
      if (y > h + radius + 0.08) continue;
      if (y < -radius) continue;
      const aabb = o.aabb; if (!aabb) continue;
      const minX = aabb.minX - radius, maxX = aabb.maxX + radius;
      const minZ = aabb.minZ - radius, maxZ = aabb.maxZ + radius;
      if (pos.x >= minX && pos.x <= maxX && pos.z >= minZ && pos.z <= maxZ && y < h + radius + 0.08) return true;
    }
    return false;
  }

  function makeExcludePredicate(excludeSet) {
    if (!excludeSet || excludeSet.size === 0) return null;
    return (collider) => {
      for (const ex of excludeSet) {
        if (!ex) continue;
        if (ex === collider) return false;
        if (ex.handle !== undefined && collider.handle !== undefined && ex.handle === collider.handle) return false;
      }
      return true;
    };
  }

  function isPositionOverlappingSolid(pos, radius, excludeColliders) {
    const excludeSet = new Set();
    if (excludeColliders) for (const c of excludeColliders) if (c) excludeSet.add(c);
    if (RAPIER && physicsWorld && physicsWorld.world && typeof RAPIER.Ball === "function" && physicsWorld.world.intersectionWithShape) {
      try {
        const shape = new RAPIER.Ball(radius);
        const rot = { x: 0, y: 0, z: 0, w: 1 };
        const pred = makeExcludePredicate(excludeSet);
        const hit = physicsWorld.world.intersectionWithShape(pos, rot, shape, undefined, undefined, undefined, undefined, pred);
        if (hit) return true;
        return false;
      } catch (_) {}
    }
    return isPositionOverlappingAABB(pos, radius);
  }

  function castSphereBlocked(from, to, radius, excludeColliders) {
    const dirX = to.x - from.x, dirY = to.y - from.y, dirZ = to.z - from.z;
    const len = Math.hypot(dirX, dirY, dirZ);
    if (len < 1e-5) {
      // Check if current position overlapping
      return isPositionOverlappingSolid(from, radius, excludeColliders) ? { blocked: true, toi: 0 } : { blocked: false };
    }
    const excludeSet = new Set();
    if (excludeColliders) for (const c of excludeColliders) if (c) excludeSet.add(c);
    const pred = makeExcludePredicate(excludeSet);
    if (RAPIER && physicsWorld && physicsWorld.world && typeof RAPIER.Ball === "function" && physicsWorld.world.castShape) {
      try {
        const shape = new RAPIER.Ball(radius);
        const rot = { x: 0, y: 0, z: 0, w: 1 };
        const vel = { x: dirX, y: dirY, z: dirZ };
        const hit = physicsWorld.world.castShape(from, rot, vel, shape, 0, 1.0, true, undefined, undefined, undefined, undefined, pred);
        if (hit) {
          const toi = hit.timeOfImpact ?? hit.toi ?? 0;
          if (toi < 1.0 - 1e-4) return { blocked: true, toi };
        }
        return { blocked: false };
      } catch (_) {
        // fallback
      }
    }
    // Fallback: expanded AABB point check
    const blocked = isSegmentBlockedAABBExpanded(from, to, radius);
    return { blocked, toi: blocked ? 0.0 : 1.0 };
  }

  // Legacy point ray (kept for magnet ignore check if needed elsewhere)
  function castRayBlocked(from, to, excludeColliders) {
    // Use sphere with tiny radius as fallback
    return castSphereBlocked(from, to, 0.02, excludeColliders).blocked;
  }

  function createPickupMesh(resourceId) {
    const s = shared;
    const drop = findResourceDrop(resourceDrops, resourceId);
    const pickupAsset = drop?.visualAssetId ? visualAssetMap.get(drop.visualAssetId) : null;
    if (pickupAsset) {
      const wrapper = new THREE.Group();
      const visual = createVisual(
        { kind: "asset", id: pickupAsset.id },
        { objectId: `pickup_${resourceId}`, visualAssets },
      );
      const bounds = computeVisualAssetBounds(pickupAsset);
      const largest = Math.max(bounds.size.w, bounds.size.h, bounds.size.d, 0.01);
      const scale = 0.58 / largest;
      visual.scale.setScalar(scale);
      visual.position.set(
        -bounds.offset.x * scale,
        -bounds.offset.y * scale,
        -bounds.offset.z * scale,
      );
      wrapper.add(visual);
      const glowMat = s.glowMatProto.clone();
      const glow = new THREE.Mesh(s.glowGeo, glowMat);
      glow.scale.setScalar(getPickupRadius(resourceId) / 0.26 * 0.95);
      wrapper.add(glow);
      wrapper.userData.glow = glow;
      wrapper.userData.pickupVisualAssetId = pickupAsset.id;
      return wrapper;
    }
    let geo, matProto, mat;
    if (resourceId === "wood") { geo = s.woodGeo; matProto = s.woodMatProto; }
    else if (resourceId === "stone") { geo = s.stoneGeo; matProto = s.stoneMatProto; }
    else if (resourceId === "fiber") { geo = s.fiberGeo; matProto = s.fiberMatProto; }
    else {
      geo = s.stoneGeo;
      mat = new THREE.MeshStandardMaterial({
        color: drop?.color ?? "#d8c6ff",
        flatShading: true,
        emissive: drop?.color ?? "#d8c6ff",
        emissiveIntensity: 0.12,
      });
    }
    if (!mat) mat = matProto.clone();
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = false;
    const glowMat = s.glowMatProto.clone();
    const glow = new THREE.Mesh(s.glowGeo, glowMat);
    const r = getPickupRadius(resourceId);
    glow.scale.set(r / 0.26 * 0.95, r / 0.26 * 0.95, r / 0.26 * 0.95);
    m.add(glow);
    m.userData.glow = glow;
    m.userData.baseMat = mat;
    return m;
  }

  function disposePickupMesh(mesh) {
    if (mesh.userData.pickupVisualAssetId) {
      mesh.traverse((object) => {
        if (object.geometry && object.geometry !== shared.glowGeo) object.geometry.dispose?.();
        if (!object.material) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose?.();
      });
      return;
    }
    mesh.material?.dispose?.();
    mesh.userData.glow?.material?.dispose?.();
  }

  function acquireMesh(resourceId) {
    for (let i = pool.length - 1; i >= 0; i--) {
      const entry = pool[i];
      if (entry.resourceId === resourceId) {
        pool.splice(i, 1);
        entry.mesh.visible = true;
        entry.mesh.scale.set(1, 1, 1);
        entry.mesh.rotation.set(0, 0, 0);
        return entry.mesh;
      }
    }
    if (pool.length > 0) {
      const entry = pool.pop();
      scene.remove(entry.mesh);
      disposePickupMesh(entry.mesh);
      return createPickupMesh(resourceId);
    }
    return createPickupMesh(resourceId);
  }

  function releaseMesh(pickup) {
    pickup.mesh.visible = false;
    scene.remove(pickup.mesh);
    if (pool.length < 24) pool.push({ mesh: pickup.mesh, resourceId: pickup.resourceId });
    else {
      disposePickupMesh(pickup.mesh);
    }
  }

  function sourceIsActive(record) {
    if (activeRegions === null) return true;
    const regionId = record.node.regionId ?? record.node.state?.regionId
      ?? regionRegistry?.getRegionForPosition?.(record.node.state.position);
    return !regionId || activeRegions.has(regionId);
  }

  function retainPickup(pickup) {
    releaseMesh(pickup);
    const index = pickups.indexOf(pickup);
    if (index >= 0) pickups.splice(index, 1);
    if (pickup.yield.visual === pickup) pickup.yield.visual = null;
    pickup.state = 'RETAINED';
  }

  function hasPendingYield(node) { return pendingYields.has(node); }

  function spawnPickup(node) {
    let record = pendingYields.get(node);
    if (!record) { record = { node, resources: {}, visual: null }; pendingYields.set(node, record); }
    const id = node.type.resourceId;
    record.resources[id] = (record.resources[id] ?? 0) + 1;
    // A bonus from the same committed hit shares its source's one visual.
    if (record.visual) return record.visual;
    return sourceIsActive(record) ? materializeYield(record) : null;
  }

  function materializeYield(record) {
    const node = record.node;
    if (pickups.length >= MAX_ACTIVE) {
      let idx = -1;
      for (let i = 0; i < pickups.length; i++) if (pickups[i].state === "RESTING") { idx = i; break; }
      if (idx === -1) idx = 0;
      const old = pickups[idx];
      retainPickup(old);
    }
    const resId = Object.keys(record.resources)[0];
    const mesh = acquireMesh(resId);
    const base = node.state.position;
    const type = node.type;
    const he = type.colliderHalfExtents;
    const pickupR = getPickupRadius(resId);
    const margin = PICKUP_CONFIG.spawnMargin;
    let horizOffset;
    let angle = Math.random() * Math.PI * 2;
    if (type.solid && he) {
      const extent = Math.max(he.x, he.z);
      const clearance = extent + pickupR + margin;
      horizOffset = clearance + Math.random() * 0.14;
    } else {
      horizOffset = 0.38 + Math.random() * 0.18;
      angle = Math.random() * Math.PI * 2;
    }
    const spawnY = (base.y ?? 0) + (type.dropOriginHeight ?? 0.55) + Math.random() * 0.18;
    const start = { x: base.x + Math.cos(angle) * horizOffset, y: spawnY, z: base.z + Math.sin(angle) * horizOffset };
    mesh.position.set(start.x, start.y, start.z);
    mesh.scale.set(0.2, 0.2, 0.2);
    mesh.visible = true;
    scene.add(mesh);
    const outward = {
      x: Math.cos(angle) * HARVEST_CONFIG.pickupLaunchSpeed * (0.85 + Math.random() * 0.30),
      y: HARVEST_CONFIG.pickupLaunchUp + Math.random() * 0.5,
      z: Math.sin(angle) * HARVEST_CONFIG.pickupLaunchSpeed * (0.85 + Math.random() * 0.30),
    };
    const pickup = {
      id: nextId++,
      yield: record,
      mesh,
      resourceId: resId,
      pos: new THREE.Vector3(start.x, start.y, start.z),
      vel: new THREE.Vector3(outward.x, outward.y, outward.z),
      age: 0,
      state: "LAUNCHED",
      collected: false,
      nodeIndex: node.index,
      regionId: node.regionId ?? node.state?.regionId ?? null,
      sourceCollider: node.collider ?? null,
      sourceColliderHandle: node.collider?.handle ?? null,
      _popTime: 0,
      lastClearPos: new THREE.Vector3(start.x, start.y, start.z),
      sourceRestPosition: new THREE.Vector3(start.x, getSurfaceY(start.x, start.z) + PICKUP_CONFIG.restHeight, start.z),
      _radius: pickupR,
    };
    pickups.push(pickup);
    record.visual = pickup;
    return pickup;
  }

  function collectPickup(pickup, playSound) {
    const record = pickup.yield;
    if (pickup.collected || pendingYields.get(record?.node) !== record || record.visual !== pickup || !sourceIsActive(record)) return false;
    let result;
    try { result = inventoryAccess?.collect?.({ ...record.resources }, { gathered: true }); }
    catch { result = { ok: false, reason: 'storage-write-failed' }; }
    let moved = 0;
    if (result?.ok) {
      for (const [id, count] of Object.entries(record.resources)) {
        const accepted = Math.max(0, Math.min(count, Math.floor(Number(result.added?.[id]) || 0)));
        if (!accepted) continue;
        moved += accepted;
        if (accepted === count) delete record.resources[id]; else record.resources[id] -= accepted;
        onInventoryChanged?.(getInventory(), id);
        playSound?.(id);
      }
    }
    if (Object.keys(record.resources).length) {
      const reason = result?.reason ?? (moved ? 'full' : 'inventory-unavailable');
      if (record.lastReason !== reason) opts.onCollectionBlocked?.(reason);
      record.lastReason = reason;
      pickup.lastCollectionReason = reason;
      pickup._retryRemaining = PICKUP_CONFIG.capacityRetrySeconds;
      pickup.state = 'RESTING'; pickup.vel.set(0, 0, 0);
      pickup.pos.copy(pickup.sourceRestPosition); pickup.mesh.position.copy(pickup.pos);
      return false;
    }
    pickup.collected = true;
    pickup.state = "COLLECTED";
    pendingYields.delete(record.node); record.visual = null;
    pickup.mesh.visible = false;
    const idx = pickups.indexOf(pickup);
    if (idx !== -1) { releaseMesh(pickup); pickups.splice(idx, 1); }
    else if (pickup.mesh.parent) scene.remove(pickup.mesh);
    return true;
  }

  function ensureRestPositionClear(pickup) {
    const r = pickup._radius ?? getPickupRadius(pickup.resourceId);
    const exclude = pickup.sourceCollider ? [pickup.sourceCollider] : [];
    // If current pos overlaps, try lastClearPos, then nearby offsets
    if (!isPositionOverlappingSolid(pickup.pos, r, exclude)) return;
    if (pickup.lastClearPos && !isPositionOverlappingSolid(pickup.lastClearPos, r, exclude)) {
      pickup.pos.copy(pickup.lastClearPos);
      pickup.mesh.position.copy(pickup.pos);
      return;
    }
    // Try small radial nudges
    const tries = [
      { x: 0.35, z: 0 }, { x: -0.35, z: 0 }, { x: 0, z: 0.35 }, { x: 0, z: -0.35 },
      { x: 0.25, z: 0.25 }, { x: -0.25, z: 0.25 }, { x: 0.25, z: -0.25 }, { x: -0.25, z: -0.25 },
    ];
    for (const off of tries) {
      const cand = { x: pickup.pos.x + off.x, y: pickup.pos.y, z: pickup.pos.z + off.z };
      if (!isPositionOverlappingSolid(cand, r, exclude)) {
        pickup.pos.set(cand.x, cand.y, cand.z);
        pickup.mesh.position.copy(pickup.pos);
        return;
      }
    }
    // fallback: keep but will still magnet rescue
  }

  function update(dt, playerPos, playPickupSound, optsOrCollider) {
    let explicitPlayerCollider = null;
    if (optsOrCollider) {
      if (typeof optsOrCollider === "object" && optsOrCollider.collider) explicitPlayerCollider = optsOrCollider.collider;
      else if (optsOrCollider && typeof optsOrCollider.handle === "number") explicitPlayerCollider = optsOrCollider;
      else if (optsOrCollider && optsOrCollider.isCollider) explicitPlayerCollider = optsOrCollider;
    }
    const effectivePlayerCollider = explicitPlayerCollider ?? playerCollider;

    // Distant visuals give their pool slots back; their finite source records
    // remain available when approached again, rather than waiting for expiry.
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      if (p.age > 1 && Math.hypot(p.pos.x-playerPos.x,p.pos.z-playerPos.z) > Math.max(PICKUP_CONFIG.retentionRecallRadius,magnetRadius) + 2) retainPickup(p);
    }

    // A visual can be culled without discarding its yield. Re-present retained
    // sources only near the player, without evicting another active visual.
    for (const record of pendingYields.values()) {
      if (pickups.length >= MAX_ACTIVE) break;
      const base = record.node.state.position;
      if (!record.visual && sourceIsActive(record) && Math.hypot(base.x-playerPos.x,(base.y??0)-(playerPos.y??0),base.z-playerPos.z) <= PICKUP_CONFIG.retentionRecallRadius) materializeYield(record);
    }

    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      if (p.collected || p.state === "COLLECTED") { releaseMesh(p); pickups.splice(i, 1); continue; }
      p.age += dt;
      if (p.age > STALE_SECONDS) { retainPickup(p); continue; }
      p._retryRemaining = Math.max(0, (p._retryRemaining ?? 0) - dt);
      if (p._popTime !== undefined) {
        p._popTime += dt;
        const dur = 0.18;
        if (p._popTime < dur) { const t = p._popTime / dur; const s = 0.2 + (1 - 0.2) * (1 - Math.pow(1 - t, 3)); p.mesh.scale.set(s, s, s); }
        else { p.mesh.scale.set(1, 1, 1); p._popTime = undefined; }
      }
      p.mesh.rotation.y += dt * 3.2;
      p.mesh.rotation.x += dt * 1.4;

      if (p.state === "LAUNCHED") {
        const gravity = -9.8;
        const nx = p.pos.x + p.vel.x * dt;
        const ny = p.pos.y + (p.vel.y + gravity * dt * 0.5) * dt;
        const nz = p.pos.z + p.vel.z * dt;
        const intended = { x: nx, y: ny, z: nz };
        const r = p._radius ?? getPickupRadius(p.resourceId);
        const exclude = p.sourceCollider ? [p.sourceCollider] : [];
        const cast = castSphereBlocked({ x: p.pos.x, y: p.pos.y, z: p.pos.z }, intended, r, exclude);
        if (cast.blocked) {
          // Place just outside obstacle using toi
          const toi = cast.toi ?? 0;
          if (toi > 1e-4 && toi < 1.0) {
            const dirX = intended.x - p.pos.x, dirY = intended.y - p.pos.y, dirZ = intended.z - p.pos.z;
            const skin = 0.02;
            // move to just before impact
            const f = Math.max(0, toi - skin / (Math.hypot(dirX, dirY, dirZ) + 1e-6));
            p.pos.x = p.pos.x + dirX * f;
            p.pos.y = p.pos.y + dirY * f;
            p.pos.z = p.pos.z + dirZ * f;
            p.mesh.position.copy(p.pos);
          }
          p.vel.x *= 0.1; p.vel.z *= 0.1; p.vel.y = Math.min(0, p.vel.y);
          // Validate rest position not overlapping before marking RESTING
          ensureRestPositionClear(p);
          p.state = "RESTING";
          if (p.lastClearPos) p.lastClearPos.copy(p.pos);
        } else {
          p.vel.y += gravity * dt;
          p.pos.x = nx; p.pos.y = ny; p.pos.z = nz;
          // track last clear if not overlapping
          const r2 = p._radius ?? getPickupRadius(p.resourceId);
          const excl = p.sourceCollider ? [p.sourceCollider] : [];
          if (!isPositionOverlappingSolid(p.pos, r2, excl)) p.lastClearPos.copy(p.pos);
          const surface = getSurfaceY(p.pos.x, p.pos.z);
          const restY = surface + PICKUP_CONFIG.restHeight;
          if (p.pos.y <= restY) {
            p.pos.y = restY;
            p.vel.y = 0;
            p.vel.x *= 0.52; p.vel.z *= 0.52;
            if (Math.hypot(p.vel.x, p.vel.z) < 0.28) { ensureRestPositionClear(p); p.state = "RESTING"; p.vel.set(0, 0, 0); }
          }
          p.mesh.position.copy(p.pos);
          if (p.age > 0.55 && p.pos.y <= restY + 0.20) { ensureRestPositionClear(p); p.state = "RESTING"; }
        }
        if (p.state !== "LAUNCHED") p.mesh.position.copy(p.pos);
      } else if (p.state === "RESTING") {
        const surface = getSurfaceY(p.pos.x, p.pos.z);
        const restY = surface + PICKUP_CONFIG.restHeight;
        p.pos.y = restY;
        // Keep lastClearPos updated if currently clear (RESTING validation)
        const r = p._radius ?? getPickupRadius(p.resourceId);
        const excl = p.sourceCollider ? [p.sourceCollider] : [];
        if (!isPositionOverlappingSolid(p.pos, r, excl)) p.lastClearPos.copy(p.pos);
        p.mesh.position.copy(p.pos);
        p.mesh.position.y = restY + Math.sin(p.age * 3.2) * 0.04;
        if (p.mesh.userData.glow) p.mesh.userData.glow.material.opacity = 0.12 + Math.sin(p.age * 4) * 0.06;
        const dx = playerPos.x - p.pos.x; const dz = playerPos.z - p.pos.z; const dy = (playerPos.y ?? 0.5) - p.pos.y;
        const dist = Math.hypot(dx, dz, dy * 0.5);
        if (p._retryRemaining === 0 && p.age > HARVEST_CONFIG.magnetDelayAfterSpawn && dist <= magnetRadius) {
          p.state = "MAGNETIZING";
        }
      }
      if (p.state === "MAGNETIZING") {
        if (p.collected || p.state === "COLLECTED") continue;
        const dx = playerPos.x - p.mesh.position.x; const dy = (playerPos.y ?? 0.52) - p.mesh.position.y; const dz = playerPos.z - p.mesh.position.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist < PICKUP_CONFIG.collectionRadius) { collectPickup(p, playPickupSound); continue; }
        const len = dist > 1e-5 ? dist : 1;
        const nx = dx / len, ny = dy / len, nz = dz / len;
        const speed = magnetSpeed + magnetAccel * Math.min(0.8, p.age);
        const nextX = p.mesh.position.x + nx * speed * dt;
        const nextY = p.mesh.position.y + ny * speed * dt;
        const nextZ = p.mesh.position.z + nz * speed * dt;
        // MAGNETIZING ignores ALL world collision (intentional rescue) — move directly
        p.mesh.position.x = nextX; p.mesh.position.y = nextY; p.mesh.position.z = nextZ;
        p.pos.copy(p.mesh.position);
      }
      if (p.collected) p.state = "COLLECTED";
    }
  }

  function getInventory() { return { ...makeEmptyResourceMap(resourceDrops), ...inventoryAccess?.getResources?.() }; }
  function resetInventory() {
    // Compatibility name for existing HUD refresh callers. Never clears pack.
    onInventoryChanged?.(getInventory(), null);
    return getInventory();
  }
  function grantInventory(rewards = {}) {
    const result = inventoryAccess?.collect?.(rewards, { gathered: false })
      ?? { ok: false, added: {}, remaining: { ...rewards }, reason: 'inventory-unavailable' };
    onInventoryChanged?.(getInventory(), null);
    return result;
  }
  function spendInventory(cost = {}) {
    const result = inventoryAccess?.spend?.(cost);
    if (!result?.ok) return false;
    onInventoryChanged?.(getInventory(), null);
    return true;
  }
  function getPickups() { return pickups; }
  function getCount() { return pickups.length; }
  function getPooledCount() { return pool.length; }
  function getDebug() { return { active: pickups.length, pooled: pool.length, pendingSources: pendingYields.size }; }
  function getPendingYields() { return [...pendingYields.values()].map(r => ({ sourceId: r.node.id ?? r.node.index, regionId: r.node.regionId ?? r.node.state?.regionId ?? null, resources: { ...r.resources }, visible: !!r.visual })); }

  function setMagnetTuning(tuning = null) {
    const radius = tuning?.magnetRadius;
    const speed = tuning?.magnetSpeed;
    const accel = tuning?.magnetAccel;
    magnetRadius = Number.isFinite(radius) && radius > 0 ? radius : HARVEST_CONFIG.pickupMagnetRadius;
    magnetSpeed = Number.isFinite(speed) && speed > 0 ? speed : HARVEST_CONFIG.pickupMagnetSpeed;
    magnetAccel = Number.isFinite(accel) && accel > 0 ? accel : HARVEST_CONFIG.pickupMagnetAccel;
  }

  function getMagnetTuning() {
    return { magnetRadius, magnetSpeed, magnetAccel };
  }

  function clear({ discardPending = false } = {}) {
    for (const p of [...pickups]) retainPickup(p);
    // Departure, extraction and death may explicitly abandon transient field
    // yields with the ordinary resource-world reset. Literal reload rebuilds
    // that world too. None of these presentation resets may clear the pack;
    // region culling and ordinary clear() retain the source's pending yield.
    if (discardPending) pendingYields.clear();
  }
  function _clearActive() { clear(); }

  // Region culling removes visuals, preserving one yield at each source.
  // Also fallback position-based if regionId missing
  function cullInactiveRegions(activeSet, worldRegistry = null) {
    activeRegions = activeSet ? new Set(activeSet) : null;
    regionRegistry = worldRegistry ?? regionRegistry;
    if (activeRegions === null) return 0;
    const active = activeRegions;
    let culled = 0;
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      const rid = p.regionId;
      let isActive = true;
      if (rid) isActive = active.has(rid);
      else if (worldRegistry) {
        const region = worldRegistry.getRegionForPosition(p.pos);
        isActive = active.has(region);
      }
      if (!isActive) {
        retainPickup(p);
        culled++;
      }
    }
    return culled;
  }

  function setActiveRegions(activeSet) { return cullInactiveRegions(activeSet); }

  return { spawnPickup, collectPickup, update, getInventory, resetInventory, grantInventory, spendInventory, hasPendingYield, getPendingYields, getPickups, getCount, getPooledCount, getDebug, clear, _clearActive, cullInactiveRegions, setActiveRegions, _pool: pool, _shared: shared, setPlayerCollider, setPhysicsWorld, setMagnetTuning, getMagnetTuning, get playerCollider() { return playerCollider; }, PICKUP_CONFIG, getPickupRadius, isPositionOverlappingSolid, castSphereBlocked };
}
