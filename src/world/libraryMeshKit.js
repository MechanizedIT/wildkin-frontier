// Crafted, editable-library visual recipes.  This kit deliberately owns only
// the twenty library IDs below: placement and collision remain in world.json.
import * as THREE from 'three';
import { makeMeshKit, facetedRings, leafBlade, FRONTIER_COLORS as C } from './facetedMeshKit.js';

export const CUSTOM_LIBRARY_ASSET_IDS = Object.freeze(new Set([
  'asset_furnace','asset_table','asset_chair','asset_wood_floor','asset_wood_wall',
  'asset_wood_doorway','asset_iron_gear','asset_iron_pickaxe','asset_iron_sword','asset_ruin_path',
  'asset_fern','asset_flower','asset_grass_patch','asset_pebble_cluster','asset_drop_wood',
  'asset_drop_stone','asset_drop_fiber','asset_drop_berries','asset_drop_iron_ore','asset_drop_crystal',
]));

const darkStone = '#4b5455', warmStone = '#7b8072', paleStone = '#a8a18b';
const iron = '#526774', ironLight = '#80949a', ember = '#ef8d38';
function rock(k,name,x,y,z,s=.25,color=warmStone) {
  k.mesh(name, facetedRings([[0,s*.72,s*.63],[s*.24,s,s*.82],[s*.76,s*.67,s*.57],[s,s*.15,s*.13]], 6), color, [x,y,z], [0,(x+z)*1.7,0]);
}
function timber(k,name,from,to,w=.16,d=.17,color=C.wood) { k.beam(name,from,to,w,d,color); }
// A small, closed tapered leaf wedge.  The old leafBlade is useful for distant
// decoration but its single plane disappeared edge-on in the gallery.
function leafPrism(length=.45,width=.16,thick=.07) {
  const w=width*.5,t=thick*.5,m=length*.48;
  const p=[-w,0,-t,w,0,-t,w,0,t,-w,0,t,-width*.62,m,-t,width*.62,m,-t,width*.62,m,t,-width*.62,m,t,0,length,0];
  const i=[0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7,4,5,8,5,6,8,6,7,8,7,4,8,0,3,2,0,2,1];
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(i);g.computeVertexNormals();return g;
}
function pointedWedge(k,name,from,to,radius,color) {
  const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to);
  const node=k.mesh(name,new THREE.ConeGeometry(radius,a.distanceTo(b),5),color,a.clone().add(b).multiplyScalar(.5).toArray());
  node.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());
  return node;
}
function fernLeaf(k,x,z,yaw,length,width,color) {
  const leaf=k.mesh('lancet_fern_leaf',leafBlade(length,width,length*.17),color,[x,.05,z],[0,yaw,Math.PI*.10]);
  leaf.material.side=THREE.DoubleSide;
  k.beam('fern_central_ridge',[x,.06,z],[x+Math.sin(yaw)*length,.14,z+Math.cos(yaw)*length],.022,.018,C.leafLight);
}
function furnace(){
  const k=makeMeshKit();
  // A squat, broad forge built from courses rather than a narrow oven. +Z is
  // kept open so the recipe's authored front/collision envelope stays true.
  for(let row=0;row<3;row++) for(let col=0;col<4;col++) {
    const x=(col-1.5)*.38+(row%2?.08:0), z=row===0?.10:-.10;
    k.box('hearth_masonry',[.43,.22,.40],(col+row)%3?warmStone:paleStone,[x,.11+row*.20,z],[0,row*.08,0],.045);
  }
  for(const x of [-.54,.54])k.mesh('forge_side_stone',facetedRings([[.35,.27],[.55,.30],[1.18,.24],[1.33,.19]],6),darkStone,[x,0,-.04]);
  k.box('forge_crown',[1.18,.22,.68],paleStone,[0,1.30,-.04],[],.06);
  k.box('firebox_recess',[.68,.49,.10],'#20292b',[0,.86,.46],[],.06);
  k.mesh('ember_glow',new THREE.IcosahedronGeometry(.22,0),ember,[0,.83,.535],[],[1,.72,.25]);
  for(const x of [-.40,.40])k.box('mouth_jamb',[.13,.60,.16],iron,[x,.88,.49],[],.03);
  k.mesh('chimney',facetedRings([[1.37,.22],[2.03,.18],[2.14,.27]],7),iron,[.10,0,-.10]);
  k.mesh('chimney_rim',new THREE.TorusGeometry(.25,.055,5,7),ironLight,[.10,2.13,-.10],[Math.PI/2,0,0]);
  timber(k,'rack_post',[.78,.15,.12],[.78,1.10,.12],.07,.07,C.woodDark);
  timber(k,'rack_bar',[.68,.98,.12],[1.02,.98,.12],.05,.05,ironLight);
  for(const [x,z] of [[-.86,.27],[-.69,.35],[-.77,.12]])k.mesh('fuel_log',new THREE.CylinderGeometry(.10,.12,.43,6),C.wood,[x,.13,z],[0,0,Math.PI/2]);
  return k.group;
}
function table(){ const k=makeMeshKit();
  for(let i=0;i<4;i++)k.box('breadboard_top',[1.78,.12,.31],i%2?C.wood:C.woodLight,[0,1.24,(i-1.5)*.30],[],.035);
  for(const x of [-.70,.70])for(const z of [-.42,.42]){k.box('table_leg',[.18,1.15,.18],C.wood,[x,.58,z],[],.04);k.box('leg_shoe',[.24,.12,.24],iron,[x,.07,z],[],.03);}
  timber(k,'long_apron',[-.72,.95,.42],[.72,.95,.42],.13,.10,C.woodDark); timber(k,'cross_brace',[-.67,.56,-.42],[.67,.56,-.42],.10,.08,C.wood);
  for(const x of [-.71,.71]) k.bolt('table_bolt',[x,1.18,.62],.035,ironLight); return k.group; }
