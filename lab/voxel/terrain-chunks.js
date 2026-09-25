// Bounded Phase 0.5D terrain patch. Integer lattice samples are authoritative;
// chunk snapshots copy a one-sample halo and never acquire matter ownership.
import { meshSurfaceNets } from './surface-nets.js';
import { composeMatterSample, SOURCE_PRECEDENCE } from './matter-composition.js';
import { analyzeTerrainMatterConnectivity, TERRAIN_CHUNK_CELLS, TERRAIN_CHUNK_SPACING, TerrainMatterLedger, TerrainMatterWindow, terrainParcelId } from './terrain-matter-window.js';
import { parcelBits, parcelMaterial } from './matter-ownership.js';
import { createMatterActorFromResolvedSamples, mineActorMatter } from './matter-actor.js';
import { MATTER_MATERIAL } from './matter-material-policy.js';

export { TERRAIN_CHUNK_CELLS, TERRAIN_CHUNK_SPACING };

export const TERRAIN_PATCH_CHUNKS = 3;
const MATERIAL_AIR = 0, MATERIAL_ROCK = 1, MATERIAL_DIRT = 2;
const pointKey = p => `${p[0]},${p[1]},${p[2]}`;
const parcelCellMin=[-16,0,-16],parcelCellMax=[32,16,32];
const parcelLedgerIndex=(id)=>{const [cellText,partText]=id.split(':'),[x,y,z]=cellText.split(',').map(Number),probe=Number(partText);
  return (((x+16)+48*(y+16*(z+16)))*8+probe);};
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
  let dirt=Math.max(y-surface,soilBase-y);
  // One narrow dirt rise gives the seam boulder a real, removable soil
  // contact above the continuous bedrock field. This is still ordinary
  // resolved terrain matter and shares the global source compositor.
  const moundFootprint=((x-8.05)/1.9)**2+((z-1.1)/1.55)**2;
  const moundTop=surface+1.15*Math.max(0,1-moundFootprint),moundBase=surface-.55;
  const soilMound=Math.max(y-moundTop,moundBase-y);
  dirt=Math.min(dirt,soilMound);
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
  // The fixture alcove separates the boulder from deep bedrock at the
  // half-metre probe scale. Its lower contact is resolved dirt that joins the
  // surrounding soil shelf, so ordinary support analysis can release it.
  const boulder=((x-8.05)/1.25)**2+((y-5.85)/.65)**2+((z-1.1)/.85)**2;
  if(boulder<1) resolved={density:-Math.sqrt(1-boulder)*.9,material:MATERIAL_ROCK};
  else if(Math.abs(x-8.05)<1.65&&Math.abs(z-1.1)<1.55&&y>3.5&&y<7.2){
    const supportColumn=((x-8.05)/.62)**2+((z-1.1)/.58)**2;
    const dirtContact=Math.max(supportColumn-1,y-5.25,(surface-1.35)-y);
    resolved=dirtContact<0?{density:dirtContact,material:MATERIAL_DIRT}:{density:.18,material:MATERIAL_AIR};
  }
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

