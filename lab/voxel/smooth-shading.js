// Shared bounded AO for the Phase 0 smooth candidates. It considers only the
// eight density corners of the crossing cell. Solid corners in the outward
// hemisphere (with a quarter-cell footprint per sample) darken local concavities.
// This is a deliberately local occupancy approximation, not traced lighting.
// Because these are exactly the eight
// values used to construct a ghost vertex, shading is seam-identical using
// only the mandatory one-sample shell.
export function smoothAmbientOcclusion(corners, position, normal) {
  let solid=0,total=0;
  for(let z=0;z<2;z++)for(let y=0;y<2;y++)for(let x=0;x<2;x++) { const i=x+2*y+4*z, outward=(x-position[0])*normal[0]+(y-position[1])*normal[1]+(z-position[2])*normal[2];if(outward<=-.25)continue;total++;if(corners[i]<0)solid++; }
  return 1-(total?solid/total:0)*.28;
}
