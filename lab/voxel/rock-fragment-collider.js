// The sole Phase 0.5A.3 fallback: actual connected fracture fragments from
// the authoritative connectivity graph, never a new spatial-sector scheme.
import { analyzeRockConnectivity } from './matter-connectivity.js';
import { rockDomain } from './fracture-field.js';
import { parcelBits } from './matter-ownership.js';
import { planRockShardHull } from './matter-colliders.js';

function clip(poly,axis,bound,sign) {
  const out=[];
  for(let i=0;i<poly.length;i++) {
    const a=poly[i],b=poly[(i+1)%poly.length],da=sign*(a[axis]-bound),db=sign*(b[axis]-bound);
    if(da>=-1e-8)out.push(a);
    if(da*db<0){const t=da/(da-db);out.push(a.map((v,j)=>v+(b[j]-v)*t));}
  }
  return out;
}
const hull=points=>planRockShardHull({positions:new Float32Array([...new Map(points.map(p=>[p.map(v=>v.toFixed(7)).join(','),p])).values()].flat())});

export function planFragmentColliders(fixture) {
  const {sample,mesh}=fixture,graph=analyzeRockConnectivity(sample,rockDomain(fixture.record.domain.seed),{anchor:()=>false});
  if(graph.status!=='OK')throw Error(graph.reason);
  const fragments=graph.components.flatMap(c=>c.fragments).map((fragment,index)=>{
    const points=[];
    for(const cell of fragment.cells){
      const low=cell.map((v,a)=>sample.min[a]+v*sample.spacing),high=low.map(v=>v+sample.spacing);
      // Surface points are clipped to this fragment's actual occupied cells.
      // Interior occupied probes close fragments that have no exterior face.
      const bits=parcelBits(sample,cell);
      for(let i=0;i<8;i++)if(bits[i])points.push(low.map((v,a)=>v+((i&(1<<a))?.75:.25)*sample.spacing));
      for(let i=0;i<mesh.indices.length;i+=3){
        let p=[0,1,2].map(j=>Array.from(mesh.positions.slice(mesh.indices[i+j]*3,mesh.indices[i+j]*3+3)));
        if([0,1,2].some(a=>p.every(v=>v[a]<low[a])||p.every(v=>v[a]>high[a])))continue;
        for(let a=0;a<3&&p.length;a++){p=clip(p,a,low[a],1);p=clip(p,a,high[a],-1);}points.push(...p);
      }
    }
    return {id:`${fragment.id}/connected-${index}`,cells:fragment.cells,points,hull:hull(points)};
  });
  if(fragments.some(f=>!f.hull))throw Error('Degenerate connected fracture fragment');
  return fragments;
}

export function adjacentFragmentPairs(fragments) {
  const owner=new Map(),pairs=new Set();fragments.forEach((f,i)=>f.cells.forEach(p=>owner.set(p.join(','),i)));
  fragments.forEach((f,i)=>f.cells.forEach(p=>{for(let a=0;a<3;a++)for(const d of [-1,1]){
    const n=[...p];n[a]+=d;const j=owner.get(n.join(','));if(j!==undefined&&j!==i)pairs.add([Math.min(i,j),Math.max(i,j)].join(','));
  }}));
  return [...pairs].map(p=>p.split(',').map(Number)).sort((a,b)=>
    fragments[a[0]].cells.length+fragments[a[1]].cells.length-fragments[b[0]].cells.length-fragments[b[1]].cells.length||a[0]-b[0]||a[1]-b[1]);
}
export function mergeFragmentPair(fragments,[a,b]) {
  const points=[...fragments[a].points,...fragments[b].points],merged={id:`${fragments[a].id}+${fragments[b].id}`,
    cells:[...fragments[a].cells,...fragments[b].cells],points,hull:hull(points)};
  return fragments.filter((_,i)=>i!==a&&i!==b).concat(merged);
}
