import * as THREE from '../../vendor/three.module.js';
import RAPIER from '../../vendor/rapier.js';
import { MATERIALS } from './config.js';
import { TerrainChunkWorld, excavateSphere, terrainChunkId, TERRAIN_CHUNK_CELLS, TERRAIN_CHUNK_SPACING } from './terrain-chunks.js';
import { CellularRockPhysics } from './matter-physics.js';
import { actorMatterSamples } from './matter-actor.js';
import { crispMatterSeams, meshMatterSamples } from './matter-mesh.js';
import { actorToWorldPoint, pickActorSurface, readMatterScalar } from './matter-target.js';

const canvas=document.querySelector('#scene'),message=document.querySelector('#message'),stats=document.querySelector('#stats'),fatal=document.querySelector('#fatal');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x9bb8bb);scene.fog=new THREE.Fog(0x9bb8bb,42,105);
const camera=new THREE.PerspectiveCamera(56,innerWidth/innerHeight,.1,160);scene.add(new THREE.HemisphereLight(0xd5e7e4,0x493c32,2.0));
const sun=new THREE.DirectionalLight(0xffe4be,2.3);sun.position.set(-13,24,8);scene.add(sun);
const baseMaterial=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,side:THREE.DoubleSide,roughness:.94});
const thresholdMaterial=baseMaterial.clone(),rockColor=new THREE.Color(...MATERIALS[1].color),dirtColor=new THREE.Color(...MATERIALS[2].color);
thresholdMaterial.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float rockWeight; varying float vRockWeight;');
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRockWeight=rockWeight;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 terrainRock; uniform vec3 terrainDirt; varying float vRockWeight;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat w=smoothstep(0.49,0.51,vRockWeight); diffuseColor.rgb=mix(terrainDirt,terrainRock,w);');
  shader.uniforms.terrainRock={value:rockColor};shader.uniforms.terrainDirt={value:dirtColor};
};
thresholdMaterial.customProgramCacheKey=()=>`phase05d-threshold-${MATERIALS[1].color.join(',')}-${MATERIALS[2].color.join(',')}`;
const dirtyMaterial=new THREE.MeshStandardMaterial({color:0xe6a54f,emissive:0x57300a,roughness:.9,side:THREE.DoubleSide});
const chunkMeshes=new Map(),gridGroup=new THREE.Group();scene.add(gridGroup);
const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2(0,0);let seam='threshold',tool=2,showGrid=false,showDirty=false,lastEvent=null,yaw=0,pitch=.25,distance=15,target=new THREE.Vector3(2.5,2.5,-3),drag=null;
const dirtyIds=new Set(),storeKey='wildkin-frontier-voxel-05d-v2';
const rapierWorld=()=>new RAPIER.World({x:0,y:-9.81,z:0});let physics=null,matterPhysics=null,restoredRuntimeState=null;
const actorMeshes=new Map();
function makeCollider(mesh,revision,id){
  if(!mesh.indices.length)return {id,revision,body:null,collider:null};
  const body=physics.createRigidBody(RAPIER.RigidBodyDesc.fixed());body.setEnabled(false);
  try{const desc=RAPIER.ColliderDesc.trimesh(mesh.positions,mesh.indices);if(!desc)throw new Error(`Empty terrain collider ${id}`);
    const collider=physics.createCollider(desc,body);collider.setEnabled(false);return {id,revision,body,collider};
  }catch(error){physics.removeRigidBody(body);throw error;}
}
function discardProduct(product){if(product?.collider?.body)physics.removeRigidBody(product.collider.body);else if(product?.body)physics.removeRigidBody(product.body);}
function installProducts(products,previous){
  // No frame can run inside this callback: all candidate bodies enable first,
  // then their replaced bodies retire as one JavaScript publication section.
  for(const product of products.values()){product.collider?.body?.setEnabled(true);product.collider?.collider?.setEnabled(true);}
}
function rollbackProducts(products,previous,actorProducts=new Map(),oldActorProducts=new Map()){
  for(const product of products.values()){product.collider?.collider?.setEnabled(false);product.collider?.body?.setEnabled(false);}
  for(const old of previous.values()){old.collider?.body?.setEnabled(true);old.collider?.collider?.setEnabled(true);}
  for(const [id,product] of actorProducts){product.physics.body.setEnabled(false);scene.remove(product.visual);actorMeshes.delete(id);const old=oldActorProducts.get(id);
    if(old){matterPhysics.actors.set(id,old.physics);scene.add(old.visual);actorMeshes.set(id,old.visual);}else matterPhysics.actors.delete(id);}
}
function prepareActorProduct(actor){
  const samples=actorMatterSamples(actor),mesh=crispMatterSeams(meshMatterSamples(samples)),physicsProduct=matterPhysics.prepareActor(actor,mesh),visual=new THREE.Mesh(makeGeometry(mesh),
    new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.88,side:THREE.DoubleSide}));
  visual.name=`matter-actor-${actor.id}`;visual.position.set(...actor.position);visual.quaternion.set(actor.rotation.x,actor.rotation.y,actor.rotation.z,actor.rotation.w);
  return {id:actor.id,record:actor,samples,mesh,physics:physicsProduct,visual};
}
function installActorProducts(products){
  for(const [id,product] of products){product.physics.body.setEnabled(true);if(product.record.sleepState==='SLEEPING')product.physics.body.sleep();matterPhysics.actors.set(id,product.physics);scene.add(product.visual);actorMeshes.set(id,product.visual);}
}
function discardActorProduct(product){if(!product)return;matterPhysics?.discard(product.physics);product.visual.geometry.dispose();product.visual.material.dispose();}
function retireProducts(_products,previous,actorProducts,oldActorProducts,retired=[]){
  for(const old of previous.values())discardProduct(old.collider);
  for(const [id,old] of oldActorProducts){if(!old)continue;if(actorProducts.has(id)||retired.includes(id)){scene.remove(old.visual);discardActorProduct(old);if(!actorProducts.has(id)){actorMeshes.delete(id);matterPhysics.actors.delete(id);}}}
  for(const id of retired){const old=actorMeshes.get(id);if(old){scene.remove(old);old.geometry.dispose();old.material.dispose();actorMeshes.delete(id);}matterPhysics.actors.delete(id);}
}
const persistentStore={async save(state){localStorage.setItem(storeKey,JSON.stringify(state));}};
const world=new TerrainChunkWorld({store:persistentStore,prepareCollider:makeCollider,installProducts,rollbackProducts,discardProduct,
  prepareActorProduct,installActorProducts,discardActorProduct,retireProducts});
