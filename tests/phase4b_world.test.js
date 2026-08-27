import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WORLD_DATA } from "../src/world/data/world.js";
import { normalizeWorldData } from "../src/world/worldValidator.js";
import { createWorldRegistry } from "../src/world/worldRegistry.js";
import { createFrontierProgress } from "../src/save/frontierProgress.js";

function section(id) {
  const value = WORLD_DATA.regions.find((entry) => entry.id === id);
  assert.ok(value, `missing authored section ${id}`);
  return value;
}

describe("Phase 4B.1 — sparse section proof world", () => {
  it("uses standard local dimensions and intentionally overlapping expedition bounds", () => {
    const camp = section("camp");
    const first = section("section_1");
    const second = section("section_2");
    assert.deepEqual(camp.size, { width: 100, depth: 100 });
    assert.deepEqual(camp.bounds, { minX: -50, maxX: 50, minZ: -50, maxZ: 50 });
    assert.deepEqual(first.size, { width: 50, depth: 50 });
    assert.deepEqual(second.size, { width: 50, depth: 50 });
    assert.deepEqual(first.bounds, second.bounds);
  });

  it("starts a fresh save with no discovered frontier Waypoint", () => {
    const registry = createWorldRegistry(WORLD_DATA);
    const progress = createFrontierProgress({ worldRegistry: registry, resourceDrops: WORLD_DATA.resourceDrops, isAuthorMode: true, inMemoryAuthor: true });
    assert.deepEqual(progress.getUnlockedWaypoints(), []);
    assert.deepEqual(registry.getDefaultExpeditionEntry(), { sectionId: "section_1", entryId: "entry_section_1" });
    assert.equal(registry.getWaypointById("wp_section_1")?.type, "majorWaypoint");
  });

  it("contains only the framework proof objects requested for Sections 1 and 2", () => {
    const first = section("section_1");
    const second = section("section_2");
    assert.equal(first.entryPoints.length, 1);
    assert.equal(first.majorWaypoints.length, 1);
    assert.equal(first.extractionBeacons.length, 1);
    assert.equal(first.jumpPads.length, 1);
    assert.equal(first.parkourStarts.length, 1);
    assert.equal(first.parkourCheckpoints.length, 1);
    assert.equal(first.killVolumes.length, 1);
    assert.equal(first.lootChests.length, 2);
    assert.equal(first.portalGates.some((gate) => gate.state === "ruined" && gate.targetSectionId === "section_2"), true);
    assert.equal(second.entryPoints.length, 1);
    assert.equal(second.majorWaypoints.length, 1);
    assert.equal(second.extractionBeacons.length, 0);
    assert.equal(second.jumpPads.length, 0);
  });

  it("keeps iron/crystal definitions and the Frontier Launch Pad visual", () => {
    const drops = new Set(WORLD_DATA.resourceDrops.map((drop) => drop.id));
    const assets = new Set(WORLD_DATA.visualAssets.map((asset) => asset.id));
    assert.equal(drops.has("iron_ore"), true);
    assert.equal(drops.has("crystal_shard"), true);
    assert.equal(assets.has("asset_frontier_launch_pad"), true);
    assert.equal(section("section_1").jumpPads[0].visualAssetId, "asset_frontier_launch_pad");
    assert.equal(WORLD_DATA.regions.some((entry) => (entry.traversal?.jumpTraversals ?? []).length > 0), false);
  });

  it("normalizes the complete authored data set", () => {
    assert.doesNotThrow(() => normalizeWorldData(WORLD_DATA));
  });
});
