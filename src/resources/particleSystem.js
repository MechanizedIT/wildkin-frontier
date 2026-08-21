// src/resources/particleSystem.js — pooled particles with shared geometries/materials
import * as THREE from "three";

const SHARED = {
  geo: null,
  mats: {},
};
function getSharedGeo() {
  if (!SHARED.geo) {
    SHARED.geo = new THREE.BoxGeometry(0.11, 0.11, 0.11);
    SHARED.mats.wood = new THREE.MeshStandardMaterial({ color: 0xc9a86a, flatShading: true, transparent: true, opacity: 0.95 });
    SHARED.mats.stone = new THREE.MeshStandardMaterial({ color: 0xb0b0b0, flatShading: true, transparent: true, opacity: 0.95 });
    SHARED.mats.fiber = new THREE.MeshStandardMaterial({ color: 0x8fe08e, flatShading: true, transparent: true, opacity: 0.95 });
    SHARED.mats.generic = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, transparent: true, opacity: 0.95 });
  }
  return SHARED;
}

export function createParticleSystem(scene) {
  const shared = getSharedGeo();
  const active = [];
  const pool = [];
  const MAX_POOL = 48;

  // Reusable temp vector not needed
  function acquireMesh(colorKey) {
    let entry = pool.pop();
    let mesh;
    if (entry) {
      mesh = entry.mesh;
      mesh.visible = true;
      mesh.scale.set(1, 1, 1);
      mesh.rotation.set(0, 0, 0);
      // update color if needed
      const mat = shared.mats[colorKey] ?? shared.mats.generic;
      // Reuse material instance but update color
      mesh.material.color.copy(mat.color);
      mesh.material.opacity = 0.95;
    } else {
      const mat = (shared.mats[colorKey] ?? shared.mats.generic).clone();
      mesh = new THREE.Mesh(shared.geo, mat);
    }
    mesh.material.transparent = true;
    mesh.material.opacity = 0.95;
    return mesh;
  }

  function releaseMesh(p) {
    p.mesh.visible = false;
    scene.remove(p.mesh);
    if (pool.length < MAX_POOL) pool.push(p);
    // else dispose cloned material
    else p.mesh.material.dispose?.();
  }

  function spawnBurst(node, count = 6) {
    const base = node.state.position;
    const baseY = (base.y ?? 0) + (node.type.impactEffectHeight ?? 0.45);
    const resId = node.type.resourceId;
    const colorKey = resId === "wood" ? "wood" : resId === "stone" ? "stone" : resId === "fiber" ? "fiber" : "generic";
    for (let i = 0; i < count; i++) {
      const m = acquireMesh(colorKey);
      m.position.set(base.x + (Math.random() - 0.5) * 0.45, baseY + Math.random() * 0.25, base.z + (Math.random() - 0.5) * 0.45);
      m.scale.set(1, 1, 1);
      scene.add(m);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 2.8, 1.6 + Math.random() * 2.4, (Math.random() - 0.5) * 2.8);
      active.push({ mesh: m, vel, age: 0, lifetime: 0.38 + Math.random() * 0.24 });
      // cap active size
      if (active.length > 64) {
        const oldest = active.shift();
        releaseMesh(oldest);
      }
    }
  }

  function update(dt) {
    for (let i = active.length - 1; i >= 0; i--) {
      const p = active[i];
      p.age += dt;
      if (p.age >= p.lifetime) {
        releaseMesh(p);
        active.splice(i, 1);
        continue;
      }
      p.vel.y -= 7.5 * dt;
      p.mesh.position.x += p.vel.x * dt;
      p.mesh.position.y += p.vel.y * dt;
      p.mesh.position.z += p.vel.z * dt;
      p.mesh.rotation.x += dt * 9;
      p.mesh.rotation.y += dt * 7;
      const t = p.age / p.lifetime;
      p.mesh.material.opacity = 0.95 * (1 - t);
      const s = 1 - t * 0.35;
      p.mesh.scale.set(s, s, s);
    }
  }

  return {
    spawnBurst,
    update,
    getCount: () => active.length,
    getPooledCount: () => pool.length,
    getDebug: () => ({ active: active.length, pooled: pool.length }),
    _active: active,
    _pool: pool,
  };
}
