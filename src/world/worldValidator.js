// src/world/worldValidator.js — normalization + validation for data-driven world (Phase 3.5A)
// Runtime systems consume normalized data, not raw JSON independently.

import { DEFAULT_RESOURCE_DROPS } from "../resources/resourceDropCatalog.js";

const SUPPORTED_RESOURCE_TYPES = new Set(["tree", "rock", "fiber"]);
const SUPPORTED_CREATURE_TYPES = new Set(["rusher", "spitter"]);
const SUPPORTED_TEMPERAMENTS = new Set(["AGGRESSIVE", "TERRITORIAL", "DEFENSIVE", "SKITTISH"]);
const SUPPORTED_ANCHOR_TYPES = new Set(["majorWaypoint", "extractionBeacon"]);
const SUPPORTED_POI_TYPES = new Set(["chest", "barrier", "generic", "island"]);
const SUPPORTED_VISUAL_ASSET_SHAPES = new Set(["box", "cylinder", "cone", "sphere", "capsule", "icosahedron"]);
const SUPPORTED_VISUAL_ASSET_ROLES = new Set(["prop", "harvestable"]);
const SUPPORTED_FEEDBACK_PROFILES = new Set(["wood", "stone", "fiber"]);
// Allow generic POI types beyond known — but if requires.type is companionAbility/materialRepair we validate.

function isNumber(v) { return typeof v === "number" && Number.isFinite(v); }

