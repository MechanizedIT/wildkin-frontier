import { rockDomain } from './fracture-field.js';
import { makeSupportedRockSamples, makeDirtBankSamples, supportedRockDensity, dirtBankDensity } from './matter-fixtures.js';
import { createWorldMatterVolume, createActorMatterVolume } from './matter-volume.js';
import { analyzeRockConnectivity } from './matter-connectivity.js';
import { cloneMatterSamples, cloneRockSamples, extractMatterIsland, extractRockIsland, parcelBits, parcelMaterial, rockMeshUnionAudit } from './matter-ownership.js';
import { actorToWorldPoint } from './matter-target.js';
import { chipHardRock, selectRockFracture } from './matter-hard-rock.js';
import { buildRockBondGraph, emptyRockStructure, impactRockStructure, structureForSites } from './matter-structure.js';
import { ROCK_PROFILE } from './matter-rock-profile.js';
import { describeRockShatter, removedRockField } from './matter-shatter.js';
import { excavateDirt, resolveDirtSupport, classifyDirtFragment } from './matter-dirt.js';
import { DIRT_PROFILE } from './matter-dirt-profile.js';
import { MATTER_MATERIAL, matterPolicyFor, ROCK_MATTER_POLICY, DIRT_MATTER_POLICY } from './matter-material-policy.js';

export const CELLULAR_VERSION='cellular-rock-0.5a4-v1';
export const DIRT_CELLULAR_VERSION='cellular-dirt-0.5b-v1';
const domain=rockDomain(9212026),key=p=>p.join(',');
const frame={spacing:.5,offset:[-3,0,-3]},actorBounds={min:[0,0,0],max:[12,12,12]};
const parcelKey=(p,i)=>`${key(p)}:${i}`;
function eachCell(sample,fn){for(let z=0;z<sample.size[2]-1;z++)for(let y=0;y<sample.size[1]-1;y++)for(let x=0;x<sample.size[0]-1;x++)fn([x,y,z]);}
function serialize(sample){return {densities:Array.from(sample.densities),materials:Array.from(sample.materials)};}
function serializeWorld(sample,fixture='rock-boulder'){const baseline=fixture==='dirt-bank'?makeDirtBankSamples():makeSupportedRockSamples(),densityEdits={};
  for(let i=0;i<sample.densities.length;i++)if(sample.densities[i]!==baseline.densities[i]){
    const x=i%13,y=Math.floor(i/13)%13,z=Math.floor(i/169);densityEdits[`${x},${y},${z}`]=sample.densities[i];
  }
  return {densityEdits};
}
function deserialize(data,materialId=MATTER_MATERIAL.ROCK,fixture='rock-boulder'){
  const sample=fixture==='dirt-bank'?makeDirtBankSamples():makeSupportedRockSamples();
  const generatorDensity=fixture==='dirt-bank'?dirtBankDensity:supportedRockDensity;
  if(data.densityEdits){
    const edits=new Map(Object.entries(data.densityEdits).map(([k,density])=>[k,{density,material:density<0?materialId:0,domain:domain.id}]));
    const volume=createWorldMatterVolume({id:'world-rock',frame,domain:domain.id,edits,
      generator:p=>{const point=p.map((v,i)=>frame.offset[i]+v*.5),density=generatorDensity(point);return {density,material:density<0?materialId:0};}});
    for(let i=0;i<sample.densities.length;i++){const p=[i%13,Math.floor(i/13)%13,Math.floor(i/169)];
      sample.densities[i]=volume.readDensity(p);sample.materials[i]=volume.readMaterial(p);
    }
    sample.volume=volume;
  }else{
    sample.densities.set(data.densities);sample.materials.set(data.materials);
    const snapshot={bounds:actorBounds,densities:sample.densities,materials:sample.materials,domains:Array(sample.densities.length).fill(domain.id)};
    sample.volume=createActorMatterVolume({id:data.id??'actor-rock',frame,domain:domain.id,bounds:actorBounds,snapshot});
  }
  return sample;
}
const materialName=id=>id===MATTER_MATERIAL.ROCK?'rock':id===MATTER_MATERIAL.DIRT?'dirt':`unknown-${id}`;
const rewardKey=id=>id===MATTER_MATERIAL.ROCK?'stoneUnits':id===MATTER_MATERIAL.DIRT?'dirtUnits':null;
function quantity(ownership,owner){return Object.values(ownership).filter(v=>v===owner).length;}
export function quantityAudit(state){
  const owners={world:quantity(state.ownership,'world'),consumed:quantity(state.ownership,'consumed')};
  for(const actor of state.actors)owners[actor.id]=quantity(state.ownership,actor.id);
  for(const item of state.fractureDebris??[])owners[item.id]=quantity(state.ownership,item.id);
  const materials={},parcelMaterials=state.parcelMaterials??{};
  for(const [key,owner] of Object.entries(state.ownership)){
    const id=parcelMaterials[key]??state.materialId??MATTER_MATERIAL.ROCK,name=materialName(id),record=materials[name]??(materials[name]={initial:0,world:0,actors:0,consumed:0});
    record.initial++;if(owner==='world')record.world++;else if(owner==='consumed')record.consumed++;else record.actors++;
  }
  const total=Object.values(owners).reduce((a,b)=>a+b,0),initial=state.initialQuantity;
  const materialBalanced=Object.entries(materials).every(([name,record])=>{
    const id=name==='rock'?MATTER_MATERIAL.ROCK:name==='dirt'?MATTER_MATERIAL.DIRT:-1,k=rewardKey(id);
    return k!==null&&record.consumed===(state.rewards?.[k]??0)&&record.initial===record.world+record.actors+record.consumed;
  });
  return {...owners,total,initial,materials,balanced:total===initial&&materialBalanced};
}
function createInitialMatterState(materialId,fixture){
  const sample=fixture==='dirt-bank'?makeDirtBankSamples():makeSupportedRockSamples(),ownership={},parcelMaterials={};
  eachCell(sample,p=>{const bits=parcelBits(sample,p);for(let i=0;i<8;i++)if(bits[i]){const k=parcelKey(p,i);ownership[k]='world';parcelMaterials[k]=parcelMaterial(sample,p,i);}});
  const initialQuantity=Object.keys(ownership).length;
  return {version:materialId===MATTER_MATERIAL.ROCK?CELLULAR_VERSION:DIRT_CELLULAR_VERSION,seed:9212026,spacing:.5,revision:0,initialQuantity,
    materialId,fixture,world:materialId===MATTER_MATERIAL.ROCK?{densityEdits:{},structure:emptyRockStructure()}:{densityEdits:{}},
    actors:[],retired:[],fractureDebris:[],ownership,parcelMaterials,rewards:{stoneUnits:0,dirtUnits:0},
    events:{dugUnits:{rock:0,dirt:0},crumbledUnits:{rock:0,dirt:0}}};
}
export function createInitialRockState(){return createInitialMatterState(MATTER_MATERIAL.ROCK,'rock-boulder');}
export function createInitialDirtState(){return createInitialMatterState(MATTER_MATERIAL.DIRT,'dirt-bank');}
function assertBudget(state){const policy=matterPolicyFor(state.materialId),actorLimit=policy?.profile.maxDynamicClods??4;
  if(state.actors.length>4||state.actors.length>actorLimit||state.actors.some(a=>a.densities.length>40000))throw new Error('Cellular actor budget exceeded');
  if((state.fractureDebris??[]).length>64)throw new Error('Fracture debris record budget exceeded');
  if(!quantityAudit(state).balanced)throw new Error('Cellular quantity invariant failed');}
