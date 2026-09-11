// Authored continuous terrain. This pure model is shared by authoring, rendering,
// physical collision and ground-height queries; no runtime-only transforms.
export function smoothstep(a,b,v) { const t=Math.max(0,Math.min(1,(v-a)/(b-a))); return t*t*(3-2*t); }
export function ellipseRadius(shape,x,z) { return Math.hypot((x-shape.x)/shape.rx,(z-shape.z)/shape.rz); }
export function getSurfaceHeight(surface,x,z) {
  if(!surface) return 0;
  let hill=0,depth=0;
  for(const h of surface.heights??[]) hill=Math.max(hill,h.height*(1-smoothstep(h.plateau??.4,1,ellipseRadius(h,x,z))));
  for(const w of surface.water??[]) depth=Math.max(depth,(w.depth??.35)*(1-smoothstep(.65,1,ellipseRadius(w,x,z))));
  let height=hill-depth;
  for(const route of surface.routes??[])if(Number.isFinite(route.elevation)){
    const blend=1-smoothstep(0,route.feather??1.5,getRouteDistance(route,x,z));
    height+=(route.elevation-height)*blend;
  }
  return height;
}
export function getRouteDistance(route,x,z){
  let distance=Infinity;
  for(let i=1;i<route.points.length;i++){
    const a=route.points[i-1],b=route.points[i],dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
    distance=Math.min(distance,Math.hypot(x-a.x-dx*t,z-a.z-dz*t)-route.width/2);
  }
  return distance;
}
export function getPathDistance(surface,x,z) {
  let distance=Infinity;
  for(const route of surface?.routes??[]) {
    for(let i=1;i<route.points.length;i++) {
      const a=route.points[i-1],b=route.points[i],dx=b.x-a.x,dz=b.z-a.z;
      const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
      distance=Math.min(distance,Math.hypot(x-a.x-dx*t,z-a.z-dz*t)-(route.width??4)/2);
    }
  }
  return distance;
}
export function getWaterRadius(surface,x,z) { let r=Infinity;for(const w of surface?.water??[])r=Math.min(r,ellipseRadius(w,x,z));return r; }
export function validateSurface(surface,label='surface') {
  if(!surface || typeof surface!=='object' || Array.isArray(surface))throw Error(`${label} must be an object`);
  const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
  if(surface.seed!==undefined&&!finite(surface.seed,0,2147483647))throw Error(`${label} invalid seed`);
  if(surface.detail?.grassDensity!==undefined&&!finite(surface.detail.grassDensity,0,2))throw Error(`${label} invalid grass density`);
  if(surface.detail?.groundcover!==undefined&&!['cushion','mineral','fan','spore'].includes(surface.detail.groundcover))throw Error(`${label} invalid groundcover`);
  for(const key of ['heights','water','routes'])if(!Array.isArray(surface[key]??[])||(surface[key]?.length??0)>40)throw Error(`${label}.${key} invalid`);
  for(const shape of [...surface.heights??[],...surface.water??[]])if(!finite(shape.x,-200,200)||!finite(shape.z,-200,200)||!finite(shape.rx,1,100)||!finite(shape.rz,1,100))throw Error(`${label} has invalid landform`);
  for(const h of surface.heights??[])if(!finite(h.height,0,5)||!finite(h.plateau??.4,0,.8))throw Error(`${label} invalid height`);
  for(const w of surface.water??[])if(!finite(w.depth??.35,0,2))throw Error(`${label} invalid water depth`);
  for(const r of surface.routes??[])if(!finite(r.width,1,18)||!Array.isArray(r.points)||r.points.length<2||r.points.length>100||r.points.some(p=>!finite(p.x,-200,200)||!finite(p.z,-200,200)))throw Error(`${label} invalid path`);
  for(const r of surface.routes??[])if((r.elevation!==undefined&&!finite(r.elevation,-1,5))||(r.feather!==undefined&&!finite(r.feather,.2,5)))throw Error(`${label} invalid path grading`);
  for(const r of surface.routes??[])if(r.style!==undefined&&r.style!=='gravel')throw Error(`${label} invalid path style`);
  for(const r of surface.routes??[])if(r.scatter!==undefined&&typeof r.scatter!=='boolean')throw Error(`${label} invalid path scatter flag`);
  for(const c of Object.values(surface.palette??{}))if(typeof c!=='string'||!/^#[\da-f]{6}$/i.test(c))throw Error(`${label} invalid palette color`);
  return surface;
}
