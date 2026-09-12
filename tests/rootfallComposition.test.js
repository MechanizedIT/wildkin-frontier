import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import WORLD from '../src/world/data/world.js';
import {composeRootfallPassage} from '../tools/compose-rootfall-passage.mjs';
import {ROOTFALL_CONFIG as C} from '../src/world/rootfallConfig.js';
import {getSurfaceHeight} from '../src/world/terrainSurfaceModel.js';
import {getCollisionBounds,validateConvexCollider} from '../src/world/convexCollider.js';

const manifest=JSON.parse(fs.readFileSync(new URL('../art/source/rootfall-v1/candidate-v4/manifest.json',import.meta.url),'utf8'));
const sourceRegion=WORLD.regions.find(r=>r.id===C.sectionId);
const composed=()=>composeRootfallPassage(structuredClone(WORLD));

test('Rootfall composes idempotently without changing reciprocal travel or unrelated authored content',()=>{
  const world=composed(),region=world.regions.find(r=>r.id===C.sectionId),once=structuredClone(world);
  composeRootfallPassage(world);assert.deepEqual(world,once);
  const priorGate=sourceRegion.portalGates.find(g=>g.id===C.gateId),gate=region.portalGates.find(g=>g.id===C.gateId);
  const retained=g=>{const {displayName,visualAssetId,uniformScale,requirements,...stable}=g;return stable;};
  assert.deepEqual(retained(gate),retained(priorGate));assert.deepEqual(gate.pos,{x:0,y:1.35,z:-34});
  assert.deepEqual(gate.requirements.resources,{wood:4,fiber:2});assert.equal(gate.requirements.minPlayerLevel,undefined);
  assert.equal(gate.visualAssetId,'asset_path_lantern');assert.equal(gate.uniformScale,1);
  assert.deepEqual(region.portalGates.filter(g=>g.id!==C.gateId),sourceRegion.portalGates.filter(g=>g.id!==C.gateId));
  for(const other of world.regions.filter(r=>r.id!==C.sectionId))assert.deepEqual(other,WORLD.regions.find(r=>r.id===other.id));
  assert.deepEqual(region.entryPoints,sourceRegion.entryPoints);assert.deepEqual(region.resources,sourceRegion.resources);
  assert.deepEqual(region.lootChests,sourceRegion.lootChests);assert.deepEqual(world.lootTables,WORLD.lootTables);
  const changed=new Set([...Object.values(C.props),...C.cutIds,'prop_s1_rootfall_l','prop_s1_rootfall_r']);
  assert.deepEqual(region.props.filter(p=>!changed.has(p.id)),sourceRegion.props.filter(p=>!changed.has(p.id)));
});

test('five stable body props share their true origin while seam resources only own three peelable chips',()=>{
  const world=composed(),region=world.regions.find(r=>r.id===C.sectionId);
  const hidden=new Set([C.props.braceLeft,C.props.braceRight]);
  for(const id of Object.values(C.props)){
    const p=region.props.find(p=>p.id===id),asset=world.visualAssets.find(a=>a.id===p.visualAssetId);
    assert.deepEqual(p.pos,{x:0,y:getSurfaceHeight(region.surface,0,-31),z:-31});
    assert.equal(p.rotY,0);assert.equal(p.uniformScale,1);assert.equal(p.collisionEnabled,true);
    assert.equal(p.visibleInPlay,!hidden.has(id));assert.equal(asset.gameplay.role,'prop');
    validateConvexCollider(asset.collision);assert.ok(asset.collision.vertices.length/3<=64);
    assert.match(asset.model.path,/^assets\/models\/rootfall-(left|right|center|brace-left|brace-right)-v1\/model\.glb$/);
    assert.deepEqual(asset.model.pivot,{x:0,y:0,z:0});
  }
  for(const [i,id] of C.cutIds.entries()){
    const p=region.props.find(p=>p.id===id),asset=world.visualAssets.find(a=>a.id===p.visualAssetId);
    const [x,y,z]=manifest.seams.positions[i];assert.deepEqual(p.pos,{x,y:1.35+y,z:-31+z});
    assert.equal(p.collisionEnabled,false);assert.equal(p.visibleInPlay,true);
    assert.deepEqual(asset.gameplay.harvestable,{dropId:'wood',maxChunks:3,respawnSeconds:240,feedbackProfile:'wood'});
    assert.deepEqual(asset.collision,{shape:'box',...manifest.seams.targetBox});
  }
  for(const id of ['prop_s1_rootfall_l','prop_s1_rootfall_r'])assert.equal(region.props.some(p=>p.id===id),false);
});

test('retained source geometry and collision leave the three-metre lane and original return landing clear',()=>{
  const world=composed(),region=world.regions.find(r=>r.id===C.sectionId);
  for(const id of [C.props.left,C.props.right,C.props.braceLeft,C.props.braceRight]){
    const p=region.props.find(p=>p.id===id),a=world.visualAssets.find(a=>a.id===p.visualAssetId),bounds=getCollisionBounds(a.collision);
    const minX=bounds.offset.x-bounds.size.w/2,maxX=bounds.offset.x+bounds.size.w/2;
    assert.ok(maxX<=-1.5||minX>=1.5,`${id} hull cannot enter the reserved lane`);
    const name=a.model.path.split('/')[2].replace(/-v1$/,''),source=manifest.components[name].bounds;
    assert.ok(source.max[0]<=-1.5||source.min[0]>=1.5,`${id} visible source cannot enter the reserved lane`);
  }
  assert.equal(getSurfaceHeight(region.surface,0,-31.5),1.35,'original return landing keeps its ridge surface');
  assert.equal(manifest.components['rootfall-center'].bounds.min[1],0,'closed central bulk meets its assembly floor');
  assert.ok(manifest.components['rootfall-center'].bounds.max[1]>2,'closed visible mass is a substantial blocker');
});

test('approach paint preserves terrain shape and keeps brace feet on the existing raised ridge',()=>{
  const world=composed(),region=world.regions.find(r=>r.id===C.sectionId);
  const {routes:beforeRoutes,...before}=sourceRegion.surface,{routes:afterRoutes,...after}=region.surface;
  assert.deepEqual(after,before);assert.deepEqual(afterRoutes.filter(r=>r.id!=='rootfall-approach'),beforeRoutes.filter(r=>r.id!=='rootfall-approach'));
  const route=afterRoutes.find(r=>r.id==='rootfall-approach');assert.equal(route.elevation,undefined);
  for(let x=-8;x<=8;x+=2)for(let z=-36;z<=-25;z++)assert.equal(getSurfaceHeight(region.surface,x,z),getSurfaceHeight(sourceRegion.surface,x,z));
  for(const side of Object.values(manifest.braceContacts))for(const [x,y,z] of side.feet){
    assert.equal(getSurfaceHeight(region.surface,x,-31+z),1.35);
    assert.ok(y<=.04,'recorded timber foot center is within its half-thickness of ground');
  }
});
