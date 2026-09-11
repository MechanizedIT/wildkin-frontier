// One local generated detail image enriches the baked terrain color map.
// It adds no GPU texture or per-frame work. Author previews use the same path.
export const TERRAIN_PAINT_CONFIG = Object.freeze({
  source: 'assets/environment/ground-paint.png', tileWorldSize: 12, opacity: .62,
});

let bitmap = null, requested = false;
const pending = new Set();

export function addGeneratedTerrainPaint(texture, canvas, bounds) {
  if (typeof Image === 'undefined') return;
  const paint = () => {
    const ctx = canvas.getContext('2d');
    const sx = canvas.width / (bounds.maxX - bounds.minX);
    const sz = canvas.height / (bounds.maxZ - bounds.minZ);
    const tileX = TERRAIN_PAINT_CONFIG.tileWorldSize * sx;
    const tileZ = TERRAIN_PAINT_CONFIG.tileWorldSize * sz;
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = TERRAIN_PAINT_CONFIG.opacity;
    for (let z = 0; z < canvas.height; z += tileZ) {
      for (let x = 0; x < canvas.width; x += tileX) ctx.drawImage(bitmap, x, z, tileX, tileZ);
    }
    ctx.restore();
    texture.userData.generatedGroundPaint = true;
    texture.needsUpdate = true;
  };
  if (bitmap) { paint(); return; }
  pending.add(paint);
  if (requested) return;
  requested = true;
  const image = new Image();
  image.onload = () => {
    bitmap = image;
    for (const apply of pending) apply();
    pending.clear();
  };
  // A failed local image keeps the existing playable color map intact.
  image.onerror = () => pending.clear();
  image.src = TERRAIN_PAINT_CONFIG.source;
}
