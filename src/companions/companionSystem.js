import * as THREE from "three";
import { COMPANIONS, COMPANION_BY_ID, identifyCompanion, SECRET_COMPANION } from "./companionCatalog.js";
import { canBond } from "./bondingLogic.js";
import { createVisualAssetVisual } from "../world/visualFactory.js";
import { createVisualAnimationController, disposeExternalModelInstance } from "../assets/modelAssetRuntime.js";
import { createFieldTaming, getFieldTamingRange } from "./fieldTaming.js";
import { createFieldTamingVisual, createObservationMarker, findFieldPlacement } from "./fieldTamingVisual.js";
import { getSurfaceHeight } from "../world/terrainSurfaceModel.js";
import { createCompanionPhysics, COMPANION_PHYSICS_TUNING } from "./companionPhysics.js";
import { COMPANION_FOLLOW_TUNING, deriveCompanionFollowIntent, getCompanionFormationAnchor, MOSSLING_FOLLOW_TUNING } from "./companionFollowIntent.js";
import { MOSSLING_MOTION } from "../creatures/mosslingMotion.js";
import { createCreatureObservation } from './creatureObservation.js';
import { createWildkinGenome, normalizeWildkinGenome } from '../creatures/wildkinGenome.js';
import { cloneWildkinIndividual, MAX_PENDING_WILDKIN, normalizeWildkinIndividual } from '../creatures/wildkinIndividual.js';
import { applyWildkinAppearance } from '../creatures/wildkinAppearance.js';

