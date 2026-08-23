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
import { COMBAT_CONFIG } from "./combat/combatConfig.js";
import { getAttackTargets } from "./combat/combatTargeting.js";
import { createPlayerCombat } from "./combat/playerCombat.js";
import { createCreatureSystem } from "./creatures/creatureSystem.js";
import { createProjectileSystem } from "./combat/projectileSystem.js";
import { createXpMoteSystem } from "./combat/xpMoteSystem.js";
import { createCombatSession } from "./combat/combatSession.js";
import { createCombatHud } from "./ui/combatHud.js";
import WORLD_DATA from "./world/data/world.js";
import { createWorldRegistry } from "./world/worldRegistry.js";
import { createRegionManager } from "./world/regionManager.js";
import { createExpeditionSession } from "./session/expeditionSession.js";
import { createFrontierProgress } from "./save/frontierProgress.js";
import { createFrontierAnchorSystem } from "./world/frontierAnchorSystem.js";
import { createFrontierMap } from "./ui/frontierMap.js";
import { createAnchorPrompt } from "./ui/anchorPrompt.js";
import { createRunResultCard } from "./ui/runResultCard.js";
import { createFrontierIndicators } from "./ui/frontierIndicators.js";
import { createAuthorMode } from "./author/authorMode.js";
import { createContextualInteraction } from "./ui/contextualInteraction.js";
import { createActivationToast } from "./ui/activationToast.js";

const canvas = document.getElementById("c");
const app = document.getElementById("app");
const debugLabel = document.getElementById("debug-label");

const VERSION = "Phase 4A.1 — 0.11.1";

if (debugLabel) debugLabel.textContent = `${VERSION} · loading Rapier…`;

await RAPIER.init();

function getAuthorEnabled() {
  try { return new URLSearchParams(window.location.search).get("author") === "1"; } catch { return false; }
}
function getDevEnabled() {
  try { return new URLSearchParams(window.location.search).get("dev") === "1"; } catch { return false; }
}
const authorEnabled = getAuthorEnabled();
const devEnabled = getDevEnabled();
const canonicalWorldData = WORLD_DATA;
let effectiveWorldData = canonicalWorldData;
if (authorEnabled) {
  try {
    const raw = localStorage.getItem("wildkin.authorDraft");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.regions) && parsed.version) {
        effectiveWorldData = parsed;
      }
    }
  } catch {}
}

const worldRegistry = createWorldRegistry(effectiveWorldData);
const regionDepthMap = worldRegistry.getRegionDepthMap();

const { scene, player, playground } = createScene(worldRegistry.data);

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

const physicsWorld = createPhysicsWorld(RAPIER, playground);
let campSpawn = worldRegistry.getCampSpawnPosition();
let startPos = { x: campSpawn.x, y: RAPIER_CONFIG.capsuleTotalHeight / 2 + 0.15, z: campSpawn.z };
const campStartFacing = campSpawn.facingYaw ?? 0;
const characterPhysics = createCharacterPhysics(RAPIER, physicsWorld.world, startPos);

// Persistent frontier progress (isolated from author draft)
const frontierProgress = createFrontierProgress({ worldRegistry, isAuthorMode: authorEnabled });
frontierProgress.load();

// Dev-only one-action reset (visible only with ?dev=1, not in normal submission)
if (devEnabled) {
  const devBtn = document.createElement("button");
  devBtn.id = "dev-reset-save";
  devBtn.textContent = "RESET PLAYER SAVE";
  devBtn.title = "Clear frontierProgress bank/unlocks and reload fresh Camp (dev only, ?dev=1)";
  devBtn.style.cssText = "position:absolute;left:50%;top:max(10px, env(safe-area-inset-top));transform:translateX(-50%);z-index:9;background:#5a1a1a;color:#ffcccc;border:1px solid #8a3a3a;border-radius:8px;padding:6px 10px;font-size:11px;font-weight:800;cursor:pointer;pointer-events:auto;";
  app.appendChild(devBtn);
  devBtn.addEventListener("click", () => {
    if (confirm("Reset player frontier progress? This clears banked resources/XP and discovered Waypoints/Beacons (author draft untouched).")) {
      frontierProgress.clear();
      location.reload();
    }
  });
}

