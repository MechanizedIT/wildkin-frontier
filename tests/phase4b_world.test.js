import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WORLD_DATA } from "../src/world/data/world.js";
import { normalizeWorldData } from "../src/world/worldValidator.js";
import { createWorldRegistry } from "../src/world/worldRegistry.js";
import { createFrontierProgress } from "../src/save/frontierProgress.js";

function region(id) {
  const value = WORLD_DATA.regions.find((entry) => entry.id === id);
  assert.ok(value, `missing authored region ${id}`);
  return value;
}

describe("Phase 4B — Crescent Basin authored world", () => {
  it("keeps a fresh save to the first Major Waypoint, never a Beacon", () => {
    const registry = createWorldRegistry(WORLD_DATA);
    const progress = createFrontierProgress({
      worldRegistry: registry,
      resourceDrops: WORLD_DATA.resourceDrops,
      isAuthorMode: true,
      inMemoryAuthor: true,
    });

    assert.deepEqual(progress.getUnlockedWaypoints(), ["wp_p1_entry"]);
    assert.equal(progress.isUnlockedWaypoint("wp_p4_threshold"), false);
    assert.equal(registry.getBeaconById("beacon_p2_01")?.type, "extractionBeacon");
    assert.equal(registry.getWaypointById("beacon_p2_01"), null);
  });

  it("preserves the locked Mirror Pond temptation and resolved deep rewards", () => {
    const registry = createWorldRegistry(WORLD_DATA);
    const pondChest = registry.getAllPois().find((poi) => poi.id === "poi_p2_pond_chest");
    assert.deepEqual(pondChest?.requires, { type: "companionAbility", id: "swim" });

    const drops = new Set(WORLD_DATA.resourceDrops.map((drop) => drop.id));
    const deepLandmarks = [region("p2_complication"), region("p3_temptation"), region("p4_threshold")]
      .flatMap((entry) => entry.pois)
      .filter((poi) => ["asset_iron_ore_rock", "asset_crystal"].includes(poi.visualAssetId));
    assert.ok(deepLandmarks.some((poi) => poi.visualAssetId === "asset_iron_ore_rock"));
    assert.ok(deepLandmarks.some((poi) => poi.visualAssetId === "asset_crystal"));
    assert.ok(drops.has("iron_ore"));
    assert.ok(drops.has("crystal_shard"));
  });

  it("authors a long danger gradient with separated homes and a ground retreat lane", () => {
    const p1 = region("p1_forest_edge");
    const p2 = region("p2_complication");
    const p3 = region("p3_temptation");
    const p4 = region("p4_threshold");
    const spans = [p1, p2, p3, p4].map((entry) => entry.bounds.maxZ - entry.bounds.minZ);
    assert.ok(spans.reduce((sum, span) => sum + span, 0) >= 40, "Crescent Basin should replace the compact strip");
    assert.equal(p1.creatures[0].temperament, "SKITTISH");
    assert.equal(p2.creatures.some((creature) => creature.temperament === "TERRITORIAL"), true);
    assert.equal(p3.creatures.some((creature) => creature.temperament === "AGGRESSIVE"), true);
    assert.equal(p4.creatures.some((creature) => creature.temperament === "TERRITORIAL"), true);

    for (const entry of [p2, p3, p4]) {
      for (const creature of entry.creatures) {
        assert.ok(creature.leashRadius <= 4.5, `${creature.id} must de-escalate inside its own pocket`);
      }
      assert.ok(entry.groundPatches.some((patch) => patch.collisionEnabled), `${entry.id} needs a ground retreat route`);
    }
  });

  it("represents optional elevation, marked launch pads, and Threshold Rise", () => {
    const registry = createWorldRegistry(WORLD_DATA);
    const allJumps = WORLD_DATA.regions.flatMap((entry) => entry.traversal.jumpTraversals);
    const pads = WORLD_DATA.regions.flatMap((entry) => entry.props)
      .filter((prop) => prop.visualAssetId === "asset_frontier_launch_pad");
    const elevated = WORLD_DATA.regions.flatMap((entry) => entry.traversal.platforms)
      .filter((platform) => platform.height >= 1.2);

    assert.ok(allJumps.length >= 4, "launches should be strategic optional routes, not a new movement mode");
    assert.equal(pads.length, allJumps.length, "each authored launch has a visible pad marker");
    assert.ok(elevated.some((platform) => platform.height >= 3.5));
    const threshold = registry.getWaypointById("wp_p4_threshold");
    assert.equal(threshold?.displayName, "Threshold Rise");
    assert.ok(threshold.pos.y >= 3.5);
  });

  it("normalizes the complete authored data set", () => {
    assert.doesNotThrow(() => normalizeWorldData(WORLD_DATA));
  });
});
