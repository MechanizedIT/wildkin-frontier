import assert from "node:assert/strict";
import { describe, it } from "node:test";
import WORLD_DATA from "../src/world/data/world.js";
import { createAuthorDraft, preparePersistedAuthorDraft } from "../src/author/authorDraft.js";
import {
  SECTION_OBJECT_COLLECTIONS,
  enumerateRegionAuthorObjects,
} from "../src/author/authorObjectCollections.js";
import {
  getAuthorVisualRole,
  resolveAuthorType,
} from "../src/author/authorTypeRegistry.js";
import { createAuthorVisual } from "../src/author/authorPreview.js";
import {
  getAssetWorkbenchViewLimits,
  getNextAuthorZoomDistance,
} from "../src/author/authorMode.js";
import { getCampStartDestinations } from "../src/world/campTravel.js";
import { createWorldRegistry } from "../src/world/worldRegistry.js";
import { createStaticWorld } from "../src/world/staticWorldBuilder.js";
import {
  createPortalGateSystem,
  getPortalRequirementViewModel,
} from "../src/world/portalGateSystem.js";
import { createParkourSystem } from "../src/world/parkourSystem.js";
import { getPlayerLevelProgress } from "../src/progression/playerLevel.js";
import { createExpeditionSession } from "../src/session/expeditionSession.js";
import { createReturnToCampFlow } from "../src/session/runResolution.js";

function findAuthorRoot(root, id) {
  let found = null;
  root.traverse((object) => {
    if (!found && object.userData?.authorVisualRoot && object.userData.authorId === id) found = object;
  });
  return found;
}

describe("Phase 4B.1.4 — canonical Author parity", () => {
  it("enumerates every canonical region collection once and resolves every object", () => {
    const draft = createAuthorDraft(WORLD_DATA);
    const ids = draft.getAllObjectIds();
    assert.equal(new Set(ids).size, ids.length, "canonical Author IDs must be unique");

    for (const region of WORLD_DATA.regions) {
      for (const collection of Object.keys(SECTION_OBJECT_COLLECTIONS)) {
        for (const object of region[collection] ?? []) {
          assert.ok(ids.includes(object.id), `${collection}/${object.id} must be enumerated`);
        }
      }
      for (const entry of enumerateRegionAuthorObjects(region)) {
        const found = draft.findObjectById(entry.obj.id);
        assert.ok(found, `${entry.obj.id} must resolve through findObjectById`);
        assert.ok(resolveAuthorType(found), `${entry.obj.id} must resolve one Author type`);
        assert.ok(getAuthorVisualRole(found), `${entry.obj.id} must declare an Author visual role`);
      }
    }
  });

  it("covers the proof gates, traversal helpers, hazard, and loot", () => {
    const draft = createAuthorDraft(WORLD_DATA);
    const expected = [
      "gate_camp_frontier",
      "gate_section_1_camp_arrival",
      "gate_section_1_to_2",
      "gate_section_2_to_1",
      "jump_pad_section_1",
      "parkour_start_section_1",
      "parkour_checkpoint_section_1",
      "parkour_end_section_1",
      "kill_volume_section_1",
      "chest_secret_section_1",
      "chest_parkour_section_1",
    ];
    for (const id of expected) {
      assert.ok(draft.getAllObjectIds().includes(id), `${id} must be in the Author hierarchy seam`);
      assert.ok(resolveAuthorType(draft.findObjectById(id)), `${id} must resolve an Author type`);
    }
  });

  it("keeps real structures player-facing and technical markers editor-only", () => {
    const registry = createWorldRegistry(WORLD_DATA);
    const staticWorld = createStaticWorld(WORLD_DATA);
    const draft = createAuthorDraft(WORLD_DATA);
    for (const id of ["gate_section_1_camp_arrival", "gate_section_1_to_2", "jump_pad_section_1", "wp_section_1", "beacon_section_1", "parkour_start_section_1", "parkour_checkpoint_section_1", "parkour_end_section_1"]) {
      assert.ok(findAuthorRoot(staticWorld.group, id), `${id} must have a Play visual`);
      assert.equal(getAuthorVisualRole(draft.findObjectById(id)), "playerFacing");
    }
    for (const id of ["entry_section_1", "parkour_zone_section_1_a", "kill_volume_section_1"]) {
      assert.equal(findAuthorRoot(staticWorld.group, id), null, `${id} must not leak into Play`);
      const found = draft.findObjectById(id);
      assert.equal(getAuthorVisualRole(found), "editorHelperOnly");
      const helper = createAuthorVisual(found);
      assert.ok(helper, `${id} must have an Edit helper`);
      assert.equal(helper.userData.editorHelperOnly, true);
    }
    assert.equal(registry.getPortalGateById("gate_section_1_camp_arrival").campReturnEnabled, true);
  });

  it("migrates the Camp-link contract without wiping persisted Author edits", () => {
    const saved = structuredClone(WORLD_DATA);
    const gate = saved.regions.find((region) => region.id === "section_1").portalGates.find((entry) => entry.id === "gate_section_1_camp_arrival");
    gate.role = "arrival";
    delete gate.campReturnEnabled;
    saved.regions.find((region) => region.id === "section_1").props[0].pos.x += 0.75;
    const authoredX = saved.regions.find((region) => region.id === "section_1").props[0].pos.x;
    const prepared = preparePersistedAuthorDraft(saved, WORLD_DATA);
    const migratedGate = prepared.data.regions.find((region) => region.id === "section_1").portalGates.find((entry) => entry.id === gate.id);
    assert.equal(prepared.changed, true);
    assert.equal(migratedGate.role, "campLink");
    assert.equal(migratedGate.campReturnEnabled, true);
    assert.equal(prepared.data.regions.find((region) => region.id === "section_1").props[0].pos.x, authoredX);
  });
});

