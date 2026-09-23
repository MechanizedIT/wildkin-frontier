import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base=process.env.VOXEL_CELLULAR_URL||'http://localhost:8090/lab/voxel/cellular-rock.html';
const out=process.env.VOXEL_CELLULAR_OUT||'docs/evidence/voxel-phase05';await fs.mkdir(out,{recursive:true});
const headed=process.env.VOXEL_CELLULAR_HEADED==='1';
const browser=await chromium.launch({channel:'msedge',headless:!headed,args:headed?['--enable-webgl']:['--enable-webgl','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:900},deviceScaleFactor:1});
const errors=[],external=[],checks=[],id=`cellular-proof-${Date.now()}`;
const host=new URL(base).origin;
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(host+'/')&&!r.url().startsWith('data:'))external.push(r.url());});
const ready=async()=>page.waitForFunction(()=>window.__cellularLab?.ready&&!window.__cellularLab?.editing,null,{timeout:60000});
const report=()=>page.evaluate(()=>window.__cellularLab.report());
const world=hit=>page.evaluate(p=>window.__cellularLab.mineAtWorld(p),hit);
const actor=(id,hit)=>page.evaluate(({id,hit})=>window.__cellularLab.mineActorLocal(id,hit),{id,hit});
const reload=async()=>{await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:60000}),page.locator('#save').click()]);await ready();};
const receipt={timestamp:new Date().toISOString(),base,id,browser:headed?'Edge headed':'Edge headless/SwiftShader',checks,errors,external};
try{
  await page.goto(`${base}?save=${id}`);await ready();
  await page.screenshot({path:`${out}/rock-start.png`});
  let r=await world([0,4,-1.55]);assert.equal(r.status,'OK');assert.equal(r.detached,0);checks.push({stage:'irregular world bite',report:await report()});
  await page.screenshot({path:`${out}/rock-bite.png`});await reload();assert.equal((await report()).revision,1);
  for(const hit of [[.5,1.5,0],[-.5,1.5,0]]){r=await world(hit);assert.equal(r.status,'OK');}
  assert.equal(r.detached,1);const detached=await report();assert.equal(detached.actors.length,1);
  await page.screenshot({path:`${out}/rock-detached.png`});
  await page.waitForTimeout(2500);const fallen=await report();
  const localCOM=(await page.evaluate(()=>window.__cellularLab.state.actors[0].localCOM));
  const comY=pose=>{const q=pose.rotation,p=localCOM,u=[q.x,q.y,q.z],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],t=cross(u,p).map(v=>2*v),v=cross(u,t);return pose.position[1]+p[1]+q.w*t[1]+v[1];};
  assert.ok(comY(fallen.actors[0].pose)<comY(detached.actors[0].pose)-.4);
  checks.push({stage:'Rapier fall/rotation',detached:detached.actors[0].pose,fallen:fallen.actors[0].pose,colliders:fallen.colliderCounts});
  const oldSource=await world([0,4,-1.55]);assert.equal(oldSource.status,'NO_HIT');
  await page.locator('#focus').click();await page.screenshot({path:`${out}/rock-fallen.png`});await reload();
  let state=await page.evaluate(()=>window.__cellularLab.state),parent=state.actors[0];
  assert.equal(parent.id,detached.actors[0].id);
  r=await actor(parent.id,[1.55,4,0]);assert.equal(r.status,'OK');assert.equal(r.split,false);
  checks.push({stage:'rotated actor local hit',report:await report()});
  await page.locator('#focus').click();await page.screenshot({path:`${out}/rock-secondary.png`});await reload();
  const splitHits=[[0,4,0],[0,4,-.5],[0,3,0],[0,5,0],[0,4.5,-.5],[0,5.5,0],
    [0,4,-1.5],[0,3,1],[0,4.5,-1.5],[0,5.5,1],[0,2.5,1],[0,3.5,1.5]];
  for(const hit of splitHits){state=await page.evaluate(()=>window.__cellularLab.state);r=await actor(state.actors[0].id,hit);
    assert.ok(['OK','NO_HIT'].includes(r.status),`${hit}: ${r.status} ${r.reason}`);if(r.split)break;}
  assert.equal(r.split,true);state=await page.evaluate(()=>window.__cellularLab.state);assert.equal(state.actors.length,2);
  assert.ok(state.retired.includes(parent.id));
  const retiredHit=await actor(parent.id,[0,4,0]);assert.equal(retiredHit.status,'STALE');
  checks.push({stage:'two retained children, no old source or retired parent',report:await report()});
  await page.waitForTimeout(1500);await page.locator('#focus').click();await page.screenshot({path:`${out}/rock-split.png`});await reload();
  state=await page.evaluate(()=>window.__cellularLab.state);const child=state.actors[0];let childHit;
  for(let i=0;i<child.densities.length;i++)if(child.densities[i]<0){const x=i%13,y=Math.floor(i/13)%13,z=Math.floor(i/169);
    const hit=[-3+x*.5,y*.5,-3+z*.5],candidate=await actor(child.id,hit);
    if(candidate.status==='OK'){childHit=candidate;break;}}
  assert.equal(childHit?.status,'OK');checks.push({stage:'child hit and quantity',report:await report()});
  await page.locator('#focus').click();await page.screenshot({path:`${out}/rock-child-mined.png`});await reload();
  const final=await report();assert.equal(final.audit.balanced,true);assert.equal(final.actors.length,2);assert.ok(final.retired.includes(parent.id));
  assert.ok(final.colliderCounts.every(n=>n<=8));assert.ok(final.bodyCount<=4);checks.push({stage:'literal reload after child hit',report:final});
  await page.locator('#focus').click();await page.screenshot({path:`${out}/rock-reloaded.png`});assert.deepEqual(errors,[]);assert.deepEqual(external,[]);receipt.pass=true;
  await page.goto(`${base}?save=${id}-native`);await ready();
  await page.locator('#mine').click();await page.waitForFunction(()=>window.__cellularLab.state.revision>=1);
  const nativeWorld=await report();
  for(const hit of [[.5,1.5,0],[-.5,1.5,0]])await world(hit);
  await page.waitForFunction(()=>window.__cellularLab.state.actors.length===1);
  await page.waitForTimeout(1700);await page.locator('#focus').click();
  const nativeBefore=await report();await page.locator('#mine').click();
  await page.waitForFunction(previous=>window.__cellularLab.state.revision>previous,nativeBefore.revision,{timeout:10000});
  const nativeAfter=await report();assert.ok(nativeAfter.actors[0].contentRevision>nativeBefore.actors[0].contentRevision);
  checks.push({stage:'native Mine button targets world and fallen actor scalar field',worldRevision:nativeWorld.revision,before:nativeBefore.revision,after:nativeAfter.revision});
  await page.goto(`${base}?save=${id}-failures`);await ready();
  const failures=await page.evaluate(async()=>{
    const lab=window.__cellularLab,hit=[0,4,-1.55],baseline=JSON.stringify(lab.state),results=[];
    const run=async(name,prototype,method,replacement)=>{
      const previous=prototype[method];prototype[method]=replacement(previous);
      let result;try{result=await lab.mineAtWorld(hit);}finally{prototype[method]=previous;}
      results.push({name,status:result.status,same:JSON.stringify(lab.state)===baseline,bodyCount:lab.report().bodyCount,
        colliderRevision:lab.report().worldColliderRevision,reward:lab.state.rewards.stoneUnits});
    };
    await run('worker failure',Worker.prototype,'postMessage',()=>function(){throw new Error('injected worker failure');});
    await run('stale worker result',Worker.prototype,'postMessage',previous=>function(job,...rest){return previous.call(this,{...job,revision:job.revision-1},...rest);});
    await run('collider preparation failure',lab.physics,'prepareWorld',()=>function(){throw new Error('injected collider failure');});
    await run('real IndexedDB abort',IDBDatabase.prototype,'transaction',previous=>function(...args){const tx=previous.apply(this,args);if(args[1]==='readwrite')queueMicrotask(()=>tx.abort());return tx;});
    return results;
  });
  assert.ok(failures.every(f=>f.status==='ERROR'&&f.same&&f.bodyCount===0&&f.colliderRevision===0&&f.reward===0),JSON.stringify(failures));
  checks.push({stage:'precommit failures retain world authority and products',failures});
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);receipt.pass=true;
}catch(e){receipt.pass=false;receipt.failure=e.stack;receipt.last=await report().catch(()=>null);console.error(e);
  await page.screenshot({path:`${out}/rock-failure.png`}).catch(()=>{});process.exitCode=1;
}finally{await fs.writeFile(`${out}/playtest-cellular.json`,JSON.stringify(receipt,null,2));await browser.close();}
console.log(JSON.stringify({pass:receipt.pass,stages:checks.map(c=>c.stage),failure:receipt.failure,errors,external}));
