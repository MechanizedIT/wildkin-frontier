import * as THREE from 'three';

// Small physical products sit on the machine; each output owns its resources.
export function createCraftOutputVisual(id) {
  const root=new THREE.Group();root.name=`crafted-${id}`;
  function part(geometry,color,x=0,y=0,z=0){const mesh=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color,flatShading:true}));mesh.position.set(x,y,z);root.add(mesh);return mesh;}
  const box=(w,h,d,color,x=0,y=0,z=0)=>part(new THREE.BoxGeometry(w,h,d),color,x,y,z);
  if(id==='medkit'){
    box(.32,.2,.2,0xe7ddd0,0,.1);box(.12,.16,.012,0xd66950,0,.11,.106);box(.24,.065,.015,0xd66950,0,.11,.108);
    box(.12,.04,.07,0x355365,0,.22);
  }else if(id==='calming_chime'){
    box(.3,.04,.07,0xa7d7d1,0,.33);
    for(const x of [-.105,0,.105])box(.027,.22-Math.abs(x)*.45,.025,0xa7d7d1,x,.19);
    part(new THREE.OctahedronGeometry(.075),0xb48be6,0,.15,.04);
  }else if(id==='berry_lure'){
    box(.3,.028,.25,0x638b52,0,.02);
    for(const [x,z]of [[-.075,0],[.075,0],[0,.07]])part(new THREE.IcosahedronGeometry(.08,0),0xd6527b,x,.09,z);
  }else{
    const ring=part(new THREE.TorusGeometry(.15,.026,4,12),id==='woven_snare'?0xb59565:0x91bec1,0,.04);ring.rotation.x=Math.PI/2;
    box(.1,.065,.06,0x405567,.14,.045,.09);
    if(id==='woven_snare')for(const x of [-.08,0,.08])box(.008,.012,.24,0xd7bd87,x,.045);
  }
  return root;
}
export function disposeCraftOutput(root){if(!root)return;root.removeFromParent();root.traverse(n=>{n.geometry?.dispose();n.material?.dispose();});}
