// Isolated actual-game review for a staged Mossling GLB. It intercepts the
// world module and model request in Playwright; no shipped data or asset file is
// replaced. The creature remains the live Section 1 AI at its ordinary roam
// speed (2.8 * 0.35 = 0.98 m/s).
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.env.GAME_URL ?? "http://localhost:8080/";
const modelPath = process.env.MODEL_PATH ?? ".dream-loop/workflow-proof/rigging/mossling-20k-v7/model.glb";
const modelBytes = await readFile(modelPath);
const output = process.env.OUTPUT_DIR ?? ".dream-loop/workflow-proof/rigging/mossling-20k-v7/actual-game-review";
const videoDir = path.join(output, "video");
await mkdir(videoDir, { recursive: true });

const candidateModule = `
import ORIGINAL, { WORLD_DATA as ORIGINAL_WORLD_DATA } from "./world.generated.js";
const WORLD_DATA = structuredClone(ORIGINAL_WORLD_DATA);
const mossling = WORLD_DATA.visualAssets.find((asset) => asset.id === "asset_wildkin_mossling");
if (!mossling) throw new Error("Mossling asset missing from candidate world");
mossling.parts = [];
mossling.model = { path: "assets/models/mossling-candidate-review/model.glb", scale: 1, pivot: { x: 0, y: 0, z: 0 }, clips: { idle: "Idle", walk: "Walk", run: "Run", attack: "Attack", hurt: "Hurt" }, locomotion: { walk: 0.98, run: 4.0 } };
export { WORLD_DATA };
export default WORLD_DATA;
export { WORLD_DATA as defaultData };
`;

const views = [
  { id: "phone-side", viewport: { width: 844, height: 390 }, yaw: Math.PI / 2 },
  { id: "phone-three-quarter", viewport: { width: 844, height: 390 }, yaw: Math.PI / 4 },
  { id: "large-side", viewport: { width: 1280, height: 720 }, yaw: Math.PI / 2 },
  { id: "large-three-quarter", viewport: { width: 1280, height: 720 }, yaw: Math.PI / 4 },
];
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL ?? "msedge" });
const report = { candidate: { modelPath, injectedAssetId: "asset_wildkin_mossling", modelUrl: "assets/models/mossling-candidate-review/model.glb" }, roamSpeedMps: 0.98, views: {}, errors: [], note: "Candidate-only interception: production world data and assets were not written." };

async function wireCandidate(page) {
  await page.route("**/src/world/data/world.js*", (route) => route.fulfill({ contentType: "text/javascript", body: candidateModule }));
  await page.route("**/assets/models/mossling-candidate-review/model.glb", (route) => route.fulfill({ contentType: "model/gltf-binary", body: modelBytes }));
}

async function inspect(page, creatureId) {
  return page.evaluate((wantedId) => {
    const g = window.__game;
    const allCreatureIds = g.creatureSystem.getCreatures().map((entry) => entry.state.id);
    const creature = g.creatureSystem.getCreatures().find((entry) => entry.state.id === wantedId);
    const visual = creature?.group?.children.find((child) => child.userData?.externalModelInstance);
    const mesh = visual?.getObjectByProperty("isMesh", true);
    const companion = g.scene.getObjectByName("companion_mossling");
    return {
      creature: creature && { id: creature.state.id, aiState: creature.state.aiState, position: creature.state.pos.toArray(), groupPosition: creature.group.position.toArray(), groupScale: creature.group.scale.toArray() },
      allCreatureIds,
      externalModel: !!visual,
      animation: visual?.userData?.modelAnimationController?.activeState ?? null,
      animationTimeScale: visual?.userData?.modelAnimationController?.active?.getEffectiveTimeScale?.() ?? null,
      material: mesh?.material?.type ?? null,
      textureColorSpace: mesh?.material?.map?.colorSpace ?? null,
      companionExternalModel: !!companion?.userData?.externalModelInstance,
      sampledAtMs: performance.now(),
      renderer: { calls: g.renderer.info.render.calls, triangles: g.renderer.info.render.triangles, geometries: g.renderer.info.memory.geometries, textures: g.renderer.info.memory.textures },
    };
  }, creatureId);
}

