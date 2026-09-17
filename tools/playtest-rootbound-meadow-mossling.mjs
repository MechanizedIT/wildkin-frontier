// One Meadow setup placement, followed by ordinary keyboard movement.  This
// records the real streamed source, its skittish flee/return state, unload and
// source identity after a portable save import.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const out = 'art/reviews/rootbound-wildwood/meadow-mossling-r1';
const sourceId = 'f1:w:-10:11:701';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await context.newPage();
const errors = [], report = { sourceId, input: 'one initial setup placement; ordinary keyboard W/S thereafter', errors };
page.on('pageerror', error => errors.push(error.message));
const saveReceipt = () => writeFile(`${out}/receipt.json`, JSON.stringify(report, null, 2));
const state = () => page.evaluate(sourceId => {
  const g = window.__game, creature = g.creatureSystem.getCreatures().find(candidate => candidate.state.originId === sourceId);
  const player = g.playerController.getState();
  return { player: { x: player.pos.x, y: player.pos.y, z: player.pos.z }, active: !!creature,
    creature: creature && { originId: creature.state.originId, id: creature.state.id, ai: creature.state.aiState,
      pos: { ...creature.state.pos }, home: { ...creature.state.homePos }, generated: creature.state.isGeneratedResident },
    residency: g.frontierWildlife.getDebugState() };
}, sourceId);
async function walkToward(target, stopDistance, label, steps = 36, stopOnFlee = false) {
  const trace = [];
  for (let step = 0; step < steps; step += 1) {
    const snapshot = await page.evaluate(({ sourceId, target }) => {
      const g = window.__game, player = g.playerController.getState();
      const creature = g.creatureSystem.getCreatures().find(candidate => candidate.state.originId === sourceId);
      const dx = target.x - player.pos.x, dz = target.z - player.pos.z;
      const yaw = Math.atan2(-dx, -dz);
      g.cameraFollow.orbitBy(yaw - g.cameraFollow.getYaw());
      return { player: { x: player.pos.x, z: player.pos.z }, distance: Math.hypot(dx, dz), ai: creature?.state.aiState ?? null,
        creature: creature && { x: creature.state.pos.x, z: creature.state.pos.z } };
    }, { sourceId, target });
    trace.push(snapshot);
    if (snapshot.distance <= stopDistance || (stopOnFlee && snapshot.ai === 'FLEE')) break;
    await page.keyboard.down('w'); await page.waitForTimeout(260); await page.keyboard.up('w');
  }
  report[label] = trace; await saveReceipt();
  return trace.at(-1);
}
try {
  await page.goto(process.env.GAME_URL ?? 'http://localhost:8080/');
  await page.waitForFunction(() => !!window.__game, { timeout: 120000 });
  if (await page.locator('[data-action=start]').isVisible()) await page.locator('[data-action=start]').click();
  await page.evaluate(() => window.__game.beginExpeditionFromDefaultEntry());
  // Sole setup: put the player on the south Meadow approach.  Movement after
  // this line is native keyboard input and camera steering.
  await page.evaluate(() => {
    const g = window.__game, x = -458, z = 601;
    g.characterPhysics.setPosition({ x, y: g.frontierChunks.getHeight(x, z) + .7, z });
    g.playerController.syncPosFromPhysics(); g.playerController.snapRenderPose(); g.cameraFollow.snap();
  });
  await page.waitForTimeout(1800);
  report.initial = await state();
  await saveReceipt();
  assert.equal(report.initial.creature?.originId, sourceId, 'Meadow Mossling streams at its real source');
  await page.screenshot({ path: `${out}/approach-start.png` });
  // Aim from live state before every native W leg, stopping only once the
  // controller has actually entered its skittish response distance.
  await walkToward({ x: -458, z: 591 }, 5.4, 'approachTrace', 36, true);
  await page.waitForTimeout(450);
  report.flee = await state();
  await saveReceipt();
  assert.equal(report.flee.creature?.ai, 'FLEE', 'ordinary approach triggers the native skittish retreat');
  await page.screenshot({ path: `${out}/flee.png` });
  // Walk out through the open Meadow, then leave the controller enough native
  // time to settle into its normal return/roam behavior.
  await walkToward({ x: -458, z: 605 }, 1.2, 'withdrawTrace');
  await page.waitForTimeout(3200);
  report.returned = await state();
  await saveReceipt();
  assert.equal(report.returned.creature?.originId, sourceId, 'source stays identifiable after retreat and return');
  assert.ok(['RETURN', 'ROAM'].includes(report.returned.creature?.ai), 'once the player retreats, the Mossling returns or resumes roaming');
  await page.screenshot({ path: `${out}/return.png` });
  // Diagnostic-only streaming setup after the natural encounter has closed.
  await page.evaluate(() => {
    const g = window.__game, x = -300, z = 500;
    g.characterPhysics.setPosition({ x, y: g.frontierChunks.getHeight(x, z) + .7, z });
    g.playerController.syncPosFromPhysics(); g.playerController.snapRenderPose();
  });
  await page.waitForTimeout(1100); report.streamedOut = await state(); await saveReceipt();
  await page.evaluate(() => {
    const g = window.__game, x = -458, z = 601;
    g.characterPhysics.setPosition({ x, y: g.frontierChunks.getHeight(x, z) + .7, z });
    g.playerController.syncPosFromPhysics(); g.playerController.snapRenderPose();
  });
  await page.waitForTimeout(1400); report.streamedBack = await state(); await saveReceipt();
  assert.equal(report.streamedBack.creature?.originId, sourceId, 'stream return restores the same source identity');
  const exported = await page.evaluate(() => window.__game.frontierProgress.exportSave());
  assert.equal(exported.ok, true);
  await page.close();
  const reloadContext = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const reloadPage = await reloadContext.newPage(); reloadPage.on('pageerror', error => errors.push(error.message));
  await reloadPage.goto(process.env.GAME_URL ?? 'http://localhost:8080/'); await reloadPage.waitForFunction(() => !!window.__game, { timeout: 120000 });
  if (await reloadPage.locator('[data-action=start]').isVisible()) await reloadPage.locator('[data-action=start]').click();
  report.portable = await reloadPage.evaluate(async payload => {
    const g = window.__game, imported = g.frontierProgress.importSave(payload);
    g.beginExpeditionFromDefaultEntry();
    // Reload diagnostic setup: it re-enters the saved world then samples the
    // fixed source under a fresh browser context.
    const x = -458, z = 601;
    g.characterPhysics.setPosition({ x, y: g.frontierChunks.getHeight(x, z) + .7, z });
    g.playerController.syncPosFromPhysics(); g.playerController.snapRenderPose();
    await new Promise(resolve => setTimeout(resolve, 1400));
    const creature = g.creatureSystem.getCreatures().find(candidate => candidate.state.originId === 'f1:w:-10:11:701');
    return { imported, sourceId: creature?.state.originId ?? null };
  }, exported.payload);
  assert.equal(report.portable.imported.ok, true, 'portable save imports');
  assert.equal(report.portable.sourceId, sourceId, 'fresh context restores the same Meadow source');
  await reloadContext.close(); await saveReceipt();
  assert.deepEqual(errors, []);
} catch (error) {
  report.failure = error.stack ?? String(error); await saveReceipt(); throw error;
} finally {
  await saveReceipt();
  await browser.close();
}
console.log(JSON.stringify(report));
