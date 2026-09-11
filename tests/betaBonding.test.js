import test from "node:test";
import assert from "node:assert/strict";
import { createBondingSession, canBond } from "../src/companions/bondingLogic.js";
import { createLootSystem } from "../src/world/lootSystem.js";

test("bonding requires three deliberate valid echoes and ignores rapid repeat input", () => {
  const session = createBondingSession();
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 200; j++) {
      const state = session.update(1 / 60);
      if (Math.abs(state.phase - state.target) < 0.035 && (i === 0 || state.elapsed > i * 1.8 + 0.1)) break;
    }
    const tapped = session.tap();
    assert.equal(tapped.hit, true);
    assert.equal(tapped.successes, i + 1);
    assert.equal(session.tap().accepted, false);
  }
  assert.equal(session.getState().status, "success");
  const before = session.getState();
  session.update(2);
  assert.deepEqual(session.getState(), before);
});

test("cancelled, failed and full bonds never become successful captures", () => {
  const cancel = createBondingSession(); cancel.cancel();
  assert.equal(cancel.tap().accepted, false);
  assert.equal(cancel.getState().status, "cancelled");
  const failed = createBondingSession();
  failed.tap();
  for (let i = 0; i < 108; i++) failed.update(1 / 60);
  failed.tap();
  for (let i = 0; i < 108; i++) failed.update(1 / 60);
  assert.equal(failed.tap().status, "failed");
  assert.equal(canBond({ speciesId: "tidefin", pending: ["mossling"], capacity: 1 }).ok, false);
  assert.equal(canBond({ speciesId: "mossling", secured: ["mossling"] }).ok, false);
  assert.equal(canBond({ speciesId: "mossling", damaged: true }).ok, false);
  assert.equal(canBond({ speciesId: "mossling", active: false }).ok, false);
  assert.equal(canBond({ speciesId: "mossling" }).ok, true);
});

test("core cannot bypass guardian and is recoverable after loss; persistent claim only on extraction", () => {
  const chest = { id: "core", pos: { x: 0, y: 0, z: 0 }, sectionId: "vault", lootTableId: "coreLoot" };
  let guardianDead = false, claims = 0, rewards = 0, permanentlyClaimed = false;
  const registry = { data: { resourceDrops: [] }, getLootChestsForSection: () => [chest], getLootChestById: () => chest, getLootTableById: () => ({ rewards: [{ type: "xp", amount: 250 }] }) };
  const loot = createLootSystem(registry, {
    getActiveSectionId: () => "vault", getPlayerPos: () => ({ x: 0, y: 0.5, z: 0 }),
    checkAccess: () => ({ ok: guardianDead, reason: "Defeat Guardian" }), transientChestIds: ["core"],
    frontierProgress: { getLootChestAvailability: () => ({ available: !permanentlyClaimed }), claimLootChest: () => { claims++; return { claimed: true }; } },
    grantRewards: r => { rewards += r.xp; },
  });
  assert.equal(loot.open("core").ok, false);
  assert.equal(loot.getAvailability("core").available, true);
  guardianDead = true;
  assert.equal(loot.open("core").ok, true);
  assert.equal(loot.getAvailability("core").available, false, "presentation sees the transient run claim");
  assert.equal(loot.open("core").ok, false);
  assert.equal(claims, 0);
  assert.equal(rewards, 250);
  loot.reset(); // expedition death discards cargo, allows retrieving the core again
  assert.equal(loot.getAvailability("core").available, true);
  assert.equal(loot.open("core").ok, true);
  permanentlyClaimed = true; loot.reset();
  assert.equal(loot.open("core").ok, false);
});
