import * as THREE from 'three';
import { createGroundFoliageGeometry } from '../presentation/groundFoliage.js';
import { createBakedGroundTexture } from '../presentation/terrainPaint.js';
import { createTerrainColorSampler } from '../presentation/authoredTerrain.js';
import { getSurfaceHeight } from './terrainSurfaceModel.js';
import { createFrontierLandformVisual } from './frontierLandformVisual.js';
import { DEFAULT_FRONTIER_WORLD, frontierDomainSeed, normalizeFrontierWorld } from './frontierWorld.js';
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

// Cliff faces use their height for stone shading. XZ ground UVs collapse to a
// narrow strip on a vertical face and otherwise stretch grass into a wall.
function separateCliffFaces(geometry, chunk) {
  const ground = [], cliff = [], v = chunk.vertices;
  for (let i = 0; i < chunk.indices.length; i += 3) {
    const ids = [chunk.indices[i], chunk.indices[i + 1], chunk.indices[i + 2]];
    const [a, b, c] = ids.map(id => id * 3);
    const ax = v[b] - v[a], ay = v[b + 1] - v[a + 1], az = v[b + 2] - v[a + 2];
    const bx = v[c] - v[a], by = v[c + 1] - v[a + 1], bz = v[c + 2] - v[a + 2];
    const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const steep = Math.abs(ny) / (Math.hypot(nx, ny, nz) || 1) < .38;
    (steep ? cliff : ground).push(...ids);
  }
  if (!cliff.length) return null;
  const colors = geometry.getAttribute('color');
  for (const id of new Set(cliff)) {
    const y = v[id * 3 + 1], x = v[id * 3], z = v[id * 3 + 2];
    const shade = .24 + .055 * Math.sin(y * 6.5 + x * .65) + .025 * Math.sin(z * 3 + x * 4);
    colors.setXYZ(id, shade * 1.06, shade * 1.04, shade * .94);
  }
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array([...ground, ...cliff]), 1));
  geometry.addGroup(0, ground.length, 0);
  geometry.addGroup(ground.length, cliff.length, 1);
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, flatShading: true });
}