// Expedition session — begins at Camp (not active)
const initialRegion = worldRegistry.getRegionForPosition(startPos);
const expeditionSession = createExpeditionSession({
  startAnchorId: worldRegistry.getInitialMajorWaypointId() ?? "wp_p1_entry",
  regionDepthMap,
  initialRegionId: initialRegion,
  initialStatus: "camp",
});
expeditionSession.setRegion(initialRegion, null);

let lastActiveIds = [];
let resourceSystem, creatureSystem, pickupSystem, projectileSystem, xpMoteSystem;
const regionManager = createRegionManager(worldRegistry, {
  onChange: ({ currentRegionId, activeIds, prevActiveIds }) => {
    expeditionSession.setRegion(currentRegionId, null);
    if (resourceSystem) resourceSystem.setActiveRegions(activeIds);
    if (creatureSystem) creatureSystem.setActiveRegions(activeIds);
    const deactivated = prevActiveIds.filter(id => !activeIds.includes(id));
    if (deactivated.length > 0 && pickupSystem) {
      pickupSystem.cullInactiveRegions(activeIds, worldRegistry);
      if (projectileSystem) projectileSystem.cullInactiveRegions(activeIds, worldRegistry);
      if (xpMoteSystem) xpMoteSystem.cullInactiveRegions(activeIds, worldRegistry);
    }
  },
});

const touchMovement = createTouchMovement(app, MOVEMENT_CONFIG, INPUT_CONFIG);
const keyboardInput = createKeyboardInput(MOVEMENT_CONFIG, app);

const playerController = createPlayerController(player, playground, camera, MOVEMENT_CONFIG, characterPhysics);
player.position.set(startPos.x, startPos.y, startPos.z);
playerController.state.facing = campStartFacing;

const cameraFollow = createCameraFollow(camera, player, CAMERA_CONFIG_FOLLOW, CAMERA_CONFIG);
cameraFollow.snap();

const physicsDebug = createPhysicsDebug(scene, characterPhysics, physicsWorld);

const placementsFromWorld = worldRegistry.getAllResources().map(r => ({
  type: r.type,
  pos: { ...r.pos },
  regionId: r.regionId,
  id: r.id,
}));

const gameAudio = createGameAudio();
const particleSystem = createParticleSystem(scene);
const inventoryHud = createRunInventoryHud();
const autoHarvestToggle = createAutoHarvestToggle(true);
let autoHarvestEnabled = true;
autoHarvestToggle.onToggle((v) => { autoHarvestEnabled = v; });

pickupSystem = createPickupSystem(scene, physicsWorld, playground, (inv, resId) => {
  inventoryHud.update(inv);
  if (resId) inventoryHud.pulse(resId);
  expeditionSession.setCargo(inv);
});
pickupSystem.setPlayerCollider(characterPhysics.collider);
inventoryHud.update(pickupSystem.getInventory());
expeditionSession.setCargo(pickupSystem.getInventory());

resourceSystem = createResourceSystem(scene, physicsWorld, placementsFromWorld);
const fieldTool = createFieldTool(player, gameAudio);

const combatHud = createCombatHud();
xpMoteSystem = createXpMoteSystem(scene, {
  onXpChanged: (xp) => {
    combatHud.updateXp(xp);
    expeditionSession.setXp(xp);
  },
  onCollectSound: () => gameAudio.playXpCollect(),
  worldRegistry,
}, physicsWorld, playground);
xpMoteSystem.setWorldRegistry(worldRegistry);
const combatSession = createCombatSession();

