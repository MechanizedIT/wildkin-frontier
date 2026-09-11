// Sunlit traversal acceptance: keyboard routes only after explicit QA unlock seeding.
// It records actual frame positions so a failed course, terrain mismatch, or portal input
// can be diagnosed from dist/qa/sunlit-traversal.json and the screenshots.
import { createRequire } from "node:module";
import fs from "node:fs";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const baseURL = process.env.GAME_URL ?? "http://localhost:8080/";
const out = "dist/qa";
const requestedSection = Math.max(0, Math.floor(Number(process.env.SUNLIT_SECTION) || 0));
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL ?? "msedge" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
const report = { baseURL, seededSetup: [], checks: [], frames: [], errors };
page.on("pageerror", (error) => errors.push(error.stack ?? String(error)));
function writeReport() { fs.writeFileSync(`${out}/sunlit-traversal.json`, JSON.stringify(report, null, 2)); }

async function capture(name) { await page.screenshot({ path: `${out}/${name}.png` }); }
async function hold(keys, ms) {
  for (const key of keys) await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  for (const key of keys) await page.keyboard.up(key);
}
async function state() {
  return page.evaluate(() => {
    const g = window.__game;
    const player = g.playerController.getState();
    const shadow = g.playerProjectedShadow?.mesh;
    return {
      region: g.regionManager.getCurrentRegionId(),
      status: g.expeditionSession.getStatus(),
      pos: { x: player.pos.x, y: player.pos.y, z: player.pos.z },
      mode: player.mode,
      shadow: shadow ? { visible: shadow.visible, y: shadow.position.y, opacity: shadow.material.opacity } : null,
      terrain: g.playground.getGroundHeight(player.pos.x, player.pos.z, player.pos.y),
      course: g.parkourSystem.getState?.(),
    };
  });
}
function record(label, snapshot) {
  report.frames.push({ label, ...snapshot });
  assert.equal(snapshot.shadow?.visible, true, `${label}: player shadow hidden`);
  const feetY = snapshot.pos.y - 0.52;
  assert.ok(Math.abs(feetY - (snapshot.shadow.y - 0.012)) < 0.09, `${label}: shadow support mismatch`);
  writeReport();
}
async function walkTo(target, label, tolerance = 1.2, maxSeconds = 16, allowCamp = false) {
  const beganAt = Date.now();
  const initial = await state();
  // This is a physical input replay, so its budget is wall-clock time rather
  // than an assumed number of 130ms key bursts. The player-facing walk speed
  // was intentionally reduced; a long authored leg must not be mistaken for
  // an obstruction merely because the old loop lasted only 10.4 seconds.
  const initialDistance = Math.hypot(target.x - initial.pos.x, target.z - initial.pos.z);
  const conservativeSpeed = Math.max(1.6, initial.speed || 0);
  const budgetMs = Math.ceil(Math.max(maxSeconds, initialDistance / conservativeSpeed + 4) * 1000);
  let bestDistance = initialDistance;
  let lastProgressAt = beganAt;
  while (Date.now() - beganAt < budgetMs) {
    const current = await state();
    if (current.status !== "active" && !(allowCamp && current.status === "camp")) throw new Error(`${label}: expedition interrupted (${current.status})`);
    const dx = target.x - current.pos.x;
    const dz = target.z - current.pos.z;
    const distance = Math.hypot(dx, dz);
    if (distance < bestDistance - 0.05) {
      bestDistance = distance;
      lastProgressAt = Date.now();
    }
    if (distance <= tolerance) {
      record(label, current);
      return current;
    }
    const keys = [];
    if (Math.abs(dx) > tolerance * 0.4) keys.push(dx > 0 ? "d" : "a");
    if (Math.abs(dz) > tolerance * 0.4) keys.push(dz > 0 ? "s" : "w");
    await hold(keys, 130);
  }
  const final = await state();
  report.routeFailure = {
    label, target, final: final.pos, elapsedMs: Date.now() - beganAt, budgetMs,
    initialDistance, bestDistance, stalledForMs: Date.now() - lastProgressAt,
  };
  writeReport();
  throw new Error(`${label}: cannot reach ${JSON.stringify(target)} from ${JSON.stringify(final.pos)} after ${report.routeFailure.elapsedMs}ms (best remaining ${bestDistance.toFixed(2)}m)`);
}

