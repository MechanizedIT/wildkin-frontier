// src/resources/resourceSystem.js — owns all harvest nodes, halos, respawn, degradation, Rapier colliders
import * as THREE from "three";
import { RESOURCE_TYPES, HARVEST_CONFIG, createVisualAssetResourceType, isHarvestCompatibleMode } from "./resourceConfig.js";
import { createResourceNode, hideOneChunk, showAllChunks } from "./createResourceNode.js";
import { isPlayerInsideColliderVolume, distance3D, getHarvestInteractionPoint, isHarvestableInRange as isNodeInRange, isRespawnIndicatorVisible } from "./harvestLogic.js";
import { describeResourceCollider, describeVisualAssetCollider, getColliderCenter, getColliderHalfExtents } from "../world/colliderDescriptor.js";

export function createRuntimeResourcePlacements(resources = []) {
  return resources.map((resource) => {
    const visualAsset = resource.visualAsset ?? null;
    const remnantVisualAsset = resource.remnantVisualAsset ?? null;
    return {
      type: resource.type,
      pos: { ...resource.pos },
      regionId: resource.regionId ?? resource.region ?? null,
      id: resource.id,
      rotY: resource.rotY ?? resource.rotationY ?? 0,
      uniformScale: resource.uniformScale ?? resource.scale ?? 1,
      visualAsset,
      remnantVisualAsset,
      resourceType: visualAsset ? createVisualAssetResourceType(visualAsset, remnantVisualAsset) : null,
      resourceDrop: resource.resourceDrop ?? null,
      visibleInPlay: resource.visibleInPlay !== false,
      collisionEnabled: resource.collisionEnabled !== false,
      opacity: resource.opacity ?? 1,
      tint: resource.color ?? resource.tint,
    };
  });
}

