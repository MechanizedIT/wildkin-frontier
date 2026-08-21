// src/combat/xpMoteSystem.js — pooled XP motes (essence), pop, magnetize, collect once
import * as THREE from "three";
import { XP_CONFIG } from "./combatConfig.js";

export function createXpMoteSystem(scene, opts = {}) {
  const motes = [];
  const pool = [];
  const MAX_ACTIVE = 32;
  const MAX_POOL = 24;
  const STALE = XP_CONFIG.moteLifetime ?? 30;

  let totalXp = 0;
  let onXpChanged = opts.onXpChanged ?? (() => {});
  let onCollectSound = opts.onCollectSound ?? (() => {});

  let playerPosRef = { x: 0, y: 0.5, z: 0 };

  function setPlayerPos(pos) { playerPosRef = pos; }

  // Shared geometry
  let sharedGeo = null;
  let sharedMatProto = null;
  function getShared() {
    if (!sharedGeo) {
      sharedGeo = new THREE.OctahedronGeometry(0.16, 0);
      sharedMatProto = new THREE.MeshStandardMaterial({ color: 0xffe066, emissive: 0x664400, emissiveIntensity: 0.45, flatShading: true });
    }
    return { geo: sharedGeo, matProto: sharedMatProto };
  }

  function acquireMesh() {
    if (pool.length > 0) {
      const e = pool.pop();
      e.mesh.visible = true;
      e.mesh.scale.set(1, 1, 1);
      scene.add(e.mesh);
      return e.mesh;
    }
    const { geo, matProto } = getShared();
    const m = new THREE.Mesh(geo, matProto.clone());
    scene.add(m);
    return m;
  }

  function releaseMesh(mote) {
    mote.mesh.visible = false;
    scene.remove(mote.mesh);
    if (pool.length < MAX_POOL) pool.push({ mesh: mote.mesh });
    else mote.mesh.material.dispose?.();
  }

  function setCallbacks(cb) {
    if (cb.onXpChanged) onXpChanged = cb.onXpChanged;
    if (cb.onCollectSound) onCollectSound = cb.onCollectSound;
  }

  function spawnMotes(pos, count, opts2 = {}) {
    const baseY = (pos.y ?? 0.5) + 0.35;
    for (let i = 0; i < count; i++) {
      if (motes.length >= MAX_ACTIVE) break;
      const mesh = acquireMesh();
      const ang = Math.random() * Math.PI * 2;
      const r = 0.25 + Math.random() * 0.35;
      const start = new THREE.Vector3(pos.x + Math.cos(ang) * r, baseY + Math.random() * 0.25, pos.z + Math.sin(ang) * r);
      mesh.position.copy(start);
      const vel = new THREE.Vector3(Math.cos(ang) * (1.2 + Math.random()), 2.2 + Math.random() * 1.2, Math.sin(ang) * (1.2 + Math.random()));
      const mote = {
        id: Math.random().toString(36).slice(2),
        mesh,
        pos: start.clone(),
        vel,
        age: 0,
        state: "POP", // POP -> REST -> MAGNETIZING -> COLLECTED
        collected: false,
        popTime: 0,
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
        // ballistic pop
        m.vel.y -= 6.5 * dt;
        m.pos.x += m.vel.x * dt;
        m.pos.y += m.vel.y * dt;
        m.pos.z += m.vel.z * dt;
        // ground clamp
        if (m.pos.y <= 0.22) {
          m.pos.y = 0.22;
          m.vel.set(0, 0, 0);
          m.state = "REST";
          m.restTime = 0;
        }
        m.mesh.position.copy(m.pos);
        m.mesh.rotation.y += dt * 5;
        if (m.age > 0.5 && m.state === "POP") {
          // force rest after pop
          if (m.pos.y <= 0.30) { m.state = "REST"; }
        }
        // after pop, allow magnet check below
        if (m.state !== "POP" && m.age > (XP_CONFIG.moteMagnetDelay ?? 0.28)) {
          // will check magnet next block
        }
      }
      if (m.state === "REST") {
        m.mesh.position.y = 0.22 + Math.sin(m.age * 3.0) * 0.05;
        // spin
        m.mesh.rotation.y += dt * 2.5;
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
      scene.remove(m.mesh);
      if (pool.length < MAX_POOL) pool.push({ mesh: m.mesh });
      else m.mesh.material.dispose?.();
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
    setCallbacks,
    getXpValue: getXp,
    _motes: motes,
    _pool: pool,
  };
}
