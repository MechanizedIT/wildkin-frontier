import * as THREE from 'three';

// Original field explorer: soft cloth, ochre leather, ivory hood and jade scarf.
// Named limbs remain animation/tool anchors; visual parts do not own physics.
export function roundedBox(w,h,d,r=.03){
  const s=new THREE.Shape(),x=-w/2,y=-h/2;
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  const g=new THREE.ExtrudeGeometry(s,{depth:Math.max(.001,d-2*r),bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:2,steps:1,curveSegments:3});g.translate(0,0,-Math.max(.001,d-2*r)/2);return g;
}
export function createExplorerMesh(){
  const group=new THREE.Group();
  const material=(color,roughness=.82)=>new THREE.MeshStandardMaterial({color,roughness});
  const cloth=material('#dcb574'),leather=material('#a9572c'),dark=material('#263a4a'),jade=material('#238b80'),ivory=material('#ffedc8'),skin=material('#dc956c'),gold=material('#ffc964',.45),glass=material('#133e54',.2);
  const add=(geo,mat,name,x,y,z,sx=1,sy=1,sz=1,parent=group)=>{const m=new THREE.Mesh(geo,mat);m.name=name;m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;};
  const sphere=new THREE.SphereGeometry(1,16,12);
  const torso=new THREE.LatheGeometry([new THREE.Vector2(.20,.10),new THREE.Vector2(.27,.17),new THREE.Vector2(.29,.46),new THREE.Vector2(.24,.61),new THREE.Vector2(.15,.65)],14);
  add(torso,cloth,'body',0,0,0,1,1,.8);
  add(roundedBox(.53,.075,.40,.025),dark,'belt',0,.19,0);
  add(roundedBox(.11,.075,.025,.01),gold,'beltBuckle',0,.2,.227);
  for(const x of [-.16,.16]){
    const side=x<0?'left':'right',leg=new THREE.Group();leg.name=side+'Leg';leg.position.set(x,.27,.01);group.add(leg);
    add(sphere,dark,'trouser',0,-.085,0,.093,.17,.095,leg);
    add(roundedBox(.19,.17,.29,.045),leather,'boot',0,-.205,.035,1,1,1,leg);
    add(roundedBox(.20,.035,.30,.018),dark,'sole',0,-.273,.035,1,1,1,leg);
  }
  add(sphere,ivory,'hood',0,.8,-.015,.28,.265,.25);
  add(sphere,skin,'head',0,.785,.115,.205,.21,.18);
  add(roundedBox(.35,.1,.08,.025),dark,'fringe',0,.938,.20);
  const strap=add(new THREE.TorusGeometry(.25,.024,6,18),leather,'goggleStrap',0,.84,.005);strap.rotation.x=Math.PI/2;
  for(const x of [-.11,.11]){
    add(roundedBox(.165,.12,.065,.026),gold,'goggleRim',x,.865,.26);
    add(roundedBox(.125,.082,.025,.017),glass,'goggleLens',x,.865,.299);
    add(roundedBox(.052,.012,.01,.005),ivory,'goggleGlint',x-.021,.886,.317);
  }
  add(sphere,skin,'nose',0,.771,.30,.045,.038,.043);
  const scarf=add(new THREE.TorusGeometry(.205,.068,6,16),jade,'scarf',0,.615,.045,1,1,.85);scarf.rotation.x=Math.PI/2;
  const tail=add(roundedBox(.18,.43,.045,.02),jade,'scarfTail',.25,.40,-.09);tail.rotation.z=-.35;tail.rotation.y=-.2;
  add(roundedBox(.38,.40,.19,.055),leather,'backpack',0,.40,-.275);
  add(roundedBox(.31,.14,.04,.025),cloth,'packFlap',0,.555,-.394);
  for(const x of [-.105,.105])add(roundedBox(.035,.31,.023,.01),dark,'packStrap',x,.40,-.394);
  const blanket=add(new THREE.CylinderGeometry(.09,.09,.44,12),jade,'bedroll',0,.64,-.30);blanket.rotation.z=Math.PI/2;
  for(const x of [-.13,.13]){const tie=add(new THREE.TorusGeometry(.094,.012,5,12),gold,'bedrollTie',x,.64,-.30);tie.rotation.y=Math.PI/2;}
  const arm=new THREE.Group();arm.name='leftArm';arm.position.set(.30,.56,.015);group.add(arm);
  add(sphere,cloth,'sleeve',.025,-.12,0,.092,.18,.093,arm);add(sphere,leather,'glove',.035,-.275,.02,.078,.09,.078,arm);
  add(new THREE.IcosahedronGeometry(.044),gold,'top',0,1.047,-.025);
  add(new THREE.IcosahedronGeometry(.035),jade,'dir',-.13,.47,.23);
  group.name='player';group.position.set(0,.35,5.5);return group;
}
