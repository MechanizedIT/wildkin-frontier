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

function roundedBox([x,y,z],[cx,cy,cz],[hx,hy,hz],round){
  const q=[Math.abs(x-cx)-hx+round,Math.abs(y-cy)-hy+round,Math.abs(z-cz)-hz+round],
    outside=Math.hypot(Math.max(q[0],0),Math.max(q[1],0),Math.max(q[2],0));
  return outside+Math.min(Math.max(q[0],q[1],q[2]),0)-round;
}
function ellipsoid([x,y,z],[cx,cy,cz],[rx,ry,rz]){
  const k0=Math.hypot((x-cx)/rx,(y-cy)/ry,(z-cz)/rz),
    k1=Math.hypot((x-cx)/(rx*rx),(y-cy)/(ry*ry),(z-cz)/(rz*rz));
  return k0*(k0-1)/Math.max(k1,1e-6);
}
function segmentDistance(p,a,b){
  const ab=b.map((v,i)=>v-a[i]),ap=p.map((v,i)=>v-a[i]),t=Math.max(0,Math.min(1,ap.reduce((sum,v,i)=>sum+v*ab[i],0)/ab.reduce((sum,v)=>sum+v*v,0)));
  return Math.hypot(...p.map((v,i)=>v-(a[i]+ab[i]*t)));
}
export function dirtBankDensity(point){
  const bank=roundedBox(point,[0,1.45,.45],[2.55,1.45,1.65],.5),
    shelf=ellipsoid(point,[.35,4.35,-1.65],[2.0,1.25,1.5]),
    root=segmentDistance(point,[.15,2.55,-.35],[.35,3.68,-.95])-.76,
    ridge=.075*Math.sin(point[0]*1.8+point[2]*.9)*Math.cos(point[1]*1.4-point[2]*.7);
  return Math.min(bank,shelf,root)+ridge;
}
export function makeDirtBankSamples(){
  const spacing=ROCK_SPACING,min=[-3,0,-3],max=[3,6,3],size=max.map((v,i)=>Math.round((v-min[i])/spacing)+1),
    length=size.reduce((a,b)=>a*b,1),densities=new Float32Array(length),materials=new Uint8Array(length);
  const position=i=>{const x=i%size[0],y=Math.floor(i/size[0])%size[1],z=Math.floor(i/(size[0]*size[1]));return [min[0]+x*spacing,min[1]+y*spacing,min[2]+z*spacing];};
  const sample={spacing,min,max,size,densities,materials,position,
    readDensity([x,y,z]){const nx=size[0],ny=size[1];if(x<0||y<0||z<0||x>=nx||y>=ny||z>=size[2])return 1;
      return densities[x+nx*(y+ny*z)];},
  };
  for(let i=0;i<length;i++){const d=dirtBankDensity(position(i));densities[i]=d;materials[i]=d<0?2:0;}
  return sample;
}

// Phase 0.5C bounded mixed fixture: one authored stone mass nested into a
// single dirt volume. Samples are mutually exclusive: stone replaces the
// dirt sample where the rock surface occupies it, so ownership never overlaps.
export function makeMixedMatterSamples(){
  const sample=makeDirtBankSamples();
  for(let i=0;i<sample.densities.length;i++){
    const point=sample.position(i),base=roundedBox(point,[0,1.25,0],[2.45,1.25,2.2],.45),pillar=roundedBox(point,[0,3.4,0],[.7,1.1,.7],.18),soil=Math.min(base,pillar);
    sample.densities[i]=soil;sample.materials[i]=soil<0?2:0;
  }
  for(let i=0;i<sample.densities.length;i++){
    const point=sample.position(i),rock=ellipsoid(point,[0,4.8,0],[1.6,.9,1.4]);
    if(rock<0){sample.densities[i]=rock;sample.materials[i]=1;}
  }
  sample.fixture='mixed-dirt-supported-rock';
  return sample;
}
