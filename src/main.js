import * as THREE from "three";
import * as RAPIER from "rapier";
import { createCamera, updateCameraAspect, CAMERA_CONFIG } from "./game/createCamera.js";
import { createRenderer, resizeRenderer } from "./game/createRenderer.js";
import { createScene } from "./game/createScene.js";
import { createPlayerController } from "./player/playerController.js";
import { createCameraFollow } from "./camera/cameraFollow.js";
import { createTouchMovement } from "./input/touchMovement.js";
import { createKeyboardInput } from "./input/keyboardInput.js";
import { mergeIntents as mergeIntentsPure } from "./input/inputController.js";
import { MOVEMENT_CONFIG, CAMERA_CONFIG_FOLLOW, INPUT_CONFIG, RAPIER_CONFIG } from "./game/config.js";
import { createPhysicsWorld } from "./physics/createPhysicsWorld.js";
import { createCharacterPhysics } from "./physics/createCharacterPhysics.js";
import { createPhysicsDebug } from "./physics/physicsDebug.js";
import { createResourceSystem } from "./resources/resourceSystem.js";
import { createPickupSystem } from "./resources/pickupSystem.js";
import { createFieldTool } from "./tools/fieldTool.js";
import { createGameAudio } from "./audio/gameAudio.js";
import { createRunInventoryHud } from "./ui/runInventoryHud.js";
import { createParticleSystem } from "./resources/particleSystem.js";
import { createAutoHarvestToggle } from "./ui/autoHarvestToggle.js";
import { COMBAT_CONFIG, RUSHER_CONFIG } from "./combat/combatConfig.js";
import { getAttackTargets } from "./combat/combatTargeting.js";
import { createPlayerCombat } from "./combat/playerCombat.js";
import { createCreatureSystem } from "./creatures/creatureSystem.js";
import { createProjectileSystem } from "./combat/projectileSystem.js";
import { createXpMoteSystem } from "./combat/xpMoteSystem.js";
import { createCombatSession } from "./combat/combatSession.js";
import { createCombatHud } from "./ui/combatHud.js";
import { createDeathOverlay } from "./ui/deathOverlay.js";
import WORLD_DATA from "./world/data/world.js";
import { createWorldRegistry } from "./world/worldRegistry.js";
import { createRegionManager } from "./world/regionManager.js";
import { createExpeditionSession } from "./session/expeditionSession.js";

const canvas = document.getElementById("c");
const app = document.getElementById("app");
const debugLabel = document.getElementById("debug-label");

const VERSION = "Phase 3.5A — 0.9.0";

if (debugLabel) debugLabel.textContent = `${VERSION} · loading Rapier…`;

await RAPIER.init();

const { scene, player, playground } = createScene();

function getAspect() {
  const w = app.clientWidth;
  const h = app.clientHeight;
  return w / Math.max(h, 1);
}

const camera = createCamera(getAspect());
const renderer = createRenderer(canvas);

function resize() {
  const w = app.clientWidth;
  const h = app.clientHeight;
  updateCameraAspect(camera, w / Math.max(h, 1));
  resizeRenderer(renderer, w, h);
}
resize();
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => {
  setTimeout(resize, 200);
});

// World / Session / Region — Phase 3.5A thin main.js ownership
const worldRegistry = createWorldRegistry(WORLD_DATA);
const regionDepthMap = worldRegistry.getRegionDepthMap();

// Physics
const physicsWorld = createPhysicsWorld(RAPIER, playground);
const startPos = { x: 0, y: RAPIER_CONFIG.capsuleTotalHeight / 2 + 0.15, z: 5.5 };
const characterPhysics = createCharacterPhysics(RAPIER, physicsWorld.world, startPos);

// Expedition session — owns temporary run lifecycle instead of accumulating in main.js
const initialRegion = worldRegistry.getRegionForPosition(startPos);
const expeditionSession = createExpeditionSession({
  startAnchorId: worldRegistry.getStartAnchorId() ?? "camp_gate",
  regionDepthMap,
  initialRegionId: initialRegion,
});
expeditionSession.setRegion(initialRegion, null);

