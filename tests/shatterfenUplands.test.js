import assert from 'node:assert/strict';
import test from 'node:test';
import WORLD_DATA from '../src/world/data/world.generated.js';
import { getSurfaceHeight, getWaterRadius, validateSurface } from '../src/world/terrainSurfaceModel.js';
import { normalizeWorldData } from '../src/world/worldValidator.js';
import { describeVisualAssetCollider, getColliderCenter } from '../src/world/colliderDescriptor.js';
import { composeShatterfenUplands, outlinedHeight, SHATTERFEN_UPLANDS } from '../tools/compose-shatterfen-uplands.mjs';

const region = (world) => world.regions.find((entry) => entry.id === 'section_2');
const byId = (items, id) => items.find((entry) => entry.id === id);
const clone = () => structuredClone(WORLD_DATA);
const composed = () => composeShatterfenUplands(clone());
const xz = (entry) => ({ x: entry.pos.x, z: entry.pos.z });
const CORE_ROUTE_MARGIN = .2;
const ROUTE_COLLIDER_CLEARANCE = .7;
const NAV_ROUTE_IDS = Object.freeze([
  'fen-return-silt', 'fen-creek-west-crossing', 'fen-creek-east-crossing', 'fen-tidefin-bank',
  'fen-observatory-forecourt', 'fen-observatory-middle-grade', 'fen-observatory-high-loop',
  'fen-far-bank-shoulder', 'fen-wreck-return-descent', 'fen-gate-spur', 'fen-wreck-cache-shelf',
]);

function withoutSupportY(entry) {
  const copy = structuredClone(entry);
  if (copy.pos) delete copy.pos.y;
  if (copy.homePos) delete copy.homePos.y;
  if (copy.runSpawn?.position) delete copy.runSpawn.position.y;
  return copy;
}

function routeSamples(route, offsets) {
  const samples = [];
  for (let index = 1; index < route.points.length; index += 1) {
    const a = route.points[index - 1], b = route.points[index];
    const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    const nx = -dz / length, nz = dx / length, steps = Math.max(1, Math.ceil(length * 4));
    for (let step = index === 1 ? 0 : 1; step <= steps; step += 1) {
      const t = step / steps;
      for (const offset of offsets) samples.push({
        x: a.x + dx * t + nx * offset,
        z: a.z + dz * t + nz * offset,
      });
    }
  }
  return samples;
}

function coreOffsets(route) {
  const inner = route.width / 2 - CORE_ROUTE_MARGIN;
  // The right edge of this particular bank deliberately meets the Tidefin
  // shallows. The center and left inner track are its defined dry snare lane.
  return route.id === 'fen-tidefin-bank' ? [0, -inner] : [0, -inner, inner];
}

function horizontalClearance(collider, x, z) {
  const center = getColliderCenter(collider), angle = -(collider.rotationY ?? 0);
  const dx = x - center.x, dz = z - center.z, cosine = Math.cos(angle), sine = Math.sin(angle);
  const localX = dx * cosine - dz * sine, localZ = dx * sine + dz * cosine;
  return Math.hypot(
    Math.max(Math.abs(localX) - collider.size.width / 2, 0),
    Math.max(Math.abs(localZ) - collider.size.depth / 2, 0),
  );
}

function footprintBounds(colliders) {
  const xs = [], zs = [];
  for (const collider of colliders) {
    const center = getColliderCenter(collider), cosine = Math.cos(collider.rotationY ?? 0), sine = Math.sin(collider.rotationY ?? 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      xs.push(center.x + sx * collider.size.width / 2 * cosine - sz * collider.size.depth / 2 * sine);
      zs.push(center.z + sx * collider.size.width / 2 * sine + sz * collider.size.depth / 2 * cosine);
    }
  }
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs), width: Math.max(...xs) - Math.min(...xs), depth: Math.max(...zs) - Math.min(...zs) };
}

