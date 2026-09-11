// Visible, low-cost representation for a kill volume. The group stays in the
// volume's local space: callers position it at the authored volume center.
import * as THREE from 'three';
import {bevelBox} from './facetedMeshKit.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const hash=value=>{const x=Math.sin(value*127.1+value*value*311.7)*43758.5453;return x-Math.floor(x);};

export function createThornBedVisual({size={}}={}) {
  const width=Math.max(.5,Number(size.w??size.width??1));
  const depth=Math.max(.5,Number(size.d??size.depth??1));
  const height=Math.max(.35,Number(size.h??size.height??1));
  const group=new THREE.Group();
  group.name='thorn_bed_hazard';
  group.userData.hazardVisual='thornBed';

  const baseY=-height*.5+.025;
  const base=new THREE.Mesh(
    new THREE.BoxGeometry(width, .05, depth),
    new THREE.MeshStandardMaterial({color:0x261a35,roughness:.96,metalness:0,flatShading:true}),
  );
  base.name='thorn_bed_plum_base';base.position.y=baseY;base.receiveShadow=true;group.add(base);

  const rimMaterial=new THREE.MeshStandardMaterial({color:0x515059,roughness:1,metalness:0,flatShading:true});
  const rimThickness=clamp(Math.min(width,depth)*.065,.085,.20),rimY=baseY+.095;
  const rimParts=[
    [width+rimThickness*2,.08,rimThickness,0,depth*.5],
    [width+rimThickness*2,.08,rimThickness,0,-depth*.5],
    [rimThickness,.08,depth,.5*width,0],
    [rimThickness,.08,depth,-.5*width,0],
  ];
  for(const [w,h,d,x,z] of rimParts){const mesh=new THREE.Mesh(bevelBox(w,h*2,d),rimMaterial);mesh.position.set(x,rimY,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
  const corners=new THREE.InstancedMesh(bevelBox(rimThickness*1.8,.23,rimThickness*1.8),new THREE.MeshStandardMaterial({color:0xd9a14f,roughness:1,metalness:0,flatShading:true}),4);
  let cornerIndex=0;for(const x of[-1,1])for(const z of[-1,1])corners.setMatrixAt(cornerIndex++,new THREE.Matrix4().makeTranslation(x*width*.5,baseY+.14,z*depth*.5));corners.castShadow=true;corners.receiveShadow=true;group.add(corners);

  const area=width*depth;
  const thornCount=clamp(Math.round(area*3.3),16,74);
  const crystalCount=clamp(Math.round(area*.3),6,18);
  const thornGeometry=new THREE.ConeGeometry(.5,1,4,1);
  const thornMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.92,metalness:0,flatShading:true,vertexColors:true});
  const thorns=new THREE.InstancedMesh(thornGeometry,thornMaterial,thornCount);
  thorns.name='thorn_bed_thorns';thorns.castShadow=true;thorns.receiveShadow=true;
  const crystalGeometry=new THREE.OctahedronGeometry(.5,0);
  const crystalMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0,flatShading:true,vertexColors:true});
  const crystals=new THREE.InstancedMesh(crystalGeometry,crystalMaterial,crystalCount);
  crystals.name='thorn_bed_crystal_tips';crystals.castShadow=true;
  const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Euler(),scale=new THREE.Vector3(),navy=new THREE.Color(0x241e2e),navyLight=new THREE.Color(0x782f3c),coral=new THREE.Color(0x992f37),amber=new THREE.Color(0xd5483d);
  for(let i=0;i<thornCount;i++){
    const seed=i+1,edge=.12;position.set((hash(seed*2)-.5)*(width-edge),(hash(seed*3)-.5)*(depth-edge),0);
    const thornHeight=height*(.3+hash(seed*7)*.43),radius=clamp(.21+hash(seed*11)*.16,.18,.37),x=(hash(seed*2)-.5)*(width-.25),z=(hash(seed*3)-.5)*(depth-.25);
    position.set(x,baseY+.045+thornHeight*.5,z);rotation.set((hash(seed*13)-.5)*.2,hash(seed*17)*Math.PI*2,(hash(seed*19)-.5)*.15);scale.set(radius,thornHeight,radius);matrix.compose(position,new THREE.Quaternion().setFromEuler(rotation),scale);thorns.setMatrixAt(i,matrix);thorns.setColorAt(i,navy.clone().lerp(navyLight,hash(seed*23)));
  }
  for(let i=0;i<crystalCount;i++){
    const seed=thornCount+i+1,crystalHeight=height*(.18+hash(seed*5)*.2),radius=.09+hash(seed*9)*.08,x=(hash(seed*2)-.5)*(width-.22),z=(hash(seed*3)-.5)*(depth-.22);position.set(x,baseY+.06+crystalHeight*.5,z);rotation.set((hash(seed*7)-.5)*.2,hash(seed*11)*Math.PI*2,(hash(seed*13)-.5)*.2);scale.set(radius,crystalHeight,radius);matrix.compose(position,new THREE.Quaternion().setFromEuler(rotation),scale);crystals.setMatrixAt(i,matrix);crystals.setColorAt(i,coral.clone().lerp(amber,hash(seed*17)));
  }
  thorns.instanceMatrix.needsUpdate=true;thorns.instanceColor.needsUpdate=true;crystals.instanceMatrix.needsUpdate=true;crystals.instanceColor.needsUpdate=true;group.add(thorns,crystals);
  return group;
}
