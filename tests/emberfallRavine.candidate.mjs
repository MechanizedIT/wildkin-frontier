import assert from 'node:assert/strict';
// Unintegrated candidate: 3/4 checks pass; the west descent/foundry grade fails.
// Explicitly run with node --test. Restore .test.js only after the merge is fixed.
// See docs/EMBERFALL_CANDIDATE_HANDOFF.md; never import this candidate into runtime yet.
import { describe, it } from 'node:test';
import WORLD_DATA from '../src/world/data/world.generated.js';
import { getSurfaceHeight, validateSurface } from '../src/world/terrainSurfaceModel.js';
import { normalizeWorldData } from '../src/world/worldValidator.js';
import { composeEmberfallRavine, EMBERFALL_RAVINE } from '../tools/compose-emberfall-ravine.mjs';

const section = (world) => world.regions.find((entry) => entry.id === 'section_3');
const find = (items, id) => items.find((entry) => entry.id === id);
const clone = () => structuredClone(WORLD_DATA);
const composed = () => composeEmberfallRavine(clone());

function routeGrade(route) {
  return route.points.slice(1).map((point, index) => {
    const prior = route.points[index];
    return Math.abs(point.elevation - prior.elevation) / Math.hypot(point.x - prior.x, point.z - prior.z);
  });
}

function samplesAcross(route, fraction = .49) {
  const samples = [];
  for (let index = 1; index < route.points.length; index += 1) {
    const a = route.points[index - 1], b = route.points[index];
    const dx = b.x - a.x, dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    const nx = -dz / length, nz = dx / length;
    for (const t of [0, .25, .5, .75, 1]) {
      const x = a.x + dx * t, z = a.z + dz * t;
      for (const side of [-fraction, 0, fraction]) samples.push({ x: x + nx * route.width * side, z: z + nz * route.width * side });
    }
  }
  return samples;
}

function localGrade(surface, a, b) {
  return Math.abs(getSurfaceHeight(surface, b.x, b.z) - getSurfaceHeight(surface, a.x, a.z)) / Math.hypot(b.x - a.x, b.z - a.z);
}

