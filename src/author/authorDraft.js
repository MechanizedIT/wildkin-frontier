// src/author/authorDraft.js — mutable draft clone, validation, localStorage persistence, deterministic export (Phase 4A.2)
// Transactional commit, bounded undo/redo, draft-derived spatial helpers, spawn transform helpers.

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
      normalizeWorldData(parsed);
      draft = parsed;
      const c = localStorage.getItem(STORAGE_KEY + ":counter");
      if (c) draftCounter = parseInt(c, 10) || 0;
      lastValidated = draft;
      undoStack = [];
      redoStack = [];
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
    undoStack = [];
    redoStack = [];
  }

  function hasPersisted() {
    try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; }
  }

  function validate() {
    try {
      const norm = normalizeWorldData(draft);
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
    return draft.regions.find(r => r.id === regionId) ?? null;
  }

  function findObjectById(id) {
    if (id === "camp_spawn" ) {
      // virtual camp spawn
      if (draft.camp?.playerSpawn) {
        // represent as virtual object with pos
        const sp = draft.camp.playerSpawn;
        // support both new {position,facingYaw} and old {x,y,z}
        let pos;
        let facing = 0;
        if (sp.position) {
          pos = { x: sp.position.x, y: sp.position.y ?? 0, z: sp.position.z };
          facing = sp.facingYaw ?? sp.facing ?? 0;
        } else {
          pos = { x: sp.x, y: sp.y ?? 0, z: sp.z };
          facing = sp.facingYaw ?? 0;
        }
        return { obj: { id: "camp_spawn", pos, facingYaw: facing, _virtual: true, _campSpawn: true }, region: findRegion("camp"), collection: "campSpawn", type: "campSpawn" };
      }
      return null;
    }
    if (id && id.endsWith("__runSpawn")) {
      const baseId = id.replace("__runSpawn",""); // waypoint id + suffix
      // find waypoint
      for (const region of draft.regions) {
        for (const wp of region.majorWaypoints ?? []) if (wp.id === baseId) {
          let rs = wp.runSpawn;
          if (!rs && wp.spawnOffset) {
            // legacy computed
            const base = wp.pos;
            rs = { position: { x: base.x + (wp.spawnOffset.x ?? 0), y: base.y ?? 0, z: base.z + (wp.spawnOffset.z ?? 0) }, facingYaw: 0 };
          }
          if (!rs) {
            // default run spawn near waypoint
            rs = { position: { x: wp.pos.x, y: wp.pos.y ?? 0, z: wp.pos.z + 1.2 }, facingYaw: 0 };
          }
          let pos;
          let facing;
          if (rs.position) { pos = { x: rs.position.x, y: rs.position.y ?? 0, z: rs.position.z }; facing = rs.facingYaw ?? 0; }
          else { pos = { x: rs.x, y: rs.y ?? 0, z: rs.z }; facing = rs.facingYaw ?? 0; }
          return { obj: { id: id, pos, facingYaw: facing, _virtual: true, _runSpawnFor: baseId }, region, collection: "runSpawn", type: "runSpawn" };
        }
      }
      return null;
    }
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

  // Patch helper internal: apply patch to obj within candidate
  function applyPatchToFound(found, patch, candidate) {
    const { obj } = found;
    if (found.collection === "camp") {
      if (patch.playerSpawn) {
        // support both formats
        if (patch.playerSpawn.position) obj.playerSpawn = deepClone(patch.playerSpawn);
        else obj.playerSpawn = { x: patch.playerSpawn.x, y: patch.playerSpawn.y ?? 0, z: patch.playerSpawn.z };
      }
      if (patch.pos) obj.pos = { x: patch.pos.x, y: patch.pos.y ?? obj.pos.y ?? 0, z: patch.pos.z };
      return;
    }
    if (found.collection === "campSpawn") {
      // virtual: patch camp.playerSpawn
      const camp = candidate.camp;
      if (!camp.playerSpawn) camp.playerSpawn = { position: { x: 0, y: 0, z: 0 }, facingYaw: 0 };
      // normalize to new schema
      if (!camp.playerSpawn.position) {
        // migrate
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
      return;
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
  }

  function getCollectionArrayForCandidate(region, collection, candidate) {
    if (!region) return [];
    // find region in candidate by id
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
    // virtual spawn handling transactional
    if (id === "camp_spawn" || (id && id.endsWith("__runSpawn"))) {
      const res = transact((candidate) => {
        const found = (() => {
          // find in candidate via similar logic but using candidate directly
          if (id === "camp_spawn") {
            const sp = candidate.camp.playerSpawn;
            let pos; let facing=0;
            if (sp?.position) { pos = sp.position; facing = sp.facingYaw ?? 0; }
            else if (sp) { pos = sp; facing = sp.facingYaw ?? 0; }
            return { obj: { id, pos, facingYaw: facing, _virtual:true,_campSpawn:true }, region: candidate.regions.find(r=>r.id==="camp"), collection:"campSpawn", type:"campSpawn" };
          }
          if (id.endsWith("__runSpawn")) {
            const baseId = id.replace("__runSpawn","");
            for (const region of candidate.regions) for (const wp of region.majorWaypoints ?? []) if (wp.id===baseId) {
              let rs = wp.runSpawn;
              if (!rs && wp.spawnOffset) rs = { position: { x: wp.pos.x + (wp.spawnOffset.x??0), y: wp.pos.y ??0, z: wp.pos.z + (wp.spawnOffset.z??0) }, facingYaw:0 };
              if (!rs) rs = { position: { x: wp.pos.x, y: wp.pos.y??0, z: wp.pos.z+1.2 }, facingYaw:0 };
              let pos; let facing;
              if (rs.position) { pos = rs.position; facing = rs.facingYaw ??0; }
              else { pos = rs; facing = rs.facingYaw ??0; }
              return { obj: { id, pos, facingYaw: facing, _virtual:true,_runSpawnFor:baseId }, region, collection:"runSpawn", type:"runSpawn" };
            }
            return null;
          }
          return null;
        })();
        if (!found) throw new Error("spawn not found");
        applyPatchToFound(found, patch, candidate);
      });
      return res;
    }
    const res = transact((candidate) => {
      const found = (() => {
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
      })();
      if (!found) throw new Error("object not found");
      applyPatchToFound(found, patch, candidate);
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
    // virtual spawns cannot be deleted
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

  // Draft-derived spatial helpers
  function findContainingRegion(pos) {
    // strict nullable; overlap is validated as error elsewhere, but here return null if ambiguous
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
    // include authored geometry extents for padding
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
    // footprint: {x,z,w,d}
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
    getHistorySize: () => ({ undo: undoStack.length, redo: redoStack.length }),
  };
}
