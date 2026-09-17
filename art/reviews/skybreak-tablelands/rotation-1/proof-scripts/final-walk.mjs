import fs from 'node:fs';
import {chromium} from 'playwright';
const phase=process.argv[2]??'baseline';
const out='art/reviews/skybreak-tablelands/rotation-1';
const points=[{"name":"Camp north approach","x":-3.4465,"z":-46.2659},{"name":"West woodland passage","x":-14,"z":-104},{"name":"West of territorial home","x":-14,"z":-125},{"name":"Skybreak western base","x":-20,"z":-152},{"name":"Western supply berries","x":-20,"z":-165.4,"gather":true},{"name":"Western supply return to lowland","x":-20,"z":-151},{"name":"Skybreak base route mouth","x":4,"z":-153},{"name":"Entry shelf","x":4,"z":-166},{"name":"Western ascent","x":-7,"z":-184},{"name":"Upper ascent","x":5,"z":-204},{"name":"Crown open center","x":12,"z":-228},{"name":"East cap crystal approach","x":30.2,"z":-214,"gather":true},{"name":"Eastern descent high","x":29,"z":-213},{"name":"Eastern descent middle","x":36,"z":-188},{"name":"Eastern descent low","x":32,"z":-156},{"name":"West side of old terrace","x":4,"z":-153},{"name":"Western woodland return","x":-14,"z":-125},{"name":"Woodland return edge","x":-14,"z":-104},{"name":"Camp approach return","x":-14,"z":-46},{"name":"Camp entrance","x":0,"z":-20},{"name":"Camp return","x":0,"z":7}];
const browser=await chromium.launch({headless:true,channel:'msedge'});
const page=await browser.newPage({viewport:{width:412,height:915},deviceScaleFactor:1});
const save=JSON.parse(fs.readFileSync('.dream-loop/heartwood-circuit/original-save-private.json'));
await page.addInitScript(s=>{if(!localStorage.getItem('wildkin.frontierProgress'))localStorage.setItem('wildkin.frontierProgress',JSON.stringify(s.progress));},save);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const report={phase,date:new Date().toISOString(),fixture:'Isolated copied earned Camp; ordinary keyboard movement from actual saved Camp, read-only coordinates guide destinations. No diagnostic placement or granted resources.',points,errors,legs:[],trace:[]};
const snap=()=>page.evaluate(()=>{const g=window.__game;return {pos:{...g.playerController.getState().pos},health:g.playerCombat.getHealth(),pack:g.frontierProgress.getState().inventory?.pack,scenery:g.frontierScenery.getDebugState(),blocking:g.debugCounts.blocking};});
async function hold(keys,ms){for(const k of keys)await page.keyboard.down(k);await page.waitForTimeout(ms);for(const k of keys)await page.keyboard.up(k);}
let last;function trace(s){if(last)report.distance=(report.distance??0)+Math.hypot(s.pos.x-last.x,s.pos.z-last.z);last=s.pos;report.trace.push({t:Date.now(),...s.pos});}
try{
 await page.goto('http://localhost:8080/',{waitUntil:'load'});await page.waitForFunction(()=>window.__game?.frontierChunks);await page.locator('[data-action=start]').click();await page.waitForTimeout(1500);
 await page.evaluate(()=>{const g=window.__game;g.cameraFollow.orbitBy(-g.cameraFollow.getYaw());g.cameraFollow.snap();});
 const started=Date.now();report.start=await snap();trace(report.start);report.sourceCheckpoint='Skybreak R1 one embedded rock; precise route anchor tolerance .35m';
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
  if(p.gather){const before=await snap();const eligible=await page.evaluate(()=>{const g=window.__game;return g.resourceSystem.getManualTargets(g.playerController.getState().pos).map(t=>({id:t.id,pos:t.state.position,remaining:t.state.remainingChunks}));});await hold(['f'],4000);await page.waitForTimeout(1500);const after=await snap();(report.interactions??=[]).push({name:p.name,before,eligible,after});await page.screenshot({path:`${out}/${phase}-gather-${i+1}.png`});}
 }
 report.seconds=(Date.now()-started)/1000;report.finish=await snap();
 await page.waitForTimeout(3500);
 const before=await page.evaluate(()=>window.__game.frontierProgress.exportSave());fs.writeFileSync(`.dream-loop/skybreak-rotation-1/${phase}-save-private.json`,JSON.stringify(before.payload));
 await page.reload();await page.waitForFunction(()=>window.__game?.frontierChunks);await page.locator('[data-action=start]').click();await page.waitForTimeout(1500);
 const after=await page.evaluate(()=>window.__game.frontierProgress.exportSave());fs.writeFileSync(`.dream-loop/skybreak-rotation-1/${phase}-reload-private.json`,JSON.stringify(after.payload));
 report.reload={progressExact:JSON.stringify(before.payload.progress)===JSON.stringify(after.payload.progress),inventoryExact:JSON.stringify(before.payload.progress.inventory)===JSON.stringify(after.payload.progress.inventory),ecologyExact:JSON.stringify(before.payload.progress.ecology)===JSON.stringify(after.payload.progress.ecology)};
}catch(e){report.failure=e.message;console.log(e.message);try{const s=await page.evaluate(()=>window.__game.frontierProgress.exportSave());fs.writeFileSync('.dream-loop/skybreak-rotation-1/'+phase+'-interrupted-save-private.json',JSON.stringify(s.payload));}catch{}}finally{fs.writeFileSync(`${out}/${phase}-journey.json`,JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({seconds:report.seconds,distance:report.distance,reload:report.reload,failure:report.failure,errors}));}