function makeGeometry(data){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(data.positions,3));g.setAttribute('normal',new THREE.BufferAttribute(data.normals,3));
  g.setAttribute('color',new THREE.BufferAttribute(data.colors,3));g.setAttribute('rockWeight',new THREE.BufferAttribute(data.rockWeights??new Float32Array(data.positions.length/3),1));g.setIndex(new THREE.BufferAttribute(data.indices,1));g.computeBoundingSphere();return g;}
function drawChunk(id,product){
  let mesh=chunkMeshes.get(id);if(mesh){scene.remove(mesh);mesh.geometry.dispose();}
  const chunk=product.chunk??id.split(',').map(Number),next=new THREE.Mesh(makeGeometry(product.mesh),seam==='threshold'?thresholdMaterial:baseMaterial);
  next.name=`terrain-${id}`;next.userData.chunkId=id;next.userData.chunk=chunk;next.material=showDirty&&dirtyIds.has(id)?dirtyMaterial:(seam==='threshold'?thresholdMaterial:baseMaterial);
  scene.add(next);chunkMeshes.set(id,next);
}
function syncProducts(ids=[...world.chunks.keys()]){for(const id of ids)drawChunk(id,world.chunks.get(id));}
function buildGrid(){gridGroup.clear();for(const id of world.chunks.keys()){
  const c=id.split(',').map(Number),size=TERRAIN_CHUNK_CELLS*TERRAIN_CHUNK_SPACING,start=c.map(v=>v*size),box=new THREE.Box3(new THREE.Vector3(...start),new THREE.Vector3(start[0]+size,start[1]+size,start[2]+size));
  const helper=new THREE.Box3Helper(box,new THREE.Color(0x172d39));gridGroup.add(helper);
}gridGroup.visible=showGrid;}
function updateCamera(){const cp=Math.cos(pitch),offset=new THREE.Vector3(Math.sin(yaw)*cp,Math.sin(pitch),Math.cos(yaw)*cp).multiplyScalar(distance);
  camera.position.copy(target).add(offset);camera.lookAt(target);}
