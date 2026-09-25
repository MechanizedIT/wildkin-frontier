import { parcelBits, parcelMaterial } from './matter-ownership.js';
import { analyzeTerrainMatterConnectivity, TerrainMatterWindow, TERRAIN_CHUNK_CELLS } from './terrain-matter-window.js';

const CELL_MIN=[-16,0,-16],CELL_MAX=[32,16,32];
const SAMPLE_MIN=[-16,0,-16],SAMPLE_MAX=[32,16,32];
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
const product=values=>values.reduce((a,b)=>a*b,1);
const key=point=>point.join(',');
const floorDiv=(value,divisor)=>Math.floor(value/divisor);

// Explicit experiment ceilings. These bound both normal support checks and
// pathological candidate components without changing the D.1 chunk model.
export const TERRAIN_COLLAPSE_POLICY=Object.freeze({
  initialMargin:4,
  expansionStep:2,
  maxExpansions:10,
  maxIntervals:[28,16,28],
  maxSamples:90000,
  maxCells:42000,
  maxBonds:95000,
  maxWorkUnits:160000,
  maxEditSamples:180000,
  maxEditWorkUnits:320000,
  maxStabilizationPasses:4,
  maxActorsPerEdit:3,
  maxTotalActors:4,
  maxTransientFragmentsPerEdit:4,
  maxActorIntervals:[28,20,28],
  maxActorParcels:8192,
  tinyDirtMaxProbes:15,
  transientDirtMaxProbes:127,
  tinyRockMaxProbes:23,
  transientRockMaxProbes:95,
});

function normalizeChanged(changedSamples){return changedSamples.map(item=>Array.isArray(item)?item:item.point);}

export function deriveTerrainStructuralSeeds(changedSamples){
  const cells=new Map();
  for(const sample of normalizeChanged(changedSamples)){
    if(!Array.isArray(sample)||sample.length!==3||!sample.every(Number.isSafeInteger))continue;
    for(let dz=-1;dz<=0;dz++)for(let dy=-1;dy<=0;dy++)for(let dx=-1;dx<=0;dx++){
      const cell=[sample[0]+dx,sample[1]+dy,sample[2]+dz];
      if(cell.every((value,axis)=>value>=CELL_MIN[axis]&&value<CELL_MAX[axis]))cells.set(key(cell),cell);
    }
  }
  const seeds=[...cells.values()].sort((a,b)=>a[2]-b[2]||a[1]-b[1]||a[0]-b[0]);
  if(!seeds.length)return {seedCells:[],seedBounds:null};
  return {seedCells:seeds,seedBounds:{min:[0,1,2].map(axis=>Math.min(...seeds.map(point=>point[axis]))),
    max:[0,1,2].map(axis=>Math.max(...seeds.map(point=>point[axis])))} };
}

function initialBounds(seedBounds,margin){
  return {min:seedBounds.min.map((value,axis)=>axis===1?SAMPLE_MIN[axis]:clamp(value-margin,SAMPLE_MIN[axis],SAMPLE_MAX[axis]-1)),
    max:seedBounds.max.map((value,axis)=>clamp(value+1+margin,SAMPLE_MIN[axis]+1,SAMPLE_MAX[axis]))};
}

function growBounds(bounds,boundary,policy){
  const min=[...bounds.min],max=[...bounds.max];
  for(let axis=0;axis<3;axis++){
    if(boundary.axes[axis]<0)min[axis]=Math.max(SAMPLE_MIN[axis],min[axis]-policy.expansionStep);
    if(boundary.axes[axis]>0)max[axis]=Math.min(SAMPLE_MAX[axis],max[axis]+policy.expansionStep);
  }
  return {min,max};
}

function readChunkIds(bounds){
  const ids=new Set(),resident=new Set();for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++)resident.add(`${x},0,${z}`);
  for(let z=floorDiv(bounds.min[2],TERRAIN_CHUNK_CELLS);z<=floorDiv(bounds.max[2]-1,TERRAIN_CHUNK_CELLS);z++)
    for(let y=floorDiv(bounds.min[1],TERRAIN_CHUNK_CELLS);y<=floorDiv(bounds.max[1]-1,TERRAIN_CHUNK_CELLS);y++)
      for(let x=floorDiv(bounds.min[0],TERRAIN_CHUNK_CELLS);x<=floorDiv(bounds.max[0]-1,TERRAIN_CHUNK_CELLS);x++)if(resident.has(`${x},${y},${z}`))ids.add(`${x},${y},${z}`);
  return [...ids].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
}

function touchesSeeds(component,window,seeds){
  const localSeeds=new Set();
  for(const cell of seeds)for(let dz=-1;dz<=1;dz++)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const global=[cell[0]+dx,cell[1]+dy,cell[2]+dz];
    if(global.every((value,axis)=>value>=window.globalMin[axis]&&value<window.globalMax[axis]))localSeeds.add(key(global));
  }
  return component.cells.some(local=>localSeeds.has(key(window.localToGlobal(local))));
}

function structuralIdentity(window,cell){
  const material=window.materials[window.index(cell)];
  return material===1?'ROCK':material===2?'DIRT':'AIR';
}

