import FastNoiseLite from './vendor/fastnoise-lite.js';
import { index3, key } from './coordinates.js';
import { LAB } from './config.js';
export function createGenerator(seed = LAB.seed) {
  const density = new FastNoiseLite(seed), cave = new FastNoiseLite(seed ^ 0x517cc1b7);
  density.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2);
  density.SetFrequency(0.035); cave.SetFrequency(0.075);
  return (x, y, z) => {
    // Bounded, recognizable test court; all space beyond it is a 3D noise field.
    if (x >= -12 && x <= 12 && z >= -12 && z <= 14 && y >= -5 && y <= 10) {
      if (y <= 0) return y === 0 && x < -5 ? 2 : 1;
      if (y === 4 && x >= -2 && x <= 5 && z >= -4 && z <= -2) return 3;
      if (x === -2 && z === -3 && y >= 1 && y <= 3) return 3;
      if (y === 1 && z === 5 && x === 0) return 1;
      if (y === 1 && z === 5 && x === 2) return 2;
      return 0;
    }
    const solid = density.GetNoise(x, y * 0.8, z) - 0.18 * Math.sin(y / 45) > 0.06;
    const hollow = Math.abs(cave.GetNoise(x, y, z)) < 0.09;
    return solid && !hollow ? (Math.floor(y / 5) % 3 === 0 ? 2 : 1) : 0;
  };
}
export function generatePadded(size, chunk, seed, edits = {}) {
  const read = createGenerator(seed), n = size + 2, voxels = new Uint8Array(n ** 3);
  for (let z = -1; z <= size; z++) for (let y = -1; y <= size; y++) for (let x = -1; x <= size; x++) {
    const gx = chunk[0] * size + x, gy = chunk[1] * size + y, gz = chunk[2] * size + z;
    voxels[index3(x + 1, y + 1, z + 1, n)] = edits[key(gx, gy, gz)] ?? read(gx, gy, gz);
  }
  return voxels;
}
export function hashBytes(bytes) {
  let h = 2166136261;
  for (const value of bytes) h = Math.imul(h ^ value, 16777619);
  return (h >>> 0).toString(16).padStart(8, '0');
}
// Continuous signed field: negative matter, positive air. World-space metres
// are independent of sample resolution, so .5/.25 compare the same landform.
export function createDensityGenerator(seed = LAB.seed) {
  const density=new FastNoiseLite(seed),cave=new FastNoiseLite(seed^0x517cc1b7);density.SetFrequency(0.035);cave.SetFrequency(0.075);
  const box=(x,y,z,cx,cy,cz,hx,hy,hz)=>{
    const a=Math.abs(x-cx)-hx,b=Math.abs(y-cy)-hy,c=Math.abs(z-cz)-hz;
    return Math.hypot(Math.max(a,0),Math.max(b,0),Math.max(c,0))+Math.min(Math.max(a,b,c),0);
  };
  return (x,y,z)=>{
    let value,material;
    if(x>=-12&&x<=13&&z>=-12&&z<=15&&y>=-5&&y<=10){
      const floor=y-1,stone=Math.hypot(x-0.5,y-1.5,z-5.5)-0.65,clay=Math.hypot(x-2.5,y-1.5,z-5.5)-0.65;
      const wood=Math.min(box(x,y,z,2,4.5,-2.5,4,0.5,1.5),box(x,y,z,-1.5,2.5,-2.5,0.5,1.5,0.5));
      value=Math.min(floor,stone,clay,wood);material=wood<=value&&y>1?3:clay<=value?2:floor<=value&&x<-5?2:1;
    }else{
      value=Math.max(-(density.GetNoise(x,y*0.8,z)-0.18*Math.sin(y/45)-0.06)*12,(0.09-Math.abs(cave.GetNoise(x,y,z)))*12);
      material=Math.floor(y/5)%3===0?2:1;
    }
    if(Math.abs(value)<1e-6)value=-1e-6;
    return {density:value,material:value<0?material:0};
  };
}
export function generateSmoothPadded(size,chunk,seed,spacing,edits={},densityEdits={}){
  const base=createDensityGenerator(seed),n=size+2,densities=new Float32Array(n**3),materials=new Uint8Array(n**3);
  for(let z=-1;z<=size;z++)for(let y=-1;y<=size;y++)for(let x=-1;x<=size;x++){
    const p=[chunk[0]*size+x,chunk[1]*size+y,chunk[2]*size+z],k=key(...p),sample=base(...p.map(v=>v*spacing)),i=index3(x+1,y+1,z+1,n);
    const value=densityEdits[k]??sample.density;densities[i]=value;materials[i]=value<0?(edits[k]??sample.material):0;
  }
  return {densities,materials};
}
