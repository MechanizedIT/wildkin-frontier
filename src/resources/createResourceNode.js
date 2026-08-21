// src/resources/createResourceNode.js — procedural node visuals + state (no Rapier yet, collider added by system)
import * as THREE from "three";
import { RESOURCE_TYPES } from "./resourceConfig.js";

export function createResourceNode(typeId, position, index = 0) {
  const type = RESOURCE_TYPES[typeId];
  if (!type) throw new Error(`Unknown resource type ${typeId}`);

  const group = new THREE.Group();
  group.position.set(position.x, position.y ?? 0, position.z);
  group.name = `resource_${typeId}_${index}`;

  // State
  const state = {
    id: `${typeId}_${index}`,
    typeId,
    resourceId: type.resourceId,
    maxChunks: type.maxChunks,
    remainingChunks: type.maxChunks,
    nodeState: "READY", // READY | RESPAWNING
    respawnRemaining: 0,
    position: { x: position.x, y: position.y ?? 0, z: position.z },
  };

  // Halo — subtle white pulsing ring on ground
  const haloGeo = new THREE.RingGeometry(0.52, 0.66, 24);
  haloGeo.rotateX(-Math.PI / 2);
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const haloMesh = new THREE.Mesh(haloGeo, haloMat);
  haloMesh.position.y = 0.02;
  haloMesh.visible = false;
  haloMesh.name = "halo";
  group.add(haloMesh);

  // Respawn progress — 12 small ticks in circle around remnant
  const respawnGroup = new THREE.Group();
  respawnGroup.name = "respawnProgress";
  respawnGroup.visible = false;
  const tickCount = 12;
  const tickRadius = 0.62;
  const ticks = [];
  for (let i = 0; i < tickCount; i++) {
    const ang = (i / tickCount) * Math.PI * 2;
    const tickGeo = new THREE.BoxGeometry(0.09, 0.02, 0.06);
    const tickMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 });
    const tick = new THREE.Mesh(tickGeo, tickMat);
    tick.position.set(Math.cos(ang) * tickRadius, 0.04, Math.sin(ang) * tickRadius);
    tick.rotation.y = -ang;
    tick.visible = false;
    respawnGroup.add(tick);
    ticks.push(tick);
  }
  // background faint ring
  const bgRingGeo = new THREE.RingGeometry(0.60, 0.64, 24);
  bgRingGeo.rotateX(-Math.PI / 2);
  const bgRing = new THREE.Mesh(bgRingGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
  bgRing.position.y = 0.025;
  bgRing.name = "respawnBg";
  respawnGroup.add(bgRing);
  group.add(respawnGroup);

  // Remnant (stump/rubble/cut patch) — always present but hidden when READY? Show only when depleted.
  let remnantMesh = null;

  // Chunk meshes — authored low-poly children, one per harvest chunk
  const chunkMeshes = [];
  // Keep reference to main visuals for wobble
  let mainVisual = null;

  if (typeId === "tree") {
    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.85, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, flatShading: true });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.42;
    group.add(trunk);
    // Foliage chunks - 4 leaves + trunk top = 5 chunks. We'll treat trunk as not removable? But need exactly 5 chunks.
    // Let's create: canopy base + 4 foliage blobs around.
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2f7d32, flatShading: true });
    const foliageMat2 = new THREE.MeshStandardMaterial({ color: 0x3a9a3a, flatShading: true });
    const blobPos = [
      { x: 0, y: 1.05, z: 0, s: 0.42, mat: foliageMat },
      { x: 0.32, y: 0.82, z: 0.18, s: 0.32, mat: foliageMat2 },
      { x: -0.30, y: 0.78, z: 0.22, s: 0.30, mat: foliageMat },
      { x: 0.18, y: 0.92, z: -0.28, s: 0.28, mat: foliageMat2 },
      { x: -0.18, y: 0.68, z: -0.20, s: 0.26, mat: foliageMat },
    ];
    // First 5 correspond to harvest chunks - each hit removes one. Keep stump separate.
    for (let i = 0; i < type.maxChunks; i++) {
      const cfg = blobPos[i];
      const g = new THREE.ConeGeometry(cfg.s, 0.6, 6);
      const m = new THREE.Mesh(g, cfg.mat);
      m.position.set(cfg.x, cfg.y, cfg.z);
      m.name = `chunk_${i}`;
      // small random rotation for natural
      m.rotation.y = (Math.random() * 0.4 - 0.2);
      group.add(m);
      chunkMeshes.push(m);
    }
    // Stump remnant
    const stumpGeo = new THREE.CylinderGeometry(0.20, 0.22, 0.38, 7);
    const stumpMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, flatShading: true });
    remnantMesh = new THREE.Mesh(stumpGeo, stumpMat);
    remnantMesh.position.y = 0.19;
    remnantMesh.visible = false;
    remnantMesh.name = "stump";
    group.add(remnantMesh);
    // Add growth rings visible when depleted
    const ringGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.02, 9);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xc9a86a });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.38;
    ring.name = "stumpRing";
    remnantMesh.add(ring);
    mainVisual = trunk;
  } else if (typeId === "rock") {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8d8d8d, flatShading: true });
    const rockMat2 = new THREE.MeshStandardMaterial({ color: 0xa8a8a8, flatShading: true });
    const darkRock = new THREE.MeshStandardMaterial({ color: 0x6e6e6e, flatShading: true });
    const lobes = [
      { x: 0, y: 0.32, z: 0, s: 0.34, mat: rockMat },
      { x: 0.28, y: 0.28, z: 0.16, s: 0.26, mat: rockMat2 },
      { x: -0.26, y: 0.24, z: 0.18, s: 0.24, mat: darkRock },
      { x: 0.12, y: 0.38, z: -0.22, s: 0.22, mat: rockMat },
    ];
    for (let i = 0; i < type.maxChunks; i++) {
      const cfg = lobes[i];
      const g = new THREE.DodecahedronGeometry(cfg.s, 0);
      const m = new THREE.Mesh(g, cfg.mat);
      m.position.set(cfg.x, cfg.y, cfg.z);
      m.rotation.set(Math.random() * 0.6, Math.random() * 0.6, Math.random() * 0.6);
      m.name = `chunk_${i}`;
      group.add(m);
      chunkMeshes.push(m);
    }
    // Rubble remnant low
    const rubbleGeo = new THREE.BoxGeometry(0.55, 0.14, 0.55);
    const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x7a7a7a, flatShading: true });
    remnantMesh = new THREE.Mesh(rubbleGeo, rubbleMat);
    remnantMesh.position.y = 0.07;
    remnantMesh.visible = false;
    remnantMesh.name = "rubble";
    // small pebbles on rubble
    for (let i = 0; i < 3; i++) {
      const peb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.09, 0), new THREE.MeshStandardMaterial({ color: 0x9a9a9a }));
      peb.position.set((Math.random() - 0.5) * 0.3, 0.09, (Math.random() - 0.5) * 0.3);
      remnantMesh.add(peb);
    }
    group.add(remnantMesh);
    mainVisual = chunkMeshes[0] ?? group;
  } else if (typeId === "fiber") {
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x6abf69, flatShading: true });
    const bushMat2 = new THREE.MeshStandardMaterial({ color: 0x4a9a4a, flatShading: true });
    const tufts = [
      { x: 0, y: 0.28, z: 0, s: 0.28 },
      { x: 0.22, y: 0.22, z: 0.12, s: 0.22 },
      { x: -0.20, y: 0.24, z: 0.14, s: 0.24 },
    ];
    for (let i = 0; i < type.maxChunks; i++) {
      const cfg = tufts[i];
      const g = new THREE.SphereGeometry(cfg.s, 6, 5);
      g.scale(1, 0.65, 1);
      const mat = i % 2 === 0 ? bushMat : bushMat2;
      const m = new THREE.Mesh(g, mat);
      m.position.set(cfg.x, cfg.y, cfg.z);
      m.name = `chunk_${i}`;
      group.add(m);
      chunkMeshes.push(m);
    }
    // cut patch remnant
    const patchGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.05, 8);
    const patchMat = new THREE.MeshStandardMaterial({ color: 0x4a6a3a, flatShading: true });
    remnantMesh = new THREE.Mesh(patchGeo, patchMat);
    remnantMesh.position.y = 0.025;
    remnantMesh.visible = false;
    remnantMesh.name = "cutPatch";
    // short stems
    for (let i = 0; i < 4; i++) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 4), new THREE.MeshStandardMaterial({ color: 0x7ab87a }));
      const a = (i / 4) * Math.PI * 2;
      stem.position.set(Math.cos(a) * 0.12, 0.06, Math.sin(a) * 0.12);
      remnantMesh.add(stem);
    }
    group.add(remnantMesh);
    mainVisual = chunkMeshes[0] ?? group;
  }

  // Attach state to group for external access
  group.userData.resourceState = state;
  group.userData.resourceType = type;
  group.userData.chunkMeshes = chunkMeshes;
  group.userData.remnantMesh = remnantMesh;
  group.userData.haloMesh = haloMesh;
  group.userData.respawnGroup = respawnGroup;
  group.userData.respawnTicks = ticks;
  group.userData.mainVisual = mainVisual;
  // Original positions for wobble restore
  group.userData.originalChunkTransforms = chunkMeshes.map(m => ({ pos: m.position.clone(), scale: m.scale.clone(), rot: m.rotation.clone() }));

  return { group, state, type, chunkMeshes, remnantMesh, haloMesh, respawnGroup, ticks, mainVisual };
}

// Helpers for visual degradation — called by system on hit
export function hideOneChunk(node) {
  for (let i = node.chunkMeshes.length - 1; i >= 0; i--) {
    const mesh = node.chunkMeshes[i];
    if (mesh.visible) {
      // pop animation could be triggered by system; we just hide after animation
      // For immediate, hide and scale down
      mesh.visible = false;
      return mesh;
    }
  }
  return null;
}

export function showAllChunks(node) {
  for (const m of node.chunkMeshes) {
    m.visible = true;
    m.scale.set(1, 1, 1);
    m.material.transparent = false;
    m.material.opacity = 1;
  }
}
