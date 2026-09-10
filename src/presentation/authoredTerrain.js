import * as THREE from 'three';
import {getSurfaceHeight,getPathDistance,getWaterRadius,smoothstep} from '../world/terrainSurfaceModel.js';

const DEFAULTS={grass:'#60b97c',grassShade:'#3b936c',path:'#e8bd78',pathEdge:'#a5b569',rock:'#b78365',water:'#239bb3',waterFoam:'#b7f5e7',accent:'#f3cc72'};
const lerp=(a,b,t)=>a+(b-a)*t;
const textureCache=new Map();
function hash(x,z,seed=0){let n=Math.imul(x|0,374761393)^Math.imul(z|0,668265263)^(seed|0);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;}
function noise(x,z,seed){const ix=Math.floor(x),iz=Math.floor(z),u=smoothstep(0,1,x-ix),v=smoothstep(0,1,z-iz);return lerp(lerp(hash(ix,iz,seed),hash(ix+1,iz,seed),u),lerp(hash(ix,iz+1,seed),hash(ix+1,iz+1,seed),u),v);}

export function createAuthoredTerrain(region){
  const surface=region.surface,palette={...DEFAULTS,...surface.palette};
  const bounds=region.bounds, width=bounds.maxX-bounds.minX,depth=bounds.maxZ-bounds.minZ;
  const nx=Math.ceil(width/.7),nz=Math.ceil(depth/.7),dx=width/nx,dz=depth/nz;
  const positions=new Float32Array((nx+1)*(nz+1)*3),colors=new Float32Array(positions.length),indices=[];
  const grass=new THREE.Color(palette.grass),shade=new THREE.Color(palette.grassShade),path=new THREE.Color(palette.path),edge=new THREE.Color(palette.pathEdge),shore=new THREE.Color('#e7cf9a'),rock=new THREE.Color(palette.rock);
  const color=new THREE.Color();
  function paintColor(x,z){
    const n=noise(x*.38,z*.38,surface.seed??7),fine=noise(x*1.8,z*1.8,93);
    color.copy(shade).lerp(grass,.48+n*.42+fine*.1);
    const slope=Math.hypot(getSurfaceHeight(surface,x+.3,z)-getSurfaceHeight(surface,x-.3,z),getSurfaceHeight(surface,x,z+.3)-getSurfaceHeight(surface,x,z-.3))/.6;
    if(slope>.22){const height=getSurfaceHeight(surface,x,z),stratum=.91+.09*Math.sin(height*15);color.lerp(rock,smoothstep(.22,.58,slope)).multiplyScalar(stratum);}
    // Paths are painted at higher resolution below, so close-up curves stay crisp.
    const wet=getWaterRadius(surface,x,z);
    if(wet<1.13)color.lerp(shore,1-smoothstep(.9,1.13,wet));
    return color.multiplyScalar(.97+fine*.06);
  }
  for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){
    const x=bounds.minX+ix*dx,z=bounds.minZ+iz*dz,i=(iz*(nx+1)+ix)*3;
    positions[i]=x;positions[i+1]=getSurfaceHeight(surface,x,z)-.018;positions[i+2]=z;
    colors[i]=colors[i+1]=colors[i+2]=1;
    if(ix<nx&&iz<nz){const a=iz*(nx+1)+ix,b=a+1,c=a+nx+1,d=c+1;indices.push(a,c,b,b,c,d);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const uvs=new Float32Array((nx+1)*(nz+1)*2);for(let z=0;z<=nz;z++)for(let x=0;x<=nx;x++){const i=(z*(nx+1)+x)*2;uvs[i]=x/nx;uvs[i+1]=z/nz;}geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));
  const key=JSON.stringify({surface,bounds});let texture=textureCache.get(key);
  if(!texture){
    const resolution=512,pixels=new Uint8Array(resolution*resolution*4);
    for(let z=0;z<resolution;z++)for(let x=0;x<resolution;x++){
      const c=paintColor(bounds.minX+(x+.5)/resolution*width,bounds.minZ+(z+.5)/resolution*depth).convertLinearToSRGB(),i=(z*resolution+x)*4;
      pixels[i]=Math.round(c.r*255);pixels[i+1]=Math.round(c.g*255);pixels[i+2]=Math.round(c.b*255);pixels[i+3]=255;
    }
    if(typeof document!=='undefined'){
      const low=document.createElement('canvas');low.width=low.height=resolution;low.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels),resolution,resolution),0,0);
      const canvas=document.createElement('canvas');canvas.width=canvas.height=2048;const ctx=canvas.getContext('2d');ctx.drawImage(low,0,0,2048,2048);
      ctx.save();ctx.scale(2048/width,2048/depth);ctx.translate(-bounds.minX,-bounds.minZ);ctx.lineCap='round';ctx.lineJoin='round';
      for(const outer of [true,false])for(const route of surface.routes??[]){ctx.strokeStyle=outer?palette.pathEdge:palette.path;ctx.lineWidth=route.width+(outer?.2:0);ctx.beginPath();route.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.z):ctx.moveTo(p.x,p.z));ctx.stroke();}
      ctx.globalAlpha=.12;ctx.fillStyle='#fff4c7';for(let i=0;i<5000;i++){const x=lerp(bounds.minX,bounds.maxX,hash(i,3,17)),z=lerp(bounds.minZ,bounds.maxZ,hash(i,9,17));if(getPathDistance(surface,x,z)<-.12){ctx.beginPath();ctx.ellipse(x,z,.016+hash(i,21)*.025,.012,0,0,Math.PI*2);ctx.fill();}}ctx.restore();
      texture=new THREE.CanvasTexture(canvas);
    }else texture=new THREE.DataTexture(pixels,resolution,resolution,THREE.RGBAFormat);
    texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;textureCache.set(key,texture);
  }
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:texture,roughness:1,metalness:0}));mesh.name=`terrain_${region.id}`;mesh.receiveShadow=true;mesh.userData.isGround=true;
  const group=new THREE.Group();group.name=`landscape_${region.id}`;group.userData.sectionId=region.id;group.add(mesh);
  // Separate vertical perimeter makes the landscape read as a substantial island.
  const sides=new THREE.Mesh(new THREE.BoxGeometry(width,2.2,depth),new THREE.MeshStandardMaterial({color:palette.rock,roughness:1}));sides.position.set((bounds.minX+bounds.maxX)/2,-1.13,(bounds.minZ+bounds.maxZ)/2);sides.receiveShadow=true;group.add(sides);
  for(const pond of surface.water??[])addWater(group,pond,palette);
  addMeadow(group,surface,bounds,palette);
  return {group,vertices:positions,indices:new Uint32Array(indices),sectionId:region.id};
}

