import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { ROOTBOUND_REWARD_RESOURCES } from '../src/world/rootboundRewards.js';

const out = 'art/reviews/rootbound-wildwood/buildout-2026-09-15/forage';
await fs.mkdir(out, { recursive: true });
const runTag = Date.now();
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const receipts = [], errors = [];

async function createPage() {
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.GAME_URL ?? 'http://localhost:8080/');
  await page.waitForFunction(() => !!window.__game, { timeout: 120000 });
  if (await page.locator('[data-action=start]').isVisible()) await page.locator('[data-action=start]').click();
  await page.waitForTimeout(500);
  return page;
}

function resourceId(anchor) { return `f1:r:${anchor.cx}:${anchor.cz}:${anchor.index}`; }

async function nativeCollectNearbyPickup(page, resourceId) {
  const read = () => page.evaluate(resourceId => {
    const g = window.__game, player = g.playerController.getState().pos;
    const pickup = g.pickupSystem.getPickups().find(candidate => candidate.resourceId === resourceId);
    return { player: { x: player.x, z: player.z }, pickup: pickup ? { x: pickup.pos.x, z: pickup.pos.z } : null };
  }, resourceId);
  // Learn the current camera-relative directions with short real key presses,
  // then use the best one to walk toward a landed pickup. No pickup API is
  // used to move or collect the item.
  for (let round = 0; round < 3; round += 1) {
    let state = await read();
    if (!state.pickup) return;
    const desired = { x: state.pickup.x - state.player.x, z: state.pickup.z - state.player.z };
    let best = null;
    for (const key of ['KeyW', 'KeyD', 'KeyS', 'KeyA']) {
      const start = await read();
      await page.keyboard.down(key); await page.waitForTimeout(75); await page.keyboard.up(key);
      const end = await read();
      const dx = end.player.x - start.player.x, dz = end.player.z - start.player.z;
      const score = dx * desired.x + dz * desired.z;
      if (!best || score > best.score) best = { key, score };
    }
    if (!best || best.score <= 0) return;
    await page.keyboard.down(best.key); await page.waitForTimeout(360); await page.keyboard.up(best.key);
    await page.waitForTimeout(450);
  }
}

async function stageAt(page, anchor) {
  const id = resourceId(anchor);
  await page.evaluate(({ x, z }) => {
    const g = window.__game;
    g.characterPhysics.setPosition({ x, y: g.frontierChunks.getHeight(x, z) + .7, z });
    g.playerController.syncPosFromPhysics();
    g.playerController.snapRenderPose();
  }, anchor);
  await page.waitForTimeout(3500);
  const staged = await page.evaluate(id => {
    const g = window.__game;
    const node = g.resourceSystem.getActiveNodes().find(candidate => candidate.id === id);
    if (!node) return null;
    const source = node.state.position;
    const candidates = [];
    for (const radius of [.72, .92, 1.12, 1.32, 1.52]) for (let step = 0; step < 16; step += 1) {
      const angle = step * Math.PI * 2 / 16;
      const x = source.x + Math.cos(angle) * radius, z = source.z + Math.sin(angle) * radius;
      const y = g.frontierChunks.getHeight(x, z) + .7;
      if (g.resourceSystem.getManualTargets({ x, y, z }).some(target => target.id === id)) candidates.push({ x, y, z });
    }
    return { id, source, remaining: node.state.remainingChunks, resourceId: node.type.resourceId, approach: candidates[0] ?? null };
  }, id);
  assert.ok(staged?.approach, `${anchor.key} is resident with a supported manual strike approach`);
  await page.evaluate(pos => {
    const g = window.__game;
    g.characterPhysics.setPosition(pos); g.playerController.syncPosFromPhysics(); g.playerController.snapRenderPose();
  }, staged.approach);
  await page.waitForTimeout(250);
  return staged;
}

