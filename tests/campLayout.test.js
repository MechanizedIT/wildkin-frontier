import test from 'node:test';
import assert from 'node:assert/strict';
import WORLD_DATA from '../src/world/data/world.js';
import { createWorldRegistry } from '../src/world/worldRegistry.js';
import { createFrontierProgress } from '../src/save/frontierProgress.js';
import { createInventoryState } from '../src/inventory/inventoryState.js';
import { BASE_CONFIG } from '../src/base/baseCatalog.js';
import { cloneBase, footprint, getBuildBounds, getCampReserved, normalizeBase, validatePlacement } from '../src/base/basePlacement.js';
import { CAMP_DEBRIS_IDS, CAMP_YARD_COST, createCampLayout, getCampBuildAreas, getCampPerimeter, getCampYardConsole, readCampLayout } from '../src/base/campLayout.js';

const piece=(id,type='foundation',x=-5,z=7)=>({id:`build_${id}`,type,pos:{x,y:0,z},yaw:0});
function fixture(run,raw=null,registry=null) {
  const previous=globalThis.localStorage,values=new Map(raw?[['wildkin.frontierProgress',JSON.stringify(raw)]]:[]);let fail=false;
  globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('quota');values.set(k,v);}};
  try{const p=createFrontierProgress({worldRegistry:registry,resourceDrops:WORLD_DATA.resourceDrops});p.load();return run(p,v=>{fail=v;},()=>JSON.parse(values.get('wildkin.frontierProgress')));}finally{globalThis.localStorage=previous;}
}
const clearYard=p=>{for(const id of CAMP_DEBRIS_IDS)assert.equal(p.clearCampDebris(id).cleared,true);};

test('fresh footprint is a small apron/entry union, with locked yard and truthful concave shoulders',()=>{
  const base={tier:0,structures:[],layout:createCampLayout()};
  assert.equal(getCampBuildAreas(base).length,2);assert.equal(getBuildBounds(base).maxZ,11);
  assert.equal(validatePlacement(piece('starter'),base).ok,true);
  assert.equal(validatePlacement(piece('yard','foundation',0,18),base).reason,'outside-clearing');
  assert.equal(validatePlacement(piece('fake_bbox','foundation',-6,-6),base).reason,'outside-clearing');
  assert.equal(validatePlacement(piece('wall_overlap','foundation',-7,9.5),base).reason,'keep-path-clear');
  assert.ok(getCampPerimeter(base).some(s=>s.id==='divider-west'));
  const expanded={...base,layout:{...base.layout,yardExpanded:true,clearedDebrisIds:[...CAMP_DEBRIS_IDS]}};
  assert.equal(validatePlacement(piece('cross_old_divider','foundation',-5,11),expanded).ok,true);
  assert.equal(validatePlacement(piece('yard_wall','foundation',12,18),expanded).reason,'outside-clearing');
  assert.equal(validatePlacement(piece('yard_wall','foundation',11.5,18),expanded).reason,'keep-path-clear');
  assert.equal(getCampPerimeter(expanded).some(s=>s.id.startsWith('divider')),false);
  // The removed divider must remain buildable through the new shared contract.
  assert.equal(getBuildBounds(0).minZ,12,'explicit numeric-tier helper remains legacy only');
});

test('yard console keeps a clear approach and relocates around accepted legacy buildings',()=>{
  const base={layout:createCampLayout(),structures:[]};assert.deepEqual(getCampYardConsole(base),{x:1.8,z:9.5});
  assert.equal(validatePlacement(piece('block_console','storage_crate',1.8,9.5),base).reason,'keep-path-clear');
  base.structures.push(piece('old_console_plot','foundation',1.8,9.5));assert.deepEqual(getCampYardConsole(base),{x:1.8,z:4.5});
  base.structures.push(piece('first_fallback','foundation',1.8,4.5));assert.deepEqual(getCampYardConsole(base),{x:-1.8,z:4.5});
  base.structures.push(piece('second_fallback','foundation',-1.8,4.5));assert.equal(getCampYardConsole(base),null,'never spawn an anchor inside an occupied footprint');
});

test('clearing saves finite progress, expansion spends one fixed cost, and each failure is atomic',()=>fixture((p,fail)=>{
  assert.equal(p.expandBase().reason,'debris-remaining');
  const initial=p.getState();fail(true);
  assert.equal(p.clearCampDebris(CAMP_DEBRIS_IDS[0]).cleared,false);assert.deepEqual(p.getState(),initial);
  fail(false);assert.equal(p.clearCampDebris('unknown').reason,'unknown-debris');clearYard(p);
  assert.equal(p.clearCampDebris(CAMP_DEBRIS_IDS[0]).reason,'already-cleared');
  assert.equal(p.placeStructure(piece('locked','lantern',0,18)).reason,'outside-clearing');
  const clear=p.getState();assert.equal(p.expandBase().expanded,false);assert.deepEqual(p.getState(),clear);
  p.collectResources(CAMP_YARD_COST);const funded=p.getState();fail(true);
  assert.equal(p.expandBase().expanded,false);assert.deepEqual(p.getState(),funded);
  fail(false);assert.equal(p.expandBase().expanded,true);assert.equal(p.getBaseState().tier,0,'old paid-tier history is not a second expansion authority');
  for(const id of Object.keys(CAMP_YARD_COST))assert.equal(p.getPackResourceCounts()[id],0);
  const expanded=p.getState();assert.equal(p.expandBase().reason,'already-expanded');assert.deepEqual(p.getState(),expanded);
  p.load();assert.equal(p.getBaseState().layout.yardExpanded,true);
}));

