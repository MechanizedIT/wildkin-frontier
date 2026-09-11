import * as THREE from 'three';
import { getSurfaceHeight } from '../world/terrainSurfaceModel.js';

// One continuous escarpment, rather than repeated scenery props. Its render and
// Rapier triangles share these buffers; bounds remain the hidden final failsafe.
export const NATURAL_BOUNDARY_CONFIG = Object.freeze({ skirt: 32, stationSpacing: 6, minInset: 1.8, maxInset: 3.8 });
const fract = n => n - Math.floor(n);
const noise = (i, seed) => fract(Math.sin(i * 127.1 + seed * 17.7) * 43758.5453);

export function describeNaturalBoundary(region) {
  const b = region.bounds, s = region.surface, seed = s.seed ?? 7;
  const anchors=[...(region.portalGates??[]),...(region.majorWaypoints??[]),...(region.extractionBeacons??[]),...(region.entryPoints??[])].flatMap(anchor=>[anchor.pos,anchor.runSpawn?.position]).filter(Boolean);
  const corners = [[b.minX,b.minZ],[b.maxX,b.minZ],[b.maxX,b.maxZ],[b.minX,b.maxZ]];
  const stations = [];
  for (let side = 0; side < 4; side++) {
    const a = corners[side], c = corners[(side + 1) % 4];
    const count = Math.ceil(Math.hypot(c[0]-a[0],c[1]-a[1]) / NATURAL_BOUNDARY_CONFIG.stationSpacing);
    for (let i = 0; i < count; i++) {
      const t = i/count, index = stations.length;
      // At corners both coordinates move: every strip joins exactly, with no
      // disconnected corner patches or hidden collision gaps.
      const x = a[0]+(c[0]-a[0])*t, z = a[1]+(c[1]-a[1])*t;
      const nx = side===1?1:side===3?-1:i===0?(side===0?-1:1):0;
      const nz = side===0?-1:side===2?1:i===0?(side===1?-1:1):0;
      let inset = NATURAL_BOUNDARY_CONFIG.minInset + noise(index, seed)*(NATURAL_BOUNDARY_CONFIG.maxInset-NATURAL_BOUNDARY_CONFIG.minInset);
      for(const anchor of anchors){
        const along=side%2?Math.abs(anchor.z-z):Math.abs(anchor.x-x);
        const margin=side===0?anchor.z-b.minZ:side===1?b.maxX-anchor.x:side===2?b.maxZ-anchor.z:anchor.x-b.minX;
        // Include neighboring stations so interpolation cannot pinch the
        // three-metre arrival reserve between vertices.
        if(along<12)inset=Math.min(inset,Math.max(.4,margin-3.2));
      }
      const ix=x-nx*inset, iz=z-nz*inset;
      const support=getSurfaceHeight(s,ix,iz);
      const height=7.4+noise(index+141,seed)*4.8;
      stations.push({ x,z,nx,nz,inset,support,height });
    }
  }
  const vertices=[], indices=[];
  for(const p of stations) {
    const {x,z,nx,nz,inset,support,height}=p;
    // Near-vertical inner face is plainly unwalkable. Broad broken shoulders
    // recede into landscape, giving an alien geological mass, not a fence.
    const rings=[[-inset,support-1],[-inset+.15,support+1.8+noise(x+z,seed)*1.1],
      [.6+noise(x-z,seed)*1.5,support+2.3+noise(x+z,seed)*1.1],
      [4+noise(x+z,seed)*3,support+height*.63],
      [9+noise(x-z,seed)*4,support+height],[20+noise(x+z,seed)*3,height*.3],
      [NATURAL_BOUNDARY_CONFIG.skirt,0]];
    for(const [offset,y] of rings)vertices.push(x+nx*offset,y,z+nz*offset);
  }
  const rings=7;
  for(let i=0;i<stations.length;i++)for(let ring=0;ring<rings-1;ring++){
    const a=i*rings+ring,b=((i+1)%stations.length)*rings+ring;
    indices.push(a,b,a+1,b,b+1,a+1);
  }
  return { vertices:new Float32Array(vertices), indices:new Uint32Array(indices), stations, rings, sectionId:region.id };
}

