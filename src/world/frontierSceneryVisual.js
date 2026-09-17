import * as THREE from 'three';
import { mergeGeometries } from '../../vendor/utils/BufferGeometryUtils.js';
import { createExternalModelVisual, disposeExternalModelInstance } from '../assets/modelAssetRuntime.js';
import { createGroundCoverClusterGeometry } from '../presentation/groundFoliage.js';
import { DEFAULT_FRONTIER_WORLD, frontierDomainSeed, normalizeFrontierWorld } from './frontierWorld.js';

const CANOPY_TRUNK = Object.freeze({ width: 1.1, height: 2.45, depth: 1.1 });
// The visible Fen monolith is 1.65m wide including its decorative feet. Keep
// its physical core narrow enough to match the stone rather than becoming a
// broad invisible obstacle around the moss and scattered foot pieces.
const FEN_STONE_CORE = Object.freeze({ width: .92, height: 2.15, depth: .78 });
// Thornstone's normalized 1.94 × 1.5 × 1.28m mesh includes projecting chips.
// Only the substantial central body is solid; decorative foot rubble stays out.
const ROOTBOUND_THORN_CORE = Object.freeze({ width: 1.18, height: 1.16, depth: .78 });
export const FRONTIER_SCENERY_LOW_RENDER_CELL_SIZE = 12.5;
const MAX_GROUND_CLUSTERS = 640;
const MAX_GROUND_PATCH_CACHE_ENTRIES = 512;
const MAX_GROUND_PATCH_RECORDS = 28;
const GROUND_PATCH_CACHE_ACCESS = Symbol('frontier-ground-patch-cache-access');
const GROUND_CLUSTER_TRIANGLES = 16;
const BOX_INDICES = new Uint32Array([
  0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6,
  0, 5, 1, 0, 4, 5, 1, 6, 2, 1, 5, 6,
  2, 7, 3, 2, 6, 7, 3, 4, 0, 3, 7, 4,
]);

function assetById(visualAssets, id) {
  if (visualAssets instanceof Map) return visualAssets.get(id) ?? null;
  return (visualAssets ?? []).find(asset => asset?.id === id) ?? null;
}

function finite(value, fallback = 0) { return Number.isFinite(value) ? value : fallback; }

function hash(value) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0) / 4294967295;
}
function worldHash(value, world) {
  const salt = frontierDomainSeed(world, 'scenery-grass');
  return salt ? hash(`${value}:${salt}`) : hash(value);
}

function surfaceBox({ id, x, y, z, yaw, scale, size }) {
  const halfW = size.width * scale * .5;
  const halfD = size.depth * scale * .5;
  const top = y + size.height * scale;
  const cos = Math.cos(yaw), sin = Math.sin(yaw);
  const corners = [[-halfW, -halfD], [halfW, -halfD], [halfW, halfD], [-halfW, halfD]];
  const vertices = new Float32Array(8 * 3);
  for (let index = 0; index < 4; index++) {
    const [localX, localZ] = corners[index];
    const worldX = x + localX * cos + localZ * sin;
    const worldZ = z - localX * sin + localZ * cos;
    vertices.set([worldX, y, worldZ], index * 3);
    vertices.set([worldX, top, worldZ], (index + 4) * 3);
  }
  return { id, sectionId: 'camp', traversalSurface: 'scenery', origin: { x: 0, z: 0 }, vertices, indices: new Uint32Array(BOX_INDICES) };
}

function authoredPartGeometry(part) {
  const source = part?.geometry;
  if (part?.shape !== 'mesh' || !Array.isArray(source?.positions) || !Array.isArray(source?.indices)) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(source.positions, 3));
  geometry.setIndex(source.indices);
  geometry.computeVertexNormals();
  const nonIndexed = geometry.toNonIndexed();
  geometry.dispose();
  return nonIndexed;
}