describe('Emberfall ravine standalone composition', () => {
  it('is idempotent, bounded to Emberfall, and validates its shared terrain', () => {
    const world = clone();
    const others = JSON.stringify(world.regions.filter((entry) => entry.id !== 'section_3'));
    composeEmberfallRavine(world);
    const first = JSON.stringify(world);
    composeEmberfallRavine(world);
    assert.equal(JSON.stringify(world), first);
    assert.equal(JSON.stringify(world.regions.filter((entry) => entry.id !== 'section_3')), others);
    const emberfall = section(world);
    assert.deepEqual(emberfall.bounds, EMBERFALL_RAVINE.bounds);
    assert.deepEqual(emberfall.size, { width: 120, depth: 120 });
    assert.doesNotThrow(() => validateSurface(emberfall.surface));
    assert.doesNotThrow(() => normalizeWorldData(world));
    assert.equal(emberfall.surface.heights.length, 9, 'six ravine masses plus three protected foundry fields');
    assert.equal(emberfall.surface.heights.filter((height) => height.outline).length, 6, 'all new ravine masses have irregular outlines');
    assert.equal(emberfall.props.filter((entry) => entry.id.startsWith(EMBERFALL_RAVINE.foundryPrefix)).length, 27);
  });

  it('preserves every gameplay identity, X/Z, role-bearing transform and reward ledger', () => {
    const source = section(clone());
    const emberfall = section(composed());
    const sourceProps = new Map(source.props.map((entry) => [entry.id, entry]));
    const sourceResources = new Map(source.resources.map((entry) => [entry.id, entry]));
    for (const id of EMBERFALL_RAVINE.gameplayPropIds) {
      const before = sourceProps.get(id), after = find(emberfall.props, id);
      assert.ok(after, `${id} remains`);
      assert.equal(after.pos.x, before.pos.x); assert.equal(after.pos.z, before.pos.z);
      assert.equal(after.visualAssetId, before.visualAssetId); assert.equal(after.uniformScale, before.uniformScale);
      assert.equal(after.rotY, before.rotY); assert.equal(after.collisionEnabled, before.collisionEnabled);
    }
    for (const id of EMBERFALL_RAVINE.resourceIds) {
      const before = sourceResources.get(id), after = find(emberfall.resources, id);
      assert.deepEqual({ id: after.id, type: after.type, level: after.level, x: after.pos.x, z: after.pos.z }, { id: before.id, type: before.type, level: before.level, x: before.pos.x, z: before.pos.z });
    }
    const families = [['entryPoints', 'entry_section_3'], ['portalGates', 'gate_section_3_to_2'], ['portalGates', 'gate_section_3_to_4'], ['majorWaypoints', 'wp_section_3'], ['extractionBeacons', 'beacon_section_3'], ['lootChests', 'chest_secret_section_3'], ['lootChests', 'chest_parkour_section_3'], ['lootChests', 'chest_emberhorn_secret']];
    for (const [field, id] of families) {
      const before = find(source[field], id), after = find(emberfall[field], id);
      assert.equal(after.pos.x, before.pos.x, `${id} X`); assert.equal(after.pos.z, before.pos.z, `${id} Z`);
      if (before.lootTableId) assert.equal(after.lootTableId, before.lootTableId, `${id} reward table`);
      if (before.requirements) assert.deepEqual(after.requirements, before.requirements, `${id} requirements`);
    }
    assert.deepEqual(emberfall.lootChests.map((entry) => entry.id).sort(), source.lootChests.map((entry) => entry.id).sort(), 'no new loot identity');
    assert.deepEqual(emberfall.props.map((entry) => entry.id).sort(), source.props.map((entry) => entry.id).sort(), 'no new prop identity');
  });

  it('keeps the old foundry island and its protected corridor relationship', () => {
    const source = section(clone());
    const emberfall = section(composed());
    for (const before of source.props.filter((entry) => entry.id.startsWith(EMBERFALL_RAVINE.foundryPrefix))) {
      const after = find(emberfall.props, before.id);
      assert.deepEqual(after.pos, before.pos, `${before.id} stays on its accepted foundry support`);
    }
    const tie = EMBERFALL_RAVINE.foundryTie;
    assert.equal(getSurfaceHeight(emberfall.surface, tie.x, tie.z), tie.y, 'foundry tie remains at its exact old support height');
    const returnRoute = find(emberfall.surface.routes, 'ember-foundry-protected-return');
    assert.ok(returnRoute.width >= 4.8 && returnRoute.feather >= 2.8, 'foundry return preserves a full approach corridor');
    for (const point of returnRoute.points) assert.ok(Math.abs(getSurfaceHeight(emberfall.surface, point.x, point.z) - point.elevation) < .000001, `foundry return support at ${point.x},${point.z}`);
    for (const id of ['beacon_section_3', 'chest_secret_section_3', 'chest_emberhorn_secret']) {
      const item = find(emberfall[id.startsWith('chest') ? 'lootChests' : 'extractionBeacons'], id);
      assert.equal(item.pos.y, Number(getSurfaceHeight(emberfall.surface, item.pos.x, item.pos.z).toFixed(4)), `${id} grounds to protected local support`);
    }
  });

  it('authors a continuous, wide loop with bounded real-surface grade and reaches the existing high cache', () => {
    const emberfall = section(composed());
    const routes = new Map(emberfall.surface.routes.map((entry) => [entry.id, entry]));
    const walkingIds = ['ember-west-ascent', 'ember-west-foundry-descent', 'ember-east-ascent', 'ember-east-descent'];
    for (const id of walkingIds) {
      const route = routes.get(id);
      assert.ok(route.width >= 5.4, `${id} has a 5.4m usable lane`);
      assert.ok(Math.max(...routeGrade(route)) <= .45, `${id} centerline grade stays inside the local limit`);
      const across = samplesAcross(route);
      for (let index = 1; index < across.length; index += 1) {
        const a = across[index - 1], b = across[index];
        if (Math.hypot(a.x - b.x, a.z - b.z) > 3.5) continue;
        assert.ok(localGrade(emberfall.surface, a, b) <= .45, `${id} shared-surface grade is safe across its usable width`);
      }
    }
    const cache = find(emberfall.lootChests, 'chest_parkour_section_3');
    assert.equal(cache.pos.y, 12, 'the retained Cinder Shelf Cache occupies the twelve-metre shoulder');
    assert.equal(getSurfaceHeight(emberfall.surface, 43, 1), 16, 'east summit reaches the selected sixteen-metre height');
    assert.ok(getSurfaceHeight(emberfall.surface, -39, 11) >= 11.9, 'west overlook reaches the selected twelve-metre ridge');
    assert.deepEqual(emberfall.traversal.jumpTraversals, [], 'walking routes are admitted before any optional shortcut');
    assert.equal(emberfall.jumpPads.length + emberfall.parkourStarts.length + emberfall.parkourCheckpoints.length + emberfall.parkourEnds.length, 0, 'legacy course containers are cleared');
  });
});
