import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { FRONTIER_CONTINENT_CONFIG, createFrontierContinentSampler } from '../../../src/world/frontierContinent.js';
import { sampleFrontier } from '../../../src/world/frontierTerrain.js';
import { DEFAULT_FRONTIER_WORLD } from '../../../src/world/frontierWorld.js';

const WIDTH = 900, HEIGHT = 1200;
const MAP = { x: 70, y: 142, width: 760, height: 870 };
const TRACE_POINTS = 1440, TRACE_RADIUS = 2400, GRID_STEP = 40;
const sampler = createFrontierContinentSampler(DEFAULT_FRONTIER_WORLD);
const center = FRONTIER_CONTINENT_CONFIG.center;

const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[character]);
const fixed = value => Number(value).toFixed(2).replace(/\.00$/, '');
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function boundaryRadius(angle) {
  let land = 0, ocean = TRACE_RADIUS;
  for (let iteration = 0; iteration < 42; iteration += 1) {
    const radius = (land + ocean) / 2;
    const sample = sampler(center.x + Math.cos(angle) * radius, center.z + Math.sin(angle) * radius);
    if (sample.land) land = radius; else ocean = radius;
  }
  return (land + ocean) / 2;
}

const radialTrace = Array.from({ length: TRACE_POINTS }, (_, index) => {
  const angle = index * Math.PI * 2 / TRACE_POINTS;
  return { angle, radius: boundaryRadius(angle) };
});
const outlineWorld = radialTrace.map(({ angle, radius }) => ({
  x: center.x + Math.cos(angle) * radius,
  z: center.z + Math.sin(angle) * radius,
}));
const extent = outlineWorld.reduce((value, point) => ({
  minX: Math.min(value.minX, point.x), maxX: Math.max(value.maxX, point.x),
  minZ: Math.min(value.minZ, point.z), maxZ: Math.max(value.maxZ, point.z),
}), { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity });
const padding = 55;
const worldBounds = {
  minX: extent.minX - padding, maxX: extent.maxX + padding,
  minZ: extent.minZ - padding, maxZ: extent.maxZ + padding,
};
const scale = Math.min(MAP.width / (worldBounds.maxX - worldBounds.minX), MAP.height / (worldBounds.maxZ - worldBounds.minZ));
const drawnWidth = (worldBounds.maxX - worldBounds.minX) * scale;
const drawnHeight = (worldBounds.maxZ - worldBounds.minZ) * scale;
const originX = MAP.x + (MAP.width - drawnWidth) / 2;
const originY = MAP.y + (MAP.height - drawnHeight) / 2;
const project = ({ x, z }) => ({
  x: originX + (x - worldBounds.minX) * scale,
  y: originY + (z - worldBounds.minZ) * scale,
});
const pathFor = offset => radialTrace.map(({ angle, radius }, index) => {
  const point = project({
    x: center.x + Math.cos(angle) * (radius + offset),
    z: center.z + Math.sin(angle) * (radius + offset),
  });
  return `${index ? 'L' : 'M'}${fixed(point.x)},${fixed(point.y)}`;
}).join(' ') + ' Z';
const landPath = pathFor(0), shallowPath = pathFor(12), shelfPath = pathFor(32);

const regionTotals = new Map();
const cells = [];
for (let z = Math.floor(extent.minZ / GRID_STEP) * GRID_STEP; z < extent.maxZ; z += GRID_STEP) {
  for (let x = Math.floor(extent.minX / GRID_STEP) * GRID_STEP; x < extent.maxX; x += GRID_STEP) {
    const terrain = sampleFrontier(x + GRID_STEP / 2, z + GRID_STEP / 2, { world: DEFAULT_FRONTIER_WORLD });
    const [rawR, rawG, rawB] = terrain.groundColorRGB;
    const relief = .88 + clamp(terrain.height / 84, 0, 1) * .22;
    const rgb = [rawR, rawG, rawB].map(channel => Math.round(clamp(channel * relief, 0, 1) * 255));
    const topLeft = project({ x, z });
    cells.push(`<rect x="${fixed(topLeft.x)}" y="${fixed(topLeft.y)}" width="${fixed(GRID_STEP * scale + .35)}" height="${fixed(GRID_STEP * scale + .35)}" fill="rgb(${rgb.join(',')})"/>`);
    if (terrain.land && terrain.provinceKind) {
      const total = regionTotals.get(terrain.provinceKind) ?? { r: 0, g: 0, b: 0, count: 0 };
      total.r += rgb[0]; total.g += rgb[1]; total.b += rgb[2]; total.count += 1;
      regionTotals.set(terrain.provinceKind, total);
    }
  }
}

