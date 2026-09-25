// Bounded Phase 0.5D terrain patch. Integer lattice samples are authoritative;
// chunk snapshots copy a one-sample halo and never acquire matter ownership.
import { meshSurfaceNets } from './surface-nets.js';
import { composeMatterSample, SOURCE_PRECEDENCE } from './matter-composition.js';

export const TERRAIN_CHUNK_CELLS = 16;
export const TERRAIN_CHUNK_SPACING = 0.5;
export const TERRAIN_PATCH_CHUNKS = 3;
const MATERIAL_AIR = 0, MATERIAL_ROCK = 1, MATERIAL_DIRT = 2;
const pointKey = p => `${p[0]},${p[1]},${p[2]}`;
const extent = 18; // 16 owned edge-cells + 1 ghost sample on each side.
const index = (x,y,z) => (x+1)+extent*((y+1)+extent*(z+1));
const floorDiv = (value, divisor) => Math.floor(value/divisor);
export const terrainChunkId = (cx,cy,cz) => `${cx},${cy},${cz}`;
export function terrainChunkAddress(gx,gy,gz) {
  if (![gx,gy,gz].every(Number.isSafeInteger)) throw new Error('Global sample coordinates must be safe integers');
  const global=[gx,gy,gz], chunk=global.map(v=>floorDiv(v,TERRAIN_CHUNK_CELLS));
  return { global, chunk, chunkId:terrainChunkId(...chunk), local:global.map((v,i)=>v-chunk[i]*TERRAIN_CHUNK_CELLS) };
}
// Half-open sample ownership [16*c, 16*(c+1)); the upper boundary sample is
// owned by its positive-side chunk. Surface faces instead belong to the chunk
// containing the lower endpoint of the sign-changing edge.
export function terrainSampleOwner(gx,gy,gz) { return terrainChunkAddress(gx,gy,gz).chunkId; }

function terrainSurface(x,z) {
  return 4.25 + .62*Math.sin(x*.32) + .34*Math.cos(z*.36) + .018*x +
    1.05*Math.exp(-((x-2.5)**2+(z+1.5)**2)/30) + .42*Math.exp(-((x+5)**2+(z-4)**2)/16);
}
function terrainSources(gx,gy,gz) {
  const x=gx*TERRAIN_CHUNK_SPACING,z=gz*TERRAIN_CHUNK_SPACING,y=gy*TERRAIN_CHUNK_SPACING,surface=terrainSurface(x,z);
  const soilBase=surface-(.7+.28*Math.sin(x*.35+z*.2));
  const dirt=Math.max(y-surface,soilBase-y);
  // Exposed bedrock shoulders and a broad deep rock mass remain continuous.
  const exposure=.5+.5*Math.sin(x*.34+z*.21)*Math.cos(z*.39-x*.16);
  const soilCover=1-Math.max(0,Math.min(1,(exposure-.42)/.38));
  const rock=Math.max(y-(surface-.82*soilCover), -4-y);
  let resolved=composeMatterSample([gx,gy,gz],[
    {material:MATERIAL_DIRT,precedence:SOURCE_PRECEDENCE.DIRT,sample:()=>dirt},
    {material:MATERIAL_ROCK,precedence:SOURCE_PRECEDENCE.ROCK,sample:()=>rock},
  ]);
  // A shallow, fixed alcove cut into the global field.
  const cave=((x-1.1)/2.1)**2+((y-2.35)/.8)**2+((z+1.4)/1.7)**2;
  if(cave<1.0) resolved={density:Math.max(resolved.density,(1-Math.sqrt(cave))*.75),material:MATERIAL_AIR};
  // One embedded seam-side boulder, part of the same resolved global field.
  const buried=((x-8.05)/.95)**2+((y-3.05)/.8)**2+((z-1.1)/.9)**2;
  if(buried<1 && resolved.density<0) resolved={density:Math.max(resolved.density,-Math.sqrt(1-buried)*.9),material:MATERIAL_ROCK};
  return resolved;
}
export function generateTerrainSample(globalPoint, edits=new Map()) {
  if(!Array.isArray(globalPoint)||globalPoint.length!==3||!globalPoint.every(Number.isSafeInteger))throw new Error('Invalid global terrain sample');
  const override=edits.get(pointKey(globalPoint));
  return override?{density:override.density,material:override.density<0?override.material:MATERIAL_AIR}:terrainSources(...globalPoint);
}
export function terrainChunkSnapshot(chunk, edits=new Map()) {
  if(!Array.isArray(chunk)||chunk.length!==3||!chunk.every(Number.isSafeInteger))throw new Error('Invalid terrain chunk coordinate');
  const size=TERRAIN_CHUNK_CELLS,n=size+2,densities=new Float32Array(n**3),materials=new Uint8Array(n**3);
  const start=chunk.map(v=>v*size);
  for(let z=-1;z<=size;z++)for(let y=-1;y<=size;y++)for(let x=-1;x<=size;x++){
    const value=generateTerrainSample([start[0]+x,start[1]+y,start[2]+z],edits),i=index(x,y,z);
    densities[i]=value.density;materials[i]=value.material;
  }
  return {size,spacing:TERRAIN_CHUNK_SPACING,chunk:[...chunk],start,densities,materials};
}
export function meshTerrainChunk(chunk,edits=new Map()) {
  const snapshot=terrainChunkSnapshot(chunk,edits),mesh=meshSurfaceNets(snapshot);
  for(let i=0;i<mesh.positions.length;i+=3){mesh.positions[i]+=snapshot.start[0]*TERRAIN_CHUNK_SPACING;mesh.positions[i+1]+=snapshot.start[1]*TERRAIN_CHUNK_SPACING;mesh.positions[i+2]+=snapshot.start[2]*TERRAIN_CHUNK_SPACING;}
  return {...mesh,chunk:[...chunk],chunkId:terrainChunkId(...chunk),sampleGenerationMs:0};
}
export function patchChunkCoordinates() {
  const min=-1; // centered 3x3 X/Z patch within the one 8 m vertical cell.
  const out=[];for(let z=min;z<min+3;z++)for(let x=min;x<min+3;x++)out.push([x,0,z]);return out;
}
const patchIds=new Set(patchChunkCoordinates().map(c=>terrainChunkId(...c)));
export function terrainSampleInsidePatch(point){return Array.isArray(point)&&point.length===3&&point.every(Number.isSafeInteger)&&patchIds.has(terrainSampleOwner(...point));}
// A changed lattice sample can alter edge-owned faces whose lower endpoint is
// one step behind it or at the sample itself in each axis. This exact discrete
// dependency yields 1 / 2 / 4 (surface corner) chunks in ordinary edits.
export function dirtyChunksForSamples(samples) {
  const dirty=new Set();
  for(const [gx,gy,gz] of samples){
    const axes=[[gx-1,gx],[gy-1,gy],[gz-1,gz]];
    for(const x of axes[0])for(const y of axes[1])for(const z of axes[2])dirty.add(terrainChunkId(floorDiv(x,16),floorDiv(y,16),floorDiv(z,16)));
  }
  return [...dirty].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
}
const coords=id=>id.split(',').map(Number);
function cloneMap(source){return new Map(source);}
function copyMesh(mesh){return {...mesh,positions:mesh.positions.slice(),normals:mesh.normals.slice(),colors:mesh.colors.slice(),materialIds:mesh.materialIds.slice(),rockWeights:mesh.rockWeights.slice(),shades:mesh.shades.slice(),indices:mesh.indices.slice()};}

