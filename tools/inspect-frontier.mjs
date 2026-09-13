#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WORLD_DATA } from '../src/world/data/world.js';
import { createTerrainColorSampler } from '../src/presentation/authoredTerrain.js';
import { getSurfaceHeight } from '../src/world/terrainSurfaceModel.js';
import { FRONTIER_TERRAIN_CONFIG, sampleFrontier } from '../src/world/frontierTerrain.js';
import { sampleFrontierContinent } from '../src/world/frontierContinent.js';
import { DEFAULT_FRONTIER_WORLD, normalizeFrontierWorld } from '../src/world/frontierWorld.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = path.join(ROOT, '.dream-loop', 'frontier-inspector');
const DEFAULTS = Object.freeze({ centerX: 0, centerZ: -100, extentX: 300, extentZ: 300, resolution: 96 });
const OVERVIEW_DEFAULTS = Object.freeze({ centerX: -700, centerZ: -900, extentX: 8000, extentZ: 8000, resolution: 180 });
const LIMITS = Object.freeze({ minExtent: 50, maxExtent: 1600, minResolution: 24, maxResolution: 180 });
const OVERVIEW_LIMITS = Object.freeze({ minExtent: 1000, maxExtent: 8000, minResolution: 24, maxResolution: 180 });
const worldKey = world => `f${world.edition}_${world.seed.toString(16)}`;

function usage() {
  return `Usage: node tools/inspect-frontier.mjs [options]\n\n` +
    `  --overview             Bounded full-continent terrain/province overview (no life enumeration)\n` +
    `  --seed <uint32|0xhex>  World seed (default 0x${DEFAULT_FRONTIER_WORLD.seed.toString(16)})\n` +
    `  --center-x <number>    Map center X (local ${DEFAULTS.centerX}; overview ${OVERVIEW_DEFAULTS.centerX})\n` +
    `  --center-z <number>    Map center Z (local ${DEFAULTS.centerZ}; overview ${OVERVIEW_DEFAULTS.centerZ})\n` +
    `  --extent <metres>      Set both map dimensions (local ${DEFAULTS.extentX}; overview ${OVERVIEW_DEFAULTS.extentX})\n` +
    `  --extent-x <metres>    East/west dimension (overview maximum ${OVERVIEW_LIMITS.maxExtent})\n` +
    `  --extent-z <metres>    North/south dimension (overview maximum ${OVERVIEW_LIMITS.maxExtent})\n` +
    `  --resolution <cells>   Samples on the X axis, at most ${LIMITS.maxResolution}\n` +
    `  --output-dir <path>    Output directory (default .dream-loop/frontier-inspector)\n` +
    `  --help                 Show this help\n`;
}

function number(value, label) {
  const result = Number(value);
  if (!Number.isFinite(result)) throw new Error(`${label} must be a finite number`);
  return result;
}

function parseSeed(value) {
  const seed = /^0x[\da-f]+$/i.test(value) ? Number.parseInt(value.slice(2), 16) : Number(value);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('--seed must be a uint32 or 0x-prefixed hex value');
  return seed;
}

