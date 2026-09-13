import { sampleFrontier } from '../world/frontierTerrain.js';

export const ATLAS_CELL_SIZE = 10;
export const ATLAS_MAX_VISIBLE_CHUNKS = 64;

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const EMPTY_ATLAS = Object.freeze({ chunks: Object.freeze({}) });

export function frontierAtlasColor(sample) {
  const [r = .12, g = .24, b = .19] = sample?.groundColorRGB ?? [];
  const height = sample?.height ?? 4;
  // Preserve the original starter-ground curve exactly through its 0.16 cap
  // at 4.48m, then retain readable contrast across the taller provinces.
  const legacyLift = clamp(height / 28, 0, .16);
  const provinceLift = clamp((height - 4.48) / (84 - 4.48), 0, 1) * .12;
  const channel = value => Math.round(clamp(value + legacyLift + provinceLift, 0, 1) * 255);
  return `rgb(${channel(r)},${channel(g)},${channel(b)})`;
}

// This only walks chunks that can be displayed. Persisted coverage can grow without
// turning a map repaint into a whole-world scan.
export function collectVisibleAtlasCells(atlas, view, limit = ATLAS_MAX_VISIBLE_CHUNKS) {
  const chunks = atlas?.chunks ?? {};
  const minX = view.centerX - view.width / 2, maxX = view.centerX + view.width / 2;
  const minZ = view.centerZ - view.height / 2, maxZ = view.centerZ + view.height / 2;
  const result = [];
  const lowX = Math.floor(minX / 50), highX = Math.floor(maxX / 50);
  const lowZ = Math.floor(minZ / 50), highZ = Math.floor(maxZ / 50);
  const visibleHighX = Math.ceil(maxX / 50) - 1, visibleHighZ = Math.ceil(maxZ / 50) - 1;
  // The UI caps full-map world span at 300m, so even fractional viewport edges
  // yield at most 7×7 keys. Direct lookup avoids a scan of historic coverage.
  for (let cz = lowZ; cz <= visibleHighZ && result.length < limit; cz++) for (let cx = lowX; cx <= visibleHighX && result.length < limit; cx++) {
    const mask = chunks[`f1:a:${cx}:${cz}`];
    if (Number.isInteger(mask) && mask) result.push({ cx, cz, mask });
  }
  return result;
}

const rasterCache = new WeakMap();
function terrainTile(atlas, chunk, getTerrainSample) {
  let cache = rasterCache.get(atlas);
  if (!cache || cache.sampler !== getTerrainSample) { cache = { sampler: getTerrainSample, tiles: new Map() }; rasterCache.set(atlas, cache); }
  const key = `f1:a:${chunk.cx}:${chunk.cz}`;
  const previous = cache.tiles.get(key);
  if (previous?.mask === chunk.mask) return previous.colors;
  const colors = new Array(25);
  for (let z = 0; z < 5; z++) for (let x = 0; x < 5; x++) {
    const bit = z * 5 + x;
    if (!(chunk.mask & (1 << bit))) continue;
    const worldX = chunk.cx * 50 + x * ATLAS_CELL_SIZE, worldZ = chunk.cz * 50 + z * ATLAS_CELL_SIZE;
    // Sampling happens only for cells admitted by the personal survey mask.
    colors[bit] = frontierAtlasColor(getTerrainSample(worldX + 5, worldZ + 5) ?? sampleFrontier(worldX + 5, worldZ + 5));
  }
  if (cache.tiles.size >= ATLAS_MAX_VISIBLE_CHUNKS) cache.tiles.delete(cache.tiles.keys().next().value);
  cache.tiles.set(key, { mask: chunk.mask, colors });
  return colors;
}

function triangle(ctx, x, y, yaw, size, fill, stroke) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(yaw);
  ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * .72, size); ctx.lineTo(-size * .72, size); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke(); ctx.restore();
}

