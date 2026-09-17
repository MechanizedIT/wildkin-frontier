// Fresh-context UI proof for the selected-hotbar Wildkin action contract.
// It never reads or writes the user's browser profile/save. Diagnostic setup
// only grants/crafts one lure and places the player near a real Mossling;
// slot selection and contextual activation are native page interactions.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const baseURL = process.env.GAME_URL ?? 'http://localhost:8080/';
const out = 'dist/qa';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL ?? 'msedge' });
const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await context.newPage();
const errors = [], report = [];
page.on('pageerror', error => errors.push(error.stack));

const slot = index => page.locator(`[data-action="selectQuickSlot"][data-id="${index}"]`);
const stayNearMossling = async (distance = 2.1) => {
  await page.evaluate(distance => {
  const g = window.__game;
  const mossling = g.creatureSystem.getActiveAliveCreatures().find(c => c.state.visualAssetId === 'asset_wildkin_mossling');
  if (!mossling) throw new Error('Mossling despawned during hotbar proof');
  g.characterPhysics.setPosition({ x: mossling.state.pos.x, y: mossling.state.pos.y + .54, z: mossling.state.pos.z + distance });
  g.playerController.syncPosFromPhysics(); g.playerController.snapRenderPose();
  }, distance);
  await page.waitForFunction(() => window.__game.playerController.getState().grounded, null, { timeout: 3000 });
};
const read = () => page.evaluate(() => {
  const g = window.__game;
  const interaction = g.betaGame.getNearbyInteraction(g.playerController.getState().pos, () => true);
  return {
    selected: g.betaGame.equipment.selectedItem()?.id ?? null,
    supplies: { ...g.frontierProgress.getFieldSupplies() },
    interaction: interaction && { id: interaction.id, label: interaction.label, action: interaction.action, disabled: interaction.disabled, requiredEquipmentId: interaction.requiredEquipmentId },
    swinging: g.fieldTool.isSwinging,
  };
});
const expectPrompt = async (selected, label, action, disabled = false) => {
  await page.waitForFunction(({ selected, label, action, disabled }) => {
    const g = window.__game;
    const info = g.betaGame.getNearbyInteraction(g.playerController.getState().pos, () => true);
    return g.betaGame.equipment.selectedItem()?.id === selected
      && info?.label === label && info?.action === action && !!info?.disabled === disabled
      && document.querySelector('#contextual-action-button')?.textContent.includes(label);
  }, { selected, label, action, disabled });
  const value = await read();
  report.push({ selected, prompt: value.interaction, pass: true });
  return value;
};

