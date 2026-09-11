import assert from 'node:assert/strict';
import { describe,it } from 'node:test';
import WORLD_DATA from '../src/world/data/world.js';
import { createWorldRegistry } from '../src/world/worldRegistry.js';
import { createFrontierProgress } from '../src/save/frontierProgress.js';
import { normalizeBase,validatePlacement,getBuildBounds } from '../src/base/basePlacement.js';
import { BASE_CONFIG } from '../src/base/baseCatalog.js';

function withProgress(run){const original=global.localStorage,values=new Map();let failing=false;global.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(failing)throw Error('full');values.set(k,v);}};try{const registry=createWorldRegistry(WORLD_DATA);const p=createFrontierProgress({worldRegistry:registry,resourceDrops:WORLD_DATA.resourceDrops});p.load();p.bankRun({wood:100,stone:100,fiber:100,berries:100,iron_ore:100,crystal_shard:100},0,'supplies');run(p,()=>{failing=true;},values,registry);}finally{global.localStorage=original;}}
const piece=(id,type='foundation',x=0,z=18,yaw=0)=>({id:`build_${id}`,type,pos:{x,y:999,z},yaw});

describe('Free Camp placement and field supplies',()=>{
  it('validates the rotated full footprint, player, reserved objects, slopes and structure overlap',()=>{
    assert.equal(validatePlacement(piece('a','wall',5,18,Math.PI/4)).reason,'outside-clearing');
    assert.equal(validatePlacement(piece('a'),{playerPosition:{x:0,z:18}}).reason,'player-overlap');
    assert.equal(validatePlacement(piece('a'),{reserved:[{pos:{x:1,z:18},radius:1}]}).reason,'keep-path-clear');
    assert.equal(validatePlacement(piece('a'),{surface:{heights:[{x:2,z:18,rx:3,rz:3,height:3}]}}).reason,'uneven-ground');
    assert.equal(validatePlacement(piece('b'),{structures:[piece('a')]}).reason,'structure-overlap');
    assert.equal(validatePlacement(piece('b','foundation',2.6,18),{structures:[piece('a')]}).ok,true);
  });
  it('owns cost, grounding, ID idempotence and friendly refunds',()=>withProgress(p=>{
    const bank=p.getBankedResources();assert.equal(p.placeStructure(piece('floor')).placed,true);
    assert.equal(p.getBaseState().structures[0].pos.y,0);assert.equal(p.getBankedResources().wood,bank.wood-4);
    assert.equal(p.placeStructure(piece('floor')).reason,'already-placed');
    assert.equal(p.placeStructure(piece('bad','wall',50,50)).placed,false);
    assert.equal(p.removeStructure('build_floor').removed,true);assert.deepEqual(p.getBankedResources(),bank);
    assert.equal(p.removeStructure('build_floor').removed,false);assert.deepEqual(p.getBankedResources(),bank);
  }));
  it('supports furniture and walls on floors, preserves support through reload, prevents orphaning',()=>withProgress(p=>{
    assert.equal(p.placeStructure(piece('floor')).placed,true);
    assert.equal(p.placeStructure(piece('wall','wall',0,19.1)).placed,true);
    assert.equal(p.getBaseState().structures[1].pos.y,BASE_CONFIG.foundationHeight);
    p.load();assert.equal(p.getBaseState().structures[1].supportId,'build_floor');
    assert.equal(p.removeStructure('build_floor').reason,'remove-supported-first');
    assert.equal(p.removeStructure('build_wall').removed,true);assert.equal(p.removeStructure('build_floor').removed,true);
  }));
  it('charges expansions once per tier and requires the matching station for advanced gear',()=>withProgress(p=>{
    assert.equal(p.craftFieldSupply('calming_chime').reason,'station-required');
    assert.equal(p.placeStructure(piece('bench','workbench',0,18)).placed,true);
    assert.equal(p.craftFieldSupply('calming_chime').reason,'station-required');
    assert.equal(p.placeStructure(piece('resonance','resonance',3,18)).placed,true);
    assert.equal(p.craftFieldSupply('calming_chime').crafted,true);
    assert.equal(p.craftFieldSupply('reinforced_tether').reason,'station-required');
    assert.equal(p.placeStructure(piece('fabricator','fabricator',-3,18)).placed,true);
    assert.equal(p.craftFieldSupply('reinforced_tether').crafted,true);
    assert.equal(p.craftFieldSupply('berry_lure').crafted,true);
    assert.equal(p.getFieldSupplies().berry_lure,1);assert.equal(p.consumeFieldSupply('berry_lure').consumed,true);
    assert.equal(p.consumeFieldSupply('berry_lure').reason,'empty');
    assert.equal(p.expandBase().expanded,true);assert.equal(p.expandBase().expanded,true);assert.equal(p.expandBase().reason,'max-tier');
    assert.equal(getBuildBounds(p.getBaseState().tier).maxX,12);
  }));
  it('rolls back placement, removal, expansion, field recipes and existing medkit paths on storage failure',()=>withProgress((p,fail)=>{
    p.placeStructure(piece('floor'));p.craftFieldSupply('berry_lure');p.craftConsumable('medkit');
    const before=p.getState();fail();
    assert.equal(p.placeStructure(piece('other','lantern',4,18)).placed,false);
    assert.equal(p.removeStructure('build_floor').removed,false);assert.equal(p.expandBase().expanded,false);
    assert.equal(p.craftFieldSupply('berry_lure').crafted,false);assert.equal(p.consumeFieldSupply('berry_lure').consumed,false);
    assert.equal(p.craftConsumable('medkit').crafted,false);assert.equal(p.consumeConsumable('medkit').consumed,false);
    assert.deepEqual(p.getState(),before);
  }));
  it('covers load, export/import, clear, defensive snapshots and malformed imported structures',()=>withProgress(p=>{
    p.placeStructure(piece('floor'));p.craftFieldSupply('woven_snare');const exported=p.exportSave().payload;
    const state=p.getState();state.base.structures[0].pos.x=99;state.fieldSupplies.woven_snare=99;
    assert.equal(p.getBaseState().structures[0].pos.x,0);assert.equal(p.getFieldSupplies().woven_snare,1);
    p.clear();assert.equal(p.getBaseState().structures.length,0);assert.equal(p.getFieldSupplies().woven_snare,0);
    assert.equal(p.importSave(exported).ok,true);assert.equal(p.getBaseState().structures.length,1);assert.equal(p.getFieldSupplies().woven_snare,1);
    const normalized=normalizeBase({tier:99,structures:[piece('valid'),piece('valid'),piece('unknown','dragon'),piece('nan','wall',NaN),piece('far','wall',900)]});
    assert.equal(normalized.tier,2);assert.equal(normalized.structures.length,1);
  }));
});
