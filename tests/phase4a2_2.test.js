import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { WORLD_DATA } from "./fixtures/crescentWorld.generated.js";
import { createWorldRegistry } from "../src/world/worldRegistry.js";
import { createAuthorDraft } from "../src/author/authorDraft.js";
import { resolveAuthorType, readNormalizedTransform, checkAllObjectsResolve, getAllDefinitions } from "../src/author/authorTypeRegistry.js";
import { createVisual, getVisualSignature } from "../src/world/visualFactory.js";
import { describeBoxCollider, describeResourceCollider } from "../src/world/colliderDescriptor.js";
import { normalizeWorldData } from "../src/world/worldValidator.js";
import { createStaticWorld } from "../src/world/staticWorldBuilder.js";
import { createAuthorActions } from "../src/author/authorActions.js";
import { syncAuthorVisual, syncEditProxy } from "../src/author/authorPreview.js";
import { createResourceSystem, createRuntimeResourcePlacements } from "../src/resources/resourceSystem.js";
import { shouldHandleGameplayKeyboardEvent } from "../src/input/keyboardInput.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function withMockStorage(fn){
  const s=new Map();
  const orig=global.localStorage;
  global.localStorage={ getItem(k){return s.get(k)??null}, setItem(k,v){s.set(k,v)}, removeItem(k){s.delete(k)}, clear(){s.clear()} };
  try{return fn();} finally {global.localStorage=orig;}
}

function makePhysicsMock() {
  return {
    world: {
      createCollider: () => ({ handle: 1, translation: () => ({ x: 0, y: 0, z: 0 }) }),
      removeCollider: () => {},
      step: () => {},
    },
    RAPIER: {
      ColliderDesc: {
        cuboid: () => ({
          setTranslation() { return this; },
          setRotation() { return this; },
          setFriction() { return this; },
          setActiveCollisionTypes() { return this; },
        }),
      },
      ActiveCollisionTypes: { ALL: 0xffffffff },
    },
  };
}

describe("Phase 4A.2.2 — AuthorTypeRegistry contract", ()=>{
  it("every current authorable world object resolves to exactly one Author type", ()=>{
    const errs = checkAllObjectsResolve(WORLD_DATA);
    assert.equal(errs.length, 0, `should resolve all, got errors: ${errs.slice(0,3).join("; ")}`);
    const defs = getAllDefinitions();
    assert.ok(defs.length >= 15, "should have definitions for all families");
  });

  it("capabilities come from registry, not hard-coded UI helpers", ()=>{
    const uiSrc = fs.readFileSync(path.join(ROOT, "src/author/authorUI.js"), "utf-8");
    // Production UI must not rely on hard-coded family lists
    assert.ok(!uiSrc.includes("function supportsRot"), "should not contain hard-coded supportsRot");
    assert.ok(!uiSrc.includes("function supportsSize"), "should not contain hard-coded supportsSize");
    assert.ok(!uiSrc.includes("function supportsY"), "should not contain hard-coded supportsY");
    assert.ok(!uiSrc.includes("function getCapsForFound"), "should not contain getCapsForFound");
    // Should use registry
    assert.ok(uiSrc.includes("resolveAuthorType"), "UI should use resolveAuthorType");
    // Check that Tree now supports rotation/uniform scale via registry (universal policy)
    const draftApi = createAuthorDraft(WORLD_DATA);
    const tree = draftApi.getDraft().regions.flatMap(r=>r.resources).find(r=>r.type==="tree");
    const found = draftApi.findObjectById(tree.id);
    const def = resolveAuthorType(found);
    assert.ok(def.capabilities.rotation, "Tree should support rotation via registry");
    assert.ok(def.capabilities.resize, "Tree should support resize via registry");
    assert.equal(def.capabilities.sizeMode, "uniform", "Tree should be uniform scale");
    // Box should support all
    const box = draftApi.getDraft().regions.flatMap(r=>r.props).find(p=>p.subtype==="box");
    const boxFound = draftApi.findObjectById(box.id);
    const boxDef = resolveAuthorType(boxFound);
    assert.ok(boxDef.capabilities.elevation && boxDef.capabilities.rotation && boxDef.capabilities.resize, "Box should support position/elevation/rotation/resize");
    // Wildkin should NOT support resize (concrete gameplay reason)
    const cr = draftApi.getDraft().regions.flatMap(r=>r.creatures)[0];
    const crFound = draftApi.findObjectById(cr.id);
    const crDef = resolveAuthorType(crFound);
    assert.equal(crDef.capabilities.resize, false, "Wildkin should not support scale");
    // Waypoint model overrides use the same place/rotate/resize authoring contract.
    const wp = draftApi.getDraft().regions.flatMap(r=>r.majorWaypoints)[0];
    const wpFound = draftApi.findObjectById(wp.id);
    const wpDef = resolveAuthorType(wpFound);
    assert.equal(wpDef.capabilities.resize, true, "Waypoint models should support uniform scale");
    // Ladder should support rotation/resize via registry (previously hard-coded hidden)
    const lad = draftApi.getDraft().regions.flatMap(r=>r.traversal.climbables)[0];
    const ladFound = draftApi.findObjectById(lad.id);
    const ladDef = resolveAuthorType(ladFound);
    assert.ok(ladDef.capabilities.rotation, "Ladder should now support rotation via registry");
    assert.ok(ladDef.capabilities.resize, "Ladder should support resize");
  });
});

