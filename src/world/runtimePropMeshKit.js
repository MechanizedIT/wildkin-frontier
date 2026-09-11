// Maintained runtime models. Callers retain gameplay, collision and state ownership.
import * as THREE from 'three';
import {makeMeshKit,facetedRings,bevelBox,chippedBox,leafBlade,FRONTIER_COLORS as C} from './facetedMeshKit.js';

function stone(k,name,pos,s=1,color='#8b8b80') {
  return k.mesh(name,facetedRings([[0,.42,.34],[.18,.51,.44,-.04],[.50,.40,.35,.04],[.66,.23,.25,-.06]],7),color,pos,[0,pos[0]*2,0],[s,s,s]);
}
function footing(k,r=.42){for(let i=0;i<5;i++){const a=i*2.399;stone(k,'footing_stone',[Math.cos(a)*r,0,Math.sin(a)*r],.38+(i%2)*.16,i%2?'#aaa38e':'#64717a');}}
function crystal(k,name,pos,r=.3,height=1,color='#37d5e9'){return k.mesh(name,new THREE.OctahedronGeometry(r),color,pos,[0,.25,0],[.85,height,.85]);}
function ring(k,name,r,y,color){const node=k.mesh(name,new THREE.RingGeometry(r*.84,r,24),color,[0,y,0],[-Math.PI/2,0,0]);node.material=new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide});return node;}

export function createHarvestTree(rng=()=>.5){const k=makeMeshKit();
  k.mesh('tree_trunk',facetedRings([[0,.36,.29],[.18,.28,.25],[.50,.16,.18,.03],[1.03,.15,.12,-.04]],7),C.wood);
  for(let i=0;i<5;i++){const a=i*1.257;k.beam('root_flare',[Math.sin(a)*.47,.035,Math.cos(a)*.42],[Math.sin(a)*.15,.39,Math.cos(a)*.15],.18,.17,i%2?C.woodDark:C.wood);}
  for(const [x,y,z,s] of [[-.5,1.05,.2,.50],[.45,1.13,.17,.53],[.06,1.48,0,.6],[-.28,1.17,-.39,.46],[.45,1.12,-.36,.42]]){
    k.beam('tree_branch',[0,.57,0],[x,y-.08,z],.17,.15,C.wood);
    const i=k.group.children.filter(n=>n.name.startsWith('tree_chunk_')).length;
    k.mesh(`tree_chunk_${i}`,new THREE.IcosahedronGeometry(s,1),['#65983b','#80ab3e','#91b444','#4f8538','#709b39'][i],[x,y,z],[rng()*.13,rng()*2,0],[1.05,.8,1]);
  }
  footing(k,.39);k.group.userData.visualKind='resource/tree';return k.group;
}
export function createHarvestRock(rng=()=>.5){const k=makeMeshKit();
  [[-.14,0,-.09,1.32,'#92968f'],[.44,0,.26,.88,'#b0b0a1'],[-.48,0,.25,.83,'#69757a'],[.28,0,-.43,.86,'#a1a69c']].forEach(([x,y,z,s,c],i)=>{const m=stone(k,`rock_chunk_${i}`,[x,y,z],s,c);m.rotation.y+=rng()*.7;});
  for(let i=0;i<4;i++)stone(k,'rock_scree',[Math.sin(i*2.4)*.73,0,Math.cos(i*2.4)*.61],.22,'#9fa38f');
  k.group.userData.visualKind='resource/rock';return k.group;
}
// Several folded blades form each removable harvest tuft, keeping three lifecycle meshes.
export function createHarvestFiber(){const k=makeMeshKit();
  for(let i=0;i<3;i++){
    const positions=[];
    for(let j=0;j<5;j++){
      const length=.58+((i+j)%3)*.13,g=leafBlade(length,.11,.10).toNonIndexed();
      const matrix=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(.2+j*.12,i*2.1+j*.7,(j-2)*.22));g.applyMatrix4(matrix);
      positions.push(...g.attributes.position.array);g.dispose();
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();
    k.mesh(`fiber_tuft_${i}`,geo,['#639027','#8cac36','#416f32'][i],[(i-1)*.2,.01,i===1?-.08:.09]);
  }
  for(let i=0;i<3;i++)stone(k,'fiber_pebble',[(i-1)*.29,0,.30],.17,'#8e9282');
  k.group.userData.visualKind='resource/fiber';return k.group;
}

