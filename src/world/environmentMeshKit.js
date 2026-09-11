// Original procedural environment silhouettes for the Sunlit Wilds pass.
// This module has no scene or world-data side effects. The focused bake tool
// serializes its maintained meshes into ordinary editable asset recipes;
// runtime and Author both render those recipes through the visual factory.
import * as THREE from "three";

export const CUSTOM_ENVIRONMENT_ASSET_IDS = Object.freeze(new Set([
  "asset_verge_canopy", "asset_fen_reed", "asset_fen_stone", "asset_ember_spire",
  "asset_wind_arch", "asset_heartwood_tree", "asset_fallen_log", "asset_pebble_cluster",
  "asset_sanctuary_totem", "asset_workshop_awning", "asset_frontier_portal", "asset_frontier_portal_outpost",
  "asset_verge_canopy_spread", "asset_verge_canopy_tall",
]));

// The kit deliberately uses matte, faceted colour planes.  The phone view
// reads their warm/cool value changes more reliably than specular response.
const mat = (color) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: .9, metalness: 0 });
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
const leafyCrown = () => ringGeometry([{ y: 0, r: .58 }, { y: .28, r: .96 }, { y: .7, r: .9 }, { y: 1.08, r: .55 }, { y: 1.34, r: .16 }], 8);
const rock = () => ringGeometry([{ y: 0, r: .72 }, { y: .28, r: .92 }, { y: .8, r: .62 }, { y: 1.08, r: .17 }], 6);