function selectedMaterial(hit){const attr=hit.object.geometry.getAttribute('rockWeight');if(!attr||!hit.face)return 2;
  const values=[hit.face.a,hit.face.b,hit.face.c].map(i=>attr.getX(i));return values.reduce((a,b)=>a+b,0)/3>.5?1:2;}
function doRay(){raycaster.setFromCamera(mouse,camera);const hit=raycaster.intersectObjects([...chunkMeshes.values()],false)[0]??null;
  let collision=null;const rapierRay=new RAPIER.Ray(raycaster.ray.origin,raycaster.ray.direction);const result=physics.castRayAndGetNormal(rapierRay,100,true);
  if(result)collision={distance:result.timeOfImpact,collider:result.collider.handle};return {hit,collision};}
function actorRayHit(){const ray=raycaster.ray,actors=world.actors.map(record=>{const pose=matterPhysics.pose(record.id)??{position:record.position,rotation:record.rotation},samples=actorMatterSamples(record);
  return {...record,pose,bounds:record.bounds??{min:samples.min,max:samples.min.map((v,i)=>v+(samples.size[i]-1)*samples.spacing)},readDensity:p=>readMatterScalar(samples,p)};});
  return pickActorSurface(actors,{originRelative:ray.origin.toArray(),direction:ray.direction.toArray(),maxDistance:100});}
function captureActorPoses(){if(!matterPhysics)return;for(const actor of world.actors){const pose=matterPhysics.pose(actor.id);if(!pose)continue;
  const moved=actor.position.some((v,i)=>Math.abs(v-pose.position[i])>1e-4)||['x','y','z','w'].some(k=>Math.abs(actor.rotation[k]-pose.rotation[k])>1e-5);
  actor.position=[...pose.position];actor.rotation={...pose.rotation};actor.linearVelocity=[...pose.linearVelocity];actor.angularVelocity=[...pose.angularVelocity];actor.sleepState=pose.sleepState;if(moved)actor.poseRevision=(actor.poseRevision??0)+1;
}}
function updateActorVisuals(){for(const [id,visual] of actorMeshes){const pose=matterPhysics.pose(id);if(!pose)continue;visual.position.set(...pose.position);visual.quaternion.set(pose.rotation.x,pose.rotation.y,pose.rotation.z,pose.rotation.w);}}
function actorTerrainContacts(id){const product=matterPhysics?.actors.get(id);if(!product||typeof physics?.contactPair!=='function')return [];
  const touching=new Set();for(const actorCollider of product.colliders)for(const [chunkId,chunk] of world.chunks){const terrain=chunk.collider?.collider;if(!terrain)continue;
    try{physics.contactPair(actorCollider,terrain,manifold=>{if(manifold.numContacts?.()>0)touching.add(chunkId);});}catch{/* backend contact query unavailable */}}
  return [...touching].sort();}