function partMatrix(part) {
  const position = part.position ?? {};
  const rotation = part.rotation ?? {};
  const scale = part.scale ?? {};
  return new THREE.Matrix4().compose(
    new THREE.Vector3(finite(position.x), finite(position.y), finite(position.z)),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(finite(rotation.x), finite(rotation.y), finite(rotation.z), 'XYZ')),
    new THREE.Vector3(finite(scale.x, 1), finite(scale.y, 1), finite(scale.z, 1)),
  );
}

function placementMatrix(spec) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(finite(spec.x), finite(spec.y), finite(spec.z)),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, finite(spec.yaw), 0, 'XYZ')),
    new THREE.Vector3(finite(spec.scale, 1), finite(spec.scale, 1), finite(spec.scale, 1)),
  );
}

function addVertexColor(geometry, color) {
  const value = new THREE.Color(color ?? '#ffffff');
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let index = 0; index < count; index++) colors.set([value.r, value.g, value.b], index * 3);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/**
 * Runtime-owned cache for complete deterministic grass patches. `owner` names
 * the terrain/clearance callback contract; create a fresh cache when that
 * contract or the world changes. Cached records own no Three.js resources.
 */
export function createFrontierGroundPatchCache({ world = DEFAULT_FRONTIER_WORLD, owner, maxEntries = MAX_GROUND_PATCH_CACHE_ENTRIES } = {}) {
  if (owner === undefined || owner === null) throw new Error('Ground patch cache requires a stable owner contract');
  const normalizedWorld = normalizeFrontierWorld(world);
  const limit = Math.max(1, Math.min(MAX_GROUND_PATCH_CACHE_ENTRIES, Math.floor(finite(maxEntries, MAX_GROUND_PATCH_CACHE_ENTRIES))));
  const entries = new Map();

  function assertContract(candidateWorld, candidateOwner) {
    const normalized = normalizeFrontierWorld(candidateWorld);
    if (candidateOwner !== owner || normalized.edition !== normalizedWorld.edition || normalized.seed !== normalizedWorld.seed) {
      throw new Error('Ground patch cache owner/world contract changed; create a fresh cache');
    }
  }

  const access = Object.freeze({
    get(key, candidateWorld, candidateOwner) { assertContract(candidateWorld, candidateOwner); return entries.get(key) ?? null; },
    set(key, specId, patch, candidateWorld, candidateOwner) {
      assertContract(candidateWorld, candidateOwner);
      if (!patch || !Number.isSafeInteger(patch.count) || patch.count < 0 || patch.count > MAX_GROUND_PATCH_RECORDS
        || patch.matrices?.length !== patch.count * 16 || patch.colors?.length !== patch.count * 3) {
        throw new Error('Ground patch cache accepts only complete bounded patches');
      }
      if (entries.has(key)) entries.delete(key);
      entries.set(key, { specId, patch });
      while (entries.size > limit) entries.delete(entries.keys().next().value);
    },
  });
  return Object.freeze({
    [GROUND_PATCH_CACHE_ACCESS]: access,
    prune(retainedSpecIds = []) {
      const retained = new Set(retainedSpecIds);
      for (const [key, entry] of entries) if (!retained.has(entry.specId)) entries.delete(key);
    },
    clear() { entries.clear(); },
    getDebugState() {
      return Object.freeze({ entryCount: entries.size, maxEntries: limit,
        maxPatchRecords: entries.size ? Math.max(...[...entries.values()].map(entry => entry.patch.count)) : 0 });
    },
  });
}

function groundPatchKey(spec, desiredCount, world) {
  const regional = spec.groundCover;
  const normalized = normalizeFrontierWorld(world);
  return JSON.stringify([
    normalized.edition, normalized.seed, spec.id, spec.assetId, spec.kind,
    spec.x, spec.y, spec.z, desiredCount,
    finite(regional?.density, 1), finite(regional?.influence), finite(regional?.dryWeight), finite(regional?.highWeight),
    finite(regional?.calderaWeight), finite(regional?.fungalWeight),
  ]);
}

/**
 * Builds only the bounded, streamed presentation/collider payload. It owns no
 * residency, physics update, or terrain sampling; callers rebuild it from an
 * immutable spec list and submit terrainSurfaces through their existing owner.
 */
