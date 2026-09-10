import * as THREE from "three";
import * as RAPIER from "rapier";
import { createCamera, updateCameraAspect, CAMERA_CONFIG } from "./game/createCamera.js";
import { createRenderer, resizeRenderer } from "./game/createRenderer.js";
import { createScene } from "./game/createScene.js";
import { createPlayerProjectedShadow } from "./presentation/playerProjectedShadow.js";
import { createPlayerController } from "./player/playerController.js";
import { createCameraFollow } from "./camera/cameraFollow.js";
import { createTouchMovement } from "./input/touchMovement.js";
import { createKeyboardInput } from "./input/keyboardInput.js";
import { mergeIntents as mergeIntentsPure } from "./input/inputController.js";
import { MOVEMENT_CONFIG, CAMERA_CONFIG_FOLLOW, INPUT_CONFIG, RAPIER_CONFIG } from "./game/config.js";
import { createPhysicsWorld } from "./physics/createPhysicsWorld.js";
import { createCharacterPhysics } from "./physics/createCharacterPhysics.js";
import { createPhysicsDebug } from "./physics/physicsDebug.js";
import { createResourceSystem, createRuntimeResourcePlacements } from "./resources/resourceSystem.js";
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
import { createSectionRuntime } from "./world/sectionRuntime.js";
import { createPortalGateSystem } from "./world/portalGateSystem.js";
import { createJumpPadSystem } from "./world/jumpPadSystem.js";
import { createParkourSystem } from "./world/parkourSystem.js";
import { createLootSystem } from "./world/lootSystem.js";
import { createExpeditionSession } from "./session/expeditionSession.js";
import { createFrontierProgress } from "./save/frontierProgress.js";
import { createFrontierAnchorSystem } from "./world/frontierAnchorSystem.js";
import { createFrontierMap } from "./ui/frontierMap.js";
import { createAnchorPrompt } from "./ui/anchorPrompt.js";
import { createRunResultCard } from "./ui/runResultCard.js";
import { createFrontierIndicators } from "./ui/frontierIndicators.js";
import { createAuthorMode } from "./author/authorMode.js";
import { preparePersistedAuthorDraft } from "./author/authorDraft.js";
import { createContextualInteraction } from "./ui/contextualInteraction.js";
import { createActivationToast } from "./ui/activationToast.js";
import { createMatterResonatorPanel } from "./ui/matterResonatorPanel.js";
import {
  MATTER_ATTRACTOR_I,
  canAffordMatterAttractorI,
  getMatterAttractorPickupTuning,
  getMatterResonatorInteraction,
  validateMatterAttractorCost,
} from "./progression/matterAttractor.js";
import { getPlayerLevel } from "./progression/playerLevel.js";
import { createReturnToCampFlow, resolveSuccessfulExtraction } from "./session/runResolution.js";
import { createBetaGame } from "./game/createBetaGame.js";

const canvas = document.getElementById("c");
const app = document.getElementById("app");
const debugLabel = document.getElementById("debug-label");

const VERSION = "Wildkin Frontier — Beta 0.2.0";
let betaGame = null;

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
app.classList.toggle("dev-mode", devEnabled);
app.classList.toggle("author-mode", authorEnabled);
const canonicalWorldData = WORLD_DATA;
let effectiveWorldData = canonicalWorldData;
if (authorEnabled) {
  try {
    const raw = localStorage.getItem("wildkin.authorDraft");
    if (raw) {
      const prepared = preparePersistedAuthorDraft(JSON.parse(raw), canonicalWorldData);
      const parsed = prepared.data;
      if (parsed && Array.isArray(parsed.regions) && parsed.version) {
        effectiveWorldData = parsed;
      }
    }
  } catch {}
}

const worldRegistry = createWorldRegistry(effectiveWorldData);
const regionDepthMap = worldRegistry.getRegionDepthMap();

const { scene, player, playground, shadows } = createScene(worldRegistry.data);

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
function resolveSpawnCapsuleCenter(feetY){
  // authored support Y is feet elevation; derive capsule center via collider half extents + small clearance
  return feetY + RAPIER_CONFIG.capsuleHalfHeight + RAPIER_CONFIG.capsuleRadius + 0.02;
}
let campSpawn = worldRegistry.getCampSpawnPosition();
let startPos = { x: campSpawn.x, y: resolveSpawnCapsuleCenter(campSpawn.y ?? 0), z: campSpawn.z };
const campStartFacing = campSpawn.facingYaw ?? 0;
const characterPhysics = createCharacterPhysics(RAPIER, physicsWorld.world, startPos);
const playerProjectedShadow = createPlayerProjectedShadow({ scene, player, characterPhysics, physicsWorld, playground });

