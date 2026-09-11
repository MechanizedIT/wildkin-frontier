// Authored outpost models matched to the September 10 target board. The bake
// tools serialize these as ordinary editable mesh parts; no runtime ID bypass.
import * as THREE from 'three';
import {makeMeshKit,facetedRings,leafBlade,FRONTIER_COLORS as C} from './facetedMeshKit.js';

export const CUSTOM_PROP_ASSET_IDS=Object.freeze([
  'asset_drop_pod','asset_workshop_awning','asset_sanctuary_totem','asset_path_lantern',
  'asset_wooden_crate','asset_bench','asset_chest','asset_frontier_portal_outpost',
  'asset_frontier_portal','asset_frontier_launch_pad',
]);

function banner(k,x,y,z,w=.7,h=.8){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-w/2,0,0,w/2,0,0,w/2,-h,0,0,-h*.86,0,-w/2,-h,0],3));g.setIndex([0,1,3,1,2,3,0,3,4]);g.computeVertexNormals();
  const b=k.mesh('expedition_banner',g,C.teal,[x,y,z]);b.material=k.material(C.teal).clone();b.material.side=THREE.DoubleSide;
  k.beam('banner_pole',[x-w*.62,y+.04,z],[x+w*.62,y+.04,z],.055,.055,C.woodLight);
  const mark=new THREE.ConeGeometry(w*.24,h*.30,3);k.mesh('frontier_emblem',mark,C.ivory,[x,y-h*.43,z+.025],[0,Math.PI/2,0],[1,1,.14]);
}
function foot(k,x,z,h=.3){k.mesh('stone_foot',facetedRings([[0,.24,.25],[h*.25,.29,.29],[h,.19,.20]],5),C.stone,[x,0,z]);}
function groundRock(k,x,z,s=.22,color=C.slate){k.mesh('ground_rock',facetedRings([[0,s*.72,s*.62],[s*.22,s,s*.82],[s*.70,s*.68,s*.52],[s*.94,s*.16,s*.10]],6),color,[x,0,z],[0,(x-z)*1.4,0]);}
function tuft(k,x,z,s=.34){for(let i=0;i<3;i++){const a=i*2.1,leaf=k.mesh('ground_leaf',leafBlade(s*(.8+i*.1),s*.17,s*.06),i%2?C.leaf:C.leafLight,[x,.01,z],[0,a,.12]);leaf.material.side=THREE.DoubleSide;}}
function lamp(k,x,y,z,s=1){
  k.box('lantern_base',[.28*s,.07*s,.24*s],C.ink,[x,y-.21*s,z]);
  k.box('lantern_light',[.19*s,.32*s,.16*s],C.paleGold,[x,y,z]);
  for(const dx of [-.115,.115])k.box('lantern_frame',[.035*s,.36*s,.21*s],C.slate,[x+dx*s,y,z]);
  k.mesh('lantern_roof',new THREE.CylinderGeometry(.08*s,.21*s,.13*s,4),C.slate,[x,y+.25*s,z],[0,Math.PI/4,0]);
  k.mesh('lantern_hook',new THREE.TorusGeometry(.07*s,.022*s,4,8),C.ink,[x,y+.36*s,z]);
}
function crate(){
  const k=makeMeshKit();k.box('crate_inset',[.95,.9,.95],C.woodDark,[0,.48,0]);
  for(let i=0;i<4;i++){
    for(const s of [-1,1])k.box('side_plank',[.225,.78,.045],i%2?C.wood:C.woodLight,[(i-1.5)*.23,.49,s*.485]);
    k.box('lid_plank',[.95,.055,.22],i%2?C.wood:C.woodLight,[0,.96,(i-1.5)*.23]);
  }
  for(const z of [-.51,.51])for(const y of [.10,.88])k.box('crate_rail',[1.03,.14,.075],C.woodLight,[0,y,z]);
  for(const s of [-1,1]){
    k.beam('crate_diagonal',[-.41,.19,s*.527],[.41,.80,s*.527],.115,.05,C.wood);
    for(const x of [-.46,.46])for(const y of [.1,.89]){k.box('corner_iron',[.19,.18,.10],C.slate,[x,y,s*.53]);k.bolt('corner_pin',[x,y,s*.593],.032);}
  }
  // The gallery normally views the +Z face; give it a real inset X frame.
  k.box('front_inset_panel',[.78,.61,.055],C.woodDark,[0,.49,.534],[],.025);
  k.beam('front_x_brace',[-.37,.20,.575],[.37,.79,.575],.12,.055,C.woodLight);
  k.beam('front_x_brace',[.37,.20,.575],[-.37,.79,.575],.12,.055,C.wood);
  k.box('amber_crate_latch',[.17,.23,.07],C.gold,[0,.29,.594],[],.035);
  return k.group;
}
function chest(){
  const k=makeMeshKit();k.box('chest_body',[1.30,.68,.87],C.woodDark,[0,.39,0]);
  for(const z of [-.452,.452])for(let i=0;i<3;i++)k.box('chest_plank',[1.26,.20,.045],i%2?C.woodLight:C.wood,[0,.18+i*.205,z]);
  k.box('chest_lid',[1.38,.26,.96],C.woodLight,[0,.85,0],[],.085);
  for(const x of [-.48,.48]){
    k.box('iron_lid_band',[.14,.29,.99],C.slate,[x,.855,0],[],.04);
    for(const z of [-.49,.49])k.box('iron_body_band',[.14,.78,.08],C.slate,[x,.43,z]);
  }
  k.box('front_latch',[.26,.38,.08],C.gold,[0,.60,.52],[],.055);
  k.mesh('keyhole',new THREE.CylinderGeometry(.045,.045,.025,8),C.ink,[0,.66,.58],[Math.PI/2,0,0]);
  k.box('keyhole_slot',[.032,.08,.025],C.ink,[0,.60,.58]);
  for(const side of [-1,1])k.mesh('side_handle',new THREE.TorusGeometry(.12,.034,4,6),C.gold,[side*.72,.49,0],[0,Math.PI/2,0],[1,.8,1]);
  for(const x of [-.51,.51])for(const z of [-.36,.36])k.box('chest_foot',[.22,.18,.22],C.ink,[x,.09,z]);
  k.box('lock_surround',[.42,.46,.095],C.gold,[0,.60,.505],[],.065);
  k.box('lock_dark_inset',[.23,.29,.11],C.ink,[0,.60,.565],[],.04);
  for(const x of [-.57,.57])for(const y of [.18,.81])k.box('chest_corner_cap',[.18,.18,.11],C.slate,[x,y,.51],[],.035);
  k.box('layered_lid_rim',[1.47,.08,1.03],C.gold,[0,1.00,0],[],.04);
  return k.group;
}
function bench(){
  const k=makeMeshKit();
  for(const x of [-.70,.70]){
    for(const z of [-.19,.19]){k.box('bench_leg',[.18,.61,.18],C.wood,[x,.33,z]);k.box('bench_iron_shoe',[.24,.17,.24],C.slate,[x,.09,z]);}
    k.box('bench_back_upright',[.15,.96,.12],C.slate,[x,.89,-.21]);
  }
  for(let i=0;i<3;i++)k.box('bench_seat',[1.87,.10,.18],i%2?C.wood:C.woodLight,[0,.64,(i-1)*.185]);
  for(let i=0;i<2;i++)k.box('bench_back_plank',[1.88,.21,.11],i?C.woodLight:C.wood,[0,.95+i*.235,-.23]);
  k.box('bench_teal_cloth',[.40,.46,.03],C.teal,[.27,1.03,-.15]);
  for(const x of [.11,.43])k.box('cloth_trim',[.025,.46,.035],C.ivory,[x,1.03,-.13]);
  for(const x of [-.71,.71])for(const y of [.94,1.18])k.bolt('bench_fastener',[x,y,-.15],.036);
  for(const y of [1.04,1.31])k.box('heavy_back_rail',[1.96,.13,.16],C.woodDark,[0,y,-.32],[],.035);
  for(const x of [-.84,.84])k.box('bench_endcap',[.14,.28,.54],C.woodLight,[x,.70,0],[],.04);
  for(const x of [-.70,.70])for(const z of [-.20,.20])groundRock(k,x+Math.sign(x)*.10,z+.22,.13,C.ink);
  return k.group;
}
function lantern(){
  const k=makeMeshKit();foot(k,0,0,.24);k.box('post',[.14,1.30,.14],C.wood,[0,.86,0]);
  k.box('post_arm',[.49,.12,.14],C.woodLight,[.15,1.45,0]);
  k.beam('post_brace',[.02,1.17,0],[.30,1.45,0],.06,.075,C.wood);
  for(const y of [.44,1.34])k.box('post_iron',[.18,.085,.18],C.slate,[0,y,0]);
  k.mesh('post_cap',new THREE.ConeGeometry(.19,.28,4),C.gold,[0,1.70,0],[0,Math.PI/4,0]);
  k.box('carved_arm_end',[.20,.20,.20],C.woodDark,[.43,1.45,0],[],.035);
  k.mesh('hanging_chain',new THREE.TorusGeometry(.09,.018,4,8),C.ink,[.37,1.28,0],[0,Math.PI/2,0]);lamp(k,.35,1.00,0,.85);
  groundRock(k,-.31,.18,.20,C.ink);groundRock(k,.28,.26,.14,C.stone);tuft(k,-.24,-.20,.28);tuft(k,.25,-.19,.22);return k.group;
}
function dropPod(){
  const k=makeMeshKit();
  k.mesh('pod_base',facetedRings([[0,.65],[.15,.73],[.35,.67]],10),C.ink);
  k.mesh('pod_hull',facetedRings([[.27,.57],[.39,.64],[1.33,.58],[1.43,.48]],10),C.ivory);
  // A cool blue segmented dome is the pod's first readable silhouette, while
  // charcoal remains reserved for its machinery and landing plinth.
  k.mesh('pod_cap',facetedRings([[1.36,.60],[1.47,.59],[1.67,.40],[1.73,.27]],10),'#7ca8c7');
  // Segmented blue dome panels and a stepped lower plinth make the capsule a
  // constructed landing craft instead of one uninterrupted cylinder.
  for(let i=0;i<8;i++){const a=i*Math.PI/4;k.box('dome_blue_panel',[.29,.25,.08],'#5b91b5',[Math.sin(a)*.47,1.58,Math.cos(a)*.47],[0,-a,0],.025);}
  for(const r of [.74,.84])k.mesh('stepped_pod_plinth',new THREE.CylinderGeometry(r,r,.11,10),r>.8?C.ink:C.slate,[0,.08+(r-.74)*2.0,0]);
  k.box('pod_entry_frame',[.45,.85,.09],C.gold,[0,.72,.604],[],.075);
  k.box('pod_entry_recess',[.34,.69,.105],C.ink,[0,.72,.655],[],.055);
  k.box('pod_hatch',[.25,.49,.06],C.slate,[0,.71,.72],[],.045);
  for(const y of [.58,.76])k.box('hatch_rib',[.18,.055,.04],C.steel,[0,y,.76]);
  for(const x of [-.59,.59]){
    k.beam('landing_strut',[x,0,.26],[x*.78,.63,.12],.20,.26,C.slate);
    k.box('landing_shoe',[.31,.11,.37],C.ink,[x,.055,.26]);
    k.box('pod_side_panel',[.13,.48,.35],C.slate,[x,1.0,0]);
    k.box('pod_blue_module',[.18,.34,.40],'#557c99',[x*1.10,1.03,-.02],[],.04);
    k.box('landing_gold',[.16,.19,.10],C.gold,[x,.50,.31]);
  }
  for(let i=0;i<4;i++)k.box('entry_step',[.38,.08,.15],C.steel,[0,.22-i*.052,.72+i*.11]);
  for(const x of [-.23,.23])k.beam('ramp_rail',[x,.26,.69],[x,.035,1.13],.04,.055,C.gold);
  k.box('door_header',[.52,.12,.10],C.gold,[0,1.17,.67],[],.035);
  return k.group;
}
function workshop(){
  const k=makeMeshKit();
  for(const x of [-1.45,1.45])for(const z of [-.70,.70]){
    k.box('workshop_post',[.20,2.23,.20],C.wood,[x,1.16,z]);k.box('post_shoe',[.30,.27,.30],C.slate,[x,.14,z]);
    for(const y of [.40,1.96])k.box('post_wrap',[.25,.14,.25],C.ivory,[x,y,z]);
    k.mesh('gold_finial',new THREE.ConeGeometry(.16,.23,4),C.gold,[x,2.55,z],[0,Math.PI/4,0]);
    k.beam('roof_brace',[x,1.88,z],[x-Math.sign(x)*.42,2.28,z],.12,.14,C.woodLight);
  }
  // The roof is deliberately a closed, broad hipped mass.  The gallery and
  // game cameras see it from above, so a pair of thin planes (and a ridge
  // running toward the camera) read as an accidental invisible canvas.
  k.box('roof_dark_underside',[3.44,.16,1.98],C.woodDark,[0,2.31,0],[],.05);
  const roof=new THREE.BufferGeometry();
  const roofPoints=[
    -1.72,2.38,-.98, 1.72,2.38,-.98, 1.72,2.38,.98, -1.72,2.38,.98,
    -1.12,2.82,0, 1.12,2.82,0,
  ];
  roof.setAttribute('position',new THREE.Float32BufferAttribute(roofPoints,3));
  roof.setIndex([0,1,5,0,5,4, 3,4,5,3,5,2, 0,4,3, 1,2,5]);roof.computeVertexNormals();
  const cloth=k.mesh('hipped_teal_canvas_roof',roof,C.teal);cloth.material=k.material(C.teal).clone();cloth.material.side=THREE.DoubleSide;
  // A thick cream eave and hip caps make the canopy read as constructed cloth
  // stretched over timber, matching the broad light rim on the target.
  for(const z of [-.98,.98])k.box('ivory_canvas_eave',[3.56,.16,.15],C.ivory,[0,2.39,z],[],.035);
  for(const x of [-1.72,1.72])k.box('ivory_canvas_endcap',[.16,.16,1.98],C.ivory,[x,2.39,0],[],.035);
  for(const x of [-1.12,1.12])k.box('ivory_ridge_cap',[.38,.15,.20],C.ivory,[x,2.83,0],[],.035);
  for(const x of [-1.45,1.45])for(const z of [-.86,.86]){k.box('roof_beam_end',[.28,.20,.22],C.woodDark,[x,2.32,z],[],.04);k.box('rope_wrap',[.23,.09,.25],C.cream,[x,2.18,z],[],.025);}
  // Ridge follows X, the long axis of the stall.  This remains visible from
  // the normal three-quarter front view and gives the roof a clear crown.
  k.box('roof_ridge',[2.38,.17,.20],C.woodDark,[0,2.79,0],[],.04);
  for(const x of [-.72,.72])k.box('ridge_wrap',[.13,.22,.27],C.cream,[x,2.79,0],[],.03);
  k.box('workbench_top',[2.58,.16,.74],C.woodLight,[0,1.03,.24]);
  for(const x of [-.97,.97])k.box('workbench_leg',[.20,.96,.44],C.wood,[x,.50,.24]);
  for(let i=0;i<4;i++)k.box('back_storage_board',[.61,.62,.07],i%2?C.wood:C.woodLight,[(i-1.5)*.63,1.40,-.65]);
  k.box('back_shelf',[2.63,.10,.40],C.woodDark,[0,1.40,-.59]);
  k.box('toolbox',[.51,.29,.38],C.slate,[-.72,1.25,.21]);k.box('toolbox_band',[.06,.31,.40],C.gold,[-.72,1.25,.21]);
  k.box('anvil',[.43,.17,.26],C.steel,[.1,1.21,.28]);
  k.box('underbench_crate',[.55,.49,.52],C.wood,[.47,.32,.2]);
  for(const x of [-.86,-.42,.05,.49])k.box('shelf_tool',[.055,.42,.09],x<0?C.gold:C.steel,[x,1.74,-.75],[0,0,.28],.012);
  k.box('counter_cloth',[.72,.05,.31],C.cream,[.74,1.14,.26],[],.02);
  k.mesh('hanging_work_lamp',new THREE.TorusGeometry(.11,.025,5,8),C.ink,[-1.10,2.00,.72],[0,Math.PI/2,0]);lamp(k,-1.10,1.69,.72,.48);
  banner(k,.83,2.25,.99,.72,.90);lamp(k,-1.33,1.84,.96,.72);
  return k.group;
}
function sanctuary(){
  const k=makeMeshKit();
  for(let i=0;i<10;i++){const a=i*Math.PI/5;k.mesh('basin_stone',facetedRings([[0,.30,.25],[.10,.34,.28],[.38,.26,.22]],5),i%3?C.ivory:C.gold,[Math.sin(a)*.79,0,Math.cos(a)*.70],[0,a,0]);}
  k.mesh('basin_recess',new THREE.CylinderGeometry(.69,.68,.15,10),C.slate,[0,.20,0]);
  const water=k.mesh('opaque_teal_water',new THREE.CylinderGeometry(.63,.63,.015,10),'#6acfc4',[0,.29,0]);water.material=new THREE.MeshBasicMaterial({color:'#6acfc4'});
  k.beam('sanctuary_trunk',[-.65,.13,-.44],[-.69,1.72,-.50],.30,.29,C.woodDark);
  k.beam('sanctuary_root',[-.65,.20,-.44],[-1.23,.05,-.02],.18,.16,C.wood);
  k.beam('sanctuary_root',[-.61,.20,-.44],[-.05,.05,-.80],.15,.14,C.wood);
  for(const [x,y,z,r,c] of [[-.64,2.18,-.46,.69,C.leaf],[.10,1.99,-.54,.51,C.leafLight],[-1.03,1.71,-.43,.43,C.teal]]){
    k.beam('sanctuary_branch',[-.69,1.19,-.50],[x,y-.1,z],.16,.16,C.wood);
    k.mesh('sanctuary_crown',new THREE.IcosahedronGeometry(r,0),c,[x,y,z],[0,x,0],[1,.86,1]);
  }
  k.mesh('standing_basin_stone',facetedRings([[0,.39,.31],[.40,.35,.28],[1.02,.24,.22],[1.18,.13,.18]],5),C.ivory,[-.92,.08,-.22]);
  banner(k,.40,1.75,-.45,.54,.72);
  for(let i=0;i<7;i++)k.mesh('basin_leaves',leafBlade(.48,.13),i%2?C.leaf:C.leafLight,[Math.sin(i)*1.01,.08,Math.cos(i)*.78],[.1,i,.25]);
  // Three broad crown masses retain the target's readable tree silhouette.
  // The earlier collection of tiny overlapping lobes made a noisy flat star
  // from the normal game camera instead of a single sheltering crown.
  for(const [x,y,z,s,c,scale] of [[-.82,2.40,-.40,.55,'#23613c',[1.22,.88,1]],[-.06,2.45,-.45,.63,C.leaf,[1.34,.82,1]], [.48,2.18,-.50,.49,C.leafLight,[1.22,.78,1]]])k.mesh('asymmetric_canopy_crown',new THREE.IcosahedronGeometry(s,1),c,[x,y,z],[0,x*.42,0],scale);
  for(const [x,z] of [[-1.27,.58],[1.24,.51],[-1.15,-.72]]){groundRock(k,x,z,.20,C.slate);tuft(k,x*.90,z*.90,.25);}
  k.group.scale.set(1.10,1.10,1.10);return k.group;
}
function outpostGate(){
  const k=makeMeshKit();
  for(const x of [-1.3,1.3]){
    foot(k,x,0,.48);k.box('gate_post',[.38,2.12,.40],C.wood,[x,1.48,0],[],.045);
    for(const y of [.58,2.19])k.box('post_band',[.42,.22,.43],C.gold,[x,y,0]);
    k.mesh('gate_finial',new THREE.ConeGeometry(.28,.38,4),C.gold,[x,2.81,0],[0,Math.PI/4,0]);
    k.beam('gate_brace',[x,1.88,0],[x-Math.sign(x)*.47,2.42,0],.16,.19,C.woodLight);
    k.bolt('post_rivet',[x,2.18,.24],.06,C.steel);
    for(let step=0;step<3;step++)k.box('stacked_gate_base',[.64-step*.08,.24,.66-step*.08],step===2?C.cream:C.slate,[x,.12+step*.21,0],[],.05);
  }
  k.box('gate_lintel',[3.10,.34,.46],C.wood,[0,2.46,0],[],.045);
  k.box('gate_lintel_dark_back',[3.24,.16,.18],C.woodDark,[0,2.31,-.16],[],.03);
  for(const x of [-.88,.88])k.box('lintel_wrap',[.16,.34,.42],C.ivory,[x,2.44,0]);
  // The uneven pennant rhythm breaks the thin-sign read and makes this a
  // constructed outpost threshold rather than a decorative signboard.
  banner(k,1.98,2.28,.13,.64,1.16);
  banner(k,-.50,2.29,.16,.38,.58);banner(k,.46,2.30,.16,.32,.45);
  for(const [x,z] of [[-1.72,.36],[1.70,.33],[-1.46,-.40],[1.45,-.42]]){groundRock(k,x,z,.20,x<0?C.slate:C.stone);tuft(k,x*.90,z,.23);}
  return k.group;
}
function waygate(){
  const k=makeMeshKit();
  for(const x of [-1.18,1.18]){
    k.box('waygate_plinth',[.67,.29,.82],C.ink,[x,.15,0]);
    for(let i=0;i<3;i++)k.box('waygate_upright',[.54-i*.025,.49,.62],i===2?C.gold:C.slate,[x,.51+i*.49,0]);
  }
  for(let i=0;i<7;i++){
    const a=i/6*Math.PI; k.box('arch_key_stone',[.53,.46,.69],i%2?C.cream:C.ivory,[Math.cos(a)*1.17,1.71+Math.sin(a)*1.04,0],[0,0,a-Math.PI/2],.045);
  }
  k.box('keystone_gold',[.29,.41,.77],C.gold,[0,2.58,0]);
  // A stepped threshold gives the portal a real arrival side and prevents the
  // arch from reading as two isolated walls behind a flat cyan sheet.
  for(let i=0;i<3;i++)k.box('waygate_threshold_step',[1.54-i*.18,.16,.30],i===0?C.slate:C.cream,[0,.12+i*.13,.82-i*.13],[],.035);
  // A flat, cyan internal field reads from the phone camera while preserving
  // the authored trigger volume and the original open passage geometry.
  const portal=new THREE.BufferGeometry();portal.setAttribute('position',new THREE.Float32BufferAttribute([-.92,.34,.02,.92,.34,.02,.79,1.72,.02,0,2.42,.02,-.79,1.72,.02,-.92,.34,.02],3));portal.setIndex([0,1,2,0,2,5,5,2,3,5,3,4]);portal.computeVertexNormals();const p=k.mesh('cyan_portal_plane',portal,'#57d9e5');p.material=new THREE.MeshBasicMaterial({color:'#57d9e5',side:THREE.DoubleSide});
  k.mesh('portal_diamond',new THREE.OctahedronGeometry(.20,0),'#b6fff0',[0,1.35,.05],[0,Math.PI/4,0],[1,1,.18]);
  for(const [x,z] of [[-1.58,.42],[1.58,.42],[-1.35,-.41],[1.35,-.41]]){groundRock(k,x,z,.23,x<0?C.slate:C.stone);tuft(k,x*.88,z,.22);}
  return k.group;
}
function launchPad(){
  const k=makeMeshKit();
  k.mesh('launch_base',new THREE.CylinderGeometry(1.22,1.35,.26,10),C.ink,[0,.13,0]);
  k.mesh('launch_rim',new THREE.TorusGeometry(1.10,.14,4,10),C.gold,[0,.29,0],[Math.PI/2,0,0]);
  k.mesh('launch_surface',new THREE.CylinderGeometry(.97,.97,.07,10),C.slate,[0,.30,0]);
  for(const x of [-.89,.89])for(const z of [-.73,.73]){
    k.box('launch_bollard',[.24,.43,.24],C.slate,[x,.24,z],[],.035);k.box('bollard_light',[.16,.11,.16],C.tealLight,[x,.51,z],[],.025);
  }
  for(const x of [-.18,.18])k.box('launch_chevron',[.09,.025,.44],C.gold,[x,.226,0],[0,-Math.sign(x)*.68,0]);
  for(let i=0;i<3;i++)k.box('launch_step',[.82,.09,.20],C.steel,[0,.22-i*.062,1.27+i*.14],[],.025);
  for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.sin(a)*1.28,z=Math.cos(a)*1.28;k.box('segmented_pad_rim',[.46,.24,.36],i%2?C.cream:C.gold,[x,.36,z],[0,-a,0],.045);if(i%2===0){k.box('pad_pylon',[.25,.48,.25],C.slate,[x,.56,z],[],.04);k.box('pylon_cyan_light',[.16,.10,.16],'#54d5d3',[x,.85,z],[],.025);}}
  k.mesh('launch_center_mark',new THREE.ConeGeometry(.31,.045,4),C.gold,[0,.325,0],[0,Math.PI/4,0]);
  k.box('pad_supply_crate',[.48,.50,.43],C.leafLight,[1.58,.29,.78],[],.045);k.box('supply_strap',[.09,.54,.45],C.gold,[1.58,.29,.78],[],.02);
  k.box('pad_banner_pole',[.09,.84,.09],C.ink,[1.44,.67,-1.05],[],.02);banner(k,1.44,1.08,-1.05,.42,.50);
  for(const [x,z] of [[-1.18,.72],[1.26,-.22],[-.82,-1.18]]){groundRock(k,x,z,.18,C.slate);tuft(k,x,z,.22);}
  return k.group;
}
const builders={'asset_drop_pod':dropPod,'asset_workshop_awning':workshop,'asset_sanctuary_totem':sanctuary,'asset_path_lantern':lantern,'asset_wooden_crate':crate,'asset_bench':bench,'asset_chest':chest,'asset_frontier_portal_outpost':outpostGate,'asset_frontier_portal':waygate,'asset_frontier_launch_pad':launchPad};
export function createFrontierPropMeshVisual(assetId){return builders[assetId]?.()??null;}
