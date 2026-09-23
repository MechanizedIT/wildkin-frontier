import { ROCK_SPACING } from './fracture-field.js';

function cylinder(x,y,z,r,lo,hi){
  const radial=Math.hypot(x,z)-r, vertical=Math.abs(y-(lo+hi)/2)-(hi-lo)/2;
  return Math.hypot(Math.max(radial,0),Math.max(vertical,0))+Math.min(Math.max(radial,vertical),0);
}
export function supportedRockDensity([x,y,z]){
  const head=Math.hypot(x/.98,(y-4)/1.02,z/1.04)-1.95+.1*Math.sin(2.1*x+1.3*z)*Math.cos(1.7*y-.6*z);
  const neck=cylinder(x,y,z,.55,0,2.85);
  const foot=cylinder(x,y,z,1.05,0,.55);
  return Math.min(head,neck,foot);
}
export function makeSupportedRockSamples(){
  const spacing=ROCK_SPACING,min=[-3,0,-3],max=[3,6,3],size=max.map((v,i)=>Math.round((v-min[i])/spacing)+1);
  const length=size.reduce((a,b)=>a*b,1),densities=new Float32Array(length),materials=new Uint8Array(length);
  const position=i=>{const x=i%size[0],y=Math.floor(i/size[0])%size[1],z=Math.floor(i/(size[0]*size[1]));return [min[0]+x*spacing,min[1]+y*spacing,min[2]+z*spacing];};
  const sample={spacing,min,max,size,densities,materials,position,
    readDensity([x,y,z]){const nx=size[0],ny=size[1];if(x<0||y<0||z<0||x>=nx||y>=ny||z>=size[2])return 1;
      return densities[x+nx*(y+ny*z)];},
  };
  for(let i=0;i<length;i++){const d=supportedRockDensity(position(i));densities[i]=d;materials[i]=d<0?1:0;}
  return sample;
}
