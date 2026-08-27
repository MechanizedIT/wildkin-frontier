// src/save/frontierProgress.js — persistent bank + discovered frontier anchors (Phase 4A)
// Owns only: bankedResources, bankedXp, unlockedMajorWaypointIds, discoveredBeaconIds, hasDepartedOnce
// LocalStorage only, versioned, filters stale world IDs, idempotent banking API.

import { makeEmptyResourceMap, normalizeResourceMap } from "../resources/resourceDropCatalog.js";

const STORAGE_KEY = "wildkin.frontierProgress";
const AUTHOR_STORAGE_KEY = "wildkin.authorFrontierProgress";
const VERSION = 1;

function cloneRes(r) { return { ...r }; }

function defaultState(initialWaypointId, resourceDrops) {
  return {
    version: VERSION,
    bankedResources: makeEmptyResourceMap(resourceDrops),
    bankedXp: 0,
    unlockedMajorWaypointIds: initialWaypointId ? [initialWaypointId] : [],
    discoveredBeaconIds: [],
    hasDepartedOnce: false,
    matterAttractorI: false,
  };
}

export function createFrontierProgress(opts = {}) {
  const worldRegistry = opts.worldRegistry ?? null;
  const isAuthorMode = !!opts.isAuthorMode;
  const resourceDrops = opts.resourceDrops;
  const initialWaypointId = opts.initialWaypointId ?? worldRegistry?.getInitialMajorWaypointId?.() ?? worldRegistry?.getAllWaypoints?.()[0]?.id ?? null;
  const storageKey = isAuthorMode ? AUTHOR_STORAGE_KEY : STORAGE_KEY;
  // In author mode we keep state in memory only if opts.inMemory is true? Per spec either isolated key or in-memory.
  // We use isolated key but also expose that it does not corrupt normal key.
  // If opts.inMemoryAuthor then never touch storage.
  const useMemoryOnly = isAuthorMode && !!opts.inMemoryAuthor;

  let state = defaultState(initialWaypointId, resourceDrops);
  let lastBankToken = null; // legacy fallback
  let bankedRunIds = new Set();
  // persist bankedRunIds via state? Keep in memory bounded; versioned save includes lastBankedRunIds
  // Load from storage if present
  const BANKED_IDS_KEY = storageKey + ":bankedRunIds";

  function filterStale() {
    if (!worldRegistry) return;
    const allWpIds = new Set(worldRegistry.getAllWaypoints().map(w => w.id));
    const allBeaconIds = new Set(worldRegistry.getAllBeacons().map(b => b.id));
    state.unlockedMajorWaypointIds = state.unlockedMajorWaypointIds.filter(id => allWpIds.has(id));
    // ensure initial waypoint always present
    if (initialWaypointId && !state.unlockedMajorWaypointIds.includes(initialWaypointId)) {
      // keep initial even if filtered? Already filtered, but if world changed, initial may be new set
      // If stale, keep whatever remains; do not auto-readd stale-removed? Actually if initialWaypointId is valid and not in list, ensure it's there for fresh/correct behavior
      // Only add if allWpIds has it and not present
      if (allWpIds.has(initialWaypointId)) state.unlockedMajorWaypointIds.unshift(initialWaypointId);
    }
    state.discoveredBeaconIds = state.discoveredBeaconIds.filter(id => allBeaconIds.has(id));
    // dedup
    state.unlockedMajorWaypointIds = [...new Set(state.unlockedMajorWaypointIds)];
    state.discoveredBeaconIds = [...new Set(state.discoveredBeaconIds)];
  }

  function normalizeLoaded(raw) {
    if (!raw || typeof raw !== "object") return defaultState(initialWaypointId, resourceDrops);
    const out = defaultState(initialWaypointId, resourceDrops);
    out.version = raw.version === VERSION ? VERSION : VERSION;
    if (raw.bankedResources && typeof raw.bankedResources === "object") {
      out.bankedResources = normalizeResourceMap(raw.bankedResources, resourceDrops);
    }
    if (typeof raw.bankedXp === "number" && Number.isFinite(raw.bankedXp)) out.bankedXp = raw.bankedXp | 0;
    if (Array.isArray(raw.unlockedMajorWaypointIds)) out.unlockedMajorWaypointIds = raw.unlockedMajorWaypointIds.filter(x => typeof x === "string");
    else out.unlockedMajorWaypointIds = initialWaypointId ? [initialWaypointId] : [];
    if (Array.isArray(raw.discoveredBeaconIds)) out.discoveredBeaconIds = raw.discoveredBeaconIds.filter(x => typeof x === "string");
    out.hasDepartedOnce = !!raw.hasDepartedOnce;
    out.matterAttractorI = !!raw.matterAttractorI;
    if (out.bankedXp < 0) out.bankedXp = 0;
    if (out.unlockedMajorWaypointIds.length === 0 && initialWaypointId) out.unlockedMajorWaypointIds = [initialWaypointId];
    if (Array.isArray(raw.bankedRunIds)) {
      // restore bounded set
      bankedRunIds = new Set(raw.bankedRunIds.filter(x=> typeof x==="string").slice(-20));
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

  function save() {
    if (useMemoryOnly) return;
    try {
      const toSave = { ...state, bankedRunIds: [...bankedRunIds].slice(-20) };
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch {}
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
      bankedResources: { ...state.bankedResources },
      bankedXp: state.bankedXp,
      unlockedMajorWaypointIds: [...state.unlockedMajorWaypointIds],
      discoveredBeaconIds: [...state.discoveredBeaconIds],
      hasDepartedOnce: !!state.hasDepartedOnce,
      matterAttractorI: !!state.matterAttractorI,
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

  function bankRun(cargo, xp, runId = null) {
    const normalizedCargo = normalizeResourceMap(cargo, resourceDrops, { keepUnknown: true });
    const totalCargo = Object.values(normalizedCargo).reduce((sum, amount) => sum + amount, 0);
    const xpVal = xp | 0;
    if (runId) {
      if (bankedRunIds.has(runId)) return { added: false, state: getState() };
      if (totalCargo === 0 && xpVal === 0) {
        bankedRunIds.add(runId);
        if (bankedRunIds.size > 20) { const arr = [...bankedRunIds]; bankedRunIds = new Set(arr.slice(-20)); }
        save();
        return { added: false, state: getState() };
      }
      for (const [id, amount] of Object.entries(normalizedCargo)) state.bankedResources[id] = (state.bankedResources[id] ?? 0) + amount;
      state.bankedXp += xpVal;
      bankedRunIds.add(runId);
      if (bankedRunIds.size > 20) { const arr = [...bankedRunIds]; bankedRunIds = new Set(arr.slice(-20)); }
      // also update legacy token to avoid double
      lastBankToken = `${runId}:${JSON.stringify(normalizedCargo)}:${xpVal}`;
      save();
      return { added: true, state: getState() };
    }
    // legacy path without runId (for old tests)
    const token = `${JSON.stringify(normalizedCargo)}:${xpVal}:${JSON.stringify(state.bankedResources)}:${state.bankedXp}`;
    if (lastBankToken === token) return { added: false, state: getState() };
    if (totalCargo === 0 && xpVal === 0) {
      lastBankToken = token;
      return { added: false, state: getState() };
    }
    for (const [id, amount] of Object.entries(normalizedCargo)) state.bankedResources[id] = (state.bankedResources[id] ?? 0) + amount;
    state.bankedXp += xpVal;
    lastBankToken = `${JSON.stringify(normalizedCargo)}:${xpVal}:${JSON.stringify(state.bankedResources)}:${state.bankedXp}`;
    save();
    return { added: true, state: getState() };
  }

  function purchaseMatterAttractorI(cost) {
    if (state.matterAttractorI) return { purchased: false, reason: "owned", state: getState() };
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
    state.matterAttractorI = true;
    save();
    return { purchased: true, reason: "purchased", state: getState() };
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
  function hasMatterAttractorI() { return !!state.matterAttractorI; }

  // For testing / fresh-save helper
  function isFreshSave() {
    return !state.hasDepartedOnce && state.bankedXp === 0 && Object.values(state.bankedResources).every((amount) => amount === 0);
  }

  return {
    load,
    save,
    clear,
    getState,
    isUnlockedWaypoint,
    isDiscoveredBeacon,
    unlockWaypoint,
    discoverBeacon,
    markDeparted,
    bankRun,
    purchaseMatterAttractorI,
    tryResolve,
    getBankedResources,
    getBankedXp,
    getUnlockedWaypoints,
    getDiscoveredBeacons,
    getHasDeparted,
    hasMatterAttractorI,
    isFreshSave,
    getStorageKey: () => storageKey,
    _defaultState: () => defaultState(initialWaypointId, resourceDrops),
  };
}
