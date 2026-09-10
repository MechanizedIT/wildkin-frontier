import assert from "node:assert/strict";
import { describe, it } from "node:test";
import WORLD_DATA from "../src/world/data/world.js";
import { analyzeCampaign } from "../src/author/campaignReadiness.js";

describe("Campaign readiness", () => {
  it("reports the shipped campaign as coherent and labels walkability as an estimate", () => {
    const report = analyzeCampaign(WORLD_DATA);
    assert.deepEqual(report.errors, []);
    assert.equal(report.sections.length, 5);
    assert.ok(report.warnings.some((warning) => warning.includes("estimate")));
    assert.ok(report.sections.every((section) => Number.isFinite(section.xp) && section.level >= 1));
  });

  it("reports actual draft route and finale breakage without mutating the draft", () => {
    const draft = structuredClone(WORLD_DATA);
    const fifth = draft.regions.find((region) => region.id === "section_5");
    fifth.lootChests = fifth.lootChests.filter((chest) => chest.id !== "chest_heartwood_core");
    const originalCount = fifth.lootChests.length;
    const report = analyzeCampaign(draft);
    assert.ok(report.errors.some((error) => error.includes("Heartwood finale")));
    assert.equal(fifth.lootChests.length, originalCount);
  });
});
