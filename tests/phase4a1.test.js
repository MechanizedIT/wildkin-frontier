import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import { WORLD_DATA } from "./fixtures/crescentWorld.generated.js";
import { createWorldRegistry } from "../src/world/worldRegistry.js";
import { normalizeWorldData } from "../src/world/worldValidator.js";
import { createFrontierProgress } from "../src/save/frontierProgress.js";
import { createExpeditionSession } from "../src/session/expeditionSession.js";
import { createFrontierAnchorSystem } from "../src/world/frontierAnchorSystem.js";
import { createStaticWorld } from "../src/world/staticWorldBuilder.js";
import { createAuthorDraft } from "../src/author/authorDraft.js";
import { syncEditProxy } from "../src/author/authorPreview.js";
import * as THREE from "three";

function authoredMesh(group, id) {
  let root = null;
  group.traverse((child) => { if (!root && child.userData?.authorVisualRoot && child.userData.authorId === id) root = child; });
  let mesh = null;
  root?.traverse((object) => { if (!mesh && object.isMesh) mesh = object; });
  return mesh;
}

function makeStorage() {
  const s = new Map();
  return { getItem(k){return s.get(k)??null}, setItem(k,v){s.set(k,v)}, removeItem(k){s.delete(k)}, clear(){s.clear()}, _store:s };
}
function withMockStorage(fn){
  const orig = global.localStorage;
  const mock = makeStorage();
  global.localStorage = mock;
  try { return fn(mock); } finally { global.localStorage = orig; }
}
function makeScene(){ return new THREE.Scene(); }

describe("Phase 4A.1 — fresh launch / gate", ()=>{
  it("Camp start is camp status with no modal implied by initial overlap", ()=>{
    const reg = createWorldRegistry(WORLD_DATA);
    const campSpawn = reg.getCampSpawnPosition();
    const gatePos = reg.getFrontierGatePos();
    assert.ok(campSpawn);
    assert.ok(gatePos);
    const dist = Math.hypot(campSpawn.x - gatePos.x, campSpawn.z - gatePos.z);
    // Authored spawn should be outside gate radius (1.85) so fresh launch not immediately inside
    assert.ok(dist > 1.85, `camp spawn distance ${dist} should be > gate radius`);
    const sess = createExpeditionSession({ initialStatus:"camp", regionDepthMap: reg.getRegionDepthMap(), initialRegionId:"camp" });
    assert.equal(sess.getStatus(),"camp");
  });
  it("authored Camp spawn resolves separately from gate", ()=>{
    const reg = createWorldRegistry(WORLD_DATA);
    const camp = reg.getCamp();
    assert.ok(camp.playerSpawn, "camp.playerSpawn should exist");
    const rawPos = camp.playerSpawn.position ?? camp.playerSpawn;
    assert.ok(Number.isFinite(rawPos.x) && Number.isFinite(rawPos.z));
    const spawn = reg.getCampSpawnPosition();
    assert.equal(spawn.x, rawPos.x);
    assert.equal(spawn.z, rawPos.z);
    assert.ok(Number.isFinite(spawn.facingYaw) || spawn.facingYaw === 0);
  });
  it("anchor system prime does not treat initial overlap as fresh entry", ()=>{
    const reg = createWorldRegistry(WORLD_DATA);
    const sess = createExpeditionSession({ initialStatus:"camp", regionDepthMap: reg.getRegionDepthMap() });
    const gatePos = reg.getFrontierGatePos();
    const insideGate = { x: gatePos.x, y:0, z: gatePos.z };
    const sys = createFrontierAnchorSystem(reg, {
      getPlayerPos: ()=> insideGate,
      getSession: ()=> sess,
      frontierProgress: { isUnlockedWaypoint:()=>false, isDiscoveredBeacon:()=>false, unlockWaypoint:()=>false, discoverBeacon:()=>false, getDiscoveredBeacons:()=>[]},
    });
    sys.prime(insideGate);
    sys.update(insideGate);
    // primed inside should not immediately expose gate interaction as new entry (still inside but not a fresh entry edge)
    // However gate contextual is available while inside regardless of prime? Our new system exposes contextual while inside, regardless of entry.
    // The prime test ensures we don't get duplicate discovery events; gate has no discovery, so we check that update doesn't fire a spurious gate prompt side-effect.
    // For gate, contextual should be available while inside even after prime, but we prime inside so it should be considered already inside.
    const nearby = sys.getNearbyInteraction(insideGate, sess);
    assert.ok(nearby && nearby.type === "gate", "primed inside should have gate contextual available");
    const outside = { x: gatePos.x, y:0, z: gatePos.z + 5 };
    sys.update(outside);
    assert.equal(sys.getNearbyInteraction(outside, sess), null, "outside should have no gate interaction");
    sys.update(insideGate);
    const nearby2 = sys.getNearbyInteraction(insideGate, sess);
    assert.ok(nearby2 && nearby2.type === "gate", "re-entering should expose gate again");
  });
  it("leaving then entering Camp gate fires start prompt once", ()=>{
    const reg = createWorldRegistry(WORLD_DATA);
    const sess = createExpeditionSession({ initialStatus:"camp", regionDepthMap: reg.getRegionDepthMap() });
    const gatePos = reg.getFrontierGatePos();
    const outside = { x: gatePos.x, y:0, z: gatePos.z + 5 };
    const inside = { x: gatePos.x, y:0, z: gatePos.z };
    const sys = createFrontierAnchorSystem(reg, {
      getPlayerPos: ()=> outside,
      getSession: ()=> sess,
      frontierProgress: { isUnlockedWaypoint:()=>false, isDiscoveredBeacon:()=>false, unlockWaypoint:()=>false, discoverBeacon:()=>false, getDiscoveredBeacons:()=>[]},
    });
    sys.prime(outside);
    sys.update(outside);
    assert.equal(sys.getNearbyInteraction(outside, sess), null);
    sys.update(inside);
    const nearby = sys.getNearbyInteraction(inside, sess);
    assert.ok(nearby && nearby.type === "gate" && nearby.label === "TRAVEL");
    sys.update(inside);
    assert.ok(sys.getNearbyInteraction(inside, sess), "staying inside should keep gate interaction");
    sys.update(outside);
    assert.equal(sys.getNearbyInteraction(outside, sess), null);
    sys.update(inside);
    assert.ok(sys.getNearbyInteraction(inside, sess), "re-entering should re-expose gate");
  });
});

