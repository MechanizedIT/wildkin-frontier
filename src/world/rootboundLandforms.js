// Rootbound's large, finite terrain composition.  This stays independent of
// scenery, ecology and the streamed terrain implementation so every consumer
// can inspect the same authored rooms and walking routes.
const clamp01 = value => Math.max(0, Math.min(1, value));
export const smooth = value => { const t = clamp01(value); return t * t * (3 - 2 * t); };

export const ROOTBOUND_SUBREGIONS = Object.freeze([
  Object.freeze({ id: 'spore-meadow', label: 'Spore Meadow', x: -475, z: 590, radiusX: 31, radiusZ: 27, elevation: 0 }),
  Object.freeze({ id: 'root-gallery', label: 'Root Galleries', x: -477, z: 650, radiusX: 32, radiusZ: 43, elevation: 6.8 }),
  Object.freeze({ id: 'lantern-hollow', label: 'Lantern Hollow', x: -444, z: 679, radiusX: 18, radiusZ: 15, elevation: 4.7 }),
  Object.freeze({ id: 'thornstone-verge', label: 'Thornstone Verge', x: -415, z: 694, radiusX: 33, radiusZ: 31, elevation: 10.5 }),
  Object.freeze({ id: 'heartroot-crown', label: 'Heartroot Crown', x: -475, z: 720, radiusX: 37, radiusZ: 30, elevation: 15.2 }),
]);

// Route anchors describe the intended walking experience rather than merely
// painting decoration: the player leaves the low meadow, gains the galleries,
// drops into Lantern Hollow, then climbs the Crown or the optional Verge.
export const ROOTBOUND_LANDFORM_ROUTE = Object.freeze([
  Object.freeze({ x: -475, z: 590, elevation: 0, zone: 'spore-meadow' }),
  Object.freeze({ x: -478, z: 613, elevation: 1.7, zone: 'spore-meadow' }),
  Object.freeze({ x: -480, z: 643, elevation: 5.2, zone: 'root-gallery' }),
  Object.freeze({ x: -472, z: 663, elevation: 6.9, zone: 'root-gallery' }),
  Object.freeze({ x: -449, z: 675, elevation: 4.3, zone: 'lantern-hollow' }),
  Object.freeze({ x: -452, z: 696, elevation: 7.2, zone: 'root-gallery' }),
  Object.freeze({ x: -480, z: 720, elevation: 15.2, zone: 'heartroot-crown' }),
  Object.freeze({ x: -493, z: 701, elevation: 10.2, zone: 'root-gallery' }),
  Object.freeze({ x: -495, z: 673, elevation: 7.1, zone: 'root-gallery' }),
  Object.freeze({ x: -494, z: 646, elevation: 5.1, zone: 'root-gallery' }),
  Object.freeze({ x: -492, z: 615, elevation: 1.8, zone: 'spore-meadow' }),
  Object.freeze({ x: -475, z: 590, elevation: 0, zone: 'spore-meadow' }),
]);

export const ROOTBOUND_LANDFORM_BRANCH = Object.freeze([
  Object.freeze({ x: -449, z: 675, elevation: 4.3, zone: 'lantern-hollow' }),
  Object.freeze({ x: -427, z: 680, elevation: 7.5, zone: 'thornstone-verge' }),
  Object.freeze({ x: -415, z: 694, elevation: 10.5, zone: 'thornstone-verge' }),
  Object.freeze({ x: -430, z: 711, elevation: 9.4, zone: 'thornstone-verge' }),
  Object.freeze({ x: -452, z: 696, elevation: 7.2, zone: 'root-gallery' }),
]);

const SHELVES = Object.freeze([
  // The height is constant across the inner ellipse, then falls through a
  // deliberately broad skirt.  These read as land masses, not hill spikes.
  Object.freeze({ x: -478, z: 653, radiusX: 45, radiusZ: 54, inner: .42, elevation: 6.8 }),
  Object.freeze({ x: -475, z: 720, radiusX: 44, radiusZ: 34, inner: .72, elevation: 15.2 }),
  Object.freeze({ x: -415, z: 694, radiusX: 34, radiusZ: 35, inner: .43, elevation: 10.5 }),
]);

// Small level crowns are terrain, not object bases: creatures and discoveries
// use the very same continuous collision surface as the walking loop.
const SUPPORT_PADS = Object.freeze([
  Object.freeze({ id: 'trailgloam-home', x: -463, z: 685, radius: 4, skirt: 6, elevation: 6.25 }),
  Object.freeze({ id: 'lantern-cache', x: -452, z: 680, radius: 2.4, skirt: 6, elevation: 5.0 }),
  // The generated eastern resident retains its full existing 8.5m leash on a
  // neutral bench.  This only trims the distant Verge skirt, never the climb.
  Object.freeze({ id: 'eastern-resident-bench', x: -380.0769573508475, z: 686.4566774646418, radius: 10, skirt: 8, elevation: 0 }),
]);

