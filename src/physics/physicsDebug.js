// src/physics/physicsDebug.js — optional Rapier debug visualization (Phase 1.2)
// Disabled by default. When enabled, shows capsule wireframe + world colliders.

import * as THREE from "three";

export function createPhysicsDebug(scene, characterPhysics, physicsWorld) {
  let enabled = false;
  let capsuleMesh = null;
  let colliderMeshes = [];

  const capsuleMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, wireframe: true, transparent: true, opacity: 0.65 });
  const staticMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, wireframe: true, transparent: true, opacity: 0.18 });

  function build() {
    const cfg = characterPhysics.cfg;
    // Capsule wireframe: cylinder + two spheres approximation using THREE.CapsuleGeometry if available, else cylinder+ spheres
    const radius = cfg.capsuleRadius;
    const half = cfg.capsuleHalfHeight;
    // Use THREE.CapsuleGeometry (Three r0.160+ has it) else fallback
    let geom;
    if (THREE.CapsuleGeometry) {
      geom = new THREE.CapsuleGeometry(radius, half * 2, 6, 12);
    } else {
      geom = new THREE.CylinderGeometry(radius, radius, half * 2, 10);
    }
    capsuleMesh = new THREE.Mesh(geom, capsuleMat);
    capsuleMesh.visible = false;
    scene.add(capsuleMesh);

    // Static collider wireframes — from physicsWorld staticColliders list
    colliderMeshes = [];
    for (const c of physicsWorld.staticColliders) {
      const tr = c.translation();
      const he = c.halfExtents ? c.halfExtents() : null;
      // Most static colliders are cuboids. If not, skip.
      if (!he || he.x == null) continue;
      const g = new THREE.BoxGeometry(he.x * 2, he.y * 2, he.z * 2);
      const m = new THREE.Mesh(g, staticMat);
      m.position.set(tr.x, tr.y, tr.z);
      m.visible = false;
      scene.add(m);
      colliderMeshes.push(m);
    }
  }

  build();

  function setEnabled(v) {
    enabled = v;
    if (capsuleMesh) capsuleMesh.visible = v;
    for (const m of colliderMeshes) m.visible = v;
  }

  function update(grounded, speed, verticalVel, numCollisions, substeps) {
    if (!enabled || !capsuleMesh) return;
    const pos = characterPhysics.getPosition();
    capsuleMesh.position.set(pos.x, pos.y, pos.z);
    // Optional: update collider meshes if world moves (static, no)
  }

  // Expose for manual toggle via console: window.__game.physicsDebug.setEnabled(true)
  return { setEnabled, update, get enabled() { return enabled; } };
}
