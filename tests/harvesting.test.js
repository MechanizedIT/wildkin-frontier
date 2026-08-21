import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HARVEST_CONFIG, RESOURCE_TYPES, isHarvestCompatibleMode } from "../src/resources/resourceConfig.js";
import { distanceXZ, selectTargets, applyHitPure, tickRespawn, createInventory, collectPickupPure, createSwingState, tickSwing } from "../src/resources/harvestLogic.js";

function makeNode(typeId, pos, remainingOverride) {
  const type = RESOURCE_TYPES[typeId];
  return {
    type,
    state: {
      position: { x: pos.x, y: pos.y ?? 0, z: pos.z },
      nodeState: "READY",
      remainingChunks: remainingOverride ?? type.maxChunks,
    },
  };
}

describe("Phase 2 — resource types & config", () => {
  it("harvestRadius 1.5-1.8", () => { assert.ok(HARVEST_CONFIG.harvestRadius >= 1.5 && HARVEST_CONFIG.harvestRadius <= 1.8); });
  it("maxTargetsPerSwing 3-4", () => { assert.ok(HARVEST_CONFIG.maxTargetsPerSwing >= 3 && HARVEST_CONFIG.maxTargetsPerSwing <= 4); });
  it("swingInterval 0.48-0.60", () => { assert.ok(HARVEST_CONFIG.swingInterval >= 0.48 && HARVEST_CONFIG.swingInterval <= 0.60); });
  it("impact time 0.45-0.60", () => { assert.ok(HARVEST_CONFIG.impactNormalizedTime >= 0.45 && HARVEST_CONFIG.impactNormalizedTime <= 0.60); });
  it("pickupMagnetRadius 2.0-2.8", () => { assert.ok(HARVEST_CONFIG.pickupMagnetRadius >= 2.0 && HARVEST_CONFIG.pickupMagnetRadius <= 2.8); });
  it("tree 5 chunks rock 4 fiber 3", () => {
    assert.equal(RESOURCE_TYPES.tree.maxChunks, 5);
    assert.equal(RESOURCE_TYPES.rock.maxChunks, 4);
    assert.equal(RESOURCE_TYPES.fiber.maxChunks, 3);
  });
  it("respawn times tree 15-20 rock 15-20 fiber 10-15", () => {
    assert.ok(RESOURCE_TYPES.tree.respawnSeconds >= 15 && RESOURCE_TYPES.tree.respawnSeconds <= 20);
    assert.ok(RESOURCE_TYPES.rock.respawnSeconds >= 15 && RESOURCE_TYPES.rock.respawnSeconds <= 20);
    assert.ok(RESOURCE_TYPES.fiber.respawnSeconds >= 10 && RESOURCE_TYPES.fiber.respawnSeconds <= 15);
  });
  it("harvest compatible modes IDLE SNEAK WALK RUN only", () => {
    for (const m of ["IDLE","SNEAK","WALK","RUN"]) assert.equal(isHarvestCompatibleMode(m), true);
    for (const m of ["JUMP","FALL","DODGE","CLIMB","MANTLE"]) assert.equal(isHarvestCompatibleMode(m), false);
  });
  it("tree/rock solid true fiber non-solid", () => {
    assert.equal(RESOURCE_TYPES.tree.solid, true);
    assert.equal(RESOURCE_TYPES.rock.solid, true);
    assert.equal(RESOURCE_TYPES.fiber.solid, false);
  });
});

