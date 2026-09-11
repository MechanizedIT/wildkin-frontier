import test from 'node:test';
import assert from 'node:assert/strict';
import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {describeNaturalBoundary,createNaturalBoundary,NATURAL_BOUNDARY_CONFIG} from '../src/presentation/naturalBoundary.js';
import {getSurfaceHeight} from '../src/world/terrainSurfaceModel.js';
import {createPhysicsWorld} from '../src/physics/createPhysicsWorld.js';
import {initializePlayerOcclusion} from '../src/presentation/playerOcclusion.js';

const regions=JSON.parse(readFileSync(new URL('../src/world/data/world.json',import.meta.url),'utf8')).regions;

test('all authored region perimeters are continuous physical cliffs with a scenic reserve',async()=>{
  await RAPIER.init();
  for(const region of regions){
    const data=describeNaturalBoundary(region), group=createNaturalBoundary(region).group;
    const world=new RAPIER.World({x:0,y:0,z:0});
    world.createCollider(RAPIER.ColliderDesc.trimesh(data.vertices,data.indices));world.step();
    const b=region.bounds;
    // Sample every side every two metres, including segment joins and corners.
    for(let side=0;side<4;side++){
      const length=side%2?b.maxZ-b.minZ:b.maxX-b.minX;
      for(let t=6;t<=length-6;t+=2){
        const x=side===0?b.minX+t:side===1?b.maxX-6:side===2?b.maxX-t:b.minX+6;
        const z=side===0?b.minZ+6:side===1?b.minZ+t:side===2?b.maxZ-6:b.maxZ-t;
        const direction=[{x:0,y:0,z:-1},{x:1,y:0,z:0},{x:0,y:0,z:1},{x:-1,y:0,z:0}][side];
        const hit=world.castRay(new RAPIER.Ray({x,y:getSurfaceHeight(region.surface,x,z)+1,z},direction),7,true);
        assert.ok(hit,`${region.id} side ${side}, ${t}m has a physical face before the bounds`);
      }
    }
    for(const [x,z,dx,dz] of [[b.minX+6,b.minZ+6,-1,-1],[b.maxX-6,b.minZ+6,1,-1],[b.maxX-6,b.maxZ-6,1,1],[b.minX+6,b.maxZ-6,-1,1]]){
      assert.ok(world.castRay(new RAPIER.Ray({x,y:1,z},{x:dx,y:0,z:dz}),7,true),`${region.id} corner joins are solid`);
    }
    const positions=group.children.filter(mesh=>mesh.userData.naturalBoundary).flatMap(mesh=>Array.from(mesh.geometry.attributes.position.array));
    assert.equal(positions.length/3,data.indices.length,'visual uses every exact collider triangle');
    for(let i=0;i<data.indices.length;i++)for(let a=0;a<3;a++)assert.equal(positions[i*3+a],data.vertices[data.indices[i]*3+a]);
    assert.ok(group.children.length<=9,'bounded draws and independent foreground fade');
    assert.ok(data.indices.length/3<1300,'bounded triangle cost');
    assert.ok(Math.max(...data.stations.map(s=>s.x+s.nx*NATURAL_BOUNDARY_CONFIG.skirt))>=b.maxX+32);
    const again=describeNaturalBoundary(JSON.parse(JSON.stringify(region)));
    assert.deepEqual(data.vertices,again.vertices,'Author export/reload deterministically preserves positions and height');
    for(const anchor of [...region.portalGates??[],...region.majorWaypoints??[],...region.entryPoints??[]]){
      let distance=Infinity;
      for(let i=0;i<data.stations.length;i++){
        const a=data.stations[i],b=data.stations[(i+1)%data.stations.length];
        const ax=a.x-a.nx*a.inset,az=a.z-a.nz*a.inset,bx=b.x-b.nx*b.inset,bz=b.z-b.nz*b.inset;
        const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((anchor.pos.x-ax)*dx+(anchor.pos.z-az)*dz)/(dx*dx+dz*dz)));
        distance=Math.min(distance,Math.hypot(anchor.pos.x-ax-t*dx,anchor.pos.z-az-t*dz));
      }
      assert.ok(distance>=3,`${anchor.id} keeps a three-metre arrival reserve`);
    }
    world.free();group.children.forEach(mesh=>mesh.geometry.dispose());group.children[0].material.dispose();
  }
});

test('natural landscape collision uses existing section activation, including resized exports',async()=>{
  await RAPIER.init();
  const narrow={...regions[0],id:'narrow',bounds:{minX:-20,maxX:20,minZ:-20,maxZ:20}};
  const wide={...narrow,id:'wide',bounds:{minX:-60,maxX:60,minZ:-70,maxZ:70}};
  const physics=createPhysicsWorld(RAPIER,{terrainSurfaces:[describeNaturalBoundary(narrow),describeNaturalBoundary(wide)],groundPatches:[],obstacles:[],platforms:[]});
  const ray=new RAPIER.Ray({x:14,y:1,z:0},{x:1,y:0,z:0});
  physics.setActiveSection('narrow');assert.ok(physics.world.castRay(ray,7,true));
  physics.setActiveSection('wide');assert.equal(physics.world.castRay(ray,7,true),null);
  assert.ok(physics.world.castRay(new RAPIER.Ray({x:54,y:1,z:0},{x:1,y:0,z:0}),7,true));
  physics.setActiveSection('narrow');assert.ok(physics.world.castRay(ray,7,true));
  physics.world.free();
});

test('foreground boundary fades for inward orbit and restores without touching inactive regions',()=>{
  const region=regions[0],scene=new THREE.Scene(),landscape=createNaturalBoundary(region).group;
  scene.add(landscape);const camera=new THREE.PerspectiveCamera();
  const player={x:region.bounds.maxX-3.5,y:.52,z:8};
  camera.position.set(region.bounds.maxX+5,4.5,8);camera.lookAt(player.x,player.y,player.z);
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const system=initializePlayerOcclusion({scene,camera,getPlayerPosition:()=>player});
  system.update(.11);
  assert.ok(landscape.children.some(mesh=>mesh.material.opacity===.25),'Explorer remains visible behind foreground terrain');
  assert.ok(landscape.children.some(mesh=>mesh.material.opacity===1),'Other landscape stretches remain solid');
  system.update(.11,{hidden:true});assert.ok(landscape.children.every(mesh=>mesh.material.opacity===1));
  landscape.visible=false;system.update(.11);assert.ok(landscape.children.every(mesh=>mesh.material.opacity===1));
  system.dispose();landscape.children.forEach(mesh=>mesh.geometry.dispose());landscape.children[0].material.dispose();
});
