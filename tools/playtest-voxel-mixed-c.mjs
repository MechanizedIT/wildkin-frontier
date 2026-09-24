import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base=process.env.VOXEL_MIXED_C_URL||'http://localhost:8123/lab/voxel/cellular-mixed.html',
  out=process.env.VOXEL_MIXED_C_OUT||'docs/evidence/voxel-phase05c/source';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--use-angle=swiftshader']}),
  page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}),id=`mixed-phase05c-${Date.now()}`,url=new URL(base);
url.searchParams.set('save',id);
const host=url.origin,checks=[],errors=[],external=[],reloadDeltas=[],captures=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('request',request=>{if(!request.url().startsWith(host+'/')&&!request.url().startsWith('data:'))external.push(request.url());});
const ready=()=>page.waitForFunction(()=>window.__cellularLab?.ready&&!window.__cellularLab?.editing,null,{timeout:60000});
const report=()=>page.evaluate(()=>window.__cellularLab.report());
const state=()=>page.evaluate(()=>structuredClone(window.__cellularLab.state));
const capture=async name=>{const path=`${out}/${name}.png`;await page.screenshot({path});captures.push(path);return path;};
async function clickCrosshair(){
  const before=await report();await page.mouse.click(640,360);
  await page.waitForFunction(rev=>window.__cellularLab.state.revision>rev,before.revision,{timeout:30000});await ready();return report();
}
async function saveReload(){
  const before=await report(),saved=await state(),start=Date.now();
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:30000}),page.locator('#save').click()]);await ready();
  const after=await report(),loaded=await state();reloadDeltas.push({beforeRevision:before.revision,afterRevision:after.revision,
    reloadMs:Date.now()-start,auditDelta:Object.fromEntries(['rock','dirt'].map(name=>[name,
      Object.fromEntries(['world','actors','consumed'].map(field=>[field,after.audit.materials[name][field]-before.audit.materials[name][field]]))])),
    actorIdsBefore:before.actors.map(actor=>actor.id),actorIdsAfter:after.actors.map(actor=>actor.id),
    poseDeltas:before.actors.map(actor=>{const restored=after.actors.find(item=>item.id===actor.id);if(!actor.pose||!restored?.pose)return {id:actor.id,available:false};
      const qa=actor.pose.rotation,qb=restored.pose.rotation,dot=Math.abs(qa.x*qb.x+qa.y*qb.y+qa.z*qb.z+qa.w*qb.w);
      return {id:actor.id,position:Math.hypot(...actor.pose.position.map((v,i)=>v-restored.pose.position[i])),rotationRadians:2*Math.acos(Math.min(1,dot))};})});
  assert.deepEqual(after.audit,before.audit);assert.deepEqual(after.events,before.events);assert.deepEqual(loaded.retired,saved.retired);
  for(const delta of reloadDeltas.at(-1).poseDeltas)if(delta.available){assert.ok(delta.position<.1,JSON.stringify(delta));assert.ok(delta.rotationRadians<.03,JSON.stringify(delta));}
  for(const actor of saved.actors)assert.deepEqual(loaded.actors.find(item=>item.id===actor.id)?.structure,actor.structure);
  return {before,after,saved,loaded};
}

const receipt={timestamp:new Date().toISOString(),url:base,browser:'Microsoft Edge headless / SwiftShader',viewport:{width:1280,height:720},id,
  fixture:{seed:9212026,spacing:.5},checks,captures,errors,external,reloadDeltas};
