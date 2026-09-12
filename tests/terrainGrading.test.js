import test from 'node:test';
import assert from 'node:assert/strict';
import {getSurfaceHeight,validateSurface,TERRAIN_LIMITS} from '../src/world/terrainSurfaceModel.js';
import {createAuthoredTerrain} from '../src/presentation/authoredTerrain.js';
import {replaceRegionLandscape} from '../src/author/landscapeDraft.js';

const surface=()=>({heights:[{x:0,z:0,rx:12,rz:15,height:8,plateau:.7}],water:[],detail:{grassDensity:0},routes:[{width:3,feather:2,points:[{x:-10,z:10,elevation:0},{x:0,z:10,elevation:3},{x:0,z:-10,elevation:8}]}]});
const close=(a,b)=>assert.ok(Math.abs(a-b)<.00001,`${a} != ${b}`);

test('contour ramp has continuous graded segments and full-width supported walking space',()=>{
  const s=surface();validateSurface(s);
  close(getSurfaceHeight(s,-5,10),1.5);close(getSurfaceHeight(s,-5,11.4),1.5);
  close(getSurfaceHeight(s,0,10),3);close(getSurfaceHeight(s,0,0),5.5);close(getSurfaceHeight(s,0,-10),8);
  close(getSurfaceHeight(s,0,9.999),3.00025);
  // Outside the ramp feather the original upland is preserved.
  close(getSurfaceHeight(s,5,0),8);
  close(getSurfaceHeight(JSON.parse(JSON.stringify(s)),0,0),5.5);
});

test('new graded heights use the same rendered terrain buffers exported to physics',()=>{
  const s=surface(),terrain=createAuthoredTerrain({id:'grade-proof',surface:s,bounds:{minX:-12,maxX:12,minZ:-12,maxZ:12}});
  for(let i=0;i<terrain.vertices.length;i+=3)close(terrain.vertices[i+1]+.018,getSurfaceHeight(s,terrain.vertices[i],terrain.vertices[i+2]));
  assert.ok(terrain.vertices.some((v,i)=>i%3===1&&v>7.9));
  terrain.group.traverse(node=>{node.geometry?.dispose();});
});

test('mixed, incomplete, unsafe and zero-length ramp grades reject before rebasing world objects',()=>{
  const original=surface(),badRoutes=[
    {...original.routes[0],elevation:2},
    {...original.routes[0],points:[{x:0,z:0,elevation:1},{x:3,z:0}]},
    {...original.routes[0],points:[{x:0,z:0,elevation:1},{x:0,z:0,elevation:8}]},
    {...original.routes[0],points:[{x:0,z:0,elevation:1},{x:3,z:0,elevation:Infinity}]},
  ];
  const world={regions:[{id:'s',props:[{id:'cache',pos:{x:0,y:.18,z:0}}]}]},prior=structuredClone(world);
  for(const r of badRoutes){assert.throws(()=>replaceRegionLandscape(world,'s',{...original,routes:[r]}));assert.deepEqual(world,prior);}
  assert.throws(()=>validateSurface({...original,heights:[{...original.heights[0],height:TERRAIN_LIMITS.maxHeight+1}]}));
});

test('Author graded-landscape apply, reversal and JSON retain cache, resource and return-spawn offsets',()=>{
  const world={regions:[{id:'s',props:[{id:'cache',pos:{x:0,y:.18,z:0}}],resources:[{id:'ore',pos:{x:0,y:.1,z:0}}],entryPoints:[{id:'return',pos:{x:0,y:0,z:0}}]}]};
  replaceRegionLandscape(world,'s',surface());
  close(world.regions[0].props[0].pos.y,5.68);close(world.regions[0].resources[0].pos.y,5.6);close(world.regions[0].entryPoints[0].pos.y,5.5);
  const roundtrip=JSON.parse(JSON.stringify(world));validateSurface(roundtrip.regions[0].surface);
  replaceRegionLandscape(roundtrip,'s',{heights:[],water:[],routes:[]});close(roundtrip.regions[0].props[0].pos.y,.18);close(roundtrip.regions[0].entryPoints[0].pos.y,0);
});

test('authored polygon shelves support asymmetric flat tops and reject crossed outlines atomically',()=>{
  const shelf={x:0,z:0,rx:10,rz:10,height:6,edgeWidth:2,outline:[{x:-1,z:-1},{x:.6,z:-1},{x:1,z:0},{x:.4,z:1},{x:-1,z:.5}]};
  const s={heights:[shelf],water:[],routes:[],detail:{grassDensity:0}};
  validateSurface(s);close(getSurfaceHeight(s,0,0),6);close(getSurfaceHeight(s,-9,0),3);close(getSurfaceHeight(s,9,9),0);
  const world={regions:[{id:'s',surface:{heights:[],water:[],routes:[]},props:[{id:'raised-cache',pos:{x:0,y:.18,z:0}}]}]};
  replaceRegionLandscape(world,'s',s);close(world.regions[0].props[0].pos.y,6.18);
  const prior=structuredClone(world),crossed={...s,heights:[{...shelf,outline:[{x:-1,z:-1},{x:1,z:1},{x:-1,z:1},{x:1,z:-1}]}]};
  assert.throws(()=>replaceRegionLandscape(world,'s',crossed),/crosses/);assert.deepEqual(world,prior);
  const copy=JSON.parse(JSON.stringify(world));validateSurface(copy.regions[0].surface);close(getSurfaceHeight(copy.regions[0].surface,0,0),6);
  const terrain=createAuthoredTerrain({id:'cliff-proof',surface:s,bounds:{minX:-10,maxX:10,minZ:-10,maxZ:10}});
  for(let i=0;i<terrain.vertices.length;i+=3)close(terrain.vertices[i+1]+.018,getSurfaceHeight(s,terrain.vertices[i],terrain.vertices[i+2]));
  terrain.group.traverse(node=>node.geometry?.dispose());
});

test('connected pools render their outer shoreline without bright internal rings',()=>{
  const water=[{x:-3,z:0,rx:6,rz:6,depth:.3},{x:3,z:0,rx:6,rz:6,depth:.3}];
  const terrain=createAuthoredTerrain({id:'creek-proof',surface:{heights:[],routes:[],water,detail:{grassDensity:0}},bounds:{minX:-10,maxX:10,minZ:-7,maxZ:7}});
  const rings=[];terrain.group.traverse(node=>{if(node.name==='water_outer_shore')rings.push(node);});
  assert.equal(rings.length,2);
  assert.ok(rings.every(ring=>ring.geometry.attributes.position.count<64*6));
  for(const ring of rings){const p=ring.geometry.attributes.position;for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i);
    assert.ok(!(Math.hypot((x+3)/6,z/6)<.83&&Math.hypot((x-3)/6,z/6)<.83),'no shoreline inside the connected water');
  }}
  terrain.group.traverse(node=>node.geometry?.dispose());
});
