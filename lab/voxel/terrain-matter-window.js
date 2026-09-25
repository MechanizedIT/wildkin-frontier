// Read-only bounded view of the authoritative global terrain lattice.
// It is an adapter for the C.1R scalar/support algorithms, never an owner.
import { parcelBits, parcelMaterial } from './matter-ownership.js';
import { analyzeMatterConnectivity } from './matter-connectivity.js';

export const TERRAIN_CHUNK_CELLS=16,TERRAIN_CHUNK_SPACING=.5;

const product = values => values.reduce((a,b)=>a*b,1);

export class TerrainMatterWindow {
  constructor(world,{min,max,maxIntervals=32}={}) {
    if(!world||typeof world.read!=='function'||!Array.isArray(min)||!Array.isArray(max)||min.length!==3||max.length!==3)
      throw new Error('TerrainMatterWindow needs a terrain reader and global bounds');
    if(!min.every(Number.isSafeInteger)||!max.every(Number.isSafeInteger)||min.some((v,i)=>max[i]<=v))
      throw new Error('Invalid terrain matter bounds');
    const size=max.map((v,i)=>v-min[i]+1);
    if(size.some(v=>v-1>maxIntervals))throw new Error('Terrain matter window exceeds bounded support intervals');
    const residentMin=[-16,0,-16],residentMax=[32,16,32];
    // The positive outer sample is the existing chunk snapshot's read-only
    // halo. It supplies cell corners but never enters physical ownership.
    if(min.some((v,i)=>v<residentMin[i])||max.some((v,i)=>v>residentMax[i]))throw new Error('Terrain matter bounds leave resident patch');
    this.world=world;this.globalMin=[...min];this.globalMax=[...max];this.min=min.map(v=>v*TERRAIN_CHUNK_SPACING);
    this.size=size;this.spacing=TERRAIN_CHUNK_SPACING;this.densities=new Float64Array(product(size));this.materials=new Uint8Array(product(size));
    this.workUnits=0;
    for(let z=0;z<size[2];z++)for(let y=0;y<size[1];y++)for(let x=0;x<size[0];x++){
      const global=this.localToGlobal([x,y,z]),value=world.read(global),i=this.index([x,y,z]);
      this.densities[i]=value.density;this.materials[i]=value.density<0?value.material:0;this.workUnits++;
    }
    this.readDensity=point=>{if(point.some((v,i)=>v<0||v>=this.size[i]))return 1;return this.densities[this.index(point)];};
    this.position=i=>[i%size[0],Math.floor(i/size[0])%size[1],Math.floor(i/(size[0]*size[1]))].map((v,a)=>this.min[a]+v*this.spacing);
    this.bounds={min:[...this.min],max:this.min.map((v,i)=>v+(size[i]-1)*this.spacing)};
    this.query={globalMin:[...min],globalMax:[...max],sampleCount:this.workUnits,cellWork:product(size.map(v=>v-1))};
  }
  index([x,y,z]){return x+this.size[0]*(y+this.size[1]*z);}
  globalToLocal(point){if(!Array.isArray(point)||point.length!==3||!point.every(Number.isSafeInteger))throw new Error('Invalid global sample');
    if(point.some((v,i)=>v<this.globalMin[i]||v>this.globalMax[i]))throw new Error('Global sample is outside matter window');return point.map((v,i)=>v-this.globalMin[i]);}
  localToGlobal(point){if(!Array.isArray(point)||point.length!==3||!point.every(Number.isSafeInteger)||point.some((v,i)=>v<0||v>=this.size[i]))throw new Error('Local sample is outside matter window');return point.map((v,i)=>v+this.globalMin[i]);}
  readGlobal(point){if(point.some((v,i)=>v<this.globalMin[i]||v>this.globalMax[i]))throw new Error('Global sample is outside matter window');return this.world.read(point);}
  refreshFromWorld(){for(let i=0;i<this.densities.length;i++){const value=this.world.read(this.positionGlobalAt(i));this.densities[i]=value.density;this.materials[i]=value.density<0?value.material:0;}this.workUnits+=this.densities.length;}
  positionGlobalAt(i){return this.localToGlobal([i%this.size[0],Math.floor(i/this.size[0])%this.size[1],Math.floor(i/(this.size[0]*this.size[1]))]);}
  knownCell([x,y,z]){return [x,y,z].every((v,i)=>Number.isSafeInteger(v)&&v>0&&v<this.size[i]-2);}
  snapshot(){
    const snapshot={min:[...this.min],globalMin:[...this.globalMin],globalMax:[...this.globalMax],size:[...this.size],spacing:this.spacing,
      densities:new Float64Array(this.densities),materials:new Uint8Array(this.materials),position:this.position};
    snapshot.readDensity=point=>point.some((v,i)=>v<0||v>=snapshot.size[i])?1:snapshot.densities[this.index(point)];return snapshot;}
  copyToWorldEdits(){const changes=[];for(let i=0;i<this.densities.length;i++){const p=this.positionGlobalAt(i),before=this.world.read(p),density=this.densities[i];
    if(density!==before.density||this.materials[i]!==before.material){if(p.some((v,a)=>v===this.globalMax[a]&&this.globalMax[a]===[32,16,32][a]))
        throw new Error(`Matter window attempted to edit read-only patch halo at ${p.join(',')}`);
      changes.push({point:p,density,material:this.materials[i]});}}return changes;}
}