try {
  await page.goto(baseURL);
  await page.waitForFunction(() => Boolean(window.__game), { timeout: 120000 });
  await page.locator('[data-action="start"]').click();
  // Diagnostic setup: fresh browser context only. Use the actual inventory
  // owner to grant/craft supplies, then start a normal expedition and use a
  // resident Mossling.
  await page.evaluate(() => {
    const g = window.__game;
    const gathered = g.frontierProgress.collectResources({ berries: 12, fiber: 12, wood: 2 });
    if (!gathered.ok) throw new Error(`Could not grant diagnostic supplies: ${gathered.reason}`);
    const lure = g.frontierProgress.craftFieldSupply('berry_lure');
    if (!lure.crafted) throw new Error(`Could not craft diagnostic berry lure: ${lure.reason}`);
    const snare = g.frontierProgress.craftFieldSupply('woven_snare');
    if (!snare.crafted) throw new Error(`Could not craft diagnostic woven snare: ${snare.reason}`);
    if (!g.beginExpeditionFromDefaultEntry()) throw new Error('Could not start expedition');
  });
  await page.waitForTimeout(900);
  await stayNearMossling();
  await page.waitForTimeout(250);

  // Native hotbar changes drive every visible prompt check.
  await slot(0).click();
  await stayNearMossling();
  await expectPrompt('omni_tool', 'ATTACK', 'attack');
  await page.screenshot({ path: `${out}/wildkin-hotbar-attack.png` });
  // Use the native visible control from outside harvesting reach, proving this
  // is the regular Field Tool path without damaging the Mossling needed below.
  await stayNearMossling(6.3);
  await page.locator('#contextual-action-button').click();
  await page.waitForFunction(() => window.__game.fieldTool.isSwinging, { timeout: 3000 });
  assert.equal((await read()).swinging, true, 'native contextual ATTACK reaches Field Tool');
  report.push({ check: 'native contextual ATTACK', pass: true });

  await slot(1).click();
  await stayNearMossling();
  await expectPrompt('medkit', 'SELECT BERRY LURE', 'select-taming-item', true);

  await slot(2).click();
  await stayNearMossling();
  const catchPrompt = await expectPrompt('berry_lure', 'PLACE BERRIES', 'catch');
  const baitBeforeStale = catchPrompt.supplies.berry_lure;
  const staleInfo = await page.evaluate(() => {
    const g = window.__game;
    const info = g.betaGame.getNearbyInteraction(g.playerController.getState().pos, () => true);
    return {
      id: info.id, action: info.action, label: info.label,
      requiredEquipmentId: info.requiredEquipmentId,
    };
  });
  await page.screenshot({ path: `${out}/wildkin-hotbar-catch.png` });

  await slot(3).click();
  await stayNearMossling();
  await expectPrompt('woven_snare', 'SELECT BERRY LURE', 'select-taming-item', true);
  // Diagnostic stale-queue check: this is the exact retained interaction a
  // delayed tap would deliver. The production activation guard must reject it
  // after the native slot switch, before any item transaction can begin.
  const stale = await page.evaluate(info => window.__game.betaGame.activateWildkinInteraction(info), staleInfo);
  assert.equal(stale.ok, false, 'stale catch is rejected after a native slot switch');
  assert.equal((await read()).supplies.berry_lure, baitBeforeStale, 'rejected stale catch does not consume bait');
  report.push({ check: 'stale catch after native bait→wrong-bait switch', result: stale, baitBeforeStale, baitAfter: (await read()).supplies.berry_lure, pass: true });

  // The fifth hotbar slot is empty. Empty-slot selection is deliberately
  // rejected by the persistent loadout owner, so this native click must keep
  // the prior selected item and its coherent non-Catch prompt.
  await page.evaluate(() => {
    const g = window.__game;
    if (!g.frontierProgress.assignQuickSlot(4, null).ok) throw new Error('Could not create diagnostic empty slot');
    g.betaGame.shell.update();
  });
  await slot(4).click();
  await stayNearMossling();
  await page.waitForFunction(() => window.__game.betaGame.equipment.selectedItem()?.id === 'woven_snare');
  const empty = await read();
  assert.equal(empty.selected, 'woven_snare');
  assert.equal(empty.interaction?.action, 'select-taming-item');
  assert.equal(empty.interaction?.disabled, true);
  report.push({ check: 'native empty-slot selection is rejected', selectedAfterClick: empty.selected, prompt: empty.interaction, pass: true });

  // Return to the matching bait, then use the visible contextual control
  // natively. Starting the Mossling attempt spends exactly one real lure.
  await slot(2).click();
  await stayNearMossling();
  await expectPrompt('berry_lure', 'PLACE BERRIES', 'catch');
  await page.locator('#contextual-action-button').click();
  await page.waitForFunction(() => Boolean(window.__game.betaGame.companions.getBondState()), null, { timeout: 4000 });
  const activeCatch = await read();
  const bondState = await page.evaluate(() => window.__game.betaGame.companions.getBondState()?.stage ?? null);
  assert.equal(activeCatch.supplies.berry_lure, baitBeforeStale - 1, 'native Catch consumes the selected matching lure');
  report.push({ check: 'native contextual Catch', bondState, baitBefore: baitBeforeStale, baitAfter: activeCatch.supplies.berry_lure, pass: true });

  assert.deepEqual(errors, [], 'no browser errors');
  fs.writeFileSync(`${out}/wildkin-hotbar-action.json`, JSON.stringify({ pass: true, baseURL, proof: 'Fresh browser context; native hotbar and contextual button actions. Inventory/position/stale queue are labelled diagnostics.', report, errors }, null, 2));
  console.log(JSON.stringify({ pass: true, report }, null, 2));
} catch (error) {
  await page.screenshot({ path: `${out}/wildkin-hotbar-action-failure.png` }).catch(() => {});
  fs.writeFileSync(`${out}/wildkin-hotbar-action.json`, JSON.stringify({ pass: false, baseURL, report, errors, failure: error.stack }, null, 2));
  console.error(error); console.error(errors);
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
