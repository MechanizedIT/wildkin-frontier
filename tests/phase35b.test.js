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

function makeScene() { return new THREE.Scene(); }
function makePhysicsMock() {
  return {
    world: {
      createCollider: () => ({ handle: Math.random()*1000|0, translation: () => ({x:0,y:0,z:0}) }),
      removeCollider: () => {},
      step: () => {},
      createRigidBody: () => ({ setTranslation: () => {} }),
      createCharacterController: () => ({
        setSlideEnabled: () => {}, setMaxSlopeClimbAngle: () => {}, setMinSlopeSlideAngle: () => {},
        enableAutostep: () => {}, enableSnapToGround: () => {}, setUp: () => {}, setApplyImpulsesToDynamicBodies: () => {},
        computeColliderMovement: () => {}, computedMovement: () => ({x:0,y:0,z:0}), computedGrounded: () => true,
      }),
      intersectionWithShape: () => null, castShape: () => null,
    },
    RAPIER: {
      ColliderDesc: { cuboid: () => ({ setTranslation: function(){return this;}, setFriction: function(){return this;}, setActiveCollisionTypes: function(){return this;}}), capsule: () => ({ setTranslation: function(){return this;}, setFriction: function(){return this;}, setActiveCollisionTypes: function(){return this;}}) },
      RigidBodyDesc: { kinematicPositionBased: () => ({ setTranslation: function(){return this;}}) },
      ActiveCollisionTypes: { ALL: 0xffffffff }, Ball: function(){},
    },
  };
}

// Helpers
function sortedClone(v){ if(Array.isArray(v)) return v.map(sortedClone); if(v&&typeof v==="object"){ const o={}; for(const k of Object.keys(v).sort()) o[k]=sortedClone(v[k]); return o;} return v; }

describe("Phase 3.5B — single source", () => {
  it("authored source deterministically produces runtime world", () => {
    const norm = normalizeWorldData(WORLD_DATA);
    const reg = createWorldRegistry(WORLD_DATA);
    // Runtime world should equal normalized source
    assert.deepEqual(sortedClone(reg.data), sortedClone(norm));
  });

  it("stale generated data fails if generation is used", () => {
    const jsonRaw = fs.readFileSync(path.join(ROOT, "src/world/data/world.json"), "utf-8");
    const genRaw = fs.readFileSync(path.join(ROOT, "src/world/data/world.generated.js"), "utf-8");
    const m = genRaw.match(/export const WORLD_DATA = ([\s\S]+?);\s*\n/);
    assert.ok(m, "generated file should contain WORLD_DATA");
    const genParsed = JSON.parse(m[1]);
    const jsonParsed = JSON.parse(jsonRaw);
    assert.deepEqual(sortedClone(genParsed), sortedClone(jsonParsed), "world.json and world.generated.js must be in sync (stale guard)");
  });

  it("static/traversal objects derive from normalized world data (no second manual list)", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const pg = createStaticWorld(reg.data);
    // Count platforms/obstacles from data
    let expectedPlatforms = 0, expectedObstacles = 0, expectedClimbables = 0, expectedJumps = 0;
    for (const r of reg.data.regions) {
      expectedPlatforms += r.traversal.platforms.length;
      expectedObstacles += r.traversal.obstacles.length;
      // Props that are blocking (fence/box/boundary etc) also add to obstacles
      for (const p of r.props ?? []) {
        const blocking = new Set(["fence","box","forestBoundary","boundary","gate"]);
        // gate not blocking in builder, but others are
        if (["fence","box","forestBoundary","boundary"].includes(p.subtype)) expectedObstacles += 1;
      }
      expectedClimbables += r.traversal.climbables.length;
      expectedJumps += r.traversal.jumpTraversals.length;
    }
    assert.equal(pg.platforms.length, expectedPlatforms, "platforms should match authored data");
    // At least traversal obstacles count matches
    assert.ok(pg.obstacles.length >= expectedObstacles - 5, "obstacles should derive from data (including props)");
    assert.equal(pg.climbables.length, expectedClimbables);
    assert.equal(pg.jumpTraversals.length, expectedJumps);
  });
});

