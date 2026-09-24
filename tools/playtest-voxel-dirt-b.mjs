import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base=process.env.VOXEL_DIRT_B_URL||'http://localhost:8123/lab/voxel/cellular-rock.html',
  out=process.env.VOXEL_DIRT_B_OUT||'docs/evidence/voxel-phase05b/source';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--use-angle=swiftshader']}),
  page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}),
  id=`dirt-phase05b-${Date.now()}`,url=new URL(base);url.searchParams.set('material','dirt');url.searchParams.set('save',id);
const checks=[],errors=[],external=[],timingSamples=[],saveReloadMs=[],host=url.origin;
page.on('pageerror',error=>errors.push(error.message));
page.on('request',request=>{if(!request.url().startsWith(host+'/')&&!request.url().startsWith('data:'))external.push(request.url());});
const ready=()=>page.waitForFunction(()=>window.__cellularLab?.ready&&!window.__cellularLab?.editing,null,{timeout:60000});
const report=()=>page.evaluate(()=>window.__cellularLab.report());
const state=()=>page.evaluate(()=>window.__cellularLab.state);
const capture=name=>page.screenshot({path:`${out}/${name}.png`});
const clickOnce=async([x,y],timeout=30000)=>{
  const before=await report(),revision=before.revision;await page.mouse.click(x,y);
  await page.waitForFunction(value=>window.__cellularLab.state.revision>value,revision,{timeout});await ready();return report();
};
const clickMaybe=async(point)=>{
  const before=await report(),revision=before.revision;
  await page.mouse.click(...point);
  try{await page.waitForFunction(value=>window.__cellularLab.state.revision>value,revision,{timeout:2500});await ready();}
  catch{await page.waitForTimeout(350);}
  return report();
};
const actorUnits=reportValue=>reportValue.actors.length?reportValue.audit[reportValue.actors[0].id]??0:0;
function timingFor(stage,value){
  const sample={stage,editMs:value.editTimes.at(-1)??null,meshMs:value.workerTimes.at(-1)??null,
    proxyMs:value.colliderTimes.at(-1)??null,indexedDbMs:value.saveTimes.at(-1)??null,
    support:value.matterWorkMetrics.at(-1)??null,bodyCount:value.bodyCount,transientBodies:value.transientShardBodies,
    frameP95Ms:value.frameP95};timingSamples.push(sample);return sample;
}
const poseDelta=(a,b)=>{
  const position=Math.hypot(...a.position.map((value,index)=>value-b.position[index])),qa=a.rotation,qb=b.rotation,
    dot=Math.abs(qa.x*qb.x+qa.y*qb.y+qa.z*qb.z+qa.w*qb.w);
  return {position,rotationRadians:2*Math.acos(Math.min(1,dot))};
};
const receipt={timestamp:new Date().toISOString(),base:base.replace(/\?.*$/,''),id,browser:'Microsoft Edge headless / SwiftShader',viewport:{width:1280,height:720},checks,errors,external};
try{
  await page.goto(url.href);await ready();
  const pristine=await report();assert.equal(pristine.material,'dirt');assert.equal(pristine.materialId,2);assert.equal(pristine.audit.balanced,true);
  checks.push({stage:'pristine dirt bank / overhang',revision:pristine.revision,initialDirtUnits:pristine.audit.materials.dirt.initial,triangles:pristine.triangles[0]});
  await capture('dirt-01-pristine-bank');

  let result=await clickOnce([640,360]);
  assert.equal(result.actors.length,0);assert.ok(result.events.dugUnits.dirt>0);assert.ok(result.events.crumbledUnits.dirt>0);
  checks.push({stage:'first broad scoop and local crumble',revision:result.revision,audit:result.audit,events:result.events,
    directlyExcavated:result.events.dugUnits.dirt,crumbled:result.events.crumbledUnits.dirt,timing:result.matterWorkMetrics.at(-1)});
  checks.at(-1).timing=timingFor('first broad scoop',result);
  await capture('dirt-02-first-broad-scoop');

  result=await clickOnce([640,360]);
  assert.equal(result.actors.length,0);assert.equal(result.audit.balanced,true);
  const beforeDetach=await state();checks.push({stage:'repeated digs / pre-detachment cavity',revision:result.revision,audit:result.audit,events:result.events,
    directlyExcavated:result.events.dugUnits.dirt,crumbled:result.events.crumbledUnits.dirt,timing:result.matterWorkMetrics.at(-1)});
  checks.at(-1).timing=timingFor('repeated bank dig',result);
  await capture('dirt-03-cavity-pre-detachment');

  result=await clickOnce([640,360]);
  assert.equal(result.actors.length,1);assert.equal(result.actors[0].material,2);assert.equal(result.bodyCount,1);
  assert.equal(result.audit.balanced,true);assert.equal(result.audit.world,result.audit.materials.dirt.world);
  const detached=await report(),clodId=detached.actors[0].id,initialClodUnits=detached.audit[clodId],detachedPose=detached.actors[0].pose;
  assert.ok(initialClodUnits>=128);assert.equal(detached.colliderCounts[0],4);
  checks.push({stage:'substantial static-to-dynamic soil clod transfer',revision:detached.revision,clodId,clodUnits:initialClodUnits,
    audit:detached.audit,events:detached.events,bodyCount:detached.bodyCount,colliders:detached.colliderCounts,timing:timingFor('static to dynamic transfer',detached)});
  await capture('dirt-04-clod-detached');

  await page.waitForFunction(()=>{
    const actor=window.__cellularLab?.state.actors[0];return actor&&window.__cellularLab.physics.pose(actor.id)?.sleepState==='SLEEPING';
  },null,{timeout:30000});
  const settled=await report(),motion=poseDelta(detachedPose,settled.actors[0].pose);
  assert.ok(motion.position>.25||motion.rotationRadians>.25,JSON.stringify(motion));
  assert.equal(settled.actors[0].pose.sleepState,'SLEEPING');assert.equal(settled.bodyCount,1);
  checks.push({stage:'soil clod falls, rotates and rests on approximate collider',motion,pose:settled.actors[0].pose,
    colliderCount:settled.colliderCounts[0],bodyCount:settled.bodyCount,timing:timingFor('clod settled',settled)});

  const recursiveBefore=await state(),recursiveWorldUnits=(await report()).audit.world;let previousUnits=actorUnits(await report());
  await page.locator('#focus').click();await page.waitForTimeout(300);await capture('dirt-05-clod-rested');
  checks.push({stage:'player follows the settled moved clod',pose:settled.actors[0].pose,bodyCount:settled.bodyCount,
    timing:timingFor('follow settled clod',settled)});
  result=await clickOnce([640,360]);
  let remaining=actorUnits(result);assert.ok(remaining<previousUnits,'first moved-pose dig should reduce actor-owned dirt');
  assert.equal(result.audit.world,recursiveWorldUnits,'recursive clod dig leaves the static bank unchanged');
  checks.push({stage:'followed moved clod / recursive broad dig 1',revision:result.revision,clodId,
    unitsBefore:previousUnits,unitsAfter:remaining,events:result.events,audit:result.audit,timing:result.matterWorkMetrics.at(-1)});
  checks.at(-1).timing=timingFor('recursive clod dig 1',result);
  await capture('dirt-06-recursive-clod-dig-1');

  await page.locator('#focus').click();await page.waitForTimeout(200);result=await clickOnce([555,360]);
  previousUnits=remaining;remaining=actorUnits(result);assert.ok(remaining<previousUnits,'second visible-surface dig should reduce the same actor');
  assert.equal(result.audit.world,recursiveWorldUnits,'recursive clod digs leave the static bank unchanged');
  checks.push({stage:'recursive broad dig 2 leaves a small live clod',revision:result.revision,clodId,
    unitsBefore:previousUnits,unitsAfter:remaining,events:result.events,audit:result.audit,timing:result.matterWorkMetrics.at(-1)});
  checks.at(-1).timing=timingFor('recursive clod dig 2',result);
  await capture('dirt-07-recursive-clod-dig-2');

  await page.waitForFunction(()=>{
    const actor=window.__cellularLab?.state.actors[0];return actor&&window.__cellularLab.physics.pose(actor.id)?.sleepState==='SLEEPING';
  },null,{timeout:30000});
  const beforeReload=await report(),stateBeforeReload=await state(),poses=beforeReload.actors.map(actor=>({id:actor.id,pose:actor.pose}));
  let saveStart=Date.now();await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:30000}),page.locator('#save').click()]);
  saveReloadMs.push(Date.now()-saveStart);await ready();
  const afterReload=await report(),stateAfterReload=await state();
  assert.equal(afterReload.actors.length,1);assert.equal(afterReload.actors[0].material,2);
  assert.deepEqual(afterReload.audit,beforeReload.audit);assert.deepEqual(afterReload.events,beforeReload.events);
  assert.deepEqual(stateAfterReload.retired,stateBeforeReload.retired);
  const persisted=stateAfterReload.actors.find(actor=>actor.id===clodId);assert.ok(persisted);
  assert.deepEqual(persisted.position,poses[0].pose.position);assert.deepEqual(persisted.rotation,poses[0].pose.rotation);
  const restoredPose=poseDelta(poses[0].pose,afterReload.actors[0].pose);
  assert.ok(restoredPose.position<.1&&restoredPose.rotationRadians<.02,JSON.stringify(restoredPose));
  checks.push({stage:'literal reload restores recursive dirt edits, identity, quantities and moved pose',revision:afterReload.revision,
    audit:afterReload.audit,events:afterReload.events,poseDelta:restoredPose,actors:afterReload.actors,retired:afterReload.retired});
  await capture('dirt-08-reloaded-live-clod');

  const nextPoints=[[680,375],[600,415],[710,345],[565,405],[670,420],[620,330],[530,370],[750,390]];
  let actions=0;
  for(const point of nextPoints){
    const before=await report();if(!before.actors.length)break;
    await page.locator('#focus').click();await page.waitForTimeout(150);
    const after=await clickMaybe(point);
    if(after.revision>before.revision)assert.equal(after.audit.world,recursiveWorldUnits,'follow-up dig still targets the fallen clod');
    if(after.actors.length===0){actions++;result=after;break;}
    const now=actorUnits(after),prior=before.audit[clodId]??0;
    if(after.revision>before.revision&&now<prior){actions++;result=after;timingFor(`recursive clod follow-up ${actions}`,after);await capture(`dirt-recursive-follow-up-${actions}`);}
  }
  if((await report()).actors.length){
    for(const point of [[640,360],[680,375],[600,415],[710,345],[555,360]]){
      const before=await report();if(!before.actors.length)break;
      await page.locator('#focus').click();await page.waitForTimeout(120);
      const after=await clickMaybe(point);
      if(after.revision>before.revision)assert.equal(after.audit.world,recursiveWorldUnits,'follow-up dig still targets the fallen clod');
      if(after.actors.length===0){actions++;result=after;break;}
      if(after.revision>before.revision&&(after.audit[clodId]??0)<(before.audit[clodId]??0)){
        actions++;result=after;timingFor(`recursive clod follow-up ${actions}`,after);
      }
    }
  }
  const destroyed=await report(),destroyedState=await state();
  assert.equal(destroyed.actors.length,0,'small dirt clod should crumble rather than create many persistent bodies');
  assert.ok(destroyed.retired.includes(clodId));assert.equal(destroyed.bodyCount,0);assert.equal(destroyed.audit.balanced,true);
  assert.equal(destroyed.audit.materials.dirt.actors,0);
  assert.equal(destroyed.audit.materials.dirt.consumed,destroyed.events.dugUnits.dirt+destroyed.events.crumbledUnits.dirt);
  checks.push({stage:'small moved clod crumbles on recursive shovel hits',revision:destroyed.revision,actions,clodId,
    audit:destroyed.audit,events:destroyed.events,retired:destroyed.retired,bodyCount:destroyed.bodyCount,
    dirtUnits:destroyed.audit.materials.dirt,finalTiming:timingFor('clod retired',destroyed)});
  await capture('dirt-09-clod-broken-down');

  saveStart=Date.now();await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:30000}),page.locator('#save').click()]);
  saveReloadMs.push(Date.now()-saveStart);await ready();
  const reloadedFinal=await report(),reloadedFinalState=await state();
  assert.equal(reloadedFinal.actors.length,0);assert.deepEqual(reloadedFinal.retired,destroyed.retired);
  assert.deepEqual(reloadedFinal.audit,destroyed.audit);assert.deepEqual(reloadedFinal.events,destroyed.events);
  assert.equal(reloadedFinalState.actors.length,0);assert.ok(reloadedFinalState.retired.includes(clodId));
  checks.push({stage:'literal reload restores the fully dug out cavity and retired clod',revision:reloadedFinal.revision,
    audit:reloadedFinal.audit,events:reloadedFinal.events,retired:reloadedFinal.retired,actors:reloadedFinalState.actors.length});
  await capture('dirt-10-reloaded-destroyed-state');

  assert.equal(reloadedFinal.audit.materials.dirt.initial,reloadedFinal.audit.materials.dirt.world+
    reloadedFinal.audit.materials.dirt.actors+reloadedFinal.audit.materials.dirt.consumed);
  assert.equal(reloadedFinal.events.dugUnits.rock,0);assert.equal(reloadedFinal.events.crumbledUnits.rock,0);
  assert.equal(reloadedFinalState.rewards.stoneUnits,0);assert.equal(reloadedFinal.audit.balanced,true);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(reloadedFinal.errors,[]);
  receipt.pass=true;receipt.final={revision:reloadedFinal.revision,audit:reloadedFinal.audit,events:reloadedFinal.events,
    rewards:reloadedFinalState.rewards,retired:reloadedFinal.retired,bodyCount:reloadedFinal.bodyCount,
    timings:{samples:timingSamples,sourceReloadMs:saveReloadMs,
      maxima:Object.fromEntries(['editMs','meshMs','proxyMs','indexedDbMs'].map(key=>[key,
        Math.max(0,...timingSamples.map(sample=>sample[key]).filter(Number.isFinite))])),
      observedBodyMax:Math.max(0,...timingSamples.map(sample=>sample.bodyCount??0)),
      observedTransientBodyMax:Math.max(0,...timingSamples.map(sample=>sample.transientBodies??0))},errors,external};
}catch(error){
  receipt.pass=false;receipt.failure=error.stack;receipt.last=await report().catch(()=>null);console.error(error);process.exitCode=1;
  await capture('dirt-failure').catch(()=>{});
}finally{
  await fs.writeFile(`${out}/playtest-voxel-dirt-b.json`,JSON.stringify(receipt,null,2));await browser.close();
}
console.log(JSON.stringify({pass:receipt.pass,stages:checks.map(check=>check.stage),failure:receipt.failure,errors,external}));
