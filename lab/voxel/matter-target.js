const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function rotate(q,v){const u=[q.x,q.y,q.z],t=cross(u,v).map(x=>2*x),v2=cross(u,t);return v.map((x,i)=>x+q.w*t[i]+v2[i]);}
function inverse(q){return {x:-q.x,y:-q.y,z:-q.z,w:q.w};}
export function actorToWorldPoint(pose,local){const v=rotate(pose.rotation,local);return v.map((x,i)=>x+pose.position[i]);}
export function worldToActorPoint(pose,world){return rotate(inverse(pose.rotation),world.map((x,i)=>x-pose.position[i]));}
export function worldToActorDirection(pose,world){return rotate(inverse(pose.rotation),world);}
function rayScalar(read,origin,direction,maxDistance){
  const length=Math.hypot(...direction);if(length<1e-9)return null;
  const d=direction.map(v=>v/length),step=.1;
  let previous=read(origin);
  for(let t=step;t<=maxDistance+step*.5;t+=step){
    const p=origin.map((v,i)=>v+d[i]*t),value=read(p);
    if(previous>=0&&value<0){let lo=t-step,hi=t;
      for(let i=0;i<10;i++){const mid=(lo+hi)/2,q=origin.map((v,j)=>v+d[j]*mid);if(read(q)<0)hi=mid;else lo=mid;}
      return (lo+hi)/2;
    }
    previous=value;
  }
  return null;
}
function rayBoundsRange(origin,direction,bounds){
  if(!bounds?.min||!bounds?.max)return null;
  let enter=-Infinity,exit=Infinity;
  for(let axis=0;axis<3;axis++){
    if(Math.abs(direction[axis])<1e-9){if(origin[axis]<bounds.min[axis]||origin[axis]>bounds.max[axis])return null;continue;}
    let a=(bounds.min[axis]-origin[axis])/direction[axis],b=(bounds.max[axis]-origin[axis])/direction[axis];
    if(a>b)[a,b]=[b,a];enter=Math.max(enter,a);exit=Math.min(exit,b);
    if(exit<enter)return null;
  }
  return {enter:Math.max(0,enter),exit};
}
function rayScalarInBounds(read,origin,direction,maxDistance,bounds){
  if(!bounds)return rayScalar(read,origin,direction,maxDistance);
  const range=rayBoundsRange(origin,direction,bounds);if(!range)return null;
  const limit=Math.min(maxDistance,range.exit+.1),start=Math.max(0,range.enter-.1),length=Math.hypot(...direction);
  if(length<1e-9)return null;
  const unit=direction.map(v=>v/length),step=.1;
  let previous=read(origin.map((v,i)=>v+unit[i]*start));
  for(let t=start+step;t<=limit+step*.5;t+=step){
    const point=origin.map((v,i)=>v+unit[i]*t),value=read(point);
    if(previous>=0&&value<0){let lo=t-step,hi=t;
      for(let i=0;i<10;i++){const mid=(lo+hi)/2,p=origin.map((v,j)=>v+unit[j]*mid);if(read(p)<0)hi=mid;else lo=mid;}
      return (lo+hi)/2;
    }
    previous=value;
  }
  return null;
}
export function pickActorSurface(actors,{originRelative,direction,origin=[0,0,0],maxDistance=8}){
  const world=originRelative.map((v,i)=>v+origin[i]),unit=direction.map(v=>v/Math.hypot(...direction));
  let best=null;
  for(const actor of actors){
    const local=worldToActorPoint(actor.pose,world),localDirection=worldToActorDirection(actor.pose,unit);
    const distance=rayScalarInBounds(actor.readDensity,local,localDirection,maxDistance,actor.bounds);
    if(distance===null||best&&distance>=best.distance)continue;
    const localPoint=local.map((v,i)=>v+localDirection[i]*distance);
    best={actorId:actor.id,contentRevision:actor.contentRevision,poseRevision:actor.poseRevision??0,
      pose:structuredClone(actor.pose),distance,localPoint,worldPoint:actorToWorldPoint(actor.pose,localPoint)};
  }
  return best;
}
export function pickWorldSurface(samples,{originRelative,direction,origin=[0,0,0],revision=0,maxDistance=8}){
  const pose={position:[0,0,0],rotation:{x:0,y:0,z:0,w:1}},hit=pickActorSurface([{id:'world',contentRevision:revision,pose,bounds:{min:samples.min,max:samples.max},readDensity:p=>readMatterScalar(samples,p)}],
    {originRelative,direction,origin,maxDistance});
  return hit?{...hit,ownerId:'world',localPoint:[...hit.localPoint]}:null;
}
export function validateActorHit(hit,actor){
  if(!hit||!actor||hit.actorId!==actor.id||hit.contentRevision!==actor.contentRevision||hit.poseRevision!==(actor.poseRevision??0))return false;
  const a=hit.pose,b=actor.pose;
  return a.position.every((v,i)=>Math.abs(v-b.position[i])<1e-5)&&['x','y','z','w'].every(k=>Math.abs(a.rotation[k]-b.rotation[k])<1e-6);
}
export function readMatterScalar(samples,point){
  const q=point.map((v,i)=>(v-samples.min[i])/samples.spacing),base=q.map(Math.floor),f=q.map((v,i)=>v-base[i]);
  if(base.some((v,i)=>v<0||v+1>=samples.size[i]))return 2;
  let result=0;for(let z=0;z<2;z++)for(let y=0;y<2;y++)for(let x=0;x<2;x++){
    const p=[base[0]+x,base[1]+y,base[2]+z],i=p[0]+samples.size[0]*(p[1]+samples.size[1]*p[2]);
    result+=(samples.volume?samples.volume.readDensity(p):samples.densities[i])*(x?f[0]:1-f[0])*(y?f[1]:1-f[1])*(z?f[2]:1-f[2]);
  }
  return result;
}
export const readRockScalar=readMatterScalar;