test('Shatterfen uplands is idempotent, bounded, and validates against the actual canonical clone', () => {
  const world = clone(), source = clone();
  composeShatterfenUplands(world);
  const once = structuredClone(world);
  composeShatterfenUplands(world);
  assert.deepEqual(world, once);
  assert.deepEqual(world.regions.filter((entry) => entry.id !== 'section_2'), source.regions.filter((entry) => entry.id !== 'section_2'));
  const fen = region(world);
  assert.deepEqual(fen.bounds, SHATTERFEN_UPLANDS.bounds);
  assert.deepEqual(fen.size, { width: 100, depth: 100 });
  assert.equal(fen.boundaryColliders.length, 4);
  assert.doesNotThrow(() => validateSurface(fen.surface));
  assert.doesNotThrow(() => normalizeWorldData(world));
  assert.ok(fen.props.every((entry) => world.visualAssets.some((asset) => asset.id === entry.visualAssetId)), 'every composed prop resolves an admitted asset');
});

test('a full Author import cannot retain obsolete Shatterfen pad or course mechanics', () => {
  const world = clone(), fen = region(world);
  fen.jumpPads = [{ id: 'obsolete_pad', pos: { x: 1, y: 0, z: 1 } }];
  fen.parkourStarts = [{ id: 'obsolete_start', pos: { x: 2, y: 0, z: 2 } }];
  fen.parkourCheckpoints = [{ id: 'obsolete_checkpoint', pos: { x: 3, y: 0, z: 3 } }];
  fen.parkourEnds = [{ id: 'obsolete_end', pos: { x: 4, y: 0, z: 4 } }];
  fen.parkourCourseZones = [{ id: 'obsolete_zone', pos: { x: 5, y: 0, z: 5 } }];
  fen.traversal = { platforms: [{ id: 'obsolete_platform' }], obstacles: [{ id: 'obsolete_obstacle' }], climbables: [{ id: 'obsolete_climb' }], jumpTraversals: [{ id: 'obsolete_jump' }] };
  composeShatterfenUplands(world);
  assert.deepEqual(region(world).jumpPads, []);
  assert.deepEqual(region(world).parkourStarts, []);
  assert.deepEqual(region(world).parkourCheckpoints, []);
  assert.deepEqual(region(world).parkourEnds, []);
  assert.deepEqual(region(world).parkourCourseZones, []);
  assert.deepEqual(region(world).traversal, { platforms: [], obstacles: [], climbables: [], jumpTraversals: [] });
});

test('protected roles retain their exact fields and only rebase support height', () => {
  const sourceWorld = clone(), source = region(sourceWorld), world = composed(), fen = region(world);
  const check = (collection, ids) => {
    for (const id of ids) {
      const before = byId(source[collection], id), after = byId(fen[collection], id);
      assert.ok(before && after, `${id} remains present`);
      assert.deepEqual(xz(after), xz(before), `${id} keeps its protected X/Z`);
      assert.deepEqual(withoutSupportY(after), withoutSupportY(before), `${id} preserves its role fields`);
      assert.equal(after.pos.y, Number(getSurfaceHeight(fen.surface, after.pos.x, after.pos.z).toFixed(4)), `${id} is rebased through shared terrain`);
    }
  };
  check('resources', SHATTERFEN_UPLANDS.protectedResourceIds);
  check('props', SHATTERFEN_UPLANDS.protectedHarvestPropIds);
  check('props', SHATTERFEN_UPLANDS.wildkinPropIds);
  check('entryPoints', ['entry_section_2']);
  check('portalGates', ['gate_section_2_to_1', 'gate_section_2_to_3']);
  check('majorWaypoints', ['wp_section_2']);
  check('extractionBeacons', ['beacon_section_2']);
  check('lootChests', ['chest_secret_section_2', 'chest_parkour_section_2', 'chest_tidefin_secret']);
  const receiver = byId(fen.props, 'prop_s2_observatory_arch'), sourceReceiver = byId(source.props, 'prop_s2_observatory_arch');
  assert.equal(receiver.visualAssetId, 'asset_fen_observatory');
  assert.deepEqual(withoutSupportY(receiver), withoutSupportY(sourceReceiver), 'receiver keeps its exact authored transform and role');
  assert.deepEqual(
    world.visualAssets.find((entry) => entry.id === receiver.visualAssetId),
    sourceWorld.visualAssets.find((entry) => entry.id === sourceReceiver.visualAssetId),
    'receiver motion/collision metadata remains the admitted source metadata',
  );
  assert.equal(fen.props.filter((entry) => entry.visualAssetId === 'asset_wildkin_tidefin').length, 2, 'only the two audited Tidefin actors exist');
  assert.equal(fen.props.filter((entry) => entry.visualAssetId === 'asset_thornprowler').length, 1, 'only the audited far-bank Thornprowler exists');
});