function label(ctx, text, x, y, size, fill = '#fff5df') {
  if (!ctx.fillText) return;
  ctx.save(); ctx.font = `900 ${size}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, size * .26); ctx.strokeStyle = '#062531'; ctx.strokeText?.(text, x, y); ctx.fillStyle = fill; ctx.fillText(text, x, y); ctx.restore();
}

function campBearing(ctx, x, y, width, height, pixelRatio) {
  const pad = 15 * pixelRatio, centerX = width / 2, centerY = height / 2;
  const factor = Math.min(1, Math.min((width / 2 - pad) / Math.abs(x - centerX || 1), (height / 2 - pad) / Math.abs(y - centerY || 1)));
  const edgeX = centerX + (x - centerX) * factor, edgeY = centerY + (y - centerY) * factor;
  triangle(ctx, edgeX, edgeY, Math.atan2(edgeY - centerY, edgeX - centerX) + Math.PI / 2, 7 * pixelRatio, '#ffc654', '#062531');
  label(ctx, 'CAMP', edgeX, edgeY + 13 * pixelRatio, 8 * pixelRatio, '#ffd76d');
}

// Controller yaw 0 faces world +Z; an unrotated canvas marker points map north
// (world -Z), while canvas +Y is world +Z.
export function playerYawToAtlasAngle(playerYaw = 0) {
  return Math.PI - (Number(playerYaw) || 0);
}

export function drawFrontierAtlas(ctx, { width, height, atlas, centerX, centerZ, metersPerPixel, player, playerYaw = 0, camp, getTerrainSample = sampleFrontier, showGrid = true, pixelRatio = 1 } = {}) {
  if (!ctx || !width || !height) return { chunks: 0, cells: 0 };
  const safeScale = Math.max(.03, Number(metersPerPixel) || .2);
  const view = { centerX: Number(centerX) || 0, centerZ: Number(centerZ) || 0, width: width * safeScale, height: height * safeScale };
  const toScreen = (x, z) => ({ x: width / 2 + (x - view.centerX) / safeScale, y: height / 2 + (z - view.centerZ) / safeScale });
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#082c3a'; ctx.fillRect(0, 0, width, height);
  if (showGrid) {
    const grid = 10 / safeScale;
    if (grid >= 7) {
      const origin = toScreen(0, 0); ctx.strokeStyle = '#185161'; ctx.lineWidth = 1;
      for (let x = ((origin.x % grid) + grid) % grid; x < width; x += grid) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
      for (let y = ((origin.y % grid) + grid) % grid; y < height; y += grid) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    }
  }
  const atlasState = atlas && typeof atlas === 'object' ? atlas : EMPTY_ATLAS;
  const chunks = collectVisibleAtlasCells(atlasState, view);
  let cells = 0;
  for (const chunk of chunks) {
    const colors = terrainTile(atlasState, chunk, getTerrainSample);
    for (let z = 0; z < 5; z++) for (let x = 0; x < 5; x++) {
    const bit = z * 5 + x;
    if (!(chunk.mask & (1 << bit))) continue;
    const worldX = chunk.cx * 50 + x * ATLAS_CELL_SIZE, worldZ = chunk.cz * 50 + z * ATLAS_CELL_SIZE;
    const p = toScreen(worldX, worldZ), size = ATLAS_CELL_SIZE / safeScale;
    ctx.fillStyle = colors[bit];
    ctx.fillRect(p.x - .25, p.y - .25, size + .5, size + .5); cells++;
    ctx.strokeStyle = '#b9e2c130'; ctx.lineWidth = 1; ctx.strokeRect?.(p.x, p.y, size, size);
    }
  }
  if (camp && Number.isFinite(camp.x) && Number.isFinite(camp.z)) {
    const p = toScreen(camp.x, camp.z);
    const marker = 10 * pixelRatio;
    if (p.x > -24 * pixelRatio && p.x < width + 24 * pixelRatio && p.y > -24 * pixelRatio && p.y < height + 24 * pixelRatio) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.fillStyle = '#ffc654'; ctx.strokeStyle = '#102b3a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-marker, -1); ctx.lineTo(0, -marker); ctx.lineTo(marker, -1); ctx.lineTo(marker * .72, -1); ctx.lineTo(marker * .72, marker); ctx.lineTo(-marker * .72, marker); ctx.lineTo(-marker * .72, -1); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      label(ctx, 'Camp', p.x, p.y + 18 * pixelRatio, 9 * pixelRatio, '#ffd76d');
    } else campBearing(ctx, p.x, p.y, width, height, pixelRatio);
  }
  if (player && Number.isFinite(player.x) && Number.isFinite(player.z)) {
    const p = toScreen(player.x, player.z);
    const marker = clamp(11 * pixelRatio, 10, 22);
    ctx.save(); ctx.beginPath(); ctx.arc?.(p.x, p.y, marker * 1.1, 0, Math.PI * 2); ctx.fillStyle = '#072d3bd9'; ctx.fill(); ctx.lineWidth = 2 * pixelRatio; ctx.strokeStyle = '#b5fff4'; ctx.stroke(); ctx.restore();
    triangle(ctx, p.x, p.y, playerYawToAtlasAngle(playerYaw), marker, '#4be0d4', '#062531');
    label(ctx, 'You', p.x, p.y + 22 * pixelRatio, 9 * pixelRatio, '#d5fff6');
  }
  return { chunks: chunks.length, cells };
}
