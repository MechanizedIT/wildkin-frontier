// One local generated detail image enriches the baked terrain color map.
// It adds no GPU texture or per-frame work. Author previews use the same path.
export const TERRAIN_PAINT_CONFIG = Object.freeze({
  source: 'assets/environment/ground-paint.png', tileWorldSize: 12, opacity: .62,
});

let bitmap = null, requested = false;
const pending = new Set();

export function addGeneratedTerrainPaint(texture, canvas, bounds, phase = { x: 0, z: 0 }) {
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
    const offsetX = (((phase.x ?? 0) % TERRAIN_PAINT_CONFIG.tileWorldSize) + TERRAIN_PAINT_CONFIG.tileWorldSize) % TERRAIN_PAINT_CONFIG.tileWorldSize * sx;
    const offsetZ = (((phase.z ?? 0) % TERRAIN_PAINT_CONFIG.tileWorldSize) + TERRAIN_PAINT_CONFIG.tileWorldSize) % TERRAIN_PAINT_CONFIG.tileWorldSize * sz;
    for (let z = -offsetZ; z < canvas.height; z += tileZ) {
      for (let x = -offsetX; x < canvas.width; x += tileX) ctx.drawImage(bitmap, x, z, tileX, tileZ);
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

// Generated chunks bake their linear terrain colours into an sRGB canvas just
// like authoredTerrain. The optional phase makes the existing ground-paint
// overlay continuous when separate chunk canvases meet.
export function createBakedGroundTexture({ bounds, colorAt, resolution = 128, phase } = {}) {
  if (typeof document === 'undefined' || typeof colorAt !== 'function') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = resolution;
  const pixels = new Uint8ClampedArray(resolution * resolution * 4);
  const color = new THREE.Color();
  const width = bounds.maxX - bounds.minX, depth = bounds.maxZ - bounds.minZ;
  for (let z = 0; z < resolution; z++) for (let x = 0; x < resolution; x++) {
    const rgb = colorAt(bounds.minX + (x + .5) / resolution * width, bounds.minZ + (z + .5) / resolution * depth);
    color.setRGB(rgb[0], rgb[1], rgb[2]).convertLinearToSRGB();
    const index = (z * resolution + x) * 4;
    pixels[index] = Math.round(color.r * 255); pixels[index + 1] = Math.round(color.g * 255); pixels[index + 2] = Math.round(color.b * 255); pixels[index + 3] = 255;
  }
  canvas.getContext('2d').putImageData(new ImageData(pixels, resolution, resolution), 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false; texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  addGeneratedTerrainPaint(texture, canvas, bounds, phase);
  return texture;
}
import * as THREE from 'three';
