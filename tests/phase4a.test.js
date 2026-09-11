import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import { WORLD_DATA } from "./fixtures/crescentWorld.generated.js";
import { createWorldRegistry } from "../src/world/worldRegistry.js";
import { normalizeWorldData } from "../src/world/worldValidator.js";
import { createFrontierProgress } from "../src/save/frontierProgress.js";
import { createExpeditionSession } from "../src/session/expeditionSession.js";
import { createFrontierAnchorSystem } from "../src/world/frontierAnchorSystem.js";
import { getBestExtractionTargetForTest } from "../src/ui/frontierIndicators.js";

// Mock localStorage for frontierProgress
function makeStorage() {
  const store = new Map();
  return {
    getItem(k){ return store.get(k) ?? null; },
    setItem(k,v){ store.set(k,v); },
    removeItem(k){ store.delete(k); },
    clear(){ store.clear(); },
    _store: store,
  };
}

// Helper to set global localStorage mock
function withMockStorage(fn){
  const orig = global.localStorage;
  const mock = makeStorage();
  global.localStorage = mock;
  try { return fn(mock); } finally { global.localStorage = orig; }
}

describe("Phase 4A — persistent frontier progress", () => {
  it("fresh defaults initialize correctly", () => {
    withMockStorage((mock)=>{
      const reg = createWorldRegistry(WORLD_DATA);
      const prog = createFrontierProgress({ worldRegistry: reg });
      prog.load();
      const s = prog.getState();
      assert.equal(s.version, 3);
      assert.deepEqual(s.bankedResources, { wood:0, stone:0, fiber:0 });
      assert.equal(s.bankedXp, 0);
      assert.equal(s.hasDepartedOnce, false);
      assert.ok(s.unlockedMajorWaypointIds.length >= 1);
      assert.equal(s.discoveredBeaconIds.length, 0);
    });
  });
  it("initial Major Waypoint is the only start unlocked on new save", () => {
    withMockStorage(()=>{
      const reg = createWorldRegistry(WORLD_DATA);
      const prog = createFrontierProgress({ worldRegistry: reg });
      prog.load();
      const s = prog.getState();
      const initial = reg.getInitialMajorWaypointId();
      assert.ok(s.unlockedMajorWaypointIds.includes(initial));
      assert.equal(s.unlockedMajorWaypointIds.length, 1);
      // ensure beacons not in start set
      const beacons = reg.getAllBeacons().map(b=>b.id);
      for(const b of beacons) assert.ok(!s.unlockedMajorWaypointIds.includes(b));
    });
  });
  it("unknown/removed saved IDs are filtered safely", () => {
    withMockStorage((mock)=>{
      const reg = createWorldRegistry(WORLD_DATA);
      const prog = createFrontierProgress({ worldRegistry: reg });
      prog.load();
      // inject stale ids directly into storage
      const raw = JSON.parse(mock.getItem(prog.getStorageKey()));
      raw.unlockedMajorWaypointIds.push("wp_nonexistent");
      raw.discoveredBeaconIds.push("beacon_fake");
      mock.setItem(prog.getStorageKey(), JSON.stringify(raw));
      const prog2 = createFrontierProgress({ worldRegistry: reg });
      prog2.load();
      const s = prog2.getState();
      assert.ok(!s.unlockedMajorWaypointIds.includes("wp_nonexistent"));
      assert.ok(!s.discoveredBeaconIds.includes("beacon_fake"));
    });
  });
  it("Major Waypoint activation persists across reload", () => {
    withMockStorage((mock)=>{
      const reg = createWorldRegistry(WORLD_DATA);
      const prog = createFrontierProgress({ worldRegistry: reg });
      prog.load();
      const wp = reg.getAllWaypoints().find(w=> w.id !== reg.getInitialMajorWaypointId() && w.id !== "wp_camp_gate");
      assert.ok(wp);
      prog.unlockWaypoint(wp.id);
      const prog2 = createFrontierProgress({ worldRegistry: reg });
      prog2.load();
      assert.ok(prog2.isUnlockedWaypoint(wp.id));
    });
  });
  it("Beacon discovery persists across reload", () => {
    withMockStorage(()=>{
      const reg = createWorldRegistry(WORLD_DATA);
      const prog = createFrontierProgress({ worldRegistry: reg });
      prog.load();
      const bc = reg.getAllBeacons()[0];
      assert.ok(bc);
      prog.discoverBeacon(bc.id);
      const prog2 = createFrontierProgress({ worldRegistry: reg });
      prog2.load();
      assert.ok(prog2.isDiscoveredBeacon(bc.id));
    });
  });
  it("Beacon never enters selectable-start set", () => {
    withMockStorage(()=>{
      const reg = createWorldRegistry(WORLD_DATA);
      const prog = createFrontierProgress({ worldRegistry: reg });
      prog.load();
      const bc = reg.getAllBeacons()[0];
      prog.discoverBeacon(bc.id);
      const s = prog.getState();
      assert.ok(s.discoveredBeaconIds.includes(bc.id));
      assert.ok(!s.unlockedMajorWaypointIds.includes(bc.id));
    });
  });
  it("author-mode progress is isolated from normal progress", () => {
    withMockStorage((mock)=>{
      const reg = createWorldRegistry(WORLD_DATA);
      const normal = createFrontierProgress({ worldRegistry: reg, isAuthorMode: false });
      normal.load();
      normal.unlockWaypoint(reg.getAllWaypoints().find(w=> w.id==="wp_p4_threshold")?.id ?? reg.getAllWaypoints()[1].id);
      const author = createFrontierProgress({ worldRegistry: reg, isAuthorMode: true });
      author.load();
      // author should start fresh, not contain normal's unlock (unless same id is initial)
      const authorState = author.getState();
      // Normal and author keys differ
      assert.notEqual(normal.getStorageKey(), author.getStorageKey());
      // Author should not have extra unlock that normal added (unless it's initial)
      const extraWp = reg.getAllWaypoints().find(w=> w.id==="wp_p4_threshold")?.id;
      if(extraWp && extraWp !== reg.getInitialMajorWaypointId()){
        // author should not have it immediately
        assert.ok(!authorState.unlockedMajorWaypointIds.includes(extraWp));
      }
      // Clearing author should not clear normal
      author.clear();
      const normal2 = createFrontierProgress({ worldRegistry: reg, isAuthorMode: false });
      normal2.load();
      // normal should still retain its unlock if it was not initial
      // we already verified isolation via different keys
      assert.ok(mock.getItem(normal.getStorageKey()) !== null);
    });
  });
  it("bank operation secures XP and return receipt without copying the pack", () => {
    withMockStorage(()=>{
      const reg = createWorldRegistry(WORLD_DATA);
      const prog = createFrontierProgress({ worldRegistry: reg });
      prog.load();
      assert.equal(prog.collectResources({ wood:5, stone:2, fiber:1 }).ok, true);
      const packBefore = prog.getInventoryState().pack;
      prog.bankRun({ wood:5, stone:2, fiber:1 }, 50);
      assert.deepEqual(prog.getInventoryState().pack, packBefore);
      assert.equal(prog.getInventoryState().totals.returned, 8);
      const s = prog.getState();
      assert.equal(s.bankedResources.wood, 5);
      assert.equal(s.bankedResources.stone, 2);
      assert.equal(s.bankedXp, 50);
    });
  });
  it("second resolve/bank attempt cannot double-credit", () => {
    withMockStorage(()=>{
      const reg = createWorldRegistry(WORLD_DATA);
      const prog = createFrontierProgress({ worldRegistry: reg });
      prog.load();
      assert.equal(prog.collectResources({ wood:3, stone:1 }).ok, true);
      prog.bankRun({ wood:3, stone:1, fiber:0 }, 20);
      // second identical bank should be idempotent (same token)
      prog.bankRun({ wood:3, stone:1, fiber:0 }, 20);
      const s = prog.getState();
      // Should not have doubled to 6 wood
      assert.equal(s.bankedResources.wood, 3);
      assert.equal(s.bankedXp, 20);
    });
  });
});

