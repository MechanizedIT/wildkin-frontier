import { DEFAULT_FRONTIER_WORLD, frontierDomainSeed, normalizeFrontierWorld } from './frontierWorld.js';

export const FRONTIER_CONTINENT_OUTLINE_BOUNDS = Object.freeze({
  minX: -3700,
  maxX: 2300,
  minZ: -4400,
  maxZ: 2600,
});

export const FRONTIER_CONTINENT_CONFIG = Object.freeze({
  center: Object.freeze({ x: -700, z: -900 }),
  // These values still define the complete legacy land envelope. Discovery
  // owns its finite catalog bounds separately from the larger coastline.
  innerRadii: Object.freeze({ x: 1120, z: 1670 }),
  outerRadii: Object.freeze({ x: 1200, z: 1750 }),
  harmonics: Object.freeze([
    Object.freeze({ frequency: 3, amplitude: 70, key: 0x11 }),
    Object.freeze({ frequency: 5, amplitude: 40, key: 0x29 }),
    Object.freeze({ frequency: 7, amplitude: 25, key: 0x47 }),
    Object.freeze({ frequency: 29, amplitude: 12, key: 0x09 }),
    Object.freeze({ frequency: 47, amplitude: 7, key: 0x86 }),
  ]),
  smoothMaxWidth: 24,
  outlineVariation: 24,
  seaLevel: -2,
  inlandExactDistance: 90,
  shallowDistance: 12,
  shelfDistance: 32,
  shallowDepth: .75,
  shelfDepth: 5,
  deepDepth: 12,
  deepDepthDistance: 96,
  contentMargin: 2,
});

// North is -Z. The deliberate macro outline starts at the northern crown and
// follows the east exterior, the two southern arms, then the western mass.
// `fixed` anchors keep the requested extents and the Camp-side gulf unchanged;
// other vertices receive only small seed-owned normal variation.
const AUTHORED_OUTLINE = Object.freeze([
  Object.freeze({ x: -800, z: -4400, fixed: true }),
  Object.freeze({ x: -100, z: -4250 }),
  Object.freeze({ x: 600, z: -3850 }),
  Object.freeze({ x: 1250, z: -3725 }),
  Object.freeze({ x: 1900, z: -3650 }),
  Object.freeze({ x: 2300, z: -3300, fixed: true }),
  Object.freeze({ x: 2150, z: -3000 }),
  Object.freeze({ x: 1550, z: -3100 }),
  Object.freeze({ x: 1200, z: -2800 }),
  Object.freeze({ x: 1900, z: -2500 }),
  Object.freeze({ x: 2250, z: -2000 }),
  Object.freeze({ x: 1950, z: -1500 }),
  Object.freeze({ x: 1600, z: -1200 }),
  Object.freeze({ x: 1450, z: -800 }),
  Object.freeze({ x: 1050, z: -750 }),
  Object.freeze({ x: 850, z: -450 }),
  Object.freeze({ x: 500, z: -300 }),
  Object.freeze({ x: 300, z: 100, fixed: true }),
  Object.freeze({ x: 380, z: 380, fixed: true }),
  Object.freeze({ x: 220, z: 700, fixed: true }),
  Object.freeze({ x: 650, z: 900 }),
  Object.freeze({ x: 1200, z: 850 }),
  Object.freeze({ x: 1700, z: 900 }),
  Object.freeze({ x: 2100, z: 1200 }),
  Object.freeze({ x: 2050, z: 1650 }),
  Object.freeze({ x: 2200, z: 2050 }),
  Object.freeze({ x: 1600, z: 2600, fixed: true }),
  Object.freeze({ x: 950, z: 2300 }),
  Object.freeze({ x: 650, z: 1850 }),
  Object.freeze({ x: 300, z: 1600 }),
  Object.freeze({ x: -100, z: 1550 }),
  Object.freeze({ x: -400, z: 1900 }),
  Object.freeze({ x: -500, z: 2300 }),
  Object.freeze({ x: -1100, z: 2500 }),
  Object.freeze({ x: -1650, z: 2100 }),
  Object.freeze({ x: -2100, z: 1500 }),
  Object.freeze({ x: -2900, z: 1200 }),
  Object.freeze({ x: -3500, z: 600 }),
  Object.freeze({ x: -3150, z: 100 }),
  Object.freeze({ x: -3700, z: -300, fixed: true }),
  Object.freeze({ x: -3350, z: -900 }),
  Object.freeze({ x: -3700, z: -1700, fixed: true }),
  Object.freeze({ x: -3450, z: -2200 }),
  Object.freeze({ x: -3600, z: -2500 }),
  Object.freeze({ x: -3100, z: -3350 }),
  Object.freeze({ x: -2100, z: -4000 }),
  Object.freeze({ x: -1400, z: -4250 }),
]);

