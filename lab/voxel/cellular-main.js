import * as THREE from '../../vendor/three.module.js';
import RAPIER from '../../vendor/rapier.js';
import { LabWorldState } from './world-state.js';
import { openCellularStore, CELLULAR_NAMESPACE } from './cellular-persistence.js';
import { mineWorldRock, mineActorRock, actorRockSamples, quantityAudit } from './matter-actor.js';
import { meshRockSamples } from './matter-mesh.js';
import { CellularRockPhysics } from './matter-physics.js';
import { pickActorSurface, pickWorldSurface, readRockScalar, validateActorHit, worldToActorDirection, actorToWorldPoint } from './matter-target.js';
import { rockDomain } from './fracture-field.js';
import { buildRockBondGraph } from './matter-structure.js';
import { analyzeRockConnectivity } from './matter-connectivity.js';
import { ROCK_PROFILE } from './matter-rock-profile.js';

const canvas=document.querySelector('#scene'),stage=document.querySelector('#stage'),message=document.querySelector('#message'),stats=document.querySelector('#stats');
const mineButton=document.querySelector('#mine'),saveButton=document.querySelector('#save'),focusButton=document.querySelector('#focus'),debugButton=document.querySelector('#debug');
const suffix=new URLSearchParams(location.search).get('save');
const namespace=suffix?`${CELLULAR_NAMESPACE}-${suffix.replace(/[^a-zA-Z0-9-]/g,'').slice(0,40)}`:CELLULAR_NAMESPACE;
const store=await openCellularStore(namespace),state=await store.load(),saveTimes=[];
const owner=new LabWorldState(store,state,{onTiming:(kind,ms)=>{if(kind==='saveMs')saveTimes.push(ms);}});
await RAPIER.init();const physics=new CellularRockPhysics(RAPIER);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x10232b);renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,1,.1,100);
scene.add(new THREE.HemisphereLight(0xdbeaf0,0x3b2b23,2));
const sun=new THREE.DirectionalLight(0xffddad,2.4);sun.position.set(-4,9,7);scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(128,128),new THREE.MeshStandardMaterial({color:0x344952,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.015;scene.add(floor);
const grid=new THREE.GridHelper(128,64,0x6c8790,0x47606b);grid.position.y=.01;scene.add(grid);
const rockMaterial=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,side:THREE.DoubleSide,roughness:.92});
let worldRender=null,actorRenders=new Map(),shardRenders=new Map(),editing=false,ready=false,debugAll=false,focus=[0,3,0],yaw=2.5,pitch=.32,distance=7.5;
const visualGeometry=new THREE.TetrahedronGeometry(.13),visualMaterial=new THREE.MeshStandardMaterial({color:0x9fb6bb,flatShading:true});
const visualPool=Array.from({length:16},()=>new THREE.Mesh(visualGeometry,visualMaterial)),visualLive=[];
const editTimes=[],workerTimes=[],colliderTimes=[],frameTimes=[],rockWorkMetrics=[],errors=[];
const worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});let nextJob=0;const jobs=new Map();
worker.onmessage=({data})=>{const job=jobs.get(data.id);if(!job)return;jobs.delete(data.id);data.error?job.reject(new Error(data.error)):job.resolve(data);};
worker.onerror=event=>{for(const job of jobs.values())job.reject(new Error(event.message));jobs.clear();};
function meshAsync(record,id,revision){return new Promise((resolve,reject)=>{const jobId=++nextJob;jobs.set(jobId,{resolve,reject});
  try{worker.postMessage({id:jobId,kind:'cellular-rock-mesh',actorId:id,revision,densities:record.densities,materials:record.materials});}
  catch(error){jobs.delete(jobId);reject(error);}});}
