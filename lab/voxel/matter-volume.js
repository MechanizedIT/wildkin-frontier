// A bounded field contract for the cellular lab. Mesh snapshots are derived
// read-only halos; edits live in the world delta or actor's local snapshot.
const address=p=>p.join(',');
const inside=(p,b)=>p.every((v,i)=>v>=b.min[i]&&v<=b.max[i]);
const extent=b=>b.max.map((v,i)=>v-b.min[i]+1);
const index=(p,b)=>{const [nx,ny]=extent(b);return p[0]-b.min[0]+nx*(p[1]-b.min[1]+ny*(p[2]-b.min[2]));};
function assertFrame(frame){if(frame?.spacing!==.5||frame.offset?.length!==3||!frame.offset.every(Number.isFinite))throw new Error('Invalid 0.5 m matter sample frame');return Object.freeze({spacing:.5,offset:[...frame.offset]});}
function assertPoint(p){if(p?.length!==3||!p.every(Number.isSafeInteger))throw new Error('Sample address must be three integers');}
function snapshotPadded(view,{start,size}){
  assertPoint(start);if(!Number.isSafeInteger(size)||size<1||size>32)throw new Error('Invalid padded snapshot size');
  const bounds={min:start.map(v=>v-1),max:start.map(v=>v+size)},n=size+2;
  const densities=new Float32Array(n**3),materials=new Uint8Array(n**3),domains=new Array(n**3);
  for(let z=bounds.min[2];z<=bounds.max[2];z++)for(let y=bounds.min[1];y<=bounds.max[1];y++)for(let x=bounds.min[0];x<=bounds.max[0];x++){
    const p=[x,y,z],i=index(p,bounds);densities[i]=view.readDensity(p);materials[i]=view.readMaterial(p);domains[i]=view.readDomain(p);
  }
  return {bounds,spacing:view.frame.spacing,frame:view.frame,densities,materials,domains};
}
function api({id,frame,domain,read,canWrite}){
  const view={id,frame,domain,
    samplePosition(p){assertPoint(p);return p.map((v,i)=>frame.offset[i]+v*frame.spacing);},
    readDensity(p){assertPoint(p);return read(p).density;},
    readMaterial(p){assertPoint(p);return read(p).material;},
    readDomain(p){assertPoint(p);return read(p).domain;},
    snapshotPadded(bounds){return snapshotPadded(view,bounds);},
    makeDraft(){
      const edits=new Map();
      const draft=api({id,frame,domain,canWrite,read:p=>edits.get(address(p))??read(p)});
      draft.write=(p,value)=>{assertPoint(p);if(!canWrite(p))throw new Error('Matter write outside owned bounds');
        if(!Number.isFinite(value.density)||!Number.isSafeInteger(value.material)||value.material<0||value.material>255)throw new Error('Invalid matter sample');
        edits.set(address(p),{density:value.density,material:value.density<0?value.material:0,domain:value.domain??domain});
      };
      draft.edits=edits;return draft;
    },
  };return view;
}
export function createWorldMatterVolume({id,frame,domain,generator,edits=new Map()}){
  frame=assertFrame(frame);if(typeof generator!=='function')throw new Error('World matter needs a generator');
  return api({id,frame,domain,canWrite:()=>true,read:p=>{
    const v=edits.get(address(p))??generator(p);return {density:v.density,material:v.material,domain:v.domain??domain};
  }});
}
export function createActorMatterVolume({id,frame,domain,bounds,snapshot}){
  frame=assertFrame(frame);
  if(!bounds||!snapshot||bounds.min.some((v,i)=>v!==snapshot.bounds.min[i])||bounds.max.some((v,i)=>v!==snapshot.bounds.max[i]))throw new Error('Actor snapshot bounds mismatch');
  const length=extent(bounds).reduce((a,b)=>a*b,1);
  if(length>40000||snapshot.densities.length!==length||snapshot.materials.length!==length||snapshot.domains.length!==length)throw new Error('Actor snapshot budget or shape mismatch');
  return api({id,frame,domain,canWrite:p=>inside(p,bounds),read:p=>inside(p,bounds)?
    {density:snapshot.densities[index(p,bounds)],material:snapshot.materials[index(p,bounds)],domain:snapshot.domains[index(p,bounds)]}:
    {density:1,material:0,domain:null}});
}