export function createResourceSystem(scene, physicsWorld, placements, { hasPendingYield = () => false } = {}) {
  const nodes = [];
  let timeAcc = 0;
  let activeRegionSet = null; // null = all active (backwards compat for tests without region manager)
  let regionInactiveMap = new Map(); // node index -> bool whether collider removed due to region

  function createRuntimeCollider(typeId, state, type) {
    const descriptor = type?.assetCollision
      ? describeVisualAssetCollider({
          collision: type.assetCollision,
          uniformScale: state.uniformScale ?? 1,
          position: state.position,
          rotationY: state.rotationY ?? 0,
        })
      : describeResourceCollider({
          typeId,
          uniformScale: state.uniformScale ?? 1,
          position: state.position,
          rotationY: state.rotationY ?? 0,
        });
    if (!descriptor.enabled || descriptor.shape !== "box") return null;
    const center = getColliderCenter(descriptor);
    const half = getColliderHalfExtents(descriptor);
    const yaw = descriptor.rotationY ?? 0;
    const colliderDesc = physicsWorld.RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z)
      .setTranslation(center.x, center.y, center.z);
    colliderDesc.setRotation?.({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
    colliderDesc
      .setFriction(0.6)
      .setActiveCollisionTypes(physicsWorld.RAPIER.ActiveCollisionTypes.ALL);
    return physicsWorld.world.createCollider(colliderDesc);
  }

  // Create nodes from placements [{type, pos, regionId?, id?}]
  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    const regionId = p.regionId ?? p.region ?? null;
    const nodeId = p.id ?? `${p.type}_${i}`;
    const transform = {
      rotationY: p.rotY ?? p.rotationY ?? 0,
      uniformScale: p.uniformScale ?? p.scale ?? 1,
    };
    transform.resourceType = p.resourceType ?? undefined;
    transform.visualAsset = p.visualAsset ?? undefined;
    transform.remnantVisualAsset = p.remnantVisualAsset ?? undefined;
    const { group, state, chunkMeshes, feedbackMaterials, remnantMesh, haloMesh, respawnGroup, ticks, visualRoot } = createResourceNode(p.type, p.pos, i, nodeId, transform);
    state.regionId = regionId;
    group.userData.authorId = nodeId;
    group.userData.resourceId = nodeId;
    group.visible = p.visibleInPlay !== false;
    const opacity = p.opacity ?? 1;
    if (p.tint !== undefined || opacity < 1) {
      for (const { material } of feedbackMaterials) {
        if (p.tint !== undefined && material.color) material.color.set(p.tint);
        if (opacity < 1) {
          material.transparent = true;
          material.opacity = opacity;
        }
      }
    }
    // Make whole group pickable via raycast (propagate authorId to children for reliable selection)
    group.traverse((child) => { if (child.isMesh) { child.userData.authorId = nodeId; child.userData.resourceId = nodeId; } });
    scene.add(group);
    const type = p.resourceType ?? RESOURCE_TYPES[p.type];
    let collider = null;
    let remnantCollider = null;
    if (p.collisionEnabled !== false && type.solid && type.colliderHalfExtents) {
      collider = createRuntimeCollider(p.type, state, type);
      physicsWorld.world.step();
    }
    nodes.push({ group, visualRoot, state, type, chunkMeshes, feedbackMaterials, remnantMesh, haloMesh, respawnGroup, ticks, collider, remnantCollider, index: i, _pendingColliderRestore: false, regionId, id: nodeId, _regionInactive: false, visibleInPlay: p.visibleInPlay !== false, collisionEnabled: p.collisionEnabled !== false });
  }

  function isRegionActive(regionId) {
    if (activeRegionSet === null) return true;
    if (!regionId) return true; // global
    return activeRegionSet.has(regionId);
  }

  function setActiveRegions(activeSet) {
    // activeSet is Set of region ids or array
    const nextSet = activeSet ? new Set(activeSet) : null;
    const prevSet = activeRegionSet;
    activeRegionSet = nextSet;
    // Apply activation changes only when set changes — deterministic, no duplicate creation
    for (const n of nodes) {
      const wasActive = prevSet === null ? true : (n.regionId ? prevSet.has(n.regionId) : true);
      const isActive = isRegionActive(n.regionId);
      if (wasActive && !isActive) {
        // Deactivating
        n._regionInactive = true;
        n.group.visible = false;
        n.haloMesh.visible = false;
        n.respawnGroup.visible = false;
        if (n.collider) {
          try { physicsWorld.world.removeCollider(n.collider, true); } catch (_) {}
          physicsWorld.world.step();
          regionInactiveMap.set(n.index, true);
          n.collider = null;
        }
        if (n.remnantCollider) {
          try { physicsWorld.world.removeCollider(n.remnantCollider, true); } catch (_) {}
          physicsWorld.world.step();
          n.remnantCollider = null;
        }
      } else if (!wasActive && isActive) {
        // Reactivating — restore visuals without duplication
        n._regionInactive = false;
        n.group.visible = n.visibleInPlay;
        // Halo/respawn visibility will be handled in next update based on state
        // Restore collider if READY and solid and not pending due to player overlap
        if (n.state.nodeState === "READY" && n.type.solid && n.type.colliderHalfExtents && !n.collider) {
          // Only restore if not depleted
          const wasRemovedForRegion = regionInactiveMap.get(n.index);
          if (wasRemovedForRegion) {
            regionInactiveMap.delete(n.index);
            // Defer restore to next update's pending logic via tryRestoreCollider with player pos check
            // Mark pending so update will try to restore safely
            n._pendingColliderRestore = true;
            // We will attempt immediate restore if player not inside — but we don't have playerPos here
            // Leave pending true and let update handle
          }
        }
        // Ensure remnant not visible if READY
        if (n.state.nodeState === "READY" && n.remnantMesh) n.remnantMesh.visible = false;
      }
    }
  }

  function getEffectivePlayerPos(playerPos) {
    return { x: playerPos.x, y: playerPos.y ?? 0.5, z: playerPos.z };
  }

  function isSpeedAllowed(playerSpeed) {
    return (playerSpeed ?? 0) <= (HARVEST_CONFIG.harvestMaxHorizontalSpeed ?? 0.25) + 1e-6;
  }

  function isHarvestableInRange(node, playerPos) {
    if (hasPendingYield(node)) return false;
    if (node._regionInactive) return false;
    if (!isRegionActive(node.regionId)) return false;
    return isNodeInRange(node, playerPos);
  }

  function canAutoHarvestNow(node, playerPos, playerMode, playerSpeed = 0, autoHarvestEnabled = true) {
    if (!isHarvestableInRange(node, playerPos)) return false;
    if (!isHarvestCompatibleMode(playerMode)) return false;
    if (!isSpeedAllowed(playerSpeed)) return false;
    if (!autoHarvestEnabled) return false;
    return true;
  }

  function getEligibleNodes(playerPos, playerMode, playerSpeed = 0, autoHarvestEnabled = true) {
    if (!autoHarvestEnabled) return [];
    if (!isHarvestCompatibleMode(playerMode)) return [];
    if (!isSpeedAllowed(playerSpeed)) return [];
    return getManualTargets(playerPos);
  }

  function getManualTargets(playerPos) {
    const pEff = getEffectivePlayerPos(playerPos);
    const res = [];
    for (const n of nodes) {
      if (isHarvestableInRange(n, playerPos)) res.push({ node: n, dist: distance3D(getHarvestInteractionPoint(n, playerPos), pEff) });
    }
    res.sort((a, b) => a.dist - b.dist);
    return res.slice(0, HARVEST_CONFIG.maxTargetsPerSwing).map(r => r.node);
  }

  // Halo visibility: harvestable in range (READY + 3D range) while Auto ON, independent of speed/mode
  function getHaloTargets(playerPos, playerMode, playerSpeed = 0, autoHarvestEnabled = true) {
    if (!autoHarvestEnabled) return [];
    return getManualTargets(playerPos);
  }

  function isRespawnVisible(node, playerPos) {
    return isRespawnIndicatorVisible(node, playerPos);
  }

  function applyHit(node, spawnPickup, spawnParticles, playSound) {
    if (hasPendingYield(node)) return false;
    if (node._regionInactive || !isRegionActive(node.regionId)) return false;
    if (node.state.nodeState !== "READY") return false;
    if (node.state.remainingChunks <= 0) return false;
    // Reduce chunk
    node.state.remainingChunks -= 1;
    hideOneChunk(node, Math.ceil(node.state.remainingChunks / node.state.maxChunks * node.chunkMeshes.length));
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
      node.visualRoot.visible = false;
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
    if (!node.collisionEnabled) return true;
    if (!node.type.solid || !node.type.colliderHalfExtents) return true;
    if (isPlayerInsideColliderVolume(playerPos, node)) return false;
    if (node.collider) return true;
    const RAPIER = physicsWorld.RAPIER;
    node.collider = createRuntimeCollider(node.state.typeId, node.state, node.type);
    physicsWorld.world.step();
    return true;
  }

  function respawnNode(node, playerPos) {
    node.state.nodeState = "READY";
    node.state.remainingChunks = node.type.maxChunks;
    node.state.respawnRemaining = 0;
    showAllChunks(node);
    node.visualRoot.visible = true;
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

  function resetDepleted() {
    for (const n of nodes) {
      if (n.state.nodeState === 'RESPAWNING' && !hasPendingYield(n)) {
        n.state.nodeState = 'READY';
        n.state.remainingChunks = n.type.maxChunks;
        n.state.respawnRemaining = 0;
        showAllChunks(n);
        n.visualRoot.visible = true;
        n.remnantMesh.visible = false;
        n.respawnGroup.visible = false;
        // Inactive nodes retain this intent until their region resumes. They
        // may already have lost the collider through depletion, not culling.
        if (n.collisionEnabled && n.type.solid && !n.collider) n._pendingColliderRestore = true;
      }
      n._wobbleTime = n._flashTime = n._respawnPop = undefined;
      n.visualRoot.scale.copy(n.group.userData.visualRootBaseScale);
      n.visualRoot.rotation.copy(n.group.userData.visualRootBaseRotation);
      for (const { material, emissive } of n.feedbackMaterials) if (emissive) material.emissive.copy(emissive);
      n.group.visible = !n._regionInactive && n.visibleInPlay;
    }
  }

  function update(dt, playerPos, playerMode, playerSpeed = 0, autoHarvestEnabled = true) {
    timeAcc += dt;
    // Halo pulse handling — only for active regions
    const haloTargets = getHaloTargets(playerPos, playerMode, playerSpeed, autoHarvestEnabled);
    const haloSet = new Set(haloTargets);
    const pulseT = (Math.sin(timeAcc * (2 * Math.PI / HARVEST_CONFIG.haloPulseDuration)) * 0.5 + 0.5);
    const scalePulse = HARVEST_CONFIG.haloScaleMin + pulseT * (HARVEST_CONFIG.haloScaleMax - HARVEST_CONFIG.haloScaleMin);
    const opacityPulse = HARVEST_CONFIG.haloOpacityMin + pulseT * (HARVEST_CONFIG.haloOpacityMax - HARVEST_CONFIG.haloOpacityMin);

    for (const n of nodes) {
      // Inactive regions: freeze all simulation (no harvest/respawn/pickup logic), keep hidden, skip timers
      if (n._regionInactive || !isRegionActive(n.regionId)) {
        // Keep group hidden (already set in setActiveRegions) and skip simulation
        // Ensure halos remain hidden
        if (n.haloMesh.visible) n.haloMesh.visible = false;
        if (n.respawnGroup.visible) n.respawnGroup.visible = false;
        // Skip wobble/flash/respawn timers while inactive — freeze
        continue;
      }
      // Ensure group visible when active (reactivated nodes may have been hidden)
      n.group.visible = n.visibleInPlay;
      // wobble animation
      if (n._wobbleTime !== undefined) {
        n._wobbleTime += dt;
        const dur = 0.22;
        if (n._wobbleTime < dur) {
          const t = n._wobbleTime / dur;
          const squash = Math.sin(t * Math.PI) * n._wobbleAmount;
          const baseScale = n.visualRootBaseScale ?? n.group.userData.visualRootBaseScale;
          const baseRotation = n.visualRootBaseRotation ?? n.group.userData.visualRootBaseRotation;
          n.visualRoot.scale.set(
            baseScale.x * (1 + squash * 0.4),
            baseScale.y * (1 - squash),
            baseScale.z * (1 + squash * 0.4),
          );
          n.visualRoot.rotation.z = baseRotation.z + Math.sin(t * Math.PI * 2) * 0.08 * n._wobbleAmount * 5;
        } else {
          n.visualRoot.scale.copy(n.visualRootBaseScale ?? n.group.userData.visualRootBaseScale);
          n.visualRoot.rotation.copy(n.visualRootBaseRotation ?? n.group.userData.visualRootBaseRotation);
          n._wobbleTime = undefined;
        }
      }
      // flash
      if (n._flashTime !== undefined) {
        n._flashTime += dt;
        if (n._flashTime < 0.12) {
          for (const { material } of n.feedbackMaterials) material.emissive?.set?.(0x333333);
        } else {
          for (const { material, emissive } of n.feedbackMaterials) if (emissive) material.emissive.copy(emissive);
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
          const baseScale = n.visualRootBaseScale ?? n.group.userData.visualRootBaseScale;
          n.visualRoot.scale.set(baseScale.x * s, baseScale.y * s, baseScale.z * s);
        } else {
          n.visualRoot.scale.copy(n.visualRootBaseScale ?? n.group.userData.visualRootBaseScale);
          n._respawnPop = undefined;
        }
      }

      // Pending collider restore attempt (after respawn visuals already shown) — only if region active
      if (n._pendingColliderRestore && n.state.nodeState === "READY") {
        const ok = tryRestoreCollider(n, playerPos);
        if (ok) {
          n._pendingColliderRestore = false;
          regionInactiveMap.delete(n.index);
        }
      }

      // respawn timer — progress only while active (freeze when inactive)
      if (n.state.nodeState === "RESPAWNING") {
        if (hasPendingYield(n)) {
          n.haloMesh.visible = false;
          n.respawnGroup.visible = false;
          continue;
        }
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
  function getActiveNodeCount() {
    if (activeRegionSet === null) return nodes.length;
    let c = 0;
    for (const n of nodes) if (isRegionActive(n.regionId)) c++;
    return c;
  }
  function getActiveNodes() {
    if (activeRegionSet === null) return [...nodes];
    return nodes.filter(n => isRegionActive(n.regionId));
  }

  return { nodes, getManualTargets, getEligibleNodes, getHaloTargets, isHarvestableInRange, canAutoHarvestNow, applyHit, update, resetDepleted, getNodes, isRespawnVisible, setActiveRegions, isRegionActive, getActiveNodeCount, getActiveNodes, getActiveRegionSet: () => activeRegionSet ? new Set(activeRegionSet) : null };
}
