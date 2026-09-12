import * as THREE from 'three';
import { mergeGeometries } from '../../vendor/utils/BufferGeometryUtils.js';
import { FRONTIER_COLORS, bevelBox, leafBlade } from '../world/facetedMeshKit.js';

// The nursery keeps the accepted bench's low wood/iron construction language,
// while making only its seat-height frame useful as a Wildkin resting surface.
// Everything created here belongs to this one placement instance.
function authoredColor(asset, preferred, fallback) {
  return asset?.parts?.some(part => part.color === preferred) ? preferred : fallback;
}

function mergeMeshes(parts) {
  const geometries = parts.map(({ geometry, position = [0, 0, 0], rotation = [0, 0, 0] }) => {
    geometry.rotateX(rotation[0]).rotateY(rotation[1]).rotateZ(rotation[2]);
    geometry.translate(...position);
    return geometry;
  });
  const merged = mergeGeometries(geometries);
  geometries.forEach(geometry => geometry.dispose());
  return merged;
}

function ownedMaterial(color, extras = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, flatShading: true, ...extras });
}

// A low, asymmetric teardrop has a raised center seam, so the moss reads as
// planted leaves from the usual overhead game camera instead of a tiled slab.
function broadMossLeaf(width, length, ridge = .045) {
  const half = length * .5;
  const positions = [
    0, 0, -half, -width * .52, 0, -length * .12, -width * .42, 0, length * .28,
    0, 0, half, width * .42, 0, length * .28, width * .52, 0, -length * .12,
    0, ridge, -length * .15, 0, ridge, length * .20,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex([0,1,6, 1,2,6, 2,7,6, 2,3,7, 0,6,5, 5,6,4, 4,6,7, 3,4,7]);
  geometry.computeVertexNormals();
  return geometry;
}

export function createWildkinBedVisual(piece, asset) {
  const [width, height, depth] = piece.size;
  const wood = authoredColor(asset, '#855333', FRONTIER_COLORS.wood);
  const woodLight = authoredColor(asset, '#aa7440', FRONTIER_COLORS.woodLight);
  const hardware = authoredColor(asset, '#425563', FRONTIER_COLORS.slate);
  const group = new THREE.Group();
  group.name = 'wildkin-nursery-bed';

  // The rails deliberately reach the catalog footprint; the moss bed stays
  // inset, leaving the low bench frame readable from every side.
  const woodGeometry = mergeMeshes([
    { geometry: bevelBox(width, .09, .12, .025), position: [0, .34, depth * .5 - .06] },
    { geometry: bevelBox(width, .09, .12, .025), position: [0, .34, -depth * .5 + .06] },
    { geometry: bevelBox(.14, .09, depth - .20, .025), position: [width * .5 - .07, .34, 0] },
    { geometry: bevelBox(.14, .09, depth - .20, .025), position: [-width * .5 + .07, .34, 0] },
    { geometry: bevelBox(width - .22, .12, depth - .22, .025), position: [0, .29, 0] },
    ...[-1, 1].flatMap(x => [-1, 1].map(z => ({
      geometry: bevelBox(.15, .25, .15, .025),
      position: [x * (width * .5 - .17), .125, z * (depth * .5 - .16)],
    }))),
  ]);
  const woodMesh = new THREE.Mesh(woodGeometry, ownedMaterial(wood));
  woodMesh.name = 'nursery-bench-frame';
  woodMesh.castShadow = woodMesh.receiveShadow = true;
  group.add(woodMesh);

  const shoesGeometry = mergeMeshes([-1, 1].flatMap(x => [-1, 1].map(z => ({
    geometry: bevelBox(.21, .07, .21, .02),
    position: [x * (width * .5 - .17), .035, z * (depth * .5 - .16)],
  }))));
  const shoes = new THREE.Mesh(shoesGeometry, ownedMaterial(hardware));
  shoes.name = 'nursery-frame-shoes';
  shoes.castShadow = shoes.receiveShadow = true;
  group.add(shoes);

  // A recessed dark layer gives the cushions a readable edge and shadow. The
  // top is a deliberately broad quilt of low, overlapping moss pads rather
  // than one unbroken green slab.
  const mossBase = new THREE.Mesh(bevelBox(width - .28, .15, depth - .26, .04), ownedMaterial('#3e572b'));
  mossBase.name = 'nursery-moss-underlayer';
  mossBase.position.set(0, .45, 0);
  mossBase.castShadow = mossBase.receiveShadow = true;
  group.add(mossBase);
  const mossPads = [
    [-.46,-.20,.25,.18,.040,-.18],[-.05,-.22,.27,.18,.042,.14],[.30,-.17,.22,.17,.040,-.12],
    [-.45,.15,.24,.18,.040,.18],[-.07,.15,.26,.18,.043,-.12],[.28,.12,.20,.16,.038,.22],
  ];
  const padParts = mossPads.map(([x,z,spanX,spanZ,padHeight,turn]) => ({
    geometry: new THREE.DodecahedronGeometry(1, 0).scale(spanX, padHeight, spanZ),
    position: [x, .515 + padHeight * .25, z], rotation: [0, turn, 0],
  }));
  const mossLightGeometry = mergeMeshes(padParts.filter((_, index) => index % 3 !== 1));
  const mossDarkGeometry = mergeMeshes(padParts.filter((_, index) => index % 3 === 1));
  const mossLight = new THREE.Mesh(mossLightGeometry, ownedMaterial('#718c3c'));
  mossLight.name = 'nursery-moss-cushions-light';
  mossLight.castShadow = mossLight.receiveShadow = true;
  const mossDark = new THREE.Mesh(mossDarkGeometry, ownedMaterial('#587330'));
  mossDark.name = 'nursery-moss-cushions-dark';
  mossDark.castShadow = mossDark.receiveShadow = true;
  group.add(mossLight, mossDark);

  const leafPads = [
    [-.56,-.29,.34,.40,.045,-.55],[-.18,-.31,.42,.46,.050,.18],[.25,-.27,.34,.40,.045,-.18],
    [-.55,.11,.35,.43,.045,.30],[-.16,.20,.42,.43,.050,-.20],[.27,.18,.31,.36,.040,.35],
  ];
  const leafPadParts = leafPads.map(([x,z,leafWidth,leafLength,ridge,turn]) => ({
    geometry: broadMossLeaf(leafWidth, leafLength, ridge), position: [x, .535, z], rotation: [0, turn, 0],
  }));
  const leafPadsLight = new THREE.Mesh(mergeMeshes(leafPadParts.filter((_, index) => index % 2 === 0)), ownedMaterial('#7f9b45', { side: THREE.DoubleSide }));
  leafPadsLight.name = 'nursery-moss-leaves-light';
  const leafPadsDark = new THREE.Mesh(mergeMeshes(leafPadParts.filter((_, index) => index % 2 === 1)), ownedMaterial('#638137', { side: THREE.DoubleSide }));
  leafPadsDark.name = 'nursery-moss-leaves-dark';
  for (const leaf of [leafPadsLight, leafPadsDark]) { leaf.castShadow = leaf.receiveShadow = true; group.add(leaf); }

  const bowlGeometry = mergeMeshes([
    { geometry: new THREE.CylinderGeometry(.17, .20, .15, 8, 1, true), position: [.64, .575, .39] },
    { geometry: new THREE.TorusGeometry(.17, .025, 4, 8), position: [.64, .66, .39], rotation: [Math.PI * .5, 0, 0] },
  ]);
  const bowl = new THREE.Mesh(bowlGeometry, ownedMaterial(woodLight));
  bowl.name = 'nursery-berry-bowl';
  bowl.castShadow = bowl.receiveShadow = true;
  group.add(bowl);

  // Named portions let the care owner switch nourishment visibility without
  // allocating scene objects. They deliberately share this visual's one small
  // berry geometry and material.
  const berries = new THREE.Group();
  berries.name = 'nursery-berries';
  const berryGeometry = new THREE.DodecahedronGeometry(.065, 0);
  const berryMaterial = ownedMaterial('#bd3e34');
  const berryMeshes = [[.585, .695, .355], [.695, .715, .395], [.65, .695, .465]].map((position, index) => {
    const berry = new THREE.Mesh(berryGeometry, berryMaterial);
    berry.name = `nursery-berry-${index}`;
    berry.position.set(...position);
    berry.castShadow = berry.receiveShadow = true;
    berries.add(berry);
    return berry;
  });
  group.add(berries);

  const sprigGeometry = mergeMeshes([
    { geometry: leafBlade(.24, .085, .018), position: [-.61, .55, -.28], rotation: [-1.08, -.55, 0] },
    { geometry: leafBlade(.22, .078, .018), position: [-.61, .55, -.28], rotation: [-1.00, .10, 0] },
    { geometry: leafBlade(.20, .072, .016), position: [-.61, .55, -.28], rotation: [-1.05, .78, 0] },
  ]);
  const sprig = new THREE.Mesh(sprigGeometry, ownedMaterial('#4d823c', { side: THREE.DoubleSide }));
  sprig.name = 'nursery-moss-sprig';
  sprig.castShadow = sprig.receiveShadow = true;
  group.add(sprig);

  const mossTuftsGeometry = mergeMeshes([
    { geometry: leafBlade(.23, .082, .018), position: [.20, .55, -.34], rotation: [-1.06, -.45, 0] },
    { geometry: leafBlade(.21, .076, .016), position: [.20, .55, -.34], rotation: [-1.00, .25, 0] },
    { geometry: leafBlade(.19, .068, .015), position: [.20, .55, -.34], rotation: [-1.04, .92, 0] },
  ]);
  const mossTufts = new THREE.Mesh(mossTuftsGeometry, ownedMaterial('#809a45', { side: THREE.DoubleSide }));
  mossTufts.name = 'nursery-moss-tufts';
  mossTufts.castShadow = mossTufts.receiveShadow = true;
  group.add(mossTufts);

  group.userData.ownsBaseResources = true;
  group.userData.nurseryBerryMeshes = berryMeshes;
  return group;
}
