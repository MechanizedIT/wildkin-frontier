import * as THREE from "three";
import { MOVEMENT_CONFIG } from "../game/config.js";
import { createStaticWorld } from "./staticWorldBuilder.js";

// createMovementPlayground — data-driven wrapper (Phase 3.5B)
// Single authoritative source is world.json → normalized -> registry.
// Static world/traversal/anchor visuals derive from normalized data.
// For backwards compatibility (tests without world data), create minimal base ground + boundaries.

export function createMovementPlayground(worldData = null) {
  if (worldData && worldData.regions) {
    return createStaticWorld(worldData);
  }
  // Legacy fallback for elevation/traversal tests that call without world data.
  // Production always passes worldData (single source), so this duplicate is test-only.
  return createLegacyPlayground();
}

function createLegacyPlayground() {
  const group = new THREE.Group();
  group.name = "movement-playground";
  const groundGeo = new THREE.BoxGeometry(26, 0.5, 24);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x7bb26a, flatShading: true, roughness: 0.95 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.set(0, -0.25, 0);
  group.add(ground);
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x5f8a52, flatShading: true });
  const edge = new THREE.Mesh(new THREE.BoxGeometry(27, 0.25, 25), edgeMat);
  edge.position.y = -0.58;
  group.add(edge);
  const obstacles = [];
  const obstacleMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, flatShading: true });
  function addBoxObstacle(x, z, w, h, height = 0.9) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, h), obstacleMat);
    mesh.position.set(x, height / 2 - 0.02, z);
    group.add(mesh);
    obstacles.push({ x, z, w, h, height, aabb: { minX: x - w / 2, maxX: x + w / 2, minZ: z - h / 2, maxZ: z + h / 2 } });
  }
  addBoxObstacle(4.2, 0.6, 1.8, 1.8, 1.0);
  addBoxObstacle(-3.5, 2.2, 2.4, 0.6, 1.1);
  addBoxObstacle(-7.5, -6.5, 0.6, 4.0, 1.2);
  addBoxObstacle(-4.2, -6.5, 0.6, 4.0, 1.2);
  const sneakFloor = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.02, 3.2), new THREE.MeshStandardMaterial({ color: 0xa8c686 }));
  sneakFloor.position.set(-5.85, 0.01, -6.5);
  group.add(sneakFloor);
  const platH = 1.25;
  const platMat = new THREE.MeshStandardMaterial({ color: 0x8d7a5a, flatShading: true });
  const platA = new THREE.Mesh(new THREE.BoxGeometry(4.2, platH, 3.6), platMat);
  platA.position.set(-5.8, platH / 2 - 0.02, -1.2);
  group.add(platA);
  const platB = new THREE.Mesh(new THREE.BoxGeometry(4.0, platH, 3.4), platMat);
  platB.position.set(0.8, platH / 2 - 0.02, -1.2);
  group.add(platB);
  const highPlatH = 2.4;
  const highPlat = new THREE.Mesh(new THREE.BoxGeometry(4.4, highPlatH, 3.8), platMat);
  highPlat.position.set(2.2, highPlatH / 2 - 0.02, -7.2);
  group.add(highPlat);
  const gapMarker = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.02, 3.0), new THREE.MeshStandardMaterial({ color: 0x4a6a3a }));
  gapMarker.position.set(-2.5, -0.12, -1.2);
  group.add(gapMarker);
  const stepMat = new THREE.MeshStandardMaterial({ color: 0xc9b48a, flatShading: true });
  const stepA = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 1.0), stepMat);
  stepA.position.set(-5.8, 0.04, 1.45);
  group.add(stepA);
  const stepB = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 1.0), stepMat);
  stepB.position.set(0.8, 0.04, 1.35);
  group.add(stepB);
  const stepARing = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.52, 14), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  stepARing.rotation.x = -Math.PI / 2;
  stepARing.position.set(-5.8, 0.06, 1.45);
  group.add(stepARing);
  const stepBRing = stepARing.clone();
  stepBRing.position.set(0.8, 0.06, 1.35);
  group.add(stepBRing);
  const climbMat = new THREE.MeshStandardMaterial({ color: 0xb89a5a, flatShading: true, emissive: 0x332200, emissiveIntensity: 0.12 });
  const climbWall = new THREE.Mesh(new THREE.BoxGeometry(1.9, highPlatH, 0.5), climbMat);
  climbWall.position.set(2.2, highPlatH / 2 - 0.02, -5.05);
  climbWall.name = "climbable";
  for (let i = 0; i < 5; i++) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.09), new THREE.MeshStandardMaterial({ color: 0x6b4a2b }));
    rung.position.set(2.2, 0.35 + i * 0.42, -4.78);
    group.add(rung);
  }
  group.add(climbWall);
  const climbMarker = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.45, 6), new THREE.MeshStandardMaterial({ color: 0xfff3b0 }));
  climbMarker.position.set(2.2, highPlatH + 0.25, -5.05);
  group.add(climbMarker);
  const boundMat = new THREE.MeshStandardMaterial({ color: 0x5a6a7a, flatShading: true, transparent: true, opacity: 0.28 });
  const halfX = MOVEMENT_CONFIG.worldBounds.maxX;
  const halfZ = MOVEMENT_CONFIG.worldBounds.maxZ;
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
  const platforms = [
    { id: "lowA", x: -5.8, z: -1.2, w: 4.2, h: 3.6, height: platH, aabb: { minX: -5.8 - 2.1, maxX: -5.8 + 2.1, minZ: -1.2 - 1.8, maxZ: -1.2 + 1.8 } },
    { id: "lowB", x: 0.8, z: -1.2, w: 4.0, h: 3.4, height: platH, aabb: { minX: 0.8 - 2.0, maxX: 0.8 + 2.0, minZ: -1.2 - 1.7, maxZ: -1.2 + 1.7 } },
    { id: "high", x: 2.2, z: -7.2, w: 4.4, h: 3.8, height: highPlatH, aabb: { minX: 2.2 - 2.2, maxX: 2.2 + 2.2, minZ: -7.2 - 1.9, maxZ: -7.2 + 1.9 } },
  ];
  const platformSideColliders = platforms.map((p) => ({
    id: `side_${p.id}`, platformId: p.id, height: p.height, aabb: { ...p.aabb }, w: p.w, h: p.h, x: p.x, z: p.z,
  }));
  function getGroundHeight(x, z, currentY) {
    const check = (p) => x >= p.aabb.minX && x <= p.aabb.maxX && z >= p.aabb.minZ && z <= p.aabb.maxZ;
    for (const p of platforms) {
      if (!check(p)) continue;
      if (currentY === undefined || currentY === null) return p.height;
      const threshold = p.height - 0.45;
      if (currentY < threshold) return 0;
      return p.height;
    }
    return 0;
  }
  function getCollisionObstaclesForHeight(posY) {
    const active = [...obstacles];
    for (const c of platformSideColliders) {
      const threshold = c.height - 0.18;
      if (posY < threshold) active.push(c);
    }
    return active;
  }
  function resolveStuckPosition(pos, radius, posY) {
    const active = getCollisionObstaclesForHeight(posY);
    for (const c of active) {
      if (!c.id || !c.id.startsWith("side_")) continue;
      const closestX = Math.max(c.aabb.minX, Math.min(pos.x, c.aabb.maxX));
      const closestZ = Math.max(c.aabb.minZ, Math.min(pos.z, c.aabb.maxZ));
      const dx = pos.x - closestX;
      const dz = pos.z - closestZ;
      if (dx * dx + dz * dz < radius * radius - 1e-6) {
        const distX = Math.min(Math.abs(pos.x - c.aabb.minX), Math.abs(pos.x - c.aabb.maxX));
        const distZ = Math.min(Math.abs(pos.z - c.aabb.minZ), Math.abs(pos.z - c.aabb.maxZ));
        const push = radius + 0.08;
        if (distX < distZ) pos.x = pos.x < c.x ? c.aabb.minX - push : c.aabb.maxX + push;
        else pos.z = pos.z < c.z ? c.aabb.minZ - push : c.aabb.maxZ + push;
        return true;
      }
    }
    return false;
  }
  function isBlockedByPlatformSide(x, z, radius, posY) {
    const colliders = getCollisionObstaclesForHeight(posY).filter((o) => o.id && o.id.startsWith("side_"));
    for (const c of colliders) {
      const closestX = Math.max(c.aabb.minX, Math.min(x, c.aabb.maxX));
      const closestZ = Math.max(c.aabb.minZ, Math.min(z, c.aabb.maxZ));
      const dx = x - closestX;
      const dz = z - closestZ;
      if (dx * dx + dz * dz < radius * radius) return true;
    }
    return false;
  }
  const jumpTraversals = [
    { id: "gap_east_01", triggerCenter: { x: -3.70, z: -1.2 }, triggerRadius: 1.45, direction: { x: 1, z: 0 }, landingRegion: { minX: -1.2, maxX: 2.2, minZ: -2.4, maxZ: 0.1, height: platH }, minTakeoffSpeed: MOVEMENT_CONFIG.jumpMinTakeoffSpeed ?? 2.2, maxLandingCorrection: MOVEMENT_CONFIG.jumpMaxLandingCorrection ?? 1.4, landingPlatformId: "lowB" },
    { id: "gap_west_01", triggerCenter: { x: -1.25, z: -0.4 }, triggerRadius: 1.45, direction: { x: -1, z: 0 }, landingRegion: { minX: -7.6, maxX: -3.9, minZ: -2.4, maxZ: 0.3, height: platH }, minTakeoffSpeed: MOVEMENT_CONFIG.jumpMinTakeoffSpeed ?? 2.2, maxLandingCorrection: MOVEMENT_CONFIG.jumpMaxLandingCorrection ?? 1.4, landingPlatformId: "lowA" },
    { id: "step_up_lowA_south", triggerCenter: { x: -5.8, z: 1.45 }, triggerRadius: 1.25, direction: { x: 0, z: -1 }, landingRegion: { minX: -7.2, maxX: -4.4, minZ: -2.6, maxZ: -0.2, height: platH }, minTakeoffSpeed: 1.9, maxLandingCorrection: 1.4, landingPlatformId: "lowA" },
    { id: "step_up_lowB_south", triggerCenter: { x: 0.8, z: 1.35 }, triggerRadius: 1.25, direction: { x: 0, z: -1 }, landingRegion: { minX: -0.6, maxX: 2.0, minZ: -2.4, maxZ: -0.1, height: platH }, minTakeoffSpeed: 1.9, maxLandingCorrection: 1.4, landingPlatformId: "lowB" },
  ];
  const jumpLinks = jumpTraversals.map((t) => ({
    id: t.id, start: { ...t.triggerCenter }, end: { x: (t.landingRegion.minX + t.landingRegion.maxX) / 2, z: (t.landingRegion.minZ + t.landingRegion.maxZ) / 2 }, radius: t.triggerRadius, direction: { ...t.direction }, heightStart: platforms.find((p) => p.id === t.landingPlatformId)?.height ?? platH, heightEnd: t.landingRegion.height,
  }));
  const climbables = [
    { id: "ladder_south_high", x: 2.2, z: -5.05, w: 1.9, h: 0.5, bottomY: 0, topY: highPlatH, topPlatform: { x: 2.2, z: -7.2, w: 4.4, h: 3.8, topY: highPlatH, aabb: platforms[2].aabb }, wallNormal: { x: 0, z: 1 }, approachDir: { x: 0, z: -1 }, topEntryRegion: { minX: 1.25, maxX: 3.15, minZ: -6.0, maxZ: -5.25 }, mantleExit: { x: 2.2, z: -6.4 } },
  ];
  return { group, obstacles, platforms, platformSideColliders, jumpLinks, jumpTraversals, climbables, getGroundHeight, getCollisionObstaclesForHeight, resolveStuckPosition, isBlockedByPlatformSide, bounds: MOVEMENT_CONFIG.worldBounds };
}
