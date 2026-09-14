import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { WORLD_DATA } from '../src/world/data/world.generated.js';
import { describeVisualAssetCollider } from '../src/world/colliderDescriptor.js';
import { getSurfaceHeight } from '../src/world/terrainSurfaceModel.js';
import {
  HEARTWOOD_OPENING_PREFIX,
  HEARTWOOD_OPENING_PROPS,
  composeHeartwoodOpening,
} from '../tools/compose-heartwood-opening.mjs';

const jsonWorld = () => JSON.parse(fs.readFileSync(new URL('../src/world/data/world.json', import.meta.url), 'utf8'));
const campOf = world => world.regions.find(region => region.id === 'camp');
const owned = camp => camp.props.filter(prop => prop.id.startsWith(HEARTWOOD_OPENING_PREFIX));
const withoutOwned = world => {
  const clone = structuredClone(world), camp = campOf(clone);
  camp.props = camp.props.filter(prop => !prop.id.startsWith(HEARTWOOD_OPENING_PREFIX));
  return clone;
};

const SUPPORT_RADIUS = Object.freeze({
  asset_verge_canopy: 1.08,
  asset_verge_canopy_tall: 1.08,
  asset_verge_canopy_spread: 1.08,
  asset_fen_reed: .85,
  asset_fen_lily: .93,
  asset_cloudflower: .75,
  asset_pebble_cluster: .66,
  asset_mushroom_ring: 1.05,
});
const MODEL_PLAN = Object.freeze({
  asset_verge_canopy: [3.7, 2.5],
  asset_verge_canopy_tall: [3.2529, 2.2191],
  asset_verge_canopy_spread: [5.5446, 3.6492],
});

function authoredTriangleHeight(camp, x, z) {
  const { bounds, surface } = camp, width = bounds.maxX - bounds.minX, depth = bounds.maxZ - bounds.minZ;
  const nx = Math.ceil(width / .7), nz = Math.ceil(depth / .7), dx = width / nx, dz = depth / nz;
  const fx = (x - bounds.minX) / dx, fz = (z - bounds.minZ) / dz;
  const ix = Math.max(0, Math.min(nx - 1, Math.floor(fx))), iz = Math.max(0, Math.min(nz - 1, Math.floor(fz)));
  const u = fx - ix, v = fz - iz, x0 = bounds.minX + ix * dx, z0 = bounds.minZ + iz * dz;
  const a = getSurfaceHeight(surface, x0, z0), b = getSurfaceHeight(surface, x0 + dx, z0);
  const c = getSurfaceHeight(surface, x0, z0 + dz), d = getSurfaceHeight(surface, x0 + dx, z0 + dz);
  return (u + v <= 1 ? a + (c - a) * v + (b - a) * u : d + (b - d) * (1 - v) + (c - d) * (1 - u)) - .018;
}

test('Heartwood opening composition is prefix-only, ordered, idempotent, and generated-world synchronized', () => {
  const canonical = jsonWorld(), baseline = withoutOwned(canonical), before = structuredClone(baseline);
  composeHeartwoodOpening(baseline);
  assert.deepEqual(withoutOwned(baseline), before, 'every old record, collection and order stays exact');
  assert.deepEqual(owned(campOf(baseline)).map(prop => prop.id), HEARTWOOD_OPENING_PROPS.map(prop => prop.id));
  const once = JSON.stringify(baseline);
  composeHeartwoodOpening(baseline);
  assert.equal(JSON.stringify(baseline), once, 'a second composition is byte-identical');
  assert.deepEqual(canonical, WORLD_DATA, 'world.json and generated sibling agree');
  assert.deepEqual(owned(campOf(canonical)), owned(campOf(baseline)), 'canonical records match the pure composition');
});