export function createNaturalBoundary(region) {
  const data=describeNaturalBoundary(region), palette=region.surface.palette??{};
  const rock=new THREE.Color(palette.rock??'#788b74'), shade=new THREE.Color(palette.grassShade??'#3b936c');
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(data.vertices,3));geometry.setIndex(new THREE.BufferAttribute(data.indices,1));
  // Face colors make large strata readable without textures, glowing resources,
  // tiny repeated stones, extra draw calls or per-frame work.
  const flat=geometry.toNonIndexed();geometry.dispose();
  const colors=new Float32Array(flat.attributes.position.count*3),color=new THREE.Color();
  for(let triangle=0;triangle<flat.attributes.position.count/3;triangle++){
    const band=Math.floor(triangle/2)%6, sector=Math.floor(triangle/12);
    color.copy(rock).lerp(shade,band===1?.65:band===4?.55:band===5?.8:.12)
      .multiplyScalar(.84+noise(sector,region.surface.seed??7)*.24);
    for(let v=0;v<3;v++)color.toArray(colors,(triangle*3+v)*3);
  }
  flat.setAttribute('color',new THREE.BufferAttribute(colors,3));flat.computeVertexNormals();
  const group=new THREE.Group();group.name=`natural_escarpment_${region.id}`;
  group.userData.sectionId=region.id;group.userData.regionId=region.id;
  // Orbit cameras can enter a scenic shoulder. Double-sided faces keep the
  // existing occlusion ray honest from either side of this thin terrain shell.
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,flatShading:true,side:THREE.DoubleSide});
  // Eight bounded render stretches let the existing player visibility assist
  // fade only foreground rock. Collision remains a single watertight ring.
  const verticesPerStation=(data.rings-1)*6,stationsPerMesh=Math.ceil(data.stations.length/8);
  for(let station=0;station<data.stations.length;station+=stationsPerMesh){
    const start=station*verticesPerStation,end=Math.min(data.stations.length,station+stationsPerMesh)*verticesPerStation;
    const piece=new THREE.BufferGeometry();
    for(const attribute of ['position','normal','color'])piece.setAttribute(attribute,new THREE.BufferAttribute(flat.attributes[attribute].array.slice(start*3,end*3),3));
    const mesh=new THREE.Mesh(piece,material);mesh.name=`${group.name}_${station}`;mesh.receiveShadow=true;
    mesh.userData.sectionId=region.id;mesh.userData.regionId=region.id;mesh.userData.naturalBoundary=true;
    group.add(mesh);
  }
  flat.dispose();
  group.add(createScenicGroundSkirt(region));
  return { ...data, group };
}

function createScenicGroundSkirt(region) {
  // Ground continues underneath the rock too. A foreground cutaway must never
  // expose a void where the original rectangular terrain ended.
  const b=region.bounds,s=region.surface,corners=[[b.minX,b.minZ],[b.maxX,b.minZ],[b.maxX,b.maxZ],[b.minX,b.maxZ]];
  const positions=[],indices=[],colors=[],color=new THREE.Color(s.palette?.grass??'#60b97c');
  for(let side=0;side<4;side++){
    const a=corners[side],c=corners[(side+1)%4],count=Math.ceil(Math.hypot(c[0]-a[0],c[1]-a[1])/.7);
    for(let i=0;i<count;i++){
      const x=a[0]+(c[0]-a[0])*i/count,z=a[1]+(c[1]-a[1])*i/count;
      const nx=side===1?1:side===3?-1:i===0?(side===0?-1:1):0;
      const nz=side===0?-1:side===2?1:i===0?(side===1?-1:1):0;
      for(const offset of [0,8,NATURAL_BOUNDARY_CONFIG.skirt]){
        const px=x+nx*offset,pz=z+nz*offset;
        positions.push(px,getSurfaceHeight(s,px,pz)-.018,pz);color.toArray(colors,colors.length);
      }
    }
  }
  const count=positions.length/9;
  for(let i=0;i<count;i++)for(let ring=0;ring<2;ring++){
    const a=i*3+ring,b=((i+1)%count)*3+ring;indices.push(a,b,a+1,b,b+1,a+1);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0}));
  mesh.name=`scenic_ground_${region.id}`;mesh.userData.isGround=true;mesh.receiveShadow=true;return mesh;
}
