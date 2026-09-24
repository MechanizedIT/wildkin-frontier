import { auditCollisionCandidate } from '../lab/voxel/rock-collision-audit.js';
import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import R from '../vendor/rapier.js';
import * as THREE from '../vendor/three.module.js';
import { auditPreparedRockCollision } from '../lab/voxel/matter-physics.js';
import { collisionStudyFixtures } from '../lab/voxel/rock-collision-study.js';
import { planVoxelCollider, createVoxelDescriptor, voxelSurfaceMesh } from '../lab/voxel/rock-voxel-collider.js';
import { actorToWorldPoint } from '../lab/voxel/matter-target.js';

await R.init();
const out='docs/evidence/voxel-phase05a3';await fs.mkdir(out,{recursive:true});
const methods=['native-voxel-0.25','native-voxel-0.5'];
const rows=[],visuals=[];
const pairedChildren=[];
const vec=p=>({x:p[0],y:p[1],z:p[2]});
const summarize=v=>{const s=[...v].sort((a,b)=>a-b);return {n:s.length,min:s[0],median:s[Math.floor(s.length*.5)],p95:s[Math.min(s.length-1,Math.floor(s.length*.95))],max:s.at(-1)};};
const fixtures=collisionStudyFixtures();
const plan=(fixture,method)=>planVoxelCollider(fixture.sample,method==='native-voxel-0.25'?.25:.5);
const descriptors=(points)=>[createVoxelDescriptor(R,points)];
for(const fixture of fixtures)for(const method of methods){
  const {mesh,record}=fixture,world=new R.World({x:0,y:0,z:0}),t=performance.now();
  const points=plan(fixture,method);
  const plannedMs=performance.now()-t,body=world.createRigidBody(R.RigidBodyDesc.fixed()),colliders=[];
  try{
    for(const desc of descriptors(points)){if(!desc)throw Error('Degenerate candidate hull');colliders.push(world.createCollider(desc,body));}
    world.step();const preparedMs=performance.now()-t;
    const {legacy,audit,playerProfiles,namedRecessRay}=auditCollisionCandidate(R,world,mesh,record,colliders),player=playerProfiles[0];
    const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(.47,-.63,.91)),pose={...record,position:[19,7,-11],rotation:{x:rotation.x,y:rotation.y,z:rotation.z,w:rotation.w}},origin=[256,128,-256];
    body.setTranslation(vec(pose.position.map((v,i)=>v-origin[i])),true);body.setRotation(pose.rotation,true);world.propagateModifiedBodyPositionsToColliders();
    const rotatedRebased=auditPreparedRockCollision(R,mesh,pose,colliders,origin);
    // Independent dynamic drop; measure visible floor support after settling.
    const drop=new R.World({x:0,y:-20,z:0});drop.timestep=1/60;
    drop.createCollider(R.ColliderDesc.cuboid(16,.5,16).setTranslation(0,-.5,0));
    const falling=drop.createRigidBody(R.RigidBodyDesc.dynamic().setLinearDamping(.7).setAngularDamping(.7).setCcdEnabled(true));
    for(const desc of descriptors(points))drop.createCollider(desc.setDensity(.6).setFriction(.85),falling);
    falling.setAngvel({x:0,y:0,z:1.2},true);
    let lowestVisible=Infinity,maxBodies=1;
    for(let i=0;i<240;i++)drop.step();
    const dp=falling.translation(),dq=falling.rotation(),settled={position:[dp.x,dp.y,dp.z],rotation:dq};
    for(let i=0;i<mesh.positions.length;i+=3)lowestVisible=Math.min(lowestVisible,actorToWorldPoint(settled,Array.from(mesh.positions.slice(i,i+3)))[1]);
    const floor={steps:240,lowestVisible,speed:Math.hypot(...Object.values(falling.linvel())),position:settled.position,rotation:{...dq},peakBodies:maxBodies};drop.free();
    const row={fixture:fixture.name,method,hulls:1,voxels:points.voxelCount,inputColliderBytes:points.inputBytes,plannedMs,preparedMs,legacy,audit,namedRecessRay,playerProfiles,rotatedRebased,floor,memory:process.memoryUsage()};
    // Inspector surface from the verified native voxel lattice; visible mesh unchanged.
    if(['initial-detached','central-cut-2','conditioned-child-0'].includes(fixture.name))visuals.push({fixture:fixture.name,method,mesh:{positions:Array.from(mesh.positions),indices:Array.from(mesh.indices)},hulls:[voxelSurfaceMesh(points)].map(g=>({positions:Array.from(g.positions),indices:Array.from(g.indices)})),audit,legacy});
    rows.push(row);console.log(`${fixture.name} ${method}: gate=${legacy.passes} legacy=${legacy.maxGap.toFixed(3)} dense=${audit.worst?.gap.toFixed(3)} false=${audit.falseSolidRays} missing=${audit.missingSupportRays} capsule=${player.worst?.gap.toFixed(3)} voxels=${points.voxelCount}`);
  }catch(error){rows.push({fixture:fixture.name,method,error:String(error)});console.log(`${fixture.name} ${method}: ${error}`);}finally{world.free();}
}
for(const method of methods){
  const world=new R.World({x:0,y:-20,z:0});world.timestep=1/60;
  try{
    world.createCollider(R.ColliderDesc.cuboid(16,.5,16).setTranslation(0,-.5,0));
    const children=fixtures.filter(f=>f.name.startsWith('conditioned-child-')).map(f=>{
      const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setLinearDamping(.7).setAngularDamping(.7).setCcdEnabled(true));
      const colliders=descriptors(plan(f,method)).map(d=>world.createCollider(d.setDensity(.6).setFriction(.85),body));
      return {body,colliders,fixture:f.name,plan:plan(f,method)};
    });
    const occupied=new Set();for(let i=0;i<children[0].plan.coordinates.length;i+=3)occupied.add(Array.from(children[0].plan.coordinates.slice(i,i+3)).join(','));
    let sharedCollisionVoxels=0;for(let i=0;i<children[1].plan.coordinates.length;i+=3)if(occupied.has(Array.from(children[1].plan.coordinates.slice(i,i+3)).join(',')))sharedCollisionVoxels++;
    let overlaps=0,maxPenetration=0;
    for(const a of children[0].colliders)for(const b of children[1].colliders){const c=a.contactCollider(b,0);if(c?.distance<-.001){overlaps++;maxPenetration=Math.max(maxPenetration,-c.distance);}}
    for(let i=0;i<240;i++)world.step();
    pairedChildren.push({method,sharedCollisionVoxels,directContactQuery:{observedPairs:overlaps,maxObservedPenetration:maxPenetration,limitation:'Native composite contactCollider may return null even on floor contact; use dynamics contact manifolds for simulation evidence'},peakBodies:2,children:children.map(c=>({fixture:c.fixture,position:{...c.body.translation()},rotation:{...c.body.rotation()},speed:Math.hypot(...Object.values(c.body.linvel())),hulls:c.colliders.length}))});
  }finally{world.free();}
}
const report={timestamp:new Date().toISOString(),scope:'Bounded candidates only; no runtime admission. Fixed Surface Nets / 16^3 / 0.5m / 1.5m fracture field.',criteria:'HOLD on legacy failure, >0.5m dense or capsule gap, or unmatched dense/capsule hits. Unmatched grazing rays are conservative diagnostics, not measured penetration depth. Floor is an observation, not admission.',rows,summary:methods.map(method=>{const r=rows.filter(r=>r.method===method&&!r.error);return {method,legacyPass:r.every(r=>r.legacy.passes),worstLegacy:Math.max(...r.map(r=>r.legacy.maxGap)),worstDense:Math.max(...r.map(r=>r.audit.worst?.gap??0)),denseFalseSolid:r.reduce((n,r)=>n+r.audit.falseSolidRays,0),denseMissing:r.reduce((n,r)=>n+r.audit.missingSupportRays,0),playerProfiles:['phase0-lab','shipping-player'].map(profile=>{const p=r.flatMap(r=>r.playerProfiles).filter(p=>p.profile===profile);return {profile,worstGap:Math.max(...p.map(p=>p.worst?.gap??0)),falseSolid:p.reduce((n,p)=>n+p.falseSolid,0),missing:p.reduce((n,p)=>n+p.missingSupport,0)};}),floorVisibleHeightRange:[Math.min(...r.map(r=>r.floor.lowestVisible)),Math.max(...r.map(r=>r.floor.lowestVisible))],peakObservedHeapBytes:Math.max(...r.map(r=>r.memory.heapUsed)),peakObservedRSSBytes:Math.max(...r.map(r=>r.memory.rss)),maxInputColliderBytes:Math.max(...r.map(r=>r.inputColliderBytes)),plannedMs:summarize(r.map(r=>r.plannedMs)),preparedMs:summarize(r.map(r=>r.preparedMs))};})};
await fs.writeFile(`${out}/collision-study.json`,JSON.stringify(report,(_,v)=>v===Infinity?'Infinity':v,2));
await fs.writeFile(`${out}/paired-children.json`,JSON.stringify(pairedChildren,null,2));
await fs.writeFile(`${out}/collision-visuals.json`,JSON.stringify(visuals));
console.log(JSON.stringify(report.summary,null,2));
if(rows.some(r=>r.error))throw Error('Collision study has harness errors; inspect the receipt before drawing conclusions');