const averageColor = kind => {
  const total = regionTotals.get(kind);
  return total ? `rgb(${Math.round(total.r / total.count)},${Math.round(total.g / total.count)},${Math.round(total.b / total.count)})` : '#777';
};

const anchors = [
  { number: 1, name: 'Camp', x: 0, z: 2 },
  { number: 2, name: 'Skybreak crown', x: 12, z: -228 },
  { number: 3, name: 'Signal Cache', x: 170, z: 50 },
  { number: 4, name: 'Sunscar cleft', x: -317, z: 83 },
  { number: 5, name: 'East-coast R2 witness', x: 332.889, z: 100.049 },
].map(anchor => ({ ...anchor, screen: project(anchor), terrain: sampleFrontier(anchor.x, anchor.z, { world: DEFAULT_FRONTIER_WORLD }) }));

const markerSvg = anchors.map(anchor => `
  <g class="marker" transform="translate(${fixed(anchor.screen.x)} ${fixed(anchor.screen.y)})" aria-label="${escape(anchor.name)} at ${anchor.x}, ${anchor.z}">
    <circle r="12"/><text y="6" text-anchor="middle">${anchor.number}</text>
  </g>`).join('');
const anchorRows = anchors.map((anchor, index) => {
  const column = index < 3 ? 0 : 1, row = index < 3 ? index : index - 3;
  const x = column ? 472 : 86, y = 1080 + row * 38;
  return `<g transform="translate(${x} ${y})"><circle class="key-dot" cx="0" cy="-6" r="11"/><text class="key-number" x="0" y="0" text-anchor="middle">${anchor.number}</text><text class="key-label" x="20" y="0">${escape(anchor.name)} <tspan class="coords">(${anchor.x}, ${anchor.z})</tspan></text></g>`;
}).join('');

