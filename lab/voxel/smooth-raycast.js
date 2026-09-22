// Raycast the scalar field itself.  Grid DDA bounds work to only cells met by
// the ray; the short subdivision/bisection inside each cell finds the actual
// trilinear zero surface rather than treating any negative sample as a cube.
const EPSILON = 1e-7;
function normalize(v) { const l=Math.hypot(...v); return l ? v.map(x=>x/l) : null; }
function trilinear(c, u, v, w) {
  const x0=c[0]*(1-u)+c[1]*u, x1=c[2]*(1-u)+c[3]*u;
  const x2=c[4]*(1-u)+c[5]*u, x3=c[6]*(1-u)+c[7]*u;
  return (x0*(1-v)+x1*v)*(1-w)+(x2*(1-v)+x3*v)*w;
}
function gradient(c,u,v,w,spacing) {
  const dx=((c[1]-c[0])*(1-v)*(1-w)+(c[3]-c[2])*v*(1-w)+(c[5]-c[4])*(1-v)*w+(c[7]-c[6])*v*w)/spacing;
  const dy=((c[2]-c[0])*(1-u)*(1-w)+(c[3]-c[1])*u*(1-w)+(c[6]-c[4])*(1-u)*w+(c[7]-c[5])*u*w)/spacing;
  const dz=((c[4]-c[0])*(1-u)*(1-v)+(c[5]-c[1])*u*(1-v)+(c[6]-c[2])*(1-u)*v+(c[7]-c[3])*u*v)/spacing;
  return normalize([dx,dy,dz]) || [0,1,0];
}
function corners(cell, readDensity, readMaterial) {
  const density=[], material=[];
  for(let z=0;z<2;z++)for(let y=0;y<2;y++)for(let x=0;x<2;x++) { density.push(readDensity(cell[0]+x,cell[1]+y,cell[2]+z)); material.push(readMaterial(cell[0]+x,cell[1]+y,cell[2]+z)); }
  return { density, material };
}
function materialAtHit(cell, values, point, spacing) {
  let best=-1, distance=Infinity;
  for(let z=0;z<2;z++)for(let y=0;y<2;y++)for(let x=0;x<2;x++) { const i=x+2*y+4*z;if(values.density[i]>=0)continue;const dx=point[0]/spacing-(cell[0]+x),dy=point[1]/spacing-(cell[1]+y),dz=point[2]/spacing-(cell[2]+z),d=dx*dx+dy*dy+dz*dz;if(d<distance){distance=d;best=i;} }
  if(best<0)return {cell:[...cell],material:0};
  return {cell:[cell[0]+(best&1),cell[1]+((best>>1)&1),cell[2]+((best>>2)&1)],material:values.material[best]};
}

export function raycastSmooth(startPhysical, direction, readDensity, readMaterial, spacing, maxDistance=7) {
  if (!(spacing>0) || !(maxDistance>0) || !Array.isArray(startPhysical) || !Array.isArray(direction)) return null;
  const dir=normalize(direction); if(!dir) return null;
  const p=startPhysical.map(v=>v/spacing), cell=p.map((v,a)=>Math.floor(v) - (Math.abs(v-Math.round(v))<EPSILON && dir[a]<0 ? 1 : 0));
  const step=dir.map(v=>v<0?-1:1), delta=dir.map(v=>v===0?Infinity:spacing/Math.abs(v));
  const next=cell.map((v,a)=>{const boundary=(step[a]>0?v+1:v)*spacing;return dir[a]===0?Infinity:Math.max(0,(boundary-startPhysical[a])/dir[a]);});
  let entry=0;
  while(entry<=maxDistance+EPSILON) {
    const exit=Math.min(maxDistance,...next), values=corners(cell,readDensity,readMaterial);
    const f=t=>{const q=[(startPhysical[0]+dir[0]*t)/spacing-cell[0],(startPhysical[1]+dir[1]*t)/spacing-cell[1],(startPhysical[2]+dir[2]*t)/spacing-cell[2]];return trilinear(values.density,...q);};
    // A trilinear saddle can cross despite equal end signs. Sixteen bounded
    // probes catch it, and bisection then makes the result stable enough for
    // precise tool placement without inspecting unrelated cells.
    let low=entry, fl=f(low), hit=null;
    for(let s=1;s<=16;s++) { const high=entry+(exit-entry)*s/16, fh=f(high);if(Math.abs(fl)<EPSILON||Math.abs(fh)<EPSILON||(fl<0)!==(fh<0)){let a=low,b=high,fa=fl;for(let i=0;i<18;i++){const mid=(a+b)/2,fm=f(mid);if(Math.abs(fm)<EPSILON){a=b=mid;break;}if((fa<0)===(fm<0)){a=mid;fa=fm;}else b=mid;}hit=(a+b)/2;break;}low=high;fl=fh; }
    if(hit!==null) { const point=startPhysical.map((v,a)=>v+dir[a]*hit),target=materialAtHit(cell,values,point,spacing);const u=point[0]/spacing-cell[0],v=point[1]/spacing-cell[1],w=point[2]/spacing-cell[2];return { cell:target.cell, material:target.material, distance:hit, normal:gradient(values.density,u,v,w,spacing), point }; }
    const axis=next.indexOf(Math.min(...next));entry=next[axis];cell[axis]+=step[axis];next[axis]+=delta[axis];
  }
  return null;
}
