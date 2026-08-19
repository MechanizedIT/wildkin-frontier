import * as THREE from "three";
import { MOVEMENT_CONFIG } from "../game/config.js";

export function createMovementPlayground() {
  const group = new THREE.Group();
  group.name = "movement-playground";

  // Ground — large plane (box thin)
  const groundGeo = new THREE.BoxGeometry(26, 0.5, 24);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x7bb26a, flatShading: true, roughness: 0.95 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.set(0, -0.25, 0);
  ground.receiveShadow = false;
  group.add(ground);

  // Trim edge darker
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x5f8a52, flatShading: true });
  const edge = new THREE.Mesh(new THREE.BoxGeometry(27, 0.25, 25), edgeMat);
  edge.position.y = -0.58;
  group.add(edge);

  // --- Obstacles ---
  const obstacles = [];
  const obstacleMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, flatShading: true });

  function addBoxObstacle(x, z, w, h, height = 0.9) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, h), obstacleMat);
    mesh.position.set(x, height / 2 - 0.02, z);
    group.add(mesh);
    obstacles.push({ x, z, w, h, height, aabb: { minX: x - w / 2, maxX: x + w / 2, minZ: z - h / 2, maxZ: z + h / 2 } });
  }

  function addRock(x, z, s = 0.5) {
    const g = new THREE.DodecahedronGeometry(s, 0);
    const m = new THREE.Mesh(g, obstacleMat);
    m.position.set(x, s * 0.55, z);
    m.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
    group.add(m);
    // approximate as box for collision
    obstacles.push({ x, z, w: s * 1.6, h: s * 1.6, height: s, aabb: { minX: x - s * 0.8, maxX: x + s * 0.8, minZ: z - s * 0.8, maxZ: z + s * 0.8 } });
  }

  // Open straightaway is центральная area. Obstacles set:
  // 1. Large boulder cluster to test sliding near center-east
  addBoxObstacle(4.2, 0.6, 1.8, 1.8, 1.0);
  // 2. Small wall barrier mid-south
  addBoxObstacle(-3.5, 2.2, 2.4, 0.6, 1.1);
  // 3. Rock props
  addRock(-6.2, -1.2, 0.6);
  addRock(7.0, 4.2, 0.55);
  addRock(-2.0, -4.2, 0.5);

  // Narrow passage / precision area where sneak is useful — two walls forming corridor
  // Corridor along X axis at north side
  addBoxObstacle(-7.5, -6.5, 0.6, 4.0, 1.2);
  addBoxObstacle(-4.2, -6.5, 0.6, 4.0, 1.2);
  // add visual markers for sneak corridor
  const sneakMat = new THREE.MeshStandardMaterial({ color: 0xc2b280, flatShading: true });
  const sneakFloor = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.02, 3.2), new THREE.MeshStandardMaterial({ color: 0xa8c686 }));
  sneakFloor.position.set(-5.85, 0.01, -6.5);
  group.add(sneakFloor);

  // --- Elevation: raised platform for climb + jump ---
  // Platform A (low) — south-east area? Actually place north-central for camera readability
  const platH = 1.25;
  const platMat = new THREE.MeshStandardMaterial({ color: 0x8d7a5a, flatShading: true });
  const platA = new THREE.Mesh(new THREE.BoxGeometry(4.2, platH, 3.6), platMat);
  platA.position.set(-5.8, platH / 2 - 0.02, -1.2);
  group.add(platA);

  const platB = new THREE.Mesh(new THREE.BoxGeometry(4.0, platH, 3.4), platMat);
  platB.position.set(0.8, platH / 2 - 0.02, -1.2);
  group.add(platB);

  // Elevated platform for climb: higher tier
  const highPlatH = 2.4;
  const highPlat = new THREE.Mesh(new THREE.BoxGeometry(4.4, highPlatH, 3.8), platMat);
  highPlat.position.set(2.2, highPlatH / 2 - 0.02, -7.2);
  group.add(highPlat);

  // Gap between platA and platB is ~2.4 units (from -3.7 to -1.2) — jump gap
  // Visual gap indicator: subtle darker strip
  const gapMarker = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.02, 3.0), new THREE.MeshStandardMaterial({ color: 0x4a6a3a }));
  gapMarker.position.set(-2.5, -0.12, -1.2);
  group.add(gapMarker);

  // Climbable wall: south face of high platform
  // Climbable surface is distinct color + pattern
  const climbMat = new THREE.MeshStandardMaterial({ color: 0xb89a5a, flatShading: true, emissive: 0x332200, emissiveIntensity: 0.12 });
  const climbWall = new THREE.Mesh(new THREE.BoxGeometry(1.9, highPlatH, 0.5), climbMat);
  climbWall.position.set(2.2, highPlatH / 2 - 0.02, -5.05);
  climbWall.name = "climbable";
  // Add ladder rungs visualization
  for (let i = 0; i < 5; i++) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.09), new THREE.MeshStandardMaterial({ color: 0x6b4a2b }));
    rung.position.set(2.2, 0.35 + i * 0.42, -4.78);
    group.add(rung);
  }
  group.add(climbWall);

  // Add vines/pattern for climb readability — simple planes
  const climbMarker = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.45, 6), new THREE.MeshStandardMaterial({ color: 0xfff3b0 }));
  climbMarker.position.set(2.2, highPlatH + 0.25, -5.05);
  group.add(climbMarker);

  // Trees / props for scale
  const treeMatF = new THREE.MeshStandardMaterial({ color: 0x2f6d3a, flatShading: true });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, flatShading: true });
  const treePositions = [
    { x: -9.2, z: 5.0 },
    { x: 8.2, z: 6.0 },
    { x: 9.0, z: -8.0 },
    { x: -8.8, z: 8.2 },
  ];
  for (const p of treePositions) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.7, 6), trunkMat);
    trunk.position.set(p.x, 0.35, p.z);
    group.add(trunk);
    const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.1, 6), treeMatF);
    foliage.position.set(p.x, 1.15, p.z);
    group.add(foliage);
  }

  // Boundary visual low walls
  const boundMat = new THREE.MeshStandardMaterial({ color: 0x5a6a7a, flatShading: true, transparent: true, opacity: 0.28 });
  const halfX = MOVEMENT_CONFIG.worldBounds.maxX;
  const halfZ = MOVEMENT_CONFIG.worldBounds.maxZ;
  // North/South walls (thin)
  const wallNS = new THREE.BoxGeometry(halfX * 2 + 1, 0.6, 0.35);
  const northWall = new THREE.Mesh(wallNS, boundMat);
  northWall.position.set(0, 0.3, -halfZ - 0.18);
  group.add(northWall);
  const southWall = new THREE.Mesh(wallNS, boundMat);
  southWall.position.set(0, 0.3, halfZ + 0.18);
  group.add(southWall);
  const wallEW = new THREE.BoxGeometry(0.35, 0.6, halfZ * 2 + 1);
  const westWall = new THREE.Mesh(wallEW, boundMat);
  westWall.position.set(-halfX - 0.18, 0.3, 0);
  group.add(westWall);
  const eastWall = new THREE.Mesh(wallEW, boundMat);
  eastWall.position.set(halfX + 0.18, 0.3, 0);
  group.add(eastWall);

  // ----- Traversal data (authored, explicit) -----
  // Jump link from platA east edge to platB west edge
  const jumpLinks = [
    {
      id: "gap_east_01",
      start: { x: -3.70, z: -1.2 },
      end: { x: -1.25, z: -1.2 },
      radius: 1.35,
      direction: { x: 1, z: 0 }, // east
      heightStart: platH,
      heightEnd: platH,
    },
    // Second direction for return jump
    {
      id: "gap_west_01",
      start: { x: -1.25, z: -0.4 },
      end: { x: -3.70, z: -0.4 },
      radius: 1.35,
      direction: { x: -1, z: 0 },
      heightStart: platH,
      heightEnd: platH,
    },
  ];

  // Climbable surface data
  const climbables = [
    {
      id: "ladder_south_high",
      // wall center
      x: 2.2,
      z: -5.05,
      w: 1.9,
      h: 0.5, // depth in Z
      bottomY: 0,
      topY: highPlatH,
      topPlatform: { x: 2.2, z: -7.2, w: 4.4, h: 3.8, topY: highPlatH },
      wallNormal: { x: 0, z: 1 }, // facing south, player approaches from south (+Z? actually south is +Z, wall at -5, player at -3 -> moving north -Z into wall)
      // For logic: entering from south side moving north (negative Z)
      approachDir: { x: 0, z: -1 },
    },
  ];

  // Ground height helper (simple)
  function getGroundHeight(x, z) {
    // high platform
    if (x >= 2.2 - 2.2 && x <= 2.2 + 2.2 && z >= -7.2 - 1.9 && z <= -7.2 + 1.9) return highPlatH;
    // platA
    if (x >= -5.8 - 2.1 && x <= -5.8 + 2.1 && z >= -1.2 - 1.8 && z <= -1.2 + 1.8) return platH;
    // platB
    if (x >= 0.8 - 2.0 && x <= 0.8 + 2.0 && z >= -1.2 - 1.7 && z <= -1.2 + 1.7) return platH;
    return 0;
  }

  // Obstacles already includes boxes; but platform sides are not obstacles except climb wall? Keep platforms as traversable elevated ground; side collisions implicit but we allow player to walk onto platforms via climb/jump only for high plat.
  // For low platforms, add step collision? For simplicity make low platforms accessible via gentle slope near gap side, but block other sides?
  // We will not add platform side collisions for low platforms to allow walking up (step of 1.25 would be unnatural). We'll treat platforms as walkable if player is near them and we handle height.

  return {
    group,
    obstacles,
    jumpLinks,
    climbables,
    getGroundHeight,
    bounds: MOVEMENT_CONFIG.worldBounds,
  };
}
