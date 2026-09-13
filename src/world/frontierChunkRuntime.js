import * as THREE from 'three';
import { createGroundFoliageGeometry } from '../presentation/groundFoliage.js';
import { createBakedGroundTexture } from '../presentation/terrainPaint.js';
import { createTerrainColorSampler } from '../presentation/authoredTerrain.js';
import { getSurfaceHeight } from './terrainSurfaceModel.js';
import { createFrontierLandformVisual } from './frontierLandformVisual.js';
import { isSkybreakArea } from './frontierLandform.js';
import { createFrontierRegionSampler } from './frontierRegion.js';
import { createFrontierTextureColorSampler } from './frontierTextureColor.js';
import { sampleFrontierForageChunk } from './frontierEcology.js';
import { hasFootprintSupport } from './frontierPlacement.js';
import { DEFAULT_FRONTIER_WORLD, frontierDomainSeed, normalizeFrontierWorld } from './frontierWorld.js';
import { createFrontierContinentSampler, sampleFrontierWater, hasFrontierLandFootprint } from './frontierContinent.js';
import {
  FRONTIER_TERRAIN_CONFIG,
  chunkKey,
  createFrontierChunk,
  isCampChunk,
  sampleFrontier,
  sampleFrontierHeight,
} from './frontierTerrain.js';

export const FRONTIER_CHUNK_STREAMING_CONFIG = Object.freeze({
  radius: 2,
  hysteresis: 8,
  preloadDistance: 12,
  maxPrepared: 9,
  motionEpsilon: .001,
});
const RADIUS = FRONTIER_CHUNK_STREAMING_CONFIG.radius;
const HYSTERESIS = FRONTIER_CHUNK_STREAMING_CONFIG.hysteresis;
const FOLIAGE_COUNT = 96;
const FOLIAGE_XZ_RADIUS = .6678251760362262;
const FORAGE_FOOTPRINT_RADIUS = Object.freeze({ tree: 1.35, rock: .9, fiber: .55 });
const FORAGE_ASSET_FOOTPRINT_RADIUS = Object.freeze({
  asset_berry_bush: 1.29,
  asset_crystal: 1.3,
  asset_iron_ore_rock: .93,
});

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
    const skybreak = isSkybreakArea(x + chunk.origin.x, z + chunk.origin.z);
    const shade = skybreak
      ? .40 + .06 * Math.sin(y * .68 + (x + chunk.origin.x) * .08 + (z + chunk.origin.z) * .06)
        + .035 * Math.sin((x + chunk.origin.x) * .4 - (z + chunk.origin.z) * .29)
      : .24 + .055 * Math.sin(y * 6.5 + x * .65) + .025 * Math.sin(z * 3 + x * 4);
    colors.setXYZ(id, shade * (skybreak ? 1.17 : 1.06), shade * (skybreak ? 1 : 1.04), shade * (skybreak ? .72 : .94));
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