const COAST_DOMAIN = 'continent-coast';
const COAST_SALT = 0xdebd2186;
const SAMPLER_CACHE_CAP = 4;
const OUTLINE_INSIDE_BAND_SIZE = 400;
const OUTLINE_NEAREST_CELL_SIZE = 400;
const OUTLINE_NEAREST_MARGIN = 200;
const TAU = Math.PI * 2;
const EPSILON = 1e-9;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const clamp01 = value => clamp(value, 0, 1);
const smooth = value => { const t = clamp01(value); return t * t * (3 - 2 * t); };
const smoother = value => { const t = clamp01(value); return t * t * t * (t * (t * 6 - 15) + 10); };

function unitHash(seed, key) {
  let value = Math.imul((seed ^ key) >>> 0, 2246822519);
  value = (value ^ (value >>> 13)) >>> 0;
  return value / 0xffffffff;
}

function ellipseRadius(angle, radii) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return 1 / Math.sqrt(cos * cos / (radii.x * radii.x) + sin * sin / (radii.z * radii.z));
}

// This rounded maximum is always at least both inputs. It removes the hard join
// without allowing the authored expansion to cut into the legacy continent.
function smoothMaximum(a, b, width) {
  const difference = Math.abs(a - b);
  const maximum = Math.max(a, b);
  if (!(width > 0) || difference >= width) return maximum;
  return maximum + (width - difference) ** 2 / (4 * width);
}

function smoothMaximumSample(a, b, width) {
  const difference = Math.abs(a.distance - b.distance);
  if (!(width > 0) || difference >= width) return a.distance >= b.distance ? a : b;
  const distance = smoothMaximum(a.distance, b.distance, width);
  const aWeight = .5 + (a.distance - b.distance) / (2 * width);
  const x = a.inlandDirection.x * aWeight + b.inlandDirection.x * (1 - aWeight);
  const z = a.inlandDirection.z * aWeight + b.inlandDirection.z * (1 - aWeight);
  const length = Math.hypot(x, z);
  return {
    distance,
    inlandDirection: length > EPSILON ? { x: x / length, z: z / length } : a.inlandDirection,
  };
}

function signedArea(points) {
  let twiceArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index], b = points[(index + 1) % points.length];
    twiceArea += a.x * b.z - b.x * a.z;
  }
  return twiceArea / 2;
}

function orientation(a, b, c) {
  const cross = (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
  return Math.abs(cross) <= EPSILON ? 0 : Math.sign(cross);
}

function onSegment(a, b, point) {
  return point.x >= Math.min(a.x, b.x) - EPSILON && point.x <= Math.max(a.x, b.x) + EPSILON
    && point.z >= Math.min(a.z, b.z) - EPSILON && point.z <= Math.max(a.z, b.z) + EPSILON;
}

function segmentsIntersect(a, b, c, d) {
  const abC = orientation(a, b, c), abD = orientation(a, b, d);
  const cdA = orientation(c, d, a), cdB = orientation(c, d, b);
  if (abC !== abD && cdA !== cdB) return true;
  return (abC === 0 && onSegment(a, b, c)) || (abD === 0 && onSegment(a, b, d))
    || (cdA === 0 && onSegment(c, d, a)) || (cdB === 0 && onSegment(c, d, b));
}

function validateOutline(points) {
  if (!Array.isArray(points) || points.length < 3 || points.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.z))) {
    throw new Error('invalid-frontier-continent-outline');
  }
  if (Math.abs(signedArea(points)) < 1) throw new Error('invalid-frontier-continent-outline');
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index], b = points[(index + 1) % points.length];
    if (Math.hypot(b.x - a.x, b.z - a.z) < 1) throw new Error('invalid-frontier-continent-outline');
    for (let other = index + 1; other < points.length; other += 1) {
      if (other === index + 1 || (index === 0 && other === points.length - 1)) continue;
      const c = points[other], d = points[(other + 1) % points.length];
      if (segmentsIntersect(a, b, c, d)) throw new Error('invalid-frontier-continent-outline');
    }
  }
}

