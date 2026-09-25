import { rockDomain } from './fracture-field.js';
import { makeSupportedRockSamples, makeDirtBankSamples, makeMixedMatterSamples, makeBuriedMixedMatterSamples, supportedRockDensity, dirtBankDensity } from './matter-fixtures.js';
import { createWorldMatterVolume, createActorMatterVolume } from './matter-volume.js';
import { analyzeMatterConnectivity, analyzeRockConnectivity } from './matter-connectivity.js';
import { cloneMatterSamples, cloneRockSamples, extractMatterIsland, extractRockIsland, parcelBits, parcelMaterial, rockMeshUnionAudit } from './matter-ownership.js';
import { actorToWorldPoint } from './matter-target.js';
import { chipHardRock, selectRockFracture } from './matter-hard-rock.js';
import { buildRockBondGraph, emptyRockStructure, impactRockStructure, structureForSites } from './matter-structure.js';
import { ROCK_PROFILE } from './matter-rock-profile.js';
import { describeRockShatter, removedRockField } from './matter-shatter.js';
import { excavateDirt, resolveDirtSupport, classifyDirtFragment } from './matter-dirt.js';
import { DIRT_PROFILE } from './matter-dirt-profile.js';
import { MATTER_MATERIAL, matterPolicyFor, ROCK_MATTER_POLICY, DIRT_MATTER_POLICY, MIXED_MATTER_POLICY } from './matter-material-policy.js';

export const CELLULAR_VERSION='cellular-rock-0.5a4-v1';
export const DIRT_CELLULAR_VERSION='cellular-dirt-0.5b-v1';
export const MIXED_CELLULAR_VERSION='cellular-mixed-0.5c-v1';
export const BURIED_MIXED_CELLULAR_VERSION='cellular-mixed-buried-0.5c1-v1';
export const isMixedMatterFixture=fixture=>fixture==='mixed-dirt-supported-rock'||fixture==='buried-mixed-dirt-rock';
const domain=rockDomain(9212026),key=p=>p.join(',');
const frame={spacing:.5,offset:[-3,0,-3]},actorBounds={min:[0,0,0],max:[12,12,12]};
const parcelKey=(p,i)=>`${key(p)}:${i}`;
function eachCell(sample,fn){for(let z=0;z<sample.size[2]-1;z++)for(let y=0;y<sample.size[1]-1;y++)for(let x=0;x<sample.size[0]-1;x++)fn([x,y,z]);}
function serialize(sample){return {densities:Array.from(sample.densities),materials:Array.from(sample.materials)};}
function serializeWorld(sample,fixture='rock-boulder'){if(isMixedMatterFixture(fixture))return {mixedSnapshot:serialize(sample),structure:sample.structure??emptyRockStructure()};
  const baseline=fixture==='dirt-bank'?makeDirtBankSamples():makeSupportedRockSamples(),densityEdits={};
  for(let i=0;i<sample.densities.length;i++)if(sample.densities[i]!==baseline.densities[i]){
    const x=i%13,y=Math.floor(i/13)%13,z=Math.floor(i/169);densityEdits[`${x},${y},${z}`]=sample.densities[i];
  }
  return {densityEdits};
}
function deserialize(data,materialId=MATTER_MATERIAL.ROCK,fixture='rock-boulder'){
  const sample=fixture==='mixed-dirt-supported-rock'?makeMixedMatterSamples():fixture==='buried-mixed-dirt-rock'?makeBuriedMixedMatterSamples():fixture==='dirt-bank'?makeDirtBankSamples():makeSupportedRockSamples();
  if(isMixedMatterFixture(fixture)){
    if(data.mixedSnapshot){sample.densities.set(data.mixedSnapshot.densities);sample.materials.set(data.mixedSnapshot.materials);}
    sample.structure=structuredClone(data.structure??emptyRockStructure());return sample;
  }
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
  const actorMaterials=new Map(state.actors.map(actor=>[actor.id,actor.material]));let ownershipMaterialValid=true;
  for(const actor of state.actors)owners[actor.id]=quantity(state.ownership,actor.id);
  for(const item of state.fractureDebris??[])owners[item.id]=quantity(state.ownership,item.id);
  const materials={},parcelMaterials=state.parcelMaterials??{};
  for(const [key,owner] of Object.entries(state.ownership)){
    const id=parcelMaterials[key]??state.materialId??MATTER_MATERIAL.ROCK,name=materialName(id),record=materials[name]??(materials[name]={initial:0,world:0,actors:0,consumed:0});
    if(actorMaterials.has(owner)&&actorMaterials.get(owner)!==MATTER_MATERIAL.MIXED&&actorMaterials.get(owner)!==id)ownershipMaterialValid=false;
    if(owner!=='world'&&owner!=='consumed'&&!actorMaterials.has(owner)&&!(state.fractureDebris??[]).some(item=>item.id===owner))ownershipMaterialValid=false;
    record.initial++;if(owner==='world')record.world++;else if(owner==='consumed')record.consumed++;else record.actors++;
  }
  const total=Object.values(owners).reduce((a,b)=>a+b,0),initial=state.initialQuantity;
  const materialBalanced=Object.entries(materials).every(([name,record])=>{
    const id=name==='rock'?MATTER_MATERIAL.ROCK:name==='dirt'?MATTER_MATERIAL.DIRT:-1,k=rewardKey(id);
    return k!==null&&record.consumed===(state.rewards?.[k]??0)&&record.initial===record.world+record.actors+record.consumed;
  });
  return {...owners,total,initial,materials,balanced:total===initial&&materialBalanced&&ownershipMaterialValid,ownershipMaterialValid};
}
function createInitialMatterState(materialId,fixture){
  const sample=fixture==='mixed-dirt-supported-rock'?makeMixedMatterSamples():fixture==='buried-mixed-dirt-rock'?makeBuriedMixedMatterSamples():fixture==='dirt-bank'?makeDirtBankSamples():makeSupportedRockSamples(),ownership={},parcelMaterials={};
  eachCell(sample,p=>{const bits=parcelBits(sample,p);for(let i=0;i<8;i++)if(bits[i]){const k=parcelKey(p,i);ownership[k]='world';parcelMaterials[k]=parcelMaterial(sample,p,i);}});
  const initialQuantity=Object.keys(ownership).length;
  return {version:fixture==='buried-mixed-dirt-rock'?BURIED_MIXED_CELLULAR_VERSION:isMixedMatterFixture(fixture)?MIXED_CELLULAR_VERSION:materialId===MATTER_MATERIAL.ROCK?CELLULAR_VERSION:DIRT_CELLULAR_VERSION,seed:9212026,spacing:.5,revision:0,initialQuantity,
    materialId,fixture,world:isMixedMatterFixture(fixture)?{mixedSnapshot:null,structure:emptyRockStructure()}:materialId===MATTER_MATERIAL.ROCK?{densityEdits:{},structure:emptyRockStructure()}:{densityEdits:{}},
    actors:[],retired:[],fractureDebris:[],ownership,parcelMaterials,rewards:{stoneUnits:0,dirtUnits:0},
    events:{dugUnits:{rock:0,dirt:0},crumbledUnits:{rock:0,dirt:0}}};
}
export function createInitialRockState(){return createInitialMatterState(MATTER_MATERIAL.ROCK,'rock-boulder');}
export function createInitialDirtState(){return createInitialMatterState(MATTER_MATERIAL.DIRT,'dirt-bank');}
export function createInitialMixedState(){const state=createInitialMatterState(3,'mixed-dirt-supported-rock'),support=mixedSupport(worldMatterSamples(state));
  if(support.status==='OK')state.supportSummary=summarizeMixedSupport(support);return state;}
