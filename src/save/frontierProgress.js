// Persistent inventory, progression and resumable expedition transactions.
// LocalStorage only; gameplay supplies live proximity and run snapshots.

import { normalizeResourceMap } from "../resources/resourceDropCatalog.js";
import { CONSUMABLE_CATALOG, getUpgradeDefinition, getUpgradeModifiers, getUpgradeTier, UPGRADE_CATALOG } from "../progression/upgradeCatalog.js";
import { getCampaignObjective } from "../progression/campaignProgress.js";
import { getPlayerLevel } from "../progression/playerLevel.js";
import { getAvailableSkillPoints, getSkillPurchaseReason, normalizeSkillUnlocks, mergeSkillModifiers } from "../progression/skillCatalog.js";
import { BASE_PIECE_BY_ID, FIELD_RECIPE_BY_ID } from '../base/baseCatalog.js';
import { FIELD_PACK_FIT_COST } from '../base/fieldPackConfig.js';
import { cloneBase, getCampReserved, normalizeBase, validatePlacement } from '../base/basePlacement.js';
import { CAMP_DEBRIS_IDS, CAMP_YARD_COST, createCampLayout } from '../base/campLayout.js';
import { QUICK_SLOT_COUNT, EQUIPMENT_BY_ID, normalizeLoadout, cloneLoadout, getEquipmentCount } from '../equipment/equipmentCatalog.js';
import { createItemCatalog, INVENTORY_CONFIG } from '../inventory/itemCatalog.js';
import { createInventoryState, cloneInventory, readInventoryState, migrateLegacyInventory, getPackResources, getPackEquipment } from '../inventory/inventoryState.js';
import { createInventoryActions } from '../inventory/inventoryActions.js';
import { addStack, countItems, craftStacks } from '../inventory/slotOperations.js';
import { normalizeActiveRun, cloneActiveRun } from '../session/activeRunState.js';
import { OBSERVATION_CATALOG, normalizeObservationClues } from '../companions/observationCatalog.js';
import { createFrontierEcologyState, cloneFrontierEcologyState, normalizeFrontierEcologyState, validateFrontierResourceState, MAX_FRONTIER_RESOURCE_RECORDS } from '../world/frontierEcologyState.js';
import { createFrontierAtlasState, cloneFrontierAtlasState, normalizeFrontierAtlasState, revealFrontierAtlasRadius } from '../world/frontierAtlasState.js';
import { MAX_CAPTURED_WILDKIN_SOURCES, MAX_OWNED_WILDKIN, MAX_PENDING_WILDKIN, WILDKIN_INDIVIDUAL_VERSION, cloneWildkinIndividual, getWildkinSex, normalizeWildkinIndividual, normalizeWildkinIndividuals, projectWildkinSpecies } from '../creatures/wildkinIndividual.js';
import { createWildkinGenome } from '../creatures/wildkinGenome.js';
import { CAMP_CARE_MAX_NOURISHMENT, CAMP_CARE_VERSION, cloneCampCare, readCampCare } from '../companions/campCareState.js';
import { CAMP_CROP_GROWTH_SECONDS, CAMP_CROP_MAX_ADVANCE_SECONDS, CAMP_CROP_VERSION, cloneCampCrop, getCampCropStage, readCampCrop } from '../base/campGardenState.js';
import { CAMP_BREEDING_GROWTH_SECONDS, CAMP_BREEDING_MAX_ADVANCE_SECONDS, CAMP_BREEDING_VERSION, MAX_CAMP_BREEDING_SEQUENCE, MAX_NEXT_CAMP_BREEDING_SEQUENCE, cloneCampBreeding, createCampOffspring, getCampBreedingStage, getCampOffspringSequence, readCampBreeding } from '../companions/campBreedingState.js';

const STORAGE_KEY = "wildkin.frontierProgress";
const AUTHOR_STORAGE_KEY = "wildkin.authorFrontierProgress";
export const SAVE_TRANSFER_FORMAT = "wildkin-frontier-save";
export const SAVE_TRANSFER_VERSION = 1;
const MAX_PERSISTED_NUMBER = 1000000000;
const MAX_PERSISTED_ID_LENGTH = 128;
const MAX_PERSISTED_LIST_ENTRIES = 200;
const MAX_TIMESTAMP = 4102444800000; // 2100-01-01; prevents unusable corrupted cooldowns.
// v3 replaces the three spendable counters with one physical inventory.
// Import/load still accept v1/v2 through the same explicit migration.
const VERSION = 3;
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

const isWildkinId = value => typeof value === 'string' && /^[A-Za-z0-9_:-]{1,128}$/.test(value);
function legacyWildkinRecord(speciesId, runId, index = 0) {
  const suffix = `${runId}_${speciesId}_${index}`.replace(/[^A-Za-z0-9_:-]/g, '_').slice(0, 96);
  return { version: WILDKIN_INDIVIDUAL_VERSION, id: `wildkin_legacy_${suffix}`,
    speciesId, originId: `legacy_${suffix}`, acquiredRunId: runId,
    sex: getWildkinSex(`legacy_${suffix}`), lineage: null,
    genome: speciesId === 'mossling' ? { ...createWildkinGenome(`legacy:${suffix}`) } : null };
}

function projectedCompanionState(state) {
  const active = state.ownedWildkin.find(record => record.id === state.activeWildkinId) ?? null;
  return { securedCompanions: projectWildkinSpecies(state.ownedWildkin), activeCompanionId: active?.speciesId ?? null };
}

function defaultState(initialWaypointId, resourceDrops) {
  return {
    version: VERSION,
    inventory: createInventoryState(),
    activeRun: null,
    bankedXp: 0,
    skillUnlocks: [],
    unlockedMajorWaypointIds: initialWaypointId ? [initialWaypointId] : [],
    discoveredBeaconIds: [],
    repairedPortalGateIds: [],
    claimedLootChestIds: [],
    lootChestReadyAt: {},
    lootRemainders: {},
    hasDepartedOnce: false,
    upgrades: Object.fromEntries(UPGRADE_CATALOG.map((upgrade) => [upgrade.id, 0])),
    ownedWildkin: [],
    activeWildkinId: null,
    capturedWildkinSources: {},
    discoveredSpecies: [],
    observationClues: {},
    completedObjectives: [],
    completedPoiIds: [],
    campaignCompleted: false,
    base: { tier: 0, layout: createCampLayout(), structures: [] },
    campCare: null,
    campCrop: null,
    campBreeding: null,
    nextCampBreedingSequence: 1,
    loadout: normalizeLoadout(null),
    securedCompanionRunIds: [],
    ecology: createFrontierEcologyState(),
    atlas: createFrontierAtlasState(),
  };
}