function newActor(id,sample,parent=null,component=null,structure=emptyRockStructure(),policy=ROCK_MATTER_POLICY){
  const inherited=parent??{position:[0,0,0],rotation:{x:0,y:0,z:0,w:1},linearVelocity:[0,0,0],angularVelocity:[0,0,0],poseRevision:0};
  const record={id,lineageRootId:parent?.lineageRootId??id,parentId:parent?.id??null,createdByTransaction:0,
    contentRevision:parent?1:1,poseRevision:inherited.poseRevision,spacing:.5,sampleFrame:{offset:[-3,0,-3],spacing:.5},
    material:policy.material,domain:{id:domain.id,seed:domain.seed,version:domain.version},structure:structure?structuredClone(structure):null,...serialize(sample),
    position:[...inherited.position],rotation:{...inherited.rotation},linearVelocity:[...inherited.linearVelocity],angularVelocity:[...inherited.angularVelocity],sleepState:'ACTIVE'};
  if(parent&&component){
    const oldCom=parent.localCOM??[0,4,0],newCom=componentCOM(component,sample),
      worldOld=actorToWorldPoint({position:record.position,rotation:record.rotation},oldCom),
      worldNew=actorToWorldPoint({position:record.position,rotation:record.rotation},newCom),r=worldNew.map((v,i)=>v-worldOld[i]),w=record.angularVelocity;
    record.linearVelocity=[record.linearVelocity[0]+w[1]*r[2]-w[2]*r[1],record.linearVelocity[1]+w[2]*r[0]-w[0]*r[2],record.linearVelocity[2]+w[0]*r[1]-w[1]*r[0]];
    record.localCOM=newCom;
  }else{
    record.localCOM=component?componentCOM(component,sample):[0,4,0];
    // The asymmetrical neck strike imparts a small deterministic tipping spin.
    // Gravity and contact remain Rapier-owned after detachment.
    if(component)record.angularVelocity=[...(policy.profile.detachSpin??[0,0,1.2])];
  }
  return record;
}
function componentCOM(component,sample){let sum=[0,0,0],weight=0;for(const p of component.cells){const meter=p.map((v,i)=>sample.min[i]+(v+.5)*sample.spacing),w=parcelBits(sample,p).filter(Boolean).length;sum=sum.map((v,i)=>v+meter[i]*w);weight+=w;}return sum.map(v=>v/Math.max(weight,1));}
function nearestComponentOwner(cell,components,owners){
  const point=cell.map(v=>v+.5);let selected=null,best=Infinity;
  for(let i=0;i<components.length;i++){
    const cells=components[i].cells;if(!cells.length)continue;
    const center=cells.reduce((sum,p)=>sum.map((v,j)=>v+p[j]+.5),[0,0,0]).map(v=>v/cells.length),distance=Math.hypot(...center.map((v,j)=>v-point[j]));
    if(distance<best){best=distance;selected=owners[i];}
  }
  return selected;
}
function accountConsumed(state,ownershipKey,eventKind){
  const material=state.parcelMaterials?.[ownershipKey]??state.materialId??MATTER_MATERIAL.ROCK,name=materialName(material),key=rewardKey(material);
  if(!key)return false;
  state.ownership[ownershipKey]='consumed';state.rewards[key]=(state.rewards[key]??0)+1;
  state.events??={dugUnits:{rock:0,dirt:0},crumbledUnits:{rock:0,dirt:0}};
  const field=eventKind==='crumble'?'crumbledUnits':'dugUnits';state.events[field][name]=(state.events[field][name]??0)+1;return true;
}
function updateFromMask(state,currentOwner,nextOwner,after,componentByCell=null,{before=null,chipField=null,directField=chipField,debris=null,residualOwner=null}={}){
  for(const [k,owner] of Object.entries(state.ownership))if(owner===currentOwner){
    const [cell,part]=k.split(':'),p=cell.split(',').map(Number),probe=Number(part),alive=parcelBits(after,p)[probe],wasLive=before?parcelBits(before,p)[probe]:alive;
    if(!wasLive){const target=componentByCell?.get(cell)??residualOwner?.(p);if(target)state.ownership[k]=target;continue;}
    if(!alive){
      if(debris&&chipField&&parcelBits(chipField,p)[probe]){state.ownership[k]=debris.id;debris.quantity++;}
      else accountConsumed(state,k,directField&&!parcelBits(directField,p)[probe]?'dig':'crumble');
      continue;
    }
    if(componentByCell){const target=componentByCell.get(cell);if(!target)throw new Error(`No owner for live parcel ${k}`);state.ownership[k]=target;}
    else state.ownership[k]=nextOwner;
  }
}
function fractureDebrisRecord(id,sample,pose,localHit,kind='tiny-debris'){
  return {...serialize(sample),id,kind,quantity:0,spacing:.5,position:[...pose.position],rotation:{...pose.rotation},
    linearVelocity:[...(pose.linearVelocity??[0,0,0])],angularVelocity:[...(pose.angularVelocity??[0,0,0])],
    localHit:[...localHit],material:ROCK_PROFILE.material,creditedQuantity:0};
}
export function classifyRockMatterTier(probes,profile=ROCK_PROFILE){
  if(!Number.isSafeInteger(probes)||probes<0)throw new Error('Invalid hard-rock fragment quantity');
  if(probes>=profile.persistentPieceMinProbes)return 'persistent-matter-actor';
  if(probes>=profile.temporaryShardMinProbes)return 'temporary-physics-shard';
  return 'tiny-debris';
}
export function mineWorldRock(state,hit,{fractureDomain=domain,rockProfile=ROCK_PROFILE}={}){
  const next=structuredClone(state),before=deserialize(state.world),chipField=cloneRockSamples(before),structure=state.world.structure??emptyRockStructure();
  const cut=chipHardRock(chipField,fractureDomain,hit,structure.hitSequence+1,rockProfile),graphStarted=performance.now(),graph=buildRockBondGraph(chipField,fractureDomain,rockProfile,structure),graphMs=performance.now()-graphStarted;
  const impact=impactRockStructure(graph,structure,hit,fractureDomain,rockProfile);if(impact.status==='HOLD')return {...impact,state};
  const nextStructure=impact.state,after=chipField,connectivityStarted=performance.now(),
    support=analyzeRockConnectivity(after,fractureDomain,{anchor:([,y])=>y===0,brokenBonds:nextStructure.broken}),connectivityMs=performance.now()-connectivityStarted;
  if(support.status!=='OK')return {status:'HOLD',reason:support.reason,state};
  const islands=support.components.filter(c=>!c.anchored);
  if(islands.length>1)return {status:'HOLD',reason:'world cut produced more than one unsupported island',state};
  const debris=null;
  if(islands.length){
    const extraction=extractRockIsland(before,after,support);
    if(extraction.status!=='OK')return {...extraction,state};
    const id=`rock-${next.revision+1}`,sites=new Set(islands[0].fragments.map(f=>f.id)),actor=newActor(id,extraction.actor,null,islands[0],structureForSites(nextStructure,sites),ROCK_MATTER_POLICY);actor.createdByTransaction=next.revision+1;
    next.actors.push(actor);const anchoredSites=new Set(support.components.filter(c=>c.anchored).flatMap(c=>c.fragments.map(f=>f.id)));
    next.world={...serializeWorld(extraction.world),structure:structureForSites(nextStructure,anchoredSites)};
    const componentByCell=new Map();for(const c of support.components)for(const p of c.cells)componentByCell.set(key(p),c.anchored?'world':id);
    const componentOwners=support.components.map(c=>c.anchored?'world':id);
    updateFromMask(next,'world','world',after,componentByCell,{before,chipField,debris,
      residualOwner:p=>nearestComponentOwner(p,support.components,componentOwners)});
  }else{next.world={...serializeWorld(after),structure:nextStructure};updateFromMask(next,'world','world',after,null,{before,chipField,debris});}
  if(debris&&debris.quantity<1)next.fractureDebris=next.fractureDebris.filter(item=>item!==debris);
  const shatter=describeRockShatter(before,[chipField],next.rewards.stoneUnits-state.rewards.stoneUnits,
    {position:[0,0,0],rotation:{x:0,y:0,z:0,w:1},linearVelocity:[0,0,0],angularVelocity:[0,0,0]},hit,ROCK_PROFILE,fractureDomain);
  if(shatter?.status==='HOLD')return {...shatter,state};
  next.revision++;assertBudget(next);
  return {status:'OK',state:next,detached:islands.length,cut,shatter,fracture:false,fractureDebris:[],
    stress:{hitSite:impact.hitSite,visitedNodes:impact.visitedNodes,propagatedBonds:impact.propagatedBonds,cracked:impact.cracked.length,newlyBroken:impact.newlyBroken},
    fractureMetrics:{elapsedMs:0,seamSamples:0,bondId:null,
      chipMs:cut.elapsedMs,graphMs,stressMs:impact.elapsedMs,connectivityMs}};
}