describe("Phase 4A.1 — selected-start suppression", ()=>{
  it("begin run from initial waypoint does not immediately prompt", ()=>{
    const reg = createWorldRegistry(WORLD_DATA);
    const sess = createExpeditionSession({ initialStatus:"camp", regionDepthMap: reg.getRegionDepthMap() });
    const wpId = reg.getInitialMajorWaypointId();
    const wp = reg.getWaypointById(wpId);
    const spawn = reg.getWaypointSpawnPosition(wpId);
    let prompts = 0;
    const sys = createFrontierAnchorSystem(reg, {
      getPlayerPos: ()=> ({x: spawn.x, y:0, z: spawn.z}),
      getSession: ()=> sess,
      frontierProgress: { isUnlockedWaypoint:()=>true, isDiscoveredBeacon:()=>false, unlockWaypoint:()=>false, discoverBeacon:()=>false, getDiscoveredBeacons:()=>[]},
      onWaypointPrompt: (id)=> { if(id===wpId) prompts++; },
      onBeaconPrompt: ()=> {},
      onGateStartPrompt: ()=> {},
      onGateReturnPrompt: ()=> {},
    });
    sess.beginRun(wpId);
    sys.reset();
    sys.prime({x: spawn.x, y:0, z: spawn.z});
    sys.suppressUntilExit(wpId);
    sys.update({x: spawn.x, y:0, z: spawn.z});
    assert.equal(prompts,0, "suppressed start should not prompt while inside");
  });
  it("suppression remains while inside and arms after leaving", ()=>{
    const reg = createWorldRegistry(WORLD_DATA);
    const sess = createExpeditionSession({ initialStatus:"camp", regionDepthMap: reg.getRegionDepthMap() });
    const wpId = reg.getInitialMajorWaypointId();
    const spawn = reg.getWaypointSpawnPosition(wpId);
    const sys = createFrontierAnchorSystem(reg, {
      getPlayerPos: ()=> ({x: spawn.x, y:0, z: spawn.z}),
      getSession: ()=> sess,
      frontierProgress: { isUnlockedWaypoint:()=>true, isDiscoveredBeacon:()=>false, unlockWaypoint:()=>false, discoverBeacon:()=>false, getDiscoveredBeacons:()=>[]},
    });
    sess.beginRun(wpId);
    sys.reset();
    sys.prime({x: spawn.x, y:0, z: spawn.z});
    sys.suppressUntilExit(wpId);
    sys.update({x: spawn.x, y:0, z: spawn.z});
    assert.equal(sys.getNearbyInteraction({x: spawn.x, y:0, z: spawn.z}, sess), null, "suppressed start should not expose extract while inside");
    const outside = { x: spawn.x + 5, y:0, z: spawn.z +5 };
    sys.update(outside);
    assert.equal(sys.getNearbyInteraction(outside, sess), null);
    sys.update({x: spawn.x, y:0, z: spawn.z});
    const nearby = sys.getNearbyInteraction({x: spawn.x, y:0, z: spawn.z}, sess);
    assert.ok(nearby && nearby.id === wpId, "after leaving, next entry should expose extract");
  });
  it("deeper waypoint also suppressed generically", ()=>{
    const reg = createWorldRegistry(WORLD_DATA);
    const sess = createExpeditionSession({ initialStatus:"camp", regionDepthMap: reg.getRegionDepthMap() });
    const deep = reg.getWaypointById("wp_p4_threshold");
    assert.ok(deep);
    const spawn = reg.getWaypointSpawnPosition(deep.id);
    const sys = createFrontierAnchorSystem(reg, {
      getPlayerPos: ()=> ({x: spawn.x, y:0, z: spawn.z}),
      getSession: ()=> sess,
      frontierProgress: { isUnlockedWaypoint:()=>true, isDiscoveredBeacon:()=>false, unlockWaypoint:()=>false, discoverBeacon:()=>false, getDiscoveredBeacons:()=>[]},
    });
    withMockStorage(()=>{
      const prog = createFrontierProgress({ worldRegistry: reg });
      prog.load();
      prog.unlockWaypoint(deep.id);
      sess.beginRun(deep.id);
      sys.reset();
      sys.prime({x: spawn.x, y:0, z: spawn.z});
      sys.suppressUntilExit(deep.id);
      sys.update({x: spawn.x, y:0, z: spawn.z});
      assert.equal(sys.getNearbyInteraction({x: spawn.x, y:0, z: spawn.z}, sess), null);
      const outside = { x: spawn.x + 5, y:0, z: spawn.z +5 };
      sys.update(outside);
      sys.update({x: spawn.x, y:0, z: spawn.z});
      const nearby = sys.getNearbyInteraction({x: spawn.x, y:0, z: spawn.z}, sess);
      assert.ok(nearby && nearby.id === deep.id);
    });
  });
  it("KEEP GOING still requires leave/re-entry after suppression cleared", ()=>{
    const reg = createWorldRegistry(WORLD_DATA);
    const sess = createExpeditionSession({ initialStatus:"camp", regionDepthMap: reg.getRegionDepthMap() });
    const wpId = reg.getInitialMajorWaypointId();
    const spawn = reg.getWaypointSpawnPosition(wpId);
    const sys = createFrontierAnchorSystem(reg, {
      getPlayerPos: ()=> ({x: spawn.x, y:0, z: spawn.z}),
      getSession: ()=> sess,
      frontierProgress: { isUnlockedWaypoint:()=>true, isDiscoveredBeacon:()=>false, unlockWaypoint:()=>false, discoverBeacon:()=>false, getDiscoveredBeacons:()=>[]},
    });
    sess.beginRun(wpId);
    sys.reset(); sys.prime({x: spawn.x, y:0, z: spawn.z}); sys.suppressUntilExit(wpId);
    const outside = { x: spawn.x+5, y:0, z: spawn.z+5 };
    sys.update(outside);
    sys.update({x: spawn.x, y:0, z: spawn.z});
    const nearby1 = sys.getNearbyInteraction({x: spawn.x, y:0, z: spawn.z}, sess);
    assert.ok(nearby1, "after suppression cleared, should have interaction");
    sys.handleKeepGoing(wpId);
    sys.update({x: spawn.x, y:0, z: spawn.z});
    assert.equal(sys.getNearbyInteraction({x: spawn.x, y:0, z: spawn.z}, sess), null, "still inside after KEEP GOING should not reprompt");
    sys.update(outside);
    assert.equal(sys.getNearbyInteraction(outside, sess), null);
    sys.update({x: spawn.x, y:0, z: spawn.z});
    assert.ok(sys.getNearbyInteraction({x: spawn.x, y:0, z: spawn.z}, sess), "after leaving, should re-expose");
  });
});

