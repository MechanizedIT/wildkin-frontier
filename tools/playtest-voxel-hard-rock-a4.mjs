import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base=process.env.VOXEL_HARD_ROCK_A4_URL||'http://localhost:8123/lab/voxel/cellular-rock.html';
const out=process.env.VOXEL_HARD_ROCK_A4_OUT||'docs/evidence/voxel-phase05a4';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const errors=[],external=[],checks=[],id=`hard-rock-a4-${Date.now()}`,host=new URL(base).origin;
page.on('pageerror',error=>errors.push(error.message));
page.on('request',request=>{if(!request.url().startsWith(host+'/')&&!request.url().startsWith('data:'))external.push(request.url());});
const ready=()=>page.waitForFunction(()=>window.__cellularLab?.ready&&!window.__cellularLab?.editing,null,{timeout:60000});
const report=()=>page.evaluate(()=>window.__cellularLab.report());
const state=()=>page.evaluate(()=>window.__cellularLab.state);
const capture=name=>page.screenshot({path:`${out}/${name}.png`});
const clickAt=async([x,y])=>{const previous=(await report()).revision;await page.mouse.click(x,y);
  await page.waitForFunction(revision=>window.__cellularLab.state.revision>revision,previous,{timeout:30000});await ready();return report();};
const reload=async()=>{const poses=await page.evaluate(()=>window.__cellularLab.state.actors.map(actor=>({id:actor.id,...window.__cellularLab.physics.pose(actor.id)})));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:30000}),page.locator('#save').click()]);await ready();return poses;};
const poseDelta=(a,b)=>{
  const position=Math.hypot(...a.position.map((v,i)=>v-b.position[i]));
  const qa=a.rotation,qb=b.rotation,dot=Math.abs(qa.x*qb.x+qa.y*qb.y+qa.z*qb.z+qa.w*qb.w);
  return {position,rotationRadians:2*Math.acos(Math.min(1,dot))};
};
const receipt={timestamp:new Date().toISOString(),base,id,browser:'Microsoft Edge headless / SwiftShader',viewport:{width:1280,height:720},checks,errors,external};
try{
  await page.goto(`${base}?save=${id}`);await ready();await capture('rock-start');
  let result=await clickAt([640,360]);
  assert.equal(result.actors.length,0);checks.push({stage:'first visible chip',revision:result.revision,audit:result.audit,timing:result});await capture('rock-first-chip');
  await clickAt([640,360]);result=await clickAt([640,360]);
  assert.ok(result.audit.consumed<16);assert.ok(result.actors.length===0);
  checks.push({stage:'repeated small chips and stress',revision:result.revision,audit:result.audit,weakness:result});await capture('rock-several-chips');

  for(const hit of [[640,478],[678,478],[640,478],[640,478]])result=await clickAt(hit);
  assert.equal(result.actors.length,0);assert.ok(result.audit.balanced);
  checks.push({stage:'pre-fracture crack feedback',revision:result.revision,audit:result.audit,timing:result});await capture('rock-pre-fracture');
  result=await clickAt([640,478]);assert.equal(result.actors.length,1);assert.equal(result.audit.balanced,true);
  const detached=await report();checks.push({stage:'static-to-dynamic detachment',revision:detached.revision,audit:detached.audit,actors:detached.actors,timing:detached});
  await capture('rock-detached');
  await page.waitForTimeout(1800);const fallen=await report(),motion=poseDelta(detached.actors[0].pose,fallen.actors[0].pose);
  assert.ok(motion.position>.2||motion.rotationRadians>.25,JSON.stringify(motion));
  checks.push({stage:'Rapier fall and rotation',motion,pose:fallen.actors[0].pose,colliders:fallen.colliderCounts,bodyCount:fallen.bodyCount});
  await page.locator('#focus').click();await ready();await capture('rock-rotated-child');

  const firstFractureBefore=await state();result=await clickAt([640,360]);
  const firstFracture=await state();assert.equal(firstFracture.actors.length,2);assert.ok(firstFracture.retired.includes(firstFractureBefore.actors[0].id));
  assert.ok(result.audit.balanced);assert.ok(result.audit.world+firstFracture.actors.reduce((n,a)=>n+(result.audit[a.id]||0),0)>result.audit.initial*.95);
  checks.push({stage:'first substantial dynamic fracture',revision:result.revision,audit:result.audit,
    remainingQuantity:result.audit.total-result.audit.consumed,remainingPercent:100*(result.audit.total-result.audit.consumed)/result.audit.initial,
    actors:firstFracture.actors.map(a=>a.id),pose:result.actors,timing:result});
  await capture('rock-fracture-result');
  await page.waitForTimeout(1800);await capture('rock-settled-children');

  await page.locator('#focus').click();await ready();const recursiveBefore=await state(),recursiveReward=recursiveBefore.rewards.stoneUnits;
  await capture('rock-followed-child');result=await clickAt([560,360]);const recursiveAfter=await state();
  assert.equal(recursiveAfter.actors.length,3);assert.ok(recursiveAfter.retired.length>=2);assert.ok(result.audit.balanced);
  assert.ok(recursiveAfter.rewards.stoneUnits-recursiveReward<=10,'fracture must not credit the full quantized child boundary');
  const nested=recursiveAfter.actors.filter(actor=>actor.parentId===recursiveBefore.actors[0].id);
  assert.ok(nested.length>=2);assert.ok(nested.every(actor=>actor.structure.hitSequence>0));
  checks.push({stage:'recursive child split at its moved pose',revision:result.revision,audit:result.audit,rewardDelta:recursiveAfter.rewards.stoneUnits-recursiveReward,timing:result,
    nested:nested.map(a=>({id:a.id,quantity:result.audit[a.id],hitSequence:a.structure.hitSequence,brokenBonds:a.structure.broken.length}))});
  await capture('rock-recursive-fracture');

  await page.waitForTimeout(3000);
  const beforeReload=await report(),persistedState=await state(),savedPoses=await reload();
  const afterReload=await report(),reloadedState=await state();
  assert.equal(reloadedState.revision,persistedState.revision+1,'pose checkpoint increments the revision');
  assert.equal(afterReload.actors.length,3);assert.equal(afterReload.retired.length,persistedState.retired.length);
  assert.deepEqual(afterReload.audit,beforeReload.audit);assert.equal(afterReload.audit.balanced,true);
  const poseRestoration=[];
  for(const actor of savedPoses){const saved=reloadedState.actors.find(item=>item.id===actor.id);assert.ok(saved);
    const delta=poseDelta(actor,saved);assert.ok(delta.position<.1&&delta.rotationRadians<.02,JSON.stringify({id:actor.id,delta}));
    const physics=afterReload.actors.find(item=>item.id===actor.id);assert.ok(physics);
    poseRestoration.push({id:actor.id,persistedPoseDelta:delta,firstPhysicsStepDelta:poseDelta(saved,physics.pose)});}
  for(const actor of persistedState.actors){const saved=reloadedState.actors.find(item=>item.id===actor.id);assert.ok(saved);
    assert.deepEqual(saved.structure,actor.structure);assert.equal(saved.parentId,actor.parentId);assert.equal(saved.contentRevision,actor.contentRevision);}
  checks.push({stage:'literal save/reload of moved nested children',revision:afterReload.revision,audit:afterReload.audit,poseMatches:true,poseRestoration,actors:afterReload.actors});
  await capture('rock-reloaded');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);receipt.pass=true;
}catch(error){
  receipt.pass=false;receipt.failure=error.stack;receipt.last=await report().catch(()=>null);
  await capture('rock-failure').catch(()=>{});console.error(error);process.exitCode=1;
}finally{
  await fs.writeFile(`${out}/playtest-hard-rock-a4.json`,JSON.stringify(receipt,null,2));await browser.close();
}
console.log(JSON.stringify({pass:receipt.pass,stages:checks.map(check=>check.stage),failure:receipt.failure,errors,external}));
