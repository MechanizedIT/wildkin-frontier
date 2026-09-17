// Curates a small, source-preserving slice of Kenney Nature Kit for Rootbound.
// The output is data only: catalog integration and world placement stay owned by
// the composition lane.  Every part is a flattened editable mesh recipe so the
// static low-scenery batcher can own the eventual draw path.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { meshRecipePart } from './mesh-recipe.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'art/source/rootbound-nature/kenney-nature-kit/Models/GLTF format');
const OUT = path.join(ROOT, 'assets/models/rootbound-nature');

// These deliberately keep Kenney's varied broadleaf silhouettes.  The slim
// tree becomes a birch-like edge punctuation through placement/tint, rather
// than pretending a conifer is a birch.
const PICKS = Object.freeze([
  { id: 'asset_rootbound_oak', source: 'tree_oak.glb', height: 9.6, role: 'canopy tree', collisionRadius: .72 },
  { id: 'asset_rootbound_birch', source: 'tree_thin.glb', height: 8.8, role: 'slender canopy tree', collisionRadius: .48 },
  { id: 'asset_rootbound_bush', source: 'plant_bushLarge.glb', height: 1.55, role: 'understory screen', collisionRadius: 0 },
  { id: 'asset_rootbound_fern', source: 'plant_flatTall.glb', height: 1.12, role: 'ground accent', collisionRadius: 0 },
  { id: 'asset_rootbound_fallen_log', source: 'log_large.glb', height: 1.15, role: 'route edge and fallen landmark', collisionRadius: 0 },
]);

const rounded = value => Number(value.toFixed(4));
const vec = value => ({ x: rounded(value.x), y: rounded(value.y), z: rounded(value.z) });
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
// Nature Kit's otherwise-untextured GLBs use a bright cyan/peach presentation
// palette.  Keep the mesh form, but map it to Rootbound's olive/wood palette;
// recipe format is one flat color per part and cannot carry source materials.
const ROOTBOUND_PALETTE = Object.freeze({
  '#70e6d6': '#4f7c43', '#73eddd': '#638a47', '#f2be9e': '#765039', '#fbedde': '#9a6b43',
});

async function loadGlb(file) {
  const bytes = await fs.readFile(file);
  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', resolve, reject));
  return { scene: gltf.scene, bytes };
}

function boundsOf(scene) {
  scene.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(scene);
}

function normalizeAtGround(scene, targetHeight) {
  const before = boundsOf(scene);
  const rawHeight = before.max.y - before.min.y;
  if (!(rawHeight > 0)) throw new Error(`Cannot normalize zero-height model (${rawHeight}).`);
  const s = targetHeight / rawHeight;
  scene.scale.setScalar(s);
  scene.updateMatrixWorld(true);
  const afterScale = boundsOf(scene);
  scene.position.y -= afterScale.min.y;
  scene.updateMatrixWorld(true);
}

function recipeFor(id, scene, source, role, collisionRadius) {
  const parts = [];
  scene.traverse(node => {
    if (!node.isMesh || !node.geometry?.getAttribute('position')) return;
    // Kenney's low-poly face structure is intentional.  Matte flat shading
    // keeps its chunky form readable under Rootbound's existing light.
    const part = meshRecipePart(`${id}_${parts.length}`, node);
    part.color = ROOTBOUND_PALETTE[part.color.toLowerCase()] ?? part.color;
    part.flatShading = true;
    part.roughness = 1;
    delete part.side;
    parts.push(part);
  });
  const box = boundsOf(scene);
  const size = box.getSize(new THREE.Vector3());
  const out = {
    id,
    source: `kenney-nature-kit/Models/GLTF format/${source}`,
    role,
    parts,
    bounds: { min: vec(box.min), max: vec(box.max), size: vec(size) },
    triangleCount: parts.reduce((sum, part) => sum + part.geometry.indices.length / 3, 0),
  };
  if (collisionRadius > 0) {
    out.collision = {
      // A deliberately narrow trunk-only box: foliage never blocks travel.
      shape: 'box', offset: { x: 0, y: rounded(size.y / 2), z: 0 },
      size: { x: collisionRadius * 2, y: rounded(size.y), z: collisionRadius * 2 },
    };
  }
  return out;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const assets = [];
  const files = [];
  for (const pick of PICKS) {
    const sourcePath = path.join(SOURCE, pick.source);
    const { scene, bytes } = await loadGlb(sourcePath);
    normalizeAtGround(scene, pick.height);
    const recipe = recipeFor(pick.id, scene, pick.source, pick.role, pick.collisionRadius);
    const destination = path.join(OUT, pick.source);
    await fs.copyFile(sourcePath, destination);
    assets.push(recipe);
    files.push({ id: pick.id, source: pick.source, sha256: sha256(bytes), bytes: bytes.length, recipe: 'rootbound-nature-recipes.json' });
  }
  const recipeDocument = { schema: 'rootbound-nature-recipe-v1', generatedBy: 'tools/import-rootbound-nature.mjs', assets };
  await fs.writeFile(path.join(OUT, 'rootbound-nature-recipes.json'), `${JSON.stringify(recipeDocument, null, 2)}\n`);
  const sourceZip = await fs.readFile(path.join(ROOT, 'art/source/rootbound-nature/kenney_nature-kit.zip'));
  const provenance = {
    source: { creator: 'Kenney', pack: 'Nature Kit 2.1', page: 'https://kenney.nl/assets/nature-kit', license: 'CC0-1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', archive: 'kenney_nature-kit.zip', archiveSha256: sha256(sourceZip) },
    imported: files,
    note: 'Selected files are unmodified source copies. Recipes flatten the source meshes and normalize their authored root to y=0 for Rootbound placement. The bright source cyan/peach material colors are remapped only in recipes to Rootbound olive/wood flat colors.',
  };
  await fs.writeFile(path.join(OUT, 'PROVENANCE.json'), `${JSON.stringify(provenance, null, 2)}\n`);
  // Keep acquisition evidence beside the unmodified archive as well as beside
  // the shipping subset, so later recipe changes cannot obscure its origin.
  await fs.writeFile(path.join(ROOT, 'art/source/rootbound-nature/PROVENANCE.json'), `${JSON.stringify(provenance, null, 2)}\n`);
  console.log(JSON.stringify(assets.map(asset => ({ id: asset.id, size: asset.bounds.size, triangles: asset.triangleCount, partCount: asset.parts.length, collision: asset.collision ?? null })), null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