async function walkToOrLaunch(target, label, tolerance = 1.2, maxSeconds = 16) {
  for (let step = 0; step < maxSeconds * 5; step++) {
    const current = await state();
    if (current.mode === "JUMP") return current;
    if (current.status !== "active") throw new Error(`${label}: expedition interrupted (${current.status})`);
    const dx = target.x - current.pos.x;
    const dz = target.z - current.pos.z;
    if (Math.hypot(dx, dz) <= tolerance) return current;
    const keys = [];
    if (Math.abs(dx) > tolerance * 0.4) keys.push(dx > 0 ? "d" : "a");
    if (Math.abs(dz) > tolerance * 0.4) keys.push(dz > 0 ? "s" : "w");
    await hold(keys, 130);
    const after = await state();
    if (after.mode === "JUMP") return after;
  }
  throw new Error(`${label}: cannot reach ${JSON.stringify(target)} from ${JSON.stringify((await state()).pos)}`);
}

async function walkRoutes(region) {
  // Graded course spines shape the floor for a launch lane; the dedicated
  // parkour check below is the player-facing traversal proof for them.
  const routes = (region.surface?.routes ?? []).filter((route) => route.elevation === undefined);
  const main = routes[0];
  if (main) {
    for (let index = 0; index < main.points.length; index++) await walkTo(main.points[index], `${region.id}/${main.id}/${index}`);
    report.checks.push({ check: `${region.displayName} ${main.id}`, proof: "keyboard walked every authored route point", pass: true });
    writeReport();
  }
  // Each branch is approached and returned along its authored connection to the main path.
  // This avoids a false diagonal shortcut through props, water, or terrain between routes.
  for (const route of routes.slice(1)) {
    let connection = 0;
    for (let i = 1; i < (main?.points.length ?? 0); i++) {
      const best = main.points[connection];
      const current = main.points[i];
      if (Math.hypot(current.x - route.points[0].x, current.z - route.points[0].z) < Math.hypot(best.x - route.points[0].x, best.z - route.points[0].z)) connection = i;
    }
    for (let index = (main?.points.length ?? 0) - 2; index >= connection; index--) await walkTo(main.points[index], `${region.id}/${main.id}/return-${index}`);
    for (let index = 0; index < route.points.length; index++) await walkTo(route.points[index], `${region.id}/${route.id}/${index}`);
    for (let index = route.points.length - 2; index >= 0; index--) await walkTo(route.points[index], `${region.id}/${route.id}/return-${index}`);
    for (let index = connection + 1; index < (main?.points.length ?? 0); index++) await walkTo(main.points[index], `${region.id}/${main.id}/resume-${index}`);
    report.checks.push({ check: `${region.displayName} ${route.id}`, proof: "keyboard walked branch and returned through its authored main-path connection", pass: true });
    writeReport();
  }
  const waypoint = region.majorWaypoints?.[0];
  if (waypoint) {
    // Waypoints may deliberately occupy a branch terminus. The branch walk
    // already reached it on foot; don't test an invented direct shortcut from
    // the far end of the main route after returning from that spur.
    const visited = report.frames.some((frame) => frame.region === region.id
      && Math.hypot(frame.pos.x - waypoint.pos.x, frame.pos.z - waypoint.pos.z) <= 1.2);
    if (!visited) await walkTo(waypoint.pos, `${region.id}/major-waypoint:${waypoint.id}`);
    report.checks.push({
      check: `${region.displayName} named waypoint`,
      id: waypoint.id,
      proof: visited ? "keyboard reached the waypoint at its authored route terminus" : "keyboard reached current authored waypoint position",
      pass: true,
    });
    writeReport();
  }
}