export function queryTerrainSupport(world,changedSamples,{policy=TERRAIN_COLLAPSE_POLICY,anchor=null,margin=policy.initialMargin}={}){
  const {seedCells,seedBounds}=deriveTerrainStructuralSeeds(changedSamples);
  const evidence={seedCells,initialBounds:null,finalBounds:null,expansions:0,sampleCount:0,cellCount:0,bondCount:0,workUnits:0,
    readChunkIds:[],status:'NO_SEEDS',candidateComponents:[],expansionHistory:[]};
  if(!seedBounds)return evidence;
  let bounds=initialBounds(seedBounds,margin);evidence.initialBounds=structuredClone(bounds);evidence.initialMargin=margin;
  const readChunks=new Set();
  for(let attempt=0;attempt<=policy.maxExpansions;attempt++){
    const intervals=bounds.max.map((value,axis)=>value-bounds.min[axis]);
    const size=intervals.map(value=>value+1),sampleCount=product(size),cellCount=product(intervals);
    evidence.finalBounds=structuredClone(bounds);
    for(const id of readChunkIds(bounds))readChunks.add(id);
    evidence.readChunkIds=[...readChunks].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
    if(intervals.some((value,axis)=>value>policy.maxIntervals[axis])||sampleCount>policy.maxSamples||evidence.sampleCount+sampleCount>policy.maxSamples||cellCount>policy.maxCells){
      evidence.status='DEFERRED_UNKNOWN_SUPPORT';evidence.reason='support window budget';return evidence;
    }
    const window=new TerrainMatterWindow(world,{min:bounds.min,max:bounds.max,maxIntervals:policy.maxIntervals});
    const result=analyzeTerrainMatterConnectivity(window,{anchor:anchor??(cell=>window.localToGlobal(cell)[1]===0),
      identityForCell:cell=>structuralIdentity(window,cell),canConnect:()=>true,allowAnchoredEdgeComponents:true,
      maxBonds:policy.maxBonds,maxWorkUnits:policy.maxWorkUnits});
    evidence.sampleCount+=sampleCount;evidence.cellCount+=result.cellCount??cellCount;evidence.bondCount+=result.bonds??0;
    evidence.workUnits+=(result.cellCount??cellCount)+(result.bonds??0);
    evidence.expansionHistory.push({attempt,bounds:structuredClone(bounds),status:result.status,reason:result.reason??null,
      unknownBoundary:result.unknownBoundary??null,sampleCount,cellCount:result.cellCount??cellCount,bondCount:result.bonds??0,
      cumulativeWorkUnits:evidence.workUnits});
    if(evidence.cellCount>policy.maxCells||evidence.bondCount>policy.maxBonds||evidence.workUnits>policy.maxWorkUnits){
      evidence.status='DEFERRED_UNKNOWN_SUPPORT';evidence.reason='support work budget';return evidence;
    }
    if(result.status==='OK'){
      evidence.status='COMPLETE';evidence.candidateComponents=result.components.filter(component=>!component.anchored&&touchesSeeds(component,window,seedCells));
      evidence.componentCount=result.components.length;return {...evidence,window,result};
    }
    const boundary=result.unknownBoundary;
    if(!boundary||attempt===policy.maxExpansions){evidence.status='DEFERRED_UNKNOWN_SUPPORT';evidence.reason=result.reason;return evidence;}
    const expanded=growBounds(bounds,boundary,policy);
    const nextIntervals=expanded.max.map((value,axis)=>value-expanded.min[axis]);
    if(nextIntervals.every((value,axis)=>value===intervals[axis])){evidence.status='DEFERRED_UNKNOWN_SUPPORT';evidence.reason='resident patch boundary';return evidence;}
    bounds=expanded;evidence.expansions++;
  }
  evidence.status='DEFERRED_UNKNOWN_SUPPORT';evidence.reason='expansion limit';return evidence;
}

export function classifyTerrainComponent(window,component,{policy=TERRAIN_COLLAPSE_POLICY,materialAt=null}={}){
  const materialProbes={rock:0,dirt:0};
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const cell of component.cells){
    for(let axis=0;axis<3;axis++){min[axis]=Math.min(min[axis],cell[axis]);max[axis]=Math.max(max[axis],cell[axis]);}
    const bits=parcelBits(window,cell);
    for(let probe=0;probe<bits.length;probe++)if(bits[probe]){
      const material=materialAt?materialAt(window.localToGlobal(cell),probe):parcelMaterial(window,cell,probe);
      if(material===1)materialProbes.rock++;else if(material===2)materialProbes.dirt++;
    }
  }
  const occupiedProbes=materialProbes.rock+materialProbes.dirt,materials=Object.keys(materialProbes).filter(material=>materialProbes[material]>0),
    dimensions=min.map((value,axis)=>max[axis]-value+1),actorIntervals=dimensions.map(value=>value+2),
    componentBounds={min,max,dimensions,actorIntervals,occupiedProbes,materials:[...materials],materialProbes};
  if(!occupiedProbes)return {kind:'empty',...componentBounds};
  if(actorIntervals.some((value,axis)=>value>policy.maxActorIntervals[axis])||occupiedProbes>policy.maxActorParcels)
    return {kind:'deferred-oversize',...componentBounds};
  if(materials.length===2)return {kind:'persistent-mixed-actor',...componentBounds};
  if(materials[0]==='dirt'){
    if(occupiedProbes<=policy.tinyDirtMaxProbes)return {kind:'crumble',...componentBounds};
    if(occupiedProbes<=policy.transientDirtMaxProbes)return {kind:'transient-dirt-clod',...componentBounds};
    return {kind:'persistent-dirt-actor',...componentBounds};
  }
  if(occupiedProbes<=policy.tinyRockMaxProbes)return {kind:'rock-debris',...componentBounds};
  if(occupiedProbes<=policy.transientRockMaxProbes)return {kind:'transient-rock-fragment',...componentBounds};
  return {kind:'persistent-rock-actor',...componentBounds};
}
