import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as THREE from "three";

import {
  interpolateRenderPose,
  resolveJumpPadLaunchVelocity,
} from "../src/player/playerController.js";
import {
  JUMP_PAD_PRESETS,
  getJumpPadGuidance,
  resolveJumpPadVerticalLaunch,
} from "../src/world/jumpPadSystem.js";
import {
  resolveParkourMarkerVisual,
  resolvePortalGateVisual,
} from "../src/world/playerFacingVisuals.js";
import { createParkourSystem } from "../src/world/parkourSystem.js";
import { getPortalRequirementViewModel } from "../src/world/portalGateSystem.js";
import {
  getCarriedXpViewModel,
  getMatterResonatorViewModel,
} from "../src/ui/progressionModels.js";
import { getPlayerLevelProgress } from "../src/progression/playerLevel.js";
import { enumerateRegionAuthorObjects } from "../src/author/authorObjectCollections.js";
import { createOrbitGizmo, updateOrbitGizmo } from "../src/author/orbitGizmo.js";

describe("Phase 4B.1.5 — render interpolation", () => {
  it("interpolates midpoint position and shortest-path facing without mutating authoritative poses", () => {
    const previous = { position: { x: 0, y: 1, z: 0 }, facing: Math.PI - 0.1 };
    const current = { position: { x: 10, y: 3, z: -4 }, facing: -Math.PI + 0.1 };
    const before = structuredClone(current);
    const pose = interpolateRenderPose(previous, current, 0.5);
    assert.deepEqual(pose.position, { x: 5, y: 2, z: -2 });
    assert.ok(Math.abs(Math.abs(pose.facing) - Math.PI) < 1e-6);
    assert.deepEqual(current, before);
  });

  it("snaps when previous/current are the same teleport pose", () => {
    const pose = { position: { x: -8, y: 2, z: 11 }, facing: 0.75 };
    assert.deepEqual(interpolateRenderPose(pose, pose, 0.25), pose);
  });
});

describe("Phase 4B.1.5 — shared player-facing visuals", () => {
  const assets = [{ id: "ruin" }, { id: "active" }];

  it("resolves Portal Gate state identically from one canonical resolver", () => {
    const gate = { state: "ruined", ruinedVisualAssetId: "ruin", activeVisualAssetId: "active" };
    assert.deepEqual(resolvePortalGateVisual(gate, "ruined", assets).visualRef, { kind: "asset", id: "ruin" });
    assert.deepEqual(resolvePortalGateVisual(gate, "active", assets).visualRef, { kind: "asset", id: "active" });
    assert.deepEqual(resolvePortalGateVisual({}, "active", assets).visualRef, { kind: "builtin", id: "prop/gate" });
  });

  it("gives Start, Checkpoint, and End dedicated player-facing roles", () => {
    assert.equal(resolveParkourMarkerVisual({}, "start", []).visualRef.id, "parkour/start");
    assert.equal(resolveParkourMarkerVisual({}, "checkpoint", []).visualRef.id, "parkour/checkpoint");
    assert.equal(resolveParkourMarkerVisual({}, "end", []).visualRef.id, "parkour/end");
  });
});

describe("Phase 4B.1.5 — Parkour Course Zones", () => {
  function registry() {
    return {
      getParkourStartsForSection: () => [{ id: "start", courseId: "course", sectionId: "s", pos: { x: 0, y: 0, z: 0 }, triggerRadius: 1.8 }],
      getParkourCheckpointsForSection: () => [{ id: "cp", courseId: "course", pos: { x: 0, y: 0, z: -4 }, triggerRadius: 1.8 }],
      getParkourEndsForSection: () => [{ id: "end", courseId: "course", pos: { x: 0, y: 0, z: -8 }, triggerRadius: 1.8 }],
      getParkourCourseZonesForSection: () => [
        { id: "zone-a", courseId: "course", pos: { x: 0, y: 1, z: -2 }, size: { w: 4, h: 4, d: 6 } },
        { id: "zone-b", courseId: "course", pos: { x: 0, y: 1, z: -7 }, size: { w: 4, h: 4, d: 6 } },
      ],
      getKillVolumesForSection: () => [{ id: "kill", courseId: "course", pos: { x: 0, y: 0, z: -5 }, size: { w: 2, h: 2, d: 2 } }],
    };
  }

  it("fires lifecycle callbacks once and keeps the course active across matching zone union", () => {
    const events = [];
    const system = createParkourSystem(registry(), {
      getActiveSectionId: () => "s",
      onCourseStarted: (event) => events.push(["start", event.courseId]),
      onCheckpointActivated: (event) => events.push(["checkpoint", event.checkpoint.id]),
      onCourseEnded: (event) => events.push(["end", event.courseId]),
    });
    system.update({ x: 0, y: 0, z: 0 });
    system.update({ x: 0, y: 0, z: -4 });
    system.update({ x: 0, y: 0, z: -6 });
    assert.equal(system.isActive(), true);
    system.update({ x: 0, y: 0, z: -8 });
    assert.deepEqual(events, [["start", "course"], ["checkpoint", "cp"], ["end", "course"]]);
  });

  it("abandons outside all zones, clears checkpoint, and cannot reactivate without Start", () => {
    let abandoned = 0;
    const system = createParkourSystem(registry(), {
      getActiveSectionId: () => "s",
      onCourseAbandoned: () => abandoned++,
    });
    system.update({ x: 0, y: 0, z: 0 });
    system.update({ x: 0, y: 0, z: -4 });
    system.update({ x: 9, y: 0, z: -4 });
    assert.equal(abandoned, 1);
    assert.deepEqual(system.getState(), { activeCourseId: null, latestCheckpoint: null });
    assert.equal(system.handleFatalFailure("later"), false);
    system.update({ x: 0, y: 0, z: -4 });
    assert.equal(system.isActive(), false);
  });

  it("still safe-respawns matching Kill Volume while active", () => {
    let safe = 0;
    const system = createParkourSystem(registry(), { getActiveSectionId: () => "s", onSafeFailure: () => safe++ });
    system.update({ x: 0, y: 0, z: 0 });
    system.update({ x: 0, y: 0, z: -5 });
    assert.equal(safe, 1);
  });
});