let isDead = false; // transient death overlay flag — now replaced by result card flow but kept for tick guard
let pendingResultSnapshot = null;

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
    if (expeditionSession.isResolved?.()) return;
    handleDeathFlow();
  },
  scene,
});
combatHud.updateHealth(playerCombat.getHealth(), playerCombat.getMaxHealth());
combatHud.updateXp(0);

projectileSystem = createProjectileSystem(scene, physicsWorld, playground);
projectileSystem.setWorldRegistry(worldRegistry);
projectileSystem.setDamageCallback((dmg, pos) => {
  if (expeditionSession.getStatus() === "lost" || expeditionSession.isResolved?.()) return false;
  const ok = playerCombat.takeDamage(dmg, pos);
  if (ok) {
    combatSession.notifyDamage();
    combatHud.pulseDamage();
  }
  return ok;
});
projectileSystem.setInvulnChecker(() => playerCombat.isInvulnerable());

const spawnsFromWorld = worldRegistry.getAllCreatures();
creatureSystem = createCreatureSystem(scene, physicsWorld, playground, {
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
      xpMoteSystem.spawnMotes(creature.state.pos, xpCount, { regionId: creature.state.regionId });
    }
    combatSession.notifyAttack();
  },
  onPlayerDamage: (dmg, pos) => {
    if (expeditionSession.isResolved?.()) return false;
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

// Prime region activation after all gameplay systems exist (start at Camp)
{
  const init = regionManager.update(startPos);
  lastActiveIds = init.activeIds;
  expeditionSession.setRegion(init.currentRegionId, init.currentPocketId);
  resourceSystem.setActiveRegions(init.activeIds);
  creatureSystem.setActiveRegions(init.activeIds);
}

// UI — Map, AnchorPrompt, ResultCard, Indicators (Phase 4A focused owners)
let frontierMap, anchorPrompt, runResultCard, frontierIndicators, frontierAnchorSystem;

function isAnyBlockingModal() {
  return (frontierMap && frontierMap.isOpen()) || (anchorPrompt && anchorPrompt.isVisible()) || (runResultCard && runResultCard.isVisible());
}

function setGameplayInputBlocked(blocked) {
  touchMovement.setEnabled(!blocked);
  if (keyboardInput.setEnabled) keyboardInput.setEnabled(!blocked);
}

function refreshMapAvailability() {
  if (!frontierMap) return;
  const blocked = isAnyBlockingModal() || (authorCtx && authorCtx.isEditMode && authorCtx.isEditMode());
  // Map button should be disabled when a blocking modal already open (except map itself) or edit mode
  const mapOpen = frontierMap.isOpen();
  const anchorOpen = anchorPrompt.isVisible();
  const resultOpen = runResultCard.isVisible();
  const shouldDisableMapButton = anchorOpen || resultOpen || (authorCtx && authorCtx.isEditMode && authorCtx.isEditMode());
  frontierMap.setEnabled(!shouldDisableMapButton);
}

frontierMap = createFrontierMap({
  worldRegistry,
  frontierProgress,
  onStartSelected: (waypointId) => {
    beginExpedition(waypointId);
  },
  onClose: () => {
    refreshMapAvailability();
    syncInputBlock();
  },
  onOpen: () => {
    refreshMapAvailability();
    syncInputBlock();
  },
});

anchorPrompt = createAnchorPrompt({
  onExtract: (data) => {
    handleExtractionFlow(data);
  },
  onKeepGoing: (data) => {
    if (frontierAnchorSystem) frontierAnchorSystem.handleKeepGoing(data.id);
    refreshMapAvailability();
    syncInputBlock();
  },
});

runResultCard = createRunResultCard({
  onContinue: () => {
    // Continue returns direct Camp control (already reset to camp)
    refreshMapAvailability();
    syncInputBlock();
  },
});

frontierIndicators = createFrontierIndicators({
  worldRegistry,
  frontierProgress,
  getPlayerPos: () => playerController.getState().pos,
  getSession: () => expeditionSession,
  getCamera: () => camera,
});

const activationToast = createActivationToast(scene, camera, gameAudio);

// Contextual interaction (single owner)
let contextualInteraction = null;
contextualInteraction = createContextualInteraction({
  onActivate: (info) => {
    if (isAnyBlockingModal()) return;
    if (info.type === "gate") {
      if (expeditionSession.isCamp()) {
        frontierMap.openStartSelection();
        refreshMapAvailability();
        syncInputBlock();
      } else if (expeditionSession.isActive()) {
        handleExtractionFlow({ id: info.id, type: "gate" });
      }
    } else if (info.type === "majorWaypoint" || info.type === "extractionBeacon") {
      handleExtractionFlow({ id: info.id, type: info.type });
    }
  },
});

// Frontier anchor system — nonblocking discovery
frontierAnchorSystem = createFrontierAnchorSystem(worldRegistry, {
  getPlayerPos: () => playerController.getState().pos,
  getSession: () => expeditionSession,
  frontierProgress,
  onWaypointDiscovered: (id) => {
    const wp = worldRegistry.getWaypointById(id);
    const name = wp ? worldRegistry.getAnchorDisplayName(wp) : id;
    activationToast.show({ displayName: name, type: "majorWaypoint" });
    activationToast.pulseWorld(wp ? wp.pos : { x: 0, y: 0, z: 0 }, 0x4fc3f7);
  },
  onBeaconDiscovered: (id) => {
    const bc = worldRegistry.getBeaconById(id);
    const name = bc ? worldRegistry.getAnchorDisplayName(bc) : id;
    activationToast.show({ displayName: name, type: "extractionBeacon" });
    activationToast.pulseWorld(bc ? bc.pos : { x: 0, y: 0, z: 0 }, 0xff7043);
  },
});
frontierAnchorSystem.prime(startPos);

// Keyboard E for contextual interaction (separate from Field Tool attack)
window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "e") {
    if (authorCtx && authorCtx.isEditMode && authorCtx.isEditMode()) return;
    if (isAnyBlockingModal()) return;
    const handled = contextualInteraction.handleKey(e);
    if (handled) {
      // already activated
    }
  }
});

