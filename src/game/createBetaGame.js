import * as THREE from "three";
import { createCompanionSystem } from "../companions/companionSystem.js";
import { COMPANIONS } from "../companions/companionCatalog.js";
import { createBetaShell } from "../ui/betaShell.js";
import { deriveCampaignProgress, getNextCampaignObjective } from "../progression/campaignProgress.js";
import { getPlayerLevel } from "../progression/playerLevel.js";
import { createFrontierAtmosphere } from "../presentation/frontierAtmosphere.js";
import { createContactShadows } from "../presentation/contactShadows.js";
import { createGuardianEncounter } from "../combat/guardianEncounter.js";
import { createCombatFeedback } from "../presentation/combatFeedback.js";
import { createCompanionAbilityFx } from "../presentation/companionAbilityFx.js";
import { initializePlayerOcclusion } from "../presentation/playerOcclusion.js";
import { SKILL_CATALOG, SKILL_BY_ID } from "../progression/skillCatalog.js";
import { createEquipmentSystem } from '../equipment/equipmentSystem.js';
import { createTamingEquipmentUse } from '../equipment/tamingEquipment.js';
import { createBaseSystem } from '../base/baseSystem.js';

const SETTINGS_KEY = "wildkin.settings";
export function createBetaGame(deps) {
  const { app, scene, registry, progress, session, creatures, playerController, playerCombat, pickupSystem, xpMoteSystem, audio, activationToast, combatHud, onBlockingChanged, onGameplayAction, openMap, authorEnabled } = deps;
  let shell = null, corePending = false, guardianDefeated = false, objectiveTimer = 0, lastSection = null, sectionIntro = 0;
  let harvestBonus = 0, warnedStorage = false;
  let settings = { muted: false, reducedMotion: globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false };
  try { const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null"); if (saved && typeof saved === "object") settings = { muted: saved.muted === true, reducedMotion: saved.reducedMotion === true }; } catch {}
  const toast = (title, detail) => shell?.toast(title, detail);
  const pulse = (pos, color) => { if (!settings.reducedMotion) activationToast.pulseWorld(pos, color); };
  const atmosphere = createFrontierAtmosphere({ scene });
  const contactShadows = createContactShadows(scene, registry);
  const combatFeedback = createCombatFeedback({ app, camera: deps.camera, scene });
  const abilityFx = createCompanionAbilityFx({ scene });
  const playerOcclusion = initializePlayerOcclusion({ scene, camera: deps.camera, getPlayerPosition: () => playerController.getState().pos });
  const guardianEncounter = createGuardianEncounter({ scene, getGuardian: () => creatures.getCreatures().find(c => c.state.id === "wildkin_guardian"), getPlayerState: () => playerController.getState(), playerCombat, audio, onPulse: ({ target }) => pulse(target, 0xffbd63), onWarning: text => toast("Heartwood Guardian", text) });
  const companions = createCompanionSystem({ app, scene, registry, progress, creatures, playerController, playerCombat, physicsWorld: deps.physicsWorld, playerCollider: deps.playerCollider, isActive: () => session.isActive(), getSectionId: () => deps.getSectionId(), onBlockingChanged, toast: (title, detail) => { if (!detail || detail !== companions.getFieldTamingState()?.detail) toast(title, detail); }, pulse, audio, onAbility: (id, pos) => abilityFx.trigger(id, pos) });
  deps.characterPhysics?.setColliderFilter(companions.isFollowerCollider);
  creatures.setCompanionColliderFilter(companions.isFollowerCollider);
  const isCamp = () => session.isCamp();
  const getSectionId = () => deps.getSectionId();
  const base = createBaseSystem({app,scene,camera:deps.camera,progress,registry,physicsWorld:deps.physicsWorld,getPlayerState:()=>playerController.getState(),isCamp,onBlockingChanged,toast,initialHidden:authorEnabled});
  const equipment = createEquipmentSystem({
    progress, isCamp,
    cancelTool: () => onGameplayAction?.('equipmentCancel'),
    setToolEquipped: equipped => { deps.fieldTool?.setEquipped(equipped); app.classList.toggle('non-tool-equipped', !equipped); },
    canUse: () => !authorEnabled && !isBlocking() && !deps.isOtherBlocking(),
    heal: () => action('heal'),
    openBuild: () => ({ ok: shell.openBuildCatalog() }),
    notify: (message, ok) => toast(ok ? 'Equipment' : 'Not yet', message),
    beginTaming: createTamingEquipmentUse({ companions, progress, creatures, getPlayerPosition: () => playerController.getState().pos }),
  });
  function applySettings() {
    app.classList.toggle("reduced-motion", settings.reducedMotion);
    audio.setMuted?.(settings.muted);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
  }
  function refreshModifiers() {
    const m = progress.getModifiers();
    playerCombat.configure({ maxHealth: 5 + m.maxHealthBonus });
    playerController.setMoveSpeedMultiplier?.(m.moveSpeedMultiplier ?? 1);
    pickupSystem.setMagnetTuning(m.pickupMagnetRadius ? { magnetRadius: m.pickupMagnetRadius, magnetSpeed: m.pickupMagnetSpeed, magnetAccel: 17.5 } : null);
    combatHud.updateProgress(progress.getBankedXp());
  }
  function refreshObjectives() {
    const pending = deriveCampaignProgress(progress.getState()).filter(o => !o.completed && o.eligible);
    for (const objective of pending) {
      const result = progress.completeObjective(objective.id);
      if (result.completed) {
        toast(objective.id === "frontier_finale" ? "THE FRONTIER ANSWERS" : "Field milestone complete", `${objective.title} · +${result.rewards.xp} secured XP`);
        audio.playLevelUp();
      }
    }
    combatHud.updateProgress(progress.getBankedXp());
  }
  function objectiveModel() {
    const s = progress.getState();
    if (s.campaignCompleted) return { title: "Explore the wilds", description: "Discover every Wildkin and awaken the four seals." };
    if (corePending) return { title: "Bring the Core home", description: "Extract to secure the Heartwood Core." };
    if (companions.getPending().length) return { title: "Bring your Wildkin home", description: "Extract to secure your new bond." };
    if (!s.hasDepartedOnce && isCamp()) return { title: "Through the gate", description: "Follow the path. Tap Travel at the glowing arch." };
    if (session.isActive() && !s.completedObjectives.includes("first_extract")) return { title: "Gather & return", description: "Gather nearby. Extract at a blue Waypoint or amber Beacon." };
    const next = getNextCampaignObjective(s);
    if (next?.id === "frontier_finale") return { title: "Find the Heartwood", description: "Repair the gates. Defeat the Guardian and extract with its Core." };
    return next ? { title: next.title, description: next.description } : { title: "Explore the frontier", description: "Follow the path toward the next ruined gate. Every discovered Waypoint opens a new start for future expeditions." };
  }
  function getModel() {
    const s = progress.getState();
    const pending = companions.getPending();
    return { isCamp: isCamp(), regionName: registry.getSectionById(getSectionId())?.displayName ?? registry.getSectionById(getSectionId())?.name ?? "Camp",
      bankedXp: s.bankedXp, playerLevel: getPlayerLevel(s.bankedXp), health: playerCombat.getHealth(), maxHealth: playerCombat.getMaxHealth(), cargo: pickupSystem.getInventory(), carriedXp: xpMoteSystem.getXp(), progress: s,
      skills: {nodes:SKILL_CATALOG,unlocked:s.skillUnlocks,points:s.skillPointsAvailable,level:getPlayerLevel(s.bankedXp)},
      companions: COMPANIONS.map(c => ({ ...c, secured: s.securedCompanions.includes(c.id), active: s.activeCompanionId === c.id, discovered: s.discoveredSpecies.includes(c.id), pending: pending.some(p => p.id === c.id) })),
      pendingCompanions: pending, captureCapacity: progress.getModifiers().captureCapacity, objective: objectiveModel(), medkits: s.craftedConsumables.medkit ?? 0,
      ability: companions.getAbility(), settings, campaignComplete: s.campaignCompleted,
      base: base.getModel(), fieldTaming: companions.getFieldTamingState?.() ?? null,
      objectives: deriveCampaignProgress(s).map(({id,title,completed}) => ({id,title,completed})) };
  }
  function action(type, payload) {
    if (type === "start") { audio.unlock(); return; }
    if (type === 'selectQuickSlot') return equipment.select(payload);
    if (type === 'assignQuickSlot') return equipment.assign(payload.slot, payload.id);
    if (type === "cancelTaming") { companions.cancelTaming?.(); return; }
    if (['beginBuild','craftFieldSupply','removeStructure','expandBase'].includes(type)) {
      const result=base.onAction(type,payload);
      if(type==='beginBuild'&&result?.ok)shell.close();
      return result;
    }
    // These are deliberately fire-and-forget input bridges. They must not
    // create a shell result/toast or force a HUD rerender while held.
    if (type === "fieldToolStart" || type === "fieldToolEnd" || type === "dodge") {
      onGameplayAction?.(type);
      return;
    }
    if (type === "purchaseSkill") {
      const r = progress.purchaseSkill(payload);
      if (r.purchased) { refreshModifiers(); audio.playLevelUp(); pulse(playerController.getState().pos,0xffcf65); }
      return {ok:r.purchased,message:r.purchased ? `${SKILL_BY_ID[payload].name} learned` : r.reason==='storage-write-failed' ? 'Could not save. Point kept.' : r.reason==='prerequisite' ? 'Learn the connected skill first.' : r.reason==='level-locked' ? 'Secure more XP to level up.' : 'No skill points available.'};
    }
    if (type === "openMap") { shell.close(); openMap(); return; }
    if (type === "purchaseUpgrade") {
      if (!isCamp()) return { ok: false, message: "Upgrade at Camp." };
      const result = progress.purchaseUpgrade(payload);
      if (result.purchased) { refreshModifiers(); playerCombat.reset(); refreshObjectives(); audio.playLevelUp(); pulse(playerController.getState().pos, 0xffcc78); }
      return { ok: result.purchased, message: result.purchased ? "Upgraded." : result.reason === "level-locked" ? "Secure more XP to level up." : "Gather the materials shown." };
    }
    if (type === "craftMedkit") {
      if (!isCamp()) return { ok: false, message: "Craft field supplies at Camp." };
      const r = progress.craftConsumable("medkit");
      if (r.crafted) audio.playPickup("fiber");
      return { ok: r.crafted, message: r.crafted ? "Medkit packed." : "Need 3 fiber and 2 berries." };
    }
    if (type === "selectCompanion") {
      if (!isCamp()) return { ok: false, message: "Choose your companion at the Camp sanctuary." };
      progress.selectCompanion(payload);
      return { ok: true, message: payload ? `${COMPANIONS.find(c => c.id === payload)?.name ?? "Companion"} will join your next expedition.` : "Your companion is resting at Camp." };
    }
    if (type === "ability") return companions.useAbility();
    if (type === "heal") {
      if (!session.isActive() || shell.isOpen()) return { ok: false, message: "Use field medicine during an expedition." };
      if (playerCombat.getHealth() >= playerCombat.getMaxHealth()) return { ok: false, message: "Health is full. Your medkit is saved for later." };
      const r = progress.consumeConsumable("medkit");
      if (!r.consumed) return { ok: false, message: "Craft medkits at Camp: 3 Fiber + 2 Berries." };
      playerCombat.heal(progress.getModifiers().medkitHeal);
      pulse(playerController.getState().pos, 0x91e5a5); audio.playXpCollect();
      return { ok: true, message: "Field medkit used." };
    }
    if (type === "mute") { settings.muted = !!payload; applySettings(); return; }
    if (type === "reducedMotion") { settings.reducedMotion = !!payload; applySettings(); return; }
    if (type === "exportSave") {
      const blob = new Blob([JSON.stringify(progress.exportSave().payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = "wildkin-frontier-save.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      return { ok: true, message: "Your frontier save has been exported." };
    }
    if (type === "import-save") {
      if (!isCamp()) return { ok: false, message: "Extract or return to Camp before restoring a backup." };
      if (!payload || payload.size > 1_000_000 || typeof payload.text !== "function") return { ok: false, message: "Choose a Frontier save smaller than 1 MB." };
      return payload.text().then(text => {
        const result = progress.importSave(text);
        if (!result.ok) return { ok: false, message: result.reason === "storage-write-failed" ? "This browser could not store the backup. Your current progress has been kept." : "This file is not a supported Frontier save. Your current progress has been kept." };
        // Reload reconstructs every persistent gate, chest, Camp modifier and
        // companion from the same validated snapshot, through the normal boot.
        setTimeout(() => location.reload(), 700);
        return { ok: true, message: "Backup restored. Returning to your Camp…" };
      });
    }
    if (type === "pause") { shell.open("settings"); return; }
  }
  shell = createBetaShell({ app, getModel, onAction: action, onBlockingChanged, canOpen: () => !authorEnabled && !deps.isOtherBlocking() && !companions.isBlocking() && !base.isBlocking() });
  applySettings(); refreshModifiers();
  window.addEventListener("keydown", e => {
    if (e.repeat || authorEnabled || isBlocking() || deps.isOtherBlocking() || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
    const key = e.key.toLowerCase();
    if (/^[1-5]$/.test(key)) { e.preventDefault(); const r=equipment.select(Number(key)-1); if(r.message)toast('Equipment',r.message); shell.update(); }
    if (key === "j" || key === "b") { e.preventDefault(); shell.open('inventory'); }
    if (key === "k") { e.preventDefault(); shell.open('skills'); }
    if (key === "m") { e.preventDefault(); openMap(); }
    if (key === "h" || key === "q") { e.preventDefault(); const r = action(key === "h" ? "heal" : "ability"); if (r?.message) toast("Frontier", r.message); }
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden && !authorEnabled && !isBlocking() && !deps.isOtherBlocking()) shell.open("journal"); });
  window.addEventListener("frontier:graphics-interrupted", () => { if (!isBlocking() && !deps.isOtherBlocking()) shell.open("settings"); });
  function isBlocking() { return shell.isOpen() || companions.isBlocking() || base.isBlocking(); }
  return {
    isBlocking, getModel, companions, shell, base, equipment, refreshModifiers, refreshObjectives,
    showWelcome: () => { if (!authorEnabled) shell.showWelcome(); },
    openWorkshop: (id) => { if(!base.openStation(id))shell.open("workshop"); },
    openSanctuary: () => shell.open('wildkin'),
    getNearbyInteraction(pos){
      if(isCamp()){
        const workbench=base.getNearbyInteraction(pos);
        if(workbench)return {...workbench,type:'resonator'};
        const sanctuary=registry.getSectionById('camp')?.props?.find(p=>p.id==='prop_camp_sanctuary');
        if(sanctuary&&Math.hypot(pos.x-sanctuary.pos.x,pos.z-sanctuary.pos.z)<2)return {type:'campSanctuary',id:sanctuary.id,label:'Wildkin'};
      }
      return companions.getNearbyInteraction(pos);
    },
    beginBond: companions.beginBond,
    getDamage: () => progress.getModifiers().fieldToolDamageMultiplier,
    onCreatureDamaged: (creature, amount) => combatFeedback.showDamage(creature.state.pos, amount),
    onHarvestDrop(node) {
      harvestBonus += progress.getModifiers().harvestYieldMultiplier - 1;
      if (harvestBonus >= 1) { harvestBonus -= 1; pickupSystem.spawnPickup(node); combatFeedback.showReward(node.state.position, "+1 BONUS"); }
    },
    onCreatureDied(creature) {
      if (creature.state.id === "wildkin_guardian") { guardianDefeated = true; toast("The Guardian rests", "Claim the Heartwood Core."); }
    },
    lootAccess(chest) {
      if (chest.id === "chest_heartwood_core" && !guardianDefeated) return { ok: false, label: "HEARTWOOD SEALED", reason: "Defeat the Heartwood Guardian to quiet the seal." };
      return companions.lootAccess(chest);
    },
    onLoot(rewards, chest) {
      if (chest?.id === "chest_heartwood_core") corePending = true;
      toast(chest?.displayName ?? "Recovered cache", chest?.id === "chest_heartwood_core" ? "Bring the Core home." : `+${rewards.xp} XP`);
      pulse(chest?.pos ?? playerController.getState().pos, 0xffd878); audio.playLevelUp();
    },
    onExtract(runId) {
      const secured = companions.resolveExtraction(runId);
      corePending = false;
      refreshObjectives(); refreshModifiers();
      return { companions: secured, campaignCompleted: progress.getState().campaignCompleted };
    },
    getBankingExtras: () => ({ companions: companions.getPending().map(c => c.id), coreSecured: corePending }),
    reset() { equipment.cancel(); equipment.sync(); base.close(); companions.reset(); guardianEncounter.reset(); combatFeedback.reset(); abilityFx.reset(); playerOcclusion.reset(); corePending = false; guardianDefeated = false; harvestBonus = 0; },
    // Simulation ownership stays in the single fixed loop. The regular update
    // below only advances visual animation and DOM/presentation concerns.
    updateFixed(dt, { paused = false, authorSuppress = false } = {}) {
      base.update(0,{hidden:authorSuppress});
      companions.updateFixed(dt, { sectionId: getSectionId(), paused, hidden: authorSuppress });
    },
    update(dt, { paused, authorSuppress } = {}) {
      const sectionId = getSectionId();
      const hidden = !!authorSuppress;
      base.update(dt,{hidden,paused,reducedMotion:settings.reducedMotion});
      combatFeedback.update(dt, { hidden: paused || hidden });
      playerOcclusion.update(dt, { hidden: paused || hidden });
      abilityFx.update(paused ? 0 : dt, { playerPosition: playerController.getState().pos, hidden: paused || hidden, reducedMotion: settings.reducedMotion });
      guardianEncounter.update(dt, { sectionId, paused, hidden });
      audio.updateAmbience?.(dt, { sectionId, paused: paused || hidden });
      companions.update(dt, { sectionId, paused, hidden });
      if (!hidden) atmosphere.update(settings.reducedMotion ? 0 : dt, { playerPosition: playerController.getState().pos, sectionId });
      // Author's own isolation/lighting owner must remain authoritative.
      atmosphere.motes.visible = !hidden;
      contactShadows.update(sectionId, hidden);
      if (sectionId !== lastSection) { lastSection = sectionId; sectionIntro = 0.8; }
      if (sectionIntro > 0 && !paused && !hidden) { sectionIntro -= dt; if (sectionIntro <= 0 && session.isActive()) toast(getModel().regionName); }
      objectiveTimer += dt;
      if (objectiveTimer > 1 && !hidden) {
        objectiveTimer = 0; refreshObjectives();
        if (!progress.getStorageStatus().saved && !warnedStorage) {
          warnedStorage = true;
          toast("Progress is not saving", "Keep this tab open. Export your save from Journal → Settings before leaving.");
        } else if (progress.getStorageStatus().saved) warnedStorage = false;
      }
      if (authorEnabled) app.classList.toggle("author-active", hidden);
      shell.update(dt);
    },
  };
}
