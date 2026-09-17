import fs from 'node:fs';
import {chromium} from 'playwright';
const phase=process.argv[2]??'baseline';
const out='art/reviews/sunscar-desert/rotation-1';
const points=[{"name":"Crystal fan east approach","x":-1972.3,"z":-4.8,"gather":true},{"name":"Open basin east edge","x":-1954,"z":-5},{"name":"Ore rib close approach","x":-1932.6,"z":-15,"gather":true},{"name":"West skirt approach","x":-1944,"z":5},{"name":"West of Emberhorn home","x":-1944,"z":28},{"name":"West skirt exit","x":-1944,"z":47},{"name":"North fiber approach","x":-1937,"z":84,"gather":true},{"name":"North crystal west approach turn","x":-1937,"z":87.2},{"name":"North crystal close west approach","x":-1935.6,"z":87.2,"gather":true},{"name":"West pocket north bypass","x":-1937,"z":90.5},{"name":"North pocket east bypass","x":-1930,"z":90.5},{"name":"North pocket return turn","x":-1928,"z":88},{"name":"East mineral return","x":-1892,"z":64},{"name":"East basin middle","x":-1912,"z":48},{"name":"East of Emberhorn home","x":-1916,"z":28},{"name":"East skirt exit","x":-1916,"z":10},{"name":"Southern exposed return","x":-1940,"z":0},{"name":"Crystal fan local return","x":-1970,"z":-2}];
const browser=await chromium.launch({headless:true,channel:'msedge'});
const page=await browser.newPage({viewport:{width:412,height:915},deviceScaleFactor:1});
const save=JSON.parse(fs.readFileSync('.dream-loop/heartwood-circuit/original-save-private.json'));
await page.addInitScript(s=>{if(!localStorage.getItem('wildkin.frontierProgress'))localStorage.setItem('wildkin.frontierProgress',JSON.stringify(s.progress));},save);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const report={phase,date:new Date().toISOString(),fixture:'Isolated copied earned save, diagnostic supported local start in Sunscar; ordinary keyboard local circuit thereafter, read-only coordinates guide stops. No Camp-to-Sunscar travel claim or granted resources.',points,errors,legs:[],trace:[]};
const snap=()=>page.evaluate(()=>{const g=window.__game;return {pos:{...g.playerController.getState().pos},health:g.playerCombat.getHealth(),pack:g.frontierProgress.getState().inventory?.pack,scenery:g.frontierScenery.getDebugState(),blocking:g.debugCounts.blocking};});
async function hold(keys,ms){for(const k of keys)await page.keyboard.down(k);await page.waitForTimeout(ms);for(const k of keys)await page.keyboard.up(k);}
let last;function trace(s){if(last)report.distance=(report.distance??0)+Math.hypot(s.pos.x-last.x,s.pos.z-last.z);last=s.pos;report.trace.push({t:Date.now(),...s.pos,health:s.health});}
try{
 await page.goto('http://localhost:8080/',{waitUntil:'load'});await page.waitForFunction(()=>window.__game?.frontierChunks);await page.locator('[data-action=start]').click();await page.waitForTimeout(1500);
 await page.evaluate(()=>{const g=window.__game;g.cameraFollow.orbitBy(-g.cameraFollow.getYaw());g.cameraFollow.snap();});
 await page.evaluate(()=>{const g=window.__game,x=-1970,z=-2;g.frontierChunks.update({x,z},{activeSectionId:'camp'});g.characterPhysics.setPosition({x,y:g.frontierChunks.getHeight(x,z)+.7,z});g.playerController.syncPosFromPhysics();g.playerController.snapRenderPose();g.cameraFollow.snap();});await page.waitForTimeout(2500);
 const started=Date.now();report.start=await snap();trace(report.start);report.sourceCheckpoint='Sunscar current integrated candidate, route R2 correction: west-facing crystal approach and north bypass avoids the existing east-side generic rock; ordinary loose pickups and creature skirts';
 for(let i=0;i<points.length;i++){
  const p=points[i],legStart=Date.now();let reached=false,stalls=0,lastDistance=Infinity,detours=0;const legOrigin=(await snap()).pos;
  for(let step=0;step<650;step++){
   const s=await snap();trace(s);const dx=p.x-s.pos.x,dz=p.z-s.pos.z,d=Math.hypot(dx,dz);
   if(d<.35){reached=true;break;}
   if(s.health<=0||s.blocking)throw Error('Interrupted health/blocking');
   stalls=d>lastDistance-.025?stalls+1:0;lastDistance=d;
   if(stalls>=14){if(++detours>3)break;await hold([dx>0?'d':'a'],1000);await hold([dz>0?'s':'w'],650);stalls=0;continue;}
   const vx=p.x-legOrigin.x,vz=p.z-legOrigin.z,len=Math.hypot(vx,vz);const t=Math.max(0,Math.min(1,((s.pos.x-legOrigin.x)*vx+(s.pos.z-legOrigin.z)*vz)/(len*len)));const aim=Math.min(1,t+1.0/len),ax=legOrigin.x+aim*vx-s.pos.x,az=legOrigin.z+aim*vz-s.pos.z;const keys=[];if(Math.abs(ax)>.10)keys.push(ax>0?'d':'a');if(Math.abs(az)>.10)keys.push(az>0?'s':'w');await hold(keys,Math.min(150,Math.max(50,d/2.145*150)));
  }
  const s=await snap();trace(s);report.legs.push({i,name:p.name,reached,detours,seconds:(Date.now()-legStart)/1000,pos:s.pos});
  await page.screenshot({path:`${out}/${phase}-walk-${i+1}.png`});console.log(JSON.stringify(report.legs.at(-1)));
  if(!reached)throw Error('Blocked before '+p.name);
  if(p.gather){const before=await snap();const eligible=await page.evaluate(()=>{const g=window.__game;return g.resourceSystem.getManualTargets(g.playerController.getState().pos).map(t=>({id:t.id,pos:t.state.position,remaining:t.state.remainingChunks}));});await hold(['f'],4000);await page.waitForTimeout(1500);
   const pickupWitness=[];for(let q=0;q<70;q++){const st=await snap();const drops=await page.evaluate(()=>window.__game.pickupSystem.getPickups().map(v=>({resourceId:v.resourceId,state:v.state,pos:{x:v.mesh.position.x,y:v.mesh.position.y,z:v.mesh.position.z}})));const drop=drops.find(v=>Math.hypot(v.pos.x-st.pos.x,v.pos.z-st.pos.z)<6);pickupWitness.push({pos:st.pos,pack:st.pack,drops});if(!drop)break;const dx=drop.pos.x-st.pos.x,dz=drop.pos.z-st.pos.z,keys=[];if(Math.abs(dx)>.18)keys.push(dx>0?'d':'a');if(Math.abs(dz)>.18)keys.push(dz>0?'s':'w');await hold(keys,100);trace(await snap());}
   const after=await snap();(report.pickupWitnesses??=[]).push({name:p.name,samples:pickupWitness});(report.interactions??=[]).push({name:p.name,before,eligible,after});await page.screenshot({path:`${out}/${phase}-gather-${i+1}.png`});}
 }
 report.seconds=(Date.now()-started)/1000;report.finish=await snap();
 await page.waitForTimeout(3500);
 const before=await page.evaluate(()=>window.__game.frontierProgress.exportSave());fs.writeFileSync(`.dream-loop/sunscar-rotation-1/${phase}-save-private.json`,JSON.stringify(before.payload));
 await page.reload();await page.waitForFunction(()=>window.__game?.frontierChunks);await page.locator('[data-action=start]').click();await page.waitForTimeout(1500);
 const after=await page.evaluate(()=>window.__game.frontierProgress.exportSave());fs.writeFileSync(`.dream-loop/sunscar-rotation-1/${phase}-reload-private.json`,JSON.stringify(after.payload));
 report.reload={progressExact:JSON.stringify(before.payload.progress)===JSON.stringify(after.payload.progress),inventoryExact:JSON.stringify(before.payload.progress.inventory)===JSON.stringify(after.payload.progress.inventory),ecologyExact:JSON.stringify(before.payload.progress.ecology)===JSON.stringify(after.payload.progress.ecology)};
}catch(e){report.failure=e.message;console.log(e.message);try{const s=await page.evaluate(()=>window.__game.frontierProgress.exportSave());fs.writeFileSync('.dream-loop/sunscar-rotation-1/'+phase+'-interrupted-save-private.json',JSON.stringify(s.payload));}catch{}}finally{fs.writeFileSync(`${out}/${phase}-journey.json`,JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({seconds:report.seconds,distance:report.distance,reload:report.reload,failure:report.failure,errors}));}
