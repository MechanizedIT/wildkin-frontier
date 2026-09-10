import * as THREE from "three";
import { COMPANIONS, COMPANION_BY_ID, identifyCompanion, SECRET_COMPANION } from "./companionCatalog.js";
import { canBond } from "./bondingLogic.js";
import { createVisualAssetVisual } from "../world/visualFactory.js";
import { createBondingPanel } from "../ui/bondingPanel.js";

export function createCompanionSystem({ app, scene, registry, progress, creatures, playerController, playerCombat, isActive, getSectionId, onBlockingChanged, toast, pulse, audio, onAbility = () => {} }) {
  let pending = [], cooldown = 0, elapsed = 0;
  const followers = new Map();
  const wardRoots = new Map();
  const retryAt = new Map();
  const panel = createBondingPanel({ app, onBlockingChanged, audio, onFinished({ status, species, target }) {
    if (status === "success" && isActive() && creatures.secureBondTarget(target.state.id)) {
      pending.push(species.id);
      pulse(target.state.pos, new THREE.Color(species.color).getHex());
      toast(`${species.name} bonded`, "Unsecured. Return to Camp to welcome it into your sanctuary.");
    } else if (status === "failed") retryAt.set(target.state.id, elapsed + 6);
    creatures.setBondingTarget(null);
  } });
  for (const species of COMPANIONS) {
    const chest = registry.getLootChestById(species.secret);
    if (!chest) continue;
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
    const state = progress.getState();
    let best = null;
    for (const target of creatures.getActiveAliveCreatures()) {
      const species = identifyCompanion(target);
      if (!species) continue;
      const distance = Math.hypot(target.state.pos.x - pos.x, target.state.pos.z - pos.z);
      if (distance < 7) progress.discoverSpecies(species.id);
      if (distance > 4.2 || Math.abs(target.state.pos.y - pos.y) > 2.2 || (best && distance >= best.distance)) continue;
      const eligibility = canBond({ speciesId: species.id, secured: state.securedCompanions, pending, capacity: progress.getModifiers().captureCapacity, damaged: target.state.playerDamaged });
      if (!eligibility.ok && state.securedCompanions.includes(species.id)) continue;
      best = { type: "bond", id: target.state.id, species, target, distance, label: `BOND · ${species.name}`, detail: eligibility.ok ? "Approach peacefully · match three resonance echoes" : eligibility.reason };
    }
    return best;
  }
  function beginBond(id) {
    const target = creatures.getActiveAliveCreatures().find(c => c.state.id === id);
    const species = identifyCompanion(target);
    const state = progress.getState();
    const eligibility = canBond({ speciesId: species?.id, secured: state.securedCompanions, pending, capacity: progress.getModifiers().captureCapacity, damaged: target?.state.playerDamaged, active: isActive() });
    if (!eligibility.ok) { toast("Cannot bond yet", eligibility.reason); return false; }
    const pos = playerController.getState().pos;
    if (Math.hypot(target.state.pos.x - pos.x, target.state.pos.z - pos.z) > 4.5 || Math.abs(target.state.pos.y - pos.y) > 2.2) return false;
    if ((retryAt.get(id) ?? 0) > elapsed) { toast("Give it a moment", "Its resonance will settle in a few seconds."); return false; }
    const danger = creatures.getActiveAliveCreatures().some(c => c !== target && c.state.isAggroed && Math.hypot(c.state.pos.x - pos.x, c.state.pos.z - pos.z) < 6);
    if (danger) { toast("Find a calm moment", "Nearby threats are interrupting the resonance."); return false; }
    creatures.setBondingTarget(id);
    return panel.open(species, target);
  }
  function useAbility() {
    if (!isActive() || panel.isOpen()) return { ok: false, message: "Companion abilities are available on expeditions." };
    const species = COMPANION_BY_ID[progress.getState().activeCompanionId];
    if (!species) return { ok: false, message: "Secure a bonded Wildkin, then select it at Camp." };
    if (cooldown > 0) return { ok: false, message: `${species.abilityName} is ready in ${Math.ceil(cooldown)}s.` };
    const pos = playerController.getState().pos;
    let openedSeal = false;
    const chest = registry.getLootChestById(species.secret);
    if (chest && chest.sectionId === getSectionId() && Math.hypot(chest.pos.x - pos.x, chest.pos.z - pos.z) < 5.5 && !progress.getState().completedPoiIds.includes(chest.id)) {
      openedSeal = progress.completePoi(chest.id);
      if (openedSeal) toast("Ancient seal awakened", `${species.name} has opened a path to the cache.`);
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
    cooldown = species.cooldown;
    onAbility(species.id, pos);
    pulse(pos, new THREE.Color(species.color).getHex());
    audio.playParkour?.("complete");
    return { ok: true, message: openedSeal ? "The cache is now accessible." : `${species.name} · ${species.abilityName}` };
  }
  function lootAccess(chest) {
    const required = SECRET_COMPANION[chest.id];
    if (!required || progress.getState().completedPoiIds.includes(chest.id)) return { ok: true };
    const species = COMPANION_BY_ID[required];
    return { ok: false, label: `${species.name.toUpperCase()} SEAL`, reason: `Bring a secured ${species.name} and use ${species.abilityName} near this cache.` };
  }
  function update(dt, { sectionId, paused = false, hidden = false } = {}) {
    elapsed += dt;
    panel.update(dt);
    if (!paused) cooldown = Math.max(0, cooldown - dt);
    const s = progress.getState();
    const active = s.activeCompanionId;
    const ids = [...new Set([active, ...pending].filter(Boolean))];
    const pos = playerController.getState().pos;
    const facing = playerController.getState().facing;
    for (const [id, group] of followers) {
      if (!ids.includes(id)) group.visible = false;
    }
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i], species = COMPANION_BY_ID[id];
      let group = followers.get(id);
      if (!group) {
        const asset = registry.data.visualAssets.find(a => a.id === species.assetId);
        if (!asset) continue;
        group = createVisualAssetVisual(asset);
        group.name = `companion_${id}`; group.userData.betaPresentation = true;
        group.scale.setScalar(0.7);
        scene.add(group); followers.set(id, group);
        group.position.set(pos.x, pos.y - 0.5, pos.z);
      }
      group.visible = !hidden;
      const angle = facing + Math.PI + (i - 0.5) * 0.75;
      const x = pos.x + Math.sin(angle) * (1.5 + i * 0.45), z = pos.z + Math.cos(angle) * (1.5 + i * 0.45);
      const y = pos.y - 0.47 + Math.sin(elapsed * 3.5 + i) * 0.06 + (id === "skydancer" || id === "tidefin" ? 0.35 : 0);
      const alpha = group.position.distanceToSquared(pos) > 200 ? 1 : 1 - Math.exp(-dt * 5);
      group.position.x += (x - group.position.x) * alpha;
      group.position.z += (z - group.position.z) * alpha;
      group.position.y += (y - group.position.y) * alpha;
      group.rotation.y = facing;
    }
    for (const [id, ward] of wardRoots) {
      ward.root.visible = !hidden && ward.chest.sectionId === sectionId && !s.completedPoiIds.includes(ward.chest.id);
      ward.crystal.rotation.y += dt * 0.6;
      ward.crystal.position.y = 1.4 + Math.sin(elapsed * 2) * 0.1;
    }
  }
  return {
    getNearbyInteraction, beginBond, useAbility, lootAccess, update,
    isBlocking: () => panel.isOpen(),
    getBondState: panel.getState,
    getPending: () => pending.map(id => ({ ...COMPANION_BY_ID[id] })),
    getAbility: () => { const species = COMPANION_BY_ID[progress.getState().activeCompanionId]; return species ? { name: species.abilityName, ready: cooldown <= 0, cooldown } : null; },
    resolveExtraction() { const ids = [...pending]; pending = []; return ids; },
    reset() { panel.cancel(); pending = []; cooldown = 0; retryAt.clear(); creatures.setBondingTarget(null); },
  };
}