export function createOutpostFence(size={w:2.8,h:1.1,d:.28}){const k=makeMeshKit(),w=size.w??size.width??2.8,h=size.h??size.height??1.1,d=size.d??size.depth??.28;
  const length=Math.max(w,d),thickness=Math.min(w,d),post=Math.min(thickness,.30),sections=Math.max(1,Math.ceil(length/2.7)),span=(length-post)/sections;
  for(let i=0;i<=sections;i++){const x=-length/2+post/2+i*span;k.box('fence_post',[post,h,post],C.woodDark,[x,h/2,0]);k.box('post_endgrain',[post*.83,.018,post*.83],C.woodLight,[x,h+.008,0]);
    for(const y of[h*.25,h*.77]){k.box('fence_bracket',[post*1.13,.16,post*1.13],C.slate,[x,y,0]);k.bolt('fence_bolt',[x,y,post*.59],.044);}}
  for(let i=0;i<sections;i++){const a=-length/2+post/2+i*span,b=a+span,x=(a+b)/2;
    for(const y of[h*.25,h*.77])k.box('fence_rail',[span,.16,post*.59],C.woodLight,[x,y,0]);
    k.beam('cross_brace',[a+.05,h*.31,-post*.10],[b-.05,h*.71,-post*.10],.12,post*.45,C.wood);
    k.beam('cross_brace',[a+.05,h*.71,post*.16],[b-.05,h*.31,post*.16],.12,post*.45,C.wood);
  }
  if(d>w)k.group.rotation.y=Math.PI/2;const root=new THREE.Group();root.add(k.group);root.userData.visualKind='prop/fence';return root;
}
export function createNavigationPillar(){const k=makeMeshKit();footing(k,.34);
  k.mesh('waypoint_cyl',facetedRings([[.09,.30],[.39,.28],[.96,.21],[1.15,.26]],6),C.slate);
  for(const y of[.35,1.14])k.mesh('ivory_pillar_band',new THREE.CylinderGeometry(.285,.31,.13,6),C.ivory,[0,y,0]);
  k.mesh('cap_socket',new THREE.CylinderGeometry(.22,.24,.06,6),C.ink,[0,1.23,0]);crystal(k,'waypoint_crystal',[0,1.49,0],.28,1.1);
  ring(k,'waypoint_ring',.56,.025,'#3fcdd4');k.group.userData.visualKind='anchor/waypoint';return k.group;
}
export function createExtractionBeacon(){const k=makeMeshKit();
  k.mesh('beacon_base',facetedRings([[0,.41],[.20,.44],[.28,.34]],6),C.ink);
  k.mesh('beacon_housing',facetedRings([[.2,.29],[.63,.30],[.89,.21]],4),C.ivory,[0,0,0],[0,Math.PI/4,0]);
  k.mesh('orange_cap',facetedRings([[.64,.31],[.89,.23],[.93,.19]],4),'#e28a31',[0,0,0],[0,Math.PI/4,0]);
  for(const side of[-1,1]){k.beam('beacon_side_strut',[side*.32,.18,0],[side*.23,.79,0],.11,.18,C.slate);k.box('strut_shoe',[.16,.15,.22],C.gold,[side*.31,.27,0]);stone(k,'beacon_foot',[side*.29,0,.2],.52,C.slate);}
  for(const y of[.43,.74]){k.box('beacon_vent_frame',[.22,.14,.04],C.steel,[0,y,.247]);k.box('beacon_dark_vent',[.17,.072,.024],C.ink,[0,y,.275]);}
  k.mesh('beacon_light_mount',new THREE.CylinderGeometry(.15,.16,.13,8),C.slate,[0,1.02,0]);k.mesh('amber_light',new THREE.CylinderGeometry(.10,.11,.21,6),'#ffb62f',[0,1.18,0]);k.mesh('light_cap',new THREE.CylinderGeometry(.10,.13,.05,6),'#e87b25',[0,1.31,0]);
  ring(k,'beacon_ring',.48,.025,'#df9147');k.group.userData.visualKind='anchor/beacon';return k.group;
}
export function createCrystalResonator(){const k=makeMeshKit();
  k.mesh('resonator_base',facetedRings([[0,.79],[.17,.85],[.32,.71]],10),C.slate);
  k.mesh('resonator_upper_ring',new THREE.CylinderGeometry(.67,.73,.13,10),C.ivory,[0,.34,0]);
  k.mesh('inner_dark_basin',new THREE.CylinderGeometry(.5,.5,.04,10),C.ink,[0,.419,0]);k.mesh('central_plinth',new THREE.CylinderGeometry(.30,.34,.10,8),C.cream,[0,.455,0]);
  for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2,dir=new THREE.Vector3(Math.sin(a),0,Math.cos(a));const p=(r,y)=>[dir.x*r,y,dir.z*r];
    stone(k,'plinth_wedge',p(.67,0),.48,i%2?C.ivory:C.steel);
    k.beam('gold_lower_arm',p(.71,.20),p(.76,.64),.17,.16,C.gold);k.beam('gold_upper_arm',p(.76,.64),p(.57,.95),.16,.16,C.paleGold);k.box('gold_prong',[.15,.25,.15],C.paleGold,p(.57,1.02));}
  crystal(k,'suspended_core',[0,.91,0],.38,1.15);k.group.userData.visualKind='prop/resonator';return k.group;
}