export function createInitialBuriedMixedState(){const state=createInitialMatterState(3,'buried-mixed-dirt-rock'),support=mixedSupport(worldMatterSamples(state));
  if(support.status==='OK')state.supportSummary=summarizeMixedSupport(support);return state;}
function assertBudget(state){const policy=matterPolicyFor(state.materialId),actorLimit=policy?.profile.maxDynamicClods??4;
  if(state.actors.length>4||state.actors.length>actorLimit||state.actors.some(a=>a.densities.length>40000))throw new Error('Cellular actor budget exceeded');
  if((state.fractureDebris??[]).length>64)throw new Error('Fracture debris record budget exceeded');
  if(!quantityAudit(state).balanced)throw new Error('Cellular quantity invariant failed');}
function newActor(id,sample,parent=null,component=null,structure=emptyRockStructure(),policy=ROCK_MATTER_POLICY){
  const inherited=parent??{position:[0,0,0],rotation:{x:0,y:0,z:0,w:1},linearVelocity:[0,0,0],angularVelocity:[0,0,0],poseRevision:0};
  const size=[...(sample.size??[13,13,13])],min=[...(sample.min??[-3,0,-3])],spacing=sample.spacing??.5;
  const record={id,lineageRootId:parent?.lineageRootId??id,parentId:parent?.id??null,createdByTransaction:0,
    contentRevision:1,poseRevision:inherited.poseRevision,spacing,min,size,sampleFrame:{offset:[...min],spacing},
    material:policy.material,domain:{id:domain.id,seed:domain.seed,version:domain.version},structure:structure?structuredClone(structure):null,...serialize(sample),
    position:[...inherited.position],rotation:{...inherited.rotation},linearVelocity:[...inherited.linearVelocity],angularVelocity:[...inherited.angularVelocity],sleepState:'ACTIVE'};
  record.bounds={min:[...min],max:min.map((value,axis)=>value+(size[axis]-1)*spacing)};
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
// Terrain extraction and C.1R mining share the same persisted MatterActor
// contract. Callers supply one already-resolved, actor-local scalar volume.
export function createMatterActorFromResolvedSamples({id,sample,position=[0,0,0],rotation={x:0,y:0,z:0,w:1},
  linearVelocity=[0,0,0],angularVelocity=[0,0,0],structure=emptyRockStructure(),component=null,material=MATTER_MATERIAL.ROCK}){
  if(typeof id!=='string'||!id||!sample?.densities||!sample?.materials||!sample?.size||sample.densities.length!==sample.materials.length||
    !Array.isArray(position)||position.length!==3||!position.every(Number.isFinite))throw new Error('Invalid resolved MatterActor input');
  const policy=matterPolicyFor(material);if(!policy)throw new Error('MatterActor material has no C.1R policy');
  const actor=newActor(id,{...sample,densities:new Float64Array(sample.densities),materials:new Uint8Array(sample.materials)},null,component,structure,policy);
  actor.position=[...position];actor.rotation={...rotation};actor.linearVelocity=[...linearVelocity];actor.angularVelocity=[...angularVelocity];return actor;
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
    stress:{hitSite:impact.hitSite,visitedNodes:impact.visitedNodes,propagatedBonds:impact.propagatedBonds,cracked:impact.cracked?.length??0,newlyBroken:impact.newlyBroken??[]},
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
  if(!support.components.length){
    for(const [ownershipKey,owner] of Object.entries(next.ownership))if(owner===actorId)accountConsumed(next,ownershipKey,'dig');
    next.actors=next.actors.filter(actor=>actor.id!==actorId);if(!next.retired.includes(actorId))next.retired.push(actorId);next.revision++;assertBudget(next);
    return {status:'OK',state:next,split:false,fracture:fracture.status==='FRACTURE',retired:true,cut,shatter:null,
      stress:{hitSite:impact.hitSite,visitedNodes:impact.visitedNodes,propagatedBonds:impact.propagatedBonds,cracked:impact.cracked?.length??0,newlyBroken:impact.newlyBroken??[]},
      structuralComponents:0,fractureMetrics:{elapsedMs:fracture.elapsedMs,seamSamples:0,bondId:null,chipMs:cut.elapsedMs,graphMs,stressMs:impact.elapsedMs,connectivityMs}};
  }
  if(support.components.length<=1){
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
      stress:{hitSite:impact.hitSite,visitedNodes:impact.visitedNodes,propagatedBonds:impact.propagatedBonds,cracked:impact.cracked?.length??0,newlyBroken:impact.newlyBroken??[]},
      structuralComponents:support.components.length,fractureMetrics:{elapsedMs:fracture.elapsedMs,seamSamples:0,bondId:null,
        chipMs:cut.elapsedMs,graphMs,stressMs:impact.elapsedMs,connectivityMs}};
  }
  // Topological separation is authoritative even when no structural bond
  // reached its fracture threshold. A rigid actor may never retain multiple
  // disconnected scalar components.
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
  return {status:'OK',state:next,split:true,fracture: fracture.status==='FRACTURE',children:children.map(a=>a.id),fractureDebris:newDebris.filter(item=>item.quantity>0),cut,shatter,
    stress:{hitSite:impact.hitSite,visitedNodes:impact.visitedNodes,propagatedBonds:impact.propagatedBonds,cracked:impact.cracked?.length??0,newlyBroken:impact.newlyBroken??[]},
    remainingQuantity:quantityAudit(next).total-quantityAudit(next).consumed,
    fractureMetrics:{elapsedMs:fracture.elapsedMs,seamSamples:fracture.status==='FRACTURE'?(fracture.seam?.removedSamples??0):0,bondId:fracture.bondId,largePieces:fracture.largePieces,
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
  if(isMixedMatterFixture(state?.fixture))return mineWorldMixed(state,hit,options);
  const policy=matterPolicyFor(state?.materialId);if(!policy)return {status:'HOLD',reason:`Unknown matter material ${state?.materialId}`,state};
  if(policy===ROCK_MATTER_POLICY)return mineWorldRock(state,hit,options);
  if(policy===DIRT_MATTER_POLICY)return mineWorldDirt(state,hit,options);
  return {status:'HOLD',reason:`No world edit strategy for ${policy.id}`,state};
}
export function mineActorMatter(state,actorId,expectedRevision,localHit,options={}){
  const actor=state?.actors?.find(item=>item.id===actorId),policy=matterPolicyFor(actor?.material);
  if(!policy)return {status:'HOLD',reason:`Unknown actor material ${actor?.material}`,state};
  if(actor.material===MATTER_MATERIAL.MIXED)return mineActorMixed(state,actorId,expectedRevision,localHit,options);
  if(policy===ROCK_MATTER_POLICY)return mineActorRock(state,actorId,expectedRevision,localHit,options);
  if(policy===DIRT_MATTER_POLICY)return mineActorDirt(state,actorId,expectedRevision,localHit,options);
  return {status:'HOLD',reason:`No actor edit strategy for ${policy.id}`,state};
}
export function worldMatterSamples(state){return deserialize(state.world,state.materialId??MATTER_MATERIAL.ROCK,state.fixture??'rock-boulder');}
export function actorMatterSamples(actor){
  if(Array.isArray(actor?.size)&&actor?.densities?.length===actor?.materials?.length){
    const size=[...actor.size],min=[...(actor.min??[-3,0,-3])],spacing=actor.spacing??.5,densities=Float64Array.from(actor.densities),materials=Uint8Array.from(actor.materials);
    if(size.length!==3||size.some(value=>!Number.isSafeInteger(value)||value<2)||size[0]*size[1]*size[2]!==densities.length)
      throw new Error('Invalid persisted MatterActor sample dimensions');
    return {size,min,spacing,densities,materials,readDensity([x,y,z]){if(x<0||y<0||z<0||x>=size[0]||y>=size[1]||z>=size[2])return 1;
      return densities[x+size[0]*(y+size[1]*z)];},position(i){return [i%size[0],Math.floor(i/size[0])%size[1],Math.floor(i/(size[0]*size[1]))].map((v,axis)=>min[axis]+v*spacing);}};
  }
  return deserialize(actor,actor?.material??MATTER_MATERIAL.ROCK);
}
export const actorRockSamples=actorMatterSamples;

function mixedCellMaterial(samples,p){
  const counts=new Map();for(let dz=0;dz<=1;dz++)for(let dy=0;dy<=1;dy++)for(let dx=0;dx<=1;dx++){
    const q=[p[0]+dx,p[1]+dy,p[2]+dz],i=q[0]+samples.size[0]*(q[1]+samples.size[1]*q[2]);
    if(samples.densities[i]<0){const id=samples.materials[i];counts.set(id,(counts.get(id)??0)+1);}
  }
  return [...counts].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0]?.[0]??0;
}
export function matterMaterialAt(samples,point,parcelMaterials=null,parcelIds=null){
  if(parcelMaterials&&parcelIds){
    const q=point.map((value,axis)=>(value-samples.min[axis])/samples.spacing),base=q.map(Math.floor);let nearest=null,nearestDistance=Infinity;
    for(let z=base[2]-1;z<=base[2];z++)for(let y=base[1]-1;y<=base[1];y++)for(let x=base[0]-1;x<=base[0];x++)for(let probe=0;probe<8;probe++){
      const localKey=`${x},${y},${z}:${probe}`,material=parcelMaterials[localKey];if(!parcelIds[localKey]||(material!==MATTER_MATERIAL.ROCK&&material!==MATTER_MATERIAL.DIRT))continue;
      const local=[x+((probe&1)?0.75:0.25),y+((probe&2)?0.75:0.25),z+((probe&4)?0.75:0.25)];
      const distance=local.reduce((sum,value,axis)=>sum+(value-q[axis])**2,0);
      if(distance<nearestDistance){nearestDistance=distance;nearest=material;}
    }
    if(nearest!==null)return nearest;
  }
  const q=point.map((v,i)=>(v-samples.min[i])/samples.spacing),base=q.map(Math.floor),fraction=q.map((v,i)=>v-base[i]),weights=new Map();
  for(let dz=0;dz<=1;dz++)for(let dy=0;dy<=1;dy++)for(let dx=0;dx<=1;dx++){
    const p=[base[0]+dx,base[1]+dy,base[2]+dz];if(p.some((v,i)=>v<0||v>=samples.size[i]))continue;
    const i=p[0]+samples.size[0]*(p[1]+samples.size[1]*p[2]);if(samples.densities[i]>=0)continue;
    const weight=(dx?fraction[0]:1-fraction[0])*(dy?fraction[1]:1-fraction[1])*(dz?fraction[2]:1-fraction[2]),id=samples.materials[i];
    weights.set(id,(weights.get(id)??0)+weight);
  }
  return [...weights].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0]?.[0]??0;
}
function cloneForMaterial(samples,material){const out=cloneMatterSamples(samples);for(let i=0;i<out.densities.length;i++)if(out.materials[i]!==material){out.densities[i]=Math.max(.5,-out.densities[i]);out.materials[i]=0;}return out;}
function componentMaterialMask(samples,material,cells){
  const out=cloneMatterSamples(samples),set=new Set(cells.map(key)),[nx,ny,nz]=samples.size;
  const belongs=(x,y,z)=>{let selected=0,total=0;for(let dz=-1;dz<=0;dz++)for(let dy=-1;dy<=0;dy++)for(let dx=-1;dx<=0;dx++){
    const p=[x+dx,y+dy,z+dz];if(p.some((v,i)=>v<0||v>=samples.size[i]-1))continue;
    const i=p[0]+nx*(p[1]+ny*p[2]);if(samples.densities[i]>=0||samples.materials[i]!==material)continue;total++;if(set.has(key(p)))selected++;
  }return selected>0&&selected>=total/2;};
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const i=x+nx*(y+ny*z);
    if(samples.densities[i]>=0||samples.materials[i]!==material||!belongs(x,y,z)){out.densities[i]=Math.max(.5,-samples.densities[i]);out.materials[i]=0;}}
  return out;
}
function mixedSupport(samples){
  const result=analyzeMatterConnectivity(samples,{anchor:([,y])=>y===0,identityForCell:p=>mixedCellMaterial(samples,p)||'air',canConnect:()=>true});
  if(result.status!=='OK')return result;
  const workUnits=result.cellCount+result.bonds;if(workUnits>12288)return {status:'HOLD',reason:'mixed support work cap',workUnits};
  return {...result,workUnits};
}
function componentContainsMaterial(samples,component,material){
  const [nx,ny]=samples.size;for(const [x,y,z] of component.cells)for(let dz=0;dz<=1;dz++)for(let dy=0;dy<=1;dy++)for(let dx=0;dx<=1;dx++){
    const i=x+dx+nx*((y+dy)+ny*(z+dz));if(samples.densities[i]<0&&samples.materials[i]===material)return true;
  }return false;
}
function summarizeMixedSupport(support,workUnits=support.workUnits){return {components:support.components.length,workUnits,
  anchoredRock:support.components.some(c=>c.anchored&&c.fragments.some(f=>f.id===MATTER_MATERIAL.ROCK)),
  anchoredDirt:support.components.some(c=>c.anchored&&c.fragments.some(f=>f.id===MATTER_MATERIAL.DIRT))};}
