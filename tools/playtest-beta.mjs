// Browser playtest: normal keyboard route first, then explicitly labeled
// diagnostic setups for boundary cases. Supply PLAYWRIGHT_MODULE if external.
import { createRequire } from "node:module";
import fs from "node:fs";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const baseURL = process.env.GAME_URL ?? "http://localhost:8080/";
const out = "dist/qa";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
const report = [];
page.on("pageerror", e => errors.push(e.stack));
const snap = () => page.evaluate(() => ({ ...window.__game.debugCounts, pos: { ...window.__game.playerController.getState().pos } }));
async function capture(name) { await page.screenshot({ path: `${out}/${name}.png` }); }
async function hold(keys, ms) { for (const key of keys) await page.keyboard.down(key); await page.waitForTimeout(ms); for (const key of keys) await page.keyboard.up(key); }
async function walkTo(target, tolerance = 0.9, maxSeconds = 16, allowCamp = false) {
  for (let i = 0; i < maxSeconds * 5; i++) {
    const s = await snap(), dx = target.x - s.pos.x, dz = target.z - s.pos.z;
    if (Math.hypot(dx, dz) <= tolerance) return;
    const keys = [];
    if (Math.abs(dx) > tolerance * .45) keys.push(dx > 0 ? "d" : "a");
    if (Math.abs(dz) > tolerance * .45) keys.push(dz > 0 ? "s" : "w");
    await hold(keys, 170);
    if (s.expedition.status !== "active" && !allowCamp) throw new Error(`Route interrupted: ${s.expedition.status}`);
  }
  throw new Error(`Cannot reach ${JSON.stringify(target)} from ${JSON.stringify((await snap()).pos)}`);
}
try {
  await page.goto(baseURL);
  await page.locator("[data-action=start]").waitFor();
  await capture("welcome-phone");
  await page.locator("[data-action=start]").click();
  await page.waitForTimeout(300);
  const campGate = await page.evaluate(() => window.__game.worldRegistry.getPortalGateById("gate_camp_frontier"));
  await walkTo({x:campGate.pos.x,z:campGate.pos.z+1.4},0.45,16,true);
  await page.locator("#contextual-action-button").waitFor({ state: "visible" });
  await page.waitForTimeout(100);
  await page.keyboard.press("e");
  await page.locator("#frontier-map-panel").getByText("Forest Edge", { exact: true }).click();
  await page.waitForTimeout(500);
  assert.equal((await snap()).currentRegion, "section_1");
  report.push({ check: "Fresh Camp to Forest Edge", proof: "keyboard movement, E, visible destination click", pass: true });
  await capture("verdant-arrival-phone");
  const resource = await page.evaluate(() => {
    const g = window.__game;
    const p = g.playerController.getState().pos;
    return g.resourceSystem.nodes.filter(n => !n._regionInactive).map(n => ({ id: n.state.id, ...n.state.position })).sort((a,b) => Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
  });
  assert.ok(resource, "a first resource is available");
  await walkTo({ x: resource.x, z: resource.z + 1.2 }, 0.55);
  await page.waitForTimeout(3300);
  const carried = (await snap()).expedition.unsecuredCargo;
  assert.ok(Object.values(carried).some(v => v > 0), "standing near resource actually harvests cargo");
  await capture("first-harvest-phone");
  report.push({ check: "First harvest", proof: "normal keyboard travel and stationary auto harvest", cargo: carried, pass: true });
  const wp = await page.evaluate(() => window.__game.worldRegistry.getAllWaypoints().find(w => w.regionId === "section_1"));
  await walkTo(wp.pos, 1.1);
  await page.waitForTimeout(200);
  await page.keyboard.press("e");
  await page.waitForTimeout(150);
  // Exact visible extract button, preserving production confirmation flow.
  const extract = page.getByRole("button", { name: "Return to Camp", exact: true });
  if (await extract.isVisible()) await extract.click();
  else throw new Error(`Extraction unavailable: ${await page.locator('body').innerText()}`);
  await page.waitForTimeout(300);
  const result = await snap();
  assert.equal(result.currentRegion, "camp");
  assert.ok(Object.values(result.frontierProgress.bankedResources).some(v => v > 0));
  await capture("first-extraction-phone");
  report.push({ check: "Harvest to Waypoint discovery and extraction", proof: "normal input; no teleport/resource injection", pass: true, banked: result.frontierProgress });
  await page.locator("#run-result-overlay button").click();
  // Boundary case setup below is intentionally diagnostic, not campaign pacing proof.
  await page.evaluate(() => {
    const g = window.__game; g.beginExpeditionFromDefaultEntry();
    const c = g.creatureSystem.getActiveAliveCreatures().find(c => c.state.visualAssetId === "asset_wildkin_mossling");
    if (!c) throw new Error("Mossling missing");
    const p = { x: c.state.pos.x, y: .55, z: c.state.pos.z + 2 };
    g.characterPhysics.setPosition(p); g.playerController.syncPosFromPhysics(); g.playerController.snapRenderPose();
    if (!g.betaGame.beginBond(c.state.id)) throw new Error("Bond could not start");
  });
  await capture("bonding-phone");
  for (let i = 0; i < 3; i++) {
    await page.waitForFunction(index => { const s = window.__game.betaGame.companions.getBondState(); return s && s.successes === index && Math.abs(s.phase - s.target) < .05; }, i);
    await page.locator(".bond-tap").click();
    await page.waitForTimeout(370);
  }
  await page.waitForTimeout(1200);
  assert.equal(await page.evaluate(() => window.__game.betaGame.companions.getPending().length), 1);
  assert.equal((await snap()).frontierProgress.securedCompanions.length, 0);
  await page.evaluate(() => window.__game.handleExtractionFlow({ id: "test_boundary" }));
  assert.ok((await snap()).frontierProgress.securedCompanions.includes("mossling"));
  report.push({ check: "Bond timing and secure boundary", proof: "diagnostic position setup; real timing UI; extraction coordinator", pass: true });
  await capture("bond-secured-phone");
  await page.reload();
  await page.locator("[data-action=start]").click();
  assert.ok((await snap()).frontierProgress.securedCompanions.includes("mossling"));
  report.push({ check: "Save reload retains companion", pass: true });
  assert.deepEqual(errors, [], "no uncaught browser errors");
  fs.writeFileSync(`${out}/browser-playtest.json`, JSON.stringify({ baseURL, errors, report }, null, 2));
  console.log(JSON.stringify({ pass: true, errors, report }, null, 2));
} catch (error) {
  await capture("failure").catch(() => {});
  fs.writeFileSync(`${out}/browser-playtest.json`, JSON.stringify({ baseURL, errors, report, failure: error.stack }, null, 2));
  console.error(error); console.error(errors);
  process.exitCode = 1;
} finally { await browser.close(); }
