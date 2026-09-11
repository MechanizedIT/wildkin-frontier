// Purpose-built visual library for the frontier ecology.  These are local-space
// presentation meshes only: authored placement, collision and baking live elsewhere.
import * as THREE from "three";
import { makeMeshKit, facetedRings, leafBlade } from "./facetedMeshKit.js";

export const CUSTOM_ECOLOGY_ASSET_IDS = Object.freeze(new Set([
  "asset_verge_canopy", "asset_verge_canopy_spread", "asset_verge_canopy_tall",
  "asset_redwood_tree", "asset_mushroom_ring", "asset_berry_bush", "asset_fen_reed",
  "asset_fen_lily", "asset_fen_stone", "asset_iron_ore_rock", "asset_crystal",
  "asset_luminous_blossom", "asset_heartwood_tree",
]));

const C = Object.freeze({
  bark: "#5d3729", barkLight: "#8b5635", barkDark: "#382620",
  leafDark: "#163e35", leaf: "#286744", leafLight: "#62a84d",
  redwood: "#75412c", redwoodLight: "#a35c38", pine: "#315d42", pineLight: "#619454",
  cream: "#ead9b7", purple: "#8651a1", purpleLight: "#b875c1",
  twig: "#765133", berry: "#dd4f78", berryLight: "#ff879d",
  reed: "#4c8167", reedLight: "#9fc774", waterLeaf: "#477d67", petal: "#ef9ed2",
  stone: "#526d7d", stoneLight: "#7895a0", ore: "#bd7651", oreLight: "#e8a070",
  crystal: "#4fd1df", crystalLight: "#98f4ed", violetBark: "#563044", violet: "#a64f82", violetLight: "#e180b2",
});

function addRings(kit, name, rings, color, pos = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0], segments = 7) {
  return kit.mesh(name, facetedRings(rings, segments), color, pos, rotation, scale);
}
function addBranch(kit, name, from, to, width, color) { return kit.beam(name, from, to, width, width * .9, color); }
function taperedBranch(kit,name,from,to,base,tip,color){const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),d=b.clone().sub(a);const n=kit.mesh(name,new THREE.CylinderGeometry(tip,base,d.length(),7),color,a.add(b).multiplyScalar(.5));n.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return n;}
function addLeaf(kit, name, pos, length, width, color, yaw = 0, pitch = 0) {
  return kit.mesh(name, leafBlade(length, width, length * .17), color, pos, [pitch, yaw, 0]);
}
function lobe(kit, name, pos, scale, color, rotY = 0) {
  // Subdivided icosahedra retain the deliberate low-poly silhouette while
  // providing the smaller purpose-built face planes of the approved assets.
  return kit.mesh(name, new THREE.IcosahedronGeometry(.58, 1), color, pos, [0, rotY, 0], scale);
}