function parseArgs(argv) {
  const overview = argv.includes('--overview');
  const limits = overview ? OVERVIEW_LIMITS : LIMITS;
  const result = { ...(overview ? OVERVIEW_DEFAULTS : DEFAULTS), seed: DEFAULT_FRONTIER_WORLD.seed, overview, outputDir: OUTPUT_DIR };
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index];
    if (key === '--help') return { help: true };
    if (key === '--overview') continue;
    const value = argv[++index];
    if (value === undefined) throw new Error(`${key} needs a value`);
    if (key === '--seed') result.seed = parseSeed(value);
    else if (key === '--center-x') result.centerX = number(value, key);
    else if (key === '--center-z') result.centerZ = number(value, key);
    else if (key === '--extent') result.extentX = result.extentZ = number(value, key);
    else if (key === '--extent-x') result.extentX = number(value, key);
    else if (key === '--extent-z') result.extentZ = number(value, key);
    else if (key === '--resolution') result.resolution = number(value, key);
    else if (key === '--output-dir') result.outputDir = path.resolve(ROOT, value);
    else throw new Error(`unknown option ${key}`);
  }
  if (!Number.isInteger(result.resolution) || result.resolution < limits.minResolution || result.resolution > limits.maxResolution) {
    throw new Error(`--resolution must be an integer from ${limits.minResolution} to ${limits.maxResolution}`);
  }
  for (const key of ['extentX', 'extentZ']) if (result[key] < limits.minExtent || result[key] > limits.maxExtent) {
    throw new Error(`${key === 'extentX' ? '--extent-x' : '--extent-z'} must be from ${limits.minExtent} to ${limits.maxExtent}`);
  }
  return result;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function pngBuffer(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6;
  const rows = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(rows, y * (width * 4 + 1) + 1);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header), pngChunk('IDAT', zlib.deflateSync(rows, { level: 9 })), pngChunk('IEND', Buffer.alloc(0)),
  ]);
}
function pngDataUrl(width, height, rgba) { return `data:image/png;base64,${pngBuffer(width, height, rgba).toString('base64')}`; }

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
function ramp(stops, value) {
  value = clamp(value);
  const scaled = value * (stops.length - 1), index = Math.min(stops.length - 2, Math.floor(scaled)), t = scaled - index;
  return stops[index].map((channel, channelIndex) => Math.round(lerp(channel, stops[index + 1][channelIndex], t) * 255));
}
function rgbaGrid(values, colorFor) {
  const pixels = new Uint8Array(values.length * 4);
  for (let index = 0; index < values.length; index++) {
    const color = colorFor(values[index], index);
    pixels.set([color[0], color[1], color[2], 255], index * 4);
  }
  return pixels;
}
function summary(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((total, value) => total + value, 0);
  return { min: sorted[0], max: sorted.at(-1), mean: sum / values.length, p95: sorted[Math.floor((sorted.length - 1) * .95)] };
}
function rounded(value, places = 3) { return Number(value.toFixed(places)); }
function roundedSummary(values) { return Object.fromEntries(Object.entries(summary(values)).map(([key, value]) => [key, rounded(value)])); }
function counts(values, key) {
  return Object.fromEntries([...values.reduce((map, value) => map.set(key(value), (map.get(key(value)) ?? 0) + 1), new Map())].sort(([a], [b]) => a.localeCompare(b)));
}
function esc(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }

function scaleRgbaNearest(source, width, height, targetWidth, targetHeight) {
  const target = new Uint8Array(targetWidth * targetHeight * 4);
  for (let y = 0; y < targetHeight; y++) for (let x = 0; x < targetWidth; x++) {
    const sourceX = Math.min(width - 1, Math.floor(x * width / targetWidth));
    const sourceY = Math.min(height - 1, Math.floor(y * height / targetHeight));
    target.set(source.subarray((sourceY * width + sourceX) * 4, (sourceY * width + sourceX) * 4 + 4), (y * targetWidth + x) * 4);
  }
  return target;
}

function terrainOptionsFor(world) {
  const campRegion = (WORLD_DATA.regions ?? []).find(region => region?.id === 'camp');
  const campSurface = campRegion?.surface ?? null;
  const campPaint = campSurface ? createTerrainColorSampler(campSurface) : null;
  return {
    campSurface,
    terrainOptions: campSurface ? {
      world,
      campHeight: (x, z) => getSurfaceHeight(campSurface, x, z),
      campColor: (x, z) => { const color = campPaint(x, z); return [color.r, color.g, color.b]; },
    } : { world },
  };
}

