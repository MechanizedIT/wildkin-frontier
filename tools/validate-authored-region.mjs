#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1)));
const requested = process.argv[2] ?? 'rootbound-wildwood';
const regionRoot = path.isAbsolute(requested)
  ? requested
  : path.join(ROOT, 'assets', 'world-authored', requested);
const manifestPath = path.join(regionRoot, 'manifest.json');

function fail(message) {
  console.error(`[authored-region] FAIL: ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(manifestPath)) {
  fail(`missing ${manifestPath}`);
  process.exit();
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (error) {
  fail(`invalid JSON: ${error.message}`);
  process.exit();
}

if (manifest.schemaVersion !== 1) fail(`unsupported schemaVersion ${manifest.schemaVersion}`);
if (!manifest.regionId || typeof manifest.regionId !== 'string') fail('regionId must be a string');
if (!(manifest.chunkSize > 0)) fail('chunkSize must be > 0');
if (!Array.isArray(manifest.chunks)) fail('chunks must be an array');
if (!Array.isArray(manifest.markers)) fail('markers must be an array');

const seenChunks = new Set();
for (const chunk of manifest.chunks ?? []) {
  if (!Number.isInteger(chunk.cx) || !Number.isInteger(chunk.cz)) {
    fail(`invalid chunk coordinate ${JSON.stringify(chunk)}`);
    continue;
  }
  const key = `${chunk.cx},${chunk.cz}`;
  if (seenChunks.has(key)) fail(`duplicate chunk ${key}`);
  seenChunks.add(key);
  if (typeof chunk.path !== 'string') {
    fail(`chunk ${key} has no path`);
    continue;
  }
  const repoRelative = chunk.path.replace(/^assets[\\/]/, '');
  const file = path.join(ROOT, 'assets', repoRelative);
  if (!fs.existsSync(file)) fail(`chunk ${key} missing file ${chunk.path}`);
}

for (const [kind, assetPath] of Object.entries(manifest.assets ?? {})) {
  if (typeof assetPath !== 'string') {
    fail(`asset ${kind} path must be a string`);
    continue;
  }
  const repoRelative = assetPath.replace(/^assets[\\/]/, '');
  const file = path.join(ROOT, 'assets', repoRelative);
  if (!fs.existsSync(file)) fail(`asset ${kind} missing file ${assetPath}`);
}

const seenMarkerIds = new Set();
for (const marker of manifest.markers ?? []) {
  if (!marker?.id || typeof marker.id !== 'string') {
    fail(`marker missing stable id: ${JSON.stringify(marker)}`);
    continue;
  }
  if (seenMarkerIds.has(marker.id)) fail(`duplicate marker id ${marker.id}`);
  seenMarkerIds.add(marker.id);
  const position = marker.position;
  if (!position || !['x', 'y', 'z'].every(axis => Number.isFinite(position[axis]))) {
    fail(`marker ${marker.id} has invalid position`);
  }
}

if (!process.exitCode) {
  console.log(`[authored-region] PASS ${manifest.regionId}`);
  console.log(`[authored-region] ${manifest.chunks.length} streamed chunks, ${manifest.markers.length} gameplay markers`);
  console.log(`[authored-region] assets: ${Object.keys(manifest.assets ?? {}).join(', ') || 'none'}`);
}