function hash(x, z, seed) {
  let value = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ seed;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function addFoliage(group, chunk, geometry, material, terrainOptions, world) {
  const grass = new THREE.InstancedMesh(geometry, material, FOLIAGE_COUNT);
  const dummy = new THREE.Object3D();
  const positionXSeed = frontierDomainSeed(world, 'terrain-foliage', 17);
  const positionZSeed = frontierDomainSeed(world, 'terrain-foliage', 61);
  const scaleSeed = frontierDomainSeed(world, 'terrain-foliage', 83);
  const yawSeed = frontierDomainSeed(world, 'terrain-foliage', 29);
  const shelfFronds = chunk.id === '0,-3' ? [
    [28.5,-125],[30,-125],[35.5,-125],[38.5,-125],[41,-125],
    [27,-121.8],[29,-121.8],[37,-121.8],[40.5,-121.8],
    [28,-135],[40.5,-138],[28,-143],[38,-143],
  ] : [];
  for (let index = 0; index < FOLIAGE_COUNT; index++) {
    const frond = shelfFronds[index];
    const x = frond ? frond[0] - chunk.origin.x : hash(index, chunk.origin.z, positionXSeed) * FRONTIER_TERRAIN_CONFIG.chunkSize;
    const z = frond ? frond[1] - chunk.origin.z : hash(index, chunk.origin.x, positionZSeed) * FRONTIER_TERRAIN_CONFIG.chunkSize;
    const worldX = chunk.origin.x + x, worldZ = chunk.origin.z + z;
    const scale = (frond ? 1.12 : .38) + hash(index, chunk.origin.x + chunk.origin.z, scaleSeed) * .38;
    dummy.position.set(x, sampleFrontier(worldX, worldZ, terrainOptions).height, z);
    dummy.rotation.y = hash(index, chunk.origin.z, yawSeed) * Math.PI * 2;
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
export function createFrontierChunkRuntime({ parent, physicsWorld, campSurface, visualAssets = [], world = DEFAULT_FRONTIER_WORLD } = {}) {
  const worldDescriptor = normalizeFrontierWorld(world);
  const root = new THREE.Group();
  root.name = 'frontier_chunks';
  parent?.add(root);
  const foliageGeometry = createGroundFoliageGeometry({ grass: '#6d9f69' });
  const foliageMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false });
  const residents = new Map();
  const campColor = campSurface ? createTerrainColorSampler(campSurface) : null;
  const terrainOptions = campSurface ? {
    world: worldDescriptor,
    campHeight: (x, z) => getSurfaceHeight(campSurface, x, z),
    campColor: (x, z) => { const color = campColor(x, z); return [color.r, color.g, color.b]; },
  } : { world: worldDescriptor };
  let center = null;
  let residencySnapshot = { center: null, chunks: [] };
  let disposed = false;

  function refreshResidencySnapshot() {
    const chunks = [...residents.values()].map(({ chunk }) => Object.freeze({
        id: chunk.id,
        cx: Math.floor(chunk.origin.x / FRONTIER_TERRAIN_CONFIG.chunkSize),
        cz: Math.floor(chunk.origin.z / FRONTIER_TERRAIN_CONFIG.chunkSize),
        origin: Object.freeze({ ...chunk.origin }),
      }));
    residencySnapshot = Object.freeze({ center: center && Object.freeze({ ...center }), chunks: Object.freeze(chunks) });
  }

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
    const stoneMaterial = separateCliffFaces(geometry, chunk);
    const mesh = new THREE.Mesh(geometry, stoneMaterial ? [material, stoneMaterial] : material);
    mesh.name = 'frontier_ground'; mesh.receiveShadow = true; mesh.userData.isGround = true;
    group.add(mesh);
    const foliage = addFoliage(group, chunk, foliageGeometry, foliageMaterial, terrainOptions, worldDescriptor);
    const landform = createFrontierLandformVisual({ cx, cz, visualAssets, getHeight });
    group.add(landform.group);
    root.add(group);
    return { chunk, group, geometry, foliage, texture, material, stoneMaterial, landform };
  }

  function clearResidents() {
    if (!residents.size && center === null) return;
    const remove = [...residents.values()].flatMap(resident => [resident.chunk.id, ...resident.landform.terrainSurfaces.map(surface => surface.id)]);
    if (remove.length) physicsWorld?.updateTerrainSurfaces({ remove });
    for (const resident of residents.values()) {
      root.remove(resident.group);
      resident.geometry.dispose();
      resident.foliage.dispose();
      resident.texture?.dispose();
      resident.material.dispose();
      resident.stoneMaterial?.dispose();
      resident.landform.dispose();
    }
    residents.clear(); center = null; refreshResidencySnapshot();
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
      residents.set(resident.chunk.id, resident); add.push({ ...resident.chunk, sectionId: 'camp' }, ...resident.landform.terrainSurfaces);
    }
    const remove = [];
    for (const [id, resident] of residents) if (!wanted.has(id)) {
      remove.push(id, ...resident.landform.terrainSurfaces.map(surface => surface.id));
      root.remove(resident.group); resident.geometry.dispose(); resident.foliage.dispose(); resident.texture?.dispose(); resident.material.dispose(); resident.stoneMaterial?.dispose(); resident.landform.dispose(); residents.delete(id);
    }
    // The physics owner refreshes broadphase once for this complete lifecycle.
    if (add.length || remove.length) physicsWorld?.updateTerrainSurfaces({ add, remove });
    center = { cx: nextCx, cz: nextCz }; refreshResidencySnapshot();
  }

  function sample(x, z) { return sampleFrontier(x, z, terrainOptions); }
  function getHeight(x, z) { return sample(x, z).height; }
  // Stable lifecycle snapshot for nearby resident owners. It changes only when
  // the terrain residency does, and never exposes a gameplay mutation path.
  function getResidency() {
    return residencySnapshot;
  }
  function getWorldDescriptor() { return worldDescriptor; }
  function getDebugState() { return { residentCount: residents.size, center: center && { ...center }, residentIds: [...residents.keys()] }; }
  function dispose() {
    if (disposed) return;
    clearResidents(); parent?.remove(root);
    foliageGeometry.dispose(); foliageMaterial.dispose(); disposed = true;
  }
  return { root, update, sample, getHeight, getResidency, getWorldDescriptor, getDebugState, dispose };
}
