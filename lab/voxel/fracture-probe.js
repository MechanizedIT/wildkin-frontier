import * as THREE from '../../vendor/three.module.js';
import { meshSurfaceNets } from './surface-nets.js';
import { rockDomain, makeRockSamples, cutRockSamples } from './fracture-field.js';

const canvas=document.querySelector('#view'), renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x10232d);renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(43,1,.1,100);
camera.position.set(8,5,16);camera.lookAt(0,0,0);
scene.add(new THREE.HemisphereLight(0xd9efff,0x3a2920,2.0));
const sun=new THREE.DirectionalLight(0xffe4bf,2.3);sun.position.set(-2,8,9);scene.add(sun);

function sampleIndex(samples,p){
  const q=p.map((v,i)=>Math.round((v-samples.min[i])/samples.spacing));
  if(q.some((v,i)=>v<0||v>=samples.size[i]))return -1;
  return q[0]+samples.size[0]*(q[1]+samples.size[1]*q[2]);
}
function rockMesh(samples){
  const size=16,n=size+2,densities=new Float32Array(n**3),materials=new Uint8Array(n**3);
  for(let z=-1;z<=size;z++)for(let y=-1;y<=size;y++)for(let x=-1;x<=size;x++){
    const p=[(x-8)*.5,(y-8)*.5,(z-8)*.5],i=sampleIndex(samples,p),j=(x+1)+n*((y+1)+n*(z+1));
    densities[j]=i<0?2:samples.densities[i];materials[j]=densities[j]<0?1:0;
  }
  const g=meshSurfaceNets({size,densities,materials,spacing:.5}),geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(g.positions,3));
  geometry.setAttribute('normal',new THREE.BufferAttribute(g.normals,3));
  geometry.setAttribute('color',new THREE.BufferAttribute(g.colors,3));geometry.setIndex(new THREE.BufferAttribute(g.indices,1));
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92,metalness:0,flatShading:true,side:THREE.DoubleSide}));
  mesh.position.set(-4,-4,-4);return mesh;
}
const domain=rockDomain(9212026), hit=[1.55,0,0];
const cellular=makeRockSamples(), sphere=makeRockSamples(), cube=makeRockSamples();
const cellResult=cutRockSamples(cellular,domain,hit);
for(const samples of [sphere,cube])for(let i=0;i<samples.densities.length;i++){
  const p=samples.position(i),q=p.map((v,k)=>v-hit[k]);
  const mask=samples===sphere ? 1.18-Math.hypot(...q) : Math.min(.85-Math.abs(q[0]),.85-Math.abs(q[1]),.85-Math.abs(q[2]));
  if(mask>0){samples.densities[i]=Math.max(samples.densities[i],mask);samples.materials[i]=samples.densities[i]<0?1:0;}
}
for(const [i,samples] of [cellular,sphere,cube].entries()){
  const mesh=rockMesh(samples);mesh.name='comparison-rock';mesh.position.x+=(i-1)*5.1;scene.add(mesh);
  const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(1.4,1.7,.2,12),new THREE.MeshStandardMaterial({color:0x405663,roughness:1}));
  pedestal.position.set((i-1)*5.1,-2.05,0);scene.add(pedestal);
}
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera);}
window.addEventListener('resize',resize);resize();
window.__fractureProbe={cellResult,triangleCount:scene.children.filter(o=>o.name==='comparison-rock').map(o=>o.geometry.index.count/3)};
