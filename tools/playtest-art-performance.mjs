// Browser proof for the static-art batching path. Renderer counters are
// evidence of the submitted scene at this viewport, not an FPS claim.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const out = "dist/qa";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL ?? "msedge" });
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const errors = [];
const checks = [];
page.on("pageerror", (error) => errors.push(error.stack));

const sceneSample = () => page.evaluate(() => {
  const game = window.__game;
  const faded = [];
  let batchedMeshCount = 0;
  const batchedProps = new Set();
  let allBatchesIdentified = true;
  game.scene.traverse((object) => {
    if (!object.isMesh) return;
    if (object.material?.opacity === 0.25) faded.push(object.userData.visualAssetId);
    if (object.userData.staticPropBatch) {
      batchedMeshCount += 1;
      allBatchesIdentified &&= Boolean(object.userData.visualAssetId && object.userData.propId);
      batchedProps.add(`${object.userData.visualAssetId}:${object.userData.propId}`);
    }
  });
  return {
    faded,
    batchedMeshCount,
    batchedPropCount: batchedProps.size,
    allBatchesIdentified,
    render: { calls: game.renderer.info.render.calls, triangles: game.renderer.info.render.triangles },
    memory: { geometries: game.renderer.info.memory.geometries, textures: game.renderer.info.memory.textures },
  };
});

try {
  await page.goto(process.env.GAME_URL ?? "http://localhost:8080/");
  await page.waitForFunction(() => Boolean(window.__game));
  if (await page.locator('[data-action="start"]').isVisible()) await page.locator('[data-action="start"]').click();
  await page.evaluate(async () => {
    const game = window.__game;
    game.beginExpeditionFromDefaultEntry();
    const { getSurfaceHeight } = await import('/src/world/terrainSurfaceModel.js');
    const region = game.worldRegistry.getSectionById("section_1");
    const canopy = region.props.find((prop) => prop.visualAssetId === "asset_verge_canopy");
    if (!canopy) throw new Error('Verdant Verge has no canopy for the occlusion proof.');
    const x = canopy.pos.x, z = canopy.pos.z - 1.7;
    game.characterPhysics.setPosition({ x, y: getSurfaceHeight(region.surface, x, z) + 0.55, z });
    game.playerController.syncPosFromPhysics();
    game.playerController.snapRenderPose();
  });
  await page.waitForTimeout(500);

  const faded = await sceneSample();
  assert.ok(faded.batchedMeshCount > 0, "static visual-asset props produce material batches");
  assert.ok(faded.allBatchesIdentified, "batched meshes retain root asset and prop identity for presentation diagnostics");
  assert.ok(faded.faded.includes("asset_verge_canopy"), "foreground canopy fades through a merged mesh");
  checks.push("Merged static canopy still fades when it blocks the player.");

  await page.keyboard.press("j");
  await page.waitForTimeout(120);
  const paused = await sceneSample();
  assert.equal(paused.faded.length, 0, "opening the blocking Pack restores the original canopy material state");
  checks.push("Opening the Pack restores full canopy opacity.");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);
  await page.evaluate(() => window.__game.beginExpeditionFromDefaultEntry());
  await page.waitForTimeout(200);

  const beforeMove = await page.evaluate(() => ({ ...window.__game.playerController.getState().pos }));
  await page.keyboard.down("w");
  await page.waitForTimeout(400);
  await page.keyboard.up("w");
  await page.waitForTimeout(160);
  const afterMove = await page.evaluate(() => ({ ...window.__game.playerController.getState().pos }));
  assert.ok(Math.hypot(afterMove.x - beforeMove.x, afterMove.z - beforeMove.z) > 0.25, "normal W movement remains active after the merged fade path");
  checks.push("Normal forward movement remains responsive after occlusion fade and restoration.");

  const final = await sceneSample();
  assert.deepEqual(errors, [], "no uncaught browser errors");
  const report = { pass: true, viewport: "844x390", checks, initial: faded, final, errors };
  await fs.writeFile(`${out}/art-performance-proof.json`, JSON.stringify(report, null, 2));
  await page.screenshot({ path: `${out}/art-performance-proof.png` });
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await page.screenshot({ path: `${out}/art-performance-failure.png` }).catch(() => {});
  await fs.writeFile(`${out}/art-performance-proof.json`, JSON.stringify({ pass: false, checks, errors, failure: error.stack }, null, 2));
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
