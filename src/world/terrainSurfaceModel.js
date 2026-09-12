// Authored continuous terrain. This pure model is shared by authoring, rendering,
// physical collision and ground-height queries; no runtime-only transforms.
export const TERRAIN_LIMITS = Object.freeze({ maxHeight:24, minRouteHeight:-1 });
export function smoothstep(a,b,v) { const t=Math.max(0,Math.min(1,(v-a)/(b-a))); return t*t*(3-2*t); }
export function ellipseRadius(shape,x,z) { return Math.hypot((x-shape.x)/shape.rx,(z-shape.z)/shape.rz); }
// Optional authored cliff outline, normalized to the existing x/z/radii controls.
// Its inward edge falloff gives broad irregular shelf tops, using the same
// height field for visual triangles, physics, ground queries and Author edits.
export function getLandformWeight(shape,x,z) {
  if(!shape.outline)return 1-smoothstep(shape.plateau??.4,1,ellipseRadius(shape,x,z));
  if(Math.abs(x-shape.x)>shape.rx||Math.abs(z-shape.z)>shape.rz)return 0;
  let inside=false,distance2=Infinity;
  const points=shape.outline;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const ax=shape.x+points[j].x*shape.rx,az=shape.z+points[j].z*shape.rz;
    const bx=shape.x+points[i].x*shape.rx,bz=shape.z+points[i].z*shape.rz;
    if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
    const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
    distance2=Math.min(distance2,(x-ax-dx*t)**2+(z-az-dz*t)**2);
  }
  return inside?smoothstep(0,shape.edgeWidth??2,Math.sqrt(distance2)):0;
}
export function getSurfaceHeight(surface,x,z) {
  if(!surface) return 0;
  let hill=0,depth=0;
  for(const h of surface.heights??[]) hill=Math.max(hill,h.height*getLandformWeight(h,x,z));
  for(const w of surface.water??[]) depth=Math.max(depth,(w.depth??.35)*(1-smoothstep(.65,1,ellipseRadius(w,x,z))));
  let height=hill-depth;
  for(const route of surface.routes??[])if(Number.isFinite(route.elevation)||Number.isFinite(route.points[0]?.elevation)){
    // A contour ramp interpolates its authored endpoint heights along the
    // nearest segment. Constant-elevation paths retain their existing result.
    let distance=Infinity,grade=route.elevation;
    for(let i=1;i<route.points.length;i++){
      const a=route.points[i-1],b=route.points[i],dx=b.x-a.x,dz=b.z-a.z;
      const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
      const d=Math.hypot(x-a.x-dx*t,z-a.z-dz*t)-route.width/2;
      if(d<distance){distance=d;grade=route.elevation??(a.elevation+(b.elevation-a.elevation)*t);}
    }
    const blend=1-smoothstep(0,route.feather??1.5,distance);
    height+=(grade-height)*blend;
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
  for(const h of surface.heights??[])if(!finite(h.height,0,TERRAIN_LIMITS.maxHeight)||!finite(h.plateau??.4,0,.8))throw Error(`${label} invalid height`);
  for(const h of surface.heights??[])if(h.outline!==undefined){
    const p=h.outline;
    if(!Array.isArray(p)||p.length<3||p.length>20||p.some(v=>!finite(v.x,-1,1)||!finite(v.z,-1,1))||!finite(h.edgeWidth??2,.7,12))throw Error(`${label} invalid cliff outline`);
    let area=0;
    const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
    for(let i=0;i<p.length;i++){
      const a=p[i],b=p[(i+1)%p.length];area+=a.x*b.z-b.x*a.z;
      if(Math.hypot(a.x-b.x,a.z-b.z)<.01)throw Error(`${label} cliff outline repeats a corner`);
      for(let j=i+2;j<p.length;j++){
        if(i===0&&j===p.length-1)continue;
        const c=p[j],d=p[(j+1)%p.length];
        if(cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0&&Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x))<=Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x))&&Math.max(Math.min(a.z,b.z),Math.min(c.z,d.z))<=Math.min(Math.max(a.z,b.z),Math.max(c.z,d.z)))throw Error(`${label} cliff outline crosses itself`);
      }
    }
    if(Math.abs(area)<.02)throw Error(`${label} cliff outline has no usable area`);
  }
  for(const w of surface.water??[])if(!finite(w.depth??.35,0,2))throw Error(`${label} invalid water depth`);
  for(const r of surface.routes??[])if(!finite(r.width,1,18)||!Array.isArray(r.points)||r.points.length<2||r.points.length>100||r.points.some(p=>!finite(p.x,-200,200)||!finite(p.z,-200,200)))throw Error(`${label} invalid path`);
  for(const r of surface.routes??[]){
    if((r.elevation!==undefined&&!finite(r.elevation,TERRAIN_LIMITS.minRouteHeight,TERRAIN_LIMITS.maxHeight))||(r.feather!==undefined&&!finite(r.feather,.2,5)))throw Error(`${label} invalid path grading`);
    if(r.points.some(p=>p.elevation!==undefined)){
      if(r.elevation!==undefined||r.points.some(p=>!finite(p.elevation,TERRAIN_LIMITS.minRouteHeight,TERRAIN_LIMITS.maxHeight)))throw Error(`${label} path needs a height at every point and no level override`);
      for(let i=1;i<r.points.length;i++)if(Math.hypot(r.points[i].x-r.points[i-1].x,r.points[i].z-r.points[i-1].z)<.01)throw Error(`${label} graded path has duplicate points`);
    }
  }
  for(const r of surface.routes??[])if(r.style!==undefined&&r.style!=='gravel')throw Error(`${label} invalid path style`);
  for(const r of surface.routes??[])if(r.scatter!==undefined&&typeof r.scatter!=='boolean')throw Error(`${label} invalid path scatter flag`);
  for(const r of surface.routes??[])if(r.paint!==undefined&&typeof r.paint!=='boolean')throw Error(`${label} invalid path paint flag`);
  for(const c of Object.values(surface.palette??{}))if(typeof c!=='string'||!/^#[\da-f]{6}$/i.test(c))throw Error(`${label} invalid palette color`);
  return surface;
}
