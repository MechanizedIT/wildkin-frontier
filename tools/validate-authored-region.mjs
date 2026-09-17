#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
if (!Array.isArray(manifest.placements)) fail('placements must be an array');
if (!Array.isArray(manifest.uniqueChunks)) fail('uniqueChunks must be an array');
if (!Array.isArray(manifest.markers)) fail('markers must be an array');

function validateRepoAsset(label, assetPath) {
  if (typeof assetPath !== 'string') {
    fail(`${label} path must be a string`);
    return;
  }
  const repoRelative = assetPath.replace(/^assets[\\/]/, '');
  const file = path.join(ROOT, 'assets', repoRelative);
  if (!fs.existsSync(file)) fail(`${label} missing file ${assetPath}`);
}

for (const [kind, assetPath] of Object.entries(manifest.assets ?? {})) {
  validateRepoAsset(`asset ${kind}`, assetPath);
}

const seenChunks = new Set();
for (const chunk of manifest.uniqueChunks ?? []) {
  if (!Number.isInteger(chunk.cx) || !Number.isInteger(chunk.cz)) {
    fail(`invalid unique chunk coordinate ${JSON.stringify(chunk)}`);
    continue;
  }
  const key = `${chunk.cx},${chunk.cz}`;
  if (seenChunks.has(key)) fail(`duplicate unique chunk ${key}`);
  seenChunks.add(key);
  validateRepoAsset(`unique chunk ${key}`, chunk.path);
}

const seenPlacementIds = new Set();
for (const placement of manifest.placements ?? []) {
  if (!placement?.id || typeof placement.id !== 'string') fail(`placement missing stable id: ${JSON.stringify(placement)}`);
  else if (seenPlacementIds.has(placement.id)) fail(`duplicate placement id ${placement.id}`);
  else seenPlacementIds.add(placement.id);
  if (!placement?.assetId || typeof placement.assetId !== 'string') fail(`placement ${placement?.id ?? '?'} missing assetId`);
  const position = placement?.position;
  if (!position || !['x', 'y', 'z'].every(axis => Number.isFinite(position[axis]))) fail(`placement ${placement?.id ?? '?'} has invalid position`);
  if (!Number.isFinite(placement?.yaw)) fail(`placement ${placement?.id ?? '?'} has invalid yaw`);
  if (!(placement?.uniformScale > 0)) fail(`placement ${placement?.id ?? '?'} has invalid uniformScale`);
  if (!Number.isInteger(placement?.chunk?.cx) || !Number.isInteger(placement?.chunk?.cz)) fail(`placement ${placement?.id ?? '?'} has invalid chunk`);
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
  if (!position || !['x', 'y', 'z'].every(axis => Number.isFinite(position[axis]))) fail(`marker ${marker.id} has invalid position`);
}

if (!process.exitCode) {
  console.log(`[authored-region] PASS ${manifest.regionId}`);
  console.log(`[authored-region] ${manifest.placements.length} reusable placements, ${manifest.uniqueChunks.length} unique chunks, ${manifest.markers.length} gameplay markers`);
  console.log(`[authored-region] assets: ${Object.keys(manifest.assets ?? {}).join(', ') || 'none'}`);
}