// Region activation manager — determines current region, computes active set (current + neighbors)
let lastActiveIds = [];
const regionManager = createRegionManager(worldRegistry, {
  onChange: ({ currentRegionId, activeIds, prevActiveIds }) => {
    // Session owns current region + maxDepth
    expeditionSession.setRegion(currentRegionId, null);
    // System hooks: activate/deactivate resources & creatures, cull temp entities
    resourceSystem.setActiveRegions(activeIds);
    creatureSystem.setActiveRegions(activeIds);
    // Temporary entities: remove those whose origin region is now inactive (no leakage/duplication, pooled)
    const deactivated = prevActiveIds.filter(id => !activeIds.includes(id));
    if (deactivated.length > 0) {
      pickupSystem.cullInactiveRegions(activeIds, worldRegistry);
      projectileSystem.cullInactiveRegions(activeIds, worldRegistry);
      xpMoteSystem.cullInactiveRegions(activeIds, worldRegistry);
    }
  },
});
// Initialize current + active before systems created? Need systems first, so delay.
// We'll create systems then prime regionManager with startPos

// Input
const touchMovement = createTouchMovement(app, MOVEMENT_CONFIG, INPUT_CONFIG);
const keyboardInput = createKeyboardInput(MOVEMENT_CONFIG, app);

// Player controller
const playerController = createPlayerController(player, playground, camera, MOVEMENT_CONFIG, characterPhysics);
player.position.set(startPos.x, startPos.y, startPos.z);

// Camera
const cameraFollow = createCameraFollow(camera, player, CAMERA_CONFIG_FOLLOW, CAMERA_CONFIG);
cameraFollow.snap();

// Physics debug
const physicsDebug = createPhysicsDebug(scene, characterPhysics, physicsWorld);

// Harvesting placements — now data-driven via worldRegistry (no second loader)
const placementsFromWorld = worldRegistry.getAllResources().map(r => ({
  type: r.type,
  pos: { ...r.pos },
  regionId: r.regionId,
  id: r.id,
}));

// Fallback: ensure 18 nodes (migration check) — world data already contains 18

const gameAudio = createGameAudio();
const particleSystem = createParticleSystem(scene);
const inventoryHud = createRunInventoryHud();
const autoHarvestToggle = createAutoHarvestToggle(true);
let autoHarvestEnabled = true;
autoHarvestToggle.onToggle((v) => { autoHarvestEnabled = v; });

const pickupSystem = createPickupSystem(scene, physicsWorld, playground, (inv, resId) => {
  inventoryHud.update(inv);
  if (resId) inventoryHud.pulse(resId);
  // Session owns unsecured cargo summary
  expeditionSession.setCargo(inv);
});
pickupSystem.setPlayerCollider(characterPhysics.collider);
inventoryHud.update(pickupSystem.getInventory());
expeditionSession.setCargo(pickupSystem.getInventory());

const resourceSystem = createResourceSystem(scene, physicsWorld, placementsFromWorld);
const fieldTool = createFieldTool(player, gameAudio);

// Phase 3 systems
const combatHud = createCombatHud();
const xpMoteSystem = createXpMoteSystem(scene, {
  onXpChanged: (xp) => {
    combatHud.updateXp(xp);
    expeditionSession.setXp(xp);
  },
  onCollectSound: () => gameAudio.playXpCollect(),
  worldRegistry,
}, physicsWorld, playground);
xpMoteSystem.setWorldRegistry(worldRegistry);
const combatSession = createCombatSession();

// Player combat (health, knockback, i-frames)
let isDead = false;
let deathOverlay = null;

const playerCombat = createPlayerCombat({
  playerMesh: player,
  characterPhysics,
  gameAudio,
  particleSystem,
  getPlayerState: () => playerController.getState(),
  getCreatures: () => creatureSystem.getCreatures(),
  onHealthChanged: (h, mh) => combatHud.updateHealth(h, mh),
  onDamageFeedback: () => combatHud.pulseDamage(),
  onDeath: () => {
    if (isDead) return;
    isDead = true;
    expeditionSession.onDeath();
    const inv = pickupSystem.getInventory();
    const xp = xpMoteSystem.getXp();
    const kills = expeditionSession.getKills();
    setTimeout(() => {
      deathOverlay.show({ kills, xp, inventory: inv });
    }, 280);
  },
  scene,
});
combatHud.updateHealth(playerCombat.getHealth(), playerCombat.getMaxHealth());
combatHud.updateXp(0);

