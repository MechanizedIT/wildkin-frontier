import test from 'node:test';
import assert from 'node:assert/strict';
import { commitFrontierOutingStart, createFrontierOuting, isBeyondCampOutingBoundary } from '../src/session/frontierOuting.js';
import { createExpeditionSession } from '../src/session/expeditionSession.js';

const bounds = { minX: -50, maxX: 50, minZ: -50, maxZ: 50 };

test('walking four metres beyond Camp begins once at the current position', () => {
  let status = 'camp';
  const starts = [];
  const outing = createFrontierOuting({
    session: { isCamp: () => status === 'camp' }, campBounds: bounds,
    commitStart: request => { starts.push(request); status = 'active'; return { ok: true, runId: 'run_walk' }; },
  });
  assert.equal(isBeyondCampOutingBoundary({ x: 54, z: 0 }, bounds), false);
  assert.equal(outing.update(.1, { x: 53.99, y: 4, z: 0 }, { grounded: true }), null);
  assert.deepEqual(outing.update(.1, { x: 54.01, y: 4, z: 0 }, { grounded: true }), { ok: true, runId: 'run_walk' });
  outing.update(.1, { x: 60, y: 5, z: 0 }, { grounded: true });
  assert.deepEqual(starts, [{ position: { x: 54.01, y: 4, z: 0 }, source: 'walk-out', frontierDeparted: true }]);
});

test('unsupported motion waits and a failed start remains Camp with a bounded retry', () => {
  let attempts = 0;
  const session = { isCamp: () => true };
  const outing = createFrontierOuting({ session, campBounds: bounds, retrySeconds: 1,
    commitStart: () => { attempts++; return { ok: false, reason: 'storage-write-failed' }; } });
  assert.equal(outing.update(.1, { x: 60, y: 2, z: 0 }, { grounded: false }), null);
  assert.equal(attempts, 0);
  assert.deepEqual(outing.update(.1, { x: 60, y: 2, z: 0 }, { grounded: true }), { ok: false, reason: 'storage-write-failed' });
  outing.update(.5, { x: 61, y: 2, z: 0 }, { grounded: true });
  assert.equal(attempts, 1);
  outing.update(.5, { x: 62, y: 2, z: 0 }, { grounded: true });
  assert.equal(attempts, 2);
});

test('the Camp depart action uses the same in-place start inside the boundary', () => {
  let active=false;
  const calls = [];
  const outing = createFrontierOuting({ session: { isCamp: () => !active, isActive:()=>active }, campBounds: bounds,
    commitStart: request => { calls.push(request);active=true;return { ok: true }; } });
  assert.deepEqual(outing.startAt({ x: 4, y: .52, z: -8 }, { source: 'camp-gate' }), { ok: true });
  assert.deepEqual(calls[0], { position: { x: 4, y: .52, z: -8 }, source: 'camp-gate', frontierDeparted: false });
  assert.equal(outing.hasDepartedCamp(),false);
  outing.update(.1,{x:54.01,y:2,z:0},{grounded:true});
  assert.equal(outing.hasDepartedCamp(),true);
});

test('a failed initial checkpoint rolls the session back without changing cargo or XP', () => {
  const session=createExpeditionSession({initialStatus:'camp'});
  const cargo={wood:7};
  const result=commitFrontierOutingStart({session,cargo,xp:13,checkpoint:()=>({ok:false,reason:'storage-write-failed'}),getActiveRun:()=>null});
  assert.deepEqual(result,{ok:false,reason:'storage-write-failed'});
  assert.equal(session.isCamp(),true);
  assert.equal(session.getCargo().wood,cargo.wood);
  assert.equal(session.getRunXp(),13);
});

test('a start is committed only when the saved record matches the new run identity', () => {
  const session=createExpeditionSession({initialStatus:'camp'});
  let record=null;
  const result=commitFrontierOutingStart({session,startAnchorId:'camp_gate',cargo:{wood:2},xp:5,
    checkpoint:()=>{record={runId:session.getRunId()};return {ok:true};},getActiveRun:()=>record});
  assert.equal(result.ok,true);assert.equal(result.runId,session.getRunId());assert.equal(session.isActive(),true);
  assert.equal(session.getCargo().wood,2);assert.equal(session.getRunXp(),5);
});
