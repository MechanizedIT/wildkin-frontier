import * as THREE from 'three';
import { mergeGeometries } from '../../vendor/utils/BufferGeometryUtils.js';
import { CAMP_CROP_GROWTH_SECONDS, getCampCropStage } from './campGardenState.js';
import { FRONTIER_COLORS, bevelBox, leafBlade } from '../world/facetedMeshKit.js';

const PLANTS = Object.freeze([
  { x: 0, z: -.30, height: .60 },
  { x: -.45, z: .25, height: .51 },
  { x: .45, z: .24, height: .54 },
]);

function material(color, extras = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, flatShading: true, ...extras });
}

function merge(parts) {
  const geometries = parts.map(({ geometry, position = [0, 0, 0], rotation = [0, 0, 0] }) => {
    geometry.rotateX(rotation[0]).rotateY(rotation[1]).rotateZ(rotation[2]);
    geometry.translate(...position);
    return geometry;
  });
  const joined = mergeGeometries(geometries);
  geometries.forEach(geometry => geometry.dispose());
  return joined;
}

function shrubLeaves() {
  return PLANTS.flatMap((plant, plantIndex) => {
    const tiers = [
      { count: 6, base: .36, length: .38, width: .14, tilt: 1.08 },
      { count: 6, base: .47, length: .34, width: .125, tilt: .91 },
      { count: 4, base: .61, length: .31, width: .105, tilt: .64 },
    ];
    return tiers.flatMap((tier, tierIndex) => Array.from({ length: tier.count }, (_, index) => {
      const radial = index / tier.count * Math.PI * 2 + plantIndex * .47 + tierIndex * .28;
      const length = tier.length * (1 + ((index + plantIndex) % 3 - 1) * .07);
      return {
        geometry: leafBlade(length, tier.width, .035),
        position: [plant.x, tier.base + plantIndex * .012, plant.z],
        rotation: [tier.tilt, radial, 0],
      };
    }));
  });
}

function berryPositions() {
  return PLANTS.flatMap((plant, index) => [[-.11,-.04],[.12,.07]].flatMap(([dx,dz], cluster) =>
    [[-.035,0,-.025,.92],[.038,.018,-.018,1.04],[-.018,.042,.035,.84],[.025,.058,.026,.98]].map(([ox,oy,oz,scale]) =>
      [plant.x + dx + ox, .61 + plant.height * .27 + cluster * .045 + oy, plant.z + dz + oz, scale * (1 + index * .035)])));
}

function instancedCluster(name, color, points, radius) {
  const mesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(radius, 0), material(color), points.length);
  mesh.name = name;
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3(), rotation = new THREE.Quaternion();
  points.forEach(([x, y, z, size = 1], index) => { position.set(x, y, z); scale.setScalar(size); matrix.compose(position, rotation, scale); mesh.setMatrixAt(index, matrix); });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

function blossomCluster() {
  const centers = PLANTS.map((plant, index) => [plant.x + .03, .69 + plant.height * .30 + index * .008, plant.z - .02]);
  const petals = centers.flatMap(([x,y,z]) => [[x-.04,y,z],[x+.04,y,z],[x,y,z-.04],[x,y,z+.04],[x,y+.015,z]]);
  return instancedCluster('garden-blossoms', '#f2e3bc', petals, .026);
}