export function analyzeTerrainMatterConnectivity(window,options={}){
  const {allowAnchoredEdgeComponents=false,...analysisOptions}=options,result=analyzeMatterConnectivity(window,analysisOptions);
  if(result.status!=='OK')return {...result,query:window.query};
  // Components already known to be anchored may continue beyond the local
  // window. An unsupported candidate touching an unknown edge is incomplete
  // evidence and must fail closed.
  const edgeComponent=result.components.find(component=>(!allowAnchoredEdgeComponents||!component.anchored)&&component.cells.some(point=>point.some((v,i)=>v<=0||v>=window.size[i]-2)));
  if(edgeComponent)return {status:'HOLD',reason:`nonresident occupied evidence at ${edgeComponent.cells.find(point=>point.some((v,i)=>v<=0||v>=window.size[i]-2)).join(',')}`,query:window.query};
  const workUnits=result.cellCount+result.bonds;if(workUnits>(options.maxWorkUnits??12288))return {status:'HOLD',reason:'terrain local support work cap',workUnits,query:window.query};
  return {...result,workUnits,query:window.query};
}

// C.1R's eight trilinear probes are the conserved physical units. Chunk halos
// never enter this table: each cell lower endpoint has one global coordinate.
export const TERRAIN_OWNER=Object.freeze({WORLD:1,CONSUMED:2});
const patchCellMin=[-TERRAIN_CHUNK_CELLS,0,-TERRAIN_CHUNK_CELLS];
const patchCellSize=[TERRAIN_CHUNK_CELLS*3,TERRAIN_CHUNK_CELLS,TERRAIN_CHUNK_CELLS*3];
const probeCount=8;
const cellIndex=([x,y,z])=>{const lx=x-patchCellMin[0],ly=y-patchCellMin[1],lz=z-patchCellMin[2];
  if(lx<0||ly<0||lz<0||lx>=patchCellSize[0]||ly>=patchCellSize[1]||lz>=patchCellSize[2])throw new Error('Global parcel cell is outside resident patch');
  return lx+patchCellSize[0]*(ly+patchCellSize[1]*lz);};

export function terrainParcelId(globalCell,probe){
  if(!Array.isArray(globalCell)||globalCell.length!==3||!globalCell.every(Number.isSafeInteger)||!Number.isSafeInteger(probe)||probe<0||probe>=probeCount)
    throw new Error('Invalid global parcel address');
  cellIndex(globalCell);return `${globalCell[0]},${globalCell[1]},${globalCell[2]}:${probe}`;
}
export function parseTerrainParcelId(id){const match=/^(-?\d+),(-?\d+),(-?\d+):([0-7])$/.exec(id);if(!match)throw new Error('Invalid global parcel ID');
  const cell=match.slice(1,4).map(Number),probe=Number(match[4]);terrainParcelId(cell,probe);return {cell,probe};}
