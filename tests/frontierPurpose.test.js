import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE_PIECES, FIELD_RECIPES } from '../src/base/baseCatalog.js';
import { CAMP_CROP_GROWTH_SECONDS } from '../src/base/campGardenState.js';
import { CAMP_BREEDING_GROWTH_SECONDS } from '../src/companions/campBreedingState.js';
import { getFrontierPurpose } from '../src/progression/frontierPurpose.js';

const mossling = Object.freeze({ id: 'mossling_a', speciesId: 'mossling' });
const piece = id => BASE_PIECES.find(candidate => candidate.id === id);
const recipe = id => FIELD_RECIPES.find(candidate => candidate.id === id);
const built = (...types) => types.map((type, index) => ({ id: `build_${index + 1}`, type }));

function state(overrides = {}) {
  return {
    ownedWildkin: [],
    fieldSupplies: {},
    base: { structures: [] },
    campCare: null,
    campCrop: null,
    campBreeding: null,
    ...overrides,
  };
}

test('a pending bond and an injured active Mossling take priority over the fresh-player loop', () => {
  const pending = getFrontierPurpose({
    state: state(),
    pendingCompanions: [{ id: 'pending_1', speciesId: 'mossling' }],
    isCamp: false,
    health: 1,
    maxHealth: 5,
    activeSpeciesId: 'mossling',
    ability: { speciesId: 'mossling', name: 'Bloom', ready: true },
  });
  assert.equal(pending.id, 'return-pending-bond');
  assert.match(pending.description, /Camp arch.*RETURN TO CAMP.*confirm Return to Camp/);

  const bloom = getFrontierPurpose({
    state: state({ ownedWildkin: [mossling] }),
    isCamp: false,
    health: 3,
    maxHealth: 5,
    activeSpeciesId: 'mossling',
    ability: { speciesId: 'mossling', name: 'Bloom', ready: true },
  });
  assert.equal(bloom.id, 'use-bloom');
  assert.equal(bloom.abilityHint, 'mossling');

  const wrongAbility = getFrontierPurpose({
    state: state({ ownedWildkin: [mossling] }),
    isCamp: false,
    health: 3,
    maxHealth: 5,
    activeSpeciesId: 'mossling',
    ability: { speciesId: 'emberhorn', name: 'Cragbreaker', ready: true },
  });
  assert.notEqual(wrongAbility.id, 'use-bloom');

  const atCamp = getFrontierPurpose({
    state: state({ ownedWildkin: [mossling] }),
    isCamp: true,
    health: 3,
    maxHealth: 5,
    activeSpeciesId: 'mossling',
    ability: { speciesId: 'mossling', name: 'Bloom', ready: true },
  });
  assert.notEqual(atCamp.id, 'use-bloom');
});

test('the berry lure path follows the live recipe cost and physical Camp boundary', () => {
  const lure = recipe('berry_lure');
  const opening = getFrontierPurpose({ state: state() });
  assert.deepEqual(opening, {
    id: 'gather-berry-lure',
    title: 'Explore beyond Camp',
    description: 'Bring wood, stone and fiber home to build. For a Mossling, gather 2 berries · 1 fiber, then make a berry lure at Camp in Work → Craft.',
  });
  const partial = getFrontierPurpose({ state: state(), spendableResources: { berries: 2 } });
  assert.equal(partial.id, 'gather-berry-lure');
  assert.match(partial.description, /gather 1 fiber, then make a berry lure at Camp in Work → Craft/);
  assert.doesNotMatch(partial.description, /2 berries/);

  assert.deepEqual(getFrontierPurpose({ state: state(), cargo: lure.cost, isCamp: false }), {
    id: 'return-craft-berry-lure',
    title: 'Bring your finds home',
    description: 'Go to the Camp arch, tap RETURN TO CAMP, then confirm Return to Camp. Open Build for Camp equipment, or open Work → Craft to make an optional Mossling berry lure.',
  });
  assert.deepEqual(getFrontierPurpose({ state: state(), cargo: lure.cost, isCamp: true }), {
    id: 'craft-berry-lure',
    title: 'Use your supplies at Camp',
    description: 'Open Build for Camp equipment, or open Work → Craft to make an optional Mossling berry lure.',
  });

  const search = getFrontierPurpose({ state: state({ fieldSupplies: { berry_lure: 1 } }), isCamp: true });
  assert.equal(search.id, 'find-mossling');
  assert.match(search.description, /Walk normally beyond Camp/);
});

test('builder-facing ready supplies stay below bond and health safety priorities', () => {
  const ready = recipe('berry_lure').cost;
  assert.equal(getFrontierPurpose({ state: state(), spendableResources: ready, isCamp: false,
    pendingCompanions: [{ id: 'pending', speciesId: 'mossling' }] }).id, 'return-pending-bond');
  assert.equal(getFrontierPurpose({ state: state(), spendableResources: ready, isCamp: false,
    health: 1, maxHealth: 5 }).id, 'return-low-health');
});