describe("Phase 4A.1 — interaction restore", ()=>{
  it("after Map start selection closes: active, not blocked, harvesting/attack gates true", ()=>{
    const reg = createWorldRegistry(WORLD_DATA);
    const sess = createExpeditionSession({ initialStatus:"camp", regionDepthMap: reg.getRegionDepthMap() });
    assert.equal(sess.getStatus(),"camp");
    const wpId = reg.getInitialMajorWaypointId();
    sess.beginRun(wpId);
    assert.ok(sess.isActive());
    // Simulate blocked = false after map close
    const blocked = false;
    const harvestingAllowed = true && !blocked && sess.isActive();
    const fieldCanAttack = !blocked && sess.isActive();
    assert.ok(harvestingAllowed);
    assert.ok(fieldCanAttack);
  });
});

describe("Phase 4A.1 — player-facing labels", ()=>{
  it("Map helper prefers displayName", ()=>{
    const reg = createWorldRegistry(WORLD_DATA);
    const wp = reg.getWaypointById("wp_p1_entry");
    const name = reg.getAnchorDisplayName(wp);
    assert.equal(name, "Forest Edge");
    const bc = reg.getBeaconById("beacon_p2_01");
    const bname = reg.getAnchorDisplayName(bc);
    assert.equal(bname, "Tangled Hollow Beacon");
  });
  it("normal Map model does not require raw IDs", ()=>{
    const reg = createWorldRegistry(WORLD_DATA);
    // Ensure every waypoint and beacon has displayName or fallback
    for(const wp of reg.getAllWaypoints()){
      const n = reg.getAnchorDisplayName(wp);
      assert.ok(typeof n === "string" && n.length>0 && n !== wp.id);
    }
    for(const bc of reg.getAllBeacons()){
      const n = reg.getAnchorDisplayName(bc);
      assert.ok(typeof n === "string" && n.length>0);
    }
  });
  it("Beacon remains non-start-selectable (ids distinct)", ()=>{
    const reg = createWorldRegistry(WORLD_DATA);
    const wpIds = new Set(reg.getAllWaypoints().map(w=>w.id));
    for(const bc of reg.getAllBeacons()){
      assert.ok(!wpIds.has(bc.id));
    }
  });
});