async function runParkourCourse(region) {
  const start = region.parkourStarts?.[0];
  const end = region.parkourEnds?.[0];
  const pad = region.jumpPads?.[0];
  if (!start || !end || !pad) return;

  // The intentional fail bed spans the flight corridor below the pad. Return
  // to the nearby ordinary main route first, then approach the start from its
  // safe side; never fake this with a position set.
  const beforeStart = await state();
  if (beforeStart.pos.z < -4) {
    const mainPoints = (region.surface?.routes ?? [])
      .filter((route) => route.elevation === undefined)
      .flatMap((route) => route.points ?? []);
    const safeApproach = mainPoints.reduce((best, point) => (!best || Math.abs(point.z - start.pos.z) < Math.abs(best.z - start.pos.z) ? point : best), null);
    if (safeApproach) await walkTo(safeApproach, `${region.id}-course-main-return`, 0.9);
  }
  await walkTo(start.pos, `${region.id}-parkour-start`, 0.75);
  // The authored pads face down -Z. Approach from their rear with normal
  // keyboard movement, then let the pad's configured impulse do the crossing.
  // Stop outside the trigger, then cross it in short real keyboard bursts.
  // A successful crossing can pass the target in one physics step, so this
  // checks the actual launch state rather than demanding a static midpoint.
  let apex = await walkToOrLaunch({ x: pad.pos.x, z: pad.pos.z + 1.75 }, `${region.id}-pad-approach`, 0.6);
  for (let attempt = 0; attempt < 8 && apex.mode !== "JUMP"; attempt++) {
    await hold(["w"], 90);
    await page.waitForTimeout(45);
    apex = await state();
  }
  assert.equal(apex.mode, "JUMP", `${region.id}: jump pad launches from keyboard input`);
  assert.ok(apex.pos.y - apex.shadow.y > 0.5, `${region.id}: apex shadow projects below player`);
  assert.ok(apex.shadow.opacity < 0.3, `${region.id}: apex shadow fades while airborne`);
  report.frames.push({ label: `${region.id}-pad-apex`, ...apex });
  await page.waitForTimeout(900);
  const landing = await state();
  assert.ok(landing.pos.z < pad.pos.z - 2.5, `${region.id}: pad clears its authored crossing`);
  assert.ok(landing.course?.latestCheckpoint, `${region.id}: landing activates checkpoint`);
  await walkTo(end.pos, `${region.id}-parkour-finish`, 0.9);
  report.checks.push({
    check: `${region.displayName} parkour`,
    proof: "keyboard start → pad → safe landing/checkpoint → finish",
    pass: true,
  });
  await capture(`sunlit-${region.id}-parkour`);
  writeReport();
}

async function usePortal(gate) {
  const approach = { x: gate.pos.x, z: gate.pos.z + (gate.pos.z < 0 ? 1.05 : -1.05) };
  await walkTo(approach, `portal-approach:${gate.id}`, 0.7);
  await page.keyboard.press("e");
  await page.waitForTimeout(420);
  const after = await state();
  assert.equal(after.region, gate.targetSectionId, `${gate.id}: E did not transition through active portal`);
  record(`portal-arrival:${gate.id}`, after);
  report.checks.push({ check: `Portal ${gate.id}`, proof: "keyboard approach + E travel", pass: true, arrived: after.region });
  writeReport();
}

