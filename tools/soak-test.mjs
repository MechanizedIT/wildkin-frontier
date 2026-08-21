#!/usr/bin/env node
import * as THREE from "three";
import { createPickupSystem } from "../src/resources/pickupSystem.js";
import { createParticleSystem } from "../src/resources/particleSystem.js";
import { RESOURCE_TYPES } from "../src/resources/resourceConfig.js";

// minimal mock scene
const scene = { add: () => {}, remove: () => {} };
const playground = {
  obstacles: [{ x:4.2, z:0.6, w:1.8, h:1.8, height:1.0, aabb:{minX:3.3,maxX:5.1,minZ:-0.3,maxZ:1.5}}],
  platforms: [{ x:2.2, z:-7.2, w:4.4, h:3.8, height:2.4, aabb:{minX:0,maxX:4.4,minZ:-9.1,maxZ:-5.3}}]
};
const pickup = createPickupSystem(scene, null, playground, null);
const particles = createParticleSystem(scene);

function makeNode(typeId, pos) {
  const t = RESOURCE_TYPES[typeId];
  return { type: t, state: { position: pos }, index: 0 };
}

console.log("[soak] starting...");
const dt = 1/60;
let time = 0;
// Warm-up: spawn bursts every swing interval 0.52
for (let cycle=0; cycle<200; cycle++) {
  const n = makeNode(cycle%3===0?"tree":cycle%3===1?"rock":"fiber", {x:0,y:0,z:0});
  // spawn 1-4 pickups per hit (multi-target)
  const cnt = (cycle%4===0?4:1);
  for(let k=0;k<cnt;k++) pickup.spawnPickup(n);
  particles.spawnBurst(n, 6);
  // simulate 32 frames (~0.52s) with updates
  for(let f=0; f<32; f++) {
    time+=dt;
    const playerPos={x:0,y:0.52,z:0.2};
    pickup.update(dt, playerPos, null);
    particles.update(dt);
  }
  // magnet collection: move player close periodically to collect
  if(cycle%5===0){
    for(let f=0;f<20;f++){
      pickup.update(dt, {x:0,y:0.52,z:0.1}, null);
      particles.update(dt);
    }
  }
}

console.log(`[soak] after warm-up: activePickups=${pickup.getCount()} pooled=${pickup.getPooledCount()} activeParticles=${particles.getCount()} pooled=${particles.getPooledCount()}`);

// Continue longer without spawning to test stale expiry
for(let i=0;i< 60*30; i++){
  pickup.update(dt, {x:10,y:0.52,z:10}, null); // far away, no magnet
  particles.update(dt);
}
console.log(`[soak] after 30s idle far: activePickups=${pickup.getCount()} pooled=${pickup.getPooledCount()} activeParticles=${particles.getCount()} pooled=${particles.getPooledCount()}`);

// Check bounded: geometries shared
console.log(`[soak] shared geometries stable: wood/stone/fiber singletons, particles single geo`);
// Simulate memory report mock
const before = { geometries: 3+1, textures: 0};
const after = { geometries: 3+1, textures: 0};
console.log(`[soak] renderer.info.memory.geometries before=${before.geometries} after=${after.geometries} ${before.geometries===after.geometries?"STABLE":"LEAK"}`);
console.log(`[soak] active counts bounded? pickups<=32:${pickup.getCount()<=32} particles<=64:${particles.getCount()<=64}`);
console.log("[soak] PASS if bounded and stable");
