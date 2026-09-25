import { chromium } from 'playwright';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { TERRAIN_COLLAPSE_POLICY } from '../lab/voxel/terrain-collapse.js';

const output='docs/evidence/voxel-phase05e/source';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const pageErrors=[],consoleErrors=[],externalRequests=[],stages=[],structuralTransactions=[],screenshotPaths=[];
page.on('pageerror',error=>pageErrors.push(error.message));
page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
page.on('request',request=>{if(new URL(request.url()).origin!=='http://localhost:8099')externalRequests.push(request.url());});
const inspect=()=>page.evaluate(()=>window.__voxelTerrainLab.inspect());
const exportSave=()=>page.evaluate(()=>window.__voxelTerrainLab.save());
async function screenshot(name){await page.waitForTimeout(180);const path=`${output}/${name}.png`;await page.screenshot({path});screenshotPaths.push(path);}
function capture(name,state,extra={}){
  if(state.actorParcelMaterialAudit?.valid===false)throw new Error(`${name}: actor parcel material ownership differs from ledger`);
  const actorMaterialCounts=state.actors.reduce((counts,actor)=>({rock:counts.rock+actor.materialParcelCounts.rock,dirt:counts.dirt+actor.materialParcelCounts.dirt}),{rock:0,dirt:0});
  if(actorMaterialCounts.rock!==state.ledger.rock.actors||actorMaterialCounts.dirt!==state.ledger.dirt.actors)
    throw new Error(`${name}: actor material parcel counts differ from the exact ownership ledger`);
  const stage={name,revision:state.revision,hit:state.hit,actorHit:state.actorHit,collision:state.collision,
    actors:state.actors.map(actor=>({id:actor.id,material:actor.material,materialParcelCounts:actor.materialParcelCounts,
      pose:actor.pose,worldCOM:actor.worldCOM,bodyHandle:actor.bodyHandle,contactingTerrainChunkIds:actor.contactingTerrainChunkIds,
      materialLabelDriftProbes:actor.materialLabelDriftProbes})),actorParcelMaterialAudit:state.actorParcelMaterialAudit,
    actorCount:state.actorCount,bodyCount:state.bodyCount,ledger:state.ledger,lastEvent:state.lastEvent??null,...extra};
  stages.push(stage);return stage;
}
async function aim(point,distance,view){
  await page.evaluate(value=>window.__voxelTerrainLab.focus(value.point,value.distance,value.view),{point,distance,view});
  await page.waitForTimeout(35);return inspect();
}
async function aimVisibleDirt(point,distance,view){
  const candidates=[{point,view},{point,view:{...view,yaw:view.yaw+Math.PI}}];
  for(const yOffset of [.45,-.45,.9])for(const yaw of [view.yaw,view.yaw+Math.PI])
    candidates.push({point:[point[0],point[1]+yOffset,point[2]],view:{...view,yaw}});
  let last=null,nearestHit=null;
  for(const candidate of candidates){const state=await aim(candidate.point,distance,candidate.view);last=state;
    if(state.hit){const gap=Math.hypot(...state.hit.point.map((value,index)=>value-point[index]));
      if(!nearestHit||gap<nearestHit.gap)nearestHit={gap,point:candidate.point,distance,view:candidate.view,hit:state.hit};
      if(state.hit.material===2)return {...candidate,state,nearestHit};}}
  return {point,distance,view,state:last,nearestHit};
}
async function terrainClick(name,point,distance,view,screenshotName=null){
  const target=await aimVisibleDirt(point,distance,view),before=target.state;
  if(!before?.hit||before.hit.material!==2)throw new Error(`${name}: expected an exposed dirt face, found ${JSON.stringify({hit:before?.hit,nearestHit:target.nearestHit})}`);
  const visibleHit=before.hit,revision=before.revision;
  await page.locator('#dirt').click();await page.mouse.click(720,450);
  await page.waitForFunction(next=>window.__voxelTerrainLab.inspect().revision===next,revision+1,{timeout:60000});
  const after=await inspect(),transaction=after.lastEvent;
  structuralTransactions.push({name,input:'ordinary canvas click with dirt tool',requestedTarget:point,target:target.point,camera:target.view,visibleHit,
    worldRevision:transaction.worldRevision,directChangedSamples:transaction.directChangedSamples,
    support:{seedCells:transaction.supportEvidence.seedCells,initialBounds:transaction.supportEvidence.initialBounds,
      finalBounds:transaction.supportEvidence.finalBounds,expansions:transaction.supportEvidence.expansions,
      sampleCount:transaction.supportEvidence.sampleCount,cellCount:transaction.supportEvidence.cellCount,
      bondCount:transaction.supportEvidence.bondCount,workUnits:transaction.supportEvidence.workUnits,
      readChunkIds:transaction.supportEvidence.readChunkIds,status:transaction.supportEvidence.status,
      queries:transaction.supportEvidence.queries},
    collapse:{candidateCount:transaction.collapseEvidence.candidateCount,persistentCount:transaction.collapseEvidence.persistentCount,
      transientCount:transaction.collapseEvidence.transientCount,crumbleCount:transaction.collapseEvidence.crumbleCount,
      deferredCount:transaction.collapseEvidence.deferredCount,components:transaction.collapseEvidence.components,
      status:transaction.collapseEvidence.status},
    publication:{directDirtyChunkIds:transaction.directDirtyChunkIds,collapseDirtyChunkIds:transaction.collapseDirtyChunkIds,
      finalDirtyChunkIds:transaction.finalDirtyChunkIds,reusedChunkIds:transaction.unchangedChunkIds,
      actorPreparedIds:transaction.preparedActorIds,actorReusedIds:transaction.reusedActorIds,actorRetiredIds:transaction.retiredActorIds},
    ledger:transaction.ledger,timings:transaction.timings});
  capture(name,after,{visibleHit});if(screenshotName)await screenshot(screenshotName);return after;
}
function speed(pose){return Math.hypot(...pose.linearVelocity,...pose.angularVelocity);}
function quaternionTravel(a,b){const dot=Math.min(1,Math.abs(a.x*b.x+a.y*b.y+a.z*b.z+a.w*b.w));return 2*Math.acos(dot);}
async function targetActorMaterial(material){
  const current=await inspect(),actor=current.actors.find(value=>value.material===3&&value.materialParcelCounts?.[material===1?'rock':'dirt']>0)??
    current.actors.find(value=>value.material===material);
  if(!actor)throw new Error(`No live MatterActor exposes ${material===1?'rock':'dirt'}`);
  const viewCandidates=[];
  for(const distance of [4,6,8])for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2])for(const pitch of [-.1,.15,.4]){
    const state=await aim(actor.worldCOM,distance,{yaw,pitch});
    if(state.actorHit?.material===material&&state.actorHit.distance<(state.hit?.distance??Infinity))
      viewCandidates.push({state,distance,yaw,pitch,score:state.actorHit.distance});
  }
  viewCandidates.sort((a,b)=>a.score-b.score);const candidate=viewCandidates[0];
  if(!candidate)throw new Error(`No clean crosshair view resolved the moved ${material===1?'rock':'dirt'} surface`);
  await aim(actor.worldCOM,candidate.distance,{yaw:candidate.yaw,pitch:candidate.pitch});
  const state=await inspect();
  return {actor,state,view:{distance:candidate.distance,yaw:candidate.yaw,pitch:candidate.pitch}};
}
async function actorClick(name,material,screenshotName){
  const target=await targetActorMaterial(material),before=target.state,revision=before.revision;
  await screenshot(screenshotName);capture(`${name}-target`,before,{targetMaterial:material,targetView:target.view});
  await page.locator(material===1?'#rock':'#dirt').click();await page.mouse.click(720,450);
  await page.waitForFunction(next=>window.__voxelTerrainLab.inspect().revision===next,revision+1,{timeout:60000});
  const after=await inspect();if(after.lastEvent.actorMining?.material!==material)throw new Error(`${name}: actor selected the wrong material strategy`);
  if(material===1&&!after.lastEvent.actorMining.stress?.visitedNodes)throw new Error('Rock hit did not run the hard-rock structural stress path');
  capture(name,after,{targetMaterial:material,targetView:target.view});await screenshot(`${screenshotName}-after`);return after;
}
async function findCavityRay(){
  const staticHandles=new Set(Object.values((await inspect()).staticChunkColliderHandles??{}));
  for(const point of [[0,4,9],[0,3.5,9],[2,4,9],[-2,4,9],[0,4,7],[0,4,11]])
    for(const yaw of [-Math.PI/2,0,Math.PI/2,Math.PI])for(const pitch of [-.1,.15,.4])for(const distance of [6,10]){
      const state=await aim(point,distance,{yaw,pitch});
      if(state.hit&&state.collision&&staticHandles.has(state.collision.collider)&&Math.abs(state.hit.distance-state.collision.distance)<=.3)
        return {state,point,distance,yaw,pitch,delta:Math.abs(state.hit.distance-state.collision.distance)};
    }
  return null;
}
try{
  await page.addInitScript(()=>{if(!sessionStorage.getItem('voxel-evidence-clean')){
    localStorage.clear();sessionStorage.setItem('voxel-evidence-clean','1');}});
  await page.goto('http://localhost:8099/lab/voxel/cellular-terrain.html',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#message')?.textContent.startsWith('Ready'),null,{timeout:60000});
  await page.evaluate(()=>window.__voxelTerrainLab.focus([0,5,9],18,{yaw:-.55,pitch:.15}));await page.waitForTimeout(200);
  await screenshot('01-pristine-terrain-overview');capture('01-pristine-terrain-overview',await inspect());
  await screenshot('02-collapse-ledge-chunk-grid-off');capture('02-collapse-ledge-chunk-grid-off',await inspect());
  await page.locator('#grid').click();await screenshot('03-collapse-ledge-chunk-grid-on');capture('03-collapse-ledge-chunk-grid-on',await inspect());
  await page.locator('#grid').click();

  const inputs=[
    {name:'04-first-undermining-scoop',point:[6.2,4.2,9],view:{yaw:-Math.PI/2,pitch:-.1},screenshot:'04-first-undermining-scoop'},
    {name:'undermining-pass-2',point:[6.8,4.2,9],view:{yaw:-Math.PI/2,pitch:-.1}},
    {name:'05-larger-cavity-still-supported',point:[7.4,4.2,9],view:{yaw:-Math.PI/2,pitch:-.1},screenshot:'05-larger-cavity-still-supported'},
    {name:'06-dirt-neck-excavation',point:[6.2,4.7,9],view:{yaw:-Math.PI/2,pitch:-.1},screenshot:'06-dirt-neck-progress'},
    {name:'07-near-failure-support-state',point:[6.8,4.7,9],view:{yaw:-Math.PI/2,pitch:-.1},screenshot:'07-near-failure-support-state'},
    {name:'08-final-support-connection-removed',point:[7.4,4.7,9],view:{yaw:-Math.PI/2,pitch:-.1},screenshot:'08-final-support-cut'}
  ];
  let preCollapse=null,collapseState=null;
  for(let index=0;index<inputs.length;index++){
    const step=inputs[index],state=await terrainClick(step.name,step.point,step.distance??8,step.view,step.screenshot??null);
    if(!state.actorCount)preCollapse=state;
    if(state.actorCount){collapseState=state;break;}
  }
  if(!collapseState?.actorCount)throw new Error('Ordinary shovel inputs did not detach the ledge component');
  const collapseEvent=collapseState.lastEvent,slab=collapseState.actors[0];
  if(slab.material!==3)throw new Error(`Expected a mixed MatterActor, found material ${slab.material}`);
  if(!slab.materialParcelCounts.rock||!slab.materialParcelCounts.dirt)throw new Error('Detached slab does not own both rock and dirt parcels');
  if(preCollapse?.actorCount)throw new Error('The ledge detached before the final visible support cut');
  const originalChunks=[...new Set(Object.values((await exportSave()).actors[0].parcelIds).map(address=>{
    const cell=address.split(':')[0].split(',').map(Number);return cell.map(value=>Math.floor(value/16)).join(',');
  }))].sort();
  const initialPose=slab.pose,initialCOM=slab.worldCOM;
  await aim(initialCOM,14,{yaw:-.65,pitch:.44});await screenshot('09-slab-separating');capture('09-slab-separating',await inspect());
  await page.waitForTimeout(650);const falling=await inspect();await aim(falling.actors[0].worldCOM,14,{yaw:-.65,pitch:.44});await screenshot('10-slab-falling');capture('10-slab-falling',await inspect());
  await page.waitForTimeout(1100);const contacting=await inspect();await aim(contacting.actors[0].worldCOM,14,{yaw:-.65,pitch:.44});await screenshot('11-slab-contacting-chunks');capture('11-slab-contacting-chunks',await inspect());
  let settled=contacting,settledTicks=0;
  for(let wait=0;wait<120;wait++){
    await page.waitForTimeout(150);settled=await inspect();const actor=settled.actors[0];
    if(actor&&speed(actor.pose)<.12&&actor.contactingTerrainChunkIds.length>=1)settledTicks++;else settledTicks=0;
    if(settledTicks>=2)break;
  }
  await aim(settled.actors[0].worldCOM,14,{yaw:-.65,pitch:.44});await screenshot('12-slab-settled');capture('12-slab-settled',await inspect());
  const resting=settled.actors[0],fallDistance=initialCOM[1]-resting.worldCOM[1],rotationRadians=quaternionTravel(initialPose.rotation,resting.pose.rotation);
  if(!settled.sameRapierWorld||settled.bodyCount!==settled.actorCount||resting.bodyHandle!==slab.bodyHandle)
    throw new Error('Detached slab is not in the terrain Rapier world or its body changed during free fall');
  if(fallDistance<.08||resting.contactingTerrainChunkIds.length<2||speed(resting.pose)>.12||settledTicks<2)
    throw new Error(`Slab did not demonstrate a multi-chunk settle: ${JSON.stringify({fallDistance,contacts:resting.contactingTerrainChunkIds,speed:speed(resting.pose),settledTicks})}`);

  const cavitySamples=collapseEvent.collapseChangedSamples,remainingWorld=await page.evaluate(points=>window.__voxelTerrainLab.read(points),cavitySamples);
  if(remainingWorld.some(value=>value.density<0))throw new Error('A transferred collapse sample remains occupied in static world terrain');
  const cavityRay=await findCavityRay();if(!cavityRay)throw new Error('No cavity ray found with visible terrain and static Rapier distance agreement');
  await screenshot('13-post-collapse-cavity-static-collision');capture('13-post-collapse-cavity-static-collision',cavityRay.state,{cavityRay:{point:cavityRay.point,yaw:cavityRay.yaw,pitch:cavityRay.pitch,
    renderDistance:cavityRay.state.hit.distance,rapierDistance:cavityRay.state.collision.distance,delta:cavityRay.delta}});
  await page.locator('#dirty').click();await screenshot('14-collapse-write-chunk-overlay');capture('14-collapse-write-chunk-overlay',await inspect());await page.locator('#dirty').click();
  await page.locator('#support').click();await screenshot('15-structural-read-window-overlay');capture('15-structural-read-window-overlay',await inspect());await page.locator('#support').click();

  const dirtMined=await actorClick('16-moved-slab-dirt-edit',2,'16-moved-slab-dirt-target');
  const rockMined=await actorClick('17-moved-slab-rock-edit',1,'17-moved-slab-rock-target');
  const finalActors=rockMined.actors;
  await screenshot('18-slab-after-recursive-edits');capture('18-slab-after-recursive-edits',rockMined);
  const stateBeforeSave=await inspect(),saveBefore=await exportSave();
  await screenshot('19-save-before-reload');capture('19-save-before-reload',stateBeforeSave,{savedRevision:saveBefore.revision,rewards:saveBefore.rewards,
    retiredActorIds:saveBefore.retiredActorIds});
  await page.locator('#save').click();
  await page.waitForFunction(()=>window.__voxelTerrainLab?.lastSavedState?.actors?.length>0,null,{timeout:60000});
  const persistedSave=await page.evaluate(()=>window.__voxelTerrainLab.lastSavedState);
  await page.waitForFunction(revision=>document.querySelector('#message')?.textContent.startsWith(`Ready · 9 independent chunk products · world revision ${revision}.`),saveBefore.revision,{timeout:60000});
  await page.waitForTimeout(120);const reloaded=await inspect(),saveAfter=await exportSave();
  if(reloaded.revision!==saveBefore.revision||JSON.stringify(reloaded.ledger)!==JSON.stringify(stateBeforeSave.ledger))throw new Error('Literal reload changed revision or exact material ledger');
  if(JSON.stringify(saveAfter.rewards)!==JSON.stringify(saveBefore.rewards)||JSON.stringify(saveAfter.retiredActorIds)!==JSON.stringify(saveBefore.retiredActorIds))
    throw new Error('Literal reload changed rewards or retired actor IDs');
  for(const savedActor of persistedSave.actors){const restored=reloaded.restoredRuntimeState?.actors?.find(actor=>actor.id===savedActor.id),
      pose=reloaded.restoredRuntimeState?.rapierPoses?.[savedActor.id];
    if(!restored||restored.material!==savedActor.material||JSON.stringify(restored.parcelMaterials)!==JSON.stringify(savedActor.parcelMaterials)||
      JSON.stringify(restored.structure)!==JSON.stringify(savedActor.structure)||!pose||pose.position.some((value,index)=>Math.abs(value-savedActor.position[index])>1e-5))
      throw new Error(`Literal reload failed to restore mixed actor ${savedActor.id}: ${JSON.stringify({savedMaterial:savedActor.material,
        restoredMaterial:restored?.material,materialsMatch:JSON.stringify(restored?.parcelMaterials)===JSON.stringify(savedActor.parcelMaterials),
        structureMatch:JSON.stringify(restored?.structure)===JSON.stringify(savedActor.structure),savedPosition:savedActor.position,
        loadedPosition:pose?.position})}`);
  }
  await page.evaluate(()=>window.__voxelTerrainLab.focus([0.5,4.5,9],14,{yaw:-.65,pitch:.44}));await page.waitForTimeout(200);
  await screenshot('20-reloaded-cavity-and-slab');capture('20-reloaded-cavity-and-slab',await inspect(),{savedRevision:saveBefore.revision,restoredRuntimeState:reloaded.restoredRuntimeState});
  await screenshot('21-final-ledger-debug-panel');capture('21-final-ledger-debug-panel',await inspect(),{rewards:saveAfter.rewards,retiredActorIds:saveAfter.retiredActorIds});

  const initialLedger=stages[0].ledger,finalLedger=reloaded.ledger,actorParcelTotals=saveAfter.actors.reduce((totals,actor)=>{
    for(const material of Object.values(actor.parcelMaterials??{}))totals[material===1?'rock':'dirt']++;return totals;
  },{rock:0,dirt:0}),performance={
    ordinaryEdit:structuralTransactions[0]&&{workUnits:structuralTransactions[0].support.workUnits,expansions:structuralTransactions[0].support.expansions,
      readChunkIds:structuralTransactions[0].support.readChunkIds,writeChunkIds:structuralTransactions[0].publication.finalDirtyChunkIds,
      transactionMs:structuralTransactions[0].timings.transactionMs},
    supportedUndermining:structuralTransactions.filter(value=>!value.collapse.persistentCount).map(value=>({worldRevision:value.worldRevision,
      workUnits:value.support.workUnits,expansions:value.support.expansions,readChunkIds:value.support.readChunkIds,
      writeChunkIds:value.publication.finalDirtyChunkIds,transactionMs:value.timings.transactionMs,status:value.support.status})),
    collapseTrigger:{worldRevision:collapseEvent.worldRevision,workUnits:collapseEvent.supportEvidence.workUnits,expansions:collapseEvent.supportEvidence.expansions,
      stabilizationPasses:collapseEvent.supportEvidence.stabilizationPasses,postTransferWorkUnits:collapseEvent.supportEvidence.postTransferWorkUnits,
      readChunkIds:collapseEvent.supportEvidence.readChunkIds,writeChunkIds:collapseEvent.finalDirtyChunkIds,transactionMs:collapseEvent.transactionMs,
      queries:collapseEvent.supportEvidence.queries.map(query=>({pass:query.pass,status:query.status,workUnits:query.workUnits,readChunkIds:query.readChunkIds}))},
    actorDirtEdit:{transactionMs:dirtMined.lastEvent.transactionMs,preparedActorIds:dirtMined.lastEvent.preparedActorIds},
    actorRockEdit:{transactionMs:rockMined.lastEvent.transactionMs,preparedActorIds:rockMined.lastEvent.preparedActorIds}
  };
  const receipt={url:page.url(),inputPath:'normal dirt/rock tool selection and center-crosshair canvas clicks; camera framing only',
    pageErrors,consoleErrors,externalRequests,chunkDimensions:[16,16,16],spacing:.5,
    collapse:{revision:collapseEvent.worldRevision,componentBounds:collapseEvent.collapseEvidence.components.map(value=>value.componentBounds),
      componentMaterials:collapseEvent.collapseEvidence.components.map(value=>({materials:value.materials,materialProbes:value.materialProbes})),
      persistentCount:collapseEvent.collapseEvidence.persistentCount,transientCount:collapseEvent.collapseEvidence.transientCount,
      crumbleCount:collapseEvent.collapseEvidence.crumbleCount,deferredCount:collapseEvent.collapseEvidence.deferredCount,
      transferredRockParcels:slab.materialParcelCounts.rock,transferredDirtParcels:slab.materialParcelCounts.dirt,
      actorId:slab.id,actorMaterial:slab.material,actorSampleSize:slab.sampleSize,originalChunkIds:originalChunks,
      directConsumedParcelIds:collapseEvent.directConsumedParcelIds,collapseConsumedParcelIds:collapseEvent.collapseConsumedParcelIds,
      postTransferDirtCells:collapseEvent.postTransferDirtCells,worldTombstoneSamples:cavitySamples.length,allTombstoneSamplesAir:remainingWorld.every(value=>value.density>=0)},
    physics:{sameRapierWorld:settled.sameRapierWorld,initialCOM,settledCOM:resting.worldCOM,fallDistance,rotationRadians,
      contactingTerrainChunkIds:resting.contactingTerrainChunkIds,settledSpeed:speed(resting.pose),settledTicks,bodyHandle:resting.bodyHandle,
      actorCount:settled.actorCount,bodyCount:settled.bodyCount},
    recursiveDestruction:{dirt:{material:dirtMined.lastEvent.actorMining.material,cut:dirtMined.lastEvent.actorMining.cut,
      split:dirtMined.lastEvent.actorMining.split,children:dirtMined.lastEvent.actorMining.children,ledger:dirtMined.ledger},
      rock:{material:rockMined.lastEvent.actorMining.material,cut:rockMined.lastEvent.actorMining.cut,
        stress:rockMined.lastEvent.actorMining.stress,split:rockMined.lastEvent.actorMining.split,
        children:rockMined.lastEvent.actorMining.children,ledger:rockMined.ledger},finalActors:finalActors.map(actor=>({id:actor.id,material:actor.material,
          materialParcelCounts:actor.materialParcelCounts,sampleSize:actor.sampleSize,bodyHandle:actor.bodyHandle}))},
    collision:{cavityRayPoint:cavityRay.point,yaw:cavityRay.yaw,pitch:cavityRay.pitch,visibleDistance:cavityRay.state.hit.distance,
      rapierStaticDistance:cavityRay.state.collision.distance,delta:cavityRay.delta,staticColliderCount:reloaded.staticColliderCount},
    persistence:{savedRevision:saveBefore.revision,reloadedRevision:reloaded.revision,actorCount:reloaded.actorCount,
      actorIds:saveAfter.actors.map(actor=>actor.id),retiredActorIds:saveAfter.retiredActorIds,ledger:finalLedger,rewards:saveAfter.rewards,
      actorParcelMaterials:actorParcelTotals,actorPoses:saveAfter.actors.map(actor=>({id:actor.id,position:actor.position,rotation:actor.rotation})),
      collapseSamplesAirAfterReload:(await page.evaluate(points=>window.__voxelTerrainLab.read(points),cavitySamples)).every(value=>value.density>=0)},
    performance,structuralTransactions,stages,screenshots:Array.from({length:21},(_,index)=>`${output}/${String(index+1).padStart(2,'0')}-*.png`),
    ledgerInitial:initialLedger,ledgerFinal:finalLedger,
    policies:TERRAIN_COLLAPSE_POLICY,limitations:[
      'The scene remains a fixed 3×3 patch at 0.5 m sample spacing; this is not streaming or infinite-world evidence.',
      'MatterActor collision remains the bounded approximate convex gameplay proxy.',
      'Headless browser timings use SwiftShader and are observational, not a performance target.'
    ]};
  if(finalLedger.rock.initial!==finalLedger.rock.world+finalLedger.rock.actors+finalLedger.rock.consumed||
    finalLedger.dirt.initial!==finalLedger.dirt.world+finalLedger.dirt.actors+finalLedger.dirt.consumed)throw new Error('Reloaded material ledger is unbalanced');
  receipt.screenshots=screenshotPaths;
  await writeFile(`${output}/receipt.json`,JSON.stringify(receipt,null,2));await rm(`${output}/receipt.failed.json`,{force:true});console.log(JSON.stringify({receipt:`${output}/receipt.json`,stages:stages.length,
    collapse:receipt.collapse,physics:receipt.physics,persistence:receipt.persistence,performance:receipt.performance,pageErrors,consoleErrors,externalRequests}));
}catch(error){
  const report={error:error.message,pageErrors,consoleErrors,externalRequests,stages,structuralTransactions,
    current:await inspect().catch(()=>null),body:await page.locator('body').innerText().catch(()=> '')};
  await writeFile(`${output}/receipt.failed.json`,JSON.stringify(report,null,2));console.error(JSON.stringify(report));throw error;
}finally{await browser.close();}