test('bed and garden guidance reads live costs without requiring an optional foundation', () => {
  const owned = [mossling];
  const bed = piece('bed');
  assert.equal(getFrontierPurpose({
    state: state({ ownedWildkin: owned }), cargo: bed.cost, isCamp: true,
  }).id, 'build-bed');

  const shortBedCost = { ...bed.cost, fiber: bed.cost.fiber - 1 };
  const needBed = getFrontierPurpose({
    state: state({ ownedWildkin: owned }),
    cargo: shortBedCost,
    isCamp: true,
  });
  assert.equal(needBed.id, 'gather-bed');
  assert.match(needBed.description, /1 fiber/);

  const garden = piece('berry_garden');
  const returnForGarden = getFrontierPurpose({
    state: state({ ownedWildkin: owned, base: { structures: built('bed') }, campCare: { nourishment: 3 } }),
    cargo: garden.cost,
    isCamp: false,
  });
  assert.equal(returnForGarden.id, 'return-build-berry_garden');
  assert.match(returnForGarden.description, /Camp arch.*RETURN TO CAMP/);
});

test('Camp craft and build can spend reachable storage while care still requires a packed berry', () => {
  const lureCost = recipe('berry_lure').cost;
  assert.equal(getFrontierPurpose({
    state: state(), cargo: {}, spendableResources: lureCost, isCamp: true,
  }).id, 'craft-berry-lure');

  const bedCost = piece('bed').cost;
  assert.equal(getFrontierPurpose({
    state: state({ ownedWildkin: [mossling] }), cargo: {}, spendableResources: bedCost, isCamp: true,
  }).id, 'build-bed');

  const bedAndGarden = { structures: built('bed', 'berry_garden') };
  assert.equal(getFrontierPurpose({
    state: state({ ownedWildkin: [mossling], base: bedAndGarden, campCare: { nourishment: 2 } }),
    cargo: {}, spendableResources: { berries: 20 }, isCamp: true,
  }).id, 'gather-care-berry');
  assert.equal(getFrontierPurpose({
    state: state({ ownedWildkin: [mossling], base: bedAndGarden, campCare: { nourishment: 3 } }),
    cargo: {}, spendableResources: { berries: 20 }, isCamp: true,
  }).id, 'gather-plant-berry');
});

test('settling, feeding, planting, growing, and harvesting form one recurring loop', () => {
  const completeBase = { structures: built('foundation', 'bed', 'berry_garden') };
  const ownedState = overrides => state({ ownedWildkin: [mossling], base: completeBase, ...overrides });

  const selection = getFrontierPurpose({ state: ownedState(), isCamp: true });
  assert.equal(selection.id, 'select-mossling');
  assert.match(selection.description, /Camp sanctuary.*Wildkin.*SELECT/);
  assert.doesNotMatch(selection.description, /Journal/);
  assert.equal(getFrontierPurpose({ state: ownedState(), activeSpeciesId: 'mossling', isCamp: true }).id, 'settle-mossling');
  assert.equal(getFrontierPurpose({
    state: ownedState({ campCare: { nourishment: 2 } }), cargo: { berries: 1 }, isCamp: true,
  }).id, 'feed-mossling');
  assert.equal(getFrontierPurpose({
    state: ownedState({ campCare: { nourishment: 3 } }), cargo: { berries: 1 }, isCamp: true,
  }).id, 'plant-berry');

  const growing = getFrontierPurpose({
    state: ownedState({ campCare: { nourishment: 3 }, campCrop: { growthSeconds: CAMP_CROP_GROWTH_SECONDS - 1 } }),
    isCamp: false, activeSpeciesId: 'mossling',
  });
  assert.equal(growing.id, 'seek-rootbound-grove');

  const ripe = getFrontierPurpose({
    state: ownedState({ campCare: { nourishment: 3 }, campCrop: { growthSeconds: CAMP_CROP_GROWTH_SECONDS } }),
    cropHarvest: { yield: 4 },
    isCamp: false, activeSpeciesId: 'mossling',
  });
  assert.equal(ripe.id, 'seek-rootbound-grove');
  const campRipe = getFrontierPurpose({
    state: ownedState({ campCare: { nourishment: 3 }, campCrop: { growthSeconds: CAMP_CROP_GROWTH_SECONDS } }),
    cropHarvest: { yield: 4 }, isCamp: true,
  });
  assert.equal(campRipe.id, 'harvest-berries');
  assert.match(campRipe.description, /4 berries/);
});

