// src/world/worldValidator.js — normalization + validation for data-driven world (Phase 3.5A)
// Runtime systems consume normalized data, not raw JSON independently.

import { DEFAULT_RESOURCE_DROPS } from "../resources/resourceDropCatalog.js";
import { validateSurface, getSurfaceHeight } from "./terrainSurfaceModel.js";

const SUPPORTED_RESOURCE_TYPES = new Set(["tree", "rock", "fiber"]);
const SUPPORTED_CREATURE_TYPES = new Set(["rusher", "spitter"]);
const SUPPORTED_TEMPERAMENTS = new Set(["AGGRESSIVE", "TERRITORIAL", "DEFENSIVE", "SKITTISH"]);
const SUPPORTED_ANCHOR_TYPES = new Set(["majorWaypoint", "extractionBeacon"]);
const SUPPORTED_POI_TYPES = new Set(["chest", "barrier", "generic", "island"]);
const SUPPORTED_VISUAL_ASSET_SHAPES = new Set(["box", "cylinder", "cone", "sphere", "capsule", "icosahedron", "mesh"]);
const SUPPORTED_VISUAL_ASSET_ROLES = new Set(["prop", "harvestable", "wildkin"]);
const SUPPORTED_FEEDBACK_PROFILES = new Set(["wood", "stone", "fiber"]);
const SUPPORTED_PORTAL_STATES = new Set(["active", "ruined"]);
const PLAYER_MODEL_CLIP_STATES = ["idle", "walk", "run", "sneak", "jump", "fall", "dodge", "climb", "mantle", "attack", "hurt"];
const LOCAL_MODEL_PATH = /^assets\/models\/[a-z][a-z0-9_-]*\/model\.glb$/;
function validateModelLocomotion(model) {
  if (model.locomotion === undefined) return;
  if (!model.locomotion || typeof model.locomotion !== "object" || Array.isArray(model.locomotion)) throw new Error("model locomotion must map clips to authored meters per second");
  for (const [state, speed] of Object.entries(model.locomotion)) {
    if (!["walk", "run", "sneak"].includes(state) || !isNumber(speed) || speed <= 0 || !model.clips?.[state]) throw new Error("model locomotion requires a mapped movement clip and positive finite authored speed");
  }
}
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

function validatePlayerVisual(playerVisual) {
  if (!playerVisual || typeof playerVisual !== "object") throw new Error("playerVisual must be an object");
  if (typeof playerVisual.id !== "string" || !/^[a-z][a-z0-9_]*$/.test(playerVisual.id)) throw new Error("playerVisual id must use lowercase letters, numbers, and underscores");
  const model = playerVisual.model;
  if (!model || typeof model !== "object") throw new Error("playerVisual model required");
  if (typeof model.path !== "string" || !LOCAL_MODEL_PATH.test(model.path)) throw new Error("playerVisual model path must use a local assets/models/<revision>/model.glb package");
  if (!isNumber(model.scale) || model.scale <= 0 || model.scale > 100) throw new Error("playerVisual model scale must be positive finite");
  validatePos(model.pivot, "playerVisual model pivot");
  for (const axis of ["x", "y", "z"]) if (!isNumber(model.pivot[axis])) throw new Error(`playerVisual model pivot.${axis} must be finite`);
  if (!model.clips || typeof model.clips !== "object") throw new Error("playerVisual model clips required");
  for (const state of PLAYER_MODEL_CLIP_STATES) {
    if (typeof model.clips[state] !== "string" || !model.clips[state].trim()) throw new Error(`playerVisual model clip ${state} required`);
  }
  const hand = playerVisual.handAnchor;
  validateModelLocomotion(model);
  if (!hand || typeof hand !== "object" || typeof hand.bone !== "string" || !hand.bone.trim()) throw new Error("playerVisual handAnchor bone required");
  validatePos(hand.position, "playerVisual handAnchor position");
  validatePos(hand.rotation, "playerVisual handAnchor rotation");
  for (const axis of ["x", "y", "z"]) {
    if (!isNumber(hand.position[axis]) || !isNumber(hand.rotation[axis])) throw new Error(`playerVisual handAnchor ${axis} must be finite`);
  }
}

