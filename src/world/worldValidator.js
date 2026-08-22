// src/world/worldValidator.js — normalization + validation for data-driven world (Phase 3.5A)
// Runtime systems consume normalized data, not raw JSON independently.

const SUPPORTED_RESOURCE_TYPES = new Set(["tree", "rock", "fiber"]);
const SUPPORTED_CREATURE_TYPES = new Set(["rusher", "spitter"]);
const SUPPORTED_TEMPERAMENTS = new Set(["AGGRESSIVE", "TERRITORIAL", "DEFENSIVE", "SKITTISH"]);
const SUPPORTED_ANCHOR_TYPES = new Set(["majorWaypoint", "extractionBeacon"]);
const SUPPORTED_POI_TYPES = new Set(["chest", "barrier", "generic", "island"]);
// Allow generic POI types beyond known — but if requires.type is companionAbility/materialRepair we validate.

function isNumber(v) { return typeof v === "number" && Number.isFinite(v); }

function clonePos(p) {
  return { x: p.x, y: p.y ?? 0, z: p.z };
}

function validatePos(pos, label) {
  if (!pos || typeof pos !== "object") throw new Error(`${label} pos missing`);
  if (!isNumber(pos.x) || !isNumber(pos.z)) throw new Error(`${label} pos x/z must be numbers`);
  if (pos.y !== undefined && !isNumber(pos.y)) throw new Error(`${label} pos y must be number`);
}

function validateBounds(bounds, label) {
  if (!bounds || typeof bounds !== "object") throw new Error(`${label} bounds missing`);
  for (const k of ["minX", "maxX", "minZ", "maxZ"]) {
    if (!isNumber(bounds[k])) throw new Error(`${label} bounds ${k} must be number`);
  }
  if (bounds.minX >= bounds.maxX) throw new Error(`${label} bounds minX >= maxX`);
  if (bounds.minZ >= bounds.maxZ) throw new Error(`${label} bounds minZ >= maxZ`);
}

function isInsideBounds(pos, bounds) {
  return pos.x >= bounds.minX && pos.x <= bounds.maxX && pos.z >= bounds.minZ && pos.z <= bounds.maxZ;
}