try {
  await page.goto(baseURL);
  await page.locator("[data-action=start]").click();
  if (requestedSection === 0) {
    // The default full sweep begins with a player-facing Camp departure.
    const campGate = await page.evaluate(() => window.__game.worldRegistry.getPortalGateById("gate_camp_frontier"));
    await walkTo({ x: campGate.pos.x, z: campGate.pos.z + 1.4 }, "camp-frontier-gate", 0.45, 16, true);
    await page.locator("#contextual-action-button").waitFor({ state: "visible" });
    await page.waitForTimeout(100);
    await page.keyboard.press("e");
    await page.locator("#frontier-map-panel").getByText("Forest Edge", { exact: true }).click();
    await page.waitForTimeout(450);
    assert.equal((await state()).region, "section_1");
    report.checks.push({ check: "Fresh Camp to Forest Edge", proof: "keyboard to gate, E, visible map selection", pass: true });
  }

  // Explicit test fixture only: unlock gates/waypoints and grant invulnerability so later
  // route coverage measures traversal rather than campaign economy/combat progression.
  await page.evaluate(() => {
    const g = window.__game;
    for (const region of g.worldRegistry.getAllRegions().filter((r) => r.id.startsWith("section_"))) {
      for (const waypoint of region.majorWaypoints ?? []) g.frontierProgress.unlockWaypoint(waypoint.id);
      for (const gate of region.portalGates ?? []) if (gate.targetSectionId) g.frontierProgress.repairPortalGate(gate.id);
    }
    g.playerCombat.grantInvulnerability?.(600);
    g.playerController.setMoveSpeedMultiplier?.(1.5);
  });
  report.seededSetup.push("QA-only: unlocked authored waypoints and repaired portal gates; granted temporary invulnerability and 1.5× grounded QA speed. No player position teleports are used.");

  const allRegions = await page.evaluate(() => window.__game.worldRegistry.getAllRegions()
    .filter((region) => region.id.startsWith("section_"))
    .map((region) => ({
      id: region.id, displayName: region.displayName, surface: region.surface,
      parkourStarts: region.parkourStarts, parkourEnds: region.parkourEnds, jumpPads: region.jumpPads,
      portalGates: region.portalGates, majorWaypoints: region.majorWaypoints,
    })));
  let regions = allRegions;
  if (requestedSection > 0) {
    // Explicit seeded start only for a bounded region route run. Movement from
    // the entry through every route point remains physical keyboard input.
    await page.evaluate((section) => {
      window.__game.resetTransientWorldToCamp();
      window.__game.expeditionSession.resetToCamp();
      window.__game.frontierProgress.unlockWaypoint(`wp_section_${section}`);
    }, requestedSection);
    await page.waitForTimeout(120);
    const seededBegin = await page.evaluate((section) => window.__game.beginExpedition(`wp_section_${section}`), requestedSection);
    assert.equal(seededBegin, true, "seeded waypoint begin accepted");
    await page.waitForTimeout(260);
    assert.equal((await state()).region, `section_${requestedSection}`, "seeded waypoint start arrived");
    report.seededSetup.push(`QA-only seeded waypoint start: section_${requestedSection}.`);
    regions = allRegions.filter((region) => region.id === `section_${requestedSection}`);
  }

  for (let index = 0; index < regions.length; index++) {
    const region = regions[index];
    assert.equal((await state()).region, region.id, `expected active ${region.id}`);
    await walkRoutes(region);

    await runParkourCourse(region);

    const sectionNumber = Number(region.id.replace("section_", ""));
    const outbound = requestedSection === 0 && region.portalGates?.find((gate) => gate.targetSectionId === `section_${sectionNumber + 1}`);
    if (outbound) await usePortal(outbound);
  }

  if (requestedSection === 0) {
    // Author mode must suppress the gameplay-facing world marker rather than leave it over editor content.
    await page.goto(`${baseURL}?author=1`);
    await page.locator("#author-panel").waitFor({ state: "visible" });
    await page.locator("#author-toggle").click();
    await page.waitForTimeout(220);
    const author = await page.evaluate(() => ({
      author: document.getElementById("app")?.classList.contains("author-mode"),
      shadow: window.__game.playerProjectedShadow?.mesh?.visible,
      active: window.__game.expeditionSession.isActive(),
    }));
    assert.equal(author.author, true, "Author URL enables author mode");
    assert.equal(author.shadow, false, "Author mode hides gameplay player shadow");
    report.checks.push({ check: "Author isolation", proof: "author mode hides runtime player shadow", pass: true });
  }
  assert.deepEqual(errors, [], "no browser exceptions");
  console.log(JSON.stringify({ pass: true, checks: report.checks.length, frames: report.frames.length }, null, 2));
} catch (error) {
  report.failure = error.stack ?? String(error);
  await capture("sunlit-traversal-failure").catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally {
  writeReport();
  await browser.close();
}