function createOutline(seed) {
  const winding = Math.sign(signedArea(AUTHORED_OUTLINE)) || 1;
  const points = AUTHORED_OUTLINE.map((point, index) => {
    if (point.fixed) return Object.freeze({ x: point.x, z: point.z });
    const previous = AUTHORED_OUTLINE[(index + AUTHORED_OUTLINE.length - 1) % AUTHORED_OUTLINE.length];
    const next = AUTHORED_OUTLINE[(index + 1) % AUTHORED_OUTLINE.length];
    const tangentX = next.x - previous.x, tangentZ = next.z - previous.z;
    const length = Math.hypot(tangentX, tangentZ);
    const inwardX = winding * -tangentZ / length, inwardZ = winding * tangentX / length;
    const offset = (unitHash(seed, 0x9e3779b9 ^ Math.imul(index + 1, 0x85ebca6b)) * 2 - 1)
      * FRONTIER_CONTINENT_CONFIG.outlineVariation;
    return Object.freeze({
      x: clamp(point.x + inwardX * offset, FRONTIER_CONTINENT_OUTLINE_BOUNDS.minX, FRONTIER_CONTINENT_OUTLINE_BOUNDS.maxX),
      z: clamp(point.z + inwardZ * offset, FRONTIER_CONTINENT_OUTLINE_BOUNDS.minZ, FRONTIER_CONTINENT_OUTLINE_BOUNDS.maxZ),
    });
  });
  validateOutline(points);
  const inwardSign = Math.sign(signedArea(points)) || 1;
  const edges = points.map((a, index) => {
    const b = points[(index + 1) % points.length];
    const dx = b.x - a.x, dz = b.z - a.z;
    const lengthSquared = dx * dx + dz * dz, length = Math.sqrt(lengthSquared);
    return Object.freeze({
      a, b, dx, dz, inverseLengthSquared: 1 / lengthSquared,
      inwardX: inwardSign * -dz / length,
      inwardZ: inwardSign * dx / length,
      minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x),
      minZ: Math.min(a.z, b.z), maxZ: Math.max(a.z, b.z),
    });
  });
  const minInsideBand = Math.floor(Math.min(...points.map(point => point.z)) / OUTLINE_INSIDE_BAND_SIZE);
  const maxInsideBand = Math.floor(Math.max(...points.map(point => point.z)) / OUTLINE_INSIDE_BAND_SIZE);
  const insideBands = Array.from({ length: maxInsideBand - minInsideBand + 1 }, () => []);
  for (const edge of edges) {
    const minBand = Math.floor(edge.minZ / OUTLINE_INSIDE_BAND_SIZE);
    const maxBand = Math.floor(edge.maxZ / OUTLINE_INSIDE_BAND_SIZE);
    for (let band = minBand; band <= maxBand; band += 1) {
      insideBands[band - minInsideBand].push(edge);
    }
  }
  for (let index = 0; index < insideBands.length; index += 1) insideBands[index] = Object.freeze(insideBands[index]);
  const pointEdgeDistanceSquared = (x, z, edge) => {
    const apX = x - edge.a.x, apZ = z - edge.a.z;
    const t = clamp((apX * edge.dx + apZ * edge.dz) * edge.inverseLengthSquared, 0, 1);
    const distanceX = x - (edge.a.x + edge.dx * t), distanceZ = z - (edge.a.z + edge.dz * t);
    return distanceX * distanceX + distanceZ * distanceZ;
  };
  const nearestCells = [], insideCells = [];
  const minCellX = Math.floor((FRONTIER_CONTINENT_OUTLINE_BOUNDS.minX - OUTLINE_NEAREST_MARGIN) / OUTLINE_NEAREST_CELL_SIZE);
  const maxCellX = Math.floor((FRONTIER_CONTINENT_OUTLINE_BOUNDS.maxX + OUTLINE_NEAREST_MARGIN) / OUTLINE_NEAREST_CELL_SIZE);
  const minCellZ = Math.floor((FRONTIER_CONTINENT_OUTLINE_BOUNDS.minZ - OUTLINE_NEAREST_MARGIN) / OUTLINE_NEAREST_CELL_SIZE);
  const maxCellZ = Math.floor((FRONTIER_CONTINENT_OUTLINE_BOUNDS.maxZ + OUTLINE_NEAREST_MARGIN) / OUTLINE_NEAREST_CELL_SIZE);
  for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      const minX = cellX * OUTLINE_NEAREST_CELL_SIZE, maxX = minX + OUTLINE_NEAREST_CELL_SIZE;
      const minZ = cellZ * OUTLINE_NEAREST_CELL_SIZE, maxZ = minZ + OUTLINE_NEAREST_CELL_SIZE;
      let upperDistanceSquared = Infinity;
      for (const edge of edges) {
        const maximumCornerDistance = Math.max(
          pointEdgeDistanceSquared(minX, minZ, edge), pointEdgeDistanceSquared(maxX, minZ, edge),
          pointEdgeDistanceSquared(minX, maxZ, edge), pointEdgeDistanceSquared(maxX, maxZ, edge),
        );
        upperDistanceSquared = Math.min(upperDistanceSquared, maximumCornerDistance);
      }
      const candidates = edges.filter(edge => {
        // Edge-AABB to cell-AABB distance is a conservative lower bound. An
        // edge beyond the best whole-cell upper bound cannot win in this cell.
        const dx = Math.max(edge.minX - maxX, minX - edge.maxX, 0);
        const dz = Math.max(edge.minZ - maxZ, minZ - edge.maxZ, 0);
        return dx * dx + dz * dz <= upperDistanceSquared + EPSILON;
      });
      const cellIndex = (cellZ - minCellZ) * (maxCellX - minCellX + 1) + cellX - minCellX;
      nearestCells[cellIndex] = Object.freeze(candidates);
      const touchesBoundary = edges.some(edge => edge.maxX >= minX && edge.minX <= maxX && edge.maxZ >= minZ && edge.minZ <= maxZ);
      if (touchesBoundary) insideCells[cellIndex] = 2;
      else {
        let inside = false;
        const centerX = (minX + maxX) / 2, centerZ = (minZ + maxZ) / 2;
        for (const edge of edges) if ((edge.a.z > centerZ) !== (edge.b.z > centerZ)
          && centerX < edge.a.x + (centerZ - edge.a.z) * edge.dx / edge.dz) inside = !inside;
        insideCells[cellIndex] = inside ? 1 : 0;
      }
    }
  }
  return Object.freeze({
    points: Object.freeze(points), edges: Object.freeze(edges), insideBands: Object.freeze(insideBands), minInsideBand,
    nearestCells: Object.freeze(nearestCells), insideCells: Object.freeze(insideCells), minCellX, maxCellX, minCellZ, maxCellZ,
    minZ: Math.min(...points.map(point => point.z)), maxZ: Math.max(...points.map(point => point.z)),
  });
}