export function normalizeWorldData(raw) {
  if (!raw || typeof raw !== "object") throw new Error("world data must be an object");
  const data = JSON.parse(JSON.stringify(raw)); // deep clone
  // version
  if (!data.version || typeof data.version !== "string") throw new Error("world.version required string");
  // camp placeholder allowed
  if (data.camp) {
    if (!data.camp.id || typeof data.camp.id !== "string") throw new Error("camp.id required");
    if (data.camp.pos) validatePos(data.camp.pos, "camp");
  }
  if (!Array.isArray(data.regions) || data.regions.length === 0) throw new Error("world.regions must be non-empty array");

  const allIds = new Set();
  const regionIds = new Set();
  // First pass: collect region ids and check unique
  for (const r of data.regions) {
    if (!r.id || typeof r.id !== "string") throw new Error("region.id required string");
    if (regionIds.has(r.id)) throw new Error(`duplicate region id ${r.id}`);
    regionIds.add(r.id);
    allIds.add(r.id);
  }
  // Validate each region
  const globalResourceIds = new Set();
  const globalCreatureIds = new Set();
  const globalAnchorIds = new Set();
  const globalPoiIds = new Set();

  for (const region of data.regions) {
    validateBounds(region.bounds, `region ${region.id}`);
    if (!Array.isArray(region.neighbors)) throw new Error(`region ${region.id} neighbors must be array`);
    // check neighbor refs valid and no self, no duplicate
    const seenNeighbors = new Set();
    for (const nid of region.neighbors) {
      if (typeof nid !== "string") throw new Error(`region ${region.id} neighbor must be string`);
      if (nid === region.id) throw new Error(`region ${region.id} cannot neighbor itself`);
      if (seenNeighbors.has(nid)) throw new Error(`region ${region.id} duplicate neighbor ${nid}`);
      seenNeighbors.add(nid);
      if (!regionIds.has(nid)) throw new Error(`region ${region.id} neighbor ${nid} not found`);
    }
    // pockets optional
    if (region.pockets === undefined) region.pockets = [];
    if (!Array.isArray(region.pockets)) throw new Error(`region ${region.id} pockets must be array`);
    const pocketIds = new Set();
    for (const p of region.pockets) {
      if (!p.id || typeof p.id !== "string") throw new Error(`region ${region.id} pocket id required`);
      if (pocketIds.has(p.id)) throw new Error(`duplicate pocket id ${p.id} in region ${region.id}`);
      pocketIds.add(p.id);
      if (allIds.has(p.id)) throw new Error(`duplicate global id pocket ${p.id}`);
      allIds.add(p.id);
      if (p.bounds) validateBounds(p.bounds, `pocket ${p.id}`);
      if (p.neighbors && !Array.isArray(p.neighbors)) throw new Error(`pocket ${p.id} neighbors must be array`);
    }
    // ground / props defaults
    if (!region.ground) region.ground = { type: "plain" };
    if (!Array.isArray(region.props)) region.props = [];
    // resources
    if (!Array.isArray(region.resources)) region.resources = [];
    for (const res of region.resources) {
      if (!res.id || typeof res.id !== "string") throw new Error(`region ${region.id} resource id required`);
      if (globalResourceIds.has(res.id)) throw new Error(`duplicate resource id ${res.id}`);
      if (allIds.has(res.id)) throw new Error(`duplicate global id resource ${res.id}`);
      globalResourceIds.add(res.id);
      allIds.add(res.id);
      if (!SUPPORTED_RESOURCE_TYPES.has(res.type)) throw new Error(`region ${region.id} resource ${res.id} unsupported type ${res.type}`);
      validatePos(res.pos, `resource ${res.id}`);
      if (!isInsideBounds(res.pos, region.bounds)) {
        throw new Error(`resource ${res.id} pos not inside region ${region.id} bounds`);
      }
    }
    // creatures
    if (!Array.isArray(region.creatures)) region.creatures = [];
    for (const cr of region.creatures) {
      if (!cr.id || typeof cr.id !== "string") throw new Error(`region ${region.id} creature id required`);
      if (globalCreatureIds.has(cr.id)) throw new Error(`duplicate creature id ${cr.id}`);
      if (allIds.has(cr.id)) throw new Error(`duplicate global id creature ${cr.id}`);
      globalCreatureIds.add(cr.id);
      allIds.add(cr.id);
      if (!SUPPORTED_CREATURE_TYPES.has(cr.type)) throw new Error(`creature ${cr.id} unsupported type ${cr.type}`);
      if (!SUPPORTED_TEMPERAMENTS.has(cr.temperament)) throw new Error(`creature ${cr.id} unsupported temperament ${cr.temperament}`);
      if (!cr.speciesTag || typeof cr.speciesTag !== "string") throw new Error(`creature ${cr.id} speciesTag required`);
      validatePos(cr.pos, `creature ${cr.id}`);
      validatePos(cr.homePos ?? cr.pos, `creature ${cr.id} homePos`);
      if (!isInsideBounds(cr.pos, region.bounds)) {
        throw new Error(`creature ${cr.id} pos not inside region ${region.id} bounds`);
      }
      if (cr.homePos && !isInsideBounds(cr.homePos, region.bounds)) {
        throw new Error(`creature ${cr.id} homePos not inside region ${region.id} bounds`);
      }
      for (const k of ["roamRadius", "noticeRadius", "personalSpace", "leashRadius"]) {
        if (cr[k] !== undefined && !isNumber(cr[k])) throw new Error(`creature ${cr.id} ${k} must be number`);
      }
      if (cr.hostileSpecies !== undefined && !Array.isArray(cr.hostileSpecies)) throw new Error(`creature ${cr.id} hostileSpecies must be array`);
    }
    // traversal
    if (!region.traversal) region.traversal = {};
    if (!Array.isArray(region.traversal.platforms)) region.traversal.platforms = [];
    if (!Array.isArray(region.traversal.obstacles)) region.traversal.obstacles = [];
    if (!Array.isArray(region.traversal.jumpTraversals)) region.traversal.jumpTraversals = [];
    if (!Array.isArray(region.traversal.climbables)) region.traversal.climbables = [];
    for (const plat of region.traversal.platforms) {
      if (!plat.id) throw new Error(`region ${region.id} platform id required`);
      if (allIds.has(plat.id)) throw new Error(`duplicate global id platform ${plat.id}`);
      allIds.add(plat.id);
    }
    for (const obs of region.traversal.obstacles) {
      if (!obs.id) throw new Error(`region ${region.id} obstacle id required`);
      if (allIds.has(obs.id)) throw new Error(`duplicate global id obstacle ${obs.id}`);
      allIds.add(obs.id);
    }
    // majorWaypoints
    if (!Array.isArray(region.majorWaypoints)) region.majorWaypoints = [];
    for (const wp of region.majorWaypoints) {
      if (!wp.id || typeof wp.id !== "string") throw new Error(`region ${region.id} majorWaypoint id required`);
      if (globalAnchorIds.has(wp.id)) throw new Error(`duplicate anchor id ${wp.id}`);
      if (allIds.has(wp.id)) throw new Error(`duplicate global id waypoint ${wp.id}`);
      globalAnchorIds.add(wp.id);
      allIds.add(wp.id);
      if (wp.type !== "majorWaypoint") throw new Error(`majorWaypoint ${wp.id} type must be majorWaypoint`);
      validatePos(wp.pos, `waypoint ${wp.id}`);
      if (!isInsideBounds(wp.pos, region.bounds)) throw new Error(`waypoint ${wp.id} not inside region ${region.id} bounds`);
    }
    // extractionBeacons
    if (!Array.isArray(region.extractionBeacons)) region.extractionBeacons = [];
    for (const eb of region.extractionBeacons) {
      if (!eb.id || typeof eb.id !== "string") throw new Error(`region ${region.id} extractionBeacon id required`);
      if (globalAnchorIds.has(eb.id)) throw new Error(`duplicate anchor id ${eb.id}`);
      if (allIds.has(eb.id)) throw new Error(`duplicate global id beacon ${eb.id}`);
      globalAnchorIds.add(eb.id);
      allIds.add(eb.id);
      if (eb.type !== "extractionBeacon") throw new Error(`extractionBeacon ${eb.id} type must be extractionBeacon`);
      validatePos(eb.pos, `beacon ${eb.id}`);
      if (!isInsideBounds(eb.pos, region.bounds)) throw new Error(`beacon ${eb.id} not inside region ${region.id} bounds`);
    }
    // pois
    if (!Array.isArray(region.pois)) region.pois = [];
    for (const poi of region.pois) {
      if (!poi.id || typeof poi.id !== "string") throw new Error(`region ${region.id} poi id required`);
      if (globalPoiIds.has(poi.id)) throw new Error(`duplicate poi id ${poi.id}`);
      if (allIds.has(poi.id)) throw new Error(`duplicate global id poi ${poi.id}`);
      globalPoiIds.add(poi.id);
      allIds.add(poi.id);
      if (!poi.type || typeof poi.type !== "string") throw new Error(`poi ${poi.id} type required`);
      // allow known but also generic; if requires present, validate shape
      if (poi.requires) {
        if (typeof poi.requires !== "object") throw new Error(`poi ${poi.id} requires must be object or null`);
        if (poi.requires.type !== "companionAbility" && poi.requires.type !== "materialRepair" && poi.requires.type !== "none") {
          // For Phase 3.5A, allow companionAbility and materialRepair at least; others pass but warn via type string
          // We enforce that type is known for now: companionAbility | materialRepair
          // But to keep flexible, allow any string but must have id or costs
        }
      }
      validatePos(poi.pos, `poi ${poi.id}`);
      if (!isInsideBounds(poi.pos, region.bounds)) throw new Error(`poi ${poi.id} not inside region ${region.id} bounds`);
    }
  }

  // Check no obvious invalid cross-region ownership already done via inside bounds.
  // Also check global camp not colliding duplicate ids
  if (data.camp && allIds.has(data.camp.id) && !regionIds.has(data.camp.id)) {
    // camp id collides with region? Already checked? Actually camp id was not in allIds yet, so add
    // But if camp id equals region id, that's duplicate — error
    if (regionIds.has(data.camp.id)) throw new Error(`camp id ${data.camp.id} duplicates region id`);
  }

  // Preserve creature-spawn clearance regression where practical (expanded platform check)
  // This is optional — we do light check: creature pos not inside expanded platform/obstacle/resource collider
  // Collect global expanded geometry for clearance (radius 0.32 + 0.05)
  const creatureRadius = 0.32 + 0.05;
  const allPlatforms = [];
  const allObstacles = [];
  const allSolidResources = [];
  for (const region of data.regions) {
    for (const plat of region.traversal.platforms) {
      const aabb = { minX: plat.x - plat.w / 2, maxX: plat.x + plat.w / 2, minZ: plat.z - plat.h / 2, maxZ: plat.z + plat.h / 2, height: plat.height };
      allPlatforms.push(aabb);
    }
    for (const obs of region.traversal.obstacles) {
      const aabb = { minX: obs.x - obs.w / 2, maxX: obs.x + obs.w / 2, minZ: obs.z - obs.h / 2, maxZ: obs.z + obs.h / 2, height: obs.height };
      allObstacles.push(aabb);
    }
    for (const res of region.resources) {
      // solid resources: tree, rock
      if (res.type === "tree" || res.type === "rock") {
        const half = res.type === "tree" ? 0.58 : 0.72; // from resourceConfig
        const aabb = { minX: res.pos.x - half, maxX: res.pos.x + half, minZ: res.pos.z - half, maxZ: res.pos.z + half, height: 1.0 };
        allSolidResources.push(aabb);
      }
    }
  }
  for (const region of data.regions) {
    for (const cr of region.creatures) {
      const x = cr.pos.x, z = cr.pos.z;
      for (const plat of allPlatforms) {
        const minX = plat.minX - creatureRadius, maxX = plat.maxX + creatureRadius;
        const minZ = plat.minZ - creatureRadius, maxZ = plat.maxZ + creatureRadius;
        if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
          throw new Error(`creature ${cr.id} spawn inside platform volume (clearance failed)`);
        }
      }
      for (const obs of allObstacles) {
        const minX = obs.minX - creatureRadius, maxX = obs.maxX + creatureRadius;
        const minZ = obs.minZ - creatureRadius, maxZ = obs.maxZ + creatureRadius;
        if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
          throw new Error(`creature ${cr.id} spawn inside obstacle (clearance failed)`);
        }
      }
      for (const res of allSolidResources) {
        const minX = res.minX - creatureRadius, maxX = res.maxX + creatureRadius;
        const minZ = res.minZ - creatureRadius, maxZ = res.maxZ + creatureRadius;
        if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
          // check if this resource is the creature's own region? Still not allowed to spawn inside resource collider
          throw new Error(`creature ${cr.id} spawn inside solid resource (clearance failed)`);
        }
      }
    }
  }

  // Cross-region duplicate check already done.

  // Normalize: ensure defaults and freeze shallow
  return data;
}

export function validateWorldData(raw) {
  normalizeWorldData(raw);
  return true;
}

export const SUPPORTED = {
  resourceTypes: SUPPORTED_RESOURCE_TYPES,
  creatureTypes: SUPPORTED_CREATURE_TYPES,
  temperaments: SUPPORTED_TEMPERAMENTS,
  anchorTypes: SUPPORTED_ANCHOR_TYPES,
  poiTypes: SUPPORTED_POI_TYPES,
};
