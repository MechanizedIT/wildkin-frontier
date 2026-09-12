import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='.dream-loop/overnight2-survey',browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:844,height:390}}),errors=[],steps=[];
page.on('pageerror',e=>errors.push(e.message));
const position=()=>page.evaluate(()=>({...__game.playerController.getState().pos,yaw:__game.cameraFollow.getYaw()}));
async function walk(x,z,tolerance=.35){
 let held=new Set(),last=await position(),stuck=0;
 try{for(let i=0;i<100;i++){
   const p=await position(),dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<tolerance){steps.push({walkTo:[x,z],arrived:p});return p;}
   const right=dx*Math.cos(p.yaw)-dz*Math.sin(p.yaw),back=dx*Math.sin(p.yaw)+dz*Math.cos(p.yaw),next=new Set();
   if(Math.abs(right)>.22)next.add(right>0?'d':'a');if(Math.abs(back)>.22)next.add(back>0?'s':'w');
   for(const k of held)if(!next.has(k))await page.keyboard.up(k);for(const k of next)if(!held.has(k))await page.keyboard.down(k);held=next;
   await page.waitForTimeout(160);const q=await position();stuck=Math.hypot(q.x-last.x,q.z-last.z)<.015?stuck+1:0;last=q;
   if(stuck>12)throw Error(`Walking blocked toward ${x},${z} at ${q.x},${q.z}`);
 }throw Error(`Walk time bound ${x},${z}`);}finally{for(const k of held)await page.keyboard.up(k);}
}
try{
 await page.goto('http://localhost:8080/');await page.locator('[data-action=start]').click({timeout:60000});
 await walk(0,-4.4);await page.waitForTimeout(300);assert.match(await page.locator('#contextual-action-button').getAttribute('aria-label'),/travel/i);
 await page.locator('#contextual-action-button').click({timeout:3000});await page.locator('[data-destination="0"]').click();
 await page.waitForFunction(()=>__game.sectionRuntime.getActiveSectionId()==='section_1');steps.push({departed:await position()});
 await walk(.3,25);await page.screenshot({path:`${out}/wreck-from-trail.png`});
 await walk(.3,23);await walk(3.4,23);await page.screenshot({path:`${out}/wreck-entry.png`});
 await walk(7.1,23);await page.waitForTimeout(400);await page.screenshot({path:`${out}/wreck-chest-ready.png`});
 const action=await page.locator('#contextual-action-button').getAttribute('aria-label');assert.match(action,/survey supply chest/i);
 await page.locator('#contextual-action-button').click({timeout:3000});await page.waitForTimeout(1400);
 const reward=await page.evaluate(()=>({pack:__game.frontierProgress.getInventoryState().pack,available:__game.lootSystem.getAvailability('chest_survey_cartridge'),pos:{...__game.playerController.getState().pos}}));
 assert.equal(reward.pack.filter(s=>s?.id==='field_pack_cartridge').reduce((n,s)=>n+s.count,0),1);assert.equal(reward.available.available,false);
 await page.screenshot({path:`${out}/wreck-chest-open.png`});
 await page.locator('[data-action=open][data-tab=inventory]').click({timeout:3000});await page.locator('.ip-slot[aria-label^="Field-pack cartridge"]').click();
 assert.match(await page.locator('.ip-status').innerText(),/Salvage bench.*20 slots/);await page.screenshot({path:`${out}/cartridge-in-pack.png`});
 await page.locator('[data-ip=close]').click();await walk(3.3,23);await walk(.3,23);steps.push({exited:await position()});
 await page.reload();await page.waitForFunction(()=>window.__game?.frontierProgress?.getInventoryState().pack.some(s=>s?.id==='field_pack_cartridge'),null,{timeout:60000});
 const loaded=await page.evaluate(()=>({pack:__game.frontierProgress.getInventoryState().pack,available:__game.lootSystem.getAvailability('chest_survey_cartridge')}));assert.deepEqual(loaded.pack,reward.pack);assert.equal(loaded.available.available,false);
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/wreck-native.json`,JSON.stringify({fixture:'Isolated fresh start. Actual keyboard travel from pod through Camp Travel/map, Forest Edge trail and west wreck entrance; actual chest and pack clicks. Read-only position-based navigation. No save seeds, teleport, grants, camera overrides or debug mutations.',steps,reward,loaded,errors,pass:true},null,2));console.log('Earned fresh Survey cartridge/west entry/exit/literal reload PASS');
}catch(e){await page.screenshot({path:`${out}/wreck-native-failed.png`});await fs.writeFile(`${out}/wreck-native-failed.json`,JSON.stringify({error:String(e),steps,position:await position().catch(()=>null),errors},null,2));throw e;}finally{await browser.close();}
