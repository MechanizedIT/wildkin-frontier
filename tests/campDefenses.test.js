import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { createCampDefenses, getCampDefensePlacements } from '../src/base/campDefenses.js';
import { CAMP_DEBRIS_IDS, createCampLayout, getCampBuildAreas, getCampPerimeter } from '../src/base/campLayout.js';
import { clearModelAssetCacheForTests, registerModelTemplateForTests } from '../src/assets/modelAssetRuntime.js';
import { getSurfaceHeight } from '../src/world/terrainSurfaceModel.js';

const base=(expanded=false,legacy=false)=>({structures:[],layout:{...createCampLayout(),yardExpanded:expanded,legacyApron:legacy,clearedDebrisIds:expanded?[...CAMP_DEBRIS_IDS]:[]}});
const inside=(areas,x,z)=>areas.some(a=>x>a.minX&&x<a.maxX&&z>a.minZ&&z<a.maxZ);

test('defense tiles cover each saved perimeter, with exterior braces and both permanent openings intact',()=>{
  for(const state of [base(),base(true),base(true,true)]) {
    const records=getCampDefensePlacements(state),areas=getCampBuildAreas(state);
    for(const segment of getCampPerimeter(state)) {
      const panels=records.filter(p=>p.segmentId===segment.id),length=Math.hypot(segment.b.x-segment.a.x,segment.b.z-segment.a.z);
      assert.ok(Math.abs(panels.reduce((sum,p)=>sum+p.span,0)-length)<1e-8);
      for(let i=0;i<panels.length;i++) {
        const p=panels[i];assert.ok(p.scaleX>=.7&&p.scaleX<=1.12);
        assert.equal(inside(areas,p.x+Math.sin(p.yaw)*.1,p.z+Math.cos(p.yaw)*.1),false,`${p.id} braces face exterior`);
        if(i)assert.ok(Math.abs(Math.hypot(p.x-panels[i-1].x,p.z-panels[i-1].z)-(p.span+panels[i-1].span)/2)<1e-8,'no horizontal gap between modules');
      }
    }
    assert.equal(records.some(p=>Math.abs(p.x)<1&&p.z===-9),false,'north entry remains open');
    assert.equal(records.some(p=>p.segmentId.startsWith('divider')), !state.layout.yardExpanded);
  }
});

test('all sampled panel and outboard shoe bottoms stay seated on terrain',()=>{
  const surface={heights:[{x:10,z:0,rx:8,rz:15,height:1.6,plateau:.4}]};
  for(const p of getCampDefensePlacements(base(),surface))for(const x of [-1.4,-1.22,0,1.22,1.4])for(const z of [-.2,0,.37,.64]) {
    const wx=p.x+x*p.scaleX*Math.cos(p.yaw)+z*Math.sin(p.yaw),wz=p.z-x*p.scaleX*Math.sin(p.yaw)+z*Math.cos(p.yaw);
    assert.ok(p.y<=getSurfaceHeight(surface,wx,wz)+1e-8,`${p.id} has no floating foot`);
  }
});