function verdantCanopy() {
  const g = new THREE.Group();
  add(g, ringGeometry([{ y: 0, r: .44 }, { y: 1.55, r: .29 }, { y: 2.35, r: .16 }], 7), "#613d2b", [0, 0, 0]);
  for (const [x, z, yaw] of [[-.44, .03, -.62], [.44, -.03, .62]]) add(g, new THREE.CylinderGeometry(.12, .17, 1.22, 6), "#875034", [x, 1.56, z], [1, 1, 1], [0, 0, yaw]);
  // Three broad, offset dodecahedral lobes make a tree silhouette rather
  // than a stack of discs; dark skirt lobes keep the sunny crown readable.
  const lobe = new THREE.DodecahedronGeometry(.72, 0);
  for (const [x,y,z,sx,sy,sz,color] of [[-.58,2.2,.02,1.05,.78,.94,"#16463a"],[.56,2.25,.02,1.04,.8,.94,"#1e5940"],[0,2.35,-.5,1.02,.78,.88,"#286c43"],[-.36,2.84,.05,.88,.72,.8,"#338448"],[.43,2.9,.02,.88,.72,.8,"#469b50"],[.02,3.25,-.02,.8,.66,.74,"#6bb65b"]]) add(g,lobe,color,[x,y,z],[sx,sy,sz]);
  return g;
}
function spreadCanopy() {
  const g = verdantCanopy();
  // Broad, low framing silhouette for outer Camp corners.
  g.scale.set(1.42, .82, 1.28);
  return g;
}
function tallCanopy() {
  const g = verdantCanopy();
  // A narrow taller silhouette avoids a wall of identical tree crowns.
  g.scale.set(.8, 1.34, .82);
  return g;
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
    for(const [y,w,h,color] of [[.3,.8,.56,'#27333d'],[.83,.73,.5,'#3e5661'],[1.31,.68,.48,'#c98743'],[1.76,.84,.34,'#f4d9a2']]) add(g,new THREE.BoxGeometry(w,h,.68),color,[side*1.18,y,0]);
    // A deeply recessed ink plane separates the sunlit façade from the arch opening.
    add(g,new THREE.BoxGeometry(.18,1.78,.72),'#49352d',[side*1.18,1.0,.08]);
    add(g,new THREE.IcosahedronGeometry(.17,0),'#f2ce78',[side*1.18,1.54,.35]);
    add(g,new THREE.BoxGeometry(.32,.62,.16),'#263541',[side*1.53,1.25,-.02]);
    add(g,new THREE.BoxGeometry(.18,.46,.12),'#d38b47',[side*1.53,1.25,.1]);
    add(g,new THREE.BoxGeometry(.34,2.02,.42),'#202b35',[side*1.58,1.02,-.08]);
    add(g,new THREE.BoxGeometry(.20,.78,.10),'#f0d6a1',[side*1.58,1.22,.18]);
    add(g,new THREE.BoxGeometry(.17,.17,.17),'#f5c85d',[side*1.58,2.12,.12]);
    for(const [x,y,z,s] of [[side*1.48,.12,-.2,.32],[side*1.02,1.95,-.14,.31]]) add(g,new THREE.DodecahedronGeometry(.55,0),'#2f7946',[x,y,z],[s,s*.55,s]);
  }
  const outer=[[-1.22,1.72,0],[-.98,2.45,0],[0,2.82,0],[.98,2.45,0],[1.22,1.72,0]].map(p=>new THREE.Vector3(...p));
  const inner=[[-.96,1.77,-.33],[-.74,2.27,-.33],[0,2.54,-.33],[.74,2.27,-.33],[.96,1.77,-.33]].map(p=>new THREE.Vector3(...p));
  add(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outer),20,.47,8,false),'#f4d9a1',[0,0,0]);
  add(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(inner),18,.15,7,false),'#382a28',[0,0,0]);
  for(const [x,y,rz] of [[-.78,2.5,-.32],[0,2.79,0],[.78,2.5,.32]]) add(g,new THREE.BoxGeometry(.66,.34,.78),'#e8bd78',[x,y,.02],[1,1,1],[0,0,rz]);
  add(g,new THREE.IcosahedronGeometry(.25,1),'#f4d268',[0,2.55,.3],[.7,1.1,.6]);
  // The camp entrance is a focal silhouette; this presentation scale changes
  // only the visual envelope, never its authored portal trigger/collider.
  g.scale.set(1.18,1.14,1.08);
  return g;
}
function outpostPortal() {
  const g = new THREE.Group(), slate='#293d48', ivory='#e1d7b6', tan='#bd8549';
  for(const side of [-1,1]) {
    add(g,new THREE.BoxGeometry(.8,.3,.92),slate,[side*1.36,.15,0]);
    add(g,new THREE.BoxGeometry(.64,2.12,.74),slate,[side*1.36,1.21,0]);
    for(const face of [-1,1]) {
      add(g,new THREE.BoxGeometry(.5,1.3,.08),tan,[side*1.36,1.11,face*.415]);
      add(g,new THREE.BoxGeometry(.58,.35,.1),ivory,[side*1.36,1.98,face*.43]);
      for(const y of [.39,1.79])add(g,new THREE.BoxGeometry(.7,.15,.14),'#536775',[side*1.36,y,face*.43]);
    }
    add(g,new THREE.BoxGeometry(.44,.45,.48),slate,[side*1.36,2.49,0]);
    add(g,new THREE.BoxGeometry(.25,.3,.51),'#f4cc73',[side*1.36,2.5,0]);
    add(g,new THREE.BoxGeometry(.62,.13,.64),ivory,[side*1.36,2.76,0]);
    add(g,new THREE.BoxGeometry(1.08,.59,.86),slate,[side*.82,2.35,0],[1,1,1],[0,0,-side*.4]);
    add(g,new THREE.BoxGeometry(1.05,.42,.91),ivory,[side*.82,2.47,0],[1,1,1],[0,0,-side*.4]);
    add(g,new THREE.BoxGeometry(.63,.13,.42),tan,[side*1.98,1.07,0]);
    add(g,new THREE.BoxGeometry(.16,1.3,.26),slate,[side*2.29,.65,0]);
    add(g,new THREE.BoxGeometry(.61,.1,.22),slate,[side*1.98,.46,0]);
  }
  add(g,new THREE.BoxGeometry(.78,.5,.86),slate,[0,2.57,0]);
  add(g,new THREE.BoxGeometry(.83,.4,.94),ivory,[0,2.68,0]);
  // The target's imposing frame stays visibly open for the real travel gate.
  return g;
}
function sanctuaryTotem() {
  const g = new THREE.Group(), wood='#5e3829', leaf='#246542', light='#a4e5a8', straw='#c78d53';
  const tube=(points,radius,color)=>add(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(q=>new THREE.Vector3(...q))),12,radius,7,false),color,[0,0,0]);
  // A pair of bent branch arches creates an open nest shelter, never a pole.
  tube([[-1.25,0,0],[-1.05,1.45,0],[0,2.22,0],[1.05,1.45,0],[1.25,0,0]],.12,wood);
  tube([[-1.05,.06,-.42],[-.78,1.15,-.42],[0,1.72,-.42],[.78,1.15,-.42],[1.05,.06,-.42]],.09,wood);
  // Stepped opaque basin: warm outer stone, recessed teal water, then a
  // darker inner wall.  The layers stay visible from the high portrait view.
  add(g,new THREE.CylinderGeometry(1.38,1.5,.22,10),'#bf8650',[0,.11,0]);
  for(const [x,z] of [[-1.12,-.56],[1.12,-.56],[-1.12,.56],[1.12,.56]]) add(g,new THREE.BoxGeometry(.34,.38,.34),'#263541',[x,.25,z]);
  add(g,new THREE.CylinderGeometry(1.24,1.34,.18,10),'#f3d39a',[0,.28,0]);
  add(g,new THREE.CylinderGeometry(1.08,1.17,.14,10,1,true),'#95613d',[0,.39,0]);
  add(g,new THREE.TorusGeometry(1.03,.1,4,10),'#f3d39a',[0,.455,0],[1,1,1],[Math.PI/2,0,0]);
  add(g,new THREE.CylinderGeometry(.86,.86,.025,10),'#237f86',[0,.423,0]);
  add(g,new THREE.CylinderGeometry(.64,.64,.014,10),'#58b9aa',[0,.441,.01]);
  add(g,new THREE.BoxGeometry(1.75,.82,.25),'#293d48',[0,.86,-.85]);
  add(g,new THREE.BoxGeometry(1.9,.2,.36),'#e1d7b6',[0,1.37,-.85]);
  for(const x of [-1.04,1.04]) {
    add(g,new THREE.BoxGeometry(.25,.94,.3),'#344b55',[x,.68,-.65]);
    add(g,new THREE.BoxGeometry(.19,.3,.2),'#f3c568',[x,1.2,-.51]);
    add(g,new THREE.BoxGeometry(.32,.12,.37),'#d6c7a1',[x,1.43,-.65]);
  }
  for(const [x,z] of [[-.92,-.72],[.92,-.72]]) add(g,new THREE.BoxGeometry(.42,.18,.14),'#f0d6a1',[x,.47,z]);
  for(const [x,z,s,yaw] of [[-1.12,.06,.45,-.72],[1.1,.05,.45,.72],[-.06,.98,.4,0],[.08,-1,.4,Math.PI]]) add(g,new THREE.DodecahedronGeometry(.52,0),leaf,[x,.48,z],[s,s*.48,s],[0,yaw,0]);
  // Overlapping canopy lobes deliberately frame the basin instead of leaving
  // a thin branch arch floating above it.
  for(const [x,y,z,sx,sy,sz,c] of [[-.88,1.62,.25,1.18,.76,1.04,'#123e35'],[.86,1.68,.22,1.2,.78,1.04,'#1d5b3d'],[-.44,1.98,-.34,1.04,.76,.94,'#287543'],[.47,2.02,-.32,1.06,.77,.94,'#3d914b'],[.02,2.28,-.04,.98,.7,.88,'#72c35c']]) add(g,new THREE.DodecahedronGeometry(.68,0),c,[x,y,z],[sx,sy,sz]);
  for(const [x,z] of [[-1.25,.65],[1.15,.62],[-1.35,-.5],[1.3,-.52]]) add(g,new THREE.SphereGeometry(.11,7,5),light,[x,.16,z]);
  g.scale.set(1.15,1.12,1.08);
  return g;
}
function workshopAwning() {
  const g = new THREE.Group(), wood='#613927', roof='#16766f', roofLight='#43aa91', cloth='#e6c56d';
  for(const [x,z] of [[-1.45,-.62],[1.45,-.62],[-1.45,.62],[1.45,.62]]) { add(g,ringGeometry([{y:0,r:.15},{y:2.15,r:.12}],6),wood,[x,0,z]); add(g,new THREE.SphereGeometry(.13,6,5),cloth,[x,2.15,z]); for(const y of [.38,.48,.58]) add(g,new THREE.TorusGeometry(.15,.022,5,8),'#d7b05c',[x,y,z],[1,1,1],[Math.PI/2,0,0]); }
  // Heavy timber frame and a two-plane teal roof with a dark eave underside.
  for(const z of [-.62,.62]) add(g,new THREE.BoxGeometry(3.35,.19,.19),wood,[0,1.96,z]);
  const roofGeo=new THREE.BufferGeometry();roofGeo.setAttribute('position',new THREE.Float32BufferAttribute([-1.82,1.98,-.86, 0,2.8,-.86, 1.82,1.98,-.86, -1.82,1.98,.86, 0,2.8,.86, 1.82,1.98,.86],3));roofGeo.setIndex([0,1,2,3,5,4,0,3,4,0,4,1,1,4,5,1,5,2]);roofGeo.computeVertexNormals();add(g,roofGeo,roof,[0,0,0]);
  add(g,new THREE.BoxGeometry(3.75,.18,.18),'#0d4b4b',[0,1.94,.88]);
  add(g,new THREE.BoxGeometry(3.65,.25,.28),'#202b35',[0,1.86,.94]);
  add(g,new THREE.BoxGeometry(3.45,.09,.3),'#d8cdb0',[0,2.02,.94]);
  add(g,new THREE.BoxGeometry(3.75,.14,.18),roofLight,[0,2.01,-.88]);
  add(g,new THREE.BoxGeometry(2.45,.3,.9),'#a86535',[0,.76,-.28]); // workbench
  add(g,new THREE.BoxGeometry(2.18,.08,.7),'#f1c96f',[0,.94,-.3]); // warm counter face
  add(g,new THREE.IcosahedronGeometry(.18,0),'#ffe4a0',[.2,1.12,-.3]); // focal crafted item
  add(g,new THREE.BoxGeometry(.82,.32,.12),'#e0d4b1',[0,2.22,.92]);
  add(g,new THREE.ConeGeometry(.15,.23,3),'#293d48',[0,2.26,1.01],[1,1,.2]);
  for(const x of [-1.45,1.45]) {
    add(g,new THREE.BoxGeometry(.29,.48,.31),'#293d48',[x,.3,.65]);
    add(g,new THREE.BoxGeometry(.29,.36,.31),'#293d48',[x,1.8,.65]);
    add(g,new THREE.BoxGeometry(.19,.34,.2),'#f6ca70',[x,1.47,.88]);
    add(g,new THREE.BoxGeometry(.32,.1,.3),'#293d48',[x,1.68,.88]);
  }
  add(g,new THREE.BoxGeometry(.15,.78,.15),wood,[-.78,.38,-.28]);add(g,new THREE.BoxGeometry(.15,.78,.15),wood,[.78,.38,-.28]);
  add(g,new THREE.BoxGeometry(.68,.5,.55), '#9b6a3d',[1.05,.27,.35]); // supply crate
  add(g,new THREE.CylinderGeometry(.24,.24,.78,7), '#9a5937',[-1.04,.39,.35],[1,1,1],[0,0,Math.PI/2]); // supply log
  const axe=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.7,6),mat('#5e3927'));axe.position.set(.92,1.4,-.6);axe.rotation.z=.38;g.add(axe);add(g,new THREE.BoxGeometry(.27,.18,.08),'#b9c8ca',[1.04,1.66,-.6],[1,1,1],[0,0,.38]);
  add(g,new THREE.BoxGeometry(.72,.08,.45),cloth,[-.55,1.17,.38]);
  for(const x of [-1.55,1.55]) add(g,new THREE.ConeGeometry(.11,.24,5), '#f2c86c',[x,2.35,-.72]);
  add(g,new THREE.CylinderGeometry(.026,.026,2.45,6), '#d6ac5c',[0,1.55,-.84],[1,1,1],[0,0,Math.PI/2]);
  g.scale.set(1.14,1.08,1.08);
  return g;
}export function createEnvironmentMeshVisual(assetId) {
  if (!CUSTOM_ENVIRONMENT_ASSET_IDS.has(assetId)) return null;
  const makers = { asset_verge_canopy: verdantCanopy, asset_verge_canopy_spread: spreadCanopy, asset_verge_canopy_tall: tallCanopy, asset_fen_reed: fenReed, asset_fen_stone: fenStone, asset_ember_spire: emberSpire, asset_wind_arch: windArch, asset_heartwood_tree: heartwood, asset_fallen_log: fallenLog, asset_pebble_cluster: pebbles, asset_sanctuary_totem: sanctuaryTotem, asset_workshop_awning: workshopAwning,asset_frontier_portal:frontierPortal,asset_frontier_portal_outpost:outpostPortal };
  const group = makers[assetId](); group.userData.visualKind = `environment/${assetId}`; group.userData.visualAssetId = assetId; return group;
}
