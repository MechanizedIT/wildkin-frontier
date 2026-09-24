// A bounded four-sector convex compound for the single rock fixture.
// No dynamic triangle meshes or general decomposition machinery.
function keepExtremes(points){
  if(points.length<=64)return points;
  const picked=new Set();for(let axis=0;axis<3;axis++){
    let lo=0,hi=0;for(let i=1;i<points.length;i++){if(points[i][axis]<points[lo][axis])lo=i;if(points[i][axis]>points[hi][axis])hi=i;}
    picked.add(lo);picked.add(hi);
  }
  while(picked.size<64){let best=-1,score=-1;
    for(let i=0;i<points.length;i++){if(picked.has(i))continue;
      let nearest=Infinity;for(const j of picked){const a=points[i],b=points[j],d=(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;nearest=Math.min(nearest,d);}
      if(nearest>score){score=nearest;best=i;}
    }
    if(best<0)break;picked.add(best);
  }
  return [...picked].sort((a,b)=>a-b).map(i=>points[i]);
}
export function planRockColliders(mesh,localCOM){
  const groups=Array.from({length:4},()=>[]),overlap=.35;
  for(let i=0;i<mesh.positions.length;i+=3){const p=[mesh.positions[i],mesh.positions[i+1],mesh.positions[i+2]];
    for(let sector=0;sector<4;sector++){
      const sideX=sector&1,sideZ=sector&2;
      if(sideX?(p[0]<localCOM[0]-overlap):(p[0]>localCOM[0]+overlap))continue;
      if(sideZ?(p[2]<localCOM[2]-overlap):(p[2]>localCOM[2]+overlap))continue;
      groups[sector].push(p);
    }
  }
  const hulls=[];
  for(const group of groups){if(group.length<4)continue;
    const points=keepExtremes([localCOM,...group]);
    if(points.length<4)continue;
    hulls.push(new Float32Array(points.flat()));
  }
  if(!hulls.length||hulls.length>8||hulls.some(h=>h.length/3>64))throw new Error('Rock compound collider budget');
  return hulls;
}
export function planRockShardHull(mesh){
  const points=[];for(let i=0;i<mesh.positions.length;i+=3)points.push([mesh.positions[i],mesh.positions[i+1],mesh.positions[i+2]]);
  if(points.length<4)return null;
  return new Float32Array(keepExtremes(points).flat());
}
export const planMatterColliders=planRockColliders;
export const planMatterShardHull=planRockShardHull;
