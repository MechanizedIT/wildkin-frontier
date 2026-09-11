import { getSurfaceHeight } from '../src/world/terrainSurfaceModel.js';

// Independent native review found these three existing objects screening
// resources or their approaches. Preserve the objects and their gameplay data.
export function composeShatterfenClearance(world) {
  const region = world.regions.find(entry => entry.id === 'section_2');
  for (const [id, x, z] of [
    ['prop_s2_arrival_reed_r', 12, 31],
    ['prop_s2_observatory_crystal', 29, 18],
    ['prop_s2_edge_basin_b', -35, 12],
  ]) {
    const prop = region.props.find(entry => entry.id === id);
    if (!prop) throw new Error(`Shatterfen clearance requires ${id}`);
    prop.pos = { x, y: getSurfaceHeight(region.surface, x, z), z };
  }
}