function runOverview(config) {
  const world = normalizeFrontierWorld({ edition: DEFAULT_FRONTIER_WORLD.edition, seed: config.seed });
  const { terrainOptions, campSurface } = terrainOptionsFor(world);
  const minX = config.centerX - config.extentX / 2, maxX = config.centerX + config.extentX / 2;
  const minZ = config.centerZ - config.extentZ / 2, maxZ = config.centerZ + config.extentZ / 2;
  const width = config.resolution;
  const height = Math.max(OVERVIEW_LIMITS.minResolution, Math.round(width * config.extentZ / config.extentX));
  if (height > OVERVIEW_LIMITS.maxResolution) throw new Error(`derived Z resolution ${height} exceeds ${OVERVIEW_LIMITS.maxResolution}; reduce --resolution or the extent ratio`);

  const terrainPixels = new Uint8Array(width * height * 4);
  const provincePixels = new Uint8Array(width * height * 4);
  const coastDistances = [], elevations = [], provinceKinds = [], provinceInfluences = [];
  const landPoints = [], provinceWeights = { lush: [], sunscar: [], ironspine: [] };
  const coastKinds = [];
  const provinceColors = { lush: [.18, .62, .30], sunscar: [.90, .62, .30], ironspine: [.50, .57, .64] };
  for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
    const x = lerp(minX, maxX, (column + .5) / width), z = lerp(minZ, maxZ, (row + .5) / height);
    const continent = sampleFrontierContinent(x, z, { world });
    const terrain = sampleFrontier(x, z, terrainOptions);
    const index = row * width + column;
    coastDistances.push(continent.coastDistance); coastKinds.push(continent.kind);
    elevations.push(terrain.height); provinceKinds.push(terrain.provinceKind ?? 'reserved');
    provinceInfluences.push(terrain.provinceInfluence ?? 0);
    for (const kind of Object.keys(provinceWeights)) provinceWeights[kind].push(terrain.provinceWeights?.[kind] ?? 0);
    if (continent.land) landPoints.push({ x, z });

    let terrainColor;
    if (continent.land) terrainColor = (terrain.groundColorRGB ?? [.18, .43, .2]).map(channel => Math.round(clamp(channel) * 255));
    else {
      const shelf = clamp(1 - continent.waterDepth / 12);
      terrainColor = ramp([[.025, .09, .17], [.035, .22, .31], [.12, .39, .42]], shelf);
    }
    terrainPixels.set([...terrainColor, 255], index * 4);

    let provinceColor = terrainColor;
    if (continent.land) {
      const blend = Object.keys(provinceColors).map(kind => provinceColors[kind].map(channel => channel * (terrain.provinceWeights?.[kind] ?? 0)))
        .reduce((total, color) => total.map((channel, channelIndex) => channel + color[channelIndex]), [0, 0, 0]);
      const influence = terrain.provinceInfluence ?? 0;
      provinceColor = blend.map((channel, channelIndex) => Math.round(lerp([.16, .26, .20][channelIndex], channel, .18 + influence * .82) * 255));
    }
    provincePixels.set([...provinceColor, 255], index * 4);
  }

  const landBounds = landPoints.length ? {
    minX: rounded(Math.min(...landPoints.map(point => point.x))), maxX: rounded(Math.max(...landPoints.map(point => point.x))),
    minZ: rounded(Math.min(...landPoints.map(point => point.z))), maxZ: rounded(Math.max(...landPoints.map(point => point.z))),
  } : null;
  const sampleAreaKm2 = config.extentX / width * config.extentZ / height / 1_000_000;
  const landSamples = landPoints.length;
  const report = {
    format: 'living-frontier-continent-overview-v1',
    label: 'Current continent outline with three implemented terrain grammars; not ten completed habitats',
    world: { edition: world.edition, seed: world.seed, key: worldKey(world) },
    bounds: { minX, maxX, minZ, maxZ },
    sampling: {
      width, height, sampleCount: width * height, maxSamplesPerAxis: OVERVIEW_LIMITS.maxResolution,
      sourceOwners: ['frontierContinent', 'frontierTerrain', 'frontierRegion-via-terrain'],
      lifeEnumeration: false, campSurface: campSurface ? 'authored-world-registry' : 'flat-fallback', limits: OVERVIEW_LIMITS,
    },
    metrics: {
      approximateLandAreaKm2: rounded(landSamples * sampleAreaKm2),
      landSamples, waterSamples: width * height - landSamples, sampledLandBounds: landBounds,
      elevationMetres: roundedSummary(elevations), coastDistanceMetres: roundedSummary(coastDistances),
      coastKinds: counts(coastKinds, value => value),
      provinces: {
        implementedGrammars: ['lush', 'sunscar', 'ironspine'],
        dominantKindSamples: counts(provinceKinds, value => value), influence: roundedSummary(provinceInfluences),
        meanWeights: Object.fromEntries(Object.entries(provinceWeights).map(([kind, values]) => [kind, roundedSummary(values).mean])),
      },
    },
    grids: {
      coastDistance: coastDistances.map(value => rounded(value)), elevation: elevations.map(value => rounded(value)),
      province: { kind: provinceKinds, influence: provinceInfluences.map(value => rounded(value)),
        weights: Object.fromEntries(Object.entries(provinceWeights).map(([kind, values]) => [kind, values.map(value => rounded(value))])) },
    },
  };
  report.measurementSha256 = crypto.createHash('sha256').update(JSON.stringify({
    world: report.world, bounds: report.bounds, sampling: { width, height, sourceOwners: report.sampling.sourceOwners }, grids: report.grids,
  })).digest('hex');

  const targetWidth = 1080, targetHeight = Math.max(1, Math.round(targetWidth * height / width));
  const outputDir = config.outputDir;
  fs.mkdirSync(outputDir, { recursive: true });
  const pngPath = path.join(outputDir, 'continent-overview.png');
  fs.writeFileSync(pngPath, pngBuffer(targetWidth, targetHeight, scaleRgbaNearest(terrainPixels, width, height, targetWidth, targetHeight)));
  const mapWidth = 560, mapHeight = Math.round(mapWidth * height / width);
  const campX = (0 - minX) / (maxX - minX) * mapWidth, campY = (0 - minZ) / (maxZ - minZ) * mapHeight;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="${mapHeight + 190}" viewBox="0 0 1280 ${mapHeight + 190}">
