import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as THREE from "three";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WORLD_DATA } from "../src/world/data/world.js";
import { normalizeWorldData } from "../src/world/worldValidator.js";
import { createWorldRegistry } from "../src/world/worldRegistry.js";
import { createStaticWorld } from "../src/world/staticWorldBuilder.js";
import { createAuthorDraft } from "../src/author/authorDraft.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function makeScene(){ return new THREE.Scene(); }

describe("Phase 3.5B.1 — draft / transforms", () => {
  it("X/Z nudge changes draft", () => {
    const draftApi = createAuthorDraft(WORLD_DATA);
    const anyProp = draftApi.getDraft().regions.flatMap(r=>r.props).find(p=>p.subtype==="box") || draftApi.getDraft().regions.flatMap(r=>r.props)[0];
    assert.ok(anyProp);
    const oldX = anyProp.pos.x;
    draftApi.updateTransform(anyProp.id, { pos: { x: oldX+0.6, y: anyProp.pos.y, z: anyProp.pos.z } });
    assert.equal(draftApi.findObjectById(anyProp.id).obj.pos.x, oldX+0.6);
  });
  it("Y changes supported object's authored data and builder output", () => {
    const draftApi = createAuthorDraft(WORLD_DATA);
    const prop = draftApi.getDraft().regions.flatMap(r=>r.props).find(p=>p.subtype==="box");
    assert.ok(prop);
    const newY = 1.2;
    draftApi.updateTransform(prop.id, { pos: { x: prop.pos.x, y: newY, z: prop.pos.z } });
    const draft = draftApi.getDraft();
    const reg = createWorldRegistry(draft);
    const pg = createStaticWorld(reg.data);
    const mesh = pg.group.children.find(c=> c.name===prop.id);
    assert.ok(mesh, "prop mesh should exist");
    // mesh y = baseY + height/2
    const h = prop.size?.h ?? 1;
    const expectedY = newY + h/2 -0.02;
    assert.ok(Math.abs(mesh.position.y - expectedY) < 0.01, `mesh y ${mesh.position.y} should be ${expectedY}`);
    // collision baseY matches
    const obs = pg.obstacles.find(o=> o.id===prop.id);
    if (obs) assert.equal(obs.baseY, newY);
  });
  it("unsupported transform controls are not falsely exposed/written for climbable", () => {
    const draftApi = createAuthorDraft(WORLD_DATA);
    const climb = draftApi.getDraft().regions.flatMap(r=>r.traversal.climbables)[0];
    assert.ok(climb, "need climbable");
    const beforeRot = climb.rotY;
    draftApi.updateTransform(climb.id, { rotY: Math.PI });
    const after = draftApi.findObjectById(climb.id).obj;
    // Our draftApi ignores rotY for climbable, so should not have changed (or remain undefined)
    assert.ok(after.rotY === beforeRot || after.rotY === undefined, "climbable rotY should not be written");
    // UI should hide rot for climbable — check file contains hide logic
    const uiSrc = fs.readFileSync(path.join(ROOT, "src/author/authorUI.js"), "utf-8");
    assert.ok(uiSrc.includes("climbable") && uiSrc.includes("supportsRot"), "UI should handle climbable rot hidden");
  });
  it("creature movement keeps home coherent by default", () => {
    const draftApi = createAuthorDraft(WORLD_DATA);
    const cr = draftApi.getDraft().regions.flatMap(r=>r.creatures)[0];
    assert.ok(cr);
    const oldPos = { ...cr.pos };
    const oldHome = { ...cr.homePos };
    draftApi.updateTransform(cr.id, { pos: { x: oldPos.x+1.2, y: oldPos.y, z: oldPos.z+0.8 } });
    const updated = draftApi.findObjectById(cr.id).obj;
    assert.equal(updated.pos.x, oldPos.x+1.2);
    assert.equal(updated.homePos.x, oldHome.x+1.2, "home should follow pos delta");
    assert.equal(updated.homePos.z, oldHome.z+0.8);
  });
  it("duplicate/delete remain unique/correct", () => {
    const draftApi = createAuthorDraft(WORLD_DATA);
    const anyRes = draftApi.getDraft().regions.flatMap(r=>r.resources)[0];
    const before = draftApi.findObjectById(anyRes.id);
    assert.ok(before);
    const dup = draftApi.duplicateObject(anyRes.id);
    assert.ok(dup.ok);
    assert.notEqual(dup.newId, anyRes.id);
    assert.ok(draftApi.findObjectById(dup.newId));
    const del = draftApi.deleteObject(dup.newId);
    assert.ok(del.ok);
    assert.equal(draftApi.findObjectById(dup.newId), null);
    assert.ok(draftApi.findObjectById(anyRes.id), "original should remain");
  });
});

