import {getRouteDistance,smoothstep} from '../world/terrainSurfaceModel.js';

// Baked into the existing terrain texture once; never a floating decal or a
// separate physical surface. Ordinary routes keep their original paint path.
export const GRAVEL_PAINT = Object.freeze({base:[151,148,130],edgeFeather:.6,edgeWander:.7,pixelsPerMetre:26,maxCanvasSide:768});
export function getGravelCanvasSize(width,depth){const scale=Math.min(GRAVEL_PAINT.pixelsPerMetre,GRAVEL_PAINT.maxCanvasSide/Math.max(width,depth));return{width:Math.min(GRAVEL_PAINT.maxCanvasSide,Math.max(1,Math.ceil(width*scale))),height:Math.min(GRAVEL_PAINT.maxCanvasSide,Math.max(1,Math.ceil(depth*scale)))};}
function hash(x,z){let n=Math.imul(x|0,374761393)^Math.imul(z|0,668265263)^731;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;}
function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z),u=smoothstep(0,1,x-ix),v=smoothstep(0,1,z-iz);const a=hash(ix,iz),b=hash(ix+1,iz),c=hash(ix,iz+1),d=hash(ix+1,iz+1);return(a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;}
export function getGravelCoverage(route,x,z){
 const drift=(noise(x*.72,z*.72)-.5)*GRAVEL_PAINT.edgeWander*2;
 // Wear bites inward from the shoulder, rather than punching round holes in
 // the middle of the path. Connected terrain remains visible at the edges.
 const bite=smoothstep(.4,.8,noise(x*.75+7.1,z*.75-3.7))*Math.min(1.1,route.width*.4);
 const rawDistance=getRouteDistance(route,x,z);
 const distance=Math.min(rawDistance+drift+bite,rawDistance<-.7?-.3:Infinity);
 return 1-smoothstep(-.16,GRAVEL_PAINT.edgeFeather,distance);
}
export function paintGravelRoute(ctx,route){
 const pad=route.width/2+1,minX=Math.min(...route.points.map(p=>p.x))-pad,minZ=Math.min(...route.points.map(p=>p.z))-pad;
 const width=Math.max(...route.points.map(p=>p.x))+pad-minX,depth=Math.max(...route.points.map(p=>p.z))+pad-minZ;
 const canvas=document.createElement('canvas'),size=getGravelCanvasSize(width,depth);canvas.width=size.width;canvas.height=size.height;
 const local=canvas.getContext('2d'),image=local.createImageData(canvas.width,canvas.height),pixels=image.data;
 for(let iz=0;iz<canvas.height;iz++)for(let ix=0;ix<canvas.width;ix++){
  const x=minX+(ix+.5)/canvas.width*width,z=minZ+(iz+.5)/canvas.height*depth,coverage=getGravelCoverage(route,x,z);if(coverage<=0)continue;
  const coarse=noise(x*.68,z*.68),grain=hash(Math.floor(x*24),Math.floor(z*24)),pebble=noise(x*8,z*8);
  const light=.91+coarse*.15+(grain-.5)*.09+(pebble>.69?.11:pebble<.24?-.09:0),i=(iz*canvas.width+ix)*4;
  const growth=(1-smoothstep(.22,.78,coverage))*.8,green=[103,126,72];
  for(let c=0;c<3;c++)pixels[i+c]=Math.round((GRAVEL_PAINT.base[c]*(1-growth)+green[c]*growth)*light);
  pixels[i+3]=Math.round(coverage*(.93+coarse*.07)*255);
 }
 local.putImageData(image,0,0);ctx.drawImage(canvas,minX,minZ,width,depth);
}
