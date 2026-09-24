// Opt-in Phase 0.5A.2 study. These candidates are not runtime admission.
// Occupancy candidates derive partitions from occupied parcel probes and hull
// vertices from clipped visible triangles, without a center-of-mass vertex.
// The explicit eight-sector reconstruction controls retain that old defect.
import { parcelBits } from './matter-ownership.js';
import { planRockShardHull } from './matter-colliders.js';
import { createInitialRockState, mineWorldRock, mineActorRock, actorRockSamples } from './matter-actor.js';
import { meshRockSamples } from './matter-mesh.js';

export function collisionStudyFixtures(){
  const fixtures=[];
  function capture(name,actor){const sample=actorRockSamples(actor);fixtures.push({name,record:structuredClone(actor),sample,mesh:meshRockSamples(sample)});}
  let state=createInitialRockState();
  for(const hit of [[.5,1.5,0],[-.5,1.5,0]])state=mineWorldRock(state,hit).state;
  capture('initial-detached',state.actors[0]);
  state=createInitialRockState();
  for(const hit of [[0,4,-1.55],[.5,1.5,0],[-.5,1.5,0]])state=mineWorldRock(state,hit).state;
  capture('bitten-detached',state.actors[0]);
  const hitActor=hit=>{const a=state.actors[0],r=mineActorRock(state,a.id,a.contentRevision,hit);
    if(!['OK','NO_HIT'].includes(r.status))throw Error(`Fixture ${hit}: ${r.status} ${r.reason}`);state=r.state;return r;};
  hitActor([1.55,4,0]);capture('secondary-notch',state.actors[0]);
  const hits=[[0,4,0],[0,4,-.5],[0,3,0],[0,5,0],[0,4.5,-.5],[0,5.5,0],[0,4,-1.5],[0,3,1]];
  for(const [i,hit] of hits.entries()){
    const result=hitActor(hit);
    if(result.split){state.actors.forEach((a,j)=>capture(`conditioned-child-${j}`,a));break;}
    capture(`central-cut-${i+1}`,state.actors[0]);
  }
  if(state.actors.length!==2)throw Error('Expected conditioned split');
  return fixtures;
}

export function occupiedRockPoints(sample){
  const points=[];
  for(let z=0;z<sample.size[2]-1;z++)for(let y=0;y<sample.size[1]-1;y++)for(let x=0;x<sample.size[0]-1;x++){
    const bits=parcelBits(sample,[x,y,z]);
    for(let i=0;i<8;i++)if(bits[i])points.push([x+(i&1? .75:.25),y+(i&2? .75:.25),z+(i&4? .75:.25)].map((v,a)=>sample.min[a]+v*sample.spacing));
  }
  return points;
}
const distance=(a,b)=>a.reduce((n,v,i)=>n+(v-b[i])**2,0);
const mean=points=>[0,1,2].map(a=>points.reduce((n,p)=>n+p[a],0)/points.length);
function clip(points,axis,value,sign){
  const out=[];
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],da=sign*(a[axis]-value),db=sign*(b[axis]-value);
    if(da>=-1e-8)out.push(a);
    if((da<0&&db>0)||(da>0&&db<0)){const t=da/(da-db);out.push(a.map((v,j)=>v+(b[j]-v)*t));}
  }
  return out;
}
function boundedHull(points){
  const unique=[...new Map(points.map(p=>[p.map(v=>v.toFixed(6)).join(','),p])).values()];
  return planRockShardHull({positions:new Float32Array(unique.flat())});
}
function clippedHull(mesh,planes){
  const points=[];
  for(let i=0;i<mesh.indices.length;i+=3){
    let triangle=[0,1,2].map(j=>Array.from(mesh.positions.slice(mesh.indices[i+j]*3,mesh.indices[i+j]*3+3)));
    for(const p of planes){triangle=clip(triangle,...p);if(!triangle.length)break;}
    points.push(...triangle);
  }
  return boundedHull(points);
}

