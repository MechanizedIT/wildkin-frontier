import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as RAPIER from "@dimforge/rapier3d-compat";
import WORLD_DATA from "../src/world/data/world.js";
import { normalizeWorldData } from "../src/world/worldValidator.js";
import { createWorldRegistry } from "../src/world/worldRegistry.js";
import { createSectionRuntime } from "../src/world/sectionRuntime.js";
import { createPortalGateSystem, getPortalRequirementStatus, spendPortalCargo } from "../src/world/portalGateSystem.js";
import { createJumpPadSystem, getJumpPadDirection, predictJumpPadTrajectory } from "../src/world/jumpPadSystem.js";
import { createParkourSystem } from "../src/world/parkourSystem.js";
import { createLootSystem } from "../src/world/lootSystem.js";
import { summarizeSection } from "../src/world/sectionProfile.js";
import { getPlayerLevel, getXpForLevel } from "../src/progression/playerLevel.js";
import { createFrontierProgress } from "../src/save/frontierProgress.js";
import { createStaticWorld } from "../src/world/staticWorldBuilder.js";
import { createPhysicsWorld } from "../src/physics/createPhysicsWorld.js";
import { createAuthorDraft } from "../src/author/authorDraft.js";
import { resolveAuthorType, readNormalizedTransform } from "../src/author/authorTypeRegistry.js";

function withStorage(run) {
  const previous = global.localStorage;
  const values = new Map();
  global.localStorage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
  try { return run(values); } finally { global.localStorage = previous; }
}

function makeProgress() {
  const registry = createWorldRegistry(WORLD_DATA);
  return { registry, progress: createFrontierProgress({ worldRegistry: registry, resourceDrops: WORLD_DATA.resourceDrops }) };
}

describe("Phase 4B.1 — section activation boundary", () => {
  it("accepts overlapping local bounds and rejects nonstandard section dimensions", () => {
    assert.doesNotThrow(() => normalizeWorldData(WORLD_DATA));
    const invalid = structuredClone(WORLD_DATA);
    invalid.regions.find((entry) => entry.id === "section_1").size.width = 60;
    assert.throws(() => normalizeWorldData(invalid), /size must match local bounds|50x50/);
  });

  it("hides inactive roots and disables colliders through the production SectionRuntime", () => {
    const registry = createWorldRegistry(WORLD_DATA);
    const groups = new Map([["camp", { visible: true }], ["section_1", { visible: true }], ["section_2", { visible: true }]]);
    const activePhysics = [];
    const changes = [];
    const playground = { sectionGroups: groups, setActiveSection(id) { this.active = id; } };
    const runtime = createSectionRuntime({
      worldRegistry: registry,
      playground,
      physicsWorld: { setActiveSection(id) { activePhysics.push(id); } },
      onChange(change) { changes.push(change); },
    });
    runtime.activate("section_1");
    assert.equal(groups.get("section_1").visible, true);
    assert.equal(groups.get("section_2").visible, false);
    runtime.activate("section_2");
    assert.equal(groups.get("section_1").visible, false);
    assert.equal(groups.get("section_2").visible, true);
    assert.deepEqual(activePhysics, ["section_1", "section_2"]);
    assert.deepEqual(changes.at(-1).prevActiveIds, ["section_1"]);
  });

  it("isolates overlapping Section 1/2 colliders through the production Rapier world", async () => {
    await RAPIER.init();
    const playground = createStaticWorld(WORLD_DATA);
    const physics = createPhysicsWorld(RAPIER, playground);
    const runtime = createSectionRuntime({ worldRegistry: createWorldRegistry(WORLD_DATA), playground, physicsWorld: physics });
    const ownerEntries = () => [...physics.colliderSections.entries()].map(([collider, owner]) => ({ owner, enabled: collider.isEnabled?.() ?? true }));
    runtime.activate("section_1");
    const section1 = ownerEntries().filter((entry) => entry.owner === "section_1");
    const section2 = ownerEntries().filter((entry) => entry.owner === "section_2");
    assert.ok(section1.length > 0 && section2.length > 0, "proof world must build colliders for both sections");
    assert.ok(section1.every((entry) => entry.enabled), "active Section 1 colliders should be enabled");
    assert.ok(section2.every((entry) => !entry.enabled), "inactive Section 2 colliders must be disabled");
    runtime.activate("section_2");
    assert.ok(ownerEntries().filter((entry) => entry.owner === "section_1").every((entry) => !entry.enabled));
    assert.ok(ownerEntries().filter((entry) => entry.owner === "section_2").every((entry) => entry.enabled));
  });

  it("resolves a portal target entry without deriving ownership from X/Z", () => {
    const registry = createWorldRegistry(WORLD_DATA);
    const runtime = createSectionRuntime({ worldRegistry: registry });
    runtime.activate("section_1");
    let arrival = null;
    const result = runtime.transitionThroughPortal("gate_section_1_to_2", { onArrive(value) { arrival = value; } });
    assert.equal(result.ok, true);
    assert.equal(runtime.getActiveSectionId(), "section_2");
    assert.equal(arrival.entry.id, "entry_section_2");
  });
});