test('an established active Mossling gets one useful away purpose without turning ready Camp processes into chores', () => {
  const completeBase = { structures: built('bed', 'berry_garden') };
  const care = { wildkinId: mossling.id, bedId: 'build_1', nourishment: 3 };
  const established = state({ ownedWildkin: [mossling], base: completeBase, campCare: care });
  const purpose = getFrontierPurpose({ state: established, isCamp: false, activeSpeciesId: 'mossling', health: 5, maxHealth: 5,
    ability: { speciesId: 'mossling', name: 'Bloom', ready: true } });
  assert.equal(purpose.id, 'seek-rootbound-grove');
  assert.equal(purpose.title, 'Seek a rootbound grove');
  assert.match(purpose.description, /Lush green country.*living cache.*Bloom works even at full health.*berries.*wildflowers.*crystal shards.*field XP/);
  assert.equal(purpose.abilityHint, undefined, 'far-away guidance does not highlight or teach Bloom as an immediate action');

  const ripe = getFrontierPurpose({ state: { ...established, campCrop: { growthSeconds: CAMP_CROP_GROWTH_SECONDS } },
    isCamp: false, activeSpeciesId: 'mossling' });
  assert.equal(ripe.id, 'seek-rootbound-grove');
  const readyYoung = getFrontierPurpose({ state: state({ ownedWildkin: [mossling], base: completeBase, campCare: null,
    campBreeding: { growthSeconds: CAMP_BREEDING_GROWTH_SECONDS } }), isCamp: false, activeSpeciesId: 'mossling' });
  assert.equal(readyYoung.id, 'seek-rootbound-grove');

  assert.equal(getFrontierPurpose({ state: { ...established, campCrop: { growthSeconds: CAMP_CROP_GROWTH_SECONDS } },
    isCamp: true, activeSpeciesId: 'mossling' }).id, 'harvest-berries');
  assert.equal(getFrontierPurpose({ state: state({ ownedWildkin: [mossling], base: completeBase,
    campBreeding: { growthSeconds: CAMP_BREEDING_GROWTH_SECONDS } }), isCamp: true, activeSpeciesId: 'mossling' }).id, 'welcome-young');
});

test('grove guidance requires the active secured Mossling and remains below bond and health safety priorities', () => {
  const established = state({ ownedWildkin: [mossling], base: { structures: built('bed', 'berry_garden') },
    campCare: { wildkinId: mossling.id, bedId: 'build_1', nourishment: 3 } });
  assert.notEqual(getFrontierPurpose({ state: established, isCamp: false, activeSpeciesId: 'emberhorn' }).id, 'seek-rootbound-grove');
  assert.notEqual(getFrontierPurpose({ state: established, isCamp: false, activeSpeciesId: null }).id, 'seek-rootbound-grove');
  assert.equal(getFrontierPurpose({ state: established, isCamp: false, activeSpeciesId: 'mossling',
    pendingCompanions: [{ id: 'pending', speciesId: 'mossling' }], health: 1, maxHealth: 5,
    ability: { speciesId: 'mossling', ready: true } }).id, 'return-pending-bond');
  assert.equal(getFrontierPurpose({ state: established, isCamp: false, activeSpeciesId: 'mossling', health: 3, maxHealth: 5,
    ability: { speciesId: 'mossling', ready: true } }).id, 'use-bloom');
  assert.equal(getFrontierPurpose({ state: established, isCamp: false, activeSpeciesId: 'mossling', health: 1, maxHealth: 5,
    ability: { speciesId: 'mossling', ready: false } }).id, 'return-low-health');
});

test('active Camp processes and feeding outrank requests for optional or later structures', () => {
  const bedOnly = { structures: built('bed') };
  const withBreeding = growthSeconds => state({
    ownedWildkin: [mossling],
    base: bedOnly,
    campCare: { nourishment: 0 },
    campBreeding: { growthSeconds },
  });
  assert.equal(getFrontierPurpose({ state: withBreeding(CAMP_BREEDING_GROWTH_SECONDS - 1) }).id, 'explore-young-growing');
  assert.equal(getFrontierPurpose({ state: withBreeding(CAMP_BREEDING_GROWTH_SECONDS), isCamp: true }).id, 'welcome-young');

  const readyCrop = state({
    ownedWildkin: [mossling],
    base: { structures: built('bed', 'berry_garden') },
    campCare: { nourishment: 0 },
    campCrop: { growthSeconds: CAMP_CROP_GROWTH_SECONDS },
  });
  assert.equal(getFrontierPurpose({ state: readyCrop, isCamp: true }).id, 'harvest-berries');

  const hungryWithoutGarden = state({ ownedWildkin: [mossling], base: bedOnly, campCare: { nourishment: 2 } });
  assert.equal(getFrontierPurpose({ state: hungryWithoutGarden, cargo: { berries: 1 }, isCamp: true }).id, 'feed-mossling');
});

