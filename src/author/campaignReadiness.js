// src/author/campaignReadiness.js — browser-safe campaign route/economy readiness estimate.
import { CAMPAIGN_OBJECTIVES } from "../progression/campaignProgress.js";
import { getPlayerLevel } from "../progression/playerLevel.js";
import { BASE_PIECE_BY_ID, FIELD_RECIPE_BY_ID } from "../base/baseCatalog.js";
import { describeVisualAssetCollider, getColliderCenter } from '../world/colliderDescriptor.js';

const ROUTE = ["section_1", "section_2", "section_3", "section_4", "section_5"];
const PLAYER_RADIUS = 0.36;
const RESOURCE_YIELDS = { tree: { wood: 5 }, rock: { stone: 4 }, fiber: { fiber: 3 } };
const CREATURE_XP = { rusher: 3, spitter: 4 };
const EARLY_CAMPAIGN_XP = CAMPAIGN_OBJECTIVES
  .filter((entry) => entry.id === "first_harvest" || entry.id === "first_extract")
  .reduce((sum, entry) => sum + (entry.rewards?.xp ?? 0), 0);

const add = (target, source) => { for (const [id, amount] of Object.entries(source ?? {})) target[id] = (target[id] ?? 0) + amount; };
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function staticBlockers(section, assets) {
  const blockers = [];
  for (const prop of section.props ?? []) {
    if (prop.subtype !== "visualAsset" || prop.collisionEnabled === false) continue;
    const asset = assets.get(prop.visualAssetId);
    if (!asset?.collision || asset.gameplay?.role !== "prop") continue;
    // Readiness is conservative; the actual controller follows the convex faces.
    const descriptor = describeVisualAssetCollider({collision:asset.collision, position:prop.pos, uniformScale:prop.uniformScale ?? 1, rotationY:prop.rotY ?? 0});
    const center = getColliderCenter(descriptor);
    blockers.push({id:prop.id, x:center.x, z:center.z, w:descriptor.size.width, d:descriptor.size.depth, r:prop.rotY ?? 0});
  }
  for (const obstacle of section.traversal?.obstacles ?? []) blockers.push({ id: obstacle.id, x: obstacle.x, z: obstacle.z, w: obstacle.w, d: obstacle.h, r: obstacle.rotY ?? 0 });
  return blockers;
}

function canReach(section, from, to, assets) {
  if (!section.bounds || !from || !to) return false;
  const step = 0.65, { minX, maxX, minZ, maxZ } = section.bounds;
  const width = Math.floor((maxX - minX) / step) + 1, height = Math.floor((maxZ - minZ) / step) + 1;
  const blockers = staticBlockers(section, assets), key = (x, z) => `${x},${z}`;
  const index = (point) => ({ x: Math.max(0, Math.min(width - 1, Math.round((point.x - minX) / step))), z: Math.max(0, Math.min(height - 1, Math.round((point.z - minZ) / step))) });
  const start = index(from), end = index(to), queue = [start], seen = new Set([key(start.x, start.z)]);
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    if (Math.abs(current.x - end.x) <= 2 && Math.abs(current.z - end.z) <= 2) return true;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = current.x + dx, nz = current.z + dz, id = key(nx, nz);
      if (nx < 0 || nz < 0 || nx >= width || nz >= height || seen.has(id)) continue;
      const point = { x: minX + nx * step, z: minZ + nz * step };
      const blocked = blockers.some((blocker) => {
        const dx2 = point.x - blocker.x, dz2 = point.z - blocker.z, c = Math.cos(blocker.r), s = Math.sin(blocker.r);
        return Math.abs(dx2 * c - dz2 * s) <= blocker.w / 2 + PLAYER_RADIUS && Math.abs(dx2 * s + dz2 * c) <= blocker.d / 2 + PLAYER_RADIUS;
      });
      if (!blocked) { seen.add(id); queue.push({ x: nx, z: nz }); }
    }
  }
  return false;
}

