// Original procedural environment silhouettes for the Sunlit Wilds pass.
// This module intentionally has no scene or world-data side effects.  The
// visual factory can opt into these meshes for the listed asset ids while the
// normal data-driven primitive recipes remain valid in Author mode.
import * as THREE from "three";

export const CUSTOM_ENVIRONMENT_ASSET_IDS = Object.freeze(new Set([
  "asset_verge_canopy", "asset_fen_reed", "asset_fen_stone", "asset_ember_spire",
  "asset_wind_arch", "asset_heartwood_tree", "asset_fallen_log", "asset_pebble_cluster",
  "asset_sanctuary_totem", "asset_workshop_awning", "asset_frontier_portal",
]));

const mat = (color) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: .86 });
const add = (group, geometry, color, position, scale = [1, 1, 1], rotation = [0, 0, 0]) => {
  const mesh = new THREE.Mesh(geometry, mat(color));
  mesh.position.set(...position); mesh.scale.set(...scale); mesh.rotation.set(...rotation);
  mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
};
const ringGeometry = (rings, segments = 7) => {
  const vertices = [], indices = [];
  for (let row = 0; row < rings.length; row++) for (let col = 0; col < segments; col++) {
    const angle = col / segments * Math.PI * 2;
    const ring = rings[row]; vertices.push(Math.cos(angle) * ring.r, ring.y, Math.sin(angle) * ring.r);
  }
  for (let row = 0; row < rings.length - 1; row++) for (let col = 0; col < segments; col++) {
    const next = (col + 1) % segments, a = row * segments + col, b = row * segments + next;
    // Outward-facing quad winding.  The old order inverted every normal,
    // making rocks and crowns read as hollow black shells in sunlight.
    indices.push(a, a + segments, b, b, a + segments, b + segments);
  }
  const bottom = vertices.length / 3; vertices.push(0, rings[0].y, 0);
  const top = vertices.length / 3; vertices.push(0, rings[rings.length - 1].y, 0);
  for (let col = 0; col < segments; col++) { const next = (col + 1) % segments; indices.push(bottom, next, col); const a = (rings.length - 1) * segments + col, b = (rings.length - 1) * segments + next; indices.push(top, a, b); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); geo.setIndex(indices); geo.computeVertexNormals(); return geo;
};
const leafyCrown = () => ringGeometry([{ y: 0, r: .55 }, { y: .38, r: 1.02 }, { y: .9, r: .78 }, { y: 1.28, r: .22 }]);
const rock = () => ringGeometry([{ y: 0, r: .72 }, { y: .28, r: .92 }, { y: .8, r: .62 }, { y: 1.08, r: .17 }], 6);