describe("Phase 4B.1.5 — progression readability", () => {
  it("keeps persistent within-level progress separate from carried XP", () => {
    assert.deepEqual(getPlayerLevelProgress(75), {
      level: 2, bankedXp: 75, levelStartXp: 50, nextLevelXp: 200, progressXp: 25, progressMax: 150,
    });
    assert.deepEqual(getCarriedXpViewModel(0), { count: 0, visible: false });
    assert.deepEqual(getCarriedXpViewModel(7), { count: 7, visible: true });
  });

  it("presents banked and carried XP separately at ruined gates", () => {
    const model = getPortalRequirementViewModel({ requirements: { minPlayerLevel: 2 }, bankedXp: 0, carriedXp: 5 });
    assert.equal(model.level.current, 1);
    assert.equal(model.progress.progressXp, 0);
    assert.equal(model.carriedXp, 5);
  });

  it("lists every catalog resource plus persistent progression in Resonator storage", () => {
    const model = getMatterResonatorViewModel({
      state: { bankedResources: { wood: 3 }, bankedXp: 75, matterAttractorI: false },
      resourceDrops: [{ id: "wood", displayName: "Wood" }, { id: "crystal", displayName: "Crystal Shard" }],
    });
    assert.deepEqual(model.storage, [
      { id: "wood", displayName: "Wood", count: 3 },
      { id: "crystal", displayName: "Crystal Shard", count: 0 },
    ]);
    assert.equal(model.progression.level, 2);
    assert.equal(model.progression.progressXp, 25);
  });
});

describe("Phase 4B.1.5 — Jump Pad vertical carry", () => {
  it("preserves standing and moving horizontal velocity independent of pad rotation", () => {
    assert.deepEqual(resolveJumpPadLaunchVelocity({ x: 0, z: 0 }, 6), { x: 0, y: 6, z: 0 });
    assert.deepEqual(resolveJumpPadLaunchVelocity({ x: 3, z: -4 }, 6), { x: 3, y: 6, z: -4 });
  });

  it("orders presets and supports explicit vertical override", () => {
    assert.ok(JUMP_PAD_PRESETS.low.verticalLaunch < JUMP_PAD_PRESETS.medium.verticalLaunch);
    assert.ok(JUMP_PAD_PRESETS.medium.verticalLaunch < JUMP_PAD_PRESETS.high.verticalLaunch);
    assert.equal(resolveJumpPadVerticalLaunch({ powerPreset: "low", verticalLaunch: 9 }), 9);
    assert.equal(resolveJumpPadVerticalLaunch({ powerPreset: "high", verticalLaunch: null }), JUMP_PAD_PRESETS.high.verticalLaunch);
  });

  it("shares truthful apex, airtime, and momentum carry math", () => {
    const guidance = getJumpPadGuidance({ powerPreset: "medium" }, { gravity: 12, walkSpeed: 3, runSpeed: 6 });
    assert.ok(guidance.apexHeightDelta > 0);
    assert.ok(guidance.airtime > 0);
    assert.ok(Math.abs(guidance.runCarryDistance - guidance.walkCarryDistance * 2) < 1e-9);
  });
});

describe("Phase 4B.1.5 — Author parity seams", () => {
  it("enumerates Parkour Course Zones canonically", () => {
    const entries = enumerateRegionAuthorObjects({ parkourCourseZones: [{ id: "zone" }] });
    assert.equal(entries[0].type, "parkourCourseZone");
  });

  it("reuses one orbit gizmo factory for level and workbench view states", () => {
    const gizmo = createOrbitGizmo({ name: "proof" });
    updateOrbitGizmo(gizmo, { target: new THREE.Vector3(2, 1, -3), yaw: Math.PI / 2, scale: 0.5, visible: true });
    assert.deepEqual(gizmo.position.toArray(), [2, 1, -3]);
    assert.equal(gizmo.visible, true);
    assert.equal(gizmo.userData.isOrbitGizmo, true);
  });
});