async function excavate(){const {hit:terrainHit,collision}=doRay(),actorHit=actorRayHit();const hit=actorHit&&(!terrainHit||actorHit.distance<terrainHit.distance)?null:terrainHit;
  if(actorHit&&!hit){if(tool!==1){message.textContent='The moved actor is rock; choose the rock tool.';return;}captureActorPoses();
    const proposal=world.prepareActorMining(actorHit.actorId,actorHit.contentRevision,actorHit.localPoint),result=await world.publishEdit(proposal);
    if(result.status!=='COMMITTED'){message.textContent=`Actor mining rejected: ${result.error??result.status}`;return;}
    lastEvent=result.event;message.textContent=`Moved MatterActor mined · stress ${lastEvent.actorMining?.stress?.visitedNodes??0} sites · actor products ${lastEvent.preparedActorIds.length} prepared.`;updateStats(null,collision);return;}
  if(!hit){message.textContent='No visible terrain or MatterActor at the crosshair.';return;}
  const material=selectedMaterial(hit);if(material!==tool){message.textContent=`Target is ${material===1?'rock':'dirt'}; choose its matching tool.`;return;}
  captureActorPoses();const changes=excavateSphere(world,hit.point.toArray(),.88,tool);
  if(!changes.length){message.textContent='The selected material did not change at this point.';return;}
  message.textContent=`Preparing ${changes.length} global samples across the local dirty set…`;
  const result=await world.editSamples(changes);if(result.status!=='COMMITTED'){message.textContent=`Edit rejected: ${result.error??result.status}`;return;}
  lastEvent=result.event;dirtyIds.clear();for(const id of lastEvent.dirtyChunkIds)dirtyIds.add(id);syncProducts(lastEvent.remeshedChunkIds);
  message.textContent=`Revision ${world.revision} accepted · ${lastEvent.remeshedChunkIds.length} chunks rebuilt · static collision replaced.`;
  updateStats(hit,collision);
}
function updateStats(hit=null,collision=null){const products=world.products,audit=world.ledger.audit();
  stats.textContent=`world revision: ${world.revision}\npatch: 3 × 3 logical chunks · ${products.length} total\ncells/chunk: 16³ · spacing: 0.5 m\nhalo: read-only 1 sample · sparse edits: ${world.edits.size}\nMatterActors/bodies: ${world.actors.length}/${matterPhysics?.actors.size??0}\nledger typed-array bytes: ${world.ledger.byteLength}\nledger ROCK world/actors/consumed: ${audit.rock.world}/${audit.rock.actors}/${audit.rock.consumed}\nledger DIRT world/actors/consumed: ${audit.dirt.world}/${audit.dirt.actors}/${audit.dirt.consumed}\nlast hit: ${hit?hit.point.toArray().map(v=>v.toFixed(2)).join(', '):'—'}\nmaterial: ${hit?(selectedMaterial(hit)===1?'rock':'dirt'):'—'}\nRapier ray: ${collision?collision.distance.toFixed(2)+' m':'—'}\n${lastEvent?`revision: ${lastEvent.worldRevision}\nchanged samples: ${lastEvent.changedSampleCount}\ndirty/render/collider: ${lastEvent.dirtyChunkIds.length}/${lastEvent.remeshedChunkIds.length}/${lastEvent.rebuiltColliderChunkIds.length}\ndirty IDs: ${lastEvent.dirtyChunkIds.join(' · ')}\nactor products prepared/reused/retired: ${lastEvent.preparedActorIds.length}/${lastEvent.reusedActorIds.length}/${lastEvent.retiredActorIds.length}\nsupport bounds/work: ${lastEvent.supportEvidence?.bounds?.globalMin.join(',')}..${lastEvent.supportEvidence?.bounds?.globalMax.join(',')} / ${lastEvent.supportEvidence?.workUnits??0}\npost-transfer dirt consumed: ${lastEvent.supportEvidence?.postTransferDirtConsumed??0}\nmesh ms: ${Object.values(lastEvent.meshMs).map(v=>v.toFixed(1)).join(', ')}\ncollider ms: ${Object.values(lastEvent.colliderMs).map(v=>v.toFixed(1)).join(', ')}\nsave/transaction ms: ${lastEvent.persistenceMs.toFixed(1)} / ${lastEvent.transactionMs.toFixed(1)}`:'No terrain edit yet.'}`;
}
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);
document.querySelector('#mine').onclick=()=>excavate();document.querySelector('#dirt').onclick=()=>{tool=2;document.querySelector('#dirt').classList.add('selected');document.querySelector('#rock').classList.remove('selected');};
document.querySelector('#rock').onclick=()=>{tool=1;document.querySelector('#rock').classList.add('selected');document.querySelector('#dirt').classList.remove('selected');};
document.querySelector('#grid').onclick=e=>{showGrid=!showGrid;e.currentTarget.textContent=`Chunk grid: ${showGrid?'on':'off'}`;buildGrid();};
document.querySelector('#dirty').onclick=e=>{showDirty=!showDirty;e.currentTarget.textContent=`Dirty view: ${showDirty?'on':'off'}`;syncProducts();};
document.querySelector('#seam').onclick=e=>{seam=seam==='threshold'?'vertex':'threshold';e.currentTarget.textContent=`Material seam: ${seam}`;syncProducts();};
document.querySelector('#save').onclick=()=>{captureActorPoses();localStorage.setItem(storeKey,JSON.stringify(world.exportSave()));message.textContent=`Saved revision ${world.revision}. Reloading the literal page…`;setTimeout(()=>location.reload(),120);};
canvas.addEventListener('pointerdown',e=>{if(e.button===2||e.shiftKey){drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}});
canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw-=(e.clientX-drag.x)*.006;pitch=Math.max(-.15,Math.min(.85,pitch+(e.clientY-drag.y)*.005));drag={x:e.clientX,y:e.clientY};updateCamera();});
canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('click',e=>{if(!e.shiftKey)excavate();});
canvas.addEventListener('wheel',e=>{distance=Math.max(6,Math.min(48,distance+e.deltaY*.015));updateCamera();},{passive:true});
const keys=new Set();addEventListener('keydown',e=>{keys.add(e.key.toLowerCase());if(e.key.toLowerCase()==='e')excavate();});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function frame(){requestAnimationFrame(frame);const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  const step=.12;if(keys.has('w'))target.addScaledVector(forward,step);if(keys.has('s'))target.addScaledVector(forward,-step);if(keys.has('a'))target.addScaledVector(right,-step);if(keys.has('d'))target.addScaledVector(right,step);if(keys.has('arrowleft'))yaw+=.018;if(keys.has('arrowright'))yaw-=.018;if(keys.has('arrowup'))pitch=Math.min(.85,pitch+.012);if(keys.has('arrowdown'))pitch=Math.max(-.15,pitch-.012);
  updateCamera();physics.timestep=1/60;physics.step();captureActorPoses();updateActorVisuals();
  renderer.render(scene,camera);}
