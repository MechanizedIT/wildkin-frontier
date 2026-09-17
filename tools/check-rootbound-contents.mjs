import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const label = process.argv[2] ?? 'contents';
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Use a simple review label');
const out = `art/reviews/rootbound-wildwood/buildout-2026-09-15/${label}`;
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const errors = [], receipts = [], diagnostics = [];
async function createPage() {
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  return page;
}
async function boot(page) {
  await page.goto(process.env.GAME_URL ?? 'http://localhost:8080/');
  await page.waitForFunction(() => !!window.__game, { timeout: 120000 });
  if (await page.locator('[data-action=start]').isVisible()) await page.locator('[data-action=start]').click();
  await page.waitForTimeout(500);
}
try {
  let page = await createPage();
  await boot(page);
  assert.equal(await page.evaluate(() => window.__game.beginExpeditionFromDefaultEntry()), true, 'normal expedition starts at the Camp entry');
  for (const [name, id, x, z] of [
    ['lantern', 'f1:d:-10:13:rootbound-lantern-cache', -452, 680],
    ['crown', 'f1:d:-10:14:rootbound-crown-cache', -475, 716],
  ]) {
    await page.evaluate(({ x, z }) => {
      const g = window.__game;
      g.characterPhysics.setPosition({ x, y: g.frontierChunks.getHeight(x, z - 1.25) + .7, z: z - 1.25 });
      g.playerController.syncPosFromPhysics(); g.playerController.snapRenderPose();
      g.cameraFollow.orbitBy(Math.PI - g.cameraFollow.getYaw()); g.cameraFollow.snap();
    }, { x, z });
    await page.waitForTimeout(6000);
    await page.waitForTimeout(900);
    const before = await page.evaluate(id => {
      const g = window.__game;
      return { availability: g.lootSystem.getAvailability(id), pos: { ...g.playerController.getState().pos },
        interaction: g.lootSystem.getNearbyInteraction(g.playerController.getState().pos),
        discoveries: g.frontierDiscoveries.getDebugState(), scenery: g.frontierScenery.getDebugState() };
    }, id);
    assert.equal(before.interaction?.id, id);
    const button = page.locator('#contextual-action-button');
    const presented = { aria: await button.getAttribute('aria-label'), visible: await button.isVisible(), html: await button.innerHTML() };
    console.log(JSON.stringify({ name, presented, interaction: before.interaction }));
    await page.screenshot({ path: `${out}/${name}-before.png` });
    if (!presented.visible) diagnostics.push(await page.evaluate(({ id, x, z }) => {
      const g = window.__game, chest = g.worldRegistry.getLootChestById(id), root = g.scene.getObjectByName(id);
      const anchor = new g.THREE.Vector3(chest.pos.x, chest.pos.y + 1, chest.pos.z);
      const cameraPos = g.camera.getWorldPosition(new g.THREE.Vector3()), direction = g.camera.getWorldDirection(new g.THREE.Vector3());
      const projected = anchor.clone().project(g.camera);
      const ray = new g.THREE.Raycaster(cameraPos, anchor.clone().sub(cameraPos).normalize(), .01, cameraPos.distanceTo(anchor) - .2);
      const meshes = []; g.scene.traverse(node => { if (node.isMesh && node.geometry && node.visible) meshes.push(node); });
      const hits = ray.intersectObjects(meshes, false).slice(0, 6).map(hit => ({
        distance: Number(hit.distance.toFixed(3)), name: hit.object.name, parent: hit.object.parent?.name,
        propId: hit.object.userData?.propId ?? hit.object.parent?.userData?.propId ?? null,
        instanceId: hit.instanceId ?? null,
        playerVisibility: hit.instanceId === undefined ? null : hit.object.geometry.getAttribute('playerVisibility')?.getX(hit.instanceId) ?? null,
      }));
      return { id, target: { x, y: chest.pos.y + 1, z }, camera: { pos: cameraPos, direction }, projected, root: !!root, rootVisible: root?.visible, hits };
    }, { id, x, z }));
    assert.equal(presented.visible, true);
    assert.match(presented.aria, /^OPEN/);
    await page.screenshot({ path: `${out}/${name}-before.png` });
    await button.click(); await page.waitForTimeout(500);
    const after = await page.evaluate(id => window.__game.lootSystem.getAvailability(id), id);
    assert.equal(after.available, false);
    receipts.push({ name, id, before, after, input: 'native click on visible contextual OPEN' });
    await page.screenshot({ path: `${out}/${name}-opened.png` });
  }
  const save = await page.evaluate(() => {
    const exported = window.__game.frontierProgress.exportSave();
    if (!exported.ok) throw new Error(`save-export-${exported.reason}`);
    return exported.payload;
  });
  await page.close();
  page = await createPage();
  await boot(page);
  const reloaded = await page.evaluate(save => {
    const g = window.__game, imported = g.frontierProgress.importSave(save);
    return { imported, lantern: g.lootSystem.getAvailability('f1:d:-10:13:rootbound-lantern-cache'),
      crown: g.lootSystem.getAvailability('f1:d:-10:14:rootbound-crown-cache') };
  }, save);
  assert.equal(reloaded.imported.ok, true);
  assert.equal(reloaded.lantern.available, false); assert.equal(reloaded.crown.available, false);
  receipts.push({ reloaded });
  assert.deepEqual(errors, []);
} finally {
  await fs.writeFile(`${out}/receipt.json`, JSON.stringify({ errors, receipts, diagnostics }, null, 2));
  await browser.close();
}
console.log('Both Rootbound chests opened through visible UI; exported claims restored on a fresh page.');
