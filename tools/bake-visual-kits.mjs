#!/usr/bin/env node
// Bake only the maintained custom mesh kits into their existing Visual Asset
// recipes.  Placement, collision, gameplay metadata, and every other asset
// remain authored data; this script never composes or rearranges a world.
import fs from "node:fs";
import { meshRecipePart } from './mesh-recipe.mjs';
import {VISUAL_KIT_BUILDERS} from './visual-kit-registry.mjs';
import {writeGeneratedFile} from './write-generated-file.mjs';

const WORLD_PATH = new URL("../src/world/data/world.json", import.meta.url);
const world = JSON.parse(fs.readFileSync(WORLD_PATH, "utf8"));

function bake(assetId, createVisual) {
  let asset = world.visualAssets.find((entry) => entry.id === assetId);
  // Reviewed external revisions own their render geometry; rebaking primitive
  // recipes must not silently reintroduce their retired mesh payload.
  if (asset?.model) return false;
  const visual = createVisual(assetId);
  if (!visual) return false;
  if (!asset) {
    asset = { id: assetId, displayName: assetId.replace(/^asset_/, "").replaceAll("_", " "), category: "Environment", version: 1, parts: [], collision: null, gameplay: { role: "prop" } };
    world.visualAssets.push(asset);
  }
  visual.updateMatrixWorld(true);
  const meshes = [];
  visual.traverse((node) => { if (node.isMesh) meshes.push(node); });
  asset.parts = meshes.map((mesh, index) => meshRecipePart(`mesh_${index}`, mesh));
  return true;
}

// A reviewed single-asset repair must not rebake unrelated kit experiments.
// Validate the complete selection before the first mutation or file write.
const args = process.argv.slice(2), selected = [];
for (let i = 0; i < args.length; i += 2) {
  if (args[i] !== '--asset' || !args[i + 1] || args[i + 1].startsWith('--')) {
    throw new Error('Usage: bake-visual-kits.mjs [--asset <existing-kit-id>]...');
  }
  const id = args[i + 1], asset = world.visualAssets.find(entry => entry.id === id);
  if (!VISUAL_KIT_BUILDERS.has(id) || !asset || asset.model || selected.includes(id)) {
    throw new Error(`Asset selection must be an existing unique code-native kit: ${id}`);
  }
  selected.push(id);
}
const builders = selected.length ? selected.map(id => [id, VISUAL_KIT_BUILDERS.get(id)]) : VISUAL_KIT_BUILDERS;
let count = 0;
for (const [assetId,build] of builders) count += Number(bake(assetId,build));
writeGeneratedFile(WORLD_PATH, `${JSON.stringify(world)}\n`);
console.log(`Baked ${count} focused visual asset recipes into world.json.`);
