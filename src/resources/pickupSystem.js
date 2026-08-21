// src/resources/pickupSystem.js — visible pickups with launch + magnet + collection
import * as THREE from "three";
import { HARVEST_CONFIG } from "./resourceConfig.js";

export function createPickupSystem(scene, onInventoryChanged) {
  const pickups = [];
  const inventory = { wood: 0, stone: 0, fiber: 0 };
  let nextId = 0;

  function resourceIdToInventoryKey(resId) {
    return resId; // wood/stone/fiber already
  }

  function createPickupMesh(resourceId) {
    let geo, mat;
    if (resourceId === "wood") {
      geo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
      mat = new THREE.MeshStandardMaterial({ color: 0x8d5a2b, flatShading: true, emissive: 0x332000, emissiveIntensity: 0.18 });
    } else if (resourceId === "stone") {
      geo = new THREE.DodecahedronGeometry(0.12, 0);
      mat = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, flatShading: true });
    } else {
      geo = new THREE.SphereGeometry(0.11, 6, 5);
      geo.scale(1, 0.85, 1);
      mat = new THREE.MeshStandardMaterial({ color: 0x6abf69, flatShading: true, emissive: 0x123412, emissiveIntensity: 0.12 });
    }
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = false;
    // small glow
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 }));
    m.add(glow);
    m.userData.glow = glow;
    return m;
  }

  function spawnPickup(node) {
    const resId = node.type.resourceId;
    const mesh = createPickupMesh(resId);
    // start near hit position: slightly above node, lob outward
    const base = node.state.position;
    const angle = Math.random() * Math.PI * 2;
    const horiz = 0.25 + Math.random() * 0.25;
    const start = {
      x: base.x + Math.cos(angle) * horiz * 0.5,
      y: 0.55 + Math.random() * 0.25,
      z: base.z + Math.sin(angle) * horiz * 0.5,
    };
    mesh.position.set(start.x, start.y, start.z);
    scene.add(mesh);
    const outward = { x: Math.cos(angle) * HARVEST_CONFIG.pickupLaunchSpeed * (0.7 + Math.random() * 0.6), y: HARVEST_CONFIG.pickupLaunchUp + Math.random() * 0.8, z: Math.sin(angle) * HARVEST_CONFIG.pickupLaunchSpeed * (0.7 + Math.random() * 0.6) };
    const pickup = {
      id: nextId++,
      mesh,
      resourceId: resId,
      pos: new THREE.Vector3(start.x, start.y, start.z),
      vel: new THREE.Vector3(outward.x, outward.y, outward.z),
      age: 0,
      state: "LAUNCHED", // LAUNCHED -> RESTING -> MAGNETIZING -> COLLECTED
      collected: false,
      nodeIndex: node.index,
    };
    pickups.push(pickup);
    // small pop scale
    mesh.scale.set(0.2, 0.2, 0.2);
    pickup._popTime = 0;
    return pickup;
  }

  function collectPickup(pickup, playSound) {
    if (pickup.collected) return false;
    pickup.collected = true;
    const key = resourceIdToInventoryKey(pickup.resourceId);
    if (inventory[key] !== undefined) inventory[key] += 1;
    else inventory[pickup.resourceId] = (inventory[pickup.resourceId] ?? 0) + 1;
    if (onInventoryChanged) onInventoryChanged({ ...inventory }, pickup.resourceId);
    if (playSound) playSound(pickup.resourceId);
    // remove mesh next frame; for now hide
    pickup.mesh.visible = false;
    return true;
  }

  function update(dt, playerPos, playPickupSound) {
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      if (p.collected) {
        // remove from scene after a frame
        scene.remove(p.mesh);
        pickups.splice(i, 1);
        continue;
      }
      p.age += dt;
      // pop scale
      if (p._popTime !== undefined) {
        p._popTime += dt;
        const dur = 0.18;
        if (p._popTime < dur) {
          const t = p._popTime / dur;
          const s = 0.2 + (1 - 0.2) * (1 - Math.pow(1 - t, 3));
          p.mesh.scale.set(s, s, s);
        } else {
          p.mesh.scale.set(1, 1, 1);
          p._popTime = undefined;
        }
      }
      // bob/gentle spin
      p.mesh.rotation.y += dt * 3.2;
      p.mesh.rotation.x += dt * 1.4;

      if (p.state === "LAUNCHED") {
        // ballistic
        const gravity = -9.8;
        p.vel.y += gravity * dt;
        p.pos.x += p.vel.x * dt;
        p.pos.y += p.vel.y * dt;
        p.pos.z += p.vel.z * dt;
        // ground clamp 0.14
        if (p.pos.y <= 0.14) {
          p.pos.y = 0.14;
          p.vel.y = 0;
          p.vel.x *= 0.52;
          p.vel.z *= 0.52;
          // if slow enough, rest
          if (Math.hypot(p.vel.x, p.vel.z) < 0.3) {
            p.state = "RESTING";
            p.vel.set(0, 0, 0);
          }
        }
        p.mesh.position.copy(p.pos);
        // auto transition after 0.6s even if not grounded
        if (p.age > 0.6 && p.pos.y <= 0.35) p.state = "RESTING";
      } else if (p.state === "RESTING") {
        p.mesh.position.copy(p.pos);
        // check magnet eligibility
        const dx = playerPos.x - p.pos.x;
        const dz = playerPos.z - p.pos.z;
        const dy = (playerPos.y ?? 0.5) - p.pos.y;
        const dist = Math.hypot(dx, dz, dy * 0.5);
        if (p.age > HARVEST_CONFIG.magnetDelayAfterSpawn && dist <= HARVEST_CONFIG.pickupMagnetRadius) {
          p.state = "MAGNETIZING";
        } else {
          // gentle bob while resting
          p.mesh.position.y = p.pos.y + Math.sin(p.age * 3.2) * 0.04;
          p.mesh.userData.glow.material.opacity = 0.12 + Math.sin(p.age * 4) * 0.06;
        }
      }
      if (p.state === "MAGNETIZING") {
        const dx = playerPos.x - p.mesh.position.x;
        const dy = (playerPos.y ?? 0.52) - p.mesh.position.y;
        const dz = playerPos.z - p.mesh.position.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist < 0.32) {
          collectPickup(p, playPickupSound);
          continue;
        }
        // accelerate toward player
        const dir = new THREE.Vector3(dx, dy, dz).normalize();
        // speed increases with time magnetizing
        const speed = HARVEST_CONFIG.pickupMagnetSpeed + HARVEST_CONFIG.pickupMagnetAccel * Math.min(0.8, p.age);
        p.mesh.position.x += dir.x * speed * dt;
        p.mesh.position.y += dir.y * speed * dt;
        p.mesh.position.z += dir.z * speed * dt;
        // scale down slightly as it approaches? Keep visible
        // keep p.pos in sync for removal check
        p.pos.copy(p.mesh.position);
      }
      // cap pickups unbounded — if too many, oldest will be magnetized faster; but prevent leak: if age > 30s and not collected, keep but no auto-remove
    }
  }

  function getInventory() { return { ...inventory }; }
  function resetInventory() {
    inventory.wood = 0; inventory.stone = 0; inventory.fiber = 0;
    if (onInventoryChanged) onInventoryChanged({ ...inventory }, null);
  }
  function getPickups() { return pickups; }
  function getCount() { return pickups.length; }

  return { spawnPickup, collectPickup, update, getInventory, resetInventory, getPickups, getCount, inventory };
}
