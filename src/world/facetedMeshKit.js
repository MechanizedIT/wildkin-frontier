// Small, explicit modeling primitives for the maintained art kits. These create
// geometry only; world placement, gameplay and collision stay authored elsewhere.
import * as THREE from 'three';

export const FRONTIER_COLORS = Object.freeze({
  ink:'#263541', slate:'#425563', steel:'#657883', ivory:'#e5d7b5', cream:'#f2e3bc',
  gold:'#d99942', paleGold:'#e8b963', wood:'#855333', woodLight:'#aa7440', woodDark:'#583c2d',
  teal:'#277775', tealLight:'#3f9990', leaf:'#448944', leafLight:'#78aa4d', stone:'#7b8072',
});

// Straight bevels make broad planes and intentional edge catches, without the
// many curved vertices of rounded boxes. Dimensions include the bevel.
export function bevelBox(w,h,d,r=Math.min(w,h,d)*.12) {
  r=Math.max(.001,Math.min(r,w*.24,h*.24,d*.24));
  const x=w*.5-r,y=h*.5-r,shape=new THREE.Shape();
  shape.moveTo(-x,-y);shape.lineTo(x,-y);shape.lineTo(x,y);shape.lineTo(-x,y);shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:1,steps:1,curveSegments:1});
  geo.translate(0,0,-d*.5+r);return geo;
}

export function facetedRings(rings,segments=7) {
  const positions=[],indices=[];
  for(const [y,rx,rz=rx,cx=0,cz=0] of rings) for(let i=0;i<segments;i++){
    const a=i/segments*Math.PI*2;positions.push(cx+Math.cos(a)*rx,y,cz+Math.sin(a)*rz);
  }
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){
    const a=j*segments+i,b=j*segments+(i+1)%segments;indices.push(a,a+segments,b,b,a+segments,b+segments);
  }
  const bottom=positions.length/3;positions.push(rings[0][3]??0,rings[0][0],rings[0][4]??0);
  const top=positions.length/3,last=rings.at(-1);positions.push(last[3]??0,last[0],last[4]??0);
  for(let i=0;i<segments;i++){indices.push(bottom,i,(i+1)%segments);const a=(rings.length-1)*segments+i,b=(rings.length-1)*segments+(i+1)%segments;indices.push(top,b,a);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}

export function makeMeshKit() {
  const group=new THREE.Group(),materials=new Map();
  const material=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:1,metalness:0,flatShading:true}));return materials.get(color);};
  function mesh(name,geometry,color,pos=[0,0,0],rotation=[0,0,0],scale=[1,1,1],parent=group){
    const node=new THREE.Mesh(geometry,material(color));node.name=name;node.position.set(...pos);node.rotation.set(rotation[0]??0,rotation[1]??0,rotation[2]??0);node.scale.set(...scale);node.castShadow=true;node.receiveShadow=true;parent.add(node);return node;
  }
  function box(name,size,color,pos,rotation=[0,0,0],bevel){return mesh(name,bevelBox(...size,bevel),color,pos,rotation);}
  function beam(name,from,to,width,depth,color){const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to);const node=mesh(name,bevelBox(width,a.distanceTo(b),depth),color,a.clone().add(b).multiplyScalar(.5).toArray());node.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());return node;}
  function bolt(name,pos,r=.045,color=FRONTIER_COLORS.steel){return mesh(name,new THREE.CylinderGeometry(r,r,.025,6),color,pos,[Math.PI/2,0,0]);}
  return {group,mesh,box,beam,bolt,material};
}

export function leafBlade(length=.6,width=.22,bend=.16) {
  const p=[0,0,0,-width,length*.48,bend,0,length,bend*.6,width,length*.48,bend,0,length*.45,bend+.055];
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex([0,4,1,1,4,2,2,4,3,3,4,0,0,1,2,0,2,3]);g.computeVertexNormals();return g;
}

// Chipped masonry retains a flat, exact-height walking top. Its uneven middle
// sections create deliberate broken rock facets while staying inside bounds.
export function chippedBox(w,h,d,seed=0){
  const p=[],idx=[],corners=[[-1,-.72],[-.72,-1],[.72,-1],[1,-.72],[1,.72],[.72,1],[-.72,1],[-1,.72]];
  for(let row=0;row<4;row++)for(let i=0;i<8;i++){
    const [x,z]=corners[i],a=Math.sin(i*3.7+row*1.9+seed*7),inset=row===0?.94:row===3?.83:1;
    const px=x*w*.5*inset+(row===1||row===2?a*.027*w:0),pz=z*d*.5*inset+(row===1||row===2?Math.cos(i*2.3+seed)*.027*d:0);
    p.push(Math.max(-w/2,Math.min(w/2,px)),[-h*.5,-h*.21,h*.27,h*.5][row],Math.max(-d/2,Math.min(d/2,pz)));
  }
  for(let row=0;row<3;row++)for(let i=0;i<8;i++){const a=row*8+i,b=row*8+(i+1)%8;idx.push(a,a+8,b,b,a+8,b+8);}
  p.push(0,-h/2,0,0,h/2,0);for(let i=0;i<8;i++)idx.push(32,i,(i+1)%8,33,24+(i+1)%8,24+i);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
