import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getJumpPadTrajectorySignature, predictJumpPadTrajectory } from "../src/world/jumpPadSystem.js";
import { createParkourSystem } from "../src/world/parkourSystem.js";
import { repairPortalGateAtomic } from "../src/world/portalGateSystem.js";
import WORLD_DATA from "./fixtures/phase4b1ProofWorld.generated.js";
import { normalizeWorldData } from "../src/world/worldValidator.js";
import { createWorldRegistry } from "../src/world/worldRegistry.js";
import { createSectionRuntime } from "../src/world/sectionRuntime.js";

describe("Phase 4B.1.1 — closure contracts", () => {
  it("invalidates Jump Pad guidance for every canonical vertical-carry field", () => {
    const base = { id: "pad", pos: { x: 0, y: 0, z: 0 }, powerPreset: "medium", verticalLaunch: 6 };
    assert.notEqual(getJumpPadTrajectorySignature(base), getJumpPadTrajectorySignature({ ...base, powerPreset: "high" }));
    assert.notEqual(getJumpPadTrajectorySignature(base), getJumpPadTrajectorySignature({ ...base, verticalLaunch: 7 }));
    assert.notEqual(getJumpPadTrajectorySignature(base), getJumpPadTrajectorySignature({ ...base, pos: { x: 1, y: 0, z: 0 } }));
    assert.ok(predictJumpPadTrajectory(base).at(-1).y < 0.001);
  });

  it("scopes parkour checkpoint, fail, end, and replacement behavior by course", () => {
    let safe = 0; let fatal = 0;
    let activeSection = "s";
    const starts = [{ id: "startA", courseId: "A", sectionId: "s", pos: { x: 0, z: 0 }, triggerRadius: 1 }, { id: "startB", courseId: "B", sectionId: "s", pos: { x: 10, z: 0 }, triggerRadius: 1 }];
    const checkpoints = [{ id: "cpA", courseId: "A", pos: { x: 0, z: 2 }, triggerRadius: 1 }, { id: "cpB", courseId: "B", pos: { x: 0, z: 4 }, triggerRadius: 1 }];
    const volumes = [{ id: "killA", courseId: "A", pos: { x: 0, z: 6 }, size: { w: 2, h: 2, d: 2 } }, { id: "killB", courseId: "B", pos: { x: 0, z: 8 }, size: { w: 2, h: 2, d: 2 } }];
    const ends = [{ id: "endA", courseId: "A", pos: { x: 0, z: 10 }, triggerRadius: 1 }, { id: "endB", courseId: "B", pos: { x: 0, z: 12 }, triggerRadius: 1 }];
    const registry = { getParkourStartsForSection: () => starts, getParkourCheckpointsForSection: () => checkpoints, getKillVolumesForSection: () => volumes, getParkourEndsForSection: () => ends };
    const system = createParkourSystem(registry, { getActiveSectionId: () => activeSection, onSafeFailure: () => safe++, onNormalFatal: () => fatal++ });
    system.update({ x: 0, z: 0 });
    system.update({ x: 0, z: 2 });
    assert.equal(system.getState().latestCheckpoint.checkpointId, "cpA");
    system.update({ x: 0, z: 4 }); // cpB is not active and must not replace cpA
    assert.equal(system.getState().latestCheckpoint.checkpointId, "cpA");
    system.update({ x: 0, z: 8 }); // killB while A is active is fatal
    assert.equal(fatal, 1); assert.equal(safe, 0);
    system.update({ x: 0, z: 10 }); // endA clears protection
    assert.equal(system.isActive(), false);
    assert.equal(system.handleFatalFailure("damage"), false);
    system.update({ x: 10, z: 0 }); // start B cleanly replaces A state
    assert.equal(system.getState().activeCourseId, "B");
  });

  it("rolls back cargo when repair commit fails and spends exactly once on success", () => {
    let cargo = { wood: 2 };
    const spend = (_snapshot, cost) => { cargo.wood -= cost.wood; return true; };
    const refund = (cost) => { cargo.wood += cost.wood; };
    const failed = repairPortalGateAtomic({ gateId: "g", requirements: { minPlayerLevel: 1, resources: { wood: 2 } }, playerLevel: 1, cargo, spendCargo: spend, refundCargo: refund, commitRepair: () => false });
    assert.equal(failed.ok, false); assert.deepEqual(cargo, { wood: 2 });
    const success = repairPortalGateAtomic({ gateId: "g", requirements: { minPlayerLevel: 1, resources: { wood: 2 } }, playerLevel: 1, cargo, spendCargo: spend, refundCargo: refund, commitRepair: () => true });
    assert.equal(success.ok, true); assert.deepEqual(cargo, { wood: 0 });
  });

  it("resolves reciprocal physical gates and keeps arrival outside the trigger", () => {
    const registry = createWorldRegistry(WORLD_DATA);
    const runtime = createSectionRuntime({ worldRegistry: registry });
    runtime.activate("section_1");
    const destination = runtime.resolvePortalDestination(registry.getPortalGateById("gate_section_1_to_2"));
    const receiving = registry.getPortalGateById("gate_section_2_to_1");
    assert.equal(destination.gate.id, receiving.id);
    assert.ok(Math.hypot(destination.pos.x - receiving.pos.x, destination.pos.z - receiving.pos.z) > receiving.triggerRadius);
    assert.equal(destination.facingYaw, receiving.rotY);
  });

  it("rejects broken physical portal topology but accepts the one-way arrival endpoint", () => {
    assert.doesNotThrow(() => normalizeWorldData(WORLD_DATA));
    const missing = structuredClone(WORLD_DATA);
    missing.regions.find((r) => r.id === "section_1").portalGates.find((g) => g.id === "gate_section_1_to_2").targetGateId = "missing_gate";
    assert.throws(() => normalizeWorldData(missing), /target gate missing/);
    const self = structuredClone(WORLD_DATA);
    self.regions.find((r) => r.id === "section_1").portalGates.find((g) => g.id === "gate_section_1_to_2").targetGateId = "gate_section_1_to_2";
    assert.throws(() => normalizeWorldData(self), /cannot target itself/);
  });
});
