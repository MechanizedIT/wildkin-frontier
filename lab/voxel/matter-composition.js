// Phase 0.5C.1 bounded source composition. Procedural sources may overlap,
// but only one resolved density/material sample enters ownership and edits.
export const SOURCE_PRECEDENCE = Object.freeze({ ROCK: 20, DIRT: 10 });

export function resolveMatterSources(sources) {
  if (!Array.isArray(sources)) throw new Error('Matter sources must be an array');
  let winner = null;
  for (const source of sources) {
    if (!source || !Number.isFinite(source.density) || !Number.isSafeInteger(source.material) ||
        !Number.isSafeInteger(source.precedence)) throw new Error('Invalid matter source');
    if (source.density >= 0) continue;
    if (!winner || source.precedence > winner.precedence ||
        source.precedence === winner.precedence && (source.material < winner.material ||
          source.material === winner.material && source.density < winner.density)) winner = source;
  }
  return winner ? { density: winner.density, material: winner.material } : { density: 1, material: 0 };
}

export function composeMatterSample(point, sources) {
  return resolveMatterSources(sources.map(source => ({
    density: source.sample(point), material: source.material, precedence: source.precedence,
  })));
}