// Helper: sync input block from any blocking modal + author edit
let prevAuthorSuppress = false;
function syncInputBlock() {
  const authorSuppress = authorCtx && authorCtx.isEditMode && authorCtx.isEditMode();
  const modalBlocked = isAnyBlockingModal();
  const blocked = !!(authorSuppress || modalBlocked);
  setGameplayInputBlocked(blocked);
  if (authorSuppress !== prevAuthorSuppress) {
    prevAuthorSuppress = authorSuppress;
    refreshMapAvailability();
  }
}

// Shared transient world reset to Camp (extraction & death share this path where practical)
function resetTransientWorldToCamp() {
  if (pickupSystem.clear) { try { pickupSystem.clear(); } catch {} }
  pickupSystem.resetInventory();
  inventoryHud.update(pickupSystem.getInventory());
  expeditionSession.setCargo(pickupSystem.getInventory());
  xpMoteSystem.reset();
  combatHud.updateXp(0);
  expeditionSession.setXp(0);
  projectileSystem.reset();
  creatureSystem.reset();
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
    if (n._regionInactive) {
      n.group.visible = false;
    }
  }
  playerCombat.reset();
  combatHud.updateHealth(playerCombat.getHealth(), playerCombat.getMaxHealth());
  combatSession.reset();
  if (fieldTool.hardReset) fieldTool.hardReset(); else fieldTool.resetSwing();
  campSpawn = worldRegistry.getCampSpawnPosition();
  const cPos = { x: campSpawn.x, y: RAPIER_CONFIG.capsuleTotalHeight / 2 + 0.15, z: campSpawn.z };
  const campFacing = campSpawn.facingYaw ?? 0;
  characterPhysics.setPosition(cPos);
  player.position.set(cPos.x, cPos.y, cPos.z);
  const st = playerController.state;
  st.mode = "IDLE";
  st.pos.set(cPos.x, cPos.y, cPos.z);
  st.vel.set(0, 0, 0);
  st.verticalVelocity = 0;
  st.grounded = true;
  st.facing = campFacing;
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
  cameraFollow.snap();
  {
    const cur = regionManager.update(cPos);
    expeditionSession.setRegion(cur.currentRegionId, cur.currentPocketId);
    resourceSystem.setActiveRegions(cur.activeIds);
    creatureSystem.setActiveRegions(cur.activeIds);
    pickupSystem.cullInactiveRegions(cur.activeIds, worldRegistry);
    projectileSystem.cullInactiveRegions(cur.activeIds, worldRegistry);
    xpMoteSystem.cullInactiveRegions(cur.activeIds, worldRegistry);
    lastActiveIds = cur.activeIds;
  }
  frontierAnchorSystem.reset();
  frontierAnchorSystem.prime(cPos);
  isDead = false;
  accumulator = 0;
  autoHarvestToggle.setEnabled(autoHarvestEnabled, false);
}