export function mineWorldDirt(state,hit,{fractureDomain=domain,dirtProfile=DIRT_PROFILE}={}){
  const transactionStarted=performance.now();
  if(state.materialId!==DIRT_MATTER_POLICY.material||state.fixture!=='dirt-bank')return {status:'HOLD',reason:'Dirt policy does not match this matter fixture',state};
  const next=structuredClone(state),before=deserialize(state.world,state.materialId,state.fixture),direct=cloneMatterSamples(before),
    sequence=state.revision+1,cut=excavateDirt(direct,fractureDomain,hit,sequence,dirtProfile);
  if(!cut.changed)return {status:'NO_HIT',state};
  const cohesion=resolveDirtSupport(direct,hit,dirtProfile,{anchor:([,y])=>y===0,previous:before});
  if(cohesion.status!=='OK')return {...cohesion,state};
  const after=cohesion.sample,support=cohesion.support,loose=support.components.filter(component=>!component.anchored);
  if(next.actors.length+loose.length>dirtProfile.maxDynamicClods)return {status:'HOLD',reason:'dirt dynamic clod budget',state};
  let detached=0,actor=null,componentByCell=null;
  if(loose.length){
    if(loose.length!==1)return {status:'HOLD',reason:'dirt edit exposed more than one persistent clod',state};
    const extraction=extractMatterIsland(before,after,support);if(extraction.status!=='OK')return {...extraction,state};
    const id=`dirt-${next.revision+1}`;actor=newActor(id,extraction.actor,null,loose[0],null,DIRT_MATTER_POLICY);actor.createdByTransaction=next.revision+1;
    next.actors.push(actor);detached=1;
    next.world=serializeWorld(extraction.world,state.fixture);
    componentByCell=new Map();for(const component of support.components)for(const p of component.cells)componentByCell.set(key(p),component.anchored?'world':id);
  }else next.world=serializeWorld(after,state.fixture);
  updateFromMask(next,'world','world',after,componentByCell,{before,chipField:direct,directField:direct,
    residualOwner:p=>componentByCell?.get(key(p))??'world'});
  next.revision++;assertBudget(next);
  const audit=quantityAudit(next);
  return {status:'OK',state:next,detached,actorId:actor?.id??null,cut,crumble:{components:cohesion.crumbleComponents,
      units:cohesion.crumbledProbeUnits,clearedSamples:cohesion.clearedSamples??0,position:[...hit]},support:{components:support.components.length,
      localCells:cohesion.workCells,window:support.window},
  fracture:false,stress:null,fractureMetrics:{elapsedMs:performance.now()-transactionStarted,seamSamples:0,bondId:null,chipMs:cut.elapsedMs,graphMs:0,stressMs:0,
      connectivityMs:cohesion.connectivityMs,crumbleMs:Math.max(0,cohesion.elapsedMs-cohesion.connectivityMs),
      supportWorkCells:cohesion.workCells},audit};
}
function componentMasks(sample,components,{fractureBoundary=false}={}){
  const owners=new Map();components.forEach((c,i)=>c.cells.forEach(p=>owners.set(key(p),i)));
  const outputs=components.map(()=>cloneRockSamples(sample)),[nx,ny,nz]=sample.size;
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const j=x+nx*(y+ny*z);if(sample.densities[j]>=0)continue;
    const votes=new Map();for(let dz=-1;dz<=0;dz++)for(let dy=-1;dy<=0;dy++)for(let dx=-1;dx<=0;dx++){
      const p=[x+dx,y+dy,z+dz];if(p.some((v,i)=>v<0||v>=sample.size[i]-1))continue;
      const owner=owners.get(key(p));if(owner!==undefined)votes.set(owner,(votes.get(owner)??0)+1);
    }
    if(votes.size>1&&!fractureBoundary)return {status:'HOLD',reason:`shared scalar corner at ${x},${y},${z}`};
    const owner=[...votes].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0]?.[0];
    outputs.forEach((out,i)=>{if(i!==owner){out.densities[j]=Math.max(.5,-sample.densities[j]);out.materials[j]=0;}});
  }
  let surviving=0,error=0;eachCell(sample,p=>{const expected=owners.has(key(p))?parcelBits(sample,p):Array(8).fill(false),bits=outputs.map(o=>parcelBits(o,p));for(let i=0;i<8;i++){
    if(expected[i])surviving++;const count=bits.filter(b=>b[i]).length;if(expected[i]?count!==1:count!==0)error++;
  }});
  const errorRate=error/Math.max(1,surviving);if(errorRate>(fractureBoundary ? .05 : 0))return {status:'HOLD',reason:`actor split occupancy union error ${(100*errorRate).toFixed(2)}%`};
  const meshAudit=rockMeshUnionAudit(sample,outputs);if(!fractureBoundary&&!meshAudit.matches)return {status:'HOLD',reason:`actor split surface union differs from cut field ${JSON.stringify(meshAudit)}`};
  return {status:'OK',outputs,owners,errorRate,meshAudit};
}
export function mineActorRock(state,actorId,expectedRevision,localHit,{fractureDomain=domain,rockProfile=ROCK_PROFILE}={}){
  const next=structuredClone(state),parent=next.actors.find(a=>a.id===actorId);
  if(!parent||parent.contentRevision!==expectedRevision)return {status:'STALE',state};
  const before=deserialize(parent),chipField=cloneRockSamples(before),structure=parent.structure??emptyRockStructure();
  const cut=chipHardRock(chipField,fractureDomain,localHit,structure.hitSequence+1,rockProfile),graphStarted=performance.now(),graph=buildRockBondGraph(chipField,fractureDomain,rockProfile,structure),graphMs=performance.now()-graphStarted;
  const impact=impactRockStructure(graph,structure,localHit,fractureDomain,rockProfile);if(impact.status==='HOLD')return {...impact,state};
  const nextStructure=impact.state,fracture=selectRockFracture(chipField,fractureDomain,nextStructure,localHit,parent.localCOM,rockProfile,
    {anchor:()=>false,accept:(candidate,support)=>componentMasks(candidate,support.components,{fractureBoundary:true})});
  if(fracture.status==='HOLD')return {...fracture,state};
  const after=fracture.status==='FRACTURE'?fracture.sample:chipField;
  const connectivityStarted=performance.now(),support=fracture.status==='FRACTURE'?fracture.support:analyzeRockConnectivity(after,fractureDomain,{anchor:()=>false}),connectivityMs=performance.now()-connectivityStarted;
  if(support.status!=='OK')return {status:'HOLD',reason:support.reason,state};
  const persistentCount=support.components.filter(c=>c.occupiedProbes>=rockProfile.persistentPieceMinProbes).length;
  if(fracture.status!=='FRACTURE'||support.components.length===1||persistentCount<2){
    const component=support.components[0],oldCOM=parent.localCOM,newCOM=componentCOM(component,after),
      oldWorld=actorToWorldPoint(parent,oldCOM),newWorld=actorToWorldPoint(parent,newCOM),r=newWorld.map((v,i)=>v-oldWorld[i]),w=parent.angularVelocity;
    parent.linearVelocity=[parent.linearVelocity[0]+w[1]*r[2]-w[2]*r[1],parent.linearVelocity[1]+w[2]*r[0]-w[0]*r[2],parent.linearVelocity[2]+w[0]*r[1]-w[1]*r[0]];
    parent.localCOM=newCOM;parent.structure=nextStructure;Object.assign(parent,serialize(after));parent.contentRevision++;parent.sleepState='ACTIVE';
    for(const [k,owner] of Object.entries(next.ownership))if(owner===actorId){
      const [cell,part]=k.split(':'),p=cell.split(',').map(Number);
      if(parcelBits(chipField,p)[Number(part)]||!parcelBits(before,p)[Number(part)])continue;
      accountConsumed(next,k,'dig');
    }
    const shatter=describeRockShatter(before,[chipField],next.rewards.stoneUnits-state.rewards.stoneUnits,parent,localHit,rockProfile,fractureDomain);
    if(shatter?.status==='HOLD')return {...shatter,state};
    next.revision++;assertBudget(next);return {status:'OK',state:next,split:false,fracturePending:nextStructure.broken.length>0,cut,shatter,
      stress:{hitSite:impact.hitSite,visitedNodes:impact.visitedNodes,propagatedBonds:impact.propagatedBonds,cracked:impact.cracked.length,newlyBroken:impact.newlyBroken},
      structuralComponents:support.components.length,fractureMetrics:{elapsedMs:fracture.elapsedMs,seamSamples:0,bondId:null,
        chipMs:cut.elapsedMs,graphMs,stressMs:impact.elapsedMs,connectivityMs}};
  }
  const masks=fracture.separation??componentMasks(after,support.components,{fractureBoundary:true});if(masks.status!=='OK')return {...masks,state};
  const children=[],componentByCell=new Map(),componentOwners=[],newDebris=[],seamId=fracture.status==='FRACTURE'?`fracture-${next.revision+1}-seam`:null;
  for(let index=0;index<support.components.length;index++){
    const component=support.components[index],sample=masks.outputs[index];
    const sites=new Set(component.fragments.map(f=>f.id));
    const tier=classifyRockMatterTier(component.occupiedProbes,rockProfile),ownerId=tier==='persistent-matter-actor'?
      `${parent.id}/r${next.revision+1}/${index}`:`fragment-${parent.id}-${next.revision+1}-${index}`;
    if(tier==='persistent-matter-actor'){
      const record=newActor(ownerId,sample,parent,component,structureForSites(nextStructure,sites),ROCK_MATTER_POLICY);record.createdByTransaction=next.revision+1;children.push(record);
    }else{
      const debris=fractureDebrisRecord(ownerId,sample,parent,localHit,tier);
      newDebris.push(debris);
    }
    componentOwners[index]=ownerId;
    for(const p of component.cells)componentByCell.set(key(p),ownerId);
  }
  const tempShards=newDebris.filter(item=>item.kind==='temporary-physics-shard').sort((a,b)=>b.quantity-a.quantity||a.id.localeCompare(b.id));
  for(const item of tempShards.slice(rockProfile.temporaryShardMaxBodies))item.kind='tiny-debris';
  const seamDebris=seamId?fractureDebrisRecord(seamId,removedRockField(chipField,[after]),parent,localHit,'tiny-debris'):null;
  if(seamDebris)newDebris.push(seamDebris);
  if(newDebris.length+(next.fractureDebris??[]).length>64)return {status:'HOLD',reason:'fracture debris record budget',state};
  next.fractureDebris=(next.fractureDebris??[]).concat(newDebris);
  for(const [k,owner] of Object.entries(next.ownership))if(owner===actorId){
    const [cell,part]=k.split(':'),p=cell.split(',').map(Number),probe=Number(part),wasLive=parcelBits(before,p)[probe],chipLive=parcelBits(chipField,p)[probe];
    const target=parcelBits(after,p)[probe]?componentByCell.get(cell):null;
    if(target)next.ownership[k]=target;
    else if(chipLive&&seamDebris){next.ownership[k]=seamDebris.id;seamDebris.quantity++;}
    else if(chipLive)return {status:'HOLD',reason:`live fracture parcel has no child owner: ${k}`,state};
    else if(!wasLive){const inherited=nearestComponentOwner(p,support.components,componentOwners);
      if(!inherited)return {status:'HOLD',reason:`quantized residual has no child owner: ${k}`,state};next.ownership[k]=inherited;
    }else accountConsumed(next,k,'dig');
  }
  for(const debris of newDebris.filter(item=>item!==seamDebris))debris.quantity=Object.values(next.ownership).filter(owner=>owner===debris.id).length;
  next.fractureDebris=next.fractureDebris.filter(item=>item.quantity>0);
  const shatter=describeRockShatter(before,[chipField],next.rewards.stoneUnits-state.rewards.stoneUnits,parent,localHit,rockProfile,fractureDomain);
  if(shatter?.status==='HOLD')return {...shatter,state};
  next.actors=next.actors.filter(a=>a.id!==actorId).concat(children);next.retired.push(actorId);next.revision++;assertBudget(next);
  return {status:'OK',state:next,split:children.length>=2,fracture: true,children:children.map(a=>a.id),fractureDebris:newDebris.filter(item=>item.quantity>0),cut,shatter,
    stress:{hitSite:impact.hitSite,visitedNodes:impact.visitedNodes,propagatedBonds:impact.propagatedBonds,cracked:impact.cracked.length,newlyBroken:impact.newlyBroken},
    remainingQuantity:quantityAudit(next).total-quantityAudit(next).consumed,
    fractureMetrics:{elapsedMs:fracture.elapsedMs,seamSamples:fracture.seam.removedSamples,bondId:fracture.bondId,largePieces:fracture.largePieces,
      chipMs:cut.elapsedMs,graphMs,stressMs:impact.elapsedMs,connectivityMs,
      maskOccupancyErrorRate:masks.errorRate,meshUnion:masks.meshAudit}};
}
export function mineActorDirt(state,actorId,expectedRevision,localHit,{fractureDomain=domain,dirtProfile=DIRT_PROFILE}={}){
  const started=performance.now();
  const next=structuredClone(state),parent=next.actors.find(actor=>actor.id===actorId);
  if(!parent||parent.contentRevision!==expectedRevision)return {status:'STALE',state};
  if(parent.material!==DIRT_MATTER_POLICY.material)return {status:'HOLD',reason:'Dirt policy does not match actor material',state};
  const before=deserialize(parent,parent.material),direct=cloneMatterSamples(before),cut=excavateDirt(direct,fractureDomain,localHit,state.revision+1,dirtProfile);
  if(!cut.changed)return {status:'NO_HIT',state};
  const cohesion=resolveDirtSupport(direct,localHit,dirtProfile,{anchor:()=>false,previous:before});
  if(cohesion.status!=='OK')return {...cohesion,state};
  const after=cohesion.sample,support=cohesion.support,components=support.components,
    persistent=components.filter(component=>classifyDirtFragment(component.occupiedProbes,dirtProfile)==='persistent-clod');
  if(components.length<=1||persistent.length<=1){
    if(!components.length){
      for(const [ownershipKey,owner] of Object.entries(next.ownership))if(owner===actorId)accountConsumed(next,ownershipKey,
        direct&&!parcelBits(direct,ownershipKey.split(':')[0].split(',').map(Number))[Number(ownershipKey.split(':')[1])]?'dig':'crumble');
      next.actors=next.actors.filter(actor=>actor.id!==actorId);next.retired.push(actorId);
      next.revision++;assertBudget(next);return {status:'OK',state:next,split:false,crumbledActor:true,cut,crumble:{components:cohesion.crumbleComponents,
        units:cohesion.crumbledProbeUnits,position:actorToWorldPoint(parent,localHit)},fracture:false,stress:null,fractureMetrics:{elapsedMs:performance.now()-started,chipMs:cut.elapsedMs,
        graphMs:0,stressMs:0,connectivityMs:cohesion.connectivityMs,
        crumbleMs:Math.max(0,cohesion.elapsedMs-cohesion.connectivityMs),supportWorkCells:cohesion.workCells}};
    }
    const component=components[0],oldCOM=parent.localCOM,newCOM=componentCOM(component,after),oldWorld=actorToWorldPoint(parent,oldCOM),newWorld=actorToWorldPoint(parent,newCOM),
      r=newWorld.map((v,i)=>v-oldWorld[i]),w=parent.angularVelocity;
    parent.linearVelocity=[parent.linearVelocity[0]+w[1]*r[2]-w[2]*r[1],parent.linearVelocity[1]+w[2]*r[0]-w[0]*r[2],parent.linearVelocity[2]+w[0]*r[1]-w[1]*r[0]];
    parent.localCOM=newCOM;parent.structure=null;Object.assign(parent,serialize(after));parent.contentRevision++;parent.sleepState='ACTIVE';
    for(const [ownershipKey,owner] of Object.entries(next.ownership))if(owner===actorId){
      const cell=ownershipKey.split(':')[0].split(',').map(Number),part=Number(ownershipKey.split(':')[1]);
      if(!parcelBits(before,cell)[part]||parcelBits(after,cell)[part])continue;
      accountConsumed(next,ownershipKey,parcelBits(direct,cell)[part]?'crumble':'dig');
    }
      next.revision++;assertBudget(next);return {status:'OK',state:next,split:false,fracture:false,stress:null,cut,
        crumble:{components:cohesion.crumbleComponents,units:cohesion.crumbledProbeUnits,position:actorToWorldPoint(parent,localHit)},structuralComponents:components.length,
      fractureMetrics:{elapsedMs:performance.now()-started,chipMs:cut.elapsedMs,graphMs:0,stressMs:0,
        connectivityMs:cohesion.connectivityMs,crumbleMs:Math.max(0,cohesion.elapsedMs-cohesion.connectivityMs),
        supportWorkCells:cohesion.workCells}};
  }
  if(persistent.length!==components.length)return {status:'HOLD',reason:'non-persistent dirt fragment escaped crumble policy',state};
  const masks=componentMasks(after,components);if(masks.status!=='OK')return {...masks,state};
  if(next.actors.length-1+components.length>dirtProfile.maxDynamicClods)return {status:'HOLD',reason:'dirt dynamic clod budget',state};
  const childIds=components.map((_,index)=>`${parent.id}/d${next.revision+1}/${index}`),componentByCell=new Map(),children=[];
  for(let index=0;index<components.length;index++){
    const child=newActor(childIds[index],masks.outputs[index],parent,components[index],null,DIRT_MATTER_POLICY);
    child.createdByTransaction=next.revision+1;children.push(child);
    for(const cell of components[index].cells)componentByCell.set(key(cell),child.id);
  }
  for(const [ownershipKey,owner] of Object.entries(next.ownership))if(owner===actorId){
    const cellKeyValue=ownershipKey.split(':')[0],cell=cellKeyValue.split(',').map(Number),part=Number(ownershipKey.split(':')[1]),wasLive=parcelBits(before,cell)[part],
      directLive=parcelBits(direct,cell)[part],afterLive=parcelBits(after,cell)[part],target=afterLive?componentByCell.get(cellKeyValue):null;
    if(target){next.ownership[ownershipKey]=target;continue;}
    if(!wasLive){const inherited=nearestComponentOwner(cell,components,childIds);if(inherited)next.ownership[ownershipKey]=inherited;else accountConsumed(next,ownershipKey,'crumble');continue;}
    if(!afterLive)accountConsumed(next,ownershipKey,directLive?'crumble':'dig');
    else return {status:'HOLD',reason:`live dirt parcel has no child owner: ${ownershipKey}`,state};
  }
  next.actors=next.actors.filter(actor=>actor.id!==actorId).concat(children);next.retired.push(actorId);next.revision++;assertBudget(next);
  return {status:'OK',state:next,split:true,fracture:false,stress:null,children:children.map(actor=>actor.id),cut,
    crumble:{components:cohesion.crumbleComponents,units:cohesion.crumbledProbeUnits,position:actorToWorldPoint(parent,localHit)},structuralComponents:components.length,
    fractureMetrics:{elapsedMs:performance.now()-started,chipMs:cut.elapsedMs,graphMs:0,stressMs:0,
      connectivityMs:cohesion.connectivityMs,crumbleMs:Math.max(0,cohesion.elapsedMs-cohesion.connectivityMs),
      supportWorkCells:cohesion.workCells,maskOccupancyErrorRate:masks.errorRate,meshUnion:masks.meshAudit}};
}