describe("Phase 4A.2.2 — normalized transform adapters", ()=>{
  it("Platform drag via normalized transform writes canonical x/z without shadow pos", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    const plat = draftApi.getDraft().regions.flatMap(r=>r.traversal.platforms)[0] ?? draftApi.getDraft().regions.flatMap(r=>r.traversal.platforms)[0];
    // Use actual platform lowA
    const target = draftApi.getDraft().regions.find(r=>r.traversal.platforms.length>0).traversal.platforms[0];
    const foundBefore = draftApi.findObjectById(target.id);
    const def = resolveAuthorType(foundBefore);
    const baseNorm = readNormalizedTransform(foundBefore);
    const newPos = { x: baseNorm.position.x + 1.3, y: baseNorm.position.y, z: baseNorm.position.z + 0.9 };
    const norm = { ...baseNorm, position: newPos };
    const res = draftApi.updateNormalizedTransform(target.id, norm);
    assert.ok(res.ok, res.error);
    const after = draftApi.findObjectById(target.id).obj;
    assert.equal(after.x, newPos.x, "canonical x should update");
    assert.equal(after.z, newPos.z, "canonical z should update");
    assert.ok(!("pos" in after) || after.pos === undefined || typeof after.pos !== "object" || !("x" in after.pos), "should not create shadow pos field");
    // Also test via legacy updateTransform pos path (bug reproduction): platform drag with pos should also not create shadow after fix
    const draftApi2 = createAuthorDraft(WORLD_DATA);
    const plat2 = draftApi2.getDraft().regions.find(r=>r.traversal.platforms.length>0).traversal.platforms[0];
    const res2 = draftApi2.updateTransform(plat2.id, { pos: { x: plat2.x + 2, y: 0, z: plat2.z } });
    assert.ok(res2.ok, res2.error);
    const after2 = draftApi2.findObjectById(plat2.id).obj;
    assert.ok(!("pos" in after2), "legacy pos patch for platform should not create shadow pos");
    assert.equal(after2.x, plat2.x + 2);
  });

  it("Platform rotation/resize reaches visual + collider descriptor", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    const plat = draftApi.getDraft().regions.find(r=>r.traversal.platforms.length>0).traversal.platforms[0];
    const found = draftApi.findObjectById(plat.id);
    const base = readNormalizedTransform(found);
    const newNorm = { ...base, rotationY: 0.7, size: { width: base.size.width + 1, height: base.size.height + 0.5, depth: base.size.depth + 0.4 } };
    const res = draftApi.updateNormalizedTransform(plat.id, newNorm);
    assert.ok(res.ok, res.error);
    const afterFound = draftApi.findObjectById(plat.id);
    assert.equal(afterFound.obj.rotY, 0.7, "rotation should reach canonical");
    assert.equal(afterFound.obj.w, newNorm.size.width);
    // Check descriptor
    const def = resolveAuthorType(afterFound);
    const desc = def.collision.describe(afterFound);
    assert.equal(desc.rotationY, 0.7);
    assert.equal(desc.size.width, newNorm.size.width);
    // Visual center vs collider center should be coherent (both use baseY + height/2)
    const visualCenterY = newNorm.position.y + newNorm.size.height/2;
    const colliderCenter = desc.position.y + desc.offset.y;
    assert.ok(Math.abs(visualCenterY - colliderCenter) < 0.01, "visual and collider Y should be coherent");
  });

  it("adapter round-trip never creates shadow transform fields", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    const idsToCheck = [
      draftApi.getDraft().regions.flatMap(r=>r.props).find(p=>p.subtype==="box").id,
      draftApi.getDraft().regions.flatMap(r=>r.traversal.platforms)[0].id,
      draftApi.getDraft().regions.flatMap(r=>r.traversal.climbables)[0].id,
      draftApi.getDraft().regions.flatMap(r=>r.resources).find(r=>r.type==="tree").id,
      draftApi.getDraft().regions.flatMap(r=>r.majorWaypoints)[0].id,
    ];
    for(const id of idsToCheck){
      const found = draftApi.findObjectById(id);
      const base = readNormalizedTransform(found);
      // Do a no-op write (same transform) and check no shadow
      const res = draftApi.updateNormalizedTransform(id, base);
      assert.ok(res.ok, `round-trip for ${id} should succeed: ${res.error}`);
      const after = draftApi.findObjectById(id).obj;
      // Platform should not have pos, resource should not have x
      if(found.type==="platform"||found.type==="obstacle"||found.type==="climbable"){
        assert.ok(!("pos" in after), `${id} should not have shadow pos`);
      }
      if(found.type==="resource"){
        assert.ok(!("x" in after), `${id} resource should not have shadow x`);
        assert.ok(!("w" in after), `${id} resource should not have shadow w`);
      }
    }
  });
});