function* buildFrontierSceneryVisual({ specs = [], visualAssets = [], getHeight, canPlaceGroundCover,
  groundPatchCache = null, groundPatchOwner = null, world = DEFAULT_FRONTIER_WORLD } = {}) {
  const group = new THREE.Group();
  group.name = 'frontier_scenery';
  const terrainSurfaces = [];
  const canopyRoots = [];
  const occlusionRoots = [];
  const lowAssetGeometries = new Map();
  const lowBatches = new Map();
  const lowMeshes = [];
  let canopyCount = 0;
  let lowCount = 0;
  let stoneSolidCount = 0;
  let groundClusterCount = 0;
  let lowMaterial = null;
  let disposed = false;
  let transferred = false;
  const heightAt = typeof getHeight === 'function' ? getHeight : null;
  const canPlace = typeof canPlaceGroundCover === 'function' ? canPlaceGroundCover : () => true;
  const groundGeometry = createGroundCoverClusterGeometry({ grass: '#86aa58' });
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, roughness: .92, metalness: 0, side: THREE.DoubleSide });
  const groundMesh = new THREE.InstancedMesh(groundGeometry, groundMaterial, MAX_GROUND_CLUSTERS);
  const groundDummy = new THREE.Object3D();
  const groundMatrix = new THREE.Matrix4();
  const groundColor = new THREE.Color();
  let groundDisposed = false;
  groundMesh.name = 'frontier_scenery_ground_cover';
  groundMesh.castShadow = groundMesh.receiveShadow = true;

  function disposeGround() {
    if (groundDisposed) return;
    groundMesh.dispose();
    groundGeometry.dispose();
    groundMaterial.dispose();
    groundDisposed = true;
  }

  function geometryFor(asset) {
    if (lowAssetGeometries.has(asset)) return lowAssetGeometries.get(asset);
    const parts = [];
    try {
      for (const part of asset.parts) {
        const geometry = authoredPartGeometry(part);
        if (!geometry) continue;
        try {
          geometry.applyMatrix4(partMatrix(part));
          parts.push(addVertexColor(geometry, part.color));
        } catch (error) {
          geometry.dispose();
          throw error;
        }
      }
      const geometry = parts.length ? mergeGeometries(parts) : null;
      if (geometry) {
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        lowAssetGeometries.set(asset, geometry);
      }
      return geometry;
    } finally {
      parts.forEach(geometry => geometry.dispose());
    }
  }

  function disposeLowAssets() {
    lowMeshes.forEach(mesh => mesh.dispose());
    lowAssetGeometries.forEach(geometry => geometry.dispose());
    lowMeshes.length = 0;
    lowAssetGeometries.clear();
  }

  function disposeAll() {
    if (disposed) return;
    for (const root of canopyRoots) disposeExternalModelInstance(root);
    canopyRoots.length = 0;
    disposeLowAssets();
    lowMaterial?.dispose();
    disposeGround();
    group.clear();
    disposed = true;
  }

  function* prepareGroundPatch(spec, desiredCount, acceptedLimit) {
    const wet = spec.assetId.startsWith('asset_fen_');
    const staged = spec.id.includes(':stage-');
    const regional = spec.groundCover;
    const influence = Math.max(0, Math.min(1, finite(regional?.influence)));
    const dry = influence * Math.max(0, Math.min(1, finite(regional?.dryWeight)));
    const high = influence * Math.max(0, Math.min(1, finite(regional?.highWeight)));
    const caldera = Math.max(0, Math.min(1, finite(regional?.calderaWeight)));
    const fungal = Math.max(0, Math.min(1, finite(regional?.fungalWeight)));
    desiredCount = Math.max(0, Math.min(desiredCount, Math.round(desiredCount * finite(regional?.density, 1))));
    const patchRadius = spec.kind === 'canopy' ? 6 : 4.5;
    const matrices = new Float32Array(desiredCount * 16);
    const colors = new Float32Array(desiredCount * 3);
    const attempts = desiredCount * 5;
    let accepted = 0;
    for (let index = 0; index < attempts && accepted < desiredCount && accepted < acceptedLimit; index++) {
      const seed = `${spec.id}:ground-cover:${index}`;
      const ring = index % 4;
      const angle = ((index / desiredCount) * Math.PI * 2) + (worldHash(`${seed}:angle`, world) - .5) * .48;
      const radius = patchRadius * ([.32, .56, .78, .98][ring] + (worldHash(`${seed}:radius`, world) - .5) * .1);
      const x = spec.x + Math.cos(angle) * radius;
      const z = spec.z + Math.sin(angle) * radius;
      const allowed = canPlace(x, z);
      yield;
      if (!allowed) continue;
      const y = finite(heightAt?.(x, z), finite(spec.y));
      const scale = (wet ? .60 : .66) + worldHash(`${seed}:scale`, world) * .24;
      groundDummy.position.set(x, y, z);
      groundDummy.rotation.y = worldHash(`${seed}:yaw`, world) * Math.PI * 2;
      groundDummy.scale.set(scale * (1 - caldera * .14), scale * (1 - caldera * .58), scale * (1 - caldera * .14));
      groundDummy.updateMatrix();
      groundDummy.matrix.toArray(matrices, accepted * 16);
      const tone = new THREE.Color(wet ? '#6d9872' : '#86aa58').lerp(new THREE.Color(staged ? '#b0c970' : '#759b69'), worldHash(`${seed}:tone`, world) * .28);
      // The existing geometry has its own green vertex color. Tint ratios
      // compensate that base to express straw/mineral grass in dry provinces.
      tone.r *= 1 + dry * 2.8 - high * .2;
      tone.g *= 1 + dry * .05 - high * .2;
      tone.b *= 1 - dry * .15 + high * .12;
      tone.lerp(new THREE.Color('#8a3f1f'), caldera * .9);
      tone.lerp(new THREE.Color('#416a5a'), fungal * .75);
      tone.toArray(colors, accepted * 3);
      accepted++;
    }
    return Object.freeze({ count: accepted, matrices: matrices.slice(0, accepted * 16), colors: colors.slice(0, accepted * 3) });
  }

  function* addGroundClusters(spec, desiredCount) {
    const remaining = MAX_GROUND_CLUSTERS - groundClusterCount;
    if (remaining <= 0) return;
    let patch;
    if (groundPatchCache) {
      const cacheAccess = groundPatchCache[GROUND_PATCH_CACHE_ACCESS];
      if (!cacheAccess) throw new Error('Invalid frontier ground patch cache');
      const key = groundPatchKey(spec, desiredCount, world);
      const cached = cacheAccess.get(key, world, groundPatchOwner);
      patch = cached?.patch ?? null;
      if (!patch) {
        patch = yield* prepareGroundPatch(spec, desiredCount, MAX_GROUND_PATCH_RECORDS);
        cacheAccess.set(key, spec.id, patch, world, groundPatchOwner);
      } else {
        yield;
      }
    } else {
      patch = yield* prepareGroundPatch(spec, desiredCount, remaining);
    }
    const count = Math.min(remaining, patch.count);
    for (let index = 0; index < count; index++) {
      groundMatrix.fromArray(patch.matrices, index * 16);
      groundColor.fromArray(patch.colors, index * 3);
      groundMesh.setMatrixAt(groundClusterCount, groundMatrix);
      groundMesh.setColorAt(groundClusterCount, groundColor);
      groundClusterCount++;
    }
  }

  function processSpec(rawSpec) {
    const spec = rawSpec ?? {};
    if (!spec.id || !spec.assetId || !Number.isFinite(spec.x) || !Number.isFinite(spec.y) || !Number.isFinite(spec.z)) return;
    const asset = assetById(visualAssets, spec.assetId);
    const scale = finite(spec.scale, 1);
    const yaw = finite(spec.yaw);
    if (scale <= 0 || !asset) return;

    if (spec.kind === 'canopy' && asset.model) {
      const root = createExternalModelVisual(asset);
      root.name = `frontier_scenery_${spec.id}`;
      root.position.set(spec.x, spec.y, spec.z);
      root.rotation.y = yaw;
      root.scale.setScalar(scale);
      group.add(root);
      canopyRoots.push(root);
      canopyCount++;
      const modelScale = finite(asset.model?.scale, 1) * scale;
      terrainSurfaces.push(surfaceBox({ id: `f2c:${spec.id}:trunk`, x: spec.x, y: spec.y, z: spec.z, yaw, scale: modelScale, size: CANOPY_TRUNK }));
      return;
    }

    if (spec.kind !== 'low' || !asset.parts?.length) return;
    if (!geometryFor(asset)) return;
    const renderCellSize = spec.rootboundForest ? 25 : FRONTIER_SCENERY_LOW_RENDER_CELL_SIZE;
    const cellX = Math.floor(spec.x / renderCellSize);
    const cellZ = Math.floor(spec.z / renderCellSize);
    const renderCellId = spec.rootboundForest ? `forest:${cellX},${cellZ}` : `${cellX},${cellZ}`;
    const batchKey = `${renderCellId}\u0000${asset.id}`;
    if (!lowBatches.has(batchKey)) lowBatches.set(batchKey, { asset, renderCellId, specs: [] });
    lowBatches.get(batchKey).specs.push({ ...spec, scale, yaw });
    lowCount++;
    if (spec.rootboundTree && asset.collision?.shape === 'box') {
      const { size, offset = {} } = asset.collision;
      const cos = Math.cos(yaw), sin = Math.sin(yaw);
      const ox = (offset.x ?? 0) * scale, oz = (offset.z ?? 0) * scale;
      terrainSurfaces.push(surfaceBox({ id: `f2c:${spec.id}:trunk`,
        x: spec.x + ox * cos + oz * sin, z: spec.z - ox * sin + oz * cos,
        y: spec.y + ((offset.y ?? size.h / 2) - size.h / 2) * scale, yaw, scale,
        size: { width: size.w, height: size.h, depth: size.d } }));
    }
    if (spec.assetId === 'asset_fen_stone') {
      terrainSurfaces.push(surfaceBox({ id: `f2c:${spec.id}:stone`, x: spec.x, y: spec.y, z: spec.z, yaw, scale, size: FEN_STONE_CORE }));
      stoneSolidCount++;
    }
    if (spec.rootboundRock && spec.assetId === 'asset_rootbound_block_thorn') {
      terrainSurfaces.push(surfaceBox({ id: `f2c:${spec.id}:stone`, x: spec.x, y: spec.y, z: spec.z, yaw, scale, size: ROOTBOUND_THORN_CORE }));
      stoneSolidCount++;
    }
  }

  try {
    for (const rawSpec of specs) {
      processSpec(rawSpec);
      yield;
    }

    const patchSpecs = [...specs].filter(spec => spec?.id && Number.isFinite(spec.x) && Number.isFinite(spec.z))
    .sort((a, b) => Number(b.id.includes(':stage-') || b.id.startsWith('f1:s:fungal-hollow:') || b.heartwoodGroundCover)
      - Number(a.id.includes(':stage-') || a.id.startsWith('f1:s:fungal-hollow:') || a.heartwoodGroundCover)
      || Number(a.id.startsWith('f2c:i:')) - Number(b.id.startsWith('f2c:i:'))
      || a.id.localeCompare(b.id));
    for (const spec of patchSpecs) yield* addGroundClusters(spec,
      spec.id.includes(':stage-') ? 28 : spec.heartwoodGroundCover ? 18 : 13);
    if (groundClusterCount) {
      groundMesh.count = groundClusterCount;
      groundMesh.instanceMatrix.needsUpdate = true;
      groundMesh.instanceColor.needsUpdate = true;
      group.add(groundMesh);
    }

    let lowTriangleCount = 0;
    if (lowBatches.size) {
      lowMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, roughness: .92, metalness: 0 });
      for (const { asset, renderCellId, specs: batchSpecs } of lowBatches.values()) {
        const geometry = lowAssetGeometries.get(asset);
        const mesh = new THREE.InstancedMesh(geometry, lowMaterial, batchSpecs.length);
        lowMeshes.push(mesh);
        mesh.name = 'frontier_scenery_low_props';
        mesh.userData.frontierScenery = { assetId: asset.id, renderCellId, specIds: batchSpecs.map(spec => spec.id) };
        if (!geometry.boundingBox) geometry.computeBoundingBox();
        const localHeight = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
        // Earlier Crown/Grove assemblies are instanced too. Large roots,
        // foliage and deadwood must reveal the player just like newer trees;
        // otherwise the summit's old placeholder forms hide the whole body.
        if (batchSpecs.some(spec => spec.rootboundTree ||
          (spec.id.startsWith('f1:s:rootbound-wildwood:') && localHeight * spec.scale >= .9))) occlusionRoots.push(mesh);
        mesh.castShadow = mesh.receiveShadow = true;
        for (let index = 0; index < batchSpecs.length; index++) mesh.setMatrixAt(index, placementMatrix(batchSpecs[index]));
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingBox();
        mesh.computeBoundingSphere();
        group.add(mesh);
        lowTriangleCount += geometry.getAttribute('position').count / 3 * batchSpecs.length;
        yield;
      }
    }

    const stats = Object.freeze({
    canopyCount,
    lowCount,
    stoneSolidCount,
    surfaceCount: terrainSurfaces.length,
    lowDrawCount: lowMeshes.length,
    lowTriangleCount,
    lowGeometryCount: lowAssetGeometries.size,
    lowGeometryVertexCount: [...lowAssetGeometries.values()].reduce((sum, geometry) => sum + geometry.getAttribute('position').count, 0),
    lowInstanceCount: lowMeshes.reduce((sum, mesh) => sum + mesh.count, 0),
    groundDrawCount: groundClusterCount ? 1 : 0,
    groundClusterCount,
    groundClusterTriangleCount: groundClusterCount * GROUND_CLUSTER_TRIANGLES,
    });
    const result = { group, terrainSurfaces, canopyRoots, occlusionRoots, stats, dispose: disposeAll };
    transferred = true;
    return result;
  } finally {
    if (!transferred) disposeAll();
  }
}

