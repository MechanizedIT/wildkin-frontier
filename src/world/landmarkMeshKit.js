// Faceted regional landmarks. Visual-only shapes are baked into Author recipes.
import * as THREE from 'three';
import {makeMeshKit,facetedRings,leafBlade,FRONTIER_COLORS as C} from './facetedMeshKit.js';
export const CUSTOM_LANDMARK_ASSET_IDS=Object.freeze(['asset_ember_spire','asset_ember_bloom','asset_wind_arch','asset_cloudflower','asset_ruin_arch','asset_vault_barrier','asset_trail_stones','asset_fallen_log']);

function rock(k,x,y,z,size=1,color=C.stone){return k.mesh('weathered_stone',facetedRings([[0,.46,.4],[.16,.55,.48],[.52,.40,.34],[.69,.21,.22]],5),color,[x,y,z],[0,x+.3,0],[size,size,size]);}
function moss(k,x,y,z,s=.4){k.mesh('moss_shelf',new THREE.IcosahedronGeometry(s,0),'#829b45',[x,y,z],[0,z,0],[1,.18,1]);}
function baseStones(k,r=.5,n=5,color=C.stone){for(let i=0;i<n;i++){const a=i*2.399;rock(k,Math.sin(a)*r,0,Math.cos(a)*r,.33+(i%3)*.09,color);}}
function pointed(k,name,pos,height,radius,color,lean=.1){return k.mesh(name,facetedRings([[0,radius,radius*.8],[height*.25,radius*.88,radius*.74,lean*.2],[height*.72,radius*.61,radius*.54,lean*.8],[height,0,0,lean]],5),color,pos);}
function petalWedge(k,name,base,tip,width,color){const a=new THREE.Vector3(...base),b=new THREE.Vector3(...tip),length=a.distanceTo(b);const node=k.mesh(name,new THREE.OctahedronGeometry(1,0),color,a.clone().add(b).multiplyScalar(.5).toArray(),[0,0,0],[width,length*.52,width*.48]);node.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());return node;}
function spire(){const k=makeMeshKit();baseStones(k,1.02,8,'#3c3940');for(const [x,z,h,r,c,l]of[[0,0,3.45,.56,'#8f4939',.2],[-.5,.12,2.2,.38,'#593838',-.22],[.48,.12,2.48,.4,'#a6533e',.18],[-.18,-.43,1.75,.34,'#46383e',-.12]])pointed(k,'interlocked_ember_shard',[x,.08,z],h,r,c,l);k.mesh('amber_diamond_core',new THREE.OctahedronGeometry(.34,1),'#ffc45d',[.03,1.7,.52],[0,0,0],[.82,1.15,.46]);k.beam('molten_seam',[.03,.56,.49],[.03,1.45,.54],.07,.04,'#f07a37');k.beam('molten_seam',[.03,2.03,.5],[-.18,2.68,.22],.055,.04,'#e36636');return k.group;}
function needle(){const k=makeMeshKit();baseStones(k,.9,7,'#465460');for(const [x,z,h,r,c,l]of[[0,0,4.45,.48,'#667986',.2],[-.34,.1,2.45,.34,'#40515f',-.16],[.36,-.12,2.78,.36,'#81909a',.13]])pointed(k,'windscar_facet',[x,.03,z],h,r,c,l);k.mesh('wind_halo',new THREE.TorusGeometry(.73,.065,5,18),C.paleGold,[0,2.05,0],[1.18,0,.36],[1,1,.8]);return k.group;}
function flower(ember=false){const k=makeMeshKit(),height=ember?1.42:1.30;const stem=ember?'#513a30':'#527941';k.beam('flower_stem',[0,.02,0],[.025,height,0],.14,.12,stem);baseStones(k,.48,6,ember?'#69534a':C.stone);
  // Four thick petals radiate from a compact center.  These are real wedges,
  // so the raised studio camera sees a flower volume rather than card planes.
  const petalColors=ember?['#d95a36','#ffad42','#ef6e39','#f7a538']:['#e5e7cf','#f5f1d5','#d7dfc7','#ffffff'];
  for(let i=0;i<4;i++){const a=i*Math.PI*.5+.24,tip=[Math.sin(a)*.72,height+.12+(i%2)*.12,Math.cos(a)*.72];petalWedge(k,'broad_faceted_petal',[.02,height,.01],tip,.25,petalColors[i]);}
  for(const [side,y] of [[-1,height*.52],[1,height*.70]]){const end=[side*.42,y,.02];k.beam('flower_branch',[0,y-.16,0],end,.09,.08,stem);petalWedge(k,'branch_bud',end,[side*.64,y+.12,.02],.12,ember?'#ec783d':'#e5e7cf');}
  k.mesh('pollen_center',new THREE.IcosahedronGeometry(.20,1),C.gold,[.025,height+.10,0]);return k.group;}
