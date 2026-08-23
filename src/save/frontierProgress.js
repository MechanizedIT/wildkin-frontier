// src/save/frontierProgress.js — persistent bank + discovered frontier anchors (Phase 4A)
// Owns only: bankedResources, bankedXp, unlockedMajorWaypointIds, discoveredBeaconIds, hasDepartedOnce
// LocalStorage only, versioned, filters stale world IDs, idempotent banking API.

const STORAGE_KEY = "wildkin.frontierProgress";
const AUTHOR_STORAGE_KEY = "wildkin.authorFrontierProgress";
const VERSION = 1;

function cloneRes(r) { return { wood: r.wood|0, stone: r.stone|0, fiber: r.fiber|0 }; }

function defaultState(initialWaypointId) {
  return {
    version: VERSION,
    bankedResources: { wood: 0, stone: 0, fiber: 0 },
    bankedXp: 0,
    unlockedMajorWaypointIds: initialWaypointId ? [initialWaypointId] : [],
    discoveredBeaconIds: [],
    hasDepartedOnce: false,
  };
}

export function createFrontierProgress(opts = {}) {
  const worldRegistry = opts.worldRegistry ?? null;
  const isAuthorMode = !!opts.isAuthorMode;
  const initialWaypointId = opts.initialWaypointId ?? worldRegistry?.getInitialMajorWaypointId?.() ?? worldRegistry?.getAllWaypoints?.()[0]?.id ?? null;
  const storageKey = isAuthorMode ? AUTHOR_STORAGE_KEY : STORAGE_KEY;
  // In author mode we keep state in memory only if opts.inMemory is true? Per spec either isolated key or in-memory.
  // We use isolated key but also expose that it does not corrupt normal key.
  // If opts.inMemoryAuthor then never touch storage.
  const useMemoryOnly = isAuthorMode && !!opts.inMemoryAuthor;

  let state = defaultState(initialWaypointId);
  let lastBankToken = null; // for idempotence: remember last bank hash to prevent double credit if called twice with same snapshot

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
    if (!raw || typeof raw !== "object") return defaultState(initialWaypointId);
    const out = defaultState(initialWaypointId);
    out.version = raw.version === VERSION ? VERSION : VERSION;
    if (raw.bankedResources && typeof raw.bankedResources === "object") {
      out.bankedResources.wood = raw.bankedResources.wood | 0;
      out.bankedResources.stone = raw.bankedResources.stone | 0;
      out.bankedResources.fiber = raw.bankedResources.fiber | 0;
    }
    if (typeof raw.bankedXp === "number" && Number.isFinite(raw.bankedXp)) out.bankedXp = raw.bankedXp | 0;
    if (Array.isArray(raw.unlockedMajorWaypointIds)) out.unlockedMajorWaypointIds = raw.unlockedMajorWaypointIds.filter(x => typeof x === "string");
    else out.unlockedMajorWaypointIds = initialWaypointId ? [initialWaypointId] : [];
    if (Array.isArray(raw.discoveredBeaconIds)) out.discoveredBeaconIds = raw.discoveredBeaconIds.filter(x => typeof x === "string");
    out.hasDepartedOnce = !!raw.hasDepartedOnce;
    if (out.bankedResources.wood < 0) out.bankedResources.wood = 0;
    if (out.bankedResources.stone < 0) out.bankedResources.stone = 0;
    if (out.bankedResources.fiber < 0) out.bankedResources.fiber = 0;
    if (out.bankedXp < 0) out.bankedXp = 0;
    // ensure initial waypoint present for fresh logic? Only if no departed? But spec says fresh save exposes only initial waypoint as start. So keep initial if not already present and valid? But don't mutate valid older saves that had correct set.
    // Ensure at least initial waypoint if list empty and initial valid
    if (out.unlockedMajorWaypointIds.length === 0 && initialWaypointId) out.unlockedMajorWaypointIds = [initialWaypointId];
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
        state = defaultState(initialWaypointId);
      }
    } catch {
      state = defaultState(initialWaypointId);
    }
    filterStale();
    // persist normalized if we filtered
    save();
    return getState();
  }

  function save() {
    if (useMemoryOnly) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {}
  }

  function clear() {
    state = defaultState(initialWaypointId);
    lastBankToken = null;
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

  function bankRun(cargo, xp) {
    const wood = cargo?.wood | 0;
    const stone = cargo?.stone | 0;
    const fiber = cargo?.fiber | 0;
    const xpVal = xp | 0;
    // idempotence token: if same cargo+xp called twice in a row without state change, ignore second
    const token = `${wood}:${stone}:${fiber}:${xpVal}:${state.bankedResources.wood}:${state.bankedResources.stone}:${state.bankedResources.fiber}:${state.bankedXp}`;
    if (lastBankToken === token) return { added: false, state: getState() };
    // do not bank if all zero
    if (wood === 0 && stone === 0 && fiber === 0 && xpVal === 0) {
      lastBankToken = token;
      return { added: false, state: getState() };
    }
    state.bankedResources.wood += wood;
    state.bankedResources.stone += stone;
    state.bankedResources.fiber += fiber;
    state.bankedXp += xpVal;
    lastBankToken = `${wood}:${stone}:${fiber}:${xpVal}:${state.bankedResources.wood}:${state.bankedResources.stone}:${state.bankedResources.fiber}:${state.bankedXp}`;
    save();
    return { added: true, state: getState() };
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

  // For testing / fresh-save helper
  function isFreshSave() {
    return !state.hasDepartedOnce && state.bankedXp === 0 && state.bankedResources.wood===0 && state.bankedResources.stone===0 && state.bankedResources.fiber===0;
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
    tryResolve,
    getBankedResources,
    getBankedXp,
    getUnlockedWaypoints,
    getDiscoveredBeacons,
    getHasDeparted,
    isFreshSave,
    getStorageKey: () => storageKey,
    _defaultState: () => defaultState(initialWaypointId),
  };
}
