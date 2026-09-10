// src/presentation/terrainSurface.js — cached, calm ground variation for authored terrain meshes.
import * as THREE from "three";

// One broad repeat over a normal section. The texture is explicitly tileable so
// neighboring authored ground patches share the same detail at their boundary.
const DETAIL_WORLD_SIZE = 64;
let sharedTerrainTexture = null;

function hash2(x, y, seed = 0) {
  let value = Math.imul(x + 374761393, 668265263) ^ Math.imul(y + 127412617, 224682251) ^ seed;
  value = Math.imul(value ^ (value >>> 13), 127412617);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function smooth(value) { return value * value * (3 - 2 * value); }

function valueNoise(x, y, scale, period) {
  const sx = x / scale, sy = y / scale;
  const x0 = Math.floor(sx), y0 = Math.floor(sy);
  const tx = smooth(sx - x0), ty = smooth(sy - y0);
  const wrap = (v) => ((v % period) + period) % period;
  const a = hash2(wrap(x0), wrap(y0)), b = hash2(wrap(x0 + 1), wrap(y0)), c = hash2(wrap(x0), wrap(y0 + 1)), d = hash2(wrap(x0 + 1), wrap(y0 + 1));
  return (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
}

export function getTerrainDetailTexture() {
  if (sharedTerrainTexture) return sharedTerrainTexture;
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // Fine, low-contrast pressed-earth variation; deliberately no broad
      // cells, pixel flecks, or marks that could read as a checkerboard.
      const soft = valueNoise(x + 31, y - 17, 8, 16) - 0.5;
      const shade = 0.985 + soft * 0.012;
      const channel = Math.max(0, Math.min(255, Math.round(shade * 255)));
      const index = (y * size + x) * 4;
      data[index] = channel;
      data[index + 1] = channel;
      data[index + 2] = channel;
      data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  sharedTerrainTexture = texture;
  return texture;
}

function wrapUnit(value) { return ((value % 1) + 1) % 1; }

// The image storage is shared; each material gets only a lightweight texture
// transform so UV frequency follows authored world dimensions rather than mesh scale.
export function applyTerrainSurface(root, { width, depth, position = { x: 0, z: 0 } } = {}) {
  if (!root || !Number.isFinite(width) || !Number.isFinite(depth)) return;
  const source = getTerrainDetailTexture();
  root.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    const hadMaterialArray = Array.isArray(object.material);
    const materials = hadMaterialArray ? object.material : [object.material];
    const nextMaterials = materials.map((base) => {
      const material = base.clone();
      const map = source.clone();
      map.wrapS = THREE.RepeatWrapping;
      map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(width / DETAIL_WORLD_SIZE, depth / DETAIL_WORLD_SIZE);
      map.offset.set(wrapUnit(((position.x ?? 0) - width / 2) / DETAIL_WORLD_SIZE), wrapUnit(((position.z ?? 0) - depth / 2) / DETAIL_WORLD_SIZE));
      map.needsUpdate = true;
      material.map = map;
      material.roughness = Math.max(material.roughness ?? 0.8, 0.88);
      material.needsUpdate = true;
      return material;
    });
    object.material = hadMaterialArray ? nextMaterials : nextMaterials[0];
  });
}
