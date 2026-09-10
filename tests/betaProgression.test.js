import assert from "node:assert/strict";
import { describe, it } from "node:test";
import WORLD_DATA from "../src/world/data/world.js";
import { createFrontierProgress } from "../src/save/frontierProgress.js";
import { createWorldRegistry } from "../src/world/worldRegistry.js";
import { getUpgradeDefinition } from "../src/progression/upgradeCatalog.js";
import { createExpeditionSession } from "../src/session/expeditionSession.js";
import { resolveSuccessfulExtraction } from "../src/session/runResolution.js";

function withStorage(run) {
  const original = global.localStorage;
  const values = new Map();
  global.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
  try { return run(values); } finally { global.localStorage = original; }
}

function makeProgress() {
  const registry = createWorldRegistry(WORLD_DATA);
  return createFrontierProgress({ worldRegistry: registry, resourceDrops: WORLD_DATA.resourceDrops });
}

describe("Beta progression save foundation", () => {
  it("migrates old saves and discards malformed progression counts", () => withStorage((storage) => {
    storage.set("wildkin.frontierProgress", JSON.stringify({
      version: 2, matterAttractorI: true, upgrades: { field_tool: 999, nonsense: 5 },
      securedCompanions: ["mossling", "mossling", "bad"], activeCompanionId: "bad",
      discoveredSpecies: ["emberhorn", 1], craftedConsumables: { medkit: -6 }, completedObjectives: ["first_harvest", null], completedPoiIds: ["poi_a", 1],
    }));
    const progress = makeProgress(); progress.load();
    const state = progress.getState();
    assert.equal(state.upgrades.matter_attractor, 1);
    assert.equal(state.upgrades.field_tool, 3);
    assert.deepEqual(state.securedCompanions, ["mossling"]);
    assert.equal(state.activeCompanionId, null);
    assert.deepEqual(state.discoveredSpecies, ["emberhorn"]);
    assert.equal(state.craftedConsumables.medkit, 0);
    assert.deepEqual(state.completedObjectives, ["first_harvest"]);
  }));

  it("purchases the next catalog tier atomically and respects level gates", () => withStorage(() => {
    const progress = makeProgress();
    const before = progress.getState();
    assert.equal(progress.purchaseUpgrade("unknown").reason, "unknown-upgrade");
    assert.equal(progress.purchaseUpgrade("field_tool").reason, "unaffordable");
    assert.deepEqual(progress.getState(), before);
    const tier = getUpgradeDefinition("field_tool").tiers[0];
    progress.bankRun({ ...tier.cost }, 0, "field-tool-materials");
    assert.equal(progress.purchaseUpgrade("field_tool").purchased, true);
    assert.equal(progress.getUpgradeLevel("field_tool"), 1);
    const after = progress.getState();
    assert.equal(progress.purchaseUpgrade("field_tool").reason, "level-locked");
    assert.deepEqual(progress.getState(), after);
  }));

  it("secures companions and campaign rewards once per resolved run/objective", () => withStorage(() => {
    const progress = makeProgress();
    const first = progress.secureCompanions(["mossling", "bad", "emberhorn"], "run-7");
    assert.equal(first.added, true);
    assert.deepEqual(first.companions, ["mossling", "emberhorn"]);
    assert.equal(progress.getState().activeCompanionId, "mossling");
    assert.equal(progress.secureCompanions(["skydancer"], "run-7").added, false);
    assert.equal(progress.selectCompanion("emberhorn"), true);
    progress.bankRun({ fiber: 1 }, 0, "objective-harvest");
    const before = progress.getState();
    assert.equal(progress.completeObjective("first_harvest").completed, true);
    const rewarded = progress.getState();
    assert.equal(rewarded.bankedXp, before.bankedXp + 10);
    assert.equal(progress.completeObjective("first_harvest").reason, "already-completed");
    assert.deepEqual(progress.getState(), rewarded);
  }));

  it("crafts and consumes only validated non-premium medkits", () => withStorage(() => {
    const progress = makeProgress();
    assert.equal(progress.craftConsumable("medkit").reason, "unaffordable");
    progress.bankRun({ fiber: 3, berries: 2 }, 0, "medkit-materials");
    assert.equal(progress.craftConsumable("medkit").crafted, true);
    assert.equal(progress.getState().craftedConsumables.medkit, 1);
    assert.equal(progress.consumeConsumable("medkit").consumed, true);
    assert.equal(progress.consumeConsumable("medkit").reason, "empty");
    assert.equal(progress.craftConsumable("unknown").reason, "unknown-consumable");
  }));

  it("persists generic upgrades, companions, and consumables through reload", () => withStorage(() => {
    const progress = makeProgress();
    progress.secureCompanions(["tidefin"], "run-save");
    progress.discoverSpecies("skydancer");
    progress.bankRun({ fiber: 3, berries: 2 }, 0, "reload-materials");
    progress.craftConsumable("medkit");
    progress.save();
    const reloaded = makeProgress(); reloaded.load();
    assert.deepEqual(reloaded.getState().securedCompanions, ["tidefin"]);
    assert.deepEqual(reloaded.getState().discoveredSpecies.sort(), ["skydancer", "tidefin"]);
    assert.equal(reloaded.getState().craftedConsumables.medkit, 1);
  }));

  it("keeps fresh modifiers inactive and makes capture capacity upgrades meaningful", () => withStorage(() => {
    const progress = makeProgress();
    assert.equal(progress.getModifiers().fieldToolDamageMultiplier, 1);
    assert.equal(progress.getModifiers().captureCapacity, 1);
    const tier = getUpgradeDefinition("capture_capacity").tiers[0];
    progress.bankRun({ ...tier.cost }, 0, "capacity-materials");
    assert.equal(progress.purchaseUpgrade("capture_capacity").purchased, true);
    assert.equal(progress.getModifiers().captureCapacity, 2);
  }));

  it("never banks negative XP and keeps the finale locked until the Heartwood Core is secured", () => withStorage(() => {
    const progress = makeProgress();
    progress.bankRun({ wood: 1 }, -999, "negative-xp");
    assert.equal(progress.getState().bankedXp, 0);
    progress.secureCompanions(["mossling", "emberhorn"], "finale-bonds");
    progress.repairPortalGate("gate_section_1_to_2");
    assert.equal(progress.completeObjective("frontier_finale").reason, "not-eligible");
    assert.equal(progress.completePoi("heartwood_core_secured"), true);
    assert.equal(progress.completeObjective("frontier_finale").completed, true);
    assert.equal(progress.getState().campaignCompleted, true);
  }));

  it("banks a resolved extraction and its permanent companion/core outcomes in one idempotent save", () => {
    const original = global.localStorage;
    const values = new Map();
    let writes = 0;
    global.localStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { writes += 1; values.set(key, String(value)); },
      removeItem: (key) => values.delete(key),
    };
    try {
      const progress = makeProgress();
      const result = progress.bankRun({ fiber: 4, berries: 1 }, 37, "heartwood-extraction", {
        companions: ["mossling", "invalid", "emberhorn"],
        coreSecured: true,
      });
      assert.equal(result.added, true);
      assert.equal(writes, 1, "one run resolution must produce one durable write");
      const state = result.state;
      assert.equal(state.bankedResources.fiber, 4);
      assert.equal(state.bankedResources.berries, 1);
      assert.equal(state.bankedXp, 37);
      assert.deepEqual(state.securedCompanions, ["mossling", "emberhorn"]);
      assert.equal(state.activeCompanionId, "mossling");
      assert.deepEqual(state.discoveredSpecies, ["mossling", "emberhorn"]);
      assert.ok(state.completedPoiIds.includes("heartwood_core_secured"));
      assert.ok(state.claimedLootChestIds.includes("chest_heartwood_core"));

      const writesAfterFirst = writes;
      assert.equal(progress.bankRun({ fiber: 99 }, 99, "heartwood-extraction", { companions: ["tidefin"], coreSecured: true }).added, false);
      assert.equal(writes, writesAfterFirst, "replaying a run cannot mutate any extras");

      const reloaded = makeProgress();
      reloaded.load();
      const persisted = reloaded.getState();
      assert.equal(persisted.bankedResources.fiber, 4);
      assert.equal(persisted.bankedXp, 37);
      assert.deepEqual(persisted.securedCompanions, ["mossling", "emberhorn"]);
      assert.ok(persisted.completedPoiIds.includes("heartwood_core_secured"));
      assert.ok(persisted.claimedLootChestIds.includes("chest_heartwood_core"));
    } finally { global.localStorage = original; }
  });

  it("bounds malformed persisted values and list sizes without carrying corrupt values into play", () => withStorage((storage) => {
    storage.set("wildkin.frontierProgress", JSON.stringify({
      version: 2,
      bankedXp: 99999999999999,
      bankedResources: { fiber: 99999999999999, wood: -5, stone: "not-a-number" },
      completedPoiIds: Array.from({ length: 260 }, (_, index) => `poi_${index}`),
      craftedConsumables: { medkit: 99999999999999 },
      lootChestReadyAt: { bad: -1, future: 99999999999999 },
    }));
    const progress = makeProgress(); progress.load();
    const state = progress.getState();
    assert.equal(state.bankedXp, 1000000000);
    assert.equal(state.bankedResources.fiber, 1000000000);
    assert.equal(state.bankedResources.wood, 0);
    assert.equal(state.craftedConsumables.medkit, 1000000000);
    assert.equal(state.completedPoiIds.length, 200);
    assert.deepEqual(state.lootChestReadyAt, {});
  }));

  it("exports a versioned envelope and only imports validated, durably written state", () => withStorage(() => {
    const source = makeProgress();
    source.bankRun({ fiber: 7 }, 12, "transfer-run", { companions: ["mossling"], coreSecured: true });
    const exported = source.exportSave();
    assert.equal(exported.ok, true);
    assert.equal(exported.payload.format, "wildkin-frontier-save");

    const target = makeProgress();
    assert.equal(target.importSave(JSON.stringify(exported.payload)).ok, true);
    assert.equal(target.getState().bankedResources.fiber, 7);
    assert.deepEqual(target.getState().securedCompanions, ["mossling"]);
    const beforeInvalid = target.getState();
    assert.equal(target.importSave({ ...exported.payload, format: "other-game" }).reason, "invalid-format");
    assert.deepEqual(target.getState(), beforeInvalid, "a rejected restore cannot alter the active save");
    assert.equal(target.importSave("not json").reason, "invalid-json");
  }));

  it("reports storage failures and rolls back a failed import instead of claiming persistence", () => {
    const original = global.localStorage;
    const values = new Map();
    global.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: () => { throw new Error("quota"); }, removeItem: () => {} };
    try {
      const progress = makeProgress();
      assert.deepEqual(progress.save(), { saved: false, reason: "storage-write-failed" });
      assert.equal(progress.getStorageStatus().saved, false);
      const payload = { format: "wildkin-frontier-save", version: 1, gameVersion: 2, progress: { ...progress.getState(), version: 2, bankedResources: { fiber: 99 } } };
      const before = progress.getState();
      assert.equal(progress.importSave(payload).reason, "storage-write-failed");
      assert.deepEqual(progress.getState(), before);
    } finally { global.localStorage = original; }
  });

  it("rolls back failed banking and leaves the same run eligible for a durable retry", () => {
    const original = global.localStorage;
    const values = new Map(); let failWrites = true;
    global.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { if (failWrites) throw new Error("quota"); values.set(key, String(value)); }, removeItem: (key) => values.delete(key) };
    try {
      const progress = makeProgress();
      const failed = progress.bankRun({ fiber: 5 }, 20, "retryable-run", { companions: ["mossling"] });
      assert.deepEqual({ ok: failed.ok, reason: failed.reason }, { ok: false, reason: "storage-write-failed" });
      assert.equal(progress.getState().bankedResources.fiber, 0);
      assert.deepEqual(progress.getState().securedCompanions, []);
      failWrites = false;
      const retried = progress.bankRun({ fiber: 5 }, 20, "retryable-run", { companions: ["mossling"] });
      assert.equal(retried.ok, true);
      assert.equal(progress.getState().bankedResources.fiber, 5);
      assert.deepEqual(progress.getState().securedCompanions, ["mossling"]);
    } finally { global.localStorage = original; }
  });

  it("does not resolve an active extraction when banking reports a storage failure", () => {
    const session = createExpeditionSession({ initialStatus: "camp", resourceDrops: WORLD_DATA.resourceDrops });
    session.beginRun("camp_gate");
    const failed = resolveSuccessfulExtraction({ session, cargo: { fiber: 4 }, xp: 12, bankRun: () => ({ ok: false, reason: "storage-write-failed" }) });
    assert.equal(failed.ok, false);
    assert.equal(failed.reason, "storage-write-failed");
    assert.equal(session.isActive(), true);
    assert.equal(session.isResolved(), false);
    assert.equal(session.getCargo().fiber, 4);
    const retried = resolveSuccessfulExtraction({ session, cargo: session.getCargo(), xp: session.getRunXp(), bankRun: () => ({ ok: true, added: true }) });
    assert.equal(retried.ok, true);
    assert.equal(session.isCamp(), true);
  });
});
