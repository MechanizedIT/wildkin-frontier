// src/session/expeditionSession.js — temporary expedition/run lifecycle (Phase 4A)
// Statuses: camp | active | extracted | lost
// Owns only transient run state, not persistent bank.

import { makeEmptyResourceMap, normalizeResourceMap } from "../resources/resourceDropCatalog.js";

function generateRunId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
export function createExpeditionSession(opts = {}) {
  const resourceDrops = opts.resourceDrops;
  const emptyCargo = () => makeEmptyResourceMap(resourceDrops);
  let startAnchorId = opts.startAnchorId ?? "camp_gate";
  let status = opts.initialStatus ?? "active"; // camp | active | extracted | lost | dead (dead alias for lost)
  let runXp = 0;
  let kills = 0;
  let unsecuredCargo = emptyCargo();
  let currentRegionId = opts.initialRegionId ?? null;
  let currentPocketId = opts.initialPocketId ?? null;
  let maxDepth = 0;
  const regionDepthMap = opts.regionDepthMap ?? null;
  let unsecuredWildkin = [];
  let extractionOutcome = null;
  let resolved = false; // has this run been resolved (banked/lost) — idempotent guard
  let runDiscoveries = { newWaypoints: [], newBeacons: [] }; // temp discoveries this run before banking
  let runId = opts.initialRunId ?? generateRunId();

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
    unsecuredCargo = normalizeResourceMap(cargo, resourceDrops, { keepUnknown: true });
  }
  function incrementCargo(resourceId, amount = 1) {
    if (unsecuredCargo[resourceId] !== undefined) unsecuredCargo[resourceId] += amount;
    else unsecuredCargo[resourceId] = (unsecuredCargo[resourceId] ?? 0) + amount;
  }

  function isCamp() { return status === "camp"; }
  function isActive() { return status === "active"; }
  function isResolved() { return resolved; }

  function beginRun(nextStartAnchorId) {
    if (status === "active") return false;
    startAnchorId = nextStartAnchorId ?? startAnchorId;
    status = "active";
    resolved = false;
    runXp = 0;
    kills = 0;
    unsecuredCargo = emptyCargo();
    extractionOutcome = null;
    unsecuredWildkin = [];
    runDiscoveries = { newWaypoints: [], newBeacons: [] };
    runId = generateRunId();
    maxDepth = 0;
    return true;
  }

  function resetToCamp() {
    status = "camp";
    resolved = false;
    runXp = 0;
    kills = 0;
    unsecuredCargo = emptyCargo();
    extractionOutcome = null;
    unsecuredWildkin = [];
    runDiscoveries = { newWaypoints: [], newBeacons: [] };
    maxDepth = 0;
    runId = generateRunId();
  }

  function reset(nextStartAnchorId = startAnchorId) {
    startAnchorId = nextStartAnchorId ?? startAnchorId;
    status = "active";
    resolved = false;
    runXp = 0;
    kills = 0;
    unsecuredCargo = emptyCargo();
    extractionOutcome = null;
    unsecuredWildkin = [];
    runDiscoveries = { newWaypoints: [], newBeacons: [] };
    maxDepth = getDepthForRegion(currentRegionId);
    runId = generateRunId();
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
      runId,
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
      runId,
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
    getRunId: () => runId,
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