function beginExpedition(waypointId) {
  // Validate: must be at camp, waypoint unlocked + exists
  if (!expeditionSession.isCamp()) return false;
  if (!waypointId) return false;
  const wp = worldRegistry.getWaypointById(waypointId);
  if (!wp) return false;
  if (!frontierProgress.isUnlockedWaypoint(waypointId)) return false;

  // Clear old run state (transient)
  pickupSystem.resetInventory();
  inventoryHud.update(pickupSystem.getInventory());
  xpMoteSystem.reset();
  combatHud.updateXp(0);
  projectileSystem.reset();
  if (pickupSystem.clear) { try { pickupSystem.clear(); } catch {} }
  // resources/creatures to baseline for new run
  creatureSystem.reset();
  for (const n of resourceSystem.nodes) {
    if (n.state.nodeState === "RESPAWNING") {
      n.state.nodeState = "READY";
      n.state.remainingChunks = n.type.maxChunks;
      n.state.respawnRemaining = 0;
      for (const m of n.chunkMeshes) m.visible = true;
      if (n.remnantMesh) n.remnantMesh.visible = false;
      n.respawnGroup.visible = false;
      if (n.type.solid && !n.collider && !n._regionInactive) n._pendingColliderRestore = true;
    }
  }
  playerCombat.reset();
  combatHud.updateHealth(playerCombat.getHealth(), playerCombat.getMaxHealth());
  combatSession.reset();
  if (fieldTool.hardReset) fieldTool.hardReset(); else fieldTool.resetSwing();

  // Set session active
  expeditionSession.beginRun(waypointId);
  frontierProgress.markDeparted();

  // Position player at safe authored start for waypoint (explicit spawn transform)
  const spawn = worldRegistry.getWaypointSpawnPosition(waypointId);
  const sPos = spawn ? { x: spawn.x, y: RAPIER_CONFIG.capsuleTotalHeight / 2 + 0.15, z: spawn.z } : { x: wp.pos.x, y: RAPIER_CONFIG.capsuleTotalHeight / 2 + 0.15, z: wp.pos.z + 1.0 };
  const facing = spawn ? (spawn.facingYaw ?? 0) : 0;
  characterPhysics.setPosition(sPos);
  player.position.set(sPos.x, sPos.y, sPos.z);
  const st = playerController.state;
  st.mode = "IDLE";
  st.pos.set(sPos.x, sPos.y, sPos.z);
  st.vel.set(0,0,0);
  st.verticalVelocity = 0;
  st.grounded = true;
  st.facing = facing;
  st.speed = 0;
  playerController.traversal.reset();
  playerController.syncPosFromPhysics();
  cameraFollow.snap();
  {
    const cur = regionManager.update(sPos);
    expeditionSession.setRegion(cur.currentRegionId, cur.currentPocketId);
    resourceSystem.setActiveRegions(cur.activeIds);
    creatureSystem.setActiveRegions(cur.activeIds);
    lastActiveIds = cur.activeIds;
  }
  // Generic suppression until leave/re-enter for any selectable waypoint
  frontierAnchorSystem.reset();
  frontierAnchorSystem.prime(sPos);
  frontierAnchorSystem.suppressUntilExit(waypointId);
  frontierMap.close();
  anchorPrompt.hide();
  runResultCard.hide();
  syncInputBlock();
  refreshMapAvailability();
  return true;
}

