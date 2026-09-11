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

let count = 0;
for (const [assetId,build] of VISUAL_KIT_BUILDERS) count += Number(bake(assetId,build));
writeGeneratedFile(WORLD_PATH, `${JSON.stringify(world)}\n`);
console.log(`Baked ${count} focused visual asset recipes into world.json.`);
