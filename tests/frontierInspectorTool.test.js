import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = path.join(ROOT, 'tools', 'inspect-frontier.mjs');
const run = args => spawnSync(process.execPath, [TOOL, ...args], { cwd: ROOT, encoding: 'utf8' });
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('continent overview is bounded, deterministic, and owns no life enumeration', () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'frontier-overview-'));
  const firstDir = path.join(scratch, 'first'), secondDir = path.join(scratch, 'second');
  try {
    const args = ['--overview', '--resolution', '24', '--output-dir'];
    const first = run([...args, firstDir]);
    const second = run([...args, secondDir]);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    for (const name of ['continent-overview.png', 'habitat-allocation.png', 'continent-overview.svg', 'continent-overview.json']) {
      assert.equal(digest(path.join(firstDir, name)), digest(path.join(secondDir, name)), `${name} is deterministic`);
    }

    const report = JSON.parse(fs.readFileSync(path.join(firstDir, 'continent-overview.json'), 'utf8'));
    assert.equal(report.format, 'living-frontier-continent-overview-v1');
    assert.deepEqual(report.bounds, { minX: -4700, maxX: 3300, minZ: -4900, maxZ: 3100 });
    assert.deepEqual(report.sampling.sourceOwners,
      ['frontierContinent', 'frontierTerrain', 'frontierRegion-via-terrain', 'frontierRegionCatalog']);
    assert.equal(report.sampling.lifeEnumeration, false);
    assert.ok(report.sampling.width <= 180 && report.sampling.height <= 180);
    assert.equal(report.sampling.sampleCount, report.sampling.width * report.sampling.height);
    assert.deepEqual(report.metrics.provinces.implementedGrammars, ['lush', 'sunscar', 'ironspine']);
    assert.equal(report.metrics.habitats.completionStatus, 'topology-only');
    assert.equal(report.metrics.habitats.canonicalCount, 10);
    assert.equal(report.metrics.habitats.sampledLandCount, 10);
    assert.equal(report.metrics.habitats.catalog.length, 10);
    assert.deepEqual(report.metrics.habitats.actualIds,
      report.metrics.habitats.catalog.map(record => record.habitatId).sort());
    assert.equal(Object.values(report.metrics.habitats.landSamplesById).reduce((sum, count) => sum + count, 0), report.metrics.landSamples);
    assert.equal('unassigned' in report.metrics.habitats.landSamplesById, false);
    assert.equal(report.grids.habitat.id.length, report.sampling.sampleCount);
    assert.equal('counts' in report, false);
    assert.equal('placements' in report, false);
    assert.match(report.label, /not ten completed habitats/);
    const svg = fs.readFileSync(path.join(firstDir, 'continent-overview.svg'), 'utf8');
    assert.match(svg, /Habitat allocation · topology-only/);
    assert.match(svg, /three implemented grammars/);
    for (const [index, habitat] of report.metrics.habitats.catalog.entries()) {
      assert.match(svg, new RegExp(`>${index + 1}<`));
      assert.match(svg, new RegExp(habitat.name));
    }
    assert.notEqual(digest(path.join(firstDir, 'continent-overview.png')), digest(path.join(firstDir, 'habitat-allocation.png')));
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});

test('continent overview rejects spans and sample grids beyond its fixed limits', () => {
  for (const [args, expected] of [
    [['--overview', '--extent-x', '8001'], /--extent-x must be from 1000 to 8000/],
    [['--overview', '--resolution', '181'], /--resolution must be an integer from 24 to 180/],
    [['--overview', '--extent-x', '1000', '--extent-z', '8000', '--resolution', '180'], /derived Z resolution 1440 exceeds 180/],
  ]) {
    const result = run(args);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, expected);
  }
});

test('the detailed local inspector still emits its life and placement report', () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'frontier-local-inspector-'));
  try {
    const result = run(['--extent', '50', '--resolution', '24', '--output-dir', scratch]);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(fs.readFileSync(path.join(scratch, 'frontier-inspector.json'), 'utf8'));
    assert.equal(report.format, 'living-frontier-inspector-v1');
    assert.ok('forage' in report.counts && 'wildlife' in report.counts && 'scenery' in report.counts);
    assert.ok('forage' in report.placements && 'wildlife' in report.placements && 'scenery' in report.placements);
    assert.ok(Array.isArray(report.metrics.habitats.dominantIds));
    assert.equal(report.grids.habitat.id.length, report.sampling.width * report.sampling.height);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});
