import { analyzeMatterConnectivity } from './matter-connectivity.js';
import { parcelBits, removeMatterComponents } from './matter-ownership.js';

function hash(seed,x,y,z,sequence){
  let h=(seed^Math.imul(x,0x9e3779b1)^Math.imul(y,0x85ebca6b)^Math.imul(z,0xc2b2ae35)^Math.imul(sequence,0x27d4eb2d))|0;
  h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);return (h^(h>>>16))>>>0;
}
const unit=value=>value/0x100000000,key=p=>p.join(',');

export function excavateDirt(samples,domain,hit,sequence,profile){
  const started=performance.now();
  if(!Array.isArray(hit)||hit.length!==3||!hit.every(Number.isFinite)||!Number.isSafeInteger(sequence)||sequence<1)throw new Error('Invalid dirt excavation');
  const spacing=samples.spacing,shape=profile.excavationShape,maxRadius=profile.excavationRadius+profile.excavationVariation,
    extents=shape.map(v=>v*maxRadius),low=hit.map((v,i)=>Math.max(0,Math.floor((v-extents[i]-samples.min[i])/spacing))),
    high=hit.map((v,i)=>Math.min(samples.size[i]-1,Math.ceil((v+extents[i]-samples.min[i])/spacing)));
  let changed=0,removedSamples=0;
  for(let z=low[2];z<=high[2];z++)for(let y=low[1];y<=high[1];y++)for(let x=low[0];x<=high[0];x++){
    const i=x+samples.size[0]*(y+samples.size[1]*z),point=samples.position(i),delta=point.map((v,j)=>v-hit[j]),
      normalized=delta.map((v,j)=>v/shape[j]),distance=Math.hypot(...normalized);
    if(distance>maxRadius||samples.densities[i]>=0)continue;
    const cell=point.map(v=>Math.floor(v/.25)),noise=(unit(hash(domain.seed,cell[0],cell[1],cell[2],sequence))-.5)*2,
      ripple=.22*Math.sin(delta[0]*2.1+sequence*.17)*Math.cos(delta[1]*1.7-delta[2]*.4),
      localRadius=profile.excavationRadius+profile.excavationVariation*(ripple+noise*.2),
      next=Math.max(samples.densities[i],(localRadius-distance)*profile.softness);
    if(next<=samples.densities[i]+1e-6)continue;
    if(samples.densities[i]<0&&next>=0)removedSamples++;
    samples.densities[i]=next;samples.materials[i]=next<0?profile.material:0;changed++;
  }
  return {changed,removedSamples,sequence,radius:maxRadius,elapsedMs:performance.now()-started};
}

function localSupportWindow(samples,profile,anchor){
  const cellCount=samples.size.map(v=>v-1),low=[0,0,0],high=cellCount.map(v=>v-1),workCells=cellCount.reduce((a,b)=>a*b,1);
  if(cellCount.some(v=>v>profile.supportWindowIntervals)||workCells>profile.maxLocalCrumbleWork)
    return {status:'HOLD',reason:'dirt local support work budget',workCells};
  const started=performance.now(),result=analyzeMatterConnectivity(samples,{anchor}),connectivityMs=performance.now()-started;
  if(result.status!=='OK')return {...result,workCells,connectivityMs};
  return {...result,workCells,connectivityMs,window:{low,high}};
}

function totalParcelLoss(before,after){
  let count=0;for(let z=0;z<before.size[2]-1;z++)for(let y=0;y<before.size[1]-1;y++)for(let x=0;x<before.size[0]-1;x++){
    const p=[x,y,z],a=parcelBits(before,p),b=parcelBits(after,p);for(let i=0;i<8;i++)if(a[i]&&!b[i])count++;
  }return count;
}
function crumbleWeakSamples(samples,weak,profile){
  const out={...samples,densities:new Float32Array(samples.densities),materials:new Uint8Array(samples.materials)},candidates=new Map(),[nx,ny,nz]=samples.size;
  out.readDensity=([x,y,z])=>x<0||y<0||z<0||x>=nx||y>=ny||z>=nz?1:out.densities[x+nx*(y+ny*z)];
  for(const cell of weak)for(let dz=0;dz<=1;dz++)for(let dy=0;dy<=1;dy++)for(let dx=0;dx<=1;dx++){
    const x=cell.p[0]+dx,y=cell.p[1]+dy,z=cell.p[2]+dz,i=x+nx*(y+ny*z),old=candidates.get(i);
    if(out.densities[i]>=0)continue;
    const score=cell.lossRatio/(1+cell.distance*.1);if(!old||score>old.score)candidates.set(i,{score,x,y,z});
  }
  const selected=[...candidates.values()].sort((a,b)=>b.score-a.score||a.z-b.z||a.y-b.y||a.x-b.x).slice(0,profile.maxCrumbleSamplesPerEdit);
  for(const {x,y,z} of selected){const i=x+nx*(y+ny*z);out.densities[i]=Math.max(.12,-out.densities[i]+.12);out.materials[i]=0;}
  return {sample:out,clearedSamples:selected.length};
}

