import { rockBondPlaneDistance, rockBondSites } from './fracture-field.js';
import { cloneRockSamples } from './matter-ownership.js';
import { partitionRockAtBondPlane } from './matter-connectivity.js';
import { buildRockBondGraph } from './matter-structure.js';

// Local material removal for the bounded hard-rock proof. Structural stress
// lives in matter-structure.js and is intentionally separate from this chip.
function hash(seed,x,y,z,sequence){
  let h=(seed^Math.imul(x,0x9e3779b1)^Math.imul(y,0x85ebca6b)^Math.imul(z,0xc2b2ae35)^Math.imul(sequence,0x27d4eb2d))|0;
  h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);return (h^(h>>>16))>>>0;
}
function unit(value){return value/0x100000000;}
export function chipHardRock(samples,domain,hit,sequence,profile){
  const started=performance.now();
  if(!Array.isArray(hit)||hit.length!==3||!hit.every(Number.isFinite)||!Number.isSafeInteger(sequence)||sequence<1)throw new Error('Invalid hard-rock impact');
  const spacing=samples.spacing,maxRadius=profile.localChipRadius+profile.localChipVariation,radius=maxRadius+spacing;
  const low=hit.map((v,i)=>Math.max(0,Math.floor((v-radius-samples.min[i])/spacing)));
  const high=hit.map((v,i)=>Math.min(samples.size[i]-1,Math.ceil((v+radius-samples.min[i])/spacing)));
  let changed=0,removedSamples=0;
  for(let z=low[2];z<=high[2];z++)for(let y=low[1];y<=high[1];y++)for(let x=low[0];x<=high[0];x++){
    const i=x+samples.size[0]*(y+samples.size[1]*z),point=samples.position(i),dx=point[0]-hit[0],dy=point[1]-hit[1],dz=point[2]-hit[2],distance=Math.hypot(dx,dy,dz);
    if(distance>maxRadius||samples.densities[i]>=0)continue;
    const cell=point.map(v=>Math.floor(v/.25)),noise=(unit(hash(domain.seed,cell[0],cell[1],cell[2],sequence))-.5)*2;
    const ripple=.55*Math.sin(dx*3.7+sequence*.31)*Math.cos(dy*3.1-domain.seed*.00001)*Math.sin(dz*3.3+sequence*.17);
    const localRadius=profile.localChipRadius+profile.localChipVariation*(ripple+noise*.25),next=Math.max(samples.densities[i],localRadius-distance);
    if(next<=samples.densities[i]+1e-6)continue;
    if(samples.densities[i]<0&&next>=0)removedSamples++;
    samples.densities[i]=next;samples.materials[i]=next<0?profile.material:0;changed++;
  }
  return {changed,removedSamples,sequence,radius:maxRadius,elapsedMs:performance.now()-started};
}
export function selectRockFracture(samples,domain,structure,hit,center,profile,{anchor=()=>false,accept=null}={}){
  const started=performance.now(),graph=buildRockBondGraph(samples,domain,profile,structure);if(graph.status!=='OK')return {...graph,elapsedMs:performance.now()-started};
  if((structure?.broken?.length??0)<profile.minimumBrokenBondsForFracture)return {status:'PENDING',graph,elapsedMs:performance.now()-started};
  const candidates=[...graph.edges.values()].filter(edge=>edge.broken).map(edge=>{
    const [a,b]=rockBondSites(edge.id),offset=Math.abs(rockBondPlaneDistance(domain,a,b,center)),ratio=edge.stress/Math.max(edge.strength,1e-6);
    return {edge,offset,ratio};
  }).sort((a,b)=>a.offset-b.offset||b.ratio-a.ratio||a.edge.id.localeCompare(b.edge.id)).slice(0,profile.maxFractureCandidates);
  for(const candidate of candidates){
    const trial=cloneRockSamples(samples),seam={changed:0,removedSamples:0};
    const support=partitionRockAtBondPlane(trial,domain,candidate.edge.id,{anchor,brokenBonds:[]});if(support.status!=='OK')continue;
    const large=support.components.filter(component=>component.occupiedProbes>=profile.persistentPieceMinProbes);
    if(large.length<2)continue;
    const separation=accept?.(trial,support)??null;if(separation?.status==='HOLD')continue;
    return {status:'FRACTURE',sample:trial,support,separation,bondId:candidate.edge.id,seam,elapsedMs:performance.now()-started,
      crackedComponents:support.components.length,largePieces:large.map(component=>component.occupiedProbes)};
  }
  return {status:'PENDING',graph,elapsedMs:performance.now()-started};
}