function threeMesh(data,actorId=null){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(data.positions,3));g.setAttribute('normal',new THREE.BufferAttribute(data.normals,3));
  g.setAttribute('color',new THREE.BufferAttribute(data.colors,3));g.setIndex(new THREE.BufferAttribute(data.indices,1));
  let material=rockMaterial;
  if(actorId?.includes('/r')||actorId?.startsWith('shard-')){material=rockMaterial.clone();const part=Number(actorId.match(/\/(\d+)$/)?.[1]??0);
    material.color.setHex(actorId.startsWith('shard-')?0xd8b5a0:part%2?0xb4cbd6:0xe5f0ed);}
  return new THREE.Mesh(g,material);
}
const structureStats=new Map(),domainForState=seed=>rockDomain(seed);
function bondOverlay(mesh,record,id){
  const sample=actorRockSamples(record),structure=record.structure??{stress:{},broken:[]},domain=domainForState(owner.state.seed);
  const graph=buildRockBondGraph(sample,domain,ROCK_PROFILE,structure),support=analyzeRockConnectivity(sample,domain,{anchor:()=>false,brokenBonds:structure.broken??[]});
  if(graph.status!=='OK'||support.status!=='OK')throw new Error(`Rock weakness view unavailable: ${graph.reason??support.reason}`);
  const componentBySite=new Map();support.components.forEach((component,index)=>component.fragments.forEach(fragment=>componentBySite.set(fragment.id,index)));
  const positions=[],colors=[];let cracked=0,broken=0;
  for(const edge of graph.edges.values()){
    const ratio=edge.stress/Math.max(edge.strength,1e-6),isCracked=ratio>=ROCK_PROFILE.crackThreshold||edge.broken;
    if(isCracked)cracked++;if(edge.broken)broken++;
    if(!debugAll&&!isCracked)continue;
    const a=graph.nodes.get(edge.a),b=graph.nodes.get(edge.b);if(!a||!b)continue;
    positions.push(...a.centroid,...b.centroid);
    const ai=componentBySite.get(edge.a)??0,bi=componentBySite.get(edge.b)??ai;
    const palette=[[.40,.78,.76],[.78,.68,.36],[.64,.63,.91],[.73,.49,.39],[.52,.78,.48],[.78,.58,.77]];
    const tone=edge.broken?[1,.2,.12]:isCracked?[1,.64,.19]:palette[(ai+bi)%palette.length];colors.push(...tone,...tone);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const lines=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.92,depthTest:false}));
  lines.visible=positions.length>0;lines.renderOrder=3;mesh.add(lines);
  lines.userData.structureStats={cracked,broken,components:support.components.length,bonds:graph.bondCount,nodes:graph.nodes.size};
}
function disposeRender(mesh){if(mesh){scene.remove(mesh);mesh.traverse(child=>{
  if(child.geometry)child.geometry.dispose();if(child.material&&child.material!==rockMaterial)child.material.dispose();
});}}
function collectStructureStats(){structureStats.clear();for(const [id,mesh] of [['world',worldRender],...actorRenders]){
  const overlay=mesh?.children.find(child=>child.userData.structureStats);if(overlay)structureStats.set(id,overlay.userData.structureStats);
}}
function setWeaknessView(){debugAll=!debugAll;debugButton.textContent=`Weakness view: ${debugAll?'all bonds':'cracks only'} (B)`;
  structureStats.clear();if(worldRender){worldRender.children.slice().forEach(child=>{worldRender.remove(child);child.geometry?.dispose();child.material?.dispose();});bondOverlay(worldRender,owner.state.world,'world');}
  for(const actor of owner.state.actors){const mesh=actorRenders.get(actor.id);if(!mesh)continue;
    mesh.children.slice().forEach(child=>{mesh.remove(child);child.geometry?.dispose();child.material?.dispose();});bondOverlay(mesh,actor,actor.id);}
  collectStructureStats();showState('Weakness view updated. Amber marks stressed bonds; red marks failed bonds.');
}
function captureLive(base){const live=structuredClone(base);for(const actor of live.actors){const pose=physics.pose(actor.id);if(pose)Object.assign(actor,pose);}return live;}
function syncVisuals(){
  if(worldRender)worldRender.position.set(...physics.origin.map(v=>-v));
  floor.position.set(-physics.origin[0],-.015-physics.origin[1],-physics.origin[2]);grid.position.set(-physics.origin[0],.01-physics.origin[1],-physics.origin[2]);
  for(const [id,mesh] of actorRenders){const pose=physics.pose(id);if(!pose)continue;
    mesh.position.set(...pose.position.map((v,i)=>v-physics.origin[i]));mesh.quaternion.set(pose.rotation.x,pose.rotation.y,pose.rotation.z,pose.rotation.w);}
  for(const [id,mesh] of shardRenders){const pose=physics.shardPose(id);if(!pose)continue;
    mesh.position.set(...pose.position.map((v,i)=>v-physics.origin[i]));mesh.quaternion.set(pose.rotation.x,pose.rotation.y,pose.rotation.z,pose.rotation.w);}
}
function emitVisualDebris(shatter){if(!shatter)return;const q=shatter.rotation,origin=actorToWorldPoint({position:shatter.position,rotation:q},shatter.localHit);
  const count=Math.min(3,Math.max(1,Math.ceil(shatter.probes/30)),visualPool.length);for(let i=0;i<count;i++){
    const mesh=visualPool.pop();mesh.position.set(origin[0]+(i-1)*.18-physics.origin[0],origin[1]+.12-physics.origin[1],origin[2]+(i%2?.12:-.12)-physics.origin[2]);
    mesh.scale.setScalar(.8+Math.min(shatter.probes,80)/160);scene.add(mesh);visualLive.push({mesh,ttl:1.1,velocity:[(i-1)*.7,.8+i*.15,(i%2?.4:-.4)]});
  }
}
function showState(note=''){
  const s=owner.state,audit=quantityAudit(s),actors=s.actors.length;
  stage.textContent=actors>=2?'Two retained rocks. Follow a fallen piece, strike its visible surface, then save and reload.':actors===1?
    `Rock actor ${actors}/4. Follow it, let it rotate, and keep striking near the weakened seam.`:
    `Hard-rock boulder on a narrow stone neck. Chip the side, then weaken the neck with repeated strikes.`;
  if(note)message.textContent=note;
  stats.textContent=`Revision ${s.revision} · actors ${actors}/4 · shards ${physics.shards.size}/4 · retired ${s.retired.length}\n`+
    `Quantity ${audit.initial}: world ${audit.world}, actors ${s.actors.reduce((n,a)=>n+(audit[a.id]||0),0)}, chips ${audit.consumed}\n`+
    `Weakness ${[...structureStats.values()].reduce((n,x)=>n+x.cracked,0)} stressed · ${[...structureStats.values()].reduce((n,x)=>n+x.broken,0)} failed · ${[...structureStats.values()].reduce((n,x)=>n+x.components,0)} structural components\n`+
    `Balance ${audit.balanced?'exact':'FAILED'} · edit ${editTimes.at(-1)?.toFixed(1)??'—'} ms · worker ${workerTimes.at(-1)?.toFixed(1)??'—'} ms`;
  mineButton.disabled=saveButton.disabled=editing;
}
function installInitial(){
  const worldMesh=meshRockSamples(actorRockSamples(owner.state.world));
  physics.installWorld(physics.prepareWorld(worldMesh,owner.state.revision));worldRender=threeMesh(worldMesh);bondOverlay(worldRender,owner.state.world,'world');scene.add(worldRender);
  // The overlay belongs to the visible mesh; attach after geometry creation.
  const products=[];for(const actor of owner.state.actors){const actorSamples=actorRockSamples(actor),mesh=meshRockSamples(actorSamples);products.push(physics.prepareActor(actor,mesh));
    const render=threeMesh(mesh,actor.id);bondOverlay(render,actor,actor.id);actorRenders.set(actor.id,render);scene.add(render);}
  physics.installActors(products);physics.step();syncVisuals();collectStructureStats();ready=true;showState('Aim at visible stone and strike. Edits save before they appear.');
}
installInitial();
async function transition(propose,{worldChanged=false,label='Rock mined'}={}){
  if(editing)return {status:'BUSY'};editing=true;showState('Preparing rock edit…');const start=performance.now();
  try{
    const result=await owner.transactPrepared({expectedRevision:owner.state.revision,
      propose:current=>propose(captureLive(current)),
      prepare:async(next,own,proposal)=>{
        const bundle={world:null,actors:[],shards:[],visualDebris:[]};
        if(worldChanged){const reply=await meshAsync(actorRockSamples(next.world),'world',next.revision);
          if(reply.revision!==next.revision)throw new Error('Stale world mesh result');workerTimes.push(reply.meshMs);
          const mesh=own({kind:'render',value:threeMesh(reply)}).value;bondOverlay(mesh,next.world,'world');
          const startCollider=performance.now(),product=own({kind:'physics',value:physics.prepareWorld(reply,next.revision)}).value;
          colliderTimes.push(performance.now()-startCollider);
          bundle.world={mesh,product};
        }
        for(const actor of next.actors){const reply=await meshAsync(actor,actor.id,actor.contentRevision);
          if(reply.actorId!==actor.id||reply.revision!==actor.contentRevision)throw new Error('Stale actor mesh result');workerTimes.push(reply.meshMs);
          const mesh=own({kind:'render',value:threeMesh(reply,actor.id)}).value;bondOverlay(mesh,actor,actor.id);
          const startCollider=performance.now(),product=own({kind:'physics',value:physics.prepareActor(actor,reply)}).value;
          colliderTimes.push(performance.now()-startCollider);
          bundle.actors.push({id:actor.id,mesh,product});
        }
        if(proposal.shatter)for(const [index,shard] of proposal.shatter.pieces.entries()){
          if(shard.kind==='transient-physical'){
            if(physics.shards.size+bundle.shards.length>=ROCK_PROFILE.maxTransientShardBodies)throw new Error('Transient shard body budget');
            const id=`shard-${next.revision}-${index}`,reply=await meshAsync(shard,id,next.revision);
            if(reply.actorId!==id||reply.revision!==next.revision)throw new Error('Stale shard mesh result');workerTimes.push(reply.meshMs);
            if(reply.indices.length){const startCollider=performance.now(),product=physics.prepareShard(id,shard,reply);
              if(product){own({kind:'physics',value:product});colliderTimes.push(performance.now()-startCollider);
                const mesh=own({kind:'render',value:threeMesh(reply,id)}).value;bundle.shards.push({id,mesh,product});continue;}
            }
          }
          bundle.visualDebris.push(shard);
        }
        const oldDebris=new Set(owner.state.fractureDebris.map(item=>item.id));
        for(const item of next.fractureDebris.filter(candidate=>!oldDebris.has(candidate.id))){
          if(item.kind==='temporary-physics-shard'&&physics.shards.size+bundle.shards.length<ROCK_PROFILE.maxTransientShardBodies){
            const id=`shard-${next.revision}-${bundle.shards.length}`,reply=await meshAsync(item,id,next.revision);
            if(reply.actorId!==id||reply.revision!==next.revision)throw new Error('Stale fracture shard mesh result');workerTimes.push(reply.meshMs);
            if(reply.indices.length){const startCollider=performance.now(),product=physics.prepareShard(id,item,reply);
              if(product){own({kind:'physics',value:product});colliderTimes.push(performance.now()-startCollider);
                const mesh=own({kind:'render',value:threeMesh(reply,id)}).value;bundle.shards.push({id,mesh,product});continue;}
            }
          }
          bundle.visualDebris.push({...item,probes:item.quantity});
        }
        return bundle;
      },
      validate:(next,bundle)=>bundle.actors.every(x=>next.actors.some(a=>a.id===x.id&&a.contentRevision===x.product.revision)),
      discard:item=>item.kind==='render'?disposeRender(item.value):physics.discard(item.value),
      install:bundle=>{
        if(bundle.world){physics.installWorld(bundle.world.product);disposeRender(worldRender);worldRender=bundle.world.mesh;scene.add(worldRender);}
        const oldIds=[...actorRenders.keys()];physics.installActors(bundle.actors.map(x=>x.product),oldIds);
        for(const mesh of actorRenders.values())disposeRender(mesh);actorRenders=new Map();
        for(const actor of bundle.actors){actorRenders.set(actor.id,actor.mesh);scene.add(actor.mesh);}
        for(const shard of bundle.shards){physics.installShard(shard.product);shardRenders.set(shard.id,shard.mesh);scene.add(shard.mesh);}
        for(const shard of bundle.visualDebris)emitVisualDebris(shard);
        syncVisuals();collectStructureStats();
      },
    });
    if(result.fractureMetrics){rockWorkMetrics.push({revision:owner.state.revision,...result.fractureMetrics});
      if(rockWorkMetrics.length>64)rockWorkMetrics.shift();}
    editTimes.push(performance.now()-start);
    showState(result.status==='OK'?`${label}${result.detached?' — the boulder is falling.':''}${result.split?' — it split into retained pieces.':''}`:
      result.status==='HOLD'?`HOLD: ${result.reason}`:result.status==='STALE'?'The rock moved or changed; aim again.':'No removable matter at that point.');
    return result;
  }catch(error){errors.push(error.message);
    showState(owner.publicationFailed?'Publication failed after save. Reload to rebuild committed state.':`Edit retained for retry: ${error.message}`);
    return {status:'ERROR',reason:error.message};}
  finally{editing=false;showState();}
}
function cameraRay(clientX=canvas.clientWidth/2,clientY=canvas.clientHeight/2){
  const rect=canvas.getBoundingClientRect(),mouse=new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-((clientY-rect.top)/rect.height*2-1));
  const raycaster=new THREE.Raycaster();raycaster.setFromCamera(mouse,camera);raycaster.far=8;
  return raycaster;
}
async function mineRay(clientX,clientY){
  if(editing||owner.publicationFailed)return;
  const ray=cameraRay(clientX,clientY),worldHit=pickWorldSurface(actorRockSamples(owner.state.world),{
    originRelative:ray.ray.origin.toArray(),direction:ray.ray.direction.toArray(),origin:physics.origin,revision:owner.state.revision,maxDistance:8});
  const candidates=owner.state.actors.map(actor=>{const sample=actorRockSamples(actor);return {id:actor.id,contentRevision:actor.contentRevision,poseRevision:actor.poseRevision,
    pose:physics.pose(actor.id),readDensity:p=>readRockScalar(sample,p)};});
  const hit=pickActorSurface(candidates,{originRelative:ray.ray.origin.toArray(),direction:ray.ray.direction.toArray(),origin:physics.origin,maxDistance:8});
  if(hit&&(!worldHit||hit.distance<worldHit.distance)){
    const actor=candidates.find(a=>a.id===hit.actorId);if(!validateActorHit(hit,actor)){showState('Moving rock: aim again.');return;}
    const localDirection=worldToActorDirection(actor.pose,ray.ray.direction.toArray());
    const localHit=hit.localPoint.map((v,i)=>v+localDirection[i]*.12);
    return transition(s=>mineActorRock(s,hit.actorId,hit.contentRevision,localHit),{label:'Fallen rock mined'});
  }
  if(worldHit)return transition(s=>mineWorldRock(s,worldHit.localPoint),{worldChanged:true,label:'World rock mined'});
  showState('No rock under the pointer. Move closer or orbit the view.');return {status:'NO_HIT'};
}
let dragging=null;
canvas.addEventListener('pointerdown',event=>{dragging={x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,moved:false};canvas.setPointerCapture(event.pointerId);});
canvas.addEventListener('pointermove',event=>{if(!dragging)return;const dx=event.clientX-dragging.lastX,dy=event.clientY-dragging.lastY;
  if(Math.hypot(event.clientX-dragging.x,event.clientY-dragging.y)>4)dragging.moved=true;
  if(dragging.moved){yaw-=dx*.006;pitch=Math.max(-.1,Math.min(1.15,pitch+dy*.006));}
  dragging.lastX=event.clientX;dragging.lastY=event.clientY;});