function vergeTree(variant = "standard") {
  const kit = makeMeshKit(), g = kit.group;
  addRings(kit, "tapered_trunk", [[0,.72],[.42,.78],[1.7,.56],[2.7,.36],[3.45,.18]], C.bark, [0,0,0], [1,1,1], [0,.12,0]);
  for (const [i, a] of [0,.72,1.48,2.32,3.35,4.25,5.35].entries()) taperedBranch(kit,`buttress_${i}`,[0,.58,0],[Math.cos(a)*( .94+(i%2)*.2),.035,Math.sin(a)*(.78+(i%3)*.12)],.31,.08,i%2?C.barkLight:C.barkDark);
  const branches=[[-1.62,2.3,.18],[1.55,2.45,-.3],[-1.08,3.02,-.98],[1.0,3.15,.95],[-.42,3.65,.58],[.48,3.72,-.55]];
  branches.forEach(([x,y,z],i)=>{taperedBranch(kit,`branch_${i}`,[0,y-1.05,0],[x*.86,y-.1,z*.86],.35,.11,i%2?C.barkLight:C.bark);taperedBranch(kit,`fork_${i}`,[x*.56,y-.5,z*.56],[x*.9,y+.05,z*.9],.17,.045,C.barkLight);});
  const crowns=[[-1.35,2.5,.12,.88,.7,.82,C.leafDark],[-.75,2.64,-.66,.95,.74,.88,"#20543b"],[-.12,2.58,-.78,1.0,.76,.9,C.leaf],[.62,2.58,-.62,1.02,.76,.92,C.leafDark],[1.28,2.55,-.05,.96,.73,.88,C.leaf],[1.4,2.76,.58,.82,.64,.78,"#397b45"],[.75,3.15,.65,.93,.7,.86,C.leafLight],[-.03,3.17,.48,1.0,.75,.94,"#479549"],[-.78,3.2,.35,.9,.7,.83,C.leaf],[-.54,3.55,-.28,.82,.65,.75,"#67ad50"],[.2,3.62,-.2,.88,.67,.8,C.leafLight],[.78,3.47,-.18,.78,.6,.72,"#347744"],[.08,4.0,.02,.72,.6,.68,"#8aca5b"]];
  crowns.forEach(([x,y,z,sx,sy,sz,c],i)=>lobe(kit,`canopy_lobe_${i}`,[x,y,z],[sx,sy,sz],c,i*.42));
  for(let i=0;i<7;i++){const a=i*.9+.25; addLeaf(kit,`ground_leaf_${i}`,[Math.cos(a)*.72,.02,Math.sin(a)*.63],.48,.15,i%2?C.leafLight:C.leaf,a,-1.15);}
  for(const [x,z,s] of [[-.72,.44,.22],[.71,.39,.18],[-.32,-.75,.14]])lobe(kit,"base_stone",[x,.1,z],[s,s*.55,s],C.stone);
  if (variant === "spread") { g.scale.set(1.5,.87,1.48); }
  if (variant === "tall") { g.scale.set(.88,1.42,.9); }
  return g;
}

function redwoodTree() {
  const kit=makeMeshKit();
  addRings(kit,"redwood_trunk",[[0,.72],[.5,.76],[2.8,.5],[4.8,.29],[6.15,.11]],C.redwood);
  for(const [i,a] of [0,.82,1.9,3.15,4.45,5.45].entries()) addBranch(kit,`root_${i}`,[0,.26,0],[Math.cos(a)*.84,.04,Math.sin(a)*.84],.16,i%2?C.redwoodLight:C.barkDark);
  for(let i=0;i<5;i++)kit.box(`bark_face_${i}`,[.18,1.1,.035],i%2?C.redwoodLight:C.barkDark,[Math.cos(i*1.27)*.55,1.1+i*.68,Math.sin(i*1.27)*.55],[0,i*1.27,0],.025);
  const levels=[[2.12,1.7,.76],[2.92,1.5,.65],[3.75,1.23,.55],[4.55,.92,.46],[5.25,.62,.37]];
  levels.forEach(([y,r,drop],level)=>{
    for(let i=0;i<5;i++) { const a=i*Math.PI*2/5+level*.35, x=Math.cos(a)*r,z=Math.sin(a)*r;
      addBranch(kit,`bough_${level}_${i}`,[0,y,0],[x,y-drop,z],.13,C.redwoodLight);
      lobe(kit,`pine_fan_${level}_${i}`,[x*.92,y-drop*.45,z*.92],[.68,.27,.34],i%3?C.pine:C.pineLight,a);
      lobe(kit,`pine_tip_${level}_${i}`,[x*1.15,y-drop*.61,z*1.15],[.34,.18,.23],C.leafDark,a);
    }
  });
  for(let i=0;i<5;i++){const a=i*1.25;addLeaf(kit,`base_needle_${i}`,[Math.cos(a)*.8,.02,Math.sin(a)*.72],.52,.13,i%2?C.pineLight:C.pine,a,-1.1);} lobe(kit,"crown_tip",[0,6.05,0],[.42,.7,.42],C.pineLight,.2); return kit.group;
}

