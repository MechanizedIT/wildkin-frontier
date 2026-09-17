import fs from 'node:fs';
import {chromium} from 'playwright';
const phase=process.argv[2]??'r1-final';
const out='art/reviews/ironspine-range/rotation-1';
const points=[{"name":"Ascent lattice 0","x":-2080,"z":-3160},{"name":"Lower gully iron west approach","x":-2075.4,"z":-3159.5,"gather":true},{"name":"Lower gully route return","x":-2080,"z":-3160},{"name":"Ascent lattice 1","x":-2080,"z":-3155},{"name":"Ascent lattice 2","x":-2075,"z":-3150},{"name":"Ascent lattice 3","x":-2070,"z":-3145},{"name":"Ascent lattice 4","x":-2070,"z":-3140},{"name":"Ascent lattice 5","x":-2065,"z":-3135},{"name":"Ascent lattice 6","x":-2060,"z":-3130},{"name":"Ascent lattice 7","x":-2065,"z":-3125},{"name":"Ascent lattice 8","x":-2070,"z":-3120},{"name":"Ascent lattice 9","x":-2075,"z":-3115},{"name":"Ascent lattice 10","x":-2080,"z":-3110},{"name":"Ascent lattice 11","x":-2085,"z":-3105},{"name":"Ascent lattice 12","x":-2080,"z":-3105},{"name":"Ascent lattice 13","x":-2085,"z":-3100},{"name":"Ascent lattice 14","x":-2080,"z":-3100},{"name":"Ascent lattice 15","x":-2075,"z":-3100},{"name":"Ascent lattice 16","x":-2080,"z":-3095},{"name":"Ascent lattice 17","x":-2085,"z":-3090},{"name":"Ascent lattice 18","x":-2090,"z":-3085},{"name":"Ascent lattice 19","x":-2095,"z":-3080},{"name":"Ascent lattice 20","x":-2100,"z":-3075},{"name":"Ascent lattice 21","x":-2105,"z":-3070},{"name":"Ascent lattice 22","x":-2110,"z":-3065},{"name":"Ascent lattice 23","x":-2115,"z":-3060},{"name":"Ascent lattice 24","x":-2110,"z":-3060},{"name":"Ascent lattice 25","x":-2115,"z":-3055},{"name":"Ascent lattice 26","x":-2120,"z":-3050},{"name":"Ascent lattice 27","x":-2125,"z":-3045},{"name":"Ascent lattice 28","x":-2130,"z":-3040},{"name":"Ascent lattice 29","x":-2135,"z":-3035},{"name":"Ascent lattice 30","x":-2140,"z":-3030},{"name":"Ascent lattice 31","x":-2145,"z":-3025},{"name":"Ascent lattice 32","x":-2150,"z":-3020},{"name":"Ascent lattice 33","x":-2145,"z":-3020},{"name":"Ascent lattice 34","x":-2140,"z":-3020},{"name":"Ascent lattice 35","x":-2145,"z":-3015},{"name":"Ascent lattice 36","x":-2150,"z":-3010},{"name":"Ascent lattice 37","x":-2145,"z":-3010},{"name":"Crown iron west approach","x":-2145.2,"z":-3005.2,"gather":true},{"name":"Crown route return","x":-2145,"z":-3010},{"name":"Descent lattice 38","x":-2150,"z":-3010},{"name":"Descent lattice 39","x":-2145,"z":-3015},{"name":"Descent lattice 40","x":-2140,"z":-3020},{"name":"Descent lattice 41","x":-2145,"z":-3020},{"name":"Descent lattice 42","x":-2150,"z":-3020},{"name":"Descent lattice 43","x":-2145,"z":-3025},{"name":"Descent lattice 44","x":-2140,"z":-3030},{"name":"Descent lattice 45","x":-2135,"z":-3035},{"name":"Descent lattice 46","x":-2130,"z":-3040},{"name":"Descent lattice 47","x":-2125,"z":-3045},{"name":"Descent lattice 48","x":-2120,"z":-3050},{"name":"Descent lattice 49","x":-2115,"z":-3055},{"name":"Descent lattice 50","x":-2110,"z":-3060},{"name":"Descent lattice 51","x":-2115,"z":-3060},{"name":"Descent lattice 52","x":-2110,"z":-3065},{"name":"Descent lattice 53","x":-2105,"z":-3070},{"name":"Descent lattice 54","x":-2100,"z":-3075},{"name":"Descent lattice 55","x":-2095,"z":-3080},{"name":"Descent lattice 56","x":-2090,"z":-3085},{"name":"Descent lattice 57","x":-2085,"z":-3090},{"name":"Descent lattice 58","x":-2080,"z":-3095},{"name":"Descent lattice 59","x":-2075,"z":-3100},{"name":"Descent lattice 60","x":-2080,"z":-3100},{"name":"Descent lattice 61","x":-2085,"z":-3100},{"name":"Descent lattice 62","x":-2080,"z":-3105},{"name":"Descent lattice 63","x":-2085,"z":-3105},{"name":"Descent lattice 64","x":-2080,"z":-3110},{"name":"Descent lattice 65","x":-2075,"z":-3115},{"name":"Descent lattice 66","x":-2070,"z":-3120},{"name":"Descent lattice 67","x":-2065,"z":-3125},{"name":"Descent lattice 68","x":-2060,"z":-3130},{"name":"Descent lattice 69","x":-2065,"z":-3135},{"name":"Descent lattice 70","x":-2070,"z":-3140},{"name":"Descent lattice 71","x":-2070,"z":-3145},{"name":"Descent lattice 72","x":-2075,"z":-3150},{"name":"Descent lattice 73","x":-2080,"z":-3155},{"name":"Descent lattice 74","x":-2080,"z":-3160}];
points.splice(1,1,
 {name:'Lower rock south clearance',x:-2080,z:-3162.5},
 {name:'Lower rock east clearance',x:-2075.3,z:-3162.5},
 {name:'Lower gully iron west approach',x:-2075.1,z:-3159.5,gather:true,nodeId:'f1:r:-42:-64:4'},
 {name:'Lower return east clearance',x:-2075.3,z:-3162.5},
 {name:'Lower return south clearance',x:-2080,z:-3162.5});
