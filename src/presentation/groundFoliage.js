import * as THREE from 'three';

// Closed, folded lancet leaves. Broad shoulders and bent tips make the ground
// cover read as layered foliage instead of a field of upright triangle signs.
export function createGroundFoliageGeometry(palette, fern = false) {
  const vertices=[],colors=[];
  const base=new THREE.Color(palette.grass).multiplyScalar(.34);
  const side=new THREE.Color(palette.grass).multiplyScalar(.78);
  const upper=new THREE.Color(palette.grass).lerp(new THREE.Color('#c0d863'),.32);
  function tri(a,b,c,color) {for(const p of [a,b,c]){vertices.push(...p);colors.push(color.r,color.g,color.b);}}
  function leaf(x,z,h,yaw,length,width) {
    const c=Math.cos(yaw),s=Math.sin(yaw);
    const rings=[];
    for(const [t,w,high] of [[0,.03,0],[.32,.76,.68],[.66,1,1],[1,.015,.69]]) {
      const cx=x+c*length*t,cz=z+s*length*t,y=h*high;
      rings.push([[cx,y+.028*w,cz],[cx-s*width*w,y-.015,cz+c*width*w],[cx,y-.068*w,cz],[cx+s*width*w,y-.015,cz-c*width*w]]);
    }
    for(let row=0;row<3;row++)for(let face=0;face<4;face++) {
      const a=rings[row][face],b=rings[row][(face+1)%4],c=rings[row+1][face],d=rings[row+1][(face+1)%4];
      const color=face===0?side:face===3?upper:base;
      tri(a,c,b,color);tri(b,c,d,color);
    }
  }
  if(fern==='sedge') {
    for(let n=0;n<5;n++)leaf((n%2-.5)*.06,(n-2)*.055,.44+n*.065,n*1.85,.16+n*.02,.04);
  } else if(fern) {
    for(let row=0;row<3;row++)for(const sign of [-1,1])leaf(0,(row-1)*.16,.25+row*.055,sign>0?.45:Math.PI-.45,.38-row*.04,.09);
    leaf(0,.2,.46,Math.PI/2,.24,.075);
  } else {
    leaf(-.05,0,.34,-.4,.50,.18);leaf(.08,.04,.29,1.65,.51,.18);
    leaf(0,-.06,.47,3.45,.40,.16);leaf(.07,-.05,.27,4.6,.49,.17);
    leaf(-.04,.09,.25,2.5,.58,.16);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  return geometry;
}