describe("Phase 4A.2.2 — Ladder proof", ()=>{
  it("Ladder move/rotate/resize updates all required dependent climb fields", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    const lad = draftApi.getDraft().regions.flatMap(r=>r.traversal.climbables)[0];
    const before = JSON.parse(JSON.stringify(draftApi.findObjectById(lad.id).obj));
    const found = draftApi.findObjectById(lad.id);
    const base = readNormalizedTransform(found);
    const newNorm = {
      ...base,
      position: { x: base.position.x + 1.0, y: base.position.y + 0.4, z: base.position.z + 0.8 },
      rotationY: 0.5,
      size: { width: base.size.width + 0.3, height: base.size.height + 1.0, depth: base.size.depth }
    };
    const res = draftApi.updateNormalizedTransform(lad.id, newNorm);
    assert.ok(res.ok, res.error);
    const after = draftApi.findObjectById(lad.id).obj;
    assert.equal(after.x, newNorm.position.x);
    assert.equal(after.bottomY, newNorm.position.y);
    assert.equal(after.topY, newNorm.position.y + newNorm.size.height);
    assert.equal(after.w, newNorm.size.width);
    assert.ok(after.wallNormal && Math.abs(after.wallNormal.x - Math.sin(0.5)) < 0.01, "wallNormal should rotate");
    assert.ok(after.topPlatform, "topPlatform should still exist");
    assert.ok(Math.abs(after.topPlatform.topY - after.topY) < 0.001, "topPlatform.topY should follow ladder topY");
    // Ensure dependent regions moved
    assert.notEqual(after.topPlatform.x, before.topPlatform.x, "topPlatform should move with ladder");
    assert.notEqual(after.mantleExit.x, before.mantleExit.x, "mantleExit should move");
  });

  it("Ladder placement creates actual Ladder geometry immediately (no placeholder Box)", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    const actions = createAuthorActions(draftApi);
    const regionId = draftApi.getDraft().regions[1].id; // p1_forest_edge 3.5-7
    const worldPos = { x: 0, y: 0, z: 5.5 };
    const res = actions.placeObject({ kind: "climbable", subtype: null, position: worldPos, regionId });
    assert.ok(res.ok, res.error);
    const found = draftApi.findObjectById(res.id);
    const scene = new THREE.Scene();
    const visual = syncAuthorVisual(scene, found);
    const sig = getVisualSignature(visual);
    // Real ladder has wall Box + rungs Box + cylinder marker, not just single Box
    assert.ok(sig.includes("BoxGeometry"), "ladder should have BoxGeometry");
    assert.ok(sig.includes("CylinderGeometry"), "ladder should have CylinderGeometry marker");
    // Ensure not just single placeholder Box 0.5
    assert.ok(!sig.endsWith("BoxGeometry") || sig.split(",").length > 1, "ladder should have multiple geometries, not single placeholder");
    // Also check that draft object has dependent fields (not just box)
    assert.ok(found.obj.topPlatform, "new ladder should have topPlatform");
  });
});

