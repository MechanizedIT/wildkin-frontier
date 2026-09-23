import { cloneRockSamples } from './matter-ownership.js';
import { ROCK_PROFILE } from './matter-rock-profile.js';
import { analyzeRockConnectivity } from './matter-connectivity.js';
import { parcelBits } from './matter-ownership.js';

// This is a disposable visual/physics product. Its quantity was already moved
// into the authoritative consumed ledger before publication; it earns no loot.
export function removedRockField(before,survivors){
  const removed=cloneRockSamples(before);
  for(let i=0;i<removed.densities.length;i++){
    const surviving=Math.min(...survivors.map(s=>s.densities[i]));
    const density=Math.max(before.densities[i],-surviving);
    removed.densities[i]=density;removed.materials[i]=density<0?before.materials[i]:0;
  }
  return removed;
}
function fragmentField(source,cells){
  const field=cloneRockSamples(source),set=new Set(cells.map(p=>p.join(','))),[nx,ny,nz]=field.size;
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const i=x+nx*(y+ny*z);if(field.densities[i]>=0)continue;let belongs=false;
    for(let dz=-1;dz<=0;dz++)for(let dy=-1;dy<=0;dy++)for(let dx=-1;dx<=0;dx++)if(set.has(`${x+dx},${y+dy},${z+dz}`))belongs=true;
    if(!belongs){field.densities[i]=Math.max(.5,-field.densities[i]);field.materials[i]=0;}
  }
  return field;
}
export function partitionRockShatter(field,domain,profile=ROCK_PROFILE){
  const graph=analyzeRockConnectivity(field,domain,{anchor:()=>false});
  if(graph.status!=='OK')return {status:'HOLD',reason:graph.reason};
  const pieces=[];for(const component of graph.components)for(const fragment of component.fragments){
    const sample=fragmentField(field,fragment.cells);let probes=0;
    for(let z=0;z<12;z++)for(let y=0;y<12;y++)for(let x=0;x<12;x++)probes+=parcelBits(sample,[x,y,z]).filter(Boolean).length;
    if(probes)pieces.push({fragmentId:fragment.id,probes,sample});
  }
  pieces.sort((a,b)=>b.probes-a.probes||a.fragmentId.localeCompare(b.fragmentId));
  if(pieces.length>profile.maxPooledVisualDebris)return {status:'HOLD',reason:'shatter fragment budget'};
  const physical=pieces.filter(p=>p.probes>=profile.shardMinProbes&&p.probes<=profile.shardMaxProbes);
  if(physical.length>profile.maxTransientShardBodies)return {status:'HOLD',reason:'transient shard body budget'};
  return {status:'OK',pieces};
}
export function describeRockShatter(before,survivors,quantity,pose,localHit,profile=ROCK_PROFILE,domain=null){
  if(!Number.isSafeInteger(quantity)||quantity<0)throw new Error('Invalid consumed rock quantity');
  if(!quantity)return null;
  const field=removedRockField(before,survivors);
  const partition=domain?partitionRockShatter(field,domain,profile):null;
  if(partition?.status==='HOLD')return partition;
  const pieces=partition?.pieces?.length?partition.pieces:[{fragmentId:'unresolved',probes:0,sample:field}];
  return {status:'OK',quantity,material:profile.material,pieces:pieces.map((piece,index)=>({
    id:`${piece.fragmentId}:${index}`,probes:piece.probes,
    kind:piece.probes>=profile.shardMinProbes&&piece.probes<=profile.shardMaxProbes?'transient-physical':'pooled-visual',
    // The quantity was already credited to consumed/reward. These are display products only.
    creditedQuantity:index===0?quantity:0,material:profile.material,
    densities:Array.from(piece.sample.densities),materials:Array.from(piece.sample.materials),
    position:[...pose.position],rotation:{...pose.rotation},linearVelocity:[...pose.linearVelocity],
    angularVelocity:[...pose.angularVelocity],localHit:[...localHit]}))};
}
