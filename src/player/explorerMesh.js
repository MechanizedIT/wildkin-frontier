import * as THREE from 'three';
import {bevelBox,makeMeshKit} from '../world/facetedMeshKit.js';

// Designed cross sections give garments planar fronts, chamfered corners and
// changing silhouettes. Sections run from foot to crown.
function tailored(sections) {
  sections=[...sections].sort((a,b)=>a[0]-b[0]);const p=[],index=[];
  for(const [y,w,d,x=0,z=0,b=.38] of sections)for(const [a,c]of[[-1,-1+b],[-1+b,-1],[1-b,-1],[1,-1+b],[1,1-b],[1-b,1],[-1+b,1],[-1,1-b]])p.push(x+a*w,y,z+c*d);
  for(let row=0;row<sections.length-1;row++)for(let i=0;i<8;i++){const a=row*8+i,b=row*8+(i+1)%8;index.push(a,a+8,b,b,a+8,b+8);}
  for(let i=1;i<7;i++){index.push(0,i,i+1);const a=(sections.length-1)*8;index.push(a,a+i+1,a+i);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(index);g.computeVertexNormals();return g;
}
// Each asymmetrical tuft has an off-center pointed tip and a broad curved
// shoulder. The tiny convex hull is triangulated once during model creation.
function hairLock(w,h,d,lean=0){
  const points=[[-.49*w,.36*h,-.24*d],[.43*w,.42*h,-.27*d],[-.56*w,-.02*h,.21*d],[.47*w,-.11*h,.26*d],[lean,-.59*h,.30*d],[-.06*w,.22*h,.60*d],[.02*w,.49*h,-.42*d],[lean*.4,-.20*h,-.34*d]].map(p=>new THREE.Vector3(...p));
  const indices=[],normal=new THREE.Vector3(),edge=new THREE.Vector3(),delta=new THREE.Vector3();
  for(let a=0;a<points.length-2;a++)for(let b=a+1;b<points.length-1;b++)for(let c=b+1;c<points.length;c++){
    normal.crossVectors(edge.subVectors(points[b],points[a]),delta.subVectors(points[c],points[a]));if(normal.lengthSq()<1e-14)continue;
    let positive=false,negative=false;
    for(let i=0;i<points.length;i++){const d=normal.dot(delta.subVectors(points[i],points[a]));if(d>1e-9)positive=true;if(d< -1e-9)negative=true;}
    if(positive&&negative)continue;
    indices.push(a,positive?c:b,positive?b:c);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points.flatMap(p=>p.toArray()),3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
export const roundedBox=bevelBox;

export function createExplorerMesh(){
  const k=makeMeshKit(),g=k.group;
  const c={blue:'#436781',blueLight:'#587e97',blueDark:'#354f68',navy:'#303f50',ink:'#252d34',skin:'#e7a077',skinLight:'#f3b086',hair:'#6c3b28',hairLight:'#79442e',hairDark:'#4e2b20',tan:'#b79b6d',tanLight:'#d2b486',orange:'#e9a14a',leather:'#855a36',leatherDark:'#634630',steel:'#75828b',ivory:'#e6d9c1'};
  const part=(name,sections,color,pos=[0,0,0],parent=g)=>k.mesh(name,tailored(sections),color,pos,[],[1,1,1],parent);
  const box=(name,size,color,pos,rotation=[],parent=g)=>k.mesh(name,bevelBox(...size),color,pos,rotation,[1,1,1],parent);
  part('jacket_body',[[.28,.175,.112],[.36,.205,.137],[.57,.238,.151],[.70,.252,.146],[.78,.205,.122],[.82,.125,.088]],c.blue);
  part('jacket_lower_panel',[[.285,.17,.009],[.49,.205,.014],[.60,.222,.014]],c.blueDark,[0,0,.155]);
  part('shirt_inset',[[.60,.104,.009],[.785,.115,.009]],c.ink,[0,0,.158]);box('jacket_placket',[.035,.35,.027],c.blueDark,[0,.49,.171]);
  for(const side of[-1,1]){
    part('raised_split_collar',[[.675,.048,.036],[.755,.082,.052,side*.018],[.855,.075,.042,side*.004]],c.blueLight,[side*.125,0,.056]);
    const lapel=new THREE.Shape();lapel.moveTo(side*.044,.585);lapel.lineTo(side*.198,.749);lapel.lineTo(side*.152,.805);lapel.lineTo(side*.070,.747);lapel.closePath();
    k.mesh('jacket_lapel',new THREE.ExtrudeGeometry(lapel,{depth:.029,bevelEnabled:true,bevelThickness:.008,bevelSize:.007,bevelSegments:1,curveSegments:1}),c.blueLight,[0,0,.160]);box('jacket_hem_tab',[.059,.047,.020],c.orange,[side*.15,.345,.163],[0,0,side*.18]);
  }
  box('belt',[.405,.065,.255],c.ink,[0,.285,0]);box('belt_buckle',[.10,.071,.034],c.steel,[0,.285,.145]);box('buckle_inset',[.063,.039,.009],'#899298',[0,.285,.167]);
  for(const side of[-1,1]){
    box('belt_tan_keeper',[.05,.072,.033],c.orange,[side*.17,.285,.145]);
    const leg=new THREE.Group();leg.name=side<0?'leftLeg':'rightLeg';leg.position.set(side*.174,.25,side*.025);leg.rotation.z=side*.035;leg.rotation.y=side*.055;g.add(leg);
    part('trouser_thigh',[[.01,.112,.113],[-.12,.108,.102],[-.245,.084,.088],[-.29,.076,.084]],c.navy,[0,0,0],leg);part('trouser_calf',[[-.23,.083,.086],[-.34,.087,.087],[-.47,.068,.073],[-.50,.075,.080]],c.navy,[0,0,0],leg);
    part('cargo_pocket',[[-.07,.055,.088],[-.18,.066,.101],[-.27,.053,.082]],c.blueDark,[side*.095,0,.025],leg);box('cargo_flap',[.093,.047,.130],c.orange,[side*.094,-.12,.037],[0,0,side*-.1],leg);
    part('knee_wrap',[[-.255,.091,.091],[-.295,.097,.095],[-.325,.085,.088]],c.tan,[0,0,.003],leg);part('knee_pad',[[-.252,.067,.018],[-.296,.080,.028],[-.326,.065,.020]],c.tanLight,[0,0,.097],leg);
    part('boot_shaft',[[-.43,.078,.079],[-.51,.096,.091],[-.57,.096,.092]],c.leatherDark,[0,0,.004],leg);part('boot_cuff',[[-.40,.104,.095],[-.46,.110,.101],[-.49,.101,.096]],c.tan,[0,0,.004],leg);
    part('boot_upper',[[-.575,.105,.143,0,.056],[-.51,.111,.142,0,.06],[-.47,.083,.087]],c.leather,[0,0,0],leg);part('boot_toe',[[-.592,.112,.147,0,.107],[-.55,.114,.152,0,.115],[-.515,.096,.134,0,.088]],c.leather,[0,0,0],leg);part('toe_cap',[[-.592,.091,.042,0,.158],[-.558,.102,.051,0,.164]],c.leatherDark,[0,0,0],leg);part('instep_guard',[[-.558,.076,.026,0,.162],[-.505,.080,.034,0,.151]],c.leatherDark,[0,0,0],leg);part('sole',[[-.586,.118,.156,0,.098],[-.652,.123,.160,0,.102]],c.ink,[0,0,0],leg);
    for(const y of[-.50,-.535])box('boot_lacing',[.145,.019,.027],c.leatherDark,[0,y,.166],[-.30,0,0],leg);
    for(const x of[-.075,0,.075])box('sole_tread',[.040,.031,.050],c.ink,[x,-.657,.15],[],leg);
  }
  part('neck',[[.745,.074,.067],[.87,.082,.073]],c.skin);
  // The cheek and brow transitions are separate low-poly planes: they make a
  // broad friendly face instead of a single tall rectangular head block.
  part('faceted_head',[[.835,.126,.112],[.875,.164,.135],[.94,.185,.151],[1.045,.190,.154],[1.115,.178,.148],[1.16,.142,.121]],c.skin,[0,0,.025]);
  part('jaw_plane',[[.845,.112,.019],[.90,.157,.031],[.955,.170,.025]],c.skinLight,[0,0,.169]);
  part('cheek_front',[[.895,.132,.012],[.975,.170,.019],[1.065,.162,.014]],c.skinLight,[0,0,.175]);
  for(const side of[-1,1]){
    part('ear',[[.90,.036,.027],[.99,.047,.036],[1.035,.030,.027]],c.skin,[side*.203,0,.01]);box('ear_inset',[.027,.073,.016],'#cf825a',[side*.218,.965,.039]);
    const eyePanel=(name,w,h,color,x,y,z)=>{const shape=new THREE.Shape(),r=w*.22;shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.lineTo(w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.lineTo(w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.lineTo(-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.closePath();return k.mesh(name,new THREE.ShapeGeometry(shape),color,[x,y,z]);};
    eyePanel('eye_socket',.094,.110,'#d68761',side*.083,1.006,.197);eyePanel('sclera',.078,.096,'#fff0d9',side*.078,1.008,.204);eyePanel('eye',.041,.084,'#35231d',side*.072,1.008,.210);box('eye_glint',[.008,.012,.006],'#fff2d8',[side*.072-.007,1.029,.217]);box('brow',[.105,.030,.028],c.hairDark,[side*.078,1.080,.205],[0,0,side*-.09]);
  }
  k.mesh('nose',new THREE.ConeGeometry(.025,.055,4),'#d58b63',[0,.951,.212],[Math.PI/2,0,Math.PI/4],[1,1,.8]);
  const smile=new THREE.CatmullRomCurve3([new THREE.Vector3(-.050,.909,.205),new THREE.Vector3(0,.899,.216),new THREE.Vector3(.050,.909,.205)]);k.mesh('smile',new THREE.TubeGeometry(smile,6,.0038,3,false),'#a66443');
  // Two low-poly masses establish a rounded cap and rear volume. Individual
  // locks then overlap it, avoiding the old horizontal banded hairstyle.
  k.mesh('hair_foundation',new THREE.DodecahedronGeometry(1,1),c.hairDark,[0,1.105,.004],[-.06,.12,.04],[.205,.178,.161]);
  k.mesh('back_hair',new THREE.DodecahedronGeometry(1,1),c.hair,[0,1.055,-.123],[.10,-.10,.03],[.213,.190,.118]);
  for(const [x,y,lean]of[[-.145,1.055,-.035],[-.07,1.035,-.015],[.01,1.035,.01],[.085,1.045,.024],[.15,1.07,.04]])k.mesh('back_hair_lock',hairLock(.125,.155,.10,lean),x<0?c.hairDark:c.hair,[x,y,-.183],[0,Math.PI,lean*3.5]);
  for(const side of[-1,1]){
    part('sideburn',[[.935,.034,.041],[1.105,.056,.067]],c.hair,[side*.176,0,.078]);
    for(let i=0;i<3;i++)k.mesh('side_hair_lock',hairLock(.115,.145,.12,side*.035),i%2?c.hair:c.hairLight,[side*(.148+i*.020),1.105-i*.049,.01-i*.021],[.12,side*.55,side*-.12]);
  }
  const fringe=[[-.158,1.126,.148,.112,.148,-.25,c.hairDark],[-.095,1.142,.175,.124,.162,.13,c.hair],[-.024,1.135,.184,.120,.178,-.08,c.hairLight],[.050,1.146,.176,.126,.164,.12,c.hair],[.126,1.126,.151,.112,.151,-.18,c.hairDark],[.174,1.112,.115,.094,.126,-.28,c.hair],[-.112,1.202,.026,.145,.124,-.14,c.hairDark],[-.030,1.217,.012,.155,.136,.09,c.hair],[.064,1.211,.020,.145,.132,-.10,c.hairLight],[.142,1.180,.032,.120,.123,.18,c.hair]];
  for(const[x,y,z,w,h,a,color]of fringe)k.mesh('tousled_hair_lock',hairLock(w,h,.13,x*.20),color,[x,y,z],[0,a,a*.52]);
  for(const side of[-1,1]){
    k.beam('harness_front',[side*.156,.38,.153],[side*.154,.726,.173],.043,.030,c.tan);
    const shoulderCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.154,.727,.173),new THREE.Vector3(side*.215,.805,.015),new THREE.Vector3(side*.162,.800,-.184)]);k.mesh('shoulder_harness',new THREE.TubeGeometry(shoulderCurve,5,.030,5,false),c.tanLight);
    k.mesh('shoulder_attachment_loop',new THREE.TorusGeometry(.036,.010,4,7),c.ink,[side*.162,.795,-.178],[Math.PI/2,0,0]);k.mesh('shoulder_attachment_loop',new THREE.TorusGeometry(.030,.009,4,7),c.ink,[side*.155,.725,.177],[Math.PI/2,0,0]);
    k.beam('harness_lower_curve',[side*.155,.38,.152],[side*.213,.39,-.10],.043,.029,c.tan);box('harness_adjuster',[.061,.050,.020],c.ink,[side*.155,.63,.196]);box('harness_gold_tab',[.038,.036,.024],c.orange,[side*.154,.70,.194]);
  }
  box('chest_strap',[.321,.037,.023],c.ink,[0,.57,.180]);box('chest_buckle',[.066,.047,.018],c.steel,[0,.57,.202]);
  for(const side of[-1,1]){
    // Start each sleeve as a narrow collar-adjacent ring, then ease it into a
    // fuller upper arm. This removes the toy-like horizontal shoulder shelf
    // while retaining the explorer's sturdy, layered jacket construction.
    const arm=new THREE.Group();arm.name=side>0?'leftArm':'rightArmVisual';arm.position.set(side*.250,.704,.012);arm.rotation.z=side*.155;g.add(arm);
    part('sleeve',[[.018,.052,.066],[-.025,.067,.079],[-.085,.094,.101],[-.175,.084,.091],[-.245,.064,.072]],side>0?c.blue:c.blueLight,[side*.018,0,0],arm);part('orange_sleeve_cuff',[[-.195,.094,.091],[-.255,.079,.078]],c.orange,[side*.019,0,.008],arm);part('forearm',[[-.275,.064,.069],[-.34,.058,.062],[-.39,.048,.052]],c.skin,[side*.022,0,.014],arm);part('wrist_wrap',[[-.35,.067,.067],[-.402,.058,.057]],c.ink,[side*.022,0,.013],arm);part('glove',[[-.39,.066,.067],[-.445,.063,.062],[-.468,.053,.053]],c.leatherDark,[side*.023,0,.015],arm);box('glove_guard',[.069,.040,.021],c.tan,[side*.023,-.419,.080],[],arm);part('thumb',[[-.418,.030,.034],[-.485,.026,.029]],c.skin,[side*-.048,0,.058],arm);for(const [i,x]of[-.042,0,.042].entries())part('fingerless_finger',[[-.452,.014,.026],[-.492,.016,.023]],c.skin,[x,-.010,.060+i*.002],arm);part('arm_patch',[[-.035,.019,.016],[-.13,.027,.020]],c.ivory,[side*.052,0,.073],arm);
  }
  part('backpack',[[.33,.175,.108],[.41,.203,.128],[.60,.204,.136],[.71,.190,.124],[.77,.157,.094]],c.blueDark,[0,0,-.242]);
  part('pack_bottom_leather',[[.345,.170,.108],[.405,.190,.126],[.465,.178,.116]],c.leather,[0,0,-.362]);
  part('pack_flap',[[.615,.170,.034],[.70,.182,.050],[.755,.157,.041]],c.blue,[0,0,-.372]);box('pack_flap_lip',[.368,.040,.072],c.ink,[0,.635,-.385]);box('pack_badge',[.112,.038,.020],c.orange,[0,.718,-.417]);
  for(const side of[-1,1]){k.beam('pack_strap',[side*.136,.365,-.397],[side*.145,.758,-.358],.052,.037,c.tan);box('pack_buckle',[.075,.061,.043],c.ink,[side*.140,.595,-.417]);box('pack_buckle_inset',[.040,.032,.014],c.steel,[side*.140,.598,-.443]);part('side_pack_pouch',[[.38,.050,.086],[.46,.066,.108],[.57,.059,.094]],side>0?c.tan:c.steel,[side*.232,0,-.264]);part('pouch_flap',[[.51,.063,.040],[.57,.072,.049]],c.tanLight,[side*.232,0,-.383]);box('pouch_clasp',[.041,.047,.026],c.ink,[side*.232,.545,-.425]);box('pouch_clasp_inset',[.019,.023,.010],c.steel,[side*.232,.545,-.442]);}
  k.mesh('pack_bedroll',new THREE.CylinderGeometry(.075,.075,.33,8),c.blueDark,[0,.82,-.254],[0,0,Math.PI/2]);for(const x of[-.105,.105])k.mesh('bedroll_binding',new THREE.TorusGeometry(.073,.013,4,8),c.tan,[x,.82,-.254],[0,Math.PI/2,0]);
  // The reference is a small human explorer: keep the head slightly smaller
  // than the early toy-like sculpt, scaling the entire face/hair assembly.
  const headNames=new Set(['faceted_head','jaw_plane','cheek_front','ear','ear_inset','eye_socket','sclera','eye','eye_glint','brow','nose','smile','hair_foundation','back_hair','back_hair_lock','sideburn','side_hair_lock','tousled_hair_lock']);
  const headGroup=new THREE.Group();headGroup.name='explorer_head';headGroup.position.set(0,.835,0);
  for(const mesh of [...g.children])if(headNames.has(mesh.name)){g.remove(mesh);mesh.position.y-=.835;headGroup.add(mesh);}
  headGroup.scale.setScalar(.90);g.add(headGroup);
  g.name='player';g.position.set(0,.35,5.5);return g;
}
