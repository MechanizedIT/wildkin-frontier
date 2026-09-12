import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='.dream-loop/overnight2-survey';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:844,height:340},hasTouch:true}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://localhost:8080/');await page.locator('[data-action=start]').click({timeout:60000});
 const fixture=await page.evaluate(()=>{
   const g=__game,p=g.frontierProgress;p.collectResources({wood:10,stone:5,fiber:2});
   const floor=p.placeStructure({id:'build_survey_floor',type:'foundation',pos:{x:-4.5,z:7.7},yaw:0});
   const bench=p.placeStructure({id:'build_survey_bench',type:'workbench',pos:{x:-4.5,z:7.7},yaw:0});
   g.betaGame.base.update(.4);g.characterPhysics.setPosition({x:-4.5,y:.55,z:9.5});g.playerController.syncPosFromPhysics();g.playerController.snapRenderPose();
   return {floor:floor.placed,bench:bench.placed};
 });assert.ok(fixture.floor&&fixture.bench);await page.waitForTimeout(1200);
 await page.screenshot({path:`${out}/bench-approach.png`});
 await page.locator('#contextual-action-button').click({timeout:3000});
 assert.equal(await page.locator('[data-station-recipe]').count(),4);
 await page.locator('[data-station-recipe=fit_field_pack]').click();
 assert.equal(await page.locator('[data-station-craft]').isDisabled(),true);
 await page.screenshot({path:`${out}/bench-landscape-missing.png`});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(400);
 await page.screenshot({path:`${out}/bench-portrait-missing.png`});
 const dims=await page.locator('.station-panel').evaluate(el=>({panel:el.getBoundingClientRect().toJSON(),recipes:[...el.querySelectorAll('[data-station-recipe]')].map(r=>({text:r.innerText,rect:r.getBoundingClientRect().toJSON(),overflow:r.scrollWidth>r.clientWidth}))}));
 assert.ok(dims.recipes.every(r=>r.rect.width>=48&&!r.overflow));
 await page.evaluate(()=>__game.frontierProgress.collectResources({field_pack_cartridge:1,fiber:6,wood:2}));await page.waitForTimeout(200);
 await page.screenshot({path:`${out}/bench-portrait-ready.png`});
 const before=await page.evaluate(()=>__game.frontierProgress.getInventoryState());
 await page.locator('[data-station-craft]').click();await page.waitForTimeout(2800);
 const after=await page.evaluate(()=>__game.frontierProgress.getInventoryState());assert.equal(after.pack.length,20);assert.deepEqual(after.pack.slice(16),[null,null,null,null]);
 assert.equal(await page.locator('[data-station-craft]').innerText(),'Fitted');assert.equal(await page.locator('[data-station-craft]').isDisabled(),true);
 await page.screenshot({path:`${out}/bench-portrait-fitted.png`});
 await page.reload();await page.waitForFunction(()=>window.__game?.frontierProgress?.getInventoryState().pack.length===20,{timeout:60000});
 const loaded=await page.evaluate(()=>__game.frontierProgress.getInventoryState());assert.deepEqual(loaded,after);
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/station-native.json`,JSON.stringify({fixture:'Isolated fresh save; diagnostic material grants and placed floor/bench; actual world-label and recipe/Fit clicks, viewport resize and literal reload.',placement:fixture,dims,before,after,loaded,errors,pass:true},null,2));console.log('Survey bench native fit/reload PASS');
}finally{await browser.close();}
