import fs from 'node:fs/promises';
import { createInitialRockState, mineWorldRock, mineActorRock, actorRockSamples } from '../lab/voxel/matter-actor.js';
import { cloneRockSamples, parcelBits } from '../lab/voxel/matter-ownership.js';
import { cutRockSamples, rockDomain } from '../lab/voxel/fracture-field.js';
import { analyzeRockConnectivity } from '../lab/voxel/matter-connectivity.js';
import { meshRockSamples } from '../lab/voxel/matter-mesh.js';
import { conditionRockSamples } from '../lab/voxel/matter-conditioning.js';
import { ROCK_PROFILE } from '../lab/voxel/matter-rock-profile.js';

const scale=Number(process.env.VOXEL_ROCK_CELL_METERS??1.5),edgeBandMeters=Number(process.env.VOXEL_ROCK_BAND??.04),conditioning=process.env.VOXEL_ROCK_CONDITION==='1',minThicknessMeters=Number(process.env.VOXEL_ROCK_MIN_THICKNESS??ROCK_PROFILE.minThicknessMeters),rockProfile={...ROCK_PROFILE,minThicknessMeters},domain=rockDomain(9212026,scale),options={fractureDomain:domain,edgeBandMeters,conditioning,rockProfile},splitHits=[[0,4,0],[0,4,-.5],[0,3,0],[0,5,0],[0,4.5,-.5],[0,5.5,0],
  [0,4,-1.5],[0,3,1],[0,4.5,-1.5],[0,5.5,1],[0,2.5,1],[0,3.5,1.5]];
function probes(sample){const occupied=new Set();for(let z=0;z<12;z++)for(let y=0;y<12;y++)for(let x=0;x<12;x++){
  const bits=parcelBits(sample,[x,y,z]);for(let i=0;i<8;i++)if(bits[i])occupied.add(`${x*2+(i&1)},${y*2+((i>>1)&1)},${z*2+((i>>2)&1)}`);
}return occupied;}
function stats(sample){const p=probes(sample),grid=new Set(p),thin=[];for(const address of p){const q=address.split(',').map(Number),spans=[];
  for(let axis=0;axis<3;axis++){let n=1;for(const sign of [-1,1])for(let j=1;j<24;j++){const r=[...q];r[axis]+=sign*j;if(!grid.has(r.join(',')))break;n++;}spans.push(n*.25);}
  if(Math.min(...spans)<.75)thin.push(q);
}const mesh=meshRockSamples(sample),conn=analyzeRockConnectivity(sample,domain,{anchor:()=>false});
  const fragments=conn.components?.flatMap(c=>c.fragments.map(f=>{const bounds=Array.from({length:3},(_,i)=>[Math.min(...f.cells.map(v=>v[i])),Math.max(...f.cells.map(v=>v[i]))]);
    const length=bounds.map(v=>v[1]-v[0]+1),volume=f.cells.reduce((n,cell)=>n+parcelBits(sample,cell).filter(Boolean).length,0);
    return {id:f.id,cells:f.cells.length,probes:volume,bounds,length,aspect:Math.max(...length)/Math.min(...length)};})).sort((a,b)=>b.aspect-a.aspect||b.probes-a.probes);
  return {occupiedProbes:p.size,thinProbeCount:thin.length,thinBounds:thin.length?Array.from({length:3},(_,i)=>[Math.min(...thin.map(v=>v[i])),Math.max(...thin.map(v=>v[i]))]):null,
    triangleCount:mesh.indices.length/3,components:conn.components?.map(c=>({cells:c.cells.length,probes:c.occupiedProbes,fragments:c.fragments.length})),fragments:fragments?.slice(0,12)};}