function localWeakCells(before,after,support,hit,profile){
  if(!before)return [];
  const window=support.window,[nx,ny]=after.size,spacing=after.spacing,directions=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],
    beforeCounts=new Map(),afterCounts=new Map(),cells=[];
  for(let z=window.low[2];z<=window.high[2];z++)for(let y=window.low[1];y<=window.high[1];y++)for(let x=window.low[0];x<=window.high[0];x++){
    const p=[x,y,z],q=parcelBits(after,p).filter(Boolean).length,old=parcelBits(before,p).filter(Boolean).length;
    beforeCounts.set(key(p),old);afterCounts.set(key(p),q);if(!q)continue;
    cells.push({p,q,position:p.map((v,i)=>after.min[i]+(v+.5)*spacing)});
  }
  const neighborCount=(p,counts)=>directions.reduce((n,d)=>n+((counts.get(key(p.map((v,i)=>v+d[i])))??0)>0?1:0),0),
    weak=[];
  for(const cell of cells){
    if(Math.hypot(...cell.position.map((v,i)=>v-hit[i]))>profile.cohesionRadiusMeters)continue;
    const oldCount=neighborCount(cell.p,beforeCounts),newCount=neighborCount(cell.p,afterCounts),lost=oldCount-newCount;
    const lossRatio=oldCount?lost/oldCount:0;
    if(oldCount>0&&lost>0&&lossRatio*profile.unsupportedPenalty>=profile.crumbleSupportLossThreshold)
      weak.push({...cell,lossRatio,distance:Math.hypot(...cell.position.map((v,i)=>v-hit[i]))});
  }
  return weak.sort((a,b)=>b.lossRatio-a.lossRatio||a.distance-b.distance||key(a.p).localeCompare(key(b.p)));
}

export function resolveDirtSupport(samples,hit,profile,{anchor=()=>false,previous=null}={}){
  const started=performance.now(),support=localSupportWindow(samples,profile,anchor);
  if(support.status!=='OK')return {...support,elapsedMs:performance.now()-started};
  const crumble=support.components.filter(component=>!component.anchored&&classifyDirtFragment(component.occupiedProbes,profile)==='crumbled-soil');
  let current=samples,crumbledProbeUnits=0,clearedSamples=0,workCells=support.workCells,connectivityMs=support.connectivityMs,crumbleComponents=[];
  if(crumble.length){
    const result=removeMatterComponents(current,crumble,support.components);current=result.sample;clearedSamples+=result.clearedSamples;workCells+=result.workCells;
    const converted=totalParcelLoss(samples,current);workCells+=samples.size.slice(0,3).reduce((a,b)=>a*(b-1),1);
    crumbledProbeUnits+=converted;if(converted)crumbleComponents.push(converted);
  }
  let latest=crumble.length?localSupportWindow(current,profile,anchor):support;
  if(latest.status!=='OK')return {...latest,elapsedMs:performance.now()-started};
  connectivityMs+=crumble.length?latest.connectivityMs:0;
  workCells+=crumble.length?latest.workCells:0;
  const weak=localWeakCells(previous,current,latest,hit,profile);
  workCells+=latest.workCells;
  if(weak.length){
    let selectedUnits=0;const selected=[];for(const cell of weak){if(selectedUnits+cell.q>profile.maxCrumbledProbeUnitsPerEdit)continue;selected.push(cell);selectedUnits+=cell.q;}
    const weakUnits=selectedUnits;
    if(weakUnits<=profile.maxCrumbledProbeUnitsPerEdit){
      const result=crumbleWeakSamples(current,selected,profile),converted=totalParcelLoss(current,result.sample);
      workCells+=result.clearedSamples+current.size.slice(0,3).reduce((a,b)=>a*(b-1),1);
      crumbledProbeUnits+=converted;current=result.sample;clearedSamples+=result.clearedSamples;if(converted)crumbleComponents.push(converted);
      latest=localSupportWindow(current,profile,anchor);
      if(latest.status!=='OK')return {...latest,elapsedMs:performance.now()-started};workCells+=latest.workCells;
      connectivityMs+=latest.connectivityMs;
    }
  }
  if(workCells>profile.maxLocalCrumbleWork)return {status:'HOLD',reason:'dirt local crumble budget',workCells,elapsedMs:performance.now()-started};
  return {status:'OK',sample:current,support:latest,crumbledProbeUnits,crumbleComponents,clearedSamples,workCells,
    cohesionCandidates:weak.length,connectivityMs,elapsedMs:performance.now()-started};
}

export function classifyDirtFragment(probes,profile){
  if(!Number.isSafeInteger(probes)||probes<0)throw new Error('Invalid dirt fragment quantity');
  if(probes>=profile.persistentClodMinProbes)return 'persistent-clod';
  return 'crumbled-soil';
}