function chair(){ const k=makeMeshKit();
  for(const x of [-.35,.35])for(const z of [-.31,.31]) k.box('chair_leg',[.14,.82,.14],C.wood,[x,.41,z],[],.035);
  for(let i=0;i<3;i++)k.box('seat_slat',[.82,.10,.24],i%2?C.woodLight:C.wood,[0,.78,(i-1)*.22],[],.025);
  for(const x of [-.35,.35]){k.box('back_post',[.14,1.41,.14],C.wood,[x,1.03,-.31],[],.035);k.box('back_bracket',[.19,.15,.16],iron,[x,.99,-.35],[],.03);}
  for(let i=0;i<3;i++)k.box('back_slat',[.72,.17,.10],i%2?C.woodLight:C.wood,[0,1.10+i*.25,-.30],[],.025);
  timber(k,'chair_crossbrace',[-.36,.42,.25],[.36,.42,.25],.08,.07,C.woodDark); return k.group; }
function floor(){ const k=makeMeshKit();
  for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++)k.box('fitted_foundation_slab',[.82,.14,.78],(x+z)%2?warmStone:paleStone,[x*.86,.08,z*.84],[0,(x-z)*.035,0],.05);
  for(const [x,z] of [[-1.30,-1.25],[1.30,-1.25],[-1.30,1.25],[1.30,1.25]])k.box('dark_corner_frame',[.38,.18,.34],darkStone,[x,.09,z],[],.055);
  for(const z of [-1.30,1.30])k.box('foundation_rail',[2.45,.13,.13],C.woodDark,[0,.06,z],[],.025);return k.group; }
function wall(){ const k=makeMeshKit();
  for(let row=0;row<5;row++)for(let col=0;col<3;col++)k.box('wall_stone_course',[.78,.35,.30],(row+col)%3?warmStone:paleStone,[(col-1)*.78+(row%2*.05),.20+row*.35,0],[0,row*.025,0],.045);
  for(const x of [-1.18,1.18]){k.box('wall_dark_cap',[.28,1.97,.38],darkStone,[x,.98,0],[],.05);k.box('wall_timber_rail',[.15,1.72,.44],C.woodDark,[x,.98,.08],[],.035);}
  for(const y of [.20,1.82])k.box('wall_header',[2.65,.16,.38],iron,[0,y,.02],[],.035);return k.group; }
function doorway(){ const k=makeMeshKit();
  for(const x of [-.92,.92]){for(let row=0;row<4;row++)k.box('door_stone_upright',[.40,.42,.48],row%2?warmStone:paleStone,[x,.21+row*.40,0],[0,row*.05,0],.055);k.box('door_iron_shoe',[.52,.20,.56],darkStone,[x,.10,0],[],.06);}
  for(let i=0;i<3;i++)k.box('heavy_lintel_course',[.67,.30,.55],i%2?warmStone:paleStone,[(i-1)*.67,1.80,0],[],.055);
  for(const x of [-.92,.92])timber(k,'door_post_strap',[x,.34,.30],[x,1.54,.30],.14,.10,C.woodDark);
  for(const x of [-.92,.92])k.bolt('doorway_bolt',[x,1.44,.31],.045,ironLight);return k.group; }
