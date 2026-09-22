import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.VOXEL_LAB_URL||'http://localhost:8090/lab/voxel/index.html';
const out='docs/evidence/voxel-phase0';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:false,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const context=await browser.newContext({viewport:{width:1920,height:1080}}),page=await context.newPage(),errors=[],external=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(new URL(base).origin)&&!r.url().startsWith('data:'))external.push(r.url());});
const waitReady=async()=>{await page.waitForFunction(()=>window.__voxelLab?.ready&&__voxelLab.runtime.stats().chunks>0&&__voxelLab.runtime.pool.pending===0&&__voxelLab.runtime.stats().published===__voxelLab.runtime.stats().chunks,{},{timeout:120000});await page.waitForTimeout(350);};
const receipt={started:new Date().toISOString(),browser:await browser.version(),checks:[],errors,external};
try{
  await page.goto(`${base}?mesher=js-greedy&size=16&profile=desktop&save=voxel-proof-${Date.now()}`);await waitReady();
  await page.screenshot({path:`${out}/desktop-court.png`});
  // Ordinary WASD walk; aimed fixtures below are explicitly distinguished.
  const before=await page.evaluate(()=>__voxelLab.physics.playerGlobal());
  await page.keyboard.down('KeyW');await page.waitForTimeout(700);await page.keyboard.up('KeyW');
  const after=await page.evaluate(()=>({position:__voxelLab.physics.playerGlobal(),grounded:__voxelLab.physics.grounded}));
  assert.ok(after.position[2]<before[2]-1);assert.ok(after.grounded);receipt.checks.push({name:'ordinary WASD walk on Rapier voxels',before,after});
  // Aiming is a fixture; mining and collection use the actual UI controls.
  await page.evaluate(()=>{__voxelLab.fixture.setPlayer([0.5,1.82,8]);__voxelLab.fixture.look(0,-0.35);});await page.waitForTimeout(100);
  await page.locator('#mine').click();await page.waitForFunction(()=>__voxelLab.state.state.edits['0,1,5']===0);await page.waitForFunction(()=>!__voxelLab.runtime.dirty.size);
  await page.locator('#collect').click();await page.waitForFunction(()=>__voxelLab.state.state.inventory['Stone chips']===1);
  await page.evaluate(()=>{__voxelLab.fixture.setPlayer([2.5,1.82,8]);__voxelLab.fixture.look(0,-0.35);});await page.waitForTimeout(100);
  await page.locator('#mine').click();await page.waitForFunction(()=>__voxelLab.state.state.edits['2,1,5']===0);await page.waitForFunction(()=>!__voxelLab.runtime.dirty.size);
  await page.locator('#collect').click();await page.waitForFunction(()=>__voxelLab.state.state.inventory['Clay clods']===1);
  receipt.checks.push({name:'two material-specific drops via UI',inventory:await page.evaluate(()=>__voxelLab.state.state.inventory)});
  const failedSave=await page.evaluate(async()=>{
    const l=__voxelLab,before=structuredClone(l.state.state),tokens=[...l.runtime.entries].map(([k,e])=>[k,e.token]),original=IDBDatabase.prototype.transaction;let failure;
    IDBDatabase.prototype.transaction=function(...args){const tx=original.apply(this,args);if(args[1]==='readwrite')queueMicrotask(()=>tx.abort());return tx;};
    try{await l.fixture.mine([4,0,4]);}catch(error){failure=error.message;}finally{IDBDatabase.prototype.transaction=original;}
    return {failure,before,after:structuredClone(l.state.state),tokensBefore:tokens,tokensAfter:[...l.runtime.entries].map(([k,e])=>[k,e.token])};
  });assert.ok(failedSave.failure);assert.deepEqual(failedSave.before,failedSave.after);assert.deepEqual(failedSave.tokensBefore,failedSave.tokensAfter);receipt.checks.push({name:'aborted real IndexedDB transaction preserves voxel, drops and publication',...failedSave});
  await page.evaluate(()=>{__voxelLab.fixture.fly(true);__voxelLab.fixture.setPlayer([9,6,9]);__voxelLab.fixture.look(0.53,-0.25);document.querySelector('details').open=false;});await page.waitForTimeout(150);await page.screenshot({path:`${out}/bridge-before.png`});
  await page.evaluate(()=>{__voxelLab.fixture.fly(false);document.querySelector('details').open=true;});
  await page.evaluate(()=>{__voxelLab.fixture.setPlayer([-1.5,1.82,0.5]);__voxelLab.fixture.look(0,0);});await page.locator('#tool').selectOption('axe');await page.waitForTimeout(150);
  await page.locator('#mine').click();await page.waitForFunction(()=>__voxelLab.state.state.actors.length===1);await page.waitForFunction(()=>!__voxelLab.runtime.dirty.size);
  const detached=await page.evaluate(()=>__voxelLab.physics.poses());await page.waitForTimeout(3500);const fallen=await page.evaluate(()=>__voxelLab.physics.poses());
  assert.ok(fallen[0].position[1]<detached[0].position[1]-1);receipt.checks.push({name:'UI axe cuts support into one falling compound',detached,fallen});
  await page.screenshot({path:`${out}/desktop-collapse.png`});
  await page.evaluate(()=>{__voxelLab.fixture.fly(true);__voxelLab.fixture.setPlayer([9,6,9]);__voxelLab.fixture.look(0.53,-0.25);document.querySelector('details').open=false;});await page.waitForTimeout(150);await page.screenshot({path:`${out}/bridge-after.png`});
  await page.evaluate(()=>{__voxelLab.fixture.fly(false);__voxelLab.fixture.setPlayer([-1.5,1.82,0.5]);document.querySelector('details').open=true;});
  // Rapid boundary transactions, while workers are in flight.
  const rapid=await page.evaluate(async()=>{
    const lab=__voxelLab,cells=[[-1,0,0],[0,0,0],[1,0,0],[-1,0,-1],[0,0,-1],[1,0,-1]];
    await Promise.all(cells.map(cell=>lab.fixture.mine(cell)));return {cells,worker:lab.runtime.stats().worker};
  });await waitReady();
  const pairs=await page.evaluate(()=>[...__voxelLab.runtime.entries.values()].map(e=>({key:e.key,requested:e.token,mesh:e.revision,collider:__voxelLab.physics.chunks.get(e.key)?.revision})));
  assert.ok(pairs.every(p=>p.mesh===p.collider&&p.mesh===p.requested));
  const removed=await page.evaluate(cells=>cells.map(cell=>({cell,material:__voxelLab.state.read(...cell)})),rapid.cells);assert.ok(removed.every(p=>p.material===0));
  receipt.checks.push({name:'rapid negative boundary edits publish latest requested revisions',...rapid,pairs,removed});
  const surface=await page.evaluate(async()=>{
    const THREE=await import('../../vendor/three.module.js');const R=(await import('../../vendor/rapier.js')).default;
    const origin=new THREE.Vector3(0.5,1.3,0.5),direction=new THREE.Vector3(0,-1,0),ray=new THREE.Raycaster(origin,direction,0,4);
    const mesh=ray.intersectObjects([...__voxelLab.runtime.entries.values()].map(e=>e.mesh).filter(Boolean))[0];
    const physical=__voxelLab.physics.world.castRay(new R.Ray({x:0.5,y:1.3,z:0.5},{x:0,y:-1,z:0}),4,true);
    return {meshDistance:mesh?.distance,colliderDistance:physical?.timeOfImpact,worker:__voxelLab.runtime.stats().worker};
  });assert.ok(surface.meshDistance>1.2);assert.ok(surface.colliderDistance>1.2);assert.ok(Math.abs(surface.meshDistance-surface.colliderDistance)<0.001);assert.ok(surface.worker.stale>0||surface.worker.cancelledQueued>0);
  receipt.checks.push({name:'removed boundary surface absent in both Three and Rapier raycasts',...surface});
  const cancellation=await page.evaluate(()=>{const l=__voxelLab,before={...l.runtime.pool.stats};l.runtime.stream([512,512,512]);l.runtime.stream(l.physics.playerGlobal());return {before,after:{...l.runtime.pool.stats}};});
  assert.ok(cancellation.after.cancelledRunning>cancellation.before.cancelledRunning);await waitReady();receipt.checks.push({name:'actual in-flight workers terminated on unload then rebuilt',...cancellation});
  const beforeShift=await page.evaluate(()=>({player:__voxelLab.physics.playerGlobal(),poses:__voxelLab.physics.poses(),edits:__voxelLab.state.state.edits}));
  await page.locator('#origin').click();await page.waitForFunction(()=>__voxelLab.physics.origin[0]===256);
  const afterShift=await page.evaluate(()=>({player:__voxelLab.physics.playerGlobal(),poses:__voxelLab.physics.poses(),edits:__voxelLab.state.state.edits,origin:__voxelLab.physics.origin}));
  assert.deepEqual(afterShift.edits,beforeShift.edits);assert.ok(afterShift.player.every((v,i)=>Math.abs(v-beforeShift.player[i])<0.05));receipt.checks.push({name:'fixed-step origin shift preserves global state',before:beforeShift,after:afterShift});
  await page.locator('#reload').click();await page.waitForLoadState('domcontentloaded');await waitReady();
  const restored=await page.evaluate(()=>__voxelLab.state.state);assert.deepEqual(restored.edits,beforeShift.edits);assert.equal(restored.inventory['Stone chips'],1);assert.equal(restored.inventory['Clay clods'],1);assert.equal(restored.actors.length,1);
  receipt.checks.push({name:'literal reload from IndexedDB',restored});
  // Actual worker-count and visit-order determinism; no main-thread substitute.
  receipt.workerHashes=await page.evaluate(async()=>{
    async function run(count){
      const jobs=[[-1,-1,-1],[0,0,0],[1,-2,1],[-3,2,-1]],workers=Array.from({length:count},()=>new Worker(new URL('./worker.js',location.href),{type:'module'}));
      const values={};
      await Promise.all(workers.map(async(worker,index)=>{for(let i=index;i<jobs.length;i+=count){const chunk=jobs[i];const result=await new Promise((resolve,reject)=>{worker.onmessage=e=>e.data.error?reject(new Error(e.data.error)):resolve(e.data);worker.onerror=reject;worker.postMessage({id:i,key:chunk.join(','),token:1,size:16,seed:9212026,chunk,edits:{},mesher:'js-greedy'});});values[result.key]={voxels:result.hash,mesh:result.meshHash};}worker.terminate();}));return values;
    }return {one:await run(1),four:await run(4)};
  });assert.deepEqual(receipt.workerHashes.one,receipt.workerHashes.four);
  receipt.final=await page.evaluate(()=>__voxelLab.report());
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);receipt.pass=true;
}catch(error){receipt.pass=false;receipt.failure=error.stack;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});console.error(error);process.exitCode=1;}
finally{await fs.writeFile(`${out}/playtest.json`,JSON.stringify(receipt,null,2));await browser.close();}
console.log(JSON.stringify({pass:receipt.pass,checks:receipt.checks.map(c=>c.name),errors,external}));