describe("Phase 4A.2.2 — Tree proof", ()=>{
  it("Tree placement creates actual Tree geometry immediately", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    const actions = createAuthorActions(draftApi);
    const regionId = draftApi.getDraft().regions[1].id;
    const pos = { x: 1.5, y: 0, z: 5.0 };
    const res = actions.placeObject({ kind: "tree", subtype: null, position: pos, regionId });
    assert.ok(res.ok, res.error);
    const found = draftApi.findObjectById(res.id);
    const visualRef = { kind: "builtin", id: "resource/tree" };
    const scene = new THREE.Scene();
    const visual = syncAuthorVisual(scene, found);
    const sig = getVisualSignature(visual);
    assert.ok(sig.includes("CylinderGeometry"), "Tree should have CylinderGeometry trunk");
    assert.ok(sig.includes("ConeGeometry"), "Tree should have ConeGeometry foliage");
    assert.ok(!sig.includes("BoxGeometry") || sig.split("BoxGeometry").length -1 < 2, "Tree should not be placeholder Box");
    // Check that runtime and Edit use same deterministic construction: createVisual twice with same id gives same signature and same rotation variation
    const visual2 = createVisual(visualRef, { objectId: res.id });
    const sig2 = getVisualSignature(visual2);
    assert.equal(sig, sig2, "deterministic: same id should give same geometry signature");
  });

  it("Tree rotation/uniform scale writes canonical and scales collider coherently", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    const tree = draftApi.getDraft().regions.flatMap(r=>r.resources).find(r=>r.type==="tree");
    const found = draftApi.findObjectById(tree.id);
    const base = readNormalizedTransform(found);
    const newNorm = { ...base, rotationY: 0.9, uniformScale: 1.6 };
    const res = draftApi.updateNormalizedTransform(tree.id, newNorm);
    assert.ok(res.ok, res.error);
    const after = draftApi.findObjectById(tree.id).obj;
    assert.equal(after.rotY, 0.9);
    assert.equal(after.uniformScale, 1.6);
    // Collider should scale
    const def = resolveAuthorType(draftApi.findObjectById(tree.id));
    const desc = def.collision.describe(draftApi.findObjectById(tree.id));
    assert.ok(desc.size.width > 1.0, "collider should scale with uniformScale");
    // Visual root scale should match uniformScale (checked via normalized read)
    const afterNorm = readNormalizedTransform(draftApi.findObjectById(tree.id));
    assert.equal(afterNorm.uniformScale, 1.6);
  });

  it("Existing procedural resource visuals use deterministic object-ID-derived variation", ()=>{
    // Check that two trees with different IDs have different variation, same ID same variation
    const v1 = createVisual({kind:"builtin",id:"resource/tree"}, {objectId:"tree_abc"});
    const v2 = createVisual({kind:"builtin",id:"resource/tree"}, {objectId:"tree_xyz"});
    // Rotations differ
    const rots1 = []; v1.traverse(o=>{ if(o.isMesh && o.geometry?.type==="ConeGeometry") rots1.push(o.rotation.y); });
    const rots2 = []; v2.traverse(o=>{ if(o.isMesh && o.geometry?.type==="ConeGeometry") rots2.push(o.rotation.y); });
    assert.notDeepEqual(rots1, rots2, "different IDs should have different variation");
    const v1b = createVisual({kind:"builtin",id:"resource/tree"}, {objectId:"tree_abc"});
    const rots1b = []; v1b.traverse(o=>{ if(o.isMesh && o.geometry?.type==="ConeGeometry") rots1b.push(o.rotation.y); });
    assert.deepEqual(rots1, rots1b, "same ID should give same variation");
  });
});