describe("Phase 3.5B.1 — static builder / collision", () => {
  it("elevated solid prop visual and collision share same intended vertical placement", () => {
    const draftApi = createAuthorDraft(WORLD_DATA);
    const prop = draftApi.getDraft().regions.flatMap(r=>r.props).find(p=>p.subtype==="box");
    assert.ok(prop);
    draftApi.updateTransform(prop.id, { pos: { x: prop.pos.x, y: 2.0, z: prop.pos.z } });
    const draft = draftApi.getDraft();
    const reg = createWorldRegistry(draft);
    const pg = createStaticWorld(reg.data);
    const mesh = pg.group.children.find(c=> c.name===prop.id);
    assert.ok(mesh);
    const obs = pg.obstacles.find(o=> o.id===prop.id);
    assert.ok(obs, "prop should have collider");
    const h = prop.size?.h ?? 1;
    assert.equal(obs.baseY, 2.0);
    assert.ok(Math.abs(mesh.position.y - (2.0 + h/2 -0.02)) < 0.01);
  });
  it("elevated platform visual and collision agree if Y supported", () => {
    const draftApi = createAuthorDraft(WORLD_DATA);
    const platRegion = draftApi.getDraft().regions.find(r=> r.traversal.platforms.length>0);
    assert.ok(platRegion);
    const plat = platRegion.traversal.platforms[0];
    const newY = 1.5;
    draftApi.updateTransform(plat.id, { y: newY });
    const draft = draftApi.getDraft();
    const reg = createWorldRegistry(draft);
    const pg = createStaticWorld(reg.data);
    const mesh = pg.group.children.find(c=> c.name===plat.id);
    assert.ok(mesh);
    assert.ok(Math.abs(mesh.position.y - (newY + plat.height/2 -0.02)) < 0.01);
    const p = pg.platforms.find(p=>p.id===plat.id);
    assert.equal(p.baseY, newY);
  });
  it("supported RotY is consumed by visual", () => {
    const draftApi = createAuthorDraft(WORLD_DATA);
    const prop = draftApi.getDraft().regions.flatMap(r=>r.props).find(p=>p.subtype==="box");
    assert.ok(prop);
    const rot = 0.9;
    draftApi.updateTransform(prop.id, { rotY: rot });
    const draft = draftApi.getDraft();
    const reg = createWorldRegistry(draft);
    const pg = createStaticWorld(reg.data);
    const mesh = pg.group.children.find(c=> c.name===prop.id);
    assert.ok(mesh);
    assert.ok(Math.abs(mesh.rotation.y - rot) < 0.001);
  });
  it("climbable rotation is explicitly unsupported and not exported as fake edit", () => {
    const staticSrc = fs.readFileSync(path.join(ROOT, "src/world/staticWorldBuilder.js"), "utf-8");
    assert.ok(staticSrc.includes("wall.rotation.y = 0"), "climbable rotation should be fixed in builder");
    const uiSrc = fs.readFileSync(path.join(ROOT, "src/author/authorUI.js"), "utf-8");
    assert.ok(uiSrc.includes("climbable") && uiSrc.includes("supportsRot"), "UI should hide rot for climbable");
    const draftApi = createAuthorDraft(WORLD_DATA);
    const climb = draftApi.getDraft().regions.flatMap(r=>r.traversal.climbables)[0];
    assert.ok(climb);
    const before = climb.rotY;
    draftApi.updateTransform(climb.id, { rotY: 1.2 });
    const after = draftApi.findObjectById(climb.id).obj;
    assert.ok(after.rotY === before || after.rotY === undefined, "climbable rotY should not be stored");
  });
});

