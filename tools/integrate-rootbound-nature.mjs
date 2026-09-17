import fs from 'node:fs/promises';
const path = 'src/world/data/world.json';
const world = JSON.parse(await fs.readFile(path, 'utf8'));
const kit = JSON.parse(await fs.readFile('assets/models/rootbound-nature/rootbound-nature-recipes.json', 'utf8'));
for (const recipe of kit.assets) {
  const asset = { id: recipe.id, displayName: recipe.id.replace('asset_rootbound_', 'Rootbound ').replaceAll('_', ' '),
    category: 'Rootbound Forest', version: 1, parts: recipe.parts,
    gameplay: { role: 'prop' },
    ...(recipe.collision ? { collision: { ...recipe.collision,
      size: { w: recipe.collision.size.x, h: recipe.collision.size.y, d: recipe.collision.size.z } } } : {}),
  };
  const index = world.visualAssets.findIndex(a => a.id === asset.id);
  if (index === -1) world.visualAssets.push(asset); else world.visualAssets[index] = asset;
}
await fs.writeFile(path, JSON.stringify(world) + '\n');
console.log(`Integrated ${kit.assets.length} CC0 nature assets.`);
