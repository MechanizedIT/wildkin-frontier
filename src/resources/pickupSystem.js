// src/resources/pickupSystem.js — visible pickups with pooling, shared geometries, collision-aware scripted motion (Phase 2.2)
import * as THREE from "three";
import { HARVEST_CONFIG } from "./resourceConfig.js";

// Phase 2.2 enlarged pickup dimensions ~1.8-2x
export const PICKUP_CONFIG = {
  woodCubeSize: 0.42, // cube edge ~0.40-0.44
  stoneRadius: 0.32,  // ~0.30-0.34
  fiberRadius: 0.28,  // ~0.27-0.30
  glowScale: 1.8, // proportional
  restHeight: 0.26, // above surface (larger pickup)
  collectionRadius: 0.52,
  spawnMargin: 0.14,
  pickupRadius: { wood: 0.26, stone: 0.32, fiber: 0.28 },
};

function getPickupRadius(resourceId) {
  return PICKUP_CONFIG.pickupRadius[resourceId] ?? 0.26;
}

// Shared geometries/materials created once per system (reuse across spawns)
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

export function createPickupSystem(scene, physicsWorld = null, playground = null, onInventoryChanged) {
  // Allow overloaded signature: (scene, onInventoryChanged) legacy
  if (typeof physicsWorld === "function" && playground == null) {
    onInventoryChanged = physicsWorld;
    physicsWorld = null;
    playground = null;
  }
  // If second arg is object with onInventory etc
  if (physicsWorld && typeof physicsWorld === "object" && !physicsWorld.world && !physicsWorld.RAPIER) {
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
  // Player collider for magnetization exclusion (set via setPlayerCollider or update param)
  let playerCollider = null;

  function setPlayerCollider(collider) {
    playerCollider = collider ?? null;
  }
  // Allow external to set RAPIER/physicsWorld later
  function setPhysicsWorld(pw) {
    physicsWorld = pw;
    RAPIER = pw?.RAPIER ?? RAPIER;
  }

  // Helper: surface Y at x,z (elevated platforms else ground 0)
  function getSurfaceY(x, z) {
    if (playground && playground.platforms) {
      for (const p of playground.platforms) {
        if (x >= p.aabb.minX && x <= p.aabb.maxX && z >= p.aabb.minZ && z <= p.aabb.maxZ) {
          return p.height;
        }
      }
      return 0;
    }
    return 0;
  }

  // Helper: segment vs world boxes (fallback if Rapier raycast unavailable)
  function isSegmentBlockedAABB(a, b) {
    const obstacles = [];
    if (playground) {
      if (playground.obstacles) obstacles.push(...playground.obstacles);
      if (playground.platforms) {
        for (const p of playground.platforms) {
          obstacles.push({ aabb: p.aabb, height: p.height });
        }
      }
    }
    if (obstacles.length === 0) return false;
    const yA = a.y, yB = b.y;
    const yMin = Math.min(yA, yB) - 0.14;
    const yMax = Math.max(yA, yB) + 0.14;
    for (const o of obstacles) {
      const h = o.height ?? 1.0;
      if (yMin > h + 0.15) continue;
      const aabb = o.aabb;
      if (!aabb) continue;
      const minX = aabb.minX, maxX = aabb.maxX, minZ = aabb.minZ, maxZ = aabb.maxZ;
      const segMinX = Math.min(a.x, b.x), segMaxX = Math.max(a.x, b.x);
      const segMinZ = Math.min(a.z, b.z), segMaxZ = Math.max(a.z, b.z);
      if (segMaxX < minX || segMinX > maxX || segMaxZ < minZ || segMinZ > maxZ) continue;
      const midX = (a.x + b.x) * 0.5, midZ = (a.z + b.z) * 0.5;
      if (midX >= minX && midX <= maxX && midZ >= minZ && midZ <= maxZ) {
        const midY = (yA + yB) * 0.5;
        if (midY < h + 0.25) return true;
      }
      if (a.x >= minX && a.x <= maxX && a.z >= minZ && a.z <= maxZ && yA < h + 0.25) return true;
      if (b.x >= minX && b.x <= maxX && b.z >= minZ && b.z <= maxZ && yB < h + 0.25) return true;
    }
    return false;
  }

  // Build a filter predicate that excludes specific colliders (source + player)
  function makeExcludePredicate(excludeSet) {
    if (!excludeSet || excludeSet.size === 0) return null;
    return (collider) => {
      // collider is a Collider object; check handle or object identity
      for (const ex of excludeSet) {
        if (!ex) continue;
        if (ex === collider) return false;
        // also compare handles if available
        if (ex.handle !== undefined && collider.handle !== undefined && ex.handle === collider.handle) return false;
      }
      return true;
    };
  }

  function castRayBlocked(from, to, excludeColliders) {
    const dirX = to.x - from.x, dirY = to.y - from.y, dirZ = to.z - from.z;
    const len = Math.hypot(dirX, dirY, dirZ);
    if (len < 1e-5) return false;
    const nx = dirX / len, ny = dirY / len, nz = dirZ / len;
    const excludeSet = new Set();
    if (excludeColliders) {
      for (const c of excludeColliders) if (c) excludeSet.add(c);
    }
    // Try Rapier raycast if available
    if (RAPIER && physicsWorld && physicsWorld.world && typeof RAPIER.Ray === "function" && physicsWorld.world.castRay) {
      try {
        const ray = new RAPIER.Ray({ x: from.x, y: from.y, z: from.z }, { x: nx, y: ny, z: nz });
        // Try with filter predicate if we have excludes, else simple
        let hit = null;
        if (excludeSet.size > 0) {
          // Use predicate filtering if supported
          const pred = makeExcludePredicate(excludeSet);
          // Rapier expects filterPredicate as function(collider)=>boolean, where false excludes
          // Some versions use filterExcludeCollider param for single collider; we use predicate for multiple
          // Try calling with predicate as last arg
          try {
            hit = physicsWorld.world.castRay(ray, len, true, undefined, undefined, undefined, undefined, pred);
          } catch (_) {
            // fallback try exclude single collider if only one
            if (excludeSet.size === 1) {
              const single = [...excludeSet][0];
              hit = physicsWorld.world.castRay(ray, len, true, undefined, undefined, single, undefined, undefined);
              if (!hit) {
                // try with predicate as filterExcludeCollider alternative via handling manually
                hit = physicsWorld.world.castRay(ray, len, true);
                if (hit && pred && !pred(hit.collider ? hit.collider : null)) {
                  // if hit is excluded, ray is not considered blocked — need to check next hit
                  // For simplicity, use intersectionsWithRay to find non-excluded hit
                  let blocked = false;
                  let foundExcludedOnly = true;
                  physicsWorld.world.intersectionsWithRay(ray, len, true, (inter) => {
                    const col = inter.collider ? inter.collider() : null;
                    if (pred && col && !pred(col)) return true; // continue searching
                    // check if this hit is within len - epsilon
                    const toi = inter.timeOfImpact ?? inter.toi ?? inter.t ?? len + 1;
                    if (toi < len - 0.02) {
                      blocked = true;
                      foundExcludedOnly = false;
                      return false; // stop
                    }
                    return true;
                  }, undefined, undefined, undefined, undefined, pred);
                  return blocked;
                }
              }
            } else {
              // multiple excludes, try intersectionsWithRay with predicate
              let blocked = false;
              physicsWorld.world.intersectionsWithRay(ray, len, true, (inter) => {
                const col = inter.collider ? inter.collider() : null;
                const toi = inter.timeOfImpact ?? inter.toi ?? inter.t ?? len+1;
                if (toi >= len - 0.02) return true;
                if (pred && col && !pred(col)) return true; // excluded, continue
                blocked = true;
                return false;
              }, undefined, undefined, undefined, undefined, pred);
              if (blocked) return true;
              hit = null;
            }
          }
        } else {
          hit = physicsWorld.world.castRay(ray, len, true);
        }
        if (hit) {
          const toi = hit.timeOfImpact ?? hit.time_of_impact ?? hit.toi ?? hit.t ?? len + 1;
          // If hit collider is in exclude set, treat as not blocked
          if (excludeSet.size > 0) {
            const hitCollider = hit.collider ? (typeof hit.collider === "function" ? hit.collider() : hit.collider) : null;
            if (hitCollider) {
              for (const ex of excludeSet) {
                if (ex === hitCollider || (ex.handle !== undefined && hitCollider.handle !== undefined && ex.handle === hitCollider.handle)) {
                  // excluded — need to find next non-excluded hit
                  let blocked = false;
                  const pred = makeExcludePredicate(excludeSet);
                  physicsWorld.world.intersectionsWithRay(ray, len, true, (inter) => {
                    const c2 = inter.collider ? inter.collider() : null;
                    if (pred && c2 && !pred(c2)) return true;
                    const t2 = inter.timeOfImpact ?? inter.toi ?? inter.t ?? len+1;
                    if (t2 < len - 0.02) { blocked = true; return false; }
                    return true;
                  }, undefined, undefined, undefined, undefined, pred);
                  return blocked;
                }
              }
            }
          }
          if (toi < len - 0.02) return true;
        }
        if (physicsWorld.world.castRayAndGetNormal) {
          try {
            const ray2 = new RAPIER.Ray({ x: from.x, y: from.y, z: from.z }, { x: nx, y: ny, z: nz });
            let hit2 = null;
            if (excludeSet.size > 0) {
              const pred = makeExcludePredicate(excludeSet);
              hit2 = physicsWorld.world.castRayAndGetNormal(ray2, len, true, undefined, undefined, undefined, undefined, pred);
            } else {
              hit2 = physicsWorld.world.castRayAndGetNormal(ray2, len, true);
            }
            if (hit2 && hit2.timeOfImpact !== undefined && hit2.timeOfImpact < len - 0.02) {
              // check excluded
              if (excludeSet.size > 0 && hit2.collider) {
                const hc = typeof hit2.collider === "function" ? hit2.collider() : hit2.collider;
                for (const ex of excludeSet) if (ex === hc || (ex.handle !== undefined && hc.handle !== undefined && ex.handle === hc.handle)) return false;
              }
              return true;
            }
          } catch (_) {}
        }
      } catch (_) {}
    }
    // Fallback AABB (does not contain resource colliders, so no need to filter, but if it did, excluded would be ignored)
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
    // Scale glow proportionally to pickup size
    const r = getPickupRadius(resourceId);
    glow.scale.set(r / 0.26 * 0.95, r / 0.26 * 0.95, r / 0.26 * 0.95);
    m.add(glow);
    m.userData.glow = glow;
    m.userData.baseMat = mat;
    return m;
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
      return createPickupMesh(resourceId);
    }
    return createPickupMesh(resourceId);
  }

  function releaseMesh(pickup) {
    pickup.mesh.visible = false;
    scene.remove(pickup.mesh);
    if (pool.length < 24) pool.push({ mesh: pickup.mesh, resourceId: pickup.resourceId });
    else {
      if (pickup.mesh.material) pickup.mesh.material.dispose?.();
      if (pickup.mesh.userData.glow?.material) pickup.mesh.userData.glow.material.dispose?.();
    }
  }

  function spawnPickup(node) {
    if (pickups.length >= MAX_ACTIVE) {
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
    const he = type.colliderHalfExtents;
    const pickupR = getPickupRadius(resId);
    const margin = PICKUP_CONFIG.spawnMargin;
    let horizOffset;
    let angle = Math.random() * Math.PI * 2;
    if (type.solid && he) {
      const extent = Math.max(he.x, he.z);
      const clearance = extent + pickupR + margin;
      // Add small random outward to vary but never reduce below clearance
      horizOffset = clearance + Math.random() * 0.14;
    } else {
      // fiber non-solid: small offset
      horizOffset = 0.38 + Math.random() * 0.18;
      angle = Math.random() * Math.PI * 2;
    }
    const spawnY = (base.y ?? 0) + (type.dropOriginHeight ?? 0.55) + Math.random() * 0.18;
    const start = {
      x: base.x + Math.cos(angle) * horizOffset,
      y: spawnY,
      z: base.z + Math.sin(angle) * horizOffset,
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
      sourceCollider: node.collider ?? null,
      sourceColliderHandle: node.collider?.handle ?? null,
      _popTime: 0,
    };
    pickups.push(pickup);
    return pickup;
  }

  function collectPickup(pickup, playSound) {
    if (pickup.collected) return false;
    // Mark as collected and immediately transition to COLLECTED (terminal)
    pickup.collected = true;
    pickup.state = "COLLECTED";
    const key = pickup.resourceId;
    if (inventory[key] !== undefined) inventory[key] += 1;
    else inventory[pickup.resourceId] = (inventory[pickup.resourceId] ?? 0) + 1;
    if (onInventoryChanged) onInventoryChanged({ ...inventory }, pickup.resourceId);
    if (playSound) playSound(pickup.resourceId);
    // Immediately hide and release to pool (no trailing)
    pickup.mesh.visible = false;
    // Remove from active list and pool immediately if present
    const idx = pickups.indexOf(pickup);
    if (idx !== -1) {
      releaseMesh(pickup);
      pickups.splice(idx, 1);
    } else {
      // still hide even if not in array
      if (pickup.mesh.parent) scene.remove(pickup.mesh);
    }
    return true;
  }

  function update(dt, playerPos, playPickupSound, optsOrCollider) {
    // optsOrCollider may be playerCollider override or options object
    let explicitPlayerCollider = null;
    if (optsOrCollider) {
      if (typeof optsOrCollider === "object" && optsOrCollider.collider) explicitPlayerCollider = optsOrCollider.collider;
      else if (optsOrCollider && typeof optsOrCollider.handle === "number") explicitPlayerCollider = optsOrCollider;
      else if (optsOrCollider && optsOrCollider.isCollider) explicitPlayerCollider = optsOrCollider;
    }
    const effectivePlayerCollider = explicitPlayerCollider ?? playerCollider;

    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      if (p.collected || p.state === "COLLECTED") {
        // Should have been removed on collect, but handle stale
        releaseMesh(p);
        pickups.splice(i, 1);
        continue;
      }
      p.age += dt;
      if (p.age > STALE_SECONDS) {
        releaseMesh(p);
        pickups.splice(i, 1);
        continue;
      }
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
        const nx = p.pos.x + p.vel.x * dt;
        const ny = p.pos.y + (p.vel.y + gravity * dt * 0.5) * dt;
        const nz = p.pos.z + p.vel.z * dt;
        const intended = { x: nx, y: ny, z: nz };
        const exclude = p.sourceCollider ? [p.sourceCollider] : [];
        if (castRayBlocked({ x: p.pos.x, y: p.pos.y, z: p.pos.z }, intended, exclude)) {
          p.vel.x *= 0.1;
          p.vel.z *= 0.1;
          p.vel.y = Math.min(0, p.vel.y);
          p.state = "RESTING";
        } else {
          p.vel.y += gravity * dt;
          p.pos.x = nx; p.pos.y = ny; p.pos.z = nz;
          const surface = getSurfaceY(p.pos.x, p.pos.z);
          const restY = surface + PICKUP_CONFIG.restHeight;
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
          p.mesh.position.copy(p.pos);
        }
      } else if (p.state === "RESTING") {
        const surface = getSurfaceY(p.pos.x, p.pos.z);
        const restY = surface + PICKUP_CONFIG.restHeight;
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
        // Never allow collected to re-enter magnetizing/resting
        if (p.collected || p.state === "COLLECTED") { continue; }
        const dx = playerPos.x - p.mesh.position.x;
        const dy = (playerPos.y ?? 0.52) - p.mesh.position.y;
        const dz = playerPos.z - p.mesh.position.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist < PICKUP_CONFIG.collectionRadius) {
          collectPickup(p, playPickupSound);
          continue;
        }
        const len = dist > 1e-5 ? dist : 1;
        const nx = dx / len, ny = dy / len, nz = dz / len;
        const speed = HARVEST_CONFIG.pickupMagnetSpeed + HARVEST_CONFIG.pickupMagnetAccel * Math.min(0.8, p.age);
        const nextX = p.mesh.position.x + nx * speed * dt;
        const nextY = p.mesh.position.y + ny * speed * dt;
        const nextZ = p.mesh.position.z + nz * speed * dt;
        const exclude = [];
        if (p.sourceCollider) exclude.push(p.sourceCollider);
        if (effectivePlayerCollider) exclude.push(effectivePlayerCollider);
        if (castRayBlocked({ x: p.mesh.position.x, y: p.mesh.position.y, z: p.mesh.position.z }, { x: nextX, y: nextY, z: nextZ }, exclude)) {
          p.state = "RESTING";
          p.pos.copy(p.mesh.position);
        } else {
          p.mesh.position.x = nextX; p.mesh.position.y = nextY; p.mesh.position.z = nextZ;
          p.pos.copy(p.mesh.position);
        }
        // If collection succeeded after move, next loop will collect
      }
      // Ensure collected never falls back to resting/magnetizing
      if (p.collected) {
        p.state = "COLLECTED";
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

  return { spawnPickup, collectPickup, update, getInventory, resetInventory, getPickups, getCount, getPooledCount, getDebug, inventory, _pool: pool, _shared: shared, setPlayerCollider, setPhysicsWorld, get playerCollider() { return playerCollider; }, PICKUP_CONFIG, getPickupRadius };
}