const boulderMatterBounds={min:[8,0,-4],max:[24,16,12]};
function matterIdentity(window,p){const i=window.index(p),id=window.materials[i];return id===MATERIAL_ROCK?'ROCK':id===MATERIAL_DIRT?'DIRT':'AIR';}
function localSupport(window){return analyzeTerrainMatterConnectivity(window,{anchor:p=>window.localToGlobal(p)[1]===0,identityForCell:p=>matterIdentity(window,p),canConnect:()=>true,allowAnchoredEdgeComponents:true});}
function makeRockActor(world,window,component,rockCells,ledger,id){
  const origin=[8,0,1],sample={size:[13,13,13],spacing:TERRAIN_CHUNK_SPACING,min:[-3,0,-3],densities:new Float32Array(13**3).fill(1),materials:new Uint8Array(13**3)};
  const sampleKeys=new Set();for(const cell of rockCells)for(let dz=0;dz<=1;dz++)for(let dy=0;dy<=1;dy++)for(let dx=0;dx<=1;dx++)sampleKeys.add(pointKey([cell[0]+dx,cell[1]+dy,cell[2]+dz]));
  for(let z=0;z<13;z++)for(let y=0;y<13;y++)for(let x=0;x<13;x++){
    const global=[10+x,y,-4+z],i=x+13*(y+13*z);if(!sampleKeys.has(pointKey(global)))continue;
    const value=world.read(global);if(value.material===MATERIAL_ROCK){sample.densities[i]=value.density;sample.materials[i]=MATERIAL_ROCK;}
  }
  sample.readDensity=([x,y,z])=>x<0||y<0||z<0||x>=13||y>=13||z>=13?1:sample.densities[x+13*(y+13*z)];
  const actorCells=rockCells.map(([x,y,z])=>[x-10,y,z+4]),actorComponent={...component,cells:actorCells};
  const actor=createMatterActorFromResolvedSamples({id,sample,component:actorComponent,position:origin,material:MATTER_MATERIAL.ROCK});
  actor.sampleFrame={offset:[-3,0,-3],spacing:TERRAIN_CHUNK_SPACING};actor.bounds={min:[-3,0,-3],max:[3,6,3]};
  actor.parcelIds={};const transfer=[];
  // Material identity is per parcel, while connectivity groups sample cells.
  // A mixed component can contain several separated ROCK fragments and ROCK
  // probes in cells whose center label is DIRT. Transfer every ROCK parcel
  // from the complete unsupported mixed component, not its first ROCK fragment.
  for(const local of component.cells){const global=window.localToGlobal(local),bits=parcelBits(window,local);
    for(let probe=0;probe<8;probe++)if(bits[probe]&&parcelMaterial(window,local,probe)===MATERIAL_ROCK&&ledger.owner(global,probe)==='WORLD'){
      const parcel=terrainParcelId(global,probe),actorCell=global.map((v,i)=>v-[10,0,-4][i]);actor.parcelIds[`${actorCell.join(',')}:${probe}`]=parcel;transfer.push(parcel);
    }
  }
  if(!transfer.length)throw new Error('Unsupported rock component has no WORLD parcels');
  ledger.transfer(transfer,id);actor.transferredParcelCount=transfer.length;actor.contentRevision=1;return {actor,transfer,sampleKeys};
}