test('Heartwood opening keeps complete support, honest trunk collision, clear lanes and prior footprints', () => {
  const world = jsonWorld(), camp = campOf(world), props = owned(camp), assets = new Map(world.visualAssets.map(asset => [asset.id, asset]));
  // Check the support sampler at real non-flat grid vertices, including the
  // far corner of the second triangle (indices b,c,d in createAuthoredTerrain).
  const dx = (camp.bounds.maxX - camp.bounds.minX) / Math.ceil((camp.bounds.maxX - camp.bounds.minX) / .7);
  const dz = (camp.bounds.maxZ - camp.bounds.minZ) / Math.ceil((camp.bounds.maxZ - camp.bounds.minZ) / .7);
  for (const [ix, iz] of [[71, 24], [72, 25], [73, 26], [74, 27]]) {
    const x = camp.bounds.minX + ix * dx, z = camp.bounds.minZ + iz * dz;
    assert.ok(Math.abs(authoredTriangleHeight(camp, x, z) - (getSurfaceHeight(camp.surface, x, z) - .018)) < 1e-8,
      'triangle support agrees with the actual authored vertex height');
  }
  assert.equal(props.length, 20);
  assert.equal(new Set(props.map(prop => prop.id)).size, 20);
  const trees = props.filter(prop => prop.collisionEnabled), lows = props.filter(prop => !prop.collisionEnabled);
  assert.equal(trees.length, 4); assert.equal(lows.length, 16);

  for (const prop of props) {
    const asset = assets.get(prop.visualAssetId), radius = SUPPORT_RADIUS[prop.visualAssetId] * prop.uniformScale;
    assert.equal(asset?.gameplay?.role, 'prop', `${prop.id} uses an admitted static prop`);
    assert.equal(prop.pos.y, Number(getSurfaceHeight(camp.surface, prop.pos.x, prop.pos.z).toFixed(4)), `${prop.id} is snapped`);
    let maximumSlope = 0, maximumMeshDelta = 0;
    for (let index = 0; index < 64; index++) {
      const angle = index / 64 * Math.PI * 2, x = prop.pos.x + Math.cos(angle) * radius, z = prop.pos.z + Math.sin(angle) * radius;
      const height = getSurfaceHeight(camp.surface, x, z);
      maximumSlope = Math.max(maximumSlope, Math.abs(height - prop.pos.y) / radius);
      maximumMeshDelta = Math.max(maximumMeshDelta, Math.abs(height - authoredTriangleHeight(camp, x, z)));
      assert.ok(x >= camp.bounds.minX && x <= camp.bounds.maxX && z >= camp.bounds.minZ && z <= camp.bounds.maxZ, `${prop.id} footprint stays authored`);
    }
    assert.ok(maximumSlope <= .32, `${prop.id} has full analytic support`);
    assert.ok(maximumMeshDelta <= .04, `${prop.id} follows the real .699301m triangle surface`);
    if (prop.collisionEnabled) {
      const descriptor = describeVisualAssetCollider({ collision: asset.collision, uniformScale: prop.uniformScale, position: prop.pos, rotationY: prop.rotY, enabled: true });
      assert.equal(descriptor.shape, 'box'); assert.equal(descriptor.enabled, true);
      const trunkHalfX = descriptor.size.width / 2 * (Math.abs(Math.cos(prop.rotY)) + Math.abs(Math.sin(prop.rotY)));
      assert.ok(Math.abs(prop.pos.x) - trunkHalfX >= 2, `${prop.id} trunk clears the four-metre lane`);
      const [width, depth] = MODEL_PLAN[prop.visualAssetId];
      const modelHalfX = prop.uniformScale / 2 * (Math.abs(Math.cos(prop.rotY)) * width + Math.abs(Math.sin(prop.rotY)) * depth);
      const modelHalfZ = prop.uniformScale / 2 * (Math.abs(Math.sin(prop.rotY)) * width + Math.abs(Math.cos(prop.rotY)) * depth);
      assert.ok(prop.pos.x - modelHalfX >= camp.bounds.minX && prop.pos.x + modelHalfX <= camp.bounds.maxX);
      assert.ok(prop.pos.z - modelHalfZ >= camp.bounds.minZ && prop.pos.z + modelHalfZ <= camp.bounds.maxZ);
    } else {
      assert.equal(describeVisualAssetCollider({ collision: asset.collision, uniformScale: prop.uniformScale, position: prop.pos, rotationY: prop.rotY, enabled: false }).shape, 'none');
      assert.ok(Math.abs(prop.pos.x) - radius >= 1.5, `${prop.id} leaves the three-metre readable floor`);
    }
  }

  const backgroundRadius = { asset_verge_canopy: 2.233, asset_verge_canopy_tall: 1.969, asset_verge_canopy_spread: 3.319 };
  const previous = camp.props.filter(prop => prop.id.startsWith('prop_camp_background_'));
  for (const prop of props) for (const prior of previous) {
    const priorRadius = backgroundRadius[prior.visualAssetId] * prior.uniformScale;
    assert.ok(Math.hypot(prop.pos.x - prior.pos.x, prop.pos.z - prior.pos.z) > SUPPORT_RADIUS[prop.visualAssetId] * prop.uniformScale + priorRadius,
      `${prop.id} clears ${prior.id}`);
  }
});