export function createFrontierProgress(opts = {}) {
  const worldRegistry = opts.worldRegistry ?? null;
  const isAuthorMode = !!opts.isAuthorMode;
  const resourceDrops = opts.resourceDrops;
  const itemCatalog = createItemCatalog(resourceDrops);
  let canAccessContainer = opts.canAccessContainer ?? (() => false);
  let getCraftStorageId = opts.getCraftStorageId ?? (() => null);
  let runSnapshotProvider = null;
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
  let frontierAtlasSnapshot = makeFrontierAtlasSnapshot(state.atlas);
  let lastBankToken = null; // legacy fallback
  let bankedRunIds = new Set();
  let storageStatus = { saved: true, reason: null };
  let loadError = null;

  function makeFrontierAtlasSnapshot(atlas) {
    return Object.freeze({ edition: atlas.edition, seed: atlas.seed, chunks: Object.freeze({ ...atlas.chunks }) });
  }
  function refreshFrontierAtlasSnapshot() { frontierAtlasSnapshot = makeFrontierAtlasSnapshot(state.atlas); }
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
    if (raw.version > VERSION) throw new Error('unsupported-save-version');
    const physical = raw.version >= 3 ? readInventoryState(raw.inventory, itemCatalog) : migrateLegacyInventory(raw, itemCatalog);
    if (!physical.ok) throw new Error(physical.reason);
    out.inventory = physical.inventory;
    out.version = raw.version === VERSION ? VERSION : VERSION;
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
    if (raw.ownedWildkin !== undefined) {
      const owned = normalizeWildkinIndividuals(raw.ownedWildkin, MAX_OWNED_WILDKIN);
      if (!owned) throw new Error('invalid-owned-wildkin');
      out.ownedWildkin = owned;
    } else {
      // Old species saves become one stable local record per secured species.
      out.ownedWildkin = normalizeSpeciesArray(raw.securedCompanions).map((speciesId, index) => legacyWildkinRecord(speciesId, 'legacy_save', index));
    }
    if (raw.capturedWildkinSources !== undefined) {
      if (!raw.capturedWildkinSources || typeof raw.capturedWildkinSources !== 'object' || Array.isArray(raw.capturedWildkinSources)) throw new Error('invalid-captured-wildkin-sources');
      const entries = Object.entries(raw.capturedWildkinSources);
      if (entries.length > MAX_CAPTURED_WILDKIN_SOURCES) throw new Error('invalid-captured-wildkin-sources');
      for (const [originId, individualId] of entries) {
        if (!isWildkinId(originId) || !isWildkinId(individualId)) throw new Error('invalid-captured-wildkin-sources');
        out.capturedWildkinSources[originId] = individualId;
      }
    }
    out.activeWildkinId = out.ownedWildkin.some(record => record.id === raw.activeWildkinId)
      ? raw.activeWildkinId
      : out.ownedWildkin.find(record => record.speciesId === raw.activeCompanionId)?.id ?? null;
    out.discoveredSpecies = normalizeSpeciesArray(raw.discoveredSpecies);
    out.observationClues = normalizeObservationClues(raw.observationClues);
    out.discoveredSpecies = [...new Set([...out.discoveredSpecies, ...Object.keys(out.observationClues)])];
    out.completedObjectives = normalizeIdArray(raw.completedObjectives);
    out.completedPoiIds = normalizeIdArray(raw.completedPoiIds);
    out.campaignCompleted = !!raw.campaignCompleted;
    out.base = normalizeBase(raw.base, baseEnvironment());
    const campCare = readCampCare(raw.campCare, { structures: out.base.structures, ownedWildkin: out.ownedWildkin });
    if (!campCare.ok) throw new Error(campCare.reason);
    out.campCare = campCare.care;
    const campCrop = readCampCrop(raw.campCrop, { structures: out.base.structures });
    if (!campCrop.ok) throw new Error(campCrop.reason);
    out.campCrop = campCrop.crop;
    const nextCampBreedingSequence = raw.nextCampBreedingSequence ?? 1;
    if (!Number.isSafeInteger(nextCampBreedingSequence) || nextCampBreedingSequence < 1 || nextCampBreedingSequence > MAX_NEXT_CAMP_BREEDING_SEQUENCE) {
      throw new Error('invalid-camp-breeding-sequence');
    }
    const campBreeding = readCampBreeding(raw.campBreeding, { structures: out.base.structures, ownedWildkin: out.ownedWildkin, observationClues: out.observationClues });
    if (!campBreeding.ok) throw new Error(campBreeding.reason);
    if (campBreeding.breeding && out.campCare) throw new Error('invalid-camp-breeding-care');
    const usedBreedingSequences = [...out.ownedWildkin, campBreeding.breeding?.offspring].filter(Boolean)
      .map(getCampOffspringSequence).filter(Number.isSafeInteger);
    if (usedBreedingSequences.some(sequence => sequence >= nextCampBreedingSequence)) throw new Error('invalid-camp-breeding-sequence');
    out.campBreeding = campBreeding.breeding;
    out.nextCampBreedingSequence = nextCampBreedingSequence;
    if (raw.version >= 3 && raw.lootRemainders) {
      if (typeof raw.lootRemainders !== 'object' || Array.isArray(raw.lootRemainders) || Object.keys(raw.lootRemainders).length > MAX_PERSISTED_LIST_ENTRIES) throw new Error('invalid-loot-remainders');
      for (const [id, entry] of Object.entries(raw.lootRemainders)) {
        if (!id || id.length > MAX_PERSISTED_ID_LENGTH || !entry || typeof entry.resources !== 'object' || Array.isArray(entry.resources) || Object.entries(entry.resources).some(([item, count]) => !Object.hasOwn(itemCatalog, item) || !Number.isSafeInteger(count) || count <= 0)) throw new Error('invalid-loot-remainders');
        out.lootRemainders[id] = { resources: { ...entry.resources }, xpCollected: entry.xpCollected === true };
      }
    }
    for (const container of out.inventory.containers) {
      if (container.type === 'pod') continue;
      const piece = out.base.structures.find(record => record.id === container.id);
      if (!piece || BASE_PIECE_BY_ID[piece.type]?.storageType !== container.type) throw new Error('orphaned-container');
    }
    out.loadout = normalizeLoadout(raw.loadout);
    out.securedCompanionRunIds = normalizeIdArray(raw.securedCompanionRunIds).slice(-20);
    out.ecology = normalizeFrontierEcologyState(raw.ecology);
    out.atlas = normalizeFrontierAtlasState(raw.atlas);
    if (out.bankedXp < 0) out.bankedXp = 0;
    if (out.unlockedMajorWaypointIds.length === 0 && initialWaypointId) out.unlockedMajorWaypointIds = [initialWaypointId];
    if (Array.isArray(raw.bankedRunIds)) {
      // restore bounded set
      bankedRunIds = new Set(normalizeIdArray(raw.bankedRunIds).slice(-20));
    }
    if (raw.activeRun != null) {
      const active = normalizeActiveRun(raw.activeRun);
      if (!active.ok) throw new Error(active.reason);
      out.activeRun = bankedRunIds.has(active.run.runId) ? null : active.run;
    }
    if (out.campBreeding && out.activeRun) {
      if (out.ownedWildkin.length + out.activeRun.companions.length + 1 > MAX_OWNED_WILDKIN) throw new Error('invalid-camp-breeding-capacity');
      if (out.activeRun.companions.some(record => record.id === out.campBreeding.offspring.id || record.originId === out.campBreeding.offspring.originId)) {
        throw new Error('invalid-camp-breeding-offspring');
      }
    }
    return out;
  }

  function load() {
    loadError = null;
    if (useMemoryOnly) {
      filterStale();
      refreshFrontierAtlasSnapshot();
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
    } catch (error) {
      state = defaultState(initialWaypointId, resourceDrops);
      // Preserve the original file on failed migration instead of overwriting
      // legitimate quantities with an empty normalized save.
      storageStatus = { saved: false, reason: error.message ?? 'invalid-save' };
      loadError = storageStatus.reason;
      refreshFrontierAtlasSnapshot();
      return getState();
    }
    filterStale();
    refreshFrontierAtlasSnapshot();
    // persist normalized if we filtered
    save(state.activeRun);
    return getState();
  }

  function serializedState() {
    return {
      ...state,
      skillUnlocks: [...state.skillUnlocks],
      inventory: cloneInventory(state.inventory),
      activeRun: cloneActiveRun(state.activeRun),
      unlockedMajorWaypointIds: [...state.unlockedMajorWaypointIds],
      discoveredBeaconIds: [...state.discoveredBeaconIds],
      repairedPortalGateIds: [...state.repairedPortalGateIds],
      claimedLootChestIds: [...state.claimedLootChestIds],
      lootChestReadyAt: { ...state.lootChestReadyAt },
      lootRemainders: structuredClone(state.lootRemainders),
      upgrades: { ...state.upgrades },
      ownedWildkin: state.ownedWildkin.map(cloneWildkinIndividual),
      capturedWildkinSources: { ...state.capturedWildkinSources },
      discoveredSpecies: [...state.discoveredSpecies],
      observationClues: { ...state.observationClues },
      completedObjectives: [...state.completedObjectives],
      completedPoiIds: [...state.completedPoiIds],
      base: cloneBase(state.base),
      campCare: cloneCampCare(state.campCare),
      campCrop: cloneCampCrop(state.campCrop),
      campBreeding: cloneCampBreeding(state.campBreeding),
      nextCampBreedingSequence: state.nextCampBreedingSequence,
      loadout: cloneLoadout(state.loadout),
      ecology: cloneFrontierEcologyState(state.ecology),
      atlas: cloneFrontierAtlasState(state.atlas),
      securedCompanionRunIds: [...state.securedCompanionRunIds],
      bankedRunIds: [...bankedRunIds].slice(-20),
    };
  }

  function captureActiveRun(patch) {
    if (patch === null) { state.activeRun = null; return { ok: true }; }
    const current = patch?.runId ? patch : runSnapshotProvider ? runSnapshotProvider() : state.activeRun;
    if (!current) { state.activeRun = null; return { ok: true }; }
    const checked = normalizeActiveRun({ ...current, ...patch });
    if (!checked.ok) return checked;
    state.activeRun = bankedRunIds.has(checked.run.runId) ? null : checked.run;
    return { ok: true };
  }
  function save(runPatch) {
    if (loadError) return { saved: false, reason: loadError };
    const active = captureActiveRun(runPatch);
    if (!active.ok) return { saved: false, reason: active.reason };
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
  function getFrontierEcologyState() { return cloneFrontierEcologyState(state.ecology); }
  function getFrontierAtlasState() { return frontierAtlasSnapshot; }
  function revealFrontierAt(position) {
    const revealed = revealFrontierAtlasRadius(state.atlas, position);
    if (!revealed.ok) return { ok: false, changed: false, reason: revealed.reason };
    if (!revealed.changed) return { ok: true, changed: false, reason: null };
    const rollback = snapshotForBankRollback();
    const previousSnapshot = frontierAtlasSnapshot;
    state.atlas = {
      ...state.atlas,
      chunks: { ...state.atlas.chunks, ...Object.fromEntries(revealed.patches.map(({ chunkId, mask }) => [chunkId, mask])) },
    };
    const write = save();
    if (!write.saved) {
      state = rollback.state;
      bankedRunIds = rollback.bankedRunIds;
      lastBankToken = rollback.lastBankToken;
      frontierAtlasSnapshot = previousSnapshot;
      return { ok: false, changed: false, reason: write.reason };
    }
    refreshFrontierAtlasSnapshot();
    return { ok: true, changed: true, reason: null };
  }
  function getFrontierResourceRemaining(id) { return state.ecology.resources[id]; }
  function commitFrontierResourceState(id, remainingChunks) {
    const checked = validateFrontierResourceState(id, remainingChunks);
    if (!checked.ok) return { ok: false, reason: checked.reason, state: getFrontierEcologyState() };
    const exists = Object.hasOwn(state.ecology.resources, id);
    if (!exists && Object.keys(state.ecology.resources).length >= MAX_FRONTIER_RESOURCE_RECORDS) {
      return { ok: false, reason: 'ecology-capacity-exceeded', state: getFrontierEcologyState() };
    }
    if (exists && state.ecology.resources[id] === remainingChunks) return { ok: true, changed: false, state: getFrontierEcologyState() };
    const previous = cloneFrontierEcologyState(state.ecology);
    state.ecology.resources[id] = remainingChunks;
    const write = save();
    if (!write.saved) {
      state.ecology = previous;
      return { ok: false, reason: write.reason, state: getFrontierEcologyState() };
    }
    return { ok: true, changed: true, state: getFrontierEcologyState() };
  }
  function checkpointRun(patch) { return commitBank(snapshotForBankRollback(), {}, patch); }
  function endRunWithoutRewards(runId) {
    const rollback=snapshotForBankRollback();
    if(runId)bankedRunIds.add(runId);
    bankedRunIds=new Set([...bankedRunIds].slice(-20));
    return commitBank(rollback,{},null);
  }

  function getOwnedWildkin() { return state.ownedWildkin.map(cloneWildkinIndividual); }
  function getActiveWildkin() {
    return cloneWildkinIndividual(state.ownedWildkin.find(record => record.id === state.activeWildkinId) ?? null);
  }
  function setActiveWildkin(id) {
    if (id !== null && !state.ownedWildkin.some(record => record.id === id)) return { ok: false, reason: 'unknown-wildkin', state: getState() };
    if (state.activeWildkinId === id) return { ok: false, reason: 'already-active', state: getState() };
    const rollback = snapshotForBankRollback();
    state.activeWildkinId = id;
    const result = commitBank(rollback, {});
    return result.ok ? { ok: true, reason: null, state: getState() } : { ok: false, reason: result.reason, state: getState() };
  }
  function isWildkinSourceCaptured(originId) {
    return isWildkinId(originId) && Object.hasOwn(state.capturedWildkinSources, originId);
  }
  function commitWildkinCapture(record, pendingRecords) {
    const captured = normalizeWildkinIndividual(record);
    if (!captured || !state.activeRun || captured.acquiredRunId !== state.activeRun.runId) {
      return { ok: false, reason: 'invalid-wildkin-capture', state: getState() };
    }
    const pending = normalizeWildkinIndividuals(pendingRecords, MAX_PENDING_WILDKIN);
    const capacity = Math.min(MAX_PENDING_WILDKIN, Math.max(1, Math.floor(getModifiers().captureCapacity ?? 1)));
    if (!pending || pending.length > capacity || !pending.some(candidate => candidate.id === captured.id)) {
      return { ok: false, reason: 'invalid-wildkin-pending', state: getState() };
    }
    if (state.campBreeding && pending.some(candidate => candidate.id === state.campBreeding.offspring.id || candidate.originId === state.campBreeding.offspring.originId)) {
      return { ok: false, reason: 'wildkin-identity-conflict', state: getState() };
    }
    if (state.ownedWildkin.length + pending.length + (state.campBreeding ? 1 : 0) > MAX_OWNED_WILDKIN) {
      return { ok: false, reason: 'wildkin-owned-capacity', state: getState() };
    }
    const existing = state.capturedWildkinSources[captured.originId];
    if (existing && existing !== captured.id) return { ok: false, reason: 'wildkin-source-captured', state: getState() };
    if (!existing && Object.keys(state.capturedWildkinSources).length >= MAX_CAPTURED_WILDKIN_SOURCES) {
      return { ok: false, reason: 'wildkin-source-capacity', state: getState() };
    }
    const rollback = snapshotForBankRollback();
    state.activeRun = { ...cloneActiveRun(state.activeRun), companions: pending.map(cloneWildkinIndividual) };
    state.capturedWildkinSources[captured.originId] = captured.id;
    const result = commitBank(rollback, { record: cloneWildkinIndividual(captured), pendingRecords: pending.map(cloneWildkinIndividual), state: getState() }, state.activeRun);
    return result.ok ? result : { ok: false, reason: result.reason, state: getState() };
  }

  function setInventoryAccess(access = {}) {
    canAccessContainer = access.canAccessContainer ?? (() => false);
    getCraftStorageId = access.getCraftStorageId ?? (() => null);
  }
  function getInventoryState() { return cloneInventory(state.inventory); }
  function getPackResourceCounts() { return getPackResources(state.inventory, itemCatalog); }
  function getSpendableItemCounts(storageId = getCraftStorageId()) {
    const counts = countItems(state.inventory.pack);
    const source = storageId && canAccessContainer(storageId) ? state.inventory.containers.find(c => c.id === storageId) : null;
    const stored = countItems(source?.slots ?? []);
    return Object.fromEntries(Object.keys(itemCatalog).map(id => [id,
      (Object.hasOwn(counts, id) ? counts[id] : 0) + (Object.hasOwn(stored, id) ? stored[id] : 0),
    ]));
  }
  function getSpendableResources(storageId = getCraftStorageId()) {
    const counts = getPackResourceCounts();
    const source = storageId && canAccessContainer(storageId) ? state.inventory.containers.find(c => c.id === storageId) : null;
    for (const [id, amount] of Object.entries(countItems(source?.slots ?? []))) {
      if (Object.hasOwn(counts, id)) counts[id] += amount;
    }
    return counts;
  }
  function prepareExchange(cost, outputs = {}, storageId = getCraftStorageId()) {
    const inventory = cloneInventory(state.inventory);
    const source = storageId === null ? null : inventory.containers.find(c => c.id === storageId);
    if (storageId !== null && (!source || !canAccessContainer(storageId))) return { ok: false, reason: 'out-of-reach' };
    const result = craftStacks(inventory.pack, source?.slots ?? null, cost, outputs, itemCatalog);
    if (!result.ok) return { ok: false, reason: result.reason === 'missing-items' ? 'unaffordable' : result.reason };
    inventory.pack = result.pack;
    if (source) source.slots = result.storage;
    return { ok: true, inventory };
  }
  function commitInventory(inventory) {
    const checked = readInventoryState(inventory, itemCatalog);
    if (!checked.ok) return checked;
    const rollback = snapshotForBankRollback();
    state.inventory = checked.inventory;
    return commitBank(rollback, {});
  }
  const inventoryActions = createInventoryActions({ catalog: itemCatalog, getInventory: () => state.inventory, commitInventory, canAccessContainer: id => canAccessContainer(id) });
  function collectResources(resources, { gathered = false } = {}) {
    const inventory = cloneInventory(state.inventory), added = {}, remaining = {};
    for (const [id, count] of Object.entries(resources ?? {})) {
      if (!Object.hasOwn(itemCatalog, id) || !Number.isSafeInteger(count) || count < 0) return { ok: false, reason: 'invalid-item', added: {}, remaining: { ...resources } };
      if (!count) continue;
      const result = addStack(inventory.pack, id, count, itemCatalog);
      inventory.pack = result.slots;
      if (result.added) Object.defineProperty(added, id, { value: result.added, enumerable: true });
      if (result.remaining) Object.defineProperty(remaining, id, { value: result.remaining, enumerable: true });
    }
    const total = Object.values(added).reduce((sum, count) => sum + count, 0);
    if (!total) return { ok: false, reason: 'full', added, remaining };
    if (gathered) inventory.totals.gathered = Math.min(Number.MAX_SAFE_INTEGER, inventory.totals.gathered + total);
    const saved = commitInventory(inventory);
    return saved.ok ? { ok: true, added, remaining } : { ok: false, reason: saved.reason, added: {}, remaining: { ...resources } };
  }
  function spendResources(cost) {
    const result = prepareExchange(cost, {}, null);
    return result.ok ? commitInventory(result.inventory) : result;
  }

  function exportSave() {
    const captured=captureActiveRun();
    if(!captured.ok)return {ok:false,reason:captured.reason};
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
    if (![1, 2, VERSION].includes(parsed.gameVersion)) return { ok: false, reason: "unsupported-game-version", state: getState() };
    if (!parsed.progress || typeof parsed.progress !== "object" || Array.isArray(parsed.progress)) return { ok: false, reason: "invalid-progress", state: getState() };
    if (!Number.isInteger(parsed.progress.version) || parsed.progress.version < 1 || parsed.progress.version > VERSION) return { ok: false, reason: "unsupported-save-version", state: getState() };

    const previousState = state;
    const previousRunIds = bankedRunIds;
    const previousToken = lastBankToken;
    // normalizeLoaded is the sole schema migration path; never assign imported
    // values directly into runtime state.
    let nextState;
    try { nextState = normalizeLoaded(parsed.progress); }
    catch (error) { bankedRunIds = previousRunIds; return { ok: false, reason: error.message, state: getState() }; }
    const nextRunIds = bankedRunIds;
    state = nextState;
    bankedRunIds = nextRunIds;
    filterStale();
    const previousLoadError = loadError;
    loadError = null;
    const write = save(nextState.activeRun);
    if (!write.saved) {
      state = previousState;
      bankedRunIds = previousRunIds;
      lastBankToken = previousToken;
      loadError = previousLoadError;
      return { ok: false, reason: write.reason, state: getState() };
    }
    lastBankToken = null;
    refreshFrontierAtlasSnapshot();
    // The old runtime may still be at Camp until its scheduled reload. Its
    // pagehide checkpoint must not overwrite the newly imported expedition.
    runSnapshotProvider = null;
    return { ok: true, state: getState() };
  }

  function clear() {
    loadError = null;
    state = defaultState(initialWaypointId, resourceDrops);
    refreshFrontierAtlasSnapshot();
    lastBankToken = null;
    bankedRunIds.clear();
    save(null);
  }

  function getState() {
    const companionProjection = projectedCompanionState(state);
    return {
      version: state.version,
      skillUnlocks: [...state.skillUnlocks],
      skillPointsAvailable: getAvailableSkillPoints(state.skillUnlocks, getPlayerLevel(state.bankedXp)),
      inventory: cloneInventory(state.inventory),
      activeRun: cloneActiveRun(state.activeRun),
      // Legacy presentation names are derived views, never serialized owners.
      bankedResources: getSpendableResources(),
      bankedXp: state.bankedXp,
      unlockedMajorWaypointIds: [...state.unlockedMajorWaypointIds],
      discoveredBeaconIds: [...state.discoveredBeaconIds],
      repairedPortalGateIds: [...state.repairedPortalGateIds],
      claimedLootChestIds: [...state.claimedLootChestIds],
      lootChestReadyAt: { ...state.lootChestReadyAt },
      hasDepartedOnce: !!state.hasDepartedOnce,
      upgrades: { ...state.upgrades },
      matterAttractorI: (state.upgrades.matter_attractor ?? 0) >= 1,
      // Species fields remain projections for Journal/progression consumers.
      securedCompanions: companionProjection.securedCompanions,
      activeCompanionId: companionProjection.activeCompanionId,
      ownedWildkin: state.ownedWildkin.map(cloneWildkinIndividual),
      activeWildkinId: state.activeWildkinId,
      capturedWildkinSources: { ...state.capturedWildkinSources },
      discoveredSpecies: [...state.discoveredSpecies],
      observationClues: { ...state.observationClues },
      completedObjectives: [...state.completedObjectives],
      completedPoiIds: [...state.completedPoiIds],
      campaignCompleted: !!state.campaignCompleted,
      ...getPackEquipment(state.inventory, itemCatalog),
      base: cloneBase(state.base),
      campCare: cloneCampCare(state.campCare),
      campCrop: cloneCampCrop(state.campCrop),
      campBreeding: cloneCampBreeding(state.campBreeding),
      nextCampBreedingSequence: state.nextCampBreedingSequence,
      loadout: cloneLoadout(state.loadout),
      ecology: cloneFrontierEcologyState(state.ecology),
      atlas: cloneFrontierAtlasState(state.atlas),
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

  function normalizeBankingExtras(extras, runId) {
    const value = extras && typeof extras === "object" && !Array.isArray(extras) ? extras : {};
    let companions = normalizeWildkinIndividuals(value.companions, MAX_PENDING_WILDKIN);
    if (!companions && Array.isArray(value.companions) && value.companions.every(id => typeof id === 'string')) {
      companions = normalizeSpeciesArray(value.companions).map((speciesId, index) => legacyWildkinRecord(speciesId, runId ?? 'legacy_bank', index));
    }
    return {
      companions: companions ?? [],
      invalidCompanions: value.companions !== undefined && !companions,
      coreSecured: value.coreSecured === true,
    };
  }

  function snapshotForBankRollback() {
    return {
      state: {
        ...state,
        inventory: cloneInventory(state.inventory), upgrades: { ...state.upgrades },
        activeRun: cloneActiveRun(state.activeRun),
        unlockedMajorWaypointIds: [...state.unlockedMajorWaypointIds], discoveredBeaconIds: [...state.discoveredBeaconIds],
        repairedPortalGateIds: [...state.repairedPortalGateIds], claimedLootChestIds: [...state.claimedLootChestIds], lootChestReadyAt: { ...state.lootChestReadyAt },
        lootRemainders: structuredClone(state.lootRemainders),
        ownedWildkin: state.ownedWildkin.map(cloneWildkinIndividual), activeWildkinId: state.activeWildkinId,
        capturedWildkinSources: { ...state.capturedWildkinSources }, discoveredSpecies: [...state.discoveredSpecies], completedObjectives: [...state.completedObjectives],
        observationClues: { ...state.observationClues },
        ecology: cloneFrontierEcologyState(state.ecology),
        atlas: cloneFrontierAtlasState(state.atlas),
        completedPoiIds: [...state.completedPoiIds], securedCompanionRunIds: [...state.securedCompanionRunIds],
        base: cloneBase(state.base),
        campCare: cloneCampCare(state.campCare),
        campCrop: cloneCampCrop(state.campCrop),
        campBreeding: cloneCampBreeding(state.campBreeding),
        loadout: cloneLoadout(state.loadout),
      },
      bankedRunIds: new Set(bankedRunIds), lastBankToken,
    };
  }

  function commitBank(snapshot, result, runPatch) {
    const write = save(runPatch);
    if (write.saved) return { ok: true, ...result, ...(result.state ? {state:getState()} : {}) };
    state = snapshot.state;
    bankedRunIds = snapshot.bankedRunIds;
    lastBankToken = snapshot.lastBankToken;
    return { ok: false, added: false, reason: write.reason, state: getState() };
  }

  function bankRun(cargo, xp, runId = null, extras = {}) {
    const normalizedCargo = normalizeResourceMap(cargo, resourceDrops, { keepUnknown: true });
    const totalCargo = Object.values(normalizedCargo).reduce((sum, amount) => sum + amount, 0);
    const xpVal = Math.min(MAX_PERSISTED_NUMBER, Math.max(0, Math.floor(Number(xp) || 0)));
    const bankingExtras = normalizeBankingExtras(extras, runId);
    if (bankingExtras.invalidCompanions) return { ok: false, added: false, reason: 'invalid-wildkin-companions', state: getState() };
    if (runId) {
      if (bankedRunIds.has(runId)) return { ok: true, added: false, state: getState() };
      const rollback = snapshotForBankRollback();
      const newCompanions = bankingExtras.companions.filter((record) => !state.ownedWildkin.some((owned) => owned.id === record.id));
      if (newCompanions.some(record => state.ownedWildkin.some(owned => owned.originId === record.originId && owned.id !== record.id))) {
        return { ok: false, added: false, reason: 'wildkin-origin-conflict', state: getState() };
      }
      if (state.campBreeding && newCompanions.some(record => record.id === state.campBreeding.offspring.id || record.originId === state.campBreeding.offspring.originId)) {
        return { ok: false, added: false, reason: 'wildkin-identity-conflict', state: getState() };
      }
      if (state.ownedWildkin.length + newCompanions.length + (state.campBreeding ? 1 : 0) > MAX_OWNED_WILDKIN) return { ok: false, added: false, reason: 'wildkin-owned-capacity', state: getState() };
      const coreWasUnsecured = bankingExtras.coreSecured && !state.completedPoiIds.includes("heartwood_core_secured");
      const coreChestWasUnclaimed = bankingExtras.coreSecured && !state.claimedLootChestIds.includes("chest_heartwood_core");
      const hasExtras = newCompanions.length > 0 || coreWasUnsecured || coreChestWasUnclaimed;
      if (totalCargo === 0 && xpVal === 0 && !hasExtras) {
        bankedRunIds.add(runId);
        if (bankedRunIds.size > 20) { const arr = [...bankedRunIds]; bankedRunIds = new Set(arr.slice(-20)); }
        return commitBank(rollback, { added: false, state: getState() }, null);
      }
      // The pack already owns these items. Extraction records the return and
      // secures XP/bonds; it never creates a second copy in a bank.
      state.inventory.totals.returned = Math.min(Number.MAX_SAFE_INTEGER, state.inventory.totals.returned + totalCargo);
      state.bankedXp += xpVal;
      if (newCompanions.length > 0) {
        state.ownedWildkin.push(...newCompanions.map(cloneWildkinIndividual));
        state.discoveredSpecies = [...new Set([...state.discoveredSpecies, ...newCompanions.map(record => record.speciesId)])];
        if (!state.activeWildkinId) state.activeWildkinId = newCompanions[0].id;
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
      return commitBank(rollback, { added: true, companions: newCompanions, state: getState() }, null);
    }
    // legacy path without runId (for old tests)
    const token = `${JSON.stringify(normalizedCargo)}:${xpVal}:${state.bankedXp}`;
    if (lastBankToken === token) return { ok: true, added: false, state: getState() };
    if (totalCargo === 0 && xpVal === 0) {
      lastBankToken = token;
      return { ok: true, added: false, state: getState() };
    }
    const rollback = snapshotForBankRollback();
    state.inventory.totals.returned = Math.min(Number.MAX_SAFE_INTEGER, state.inventory.totals.returned + totalCargo);
    state.bankedXp += xpVal;
    lastBankToken = `${JSON.stringify(normalizedCargo)}:${xpVal}:${state.bankedXp}`;
    return commitBank(rollback, { added: true, state: getState() }, null);
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
    const exchange = prepareExchange(cost);
    if (!exchange.ok) return { purchased: false, reason: exchange.reason, state: getState() };
    const rollback = snapshotForBankRollback();
    state.inventory = exchange.inventory;
    state.upgrades = { ...state.upgrades, matter_attractor: 1 };
    const write = commitBank(rollback, {});
    if (!write.ok) return { purchased: false, reason: write.reason, state: getState() };
    return { purchased: true, reason: "purchased", state: getState() };
  }

  function purchaseUpgrade(id) {
    const definition = getUpgradeDefinition(id);
    if (!definition) return { purchased: false, reason: "unknown-upgrade", state: getState() };
    const currentLevel = state.upgrades[id] ?? 0;
    const tier = getUpgradeTier(id, currentLevel + 1);
    if (!tier) return { purchased: false, reason: "max-level", state: getState() };
    if (getPlayerLevel(state.bankedXp) < tier.minPlayerLevel) return { purchased: false, reason: "level-locked", state: getState() };
    const exchange = prepareExchange(tier.cost);
    if (!exchange.ok) return { purchased: false, reason: exchange.reason, state: getState() };
    const rollback = snapshotForBankRollback();
    state.inventory = exchange.inventory;
    state.upgrades = { ...state.upgrades, [id]: currentLevel + 1 };
    const write = commitBank(rollback, {});
    if (!write.ok) return { purchased: false, reason: write.reason, state: getState() };
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
    const companions = candidates.filter((id) => !state.ownedWildkin.some(record => record.speciesId === id));
    if (runId) state.securedCompanionRunIds = [...state.securedCompanionRunIds, runId].slice(-20);
    if (companions.length === 0) { if (runId) save(); return { added: false, companions: [], state: getState() }; }
    const records = companions.map((speciesId, index) => legacyWildkinRecord(speciesId, runId ?? 'legacy_secure', index));
    state.ownedWildkin.push(...records);
    state.discoveredSpecies = [...new Set([...state.discoveredSpecies, ...companions])];
    if (!state.activeWildkinId) state.activeWildkinId = records[0].id;
    save();
    return { added: true, companions, state: getState() };
  }

  function selectCompanion(id) {
    const record = id === null ? null : state.ownedWildkin.find(candidate => candidate.speciesId === id);
    return id === null ? setActiveWildkin(null).ok : !!record && setActiveWildkin(record.id).ok;
  }

  function discoverSpecies(id) {
    if (!COMPANION_SPECIES.has(id) || state.discoveredSpecies.includes(id)) return false;
    const rollback = snapshotForBankRollback();
    state.discoveredSpecies.push(id);
    return commitBank(rollback, {}).ok;
  }

  function earnObservationClue(id, stage) {
    if (!Object.hasOwn(OBSERVATION_CATALOG, id) || !Number.isInteger(stage) || stage < 1 || stage > 2) return { ok: false, reason: 'invalid-observation-clue' };
    const previous = state.observationClues[id] ?? 0;
    if (stage <= previous) return { ok: true, added: false };
    if (stage !== previous + 1) return { ok: false, reason: 'observation-stage-order' };
    const rollback = snapshotForBankRollback();
    state.observationClues[id] = stage;
    if (!state.discoveredSpecies.includes(id)) state.discoveredSpecies.push(id);
    return commitBank(rollback, { added: true });
  }

  function completeObjective(id) {
    const objective = getCampaignObjective(id);
    if (!objective) return { completed: false, reason: "unknown-objective", state: getState() };
    if (state.completedObjectives.includes(id)) return { completed: false, reason: "already-completed", state: getState() };
    if (!objective.when(getState())) return { completed: false, reason: "not-eligible", state: getState() };
    const rewards = objective.rewards ?? { resources: {}, xp: 0 };
    const outputs = Object.fromEntries(Object.entries(rewards.resources ?? {}).filter(([id]) => Object.hasOwn(itemCatalog, id)));
    const exchange = prepareExchange({}, outputs, null);
    if (!exchange.ok) return { completed: false, reason: exchange.reason, state: getState() };
    const rollback = snapshotForBankRollback();
    state.inventory = exchange.inventory;
    state.bankedXp += Math.max(0, Math.floor(Number(rewards.xp) || 0));
    state.completedObjectives.push(id);
    if (id === "frontier_finale") state.campaignCompleted = true;
    const write = commitBank(rollback, {});
    return { completed: write.ok, reason: write.reason, rewards, state: getState() };
  }

  function completePoi(id) {
    if (!id || typeof id !== "string" || state.completedPoiIds.includes(id)) return false;
    const rollback = snapshotForBankRollback();
    state.completedPoiIds.push(id);
    return commitBank(rollback, {}).ok;
  }

  function craftConsumable(id) {
    const recipe = CONSUMABLE_CATALOG[id];
    if (!recipe) return { crafted: false, reason: "unknown-consumable", state: getState() };
    const exchange = prepareExchange(recipe.cost, { [id]: 1 });
    if (!exchange.ok) return { crafted: false, reason: exchange.reason, state: getState() };
    const rollback = snapshotForBankRollback();
    state.inventory = exchange.inventory;
    const write = commitBank(rollback, {});
    if (!write.ok) return { crafted: false, reason: write.reason, state: getState() };
    return { crafted: true, state: getState() };
  }

  function consumeConsumable(id, runPatch) {
    if (!CONSUMABLE_CATALOG[id]) return { consumed: false, reason: "unknown-consumable", state: getState() };
    const exchange = prepareExchange({ [id]: 1 }, {}, null);
    if (!exchange.ok) return { consumed: false, reason: 'empty', state: getState() };
    const rollback = snapshotForBankRollback();
    state.inventory = exchange.inventory;
    const write = commitBank(rollback, {}, runPatch);
    if (!write.ok) return { consumed: false, reason: write.reason, state: getState() };
    return { consumed: true, state: getState() };
  }

  function baseEnvironment() { return { reserved: getCampReserved(worldRegistry), surface: worldRegistry?.getSectionById?.('camp')?.surface ?? null }; }
  function getBaseState() { return cloneBase(state.base); }
  function getCampCare() { return cloneCampCare(state.campCare); }
  function getCampCrop() { return cloneCampCrop(state.campCrop); }
  function findGardenPlot(plotId) { return state.base.structures.find(record => record.id === plotId && record.type === 'berry_garden') ?? null; }
  function getCampCropHarvest() {
    if (!state.campCrop) return null;
    const plot = findGardenPlot(state.campCrop.plotId);
    const bed = state.campCare ? findCareBed(state.campCare.bedId) : null;
    const caredMossling = state.campCare?.nourishment === CAMP_CARE_MAX_NOURISHMENT
      ? findCareWildkin(state.campCare.wildkinId) : null;
    const bloomTended = !!(plot && bed && caredMossling
      && Math.hypot(plot.pos.x - bed.pos.x, plot.pos.z - bed.pos.z) <= 6);
    return { yield: bloomTended ? 4 : 3, bloomTended };
  }
  function plantCampCrop(plotId) {
    if (!findGardenPlot(plotId)) return { ok: false, reason: 'unknown-plot', crop: getCampCrop() };
    if (state.campCrop) return { ok: false, reason: 'crop-planted', crop: getCampCrop() };
    const exchange = prepareExchange({ berries: 1 }, {}, null);
    if (!exchange.ok) return { ok: false, reason: 'empty', crop: null };
    const rollback = snapshotForBankRollback();
    state.inventory = exchange.inventory;
    state.campCrop = { version: CAMP_CROP_VERSION, plotId, growthSeconds: 0 };
    const write = commitBank(rollback, { crop: getCampCrop() });
    return write.ok ? write : { ok: false, reason: write.reason, crop: getCampCrop() };
  }
  function advanceCampCrop(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > CAMP_CROP_MAX_ADVANCE_SECONDS) return { ok: false, reason: 'invalid-growth', crop: getCampCrop() };
    if (!state.campCrop) return { ok: false, reason: 'empty-plot', crop: null };
    if (!findGardenPlot(state.campCrop.plotId)) return { ok: false, reason: 'missing-plot', crop: getCampCrop() };
    if (state.campCrop.growthSeconds >= CAMP_CROP_GROWTH_SECONDS) return { ok: true, changed: false, reason: 'ready', crop: getCampCrop(), stageTransition: false, ready: true };
    const previousStage = getCampCropStage(state.campCrop);
    const rollback = snapshotForBankRollback();
    const growthSeconds = Math.min(CAMP_CROP_GROWTH_SECONDS, Math.round((state.campCrop.growthSeconds + seconds) * 1000) / 1000);
    state.campCrop = { ...state.campCrop, growthSeconds };
    const stageTransition = getCampCropStage(state.campCrop) !== previousStage;
    const ready = growthSeconds === CAMP_CROP_GROWTH_SECONDS;
    const write = commitBank(rollback, { changed: true, crop: getCampCrop(), stageTransition, ready });
    return write.ok ? write : { ok: false, reason: write.reason, crop: getCampCrop() };
  }
  function harvestCampCrop(plotId) {
    if (!state.campCrop) return { ok: false, reason: 'empty-plot', crop: null };
    if (state.campCrop.plotId !== plotId) return { ok: false, reason: 'wrong-plot', crop: getCampCrop() };
    if (!findGardenPlot(plotId)) return { ok: false, reason: 'missing-plot', crop: getCampCrop() };
    if (state.campCrop.growthSeconds < CAMP_CROP_GROWTH_SECONDS) return { ok: false, reason: 'growing', crop: getCampCrop() };
    const harvest = getCampCropHarvest();
    const exchange = prepareExchange({}, { berries: harvest.yield }, null);
    if (!exchange.ok) return { ok: false, reason: exchange.reason, crop: getCampCrop() };
    const rollback = snapshotForBankRollback();
    state.inventory = exchange.inventory;
    state.campCrop = null;
    const write = commitBank(rollback, { crop: null, ...harvest });
    return write.ok ? write : { ok: false, reason: write.reason, crop: getCampCrop() };
  }
  function findCareBed(bedId) { return state.base.structures.find(record => record.id === bedId && record.type === 'bed') ?? null; }
  function findCareWildkin(wildkinId) { return state.ownedWildkin.find(record => record.id === wildkinId && record.speciesId === 'mossling') ?? null; }
  function getCampBreeding() { return cloneCampBreeding(state.campBreeding); }
  function pendingOwnedReservationCount() {
    return (state.activeRun?.companions ?? []).filter(record => !state.ownedWildkin.some(owned => owned.id === record.id)).length;
  }
  function failedBreedingEligibility(reason, bedId) {
    return { ok: false, reason, bedId, parentIds: null, offspring: null, breeding: getCampBreeding() };
  }
  function getCampBreedingEligibility(bedId, options = {}) {
    const preserveTrait = options?.preserveTrait ?? null;
    if (preserveTrait !== null && preserveTrait !== 'baseColor') return failedBreedingEligibility('invalid-preserve-trait', bedId);
    if (preserveTrait === 'baseColor' && state.observationClues.mossling !== 2) return failedBreedingEligibility('mossling-study-required', bedId);
    const bed = findCareBed(bedId);
    if (!bed) return failedBreedingEligibility('unknown-bed', bedId);
    if (state.campBreeding) return failedBreedingEligibility('breeding-active', bedId);
    if (!state.campCare || state.campCare.bedId !== bedId) return failedBreedingEligibility('unassigned', bedId);
    if (state.campCare.nourishment < CAMP_CARE_MAX_NOURISHMENT) return failedBreedingEligibility('not-nourished', bedId);
    const settled = findCareWildkin(state.campCare.wildkinId);
    const selected = state.ownedWildkin.find(record => record.id === state.activeWildkinId) ?? null;
    if (!settled) return failedBreedingEligibility('missing-settled-parent', bedId);
    if (!selected || selected.speciesId !== 'mossling') return failedBreedingEligibility('select-mossling', bedId);
    if (selected.id === settled.id) return failedBreedingEligibility('select-distinct-parent', bedId);
    if (selected.sex === settled.sex) return failedBreedingEligibility('same-sex', bedId);
    if (state.nextCampBreedingSequence > MAX_CAMP_BREEDING_SEQUENCE) return failedBreedingEligibility('breeding-sequence-capacity', bedId);
    if (state.ownedWildkin.length + pendingOwnedReservationCount() + 1 > MAX_OWNED_WILDKIN) return failedBreedingEligibility('wildkin-owned-capacity', bedId);
    const offspring = createCampOffspring(settled, selected, state.nextCampBreedingSequence, preserveTrait);
    if (!offspring) return failedBreedingEligibility('invalid-parents', bedId);
    const conflicts = [...state.ownedWildkin, ...(state.activeRun?.companions ?? [])]
      .some(record => record.id === offspring.id || record.originId === offspring.originId);
    if (conflicts) return failedBreedingEligibility('wildkin-identity-conflict', bedId);
    return { ok: true, reason: null, bedId, parentIds: [settled.id, selected.id], guidedTrait: preserveTrait, offspring, breeding: null };
  }
  function beginCampBreeding(bedId, options = {}) {
    const eligible = getCampBreedingEligibility(bedId, options);
    if (!eligible.ok) return eligible;
    const rollback = snapshotForBankRollback();
    state.campCare = null;
    state.campBreeding = {
      version: CAMP_BREEDING_VERSION,
      bedId,
      parentIds: [...eligible.parentIds],
      guidedTrait: eligible.guidedTrait,
      offspring: cloneWildkinIndividual(eligible.offspring),
      growthSeconds: 0,
    };
    state.nextCampBreedingSequence += 1;
    const write = commitBank(rollback, { breeding: getCampBreeding(), offspring: cloneWildkinIndividual(eligible.offspring), care: null });
    return write.ok ? write : { ok: false, reason: write.reason, breeding: getCampBreeding(), care: getCampCare() };
  }
  function advanceCampBreeding(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > CAMP_BREEDING_MAX_ADVANCE_SECONDS) {
      return { ok: false, reason: 'invalid-growth', breeding: getCampBreeding() };
    }
    if (!state.campBreeding) return { ok: false, reason: 'no-young', breeding: null };
    if (!findCareBed(state.campBreeding.bedId)) return { ok: false, reason: 'missing-bed', breeding: getCampBreeding() };
    if (state.campBreeding.growthSeconds >= CAMP_BREEDING_GROWTH_SECONDS) {
      return { ok: true, changed: false, reason: 'ready', breeding: getCampBreeding(), stageTransition: false, ready: true };
    }
    const previousStage = getCampBreedingStage(state.campBreeding);
    const rollback = snapshotForBankRollback();
    const growthSeconds = Math.min(CAMP_BREEDING_GROWTH_SECONDS, Math.round((state.campBreeding.growthSeconds + seconds) * 1000) / 1000);
    state.campBreeding = { ...state.campBreeding, growthSeconds };
    const stageTransition = getCampBreedingStage(state.campBreeding) !== previousStage;
    const ready = growthSeconds === CAMP_BREEDING_GROWTH_SECONDS;
    const write = commitBank(rollback, { changed: true, breeding: getCampBreeding(), stageTransition, ready });
    return write.ok ? write : { ok: false, reason: write.reason, breeding: getCampBreeding() };
  }
  function welcomeCampYoung(bedId) {
    if (!state.campBreeding) return { ok: false, reason: 'no-young', breeding: null };
    if (state.campBreeding.bedId !== bedId) return { ok: false, reason: 'wrong-bed', breeding: getCampBreeding() };
    if (!findCareBed(bedId)) return { ok: false, reason: 'missing-bed', breeding: getCampBreeding() };
    if (state.campBreeding.growthSeconds < CAMP_BREEDING_GROWTH_SECONDS) return { ok: false, reason: 'growing', breeding: getCampBreeding() };
    const record = cloneWildkinIndividual(state.campBreeding.offspring);
    if (state.ownedWildkin.length >= MAX_OWNED_WILDKIN) return { ok: false, reason: 'wildkin-owned-capacity', breeding: getCampBreeding() };
    if (state.ownedWildkin.some(owned => owned.id === record.id || owned.originId === record.originId)) return { ok: false, reason: 'wildkin-identity-conflict', breeding: getCampBreeding() };
    const rollback = snapshotForBankRollback();
    state.ownedWildkin.push(record);
    state.campBreeding = null;
    state.campCare = { version: CAMP_CARE_VERSION, bedId, wildkinId: record.id, nourishment: 0 };
    const write = commitBank(rollback, { record: cloneWildkinIndividual(record), breeding: null, care: getCampCare() });
    return write.ok ? write : { ok: false, reason: write.reason, breeding: getCampBreeding(), care: getCampCare() };
  }
  function assignCampWildkin(wildkinId, bedId) {
    if (!findCareBed(bedId)) return { ok: false, reason: 'unknown-bed', care: getCampCare() };
    if (!findCareWildkin(wildkinId)) return { ok: false, reason: 'unknown-wildkin', care: getCampCare() };
    if (state.campBreeding) return { ok: false, reason: 'bed-occupied', care: getCampCare() };
    if (state.campCare) return { ok: false, reason: state.campCare.bedId === bedId && state.campCare.wildkinId === wildkinId ? 'already-assigned' : 'release-required', care: getCampCare() };
    const rollback = snapshotForBankRollback();
    state.campCare = { version: CAMP_CARE_VERSION, bedId, wildkinId, nourishment: 0 };
    const write = commitBank(rollback, { care: getCampCare() });
    return write.ok ? write : { ok: false, reason: write.reason, care: getCampCare() };
  }
  function releaseCampWildkin(bedId) {
    if (!state.campCare) return { ok: false, reason: 'unassigned', care: null };
    if (state.campCare.bedId !== bedId) return { ok: false, reason: 'wrong-bed', care: getCampCare() };
    const rollback = snapshotForBankRollback();
    state.campCare = null;
    const write = commitBank(rollback, { care: null });
    return write.ok ? write : { ok: false, reason: write.reason, care: getCampCare() };
  }
  function feedCampWildkin(bedId) {
    if (!state.campCare) return { ok: false, reason: 'unassigned', care: null };
    if (state.campCare.bedId !== bedId) return { ok: false, reason: 'wrong-bed', care: getCampCare() };
    if (!findCareBed(bedId)) return { ok: false, reason: 'missing-bed', care: getCampCare() };
    if (!findCareWildkin(state.campCare.wildkinId)) return { ok: false, reason: 'missing-wildkin', care: getCampCare() };
    if (state.campCare.nourishment >= CAMP_CARE_MAX_NOURISHMENT) return { ok: false, reason: 'nourished', care: getCampCare() };
    const exchange = prepareExchange({ berries: 1 }, {}, null);
    if (!exchange.ok) return { ok: false, reason: 'empty', care: getCampCare() };
    const rollback = snapshotForBankRollback();
    state.inventory = exchange.inventory;
    state.campCare = { ...state.campCare, nourishment: state.campCare.nourishment + 1 };
    const write = commitBank(rollback, { care: getCampCare() });
    return write.ok ? write : { ok: false, reason: write.reason, care: getCampCare() };
  }
  function getFieldSupplies() { return getPackEquipment(state.inventory, itemCatalog).fieldSupplies; }
  function getLoadout() { return cloneLoadout(state.loadout); }
  function assignQuickSlot(slot, itemId) {
    if(!Number.isInteger(slot)||slot<0||slot>=QUICK_SLOT_COUNT)return {ok:false,reason:'invalid-slot'};
    if(itemId!==null&&(!EQUIPMENT_BY_ID[itemId]||getEquipmentCount(itemId,getState())<=0))return {ok:false,reason:'item-unavailable'};
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
  function craftFieldSupply(id) {
    const recipe=FIELD_RECIPE_BY_ID[id];
    if(!recipe)return {crafted:false,reason:'unknown-recipe'};
    if(recipe.station&&!state.base.structures.some(p=>p.type===recipe.station))return {crafted:false,reason:'station-required',station:recipe.station};
    const exchange=prepareExchange(recipe.cost,{[id]:1});if(!exchange.ok)return {crafted:false,reason:exchange.reason};
    const rollback=snapshotForBankRollback();state.inventory=exchange.inventory;
    const write=commitBank(rollback,{});return {crafted:write.ok,reason:write.reason,state:getState()};
  }
  function fitFieldPack() {
    if (state.inventory.packTier >= 1) return { fitted: false, reason: 'already-fitted', state: getState() };
    if (!state.base.structures.some(piece => piece.type === 'workbench')) return { fitted: false, reason: 'station-required', state: getState() };
    const exchange = prepareExchange(FIELD_PACK_FIT_COST);
    if (!exchange.ok) return { fitted: false, reason: exchange.reason, state: getState() };
    const rollback = snapshotForBankRollback();
    exchange.inventory.pack.push(...Array(INVENTORY_CONFIG.packSlots[1] - exchange.inventory.pack.length).fill(null));
    exchange.inventory.packTier = 1;
    state.inventory = exchange.inventory;
    const write = commitBank(rollback, {});
    return { fitted: write.ok, reason: write.ok ? 'fitted' : write.reason, state: getState() };
  }
  function consumeFieldSupply(id, runPatch) {
    if(!FIELD_RECIPE_BY_ID[id])return {consumed:false,reason:'unknown-recipe'};
    const exchange=prepareExchange({[id]:1},{},null);if(!exchange.ok)return {consumed:false,reason:'empty'};
    const rollback=snapshotForBankRollback();state.inventory=exchange.inventory;
    const write=commitBank(rollback,{},runPatch);return {consumed:write.ok,reason:write.reason,state:getState()};
  }
  function placeStructure(record,{playerPosition=null}={}) {
    if(typeof record?.id!=='string'||!/^build_[a-zA-Z0-9_-]{1,80}$/.test(record.id))return {placed:false,reason:'invalid-id'};
    if(state.base.structures.some(p=>p.id===record.id))return {placed:false,reason:'already-placed'};
    const result=validatePlacement(record,{...baseEnvironment(),...state.base,playerPosition});
    if(!result.ok)return {placed:false,reason:result.reason};
    const piece=BASE_PIECE_BY_ID[record.type];
    const exchange=prepareExchange(piece.cost);if(!exchange.ok)return {placed:false,reason:exchange.reason};
    const rollback=snapshotForBankRollback();state.inventory=exchange.inventory;
    state.base.structures.push({id:record.id,type:record.type,pos:result.pos,yaw:((record.yaw%(Math.PI*2))+Math.PI*2)%(Math.PI*2),supportId:result.supportId});
    if(piece.storageType)state.inventory.containers.push({id:record.id,type:piece.storageType,label:piece.name,slots:Array(INVENTORY_CONFIG.crateSlots).fill(null)});
    const write=commitBank(rollback,{});return {placed:write.ok,reason:write.reason,state:getState()};
  }
  function removeStructure(id) {
    const piece=state.base.structures.find(p=>p.id===id);if(!piece)return {removed:false,reason:'unknown-structure'};
    if(state.campCare?.bedId===id)return {removed:false,reason:'bed-occupied'};
    if(state.campBreeding?.bedId===id)return {removed:false,reason:'bed-occupied'};
    if(state.campCrop?.plotId===id)return {removed:false,reason:'crop-planted'};
    if(state.base.structures.some(p=>p.supportId===id))return {removed:false,reason:'remove-supported-first'};
    const container=state.inventory.containers.find(c=>c.id===id);
    if(container?.slots.some(Boolean))return {removed:false,reason:'storage-not-empty'};
    const exchange=prepareExchange({},BASE_PIECE_BY_ID[piece.type].cost,null);if(!exchange.ok)return {removed:false,reason:exchange.reason};
    const rollback=snapshotForBankRollback();state.inventory=exchange.inventory;state.inventory.containers=state.inventory.containers.filter(c=>c.id!==id);state.base.structures=state.base.structures.filter(p=>p.id!==id);
    const write=commitBank(rollback,{});return {removed:write.ok,reason:write.reason,state:getState()};
  }
  function expandBase() {
    if(state.base.layout.yardExpanded)return {expanded:false,reason:'already-expanded'};
    if(CAMP_DEBRIS_IDS.some(id=>!state.base.layout.clearedDebrisIds.includes(id)))return {expanded:false,reason:'debris-remaining'};
    const exchange=prepareExchange(CAMP_YARD_COST);if(!exchange.ok)return {expanded:false,reason:exchange.reason};
    const rollback=snapshotForBankRollback();state.inventory=exchange.inventory;state.base.layout.yardExpanded=true;
    const write=commitBank(rollback,{});return {expanded:write.ok,reason:write.reason,state:getState()};
  }
  function clearCampDebris(id) {
    if(!CAMP_DEBRIS_IDS.includes(id))return {cleared:false,reason:'unknown-debris'};
    if(state.base.layout.clearedDebrisIds.includes(id))return {cleared:false,reason:'already-cleared'};
    const rollback=snapshotForBankRollback();state.base.layout.clearedDebrisIds.push(id);
    const write=commitBank(rollback,{});return {cleared:write.ok,reason:write.reason,state:getState()};
  }

  // For idempotent run resolution helper: generic resolve token
  function tryResolve(token) {
    if (lastBankToken === token) return false;
    lastBankToken = token;
    return true;
  }

  function getBankedResources() { return getSpendableResources(); }
  function getBankedXp() { return state.bankedXp; }
  function getUnlockedWaypoints() { return [...state.unlockedMajorWaypointIds]; }
  function getDiscoveredBeacons() { return [...state.discoveredBeaconIds]; }
  function getHasDeparted() { return !!state.hasDepartedOnce; }
  function hasMatterAttractorI() { return (state.upgrades.matter_attractor ?? 0) >= 1; }

  function isPortalGateRepaired(id) { return state.repairedPortalGateIds.includes(id); }
  function repairPortalGate(id, cost = {}) {
    if (!id || typeof id !== "string" || isPortalGateRepaired(id)) return false;
    if (worldRegistry?.getPortalGateById && !worldRegistry.getPortalGateById(id)) return false;
    const exchange = prepareExchange(cost, {}, null);
    if (!exchange.ok) return false;
    const rollback = snapshotForBankRollback();
    state.inventory = exchange.inventory;
    state.repairedPortalGateIds.push(id);
    return commitBank(rollback, {}).ok;
  }

  function getLootChestAvailability(id, refillSeconds, now = Date.now()) {
    if (Object.hasOwn(state.lootRemainders, id)) return { available: true, readyAt: null, partial: true };
    if (id === 'chest_heartwood_core' && state.claimedLootChestIds.includes(id) && !state.completedPoiIds.includes('heartwood_core_secured')) return { available: true, readyAt: null, missionOnly: true };
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
    const rollback = snapshotForBankRollback();
    if (refillSeconds === undefined || refillSeconds === null) {
      if (!state.claimedLootChestIds.includes(id)) state.claimedLootChestIds.push(id);
      const write = commitBank(rollback, {});
      return { claimed: write.ok, reason: write.reason, readyAt: null };
    }
    const readyAt = now + refillSeconds * 1000;
    state.lootChestReadyAt[id] = readyAt;
    const write = commitBank(rollback, {});
    return { claimed: write.ok, reason: write.reason, readyAt: write.ok ? readyAt : availability.readyAt };
  }

  // Claim and quantity share one save. An opened full cache remains available;
  // a partial cache keeps only its own finite remainder and never repeats XP.
  function claimLootRewards(id, refillSeconds, rewards, now = Date.now()) {
    if (!id || typeof id !== 'string' || (worldRegistry?.getLootChestById && !worldRegistry.getLootChestById(id))) return { ok: false, reason: 'stale' };
    const availability = getLootChestAvailability(id, refillSeconds, now);
    if (!availability.available) return { ok: false, reason: 'unavailable' };
    const previous = state.lootRemainders[id];
    const source = availability.missionOnly ? {} : previous?.resources ?? rewards?.resources ?? {};
    const inventory = cloneInventory(state.inventory), added = {}, remaining = {};
    for (const [item, count] of Object.entries(source)) {
      if (!Object.hasOwn(itemCatalog, item) || !Number.isSafeInteger(count) || count < 0) return { ok: false, reason: 'invalid-loot' };
      if (!count) continue;
      const result = addStack(inventory.pack, item, count, itemCatalog);
      inventory.pack = result.slots;
      if (result.added) Object.defineProperty(added, item, { value: result.added, enumerable: true });
      if (result.remaining) Object.defineProperty(remaining, item, { value: result.remaining, enumerable: true });
    }
    const total = Object.values(added).reduce((sum, amount) => sum + amount, 0);
    const partial = Object.keys(remaining).length > 0;
    if (!total && partial) return { ok: false, reason: 'full' };
    const xp = previous?.xpCollected || availability.missionOnly ? 0 : Math.max(0, Math.floor(rewards?.xp ?? 0));
    const rollback = snapshotForBankRollback();
    inventory.totals.gathered = Math.min(Number.MAX_SAFE_INTEGER, inventory.totals.gathered + total);
    state.inventory = inventory;
    if (partial) state.lootRemainders[id] = { resources: remaining, xpCollected: true };
    else {
      delete state.lootRemainders[id];
      if (refillSeconds == null) {
        if (!state.claimedLootChestIds.includes(id)) state.claimedLootChestIds.push(id);
      } else state.lootChestReadyAt[id] = now + refillSeconds * 1000;
    }
    const current=runSnapshotProvider?.() ?? state.activeRun;
    const runPatch=current ? {xp:current.xp+xp,...(id==='chest_heartwood_core'&&!partial?{corePending:true}:{})} : undefined;
    const write = commitBank(rollback, {}, runPatch);
    return write.ok ? { ok: true, rewards: { resources: added, xp }, partial, remaining, readyAt: state.lootChestReadyAt[id] ?? null } : { ok: false, reason: write.reason };
  }

  // For testing / fresh-save helper
  function isFreshSave() {
    return !state.hasDepartedOnce && state.bankedXp === 0 && state.inventory.totals.gathered === 0;
  }

  return {
    inventory: inventoryActions, getItemCatalog: () => itemCatalog,
    checkpointRun, endRunWithoutRewards, getActiveRun:()=>cloneActiveRun(state.activeRun),setRunSnapshotProvider:provider=>{runSnapshotProvider=provider;},
    getOwnedWildkin, getActiveWildkin, setActiveWildkin, isWildkinSourceCaptured, commitWildkinCapture,
    getInventoryState, getPackResourceCounts, getSpendableResources, getSpendableItemCounts, collectResources, spendResources, setInventoryAccess,
    load,
    save,
    getStorageStatus,
    getFrontierEcologyState,
    getFrontierResourceRemaining,
    commitFrontierResourceState,
    getFrontierAtlasState,
    revealFrontierAt,
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
    earnObservationClue,
    completeObjective,
    completePoi,
    isPoiCompleted: id => state.completedPoiIds.includes(id),
    craftConsumable,
    consumeConsumable,
    getBaseState, getCampCare, assignCampWildkin, releaseCampWildkin, feedCampWildkin, getCampBreeding, getCampBreedingEligibility, beginCampBreeding, advanceCampBreeding, welcomeCampYoung, getCampCrop, getCampCropHarvest, plantCampCrop, advanceCampCrop, harvestCampCrop, getFieldSupplies, craftFieldSupply, fitFieldPack, consumeFieldSupply, placeStructure, removeStructure, expandBase, clearCampDebris,
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
    claimLootRewards,
    isFreshSave,
    getStorageKey: () => storageKey,
    _defaultState: () => defaultState(initialWaypointId, resourceDrops),
  };
}
