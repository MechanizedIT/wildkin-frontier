import * as THREE from 'three';
import {getSurfaceHeight,getPathDistance,getWaterRadius,smoothstep} from '../world/terrainSurfaceModel.js';
import {addMeadowDetails,createGroundcoverGeometry} from './meadowDetails.js';
import {createGroundFoliageGeometry} from './groundFoliage.js';
import {addGeneratedTerrainPaint} from './terrainPaint.js';

const DEFAULTS={grass:'#60b97c',grassShade:'#3b936c',path:'#e8bd78',pathEdge:'#a5b569',rock:'#b78365',water:'#239bb3',waterFoam:'#b7f5e7',accent:'#f3cc72'};
const MEADOW_PROFILES={camp:{density:.75},section_1:{density:.49},section_2:{density:.28,sedge:true},section_3:{density:.4},section_4:{density:.45},section_5:{density:.55,foliage:'#199ab5'}};
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
      ctx.restore();
      texture=new THREE.CanvasTexture(canvas);
      addGeneratedTerrainPaint(texture,canvas,bounds);
    }else texture=new THREE.DataTexture(pixels,resolution,resolution,THREE.RGBAFormat);
    texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;textureCache.set(key,texture);
  }
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:texture,roughness:1,metalness:0}));mesh.name=`terrain_${region.id}`;mesh.receiveShadow=true;mesh.userData.isGround=true;
  const group=new THREE.Group();group.name=`landscape_${region.id}`;group.userData.sectionId=region.id;group.add(mesh);
  // The shared natural escarpment continues beyond this authored ground edge;
  // no exposed rectangular island side is rendered here.
  for(const pond of surface.water??[])addWater(group,pond,palette);
  addMeadow(group,surface,bounds,palette,MEADOW_PROFILES[region.id]);
  addMeadowDetails(group,surface,bounds,palette);
  return {group,vertices:positions,indices:new Uint32Array(indices),sectionId:region.id};
}

function addWater(group,pond,palette){
  const segments=64,verts=[pond.x,-.12,pond.z],colors=[],indices=[];
  for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;verts.push(pond.x+Math.cos(a)*pond.rx*.87,-.12,pond.z+Math.sin(a)*pond.rz*.87);if(i>0)indices.push(0,i+1,i);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();
  const water=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:palette.water}));water.name='shallow_water';water.renderOrder=1;group.add(water);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.84,.87,64),new THREE.MeshBasicMaterial({color:palette.waterFoam,transparent:true,opacity:.72,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.scale.set(pond.rx,pond.rz,1);ring.position.set(pond.x,-.108,pond.z);group.add(ring);
  // Flat color and shoreline communicate water with no reflective glints.
}

function addMeadow(group,surface,bounds,palette,profile={}){
  const segments=[];
  for(const route of surface.routes??[])for(let i=1;i<route.points.length;i++){
    const a=route.points[i-1],b=route.points[i],length=Math.hypot(b.x-a.x,b.z-a.z);
    if(length>.01)segments.push({a,b,length,width:route.width});
  }
  const routeLength=segments.reduce((sum,s)=>sum+s.length,0);
  const area=(bounds.maxX-bounds.minX)*(bounds.maxZ-bounds.minZ),count=Math.min(1100,Math.round((routeLength*14+area*.045)*(surface.detail?.grassDensity??.65)*(profile.density??1)));
  const foliagePalette=profile.foliage?{...palette,grass:profile.foliage}:palette;
  const mat=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});
  for(let variant=0;variant<2;variant++){
    const cover=surface.detail?.groundcover;
    const geometry=cover&&cover!=='cushion'?createGroundcoverGeometry(cover,variant):createGroundFoliageGeometry(foliagePalette,profile.sedge?'sedge':variant===1);
    const budget=Math.ceil(count/2),grass=new THREE.InstancedMesh(geometry,mat,budget);
    grass.name=variant?'meadow_ferns':'meadow_grass';const dummy=new THREE.Object3D();let n=0;
    for(let i=variant;i<count*10&&n<budget;i+=2){
      let x=lerp(bounds.minX+.8,bounds.maxX-.8,hash(i,17,surface.seed)),z=lerp(bounds.minZ+.8,bounds.maxZ-.8,hash(i,63,surface.seed));
      if(segments.length&&i%5!==0){
        const segment=segments[Math.floor(hash(i,211,surface.seed)*segments.length)];
        const t=hash(i,23,surface.seed),side=hash(i,75)>.5?1:-1,offset=side*(segment.width/2+.38+hash(i,51)*2.3);
        x=lerp(segment.a.x,segment.b.x,t)-(segment.b.z-segment.a.z)/segment.length*offset;
        z=lerp(segment.a.z,segment.b.z,t)+(segment.b.x-segment.a.x)/segment.length*offset;
      }
      const routeDistance=getPathDistance(surface,x,z);
      if(x<bounds.minX+.4||x>bounds.maxX-.4||z<bounds.minZ+.4||z>bounds.maxZ-.4||routeDistance<.3||getWaterRadius(surface,x,z)<1.13||noise(x*.4,z*.4,61)<.38)continue;
      if(routeDistance>3.2&&hash(i,129)>.28)continue;
      const scale=.46+hash(i,82)*.5;dummy.position.set(x,getSurfaceHeight(surface,x,z),z);dummy.rotation.y=hash(i,3)*Math.PI*2;dummy.scale.setScalar(scale);dummy.updateMatrix();grass.setMatrixAt(n++,dummy.matrix);
    }
    grass.count=n;grass.instanceMatrix.needsUpdate=true;group.add(grass);
  }
}