export function createMasonryPlatform(w=3,height=1.25,d=3,{obstacle=false,ladder=false}={}){const k=makeMeshKit(),top=height-.02;
  if(obstacle){k.mesh('visual_obstacle',chippedBox(w,height,d,2),'#b1a58c',[0,height/2-.02,0]);k.group.userData.visualKind='traversal/obstacle';return k.group;}
  k.box(ladder?'ladder_wall':'visual_platform',[w-.07,height-.08,d-.07],'#595b59',[0,height/2-.02,0],[],Math.min(.07,height*.1));
  const cols=Math.max(1,Math.ceil(w/.7)),rows=Math.max(1,Math.ceil(height/.52));
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)for(const side of[-1,1]){
    const bw=w/cols-.026,bh=height/rows-.025,x=-w/2+(col+.5)*w/cols,y=(row+.5)*height/rows-.02;
    k.mesh('stone_course',chippedBox(bw,bh,Math.min(d*.24,.13),row+col),(row+col)%3===0?'#b2a58a':(row+col)%3===1?'#948b76':'#a3977e',[x,y,side*(d/2-Math.min(d*.12,.065))]);
  }
  const sideCols=Math.max(1,Math.ceil(d/.7));for(let row=0;row<rows;row++)for(let col=0;col<sideCols;col++)for(const side of[-1,1]){
    k.mesh('side_stone_course',chippedBox(.13,height/rows-.022,d/sideCols-.026,row+col),'#a89c83',[side*(w/2-.065),(row+.5)*height/rows-.02,-d/2+(col+.5)*d/sideCols]);
  }
  if(!ladder){const nx=Math.max(1,Math.ceil(w/.75)),nz=Math.max(1,Math.ceil(d/.75));for(let x=0;x<nx;x++)for(let z=0;z<nz;z++){
    k.box('walking_top_plate',[w/nx-.018,.07,d/nz-.018],obstacle?((x+z)%2?'#b6aa92':'#a89e88'):((x+z)%2?'#58616a':'#667078'),[-w/2+(x+.5)*w/nx,top-.035,-d/2+(z+.5)*d/nz],[],.018);}
    if(!obstacle)for(const x of[-1,1])for(const z of[-1,1])k.box('corner_buttress',[Math.min(.33,w*.2),height,Math.min(.33,d*.2)],C.ivory,[x*(w/2-Math.min(.165,w*.1)),height/2-.02,z*(d/2-Math.min(.165,d*.1))],[],.065);
  }else{
    for(const side of[-1,1])for(let row=0;row<rows;row++)k.mesh('ladder_stone_pier',chippedBox(w*.24,height/rows-.016,d+.08,row),row%2?'#b7aa8d':'#a59980',[side*w*.36,(row+.5)*height/rows-.02,0]);
    const rungWidth=Math.min(w*.65,1.15),depth=d/2+.095;
    for(const x of[-rungWidth*.5,rungWidth*.5])k.box('ladder_rail',[.10,height+.04,.12],C.slate,[x,height/2,depth]);
    const n=Math.max(2,Math.round(height/.42));for(let i=0;i<n;i++){const y=(i+.5)*height/n;k.box(`ladder_rung_${i}`,[rungWidth,.095,.13],C.woodLight,[0,y,depth]);for(const x of[-rungWidth*.5,rungWidth*.5])k.bolt('ladder_bolt',[x,y,depth+.08],.036);}
  }
  k.group.userData.visualKind=ladder?'traversal/ladder':obstacle?'traversal/obstacle':'traversal/platform';return k.group;
}
export function createTrailMarker({markerKind='checkpoint',triggerRadius=1.8}={}){const k=makeMeshKit(),color=markerKind==='end'?'#e9bd5c':markerKind==='start'?'#54d2a6':'#63d7e8';
  for(const x of[-.42,.42]){k.box('marker_post',[.14,1.18,.16],C.woodDark,[x,.59,0]);k.box('marker_cap',[.21,.15,.23],C.gold,[x,1.16,0]);k.box('marker_shoe',[.21,.13,.23],C.gold,[x,.17,0]);stone(k,'marker_foot',[x,0,0],.39,C.slate);}
  k.beam('banner_rod',[-.45,1.07,0],[.45,1.07,0],.045,.045,C.steel);
  const shape=new THREE.Shape();shape.moveTo(-.31,0);shape.lineTo(.31,0);shape.lineTo(.29,-.81);shape.lineTo(0,-.62);shape.lineTo(-.29,-.81);shape.closePath();
  k.mesh('trail_banner',new THREE.ExtrudeGeometry(shape,{depth:.027,bevelEnabled:false}), '#397caa',[0,1.06,.024]);
  k.beam('chevron_left',[-.20,.62,.065],[0,.82,.065],.074,.024,C.cream);k.beam('chevron_right',[0,.82,.065],[.20,.62,.065],.074,.024,C.cream);
  const displayScale=1.45;for(const node of k.group.children){node.position.multiplyScalar(displayScale);node.scale.multiplyScalar(displayScale);}
  const trigger=ring(k,'parkour_marker_ring',Math.max(.5,triggerRadius),.02,color);trigger.geometry.dispose();trigger.geometry=new THREE.RingGeometry(Math.max(.05,triggerRadius-.045),Math.max(.5,triggerRadius),36);trigger.material.transparent=true;trigger.material.opacity=.45;
  k.group.userData.parkourMarkerKind=markerKind;k.group.userData.visualKind=`parkour/${markerKind}`;return k.group;
}