export class TerrainChunkWorld {
  constructor({store={save:async()=>{}},now=()=>performance.now(),failAt=null,prepareCollider=null,installProducts=null,rollbackProducts=null,discardProduct=null,
    prepareActorProduct=null,installActorProducts=null,discardActorProduct=null,retireProducts=null}={}) {
    this.store=store;this.now=now;this.failAt=failAt;this.prepareCollider=prepareCollider??((mesh,revision)=>({positions:mesh.positions.slice(),indices:mesh.indices.slice(),revision}));
    this.installProducts=installProducts??(()=>{});this.rollbackProducts=rollbackProducts??(()=>{});this.discardProduct=discardProduct??(()=>{});
    this.prepareActorProduct=prepareActorProduct??(actor=>({id:actor.id,revision:actor.contentRevision,record:actor}));
    this.installActorProducts=installActorProducts??(()=>{});this.discardActorProduct=discardActorProduct??(()=>{});this.retireProducts=retireProducts??(()=>{});
    this.revision=0;this.edits=new Map();this.history=[];this.chunks=new Map();this.actorProducts=new Map();
    this.recoveryRequired=false;this.publicationFailed=null;
    this.ledger=new TerrainMatterLedger(this);this.actors=[];this.retiredActorIds=[];this.rewards={rock:0,dirt:0};
    for(const chunk of patchChunkCoordinates()){const id=terrainChunkId(...chunk),mesh=meshTerrainChunk(chunk);this.chunks.set(id,{id,chunk,contentRevision:0,meshRevision:0,colliderRevision:0,mesh,collider:mesh});}
  }
  read(point){return generateTerrainSample(point,this.edits);}
  prepareEdit(changedSamples,{expectedRevision=this.revision}={}) {
    if(this.recoveryRequired)return {status:'RECOVERY_REQUIRED',revision:this.revision};
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
    let nextLedger,consumedParcelIds=[],actors=structuredClone(this.actors),actorDirtyIds=[],supportEvidence=null,postTransferDirtCells=0;
    try{
      nextLedger=TerrainMatterLedger.fromSave(this,this.ledger.exportSave());
      const min=[0,1,2].map(i=>Math.max(parcelCellMin[i],Math.min(...samples.map(p=>p[i]))-1));
      const max=[0,1,2].map(i=>Math.min(parcelCellMax[i],Math.max(...samples.map(p=>p[i]))+1));
      const bounds={min,max},before=new TerrainMatterWindow(this,bounds);
      const cells=new Set();for(const p of samples)for(let dz=-1;dz<=0;dz++)for(let dy=-1;dy<=0;dy++)for(let dx=-1;dx<=0;dx++){
        const cell=[p[0]+dx,p[1]+dy,p[2]+dz];if(cell.every((v,i)=>v>=parcelCellMin[i]&&v<parcelCellMax[i]))cells.add(pointKey(cell));
      }
      const operationMaterials=new Set(changedSamples.map(item=>item.material).filter(Number.isSafeInteger));
      const operationMaterial=operationMaterials.size===1?[...operationMaterials][0]:null;
      // C.1R preserves foreign parcels by restoring their scalar-corner support.
      // Apply that rule against immutable ledger materials before accounting the
      // edit, so an adjacent tool cannot erase another material's last probes.
      if(operationMaterial!==null){const proposed=new TerrainMatterWindow({read:p=>generateTerrainSample(p,nextEdits)},bounds),restore=new Set();
        for(const address of cells){const cell=address.split(',').map(Number),local=cell.map((v,i)=>v-min[i]),oldBits=parcelBits(before,local),newBits=parcelBits(proposed,local);
          for(let probe=0;probe<8;probe++)if(oldBits[probe]&&!newBits[probe]){const id=terrainParcelId(cell,probe),ledgerMaterial=nextLedger.materials[parcelLedgerIndex(id)];
            if(ledgerMaterial&&ledgerMaterial!==operationMaterial){for(let dz=0;dz<=1;dz++)for(let dy=0;dy<=1;dy++)for(let dx=0;dx<=1;dx++)restore.add(pointKey([cell[0]+dx,cell[1]+dy,cell[2]+dz]));}
          }
        }
        for(const address of restore){const point=address.split(',').map(Number);if(samples.some(sample=>pointKey(sample)===address)){const value=this.read(point);nextEdits.set(address,{density:value.density,material:value.material});}}
      }
      const after=new TerrainMatterWindow({read:p=>generateTerrainSample(p,nextEdits)},bounds);
      for(const address of cells){const cell=address.split(',').map(Number),local=cell.map((v,i)=>v-min[i]),oldBits=parcelBits(before,local),newBits=parcelBits(after,local);
        for(let probe=0;probe<8;probe++)if(oldBits[probe]&&!newBits[probe]){const id=terrainParcelId(cell,probe),owner=nextLedger.owner(cell,probe);
          if(owner==='WORLD'){nextLedger.consume([id]);consumedParcelIds.push(id);}
          else if(owner!==null)throw new Error(`Terrain edit attempted to remove non-WORLD parcel ${id}`);
        }
      }
      nextLedger.assertBalanced();
      if(samples.some(([x,y,z])=>x>=8&&x<=24&&y>=8&&y<=16&&z>=-4&&z<=12)){
        const field={read:p=>generateTerrainSample(p,nextEdits)},matterWindow=new TerrainMatterWindow(field,boulderMatterBounds),initialSupport=localSupport(matterWindow);
        if(initialSupport.status!=='OK')throw new Error(`Bounded support query failed: ${initialSupport.reason}`);
        const candidates=initialSupport.components.filter(component=>!component.anchored&&component.fragments.some(fragment=>fragment.id==='ROCK'));
        supportEvidence={bounds:initialSupport.query,cellWork:initialSupport.cellCount,bonds:initialSupport.bonds,workUnits:initialSupport.workUnits??initialSupport.cellCount+initialSupport.bonds,
          componentCount:initialSupport.components.length,rockSupported:candidates.length===0,extractedComponents:0,transferredRockParcels:0};
        if(candidates.length>4)throw new Error('Bounded rock actor budget exceeded');
        for(const [candidateIndex,component] of candidates.entries()){
          const globalCells=component.cells.map(p=>matterWindow.localToGlobal(p));
          if(!globalCells.length)continue;
          const id=`terrain-rock-${this.revision+1}-${actors.length+candidateIndex}`,extracted=makeRockActor(field,matterWindow,component,globalCells,nextLedger,id);
          const expectedRockParcels=component.cells.reduce((count,local)=>{const global=matterWindow.localToGlobal(local),bits=parcelBits(matterWindow,local);
            return count+bits.reduce((n,occupied,probe)=>n+(occupied&&parcelMaterial(matterWindow,local,probe)===MATERIAL_ROCK&&nextLedger.owner(global,probe)!=='CONSUMED'?1:0),0);},0);
          if(extracted.actor.transferredParcelCount!==extracted.transfer.length||extracted.transfer.length!==expectedRockParcels)
            throw new Error('Rock component ownership transfer is incomplete');
          supportEvidence.transferredRockParcels+=extracted.transfer.length;
          actors.push(extracted.actor);actorDirtyIds.push(id);
          for(const address of extracted.sampleKeys){const point=address.split(',').map(Number);if(!terrainSampleInsidePatch(point))continue;
            const old=generateTerrainSample(point,nextEdits);if(old.material!==MATERIAL_ROCK||old.density>=0)continue;
            nextEdits.set(pointKey(point),{density:Math.max(.25,-old.density),material:MATERIAL_AIR});samples.push(point);
          }
          supportEvidence.extractedComponents++;supportEvidence.rockSupported=false;
        }
        if(candidates.length){
          const afterRock=new TerrainMatterWindow({read:p=>generateTerrainSample(p,nextEdits)},boulderMatterBounds),dirtSupport=localSupport(afterRock);
          if(dirtSupport.status!=='OK')throw new Error(`Post-transfer support query failed: ${dirtSupport.reason}`);
          const loose=dirtSupport.components.filter(component=>!component.anchored).flatMap(component=>component.fragments.filter(fragment=>fragment.id==='DIRT').map(fragment=>({component,fragment})));
          const dirtParcelIds=new Set(),dirtSamples=new Set();
          for(const {fragment} of loose)for(const local of fragment.cells){const global=afterRock.localToGlobal(local),bits=parcelBits(afterRock,local);
            for(let probe=0;probe<8;probe++)if(bits[probe]&&parcelMaterial(afterRock,local,probe)===MATERIAL_DIRT&&nextLedger.owner(global,probe)==='WORLD')dirtParcelIds.add(terrainParcelId(global,probe));
            for(let dz=0;dz<=1;dz++)for(let dy=0;dy<=1;dy++)for(let dx=0;dx<=1;dx++)dirtSamples.add(pointKey(global.map((v,i)=>v+[dx,dy,dz][i])));
          }
          if(dirtParcelIds.size>=128)throw new Error('Post-transfer dirt fragment exceeds the C.1R persistent clod threshold');
          for(const address of dirtSamples){const point=address.split(',').map(Number);if(!terrainSampleInsidePatch(point))continue;
            const old=generateTerrainSample(point,nextEdits);if(old.material===MATERIAL_DIRT&&old.density<0){nextEdits.set(address,{density:Math.max(.25,-old.density),material:MATERIAL_AIR});samples.push(point);}
          }
          if(dirtParcelIds.size){const ids=[...dirtParcelIds];nextLedger.consume(ids);consumedParcelIds.push(...ids);postTransferDirtCells=dirtSamples.size;}
          const finalWindow=new TerrainMatterWindow({read:p=>generateTerrainSample(p,nextEdits)},boulderMatterBounds),finalSupport=localSupport(finalWindow);
          if(finalSupport.status!=='OK'||finalSupport.components.some(component=>!component.anchored&&component.fragments.some(fragment=>fragment.id==='DIRT')))
            throw new Error('Post-transfer dirt support did not converge within the bounded pass');
          supportEvidence.postTransferWorkUnits=dirtSupport.workUnits??dirtSupport.cellCount+dirtSupport.bonds;
          supportEvidence.totalWorkUnits=supportEvidence.workUnits+supportEvidence.postTransferWorkUnits;
          supportEvidence.componentCount=finalSupport.components.length;supportEvidence.postTransferDirtConsumed=dirtParcelIds.size;
        }
      }
      nextLedger.assertBalanced();
    }catch(error){return {status:'OWNERSHIP',revision:this.revision,error:error.message};}
    const nextRevision=this.revision+1,uniqueSamples=[...new Map(samples.map(p=>[pointKey(p),p])).values()],dirtyChunkIds=dirtyChunksForSamples(uniqueSamples).filter(id=>patchIds.has(id)),unchangedChunkIds=[...this.chunks.keys()].filter(id=>!dirtyChunkIds.includes(id)),rewards={...this.rewards};
    for(const id of consumedParcelIds){const material=nextLedger.materials[parcelLedgerIndex(id)];rewards[material===MATERIAL_ROCK?'rock':'dirt']++;}
    return {status:'PREPARED_INPUT',baseRevision:this.revision,nextRevision,nextEdits,nextLedger,actors,retiredActorIds:[...this.retiredActorIds],rewards,
      actorDirtyIds,actorRetiredIds:[],consumedParcelIds,samples:uniqueSamples,dirtyChunkIds,unchangedChunkIds,supportEvidence,postTransferDirtCells};
  }
  async publishEdit(proposal) {
    if(this.recoveryRequired)return {status:'RECOVERY_REQUIRED',revision:this.revision};
    if(proposal?.status!=='PREPARED_INPUT')return proposal;
    if(proposal.baseRevision!==this.revision)return {status:'STALE',revision:this.revision};
    const started=this.now(),products=new Map(),actorProducts=new Map(),meshMs={},colliderMs={};
    try{
      for(const id of proposal.dirtyChunkIds){
        const chunk=coords(id),t=this.now();if(this.failAt===`mesh:${id}`||this.failAt==='mesh')throw new Error(`Injected mesh worker failure: ${id}`);
        const mesh=meshTerrainChunk(chunk,proposal.nextEdits);meshMs[id]=this.now()-t;
        const c=this.now();if(this.failAt===`collider:${id}`||this.failAt==='collider')throw new Error(`Injected collider preparation failure: ${id}`);
        const collider=await this.prepareCollider(mesh,proposal.nextRevision,id);colliderMs[id]=this.now()-c;
        products.set(id,{mesh,collider,contentRevision:proposal.nextRevision,meshRevision:proposal.nextRevision,colliderRevision:proposal.nextRevision});
      }
      const oldActorProducts=new Map();
      for(const id of proposal.actorDirtyIds??[]){const actor=proposal.actors.find(value=>value.id===id);if(!actor)throw new Error(`Changed actor ${id} is absent from proposal`);
        if(this.failAt==='actor-mesh')throw new Error(`Injected actor mesh preparation failure: ${id}`);
        const prepared=await this.prepareActorProduct(actor,proposal.nextRevision);if(this.failAt==='actor-collider'){this.discardActorProduct(prepared);throw new Error(`Injected actor collider preparation failure: ${id}`);}
        actorProducts.set(id,prepared);oldActorProducts.set(id,this.actorProducts.get(id)??null);
      }
      for(const id of proposal.actorRetiredIds??[])if(!oldActorProducts.has(id))oldActorProducts.set(id,this.actorProducts.get(id)??null);
      if(this.failAt==='ownership')throw new Error('Injected ownership validation failure');
      if(!proposal.samples.every(p=>this.read(p).density<0||proposal.nextEdits.get(pointKey(p))?.density>=0))throw new Error('Terrain ownership validation failed');
      if(proposal.baseRevision!==this.revision)return {status:'STALE',revision:this.revision};
      const persistStart=this.now();if(this.failAt==='save')throw new Error('Injected persistence failure');
      const previousSave=this.exportSave();await this.store.save({version:2,revision:proposal.nextRevision,edits:Object.fromEntries(proposal.nextEdits),ledger:proposal.nextLedger.exportSave(),
        actors:proposal.actors,retiredActorIds:proposal.retiredActorIds,rewards:proposal.rewards});
      const persistenceMs=this.now()-persistStart;
      // One synchronous install section publishes every dependent chunk product.
      const previous=new Map(proposal.dirtyChunkIds.map(id=>[id,this.chunks.get(id)]));
      try{this.installProducts(products,previous,proposal.nextRevision,actorProducts,oldActorProducts);this.installActorProducts(actorProducts,oldActorProducts,proposal.actorRetiredIds??[]);
        if(this.failAt==='physics-install')throw new Error('Injected failure during staged physics publication');}
      catch(error){try{this.rollbackProducts(products,previous,actorProducts,oldActorProducts);await this.store.save(previousSave);}
        catch(rollbackError){this.publicationFailed=rollbackError;this.recoveryRequired=true;}throw error;}
      this.retireProducts(products,previous,actorProducts,oldActorProducts,proposal.actorRetiredIds??[]);
      for(const [id,product] of products)this.chunks.set(id,{id,chunk:coords(id),...product});
      for(const [id,product] of actorProducts)this.actorProducts.set(id,product);
      for(const id of proposal.actorRetiredIds??[])this.actorProducts.delete(id);
      this.edits=proposal.nextEdits;this.ledger=proposal.nextLedger;this.rewards={...proposal.rewards};
      this.actors=proposal.actors;this.retiredActorIds=proposal.retiredActorIds;this.revision=proposal.nextRevision;
      const event={worldRevision:this.revision,changedSampleCount:proposal.samples.length,changedSamples:proposal.samples.map(p=>[...p]),consumedParcelIds:[...proposal.consumedParcelIds],dirtyChunkIds:proposal.dirtyChunkIds,remeshedChunkIds:[...products.keys()],rebuiltColliderChunkIds:[...products.keys()],unchangedChunkIds:proposal.unchangedChunkIds,
        preparedActorIds:[...actorProducts.keys()],reusedActorIds:this.actors.map(a=>a.id).filter(id=>!actorProducts.has(id)),retiredActorIds:[...(proposal.actorRetiredIds??[])],supportEvidence:proposal.supportEvidence,
        actorMining:proposal.actorMining,postTransferDirtCells:proposal.postTransferDirtCells,meshMs,colliderMs,persistenceMs,transactionMs:this.now()-started};
      this.history.push(event);if(this.history.length>32)this.history.shift();return {status:'COMMITTED',event};
    }catch(error){for(const product of products.values())try{this.discardProduct(product);}catch{/* preserve transaction failure */}
      for(const product of actorProducts.values())try{this.discardActorProduct(product);}catch{/* preserve transaction failure */}
      return {status:'REJECTED',revision:this.revision,error:error.message,recoveryRequired:this.recoveryRequired};}
  }
  async editSamples(changedSamples,options){return this.publishEdit(this.prepareEdit(changedSamples,options));}
  prepareActorMining(actorId,expectedContentRevision,localHit,{expectedRevision=this.revision}={}){
    if(this.recoveryRequired)return {status:'RECOVERY_REQUIRED',revision:this.revision};
    if(expectedRevision!==this.revision)return {status:'STALE',revision:this.revision};
    const actor=this.actors.find(value=>value.id===actorId);if(!actor||actor.contentRevision!==expectedContentRevision)return {status:'STALE',revision:this.revision};
    try{
      const actorOwnership=actor.parcelIds??{},keys=Object.keys(actorOwnership),ownership=Object.fromEntries(keys.map(key=>[key,actorId])),parcelMaterials=Object.fromEntries(keys.map(key=>[key,MATERIAL_ROCK]));
      const matterState={version:'terrain-matter-actor-v1',revision:this.revision,spacing:TERRAIN_CHUNK_SPACING,initialQuantity:keys.length,materialId:MATERIAL_ROCK,
        fixture:'rock-boulder',actors:[structuredClone(actor)],retired:[],fractureDebris:[],ownership,parcelMaterials,
        rewards:{stoneUnits:0,dirtUnits:0},events:{dugUnits:{rock:0,dirt:0},crumbledUnits:{rock:0,dirt:0}}};
      const mined=mineActorMatter(matterState,actorId,expectedContentRevision,localHit);if(mined.status!=='OK')return {...mined,revision:this.revision};
      const nextLedger=TerrainMatterLedger.fromSave(this,this.ledger.exportSave()),consumedParcelIds=[];
      for(const key of keys){const globalId=actorOwnership[key],owner=mined.state.ownership[key];
        if(owner==='consumed'){nextLedger.consume([globalId],actorId);consumedParcelIds.push(globalId);}
        else if(owner&&owner!==actorId)nextLedger.transferFrom([globalId],actorId,owner);
      }
      const nextActors=mined.state.actors.map(value=>({...value,parcelIds:{}}));
      for(const [key,owner] of Object.entries(mined.state.ownership))if(owner!=='consumed'){
        const record=nextActors.find(value=>value.id===owner);if(record)record.parcelIds[key]=actorOwnership[key];
      }
      const actorRetiredIds=mined.state.retired.filter(id=>this.actors.some(value=>value.id===id));
      const actorDirtyIds=nextActors.filter(value=>{const old=this.actors.find(existing=>existing.id===value.id);return !old||old.contentRevision!==value.contentRevision;}).map(value=>value.id);
      nextLedger.assertBalanced();
      const rewards={...this.rewards};for(const id of consumedParcelIds){const material=nextLedger.materials[parcelLedgerIndex(id)];rewards[material===MATERIAL_ROCK?'rock':'dirt']++;}
      return {status:'PREPARED_INPUT',baseRevision:this.revision,nextRevision:this.revision+1,nextEdits:cloneMap(this.edits),nextLedger,actors:nextActors,
        retiredActorIds:[...new Set([...this.retiredActorIds,...mined.state.retired])],actorDirtyIds,actorRetiredIds,consumedParcelIds,samples:[],dirtyChunkIds:[],unchangedChunkIds:[...this.chunks.keys()],
        rewards,supportEvidence:null,actorMining:{actorId,stress:mined.stress,cut:mined.cut,fractureMetrics:mined.fractureMetrics}};
    }catch(error){return {status:'OWNERSHIP',revision:this.revision,error:error.message};}
  }
  exportSave(){return {version:2,revision:this.revision,edits:Object.fromEntries(this.edits),ledger:this.ledger.exportSave(),actors:structuredClone(this.actors),retiredActorIds:[...this.retiredActorIds],rewards:{...this.rewards}};}
  async reload(save){this.edits=new Map(Object.entries(save.edits??{}));this.revision=save.revision??0;if(save.ledger)this.ledger=TerrainMatterLedger.fromSave(this,save.ledger);
    this.actors=structuredClone(save.actors??[]);this.retiredActorIds=[...(save.retiredActorIds??[])];this.rewards={...save.rewards,rock:save.rewards?.rock??0,dirt:save.rewards?.dirt??0};
    this.recoveryRequired=false;this.publicationFailed=null;this.actorProducts.clear();
    this.chunks.clear();for(const chunk of patchChunkCoordinates()){const id=terrainChunkId(...chunk),mesh=meshTerrainChunk(chunk,this.edits);this.chunks.set(id,{id,chunk,contentRevision:this.revision,meshRevision:this.revision,colliderRevision:this.revision,mesh,collider:{positions:mesh.positions.slice(),indices:mesh.indices.slice(),revision:this.revision}});}return this;}
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