function sampleOutline(x, z, outline) {
  let nearestEdge = outline.edges[0], nearestDistanceSquared = Infinity;
  let nearestX = nearestEdge.a.x, nearestZ = nearestEdge.a.z;
  const cellX = Math.floor(x / OUTLINE_NEAREST_CELL_SIZE), cellZ = Math.floor(z / OUTLINE_NEAREST_CELL_SIZE);
  const hasCell = cellX >= outline.minCellX && cellX <= outline.maxCellX && cellZ >= outline.minCellZ && cellZ <= outline.maxCellZ;
  const cellIndex = hasCell ? (cellZ - outline.minCellZ) * (outline.maxCellX - outline.minCellX + 1) + cellX - outline.minCellX : -1;
  let inside = hasCell && outline.insideCells[cellIndex] === 1;
  if (hasCell && outline.insideCells[cellIndex] === 2) {
    const crossingEdges = z >= outline.minZ && z <= outline.maxZ
      ? outline.insideBands[Math.floor(z / OUTLINE_INSIDE_BAND_SIZE) - outline.minInsideBand] ?? [] : [];
    for (const edge of crossingEdges) if ((edge.a.z > z) !== (edge.b.z > z)
      && x < edge.a.x + (z - edge.a.z) * edge.dx / edge.dz) inside = !inside;
  }
  const nearestEdges = hasCell ? outline.nearestCells[cellIndex] : outline.edges;
  for (const edge of nearestEdges) {
    const apX = x - edge.a.x, apZ = z - edge.a.z;
    const t = clamp((apX * edge.dx + apZ * edge.dz) * edge.inverseLengthSquared, 0, 1);
    const closestX = edge.a.x + edge.dx * t, closestZ = edge.a.z + edge.dz * t;
    const distanceX = x - closestX, distanceZ = z - closestZ;
    const distanceSquared = distanceX * distanceX + distanceZ * distanceZ;
    // Strict comparison makes equal-distance vertex and symmetry ties use the
    // first edge in canonical outline order.
    if (distanceSquared < nearestDistanceSquared - EPSILON) {
      nearestDistanceSquared = distanceSquared; nearestEdge = edge;
      nearestX = closestX; nearestZ = closestZ;
    }
  }
  const distance = Math.sqrt(nearestDistanceSquared);
  let inwardX, inwardZ;
  if (distance > EPSILON) {
    const sign = inside ? 1 : -1;
    inwardX = (x - nearestX) / distance * sign;
    inwardZ = (z - nearestZ) / distance * sign;
  } else {
    inwardX = nearestEdge.inwardX; inwardZ = nearestEdge.inwardZ;
  }
  return { distance: inside ? distance : -distance, inlandDirection: { x: inwardX, z: inwardZ } };
}

