// Bounded, presentation-only appearance genomes for Wildkin.
// This module owns no runtime actors, anatomy, persistence, or random state.

export const WILDKIN_GENOME_VERSION = 1;

const MOSS_COLOR = Object.freeze({
  lichen: Object.freeze({ name: 'lichen', hex: '#80966B' }),
  fern: Object.freeze({ name: 'fern', hex: '#4F7D61' }),
  clay: Object.freeze({ name: 'clay', hex: '#A77B62' }),
  dusk: Object.freeze({ name: 'dusk', hex: '#665D78' }),
  sunwash: Object.freeze({ name: 'sunwash', hex: '#B5A36B' }),
});

const MOSS_EYE = Object.freeze({
  amber: Object.freeze({ name: 'amber', hex: '#D89A45' }),
  teal: Object.freeze({ name: 'teal', hex: '#63B7AE' }),
  violet: Object.freeze({ name: 'violet', hex: '#9C78C4' }),
  obsidian: Object.freeze({ name: 'obsidian', hex: '#26313A' }),
  pearl: Object.freeze({ name: 'pearl', hex: '#D7D7BF' }),
});

const MOSS_MARKING = Object.freeze({
  none: Object.freeze({ name: 'none', color: null, coverage: 0 }),
  cheek: Object.freeze({ name: 'cheek', color: '#C5A078', coverage: 0.08 }),
  shoulder: Object.freeze({ name: 'shoulder', color: '#334D43', coverage: 0.18 }),
  stripe: Object.freeze({ name: 'stripe', color: '#D0B878', coverage: 0.22 }),
});

const SIZE_BAND = Object.freeze({
  petite: Object.freeze({ name: 'petite', scale: 0.9 }),
  standard: Object.freeze({ name: 'standard', scale: 1 }),
  sturdy: Object.freeze({ name: 'sturdy', scale: 1.1 }),
});

// Variant numbers are deliberately small; these are current Mossling family
// styling options, not an anatomy or rig schema.
const ECOTYPE_RULES = Object.freeze({
  fen: Object.freeze({ crest: Object.freeze([0, 1, 2]), tail: Object.freeze([0, 1, 2]) }),
  grove: Object.freeze({ crest: Object.freeze([0, 1]), tail: Object.freeze([1, 2]) }),
  ridge: Object.freeze({ crest: Object.freeze([1, 2]), tail: Object.freeze([0, 2]) }),
});

export const MOSSLING_GENOME_RECIPE = Object.freeze({
  species: 'mossling', version: WILDKIN_GENOME_VERSION,
  ecotypes: Object.freeze(Object.keys(ECOTYPE_RULES)),
  baseColors: Object.freeze(Object.keys(MOSS_COLOR)),
  eyeColors: Object.freeze(Object.keys(MOSS_EYE)),
  markings: Object.freeze(Object.keys(MOSS_MARKING)),
  sizeBands: Object.freeze(Object.keys(SIZE_BAND)),
  variants: ECOTYPE_RULES,
});

const pick = (values, random) => values[Math.floor(random() * values.length)];

function seedRandom(seed) {
  const text = String(seed ?? '');
  let state = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    state ^= text.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }
  state >>>= 0;
  return () => {
    state = (Math.imul(state ^ (state >>> 16), 2246822519) + 3266489917) >>> 0;
    state ^= state >>> 13;
    return (state >>> 0) / 4294967296;
  };
}

function assertSeed(seed) {
  if ((typeof seed !== 'string' && typeof seed !== 'number') || (typeof seed === 'number' && !Number.isFinite(seed))) {
    throw new TypeError('seed must be a finite number or string');
  }
}

function assertGenomeValue(value, values, label) {
  if (typeof value !== 'string' || !values.includes(value)) throw new RangeError(`invalid ${label}`);
}

function assertVariant(value, allowed, label) {
  if (!Number.isInteger(value) || !allowed.includes(value)) throw new RangeError(`invalid ${label}`);
}

