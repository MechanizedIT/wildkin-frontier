import * as THREE from '../../vendor/three.module.js';
import R from '../../vendor/rapier.js';
import { collisionStudyFixtures, planOccupancyColliders, planEightSectorControl } from './rock-collision-study.js';
import { planRockColliders } from './matter-colliders.js';
import { auditPreparedRockCollision } from './matter-physics.js';
await R.init();
const fixtures=collisionStudyFixtures(),methods=['four-sector','eight-sector-tight','eight-sector','occupancy-median','occupancy-gap','occupancy-voronoi'];
const params=new URLSearchParams(location.search),select=document.querySelector('#fixture'),method=document.querySelector('#method');
for(const f of fixtures)select.add(new Option(f.name,f.name));for(const m of methods)method.add(new Option(m,m));
select.value=params.get('fixture')??'central-cut-2';method.value=params.get('method')??'occupancy-median';
const renderers=['visible','proxy','overlay'].map(id=>new THREE.WebGLRenderer({canvas:document.getElementById(id),antialias:true}));
renderers.forEach(r=>r.setPixelRatio(Math.min(devicePixelRatio,1.5)));
const palette=[0xffae7b,0x72d0bd,0xc09fec,0xe7cf72,0x81b9ee,0xdb90c0,0xc1dc8e,0xa5b5bf];let opposite=false;
function geometry(positions,indices){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(new THREE.Uint32BufferAttribute(indices,1));g.computeVertexNormals();return g;}
function draw(){
  const fixture=fixtures.find(f=>f.name===select.value),m=method.value,{mesh,record}=fixture,world=new R.World({x:0,y:0,z:0});
  const points=m==='four-sector'?planRockColliders(mesh,record.localCOM):m.startsWith('eight-sector')?planEightSectorControl(mesh,record.localCOM,m==='eight-sector-tight'?.1:.35):planOccupancyColliders(mesh,fixture.sample,m);
  const colliders=points.map(p=>world.createCollider(R.ColliderDesc.convexHull(p))),audit=auditPreparedRockCollision(R,mesh,record,colliders);
  document.getElementById('metrics').textContent=`${fixture.name} · ${m} · ${points.length} hulls · sampled ray error ${audit.maxGap.toFixed(3)} m · ${audit.passes?'legacy rays pass (full study still HOLD)':'fails 0.5 m legacy safety limit'}`;
  for(const [index,renderer] of renderers.entries()){
    const scene=new THREE.Scene();scene.background=new THREE.Color(0x10232b);scene.add(new THREE.HemisphereLight(0xe1f2ff,0x30434b,2.2));
    const light=new THREE.DirectionalLight(0xffdeb8,2.6);light.position.set(-5,10,-8);scene.add(light);
    const rockGeometry=geometry(mesh.positions,mesh.indices);
    if(index!==1)scene.add(new THREE.Mesh(rockGeometry,new THREE.MeshStandardMaterial({color:0xbac9cc,flatShading:true,side:THREE.DoubleSide,roughness:.9})));
    const resources=[rockGeometry];
    if(index!==0)colliders.forEach((c,i)=>{const g=geometry(c.vertices(),c.indices());resources.push(g);
      if(index===1)scene.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:palette[i],flatShading:true,side:THREE.DoubleSide,roughness:.8})));
      const edges=new THREE.EdgesGeometry(g);resources.push(edges);scene.add(new THREE.LineSegments(edges,new THREE.LineBasicMaterial({color:index===2?0xffae91:0x233239,depthTest:index!==2,transparent:index===2,opacity:index===2?.55:1})));
    });
    if(audit.worst&&Number.isFinite(audit.worst.proxy)){
      const {start,direction,visible,proxy}=audit.worst,p=d=>new THREE.Vector3(...start.map((v,i)=>v+direction[i]*d)),line=new THREE.BufferGeometry().setFromPoints([p(Math.min(proxy,visible)-.3),p(Math.max(proxy,visible)+.3)]);resources.push(line);
      scene.add(new THREE.Line(line,new THREE.LineBasicMaterial({color:0xff7597,depthTest:false})));
      for(const [distance,color] of [[proxy,0xff7597],[visible,0xffe26a]]){const g=new THREE.SphereGeometry(.065,10,8);resources.push(g);const dot=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color,depthTest:false}));dot.position.copy(p(distance));scene.add(dot);}
    }
    const camera=new THREE.PerspectiveCamera(37,1,.1,100);camera.position.set(opposite?-6:6,6.5,opposite?10:-10);camera.lookAt(0,3.8,0);
    const c=renderer.domElement;renderer.setSize(c.clientWidth,c.clientHeight,false);camera.aspect=c.clientWidth/c.clientHeight;camera.updateProjectionMatrix();renderer.render(scene,camera);
    scene.traverse(o=>{if(o.material)o.material.dispose();});resources.forEach(r=>r.dispose());
  }
  world.free();window.__rockCollisionStudy={ready:true,fixture:fixture.name,method:m,audit};
}
select.addEventListener('change',draw);method.addEventListener('change',draw);document.getElementById('view').addEventListener('click',()=>{opposite=!opposite;draw();});window.addEventListener('resize',draw);draw();