const projectileSystem = createProjectileSystem(scene, physicsWorld, playground);
projectileSystem.setWorldRegistry(worldRegistry);
projectileSystem.setDamageCallback((dmg, pos) => {
  if (isDead) return false;
  const ok = playerCombat.takeDamage(dmg, pos);
  if (ok) {
    combatSession.notifyDamage();
    combatHud.pulseDamage();
  }
  return ok;
});
projectileSystem.setInvulnChecker(() => playerCombat.isInvulnerable());

const spawnsFromWorld = worldRegistry.getAllCreatures();
const creatureSystem = createCreatureSystem(scene, physicsWorld, playground, {
  spawns: spawnsFromWorld,
  worldRegistry,
  onCreatureDamaged: (creature, amount) => {
    gameAudio.playEnemyHit();
    const mockNode = { state: { position: { x: creature.state.pos.x, y: creature.state.pos.y, z: creature.state.pos.z } }, type: { impactEffectHeight: 0.45, resourceId: "generic" } };
    try { particleSystem.spawnBurst(mockNode, 4); } catch {}
  },
  onCreatureDied: (creature) => {
    expeditionSession.addKill();
    gameAudio.playEnemyDeath();
    const mockNode = { state: { position: { x: creature.state.pos.x, y: creature.state.pos.y, z: creature.state.pos.z } }, type: { impactEffectHeight: 0.5, resourceId: "generic" } };
    try { particleSystem.spawnBurst(mockNode, 8); } catch {}
    if (creature.state.playerDamaged) {
      const xpCount = creature.state.type === "spitter" ? COMBAT_CONFIG.xpSpitter : COMBAT_CONFIG.xpRusher;
      // Spawn with region for culling
      xpMoteSystem.spawnMotes(creature.state.pos, xpCount, { regionId: creature.state.regionId });
    }
    combatSession.notifyAttack();
  },
  onPlayerDamage: (dmg, pos) => {
    if (isDead) return false;
    if (playerCombat.isInvulnerable()) return false;
    const ok = playerCombat.takeDamage(dmg, pos);
    if (ok) {
      combatSession.notifyDamage();
      combatHud.pulseDamage();
    }
    return ok;
  },
  onRequestProjectile: (origin, dir, owner) => {
    projectileSystem.spawnProjectile(origin, dir, owner);
    gameAudio.playProjectileFire();
  },
});
creatureSystem.setInvulnChecker(() => playerCombat.isInvulnerable());
creatureSystem.setPlayerCollider(characterPhysics.collider);
projectileSystem.setPlayerCollider(characterPhysics.collider);
projectileSystem.setWildkinProvider(() => creatureSystem.getCreatures());
projectileSystem.setWildkinDamageCallback((target, dmg, pos, owner) => {
  creatureSystem.damageCreature(target, dmg, pos, null, owner ?? null);
  return true;
});

xpMoteSystem.setPlayerPos(playerController.getState().pos);

// Prime region activation after all gameplay systems exist (deterministic, no duplicate creation)
{
  const init = regionManager.update(startPos);
  lastActiveIds = init.activeIds;
  expeditionSession.setRegion(init.currentRegionId, init.currentPocketId);
  resourceSystem.setActiveRegions(init.activeIds);
  creatureSystem.setActiveRegions(init.activeIds);
}

// Death overlay
deathOverlay = createDeathOverlay(() => {
  doRestart();
});
deathOverlay.hide();

