import fs from 'node:fs';
import { chromium } from 'playwright';
const out='art/reviews/skybreak-tablelands/rotation-1';
fs.mkdirSync(out,{recursive:true});
const points=[
 {name:'arrival',x:4,z:-153,yaw:0},
 {name:'ascent',x:-7,z:-184,yaw:Math.atan2(-12,20)},
 {name:'crown',x:12,z:-228,yaw:Math.atan2(-20,-14)},
 {name:'return',x:36,z:-188,yaw:Math.PI},
 {name:'overhead',x:7,z:-200,yaw:0,height:125}
];
const phase=process.argv[2]??'baseline';
const browser=await chromium.launch({headless:true,channel:'msedge'});
const page=await browser.newPage({viewport:{width:412,height:915},deviceScaleFactor:1});
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
const save=JSON.parse(fs.readFileSync('.dream-loop/heartwood-circuit/original-save-private.json'));
await page.addInitScript(s=>localStorage.setItem('wildkin.frontierProgress',JSON.stringify(s.progress)),save);
await page.goto('http://localhost:8080/',{waitUntil:'load'});
await page.waitForFunction(()=>window.__game?.frontierChunks);
await page.locator('[data-action=start]').click();
const report={phase,date:new Date().toISOString(),fixture:'Fresh current-source captures in isolated copied earned-save context; diagnostic fixed positioning, not ordinary route proof.',viewport:{width:412,height:915},seed:save.progress.atlas.seed,views:[],errors};
for(const p of points){
 await page.evaluate(p=>{const g=window.__game;g.characterPhysics.setPosition({x:p.x,y:g.frontierChunks.getHeight(p.x,p.z)+.7,z:p.z});g.playerController.syncPosFromPhysics();g.playerController.snapRenderPose();g.cameraFollow.orbitBy(p.yaw-g.cameraFollow.getYaw());g.cameraFollow.snap();},p);
 await page.waitForTimeout(6500);
 if(p.name==='overhead'){
  await page.setViewportSize({width:1100,height:900});
  await page.evaluate(p=>{const g=window.__game;g.cameraFollow.update=()=>{};g.cameraFollow.prepareForInput=()=>{};g.camera.position.set(p.x,g.frontierChunks.getHeight(p.x,p.z)+p.height,p.z+.01);g.camera.lookAt(p.x,0,p.z);g.camera.far=1000;g.camera.updateProjectionMatrix();g.scene.fog=null;g.camera.updateMatrixWorld();},p);
  await page.waitForTimeout(150);
 }
 await page.screenshot({path:`${out}/${phase}-${p.name}.png`});
 const state=await page.evaluate(()=>{const g=window.__game;return {pos:g.playerController.getState().pos,camera:g.cameraFollow._debug(),terrain:g.frontierChunks.getDebugState(),scenery:g.frontierScenery.getDebugState(),render:g.renderer.info.render}});
 report.views.push({name:p.name,requested:p,state});
}
fs.writeFileSync(`${out}/${phase}-captures.json`,JSON.stringify(report,null,2));
await browser.close();console.log(JSON.stringify({phase,errors,views:report.views.map(v=>({name:v.name,pos:v.state.pos}))}));
