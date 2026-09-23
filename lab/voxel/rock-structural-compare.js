import * as THREE from '../../vendor/three.module.js';
import { makeSupportedRockSamples } from './matter-fixtures.js';
import { cloneRockSamples } from './matter-ownership.js';
import { cutRockSamples, rockDomain } from './fracture-field.js';
import { conditionRockSamples } from './matter-conditioning.js';
import { rockProfileAtScale } from './matter-rock-profile.js';
import { meshRockSamples } from './matter-mesh.js';
import { analyzeRockConnectivity } from './matter-connectivity.js';

const query=new URLSearchParams(location.search),condition=query.get('condition')==='1',cutCount=Math.min(12,Math.max(0,Number(query.get('cuts')??12)));
document.querySelector('#subtitle').textContent=`Pure field comparison · ${condition?'local thickness conditioning':'unconditioned control'} · ${cutCount} central hits after the same side/neck/secondary hits`;
const hits=[[0,4,-1.55],[.5,1.5,0],[-.5,1.5,0],[1.55,4,0],
  [0,4,0],[0,4,-.5],[0,3,0],[0,5,0],[0,4.5,-.5],[0,5.5,0],
  [0,4,-1.5],[0,3,1],[0,4.5,-1.5],[0,5.5,1],[0,2.5,1],[0,3.5,1.5]];
const scene=new THREE.Scene();scene.background=new THREE.Color(0x10232b);
scene.add(new THREE.HemisphereLight(0xe3f2ff,0x334047,2));const light=new THREE.DirectionalLight(0xffdeb1,2.7);light.position.set(-6,12,8);scene.add(light);
const canvas=document.querySelector('#scene'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const camera=new THREE.PerspectiveCamera(50,1,.1,100);camera.position.set(5,7,17);camera.lookAt(0,3,0);
const results=[];
for(const [index,scale] of [1.5,2,2.5].entries()){
  const domain=rockDomain(9212026,scale),profile=rockProfileAtScale(scale);let sample=makeSupportedRockSamples(),conditioned=0;
  for(let i=0;i<4+cutCount;i++){
    const next=cloneRockSamples(sample),cut=cutRockSamples(next,domain,hits[i]);
    if(condition&&i>=4&&cut.changed){const result=conditionRockSamples(next,hits[i],profile,domain);if(result.status==='OK'){
      sample=result.sample;conditioned+=result.removedProbes;
    }else sample=next;
    }else sample=next;
  }
  const mesh=meshRockSamples(sample),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(mesh.positions,3));
  geometry.setAttribute('normal',new THREE.BufferAttribute(mesh.normals,3));geometry.setIndex(new THREE.BufferAttribute(mesh.indices,1));
  const object=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xb7cbd2,flatShading:true,side:THREE.DoubleSide,roughness:.9}));object.position.x=(index-1)*6.5;scene.add(object);
  const structural=analyzeRockConnectivity(sample,domain);results.push({scale,triangles:mesh.indices.length/3,components:structural.components?.map(c=>c.occupiedProbes),conditioned});
}
function draw(){const width=canvas.clientWidth,height=canvas.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.render(scene,camera);}
draw();window.addEventListener('resize',draw);window.__rockComparison={ready:true,condition,cutCount,results};