async function frameCreature(page, creatureId, yaw) {
  await page.evaluate(({ wantedId, yaw: viewYaw }) => {
    const g = window.__game;
    const creature = g.creatureSystem.getCreatures().find((entry) => entry.state.id === wantedId);
    if (!creature) throw new Error(`missing review creature ${wantedId}`);
    // Freeze only the presentation follow camera for this evidence frame. The
    // player physics, creature AI, terrain, and world state keep running.
    g.cameraFollow.update = () => {};
    const focus = creature.group.position;
    const distance = 3.8;
    g.camera.position.set(focus.x + Math.sin(viewYaw) * distance, focus.y + 2.7, focus.z + Math.cos(viewYaw) * distance);
    g.camera.lookAt(focus.x, focus.y + 0.45, focus.z);
  }, { wantedId: creatureId, yaw });
}

try {
  for (const view of views) {
    const context = await browser.newContext({ viewport: view.viewport, isMobile: view.id.startsWith("phone"), hasTouch: view.id.startsWith("phone"), recordVideo: { dir: videoDir, size: view.viewport } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await wireCandidate(page);
    try {
      await page.goto(base, { waitUntil: "networkidle" });
      await page.locator('[data-action="start"]').click();
      await page.waitForFunction(() => !!window.__game?.creatureSystem, { timeout: 30000 });
      const setup = await page.evaluate(({ yaw }) => {
        const g = window.__game;
        g.beginExpeditionFromDefaultEntry();
        const creatures = g.creatureSystem.getActiveAliveCreatures().filter((entry) => entry.state.visualAssetId === "asset_wildkin_mossling");
        const creature = creatures.find((entry) => entry.state.id === "wildkin_mossling_1") ?? creatures[0];
        const scaledCreature = creatures.find((entry) => entry !== creature && Math.abs(entry.creatureScale - 0.9) < 0.01);
        if (!creature || !scaledCreature) throw new Error("full-scale or 0.9-scale active Mossling missing");
        // The live SKITTISH behavior stays in ROAM for the review: the player
        // camera focus is nearby, but outside its zeroed diagnostic notice.
        creature.state.noticeRadius = 0;
        creature.state.personalSpaceRadius = 0;
        creature.state.aiTimer = -100;
        creature.state.facing = 0;
        const player = { x: creature.state.pos.x, y: creature.state.pos.y, z: creature.state.pos.z + 1.35 };
        g.characterPhysics.setPosition(player);
        g.playerController.syncPosFromPhysics();
        g.playerController.snapRenderPose();
        g.cameraFollow.orbitBy(yaw);
        g.cameraFollow.snap();
        return { roamId: creature.state.id, scaledId: scaledCreature.state.id, start: creature.state.pos.toArray(), configuredRoamSpeed: creature.state.cfg.moveSpeed * 0.35 };
      }, view);
      await page.waitForTimeout(250);
      const before = await inspect(page, setup.roamId);
      await frameCreature(page, setup.roamId, view.yaw);
      await page.screenshot({ path: path.join(output, `${view.id}-roam-start.png`) });
      await page.waitForTimeout(1200);
      await frameCreature(page, setup.roamId, view.yaw);
      await page.screenshot({ path: path.join(output, `${view.id}-roam-mid.png`) });
      await page.waitForTimeout(1200);
      await frameCreature(page, setup.roamId, view.yaw);
      await page.screenshot({ path: path.join(output, `${view.id}-roam-end.png`) });
      const after = await inspect(page, setup.roamId);
      assert.ok(after.creature, `review Mossling disappeared: ${JSON.stringify({ setup, after })}`);
      const dx = after.creature.position[0] - setup.start[0], dz = after.creature.position[2] - setup.start[2];
      const roamElapsedSeconds = (after.sampledAtMs - before.sampledAtMs) / 1000;
      const speed = Math.hypot(dx, dz) / roamElapsedSeconds;
      await page.evaluate((scaledId) => {
        const g = window.__game;
        const creature = g.creatureSystem.getActiveAliveCreatures().find((entry) => entry.state.id === scaledId);
        creature.state.noticeRadius = 7;
        creature.state.personalSpaceRadius = 2;
        creature.state.fleeTime = 0;
        creature.state.aiTimer = 0;
        const player = { x: creature.state.pos.x, y: creature.state.pos.y, z: creature.state.pos.z + 0.55 };
        g.characterPhysics.setPosition(player);
        g.playerController.syncPosFromPhysics();
        g.playerController.snapRenderPose();
        g.cameraFollow.snap();
      }, setup.scaledId);
      await page.waitForTimeout(300);
      const fleeBefore = await inspect(page, setup.scaledId);
      await frameCreature(page, setup.scaledId, view.yaw);
      await page.screenshot({ path: path.join(output, `${view.id}-flee-start.png`) });
      await page.waitForTimeout(1200);
      const fleeAfter = await inspect(page, setup.scaledId);
      await frameCreature(page, setup.scaledId, view.yaw);
      await page.screenshot({ path: path.join(output, `${view.id}-flee-end.png`) });
      // Attach a real companion after its potential combat target has finished
      // fleeing so companion AI cannot disturb the independent flee sample.
      await page.evaluate(() => window.__game.frontierProgress.secureCompanions(["mossling"], "actual-game-candidate-preview"));
      await page.waitForTimeout(100);
      const companionAfter = await inspect(page, setup.roamId);
      await frameCreature(page, setup.roamId, view.yaw);
      await page.screenshot({ path: path.join(output, `${view.id}-companion.png`) });
      assert.equal(before.externalModel, true, "actual Mossling did not use the injected external model");
      assert.equal(before.material, "MeshLambertMaterial", "actual model material was not matte Lambert");
      assert.equal(before.creature.aiState, "ROAM", "ordinary Mossling review did not remain in ROAM");
      assert.equal(before.animation, "walk", "ordinary Mossling ROAM did not play Walk");
      assert.equal(fleeBefore.creature.aiState, "FLEE", "0.9-scale Mossling did not enter FLEE");
      assert.ok([fleeBefore.animation, fleeAfter.animation].includes("run"), "0.9-scale Mossling FLEE never played Run");
      assert.ok(companionAfter.companionExternalModel, "secured Mossling companion did not use the same external model source");
      assert.equal(errors.length, 0, errors.join("\n"));
      const fleeDx = fleeAfter.creature.position[0] - fleeBefore.creature.position[0], fleeDz = fleeAfter.creature.position[2] - fleeBefore.creature.position[2];
      const fleeElapsedSeconds = (fleeAfter.sampledAtMs - fleeBefore.sampledAtMs) / 1000;
      report.views[view.id] = { viewport: `${view.viewport.width}x${view.viewport.height}`, yaw: view.yaw, setup, roam: { before, after, elapsedSeconds: roamElapsedSeconds, measuredSpeedMps: speed }, scaledFlee: { before: fleeBefore, after: fleeAfter, elapsedSeconds: fleeElapsedSeconds, measuredSpeedMps: Math.hypot(fleeDx, fleeDz) / fleeElapsedSeconds }, companion: companionAfter, frames: [`${view.id}-roam-start.png`, `${view.id}-roam-mid.png`, `${view.id}-roam-end.png`, `${view.id}-flee-start.png`, `${view.id}-flee-end.png`, `${view.id}-companion.png`] };
    } catch (error) {
      report.errors.push(`${view.id}: ${error.stack ?? error.message}`);
      await page.screenshot({ path: path.join(output, `${view.id}-failure.png`) }).catch(() => {});
    } finally {
      const video = page.video();
      await page.close();
      if (video) {
        const videoPath = await video.path();
        const target = path.join(videoDir, `${view.id}.webm`);
        await copyFile(videoPath, target);
        report.views[view.id] ??= {};
        report.views[view.id].video = path.relative(output, target).replaceAll("\\", "/");
      }
      await context.close();
    }
  }
  report.pass = report.errors.length === 0;
  await writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 1;
} finally {
  await browser.close();
}
