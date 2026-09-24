import { nearestRockSite, rockBondPlaneDistance, rockBondSites } from './fracture-field.js';
import { rockBondId } from './matter-structure.js';

const PROBES=[.25,.75];
const key=p=>p.join(',');
function trilinear(c,u,v,w){
  const a=(x,y,z)=>c[x+2*y+4*z];
  return (1-w)*((1-v)*(a(0,0,0)*(1-u)+a(1,0,0)*u)+v*(a(0,1,0)*(1-u)+a(1,1,0)*u))+
    w*((1-v)*(a(0,0,1)*(1-u)+a(1,0,1)*u)+v*(a(0,1,1)*(1-u)+a(1,1,1)*u));
}
function corners(samples,x,y,z){const c=[];for(let dz=0;dz<2;dz++)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)c.push(samples.readDensity([x+dx,y+dy,z+dz]));return c;}
function occupied(c){let n=0;for(const x of PROBES)for(const y of PROBES)for(const z of PROBES)n+=trilinear(c,x,y,z)<0;return n;}
function faceContact(c,axis){let n=0;for(const a of PROBES)for(const b of PROBES){const p=axis===0?[1,a,b]:axis===1?[a,1,b]:[a,b,1];n+=trilinear(c,...p)<0;}return n;}
const directions=[[1,0,0],[0,1,0],[0,0,1]];
export function analyzeRockConnectivity(samples,domain,{known=()=>true,anchor=([,y])=>y===0,brokenBonds=[]}={}){
  const cells=new Map(), limits=samples.size.map(v=>v-1),broken=new Set(brokenBonds);
  if(limits.some(v=>v>32))return {status:'HOLD',reason:'support window exceeds 32 lattice intervals'};
  for(let z=0;z<limits[2];z++)for(let y=0;y<limits[1];y++)for(let x=0;x<limits[0];x++){
    const p=[x,y,z],c=corners(samples,x,y,z),count=occupied(c);
    if(!count)continue;
    if(!known(p))return {status:'HOLD',reason:`nonresident occupied evidence at ${key(p)}`};
    const meter=p.map((v,i)=>samples.min[i]+(v+.5)*samples.spacing);
    cells.set(key(p),{p,c,count,id:nearestRockSite(domain,meter).id,neighbors:[]});
    if(cells.size>32768)return {status:'HOLD',reason:'support cell budget'};
  }
  let bonds=0;
  for(const cell of cells.values())for(let axis=0;axis<3;axis++){
    const next=cell.p.map((v,i)=>v+directions[axis][i]),neighbor=cells.get(key(next));
    if(!neighbor)continue;
    const contact=faceContact(cell.c,axis);
    if(contact===0)continue;
    if(cell.id!==neighbor.id&&broken.has(rockBondId(cell.id,neighbor.id)))continue;
    cell.neighbors.push(neighbor);neighbor.neighbors.push(cell);bonds++;
    if(bonds>12288)return {status:'HOLD',reason:'bond budget'};
  }
  const remaining=new Set(cells.values()),components=[];
  while(remaining.size){
    const first=remaining.values().next().value,stack=[first],component=[];remaining.delete(first);
    while(stack.length){const cell=stack.pop();component.push(cell);for(const n of cell.neighbors)if(remaining.delete(n))stack.push(n);}
    component.sort((a,b)=>key(a.p).localeCompare(key(b.p)));
    const members=new Set(component),fragmentSeen=new Set(),fragments=[];
    for(const start of component){if(fragmentSeen.has(start))continue;const branch=[start],part=[];fragmentSeen.add(start);
      while(branch.length){const cell=branch.pop();part.push(cell);for(const n of cell.neighbors)if(members.has(n)&&n.id===start.id&&!fragmentSeen.has(n)){fragmentSeen.add(n);branch.push(n);}}
      fragments.push({id:start.id,cells:part.map(c=>c.p)});
    }
    if(fragments.length>2048)return {status:'HOLD',reason:'fracture fragment budget'};
    components.push({anchored:component.some(c=>anchor(c.p)),cells:component.map(c=>c.p),fragments,occupiedProbes:component.reduce((s,c)=>s+c.count,0)});
  }
  components.sort((a,b)=>b.cells.length-a.cells.length||key(a.cells[0]).localeCompare(key(b.cells[0])));
  return {status:'OK',components,cellCount:cells.size,bonds};
}
// A failed structural bond defines the separation plane. The scalar field is
// retained; parcel cells are assigned to one side and each child rebuilds its
// own visible surface. This avoids deleting an entire plane of material just
// to make the gameplay split possible at the fixture's coarse sample scale.
export function partitionRockAtBondPlane(samples,domain,bondId,options={}){
  const pair=rockBondSites(bondId);if(!pair)return {status:'HOLD',reason:'invalid structural bond'};
  const base=analyzeRockConnectivity(samples,domain,options);if(base.status!=='OK')return base;
  const groups=new Map();
  for(const [componentIndex,component] of base.components.entries()){
    const fragmentByCell=new Map();for(const fragment of component.fragments)for(const p of fragment.cells)fragmentByCell.set(key(p),fragment.id);
    for(const p of component.cells){
      const point=p.map((v,i)=>samples.min[i]+(v+.5)*samples.spacing),side=rockBondPlaneDistance(domain,pair[0],pair[1],point)<0?0:1,
        id=`${componentIndex}:${side}`;let group=groups.get(id);
      if(!group)groups.set(id,group={anchored:false,cells:[],fragments:new Map(),occupiedProbes:0,side,sourceComponent:componentIndex});
      group.anchored||=!!component.anchored;group.cells.push(p);
      const fragmentId=fragmentByCell.get(key(p));if(!group.fragments.has(fragmentId))group.fragments.set(fragmentId,[]);group.fragments.get(fragmentId).push(p);
      group.occupiedProbes+=occupied(corners(samples,...p));
    }
  }
  const components=[...groups.values()].map(group=>({anchored:group.anchored,cells:group.cells,occupiedProbes:group.occupiedProbes,
    fragments:[...group.fragments].map(([id,cells])=>({id,cells})),side:group.side,sourceComponent:group.sourceComponent}));
  components.sort((a,b)=>b.occupiedProbes-a.occupiedProbes||a.sourceComponent-b.sourceComponent||a.side-b.side);
  return {status:'OK',components,cellCount:base.cellCount,bonds:base.bonds,planeBond:bondId};
}
