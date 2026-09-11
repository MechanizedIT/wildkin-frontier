import * as THREE from "three";
import { COMPANIONS, COMPANION_BY_ID, identifyCompanion, SECRET_COMPANION } from "./companionCatalog.js";
import { canBond } from "./bondingLogic.js";
import { createVisualAssetVisual } from "../world/visualFactory.js";
import { createVisualAnimationController, disposeExternalModelInstance } from "../assets/modelAssetRuntime.js";
import { createFieldTaming, getFieldTamingRange } from "./fieldTaming.js";
import { createFieldTamingVisual, findFieldPlacement } from "./fieldTamingVisual.js";
import { getSurfaceHeight } from "../world/terrainSurfaceModel.js";
import { createCompanionPhysics, COMPANION_PHYSICS_TUNING } from "./companionPhysics.js";
import { deriveCompanionFollowIntent, getCompanionFormationAnchor, MOSSLING_FOLLOW_TUNING } from "./companionFollowIntent.js";
import { MOSSLING_MOTION } from "../creatures/mosslingMotion.js";

export function createCompanionSystem({ app, scene, registry, progress, creatures, playerController, playerCombat, physicsWorld, playerCollider = null, hasCacheMechanism = () => false, isActive, getSectionId, onBlockingChanged, toast, pulse, audio, onAbility = () => {} }) {
  let pending = [], cooldown = 0, elapsed = 0, fixedElapsed = 0;
  const followers = new Map();
  const wardRoots = new Map();
  const fieldVisual = createFieldTamingVisual(scene);
  function eligibility(target, species) {
    const state = progress.getState();
    return canBond({ speciesId: species?.id, secured: state.securedCompanions, pending, capacity: progress.getModifiers().captureCapacity, damaged: target?.state.playerDamaged, active: isActive() });
  }
  const fieldTaming = createFieldTaming({
    getPlayer: playerController.getState,
    getTarget: id => creatures.getActiveAliveCreatures().find(c => c.state.id === id),
    getSectionId, isActive, canStart: eligibility,
    consume: id => progress.consumeFieldSupply(id),
    placePoint: (player, target, secondPerch) => findFieldPlacement({ player, target, registry, sectionId: getSectionId(), physicsWorld, secondPerch,
      ignoreCollider: candidate => candidate.handle === playerCollider?.handle || creatures.getCreatures().some(c => c.collider?.handle === candidate.handle) || [...followers.values()].some(c => c.physics?.collider?.handle === candidate.handle) }),
    setIntent: (id, intent) => creatures.setFieldTamingIntent(id, intent),
    clearIntent: id => creatures.clearFieldTamingIntent(id),
    capture(id, species) {
      creatures.setBondingTarget(id);
      const target = creatures.secureBondTarget(id);
      creatures.setBondingTarget(null);
      if (!target) return false;
      pending.push(species.id);
      pulse(target.state.pos, new THREE.Color(species.color).getHex());
      toast(`${species.name} bonded`, "Bring them home to secure your bond.");
      return true;
    },
    onMessage: toast, onVisual(state) {
      if (state?.speciesId === "emberhorn") state.point.y = getSurfaceHeight(registry.getSectionById(getSectionId())?.surface, state.point.x, state.point.z);
      fieldVisual.update(state);
    },
  });
  for (const species of COMPANIONS) {
    const chest = registry.getLootChestById(species.secret);
    if (!chest || hasCacheMechanism(chest.id)) continue;
    const root = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.035, 6, 32), new THREE.MeshBasicMaterial({ color: species.color, transparent: true, opacity: 0.65 }));
    ring.rotation.x = Math.PI / 2;
    root.add(ring);
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), new THREE.MeshStandardMaterial({ color: species.color, emissive: species.color, emissiveIntensity: 0.5, flatShading: true }));
    crystal.position.y = 1.4; root.add(crystal);
    root.position.set(chest.pos.x, (chest.pos.y ?? 0) + 0.07, chest.pos.z);
    root.userData.betaPresentation = true;
    scene.add(root); wardRoots.set(species.id, { root, crystal, chest });
  }
  function getNearbyInteraction(pos) {
    if (!isActive()) return null;
    const active = fieldTaming.getState();
    if (active) {
      // The persistent guide explains waiting. A second, non-actionable world
      // button can cover the animal we want the player to watch eating/moving.
      if (['lure', 'feed', 'snare', 'perch', 'challenge'].includes(active.stage)) return null;
      const target = creatures.getActiveAliveCreatures().find(c => c.state.id === active.id);
      if (target) return { type: "bond", id: active.id, species: COMPANION_BY_ID[active.speciesId], target, distance: Math.hypot(target.state.pos.x-pos.x,target.state.pos.z-pos.z), label: active.label.split(" · ")[0], detail: active.detail };
    }
    const state = progress.getState();
    let best = null;
    for (const target of creatures.getActiveAliveCreatures()) {
      const species = identifyCompanion(target);
      if (!species) continue;
      const distance = Math.hypot(target.state.pos.x - pos.x, target.state.pos.z - pos.z);
      if (distance < 9) progress.discoverSpecies(species.id);
      if (distance > getFieldTamingRange(species.id) || Math.abs(target.state.pos.y - pos.y) > 2.2) continue;
      const eligible = eligibility(target, species);
      if (!eligible.ok && state.securedCompanions.includes(species.id)) continue;
      // An ineligible closer Wildkin must not hide another actionable target.
      if (best && !best.disabled && !eligible.ok) continue;
      if (best && best.disabled === !eligible.ok && distance >= best.distance) continue;
      const blockedLabel = target.state.playerDamaged ? 'WARY' : pending.includes(species.id) ? 'BONDED' : pending.length >= progress.getModifiers().captureCapacity ? 'BONDS FULL' : 'UNAVAILABLE';
      best = { type: "bond", id: target.state.id, species, target, distance, disabled: !eligible.ok, label: eligible.ok ? species.taming.action : blockedLabel, detail: eligible.ok ? species.taming.guide : eligible.reason };
    }
    return best;
  }
  function beginBond(id) {
    const target = creatures.getActiveAliveCreatures().find(c => c.state.id === id);
    return fieldTaming.begin(id, identifyCompanion(target));
  }
  function useAbility() {
    if (!isActive()) return { ok: false, message: "Companion abilities are available on expeditions." };
    const species = COMPANION_BY_ID[progress.getState().activeCompanionId];
    if (!species) return { ok: false, message: "Secure a bonded Wildkin, then select it at Camp." };
    if (cooldown > 0) return { ok: false, message: `${species.abilityName} is ready in ${Math.ceil(cooldown)}s.` };
    const pos = playerController.getState().pos;
    let openedSeal = false;
    const chest = registry.getLootChestById(species.secret);
    if (chest && chest.sectionId === getSectionId() && Math.hypot(chest.pos.x - pos.x, chest.pos.z - pos.z) < 5.5 && !progress.getState().completedPoiIds.includes(chest.id)) {
      openedSeal = progress.completePoi(chest.id);
      if (openedSeal) toast("Ancient seal awakened", hasCacheMechanism(chest.id) ? "The vault's mechanism is awakening." : `${species.name} has opened a path to the cache.`);
    }
    if (species.id === "mossling") {
      if (!openedSeal && playerCombat.getHealth() >= playerCombat.getMaxHealth()) return { ok: false, message: "Health is full. Bloom also awakens root seals." };
      playerCombat.heal(2);
    } else if (species.id === "tidefin") playerCombat.grantInvulnerability(3);
    else if (species.id === "emberhorn") {
      for (const c of creatures.getActiveAliveCreatures()) {
        if (Math.hypot(c.state.pos.x - pos.x, c.state.pos.z - pos.z) < 4.5) {
          const dx = c.state.pos.x - pos.x, dz = c.state.pos.z - pos.z, d = Math.hypot(dx, dz) || 1;
          creatures.damageCreature(c, 3.5 * progress.getModifiers().fieldToolDamageMultiplier, pos, { x: dx / d, z: dz / d }, "player");
        }
      }
    } else if (species.id === "skydancer") {
      if (!playerController.getState().grounded && !openedSeal) return { ok: false, message: "Land before calling Skybound again." };
      playerController.launchFromJumpPad({ verticalLaunch: 8.8 });
    }
    cooldown = species.cooldown * (progress.getModifiers().abilityCooldownMultiplier ?? 1);
    onAbility(species.id, pos);
    pulse(pos, new THREE.Color(species.color).getHex());
    audio.playParkour?.("complete");
    return { ok: true, message: openedSeal ? (hasCacheMechanism(chest.id) ? "The vault is opening." : "The cache is now accessible.") : `${species.name} · ${species.abilityName}` };
  }
  function lootAccess(chest) {
    const required = SECRET_COMPANION[chest.id];
    if (!required || progress.getState().completedPoiIds.includes(chest.id)) return { ok: true };
    const species = COMPANION_BY_ID[required];
    return { ok: false, label: `${species.name.toUpperCase()} SEAL`, reason: `Bring a secured ${species.name} and use ${species.abilityName} near this cache.` };
  }
  function desiredIds() {
    const s = progress.getState();
    return [...new Set([s.activeCompanionId, ...pending].filter(Boolean))];
  }
  function getSpawnPosition(playerPos, sectionId) {
    const surface = registry.getSectionById(sectionId)?.surface;
    const feetY = getSurfaceHeight(surface, playerPos.x, playerPos.z) + COMPANION_PHYSICS_TUNING.footClearance;
    return { x: playerPos.x, y: feetY + COMPANION_PHYSICS_TUNING.halfHeight + COMPANION_PHYSICS_TUNING.radius, z: playerPos.z };
  }
  function setFollowerVisible(follower, visible) {
    follower.group.visible = !!visible;
    if (follower.physics?.enabled !== !!visible) follower.physics.setEnabled(!!visible);
  }
  function ensureFollower(id, player, sectionId, slotIndex, slotCount) {
    let follower = followers.get(id);
    if (follower) return follower;
    const species = COMPANION_BY_ID[id];
    const asset = registry.data.visualAssets.find(a => a.id === species?.assetId);
    if (!asset) return null;
    const group = createVisualAssetVisual(asset);
    group.name = `companion_${id}`;
    group.userData.betaPresentation = true;
    group.scale.setScalar(0.7);
    group.userData.modelAnimator = createVisualAnimationController(group);
    scene.add(group);
    const startAnchor = getCompanionFormationAnchor(player.pos, player.facing, slotIndex, slotCount);
    const start = getSpawnPosition(startAnchor, sectionId);
    const physics = createCompanionPhysics({
      physicsWorld,
      initialPosition: start,
      // The party is intentionally ghosted to each other. World terrain,
      // props and boundary collision remain active in the character query.
      shouldIgnoreCollider: (candidate) => {
        if (!candidate) return false;
        if (playerCollider && candidate.handle === playerCollider.handle) return true;
        for (const other of followers.values()) {
          if (other.physics?.collider?.handle === candidate.handle) return true;
        }
        for (const wildkin of creatures.getCreatures()) {
          if (wildkin.collider?.handle === candidate.handle) return true;
        }
        return false;
      },
    });
    follower = {
      id, group, physics, sectionId,
      state: { mode: "SETTLE", attentionUntil: 0, lastSettledAt: fixedElapsed },
      facing: player.facing,
      visualYOffset: id === "skydancer" ? 0.48 : 0,
      lastSpeed: 0,
      verticalVelocity: 0,
      grounded: false,
      blockedSeconds: 0,
      steerSide: id.charCodeAt(0) % 2 ? 1 : -1,
    };
    followers.set(id, follower);
    syncFollowerVisual(follower);
    return follower;
  }
  function syncFollowerVisual(follower) {
    const p = follower.physics?.getPosition() ?? follower.group.position;
    const footOffset = COMPANION_PHYSICS_TUNING.halfHeight + COMPANION_PHYSICS_TUNING.radius;
    follower.group.position.set(p.x, p.y - footOffset + follower.visualYOffset, p.z);
    follower.group.rotation.y = follower.facing;
  }
  function respawnFollower(follower, playerPos, sectionId) {
    const start = getSpawnPosition(playerPos, sectionId);
    follower.physics?.setPosition(start);
    follower.sectionId = sectionId;
    follower.state = { mode: "SETTLE", attentionUntil: fixedElapsed + 0.8, lastSettledAt: fixedElapsed };
    follower.lastSpeed = 0;
    follower.commandedSpeed = 0;
    follower.verticalVelocity = 0;
    follower.grounded = false;
    follower.blockedSeconds = 0;
    syncFollowerVisual(follower);
  }
  function normalizeAngle(angle) {
    let value = angle;
    while (value > Math.PI) value -= Math.PI * 2;
    while (value < -Math.PI) value += Math.PI * 2;
    return value;
  }
  function turnToward(current, target, maxDelta) {
    return current + Math.max(-maxDelta, Math.min(maxDelta, normalizeAngle(target - current)));
  }
  function moveFollower(follower, intent, dt) {
    if (intent.shouldTeleport) {
      respawnFollower(follower, intent.anchor, follower.sectionId);
      return;
    }
    const current = follower.physics?.getPosition() ?? follower.group.position;
    const dx = intent.target.x - current.x;
    const dz = intent.target.z - current.z;
    const distance = Math.hypot(dx, dz);
    let travelSpeed = intent.speed;
    if (follower.id === "mossling") {
      const previous = follower.commandedSpeed ?? 0;
      const change = MOSSLING_MOTION.acceleration * dt;
      travelSpeed = previous + Math.max(-change, Math.min(change, intent.speed - previous));
      if (distance < 0.015 || intent.speed <= 0) travelSpeed = 0;
      follower.commandedSpeed = travelSpeed;
    }
    const step = distance < 0.015 || travelSpeed <= 0 ? 0 : Math.min(distance, travelSpeed * dt);
    // Continue a small downward controller move while settled. This lets
    // Rapier snap a companion onto lower ground instead of leaving it hovering
    // when no horizontal follow movement is currently needed.
    follower.verticalVelocity = Math.max(-12, (follower.verticalVelocity ?? 0) - 15 * dt);
    let desired = {
      x: step > 0 ? dx / distance * step : 0,
      y: (follower.grounded ? -0.08 : follower.verticalVelocity) * dt,
      z: step > 0 ? dz / distance * step : 0,
    };
    // Persist a tangent choice for a short beat. Alternating a side every
    // fixed step makes a character jitter against a corner; keeping it lets
    // the companion actually round a tree or ruin before reassessing.
    if (follower.blockedSeconds > 0 && step > 0) {
      desired = { x: -desired.z * follower.steerSide, y: desired.y, z: desired.x * follower.steerSide };
    }
    let result = follower.physics?.move(desired) ?? { corrected: desired };
    let moved = Math.hypot(result.corrected.x, result.corrected.z);
    // A short, stable sidestep makes a companion route around a tree or cliff
    // instead of facing it forever. This is steering, not a navmesh.
    if (moved < step * 0.32 && step > 0.01 && follower.blockedSeconds <= 0) {
      follower.blockedSeconds = 0.7;
      const steer = { x: -desired.z * follower.steerSide, y: 0, z: desired.x * follower.steerSide };
      result = follower.physics?.move(steer) ?? { corrected: steer };
      moved = Math.hypot(result.corrected.x, result.corrected.z);
    }
    if (follower.blockedSeconds > 0) {
      follower.blockedSeconds -= dt;
      if (moved < step * 0.2 && follower.blockedSeconds <= 0) follower.steerSide *= -1;
    }
    follower.grounded = !!result.grounded;
    if (follower.grounded && follower.verticalVelocity < 0) follower.verticalVelocity = 0;
    if (moved > 0.002) {
      const desiredFacing = Math.atan2(result.corrected.x, result.corrected.z);
      follower.facing = turnToward(follower.facing, desiredFacing, 7.5 * dt);
    }
    follower.lastSpeed = moved / Math.max(dt, 1e-4);
  }
  function updateFixed(dt, { sectionId, paused = false, hidden = false } = {}) {
    if (hidden || !isActive()) fieldTaming.clear();
    if (paused) return;
    fieldTaming.update(dt, { hidden });
    fixedElapsed += dt;
    cooldown = Math.max(0, cooldown - dt);
    const ids = desiredIds();
    const player = playerController.getState();
    for (const [id, follower] of followers) {
      if (!ids.includes(id) || hidden) setFollowerVisible(follower, false);
    }
    for (let i = 0; i < ids.length; i++) {
      const follower = ensureFollower(ids[i], player, sectionId, i, ids.length);
      if (!follower || hidden) continue;
      if (follower.sectionId !== sectionId) {
        const arrivalAnchor = getCompanionFormationAnchor(player.pos, player.facing, i, ids.length);
        respawnFollower(follower, arrivalAnchor, sectionId);
      }
      setFollowerVisible(follower, true);
      const position = follower.physics?.getPosition() ?? follower.group.position;
      const intent = deriveCompanionFollowIntent({
        position, player: player.pos, playerFacing: player.facing,
        slotIndex: i, slotCount: ids.length, elapsed: fixedElapsed, state: follower.state,
        tuning: follower.id === "mossling" ? MOSSLING_FOLLOW_TUNING : undefined,
      });
      follower.state = intent.nextState;
      moveFollower(follower, intent, dt);
      syncFollowerVisual(follower);
    }
  }
  function update(dt, { sectionId, paused = false, hidden = false } = {}) {
    elapsed += dt;
    if (hidden) fieldTaming.clear();
    const s = progress.getState();
    for (const follower of followers.values()) {
      if (hidden) setFollowerVisible(follower, false);
      const animator = follower.group.userData.modelAnimator;
      const moving = follower.lastSpeed > 0.045;
      animator?.play(moving ? animator.getLocomotionState(follower.lastSpeed) : "idle");
      animator?.setLocomotionSpeed(follower.lastSpeed);
      animator?.update(paused ? 0 : dt);
    }
    for (const [id, ward] of wardRoots) {
      ward.root.visible = !hidden && ward.chest.sectionId === sectionId && !s.completedPoiIds.includes(ward.chest.id);
      ward.crystal.rotation.y += dt * 0.6;
      ward.crystal.position.y = 1.4 + Math.sin(elapsed * 2) * 0.1;
    }
  }
  return {
    getNearbyInteraction, beginBond, useAbility, lootAccess, update, updateFixed,
    isBlocking: () => false,
    getBondState: fieldTaming.getState,
    getFieldTamingState: fieldTaming.getState,
    cancelTaming: fieldTaming.clear,
    getPending: () => pending.map(id => ({ ...COMPANION_BY_ID[id] })),
    getFollowerDiagnostics: () => [...followers.values()].map(follower => ({
      id: follower.id, mode: follower.state.mode, speed: follower.lastSpeed,
      grounded: follower.grounded, steeringAroundObstacle: follower.blockedSeconds > 0,
      position: follower.group.position.toArray(), visible: follower.group.visible,
    })),
    getAbility: () => { const species = COMPANION_BY_ID[progress.getState().activeCompanionId]; return species ? { name: species.abilityName, ready: cooldown <= 0, cooldown } : null; },
    isFollowerCollider: (candidate) => {
      if (!candidate) return false;
      for (const follower of followers.values()) {
        if (follower.physics?.collider?.handle === candidate.handle) return true;
      }
      return false;
    },
    resolveExtraction() { fieldTaming.clear(); const ids = [...pending]; pending = []; return ids; },
    reset() {
      fieldTaming.clear(); pending = []; cooldown = 0; creatures.setBondingTarget(null);
      // A run transition may show a result card before the next fixed step.
      // Remove the old-region body immediately; the next active fixed step
      // respawns this same follower from the new section's formation anchor.
      for (const follower of followers.values()) {
        setFollowerVisible(follower, false);
        follower.sectionId = null;
        follower.lastSpeed = 0;
        follower.commandedSpeed = 0;
        follower.verticalVelocity = 0;
        follower.grounded = false;
      }
    },
    dispose() { fieldTaming.clear(); fieldVisual.clear(); for (const follower of followers.values()) { follower.group.userData.modelAnimator?.stop(); follower.physics?.dispose(); disposeExternalModelInstance(follower.group); follower.group.removeFromParent(); } followers.clear(); },
  };
}
