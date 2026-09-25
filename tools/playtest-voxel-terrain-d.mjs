import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const out='docs/evidence/voxel-phase05d/source';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[],externalRequests=[],consoleErrors=[],stages=[];
page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
page.on('request',request=>{if(new URL(request.url()).origin!=='http://localhost:8099')externalRequests.push(request.url());});
const inspect=()=>page.evaluate(()=>window.__voxelTerrainLab.inspect());
async function screenshot(name){await page.waitForTimeout(180);await page.screenshot({path:`${out}/${name}.png`});}
async function stage(name,extra={}){const state=await inspect();stages.push({name,revision:state.revision,hit:state.hit,actorHit:state.actorHit,collision:state.collision,dirtyChunkIds:state.dirtyChunkIds,
  supportEvidence:state.lastEvent?.supportEvidence??null,actorCount:state.actorCount,bodyCount:state.bodyCount,ledger:state.ledger,...extra});return state;}
async function focus(point,distance=8,view={}){await page.evaluate(({point,distance,view})=>window.__voxelTerrainLab.focus(point,distance,view),{point,distance,view});await page.waitForTimeout(100);return inspect();}
async function editAt(name,point,{distance=8,view={},expectedDirtyCount=null}={}){
  const before=await inspect(),beforeRevision=before.revision;let state=await focus(point,distance,view);
  if(!state.hit)throw new Error(`${name}: crosshair has no terrain hit at ${JSON.stringify(point)}`);
  const editHit=state.hit;
  await page.locator(state.hit.material===1?'#rock':'#dirt').click();await page.mouse.click(720,450);
  await page.waitForFunction(revision=>document.querySelector('#stats')?.textContent.includes(`world revision: ${revision}`),beforeRevision+1,{timeout:20000});
  state=await inspect();if(state.revision!==beforeRevision+1)throw new Error(`${name}: edit did not commit`);
  if(expectedDirtyCount!==null&&state.dirtyChunkIds.length!==expectedDirtyCount)throw new Error(`${name}: expected ${expectedDirtyCount} dirty chunks, got ${state.dirtyChunkIds.join(',')}`);
  stages.push({name,revision:state.revision,hit:editHit,changedSamples:state.lastEvent?.changedSamples??[],
    dirtyChunkIds:state.dirtyChunkIds,remeshedChunkIds:state.lastEvent?.remeshedChunkIds??[],rebuiltColliderChunkIds:state.lastEvent?.rebuiltColliderChunkIds??[],
    supportEvidence:state.lastEvent?.supportEvidence??null,ledger:state.ledger,meshMs:state.lastEvent?.meshMs??{},colliderMs:state.lastEvent?.colliderMs??{},
    persistenceMs:state.lastEvent?.persistenceMs??null,transactionMs:state.lastEvent?.transactionMs??null});return state;
}
try{
  await page.addInitScript(()=>{if(!sessionStorage.getItem('voxel-evidence-clean')){localStorage.clear();sessionStorage.setItem('voxel-evidence-clean','1');}});
  await page.goto('http://localhost:8099/lab/voxel/cellular-terrain.html',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#message')?.textContent.startsWith('Ready'),null,{timeout:60000});await page.waitForTimeout(500);
  await screenshot('01-pristine');await stage('01-pristine');
  await page.locator('#grid').click();await screenshot('02-chunk-grid');await stage('02-chunk-grid');await page.locator('#grid').click();
  await focus([8,4.8,5],5.5);await screenshot('03-material-seam-debug-off');const seamStage=await stage('03-material-seam-debug-off');
  if(!seamStage.hit||!seamStage.collision||Math.abs(seamStage.hit.distance-seamStage.collision.distance)>.3)
    throw new Error('Visible and Rapier rays disagree across the unedited material chunk seam');
  await page.locator('#grid').click();await screenshot('03b-material-seam-debug-on');await stage('03b-material-seam-debug-on');await page.locator('#grid').click();

  const interior=await editAt('04-interior-edit',[2.5,4.8,5],{expectedDirtyCount:1});await screenshot('04-interior-one-chunk');
  const xSeam=await editAt('05-x-boundary-edit',[8,4.8,5],{expectedDirtyCount:2});await screenshot('05-x-seam-two-chunks');
  await page.locator('#dirty').click();await screenshot('05b-x-seam-dirty-view');await page.locator('#dirty').click();
  const corner=await editAt('06-real-xz-corner-edit',[7.8,4.8,10],{expectedDirtyCount:4});await screenshot('06-xz-corner-four-chunks');
  await page.locator('#dirty').click();await screenshot('06b-xz-corner-dirty-view');await page.locator('#dirty').click();

  const trench=[];await focus([0,4.8,-4],8);await screenshot('07-trench-start');
  for(let z=-4;z<=14;z+=1){const state=await editAt(`trench-z-${z}`,[0,4.8,z]);trench.push({z,changedSamples:state.lastEvent.changedSamples,dirtyChunkIds:state.dirtyChunkIds});
    if(z===0)await screenshot('08-trench-first-seam');if(z===12)await screenshot('09-trench-second-seam');}
  await focus([0,4.8,5],8);await screenshot('10-cross-seam-cavity-collision');
  const cavity=await inspect();if(!cavity.hit||!cavity.collision||Math.abs(cavity.hit.distance-cavity.collision.distance)>.3)
    throw new Error('Rapier collision and visible terrain disagree inside the two-seam trench');
  const trenchSamples=trench.flatMap(item=>item.changedSamples),trenchDirty=[...new Set(trench.flatMap(item=>item.dirtyChunkIds))].sort();
  const trenchChunkZ=[...new Set(trenchSamples.map(([, ,z])=>Math.floor(z/16)))].sort((a,b)=>a-b);
  if(trenchChunkZ.length<3)throw new Error(`Trench did not cross two Z chunk boundaries; changed sample chunks: ${trenchChunkZ}`);

  await focus([8.05,5,1.1],8);await screenshot('11-seam-boulder-supported');await stage('11-seam-boulder-supported');
  const partial=await editAt('12-partial-dirt-excavation',[7.5,4.5,1.1]);await screenshot('12-partial-excavation-supported');
  if(partial.lastEvent.supportEvidence?.rockSupported!==true)throw new Error('Partial dirt excavation detached the seam boulder too early');
  const detached=await editAt('13-support-removal',[8.05,4.5,1.1],{view:{yaw:1.57,pitch:.1}});
  const detachStage=stages.at(-1);if(detachStage.hit.material!==2)throw new Error('The browser support-removal action must excavate dirt, not rock');
  if(detached.actorCount!==1||detached.lastEvent.supportEvidence?.rockSupported!==false||
    detached.lastEvent.supportEvidence?.transferredRockParcels!==detached.actors[0]?.transferredParcelCount)
    throw new Error('Bounded support analysis did not transfer the complete unsupported seam rock component');
  await screenshot('14-rock-transfer-out-of-chunks');await page.locator('#grid').click();await screenshot('15-post-transfer-dirt-support');await page.locator('#grid').click();
  const cavitySamples=await page.evaluate(()=>window.__voxelTerrainLab.read([[17,11,2],[18,11,2],[19,11,2]]));
  await page.waitForTimeout(450);const falling=await inspect();await screenshot('16-matter-actor-falling');
  const comTravel=Math.hypot(...falling.actors[0].worldCOM.map((v,i)=>v-detached.actors[0].worldCOM[i]));
  await page.waitForTimeout(8000);const settled=await inspect();await screenshot('17-matter-actor-settled');
  const actorBefore=settled.actors[0];if(!actorBefore||settled.bodyCount!==1||!settled.sameRapierWorld)throw new Error('MatterActor body is absent from the terrain Rapier world');
  const speed=Math.hypot(...actorBefore.pose.linearVelocity,...actorBefore.pose.angularVelocity);
  if(comTravel<.08||actorBefore.contactingTerrainChunkIds.length<2||speed>.12||!actorBefore.worldCOM.every(Number.isFinite))
    throw new Error(`MatterActor physics proof failed: travel=${comTravel}, speed=${speed}, contacts=${actorBefore.contactingTerrainChunkIds}`);

  const reuse=await editAt('18-unrelated-terrain-edit',[3,4.5,-7]);
  const actorAfterReuse=reuse.actors[0];if(reuse.lastEvent.preparedActorIds.length!==0||!reuse.lastEvent.reusedActorIds.includes(actorBefore.id)||actorAfterReuse.bodyHandle!==actorBefore.bodyHandle)
    throw new Error('Unrelated terrain edit recreated the unchanged MatterActor body');
  await screenshot('18-unrelated-edit-actor-reused');

  const current=reuse.actors[0];await focus(current.worldCOM,6,{yaw:0,pitch:.1});let target=await inspect();
  if(!target.actorHit||target.actorHit.distance>=(target.hit?.distance??Infinity)){
    for(const yaw of [1.57,3.14,-1.57]){await focus(current.worldCOM,6,{yaw,pitch:.1});target=await inspect();if(target.actorHit&&target.actorHit.distance<(target.hit?.distance??Infinity))break;}
  }
  if(!target.actorHit||target.actorHit.distance>=(target.hit?.distance??Infinity))throw new Error('Moved MatterActor scalar surface was not targetable');
  await page.locator('#rock').click();await page.mouse.click(720,450);await page.waitForTimeout(1200);const mined=await inspect();
  if(mined.lastEvent?.dirtyChunkIds.length!==0||!mined.lastEvent?.actorMining?.stress?.visitedNodes)throw new Error('Moved actor mining did not use the C.1R stress/content path');
  await screenshot('19-moved-actor-mined');await stage('19-moved-actor-mined',{actorMining:mined.lastEvent.actorMining});
  const oldVolume=await page.evaluate(()=>window.__voxelTerrainLab.read([[15,11,2],[16,11,2],[17,11,2]]));
  if(oldVolume.some(value=>value.material===1&&value.density<0))throw new Error('Detached rock regenerated in its original world volume');
  await focus([8.05,5,1.1],8);await screenshot('20-original-rock-location-empty');await stage('20-original-rock-location-empty',{oldVolume});
  const saveBefore=await page.evaluate(()=>window.__voxelTerrainLab.save());await page.locator('#save').click();
  await page.waitForFunction(()=>document.querySelector('#message')?.textContent.startsWith('Ready'),null,{timeout:30000});await page.waitForTimeout(500);
  const reloaded=await inspect();if(reloaded.actorCount!==saveBefore.actors.length||reloaded.ledger.rock.actors!==saveBefore.ledger.ownerIds.filter(value=>value>2).length)
    throw new Error('Reload did not restore actor count or ownership ledger');
  const reloadedSave=await page.evaluate(()=>window.__voxelTerrainLab.save()),durableSave=await page.evaluate(()=>JSON.parse(localStorage.getItem('wildkin-frontier-voxel-05d-v2'))),
    reloadedOldVolume=await page.evaluate(()=>window.__voxelTerrainLab.read([[15,11,2],[16,11,2],[17,11,2]]));
  if(JSON.stringify(reloaded.ledger)!==JSON.stringify(mined.ledger)||JSON.stringify(reloadedSave.rewards)!==JSON.stringify(durableSave.rewards))throw new Error('Reload changed material ownership or rewards');
  const restoredActor=reloaded.restoredRuntimeState?.actors[0],restoredPose=reloaded.restoredRuntimeState?.rapierPoses[durableSave.actors[0].id],
    structureMatches=JSON.stringify(restoredActor?.structure)===JSON.stringify(durableSave.actors[0]?.structure),
    positionDelta=restoredPose?.position.map((value,i)=>value-durableSave.actors[0].position[i]),
    oldCavityAir=reloadedOldVolume.every(value=>value.material===0&&value.density>=0);
  if(restoredActor?.material!==durableSave.actors[0]?.material||!structureMatches||positionDelta?.some(value=>Math.abs(value)>1e-5)||!oldCavityAir)
    throw new Error(`Reload consistency failed: ${JSON.stringify({material:[restoredActor?.material,durableSave.actors[0]?.material],structureMatches,positionDelta,oldCavityAir,reloadedOldVolume})}`);
  await screenshot('21-reloaded-terrain-and-moved-actor');await stage('21-reloaded-terrain-and-moved-actor',{savedRevision:saveBefore.revision,reloadedActorPose:reloaded.actors[0]?.pose});
  await page.locator('#grid').click();await screenshot('22-final-grid-proof');await stage('22-final-grid-proof');

  const receipt={url:page.url(),pageErrors:errors,consoleErrors,externalRequests,stages,chunkDimensions:[16,16,16],spacing:.5,
    dirtyProof:{interior:interior.lastEvent.dirtyChunkIds,xSeam:xSeam.lastEvent.dirtyChunkIds,xzCorner:corner.lastEvent.dirtyChunkIds,
      trenchChangedSampleChunkZ:trenchChunkZ,trenchDirtyChunkIds:trenchDirty,twoSeamsCrossed:trenchChunkZ.length>=3,
      uneditedMaterialSeamCollision:{renderDistance:seamStage.hit.distance,rapierDistance:seamStage.collision.distance,delta:Math.abs(seamStage.hit.distance-seamStage.collision.distance)},
      cavityCollision:{renderDistance:cavity.hit.distance,rapierDistance:cavity.collision.distance,delta:Math.abs(cavity.hit.distance-cavity.collision.distance)}},
    boulder:{partialSupported:partial.lastEvent.supportEvidence.rockSupported,unsupported:!detached.lastEvent.supportEvidence.rockSupported,
      supportBounds:detached.lastEvent.supportEvidence.bounds,supportWorkUnits:detached.lastEvent.supportEvidence.totalWorkUnits,
      transferredRockProbes:detached.actors[0]?.transferredParcelCount,actorCount:detached.actorCount,postTransferDirtConsumed:detached.lastEvent.supportEvidence.postTransferDirtConsumed,
      oldVolumeAfterTransfer:cavitySamples,oldVolumeAfterMined:oldVolume},
    physics:{sameRapierWorld:settled.sameRapierWorld,staticColliderCount:settled.staticColliderCount,
      contactingTerrainChunkIds:actorBefore.contactingTerrainChunkIds,comTravelWhileFalling:comTravel,settledLinearAngularSpeed:speed,
      unrelatedEditReusedBody:actorAfterReuse.bodyHandle===actorBefore.bodyHandle,movedActorMining:true},
    persistence:{savedRevision:saveBefore.revision,reloadedRevision:reloaded.revision,actorCount:reloaded.actorCount,
      ledger:reloaded.ledger,rewards:reloadedSave.rewards,actorMaterial:reloadedSave.actors[0]?.material,
      actorStructure:reloadedSave.actors[0]?.structure,pose:reloaded.actors[0]?.pose,oldVolumeAfterReload:reloadedOldVolume},performance:{ledgerTypedArrayBytes:reloaded.ledgerBytes,
      localSupportQueries:stages.map(value=>value.supportEvidence).filter(Boolean),terrainTransactions:stages.filter(value=>value.changedSamples).map(value=>({name:value.name,
        dirtyChunkIds:value.dirtyChunkIds,meshMs:value.meshMs,colliderMs:value.colliderMs,persistenceMs:value.persistenceMs,transactionMs:value.transactionMs}))},limitations:[
      'Fixed 3x3 patch, one vertical chunk, and 0.5 m samples; no streaming or mobile-readiness claim.',
      'Actor collision uses the existing approximate four-sector convex proxy, not exact voxel collision.',
      'Browser timing comes from headless SwiftShader and is observational rather than a performance target.'
    ]};
  await writeFile(`${out}/receipt.json`,JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
}catch(error){
  const report={error:error.message,pageErrors:errors,consoleErrors,externalRequests,stages,body:await page.locator('body').innerText().catch(()=>''),inspect:await inspect().catch(()=>null)};
  await writeFile(`${out}/receipt.failed.json`,JSON.stringify(report,null,2));console.error(JSON.stringify(report));throw error;
}finally{await browser.close();}