canvas.addEventListener('pointerup',event=>{if(dragging&&!dragging.moved)void mineRay(event.clientX,event.clientY);dragging=null;});
canvas.addEventListener('wheel',event=>{distance=Math.max(4,Math.min(20,distance+event.deltaY*.01));event.preventDefault();},{passive:false});
const keys=new Set();window.addEventListener('keydown',event=>{if(['KeyW','KeyA','KeyS','KeyD','KeyF','KeyB'].includes(event.code)){keys.add(event.code);event.preventDefault();}
  if(event.code==='KeyF')followRock();if(event.code==='KeyE')void mineRay();if(event.code==='KeyB'&&!event.repeat)setWeaknessView();});window.addEventListener('keyup',event=>keys.delete(event.code));
function followRock(){const actor=owner.state.actors[0];if(!actor)return;const pose=physics.pose(actor.id);if(!pose)return;
  focus=actorToWorldPoint(pose,actor.localCOM);showState('Following the retained rock.');}
mineButton.addEventListener('click',()=>void mineRay());focusButton.addEventListener('click',followRock);debugButton.addEventListener('click',setWeaknessView);
saveButton.addEventListener('click',async()=>{if(editing)return;editing=true;showState('Saving actor poses…');try{
  const poses=owner.state.actors.map(a=>({id:a.id,contentRevision:a.contentRevision,...physics.pose(a.id)}));
  if(poses.length)await owner.saveCellularPoses(poses);location.reload();
}catch(error){errors.push(error.message);editing=false;showState(`Save failed: ${error.message}`);}});
let last=performance.now(),accumulator=0;function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;
  frameTimes.push(dt*1000);if(frameTimes.length>600)frameTimes.shift();
  if(!editing&&!owner.publicationFailed){accumulator+=dt;while(accumulator>=1/60){for(const id of physics.step()){
    disposeRender(shardRenders.get(id));shardRenders.delete(id);}accumulator-=1/60;}}
  for(let i=visualLive.length-1;i>=0;i--){const item=visualLive[i];item.ttl-=dt;item.mesh.position.x+=item.velocity[0]*dt;
    item.mesh.position.y+=item.velocity[1]*dt;item.mesh.position.z+=item.velocity[2]*dt;item.velocity[1]-=5*dt;
    if(item.ttl<=0){scene.remove(item.mesh);visualPool.push(item.mesh);visualLive.splice(i,1);}}
  const pace=dt*4;if(keys.has('KeyW'))focus[2]-=pace;if(keys.has('KeyS'))focus[2]+=pace;if(keys.has('KeyA'))focus[0]-=pace;if(keys.has('KeyD'))focus[0]+=pace;
  const target=focus.map((v,i)=>v-physics.origin[i]);camera.position.set(target[0]+Math.sin(yaw)*Math.cos(pitch)*distance,target[1]+Math.sin(pitch)*distance,target[2]+Math.cos(yaw)*Math.cos(pitch)*distance);
  camera.lookAt(...target);syncVisuals();const w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio())){
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  renderer.render(scene,camera);
}requestAnimationFrame(frame);
window.__cellularLab={get ready(){return ready},get state(){return owner.state},physics,get editing(){return editing},
  mineAtWorld:hit=>transition(s=>mineWorldRock(s,hit),{worldChanged:true,label:'Fixture world hit'}),
  mineActorLocal:(id,hit)=>transition(s=>{const actor=s.actors.find(a=>a.id===id);return mineActorRock(s,id,actor?.contentRevision,hit);},{label:'Fixture actor hit'}),
  focusAt:point=>{focus=[...point]},aim:(nextYaw,nextPitch)=>{yaw=nextYaw;pitch=nextPitch},
  report:()=>({namespace,revision:owner.state.revision,audit:quantityAudit(owner.state),actors:owner.state.actors.map(a=>({id:a.id,parentId:a.parentId,contentRevision:a.contentRevision,pose:physics.pose(a.id)})),retired:owner.state.retired,
    workerTimes,colliderTimes,saveTimes,editTimes,rockWorkMetrics,frameP95:[...frameTimes].sort((a,b)=>a-b)[Math.floor(frameTimes.length*.95)]??null,
    errors,bodyCount:physics.actors.size,transientShardBodies:physics.shards.size,pooledVisualDebris:visualLive.length,
    worldColliderRevision:physics.worldProduct?.revision,colliderCounts:[...physics.actors.values()].map(a=>a.hullCount),
    triangles:[worldRender,...actorRenders.values()].filter(Boolean).map(mesh=>mesh.geometry.index.count/3)})};