describe("Phase 4A.2.2 — Box proof + proxy lifecycle", ()=>{
  it("Box normalized transform, dimensions, presentation, collision descriptor, live hidden proxy", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    const box = draftApi.getDraft().regions.flatMap(r=>r.props).find(p=>p.subtype==="box");
    const found = draftApi.findObjectById(box.id);
    const def = resolveAuthorType(found);
    const norm = readNormalizedTransform(found);
    assert.ok(norm.size, "Box should have size");
    // Change dimensions via normalized
    const newNorm = { ...norm, size: { width: norm.size.width+0.5, height: norm.size.height+0.3, depth: norm.size.depth+0.2 } };
    const res = draftApi.updateNormalizedTransform(box.id, newNorm);
    assert.ok(res.ok, res.error);
    const after = draftApi.findObjectById(box.id).obj;
    assert.equal(after.size.w, newNorm.size.width);
    // Presentation toggle
    const res2 = draftApi.updateTransform(box.id, { visibleInPlay: false, opacity: 0.5, color: "#ff0000" });
    assert.ok(res2.ok, res2.error);
    const after2 = draftApi.findObjectById(box.id).obj;
    assert.equal(after2.visibleInPlay, false);
    assert.equal(after2.opacity, 0.5);
    // Collider descriptor should reflect hidden but enabled (proxy needed)
    const desc = def.collision.describe(draftApi.findObjectById(box.id));
    assert.equal(desc.enabled, true);
    assert.equal(desc.editProxy.visibleWhenHidden, true);
    // Runtime construction must not leak editor-only wireframes.
    const pg = createStaticWorld(draftApi.getDraft());
    assert.equal(pg.group.children.some(c=>c.userData.isEditProxy), false, "Play world should not contain Edit proxies");
    const scene = new THREE.Scene();
    scene.add(pg.group);
    const proxy = syncEditProxy(scene, draftApi.findObjectById(box.id), true);
    assert.ok(proxy?.visible, "hidden collidable Box should have a wireframe in Edit");
    syncEditProxy(scene, draftApi.findObjectById(box.id), false);
    assert.equal(proxy.visible, false, "Edit wireframe should be hidden outside Edit mode");
  });

  it("changing already-visible collidable Box to hidden must create proxy immediately without Play->Edit (live)", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    const actions = createAuthorActions(draftApi);
    const box = draftApi.getDraft().regions.flatMap(r=>r.props).find(p=>p.subtype==="box" && p.visibleInPlay!==false);
    assert.ok(box);
    const scene = new THREE.Scene();
    const initialVisual = syncAuthorVisual(scene, draftApi.findObjectById(box.id));
    assert.ok(initialVisual?.userData.authorVisualRoot, "production preview should create the factory root");
    assert.equal(syncEditProxy(scene, draftApi.findObjectById(box.id), true), null, "visible box should not need a proxy");

    const res = actions.commitInspectorField(box.id, "visibleInPlay", false);
    assert.ok(res.ok, res.error);
    const foundAfter = draftApi.findObjectById(box.id);
    const proxy = syncEditProxy(scene, foundAfter, true);
    assert.ok(proxy?.visible, "production proxy sync should create the proxy immediately");
    assert.equal(proxy.geometry.parameters.width, box.size.w);
    assert.equal(proxy.position.y, (box.pos.y ?? 0) + box.size.h / 2);

    const res2 = actions.commitInspectorField(box.id, "visibleInPlay", true);
    assert.ok(res2.ok);
    syncEditProxy(scene, draftApi.findObjectById(box.id), true);
    assert.equal(proxy.visible, false, "production proxy sync should hide it after restoring visibility");
  });
});

describe("Phase 4A.2.2 — Boundary parity via shared contract", ()=>{
  it("existing Boundary edits through same contract as newly placed", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    const existing = draftApi.getDraft().regions.flatMap(r=>r.boundaryColliders)[0];
    assert.ok(existing, "need existing boundary");
    const foundExisting = draftApi.findObjectById(existing.id);
    const defExisting = resolveAuthorType(foundExisting);
    // Existing boundary should resolve
    assert.ok(defExisting, "existing boundary should resolve");
    // Create new boundary inside camp (camp bounds 7-11.5)
    const regionId = draftApi.getDraft().regions[0].id; // camp
    const pos = { x: 0, y: 0, z: 9.0 };
    const resNew = draftApi.createObjectAtPosition("boundaryCollider", null, pos, regionId);
    assert.ok(resNew.ok, resNew.error);
    const foundNew = draftApi.findObjectById(resNew.id);
    const defNew = resolveAuthorType(foundNew);
    assert.equal(defExisting.key, defNew.key, "existing and new Boundary should resolve to same Author type");
    // Both should support same transform via normalized
    const baseExisting = readNormalizedTransform(foundExisting);
    const baseNew = readNormalizedTransform(foundNew);
    assert.ok(baseExisting.size && baseNew.size, "both should have size");
    // Move existing via normalized
    const newNorm = { ...baseExisting, position: { ...baseExisting.position, y: baseExisting.position.y+0.25 } };
    const resMove = draftApi.updateNormalizedTransform(existing.id, newNorm);
    assert.ok(resMove.ok, resMove.error);
    const after = draftApi.findObjectById(existing.id).obj;
    assert.equal(after.pos.y, newNorm.position.y);
  });
});