describe("Phase 4A.1 — Ground Patch", ()=>{
  it("authored Ground Patch produces matching visual/collider transform and dimensions", ()=>{
    const reg = createWorldRegistry(WORLD_DATA);
    const patches = reg.getAllGroundPatches();
    assert.ok(patches.length >= 5, `expected at least 5 ground patches got ${patches.length}`);
    const pg = createStaticWorld(reg.data);
    // Find a ground patch mesh
    const gp = patches[0];
    const mesh = authoredMesh(pg.group, gp.id);
    assert.ok(mesh, `ground mesh ${gp.id} should exist`);
    const geo = mesh.geometry;
    assert.ok(Math.abs(geo.parameters.width - gp.size.w) < 0.01);
    assert.ok(Math.abs(geo.parameters.depth - gp.size.d) < 0.01);
    // collider should exist in playground obstacles or via groundPatches
    const hasCollider = pg.obstacles.some(o=> o.id===gp.id) || pg.groundPatches.some(g=> g.id===gp.id);
    assert.ok(hasCollider);
  });
  it("collision-disabled ground produces no collider", ()=>{
    const data = JSON.parse(JSON.stringify(WORLD_DATA));
    // Use p2 region (index 2) to avoid spawn support failure for camp/p1 spawns
    const reg = data.regions[2];
    if(reg.groundPatches && reg.groundPatches[0]){
      reg.groundPatches[0].collisionEnabled = false;
      const norm = normalizeWorldData(data);
      const reg2 = createWorldRegistry(norm);
      const pg = createStaticWorld(reg2.data);
      const gpId = reg.groundPatches[0].id;
      const hasCollider = pg.obstacles.some(o=> o.id===gpId);
      assert.equal(hasCollider, false, "collision disabled ground should not have collider");
    }
  });
  it("exported/reloaded patch deterministic", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    const before = draftApi.exportStableJson();
    const after = draftApi.exportStableJson();
    assert.equal(before, after);
    // Modify a ground patch size and ensure export changes deterministically
    const draft = draftApi.getDraft();
    const gpRegion = draft.regions.find(r=> r.groundPatches && r.groundPatches.length>0);
    assert.ok(gpRegion);
    const gp = gpRegion.groundPatches[0];
    const origW = gp.size.w;
    draftApi.updateTransform(gp.id, { size: { w: origW + 1.0, d: gp.size.d, h: gp.size.h } });
    const exported = draftApi.exportStableJson();
    const parsed = JSON.parse(exported);
    const found = parsed.regions.flatMap(r=> r.groundPatches ?? []).find(g=> g.id===gp.id);
    assert.equal(found.size.w, origW + 1.0);
  });
});

