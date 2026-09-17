// Planning candidate: explicit continuous Rootbound bands, metres in world XZ.
export const PRIMARY=[[-475,590],[-478,613],[-480,643],[-472,663],[-449,675],[-452,696],[-480,720],[-493,701],[-495,673],[-494,646],[-492,615],[-475,590]];
export const BRANCH=[[-449,675],[-427,680],[-415,694],[-430,711],[-452,696]];
export const BANDS=[
{id:'meadow-edge',points:[[-469,595],[-467,607],[-469,620]],width:6,rise:.3},
{id:'gallery-inner',points:[[-484,621],[-484,642],[-485,658],[-485,678],[-487,690]],width:5,rise:.85},
{id:'gallery-east',points:[[-470,624],[-469,642],[-463,655],[-454,660]],width:7,rise:.8},
{id:'gallery-return-edge',points:[[-501,621],[-503,646],[-503,672],[-501,687]],width:6,rise:.75},
{id:'verge-outer',points:[[-421,671],[-409,681],[-407,698]],width:6,rise:.85},
{id:'crown-backdrop',points:[[-486,727],[-472,731],[-453,727]],width:10,rise:0}
];
export const smooth=t=>{t=Math.min(1,Math.max(0,t));return t*t*(3-2*t)};
export function distanceToRoute(x,z,points){let best=Infinity;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));best=Math.min(best,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t))}return best}
export function candidateShoulder(x,z){let amount=0,coverage=0,band=null;const primary=distanceToRoute(x,z,PRIMARY),branch=distanceToRoute(x,z,BRANCH);const lane=smooth((primary-2.5)/3)*smooth((branch-2)/2.5);for(const b of BANDS){const v=smooth(1-distanceToRoute(x,z,b.points)/b.width)*lane;if(v>coverage){coverage=v;band=b.id}amount=Math.max(amount,v*b.rise)}return {amount,coverage,band,primary,branch}}