<rect width="100%" height="100%" fill="#0b1518"/><style>text{font-family:system-ui,-apple-system,Segoe UI,sans-serif}.title{fill:#f5efd9;font-size:30px;font-weight:700}.meta{fill:#9fb7b2;font-size:15px}.panel{fill:#f5efd9;font-size:20px;font-weight:700}.frame{fill:none;stroke:#87aaa6;stroke-width:1}.camp{fill:#ffe09b;stroke:#382f20;stroke-width:2}.key{fill:#c6d4cf;font-size:13px}</style>
<text x="60" y="48" class="title">Living Frontier · bounded continent overview</text>
<text x="60" y="76" class="meta">${esc(worldKey(world))} · ${width}×${height} samples · ${rounded(config.extentX / 1000, 1)}×${rounded(config.extentZ / 1000, 1)} km bounds · continent/terrain/province only</text>
<text x="60" y="100" class="meta">Current three terrain grammars: Lush, Sunscar, Ironspine. This does not depict ten completed habitats.</text>
<text x="60" y="137" class="panel">Terrain and coast</text><text x="660" y="137" class="panel">Province grammar blend</text>
<image x="60" y="155" width="${mapWidth}" height="${mapHeight}" image-rendering="pixelated" href="${pngDataUrl(width, height, terrainPixels)}"/><rect x="60" y="155" width="${mapWidth}" height="${mapHeight}" class="frame"/>
<image x="660" y="155" width="${mapWidth}" height="${mapHeight}" image-rendering="pixelated" href="${pngDataUrl(width, height, provincePixels)}"/><rect x="660" y="155" width="${mapWidth}" height="${mapHeight}" class="frame"/>
<circle cx="${60 + campX}" cy="${155 + campY}" r="6" class="camp"/><circle cx="${660 + campX}" cy="${155 + campY}" r="6" class="camp"/><text x="${72 + campX}" y="${159 + campY}" class="key">Camp</text>
</svg>\n`;
  const svgPath = path.join(outputDir, 'continent-overview.svg');
  const jsonPath = path.join(outputDir, 'continent-overview.json');
  fs.writeFileSync(svgPath, svg); fs.writeFileSync(jsonPath, `${JSON.stringify(report)}\n`);
  console.log(`[frontier-inspector] wrote ${path.relative(ROOT, pngPath)} (${Math.round(fs.statSync(pngPath).size / 1024)} KiB)`);
  console.log(`[frontier-inspector] wrote ${path.relative(ROOT, svgPath)} (${Math.round(Buffer.byteLength(svg) / 1024)} KiB)`);
  console.log(`[frontier-inspector] wrote ${path.relative(ROOT, jsonPath)} (${Math.round(Buffer.byteLength(JSON.stringify(report)) / 1024)} KiB)`);
  console.log(`[frontier-inspector] overview ${worldKey(world)} ${width}x${height}, ~${report.metrics.approximateLandAreaKm2} km² sampled land, three terrain grammars, no life enumeration`);
}

async function main() {
  const config = parseArgs(process.argv.slice(2));
  if (config.help) { process.stdout.write(usage()); return; }
  if (config.overview) { runOverview(config); return; }
  const world = normalizeFrontierWorld({ edition: DEFAULT_FRONTIER_WORLD.edition, seed: config.seed });
  const { terrainOptions, campSurface } = terrainOptionsFor(world);
  const minX = config.centerX - config.extentX / 2, maxX = config.centerX + config.extentX / 2;
  const minZ = config.centerZ - config.extentZ / 2, maxZ = config.centerZ + config.extentZ / 2;
  const width = config.resolution, height = Math.max(LIMITS.minResolution, Math.round(config.resolution * config.extentZ / config.extentX));
  if (height > LIMITS.maxResolution) throw new Error(`derived Z resolution ${height} exceeds ${LIMITS.maxResolution}; reduce --resolution or the extent ratio`);
  const elevations = [], wetlands = [], slopes = [], terrainColors = [];
  const provinceIds = [], provinceKinds = [], provinceInfluences = [];
  const provinceWeights = { lush: [], sunscar: [], ironspine: [] };
  const heightAt = (x, z) => sampleFrontier(x, z, terrainOptions).height;
  for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
    const x = lerp(minX, maxX, (column + .5) / width), z = lerp(minZ, maxZ, (row + .5) / height);
    const sample = sampleFrontier(x, z, terrainOptions), step = .8;
    const slope = Math.hypot((heightAt(x + step, z) - heightAt(x - step, z)) / (step * 2), (heightAt(x, z + step) - heightAt(x, z - step)) / (step * 2));
    elevations.push(sample.height); wetlands.push(sample.habitatBlend.wetland); slopes.push(slope); terrainColors.push(sample.groundColorRGB);
    provinceIds.push(sample.provinceId ?? null); provinceKinds.push(sample.provinceKind ?? 'reserved'); provinceInfluences.push(sample.provinceInfluence ?? 0);
    for (const kind of Object.keys(provinceWeights)) provinceWeights[kind].push(sample.provinceWeights?.[kind] ?? 0);
  }

  // The full-continent overview returns before detailed local-life owners are
  // loaded. The local inspector preserves its existing complete view.
  const [{ sampleFrontierForageChunk }, { sampleFrontierWildlifeChunk }, { sampleFrontierSceneryChunk }] = await Promise.all([
    import('../src/world/frontierEcology.js'), import('../src/world/frontierWildlife.js'), import('../src/world/frontierScenery.js'),
  ]);
  const forage = [], wildlife = [], scenery = [], size = FRONTIER_TERRAIN_CONFIG.chunkSize;
  for (let cz = Math.floor(minZ / size); cz <= Math.floor((maxZ - Number.EPSILON) / size); cz++) {
    for (let cx = Math.floor(minX / size); cx <= Math.floor((maxX - Number.EPSILON) / size); cx++) {
      const options = { world, terrainOptions, visualAssets: WORLD_DATA.visualAssets ?? [], getHeight: heightAt, getTerrainSample: (x, z) => sampleFrontier(x, z, terrainOptions) };
      forage.push(...sampleFrontierForageChunk(cx, cz, options));
      wildlife.push(...sampleFrontierWildlifeChunk(cx, cz, options));
      scenery.push(...sampleFrontierSceneryChunk(cx, cz, options));
    }
  }
  const inside = (x, z) => x >= minX && x <= maxX && z >= minZ && z <= maxZ;
  const visibleForage = forage.filter(item => inside(item.pos.x, item.pos.z));
  const visibleWildlife = wildlife.filter(item => inside(item.homePos.x, item.homePos.z));
  const visibleScenery = scenery.filter(item => inside(item.x, item.z));

  const elevationStats = summary(elevations), slopeStats = summary(slopes);
  const elevationPixels = rgbaGrid(elevations, value => ramp([[.04,.11,.17],[.10,.31,.34],[.35,.53,.28],[.72,.69,.40],[.93,.88,.70]], (value - elevationStats.min) / Math.max(.001, elevationStats.max - elevationStats.min)));
  const wetlandPixels = rgbaGrid(wetlands, value => ramp([[.30,.25,.13],[.39,.50,.24],[.18,.53,.49],[.08,.27,.48]], value));
  const slopePixels = rgbaGrid(slopes, value => ramp([[.10,.22,.16],[.40,.63,.27],[.93,.73,.22],[.84,.27,.15],[.36,.08,.14]], clamp(value / Math.max(.5, slopeStats.p95))));
  const terrainPixels = rgbaGrid(terrainColors, value => value.map(channel => Math.round(clamp(channel) * 255)));
  const provinceColors = { lush: [.18,.62,.30], sunscar: [.90,.62,.30], ironspine: [.50,.57,.64] };
  const provincePixels = rgbaGrid(provinceKinds, (_kind, index) => {
    const blend = Object.keys(provinceColors).map(kind => provinceColors[kind].map(channel => channel * provinceWeights[kind][index]))
      .reduce((total, color) => total.map((channel, channelIndex) => channel + color[channelIndex]), [0, 0, 0]);
    const influence = provinceInfluences[index];
    return blend.map((channel, channelIndex) => Math.round(lerp([.08,.12,.14][channelIndex], channel, .18 + influence * .82) * 255));
  });
  const influenceStops = [[.08,.12,.14],[.18,.28,.31],[.32,.58,.48],[.86,.77,.40]];
  const influencePixels = rgbaGrid(provinceInfluences, value => ramp(influenceStops, value));

  const page = { width: 1280, height: 2160, panelX: [70, 660], panelY: [190, 850, 1510], plot: 520 };
  const topLegendY = page.panelY[0] + page.plot + 40;
  const bottomLegendY = page.panelY[1] + page.plot + 60;
  const mapX = x => (x - minX) / (maxX - minX) * page.plot;
  const mapY = z => (z - minZ) / (maxZ - minZ) * page.plot;
  function overlay(panelX, panelY) {
    const output = [`<g transform="translate(${panelX} ${panelY})">`];
    for (let x = Math.ceil(minX / size) * size; x <= maxX; x += size) output.push(`<path d="M${mapX(x)} 0V${page.plot}" class="grid"/>`);
    for (let z = Math.ceil(minZ / size) * size; z <= maxZ; z += size) output.push(`<path d="M0 ${mapY(z)}H${page.plot}" class="grid"/>`);
    const camp = FRONTIER_TERRAIN_CONFIG.campBounds;
    const x1 = mapX(Math.max(minX, camp.minX)), x2 = mapX(Math.min(maxX, camp.maxX));
    const y1 = mapY(Math.max(minZ, camp.minZ)), y2 = mapY(Math.min(maxZ, camp.maxZ));
    if (x2 >= 0 && x1 <= page.plot && y2 >= 0 && y1 <= page.plot) output.push(`<rect x="${x1}" y="${y1}" width="${x2-x1}" height="${y2-y1}" class="camp"/><text x="${x1+7}" y="${y1+18}" class="camp-label">CAMP</text>`);
    output.push(`<path d="M${page.plot-25} 38V8m0 0-7 12m7-12 7 12" class="north"/><text x="${page.plot-25}" y="56" class="north-label">N</text>`);
    output.push(`<text x="0" y="${page.plot+24}" class="coord">x ${rounded(minX,1)}</text><text x="${page.plot}" y="${page.plot+24}" text-anchor="end" class="coord">x ${rounded(maxX,1)}</text>`);
    output.push(`<text x="-10" y="12" text-anchor="end" class="coord">z ${rounded(minZ,1)}</text><text x="-10" y="${page.plot}" text-anchor="end" class="coord">z ${rounded(maxZ,1)}</text></g>`);
    return output.join('');
  }
  function contours(panelX, panelY) {
    const lines = [], stepX = page.plot / width, stepY = page.plot / height, interval = 2;
    const band = value => Math.floor(value / interval);
    for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
      const index = row * width + column;
      if (column && band(elevations[index]) !== band(elevations[index - 1])) lines.push(`M${column*stepX} ${row*stepY}v${stepY}`);
      if (row && band(elevations[index]) !== band(elevations[index - width])) lines.push(`M${column*stepX} ${row*stepY}h${stepX}`);
    }
    return `<path transform="translate(${panelX} ${panelY})" d="${lines.join('')}" class="contour"/>`;
  }
  function legend(x, y, colors, left, right) {
    const id = `legend-${x}-${y}`;
    return `<defs><linearGradient id="${id}">${colors.map((color, index) => `<stop offset="${index/(colors.length-1)*100}%" stop-color="rgb(${color.map(v=>Math.round(v*255)).join(' ')})"/>`).join('')}</linearGradient></defs>` +
      `<rect x="${x}" y="${y}" width="220" height="10" rx="5" fill="url(#${id})"/><text x="${x}" y="${y+25}" class="legend">${esc(left)}</text><text x="${x+220}" y="${y+25}" text-anchor="end" class="legend">${esc(right)}</text>`;
  }
  function panel(index, title, subtitle, pixels, extra = '') {
    const x = page.panelX[index % 2], y = page.panelY[Math.floor(index / 2)];
    return `<g><text x="${x}" y="${y-48}" class="panel-title">${esc(title)}</text><text x="${x}" y="${y-25}" class="panel-subtitle">${esc(subtitle)}</text>` +
      `<image x="${x}" y="${y}" width="${page.plot}" height="${page.plot}" preserveAspectRatio="none" image-rendering="pixelated" href="${pngDataUrl(width,height,pixels)}"/>${extra}${overlay(x,y)}</g>`;
  }
  function placementMarks(panelX, panelY) {
    const result = [`<g transform="translate(${panelX} ${panelY})">`];
    for (const item of visibleScenery) {
      const x = mapX(item.x), y = mapY(item.z), canopy = item.kind === 'canopy';
      result.push(canopy ? `<path d="M${x-4} ${y-4}l8 8m0-8-8 8" class="scenery-canopy"/>` : `<circle cx="${x}" cy="${y}" r="2" class="scenery-low"/>`);
    }
    for (const item of visibleForage) {
      const x = mapX(item.pos.x), y = mapY(item.pos.z), kind = item.visualAsset?.id ?? item.type;
      result.push(`<circle cx="${x}" cy="${y}" r="4" class="forage forage-${esc(kind)}"><title>${esc(kind)} ${esc(item.id)}</title></circle>`);
    }
    for (const item of visibleWildlife) {
      const x = mapX(item.homePos.x), y = mapY(item.homePos.z);
      result.push(`<path d="M${x} ${y-7}l6 11h-12z" class="wildlife wildlife-${esc(item.speciesTag)}"><title>${esc(item.speciesTag)} ${esc(item.originId)}</title></path>`);
    }
    result.push('</g>'); return result.join('');
  }

  const elevStops = [[.04,.11,.17],[.10,.31,.34],[.35,.53,.28],[.72,.69,.40],[.93,.88,.70]];
  const wetStops = [[.30,.25,.13],[.39,.50,.24],[.18,.53,.49],[.08,.27,.48]];
  const slopeStops = [[.10,.22,.16],[.40,.63,.27],[.93,.73,.22],[.84,.27,.15],[.36,.08,.14]];
  const placementX = page.panelX[1], placementY = page.panelY[1];
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${page.width}" height="${page.height}" viewBox="0 0 ${page.width} ${page.height}">
<rect width="100%" height="100%" fill="#0b1518"/><style>
text{font-family:system-ui,-apple-system,Segoe UI,sans-serif}.title{fill:#f5efd9;font-size:30px;font-weight:700}.meta{fill:#9fb7b2;font-size:15px}.panel-title{fill:#f5efd9;font-size:22px;font-weight:700}.panel-subtitle,.legend,.coord{fill:#a9c0bc;font-size:13px}.grid{stroke:#e7f3e8;stroke-opacity:.19;stroke-width:1}.camp{fill:none;stroke:#ffe09b;stroke-width:3}.camp-label{fill:#ffe09b;font-size:12px;font-weight:800}.north{stroke:#fff4d1;stroke-width:2;fill:none}.north-label{fill:#fff4d1;text-anchor:middle;font-size:13px;font-weight:800}.contour{stroke:#f7f2d0;stroke-opacity:.38;stroke-width:.65;fill:none}.scenery-canopy{stroke:#d3f090;stroke-width:2}.scenery-low{fill:#b5e69c;stroke:#173a2d;stroke-width:1}.forage{fill:#f4c76d;stroke:#1a2020;stroke-width:1.2}.forage-tree{fill:#60c277}.forage-rock,.forage-asset_iron_ore_rock{fill:#aeb5bd}.forage-asset_crystal{fill:#69e7ee}.wildlife{fill:#ff7b62;stroke:#241318;stroke-width:1.2}.wildlife-tidefin{fill:#55d6d0}.wildlife-emberhorn{fill:#ff754e}.wildlife-mossling{fill:#b8df68}.key{fill:#c6d4cf;font-size:13px}
</style>
<text x="70" y="55" class="title">Living Frontier · seeded world inspector</text>
<text x="70" y="84" class="meta">${esc(worldKey(world))} · bounds x ${rounded(minX,1)}…${rounded(maxX,1)}, z ${rounded(minZ,1)}…${rounded(maxZ,1)} · ${width}×${height} samples · ${campSurface ? 'authored Camp surface' : 'flat Camp fallback'}</text>
<text x="70" y="108" class="meta">All six views share one descriptor, terrain sampler and map bounds. Province views expose planning metadata; they do not reveal the player's unknown atlas.</text>
${panel(0,'Elevation',`range ${rounded(elevationStats.min)}–${rounded(elevationStats.max)} m · 2 m contour bands`,elevationPixels,contours(page.panelX[0],page.panelY[0]))}
${legend(370,topLegendY,elevStops,`${rounded(elevationStats.min)} m`,`${rounded(elevationStats.max)} m`)}
${panel(1,'Province grammar blend',`${new Set(provinceIds.filter(Boolean)).size} dominant province ids · dim areas preserve authored terrain`,provincePixels)}
<g transform="translate(700 ${topLegendY+4})"><rect width="14" height="14" rx="3" fill="rgb(46 158 77)"/><text x="22" y="12" class="key">lush</text><rect x="90" width="14" height="14" rx="3" fill="rgb(230 158 77)"/><text x="112" y="12" class="key">Sunscar</text><rect x="214" width="14" height="14" rx="3" fill="rgb(128 145 163)"/><text x="236" y="12" class="key">Ironspine</text><text x="350" y="12" class="key">mixed color = ecotone weights</text></g>
${panel(2,'Local slope',`rise/run · mean ${rounded(slopeStats.mean)} · p95 ${rounded(slopeStats.p95)}`,slopePixels)}
${legend(370,bottomLegendY,slopeStops,'level',`≥ ${rounded(Math.max(.5,slopeStats.p95))}`)}
${panel(3,'Terrain + generated candidates',`${visibleForage.length} forage · ${visibleWildlife.length} wildlife · ${visibleScenery.length} scenery`,terrainPixels,placementMarks(placementX,placementY))}
<g transform="translate(660 ${bottomLegendY+10})"><circle cx="5" cy="0" r="4" class="forage"/><text x="16" y="5" class="key">forage</text><path d="M105 -7l6 11h-12z" class="wildlife"/><text x="118" y="5" class="key">wildlife</text><path d="M210 -4l8 8m0-8-8 8" class="scenery-canopy"/><text x="232" y="5" class="key">canopy</text><circle cx="324" cy="0" r="2" class="scenery-low"/><text x="334" y="5" class="key">low scenery</text></g>
${panel(4,'Wetland habitat weight',`mean ${roundedSummary(wetlands).mean} · current terrain habitat blend`,wetlandPixels)}
${legend(370,page.panelY[2]+page.plot+40,wetStops,'0 dry/upland','1 wetland')}
${panel(5,'Province influence',`mean ${roundedSummary(provinceInfluences).mean} · protected authored envelope fades from 0 to 1`,influencePixels)}
${legend(960,page.panelY[2]+page.plot+40,influenceStops,'0 authored reserve','1 regional terrain')}
</svg>\n`;

  const report = {
    format: 'living-frontier-inspector-v1',
    generatedAt: new Date().toISOString(),
    world: { edition: world.edition, seed: world.seed, key: worldKey(world) },
    bounds: { minX, maxX, minZ, maxZ },
    sampling: { width, height, slopeStep: .8, campSurface: campSurface ? 'authored-world-registry' : 'flat-fallback', limits: LIMITS },
    metrics: {
      elevationMetres: roundedSummary(elevations), wetlandWeight: roundedSummary(wetlands), slopeRiseRun: roundedSummary(slopes),
      provinces: {
        dominantKindSamples: counts(provinceKinds, value => value),
        dominantProvinceIds: new Set(provinceIds.filter(Boolean)).size,
        influence: roundedSummary(provinceInfluences),
        meanWeights: Object.fromEntries(Object.entries(provinceWeights).map(([kind, values]) => [kind, roundedSummary(values).mean])),
      },
    },
    counts: {
      forage: { total: visibleForage.length, byType: counts(visibleForage, item => item.visualAsset?.id ?? item.type) },
      wildlife: { total: visibleWildlife.length, bySpecies: counts(visibleWildlife, item => item.speciesTag) },
      scenery: { total: visibleScenery.length, byKind: counts(visibleScenery, item => item.kind), byAsset: counts(visibleScenery, item => item.assetId) },
    },
    placements: {
      forage: visibleForage.map(item => ({ id: item.id, kind: item.visualAsset?.id ?? item.type, x: rounded(item.pos.x), y: rounded(item.pos.y), z: rounded(item.pos.z) })),
      wildlife: visibleWildlife.map(item => ({ id: item.originId, species: item.speciesTag, x: rounded(item.homePos.x), y: rounded(item.homePos.y), z: rounded(item.homePos.z) })),
      scenery: visibleScenery.map(item => ({ id: item.id, kind: item.kind, asset: item.assetId, x: rounded(item.x), y: rounded(item.y), z: rounded(item.z) })),
    },
    grids: {
      elevation: elevations.map(value => rounded(value)), wetland: wetlands.map(value => rounded(value)), slope: slopes.map(value => rounded(value)),
      province: {
        id: provinceIds, kind: provinceKinds, influence: provinceInfluences.map(value => rounded(value)),
        weights: Object.fromEntries(Object.entries(provinceWeights).map(([kind, values]) => [kind, values.map(value => rounded(value))])),
      },
    },
  };
  const stableMeasurement = JSON.stringify({ world: report.world, bounds: report.bounds, sampling: { width, height, slopeStep: .8 }, grids: report.grids, placements: report.placements });
  report.measurementSha256 = crypto.createHash('sha256').update(stableMeasurement).digest('hex');
  fs.mkdirSync(config.outputDir, { recursive: true });
  const svgPath = path.join(config.outputDir, 'frontier-inspector.svg'), jsonPath = path.join(config.outputDir, 'frontier-inspector.json');
  fs.writeFileSync(svgPath, svg);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report)}\n`);
  console.log(`[frontier-inspector] wrote ${path.relative(ROOT, svgPath)} (${Math.round(Buffer.byteLength(svg)/1024)} KiB)`);
  console.log(`[frontier-inspector] wrote ${path.relative(ROOT, jsonPath)} (${Math.round(Buffer.byteLength(JSON.stringify(report))/1024)} KiB)`);
  console.log(`[frontier-inspector] ${report.world.key} ${width}x${height}, elevation ${report.metrics.elevationMetres.min}..${report.metrics.elevationMetres.max}m, ${visibleForage.length}/${visibleWildlife.length}/${visibleScenery.length} forage/wildlife/scenery`);
}

try { await main(); }
catch (error) { console.error(`[frontier-inspector] ${error.message}`); process.exitCode = 1; }