describe("Phase 4B.1.4 — Camp travel and extraction", () => {
  it("always offers Forest Edge and adds only discovered Major Waypoints", () => {
    const registry = createWorldRegistry(WORLD_DATA);
    const fresh = getCampStartDestinations(registry, { unlockedMajorWaypointIds: [], discoveredBeaconIds: [] });
    assert.deepEqual(fresh.map((entry) => [entry.type, entry.id, entry.displayName]), [
      ["sectionEntry", "gate_section_1_camp_arrival", "Forest Edge"],
    ]);

    const discovered = getCampStartDestinations(registry, {
      unlockedMajorWaypointIds: ["wp_section_1", "wp_section_2", "missing"],
      discoveredBeaconIds: ["beacon_section_1"],
    });
    assert.deepEqual(discovered.map((entry) => entry.id), [
      "gate_section_1_camp_arrival",
      "wp_section_1",
      "wp_section_2",
    ]);
    assert.ok(!discovered.some((entry) => entry.id === "beacon_section_1" || entry.id === "gate_section_1_to_2"));
  });

  it("returns to Camp through one idempotent extraction owner and cancellation is a no-op", () => {
    const session = createExpeditionSession({ initialStatus: "camp" });
    assert.equal(session.beginRun("gate_section_1_camp_arrival"), true);
    session.setRegion("section_1");
    session.setCargo({ wood: 3, stone: 2, fiber: 0 });
    session.setXp(17);
    session.addDiscoveryWaypoint("wp_section_1");
    let bankCalls = 0;
    const flow = createReturnToCampFlow({
      session,
      getCargo: () => session.getCargo(),
      getXp: () => session.getRunXp(),
      bankRun(cargo, xp, runId) {
        bankCalls += 1;
        return { cargo, xp, runId };
      },
    });

    assert.equal(flow.request({ id: "gate_section_1_camp_arrival" }).ok, true);
    assert.equal(flow.cancel().ok, true);
    assert.equal(session.isActive(), true);
    assert.deepEqual(session.getCargo(), { wood: 3, stone: 2, fiber: 0 });
    assert.equal(bankCalls, 0);

    flow.request({ id: "gate_section_1_camp_arrival" });
    const resolved = flow.confirm();
    assert.equal(resolved.ok, true);
    assert.equal(resolved.type, "extracted");
    assert.equal(resolved.snapshot.xp, 17);
    assert.deepEqual(resolved.snapshot.newWaypoints, ["wp_section_1"]);
    assert.equal(session.isCamp(), true);
    assert.deepEqual(session.getCargo(), { wood: 0, stone: 0, fiber: 0 });
    assert.equal(session.getRunXp(), 0);
    assert.equal(bankCalls, 1);
    assert.equal(flow.confirm().ok, false);
    assert.equal(bankCalls, 1);
  });

  it("exposes the Camp-link interaction without making it an ordinary portal travel", () => {
    const registry = createWorldRegistry(WORLD_DATA);
    const system = createPortalGateSystem(registry, {
      getActiveSectionId: () => "section_1",
      getBankedXp: () => 29,
      getCargo: () => ({ wood: 3, stone: 1 }),
    });
    const gate = registry.getPortalGateById("gate_section_1_camp_arrival");
    const interaction = system.getNearbyInteraction(gate.pos);
    assert.equal(interaction.action, "return-to-camp");
    assert.equal(interaction.label, "RETURN TO CAMP");
    assert.equal(system.activate(gate.id).action, "return-to-camp");
  });
});

