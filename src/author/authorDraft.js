// src/author/authorDraft.js — mutable draft clone, validation, localStorage persistence, deterministic export (Phase 4A.2.1)
// Transactional commit, bounded undo/redo, draft-derived spatial helpers, spawn transform helpers.
// Canonical ownership: external callers receive cloned snapshots, not direct mutable refs.

import { normalizeWorldData } from "../world/worldValidator.js";
import { resolveAuthorType, writeNormalizedTransform } from "./authorTypeRegistry.js";

const STORAGE_KEY = "wildkin.authorDraft";
const DRAFT_VERSION = "3.5B";

function deepClone(o) {
  return JSON.parse(JSON.stringify(o));
}

function sortedClone(v) {
  if (Array.isArray(v)) return v.map(sortedClone);
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = sortedClone(v[k]);
    return out;
  }
  return v;
}

function stableStringify(obj) {
  return JSON.stringify(sortedClone(obj), null, 2);
}

const POINT_OWNED_COLLECTIONS = new Set(["props","resources","creatures","majorWaypoints","extractionBeacons","pois","platforms","obstacles","climbables"]);
// groundPatches and boundaryColliders are footprint-owned, not point.

function isPointOwned(collection, type){
  if(collection==="groundPatches" || collection==="boundaryColliders") return false;
  if(collection==="campSpawn" || collection==="runSpawn") return false;
  return POINT_OWNED_COLLECTIONS.has(collection);
}

function findContainingRegionStrictInCandidate(candidate, pos){
  let found=null; let count=0;
  for(const r of candidate.regions){
    const b=r.bounds;
    if(pos.x >= b.minX && pos.x <= b.maxX && pos.z >= b.minZ && pos.z <= b.maxZ){ found=r.id; count++; }
  }
  if(count===1) return found;
  return null;
}

function setByPath(obj, path, value){
  const parts = path.split(".");
  let cur = obj;
  for(let i=0;i<parts.length-1;i++){
    const p = parts[i];
    if(!(p in cur) || typeof cur[p] !== "object" || cur[p]===null) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length-1]] = value;
}
function getByPath(obj, path){
  const parts = path.split(".");
  let cur = obj;
  for(const p of parts){ if(cur==null) return undefined; cur = cur[p]; }
  return cur;
}

function getCollectionArrayForCandidate(region, collection, candidate) {
  if (!region) return [];
  const reg = candidate.regions.find(r=> r.id === region.id) ?? region;
  if (collection === "props") return reg.props;
  if (collection === "groundPatches") { if (!reg.groundPatches) reg.groundPatches=[]; return reg.groundPatches; }
  if (collection === "boundaryColliders") { if (!reg.boundaryColliders) reg.boundaryColliders=[]; return reg.boundaryColliders; }
  if (collection === "platforms") return reg.traversal.platforms;
  if (collection === "obstacles") return reg.traversal.obstacles;
  if (collection === "climbables") return reg.traversal.climbables;
  if (collection === "resources") return reg.resources;
  if (collection === "creatures") return reg.creatures;
  if (collection === "majorWaypoints") return reg.majorWaypoints;
  if (collection === "extractionBeacons") return reg.extractionBeacons;
  if (collection === "pois") return reg.pois;
  return [];
}