function updateMixedConsumed(next,before,after,material,kind){
  for(const [k,owner] of Object.entries(next.ownership))if(owner==='world'&&next.parcelMaterials[k]===material){
    const [cell,part]=k.split(':'),p=cell.split(',').map(Number),n=Number(part);
    if(parcelBits(before,p)[n]&&!parcelBits(after,p)[n])accountConsumed(next,k,kind);
  }
}
function preserveForeignParcels(state,before,edited,editedMaterial){
  const [nx,ny]=before.size,restore=new Set();
  for(const [k,owner] of Object.entries(state.ownership))if(owner==='world'&&state.parcelMaterials[k]!==editedMaterial){
    const [cell,part]=k.split(':'),p=cell.split(',').map(Number),probe=Number(part);
    if(!parcelBits(before,p)[probe]||parcelBits(edited,p)[probe])continue;
    for(let dz=0;dz<=1;dz++)for(let dy=0;dy<=1;dy++)for(let dx=0;dx<=1;dx++)restore.add((p[0]+dx)+nx*((p[1]+dy)+ny*(p[2]+dz)));
  }
  for(const i of restore){edited.densities[i]=before.densities[i];edited.materials[i]=before.materials[i];}
}
function foreignSampleMask(state,samples,editedMaterial){
  const [nx,ny]=samples.size,protectedSamples=new Set();
  for(const [k,owner] of Object.entries(state.ownership))if(owner==='world'&&state.parcelMaterials[k]!==editedMaterial){
    const [cell]=k.split(':'),p=cell.split(',').map(Number);
    for(let dz=0;dz<=1;dz++)for(let dy=0;dy<=1;dy++)for(let dx=0;dx<=1;dx++)protectedSamples.add((p[0]+dx)+nx*((p[1]+dy)+ny*(p[2]+dz)));
  }
  return protectedSamples;
}