describe("Phase 4A — expedition lifecycle", () => {
  it("starts in Camp/idle state", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const sess = createExpeditionSession({ initialStatus: "camp", initialRegionId: "camp", regionDepthMap: reg.getRegionDepthMap() });
    assert.equal(sess.getStatus(), "camp");
    assert.ok(sess.isCamp());
    assert.ok(!sess.isActive());
  });
  it("begin run sets active + chosen start anchor", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const sess = createExpeditionSession({ initialStatus: "camp", initialRegionId: "camp", regionDepthMap: reg.getRegionDepthMap() });
    const wp = reg.getInitialMajorWaypointId();
    const ok = sess.beginRun(wp);
    assert.ok(ok);
    assert.equal(sess.getStatus(), "active");
    assert.ok(sess.isActive());
    assert.equal(sess.getState().startAnchorId, wp);
  });
  it("extraction resolves once", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const sess = createExpeditionSession({ initialStatus: "camp", regionDepthMap: reg.getRegionDepthMap() });
    sess.beginRun(reg.getInitialMajorWaypointId());
    const first = sess.tryResolveExtract();
    assert.ok(first);
    const second = sess.tryResolveExtract();
    assert.equal(second, null);
    assert.ok(sess.isResolved());
  });
  it("death resolves once", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const sess = createExpeditionSession({ initialStatus: "camp", regionDepthMap: reg.getRegionDepthMap() });
    sess.beginRun(reg.getInitialMajorWaypointId());
    const first = sess.tryResolveDeath();
    assert.ok(first);
    const second = sess.tryResolveDeath();
    assert.equal(second, null);
  });
  it("return/new-run reset clears transient but not persistent", () => {
    withMockStorage(()=>{
      const reg = createWorldRegistry(WORLD_DATA);
      const prog = createFrontierProgress({ worldRegistry: reg });
      prog.load();
      const wpDeep = reg.getAllWaypoints().find(w=> w.id==="wp_p4_threshold");
      if(wpDeep) prog.unlockWaypoint(wpDeep.id);
      const sess = createExpeditionSession({ initialStatus: "camp", regionDepthMap: reg.getRegionDepthMap() });
      sess.beginRun(reg.getInitialMajorWaypointId());
      sess.setCargo({ wood:5, stone:3, fiber:2 });
      sess.setXp(40);
      sess.addDiscoveryWaypoint(wpDeep?.id ?? reg.getInitialMajorWaypointId());
      const snap = sess.tryResolveExtract();
      // Collection owns the pack; resolution only records its return.
      assert.equal(prog.collectResources(snap.cargo).ok, true);
      prog.bankRun(snap.cargo, snap.xp);
      // reset to camp
      sess.resetToCamp();
      assert.equal(sess.getCargo().wood, 0);
      assert.equal(sess.getRunXp(), 0);
      assert.equal(sess.getStatus(), "camp");
      // persistent remains
      assert.ok(prog.isUnlockedWaypoint(wpDeep?.id ?? reg.getInitialMajorWaypointId()));
      assert.equal(prog.getBankedResources().wood, 5);
    });
  });
});

