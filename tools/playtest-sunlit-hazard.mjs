import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";

const pageURL = process.env.GAME_URL ?? "http://localhost:8080/";
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const out = "dist/qa"; fs.mkdirSync(out, { recursive: true });
const errors = []; page.on("pageerror", (error) => errors.push(String(error)));
async function snapshot() { return page.evaluate(() => { const g = window.__game; const p = g.playerController.getState().pos; return { status: g.expeditionSession.getStatus(), pos: { x: p.x, y: p.y, z: p.z }, cargo: g.expeditionSession.getCargo(), course: g.parkourSystem.getState() }; }); }
async function hold(key, ms) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); }
async function walk(target, tolerance = .6) { for (let i = 0; i < 100; i++) { const s = await snapshot(); if (Math.hypot(target.x - s.pos.x, target.z - s.pos.z) <= tolerance) return s; if (s.status !== "active") return s; const keys = []; if (Math.abs(target.x - s.pos.x) > .2) keys.push(target.x > s.pos.x ? "d" : "a"); if (Math.abs(target.z - s.pos.z) > .2) keys.push(target.z > s.pos.z ? "s" : "w"); for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(110); for (const k of keys) await page.keyboard.up(k); } throw Error(`Cannot reach ${JSON.stringify(target)}`); }
async function enterHazard(target) { for (let i = 0; i < 70; i++) { const s = await snapshot(); if (i > 2 && s.pos.z > -1 && s.course?.activeCourseId) return s; const keys = []; if (Math.abs(target.x - s.pos.x) > .2) keys.push(target.x > s.pos.x ? "d" : "a"); if (Math.abs(target.z - s.pos.z) > .2) keys.push(target.z > s.pos.z ? "s" : "w"); for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(100); for (const k of keys) await page.keyboard.up(k); } throw Error("Hazard did not return the player to the authored course start"); }

try {
  await page.goto(pageURL); await page.locator("[data-action=start]").click();
  const began = await page.evaluate(() => { const g = window.__game; g.frontierProgress.unlockWaypoint("wp_section_1"); g.expeditionSession.resetToCamp(); const result = g.beginExpedition("wp_section_1"); g.expeditionSession.setCargo({ wood: 2 }); return result; });
  assert.equal(began, true, "seeded Section 1 test run begins");
  await page.waitForTimeout(300);
  await walk({ x: 10, z: 1 });
  // Keyboard only: skirt the pad, then deliberately step into the visible fail bed.
  await walk({ x: 11.9, z: -3 });
  // Cross the near corner of the 3.4×1.8m bed, so the observation catches
  // the trigger edge rather than walking through the reset point.
  const after = await enterHazard({ x: 11.5, z: -5.0 });
  console.log(JSON.stringify({ observedAfterHazard: after }, null, 2));
  assert.equal(after.status, "active", "parkour hazard respawns within the active expedition");
  assert.equal(after.cargo.wood, 2, "parkour respawn preserves carried cargo");
  assert.ok(after.pos.z > -1 && after.pos.z < 2, "parkour hazard respawns at its authored start");
  assert.deepEqual(errors, []);
  const report = { pass: true, proof: "Keyboard approach around pad then deliberate visible hazard entry; active run, cargo, and start respawn preserved.", after };
  fs.writeFileSync(`${out}/sunlit-hazard.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
} catch (error) { fs.writeFileSync(`${out}/sunlit-hazard.json`, JSON.stringify({ pass: false, error: error.stack, errors }, null, 2)); console.error(error); process.exitCode = 1; }
finally { await browser.close(); }
