import { parcelBits, parcelMaterial, cloneRockSamples } from './matter-ownership.js';
import { ROCK_PROFILE } from './matter-rock-profile.js';
import { analyzeRockConnectivity } from './matter-connectivity.js';

const N=24,plane=N*N,capacity=N**3,axisSteps=[1,N,plane];
const address=(x,y,z)=>x+N*(y+N*z);
const coord=i=>[i%N,Math.floor(i/N)%N,Math.floor(i/plane)];
function occupiedGrid(sample){
  const occupied=new Uint8Array(capacity),materials=new Uint8Array(capacity);let count=0;
  for(let z=0;z<12;z++)for(let y=0;y<12;y++)for(let x=0;x<12;x++){
    const bits=parcelBits(sample,[x,y,z]);for(let part=0;part<8;part++)if(bits[part]){
      const i=address(2*x+(part&1),2*y+((part>>1)&1),2*z+((part>>2)&1));occupied[i]=1;materials[i]=parcelMaterial(sample,[x,y,z],part);count++;
    }
  }return {occupied,materials,count};
}
function neighbors(i,p){const out=[];for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
  if(p[axis]+sign>=0&&p[axis]+sign<N)out.push(i+sign*axisSteps[axis]);
}return out;}
function thickness(occupied,i,p){let min=25;for(let axis=0;axis<3;axis++){
  let span=1;for(const sign of [-1,1])for(let j=1;j<N;j++){
    const q=p[axis]+sign*j;if(q<0||q>=N||!occupied[i+sign*j*axisSteps[axis]])break;span++;
  }min=Math.min(min,span);
}return min;}
function distanceFromCore(occupied,width,minCore){const distance=new Uint8Array(capacity);distance.fill(255);const queue=new Int32Array(capacity);let head=0,tail=0;
  for(let i=0;i<capacity;i++)if(occupied[i]&&width[i]>=minCore){distance[i]=0;queue[tail++]=i;}
  while(head<tail){const i=queue[head++],p=coord(i);for(const j of neighbors(i,p))if(occupied[j]&&distance[j]===255){distance[j]=distance[i]+1;queue[tail++]=j;}}
  return {distance,coreCount:tail};
}
function localProbe(i,sample,hit,radius){const p=coord(i),meter=p.map((v,axis)=>sample.min[axis]+(v+.5)*.25);
  return Math.hypot(...meter.map((v,axis)=>v-hit[axis]))<=radius;
}
function groupsOfCandidates(candidate){const seen=new Uint8Array(capacity),groups=[];for(let i=0;i<capacity;i++)if(candidate[i]&&!seen[i]){
  const stack=[i],group=[];seen[i]=1;while(stack.length){const j=stack.pop();group.push(j);for(const k of neighbors(j,coord(j)))if(candidate[k]&&!seen[k]){seen[k]=1;stack.push(k);}}
  groups.push(group);
}return groups;}
function sampleAdjacentProbes(p){const result=[];for(let dz=-1;dz<=0;dz++)for(let dy=-1;dy<=0;dy++)for(let dx=-1;dx<=0;dx++){
  const x=2*p[0]+dx,y=2*p[1]+dy,z=2*p[2]+dz;if(x>=0&&y>=0&&z>=0&&x<N&&y<N&&z<N)result.push(address(x,y,z));
}return result;}
// Operates only on the hit's fracture-cell neighborhood. A distal thin branch
// can be removed; thick material and unrelated terrain have no write path.
function normalizeScalarTopology(sample,domain,hit,radius,material){let repaired=0;for(let pass=0;pass<4;pass++){
  const graph=analyzeRockConnectivity(sample,domain,{anchor:()=>false});if(graph.status!=='OK')return {status:'HOLD',reason:graph.reason};
  const owners=new Map();graph.components.forEach((component,id)=>component.cells.forEach(p=>owners.set(p.join(','),id)));
  const [nx,ny,nz]=sample.size;let changed=0;
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const index=x+nx*(y+ny*z);if(sample.densities[index]>=0)continue;const touching=new Set();
    for(let dz=-1;dz<=0;dz++)for(let dy=-1;dy<=0;dy++)for(let dx=-1;dx<=0;dx++){
      const p=[x+dx,y+dy,z+dz];if(p.some((v,i)=>v<0||v>=sample.size[i]-1))continue;
      const owner=owners.get(p.join(','));if(owner!==undefined)touching.add(owner);
    }
    const local=Math.hypot(...sample.position(index).map((v,i)=>v-hit[i]))<=radius+.75;
    if(touching.size>1&&!local)return {status:'HOLD',reason:'remote shared scalar corner'};
    if(touching.size>1&&sample.materials[index]!==material)return {status:'HOLD',reason:'mixed-material shared scalar corner'};
    if(sample.materials[index]===material&&local&&(touching.size>1||touching.size===0)){
      sample.densities[index]=Math.max(.25,-sample.densities[index]);sample.materials[index]=0;changed++;}
  }
  repaired+=changed;if(!changed)return {status:'OK',repaired};
}return {status:'HOLD',reason:'scalar topology normalization did not converge'};}
export function normalizeRockScalarTopology(source,hit,domain,profile=ROCK_PROFILE){
  const sample=cloneRockSamples(source),radius=profile.cellMeters*1.75;
  const result=normalizeScalarTopology(sample,domain,hit,radius,profile.material);
  if(result.status!=='OK')return result;
  const before=occupiedGrid(source),after=occupiedGrid(sample);let removedProbes=0;
  for(let i=0;i<capacity;i++)if(before.occupied[i]&&!after.occupied[i]){
    if(!localProbe(i,source,hit,radius+.75))return {status:'HOLD',reason:'topology normalization would remove remote matter'};
    removedProbes++;
  }
  if(removedProbes>profile.maxConditionedProbesPerEdit)return {status:'HOLD',reason:'topology normalization exceeds local quantity budget'};
  return {status:'OK',sample,repaired:result.repaired,removedProbes};
}
export function conditionRockSamples(source,hit,profile=ROCK_PROFILE,domain=null){
  const original=occupiedGrid(source),width=new Uint8Array(capacity),minimumCore=Math.ceil(profile.minThicknessMeters/.25)+1;
  for(let i=0;i<capacity;i++)if(original.occupied[i])width[i]=thickness(original.occupied,i,coord(i));
  const {distance,coreCount}=distanceFromCore(original.occupied,width,minimumCore);
  if(!coreCount)return {status:'HOLD',reason:'no representable thick rock core'};
  const candidate=new Uint8Array(capacity),radius=profile.cellMeters*1.75,cohesionSteps=Math.max(3,Math.ceil(profile.cohesion*3));
  for(let i=0;i<capacity;i++)if(original.occupied[i]&&original.materials[i]===profile.material&&width[i]*.25<=profile.minThicknessMeters&&distance[i]>=cohesionSteps&&
    localProbe(i,source,hit,radius))candidate[i]=1;
  const groups=groupsOfCandidates(candidate).filter(group=>group.length>=4&&group.some(i=>{
    const p=coord(i);return neighbors(i,p).some(j=>original.occupied[j]&&!candidate[j]);
  }));
  if(!groups.length)return {status:'OK',sample:source,changedSamples:0,removedProbes:0,thinGroups:0};
  const active=new Uint8Array(capacity);for(const group of groups)for(const i of group)active[i]=1;
  const draft=cloneRockSamples(source),[nx,ny,nz]=draft.size;let changedSamples=0;
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const j=x+nx*(y+ny*z);if(draft.densities[j]>=0||draft.materials[j]!==profile.material)continue;
    const adjacent=sampleAdjacentProbes([x,y,z]);if(!adjacent.some(i=>active[i]))continue;
    if(adjacent.some(i=>original.occupied[i]&&distance[i]<cohesionSteps))continue;
    draft.densities[j]=Math.max(.25,-draft.densities[j]);draft.materials[j]=0;changedSamples++;
  }
  if(domain&&changedSamples){const normalized=normalizeScalarTopology(draft,domain,hit,radius,profile.material);if(normalized.status!=='OK')return normalized;changedSamples+=normalized.repaired;}
  const updated=occupiedGrid(draft);let removedProbes=0;
  for(let i=0;i<capacity;i++)if(original.occupied[i]&&!updated.occupied[i]){
    if(!localProbe(i,source,hit,radius+.75))return {status:'HOLD',reason:'conditioning would remove remote matter'};
    removedProbes++;
  }
  if(removedProbes>profile.maxConditionedProbesPerEdit)return {status:'HOLD',reason:'conditioning exceeds local quantity budget'};
  return {status:'OK',sample:draft,changedSamples,removedProbes,thinGroups:groups.length};
}