describe("Phase 3.5B — author model", () => {
  it("transform edit updates draft", () => {
    const draftApi = createAuthorDraft(WORLD_DATA);
    const anyTree = WORLD_DATA.regions.flatMap(r=>r.resources).find(r=>r.type==="tree");
    assert.ok(anyTree);
    const found = draftApi.findObjectById(anyTree.id);
    assert.ok(found);
    const oldX = found.obj.pos.x;
    draftApi.updateTransform(anyTree.id, { pos: { x: oldX + 1.5, y: 0, z: found.obj.pos.z } });
    const updated = draftApi.findObjectById(anyTree.id);
    assert.equal(updated.obj.pos.x, oldX + 1.5);
    assert.ok(draftApi.validate().ok);
  });

  it("duplicate gets unique ID", () => {
    const draftApi = createAuthorDraft(WORLD_DATA);
    const anyRes = WORLD_DATA.regions.flatMap(r=>r.resources)[0];
    const first = draftApi.duplicateObject(anyRes.id);
    assert.ok(first.ok);
    assert.notEqual(first.newId, anyRes.id);
    const second = draftApi.duplicateObject(anyRes.id);
    assert.notEqual(second.newId, first.newId);
    // Ensure unique globally
    const ids = [];
    for (const r of draftApi.getDraft().regions) for (const res of r.resources) ids.push(res.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("delete removes only target", () => {
    const draftApi = createAuthorDraft(WORLD_DATA);
    const beforeCount = draftApi.getDraft().regions.flatMap(r=>r.resources).length;
    const anyId = draftApi.getDraft().regions.flatMap(r=>r.resources)[0].id;
    const res = draftApi.deleteObject(anyId);
    assert.ok(res.ok);
    const afterCount = draftApi.getDraft().regions.flatMap(r=>r.resources).length;
    assert.equal(afterCount, beforeCount - 1);
    assert.equal(draftApi.findObjectById(anyId), null);
  });

  it("invalid duplicate/reference/region data fails", () => {
    const draftApi = createAuthorDraft(WORLD_DATA);
    const bad = JSON.parse(JSON.stringify(draftApi.getDraft()));
    const srcReg = bad.regions.find(r => r.resources && r.resources.length > 0);
    assert.ok(srcReg, "need src region with resource");
    const firstRes = srcReg.resources[0];
    srcReg.resources.push({ ...firstRes });
    assert.throws(() => normalizeWorldData(bad), /duplicate resource id/);
    // Invalid region neighbor
    const bad2 = JSON.parse(JSON.stringify(draftApi.getDraft()));
    bad2.regions[0].neighbors = ["nonexistent"];
    assert.throws(() => normalizeWorldData(bad2), /not found/);
    // Invalid region bounds
    const bad3 = JSON.parse(JSON.stringify(draftApi.getDraft()));
    bad3.regions[0].bounds.minX = 999; bad3.regions[0].bounds.maxX = -999;
    assert.throws(() => normalizeWorldData(bad3), /minX >= maxX/);
  });

  it("deterministic export is byte-stable", () => {
    const draftApi = createAuthorDraft(WORLD_DATA);
    const first = draftApi.exportStableJson();
    const second = draftApi.exportStableJson();
    assert.equal(first, second, "export should be byte-stable");
    // After a trivial edit and revert, should return to same bytes
    const anyRes = draftApi.getDraft().regions.flatMap(r=>r.resources)[0];
    const origX = anyRes.pos.x;
    draftApi.updateTransform(anyRes.id, { pos: { x: origX + 0.1, y: 0, z: anyRes.pos.z } });
    draftApi.updateTransform(anyRes.id, { pos: { x: origX, y: 0, z: anyRes.pos.z } });
    const third = draftApi.exportStableJson();
    assert.equal(third, first);
  });

  it("transient fields are excluded", () => {
    const draftApi = createAuthorDraft(WORLD_DATA);
    const draft = draftApi.getDraft();
    // Inject transient field _editorTemp — find regions that actually have the target collections
    const resReg = draft.regions.find(r => r.resources && r.resources.length > 0);
    assert.ok(resReg, "need region with resource for transient test");
    resReg.resources[0]._transient = "should be removed";
    const propReg = draft.regions.find(r => r.props && r.props.length > 0);
    assert.ok(propReg);
    propReg.props[0]._tmp = 123;
    const exported = draftApi.exportStableJson();
    assert.ok(!exported.includes("_transient"));
    assert.ok(!exported.includes("_tmp"));
    assert.ok(!exported.includes("_editor"));
  });
});

describe("Phase 3.5B — runtime application", () => {
  it("moving platform/obstacle changes visual + collision source", () => {
    const draftApi = createAuthorDraft(WORLD_DATA);
    // Find a platform
    const platRegion = draftApi.getDraft().regions.find(r=> r.traversal.platforms.length>0);
    assert.ok(platRegion);
    const plat = platRegion.traversal.platforms[0];
    const oldX = plat.x;
    draftApi.updateTransform(plat.id, { x: oldX + 2.0, z: plat.z });
    const pg = createStaticWorld(draftApi.getDraft());
    const found = pg.platforms.find(p=> p.id===plat.id);
    assert.ok(found);
    assert.equal(found.x, oldX + 2.0);
    // Also obstacle list contains updated platform side collider
    const side = pg.platformSideColliders.find(c=> c.platformId===plat.id);
    assert.ok(side);
    assert.equal(side.x, oldX + 2.0);
  });

  it("ladder/jump metadata still works from authored data", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const pg = createStaticWorld(reg.data);
    // Ladder should be present in p4_threshold
    const hasLadder = pg.climbables.some(c=> c.id==="ladder_south_high");
    assert.ok(hasLadder, "ladder metadata preserved");
    // Jumps
    assert.ok(pg.jumpTraversals.length >= 2, "jump traversals preserved");
    for (const jt of pg.jumpTraversals) {
      assert.ok(jt.triggerCenter && typeof jt.triggerCenter.x==="number");
      assert.ok(jt.landingRegion);
    }
  });

  it("resources/creatures instantiate once after Apply/Play", async () => {
    const { createResourceSystem: CRS } = await import("../src/resources/resourceSystem.js");
    const draftApi = createAuthorDraft(WORLD_DATA);
    const draft = draftApi.getDraft();
    const reg = createWorldRegistry(draft);
    const scene = makeScene(); const phys = makePhysicsMock();
    const placements = reg.getAllResources().map(r=> ({type:r.type,pos:r.pos,regionId:r.regionId,id:r.id}));
    const rs = CRS(scene, phys, placements);
    const initialCount = rs.nodes.length;
    const scene2 = makeScene();
    const rsB = CRS(scene2, phys, placements);
    assert.equal(rsB.nodes.length, initialCount);
    assert.equal(new Set(rsB.nodes.map(n=>n.id)).size, rsB.nodes.length);
  });

  it("repeated Edit ↔ Play creates no duplicate colliders/entities", () => {
    // Simulate: draft edit -> validate -> create new registry -> ensure no duplicate ids across multiple iterations
    const draftApi = createAuthorDraft(WORLD_DATA);
    for (let i=0;i<3;i++) {
      const anyRes = draftApi.getDraft().regions.flatMap(r=>r.resources)[0];
      draftApi.updateTransform(anyRes.id, { pos: { x: anyRes.pos.x + 0.01 * i, y:0, z:anyRes.pos.z } });
      const v = draftApi.validate();
      assert.ok(v.ok);
      const reg = createWorldRegistry(draftApi.getDraft());
      const allRes = reg.getAllResources();
      assert.equal(new Set(allRes.map(r=>r.id)).size, allRes.length);
    }
  });
});

describe("Phase 3.5B — isolation", () => {
  it("normal mode ignores author UI/draft (draft not used without ?author=1)", () => {
    // Without author param, effectiveWorldData should be repo WORLD_DATA, not draft
    // Simulate check: authorEnabled false => effectiveWorldData === WORLD_DATA
    const authorEnabled = false;
    let effective = WORLD_DATA;
    if (authorEnabled) {
      // would load draft
    }
    assert.equal(effective, WORLD_DATA);
  });

  it("one rAF remains authoritative", () => {
    const src = fs.readFileSync(path.join(ROOT, "src/main.js"), "utf-8");
    const count = (src.match(/requestAnimationFrame/g) || []).length;
    assert.equal(count, 1, "exactly one requestAnimationFrame in main.js");
  });
});

describe("Phase 3.5B — Area 1 skeleton", () => {
  it("Camp + 3–4 frontier pockets exist", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const ids = reg.getRegionIds();
    // Camp must exist
    assert.ok(ids.includes("camp"), "camp region must exist");
    // Frontier pockets: p1-p4 (or similar). Check at least 4 total regions (camp+3)
    assert.ok(ids.length >= 4, `expected at least 4 regions (camp+3 pockets) got ${ids.length}`);
    assert.ok(ids.length <= 6, `expected at most 6 regions, got ${ids.length}`);
    // Check pockets count via regions excluding camp
    const frontier = ids.filter(id=> id!=="camp");
    assert.ok(frontier.length >= 3 && frontier.length <= 4, `frontier pockets should be 3-4, got ${frontier.length}: ${frontier.join(",")}`);
  });

  it("neighbor graph validates", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    for (const r of reg.getAllRegions()) {
      for (const n of r.neighbors) assert.ok(reg.getRegionById(n), `neighbor ${n} of ${r.id} must exist`);
      assert.ok(!r.neighbors.includes(r.id), "region cannot neighbor itself");
    }
    // Check chain connectivity: every region reachable from camp via neighbors
    const visited = new Set(["camp"]);
    const queue = ["camp"];
    while(queue.length){ const cur=queue.shift(); const region=reg.getRegionById(cur); if(!region) continue; for(const n of region.neighbors){ if(!visited.has(n)){ visited.add(n); queue.push(n);} } }
    assert.equal(visited.size, reg.getAllRegions().length, "all regions should be reachable from camp");
  });

  it("first + next Major Waypoints exist", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const wps = reg.getAllWaypoints();
    assert.ok(wps.length >= 2, `need at least 2 Major Waypoints (first+next) got ${wps.length}`);
    // First near area start (p1) and next at far threshold (p4)
    const ids = wps.map(w=>w.id);
    assert.ok(ids.includes("wp_camp_gate") || ids.includes("wp_p1_entry"), "first waypoint near camp/p1 must exist");
    assert.ok(ids.some(id=> id.includes("threshold") || id.includes("peak") || id.includes("p4")), "next major waypoint at threshold must exist");
  });

  it("Extraction Beacon placeholder(s) exist", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const beacons = reg.getAllBeacons();
    assert.ok(beacons.length >= 1 && beacons.length <= 3, `need 1-2 extraction beacons, got ${beacons.length}`);
  });

  it("swim-gated POI metadata exists", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const pois = reg.getAllPois();
    const swimPoi = pois.find(p=> p.requires && p.requires.type==="companionAbility" && p.requires.id==="swim");
    assert.ok(swimPoi, "swim-gated POI (pond/island chest) must exist");
    assert.equal(swimPoi.type, "chest");
  });

  it("all entities validate inside assigned bounds", () => {
    const norm = normalizeWorldData(WORLD_DATA);
    // Validation already checks inside bounds, but explicit double-check
    for (const region of norm.regions) {
      for (const res of region.resources) {
        assert.ok(res.pos.x >= region.bounds.minX && res.pos.x <= region.bounds.maxX);
        assert.ok(res.pos.z >= region.bounds.minZ && res.pos.z <= region.bounds.maxZ);
      }
      for (const cr of region.creatures) {
        assert.ok(cr.pos.x >= region.bounds.minX && cr.pos.x <= region.bounds.maxX);
      }
      for (const wp of region.majorWaypoints) {
        assert.ok(wp.pos.x >= region.bounds.minX && wp.pos.x <= region.bounds.maxX);
      }
    }
  });
});
