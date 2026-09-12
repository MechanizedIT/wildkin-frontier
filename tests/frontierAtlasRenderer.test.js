import test from 'node:test';
import assert from 'node:assert/strict';
import { collectVisibleAtlasCells, drawFrontierAtlas, playerYawToAtlasAngle } from '../src/ui/frontierAtlasRenderer.js';

function context() {
  const calls = [];
  return { calls, clearRect(){}, fillRect(...v){ calls.push(['fillRect', ...v]); }, beginPath(){}, moveTo(){}, lineTo(){}, closePath(){}, fill(){}, stroke(){}, save(){}, restore(){}, translate(){}, rotate(){}, set fillStyle(v){ calls.push(['color', v]); }, set strokeStyle(_){}, set lineWidth(_){} };
}

test('atlas renderer bounds its survey work to visible chunks and leaves fog dark', () => {
  const chunks = {};
  for (let i = 0; i < 80; i++) chunks[`f1:a:${i}:0`] = 1;
  const visible = collectVisibleAtlasCells({ chunks }, { centerX: 0, centerZ: 0, width: 220, height: 220 });
  assert.ok(visible.length < 8, 'only chunks in the displayed world window are considered');
  const ctx = context();
  const result = drawFrontierAtlas(ctx, { width: 100, height: 100, atlas: { chunks: { 'f1:a:0:0': 1 } }, centerX: 0, centerZ: 0, metersPerPixel: 1, getTerrainSample: () => ({ height: 4, groundColorRGB: [.2, .4, .2] }) });
  assert.deepEqual(result, { chunks: 1, cells: 1 });
  assert.ok(ctx.calls.some(c => c[0] === 'color' && c[1] === '#082c3a'), 'uncharted canvas begins as dark fog');
  assert.equal(ctx.calls.filter(c => c[0] === 'fillRect').length, 2, 'only a revealed cell is painted over fog');
});

test('atlas renderer limits dense visible coverage to 64 chunks', () => {
  const chunks = {};
  for (let x = -10; x <= 10; x++) for (let z = -10; z <= 10; z++) chunks[`f1:a:${x}:${z}`] = 1;
  assert.equal(collectVisibleAtlasCells({ chunks }, { centerX: 0, centerZ: 0, width: 3000, height: 3000 }).length, 64);
});

test('complete bounded viewport includes a revealed edge chunk without leaking outside masks', () => {
  const chunks = { 'f1:a:2:0': 1, 'f1:a:3:0': 1 << 24 };
  const visible = collectVisibleAtlasCells({ chunks }, { centerX: 0, centerZ: 0, width: 300, height: 50 });
  assert.deepEqual(visible.map(chunk => `${chunk.cx}:${chunk.cz}`), ['2:0']);
  const ctx = context(); let sampled = 0;
  drawFrontierAtlas(ctx, { width: 300, height: 50, atlas: { chunks: { 'f1:a:2:0': 1 } }, centerX: 0, centerZ: 0, metersPerPixel: 1, getTerrainSample: () => { sampled++; return { height: 4, groundColorRGB: [.2, .4, .2] }; } });
  assert.equal(sampled, 1, 'only the one set mask bit is sampled');
});

test('terrain colors are cached by immutable survey snapshot and never sampled for fog', () => {
  const atlas = { chunks: { 'f1:a:0:0': 1 } }, ctx = context(); let sampled = 0;
  const sample = () => { sampled++; return { height: 4, groundColorRGB: [.2, .4, .2] }; };
  drawFrontierAtlas(ctx, { width: 100, height: 100, atlas, centerX: 0, centerZ: 0, metersPerPixel: 1, getTerrainSample: sample });
  drawFrontierAtlas(ctx, { width: 100, height: 100, atlas, centerX: 0, centerZ: 0, metersPerPixel: 1, getTerrainSample: sample });
  assert.equal(sampled, 1, 'one revealed cell is sampled once across mini/full redraws');
});

test('heading marker maps controller +Z yaw zero to atlas south', () => {
  assert.equal(playerYawToAtlasAngle(0), Math.PI, 'controller yaw zero faces +Z, drawn down on a north-up atlas');
  assert.equal(playerYawToAtlasAngle(Math.PI / 2), Math.PI / 2, 'controller east faces right');
  assert.equal(playerYawToAtlasAngle(Math.PI), 0, 'controller north faces up');
});