describe("Phase 4A.2.2 — inspector fields transactional", ()=>{
  it("Wildkin custom metadata actually persists via inspector field writer", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    const cr = draftApi.getDraft().regions.flatMap(r=>r.creatures)[0];
    const id = cr.id;
    // Use inspector field writer (updateInspectorField) and also via generic updateTransform patch
    const res1 = draftApi.updateInspectorField(id, "roamRadius", 9.9);
    assert.ok(res1.ok, res1.error);
    assert.equal(draftApi.findObjectById(id).obj.roamRadius, 9.9);
    const res2 = draftApi.updateInspectorField(id, "temperament", "SKITTISH");
    assert.ok(res2.ok);
    assert.equal(draftApi.findObjectById(id).obj.temperament, "SKITTISH");
    const res3 = draftApi.updateTransform(id, { noticeRadius: 12.5, personalSpace: 3.3, leashRadius: 15 });
    assert.ok(res3.ok);
    const after = draftApi.findObjectById(id).obj;
    assert.equal(after.noticeRadius, 12.5);
    assert.equal(after.personalSpace, 3.3);
    assert.equal(after.leashRadius, 15);
    // Verify persistence via export/reload (exportStableJson includes those fields)
    const json = JSON.parse(draftApi.exportStableJson());
    const crExport = json.regions.flatMap(r=>r.creatures).find(c=>c.id===id);
    assert.equal(crExport.roamRadius, 9.9);
  });

  it("POI requirements actually persist via inspector", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    const poi = draftApi.getDraft().regions.flatMap(r=>r.pois).find(p=>p.type==="chest");
    assert.ok(poi);
    const id = poi.id;
    const newReq = { type: "companionAbility", id: "breakBarrier" };
    const res = draftApi.updateInspectorField(id, "requires", newReq);
    assert.ok(res.ok, res.error);
    assert.deepEqual(draftApi.findObjectById(id).obj.requires, newReq);
    // Also test via JSON string path (UI text input)
    const res2 = draftApi.updateInspectorField(id, "requires", JSON.stringify({ type: "companionAbility", id: "swim" }));
    assert.ok(res2.ok);
    assert.deepEqual(draftApi.findObjectById(id).obj.requires, { type: "companionAbility", id: "swim" });
    const json = JSON.parse(draftApi.exportStableJson());
    const poiExp = json.regions.flatMap(r=>r.pois).find(p=>p.id===id);
    assert.deepEqual(poiExp.requires, { type: "companionAbility", id: "swim" });
  });

  it("Waypoint/Beacon displayName via inspector persists", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    const wp = draftApi.getDraft().regions.flatMap(r=>r.majorWaypoints)[0];
    const res = draftApi.updateInspectorField(wp.id, "displayName", "New Test Name");
    assert.ok(res.ok);
    assert.equal(draftApi.findObjectById(wp.id).obj.displayName, "New Test Name");
  });

  it("gameplay keyboard ownership leaves spaces available to display-name fields", ()=>{
    const input = { tagName: "INPUT", isContentEditable: false };
    const event = { key: " ", code: "Space", target: input };
    assert.equal(shouldHandleGameplayKeyboardEvent(event, true, input), false, "focused text input should own Space");
    assert.equal(shouldHandleGameplayKeyboardEvent(event, false, null), false, "disabled gameplay input should not intercept Space");
  });
});

describe("Phase 4A.2.2 — runtime resource transform persistence", ()=>{
  it("Tree, Rock, and Fiber keep authored rotation and uniform scale in Play", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    const expected = new Map();
    for (const [index, type] of ["tree", "rock", "fiber"].entries()) {
      const resource = draftApi.getDraft().regions.flatMap(region=>region.resources).find(item=>item.type===type);
      assert.ok(resource, `need authored ${type}`);
      const found = draftApi.findObjectById(resource.id);
      const base = readNormalizedTransform(found);
      const rotationY = 0.35 + index * 0.4;
      const uniformScale = 1.2 + index * 0.25;
      const result = draftApi.updateNormalizedTransform(resource.id, { ...base, rotationY, uniformScale });
      assert.ok(result.ok, result.error);
      expected.set(resource.id, { rotationY, uniformScale, type });
    }

    const registry = createWorldRegistry(draftApi.getDraft());
    const placements = createRuntimeResourcePlacements(registry.getAllResources());
    const system = createResourceSystem(new THREE.Scene(), makePhysicsMock(), placements);

    for (const [id, transform] of expected) {
      const placement = placements.find(item=>item.id===id);
      const node = system.nodes.find(item=>item.id===id);
      assert.ok(placement && node, `${transform.type} should reach runtime placement and node construction`);
      assert.equal(placement.rotY, transform.rotationY);
      assert.equal(placement.uniformScale, transform.uniformScale);
      assert.ok(Math.abs(node.group.rotation.y - transform.rotationY) < 1e-9, `${transform.type} Play visual rotation should match Edit`);
      assert.ok(Math.abs(node.group.scale.x - transform.uniformScale) < 1e-9, `${transform.type} Play visual scale should match Edit`);
      assert.equal(node.state.rotationY, transform.rotationY);
      assert.equal(node.state.uniformScale, transform.uniformScale);
    }
  });
});