// Persistent frontier progress (isolated from author draft)
const resourceDrops = worldRegistry.data.resourceDrops;
const frontierProgress = createFrontierProgress({ worldRegistry, isAuthorMode: authorEnabled, resourceDrops });
frontierProgress.load();
if (!validateMatterAttractorCost(resourceDrops, MATTER_ATTRACTOR_I.cost)) {
  throw new Error("Matter Attractor I cost references an invalid resource catalog entry");
}

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
const initialRegion = "camp";
const expeditionSession = createExpeditionSession({
  startAnchorId: worldRegistry.getInitialMajorWaypointId() ?? "wp_p1_entry",
  regionDepthMap,
  initialRegionId: initialRegion,
  initialStatus: "camp",
  resourceDrops,
});
expeditionSession.setRegion(initialRegion, null);

let lastActiveIds = [];
let resourceSystem, creatureSystem, pickupSystem, projectileSystem, xpMoteSystem;
const sectionRuntime = createSectionRuntime({
  worldRegistry,
  playground,
  physicsWorld,
  onChange: ({ sectionId, activeIds, prevActiveIds }) => {
    expeditionSession.setRegion(sectionId, null);
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
playerController.snapRenderPose();

const cameraFollow = createCameraFollow(camera, player, CAMERA_CONFIG_FOLLOW, CAMERA_CONFIG);
cameraFollow.snap();

function placePlayerAtFeetTransform(feetPosition, facingYaw = 0) {
  const position = {
    x: feetPosition.x,
    y: resolveSpawnCapsuleCenter(feetPosition.y ?? 0),
    z: feetPosition.z,
  };
  characterPhysics.setPosition(position);
  player.position.set(position.x, position.y, position.z);
  const state = playerController.state;
  state.mode = "IDLE";
  state.pos.set(position.x, position.y, position.z);
  state.vel.set(0, 0, 0);
  state.verticalVelocity = 0;
  state.grounded = true;
  state.facing = facingYaw;
  state.speed = 0;
  state.dodgeCooldown = 0;
  state.dodgeTime = 0;
  state.airCap = 0;
  state.jumpData = null;
  state.fallHVel = null;
  state.climbable = null;
  state.mantleData = null;
  playerController.traversal.reset();
  playerController.syncPosFromPhysics();
  playerController.snapRenderPose();
  cameraFollow.snap();
  return position;
}

const physicsDebug = createPhysicsDebug(scene, characterPhysics, physicsWorld);

const placementsFromWorld = createRuntimeResourcePlacements(worldRegistry.getAllResources());

const gameAudio = createGameAudio();
const particleSystem = createParticleSystem(scene);
const inventoryHud = createRunInventoryHud(resourceDrops);
const autoHarvestToggle = createAutoHarvestToggle(true);
let autoHarvestEnabled = true;
autoHarvestToggle.onToggle((v) => { autoHarvestEnabled = v; });

pickupSystem = createPickupSystem(scene, physicsWorld, playground, (inv, resId) => {
  inventoryHud.update(inv, xpMoteSystem?.getXp?.() ?? 0);
  if (resId) inventoryHud.pulse(resId);
  expeditionSession.setCargo(inv);
}, { resourceDrops, visualAssets: worldRegistry.data.visualAssets ?? [] });
pickupSystem.setPlayerCollider(characterPhysics.collider);
pickupSystem.setMagnetTuning(getMatterAttractorPickupTuning(frontierProgress.hasMatterAttractorI()));
inventoryHud.update(pickupSystem.getInventory());
expeditionSession.setCargo(pickupSystem.getInventory());

resourceSystem = createResourceSystem(scene, physicsWorld, placementsFromWorld);
const fieldTool = createFieldTool(player, gameAudio);

const combatHud = createCombatHud();
combatHud.updateProgress(frontierProgress.getBankedXp());
let lastCarriedXp = 0;
xpMoteSystem = createXpMoteSystem(scene, {
  onXpChanged: (xp) => {
    combatHud.updateXp(xp);
    inventoryHud.update(pickupSystem.getInventory(), xp);
    if (xp > lastCarriedXp) inventoryHud.pulseXp();
    lastCarriedXp = xp;
    expeditionSession.setXp(xp);
  },
  onCollectSound: () => gameAudio.playXpCollect(),
  worldRegistry,
}, physicsWorld, playground);
xpMoteSystem.setWorldRegistry(worldRegistry);
const combatSession = createCombatSession();

let isDead = false; // transient death overlay flag — now replaced by result card flow but kept for tick guard
let pendingResultSnapshot = null;
let parkourSystem = null;

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
    if (parkourSystem?.handleFatalFailure("damage")) return;
    handleDeathFlow("combat");
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
    betaGame?.onCreatureDamaged(creature, amount);
    gameAudio.playEnemyHit();
    const mockNode = { state: { position: { x: creature.state.pos.x, y: creature.state.pos.y, z: creature.state.pos.z } }, type: { impactEffectHeight: 0.45, resourceId: "generic" } };
    try { particleSystem.spawnBurst(mockNode, 4); } catch {}
  },
  onCreatureDied: (creature) => {
    betaGame?.onCreatureDied(creature);
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

// Prime explicit section activation after all gameplay systems exist (start at Camp).
{
  const init = sectionRuntime.activate("camp");
  lastActiveIds = init.activeIds;
  expeditionSession.setRegion("camp", null);
  resourceSystem.setActiveRegions(init.activeIds);
  creatureSystem.setActiveRegions(init.activeIds);
}

// UI — Map, AnchorPrompt, ResultCard, Indicators (Phase 4A focused owners)
let frontierMap, anchorPrompt, runResultCard, matterResonatorPanel, frontierIndicators, frontierAnchorSystem;
let returnToCampFlow = null;

function isAnyBlockingModal() {
  return betaGame?.isBlocking() || (frontierMap && frontierMap.isOpen()) || (anchorPrompt && anchorPrompt.isVisible()) || (runResultCard && runResultCard.isVisible()) || (matterResonatorPanel && matterResonatorPanel.isVisible());
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
  const resonatorOpen = matterResonatorPanel?.isVisible?.() ?? false;
  const shouldDisableMapButton = betaGame?.isBlocking() || anchorOpen || resultOpen || resonatorOpen || (authorCtx && authorCtx.isEditMode && authorCtx.isEditMode());
  frontierMap.setEnabled(!shouldDisableMapButton);
}

frontierMap = createFrontierMap({
  worldRegistry,
  frontierProgress,
  onStartSelected: (destination) => {
    beginExpeditionDestination(destination);
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
    if (data.type === "portalRepair") {
      const repair = portalGateSystem?.repair(data.id);
      if (repair?.ok) playground.refreshPortalGateVisual?.(data.id, "active");
      refreshMapAvailability();
      syncInputBlock();
    } else if (data.type === "campReturn") {
      const resolved = returnToCampFlow?.confirm();
      if (resolved?.ok) finalizeSuccessfulExtraction(resolved, data);
      else handleExtractionFailure(resolved);
    } else {
      handleExtractionFlow(data);
    }
  },
  onKeepGoing: (data) => {
    if (data.type === "campReturn") returnToCampFlow?.cancel();
    else if (data.type !== "portalRepair" && frontierAnchorSystem) frontierAnchorSystem.handleKeepGoing(data.id);
    refreshMapAvailability();
    syncInputBlock();
  },
});

runResultCard = createRunResultCard({
  resourceDrops,
  onContinue: () => {
    // Continue returns direct Camp control (already reset to camp)
    refreshMapAvailability();
    syncInputBlock();
  },
});

function syncMatterResonatorVisualState() {
  const owned = frontierProgress.hasMatterAttractorI();
  scene.traverse((node) => {
    if (node.userData?.authorId !== "prop_camp_resonator" || !node.material) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (!material.emissive) continue;
      material.emissive.setHex(owned ? 0x2dddea : 0x1a3a5a);
      material.emissiveIntensity = owned ? 0.85 : 0.25;
      material.needsUpdate = true;
    }
  });
}

matterResonatorPanel = createMatterResonatorPanel({
  frontierProgress,
  resourceDrops,
  onPurchase: () => {
    if (!expeditionSession.isCamp()) return { purchased: false, reason: "camp-only" };
    const result = frontierProgress.purchaseMatterAttractorI(MATTER_ATTRACTOR_I.cost);
    if (result.purchased) {
      pickupSystem.setMagnetTuning(getMatterAttractorPickupTuning(true));
      syncMatterResonatorVisualState();
    }
    return result;
  },
  onClose: () => {
    refreshMapAvailability();
    syncInputBlock();
  },
});
// Compatibility name for existing Author/debug seams while sections supersede position-derived regions.
const regionManager = sectionRuntime;
syncMatterResonatorVisualState();

frontierIndicators = createFrontierIndicators({
  worldRegistry,
  frontierProgress,
  getPlayerPos: () => playerController.getState().pos,
  getSession: () => expeditionSession,
  getCamera: () => camera,
});

const activationToast = createActivationToast(scene, camera, gameAudio);

const resonatorPoi = worldRegistry.getAllPois().find((poi) => poi.type === "resonator") ?? null;
function getNearbyResonatorInteraction(playerPos) {
  if (!resonatorPoi || !playerPos) return null;
  const distance = Math.hypot(playerPos.x - resonatorPoi.pos.x, playerPos.z - resonatorPoi.pos.z);
  const interaction = getMatterResonatorInteraction({
    isCamp: expeditionSession.isCamp(),
    distance,
    owned: frontierProgress.hasMatterAttractorI(),
  });
  return interaction ? {
    ...interaction,
    label: 'Workshop',
    id: resonatorPoi.id,
  } : null;
}

function transitionThroughPortalGate(gate) {
  if (!expeditionSession.isActive()) return false;
  const result = sectionRuntime.transitionThroughPortal(gate.id, {
    beforeTransition: () => {
      contextualInteraction?.setInteraction(null);
      projectileSystem.reset();
      combatSession.reset();
      if (fieldTool.hardReset) fieldTool.hardReset(); else fieldTool.resetSwing();
      parkourSystem?.leaveCourse();
      jumpPadSystem?.reset();
    },
    onArrive: ({ entry }) => {
      const arrival = placePlayerAtFeetTransform(entry.pos, entry.facingYaw ?? entry.rotY ?? 0);
      frontierAnchorSystem?.reset();
      frontierAnchorSystem?.prime(arrival);
    },
  });
  return result.ok;
}

function handleParkourSafeFailure({ respawn }) {
  if (!respawn?.position) return;
  projectileSystem.reset();
  combatSession.reset();
  if (fieldTool.hardReset) fieldTool.hardReset(); else fieldTool.resetSwing();
  playerCombat.reset();
  combatHud.updateHealth(playerCombat.getHealth(), playerCombat.getMaxHealth());
  placePlayerAtFeetTransform(respawn.position, respawn.facingYaw ?? 0);
}

let portalGateSystem = null;
let jumpPadSystem = null;
let lootSystem = null;

portalGateSystem = createPortalGateSystem(worldRegistry, {
  frontierProgress,
  getActiveSectionId: () => sectionRuntime.getActiveSectionId(),
  getPlayerLevel: () => getPlayerLevel(frontierProgress.getBankedXp()),
  getBankedXp: () => frontierProgress.getBankedXp(),
  getCargo: () => pickupSystem.getInventory(),
  getCarriedXp: () => xpMoteSystem.getXp(),
  spendCargo: (_cargo, cost) => pickupSystem.spendInventory(cost),
  refundCargo: (cost) => pickupSystem.grantInventory(cost),
  onTravel: transitionThroughPortalGate,
});

jumpPadSystem = createJumpPadSystem(worldRegistry, {
  getActiveSectionId: () => sectionRuntime.getActiveSectionId(),
  launchPlayer: (launch) => playerController.launchFromJumpPad(launch),
});

parkourSystem = createParkourSystem(worldRegistry, {
  getActiveSectionId: () => sectionRuntime.getActiveSectionId(),
  onSafeFailure: handleParkourSafeFailure,
  onNormalFatal: ({ reason } = {}) => handleDeathFlow(reason ?? "fatal_hazard"),
  onCourseStarted: ({ start }) => {
    activationToast.pulseWorld(start.pos, 0x59f0c8);
    activationToast.showMessage({ title: "PARKOUR START", subtitle: "Course protection active" });
    gameAudio.playParkour?.("start");
  },
  onCheckpointActivated: ({ checkpoint }) => {
    activationToast.pulseWorld(checkpoint.pos, 0x5ba7ff);
    activationToast.showMessage({ title: "CHECKPOINT", subtitle: "Safe respawn updated" });
    gameAudio.playParkour?.("checkpoint");
  },
  onCourseEnded: ({ end }) => {
    activationToast.pulseWorld(end.pos, 0xffd45b);
    activationToast.showMessage({ title: "COURSE COMPLETE", subtitle: "Normal expedition risk restored" });
    gameAudio.playParkour?.("complete");
  },
  onCourseAbandoned: () => activationToast.showMessage({ title: "COURSE LEFT", subtitle: "Checkpoint protection cleared" }),
});

lootSystem = createLootSystem(worldRegistry, {
  frontierProgress,
  getActiveSectionId: () => sectionRuntime.getActiveSectionId(),
  getPlayerPos: () => playerController.getState().pos,
  checkAccess: (chest) => betaGame?.lootAccess(chest) ?? { ok: true },
  transientChestIds: ["chest_heartwood_core"],
  grantRewards: (rewards, chest) => {
    pickupSystem.grantInventory(rewards.resources);
    if (rewards.xp > 0) xpMoteSystem.setXp(xpMoteSystem.getXp() + rewards.xp);
    betaGame?.onLoot(rewards, chest);
  },
  onCourseReward: (courseId) => parkourSystem.completeCourse(courseId),
});

returnToCampFlow = createReturnToCampFlow({
  session: expeditionSession,
  getCargo: () => pickupSystem.getInventory(),
  getXp: () => xpMoteSystem.getXp(),
  bankRun: (cargo, xp, runId) => frontierProgress.bankRun(cargo, xp, runId, betaGame?.getBankingExtras()),
});

// Contextual interaction (single owner)
let contextualInteraction = null;
contextualInteraction = createContextualInteraction({
  onActivate: (info) => {
    if (isAnyBlockingModal()) return;
    if (info.type === "bond") {
      betaGame?.beginBond(info.id);
    } else if (info.type === "portalGate") {
      if (info.action === "camp-start") {
        frontierMap.openStartSelection();
        refreshMapAvailability();
        syncInputBlock();
      } else if (info.action === "return-to-camp") {
        if (returnToCampFlow.request({ id: info.id }).ok) {
          anchorPrompt.show({ type: "campReturn", id: info.id, cargo: pickupSystem.getInventory(), xp: xpMoteSystem.getXp() });
          refreshMapAvailability();
          syncInputBlock();
        }
      } else if (info.action === "inspect") {
        const gate = worldRegistry.getPortalGateById(info.id);
        anchorPrompt.show({ type: "portalRepair", id: info.id, displayName: gate?.displayName, requirementView: info.requirementView });
        refreshMapAvailability();
        syncInputBlock();
      } else {
        portalGateSystem.activate(info.id);
      }
    } else if (info.type === "lootChest") {
      const opened = lootSystem.open(info.id);
      if (!opened.ok && opened.detail) betaGame?.shell.toast("Ancient seal", opened.detail);
    } else if (info.type === "gate") {
      if (expeditionSession.isCamp()) {
        frontierMap.openStartSelection();
        refreshMapAvailability();
        syncInputBlock();
      } else if (expeditionSession.isActive()) {
        if (returnToCampFlow.request({ id: info.id }).ok) {
          anchorPrompt.show({ type: "campReturn", id: info.id, cargo: pickupSystem.getInventory(), xp: xpMoteSystem.getXp() });
          refreshMapAvailability();
          syncInputBlock();
        }
      }
    } else if (info.type === "majorWaypoint" || info.type === "extractionBeacon") {
      const anchor = info.type === "majorWaypoint" ? worldRegistry.getWaypointById(info.id) : worldRegistry.getBeaconById(info.id);
      anchorPrompt.show({ id: info.id, type: info.type, displayName: anchor ? worldRegistry.getAnchorDisplayName(anchor) : null, cargo: pickupSystem.getInventory(), xp: xpMoteSystem.getXp() });
      refreshMapAvailability();
      syncInputBlock();
    } else if (info.type === "resonator" && expeditionSession.isCamp()) {
      if (betaGame) betaGame.openWorkshop(); else matterResonatorPanel.show();
      refreshMapAvailability();
      syncInputBlock();
    } else if (info.type === 'campSanctuary' && expeditionSession.isCamp()) {
      betaGame?.openSanctuary();refreshMapAvailability();syncInputBlock();
    }
  },
});

// Frontier anchor system — nonblocking discovery
frontierAnchorSystem = createFrontierAnchorSystem(worldRegistry, {
  getPlayerPos: () => playerController.getState().pos,
  getSession: () => expeditionSession,
  getActiveSectionId: () => sectionRuntime.getActiveSectionId(),
  frontierProgress,
  onWaypointDiscovered: (id) => {
    const wp = worldRegistry.getWaypointById(id);
    const name = wp ? worldRegistry.getAnchorDisplayName(wp) : id;
    activationToast.show({ displayName: name, type: "majorWaypoint" });
    activationToast.pulseWorld(wp ? { x: wp.pos.x, y: wp.pos.y ?? 0, z: wp.pos.z } : { x: 0, y: 0, z: 0 }, 0x4fc3f7);
  },
  onBeaconDiscovered: (id) => {
    const bc = worldRegistry.getBeaconById(id);
    const name = bc ? worldRegistry.getAnchorDisplayName(bc) : id;
    activationToast.show({ displayName: name, type: "extractionBeacon" });
    activationToast.pulseWorld(bc ? { x: bc.pos.x, y: bc.pos.y ?? 0, z: bc.pos.z } : { x: 0, y: 0, z: 0 }, 0xff7043);
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
  app.classList.toggle("gameplay-blocked", blocked);
  setGameplayInputBlocked(blocked);
  if (authorSuppress !== prevAuthorSuppress) {
    prevAuthorSuppress = authorSuppress;
    refreshMapAvailability();
  }
}

// Shared transient world reset to Camp (extraction & death share this path where practical)
function resetTransientWorldToCamp() {
  betaGame?.reset();
  lootSystem?.reset();
  if (pickupSystem.clear) { try { pickupSystem.clear(); } catch {} }
  pickupSystem.resetInventory();
  inventoryHud.update(pickupSystem.getInventory(), 0);
  expeditionSession.setCargo(pickupSystem.getInventory());
  xpMoteSystem.reset();
  lastCarriedXp = 0;
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
  const campFacing = campSpawn.facingYaw ?? 0;
  const cPos = placePlayerAtFeetTransform(campSpawn, campFacing);
  const activated = sectionRuntime.activate("camp");
  lastActiveIds = activated.activeIds;
  frontierAnchorSystem.reset();
  frontierAnchorSystem.prime(cPos);
  jumpPadSystem?.reset();
  parkourSystem?.reset();
  isDead = false;
  accumulator = 0;
  autoHarvestToggle.setEnabled(autoHarvestEnabled, false);
}

function beginExpeditionAtTransform({ sectionId, startAnchorId, feetPosition, facingYaw = 0, suppressAnchorId = null }) {
  if (!expeditionSession.isCamp() || !worldRegistry.getSectionById(sectionId)) return false;
  betaGame?.reset();
  betaGame?.refreshModifiers();
  lootSystem?.reset();
  // Clear old run state (transient)
  pickupSystem.resetInventory();
  inventoryHud.update(pickupSystem.getInventory(), 0);
  xpMoteSystem.reset();
  lastCarriedXp = 0;
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
  expeditionSession.beginRun(startAnchorId);
  frontierProgress.markDeparted();
  const activated = sectionRuntime.activate(sectionId);
  if (!activated.ok) return false;
  lastActiveIds = activated.activeIds;
  const sPos = placePlayerAtFeetTransform(feetPosition, facingYaw);
  // Generic suppression until leave/re-enter for any selectable waypoint
  frontierAnchorSystem.reset();
  frontierAnchorSystem.prime(sPos);
  if (suppressAnchorId) frontierAnchorSystem.suppressUntilExit(suppressAnchorId);
  jumpPadSystem.reset();
  parkourSystem.reset();
  frontierMap.close();
  anchorPrompt.hide();
  runResultCard.hide();
  matterResonatorPanel.hide();
  syncInputBlock();
  refreshMapAvailability();
  return true;
}

function beginExpedition(waypointId) {
  if (!waypointId || !frontierProgress.isUnlockedWaypoint(waypointId)) return false;
  const waypoint = worldRegistry.getWaypointById(waypointId);
  if (!waypoint) return false;
  const spawn = worldRegistry.getWaypointSpawnPosition(waypointId);
  const feetPosition = spawn ?? { x: waypoint.pos.x, y: waypoint.pos.y ?? 0, z: waypoint.pos.z + 1 };
  return beginExpeditionAtTransform({
    sectionId: waypoint.regionId,
    startAnchorId: waypointId,
    feetPosition,
    facingYaw: spawn?.facingYaw ?? 0,
    suppressAnchorId: waypointId,
  });
}

function beginExpeditionDestination(destination) {
  if (!destination) return false;
  if (destination.type === "waypoint") return beginExpedition(destination.id);
  if (destination.type !== "sectionEntry") return false;
  return beginExpeditionAtTransform({
    sectionId: destination.sectionId,
    startAnchorId: destination.id,
    feetPosition: destination.feetPosition,
    facingYaw: destination.facingYaw ?? 0,
    suppressAnchorId: null,
  });
}

function beginExpeditionFromDefaultEntry() {
  const destination = worldRegistry.getDefaultExpeditionArrival?.() ?? worldRegistry.getDefaultExpeditionEntry();
  if (!destination) return false;
  const entry = destination.gate ? destination : worldRegistry.getEntryPoint(destination.sectionId, destination.entryId);
  if (!entry) return false;
  return beginExpeditionAtTransform({
    sectionId: destination.sectionId,
    startAnchorId: destination.entryId,
    feetPosition: entry.pos,
    facingYaw: entry.facingYaw ?? entry.rotY ?? 0,
  });
}

function handleExtractionFlow(data) {
  if (expeditionSession.isResolved?.()) return;
  if (!expeditionSession.isActive()) return;
  const cargo = pickupSystem.getInventory();
  const xp = xpMoteSystem.getXp();
  const resolved = resolveSuccessfulExtraction({
    session: expeditionSession,
    cargo,
    xp,
    bankRun: (bankCargo, bankXp, runId) => frontierProgress.bankRun(bankCargo, bankXp, runId, betaGame?.getBankingExtras()),
  });
  if (!resolved.ok) { handleExtractionFailure(resolved); return; }
  finalizeSuccessfulExtraction(resolved, data);
}

function handleExtractionFailure(result) {
  if (result?.reason === "storage-write-failed") {
    betaGame?.shell.toast("Extraction could not be saved", "Your expedition is still active. Keep this tab open and retry after freeing browser storage.");
  }
  syncInputBlock();
  refreshMapAvailability();
}

function finalizeSuccessfulExtraction(resolved, data) {
  const snap = resolved.snapshot;
  const extra = betaGame?.onExtract(snap.runId) ?? {};
  const banked = frontierProgress.getState();
  pendingResultSnapshot = {
    companions: extra.companions ?? [],
    campaignCompleted: extra.campaignCompleted ?? false,
    cargo: { ...snap.cargo },
    xp: snap.xp,
    newWaypoints: [...snap.newWaypoints],
    newBeacons: [...snap.newBeacons],
  };
  // Return/reset transient world to Camp (shared path)
  resetTransientWorldToCamp();
  combatHud.updateProgress(banked.bankedXp);
  const previousLevel = getPlayerLevel(Math.max(0, banked.bankedXp - snap.xp));
  const newLevel = getPlayerLevel(banked.bankedXp);
  if (newLevel > previousLevel) {
    activationToast.showMessage({ title: `LEVEL UP — LV ${newLevel}`, subtitle: newLevel - previousLevel > 1 ? `${newLevel - previousLevel} levels secured` : "Persistent progression advanced" });
    gameAudio.playLevelUp?.();
  }
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
    upgradeAvailable: !banked.matterAttractorI && canAffordMatterAttractorI(banked.bankedResources),
  });
  refreshMapAvailability();
  syncInputBlock();
  frontierAnchorSystem.handleExtracted(data?.id);
}

function handleDeathFlow(reason = "combat") {
  if (expeditionSession.isResolved?.()) return;
  if (!expeditionSession.isActive()) {
    // If died at camp (should not happen), just reset
    playerCombat.reset();
    return;
  }
  const cargo = pickupSystem.getInventory();
  const xp = xpMoteSystem.getXp();
  const snap = expeditionSession.tryResolveDeath(reason);
  if (!snap) return;
  const discoveries = expeditionSession.getRunDiscoveries();
  const lostCompanions = betaGame?.companions.getPending().map(c => c.id) ?? [];
  // Death banks nothing, but discoveries (waypoints/beacons) already persisted via anchor system unlocks — they survive
  pendingResultSnapshot = { cargo: { ...cargo }, xp, companions: lostCompanions, deathReason: snap.deathReason, newWaypoints: [...discoveries.newWaypoints], newBeacons: [...discoveries.newBeacons] };
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
    sectionRuntime,
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

betaGame = createBetaGame({
  app, scene, camera, registry: worldRegistry, progress: frontierProgress, session: expeditionSession,
  creatures: creatureSystem, playerController, playerCombat, pickupSystem, xpMoteSystem,
  audio: gameAudio, activationToast, combatHud, authorEnabled,
  getSectionId: () => sectionRuntime.getActiveSectionId(),
  onBlockingChanged: () => { syncInputBlock(); refreshMapAvailability(); },
  isOtherBlocking: () => frontierMap.isOpen() || anchorPrompt.isVisible() || runResultCard.isVisible() || matterResonatorPanel.isVisible(),
  openMap: () => frontierMap.openInspect(),
});

// Loop — single rAF drives all per-frame updates and rendering (thin main.js)
const clock = new THREE.Clock();
let frameCount = 0;
let lastFpsUpdate = performance.now();
let fps = 0;
let accumulator = 0;
let physicsSubstepsLast = 0;
let pendingAttackLatch = false;
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
  // Also keep indicators updated outside fixed step (visual)
  if (frontierIndicators && !authorSuppress) frontierIndicators.update(camera);
  const touchIntent = touchMovement.getIntent();
  const kbIntent = keyboardInput.getIntent();
  const intent = mergeIntentsPure(touchIntent, kbIntent);
  const wasDodgeRequested = intent.dodgeRequested;
  // Latch attack edge: keep pending until fixed step consumes it
  const rawWasAttackRequested = intent.attackRequested;
  if(rawWasAttackRequested) pendingAttackLatch = true;
  let wasAttackRequested = pendingAttackLatch;

  const blocked = isAnyBlockingModal() || !!authorSuppress;
  const effectiveIntent = blocked ? { moveX: 0, moveY: 0, moveMagnitude: 0, movementBand: "idle", dodgeRequested: false, attackRequested: false, attackHeld: false } : intent;

  let substeps = 0;
  while (accumulator >= fixedDt && substeps < maxSubsteps) {
    if (!expeditionSession.isResolved?.() && !authorSuppress && !isAnyBlockingModal()) {
      const pPosForAnchor = playerController.getState().pos;
      frontierAnchorSystem.update(pPosForAnchor);
      const nearby = getNearbyResonatorInteraction(pPosForAnchor)
        ?? portalGateSystem.getNearbyInteraction(pPosForAnchor)
        ?? lootSystem.getNearbyInteraction(pPosForAnchor)
        ?? betaGame?.getNearbyInteraction(pPosForAnchor)
        ?? frontierAnchorSystem.getNearbyInteraction(pPosForAnchor, expeditionSession);
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
      const effectiveAttackRequested = pendingAttackLatch && !blocked;
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
            (n) => { pickupSystem.spawnPickup(n); betaGame?.onHarvestDrop(n); },
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
          const damaged = creatureSystem.damageCreature(creature, COMBAT_CONFIG.baseDamage * (betaGame?.getDamage() ?? 1), pPos, nDir, "player");
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
      jumpPadSystem.update(pPosFixed);
      parkourSystem.update(pPosFixed);

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
      if (pendingAttackLatch && fieldTool.activeProfile === "combat" && fieldTool.isSwinging) {
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
  // Consume attack edge only after eligible fixed step processed it (not on zero-substep frames)
  // FieldTool consumes pending when it starts a swing; we detect via isSwinging transition
  // For simplicity, if we had pending and we executed at least one fixed step and fieldTool is now swinging/combat, clear latch
  // Also if fieldTool not swinging but we attempted harvest and it was on cooldown, we still consider pending consumed? For now, consume after any fixed step where pending was true and fieldTool either started swing or we decide to clear after one eligible step
  if (pendingAttackLatch && physicsSubstepsLast > 0) {
    // Check if fieldTool actually took the edge: it will be swinging if it started combat/harvest
    // If not swinging, it means no eligible target but still edge should be consumed to avoid infinite queue; we consume anyway after one eligible step to avoid duplicate
    touchMovement.consumeAttack?.();
    keyboardInput.consumeAttack?.();
    pendingAttackLatch = false;
  } else if (!pendingAttackLatch) {
    // ensure intent cleared if no latch but raw still? Already handled
    touchMovement.consumeAttack?.();
    keyboardInput.consumeAttack?.();
  }

  const pState = playerController.getState();
  playerController.prepareRender(fixedDt > 0 ? accumulator / fixedDt : 1);
  playerProjectedShadow.update({ hidden: authorSuppress });
  const moveDir = pState.speed > 0.1 ? { x: Math.sin(pState.facing), z: Math.cos(pState.facing) } : null;
  if (authorSuppress) {
  } else {
    cameraFollow.update(dt, pState.speed, moveDir);
  }

  particleSystem.update(dt);
  if(activationToast && activationToast.update) activationToast.update(dt);
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

  betaGame?.update(dt, { paused: isAnyBlockingModal(), authorSuppress });
  shadows.update(authorSuppress);
  if (authorSuppress && authorMode?.prepareRender) authorMode.prepareRender();
  renderer.render(scene, camera);
}

tick();

// Debug globals — gameplay code must not rely on window.__game
window.__game = {
  scene, camera, renderer, player, playground, playerController, playerProjectedShadow, touchMovement, keyboardInput, THREE, MOVEMENT_CONFIG, RAPIER, physicsWorld, characterPhysics, physicsDebug, resourceSystem, pickupSystem, fieldTool, inventoryHud, gameAudio, particleSystem, autoHarvestToggle, combatHud, creatureSystem, projectileSystem, xpMoteSystem, playerCombat, combatSession,
  worldRegistry, regionManager, sectionRuntime, portalGateSystem, jumpPadSystem, parkourSystem, lootSystem, expeditionSession, frontierProgress, frontierMap, anchorPrompt, runResultCard, matterResonatorPanel, frontierIndicators, frontierAnchorSystem, authorMode, authorCtx,
  beginExpedition, beginExpeditionFromDefaultEntry, transitionThroughPortalGate, handleExtractionFlow, handleDeathFlow, resetTransientWorldToCamp,
  betaGame,
  getPlayerLevel: () => getPlayerLevel(frontierProgress.getBankedXp()),
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
betaGame.showWelcome();