export function createBerryGardenVisual(piece) {
  const [width, height, depth] = piece.size;
  const group = new THREE.Group();
  group.name = 'berry-garden';

  const frame = new THREE.Mesh(merge([
    { geometry: bevelBox(width, .14, .13, .025), position: [0, .22, depth * .5 - .065] },
    { geometry: bevelBox(width, .14, .13, .025), position: [0, .22, -depth * .5 + .065] },
    { geometry: bevelBox(.13, .14, depth - .22, .025), position: [width * .5 - .065, .22, 0] },
    { geometry: bevelBox(.13, .14, depth - .22, .025), position: [-width * .5 + .065, .22, 0] },
    ...[-1, 1].flatMap(x => [-1, 1].map(z => ({ geometry: bevelBox(.16, .16, .16, .02), position: [x * (width * .5 - .13), .08, z * (depth * .5 - .13)] }))),
  ]), material(FRONTIER_COLORS.wood));
  frame.name = 'berry-garden-timber-frame';
  frame.castShadow = frame.receiveShadow = true;
  group.add(frame);

  const soil = new THREE.Mesh(bevelBox(width - .28, .12, depth - .28, .035), material('#4b3323'));
  soil.name = 'berry-garden-soil';
  soil.position.y = .24;
  soil.castShadow = soil.receiveShadow = true;
  group.add(soil);

  const sprouts = new THREE.Mesh(merge(PLANTS.flatMap(plant => [
    { geometry: leafBlade(.13, .045, .012), position: [plant.x, .32, plant.z], rotation: [0, -.45, .14] },
    { geometry: leafBlade(.11, .04, .012), position: [plant.x, .32, plant.z], rotation: [0, .65, -.12] },
  ])), material('#70933c', { side: THREE.DoubleSide }));
  sprouts.name = 'garden-sprouts'; sprouts.castShadow = sprouts.receiveShadow = true; group.add(sprouts);

  const mounds = new THREE.Mesh(merge(PLANTS.map(plant => ({
    geometry: new THREE.DodecahedronGeometry(1, 0).scale(.23, .045, .19), position: [plant.x, .345, plant.z],
  }))), material('#5b3d27'));
  mounds.name = 'garden-plant-mounds'; mounds.castShadow = mounds.receiveShadow = true; group.add(mounds);

  const stems = new THREE.Mesh(merge(PLANTS.map(plant => ({
    geometry: new THREE.CylinderGeometry(.018, .025, plant.height, 5), position: [plant.x, .32 + plant.height * .5, plant.z],
  }))), material('#35652f'));
  stems.name = 'garden-stems'; stems.castShadow = stems.receiveShadow = true; group.add(stems);
  const leaves = shrubLeaves();
  const leafLight = new THREE.Mesh(merge(leaves.filter((_, index) => index % 2 === 0)), material('#5f963e', { side: THREE.DoubleSide }));
  leafLight.name = 'garden-leaves-light'; leafLight.castShadow = leafLight.receiveShadow = true;
  const leafDark = new THREE.Mesh(merge(leaves.filter((_, index) => index % 2 === 1)), material('#356d38', { side: THREE.DoubleSide }));
  leafDark.name = 'garden-leaves-dark'; leafDark.castShadow = leafDark.receiveShadow = true;
  group.add(leafLight, leafDark);

  const unripe = instancedCluster('garden-berries-unripe', '#92b64a', berryPositions(), .052);
  const ripe = instancedCluster('garden-berries-ripe', '#bd3e34', berryPositions(), .058);
  const blossoms = blossomCluster();
  group.add(unripe, ripe, blossoms);

  let stateKey = '';
  function setGardenState(crop, bloomTended = false) {
    const planted = crop && Number.isFinite(crop.growthSeconds);
    const seconds = planted ? Math.max(0, Math.min(CAMP_CROP_GROWTH_SECONDS, crop.growthSeconds)) : 0;
    const stage = planted ? getCampCropStage(crop) : null;
    const ripeStage = stage === 2 && seconds >= CAMP_CROP_GROWTH_SECONDS;
    const key = `${stage}|${ripeStage}|${!!bloomTended}`;
    if (key === stateKey) return;
    stateKey = key;
    sprouts.visible = stage === 0;
    mounds.visible = stage !== null;
    stems.visible = stage !== null && stage >= 1;
    leafLight.visible = leafDark.visible = stage !== null && stage >= 1;
    unripe.visible = stage === 2 && !ripeStage;
    ripe.visible = ripeStage;
    blossoms.visible = ripeStage && !!bloomTended;
  }
  setGardenState(null, false);
  group.userData.ownsBaseResources = true;
  group.userData.setGardenState = setGardenState;
  return group;
}

// Shared by the base runtime and static thumbnail/stage proof. It only flips
// cached meshes on the supplied visual; progress remains the crop authority.
export function updateBerryGardenVisual(root, crop, bloomTended = false) {
  root?.userData?.setGardenState?.(crop ?? null, !!bloomTended);
}
