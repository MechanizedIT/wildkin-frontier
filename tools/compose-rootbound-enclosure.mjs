// Pure Rootbound enclosure recipe composer.  It deliberately reads no files
// and mutates neither its input nor a world object: callers decide whether to
// register the returned records in WORLD_DATA.
import * as THREE from '../vendor/three.module.js';

const ROOT = 'asset_rootbound_block_root';
const LEAF = 'asset_rootbound_block_leaf';

const freezeVector = (x, y, z) => Object.freeze({ x, y, z });
const placement = (assetId, x, y, z, scale) => Object.freeze({ assetId, position: freezeVector(x, y, z), scale });

// These are recipe-local transforms, not world placements.  Their vertex data
// is baked into standalone low-prop records so frontierSceneryVisual needs no
// nested-asset or per-part transform feature.
export const ROOTBOUND_ENCLOSURE_RECIPES = Object.freeze([
  Object.freeze({
    id: 'asset_rootbound_gallery_shelter_placeholder',
    displayName: 'Rootbound gallery shelter placeholder',
    groundInset: .60,
    placements: Object.freeze([
      placement(LEAF, -1.55, .38, .15, 2.75), placement(LEAF, 1.45, .20, .42, 2.40),
      placement(ROOT, -1.70, 0, -.25, 3.00), placement(ROOT, 1.78, 0, -.10, 2.50),
    ]),
  }),
  Object.freeze({
    id: 'asset_rootbound_gallery_lintel_placeholder',
    displayName: 'Rootbound gallery lintel placeholder',
    groundInset: .15,
    placements: Object.freeze([placement(LEAF, 0, .25, .20, 2.45), placement(ROOT, 0, 0, -.15, 2.60)]),
  }),
  Object.freeze({
    id: 'asset_rootbound_heartroot_core_placeholder',
    displayName: 'Rootbound Heartroot core placeholder',
    groundInset: .15,
    placements: Object.freeze([
      placement(LEAF, -1.65, .45, .50, 3.15), placement(LEAF, 1.72, .65, .78, 2.85),
      placement(ROOT, -2.12, 0, 0, 3.45), placement(ROOT, 2.08, 0, .36, 3.20),
    ]),
  }),
  Object.freeze({
    id: 'asset_rootbound_heartroot_wing_placeholder',
    displayName: 'Rootbound Heartroot wing placeholder',
    groundInset: .15,
    placements: Object.freeze([placement(LEAF, -.65, .32, .25, 2.35), placement(ROOT, .55, 0, -.15, 2.55)]),
  }),
]);

function clone(value) { return structuredClone(value); }

function sourceAsset(visualAssets, id) {
  const asset = visualAssets?.find(candidate => candidate?.id === id);
  if (!asset?.parts?.length) throw new Error(`Rootbound enclosure source ${id} requires authored parts`);
  return asset;
}

function transformFor(part, instance, groundInset) {
  const p = part.position ?? {}, r = part.rotation ?? {}, s = part.scale ?? {};
  const source = new THREE.Matrix4().compose(
    new THREE.Vector3(p.x ?? 0, p.y ?? 0, p.z ?? 0),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(r.x ?? 0, r.y ?? 0, r.z ?? 0, 'XYZ')),
    new THREE.Vector3(s.x ?? 1, s.y ?? 1, s.z ?? 1),
  );
  const ip = instance.position;
  const outer = new THREE.Matrix4().compose(
    new THREE.Vector3(ip.x, ip.y - groundInset, ip.z), new THREE.Quaternion(),
    new THREE.Vector3(instance.scale, instance.scale, instance.scale),
  );
  return outer.multiply(source);
}

function metadataFor(part) {
  const { geometry, id, position, rotation, scale, ...metadata } = part;
  return metadata;
}

function metadataKey(part) { return JSON.stringify(metadataFor(part)); }

