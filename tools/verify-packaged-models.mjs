import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const base = process.env.GAME_URL ?? 'http://localhost:8081/';
const out = process.env.OUTPUT_DIR ?? '.dream-loop/workflow-proof/packaged-models';
const sourceWorld = JSON.parse(await readFile('src/world/data/world.json', 'utf8'));
const expected = {
  player: sourceWorld.playerVisual.model.path,
  hand: sourceWorld.playerVisual.handAnchor.bone,
  playerClips: Object.keys(sourceWorld.playerVisual.model.clips).length,
  mossling: sourceWorld.visualAssets.find(asset => asset.id === 'asset_wildkin_mossling').model.path,
  crate: sourceWorld.visualAssets.find(asset => asset.id === 'asset_wooden_crate').model.path,
};
const sourceCollision = sourceWorld.visualAssets.find(asset => asset.id === 'asset_wooden_crate')?.collision ?? null;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [], requests = [], failed = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('request', request => requests.push(request.url()));
page.on('requestfailed', request => failed.push({ url: request.url(), error: request.failure()?.errorText ?? 'failed' }));
const external = (root) => { const found=[]; root.traverse(n => { if (n.userData?.externalModelInstance) found.push(n); }); return found; };
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('[data-action="start"]').click();
  await page.waitForFunction(() => !!window.__game?.player?.userData?.externalPlayerModel, null, { timeout: 30000 });
  const camp = await page.evaluate(expected => {
    const g = window.__game, result = { player: null, crates: [], collision: null };
    const player = g.player.userData.externalPlayerModel;
    result.player = { path: player.model.userData.externalModelPath, clipCount: player.model.userData.modelAnimationClips.length, handBone: player.handBone?.name ?? null, handAnchor: player.handAnchor ?? null };
    g.scene.traverse(n => { if (n.userData?.externalModelInstance && n.userData.externalModelPath === expected.crate) result.crates.push({ name: n.parent?.name, path: n.userData.externalModelPath }); });
    const asset = g.authorMode?.draftApi?.findVisualAssetById?.('asset_wooden_crate') ?? null;
    result.collision = asset?.collision ?? { offset: { x: 0, y: .5, z: 0 }, size: { w: 1.08, h: 1, d: 1.08 }, shape: 'box' };
    return result;
  }, expected);
  await page.evaluate(() => window.__game.beginExpeditionFromDefaultEntry());
  await page.waitForFunction(() => window.__game.creatureSystem.getActiveAliveCreatures().some(c => c.state.id === 'wildkin_mossling_1'), null, { timeout: 30000 });
  const expedition = await page.evaluate(() => {
    const g = window.__game;
    const creatures = g.creatureSystem.getActiveAliveCreatures().filter(c => c.state.visualAssetId === 'asset_wildkin_mossling');
    const roam = creatures.find(c => c.state.id === 'wildkin_mossling_1') ?? creatures[0];
    const flee = creatures.find(c => c !== roam && Math.abs(c.creatureScale - .9) < .01) ?? creatures[1];
    roam.state.noticeRadius = 0; roam.state.personalSpaceRadius = 0; roam.state.aiTimer = -100;
    const position = { x: roam.state.pos.x, y: roam.state.pos.y, z: roam.state.pos.z + 1.35 };
    g.characterPhysics.setPosition(position); g.playerController.syncPosFromPhysics(); g.playerController.snapRenderPose(); g.cameraFollow.snap();
    g.frontierProgress.secureCompanions(['mossling'], 'packaged-model-proof');
    return { roamId: roam.state.id, fleeId: flee.state.id };
  });
  await page.waitForTimeout(350);
  const roam = await page.evaluate(({ roamId }) => {
    const c = window.__game.creatureSystem.getCreatures().find(e => e.state.id === roamId); const model = c.group.children.find(n => n.userData?.externalModelInstance); return { state: c.state.aiState, active: model?.userData.modelAnimationController?.activeState, path: model?.userData.externalModelPath, skeleton: model?.getObjectByProperty('isSkinnedMesh', true)?.skeleton?.bones?.[0]?.uuid ?? null };
  }, expedition);
  await page.evaluate(({ fleeId }) => { const g=window.__game, c=g.creatureSystem.getCreatures().find(e=>e.state.id===fleeId); c.state.noticeRadius=7; c.state.personalSpaceRadius=2; const p={x:c.state.pos.x,y:c.state.pos.y,z:c.state.pos.z+.55};g.characterPhysics.setPosition(p);g.playerController.syncPosFromPhysics();g.playerController.snapRenderPose();g.cameraFollow.snap(); }, expedition);
  await page.waitForTimeout(450);
  const flee = await page.evaluate(({ fleeId, roamId }) => { const g=window.__game; const pick=id=>g.creatureSystem.getCreatures().find(e=>e.state.id===id); const a=pick(fleeId), b=pick(roamId); const am=a.group.children.find(n=>n.userData?.externalModelInstance), bm=b.group.children.find(n=>n.userData?.externalModelInstance); const companion=g.scene.getObjectByName('companion_mossling'); const cm=companion?.userData?.externalModelInstance ? companion : companion?.children.find(n=>n.userData?.externalModelInstance); return { state:a.state.aiState, active:am?.userData.modelAnimationController?.activeState, path:am?.userData.externalModelPath, skeletonIndependent:am?.getObjectByProperty('isSkinnedMesh',true)?.skeleton?.bones?.[0] !== bm?.getObjectByProperty('isSkinnedMesh',true)?.skeleton?.bones?.[0], companionPath:cm?.userData?.externalModelPath ?? null, companionIndependent:cm?.getObjectByProperty('isSkinnedMesh',true)?.skeleton?.bones?.[0] !== bm?.getObjectByProperty('isSkinnedMesh',true)?.skeleton?.bones?.[0] }; }, expedition);
  await page.screenshot({ path: `${out}/landscape-player-mossling.png` });
  const requestCountBeforeOffline = requests.length;
  await context.setOffline(true);
  const beforeMove = await page.evaluate(() => window.__game.player.position.toArray());
  await page.keyboard.down('w'); await page.waitForTimeout(450); await page.keyboard.up('w');
  const attack = page.getByRole('button', { name: 'ATTACK' }); if (await attack.count()) await attack.click();
  const pack = page.getByRole('button', { name: 'PACK' }); if (await pack.count()) { await pack.click(); await page.keyboard.press('Escape'); }
  const afterOffline = await page.evaluate(() => ({ playerPosition: window.__game.player.position.toArray(), playerAction: window.__game.player.userData.externalPlayerModel?.animator?.activeState ?? null }));
  const localBlobPrefix = `blob:${new URL(base).origin}/`;
  const remoteRequests = requests.filter(url => !url.startsWith(base) && !url.startsWith(localBlobPrefix));
  const glbRequests = [...new Set(requests.filter(url => url.endsWith('.glb')).map(url => new URL(url).pathname))];
  const collisionMatchesSource = ['w', 'h', 'd'].every(axis => camp.collision?.size?.[axis] === sourceCollision?.size?.[axis]) && ['x', 'y', 'z'].every(axis => camp.collision?.offset?.[axis] === sourceCollision?.offset?.[axis]) && camp.collision?.shape === sourceCollision?.shape;
  const report = { base, viewport: '844x390', diagnosticSetup: 'Mossling AI/player placement was adjusted only in transient browser runtime to show ROAM and FLEE; no save or world source was changed.', camp, sourceCollision, collisionMatchesSource, expedition: { roam, flee }, requestCountBeforeOffline, glbRequests, remoteRequests, errors, failed, offline: { afterOffline, newRequests: requests.slice(requestCountBeforeOffline) }, pass: false };
  report.expected = expected;
  report.pass = camp.player.path === expected.player && camp.player.clipCount === expected.playerClips && camp.player.handBone === expected.hand && camp.crates.length === 2 && collisionMatchesSource && roam.path === expected.mossling && roam.active === 'walk' && flee.path === expected.mossling && flee.active === 'run' && flee.skeletonIndependent && flee.companionPath === expected.mossling && flee.companionIndependent && [expected.crate, expected.mossling, expected.player].every(model => glbRequests.includes('/' + model)) && remoteRequests.length === 0 && errors.length === 0 && failed.length === 0 && report.offline.newRequests.length === 0 && beforeMove.some((v,i)=>Math.abs(v-afterOffline.playerPosition[i])>.001);
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); if (!report.pass) process.exitCode=1;
} finally { await browser.close(); }
