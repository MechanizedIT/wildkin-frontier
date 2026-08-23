// src/world/worldRegistry.js — runtime world owner/registry (Phase 3.5A)
// Answers which region/pocket owns objects, adjacency, and instantiation lists.
// Does not own creature AI or resource rules.

import { normalizeWorldData } from "./worldValidator.js";

export function createWorldRegistry(rawData) {
  const data = normalizeWorldData(rawData);
  const regionMap = new Map();
  for (const r of data.regions) regionMap.set(r.id, r);

  // Build global lookups with regionId attached
  const allResources = [];
  const resourcesByRegion = new Map();
  const allCreatures = [];
  const creaturesByRegion = new Map();
  const allWaypoints = [];
  const waypointsByRegion = new Map();
  const allBeacons = [];
  const beaconsByRegion = new Map();
  const allPois = [];
  const poisByRegion = new Map();
  const allGroundPatches = [];
  const groundPatchesByRegion = new Map();
  const allBoundaries = [];
  const boundariesByRegion = new Map();

  for (const region of data.regions) {
    const rId = region.id;
    resourcesByRegion.set(rId, []);
    creaturesByRegion.set(rId, []);
    waypointsByRegion.set(rId, []);
    beaconsByRegion.set(rId, []);
    poisByRegion.set(rId, []);
    groundPatchesByRegion.set(rId, []);
    boundariesByRegion.set(rId, []);
    for (const res of region.resources) {
      const entry = { ...res, regionId: rId, pos: { ...res.pos } };
      allResources.push(entry);
      resourcesByRegion.get(rId).push(entry);
    }
    for (const cr of region.creatures) {
      const entry = { ...cr, regionId: rId, pos: { ...cr.pos }, homePos: { ...(cr.homePos ?? cr.pos) } };
      allCreatures.push(entry);
      creaturesByRegion.get(rId).push(entry);
    }
    for (const wp of region.majorWaypoints) {
      const entry = { ...wp, regionId: rId, pos: { ...wp.pos } };
      allWaypoints.push(entry);
      waypointsByRegion.get(rId).push(entry);
    }
    for (const bc of region.extractionBeacons) {
      const entry = { ...bc, regionId: rId, pos: { ...bc.pos } };
      allBeacons.push(entry);
      beaconsByRegion.get(rId).push(entry);
    }
    for (const poi of region.pois) {
      const entry = { ...poi, regionId: rId, pos: { ...poi.pos } };
      allPois.push(entry);
      poisByRegion.get(rId).push(entry);
    }
    for (const gp of region.groundPatches ?? []) {
      const entry = { ...gp, regionId: rId, pos: { ...gp.pos }, size: { ...gp.size } };
      allGroundPatches.push(entry);
      groundPatchesByRegion.get(rId).push(entry);
    }
    for (const bc of region.boundaryColliders ?? []) {
      const entry = { ...bc, regionId: rId, pos: { ...bc.pos }, size: { ...bc.size } };
      allBoundaries.push(entry);
      boundariesByRegion.get(rId).push(entry);
    }
  }

  function getRegionById(id) { return regionMap.get(id) ?? null; }
  function getAllRegions() { return [...data.regions]; }
  function getRegionIds() { return [...regionMap.keys()]; }

  function getAllResources() { return allResources; }
  function getResourcesForRegion(regionId) { return resourcesByRegion.get(regionId) ?? []; }
  function getResourcesForActive(activeSet) {
    const res = [];
    for (const rid of activeSet) {
      const list = resourcesByRegion.get(rid);
      if (list) res.push(...list);
    }
    return res;
  }

  function getAllCreatures() { return allCreatures; }
  function getCreaturesForRegion(regionId) { return creaturesByRegion.get(regionId) ?? []; }
  function getCreaturesForActive(activeSet) {
    const res = [];
    for (const rid of activeSet) res.push(...(creaturesByRegion.get(rid) ?? []));
    return res;
  }

  function getAllWaypoints() { return allWaypoints; }
  function getAllBeacons() { return allBeacons; }
  function getAllPois() { return allPois; }
  function getAllGroundPatches() { return allGroundPatches; }
  function getGroundPatchesForRegion(regionId) { return groundPatchesByRegion.get(regionId) ?? []; }
  function getAllBoundaries() { return allBoundaries; }
  function getBoundariesForRegion(regionId) { return boundariesByRegion.get(regionId) ?? []; }

  function getCamp() { return data.camp ?? null; }
  function getStartAnchorId() { return data.startAnchorId ?? data.camp?.id ?? null; }
  function getFrontierGateId() { return data.camp?.frontierGateId ?? data.frontierGateId ?? "gate_camp_frontier"; }
  function getFrontierGatePos() {
    const gateId = getFrontierGateId();
    for (const region of data.regions) {
      for (const prop of region.props) if (prop.id === gateId) return { ...prop.pos, regionId: region.id };
    }
    return null;
  }
  function getInitialMajorWaypointId() {
    if (data.initialMajorWaypointId) return data.initialMajorWaypointId;
    // fallback first major waypoint outside camp
    const nonCamp = allWaypoints.find(w => w.regionId !== "camp");
    return nonCamp?.id ?? allWaypoints[0]?.id ?? null;
  }
  function getWaypointById(id) { return allWaypoints.find(w => w.id === id) ?? null; }
  function getBeaconById(id) { return allBeacons.find(b => b.id === id) ?? null; }
  function getWaypointSpawnPosition(waypointId) {
    const wp = getWaypointById(waypointId);
    if (!wp) return null;
    const base = wp.pos;
    const offset = wp.spawnOffset ?? wp.startOffset ?? { x: 0, z: 1.2 };
    const x = base.x + (offset.x ?? 0);
    const z = base.z + (offset.z ?? 1.2);
    const y = base.y ?? 0;
    return { x, y, z, regionId: wp.regionId };
  }
  function getCampSpawnPosition() {
    const camp = data.camp;
    if (camp?.playerSpawn) {
      const sp = camp.playerSpawn;
      return { x: sp.x, y: sp.y ?? 0, z: sp.z, regionId: "camp" };
    }
    if (camp?.pos) return { x: camp.pos.x, y: camp.pos.y ?? 0, z: camp.pos.z - 0.8, regionId: "camp" };
    return { x: 0, y: 0, z: 9.5, regionId: "camp" };
  }
  function getAnchorDisplayName(anchor) {
    if (anchor.displayName && typeof anchor.displayName === "string" && anchor.displayName.trim()) return anchor.displayName.trim();
    const region = anchor.regionId ? regionMap.get(anchor.regionId) : null;
    const regionName = region?.displayName ?? anchor.regionId ?? "";
    if (anchor.type === "majorWaypoint") {
      if (regionName) return regionName;
      return "Waypoint";
    }
    if (anchor.type === "extractionBeacon") {
      if (regionName) return `${regionName} Beacon`;
      return "Extraction Beacon";
    }
    return anchor.displayName ?? anchor.id ?? "Waypoint";
  }

  // Region resolution: simplest deterministic — check bounds containment, else nearest center
  function getRegionForPosition(pos) {
    const x = pos.x, z = pos.z;
    for (const region of data.regions) {
      const b = region.bounds;
      if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) return region.id;
    }
    // No containing region — find nearest by center distance
    let best = null;
    let bestDist = Infinity;
    for (const region of data.regions) {
      const b = region.bounds;
      const cx = (b.minX + b.maxX) * 0.5;
      const cz = (b.minZ + b.maxZ) * 0.5;
      const d = Math.hypot(x - cx, z - cz);
      if (d < bestDist) { bestDist = d; best = region.id; }
    }
    return best;
  }

  function getPocketForPosition(pos, regionId) {
    const region = regionMap.get(regionId);
    if (!region || !region.pockets || region.pockets.length === 0) return null;
    const x = pos.x, z = pos.z;
    for (const pocket of region.pockets) {
      const b = pocket.bounds;
      if (b && x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) return pocket.id;
    }
    return null;
  }

  function getNeighbors(regionId) {
    const region = regionMap.get(regionId);
    return region ? [...region.neighbors] : [];
  }

  function getActiveSetForRegion(regionId) {
    const active = new Set();
    if (!regionId) return active;
    active.add(regionId);
    const region = regionMap.get(regionId);
    if (region) for (const nid of region.neighbors) active.add(nid);
    return active;
  }

  function getRegionDepthMap() {
    // Simplistic depth: order index; south_basin 0, central 1, north 2
    const map = {};
    data.regions.forEach((r, i) => { map[r.id] = i; });
    return map;
  }

  // For validation/tests
  function getBoundsForRegion(regionId) {
    const region = regionMap.get(regionId);
    return region ? { ...region.bounds } : null;
  }

  return {
    data,
    getRegionById,
    getAllRegions,
    getRegionIds,
    getAllResources,
    getResourcesForRegion,
    getResourcesForActive,
    getAllCreatures,
    getCreaturesForRegion,
    getCreaturesForActive,
    getAllWaypoints,
    getAllBeacons,
    getAllPois,
    getAllGroundPatches,
    getGroundPatchesForRegion,
    getAllBoundaries,
    getBoundariesForRegion,
    getCamp,
    getStartAnchorId,
    getFrontierGateId,
    getFrontierGatePos,
    getInitialMajorWaypointId,
    getWaypointById,
    getBeaconById,
    getWaypointSpawnPosition,
    getCampSpawnPosition,
    getAnchorDisplayName,
    getRegionForPosition,
    getPocketForPosition,
    getNeighbors,
    getActiveSetForRegion,
    getRegionDepthMap,
    getBoundsForRegion,
    // raw normalized data expose for tests
    _data: data,
  };
}