function mushroomRing() {
  const kit=makeMeshKit(), spots=[[0,0,1],[-.62,.18,.7],[.56,-.31,.62],[-.28,-.64,.52],[.7,.42,.43]];
  spots.forEach(([x,z,s],i)=>{ const h=.65*s; addRings(kit,`cream_stem_${i}`,[[0,.11*s],[h*.55,.08*s],[h,.12*s]],C.cream,[x,0,z],[1,1,1], [0,i*.8,0],7);
    addRings(kit,`purple_cap_${i}`,[[0,.43*s],[.13,.5*s],[.28,.37*s],[.37,.08*s]],i%2?C.purple:C.purpleLight,[x,h,z],[1,1,1],[0,i*.9,0],8);
    for(let p=0;p<3;p++){const a=p*2.1+i*.5; lobe(kit,`cap_spot_${i}_${p}`,[x+Math.cos(a)*s*.25,h+.25*s,z+Math.sin(a)*s*.25],[.08*s,.025*s,.06*s],"#f4cae1",a);}
  }); for(let i=0;i<5;i++){const a=i*1.25;addLeaf(kit,`ring_grass_${i}`,[Math.cos(a)*.72,.01,Math.sin(a)*.68],.32,.075,C.leafLight,a,-1.2);} return kit.group;
}

function berryBush() {
  const kit=makeMeshKit(); addRings(kit,"twig_core",[[0,.2],[.35,.17],[.7,.07]],C.twig);
  const crowns=[[-.7,.55,.05,.57],[ -.35,.82,-.44,.61],[.25,.78,-.46,.62],[.7,.58,-.06,.58],[.48,.82,.43,.58],[-.3,.73,.48,.62],[0,1.02,.04,.55]];
  crowns.forEach(([x,y,z,s],i)=>{addBranch(kit,`bush_twig_${i}`,[0,.25,0],[x*.78,y*.84,z*.78],.075,C.twig);lobe(kit,`round_leaf_clump_${i}`,[x,y,z],[s,s*.66,s*.83],i%3?C.leaf:C.leafDark,i*.5);});
  const berries=[[-.68,.59,.3],[-.47,.85,-.52],[-.05,.86,-.68],[.41,.7,-.57],[.72,.63,.14],[.48,.9,.48],[.05,1.02,.42],[-.38,.78,.61],[-.05,.52,.69],[.75,.49,-.26]];
  berries.forEach(([x,y,z],i)=>kit.mesh(`berry_${i}`,new THREE.IcosahedronGeometry(.125,1),i%2?C.berry:C.berryLight,[x,y,z])); for(let i=0;i<5;i++){const a=i*1.25;lobe(kit,`bush_stone_${i}`,[Math.cos(a)*.8,.07,Math.sin(a)*.68],[.16,.09,.13],i%2?C.stone:C.stoneLight);} return kit.group;
}

function fenReed() { const kit=makeMeshKit(); [[-.5,.12,1.4],[-.31,-.2,1.78],[-.12,.21,2.1],[.06,-.28,1.7],[.23,.14,2.38],[.42,-.08,1.54],[.5,.28,1.3],[.12,.42,1.45],[-.44,.38,1.18]].forEach(([x,z,h],i)=>{
  addLeaf(kit,`reed_blade_${i}`,[x,0,z],h,.1,i%3?C.reed:C.reedLight,i*.63,-.3+i*.045);
  if(i===2||i===4||i===6)kit.mesh(`reed_flower_${i}`,new THREE.IcosahedronGeometry(.15,1),C.petal,[x,h*.92,z]); });
  for(let i=0;i<4;i++)lobe(kit,`wet_base_${i}`,[Math.cos(i*1.57)*.45,.045,Math.sin(i*1.57)*.37],[.25,.06,.2],i%2?C.stone:C.stoneLight);return kit.group; }

