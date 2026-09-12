import * as THREE from 'three';
import { createGroundFoliageGeometry } from '../presentation/groundFoliage.js';
import { createBakedGroundTexture } from '../presentation/terrainPaint.js';
import { createTerrainColorSampler } from '../presentation/authoredTerrain.js';
import { getSurfaceHeight } from './terrainSurfaceModel.js';
import {
  FRONTIER_TERRAIN_CONFIG,
  chunkKey,
  createFrontierChunk,
  isCampChunk,
  sampleFrontier,
} from './frontierTerrain.js';

const RADIUS = 2;
const HYSTERESIS = 8;
const FOLIAGE_COUNT = 96;

function hash(x, z, seed) {
  let value = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ seed;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function addFoliage(group, chunk, geometry, material, terrainOptions) {
  const grass = new THREE.InstancedMesh(geometry, material, FOLIAGE_COUNT);
  const dummy = new THREE.Object3D();
  for (let index = 0; index < FOLIAGE_COUNT; index++) {
    const x = hash(index, chunk.origin.z, 17) * FRONTIER_TERRAIN_CONFIG.chunkSize;
    const z = hash(index, chunk.origin.x, 61) * FRONTIER_TERRAIN_CONFIG.chunkSize;
    const worldX = chunk.origin.x + x, worldZ = chunk.origin.z + z;
    const scale = .38 + hash(index, chunk.origin.x + chunk.origin.z, 83) * .38;
    dummy.position.set(x, sampleFrontier(worldX, worldZ, terrainOptions).height, z);
    dummy.rotation.y = hash(index, chunk.origin.z, 29) * Math.PI * 2;
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    grass.setMatrixAt(index, dummy.matrix);
  }
  grass.instanceMatrix.needsUpdate = true;
  grass.name = 'frontier_groundcover';
  group.add(grass);
  return grass;
}

/** Owns only the bounded procedural terrain beyond the Camp landmark. */
export function createFrontierChunkRuntime({ parent, physicsWorld, campSurface } = {}) {
  const root = new THREE.Group();
  root.name = 'frontier_chunks';
  parent?.add(root);
  const foliageGeometry = createGroundFoliageGeometry({ grass: '#6d9f69' });
  const foliageMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false });
  const residents = new Map();
  const campColor = campSurface ? createTerrainColorSampler(campSurface) : null;
  const terrainOptions = campSurface ? {
    campHeight: (x, z) => getSurfaceHeight(campSurface, x, z),
    campColor: (x, z) => { const color = campColor(x, z); return [color.r, color.g, color.b]; },
  } : {};
  let center = null;
  let disposed = false;

  function createResident(cx, cz) {
    const chunk = createFrontierChunk(cx, cz, terrainOptions);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(chunk.vertices, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(chunk.normals, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(chunk.colors, 3));
    const uvs = new Float32Array(chunk.vertices.length / 3 * 2);
    for (let i = 0, uv = 0; i < chunk.vertices.length; i += 3, uv += 2) {
      uvs[uv] = chunk.vertices[i] / FRONTIER_TERRAIN_CONFIG.chunkSize;
      uvs[uv + 1] = chunk.vertices[i + 2] / FRONTIER_TERRAIN_CONFIG.chunkSize;
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(chunk.indices, 1));
    const group = new THREE.Group();
    group.name = `frontier_chunk_${chunk.id}`;
    group.position.set(chunk.origin.x, 0, chunk.origin.z);
    const bounds = { minX: chunk.origin.x, maxX: chunk.origin.x + FRONTIER_TERRAIN_CONFIG.chunkSize, minZ: chunk.origin.z, maxZ: chunk.origin.z + FRONTIER_TERRAIN_CONFIG.chunkSize };
    const texture = createBakedGroundTexture({
      bounds,
      colorAt: (x, z) => sampleFrontier(x, z, terrainOptions).groundColorRGB,
      phase: { x: chunk.origin.x - FRONTIER_TERRAIN_CONFIG.campBounds.minX, z: chunk.origin.z - FRONTIER_TERRAIN_CONFIG.campBounds.minZ },
    });
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0, flatShading: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'frontier_ground'; mesh.receiveShadow = true; mesh.userData.isGround = true;
    group.add(mesh);
    const foliage = addFoliage(group, chunk, foliageGeometry, foliageMaterial, terrainOptions);
    root.add(group);
    return { chunk, group, geometry, foliage, texture, material };
  }

  function clearResidents() {
    const remove = [...residents.keys()];
    if (remove.length) physicsWorld?.updateTerrainSurfaces({ remove });
    for (const resident of residents.values()) {
      root.remove(resident.group);
      resident.geometry.dispose();
      resident.foliage.dispose();
      resident.texture?.dispose();
      resident.material.dispose();
    }
    residents.clear(); center = null;
  }

  function shouldKeepCenter(position) {
    if (!center) return false;
    const originX = center.cx * FRONTIER_TERRAIN_CONFIG.chunkSize;
    const originZ = center.cz * FRONTIER_TERRAIN_CONFIG.chunkSize;
    return position.x >= originX - HYSTERESIS && position.x < originX + FRONTIER_TERRAIN_CONFIG.chunkSize + HYSTERESIS
      && position.z >= originZ - HYSTERESIS && position.z < originZ + FRONTIER_TERRAIN_CONFIG.chunkSize + HYSTERESIS;
  }

  function update(position = {}, { activeSectionId, authorMode = false } = {}) {
    if (disposed) return;
    const active = activeSectionId === 'camp' && !authorMode;
    root.visible = active;
    if (!active) { clearResidents(); return; }
    const x = Number.isFinite(position.x) ? position.x : 0;
    const z = Number.isFinite(position.z) ? position.z : 0;
    const nextCx = Math.floor(x / FRONTIER_TERRAIN_CONFIG.chunkSize);
    const nextCz = Math.floor(z / FRONTIER_TERRAIN_CONFIG.chunkSize);
    if (shouldKeepCenter(position)) return;
    const wanted = new Map();
    for (let cz = nextCz - RADIUS; cz <= nextCz + RADIUS; cz++) for (let cx = nextCx - RADIUS; cx <= nextCx + RADIUS; cx++) {
      if (!isCampChunk(cx, cz)) wanted.set(chunkKey(cx, cz), { cx, cz });
    }
    const add = [];
    for (const { cx, cz } of wanted.values()) if (!residents.has(chunkKey(cx, cz))) {
      const resident = createResident(cx, cz);
      residents.set(resident.chunk.id, resident); add.push({ ...resident.chunk, sectionId: 'camp' });
    }
    const remove = [];
    for (const [id, resident] of residents) if (!wanted.has(id)) {
      remove.push(id); root.remove(resident.group); resident.geometry.dispose(); resident.foliage.dispose(); resident.texture?.dispose(); resident.material.dispose(); residents.delete(id);
    }
    // The physics owner refreshes broadphase once for this complete lifecycle.
    if (add.length || remove.length) physicsWorld?.updateTerrainSurfaces({ add, remove });
    center = { cx: nextCx, cz: nextCz };
  }

  function getHeight(x, z) { return sampleFrontier(x, z, terrainOptions).height; }
  function getDebugState() { return { residentCount: residents.size, center: center && { ...center }, residentIds: [...residents.keys()] }; }
  function dispose() {
    if (disposed) return;
    clearResidents(); parent?.remove(root);
    foliageGeometry.dispose(); foliageMaterial.dispose(); disposed = true;
  }
  return { root, update, getHeight, getDebugState, dispose };
}
