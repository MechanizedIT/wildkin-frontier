import {test} from 'node:test';
import assert from 'node:assert/strict';
import {replaceRegionLandscape} from '../src/author/landscapeDraft.js';
const pos=(y=0)=>({x:0,y,z:0});
const landscape={seed:8,heights:[{id:'hill',x:0,z:0,rx:5,rz:5,height:2,plateau:.4}],water:[],routes:[]};
test('landscape edits retain ground offsets across objects, platforms and all spawn paths',()=>{
  const region={id:'camp',props:[{id:'p',pos:pos(.3)}],resources:[{id:'r',pos:pos()}],creatures:[{id:'c',pos:pos(),homePos:pos()}],majorWaypoints:[{id:'wp',pos:pos(),runSpawn:{position:pos(.1)}}],parkourCheckpoints:[{id:'cp',pos:pos(),respawnPosition:pos(.02)}],killVolumes:[{id:'k',pos:pos(2)}],traversal:{platforms:[{id:'floor',x:0,z:0,y:0,baseY:.1,height:.5}],climbables:[{id:'l',x:0,z:0,bottomY:.1,topY:2.1}]},playerSpawn:{position:pos()}};
  const world={camp:{playerSpawn:{position:pos()}},regions:[region]};
  replaceRegionLandscape(world,'camp',landscape);
  assert.equal(region.props[0].pos.y,2.3);assert.equal(region.resources[0].pos.y,2);
  assert.equal(region.creatures[0].homePos.y,2);assert.equal(region.majorWaypoints[0].runSpawn.position.y,2.1);
  assert.equal(region.parkourCheckpoints[0].respawnPosition.y,2.02);assert.equal(region.killVolumes[0].pos.y,4);
  assert.equal(region.traversal.platforms[0].baseY,2.1);assert.equal(region.traversal.platforms[0].y,2.1);
  assert.equal(region.traversal.climbables[0].topY,4.1);assert.equal(world.camp.playerSpawn.position.y,2);
  replaceRegionLandscape(world,'camp',{...landscape,heights:[]});assert.equal(region.props[0].pos.y,.3);assert.equal(world.camp.playerSpawn.position.y,0);
});
test('invalid terrain cannot partially rebase a draft',()=>{
  const world={regions:[{id:'s1',props:[{pos:pos(.3)}]}]};const before=structuredClone(world);
  assert.throws(()=>replaceRegionLandscape(world,'s1',{...landscape,detail:{grassDensity:NaN}}));assert.deepEqual(world,before);
  assert.throws(()=>replaceRegionLandscape(world,'s1',{...landscape,detail:{groundcover:'unknown'}}));assert.deepEqual(world,before);
});
test('biome groundcover survives an Author landscape edit and JSON export',()=>{
  const world={regions:[{id:'s1',props:[]}]};
  replaceRegionLandscape(world,'s1',{...landscape,detail:{groundcover:'mineral',grassDensity:.44}});
  assert.deepEqual(JSON.parse(JSON.stringify(world)).regions[0].surface.detail,{groundcover:'mineral',grassDensity:.44});
});