function triangles(sample){const mesh=meshRockSamples(sample),out=[];for(let i=0;i<mesh.indices.length;i+=3){const vertices=[];for(let j=0;j<3;j++){
  const k=mesh.indices[i+j]*3;vertices.push([mesh.positions[k],mesh.positions[k+1],mesh.positions[k+2]].map(v=>v.toFixed(5)).join(','));
}out.push(vertices.sort().join('|'));}return out.sort();}
let state=createInitialRockState();for(const hit of [[0,4,-1.55],[.5,1.5,0],[-.5,1.5,0]]){const r=mineWorldRock(state,hit,options);if(r.status!=='OK')throw Error(`${hit}: ${r.status} ${r.reason}`);state=r.state;}
let result,step=0,preSplit=null,rawSplit=null,children=null,previous=null;
const sequence=[];state=mineActorRock(state,state.actors[0].id,state.actors[0].contentRevision,[1.55,4,0],options).state;
for(const hit of splitHits){previous=actorRockSamples(state.actors[0]);let raw=cloneRockSamples(previous);const cut=cutRockSamples(raw,domain,hit,{edgeBandMeters});
  if(conditioning&&cut.changed){const conditioned=conditionRockSamples(raw,hit,{...rockProfile,cellMeters:scale},domain);if(conditioned.status!=='OK')throw Error(`condition: ${conditioned.reason}`);raw=conditioned.sample;cut.conditioned=conditioned.removedProbes;}
  result=mineActorRock(state,state.actors[0].id,state.actors[0].contentRevision,hit,options);if(!['OK','NO_HIT'].includes(result.status))throw Error(`${step}: ${result.status} ${result.reason}; components ${JSON.stringify(analyzeRockConnectivity(raw,domain,{anchor:()=>false}).components?.map(c=>({probes:c.occupiedProbes,bounds:c.bounds})))}`);
  const rawStats=stats(raw),previousStats=stats(previous);
  sequence.push({step,hit,changedSamples:cut.changed,conditionedProbes:cut.conditioned??0,
    previousProbes:previousStats.occupiedProbes,rawProbes:rawStats.occupiedProbes,
    previousThin:previousStats.thinProbeCount,rawThin:rawStats.thinProbeCount,
    rawTriangles:rawStats.triangleCount,split:!!result.split});
  if(result.split){preSplit=previous;rawSplit=raw;children=result.state.actors.map(actorRockSamples);state=result.state;break;}
  state=result.state;step++;
}
if(!children)throw Error('Baseline did not split');
const rawSet=probes(rawSplit),childSets=children.map(probes),union=new Set(childSets.flatMap(s=>[...s])),overlap=[...childSets[0]].filter(k=>childSets[1].has(k));
const rawTriangles=triangles(rawSplit),childTriangles=children.flatMap(triangles).sort();
const rawGraph=analyzeRockConnectivity(rawSplit,domain,{anchor:()=>false}),trials=[];
for(const component of rawGraph.components)for(const fragment of component.fragments){
  const bounds=Array.from({length:3},(_,i)=>[Math.min(...fragment.cells.map(v=>v[i])),Math.max(...fragment.cells.map(v=>v[i]))]),length=bounds.map(v=>v[1]-v[0]+1),
    volume=fragment.cells.reduce((n,p)=>n+parcelBits(rawSplit,p).filter(Boolean).length,0);
  if(Math.max(...length)/Math.min(...length)<2.5||volume>32)continue;
  const hit=fragment.cells[Math.floor(fragment.cells.length/2)].map((v,i)=>rawSplit.min[i]+(v+.5)*.5),copy=cloneRockSamples(rawSplit),cut=cutRockSamples(copy,domain,hit),loss=rawSet.size-probes(copy).size;
  trials.push({id:fragment.id,hit,bounds,length,volume,changed:cut.changed,loss,components:analyzeRockConnectivity(copy,domain,{anchor:()=>false}).components.length});
}
const receipt={seed:9212026,cellMeters:domain.cellMeters,edgeBandMeters,minThicknessMeters,conditioning,splitStep:step,sequence,
  final:{preSplit:stats(preSplit),rawAfterCut:stats(rawSplit),children:children.map(stats),
    unionMissing:[...rawSet].filter(k=>!union.has(k)).length,unionExtra:[...union].filter(k=>!rawSet.has(k)).length,overlap:overlap.length,
    triangleSetsEqual:JSON.stringify(rawTriangles)===JSON.stringify(childTriangles),thinFragmentTrials:trials}};
const path=`docs/evidence/voxel-phase05a1/diagnosis-scale-${scale}-band-${edgeBandMeters}-condition-${conditioning?minThicknessMeters:'off'}.json`;await fs.mkdir('docs/evidence/voxel-phase05a1',{recursive:true});
await fs.writeFile(path,JSON.stringify(receipt,null,2));console.log(JSON.stringify({path,splitStep:step,rawProbes:receipt.final.rawAfterCut.occupiedProbes,
  rawThin:receipt.final.rawAfterCut.thinProbeCount,children:receipt.final.children.map(c=>c.occupiedProbes),triangleSetsEqual:receipt.final.triangleSetsEqual,
  unionMissing:receipt.final.unionMissing,unionExtra:receipt.final.unionExtra,overlap:receipt.final.overlap}));
