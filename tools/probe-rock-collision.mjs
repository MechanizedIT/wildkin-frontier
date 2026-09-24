import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import R from '../vendor/rapier.js';
import * as THREE from '../vendor/three.module.js';
import { planRockColliders } from '../lab/voxel/matter-colliders.js';
import { auditPreparedRockCollision } from '../lab/voxel/matter-physics.js';
import { collisionStudyFixtures, planOccupancyColliders, planEightSectorControl } from '../lab/voxel/rock-collision-study.js';
import { actorToWorldPoint } from '../lab/voxel/matter-target.js';

await R.init();
const out='docs/evidence/voxel-phase05a2';await fs.mkdir(out,{recursive:true});
const methods=['four-sector','eight-sector-tight','eight-sector','occupancy-median','occupancy-gap','occupancy-voronoi'];
const rows=[],visuals=[];
const pairedChildren=[];
const vec=p=>({x:p[0],y:p[1],z:p[2]});
const summarize=v=>{const s=[...v].sort((a,b)=>a-b);return {n:s.length,min:s[0],median:s[Math.floor(s.length*.5)],p95:s[Math.min(s.length-1,Math.floor(s.length*.95))],max:s.at(-1)};};
const fixtures=collisionStudyFixtures();
const plan=(fixture,method)=>method==='four-sector'?planRockColliders(fixture.mesh,fixture.record.localCOM):method.startsWith('eight-sector')?planEightSectorControl(fixture.mesh,fixture.record.localCOM,method==='eight-sector-tight'?.1:.35):planOccupancyColliders(fixture.mesh,fixture.sample,method);
for(const fixture of fixtures)for(const method of methods){
  const {mesh,record}=fixture,world=new R.World({x:0,y:0,z:0}),t=performance.now();
  const points=plan(fixture,method);
  const plannedMs=performance.now()-t,body=world.createRigidBody(R.RigidBodyDesc.fixed()),colliders=[];
  try{
    for(const p of points){const desc=R.ColliderDesc.convexHull(p);if(!desc)throw Error('Degenerate candidate hull');colliders.push(world.createCollider(desc,body));}
    world.step();const preparedMs=performance.now()-t;
    const legacy=auditPreparedRockCollision(R,mesh,{...record,position:[0,0,0],rotation:{x:0,y:0,z:0,w:1}},colliders);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(mesh.positions,3));g.setIndex(new THREE.BufferAttribute(mesh.indices,1));g.computeBoundingBox();
    const visible=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));visible.updateMatrixWorld();
    const bounds=[g.boundingBox.min.toArray(),g.boundingBox.max.toArray()];
    const audit={rays:0,compared:0,falseSolidRays:0,missingSupportRays:0,maxEarly:0,maxLate:0,worst:null};
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
      const axes=[0,1,2].filter(a=>a!==axis);
      for(let u=Math.floor(bounds[0][axes[0]]*4)/4;u<=bounds[1][axes[0]]+.001;u+=.25)for(let v=Math.floor(bounds[0][axes[1]]*4)/4;v<=bounds[1][axes[1]]+.001;v+=.25){
        const start=[0,0,0],direction=[0,0,0];start[axis]=sign<0?bounds[0][axis]-1:bounds[1][axis]+1;start[axes[0]]=u;start[axes[1]]=v;direction[axis]=-sign;
        const hit=new THREE.Raycaster(new THREE.Vector3(...start),new THREE.Vector3(...direction),0,12).intersectObject(visible)[0];
        const proxy=Math.min(...colliders.map(c=>{const d=c.castRay(new R.Ray(vec(start),vec(direction)),12,true);return d!=null&&d>=0?d:Infinity;}));audit.rays++;
        if(!hit){if(Number.isFinite(proxy))audit.falseSolidRays++;continue;}
        if(!Number.isFinite(proxy)){audit.missingSupportRays++;continue;}
        const early=hit.distance-proxy;audit.compared++;audit.maxEarly=Math.max(audit.maxEarly,early);audit.maxLate=Math.max(audit.maxLate,-early);
        if(!audit.worst||Math.abs(early)>audit.worst.gap)audit.worst={start,direction,visible:hit.distance,proxy,gap:Math.abs(early)};
      }
    }
    // Player-sized capsule casts against actual Rapier compounds and a static
    // exact-mesh oracle. The oracle is never a dynamic triangle mesh.
    const exact=world.createCollider(R.ColliderDesc.trimesh(mesh.positions,mesh.indices)),zero={x:0,y:0,z:0},identity={x:0,y:0,z:0,w:1};
    const playerProfiles=[];
    for(const [profile,halfHeight,radius] of [['phase0-lab',.5,.3],['shipping-player',.2,.32]]){
    const capsule=new R.Capsule(halfHeight,radius),player={profile,halfHeight,radius,casts:0,compared:0,falseSolid:0,missingSupport:0,maxEarly:0,maxLate:0,worst:null};
    for(const axis of [0,2])for(const sign of [-1,1])for(const y of [2.5,3,3.5,4,4.5,5])for(const side of [-1,-.5,0,.5,1]){
      const start=axis===0?[sign*5,y,side]:[side,y,sign*5],direction=axis===0?[-sign,0,0]:[0,0,-sign];
      const hit=c=>c.castShape(zero,capsule,vec(start),identity,vec(direction),0,10,true)?.time_of_impact??Infinity;
      const expected=hit(exact),actual=Math.min(...colliders.map(hit));player.casts++;
      if(!Number.isFinite(expected)){if(Number.isFinite(actual))player.falseSolid++;continue;}
      if(!Number.isFinite(actual)){player.missingSupport++;continue;}
      const early=expected-actual;player.compared++;player.maxEarly=Math.max(player.maxEarly,early);player.maxLate=Math.max(player.maxLate,-early);
      if(!player.worst||Math.abs(early)>player.worst.gap)player.worst={start,direction,expected,actual,gap:Math.abs(early)};
    }
    if(player.worst){
      const pb=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(...player.worst.start)),pc=world.createCollider(R.ColliderDesc.capsule(halfHeight,radius),pb),controller=world.createCharacterController(.02);
      controller.setSlideEnabled(false);world.step();
      const movement=predicate=>{controller.computeColliderMovement(pc,vec(player.worst.direction.map(v=>v*10)),undefined,undefined,predicate);const d=controller.computedMovement();return Math.hypot(d.x,d.y,d.z);};
      player.characterController={proxyTravel:movement(c=>colliders.includes(c)),visibleTravel:movement(c=>c.handle===exact.handle)};
      world.removeCharacterController(controller);world.removeRigidBody(pb);
    }
    playerProfiles.push(player);
    }
    const player=playerProfiles[0];world.removeCollider(exact,false);
    const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(.47,-.63,.91)),pose={...record,position:[19,7,-11],rotation:{x:rotation.x,y:rotation.y,z:rotation.z,w:rotation.w}},origin=[256,128,-256];
    body.setTranslation(vec(pose.position.map((v,i)=>v-origin[i])),true);body.setRotation(pose.rotation,true);world.propagateModifiedBodyPositionsToColliders();
    const rotatedRebased=auditPreparedRockCollision(R,mesh,pose,colliders,origin);
    // Independent dynamic drop; measure visible floor support after settling.
    const drop=new R.World({x:0,y:-20,z:0});drop.timestep=1/60;
    drop.createCollider(R.ColliderDesc.cuboid(16,.5,16).setTranslation(0,-.5,0));
    const falling=drop.createRigidBody(R.RigidBodyDesc.dynamic().setLinearDamping(.7).setAngularDamping(.7).setCcdEnabled(true));
    for(const p of points)drop.createCollider(R.ColliderDesc.convexHull(p).setDensity(.6).setFriction(.85),falling);
    falling.setAngvel({x:0,y:0,z:1.2},true);
    let lowestVisible=Infinity,maxBodies=1;
    for(let i=0;i<240;i++)drop.step();
    const dp=falling.translation(),dq=falling.rotation(),settled={position:[dp.x,dp.y,dp.z],rotation:dq};
    for(let i=0;i<mesh.positions.length;i+=3)lowestVisible=Math.min(lowestVisible,actorToWorldPoint(settled,Array.from(mesh.positions.slice(i,i+3)))[1]);
    const floor={steps:240,lowestVisible,speed:Math.hypot(...Object.values(falling.linvel())),position:settled.position,rotation:{...dq},peakBodies:maxBodies};drop.free();
    const row={fixture:fixture.name,method,hulls:points.length,vertices:points.map(p=>p.length/3),inputHullBytes:points.reduce((n,p)=>n+p.byteLength,0),plannedMs,preparedMs,legacy,audit,playerProfiles,rotatedRebased,floor,memory:process.memoryUsage()};
    // Serialize Rapier's actual computed convex shape, not the input cloud.
    if(['initial-detached','central-cut-2','conditioned-child-0'].includes(fixture.name))visuals.push({fixture:fixture.name,method,mesh:{positions:Array.from(mesh.positions),indices:Array.from(mesh.indices)},hulls:colliders.map(c=>({positions:Array.from(c.vertices()),indices:Array.from(c.indices())})),audit,legacy});
    rows.push(row);g.dispose();visible.material.dispose();console.log(`${fixture.name} ${method}: gate=${legacy.passes} legacy=${legacy.maxGap.toFixed(3)} dense=${audit.worst?.gap.toFixed(3)} false=${audit.falseSolidRays} missing=${audit.missingSupportRays} capsule=${player.worst?.gap.toFixed(3)} hulls=${points.length}`);
  }catch(error){rows.push({fixture:fixture.name,method,error:String(error)});console.log(`${fixture.name} ${method}: ${error}`);}finally{world.free();}
}
for(const method of methods){
  const world=new R.World({x:0,y:-20,z:0});world.timestep=1/60;
  try{
    world.createCollider(R.ColliderDesc.cuboid(16,.5,16).setTranslation(0,-.5,0));
    const children=fixtures.filter(f=>f.name.startsWith('conditioned-child-')).map(f=>{
      const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setLinearDamping(.7).setAngularDamping(.7).setCcdEnabled(true));
      const colliders=plan(f,method).map(p=>world.createCollider(R.ColliderDesc.convexHull(p).setDensity(.6).setFriction(.85),body));
      return {body,colliders,fixture:f.name};
    });
    let overlaps=0,maxPenetration=0;
    for(const a of children[0].colliders)for(const b of children[1].colliders){const c=a.contactCollider(b,0);if(c?.distance<-.001){overlaps++;maxPenetration=Math.max(maxPenetration,-c.distance);}}
    for(let i=0;i<240;i++)world.step();
    pairedChildren.push({method,initialOverlappingHullPairs:overlaps,maxInitialPenetration:maxPenetration,peakBodies:2,children:children.map(c=>({fixture:c.fixture,position:{...c.body.translation()},rotation:{...c.body.rotation()},speed:Math.hypot(...Object.values(c.body.linvel())),hulls:c.colliders.length}))});
  }finally{world.free();}
}
const report={timestamp:new Date().toISOString(),scope:'Bounded candidates only; no runtime admission. Fixed Surface Nets / 16^3 / 0.5m / 1.5m fracture field.',criteria:'HOLD on legacy failure, >0.5m dense or capsule gap, or unmatched dense/capsule hits. Unmatched grazing rays are conservative diagnostics, not measured penetration depth. Floor is an observation, not admission.',rows,summary:methods.map(method=>{const r=rows.filter(r=>r.method===method&&!r.error);return {method,legacyPass:r.every(r=>r.legacy.passes),worstLegacy:Math.max(...r.map(r=>r.legacy.maxGap)),worstDense:Math.max(...r.map(r=>r.audit.worst?.gap??0)),denseFalseSolid:r.reduce((n,r)=>n+r.audit.falseSolidRays,0),denseMissing:r.reduce((n,r)=>n+r.audit.missingSupportRays,0),playerProfiles:['phase0-lab','shipping-player'].map(profile=>{const p=r.flatMap(r=>r.playerProfiles).filter(p=>p.profile===profile);return {profile,worstGap:Math.max(...p.map(p=>p.worst?.gap??0)),falseSolid:p.reduce((n,p)=>n+p.falseSolid,0),missing:p.reduce((n,p)=>n+p.missingSupport,0)};}),floorVisibleHeightRange:[Math.min(...r.map(r=>r.floor.lowestVisible)),Math.max(...r.map(r=>r.floor.lowestVisible))],peakObservedHeapBytes:Math.max(...r.map(r=>r.memory.heapUsed)),peakObservedRSSBytes:Math.max(...r.map(r=>r.memory.rss)),maxInputHullBytes:Math.max(...r.map(r=>r.inputHullBytes)),plannedMs:summarize(r.map(r=>r.plannedMs)),preparedMs:summarize(r.map(r=>r.preparedMs))};})};
await fs.writeFile(`${out}/collision-study.json`,JSON.stringify(report,(_,v)=>v===Infinity?'Infinity':v,2));
await fs.writeFile(`${out}/paired-children.json`,JSON.stringify(pairedChildren,null,2));
await fs.writeFile(`${out}/collision-visuals.json`,JSON.stringify(visuals));
console.log(JSON.stringify(report.summary,null,2));
if(rows.some(r=>r.error))throw Error('Collision study has harness errors; inspect the receipt before drawing conclusions');