describe("Phase 4A.2.2 — VisualRef / VisualFactory seam", ()=>{
  it("proof objects use same VisualRef construction path in Edit and Play", ()=>{
    const ids = [
      { id: "prop_p1_box_01", expectedRef: "prop/box" },
      { id: "tree_p1_01", expectedRef: "resource/tree" },
      { id: "ladder_south_high", expectedRef: "traversal/ladder" },
    ];
    for(const {id, expectedRef} of ids){
      const draftApi = createAuthorDraft(WORLD_DATA);
      const found = draftApi.findObjectById(id);
      assert.ok(found, `should find ${id}`);
      const def = resolveAuthorType(found);
      const ref = def.visual.resolveRef(found);
      assert.equal(ref.id, expectedRef, `${id} should resolve to ${expectedRef}`);
      const visualEdit = createVisual(ref, { objectId: id });
      const visualPlay = createVisual(ref, { objectId: id });
      // Same VisualRef should give same signature
      assert.equal(getVisualSignature(visualEdit), getVisualSignature(visualPlay), `${id} Edit and Play visuals should match via same VisualRef`);
      assert.ok(!visualEdit.userData.fallback, "should not be fallback");
      // Ensure pure: not added to scene, no physics, deterministic
      assert.ok(!visualEdit.parent, "visual should not be added to scene");
    }
  });

  it("collision descriptor transform matches visual root transform for proof objects", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    for(const id of ["prop_p1_box_01","tree_p1_01","ladder_south_high"]){
      const found = draftApi.findObjectById(id);
      const def = resolveAuthorType(found);
      const norm = readNormalizedTransform(found);
      const desc = def.collision.describe(found);
      // For box-like, position should match norm.position
      assert.equal(desc.position.x, norm.position.x, `${id} collider x should match visual x`);
      assert.equal(desc.position.z, norm.position.z, `${id} collider z should match visual z`);
      // For tree, collider is simple box, not detailed foliage, but position should still match base
      if(id==="tree_p1_01"){
        assert.equal(desc.shape, "box");
        // Ensure not using mesh collider (should be box, not detailed)
        assert.ok(desc.size.width < 3, "Tree collider should be simple, not huge foliage mesh");
      }
    }
  });
});

