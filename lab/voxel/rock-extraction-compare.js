import * as THREE from '../../vendor/three.module.js';
import { createInitialRockState, mineWorldRock, mineActorRock, actorRockSamples } from './matter-actor.js';
import { cloneRockSamples } from './matter-ownership.js';
import { cutRockSamples, rockDomain } from './fracture-field.js';
import { conditionRockSamples, normalizeRockScalarTopology } from './matter-conditioning.js';
import { ROCK_PROFILE } from './matter-rock-profile.js';
import { meshRockSamples } from './matter-mesh.js';

const condition=new URLSearchParams(location.search).get('condition')==='1',domain=rockDomain(9212026),options={conditioning:condition};
let state=createInitialRockState();for(const hit of [[0,4,-1.55],[.5,1.5,0],[-.5,1.5,0]])state=mineWorldRock(state,hit).state;
const first=mineActorRock(state,state.actors[0].id,state.actors[0].contentRevision,[1.55,4,0],options);
if(first.status!=='OK')throw Error(`first actor hit: ${first.status} ${first.reason}`);state=first.state;
let before,raw,children,splitStep;
window.__rockExtractionTrace=[];
const hits=[[0,4,0],[0,4,-.5],[0,3,0],[0,5,0],[0,4.5,-.5],[0,5.5,0],
  [0,4,-1.5],[0,3,1],[0,4.5,-1.5],[0,5.5,1],[0,2.5,1],[0,3.5,1.5]];
for(const [step,hit] of hits.entries()){
  const actor=state.actors[0],previous=actorRockSamples(actor),candidate=cloneRockSamples(previous),cut=cutRockSamples(candidate,domain,hit);
  if(cut.changed){const normalized=normalizeRockScalarTopology(candidate,hit,domain,ROCK_PROFILE);if(normalized.status!=='OK')throw Error(normalized.reason);
    if(condition){const result=conditionRockSamples(normalized.sample,hit,ROCK_PROFILE,domain);if(result.status!=='OK')throw Error(result.reason);raw=result.sample;}else raw=normalized.sample;
  }else raw=candidate;
  const edit=mineActorRock(state,actor.id,actor.contentRevision,hit,options);
  window.__rockExtractionTrace.push({step,hit,status:edit.status,rawTriangles:meshRockSamples(raw).indices.length/3,conditioned:edit.cut?.conditioned,
    beforeQuantity:state.rewards.stoneUnits,afterQuantity:edit.state.rewards.stoneUnits});
  if(edit.status!=='OK'&&edit.status!=='NO_HIT')throw Error(`step ${step} ${hit}: ${edit.status} ${edit.reason}`);
  if(edit.split){before=previous;children=edit.state.actors.map(actorRockSamples);splitStep=step;break;}state=edit.state;
}
if(!children)throw Error('No split in diagnostic sequence');
document.querySelector('#subtitle').textContent=`${condition?'Conditioned rock':'Original rock'} · seed 9212026 · final split on central hit ${splitStep+1} · fixed camera and sample frame`;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x10232b);scene.add(new THREE.HemisphereLight(0xe3f2ff,0x334047,2));
const light=new THREE.DirectionalLight(0xffdeb1,2.7);light.position.set(-6,12,8);scene.add(light);
const canvas=document.querySelector('#scene'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const camera=new THREE.PerspectiveCamera(42,1,.1,100);camera.position.set(7,8,18);camera.lookAt(0,4,0);
function add(sample,x,color){const mesh=meshRockSamples(sample),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(mesh.positions,3));
  geometry.setAttribute('normal',new THREE.BufferAttribute(mesh.normals,3));geometry.setIndex(new THREE.BufferAttribute(mesh.indices,1));
  const object=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,flatShading:true,side:THREE.DoubleSide,roughness:.9}));object.position.x=x;scene.add(object);return mesh.indices.length/3;}
const counts=[add(before,-5.7,0xb8cbd2),add(raw,0,0xb8cbd2),children.reduce((n,child,i)=>n+add(child,5.7,i?0xaabfc8:0xe2e9e6),0)];
function draw(){renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.updateProjectionMatrix();renderer.render(scene,camera);}
draw();window.addEventListener('resize',draw);window.__rockExtractionComparison={ready:true,condition,splitStep,triangles:counts};