test('cleared IDs, expansion, pack and structures clone, export, import and failed import together',()=>fixture((p,fail)=>{
  p.collectResources({wood:16,stone:8,fiber:4});p.placeStructure(piece('floor'));p.clearCampDebris(CAMP_DEBRIS_IDS[1]);
  const before=p.getState(),saved=p.exportSave().payload;
  const clone=p.getBaseState();clone.layout.clearedDebrisIds.length=0;clone.structures[0].pos.x=80;assert.deepEqual(p.getState(),before);
  p.clear();assert.deepEqual(p.getBaseState().layout,createCampLayout());fail(true);
  const empty=p.getState();assert.equal(p.importSave(saved).ok,false);assert.deepEqual(p.getState(),empty);
  fail(false);assert.equal(p.importSave(saved).ok,true);assert.deepEqual(p.getState(),before);
  assert.deepEqual(cloneBase(p.getBaseState()),p.getBaseState());
}));

for(const tier of [0,1,2])test(`legacy tier ${tier} preserves edge foundations, support IDs and full crates before new reservations`,()=>{
  const half=BASE_CONFIG.halfSizes[tier],x=-half+1.3,z=18-half+1.3;
  const floor=piece('legacy_floor','foundation',x,z),crate={...piece('legacy_crate','storage_crate',x,z),pos:{x,y:.24,z},supportId:floor.id};
  const inventory=createInventoryState();inventory.containers.push({id:crate.id,type:'crate',label:'Saved supplies',slots:Array.from({length:24},()=>({id:'wood',count:20}))});
  fixture((p,_fail,saved)=>{
    const base=p.getBaseState();assert.equal(base.tier,tier);assert.equal(base.layout.yardExpanded,true);assert.equal(base.layout.legacyApron,true);assert.deepEqual(base.layout.clearedDebrisIds,CAMP_DEBRIS_IDS);
    assert.equal(base.structures.length,2);assert.deepEqual(base.structures[0],{...floor,supportId:null});assert.deepEqual(base.structures[1],crate);
    assert.equal(p.getInventoryState().containers[1].slots.reduce((sum,s)=>sum+s.count,0),480);
    assert.equal(p.expandBase().reason,'already-expanded');assert.equal(p.removeStructure(crate.id).reason,'storage-not-empty');
    p.load();assert.deepEqual(p.getBaseState(),base);assert.equal(saved().base.structures.length,2);
    const transfer=p.exportSave().payload;p.clear();assert.equal(p.importSave(transfer).ok,true);assert.deepEqual(p.getBaseState(),base);
    // Even newly authored scenery/reserves cannot erase an accepted legacy crate.
    assert.equal(normalizeBase(base,{reserved:[{pos:{x,z},radius:4}]}).structures.length,2);
  },{version:3,inventory,base:{tier,structures:[crate,floor]}});
});

test('v1/v2 paid empty bases migrate once; unpaid empty base keeps the fresh footprint',()=>{
  for(const version of [1,2])for(const tier of [0,1,2])fixture(p=>{
    assert.equal(p.getBaseState().layout.yardExpanded,tier>0);assert.equal(p.getBaseState().tier,tier);
  },{version,base:{tier,structures:[]}});
});

test('all old tier-2 edge foundations fit inside the widened perimeter without touching new walls',()=>{
  const base=normalizeBase({tier:2,structures:[]});
  for(const x of [-10.7,10.7])for(const z of [7.3,28.7]){
    const floor=piece(`edge_${x}_${z}`.replaceAll('.','_'),'foundation',x,z);
    assert.equal(validatePlacement(floor,base).ok,true,JSON.stringify({x,z}));
    assert.ok(footprint(floor).every(p=>p.x>=-12.00001&&p.x<=12.00001&&p.z>=5.99999&&p.z<=30.00001));
  }
});

test('yard defense cost uses only pack plus an explicitly chosen reachable container',()=>fixture(p=>{
  clearYard(p);let reachable=false;
  p.setInventoryAccess({canAccessContainer:()=>reachable,getCraftStorageId:()=> 'pod_locker'});
  const before=p.getInventoryState();assert.equal(p.expandBase().expanded,false);assert.deepEqual(p.getInventoryState(),before);
  reachable=true;assert.equal(p.expandBase().expanded,true);
  assert.equal(p.getInventoryState().containers[0].slots.filter(Boolean).length,0);
},{version:2,bankedResources:CAMP_YARD_COST}));

