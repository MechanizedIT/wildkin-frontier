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

  // Halo — subtle white pulsing ring on ground (size kept small even though visuals enlarged)
  const haloGeo = new THREE.RingGeometry(0.72, 0.90, 24);
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
  const tickRadius = 0.72;
  const ticks = [];
  for (let i = 0; i < tickCount; i++) {
    const ang = (i / tickCount) * Math.PI * 2;
    const tickGeo = new THREE.BoxGeometry(0.11, 0.025, 0.07);
    const tickMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 });
    const tick = new THREE.Mesh(tickGeo, tickMat);
    tick.position.set(Math.cos(ang) * tickRadius, 0.04, Math.sin(ang) * tickRadius);
    tick.rotation.y = -ang;
    tick.visible = false;
    respawnGroup.add(tick);
    ticks.push(tick);
  }
  // background faint ring
  const bgRingGeo = new THREE.RingGeometry(0.70, 0.74, 24);
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
    // Phase 2.2: short trunk 0.92, thick, foliage starts ~0.68, broad low canopy
    const trunkGeo = new THREE.CylinderGeometry(0.32, 0.40, 0.92, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, flatShading: true });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.46;
    group.add(trunk);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2f7d32, flatShading: true });
    const foliageMat2 = new THREE.MeshStandardMaterial({ color: 0x3a9a3a, flatShading: true });
    // canopy broader and lower: centers 0.88-1.32
    const blobPos = [
      { x: 0, y: 1.22, z: 0, s: 0.78, mat: foliageMat },
      { x: 0.62, y: 1.02, z: 0.34, s: 0.58, mat: foliageMat2 },
      { x: -0.60, y: 0.98, z: 0.36, s: 0.56, mat: foliageMat },
      { x: 0.38, y: 1.14, z: -0.50, s: 0.52, mat: foliageMat2 },
      { x: -0.36, y: 0.88, z: -0.40, s: 0.50, mat: foliageMat },
    ];
    for (let i = 0; i < type.maxChunks; i++) {
      const cfg = blobPos[i];
      const g = new THREE.ConeGeometry(cfg.s, 1.05, 7);
      const m = new THREE.Mesh(g, cfg.mat);
      m.position.set(cfg.x, cfg.y, cfg.z);
      m.name = `chunk_${i}`;
      m.rotation.y = (Math.random() * 0.4 - 0.2);
      group.add(m);
      chunkMeshes.push(m);
    }
    // Stump remnant — short but visible
    const stumpGeo = new THREE.CylinderGeometry(0.36, 0.40, 0.38, 8);
    const stumpMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, flatShading: true });
    remnantMesh = new THREE.Mesh(stumpGeo, stumpMat);
    remnantMesh.position.y = 0.19;
    remnantMesh.visible = false;
    remnantMesh.name = "stump";
    group.add(remnantMesh);
    const ringGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.03, 9);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xc9a86a });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.19;
    ring.name = "stumpRing";
    remnantMesh.add(ring);
    mainVisual = trunk;
  } else if (typeId === "rock") {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8d8d8d, flatShading: true });
    const rockMat2 = new THREE.MeshStandardMaterial({ color: 0xa8a8a8, flatShading: true });
    const darkRock = new THREE.MeshStandardMaterial({ color: 0x6e6e6e, flatShading: true });
    // Enlarged ~1.7x: 0.34->0.58, 0.26->0.44, etc
    const lobes = [
      { x: 0, y: 0.52, z: 0, s: 0.58, mat: rockMat },
      { x: 0.46, y: 0.46, z: 0.26, s: 0.44, mat: rockMat2 },
      { x: -0.43, y: 0.40, z: 0.30, s: 0.41, mat: darkRock },
      { x: 0.20, y: 0.62, z: -0.36, s: 0.37, mat: rockMat },
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
    // Rubble remnant enlarged
    const rubbleGeo = new THREE.BoxGeometry(0.85, 0.20, 0.85);
    const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x7a7a7a, flatShading: true });
    remnantMesh = new THREE.Mesh(rubbleGeo, rubbleMat);
    remnantMesh.position.y = 0.10;
    remnantMesh.visible = false;
    remnantMesh.name = "rubble";
    for (let i = 0; i < 3; i++) {
      const peb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), new THREE.MeshStandardMaterial({ color: 0x9a9a9a }));
      peb.position.set((Math.random() - 0.5) * 0.45, 0.12, (Math.random() - 0.5) * 0.45);
      remnantMesh.add(peb);
    }
    group.add(remnantMesh);
    mainVisual = chunkMeshes[0] ?? group;
  } else if (typeId === "fiber") {
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x6abf69, flatShading: true });
    const bushMat2 = new THREE.MeshStandardMaterial({ color: 0x4a9a4a, flatShading: true });
    // Enlarged ~1.6x
    const tufts = [
      { x: 0, y: 0.42, z: 0, s: 0.45 },
      { x: 0.35, y: 0.36, z: 0.19, s: 0.35 },
      { x: -0.32, y: 0.38, z: 0.22, s: 0.38 },
    ];
    for (let i = 0; i < type.maxChunks; i++) {
      const cfg = tufts[i];
      const g = new THREE.SphereGeometry(cfg.s, 7, 5);
      g.scale(1, 0.65, 1);
      const mat = i % 2 === 0 ? bushMat : bushMat2;
      const m = new THREE.Mesh(g, mat);
      m.position.set(cfg.x, cfg.y, cfg.z);
      m.name = `chunk_${i}`;
      group.add(m);
      chunkMeshes.push(m);
    }
    const patchGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.06, 8);
    const patchMat = new THREE.MeshStandardMaterial({ color: 0x4a6a3a, flatShading: true });
    remnantMesh = new THREE.Mesh(patchGeo, patchMat);
    remnantMesh.position.y = 0.03;
    remnantMesh.visible = false;
    remnantMesh.name = "cutPatch";
    for (let i = 0; i < 4; i++) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 4), new THREE.MeshStandardMaterial({ color: 0x7ab87a }));
      const a = (i / 4) * Math.PI * 2;
      stem.position.set(Math.cos(a) * 0.18, 0.09, Math.sin(a) * 0.18);
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
  group.userData.originalChunkTransforms = chunkMeshes.map(m => ({ pos: m.position.clone(), scale: m.scale.clone(), rot: m.rotation.clone() }));

  return { group, state, type, chunkMeshes, remnantMesh, haloMesh, respawnGroup, ticks, mainVisual };
}

// Helpers for visual degradation — called by system on hit
export function hideOneChunk(node) {
  for (let i = node.chunkMeshes.length - 1; i >= 0; i--) {
    const mesh = node.chunkMeshes[i];
    if (mesh.visible) {
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
