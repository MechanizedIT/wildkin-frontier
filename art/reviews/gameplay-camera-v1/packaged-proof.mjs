import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out='.dream-loop/gameplay-camera-package-rerun';await fs.mkdir(out,{recursive:true});
const receipt={fixture:'Fresh packaged Edge844x390 touch context. Actual Start, explicit waypoint unlock and supported terrain-position fixture from the dev camera receipt. Browser touch drag, Jump, reload/Continue. No earned campaign or physical-phone claim.',errors:[],failed:[],external:[],steps:[]};
const sha=async f=>createHash('sha256').update(await fs.readFile(f)).digest('hex');receipt.index=await sha('dist/submission/index.html');receipt.zip=await sha('dist/submission.zip');
const candidate=JSON.parse(await fs.readFile('art/reviews/gameplay-camera-v1/native/receipt.json','utf8')).terrainCandidate;
const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,hasTouch:true,isMobile:true}),page=await context.newPage();
page.on('pageerror',e=>receipt.errors.push(e.message));page.on('requestfailed',r=>receipt.failed.push(r.url()));page.on('request',r=>{if(!r.url().startsWith('http://localhost:8081/')&&!/^(data|blob):/.test(r.url()))receipt.external.push(r.url());});
const start=async()=>{await page.locator('[data-action=start]').waitFor({timeout:60000});await page.locator('[data-action=start]').tap();await page.waitForFunction(()=>window.__game&&!window.__game.betaGame.isBlocking());};
const state=()=>page.evaluate(()=>({camera:window.__game.cameraFollow._debug(),player:{...window.__game.playerController.getState().pos},grounded:window.__game.playerController.getState().grounded}));
try{
 await page.goto('http://localhost:8081/');await start();
 await page.evaluate(c=>{const g=window.__game;g.frontierProgress.unlockWaypoint('wp_section_1');g.beginExpedition('wp_section_1');g.playerCombat.grantInvulnerability(1000);g.autoHarvestEnabled=false;g.characterPhysics.setPosition({x:c.x,y:g.playground.getTerrainHeight(c.x,c.z)+.56,z:c.z});g.playerController.syncPosFromPhysics();g.playerController.snapRenderPose();g.playerController.prepareRender(1);g.cameraFollow.orbitBy(c.yaw-g.cameraFollow.getYaw(),c.pitch-g.cameraFollow.getPitch());g.cameraFollow.snap();},candidate);await page.waitForTimeout(500);
 const blocked=await state();assert.equal(blocked.grounded,true);assert.ok(blocked.camera.effectiveDistance<blocked.camera.requestedDistance-1);receipt.steps.push({name:'packaged terrain retraction',...blocked});
 await page.screenshot({path:`${out}/01-terrain.png`});const cdp=await context.newCDPSession(page);const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{id:1,x,y,radiusX:8,radiusY:8,force:1}]});
 await touch('touchStart',555,180);for(let i=1;i<=12;i++)await touch('touchMove',555+i*5,180-i*6);await touch('touchEnd');await page.waitForTimeout(300);const orbit=await state();assert.ok(orbit.camera.pitch>blocked.camera.pitch+.35);assert.ok(orbit.camera.yaw<blocked.camera.yaw-.4);assert.equal(orbit.camera.zoom,blocked.camera.zoom);receipt.steps.push({name:'packaged native touch pitch and yaw',...orbit});await page.screenshot({path:`${out}/02-touch-orbit.png`});
 await page.keyboard.press('Space');await page.waitForFunction(()=>window.__game.playerController.getState().mode==='JUMP',null,{timeout:2000});await page.waitForFunction(()=>window.__game.playerController.getState().grounded,null,{timeout:4000});
 await page.reload();await start();await page.waitForFunction(()=>window.__game.playerController.getState().grounded);const resumed=await state();assert.equal(await page.evaluate(()=>window.__game.sectionRuntime.getActiveSectionId()),'section_1');assert.ok(Number.isFinite(resumed.camera.pitch));receipt.steps.push({name:'literal Continue at supported position',...resumed});
 assert.equal(await sha('dist/submission/index.html'),receipt.index);assert.deepEqual(receipt.errors,[]);assert.deepEqual(receipt.failed,[]);assert.deepEqual(receipt.external,[]);receipt.pass=true;console.log('Packaged camera pitch, terrain collision, Jump and Continue PASS');
}catch(e){receipt.pass=false;receipt.failure=e.stack;process.exitCode=1;console.error(e);await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await fs.writeFile(`${out}/receipt.json`,JSON.stringify(receipt,null,2));await context.close();await browser.close();}