test('the low creek, dry Tidefin bank, stepped observatory, and wreck loop have dry sampled core bands', () => {
  const fen = region(composed()), routeById = (id) => byId(fen.surface.routes, id);
  for (const id of NAV_ROUTE_IDS) {
    const route = routeById(id);
    assert.ok(route.width >= 3.25, `${id} has a companion-usable width`);
    for (const point of routeSamples(route, coreOffsets(route))) {
      assert.ok(getWaterRadius(fen.surface, point.x, point.z) >= 1, `${id} core band stays outside renderer water at ${point.x.toFixed(2)},${point.z.toFixed(2)}`);
    }
  }
  for (const [x, z] of [[-30, 11], [-34, 3], [-21, 14], [-44, -34], [-28, -15], [23, 8], [19, 11]]) {
    assert.ok(getWaterRadius(fen.surface, x, z) >= .9, `protected approach stays outside rendered water radius at ${x},${z}`);
  }
  for (const id of SHATTERFEN_UPLANDS.wildkinPropIds.slice(0, 2)) {
    const tidefin = byId(fen.props, id);
    assert.ok(getWaterRadius(fen.surface, tidefin.pos.x, tidefin.pos.z) < .87, `${id} remains water-side`);
  }
  assert.equal(getSurfaceHeight(fen.surface, 23, 8), 1.2, 'receiver forecourt stays low');
  assert.equal(getSurfaceHeight(fen.surface, 34, 16), 2.2, 'middle peat plate is distinct');
  assert.equal(getSurfaceHeight(fen.surface, 42, 6), 3.3, 'rear peat plate is distinct');
  assert.equal(getSurfaceHeight(fen.surface, -44, -34), 4.25, 'wreck cache shelf has the high lookout support');
  const supply = byId(fen.lootChests, 'chest_shatterfen_wreck_supply');
  assert.deepEqual(supply.pos, { x: -44, y: 4.25, z: -34 });
  assert.equal(supply.lootTableId, 'loot_shatterfen_parkour');
  assert.equal(supply.refillSeconds, 86400);
});

