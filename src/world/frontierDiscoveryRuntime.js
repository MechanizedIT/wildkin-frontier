import * as THREE from 'three';
import { disposeExternalModelInstance } from '../assets/modelAssetRuntime.js';
import { createVisualAssetVisual } from './visualFactory.js';

const BOX_INDICES = new Uint32Array([
  0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6,
  0, 5, 1, 0, 4, 5, 1, 6, 2, 1, 5, 6,
  2, 7, 3, 2, 6, 7, 3, 4, 0, 3, 7, 4,
]);

function collisionSurface(id, asset, position, rotationY = 0, uniformScale = 1) {
  const collision = asset?.collision;
  if (collision?.shape !== 'box') throw new Error(`Signal Cache asset ${asset?.id ?? 'unknown'} needs box collision`);
  const size = collision.size, offset = collision.offset ?? {};
  const hx = size.w * uniformScale / 2, hy = size.h * uniformScale / 2, hz = size.d * uniformScale / 2;
  const ox = (offset.x ?? 0) * uniformScale;
  const oy = (offset.y ?? size.h / 2) * uniformScale;
  const oz = (offset.z ?? 0) * uniformScale;
  const cos = Math.cos(rotationY), sin = Math.sin(rotationY);
  const centerX = position.x + ox * cos + oz * sin;
  const centerZ = position.z - ox * sin + oz * cos;
  const corners = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]];
  const vertices = new Float32Array(8 * 3);
  for (let index = 0; index < corners.length; index++) {
    const [x, z] = corners[index];
    const worldX = centerX + x * cos + z * sin;
    const worldZ = centerZ - x * sin + z * cos;
    vertices.set([worldX, position.y + oy - hy, worldZ], index * 3);
    vertices.set([worldX, position.y + oy + hy, worldZ], (index + 4) * 3);
  }
  return { id, sectionId: 'camp', traversalSurface: 'scenery', origin: { x: 0, z: 0 }, vertices, indices: new Uint32Array(BOX_INDICES) };
}

function disposeVisualRoot(root) {
  if (!disposeExternalModelInstance(root)) root?.clear?.();
}

export function createFrontierDiscoveryVisual({ discovery, visualAssets = [] } = {}) {
  const chestScale = discovery?.uniformScale ?? 1;
  if (!Number.isFinite(chestScale) || chestScale <= 0) throw new Error('Frontier discovery uniformScale must be positive');
  const receiverAsset = discovery?.receiverAssetId
    ? visualAssets.find(asset => asset?.id === discovery.receiverAssetId)
    : null;
  const chestAsset = visualAssets.find(asset => asset?.id === discovery?.visualAssetId);
  if ((discovery?.receiverAssetId && !receiverAsset) || !chestAsset) throw new Error('Frontier discovery visual assets missing');
  const anchor = receiverAsset ? discovery.landmarkPos : discovery.pos;
  if (![anchor?.x, anchor?.y, anchor?.z].every(Number.isFinite)) throw new Error('Frontier discovery position missing');
  const group = new THREE.Group();
  group.name = `frontier_discovery_${discovery.id}`;
  group.position.set(anchor.x, anchor.y, anchor.z);
  const receiverRoot = receiverAsset ? createVisualAssetVisual(receiverAsset) : null;
  if (receiverRoot) {
    receiverRoot.name = `${discovery.id}:receiver`;
    receiverRoot.rotation.y = discovery.rotY ?? 0;
    group.add(receiverRoot);
  }
  const chestRoot = createVisualAssetVisual(chestAsset);
  chestRoot.name = discovery.id;
  chestRoot.rotation.y = discovery.rotY ?? 0;
  chestRoot.scale.setScalar(chestScale);
  chestRoot.position.set(
    discovery.pos.x - anchor.x,
    discovery.pos.y - anchor.y,
    discovery.pos.z - anchor.z,
  );
  group.add(chestRoot);
  const terrainSurfaces = [];
  if (receiverAsset) terrainSurfaces.push(collisionSurface(`${discovery.id}:receiver`, receiverAsset, discovery.landmarkPos, discovery.rotY));
  terrainSurfaces.push(collisionSurface(`${discovery.id}:chest`, chestAsset, discovery.pos, discovery.rotY, chestScale));
  let disposed = false;
  return { group, chestRoot, receiverRoot, terrainSurfaces, dispose() {
    if (disposed) return;
    if (receiverRoot) disposeVisualRoot(receiverRoot);
    disposeVisualRoot(chestRoot);
    group.clear();
    disposed = true;
  } };
}

