import { rockDomain, cutRockSamples } from './fracture-field.js';
import { makeSupportedRockSamples, supportedRockDensity } from './matter-fixtures.js';
import { createWorldMatterVolume, createActorMatterVolume } from './matter-volume.js';
import { analyzeRockConnectivity } from './matter-connectivity.js';
import { cloneRockSamples, extractRockIsland, parcelBits } from './matter-ownership.js';
import { actorToWorldPoint } from './matter-target.js';

export const CELLULAR_VERSION='cellular-rock-0.5a-v1';
const domain=rockDomain(9212026),key=p=>p.join(',');
const frame={spacing:.5,offset:[-3,0,-3]},actorBounds={min:[0,0,0],max:[12,12,12]};
const parcelKey=(p,i)=>`${key(p)}:${i}`;
function eachCell(sample,fn){for(let z=0;z<sample.size[2]-1;z++)for(let y=0;y<sample.size[1]-1;y++)for(let x=0;x<sample.size[0]-1;x++)fn([x,y,z]);}
function serialize(sample){return {densities:Array.from(sample.densities),materials:Array.from(sample.materials)};}
function serializeWorld(sample){const baseline=makeSupportedRockSamples(),densityEdits={};
  for(let i=0;i<sample.densities.length;i++)if(sample.densities[i]!==baseline.densities[i]){
    const x=i%13,y=Math.floor(i/13)%13,z=Math.floor(i/169);densityEdits[`${x},${y},${z}`]=sample.densities[i];
  }
  return {densityEdits};
}
function deserialize(data){
  const sample=makeSupportedRockSamples();
  if(data.densityEdits){
    const edits=new Map(Object.entries(data.densityEdits).map(([k,density])=>[k,{density,material:density<0?1:0,domain:domain.id}]));
    const volume=createWorldMatterVolume({id:'world-rock',frame,domain:domain.id,edits,
      generator:p=>{const density=supportedRockDensity(p.map((v,i)=>frame.offset[i]+v*.5));return {density,material:density<0?1:0};}});
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
function quantity(ownership,owner){return Object.values(ownership).filter(v=>v===owner).length;}
export function quantityAudit(state){const owners={world:quantity(state.ownership,'world'),consumed:quantity(state.ownership,'consumed')};
  for(const actor of state.actors)owners[actor.id]=quantity(state.ownership,actor.id);
  const total=Object.values(owners).reduce((a,b)=>a+b,0);
  return {...owners,total,initial:state.initialQuantity,balanced:total===state.initialQuantity&&owners.consumed===state.rewards.stoneUnits};
}
export function createInitialRockState(){
  const sample=makeSupportedRockSamples(),ownership={};
  eachCell(sample,p=>{const bits=parcelBits(sample,p);for(let i=0;i<8;i++)if(bits[i])ownership[parcelKey(p,i)]='world';});
  const initialQuantity=Object.keys(ownership).length;
  return {version:CELLULAR_VERSION,seed:9212026,spacing:.5,revision:0,initialQuantity,
    world:{densityEdits:{}},actors:[],retired:[],ownership,rewards:{stoneUnits:0}};
}
function assertBudget(state){if(state.actors.length>4||state.actors.some(a=>a.densities.length>40000))throw new Error('Cellular actor budget exceeded');
  if(!quantityAudit(state).balanced)throw new Error('Cellular quantity invariant failed');}
function newActor(id,sample,parent=null,component=null){
  const inherited=parent??{position:[0,0,0],rotation:{x:0,y:0,z:0,w:1},linearVelocity:[0,0,0],angularVelocity:[0,0,0],poseRevision:0};
  const record={id,lineageRootId:parent?.lineageRootId??id,parentId:parent?.id??null,createdByTransaction:0,
    contentRevision:parent?1:1,poseRevision:inherited.poseRevision,spacing:.5,sampleFrame:{offset:[-3,0,-3],spacing:.5},
    domain:{id:domain.id,seed:domain.seed,version:domain.version},...serialize(sample),
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
    if(component)record.angularVelocity=[0,0,1.2];
  }
  return record;
}
function componentCOM(component,sample){let sum=[0,0,0],weight=0;for(const p of component.cells){const meter=p.map((v,i)=>sample.min[i]+(v+.5)*sample.spacing),w=parcelBits(sample,p).filter(Boolean).length;sum=sum.map((v,i)=>v+meter[i]*w);weight+=w;}return sum.map(v=>v/Math.max(weight,1));}
function updateFromMask(state,currentOwner,nextOwner,after,componentByCell=null){
  for(const [k,owner] of Object.entries(state.ownership))if(owner===currentOwner){
    const [cell,part]=k.split(':'),p=cell.split(',').map(Number),alive=parcelBits(after,p)[Number(part)];
    if(!alive){state.ownership[k]='consumed';state.rewards.stoneUnits++;continue;}
    if(componentByCell){const target=componentByCell.get(cell);if(!target)throw new Error(`No owner for live parcel ${k}`);state.ownership[k]=target;}
    else state.ownership[k]=nextOwner;
  }
}
export function mineWorldRock(state,hit){
  const next=structuredClone(state),before=deserialize(state.world),after=cloneRockSamples(before),cut=cutRockSamples(after,domain,hit);
  if(!cut.changed)return {status:'NO_HIT',state};
  const support=analyzeRockConnectivity(after,domain);
  if(support.status!=='OK')return {status:'HOLD',reason:support.reason,state};
  const islands=support.components.filter(c=>!c.anchored);
  if(islands.length>1)return {status:'HOLD',reason:'world cut produced more than one unsupported island',state};
  if(islands.length){
    const extraction=extractRockIsland(before,after,support);
    if(extraction.status!=='OK')return {...extraction,state};
    const id=`rock-${next.revision+1}`,actor=newActor(id,extraction.actor,null,islands[0]);actor.createdByTransaction=next.revision+1;
    next.actors.push(actor);next.world=serializeWorld(extraction.world);
    const componentByCell=new Map();for(const c of support.components)for(const p of c.cells)componentByCell.set(key(p),c.anchored?'world':id);
    updateFromMask(next,'world','world',after,componentByCell);
  }else{next.world=serializeWorld(after);updateFromMask(next,'world','world',after);}
  next.revision++;assertBudget(next);
  return {status:'OK',state:next,detached:islands.length,cut};
}
function componentMasks(sample,components){
  const owners=new Map();components.forEach((c,i)=>c.cells.forEach(p=>owners.set(key(p),i)));
  const outputs=components.map(()=>cloneRockSamples(sample)),[nx,ny,nz]=sample.size;
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const j=x+nx*(y+ny*z);if(sample.densities[j]>=0)continue;
    const touching=new Set();for(let dz=-1;dz<=0;dz++)for(let dy=-1;dy<=0;dy++)for(let dx=-1;dx<=0;dx++){
      const p=[x+dx,y+dy,z+dz];if(p.some((v,i)=>v<0||v>=sample.size[i]-1))continue;
      const owner=owners.get(key(p));if(owner!==undefined)touching.add(owner);
    }
    if(touching.size>1)return {status:'HOLD',reason:`shared scalar corner at ${x},${y},${z}`};
    outputs.forEach((out,i)=>{if(!touching.has(i)){out.densities[j]=Math.max(.5,-sample.densities[j]);out.materials[j]=0;}});
  }
  let surviving=0,error=0;eachCell(sample,p=>{const expected=owners.has(key(p))?parcelBits(sample,p):Array(8).fill(false),bits=outputs.map(o=>parcelBits(o,p));for(let i=0;i<8;i++){
    if(expected[i])surviving++;const count=bits.filter(b=>b[i]).length;if(expected[i]?count!==1:count!==0)error++;
  }});
  if(error/Math.max(1,surviving)>.05)return {status:'HOLD',reason:`actor split occupancy union error ${(100*error/surviving).toFixed(2)}%`};
  return {status:'OK',outputs,owners,errorRate:error/Math.max(1,surviving)};
}
export function mineActorRock(state,actorId,expectedRevision,localHit){
  const next=structuredClone(state),parent=next.actors.find(a=>a.id===actorId);
  if(!parent||parent.contentRevision!==expectedRevision)return {status:'STALE',state};
  const before=deserialize(parent),after=cloneRockSamples(before),cut=cutRockSamples(after,domain,localHit);
  if(!cut.changed)return {status:'NO_HIT',state};
  const support=analyzeRockConnectivity(after,domain,{anchor:()=>false});
  if(support.status!=='OK')return {status:'HOLD',reason:support.reason,state};
  const retained=support.components.filter(c=>c.occupiedProbes>=64);
  if(retained.length>4||next.actors.length-1+retained.length>4)return {status:'HOLD',reason:'four actor limit',state};
  if(!retained.length)return {status:'HOLD',reason:'no representable retained actor',state};
  if(retained.length===1){
    const masks=componentMasks(after,retained);if(masks.status!=='OK')return {...masks,state};
    const remaining=masks.outputs[0],oldCOM=parent.localCOM,newCOM=componentCOM(retained[0],remaining),
      oldWorld=actorToWorldPoint({position:parent.position,rotation:parent.rotation},oldCOM),
      newWorld=actorToWorldPoint({position:parent.position,rotation:parent.rotation},newCOM),
      r=newWorld.map((v,i)=>v-oldWorld[i]),w=parent.angularVelocity;
    parent.linearVelocity=[parent.linearVelocity[0]+w[1]*r[2]-w[2]*r[1],parent.linearVelocity[1]+w[2]*r[0]-w[0]*r[2],parent.linearVelocity[2]+w[0]*r[1]-w[1]*r[0]];
    parent.localCOM=newCOM;Object.assign(parent,serialize(remaining));parent.contentRevision++;parent.sleepState='ACTIVE';
    const kept=new Set(retained[0].cells.map(key));
    for(const [k,owner] of Object.entries(next.ownership))if(owner===actorId){
      const [cell,part]=k.split(':'),p=cell.split(',').map(Number);
      if(kept.has(cell)&&parcelBits(remaining,p)[Number(part)])continue;
      next.ownership[k]='consumed';next.rewards.stoneUnits++;
    }
    next.revision++;assertBudget(next);return {status:'OK',state:next,split:false,cut};
  }
  const masks=componentMasks(after,retained);if(masks.status!=='OK')return {...masks,state};
  const children=retained.map((c,i)=>{const id=`${parent.id}/r${next.revision+1}/${i}`,record=newActor(id,masks.outputs[i],parent,c);
    record.createdByTransaction=next.revision+1;return record;});
  const ids=children.map(c=>c.id),componentByCell=new Map();retained.forEach((c,i)=>c.cells.forEach(p=>componentByCell.set(key(p),ids[i])));
  for(const [k,owner] of Object.entries(next.ownership))if(owner===actorId){
    const [cell,part]=k.split(':'),p=cell.split(',').map(Number);
    const target=parcelBits(after,p)[Number(part)]?componentByCell.get(cell):null;
    if(target)next.ownership[k]=target;else{next.ownership[k]='consumed';next.rewards.stoneUnits++;}
  }
  next.actors=next.actors.filter(a=>a.id!==actorId).concat(children);next.retired.push(actorId);next.revision++;assertBudget(next);
  return {status:'OK',state:next,split:true,children:ids,cut};
}
export function actorRockSamples(actor){return deserialize(actor);}