test('V3 joins the western drainage and consolidates the northeast bank without adding a wet traversal shortcut', () => {
  const fen = region(composed());
  const water = new Map(fen.surface.water.map((entry) => [entry.id, entry]));
  assert.equal(water.size, 7, 'V3 replaces the paired northeast ornaments with one peat indentation');
  assert.ok(water.has('fen-peat-north-indentation'));
  assert.equal(water.has('fen-peat-east-indentation'), false, 'there is no detached east pond');
  // These are interior overlap samples between the distinct western authored
  // reaches, rather than a test of renderer paint constants. Their dry route
  // bands are separately sampled above at quarter-metre density.
  for (const [x, z] of [[-28, 20.5], [-35.5, 16], [-37, 7]]) {
    assert.ok(getWaterRadius(fen.surface, x, z) < .9, `western reaches visibly overlap at ${x},${z}`);
  }
  const scenic = new Map(fen.props.filter((entry) => entry.id.startsWith('prop_shatterfen_')).map((entry) => [entry.id, entry]));
  const cluster = (ids, maximumSpan, label) => {
    const entries = ids.map((id) => scenic.get(id));
    assert.ok(entries.every(Boolean), `${label} keeps its admitted scenic members`);
    for (let a = 0; a < entries.length; a += 1) for (let b = a + 1; b < entries.length; b += 1) {
      assert.ok(Math.hypot(entries[a].pos.x - entries[b].pos.x, entries[a].pos.z - entries[b].pos.z) <= maximumSpan, `${label} reads as a grouped bank edge`);
    }
  };
  cluster(['prop_shatterfen_tidefin_rim_reed_a', 'prop_shatterfen_west_reed_c', 'prop_shatterfen_west_lily_b'], 3.2, 'northwest reed cluster');
  cluster(['prop_shatterfen_peat_reed_a', 'prop_shatterfen_peat_reed_b', 'prop_shatterfen_peat_lily_a'], 3.2, 'peat reed cluster');
  cluster(['prop_shatterfen_east_face_a', 'prop_shatterfen_east_face_b', 'prop_shatterfen_east_face_c'], 4.3, 'upper eastern stone face');
  cluster(['prop_shatterfen_east_face_d', 'prop_shatterfen_east_face_e'], 3.2, 'peat-toe stone face');
});

test('every collision-enabled visual asset clears each full core route band', () => {
  const world = composed(), fen = region(world), assets = new Map(world.visualAssets.map((entry) => [entry.id, entry]));
  const colliders = fen.props.filter((entry) => entry.collisionEnabled).map((entry) => ({
    id: entry.id,
    collider: describeVisualAssetCollider({ collision: assets.get(entry.visualAssetId)?.collision, uniformScale: entry.uniformScale, position: entry.pos, rotationY: entry.rotY, enabled: true }),
  })).filter((entry) => entry.collider.enabled);
  for (const id of NAV_ROUTE_IDS) {
    const route = byId(fen.surface.routes, id);
    for (const sample of routeSamples(route, coreOffsets(route))) for (const { id: colliderId, collider } of colliders) {
    assert.ok(horizontalClearance(collider, sample.x, sample.z) >= ROUTE_COLLIDER_CLEARANCE,
      `${route.id} keeps ${ROUTE_COLLIDER_CLEARANCE}m clearance from ${colliderId} at ${sample.x.toFixed(2)},${sample.z.toFixed(2)}`);
    }
  }
});

test('composition removes old perimeter scatter without deleting admitted bank supports or creating the omitted target mark', () => {
  const fen = region(composed());
  assert.ok(fen.props.some((entry) => entry.id.startsWith('prop_fen_bank_')), 'admitted bank support family remains');
  assert.ok(fen.props.some((entry) => entry.id === 'prop_shatterfen_wreck_frame'), 'existing survey cargo frame composes the northwest wreck');
  assert.equal(fen.props.some((entry) => /central.*(mark|actor)|extra.*tidefin/i.test(entry.id)), false, 'the ambiguous central target mark creates no runtime object');
  assert.equal(fen.props.filter((entry) => entry.id.startsWith('prop_s2_') && ![
    ...SHATTERFEN_UPLANDS.protectedHarvestPropIds, ...SHATTERFEN_UPLANDS.wildkinPropIds, 'prop_s2_observatory_arch',
  ].includes(entry.id)).length, 0, 'obsolete generic Shatterfen scatter is replaced rather than silently retained');
  assert.deepEqual(outlinedHeight('fixture', 2, 1, [{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 2 }, { x: 0, z: 2 }]), {
    id: 'fixture', x: 2, z: 1, rx: 2, rz: 1, height: 2, edgeWidth: 1,
    outline: [{ x: -1, z: -1 }, { x: 1, z: -1 }, { x: 1, z: 1 }, { x: -1, z: 1 }],
  });
});

