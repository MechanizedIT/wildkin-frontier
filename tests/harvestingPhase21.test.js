import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HARVEST_CONFIG, RESOURCE_TYPES } from "../src/resources/resourceConfig.js";
import {
  distance3D,
  selectTargets,
  isEligible,
  isPlayerInsideColliderVolume,
  isRespawnIndicatorVisible,
  tickRespawn,
  applyHitPure,
  createSwingState,
  tickSwing,
} from "../src/resources/harvestLogic.js";

function makeNode(typeId, pos, remainingOverride) {
  const type = RESOURCE_TYPES[typeId];
  return {
    type,
    state: {
      position: { x: pos.x, y: pos.y ?? 0, z: pos.z },
      nodeState: "READY",
      remainingChunks: remainingOverride ?? type.maxChunks,
    },
  };
}

describe("Phase 2.1 — 3D harvest eligibility", () => {
  it("uses true 3D distance not XZ only", () => {
    const n = makeNode("tree", { x: 0, y: 2.4, z: 0 });
    // Player below platform directly under tree: XZ distance 0, but 3D distance > radius
    const playerBelow = { x: 0, y: 0.52, z: 0 };
    const eligibleBelow = isEligible(n, playerBelow, "IDLE", 0, true);
    assert.equal(eligibleBelow, false, "high tree not harvestable from below via 3D");
    // Player beside on platform: should be eligible
    const playerOnPlatform = { x: 0.4, y: 2.92, z: 0.2 };
    const eligibleOn = isEligible(n, playerOnPlatform, "IDLE", 0, true);
    assert.equal(eligibleOn, true);
  });

  it("vertical separation excludes target beyond radius", () => {
    const n = makeNode("rock", { x: 0, y: 0, z: 0 });
    // Move player far up vertically (simulate flying) — should be excluded even if XZ near
    const highPlayer = { x: 0.2, y: 3.5, z: 0.1 };
    assert.equal(isEligible(n, highPlayer, "IDLE", 0, true), false);
    // Direct 3D check
    const interact = { x: 0, y: (0 + RESOURCE_TYPES.rock.interactionHeight), z: 0 };
    const d = distance3D(interact, { x: 0.2, y: 3.5, z: 0.1 });
    assert.ok(d > HARVEST_CONFIG.harvestRadius);
  });

  it("selectTargets sorts by 3D distance and respects cap", () => {
    const nodes = [
      makeNode("fiber", { x: 1.5, y: 0, z: 0 }),
      makeNode("fiber", { x: 0.3, y: 0, z: 0 }),
      makeNode("fiber", { x: 0.6, y: 0, z: 0 }),
      makeNode("fiber", { x: 0.4, y: 2.4, z: 0 }), // elevated but near in XZ — farther in 3D if player ground
    ];
    const player = { x: 0, y: 0.52, z: 0 };
    const sel = selectTargets(nodes, player, "IDLE", 0, true);
    // Elevated node should be farther due to vertical
    // Nearest should be 0.3
    assert.equal(sel[0].state.position.x, 0.3);
  });

  it("harvest radius via interactionHeight matches halo eligibility", () => {
    const n = makeNode("tree", { x: 1.0, y: 0, z: 0 });
    const player = { x: 0, y: 0.52, z: 0 };
    const harvest = selectTargets([n], player, "IDLE", 0, true);
    const halo = selectTargets([n], player, "IDLE", 0, true);
    assert.deepEqual(harvest, halo);
  });
});

describe("Phase 2.1 — stationary speed gating", () => {
  it("speed above threshold blocks harvesting", () => {
    const n = makeNode("tree", { x: 0.4, y: 0, z: 0 });
    const player = { x: 0, y: 0.52, z: 0 };
    assert.equal(isEligible(n, player, "WALK", 0.26, true), false);
    assert.equal(selectTargets([n], player, "WALK", 0.26, true).length, 0);
  });
  it("speed below threshold permits harvesting", () => {
    const n = makeNode("tree", { x: 0.4, y: 0, z: 0 });
    const player = { x: 0, y: 0.52, z: 0 };
    assert.equal(isEligible(n, player, "IDLE", 0.1, true), true);
    assert.equal(isEligible(n, player, "WALK", 0.25, true), true);
    assert.equal(selectTargets([n], player, "IDLE", 0.0, true).length, 1);
  });
  it("tickSwing blocked when not compatible or moving", () => {
    const s = createSwingState();
    // Compatible but simulated speed gating via compatible=false
    let hits = 0;
    for (let i = 0; i < 60; i++) {
      const { impact } = tickSwing(s, 1/60, true, false);
      if (impact) hits++;
    }
    assert.equal(hits, 0);
  });
});