export function createCompanionSystem({ app, scene, camera = null, registry, progress, creatures, playerController, playerCombat, physicsWorld, playerCollider = null, hasCacheMechanism = () => false, isActive, getSectionId, getRunId = () => null, getTerrainHeight = null, getSurfaceWater = () => null, getCampCareAnchor = () => null, getCampYoungAnchor = () => null, onBlockingChanged, toast, pulse, audio, onAbility = () => {}, strikeMinerals = () => ({ hits: 0, sources: 0, depleted: 0, interrupted: false }) }) {
  let pending = [], cooldown = 0, elapsed = 0, fixedElapsed = 0;
  let interactionTargetId = null;
  const followers = new Map();
  const candidateRecords = new Map();
  const wardRoots = new Map();
  const fieldVisual = createFieldTamingVisual(scene);
  const observationMarker = createObservationMarker(scene);
  const observationPoint = new THREE.Vector3();
  const followerShoreClearance = COMPANION_PHYSICS_TUNING.radius + .12;
  const isPlayerWaterborne = player => player?.waterborne === true || player?.mode === "WADE" || player?.mode === "SWIM";

  function isDryFollowerPoint(position) {
    if (!position || ![position.x, position.z].every(Number.isFinite)) return false;
    const probes = [[0, 0], [followerShoreClearance, 0], [-followerShoreClearance, 0],
      [0, followerShoreClearance], [0, -followerShoreClearance]];
    try {
      return probes.every(([x, z]) => !getSurfaceWater({ x: position.x + x, y: position.y, z: position.z + z }));
    } catch { return false; }
  }

  function isDryFollowerPath(from, to) {
    if (!isDryFollowerPoint(from) || !isDryFollowerPoint(to)) return false;
    const distance = Math.hypot(to.x - from.x, to.z - from.z);
    const steps = Math.min(48, Math.ceil(distance / Math.max(.7, followerShoreClearance * 2)));
    for (let step = 1; step < steps; step++) {
      const t = step / steps;
      if (!isDryFollowerPoint({ x: from.x + (to.x - from.x) * t, y: from.y + ((to.y ?? from.y) - from.y) * t,
        z: from.z + (to.z - from.z) * t })) return false;
    }
    return true;
  }

  function getDryFormationAnchor(player, slotIndex, slotCount) {
    const lastDry = player?.lastDryPosition;
    const origin = isPlayerWaterborne(player) && lastDry && [lastDry.x, lastDry.y, lastDry.z].every(Number.isFinite)
      ? lastDry : player?.pos;
    if (!origin) return null;
    const formation = getCompanionFormationAnchor(origin, player?.facing ?? 0, slotIndex, slotCount);
    if (isDryFollowerPoint(formation)) return formation;
    return isDryFollowerPoint(origin) ? { x: origin.x, y: origin.y, z: origin.z } : null;
  }
  const observation = createCreatureObservation({
    getPlayer: playerController.getState, getCreatures: creatures.getActiveAliveCreatures,
    getProgress: progress.getState, discoverSpecies: progress.discoverSpecies, earnClue: progress.earnObservationClue,
    isVisible(target) {
      if (!camera) return false;
      const p = target.state.pos;
      observationPoint.set(p.x, p.y + .2, p.z).project(camera);
      return Math.abs(observationPoint.x) <= .94 && Math.abs(observationPoint.y) <= .94 && observationPoint.z >= -1 && observationPoint.z <= 1
        && creatures.hasClearSightToCreature(target, camera.position);
    },
    hasSight: target => creatures.hasClearSightToCreature(target, playerController.getState().pos),
    onClue: (species, stage) => toast(`${species.name} · field note ${stage}/2`, 'Saved in Journal → Wildkin.'),
  });
  function getOriginId(target) {
    return target?.state?.originId ?? target?.state?.sourceId ?? target?.state?.id ?? null;
  }
  function stableHash(value) {
    let hash = 2166136261;
    for (const char of String(value)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0).toString(36);
  }
  function ensureCandidateRecord(target, species) {
    const originId = getOriginId(target);
    if (!originId || !species) return null;
    const cached = candidateRecords.get(originId);
    if (cached) return cached;
    const acquiredRunId = String(getRunId() ?? 'run_unknown');
    let genome = null;
    if (species.id === 'mossling') {
      try { genome = target.state.genome == null
        ? createWildkinGenome(`${acquiredRunId}:${originId}`)
        : normalizeWildkinGenome(target.state.genome); }
      catch { return null; }
    }
    const record = normalizeWildkinIndividual({ version: 1,
      id: `wildkin_${stableHash(`${acquiredRunId}:${originId}`)}`,
      speciesId: species.id, originId, acquiredRunId, genome });
    if (!record) return null;
    candidateRecords.set(originId, record);
    return record;
  }
  function getOwnedRecords() {
    if (progress.getOwnedWildkin) return progress.getOwnedWildkin();
    return (progress.getState().securedCompanions ?? []).map(speciesId => ({ id: speciesId, speciesId, originId: speciesId }));
  }
  function getActiveRecord() {
    if (progress.getActiveWildkin) return progress.getActiveWildkin();
    const speciesId = progress.getState().activeCompanionId;
    return speciesId ? { id: speciesId, speciesId, originId: speciesId } : null;
  }
  function eligibility(target, species) {
    const originId = getOriginId(target);
    return canBond({ speciesId: species?.id, originId, sourceCaptured: originId ? !!progress.isWildkinSourceCaptured?.(originId) : false,
      secured: getOwnedRecords(), pending, capacity: progress.getModifiers().captureCapacity,
      damaged: target?.state.playerDamaged, active: isActive() });
  }
  const fieldTaming = createFieldTaming({
    getPlayer: playerController.getState,
    getTarget: id => creatures.getActiveAliveCreatures().find(c => c.state.id === id),
    getSectionId, isActive, canStart: eligibility,
    consume: id => progress.consumeFieldSupply(id),
    placePoint: (player, target, secondPerch) => findFieldPlacement({ player, target, registry, sectionId: getSectionId(), physicsWorld, getTerrainHeight, secondPerch,
      ignoreCollider: candidate => candidate.handle === playerCollider?.handle || creatures.getCreatures().some(c => c.collider?.handle === candidate.handle) || [...followers.values()].some(c => c.physics?.collider?.handle === candidate.handle) }),
    setIntent: (id, intent) => creatures.setFieldTamingIntent(id, intent),
    clearIntent: id => creatures.clearFieldTamingIntent(id),
    capture(id, species) {
      // This synchronous hold validates the same live membership required by
      // secureBondTarget. No actor update runs between the save and removal.
      if (!creatures.setBondingTarget(id)) return false;
      const liveTarget = creatures.getActiveAliveCreatures().find(candidate => candidate.state.id === id);
      const record = ensureCandidateRecord(liveTarget, species);
      if (!record) { creatures.setBondingTarget(null); return false; }
      const nextPending = [...pending, record];
      const saved = progress.commitWildkinCapture
        ? progress.commitWildkinCapture(record, nextPending)
        : progress.checkpointRun({ companions: nextPending.map(candidate => candidate.speciesId) });
      if (!saved.ok) {
        creatures.setBondingTarget(null);
        toast("Bond could not be saved", "Your Wildkin is still here. Try again.");
        return { ok: false, reason: 'save-failed' };
      }
      const target = creatures.secureBondTarget(id);
      creatures.setBondingTarget(null);
      if (!target) return false;
      pending = nextPending;
      pulse(target.state.pos, new THREE.Color(species.color).getHex());
      toast(`${species.name} bonded`, "Bring them home to secure your bond.");
      return true;
    },
    onMessage: toast, onVisual(state) {
      if (state?.speciesId === "emberhorn") {
        const generated = getTerrainHeight?.(state.point.x, state.point.z);
        state.point.y = Number.isFinite(generated) ? generated : getSurfaceHeight(registry.getSectionById(getSectionId())?.surface, state.point.x, state.point.z);
      }
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
    if (playerController.getState().mode === "SWIM") return null;
    const active = fieldTaming.getState();
    if (active) {
      // The persistent guide explains waiting. A second, non-actionable world
      // button can cover the animal we want the player to watch eating/moving.
      if (['lure', 'feed', 'snare', 'perch', 'challenge'].includes(active.stage)) return null;
      const target = creatures.getActiveAliveCreatures().find(c => c.state.id === active.id);
      if (target) return { type: "bond", id: active.id, species: COMPANION_BY_ID[active.speciesId], target, distance: Math.hypot(target.state.pos.x-pos.x,target.state.pos.z-pos.z), label: active.label.split(" · ")[0], detail: active.detail };
    }
    let best = null, previous = null;
    for (const target of creatures.getActiveAliveCreatures()) {
      const species = identifyCompanion(target);
      if (!species) continue;
      const distance = Math.hypot(target.state.pos.x - pos.x, target.state.pos.z - pos.z);
      if (distance > getFieldTamingRange(species.id) || Math.abs(target.state.pos.y - pos.y) > 2.2) continue;
      const eligible = eligibility(target, species);
      if (!eligible.ok && progress.isWildkinSourceCaptured?.(getOriginId(target))) continue;
      const blockedLabel = target.state.playerDamaged ? 'WARY' : pending.some(record => record.originId === getOriginId(target)) ? 'BONDED' : pending.length >= progress.getModifiers().captureCapacity ? 'BONDS FULL' : 'UNAVAILABLE';
      const candidate = { type: "bond", id: target.state.id, species, target, distance, disabled: !eligible.ok, label: eligible.ok ? species.taming.action : blockedLabel, detail: eligible.ok ? species.taming.guide : eligible.reason };
      if (target.state.id === interactionTargetId) previous = candidate;
      // An ineligible closer Wildkin must not hide another actionable target.
      if (best && !best.disabled && !eligible.ok) continue;
      if (best && best.disabled === !eligible.ok && distance >= best.distance) continue;
      best = candidate;
    }
    if (previous && best && previous.disabled === best.disabled && previous.distance <= best.distance + 1) best = previous;
    interactionTargetId = best?.id ?? null;
    return best;
  }
  function beginBond(id) {
    if (playerController.getState().mode === "SWIM") return false;
    const target = creatures.getActiveAliveCreatures().find(c => c.state.id === id);
    return fieldTaming.begin(id, identifyCompanion(target));
  }
  function getRequiredCompanionId(chest) {
    return chest?.requiredCompanionId ?? SECRET_COMPANION[chest?.id] ?? null;
  }
  function findNearbySealChest(species, pos) {
    const sectionId = getSectionId();
    const candidates = [...(registry.getLootChestsForSection?.(sectionId) ?? [])];
    const legacy = registry.getLootChestById?.(species.secret);
    if (legacy && !candidates.some(chest => chest?.id === legacy.id)) candidates.push(legacy);
    const completed = new Set(progress.getState().completedPoiIds ?? []);
    return candidates
      .filter(chest => chest?.id && chest.sectionId === sectionId
        && getRequiredCompanionId(chest) === species.id
        && !completed.has(chest.id)
        && Math.hypot(chest.pos.x - pos.x, chest.pos.z - pos.z) < 5.5)
      .map(chest => ({ chest, distance: Math.hypot(chest.pos.x - pos.x, chest.pos.z - pos.z) }))
      .sort((a, b) => a.distance - b.distance || (a.chest.id < b.chest.id ? -1 : a.chest.id > b.chest.id ? 1 : 0))[0]?.chest ?? null;
  }
  function useAbility() {
    if (!isActive()) return { ok: false, message: "Companion abilities are available on expeditions." };
    if (playerController.getState().mode === "SWIM") return { ok: false, message: "Return to shore before calling a companion ability." };
    const active = getActiveRecord();
    const species = COMPANION_BY_ID[active?.speciesId];
    if (!species) return { ok: false, message: "Secure a bonded Wildkin, then select it at Camp." };
    if (cooldown > 0) return { ok: false, message: `${species.abilityName} is ready in ${Math.ceil(cooldown)}s.` };
    const pos = playerController.getState().pos;
    let openedSeal = false, mineralStrike = null;
    const chest = findNearbySealChest(species, pos);
    if (chest) {
      openedSeal = progress.completePoi(chest.id);
      if (!openedSeal) return { ok: false, message: 'Could not save the awakened seal. Try again.' };
      if (openedSeal) toast(chest.opensOnSeal === true ? 'Rootbound cache awakened' : 'Ancient seal awakened',
        chest.opensOnSeal === true ? 'The cache is opening.' : hasCacheMechanism(chest.id) ? "The vault's mechanism is awakening." : `${species.name} has opened a path to the cache.`);
    }
    if (species.id === "mossling") {
      if (!openedSeal && playerCombat.getHealth() >= playerCombat.getMaxHealth()) return { ok: false, message: "Health is full. Bloom also awakens root seals." };
      playerCombat.heal(2);
    } else if (species.id === "tidefin") playerCombat.grantWard(species.activeDuration);
    else if (species.id === "emberhorn") {
      for (const c of creatures.getActiveAliveCreatures()) {
        if (Math.hypot(c.state.pos.x - pos.x, c.state.pos.z - pos.z) < 4.5) {
          const dx = c.state.pos.x - pos.x, dz = c.state.pos.z - pos.z, d = Math.hypot(dx, dz) || 1;
          creatures.damageCreature(c, 3.5 * progress.getModifiers().fieldToolDamageMultiplier, pos, { x: dx / d, z: dz / d }, "player");
        }
      }
      mineralStrike = strikeMinerals(pos) ?? { hits: 0, sources: 0, depleted: 0, interrupted: false };
    } else if (species.id === "skydancer") {
      if (!playerController.getState().grounded && !openedSeal) return { ok: false, message: "Land before calling Skybound again." };
      playerController.launchFromJumpPad({ verticalLaunch: 8.8 });
    }
    cooldown = species.cooldown * (progress.getModifiers().abilityCooldownMultiplier ?? 1);
    onAbility(species.id, pos, active?.id ?? null);
    pulse(pos, new THREE.Color(species.color).getHex());
    audio.playParkour?.("complete");
    if (mineralStrike?.interrupted) return { ok: true };
    if (openedSeal) return { ok: true, message: chest.opensOnSeal === true ? 'The cache is opening.' : hasCacheMechanism(chest.id) ? "The vault is opening." : "The cache is now accessible." };
    if (mineralStrike?.hits > 0) return { ok: true, message: `${species.abilityName} · ${mineralStrike.sources} outcrop${mineralStrike.sources === 1 ? '' : 's'} cracked.` };
    return species.id === 'tidefin' ? { ok: true } : { ok: true, message: `${species.name} · ${species.abilityName}` };
  }
  function lootAccess(chest) {
    const required = getRequiredCompanionId(chest);
    if (!required || progress.getState().completedPoiIds.includes(chest.id)) return { ok: true };
    const species = COMPANION_BY_ID[required];
    if (!species) return { ok: false, label: 'SEALED CACHE', reason: 'This cache seal cannot be awakened.' };
    return { ok: false, label: `${species.name.toUpperCase()} SEAL`, reason: `Bring a secured ${species.name} and use ${species.abilityName} near this cache.` };
  }
  function desiredRecords(careAnchor = null) {
    const assigned = careAnchor?.wildkinId
      ? getOwnedRecords().find(record => record.id === careAnchor.wildkinId) ?? null
      : null;
    const records = [getActiveRecord(), ...pending, assigned].filter(Boolean);
    return [...new Map(records.map(record => [record.id, record])).values()];
  }
  function getSpawnPosition(playerPos, sectionId) {
    const surface = registry.getSectionById(sectionId)?.surface;
    const sampled = getTerrainHeight?.(playerPos.x, playerPos.z);
    const feetY = (Number.isFinite(sampled) ? sampled : getSurfaceHeight(surface, playerPos.x, playerPos.z)) + COMPANION_PHYSICS_TUNING.footClearance;
    return { x: playerPos.x, y: feetY + COMPANION_PHYSICS_TUNING.halfHeight + COMPANION_PHYSICS_TUNING.radius, z: playerPos.z };
  }
  function setFollowerVisible(follower, visible) {
    follower.group.visible = !!visible;
    const physicsVisible = !!visible && !follower.docked;
    if (follower.physics && follower.physics.enabled !== physicsVisible) follower.physics.setEnabled(physicsVisible);
  }
  function createFollowerPhysics(start) {
    return createCompanionPhysics({
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
  }
  function ensureFollower(record, player, sectionId, slotIndex, slotCount, { young = false, spawnAnchor = null } = {}) {
    let follower = followers.get(record.id);
    if (follower) {
      if (!young && follower.young) {
        follower.young = false;
        follower.group.scale.setScalar(.7);
        const startAnchor = spawnAnchor ?? getDryFormationAnchor(player, slotIndex, slotCount);
        if (!startAnchor) return null;
        follower.physics = createFollowerPhysics(getSpawnPosition(startAnchor, sectionId));
        follower.docked = false;
        follower.growthStage = null;
        follower.growthScale = 1;
        follower.state = { mode: "SETTLE", attentionUntil: fixedElapsed + .8, lastSettledAt: fixedElapsed };
      }
      return follower;
    }
    const species = COMPANION_BY_ID[record.speciesId];
    const asset = registry.data.visualAssets.find(a => a.id === species?.assetId);
    if (!asset) return null;
    const group = createVisualAssetVisual(asset);
    if (record.genome) applyWildkinAppearance(group, record.genome);
    group.name = `companion_${record.id}`;
    group.userData.betaPresentation = true;
    group.scale.setScalar(young ? .7 * .7 : .7);
    group.userData.modelAnimator = createVisualAnimationController(group);
    scene.add(group);
    const startAnchor = spawnAnchor ?? getDryFormationAnchor(player, slotIndex, slotCount);
    if (!young && !startAnchor) { group.removeFromParent(); disposeExternalModelInstance(group); return null; }
    const start = getSpawnPosition(startAnchor, sectionId);
    const physics = young ? null : createFollowerPhysics(start);
    follower = {
      id: record.id, speciesId: record.speciesId, group, physics, sectionId,
      state: { mode: "SETTLE", attentionUntil: 0, lastSettledAt: fixedElapsed },
      facing: player.facing,
      visualYOffset: record.speciesId === "skydancer" ? 0.48 : 0,
      lastSpeed: 0,
      verticalVelocity: 0,
      grounded: false,
      blockedSeconds: 0,
      docked: false,
      young,
      growthStage: young ? 0 : null,
      growthScale: young ? .7 : 1,
      steerSide: record.id.charCodeAt(0) % 2 ? 1 : -1,
    };
    followers.set(record.id, follower);
    if (!young) syncFollowerVisual(follower);
    return follower;
  }
  function syncFollowerVisual(follower) {
    const p = follower.physics?.getPosition() ?? follower.group.position;
    const footOffset = COMPANION_PHYSICS_TUNING.halfHeight + COMPANION_PHYSICS_TUNING.radius;
    follower.group.position.set(p.x, p.y - footOffset + follower.visualYOffset, p.z);
    follower.group.rotation.y = follower.facing;
  }
  function respawnFollower(follower, playerPos, sectionId) {
    const current = follower.physics?.getPosition() ?? follower.group.position;
    if (!isDryFollowerPath(current, playerPos)) return false;
    follower.docked = false;
    if (follower.physics && !follower.physics.enabled) follower.physics.setEnabled(true);
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
    return true;
  }
  function dockFollower(follower, anchor, sectionId) {
    const point = anchor.anchorPos;
    follower.docked = true;
    follower.sectionId = sectionId;
    follower.state = { mode: "DOCKED", attentionUntil: 0, lastSettledAt: fixedElapsed };
    follower.lastSpeed = 0;
    follower.commandedSpeed = 0;
    follower.verticalVelocity = 0;
    follower.grounded = true;
    follower.blockedSeconds = 0;
    setFollowerVisible(follower, true);
    follower.group.position.set(point.x, point.y + follower.visualYOffset, point.z);
    follower.group.rotation.y = Number.isFinite(anchor.yaw) ? anchor.yaw : 0;
  }
  function dockYoung(follower, anchor, sectionId) {
    const point = anchor.anchorPos;
    const growthSeconds = Math.max(0, Math.min(120, Number(anchor.growthSeconds) || 0));
    const growthStage = growthSeconds < 40 ? 0 : growthSeconds < 80 ? 1 : 2;
    const growthScale = [.7, .85, 1][growthStage];
    follower.young = true;
    follower.docked = true;
    follower.sectionId = sectionId;
    follower.state = { mode: "YOUNG_DOCKED", attentionUntil: 0, lastSettledAt: fixedElapsed };
    follower.lastSpeed = 0;
    follower.growthStage = growthStage;
    follower.growthScale = growthScale;
    follower.physics?.setEnabled(false);
    follower.group.scale.setScalar(.7 * growthScale);
    follower.group.visible = true;
    follower.group.position.set(point.x, point.y + follower.visualYOffset, point.z);
    follower.group.rotation.y = Number.isFinite(anchor.yaw) ? anchor.yaw : 0;
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
    if (follower.speciesId === "mossling") {
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
    const desiredPoint = { x: current.x + desired.x, y: current.y + desired.y, z: current.z + desired.z };
    if (!isDryFollowerPoint(desiredPoint)) desired = { x: 0, y: desired.y, z: 0 };
    // Persist a tangent choice for a short beat. Alternating a side every
    // fixed step makes a character jitter against a corner; keeping it lets
    // the companion actually round a tree or ruin before reassessing.
    if (follower.blockedSeconds > 0 && step > 0) {
      const steer = { x: -desired.z * follower.steerSide, y: desired.y, z: desired.x * follower.steerSide };
      const steerPoint = { x: current.x + steer.x, y: current.y + steer.y, z: current.z + steer.z };
      desired = isDryFollowerPoint(steerPoint) ? steer : { x: 0, y: desired.y, z: 0 };
    }
    let result = follower.physics?.move(desired) ?? { corrected: desired };
    const afterMove = follower.physics?.getPosition();
    if (afterMove && !isDryFollowerPoint(afterMove)) {
      follower.physics.setPosition(current);
      result = { corrected: { x: 0, y: 0, z: 0 }, grounded: follower.grounded };
    }
    let moved = Math.hypot(result.corrected.x, result.corrected.z);
    // A short, stable sidestep makes a companion route around a tree or cliff
    // instead of facing it forever. This is steering, not a navmesh.
    if (moved < step * 0.32 && step > 0.01 && follower.blockedSeconds <= 0) {
      follower.blockedSeconds = 0.7;
      const steer = { x: -desired.z * follower.steerSide, y: 0, z: desired.x * follower.steerSide };
      const steerPoint = { x: current.x + steer.x, y: current.y, z: current.z + steer.z };
      result = isDryFollowerPoint(steerPoint) ? (follower.physics?.move(steer) ?? { corrected: steer })
        : { corrected: { x: 0, y: 0, z: 0 }, grounded: follower.grounded };
      const afterSteer = follower.physics?.getPosition();
      if (afterSteer && !isDryFollowerPoint(afterSteer)) {
        follower.physics.setPosition(current);
        result = { corrected: { x: 0, y: 0, z: 0 }, grounded: follower.grounded };
      }
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
    const player = playerController.getState();
    const swimming = player.mode === "SWIM";
    if (swimming) fieldTaming.clear();
    observation.update(dt, { sectionId, runId: getRunId(), active: isActive() && (playerCombat?.getHealth() ?? 1) > 0, paused: paused || swimming, hidden, taming: !!fieldTaming.getState() });
    if (hidden || !isActive()) fieldTaming.clear();
    if (paused) return;
    fieldTaming.update(dt, { hidden });
    fixedElapsed += dt;
    cooldown = Math.max(0, cooldown - dt);
    const careAnchor = getCampCareAnchor?.() ?? null;
    const records = desiredRecords(careAnchor);
    const youngAnchor = getCampYoungAnchor?.() ?? null;
    const youngRecord = youngAnchor?.offspring?.id && !records.some(record => record.id === youngAnchor.offspring.id)
      ? youngAnchor.offspring : null;
    const ids = [...records.map(record => record.id), ...(youngRecord ? [youngRecord.id] : [])];
    for (const [id, follower] of followers) {
      if (!ids.includes(id) && follower.docked) follower.docked = false;
      if (!ids.includes(id) || hidden) setFollowerVisible(follower, false);
    }
    for (let i = 0; i < records.length; i++) {
      const dryAnchor = getDryFormationAnchor(player, i, records.length);
      const careMatch = careAnchor?.wildkinId === records[i].id && careAnchor.anchorPos
        && [careAnchor.anchorPos.x, careAnchor.anchorPos.y, careAnchor.anchorPos.z].every(Number.isFinite);
      const follower = ensureFollower(records[i], player, sectionId, i, records.length,
        { spawnAnchor: careMatch ? careAnchor.anchorPos : dryAnchor });
      if (!follower || hidden) continue;
      if (careMatch) {
        dockFollower(follower, careAnchor, sectionId);
        continue;
      }
      if (follower.docked || follower.sectionId !== sectionId) {
        const arrivalAnchor = getDryFormationAnchor(player, i, ids.length);
        if (!arrivalAnchor || !respawnFollower(follower, arrivalAnchor, sectionId)) {
          setFollowerVisible(follower, false);
          continue;
        }
      }
      setFollowerVisible(follower, true);
      const position = follower.physics?.getPosition() ?? follower.group.position;
      let intent;
      if (isPlayerWaterborne(player)) {
        const distance = dryAnchor ? Math.hypot(position.x - dryAnchor.x, position.z - dryAnchor.z) : 0;
        intent = { mode: "SHORE_WAIT", target: dryAnchor ?? position, anchor: dryAnchor ?? position,
          speed: distance > COMPANION_FOLLOW_TUNING.settleRadius ? COMPANION_FOLLOW_TUNING.recoverSpeed : 0,
          distance, shouldTeleport: false,
          nextState: { ...follower.state, mode: "SHORE_WAIT", settledPoint: dryAnchor ?? position } };
      } else {
        intent = deriveCompanionFollowIntent({
          position, player: player.pos, playerFacing: player.facing,
          slotIndex: i, slotCount: records.length, elapsed: fixedElapsed, state: follower.state,
          tuning: follower.speciesId === "mossling" ? MOSSLING_FOLLOW_TUNING : undefined,
        });
      }
      follower.state = intent.nextState;
      moveFollower(follower, intent, dt);
      syncFollowerVisual(follower);
    }
    if (youngRecord) {
      const follower = ensureFollower(youngRecord, player, sectionId, records.length, records.length + 1, { young: true });
      const validAnchor = youngAnchor?.anchorPos
        && [youngAnchor.anchorPos.x, youngAnchor.anchorPos.y, youngAnchor.anchorPos.z].every(Number.isFinite);
      if (follower) {
        if (hidden || sectionId !== 'camp' || !validAnchor) setFollowerVisible(follower, false);
        else dockYoung(follower, youngAnchor, sectionId);
      }
    }
  }
  function update(dt, { sectionId, paused = false, hidden = false } = {}) {
    elapsed += dt;
    if (hidden) { fieldTaming.clear(); observation.reset(); interactionTargetId = null; }
    const s = progress.getState();
    const observationModel = observation.getModel();
    const observationTarget = observationModel
      ? creatures.getActiveAliveCreatures().find(creature => creature.state.id === observationModel.id)
      : null;
    observationMarker.update(observationModel, observationTarget, camera, { hidden, taming: !!fieldTaming.getState() });
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
  function reset() {
    observation.reset();
    observationMarker.clear();
    interactionTargetId = null;
    fieldTaming.clear(); pending = []; candidateRecords.clear(); cooldown = 0; creatures.setBondingTarget(null);
    // Hide previous bodies immediately; ordinary fixed updates recreate the
    // required followers from the current section's formation anchor.
    for (const follower of followers.values()) {
      setFollowerVisible(follower, false);
      follower.sectionId = null;
      follower.lastSpeed = 0;
      follower.commandedSpeed = 0;
      follower.verticalVelocity = 0;
      follower.grounded = false;
      follower.docked = false;
    }
  }
  function restorePending(records) {
    if (!Array.isArray(records) || records.length > MAX_PENDING_WILDKIN
      || Object.keys(records).length !== records.length) return { ok: false, reason: 'invalid-run-companions' };
    const normalized = records.map(normalizeWildkinIndividual);
    if (normalized.some(record => !record)
      || new Set(normalized.map(record => record.id)).size !== normalized.length
      || new Set(normalized.map(record => record.originId)).size !== normalized.length) return { ok: false, reason: 'invalid-run-companions' };
    const owned = getOwnedRecords();
    const ownedIds = new Set(owned.map(record => record.id));
    const ownedOrigins = new Set(owned.map(record => record.originId));
    const next = normalized.filter(record => !ownedIds.has(record.id) && !ownedOrigins.has(record.originId));
    if (next.length > progress.getModifiers().captureCapacity) return { ok: false, reason: 'bond-capacity' };
    reset();
    pending = next;
    return { ok: true, companions: pending.map(cloneWildkinIndividual) };
  }
  return {
    getNearbyInteraction, beginBond, useAbility, lootAccess, update, updateFixed,
    isBlocking: () => false,
    getBondState: fieldTaming.getState,
    getFieldTamingState: fieldTaming.getState,
    getObservationState: observation.getModel,
    cancelTaming: fieldTaming.clear,
    getPending: () => pending.map(cloneWildkinIndividual),
    getFollowerDiagnostics: () => [...followers.values()].map(follower => ({
      id: follower.id, speciesId: follower.speciesId, mode: follower.state.mode, speed: follower.lastSpeed,
      grounded: follower.grounded, steeringAroundObstacle: follower.blockedSeconds > 0,
      position: follower.group.position.toArray(), visible: follower.group.visible, docked: follower.docked,
      physicsEnabled: follower.physics?.enabled ?? null,
      young: !!follower.young, growthStage: follower.growthStage, growthScale: follower.growthScale, scale: follower.group.scale.x,
    })),
    getAbility: () => { const active = getActiveRecord(); const species = COMPANION_BY_ID[active?.speciesId]; return species ? { individualId: active.id, speciesId: species.id, name: species.abilityName, ready: cooldown <= 0, cooldown, activeRemaining:species.id==='tidefin'?(playerCombat.getWardRemaining?.()??0):0, activeDuration:species.activeDuration??0 } : null; },
    isFollowerCollider: (candidate) => {
      if (!candidate) return false;
      for (const follower of followers.values()) {
        if (follower.physics?.collider?.handle === candidate.handle) return true;
      }
      return false;
    },
    resolveExtraction() { observation.reset(); fieldTaming.clear(); const records = pending.map(cloneWildkinIndividual); pending = []; return records; },
    reset, restorePending,
    dispose() { fieldTaming.clear(); fieldVisual.clear(); observationMarker.dispose(); for (const follower of followers.values()) { follower.group.userData.modelAnimator?.stop(); follower.physics?.dispose(); disposeExternalModelInstance(follower.group); follower.group.removeFromParent(); } followers.clear(); },
  };
}