export function analyzeCampaign(world = {}) {
  const errors = [], warnings = ["Coarse walkability is an estimate only; run a physical playtest before release."];
  const assets = new Map((world.visualAssets ?? []).map((entry) => [entry.id, entry]));
  const tables = new Map((world.lootTables ?? []).map((entry) => [entry.id, entry]));
  const sections = new Map((world.regions ?? []).map((entry) => [entry.id, entry]));
  const resourceMap = () => Object.fromEntries((world.resourceDrops ?? []).map((entry) => [entry.id, 0]));
  const renewable = (section) => {
    const out = resourceMap();
    for (const entry of section.resources ?? []) add(out, RESOURCE_YIELDS[entry.type]);
    for (const prop of section.props ?? []) {
      const harvest = assets.get(prop.visualAssetId)?.gameplay?.harvestable;
      if (harvest) add(out, { [harvest.dropId]: harvest.maxChunks });
    }
    return out;
  };
  const sectionXp = (section) => {
    let xp = 0;
    for (const chest of section.lootChests ?? []) for (const reward of tables.get(chest.lootTableId)?.rewards ?? []) if (reward.type === "xp") xp += reward.amount;
    for (const creature of section.creatures ?? []) xp += CREATURE_XP[creature.type] ?? 0;
    for (const prop of section.props ?? []) xp += CREATURE_XP[assets.get(prop.visualAssetId)?.gameplay?.wildkin?.archetype] ?? 0;
    return xp;
  };

  let renewableReach = resourceMap(), earnedXp = EARLY_CAMPAIGN_XP;
  const summary = [];
  for (const id of ROUTE) {
    const section = sections.get(id);
    if (!section) { errors.push(`Missing campaign section ${id}`); continue; }
    const entry = section.entryPoints?.[0];
    if (!entry) { errors.push(`${id} has no arrival entry`); continue; }
    const availableAfterSection = { ...renewableReach }; add(availableAfterSection, renewable(section));
    if (id === "section_1") {
      // Starter gifts must not conceal a missing source for repeatable play.
      for (const recipe of [FIELD_RECIPE_BY_ID.berry_lure, BASE_PIECE_BY_ID.foundation]) {
        for (const resource of Object.keys(recipe.cost)) {
          if (!(availableAfterSection[resource] > 0)) errors.push(`${id}: no renewable ${resource} for the first ${recipe.name}`);
        }
      }
    }
    const xpAfterSection = earnedXp + sectionXp(section);
    const targets = [...(section.majorWaypoints ?? []), ...(section.extractionBeacons ?? []), ...(section.portalGates ?? []), ...(section.lootChests ?? [])];
    const unreachable = targets.filter((target) => !canReach(section, entry.pos, target.pos, assets)).map((target) => target.id);
    for (const targetId of unreachable) errors.push(`${id}: ${targetId} is not reachable by coarse walkability from ${entry.id}`);
    for (const gate of section.portalGates ?? []) if (gate.state === "ruined") {
      for (const [resource, amount] of Object.entries(gate.requirements?.resources ?? {})) if ((availableAfterSection[resource] ?? 0) < amount) errors.push(`${gate.id}: requires ${amount} carried ${resource}, but the reachable renewable harvest envelope has only ${availableAfterSection[resource] ?? 0}`);
      if (getPlayerLevel(xpAfterSection) < (gate.requirements?.minPlayerLevel ?? 1)) errors.push(`${gate.id}: needs level ${gate.requirements.minPlayerLevel}, but authored first-clear XP ${xpAfterSection} yields level ${getPlayerLevel(xpAfterSection)}`);
    }
    summary.push({ id, xp: xpAfterSection, level: getPlayerLevel(xpAfterSection), renewableResources: availableAfterSection, unreachable });
    renewableReach = availableAfterSection; earnedXp = xpAfterSection;
    if (id === "section_5") {
      const guardian = section.props?.find((entry) => entry.id === "wildkin_guardian"), core = section.lootChests?.find((entry) => entry.id === "chest_heartwood_core");
      if (!guardian || !core) errors.push("Heartwood finale must contain both guardian and core");
      else if (!(distance(entry.pos, guardian.pos) < distance(entry.pos, core.pos) && guardian.pos.z > core.pos.z)) errors.push("Heartwood Guardian must stand between the arrival route and Heartwood Core");
    }
  }
  for (const [assetId, sectionId, chestId] of [["asset_wildkin_mossling", "section_1", "chest_mossling_secret"], ["asset_wildkin_tidefin", "section_2", "chest_tidefin_secret"], ["asset_wildkin_emberhorn", "section_3", "chest_emberhorn_secret"], ["asset_wildkin_skydancer", "section_4", "chest_skydancer_secret"]]) {
    const section = sections.get(sectionId);
    if (!assets.get(assetId)?.gameplay?.wildkin) errors.push(`${assetId} must remain a Wildkin asset`);
    if (!(section?.props ?? []).some((entry) => entry.visualAssetId === assetId)) errors.push(`${sectionId} has no placed ${assetId}`);
    if (!(section?.lootChests ?? []).some((entry) => entry.id === chestId)) errors.push(`${sectionId} missing companion reward ${chestId}`);
  }
  const camp = sections.get("camp"), campGate = camp?.portalGates?.find((entry) => entry.id === "gate_camp_frontier");
  if (!world.camp?.playerSpawn?.position) errors.push("Camp player spawn missing");
  else if (!campGate || distance(world.camp.playerSpawn.position, campGate.pos) > 8.1) errors.push("Camp frontier gate must be within 8 world units of the first-launch spawn");
  return { errors, warnings, sections: summary, summary: { route: ROUTE, earlyCampaignXp: EARLY_CAMPAIGN_XP, finaleObjective: CAMPAIGN_OBJECTIVES.find((entry) => entry.id === "frontier_finale")?.title ?? "Heartwood Restored" } };
}