// Restart logic — session owns run reset lifecycle
function doRestart() {
  isDead = false;
  expeditionSession.reset(worldRegistry.getStartAnchorId() ?? "camp_gate");
  expeditionSession.setRegion(regionManager.getCurrentRegionId(), regionManager.getCurrentPocketId());
  // Reset playerCombat
  playerCombat.reset();
  combatHud.updateHealth(playerCombat.getHealth(), playerCombat.getMaxHealth());
  // Reset player position/facing
  const sPos = startPos;
  characterPhysics.setPosition(sPos);
  player.position.set(sPos.x, sPos.y, sPos.z);
  // Reset playerController state
  const st = playerController.state;
  st.mode = "IDLE";
  st.pos.set(sPos.x, sPos.y, sPos.z);
  st.vel.set(0, 0, 0);
  st.verticalVelocity = 0;
  st.grounded = true;
  st.facing = 0;
  st.speed = 0;
  st.dodgeCooldown = 0;
  st.dodgeTime = 0;
  st.airCap = 0;
  st.jumpData = null;
  st.fallHVel = null;
  st.climbable = null;
  st.mantleData = null;
  playerController.traversal.reset();
  playerController.syncPosFromPhysics();
  // Reset camera
  cameraFollow.snap();
  // Reset region to start (south_basin) and reapply activation before creature reset to avoid stale colliders
  {
    const cur = regionManager.update(sPos);
    expeditionSession.setRegion(cur.currentRegionId, cur.currentPocketId);
    resourceSystem.setActiveRegions(cur.activeIds);
    creatureSystem.setActiveRegions(cur.activeIds);
    // Clear temp entities that belong to now-inactive regions (none at start, but ensures pools bounded)
    pickupSystem.cullInactiveRegions(cur.activeIds, worldRegistry);
    projectileSystem.cullInactiveRegions(cur.activeIds, worldRegistry);
    xpMoteSystem.cullInactiveRegions(cur.activeIds, worldRegistry);
    lastActiveIds = cur.activeIds;
  }
  // Reset creatureSystem (respects active regions)
  creatureSystem.reset();
  // Clear projectiles
  projectileSystem.reset();
  // Clear XP motes and XP total (session already reset via setXp 0 in xpMoteSystem.reset -> onXpChanged)
  xpMoteSystem.reset();
  combatHud.updateXp(0);
  expeditionSession.setXp(0);
  // Reset pickup inventory (temporary run cargo) — session already owns summary
  pickupSystem.resetInventory();
  inventoryHud.update(pickupSystem.getInventory());
  expeditionSession.setCargo(pickupSystem.getInventory());
  // Clear active pickups (cull already, but explicit clear for restart)
  if (pickupSystem.clear) {
    try { pickupSystem.clear(); } catch {}
  }
  // Reset resource nodes to fresh if needed (depleted -> ready) — respects region activation (only active nodes need collider restore now)
  for (const n of resourceSystem.nodes) {
    if (n.state.nodeState === "RESPAWNING") {
      n.state.nodeState = "READY";
      n.state.remainingChunks = n.type.maxChunks;
      n.state.respawnRemaining = 0;
      for (const m of n.chunkMeshes) m.visible = true;
      if (n.remnantMesh) n.remnantMesh.visible = false;
      n.respawnGroup.visible = false;
      if (n.type.solid && !n.collider && !n._regionInactive) {
        n._pendingColliderRestore = true;
      }
    }
    // If region inactive, keep hidden; will be restored on reactivation
    if (n._regionInactive) {
      n.group.visible = false;
    }
  }
  // Reset combat session
  combatSession.reset();
  // Reset fieldTool — shared cadence must be ready after restart
  if (fieldTool.hardReset) fieldTool.hardReset(); else fieldTool.resetSwing();
  // Hide overlay
  deathOverlay.hide();
  // Auto harvest preference preserved
  autoHarvestToggle.setEnabled(autoHarvestEnabled, false);
  accumulator = 0;
}

// Also handle window reset for debug
window.__restart = doRestart;

// Loop — single rAF drives all per-frame updates and rendering (thin main.js)
const clock = new THREE.Clock();
let frameCount = 0;
let lastFpsUpdate = performance.now();
let fps = 0;
let accumulator = 0;
let physicsSubstepsLast = 0;
const fixedDt = RAPIER_CONFIG.fixedDt;
const maxSubsteps = RAPIER_CONFIG.maxSubsteps;
const maxDelta = RAPIER_CONFIG.maxDelta;

if (debugLabel) debugLabel.textContent = `${VERSION} · Rapier ${RAPIER.version ? RAPIER.version() : "0.20.0"} · starting…`;