try{
  await page.goto(url.href);await ready();
  let current=await report(),currentState=await state();
  assert.equal(current.material,'mixed');assert.equal(current.supportSummary.anchoredRock,true);assert.equal(current.audit.balanced,true);
  receipt.fixture.initialRock=current.audit.materials.rock.initial;receipt.fixture.initialDirt=current.audit.materials.dirt.initial;
  checks.push({stage:'one supported boulder in one dirt world volume',revision:current.revision,support:current.supportSummary,
    rock:current.audit.materials.rock,dirt:current.audit.materials.dirt,rewards:currentState.rewards});
  await capture('mixed-01-pristine-supported-boulder');

  const first=await clickCrosshair();currentState=await state();
  assert.equal(first.actors.some(actor=>actor.material===1),false);assert.equal(first.supportSummary.anchoredRock,true);
  assert.ok(first.events.dugUnits.dirt>0);assert.equal(first.events.dugUnits.rock,0);assert.equal(first.rewards?.stoneUnits??currentState.rewards.stoneUnits,0);
  checks.push({stage:'broad dirt scoop while rock remains supported',revision:first.revision,support:first.supportSummary,
    audit:first.audit,events:first.events,workUnits:first.matterWorkMetrics.at(-1)?.supportWorkUnits??null});
  await capture('mixed-02-first-dirt-scoop');await capture('mixed-03-partial-cavity-rock-still-static');

  const preReload=await saveReload();current=preReload.after;currentState=preReload.loaded;
  assert.equal(current.actors.length,0);assert.equal(current.supportSummary.anchoredRock,true);
  checks.push({stage:'literal reload before rock detachment preserves cavity and support',revision:current.revision,
    support:current.supportSummary,audit:current.audit,rewards:currentState.rewards});
  await capture('mixed-04-reloaded-pre-detachment');await capture('mixed-05-supported-rock-after-reload');

  const detached=await clickCrosshair();currentState=await state();
  const rockActor=detached.actors.find(actor=>actor.material===1);assert.ok(rockActor,'normal click should detach the unsupported rock');
  assert.equal(detached.supportSummary.before.anchoredRock,true);assert.equal(detached.supportSummary.anchoredRock,false);
  assert.equal(detached.audit.materials.rock.world,0);assert.equal(detached.audit.materials.rock.actors>0,true);
  assert.equal(currentState.rewards.stoneUnits,0);assert.equal(detached.bodyCount,1);assert.ok(detached.colliderCounts[0]<=8);
  checks.push({stage:'actual dirt support loss transfers stone without a reward',revision:detached.revision,actor:rockActor,
    support:detached.supportSummary,transferred:detached.audit.materials.rock.actors,rewards:currentState.rewards,
    bodyCount:detached.bodyCount,proxyColliders:detached.colliderCounts,work:detached.matterWorkMetrics.at(-1)});
  await capture('mixed-06-rock-detached');

  await page.waitForTimeout(500);current=await report();checks.push({stage:'rock is visibly falling/rolling on a bounded proxy',revision:current.revision,
    pose:current.actors.find(actor=>actor.id===rockActor.id)?.pose,bodyCount:current.bodyCount,proxyColliders:current.colliderCounts});
  await capture('mixed-07-rock-falling');
  await page.waitForFunction(id=>window.__cellularLab.physics.pose(id)?.sleepState==='SLEEPING',rockActor.id,{timeout:30000});
  const settled=await report(),settledActor=settled.actors.find(actor=>actor.id===rockActor.id);assert.ok(settledActor);
  checks.push({stage:'rock settles after translation and rotation',revision:settled.revision,pose:settledActor.pose,bodyCount:settled.bodyCount,
    proxyColliders:settled.colliderCounts,work:detached.matterWorkMetrics.at(-1)});
  await capture('mixed-08-rock-settled');

  await page.locator('#focus').click();await page.waitForTimeout(250);await capture('mixed-09-followed-moved-rock');
  let chipped=await clickCrosshair();currentState=await state();
  if(chipped.revision===settled.revision){await page.locator('#focus').click();await page.waitForTimeout(150);chipped=await clickCrosshair();currentState=await state();}
  assert.ok(chipped.events.dugUnits.rock>detached.events.dugUnits.rock,'normal target action should chip moved rock');
  assert.equal(chipped.events.dugUnits.dirt,detached.events.dugUnits.dirt);assert.equal(chipped.events.crumbledUnits.dirt,detached.events.crumbledUnits.dirt);
  assert.equal(chipped.audit.materials.dirt.world,detached.audit.materials.dirt.world);assert.ok(chipped.actors.find(actor=>actor.id===rockActor.id));
  checks.push({stage:'moved target selects rock and applies brittle chip/stress',revision:chipped.revision,
    actor:chipped.actors.find(actor=>actor.id===rockActor.id),audit:chipped.audit,events:chipped.events,
    stress:currentState.actors.find(actor=>actor.id===rockActor.id)?.structure,bodyCount:chipped.bodyCount});
  await capture('mixed-10-first-chip-after-fall');await page.locator('#debug').click();await capture('mixed-11-rock-weakness-view');

  const finalReload=await saveReload();current=finalReload.after;currentState=finalReload.loaded;
  assert.equal(current.audit.balanced,true);assert.equal(current.actors.find(actor=>actor.material===1)?.material,1);
  assert.equal(current.events.dugUnits.dirt,chipped.events.dugUnits.dirt);assert.equal(current.events.dugUnits.rock,chipped.events.dugUnits.rock);
  checks.push({stage:'literal reload preserves cavity, rock identity, chip stress, pose and ledgers',revision:current.revision,
    actors:current.actors,audit:current.audit,events:current.events,rewards:currentState.rewards,retired:current.retired});
  await capture('mixed-12-reloaded-mined-rock');

  assert.equal(current.audit.materials.rock.initial,current.audit.materials.rock.world+current.audit.materials.rock.actors+current.audit.materials.rock.consumed);
  assert.equal(current.audit.materials.dirt.initial,current.audit.materials.dirt.world+current.audit.materials.dirt.actors+current.audit.materials.dirt.consumed);
  assert.equal(current.audit.balanced,true);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  receipt.pass=true;receipt.final={revision:current.revision,audit:current.audit,events:current.events,rewards:currentState.rewards,
    actors:current.actors,retired:current.retired,bodyCount:current.bodyCount,colliders:current.colliderCounts,
    support:current.supportSummary,reloadDeltas,work:current.matterWorkMetrics,errors,external};
}catch(error){
  receipt.pass=false;receipt.failure=error.stack;receipt.last=await report().catch(()=>null);console.error(error);process.exitCode=1;
  await capture('mixed-failure').catch(()=>{});
}finally{
  await fs.writeFile(`${out}/playtest-voxel-mixed-c.json`,JSON.stringify(receipt,null,2));await browser.close();
}
console.log(JSON.stringify({pass:receipt.pass,stages:checks.map(check=>check.stage),failure:receipt.failure,errors,external}));