function verdantCanopy() {
  const g = new THREE.Group();
  add(g, ringGeometry([{ y: 0, r: .36 }, { y: 1.65, r: .26 }, { y: 2.4, r: .15 }]), "#67442d", [0, 0, 0]);
  // Six overlapping crowns make a rounded, scalloped silhouette from a phone
  // camera instead of one conical tree blob.
  for (const [x, y, z, scale, color] of [[-.58,2.12,.08,1.0,"#255d42"],[.5,2.36,.04,1.0,"#40894c"],[-.1,2.7,-.52,.82,"#347c48"],[.14,2.76,.54,.8,"#529a50"],[-.78,2.62,-.4,.72,"#2f7044"],[.78,2.76,.35,.72,"#61a956"]]) add(g, leafyCrown(), color, [x,y,z], [scale,scale,scale]);
  add(g, leafyCrown(), "#71ae55", [.02, 3.08, -.08], [.78, .82, .78]); return g;
}
function fenReed() {
  const g = new THREE.Group();
  for (const [x, z, h, c] of [[-.35, 0, 1.65, "#4d886f"], [0, .12, 2.15, "#8fc675"], [.33, -.12, 1.55, "#6eaa75"], [.15, -.32, 1.25, "#a6d47b"]]) add(g, ringGeometry([{ y: 0, r: .055 }, { y: h, r: .025 }], 5), c, [x, 0, z]);
  add(g, new THREE.SphereGeometry(.15, 7, 5), "#e0a1cf", [.02, 1.78, .1]); return g;
}
function fenStone() { const g = new THREE.Group(); add(g, rock(), "#5c7892", [0, 0, 0], [.9, 1.85, .72], [0, .18, 0]); add(g, new THREE.BoxGeometry(.12, 1.1, .04), "#91d6d8", [.26, .82, .57], [1, 1, 1], [0, .18, 0]); return g; }
function emberSpire() { const g = new THREE.Group(); add(g, rock(), "#673d38", [0, 0, 0], [1.12, .7, 1]); add(g, ringGeometry([{ y: 0, r: .52 }, { y: 1.8, r: .3 }, { y: 3.25, r: .05 }]), "#a9533f", [.05, .32, 0]); add(g, new THREE.IcosahedronGeometry(.24, 0), "#ffbf58", [.15, 2.1, .3]); return g; }
function windArch() { const g = new THREE.Group(); const geo = ringGeometry([{ y: 0, r: .58 }, { y: 2.2, r: .38 }, { y: 4.35, r: .08 }]); add(g, geo, "#738b98", [0, 0, 0], [1, 1, .9], [0, .1, -.09]); add(g, new THREE.TorusGeometry(.43, .055, 5, 7), "#e0cc87", [0, 2.35, 0], [1, 1, 1], [Math.PI / 2, 0, 0]); return g; }
function heartwood() { const g = new THREE.Group(); add(g, ringGeometry([{ y: 0, r: .6 }, { y: 2.2, r: .52 }, { y: 4.4, r: .25 }, { y: 5.0, r: .12 }]), "#59343f", [0, 0, 0]); add(g, leafyCrown(), "#9e4e77", [-.52, 4.2, 0], [1.3, 1.1, 1.2]); add(g, leafyCrown(), "#d26d95", [.46, 4.58, .04], [1.06, .88, 1.04]); add(g, new THREE.IcosahedronGeometry(.28, 0), "#ffb6d3", [0, 3.18, .48]); return g; }
function fallenLog() { const g = new THREE.Group(); add(g, new THREE.CylinderGeometry(.34, .42, 2.7, 7), "#744b32", [0, .36, 0], [1, 1, 1], [0, 0, Math.PI / 2]); add(g, new THREE.CapsuleGeometry(.17, .7, 4, 7), "#79a754", [0, .63, .05], [1.7, .42, .8], [0, 0, Math.PI / 2]); return g; }
function pebbles() { const g = new THREE.Group(); add(g, rock(), "#718581", [-.27, 0, .05], [.38, .23, .31]); add(g, rock(), "#b0b09a", [.22, 0, .13], [.28, .18, .22]); add(g, rock(), "#526e71", [.08, 0, -.27], [.22, .15, .18]); return g; }
function frontierPortal() {
  const g=new THREE.Group();
  for(const side of [-1,1]){
    add(g,ringGeometry([{y:0,r:.38},{y:.28,r:.42},{y:1.65,r:.27},{y:1.94,r:.34}],8),'#ccad79',[side*1.13,0,0]);
    add(g,new THREE.TorusGeometry(.28,.055,5,8),'#846a4b',[side*1.13,1.25,0],[1,1,1],[Math.PI/2,0,0]);
    add(g,new THREE.IcosahedronGeometry(.15,0),'#58dbc1',[side*1.13,1.53,.31]);
    add(g,leafyCrown(),'#397d51',[side*1.36,.12,-.18],[.38,.27,.45]);
  }
  const curve=new THREE.CatmullRomCurve3([[-1.16,1.75,0],[-.91,2.34,0],[0,2.65,0],[.91,2.34,0],[1.16,1.75,0]].map(p=>new THREE.Vector3(...p)));
  add(g,new THREE.TubeGeometry(curve,18,.23,8,false),'#dcc393',[0,0,0]);
  add(g,new THREE.TorusGeometry(.31,.07,6,12),'#826847',[0,2.47,.18]);
  add(g,new THREE.IcosahedronGeometry(.24,1),'#54d5ba',[0,2.47,.23],[.7,1.1,.6]);
  for(const side of [-1,1])add(g,leafyCrown(),'#4c9857',[side*.89,2.02,-.1],[.42,.25,.5]);
  return g;
}
function sanctuaryTotem() {
  const g = new THREE.Group(), wood='#704b35', leaf='#4c9553', light='#a4e5a8', straw='#d9b35d';
  const tube=(points,radius,color)=>add(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(q=>new THREE.Vector3(...q))),12,radius,7,false),color,[0,0,0]);
  // A pair of bent branch arches creates an open nest shelter, never a pole.
  tube([[-1.25,0,0],[-1.05,1.45,0],[0,2.22,0],[1.05,1.45,0],[1.25,0,0]],.12,wood);
  tube([[-1.05,.06,-.42],[-.78,1.15,-.42],[0,1.72,-.42],[.78,1.15,-.42],[1.05,.06,-.42]],.09,wood);
  add(g,new THREE.CylinderGeometry(.98,1.08,.16,10),straw,[0,.09,0]);
  add(g,new THREE.TorusGeometry(.72,.11,6,10), '#f0d27b',[0,.2,0],[1,1,.82],[Math.PI/2,0,0]);
  for(const [x,z,s] of [[-.75,.3,.72],[.72,.28,.7],[-.45,-.45,.8],[.45,-.42,.82]]) add(g,leafyCrown(),leaf,[x,1.65,z],[s,s*.55,s]);
  for(const [x,z] of [[-1.2,.65],[1.15,.62],[-1.35,-.5],[1.3,-.52]]) add(g,new THREE.SphereGeometry(.11,7,5),light,[x,.16,z]);
  return g;
}
function workshopAwning() {
  const g = new THREE.Group(), wood='#75492f', roof='#397d72', roofLight='#65aa8b', cloth='#e6c56d';
  for(const [x,z] of [[-1.45,-.62],[1.45,-.62],[-1.45,.62],[1.45,.62]]) { add(g,ringGeometry([{y:0,r:.105},{y:2.15,r:.085}],6),wood,[x,0,z]); add(g,new THREE.SphereGeometry(.13,6,5),cloth,[x,2.15,z]); }
  // Cross-beams and a pitched two-slope jade roof, open on all sides.
  for(const z of [-.62,.62]) add(g,new THREE.BoxGeometry(3.22,.13,.13),wood,[0,1.96,z]);
  const roofGeo=new THREE.BufferGeometry();roofGeo.setAttribute('position',new THREE.Float32BufferAttribute([-1.75,2.0,-.82, 0,2.72,-.82, 1.75,2.0,-.82, -1.75,2.0,.82, 0,2.72,.82, 1.75,2.0,.82],3));roofGeo.setIndex([0,1,2,3,5,4,0,3,4,0,4,1,1,4,5,1,5,2]);roofGeo.computeVertexNormals();add(g,roofGeo,roof,[0,0,0]);
  add(g,new THREE.BoxGeometry(2.05,.22,.7),wood,[0,.72,-.28]); // workbench
  add(g,new THREE.BoxGeometry(.15,.78,.15),wood,[-.78,.38,-.28]);add(g,new THREE.BoxGeometry(.15,.78,.15),wood,[.78,.38,-.28]);
  add(g,new THREE.BoxGeometry(.68,.5,.55), '#9b6a3d',[1.05,.27,.35]); // supply crate
  add(g,new THREE.CylinderGeometry(.24,.24,.78,7), '#9a5937',[-1.04,.39,.35],[1,1,1],[0,0,Math.PI/2]); // supply log
  const axe=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.7,6),mat('#5e3927'));axe.position.set(.92,1.4,-.6);axe.rotation.z=.38;g.add(axe);add(g,new THREE.BoxGeometry(.27,.18,.08),'#b9c8ca',[1.04,1.66,-.6],[1,1,1],[0,0,.38]);
  add(g,new THREE.BoxGeometry(.72,.08,.45),cloth,[-.55,1.17,.38]);return g;
}export function createEnvironmentMeshVisual(assetId) {
  if (!CUSTOM_ENVIRONMENT_ASSET_IDS.has(assetId)) return null;
  const makers = { asset_verge_canopy: verdantCanopy, asset_fen_reed: fenReed, asset_fen_stone: fenStone, asset_ember_spire: emberSpire, asset_wind_arch: windArch, asset_heartwood_tree: heartwood, asset_fallen_log: fallenLog, asset_pebble_cluster: pebbles, asset_sanctuary_totem: sanctuaryTotem, asset_workshop_awning: workshopAwning,asset_frontier_portal:frontierPortal };
  const group = makers[assetId](); group.userData.visualKind = `environment/${assetId}`; group.userData.visualAssetId = assetId; return group;
}