function tick() {
  requestAnimationFrame(tick);

  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, maxDelta);
  accumulator += dt;

  const touchIntent = touchMovement.getIntent();
  const kbIntent = keyboardInput.getIntent();
  const intent = mergeIntentsPure(touchIntent, kbIntent);
  const wasDodgeRequested = intent.dodgeRequested;
  const wasAttackRequested = intent.attackRequested;

  let substeps = 0;
  while (accumulator >= fixedDt && substeps < maxSubsteps) {
    if (!isDead) {
      const pStBefore = playerController.getState();
      const isAggroNearby = creatureSystem.isAnyAggroedNearby();
      combatSession.update(fixedDt, isAggroNearby);
      const combatEngaged = combatSession.isEngaged();
      const harvestingAllowed = autoHarvestEnabled;

      const pPosForCombat = pStBefore.pos;
      const pFacingForCombat = pStBefore.facing;
      const getCombatTargetsWrapped = () => {
        const alive = creatureSystem.getAliveCreatures();
        const cands = alive.map(c => ({ id: c.state.id, pos: { x: c.state.pos.x, y: c.state.pos.y, z: c.state.pos.z }, isDead: c.state.isDead }));
        const hits = getAttackTargets(pPosForCombat, pFacingForCombat, cands);
        return hits.map(h => alive.find(a => a.state.id === h.id)).filter(Boolean);
      };

      const canAttack = !isDead;
      const fieldCanAttack = !isDead && (playerController.getState().mode !== "CLIMB" && playerController.getState().mode !== "MANTLE");
      const effectiveAttackRequested = wasAttackRequested;
      const effectiveAttackHeld = !!intent.attackHeld && fieldCanAttack;
      const getManualHarvestTargets = () => {
        const pPos = pStBefore.pos;
        const res = [];
        for (const n of resourceSystem.nodes) {
          if (resourceSystem.isHarvestableInRange(n, pPos)) res.push(n);
        }
        res.sort((a, b) => {
          const da = Math.hypot(a.state.position.x - pPos.x, a.state.position.y - pPos.y, a.state.position.z - pPos.z);
          const db = Math.hypot(b.state.position.x - pPos.x, b.state.position.y - pPos.y, b.state.position.z - pPos.z);
          return da - db;
        });
        return res.slice(0, 4);
      };
      const handleUnifiedImpact = ({ resourceHits, combatHits }) => {
        for (const node of resourceHits) {
          resourceSystem.applyHit(
            node,
            (n) => pickupSystem.spawnPickup(n),
            (n, cnt) => particleSystem.spawnBurst(n, cnt),
            (profile, isFinal) => {
              gameAudio.playHarvest(profile, isFinal);
              if (isFinal) gameAudio.playDeplete();
            }
          );
        }
        for (const creature of combatHits) {
          const pPos = playerController.getState().pos;
          const dir = { x: creature.state.pos.x - pPos.x, z: creature.state.pos.z - pPos.z };
          const len = Math.hypot(dir.x, dir.z) || 1;
          const nDir = { x: dir.x / len, z: dir.z / len };
          const damaged = creatureSystem.damageCreature(creature, COMBAT_CONFIG.baseDamage, pPos, nDir, "player");
          if (damaged) combatSession.notifyAttack();
        }
        if (combatHits.length > 0) combatSession.notifyAttack();
      };
      fieldTool.update(
        fixedDt,
        pPosForCombat,
        pStBefore,
        {
          getHarvestTargets: (pos, mode, speed, autoFlag) => resourceSystem.getEligibleNodes(pos, mode, speed ?? pStBefore.speed, autoFlag ?? harvestingAllowed),
          getManualHarvestTargets,
          getResourceHits: getManualHarvestTargets,
          onHarvestImpact: (targets) => handleUnifiedImpact({ resourceHits: targets, combatHits: [] }),
          onCombatImpact: (targets) => handleUnifiedImpact({ resourceHits: [], combatHits: targets }),
          onUnifiedImpact: handleUnifiedImpact,
          attackRequested: effectiveAttackRequested,
          attackHeld: effectiveAttackHeld,
          canAttack: fieldCanAttack,
          getCombatTargets: getCombatTargetsWrapped,
          autoHarvestEnabled: harvestingAllowed,
          combatEngaged: combatEngaged,
          isDodging: pStBefore.mode === "DODGE",
          creatures: creatureSystem.getAliveCreatures(),
          playerPos: pPosForCombat,
          playerFacing: pFacingForCombat,
        }
      );

      if (fieldTool.activeProfile === "combat" && fieldTool.isSwinging) {
        combatSession.notifyAttack();
      }

      const healthIntent = { ...intent, attackRequested: false };
      playerCombat.update(fixedDt, healthIntent, pStBefore.pos, pStBefore.facing, creatureSystem.getCreatures?.());

      const combatActive = fieldTool.isSwinging && fieldTool.activeProfile === "combat";
      const combatProgress = fieldTool.swingProgress ?? 0;
      const combatImpact = COMBAT_CONFIG.attackImpactNormalized;
      const combatWin = COMBAT_CONFIG.facingCommitWindow;
      const facingLocked = combatActive && combatProgress >= combatImpact - combatWin * 0.5 && combatProgress <= combatImpact + combatWin;
      const knockback = playerCombat.getKnockback?.();
      const combatOpts = {
        attackActive: combatActive,
        attackMovementFactor: COMBAT_CONFIG.attackMovementFactor,
        facingLocked: facingLocked,
        lockFacing: facingLocked ? pStBefore.facing : undefined,
        knockback: knockback && knockback.remaining > 0 ? knockback : null,
      };

      // === Fixed-loop ordering: initialize → Field Tool → playerCombat → movement → region activation → creatures/projectiles/XP → resources/pickups ===
      playerController.update(fixedDt, intent, combatOpts);

      const pStateFixed = playerController.getState();
      const pPosFixed = pStateFixed.pos;

      // Region activation — determine current region from player position, compute active set (current + neighbors)
      // Emit/apply only when set changes; neighbor buffer prevents pop-in; avoid per-frame churn
      {
        const regionRes = regionManager.update(pPosFixed);
        if (regionRes.changed) {
          lastActiveIds = regionRes.activeIds;
          // Hooks already applied via onChange (session + resource/creature activation + culling)
          // But ensure we also update local tracking for debug
        }
      }

      // Update creatures (only active regions simulate)
      creatureSystem.setPlayerPos(pPosFixed);
      creatureSystem.setPlayerState(pStateFixed);
      creatureSystem.update(fixedDt);

      // Projectiles (only active? global but culling handles)
      projectileSystem.setPlayerPos(pPosFixed);
      projectileSystem.setPlayerState(pStateFixed);
      projectileSystem.update(fixedDt);

      // XP motes
      xpMoteSystem.setPlayerPos(pPosFixed);
      xpMoteSystem.update(fixedDt);

      // Resources (only active regions tick)
      resourceSystem.update(fixedDt, pPosFixed, pStateFixed.mode, pStateFixed.speed, harvestingAllowed);
      // Pickups (global, but inactive region pickups already culled on region change)
      pickupSystem.update(fixedDt, pPosFixed, (resId) => gameAudio.playPickup(resId), characterPhysics.collider);
      // Focus rings
      const aliveForRing = creatureSystem.getAliveCreatures();
      const ringTargets = getAttackTargets(pPosFixed, pStateFixed.facing, aliveForRing.map(c => ({ id: c.state.id, pos: { x: c.state.pos.x, y: c.state.pos.y, z: c.state.pos.z }, isDead: c.state.isDead })));
      const ringSet = new Set(ringTargets.map(r => r.id));
      for (const c of aliveForRing) {
        c.showFocusRing(ringSet.has(c.state.id));
      }
      for (const c of creatureSystem.getCreatures()) {
        if (c.state.isDead || c.state.aiState === "RESPAWNING" || c.state._regionInactive) c.showFocusRing(false);
      }

      if (wasDodgeRequested && pStateFixed.mode === "DODGE") {
        intent.dodgeRequested = false;
      }
      if (wasAttackRequested && fieldTool.activeProfile === "combat" && fieldTool.isSwinging) {
        intent.attackRequested = false;
      }
    } else {
      for (const c of creatureSystem.getCreatures()) c.showFocusRing(false);
    }

    accumulator -= fixedDt;
    substeps++;
  }
  physicsSubstepsLast = substeps;
  if (accumulator >= fixedDt) accumulator = 0;

  if (wasDodgeRequested) {
    touchMovement.consumeDodge();
    keyboardInput.consumeDodge?.();
  }
  if (wasAttackRequested) {
    touchMovement.consumeAttack?.();
    keyboardInput.consumeAttack?.();
  }

  const pState = playerController.getState();
  const moveDir = pState.speed > 0.1 ? { x: Math.sin(pState.facing), z: Math.cos(pState.facing) } : null;
  cameraFollow.update(dt, pState.speed, moveDir);

  particleSystem.update(dt);
  if (substeps === 0 && !isDead) {
    const harvestingAllowedPerFrame = autoHarvestEnabled;
    pickupSystem.update(Math.min(dt, 1 / 30), pState.pos, (resId) => gameAudio.playPickup(resId), characterPhysics.collider);
    if (!isDead) {
      const aliveForRing = creatureSystem.getAliveCreatures();
      const ringTargets = getAttackTargets(pState.pos, pState.facing, aliveForRing.map(c => ({ id: c.state.id, pos: { x: c.state.pos.x, y: c.state.pos.y, z: c.state.pos.z }, isDead: c.state.isDead })));
      const ringSet = new Set(ringTargets.map(r => r.id));
      for (const c of aliveForRing) c.showFocusRing(ringSet.has(c.state.id));
    }
  }

  physicsDebug.update(pState.grounded, pState.speed, pState.verticalVelocity, physicsSubstepsLast);

  frameCount++;
  const now = performance.now();
  if (now - lastFpsUpdate > 500) {
    fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
    lastFpsUpdate = now;
    frameCount = 0;
    if (debugLabel) {
      const band = intent.movementBand;
      const stMode = pState.mode;
      const trav = pState.traversalMode && pState.traversalMode !== "IDLE" && pState.traversalMode !== stMode ? ` · ${pState.traversalMode}` : "";
      const grounded = pState.grounded ? "G" : "A";
      const vv = pState.verticalVelocity.toFixed(1);
      const inv = pickupSystem.getInventory();
      const hp = playerCombat.getHealth();
      const xp = xpMoteSystem.getXp();
      const kills = expeditionSession.getKills();
      const alive = creatureSystem.getActiveAliveCreatures ? creatureSystem.getActiveAliveCreatures().length : creatureSystem.getAliveCount();
      const totalAlive = creatureSystem.getCreatures().filter(c=>!c.state.isDead && c.state.aiState!=="RESPAWNING").length;
      const engaged = combatSession.isEngaged() ? "C" : "-";
      const curReg = regionManager.getCurrentRegionId() ?? "none";
      const activeIds = regionManager.getActiveIds().join(",");
      const sess = expeditionSession.getState();
      debugLabel.textContent = `${VERSION} · ${fps} fps · ${stMode}${trav} · ${band} · ${pState.speed.toFixed(1)} u/s · HP${hp} XP${xp} K${kills} A${alive}/${totalAlive}${engaged} · ${curReg} [${activeIds}] · W${inv.wood} S${inv.stone} F${inv.fiber} · ${grounded} vv${vv} · ${substeps} step`;
    }
  }

  renderer.render(scene, camera);
}