function gear(){const k=makeMeshKit(), tooth=new THREE.BoxGeometry(.24,.15,.32); k.mesh('gear_ring',new THREE.TorusGeometry(.43,.14,5,10),iron,[0,.08,0],[Math.PI/2,0,0]);for(let i=0;i<10;i++){const a=i*Math.PI/5,m=k.mesh('gear_tooth',tooth,i%2?iron:ironLight,[Math.sin(a)*.56,.08,Math.cos(a)*.56],[0,-a,0]);m.rotation.x=Math.PI/2;}k.mesh('gear_hub',new THREE.CylinderGeometry(.19,.19,.19,8),C.gold,[0,.08,0]);k.mesh('gear_hole',new THREE.CylinderGeometry(.075,.075,.205,6),'#263541',[0,.08,0]);return k.group;}
function pickaxe(){const k=makeMeshKit();
  // Solid wedges keep the forged head legible from the studio's raised camera;
  // the old XY extrusion became a giant paper-thin canopy in that view.
  timber(k,'pickaxe_handle',[0,.20,0],[0,1.51,0],.105,.105,C.woodLight);
  k.mesh('pickaxe_grip',facetedRings([[.14,.105],[.30,.12],[.40,.10]],6),C.woodDark,[0,0,0]);
  k.mesh('pickaxe_socket',new THREE.CylinderGeometry(.15,.13,.25,6),iron,[0,1.48,0]);
  // The head is built as a forged crossbar with two short hooked tips.  Long
  // cone-only arms read as a spear from the review camera.
  k.box('left_forged_pick_arm',[.43,.14,.22],ironLight,[-.24,1.59,0],[0,0,-.14],.035);
  k.box('right_forged_pick_arm',[.40,.14,.22],iron,[.23,1.49,0],[0,0,.16],.035);
  pointedWedge(k,'left_forged_pick_point',[-.43,1.65,0],[-.66,1.70,-.04],.075,ironLight);
  pointedWedge(k,'right_forged_pick_point',[.42,1.44,0],[.63,1.36,.04],.07,iron);
  k.box('pickaxe_head_collar',[.28,.16,.22],C.woodDark,[0,1.49,0],[],.04);
  k.box('pickaxe_amber_cap',[.17,.13,.17],C.gold,[0,.08,0],[],.03);k.group.rotation.z=-.18;return k.group;}
function sword(){const k=makeMeshKit(); timber(k,'wrapped_sword_grip',[0,.14,0],[0,.67,0],.12,.115,C.woodDark);for(const y of [.24,.38,.52,.64])k.mesh('grip_wrap',new THREE.TorusGeometry(.12,.020,5,8),C.gold,[0,y,0],[Math.PI/2,0,0]);k.box('sword_guard',[.88,.14,.22],C.gold,[0,.73,0],[],.045);k.mesh('sword_pommel',new THREE.IcosahedronGeometry(.16,0),iron,[0,.08,0]);
 const left=new THREE.Shape();left.moveTo(0,.75);left.lineTo(-.25,.82);left.lineTo(-.17,1.82);left.lineTo(0,2.16);left.closePath();const right=new THREE.Shape();right.moveTo(0,.75);right.lineTo(.25,.82);right.lineTo(.17,1.82);right.lineTo(0,2.16);right.closePath();
 const opts={depth:.15,bevelEnabled:true,bevelSize:.026,bevelThickness:.026,bevelSegments:1};const leftGeo=new THREE.ExtrudeGeometry(left,opts);leftGeo.translate(0,0,-.075);const rightGeo=new THREE.ExtrudeGeometry(right,opts);rightGeo.translate(0,0,-.075);k.mesh('blade_dark_facet',leftGeo,iron);k.mesh('blade_bright_facet',rightGeo,ironLight);
 pointedWedge(k,'blade_spine_ridge',[0,.79,.105],[0,2.04,.105],.045,C.ivory);return k.group;}