function handleExtractionFlow(data) {
  if (expeditionSession.isResolved?.()) return;
  if (!expeditionSession.isActive()) return;
  const cargo = pickupSystem.getInventory();
  const xp = xpMoteSystem.getXp();
  const snap = expeditionSession.tryResolveExtract();
  if (!snap) return;
  frontierProgress.bankRun(cargo, xp, snap.runId);
  // Determine new discoveries for card (snapshot already has runDiscoveries)
  const discoveries = expeditionSession.getRunDiscoveries();
  const banked = frontierProgress.getState();
  pendingResultSnapshot = { cargo: { ...cargo }, xp, newWaypoints: [...discoveries.newWaypoints], newBeacons: [...discoveries.newBeacons] };
  // Return/reset transient world to Camp (shared path)
  expeditionSession.resetToCamp();
  resetTransientWorldToCamp();
  syncInputBlock();
  frontierMap.close();
  anchorPrompt.hide();
  const displayNames = {};
  for (const wp of worldRegistry.getAllWaypoints()) displayNames[wp.id] = worldRegistry.getAnchorDisplayName(wp);
  for (const bc of worldRegistry.getAllBeacons()) displayNames[bc.id] = worldRegistry.getAnchorDisplayName(bc);
  runResultCard.show({
    type: "extracted",
    snapshot: pendingResultSnapshot,
    bankedResources: banked.bankedResources,
    bankedXp: banked.bankedXp,
    displayNames,
  });
  refreshMapAvailability();
  syncInputBlock();
  frontierAnchorSystem.handleExtracted(data.id);
}

function handleDeathFlow() {
  if (expeditionSession.isResolved?.()) return;
  if (!expeditionSession.isActive()) {
    // If died at camp (should not happen), just reset
    playerCombat.reset();
    return;
  }
  const cargo = pickupSystem.getInventory();
  const xp = xpMoteSystem.getXp();
  const snap = expeditionSession.tryResolveDeath();
  if (!snap) return;
  const discoveries = expeditionSession.getRunDiscoveries();
  // Death banks nothing, but discoveries (waypoints/beacons) already persisted via anchor system unlocks — they survive
  pendingResultSnapshot = { cargo: { ...cargo }, xp, newWaypoints: [...discoveries.newWaypoints], newBeacons: [...discoveries.newBeacons] };
  const banked = frontierProgress.getState();
  // Return/reset to Camp via shared path
  expeditionSession.resetToCamp();
  resetTransientWorldToCamp();
  syncInputBlock();
  frontierMap.close();
  anchorPrompt.hide();
  isDead = true;
  const displayNames2 = {};
  for (const wp of worldRegistry.getAllWaypoints()) displayNames2[wp.id] = worldRegistry.getAnchorDisplayName(wp);
  for (const bc of worldRegistry.getAllBeacons()) displayNames2[bc.id] = worldRegistry.getAnchorDisplayName(bc);
  runResultCard.show({
    type: "lost",
    snapshot: pendingResultSnapshot,
    bankedResources: banked.bankedResources,
    bankedXp: banked.bankedXp,
    displayNames: displayNames2,
  });
  refreshMapAvailability();
  syncInputBlock();
  setTimeout(() => { isDead = false; }, 100);
}