test('real Rapier compound braces, divider removal and suppression refresh queries once and preserve cached model resources',async()=>{
  await RAPIER.init();const world=new RAPIER.World({x:0,y:0,z:0});
  let steps=0;const originalStep=world.step.bind(world);world.step=()=>{steps++;originalStep();};
  const path='assets/models/emergency-barricade-v1/model.glb',template=new THREE.Group();
  const geometry=new THREE.BoxGeometry(2.8,1.7,.4),material=new THREE.MeshLambertMaterial({color:0xccccbb});
  const mesh=new THREE.Mesh(geometry,material);mesh.position.y=.85;template.add(mesh);
  let disposedGeometry=0,disposedMaterial=0;geometry.addEventListener('dispose',()=>disposedGeometry++);material.addEventListener('dispose',()=>disposedMaterial++);
  registerModelTemplateForTests(path,{scene:template,animations:[]});
  const registry={data:{visualAssets:[{id:'asset_emergency_barricade',model:{path,scale:1,pivot:{x:0,y:0,z:0}}}]},getSectionById:()=>({surface:null})};
  const scene=new THREE.Scene(),registered=new Set();let runtime;
  const ray=(origin,direction,length)=>world.castRay(new RAPIER.Ray(origin,direction),length,true);
  try {
    runtime=createCampDefenses({scene,registry,physicsWorld:{world,RAPIER},onVisualAdded:v=>registered.add(v),onVisualRemoving:v=>assert.equal(registered.delete(v),true)});
    const state=base();runtime.sync(state);assert.equal(world.colliders.len(),0,'suppressed initialization constructs no models or colliders');
    runtime.setVisible(true);assert.equal(steps,1);const initialCount=world.colliders.len();
    assert.equal(initialCount,getCampDefensePlacements(state).length*5+1);
    assert.ok(runtime.getConsoleAnchor());assert.equal(runtime.getConsoleVisual().name,'camp-yard-console');
    const panel=getCampDefensePlacements(state).find(p=>p.segmentId==='divider-west');
    const footX=panel.x+1.22*panel.scaleX;
    assert.ok(ray({x:footX,y:.06,z:panel.z+.8},{x:0,y:0,z:-1},.35),'low visible shoe is solid');
    assert.equal(ray({x:footX,y:1.1,z:panel.z+.8},{x:0,y:0,z:-1},.4),null,'no full-height invisible box above feet');
    assert.ok(ray({x:footX,y:.45,z:panel.z+.8},{x:0,y:0,z:-1},.45),'actual diagonal brace blocks its sloping volume');
    assert.equal(ray({x:panel.x,y:.45,z:panel.z+.8},{x:0,y:0,z:-1},.45),null,'between buttresses remains empty outside panel');
    assert.ok(ray({x:panel.x,y:1,z:10},{x:0,y:0,z:1},2),'inner divider is solid');
    assert.ok(ray({x:panel.x+panel.span/2,y:1,z:10},{x:0,y:0,z:1},2),'adjoining panel seam has solid support');
    assert.equal(ray({x:0,y:1,z:10},{x:0,y:0,z:1},2),null,'southern personnel opening is clear');
    assert.equal(ray({x:0,y:1,z:-10},{x:0,y:0,z:1},3),null,'north gate corridor is clear');
    const unchanged=steps;runtime.sync(state);runtime.setVisible(true);assert.equal(steps,unchanged,'unchanged sync never steps physics');
    runtime.setVisible(false);assert.equal(steps,unchanged+1);assert.equal(runtime.getConsoleAnchor(),null);
    assert.equal(ray({x:panel.x,y:1,z:10},{x:0,y:0,z:1},2),null,'hidden Camp disappears from queries immediately');
    const expanded=base(true);runtime.sync(expanded);assert.equal(world.colliders.len(),initialCount,'hidden sync defers rebuild');
    runtime.setVisible(true);assert.equal(steps,unchanged+2,'enable plus expansion refreshes once');
    assert.equal(ray({x:panel.x,y:1,z:10},{x:0,y:0,z:1},2),null,'obsolete divider removed from broadphase immediately');
    assert.ok(ray({x:0,y:1,z:30},{x:0,y:0,z:1},2),'saved extended south perimeter is solid');
    assert.equal(scene.getObjectByName(`camp-stake-${CAMP_DEBRIS_IDS[0]}`),undefined);
    runtime.setVisible(false);runtime.setVisible(true);assert.ok(ray({x:0,y:1,z:30},{x:0,y:0,z:1},2),'reactivation repopulates scene queries');
    const blocked=base(true);blocked.structures=[{type:'foundation',pos:{x:1.8,z:9.5},yaw:0},{type:'foundation',pos:{x:1.8,z:4.5},yaw:0},{type:'foundation',pos:{x:-1.8,z:4.5},yaw:0}];
    const countWithConsole=world.colliders.len();runtime.sync(blocked);
    assert.equal(runtime.getConsoleAnchor(),null);assert.equal(runtime.getConsoleVisual(),null);
    assert.equal(world.colliders.len(),countWithConsole-1,'occupied fallback anchors remove the console and collider together');
    runtime.dispose();assert.equal(world.colliders.len(),0);assert.equal(registered.size,0);assert.equal(scene.children.length,0);
    assert.equal(ray({x:0,y:1,z:30},{x:0,y:0,z:1},2),null,'disposal refreshes broadphase');
    assert.equal(disposedGeometry,0);assert.equal(disposedMaterial,0);runtime.dispose();
  } finally {runtime?.dispose();world.free();clearModelAssetCacheForTests();geometry.dispose();material.dispose();}
});

test('a suppressed Author draft needs no defense assets',()=>{
  const scene=new THREE.Scene(),runtime=createCampDefenses({scene,registry:{data:{visualAssets:[]},getSectionById:()=>({})}});
  runtime.sync(base());runtime.setVisible(false);assert.equal(scene.getObjectByName('camp-defenses').children.length,0);runtime.dispose();
});