describe("Phase 4B.1 — level, gate repair, and upgrade persistence", () => {
  it("uses one monotonic banked-XP level curve", () => {
    assert.equal(getPlayerLevel(0), 1);
    for (let level = 1; level < 12; level++) {
      assert.ok(getXpForLevel(level + 1) > getXpForLevel(level));
      assert.equal(getPlayerLevel(getXpForLevel(level)), level);
    }
  });

  it("reports level/cargo requirements and spends exact cargo atomically", () => {
    const requirements = { minPlayerLevel: 2, resources: { wood: 2, stone: 2 } };
    assert.equal(getPortalRequirementStatus({ requirements, playerLevel: 1, cargo: { wood: 5, stone: 5 } }).levelMet, false);
    assert.deepEqual(getPortalRequirementStatus({ requirements, playerLevel: 2, cargo: { wood: 2, stone: 1 } }).missingResources, { stone: 1 });
    assert.deepEqual(spendPortalCargo({ wood: 4, stone: 3 }, requirements), { ok: true, cargo: { wood: 2, stone: 1 }, spent: { wood: 2, stone: 2 } });
    assert.deepEqual(spendPortalCargo({ wood: 4, stone: 1 }, requirements), { ok: false, reason: "insufficient-resources", cargo: { wood: 4, stone: 1 } });
  });

  it("repairs once with current cargo and persists immediately", () => withStorage(() => {
    const { registry, progress } = makeProgress();
    progress.load();
    progress.bankRun({}, getXpForLevel(2), "level-two");
    let cargo = { wood: 2, stone: 2 };
    let travels = 0;
    const system = createPortalGateSystem(registry, {
      frontierProgress: progress,
      getActiveSectionId: () => "section_1",
      getPlayerLevel: () => getPlayerLevel(progress.getBankedXp()),
      getCargo: () => ({ ...cargo }),
      spendCargo: (_current, cost) => {
        if (Object.entries(cost).some(([id, amount]) => cargo[id] < amount)) return false;
        for (const [id, amount] of Object.entries(cost)) cargo[id] -= amount;
        return true;
      },
      onTravel: () => { travels += 1; return true; },
    });
    assert.deepEqual(system.activate("gate_section_1_to_2").spent, { wood: 2, stone: 2 });
    assert.deepEqual(cargo, { wood: 0, stone: 0 });
    assert.equal(progress.isPortalGateRepaired("gate_section_1_to_2"), true);
    const reloaded = makeProgress().progress;
    reloaded.load();
    assert.equal(reloaded.isPortalGateRepaired("gate_section_1_to_2"), true);
    assert.equal(system.activate("gate_section_1_to_2").action, "travel");
    assert.equal(travels, 1);
  }));

  it("migrates the legacy Matter Attractor boolean into the keyed upgrade", () => withStorage((values) => {
    values.set("wildkin.frontierProgress", JSON.stringify({ version: 1, bankedResources: {}, bankedXp: 0, unlockedMajorWaypointIds: [], discoveredBeaconIds: [], matterAttractorI: true }));
    const { progress } = makeProgress();
    const state = progress.load();
    assert.equal(state.upgrades.matter_attractor, 1);
    assert.equal(progress.hasMatterAttractorI(), true);
  }));
});