describe("Phase 4B.1.4 — progression, hazard clarity, and workbench zoom", () => {
  it("derives persistent level presentation from the central curve", () => {
    assert.deepEqual(getPlayerLevelProgress(0), { level: 1, bankedXp: 0, levelStartXp: 0, nextLevelXp: 50, progressXp: 0, progressMax: 50 });
    assert.deepEqual(getPlayerLevelProgress(29), { level: 1, bankedXp: 29, levelStartXp: 0, nextLevelXp: 50, progressXp: 29, progressMax: 50 });
    assert.equal(getPlayerLevelProgress(50).level, 2);
  });

  it("reports ruined-gate level and current run cargo without duplicating the XP curve", () => {
    const model = getPortalRequirementViewModel({
      requirements: { minPlayerLevel: 2, resources: { wood: 2, stone: 2 } },
      bankedXp: 29,
      cargo: { wood: 3, stone: 1 },
    });
    assert.equal(model.ok, false);
    assert.deepEqual(model.level, { current: 1, required: 2, met: false });
    assert.deepEqual(model.resources, [
      { id: "wood", current: 3, required: 2, met: true },
      { id: "stone", current: 1, required: 2, met: false },
    ]);
    assert.equal(model.progress.nextLevelXp, 50);
  });

  it("distinguishes combat loss, fatal Kill Volume loss, and matching-course safe failure", () => {
    const combatSession = createExpeditionSession({ initialStatus: "active" });
    const combat = combatSession.tryResolveDeath("combat");
    assert.equal(combat.deathReason, "combat");
    assert.equal(combatSession.getState().extractionOutcome.reason, "combat");

    const registry = createWorldRegistry(WORLD_DATA);
    const fatal = [];
    const safe = [];
    const system = createParkourSystem(registry, {
      getActiveSectionId: () => "section_1",
      onSafeFailure: (event) => safe.push(event),
      onNormalFatal: (event) => fatal.push(event),
    });
    system.update({ x: 0, y: 0.52, z: 0 });
    assert.equal(fatal.length, 0, "ordinary Section 1 ground must not resolve a fatal hazard");
    const volume = registry.getKillVolumesForSection("section_1")[0];
    system.update(volume.pos);
    assert.equal(fatal[0].reason, "fatal_hazard");
    system.reset();
    const start = registry.getParkourStartsForSection("section_1")[0];
    const checkpoint = registry.getParkourCheckpointsForSection("section_1")[0];
    system.update(start.pos);
    system.update(checkpoint.pos);
    system.update(volume.pos);
    assert.equal(safe.length, 1);
    assert.equal(safe[0].respawn.checkpointId, checkpoint.id);
    const respawnInsideVolume = Math.abs(safe[0].respawn.position.x - volume.pos.x) <= volume.size.w / 2
      && Math.abs(safe[0].respawn.position.y - volume.pos.y) <= volume.size.h / 2
      && Math.abs(safe[0].respawn.position.z - volume.pos.z) <= volume.size.d / 2;
    assert.equal(respawnInsideVolume, false, "the safe checkpoint must not be inside its proof hazard");
  });

  it("gives small and large assets dedicated smooth workbench zoom bounds", () => {
    const small = getAssetWorkbenchViewLimits(0.1);
    const large = getAssetWorkbenchViewLimits(120);
    assert.ok(small.maxDistance >= 30, "small assets must zoom far beyond the old 4-unit cap");
    assert.ok(large.maxDistance > small.maxDistance);
    assert.ok(small.minDistance < small.maxDistance);
    let distance = 4;
    for (let i = 0; i < 60; i += 1) distance = getNextAuthorZoomDistance(distance, 120, small.minDistance, small.maxDistance);
    assert.equal(distance, small.maxDistance);
    assert.ok(getNextAuthorZoomDistance(4, 2, small.minDistance, small.maxDistance) > 4);
  });
});