function isInsideCourseZone(pos, zone) {
  return Math.abs(pos.x - zone.pos.x) <= zone.size.w / 2
    && Math.abs((pos.y ?? 0) - (zone.pos.y ?? 0)) <= zone.size.h / 2
    && Math.abs(pos.z - zone.pos.z) <= zone.size.d / 2;
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
    if (drop.visualAssetId !== undefined && (typeof drop.visualAssetId !== "string" || !drop.visualAssetId)) {
      throw new Error(`resource drop ${drop.id} visualAssetId must be a non-empty string`);
    }
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
    if (asset.model !== undefined) {
      const model = asset.model;
      if (!model || typeof model !== "object") throw new Error(`Visual Asset ${asset.id} model must be an object`);
      if (typeof model.path !== "string" || !LOCAL_MODEL_PATH.test(model.path)) throw new Error(`Visual Asset ${asset.id} model path must use a local assets/models/<revision>/model.glb package`);
      if (model.scale !== undefined && (!isNumber(model.scale) || model.scale <= 0 || model.scale > 100)) throw new Error(`Visual Asset ${asset.id} model scale must be positive finite`);
      if (model.pivot !== undefined) {
        validatePos(model.pivot, `Visual Asset ${asset.id} model pivot`);
        for (const axis of ["x", "y", "z"]) if (!isNumber(model.pivot[axis])) throw new Error(`Visual Asset ${asset.id} model pivot.${axis} must be finite`);
      }
      if (model.clips !== undefined) {
        if (!model.clips || typeof model.clips !== "object") throw new Error(`Visual Asset ${asset.id} model clips must be an object`);
        for (const [state, name] of Object.entries(model.clips)) {
          if (!['idle', 'walk', 'run', 'attack', 'hurt'].includes(state) || typeof name !== 'string' || !name.trim()) throw new Error(`Visual Asset ${asset.id} model clip ${state} must use idle/walk/run/attack/hurt and a non-empty name`);
        }
      }
      validateModelLocomotion(model);
    }
    if (asset.parts === undefined && asset.model) asset.parts = [];
    if (!Array.isArray(asset.parts)) throw new Error(`Visual Asset ${asset.id} parts must be an array`);
    const partIds = new Set();
    for (const part of asset.parts) {
      if (!part?.id || typeof part.id !== "string") throw new Error(`Visual Asset ${asset.id} part id required`);
      if (partIds.has(part.id)) throw new Error(`Visual Asset ${asset.id} duplicate part id ${part.id}`);
      partIds.add(part.id);
      if (!SUPPORTED_VISUAL_ASSET_SHAPES.has(part.shape)) throw new Error(`Visual Asset ${asset.id} part ${part.id} unsupported shape ${part.shape}`);
      if (part.shape === 'mesh') {
        const vertices=part.geometry?.positions, indices=part.geometry?.indices;
        if(!Array.isArray(vertices)||vertices.length<9||vertices.length>180000||vertices.length%3||vertices.some(v=>!isNumber(v)||Math.abs(v)>100))throw new Error(`Visual Asset ${asset.id} part ${part.id} invalid mesh vertices`);
        if(!Array.isArray(indices)||indices.length<3||indices.length>300000||indices.length%3||indices.some(i=>!Number.isInteger(i)||i<0||i>=vertices.length/3))throw new Error(`Visual Asset ${asset.id} part ${part.id} invalid mesh indices`);
      }
      validatePos(part.position, `Visual Asset ${asset.id} part ${part.id} position`);
      validatePos(part.rotation, `Visual Asset ${asset.id} part ${part.id} rotation`);
      validatePos(part.scale, `Visual Asset ${asset.id} part ${part.id} scale`);
      for (const axis of ["x", "y", "z"]) {
        if (!isNumber(part.position[axis])) throw new Error(`Visual Asset ${asset.id} part ${part.id} position.${axis} must be finite`);
        if (!isNumber(part.rotation[axis])) throw new Error(`Visual Asset ${asset.id} part ${part.id} rotation.${axis} must be finite`);
        if (!isNumber(part.scale[axis]) || part.scale[axis] <= 0) throw new Error(`Visual Asset ${asset.id} part ${part.id} scale.${axis} must be positive finite`);
      }
      validateCanonicalColor(part.color, `Visual Asset ${asset.id} part ${part.id}`);
      if(part.flatShading!==undefined&&typeof part.flatShading!=='boolean')throw new Error(`Visual Asset ${asset.id} part ${part.id} invalid shading`);
      if(part.side!==undefined&&![0,1,2].includes(part.side))throw new Error(`Visual Asset ${asset.id} part ${part.id} invalid material side`);
      if(part.roughness!==undefined&&(!isNumber(part.roughness)||part.roughness<0||part.roughness>1))throw new Error(`Visual Asset ${asset.id} part ${part.id} invalid roughness`);
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
      if (harvestable.remnantVisualAssetId !== undefined && harvestable.remnantVisualAssetId !== null
        && (typeof harvestable.remnantVisualAssetId !== "string" || !harvestable.remnantVisualAssetId)) {
        throw new Error(`Visual Asset ${asset.id} remnantVisualAssetId must be null or a non-empty string`);
      }
    }
    if (asset.gameplay.role === "wildkin") {
      const wildkin = asset.gameplay.wildkin;
      if (!wildkin || typeof wildkin !== "object") throw new Error(`Visual Asset ${asset.id} Wildkin settings required`);
      if (!SUPPORTED_CREATURE_TYPES.has(wildkin.archetype)) throw new Error(`Visual Asset ${asset.id} unsupported Wildkin archetype ${wildkin.archetype}`);
      if (!SUPPORTED_TEMPERAMENTS.has(wildkin.temperament)) throw new Error(`Visual Asset ${asset.id} unsupported Wildkin temperament ${wildkin.temperament}`);
      for (const [key, min, max] of [
        ["health", 1, 50], ["moveSpeed", 0.1, 12], ["damage", 0, 20], ["respawnSeconds", 1, 300],
        ["roamRadius", 0, 50], ["noticeRadius", 0.25, 50], ["personalSpace", 0.1, 20], ["leashRadius", 0.5, 100],
      ]) {
        if (!isNumber(wildkin[key]) || wildkin[key] < min || wildkin[key] > max) {
          throw new Error(`Visual Asset ${asset.id} Wildkin ${key} must be ${min}..${max}`);
        }
      }
      if (typeof wildkin.speciesTag !== "string" || !wildkin.speciesTag.trim()) throw new Error(`Visual Asset ${asset.id} Wildkin speciesTag required`);
      if (!Array.isArray(wildkin.hostileSpecies) || wildkin.hostileSpecies.some((tag) => typeof tag !== "string" || !tag.trim())) {
        throw new Error(`Visual Asset ${asset.id} Wildkin hostileSpecies must be an array of strings`);
      }
    }
  }
  if (data.playerVisual !== undefined) validatePlayerVisual(data.playerVisual);
  for (const drop of data.resourceDrops) {
    if (drop.visualAssetId && !visualAssetIds.has(drop.visualAssetId)) throw new Error(`resource drop ${drop.id} unresolved Visual Asset ${drop.visualAssetId}`);
  }
  for (const asset of data.visualAssets) {
    const remnantId = asset.gameplay?.harvestable?.remnantVisualAssetId;
    if (remnantId && !visualAssetIds.has(remnantId)) throw new Error(`Visual Asset ${asset.id} unresolved remnant Visual Asset ${remnantId}`);
  }
  if (data.lootTables === undefined) data.lootTables = [];
  if (!Array.isArray(data.lootTables)) throw new Error("world.lootTables must be an array");
  const lootTableIds = new Set();
  for (const table of data.lootTables) {
    if (!table?.id || typeof table.id !== "string") throw new Error("loot table id required");
    if (lootTableIds.has(table.id)) throw new Error(`duplicate loot table id ${table.id}`);
    lootTableIds.add(table.id);
    if (!Array.isArray(table.rewards) || table.rewards.length === 0) throw new Error(`loot table ${table.id} rewards required`);
    for (const reward of table.rewards) {
      if (reward.type !== "resource" && reward.type !== "xp") throw new Error(`loot table ${table.id} unsupported reward ${reward.type}`);
      if (!Number.isInteger(reward.amount) || reward.amount <= 0) throw new Error(`loot table ${table.id} reward amount must be positive integer`);
      if (reward.type === "resource" && !resourceDropIds.has(reward.id)) throw new Error(`loot table ${table.id} unresolved resource ${reward.id}`);
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
    const boundsWidth = region.bounds.maxX - region.bounds.minX;
    const boundsDepth = region.bounds.maxZ - region.bounds.minZ;
    if (region.size === undefined) region.size = { width: boundsWidth, depth: boundsDepth };
    if (!region.size || !isNumber(region.size.width) || !isNumber(region.size.depth) || region.size.width <= 0 || region.size.depth <= 0) {
      throw new Error(`section ${region.id} size must have positive width/depth`);
    }
    if (Math.abs(region.size.width - boundsWidth) > 1e-6 || Math.abs(region.size.depth - boundsDepth) > 1e-6) {
      throw new Error(`section ${region.id} size must match local bounds`);
    }
    if (region.sectionType === "camp" && (region.size.width !== 100 || region.size.depth !== 100)) throw new Error("Camp section must be 100x100");
    // Expedition islands range from compact encounters to deliberately authored
    // larger exploration envelopes. Rectangular ridges remain bounded for mobile.
    if (region.sectionType === "expedition" && (
      region.size.width < 50 || region.size.width > 160 || region.size.depth < 50 || region.size.depth > 160
    )) throw new Error(`expedition section ${region.id} must be 50..160 units per axis`);
    if (region.sectionProfile === undefined) region.sectionProfile = null;
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
    if (region.surface !== undefined) validateSurface(region.surface, `region ${region.id} surface`);
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
      if (res.level === undefined && res.tier === undefined) res.level = 1;
      if (res.level !== undefined && (!Number.isInteger(res.level) || res.level < 1)) throw new Error(`resource ${res.id} level must be positive integer`);
      if (res.tier !== undefined && (!Number.isInteger(res.tier) || res.tier < 1)) throw new Error(`resource ${res.id} tier must be positive integer`);
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
      if (cr.level === undefined) cr.level = 1;
      if (!Number.isInteger(cr.level) || cr.level < 1) throw new Error(`creature ${cr.id} level must be positive integer`);
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
      if (wp.uniformScale !== undefined && (wp.uniformScale <= 0 || wp.uniformScale > 5)) throw new Error(`waypoint ${wp.id} uniformScale must be >0 <=5`);
      if (wp.scale !== undefined && !isNumber(wp.scale)) throw new Error(`waypoint ${wp.id} scale must be number`);
      if (wp.visualAssetId !== undefined && !visualAssetIds.has(wp.visualAssetId)) throw new Error(`waypoint ${wp.id} unresolved Visual Asset ${wp.visualAssetId}`);
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
      if (eb.uniformScale !== undefined && (eb.uniformScale <= 0 || eb.uniformScale > 5)) throw new Error(`beacon ${eb.id} uniformScale must be >0 <=5`);
      if (eb.visualAssetId !== undefined && !visualAssetIds.has(eb.visualAssetId)) throw new Error(`beacon ${eb.id} unresolved Visual Asset ${eb.visualAssetId}`);
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

    for (const key of ["entryPoints", "portalGates", "jumpPads", "parkourStarts", "parkourCheckpoints", "parkourEnds", "parkourCourseZones", "killVolumes", "lootChests"]) {
      if (region[key] === undefined) region[key] = [];
      if (!Array.isArray(region[key])) throw new Error(`section ${region.id} ${key} must be an array`);
    }
    for (const entry of region.entryPoints) {
      if (!entry.id || typeof entry.id !== "string" || allIds.has(entry.id)) throw new Error(`duplicate or missing entry point id ${entry.id}`);
      allIds.add(entry.id);
      validatePos(entry.pos, `entry point ${entry.id}`);
      if (!isInsideBounds(entry.pos, region.bounds)) throw new Error(`entry point ${entry.id} outside section ${region.id}`);
      if (entry.facingYaw === undefined) entry.facingYaw = 0;
      if (!isNumber(entry.facingYaw)) throw new Error(`entry point ${entry.id} facingYaw must be finite`);
    }
    for (const gate of region.portalGates) {
      if (!gate.id || typeof gate.id !== "string" || allIds.has(gate.id)) throw new Error(`duplicate or missing portal gate id ${gate.id}`);
      allIds.add(gate.id);
      validatePos(gate.pos, `portal gate ${gate.id}`);
      if (!isInsideBounds(gate.pos, region.bounds)) throw new Error(`portal gate ${gate.id} outside section ${region.id}`);
      if (!SUPPORTED_PORTAL_STATES.has(gate.state)) throw new Error(`portal gate ${gate.id} state must be active or ruined`);
      const campLink = gate.role === "campLink" || gate.campReturnEnabled === true;
      const oneWayArrival = (gate.role === "arrival" || campLink) && gate.travelEnabled === false;
      if (!oneWayArrival && typeof gate.targetGateId !== "string" && (typeof gate.targetSectionId !== "string" || typeof gate.targetEntryId !== "string")) throw new Error(`portal gate ${gate.id} target gate or section/entry required`);
      if (gate.targetGateId !== undefined && (typeof gate.targetGateId !== "string" || !gate.targetGateId)) throw new Error(`portal gate ${gate.id} targetGateId must be a non-empty string`);
      if (gate.role !== undefined && gate.role !== "arrival" && gate.role !== "campLink") throw new Error(`portal gate ${gate.id} role must be arrival or campLink when specified`);
      if (gate.travelEnabled !== undefined && typeof gate.travelEnabled !== "boolean") throw new Error(`portal gate ${gate.id} travelEnabled must be boolean`);
      if (gate.campReturnEnabled !== undefined && typeof gate.campReturnEnabled !== "boolean") throw new Error(`portal gate ${gate.id} campReturnEnabled must be boolean`);
      if (gate.rotY === undefined) gate.rotY = 0;
      if (!isNumber(gate.rotY)) throw new Error(`portal gate ${gate.id} rotY must be finite`);
      if (gate.triggerRadius === undefined) gate.triggerRadius = 1.85;
      if (!isNumber(gate.triggerRadius) || gate.triggerRadius <= 0) throw new Error(`portal gate ${gate.id} triggerRadius must be positive`);
      for (const field of ["visualAssetId", "activeVisualAssetId", "ruinedVisualAssetId"]) {
        if (gate[field] !== undefined && !visualAssetIds.has(gate[field])) throw new Error(`portal gate ${gate.id} unresolved Visual Asset ${gate[field]}`);
      }
      if (gate.requirements !== undefined) {
        if (!gate.requirements || typeof gate.requirements !== "object") throw new Error(`portal gate ${gate.id} requirements must be object`);
        if (gate.requirements.minPlayerLevel !== undefined && (!Number.isInteger(gate.requirements.minPlayerLevel) || gate.requirements.minPlayerLevel < 1)) throw new Error(`portal gate ${gate.id} minPlayerLevel must be positive integer`);
        for (const [resourceId, amount] of Object.entries(gate.requirements.resources ?? {})) {
          if (!resourceDropIds.has(resourceId) || !Number.isInteger(amount) || amount <= 0) throw new Error(`portal gate ${gate.id} invalid resource requirement ${resourceId}`);
        }
      }
    }
    for (const pad of region.jumpPads) {
      if (!pad.id || typeof pad.id !== "string" || allIds.has(pad.id)) throw new Error(`duplicate or missing Jump Pad id ${pad.id}`);
      allIds.add(pad.id);
      validatePos(pad.pos, `Jump Pad ${pad.id}`);
      if (!isInsideBounds(pad.pos, region.bounds)) throw new Error(`Jump Pad ${pad.id} outside section ${region.id}`);
      if (pad.rotY === undefined) pad.rotY = 0;
      if (pad.triggerRadius === undefined) pad.triggerRadius = 1.1;
      if (pad.cooldown === undefined) pad.cooldown = 0.8;
      if (pad.powerPreset === undefined) pad.powerPreset = "medium";
      if (!["low", "medium", "high"].includes(pad.powerPreset)) throw new Error(`Jump Pad ${pad.id} powerPreset must be low, medium, or high`);
      if (pad.verticalLaunch === undefined) pad.verticalLaunch = null;
      for (const key of ["rotY", "triggerRadius", "cooldown"]) if (!isNumber(pad[key])) throw new Error(`Jump Pad ${pad.id} ${key} must be finite`);
      if (pad.verticalLaunch !== null && (!isNumber(pad.verticalLaunch) || pad.verticalLaunch <= 0)) throw new Error(`Jump Pad ${pad.id} verticalLaunch override must be positive or null`);
      if (pad.horizontalLaunch !== undefined && !isNumber(pad.horizontalLaunch)) throw new Error(`Jump Pad ${pad.id} legacy horizontalLaunch must be finite`);
      if (pad.triggerRadius <= 0 || pad.cooldown < 0) throw new Error(`Jump Pad ${pad.id} trigger/cooldown values invalid`);
      if (pad.visualAssetId !== undefined && !visualAssetIds.has(pad.visualAssetId)) throw new Error(`Jump Pad ${pad.id} unresolved Visual Asset ${pad.visualAssetId}`);
    }
    for (const start of region.parkourStarts) {
      if (!start.id || typeof start.id !== "string" || allIds.has(start.id) || typeof start.courseId !== "string") throw new Error(`invalid Parkour Start ${start.id}`);
      allIds.add(start.id); validatePos(start.pos, `Parkour Start ${start.id}`);
      if (!isInsideBounds(start.pos, region.bounds)) throw new Error(`Parkour Start ${start.id} outside section ${region.id}`);
      start.triggerRadius ??= 1.8;
      if (!isNumber(start.triggerRadius) || start.triggerRadius <= 0) throw new Error(`Parkour Start ${start.id} triggerRadius must be positive`);
      if (start.visualAssetId !== undefined && !visualAssetIds.has(start.visualAssetId)) throw new Error(`Parkour Start ${start.id} unresolved Visual Asset ${start.visualAssetId}`);
    }
    for (const checkpoint of region.parkourCheckpoints) {
      if (!checkpoint.id || typeof checkpoint.id !== "string" || allIds.has(checkpoint.id) || typeof checkpoint.courseId !== "string") throw new Error(`invalid Parkour Checkpoint ${checkpoint.id}`);
      allIds.add(checkpoint.id); validatePos(checkpoint.pos, `Parkour Checkpoint ${checkpoint.id}`);
      if (!isInsideBounds(checkpoint.pos, region.bounds)) throw new Error(`Parkour Checkpoint ${checkpoint.id} outside section ${region.id}`);
      checkpoint.triggerRadius ??= 1.8;
      if (!isNumber(checkpoint.triggerRadius) || checkpoint.triggerRadius <= 0) throw new Error(`Parkour Checkpoint ${checkpoint.id} triggerRadius must be positive`);
      if (checkpoint.visualAssetId !== undefined && !visualAssetIds.has(checkpoint.visualAssetId)) throw new Error(`Parkour Checkpoint ${checkpoint.id} unresolved Visual Asset ${checkpoint.visualAssetId}`);
    }
    for (const end of region.parkourEnds) {
      if (!end.id || typeof end.id !== "string" || allIds.has(end.id) || typeof end.courseId !== "string") throw new Error(`invalid Parkour End ${end.id}`);
      allIds.add(end.id); validatePos(end.pos, `Parkour End ${end.id}`);
      if (!isInsideBounds(end.pos, region.bounds)) throw new Error(`Parkour End ${end.id} outside section ${region.id}`);
      end.triggerRadius ??= 1.8;
      if (!isNumber(end.triggerRadius) || end.triggerRadius <= 0) throw new Error(`Parkour End ${end.id} triggerRadius must be positive`);
      if (end.visualAssetId !== undefined && !visualAssetIds.has(end.visualAssetId)) throw new Error(`Parkour End ${end.id} unresolved Visual Asset ${end.visualAssetId}`);
    }
    for (const zone of region.parkourCourseZones) {
      if (!zone.id || typeof zone.id !== "string" || allIds.has(zone.id) || !zone.courseId || typeof zone.courseId !== "string") throw new Error(`invalid Parkour Course Zone ${zone.id}`);
      allIds.add(zone.id); validatePos(zone.pos, `Parkour Course Zone ${zone.id}`);
      if (zone.rotY !== undefined && !isNumber(zone.rotY)) throw new Error(`Parkour Course Zone ${zone.id} rotation must be finite`);
      if (!zone.size || !isNumber(zone.size.w) || !isNumber(zone.size.h) || !isNumber(zone.size.d) || zone.size.w <= 0 || zone.size.h <= 0 || zone.size.d <= 0) throw new Error(`Parkour Course Zone ${zone.id} size must be positive`);
    }
    for (const volume of region.killVolumes) {
      if (!volume.id || typeof volume.id !== "string" || allIds.has(volume.id)) throw new Error(`invalid Kill Volume ${volume.id}`);
      allIds.add(volume.id); validatePos(volume.pos, `Kill Volume ${volume.id}`);
      if (volume.rotY !== undefined && !isNumber(volume.rotY)) throw new Error(`Kill Volume ${volume.id} rotation must be finite`);
      if (!volume.size || !isNumber(volume.size.w) || !isNumber(volume.size.h) || !isNumber(volume.size.d) || volume.size.w <= 0 || volume.size.h <= 0 || volume.size.d <= 0) throw new Error(`Kill Volume ${volume.id} size must be positive`);
      if (volume.courseId !== undefined && typeof volume.courseId !== "string") throw new Error(`Kill Volume ${volume.id} courseId must be string`);
    }
    for (const chest of region.lootChests) {
      if (!chest.id || typeof chest.id !== "string" || allIds.has(chest.id)) throw new Error(`invalid Loot Chest ${chest.id}`);
      allIds.add(chest.id); validatePos(chest.pos, `Loot Chest ${chest.id}`);
      if (!isInsideBounds(chest.pos, region.bounds)) throw new Error(`Loot Chest ${chest.id} outside section ${region.id}`);
      if (!lootTableIds.has(chest.lootTableId)) throw new Error(`Loot Chest ${chest.id} missing loot table ${chest.lootTableId}`);
      if (chest.refillSeconds !== undefined && chest.refillSeconds !== null && (!isNumber(chest.refillSeconds) || chest.refillSeconds <= 0)) throw new Error(`Loot Chest ${chest.id} refillSeconds must be positive or null`);
      chest.triggerRadius ??= 1.45;
      if (chest.visualAssetId !== undefined && !visualAssetIds.has(chest.visualAssetId)) throw new Error(`Loot Chest ${chest.id} unresolved Visual Asset ${chest.visualAssetId}`);
    }
  }

  const courseIdsBySection = new Map(data.regions.map((section) => [section.id, new Set(section.parkourStarts.map((entry) => entry.courseId))]));
  for (const section of data.regions) {
    for (const gate of section.portalGates) {
      const targetSection = data.regions.find((entry) => entry.id === gate.targetSectionId);
      const gateIsSpecialArrival = (gate.role === "arrival" || gate.role === "campLink" || gate.campReturnEnabled === true) && gate.travelEnabled === false;
      if (gateIsSpecialArrival && !gate.targetGateId) continue;
      if (gate.targetGateId) {
        const targetGate = data.regions.flatMap((entry) => entry.portalGates).find((entry) => entry.id === gate.targetGateId);
        if (!targetGate) throw new Error(`portal gate ${gate.id} target gate ${gate.targetGateId} missing`);
        if (targetGate.id === gate.id) throw new Error(`portal gate ${gate.id} cannot target itself`);
        const special = gateIsSpecialArrival
          || ((targetGate.role === "arrival" || targetGate.role === "campLink" || targetGate.campReturnEnabled === true) && targetGate.travelEnabled === false);
        if (!special && targetGate.targetGateId !== gate.id) throw new Error(`portal gate ${gate.id} target gate ${gate.targetGateId} is not reciprocal`);
      } else {
        const targetSection = data.regions.find((entry) => entry.id === gate.targetSectionId);
        if (!targetSection) throw new Error(`portal gate ${gate.id} target section ${gate.targetSectionId} missing`);
        if (!targetSection.entryPoints.some((entry) => entry.id === gate.targetEntryId)) throw new Error(`portal gate ${gate.id} target entry ${gate.targetEntryId} missing`);
      }
    }
    for (const checkpoint of section.parkourCheckpoints) if (!courseIdsBySection.get(section.id).has(checkpoint.courseId)) throw new Error(`Parkour Checkpoint ${checkpoint.id} references missing course ${checkpoint.courseId}`);
    for (const zone of section.parkourCourseZones) if (!courseIdsBySection.get(section.id).has(zone.courseId)) throw new Error(`Parkour Course Zone ${zone.id} references missing course ${zone.courseId}`);
    for (const volume of section.killVolumes) if (volume.courseId && !courseIdsBySection.get(section.id).has(volume.courseId)) throw new Error(`Kill Volume ${volume.id} references missing course ${volume.courseId}`);
    for (const end of section.parkourEnds) if (!courseIdsBySection.get(section.id).has(end.courseId)) throw new Error(`Parkour End ${end.id} references missing course ${end.courseId}`);
    for (const chest of section.lootChests) if (chest.courseId && !courseIdsBySection.get(section.id).has(chest.courseId)) throw new Error(`Loot Chest ${chest.id} references missing course ${chest.courseId}`);
    for (const courseId of courseIdsBySection.get(section.id)) {
      const zones = section.parkourCourseZones.filter((zone) => zone.courseId === courseId);
      if (zones.length === 0) continue;
      const requiredMarkers = [
        ...section.parkourStarts.filter((entry) => entry.courseId === courseId),
        ...section.parkourCheckpoints.filter((entry) => entry.courseId === courseId),
        ...section.parkourEnds.filter((entry) => entry.courseId === courseId),
      ];
      for (const marker of requiredMarkers) if (!zones.some((zone) => isInsideCourseZone(marker.pos, zone))) throw new Error(`${marker.id} must be inside a matching Parkour Course Zone`);
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
      for (const gate of region.portalGates ?? []) if (gate.id === gateId) foundGate = true;
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
        const baseY = plat.baseY ?? plat.y ?? 0;
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
        blockers.push({ id: prop.id, sectionId: region.id, x, z, halfW: w/2, halfD: d/2, baseY, topY: baseY + h, w, d, h, rotY });
      }
      for(const bc of region.boundaryColliders ?? []){
        if(bc.collisionEnabled === false) continue;
        const w = bc.size.w, d = bc.size.d, h = bc.size.h;
        const x = bc.pos.x, z = bc.pos.z, baseY = bc.pos.y ?? 0;
        const rotY = bc.rotY ?? 0;
        blockers.push({ id: bc.id, sectionId: region.id, x, z, halfW: w/2, halfD: d/2, baseY, topY: baseY + h, w,d,h, rotY });
      }
      for(const obs of region.traversal.obstacles ?? []){
        const w = obs.w, d = obs.h, h = obs.height ?? 1;
        const x = obs.x, z = obs.z, baseY = obs.baseY ?? obs.y ?? 0;
        blockers.push({ id: obs.id, sectionId: region.id, x, z, hx: w/2, hz: d/2, baseY, topY: baseY + h, w,d,h });
      }
      for(const plat of region.traversal.platforms ?? []){
        const w = plat.w, d = plat.h, h = plat.height;
        const x = plat.x, z = plat.z, baseY = plat.baseY ?? plat.y ?? 0;
        blockers.push({ id: plat.id, sectionId: region.id, x, z, hx: w/2, hz: d/2, baseY, topY: baseY + h, w,d,h, isPlatform:true });
      }
    }
    function isSupported(spawnPos, sectionId){
      const feetY = spawnPos.y ?? 0;
      let foundSupport = null;
      const region = data.regions.find(r => r.id === sectionId);
      if (region?.surface && isInsideBounds(spawnPos, region.bounds) && Math.abs(feetY-getSurfaceHeight(region.surface,spawnPos.x,spawnPos.z)) < .2) {
        foundSupport = { id:`terrain_${sectionId}`, regionId:sectionId, topY:getSurfaceHeight(region.surface,spawnPos.x,spawnPos.z) };
      }
      for(const s of supportSurfaces){
        if (s.regionId !== sectionId) continue;
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
    function isClear(spawnPos, supportId, sectionId){
      const feetY = spawnPos.y ?? 0;
      const capMinY = feetY, capMaxY = feetY + spawnCapsuleTotalHeight;
      for(const b of blockers){
        if (b.sectionId !== sectionId) continue;
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
      const support = isSupported(feetPos, "camp");
      if(!support) throw new Error("camp.playerSpawn not supported by traversable surface (feet not on ground/platform)");
      const clear = isClear(feetPos, support.id, "camp");
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
        const support = isSupported(feetPos, region.id);
        if(!support) throw new Error(`waypoint ${wp.id} runSpawn not supported by traversable surface`);
        const clear = isClear(feetPos, support.id, region.id);
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
      allPlatforms.push({ ...aabb, sectionId: region.id });
    }
    for (const obs of region.traversal.obstacles) {
      const aabb = { minX: obs.x - obs.w / 2, maxX: obs.x + obs.w / 2, minZ: obs.z - obs.h / 2, maxZ: obs.z + obs.h / 2, height: obs.height };
      allObstacles.push({ ...aabb, sectionId: region.id });
    }
    for (const res of region.resources) {
      // solid resources: tree, rock
      if (res.type === "tree" || res.type === "rock") {
        const half = res.type === "tree" ? 0.58 : 0.72; // from resourceConfig
        const aabb = { minX: res.pos.x - half, maxX: res.pos.x + half, minZ: res.pos.z - half, maxZ: res.pos.z + half, height: 1.0 };
        allSolidResources.push({ ...aabb, sectionId: region.id });
      }
    }
  }
  for (const region of data.regions) {
    for (const cr of region.creatures) {
      const x = cr.pos.x, z = cr.pos.z;
      for (const plat of allPlatforms) {
        if (plat.sectionId !== region.id) continue;
        const minX = plat.minX - creatureRadius, maxX = plat.maxX + creatureRadius;
        const minZ = plat.minZ - creatureRadius, maxZ = plat.maxZ + creatureRadius;
        if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
          throw new Error(`creature ${cr.id} spawn inside platform volume (clearance failed)`);
        }
      }
      for (const obs of allObstacles) {
        if (obs.sectionId !== region.id) continue;
        const minX = obs.minX - creatureRadius, maxX = obs.maxX + creatureRadius;
        const minZ = obs.minZ - creatureRadius, maxZ = obs.maxZ + creatureRadius;
        if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
          throw new Error(`creature ${cr.id} spawn inside obstacle (clearance failed)`);
        }
      }
      for (const res of allSolidResources) {
        if (res.sectionId !== region.id) continue;
        const minX = res.minX - creatureRadius, maxX = res.maxX + creatureRadius;
        const minZ = res.minZ - creatureRadius, maxZ = res.maxZ + creatureRadius;
        if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
          // check if this resource is the creature's own region? Still not allowed to spawn inside resource collider
          throw new Error(`creature ${cr.id} spawn inside solid resource (clearance failed)`);
        }
      }
    }
  }

  // Section-local coordinate overlap is intentional; section identity owns content.
  // Neighbor reciprocity
  for (const region of data.regions) {
    for (const nid of region.neighbors) {
      const neighbor = data.regions.find(r=> r.id === nid);
      if (neighbor && !neighbor.neighbors.includes(region.id)) {
        throw new Error(`neighbor reciprocity: ${region.id} -> ${nid} but not vice versa`);
      }
    }
  }
  // Ground/Boundary ownership is checked only against the declared local section.
  for (const region of data.regions) {
    for (const gp of region.groundPatches ?? []) {
      if (!isInsideBounds(gp.pos, region.bounds)) throw new Error(`groundPatch ${gp.id} center outside declared section ${region.id}`);
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
      const y = plat.baseY ?? plat.y ?? 0;
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