describe("Phase 4A — Map/start selection", () => {
  it("gate/start mode exposes only unlocked Major Waypoints (logic check)", () => {
    withMockStorage(()=>{
      const reg = createWorldRegistry(WORLD_DATA);
      const prog = createFrontierProgress({ worldRegistry: reg });
      prog.load();
      const allWps = reg.getAllWaypoints().filter(w=> w.id!=="wp_camp_gate");
      const unlocked = prog.getUnlockedWaypoints();
      // Only initial should be unlocked initially
      assert.equal(unlocked.length, 1);
      const locked = allWps.filter(w=> !unlocked.includes(w.id));
      assert.ok(locked.length >= 1);
      // Simulate unlocking second waypoint then check
      if(locked[0]) {
        prog.unlockWaypoint(locked[0].id);
        const unlocked2 = prog.getUnlockedWaypoints();
        assert.ok(unlocked2.includes(locked[0].id));
      }
    });
  });
  it("Extraction Beacons are not selectable starts (logic)", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const beacons = reg.getAllBeacons();
    const waypoints = reg.getAllWaypoints();
    // Beacons should never appear in waypoint ids
    for(const bc of beacons) {
      assert.ok(!waypoints.some(w=> w.id===bc.id));
    }
  });
  it("first departure is deterministic (initial waypoint)", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const initial = reg.getInitialMajorWaypointId();
    assert.equal(initial, "wp_p1_entry");
  });
  it("choosing a valid waypoint resolves safe spawn/region", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const wpId = reg.getInitialMajorWaypointId();
    const spawn = reg.getWaypointSpawnPosition(wpId);
    assert.ok(spawn);
    assert.ok(typeof spawn.x === "number" && typeof spawn.z === "number");
    const region = reg.getRegionForPosition(spawn);
    assert.ok(region);
    // spawn should be inside a valid region (p1 or near)
    assert.ok(typeof region === "string");
  });
});

