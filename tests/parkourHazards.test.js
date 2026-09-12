import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import WORLD_DATA from '../src/world/data/world.generated.js';
import { createParkourSystem } from '../src/world/parkourSystem.js';
import { createThornBedVisual } from '../src/world/hazardVisual.js';

test('retired courses emit no campaign hazards while the generic thorn bed stays bounded', () => {
  for (const region of WORLD_DATA.regions.filter(r=>r.id!=='camp')) {
    assert.deepEqual(region.killVolumes, [], `${region.id} has no retired course hazard`);
  }
  const size = { w: 4, h: 1.2, d: 5 };
  const visual=createThornBedVisual({size});
  visual.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(visual);
  assert.ok(bounds.max.y <= size.h/2+.025,'visible tips stay within hazard height');
  assert.ok(bounds.min.y >= -size.h/2-.001);
});

test('rotated visible beds and protection volumes use the same oriented footprint', () => {
  const volume={id:'hazard',courseId:'course',pos:{x:0,y:.5,z:0},size:{w:4,h:1,d:1},rotY:Math.PI/2};
  const start={id:'start',courseId:'course',sectionId:'region',pos:{x:0,y:.5,z:4},respawnPosition:{x:0,y:0,z:4}};
  const safe=[],fatal=[];
  const registry={getParkourStartsForSection:()=>[start],getKillVolumesForSection:()=>[volume]};
  const course=createParkourSystem(registry,{getActiveSectionId:()=> 'region',onSafeFailure:e=>safe.push(e),onNormalFatal:e=>fatal.push(e)});
  course.update(start.pos);
  course.update({x:1.5,y:.5,z:0});
  assert.equal(safe.length,0,'outside rotated visual footprint is safe');
  course.update({x:0,y:2,z:1.5});
  assert.equal(safe.length,0,'airborne player clears the tips');
  course.update({x:0,y:.5,z:1.5});
  assert.equal(safe.length,1);
  assert.equal(safe[0].respawn.position.z,4);
  assert.equal(fatal.length,0);
  course.leaveCourse();
  course.update({x:0,y:.5,z:1.5});
  assert.equal(fatal.length,1,'outside an active course the same visible hazard is fatal');
});
