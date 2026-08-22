// src/world/regionManager.js — lightweight active-region owner (Phase 3.5A)
// Determines current region from player position, computes active set (current + immediate neighbors),
// emits changes only when set changes, exposes active IDs for debug/tests,
// preserves neighbor buffer, avoids per-frame allocation/churn.

export function createRegionManager(worldRegistry, opts = {}) {
  const onChange = opts.onChange ?? null;
  let currentRegionId = null;
  let currentPocketId = null;
  let activeSet = new Set();
  let activeArray = []; // cached sorted array for debug/tests
  let dirty = true;
  let emitted = false;

  // For churn avoidance: reuse sets where possible, only allocate new when changed
  function computeActiveForCurrent(regionId) {
    const next = worldRegistry.getActiveSetForRegion(regionId);
    return next;
  }

  function setsEqual(a, b) {
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }

  function update(playerPos) {
    const nextRegion = worldRegistry.getRegionForPosition(playerPos);
    const nextPocket = worldRegistry.getPocketForPosition(playerPos, nextRegion);
    const regionChanged = nextRegion !== currentRegionId;
    const pocketChanged = nextPocket !== currentPocketId;
    if (regionChanged || pocketChanged) {
      currentRegionId = nextRegion;
      currentPocketId = nextPocket;
      dirty = true;
    }
    // compute active set only if region changed or first time
    if (dirty) {
      const nextActive = computeActiveForCurrent(currentRegionId);
      const changed = !setsEqual(nextActive, activeSet);
      if (changed || !emitted) {
        const prevActive = new Set(activeSet);
        activeSet = nextActive;
        activeArray = [...activeSet].sort();
        dirty = false;
        emitted = true;
        if (onChange && changed) {
          try { onChange({ currentRegionId, currentPocketId, activeIds: [...activeArray], prevActiveIds: [...prevActive].sort() }); } catch {}
        }
        return { changed: true, currentRegionId, currentPocketId, activeIds: [...activeArray], prevActiveIds: [...prevActive].sort() };
      } else {
        dirty = false;
      }
    }
    return { changed: false, currentRegionId, currentPocketId, activeIds: [...activeArray] };
  }

  function getCurrentRegionId() { return currentRegionId; }
  function getCurrentPocketId() { return currentPocketId; }
  function getActiveIds() { return [...activeArray]; }
  function getActiveSet() { return new Set(activeSet); }
  function isActive(regionId) { return activeSet.has(regionId); }
  function forceRecalc(playerPos) {
    dirty = true;
    return update(playerPos);
  }

  // For tests: expose deterministic helper
  function resolveRegionForPos(pos) {
    return worldRegistry.getRegionForPosition(pos);
  }

  return {
    update,
    getCurrentRegionId,
    getCurrentPocketId,
    getActiveIds,
    getActiveSet,
    isActive,
    forceRecalc,
    resolveRegionForPos,
    // debug
    get debug() {
      return {
        currentRegionId,
        currentPocketId,
        activeIds: [...activeArray],
      };
    },
  };
}