describe("Phase 4A — anchor interaction guards", () => {
  it("new Major Waypoint unlocks before outcome and survives later death", () => {
    withMockStorage(()=>{
      const reg = createWorldRegistry(WORLD_DATA);
      const prog = createFrontierProgress({ worldRegistry: reg });
      prog.load();
      const sess = createExpeditionSession({ initialStatus:"camp", regionDepthMap: reg.getRegionDepthMap() });
      sess.beginRun(reg.getInitialMajorWaypointId());
      const deepWp = reg.getAllWaypoints().find(w=> w.id==="wp_p4_threshold");
      assert.ok(deepWp);
      // Simulate anchor system discovering waypoint
      prog.unlockWaypoint(deepWp.id);
      sess.addDiscoveryWaypoint(deepWp.id);
      const snap = sess.tryResolveDeath();
      assert.ok(snap);
      // After death, waypoint should remain unlocked in persistent progress
      assert.ok(prog.isUnlockedWaypoint(deepWp.id));
      // Cargo should not be banked (death loses)
      // but waypoint remains
    });
  });
  it("Beacon discovery persists but never unlocks start", () => {
    withMockStorage(()=>{
      const reg = createWorldRegistry(WORLD_DATA);
      const prog = createFrontierProgress({ worldRegistry: reg });
      prog.load();
      const bc = reg.getAllBeacons()[0];
      prog.discoverBeacon(bc.id);
      assert.ok(prog.isDiscoveredBeacon(bc.id));
      assert.ok(!prog.isUnlockedWaypoint(bc.id));
    });
  });
  it("KEEP GOING requires leaving radius before reprompt", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const sess = createExpeditionSession({ initialStatus:"camp", regionDepthMap: reg.getRegionDepthMap() });
    sess.beginRun(reg.getInitialMajorWaypointId());
    let prompts = 0;
    const sys = createFrontierAnchorSystem(reg, {
      getPlayerPos: ()=> ({ x:0,y:0,z:0 }),
      getSession: ()=> sess,
      frontierProgress: { isUnlockedWaypoint:()=>false, isDiscoveredBeacon:()=>false, unlockWaypoint:()=>true, discoverBeacon:()=>true, getDiscoveredBeacons:()=>[] },
      onWaypointPrompt: (id)=> { if(id!=="wp_camp_gate") prompts++; },
      onBeaconPrompt: ()=> {},
      onGateStartPrompt: ()=>{},
      onGateReturnPrompt: ()=>{},
    });
    // Use deep waypoint far from gate to avoid gate interference
    const wp = reg.getWaypointById("wp_p4_threshold") ?? reg.getAllWaypoints().find(w=> w.id !== "wp_camp_gate");
    assert.ok(wp);
    const wpPos = { x: wp.pos.x, y:0, z: wp.pos.z };
    sys.update(wpPos);
    assert.equal(prompts, 1);
    sys.update(wpPos);
    assert.equal(prompts, 1);
    const outside = { x: wp.pos.x + 5, y:0, z: wp.pos.z + 5 };
    sys.update(outside);
    sys.update(wpPos);
    assert.equal(prompts, 2);
  });
  it("starting waypoint is initially disarmed until player exits radius", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const sess = createExpeditionSession({ initialStatus:"camp", regionDepthMap: reg.getRegionDepthMap() });
    sess.beginRun(reg.getInitialMajorWaypointId());
    const sys = createFrontierAnchorSystem(reg, {
      getPlayerPos: ()=> ({ x:0,y:0,z:0 }),
      getSession: ()=> sess,
      frontierProgress: { isUnlockedWaypoint:()=>true, isDiscoveredBeacon:()=>false, unlockWaypoint:()=>false, discoverBeacon:()=>false, getDiscoveredBeacons:()=>[] },
      onWaypointDiscovered: ()=> {},
    });
    const startId = reg.getInitialMajorWaypointId();
    const wp = reg.getWaypointById(startId);
    const spawn = reg.getWaypointSpawnPosition(startId);
    sys.disarmStartWaypoint(startId);
    const inside = { x: spawn.x, y:0, z: spawn.z };
    sys.update(inside);
    // while still inside after disarm, waypoint extraction should not be available (gate may be nearby but waypoint should be suppressed)
    const nearbyInside = sys.getNearbyInteraction(inside, sess);
    assert.ok(!nearbyInside || nearbyInside.id !== startId, "disarmed start should not expose waypoint extract while still inside");
    const outside = { x: spawn.x + 5, y:0, z: spawn.z + 5 };
    sys.update(outside);
    sys.update(inside);
    const nearby = sys.getNearbyInteraction(inside, sess);
    assert.ok(nearby && nearby.id === startId, "after leaving, start waypoint should arm and expose contextual extract");
  });
  it("Camp gate return uses same extraction outcome pipeline (session resolve)", () => {
    withMockStorage(()=>{
      const reg = createWorldRegistry(WORLD_DATA);
      const prog = createFrontierProgress({ worldRegistry: reg });
      prog.load();
      const sess = createExpeditionSession({ initialStatus:"camp", regionDepthMap: reg.getRegionDepthMap() });
      sess.beginRun(reg.getInitialMajorWaypointId());
      sess.setCargo({ wood:4, stone:2, fiber:1 });
      sess.setXp(30);
      const snap = sess.tryResolveExtract();
      assert.ok(snap);
      // Gate extraction secures the same existing pack as beacon extraction.
      assert.equal(prog.collectResources(snap.cargo).ok, true);
      prog.bankRun(snap.cargo, snap.xp);
      assert.equal(prog.getBankedResources().wood, 4);
      assert.equal(prog.getBankedXp(), 30);
      // Second attempt should not double
      const second = sess.tryResolveExtract();
      assert.equal(second, null);
      prog.bankRun(snap.cargo, snap.xp);
      assert.equal(prog.getBankedResources().wood, 4);
    });
  });
});

