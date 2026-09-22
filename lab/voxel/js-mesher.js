import { index3 } from './coordinates.js';
import { MATERIALS } from './config.js';
// Small owned fallback for the Phase 0 comparison. Merge only faces with the
// same material and uniform AO; nonuniform AO stays as individual quads.
export function meshGreedy({ size, voxels }) {
  const n=size+2, positions=[],normals=[],colors=[],indices=[];
  const get=(p)=>voxels[index3(p[0]+1,p[1]+1,p[2]+1,n)];
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
    const u=(axis+1)%3,v=(axis+2)%3;
    for(let layer=0;layer<size;layer++){
      const mask=new Int32Array(size*size), shades=new Uint8Array(size*size*4);
      for(let j=0;j<size;j++)for(let i=0;i<size;i++){
        const p=[0,0,0];p[axis]=layer;p[u]=i;p[v]=j;
        const material=get(p);if(!material)continue;
        const outside=[...p];outside[axis]+=sign;if(get(outside))continue;
        const ao=[];
        for(const [cu,cv]of [[-1,-1],[1,-1],[1,1],[-1,1]]){
          const s1=[...outside],s2=[...outside],corner=[...outside];s1[u]+=cu;s2[v]+=cv;corner[u]+=cu;corner[v]+=cv;
          const a=!!get(s1),b=!!get(s2),c=!!get(corner);ao.push(a&&b?3:Number(a)+Number(b)+Number(c));
        }
        const m=i+size*j;shades.set(ao,m*4);
        const uniform=ao.every(a=>a===ao[0]);mask[m]=uniform?material*4+ao[0]:-(material*4+ao[0]);
      }
      for(let j=0;j<size;j++)for(let i=0;i<size;){
        const m=i+size*j,signature=mask[m];if(!signature){i++;continue;}
        let w=1,h=1;
        if(signature>0){while(i+w<size&&mask[m+w]===signature)w++;
          outer:while(j+h<size){for(let k=0;k<w;k++)if(mask[m+k+h*size]!==signature)break outer;h++;}}
        const material=Math.floor(Math.abs(signature)/4),base=positions.length/3;
        const corners=[[i,j],[i+w,j],[i+w,j+h],[i,j+h]],ao=shades.subarray(m*4,m*4+4);
        corners.forEach(([a,b],c)=>{const p=[0,0,0],normal=[0,0,0];p[axis]=layer+(sign>0?1:0);p[u]=a;p[v]=b;normal[axis]=sign;positions.push(...p);normals.push(...normal);const shade=1-ao[c]*0.18;colors.push(...MATERIALS[material].color.map(v=>v*shade));});
        // Flip diagonal to reduce AO interpolation anisotropy.
        const quad=ao[0]+ao[2]>ao[1]+ao[3]?[0,1,3,1,2,3]:[0,1,2,0,2,3];
        for(let k=0;k<6;k+=3)indices.push(base+quad[k],base+quad[k+(sign>0?1:2)],base+quad[k+(sign>0?2:1)]);
        for(let y=0;y<h;y++)for(let x=0;x<w;x++)mask[m+x+y*size]=0;i+=w;
      }
    }
  }
  return {positions:new Float32Array(positions),normals:new Float32Array(normals),colors:new Float32Array(colors),indices:new Uint32Array(indices)};
}
