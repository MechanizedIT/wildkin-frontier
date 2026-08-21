// src/resources/pickupSystem.js — visible pickups with pooling, shared geometries, collision-aware scripted motion
import * as THREE from "three";
import { HARVEST_CONFIG } from "./resourceConfig.js";

// Shared geometries/materials created once per system (reuse across spawns)
let SHARED = null;
function getShared() {
  if (SHARED) return SHARED;
  const woodGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
  const stoneGeo = new THREE.DodecahedronGeometry(0.18, 0);
  const fiberGeo = new THREE.SphereGeometry(0.16, 7, 5);
  fiberGeo.scale(1, 0.85, 1);
  const glowGeo = new THREE.SphereGeometry(0.26, 6, 6);
  const woodMatProto = new THREE.MeshStandardMaterial({ color: 0x8d5a2b, flatShading: true, emissive: 0x332000, emissiveIntensity: 0.18 });
  const stoneMatProto = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, flatShading: true });
  const fiberMatProto = new THREE.MeshStandardMaterial({ color: 0x6abf69, flatShading: true, emissive: 0x123412, emissiveIntensity: 0.12 });
  const glowMatProto = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 });
  SHARED = { woodGeo, stoneGeo, fiberGeo, glowGeo, woodMatProto, stoneMatProto, fiberMatProto, glowMatProto };
  return SHARED;
}

