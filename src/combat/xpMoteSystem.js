// src/combat/xpMoteSystem.js — pooled XP motes (essence), pop, magnetize, collect once
import * as THREE from "three";
import { XP_CONFIG } from "./combatConfig.js";

export function createXpMoteSystem(scene, opts = {}, physicsWorldIn = null, playgroundIn = null) {
  // Support (scene, physicsWorld, playground, opts) legacy detection
  let physicsWorld = physicsWorldIn;
  let playground = playgroundIn;
  let worldRegistryRef = opts?.worldRegistry ?? null;
  if (opts && typeof opts === "object" && !opts.onXpChanged && opts.world && !physicsWorld) {
    // called as (scene, physicsWorld, playground)
    physicsWorld = opts;
    playground = physicsWorldIn;
    opts = playgroundIn ?? {};
    worldRegistryRef = opts?.worldRegistry ?? worldRegistryRef;
  }
  if (opts && opts.physicsWorld) physicsWorld = opts.physicsWorld;
  if (opts && opts.playground) playground = opts.playground;
  if (opts && opts.worldRegistry) worldRegistryRef = opts.worldRegistry;
  const motes = [];
  const pool = [];
  const MAX_ACTIVE = 32;
  const MAX_POOL = 24;
  const STALE = XP_CONFIG.moteLifetime ?? 30;
  const XP_RADIUS = 0.26; // collision radius for mote core (faceted crystal ~0.30 but slightly smaller for clearance)

  let totalXp = 0;
  let onXpChanged = opts?.onXpChanged ?? (() => {});
  let onCollectSound = opts?.onCollectSound ?? (() => {});

  let playerPosRef = { x: 0, y: 0.5, z: 0 };

  function setPlayerPos(pos) { playerPosRef = pos; }
  function setPhysicsWorld(pw) { physicsWorld = pw; }
  function setPlayground(pg) { playground = pg; }

  let RAPIER = physicsWorld?.RAPIER ?? null;

  function getSurfaceY(x, z) {
    if (playground && playground.platforms) {
      for (const p of playground.platforms) {
        if (x >= p.aabb.minX && x <= p.aabb.maxX && z >= p.aabb.minZ && z <= p.aabb.maxZ) return p.height;
      }
    }
    return 0;
  }

  function isPositionOverlappingSolid(pos, radius) {
    if (!playground) return false;
    if (RAPIER && physicsWorld && physicsWorld.world && typeof RAPIER.Ball === "function" && physicsWorld.world.intersectionWithShape) {
      try {
        const shape = new RAPIER.Ball(radius);
        const rot = { x: 0, y: 0, z: 0, w: 1 };
        const hit = physicsWorld.world.intersectionWithShape(pos, rot, shape, undefined, undefined, undefined, undefined, null);
        if (hit) return true;
        return false;
      } catch (_) {}
    }
    // fallback AABB
    const y = pos.y;
    const obstacles = [];
    if (playground && playground.obstacles) obstacles.push(...playground.obstacles);
    if (playground && playground.platforms) for (const p of playground.platforms) obstacles.push({ aabb: p.aabb, height: p.height });
    for (const o of obstacles) {
      const h = o.height ?? 1.0;
      if (y > h + radius + 0.08) continue;
      const aabb = o.aabb; if (!aabb) continue;
      const minX = aabb.minX - radius, maxX = aabb.maxX + radius;
      const minZ = aabb.minZ - radius, maxZ = aabb.maxZ + radius;
      if (pos.x >= minX && pos.x <= maxX && pos.z >= minZ && pos.z <= maxZ && y < h + radius + 0.08) return true;
    }
    return false;
  }

  function castSphereBlocked(from, to, radius) {
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-5) return isPositionOverlappingSolid(from, radius) ? { blocked: true, toi: 0 } : { blocked: false };
    if (RAPIER && physicsWorld && physicsWorld.world && typeof RAPIER.Ball === "function" && physicsWorld.world.castShape) {
      try {
        const shape = new RAPIER.Ball(radius);
        const rot = { x: 0, y: 0, z: 0, w: 1 };
        const vel = { x: dx, y: dy, z: dz };
        const hit = physicsWorld.world.castShape(from, rot, vel, shape, 0, 1.0, true, undefined, undefined, undefined, undefined, null);
        if (hit) {
          const toi = hit.timeOfImpact ?? hit.toi ?? 0;
          if (toi < 1.0 - 1e-4) return { blocked: true, toi };
        }
        return { blocked: false };
      } catch (_) {}
    }
    // fallback expanded AABB segment check (radius-aware)
    const obstacles = [];
    if (playground && playground.obstacles) obstacles.push(...playground.obstacles);
    if (playground && playground.platforms) for (const p of playground.platforms) obstacles.push({ aabb: p.aabb, height: p.height });
    if (obstacles.length === 0) return { blocked: false };
    const yA = from.y, yB = to.y;
    const yMin = Math.min(yA, yB) - radius - 0.05;
    for (const o of obstacles) {
      const h = o.height ?? 1.0;
      if (yMin > h + radius + 0.05) continue;
      const aabb = o.aabb; if (!aabb) continue;
      const minX = aabb.minX - radius, maxX = aabb.maxX + radius;
      const minZ = aabb.minZ - radius, maxZ = aabb.maxZ + radius;
      const segMinX = Math.min(from.x, to.x), segMaxX = Math.max(from.x, to.x);
      const segMinZ = Math.min(from.z, to.z), segMaxZ = Math.max(from.z, to.z);
      if (segMaxX < minX || segMinX > maxX || segMaxZ < minZ || segMinZ > maxZ) continue;
      const midY = (yA + yB) * 0.5;
      if (midY < h + radius + 0.10) return { blocked: true, toi: 0 };
      if (from.x >= minX && from.x <= maxX && from.z >= minZ && from.z <= maxZ && yA < h + radius + 0.10) return { blocked: true, toi: 0 };
      if (to.x >= minX && to.x <= maxX && to.z >= minZ && to.z <= maxZ && yB < h + radius + 0.10) return { blocked: true, toi: 0 };
      if (segMinX <= maxX && segMaxX >= minX && segMinZ <= maxZ && segMaxZ >= minZ) return { blocked: true, toi: 0.2 };
    }
    return { blocked: false };
  }

  function ensureRestPositionClear(mote) {
    const r = XP_RADIUS;
    if (!isPositionOverlappingSolid(mote.pos, r)) return;
    if (mote.lastClearPos && !isPositionOverlappingSolid(mote.lastClearPos, r)) {
      mote.pos.copy(mote.lastClearPos);
      mote.mesh.position.copy(mote.pos);
      return;
    }
    const tries = [ {x:0.4,z:0},{x:-0.4,z:0},{x:0,z:0.4},{x:0,z:-0.4},{x:0.28,z:0.28},{x:-0.28,z:0.28},{x:0.28,z:-0.28},{x:-0.28,z:-0.28} ];
    for (const off of tries) {
      const cand = { x: mote.pos.x + off.x, y: mote.pos.y, z: mote.pos.z + off.z };
      if (!isPositionOverlappingSolid(cand, r)) {
        mote.pos.set(cand.x, cand.y, cand.z);
        mote.mesh.position.copy(mote.pos);
        return;
      }
    }
  }

  // Shared geometry — faceted cyan essence crystal + soft halo (keep pooling, no point lights)
  let sharedCoreGeo = null;
  let sharedHaloGeo = null;
  let sharedCoreMatProto = null;
  let sharedHaloMatProto = null;
  function getShared() {
    if (!sharedCoreGeo) {
      // Faceted crystal core: low-poly icosahedron slightly vertically stretched
      sharedCoreGeo = new THREE.IcosahedronGeometry(0.30, 0);
      sharedCoreGeo.scale(1, 1.28, 1);
      sharedHaloGeo = new THREE.SphereGeometry(0.46, 12, 10);
      sharedCoreMatProto = new THREE.MeshStandardMaterial({ color: 0x7ef8ff, emissive: 0x0a4a7a, emissiveIntensity: 0.85, transparent: false, flatShading: true, roughness: 0.45, metalness: 0.0 });
      sharedHaloMatProto = new THREE.MeshBasicMaterial({ color: 0x3ad0ff, transparent: true, opacity: 0.18, depthWrite: false });
    }
    return { coreGeo: sharedCoreGeo, haloGeo: sharedHaloGeo, coreMatProto: sharedCoreMatProto, haloMatProto: sharedHaloMatProto };
  }

  function acquireMesh() {
    if (pool.length > 0) {
      const e = pool.pop();
      e.mesh.visible = true;
      e.mesh.scale.set(1, 1, 1);
      e.mesh.rotation.set(0, 0, 0);
      if (e.mesh.userData.halo) e.mesh.userData.halo.visible = true;
      scene.add(e.mesh);
      if (e.mesh.userData.halo && !e.mesh.userData.halo.parent) e.mesh.add(e.mesh.userData.halo);
      return e.mesh;
    }
    const { coreGeo, haloGeo, coreMatProto, haloMatProto } = getShared();
    const coreMat = coreMatProto.clone();
    const haloMat = haloMatProto.clone();
    const m = new THREE.Mesh(coreGeo, coreMat);
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.name = "xpHalo";
    m.add(halo);
    m.userData.halo = halo;
    m.userData.coreMat = coreMat;
    m.userData.haloMat = haloMat;
    scene.add(m);
    return m;
  }

  function releaseMesh(mote) {
    mote.mesh.visible = false;
    if (mote.mesh.userData.halo) mote.mesh.userData.halo.visible = false;
    scene.remove(mote.mesh);
    if (pool.length < MAX_POOL) pool.push({ mesh: mote.mesh });
    else {
      mote.mesh.material.dispose?.();
      mote.mesh.userData.halo?.material.dispose?.();
    }
  }

  function setCallbacks(cb) {
    if (cb.onXpChanged) onXpChanged = cb.onXpChanged;
    if (cb.onCollectSound) onCollectSound = cb.onCollectSound;
  }

  function setWorldRegistry(wr) { worldRegistryRef = wr; }

  function spawnMotes(pos, count, opts2 = {}) {
    const baseY = (pos.y ?? 0.5) + 0.35;
    // Determine origin region for culling (position-based or explicit opts regionId)
    let originRegion = opts2.regionId ?? null;
    if (!originRegion && worldRegistryRef) originRegion = worldRegistryRef.getRegionForPosition(pos);
    for (let i = 0; i < count; i++) {
      if (motes.length >= MAX_ACTIVE) break;
      const mesh = acquireMesh();
      const ang = Math.random() * Math.PI * 2;
      const r = 0.25 + Math.random() * 0.35;
      const start = new THREE.Vector3(pos.x + Math.cos(ang) * r, baseY + Math.random() * 0.25, pos.z + Math.sin(ang) * r);
      // Ensure spawn not inside solid (validate)
      const rad = XP_RADIUS;
      if (isPositionOverlappingSolid({ x: start.x, y: start.y, z: start.z }, rad)) {
        // nudge outward slightly
        start.x += Math.cos(ang) * 0.35;
        start.z += Math.sin(ang) * 0.35;
      }
      mesh.position.copy(start);
      const vel = new THREE.Vector3(Math.cos(ang) * (1.2 + Math.random()), 2.2 + Math.random() * 1.2, Math.sin(ang) * (1.2 + Math.random()));
      const mote = {
        id: Math.random().toString(36).slice(2),
        mesh,
        pos: start.clone(),
        lastClearPos: start.clone(),
        vel,
        age: 0,
        state: "POP", // POP -> REST -> MAGNETIZING -> COLLECTED
        collected: false,
        popTime: 0,
        regionId: originRegion ?? (worldRegistryRef ? worldRegistryRef.getRegionForPosition(start) : null),
      };
      motes.push(mote);
    }
  }

  function collectMote(mote) {
    if (mote.collected) return false;
    mote.collected = true;
    totalXp += 1;
    onXpChanged(totalXp);
    onCollectSound();
    mote.mesh.visible = false;
    const idx = motes.indexOf(mote);
    if (idx !== -1) {
      releaseMesh(mote);
      motes.splice(idx, 1);
    }
    return true;
  }

  function update(dt) {
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      if (m.collected) {
        releaseMesh(m);
        motes.splice(i, 1);
        continue;
      }
      m.age += dt;
      if (m.age > STALE) {
        releaseMesh(m);
        motes.splice(i, 1);
        continue;
      }

      if (m.state === "POP") {
        // ballistic pop — collision-aware (radius-aware static-world sweep)
        RAPIER = physicsWorld?.RAPIER ?? RAPIER;
        m.vel.y -= 6.5 * dt;
        const intended = { x: m.pos.x + m.vel.x * dt, y: m.pos.y + m.vel.y * dt, z: m.pos.z + m.vel.z * dt };
        const rad = XP_RADIUS;
        const cast = castSphereBlocked({ x: m.pos.x, y: m.pos.y, z: m.pos.z }, intended, rad);
        if (cast.blocked) {
          const toi = cast.toi ?? 0;
          if (toi > 1e-4 && toi < 1.0) {
            const dx = intended.x - m.pos.x, dy = intended.y - m.pos.y, dz = intended.z - m.pos.z;
            const skin = 0.02;
            const len = Math.hypot(dx, dy, dz) || 1;
            const f = Math.max(0, toi - skin / len);
            m.pos.x += dx * f; m.pos.y += dy * f; m.pos.z += dz * f;
          }
          m.vel.set(0, 0, 0);
          const surfY = getSurfaceY(m.pos.x, m.pos.z);
          if (m.pos.y < surfY + 0.22) m.pos.y = surfY + 0.22;
          ensureRestPositionClear(m);
          m.state = "REST";
          m.restTime = 0;
        } else {
          m.pos.x = intended.x; m.pos.y = intended.y; m.pos.z = intended.z;
          if (!isPositionOverlappingSolid(m.pos, rad)) m.lastClearPos.copy(m.pos);
          const surfY = getSurfaceY(m.pos.x, m.pos.z);
          const restY = surfY + 0.22;
          if (m.pos.y <= restY) {
            m.pos.y = restY;
            m.vel.set(0, 0, 0);
            ensureRestPositionClear(m);
            m.state = "REST";
            m.restTime = 0;
          }
        }
        m.mesh.position.copy(m.pos);
        m.mesh.rotation.y += dt * 1.2;
        m.mesh.rotation.x += dt * 0.7;
        if (m.age > 0.5 && m.state === "POP") {
          if (m.pos.y <= getSurfaceY(m.pos.x, m.pos.z) + 0.30) { ensureRestPositionClear(m); m.state = "REST"; }
        }
      }
      if (m.state === "REST") {
        const surfY = getSurfaceY(m.pos.x, m.pos.z);
        const restY = surfY + 0.22;
        ensureRestPositionClear(m);
        m.pos.y = restY;
        m.mesh.position.copy(m.pos);
        m.mesh.position.y = restY + Math.sin(m.age * 3.0) * 0.05;
        m.mesh.rotation.y += dt * 2.5;
        // gentle pulse of halo
        const pulse = 0.85 + Math.sin(m.age * 2.2) * 0.15;
        if (m.mesh.userData.halo) {
          m.mesh.userData.halo.scale.set(pulse, pulse, pulse);
          m.mesh.userData.halo.material.opacity = 0.14 + Math.sin(m.age * 2.2) * 0.06;
        }
        if (m.mesh.material) m.mesh.material.emissiveIntensity = 0.75 + Math.sin(m.age * 2.8) * 0.20;
        const dx = playerPosRef.x - m.pos.x;
        const dz = playerPosRef.z - m.pos.z;
        const dy = (playerPosRef.y ?? 0.5) - m.pos.y;
        const dist = Math.hypot(dx, dz, dy * 0.5);
        if (m.age > (XP_CONFIG.moteMagnetDelay ?? 0.28) && dist <= (XP_CONFIG.moteMagnetRadius ?? 2.2)) {
          m.state = "MAGNETIZING";
        }
      }
      if (m.state === "MAGNETIZING") {
        const dx = playerPosRef.x - m.mesh.position.x;
        const dy = (playerPosRef.y ?? 0.52) - m.mesh.position.y;
        const dz = playerPosRef.z - m.mesh.position.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist < (XP_CONFIG.moteCollectRadius ?? 0.45)) {
          collectMote(m);
          continue;
        }
        const len = dist > 1e-5 ? dist : 1;
        const nx = dx / len, ny = dy / len, nz = dz / len;
        const speed = 6.0 + 14 * Math.min(0.8, m.age);
        const nxm = m.mesh.position.x + nx * speed * dt;
        const nym = m.mesh.position.y + ny * speed * dt;
        const nzm = m.mesh.position.z + nz * speed * dt;
        m.mesh.position.set(nxm, nym, nzm);
        m.pos.copy(m.mesh.position);
      }
    }
  }

  function clear() {
    for (const m of motes) {
      m.mesh.visible = false;
      if (m.mesh.userData.halo) m.mesh.userData.halo.visible = false;
      scene.remove(m.mesh);
      if (pool.length < MAX_POOL) pool.push({ mesh: m.mesh });
      else {
        m.mesh.material.dispose?.();
        m.mesh.userData.halo?.material.dispose?.();
      }
    }
    motes.length = 0;
  }

  function reset() {
    clear();
    totalXp = 0;
    onXpChanged(totalXp);
  }

  function getXp() { return totalXp; }
  function getCount() { return motes.length; }
  function getPooledCount() { return pool.length; }
  function setXp(v) { totalXp = v; onXpChanged(totalXp); }

  function cullInactiveRegions(activeSet, worldRegistry = worldRegistryRef) {
    if (!activeSet) return 0;
    const active = activeSet instanceof Set ? activeSet : new Set(activeSet);
    let culled = 0;
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      let isActive = true;
      if (m.regionId) isActive = active.has(m.regionId);
      else if (worldRegistry) {
        const reg = worldRegistry.getRegionForPosition(m.pos);
        isActive = active.has(reg);
      }
      if (!isActive) {
        releaseMesh(m);
        motes.splice(i, 1);
        culled++;
      }
    }
    return culled;
  }

  function setActiveRegions(activeSet) { return cullInactiveRegions(activeSet); }

  return {
    spawnMotes,
    update,
    clear,
    reset,
    getXp,
    setXp,
    getCount,
    getPooledCount,
    setPlayerPos,
    setPhysicsWorld,
    setPlayground,
    setCallbacks,
    setWorldRegistry,
    cullInactiveRegions,
    setActiveRegions,
    getXpValue: getXp,
    _motes: motes,
    _pool: pool,
    _castSphereBlocked: castSphereBlocked,
    _isOverlapping: isPositionOverlappingSolid,
    XP_RADIUS,
  };
}