points.find(p=>p.name==='Crown iron west approach').nodeId='f1:r:-43:-61:8';
const browser=await chromium.launch({headless:true,channel:'msedge'});
const page=await browser.newPage({viewport:{width:412,height:915},deviceScaleFactor:1});
const save=JSON.parse(fs.readFileSync('.dream-loop/heartwood-circuit/original-save-private.json'));
await page.addInitScript(s=>{if(!localStorage.getItem('wildkin.frontierProgress'))localStorage.setItem('wildkin.frontierProgress',JSON.stringify(s.progress));},save);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const report={phase,date:new Date().toISOString(),fixture:'Isolated copied earned save, diagnostic supported local start in Ironspine; ordinary keyboard local circuit thereafter, read-only coordinates guide stops. No Camp-to-Ironspine travel claim or granted resources.',points,errors,legs:[],trace:[]};
const snap=()=>page.evaluate(()=>{const g=window.__game;return {pos:{...g.playerController.getState().pos},health:g.playerCombat.getHealth(),pack:g.frontierProgress.getState().inventory?.pack,scenery:g.frontierScenery.getDebugState(),blocking:g.debugCounts.blocking};});
async function hold(keys,ms){for(const k of keys)await page.keyboard.down(k);await page.waitForTimeout(ms);for(const k of keys)await page.keyboard.up(k);}
let last;function trace(s){if(last)report.distance=(report.distance??0)+Math.hypot(s.pos.x-last.x,s.pos.z-last.z);last=s.pos;report.trace.push({t:Date.now(),...s.pos,health:s.health});}
try{
 await page.goto('http://localhost:8080/',{waitUntil:'load'});await page.waitForFunction(()=>window.__game?.frontierChunks);await page.locator('[data-action=start]').click();await page.waitForTimeout(1500);
 await page.evaluate(()=>{const g=window.__game;g.cameraFollow.orbitBy(-g.cameraFollow.getYaw());g.cameraFollow.snap();});
 await page.evaluate(()=>{const g=window.__game,x=-2080,z=-3160;g.frontierChunks.update({x,z},{activeSectionId:'camp'});g.characterPhysics.setPosition({x,y:g.frontierChunks.getHeight(x,z)+.7,z});g.playerController.syncPosFromPhysics();g.playerController.snapRenderPose();g.cameraFollow.snap();});await page.waitForTimeout(2500);
 const started=Date.now();report.start=await snap();trace(report.start);report.sourceCheckpoint='Ironspine source R1 two existing buttresses, reviewed lattice with ordinary south-side rock detour and measured eligible mineral approaches.';
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
  if(i%10===0||i===points.length-1||p.gather)await page.screenshot({path:`${out}/${phase}-walk-${i+1}.png`});console.log(JSON.stringify(report.legs.at(-1)));
  if(!reached)throw Error('Blocked before '+p.name);
  if(p.gather){
   const rangeSamples=[];
   for(let k=0;k<25;k++){
    const range=await page.evaluate(id=>{const g=window.__game,n=g.resourceSystem.getNodes().find(n=>n.id===id);return {id,found:!!n,eligible:!!n&&g.resourceSystem.isHarvestableInRange(n,g.playerController.getState().pos),pos:{...g.playerController.getState().pos},nodePos:n?.state.position};},p.nodeId);
    rangeSamples.push(range);if(range.eligible)break;if(!range.found)throw Error('Missing intended mineral '+p.nodeId);
    await hold(['d'],80);trace(await snap());
   }
   (report.rangeApproaches??=[]).push({name:p.name,samples:rangeSamples});
   if(!rangeSamples.at(-1)?.eligible)throw Error('Intended mineral never eligible '+p.nodeId);
   const before=await snap();const eligible=await page.evaluate(()=>{const g=window.__game;return g.resourceSystem.getManualTargets(g.playerController.getState().pos).map(t=>({id:t.id,pos:t.state.position,remaining:t.state.remainingChunks}));});await hold(['f'],4000);await page.waitForTimeout(1500);
   const pickupWitness=[];for(let q=0;q<70;q++){const st=await snap();const drops=await page.evaluate(()=>window.__game.pickupSystem.getPickups().map(v=>({resourceId:v.resourceId,state:v.state,pos:{x:v.mesh.position.x,y:v.mesh.position.y,z:v.mesh.position.z}})));const drop=drops.find(v=>Math.hypot(v.pos.x-st.pos.x,v.pos.z-st.pos.z)<6);pickupWitness.push({pos:st.pos,pack:st.pack,drops});if(!drop)break;const dx=drop.pos.x-st.pos.x,dz=drop.pos.z-st.pos.z,keys=[];if(Math.abs(dx)>.18)keys.push(dx>0?'d':'a');if(Math.abs(dz)>.18)keys.push(dz>0?'s':'w');await hold(keys,100);trace(await snap());}
   const after=await snap();(report.pickupWitnesses??=[]).push({name:p.name,samples:pickupWitness});(report.interactions??=[]).push({name:p.name,before,eligible,after});await page.screenshot({path:`${out}/${phase}-gather-${i+1}.png`});}
 }
 report.seconds=(Date.now()-started)/1000;report.finish=await snap();
 await page.waitForTimeout(3500);
 const before=await page.evaluate(()=>window.__game.frontierProgress.exportSave());fs.writeFileSync(`.dream-loop/ironspine-rotation-1/${phase}-save-private.json`,JSON.stringify(before.payload));
 await page.reload();await page.waitForFunction(()=>window.__game?.frontierChunks);await page.locator('[data-action=start]').click();await page.waitForTimeout(1500);
 const after=await page.evaluate(()=>window.__game.frontierProgress.exportSave());fs.writeFileSync(`.dream-loop/ironspine-rotation-1/${phase}-reload-private.json`,JSON.stringify(after.payload));
 report.reload={progressExact:JSON.stringify(before.payload.progress)===JSON.stringify(after.payload.progress),inventoryExact:JSON.stringify(before.payload.progress.inventory)===JSON.stringify(after.payload.progress.inventory),ecologyExact:JSON.stringify(before.payload.progress.ecology)===JSON.stringify(after.payload.progress.ecology)};
}catch(e){report.failure=e.message;console.log(e.message);try{const s=await page.evaluate(()=>window.__game.frontierProgress.exportSave());fs.writeFileSync('.dream-loop/ironspine-rotation-1/'+phase+'-interrupted-save-private.json',JSON.stringify(s.payload));}catch{}}finally{fs.writeFileSync(`${out}/${phase}-journey.json`,JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({seconds:report.seconds,distance:report.distance,reload:report.reload,failure:report.failure,errors}));}
