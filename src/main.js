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

const canvas = document.getElementById("c");
const app = document.getElementById("app");
const debugLabel = document.getElementById("debug-label");

const VERSION = "Phase 3.1.1 — 0.8.1";

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

// Physics
const physicsWorld = createPhysicsWorld(RAPIER, playground);
const startPos = { x: 0, y: RAPIER_CONFIG.capsuleTotalHeight / 2 + 0.15, z: 5.5 };
const characterPhysics = createCharacterPhysics(RAPIER, physicsWorld.world, startPos);

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

// Harvesting placements
const resourcePlacements = [
  { type: "tree", pos: { x: 1.2, y: 0, z: 4.2 } },
  { type: "tree", pos: { x: -8.6, y: 0, z: 1.8 } },
  { type: "tree", pos: { x: 6.2, y: 0, z: -1.8 } },
  { type: "tree", pos: { x: 2.2, y: 2.4, z: -7.2 } },
  { type: "tree", pos: { x: -9.0, y: 0, z: 6.5 } },
  { type: "tree", pos: { x: 8.8, y: 0, z: 3.2 } },
  { type: "rock", pos: { x: 3.2, y: 0, z: 2.6 } },
  { type: "rock", pos: { x: 4.6, y: 0, z: 3.4 } },
  { type: "rock", pos: { x: 7.2, y: 0, z: 0.8 } },
  { type: "rock", pos: { x: -3.0, y: 0, z: -4.5 } },
  { type: "rock", pos: { x: -1.8, y: 0, z: -4.8 } },
  { type: "fiber", pos: { x: 0.2, y: 0, z: 4.6 } },
  { type: "fiber", pos: { x: -2.2, y: 0, z: 6.0 } },
  { type: "fiber", pos: { x: -7.2, y: 0, z: -1.2 } },
  { type: "fiber", pos: { x: 1.0, y: 0, z: -3.8 } },
  { type: "fiber", pos: { x: 8.4, y: 0, z: -2.4 } },
  { type: "fiber", pos: { x: -4.2, y: 0, z: -8.2 } },
  { type: "fiber", pos: { x: 4.0, y: 0, z: -5.8 } },
];

const gameAudio = createGameAudio();
const particleSystem = createParticleSystem(scene);
const inventoryHud = createRunInventoryHud();
const autoHarvestToggle = createAutoHarvestToggle(true);
let autoHarvestEnabled = true;
autoHarvestToggle.onToggle((v) => { autoHarvestEnabled = v; });

const pickupSystem = createPickupSystem(scene, physicsWorld, playground, (inv, resId) => {
  inventoryHud.update(inv);
  if (resId) inventoryHud.pulse(resId);
});
pickupSystem.setPlayerCollider(characterPhysics.collider);
inventoryHud.update(pickupSystem.getInventory());

const resourceSystem = createResourceSystem(scene, physicsWorld, resourcePlacements);
const fieldTool = createFieldTool(player, gameAudio);

// Phase 3 systems
const combatHud = createCombatHud();
const xpMoteSystem = createXpMoteSystem(scene, {
  onXpChanged: (xp) => combatHud.updateXp(xp),
  onCollectSound: () => gameAudio.playXpCollect(),
}, physicsWorld, playground);
const combatSession = createCombatSession();

// Player combat (health, knockback, i-frames)
let killCount = 0;
let isDead = false;

// Need to define death overlay later but need callback
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
    // show death overlay after short delay (~0.3)
    const inv = pickupSystem.getInventory();
    const xp = xpMoteSystem.getXp();
    setTimeout(() => {
      deathOverlay.show({ kills: killCount, xp, inventory: inv });
    }, 280);
    // freeze enemy offense? creatureSystem will check isDead
  },
  scene,
});
combatHud.updateHealth(playerCombat.getHealth(), playerCombat.getMaxHealth());
combatHud.updateXp(0);

const projectileSystem = createProjectileSystem(scene, physicsWorld, playground);
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

