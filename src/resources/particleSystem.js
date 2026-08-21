// src/resources/particleSystem.js — cheap local particles for harvest feedback (no Rapier, no per-frame allocations churn)
import * as THREE from "three";

export function createParticleSystem(scene) {
  const particles = [];

  function spawnBurst(node, count = 6) {
    const base = node.state.position;
    const colorMap = { wood: 0xc9a86a, stone: 0xb0b0b0, fiber: 0x8fe08e };
    const color = colorMap[node.type.resourceId] ?? 0xffffff;
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.07, 0.07, 0.07);
      const mat = new THREE.MeshStandardMaterial({ color, flatShading: true, transparent: true, opacity: 0.95 });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(base.x + (Math.random() - 0.5) * 0.35, 0.42 + Math.random() * 0.35, base.z + (Math.random() - 0.5) * 0.35);
      scene.add(m);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 2.4, 1.2 + Math.random() * 2.2, (Math.random() - 0.5) * 2.4);
      particles.push({ mesh: m, vel, age: 0, lifetime: 0.36 + Math.random() * 0.22 });
    }
  }

  function update(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.lifetime) {
        scene.remove(p.mesh);
        particles.splice(i, 1);
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

  return { spawnBurst, update, getCount: () => particles.length };
}
