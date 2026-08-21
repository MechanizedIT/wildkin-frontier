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
    obstacles.push({ x, z, w: s * 1.6, h: s * 1.6, height: s, aabb: { minX: x - s * 0.8, maxX: x + s * 0.8, minZ: z - s * 0.8, maxZ: z + s * 0.8 } });
  }

  // 1. Boulder near center-east (diagnostic sliding test)
  addBoxObstacle(4.2, 0.6, 1.8, 1.8, 1.0);
  // 2. Small wall barrier mid-south
  addBoxObstacle(-3.5, 2.2, 2.4, 0.6, 1.1);
  // Phase 2.1: natural rock props removed — only grey diagnostic boxes remain; resource rocks come from resource system

  // Narrow precision corridor (sneak diagnostic)
  addBoxObstacle(-7.5, -6.5, 0.6, 4.0, 1.2);
  addBoxObstacle(-4.2, -6.5, 0.6, 4.0, 1.2);
  const sneakFloor = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.02, 3.2), new THREE.MeshStandardMaterial({ color: 0xa8c686 }));
  sneakFloor.position.set(-5.85, 0.01, -6.5);
  group.add(sneakFloor);

  // --- Elevation: raised platforms ---
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

  // Visible step-up markers for ground→platform access (post Phase 1.1 fix: low platforms were unreachable after side-collider fix)
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

  // Climbable wall: south face of high platform
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

  // Phase 2.1: decorative trees removed — world should not show non-harvestable tree lookalikes; harvestable trees come from resource system

  // Boundary visual low walls
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

  // ----- Explicit platform data (authored, fixed) -----
  const platforms = [
    { id: "lowA", x: -5.8, z: -1.2, w: 4.2, h: 3.6, height: platH, aabb: { minX: -5.8 - 2.1, maxX: -5.8 + 2.1, minZ: -1.2 - 1.8, maxZ: -1.2 + 1.8 } },
    { id: "lowB", x: 0.8, z: -1.2, w: 4.0, h: 3.4, height: platH, aabb: { minX: 0.8 - 2.0, maxX: 0.8 + 2.0, minZ: -1.2 - 1.7, maxZ: -1.2 + 1.7 } },
    { id: "high", x: 2.2, z: -7.2, w: 4.4, h: 3.8, height: highPlatH, aabb: { minX: 2.2 - 2.2, maxX: 2.2 + 2.2, minZ: -7.2 - 1.9, maxZ: -7.2 + 1.9 } },
  ];

  // Solid side colliders — same footprint as platforms, treated as walls when player is below top
  const platformSideColliders = platforms.map((p) => ({
    id: `side_${p.id}`,
    platformId: p.id,
    height: p.height,
    aabb: { ...p.aabb },
    w: p.w,
    h: p.h,
    x: p.x,
    z: p.z,
  }));

  // Legacy ground height helpers preserved but fixed: must not lift from side
  function getGroundHeight(x, z, currentY) {
    // If currentY is provided (feet height ~ y -0.36), only return elevated height when already elevated.
    // This prevents invisible ramp: X/Z overlap alone is not sufficient.
    const check = (p) => x >= p.aabb.minX && x <= p.aabb.maxX && z >= p.aabb.minZ && z <= p.aabb.maxZ;
    for (const p of platforms) {
      if (!check(p)) continue;
      if (currentY === undefined || currentY === null) {
        // backwards compat for tests that call without Y: fall back to old inclusive behavior but prioritize high platform first
        // For correctness, tests without Y will see elevated height; those tests are not for side-collision
      } else {
        // player foot Y approx currentY -0.36; compare platform top vs foot/posY
        // Require posY >= height + 0.36 -0.5  => posY >= height -0.15 approx. Use threshold.
        // player pos.y is center ~ groundY = height+0.36 when on top
        // So if posY < height+0.0 then below top.
        const threshold = p.height - 0.45; // posY must be at least this high to be considered on top
        if (currentY < threshold) return 0;
      }
      return p.height;
    }
    return 0;
  }

  function getCollisionObstaclesForHeight(posY) {
    const active = [...obstacles];
    for (const c of platformSideColliders) {
      // Keep collider inactive while player is on top or still falling from it.
      // Use lower threshold so falling off edge doesn't instantly trap under platform.
      const threshold = c.height - 0.18;
      if (posY < threshold) {
        active.push(c);
      }
    }
    return active;
  }

  function resolveStuckPosition(pos, radius, posY) {
    // If player ended up inside a side collider at low Y (e.g., fell vertically still inside footprint),
    // push to nearest outside point. Used after falling off high platform.
    const active = getCollisionObstaclesForHeight(posY);
    for (const c of active) {
      if (!c.id || !c.id.startsWith("side_")) continue;
      const closestX = Math.max(c.aabb.minX, Math.min(pos.x, c.aabb.maxX));
      const closestZ = Math.max(c.aabb.minZ, Math.min(pos.z, c.aabb.maxZ));
      const dx = pos.x - closestX;
      const dz = pos.z - closestZ;
      if (dx * dx + dz * dz < radius * radius - 1e-6) {
        // Inside — push outward by shortest axis
        const distX = Math.min(Math.abs(pos.x - c.aabb.minX), Math.abs(pos.x - c.aabb.maxX));
        const distZ = Math.min(Math.abs(pos.z - c.aabb.minZ), Math.abs(pos.z - c.aabb.maxZ));
        const push = radius + 0.08;
        if (distX < distZ) {
          pos.x = pos.x < c.x ? c.aabb.minX - push : c.aabb.maxX + push;
        } else {
          pos.z = pos.z < c.z ? c.aabb.minZ - push : c.aabb.maxZ + push;
        }
        return true;
      }
    }
    return false;
  }

  // For pure tests: expose filtered check without THREE
  function isBlockedByPlatformSide(x, z, radius, posY) {
    const colliders = getCollisionObstaclesForHeight(posY).filter((o) => o.id && o.id.startsWith("side_"));
    // reuse circle vs AABB test via simple inline
    for (const c of colliders) {
      const closestX = Math.max(c.aabb.minX, Math.min(x, c.aabb.maxX));
      const closestZ = Math.max(c.aabb.minZ, Math.min(z, c.aabb.maxZ));
      const dx = x - closestX;
      const dz = z - closestZ;
      if (dx * dx + dz * dz < radius * radius) return true;
    }
    return false;
  }

  // ----- Authored traversal: jump -----
  const jumpTraversals = [
    {
      id: "gap_east_01",
      triggerCenter: { x: -3.70, z: -1.2 },
      triggerRadius: 1.45,
      direction: { x: 1, z: 0 },
      landingRegion: { minX: -1.2, maxX: 2.2, minZ: -2.4, maxZ: 0.1, height: platH },
      minTakeoffSpeed: MOVEMENT_CONFIG.jumpMinTakeoffSpeed ?? 2.2,
      maxLandingCorrection: MOVEMENT_CONFIG.jumpMaxLandingCorrection ?? 1.4,
      landingPlatformId: "lowB",
    },
    {
      id: "gap_west_01",
      triggerCenter: { x: -1.25, z: -0.4 },
      triggerRadius: 1.45,
      direction: { x: -1, z: 0 },
      landingRegion: { minX: -7.6, maxX: -3.9, minZ: -2.4, maxZ: 0.3, height: platH },
      minTakeoffSpeed: MOVEMENT_CONFIG.jumpMinTakeoffSpeed ?? 2.2,
      maxLandingCorrection: MOVEMENT_CONFIG.jumpMaxLandingCorrection ?? 1.4,
      landingPlatformId: "lowA",
    },
    // Ground → low platforms step-up jumps (fix: after side-collider fix platforms were unreachable)
    {
      id: "step_up_lowA_south",
      triggerCenter: { x: -5.8, z: 1.45 },
      triggerRadius: 1.25,
      direction: { x: 0, z: -1 },
      landingRegion: { minX: -7.2, maxX: -4.4, minZ: -2.6, maxZ: -0.2, height: platH },
      minTakeoffSpeed: 1.9,
      maxLandingCorrection: 1.4,
      landingPlatformId: "lowA",
    },
    {
      id: "step_up_lowB_south",
      triggerCenter: { x: 0.8, z: 1.35 },
      triggerRadius: 1.25,
      direction: { x: 0, z: -1 },
      landingRegion: { minX: -0.6, maxX: 2.0, minZ: -2.4, maxZ: -0.1, height: platH },
      minTakeoffSpeed: 1.9,
      maxLandingCorrection: 1.4,
      landingPlatformId: "lowB",
    },
  ];

  // Legacy alias for old code/tests that expect jumpLinks
  const jumpLinks = jumpTraversals.map((t) => ({
    id: t.id,
    start: { ...t.triggerCenter },
    end: {
      x: (t.landingRegion.minX + t.landingRegion.maxX) / 2,
      z: (t.landingRegion.minZ + t.landingRegion.maxZ) / 2,
    },
    radius: t.triggerRadius,
    direction: { ...t.direction },
    heightStart: platforms.find((p) => p.id === t.landingPlatformId)?.height ?? platH,
    heightEnd: t.landingRegion.height,
  }));

  // ----- Authored climbables -----
  const climbables = [
    {
      id: "ladder_south_high",
      x: 2.2,
      z: -5.05,
      w: 1.9,
      h: 0.5,
      bottomY: 0,
      topY: highPlatH,
      topPlatform: { x: 2.2, z: -7.2, w: 4.4, h: 3.8, topY: highPlatH, aabb: platforms[2].aabb },
      wallNormal: { x: 0, z: 1 },
      approachDir: { x: 0, z: -1 },
      // Small authored top-entry region inside upper platform southern edge
      topEntryRegion: { minX: 1.25, maxX: 3.15, minZ: -6.0, maxZ: -5.25 },
      mantleExit: { x: 2.2, z: -6.4 },
    },
  ];

  return {
    group,
    obstacles,
    platforms,
    platformSideColliders,
    jumpLinks, // legacy
    jumpTraversals,
    climbables,
    getGroundHeight,
    getCollisionObstaclesForHeight,
    resolveStuckPosition,
    isBlockedByPlatformSide,
    bounds: MOVEMENT_CONFIG.worldBounds,
  };
}