export function mineWorldMatter(state,hit,options={}){
  const policy=matterPolicyFor(state?.materialId);if(!policy)return {status:'HOLD',reason:`Unknown matter material ${state?.materialId}`,state};
  if(policy===ROCK_MATTER_POLICY)return mineWorldRock(state,hit,options);
  if(policy===DIRT_MATTER_POLICY)return mineWorldDirt(state,hit,options);
  return {status:'HOLD',reason:`No world edit strategy for ${policy.id}`,state};
}
export function mineActorMatter(state,actorId,expectedRevision,localHit,options={}){
  const actor=state?.actors?.find(item=>item.id===actorId),policy=matterPolicyFor(actor?.material);
  if(!policy)return {status:'HOLD',reason:`Unknown actor material ${actor?.material}`,state};
  if(policy===ROCK_MATTER_POLICY)return mineActorRock(state,actorId,expectedRevision,localHit,options);
  if(policy===DIRT_MATTER_POLICY)return mineActorDirt(state,actorId,expectedRevision,localHit,options);
  return {status:'HOLD',reason:`No actor edit strategy for ${policy.id}`,state};
}
export function worldMatterSamples(state){return deserialize(state.world,state.materialId??MATTER_MATERIAL.ROCK,state.fixture??'rock-boulder');}
export function actorMatterSamples(actor){return deserialize(actor,actor.material??MATTER_MATERIAL.ROCK);}
export const actorRockSamples=actorMatterSamples;