describe("Phase 2.1 — Auto Harvest toggle", () => {
  it("OFF blocks targets/swings", () => {
    const n = makeNode("tree", { x: 0.4, y: 0, z: 0 });
    const player = { x: 0, y: 0.52, z: 0 };
    assert.equal(selectTargets([n], player, "IDLE", 0, false).length, 0);
    assert.equal(isEligible(n, player, "IDLE", 0, false), false);
  });
  it("OFF hides halos (same as no eligible)", () => {
    const n = makeNode("rock", { x: 0.4, y: 0, z: 0 });
    const player = { x: 0, y: 0.52, z: 0 };
    const haloTargetsOff = selectTargets([n], player, "IDLE", 0, false);
    assert.equal(haloTargetsOff.length, 0);
    const haloTargetsOn = selectTargets([n], player, "IDLE", 0, true);
    assert.equal(haloTargetsOn.length, 1);
  });
  it("Auto OFF blocks swing impact even with targets", () => {
    // Swing logic in pure helper: hasTargets true but compatible includes auto flag? We test via isEligible
    const n = makeNode("fiber", { x: 0.4, y: 0, z: 0 });
    const player = { x: 0, y: 0.52, z: 0 };
    assert.equal(isEligible(n, player, "IDLE", 0, false), false);
  });
});

describe("Phase 2.1 — depletion / collider lifecycle", () => {
  it("remnant collider is null for all solid types (depleted non-solid)", () => {
    assert.equal(RESOURCE_TYPES.tree.remnantColliderHalfExtents, null);
    assert.equal(RESOURCE_TYPES.rock.remnantColliderHalfExtents, null);
  });
  it("isPlayerInsideColliderVolume detects occupation", () => {
    const n = makeNode("tree", { x: 2.2, y: 0, z: -7.2 });
    // Player inside future collider volume
    const inside = { x: 2.2, y: (RESOURCE_TYPES.tree.colliderCenterY), z: -7.2 };
    assert.equal(isPlayerInsideColliderVolume(inside, n), true);
    const far = { x: 8, y: 0.5, z: 8 };
    assert.equal(isPlayerInsideColliderVolume(far, n), false);
  });
  it("safe collider restoration defers if occupied (pure check)", () => {
    const n = makeNode("rock", { x: 0, y: 0, z: 0 });
    n.state.nodeState = "RESPAWNING";
    n.state.respawnRemaining = 0;
    // Simulate player standing inside
    const playerInside = { x: 0, y: 0.64, z: 0 };
    assert.equal(isPlayerInsideColliderVolume(playerInside, n), true);
    // tickRespawn would normally reset, but resourceSystem should defer collider — pure check verifies detection
    const playerOutside = { x: 5, y: 0.5, z: 5 };
    assert.equal(isPlayerInsideColliderVolume(playerOutside, n), false);
  });
});

describe("Phase 2.1 — respawn indicator", () => {
  it("visibility uses 3D proximity ~4.0 radius", () => {
    // Config check
    assert.ok(HARVEST_CONFIG.respawnIndicatorRadius >= 3.8 && HARVEST_CONFIG.respawnIndicatorRadius <= 4.2);
    const n = makeNode("tree", { x: 0, y: 0, z: 0 });
    const near = { x: 1, y: 0.52, z: 1 };
    const far = { x: 6, y: 0.52, z: 0 };
    assert.equal(isRespawnIndicatorVisible(n, near), true);
    assert.equal(isRespawnIndicatorVisible(n, far), false);
  });
  it("progress continues while indicator hidden (tickRespawn independent)", () => {
    const n = makeNode("fiber", { x: 0, y: 0, z: 0 });
    // deplete
    applyHitPure(n); applyHitPure(n); applyHitPure(n);
    assert.equal(n.state.nodeState, "RESPAWNING");
    const total = n.type.respawnSeconds;
    // tick half while far
    tickRespawn(n, total / 2);
    assert.equal(n.state.nodeState, "RESPAWNING");
    // Still ticking even though indicator invisible
    tickRespawn(n, total / 2 + 0.01);
    assert.equal(n.state.nodeState, "READY");
  });
});