// Read-only receipt helpers plus camera framing for deterministic browser
// evidence. Terrain edits still require the normal canvas click/crosshair path.
window.__voxelTerrainLab={focus(point,nextDistance=9,view={}){target.set(...point);distance=nextDistance;if(Number.isFinite(view.yaw))yaw=view.yaw;if(Number.isFinite(view.pitch))pitch=Math.max(-.15,Math.min(.85,view.pitch));updateCamera();},
  inspect(){const {hit,collision}=doRay(),actor=actorRayHit(),audit=world.ledger.audit();return {revision:world.revision,restoredRuntimeState,hit:hit?{point:hit.point.toArray(),material:selectedMaterial(hit),distance:hit.distance}:null,
    actorHit:actor,collision:collision?{distance:collision.distance,collider:collision.collider}:null,dirtyChunkIds:lastEvent?.dirtyChunkIds??[],
    ledger:audit,ledgerBytes:world.ledger.byteLength,actorCount:world.actors.length,bodyCount:matterPhysics?.actors.size??0,actors:world.actors.map(value=>({id:value.id,contentRevision:value.contentRevision,poseRevision:value.poseRevision,
      pose:matterPhysics?.pose(value.id),localCOM:value.localCOM,worldCOM:matterPhysics?actorToWorldPoint(matterPhysics.pose(value.id),value.localCOM):null,
      bodyHandle:matterPhysics?.actors.get(value.id)?.body.handle,contactingTerrainChunkIds:actorTerrainContacts(value.id),material:value.material,
      transferredParcelCount:value.transferredParcelCount})),sameRapierWorld:!!physics&&physics===matterPhysics?.world,staticColliderCount:[...world.chunks.values()].filter(value=>!!value.collider?.collider).length,lastEvent};},
  read(points){return points.map(point=>({point:[...point],...world.read(point)}));},save(){captureActorPoses();return world.exportSave();}};
try{
  await RAPIER.init();physics=rapierWorld();matterPhysics=new CellularRockPhysics(RAPIER,{world:physics,createFloor:false});const saved=localStorage.getItem(storeKey);if(saved){try{await world.reload(JSON.parse(saved));}catch(error){localStorage.removeItem(storeKey);throw error;}}
  for(const [id,product] of world.chunks){product.collider=await makeCollider(product.mesh,product.meshRevision,id);product.collider?.body?.setEnabled(true);product.collider?.collider?.setEnabled(true);}
  syncProducts();buildGrid();
  for(const actor of world.actors){const product=prepareActorProduct(actor);installActorProducts(new Map([[actor.id,product]]));world.actorProducts.set(actor.id,product);}
  // Snapshot durable actor records and staged Rapier poses before the first
  // animation/physics tick for exact literal-reload evidence.
  restoredRuntimeState={revision:world.revision,actors:structuredClone(world.actors),
    rapierPoses:Object.fromEntries(world.actors.map(actor=>[actor.id,matterPhysics.pose(actor.id)])),ledger:world.ledger.audit()};
  updateCamera();updateStats();message.textContent=`Ready · ${world.chunks.size} independent chunk products · world revision ${world.revision}.`;frame();
}catch(error){console.error(error);fatal.textContent=`Terrain lab error: ${error.message}`;message.textContent='Terrain setup failed.';}