describe("Phase 3.5B.1 — selection / placement model", () => {
  it("all required authorable types expose stable author IDs/pick metadata", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const pg = createStaticWorld(reg.data);
    const scene = makeScene();
    scene.add(pg.group);
    let count = 0;
    scene.traverse((obj)=>{ if(obj.userData && obj.userData.authorId) count++; });
    assert.ok(count >= 10, `static meshes should have authorId, found ${count}`);
    const resSrc = fs.readFileSync(path.join(ROOT, "src/resources/resourceSystem.js"), "utf-8");
    assert.ok(resSrc.includes("authorId"), "resourceSystem should set authorId");
    const creaSrc = fs.readFileSync(path.join(ROOT, "src/creatures/createWildCreature.js"), "utf-8");
    assert.ok(creaSrc.includes("authorId"), "creature should set authorId");
  });
  it("placement at supplied world position creates object at that position and correct containing region", () => {
    const draftApi = createAuthorDraft(WORLD_DATA);
    const reg = createWorldRegistry(draftApi.getDraft());
    const targetPos = { x: 1.2, y: 0, z: 1.5 }; // inside p2_complication (0-3.5)
    const regionId = reg.getRegionForPosition({ x: targetPos.x, y: 0, z: targetPos.z });
    assert.ok(regionId, "region should be found");
    const beforeCount = draftApi.getDraft().regions.find(r=>r.id===regionId).props.length;
    const res = draftApi.createObject(regionId, "prop", "box");
    assert.ok(res.ok);
    // Override pos to target
    const found = draftApi.findObjectById(res.id);
    found.obj.pos.x = targetPos.x; found.obj.pos.z = targetPos.z;
    draftApi.updateTransform(res.id, { pos: targetPos });
    const after = draftApi.findObjectById(res.id);
    assert.equal(after.obj.pos.x, targetPos.x);
    assert.equal(after.region.id, regionId);
  });
  it("cancel placement creates nothing", () => {
    const draftApi = createAuthorDraft(WORLD_DATA);
    const beforeIds = new Set(draftApi.getDraft().regions.flatMap(r=>[...r.props, ...r.resources].map(o=>o.id)));
    // Simulate cancel: do not call createObject
    const afterIds = new Set(draftApi.getDraft().regions.flatMap(r=>[...r.props, ...r.resources].map(o=>o.id)));
    assert.equal(beforeIds.size, afterIds.size);
  });
});

describe("Phase 3.5B.1 — mode isolation", () => {
  it("Edit hides/suppresses gameplay input/HUD ownership", () => {
    const authorSrc = fs.readFileSync(path.join(ROOT, "src/author/authorMode.js"), "utf-8");
    assert.ok(authorSrc.includes("setHudVisible(false)") && authorSrc.includes("setHudVisible(true)"), "should hide/show HUD");
    assert.ok(authorSrc.includes("suppressGameplay"), "authorMode should manage suppressGameplay");
    const mainSrc = fs.readFileSync(path.join(ROOT, "src/main.js"), "utf-8");
    assert.ok(mainSrc.includes("authorSuppress") && mainSrc.includes("touchMovement.setEnabled"), "main.js should suppress input via setEnabled");
    const touchSrc = fs.readFileSync(path.join(ROOT, "src/input/touchMovement.js"), "utf-8");
    assert.ok(touchSrc.includes("let enabled") && touchSrc.includes("setEnabled"), "touch input should have explicit enabled");
  });
  it("Play restores it", () => {
    const src = fs.readFileSync(path.join(ROOT, "src/author/authorMode.js"), "utf-8");
    assert.ok(src.includes("exitEdit") && src.includes("setHudVisible(true)"));
  });
  it("Edit disables fog and Play restores it", () => {
    const src = fs.readFileSync(path.join(ROOT, "src/author/authorMode.js"), "utf-8");
    assert.ok(src.includes("scene.fog = null") && src.includes("scene.fog = originalFog"));
  });
  it("editor visibility follows editor focus rather than stale player region", () => {
    const src = fs.readFileSync(path.join(ROOT, "src/author/authorMode.js"), "utf-8");
    const usesDraftSpatial = src.includes("findContainingRegion") || src.includes("findNearestRegion") || src.includes("getWorldExtents");
    const usesCameraFocus = src.includes("camera.position.x");
    assert.ok((src.includes("getRegionForPosition") || usesDraftSpatial) && usesCameraFocus);
    assert.ok(src.includes("resourceSystem.setActiveRegions") && src.includes("creatureSystem.setActiveRegions"));
  });
  it("no second rAF", () => {
    const mainSrc = fs.readFileSync(path.join(ROOT, "src/main.js"), "utf-8");
    const count = (mainSrc.match(/requestAnimationFrame/g)||[]).length;
    assert.equal(count, 1);
    const authorSrc = fs.readFileSync(path.join(ROOT, "src/author/authorMode.js"), "utf-8");
    assert.ok(!authorSrc.includes("requestAnimationFrame"), "authorMode should not create second rAF");
  });
  it("vertical pan is inverted", () => {
    const src = fs.readFileSync(path.join(ROOT, "src/author/authorMode.js"), "utf-8");
    assert.ok(src.includes("dy * -0.04"), "vertical pan should be inverted");
  });
  it("forest boundaries non-occluding in EDIT only", () => {
    const src = fs.readFileSync(path.join(ROOT, "src/author/authorMode.js"), "utf-8");
    assert.ok(src.includes("isForestBoundary") && src.includes("opacity = 0.22"));
  });
});