function addWater(group,pond,palette){
  const segments=64,verts=[pond.x,-.12,pond.z],colors=[],indices=[];
  for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;verts.push(pond.x+Math.cos(a)*pond.rx*.87,-.12,pond.z+Math.sin(a)*pond.rz*.87);if(i>0)indices.push(0,i+1,i);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();
  const water=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:palette.water,roughness:.25,metalness:.12,transparent:true,opacity:.9}));water.name='shallow_water';water.renderOrder=1;group.add(water);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.84,.87,64),new THREE.MeshBasicMaterial({color:palette.waterFoam,transparent:true,opacity:.72,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.scale.set(pond.rx,pond.rz,1);ring.position.set(pond.x,-.108,pond.z);group.add(ring);
  // Broken surface glints communicate water without a second frame loop.
  const glints=new THREE.Group();glints.name='water_glints';
  for(let i=0;i<9;i++){const x=(hash(i,4,7)-.5)*pond.rx*1.3,z=(hash(i,9,2)-.5)*pond.rz*1.3;const m=new THREE.Mesh(new THREE.PlaneGeometry(.35+hash(i,2)*.65,.025),new THREE.MeshBasicMaterial({color:palette.waterFoam,transparent:true,opacity:.45,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(pond.x+x,-.106,pond.z+z);glints.add(m);}group.add(glints);
}

function addMeadow(group,surface,bounds,palette){
  const area=(bounds.maxX-bounds.minX)*(bounds.maxZ-bounds.minZ),count=Math.min(1600,Math.round(area*.6*(surface.detail?.grassDensity??.65)));
  const verts=[],cols=[],base=new THREE.Color(palette.grass).multiplyScalar(.72),tip=new THREE.Color(palette.grass).lerp(new THREE.Color('#b6e39c'),.12);
  // Folded leaves bend out from a shared root, with two tones along their ridge.
  for(let b=0;b<4;b++){
    const a=b*2.4,c=Math.cos(a),s=Math.sin(a),h=.21+b*.035,w=.08;
    const root=[0,0,0],left=[c*.045-s*w,h*.63,s*.045+c*w],ridge=[c*.04,h*.73,s*.04],right=[c*.045+s*w,h*.63,s*.045-c*w],end=[c*.23,h*.7,s*.23];
    for(const tri of [[root,left,ridge],[root,ridge,right],[left,end,ridge],[ridge,end,right]])for(const p of tri){verts.push(...p);const v=p===root?base:p===ridge?tip:tip.clone().multiplyScalar(.89);cols.push(v.r,v.g,v.b);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));geo.computeVertexNormals();
  const mat=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide});
  const grass=new THREE.InstancedMesh(geo,mat,count);grass.name='meadow_grass';const dummy=new THREE.Object3D();let n=0;
  for(let i=0;i<count*5&&n<count;i++){
    const x=lerp(bounds.minX+.8,bounds.maxX-.8,hash(i,17,surface.seed)),z=lerp(bounds.minZ+.8,bounds.maxZ-.8,hash(i,63,surface.seed));
    if(getPathDistance(surface,x,z)<.3||getWaterRadius(surface,x,z)<1.1||noise(x*.4,z*.4,61)<.38)continue;
    const scale=.7+hash(i,82)*1.1;dummy.position.set(x,getSurfaceHeight(surface,x,z),z);dummy.rotation.y=hash(i,3)*Math.PI*2;dummy.scale.setScalar(scale);dummy.updateMatrix();grass.setMatrixAt(n++,dummy.matrix);
  }
  grass.count=n;grass.instanceMatrix.needsUpdate=true;grass.receiveShadow=true;group.add(grass);
}