function resolveSeed(world) {
  return frontierDomainSeed(normalizeFrontierWorld(world ?? DEFAULT_FRONTIER_WORLD), COAST_DOMAIN, COAST_SALT);
}

function createResolvedSampler(world) {
  const descriptor = normalizeFrontierWorld(world ?? DEFAULT_FRONTIER_WORLD);
  const seed = resolveSeed(descriptor);
  const phases = FRONTIER_CONTINENT_CONFIG.harmonics.map(harmonic => unitHash(seed, harmonic.key) * TAU);
  const outline = createOutline(seed);
  const token = seed.toString(16).padStart(8, '0');
  return (rawX, rawZ) => {
    const x = Number.isFinite(rawX) ? rawX : 0;
    const z = Number.isFinite(rawZ) ? rawZ : 0;
    const dx = x - FRONTIER_CONTINENT_CONFIG.center.x;
    const dz = z - FRONTIER_CONTINENT_CONFIG.center.z;
    const radialDistance = Math.hypot(dx, dz);
    const angle = radialDistance > 0 ? Math.atan2(dz, dx) : 0;
    const protectedRadius = ellipseRadius(angle, FRONTIER_CONTINENT_CONFIG.innerRadii);
    let irregularRadius = ellipseRadius(angle, FRONTIER_CONTINENT_CONFIG.outerRadii);
    for (let index = 0; index < FRONTIER_CONTINENT_CONFIG.harmonics.length; index += 1) {
      const harmonic = FRONTIER_CONTINENT_CONFIG.harmonics[index];
      irregularRadius += harmonic.amplitude * Math.sin(harmonic.frequency * angle + phases[index]);
    }
    const legacyRadius = smoothMaximum(protectedRadius, irregularRadius, FRONTIER_CONTINENT_CONFIG.smoothMaxWidth);
    const legacyDirection = radialDistance > 0 ? { x: -dx / radialDistance, z: -dz / radialDistance } : { x: 1, z: 0 };
    const coast = smoothMaximumSample(
      { distance: legacyRadius - radialDistance, inlandDirection: legacyDirection },
      sampleOutline(x, z, outline),
      FRONTIER_CONTINENT_CONFIG.smoothMaxWidth,
    );
    const coastDistance = coast.distance;
    const offshoreDistance = Math.max(0, -coastDistance);
    let waterDepth = 0;
    if (offshoreDistance > 0 && offshoreDistance <= FRONTIER_CONTINENT_CONFIG.shallowDistance) {
      waterDepth = FRONTIER_CONTINENT_CONFIG.shallowDepth * smooth(offshoreDistance / FRONTIER_CONTINENT_CONFIG.shallowDistance);
    } else if (offshoreDistance > FRONTIER_CONTINENT_CONFIG.shallowDistance
      && offshoreDistance <= FRONTIER_CONTINENT_CONFIG.shelfDistance) {
      const t = smooth((offshoreDistance - FRONTIER_CONTINENT_CONFIG.shallowDistance)
        / (FRONTIER_CONTINENT_CONFIG.shelfDistance - FRONTIER_CONTINENT_CONFIG.shallowDistance));
      waterDepth = FRONTIER_CONTINENT_CONFIG.shallowDepth
        + (FRONTIER_CONTINENT_CONFIG.shelfDepth - FRONTIER_CONTINENT_CONFIG.shallowDepth) * t;
    } else if (offshoreDistance > FRONTIER_CONTINENT_CONFIG.shelfDistance) {
      const t = smooth((offshoreDistance - FRONTIER_CONTINENT_CONFIG.shelfDistance)
        / FRONTIER_CONTINENT_CONFIG.deepDepthDistance);
      waterDepth = FRONTIER_CONTINENT_CONFIG.shelfDepth
        + (FRONTIER_CONTINENT_CONFIG.deepDepth - FRONTIER_CONTINENT_CONFIG.shelfDepth) * t;
    }
    const land = coastDistance >= 0;
    return Object.freeze({
      id: `f1:continent:${token}`,
      coastDistance,
      seaLevel: FRONTIER_CONTINENT_CONFIG.seaLevel,
      land,
      contentLand: coastDistance > FRONTIER_CONTINENT_CONFIG.contentMargin,
      hasTerrain: coastDistance >= -FRONTIER_CONTINENT_CONFIG.shelfDistance,
      waterDepth,
      kind: land ? (coastDistance < FRONTIER_CONTINENT_CONFIG.inlandExactDistance ? 'coast' : 'interior')
        : coastDistance >= -FRONTIER_CONTINENT_CONFIG.shelfDistance ? 'shelf' : 'deep-ocean',
      inlandDirection: Object.freeze(coast.inlandDirection),
    });
  };
}