function plateauHeight(x, z, shelf) {
  const radius = Math.hypot((x - shelf.x) / shelf.radiusX, (z - shelf.z) / shelf.radiusZ);
  if (radius >= 1) return 0;
  if (radius <= shelf.inner) return shelf.elevation;
  return shelf.elevation * (1 - smooth((radius - shelf.inner) / (1 - shelf.inner)));
}

function padWeight(x, z, pad) {
  const distance = Math.hypot(x - pad.x, z - pad.z);
  if (distance <= pad.radius) return 1;
  return 1 - smooth((distance - pad.radius) / pad.skirt);
}

function segmentProjection(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
  const t = length > 0 ? clamp01(((x - a.x) * dx + (z - a.z) * dz) / (length * length)) : 0;
  return { distance: Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t)), elevation: a.elevation + (b.elevation - a.elevation) * t };
}

function routeRibbon(x, z) {
  let best = { weight: 0, elevation: 0, distance: Infinity };
  for (const route of [ROOTBOUND_LANDFORM_ROUTE, ROOTBOUND_LANDFORM_BRANCH]) for (let index = 1; index < route.length; index += 1) {
    const projected = segmentProjection(x, z, route[index - 1], route[index]);
    // Four metres of clear intended grade, followed by a six-metre terrain
    // skirt which eases the walking contour into the surrounding shelves.
    const weight = projected.distance <= 4 ? 1 : smooth(1 - (projected.distance - 4) / 6);
    // Several route pieces meet in the Crown and at Lantern.  Selecting the
    // nearest contour (rather than the first full-width segment) avoids a
    // hidden height switch where their generous walking skirts overlap.
    if (weight > best.weight || (weight === best.weight && projected.distance < best.distance)) {
      best = { weight, elevation: projected.elevation, distance: projected.distance };
    }
  }
  // Rounded contour pads keep a sharp plan-view turn from pinching several
  // metres of vertical change into its outside walking edge.
  for (const route of [ROOTBOUND_LANDFORM_ROUTE, ROOTBOUND_LANDFORM_BRANCH]) for (let index = 1; index < route.length - 1; index += 1) {
    const anchor = route[index], distance = Math.hypot(x - anchor.x, z - anchor.z);
    const padWeight = smooth(1 - distance / 7);
    best.elevation += (anchor.elevation - best.elevation) * padWeight;
  }
  return best;
}

function nearestZone(x, z) {
  let best = ROOTBOUND_SUBREGIONS[0], bestDistance = Infinity;
  for (const region of ROOTBOUND_SUBREGIONS) {
    const distance = ((x - region.x) / region.radiusX) ** 2 + ((z - region.z) / region.radiusZ) ** 2;
    if (distance < bestDistance) { best = region; bestDistance = distance; }
  }
  return best.id;
}

/** Returns an additive, seam-neutral terrain height for Rootbound's five rooms. */
export function sampleRootboundLandform(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || x < -525 || x > -325 || z < 550 || z > 750) {
    return { active: false, heightOffset: 0, influence: 0, zone: null, bowlDepth: 0 };
  }
  let heightOffset = 0;
  for (const shelf of SHELVES) heightOffset = Math.max(heightOffset, plateauHeight(x, z, shelf));
  const ribbon = routeRibbon(x, z);
  heightOffset += (ribbon.elevation - heightOffset) * ribbon.weight;
  // Lantern is intentionally a sheltered floor below the surrounding gallery
  // benches.  The negative bowl remains wide enough for a real playable room.
  const bowlWeight = smooth(1 - Math.hypot((x + 444) / 18, (z - 679) / 14));
  const bowlDepth = bowlWeight * 1.95;
  const edge = smooth(Math.min(x + 525, -325 - x, z - 550, 750 - z) / 18);
  let supportedHeight = Math.max(0, heightOffset - bowlDepth) * edge;
  for (const pad of SUPPORT_PADS) {
    const weight = padWeight(x, z, pad) * edge;
    supportedHeight += (pad.elevation - supportedHeight) * weight;
  }
  return {
    active: edge > 0 && (heightOffset > 0 || ribbon.weight > 0),
    heightOffset: supportedHeight,
    influence: Math.max(ribbon.weight, Math.min(1, heightOffset / 6.8)) * edge,
    zone: nearestZone(x, z),
    bowlDepth: bowlDepth * edge,
  };
}