const creatureSystem = createCreatureSystem(scene, physicsWorld, playground, {
  onCreatureDamaged: (creature, amount) => {
    gameAudio.playEnemyHit();
    const mockNode = { state: { position: { x: creature.state.pos.x, y: creature.state.pos.y, z: creature.state.pos.z } }, type: { impactEffectHeight: 0.45, resourceId: "generic" } };
    try { particleSystem.spawnBurst(mockNode, 4); } catch {}
  },
  onCreatureDied: (creature) => {
    killCount += 1;
    gameAudio.playEnemyDeath();
    const mockNode = { state: { position: { x: creature.state.pos.x, y: creature.state.pos.y, z: creature.state.pos.z } }, type: { impactEffectHeight: 0.5, resourceId: "generic" } };
    try { particleSystem.spawnBurst(mockNode, 8); } catch {}
    // XP: wildlife-only kill with no player participation gives no player XP
    if (creature.state.playerDamaged) {
      const xpCount = creature.state.type === "spitter" ? COMBAT_CONFIG.xpSpitter : COMBAT_CONFIG.xpRusher;
      xpMoteSystem.spawnMotes(creature.state.pos, xpCount);
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

// Death overlay
deathOverlay = createDeathOverlay(() => {
  doRestart();
});
deathOverlay.hide();

// Restart logic
function doRestart() {
  isDead = false;
  killCount = 0;
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
  // Reset creatureSystem
  creatureSystem.reset();
  // Clear projectiles
  projectileSystem.reset();
  // Clear XP motes and XP total
  xpMoteSystem.reset();
  combatHud.updateXp(0);
  // Reset pickup inventory (temporary run cargo)
  pickupSystem.resetInventory();
  inventoryHud.update(pickupSystem.getInventory());
  // Clear active pickups
  const activePickups = pickupSystem.getPickups?.() ?? [];
  if (pickupSystem.clear) {
    try { pickupSystem.clear(); } catch {}
  }
  if (activePickups.length > 0) {
    for (const p of [...activePickups]) {
      try {
        // release via internal pool: remove mesh and splice
        if (p.mesh && p.mesh.parent) p.mesh.parent.remove(p.mesh);
        p.collected = true;
      } catch {}
    }
    // Ensure internal array cleared by calling clear if available or manually splice
    if (pickupSystem._clearActive) pickupSystem._clearActive();
    else {
      // fallback force clear via resetting internal list if accessible
      try { activePickups.length = 0; } catch {}
    }
  }
  // Reset resource nodes to fresh if needed (depleted -> ready)
  // For testing, reset all respawning nodes to ready, restore colliders if pending
  for (const n of resourceSystem.nodes) {
    if (n.state.nodeState === "RESPAWNING") {
      // Force respawn immediately but check collider defer?
      n.state.nodeState = "READY";
      n.state.remainingChunks = n.type.maxChunks;
      n.state.respawnRemaining = 0;
      // Show chunks
      for (const m of n.chunkMeshes) m.visible = true;
      if (n.remnantMesh) n.remnantMesh.visible = false;
      n.respawnGroup.visible = false;
      // Try restore collider if solid
      if (n.type.solid && !n.collider) {
        try {
          // use resourceSystem internal tryRestore? We'll just call resourceSystem internal via respawn logic? Simpler: rely on next update to restore via pending flag
          n._pendingColliderRestore = true;
        } catch {}
      }
    }
  }
  // Reset combat session
  combatSession.reset();
  // Reset fieldTool — shared cadence must be ready after restart
  if (fieldTool.hardReset) fieldTool.hardReset(); else fieldTool.resetSwing();
  // Hide overlay
  deathOverlay.hide();
  // Auto harvest preference preserved (do not reset)
  autoHarvestToggle.setEnabled(autoHarvestEnabled, false);
  // Reset particleSystem? keep pooled
  // Ensure playerCombat health etc. already reset
  // Reset accumulator?
  accumulator = 0;
}

// Also handle window reset for debug
window.__restart = doRestart;

// Loop
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
    // If dead, skip gameplay updates but still need to tick some timers? Freeze.
    if (!isDead) {
      // Update combat session with aggro check (before movement? use current player pos)
      const pStBefore = playerController.getState();
      const isAggroNearby = creatureSystem.isAnyAggroedNearby();
      combatSession.update(fixedDt, isAggroNearby);
      const combatEngaged = combatSession.isEngaged();

      // Phase 3.1: Auto Harvest no longer suppressed by combatEngaged; enemy presence does not disable harvesting
      const harvestingAllowed = autoHarvestEnabled;

      // Prepare combat target getter for fieldTool
      const pPosForCombat = pStBefore.pos;
      const pFacingForCombat = pStBefore.facing;
      const getCombatTargets = () => {
        const alive = creatureSystem.getAliveCreatures();
        return getAttackTargets(pPosForCombat, pFacingForCombat, alive.map(c => ({
          id: c.state.id,
          pos: { x: c.state.pos.x, y: c.state.pos.y, z: c.state.pos.z },
          isDead: c.state.isDead,
          health: c.state.health,
          _creature: c,
        })).map(o => {
          // Preserve creature reference for damage
          const orig = alive.find(a => a.state.id === o.id);
          return orig ? { ...o, _orig: orig, pos: { x: orig.state.pos.x, y: orig.state.pos.y, z: orig.state.pos.z } } : o;
        }));
      };
      // But getAttackTargets expects candidates with pos; we can just map to creature wrappers
      const getCombatTargetsWrapped = () => {
        const alive = creatureSystem.getAliveCreatures();
        const cands = alive.map(c => ({ id: c.state.id, pos: { x: c.state.pos.x, y: c.state.pos.y, z: c.state.pos.z }, isDead: c.state.isDead }));
        // Need to return creature objects themselves for damage, so return alive filtered by targeting
        const hits = getAttackTargets(pPosForCombat, pFacingForCombat, cands);
        // Map back to actual creature objects
        return hits.map(h => alive.find(a => a.state.id === h.id)).filter(Boolean);
      };

      // Unified Field Tool impact: one swing may harvest + damage — shared physical cadence
      const canAttack = !isDead;
      const fieldCanAttack = !isDead && (playerController.getState().mode !== "CLIMB" && playerController.getState().mode !== "MANTLE");
      const effectiveAttackRequested = wasAttackRequested;
      const effectiveAttackHeld = !!intent.attackHeld && fieldCanAttack;
      // Manual harvest targets (range-only, ignores Auto flag)
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
        // Resources: harvest
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
        // Creatures: damage
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

      // If attack started, notify combatSession
      if (fieldTool.activeProfile === "combat" && fieldTool.isSwinging) {
        combatSession.notifyAttack();
      }

      // PlayerCombat health tick (invuln, knockback timers) - pass filtered intent without attack to avoid double attack handling
      const healthIntent = { ...intent, attackRequested: false };
      // Create a dummy intent for health update that excludes attack
      playerCombat.update(fixedDt, healthIntent, pStBefore.pos, pStBefore.facing, creatureSystem.getCreatures?.());

      // Derive movement modifier from fieldTool combat swing
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

      // Movement update with combat modifier
      playerController.update(fixedDt, intent, combatOpts);

      const pStateFixed = playerController.getState();
      const pPosFixed = pStateFixed.pos;

      // Update creatures
      creatureSystem.setPlayerPos(pPosFixed);
      creatureSystem.setPlayerState(pStateFixed);
      creatureSystem.update(fixedDt);

      // Projectiles
      projectileSystem.setPlayerPos(pPosFixed);
      projectileSystem.setPlayerState(pStateFixed);
      projectileSystem.update(fixedDt);

      // XP motes
      xpMoteSystem.setPlayerPos(pPosFixed);
      xpMoteSystem.update(fixedDt);

      // Resources (fixed step)
      resourceSystem.update(fixedDt, pPosFixed, pStateFixed.mode, pStateFixed.speed, harvestingAllowed);
      // Pickups
      pickupSystem.update(fixedDt, pPosFixed, (resId) => gameAudio.playPickup(resId), characterPhysics.collider);
      // Focus rings: compute would-be hit targets each substep (or per frame)
      const aliveForRing = creatureSystem.getAliveCreatures();
      const ringTargets = getAttackTargets(pPosFixed, pStateFixed.facing, aliveForRing.map(c => ({ id: c.state.id, pos: { x: c.state.pos.x, y: c.state.pos.y, z: c.state.pos.z }, isDead: c.state.isDead })));
      const ringSet = new Set(ringTargets.map(r => r.id));
      for (const c of aliveForRing) {
        c.showFocusRing(ringSet.has(c.state.id));
      }
      // Also hide rings for dead/respawning
      for (const c of creatureSystem.getCreatures()) {
        if (c.state.isDead || c.state.aiState === "RESPAWNING") c.showFocusRing(false);
      }

      // Consume dodge/attack only on first substep where it triggered and mode entered
      if (wasDodgeRequested && pStateFixed.mode === "DODGE") {
        intent.dodgeRequested = false;
      }
      if (wasAttackRequested && fieldTool.activeProfile === "combat" && fieldTool.isSwinging) {
        // consume attack for this swing start
        intent.attackRequested = false;
      }
    } else {
      // Dead: still need to hide focus rings
      for (const c of creatureSystem.getCreatures()) c.showFocusRing(false);
      // No movement/combat while dead
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
    // Focus rings per frame if no fixed steps
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
      const alive = creatureSystem.getAliveCount();
      const engaged = combatSession.isEngaged() ? "C" : "-";
      debugLabel.textContent = `${VERSION} · ${fps} fps · ${stMode}${trav} · ${band} · ${pState.speed.toFixed(1)} u/s · HP${hp} XP${xp} K${killCount} A${alive}${engaged} · W${inv.wood} S${inv.stone} F${inv.fiber} · ${grounded} vv${vv} · ${substeps} step`;
    }
  }

  renderer.render(scene, camera);
}

tick();

// Debug globals
window.__game = {
  scene, camera, renderer, player, playground, playerController, touchMovement, keyboardInput, THREE, MOVEMENT_CONFIG, RAPIER, physicsWorld, characterPhysics, physicsDebug, resourceSystem, pickupSystem, fieldTool, inventoryHud, gameAudio, particleSystem, autoHarvestToggle, combatHud, deathOverlay, creatureSystem, projectileSystem, xpMoteSystem, playerCombat, combatSession,
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
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      fps,
      health: playerCombat.getHealth(),
      xp: xpMoteSystem.getXp(),
      kills: killCount,
      isDead,
      combatEngaged: combatSession.isEngaged(),
    };
  },
};
