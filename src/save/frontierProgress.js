// src/save/frontierProgress.js — persistent bank + discovered frontier anchors (Phase 4A)
// Owns only: bankedResources, bankedXp, unlockedMajorWaypointIds, discoveredBeaconIds, hasDepartedOnce
// LocalStorage only, versioned, filters stale world IDs, idempotent banking API.

import { makeEmptyResourceMap, normalizeResourceMap } from "../resources/resourceDropCatalog.js";
import { CONSUMABLE_CATALOG, getUpgradeDefinition, getUpgradeModifiers, getUpgradeTier, UPGRADE_CATALOG } from "../progression/upgradeCatalog.js";
import { getCampaignObjective } from "../progression/campaignProgress.js";
import { getPlayerLevel } from "../progression/playerLevel.js";
import { getAvailableSkillPoints, getSkillPurchaseReason, normalizeSkillUnlocks, mergeSkillModifiers } from "../progression/skillCatalog.js";
import { BASE_CONFIG, BASE_EXPANSIONS, BASE_PIECE_BY_ID, FIELD_RECIPE_BY_ID, canAfford } from '../base/baseCatalog.js';
import { cloneBase, getCampReserved, normalizeBase, normalizeFieldSupplies, validatePlacement } from '../base/basePlacement.js';
import { QUICK_SLOT_COUNT, EQUIPMENT_BY_ID, normalizeLoadout, cloneLoadout, getEquipmentCount } from '../equipment/equipmentCatalog.js';

const STORAGE_KEY = "wildkin.frontierProgress";
const AUTHOR_STORAGE_KEY = "wildkin.authorFrontierProgress";
export const SAVE_TRANSFER_FORMAT = "wildkin-frontier-save";
export const SAVE_TRANSFER_VERSION = 1;
const MAX_PERSISTED_NUMBER = 1000000000;
const MAX_PERSISTED_ID_LENGTH = 128;
const MAX_PERSISTED_LIST_ENTRIES = 200;
const MAX_TIMESTAMP = 4102444800000; // 2100-01-01; prevents unusable corrupted cooldowns.
// Keep the established save version: normalization is additive and tolerant of
// missing fields, so old player saves migrate without making existing tooling
// reject a new version number.
const VERSION = 2;
export const COMPANION_SPECIES_IDS = Object.freeze(["mossling", "emberhorn", "skydancer", "tidefin"]);
const COMPANION_SPECIES = new Set(COMPANION_SPECIES_IDS);

function cloneRes(r) { return { ...r }; }