try {
  let page = await createPage();
  assert.equal(await page.evaluate(() => window.__game.beginExpeditionFromDefaultEntry()), true, 'normal expedition starts at Camp');
  // Keep this proof to one explicit field-tool action per source.  The action
  // itself remains the native button click below; this only prevents nearby
  // automatic follow-up swings from consuming a sibling supply.
  await page.evaluate(() => { window.__game.autoHarvestEnabled = false; });
  const tool = page.locator('.beta-field-tool');
  for (const anchor of ROOTBOUND_REWARD_RESOURCES) {
    const id = resourceId(anchor);
    const before = await stageAt(page, anchor);
    before.inventory = await page.evaluate(resourceId => window.__game.pickupSystem.getInventory()[resourceId] ?? 0, before.resourceId);
    // Walk a short native input pulse after placement; this keeps the pickup
    // lifecycle in its normal player-motion path without moving beyond strike range.
    const positionBeforeMove = await page.evaluate(() => ({ ...window.__game.playerController.getState().pos }));
    await page.keyboard.down('KeyW'); await page.waitForTimeout(90); await page.keyboard.up('KeyW');
    await page.waitForTimeout(180);
    const targetReady = await page.evaluate(id => window.__game.resourceSystem.getManualTargets(window.__game.playerController.getState().pos).some(target => target.id === id), id);
    assert.equal(targetReady, true, `${anchor.key} remains in native strike range after a short walk`);
    await tool.click();
    await page.waitForTimeout(700);
    // The spawned pickup uses normal player-motion/magnet collection.  Step
    // through its local landing area and return, rather than reading or
    // collecting it through a debug API.
    await nativeCollectNearbyPickup(page, before.resourceId);
    await page.waitForTimeout(2600);
    const after = await page.evaluate(({ id, resourceId }) => {
      const g = window.__game, node = g.resourceSystem.getActiveNodes().find(candidate => candidate.id === id);
      return {
        remaining: node?.state.remainingChunks ?? null,
        inventory: g.pickupSystem.getInventory()[resourceId] ?? 0,
        activePickups: g.pickupSystem.getCount(),
        pickups: g.pickupSystem.getPickups().map(pickup => ({ resourceId: pickup.resourceId, state: pickup.state, pos: { ...pickup.pos } })),
        position: { ...g.playerController.getState().pos },
        ecology: g.frontierProgress.getFrontierEcologyState().resources[id],
      };
    }, { id, resourceId: before.resourceId });
    receipts.push({ key: anchor.key, id, family: before.resourceId, before, positionBeforeMove, after });
    assert.ok(after.remaining >= 0 && after.remaining < before.remaining, `${anchor.key} consumes finite harvest chunks through the field-tool button`);
    assert.equal(after.ecology, after.remaining, `${anchor.key} writes its stable depletion identity`);
    assert.ok(after.inventory > before.inventory, `${anchor.key} drop reaches the normal player inventory`);
    await page.screenshot({ path: `${out}/${runTag}-${anchor.key}-harvested.png` });
  }
  const exported = await page.evaluate(() => {
    const result = window.__game.frontierProgress.exportSave();
    if (!result.ok) throw new Error(`save-export-${result.reason}`);
    return result.payload;
  });
  await page.close();
  page = await createPage();
  const restored = await page.evaluate(payload => {
    const g = window.__game, imported = g.frontierProgress.importSave(payload);
    return { imported, resources: g.frontierProgress.getFrontierEcologyState().resources };
  }, exported);
  assert.equal(restored.imported.ok, true);
  for (const receipt of receipts) assert.equal(restored.resources[receipt.id], receipt.after.remaining, `${receipt.key} depletion restores from export`);
  receipts.push({ restored });
  assert.deepEqual(errors, []);
} finally {
  await fs.writeFile(`${out}/receipt.json`, JSON.stringify({ errors, receipts }, null, 2));
  await browser.close();
}
console.log('All seven Rootbound reward sources were harvested through native field-tool input and restored from export.');
