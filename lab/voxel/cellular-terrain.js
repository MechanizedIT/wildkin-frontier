import * as THREE from '../../vendor/three.module.js';
import RAPIER from '../../vendor/rapier.js';
import { MATERIALS } from './config.js';
import { TerrainChunkWorld, excavateSphere, terrainChunkId, TERRAIN_CHUNK_CELLS, TERRAIN_CHUNK_SPACING } from './terrain-chunks.js';

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
const dirtyIds=new Set(),storeKey='wildkin-frontier-voxel-05d-v1';
const rapierWorld=()=>new RAPIER.World({x:0,y:-9.81,z:0});let physics=null,marker=null,markerMesh=null;
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
  for(const old of previous.values())discardProduct(old.collider);
}
function rollbackProducts(products,previous){
  for(const product of products.values()){product.collider?.collider?.setEnabled(false);product.collider?.body?.setEnabled(false);}
  for(const old of previous.values()){old.collider?.body?.setEnabled(true);old.collider?.collider?.setEnabled(true);}
}
const persistentStore={async save(state){localStorage.setItem(storeKey,JSON.stringify(state));}};
const world=new TerrainChunkWorld({store:persistentStore,prepareCollider:makeCollider,installProducts,rollbackProducts,discardProduct});
function makeGeometry(data){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(data.positions,3));g.setAttribute('normal',new THREE.BufferAttribute(data.normals,3));
  g.setAttribute('color',new THREE.BufferAttribute(data.colors,3));g.setAttribute('rockWeight',new THREE.BufferAttribute(data.rockWeights,1));g.setIndex(new THREE.BufferAttribute(data.indices,1));g.computeBoundingSphere();return g;}
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
async function excavate(){const {hit,collision}=doRay();if(!hit){message.textContent='No visible terrain at the crosshair.';return;}
  const material=selectedMaterial(hit);if(material!==tool){message.textContent=`Target is ${material===1?'rock':'dirt'}; choose its matching tool.`;return;}
  const changes=excavateSphere(world,hit.point.toArray(),.88,tool);
  if(!changes.length){message.textContent='The selected material did not change at this point.';return;}
  message.textContent=`Preparing ${changes.length} global samples across the local dirty set…`;
  const result=await world.editSamples(changes);if(result.status!=='COMMITTED'){message.textContent=`Edit rejected: ${result.error??result.status}`;return;}
  lastEvent=result.event;dirtyIds.clear();for(const id of lastEvent.dirtyChunkIds)dirtyIds.add(id);syncProducts(lastEvent.remeshedChunkIds);
  message.textContent=`Revision ${world.revision} accepted · ${lastEvent.remeshedChunkIds.length} chunks rebuilt · static collision replaced.`;
  updateStats(hit,collision);
}
function updateStats(hit=null,collision=null){const products=world.products;
  stats.textContent=`world revision: ${world.revision}\npatch: 3 × 3 logical chunks · ${products.length} total\ncells/chunk: 16³ · spacing: 0.5 m\nhalo: read-only 1 sample · sparse edits: ${world.edits.size}\nlast hit: ${hit?hit.point.toArray().map(v=>v.toFixed(2)).join(', '):'—'}\nmaterial: ${hit?(selectedMaterial(hit)===1?'rock':'dirt'):'—'}\nRapier ray: ${collision?collision.distance.toFixed(2)+' m':'—'}\n${lastEvent?`revision: ${lastEvent.worldRevision}\nchanged samples: ${lastEvent.changedSampleCount}\ndirty/render/collider: ${lastEvent.dirtyChunkIds.length}/${lastEvent.remeshedChunkIds.length}/${lastEvent.rebuiltColliderChunkIds.length}\ndirty IDs: ${lastEvent.dirtyChunkIds.join(' · ')}\nunchanged products reused: ${lastEvent.unchangedChunkIds.length}\nmesh ms: ${Object.values(lastEvent.meshMs).map(v=>v.toFixed(1)).join(', ')}\ncollider ms: ${Object.values(lastEvent.colliderMs).map(v=>v.toFixed(1)).join(', ')}\nsave/transaction ms: ${lastEvent.persistenceMs.toFixed(1)} / ${lastEvent.transactionMs.toFixed(1)}`:'No terrain edit yet.'}`;
}
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);
document.querySelector('#mine').onclick=()=>excavate();document.querySelector('#dirt').onclick=()=>{tool=2;document.querySelector('#dirt').classList.add('selected');document.querySelector('#rock').classList.remove('selected');};
document.querySelector('#rock').onclick=()=>{tool=1;document.querySelector('#rock').classList.add('selected');document.querySelector('#dirt').classList.remove('selected');};
document.querySelector('#grid').onclick=e=>{showGrid=!showGrid;e.currentTarget.textContent=`Chunk grid: ${showGrid?'on':'off'}`;buildGrid();};
document.querySelector('#dirty').onclick=e=>{showDirty=!showDirty;e.currentTarget.textContent=`Dirty view: ${showDirty?'on':'off'}`;syncProducts();};
document.querySelector('#seam').onclick=e=>{seam=seam==='threshold'?'vertex':'threshold';e.currentTarget.textContent=`Material seam: ${seam}`;syncProducts();};
document.querySelector('#save').onclick=()=>{localStorage.setItem(storeKey,JSON.stringify(world.exportSave()));message.textContent=`Saved revision ${world.revision}. Reloading the literal page…`;setTimeout(()=>location.reload(),120);};
canvas.addEventListener('pointerdown',e=>{if(e.button===2||e.shiftKey){drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}});
canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw-=(e.clientX-drag.x)*.006;pitch=Math.max(-.15,Math.min(.85,pitch+(e.clientY-drag.y)*.005));drag={x:e.clientX,y:e.clientY};updateCamera();});
canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('click',e=>{if(!e.shiftKey)excavate();});
canvas.addEventListener('wheel',e=>{distance=Math.max(6,Math.min(48,distance+e.deltaY*.015));updateCamera();},{passive:true});
const keys=new Set();addEventListener('keydown',e=>{keys.add(e.key.toLowerCase());if(e.key.toLowerCase()==='e')excavate();});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function frame(){requestAnimationFrame(frame);const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  const step=.12;if(keys.has('w'))target.addScaledVector(forward,step);if(keys.has('s'))target.addScaledVector(forward,-step);if(keys.has('a'))target.addScaledVector(right,-step);if(keys.has('d'))target.addScaledVector(right,step);if(keys.has('arrowleft'))yaw+=.018;if(keys.has('arrowright'))yaw-=.018;if(keys.has('arrowup'))pitch=Math.min(.85,pitch+.012);if(keys.has('arrowdown'))pitch=Math.max(-.15,pitch-.012);
  updateCamera();physics.timestep=1/60;physics.step();if(marker&&markerMesh){const p=marker.translation();markerMesh.position.set(p.x,p.y,p.z);markerMesh.quaternion.copy(marker.rotation());}
  renderer.render(scene,camera);}
try{
  await RAPIER.init();physics=rapierWorld();const saved=localStorage.getItem(storeKey);if(saved){try{await world.reload(JSON.parse(saved));}catch(error){localStorage.removeItem(storeKey);throw error;}}
  for(const [id,product] of world.chunks){product.collider=await makeCollider(product.mesh,product.meshRevision,id);product.collider?.body?.setEnabled(true);product.collider?.collider?.setEnabled(true);}
  syncProducts();buildGrid();
  markerMesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.3,1),new THREE.MeshStandardMaterial({color:0xeac57b,roughness:.7}));scene.add(markerMesh);
  marker=physics.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(2,6,2).setCanSleep(true));physics.createCollider(RAPIER.ColliderDesc.ball(.3).setDensity(.7),marker);
  updateCamera();updateStats();message.textContent=`Ready · ${world.chunks.size} independent chunk products · world revision ${world.revision}.`;frame();
}catch(error){console.error(error);fatal.textContent=`Terrain lab error: ${error.message}`;message.textContent='Terrain setup failed.';}
