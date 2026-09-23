// Eight fixed interior probes per lattice cell are conserved quantity units.
// Scalar corners are geometry context and never independently award resources.
const offsets=[.25,.75];
const cellKey=p=>p.join(',');
export function cloneRockSamples(source){
  const densities=new Float32Array(source.densities),materials=new Uint8Array(source.materials),size=[...source.size];
  return {...source,size,densities,materials,
    readDensity([x,y,z]){if(x<0||y<0||z<0||x>=size[0]||y>=size[1]||z>=size[2])return 1;
      return densities[x+size[0]*(y+size[1]*z)];}};
}
function corners(samples,[x,y,z]){const a=[];for(let dz=0;dz<2;dz++)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)a.push(samples.readDensity([x+dx,y+dy,z+dz]));return a;}
function sample(c,u,v,w){const a=(x,y,z)=>c[x+2*y+4*z];
  return (1-w)*((1-v)*(a(0,0,0)*(1-u)+a(1,0,0)*u)+v*(a(0,1,0)*(1-u)+a(1,1,0)*u))+
    w*((1-v)*(a(0,0,1)*(1-u)+a(1,0,1)*u)+v*(a(0,1,1)*(1-u)+a(1,1,1)*u));}
export function parcelBits(samples,p){const c=corners(samples,p),bits=[];for(const z of offsets)for(const y of offsets)for(const x of offsets)bits.push(sample(c,x,y,z)<0);return bits;}
function allCells(samples,fn){const n=samples.size;for(let z=0;z<n[2]-1;z++)for(let y=0;y<n[1]-1;y++)for(let x=0;x<n[0]-1;x++)fn([x,y,z]);}
export function extractRockIsland(before,after,support){
  if(support.status!=='OK')return {status:'HOLD',reason:'support evidence unavailable'};
  const unsupported=support.components.filter(c=>!c.anchored);
  if(unsupported.length!==1)return {status:'HOLD',reason:`expected one unsupported island; got ${unsupported.length}`};
  const ownerByCell=new Map();for(const component of support.components)for(const cell of component.cells)ownerByCell.set(cellKey(cell),component.anchored?'world':'actor');
  const ownership=new Map(),audit={initial:0,world:0,actor:0,consumed:0,duplicate:0,missing:0,extra:0,unionErrorRate:0};
  allCells(before,p=>{
    const old=parcelBits(before,p),now=parcelBits(after,p),owner=ownerByCell.get(cellKey(p));
    for(let part=0;part<8;part++){
      if(!old[part])continue;
      const key=`${cellKey(p)}:${part}`;audit.initial++;
      if(!now[part]){ownership.set(key,'consumed');audit.consumed++;}
      else if(owner==='world'||owner==='actor'){ownership.set(key,owner);audit[owner]++;}
      else throw new Error(`Occupied parcel has no component: ${key}`);
    }
  });
  const world=cloneRockSamples(after),actor=cloneRockSamples(after),[nx,ny,nz]=after.size;
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const i=x+nx*(y+ny*z),value=after.densities[i];if(value>=0)continue;
    const owners=new Set();
    for(let dz=-1;dz<=0;dz++)for(let dy=-1;dy<=0;dy++)for(let dx=-1;dx<=0;dx++){
      const cx=x+dx,cy=y+dy,cz=z+dz;if(cx<0||cy<0||cz<0||cx>=nx-1||cy>=ny-1||cz>=nz-1)continue;
      const owner=ownerByCell.get(`${cx},${cy},${cz}`);if(owner)owners.add(owner);
    }
    if(owners.size>1)return {status:'HOLD',reason:`scalar sample ${x},${y},${z} belongs to both disconnected components`};
    if(!owners.has('world')){world.densities[i]=Math.max(.5,-value);world.materials[i]=0;}
    if(!owners.has('actor')){actor.densities[i]=Math.max(.5,-value);actor.materials[i]=0;}
  }
  let surviving=0;
  allCells(after,p=>{
    const reference=parcelBits(after,p),worldBits=parcelBits(world,p),actorBits=parcelBits(actor,p);
    for(let i=0;i<8;i++){
      if(reference[i])surviving++;
      if(worldBits[i]&&actorBits[i])audit.duplicate++;
      if(reference[i]&&!worldBits[i]&&!actorBits[i])audit.missing++;
      if(!reference[i]&&(worldBits[i]||actorBits[i]))audit.extra++;
    }
  });
  audit.unionErrorRate=(audit.duplicate+audit.missing+audit.extra)/Math.max(1,surviving);
  if(audit.initial!==audit.world+audit.actor+audit.consumed)throw new Error('Quantity conservation failed');
  if(audit.unionErrorRate>.05)return {status:'HOLD',reason:`reconstructed occupancy union error ${(audit.unionErrorRate*100).toFixed(2)}%`,audit};
  return {status:'OK',world,actor,ownership,audit};
}
