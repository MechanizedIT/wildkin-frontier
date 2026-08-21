// src/resources/resourceSystem.js — owns all harvest nodes, halos, respawn, degradation, Rapier colliders
import * as THREE from "three";
import { RESOURCE_TYPES, HARVEST_CONFIG, isHarvestCompatibleMode } from "./resourceConfig.js";
import { createResourceNode, hideOneChunk, showAllChunks } from "./createResourceNode.js";

export function createResourceSystem(scene, physicsWorld, placements) {
  const nodes = [];
  let timeAcc = 0;

  // Create nodes from placements [{type, pos}]
  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    const { group, state, chunkMeshes, remnantMesh, haloMesh, respawnGroup, ticks } = createResourceNode(p.type, p.pos, i);
    scene.add(group);
    const type = RESOURCE_TYPES[p.type];
    let collider = null;
    let remnantCollider = null;
    if (type.solid && type.colliderHalfExtents) {
      const RAPIER = physicsWorld.RAPIER;
      const world = physicsWorld.world;
      const he = type.colliderHalfExtents;
      const baseY = p.pos.y ?? 0;
      const ty = baseY + type.colliderCenterY;
      const desc = RAPIER.ColliderDesc.cuboid(he.x, he.y, he.z)
        .setTranslation(p.pos.x, ty, p.pos.z)
        .setFriction(0.6)
        .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
      collider = world.createCollider(desc);
      world.step();
    }
    nodes.push({ group, state, type, chunkMeshes, remnantMesh, haloMesh, respawnGroup, ticks, collider, remnantCollider, index: i });
  }

  function getNodePosition(node) {
    return node.state.position;
  }

  function distanceXZ(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.hypot(dx, dz);
  }

  function getEligibleNodes(playerPos, playerMode) {
    if (!isHarvestCompatibleMode(playerMode)) return [];
    const res = [];
    for (const n of nodes) {
      if (n.state.nodeState !== "READY") continue;
      if (n.state.remainingChunks <= 0) continue;
      const d = distanceXZ(n.state.position, playerPos);
      if (d <= HARVEST_CONFIG.harvestRadius) res.push({ node: n, dist: d });
    }
    res.sort((a, b) => a.dist - b.dist);
    return res.slice(0, HARVEST_CONFIG.maxTargetsPerSwing).map(r => r.node);
  }

  // Returns nodes whose halo should be visible (all READY within radius, regardless of cap? Spec: each harvestable when close enough to be affected by next swing. If cap exists, only up to cap will be hit. Halo must accurately indicate which nodes will be affected by next swing. So show only those that would be hit.)
  function getHaloTargets(playerPos, playerMode) {
    return getEligibleNodes(playerPos, playerMode);
  }

  function applyHit(node, spawnPickup, spawnParticles, playSound) {
    if (node.state.nodeState !== "READY") return false;
    if (node.state.remainingChunks <= 0) return false;
    // Reduce chunk
    node.state.remainingChunks -= 1;
    const hitIndex = node.type.maxChunks - node.state.remainingChunks; // 1-based
    // Visual: hide one chunk with pop
    const hidden = hideOneChunk(node);
    if (hidden) {
      // small detach animation: we already hidden, but could spawn pop mesh
    }
    // Wobble main chunks slightly
    const wobbleTarget = node.group.userData.mainVisual ?? node.group;
    // simple scale pulse via tween handled in update loop per node? do immediate squash
    // will animate via node wobble timer
    node._wobbleTime = 0;
    node._wobbleAmount = node.type.id === "fiber" ? 0.18 : node.type.id === "stone" ? 0.12 : 0.15;
    node._flashTime = 0;

    // Spawn pickup at node position offset outward
    if (spawnPickup) spawnPickup(node);

    // Spawn particles
    if (spawnParticles) spawnParticles(node, node.type.id === "fiber" ? 4 : 6);

    // Sound
    if (playSound) playSound(node.type.feedbackProfile, node.state.remainingChunks === 0);

    if (node.state.remainingChunks <= 0) {
      // Depleted
      node.state.nodeState = "RESPAWNING";
      node.state.respawnRemaining = node.type.respawnSeconds;
      // Show remnant, hide remaining chunks already hidden, but ensure all chunks hidden
      for (const m of node.chunkMeshes) m.visible = false;
      if (node.remnantMesh) node.remnantMesh.visible = true;
      node.respawnGroup.visible = true;
      for (const t of node.ticks) { t.visible = true; t.material.opacity = 0.0; }
      // Hide halo
      node.haloMesh.visible = false;
      node.haloMesh.material.opacity = 0;
      // Collider lifecycle: remove full, add remnant if exists
      if (node.collider) {
        try {
          physicsWorld.world.removeCollider(node.collider, true);
        } catch (_) {}
        physicsWorld.world.step();
        node.collider = null;
      }
      if (node.type.solid && node.type.remnantColliderHalfExtents) {
        const RAPIER = physicsWorld.RAPIER;
        const he = node.type.remnantColliderHalfExtents;
        const baseY = node.state.position.y ?? 0;
        const ty = baseY + node.type.remnantCenterY;
        const desc = RAPIER.ColliderDesc.cuboid(he.x, he.y, he.z)
          .setTranslation(node.state.position.x, ty, node.state.position.z)
          .setFriction(0.6)
          .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
        node.remnantCollider = physicsWorld.world.createCollider(desc);
        physicsWorld.world.step();
      }
      // No harvesting while respawning
    }
    return true;
  }

  function respawnNode(node) {
    node.state.nodeState = "READY";
    node.state.remainingChunks = node.type.maxChunks;
    node.state.respawnRemaining = 0;
    showAllChunks(node);
    if (node.remnantMesh) node.remnantMesh.visible = false;
    node.respawnGroup.visible = false;
    for (const t of node.ticks) { t.material.opacity = 0; }
    // Collider: remove remnant, restore full
    if (node.remnantCollider) {
      try { physicsWorld.world.removeCollider(node.remnantCollider, true); } catch (_) {}
      physicsWorld.world.step();
      node.remnantCollider = null;
    }
    if (node.type.solid && node.type.colliderHalfExtents && !node.collider) {
      const RAPIER = physicsWorld.RAPIER;
      const he = node.type.colliderHalfExtents;
      const baseY = node.state.position.y ?? 0;
      const ty = baseY + node.type.colliderCenterY;
      const desc = RAPIER.ColliderDesc.cuboid(he.x, he.y, he.z)
        .setTranslation(node.state.position.x, ty, node.state.position.z)
        .setFriction(0.6)
        .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
      node.collider = physicsWorld.world.createCollider(desc);
      physicsWorld.world.step();
    }
    // Pop effect
    node._respawnPop = 0;
  }

  function update(dt, playerPos, playerMode) {
    timeAcc += dt;
    // Halo pulse handling
    const haloTargets = getHaloTargets(playerPos, playerMode);
    const haloSet = new Set(haloTargets);
    const pulseT = (Math.sin(timeAcc * (2 * Math.PI / HARVEST_CONFIG.haloPulseDuration)) * 0.5 + 0.5);
    const scalePulse = HARVEST_CONFIG.haloScaleMin + pulseT * (HARVEST_CONFIG.haloScaleMax - HARVEST_CONFIG.haloScaleMin);
    const opacityPulse = HARVEST_CONFIG.haloOpacityMin + pulseT * (HARVEST_CONFIG.haloOpacityMax - HARVEST_CONFIG.haloOpacityMin);

    for (const n of nodes) {
      // wobble animation
      if (n._wobbleTime !== undefined) {
        n._wobbleTime += dt;
        const dur = 0.22;
        if (n._wobbleTime < dur) {
          const t = n._wobbleTime / dur;
          const squash = Math.sin(t * Math.PI) * n._wobbleAmount;
          n.group.scale.set(1 + squash * 0.4, 1 - squash, 1 + squash * 0.4);
          // quick rotation impulse
          n.group.rotation.z = Math.sin(t * Math.PI * 2) * 0.08 * n._wobbleAmount * 5;
        } else {
          n.group.scale.set(1, 1, 1);
          n.group.rotation.z = 0;
          n._wobbleTime = undefined;
        }
      }
      // flash
      if (n._flashTime !== undefined) {
        n._flashTime += dt;
        if (n._flashTime < 0.12) {
          for (const m of n.chunkMeshes) if (m.visible) m.material.emissive?.set?.(0x333333);
        } else {
          for (const m of n.chunkMeshes) if (m.material.emissive) m.material.emissive.set(0x000000);
          n._flashTime = undefined;
        }
      }
      // respawn pop
      if (n._respawnPop !== undefined) {
        n._respawnPop += dt;
        const dur = 0.34;
        if (n._respawnPop < dur) {
          const t = n._respawnPop / dur;
          const s = 0.7 + Math.sin(t * Math.PI) * 0.35;
          n.group.scale.set(s, s, s);
        } else {
          n.group.scale.set(1, 1, 1);
          n._respawnPop = undefined;
        }
      }

      // respawn timer
      if (n.state.nodeState === "RESPAWNING") {
        n.state.respawnRemaining -= dt;
        const total = n.type.respawnSeconds;
        const progress = Math.max(0, Math.min(1, 1 - n.state.respawnRemaining / total));
        const ticksToShow = Math.floor(progress * n.ticks.length);
        for (let i = 0; i < n.ticks.length; i++) {
          n.ticks[i].material.opacity = i < ticksToShow ? 0.95 : 0.12;
          n.ticks[i].visible = true;
        }
        if (n.state.respawnRemaining <= 0) {
          respawnNode(n);
        }
        // halos remain hidden while respawning
        n.haloMesh.visible = false;
        continue;
      }

      // Halo visibility
      if (haloSet.has(n)) {
        if (!n.haloMesh.visible) {
          n.haloMesh.visible = true;
          n.haloMesh.material.opacity = opacityPulse * 0.7;
        }
        // fade in
        n.haloMesh.material.opacity += (opacityPulse - n.haloMesh.material.opacity) * Math.min(1, dt * 8);
        n.haloMesh.scale.set(scalePulse, 1, scalePulse);
      } else {
        if (n.haloMesh.visible) {
          n.haloMesh.material.opacity -= dt * 2.5;
          if (n.haloMesh.material.opacity <= 0.01) {
            n.haloMesh.visible = false;
            n.haloMesh.material.opacity = 0;
          }
        }
      }
    }
  }

  function getNodes() { return nodes; }

  function getInventoryCounts() { // not here, inventory in pickup system
    return null;
  }

  return { nodes, getEligibleNodes, getHaloTargets, applyHit, update, getNodes };
}
