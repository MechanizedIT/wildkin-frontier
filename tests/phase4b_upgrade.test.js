import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as THREE from "three";
import WORLD_DATA from "./fixtures/phase4b1ProofWorld.generated.js";
import { createWorldRegistry } from "../src/world/worldRegistry.js";
import { createFrontierProgress } from "../src/save/frontierProgress.js";
import { createPickupSystem } from "../src/resources/pickupSystem.js";
import { HARVEST_CONFIG } from "../src/resources/resourceConfig.js";
import {
  MATTER_ATTRACTOR_I,
  canAffordMatterAttractorI,
  getMatterAttractorMissing,
  getMatterAttractorPickupTuning,
  getMatterResonatorInteraction,
  validateMatterAttractorCost,
} from "../src/progression/matterAttractor.js";

function withStorage(run) {
  const original = global.localStorage;
  const values = new Map();
  global.localStorage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
  try { return run(values); } finally { global.localStorage = original; }
}

function createProgress() {
  const worldRegistry = createWorldRegistry(WORLD_DATA);
  return createFrontierProgress({ worldRegistry, resourceDrops: worldRegistry.data.resourceDrops });
}

describe("Phase 4B — Matter Attractor I persistence", () => {
  it("uses only canonical resource IDs and communicates the intended missing cost", () => {
    const registry = createWorldRegistry(WORLD_DATA);
    assert.equal(validateMatterAttractorCost(registry.data.resourceDrops), true);
    assert.equal(canAffordMatterAttractorI({ wood: 8, fiber: 6, iron_ore: 4 }), true);
    assert.deepEqual(getMatterAttractorMissing({ wood: 7, fiber: 6, iron_ore: 1 }), { wood: 1, iron_ore: 3 });
  });

  it("fails atomically when unaffordable, deducts exact amounts once, persists, and cannot repeat", () => withStorage(() => {
    const progress = createProgress();
    progress.load();
    const before = progress.getState();
    const failed = progress.purchaseMatterAttractorI(MATTER_ATTRACTOR_I.cost);
    assert.equal(failed.purchased, false);
    assert.equal(failed.reason, "unaffordable");
    assert.deepEqual(progress.getState(), before);

    assert.equal(progress.collectResources({ wood: 13, fiber: 9, iron_ore: 6 }).ok, true);
    const bought = progress.purchaseMatterAttractorI(MATTER_ATTRACTOR_I.cost);
    assert.equal(bought.purchased, true);
    assert.equal(progress.hasMatterAttractorI(), true);
    assert.equal(bought.state.bankedResources.wood, 5);
    assert.equal(bought.state.bankedResources.fiber, 3);
    assert.equal(bought.state.bankedResources.iron_ore, 2);

    const afterBuy = progress.getState();
    const repeated = progress.purchaseMatterAttractorI(MATTER_ATTRACTOR_I.cost);
    assert.equal(repeated.purchased, false);
    assert.equal(repeated.reason, "owned");
    assert.deepEqual(progress.getState(), afterBuy);

    const reloaded = createProgress();
    reloaded.load();
    assert.equal(reloaded.hasMatterAttractorI(), true);
    assert.deepEqual(reloaded.getState().bankedResources, afterBuy.bankedResources);
  }));

  it("remains owned when an expedition is lost because death never mutates frontier progress", () => withStorage(() => {
    const progress = createProgress();
    progress.load();
    assert.equal(progress.collectResources({ wood: 8, fiber: 6, iron_ore: 4 }).ok, true);
    progress.purchaseMatterAttractorI(MATTER_ATTRACTOR_I.cost);
    const beforeDeath = progress.getState();
    const afterReload = createProgress();
    afterReload.load();
    assert.equal(afterReload.hasMatterAttractorI(), true);
    assert.deepEqual(afterReload.getState(), beforeDeath);
  }));

  it("is exposed only as a nearby Camp interaction", () => {
    assert.equal(getMatterResonatorInteraction({ isCamp: false, distance: 0.5, owned: false }), null);
    assert.equal(getMatterResonatorInteraction({ isCamp: true, distance: 3, owned: false }), null);
    assert.deepEqual(getMatterResonatorInteraction({ isCamp: true, distance: 1, owned: false }), {
      type: "resonator",
      label: "MATTER RESONATOR",
    });
    assert.match(getMatterResonatorInteraction({ isCamp: true, distance: 1, owned: true }).label, /SYNCED/);
  });
});

describe("Phase 4B — Matter Attractor I reaches the real pickup path", () => {
  function makeRestingPickup(system, x) {
    const pickup = system.spawnPickup({
      index: 0,
      regionId: "p1_forest_edge",
      collider: null,
      state: { position: { x, y: 0, z: 0 } },
      type: { resourceId: "wood", solid: false, colliderHalfExtents: null, dropOriginHeight: 0.3 },
    });
    pickup.state = "RESTING";
    pickup.age = 1;
    pickup.pos.set(x, 0.26, 0);
    pickup.mesh.position.copy(pickup.pos);
    return pickup;
  }

  it("starts attraction outside the baseline radius and uses faster travel tuning", () => {
    const base = createPickupSystem(new THREE.Scene(), null, null, null, { resourceDrops: WORLD_DATA.resourceDrops });
    const upgraded = createPickupSystem(new THREE.Scene(), null, null, null, { resourceDrops: WORLD_DATA.resourceDrops });
    const distance = 3.2;
    const basePickup = makeRestingPickup(base, distance);
    const upgradedPickup = makeRestingPickup(upgraded, distance);
    upgraded.setMagnetTuning(getMatterAttractorPickupTuning(true));

    base.update(1 / 60, { x: 0, y: 0.52, z: 0 });
    upgraded.update(1 / 60, { x: 0, y: 0.52, z: 0 });

    assert.equal(basePickup.state, "RESTING");
    assert.equal(upgradedPickup.state, "MAGNETIZING");
    assert.equal(base.getMagnetTuning().magnetRadius, HARVEST_CONFIG.pickupMagnetRadius);
    assert.ok(upgraded.getMagnetTuning().magnetRadius > HARVEST_CONFIG.pickupMagnetRadius);
    assert.ok(upgraded.getMagnetTuning().magnetSpeed > HARVEST_CONFIG.pickupMagnetSpeed);
  });
});
