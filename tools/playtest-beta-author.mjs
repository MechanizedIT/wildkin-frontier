// Isolated Edge regression pass for the desktop Author workflow. It intentionally
// preserves player progress and only writes the separate local author draft.
import { createRequire } from "node:module";
import fs from "node:fs";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const baseURL = `${process.env.GAME_URL ?? "http://localhost:8080/"}?author=1`;
const out = "dist/qa";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const errors = [], report = [];
page.on("pageerror", (error) => errors.push(error.stack));
const capture = (name) => page.screenshot({ path: `${out}/${name}.png` });
const playerSave = () => page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => !key.startsWith("wildkin.author"))));

try {
  await page.goto(baseURL);
  await page.locator("#author-panel").waitFor({ state: "visible" });
  const before = await playerSave();
  await capture("author-play-shell");
  await page.locator("#author-toggle").click();
  await page.locator("#author-mode-badge").getByText("EDITING").waitFor();
  await page.waitForFunction(() => getComputedStyle(document.querySelector("#beta-shell")).display === "none");
  assert.equal(await page.locator("#beta-shell").isVisible(), false, "beta shell is hidden in editing");
  await capture("author-edit-shell");
  const regionCount = await page.locator("#author-region-select option").count();
  assert.ok(regionCount >= 6, `expected six campaign regions, received ${regionCount}`);
  await page.locator("#author-region-select").selectOption({ index: Math.min(1, regionCount - 1) });
  report.push({ check: "Section selection", regions: regionCount, pass: true });
  await page.locator("#author-campaign-readiness").click();
  const readiness = page.locator("#author-campaign-report");
  await readiness.waitFor({ state: "visible" });
  const readinessText = await readiness.innerText();
  assert.match(readinessText, /READY:|ERROR:/, "Campaign Readiness must give a readable current-draft report");
  report.push({ check: "Campaign Readiness current six-region draft", report: readinessText, pass: true });
  await capture("author-campaign-readiness");
  // New Asset is the stable user-facing entry point to Asset Workbench; it creates
  // only a draft asset and is covered by the player-save isolation assertion below.
  await page.locator("#author-asset-new").click();
  await page.locator("#author-asset-editor").waitFor({ state: "visible" });
  await capture("author-asset-workbench");
  await page.locator("#author-asset-exit").click();
  report.push({ check: "Asset Workbench open/close", pass: true });
  const download = page.waitForEvent("download");
  await page.locator("#author-export").click();
  const worldDownload = await download;
  assert.equal(await worldDownload.suggestedFilename(), "world.json");
  report.push({ check: "World JSON export", pass: true });
  // Author shortcuts are exercised only after edit mode; no player-save key may change.
  await page.keyboard.press("Control+z"); await page.keyboard.press("Control+y");
  report.push({ check: "Undo/redo shortcuts accepted", pass: true });
  await page.locator("#author-toggle").click();
  await page.locator("#author-mode-badge").getByText("PLAY TEST").waitFor();
  await capture("author-returned-play");
  assert.deepEqual(await playerSave(), before, "author workflow must not mutate player progress storage");
  assert.deepEqual(errors, [], "no uncaught browser errors");
  fs.writeFileSync(`${out}/author-playtest.json`, JSON.stringify({ baseURL, errors, report }, null, 2));
  console.log(JSON.stringify({ pass: true, report }, null, 2));
} catch (error) {
  await capture("author-failure").catch(() => {});
  fs.writeFileSync(`${out}/author-playtest.json`, JSON.stringify({ baseURL, errors, report, failure: error.stack }, null, 2));
  console.error(error); process.exitCode = 1;
} finally { await browser.close(); }
