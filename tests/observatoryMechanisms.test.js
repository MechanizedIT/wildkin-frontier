import test from 'node:test';
import assert from 'node:assert/strict';
import {Group, Scene} from 'three';
import {createObservatoryMechanisms, OBSERVATORY_MOTION} from '../src/presentation/observatoryMechanisms.js';

test('receiver tracks only its discovered active region and restores neutral on lifecycle boundaries', () => {
  const scene = new Scene(), unlocked = new Set();
  const regions = ['fen','other'].map(id => ({id,majorWaypoints:[{id:`wp_${id}`}],props:[{id:`receiver_${id}`,visualAssetId:OBSERVATORY_MOTION.assetId}]}));
  const pivots = regions.map(region => {
    const root = new Group(); root.name=region.props[0].id;
    const pivot = new Group(); pivot.name='ReceiverTiltPivot'; root.add(pivot); scene.add(root);
    return pivot;
  });
  const motion=createObservatoryMechanisms({scene,registry:{data:{regions}},progress:{isUnlockedWaypoint:id=>unlocked.has(id)}});
  motion.update(2.5,{sectionId:'fen'});
  assert.equal(pivots[0].rotation.x,0,'unvisited instrument remains dormant');
  unlocked.add('wp_fen'); unlocked.add('wp_other');
  motion.update(2.5,{sectionId:'fen'});
  assert.equal(pivots[0].rotation.x,OBSERVATORY_MOTION.tiltRadians);
  assert.equal(pivots[1].rotation.x,0,'inactive region never tracks');
  motion.update(2.5,{sectionId:'fen',paused:true});
  assert.equal(pivots[0].rotation.x,OBSERVATORY_MOTION.tiltRadians);
  motion.update(1,{sectionId:'fen',reducedMotion:true});
  assert.equal(pivots[0].rotation.x,0);
  motion.update(2.5,{sectionId:'other'});
  assert.equal(pivots[0].rotation.x,0);
  assert.equal(pivots[1].rotation.x,OBSERVATORY_MOTION.tiltRadians);
  motion.update(1,{sectionId:'other',hidden:true});
  assert.equal(pivots[1].rotation.x,0,'Author mode restores the exported neutral transform');
  motion.update(2.5,{sectionId:'fen'}); motion.reset();
  assert.equal(pivots[0].rotation.x,0);
});