function ruinPath(){const k=makeMeshKit();for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){if(x===1&&z===1)continue;const s=.48+(Math.abs(x+z)%2)*.05;k.mesh('fitted_ruin_slab',facetedRings([[0,s,s*.78],[.06,s*1.05,s*.84],[.15,s*.83,s*.65]],5),((x+z)%3?warmStone:paleStone),[x*.55,.01,z*.53],[0,(x-z)*.22,0]);}for(const [x,z] of [[-.94,-.94],[.94,-.94],[-.94,.94]])k.box('ruin_corner_block',[.30,.20,.28],darkStone,[x,.10,z],[],.05);for(const [x,z] of [[-.30,.48],[.45,-.28]])fernLeaf(k,x,z,1.2,.20,.055,C.leaf);return k.group;}
function fern(){const k=makeMeshKit();
  // A rooted rosette: each frond has a low, broad first leaf and a splayed tip,
  // rather than an even fence of vertical signs.
  for(let i=0;i<9;i++){const a=i/9*Math.PI*2,len=.50+(i%4)*.09;
    for(let j=0;j<3;j++){const r=.025+j*.17,y=.045+j*.17,tilt=.52+j*.18,segLen=len*(.56-j*.05);const leaf=k.mesh('arched_fern_segment',leafPrism(segLen,.22-j*.025,.09),j===1?C.leafLight:C.leaf,[Math.sin(a)*r,y,Math.cos(a)*r],[tilt,a,0]);leaf.castShadow=true;
      const ridge=k.mesh('fern_rib',leafPrism(segLen*.90,.035,.030),j===1?C.leaf:C.leafLight,[Math.sin(a)*(r+.012),y+.012,Math.cos(a)*(r+.012)],[tilt,a,0]);ridge.castShadow=true;}
  }
  for(const [x,z,s,c] of [[-.22,.13,.16,darkStone],[.20,.10,.12,paleStone],[.03,-.24,.10,'#63766f']])rock(k,'fern_grounding_pebble',x,0,z,s,c);return k.group;}
function flower(){const k=makeMeshKit();
  for(let i=0;i<6;i++){const a=i*Math.PI/3,l=k.mesh('flower_rosette_leaf',leafPrism(.46,.19,.085),i%2?C.leaf:C.leafLight,[0,.05,0],[.96,a,0]);l.castShadow=true;}
  k.mesh('short_flower_stem',facetedRings([[0,.060],[.39,.042]],6),C.leaf,[0,.05,0]);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5,petal=k.mesh('thick_faceted_petal',leafPrism(.34,.145,.095),i%2?'#ffb1c8':'#ef7195',[0,.42,0],[.98,a,0]);petal.castShadow=true;}
  k.mesh('warm_flower_center',new THREE.IcosahedronGeometry(.115,1),C.gold,[0,.47,0]);rock(k,'flower_base_stone',.24,0,-.16,.12,darkStone);return k.group;}