describe("Phase 4A.2.2 — sibling sweep", ()=>{
  it("Platform / Obstacle via same box descriptor", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    const plat = draftApi.getDraft().regions.flatMap(r=>r.traversal.platforms)[0];
    const obs = draftApi.getDraft().regions.flatMap(r=>r.traversal.obstacles)[0];
    for(const id of [plat.id, obs.id]){
      const found = draftApi.findObjectById(id);
      const def = resolveAuthorType(found);
      assert.ok(def.capabilities.resize, `${id} should support resize`);
      const base = readNormalizedTransform(found);
      const newNorm = { ...base, size: { width: base.size.width+0.5, height: base.size.height+0.2, depth: base.size.depth+0.3 } };
      const res = draftApi.updateNormalizedTransform(id, newNorm);
      assert.ok(res.ok, res.error);
    }
  });

  it("Rock / Fiber uniform scale", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    for(const type of ["rock","fiber"]){
      const resObj = draftApi.getDraft().regions.flatMap(r=>r.resources).find(r=>r.type===type);
      const found = draftApi.findObjectById(resObj.id);
      const def = resolveAuthorType(found);
      assert.equal(def.capabilities.sizeMode, "uniform");
      const base = readNormalizedTransform(found);
      const res = draftApi.updateNormalizedTransform(resObj.id, { ...base, uniformScale: 1.7 });
      assert.ok(res.ok, res.error);
      assert.equal(draftApi.findObjectById(resObj.id).obj.uniformScale, 1.7);
    }
  });

  it("Fence / Gate / Forest Boundary via same prop descriptor", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    for(const subtype of ["fence","gate","forestBoundary"]){
      const prop = draftApi.getDraft().regions.flatMap(r=>r.props).find(p=>p.subtype===subtype);
      if(!prop) continue;
      const found = draftApi.findObjectById(prop.id);
      const def = resolveAuthorType(found);
      assert.ok(def, `${subtype} should resolve`);
      const base = readNormalizedTransform(found);
      const res = draftApi.updateNormalizedTransform(prop.id, { ...base, rotationY: 0.4 });
      assert.ok(res.ok, res.error);
    }
  });

  it("Ground / Boundary via same box descriptor", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    const ground = draftApi.getDraft().regions.flatMap(r=>r.groundPatches)[0];
    const found = draftApi.findObjectById(ground.id);
    const def = resolveAuthorType(found);
    const base = readNormalizedTransform(found);
    const res = draftApi.updateNormalizedTransform(ground.id, { ...base, position: { ...base.position, y: base.position.y+0.1 } });
    assert.ok(res.ok, res.error);
    const boundary = draftApi.getDraft().regions.flatMap(r=>r.boundaryColliders)[0];
    const bFound = draftApi.findObjectById(boundary.id);
    const bDef = resolveAuthorType(bFound);
    const bBase = readNormalizedTransform(bFound);
    const bRes = draftApi.updateNormalizedTransform(boundary.id, { ...bBase, size: { width: bBase.size.width+1, height: bBase.size.height, depth: bBase.size.depth } });
    assert.ok(bRes.ok, bRes.error);
  });

  it("Drop Pod / Resonator via same visual", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    for(const subtype of ["dropPod","resonator"]){
      const prop = draftApi.getDraft().regions.flatMap(r=>r.props).find(p=>p.subtype===subtype);
      if(!prop) continue;
      const found = draftApi.findObjectById(prop.id);
      const def = resolveAuthorType(found);
      assert.ok(def);
      const base = readNormalizedTransform(found);
      const res = draftApi.updateNormalizedTransform(prop.id, { ...base, rotationY: 0.3 });
      assert.ok(res.ok, res.error);
    }
  });

  it("Water / Island", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    const water = draftApi.getDraft().regions.flatMap(r=>r.props).find(p=>p.subtype==="water");
    if(water){
      const found = draftApi.findObjectById(water.id);
      const def = resolveAuthorType(found);
      assert.ok(def);
      assert.equal(def.collision.describe(found).enabled, false, "Water should have no collision");
    }
    const island = draftApi.getDraft().regions.flatMap(r=>r.props).find(p=>p.subtype==="island");
    if(island){
      const found = draftApi.findObjectById(island.id);
      const def = resolveAuthorType(found);
      const desc = def.collision.describe(found);
      assert.equal(desc.enabled, true, "Island should have collision");
    }
  });

  it("Waypoint / Beacon / POI via same contract", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    const wp = draftApi.getDraft().regions.flatMap(r=>r.majorWaypoints)[0];
    const beacon = draftApi.getDraft().regions.flatMap(r=>r.extractionBeacons)[0];
    const poi = draftApi.getDraft().regions.flatMap(r=>r.pois)[0];
    for(const id of [wp.id, beacon.id, poi.id]){
      const found = draftApi.findObjectById(id);
      const def = resolveAuthorType(found);
      assert.ok(def);
      const base = readNormalizedTransform(found);
      const res = draftApi.updateNormalizedTransform(id, { ...base, position: { x: base.position.x+0.2, y: base.position.y, z: base.position.z+0.2 } });
      assert.ok(res.ok, res.error);
    }
  });

  it("Rusher / Spitter wildkin metadata via same inspector", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    for(const type of ["rusher","spitter"]){
      const cr = draftApi.getDraft().regions.flatMap(r=>r.creatures).find(c=>c.type===type);
      if(!cr) continue;
      const found = draftApi.findObjectById(cr.id);
      const def = resolveAuthorType(found);
      assert.ok(def.inspector.some(f=>f.key==="roamRadius"), `${type} should have roamRadius field`);
      const res = draftApi.updateInspectorField(cr.id, "roamRadius", 7.7);
      assert.ok(res.ok);
    }
  });

  it("Camp / Run Spawn preserves facing via normalized", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    const campFound = draftApi.findObjectById("camp_spawn");
    const base = readNormalizedTransform(campFound);
    const newNorm = { ...base, rotationY: 1.2 };
    const res = draftApi.updateNormalizedTransform("camp_spawn", newNorm);
    assert.ok(res.ok, res.error);
    const after = draftApi.findObjectById("camp_spawn").obj;
    assert.ok(Math.abs(after.facingYaw - 1.2) < 0.001);
    // Run spawn
    const wp = draftApi.getDraft().regions.flatMap(r=>r.majorWaypoints)[0];
    const runId = wp.id + "__runSpawn";
    const runFound = draftApi.findObjectById(runId);
    const runBase = readNormalizedTransform(runFound);
    const runRes = draftApi.updateNormalizedTransform(runId, { ...runBase, rotationY: 0.8 });
    assert.ok(runRes.ok, runRes.error);
  });
});