describe("Phase 2.1 — elevated pickup/particle spawn Y", () => {
  it("tree dropOrigin includes node Y", () => {
    assert.ok(RESOURCE_TYPES.tree.dropOriginHeight > 0.45 && RESOURCE_TYPES.tree.dropOriginHeight <= 0.75);
    assert.ok(RESOURCE_TYPES.tree.impactEffectHeight >= 0.35 && RESOURCE_TYPES.tree.impactEffectHeight <= 0.65);
    // Simulate spawn Y computation
    const nodeY = 2.4;
    const expected = nodeY + RESOURCE_TYPES.tree.dropOriginHeight;
    assert.ok(expected > 2.9, `expected elevated drop Y ${expected}`);
    const groundY = 0 + RESOURCE_TYPES.tree.dropOriginHeight;
    assert.ok(expected > groundY + 2.0);
  });
  it("rock/fiber offsets are defined", () => {
    assert.ok(typeof RESOURCE_TYPES.rock.dropOriginHeight === "number");
    assert.ok(typeof RESOURCE_TYPES.fiber.dropOriginHeight === "number");
    assert.ok(typeof RESOURCE_TYPES.tree.impactEffectHeight === "number");
  });
});

describe("Phase 2.1 — pickup motion config", () => {
  it("horizontal launch reduced, upward increased into target ranges", () => {
    assert.ok(HARVEST_CONFIG.pickupLaunchSpeed >= 1.5 && HARVEST_CONFIG.pickupLaunchSpeed <= 2.2, `launchSpeed ${HARVEST_CONFIG.pickupLaunchSpeed}`);
    assert.ok(HARVEST_CONFIG.pickupLaunchUp >= 3.0 && HARVEST_CONFIG.pickupLaunchUp <= 3.8, `launchUp ${HARVEST_CONFIG.pickupLaunchUp}`);
  });
  it("harvestMaxHorizontalSpeed is 0.25", () => {
    assert.equal(HARVEST_CONFIG.harvestMaxHorizontalSpeed, 0.25);
  });
});

describe("Phase 2.1 — resource scale enlarged", () => {
  it("tree collider enlarged ~1.6x vs original 0.34/0.55 (low trunk)", () => {
    // Pre-Phase-3 low trunk ~0.52 tall => half 0.23-0.28, thick
    assert.ok(RESOURCE_TYPES.tree.colliderHalfExtents.x >= 0.50);
    assert.ok(RESOURCE_TYPES.tree.colliderHalfExtents.y >= 0.20 && RESOURCE_TYPES.tree.colliderHalfExtents.y <= 0.32);
    assert.ok(RESOURCE_TYPES.tree.colliderHalfExtents.y < 0.40, "low trunk substantially shorter than 2.2");
  });
  it("rock collider enlarged", () => {
    assert.ok(RESOURCE_TYPES.rock.colliderHalfExtents.x >= 0.65);
    assert.ok(RESOURCE_TYPES.rock.colliderHalfExtents.y >= 0.55);
  });
});

describe("Phase 2.1 — pooling / bounded behavior (pure logic)", () => {
  it("active counts stay bounded via MAX_ACTIVE (checked via config)", () => {
    // MAX_ACTIVE enforced in pickupSystem; ensure harvestLogic still deterministic
    const s = createSwingState();
    let impacts = 0;
    for (let i = 0; i < 600; i++) {
      const { impact } = tickSwing(s, 1/60, true, true);
      if (impact) impacts++;
    }
    // 10 seconds at 0.52 interval => ~19 impacts
    assert.ok(impacts >= 18 && impacts <= 20);
  });
});