function grass(){const k=makeMeshKit();for(let i=0;i<12;i++){const a=i*2.399,r=.05+(i%4)*.055,blade=k.mesh('thick_grass_blade',leafPrism(.35+(i%4)*.07,.075,.04),i%3?C.leaf:C.leafLight,[Math.sin(a)*r,.03,Math.cos(a)*r],[-.24-(i%3)*.08,a,0]);blade.castShadow=true;}rock(k,'grass_base_pebble',-.13,0,.10,.09,darkStone);return k.group;}
function pebbles(){const k=makeMeshKit();rock(k,'large_slate_pebble',-.25,0,.07,.34,darkStone);rock(k,'sand_pebble',.25,0,.14,.25,paleStone);rock(k,'green_grey_pebble',.06,0,-.27,.20,'#63766f');rock(k,'small_dark_pebble',-.05,0,-.19,.12,'#394d50');return k.group;}
function dropWood(){const k=makeMeshKit();for(const [x,y,z,r,c] of [[-.29,.14,.07,.07,C.wood], [.18,.18,-.10,-.10,C.woodLight],[-.06,.31,.04,.01,C.woodDark],[.16,.10,.18,.16,C.woodLight]]){k.mesh('round_cut_bundled_log',new THREE.CylinderGeometry(.12,.15,.78,8),c,[x,y,z],[0,0,Math.PI/2+r]);k.mesh('end_grain_ring',new THREE.CylinderGeometry(.105,.105,.020,8),C.cream,[x+.385*Math.cos(r),y,z+.385*Math.sin(r)],[0,0,Math.PI/2+r]);}for(const x of [-.12,.13])k.mesh('compressed_rope_band',new THREE.TorusGeometry(.27,.034,5,8),C.woodDark,[x,.20,.02],[Math.PI/2,0,0]);return k.group;}
function dropStone(){const k=makeMeshKit();rock(k,'large_slate_drop',-.26,0,.10,.34,darkStone);rock(k,'medium_sand_drop',.27,0,.12,.27,paleStone);rock(k,'small_green_grey_drop',.14,0,-.28,.17,'#63766f');rock(k,'small_dark_drop',-.35,0,-.23,.14,'#394d50');return k.group;}
function dropFiber(){const k=makeMeshKit();for(let i=0;i<8;i++){const a=i/8*Math.PI*2,blade=k.mesh('splayed_tapered_fiber',leafPrism(.52+(i%3)*.06,.105,.050),i%2?C.leafLight:C.leaf,[Math.sin(a)*.045,.10+(i%2)*.025,Math.cos(a)*.045],[.32+(i%3)*.12,a,0]);blade.castShadow=true;}k.mesh('dark_fiber_binding',new THREE.TorusGeometry(.13,.027,5,8),C.woodDark,[0,.15,0],[Math.PI/2,0,0]);k.box('ochre_binding_knot',[.06,.055,.045],C.gold,[0,.15,.14],[],.015);return k.group;}
function berries(){const k=makeMeshKit();for(let i=0;i<7;i++){const a=i/7*Math.PI*2,l=k.mesh('berry_leaf_underlayer',leafPrism(.28,.13,.055),i%2?C.leaf:C.woodDark,[0,.09,0],[Math.PI/2,a,0]);l.castShadow=true;}for(let i=0;i<6;i++){const a=i*1.04,r=.12+(i%2)*.07;k.mesh('embedded_round_berry',new THREE.IcosahedronGeometry(.115,1),i%2?'#b94057':'#e07883',[Math.sin(a)*r,.20+(i%2)*.055,Math.cos(a)*r]);}return k.group;}
function ironOre(){const k=makeMeshKit();rock(k,'dark_host_ore_rock',0,0,0,.43,darkStone);for(const [x,y,z,s,r,c] of [[-.20,.20,.25,.15,-.22,ironLight],[.20,.30,.18,.18,.18,'#a7bcc0'],[.07,.15,.37,.13,.34,'#607d8b'],[-.04,.34,.12,.12,-.30,ironLight]]){const g=new THREE.ConeGeometry(s,s*1.55,5);g.rotateZ(r);k.mesh('protruding_blue_iron_crystal',g,c,[x,y,z],[0,.35,0]);}return k.group;}
function crystal(){const k=makeMeshKit();for(const [x,y,z,s,r,c] of [[0,.58,0,.30,0,'#58d7d4'],[-.30,.34,.09,.20,-.34,'#9cf4e2'],[.30,.30,.03,.18,.28,'#37aebb'],[.08,.22,-.25,.14,.46,'#237f8b']]){const g=new THREE.ConeGeometry(s,s*2.45,5);g.rotateZ(r);k.mesh('sharp_cyan_crystal_shard',g,c,[x,y,z],[0,.25,0],[1,1,1]);}rock(k,'wide_crystal_base',-.14,0,-.02,.34,darkStone);rock(k,'wide_crystal_base',.22,0,.08,.25,'#394d50');return k.group;}

const builders={asset_furnace:furnace,asset_table:table,asset_chair:chair,asset_wood_floor:floor,asset_wood_wall:wall,asset_wood_doorway:doorway,asset_iron_gear:gear,asset_iron_pickaxe:pickaxe,asset_iron_sword:sword,asset_ruin_path:ruinPath,asset_fern:fern,asset_flower:flower,asset_grass_patch:grass,asset_pebble_cluster:pebbles,asset_drop_wood:dropWood,asset_drop_stone:dropStone,asset_drop_fiber:dropFiber,asset_drop_berries:berries,asset_drop_iron_ore:ironOre,asset_drop_crystal:crystal};
export function createLibraryMeshVisual(id){const maker=builders[id];if(!maker)return null;const group=maker();group.userData.visualKind=`library/${id}`;group.userData.visualAssetId=id;return group;}