const gridLines = [];
for (let x = Math.ceil(extent.minX / 500) * 500; x <= extent.maxX; x += 500) {
  const a = project({ x, z: worldBounds.minZ }), b = project({ x, z: worldBounds.maxZ });
  gridLines.push(`<line x1="${fixed(a.x)}" y1="${fixed(a.y)}" x2="${fixed(b.x)}" y2="${fixed(b.y)}"/>`);
}
for (let z = Math.ceil(extent.minZ / 500) * 500; z <= extent.maxZ; z += 500) {
  const a = project({ x: worldBounds.minX, z }), b = project({ x: worldBounds.maxX, z });
  gridLines.push(`<line x1="${fixed(a.x)}" y1="${fixed(a.y)}" x2="${fixed(b.x)}" y2="${fixed(b.y)}"/>`);
}
const scaleBarMeters = 500, scaleBarPixels = scaleBarMeters * scale;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200" role="img" aria-labelledby="title description">
  <title id="title">Wildkin seeded continent diagnostic overview</title>
  <desc id="description">Development-only vector overview sampled from world seed 1327115068, edition 1. It shows the exact irregular continent outline, three current regional terrain grammars, shallow coastal shelves, and five known anchors.</desc>
  <defs>
    <clipPath id="land-clip"><path d="${landPath}"/></clipPath>
    <clipPath id="map-clip"><rect x="${MAP.x}" y="${MAP.y}" width="${MAP.width}" height="${MAP.height}" rx="12"/></clipPath>
    <filter id="marker-shadow" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity=".45"/></filter>
  </defs>
  <style>
    text { font-family: Inter, ui-sans-serif, system-ui, sans-serif; fill: #eafff8; }
    .eyebrow { font-size: 15px; font-weight: 700; letter-spacing: 2.1px; fill: #76e6d4; }
    .title { font-size: 29px; font-weight: 750; letter-spacing: .4px; }
    .subtitle { font-size: 14px; fill: #b8d7d4; }
    .frame { fill: #082d3a; stroke: #347783; stroke-width: 2; }
    .grid { stroke: #c5f4ec; stroke-opacity: .10; stroke-width: 1; }
    .coast { fill: none; stroke: #f3dfb5; stroke-width: 2.2; stroke-linejoin: round; }
    .marker circle, .key-dot { fill: #072f3d; stroke: #ffca62; stroke-width: 2.3; filter: url(#marker-shadow); }
    .marker text, .key-number { font-size: 14px; font-weight: 800; fill: #fff4c7; }
    .key-label { font-size: 16px; font-weight: 650; }
    .coords { fill: #9fc4c2; font-weight: 500; }
    .legend-label { font-size: 14px; fill: #d7eeeb; }
    .map-note { font-size: 13px; fill: #c1ddda; }
    .scale { stroke: #f3f7e9; stroke-width: 4; }
  </style>
  <rect width="900" height="1200" fill="#071f2a"/>
  <text class="eyebrow" x="70" y="38">DIAGNOSTIC OVERVIEW</text>
  <text class="title" x="70" y="72">Seeded continent · edition 1</text>
  <text class="subtitle" x="70" y="99">Unrevealed geography shown for development — this is not the player’s atlas.</text>
  <g transform="translate(550 34)">
    <rect x="0" y="0" width="16" height="16" rx="3" fill="${averageColor('lush')}"/><text class="legend-label" x="23" y="14">Lush</text>
    <rect x="94" y="0" width="16" height="16" rx="3" fill="${averageColor('sunscar')}"/><text class="legend-label" x="117" y="14">Sunscar</text>
    <rect x="0" y="29" width="16" height="16" rx="3" fill="${averageColor('ironspine')}"/><text class="legend-label" x="23" y="43">Ironspine</text>
    <text class="map-note" x="94" y="42">3 actual regional grammars</text>
  </g>
  <rect class="frame" x="${MAP.x}" y="${MAP.y}" width="${MAP.width}" height="${MAP.height}" rx="12"/>
  <g clip-path="url(#map-clip)">
    <path d="${shelfPath}" fill="#176477"/>
    <path d="${shallowPath}" fill="#2c9697"/>
    <path d="${landPath}" fill="#63765a"/>
    <g clip-path="url(#land-clip)" shape-rendering="crispEdges">${cells.join('')}</g>
    <g class="grid">${gridLines.join('')}</g>
    <path class="coast" d="${landPath}"/>
    ${markerSvg}
    <g transform="translate(${MAP.x + 28} ${MAP.y + 804})">
      <line class="scale" x1="0" y1="0" x2="${fixed(scaleBarPixels)}" y2="0"/>
      <line class="scale" x1="0" y1="-7" x2="0" y2="7"/><line class="scale" x1="${fixed(scaleBarPixels)}" y1="-7" x2="${fixed(scaleBarPixels)}" y2="7"/>
      <text class="map-note" x="${fixed(scaleBarPixels / 2)}" y="24" text-anchor="middle">500 m</text>
    </g>
    <g transform="translate(${MAP.x + MAP.width - 42} ${MAP.y + 48})">
      <path d="M0,-26 L10,4 L0,-2 L-10,4 Z" fill="#f4e5bb"/><text x="0" y="25" text-anchor="middle" font-size="15" font-weight="750">N</text>
    </g>
    <text class="map-note" x="${MAP.x + 24}" y="${MAP.y + 32}">deep ocean</text>
    <text class="map-note" x="${MAP.x + 24}" y="${MAP.y + 53}" fill="#82d7d2">32 m shelf · 12 m shallow band</text>
  </g>
  <text class="map-note" x="70" y="1038">Sampler trace: 1,440 radial coast points (0.25°) · terrain cells: ${GRID_STEP} m · north is −Z</text>
  <text class="map-note" x="830" y="1038" text-anchor="end">seed 1327115068 · edition 1</text>
  ${anchorRows}
  <text class="subtitle" x="70" y="1180">Surface color and relief come from the current pure terrain sampler; markers show development witnesses, not travel promises.</text>
</svg>`;

const output = fileURLToPath(new URL('./continent-overview.svg', import.meta.url));
writeFileSync(output, svg.split('\n').map(line => line.trimEnd()).join('\n'));
console.log(`Wrote ${output} (${Buffer.byteLength(svg).toLocaleString()} bytes)`);