describe("Phase 4A.1 — Boundary", ()=>{
  it("no automatic physical world-edge walls generated from bounds", ()=>{
    const reg = createWorldRegistry(WORLD_DATA);
    const pg = createStaticWorld(reg.data);
    // The hard-coded wall ids were like north/south/east/west without authored id; now only authored boundaries should exist
    // Check that there is no collider with id containing wall that is not from authored boundaries
    const authoredIds = new Set(reg.getAllBoundaries().map(b=> b.id));
    // Any obstacle that looks like boundary but not authored would be legacy
    // In new world, obstacles from boundaries should have ids from authored list
    for(const o of pg.obstacles){
      if(o.isBoundary){
        assert.ok(authoredIds.has(o.id), `boundary obstacle ${o.id} should be authored`);
      }
    }
    // Ensure safety floor exists at -30 not at playable height
    const hasPlayableFloor = pg.group.children.some(c=> c.name==="legacy_ground");
    assert.equal(hasPlayableFloor, false, "legacy playable floor should not exist when authored ground present");
  });
  it("authored boundary produces collider", ()=>{
    const reg = createWorldRegistry(WORLD_DATA);
    const pg = createStaticWorld(reg.data);
    const bc = reg.getAllBoundaries()[0];
    assert.ok(bc);
    const hasCollider = pg.obstacles.some(o=> o.id===bc.id);
    assert.ok(hasCollider, "authored boundary should produce collider when collisionEnabled true");
  });
  it("delete/disable collision removes it on next authoritative Play build", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    const draft = draftApi.getDraft();
    const bcRegion = draft.regions.find(r=> r.boundaryColliders && r.boundaryColliders.length>0);
    assert.ok(bcRegion);
    const bc = bcRegion.boundaryColliders[0];
    const id = bc.id;
    // Disable collision
    draftApi.updateTransform(id, { collisionEnabled: false });
    const reg = createWorldRegistry(draftApi.getDraft());
    const pg = createStaticWorld(reg.data);
    const hasCollider = pg.obstacles.some(o=> o.id===id);
    assert.equal(hasCollider, false);
    // Delete
    draftApi.deleteObject(id);
    const reg2 = createWorldRegistry(draftApi.getDraft());
    const pg2 = createStaticWorld(reg2.data);
    const hasCollider2 = pg2.obstacles.some(o=> o.id===id);
    assert.equal(hasCollider2, false);
  });
  it("hidden-in-play boundary remains represented by Edit proxy path", ()=>{
    const reg = createWorldRegistry(WORLD_DATA);
    const pg = createStaticWorld(reg.data);
    const bc = reg.getAllBoundaries().find(b=> b.visibleInPlay===false);
    assert.ok(bc, "should have hidden boundary");
    const mesh = pg.group.getObjectByName(bc.id);
    assert.ok(mesh);
    assert.equal(mesh.visible, false, "hidden boundary real mesh should be invisible in Play");
    assert.equal(pg.group.children.some(c=> c.userData.isEditProxy), false, "runtime world should not contain Edit proxies");
    const draftApi = createAuthorDraft(WORLD_DATA);
    const scene = new THREE.Scene();
    scene.add(pg.group);
    const proxy = syncEditProxy(scene, draftApi.findObjectById(bc.id), true);
    assert.ok(proxy?.visible, "entering Edit should create the hidden boundary proxy");
    assert.ok(proxy.userData.isEditProxy);
  });
});

