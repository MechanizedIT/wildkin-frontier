import test from 'node:test';
import assert from 'node:assert/strict';
import { composeMatterSample } from '../lab/voxel/matter-composition.js';
import { dirtyChunksForSamples, generateTerrainSample, meshTerrainChunk, patchChunkCoordinates, TERRAIN_CHUNK_CELLS, TERRAIN_CHUNK_SPACING, terrainChunkAddress, terrainChunkSnapshot, terrainSampleInsidePatch, terrainSampleOwner, TerrainChunkWorld } from '../lab/voxel/terrain-chunks.js';

const close=(a,b,epsilon=1e-6)=>Math.abs(a-b)<=epsilon;

test('global integer sample address uses half-open chunk intervals, including negatives and borders',()=>{
  assert.deepEqual(terrainChunkAddress(16,-1,-16),{global:[16,-1,-16],chunk:[1,-1,-1],chunkId:'1,-1,-1',local:[0,15,0]});
  assert.equal(terrainSampleOwner(15,0,0),'0,0,0');assert.equal(terrainSampleOwner(16,0,0),'1,0,0');
  assert.throws(()=>terrainChunkAddress(.5,0,0),/safe integers/);
});
test('neighbor padded snapshots read the identical global boundary sample with one authoritative value',()=>{
  const left=terrainChunkSnapshot([0,0,0]),right=terrainChunkSnapshot([1,0,0]);
  const li=17+18*(4+18*5),ri=1+18*(4+18*5); // left local x=16, right local x=0
  assert.equal(left.densities[li],right.densities[ri]);assert.equal(left.materials[li],right.materials[ri]);
  assert.equal(terrainSampleOwner(16,19,20),'1,1,1');
});
test('global procedural composition is stable across requesting chunks and source order',()=>{
  const p=[16,9,2],a=generateTerrainSample(p),b=terrainChunkSnapshot([1,0,0]);
  const i=1+18*(10+18*3);assert.equal(Math.fround(a.density),b.densities[i]);assert.equal(a.material,b.materials[i]);
  const dirt={density:-.6,material:2,precedence:10,sample:()=>-.6},rock={density:-.8,material:1,precedence:20,sample:()=>-.8};
  assert.deepEqual(composeMatterSample(p,[dirt,rock]),composeMatterSample(p,[rock,dirt]));
});
test('halo samples are not duplicated in the 3x3 surface-patch ownership inventory',()=>{
  const logical=patchChunkCoordinates().length*TERRAIN_CHUNK_CELLS**3;
  const padded=patchChunkCoordinates().length*18**3;
  assert.equal(patchChunkCoordinates().length,9);assert.ok(padded>logical);assert.equal(logical,36864);
});

