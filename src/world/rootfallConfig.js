// Provisional first natural passage. Stable IDs survive art/layout revisions.
export const ROOTFALL_CONFIG = Object.freeze({
  gateId:'gate_section_1_to_2', sectionId:'section_1',
  cutIds:Object.freeze(['rootfall_cut_west','rootfall_cut_east']),
  props:Object.freeze({left:'prop_rootfall_left',right:'prop_rootfall_right',middle:'prop_rootfall_middle',braceLeft:'prop_rootfall_brace_left',braceRight:'prop_rootfall_brace_right'}),
  braceCost:Object.freeze({wood:4,fiber:2}),
  // Gate-local approach anchor; the original return landing stays in the lane.
  braceAnchor:Object.freeze({x:-2.3,y:.7,z:5}),
  braceOnRoot:Object.freeze({x:-2.3,y:.7,z:2}),
  braceReach:2.2, verticalReach:2.2,
});

export function rootfallPoint(gate,local){
  const yaw=gate.rotY??0,c=Math.cos(yaw),s=Math.sin(yaw),scale=gate.uniformScale??1;
  return {x:gate.pos.x+(local.x*c+local.z*s)*scale,y:gate.pos.y+local.y*scale,z:gate.pos.z+(-local.x*s+local.z*c)*scale};
}
