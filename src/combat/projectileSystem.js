// src/combat/projectileSystem.js — pooled slow projectiles, collision-aware, once-only damage
import * as THREE from "three";
import { PROJECTILE_CONFIG, SPITTER_CONFIG } from "./combatConfig.js";

export function createProjectileSystem(scene, physicsWorld, playground) {
  const projectiles = [];
  const pool = [];
  const MAX_ACTIVE = 16;
  const MAX_POOL = 16;

  let RAPIER = physicsWorld?.RAPIER ?? null;
  let playerPosRef = { x: 0, y: 0.5, z: 0 };
  let playerStateRef = null;
  let isPlayerInvuln = () => false;
  let onPlayerDamage = (dmg, pos) => {};

  function setPlayerPos(pos) { playerPosRef = pos; }
  function setPlayerState(st) { playerStateRef = st; }
  function setInvulnChecker(fn) { isPlayerInvuln = fn; }
  function setDamageCallback(fn) { onPlayerDamage = fn; }

  // Shared geometry/material
  let sharedGeo = null;
  let sharedMat = null;
  function getShared() {
    if (!sharedGeo) {
      sharedGeo = new THREE.SphereGeometry(PROJECTILE_CONFIG.radius, 10, 8);
      sharedMat = new THREE.MeshStandardMaterial({ color: 0x8a5cff, emissive: 0x4a2aaa, emissiveIntensity: 0.35, flatShading: true });
    }
    return { geo: sharedGeo, mat: sharedMat };
  }

  function acquireMesh() {
    if (pool.length > 0) {
      const entry = pool.pop();
      entry.mesh.visible = true;
      entry.mesh.scale.set(1, 1, 1);
      scene.add(entry.mesh);
      return entry.mesh;
    }
    const { geo, mat } = getShared();
    const m = new THREE.Mesh(geo, mat.clone());
    m.castShadow = false;
    scene.add(m);
    return m;
  }

  function releaseMesh(proj) {
    proj.mesh.visible = false;
    scene.remove(proj.mesh);
    if (pool.length < MAX_POOL) pool.push({ mesh: proj.mesh });
    else proj.mesh.material.dispose?.();
  }

  function getSurfaceY(x, z) {
    if (playground && playground.platforms) {
      for (const p of playground.platforms) {
        if (x >= p.aabb.minX && x <= p.aabb.maxX && z >= p.aabb.minZ && z <= p.aabb.maxZ) return p.height;
      }
    }
    return 0;
  }

    // --- helpers for actor-aware swept projectile ---

  let playerColliderRef = null;
  let getWildkinActors = () => []; // returns array of creature objects with state.pos and cfg
  let onWildkinDamage = null; // (creature, dmg, pos) => boolean
  // legacy single callback for player damage provided via setDamageCallback; wildkin damage via setWildkinDamageCallback
  function setPlayerCollider(collider) { playerColliderRef = collider ?? null; }
  function setWildkinProvider(fn) { getWildkinActors = typeof fn === "function" ? fn : () => []; }
  function setWildkinDamageCallback(fn) { onWildkinDamage = fn; }

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

  function castWorldBlocked(from, to, radius, excludeColliders) {
    const dirX = to.x - from.x, dirY = to.y - from.y, dirZ = to.z - from.z;
    const len = Math.hypot(dirX, dirY, dirZ);
    if (len < 1e-5) {
      // point check: see if inside world geometry (excluding actors) — treat as not blocked for zero move
      return { blocked: false, toi: 1 };
    }
    const excludeSet = new Set();
    if (excludeColliders) for (const c of excludeColliders) if (c) excludeSet.add(c);
    const pred = makeExcludePredicate(excludeSet);
    if (RAPIER && physicsWorld && physicsWorld.world && typeof RAPIER.Ball === "function" && physicsWorld.world.castShape) {
      try {
        const shape = new RAPIER.Ball(radius);
        const rot = { x: 0, y: 0, z: 0, w: 1 };
        const vel = { x: dirX, y: dirY, z: dirZ };
        // signature: castShape(origin, rot, vel, shape, maxToi? Use params as in pickupSystem: from, rot, vel, shape, 0,1,true,pred
        const hit = physicsWorld.world.castShape(from, rot, vel, shape, 0, 1.0, true, undefined, undefined, undefined, undefined, pred);
        if (hit) {
          const toi = hit.timeOfImpact ?? hit.toi ?? 0;
          if (toi < 1.0 - 1e-4) return { blocked: true, toi };
        }
        return { blocked: false, toi: 1 };
      } catch (_) {}
    }
    // Fallback AABB (does not include actor colliders, so fine)
    if (!playground) return { blocked: false, toi: 1 };
    const obstacles = [];
    if (playground.obstacles) obstacles.push(...playground.obstacles);
    if (playground.platforms) for (const p of playground.platforms) obstacles.push({ aabb: p.aabb, height: p.height });
    const midX = (from.x + to.x) * 0.5, midZ = (from.z + to.z) * 0.5, midY = (from.y + to.y) * 0.5;
    for (const o of obstacles) {
      const h = o.height ?? 1.0;
      if (midY > h + radius + 0.1) continue;
      const aabb = o.aabb;
      if (!aabb) continue;
      const minX = aabb.minX - radius, maxX = aabb.maxX + radius, minZ = aabb.minZ - radius, maxZ = aabb.maxZ + radius;
      if (midX >= minX && midX <= maxX && midZ >= minZ && midZ <= maxZ && midY < h + radius + 0.1) return { blocked: true, toi: 0.5 };
    }
    return { blocked: false, toi: 1 };
  }

  // Ray (sphere center) vs expanded capsule (vertical)
  function rayVsExpandedCapsule(rayOrigin, rayDirNorm, rayLen, capCenter, capHalfHeight, capRadiusExpanded) {
    // cylinder part
    const cx = capCenter.x, cy = capCenter.y, cz = capCenter.z;
    const ox = rayOrigin.x, oy = rayOrigin.y, oz = rayOrigin.z;
    const dx = rayDirNorm.x, dy = rayDirNorm.y, dz = rayDirNorm.z;
    const r = capRadiusExpanded;
    // early check: inside capsule at origin?
    // compute closest point but skip; just intersect
    let bestT = Infinity;
    // cylinder infinite: a* t^2 + b*t + c =0 with xz radial
    const a = dx * dx + dz * dz;
    const ocx = ox - cx;
    const ocz = oz - cz;
    const b = 2 * (ocx * dx + ocz * dz);
    const c = ocx * ocx + ocz * ocz - r * r;
    if (Math.abs(a) > 1e-8) {
      const disc = b * b - 4 * a * c;
      if (disc >= 0) {
        const s = Math.sqrt(disc);
        const t0 = (-b - s) / (2 * a);
        const t1 = (-b + s) / (2 * a);
        for (const t of [t0, t1]) {
          if (t >= -1e-6 && t <= rayLen + 1e-6) {
            const y = oy + t * dy;
            if (y >= cy - capHalfHeight - 1e-6 && y <= cy + capHalfHeight + 1e-6) {
              if (t < bestT) bestT = t;
            }
          }
        }
      }
    } else {
      // ray parallel to axis (vertical) or moving only Y
      if (c <= 0) {
        // inside radial cylinder slab: find y entry
        const y0 = oy;
        const yEnd = oy + rayLen * dy;
        // interval of y inside caps: find t where y enters [-h, h]
        // Solve y(t)= oy + t*dy within [cy-h, cy+h]
        if (Math.abs(dy) > 1e-8) {
          let tEnter = (cy - capHalfHeight - oy) / dy;
          let tExit = (cy + capHalfHeight - oy) / dy;
          if (tEnter > tExit) { const tmp = tEnter; tEnter = tExit; tExit = tmp; }
          const tClipEnter = Math.max(tEnter, 0);
          const tClipExit = Math.min(tExit, rayLen);
          if (tClipEnter <= tClipExit + 1e-6) {
            if (tClipEnter < bestT) bestT = tClipEnter;
          }
        } else {
          // pure XZ zero, check y inside
          if (oy >= cy - capHalfHeight && oy <= cy + capHalfHeight) bestT = 0;
        }
      }
    }
    // sphere caps
    function sphereHit(sy) {
      const scx = cx, scy = sy, scz = cz;
      const lx = ox - scx, ly = oy - scy, lz = oz - scz;
      const b2 = 2 * (lx * dx + ly * dy + lz * dz);
      const c2 = lx * lx + ly * ly + lz * lz - r * r;
      const disc2 = b2 * b2 - 4 * c2; // a=1 because dir normalized
      if (disc2 < 0) return;
      const s2 = Math.sqrt(disc2);
      const t0 = (-b2 - s2) / 2;
      const t1 = (-b2 + s2) / 2;
      for (const t of [t0, t1]) {
        if (t >= -1e-6 && t <= rayLen + 1e-6) {
          if (t < bestT) bestT = t;
        }
      }
    }
    sphereHit(cy + capHalfHeight);
    sphereHit(cy - capHalfHeight);
    if (bestT === Infinity) return null;
    if (bestT < 0) bestT = 0;
    return bestT / (rayLen > 1e-8 ? rayLen : 1); // normalized toi 0..1
  }

  // Keep legacy name for compatibility
  function isSegmentBlocked(from, to, radius) {
    const res = castWorldBlocked(from, to, radius, null);
    return res.blocked;
  }

  function spawnProjectile(origin, direction, owner) {
    if (projectiles.length >= MAX_ACTIVE) {
      // recycle oldest
      const old = projectiles.shift();
      releaseMesh(old);
    }
    const mesh = acquireMesh();
    const start = { x: origin.x, y: origin.y + 0.35, z: origin.z };
    // offset forward a bit
    start.x += direction.x * 0.45;
    start.z += direction.z * 0.45;
    mesh.position.set(start.x, start.y, start.z);
    mesh.visible = true;
    const speed = SPITTER_CONFIG.projectileSpeed ?? PROJECTILE_CONFIG.speed;
    const vel = new THREE.Vector3(direction.x * speed, 0.08 + Math.random() * 0.04, direction.z * speed); // slight upward
    const proj = {
      id: Math.random().toString(36).slice(2),
      mesh,
      pos: new THREE.Vector3(start.x, start.y, start.z),
      vel,
      age: 0,
      lifetime: PROJECTILE_CONFIG.lifetime,
      damage: SPITTER_CONFIG.damage ?? 1,
      owner,
      hasHit: false,
      radius: PROJECTILE_CONFIG.radius,
    };
    projectiles.push(proj);
    return proj;
  }

  function update(dt) {
    // Gather alive actors for world exclusion (avoid treating them as world)
    const wildkins = getWildkinActors ? getWildkinActors() : [];
    // Build exclude list for world cast: player capsule + all alive wildkin colliders
    const worldExclude = [];
    if (playerColliderRef) worldExclude.push(playerColliderRef);
    for (const w of wildkins) {
      if (w && w.collider) worldExclude.push(w.collider);
      else if (w && w.state && w.collider) worldExclude.push(w.collider);
    }
    // Also exclude owner collider if owner is creature with collider (already in wildkins) but ensure owner excluded
    // Will be included already; extra add if owner not in list
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.age += dt;
      if (p.age >= p.lifetime) {
        releaseMesh(p);
        projectiles.splice(i, 1);
        continue;
      }
      const prev = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
      // gravity light? Keep roughly level — apply before computing next? Keep consistent with previous order: compute next with current vel then apply gravity to vel after
      // For swept we compute next first then apply gravity effect next frame; keep same as before but ensure gravity applied to vel before next sweep? We compute next then after apply gravity to vel for next iteration
      const next = {
        x: p.pos.x + p.vel.x * dt,
        y: p.pos.y + p.vel.y * dt,
        z: p.pos.z + p.vel.z * dt,
      };
      p.vel.y -= 1.2 * dt; // slight drop for next frame

      const dirX = next.x - prev.x, dirY = next.y - prev.y, dirZ = next.z - prev.z;
      const rayLen = Math.hypot(dirX, dirY, dirZ);
      let rayDirNorm = { x: 0, y: 0, z: 0 };
      if (rayLen > 1e-6) {
        rayDirNorm.x = dirX / rayLen;
        rayDirNorm.y = dirY / rayLen;
        rayDirNorm.z = dirZ / rayLen;
      }

      // World blocking (excluding actors)
      // Also exclude owner-specific collider if needed (owner already excluded if wildkin)
      const ownerCollider = p.owner?.collider ?? p.owner?.state?.collider ?? null;
      const worldExcludeForThis = ownerCollider && !worldExclude.includes(ownerCollider) ? [...worldExclude, ownerCollider] : worldExclude;
      const worldRes = castWorldBlocked(prev, next, p.radius, worldExcludeForThis);
      const worldToi = worldRes.blocked ? worldRes.toi : 1.0 + 1e-6;

      // Actor sweep tests (radius-aware)
      let bestActor = null;
      let bestType = null; // 'player' | 'wildkin'
      let bestToi = Infinity;
      let bestCreature = null;

      if (!p.hasHit) {
        // Player hit (independent of facing, owner exclusion)
        const isOwnerPlayer = p.owner && (p.owner === "player" || p.owner.actorType === "player" || p.owner.isPlayer);
        if (!isOwnerPlayer) {
          const playerCapCenter = { x: playerPosRef.x, y: playerPosRef.y ?? 0.5, z: playerPosRef.z };
          const playerHalf = 0.20;
          const playerRadExp = 0.32 + p.radius;
          if (rayLen > 1e-6) {
            const toiP = rayVsExpandedCapsule(prev, rayDirNorm, rayLen, playerCapCenter, playerHalf, playerRadExp);
            if (toiP !== null && toiP < bestToi) {
              bestToi = toiP;
              bestActor = "player";
              bestType = "player";
            }
          } else {
            // point check
            const dxp = playerCapCenter.x - prev.x, dyp = playerCapCenter.y - prev.y, dzp = playerCapCenter.z - prev.z;
            const distXZ = Math.hypot(dxp, dzp);
            const vertInside = Math.abs(dyp) <= playerHalf + playerRadExp;
            const horizInside = distXZ <= playerRadExp;
            if (vertInside && horizInside) {
              bestToi = 0;
              bestActor = "player";
              bestType = "player";
            }
          }
        }
        // Wildkin hits (excluding owner, dead)
        for (const w of wildkins) {
          if (!w || !w.state) continue;
          if (w.state.isDead || w.state.aiState === "RESPAWNING") continue;
          if (p.owner && (w === p.owner || w.state?.id === p.owner?.id || w.state?.id === p.owner?.state?.id)) continue;
          // owner exclusion by collider handle as fallback
          if (ownerCollider && w.collider && ownerCollider.handle !== undefined && w.collider.handle === ownerCollider.handle) continue;
          const cfg = w.state.cfg ?? w.cfg ?? { capsuleRadius: 0.32, capsuleHalfHeight: 0.20 };
          const radExp = (cfg.capsuleRadius ?? 0.30) + p.radius;
          const halfH = cfg.capsuleHalfHeight ?? 0.16;
          const center = { x: w.state.pos.x, y: w.state.pos.y, z: w.state.pos.z };
          let toiW = null;
          if (rayLen > 1e-6) {
            toiW = rayVsExpandedCapsule(prev, rayDirNorm, rayLen, center, halfH, radExp);
          } else {
            const dx2 = center.x - prev.x, dy2 = center.y - prev.y, dz2 = center.z - prev.z;
            const dist = Math.hypot(dx2, dy2, dz2);
            if (dist <= radExp + halfH) toiW = 0;
          }
          if (toiW !== null && toiW < bestToi) {
            bestToi = toiW;
            bestActor = "wildkin";
            bestType = "wildkin";
            bestCreature = w;
          }
        }
      }

      // Resolve ordering: actor vs world
      if (bestActor !== null && bestToi <= worldToi + 1e-6 && bestToi <= 1.0) {
        // Actor hit occurs first (or equal) -> apply
        if (bestType === "player") {
          p.hasHit = true;
          if (!isPlayerInvuln()) {
            onPlayerDamage(p.damage, p.pos);
          }
          releaseMesh(p);
          projectiles.splice(i, 1);
          continue;
        } else if (bestType === "wildkin" && bestCreature) {
          p.hasHit = true;
          if (onWildkinDamage) {
            try { onWildkinDamage(bestCreature, p.damage, p.pos, p.owner); } catch {}
          }
          releaseMesh(p);
          projectiles.splice(i, 1);
          continue;
        }
      }

      if (worldRes.blocked) {
        releaseMesh(p);
        projectiles.splice(i, 1);
        continue;
      }

      // No hit: advance
      p.pos.set(next.x, next.y, next.z);
      p.mesh.position.copy(p.pos);
      p.mesh.rotation.y += dt * 6;
      p.mesh.rotation.x += dt * 4;

      // Ground check (geometry)
      const surfY = getSurfaceY(p.pos.x, p.pos.z);
      if (p.pos.y <= surfY + p.radius + 0.02) {
        releaseMesh(p);
        projectiles.splice(i, 1);
        continue;
      }
    }
  }

  function clear() {
    for (const p of projectiles) {
      p.mesh.visible = false;
      scene.remove(p.mesh);
      if (pool.length < MAX_POOL) pool.push({ mesh: p.mesh });
      else p.mesh.material.dispose?.();
    }
    projectiles.length = 0;
  }

  function reset() { clear(); }

  function getCount() { return projectiles.length; }
  function getPooledCount() { return pool.length; }

  return {
    spawnProjectile,
    update,
    clear,
    reset,
    getCount,
    getPooledCount,
    setPlayerPos,
    setPlayerState,
    setInvulnChecker,
    setDamageCallback,
    setPlayerCollider,
    setWildkinProvider,
    setWildkinDamageCallback,
    // legacy aliases
    setWildkinProviderAlias: setWildkinProvider,
    _projectiles: projectiles,
    _pool: pool,
    _testHelpers: { castWorldBlocked, rayVsExpandedCapsule, makeExcludePredicate },
  };
}