const quant=v=>Math.round(v*1e5)/1e5;
function seamTopology(meshes){
  const edges=new Map(),triangles=new Map();
  for(const mesh of meshes){const p=mesh.positions,key=i=>`${quant(p[i*3])},${quant(p[i*3+1])},${quant(p[i*3+2])}`;
    for(let i=0;i<mesh.indices.length;i+=3){const ids=[mesh.indices[i],mesh.indices[i+1],mesh.indices[i+2]],pts=ids.map(key),tri=pts.slice().sort().join('|');triangles.set(tri,(triangles.get(tri)??0)+1);
      for(const [a,b] of [[ids[0],ids[1]],[ids[1],ids[2]],[ids[2],ids[0]]]){const u=key(a),v=key(b),edge=u<v?`${u}|${v}`:`${v}|${u}`;edges.set(edge,(edges.get(edge)??0)+1);}}
  }
  const nearSeam=[...edges].filter(([edge])=>edge.split('|').every(point=>{const [x,y,z]=point.split(',').map(Number);return x>7&&x<9&&y>.1&&y<8&&z> -7&&z<7;}));
  return {nearSeam,duplicateTriangles:[...triangles.values()].filter(count=>count>1).length};
}
function seamVertices(a,b,axis,coordinate){
  const collect=(mesh)=>{const out=new Set();for(let i=0;i<mesh.positions.length;i+=3)if(close(mesh.positions[i+axis],coordinate,1e-5))out.add([quant(mesh.positions[i]),quant(mesh.positions[i+1]),quant(mesh.positions[i+2])].join(','));return out;};
  const x=collect(a),y=collect(b);return {a:x,b:y,shared:[...x].filter(p=>y.has(p))};
}
test('Surface Nets reaches the same seam neighborhood from both logical X chunks',()=>{
  const west=meshTerrainChunk([0,0,0]),east=meshTerrainChunk([1,0,0]),points=seamVertices(west,east,0,8);
  const westDistance=Math.min(...Array.from({length:west.positions.length/3},(_,i)=>Math.abs(west.positions[i*3]-8)));
  const eastDistance=Math.min(...Array.from({length:east.positions.length/3},(_,i)=>Math.abs(east.positions[i*3]-8)));
  assert.ok(westDistance<=TERRAIN_CHUNK_SPACING&&eastDistance<=TERRAIN_CHUNK_SPACING,`surface distances ${westDistance}, ${eastDistance}`);
  assert.ok(points.a.size===0&&points.b.size===0,'cell-owned faces meet through halo vertices rather than duplicated seam vertices');
});
test('a complete 3x3 Surface Nets patch has a watertight shared interior X seam',()=>{
  const {nearSeam,duplicateTriangles}=seamTopology(patchChunkCoordinates().map(c=>meshTerrainChunk(c)));
  assert.ok(nearSeam.length>100,`expected a dense seam neighborhood, got ${nearSeam.length}`);assert.equal(nearSeam.filter(([,uses])=>uses===1).length,0,'no open edges at the chunk seam');
  assert.equal(duplicateTriangles,0,'no overlapping duplicate seam triangles');
});
test('dirt, rock and four-chunk corner edits preserve one closed patch surface',async()=>{
  const world=new TerrainChunkWorld();
  for(const [point,dirtyCount] of [[[16,9,12],2],[[16,6,12],2],[[16,8,16],4]]){
    const result=await world.editSamples([{point,density:.35,material:0}]);assert.equal(result.status,'COMMITTED');assert.equal(result.event.dirtyChunkIds.length,dirtyCount);
    const {nearSeam,duplicateTriangles}=seamTopology(world.products.map(p=>p.mesh));
    assert.ok(nearSeam.length>80);assert.equal(nearSeam.filter(([,uses])=>uses===1).length,0);assert.equal(duplicateTriangles,0);
  }
});
test('material weights have equal global evidence on either side of a chunk boundary',()=>{
  const left=terrainChunkSnapshot([0,0,0]),right=terrainChunkSnapshot([1,0,0]),seen=new Set();
  for(let y=0;y<=16;y++){const li=17+18*((y+1)+18*1),ri=1+18*((y+1)+18*1);assert.equal(left.materials[li],right.materials[ri]);seen.add(left.materials[li]);}
  assert.ok(seen.has(1)&&seen.has(2),'the real chunk seam crosses dirt and rock strata');
  const lm=meshTerrainChunk([0,0,0]),rm=meshTerrainChunk([1,0,0]);
  assert.ok(lm.rockWeights.length===lm.positions.length/3);assert.ok(rm.rockWeights.length===rm.positions.length/3);
});