export class TerrainMatterLedger {
  constructor(world){
    if(world?.revision!==0||world?.edits?.size)throw new Error('Matter ledger must initialize from the pristine procedural patch');
    const min=[-16,0,-16],max=[32,16,32],window=new TerrainMatterWindow(world,{min,max,maxIntervals:48});
    this.ownerIds=new Uint8Array(product(patchCellSize)*probeCount);this.materials=new Uint8Array(this.ownerIds.length);
    this.ownerNames=new Map([[TERRAIN_OWNER.WORLD,'WORLD'],[TERRAIN_OWNER.CONSUMED,'CONSUMED']]);this.actorOwnerIds=new Map();this.nextOwnerId=3;
    this.initial={rock:0,dirt:0};this.windowBounds={min,max};
    for(let z=0;z<patchCellSize[2];z++)for(let y=0;y<patchCellSize[1];y++)for(let x=0;x<patchCellSize[0];x++){
      const local=[x,y,z],global=local.map((v,i)=>v+patchCellMin[i]),bits=parcelBits(window,local),index=cellIndex(global)*probeCount;
      for(let probe=0;probe<probeCount;probe++)if(bits[probe]){const material=parcelMaterial(window,local,probe);if(material!==1&&material!==2)continue;
        this.ownerIds[index+probe]=TERRAIN_OWNER.WORLD;this.materials[index+probe]=material;this.initial[material===1?'rock':'dirt']++;}
    }
  }
  owner(globalCell,probe){return this.ownerNames.get(this.ownerIds[cellIndex(globalCell)*probeCount+probe])??null;}
  transfer(ids,actorId){if(!actorId||actorId==='WORLD'||actorId==='CONSUMED'||!Array.isArray(ids)||!ids.length)throw new Error('Invalid parcel transfer');
    const addresses=ids.map(parseTerrainParcelId);if(new Set(ids).size!==ids.length)throw new Error('Duplicate parcel in transfer');
    const ownerId=this.actorOwnerIds.get(actorId)??this.nextOwnerId;if(ownerId>255)throw new Error('Actor owner table exhausted');
    if(addresses.some(({cell,probe})=>this.owner(cell,probe)!=='WORLD'))throw new Error('Parcel transfer requires WORLD ownership');
    this.actorOwnerIds.set(actorId,ownerId);this.ownerNames.set(ownerId,actorId);this.nextOwnerId=ownerId===this.nextOwnerId?ownerId+1:this.nextOwnerId;
    for(const {cell,probe} of addresses)this.ownerIds[cellIndex(cell)*probeCount+probe]=ownerId;
    this.assertBalanced();return addresses.length;
  }
  transferFrom(ids,expectedOwner,actorId){if(!expectedOwner||!actorId||expectedOwner===actorId||actorId==='WORLD'||actorId==='CONSUMED'||!Array.isArray(ids)||!ids.length)
      throw new Error('Invalid owned parcel transfer');
    const addresses=ids.map(parseTerrainParcelId);if(new Set(ids).size!==ids.length)throw new Error('Duplicate parcel in transfer');
    if(addresses.some(({cell,probe})=>this.owner(cell,probe)!==expectedOwner))throw new Error('Parcel transfer owner mismatch');
    const ownerId=this.actorOwnerIds.get(actorId)??this.nextOwnerId;if(ownerId>255)throw new Error('Actor owner table exhausted');
    this.actorOwnerIds.set(actorId,ownerId);this.ownerNames.set(ownerId,actorId);this.nextOwnerId=ownerId===this.nextOwnerId?ownerId+1:this.nextOwnerId;
    for(const {cell,probe} of addresses)this.ownerIds[cellIndex(cell)*probeCount+probe]=ownerId;
    this.assertBalanced();return addresses.length;
  }
  consume(ids,expectedOwner='WORLD'){const addresses=ids.map(parseTerrainParcelId);if(new Set(ids).size!==ids.length)throw new Error('Duplicate parcel in consumption');
    if(addresses.some(({cell,probe})=>this.owner(cell,probe)!==expectedOwner))throw new Error('Parcel consumption owner mismatch');
    for(const {cell,probe} of addresses)this.ownerIds[cellIndex(cell)*probeCount+probe]=TERRAIN_OWNER.CONSUMED;this.assertBalanced();return addresses.length;}
  audit(){const result={rock:{initial:this.initial.rock,world:0,actors:0,consumed:0},dirt:{initial:this.initial.dirt,world:0,actors:0,consumed:0}};
    for(let i=0;i<this.ownerIds.length;i++)if(this.ownerIds[i]){const record=this.materials[i]===1?result.rock:result.dirt,owner=this.ownerIds[i];
      if(owner===TERRAIN_OWNER.WORLD)record.world++;else if(owner===TERRAIN_OWNER.CONSUMED)record.consumed++;else record.actors++;}
    return result;}
  assertBalanced(){const a=this.audit();for(const material of ['rock','dirt'])if(a[material].initial!==a[material].world+a[material].actors+a[material].consumed)throw new Error(`${material} parcel ledger is unbalanced`);return a;}
  exportSave(){return {version:1,initial:{...this.initial},ownerIds:Array.from(this.ownerIds),materials:Array.from(this.materials),
    ownerNames:Object.fromEntries(this.ownerNames),actorOwnerIds:Object.fromEntries(this.actorOwnerIds),nextOwnerId:this.nextOwnerId};}
  static fromSave(_world,save){
    if(save?.version!==1||!Array.isArray(save.ownerIds)||!Array.isArray(save.materials)||save.ownerIds.length!==product(patchCellSize)*probeCount||
      save.materials.length!==save.ownerIds.length||save.ownerIds.some(v=>!Number.isSafeInteger(v)||v<0||v>255)||
      save.materials.some(v=>!Number.isSafeInteger(v)||v<0||v>2)||!Number.isSafeInteger(save.nextOwnerId)||save.nextOwnerId<3||save.nextOwnerId>256||
      !Number.isSafeInteger(save.initial?.rock)||save.initial.rock<0||!Number.isSafeInteger(save.initial?.dirt)||save.initial.dirt<0)
      throw new Error('Invalid terrain matter ledger save');
    const ledger=Object.create(TerrainMatterLedger.prototype);ledger.ownerIds=Uint8Array.from(save.ownerIds);ledger.materials=Uint8Array.from(save.materials);
    ledger.ownerNames=new Map(Object.entries(save.ownerNames??{}).map(([id,name])=>[Number(id),name]));ledger.actorOwnerIds=new Map(Object.entries(save.actorOwnerIds??{}));
    ledger.nextOwnerId=save.nextOwnerId;ledger.initial={rock:save.initial?.rock,dirt:save.initial?.dirt};ledger.windowBounds={min:[-16,0,-16],max:[32,16,32]};
    if(ledger.ownerNames.get(TERRAIN_OWNER.WORLD)!=='WORLD'||ledger.ownerNames.get(TERRAIN_OWNER.CONSUMED)!=='CONSUMED'||
      [...ledger.ownerNames].some(([id,name])=>!Number.isSafeInteger(id)||id<1||id>255||typeof name!=='string'||!name)||
      [...ledger.ownerIds].some((owner,i)=>owner>2&&!ledger.ownerNames.has(owner)||owner>2&&(ledger.ownerNames.get(owner)==='WORLD'||ledger.ownerNames.get(owner)==='CONSUMED')||
      (owner===0)!==(ledger.materials[i]===0)||owner>0&&![1,2].includes(ledger.materials[i])))throw new Error('Corrupt terrain matter ledger owners');
    const audit=ledger.assertBalanced();if(Object.values(audit).some(value=>Object.values(value).some(n=>!Number.isSafeInteger(n)||n<0)))throw new Error('Corrupt terrain matter ledger totals');
    for(const [actorId,ownerId] of ledger.actorOwnerIds)if(!actorId||actorId==='WORLD'||actorId==='CONSUMED'||ledger.ownerNames.get(ownerId)!==actorId||!Number.isSafeInteger(ownerId)||ownerId<3||ownerId>255)
      throw new Error('Corrupt terrain matter actor owner map');
    for(const [ownerId,actorId] of ledger.ownerNames)if(ownerId>2&&ledger.actorOwnerIds.get(actorId)!==ownerId)throw new Error('Unreferenced terrain matter actor owner');
    if(ledger.nextOwnerId<=Math.max(2,...ledger.actorOwnerIds.values()))throw new Error('Terrain matter next owner ID is already allocated');
    return ledger;
  }
  get byteLength(){return this.ownerIds.byteLength+this.materials.byteLength;}
}
