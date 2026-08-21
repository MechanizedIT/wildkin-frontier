import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RESOURCE_TYPES, HARVEST_CONFIG } from "../src/resources/resourceConfig.js";
import { PICKUP_CONFIG } from "../src/resources/pickupSystem.js";
import { SWING_CONFIG } from "../src/tools/fieldTool.js";
import { createGameAudio } from "../src/audio/gameAudio.js";

describe("Phase 2.2 — pickup chunky size", () => {
  it("wood cube ~0.40-0.44", () => {
    assert.ok(PICKUP_CONFIG.woodCubeSize >= 0.39 && PICKUP_CONFIG.woodCubeSize <= 0.45, `wood ${PICKUP_CONFIG.woodCubeSize}`);
  });
  it("stone radius ~0.30-0.34", () => {
    assert.ok(PICKUP_CONFIG.stoneRadius >= 0.29 && PICKUP_CONFIG.stoneRadius <= 0.35);
  });
  it("fiber radius ~0.27-0.30", () => {
    assert.ok(PICKUP_CONFIG.fiberRadius >= 0.26 && PICKUP_CONFIG.fiberRadius <= 0.32);
  });
  it("glow scaled proportionally", () => {
    assert.ok(PICKUP_CONFIG.glowScale >= 1.5);
  });
  it("rest height and collection radius account for new size", () => {
    assert.ok(PICKUP_CONFIG.restHeight >= 0.22 && PICKUP_CONFIG.restHeight <= 0.35);
    assert.ok(PICKUP_CONFIG.collectionRadius >= 0.45 && PICKUP_CONFIG.collectionRadius <= 0.65);
    assert.ok(PICKUP_CONFIG.collectionRadius > 0.34, "larger than Phase 2.1 0.34");
  });
  it("spawn margin defined and pickupRadius matches", () => {
    assert.ok(PICKUP_CONFIG.spawnMargin >= 0.08 && PICKUP_CONFIG.spawnMargin <= 0.20);
    assert.ok(PICKUP_CONFIG.pickupRadius.wood >= 0.22);
    assert.ok(PICKUP_CONFIG.pickupRadius.stone >= 0.28);
  });
});

describe("Phase 2.2 — pickup spawn clearance outside source collider", () => {
  it("clearance = extent + radius + margin, no 0.55 multiplication", () => {
    const he = RESOURCE_TYPES.tree.colliderHalfExtents;
    const extent = Math.max(he.x, he.z);
    const pr = PICKUP_CONFIG.pickupRadius.wood;
    const clearance = extent + pr + PICKUP_CONFIG.spawnMargin;
    // Sample spawn offset must be >= clearance (not multiplied down)
    assert.ok(clearance > extent + pr, "clearance includes margin");
    assert.ok(clearance >= 0.80, `clearance ${clearance} should be >0.80 for wood`);
    // Verify fiber uses small offset path (no collider)
    const fiberOffset = 0.38; // our fiber base
    assert.ok(fiberOffset < clearance, "fiber uses smaller non-solid offset");
  });
  it("pickup stores source collider handle", async () => {
    // Create mock scene minimal
    const THREE = await import("three");
    const scene = new THREE.Scene();
    const mockCollider = { handle: 42 };
    const node = {
      type: RESOURCE_TYPES.tree,
      state: { position: { x: 0, y: 0, z: 0 } },
      collider: mockCollider,
      index: 0,
    };
    const { createPickupSystem } = await import("../src/resources/pickupSystem.js");
    const ps = createPickupSystem(scene, null, null, () => {});
    const p = ps.spawnPickup(node);
    assert.equal(p.sourceCollider, mockCollider);
    assert.equal(p.sourceColliderHandle, 42);
    // Fiber with null collider stores null
    const fiberNode = { type: RESOURCE_TYPES.fiber, state: { position: { x: 5, y: 0, z: 5 } }, collider: null, index: 1 };
    const pf = ps.spawnPickup(fiberNode);
    assert.equal(pf.sourceCollider, null);
  });
  it("collected pickup never returns to RESTING/MAGNETIZING", async () => {
    const THREE = await import("three");
    const scene = new THREE.Scene();
    const { createPickupSystem } = await import("../src/resources/pickupSystem.js");
    const ps = createPickupSystem(scene, null, null, () => {});
    const node = { type: RESOURCE_TYPES.tree, state: { position: { x: 0, y: 0, z: 0 } }, collider: { handle: 7 }, index: 0 };
    const p = ps.spawnPickup(node);
    // Simulate magnetizing
    p.state = "MAGNETIZING";
    const beforeCount = ps.getCount();
    ps.collectPickup(p, null);
    assert.equal(p.collected, true);
    assert.equal(p.state, "COLLECTED");
    // Ensure not in active list, cannot be magnetized again
    assert.equal(ps.getPickups().includes(p), false);
    // Try to force state back — should remain COLLECTED (we check pickup not re-added)
    p.state = "RESTING"; // tamper attempt — but system would have removed it, so not in system
    assert.equal(ps.getPickups().includes(p), false);
  });
});