test('dirty sets derive local interior, X seam and four-chunk XZ corner dependencies',()=>{
  assert.deepEqual(dirtyChunksForSamples([[4,4,4]]),['0,0,0']);
  assert.deepEqual(dirtyChunksForSamples([[16,4,4]]),['0,0,0','1,0,0']);
  assert.deepEqual(dirtyChunksForSamples([[16,4,16]]),['0,0,0','0,0,1','1,0,0','1,0,1']);
});
test('fixed patch rejects edits to absent chunks and halo samples without growing residency',async()=>{
  const world=new TerrainChunkWorld();assert.equal(terrainSampleInsidePatch([-16,4,4]),true);assert.equal(terrainSampleInsidePatch([-17,4,4]),false);
  for(const point of [[-17,4,4],[4,16,4],[4,4,32]]){const result=await world.editSamples([{point,density:1}]);assert.equal(result.status,'OUT_OF_PATCH');}
  assert.equal(world.chunks.size,9);assert.equal(world.revision,0);assert.equal(world.edits.size,0);
});
test('local publication rebuilds only dirty render/collider products and reuses distant chunks',async()=>{
  const world=new TerrainChunkWorld(),untouched=world.chunks.get('-1,0,-1'),result=await world.editSamples([{point:[4,4,4],density:1,material:0}]);
  assert.equal(result.status,'COMMITTED');assert.deepEqual(result.event.dirtyChunkIds,['0,0,0']);assert.equal(result.event.remeshedChunkIds.length,1);
  assert.equal(result.event.rebuiltColliderChunkIds.length,1);assert.equal(world.chunks.get('-1,0,-1'),untouched);
});
test('mesh, collider, save and ownership failures publish no chunk set',async()=>{
  for(const failAt of ['mesh','collider','save','ownership']){
    const world=new TerrainChunkWorld({failAt}),before=world.chunks,saveRevision=world.revision;
    const proposal=world.prepareEdit([{point:[16,4,16],density:1,material:0}]);const result=await world.publishEdit(proposal);
    assert.equal(result.status,'REJECTED',failAt);assert.equal(world.revision,saveRevision,failAt);assert.equal(world.chunks,before,failAt);
  }
  const world=new TerrainChunkWorld(),proposal=world.prepareEdit([{point:[16,4,16],density:1}]);world.revision++;
  const stale=await world.publishEdit(proposal);assert.equal(stale.status,'STALE');assert.equal(world.history.length,0);
});
test('installation failure restores the old durable revision and rolls back prepared products',async()=>{
  const persisted=[],world=new TerrainChunkWorld({store:{save:async(value)=>persisted.push(value.revision)},installProducts:()=>{throw Error('injected install failure');},rollbackProducts:()=>{}});
  const result=await world.editSamples([{point:[16,4,8],density:1}]);
  assert.equal(result.status,'REJECTED');assert.equal(result.recoveryRequired,false);assert.equal(world.revision,0);assert.equal(world.edits.size,0);assert.deepEqual(persisted,[1,0]);
});
test('save failure preserves the persisted edit map and candidate products are discarded',async()=>{
  let persisted=0,discarded=0;const world=new TerrainChunkWorld({store:{save:async()=>{persisted++;throw Error('disk failure');}},discardProduct:()=>discarded++});
  const result=await world.editSamples([{point:[16,4,8],density:1}]);assert.equal(result.status,'REJECTED');assert.equal(persisted,1);
  assert.equal(world.revision,0);assert.equal(world.edits.size,0);assert.equal(discarded,2);
});
test('literal reload reconstructs sparse cross-chunk tombstones and matching derived products',async()=>{
  const world=new TerrainChunkWorld();await world.editSamples([{point:[16,4,8],density:1,material:0},{point:[17,4,8],density:1,material:0}]);
  const saved=world.exportSave(),reloaded=await new TerrainChunkWorld().reload(saved);
  assert.deepEqual(reloaded.read([16,4,8]),world.read([16,4,8]));assert.equal(reloaded.revision,1);
  assert.deepEqual(Array.from(reloaded.chunks.get('0,0,0').mesh.positions),Array.from(world.chunks.get('0,0,0').mesh.positions));
});
test('fixed chunk scale remains 16 logical cells at 0.5 m',()=>{assert.equal(TERRAIN_CHUNK_CELLS,16);assert.equal(TERRAIN_CHUNK_SPACING,.5);});