function ruin(){const k=makeMeshKit();
  for(const side of [-1,1])for(let j=0;j<4;j++){
    const x=side*(1.08+(j%2)*.025),y=.32+j*.51;k.box('ruin_course',[.62,.49,.66],j%2?'#878570':'#9e9a80',[x,y,0],[0,side*.025,side*(j%2)*.018],.07);
    if(j%2===0)moss(k,x,y+.25,.07,.37);
  }
  for(const [x,y,a]of[[-.81,2.22,-.60],[-.40,2.48,-.26],[.03,2.55,.04],[.49,2.40,.36],[.86,2.16,.66]]){k.box('ruin_arch_stone',[.56,.47,.66],'#a5a18a',[x,y,0],[0,0,a],.06);moss(k,x-.06,y+.22,-.06,.28);}
  for(const side of[-1,1]){rock(k,side*1.31,0,.19,.65);moss(k,side*1.19,.33,.29,.26);}return k.group;}
function barrier(){const k=makeMeshKit();k.mesh('barrier_plinth',facetedRings([[0,1.05],[.22,1.12],[.48,.86]],8),C.stone);k.mesh('barrier_inner_pad',new THREE.CylinderGeometry(.5,.58,.15,8),C.gold,[0,.52,0]);for(const side of[-1,1]){k.beam('resonance_lower_arm',[side*.7,.38,0],[side*.91,1.0,0],.22,.24,C.gold);k.beam('resonance_upper_arm',[side*.91,1.0,0],[side*.5,1.52,0],.18,.22,C.paleGold);}k.mesh('resonant_crystal',new THREE.OctahedronGeometry(.48,1),'#4bd4d7',[0,1.28,0],[0,Math.PI/4,0],[.9,1.45,.9]);baseStones(k,1.1,6,'#687774');moss(k,-.6,.45,.46,.34);moss(k,.6,.45,-.42,.34);return k.group;}
function trail(){const k=makeMeshKit();
  // Broad, separated stepping slabs retain dark navigable gaps instead of
  // collapsing into one cone pile.  Moss follows selected upper edges only.
  const slabs=[[-.82,-.58,.72,.12,-.15],[-.25,-.18,.88,.15,.08],[.48,.10,.74,.11,-.18],[.75,.67,.64,.13,.12],[-.18,.66,.78,.14,-.09]];
  for(const [x,z,s,h,r] of slabs){k.mesh('broad_trail_slab',facetedRings([[0,s*.54,s*.43],[h*.42,s*.59,s*.47],[h,s*.48,s*.39]],6),'#98937d',[x,0,z],[0,r,0]);moss(k,x-s*.10,h+.018,z-s*.08,s*.28);}
  for(const [x,z,s] of [[-1.16,-.12,.20],[-.55,.92,.17],[1.13,.36,.18],[.16,-.79,.15]])rock(k,x,0,z,s,'#59645d');
  for(const [x,z] of [[-.98,.29],[.25,.75]])k.mesh('trail_grass',leafBlade(.25,.08,.05),'#6b913e',[x,.02,z],[.55,x*2,0]);return k.group;}
function log(){const k=makeMeshKit();
  const outer=k.mesh('broken_bark',new THREE.CylinderGeometry(.37,.43,2.62,8,1,true),C.woodDark,[0,.40,0],[0,0,Math.PI/2]);
  for(const x of[-1.32,1.32]){
    k.mesh('end_grain',new THREE.RingGeometry(.13,.34,8),C.woodLight,[x,.40,0],[0,Math.PI/2,0]);
    const hollow=k.mesh('hollow_log_end',new THREE.CircleGeometry(.13,8),C.ink,[x-Math.sign(x)*.08,.40,0],[0,Math.PI/2,0]);hollow.material=k.material(C.ink).clone();hollow.material.side=THREE.DoubleSide;
  }
  // Deliberate longitudinal bark plates, exposed broken branch and moss.
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2;k.box('bark_ridge',[2.48,.11,.14],i%2?C.wood:C.woodLight,[0,.4+Math.sin(a)*.36,Math.cos(a)*.35],[a,0,0],.024);}
  k.beam('broken_branch',[.35,.58,-.10],[.65,1.04,-.33],.17,.16,C.woodDark);
  for(const x of[-.92,-.48,-.05,.38,.78])moss(k,x,.81,0,.38);for(let i=0;i<5;i++)k.mesh('ground_leaf',leafBlade(.42,.13,.07),i%2?'#5d893c':'#89af49',[Math.cos(i*1.26)*1.15,.03,Math.sin(i*1.26)*.72],[0,i*1.26,-1.1]);baseStones(k,1.0,5);return k.group;
}
const builders={'asset_ember_spire':spire,'asset_ember_bloom':()=>flower(true),'asset_wind_arch':needle,'asset_cloudflower':()=>flower(false),'asset_ruin_arch':ruin,'asset_vault_barrier':barrier,'asset_trail_stones':trail,'asset_fallen_log':log};
export function createLandmarkMeshVisual(id){return builders[id]?.()??null;}