function normalizeIdArray(value) {
  if (!Array.isArray(value)) return [];
  const result = [];
  const seen = new Set();
  for (const id of value) {
    if (typeof id !== "string" || id.length === 0 || id.length > MAX_PERSISTED_ID_LENGTH || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    if (result.length >= MAX_PERSISTED_LIST_ENTRIES) break;
  }
  return result;
}

function normalizeSpeciesArray(value) {
  return normalizeIdArray(value).filter((id) => COMPANION_SPECIES.has(id));
}

function normalizeConsumables(value) {
  const normalized = {};
  for (const id of Object.keys(CONSUMABLE_CATALOG)) {
    const amount = value?.[id];
    normalized[id] = typeof amount === "number" && Number.isFinite(amount)
      ? Math.min(MAX_PERSISTED_NUMBER, Math.max(0, Math.floor(amount)))
      : 0;
  }
  return normalized;
}

function defaultState(initialWaypointId, resourceDrops) {
  return {
    version: VERSION,
    bankedResources: makeEmptyResourceMap(resourceDrops),
    bankedXp: 0,
    skillUnlocks: [],
    unlockedMajorWaypointIds: initialWaypointId ? [initialWaypointId] : [],
    discoveredBeaconIds: [],
    repairedPortalGateIds: [],
    claimedLootChestIds: [],
    lootChestReadyAt: {},
    hasDepartedOnce: false,
    upgrades: Object.fromEntries(UPGRADE_CATALOG.map((upgrade) => [upgrade.id, 0])),
    securedCompanions: [],
    activeCompanionId: null,
    discoveredSpecies: [],
    completedObjectives: [],
    completedPoiIds: [],
    campaignCompleted: false,
    craftedConsumables: { medkit: 0 },
    fieldSupplies: normalizeFieldSupplies(null),
    base: { tier: 0, structures: [] },
    loadout: normalizeLoadout(null),
    securedCompanionRunIds: [],
  };
}

export function createFrontierProgress(opts = {}) {
  const worldRegistry = opts.worldRegistry ?? null;
  const isAuthorMode = !!opts.isAuthorMode;
  const resourceDrops = opts.resourceDrops;
  const registryDefinesInitialWaypoint = typeof worldRegistry?.getInitialMajorWaypointId === "function";
  const initialWaypointId = Object.prototype.hasOwnProperty.call(opts, "initialWaypointId")
    ? opts.initialWaypointId
    : registryDefinesInitialWaypoint
      ? worldRegistry.getInitialMajorWaypointId()
      : worldRegistry?.getAllWaypoints?.()[0]?.id ?? null;
  const storageKey = isAuthorMode ? AUTHOR_STORAGE_KEY : STORAGE_KEY;
  // In author mode we keep state in memory only if opts.inMemory is true? Per spec either isolated key or in-memory.
  // We use isolated key but also expose that it does not corrupt normal key.
  // If opts.inMemoryAuthor then never touch storage.
  const useMemoryOnly = isAuthorMode && !!opts.inMemoryAuthor;

  let state = defaultState(initialWaypointId, resourceDrops);
  let lastBankToken = null; // legacy fallback
  let bankedRunIds = new Set();
  let storageStatus = { saved: true, reason: null };
  // persist bankedRunIds via state? Keep in memory bounded; versioned save includes lastBankedRunIds
  // Load from storage if present
  const BANKED_IDS_KEY = storageKey + ":bankedRunIds";

  function filterStale() {
    if (!worldRegistry) return;
    const allWpIds = new Set(worldRegistry.getAllWaypoints().map(w => w.id));
    const allBeaconIds = new Set(worldRegistry.getAllBeacons().map(b => b.id));
    const allPortalGateIds = new Set(worldRegistry.getAllPortalGates?.().map((gate) => gate.id) ?? []);
    const allLootChestIds = new Set(worldRegistry.getAllLootChests?.().map((chest) => chest.id) ?? []);
    state.unlockedMajorWaypointIds = state.unlockedMajorWaypointIds.filter(id => allWpIds.has(id));
    // ensure initial waypoint always present
    if (initialWaypointId && !state.unlockedMajorWaypointIds.includes(initialWaypointId)) {
      // keep initial even if filtered? Already filtered, but if world changed, initial may be new set
      // If stale, keep whatever remains; do not auto-readd stale-removed? Actually if initialWaypointId is valid and not in list, ensure it's there for fresh/correct behavior
      // Only add if allWpIds has it and not present
      if (allWpIds.has(initialWaypointId)) state.unlockedMajorWaypointIds.unshift(initialWaypointId);
    }
    state.discoveredBeaconIds = state.discoveredBeaconIds.filter(id => allBeaconIds.has(id));
    state.repairedPortalGateIds = state.repairedPortalGateIds.filter((id) => allPortalGateIds.has(id));
    state.claimedLootChestIds = state.claimedLootChestIds.filter((id) => allLootChestIds.has(id));
    state.lootChestReadyAt = Object.fromEntries(Object.entries(state.lootChestReadyAt).filter(([id]) => allLootChestIds.has(id)));
    // dedup
    state.unlockedMajorWaypointIds = [...new Set(state.unlockedMajorWaypointIds)];
    state.discoveredBeaconIds = [...new Set(state.discoveredBeaconIds)];
    state.repairedPortalGateIds = [...new Set(state.repairedPortalGateIds)];
    state.claimedLootChestIds = [...new Set(state.claimedLootChestIds)];
  }

  function normalizeLoaded(raw) {
    bankedRunIds = new Set();
    if (!raw || typeof raw !== "object") return defaultState(initialWaypointId, resourceDrops);
    const out = defaultState(initialWaypointId, resourceDrops);
    out.version = raw.version === VERSION ? VERSION : VERSION;
    if (raw.bankedResources && typeof raw.bankedResources === "object" && !Array.isArray(raw.bankedResources)) {
      const known = makeEmptyResourceMap(resourceDrops);
      for (const id of Object.keys(known)) {
        const amount = raw.bankedResources[id];
        known[id] = typeof amount === "number" && Number.isFinite(amount)
          ? Math.min(MAX_PERSISTED_NUMBER, Math.max(0, Math.floor(amount)))
          : 0;
      }
      out.bankedResources = known;
    }
    if (typeof raw.bankedXp === "number" && Number.isFinite(raw.bankedXp)) {
      out.bankedXp = Math.min(MAX_PERSISTED_NUMBER, Math.max(0, Math.floor(raw.bankedXp)));
    }
    if (Array.isArray(raw.unlockedMajorWaypointIds)) out.unlockedMajorWaypointIds = normalizeIdArray(raw.unlockedMajorWaypointIds);
    else out.unlockedMajorWaypointIds = initialWaypointId ? [initialWaypointId] : [];
    if (Array.isArray(raw.discoveredBeaconIds)) out.discoveredBeaconIds = normalizeIdArray(raw.discoveredBeaconIds);
    if (Array.isArray(raw.repairedPortalGateIds)) out.repairedPortalGateIds = normalizeIdArray(raw.repairedPortalGateIds);
    if (Array.isArray(raw.claimedLootChestIds)) out.claimedLootChestIds = normalizeIdArray(raw.claimedLootChestIds);
    if (raw.lootChestReadyAt && typeof raw.lootChestReadyAt === "object" && !Array.isArray(raw.lootChestReadyAt)) {
      out.lootChestReadyAt = Object.fromEntries(Object.entries(raw.lootChestReadyAt)
        .filter(([id, value]) => typeof id === "string" && id.length > 0 && id.length <= MAX_PERSISTED_ID_LENGTH && Number.isFinite(value) && value >= 0 && value <= MAX_TIMESTAMP)
        .slice(0, MAX_PERSISTED_LIST_ENTRIES));
    }
    out.hasDepartedOnce = !!raw.hasDepartedOnce;
    out.skillUnlocks = normalizeSkillUnlocks(raw.skillUnlocks, getPlayerLevel(out.bankedXp));
    for (const upgrade of UPGRADE_CATALOG) {
      const rawValue = raw.upgrades?.[upgrade.id];
      const rawLevel = typeof rawValue === "number" && Number.isFinite(rawValue) ? Math.max(0, Math.floor(rawValue)) : 0;
      out.upgrades[upgrade.id] = Math.min(rawLevel, upgrade.tiers.length);
    }
    out.upgrades.matter_attractor = Math.max(out.upgrades.matter_attractor, raw.matterAttractorI === true ? 1 : 0);
    out.securedCompanions = normalizeSpeciesArray(raw.securedCompanions);
    out.activeCompanionId = out.securedCompanions.includes(raw.activeCompanionId) ? raw.activeCompanionId : null;
    out.discoveredSpecies = normalizeSpeciesArray(raw.discoveredSpecies);
    out.completedObjectives = normalizeIdArray(raw.completedObjectives);
    out.completedPoiIds = normalizeIdArray(raw.completedPoiIds);
    out.campaignCompleted = !!raw.campaignCompleted;
    out.craftedConsumables = normalizeConsumables(raw.craftedConsumables);
    out.fieldSupplies = normalizeFieldSupplies(raw.fieldSupplies);
    out.base = normalizeBase(raw.base, baseEnvironment());
    out.loadout = normalizeLoadout(raw.loadout);
    out.securedCompanionRunIds = normalizeIdArray(raw.securedCompanionRunIds).slice(-20);
    if (out.bankedXp < 0) out.bankedXp = 0;
    if (out.unlockedMajorWaypointIds.length === 0 && initialWaypointId) out.unlockedMajorWaypointIds = [initialWaypointId];
    if (Array.isArray(raw.bankedRunIds)) {
      // restore bounded set
      bankedRunIds = new Set(normalizeIdArray(raw.bankedRunIds).slice(-20));
    }
    return out;
  }

  function load() {
    if (useMemoryOnly) {
      filterStale();
      return getState();
    }
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = normalizeLoaded(parsed);
      } else {
        state = defaultState(initialWaypointId, resourceDrops);
      }
    } catch {
      state = defaultState(initialWaypointId, resourceDrops);
    }
    filterStale();
    // persist normalized if we filtered
    save();
    return getState();
  }

  function serializedState() {
    return {
      ...state,
      skillUnlocks: [...state.skillUnlocks],
      bankedResources: { ...state.bankedResources },
      unlockedMajorWaypointIds: [...state.unlockedMajorWaypointIds],
      discoveredBeaconIds: [...state.discoveredBeaconIds],
      repairedPortalGateIds: [...state.repairedPortalGateIds],
      claimedLootChestIds: [...state.claimedLootChestIds],
      lootChestReadyAt: { ...state.lootChestReadyAt },
      upgrades: { ...state.upgrades },
      securedCompanions: [...state.securedCompanions],
      discoveredSpecies: [...state.discoveredSpecies],
      completedObjectives: [...state.completedObjectives],
      completedPoiIds: [...state.completedPoiIds],
      craftedConsumables: { ...state.craftedConsumables },
      fieldSupplies: { ...state.fieldSupplies },
      base: cloneBase(state.base),
      loadout: cloneLoadout(state.loadout),
      securedCompanionRunIds: [...state.securedCompanionRunIds],
      bankedRunIds: [...bankedRunIds].slice(-20),
    };
  }

  function save() {
    if (useMemoryOnly) {
      storageStatus = { saved: true, reason: null };
      return storageStatus;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(serializedState()));
      storageStatus = { saved: true, reason: null };
    } catch {
      storageStatus = { saved: false, reason: "storage-write-failed" };
    }
    return { ...storageStatus };
  }

  function getStorageStatus() { return { ...storageStatus }; }

  function exportSave() {
    return {
      ok: true,
      payload: {
        format: SAVE_TRANSFER_FORMAT,
        version: SAVE_TRANSFER_VERSION,
        gameVersion: VERSION,
        progress: serializedState(),
      },
    };
  }

  function importSave(payload) {
    let parsed = payload;
    if (typeof parsed === "string") {
      try { parsed = JSON.parse(parsed); } catch { return { ok: false, reason: "invalid-json", state: getState() }; }
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false, reason: "invalid-envelope", state: getState() };
    if (parsed.format !== SAVE_TRANSFER_FORMAT) return { ok: false, reason: "invalid-format", state: getState() };
    if (parsed.version !== SAVE_TRANSFER_VERSION) return { ok: false, reason: "unsupported-transfer-version", state: getState() };
    if (parsed.gameVersion !== VERSION) return { ok: false, reason: "unsupported-game-version", state: getState() };
    if (!parsed.progress || typeof parsed.progress !== "object" || Array.isArray(parsed.progress)) return { ok: false, reason: "invalid-progress", state: getState() };
    if (!Number.isInteger(parsed.progress.version) || parsed.progress.version < 1 || parsed.progress.version > VERSION) return { ok: false, reason: "unsupported-save-version", state: getState() };

    const previousState = state;
    const previousRunIds = bankedRunIds;
    const previousToken = lastBankToken;
    // normalizeLoaded is the sole schema migration path; never assign imported
    // values directly into runtime state.
    const nextState = normalizeLoaded(parsed.progress);
    const nextRunIds = bankedRunIds;
    state = nextState;
    bankedRunIds = nextRunIds;
    filterStale();
    const write = save();
    if (!write.saved) {
      state = previousState;
      bankedRunIds = previousRunIds;
      lastBankToken = previousToken;
      return { ok: false, reason: write.reason, state: getState() };
    }
    lastBankToken = null;
    return { ok: true, state: getState() };
  }

  function clear() {
    state = defaultState(initialWaypointId, resourceDrops);
    lastBankToken = null;
    bankedRunIds.clear();
    save();
  }

  function getState() {
    return {
      version: state.version,
      skillUnlocks: [...state.skillUnlocks],
      skillPointsAvailable: getAvailableSkillPoints(state.skillUnlocks, getPlayerLevel(state.bankedXp)),
      bankedResources: { ...state.bankedResources },
      bankedXp: state.bankedXp,
      unlockedMajorWaypointIds: [...state.unlockedMajorWaypointIds],
      discoveredBeaconIds: [...state.discoveredBeaconIds],
      repairedPortalGateIds: [...state.repairedPortalGateIds],
      claimedLootChestIds: [...state.claimedLootChestIds],
      lootChestReadyAt: { ...state.lootChestReadyAt },
      hasDepartedOnce: !!state.hasDepartedOnce,
      upgrades: { ...state.upgrades },
      matterAttractorI: (state.upgrades.matter_attractor ?? 0) >= 1,
      securedCompanions: [...state.securedCompanions],
      activeCompanionId: state.activeCompanionId,
      discoveredSpecies: [...state.discoveredSpecies],
      completedObjectives: [...state.completedObjectives],
      completedPoiIds: [...state.completedPoiIds],
      campaignCompleted: !!state.campaignCompleted,
      craftedConsumables: { ...state.craftedConsumables },
      fieldSupplies: { ...state.fieldSupplies },
      base: cloneBase(state.base),
      loadout: cloneLoadout(state.loadout),
    };
  }

  function isUnlockedWaypoint(id) { return state.unlockedMajorWaypointIds.includes(id); }
  function isDiscoveredBeacon(id) { return state.discoveredBeaconIds.includes(id); }

  function unlockWaypoint(id) {
    if (!id || typeof id !== "string") return false;
    // validate exists in world if registry available
    if (worldRegistry) {
      const exists = worldRegistry.getAllWaypoints().some(w => w.id === id);
      if (!exists) return false;
    }
    if (state.unlockedMajorWaypointIds.includes(id)) return false;
    state.unlockedMajorWaypointIds.push(id);
    save();
    return true;
  }

  function discoverBeacon(id) {
    if (!id || typeof id !== "string") return false;
    if (worldRegistry) {
      const exists = worldRegistry.getAllBeacons().some(b => b.id === id);
      if (!exists) return false;
    }
    if (state.discoveredBeaconIds.includes(id)) return false;
    state.discoveredBeaconIds.push(id);
    save();
    return true;
  }

  function markDeparted() {
    if (!state.hasDepartedOnce) {
      state.hasDepartedOnce = true;
      save();
      return true;
    }
    return false;
  }

  function normalizeBankingExtras(extras) {
    const value = extras && typeof extras === "object" && !Array.isArray(extras) ? extras : {};
    return {
      companions: normalizeSpeciesArray(value.companions),
      coreSecured: value.coreSecured === true,
    };
  }

  function snapshotForBankRollback() {
    return {
      state: {
        ...state,
        bankedResources: { ...state.bankedResources }, upgrades: { ...state.upgrades },
        unlockedMajorWaypointIds: [...state.unlockedMajorWaypointIds], discoveredBeaconIds: [...state.discoveredBeaconIds],
        repairedPortalGateIds: [...state.repairedPortalGateIds], claimedLootChestIds: [...state.claimedLootChestIds], lootChestReadyAt: { ...state.lootChestReadyAt },
        securedCompanions: [...state.securedCompanions], discoveredSpecies: [...state.discoveredSpecies], completedObjectives: [...state.completedObjectives],
        completedPoiIds: [...state.completedPoiIds], craftedConsumables: { ...state.craftedConsumables }, securedCompanionRunIds: [...state.securedCompanionRunIds],
        fieldSupplies: { ...state.fieldSupplies }, base: cloneBase(state.base),
        loadout: cloneLoadout(state.loadout),
      },
      bankedRunIds: new Set(bankedRunIds), lastBankToken,
    };
  }

  function commitBank(snapshot, result) {
    const write = save();
    if (write.saved) return { ok: true, ...result };
    state = snapshot.state;
    bankedRunIds = snapshot.bankedRunIds;
    lastBankToken = snapshot.lastBankToken;
    return { ok: false, added: false, reason: write.reason, state: getState() };
  }

  function bankRun(cargo, xp, runId = null, extras = {}) {
    const normalizedCargo = normalizeResourceMap(cargo, resourceDrops, { keepUnknown: true });
    const totalCargo = Object.values(normalizedCargo).reduce((sum, amount) => sum + amount, 0);
    const xpVal = Math.min(MAX_PERSISTED_NUMBER, Math.max(0, Math.floor(Number(xp) || 0)));
    const bankingExtras = normalizeBankingExtras(extras);
    if (runId) {
      if (bankedRunIds.has(runId)) return { ok: true, added: false, state: getState() };
      const rollback = snapshotForBankRollback();
      const newCompanions = bankingExtras.companions.filter((id) => !state.securedCompanions.includes(id));
      const coreWasUnsecured = bankingExtras.coreSecured && !state.completedPoiIds.includes("heartwood_core_secured");
      const coreChestWasUnclaimed = bankingExtras.coreSecured && !state.claimedLootChestIds.includes("chest_heartwood_core");
      const hasExtras = newCompanions.length > 0 || coreWasUnsecured || coreChestWasUnclaimed;
      if (totalCargo === 0 && xpVal === 0 && !hasExtras) {
        bankedRunIds.add(runId);
        if (bankedRunIds.size > 20) { const arr = [...bankedRunIds]; bankedRunIds = new Set(arr.slice(-20)); }
        return commitBank(rollback, { added: false, state: getState() });
      }
      for (const [id, amount] of Object.entries(normalizedCargo)) state.bankedResources[id] = (state.bankedResources[id] ?? 0) + amount;
      state.bankedXp += xpVal;
      if (newCompanions.length > 0) {
        state.securedCompanions.push(...newCompanions);
        state.discoveredSpecies = [...new Set([...state.discoveredSpecies, ...newCompanions])];
        if (!state.activeCompanionId) state.activeCompanionId = newCompanions[0];
      }
      if (bankingExtras.coreSecured) {
        if (!state.completedPoiIds.includes("heartwood_core_secured")) state.completedPoiIds.push("heartwood_core_secured");
        if (!state.claimedLootChestIds.includes("chest_heartwood_core")) state.claimedLootChestIds.push("chest_heartwood_core");
      }
      // This mirrors secureCompanions' run-level idempotence without a second write.
      if (newCompanions.length > 0 || bankingExtras.companions.length > 0) {
        state.securedCompanionRunIds = [...state.securedCompanionRunIds, runId].slice(-20);
      }
      bankedRunIds.add(runId);
      if (bankedRunIds.size > 20) { const arr = [...bankedRunIds]; bankedRunIds = new Set(arr.slice(-20)); }
      // also update legacy token to avoid double
      lastBankToken = `${runId}:${JSON.stringify(normalizedCargo)}:${xpVal}`;
      return commitBank(rollback, { added: true, companions: newCompanions, state: getState() });
    }
    // legacy path without runId (for old tests)
    const token = `${JSON.stringify(normalizedCargo)}:${xpVal}:${JSON.stringify(state.bankedResources)}:${state.bankedXp}`;
    if (lastBankToken === token) return { ok: true, added: false, state: getState() };
    if (totalCargo === 0 && xpVal === 0) {
      lastBankToken = token;
      return { ok: true, added: false, state: getState() };
    }
    const rollback = snapshotForBankRollback();
    for (const [id, amount] of Object.entries(normalizedCargo)) state.bankedResources[id] = (state.bankedResources[id] ?? 0) + amount;
    state.bankedXp += xpVal;
    lastBankToken = `${JSON.stringify(normalizedCargo)}:${xpVal}:${JSON.stringify(state.bankedResources)}:${state.bankedXp}`;
    return commitBank(rollback, { added: true, state: getState() });
  }

  function purchaseMatterAttractorI(cost) {
    if ((state.upgrades.matter_attractor ?? 0) >= 1) return { purchased: false, reason: "owned", state: getState() };
    if (!cost || typeof cost !== "object" || Array.isArray(cost)) {
      return { purchased: false, reason: "invalid-cost", state: getState() };
    }
    const entries = Object.entries(cost);
    if (entries.length === 0 || entries.some(([id, amount]) => typeof id !== "string" || !id || !Number.isInteger(amount) || amount <= 0)) {
      return { purchased: false, reason: "invalid-cost", state: getState() };
    }
    for (const [id, amount] of entries) {
      if (!Object.prototype.hasOwnProperty.call(state.bankedResources, id)) {
        return { purchased: false, reason: "invalid-resource", state: getState() };
      }
      if ((state.bankedResources[id] ?? 0) < amount) {
        return { purchased: false, reason: "unaffordable", state: getState() };
      }
    }
    const nextResources = { ...state.bankedResources };
    for (const [id, amount] of entries) nextResources[id] -= amount;
    state.bankedResources = nextResources;
    state.upgrades = { ...state.upgrades, matter_attractor: 1 };
    save();
    return { purchased: true, reason: "purchased", state: getState() };
  }

  function purchaseUpgrade(id) {
    const definition = getUpgradeDefinition(id);
    if (!definition) return { purchased: false, reason: "unknown-upgrade", state: getState() };
    const currentLevel = state.upgrades[id] ?? 0;
    const tier = getUpgradeTier(id, currentLevel + 1);
    if (!tier) return { purchased: false, reason: "max-level", state: getState() };
    if (getPlayerLevel(state.bankedXp) < tier.minPlayerLevel) return { purchased: false, reason: "level-locked", state: getState() };
    for (const [resourceId, amount] of Object.entries(tier.cost)) {
      if (!Object.prototype.hasOwnProperty.call(state.bankedResources, resourceId)) return { purchased: false, reason: "invalid-resource", state: getState() };
      if ((state.bankedResources[resourceId] ?? 0) < amount) return { purchased: false, reason: "unaffordable", state: getState() };
    }
    const nextResources = { ...state.bankedResources };
    for (const [resourceId, amount] of Object.entries(tier.cost)) nextResources[resourceId] -= amount;
    state.bankedResources = nextResources;
    state.upgrades = { ...state.upgrades, [id]: currentLevel + 1 };
    save();
    return { purchased: true, reason: "purchased", upgrade: id, level: currentLevel + 1, state: getState() };
  }

  function getUpgradeLevel(id) { return getUpgradeDefinition(id) ? (state.upgrades[id] ?? 0) : 0; }
  function getModifiers() { return mergeSkillModifiers(getUpgradeModifiers(state.upgrades), state.skillUnlocks); }

  function purchaseSkill(id) {
    const reason = getSkillPurchaseReason(id, state.skillUnlocks, getPlayerLevel(state.bankedXp));
    if (reason) return { purchased: false, reason, state: getState() };
    const previous = [...state.skillUnlocks];
    state.skillUnlocks.push(id);
    const result = save();
    if (!result.saved) { state.skillUnlocks = previous; return { purchased:false, reason:result.reason, state:getState() }; }
    return { purchased:true, skill:id, state:getState() };
  }

  function secureCompanions(ids, runId = null) {
    if (runId && state.securedCompanionRunIds.includes(runId)) return { added: false, companions: [], state: getState() };
    const candidates = normalizeSpeciesArray(ids);
    const companions = candidates.filter((id) => !state.securedCompanions.includes(id));
    if (runId) state.securedCompanionRunIds = [...state.securedCompanionRunIds, runId].slice(-20);
    if (companions.length === 0) { if (runId) save(); return { added: false, companions: [], state: getState() }; }
    state.securedCompanions.push(...companions);
    state.discoveredSpecies = [...new Set([...state.discoveredSpecies, ...companions])];
    if (!state.activeCompanionId) state.activeCompanionId = companions[0];
    save();
    return { added: true, companions, state: getState() };
  }

  function selectCompanion(id) {
    if (id !== null && !state.securedCompanions.includes(id)) return false;
    if (state.activeCompanionId === id) return false;
    state.activeCompanionId = id;
    save();
    return true;
  }

  function discoverSpecies(id) {
    if (!COMPANION_SPECIES.has(id) || state.discoveredSpecies.includes(id)) return false;
    state.discoveredSpecies.push(id);
    save();
    return true;
  }

  function completeObjective(id) {
    const objective = getCampaignObjective(id);
    if (!objective) return { completed: false, reason: "unknown-objective", state: getState() };
    if (state.completedObjectives.includes(id)) return { completed: false, reason: "already-completed", state: getState() };
    if (!objective.when(state)) return { completed: false, reason: "not-eligible", state: getState() };
    const rewards = objective.rewards ?? { resources: {}, xp: 0 };
    const nextResources = { ...state.bankedResources };
    for (const [resourceId, amount] of Object.entries(rewards.resources ?? {})) {
      if (Object.prototype.hasOwnProperty.call(nextResources, resourceId)) nextResources[resourceId] += Math.max(0, Math.floor(Number(amount) || 0));
    }
    state.bankedResources = nextResources;
    state.bankedXp += Math.max(0, Math.floor(Number(rewards.xp) || 0));
    state.completedObjectives.push(id);
    if (id === "frontier_finale") state.campaignCompleted = true;
    save();
    return { completed: true, rewards, state: getState() };
  }

  function completePoi(id) {
    if (!id || typeof id !== "string" || state.completedPoiIds.includes(id)) return false;
    state.completedPoiIds.push(id);
    save();
    return true;
  }

  function craftConsumable(id) {
    const recipe = CONSUMABLE_CATALOG[id];
    if (!recipe) return { crafted: false, reason: "unknown-consumable", state: getState() };
    for (const [resourceId, amount] of Object.entries(recipe.cost)) if ((state.bankedResources[resourceId] ?? 0) < amount) return { crafted: false, reason: "unaffordable", state: getState() };
    const rollback = snapshotForBankRollback();
    const nextResources = { ...state.bankedResources };
    for (const [resourceId, amount] of Object.entries(recipe.cost)) nextResources[resourceId] -= amount;
    state.bankedResources = nextResources;
    state.craftedConsumables = { ...state.craftedConsumables, [id]: (state.craftedConsumables[id] ?? 0) + 1 };
    const write = commitBank(rollback, {});
    if (!write.ok) return { crafted: false, reason: write.reason, state: getState() };
    return { crafted: true, state: getState() };
  }

  function consumeConsumable(id) {
    if (!CONSUMABLE_CATALOG[id]) return { consumed: false, reason: "unknown-consumable", state: getState() };
    if ((state.craftedConsumables[id] ?? 0) <= 0) return { consumed: false, reason: "empty", state: getState() };
    const rollback = snapshotForBankRollback();
    state.craftedConsumables = { ...state.craftedConsumables, [id]: state.craftedConsumables[id] - 1 };
    const write = commitBank(rollback, {});
    if (!write.ok) return { consumed: false, reason: write.reason, state: getState() };
    return { consumed: true, state: getState() };
  }

  function baseEnvironment() { return { reserved: getCampReserved(worldRegistry), surface: worldRegistry?.getSectionById?.('camp')?.surface ?? null }; }
  function getBaseState() { return cloneBase(state.base); }
  function getFieldSupplies() { return { ...state.fieldSupplies }; }
  function getLoadout() { return cloneLoadout(state.loadout); }
  function assignQuickSlot(slot, itemId) {
    if(!Number.isInteger(slot)||slot<0||slot>=QUICK_SLOT_COUNT)return {ok:false,reason:'invalid-slot'};
    if(itemId!==null&&(!EQUIPMENT_BY_ID[itemId]||getEquipmentCount(itemId,state)<=0))return {ok:false,reason:'item-unavailable'};
    const rollback=snapshotForBankRollback(), slots=state.loadout.slots;
    const previous=itemId===null?-1:slots.indexOf(itemId);
    if(previous>=0&&previous!==slot)slots[previous]=slots[slot];
    slots[slot]=itemId;
    if(!slots[state.loadout.selected])state.loadout.selected=Math.max(0,slots.findIndex(Boolean));
    const write=commitBank(rollback,{});return {ok:write.ok,reason:write.reason,loadout:getLoadout()};
  }
  function selectQuickSlot(slot) {
    if(!Number.isInteger(slot)||slot<0||slot>=QUICK_SLOT_COUNT||!state.loadout.slots[slot])return {ok:false,reason:'empty-slot'};
    if(state.loadout.selected===slot)return {ok:true,loadout:getLoadout()};
    const rollback=snapshotForBankRollback();state.loadout.selected=slot;
    const write=commitBank(rollback,{});return {ok:write.ok,reason:write.reason,loadout:getLoadout()};
  }
  function spendBanked(cost) { for (const [id,amount] of Object.entries(cost)) state.bankedResources[id] -= amount; }
  function craftFieldSupply(id) {
    const recipe=FIELD_RECIPE_BY_ID[id];
    if(!recipe)return {crafted:false,reason:'unknown-recipe'};
    if(recipe.workbench&&!state.base.structures.some(p=>p.type==='workbench'))return {crafted:false,reason:'workbench-required'};
    if(state.fieldSupplies[id]>=BASE_CONFIG.maxSupply)return {crafted:false,reason:'supply-limit'};
    if(!canAfford(state.bankedResources,recipe.cost))return {crafted:false,reason:'unaffordable'};
    const rollback=snapshotForBankRollback();spendBanked(recipe.cost);state.fieldSupplies[id]++;
    const write=commitBank(rollback,{});return {crafted:write.ok,reason:write.reason,state:getState()};
  }
  function consumeFieldSupply(id) {
    if(!FIELD_RECIPE_BY_ID[id])return {consumed:false,reason:'unknown-recipe'};
    if(!(state.fieldSupplies[id]>0))return {consumed:false,reason:'empty'};
    const rollback=snapshotForBankRollback();state.fieldSupplies[id]--;
    const write=commitBank(rollback,{});return {consumed:write.ok,reason:write.reason,state:getState()};
  }
  function placeStructure(record,{playerPosition=null}={}) {
    if(typeof record?.id!=='string'||!/^build_[a-zA-Z0-9_-]{1,80}$/.test(record.id))return {placed:false,reason:'invalid-id'};
    if(state.base.structures.some(p=>p.id===record.id))return {placed:false,reason:'already-placed'};
    const result=validatePlacement(record,{...baseEnvironment(),...state.base,playerPosition});
    if(!result.ok)return {placed:false,reason:result.reason};
    const piece=BASE_PIECE_BY_ID[record.type];
    if(!canAfford(state.bankedResources,piece.cost))return {placed:false,reason:'unaffordable'};
    const rollback=snapshotForBankRollback();spendBanked(piece.cost);
    state.base.structures.push({id:record.id,type:record.type,pos:result.pos,yaw:((record.yaw%(Math.PI*2))+Math.PI*2)%(Math.PI*2),supportId:result.supportId});
    const write=commitBank(rollback,{});return {placed:write.ok,reason:write.reason,state:getState()};
  }
  function removeStructure(id) {
    const piece=state.base.structures.find(p=>p.id===id);if(!piece)return {removed:false,reason:'unknown-structure'};
    if(state.base.structures.some(p=>p.supportId===id))return {removed:false,reason:'remove-supported-first'};
    const rollback=snapshotForBankRollback();state.base.structures=state.base.structures.filter(p=>p.id!==id);
    for(const [resource,amount] of Object.entries(BASE_PIECE_BY_ID[piece.type].cost))state.bankedResources[resource]=(state.bankedResources[resource]??0)+amount;
    const write=commitBank(rollback,{});return {removed:write.ok,reason:write.reason,state:getState()};
  }
  function expandBase() {
    const cost=BASE_EXPANSIONS[state.base.tier];if(!cost)return {expanded:false,reason:'max-tier'};
    if(!canAfford(state.bankedResources,cost))return {expanded:false,reason:'unaffordable'};
    const rollback=snapshotForBankRollback();spendBanked(cost);state.base.tier++;
    const write=commitBank(rollback,{});return {expanded:write.ok,reason:write.reason,state:getState()};
  }

  // For idempotent run resolution helper: generic resolve token
  function tryResolve(token) {
    if (lastBankToken === token) return false;
    lastBankToken = token;
    return true;
  }

  function getBankedResources() { return { ...state.bankedResources }; }
  function getBankedXp() { return state.bankedXp; }
  function getUnlockedWaypoints() { return [...state.unlockedMajorWaypointIds]; }
  function getDiscoveredBeacons() { return [...state.discoveredBeaconIds]; }
  function getHasDeparted() { return !!state.hasDepartedOnce; }
  function hasMatterAttractorI() { return (state.upgrades.matter_attractor ?? 0) >= 1; }

  function isPortalGateRepaired(id) { return state.repairedPortalGateIds.includes(id); }
  function repairPortalGate(id) {
    if (!id || typeof id !== "string" || isPortalGateRepaired(id)) return false;
    if (worldRegistry?.getPortalGateById && !worldRegistry.getPortalGateById(id)) return false;
    state.repairedPortalGateIds.push(id);
    save();
    return true;
  }

  function getLootChestAvailability(id, refillSeconds, now = Date.now()) {
    if (refillSeconds === undefined || refillSeconds === null) {
      return { available: !state.claimedLootChestIds.includes(id), readyAt: null };
    }
    const readyAt = state.lootChestReadyAt[id] ?? 0;
    return { available: now >= readyAt, readyAt };
  }

  function claimLootChest(id, refillSeconds, now = Date.now()) {
    if (!id || typeof id !== "string") return { claimed: false, reason: "invalid" };
    if (worldRegistry?.getLootChestById && !worldRegistry.getLootChestById(id)) return { claimed: false, reason: "stale" };
    const availability = getLootChestAvailability(id, refillSeconds, now);
    if (!availability.available) return { claimed: false, reason: "cooldown", readyAt: availability.readyAt };
    if (refillSeconds === undefined || refillSeconds === null) {
      if (!state.claimedLootChestIds.includes(id)) state.claimedLootChestIds.push(id);
      save();
      return { claimed: true, readyAt: null };
    }
    const readyAt = now + refillSeconds * 1000;
    state.lootChestReadyAt[id] = readyAt;
    save();
    return { claimed: true, readyAt };
  }

  // For testing / fresh-save helper
  function isFreshSave() {
    return !state.hasDepartedOnce && state.bankedXp === 0 && Object.values(state.bankedResources).every((amount) => amount === 0);
  }

  return {
    load,
    save,
    getStorageStatus,
    exportSave,
    importSave,
    clear,
    getState,
    isUnlockedWaypoint,
    isDiscoveredBeacon,
    unlockWaypoint,
    discoverBeacon,
    markDeparted,
    bankRun,
    purchaseMatterAttractorI,
    purchaseUpgrade,
    purchaseSkill,
    getUpgradeLevel,
    getModifiers,
    secureCompanions,
    selectCompanion,
    discoverSpecies,
    completeObjective,
    completePoi,
    craftConsumable,
    consumeConsumable,
    getBaseState, getFieldSupplies, craftFieldSupply, consumeFieldSupply, placeStructure, removeStructure, expandBase,
    getLoadout, assignQuickSlot, selectQuickSlot,
    tryResolve,
    getBankedResources,
    getBankedXp,
    getUnlockedWaypoints,
    getDiscoveredBeacons,
    getHasDeparted,
    hasMatterAttractorI,
    isPortalGateRepaired,
    repairPortalGate,
    getLootChestAvailability,
    claimLootChest,
    isFreshSave,
    getStorageKey: () => storageKey,
    _defaultState: () => defaultState(initialWaypointId, resourceDrops),
  };
}