function componentMaterialProbes(samples,component,parcelMaterials=null){
  const counts={rock:0,dirt:0};
  for(const cell of component.cells){const bits=parcelBits(samples,cell);for(let probe=0;probe<bits.length;probe++)if(bits[probe]){
    const material=parcelMaterials?.[`${key(cell)}:${probe}`]??parcelMaterial(samples,cell,probe);
    if(material===MATTER_MATERIAL.ROCK)counts.rock++;else if(material===MATTER_MATERIAL.DIRT)counts.dirt++;
  }}
  return counts;
}

function mineActorMixed(state,actorId,expectedRevision,localHit,{material:requestedMaterial=null,fractureDomain=domain,dirtProfile=DIRT_PROFILE,rockProfile=ROCK_PROFILE}={}){
  const next=structuredClone(state),parent=next.actors.find(actor=>actor.id===actorId);
  if(!parent||parent.contentRevision!==expectedRevision)return {status:'STALE',state};
  const before=actorMatterSamples(parent),targetMaterial=requestedMaterial??matterMaterialAt(before,localHit);
  if(targetMaterial!==MATTER_MATERIAL.ROCK&&targetMaterial!==MATTER_MATERIAL.DIRT)return {status:'NO_HIT',state};
  const supportState={...state,ownership:Object.fromEntries(Object.entries(state.ownership).map(([key,owner])=>[key,owner===actorId?'world':owner]))};
  let direct=cloneMatterSamples(before),after=null,cut=null,nextStructure=parent.structure??emptyRockStructure(),stress=null,crumble=null;
  if(targetMaterial===MATTER_MATERIAL.DIRT){
    cut=excavateDirt(direct,fractureDomain,localHit,state.revision+1,dirtProfile);
    if(!cut.changed)return {status:'NO_HIT',state};
    preserveForeignParcels(supportState,before,direct,MATTER_MATERIAL.DIRT);
    const actorDirtProfile={...dirtProfile,supportWindowIntervals:Math.min(MIXED_MATTER_POLICY.profile.maxSupportIntervals,Math.max(...before.size.map(v=>v-1))),
      maxLocalCrumbleWork:MIXED_MATTER_POLICY.profile.maxSupportWork},
      cohesion=resolveDirtSupport(direct,localHit,actorDirtProfile,{anchor:()=>false,previous:before,material:MATTER_MATERIAL.DIRT,
      identityForCell:cell=>mixedCellMaterial(direct,cell)||'air',canConnect:()=>true,
      protectedSamples:foreignSampleMask(supportState,before,MATTER_MATERIAL.DIRT)});
    if(cohesion.status!=='OK')return {...cohesion,state};
    after=cloneMatterSamples(cohesion.sample);crumble={units:cohesion.crumbledProbeUnits,components:cohesion.crumbleComponents};
  }else{
    const rock=cloneForMaterial(before,MATTER_MATERIAL.ROCK);
    cut=chipHardRock(rock,fractureDomain,localHit,(nextStructure.hitSequence??0)+1,rockProfile);
    if(!cut.changed)return {status:'NO_HIT',state};
    const graph=buildRockBondGraph(rock,fractureDomain,rockProfile,nextStructure),impact=impactRockStructure(graph,nextStructure,localHit,fractureDomain,rockProfile);
    if(impact.status==='HOLD')return {...impact,state};
    nextStructure=impact.state;stress={hitSite:impact.hitSite,visitedNodes:impact.visitedNodes,propagatedBonds:impact.propagatedBonds,
      cracked:impact.cracked?.length??0,newlyBroken:impact.newlyBroken??[]};
    after=cloneMatterSamples(before);
    for(let i=0;i<after.densities.length;i++)if(before.materials[i]===MATTER_MATERIAL.ROCK){after.densities[i]=rock.densities[i];after.materials[i]=rock.materials[i];}
    preserveForeignParcels(supportState,before,after,MATTER_MATERIAL.ROCK);
  }
  const support=analyzeMatterConnectivity(after,{anchor:()=>false,identityForCell:cell=>mixedCellMaterial(after,cell)||'air',canConnect:()=>true});
  if(support.status!=='OK')return {...support,state};
  if(!support.components.length){
    for(const [ownershipKey,owner] of Object.entries(next.ownership))if(owner===actorId)accountConsumed(next,ownershipKey,
      parcelBits(before,ownershipKey.split(':')[0].split(',').map(Number))[Number(ownershipKey.split(':')[1])]?'dig':'crumble');
    next.actors=next.actors.filter(actor=>actor.id!==actorId);if(!next.retired.includes(actorId))next.retired.push(actorId);next.revision++;assertBudget(next);
    return {status:'OK',state:next,material:targetMaterial,cut,stress,split:false,retired:true,children:[],
      fractureMetrics:{elapsedMs:cut.elapsedMs,chipMs:cut.elapsedMs,graphMs:0,stressMs:0,connectivityMs:0,supportWorkUnits:support.cellCount+support.bonds}};
  }
  const nextRevision=state.revision+1,componentByCell=new Map(),componentOwners=[],children=[],crumbleComponents=new Set();
  support.components.forEach((component,index)=>component.cells.forEach(cell=>componentByCell.set(key(cell),index)));
  let masks=null;
  if(support.components.length>1){masks=componentMasks(after,support.components,{fractureBoundary:true});if(masks.status!=='OK')return {...masks,state};}
  for(let index=0;index<support.components.length;index++){
    const component=support.components[index],counts=componentMaterialProbes(after,component,next.parcelMaterials),total=counts.rock+counts.dirt;
    if(!total){componentOwners[index]=null;continue;}
    if(!counts.rock&&counts.dirt<dirtProfile.persistentClodMinProbes){componentOwners[index]=null;crumbleComponents.add(index);continue;}
    const childId=support.components.length===1?parent.id:`${parent.id}/mixed-${nextRevision}-${index}`,
      actorMaterial=counts.rock&&counts.dirt?MATTER_MATERIAL.MIXED:counts.rock?MATTER_MATERIAL.ROCK:MATTER_MATERIAL.DIRT,
      policy=matterPolicyFor(actorMaterial),sample=masks?.outputs[index]??after,
      structure=actorMaterial===MATTER_MATERIAL.DIRT?null:nextStructure,
      record=support.components.length===1?parent:newActor(childId,sample,parent,component,structure,policy);
    if(support.components.length===1){
      const oldCOM=parent.localCOM??[0,4,0],newCOM=componentCOM(component,after),worldOld=actorToWorldPoint(parent,oldCOM),worldNew=actorToWorldPoint(parent,newCOM),r=worldNew.map((v,i)=>v-worldOld[i]),w=parent.angularVelocity;
      parent.linearVelocity=[parent.linearVelocity[0]+w[1]*r[2]-w[2]*r[1],parent.linearVelocity[1]+w[2]*r[0]-w[0]*r[2],parent.linearVelocity[2]+w[0]*r[1]-w[1]*r[0]];
      parent.localCOM=newCOM;parent.structure=structure;parent.material=actorMaterial;Object.assign(parent,serialize(after));parent.contentRevision++;
      parent.size=[...after.size];parent.min=[...after.min];parent.spacing=after.spacing;parent.sampleFrame={offset:[...after.min],spacing:after.spacing};
      parent.bounds={min:[...after.min],max:after.min.map((v,axis)=>v+(after.size[axis]-1)*after.spacing)};parent.sleepState='ACTIVE';
    }else{record.createdByTransaction=nextRevision;record.material=actorMaterial;record.structure=structure;children.push(record);}
    componentOwners[index]=childId;
  }
  if(support.components.length===1&&crumbleComponents.has(0)){
    for(const [ownershipKey,owner] of Object.entries(next.ownership))if(owner===actorId)accountConsumed(next,ownershipKey,'crumble');
    next.actors=next.actors.filter(actor=>actor.id!==actorId);if(!next.retired.includes(actorId))next.retired.push(actorId);
  }
  const liveActors=children.length?support.components.filter((_,index)=>componentOwners[index]&&!crumbleComponents.has(index)).length:0;
  if(next.actors.length-1+liveActors>4)return {status:'HOLD',reason:'mixed actor child budget',state};
  for(const [ownershipKey,owner] of Object.entries(next.ownership))if(owner===actorId){
    const [cellText,partText]=ownershipKey.split(':'),cell=cellText.split(',').map(Number),probe=Number(partText),material=next.parcelMaterials[ownershipKey],wasLive=parcelBits(before,cell)[probe],isLive=parcelBits(after,cell)[probe];
    if(wasLive&&!isLive){accountConsumed(next,ownershipKey,material===targetMaterial?'dig':'crumble');continue;}
    const componentIndex=componentByCell.get(cellText);
    if(componentIndex!==undefined&&crumbleComponents.has(componentIndex)){accountConsumed(next,ownershipKey,'crumble');continue;}
    if(!isLive){const nearest=nearestComponentOwner(cell,support.components,componentOwners);
      if(nearest){next.ownership[ownershipKey]=nearest;continue;}if(wasLive)return {status:'HOLD',reason:`live mixed parcel has no component owner: ${ownershipKey}`,state};
      accountConsumed(next,ownershipKey,'crumble');continue;
    }
    const destination=componentIndex===undefined?nearestComponentOwner(cell,support.components,componentOwners):componentOwners[componentIndex];
    if(!destination)return {status:'HOLD',reason:`mixed parcel has no persistent owner: ${ownershipKey}`,state};
    next.ownership[ownershipKey]=destination;
  }
  if(support.components.length>1){
    next.actors=next.actors.filter(actor=>actor.id!==actorId).concat(children);if(!next.retired.includes(actorId))next.retired.push(actorId);
  }
  next.revision++;assertBudget(next);
  return {status:'OK',state:next,material:targetMaterial,cut,stress,split:support.components.length>1,children:children.map(actor=>actor.id),
    crumbledComponents:[...crumbleComponents],structuralComponents:support.components.length,
    fractureMetrics:{elapsedMs:cut.elapsedMs,chipMs:cut.elapsedMs,graphMs:0,stressMs:0,connectivityMs:0,supportWorkUnits:support.cellCount+support.bonds}};
}

