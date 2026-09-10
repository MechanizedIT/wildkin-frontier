import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL ?? "msedge" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [], report = [];
page.on("pageerror", e => errors.push(e.stack));
fs.mkdirSync("dist/qa", { recursive: true });
try {
  await page.goto(process.env.GAME_URL ?? "http://localhost:8080/");
  await page.locator("[data-action=start]").click();
  await page.evaluate(() => {
    const g = window.__game;
    g.frontierProgress.bankRun({ wood: 120, stone: 120, fiber: 120, iron_ore: 120, berries: 120, crystal_shard: 120, wildflower: 120 }, 800, "qa-loadout");
    g.frontierProgress.secureCompanions(["mossling", "tidefin", "emberhorn", "skydancer"], "qa-roster");
    for (const id of ["vitality", "field_tool"]) for (let n = 0; n < 3; n++) g.frontierProgress.purchaseUpgrade(id);
    g.frontierProgress.craftConsumable("medkit");
    g.betaGame.refreshModifiers(); g.playerCombat.reset();
  });
  await page.keyboard.press("j");
  await page.locator('[data-tab="workshop"]').click();
  await page.screenshot({ path: "dist/qa/workshop-phone.png" });
  assert.match(await page.locator(".beta-workshop").innerText(), /secured/i);
  await page.keyboard.press("Escape");
  await page.evaluate(() => window.__game.beginExpeditionFromDefaultEntry());
  assert.equal(await page.evaluate(() => window.__game.playerCombat.getMaxHealth()), 8);
  await page.evaluate(() => window.__game.playerCombat.takeDamage(2));
  await page.keyboard.press("h");
  assert.equal(await page.evaluate(() => window.__game.frontierProgress.getState().craftedConsumables.medkit), 0);
  // Select in Camp, then depart. Commands are tested through their visible HUD.
  await page.evaluate(() => window.__game.playerCombat.heal(8));
  report.push({ check: "Persistent vitality and crafted healing", proof: "seeded Camp resources, real purchase APIs; H input", pass: true });
  for (let section = 1; section <= 4; section++) {
    const id = `gate_section_${section}_to_${section + 1}`;
    const result = await page.evaluate(id => {
      const g = window.__game;
      g.pickupSystem.grantInventory({ wood: 20, stone: 20, iron_ore: 20, crystal_shard: 20 });
      const gate = g.worldRegistry.getPortalGateById(id);
      const p = { x: gate.pos.x, y: .55, z: gate.pos.z + 1.5 };
      g.characterPhysics.setPosition(p); g.playerController.syncPosFromPhysics(); g.playerController.snapRenderPose();
      const repaired = g.portalGateSystem.repair(id);
      g.playground.refreshPortalGateVisual(id, "active");
      const travelled = g.portalGateSystem.activate(id);
      return { repaired: repaired.ok, travelled: travelled.ok, region: g.sectionRuntime.getActiveSectionId(), active: g.sectionRuntime.getActiveIds() };
    }, id);
    assert.deepEqual(result, { repaired: true, travelled: true, region: `section_${section + 1}`, active: [`section_${section + 1}`] });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `dist/qa/section-${section + 1}-arrival.png` });
    report.push({ check: `${id}: carried repair and active-section transition`, proof: "diagnostic position/cargo; production repair/travel APIs", pass: true });
  }
  const before = await page.evaluate(() => window.__game.lootSystem.open("chest_heartwood_core"));
  assert.equal(before.ok, false);
  await page.evaluate(() => {
    const g = window.__game, guardian = g.creatureSystem.getCreatures().find(c => c.state.id === "wildkin_guardian");
    const p = { x: guardian.state.pos.x + 4.5, y: .55, z: guardian.state.pos.z + 2.5 };
    g.characterPhysics.setPosition(p); g.playerController.syncPosFromPhysics(); g.playerController.snapRenderPose();
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "dist/qa/guardian-telegraph.png" });
  await page.evaluate(() => {
    const g = window.__game, guardian = g.creatureSystem.getCreatures().find(c => c.state.id === "wildkin_guardian");
    g.creatureSystem.damageCreature(guardian, 999, g.playerController.getState().pos, null, "player");
    const core = g.worldRegistry.getLootChestById("chest_heartwood_core");
    const p = { x: core.pos.x, y: .55, z: core.pos.z + .9 };
    g.characterPhysics.setPosition(p); g.playerController.syncPosFromPhysics(); g.playerController.snapRenderPose();
  });
  assert.equal((await page.evaluate(() => window.__game.lootSystem.open("chest_heartwood_core"))).ok, true);
  assert.equal(await page.evaluate(() => window.__game.frontierProgress.getState().campaignCompleted), false);
  await page.evaluate(() => window.__game.handleDeathFlow("combat"));
  assert.equal(await page.evaluate(() => window.__game.frontierProgress.getState().claimedLootChestIds.includes("chest_heartwood_core")), false);
  assert.equal(await page.evaluate(() => window.__game.frontierProgress.getState().campaignCompleted), false);
  report.push({ check: "Losing unsecured Core leaves finale recoverable", proof: "diagnostic fight outcome; production loot/death flow", pass: true });
  await page.locator("#run-result-overlay button").click();
  await page.evaluate(() => {
    const g = window.__game; g.frontierProgress.unlockWaypoint("wp_section_5"); g.beginExpedition("wp_section_5");
    const guardian = g.creatureSystem.getCreatures().find(c => c.state.id === "wildkin_guardian");
    g.creatureSystem.damageCreature(guardian, 999, g.playerController.getState().pos, null, "player");
    const core = g.worldRegistry.getLootChestById("chest_heartwood_core");
    const p = { x: core.pos.x, y: .55, z: core.pos.z + .9 };
    g.characterPhysics.setPosition(p); g.playerController.syncPosFromPhysics(); g.playerController.snapRenderPose();
    g.lootSystem.open("chest_heartwood_core"); g.handleExtractionFlow({ id: "qa-finale" });
  });
  assert.equal(await page.evaluate(() => window.__game.frontierProgress.getState().campaignCompleted), true);
  await page.screenshot({ path: "dist/qa/finale-secured.png" });
  await page.reload(); await page.locator("[data-action=start]").click();
  assert.equal(await page.evaluate(() => window.__game.frontierProgress.getState().campaignCompleted), true);
  report.push({ check: "Core extraction, campaign ending, reload", pass: true });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ pass: true, report, errors }, null, 2));
  fs.writeFileSync("dist/qa/boundary-playtest.json", JSON.stringify({ pass: true, report, errors }, null, 2));
} catch (e) {
  await page.screenshot({ path: "dist/qa/boundary-failure.png" });
  console.error(e); console.error(errors); process.exitCode = 1;
} finally { await browser.close(); }
