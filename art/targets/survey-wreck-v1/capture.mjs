import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const out='.dream-loop/overnight2-survey-reference';
const browser=await chromium.launch({headless:true,channel:'msedge'});
const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const receipt={fixture:'Isolated fresh browser context. Native Start followed by diagnostic beginExpeditionFromDefaultEntry, then physics-position placement at x=7,z=23. Default native camera; no Author mode, camera override, resource grants or gameplay acceptance claimed.',commit:'9f8d49c',viewport:{width:844,height:390,dpr:1},errors};
try{
 await page.goto('http://localhost:8080/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-action=start]').click({timeout:60000});
 await page.evaluate(()=>__game.beginExpeditionFromDefaultEntry());
 await page.waitForTimeout(1200);
 receipt.setup=await page.evaluate(async()=>{const g=__game,{getSurfaceHeight}=await import('/src/world/terrainSurfaceModel.js');const section=g.worldRegistry.getSectionById('section_1');const pos={x:7,y:getSurfaceHeight(section.surface,7,23)+.55,z:23};g.characterPhysics.setPosition(pos);g.playerController.syncPosFromPhysics();g.playerController.snapRenderPose();return {position:pos,region:g.regionManager.getCurrentRegionId(),session:g.expeditionSession.getState()};});
 await page.waitForTimeout(1300);
 receipt.capture=await page.evaluate(()=>({position:__game.playerController.getState().pos,region:__game.regionManager.getCurrentRegionId()}));
 await page.screenshot({path:`${out}/baseline-verdant.png`});
 receipt.complete=true;
} catch(e){receipt.failure=String(e);process.exitCode=1;}finally{await fs.writeFile(`${out}/baseline-receipt.json`,JSON.stringify(receipt,null,2));await browser.close();console.log(JSON.stringify(receipt));}