function mineMixedDirt(state,hit){
  const next=structuredClone(state),before=deserialize(state.world,3,state.fixture),direct=cloneMatterSamples(before),cut=excavateDirt(direct,domain,hit,state.revision+1,DIRT_PROFILE);
  if(!cut.changed)return {status:'NO_HIT',state};
  preserveForeignParcels(state,before,direct,MATTER_MATERIAL.DIRT);
  const policy=DIRT_MATTER_POLICY,cohesion=policy.analyzeSupport(direct,hit,policy.profile,{anchor:([,y])=>y===0,previous:before,
    material:policy.material,identityForCell:p=>mixedCellMaterial(direct,p)||'air',canConnect:()=>true,
    protectedSamples:foreignSampleMask(state,before,policy.material)});
  if(cohesion.status!=='OK')return {...cohesion,state};
  const after=cloneMatterSamples(cohesion.sample),support=cohesion.support,supportPasses=[],
    recomputeSupport=sample=>{const result=mixedSupport(sample);if(result.status==='OK')supportPasses.push(result.workUnits);return result;};
  if(Number.isSafeInteger(support.workUnits))supportPasses.push(support.workUnits);
  const unanchored=support.components.filter(c=>!c.anchored);let detached=0,transferred=0,initialCrumble=false;
  for(const component of unanchored)for(const fragment of component.fragments){
    const material=fragment.id;if(material!==MATTER_MATERIAL.ROCK&&material!==MATTER_MATERIAL.DIRT)continue;
    const componentCells=new Set(fragment.cells.map(key)),owned=Object.entries(next.ownership).filter(([k,owner])=>owner==='world'&&next.parcelMaterials[k]===material&&
      (material===MATTER_MATERIAL.ROCK||componentCells.has(k.slice(0,k.indexOf(':')))));
    if(!owned.length)continue;
    const dirtActorCount=next.actors.filter(a=>a.material===MATTER_MATERIAL.DIRT).length;
    if(material===MATTER_MATERIAL.DIRT&&(owned.length<DIRT_PROFILE.persistentClodMinProbes||dirtActorCount>=DIRT_PROFILE.maxDynamicClods)){
      for(const [ownershipKey] of owned){const [cell,part]=ownershipKey.split(':'),p=cell.split(',').map(Number),probe=Number(part);
        if(parcelBits(after,p)[probe])accountConsumed(next,ownershipKey,'crumble');}
      const mask=componentMaterialMask(after,material,fragment.cells);for(let i=0;i<after.densities.length;i++)if(after.materials[i]===material&&mask.densities[i]<0){after.densities[i]=Math.max(.5,-after.densities[i]);after.materials[i]=0;}
      initialCrumble=true;
      continue;
    }
    const rockActors=next.actors.filter(a=>a.material===MATTER_MATERIAL.ROCK).length,dirtActors=next.actors.filter(a=>a.material===MATTER_MATERIAL.DIRT).length;
    if(material===MATTER_MATERIAL.ROCK&&rockActors>=4)return {status:'HOLD',reason:'rock actor budget',state};
    const id=`${material===MATTER_MATERIAL.ROCK?'rock':'dirt'}-${state.revision+1}-${detached}`,piece=material===MATTER_MATERIAL.ROCK?cloneForMaterial(before,material):componentMaterialMask(after,material,fragment.cells),materialPolicy=matterPolicyFor(material),actor=newActor(id,piece,null,{...component,cells:fragment.cells},
      material===MATTER_MATERIAL.ROCK?emptyRockStructure():null,materialPolicy);
    actor.createdByTransaction=state.revision+1;let amount=0;
    for(const [ownershipKey] of owned){const [cell,part]=ownershipKey.split(':'),p=cell.split(',').map(Number),probe=Number(part);
      if(parcelBits(material===MATTER_MATERIAL.ROCK?before:after,p)[probe]){next.ownership[ownershipKey]=id;amount++;}else accountConsumed(next,ownershipKey,'dig');}
    if(amount){next.actors.push(actor);detached++;transferred+=amount;
      for(let i=0;i<after.densities.length;i++)if(after.materials[i]===material&&(material===MATTER_MATERIAL.ROCK||piece.materials[i]===material)){after.densities[i]=Math.max(.5,-after.densities[i]);after.materials[i]=0;}}
  }
  // Small dirt crumble can remove the last support under rock. Resolve that
  // changed graph before the dirt post-extraction pass.
  let afterInitialCrumble=support;
  if(initialCrumble||detached){afterInitialCrumble=recomputeSupport(after);if(afterInitialCrumble.status!=='OK')return {...afterInitialCrumble,state};}
  const anchoredRockRemains=afterInitialCrumble.components.some(component=>component.anchored&&componentContainsMaterial(after,component,MATTER_MATERIAL.ROCK));
  if(!anchoredRockRemains){
    const owned=Object.entries(next.ownership).filter(([k,owner])=>owner==='world'&&next.parcelMaterials[k]===MATTER_MATERIAL.ROCK);
    if(owned.length&&next.actors.filter(actor=>actor.material===MATTER_MATERIAL.ROCK).length>=4)return {status:'HOLD',reason:'rock actor budget',state};
    if(owned.length){const piece=cloneForMaterial(after,MATTER_MATERIAL.ROCK),id=`rock-${state.revision+1}-${detached}`,
      rockComponentResult=analyzeMatterConnectivity(piece,{anchor:()=>false}),rockComponent=rockComponentResult.status==='OK'?rockComponentResult.components[0]:null,
      component=rockComponent??{cells:Object.entries(next.ownership).filter(([k,owner])=>owner===id).map(([k])=>k.split(':')[0].split(',').map(Number)),occupiedProbes:owned.length},
      actor=newActor(id,piece,null,component,emptyRockStructure(),ROCK_MATTER_POLICY);actor.createdByTransaction=state.revision+1;
      let amount=0;for(const [ownershipKey] of owned){const [cell,part]=ownershipKey.split(':'),p=cell.split(',').map(Number),probe=Number(part);
        if(parcelBits(after,p)[probe]){next.ownership[ownershipKey]=id;amount++;}else accountConsumed(next,ownershipKey,'dig');}
      if(amount){next.actors.push(actor);detached++;transferred+=amount;
        for(let i=0;i<after.densities.length;i++)if(after.materials[i]===MATTER_MATERIAL.ROCK){after.densities[i]=Math.max(.5,-after.densities[i]);after.materials[i]=0;}}
    }
  }
  // Removing unsupported rock changes dirt's support graph. Recompute on the
  // post-transfer field, then classify every newly loose dirt component.
  const rockTransferred=detached>0&&next.actors.some(actor=>actor.createdByTransaction===state.revision+1&&actor.material===MATTER_MATERIAL.ROCK);
  let postExtractionSupport=afterInitialCrumble;
  if(rockTransferred){postExtractionSupport=recomputeSupport(after);if(postExtractionSupport.status!=='OK')return {...postExtractionSupport,state};}
  let postDirtCrumbleUnits=0,postDirtChanged=false;
  for(const component of postExtractionSupport.components)for(const fragment of component.fragments){
    if(fragment.id!==MATTER_MATERIAL.DIRT||component.anchored)continue;
    const cells=new Set(fragment.cells.map(key)),owned=Object.entries(next.ownership).filter(([k,owner])=>owner==='world'&&
      next.parcelMaterials[k]===MATTER_MATERIAL.DIRT&&cells.has(k.slice(0,k.indexOf(':'))));
    if(!owned.length)continue;
    if(owned.length<DIRT_PROFILE.persistentClodMinProbes||next.actors.filter(a=>a.material===MATTER_MATERIAL.DIRT).length>=DIRT_PROFILE.maxDynamicClods){
      const mask=componentMaterialMask(after,MATTER_MATERIAL.DIRT,fragment.cells);
      for(const [ownershipKey] of owned)if(next.ownership[ownershipKey]==='world'){
        const [cell,part]=ownershipKey.split(':'),p=cell.split(',').map(Number);
        if(parcelBits(after,p)[Number(part)]){accountConsumed(next,ownershipKey,'crumble');postDirtCrumbleUnits++;}
      }
      for(let i=0;i<after.densities.length;i++)if(after.materials[i]===MATTER_MATERIAL.DIRT&&mask.materials[i]!==MATTER_MATERIAL.DIRT){after.densities[i]=Math.max(.5,-after.densities[i]);after.materials[i]=0;}
      postDirtChanged=true;
      continue;
    }
    const piece=componentMaterialMask(after,MATTER_MATERIAL.DIRT,fragment.cells),id=`dirt-${state.revision+1}-${detached}`,
      actor=newActor(id,piece,null,{...component,cells:fragment.cells},null,DIRT_MATTER_POLICY);actor.createdByTransaction=state.revision+1;
    let amount=0;for(const [ownershipKey] of owned){const [cell,part]=ownershipKey.split(':'),p=cell.split(',').map(Number);
      if(parcelBits(after,p)[Number(part)]){next.ownership[ownershipKey]=id;amount++;}else accountConsumed(next,ownershipKey,'dig');}
    if(amount){next.actors.push(actor);detached++;transferred+=amount;postDirtChanged=true;
      for(let i=0;i<after.densities.length;i++)if(after.materials[i]===MATTER_MATERIAL.DIRT&&piece.materials[i]!==MATTER_MATERIAL.DIRT){after.densities[i]=Math.max(.5,-after.densities[i]);after.materials[i]=0;}}
  }
  let finalSupport=postExtractionSupport;if(postDirtChanged){finalSupport=recomputeSupport(after);if(finalSupport.status!=='OK')return {...finalSupport,state};}
  // Dirt can crumble in this bounded pass and remove the last mixed contact
  // below rock. Recheck once more, transfer that newly unsupported rock, then
  // run the post-transfer dirt support pass required by the ownership change.
  if(!finalSupport.components.some(component=>component.anchored&&componentContainsMaterial(after,component,MATTER_MATERIAL.ROCK))){
    const owned=Object.entries(next.ownership).filter(([k,owner])=>owner==='world'&&next.parcelMaterials[k]===MATTER_MATERIAL.ROCK);
    if(owned.length){if(next.actors.filter(actor=>actor.material===MATTER_MATERIAL.ROCK).length>=4)return {status:'HOLD',reason:'rock actor budget',state};
      const piece=cloneForMaterial(before,MATTER_MATERIAL.ROCK),id=`rock-${state.revision+1}-${detached}`,rockComponents=analyzeMatterConnectivity(piece,{anchor:()=>false}),
        component=rockComponents.status==='OK'?rockComponents.components[0]??null:null,
        actor=newActor(id,piece,null,component,emptyRockStructure(),ROCK_MATTER_POLICY);actor.createdByTransaction=state.revision+1;let amount=0;
      for(const [ownershipKey] of owned){const [cell,part]=ownershipKey.split(':'),p=cell.split(',').map(Number),probe=Number(part);
        if(parcelBits(before,p)[probe]){next.ownership[ownershipKey]=id;amount++;}else accountConsumed(next,ownershipKey,'dig');}
      if(amount){next.actors.push(actor);detached++;transferred+=amount;postDirtChanged=false;
        for(let i=0;i<after.densities.length;i++)if(after.materials[i]===MATTER_MATERIAL.ROCK){after.densities[i]=Math.max(.5,-after.densities[i]);after.materials[i]=0;}
        finalSupport=recomputeSupport(after);if(finalSupport.status!=='OK')return {...finalSupport,state};
        // The second dirt evaluation uses the post-rock field. Small loose
        // material crumbles and substantial dirt gets a persistent clod.
        for(const component of finalSupport.components)for(const fragment of component.fragments){
          if(fragment.id!==MATTER_MATERIAL.DIRT||component.anchored)continue;
          const cells=new Set(fragment.cells.map(key)),dirtOwned=Object.entries(next.ownership).filter(([k,owner])=>owner==='world'&&next.parcelMaterials[k]===MATTER_MATERIAL.DIRT&&cells.has(k.slice(0,k.indexOf(':'))));
          if(!dirtOwned.length)continue;const piece=componentMaterialMask(after,MATTER_MATERIAL.DIRT,fragment.cells);
          if(dirtOwned.length<DIRT_PROFILE.persistentClodMinProbes||next.actors.filter(value=>value.material===MATTER_MATERIAL.DIRT).length>=DIRT_PROFILE.maxDynamicClods){
            for(const [ownershipKey] of dirtOwned){const [cell,part]=ownershipKey.split(':'),p=cell.split(',').map(Number);if(parcelBits(after,p)[Number(part)]){accountConsumed(next,ownershipKey,'crumble');postDirtCrumbleUnits++;}}
            for(let i=0;i<after.densities.length;i++)if(after.materials[i]===MATTER_MATERIAL.DIRT&&piece.materials[i]!==MATTER_MATERIAL.DIRT){after.densities[i]=Math.max(.5,-after.densities[i]);after.materials[i]=0;}
            postDirtChanged=true;continue;
          }
          const dirtId=`dirt-${state.revision+1}-${detached}`,dirtActor=newActor(dirtId,piece,null,{...component,cells:fragment.cells},null,DIRT_MATTER_POLICY);dirtActor.createdByTransaction=state.revision+1;let count=0;
          for(const [ownershipKey] of dirtOwned){const [cell,part]=ownershipKey.split(':'),p=cell.split(',').map(Number);if(parcelBits(after,p)[Number(part)]){next.ownership[ownershipKey]=dirtId;count++;}else accountConsumed(next,ownershipKey,'dig');}
          if(count){next.actors.push(dirtActor);detached++;transferred+=count;postDirtChanged=true;
            for(let i=0;i<after.densities.length;i++)if(after.materials[i]===MATTER_MATERIAL.DIRT&&piece.materials[i]!==MATTER_MATERIAL.DIRT){after.densities[i]=Math.max(.5,-after.densities[i]);after.materials[i]=0;}}
        }
        if(postDirtChanged){finalSupport=recomputeSupport(after);if(finalSupport.status!=='OK')return {...finalSupport,state};}
      }
    }
  }
  updateMixedConsumed(next,before,after,MATTER_MATERIAL.DIRT,'dig');
  const totalSupportWork=cohesion.workCells+supportPasses.reduce((sum,value)=>sum+value,0),boundedPassWork=Math.max(cohesion.workCells,...supportPasses);
  if(totalSupportWork>12288)return {status:'HOLD',reason:'mixed transaction support work cap',workUnits:totalSupportWork,state};
  next.world={mixedSnapshot:serialize(after),structure:emptyRockStructure()};next.supportSummary={...summarizeMixedSupport(finalSupport,boundedPassWork),
    before:state.supportSummary?{components:state.supportSummary.components,workUnits:state.supportSummary.workUnits,
      anchoredRock:state.supportSummary.anchoredRock,anchoredDirt:state.supportSummary.anchoredDirt}:null};next.revision++;assertBudget(next);
  return {status:'OK',state:next,detached,actorId:next.actors.at(-1)?.id??null,transferred,cut,
    support:{...next.supportSummary,before:state.supportSummary??null,workUnits:totalSupportWork},
    crumble:{units:cohesion.crumbledProbeUnits+postDirtCrumbleUnits,components:cohesion.crumbleComponents,position:[...hit]},
    fracture:false,stress:null,fractureMetrics:{elapsedMs:cohesion.elapsedMs,chipMs:cut.elapsedMs,graphMs:0,stressMs:0,connectivityMs:cohesion.connectivityMs,
      crumbleMs:Math.max(0,cohesion.elapsedMs-cohesion.connectivityMs),supportWorkUnits:cohesion.workCells}};
}
function mineMixedRock(state,hit){
  const next=structuredClone(state),before=deserialize(state.world,3,state.fixture),rock=cloneForMaterial(before,MATTER_MATERIAL.ROCK),structure=state.world.structure??emptyRockStructure(),policy=ROCK_MATTER_POLICY,
    chip=policy.removal(rock,domain,hit,structure.hitSequence+1,policy.profile);
  if(!chip.changed)return {status:'NO_HIT',state};
  const graph=policy.buildStructure(rock,domain,policy.profile,structure),impact=policy.applyStructure(graph,structure,hit,domain,policy.profile);
  if(impact.status==='HOLD')return {...impact,state};
  const supportStarted=performance.now(),rockSupport=policy.analyzeSupport(rock,domain,{anchor:([,y])=>y===0,brokenBonds:impact.state.broken}),connectivityMs=performance.now()-supportStarted;
  if(rockSupport.status!=='OK')return {...rockSupport,state};
  const after=cloneMatterSamples(before);for(let i=0;i<after.densities.length;i++)if(before.materials[i]===MATTER_MATERIAL.ROCK){after.densities[i]=rock.densities[i];after.materials[i]=rock.materials[i];}
  updateMixedConsumed(next,before,after,MATTER_MATERIAL.ROCK,'dig');next.world={mixedSnapshot:serialize(after),structure:impact.state};next.revision++;assertBudget(next);
  return {status:'OK',state:next,detached:0,cut:chip,stress:{hitSite:impact.hitSite,visitedNodes:impact.visitedNodes,propagatedBonds:impact.propagatedBonds,cracked:impact.cracked?.length??0,newlyBroken:impact.newlyBroken??[]},
    support:{rockComponents:rockSupport.components.length,rockBonds:rockSupport.bonds},
    fractureMetrics:{elapsedMs:chip.elapsedMs+graph.elapsedMs+impact.elapsedMs+connectivityMs,chipMs:chip.elapsedMs,graphMs:graph.elapsedMs,
      stressMs:impact.elapsedMs,connectivityMs,supportWorkUnits:rockSupport.cellCount+rockSupport.bonds}};
}
export function mineWorldMixed(state,hit,{material=matterMaterialAt(worldMatterSamples(state),hit)}={}){
  if(!isMixedMatterFixture(state?.fixture))return {status:'HOLD',reason:'Mixed policy does not match this fixture',state};
  if(material===MATTER_MATERIAL.DIRT)return mineMixedDirt(state,hit);
  if(material===MATTER_MATERIAL.ROCK)return mineMixedRock(state,hit);
  return {status:'NO_HIT',state};
}