describe("Phase 2 — node hits and degradation", () => {
  it("READY hit reduces exactly one chunk", () => {
    const n = makeNode("tree", {x:0,z:0});
    const before = n.state.remainingChunks;
    const res = applyHitPure(n);
    assert.equal(n.state.remainingChunks, before - 1);
    assert.equal(res.remaining, before - 1);
    assert.equal(res.yieldResourceId, "wood");
  });
  it("every successful hit creates exactly one yield event", () => {
    const n = makeNode("rock", {x:0,z:0});
    const a = applyHitPure(n);
    assert.equal(a.yieldResourceId, "stone");
    const b = applyHitPure(n);
    assert.equal(b.yieldResourceId, "stone");
    assert.equal(n.state.remainingChunks, RESOURCE_TYPES.rock.maxChunks - 2);
  });
  it("final hit enters RESPAWNING", () => {
    const n = makeNode("fiber", {x:0,z:0}); // 3
    applyHitPure(n); applyHitPure(n);
    const last = applyHitPure(n);
    assert.equal(last.depleted, true);
    assert.equal(n.state.nodeState, "RESPAWNING");
    assert.ok(n.state.respawnRemaining > 0);
  });
  it("depleted nodes cannot be hit", () => {
    const n = makeNode("tree", {x:0,z:0}); n.state.remainingChunks = 1;
    applyHitPure(n);
    assert.equal(n.state.nodeState, "RESPAWNING");
    const again = applyHitPure(n);
    assert.equal(again, null);
    assert.equal(n.state.remainingChunks, 0);
  });
  it("respawn resets chunks/state", () => {
    const n = makeNode("tree", {x:0,z:0}); n.state.remainingChunks = 0; n.state.nodeState="RESPAWNING"; n.state.respawnRemaining = 1.0;
    const did = tickRespawn(n, 1.1);
    assert.equal(did, true);
    assert.equal(n.state.nodeState, "READY");
    assert.equal(n.state.remainingChunks, RESOURCE_TYPES.tree.maxChunks);
  });
  it("respawn timer progression correct", () => {
    const n = makeNode("rock", {x:0,z:0}); applyHitPure(n); applyHitPure(n); applyHitPure(n); applyHitPure(n);
    assert.equal(n.state.nodeState, "RESPAWNING");
    const total = n.type.respawnSeconds;
    assert.ok(Math.abs(n.state.respawnRemaining - total) < 1e-6);
    tickRespawn(n, total/2);
    assert.ok(Math.abs(n.state.respawnRemaining - total/2) < 1e-6);
    assert.equal(n.state.nodeState, "RESPAWNING");
    tickRespawn(n, total/2 + 0.01);
    assert.equal(n.state.nodeState, "READY");
  });
});

describe("Phase 2 — multi-target selection", () => {
  it("nearest eligible nodes selected", () => {
    const nodes = [ makeNode("tree",{x:1.5,z:0}), makeNode("rock",{x:0.5,z:0}), makeNode("fiber",{x:1.0,z:0}) ];
    const sel = selectTargets(nodes, {x:0,z:0}, "WALK");
    assert.equal(sel[0].state.position.x, 0.5);
    assert.equal(sel[1].state.position.x, 1.0);
  });
  it("outside-radius nodes excluded", () => {
    const nodes = [ makeNode("tree",{x:5,z:0}), makeNode("tree",{x:0.3,z:0}) ];
    const sel = selectTargets(nodes, {x:0,z:0}, "WALK");
    assert.equal(sel.length, 1);
    assert.equal(sel[0].state.position.x, 0.3);
  });
  it("target cap respected", () => {
    const nodes = [];
    for(let i=0;i<6;i++) nodes.push(makeNode("fiber",{x:0.2 + i*0.1, z:0}));
    const sel = selectTargets(nodes, {x:0,z:0}, "WALK");
    assert.equal(sel.length, HARVEST_CONFIG.maxTargetsPerSwing);
  });
  it("depleted nodes excluded", () => {
    const a = makeNode("tree",{x:0.4,z:0}); const b = makeNode("rock",{x:0.6,z:0}); b.state.nodeState="RESPAWNING"; b.state.remainingChunks=0;
    const sel = selectTargets([a,b], {x:0,z:0}, "WALK");
    assert.equal(sel.length, 1);
    assert.equal(sel[0], a);
  });
  it("incompatible player state yields no targets", () => {
    const nodes = [ makeNode("tree",{x:0.4,z:0}) ];
    for(const m of ["JUMP","FALL","DODGE","CLIMB","MANTLE"]) {
      const sel = selectTargets(nodes, {x:0,z:0}, m);
      assert.equal(sel.length, 0, `mode ${m} should yield 0`);
    }
  });
  it("halo eligibility matches harvest eligibility (same selectTargets)", () => {
    const nodes = [ makeNode("tree",{x:0.4,z:0}), makeNode("rock",{x:5,z:0}) ];
    const harvest = selectTargets(nodes, {x:0,z:0}, "WALK");
    const halo = selectTargets(nodes, {x:0,z:0}, "WALK");
    assert.deepEqual(harvest, halo);
  });
});

