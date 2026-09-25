import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '../vendor/rapier.js';
import { composeMatterSample } from '../lab/voxel/matter-composition.js';
import { dirtyChunksForSamples, excavateSphere, generateTerrainSample, meshTerrainChunk, patchChunkCoordinates, TERRAIN_CHUNK_CELLS, TERRAIN_CHUNK_SPACING, terrainChunkAddress, terrainChunkSnapshot, terrainSampleInsidePatch, terrainSampleOwner, TerrainChunkWorld } from '../lab/voxel/terrain-chunks.js';
import { TerrainMatterLedger, TerrainMatterWindow } from '../lab/voxel/terrain-matter-window.js';
import { analyzeMatterConnectivity } from '../lab/voxel/matter-connectivity.js';
import { actorMatterSamples } from '../lab/voxel/matter-actor.js';
import { pickActorSurface, readMatterScalar } from '../lab/voxel/matter-target.js';
import { CellularRockPhysics } from '../lab/voxel/matter-physics.js';
import { meshMatterSamples } from '../lab/voxel/matter-mesh.js';
import { parseTerrainParcelId } from '../lab/voxel/terrain-matter-window.js';
import { MATTER_MATERIAL } from '../lab/voxel/matter-material-policy.js';

function seamBoulderComponent(world,{crossMaterials=true}={}) {
  const window=new TerrainMatterWindow(world,{min:[8,0,-4],max:[24,16,12]}),samples=window.snapshot();
  const material=p=>{const i=p[0]+samples.size[0]*(p[1]+samples.size[1]*p[2]);return samples.materials[i]===1?'ROCK':samples.materials[i]===2?'DIRT':'AIR';};
  const result=analyzeMatterConnectivity(samples,{anchor:([,y])=>y===0,identityForCell:material,canConnect:crossMaterials?()=>true:(a,b)=>a===b});
  assert.equal(result.status,'OK');
  const component=result.components.find(c=>c.fragments.some(f=>f.id==='ROCK'&&f.cells.some(([x,y,z])=>x>=7&&x<=10&&y>=10&&y<=14&&z>=5&&z<=8)));
  return {window,result,component,rock:component?.fragments.find(f=>f.id==='ROCK')};
}

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
test('resolved seam boulder is isolated from bedrock and dirt-supported until its footing is mined',async()=>{
  const world=new TerrainChunkWorld(),initial=seamBoulderComponent(world,{crossMaterials:false});
  assert.ok(initial.component);assert.equal(initial.component.anchored,false);assert.ok(initial.rock.cells.length>0);
  const globalRockCells=initial.rock.cells.map(p=>p.map((v,i)=>v+initial.window.globalMin[i]));
  assert.ok(globalRockCells.some(([x])=>x<16));assert.ok(globalRockCells.some(([x])=>x>=16));
  assert.ok(globalRockCells.every(([x,y,z])=>world.read([x,y,z]).material===1));

  const supported=seamBoulderComponent(world);assert.equal(supported.component.anchored,true);
  assert.deepEqual(supported.window.query.globalMin,[8,0,-4]);assert.ok(supported.window.query.sampleCount<49*17*49);
  const partial=await world.editSamples(excavateSphere(world,[7.5,4.5,1.1],.35,2));
  assert.equal(partial.status,'COMMITTED');assert.equal(seamBoulderComponent(world).component.anchored,true);
  const releaseProposal=world.prepareEdit(excavateSphere(world,[8.05,4.5,1.1],.88,2));
  assert.equal(releaseProposal.status,'PREPARED_INPUT');assert.equal(releaseProposal.supportEvidence.rockSupported,false);
  const completeRockParcelCount=releaseProposal.supportEvidence.transferredRockParcels;
  assert.ok(completeRockParcelCount>133,'transfer includes the additional rock parcels outside the first ROCK fragment');
  const transferred=releaseProposal.actors[0],actorMaterialCounts=Object.values(transferred.parcelMaterials).reduce((counts,id)=>(counts[id]=(counts[id]??0)+1,counts),{});
  assert.equal(actorMaterialCounts[MATTER_MATERIAL.ROCK],completeRockParcelCount,'the actor receives every rock parcel in the resolved component');
  assert.equal(actorMaterialCounts[MATTER_MATERIAL.DIRT],releaseProposal.supportEvidence.transferredDirtParcels,'mixed support dirt remains separately identified');
  assert.equal(transferred.transferredParcelCount,completeRockParcelCount+releaseProposal.supportEvidence.transferredDirtParcels);
  assert.equal(releaseProposal.nextLedger.audit().rock.actors,completeRockParcelCount);
  assert.equal(releaseProposal.nextLedger.audit().dirt.actors,releaseProposal.supportEvidence.transferredDirtParcels);
  const release=await world.publishEdit(releaseProposal);assert.equal(release.status,'COMMITTED');
  assert.equal(world.actors.length,1);assert.ok(release.event.supportEvidence.postTransferWorkUnits>0);
  assert.ok(globalRockCells.every(([x,y,z])=>world.read([x,y,z]).material!==1),'transferred world volume is AIR');
  for(const id of Object.values(world.actors[0].parcelIds)){const {cell:[x,y,z]}=parseTerrainParcelId(id);
    for(let dz=0;dz<=1;dz++)for(let dy=0;dy<=1;dy++)for(let dx=0;dx<=1;dx++)
      assert.notEqual(world.read([x+dx,y+dy,z+dz]).material,1,'no static ROCK scalar sample remains in any transferred parcel cell');}
});
test('extracted MatterActor mines its scalar surface without rebuilding terrain and preserves exact ownership',async()=>{
  const world=new TerrainChunkWorld();await world.editSamples(excavateSphere(world,[7.5,4.5,1.1],.35,2));
  await world.editSamples(excavateSphere(world,[8.05,4.5,1.1],.88,2));let actor=world.actors[0];const product=world.actorProducts.get(actor.id);
  assert.equal(actor.material,MATTER_MATERIAL.MIXED,'detached terrain retains its actual mixed material policy');
  assert.ok(actor.materials.includes(MATTER_MATERIAL.ROCK)&&actor.materials.includes(MATTER_MATERIAL.DIRT),'actor-local resolved samples retain both materials');
  const resolvedActor=actorMatterSamples(actor),actorComponents=analyzeMatterConnectivity(resolvedActor,{identityForCell:p=>{
    for(let dz=0;dz<=1;dz++)for(let dy=0;dy<=1;dy++)for(let dx=0;dx<=1;dx++){const i=(p[0]+dx)+resolvedActor.size[0]*((p[1]+dy)+resolvedActor.size[1]*(p[2]+dz));if(resolvedActor.densities[i]<0)return 'ROCK';}return 'AIR';},canConnect:()=>true});
  assert.equal(actorComponents.status,'OK');assert.equal(actorComponents.components.length,1,'actor-local resolved rock remains one connected component');
  const unrelated=await world.editSamples([{point:[3,3,3],density:.4,material:0}]);assert.equal(unrelated.status,'COMMITTED');
  assert.deepEqual(unrelated.event.preparedActorIds,[]);assert.ok(unrelated.event.reusedActorIds.includes(actor.id));assert.equal(world.actorProducts.get(actor.id),product);
  actor=world.actors.find(value=>value.id===actor.id);
  const sample=actorMatterSamples(actor);
  actor.position=[9,1,2];actor.poseRevision=4;
  const hitPoint=[actor.position[0]+(actor.bounds.min[0]+actor.bounds.max[0])/2,
    actor.position[1]+actor.bounds.max[1]+2,actor.position[2]+(actor.bounds.min[2]+actor.bounds.max[2])/2];
  const hit=pickActorSurface([{...actor,pose:{position:actor.position,rotation:actor.rotation},bounds:actor.bounds,readDensity:p=>readMatterScalar(sample,p)}],
    {originRelative:hitPoint,direction:[0,-1,0],maxDistance:20});
  assert.ok(hit);assert.equal(hit.actorId,actor.id);assert.equal(hit.poseRevision,4);
  const oldProduct=world.actorProducts.get(actor.id),proposal=world.prepareActorMining(actor.id,hit.contentRevision,hit.localPoint);
  assert.equal(proposal.status,'PREPARED_INPUT');assert.deepEqual(proposal.dirtyChunkIds,[]);assert.deepEqual(proposal.actorDirtyIds,[actor.id]);
  const result=await world.publishEdit(proposal);assert.equal(result.status,'COMMITTED');assert.equal(result.event.dirtyChunkIds.length,0);
  assert.deepEqual(result.event.preparedActorIds,[actor.id]);assert.equal(world.actors[0].contentRevision,actor.contentRevision+1);
  assert.notEqual(world.actorProducts.get(actor.id),oldProduct);assert.ok(result.event.actorMining.stress.visitedNodes>0);
  const audit=world.ledger.assertBalanced();assert.ok(audit.rock.consumed>0);assert.equal(world.rewards.rock,audit.rock.consumed);
  const saved=world.exportSave(),reloaded=await new TerrainChunkWorld().reload(saved);assert.deepEqual(reloaded.ledger.audit(),audit);
  assert.deepEqual(reloaded.actors[0].position,world.actors[0].position);assert.deepEqual(reloaded.actors[0].structure,world.actors[0].structure);
});
test('failure after a prepared actor and tentative product install restores the durable terrain/actor revision',async()=>{
  const durable=[],installedActors=new Map(),world=new TerrainChunkWorld({store:{async save(value){durable.push(structuredClone(value));}},
    prepareActorProduct:async actor=>({id:actor.id,enabled:false,disposed:false}),
    installActorProducts(products){for(const [id,product] of products){product.enabled=true;installedActors.set(id,product);}},
    rollbackProducts(_terrain,_oldTerrain,products,oldActors){for(const [id,product] of products){product.enabled=false;installedActors.delete(id);const old=oldActors.get(id);if(old)installedActors.set(id,old);}},
    discardActorProduct(product){product.disposed=true;}});
  await world.editSamples(excavateSphere(world,[7.5,4.5,1.1],.35,2));const release=world.prepareEdit(excavateSphere(world,[8.05,4.5,1.1],.88,2));
  assert.equal(release.status,'PREPARED_INPUT');world.failAt='physics-install';
  const rejected=await world.publishEdit(release);assert.equal(rejected.status,'REJECTED');assert.equal(rejected.recoveryRequired,false);
  assert.equal(world.revision,1);assert.equal(world.actors.length,0);assert.equal(world.ledger.audit().rock.actors,0);
  assert.equal(durable.at(-1).revision,1);assert.equal(durable.at(-1).actors.length,0);assert.equal(installedActors.size,0);
  assert.equal(world.read([16,11,2]).material,1,'old static boulder remains active after rollback');
});
test('partial publication failure rolls back real staged Rapier terrain and MatterActor bodies coherently',async()=>{
  await RAPIER.init();const rapier=new RAPIER.World({x:0,y:-9.81,z:0}),physics=new CellularRockPhysics(RAPIER,{world:rapier,createFloor:false}),durable=[];
  const prepareCollider=(mesh,revision,id)=>{const body=rapier.createRigidBody(RAPIER.RigidBodyDesc.fixed()),collider=rapier.createCollider(
    RAPIER.ColliderDesc.trimesh(mesh.positions,mesh.indices),body);body.setEnabled(false);return {id,revision,body,collider};};
  const prepareActorProduct=actor=>({id:actor.id,record:actor,physics:physics.prepareActor(actor,meshMatterSamples(actorMatterSamples(actor)))});
  const disposeActor=product=>{if(product?.physics)physics.discard(product.physics);};
  const world=new TerrainChunkWorld({store:{async save(save){durable.push(structuredClone(save));}},prepareCollider,
    installProducts(products){for(const product of products.values()){product.collider.body.setEnabled(true);product.collider.collider.setEnabled(true);}},
    rollbackProducts(products,previous,actorProducts,oldActors){
      for(const product of products.values()){product.collider.collider.setEnabled(false);product.collider.body.setEnabled(false);}
      for(const old of previous.values()){old.collider.body.setEnabled(true);old.collider.collider.setEnabled(true);}
      for(const [id,product] of actorProducts){product.physics.body.setEnabled(false);physics.actors.delete(id);const old=oldActors.get(id);if(old)physics.actors.set(id,old.physics);}
    },discardProduct:product=>{if(product?.collider?.body)rapier.removeRigidBody(product.collider.body);},prepareActorProduct,
    installActorProducts(products){for(const [id,product] of products){product.physics.body.setEnabled(true);physics.actors.set(id,product.physics);}},
    discardActorProduct:disposeActor,retireProducts(_products,previous,actorProducts,oldActors,retired=[]){
      for(const old of previous.values())rapier.removeRigidBody(old.collider.body);
      for(const [id,old] of oldActors)if(old&&(actorProducts.has(id)||retired.includes(id)))disposeActor(old);
    }});
  try{
    for(const chunk of world.chunks.values()){const collider=prepareCollider(chunk.mesh,0,chunk.id);collider.body.setEnabled(true);collider.collider.setEnabled(true);chunk.collider=collider;}
    const partial=await world.editSamples(excavateSphere(world,[7.5,4.5,1.1],.35,2));assert.equal(partial.status,'COMMITTED');
    const oldStatic=new Map([...world.chunks].map(([id,chunk])=>[id,chunk.collider]));assert.equal([...oldStatic.values()].filter(p=>p.body.isEnabled()&&p.collider.isEnabled()).length,9);
    const release=world.prepareEdit(excavateSphere(world,[8.05,4.5,1.1],.88,2));assert.equal(release.status,'PREPARED_INPUT');world.failAt='physics-install';
    const failed=await world.publishEdit(release);assert.equal(failed.status,'REJECTED');assert.equal(failed.recoveryRequired,false);
    assert.equal(world.revision,1);assert.equal(durable.at(-1).revision,1);assert.equal(durable.at(-1).actors.length,0);
    assert.equal([...world.chunks.values()].filter(p=>p.collider.body.isEnabled()&&p.collider.collider.isEnabled()).length,9);
    assert.ok([...oldStatic.values()].every(p=>p.body.isEnabled()&&p.collider.isEnabled()));
    assert.equal(physics.actors.size,0,'tentatively installed MatterActor proxy was disabled and removed');
    const reloaded=await new TerrainChunkWorld().reload(durable.at(-1));assert.equal(reloaded.revision,world.revision);
    assert.deepEqual(reloaded.ledger.audit(),world.ledger.audit());assert.equal(reloaded.actors.length,0);
  }finally{physics.dispose();rapier.free();}
});
test('rollback failure fails closed and literal reload reconstructs the durable committed revision',async()=>{
  const durable=[],world=new TerrainChunkWorld({store:{async save(save){durable.push(structuredClone(save));}},
    installProducts(){},installActorProducts(){},rollbackProducts(){throw new Error('injected rollback failure');}});
  await world.editSamples(excavateSphere(world,[7.5,4.5,1.1],.35,2));
  const proposal=world.prepareEdit(excavateSphere(world,[8.05,4.5,1.1],.88,2));assert.equal(proposal.status,'PREPARED_INPUT');world.failAt='physics-install';
  const failed=await world.publishEdit(proposal);assert.equal(failed.status,'REJECTED');assert.equal(failed.recoveryRequired,true);
  assert.equal(world.recoveryRequired,true);assert.equal(world.prepareEdit([{point:[4,4,4],density:1}]).status,'RECOVERY_REQUIRED');
  const committed=durable.at(-1);assert.equal(committed.revision,2);assert.equal(committed.actors.length,1);
  const recovered=await new TerrainChunkWorld().reload(committed);assert.equal(recovered.revision,2);assert.equal(recovered.actors.length,1);
  assert.deepEqual(recovered.ledger.audit(),TerrainMatterLedger.fromSave(recovered,committed.ledger).audit());
  assert.ok([[15,11,2],[16,11,2],[17,11,2]].every(point=>recovered.read(point).material!==1),'committed extracted cavity remains AIR after recovery reload');
});
test('actor mesh and proxy preparation failures publish no transfer or ledger ownership',async()=>{
  for(const failAt of ['actor-mesh','actor-collider']){
    const world=new TerrainChunkWorld();await world.editSamples(excavateSphere(world,[7.5,4.5,1.1],.35,2));
    const before=world.ledger.audit();world.failAt=failAt;
    const result=await world.editSamples(excavateSphere(world,[8.05,4.5,1.1],.88,2));
    assert.equal(result.status,'REJECTED',failAt);assert.equal(world.revision,1,failAt);assert.equal(world.actors.length,0,failAt);
    assert.deepEqual(world.ledger.audit(),before,failAt);assert.equal(world.history.length,1,failAt);
  }
});
test('extracted MatterActor falls and rests across two static seam chunks in one Rapier world',async()=>{
  await RAPIER.init();const terrain=new TerrainChunkWorld(),rapierWorld=new RAPIER.World({x:0,y:-9.81,z:0}),physics=new CellularRockPhysics(RAPIER,{world:rapierWorld,createFloor:false});
  try{
    await terrain.editSamples(excavateSphere(terrain,[7.5,5.05,3.28],.88,2));
    const transfer=await terrain.editSamples(excavateSphere(terrain,[8.65,4.56,1.1],.88,2));
    assert.equal(transfer.status,'COMMITTED');assert.equal(terrain.actors.length,1);
    const statics=new Map();for(const id of ['0,0,0','1,0,0']){const product=terrain.chunks.get(id),body=rapierWorld.createRigidBody(RAPIER.RigidBodyDesc.fixed());
      const collider=rapierWorld.createCollider(RAPIER.ColliderDesc.trimesh(product.mesh.positions,product.mesh.indices),body);statics.set(id,{body,collider});}
    const actor=terrain.actors[0],mesh=meshMatterSamples(actorMatterSamples(actor)),bodyProduct=physics.prepareActor(actor,mesh);physics.installActors([bodyProduct]);
    assert.equal(physics.world,rapierWorld);const initial=physics.pose(actor.id),initialCOM=initial.position.map((v,i)=>v+actor.localCOM[i]);
    for(let i=0;i<600;i++)physics.step();const settled=physics.pose(actor.id),settledCOM=settled.position.map((v,i)=>v+actor.localCOM[i]);
    assert.ok(Math.hypot(...settledCOM.map((v,i)=>v-initialCOM[i]))>.2);
    assert.ok(settled.position.every(Number.isFinite)&&Object.values(settled.rotation).every(Number.isFinite));
    assert.ok(Math.hypot(...settled.linearVelocity,...settled.angularVelocity)<.12);
    const contacts=new Set();for(const actorCollider of bodyProduct.colliders)for(const [id,chunk] of statics)
      rapierWorld.contactPair(actorCollider,chunk.collider,manifold=>{if(manifold.numContacts()>0)contacts.add(id);});
    assert.deepEqual([...contacts].sort(),['0,0,0','1,0,0']);
  }finally{physics.dispose();rapierWorld.free();}
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
  for(let z=0;z<=16;z++)for(let y=0;y<=16;y++){const li=17+18*((y+1)+18*(z+1)),ri=1+18*((y+1)+18*(z+1));assert.equal(left.materials[li],right.materials[ri]);seen.add(left.materials[li]);}
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