function addFoliage(group, chunk, geometry, material, terrainOptions, world, visualAssets) {
  const grass = new THREE.InstancedMesh(geometry, material, FOLIAGE_COUNT);
  const dummy = new THREE.Object3D();
  const positionXSeed = frontierDomainSeed(world, 'terrain-foliage', 17);
  const positionZSeed = frontierDomainSeed(world, 'terrain-foliage', 61);
  const scaleSeed = frontierDomainSeed(world, 'terrain-foliage', 83);
  const yawSeed = frontierDomainSeed(world, 'terrain-foliage', 29);
  const densitySeed = frontierDomainSeed(world, 'terrain-foliage', 113);
  const tint = new THREE.Color();
  const getHeight = (x, z) => sampleFrontier(x, z, terrainOptions).height;
  let regionalForage = null;
  function hasRegionalForageClearance(x, z, scale) {
    if (!regionalForage) {
      regionalForage = [];
      const cx = Math.floor(chunk.origin.x / FRONTIER_TERRAIN_CONFIG.chunkSize);
      const cz = Math.floor(chunk.origin.z / FRONTIER_TERRAIN_CONFIG.chunkSize);
      for (let fz = cz - 1; fz <= cz + 1; fz += 1) for (let fx = cx - 1; fx <= cx + 1; fx += 1) {
        regionalForage.push(...sampleFrontierForageChunk(fx, fz, {
          getHeight,
          getTerrainSample: (sx, sz) => sampleFrontier(sx, sz, terrainOptions),
          terrainOptions,
          visualAssets,
          world,
        }));
      }
    }
    const foliageRadius = FOLIAGE_XZ_RADIUS * scale;
    return regionalForage.every(resource => {
      const assetId = resource.visualAsset?.id;
      const baseRadius = FORAGE_ASSET_FOOTPRINT_RADIUS[assetId] ?? FORAGE_FOOTPRINT_RADIUS[resource.type] ?? 0;
      const resourceRadius = baseRadius * (Number.isFinite(resource.uniformScale) ? resource.uniformScale : 1);
      return Math.hypot(x - resource.pos.x, z - resource.pos.z) >= foliageRadius + resourceRadius;
    });
  }
  let liveCount = 0;
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
    const sample = sampleFrontier(worldX, worldZ, terrainOptions);
    if (sample.contentLand === false || (sample.coastDistance < 40
      && !hasFrontierLandFootprint(worldX, worldZ, { radius: .45, continentSampler: terrainOptions.continentSampler }))) continue;
    const influence = Math.max(0, Math.min(1, sample.provinceInfluence ?? 0));
    const lush = influence * (sample.provinceWeights?.lush ?? 0);
    const dry = influence * (sample.provinceWeights?.sunscar ?? 0);
    const high = influence * (sample.provinceWeights?.ironspine ?? 0);
    if (influence > 0 && hash(index, chunk.origin.x + chunk.origin.z, densitySeed) > 1 - dry * .92 - high * .65) continue;
    const skybreak = isSkybreakArea(worldX, worldZ, .45);
    if (skybreak
      && !hasFootprintSupport(worldX, worldZ, { getHeight, radius: .45, maxSlope: .65 })) continue;
    const scaleRoll = hash(index, chunk.origin.x + chunk.origin.z, scaleSeed);
    const protectedScale = influence <= 0 || sample.coastDistance < 40 || skybreak;
    const legacyScale = .38 + scaleRoll * .38;
    const scale = frond
      ? 1.12 + scaleRoll * .38
      : protectedScale
        ? legacyScale
        : legacyScale + influence * (.24 + scaleRoll * .08) + lush * .16 - dry * .03;
    // Sample the local 3x3 forage neighborhood once for this chunk, then let
    // the build-local array go with the resident construction. Camp/reserve,
    // coast and authored Skybreak foliage retain their accepted placement.
    if (influence === 1 && sample.coastDistance >= 40 && !skybreak
      && !hasRegionalForageClearance(worldX, worldZ, scale)) continue;
    dummy.position.set(x, sample.height, z);
    dummy.rotation.y = hash(index, chunk.origin.z, yawSeed) * Math.PI * 2;
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    grass.setMatrixAt(liveCount, dummy.matrix);
    // Multiply the existing vertex palette; white keeps the starter exact.
    // Warm red gain turns the shared green geometry into dry straw without
    // another mesh/material/draw or a separately generated vegetation field.
    tint.setRGB(1 + dry * 1.8 - high * .2, 1 + dry * .1 - high * .16, 1 - dry * .3 + high * .1);
    // The Caldera shares this bounded foliage mesh, but its surviving tufts
    // should read as scorched straw rather than the inherited green upland.
    const caldera = Math.max(0, Math.min(1, sample.calderaWeight ?? 0));
    tint.r += (1.45 - tint.r) * caldera;
    tint.g += (.48 - tint.g) * caldera;
    tint.b += (.4 - tint.b) * caldera;
    // Fungal soil keeps low living tufts in the same bounded instance owner.
    const fungal = Math.max(0, Math.min(1, sample.fungalWeight ?? 0));
    tint.r += (.65 - tint.r) * fungal;
    tint.g += (.72 - tint.g) * fungal;
    tint.b += (.92 - tint.b) * fungal;
    grass.setColorAt(liveCount++, tint);
  }
  grass.count = liveCount;
  grass.instanceMatrix.needsUpdate = true;
  if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
  grass.name = 'frontier_groundcover';
  group.add(grass);
  return grass;
}