export function createAuthorDraft(repoData) {
  let draft = deepClone(repoData);
  if (!draft.version) draft.version = DRAFT_VERSION;

  let draftCounter = 0;
  let lastValidated = null;
  let lastError = null;

  // bounded history
  const MAX_HISTORY = 40;
  let undoStack = [];
  let redoStack = [];

  function pushHistory(snapshot) {
    undoStack.push(deepClone(snapshot));
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
  }

  function cloneRepo() {
    draft = deepClone(repoData);
    draftCounter = 0;
    lastValidated = null;
    lastError = null;
    undoStack = [];
    redoStack = [];
    persist();
    return deepClone(draft);
  }

  function getDraft() {
    return deepClone(draft);
  }
  function getDraftSnapshot(){ return deepClone(draft); }

  function setDraft(newData) {
    draft = deepClone(newData);
    persist();
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      localStorage.setItem(STORAGE_KEY + ":counter", String(draftCounter));
    } catch {}
  }

  function loadPersisted() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      normalizeWorldData(parsed);
      draft = parsed;
      const c = localStorage.getItem(STORAGE_KEY + ":counter");
      if (c) draftCounter = parseInt(c, 10) || 0;
      lastValidated = draft;
      undoStack = [];
      redoStack = [];
      return deepClone(draft);
    } catch (e) {
      lastError = e.message;
      return null;
    }
  }

  function clearPersisted() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY + ":counter");
    } catch {}
    undoStack = [];
    redoStack = [];
  }

  function hasPersisted() {
    try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; }
  }

  function validate() {
    try {
      const norm = normalizeWorldData(deepClone(draft));
      lastValidated = norm;
      lastError = null;
      return { ok: true, data: norm };
    } catch (e) {
      lastError = e.message;
      return { ok: false, error: e.message };
    }
  }

  function getLastError() { return lastError; }

  // Transactional helper: clone candidate, mutate, validate, commit atomically
  function transact(mutator) {
    const candidate = deepClone(draft);
    const prev = deepClone(draft);
    try {
      mutator(candidate);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    try {
      normalizeWorldData(candidate);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    // valid -> commit
    pushHistory(prev);
    draft = candidate;
    persist();
    lastValidated = draft;
    lastError = null;
    return { ok: true };
  }

  // History API
  function canUndo() { return undoStack.length > 0; }
  function canRedo() { return redoStack.length > 0; }
  function undo() {
    if (undoStack.length === 0) return { ok: false, error: "nothing to undo" };
    const prev = undoStack.pop();
    redoStack.push(deepClone(draft));
    draft = deepClone(prev);
    persist();
    return { ok: true };
  }
  function redo() {
    if (redoStack.length === 0) return { ok: false, error: "nothing to redo" };
    const next = redoStack.pop();
    undoStack.push(deepClone(draft));
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    draft = deepClone(next);
    persist();
    return { ok: true };
  }
  function clearHistory() { undoStack = []; redoStack = []; }

  function nextId(prefix) {
    draftCounter++;
    persist();
    return `${prefix}_${draftCounter}_${Date.now().toString(36).slice(-4)}`;
  }

  function findRegion(regionId) {
    const r = draft.regions.find(r => r.id === regionId) ?? null;
    return r ? deepClone(r) : null;
  }
  // internal raw find for mutation (not exported)
  function _findRawInCandidate(candidate, id){
    if (id === "camp_spawn" ) {
      if (candidate.camp?.playerSpawn) {
        const sp = candidate.camp.playerSpawn;
        let pos; let facing = 0;
        if (sp.position) { pos = sp.position; facing = sp.facingYaw ?? sp.facing ?? 0; }
        else { pos = sp; facing = sp.facingYaw ?? 0; }
        return { obj: { id: "camp_spawn", pos, facingYaw: facing, _virtual: true, _campSpawn: true }, region: candidate.regions.find(r=>r.id==="camp") ?? null, collection: "campSpawn", type: "campSpawn" };
      }
      return null;
    }
    if (id && id.endsWith("__runSpawn")) {
      const baseId = id.replace("__runSpawn","");
      for (const region of candidate.regions) {
        for (const wp of region.majorWaypoints ?? []) if (wp.id === baseId) {
          let rs = wp.runSpawn;
          if (!rs && wp.spawnOffset) {
            const base = wp.pos;
            rs = { position: { x: base.x + (wp.spawnOffset.x ?? 0), y: base.y ?? 0, z: base.z + (wp.spawnOffset.z ?? 0) }, facingYaw: 0 };
          }
          if (!rs) rs = { position: { x: wp.pos.x, y: wp.pos.y ?? 0, z: wp.pos.z + 1.2 }, facingYaw: 0 };
          let pos; let facing;
          if (rs.position) { pos = rs.position; facing = rs.facingYaw ?? 0; }
          else { pos = rs; facing = rs.facingYaw ?? 0; }
          return { obj: { id: id, pos, facingYaw: facing, _virtual: true, _runSpawnFor: baseId }, region, collection: "runSpawn", type: "runSpawn" };
        }
      }
      return null;
    }
    if (id === "camp" && candidate.camp) return { obj: candidate.camp, region: null, collection: "camp", type: "camp" };
    for (const region of candidate.regions) {
      for (const p of region.props ?? []) if (p.id === id) return { obj: p, region, collection: "props", type: "prop" };
      for (const gp of region.groundPatches ?? []) if (gp.id === id) return { obj: gp, region, collection: "groundPatches", type: "groundPatch" };
      for (const bc of region.boundaryColliders ?? []) if (bc.id === id) return { obj: bc, region, collection: "boundaryColliders", type: "boundaryCollider" };
      for (const pl of region.traversal?.platforms ?? []) if (pl.id === id) return { obj: pl, region, collection: "platforms", type: "platform" };
      for (const ob of region.traversal?.obstacles ?? []) if (ob.id === id) return { obj: ob, region, collection: "obstacles", type: "obstacle" };
      for (const cl of region.traversal?.climbables ?? []) if (cl.id === id) return { obj: cl, region, collection: "climbables", type: "climbable" };
      for (const r of region.resources ?? []) if (r.id === id) return { obj: r, region, collection: "resources", type: "resource" };
      for (const cr of region.creatures ?? []) if (cr.id === id) return { obj: cr, region, collection: "creatures", type: "creature" };
      for (const wp of region.majorWaypoints ?? []) if (wp.id === id) return { obj: wp, region, collection: "majorWaypoints", type: "majorWaypoint" };
      for (const bc of region.extractionBeacons ?? []) if (bc.id === id) return { obj: bc, region, collection: "extractionBeacons", type: "extractionBeacon" };
      for (const poi of region.pois ?? []) if (poi.id === id) return { obj: poi, region, collection: "pois", type: "poi" };
    }
    return null;
  }

  function findObjectById(id) {
    const raw = _findRawInCandidate(draft, id);
    if(!raw) return null;
    // return snapshot clone
    return {
      obj: deepClone(raw.obj),
      region: raw.region ? deepClone(raw.region) : null,
      collection: raw.collection,
      type: raw.type,
      regionId: raw.region ? raw.region.id : null,
      visualAssets: deepClone(draft.visualAssets ?? []),
    };
  }

  function getVisualAssets() {
    return deepClone(draft.visualAssets ?? []);
  }

  function findVisualAssetById(assetId) {
    const asset = (draft.visualAssets ?? []).find((entry) => entry.id === assetId);
    return asset ? deepClone(asset) : null;
  }

  function nextAvailableId(items, baseId) {
    const used = new Set(items.map((item) => item.id));
    if (!used.has(baseId)) return baseId;
    let index = 2;
    while (used.has(`${baseId}_${index}`)) index++;
    return `${baseId}_${index}`;
  }

  function createVisualAsset(displayName = "Visual Asset") {
    let assetId = null;
    let partId = null;
    const res = transact((candidate) => {
      if (!Array.isArray(candidate.visualAssets)) candidate.visualAssets = [];
      const cleanName = String(displayName).trim() || "Visual Asset";
      const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "visual_asset";
      assetId = nextAvailableId(candidate.visualAssets, `asset_${slug}`);
      partId = "box";
      candidate.visualAssets.push({
        id: assetId,
        displayName: cleanName,
        version: 1,
        parts: [{
          id: partId,
          shape: "box",
          position: { x: 0, y: 0.5, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          color: "#8fb8d8",
        }],
        collision: null,
      });
    });
    return res.ok ? { ok: true, assetId, partId } : res;
  }

  function renameVisualAsset(assetId, displayName) {
    return transact((candidate) => {
      const asset = (candidate.visualAssets ?? []).find((entry) => entry.id === assetId);
      if (!asset) throw new Error("Visual Asset not found");
      const cleanName = String(displayName).trim();
      if (!cleanName) throw new Error("Visual Asset display name is required");
      asset.displayName = cleanName;
    });
  }

  function deleteVisualAsset(assetId) {
    return transact((candidate) => {
      const refs = candidate.regions.flatMap((region) => (region.props ?? []).filter((prop) => prop.visualAssetId === assetId));
      if (refs.length) {
        const sample = refs.slice(0, 3).map((prop) => prop.id).join(", ");
        throw new Error(`Cannot delete Visual Asset: ${refs.length} instance${refs.length === 1 ? "" : "s"} reference it (${sample}${refs.length > 3 ? ", …" : ""})`);
      }
      const index = (candidate.visualAssets ?? []).findIndex((entry) => entry.id === assetId);
      if (index < 0) throw new Error("Visual Asset not found");
      candidate.visualAssets.splice(index, 1);
    });
  }

  function addAssetPart(assetId, shape) {
    let partId = null;
    const res = transact((candidate) => {
      const asset = (candidate.visualAssets ?? []).find((entry) => entry.id === assetId);
      if (!asset) throw new Error("Visual Asset not found");
      partId = nextAvailableId(asset.parts, shape);
      asset.parts.push({
        id: partId,
        shape,
        position: { x: 0, y: 0.5, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        color: "#d0d0d0",
      });
    });
    return res.ok ? { ok: true, partId } : res;
  }

  function updateAssetPart(assetId, partId, patch) {
    return transact((candidate) => {
      const asset = (candidate.visualAssets ?? []).find((entry) => entry.id === assetId);
      const part = asset?.parts.find((entry) => entry.id === partId);
      if (!part) throw new Error("Visual Asset part not found");
      if (patch.shape !== undefined && patch.shape !== part.shape) throw new Error("Visual Asset part shape is read-only");
      if (patch.position) part.position = { ...part.position, ...patch.position };
      if (patch.rotation) part.rotation = { ...part.rotation, ...patch.rotation };
      if (patch.scale) part.scale = { ...part.scale, ...patch.scale };
      if (patch.color !== undefined) part.color = patch.color;
    });
  }

  function duplicateAssetPart(assetId, partId) {
    let newPartId = null;
    const res = transact((candidate) => {
      const asset = (candidate.visualAssets ?? []).find((entry) => entry.id === assetId);
      const part = asset?.parts.find((entry) => entry.id === partId);
      if (!part) throw new Error("Visual Asset part not found");
      newPartId = nextAvailableId(asset.parts, `${part.id}_copy`);
      const clone = deepClone(part);
      clone.id = newPartId;
      clone.position.x += 0.25;
      clone.position.z += 0.25;
      asset.parts.push(clone);
    });
    return res.ok ? { ok: true, partId: newPartId } : res;
  }

  function deleteAssetPart(assetId, partId) {
    return transact((candidate) => {
      const asset = (candidate.visualAssets ?? []).find((entry) => entry.id === assetId);
      if (!asset) throw new Error("Visual Asset not found");
      const index = asset.parts.findIndex((entry) => entry.id === partId);
      if (index < 0) throw new Error("Visual Asset part not found");
      asset.parts.splice(index, 1);
    });
  }

  function updateAssetCollision(assetId, collision) {
    return transact((candidate) => {
      const asset = (candidate.visualAssets ?? []).find((entry) => entry.id === assetId);
      if (!asset) throw new Error("Visual Asset not found");
      asset.collision = collision == null ? null : deepClone(collision);
    });
  }

  // Patch helper internal: apply patch to obj within candidate
  function applyPatchToFound(found, patch, candidate) {
    const { obj } = found;
    if (found.collection === "camp") {
      if (patch.playerSpawn) {
        if (patch.playerSpawn.position) obj.playerSpawn = deepClone(patch.playerSpawn);
        else obj.playerSpawn = { x: patch.playerSpawn.x, y: patch.playerSpawn.y ?? 0, z: patch.playerSpawn.z };
      }
      if (patch.pos) obj.pos = { x: patch.pos.x, y: patch.pos.y ?? obj.pos.y ?? 0, z: patch.pos.z };
      return;
    }
    if (found.collection === "campSpawn") {
      const camp = candidate.camp;
      if (!camp.playerSpawn) camp.playerSpawn = { position: { x: 0, y: 0, z: 0 }, facingYaw: 0 };
      if (!camp.playerSpawn.position) {
        camp.playerSpawn = { position: { x: camp.playerSpawn.x ?? 0, y: camp.playerSpawn.y ?? 0, z: camp.playerSpawn.z ?? 0 }, facingYaw: camp.playerSpawn.facingYaw ?? 0 };
      }
      if (patch.pos) {
        camp.playerSpawn.position.x = patch.pos.x;
        camp.playerSpawn.position.y = patch.pos.y ?? camp.playerSpawn.position.y ?? 0;
        camp.playerSpawn.position.z = patch.pos.z;
      }
      if (patch.facingYaw !== undefined) camp.playerSpawn.facingYaw = patch.facingYaw;
      if (patch.position) {
        camp.playerSpawn.position = { x: patch.position.x, y: patch.position.y ?? 0, z: patch.position.z };
      }
      // validate strictly inside camp after patch
      const sp = camp.playerSpawn.position;
      const campRegion = candidate.regions.find(r=>r.id==="camp");
      if(campRegion){
        if(sp.x < campRegion.bounds.minX || sp.x > campRegion.bounds.maxX || sp.z < campRegion.bounds.minZ || sp.z > campRegion.bounds.maxZ){
          throw new Error("Camp Spawn must be strictly inside Camp region");
        }
      }
      return;
    }
    if (found.collection === "runSpawn") {
      const wpId = found.obj._runSpawnFor;
      const wpFound = candidate.regions.flatMap(r=>r.majorWaypoints??[]).find(w=>w.id===wpId);
      let wp = wpFound;
      if (!wp) return;
      if (!wp.runSpawn) wp.runSpawn = { position: { x: wp.pos.x, y: wp.pos.y ?? 0, z: wp.pos.z + 1.2 }, facingYaw: 0 };
      if (!wp.runSpawn.position) {
        wp.runSpawn = { position: { x: wp.runSpawn.x ?? wp.pos.x, y: wp.runSpawn.y ?? 0, z: wp.runSpawn.z ?? wp.pos.z }, facingYaw: wp.runSpawn.facingYaw ?? 0 };
      }
      if (patch.pos) {
        wp.runSpawn.position.x = patch.pos.x;
        wp.runSpawn.position.y = patch.pos.y ?? wp.runSpawn.position.y ?? 0;
        wp.runSpawn.position.z = patch.pos.z;
      }
      if (patch.position) {
        wp.runSpawn.position = { x: patch.position.x, y: patch.position.y ?? 0, z: patch.position.z };
      }
      if (patch.facingYaw !== undefined) wp.runSpawn.facingYaw = patch.facingYaw;
      // validate inside waypoint's region
      const region = candidate.regions.find(r=> (r.majorWaypoints??[]).some(w=>w.id===wpId));
      if(region){
        const rs = wp.runSpawn.position;
        if(rs.x < region.bounds.minX || rs.x > region.bounds.maxX || rs.z < region.bounds.minZ || rs.z > region.bounds.maxZ){
          throw new Error(`Run Spawn for ${wpId} must be inside region ${region.id}`);
        }
      }
      return;
    }
    let creatureDelta = null;
    if (found.type === "creature" && patch.pos && obj.pos && obj.homePos && !patch.homePos && patch.moveHomeWithSpawn !== false) {
      creatureDelta = { x: patch.pos.x - obj.pos.x, z: patch.pos.z - obj.pos.z, y: (patch.pos.y ?? obj.pos.y ?? 0) - (obj.pos.y ?? 0) };
    }
    // FIX: platform/obstacle/climbable must not create shadow pos; translate pos -> x/z/bottomY
    const isPlatformLike = found.type === "platform" || found.type === "obstacle";
    const isClimbable = found.type === "climbable";
    if (patch.pos) {
      if (isPlatformLike) {
        obj.x = patch.pos.x;
        obj.z = patch.pos.z;
        const ny = patch.pos.y ?? obj.y ?? obj.baseY ?? 0;
        obj.y = ny; obj.baseY = ny;
      } else if (isClimbable) {
        const oldBottom = obj.bottomY ?? 0;
        const oldTop = obj.topY ?? 2.4;
        const oldHeight = oldTop - oldBottom;
        const newBottom = patch.pos.y ?? oldBottom;
        const deltaY = newBottom - oldBottom;
        const deltaX = patch.pos.x - obj.x;
        const deltaZ = patch.pos.z - obj.z;
        obj.x = patch.pos.x;
        obj.z = patch.pos.z;
        obj.bottomY = newBottom;
        obj.topY = newBottom + oldHeight;
        if (obj.topPlatform) {
          obj.topPlatform.x += deltaX;
          obj.topPlatform.z += deltaZ;
          obj.topPlatform.topY += deltaY;
          if (obj.topPlatform.aabb) {
            obj.topPlatform.aabb.minX += deltaX; obj.topPlatform.aabb.maxX += deltaX;
            obj.topPlatform.aabb.minZ += deltaZ; obj.topPlatform.aabb.maxZ += deltaZ;
          }
        }
        if (obj.topEntryRegion) {
          obj.topEntryRegion.minX += deltaX; obj.topEntryRegion.maxX += deltaX;
          obj.topEntryRegion.minZ += deltaZ; obj.topEntryRegion.maxZ += deltaZ;
        }
        if (obj.mantleExit) {
          obj.mantleExit.x += deltaX; obj.mantleExit.z += deltaZ;
          if (obj.mantleExit.y !== undefined) obj.mantleExit.y += deltaY;
        }
        if (creatureDelta && obj.homePos) {
          obj.homePos.x += creatureDelta.x;
          obj.homePos.z += creatureDelta.z;
          obj.homePos.y = (obj.homePos.y ?? 0) + creatureDelta.y;
        }
      } else {
        obj.pos = { x: patch.pos.x, y: patch.pos.y ?? obj.pos.y ?? 0, z: patch.pos.z };
        if (creatureDelta && obj.homePos) {
          obj.homePos.x += creatureDelta.x;
          obj.homePos.z += creatureDelta.z;
          obj.homePos.y = (obj.homePos.y ?? 0) + creatureDelta.y;
        }
      }
    }
    if (patch.homePos) obj.homePos = { x: patch.homePos.x, y: patch.homePos.y ?? 0, z: patch.homePos.z };
    if (patch.x !== undefined) {
      obj.x = patch.x;
      if (patch.z !== undefined) obj.z = patch.z;
    }
    if (patch.y !== undefined) {
      if (found.type === "platform" || found.type === "obstacle") {
        obj.y = patch.y; obj.baseY = patch.y;
      } else if (found.type === "climbable") {
        const delta = patch.y - (obj.bottomY ?? 0);
        if (obj.bottomY !== undefined) obj.bottomY += delta;
        if (obj.topY !== undefined) obj.topY += delta;
        if (obj.topPlatform && obj.topPlatform.topY !== undefined) obj.topPlatform.topY += delta;
        if (obj.mantleExit) obj.mantleExit.y = (obj.mantleExit.y ?? 0) + delta;
      } else if (found.type === "groundPatch" || found.type === "boundaryCollider") {
        if (obj.pos) obj.pos.y = patch.y;
        else obj.y = patch.y;
      }
    }
    if (patch.rotY !== undefined) {
      // Phase 4A.2.2: enable rotation for platform/obstacle/climbable as meaningful
      if (found.type === "platform" || found.type === "obstacle" || found.type === "climbable") {
        obj.rotY = patch.rotY;
        if (found.type === "climbable") {
          const rot = patch.rotY;
          obj.wallNormal = { x: Math.sin(rot), z: Math.cos(rot) };
          obj.approachDir = { x: -Math.sin(rot), z: -Math.cos(rot) };
        }
      } else if (found.type === "prop" || found.type === "groundPatch" || found.type === "boundaryCollider" || found.type === "resource" || found.type === "creature" || found.type === "majorWaypoint" || found.type === "extractionBeacon" || found.type === "poi") {
        obj.rotY = patch.rotY;
      } else {
        obj.rotY = patch.rotY;
      }
    }
    if (patch.rotationY !== undefined) obj.rotY = patch.rotationY;
    if (patch.size) {
      if (isPlatformLike) {
        if (patch.size.w !== undefined) obj.w = patch.size.w;
        if (patch.size.d !== undefined) obj.h = patch.size.d;
        if (patch.size.h !== undefined) obj.height = patch.size.h;
      } else if (isClimbable) {
        if (patch.size.w !== undefined) obj.w = patch.size.w;
        if (patch.size.h !== undefined) obj.h = patch.size.h;
        if (patch.size.height !== undefined) {
          const newHeight = patch.size.height;
          const base = obj.bottomY ?? 0;
          obj.topY = base + newHeight;
          if (obj.topPlatform) obj.topPlatform.topY = obj.topY;
        }
      } else {
        obj.size = { ...obj.size, ...patch.size };
      }
    }
    if (patch.w !== undefined) {
      if (isPlatformLike || isClimbable) {
        obj.w = patch.w;
        if (patch.h !== undefined) obj.h = patch.h;
      } else {
        obj.w = patch.w; if (patch.h !== undefined) obj.h = patch.h;
      }
    }
    if (patch.height !== undefined) {
      if (isPlatformLike) obj.height = patch.height;
      else if (isClimbable) {
        const base = obj.bottomY ?? 0;
        obj.topY = base + patch.height;
        if (obj.topPlatform) obj.topPlatform.topY = obj.topY;
      } else obj.height = patch.height;
    }
    // region move handled after patch applied? we need to handle atomically: if patch.regionId provided via auto-rehome, move collections
    if (patch.regionId && found.region && patch.regionId !== found.region.id) {
      // For waypoint, ensure its runSpawn stays valid in new region
      if(found.type==="majorWaypoint"){
        const wp = obj;
        if(wp.runSpawn){
          const rs = wp.runSpawn.position ? wp.runSpawn.position : wp.runSpawn;
          const targetReg = candidate.regions.find(r=>r.id===patch.regionId);
          if(targetReg){
            if(rs.x < targetReg.bounds.minX || rs.x > targetReg.bounds.maxX || rs.z < targetReg.bounds.minZ || rs.z > targetReg.bounds.maxZ){
              throw new Error(`Cannot move Waypoint ${wp.id} to ${patch.regionId}: its Run Spawn would be outside target region`);
            }
          }
        }
      }
      const targetRegion = candidate.regions.find(r=> r.id === patch.regionId);
      if (!targetRegion) throw new Error("target region not found");
      const arr = getCollectionArrayForCandidate(found.region, found.collection, candidate);
      const idx = arr.indexOf(obj);
      if (idx >= 0) arr.splice(idx, 1);
      const targetArr = getCollectionArrayForCandidate(targetRegion, found.collection, candidate);
      targetArr.push(obj);
    }
    if (patch.pocketId !== undefined) obj.pocketId = patch.pocketId;
    if (patch.type !== undefined && found.type === "resource") obj.type = patch.type;
    if (patch.creatureType !== undefined && found.type === "creature") obj.type = patch.creatureType;
    if (patch.temperament !== undefined && found.type === "creature") obj.temperament = patch.temperament;
    if (patch.displayName !== undefined) {
      if (found.type === "majorWaypoint" || found.type === "extractionBeacon" || found.type === "poi" || found.type === "groundPatch" || found.type === "boundaryCollider" || found.type === "prop") {
        if (patch.displayName === null || patch.displayName === "") delete obj.displayName;
        else obj.displayName = patch.displayName;
      }
    }
    if (patch.visibleInPlay !== undefined) obj.visibleInPlay = !!patch.visibleInPlay;
    if (patch.collisionEnabled !== undefined) obj.collisionEnabled = !!patch.collisionEnabled;
    if (patch.opacity !== undefined) obj.opacity = patch.opacity;
    if (patch.color !== undefined) obj.color = patch.color;
    if (patch.tint !== undefined) obj.color = patch.tint;
    if (patch.facingYaw !== undefined) {
      if (found.type === "campSpawn" || found.type === "runSpawn" || obj.facingYaw !== undefined) obj.facingYaw = patch.facingYaw;
      else if (found.type === "prop" || found.type === "groundPatch" || found.type === "boundaryCollider") obj.rotY = patch.facingYaw;
    }
    // Generic inspector field handling via registry + direct fallback
    try {
      const def = resolveAuthorType(found);
      if (def && Array.isArray(def.inspector)) {
        for (const field of def.inspector) {
          const key = field.key;
          if (patch[key] !== undefined) {
            const path = field.path ?? key;
            if (path.includes(".")) setByPath(obj, path, patch[key]);
            else obj[path] = patch[key];
          }
        }
      }
    } catch {}
    if (patch.roamRadius !== undefined) obj.roamRadius = patch.roamRadius;
    if (patch.noticeRadius !== undefined) obj.noticeRadius = patch.noticeRadius;
    if (patch.personalSpace !== undefined) obj.personalSpace = patch.personalSpace;
    if (patch.leashRadius !== undefined) obj.leashRadius = patch.leashRadius;
    if (patch.speciesTag !== undefined) obj.speciesTag = patch.speciesTag;
    if (patch.hostileSpecies !== undefined) obj.hostileSpecies = patch.hostileSpecies;
    if (patch.requires !== undefined) obj.requires = patch.requires;
    if (patch.uniformScale !== undefined) { obj.uniformScale = patch.uniformScale; obj.scale = patch.uniformScale; }
    if (patch.scale !== undefined) { obj.uniformScale = patch.scale; obj.scale = patch.scale; }
    if (patch.rotY !== undefined && found.type === "resource" && obj.rotY === undefined) obj.rotY = patch.rotY;
    if (patch["homePos.x"] !== undefined) { if (!obj.homePos) obj.homePos = { x:0,y:0,z:0 }; obj.homePos.x = patch["homePos.x"]; }
    if (patch["homePos.z"] !== undefined) { if (!obj.homePos) obj.homePos = { x:0,y:0,z:0 }; obj.homePos.z = patch["homePos.z"]; }
    const handledKeys = new Set(["pos","x","z","y","rotY","rotationY","size","w","h","height","regionId","pocketId","type","creatureType","temperament","displayName","visibleInPlay","collisionEnabled","opacity","color","tint","facingYaw","homePos","roamRadius","noticeRadius","personalSpace","leashRadius","speciesTag","hostileSpecies","requires","uniformScale","scale","moveHomeWithSpawn","position","homePos.x","homePos.z"]);
    for (const k of Object.keys(patch)) {
      if (handledKeys.has(k)) continue;
      if (k.includes(".")) { setByPath(obj, k, patch[k]); continue; }
      if (k === "pos" && (found.type==="platform"||found.type==="obstacle"||found.type==="climbable")) continue;
      if ((found.type==="platform"||found.type==="obstacle"||found.type==="climbable") && (k==="pos"||k==="size")) continue;
      if (found.type==="resource" && (k==="x"||k==="z"||k==="y"||k==="w"||k==="h")) continue;
      obj[k] = patch[k];
    }
    if (found.type==="platform" || found.type==="obstacle" || found.type==="climbable") {
      if ("pos" in obj && obj.pos && typeof obj.pos === "object" && "x" in obj.pos) {
        if ("x" in obj) delete obj.pos;
      }
    }
    if (found.type==="resource" || found.type==="creature" || found.type==="majorWaypoint" || found.type==="extractionBeacon" || found.type==="poi") {
      if ("x" in obj && obj.pos) delete obj.x;
      if ("z" in obj && obj.pos) delete obj.z;
      if ("w" in obj && obj.size) delete obj.w;
      if ("h" in obj && obj.size) delete obj.h;
    }
  }

  function getCollectionArray(region, collection) {
    if (!region) return [];
    if (collection === "props") return region.props;
    if (collection === "groundPatches") { if (!region.groundPatches) region.groundPatches=[]; return region.groundPatches; }
    if (collection === "boundaryColliders") { if (!region.boundaryColliders) region.boundaryColliders=[]; return region.boundaryColliders; }
    if (collection === "platforms") return region.traversal.platforms;
    if (collection === "obstacles") return region.traversal.obstacles;
    if (collection === "climbables") return region.traversal.climbables;
    if (collection === "resources") return region.resources;
    if (collection === "creatures") return region.creatures;
    if (collection === "majorWaypoints") return region.majorWaypoints;
    if (collection === "extractionBeacons") return region.extractionBeacons;
    if (collection === "pois") return region.pois;
    return [];
  }

  function updateTransform(id, patch) {
    // auto-rehome for point-owned moves: if patch.pos and not explicit regionId, resolve unique containing region
    const res = transact((candidate) => {
      const found = _findRawInCandidate(candidate, id);
      if (!found) throw new Error("object not found");
      // Auto-rehome point-owned
      let patchClone = {...patch};
      if(patchClone.pos && isPointOwned(found.collection, found.type) && patchClone.regionId===undefined){
        const target = findContainingRegionStrictInCandidate(candidate, patchClone.pos);
        if(target && found.region && target!==found.region.id){
          // for waypoint, check runSpawn validity before setting
          if(found.type==="majorWaypoint"){
            const wp = found.obj;
            if(wp.runSpawn){
              const rs = wp.runSpawn.position ? wp.runSpawn.position : wp.runSpawn;
              const targetReg = candidate.regions.find(r=>r.id===target);
              if(targetReg && (rs.x < targetReg.bounds.minX || rs.x > targetReg.bounds.maxX || rs.z < targetReg.bounds.minZ || rs.z > targetReg.bounds.maxZ)){
                throw new Error(`Cannot move Waypoint ${wp.id} to ${target}: its Run Spawn would be outside target region`);
              }
            }
          }
          patchClone.regionId = target;
        } else if(!target){
          // if outside all regions => invalid
          // But footprint vs point distinction: groundPatches not auto, so skip
          // For point-owned, require unique containing region
          // If pos is outside any region -> reject
          // Check if pos is outside candidate world? We can test by strict: if no containing region, throw
          // However for some point-owned that are being moved outside intentionally invalid drag, we should reject
          // Only reject if patch is for point-owned and we attempted to move outside: throw
          // But if object is being dragged but stays inside same region, target would be same region, not null? Actually if same region, find returns that id, which equals found.region.id, so we won't set regionId, but that's fine (stay). If null (outside all), we should reject.
          // Detect: if patch.pos is provided and object is point-owned, we expect target not null
          // If null => outside or ambiguous => error
          // However for ambiguous overlap, find returns null as well => reject
          const currentContains = findContainingRegionStrictInCandidate(candidate, patchClone.pos);
          // If currentContains null, we are outside/ambiguous => reject
          // But if object already in region and moving within same region, currentContains would be that region, not null
          // So if target null and original region contains new pos? Wait we computed target as containing region for new pos. If null, means either outside all or ambiguous overlap (multiple). Both invalid.
          throw new Error(`Position has no unique containing region — move rejected`);
        } else if(!target && isPointOwned(found.collection, found.type)){
          // ambiguous overlap
          throw new Error(`Ambiguous region overlap — move rejected`);
        }
      }
      // explicit regionId + pos mismatch validation
      if(patchClone.pos && patchClone.regionId){
        const targetReg = candidate.regions.find(r=>r.id===patchClone.regionId);
        if(targetReg){
          const p = patchClone.pos;
          if(p.x < targetReg.bounds.minX || p.x > targetReg.bounds.maxX || p.z < targetReg.bounds.minZ || p.z > targetReg.bounds.maxZ){
            throw new Error(`Position not inside declared target region ${patchClone.regionId}`);
          }
        }
      }
      applyPatchToFound(found, patchClone, candidate);
    });
    return res;
  }

  function updateNormalizedTransform(id, normalized) {
    const res = transact((candidate) => {
      const found = _findRawInCandidate(candidate, id);
      if (!found) throw new Error("object not found");
      const normalizedClone = { ...normalized };
      if (normalizedClone.position && isPointOwned(found.collection, found.type) && normalizedClone.regionId === undefined && normalizedClone._regionId === undefined) {
        const target = findContainingRegionStrictInCandidate(candidate, normalizedClone.position);
        if (target && found.region && target !== found.region.id) {
          if (found.type === "majorWaypoint") {
            const wp = found.obj;
            if (wp.runSpawn) {
              const rs = wp.runSpawn.position ? wp.runSpawn.position : wp.runSpawn;
              const targetReg = candidate.regions.find(r => r.id === target);
              if (targetReg && (rs.x < targetReg.bounds.minX || rs.x > targetReg.bounds.maxX || rs.z < targetReg.bounds.minZ || rs.z > targetReg.bounds.maxZ)) {
                throw new Error(`Cannot move Waypoint ${wp.id} to ${target}: its Run Spawn would be outside target region`);
              }
            }
          }
          normalizedClone._regionId = target;
        } else if (!target) {
          throw new Error(`Position has no unique containing region — move rejected`);
        }
      }
      if (normalizedClone.position && normalizedClone.regionId) {
        const targetReg = candidate.regions.find(r => r.id === normalizedClone.regionId);
        if (targetReg) {
          const p = normalizedClone.position;
          if (p.x < targetReg.bounds.minX || p.x > targetReg.bounds.maxX || p.z < targetReg.bounds.minZ || p.z > targetReg.bounds.maxZ) {
            throw new Error(`Position not inside declared target region ${normalizedClone.regionId}`);
          }
        }
      }
      const ok = writeNormalizedTransform(candidate, found, normalizedClone);
      if (!ok) throw new Error("transform write failed");
      const targetRegionId = normalizedClone._regionId ?? normalizedClone.regionId;
      if (targetRegionId && found.region && targetRegionId !== found.region.id) {
        const targetRegion = candidate.regions.find(r => r.id === targetRegionId);
        if (!targetRegion) throw new Error("target region not found");
        const arr = getCollectionArrayForCandidate(found.region, found.collection, candidate);
        const idx = arr.indexOf(found.obj);
        if (idx >= 0) arr.splice(idx, 1);
        const targetArr = getCollectionArrayForCandidate(targetRegion, found.collection, candidate);
        targetArr.push(found.obj);
      }
    });
    return res;
  }

  function updateInspectorField(id, fieldKey, value) {
    const res = transact((candidate) => {
      const found = _findRawInCandidate(candidate, id);
      if (!found) throw new Error("object not found");
      const def = resolveAuthorType(found);
      if (!def) throw new Error("object is not authorable");
      const fieldDef = (def.inspector ?? []).find(f => f.key === fieldKey || f.path === fieldKey);
      const presentationFields = new Set(["visibleInPlay", "collisionEnabled", "opacity", "color"]);
      if (!fieldDef && !presentationFields.has(fieldKey)) throw new Error(`unsupported inspector field ${fieldKey}`);
      if (fieldDef?.editorOnly) throw new Error(`${fieldKey} is an editor option, not persisted data`);
      const path = fieldDef?.path ?? fieldDef?.key ?? fieldKey;
      let val = value;
      if (fieldDef?.type === "number" || fieldKey === "opacity") {
        val = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(val)) throw new Error(`${fieldKey} must be a finite number`);
        if (fieldDef?.min !== undefined) val = Math.max(fieldDef.min, val);
        if (fieldDef?.max !== undefined) val = Math.min(fieldDef.max, val);
        if (fieldKey === "opacity") val = Math.max(0, Math.min(1, val));
      }
      if (fieldDef?.type === "boolean" || fieldKey === "visibleInPlay" || fieldKey === "collisionEnabled") val = !!value;
      if (fieldDef?.type === "enum" && fieldDef.options && !fieldDef.options.includes(val)) {
        throw new Error(`${fieldKey} must be one of ${fieldDef.options.join(", ")}`);
      }
      if (fieldDef?.type === "json" && typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "" || trimmed === "null") val = null;
        else {
          try { val = JSON.parse(trimmed); } catch { throw new Error(`${fieldKey} must be valid JSON`); }
        }
      }
      if (val === undefined) {
        if (path.includes(".")) {
          const keys = path.split(".");
          let target = found.obj;
          for (let i = 0; i < keys.length - 1; i++) target = target?.[keys[i]];
          if (target) delete target[keys.at(-1)];
        } else delete found.obj[path];
      } else if (path.includes(".")) setByPath(found.obj, path, val);
      else found.obj[path] = val;
      if (path === "uniformScale" || path === "scale") {
        found.obj.uniformScale = val;
        delete found.obj.scale;
      }
      if (fieldKey === "homePos.x" || fieldKey === "homePos.z") {
        const axis = fieldKey.split(".")[1];
        if (!found.obj.homePos) found.obj.homePos = { x:0,y:0,z:0 };
        found.obj.homePos[axis] = val;
      }
    });
    return res;
  }

  function duplicateObject(id) {
    let newId = null;
    const res = transact((candidate) => {
      let found = null;
      for (const region of candidate.regions) {
        for (const p of region.props ?? []) if (p.id === id) found = { obj: p, region, collection: "props" };
        for (const gp of region.groundPatches ?? []) if (gp.id === id) found = { obj: gp, region, collection: "groundPatches" };
        for (const bc of region.boundaryColliders ?? []) if (bc.id === id) found = { obj: bc, region, collection: "boundaryColliders" };
        for (const pl of region.traversal?.platforms ?? []) if (pl.id === id) found = { obj: pl, region, collection: "platforms" };
        for (const ob of region.traversal?.obstacles ?? []) if (ob.id === id) found = { obj: ob, region, collection: "obstacles" };
        for (const cl of region.traversal?.climbables ?? []) if (cl.id === id) found = { obj: cl, region, collection: "climbables" };
        for (const r of region.resources ?? []) if (r.id === id) found = { obj: r, region, collection: "resources" };
        for (const cr of region.creatures ?? []) if (cr.id === id) found = { obj: cr, region, collection: "creatures" };
        for (const wp of region.majorWaypoints ?? []) if (wp.id === id) found = { obj: wp, region, collection: "majorWaypoints" };
        for (const bc of region.extractionBeacons ?? []) if (bc.id === id) found = { obj: bc, region, collection: "extractionBeacons" };
        for (const poi of region.pois ?? []) if (poi.id === id) found = { obj: poi, region, collection: "pois" };
        if (found) break;
      }
      if (!found) throw new Error("not found");
      const clone = deepClone(found.obj);
      const baseId = clone.id;
      let candidateId = baseId + "_copy";
      let counter = 1;
      const existsInCandidate = (checkId) => {
        for (const region of candidate.regions) {
          for (const arr of [region.props, region.groundPatches, region.boundaryColliders, region.resources, region.creatures, region.majorWaypoints, region.extractionBeacons, region.pois, region.traversal?.platforms, region.traversal?.obstacles, region.traversal?.climbables]) {
            if (!arr) continue;
            for (const o of arr) if (o.id === checkId) return true;
          }
        }
        return false;
      };
      while (existsInCandidate(candidateId)) {
        candidateId = baseId + "_copy" + counter;
        counter++;
        if (counter > 100) candidateId = `${baseId}_${Date.now().toString(36).slice(-4)}_${counter}`;
        if (counter > 200) throw new Error("duplicate id generation failed");
      }
      clone.id = candidateId;
      if (clone.pos) { clone.pos.x += 0.8; clone.pos.z += 0.8; }
      else if (clone.x !== undefined) { clone.x += 0.8; clone.z += 0.8; }
      if (clone.homePos) { clone.homePos.x += 0.8; clone.homePos.z += 0.8; }
      const arr = getCollectionArrayForCandidate(found.region, found.collection, candidate);
      arr.push(clone);
      newId = candidateId;
    });
    if (!res.ok) return res;
    return { ok: true, newId };
  }

  function deleteObject(id) {
    if (id === "camp_spawn" || (id && id.endsWith("__runSpawn"))) return { ok: false, error: "spawn is not deletable" };
    const res = transact((candidate) => {
      let found = null;
      for (const region of candidate.regions) {
        for (const p of region.props ?? []) if (p.id === id) found = { obj: p, region, collection: "props" };
        for (const gp of region.groundPatches ?? []) if (gp.id === id) found = { obj: gp, region, collection: "groundPatches" };
        for (const bc of region.boundaryColliders ?? []) if (bc.id === id) found = { obj: bc, region, collection: "boundaryColliders" };
        for (const pl of region.traversal?.platforms ?? []) if (pl.id === id) found = { obj: pl, region, collection: "platforms" };
        for (const ob of region.traversal?.obstacles ?? []) if (ob.id === id) found = { obj: ob, region, collection: "obstacles" };
        for (const cl of region.traversal?.climbables ?? []) if (cl.id === id) found = { obj: cl, region, collection: "climbables" };
        for (const r of region.resources ?? []) if (r.id === id) found = { obj: r, region, collection: "resources" };
        for (const cr of region.creatures ?? []) if (cr.id === id) found = { obj: cr, region, collection: "creatures" };
        for (const wp of region.majorWaypoints ?? []) if (wp.id === id) found = { obj: wp, region, collection: "majorWaypoints" };
        for (const bc of region.extractionBeacons ?? []) if (bc.id === id) found = { obj: bc, region, collection: "extractionBeacons" };
        for (const poi of region.pois ?? []) if (poi.id === id) found = { obj: poi, region, collection: "pois" };
        if (found) break;
      }
      if (!found) throw new Error("not found");
      const arr = getCollectionArrayForCandidate(found.region, found.collection, candidate);
      const idx = arr.indexOf(found.obj);
      if (idx >= 0) arr.splice(idx, 1);
      else throw new Error("not removed");
    });
    return res;
  }

  function createObject(regionId, kind, subtype) {
    let createdId = null;
    const res = transact((candidate) => {
      const region = candidate.regions.find(r=> r.id === regionId);
      if (!region) throw new Error("region not found");
      const centerX = (region.bounds.minX + region.bounds.maxX) * 0.5;
      const centerZ = (region.bounds.minZ + region.bounds.maxZ) * 0.5;
      let obj = null;
      draftCounter++;
      const nextIdLocal = (prefix) => `${prefix}_${draftCounter}_${Date.now().toString(36).slice(-4)}`;
      if (kind === "groundPatch" || kind === "ground") {
        const id = nextIdLocal("ground");
        obj = { id, pos: { x: centerX, y: -0.25, z: centerZ }, size: { w: 4, h: 0.5, d: 4 }, color: region.ground?.color ?? 0x7bb26a, opacity: 1, visibleInPlay: true, collisionEnabled: true, rotY: 0 };
        if (!region.groundPatches) region.groundPatches = [];
        region.groundPatches.push(obj);
        createdId = id;
      } else if (kind === "boundaryCollider" || kind === "boundary" || kind === "collider") {
        const id = nextIdLocal("boundary");
        obj = { id, pos: { x: centerX, y: 0, z: centerZ }, size: { w: 3, h: 3, d: 0.5 }, rotY: 0, color: 0x5a6a7a, opacity: 0.5, visibleInPlay: false, collisionEnabled: true };
        if (!region.boundaryColliders) region.boundaryColliders = [];
        region.boundaryColliders.push(obj);
        createdId = id;
      } else if (kind === "box" || kind === "prop") {
        const id = nextIdLocal(subtype || "prop");
        obj = { id, subtype: subtype || "box", pos: { x: centerX, y: 0, z: centerZ }, size: { w: 1.5, h: 1.0, d: 1.5 }, rotY: 0, visibleInPlay: true, collisionEnabled: true, opacity: 1 };
        region.props.push(obj);
        createdId = id;
      } else if (kind === "platform") {
        const id = nextIdLocal("platform");
        obj = { id, x: centerX, z: centerZ, w: 3, h: 3, height: 1.25 };
        region.traversal.platforms.push(obj);
        createdId = id;
      } else if (kind === "obstacle") {
        const id = nextIdLocal("obstacle");
        obj = { id, x: centerX, z: centerZ, w: 1.8, h: 1.8, height: 1.0 };
        region.traversal.obstacles.push(obj);
        createdId = id;
      } else if (kind === "climbable") {
        const id = nextIdLocal("ladder");
        obj = { id, x: centerX, z: centerZ - 1, w: 1.9, h: 0.5, bottomY: 0, topY: 2.4, topPlatform: { x: centerX, z: centerZ + 1, w: 4, h: 3, topY: 2.4, aabb: { minX: centerX - 2, maxX: centerX + 2, minZ: centerZ -1, maxZ: centerZ + 4 } }, wallNormal: { x: 0, z: 1 }, approachDir: { x: 0, z: -1 }, topEntryRegion: { minX: centerX - 1, maxX: centerX + 1, minZ: centerZ -1, maxZ: centerZ }, mantleExit: { x: centerX, z: centerZ } };
        region.traversal.climbables.push(obj);
        createdId = id;
      } else if (kind === "tree" || kind === "rock" || kind === "fiber") {
        const id = nextIdLocal(kind);
        obj = { id, type: kind, pos: { x: centerX + (Math.random() - 0.5) * 2, y: 0, z: centerZ + (Math.random() - 0.5) * 2 } };
        region.resources.push(obj);
        createdId = id;
      } else if (kind === "rusher" || kind === "spitter") {
        const id = nextIdLocal(kind);
        const pos = { x: centerX, y: 0, z: centerZ };
        obj = { id, type: kind, temperament: "AGGRESSIVE", speciesTag: kind === "rusher" ? "fang" : "spit", pos: { ...pos }, homePos: { ...pos }, roamRadius: 2.5, noticeRadius: 5.5, personalSpace: 1.9, leashRadius: 7.0 };
        if (kind === "spitter") obj.hostileSpecies = ["flutter"];
        region.creatures.push(obj);
        createdId = id;
      } else if (kind === "majorWaypoint") {
        const id = nextIdLocal("wp");
        obj = { id, type: "majorWaypoint", pos: { x: centerX, y: 0, z: centerZ }, displayName: "New Waypoint" };
        region.majorWaypoints.push(obj);
        createdId = id;
      } else if (kind === "extractionBeacon") {
        const id = nextIdLocal("beacon");
        obj = { id, type: "extractionBeacon", pos: { x: centerX, y: 0, z: centerZ }, displayName: "New Beacon" };
        region.extractionBeacons.push(obj);
        createdId = id;
      } else if (kind === "poi") {
        const id = nextIdLocal("poi");
        const poiType = subtype || "chest";
        obj = { id, type: poiType, pos: { x: centerX, y: 0, z: centerZ }, requires: null };
        if (poiType === "chest" && Math.random() < 0.3) obj.requires = { type: "companionAbility", id: "swim" };
        region.pois.push(obj);
        createdId = id;
      } else if (kind === "fence" || kind === "gate" || kind === "forestBoundary" || kind === "dropPod" || kind === "resonator" || kind === "water" || kind === "island") {
        const id = nextIdLocal(kind);
        obj = { id, subtype: kind, pos: { x: centerX, y: 0, z: centerZ }, size: { w: 2, h: 1, d: 2 }, rotY: 0, visibleInPlay: true, collisionEnabled: kind !== "water", opacity: 1 };
        region.props.push(obj);
        createdId = id;
      } else {
        throw new Error(`unknown kind ${kind}`);
      }
    });
    if (!res.ok) return res;
    return { ok: true, id: createdId };
  }

  function createObjectAtPosition(kind, subtype, worldPos, forcedRegionId, options = {}){
    let createdId=null;
    const res=transact((candidate)=>{
      let regionId = forcedRegionId;
      if(!regionId){
        regionId = findContainingRegionStrictInCandidate(candidate, {x: worldPos.x, z: worldPos.z});
        if(!regionId) regionId = candidate.regions[0]?.id;
        if(!regionId) throw new Error("no region for placement");
      }
      const region = candidate.regions.find(r=> r.id===regionId);
      if(!region) throw new Error("region not found");
      // Validate inside
      const b = region.bounds;
      if(worldPos.x < b.minX || worldPos.x > b.maxX || worldPos.z < b.minZ || worldPos.z > b.maxZ){
        // For point-owned, we already ensured containing; for footprint, allow if center inside? For now require inside for all
        throw new Error(`Placement position not inside region ${regionId}`);
      }
      draftCounter++;
      const nextIdLocal = (prefix) => `${prefix}_${draftCounter}_${Date.now().toString(36).slice(-4)}`;
      let obj=null;
      const y = worldPos.y ?? 0;
      if (kind === "visualAsset") {
        const visualAssetId = options.visualAssetId ?? subtype;
        if (!(candidate.visualAssets ?? []).some((asset) => asset.id === visualAssetId)) throw new Error(`Visual Asset ${visualAssetId} not found`);
        const allProps = candidate.regions.flatMap((entry) => entry.props ?? []);
        const baseId = `prop_${visualAssetId.replace(/^asset_/, "")}`;
        const id = nextAvailableId(allProps, baseId);
        obj = {
          id,
          subtype: "visualAsset",
          visualAssetId,
          pos: { x: worldPos.x, y, z: worldPos.z },
          rotY: 0,
          uniformScale: 1,
          visibleInPlay: true,
          collisionEnabled: true,
          opacity: 1,
        };
        region.props.push(obj);
        createdId = id;
      } else if (kind === "groundPatch" || kind === "ground") {
        const id = nextIdLocal("ground");
        obj = { id, pos: { x: worldPos.x, y, z: worldPos.z }, size: { w: 4, h: 0.5, d: 4 }, color: region.ground?.color ?? 0x7bb26a, opacity: 1, visibleInPlay: true, collisionEnabled: true, rotY: 0 };
        if (!region.groundPatches) region.groundPatches = [];
        region.groundPatches.push(obj);
        createdId = id;
      } else if (kind === "boundaryCollider" || kind === "boundary" || kind === "collider") {
        const id = nextIdLocal("boundary");
        obj = { id, pos: { x: worldPos.x, y, z: worldPos.z }, size: { w: 3, h: 3, d: 0.5 }, rotY: 0, color: 0x5a6a7a, opacity: 0.5, visibleInPlay: false, collisionEnabled: true };
        if (!region.boundaryColliders) region.boundaryColliders = [];
        region.boundaryColliders.push(obj);
        createdId = id;
      } else if (kind === "box" || kind === "prop" || kind === "fence" || kind === "gate" || kind === "forestBoundary" || kind === "dropPod" || kind === "resonator" || kind === "water" || kind === "island") {
        const id = nextIdLocal(subtype || kind || "prop");
        const actualSubtype = subtype || kind || "box";
        obj = { id, subtype: actualSubtype, pos: { x: worldPos.x, y, z: worldPos.z }, size: { w: 1.5, h: 1.0, d: 1.5 }, rotY: 0, visibleInPlay: true, collisionEnabled: actualSubtype !== "water", opacity: 1 };
        region.props.push(obj);
        createdId = id;
      } else if (kind === "platform") {
        const id = nextIdLocal("platform");
        obj = { id, x: worldPos.x, z: worldPos.z, w: 3, h: 3, height: 1.25, y, baseY: y };
        region.traversal.platforms.push(obj);
        createdId = id;
      } else if (kind === "obstacle") {
        const id = nextIdLocal("obstacle");
        obj = { id, x: worldPos.x, z: worldPos.z, w: 1.8, h: 1.8, height: 1.0, y, baseY: y };
        region.traversal.obstacles.push(obj);
        createdId = id;
      } else if (kind === "climbable") {
        const id = nextIdLocal("ladder");
        obj = { id, x: worldPos.x, z: worldPos.z - 1, w: 1.9, h: 0.5, bottomY: y, topY: y+2.4, topPlatform: { x: worldPos.x, z: worldPos.z + 1, w: 4, h: 3, topY: y+2.4, aabb: { minX: worldPos.x - 2, maxX: worldPos.x + 2, minZ: worldPos.z -1, maxZ: worldPos.z + 4 } }, wallNormal: { x: 0, z: 1 }, approachDir: { x: 0, z: -1 }, topEntryRegion: { minX: worldPos.x - 1, maxX: worldPos.x + 1, minZ: worldPos.z -1, maxZ: worldPos.z }, mantleExit: { x: worldPos.x, z: worldPos.z } };
        region.traversal.climbables.push(obj);
        createdId = id;
      } else if (kind === "tree" || kind === "rock" || kind === "fiber") {
        const id = nextIdLocal(kind);
        obj = { id, type: kind, pos: { x: worldPos.x, y, z: worldPos.z } };
        region.resources.push(obj);
        createdId = id;
      } else if (kind === "rusher" || kind === "spitter") {
        const id = nextIdLocal(kind);
        const pos = { x: worldPos.x, y, z: worldPos.z };
        obj = { id, type: kind, temperament: "AGGRESSIVE", speciesTag: kind === "rusher" ? "fang" : "spit", pos: { ...pos }, homePos: { ...pos }, roamRadius: 2.5, noticeRadius: 5.5, personalSpace: 1.9, leashRadius: 7.0 };
        if (kind === "spitter") obj.hostileSpecies = ["flutter"];
        region.creatures.push(obj);
        createdId = id;
      } else if (kind === "majorWaypoint") {
        const id = nextIdLocal("wp");
        obj = { id, type: "majorWaypoint", pos: { x: worldPos.x, y, z: worldPos.z }, displayName: "New Waypoint" };
        region.majorWaypoints.push(obj);
        createdId = id;
      } else if (kind === "extractionBeacon") {
        const id = nextIdLocal("beacon");
        obj = { id, type: "extractionBeacon", pos: { x: worldPos.x, y, z: worldPos.z }, displayName: "New Beacon" };
        region.extractionBeacons.push(obj);
        createdId = id;
      } else if (kind === "poi") {
        const id = nextIdLocal("poi");
        const poiType = subtype || "chest";
        obj = { id, type: poiType, pos: { x: worldPos.x, y, z: worldPos.z }, requires: null };
        region.pois.push(obj);
        createdId = id;
      } else {
        throw new Error(`unknown kind ${kind}`);
      }
    });
    if(!res.ok) return res;
    return { ok:true, id: createdId };
  }

  function updateRegion(regionId, patch) {
    const res = transact((candidate) => {
      const region = candidate.regions.find(r=> r.id === regionId);
      if (!region) throw new Error("region not found");
      if (patch.displayName !== undefined) region.displayName = patch.displayName;
      if (patch.bounds) region.bounds = { ...region.bounds, ...patch.bounds };
      if (patch.neighbors !== undefined) region.neighbors = patch.neighbors;
      if (patch.groundColor !== undefined) {
        if (!region.ground) region.ground = {};
        region.ground.color = patch.groundColor;
      }
    });
    return res;
  }

  // Draft-derived spatial helpers (read from canonical)
  function findContainingRegion(pos) {
    let found = null;
    let count = 0;
    for (const r of draft.regions) {
      const b = r.bounds;
      if (pos.x >= b.minX && pos.x <= b.maxX && pos.z >= b.minZ && pos.z <= b.maxZ) {
        found = r.id;
        count++;
      }
    }
    if (count !== 1) return null;
    return found;
  }
  function findNearestRegion(pos) {
    let best = null;
    let bestDist = Infinity;
    for (const r of draft.regions) {
      const b = r.bounds;
      const cx = (b.minX + b.maxX) * 0.5;
      const cz = (b.minZ + b.maxZ) * 0.5;
      const d = Math.hypot(pos.x - cx, pos.z - cz);
      if (d < bestDist) { bestDist = d; best = r.id; }
    }
    return best;
  }
  function getWorldExtents() {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const r of draft.regions) {
      if (r.bounds.minX < minX) minX = r.bounds.minX;
      if (r.bounds.maxX > maxX) maxX = r.bounds.maxX;
      if (r.bounds.minZ < minZ) minZ = r.bounds.minZ;
      if (r.bounds.maxZ > maxZ) maxZ = r.bounds.maxZ;
    }
    for (const region of draft.regions) {
      for (const p of region.props ?? []) {
        const w = p.size?.w ?? 1, d = p.size?.d ??1;
        const x = p.pos.x, z = p.pos.z;
        const hx = w/2, hz = d/2;
        if (x - hx < minX) minX = x - hx;
        if (x + hx > maxX) maxX = x + hx;
        if (z - hz < minZ) minZ = z - hz;
        if (z + hz > maxZ) maxZ = z + hz;
      }
      for (const gp of region.groundPatches ?? []) {
        const w = gp.size.w, d = gp.size.d;
        const x = gp.pos.x, z = gp.pos.z;
        const hx = w/2, hz = d/2;
        if (x - hx < minX) minX = x - hx;
        if (x + hx > maxX) maxX = x + hx;
        if (z - hz < minZ) minZ = z - hz;
        if (z + hz > maxZ) maxZ = z + hz;
      }
    }
    const pad = 2.5;
    return { minX: minX - pad, maxX: maxX + pad, minZ: minZ - pad, maxZ: maxZ + pad };
  }
  function getIntersectingRegions(footprint) {
    const res = [];
    const fx1 = footprint.x - footprint.w/2, fx2 = footprint.x + footprint.w/2;
    const fz1 = footprint.z - footprint.d/2, fz2 = footprint.z + footprint.d/2;
    for (const r of draft.regions) {
      const b = r.bounds;
      const overlap = !(fx2 < b.minX || fx1 > b.maxX || fz2 < b.minZ || fz1 > b.maxZ);
      if (overlap) res.push(r.id);
    }
    return res;
  }

  function getAllObjectIds(){
    const ids=[];
    for(const region of draft.regions){
      for(const p of region.props??[]) ids.push(p.id);
      for(const gp of region.groundPatches??[]) ids.push(gp.id);
      for(const bc of region.boundaryColliders??[]) ids.push(bc.id);
      for(const pl of region.traversal?.platforms??[]) ids.push(pl.id);
      for(const ob of region.traversal?.obstacles??[]) ids.push(ob.id);
      for(const cl of region.traversal?.climbables??[]) ids.push(cl.id);
      for(const r of region.resources??[]) ids.push(r.id);
      for(const cr of region.creatures??[]) ids.push(cr.id);
      for(const wp of region.majorWaypoints??[]) ids.push(wp.id);
      for(const bc of region.extractionBeacons??[]) ids.push(bc.id);
      for(const poi of region.pois??[]) ids.push(poi.id);
    }
    ids.push("camp_spawn");
    for(const region of draft.regions) for(const wp of region.majorWaypoints??[]) ids.push(wp.id+"__runSpawn");
    return ids;
  }

  function exportStableJson() {
    const toExport = deepClone(draft);
    if (!toExport.version) toExport.version = DRAFT_VERSION;
    function stripTransients(obj) {
      if (Array.isArray(obj)) { obj.forEach(stripTransients); return; }
      if (obj && typeof obj === "object") {
        for (const k of Object.keys(obj)) {
          if (k.startsWith("_")) delete obj[k];
          else stripTransients(obj[k]);
        }
      }
    }
    stripTransients(toExport);
    const v = normalizeWorldData(toExport);
    const stable = sortedClone(v);
    return stableStringify(stable);
  }

  // For tests: unsafe raw access (internal)
  function _getRawDraft(){ return draft; }
  function _setRawDraftForTest(newRaw){ draft = deepClone(newRaw); persist(); }

  return {
    getDraft,
    getDraftSnapshot,
    _getRawDraft,
    _setRawDraftForTest,
    setDraft,
    cloneRepo,
    loadPersisted,
    clearPersisted,
    hasPersisted,
    validate,
    getLastError,
    findRegion,
    findObjectById,
    getVisualAssets,
    findVisualAssetById,
    createVisualAsset,
    renameVisualAsset,
    deleteVisualAsset,
    addAssetPart,
    updateAssetPart,
    duplicateAssetPart,
    deleteAssetPart,
    updateAssetCollision,
    updateTransform,
    updateNormalizedTransform,
    updateInspectorField,
    duplicateObject,
    deleteObject,
    createObject,
    createObjectAtPosition,
    updateRegion,
    exportStableJson,
    nextId,
    transact,
    canUndo,
    canRedo,
    undo,
    redo,
    clearHistory,
    findContainingRegion,
    findNearestRegion,
    getWorldExtents,
    getIntersectingRegions,
    getAllObjectIds,
    getHistorySize: () => ({ undo: undoStack.length, redo: redoStack.length }),
  };
}
