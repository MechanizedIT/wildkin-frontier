import test from 'node:test';
import assert from 'node:assert/strict';
import { createItemCatalog } from '../src/inventory/itemCatalog.js';
import { addStack, countItems, transferStack, sortStacks, craftStacks, removeItems } from '../src/inventory/slotOperations.js';
const catalog = createItemCatalog([{id:'wood'}, {id:'fiber'}, {id:'berries'}, {id:'ore_custom', displayName:'Author ore'}]);
const stack = (id, count) => ({id, count});
const sum = (...containers) => countItems(containers.flat());

test('capacity-aware pickups fill partial stacks and retain rejected quantity without mutation', () => {
  const pack = [stack('wood',18), null], before = structuredClone(pack);
  const result = addStack(pack,'wood',26,catalog);
  assert.equal(result.added,22);assert.equal(result.remaining,4);
  assert.deepEqual(result.slots,[stack('wood',20),stack('wood',20)]);assert.deepEqual(pack,before);
  assert.equal(addStack(pack,'missing',1,catalog).added,0);
  assert.equal(catalog.ore_custom.name,'Author ore');
});

test('transfer/merge/split/swap and failed drops conserve physical items', () => {
  let pack=[stack('wood',17),stack('fiber',5),null], chest=[stack('wood',19),null];
  const total=sum(pack,chest);
  let r=transferStack(pack,chest,0,catalog,{count:7});assert.equal(r.moved,7);assert.deepEqual(sum(r.source,r.target),total);
  pack=r.source;chest=r.target;
  r=transferStack(pack,pack,0,catalog,{toIndex:2,count:3});assert.equal(r.source,r.target);assert.deepEqual(countItems(r.source),countItems(pack));
  assert.deepEqual(r.source,[stack('wood',7),stack('fiber',5),stack('wood',3)]);
  r=transferStack(pack,chest,1,catalog,{toIndex:0});assert.equal(r.swapped,true);assert.deepEqual(sum(r.source,r.target),total);
  r=transferStack(pack,chest,1,catalog,{toIndex:0,count:2});assert.equal(r.ok,false);assert.deepEqual(r.source,pack);assert.deepEqual(r.target,chest);
  r=transferStack(pack,chest,0,catalog,{toIndex:-1});assert.equal(r.ok,false);
  assert.equal(transferStack(pack,pack,0,catalog,{toIndex:0}).ok,false);
});

test('sort merges fragmented stacks without losing quantity and declines corrupt overcapacity', () => {
  const pack=[stack('wood',7),stack('fiber',4),stack('wood',15),null];
  const r=sortStacks(pack,catalog);assert.equal(r.ok,true);assert.deepEqual(countItems(r.slots),countItems(pack));
  assert.deepEqual(r.slots,[stack('fiber',4),stack('wood',20),stack('wood',2),null]);
  assert.equal(sortStacks([stack('wood',50)],catalog).ok,false);
});

test('craft checks final capacity after consumption and rolls back all sources on rejection', () => {
  const pack=[stack('fiber',1),stack('berries',2)], chest=[stack('fiber',10)];
  const r=craftStacks(pack,chest,{fiber:1,berries:2},{berry_lure:1},catalog);
  assert.equal(r.ok,true);assert.deepEqual(r.pack,[stack('berry_lure',1),null]);assert.deepEqual(r.storage,chest);
  const full=[stack('wood',20),stack('berries',20)];
  const rejected=craftStacks(full,chest,{fiber:1,berries:2},{berry_lure:1},catalog);
  assert.equal(rejected.reason,'output-full');assert.deepEqual(rejected.pack,full);assert.deepEqual(rejected.storage,chest);
  assert.equal(craftStacks(pack,null,{fiber:4},{woven_snare:1},catalog).reason,'missing-items');
  assert.equal(craftStacks(pack,chest,{fiber:1},{missing:1},catalog).reason,'invalid-recipe');
  assert.deepEqual(removeItems(pack,{fiber:2}).slots,pack);
});

test('craft frees the same output capacity regardless of matching stack order and rejects aliased storage',()=>{
 for(const pack of [[stack('fiber',20),stack('fiber',1),stack('berries',3)],[stack('fiber',1),stack('fiber',20),stack('berries',3)]]){
  const result=craftStacks(pack,null,{fiber:1,berries:2},{berry_lure:1},catalog);
  assert.equal(result.ok,true);assert.deepEqual(countItems(result.pack),{fiber:20,berries:1,berry_lure:1});
  assert.equal(craftStacks(pack,pack,{fiber:30},{berry_lure:1},catalog).reason,'duplicate-container');
 }
});

test('Author resource IDs matching object properties remain actual finite items',()=>{
 const custom=createItemCatalog([{id:'constructor'},{id:'__proto__'}]);
 for(const id of ['constructor','__proto__']){
  const cost=Object.fromEntries([[id,1]]), pack=[stack(id,2),null];
  const result=craftStacks(pack,null,cost,{berry_lure:1},custom);
  assert.equal(result.ok,true);assert.equal(countItems(result.pack)[id],1);
  assert.equal(craftStacks([null,null],null,cost,{berry_lure:1},custom).reason,'missing-items');
  assert.equal(craftStacks([null,null],null,cost,{berry_lure:1},catalog).reason,'invalid-recipe');
 }
});