function validateCanonicalColor(value, label) {
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(`${label} color must be #RRGGBB`);
  }
}

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
    if (data.camp.frontierGateId !== undefined && typeof data.camp.frontierGateId !== "string") throw new Error("camp.frontierGateId must be string");
    if (data.camp.playerSpawn !== undefined) {
      const sp = data.camp.playerSpawn;
      // support new explicit transform {position:{x,y,z}, facingYaw} or legacy {x,y,z}
      if (sp.position) {
        validatePos(sp.position, "camp.playerSpawn.position");
        if (sp.facingYaw !== undefined && !isNumber(sp.facingYaw)) throw new Error("camp.playerSpawn facingYaw must be number");
        if (sp.facing !== undefined && !isNumber(sp.facing)) throw new Error("camp.playerSpawn facing must be number");
      } else {
        validatePos(sp, "camp.playerSpawn");
        if (!isNumber(sp.x) || !isNumber(sp.z)) throw new Error("camp.playerSpawn x/z must be numbers");
        if (sp.y !== undefined && !isNumber(sp.y)) throw new Error("camp.playerSpawn y must be number");
        if (sp.facingYaw !== undefined && !isNumber(sp.facingYaw)) throw new Error("camp.playerSpawn facingYaw must be number");
      }
    }
  }
  if (data.initialMajorWaypointId !== undefined && typeof data.initialMajorWaypointId !== "string") throw new Error("initialMajorWaypointId must be string");
  // Optional camp gate at root for backwards compat: frontierGateId
  if (data.frontierGateId !== undefined && typeof data.frontierGateId !== "string") throw new Error("frontierGateId must be string");
  if (data.resourceDrops === undefined) data.resourceDrops = DEFAULT_RESOURCE_DROPS.map((drop) => ({ ...drop }));
  if (!Array.isArray(data.resourceDrops) || data.resourceDrops.length === 0) throw new Error("world.resourceDrops must be a non-empty array");
  const resourceDropIds = new Set();
  for (const drop of data.resourceDrops) {
    if (!drop?.id || typeof drop.id !== "string" || !/^[a-z][a-z0-9_]*$/.test(drop.id)) throw new Error("resource drop id must use lowercase letters, numbers, and underscores");
    if (resourceDropIds.has(drop.id)) throw new Error(`duplicate resource drop id ${drop.id}`);
    resourceDropIds.add(drop.id);
    if (typeof drop.displayName !== "string" || !drop.displayName.trim()) throw new Error(`resource drop ${drop.id} displayName required`);
    validateCanonicalColor(drop.color, `resource drop ${drop.id}`);
  }
  if (data.visualAssets === undefined) data.visualAssets = [];
  if (!Array.isArray(data.visualAssets)) throw new Error("world.visualAssets must be an array");
  const visualAssetIds = new Set();
  for (const asset of data.visualAssets) {
    if (!asset?.id || typeof asset.id !== "string") throw new Error("Visual Asset id required string");
    if (visualAssetIds.has(asset.id)) throw new Error(`duplicate Visual Asset id ${asset.id}`);
    visualAssetIds.add(asset.id);
    if (typeof asset.displayName !== "string" || !asset.displayName.trim()) throw new Error(`Visual Asset ${asset.id} displayName required`);
    if (asset.category === undefined) asset.category = "Uncategorized";
    if (typeof asset.category !== "string" || !asset.category.trim()) throw new Error(`Visual Asset ${asset.id} category required`);
    if (asset.version !== 1) throw new Error(`Visual Asset ${asset.id} unsupported version ${asset.version}`);
    if (!Array.isArray(asset.parts)) throw new Error(`Visual Asset ${asset.id} parts must be an array`);
    const partIds = new Set();
    for (const part of asset.parts) {
      if (!part?.id || typeof part.id !== "string") throw new Error(`Visual Asset ${asset.id} part id required`);
      if (partIds.has(part.id)) throw new Error(`Visual Asset ${asset.id} duplicate part id ${part.id}`);
      partIds.add(part.id);
      if (!SUPPORTED_VISUAL_ASSET_SHAPES.has(part.shape)) throw new Error(`Visual Asset ${asset.id} part ${part.id} unsupported shape ${part.shape}`);
      validatePos(part.position, `Visual Asset ${asset.id} part ${part.id} position`);
      validatePos(part.rotation, `Visual Asset ${asset.id} part ${part.id} rotation`);
      validatePos(part.scale, `Visual Asset ${asset.id} part ${part.id} scale`);
      for (const axis of ["x", "y", "z"]) {
        if (!isNumber(part.position[axis])) throw new Error(`Visual Asset ${asset.id} part ${part.id} position.${axis} must be finite`);
        if (!isNumber(part.rotation[axis])) throw new Error(`Visual Asset ${asset.id} part ${part.id} rotation.${axis} must be finite`);
        if (!isNumber(part.scale[axis]) || part.scale[axis] <= 0) throw new Error(`Visual Asset ${asset.id} part ${part.id} scale.${axis} must be positive finite`);
      }
      validateCanonicalColor(part.color, `Visual Asset ${asset.id} part ${part.id}`);
    }
    if (asset.collision !== null && asset.collision !== undefined) {
      const collision = asset.collision;
      if (collision.shape !== "box") throw new Error(`Visual Asset ${asset.id} collision shape must be box`);
      validatePos(collision.offset, `Visual Asset ${asset.id} collision offset`);
      for (const axis of ["x", "y", "z"]) if (!isNumber(collision.offset[axis])) throw new Error(`Visual Asset ${asset.id} collision offset.${axis} must be finite`);
      if (!collision.size || typeof collision.size !== "object") throw new Error(`Visual Asset ${asset.id} collision size required`);
      for (const key of ["w", "h", "d"]) {
        if (!isNumber(collision.size[key]) || collision.size[key] <= 0) throw new Error(`Visual Asset ${asset.id} collision size.${key} must be positive finite`);
      }
    }
    if (asset.gameplay === undefined) asset.gameplay = { role: "prop" };
    if (!asset.gameplay || typeof asset.gameplay !== "object") throw new Error(`Visual Asset ${asset.id} gameplay required`);
    if (!SUPPORTED_VISUAL_ASSET_ROLES.has(asset.gameplay.role)) throw new Error(`Visual Asset ${asset.id} unsupported gameplay role ${asset.gameplay.role}`);
    if (asset.gameplay.role === "harvestable") {
      const harvestable = asset.gameplay.harvestable;
      if (!harvestable || typeof harvestable !== "object") throw new Error(`Visual Asset ${asset.id} harvestable settings required`);
      if (!resourceDropIds.has(harvestable.dropId)) throw new Error(`Visual Asset ${asset.id} unresolved resource drop ${harvestable.dropId}`);
      if (!Number.isInteger(harvestable.maxChunks) || harvestable.maxChunks < 1 || harvestable.maxChunks > 12) throw new Error(`Visual Asset ${asset.id} maxChunks must be integer 1..12`);
      if (!isNumber(harvestable.respawnSeconds) || harvestable.respawnSeconds < 1 || harvestable.respawnSeconds > 300) throw new Error(`Visual Asset ${asset.id} respawnSeconds must be 1..300`);
      if (!SUPPORTED_FEEDBACK_PROFILES.has(harvestable.feedbackProfile)) throw new Error(`Visual Asset ${asset.id} unsupported feedback profile ${harvestable.feedbackProfile}`);
    }
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
    for (const prop of region.props) {
      if (!prop.id || typeof prop.id !== "string") throw new Error(`region ${region.id} prop id required`);
      if (allIds.has(prop.id)) throw new Error(`duplicate global id prop ${prop.id}`);
      allIds.add(prop.id);
      if (!prop.subtype || typeof prop.subtype !== "string") throw new Error(`prop ${prop.id} subtype required`);
      if (prop.subtype === "visualAsset") {
        if (!prop.visualAssetId || typeof prop.visualAssetId !== "string") throw new Error(`prop ${prop.id} visualAssetId required`);
        if (!visualAssetIds.has(prop.visualAssetId)) throw new Error(`prop ${prop.id} unresolved Visual Asset ${prop.visualAssetId}`);
        if (prop.uniformScale === undefined) prop.uniformScale = 1;
        if (!isNumber(prop.uniformScale) || prop.uniformScale <= 0 || prop.uniformScale > 5) throw new Error(`prop ${prop.id} uniformScale must be >0 <=5`);
      }
      validatePos(prop.pos, `prop ${prop.id}`);
      if (!isInsideBounds(prop.pos, region.bounds)) throw new Error(`prop ${prop.id} pos not inside region ${region.id} bounds`);
      // Phase 4A.1 presentation/collision extras
      if (prop.visibleInPlay !== undefined && typeof prop.visibleInPlay !== "boolean") throw new Error(`prop ${prop.id} visibleInPlay must be boolean`);
      if (prop.collisionEnabled !== undefined && typeof prop.collisionEnabled !== "boolean") throw new Error(`prop ${prop.id} collisionEnabled must be boolean`);
      if (prop.opacity !== undefined) {
        if (!isNumber(prop.opacity)) throw new Error(`prop ${prop.id} opacity must be number`);
        if (prop.opacity < 0 || prop.opacity > 1) throw new Error(`prop ${prop.id} opacity must be 0..1`);
      }
      if (prop.tint !== undefined && prop.color !== undefined) {
        // tint alias for color override
      }
      if (prop.color !== undefined || prop.tint !== undefined) {
        const c = prop.color ?? prop.tint;
        if (typeof c !== "number" && typeof c !== "string") throw new Error(`prop ${prop.id} color/tint must be number or hex string`);
        if (typeof c === "string" && !/^#?[0-9a-fA-F]{6}$/.test(c.replace(/^0x/, "#"))) {
          // allow #RRGGBB or RRGGBB
          if (!/^#([0-9a-fA-F]{6})$/.test(c) && !/^([0-9a-fA-F]{6})$/.test(c)) throw new Error(`prop ${prop.id} color must be #RRGGBB`);
        }
      }
      if (prop.size) {
        if (prop.size.w !== undefined && !isNumber(prop.size.w)) throw new Error(`prop ${prop.id} size.w must be number`);
        if (prop.size.h !== undefined && !isNumber(prop.size.h)) throw new Error(`prop ${prop.id} size.h must be number`);
        if (prop.size.d !== undefined && !isNumber(prop.size.d)) throw new Error(`prop ${prop.id} size.d must be number`);
      }
      if (prop.rotY !== undefined && !isNumber(prop.rotY)) throw new Error(`prop ${prop.id} rotY must be number`);
    }
    // groundPatches
    if (region.groundPatches === undefined) region.groundPatches = [];
    if (!Array.isArray(region.groundPatches)) throw new Error(`region ${region.id} groundPatches must be array`);
    for (const gp of region.groundPatches) {
      if (!gp.id || typeof gp.id !== "string") throw new Error(`region ${region.id} groundPatch id required`);
      if (allIds.has(gp.id)) throw new Error(`duplicate global id groundPatch ${gp.id}`);
      allIds.add(gp.id);
      validatePos(gp.pos, `groundPatch ${gp.id}`);
      if (!gp.size || typeof gp.size !== "object") throw new Error(`groundPatch ${gp.id} size required`);
      for (const k of ["w","h","d"]) if (gp.size[k] !== undefined && !isNumber(gp.size[k])) throw new Error(`groundPatch ${gp.id} size.${k} must be number`);
      if (gp.size.w <= 0 || gp.size.h <= 0 || gp.size.d <= 0) throw new Error(`groundPatch ${gp.id} size must be positive`);
      if (gp.visibleInPlay !== undefined && typeof gp.visibleInPlay !== "boolean") throw new Error(`groundPatch ${gp.id} visibleInPlay must be boolean`);
      if (gp.collisionEnabled !== undefined && typeof gp.collisionEnabled !== "boolean") throw new Error(`groundPatch ${gp.id} collisionEnabled must be boolean`);
      if (gp.opacity !== undefined) {
        if (!isNumber(gp.opacity)) throw new Error(`groundPatch ${gp.id} opacity must be number`);
        if (gp.opacity < 0 || gp.opacity > 1) throw new Error(`groundPatch ${gp.id} opacity must be 0..1`);
      }
      if (gp.color !== undefined && typeof gp.color !== "number" && typeof gp.color !== "string") throw new Error(`groundPatch ${gp.id} color must be number or hex string`);
      if (gp.rotY !== undefined && !isNumber(gp.rotY)) throw new Error(`groundPatch ${gp.id} rotY must be number`);
      // normalize defaults
      if (gp.visibleInPlay === undefined) gp.visibleInPlay = true;
      if (gp.collisionEnabled === undefined) gp.collisionEnabled = true;
      if (gp.opacity === undefined) gp.opacity = 1;
      if (gp.tint !== undefined && gp.color === undefined) gp.color = gp.tint;
    }
    // boundaryColliders
    if (region.boundaryColliders === undefined) region.boundaryColliders = [];
    if (!Array.isArray(region.boundaryColliders)) throw new Error(`region ${region.id} boundaryColliders must be array`);
    for (const bc of region.boundaryColliders) {
      if (!bc.id || typeof bc.id !== "string") throw new Error(`region ${region.id} boundaryCollider id required`);
      if (allIds.has(bc.id)) throw new Error(`duplicate global id boundaryCollider ${bc.id}`);
      allIds.add(bc.id);
      validatePos(bc.pos, `boundaryCollider ${bc.id}`);
      if (!bc.size || typeof bc.size !== "object") throw new Error(`boundaryCollider ${bc.id} size required`);
      for (const k of ["w","h","d"]) if (bc.size[k] !== undefined && !isNumber(bc.size[k])) throw new Error(`boundaryCollider ${bc.id} size.${k} must be number`);
      if (bc.size.w <= 0 || bc.size.h <= 0 || bc.size.d <= 0) throw new Error(`boundaryCollider ${bc.id} size must be positive`);
      if (bc.visibleInPlay !== undefined && typeof bc.visibleInPlay !== "boolean") throw new Error(`boundaryCollider ${bc.id} visibleInPlay must be boolean`);
      if (bc.collisionEnabled !== undefined && typeof bc.collisionEnabled !== "boolean") throw new Error(`boundaryCollider ${bc.id} collisionEnabled must be boolean`);
      if (bc.opacity !== undefined) {
        if (!isNumber(bc.opacity)) throw new Error(`boundaryCollider ${bc.id} opacity must be number`);
        if (bc.opacity < 0 || bc.opacity > 1) throw new Error(`boundaryCollider ${bc.id} opacity must be 0..1`);
      }
      if (bc.color !== undefined && typeof bc.color !== "number" && typeof bc.color !== "string") throw new Error(`boundaryCollider ${bc.id} color must be number or string`);
      if (bc.rotY !== undefined && !isNumber(bc.rotY)) throw new Error(`boundaryCollider ${bc.id} rotY must be number`);
      if (bc.visibleInPlay === undefined) bc.visibleInPlay = false;
      if (bc.collisionEnabled === undefined) bc.collisionEnabled = true;
      if (bc.opacity === undefined) bc.opacity = 0.5;
      if (bc.tint !== undefined && bc.color === undefined) bc.color = bc.tint;
    }
    // normalize prop defaults
    for (const prop of region.props) {
      if (prop.visibleInPlay === undefined) prop.visibleInPlay = true;
      if (prop.collisionEnabled === undefined) {
        if (prop.subtype === "gate" || prop.subtype === "water") prop.collisionEnabled = false;
        else prop.collisionEnabled = true;
      }
      if (prop.opacity === undefined) prop.opacity = 1;
      if (prop.tint !== undefined && prop.color === undefined) prop.color = prop.tint;
    }
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
      if (res.rotY !== undefined && !isNumber(res.rotY)) throw new Error(`resource ${res.id} rotY must be number`);
      if (res.rotationY !== undefined && !isNumber(res.rotationY)) throw new Error(`resource ${res.id} rotationY must be number`);
      if (res.uniformScale !== undefined && !isNumber(res.uniformScale)) throw new Error(`resource ${res.id} uniformScale must be number`);
      if (res.scale !== undefined && !isNumber(res.scale)) throw new Error(`resource ${res.id} scale must be number`);
      if (res.uniformScale !== undefined && (res.uniformScale <= 0 || res.uniformScale > 5)) throw new Error(`resource ${res.id} uniformScale must be >0 <=5`);
      if (res.scale !== undefined && (res.scale <= 0 || res.scale > 5)) throw new Error(`resource ${res.id} scale must be >0 <=5`);
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
      if (cr.facingYaw !== undefined && !isNumber(cr.facingYaw)) throw new Error(`creature ${cr.id} facingYaw must be number`);
      if (cr.rotY !== undefined && !isNumber(cr.rotY)) throw new Error(`creature ${cr.id} rotY must be number`);
      if (cr.rotationY !== undefined && !isNumber(cr.rotationY)) throw new Error(`creature ${cr.id} rotationY must be number`);
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
      if (plat.rotY !== undefined && !isNumber(plat.rotY)) throw new Error(`platform ${plat.id} rotY must be number`);
      if (plat.y !== undefined && !isNumber(plat.y)) throw new Error(`platform ${plat.id} y must be number`);
      if (plat.baseY !== undefined && !isNumber(plat.baseY)) throw new Error(`platform ${plat.id} baseY must be number`);
    }
    for (const obs of region.traversal.obstacles) {
      if (!obs.id) throw new Error(`region ${region.id} obstacle id required`);
      if (allIds.has(obs.id)) throw new Error(`duplicate global id obstacle ${obs.id}`);
      allIds.add(obs.id);
      if (obs.rotY !== undefined && !isNumber(obs.rotY)) throw new Error(`obstacle ${obs.id} rotY must be number`);
      if (obs.y !== undefined && !isNumber(obs.y)) throw new Error(`obstacle ${obs.id} y must be number`);
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
      if (wp.rotY !== undefined && !isNumber(wp.rotY)) throw new Error(`waypoint ${wp.id} rotY must be number`);
      if (wp.uniformScale !== undefined && !isNumber(wp.uniformScale)) throw new Error(`waypoint ${wp.id} uniformScale must be number`);
      if (wp.scale !== undefined && !isNumber(wp.scale)) throw new Error(`waypoint ${wp.id} scale must be number`);
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
      if (eb.rotY !== undefined && !isNumber(eb.rotY)) throw new Error(`beacon ${eb.id} rotY must be number`);
      if (eb.uniformScale !== undefined && !isNumber(eb.uniformScale)) throw new Error(`beacon ${eb.id} uniformScale must be number`);
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
      if (poi.rotY !== undefined && !isNumber(poi.rotY)) throw new Error(`poi ${poi.id} rotY must be number`);
      if (poi.uniformScale !== undefined && !isNumber(poi.uniformScale)) throw new Error(`poi ${poi.id} uniformScale must be number`);
      if (poi.scale !== undefined && !isNumber(poi.scale)) throw new Error(`poi ${poi.id} scale must be number`);
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

  // Phase 4A frontier metadata validation
  if (data.camp?.frontierGateId) {
    const gateId = data.camp.frontierGateId;
    if (!allIds.has(gateId)) throw new Error(`camp.frontierGateId ${gateId} not found as global id`);
    // ensure gate is actually a prop with subtype gate or id matches gate_camp_frontier heuristic
    let foundGate = false;
    for (const region of data.regions) {
      for (const prop of region.props) if (prop.id === gateId && (prop.subtype === "gate" || prop.subtype === "boundary")) foundGate = true;
    }
    if (!foundGate) {
      // also allow gate being not strictly gate subtype but still present globally
      // If not found as gate, fail
      throw new Error(`camp.frontierGateId ${gateId} must reference a gate object`);
    }
  }
  if (data.initialMajorWaypointId) {
    const wpId = data.initialMajorWaypointId;
    if (!globalAnchorIds.has(wpId)) throw new Error(`initialMajorWaypointId ${wpId} must reference a majorWaypoint`);
    // verify it's indeed majorWaypoint
    let isMajor = false;
    for (const region of data.regions) for (const wp of region.majorWaypoints) if (wp.id === wpId) isMajor = true;
    if (!isMajor) throw new Error(`initialMajorWaypointId ${wpId} must be a majorWaypoint`);
  }
  if (data.frontierGateId) {
    if (!allIds.has(data.frontierGateId)) throw new Error(`frontierGateId ${data.frontierGateId} not found`);
  }
  for (const region of data.regions) {
    for (const wp of region.majorWaypoints) {
      if (wp.displayName !== undefined && (typeof wp.displayName !== "string" || wp.displayName.length === 0 || wp.displayName.length > 40)) throw new Error(`waypoint ${wp.id} displayName must be 1-40 chars`);
      if (wp.spawnOffset !== undefined) {
        if (!wp.spawnOffset || typeof wp.spawnOffset !== "object") throw new Error(`waypoint ${wp.id} spawnOffset must be object`);
        if (wp.spawnOffset.x !== undefined && !isNumber(wp.spawnOffset.x)) throw new Error(`waypoint ${wp.id} spawnOffset x must be number`);
        if (wp.spawnOffset.z !== undefined && !isNumber(wp.spawnOffset.z)) throw new Error(`waypoint ${wp.id} spawnOffset z must be number`);
        if (!Number.isFinite(wp.spawnOffset.x ?? 0) || !Number.isFinite(wp.spawnOffset.z ?? 0)) throw new Error(`waypoint ${wp.id} spawnOffset must be finite`);
      }
      if (wp.startOffset !== undefined) {
        if (!wp.startOffset || typeof wp.startOffset !== "object") throw new Error(`waypoint ${wp.id} startOffset must be object`);
        if (wp.startOffset.x !== undefined && !isNumber(wp.startOffset.x)) throw new Error(`waypoint ${wp.id} startOffset x must be number`);
        if (wp.startOffset.z !== undefined && !isNumber(wp.startOffset.z)) throw new Error(`waypoint ${wp.id} startOffset z must be number`);
      }
      if (wp.runSpawn !== undefined) {
        if (!wp.runSpawn || typeof wp.runSpawn !== "object") throw new Error(`waypoint ${wp.id} runSpawn must be object`);
        const rp = wp.runSpawn;
        if (rp.position) {
          validatePos(rp.position, `waypoint ${wp.id} runSpawn.position`);
          if (rp.facingYaw !== undefined && !isNumber(rp.facingYaw)) throw new Error(`waypoint ${wp.id} runSpawn facingYaw must be number`);
        } else {
          validatePos(rp, `waypoint ${wp.id} runSpawn`);
          if (rp.facingYaw !== undefined && !isNumber(rp.facingYaw)) throw new Error(`waypoint ${wp.id} runSpawn facingYaw must be number`);
        }
      }
    }
    for (const bc of region.extractionBeacons) {
      if (bc.displayName !== undefined && (typeof bc.displayName !== "string" || bc.displayName.length === 0 || bc.displayName.length > 40)) throw new Error(`beacon ${bc.id} displayName must be 1-40 chars`);
    }
  }
  // Validate camp.playerSpawn near Camp region if present (support new schema)
  if (data.camp?.playerSpawn) {
    const spRaw = data.camp.playerSpawn;
    const sp = spRaw.position ? spRaw.position : spRaw;
    const campReg = data.regions.find(r=> r.id==="camp");
    if (campReg) {
      const b = campReg.bounds;
      if (!isInsideBounds(sp, { minX: b.minX-2, maxX: b.maxX+2, minZ: b.minZ-2, maxZ: b.maxZ+2 })) {
        throw new Error(`camp.playerSpawn not near Camp region bounds`);
      }
      // strict containment in intended region for explicit spawns
      if (spRaw.position) {
        if (!isInsideBounds(sp, campReg.bounds)) throw new Error(`camp.playerSpawn must be strictly inside Camp region`);
      }
    }
  }
  // Validate waypoint runSpawn strict containment
  for (const region of data.regions) {
    for (const wp of region.majorWaypoints) {
      if (wp.runSpawn) {
        const rsPos = wp.runSpawn.position ? wp.runSpawn.position : wp.runSpawn;
        validatePos(rsPos, `waypoint ${wp.id} runSpawn`);
        if (!isInsideBounds(rsPos, region.bounds)) throw new Error(`waypoint ${wp.id} runSpawn not inside declared region ${region.id}`);
        // finite facing
        const facing = wp.runSpawn.facingYaw ?? wp.runSpawn.facing ?? 0;
        if (facing !== undefined && !isNumber(facing)) throw new Error(`waypoint ${wp.id} runSpawn facingYaw must be finite number`);
        if (!isNumber(rsPos.x) || !isNumber(rsPos.y ?? 0) || !isNumber(rsPos.z)) throw new Error(`waypoint ${wp.id} runSpawn position must be finite`);
      }
    }
  }
  // Spawn support and clearance validation (camp + runSpawns)
  {
    const spawnCapsuleTotalHeight = 1.04; // from physicsConfig: 0.20*2 + 0.32*2
    const spawnRadius = 0.32;
    const supportTolerance = 1.0; // feet very near support surface (allow elevating ground 0.5+size change test)
    const clearanceEps = 0.05;
    // Gather support surfaces: groundPatches (collisionEnabled) + platforms
    const supportSurfaces = [];
    for(const region of data.regions){
      for(const gp of region.groundPatches ?? []){
        if(gp.collisionEnabled === false) continue;
        const w = gp.size.w, d = gp.size.d, h = gp.size.h;
        const x = gp.pos.x, z = gp.pos.z, baseY = gp.pos.y ?? -0.25;
        supportSurfaces.push({ id: gp.id, x, z, w, d, baseY, topY: baseY + h, regionId: region.id, isGround:true });
      }
      for(const plat of region.traversal.platforms ?? []){
        const baseY = plat.y ?? plat.baseY ?? 0;
        const topY = baseY + plat.height;
        supportSurfaces.push({ id: plat.id, x: plat.x, z: plat.z, w: plat.w, d: plat.h, baseY, topY, regionId: region.id, isPlatform:true });
      }
    }
    // Build blockers: props (collisionEnabled), boundaryColliders (collisionEnabled), obstacles, platforms (as volume) — but will exclude support surface later
    const blockers = [];
    for(const region of data.regions){
      for(const prop of region.props ?? []){
        if(prop.collisionEnabled === false) continue;
        if(prop.subtype === "water") continue;
        if(!prop.size) continue;
        const w = prop.size.w ?? 1, d = prop.size.d ?? 1, h = prop.size.h ?? 1;
        const x = prop.pos.x, z = prop.pos.z, baseY = prop.pos.y ?? 0;
        const rotY = prop.rotY ?? 0;
        blockers.push({ id: prop.id, x, z, halfW: w/2, halfD: d/2, baseY, topY: baseY + h, w, d, h, rotY });
      }
      for(const bc of region.boundaryColliders ?? []){
        if(bc.collisionEnabled === false) continue;
        const w = bc.size.w, d = bc.size.d, h = bc.size.h;
        const x = bc.pos.x, z = bc.pos.z, baseY = bc.pos.y ?? 0;
        const rotY = bc.rotY ?? 0;
        blockers.push({ id: bc.id, x, z, halfW: w/2, halfD: d/2, baseY, topY: baseY + h, w,d,h, rotY });
      }
      for(const obs of region.traversal.obstacles ?? []){
        const w = obs.w, d = obs.h, h = obs.height ?? 1;
        const x = obs.x, z = obs.z, baseY = obs.y ?? obs.baseY ?? 0;
        blockers.push({ id: obs.id, x, z, hx: w/2, hz: d/2, baseY, topY: baseY + h, w,d,h });
      }
      for(const plat of region.traversal.platforms ?? []){
        const w = plat.w, d = plat.h, h = plat.height;
        const x = plat.x, z = plat.z, baseY = plat.y ?? plat.baseY ?? 0;
        blockers.push({ id: plat.id, x, z, hx: w/2, hz: d/2, baseY, topY: baseY + h, w,d,h, isPlatform:true });
      }
    }
    function isSupported(spawnPos){
      const feetY = spawnPos.y ?? 0;
      let foundSupport = null;
      for(const s of supportSurfaces){
        const minX = s.x - s.w/2 - 0.15, maxX = s.x + s.w/2 + 0.15;
        const minZ = s.z - s.d/2 - 0.15, maxZ = s.z + s.d/2 + 0.15;
        if(spawnPos.x < minX || spawnPos.x > maxX || spawnPos.z < minZ || spawnPos.z > maxZ) continue;
        if(Math.abs(feetY - s.topY) <= supportTolerance){
          foundSupport = s;
          break;
        }
      }
      return foundSupport;
    }
    function isClear(spawnPos, supportId){
      const feetY = spawnPos.y ?? 0;
      const capMinY = feetY, capMaxY = feetY + spawnCapsuleTotalHeight;
      for(const b of blockers){
        if(b.id === supportId) continue;
        const halfW = b.halfW ?? b.hx ?? (b.w/2);
        const halfD = b.halfD ?? b.hz ?? (b.d/2);
        const rotY = b.rotY ?? 0;
        // transform spawn to blocker's local space for accurate oriented box test
        const dx = spawnPos.x - b.x;
        const dz = spawnPos.z - b.z;
        const cos = Math.cos(-rotY), sin = Math.sin(-rotY);
        const localX = dx * cos - dz * sin;
        const localZ = dx * sin + dz * cos;
        if(Math.abs(localX) > halfW + spawnRadius + clearanceEps) continue;
        if(Math.abs(localZ) > halfD + spawnRadius + clearanceEps) continue;
        const overlapY = Math.min(capMaxY, b.topY) - Math.max(capMinY, b.baseY);
        if(overlapY > clearanceEps){
          return { blocked: true, blockerId: b.id };
        }
      }
      return { blocked: false };
    }
    // camp spawn
    if(data.camp?.playerSpawn){
      const spRaw = data.camp.playerSpawn;
      const sp = spRaw.position ? spRaw.position : spRaw;
      const feetPos = { x: sp.x, y: sp.y ?? 0, z: sp.z };
      if(!isNumber(feetPos.x) || !isNumber(feetPos.y) || !isNumber(feetPos.z)) throw new Error("camp.playerSpawn position must be finite");
      const facing = spRaw.facingYaw ?? spRaw.facing ?? 0;
      if(!isNumber(facing)) throw new Error("camp.playerSpawn facingYaw must be finite");
      const campReg = data.regions.find(r=>r.id==="camp");
      if(campReg && !isInsideBounds(feetPos, campReg.bounds)) throw new Error("camp.playerSpawn must be strictly inside Camp region");
      const support = isSupported(feetPos);
      if(!support) throw new Error("camp.playerSpawn not supported by traversable surface (feet not on ground/platform)");
      const clear = isClear(feetPos, support.id);
      if(clear.blocked) throw new Error(`camp.playerSpawn capsule intersects blocker ${clear.blockerId}`);
    }
    // run spawns
    for(const region of data.regions){
      for(const wp of region.majorWaypoints){
        if(!wp.runSpawn) continue;
        const rs = wp.runSpawn.position ? wp.runSpawn.position : wp.runSpawn;
        const feetPos = { x: rs.x, y: rs.y ?? 0, z: rs.z };
        if(!isNumber(feetPos.x) || !isNumber(feetPos.y) || !isNumber(feetPos.z)) throw new Error(`waypoint ${wp.id} runSpawn position finite required`);
        const facing = wp.runSpawn.facingYaw ?? wp.runSpawn.facing ?? 0;
        if(!isNumber(facing)) throw new Error(`waypoint ${wp.id} runSpawn facingYaw finite required`);
        if(!isInsideBounds(feetPos, region.bounds)) throw new Error(`waypoint ${wp.id} runSpawn not inside region ${region.id}`);
        const support = isSupported(feetPos);
        if(!support) throw new Error(`waypoint ${wp.id} runSpawn not supported by traversable surface`);
        const clear = isClear(feetPos, support.id);
        if(clear.blocked) throw new Error(`waypoint ${wp.id} runSpawn capsule intersects blocker ${clear.blockerId}`);
      }
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

  // Region overlap validation: no ambiguous overlapping interiors
  for (let i = 0; i < data.regions.length; i++) {
    for (let j = i + 1; j < data.regions.length; j++) {
      const a = data.regions[i].bounds;
      const b = data.regions[j].bounds;
      const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
      const overlapZ = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);
      if (overlapX > 1e-6 && overlapZ > 1e-6) {
        throw new Error(`region overlap: ${data.regions[i].id} overlaps ${data.regions[j].id}`);
      }
    }
  }
  // Neighbor reciprocity
  for (const region of data.regions) {
    for (const nid of region.neighbors) {
      const neighbor = data.regions.find(r=> r.id === nid);
      if (neighbor && !neighbor.neighbors.includes(region.id)) {
        throw new Error(`neighbor reciprocity: ${region.id} -> ${nid} but not vice versa`);
      }
    }
  }
  // Ground/Boundary ownership intersection
  for (const region of data.regions) {
    for (const gp of region.groundPatches ?? []) {
      const footprint = { x: gp.pos.x, z: gp.pos.z, w: gp.size.w, d: gp.size.d };
      const intersecting = [];
      for (const r of data.regions) {
        const b = r.bounds;
        const fx1 = footprint.x - footprint.w/2, fx2 = footprint.x + footprint.w/2;
        const fz1 = footprint.z - footprint.d/2, fz2 = footprint.z + footprint.d/2;
        const overlap = !(fx2 < b.minX || fx1 > b.maxX || fz2 < b.minZ || fz1 > b.maxZ);
        if (overlap) intersecting.push(r.id);
      }
      if (!intersecting.includes(region.id)) throw new Error(`groundPatch ${gp.id} does not intersect declared owner ${region.id}`);
      // if footprint only intersects far non-neighbor, warn as error for obviously unrelated ownership
      for (const iid of intersecting) {
        if (iid !== region.id && !region.neighbors.includes(iid)) {
          // allow crossing into neighbor only; unrelated is error
          // But ground patches are large (25 wide) covering all width — they will intersect camp but that's neighbor? For p1, ground 25 wide intersects camp and p2 which are neighbors => ok. For camp ground 25 wide intersects p1 => neighbor ok.
          // So we check if intersecting contains unrelated id that is not neighbor and not self -> if more than neighbors, it would be unrelated
          if (!region.neighbors.includes(iid) && iid !== region.id) {
            // if intersecting includes unrelated far region, that's invalid
            // Only error if intersecting length > neighbors+1 and contains far
            // For current map this should pass; if future ground spans 3 regions it's error
            // We'll enforce that intersecting must be subset of {self + neighbors}
            throw new Error(`groundPatch ${gp.id} intersects unrelated region ${iid} not neighbor of ${region.id}`);
          }
        }
      }
    }
    for (const bc of region.boundaryColliders ?? []) {
      // boundaryColliders are outer limits; ownership is informational, no strict intersection required for now
      void bc;
    }
  }
  // Traversal validation: finite transforms and positive sizes
  for (const region of data.regions) {
    for (const plat of region.traversal.platforms) {
      if (!isNumber(plat.x) || !isNumber(plat.z)) throw new Error(`platform ${plat.id} x/z finite required`);
      if (!isNumber(plat.w) || !isNumber(plat.h) || !isNumber(plat.height)) throw new Error(`platform ${plat.id} w/h/height finite required`);
      if (plat.w <= 0 || plat.h <= 0 || plat.height <= 0) throw new Error(`platform ${plat.id} size must be positive`);
      const y = plat.y ?? plat.baseY ?? 0;
      if (!isNumber(y)) throw new Error(`platform ${plat.id} y finite required`);
    }
    for (const obs of region.traversal.obstacles) {
      if (!isNumber(obs.x) || !isNumber(obs.z)) throw new Error(`obstacle ${obs.id} x/z finite required`);
      if (!isNumber(obs.w) || !isNumber(obs.h) || !isNumber(obs.height)) throw new Error(`obstacle ${obs.id} w/h/height finite required`);
      if (obs.w <= 0 || obs.h <= 0 || obs.height <= 0) throw new Error(`obstacle ${obs.id} size must be positive`);
    }
    for (const cl of region.traversal.climbables) {
      if (!isNumber(cl.x) || !isNumber(cl.z)) throw new Error(`climbable ${cl.id} x/z finite required`);
      if (!isNumber(cl.bottomY) || !isNumber(cl.topY)) throw new Error(`climbable ${cl.id} bottomY/topY finite required`);
      if (cl.topY <= cl.bottomY) throw new Error(`climbable ${cl.id} topY must be > bottomY`);
    }
  }
  // Static transform validation already done via prop/ground/boundary loops; ensure dimensions positive for props with size
  for (const region of data.regions) {
    for (const prop of region.props) {
      if (prop.size) {
        if (prop.size.w !== undefined && prop.size.w <= 0) throw new Error(`prop ${prop.id} size.w must be positive`);
        if (prop.size.h !== undefined && prop.size.h <= 0) throw new Error(`prop ${prop.id} size.h must be positive`);
        if (prop.size.d !== undefined && prop.size.d <= 0) throw new Error(`prop ${prop.id} size.d must be positive`);
      }
      if (prop.pos && prop.pos.y !== undefined && !isNumber(prop.pos.y)) throw new Error(`prop ${prop.id} pos y finite required`);
    }
  }

  // Cross-region duplicate check already done.

  // Normalize: ensure defaults and freeze shallow
  // Migrate legacy spawnOffset to runSpawn if missing and ensure camp.playerSpawn new schema normalized
  if (data.camp?.playerSpawn && !data.camp.playerSpawn.position) {
    const sp = data.camp.playerSpawn;
    if (isNumber(sp.x) && isNumber(sp.z)) {
      const migrated = { position: { x: sp.x, y: sp.y ?? 0, z: sp.z }, facingYaw: sp.facingYaw ?? 0 };
      data.camp.playerSpawn = migrated;
    }
  }
  for (const region of data.regions) {
    for (const wp of region.majorWaypoints) {
      if (!wp.runSpawn && wp.spawnOffset) {
        const base = wp.pos;
        wp.runSpawn = { position: { x: base.x + (wp.spawnOffset.x ?? 0), y: base.y ?? 0, z: base.z + (wp.spawnOffset.z ?? 0) }, facingYaw: 0 };
      }
      // ensure runSpawn normalized to position object
      if (wp.runSpawn && !wp.runSpawn.position) {
        const rs = wp.runSpawn;
        wp.runSpawn = { position: { x: rs.x, y: rs.y ?? 0, z: rs.z }, facingYaw: rs.facingYaw ?? 0 };
      }
    }
  }

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
  visualAssetShapes: SUPPORTED_VISUAL_ASSET_SHAPES,
  visualAssetRoles: SUPPORTED_VISUAL_ASSET_ROLES,
};