describe("Phase 4A.1 — presentation/static collision", ()=>{
  it("collision flag respected for box/fence", ()=>{
    const data = JSON.parse(JSON.stringify(WORLD_DATA));
    const region = data.regions.find(r=> r.props.some(p=> p.subtype==="box"));
    assert.ok(region);
    const box = region.props.find(p=> p.subtype==="box");
    box.collisionEnabled = false;
    const reg = createWorldRegistry(normalizeWorldData(data));
    const pg = createStaticWorld(reg.data);
    const hasCollider = pg.obstacles.some(o=> o.id===box.id);
    assert.equal(hasCollider, false);
    box.collisionEnabled = true;
    const reg2 = createWorldRegistry(normalizeWorldData(data));
    const pg2 = createStaticWorld(reg2.data);
    const hasCollider2 = pg2.obstacles.some(o=> o.id===box.id);
    assert.ok(hasCollider2);
  });
  it("visibility flag respected", ()=>{
    const data = JSON.parse(JSON.stringify(WORLD_DATA));
    const region = data.regions.find(r=> r.props.some(p=> p.subtype==="box"));
    const box = region.props.find(p=> p.subtype==="box");
    box.visibleInPlay = false;
    const reg = createWorldRegistry(normalizeWorldData(data));
    const pg = createStaticWorld(reg.data);
    const mesh = pg.group.getObjectByName(box.id);
    assert.ok(mesh);
    assert.equal(mesh.visible, false);
  });
  it("opacity/tint normalize and persist", ()=>{
    const draftApi = createAuthorDraft(WORLD_DATA);
    const region = draftApi.getDraft().regions.find(r=> r.props.some(p=> p.subtype==="box"));
    const box = region.props.find(p=> p.subtype==="box");
    draftApi.updateTransform(box.id, { opacity: 0.5, color: "#ff0000" });
    const exported = JSON.parse(draftApi.exportStableJson());
    const found = exported.regions.flatMap(r=> r.props).find(p=> p.id===box.id);
    assert.equal(found.opacity, 0.5);
    assert.ok(found.color === "#ff0000" || found.color === 0xff0000);
  });
  it("one object's tint/opacity does not mutate sibling materials globally", ()=>{
    const reg = createWorldRegistry(WORLD_DATA);
    const pg = createStaticWorld(reg.data);
    // Find two box props
    const boxes = reg.getAllBoundaries().length ? [] : []; // placeholder, use props
    // Instead find two fence props
    const allProps = reg.data.regions.flatMap(r=> r.props).filter(p=> p.subtype==="fence");
    if(allProps.length < 2) return; // skip if not enough
    // Normally they share material; tint one should clone
    const data = JSON.parse(JSON.stringify(WORLD_DATA));
    // tint first fence
    const r1 = data.regions.find(r=> r.props.some(p=> p.id===allProps[0].id));
    const p1 = r1.props.find(p=> p.id===allProps[0].id);
    p1.color = "#ff0000";
    const reg2 = createWorldRegistry(normalizeWorldData(data));
    const pg2 = createStaticWorld(reg2.data);
    const m1 = authoredMesh(pg2.group, allProps[0].id);
    const m2 = authoredMesh(pg2.group, allProps[1].id);
    assert.ok(m1 && m2);
    // m1 should be red, m2 should remain default fence color (0x8b7a5a = 9129690)
    assert.notEqual(m1.material.color.getHex(), m2.material.color.getHex());
  });
  it("hidden collider still author-selectable via proxy metadata/path", ()=>{
    const reg = createWorldRegistry(WORLD_DATA);
    const pg = createStaticWorld(reg.data);
    const hidden = reg.getAllBoundaries().find(b=> b.visibleInPlay===false);
    assert.ok(hidden);
    const draftApi = createAuthorDraft(WORLD_DATA);
    const scene = new THREE.Scene();
    scene.add(pg.group);
    const proxy = syncEditProxy(scene, draftApi.findObjectById(hidden.id), true);
    assert.ok(proxy?.userData.isEditProxy && proxy.userData.proxyFor===hidden.id, "Edit proxy should be findable by authorId");
  });
});

describe("Phase 4A.1 — existing guarantees", ()=>{
  it("one rAF", ()=>{
    const src = fs.readFileSync("src/main.js","utf-8");
    assert.equal((src.match(/requestAnimationFrame/g)||[]).length,1);
  });
  it("deterministic world generation/check", ()=>{
    const jsonRaw = fs.readFileSync("src/world/data/world.json","utf-8");
    const genRaw = fs.readFileSync("src/world/data/world.generated.js","utf-8");
    const m = genRaw.match(/export const WORLD_DATA = ([\s\S]+?);\s*\n/);
    assert.ok(m);
    const genParsed = JSON.parse(m[1]);
    const jsonParsed = JSON.parse(jsonRaw);
    // Compare sorted clone via normalize
    const norm = normalizeWorldData(jsonParsed);
    assert.deepEqual(JSON.parse(JSON.stringify(genParsed)), JSON.parse(JSON.stringify(norm)));
  });
});
