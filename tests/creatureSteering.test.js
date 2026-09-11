import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import R from '@dimforge/rapier3d-compat';
import {createCreatureSystem} from '../src/creatures/creatureSystem.js';

await R.init();

function approach({start, target, scale = 1, sensor = false}) {
  const world = new R.World({x:0,y:0,z:0});
  const scene = new THREE.Scene();
  world.createCollider(R.ColliderDesc.cuboid(20,.25,20).setTranslation(0,-.25,0));
  world.createCollider(R.ColliderDesc.cuboid(.58,.26,.58).setTranslation(0,.26,0).setSensor(sensor));
  const system = createCreatureSystem(scene,{world,RAPIER:R},null,{spawns:[{
    id:'moss',type:'rusher',pos:{x:start.x,y:0,z:start.z},uniformScale:scale,temperament:'SKITTISH',
  }]});
  const creature = system.getCreatures()[0];
  system.setPlayerPos({x:10,y:.5,z:10});
  system.setFieldTamingIntent('moss',{targetPos:target,speed:1,stopDistance:.4});
  try {
    for(let i=0;i<600;i++) system.update(1/60);
    return Math.hypot(creature.state.pos.x-target.x,creature.state.pos.z-target.z);
  } finally { system.dispose(); world.free(); }
}

test('wildlife reaches a field target around a solid root from each cardinal direction', () => {
  for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
    const start={x:Math.sin(angle)*2,z:Math.cos(angle)*2};
    const target={x:-start.x,y:0,z:-start.z};
    assert.ok(approach({start,target})<.45,`approach angle ${angle} must clear the root`);
  }
});

test('a scaled Mossling can leave the creek-root edge where the earned tame stalled', () => {
  const distance=approach({start:{x:-.87146377,z:.69232562},target:{x:-1.00270056,y:0,z:-1.87942677},scale:.9});
  assert.ok(distance<.45,`must reach the food, remaining ${distance}m`);
});

test('a region sensor never makes a clear field approach act like a wall', () => {
  assert.ok(approach({start:{x:0,z:2},target:{x:0,y:0,z:-2},sensor:true})<.45);
});