export function createFrontierSceneryVisualJob(options = {}) {
  const iterator = buildFrontierSceneryVisual(options);
  let status = 'pending';
  let workCompleted = 0;
  let result = null;
  let failure = null;

  const getState = () => Object.freeze({ status, workCompleted, hasResult: status === 'complete' });
  return Object.freeze({
    step(maxWork = 1) {
      if (status !== 'pending') return getState();
      const limit = maxWork === Infinity ? Number.MAX_SAFE_INTEGER : Math.max(1, Math.floor(finite(maxWork, 1)));
      try {
        for (let index = 0; index < limit && status === 'pending'; index++) {
          const next = iterator.next();
          if (next.done) {
            result = next.value;
            status = 'complete';
          } else {
            workCompleted++;
          }
        }
      } catch (error) {
        failure = error;
        status = 'failed';
        throw error;
      }
      return getState();
    },
    cancel() {
      if (status === 'transferred' || status === 'cancelled' || status === 'failed') return getState();
      if (status === 'pending') iterator.return();
      if (result) result.dispose();
      result = null;
      status = 'cancelled';
      return getState();
    },
    getState,
    takeResult() {
      if (status === 'failed') throw failure;
      if (status !== 'complete' || !result) throw new Error('Frontier scenery visual job has no completed result');
      const value = result;
      result = null;
      status = 'transferred';
      return value;
    },
  });
}

export function createFrontierSceneryVisual(options = {}) {
  const job = createFrontierSceneryVisualJob(options);
  while (job.getState().status === 'pending') job.step(Infinity);
  return job.takeResult();
}