export function createFrontierContinentSampler(world = DEFAULT_FRONTIER_WORLD) {
  return createResolvedSampler(world);
}

const DEFAULT_CONTINENT_SAMPLER = createResolvedSampler(DEFAULT_FRONTIER_WORLD);
const samplerCache = new Map([[`${DEFAULT_FRONTIER_WORLD.edition}:${DEFAULT_FRONTIER_WORLD.seed}`, DEFAULT_CONTINENT_SAMPLER]]);

export function sampleFrontierContinent(x, z, { world = DEFAULT_FRONTIER_WORLD } = {}) {
  const descriptor = normalizeFrontierWorld(world);
  const key = `${descriptor.edition}:${descriptor.seed}`;
  let sampler = samplerCache.get(key);
  if (!sampler) {
    sampler = createResolvedSampler(descriptor);
    if (samplerCache.size < SAMPLER_CACHE_CAP) samplerCache.set(key, sampler);
  }
  return sampler(x, z);
}

export function sampleFrontierWater(x, z, { world = DEFAULT_FRONTIER_WORLD, continentSampler } = {}) {
  const sample = typeof continentSampler === 'function' ? continentSampler(x, z) : sampleFrontierContinent(x, z, { world });
  if (sample.land) return null;
  return Object.freeze({
    surfaceY: sample.seaLevel,
    bedY: sample.seaLevel - sample.waterDepth,
    depth: sample.waterDepth,
    offshoreDistance: -sample.coastDistance,
    inlandDirection: sample.inlandDirection,
  });
}

export function hasFrontierLandFootprint(x, z, {
  radius = 0,
  margin = FRONTIER_CONTINENT_CONFIG.contentMargin,
  getTerrainSample,
  continentSampler,
  world = DEFAULT_FRONTIER_WORLD,
} = {}) {
  if (![x, z, radius, margin].every(Number.isFinite) || radius < 0 || margin < 0) return false;
  const sample = (sx, sz) => {
    if (typeof getTerrainSample === 'function') {
      const value = getTerrainSample(sx, sz);
      // Focused callers may deliberately inject a complete legacy/flat terrain
      // fixture. Production terrain always supplies the signed coast field.
      return Number.isFinite(value?.coastDistance) ? value.coastDistance : Number.MAX_SAFE_INTEGER;
    }
    const continent = typeof continentSampler === 'function' ? continentSampler(sx, sz)
      : sampleFrontierContinent(sx, sz, { world });
    return continent?.coastDistance;
  };
  const points = [[0, 0]];
  if (radius > 0) for (let index = 0; index < 8; index += 1) {
    const angle = index * TAU / 8;
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  return points.every(([ox, oz]) => {
    const distance = sample(x + ox, z + oz);
    return Number.isFinite(distance) && distance > margin;
  });
}

export function blendFrontierCoastHeight(inlandHeight, continent) {
  const finiteHeight = Number.isFinite(inlandHeight) ? inlandHeight : FRONTIER_CONTINENT_CONFIG.seaLevel;
  const distance = continent?.coastDistance;
  if (!Number.isFinite(distance) || distance >= FRONTIER_CONTINENT_CONFIG.inlandExactDistance) return finiteHeight;
  if (distance <= 0) return FRONTIER_CONTINENT_CONFIG.seaLevel - (continent?.waterDepth ?? 0);
  const t = smoother(distance / FRONTIER_CONTINENT_CONFIG.inlandExactDistance);
  const gentleApproach = FRONTIER_CONTINENT_CONFIG.seaLevel + distance * .12;
  return gentleApproach + (finiteHeight - gentleApproach) * t;
}
