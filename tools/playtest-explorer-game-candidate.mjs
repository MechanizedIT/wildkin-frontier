// Isolated real-game preview for the staged Explorer GLB.  The routes below
// replace neither shipped world data nor assets; remove this helper to remove
// the preview entirely.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.env.GAME_URL ?? "http://localhost:8080/";
const modelPath = process.env.MODEL_PATH ?? ".dream-loop/workflow-proof/rigging/explorer-20k-v9/model.glb";
const modelBytes = await readFile(modelPath);
const output = process.env.OUTPUT_DIR ?? ".dream-loop/workflow-proof/rigging/explorer-20k-v9/actual-game-review";
await mkdir(output, { recursive: true });
const videoDir = path.join(output, "video"); await mkdir(videoDir, { recursive: true });

const descriptor = {
  id: "player_explorer",
  model: { path: "assets/models/explorer-candidate/model.glb", scale: 1, pivot: { x: 0, y: -.52, z: 0 },
    clips: { idle: "Idle", walk: "Walk", run: "Run", sneak: "Sneak", jump: "Jump", fall: "Fall", dodge: "Dodge", climb: "Climb", mantle: "Mantle", attack: "Attack", hurt: "Hurt" },
    locomotion: { sneak: 1.6, walk: 3.3, run: 6 } },
  // Fitted after the actual-game camera pass; this is local to RightHand.
  handAnchor: { bone: "RightHand", position: { x: -.012, y: -.018, z: .035 }, rotation: { x: .18, y: -.18, z: -.35 } },
};
const candidateModule = `
import ORIGINAL, { WORLD_DATA as ORIGINAL_WORLD_DATA } from "./world.generated.js";
const WORLD_DATA = structuredClone(ORIGINAL_WORLD_DATA);
WORLD_DATA.playerVisual = ${JSON.stringify(descriptor)};
export { WORLD_DATA }; export default WORLD_DATA; export { WORLD_DATA as defaultData };
`;
const views = [{ id: "phone", viewport: { width: 844, height: 390 } }, { id: "desktop", viewport: { width: 1280, height: 720 } }];
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL ?? "msedge" });
const report = { candidate: { modelPath, descriptor, isolated: true }, views: {}, errors: [] };

async function wire(page) {
  await page.route("**/src/world/data/world.js*", route => route.fulfill({ contentType: "text/javascript", body: candidateModule }));
  await page.route("**/assets/models/explorer-candidate/model.glb", route => route.fulfill({ contentType: "model/gltf-binary", body: modelBytes }));
}
async function inspect(page) {
  return page.evaluate(() => {
    const g = window.__game, adapter = g.player.userData.externalPlayerModel, model = adapter?.model;
    const hand = adapter?.handBone, tool = g.fieldTool;
    const head = new g.THREE.Vector3(); tool?.head?.getWorldPosition(head);
    const player = new g.THREE.Vector3(); g.player.getWorldPosition(player);
    return { hasExternalPlayer: !!adapter, modelPath: model?.userData?.externalModelPath, active: model?.userData?.modelAnimationController?.activeState,
      clips: model?.userData?.modelAnimationClips?.map(clip => clip.name) ?? [], hand: hand ? { name: hand.name, world: hand.getWorldPosition(new g.THREE.Vector3()).toArray() } : null,
      tool: tool ? { attachedToHand: tool.handAnchor.parent === hand, headLocal: head.sub(player).toArray(), swinging: tool.isSwinging, profile: tool.activeProfile } : null,
      state: g.playerController.getState(), errors: [] };
  });
}
async function capture(page, file) { await page.screenshot({ path: path.join(output, file) }); }
async function framePlayer(page) {
  await page.evaluate(() => {
    const g = window.__game, p = g.playerController.getState().pos;
    // Presentation-only evidence framing: simulation and physics retain their
    // ordinary position and heading throughout the input pass.
    const frame = () => {
      const q = g.playerController.getState().pos;
      g.camera.position.set(q.x + 1.35, q.y + 1.05, q.z + 1.35);
      g.camera.lookAt(q.x, q.y + .56, q.z);
      g.camera.fov = 38; g.camera.updateProjectionMatrix();
    };
    g.cameraFollow.update = frame;
    frame();
  });
}