describe("Phase 4A — cargo outcome", () => {
  it("extraction keeps physical pack, secures XP and clears session summary", () => {
    withMockStorage(()=>{
      const reg = createWorldRegistry(WORLD_DATA);
      const prog = createFrontierProgress({ worldRegistry: reg });
      prog.load();
      const sess = createExpeditionSession({ initialStatus:"camp", regionDepthMap: reg.getRegionDepthMap() });
      sess.beginRun(reg.getInitialMajorWaypointId());
      assert.equal(prog.collectResources({ wood:7, stone:3, fiber:2 }).ok, true);
      sess.setCargo(prog.getPackResourceCounts());
      sess.setXp(60);
      const snap = sess.tryResolveExtract();
      prog.bankRun(snap.cargo, snap.xp);
      sess.resetToCamp();
      assert.equal(sess.getCargo().wood, 0);
      assert.equal(sess.getRunXp(), 0);
      assert.equal(prog.getBankedResources().wood, 7);
      assert.equal(prog.getBankedXp(), 60);
    });
  });
  it("death banks none and clears them", () => {
    withMockStorage(()=>{
      const reg = createWorldRegistry(WORLD_DATA);
      const prog = createFrontierProgress({ worldRegistry: reg });
      prog.load();
      const sess = createExpeditionSession({ initialStatus:"camp", regionDepthMap: reg.getRegionDepthMap() });
      sess.beginRun(reg.getInitialMajorWaypointId());
      sess.setCargo({ wood:5, stone:2, fiber:1 });
      sess.setXp(40);
      const snap = sess.tryResolveDeath();
      // death does NOT bank
      sess.resetToCamp();
      assert.equal(sess.getCargo().wood, 0);
      assert.equal(sess.getRunXp(), 0);
      assert.equal(prog.getBankedResources().wood, 0);
      assert.equal(prog.getBankedXp(), 0);
      assert.ok(snap);
    });
  });
  it("waypoint/beacon discoveries remain after death", () => {
    withMockStorage(()=>{
      const reg = createWorldRegistry(WORLD_DATA);
      const prog = createFrontierProgress({ worldRegistry: reg });
      prog.load();
      const sess = createExpeditionSession({ initialStatus:"camp", regionDepthMap: reg.getRegionDepthMap() });
      sess.beginRun(reg.getInitialMajorWaypointId());
      const deepWp = reg.getAllWaypoints().find(w=> w.id==="wp_p4_threshold");
      const bc = reg.getAllBeacons()[0];
      prog.unlockWaypoint(deepWp.id);
      prog.discoverBeacon(bc.id);
      sess.addDiscoveryWaypoint(deepWp.id);
      sess.addDiscoveryBeacon(bc.id);
      sess.tryResolveDeath();
      sess.resetToCamp();
      assert.ok(prog.isUnlockedWaypoint(deepWp.id));
      assert.ok(prog.isDiscoveredBeacon(bc.id));
    });
  });
});