function fenLily() { const kit=makeMeshKit(); [[-.28,0,.65,.52],[.31,.16,.58,.46],[.1,-.35,.52,.43]].forEach(([x,z,w,d],i)=>{
  const pad=kit.mesh(`lily_pad_${i}`,new THREE.CylinderGeometry(w,w*.88,.045,7),i?C.waterLeaf:C.reed,[x,.025,z],[0,i*.6,0],[1,1,d/w]);
  pad.rotation.y=i*.7;
 }); for(let i=0;i<6;i++){const a=i*Math.PI/3; lobe(kit,`flower_petal_${i}`,[Math.cos(a)*.16,.16,Math.sin(a)*.16],[.22,.07,.12],i%2?C.petal:"#ffd3e9",a);} kit.mesh("flower_center",new THREE.IcosahedronGeometry(.1,1),"#f7d276",[0,.18,0]); return kit.group; }

function fenStone() { const kit=makeMeshKit(); addRings(kit,"fen_monolith",[[0,.72,.54],[.32,.82,.63],[1.7,.5,.42],[2.76,.24,.2],[3.15,.05,.04]],C.stone,[0,0,0],[1,1,1],[0,.24,0],7); addRings(kit,"monolith_light_plane",[[0,.35,.035],[1.65,.25,.025],[2.75,.06,.012]],C.stoneLight,[.3,.06,.53],[1,1,1],[0,.24,0],5); kit.box("cyan_vertical_fissure",[.17,1.95,.035],C.crystal,[.11,1.36,.59],[0,.24,0],.018); kit.box("cyan_inner_fissure",[.06,1.7,.038],C.crystalLight,[.11,1.36,.612],[0,.24,0],.008); for(let i=0;i<5;i++){const a=i*1.26;lobe(kit,`monolith_foot_${i}`,[Math.cos(a)*.72,.12,Math.sin(a)*.6],[.26,.17,.22],i%2?C.stoneLight:C.stone,a);addLeaf(kit,`monolith_moss_${i}`,[Math.cos(a)*.65,.08,Math.sin(a)*.57],.35,.09,C.leafLight,a,-1.05);} return kit.group; }

function oreRock() { const kit=makeMeshKit(); const chunks=[[-.26,.38,0,.72],[.3,.31,.08,.55],[.02,.25,-.42,.5]]; chunks.forEach(([x,y,z,s],i)=>{
  lobe(kit,`rock_plane_${i}`,[x,y,z],[s,s*.68,s*.8],i?"#63717a":"#414d58",i*.5);
 }); [[-.39,.46,.42],[.36,.38,.43],[.04,.7,.28]].forEach(([x,y,z],i)=>lobe(kit,`embedded_ore_${i}`,[x,y,z],[.18,.1,.055],i?C.ore:C.oreLight,i)); return kit.group; }

function crystal() { const kit=makeMeshKit(); addRings(kit,"crystal_base",[[0,.95,.74],[.26,1.04,.8],[.56,.68,.51],[.75,.16,.12]],"#344c67",[0,0,0],[1,1,1],[0,.2,0],7); [[0,0,0,.48,2.35],[.52,.06,.12,.3,1.58],[-.48,.04,.25,.27,1.28],[.22,.02,-.47,.23,1.1],[-.1,.04,-.5,.16,.78]].forEach(([x,y,z,r,h],i)=>{addRings(kit,`cyan_crystal_${i}`,[[0,r],[h*.72,r*.62],[h,.015]],i?C.crystal:C.crystalLight,[x,.42+y,z],[1,1,1],[0,i*.71+(i?-.24:0),i?-.24:0],6);}); for(let i=0;i<5;i++){const a=i*1.25;lobe(kit,`crystal_foot_${i}`,[Math.cos(a)*.86,.12,Math.sin(a)*.68],[.23,.14,.19],i%2?C.stone:C.stoneLight);} return kit.group; }

