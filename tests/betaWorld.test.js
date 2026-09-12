import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WORLD_DATA } from "../src/world/data/world.js";
import { normalizeWorldData } from "../src/world/worldValidator.js";

const section = (id) => WORLD_DATA.regions.find((entry) => entry.id === id);

describe("Early Access authored campaign", () => {
  it("ships the five-section frontier route with reciprocal progression gates", () => {
    const ids = ["section_1", "section_2", "section_3", "section_4", "section_5"];
    assert.deepEqual(WORLD_DATA.regions.map((entry) => entry.id), ["camp", ...ids]);
    for (const id of ids) {
      const current = section(id);
      assert.equal(current.majorWaypoints.length, 1, `${id} waypoint`);
      assert.equal(current.extractionBeacons.length, 1, `${id} beacon`);
      assert.ok(current.lootChests.length >= 3, `${id} rewards`);
      for (const collection of ["jumpPads", "parkourStarts", "parkourCheckpoints", "parkourEnds", "parkourCourseZones", "killVolumes"]) {
        assert.deepEqual(current[collection], [], `${id} retired ${collection}`);
      }
      assert.equal(current.sectionProfile.expected.parkourCourses, undefined, `${id} profile`);
      assert.ok(current.props.filter((entry) => entry.visualAssetId?.startsWith("asset_wildkin_") || ["asset_thornprowler", "asset_cinderjaw", "asset_heartwood_guardian"].includes(entry.visualAssetId)).length >= 3, `${id} ecology`);
    }
    for (const [from, to] of [[1, 2], [2, 3], [3, 4], [4, 5]]) {
      const outgoing = section(`section_${from}`).portalGates.find((gate) => gate.id === `gate_section_${from}_to_${to}`);
      const returnGate = section(`section_${to}`).portalGates.find((gate) => gate.id === `gate_section_${to}_to_${from}`);
      assert.equal(outgoing?.targetGateId, returnGate?.id);
      assert.equal(returnGate?.targetGateId, outgoing?.id);
    }
  });

  it("keeps companion candidates and gated reward identity stable", () => {
    const assets = new Set(WORLD_DATA.visualAssets.map((entry) => entry.id));
    for (const id of ["asset_wildkin_mossling", "asset_wildkin_tidefin", "asset_wildkin_emberhorn", "asset_wildkin_skydancer"]) assert.ok(assets.has(id));
    for (const [index, chestId] of ["chest_mossling_secret", "chest_tidefin_secret", "chest_emberhorn_secret", "chest_skydancer_secret"].entries()) {
      assert.ok(section(`section_${index + 1}`).lootChests.some((entry) => entry.id === chestId));
    }
    assert.ok(section("section_5").lootChests.some((entry) => entry.id === "chest_heartwood_core"));
    assert.doesNotThrow(() => normalizeWorldData(WORLD_DATA));
  });

  it("retains former course rewards as distinct hidden terrain caches", () => {
    const rewards = [
      ["section_1", "chest_parkour_section_1", "loot_parkour_section_1", "Upland Shelf Cache"],
      ["section_2", "chest_parkour_section_2", "loot_shatterfen_parkour", "Reedbank Cache"],
      ["section_3", "chest_parkour_section_3", "loot_emberfall_parkour", "Cinder Shelf Cache"],
      ["section_4", "chest_parkour_section_4", "loot_windscar_parkour", "Windcut Cache"],
      ["section_5", "chest_parkour_section_5", "loot_parkour_section_1", "Heartroot Cache"],
    ];
    for (const [sectionId, chestId, lootTableId, displayName] of rewards) {
      const chest = section(sectionId).lootChests.find((entry) => entry.id === chestId);
      assert.equal(chest?.lootTableId, lootTableId, `${sectionId} loot identity`);
      assert.equal(chest?.displayName, displayName, `${sectionId} player name`);
      assert.equal(chest?.secret, true, `${sectionId} hidden cache`);
      assert.equal("courseId" in chest, false, `${sectionId} course link`);
    }
  });
});
