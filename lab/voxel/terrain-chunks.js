// Bounded Phase 0.5D terrain patch. Integer lattice samples are authoritative;
// chunk snapshots copy a one-sample halo and never acquire matter ownership.
import { meshSurfaceNets } from './surface-nets.js';
import { composeMatterSample, SOURCE_PRECEDENCE } from './matter-composition.js';
import { analyzeTerrainMatterConnectivity, TERRAIN_CHUNK_CELLS, TERRAIN_CHUNK_SPACING, TerrainMatterLedger, TerrainMatterWindow, terrainParcelId } from './terrain-matter-window.js';
import { parcelBits, parcelMaterial, extractMatterIsland } from './matter-ownership.js';
import { analyzeMatterConnectivity } from './matter-connectivity.js';
import { emptyRockStructure } from './matter-structure.js';
import { createMatterActorFromResolvedSamples, mineActorMatter } from './matter-actor.js';
import { MATTER_MATERIAL } from './matter-material-policy.js';
import { classifyTerrainComponent, queryTerrainSupport, TERRAIN_COLLAPSE_POLICY } from './terrain-collapse.js';

export { TERRAIN_CHUNK_CELLS, TERRAIN_CHUNK_SPACING };

export const TERRAIN_PATCH_CHUNKS = 3;
export const TERRAIN_LEDGE_FIXTURE=Object.freeze({center:[0,6.2,9],halfExtents:[5.1,1.15,3.5],rootCenter:[6,5.2,9],chunkBoundary:[0,8]});
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
function roundedBoxDistance(point,center,half){
  const q=point.map((value,axis)=>Math.abs(value-center[axis])-half[axis]),outside=q.map(value=>Math.max(value,0));
  return Math.hypot(...outside)+Math.min(Math.max(...q),0);
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
  // One authored landform fixture for the localized-collapse experiment. It
  // is ordinary generated scalar terrain: the broad mixed shelf is attached
  // to the nearby hillside by a narrow dirt root, with a shallow air alcove
  // below it. Structural code receives only edited sample coordinates.
  const ledgeTop=6.72+.08*x+.045*(z-9),ledgeCenter=ledgeTop-1.2;
  const ledgeRock=roundedBoxDistance([x,y,z],[0,ledgeCenter,9],[5.1,1.15,3.5]);
  if(ledgeRock<0)resolved={density:ledgeRock,material:MATERIAL_ROCK};
  const ledgeSoil=Math.max(Math.abs(x)-4.9,Math.abs(z-9)-3.25,ledgeTop-y,y-(ledgeTop+.38));
  if(ledgeSoil<0)resolved={density:ledgeSoil,material:MATERIAL_DIRT};
  const underLedge=((x)/5.3)**2+((y-4.4)/1.65)**2+((z-9)/3.55)**2;
  if(underLedge<1)resolved={density:.12*(1-Math.sqrt(underLedge)),material:MATERIAL_AIR};
  const undercut=roundedBoxDistance([x,y,z],[0,4.85,9],[6,1.3,4.1]);
  if(undercut<0)resolved={density:Math.max(.08,-undercut),material:MATERIAL_AIR};
  const shelfSupport=Math.max(Math.abs(x)-5.0,Math.abs(z-9)-3.3,Math.abs(y-5.8)-.3);
  if(shelfSupport<0)resolved={density:shelfSupport,material:MATERIAL_DIRT};
  const rootTop=6.3-.2*(x-6.8),root=Math.max(Math.abs(x-6.8)-1.3,Math.abs(z-9)-.7,Math.abs(y-(rootTop-1.5))-1.5);
  if(root<0)resolved={density:root,material:MATERIAL_DIRT};
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

const terrainComponentSupport=(components,selected)=>({status:'OK',components:components.map(component=>({...component,anchored:component!==selected}))});
function partitionTerrainComponent(window,components,selected){
  return extractMatterIsland(window,window,terrainComponentSupport(components,selected));
}
function makeTerrainActor(window,component,actorSamples,ledger,id,classification){
  const globalCells=component.cells.map(cell=>window.localToGlobal(cell)),cellMin=[0,1,2].map(axis=>Math.min(...globalCells.map(cell=>cell[axis]))),
    cellMax=[0,1,2].map(axis=>Math.max(...globalCells.map(cell=>cell[axis]))),sampleMin=cellMin.map(value=>value-1),sampleMax=cellMax.map(value=>value+2),
    size=sampleMax.map((value,axis)=>value-sampleMin[axis]+1),sample={size,spacing:TERRAIN_CHUNK_SPACING,min:[0,0,0],densities:new Float64Array(size[0]*size[1]*size[2]).fill(1),
      materials:new Uint8Array(size[0]*size[1]*size[2])};
  sample.index=([x,y,z])=>x+size[0]*(y+size[1]*z);
  sample.readDensity=([x,y,z])=>x<0||y<0||z<0||x>=size[0]||y>=size[1]||z>=size[2]?1:sample.densities[sample.index([x,y,z])];
  sample.position=i=>[i%size[0],Math.floor(i/size[0])%size[1],Math.floor(i/(size[0]*size[1]))].map(v=>v*sample.spacing);
  if(size.map(v=>v-1).some((value,axis)=>value>TERRAIN_COLLAPSE_POLICY.maxActorIntervals[axis]))throw new Error('COLLAPSE_DEFERRED_OVERSIZE');
  for(let z=0;z<size[2];z++)for(let y=0;y<size[1];y++)for(let x=0;x<size[0];x++){
    const global=[x,y,z].map((v,axis)=>sampleMin[axis]+v);
    if(global.some((value,axis)=>value<window.globalMin[axis]||value>window.globalMax[axis]))continue;
    const local=window.globalToLocal(global),sourceIndex=window.index(local),targetIndex=x+size[0]*(y+size[1]*z),density=actorSamples.densities[sourceIndex];
    sample.densities[targetIndex]=density;sample.materials[targetIndex]=density<0?actorSamples.materials[sourceIndex]:0;
  }
  const localCells=globalCells.map(cell=>cell.map((value,axis)=>value-sampleMin[axis])),componentByGlobal=new Map(globalCells.map((cell,index)=>[pointKey(cell),index])),
    actorComponent={...component,cells:localCells,fragments:component.fragments.map(fragment=>({...fragment,cells:fragment.cells.map(cell=>window.localToGlobal(cell).map((value,axis)=>value-sampleMin[axis]))}))},
    actorMaterial=classification.materials.length>1?MATTER_MATERIAL.MIXED:classification.materials[0]==='dirt'?MATTER_MATERIAL.DIRT:MATTER_MATERIAL.ROCK,
    origin=sampleMin.map(value=>value*TERRAIN_CHUNK_SPACING),actor=createMatterActorFromResolvedSamples({id,sample,component:actorComponent,position:origin,
      structure:actorMaterial===MATTER_MATERIAL.DIRT?null:emptyRockStructure(),material:actorMaterial});
  actor.parcelIds={};actor.parcelMaterials={};const transfer=[];let materialCounts={rock:0,dirt:0},materialLabelDriftProbes=0;
  for(const [globalText,index] of componentByGlobal){const global=globalText.split(',').map(Number),local=window.globalToLocal(global),actorCell=global.map((value,axis)=>value-sampleMin[axis]),bits=parcelBits(window,local);
    for(let probe=0;probe<8;probe++)if(bits[probe]){
      const material=ledger.materialAt(global,probe);if(material!==MATERIAL_ROCK&&material!==MATERIAL_DIRT)throw new Error(`Unsupported ledger material in terrain component ${material}`);
      if(ledger.owner(global,probe)!=='WORLD')throw new Error(`Terrain component parcel is not WORLD-owned: ${terrainParcelId(global,probe)}`);
      const localKey=`${actorCell.join(',')}:${probe}`,parcel=terrainParcelId(global,probe);
      if(actor.parcelIds[localKey])throw new Error(`Duplicate actor parcel address ${localKey}`);
      actor.parcelIds[localKey]=parcel;actor.parcelMaterials[localKey]=material;transfer.push(parcel);materialCounts[material===MATERIAL_ROCK?'rock':'dirt']++;
      const actorBits=parcelBits(sample,actorCell),actorMaterial=parcelMaterial(sample,actorCell,probe);
      if(!actorBits[probe])throw new Error(`Actor sample frame lost occupied parcel ${parcel}`);
      if(actorMaterial!==material)materialLabelDriftProbes++;
    }
  }
  if(!transfer.length||transfer.length>classification.occupiedProbes||transfer.length!==classification.occupiedProbes)
    throw new Error('Terrain component probe transfer is incomplete');
  const actorConnectivity=analyzeMatterConnectivity(sample,{anchor:()=>false,identityForCell:()=> 'matter',canConnect:()=>true});
  if(actorConnectivity.status!=='OK'||actorConnectivity.components.length!==1)throw new Error('Terrain extraction did not produce one connected MatterActor');
  if(materialCounts.rock!==classification.materialProbes.rock||materialCounts.dirt!==classification.materialProbes.dirt)throw new Error('Actor material ledger differs from resolved component');
  ledger.transfer(transfer,id);actor.transferredParcelCount=transfer.length;actor.contentRevision=1;actor.materialLabelDriftProbes=materialLabelDriftProbes;
  actor.terrainComponentBounds={globalMin:cellMin,globalMax:cellMax,globalDimensions:classification.dimensions};
  if(classification.kind.startsWith('transient-'))actor.transientMatter=true;
  return {actor,transfer,globalCells,actorConnectivity,materialLabelDriftProbes};
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
    const transactionStartedAt=this.now(),directEditStarted=transactionStartedAt,nextEdits=cloneMap(this.edits),samples=[];
    for(const item of changedSamples){const p=item.point??item,density=item.density??1;
      if(!terrainSampleInsidePatch(p))return {status:'OUT_OF_PATCH',revision:this.revision};
      if(!Number.isFinite(density)||!Number.isSafeInteger(Math.round(density*1000000)))return {status:'INVALID_SAMPLE',revision:this.revision};
      const old=generateTerrainSample(p,nextEdits),material=density<0?(item.material??old.material):0;
      if(!Number.isFinite(density)||!Number.isSafeInteger(Math.round(density*1000000))||density<=old.density)continue;
      nextEdits.set(pointKey(p),{density,material});samples.push([...p]);}
    if(!samples.length)return {status:'EMPTY',revision:this.revision};
    let nextLedger,consumedParcelIds=[],directConsumedParcelIds=[],collapseConsumedParcelIds=[],actors=structuredClone(this.actors),actorDirtyIds=[],supportEvidence=null,postTransferDirtCells=0,
      directSamples=[],collapseWriteSamples=[],timings={directEditMs:0,supportMs:0,classificationMs:0,extractionMs:0},
      collapseEvidence={candidateCount:0,persistentCount:0,transientCount:0,crumbleCount:0,deferredCount:0,components:[],status:'NO_CANDIDATE'};
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
          if(owner==='WORLD'){nextLedger.consume([id]);consumedParcelIds.push(id);directConsumedParcelIds.push(id);}
          else if(owner!==null)throw new Error(`Terrain edit attempted to remove non-WORLD parcel ${id}`);
        }
      }
          nextLedger.assertBalanced();nextLedger.assertActorParcelMaps(actors);
      directSamples=[...new Map(samples.map(point=>[pointKey(point),point])).values()];timings.directEditMs=this.now()-directEditStarted;const readChunks=new Set(),supportQueries=[];
      supportEvidence={seedCells:[],initialBounds:null,finalBounds:null,expansions:0,sampleCount:0,cellCount:0,bondCount:0,workUnits:0,
        readChunkIds:[],status:'NOT_RUN',queries:supportQueries,componentCount:0,rockSupported:true,extractedComponents:0,
        transferredRockParcels:0,transferredDirtParcels:0,postTransferWorkUnits:0,postTransferDirtConsumed:0};
      let queuedSamples=directSamples,stabilizationSeeds=[],changedByCollapse=false,passes=0,lastCandidates=[],actorsGenerated=0;
      for(let pass=0;pass<TERRAIN_COLLAPSE_POLICY.maxStabilizationPasses&&queuedSamples.length;pass++){
        passes=pass+1;
        const supportStarted=this.now(),field={read:point=>generateTerrainSample(point,nextEdits)},query=this.failAt==='support-analysis'||this.failAt==='support-incomplete'?
          {status:'DEFERRED_UNKNOWN_SUPPORT',reason:'Injected incomplete support evidence',seedCells:[],initialBounds:null,finalBounds:null,expansions:0,
            sampleCount:0,cellCount:0,bondCount:0,workUnits:0,readChunkIds:[],candidateComponents:[]}:
          queryTerrainSupport(field,queuedSamples,{margin:pass===0?TERRAIN_COLLAPSE_POLICY.initialMargin:0});
        timings.supportMs+=this.now()-supportStarted;
        if(!supportEvidence.seedCells.length)supportEvidence.seedCells=query.seedCells??[];
        if(supportEvidence.initialBounds===null)supportEvidence.initialBounds=query.initialBounds??null;
        supportEvidence.finalBounds=query.finalBounds??supportEvidence.finalBounds;
        supportEvidence.expansions+=query.expansions??0;supportEvidence.sampleCount+=query.sampleCount??0;
        supportEvidence.cellCount+=query.cellCount??0;supportEvidence.bondCount+=query.bondCount??0;supportEvidence.workUnits+=query.workUnits??0;
        if(pass>0)supportEvidence.postTransferWorkUnits+=query.workUnits??0;
        for(const chunkId of query.readChunkIds??[])readChunks.add(chunkId);
        supportEvidence.componentCount=query.componentCount??supportEvidence.componentCount;
        const queryRecord={pass,initialBounds:query.initialBounds??null,finalBounds:query.finalBounds??null,expansions:query.expansions??0,
          sampleCount:query.sampleCount??0,cellCount:query.cellCount??0,bondCount:query.bondCount??0,workUnits:query.workUnits??0,
          readChunkIds:query.readChunkIds??[],expansionHistory:query.expansionHistory??[],status:query.status,reason:query.reason??null,candidateCount:query.candidateComponents?.length??0};
        supportQueries.push(queryRecord);
        if(query.status!=='COMPLETE'){
          supportEvidence.status='DEFERRED_UNKNOWN_SUPPORT';supportEvidence.reason=query.reason??'incomplete local support evidence';
          collapseEvidence.status='DEFERRED_UNKNOWN_SUPPORT';collapseEvidence.deferredCount++;break;
        }
        if(supportEvidence.sampleCount>TERRAIN_COLLAPSE_POLICY.maxEditSamples||supportEvidence.workUnits>TERRAIN_COLLAPSE_POLICY.maxEditWorkUnits){
          supportEvidence.status='DEFERRED_UNKNOWN_SUPPORT';supportEvidence.reason='per-edit structural work budget';
          collapseEvidence.status='DEFERRED_UNKNOWN_SUPPORT';collapseEvidence.deferredCount++;break;
        }
        const candidates=query.candidateComponents??[];lastCandidates=candidates;
        stabilizationSeeds=candidates.flatMap(component=>component.cells.map(local=>query.window.localToGlobal(local)));
        supportEvidence.rockSupported&&=!candidates.some(component=>component.fragments.some(fragment=>fragment.id==='ROCK'));
        collapseEvidence.candidateCount+=candidates.length;
        if(!candidates.length){supportEvidence.status='COMPLETE';if(collapseEvidence.status==='NO_CANDIDATE')collapseEvidence.status='COMPLETE';break;}
        let processed=false;
        for(const component of candidates){
          const classificationStarted=this.now(),classification=classifyTerrainComponent(query.window,component,
            {materialAt:(global,probe)=>nextLedger.materialAt(global,probe)});
          timings.classificationMs+=this.now()-classificationStarted;
          const componentEvidence={componentBounds:{globalMin:query.window.localToGlobal(classification.min),globalMax:query.window.localToGlobal(classification.max),
            dimensions:classification.dimensions,actorIntervals:classification.actorIntervals},materials:classification.materials,
            materialProbes:classification.materialProbes,occupiedProbes:classification.occupiedProbes,kind:classification.kind};
          collapseEvidence.components.push(componentEvidence);
          if(classification.kind==='deferred-oversize'){
            collapseEvidence.deferredCount++;collapseEvidence.status='COLLAPSE_DEFERRED_OVERSIZE';continue;
          }
          const persistent=classification.kind.startsWith('persistent-'),transient=classification.kind.startsWith('transient-')||classification.kind==='rock-debris';
          const ownedActors=actors.length;
          if(transient&&collapseEvidence.transientCount>=TERRAIN_COLLAPSE_POLICY.maxTransientFragmentsPerEdit){collapseEvidence.deferredCount++;collapseEvidence.status='COLLAPSE_DEFERRED_ACTOR_LIMIT';continue;}
          if((persistent||transient)&&(actorsGenerated>=TERRAIN_COLLAPSE_POLICY.maxActorsPerEdit||ownedActors>=TERRAIN_COLLAPSE_POLICY.maxTotalActors)){
            collapseEvidence.deferredCount++;collapseEvidence.status='COLLAPSE_DEFERRED_ACTOR_LIMIT';continue;
          }
          const partition=partitionTerrainComponent(query.window,query.result.components,component);
          if(partition.status!=='OK'){
            collapseEvidence.deferredCount++;collapseEvidence.status='DEFERRED_UNKNOWN_SUPPORT';supportEvidence.status='DEFERRED_UNKNOWN_SUPPORT';
            supportEvidence.reason=partition.reason??'component partition incomplete';continue;
          }
          const transfer=[];
          for(const local of component.cells){const global=query.window.localToGlobal(local),bits=parcelBits(query.window,local);
            for(let probe=0;probe<8;probe++)if(bits[probe]){
              if(nextLedger.owner(global,probe)!=='WORLD')throw new Error(`Unsupported component is not WORLD-owned: ${terrainParcelId(global,probe)}`);
              transfer.push(terrainParcelId(global,probe));
            }
          }
          if(transfer.length!==classification.occupiedProbes)throw new Error('Component parcel count changed before extraction');
          const worldChanges=[];
          for(let i=0;i<partition.world.densities.length;i++){
            const density=partition.world.densities[i],material=density<0?partition.world.materials[i]:MATERIAL_AIR;
            if(density===query.window.densities[i]&&material===query.window.materials[i])continue;
            const point=query.window.positionGlobalAt(i);
            if(!terrainSampleInsidePatch(point))throw new Error('Collapse partition attempted to edit read-only patch halo');
            worldChanges.push({point,density,material});
          }
          if(!worldChanges.length)throw new Error('Unsupported component extraction produced no world tombstones');
          let extractedActor=null;
          if(persistent||transient){
            if(this.failAt==='actor-construction')throw new Error('Injected collapse actor construction failure');
            if(this.failAt==='parcel-transfer'||this.failAt==='ownership-transfer')throw new Error('Injected collapse parcel transfer validation failure');
            const extractionStarted=this.now(),actorId=`terrain-matter-${this.revision+1}-${actors.length}`,
              made=makeTerrainActor(query.window,component,partition.actor,nextLedger,actorId,classification);
            timings.extractionMs+=this.now()-extractionStarted;
            extractedActor=made.actor;actors.push(extractedActor);actorsGenerated++;actorDirtyIds.push(actorId);
            componentEvidence.actorId=actorId;componentEvidence.transferredParcelCounts={...classification.materialProbes};
            componentEvidence.materialLabelDriftProbes=made.materialLabelDriftProbes;
            if(transient)collapseEvidence.transientCount++;else collapseEvidence.persistentCount++;
            supportEvidence.extractedComponents++;
            supportEvidence.transferredRockParcels+=classification.materialProbes.rock;
            supportEvidence.transferredDirtParcels+=classification.materialProbes.dirt;
          }else{
            if(this.failAt==='parcel-transfer'||this.failAt==='ownership-transfer')throw new Error('Injected collapse parcel transfer validation failure');
            nextLedger.consume(transfer);consumedParcelIds.push(...transfer);collapseConsumedParcelIds.push(...transfer);
            if(classification.kind==='crumble'||classification.kind==='rock-debris')collapseEvidence.crumbleCount++;
            if(changedByCollapse)postTransferDirtCells+=classification.materialProbes.dirt;
          }
          for(const change of worldChanges){const address=pointKey(change.point);nextEdits.set(address,{density:change.density,material:change.material});
            collapseWriteSamples.push(change.point);samples.push(change.point);}
          supportEvidence.status='COMPLETE';collapseEvidence.status='COMPLETE';changedByCollapse=true;processed=true;
          break;
        }
        if(!processed){if(supportEvidence.status==='NOT_RUN')supportEvidence.status='COMPLETE';break;}
        queuedSamples=[...new Map(stabilizationSeeds.map(point=>[pointKey(point),point])).values()];
        if(pass===TERRAIN_COLLAPSE_POLICY.maxStabilizationPasses-1&&lastCandidates.length){
          supportEvidence.status='COLLAPSE_DEFERRED_CASCADE_LIMIT';collapseEvidence.status='COLLAPSE_DEFERRED_CASCADE_LIMIT';collapseEvidence.deferredCount++;
        }
      }
      supportEvidence.readChunkIds=[...readChunks].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
      supportEvidence.stabilizationPasses=passes;supportEvidence.totalWorkUnits=supportEvidence.workUnits;
      supportEvidence.postTransferDirtConsumed=postTransferDirtCells;
      Object.assign(supportEvidence,{directEditMs:timings.directEditMs,supportMs:timings.supportMs,
        classificationMs:timings.classificationMs,extractionMs:timings.extractionMs});
      if(changedByCollapse&&collapseEvidence.status==='NO_CANDIDATE')collapseEvidence.status='COMPLETE';
      nextLedger.assertBalanced();nextLedger.assertActorParcelMaps(actors);
    }catch(error){return {status:'OWNERSHIP',revision:this.revision,error:error.message};}
    const nextRevision=this.revision+1,directChangedSamples=[...new Map(directSamples.map(p=>[pointKey(p),p])).values()],
      collapseChangedSamples=[...new Map(collapseWriteSamples.map(p=>[pointKey(p),p])).values()],uniqueSamples=[...new Map(samples.map(p=>[pointKey(p),p])).values()],
      directDirtyChunkIds=dirtyChunksForSamples(directChangedSamples).filter(id=>patchIds.has(id)),collapseDirtyChunkIds=dirtyChunksForSamples(collapseChangedSamples).filter(id=>patchIds.has(id)),
      dirtyChunkIds=dirtyChunksForSamples(uniqueSamples).filter(id=>patchIds.has(id)),unchangedChunkIds=[...this.chunks.keys()].filter(id=>!dirtyChunkIds.includes(id)),rewards={...this.rewards};
    for(const id of directConsumedParcelIds){const material=nextLedger.materials[parcelLedgerIndex(id)];rewards[material===MATERIAL_ROCK?'rock':'dirt']++;}
    return {status:'PREPARED_INPUT',baseRevision:this.revision,nextRevision,transactionStartedAt,nextEdits,nextLedger,actors,retiredActorIds:[...this.retiredActorIds],rewards,
      actorDirtyIds,actorRetiredIds:[],consumedParcelIds,directConsumedParcelIds,collapseConsumedParcelIds,samples:uniqueSamples,directChangedSamples,collapseChangedSamples,
      directDirtyChunkIds,collapseDirtyChunkIds,dirtyChunkIds,unchangedChunkIds,supportEvidence,collapseEvidence,postTransferDirtCells};
  }
  async publishEdit(proposal) {
    if(this.recoveryRequired)return {status:'RECOVERY_REQUIRED',revision:this.revision};
    if(proposal?.status!=='PREPARED_INPUT')return proposal;
    if(proposal.baseRevision!==this.revision)return {status:'STALE',revision:this.revision};
    const publicationStartedAt=this.now(),products=new Map(),actorProducts=new Map(),meshMs={},colliderMs={},actorPrepMs={};
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
        const actorStarted=this.now(),prepared=await this.prepareActorProduct(actor,proposal.nextRevision);actorPrepMs[id]=this.now()-actorStarted;
        if(this.failAt==='actor-collider'){this.discardActorProduct(prepared);throw new Error(`Injected actor collider preparation failure: ${id}`);}
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
      const publicationMs=this.now()-publicationStartedAt,transactionMs=this.now()-(proposal.transactionStartedAt??publicationStartedAt);
      const event={worldRevision:this.revision,changedSampleCount:proposal.samples.length,changedSamples:proposal.samples.map(p=>[...p]),consumedParcelIds:[...proposal.consumedParcelIds],
        directConsumedParcelIds:[...(proposal.directConsumedParcelIds??[])],collapseConsumedParcelIds:[...(proposal.collapseConsumedParcelIds??[])],
        directChangedSamples:proposal.directChangedSamples?.map(p=>[...p])??[],collapseChangedSamples:proposal.collapseChangedSamples?.map(p=>[...p])??[],
        directDirtyChunkIds:proposal.directDirtyChunkIds??[],collapseDirtyChunkIds:proposal.collapseDirtyChunkIds??[],finalDirtyChunkIds:proposal.dirtyChunkIds,
        dirtyChunkIds:proposal.dirtyChunkIds,remeshedChunkIds:[...products.keys()],rebuiltColliderChunkIds:[...products.keys()],unchangedChunkIds:proposal.unchangedChunkIds,
        preparedActorIds:[...actorProducts.keys()],reusedActorIds:this.actors.map(a=>a.id).filter(id=>!actorProducts.has(id)),retiredActorIds:[...(proposal.actorRetiredIds??[])],supportEvidence:proposal.supportEvidence,
        collapseEvidence:proposal.collapseEvidence,actorMining:proposal.actorMining,postTransferDirtCells:proposal.postTransferDirtCells,
        ledger:this.ledger.audit(),timings:{directEditMs:proposal.supportEvidence?.directEditMs??null,supportMs:proposal.supportEvidence?.supportMs??null,
          classificationMs:proposal.supportEvidence?.classificationMs??null,extractionMs:proposal.supportEvidence?.extractionMs??null,
          meshMs,colliderMs,actorPrepMs,persistenceMs,publicationMs,transactionMs},meshMs,colliderMs,actorPrepMs,persistenceMs,publicationMs,transactionMs};
      this.history.push(event);if(this.history.length>32)this.history.shift();return {status:'COMMITTED',event};
    }catch(error){for(const product of products.values())try{this.discardProduct(product);}catch{/* preserve transaction failure */}
      for(const product of actorProducts.values())try{this.discardActorProduct(product);}catch{/* preserve transaction failure */}
      return {status:'REJECTED',revision:this.revision,error:error.message,recoveryRequired:this.recoveryRequired};}
  }
  async editSamples(changedSamples,options){return this.publishEdit(this.prepareEdit(changedSamples,options));}
  prepareActorMining(actorId,expectedContentRevision,localHit,{expectedRevision=this.revision,material=null}={}){
    if(this.recoveryRequired)return {status:'RECOVERY_REQUIRED',revision:this.revision};
    if(expectedRevision!==this.revision)return {status:'STALE',revision:this.revision};
    const actor=this.actors.find(value=>value.id===actorId);if(!actor||actor.contentRevision!==expectedContentRevision)return {status:'STALE',revision:this.revision};
    const transactionStartedAt=this.now();
    try{
      const actorOwnership=actor.parcelIds??{},keys=Object.keys(actorOwnership),ownership=Object.fromEntries(keys.map(key=>[key,actorId])),
        parcelMaterials=Object.fromEntries(keys.map(key=>[key,actor.parcelMaterials?.[key]??MATERIAL_ROCK]));
      const matterState={version:'terrain-matter-actor-v1',revision:this.revision,spacing:TERRAIN_CHUNK_SPACING,initialQuantity:keys.length,materialId:actor.material,
        fixture:'rock-boulder',actors:[structuredClone(actor)],retired:[],fractureDebris:[],ownership,parcelMaterials,
        rewards:{stoneUnits:0,dirtUnits:0},events:{dugUnits:{rock:0,dirt:0},crumbledUnits:{rock:0,dirt:0}}};
      const mined=mineActorMatter(matterState,actorId,expectedContentRevision,localHit,{material});if(mined.status!=='OK')return {...mined,revision:this.revision};
      const nextLedger=TerrainMatterLedger.fromSave(this,this.ledger.exportSave()),consumedParcelIds=[];
      for(const key of keys){const globalId=actorOwnership[key],owner=mined.state.ownership[key];
        if(owner==='consumed'){nextLedger.consume([globalId],actorId);consumedParcelIds.push(globalId);}
        else if(owner&&owner!==actorId)nextLedger.transferFrom([globalId],actorId,owner);
      }
      const nextActors=mined.state.actors.map(value=>({...value,parcelIds:{},parcelMaterials:{}}));
      for(const [key,owner] of Object.entries(mined.state.ownership))if(owner!=='consumed'){
        const record=nextActors.find(value=>value.id===owner);if(record){record.parcelIds[key]=actorOwnership[key];record.parcelMaterials[key]=mined.state.parcelMaterials[key];}
      }
      const actorRetiredIds=mined.state.retired.filter(id=>this.actors.some(value=>value.id===id));
      const actorDirtyIds=nextActors.filter(value=>{const old=this.actors.find(existing=>existing.id===value.id);return !old||old.contentRevision!==value.contentRevision;}).map(value=>value.id);
      nextLedger.assertBalanced();nextLedger.assertActorParcelMaps(nextActors);
      const rewards={...this.rewards};for(const id of consumedParcelIds){const material=nextLedger.materials[parcelLedgerIndex(id)];rewards[material===MATERIAL_ROCK?'rock':'dirt']++;}
      return {status:'PREPARED_INPUT',baseRevision:this.revision,nextRevision:this.revision+1,transactionStartedAt,nextEdits:cloneMap(this.edits),nextLedger,actors:nextActors,
        retiredActorIds:[...new Set([...this.retiredActorIds,...mined.state.retired])],actorDirtyIds,actorRetiredIds,consumedParcelIds,samples:[],dirtyChunkIds:[],unchangedChunkIds:[...this.chunks.keys()],
        rewards,supportEvidence:null,actorMining:{actorId,material:mined.material??actor.material,stress:mined.stress,cut:mined.cut,
          fractureMetrics:mined.fractureMetrics,split:mined.split??false,children:mined.children??[],structuralComponents:mined.structuralComponents??null,
          retired:!!mined.retired,crumbledComponents:mined.crumbledComponents??[]}};
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
