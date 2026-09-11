import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.GAME_URL ?? "http://localhost:8080/";
const model = process.env.MODEL_PATH ?? ".dream-loop/workflow-proof/rigging/mossling-20k-v4/model.glb";
const out = "dist/qa"; await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL ?? "msedge" });
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const errors = []; page.on("pageerror", (error) => errors.push(error.message)); page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
try {
  const url = new URL("tools/art/runtime-model-preview.html", base); url.searchParams.set("model", model);
  await page.goto(url.href); await page.waitForFunction(() => window.ready === true, { timeout: 30000 });
  const report = await page.evaluate(() => window.runtimeReport);
  assert.equal(errors.length, 0, errors.join("\n")); assert.equal(report.independentSkeletons, true); assert.equal(report.tintMaterialOwned, true); assert.equal(report.authorParity, true); assert.equal(report.animation.a, "walk"); assert.equal(report.disposedOneInstance, true);
  const result = { pass: true, viewport: "844x390", report, errors, note: "Renderer counters are a fixture draw-cost sample, not measured phone FPS or visual acceptance." };
  await writeFile(`${out}/model-runtime-proof.json`, JSON.stringify(result, null, 2)); await page.screenshot({ path: `${out}/model-runtime-proof.png` }); console.log(JSON.stringify(result, null, 2));
} catch (error) { await writeFile(`${out}/model-runtime-proof.json`, JSON.stringify({ pass:false, errors, failure:error.stack }, null, 2)); await page.screenshot({ path:`${out}/model-runtime-failure.png` }).catch(()=>{}); throw error; } finally { await browser.close(); }
