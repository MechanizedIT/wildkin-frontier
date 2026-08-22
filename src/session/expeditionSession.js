// src/session/expeditionSession.js — focused owner for temporary expedition/run lifecycle (Phase 3.5A)
// Does not own player health, rendering, creature AI, or resource rules. Orchestrates session-owned summary state.

export function createExpeditionSession(opts = {}) {
  const startAnchorId = opts.startAnchorId ?? "camp_gate";
  let status = opts.initialStatus ?? "active"; // active | dead | extracted
  let runXp = 0;
  let kills = 0;
  // unsecured cargo summary — updated via setCargo or increment
  let unsecuredCargo = { wood: 0, stone: 0, fiber: 0 };
  let currentRegionId = opts.initialRegionId ?? null;
  let currentPocketId = opts.initialPocketId ?? null;
  let maxDepth = 0;
  // optional depth map for maxDepth tracking; if not provided, depth is order index
  const regionDepthMap = opts.regionDepthMap ?? null;

  // future slots (unsecured Wildkin, extraction outcome) — placeholder
  let unsecuredWildkin = [];
  let extractionOutcome = null;

  function getDepthForRegion(regionId) {
    if (!regionId) return 0;
    if (regionDepthMap && regionDepthMap[regionId] !== undefined) return regionDepthMap[regionId];
    // fallback: alphabetical numeric if not mapped — treat as 0
    return 0;
  }

  function setRegion(regionId, pocketId = null) {
    const changed = currentRegionId !== regionId || currentPocketId !== pocketId;
    currentRegionId = regionId ?? null;
    currentPocketId = pocketId ?? null;
    const depth = getDepthForRegion(regionId);
    if (depth > maxDepth) maxDepth = depth;
    // also track maxDepth as visited count
    return changed;
  }

  function addXp(amount) {
    if (typeof amount === "number" && amount > 0) runXp += amount;
  }

  function setXp(value) {
    runXp = Math.max(0, value | 0);
  }

  function addKill() {
    kills += 1;
  }

  function setCargo(cargo) {
    if (!cargo) return;
    unsecuredCargo = {
      wood: cargo.wood | 0,
      stone: cargo.stone | 0,
      fiber: cargo.fiber | 0,
    };
  }

  function incrementCargo(resourceId, amount = 1) {
    if (unsecuredCargo[resourceId] !== undefined) unsecuredCargo[resourceId] += amount;
    else unsecuredCargo[resourceId] = (unsecuredCargo[resourceId] ?? 0) + amount;
  }

  function reset(nextStartAnchorId = startAnchorId) {
    status = "active";
    runXp = 0;
    kills = 0;
    unsecuredCargo = { wood: 0, stone: 0, fiber: 0 };
    extractionOutcome = null;
    unsecuredWildkin = [];
    // keep currentRegion? spec says run reset/death lifecycle hooks — reset to start anchor region
    // caller should setRegion after reset if needed
    maxDepth = getDepthForRegion(currentRegionId);
    // Note: startAnchorId is constant for this slice; future: update from opts
  }

  function onDeath() {
    if (status === "dead") return;
    status = "dead";
  }

  function onExtract(outcome = null) {
    status = "extracted";
    extractionOutcome = outcome;
  }

  function setStatus(s) {
    status = s;
  }

  function getState() {
    return {
      status,
      runXp,
      kills,
      unsecuredCargo: { ...unsecuredCargo },
      startAnchorId,
      currentRegionId,
      currentPocketId,
      maxDepth,
      unsecuredWildkin: [...unsecuredWildkin],
      extractionOutcome,
    };
  }

  return {
    getState,
    getStatus: () => status,
    getRunXp: () => runXp,
    getKills: () => kills,
    getCargo: () => ({ ...unsecuredCargo }),
    getCurrentRegionId: () => currentRegionId,
    getCurrentPocketId: () => currentPocketId,
    getMaxDepth: () => maxDepth,
    setRegion,
    addXp,
    setXp,
    addKill,
    setCargo,
    incrementCargo,
    reset,
    onDeath,
    onExtract,
    setStatus,
    // expose for tests
    _getDepthMap: () => regionDepthMap,
  };
}
