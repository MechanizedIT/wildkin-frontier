import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base=process.env.VOXEL_CELLULAR_URL||'http://localhost:8090/lab/voxel/cellular-rock.html';
const out=process.env.VOXEL_CELLULAR_OUT||'docs/evidence/voxel-phase05a1/hold-source';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:900},deviceScaleFactor:1}),errors=[],external=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(new URL(base).origin+'/'))external.push(r.url());});
const ready=()=>page.waitForFunction(()=>window.__cellularLab?.ready&&!window.__cellularLab?.editing);
const report=()=>page.evaluate(()=>window.__cellularLab.report());
const world=hit=>page.evaluate(p=>window.__cellularLab.mineAtWorld(p),hit);
const actor=(id,hit)=>page.evaluate(({id,hit})=>window.__cellularLab.mineActorLocal(id,hit),{id,hit});
const receipt={timestamp:new Date().toISOString(),base,browser:'Edge headless/SwiftShader',stages:[],errors,external};
try{
  const saveId=`rock-a1-hold-${Date.now()}`;
  await page.goto(`${base}?save=${saveId}`);await ready();await page.screenshot({path:`${out}/start.png`});
  let result=await world([0,4,-1.55]);assert.equal(result.status,'OK');receipt.stages.push({name:'irregular bite',report:await report()});
  await page.screenshot({path:`${out}/bite.png`});
  for(const hit of [[.5,1.5,0],[-.5,1.5,0]]){result=await world(hit);assert.equal(result.status,'OK');}
  assert.equal(result.detached,1);await page.waitForTimeout(2500);await page.locator('#focus').click();
  receipt.stages.push({name:'detached and rotated',report:await report()});await page.screenshot({path:`${out}/fallen.png`});
  let state=await page.evaluate(()=>window.__cellularLab.state),parent=state.actors[0];
  result=await actor(parent.id,[1.55,4,0]);assert.equal(result.status,'OK');
  receipt.stages.push({name:'rotated actor mined',report:await report()});await page.screenshot({path:`${out}/secondary.png`});
  const hits=[[0,4,0],[0,4,-.5],[0,3,0],[0,5,0],[0,4.5,-.5],[0,5.5,0],[0,4,-1.5],[0,3,1]];
  let held=null;
  for(const [index,hit] of hits.entries()){
    state=await page.evaluate(()=>window.__cellularLab.state);parent=state.actors[0];
    const before=JSON.stringify(state),previous=await report();result=await actor(parent.id,hit);
    if(result.status==='HOLD'){
      held={index,hit,reason:result.reason,unchanged:before===JSON.stringify(await page.evaluate(()=>window.__cellularLab.state)),
        previousRevision:previous.revision,after:await report(),message:await page.locator('#message').textContent()};
      break;
    }
    assert.ok(['OK','NO_HIT'].includes(result.status),result.reason);
  }
  assert.ok(held,'unsafe split must HOLD');assert.match(held.reason,/collider visible-surface gate/);
  assert.equal(held.unchanged,true);assert.equal(held.after.revision,held.previousRevision);
  assert.equal(held.after.audit.balanced,true);assert.equal(held.after.bodyCount,1);assert.equal(held.after.actors.length,1);
  await page.screenshot({path:`${out}/held-split.png`});
  const saved=held.after;
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#save').click()]);await ready();
  const reloaded=await report();assert.equal(reloaded.revision,saved.revision+1);assert.equal(reloaded.actors[0].id,saved.actors[0].id);
  assert.equal(reloaded.actors[0].contentRevision,saved.actors[0].contentRevision);
  assert.deepEqual(reloaded.audit,saved.audit);
  assert.equal(reloaded.audit.balanced,true);assert.equal(reloaded.retired.length,0);
  await page.screenshot({path:`${out}/held-reloaded.png`});
  receipt.stages.push({name:'unsafe split safely held and reloaded',held,reloaded});
  await page.goto(`${base}?save=${saveId}-native`);await ready();
  await page.locator('#mine').click();await page.waitForFunction(()=>window.__cellularLab.state.revision>=1);
  const nativeWorld=await report();await page.screenshot({path:`${out}/native-world-mine.png`});
  for(const hit of [[.5,1.5,0],[-.5,1.5,0]]){const neck=await world(hit);assert.equal(neck.status,'OK');}
  await page.waitForTimeout(2500);await page.locator('#focus').click();
  const nativeBefore=await report();let nativeAfter=nativeBefore;
  for(let attempt=0;attempt<3&&nativeAfter.revision===nativeBefore.revision;attempt++){
    await page.locator('#mine').click();await page.waitForTimeout(300);nativeAfter=await report();
  }
  assert.ok(nativeAfter.revision>nativeBefore.revision,'normal Mine control must edit the fallen actor');
  assert.ok(nativeAfter.actors[0].contentRevision>nativeBefore.actors[0].contentRevision);
  receipt.stages.push({name:'native Mine edits world and fallen actor',worldRevision:nativeWorld.revision,
    actorBefore:nativeBefore.revision,actorAfter:nativeAfter.revision});
  await page.screenshot({path:`${out}/native-actor-mine.png`});
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);receipt.pass=true;
}catch(error){receipt.pass=false;receipt.failure=error.stack||String(error);}finally{
  await fs.writeFile(`${out}/hold-proof.json`,JSON.stringify(receipt,null,2));await browser.close();
}
console.log(JSON.stringify({pass:receipt.pass,stages:receipt.stages.map(s=>s.name),held:receipt.stages.at(-1)?.held?.reason,errors,external,failure:receipt.failure}));
if(!receipt.pass)process.exitCode=1;
