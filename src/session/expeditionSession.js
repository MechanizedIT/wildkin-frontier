// src/session/expeditionSession.js — temporary expedition/run lifecycle (Phase 4A)
// Statuses: camp | active | extracted | lost
// Owns only transient run state, not persistent bank.

export function createExpeditionSession(opts = {}) {
  let startAnchorId = opts.startAnchorId ?? "camp_gate";
  let status = opts.initialStatus ?? "active"; // camp | active | extracted | lost | dead (dead alias for lost)
  let runXp = 0;
  let kills = 0;
  let unsecuredCargo = { wood: 0, stone: 0, fiber: 0 };
  let currentRegionId = opts.initialRegionId ?? null;
  let currentPocketId = opts.initialPocketId ?? null;
  let maxDepth = 0;
  const regionDepthMap = opts.regionDepthMap ?? null;
  let unsecuredWildkin = [];
  let extractionOutcome = null;
  let resolved = false; // has this run been resolved (banked/lost) — idempotent guard
  let runDiscoveries = { newWaypoints: [], newBeacons: [] }; // temp discoveries this run before banking

  function getDepthForRegion(regionId) {
    if (!regionId) return 0;
    if (regionDepthMap && regionDepthMap[regionId] !== undefined) return regionDepthMap[regionId];
    return 0;
  }

  function setRegion(regionId, pocketId = null) {
    const changed = currentRegionId !== regionId || currentPocketId !== pocketId;
    currentRegionId = regionId ?? null;
    currentPocketId = pocketId ?? null;
    const depth = getDepthForRegion(regionId);
    if (depth > maxDepth) maxDepth = depth;
    return changed;
  }

  function addXp(amount) { if (typeof amount === "number" && amount > 0) runXp += amount; }
  function setXp(value) { runXp = Math.max(0, value | 0); }
  function addKill() { kills += 1; }
  function setCargo(cargo) {
    if (!cargo) return;
    unsecuredCargo = { wood: cargo.wood | 0, stone: cargo.stone | 0, fiber: cargo.fiber | 0 };
  }
  function incrementCargo(resourceId, amount = 1) {
    if (unsecuredCargo[resourceId] !== undefined) unsecuredCargo[resourceId] += amount;
    else unsecuredCargo[resourceId] = (unsecuredCargo[resourceId] ?? 0) + amount;
  }

  function isCamp() { return status === "camp"; }
  function isActive() { return status === "active"; }
  function isResolved() { return resolved; }

  function beginRun(nextStartAnchorId) {
    // Validate: can begin from camp only; if already active, ignore (idempotent)
    if (status === "active") return false;
    startAnchorId = nextStartAnchorId ?? startAnchorId;
    status = "active";
    resolved = false;
    runXp = 0;
    kills = 0;
    unsecuredCargo = { wood: 0, stone: 0, fiber: 0 };
    extractionOutcome = null;
    unsecuredWildkin = [];
    runDiscoveries = { newWaypoints: [], newBeacons: [] };
    // maxDepth reset to depth of current region? Keep but caller will setRegion
    return true;
  }

  function resetToCamp() {
    // Centralized transient reset to camp (used by both extraction and death return)
    status = "camp";
    resolved = false;
    runXp = 0;
    kills = 0;
    unsecuredCargo = { wood: 0, stone: 0, fiber: 0 };
    extractionOutcome = null;
    unsecuredWildkin = [];
    runDiscoveries = { newWaypoints: [], newBeacons: [] };
    maxDepth = getDepthForRegion(currentRegionId);
  }

  function reset(nextStartAnchorId = startAnchorId) {
    // Legacy behavior expected by Phase 3.5A tests: reset => active
    startAnchorId = nextStartAnchorId ?? startAnchorId;
    status = "active";
    resolved = false;
    runXp = 0;
    kills = 0;
    unsecuredCargo = { wood: 0, stone: 0, fiber: 0 };
    extractionOutcome = null;
    unsecuredWildkin = [];
    runDiscoveries = { newWaypoints: [], newBeacons: [] };
    maxDepth = getDepthForRegion(currentRegionId);
  }

  function snapshotRun() {
    return {
      cargo: { ...unsecuredCargo },
      xp: runXp,
      kills,
      startAnchorId,
      currentRegionId,
      maxDepth,
      newWaypoints: [...runDiscoveries.newWaypoints],
      newBeacons: [...runDiscoveries.newBeacons],
    };
  }

  function addDiscoveryWaypoint(id) {
    if (!runDiscoveries.newWaypoints.includes(id)) runDiscoveries.newWaypoints.push(id);
  }
  function addDiscoveryBeacon(id) {
    if (!runDiscoveries.newBeacons.includes(id)) runDiscoveries.newBeacons.push(id);
  }

  function onDeath() {
    if (resolved) return null;
    // snapshot before clearing
    const snap = snapshotRun();
    status = "dead";
    resolved = true;
    extractionOutcome = { type: "lost", snapshot: snap };
    return snap;
  }

  function onExtract(outcome = null) {
    if (resolved) return null;
    const snap = snapshotRun();
    status = "extracted";
    resolved = true;
    extractionOutcome = outcome ?? { type: "extracted", snapshot: snap };
    if (!extractionOutcome.snapshot) extractionOutcome.snapshot = snap;
    return snap;
  }

  // Idempotent resolve helpers for anchoring
  function tryResolveExtract() {
    if (resolved) return null;
    return onExtract();
  }
  function tryResolveDeath() {
    if (resolved) return null;
    return onDeath();
  }

  function setStatus(s) { status = s; }

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
      resolved,
      runDiscoveries: { newWaypoints: [...runDiscoveries.newWaypoints], newBeacons: [...runDiscoveries.newBeacons] },
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
    resetToCamp,
    beginRun,
    onDeath,
    onExtract,
    tryResolveExtract,
    tryResolveDeath,
    setStatus,
    isCamp,
    isActive,
    isResolved: () => resolved,
    snapshotRun,
    addDiscoveryWaypoint,
    addDiscoveryBeacon,
    getRunDiscoveries: () => ({ ...runDiscoveries, newWaypoints: [...runDiscoveries.newWaypoints], newBeacons: [...runDiscoveries.newBeacons] }),
    _getDepthMap: () => regionDepthMap,
  };
}
