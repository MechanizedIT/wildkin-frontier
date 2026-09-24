import { nearestRockSite } from './fracture-field.js';

const PROBES=[.25,.75],axes=[[1,0,0],[0,1,0],[0,0,1]],key=p=>p.join(',');
function corners(samples,x,y,z){const c=[];for(let dz=0;dz<2;dz++)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)c.push(samples.readDensity([x+dx,y+dy,z+dz]));return c;}
function interpolate(c,u,v,w){const a=(x,y,z)=>c[x+2*y+4*z];return (1-w)*((1-v)*(a(0,0,0)*(1-u)+a(1,0,0)*u)+v*(a(0,1,0)*(1-u)+a(1,1,0)*u))+w*((1-v)*(a(0,0,1)*(1-u)+a(1,0,1)*u)+v*(a(0,1,1)*(1-u)+a(1,1,1)*u));}
function occupied(c){let count=0;for(const z of PROBES)for(const y of PROBES)for(const x of PROBES)count+=interpolate(c,x,y,z)<0;return count;}
function faceContact(c,axis){let count=0;for(const a of PROBES)for(const b of PROBES){const p=axis===0?[1,a,b]:axis===1?[a,1,b]:[a,b,1];count+=interpolate(c,...p)<0;}return count;}
function hash(seed,text){let h=seed|0;for(let i=0;i<text.length;i++){h=Math.imul(h^text.charCodeAt(i),0x45d9f3b);h^=h>>>16;}return (h>>>0)/0x100000000;}
export function rockBondId(a,b){return `bond:${a<b?`${a}|${b}`:`${b}|${a}`}`;}
export function emptyRockStructure(){return {hitSequence:0,stress:{},broken:[]};}
export function buildRockBondGraph(samples,domain,profile,structure=emptyRockStructure()){
  const limits=samples.size.map(v=>v-1);if(limits.some(v=>v>32))return {status:'HOLD',reason:'structural window exceeds 32 lattice intervals'};
  const nodes=new Map(),byCell=new Map();let cellCount=0;
  for(let z=0;z<limits[2];z++)for(let y=0;y<limits[1];y++)for(let x=0;x<limits[0];x++){
    const c=corners(samples,x,y,z),quantity=occupied(c);if(!quantity)continue;
    const p=[x,y,z],center=p.map((v,i)=>samples.min[i]+(v+.5)*samples.spacing),id=nearestRockSite(domain,center).id;
    let node=nodes.get(id);if(!node){node={id,quantity:0,centroid:[0,0,0],cells:[],edges:new Set(),neighbors:new Set()};nodes.set(id,node);}
    node.quantity+=quantity;node.centroid=node.centroid.map((v,i)=>v+center[i]*quantity);node.cells.push(p);byCell.set(key(p),{id,c});
    if(++cellCount>32768)return {status:'HOLD',reason:'structural cell budget'};
  }
  for(const node of nodes.values())node.centroid=node.centroid.map(v=>v/Math.max(node.quantity,1));
  const edges=new Map();
  for(const [cellId,cell] of byCell){const p=cellId.split(',').map(Number);
    for(let axis=0;axis<3;axis++){const q=p.map((v,i)=>v+axes[axis][i]),other=byCell.get(key(q));if(!other)continue;
      const contact=faceContact(cell.c,axis);if(!contact||cell.id===other.id)continue;
      const id=rockBondId(cell.id,other.id);let edge=edges.get(id);
      if(!edge)edges.set(id,edge={id,a:cell.id,b:other.id,contacts:0,strength:0,weaknessBias:0,stress:structure.stress?.[id]??0,broken:structure.broken?.includes(id)??false});
      edge.contacts+=contact;
    }
  }
  for(const edge of edges.values()){nodes.get(edge.a).neighbors.add(edge.b);nodes.get(edge.b).neighbors.add(edge.a);}
  for(const edge of edges.values()){
    const a=nodes.get(edge.a),b=nodes.get(edge.b),contactFactor=profile.thinConnectionPenalty+(1-profile.thinConnectionPenalty)*Math.min(1,edge.contacts/profile.wideConnectionContacts);
    const unsupported=a.neighbors.size<=1||b.neighbors.size<=1||Math.min(a.quantity,b.quantity)<profile.persistentPieceMinProbes;
    const supportFactor=unsupported?profile.unsupportedPenalty:1,seeded=.78+hash(domain.seed,edge.id)*.44;
    edge.strength=profile.cohesion*seeded*contactFactor*supportFactor;edge.weaknessBias=1-edge.strength/(profile.cohesion*1.22);
    a.edges.add(edge.id);b.edges.add(edge.id);
  }
  if(edges.size>12288)return {status:'HOLD',reason:'structural bond budget'};
  return {status:'OK',nodes,edges,cellCount,bondCount:edges.size};
}
export function impactRockStructure(graph,structure,hit,domain,profile){
  const started=performance.now();
  if(graph.status!=='OK')return {status:'HOLD',reason:graph.reason,state:structure};
  const state=structuredClone(structure??emptyRockStructure()),hitSite=nearestRockSite(domain,hit).id;
  let start=graph.nodes.get(hitSite);
  if(!start){let nearest=Infinity;for(const node of graph.nodes.values()){const d=Math.hypot(...node.centroid.map((v,i)=>v-hit[i]));if(d<nearest){nearest=d;start=node;}}}
  if(!start)return {status:'NO_MATTER',state};
  state.hitSequence++;const distances=new Map([[start.id,0]]),queue=[start.id],visitedEdges=new Set(),newlyBroken=[],cracked=[];let propagated=0;
  while(queue.length&&propagated<profile.maxStressBonds){
    const id=queue.shift(),distance=distances.get(id);if(distance>=profile.stressRadius)continue;
    const node=graph.nodes.get(id);
    for(const bondId of node.edges){if(visitedEdges.has(bondId)||propagated>=profile.maxStressBonds)continue;visitedEdges.add(bondId);
      const edge=graph.edges.get(bondId);if(edge.broken)continue;propagated++;
      const before=state.stress[bondId]??0,after=before+profile.impactEnergy*Math.pow(profile.stressFalloff,distance);state.stress[bondId]=after;
      const ratio=after/Math.max(edge.strength,1e-6);
      if(ratio>=profile.breakThreshold&&!state.broken.includes(bondId)){state.broken.push(bondId);newlyBroken.push(bondId);}
      else if(ratio>=profile.crackThreshold)cracked.push({id:bondId,ratio});
      const next=edge.a===id?edge.b:edge.a;if(!distances.has(next)&&distances.size<profile.maxStressNodes){distances.set(next,distance+1);queue.push(next);}
    }
  }
  state.broken.sort();state.broken=[...new Set(state.broken)];
  return {status:'OK',state,hitSite:start.id,visitedNodes:distances.size,propagatedBonds:propagated,newlyBroken,cracked,graph,elapsedMs:performance.now()-started};
}
export function structureForSites(structure,siteIds){
  const allowed=new Set(siteIds),stress={},broken=[];
  for(const [id,value] of Object.entries(structure?.stress??{})){const [a,b]=id.slice(5).split('|');if(allowed.has(a)&&allowed.has(b))stress[id]=value;}
  for(const id of structure?.broken??[]){const [a,b]=id.slice(5).split('|');if(allowed.has(a)&&allowed.has(b))broken.push(id);}
  return {hitSequence:structure?.hitSequence??0,stress,broken};
}