export function planOccupancyColliders(mesh,sample,method='occupancy-median'){
  const occupied=occupiedRockPoints(sample);
  if(!occupied.length)throw Error('Empty occupied region');
  if(method==='occupancy-voronoi'){
    const centers=[occupied[0]];
    while(centers.length<8){let best=occupied[0],score=-1;
      for(const p of occupied){const d=Math.min(...centers.map(c=>distance(p,c)));if(d>score){score=d;best=p;}}
      centers.push(best);
    }
    for(let step=0;step<6;step++){
      const groups=centers.map(()=>[]);
      for(const p of occupied){let best=0;for(let i=1;i<centers.length;i++)if(distance(p,centers[i])<distance(p,centers[best]))best=i;groups[best].push(p);}
      groups.forEach((g,i)=>{if(g.length)centers[i]=mean(g);});
    }
    // Clip triangles against occupied-seed bisectors (no added interior point).
    return centers.map((center,i)=>{
      const points=[];
      for(let t=0;t<mesh.indices.length;t+=3){
        let polygon=[0,1,2].map(j=>Array.from(mesh.positions.slice(mesh.indices[t+j]*3,mesh.indices[t+j]*3+3)));
        for(let j=0;j<centers.length&&polygon.length;j++)if(j!==i){
          const other=centers[j],normal=other.map((v,a)=>v-center[a]),mid=other.map((v,a)=>(v+center[a])/2),out=[];
          for(let k=0;k<polygon.length;k++){
            const a=polygon[k],b=polygon[(k+1)%polygon.length],da=a.reduce((n,v,q)=>n+(v-mid[q])*normal[q],0),db=b.reduce((n,v,q)=>n+(v-mid[q])*normal[q],0);
            if(da<=1e-8)out.push(a);
            if((da<0&&db>0)||(da>0&&db<0)){const f=da/(da-db);out.push(a.map((v,q)=>v+(b[q]-v)*f));}
          }polygon=out;
        }points.push(...polygon);
      }return boundedHull(points);
    }).filter(Boolean);
  }
  if(!['occupancy-median','occupancy-gap'].includes(method))throw Error('Unknown collider study method');
  const leaves=[{points:occupied,planes:[]}];
  while(leaves.length<8){
    let best=null;
    for(const [index,leaf] of leaves.entries())for(let axis=0;axis<3;axis++){
      const coords=[...new Set(leaf.points.map(p=>p[axis]))].sort((a,b)=>a-b);
      if(coords.length<2)continue;
      // Median is volume-balanced; gap strategy favors low-area necks, with
      // a balance floor to prevent spending all hulls on tiny tips.
      for(let j=0;j<coords.length-1;j++){
        const cut=(coords[j]+coords[j+1])/2,left=leaf.points.filter(p=>p[axis]<cut),right=leaf.points.filter(p=>p[axis]>=cut),balance=Math.min(left.length,right.length)/leaf.points.length;
        if(balance<.2)continue;
        const width=coords.at(-1)-coords[0];
        const near=leaf.points.filter(p=>Math.abs(p[axis]-cut)<=.126).length;
        const score=method==='occupancy-gap'?width*balance*leaf.points.length/Math.max(1,near):width*balance;
        if(!best||score>best.score)best={index,axis,cut,left,right,score};
      }
    }
    if(!best)break;
    const {index,axis,cut,left,right}=best,leaf=leaves[index];
    leaves.splice(index,1,{points:left,planes:[...leaf.planes,[axis,cut,-1]]},{points:right,planes:[...leaf.planes,[axis,cut,1]]});
  }
  return leaves.map(l=>clippedHull(mesh,l.planes)).filter(Boolean);
}

export function planEightSectorControl(mesh,localCOM,overlap=.35){
  return Array.from({length:8},(_,sector)=>{
    const points=[localCOM];
    for(let i=0;i<mesh.positions.length;i+=3){const p=Array.from(mesh.positions.slice(i,i+3));
      if(p.every((v,a)=>(sector&(1<<a))?v>=localCOM[a]-overlap:v<=localCOM[a]+overlap))points.push(p);
    }
    return boundedHull(points);
  }).filter(Boolean);
}
