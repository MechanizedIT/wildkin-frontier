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

  // Ray cast for world collision (reuse similar to pickupSystem but simpler: check static colliders via Rapier shape cast)
  function isSegmentBlocked(from, to, radius) {
    const dirX = to.x - from.x, dirY = to.y - from.y, dirZ = to.z - from.z;
    const len = Math.hypot(dirX, dirY, dirZ);
    if (len < 1e-5) return false;
    if (RAPIER && physicsWorld && physicsWorld.world && typeof RAPIER.Ball === "function") {
      try {
        const shape = new RAPIER.Ball(radius);
        const rot = { x: 0, y: 0, z: 0, w: 1 };
        const vel = { x: dirX, y: dirY, z: dirZ };
        const hit = physicsWorld.world.castShape(from, rot, vel, shape, 0, 1.0, true);
        if (hit) {
          const toi = hit.timeOfImpact ?? hit.toi ?? 0;
          if (toi < 1.0 - 1e-4) return true;
        }
        return false;
      } catch (_) {}
    }
    // Fallback AABB
    if (!playground) return false;
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
      if (midX >= minX && midX <= maxX && midZ >= minZ && midZ <= maxZ && midY < h + radius + 0.1) return true;
    }
    return false;
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
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.age += dt;
      if (p.age >= p.lifetime) {
        releaseMesh(p);
        projectiles.splice(i, 1);
        continue;
      }
      const prev = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
      const next = {
        x: p.pos.x + p.vel.x * dt,
        y: p.pos.y + p.vel.y * dt,
        z: p.pos.z + p.vel.z * dt,
      };
      // gravity light? Keep roughly level
      p.vel.y -= 1.2 * dt; // slight drop

      // World collision
      const blocked = isSegmentBlocked(prev, next, p.radius);
      if (blocked) {
        // hit world: puff
        releaseMesh(p);
        projectiles.splice(i, 1);
        continue;
      }

      p.pos.set(next.x, next.y, next.z);
      p.mesh.position.copy(p.pos);
      p.mesh.rotation.y += dt * 6;
      p.mesh.rotation.x += dt * 4;

      // Ground check
      const surfY = getSurfaceY(p.pos.x, p.pos.z);
      if (p.pos.y <= surfY + p.radius + 0.02) {
        releaseMesh(p);
        projectiles.splice(i, 1);
        continue;
      }

      // Player hit (once)
      if (!p.hasHit) {
        const dx = playerPosRef.x - p.pos.x;
        const dz = playerPosRef.z - p.pos.z;
        const dy = (playerPosRef.y ?? 0.5) - p.pos.y;
        const dist = Math.hypot(dx, dy, dz);
        const hitRadius = p.radius + 0.36; // player capsule approx
        // vertical check: within ~0.9
        const vertOk = Math.abs(dy) < 0.9;
        if (dist < hitRadius && vertOk) {
          p.hasHit = true;
          if (!isPlayerInvuln()) {
            const ok = onPlayerDamage(p.damage, p.pos);
            // regardless of invuln, projectile disappears on hit attempt? Spec: disappears on player hit
            // If invuln, we still consume projectile (dodge should avoid damage but projectile gone)
          }
          releaseMesh(p);
          projectiles.splice(i, 1);
          continue;
        }
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
    _projectiles: projectiles,
    _pool: pool,
  };
}