function luminousBlossom() { const kit=makeMeshKit(); addRings(kit,"blossom_stem",[[0,.12],[.66,.08],[1.05,.04]],C.reed); for(let i=0;i<8;i++){const a=i*Math.PI*2/8; addLeaf(kit,`blossom_leaf_${i}`,[0,.2,0],.78,.22,i%2?C.leaf:C.leafDark,a,-1.02); } for(let i=0;i<6;i++){const a=i*Math.PI*2/6; lobe(kit,`glow_petal_${i}`,[Math.cos(a)*.34,1.02,Math.sin(a)*.34],[.33,.12,.17],i%2?"#e59a4e":"#ffe09b",a); } kit.mesh("glowing_center",new THREE.IcosahedronGeometry(.18,1),"#fff3ae",[0,1.09,0]); for(let i=0;i<3;i++)lobe(kit,`blossom_stone_${i}`,[Math.cos(i*2.1)*.6,.07,Math.sin(i*2.1)*.5],[.16,.1,.13],C.stoneLight);return kit.group; }

function heartwoodTree() { const kit=makeMeshKit(); addRings(kit,"ancient_trunk",[[0,1.0],[.42,1.06],[2.15,.8],[3.8,.54],[5.3,.28]],C.violetBark,[0,0,0],[1,1,1],[0,.12,0],9);
  for(const [i,a] of [0,.58,1.2,1.9,2.7,3.4,4.1,4.8,5.55].entries())addBranch(kit,`heart_root_${i}`,[0,.44,0],[Math.cos(a)*(1.25+(i%2)*.25),.03,Math.sin(a)*(1.0+(i%3)*.15)],.25,i%2?C.violetBark:C.barkDark);
  const branches=[[-1.7,4.05,.2],[1.72,4.18,-.18],[-1.08,4.75,-1.0],[1.12,4.95,.94],[-.42,5.6,.65],[.42,5.72,-.65]]; branches.forEach(([x,y,z],i)=>{addBranch(kit,`ancient_branch_${i}`,[0,y-.95,0],[x,y,z],.3,i%2?C.violetBark:C.bark);addBranch(kit,`branch_fork_${i}`,[x*.72,y-.32,z*.72],[x*1.14,y+.24,z*1.14],.16,C.barkLight);});
  [[-1.58,4.0,.12,1.1,.75,.92,C.violet],[-.76,4.35,-.7,1.05,.76,.9,"#813c71"],[.12,4.32,-.8,1.08,.78,.94,"#a94e82"],[1.15,4.22,-.2,1.15,.8,.98,"#c7689a"],[1.58,4.62,.45,.92,.68,.85,C.violet],[.75,5.08,.75,.96,.72,.9,"#d56f9e"],[-.35,5.2,.55,.98,.72,.9,C.violetLight],[-.73,5.48,-.18,.78,.64,.73,"#db78ab"],[.18,5.84,-.08,.82,.66,.78,"#ec94c1"]].forEach(([x,y,z,sx,sy,sz,c],i)=>lobe(kit,`heart_crown_${i}`,[x,y,z],[sx,sy,sz],c,i*.55));
  for(let i=0;i<7;i++){const a=i*.9+.2;addLeaf(kit,`heart_moss_${i}`,[Math.cos(a)*1.1,.04,Math.sin(a)*.88],.55,.16,i%2?C.leaf:C.leafLight,a,-1.12);} kit.mesh("heartwood_core",new THREE.IcosahedronGeometry(.32,1),"#ffc0de",[0,3.65,.7]); return kit.group; }

export function createEcologyMeshVisual(id) {
  switch (id) {
    case "asset_verge_canopy": return vergeTree();
    case "asset_verge_canopy_spread": return vergeTree("spread");
    case "asset_verge_canopy_tall": return vergeTree("tall");
    case "asset_redwood_tree": return redwoodTree();
    case "asset_mushroom_ring": return mushroomRing();
    case "asset_berry_bush": return berryBush();
    case "asset_fen_reed": return fenReed();
    case "asset_fen_lily": return fenLily();
    case "asset_fen_stone": return fenStone();
    case "asset_iron_ore_rock": return oreRock();
    case "asset_crystal": return crystal();
    case "asset_luminous_blossom": return luminousBlossom();
    case "asset_heartwood_tree": return heartwoodTree();
    default: return null;
  }
}