test('every composed scenic prop stays a non-dynamic prop, preserving exact runtime role totals', () => {
  const world = composed(), fen = region(world), assets = new Map(world.visualAssets.map((asset) => [asset.id, asset]));
  const scenic = fen.props.filter((entry) => entry.id.startsWith('prop_shatterfen_'));
  assert.ok(scenic.length > 20, 'V2 adds bounded grouped scenery rather than hidden gameplay objects');
  for (const entry of scenic) {
    const asset = assets.get(entry.visualAssetId);
    assert.equal(asset?.gameplay?.role, 'prop', `${entry.id} uses an unambiguous scenic asset role`);
    assert.equal(asset?.gameplay?.harvestable, undefined, `${entry.id} cannot register a harvest node`);
    assert.equal(asset?.gameplay?.wildkin, undefined, `${entry.id} cannot register an actor`);
  }
  const role = (entry) => assets.get(entry.visualAssetId)?.gameplay?.role;
  const harvestableProps = fen.props.filter((entry) => role(entry) === 'harvestable');
  const wildkinProps = fen.props.filter((entry) => role(entry) === 'wildkin');
  assert.deepEqual(harvestableProps.map((entry) => entry.id).sort(), [...SHATTERFEN_UPLANDS.protectedHarvestPropIds].sort(), 'only the three admitted harvestable props dynamically register');
  assert.deepEqual(wildkinProps.map((entry) => entry.id).sort(), [...SHATTERFEN_UPLANDS.wildkinPropIds].sort(), 'only the two Tidefin and Thornprowler dynamically register');
  assert.equal(fen.resources.length, 7, 'seven authored renewable records remain');
  assert.equal(fen.resources.length + harvestableProps.length, 10, 'runtime resource total is exactly seven renewables plus three admitted harvest props');
  assert.equal(wildkinProps.length, 3, 'runtime actor total is exactly the admitted three');
});

test('the grounded wreck uses measured GLB bounds for one readable bounded northwest silhouette', () => {
  const world = composed(), fen = region(world), assets = new Map(world.visualAssets.map((asset) => [asset.id, asset]));
  const ids = ['prop_shatterfen_wreck_frame', 'prop_shatterfen_wreck_panel_a', 'prop_shatterfen_wreck_panel_b'];
  const raw = {
    frame: assets.get('asset_survey_cargo_frame').collision.size,
    panel: assets.get('asset_survey_panel_debris').collision.size,
  };
  assert.deepEqual(raw.frame, { w: 1.4100000858306885, h: .7500000596046448, d: 1.0537104606628418 }, 'cargo-frame GLB bounds are measured from its admitted descriptor');
  assert.deepEqual(raw.panel, { w: 2.109999895095825, h: .45500001311302185, d: 1.409999966621399 }, 'panel GLB bounds are measured from its admitted descriptor');
  const colliders = ids.map((id) => {
    const entry = byId(fen.props, id), asset = assets.get(entry.visualAssetId);
    assert.equal(entry.pos.y, Number(getSurfaceHeight(fen.surface, entry.pos.x, entry.pos.z).toFixed(4)), `${id} is grounded through the shared surface`);
    return describeVisualAssetCollider({ collision: asset.collision, uniformScale: entry.uniformScale, position: entry.pos, rotationY: entry.rotY, enabled: true });
  });
  const footprint = footprintBounds(colliders);
  assert.ok(footprint.width >= 7 && footprint.width <= 9, `wreck width stays in the 7–9m envelope (${footprint.width.toFixed(2)}m)`);
  assert.ok(footprint.depth >= 4 && footprint.depth <= 6, `wreck depth stays in the 4–6m envelope (${footprint.depth.toFixed(2)}m)`);
  const cache = byId(fen.lootChests, 'chest_shatterfen_wreck_supply');
  assert.ok(Math.hypot(cache.pos.x - byId(fen.props, 'prop_shatterfen_wreck_panel_b').pos.x, cache.pos.z - byId(fen.props, 'prop_shatterfen_wreck_panel_b').pos.z) > 3, 'the cache remains visibly separate from the secondary wreck break');
});