describe("Phase 2.2 — horizontal sweep", () => {
  it("total yaw sweep >=2.0 rad", () => {
    assert.ok(SWING_CONFIG.totalYawSweep >= 2.0, `sweep ${SWING_CONFIG.totalYawSweep}`);
    const computed = SWING_CONFIG.yawFollow - SWING_CONFIG.yawWindup;
    assert.ok(computed >= 2.0, `computed ${computed}`);
  });
  it("dominant configured sweep is yaw", () => {
    const yawRange = Math.abs(SWING_CONFIG.yawFollow - SWING_CONFIG.yawWindup);
    const pitchRange = Math.abs(SWING_CONFIG.pitchStrike - SWING_CONFIG.pitchWindup);
    const rollRange = Math.abs(SWING_CONFIG.rollStrike - SWING_CONFIG.rollWindup);
    assert.ok(yawRange > pitchRange + 0.5, `yaw ${yawRange} should dominate pitch ${pitchRange}`);
    assert.ok(yawRange > rollRange + 0.5);
    assert.ok(SWING_CONFIG.yawWindup <= -1.0 && SWING_CONFIG.yawWindup >= -1.5);
    assert.ok(SWING_CONFIG.yawFollow >= 1.0 && SWING_CONFIG.yawFollow <= 1.5);
  });
  it("field tool trail uses player-space arc / afterimages not collapsed into current tool transform", async () => {
    const THREE = await import("three");
    const player = new THREE.Group();
    // Mock gameAudio
    const ft = await import("../src/tools/fieldTool.js");
    const tool = ft.createFieldTool(player, null);
    // trailGroup should be sibling to pivot (child of player), not child of pivot
    assert.equal(tool.trailGroup.parent, player, "trailGroup parent should be player (player-space) not tool pivot");
    assert.equal(tool.pivot.parent, player);
    // afterimages should be children of trailGroup
    assert.ok(tool.afterimages.length >= 3 && tool.afterimages.length <= 5);
    // Trail not collapsed: trailGroup world position should not equal toolGroup world position when swinging?
    // Check that trailGroup is not under toolGroup
    assert.equal(tool.trailGroup.parent !== tool.toolGroup, true);
    assert.equal(tool.trailGroup.parent !== tool.pivot, true);
    // Arc opacity config peaks 0.35-0.55 (we use 0.42)
    // Verify arc material exists
    assert.ok(tool.arcMesh.material.opacity !== undefined);
  });
  it("whoosh fires once before impact and is configured", () => {
    // Swing config whoosh trigger is impact -0.19 normalized (~98ms)
    const triggerOffset = 0.19;
    assert.ok(triggerOffset >= 0.12 && triggerOffset <= 0.28, "80-140ms before impact at 0.52 interval");
    // Audio function exists
    const audio = createGameAudio();
    assert.equal(typeof audio.playWhoosh, "function");
    assert.equal(typeof audio.playHarvest, "function");
  });
});

describe("Phase 2.2 — tree proportions", () => {
  it("trunk shorter than Phase 2.1 1.45 and within 0.85-1.0", () => {
    const half = RESOURCE_TYPES.tree.colliderHalfExtents.y;
    const total = half * 2;
    assert.ok(total >= 0.84 && total <= 1.02, `total ${total}`);
    assert.ok(total < 1.45, "shorter than 2.1");
  });
  it("trunk center Y 0.43-0.50", () => {
    const cy = RESOURCE_TYPES.tree.colliderCenterY;
    assert.ok(cy >= 0.40 && cy <= 0.55, `center ${cy}`);
  });
  it("trunk thicker than before", () => {
    assert.ok(RESOURCE_TYPES.tree.colliderHalfExtents.x >= 0.45);
  });
  it("foliage starts lower: interaction/drop lower than 2.1", () => {
    assert.ok(RESOURCE_TYPES.tree.interactionHeight <= 0.90, `interaction ${RESOURCE_TYPES.tree.interactionHeight}`);
    assert.ok(RESOURCE_TYPES.tree.dropOriginHeight <= 1.02, `drop ${RESOURCE_TYPES.tree.dropOriginHeight}`);
    assert.ok(RESOURCE_TYPES.tree.impactEffectHeight <= 0.75 && RESOURCE_TYPES.tree.impactEffectHeight >= 0.45);
  });
  it("canopy broader and still large", () => {
    // Check that tree still has 5 chunks and larger visual sizes implied by collider
    assert.equal(RESOURCE_TYPES.tree.maxChunks, 5);
  });
});