export function createPickupSystem(scene, physicsWorld = null, playground = null, onInventoryChanged) {
  // Allow overloaded signature: (scene, onInventoryChanged) legacy
  if (typeof physicsWorld === "function" && playground == null) {
    onInventoryChanged = physicsWorld;
    physicsWorld = null;
    playground = null;
  }
  // If second arg is object with onInventory etc
  if (physicsWorld && typeof physicsWorld === "object" && !physicsWorld.world && !physicsWorld.RAPIER) {
    // Might be playground passed as second arg? Check
    if (physicsWorld.obstacles && !playground) {
      playground = physicsWorld;
      physicsWorld = null;
    }
  }

  const shared = getShared();
  const pickups = [];
  const pool = [];
  const inventory = { wood: 0, stone: 0, fiber: 0 };
  let nextId = 0;
  const MAX_ACTIVE = 32;
  const STALE_SECONDS = 30;
  // Temp vectors to avoid per-frame allocations
  const tmpDir = new THREE.Vector3();
  const tmpPos = new THREE.Vector3();
  let RAPIER = physicsWorld?.RAPIER ?? null;
  if (!RAPIER && physicsWorld && physicsWorld.RAPIER) RAPIER = physicsWorld.RAPIER;

  // Helper: surface Y at x,z (elevated platforms else ground 0)
  function getSurfaceY(x, z) {
    // Check playground platforms first if available (accurate)
    if (playground && playground.platforms) {
      for (const p of playground.platforms) {
        if (x >= p.aabb.minX && x <= p.aabb.maxX && z >= p.aabb.minZ && z <= p.aabb.maxZ) {
          return p.height;
        }
      }
      return 0;
    }
    // Fallback: if physicsWorld has staticColliders? Use generic 0
    return 0;
  }

  // Helper: segment vs world boxes (fallback if Rapier raycast unavailable)
  function isSegmentBlockedAABB(a, b) {
    // Check against playground obstacles + platforms side? Use playground obstacles + platforms as blocking volumes
    const obstacles = [];
    if (playground) {
      if (playground.obstacles) obstacles.push(...playground.obstacles);
      if (playground.platforms) {
        for (const p of playground.platforms) {
          // Side volume of platform is solid from y 0 to height
          obstacles.push({ aabb: p.aabb, height: p.height });
        }
      }
    }
    // No obstacles known -> not blocked
    if (obstacles.length === 0) return false;
    // Sample midpoint and check AABB intersect for segment? Use simple: check if segment passes through expanded AABB via sampling + closest point
    // For low-cost, check if either endpoint inside an obstacle AABB (and y within height)
    // and also if segment intersects AABB in XZ plane and y range overlaps
    const yA = a.y, yB = b.y;
    const yMin = Math.min(yA, yB) - 0.14;
    const yMax = Math.max(yA, yB) + 0.14;
    for (const o of obstacles) {
      const h = o.height ?? 1.0;
      // If both points are above obstacle top + 0.2, not blocking
      if (yMin > h + 0.15) continue;
      // Simple XZ segment vs expanded AABB check via Liang-Barsky
      const aabb = o.aabb;
      if (!aabb) continue;
      const minX = aabb.minX, maxX = aabb.maxX, minZ = aabb.minZ, maxZ = aabb.maxZ;
      // Check if segment XZ intersects AABB
      // Use Cohen-Sutherland like check: if both points outside same side, no intersect
      // Check overlap of segment bounding box with AABB
      const segMinX = Math.min(a.x, b.x), segMaxX = Math.max(a.x, b.x);
      const segMinZ = Math.min(a.z, b.z), segMaxZ = Math.max(a.z, b.z);
      if (segMaxX < minX || segMinX > maxX || segMaxZ < minZ || segMinZ > maxZ) continue;
      // XZ overlap -> check if length within AABB is non-negligible: sample midpoint inside?
      const midX = (a.x + b.x) * 0.5, midZ = (a.z + b.z) * 0.5;
      if (midX >= minX && midX <= maxX && midZ >= minZ && midZ <= maxZ) {
        // If y at midpoint is below top, it's inside wall -> blocked
        const midY = (yA + yB) * 0.5;
        if (midY < h + 0.25) return true;
      }
      // Also check endpoint inside
      if (a.x >= minX && a.x <= maxX && a.z >= minZ && a.z <= maxZ && yA < h + 0.25) return true;
      if (b.x >= minX && b.x <= maxX && b.z >= minZ && b.z <= maxZ && yB < h + 0.25) return true;
    }
    return false;
  }

  function castRayBlocked(from, to) {
    const dirX = to.x - from.x, dirY = to.y - from.y, dirZ = to.z - from.z;
    const len = Math.hypot(dirX, dirY, dirZ);
    if (len < 1e-5) return false;
    const nx = dirX / len, ny = dirY / len, nz = dirZ / len;
    // Try Rapier raycast if available
    if (RAPIER && physicsWorld && physicsWorld.world && typeof RAPIER.Ray === "function" && physicsWorld.world.castRay) {
      try {
        const ray = new RAPIER.Ray({ x: from.x, y: from.y, z: from.z }, { x: nx, y: ny, z: nz });
        const hit = physicsWorld.world.castRay(ray, len, true);
        if (hit) {
          // Compat returns object with time_of_impact / toi
          const toi = hit.timeOfImpact ?? hit.time_of_impact ?? hit.toi ?? hit.t ?? len + 1;
          if (toi < len - 0.02) return true;
        }
        // Alternative: castRayAndGetNormal
        if (physicsWorld.world.castRayAndGetNormal) {
          const hit2 = physicsWorld.world.castRayAndGetNormal(ray, len, true);
          if (hit2 && hit2.timeOfImpact !== undefined && hit2.timeOfImpact < len - 0.02) return true;
        }
      } catch (_) {}
    }
    // Fallback AABB
    return isSegmentBlockedAABB(from, to);
  }

  function createPickupMesh(resourceId) {
    const s = shared;
    let geo, matProto;
    if (resourceId === "wood") { geo = s.woodGeo; matProto = s.woodMatProto; }
    else if (resourceId === "stone") { geo = s.stoneGeo; matProto = s.stoneMatProto; }
    else { geo = s.fiberGeo; matProto = s.fiberMatProto; }
    const mat = matProto.clone();
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = false;
    const glowMat = s.glowMatProto.clone();
    const glow = new THREE.Mesh(s.glowGeo, glowMat);
    m.add(glow);
    m.userData.glow = glow;
    m.userData.baseMat = mat;
    return m;
  }

  function acquireMesh(resourceId) {
    // Try pool first (reuse mesh of any type? Prefer same type but allow any and swap geo/mat)
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
    // Any pooled mesh available: reuse by swapping geometry/material
    if (pool.length > 0) {
      const entry = pool.pop();
      // Rebuild geometry/material for new type
      // Dispose old mesh and create new? Simpler create new mesh and discard pooled mesh geometries (shared so no dispose)
      scene.remove(entry.mesh);
      return createPickupMesh(resourceId);
    }
    return createPickupMesh(resourceId);
  }

  function releaseMesh(pickup) {
    // Hide and pool
    pickup.mesh.visible = false;
    scene.remove(pickup.mesh);
    // Avoid unbounded pool — cap 24
    if (pool.length < 24) pool.push({ mesh: pickup.mesh, resourceId: pickup.resourceId });
    else {
      // dispose cloned material to avoid leak (shared geo stays)
      if (pickup.mesh.material) pickup.mesh.material.dispose?.();
      if (pickup.mesh.userData.glow?.material) pickup.mesh.userData.glow.material.dispose?.();
    }
  }

  function spawnPickup(node) {
    // Enforce active cap: if at cap, remove oldest non-magnetizing
    if (pickups.length >= MAX_ACTIVE) {
      // find oldest RESTING
      let idx = -1;
      for (let i = 0; i < pickups.length; i++) if (pickups[i].state === "RESTING") { idx = i; break; }
      if (idx === -1) idx = 0;
      const old = pickups[idx];
      releaseMesh(old);
      pickups.splice(idx, 1);
    }
    const resId = node.type.resourceId;
    const mesh = acquireMesh(resId);
    const base = node.state.position;
    const type = node.type;
    // spawn outside collider to avoid instant wall collision
    const he = type.colliderHalfExtents;
    const clearance = he ? Math.max(he.x, he.z) + 0.18 : 0.35;
    const angle = Math.random() * Math.PI * 2;
    const horizOffset = clearance + Math.random() * 0.16;
    const spawnY = (base.y ?? 0) + (type.dropOriginHeight ?? 0.55) + Math.random() * 0.18;
    const start = {
      x: base.x + Math.cos(angle) * horizOffset * 0.55,
      y: spawnY,
      z: base.z + Math.sin(angle) * horizOffset * 0.55,
    };
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
      mesh,
      resourceId: resId,
      pos: new THREE.Vector3(start.x, start.y, start.z),
      vel: new THREE.Vector3(outward.x, outward.y, outward.z),
      age: 0,
      state: "LAUNCHED",
      collected: false,
      nodeIndex: node.index,
      _popTime: 0,
    };
    pickups.push(pickup);
    return pickup;
  }

  function collectPickup(pickup, playSound) {
    if (pickup.collected) return false;
    pickup.collected = true;
    const key = pickup.resourceId;
    if (inventory[key] !== undefined) inventory[key] += 1;
    else inventory[pickup.resourceId] = (inventory[pickup.resourceId] ?? 0) + 1;
    if (onInventoryChanged) onInventoryChanged({ ...inventory }, pickup.resourceId);
    if (playSound) playSound(pickup.resourceId);
    pickup.mesh.visible = false;
    return true;
  }

  function update(dt, playerPos, playPickupSound) {
    // Temp reused vector for magnet
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      if (p.collected) {
        releaseMesh(p);
        pickups.splice(i, 1);
        continue;
      }
      p.age += dt;
      // stale expiry
      if (p.age > STALE_SECONDS) {
        releaseMesh(p);
        pickups.splice(i, 1);
        continue;
      }
      // pop scale
      if (p._popTime !== undefined) {
        p._popTime += dt;
        const dur = 0.18;
        if (p._popTime < dur) {
          const t = p._popTime / dur;
          const s = 0.2 + (1 - 0.2) * (1 - Math.pow(1 - t, 3));
          p.mesh.scale.set(s, s, s);
        } else {
          p.mesh.scale.set(1, 1, 1);
          p._popTime = undefined;
        }
      }
      p.mesh.rotation.y += dt * 3.2;
      p.mesh.rotation.x += dt * 1.4;

      if (p.state === "LAUNCHED") {
        const gravity = -9.8;
        // Intended next position
        const nx = p.pos.x + p.vel.x * dt;
        const ny = p.pos.y + (p.vel.y + gravity * dt * 0.5) * dt;
        const nz = p.pos.z + p.vel.z * dt;
        const intended = { x: nx, y: ny, z: nz };
        // Collision-aware segment check
        if (castRayBlocked({ x: p.pos.x, y: p.pos.y, z: p.pos.z }, intended)) {
          // Blocked: stop horizontal, drop vertically, transition to RESTING near block point
          p.vel.x *= 0.1;
          p.vel.z *= 0.1;
          p.vel.y = Math.min(0, p.vel.y);
          // nudge slightly away? Just halt
          p.state = "RESTING";
          // Keep pos at current (before wall)
        } else {
          p.vel.y += gravity * dt;
          p.pos.x = nx; p.pos.y = ny; p.pos.z = nz;
          // surface check
          const surface = getSurfaceY(p.pos.x, p.pos.z);
          const restY = surface + 0.14;
          if (p.pos.y <= restY) {
            p.pos.y = restY;
            p.vel.y = 0;
            p.vel.x *= 0.52;
            p.vel.z *= 0.52;
            if (Math.hypot(p.vel.x, p.vel.z) < 0.28) {
              p.state = "RESTING";
              p.vel.set(0, 0, 0);
            }
          }
          p.mesh.position.copy(p.pos);
          if (p.age > 0.55 && p.pos.y <= restY + 0.20) p.state = "RESTING";
        }
        if (p.state !== "LAUNCHED") {
          // Ensure mesh at pos
          p.mesh.position.copy(p.pos);
        }
      } else if (p.state === "RESTING") {
        // Keep at surface
        const surface = getSurfaceY(p.pos.x, p.pos.z);
        const restY = surface + 0.14;
        p.pos.y = restY;
        p.mesh.position.copy(p.pos);
        p.mesh.position.y = restY + Math.sin(p.age * 3.2) * 0.04;
        if (p.mesh.userData.glow) p.mesh.userData.glow.material.opacity = 0.12 + Math.sin(p.age * 4) * 0.06;
        const dx = playerPos.x - p.pos.x;
        const dz = playerPos.z - p.pos.z;
        const dy = (playerPos.y ?? 0.5) - p.pos.y;
        const dist = Math.hypot(dx, dz, dy * 0.5);
        if (p.age > HARVEST_CONFIG.magnetDelayAfterSpawn && dist <= HARVEST_CONFIG.pickupMagnetRadius) {
          p.state = "MAGNETIZING";
        }
      }
      if (p.state === "MAGNETIZING") {
        const dx = playerPos.x - p.mesh.position.x;
        const dy = (playerPos.y ?? 0.52) - p.mesh.position.y;
        const dz = playerPos.z - p.mesh.position.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist < 0.34) {
          collectPickup(p, playPickupSound);
          continue;
        }
        const len = dist > 1e-5 ? dist : 1;
        const nx = dx / len, ny = dy / len, nz = dz / len;
        const speed = HARVEST_CONFIG.pickupMagnetSpeed + HARVEST_CONFIG.pickupMagnetAccel * Math.min(0.8, p.age);
        // Check magnet path blocked?
        const nextX = p.mesh.position.x + nx * speed * dt;
        const nextY = p.mesh.position.y + ny * speed * dt;
        const nextZ = p.mesh.position.z + nz * speed * dt;
        if (castRayBlocked({ x: p.mesh.position.x, y: p.mesh.position.y, z: p.mesh.position.z }, { x: nextX, y: nextY, z: nextZ })) {
          // If blocked during magnet, stop magnet and return to resting (avoid flying through wall)
          p.state = "RESTING";
          p.pos.copy(p.mesh.position);
        } else {
          p.mesh.position.x = nextX; p.mesh.position.y = nextY; p.mesh.position.z = nextZ;
          p.pos.copy(p.mesh.position);
        }
      }
    }
  }

  function getInventory() { return { ...inventory }; }
  function resetInventory() {
    inventory.wood = 0; inventory.stone = 0; inventory.fiber = 0;
    if (onInventoryChanged) onInventoryChanged({ ...inventory }, null);
  }
  function getPickups() { return pickups; }
  function getCount() { return pickups.length; }
  function getPooledCount() { return pool.length; }
  function getDebug() { return { active: pickups.length, pooled: pool.length }; }

  return { spawnPickup, collectPickup, update, getInventory, resetInventory, getPickups, getCount, getPooledCount, getDebug, inventory, _pool: pool, _shared: shared };
}