test('Caldera exploration follows the actual habitat while urgent care and pending bonds retain priority', () => {
  const input = Object.freeze({ state: state(), isCamp: false, health: 5, maxHealth: 5,
    habitatId: 'emberglass-caldera', habitatFeatureKind: null });
  assert.equal(getFrontierPurpose(input).id, 'explore-caldera-shelves');
  const inside = { ...input, habitatFeatureKind: 'emberglass-caldera' };
  assert.equal(getFrontierPurpose(inside).id, 'explore-caldera-breach');
  assert.match(getFrontierPurpose(inside).description, /crystal and iron.*retreat/);
  assert.notEqual(getFrontierPurpose({ ...inside, isCamp: true }).id, 'explore-caldera-breach');
  assert.notEqual(getFrontierPurpose({ ...inside, habitatId: 'heartwood-basin' }).id, 'explore-caldera-breach');
  assert.equal(getFrontierPurpose({ ...inside, health: 1 }).id, 'return-low-health');
  assert.equal(getFrontierPurpose({ ...inside, health: 3, activeSpeciesId: 'mossling',
    ability: { speciesId: 'mossling', ready: true } }).id, 'use-bloom');
  assert.equal(getFrontierPurpose({ ...inside, pendingCompanions: [{ id: 'new_bond' }] }).id, 'return-pending-bond');
  assert.equal(input.habitatFeatureKind, null);
});

test('Fungal outings replace distant grove chores without displacing safety or Camp care', () => {
  const input = { state: state({ ownedWildkin: [mossling],
    base: { structures: built('bed', 'berry_garden') }, campCare: { nourishment: 3 } }),
    isCamp: false, activeSpeciesId: 'mossling', health: 5, maxHealth: 5,
    habitatId: 'fungal-hollow', habitatFeatureKind: 'fungal-hollow' };
  assert.equal(getFrontierPurpose(input).id, 'explore-fungal-rootwash');
  assert.match(getFrontierPurpose(input).description, /blossoms.*Camp upgrades/);
  assert.doesNotMatch(getFrontierPurpose(input).description, /bond|breed|grove cache/i);
  assert.equal(getFrontierPurpose({ ...input, habitatFeatureKind: null }).id, 'explore-fungal-hollows');
  assert.equal(getFrontierPurpose({ ...input, habitatId: 'rootbound-wildwood' }).id, 'seek-rootbound-grove');
  assert.notEqual(getFrontierPurpose({ ...input, isCamp: true }).id, 'explore-fungal-rootwash');
  assert.equal(getFrontierPurpose({ ...input, health: 1 }).id, 'return-low-health');
  assert.equal(getFrontierPurpose({ ...input, health: 3,
    ability: { speciesId: 'mossling', ready: true } }).id, 'use-bloom');
  assert.equal(getFrontierPurpose({ ...input, pendingCompanions: [{ id: 'new_bond' }] }).id, 'return-pending-bond');
});

test('derivation does not mutate inputs or emit stale portal navigation language', () => {
  const input = Object.freeze({
    state: Object.freeze({
      ownedWildkin: Object.freeze([mossling]),
      fieldSupplies: Object.freeze({}),
      base: Object.freeze({ structures: Object.freeze(built('foundation')) }),
      campCare: null,
      campCrop: null,
      campBreeding: null,
    }),
    cargo: Object.freeze({ wood: 3, fiber: 4 }),
    isCamp: false,
  });
  const before = structuredClone(input);
  const purpose = getFrontierPurpose(input);
  assert.deepEqual(input, before);
  assert.ok(purpose.title.length <= 28);
  assert.doesNotMatch(`${purpose.title} ${purpose.description}`, /Waypoint|Beacon|Extract/i);

  const established = Object.freeze({
    state: Object.freeze({
      ownedWildkin: Object.freeze([mossling]), fieldSupplies: Object.freeze({}),
      base: Object.freeze({ structures: Object.freeze(built('bed', 'berry_garden')) }),
      campCare: Object.freeze({ wildkinId: mossling.id, bedId: 'build_1', nourishment: 3 }),
      campCrop: Object.freeze({ growthSeconds: CAMP_CROP_GROWTH_SECONDS }), campBreeding: null,
    }),
    cargo: Object.freeze({ berries: 1 }), isCamp: false, activeSpeciesId: 'mossling', health: 5, maxHealth: 5,
  });
  const establishedBefore = structuredClone(established);
  assert.equal(getFrontierPurpose(established).id, 'seek-rootbound-grove');
  assert.deepEqual(established, establishedBefore);
});