// Author Mode — desktop dev-only, ?author=1 enables Edit ↔ Play with draft persistence
let authorMode = null;
let authorCtx = null;
if (authorEnabled) {
  authorMode = createAuthorMode({
    scene,
    camera,
    renderer,
    worldRegistry,
    draftSeed: canonicalWorldData,
    resourceSystem,
    creatureSystem,
    regionManager,
    onRebuild: () => {
      window.location.reload();
    },
  });
  authorCtx = authorMode.init();
  if (authorMode.setSystems) authorMode.setSystems({ resourceSystem, creatureSystem, regionManager, worldRegistry });
  window.__author = { draftApi: authorCtx?.draftApi, ui: authorCtx?.ui, mode: authorMode };
}

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

  // Author edit visibility + anchor/map updates sync
  const authorSuppress = authorCtx && authorCtx.isEditMode && authorCtx.isEditMode();
  if (authorSuppress !== prevAuthorSuppress) {
    syncInputBlock();
    refreshMapAvailability();
    prevAuthorSuppress = authorSuppress;
  }
  if (authorSuppress && authorMode && authorMode.updateEditorVisibility) authorMode.updateEditorVisibility();

  // Also keep indicators updated outside fixed step (visual)
  if (frontierIndicators && !authorSuppress) frontierIndicators.update(camera);
  refreshMapAvailability();

  const touchIntent = touchMovement.getIntent();
  const kbIntent = keyboardInput.getIntent();
  const intent = mergeIntentsPure(touchIntent, kbIntent);
  const wasDodgeRequested = intent.dodgeRequested;
  const wasAttackRequested = intent.attackRequested;
  const blocked = isAnyBlockingModal() || !!authorSuppress;
  const effectiveIntent = blocked ? { moveX: 0, moveY: 0, moveMagnitude: 0, movementBand: "idle", dodgeRequested: false, attackRequested: false, attackHeld: false } : intent;

  let substeps = 0;
  while (accumulator >= fixedDt && substeps < maxSubsteps) {
    if (!expeditionSession.isResolved?.() && !authorSuppress && !isAnyBlockingModal()) {
      const pPosForAnchor = playerController.getState().pos;
      frontierAnchorSystem.update(pPosForAnchor);
      const nearby = frontierAnchorSystem.getNearbyInteraction(pPosForAnchor, expeditionSession);
      if (contextualInteraction) contextualInteraction.setInteraction(nearby);
      // Pause AI while blocking already handled via isAnyBlockingModal guard
      const pStBefore = playerController.getState();
      const isAggroNearby = creatureSystem.isAnyAggroedNearby();
      combatSession.update(fixedDt, isAggroNearby);
      const combatEngaged = combatSession.isEngaged();
      const harvestingAllowed = autoHarvestEnabled && !blocked && expeditionSession.isActive();

      const pPosForCombat = pStBefore.pos;
      const pFacingForCombat = pStBefore.facing;
      const getCombatTargetsWrapped = () => {
        const alive = creatureSystem.getAliveCreatures();
        const cands = alive.map(c => ({ id: c.state.id, pos: { x: c.state.pos.x, y: c.state.pos.y, z: c.state.pos.z }, isDead: c.state.isDead }));
        const hits = getAttackTargets(pPosForCombat, pFacingForCombat, cands);
        return hits.map(h => alive.find(a => a.state.id === h.id)).filter(Boolean);
      };

      const fieldCanAttack = !blocked && (playerController.getState().mode !== "CLIMB" && playerController.getState().mode !== "MANTLE") && expeditionSession.isActive();
      const effectiveAttackRequested = wasAttackRequested && !blocked;
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

      const healthIntent = { ...effectiveIntent, attackRequested: false };
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

      playerController.update(fixedDt, effectiveIntent, combatOpts);

      const pStateFixed = playerController.getState();
      const pPosFixed = pStateFixed.pos;

      {
        const regionRes = regionManager.update(pPosFixed);
        if (regionRes.changed) {
          lastActiveIds = regionRes.activeIds;
        }
      }

      creatureSystem.setPlayerPos(pPosFixed);
      creatureSystem.setPlayerState(pStateFixed);
      creatureSystem.update(fixedDt);

      projectileSystem.setPlayerPos(pPosFixed);
      projectileSystem.setPlayerState(pStateFixed);
      projectileSystem.update(fixedDt);

      xpMoteSystem.setPlayerPos(pPosFixed);
      xpMoteSystem.update(fixedDt);

      resourceSystem.update(fixedDt, pPosFixed, pStateFixed.mode, pStateFixed.speed, harvestingAllowed);
      pickupSystem.update(fixedDt, pPosFixed, (resId) => gameAudio.playPickup(resId), characterPhysics.collider);
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
      if (!authorSuppress) {
        for (const c of creatureSystem.getCreatures()) c.showFocusRing(false);
      }
      if (contextualInteraction) contextualInteraction.setInteraction(null);
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
  if (authorSuppress) {
  } else {
    cameraFollow.update(dt, pState.speed, moveDir);
  }

  particleSystem.update(dt);
  if (substeps === 0 && !authorSuppress && !isAnyBlockingModal() && !expeditionSession.isResolved?.()) {
    pickupSystem.update(Math.min(dt, 1 / 30), pState.pos, (resId) => gameAudio.playPickup(resId), characterPhysics.collider);
    const aliveForRing = creatureSystem.getAliveCreatures();
    const ringTargets = getAttackTargets(pState.pos, pState.facing, aliveForRing.map(c => ({ id: c.state.id, pos: { x: c.state.pos.x, y: c.state.pos.y, z: c.state.pos.z }, isDead: c.state.isDead })));
    const ringSet = new Set(ringTargets.map(r => r.id));
    for (const c of aliveForRing) c.showFocusRing(ringSet.has(c.state.id));
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
      const sess = expeditionSession.getStatus();
      const bank = frontierProgress.getState();
      debugLabel.textContent = `${VERSION} · ${fps} fps · ${stMode}${trav} · ${band} · ${pState.speed.toFixed(1)} u/s · ${sess} HP${hp} XP${xp} K${kills} A${alive}/${totalAlive}${engaged} · ${curReg} [${activeIds}] · Run W${inv.wood} S${inv.stone} F${inv.fiber} | Bank W${bank.bankedResources.wood} S${bank.bankedResources.stone} F${bank.bankedResources.fiber} XP${bank.bankedXp} · ${grounded} vv${vv} · ${substeps} step${authorSuppress ? " · EDIT" : ""}${isAnyBlockingModal() ? " · BLOCK" : ""}`;
    }
  }

  renderer.render(scene, camera);
}

tick();

// Debug globals — gameplay code must not rely on window.__game
window.__game = {
  scene, camera, renderer, player, playground, playerController, touchMovement, keyboardInput, THREE, MOVEMENT_CONFIG, RAPIER, physicsWorld, characterPhysics, physicsDebug, resourceSystem, pickupSystem, fieldTool, inventoryHud, gameAudio, particleSystem, autoHarvestToggle, combatHud, creatureSystem, projectileSystem, xpMoteSystem, playerCombat, combatSession,
  worldRegistry, regionManager, expeditionSession, frontierProgress, frontierMap, anchorPrompt, runResultCard, frontierIndicators, frontierAnchorSystem, authorMode, authorCtx,
  beginExpedition, handleExtractionFlow, handleDeathFlow, resetTransientWorldToCamp,
  clearProgress: () => { frontierProgress.clear(); console.log("[frontierProgress] cleared"); },
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
      frontierProgress: frontierProgress.getState(),
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      fps,
      health: playerCombat.getHealth(),
      xp: xpMoteSystem.getXp(),
      kills: expeditionSession.getKills(),
      isDead,
      combatEngaged: combatSession.isEngaged(),
      blocking: isAnyBlockingModal(),
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