describe("Phase 4B.1 — Jump Pad, parkour, and loot production systems", () => {
  it("uses rotation for launch and shares the same trajectory math", () => {
    assert.deepEqual(getJumpPadDirection(0), { x: 0, z: 1 });
    const east = getJumpPadDirection(Math.PI / 2);
    assert.ok(Math.abs(east.x - 1) < 1e-9);
    assert.ok(Math.abs(east.z) < 1e-9);
    const points = predictJumpPadTrajectory({ pos: { x: 0, y: 0, z: 0 }, rotY: Math.PI / 2, horizontalLaunch: 8, verticalLaunch: 6 }, { gravity: 12, steps: 2 });
    assert.ok(points.at(-1).x > 0);
    assert.ok(Math.abs(points.at(-1).y) < 1e-9);
  });

  it("triggers a real launch only on entry and honors cooldown", () => {
    const registry = createWorldRegistry(WORLD_DATA);
    let time = 0;
    const launches = [];
    const system = createJumpPadSystem(registry, { getActiveSectionId: () => "section_1", now: () => time, launchPlayer(value) { launches.push(value); return true; } });
    const pad = registry.getJumpPadsForSection("section_1")[0];
    system.update(pad.pos);
    system.update(pad.pos);
    assert.equal(launches.length, 1);
    system.update({ x: pad.pos.x + 4, y: 0, z: pad.pos.z });
    time = 1000;
    system.update(pad.pos);
    assert.equal(launches.length, 2);
  });

  it("tracks start/checkpoint and intercepts fatal failure only while active", () => {
    const registry = createWorldRegistry(WORLD_DATA);
    const failures = [];
    const system = createParkourSystem(registry, { getActiveSectionId: () => "section_1", onSafeFailure(value) { failures.push(value); } });
    const start = registry.getParkourStartsForSection("section_1")[0];
    const checkpoint = registry.getParkourCheckpointsForSection("section_1")[0];
    system.update(start.pos);
    system.update(checkpoint.pos);
    assert.equal(system.handleFatalFailure("damage"), true);
    assert.equal(failures[0].respawn.checkpointId, checkpoint.id);
    system.leaveCourse();
    assert.equal(system.handleFatalFailure("damage"), false);
  });

  it("gives secret loot once and repeatable loot after injected time advances", () => withStorage(() => {
    const { registry, progress } = makeProgress();
    progress.load();
    let now = 1_000;
    const grants = [];
    const system = createLootSystem(registry, { frontierProgress: progress, getActiveSectionId: () => "section_1", now: () => now, grantRewards(value) { grants.push(value); } });
    assert.equal(system.open("chest_secret_section_1").ok, true);
    assert.equal(system.open("chest_secret_section_1").ok, false);
    assert.equal(system.getNearbyInteraction(registry.getLootChestById("chest_secret_section_1").pos).label, "CHEST EMPTY");
    assert.equal(system.open("chest_parkour_section_1").ok, true);
    assert.equal(system.open("chest_parkour_section_1").ok, false);
    now += registry.getLootChestById("chest_parkour_section_1").refillSeconds * 1000;
    assert.equal(system.open("chest_parkour_section_1").ok, true);
    assert.equal(grants.length, 3);
  }));
});

describe("Phase 4B.1 — Author palette production coverage", () => {
  it("places every new section object in the selected owner and keeps overlapping coordinates local", () => {
    const draftApi = createAuthorDraft(WORLD_DATA);
    const placements = [
      ["portalGate", { x: -20, y: 0, z: 20 }],
      ["jumpPad", { x: -12, y: 0, z: 18 }],
      ["parkourStart", { x: 12, y: 12, z: 0 }],
      ["parkourCheckpoint", { x: 12, y: 12, z: -4 }],
      ["killVolume", { x: 12, y: 0.6, z: -8 }],
      ["lootChest", { x: -20, y: 0, z: 14 }],
    ];
    for (const [kind, pos] of placements) {
      const result = draftApi.createObjectAtPosition(kind, null, pos, "section_1");
      assert.equal(result.ok, true, `${kind}: ${result.error ?? "placement failed"}`);
      const found = draftApi.findObjectById(result.id);
      assert.equal(found.regionId, "section_1");
      assert.ok(resolveAuthorType(found), `${kind} must resolve through the Author type registry`);
    }
    const overlap = draftApi.createObjectAtPosition("jumpPad", null, { x: 0, y: 0.35, z: 0 }, "section_2");
    assert.equal(overlap.ok, true, overlap.error);
    const moved = draftApi.updateTransform(overlap.id, { pos: { x: 0, y: 0.35, z: 0.1 } });
    assert.equal(moved.ok, true, moved.error);
    assert.equal(draftApi.findObjectById(overlap.id).regionId, "section_2", "overlap must not trigger implicit rehome");
    const resource = draftApi.getDraft().regions.find((entry) => entry.id === "section_1").resources[0];
    const creature = draftApi.getDraft().regions.find((entry) => entry.id === "section_1").creatures[0];
    assert.ok(draftApi.updateInspectorField(resource.id, "level", 2).ok);
    assert.ok(draftApi.updateInspectorField(creature.id, "level", 2).ok);
    assert.equal(readNormalizedTransform(draftApi.findObjectById(resource.id)).position.x, resource.pos.x);
    assert.equal(draftApi.findObjectById(resource.id).obj.level, 2);
    assert.equal(draftApi.findObjectById(creature.id).obj.level, 2);
  });
});

describe("Phase 4B.1 — section profile", () => {
  it("summarizes actual placed content without mutating the world", () => {
    const before = JSON.stringify(WORLD_DATA);
    const summary = summarizeSection(WORLD_DATA, "section_1");
    assert.deepEqual(summary.counts, { waypoint: 1, extractionBeacons: 1, secrets: 1, parkourCourses: 1, outboundPortals: 1 });
    assert.equal(JSON.stringify(WORLD_DATA), before);
  });
});
