// src/resources/resourceSystem.js — owns all harvest nodes, halos, respawn, degradation, Rapier colliders
import * as THREE from "three";
import { RESOURCE_TYPES, HARVEST_CONFIG, isHarvestCompatibleMode } from "./resourceConfig.js";
import { createResourceNode, hideOneChunk, showAllChunks } from "./createResourceNode.js";
import { isPlayerInsideColliderVolume, distance3D } from "./harvestLogic.js";

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
    nodes.push({ group, state, type, chunkMeshes, remnantMesh, haloMesh, respawnGroup, ticks, collider, remnantCollider, index: i, _pendingColliderRestore: false });
  }

  function getInteractionPoint(node) {
    const base = node.state.position;
    const h = node.type.interactionHeight ?? node.type.colliderCenterY ?? 0.5;
    return { x: base.x, y: (base.y ?? 0) + h, z: base.z };
  }

  function getEffectivePlayerPos(playerPos) {
    return { x: playerPos.x, y: playerPos.y ?? 0.5, z: playerPos.z };
  }

  function isSpeedAllowed(playerSpeed) {
    return (playerSpeed ?? 0) <= (HARVEST_CONFIG.harvestMaxHorizontalSpeed ?? 0.25) + 1e-6;
  }

  function getEligibleNodes(playerPos, playerMode, playerSpeed = 0, autoHarvestEnabled = true) {
    if (!autoHarvestEnabled) return [];
    if (!isHarvestCompatibleMode(playerMode)) return [];
    if (!isSpeedAllowed(playerSpeed)) return [];
    const pEff = getEffectivePlayerPos(playerPos);
    const res = [];
    for (const n of nodes) {
      if (n.state.nodeState !== "READY") continue;
      if (n.state.remainingChunks <= 0) continue;
      const interact = getInteractionPoint(n);
      const d = distance3D(interact, pEff);
      if (d <= HARVEST_CONFIG.harvestRadius) res.push({ node: n, dist: d });
    }
    res.sort((a, b) => a.dist - b.dist);
    return res.slice(0, HARVEST_CONFIG.maxTargetsPerSwing).map(r => r.node);
  }

  // Returns nodes whose halo should be visible — must match eligibility exactly
  function getHaloTargets(playerPos, playerMode, playerSpeed = 0, autoHarvestEnabled = true) {
    return getEligibleNodes(playerPos, playerMode, playerSpeed, autoHarvestEnabled);
  }

  function isRespawnVisible(node, playerPos) {
    const base = node.state.position;
    const nodeY = (base.y ?? 0) + (node.type.interactionHeight ?? 0.5) * 0.5;
    const pY = playerPos.y ?? 0.5;
    const dx = base.x - playerPos.x;
    const dy = nodeY - pY;
    const dz = base.z - playerPos.z;
    const d = Math.hypot(dx, dy, dz);
    return d <= (HARVEST_CONFIG.respawnIndicatorRadius ?? 4.0);
  }

  function applyHit(node, spawnPickup, spawnParticles, playSound) {
    if (node.state.nodeState !== "READY") return false;
    if (node.state.remainingChunks <= 0) return false;
    // Reduce chunk
    node.state.remainingChunks -= 1;
    hideOneChunk(node);
    node._wobbleTime = 0;
    node._wobbleAmount = node.type.id === "fiber" ? 0.18 : node.type.id === "stone" ? 0.12 : 0.15;
    node._flashTime = 0;

    // Spawn pickup/particles using actual world Y
    if (spawnPickup) spawnPickup(node);
    if (spawnParticles) spawnParticles(node, node.type.id === "fiber" ? 4 : 6);
    if (playSound) playSound(node.type.feedbackProfile, node.state.remainingChunks === 0);

    if (node.state.remainingChunks <= 0) {
      // Depleted
      node.state.nodeState = "RESPAWNING";
      node.state.respawnRemaining = node.type.respawnSeconds;
      for (const m of node.chunkMeshes) m.visible = false;
      if (node.remnantMesh) node.remnantMesh.visible = true;
      // Respawn group visibility handled by proximity in update — but ensure ticks prepared
      node.respawnGroup.visible = false;
      for (const t of node.ticks) { t.visible = true; t.material.opacity = 0.0; }
      node.haloMesh.visible = false;
      node.haloMesh.material.opacity = 0;
      // Collider lifecycle: remove full, NO remnant collider (Phase 2.1)
      if (node.collider) {
        try {
          physicsWorld.world.removeCollider(node.collider, true);
        } catch (_) {}
        physicsWorld.world.step();
        node.collider = null;
      }
      if (node.remnantCollider) {
        try { physicsWorld.world.removeCollider(node.remnantCollider, true); } catch (_) {}
        physicsWorld.world.step();
        node.remnantCollider = null;
      }
      node._pendingColliderRestore = false;
    }
    return true;
  }

  function tryRestoreCollider(node, playerPos) {
    if (!node.type.solid || !node.type.colliderHalfExtents) return true;
    if (isPlayerInsideColliderVolume(playerPos, node)) return false;
    if (node.collider) return true;
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
    return true;
  }

  function respawnNode(node, playerPos) {
    node.state.nodeState = "READY";
    node.state.remainingChunks = node.type.maxChunks;
    node.state.respawnRemaining = 0;
    showAllChunks(node);
    if (node.remnantMesh) node.remnantMesh.visible = false;
    node.respawnGroup.visible = false;
    for (const t of node.ticks) { t.material.opacity = 0; }
    // Try to restore collider safely
    const restored = tryRestoreCollider(node, playerPos);
    if (!restored) {
      // Defer: keep visual ready but pending collider
      node._pendingColliderRestore = true;
      // remain READY visually; collider will appear when player moves away
    } else {
      node._pendingColliderRestore = false;
    }
    node._respawnPop = 0;
  }

  function update(dt, playerPos, playerMode, playerSpeed = 0, autoHarvestEnabled = true) {
    timeAcc += dt;
    // Halo pulse handling
    const haloTargets = getHaloTargets(playerPos, playerMode, playerSpeed, autoHarvestEnabled);
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

      // Pending collider restore attempt (after respawn visuals already shown)
      if (n._pendingColliderRestore && n.state.nodeState === "READY") {
        const ok = tryRestoreCollider(n, playerPos);
        if (ok) n._pendingColliderRestore = false;
      }

      // respawn timer — progress continues regardless of visibility
      if (n.state.nodeState === "RESPAWNING") {
        n.state.respawnRemaining -= dt;
        const total = n.type.respawnSeconds;
        const progress = Math.max(0, Math.min(1, 1 - n.state.respawnRemaining / total));
        const ticksToShow = Math.floor(progress * n.ticks.length);
        for (let i = 0; i < n.ticks.length; i++) {
          n.ticks[i].material.opacity = i < ticksToShow ? 0.95 : 0.12;
          n.ticks[i].visible = true;
        }
        // Visibility of respawn ring uses 3D proximity
        const near = isRespawnVisible(n, playerPos);
        if (near) {
          if (!n.respawnGroup.visible) n.respawnGroup.visible = true;
          // fade opacity based on distance? Keep simple fully visible when near
          n.respawnGroup.visible = true;
        } else {
          n.respawnGroup.visible = false;
        }
        if (n.state.respawnRemaining <= 0) {
          respawnNode(n, playerPos);
        }
        // halos remain hidden while respawning
        n.haloMesh.visible = false;
        continue;
      }

      // Ensure respawn group hidden when not respawning
      if (n.respawnGroup.visible) n.respawnGroup.visible = false;

      // Halo visibility — gated by autoHarvest + speed + 3D distance
      if (haloSet.has(n)) {
        if (!n.haloMesh.visible) {
          n.haloMesh.visible = true;
          n.haloMesh.material.opacity = opacityPulse * 0.7;
        }
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

  return { nodes, getEligibleNodes, getHaloTargets, applyHit, update, getNodes, isRespawnVisible };
}