function boundsFromParts(parts) {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const part of parts) for (let i = 0; i < part.geometry.positions.length; i += 3) {
    const x = part.geometry.positions[i], y = part.geometry.positions[i + 1], z = part.geometry.positions[i + 2];
    min.x = Math.min(min.x, x); min.y = Math.min(min.y, y); min.z = Math.min(min.z, z);
    max.x = Math.max(max.x, x); max.y = Math.max(max.y, y); max.z = Math.max(max.z, z);
  }
  return Object.freeze({ min: Object.freeze(min), max: Object.freeze(max), size: Object.freeze({ x: max.x - min.x, y: max.y - min.y, z: max.z - min.z }) });
}

function composeRecipe(recipe, sources) {
  const buckets = new Map();
  for (const instance of recipe.placements) {
    const source = sources.get(instance.assetId);
    for (const part of source.parts) {
      if (part?.shape !== 'mesh' || !Array.isArray(part.geometry?.positions) || !Array.isArray(part.geometry?.indices)) {
        throw new Error(`Rootbound enclosure source ${source.id} has a non-mesh part`);
      }
      const key = part.color ?? '#ffffff';
      const sourceMetadata = metadataKey(part);
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { metadata: metadataFor(part), metadataKey: sourceMetadata, positions: [], indices: [] };
        buckets.set(key, bucket);
      } else if (bucket.metadataKey !== sourceMetadata) {
        throw new Error(`Cannot merge differently-described ${key} parts in ${recipe.id}`);
      }
      const matrix = transformFor(part, instance, recipe.groundInset);
      const offset = bucket.positions.length / 3;
      for (let i = 0; i < part.geometry.positions.length; i += 3) {
        const vertex = new THREE.Vector3(part.geometry.positions[i], part.geometry.positions[i + 1], part.geometry.positions[i + 2]).applyMatrix4(matrix);
        bucket.positions.push(vertex.x, vertex.y, vertex.z);
      }
      bucket.indices.push(...part.geometry.indices.map(index => index + offset));
    }
  }
  const parts = [...buckets.entries()].map(([color, bucket], index) => Object.freeze({
    ...clone(bucket.metadata), id: `${recipe.id}:color-${index}`, color,
    position: freezeVector(0, 0, 0), rotation: freezeVector(0, 0, 0), scale: freezeVector(1, 1, 1),
    geometry: Object.freeze({ positions: Object.freeze(bucket.positions), indices: Object.freeze(bucket.indices) }),
  }));
  const asset = Object.freeze({
    id: recipe.id, displayName: recipe.displayName, category: 'Rootbound enclosure placeholders', version: 1,
    parts: Object.freeze(parts), collision: null, gameplay: Object.freeze({ role: 'prop' }),
  });
  const triangleCount = parts.reduce((total, part) => total + part.geometry.indices.length / 3, 0);
  return Object.freeze({ asset, bounds: boundsFromParts(parts), triangleCount, colorCount: parts.length, groundInset: recipe.groundInset });
}

/**
 * Returns four immutable, standalone low-prop assets and exact local bounds.
 * Input `visualAssets` is only read; importing this module performs no I/O.
 */
export function composeRootboundEnclosureAssets(visualAssets) {
  if (!Array.isArray(visualAssets)) throw new TypeError('composeRootboundEnclosureAssets requires a visualAssets array');
  const sources = new Map([[ROOT, sourceAsset(visualAssets, ROOT)], [LEAF, sourceAsset(visualAssets, LEAF)]]);
  const records = ROOTBOUND_ENCLOSURE_RECIPES.map(recipe => composeRecipe(recipe, sources));
  return Object.freeze({
    assets: Object.freeze(records.map(record => record.asset)),
    measurements: Object.freeze(records.map(({ asset, bounds, triangleCount, colorCount, groundInset }) => Object.freeze({ id: asset.id, bounds, triangleCount, colorCount, groundInset }))),
  });
}