test('the production Camp fits a starter floor, supported Salvage bench and usable physical crate without expanding',()=>{
  const registry=createWorldRegistry(WORLD_DATA),camp=registry.getSectionById('camp');
  fixture(p=>{
    assert.equal(p.getBaseState().layout.yardExpanded,false);
    assert.equal(p.collectResources({wood:16,stone:5,fiber:4}).ok,true);
    for(const record of [piece('starter_floor','foundation',-4.5,7.7),piece('starter_bench','workbench',-4.5,7.7),piece('starter_crate','storage_crate',-4.5,9.7)]){
      const check=validatePlacement(record,{...p.getBaseState(),reserved:getCampReserved(registry),surface:camp.surface});
      assert.equal(check.ok,true,`${record.id}: ${check.reason}`);
      assert.equal(p.placeStructure(record).placed,true);
    }
    const built=p.getBaseState();assert.equal(built.structures[1].supportId,'build_starter_floor');
    assert.equal(p.getInventoryState().containers.find(c=>c.id==='build_starter_crate').slots.length,24);
    p.load();assert.deepEqual(p.getBaseState(),built);assert.equal(p.getInventoryState().containers.length,2);
    assert.equal(p.getBaseState().layout.yardExpanded,false);
  },null,registry);
});

test('production debris centers become buildable after clearing and preserve all three full physical crates on reload/import',()=>{
  const registry=createWorldRegistry(WORLD_DATA),camp=registry.getSectionById('camp'),reserved=getCampReserved(registry);
  const debris=CAMP_DEBRIS_IDS.map(id=>camp.props.find(prop=>prop.id===id));
  assert.equal(debris.filter(Boolean).length,3,'use all actual production debris placements');
  for(const prop of debris)assert.ok(reserved.some(record=>record.sourceId===prop.id),'reservation retains its authoritative source ID');
  fixture(p=>{
    clearYard(p);
    assert.equal(p.collectResources({wood:CAMP_YARD_COST.wood+18,stone:CAMP_YARD_COST.stone,fiber:CAMP_YARD_COST.fiber+6}).ok,true);
    assert.equal(p.expandBase().expanded,true);
    const crateIds=[];
    for(const [index,prop] of debris.entries()){
      const crate=piece(`cleared_${index}`,'storage_crate',prop.pos.x,prop.pos.z);
      const check=validatePlacement(crate,{...p.getBaseState(),reserved,surface:camp.surface});
      assert.equal(check.ok,true,`${prop.id}: ${check.reason}`);
      assert.equal(p.placeStructure(crate).placed,true,`crate can occupy cleared ${prop.id}`);
      crateIds.push(crate.id);
    }
    p.setInventoryAccess({canAccessContainer:()=>true});
    for(const id of crateIds)for(let slot=0;slot<24;slot++){
      assert.equal(p.collectResources({wood:20}).ok,true);
      assert.equal(p.inventory.transfer('backpack',0,id,{toIndex:slot}).moved,20);
    }
    const built=p.getBaseState(),inventory=p.getInventoryState();
    for(const id of crateIds){
      assert.equal(inventory.containers.find(c=>c.id===id).slots.reduce((sum,s)=>sum+s.count,0),480);
      assert.equal(p.removeStructure(id).reason,'storage-not-empty');
    }
    p.load();assert.deepEqual(p.getBaseState(),built);assert.deepEqual(p.getInventoryState(),inventory);
    const exported=p.exportSave().payload;p.clear();
    assert.equal(p.importSave(exported).ok,true);
    assert.deepEqual(p.getBaseState(),built);assert.deepEqual(p.getInventoryState(),inventory);
    p.load();assert.deepEqual(p.getBaseState(),built);assert.deepEqual(p.getInventoryState(),inventory);
  },null,registry);
});

test('invalid layout versions, fields, flags and debris IDs reject import without erasing inventory',()=>fixture(p=>{
  p.collectResources({wood:5});const before=p.exportSave().payload;
  const invalid=[null,{...createCampLayout(),version:2},{...createCampLayout(),extra:true},{...createCampLayout(),yardExpanded:1},{...createCampLayout(),yardExpanded:true},{...createCampLayout(),legacyApron:true},{...createCampLayout(),clearedDebrisIds:['bogus']},{...createCampLayout(),clearedDebrisIds:[CAMP_DEBRIS_IDS[0],CAMP_DEBRIS_IDS[0]]}];
  for(const layout of invalid){const candidate=structuredClone(before);candidate.progress.base.layout=layout;assert.equal(p.importSave(candidate).reason,'invalid-camp-layout');assert.deepEqual(p.exportSave().payload,before);}
  assert.throws(()=>readCampLayout({layout:undefined}),/invalid-camp-layout/);
}));

test('new footprint with an orphaned full crate is rejected instead of normalizing away its contents',()=>fixture(p=>{
  const before=p.exportSave().payload,candidate=structuredClone(before),crate=piece('outside','storage_crate',0,18);
  candidate.progress.base.structures=[crate];candidate.progress.inventory.containers.push({id:crate.id,type:'crate',label:'Full crate',slots:Array.from({length:24},()=>({id:'wood',count:20}))});
  assert.equal(p.importSave(candidate).reason,'orphaned-container');assert.deepEqual(p.exportSave().payload,before);
}));