try {
  for (const view of views) {
    const context = await browser.newContext({ viewport: view.viewport, isMobile: view.id === "phone", hasTouch: view.id === "phone", recordVideo: { dir: videoDir, size: view.viewport } });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await wire(page);
    try {
      await page.goto(base, { waitUntil: "networkidle" });
      await page.locator('[data-action="start"]').click();
      await page.waitForFunction(() => !!window.__game?.player?.userData?.externalPlayerModel, { timeout: 30000 });
      await page.evaluate(() => window.__game.beginExpeditionFromDefaultEntry());
      await page.waitForTimeout(350);
      const initial = await inspect(page); await capture(page, `${view.id}-idle.png`);
      for (const [label, keys] of [["walk", ["KeyW"]], ["run", ["KeyW", "ShiftLeft"]], ["sneak", ["KeyW", "KeyC"]]]) {
        for (const key of keys) await page.keyboard.down(key);
        await page.waitForTimeout(500); await capture(page, `${view.id}-${label}.png`);
        for (const key of keys.reverse()) await page.keyboard.up(key);
        await page.waitForTimeout(120);
      }
      await page.keyboard.press("KeyF"); await page.waitForTimeout(170);
      const attack = await inspect(page); await framePlayer(page); await capture(page, `${view.id}-attack-tool.png`);
      await page.waitForTimeout(650); const afterAttack = await inspect(page);
      await page.keyboard.press("Space"); await page.waitForTimeout(100); await capture(page, `${view.id}-jump.png`);
      // These snapshots verify every imported clip can be selected.  They are
      // diagnostic-only; only movement/attack/jump above use ordinary input.
      const diagnostics = await page.evaluate(() => {
        const controller = window.__game.player.userData.externalPlayerModel.model.userData.modelAnimationController;
        const states = ["idle", "walk", "run", "sneak", "jump", "fall", "dodge", "climb", "mantle", "attack", "hurt"];
        return states.map(state => { controller.play(state, { restart: true }); return { state, selected: controller.activeState }; });
      });
      await page.waitForTimeout(100); await capture(page, `${view.id}-diagnostic-hurt.png`);
      assert.equal(initial.hasExternalPlayer, true, "candidate external player did not instantiate");
      assert.equal(initial.modelPath, descriptor.model.path, "candidate path did not load");
      assert.equal(initial.tool.attachedToHand, true, "field tool did not parent to RightHand");
      assert.equal(attack.tool.profile, "combat", "F did not begin actual combat tool swing");
      assert.equal(attack.active, "attack", "Attack clip was cancelled by locomotion sync");
      assert.ok(afterAttack.tool.headLocal[2] > -1.2, "tool head became implausibly displaced");
      assert.ok(diagnostics.every(item => item.state === item.selected), "one or more diagnostic clips could not select");
      assert.equal(errors.length, 0, errors.join("\n"));
      report.views[view.id] = { viewport: `${view.viewport.width}x${view.viewport.height}`, initial, attack, afterAttack, diagnostics,
        frames: ["idle", "walk", "run", "sneak", "attack-tool", "jump", "diagnostic-hurt"].map(name => `${view.id}-${name}.png`) };
    } catch (error) { report.errors.push(`${view.id}: ${error.stack ?? error.message}`); await capture(page, `${view.id}-failure.png`).catch(() => {}); }
    finally {
      const video = page.video(); await page.close();
      if (video) { const source = await video.path(); const destination = path.join(videoDir, `${view.id}.webm`); await copyFile(source, destination); report.views[view.id] ??= {}; report.views[view.id].video = path.relative(output, destination).replaceAll("\\", "/"); }
      await context.close();
    }
  }
  report.pass = report.errors.length === 0;
  await writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 1;
} finally { await browser.close(); }
