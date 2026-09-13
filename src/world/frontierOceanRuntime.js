import * as THREE from 'three';

export const FRONTIER_OCEAN_CONFIG = Object.freeze({
  gridStep: 5,
  foamWidth: .82,
  currentBandMin: 24,
  currentBandMax: 45,
  maxCurrentStreaks: 12,
  maxWakeSegments: 18,
});

// Authored swatches are display colors; vertex colors must be linear.
const SHALLOW = Object.freeze(new THREE.Color(0x32acb2).toArray());
const DEEP = Object.freeze(new THREE.Color(0x0e374d).toArray());
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

function hash(x, z, salt = 0) {
  let value = Math.imul(Math.floor(x) | 0, 374761393)
    ^ Math.imul(Math.floor(z) | 0, 668265263) ^ Math.imul(salt | 0, 1274126177);
  value = Math.imul(value ^ (value >>> 13), 2246822519);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function getCoastDistance(value) {
  const distance = Number(value?.coastDistance);
  if (Number.isFinite(distance)) return distance;
  return value?.land === false ? -1 : 1;
}

function getWaterDepth(value) {
  const depth = Number(value?.waterDepth);
  return Number.isFinite(depth) && depth > 0 ? depth : 0;
}

function makeGrid(sample, bounds, step) {
  const nx = Math.max(2, Math.round((bounds.maxX - bounds.minX) / step) + 1);
  const nz = Math.max(2, Math.round((bounds.maxZ - bounds.minZ) / step) + 1);
  const samples = new Array(nx * nz);
  let seaLevel = -2, water = false, sampleCalls = 0;
  for (let iz = 0; iz < nz; iz += 1) for (let ix = 0; ix < nx; ix += 1) {
    const x = bounds.minX + ix * step, z = bounds.minZ + iz * step;
    const value = sample(x, z) ?? {};
    sampleCalls += 1;
    if (Number.isFinite(value.seaLevel)) seaLevel = value.seaLevel;
    const distance = getCoastDistance(value);
    if (value.land === false || distance <= 0) water = true;
    samples[iz * nx + ix] = { x, z, value, distance };
  }
  return { nx, nz, samples, seaLevel, water, sampleCalls };
}

function createWaterGeometry(grid) {
  const { nx, nz, samples, seaLevel } = grid;
  const positions = new Float32Array(samples.length * 3);
  const colors = new Float32Array(samples.length * 3);
  for (let index = 0; index < samples.length; index += 1) {
    const point = samples[index], depth = clamp(getWaterDepth(point.value) / 5, 0, 1);
    const variation = (hash(point.x, point.z, 31) - .5) * .006;
    positions.set([point.x, seaLevel, point.z], index * 3);
    for (let channel = 0; channel < 3; channel += 1) {
      colors[index * 3 + channel] = clamp(SHALLOW[channel] + (DEEP[channel] - SHALLOW[channel]) * depth + variation, 0, 1);
    }
  }
  const indices = new Uint32Array((nx - 1) * (nz - 1) * 6);
  let cursor = 0;
  for (let iz = 0; iz < nz - 1; iz += 1) for (let ix = 0; ix < nx - 1; ix += 1) {
    const a = iz * nx + ix, b = a + 1, c = a + nx, d = c + 1;
    indices.set([a, c, b, b, c, d], cursor); cursor += 6;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

function edgeCrossing(a, b) {
  if (a.distance === 0 && b.distance === 0) return null;
  if ((a.distance < 0) === (b.distance < 0) && a.distance !== 0 && b.distance !== 0) return null;
  const denominator = a.distance - b.distance;
  const t = denominator === 0 ? .5 : clamp(a.distance / denominator, 0, 1);
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}

function addRibbon(positions, a, b, y, width) {
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
  if (!(length > .001)) return false;
  const nx = -dz / length * width * .5, nz = dx / length * width * .5;
  positions.push(
    a.x + nx, y, a.z + nz, a.x - nx, y, a.z - nz,
    b.x + nx, y, b.z + nz, b.x + nx, y, b.z + nz,
    a.x - nx, y, a.z - nz, b.x - nx, y, b.z - nz,
  );
  return true;
}

function createFoamGeometry(grid, width) {
  const { nx, nz, samples, seaLevel } = grid;
  const positions = [];
  let segments = 0;
  for (let iz = 0; iz < nz - 1; iz += 1) for (let ix = 0; ix < nx - 1; ix += 1) {
    const a = samples[iz * nx + ix], b = samples[iz * nx + ix + 1];
    const c = samples[(iz + 1) * nx + ix], d = samples[(iz + 1) * nx + ix + 1];
    const points = [edgeCrossing(a, b), edgeCrossing(b, d), edgeCrossing(d, c), edgeCrossing(c, a)]
      .filter(Boolean).filter((point, index, all) => all.findIndex(other => Math.hypot(point.x - other.x, point.z - other.z) < .001) === index);
    if (points.length === 2 && addRibbon(positions, points[0], points[1], seaLevel + .035, width)) segments += 1;
    else if (points.length === 4) {
      if (addRibbon(positions, points[0], points[1], seaLevel + .035, width)) segments += 1;
      if (addRibbon(positions, points[2], points[3], seaLevel + .035, width)) segments += 1;
    }
  }
  if (!positions.length) return { geometry: null, segments: 0 };
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeBoundingSphere();
  return { geometry, segments };
}

function currentCandidates(sample, bounds, config, seaLevel) {
  const candidates = [], step = 10;
  for (let z = bounds.minZ + step * .5; z < bounds.maxZ; z += step) for (let x = bounds.minX + step * .5; x < bounds.maxX; x += step) {
    const value = sample(x, z) ?? {}, offshore = -getCoastDistance(value);
    if (offshore < config.currentBandMin || offshore > config.currentBandMax) continue;
    const inlandX = Number(value.inlandDirection?.x), inlandZ = Number(value.inlandDirection?.z);
    const inlandLength = Math.hypot(inlandX, inlandZ);
    if (!(inlandLength > .0001)) continue;
    const token = hash(x, z, 79);
    candidates.push({
      x, z, y: seaLevel + .055, token,
      tx: inlandX / inlandLength, tz: inlandZ / inlandLength,
      length: 5.5 + hash(x, z, 83) * 7.5,
      width: .16 + hash(x, z, 89) * .2,
      phase: hash(x, z, 97) * 8,
      speed: .55 + hash(x, z, 101) * .55,
    });
  }
  const centerX = (bounds.minX + bounds.maxX) * .5, centerZ = (bounds.minZ + bounds.maxZ) * .5;
  const distanceSq = point => (point.x - centerX) ** 2 + (point.z - centerZ) ** 2;
  return candidates.sort((a, b) => distanceSq(a) - distanceSq(b) || a.token - b.token).slice(0, config.maxCurrentStreaks);
}

function writeRibbon(array, cursor, ax, az, bx, bz, y, width) {
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  const nx = -dz / length * width * .5, nz = dx / length * width * .5;
  array.set([
    ax + nx, y, az + nz, ax - nx, y, az - nz, bx + nx, y, bz + nz,
    bx + nx, y, bz + nz, ax - nx, y, az - nz, bx - nx, y, bz - nz,
  ], cursor);
  return cursor + 18;
}

function clearReservedPositions(array, cursor, segmentCount) {
  array.fill(0, cursor, cursor + segmentCount * 18);
}

function writeWakePositions(array, cursor, { playerPosition, heading, seaLevel, elapsed, visible, maxSegments }) {
  if (!visible || !playerPosition || !Number.isFinite(playerPosition.x) || !Number.isFinite(playerPosition.z)) {
    clearReservedPositions(array, cursor, maxSegments);
    return 0;
  }
  const px = playerPosition.x, pz = playerPosition.z, y = seaLevel + .075;
  const fx = heading.x, fz = heading.z, rx = fz, rz = -fx;
  const point = (angle, major, minor) => ({
    x: px + fx * Math.cos(angle) * major + rx * Math.sin(angle) * minor,
    z: pz + fz * Math.cos(angle) * major + rz * Math.sin(angle) * minor,
  });
  const pulse = Math.sin(elapsed * 3.2) * .025;
  let count = 0;
  for (let index = 0; index < 10; index += 1) {
    const angle = index * Math.PI * .2 + elapsed * .08;
    const a = point(angle - .16, .62 + pulse, .4 + pulse), b = point(angle + .16, .62 + pulse, .4 + pulse);
    cursor = writeRibbon(array, cursor, a.x, a.z, b.x, b.z, y, .055); count += 1;
  }
  for (let index = 0; index < 4; index += 1) {
    const angle = index * Math.PI * .5 - elapsed * .05;
    const a = point(angle - .12, .82 + pulse, .58 + pulse), b = point(angle + .12, .82 + pulse, .58 + pulse);
    cursor = writeRibbon(array, cursor, a.x, a.z, b.x, b.z, y + .006, .04); count += 1;
  }
  for (const side of [-1, 1]) {
    cursor = writeRibbon(array, cursor,
      px - fx * .45 + rx * side * .2, pz - fz * .45 + rz * side * .2,
      px - fx * .84 + rx * side * .4, pz - fz * .84 + rz * side * .4, y, .05); count += 1;
    cursor = writeRibbon(array, cursor,
      px - fx * .98 + rx * side * .47, pz - fz * .98 + rz * side * .47,
      px - fx * 1.42 + rx * side * .68, pz - fz * 1.42 + rz * side * .68, y, .04); count += 1;
  }
  clearReservedPositions(array, cursor, maxSegments - count);
  return count;
}

function writeCurrentPositions(attribute, streaks, elapsed, wake = {}) {
  const positions = attribute.array;
  let cursor = 0;
  for (const streak of streaks) {
    const cycle = 8;
    const travel = ((streak.phase + elapsed * streak.speed) % cycle) - cycle * .5;
    const cx = streak.x + streak.tx * travel, cz = streak.z + streak.tz * travel;
    const hx = streak.tx * streak.length * .5, hz = streak.tz * streak.length * .5;
    const nx = -streak.tz * streak.width * .5, nz = streak.tx * streak.width * .5;
    const ax = cx - hx, az = cz - hz, bx = cx + hx, bz = cz + hz, y = streak.y;
    const values = [
      ax + nx, y, az + nz, ax - nx, y, az - nz, bx + nx, y, bz + nz,
      bx + nx, y, bz + nz, ax - nx, y, az - nz, bx - nx, y, bz - nz,
    ];
    positions.set(values, cursor); cursor += values.length;
  }
  const wakeSegments = writeWakePositions(positions, cursor, wake);
  attribute.needsUpdate = true;
  return wakeSegments;
}

function createCurrentGeometry(streaks, wakeCapacity) {
  if (!streaks.length && !wakeCapacity) return null;
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(new Float32Array((streaks.length + wakeCapacity) * 18), 3);
  geometry.setAttribute('position', attribute);
  writeCurrentPositions(attribute, streaks, 0, { maxSegments: wakeCapacity });
  geometry.computeBoundingSphere();
  return geometry;
}

/** Borrows the published terrain window and owns only bounded ocean presentation. */
export function createFrontierOceanRuntime({ parent, sample, chunkSize = 50, radius = 2 } = {}) {
  if (typeof sample !== 'function') throw new Error('frontier ocean requires a terrain sampler');
  chunkSize = finite(chunkSize, 50);
  radius = Math.max(0, Math.min(4, Math.trunc(finite(radius, 2))));
  if (!(chunkSize > 0)) throw new Error('frontier ocean requires a positive chunk size');

  const root = new THREE.Group(); root.name = 'frontier_ocean'; parent?.add(root);
  const waterMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: true, toneMapped: false });
  const foamMaterial = new THREE.MeshBasicMaterial({ color: 0xd7fff0, transparent: true, opacity: .72, depthWrite: false, side: THREE.DoubleSide, fog: true });
  const currentMaterial = new THREE.MeshBasicMaterial({ color: 0xc8f4eb, transparent: true, opacity: .38, depthWrite: false, side: THREE.DoubleSide, fog: true, toneMapped: false });
  let windowKey = null, waterMesh = null, foamMesh = null, currentMesh = null, streaks = [];
  let elapsed = 0, rebuilds = 0, sampleCalls = 0, foamSegments = 0, wakeSegments = 0, disposed = false, hidden = false;
  let seaLevel = -2, lastPlayerPosition = null;
  const wakeHeading = { x: 0, z: 1 };

  function clearMeshes() {
    for (const mesh of [waterMesh, foamMesh, currentMesh]) {
      if (!mesh) continue;
      root.remove(mesh); mesh.geometry.dispose();
    }
    waterMesh = foamMesh = currentMesh = null; streaks = []; foamSegments = 0; wakeSegments = 0;
  }

  function syncResidency(residency) {
    if (disposed) return false;
    const cx = Number(residency?.center?.cx), cz = Number(residency?.center?.cz);
    const nextKey = Number.isFinite(cx) && Number.isFinite(cz) ? `${Math.trunc(cx)},${Math.trunc(cz)}` : null;
    if (nextKey === windowKey) return false;
    clearMeshes(); windowKey = nextKey; elapsed = 0; rebuilds += 1;
    if (!nextKey) { root.visible = false; return true; }
    const centerX = Math.trunc(cx), centerZ = Math.trunc(cz);
    const bounds = {
      minX: (centerX - radius) * chunkSize,
      maxX: (centerX + radius + 1) * chunkSize,
      minZ: (centerZ - radius) * chunkSize,
      maxZ: (centerZ + radius + 1) * chunkSize,
    };
    const grid = makeGrid(sample, bounds, FRONTIER_OCEAN_CONFIG.gridStep);
    seaLevel = grid.seaLevel;
    sampleCalls += grid.sampleCalls;
    if (!grid.water) { root.visible = false; return true; }

    waterMesh = new THREE.Mesh(createWaterGeometry(grid), waterMaterial);
    waterMesh.name = 'frontier_ocean_water'; waterMesh.renderOrder = 0;
    root.add(waterMesh);
    const foam = createFoamGeometry(grid, FRONTIER_OCEAN_CONFIG.foamWidth);
    foamSegments = foam.segments;
    if (foam.geometry) {
      foamMesh = new THREE.Mesh(foam.geometry, foamMaterial);
      foamMesh.name = 'frontier_ocean_foam'; foamMesh.renderOrder = 1; root.add(foamMesh);
    }
    streaks = currentCandidates(sample, bounds, FRONTIER_OCEAN_CONFIG, grid.seaLevel);
    const currentGeometry = createCurrentGeometry(streaks, FRONTIER_OCEAN_CONFIG.maxWakeSegments);
    if (currentGeometry) {
      currentMesh = new THREE.Mesh(currentGeometry, currentMaterial);
      currentMesh.name = 'frontier_ocean_currents'; currentMesh.renderOrder = 2;
      currentMesh.frustumCulled = false;
      root.add(currentMesh);
    }
    root.visible = !hidden;
    return true;
  }

  function update(dt, { hidden: nextHidden = false, paused = false, playerPosition = null, swimming = false } = {}) {
    if (disposed) return;
    hidden = !!nextHidden;
    root.visible = !!waterMesh && !hidden;
    const validPlayer = playerPosition && Number.isFinite(playerPosition.x) && Number.isFinite(playerPosition.z);
    if (validPlayer && lastPlayerPosition) {
      const dx = playerPosition.x - lastPlayerPosition.x, dz = playerPosition.z - lastPlayerPosition.z;
      const distance = Math.hypot(dx, dz);
      if (swimming && distance > .002) { wakeHeading.x = dx / distance; wakeHeading.z = dz / distance; }
    } else if (validPlayer && swimming) {
      const water = sample(playerPosition.x, playerPosition.z);
      const ix = Number(water?.inlandDirection?.x), iz = Number(water?.inlandDirection?.z), length = Math.hypot(ix, iz);
      if (length > .0001) { wakeHeading.x = ix / length; wakeHeading.z = iz / length; }
    }
    lastPlayerPosition = validPlayer ? { x: playerPosition.x, z: playerPosition.z } : null;
    if (!currentMesh) return;
    const wakeVisible = !!swimming && !hidden && !paused && validPlayer;
    if (!hidden && !paused) elapsed += clamp(finite(dt), 0, .1);
    wakeSegments = writeCurrentPositions(currentMesh.geometry.getAttribute('position'), streaks, elapsed, {
      playerPosition, heading: wakeHeading, seaLevel, elapsed, visible: wakeVisible,
      maxSegments: FRONTIER_OCEAN_CONFIG.maxWakeSegments,
    });
  }

  function reset() {
    if (disposed) return;
    clearMeshes(); windowKey = null; elapsed = 0; hidden = false; root.visible = false; lastPlayerPosition = null;
    wakeHeading.x = 0; wakeHeading.z = 1;
  }

  function getDebugState() {
    return Object.freeze({
      windowKey, visible: root.visible, drawCount: [waterMesh, foamMesh, currentMesh].filter(Boolean).length,
      waterVertices: waterMesh?.geometry.getAttribute('position')?.count ?? 0,
      foamSegments, currentStreaks: streaks.length, wakeSegments, wakeCapacity: FRONTIER_OCEAN_CONFIG.maxWakeSegments,
      rebuilds, sampleCalls, elapsed,
    });
  }

  function dispose() {
    if (disposed) return;
    reset(); parent?.remove(root);
    waterMaterial.dispose(); foamMaterial.dispose(); currentMaterial.dispose(); disposed = true;
  }

  return { root, syncResidency, update, reset, getDebugState, dispose };
}