describe("Phase 4A — guidance helper deterministic", () => {
  it("best extraction target picks nearest gate/beacon/waypoint", () => {
    const gatePos = { x:0, z:7.2 };
    const waypoints = [{ id:"wp_a", pos:{x:0,z:0} }, { id:"wp_b", pos:{x:10,z:0}}];
    const beacons = [{ id:"bc1", pos:{x:2,z:2}}];
    const player = { x:0, z:6 };
    const best = getBestExtractionTargetForTest(player, waypoints, beacons, ["bc1"], gatePos);
    assert.equal(best.id, "gate");
    const player2 = { x:2.1, z:2.1 };
    const best2 = getBestExtractionTargetForTest(player2, waypoints, beacons, ["bc1"], gatePos);
    assert.equal(best2.id, "bc1");
  });
});

describe("Phase 4A — world generation validation", () => {
  it("initialMajorWaypoint exists and references majorWaypoint", () => {
    const data = JSON.parse(JSON.stringify(WORLD_DATA));
    assert.ok(data.initialMajorWaypointId);
    assert.ok(typeof data.initialMajorWaypointId === "string");
    const reg = createWorldRegistry(data);
    const wp = reg.getWaypointById(data.initialMajorWaypointId);
    assert.ok(wp, "initialMajorWaypoint must exist as majorWaypoint");
    assert.equal(wp.type, "majorWaypoint");
  });
  it("camp frontierGateId exists and references gate", () => {
    const data = JSON.parse(JSON.stringify(WORLD_DATA));
    const gateId = data.camp.frontierGateId ?? data.frontierGateId;
    assert.ok(gateId);
    const reg = createWorldRegistry(data);
    const gatePos = reg.getFrontierGatePos();
    assert.ok(gatePos, "frontier gate pos must resolve");
  });
  it("spawn offset is finite and spawn resolves to valid region", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const wpId = reg.getInitialMajorWaypointId();
    const spawn = reg.getWaypointSpawnPosition(wpId);
    assert.ok(Number.isFinite(spawn.x) && Number.isFinite(spawn.z));
    const region = reg.getRegionForPosition(spawn);
    assert.ok(region);
  });
  it("one rAF remains", () => {
    const src = fs.readFileSync("src/main.js", "utf-8");
    const count = (src.match(/requestAnimationFrame/g) || []).length;
    assert.equal(count, 1);
  });
});