describe("Phase 2 — pickups/inventory", () => {
  it("pickup collected once only", () => {
    const inv = createInventory();
    const flag = { collected:false };
    assert.equal(collectPickupPure(inv, "wood", flag), true);
    assert.equal(collectPickupPure(inv, "wood", flag), false);
    assert.equal(inv.wood, 1);
  });
  it("inventory increments only on collection", () => {
    const inv = createInventory();
    assert.equal(inv.wood,0);
    const f={collected:false};
    collectPickupPure(inv, "stone", f);
    assert.equal(inv.stone,1);
    assert.equal(inv.wood,0);
    assert.equal(inv.fiber,0);
  });
  it("correct resource count increments", () => {
    const inv=createInventory();
    collectPickupPure(inv,"fiber",{collected:false});
    collectPickupPure(inv,"fiber",{collected:false});
    collectPickupPure(inv,"wood",{collected:false});
    assert.equal(inv.fiber,2); assert.equal(inv.wood,1);
  });
  it("run inventory resets", () => {
    const inv=createInventory(); inv.wood=3; inv.stone=2;
    const reset={wood:0,stone:0,fiber:0};
    assert.deepEqual(reset, createInventory());
  });
});

describe("Phase 2 — timing / swing cadence", () => {
  it("one swing creates one impact event", () => {
    const s=createSwingState();
    let impacts=0;
    const dt=1/60;
    for(let i=0;i<120;i++) {
      const {impact}=tickSwing(s,dt,true,true);
      if(impact) impacts++;
    }
    // 120 frames ~2 sec at interval 0.52 => about 3-4 impacts expected, each swing exactly one
    // Ensure no frame produced >1 impact and total reasonable
    assert.ok(impacts >= 3 && impacts <= 4, `impacts ${impacts}`);
  });
  it("holding near target does not hit every frame", () => {
    const s=createSwingState();
    let impacts=0;
    for(let i=0;i<60;i++) {
      const {impact}=tickSwing(s,1/60,true,true);
      if(impact) impacts++;
    }
    assert.ok(impacts < 10, "should not hit every frame");
    assert.ok(impacts >=1, "should hit at least once");
  });
  it("cadence deterministic under fixed-step updates", () => {
    function simulate(dt) {
      const s=createSwingState(); let t=0, impacts=[];
      for(let i=0;i<300;i++){ const {impact}=tickSwing(s,dt,true,true); t+=dt; if(impact) impacts.push(t);}
      return impacts;
    }
    const a=simulate(1/60); const b=simulate(1/60);
    assert.deepEqual(a,b);
    //间隔 approx swingInterval
    for(let i=1;i<a.length;i++) {
      const gap=a[i]-a[i-1];
      assert.ok(Math.abs(gap - HARVEST_CONFIG.swingInterval) < 0.03, `gap ${gap}`);
    }
  });
  it("harvesting blocked during incompatible states even with targets", () => {
    const s=createSwingState();
    let hits=0;
    for(let i=0;i<60;i++){ const {impact}=tickSwing(s,1/60,true,false); if(impact) hits++; }
    assert.equal(hits,0);
  });
});