tick();

// Debug globals — gameplay code must not rely on window.__game
window.__game = {
  scene, camera, renderer, player, playground, playerController, touchMovement, keyboardInput, THREE, MOVEMENT_CONFIG, RAPIER, physicsWorld, characterPhysics, physicsDebug, resourceSystem, pickupSystem, fieldTool, inventoryHud, gameAudio, particleSystem, autoHarvestToggle, combatHud, deathOverlay, creatureSystem, projectileSystem, xpMoteSystem, playerCombat, combatSession,
  worldRegistry, regionManager, expeditionSession,
  get autoHarvestEnabled() { return autoHarvestEnabled; },
  set autoHarvestEnabled(v) { autoHarvestEnabled = !!v; autoHarvestToggle.setEnabled(autoHarvestEnabled); },
  get debugCounts() {
    return {
      activePickups: pickupSystem.getCount(),
      pooledPickups: pickupSystem.getPooledCount(),
      activeParticles: particleSystem.getCount(),
      pooledParticles: particleSystem.getPooledCount(),
      activeProjectiles: projectileSystem.getCount(),
      pooledProjectiles: projectileSystem.getPooledCount(),
      activeMotes: xpMoteSystem.getCount(),
      pooledMotes: xpMoteSystem.getPooledCount(),
      aliveCreatures: creatureSystem.getAliveCount(),
      activeAliveCreatures: creatureSystem.getActiveAliveCreatures ? creatureSystem.getActiveAliveCreatures().length : creatureSystem.getAliveCount(),
      totalCreatures: creatureSystem.getCreatures().length,
      currentRegion: regionManager.getCurrentRegionId(),
      activeRegions: regionManager.getActiveIds(),
      expedition: expeditionSession.getState(),
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      fps,
      health: playerCombat.getHealth(),
      xp: xpMoteSystem.getXp(),
      kills: expeditionSession.getKills(),
      isDead,
      combatEngaged: combatSession.isEngaged(),
    };
  },
  get regionDebug() {
    return {
      currentRegion: regionManager.getCurrentRegionId(),
      currentPocket: regionManager.getCurrentPocketId(),
      activeIds: regionManager.getActiveIds(),
      activeCreatures: creatureSystem.getActiveAliveCreatures ? creatureSystem.getActiveAliveCreatures().length : -1,
      activeResources: resourceSystem.getActiveNodeCount ? resourceSystem.getActiveNodeCount() : -1,
    };
  },
};