function normalized(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError('genome must be an object');
  if (raw.species !== 'mossling') throw new RangeError('unsupported Wildkin species');
  if (raw.version !== WILDKIN_GENOME_VERSION) throw new RangeError('unsupported genome version');
  assertGenomeValue(raw.ecotype, MOSSLING_GENOME_RECIPE.ecotypes, 'ecotype');
  assertGenomeValue(raw.baseColor, MOSSLING_GENOME_RECIPE.baseColors, 'baseColor');
  assertGenomeValue(raw.eyeColor, MOSSLING_GENOME_RECIPE.eyeColors, 'eyeColor');
  assertGenomeValue(raw.marking, MOSSLING_GENOME_RECIPE.markings, 'marking');
  assertGenomeValue(raw.sizeBand, MOSSLING_GENOME_RECIPE.sizeBands, 'sizeBand');
  const rules = ECOTYPE_RULES[raw.ecotype];
  assertVariant(raw.crestVariant, rules.crest, 'crestVariant');
  assertVariant(raw.tailVariant, rules.tail, 'tailVariant');
  return Object.freeze({ species: 'mossling', version: 1, ecotype: raw.ecotype,
    baseColor: raw.baseColor, eyeColor: raw.eyeColor, crestVariant: raw.crestVariant,
    tailVariant: raw.tailVariant, marking: raw.marking, sizeBand: raw.sizeBand });
}

export function normalizeWildkinGenome(raw) {
  return normalized(raw);
}

export function createWildkinGenome(seed, ecotype = undefined) {
  assertSeed(seed);
  const random = seedRandom(seed);
  const chosenEcotype = ecotype ?? pick(MOSSLING_GENOME_RECIPE.ecotypes, random);
  assertGenomeValue(chosenEcotype, MOSSLING_GENOME_RECIPE.ecotypes, 'ecotype');
  const rules = ECOTYPE_RULES[chosenEcotype];
  return normalized({ species: 'mossling', version: 1, ecotype: chosenEcotype,
    baseColor: pick(MOSSLING_GENOME_RECIPE.baseColors, random),
    eyeColor: pick(MOSSLING_GENOME_RECIPE.eyeColors, random),
    crestVariant: pick(rules.crest, random), tailVariant: pick(rules.tail, random),
    marking: pick(MOSSLING_GENOME_RECIPE.markings, random),
    sizeBand: pick(MOSSLING_GENOME_RECIPE.sizeBands, random) });
}

export function expressWildkinGenome(genome) {
  const g = normalized(genome);
  const base = MOSS_COLOR[g.baseColor];
  const eye = MOSS_EYE[g.eyeColor];
  const marking = MOSS_MARKING[g.marking];
  const size = SIZE_BAND[g.sizeBand];
  return Object.freeze({ ...g, baseColor: Object.freeze({ ...base }), eyeColor: Object.freeze({ ...eye }),
    marking: Object.freeze({ ...marking }), sizeBand: Object.freeze({ ...size }),
    baseColorName: base.name, baseColorHex: base.hex, eyeColorName: eye.name, eyeColorHex: eye.hex,
    markingName: marking.name, crestName: `crest-${g.crestVariant}`, tailName: `tail-${g.tailVariant}`,
    scale: size.scale });
}

function chooseAllele(a, b, random) { return random() < 0.5 ? a : b; }

export function inheritWildkinGenome(parentA, parentB, seed, options = {}) {
  assertSeed(seed);
  const a = normalized(parentA); const b = normalized(parentB); const random = seedRandom(seed);
  const preserve = options.preserveTrait;
  const fields = ['ecotype', 'baseColor', 'eyeColor', 'crestVariant', 'tailVariant', 'marking', 'sizeBand'];
  if (preserve !== undefined && !fields.includes(preserve)) throw new RangeError('invalid preserveTrait');
  // Choosing the donor ecotype for a preserved variant makes the guarantee
  // structural: a preserved parent allele is always valid in the child family.
  const ecotype = preserve === 'ecotype' || preserve === 'crestVariant' || preserve === 'tailVariant'
    ? a.ecotype : chooseAllele(a.ecotype, b.ecotype, random);
  const rules = ECOTYPE_RULES[ecotype];
  const child = { species: 'mossling', version: 1, ecotype };
  for (const field of fields.slice(1)) {
    const allowed = field === 'crestVariant' ? rules.crest : field === 'tailVariant' ? rules.tail : null;
    if (allowed) {
      // Do not invent a repair allele: at least the parent supplying the
      // selected ecotype has a valid value for this family-constrained trait.
      const eligible = [a[field], b[field]].filter((value, index, values) =>
        allowed.includes(value) && values.indexOf(value) === index);
      child[field] = pick(eligible, random);
    } else {
      child[field] = chooseAllele(a[field], b[field], random);
    }
  }
  if (preserve && preserve !== 'ecotype') {
    const value = a[preserve];
    const allowed = preserve === 'crestVariant' ? rules.crest : preserve === 'tailVariant' ? rules.tail : null;
    if (!allowed || allowed.includes(value)) child[preserve] = value;
  }
  return normalized(child);
}
