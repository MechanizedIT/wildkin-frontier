import fs from 'node:fs';
import { chromium } from 'playwright';
const out='art/reviews/emberhorn/rotation-1';
const browser=await chromium.launch({headless:true,channel:'msedge'});
const page=await browser.newPage({viewport:{width:412,height:915}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const save=JSON.parse(fs.readFileSync('.dream-loop/heartwood-circuit/original-save-private.json'));
await page.addInitScript(s=>localStorage.setItem('wildkin.frontierProgress',JSON.stringify(s.progress)),save);
await page.goto('http://localhost:8080/');
await page.waitForFunction(()=>window.__game?.frontierChunks);
await page.locator('[data-action=start]').click();
await page.evaluate(()=>{
 const g=window.__game,x=-1930.5,z=41.8;
 g.frontierChunks.update({x,z},{activeSectionId:'camp'});
 g.characterPhysics.setPosition({x,y:g.frontierChunks.getHeight(x,z)+.7,z});
 g.playerController.syncPosFromPhysics();g.playerController.snapRenderPose();
 g.cameraFollow.orbitBy(-g.cameraFollow.getYaw());g.cameraFollow.snap();
});
await page.waitForTimeout(3500);
const snap=()=>page.evaluate(()=>{
 const g=window.__game,pos={...g.playerController.getState().pos};
 const c=g.creatureSystem.getCreatures().filter(c=>c.state.visualAssetId==='asset_wildkin_emberhorn').sort((a,b)=>Math.hypot(a.state.pos.x-pos.x,a.state.pos.z-pos.z)-Math.hypot(b.state.pos.x-pos.x,b.state.pos.z-pos.z))[0];
 return {t:Date.now(),pos,health:g.playerCombat.getHealth(),creature:c?{id:c.id,originId:c.state.originId,pos:{x:c.state.pos.x,y:c.state.pos.y,z:c.state.pos.z},ai:c.state.aiState,timer:c.state.aiTimer,facing:c.state.facing,scale:c.creatureScale,groupPosition:c.group.position.toArray(),visible:c.group.visible}:null};
});
async function hold(keys,ms){for(const k of keys)await page.keyboard.down(k);await page.waitForTimeout(ms);for(const k of keys)await page.keyboard.up(k);}
const report={note:'Isolated copied earned save. Diagnostic supported local start outside home, ordinary keys approach, natural AI warning/charge/recovery and retreat. No AI or creature-pose mutation.',start:await snap(),trace:[],frames:[],errors};
const seen=new Set();let lunge=false,recovery=false;
try {
 for(let i=0;i<300;i++){
  const s=await snap();report.trace.push(s);
  if(!s.creature)throw Error('Emberhorn not resident');
  if(!seen.has(s.creature.ai)){
   seen.add(s.creature.ai);const file=`r3-encounter-${s.creature.ai.toLowerCase()}.png`;
   await page.screenshot({path:out+'/'+file});report.frames.push({file,before:s,after:await snap()});console.log(s.creature.ai);
  }
  if(s.health<=1)break;
  if(s.creature.ai==='LUNGE')lunge=true;
  if(lunge&&s.creature.ai==='RECOVER'){recovery=true;break;}
  const d=Math.hypot(s.creature.pos.x-s.pos.x,s.creature.pos.z-s.pos.z);
  if(['ROAM','RETURN','WARN','ALERT','CHASE'].includes(s.creature.ai)&&d>1.9){
   const dx=s.creature.pos.x-s.pos.x,dz=s.creature.pos.z-s.pos.z,keys=[];
   if(Math.abs(dx)>.15)keys.push(dx>0?'d':'a');if(Math.abs(dz)>.15)keys.push(dz>0?'s':'w');await hold(keys,80);
  }else await page.waitForTimeout(65);
 }
 report.contact=await snap();await hold(['s'],5000);report.retreat=await snap();
 await page.screenshot({path:out+'/r3-encounter-retreat.png'});
}catch(e){report.failure=e.message;}
finally{
 report.seen=[...seen];report.lunge=lunge;report.recovery=recovery;
 fs.writeFileSync(out+'/r3-encounter-proof.json',JSON.stringify(report,null,2));
 await browser.close();console.log(JSON.stringify({seen:report.seen,lunge,recovery,failure:report.failure,errors}));
}
