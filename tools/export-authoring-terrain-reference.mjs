#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sampleFrontier } from '../src/world/frontierTerrain.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const regionId = process.argv[2] ?? 'rootbound-wildwood';
const step = Number(process.argv.find(arg => arg.startsWith('--step='))?.split('=')[1] ?? 2);
const padding = Number(process.argv.find(arg => arg.startsWith('--padding='))?.split('=')[1] ?? 20);
if (!(step > 0) || !(padding >= 0)) throw new Error('Use positive --step and non-negative --padding');

const configPath = path.join(ROOT, 'authoring', 'regions', regionId + '.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const b = config.bounds;
if (!b) throw new Error('Region config has no bounds');

const x0 = Math.floor((b.minX - padding) / step) * step;
const z0 = Math.floor((b.minZ - padding) / step) * step;
const x1 = Math.ceil((b.maxX + padding) / step) * step;
const z1 = Math.ceil((b.maxZ + padding) / step) * step;
const nx = Math.round((x1 - x0) / step) + 1;
const nz = Math.round((z1 - z0) / step) + 1;

const currentHeights = new Array(nx * nz);
const baseHeights = new Array(nx * nz);
for (let iz = 0; iz < nz; iz += 1) {
  const z = z0 + iz * step;
  for (let ix = 0; ix < nx; ix += 1) {
    const x = x0 + ix * step;
    const i = iz * nx + ix;
    currentHeights[i] = Number(sampleFrontier(x, z).height.toFixed(5));
    baseHeights[i] = Number(sampleFrontier(x, z, { disableRootbound: true }).height.toFixed(5));
  }
}

const outDir = path.join(ROOT, 'authoring', 'reference');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, regionId + '-terrain-reference.json');
const payload = {
  schemaVersion: 1,
  regionId,
  source: 'sampleFrontier',
  note: 'currentHeights include current authored Rootbound code; baseHeights disable only the Rootbound structural profile',
  step,
  padding,
  x0,
  z0,
  nx,
  nz,
  bounds: b,
  currentHeights,
  baseHeights,
};
fs.writeFileSync(outPath, JSON.stringify(payload));
console.log('[authoring-terrain] wrote ' + path.relative(ROOT, outPath));
console.log('[authoring-terrain] ' + nx + ' x ' + nz + ' samples at ' + step + 'm spacing');
