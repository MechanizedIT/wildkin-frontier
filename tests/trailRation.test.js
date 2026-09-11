import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFrontierProgress} from '../src/save/frontierProgress.js';
import {createFieldFoodUse} from '../src/equipment/fieldFood.js';
import {createEquipmentSystem} from '../src/equipment/equipmentSystem.js';
import {getEquipmentCount} from '../src/equipment/equipmentCatalog.js';
import {STATION_RECIPE_IDS} from '../src/base/stationCatalog.js';

function fixture(run){
 const previous=globalThis.localStorage,storage=new Map();let fail=false;
 globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('storage full');storage.set(k,v);},removeItem:k=>storage.delete(k)};
 try{const progress=createFrontierProgress();progress.load();progress.bankRun({wood:30,stone:20,berries:20,fiber:20},0,'ration-test');let health=3,active=true,feedback=0;
 const playerCombat={getHealth:()=>health,getMaxHealth:()=>5,heal:n=>{health=Math.min(5,health+n);return true;}};
 const eat=createFieldFoodUse({progress,playerCombat,isActive:()=>active,onConsumed:()=>feedback++});
 run({progress,eat,health:()=>health,setHealth:v=>health=v,setActive:v=>active=v,fail:v=>fail=v,feedback:()=>feedback});
 }finally{globalThis.localStorage=previous;}
}
const bedlessBench={id:'build_ration_test',type:'workbench',pos:{x:0,y:0,z:18},yaw:0};
const item={id:'trail_ration'};
test('ration recipe uses existing station, ingredient and persistent stack/loadout transactions',()=>fixture(({progress:p})=>{
 assert.ok(STATION_RECIPE_IDS.workbench.includes(item.id));assert.equal(p.craftFieldSupply(item.id).reason,'station-required');
 assert.equal(p.placeStructure(bedlessBench).placed,true);const bank=p.getBankedResources();assert.equal(p.craftFieldSupply(item.id).crafted,true);
 assert.equal(p.getBankedResources().berries,bank.berries-2);assert.equal(p.getBankedResources().fiber,bank.fiber-1);assert.equal(p.getFieldSupplies().berry_lure,0);
 assert.equal(getEquipmentCount(item.id,p.getState()),1);assert.equal(p.assignQuickSlot(3,item.id).ok,true);assert.equal(p.selectQuickSlot(3).ok,true);
 p.load();assert.equal(p.getLoadout().slots[3],item.id);assert.equal(p.getFieldSupplies().trail_ration,1);
 const saved=p.exportSave().payload;p.clear();assert.equal(p.getFieldSupplies().trail_ration,0);assert.equal(p.importSave(saved).ok,true);assert.equal(p.getLoadout().selected,3);assert.equal(p.getFieldSupplies().trail_ration,1);
}));
test('ration restores exactly1 health once, preserving stock at full health, in Camp, dead or on failed save',()=>fixture(f=>{
 const p=f.progress;p.placeStructure(bedlessBench);p.craftFieldSupply(item.id);p.craftFieldSupply(item.id);
 f.setHealth(5);assert.equal(f.eat(item).ok,false);f.setHealth(3);f.setActive(false);assert.equal(f.eat(item).ok,false);f.setActive(true);f.setHealth(0);assert.equal(f.eat(item).ok,false);
 f.setHealth(3);f.fail(true);assert.match(f.eat(item).message,/Could not save/);assert.equal(f.health(),3);assert.equal(p.getFieldSupplies().trail_ration,2);f.fail(false);
 assert.equal(f.eat(item).ok,true);assert.equal(f.health(),4);assert.equal(p.getFieldSupplies().trail_ration,1);assert.equal(f.feedback(),1);
 assert.equal(f.eat(item).ok,true);assert.equal(f.health(),5);f.setHealth(4);assert.match(f.eat(item).message,/Salvage bench/);assert.equal(f.health(),4);
}));
test('food uses the existing edge-triggered equipment path; holding, modal blocking and selection cannot spend',()=>fixture(f=>{
 const p=f.progress;p.placeStructure(bedlessBench);for(let i=0;i<3;i++)p.craftFieldSupply(item.id);p.assignQuickSlot(3,item.id);
 const equipment=createEquipmentSystem({progress:p,eat:f.eat});equipment.select(3);assert.equal(p.getFieldSupplies().trail_ration,3);
 equipment.routeInput({requested:true,held:true});assert.equal(p.getFieldSupplies().trail_ration,3);equipment.routeInput({held:false});equipment.routeInput({requested:true,held:true});
 for(let i=0;i<5;i++)equipment.routeInput({requested:true,held:true});assert.equal(p.getFieldSupplies().trail_ration,2);assert.equal(f.health(),4);
 equipment.routeInput({blocked:true,requested:true,held:true});assert.equal(p.getFieldSupplies().trail_ration,2);assert.equal(equipment.isToolEquipped(),false);
}));
