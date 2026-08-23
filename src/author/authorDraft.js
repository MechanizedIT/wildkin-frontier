// src/author/authorDraft.js — mutable draft clone, validation, localStorage persistence, deterministic export (Phase 3.5B)

import { normalizeWorldData } from "../world/worldValidator.js";

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

function generateId(prefix) {
  // deterministic unique-ish but not random for export determinism? Use counter + timestamp slice
  // For author mode, uniqueness via counter persisted in draft
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function createAuthorDraft(repoData) {
  let draft = deepClone(repoData);
  // Ensure version is repo version or 3.5B
  if (!draft.version) draft.version = DRAFT_VERSION;

  let draftCounter = 0;
  let lastValidated = null;
  let lastError = null;

  function cloneRepo() {
    draft = deepClone(repoData);
    draftCounter = 0;
    lastValidated = null;
    lastError = null;
    persist();
    return draft;
  }

  function getDraft() {
    return draft;
  }

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
      // Validate before using
      normalizeWorldData(parsed);
      draft = parsed;
      const c = localStorage.getItem(STORAGE_KEY + ":counter");
      if (c) draftCounter = parseInt(c, 10) || 0;
      lastValidated = draft;
      return draft;
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
  }

  function hasPersisted() {
    try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; }
  }

  function validate() {
    try {
      const norm = normalizeWorldData(draft);
      // Also ensure sorted stable? Validation passes
      lastValidated = norm;
      lastError = null;
      return { ok: true, data: norm };
    } catch (e) {
      lastError = e.message;
      return { ok: false, error: e.message };
    }
  }

  function getLastError() { return lastError; }

  // Mutations
  function nextId(prefix) {
    draftCounter++;
    persist();
    return `${prefix}_${draftCounter}_${Date.now().toString(36).slice(-4)}`;
  }

  function findRegion(regionId) {
    return draft.regions.find(r => r.id === regionId) ?? null;
  }

  function findObjectById(id) {
    if (id === "camp" && draft.camp) return { obj: draft.camp, region: null, collection: "camp", type: "camp" };
    for (const region of draft.regions) {
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

  function updateTransform(id, patch) {
    const found = findObjectById(id);
    if (!found) return { ok: false, error: "object not found" };
    const { obj } = found;
    if (found.collection === "camp") {
      if (patch.playerSpawn) obj.playerSpawn = { x: patch.playerSpawn.x, y: patch.playerSpawn.y ?? 0, z: patch.playerSpawn.z };
      if (patch.pos) obj.pos = { x: patch.pos.x, y: patch.pos.y ?? obj.pos.y ?? 0, z: patch.pos.z };
      persist();
      return { ok: true };
    }
    let creatureDelta = null;
    if (found.type === "creature" && patch.pos && obj.pos && obj.homePos && !patch.homePos && patch.moveHomeWithSpawn !== false) {
      creatureDelta = { x: patch.pos.x - obj.pos.x, z: patch.pos.z - obj.pos.z, y: (patch.pos.y ?? obj.pos.y ?? 0) - (obj.pos.y ?? 0) };
    }
    if (patch.pos) {
      obj.pos = { x: patch.pos.x, y: patch.pos.y ?? obj.pos.y ?? 0, z: patch.pos.z };
      if (creatureDelta && obj.homePos) {
        obj.homePos.x += creatureDelta.x;
        obj.homePos.z += creatureDelta.z;
        obj.homePos.y = (obj.homePos.y ?? 0) + creatureDelta.y;
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
        // y is pos.y for these
        if (obj.pos) obj.pos.y = patch.y;
        else obj.y = patch.y;
      }
    }
    if (patch.rotY !== undefined) {
      if (found.type !== "climbable" && found.type !== "platform" && found.type !== "obstacle") obj.rotY = patch.rotY;
      else if (found.type === "prop" || found.type === "groundPatch" || found.type === "boundaryCollider") obj.rotY = patch.rotY;
    }
    if (patch.rotationY !== undefined) obj.rotY = patch.rotationY;
    if (patch.size) obj.size = { ...obj.size, ...patch.size };
    if (patch.w !== undefined) { obj.w = patch.w; if (patch.h !== undefined) obj.h = patch.h; }
    if (patch.height !== undefined) obj.height = patch.height;
    if (patch.regionId && found.region && patch.regionId !== found.region.id) {
      const targetRegion = findRegion(patch.regionId);
      if (!targetRegion) return { ok: false, error: "target region not found" };
      const arr = getCollectionArray(found.region, found.collection);
      const idx = arr.indexOf(obj);
      if (idx >= 0) arr.splice(idx, 1);
      const targetArr = getCollectionArray(targetRegion, found.collection);
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
    // Presentation / collision for static families
    if (patch.visibleInPlay !== undefined) obj.visibleInPlay = !!patch.visibleInPlay;
    if (patch.collisionEnabled !== undefined) obj.collisionEnabled = !!patch.collisionEnabled;
    if (patch.opacity !== undefined) obj.opacity = patch.opacity;
    if (patch.color !== undefined) obj.color = patch.color;
    if (patch.tint !== undefined) obj.color = patch.tint;
    persist();
    return { ok: true };
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

  function duplicateObject(id) {
    const found = findObjectById(id);
    if (!found) return { ok: false, error: "not found" };
    const clone = deepClone(found.obj);
    const baseId = clone.id;
    // Generate unique id: base + _copy + counter
    let newId = baseId + "_copy";
    // Ensure unique globally
    let counter = 1;
    while (findObjectById(newId)) {
      newId = baseId + "_copy" + counter;
      counter++;
      if (counter > 100) newId = nextId(baseId);
    }
    clone.id = newId;
    // Slight offset so not overlapping
    if (clone.pos) { clone.pos.x += 0.8; clone.pos.z += 0.8; }
    else if (clone.x !== undefined) { clone.x += 0.8; clone.z += 0.8; }
    // For creatures also offset homePos
    if (clone.homePos) { clone.homePos.x += 0.8; clone.homePos.z += 0.8; }
    const arr = getCollectionArray(found.region, found.collection);
    arr.push(clone);
    persist();
    return { ok: true, newId };
  }

  function deleteObject(id) {
    const found = findObjectById(id);
    if (!found) return { ok: false, error: "not found" };
    const arr = getCollectionArray(found.region, found.collection);
    const idx = arr.indexOf(found.obj);
    if (idx >= 0) {
      arr.splice(idx, 1);
      persist();
      return { ok: true };
    }
    return { ok: false, error: "not removed" };
  }

  function createObject(regionId, kind, subtype) {
    const region = findRegion(regionId);
    if (!region) return { ok: false, error: "region not found" };
    const centerX = (region.bounds.minX + region.bounds.maxX) * 0.5;
    const centerZ = (region.bounds.minZ + region.bounds.maxZ) * 0.5;
    let obj = null;
    if (kind === "groundPatch" || kind === "ground") {
      const id = nextId("ground");
      obj = { id, pos: { x: centerX, y: -0.25, z: centerZ }, size: { w: 4, h: 0.5, d: 4 }, color: region.ground?.color ?? 0x7bb26a, opacity: 1, visibleInPlay: true, collisionEnabled: true, rotY: 0 };
      if (!region.groundPatches) region.groundPatches = [];
      region.groundPatches.push(obj);
    } else if (kind === "boundaryCollider" || kind === "boundary" || kind === "collider") {
      const id = nextId("boundary");
      obj = { id, pos: { x: centerX, y: 1.5, z: centerZ }, size: { w: 3, h: 3, d: 0.5 }, rotY: 0, color: 0x5a6a7a, opacity: 0.5, visibleInPlay: false, collisionEnabled: true };
      if (!region.boundaryColliders) region.boundaryColliders = [];
      region.boundaryColliders.push(obj);
    } else if (kind === "box" || kind === "prop") {
      const id = nextId(subtype || "prop");
      obj = { id, subtype: subtype || "box", pos: { x: centerX, y: 0, z: centerZ }, size: { w: 1.5, h: 1.0, d: 1.5 }, rotY: 0, visibleInPlay: true, collisionEnabled: true, opacity: 1 };
      region.props.push(obj);
    } else if (kind === "platform") {
      const id = nextId("platform");
      obj = { id, x: centerX, z: centerZ, w: 3, h: 3, height: 1.25 };
      region.traversal.platforms.push(obj);
    } else if (kind === "obstacle") {
      const id = nextId("obstacle");
      obj = { id, x: centerX, z: centerZ, w: 1.8, h: 1.8, height: 1.0 };
      region.traversal.obstacles.push(obj);
    } else if (kind === "climbable") {
      const id = nextId("ladder");
      obj = { id, x: centerX, z: centerZ - 1, w: 1.9, h: 0.5, bottomY: 0, topY: 2.4, topPlatform: { x: centerX, z: centerZ + 1, w: 4, h: 3, topY: 2.4, aabb: { minX: centerX - 2, maxX: centerX + 2, minZ: centerZ -1, maxZ: centerZ + 4 } }, wallNormal: { x: 0, z: 1 }, approachDir: { x: 0, z: -1 }, topEntryRegion: { minX: centerX - 1, maxX: centerX + 1, minZ: centerZ -1, maxZ: centerZ }, mantleExit: { x: centerX, z: centerZ } };
      region.traversal.climbables.push(obj);
    } else if (kind === "tree" || kind === "rock" || kind === "fiber") {
      const id = nextId(kind);
      obj = { id, type: kind, pos: { x: centerX + (Math.random() - 0.5) * 2, y: 0, z: centerZ + (Math.random() - 0.5) * 2 } };
      region.resources.push(obj);
    } else if (kind === "rusher" || kind === "spitter") {
      const id = nextId(kind);
      const pos = { x: centerX, y: 0, z: centerZ };
      obj = { id, type: kind, temperament: "AGGRESSIVE", speciesTag: kind === "rusher" ? "fang" : "spit", pos: { ...pos }, homePos: { ...pos }, roamRadius: 2.5, noticeRadius: 5.5, personalSpace: 1.9, leashRadius: 7.0 };
      if (kind === "spitter") obj.hostileSpecies = ["flutter"];
      region.creatures.push(obj);
    } else if (kind === "majorWaypoint") {
      const id = nextId("wp");
      obj = { id, type: "majorWaypoint", pos: { x: centerX, y: 0, z: centerZ }, displayName: "New Waypoint" };
      region.majorWaypoints.push(obj);
    } else if (kind === "extractionBeacon") {
      const id = nextId("beacon");
      obj = { id, type: "extractionBeacon", pos: { x: centerX, y: 0, z: centerZ }, displayName: "New Beacon" };
      region.extractionBeacons.push(obj);
    } else if (kind === "poi") {
      const id = nextId("poi");
      const poiType = subtype || "chest";
      obj = { id, type: poiType, pos: { x: centerX, y: 0, z: centerZ }, requires: null };
      if (poiType === "chest" && Math.random() < 0.3) obj.requires = { type: "companionAbility", id: "swim" };
      region.pois.push(obj);
    } else if (kind === "fence" || kind === "gate" || kind === "forestBoundary" || kind === "dropPod" || kind === "resonator" || kind === "water" || kind === "island") {
      const id = nextId(kind);
      obj = { id, subtype: kind, pos: { x: centerX, y: 0, z: centerZ }, size: { w: 2, h: 1, d: 2 }, rotY: 0, visibleInPlay: true, collisionEnabled: kind !== "water" && kind !== "gate", opacity: 1 };
      region.props.push(obj);
    } else {
      return { ok: false, error: `unknown kind ${kind}` };
    }
    persist();
    return { ok: true, id: obj.id };
  }

  function updateRegion(regionId, patch) {
    const region = findRegion(regionId);
    if (!region) return { ok: false, error: "region not found" };
    if (patch.displayName !== undefined) region.displayName = patch.displayName;
    if (patch.bounds) region.bounds = { ...region.bounds, ...patch.bounds };
    if (patch.neighbors !== undefined) region.neighbors = patch.neighbors;
    if (patch.groundColor !== undefined) {
      if (!region.ground) region.ground = {};
      region.ground.color = patch.groundColor;
    }
    persist();
    return { ok: true };
  }

  function exportStableJson() {
    // Remove transient editor fields if any (none stored currently) and produce stable string
    const toExport = deepClone(draft);
    // Ensure version
    if (!toExport.version) toExport.version = DRAFT_VERSION;
    // Remove any transient fields prefixed with _
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
    // Validate before export
    const v = normalizeWorldData(toExport);
    const stable = sortedClone(v);
    return stableStringify(stable);
  }

  // Initialize draft with persisted if available will be handled by caller

  return {
    getDraft,
    setDraft,
    cloneRepo,
    loadPersisted,
    clearPersisted,
    hasPersisted,
    validate,
    getLastError,
    findRegion,
    findObjectById,
    updateTransform,
    duplicateObject,
    deleteObject,
    createObject,
    updateRegion,
    exportStableJson,
    nextId,
  };
}
