import test from 'node:test';
import assert from 'node:assert/strict';
import { TerrainChunkWorld, terrainChunkSnapshot, terrainChunkId } from '../lab/voxel/terrain-chunks.js';
import { TerrainMatterWindow, TerrainMatterLedger, analyzeTerrainMatterConnectivity, parseTerrainParcelId, terrainParcelId } from '../lab/voxel/terrain-matter-window.js';

test('global parcel identity is independent of chunk request and copied halo',()=>{
  const left=terrainChunkSnapshot([-1,0,0]),right=terrainChunkSnapshot([0,0,0]);
  const global=[0,4,4],probe=5,id=terrainParcelId(global,probe);
  assert.equal(terrainChunkId(...left.chunk),'-1,0,0');assert.equal(terrainChunkId(...right.chunk),'0,0,0');
  const haloIndex=(x,y,z)=>(x+1)+18*((y+1)+18*(z+1));
  assert.equal(left.densities[haloIndex(16,4,4)],right.densities[haloIndex(0,4,4)],'left halo and positive-side owner read one field sample');
  assert.deepEqual(parseTerrainParcelId(id),{cell:global,probe});
  assert.equal(terrainParcelId(parseTerrainParcelId(id).cell,probe),id);
  assert.throws(()=>terrainParcelId([32,4,4],probe),/outside resident patch/);
});

test('bounded matter window maps global/local samples and matches the authoritative seam values',()=>{
  const world=new TerrainChunkWorld(),window=new TerrainMatterWindow(world,{min:[8,0,-4],max:[24,16,12]});
  for(const point of [[15,5,3],[16,5,3],[17,5,3],[16,16,3]]){
    const local=window.globalToLocal(point);
    assert.deepEqual(window.localToGlobal(local),point);
    assert.deepEqual(window.readGlobal(point),world.read(point));
    assert.equal(window.readDensity(local),world.read(point).density);
  }
  assert.equal(window.query.globalMin[0],8);assert.equal(window.query.globalMax[0],24);
  assert.equal(window.query.sampleCount,17*17*17);
  assert.throws(()=>new TerrainMatterWindow(world,{min:[-17,0,0],max:[0,4,4]}),/leave resident patch/);
  assert.throws(()=>new TerrainMatterWindow(world,{min:[0,0,0],max:[33,1,1]}),/exceeds bounded support/);
  assert.throws(()=>window.globalToLocal([25,5,3]),/outside matter window/);
  const snapshot=window.snapshot(),sampleLocal=window.globalToLocal([16,5,3]),i=window.index(sampleLocal);
  snapshot.densities[i]=123;assert.equal(snapshot.readDensity(sampleLocal),123);assert.notEqual(window.readDensity(sampleLocal),123);
  window.densities[window.index(window.globalToLocal([24,16,12]))]=2;
  assert.throws(()=>window.copyToWorldEdits(),/read-only patch halo/);
});

test('support evidence fails closed when an occupied component reaches a query-window edge',()=>{
  const world=new TerrainChunkWorld(),window=new TerrainMatterWindow(world,{min:[8,0,-4],max:[24,16,12]});
  window.densities.fill(1);window.materials.fill(0);
  for(let z=1;z<=2;z++)for(let y=1;y<=2;y++)for(let x=0;x<=1;x++){const i=window.index([x,y,z]);window.densities[i]=-1;window.materials[i]=1;}
  const result=analyzeTerrainMatterConnectivity(window,{anchor:([,y])=>y===0});
  assert.equal(result.status,'HOLD');assert.match(result.reason,/nonresident occupied evidence/);
  assert.deepEqual(result.query.globalMin,[8,0,-4]);
});

test('compact patch ledger counts resolved probes once and balances transfer and consumption by material',()=>{
  const world=new TerrainChunkWorld(),ledger=new TerrainMatterLedger(world),initial=ledger.audit();
  assert.ok(initial.rock.initial>0);assert.ok(initial.dirt.initial>0);
  assert.deepEqual(ledger.assertBalanced(),initial);
  assert.throws(()=>new TerrainMatterLedger({revision:1,edits:new Map(),read:world.read}),/pristine/);
  assert.throws(()=>ledger.transfer(['0,0,0:0'],'WORLD'),/Invalid parcel transfer/);
  const material=ledger.materials.findIndex(value=>value===1);assert.ok(material>=0);
  const firstRockId=(()=>{for(let z=0;z<16;z++)for(let y=0;y<16;y++)for(let x=0;x<48;x++){
    const gx=x-16,gy=y,gz=z-16,cellIndex=x+48*(y+16*z),offset=cellIndex*8;
    for(let probe=0;probe<8;probe++)if(ledger.ownerIds[offset+probe]&&ledger.materials[offset+probe]===1)return terrainParcelId([gx,gy,gz],probe);
  }return null;})();
  assert.ok(firstRockId);assert.equal(ledger.transfer([firstRockId],'actor-seam'),1);
  assert.throws(()=>ledger.transfer([firstRockId,firstRockId],'actor-seam'),/Duplicate parcel/);
  assert.equal(ledger.owner(...Object.values(parseTerrainParcelId(firstRockId))), 'actor-seam');
  assert.throws(()=>ledger.consume([firstRockId,firstRockId],'actor-seam'),/Duplicate parcel/);
  ledger.consume([firstRockId],'actor-seam');
  assert.equal(ledger.owner(...Object.values(parseTerrainParcelId(firstRockId))), 'CONSUMED');
  const after=ledger.assertBalanced();assert.equal(after.rock.initial,after.rock.world+after.rock.actors+after.rock.consumed);
  assert.equal(after.rock.consumed,1);assert.equal(after.dirt.consumed,0);
  assert.equal(ledger.byteLength,ledger.ownerIds.byteLength+ledger.materials.byteLength);
  assert.ok(ledger.byteLength<1024*1024,'owner/material tables stay compact for this bounded experiment');
  const save=ledger.exportSave(),restored=TerrainMatterLedger.fromSave(world,structuredClone(save));assert.deepEqual(restored.audit(),after);
  assert.throws(()=>TerrainMatterLedger.fromSave(world,{...save,ownerIds:[...ledger.ownerIds,999]}),/Invalid terrain matter ledger save/);
  assert.throws(()=>TerrainMatterLedger.fromSave(world,{...save,ownerNames:{...save.ownerNames,1:'bad-world'}}),/Corrupt terrain matter ledger owners/);
  assert.throws(()=>TerrainMatterLedger.fromSave(world,{...save,nextOwnerId:ledger.actorOwnerIds.get('actor-seam')}),/next owner ID/);
});