/** Streams bounded discoveries with terrain residency; save and reward state stay in existing owners. */
export function createFrontierDiscoveryRuntime({
  parent, terrainRuntime, physicsWorld, lootRegistry, discoveries = [], visualAssets = [],
  registerLootMechanism = () => {}, unregisterLootMechanism = () => {},
  onVisualAdded = () => {}, onVisualRemoving = () => {}, onGeometryChanged = () => {},
  createVisual = createFrontierDiscoveryVisual,
} = {}) {
  const definitionsByChunk = new Map();
  const definitionOrder = new Map();
  for (let index = 0; index < discoveries.length; index += 1) {
    const discovery = discoveries[index];
    if (!discovery?.id || !discovery?.chunkId || definitionOrder.has(discovery.id)) {
      throw new Error(`invalid or duplicate frontier discovery ${discovery?.id ?? 'unknown'}`);
    }
    definitionOrder.set(discovery.id, index);
    const chunkDefinitions = definitionsByChunk.get(discovery.chunkId) ?? [];
    chunkDefinitions.push(discovery);
    definitionsByChunk.set(discovery.chunkId, chunkDefinitions);
  }
  let lastResidency = null, disposed = false;
  const residents = new Map();

  function orderedResidentIds() {
    return [...residents.keys()].sort((a, b) => definitionOrder.get(a) - definitionOrder.get(b));
  }

  function retireEntries(entries, removePhysics = true) {
    if (!entries.length) return;
    if (removePhysics) physicsWorld?.updateTerrainSurfaces({
      remove: entries.flatMap(entry => entry.visual.terrainSurfaces.map(surface => surface.id)),
    });
    for (const entry of entries) {
      unregisterLootMechanism(entry.discovery.id, entry.visual.chestRoot);
      if (entry.visual.receiverRoot) onVisualRemoving(entry.visual.receiverRoot);
      parent?.remove(entry.visual.group);
      entry.visual.dispose();
      residents.delete(entry.discovery.id);
    }
  }

  function update() {
    if (disposed) return;
    const residency = terrainRuntime?.getResidency?.();
    if (residency === lastResidency) return;
    const desired = new Map();
    for (const chunk of residency?.chunks ?? []) {
      for (const discovery of definitionsByChunk.get(chunk.id) ?? []) desired.set(discovery.id, discovery);
    }
    const removed = [...residents.values()].filter(entry => !desired.has(entry.discovery.id));
    const additions = [...desired.values()]
      .filter(discovery => !residents.has(discovery.id))
      .sort((a, b) => definitionOrder.get(a.id) - definitionOrder.get(b.id));
    if (!removed.length && !additions.length) { lastResidency = residency; return; }

    const staged = [];
    try {
      for (const discovery of additions) staged.push({ discovery, visual: createVisual({ discovery, visualAssets }) });
    } catch (error) {
      for (const entry of staged) entry.visual.dispose();
      throw error;
    }
    const remove = removed.flatMap(entry => entry.visual.terrainSurfaces.map(surface => surface.id));
    const add = staged.flatMap(entry => entry.visual.terrainSurfaces);
    try {
      physicsWorld?.updateTerrainSurfaces({ remove, add });
    } catch (error) {
      for (const entry of staged) entry.visual.dispose();
      throw error;
    }

    retireEntries(removed, false);
    for (const entry of staged) {
      parent?.add(entry.visual.group);
      residents.set(entry.discovery.id, entry);
      registerLootMechanism(entry.discovery, entry.visual.chestRoot);
      if (entry.visual.receiverRoot) onVisualAdded(entry.visual.receiverRoot);
    }
    lootRegistry?.setResidentDiscoveryIds(orderedResidentIds());
    lastResidency = residency;
    onGeometryChanged();
  }

  function dispose() {
    if (disposed) return;
    const entries = [...residents.values()];
    retireEntries(entries);
    lootRegistry?.setResidentDiscoveryIds([]);
    if (entries.length) onGeometryChanged();
    lastResidency = null; disposed = true;
  }
  return {
    update, dispose,
    getVisualRoot: id => residents.get(id)?.visual.chestRoot ?? null,
    getDebugState: () => {
      const residentIds = orderedResidentIds();
      return {
        residentId: residentIds[0] ?? null,
        residentIds,
        colliderCount: [...residents.values()].reduce((sum, entry) => sum + entry.visual.terrainSurfaces.length, 0),
      };
    },
  };
}