export class TerrainChunkWorld {
  constructor({store={save:async()=>{}},now=()=>performance.now(),failAt=null,prepareCollider=null,installProducts=null,rollbackProducts=null,discardProduct=null}={}) {
    this.store=store;this.now=now;this.failAt=failAt;this.prepareCollider=prepareCollider??((mesh,revision)=>({positions:mesh.positions.slice(),indices:mesh.indices.slice(),revision}));
    this.installProducts=installProducts??(()=>{});this.rollbackProducts=rollbackProducts??(()=>{});this.discardProduct=discardProduct??(()=>{});this.revision=0;this.edits=new Map();this.history=[];this.chunks=new Map();
    for(const chunk of patchChunkCoordinates()){const id=terrainChunkId(...chunk),mesh=meshTerrainChunk(chunk);this.chunks.set(id,{id,chunk,contentRevision:0,meshRevision:0,colliderRevision:0,mesh,collider:mesh});}
  }
  read(point){return generateTerrainSample(point,this.edits);}
  prepareEdit(changedSamples,{expectedRevision=this.revision}={}) {
    if(expectedRevision!==this.revision)return {status:'STALE',revision:this.revision};
    if(!Array.isArray(changedSamples)||!changedSamples.length)return {status:'EMPTY',revision:this.revision};
    const nextEdits=cloneMap(this.edits),samples=[];
    for(const item of changedSamples){const p=item.point??item,density=item.density??1;
      if(!terrainSampleInsidePatch(p))return {status:'OUT_OF_PATCH',revision:this.revision};
      if(!Number.isFinite(density)||!Number.isSafeInteger(Math.round(density*1000000)))return {status:'INVALID_SAMPLE',revision:this.revision};
      const old=generateTerrainSample(p,nextEdits),material=density<0?(item.material??old.material):0;
      if(!Number.isFinite(density)||!Number.isSafeInteger(Math.round(density*1000000))||density<old.density)continue;
      nextEdits.set(pointKey(p),{density,material});samples.push([...p]);}
    if(!samples.length)return {status:'EMPTY',revision:this.revision};
    const nextRevision=this.revision+1,dirtyChunkIds=dirtyChunksForSamples(samples).filter(id=>patchIds.has(id)),unchangedChunkIds=[...this.chunks.keys()].filter(id=>!dirtyChunkIds.includes(id));
    return {status:'PREPARED_INPUT',baseRevision:this.revision,nextRevision,nextEdits,samples,dirtyChunkIds,unchangedChunkIds};
  }
  async publishEdit(proposal) {
    if(proposal?.status!=='PREPARED_INPUT')return proposal;
    if(proposal.baseRevision!==this.revision)return {status:'STALE',revision:this.revision};
    const started=this.now(),products=new Map(),meshMs={},colliderMs={};
    try{
      for(const id of proposal.dirtyChunkIds){
        const chunk=coords(id),t=this.now();if(this.failAt===`mesh:${id}`||this.failAt==='mesh')throw new Error(`Injected mesh worker failure: ${id}`);
        const mesh=meshTerrainChunk(chunk,proposal.nextEdits);meshMs[id]=this.now()-t;
        const c=this.now();if(this.failAt===`collider:${id}`||this.failAt==='collider')throw new Error(`Injected collider preparation failure: ${id}`);
        const collider=await this.prepareCollider(mesh,proposal.nextRevision,id);colliderMs[id]=this.now()-c;
        products.set(id,{mesh,collider,contentRevision:proposal.nextRevision,meshRevision:proposal.nextRevision,colliderRevision:proposal.nextRevision});
      }
      if(this.failAt==='ownership')throw new Error('Injected ownership validation failure');
      if(!proposal.samples.every(p=>this.read(p).density<0||proposal.nextEdits.get(pointKey(p))?.density>=0))throw new Error('Terrain ownership validation failed');
      if(proposal.baseRevision!==this.revision)return {status:'STALE',revision:this.revision};
      const persistStart=this.now();if(this.failAt==='save')throw new Error('Injected persistence failure');
      const previousSave=this.exportSave();await this.store.save({version:1,revision:proposal.nextRevision,edits:Object.fromEntries(proposal.nextEdits)});
      const persistenceMs=this.now()-persistStart;
      // One synchronous install section publishes every dependent chunk product.
      const previous=new Map(proposal.dirtyChunkIds.map(id=>[id,this.chunks.get(id)]));
      try{this.installProducts(products,previous,proposal.nextRevision);}
      catch(error){try{this.rollbackProducts(products,previous);await this.store.save(previousSave);}catch(rollbackError){this.publicationFailed=rollbackError;}throw error;}
      for(const [id,product] of products)this.chunks.set(id,{id,chunk:coords(id),...product});
      this.edits=proposal.nextEdits;this.revision=proposal.nextRevision;
      const event={worldRevision:this.revision,changedSampleCount:proposal.samples.length,dirtyChunkIds:proposal.dirtyChunkIds,remeshedChunkIds:[...products.keys()],rebuiltColliderChunkIds:[...products.keys()],unchangedChunkIds:proposal.unchangedChunkIds,meshMs,colliderMs,persistenceMs,transactionMs:this.now()-started};
      this.history.push(event);if(this.history.length>32)this.history.shift();return {status:'COMMITTED',event};
    }catch(error){for(const product of products.values())try{this.discardProduct(product);}catch{/* preserve transaction failure */}return {status:'REJECTED',revision:this.revision,error:error.message,recoveryRequired:Boolean(this.publicationFailed)};}
  }
  async editSamples(changedSamples,options){return this.publishEdit(this.prepareEdit(changedSamples,options));}
  exportSave(){return {version:1,revision:this.revision,edits:Object.fromEntries(this.edits)};}
  async reload(save){this.edits=new Map(Object.entries(save.edits??{}));this.revision=save.revision??0;this.chunks.clear();for(const chunk of patchChunkCoordinates()){const id=terrainChunkId(...chunk),mesh=meshTerrainChunk(chunk,this.edits);this.chunks.set(id,{id,chunk,contentRevision:this.revision,meshRevision:this.revision,colliderRevision:this.revision,mesh,collider:{positions:mesh.positions.slice(),indices:mesh.indices.slice(),revision:this.revision}});}return this;}
  get products(){return [...this.chunks.values()];}
}

export function excavateSphere(world,center,radius=.8,tool=null) {
  const spacing=TERRAIN_CHUNK_SPACING,lo=center.map(v=>Math.floor((v-radius-spacing)/spacing)),hi=center.map(v=>Math.ceil((v+radius+spacing)/spacing)),changes=[];
  for(let z=lo[2];z<=hi[2];z++)for(let y=lo[1];y<=hi[1];y++)for(let x=lo[0];x<=hi[0];x++){
    const p=[x,y,z],old=world.read(p);if(old.density>=0||tool&&old.material!==tool)continue;
    const d=Math.hypot(x*spacing-center[0],y*spacing-center[1],z*spacing-center[2]);if(d>=radius+spacing)continue;
    const density=Math.max(old.density,radius-d);if(density<=old.density)continue;changes.push({point:p,density,material:old.material});
  }
  return changes;
}