/** Owns only the bounded procedural terrain beyond the Camp landmark. */
export function createFrontierChunkRuntime({ parent, physicsWorld, campSurface, visualAssets = [], world = DEFAULT_FRONTIER_WORLD } = {}) {
  const worldDescriptor = normalizeFrontierWorld(world);
  const regionSampler = createFrontierRegionSampler(worldDescriptor);
  const continentSampler = createFrontierContinentSampler(worldDescriptor);
  const root = new THREE.Group();
  root.name = 'frontier_chunks';
  parent?.add(root);
  const foliageGeometry = createGroundFoliageGeometry({ grass: '#6d9f69' });
  const foliageMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false });
  let residents = new Map();
  const prepared = new Map();
  const campColor = campSurface ? createTerrainColorSampler(campSurface) : null;
  const terrainOptions = campSurface ? {
    world: worldDescriptor,
    regionSampler,
    continentSampler,
    campHeight: (x, z) => getSurfaceHeight(campSurface, x, z),
    campColor: (x, z) => { const color = campColor(x, z); return [color.r, color.g, color.b]; },
  } : { world: worldDescriptor, regionSampler, continentSampler };
  let center = null;
  let residencySnapshot = { center: null, chunks: [] };
  let lastPosition = null;
  let anticipatedCenterKey = null;
  let anticipatedResidency = null;
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
    // Deep ocean keeps a cheap residency record for neighboring content owners,
    // but contributes neither a walking floor nor empty Rapier trimeshes.
    if (chunk.indices.length === 0) {
      const group = new THREE.Group();
      group.name = `frontier_chunk_${chunk.id}`;
      group.position.set(chunk.origin.x, 0, chunk.origin.z);
      return { chunk, group, geometry: null, foliage: null, texture: null, material: null, stoneMaterial: null, landform: null };
    }
    const geometry = new THREE.BufferGeometry();
    let foliage = null, texture = null, material = null, stoneMaterial = null, landform = null;
    try {
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
    const colorAt = createFrontierTextureColorSampler({ origin: chunk.origin, size: FRONTIER_TERRAIN_CONFIG.chunkSize,
      sample: (x, z) => sampleFrontier(x, z, terrainOptions) });
    texture = createBakedGroundTexture({
      bounds,
      colorAt,
      phase: { x: chunk.origin.x - FRONTIER_TERRAIN_CONFIG.campBounds.minX, z: chunk.origin.z - FRONTIER_TERRAIN_CONFIG.campBounds.minZ },
    });
    material = new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0, flatShading: true });
    stoneMaterial = separateCliffFaces(geometry, chunk);
    const mesh = new THREE.Mesh(geometry, stoneMaterial ? [material, stoneMaterial] : material);
    mesh.name = 'frontier_ground'; mesh.receiveShadow = true; mesh.userData.isGround = true;
    // Only the bounded tall-landform chunks need to cast terrain shadows.
    // Ordinary rolling ground keeps its previous shadow cost.
    mesh.castShadow = isSkybreakArea(chunk.origin.x + FRONTIER_TERRAIN_CONFIG.chunkSize / 2,
      chunk.origin.z + FRONTIER_TERRAIN_CONFIG.chunkSize / 2);
    group.add(mesh);
    foliage = addFoliage(group, chunk, foliageGeometry, foliageMaterial, terrainOptions, worldDescriptor, visualAssets);
    landform = createFrontierLandformVisual({ cx, cz, visualAssets, getHeight });
    group.add(landform.group);
    return { chunk, group, geometry, foliage, texture, material, stoneMaterial, landform };
    } catch (error) {
      landform?.dispose();
      foliage?.dispose();
      stoneMaterial?.dispose();
      material?.dispose();
      texture?.dispose();
      geometry.dispose();
      throw error;
    }
  }

  function disposeResident(resident) {
    resident.group.removeFromParent();
    resident.geometry?.dispose();
    resident.foliage?.dispose();
    resident.texture?.dispose();
    resident.material?.dispose();
    resident.stoneMaterial?.dispose();
    resident.landform?.dispose();
  }

  function clearPrepared() {
    for (const resident of prepared.values()) disposeResident(resident);
    prepared.clear();
    anticipatedCenterKey = null;
    anticipatedResidency = null;
  }

  function clearResidents() {
    clearPrepared();
    if (!residents.size && center === null) { lastPosition = null; return; }
    const remove = [...residents.values()].flatMap(resident => [resident.chunk.id, ...(resident.landform?.terrainSurfaces ?? []).map(surface => surface.id)]);
    if (remove.length) physicsWorld?.updateTerrainSurfaces({ remove });
    for (const resident of residents.values()) {
      disposeResident(resident);
    }
    residents.clear(); center = null; lastPosition = null; refreshResidencySnapshot();
  }

  function shouldKeepCenter(position) {
    if (!center) return false;
    const originX = center.cx * FRONTIER_TERRAIN_CONFIG.chunkSize;
    const originZ = center.cz * FRONTIER_TERRAIN_CONFIG.chunkSize;
    return position.x >= originX - HYSTERESIS && position.x < originX + FRONTIER_TERRAIN_CONFIG.chunkSize + HYSTERESIS
      && position.z >= originZ - HYSTERESIS && position.z < originZ + FRONTIER_TERRAIN_CONFIG.chunkSize + HYSTERESIS;
  }

  function wantedWindow(cx, cz) {
    const wanted = new Map();
    for (let z = cz - RADIUS; z <= cz + RADIUS; z++) for (let x = cx - RADIUS; x <= cx + RADIUS; x++) {
      if (!isCampChunk(x, z)) wanted.set(chunkKey(x, z), { cx: x, cz: z });
    }
    return wanted;
  }

  function prepareIncoming(position) {
    if (!center || !lastPosition) { clearPrepared(); return; }
    const dx = position.x - lastPosition.x, dz = position.z - lastPosition.z;
    const { chunkSize } = FRONTIER_TERRAIN_CONFIG;
    const { preloadDistance, maxPrepared, motionEpsilon } = FRONTIER_CHUNK_STREAMING_CONFIG;
    const originX = center.cx * chunkSize, originZ = center.cz * chunkSize;
    let stepX = 0, stepZ = 0;
    const noMovementStep = Math.abs(dx) <= motionEpsilon && Math.abs(dz) <= motionEpsilon;
    if (noMovementStep && anticipatedResidency) {
      // Rendering can outpace fixed-step movement. Keep the bounded prediction
      // through zero-delta frames while it is still in its preload corridor.
      const priorX = anticipatedResidency.center.cx - center.cx;
      const priorZ = anticipatedResidency.center.cz - center.cz;
      if (priorX > 0 && originX + chunkSize + HYSTERESIS - position.x <= preloadDistance) stepX = 1;
      else if (priorX < 0 && position.x - (originX - HYSTERESIS) <= preloadDistance) stepX = -1;
      if (priorZ > 0 && originZ + chunkSize + HYSTERESIS - position.z <= preloadDistance) stepZ = 1;
      else if (priorZ < 0 && position.z - (originZ - HYSTERESIS) <= preloadDistance) stepZ = -1;
    } else {
      if (dx > motionEpsilon && originX + chunkSize + HYSTERESIS - position.x <= preloadDistance) stepX = 1;
      else if (dx < -motionEpsilon && position.x - (originX - HYSTERESIS) <= preloadDistance) stepX = -1;
      if (dz > motionEpsilon && originZ + chunkSize + HYSTERESIS - position.z <= preloadDistance) stepZ = 1;
      else if (dz < -motionEpsilon && position.z - (originZ - HYSTERESIS) <= preloadDistance) stepZ = -1;
    }
    if (!stepX && !stepZ) { clearPrepared(); return; }
    const target = { cx: center.cx + stepX, cz: center.cz + stepZ };
    const targetKey = chunkKey(target.cx, target.cz);
    const wanted = wantedWindow(target.cx, target.cz);
    if (anticipatedCenterKey !== targetKey) {
      clearPrepared();
      anticipatedCenterKey = targetKey;
      anticipatedResidency = Object.freeze({
        center: Object.freeze({ ...target }),
        chunks: Object.freeze([...wanted].map(([id, coords]) => Object.freeze({
          id, ...coords,
          origin: Object.freeze({ x: coords.cx * chunkSize, z: coords.cz * chunkSize }),
        }))),
      });
    }
    for (const [id, resident] of prepared) if (!wanted.has(id) || residents.has(id)) {
      disposeResident(resident); prepared.delete(id);
    }
    if (prepared.size >= maxPrepared) return;
    for (const [id, coords] of wanted) {
      if (residents.has(id) || prepared.has(id)) continue;
      prepared.set(id, createResident(coords.cx, coords.cz));
      return;
    }
  }

  function update(position = {}, { activeSectionId, authorMode = false, prepare = false } = {}) {
    if (disposed) return;
    const active = activeSectionId === 'camp' && !authorMode;
    root.visible = active;
    if (!active) { clearResidents(); return; }
    const x = Number.isFinite(position.x) ? position.x : 0;
    const z = Number.isFinite(position.z) ? position.z : 0;
    const nextCx = Math.floor(x / FRONTIER_TERRAIN_CONFIG.chunkSize);
    const nextCz = Math.floor(z / FRONTIER_TERRAIN_CONFIG.chunkSize);
    const normalizedPosition = { x, z };
    if (shouldKeepCenter(normalizedPosition)) {
      if (prepare) prepareIncoming(normalizedPosition);
      else clearPrepared();
      lastPosition = normalizedPosition;
      return;
    }
    const wanted = wantedWindow(nextCx, nextCz);
    const nextResidents = new Map(), candidates = [];
    const add = [];
    try {
      for (const [id, { cx, cz }] of wanted) {
        let resident = residents.get(id);
        if (!resident) {
          resident = prepared.get(id) ?? createResident(cx, cz);
          prepared.delete(id);
          candidates.push(resident);
          if (resident.chunk.indices.length) add.push({ ...resident.chunk, sectionId: 'camp' });
          add.push(...(resident.landform?.terrainSurfaces ?? []));
        }
        nextResidents.set(id, resident);
      }
    } catch (error) {
      for (const resident of candidates) disposeResident(resident);
      clearPrepared();
      throw error;
    }
    const remove = [];
    for (const [id, resident] of residents) if (!wanted.has(id)) {
      remove.push(id, ...(resident.landform?.terrainSurfaces ?? []).map(surface => surface.id));
    }
    try {
      // Physics stages the complete replacement before it retires old support.
      if (add.length || remove.length) physicsWorld?.updateTerrainSurfaces({ add, remove });
    } catch (error) {
      for (const resident of candidates) disposeResident(resident);
      clearPrepared();
      throw error;
    }
    for (const [id, resident] of residents) if (!wanted.has(id)) disposeResident(resident);
    for (const resident of candidates) root.add(resident.group);
    residents = nextResidents;
    clearPrepared();
    center = { cx: nextCx, cz: nextCz };
    lastPosition = normalizedPosition;
    refreshResidencySnapshot();
  }

  function sample(x, z) { return sampleFrontier(x, z, terrainOptions); }
  function getHeight(x, z) { return sampleFrontierHeight(x, z, terrainOptions); }
  function getWater(x, z) { return sampleFrontierWater(x, z, terrainOptions); }
  // Stable lifecycle snapshot for nearby resident owners. It changes only when
  // the terrain residency does, and never exposes a gameplay mutation path.
  function getResidency() {
    return residencySnapshot;
  }
  function getWorldDescriptor() { return worldDescriptor; }
  function getAnticipatedResidency() { return anticipatedResidency; }
  function getDebugState() { return { residentCount: residents.size, center: center && { ...center }, residentIds: [...residents.keys()],
    preparedCount: prepared.size, preparedIds: [...prepared.keys()] }; }
  function dispose() {
    if (disposed) return;
    clearResidents(); parent?.remove(root);
    foliageGeometry.dispose(); foliageMaterial.dispose(); disposed = true;
  }
  const api = { root, update, sample, getHeight, getWater, getResidency, getAnticipatedResidency, getWorldDescriptor, getDebugState, dispose };
  Object.defineProperty(api, 'heightMatchesSample', { value: true, enumerable: true });
  return api;
}
