import fs from 'node:fs/promises';
import { actorToWorldPoint } from '../lab/voxel/matter-target.js';
import { planRockColliders } from '../lab/voxel/matter-colliders.js';
import { performance } from 'node:perf_hooks';
import R from '../vendor/rapier.js';
import { LabPhysics } from '../lab/voxel/physics.js';
import { meshSurfaceNets } from '../lab/voxel/surface-nets.js';
import { collisionStudyFixtures } from '../lab/voxel/rock-collision-study.js';
import { planVoxelCollider, createVoxelDescriptor, voxelSurfaceMesh } from '../lab/voxel/rock-voxel-collider.js';

// This is an opt-in lifecycle study. It never writes LabWorldState, material
// ownership, actor records, rewards, or published runtime products.
await R.init();
const out='docs/evidence/voxel-phase05a3'; await fs.mkdir(out,{recursive:true});
const vec=a=>({x:a[0],y:a[1],z:a[2]}), finite=o=>Object.values(o).every(Number.isFinite);
const summary=values=>{const s=[...values].sort((a,b)=>a-b),at=p=>s[Math.min(s.length-1,Math.floor((s.length-1)*p))]??0;return {n:s.length,min:at(0),median:at(.5),p95:at(.95),max:at(1)};};

function terrainMesh(){
  // Generated through the actual Surface Nets route, then registered with
  // LabPhysics.prepare/commit as the static terrain trimesh.
  const size=16,n=size+2,densities=new Float32Array(n**3),materials=new Uint8Array(n**3);
  for(let z=-1;z<=size;z++)for(let y=-1;y<=size;y++)for(let x=-1;x<=size;x++){
    const i=(x+1)+n*((y+1)+n*(z+1)); densities[i]=y-1; materials[i]=1;
  }
  return meshSurfaceNets({size,densities,materials,spacing:.5});
}
function createRock(physics,fixture,spacing,position=[4,9,4],rotation={x:0,y:0,z:0,w:1}){
  const plan=planVoxelCollider(fixture.sample,spacing),start=performance.now();
  const body=physics.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(...position).setRotation(rotation)
    .setLinearDamping(.5).setAngularDamping(.5).setCcdEnabled(true).setCanSleep(true));
  const descriptor=createVoxelDescriptor(R,plan).setDensity(.6).setFriction(.85);
  const collider=physics.world.createCollider(descriptor,body);
  return {body,collider,plan,fixture,constructionMs:performance.now()-start};
}
function steps(physics,n){const ms=[];for(let i=0;i<n;i++){const t=performance.now();physics.world.step();ms.push(performance.now()-t);}return ms;}
function position(body){const p=body.translation(),q=body.rotation();return {position:[p.x,p.y,p.z],rotation:{x:q.x,y:q.y,z:q.z,w:q.w},finite:finite(p)&&finite(q)};}
function lowestSurface(product,mesh){
  const pose=position(product.body);let lowest=Infinity;
  for(let i=0;i<mesh.positions.length;i+=3)lowest=Math.min(lowest,actorToWorldPoint(pose,Array.from(mesh.positions.slice(i,i+3)))[1]);
  return lowest;
}
function floorSupport(product,floor,physics,floorY=0){
  const lowest=lowestSurface(product,voxelSurfaceMesh(product.plan)),lowestVisible=lowestSurface(product,product.fixture.mesh);
  let manifolds=0,contacts=0,minContactDistance=Infinity;
  physics.world.contactPair(product.collider,floor,manifold=>{manifolds++;for(let i=0;i<manifold.numContacts();i++){contacts++;minContactDistance=Math.min(minContactDistance,manifold.contactDist(i));}});
  const speed=Math.hypot(...Object.values(product.body.linvel())),allFinite=position(product.body).finite;
  return {lowestVoxelSurface:lowest,lowestVisible,speed,allFinite,manifolds,contacts,minContactDistance:Number.isFinite(minContactDistance)?minContactDistance:null,
    fellThrough:lowest<floorY-1,supported:allFinite&&lowest>=floorY-.1&&lowest<=floorY+.1&&speed<.1, sleeping:product.body.isSleeping()};
}
function freshTerrain(){const physics=new LabPhysics(R),terrain=terrainMesh(),t=performance.now(),prepared=physics.prepare([0,0,0],16,terrain,1);physics.commit('surface-nets-terrain',prepared);return {physics,terrain,prepared,prepareCommitMs:performance.now()-t};}
function freshFloor(){const physics=new LabPhysics(R),floor=physics.world.createCollider(R.ColliderDesc.cuboid(16,.5,16).setTranslation(0,-.5,0).setFriction(.85));physics.chunks.set('study-floor',{collider:floor});return {physics,floor};}

function run(spacing){
  const fixtures=collisionStudyFixtures(), initial=fixtures.find(f=>f.name==='initial-detached'), children=fixtures.filter(f=>f.name.startsWith('conditioned-child-'));
  const terrain=terrainMesh(), baseline=process.memoryUsage();
  let result={spacing,api:{rapierVersion:R.version(),voxels:typeof R.ColliderDesc.voxels==='function'},terrain:{surfaceNets:{vertices:terrain.positions.length/3,triangles:terrain.indices.length/3}},baselineMemory:baseline};
  try {
    const terrainCase=freshTerrain(),{physics,prepared}=terrainCase,rock=createRock(physics,initial,spacing,[4,0,4]);
    const initialStep=steps(physics,240),support=floorSupport(rock,prepared.collider,physics,.5);
    result.terrain.prepareCommitMs=terrainCase.prepareCommitMs;
    result.dynamicAgainstStaticTrimesh={created:true,plan:{voxelCount:rock.plan.voxelCount,inputBytes:rock.plan.inputBytes,occupiedParcels:rock.plan.occupiedParcels},constructionMs:rock.constructionMs,stepMs:summary(initialStep),pose:position(rock.body),...support,holdReason:support.supported?null:'No native voxel/static Surface Nets trimesh contact at rest; candidate is HOLD.'};
    // This is intentionally a distinct cuboid control world, matching the
    // existing inspector's floor rather than inferring support from body origin.
    const floorCase=freshFloor(),floorRock=createRock(floorCase.physics,initial,spacing,[0,0,0]);steps(floorCase.physics,240);
    result.floorCuboidControl={pose:position(floorRock.body),...floorSupport(floorRock,floorCase.floor,floorCase.physics)};floorRock.body.sleep();const wasSleeping=floorRock.body.isSleeping();floorRock.body.applyImpulse({x:1.5,y:.2,z:0},true);floorCase.physics.world.step();
    result.floorSleepWake={naturalSleep:result.floorCuboidControl.sleeping,explicitSleep:wasSleeping,awakeAfterImpulse:!floorRock.body.isSleeping(),speed:Math.hypot(...Object.values(floorRock.body.linvel()))};floorCase.physics.dispose();
    const rotatedCase=freshFloor(),norm=Math.hypot(.21,-.37,.19,.88),q={x:.21/norm,y:-.37/norm,z:.19/norm,w:.88/norm};
    const rotatedRock=createRock(rotatedCase.physics,initial,spacing,[0,3,0],q);steps(rotatedCase.physics,360);
    const preRebase=position(rotatedRock.body),preSupport=floorSupport(rotatedRock,rotatedCase.floor,rotatedCase.physics);
    rotatedCase.physics.shiftOrigin([256,128,-256]);const postRebase=position(rotatedRock.body);steps(rotatedCase.physics,60);
    result.rotatedFloorRebase={preSupport,globalDelta:postRebase.position.map((v,i)=>v-preRebase.position[i]+[256,128,-256][i]),postSupport:floorSupport(rotatedRock,rotatedCase.floor,rotatedCase.physics,-128)};rotatedCase.physics.dispose();
    const unit=Math.hypot(.21,-.37,.19,.88),rotation={x:.21/unit,y:-.37/unit,z:.19/unit,w:.88/unit};rock.body.setRotation(rotation,true);physics.world.propagateModifiedBodyPositionsToColliders();
    const beforeRebase=position(rock.body);physics.shiftOrigin([256,128,-256]);const afterRebase=position(rock.body);
    result.rotationRebase={before:beforeRebase,after:afterRebase,globalDelta:afterRebase.position.map((v,i)=>v-beforeRebase.position[i]+[256,128,-256][i]),finite:afterRebase.finite};
    for(let i=0;i<600&&!rock.body.isSleeping();i++)physics.world.step();const sleeping=rock.body.isSleeping();rock.body.applyImpulse({x:1.5,y:.2,z:0},true);physics.world.step();result.sleepWake={sleepingBeforeImpulse:sleeping,awakeAfterImpulse:!rock.body.isSleeping()};
    const rebuildStart=performance.now(),replacement=createRock(physics,fixtures.find(f=>f.name==='secondary-notch'),spacing,afterRebase.position,rotation),rebuildPreparedMs=performance.now()-rebuildStart;replacement.body.setEnabled(false);physics.world.removeRigidBody(replacement.body);result.rebuild={mode:'prepare changed secondary-notch native voxel product then discard; held candidate never replaces old body',preparedMs:rebuildPreparedMs,installed:false,oldBodyRetained:rock.body.isValid()};result.memory={process:process.memoryUsage(),delta:Object.fromEntries(Object.entries(process.memoryUsage()).map(([k,v])=>[k,v-(baseline[k]??0)])),snapshotBytes:physics.world.takeSnapshot().byteLength};physics.dispose();
    const convexCase=freshTerrain(),controlBody=convexCase.physics.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(4,0,4).setCcdEnabled(true));
    for(const p of planRockColliders(initial.mesh,initial.record.localCOM))convexCase.physics.world.createCollider(R.ColliderDesc.convexHull(p).setDensity(.6),controlBody);
    steps(convexCase.physics,240);const convexVisible=lowestSurface({body:controlBody},initial.mesh);
    result.sameTerrainConvexControl={pose:position(controlBody),lowestVisible:convexVisible,speed:Math.hypot(...Object.values(controlBody.linvel())),supported:Math.abs(convexVisible-.5)<.1};convexCase.physics.dispose();
    const fastTerrain=freshTerrain(),fast=createRock(fastTerrain.physics,initial,spacing,[4,12,4]);fast.body.setLinvel({x:0,y:-60,z:0},true);steps(fastTerrain.physics,60);
    result.ccdTerrain={pose:position(fast.body),...floorSupport(fast,fastTerrain.prepared.collider,fastTerrain.physics,.5)};fastTerrain.physics.dispose();
    const ccdCase=freshFloor(),ccd=createRock(ccdCase.physics,initial,spacing,[0,12,0]);ccd.body.setLinvel({x:0,y:-60,z:0},true);const ccdMs=steps(ccdCase.physics,30);result.ccd={enabled:true,stepMs:summary(ccdMs),pose:position(ccd.body),...floorSupport(ccd,ccdCase.floor,ccdCase.physics)};steps(ccdCase.physics,210);result.ccd.settled=floorSupport(ccd,ccdCase.floor,ccdCase.physics);ccdCase.physics.dispose();
    const persistent=[];for(const count of [1,2,4]){const c=freshFloor(),bodies=[];for(let i=0;i<count;i++)bodies.push(createRock(c.physics,initial,spacing,[(i-(count-1)/2)*6,3.5,0]));const ms=steps(c.physics,180);persistent.push({count,stepMs:summary(ms),allFinite:bodies.every(b=>position(b.body).finite),floorContacts:bodies.filter(b=>floorSupport(b,c.floor,c.physics).supported).length,inputBytes:bodies.reduce((n,b)=>n+b.plan.inputBytes,0),snapshotBytes:c.physics.world.takeSnapshot().byteLength,actualDynamicRockCount:bodies.length,support:bodies.map(b=>floorSupport(b,c.floor,c.physics)),processMemory:process.memoryUsage()});c.physics.dispose();}result.persistentRocks=persistent;
    const pairCase=freshFloor(),pair=children.map(f=>createRock(pairCase.physics,f,spacing,[0,3.5,0]));const initialContact=pair[0].collider.contactCollider(pair[1].collider,.01),pairMs=[],pairContacts=[];for(let i=0;i<240;i++){const t=performance.now();pairCase.physics.world.step();pairMs.push(performance.now()-t);pairCase.physics.world.contactPair(pair[0].collider,pair[1].collider,m=>{if(m.numContacts())pairContacts.push({step:i,contacts:m.numContacts(),distance:m.contactDist(0)});});}result.twoChildInteraction={fixtureNames:children.map(f=>f.name),sameParentPose:true,simulationContacts:pairContacts,initialContact:initialContact?{distance:initialContact.distance}:null,stepMs:summary(pairMs),poses:pair.map(p=>position(p.body)),allFinite:pair.every(p=>position(p.body).finite),floorContacts:pair.filter(p=>floorSupport(p,pairCase.floor,pairCase.physics).supported).length};pairCase.physics.dispose();
    const interaction={world:new R.World({x:0,y:0,z:0})};interaction.world.timestep=1/60;
    const delta=children[1].record.localCOM.map((v,i)=>v-children[0].record.localCOM[i]),length=Math.hypot(...delta),direction=delta.map(v=>v/length);
    const aimed=children.map((f,i)=>{const sign=i===0?-1:1,p=createRock(interaction,f,spacing,direction.map(v=>v*sign*1.5));p.body.setLinvel(vec(direction.map(v=>v*-sign*3)),true);return p;});
    let touchingSteps=0,maxPenetration=0;
    for(let tick=0;tick<180;tick++){interaction.world.step();let touched=false;interaction.world.contactPair(aimed[0].collider,aimed[1].collider,m=>{for(let i=0;i<m.numContacts();i++){touched=true;maxPenetration=Math.max(maxPenetration,-m.contactDist(i));}});if(touched)touchingSteps++;}
    result.twoChildApproach={setup:'actual conditioned siblings separated 1.5m along their COM axis, then 3m/s toward each other; zero gravity, CCD, no floor',touchingSteps,maxPenetration,poses:aimed.map(p=>position(p.body)),allFinite:aimed.every(p=>position(p.body).finite)};interaction.world.free();

  } catch(error) { result.hold={status:'HOLD',reason:String(error),dynamicAgainstStaticTrimeshUnsupported:true}; }
  finally { /* each bounded case disposes its own LabPhysics world */ }
  return result;
}

const report={timestamp:new Date().toISOString(),scope:'Phase 0.5A.3 physics-only native voxel collider lifecycle experiment; Surface Nets visible mesh remains unchanged.',
  limits:'No stress/fracture gameplay, material ownership, publication, or shipping runtime changes. A native voxel pair failure is recorded HOLD without a substitute collider.',controls:[run(.25),run(.5)]};
report.decision=report.controls.every(r=>r.dynamicAgainstStaticTrimesh?.supported&&!r.dynamicAgainstStaticTrimesh.fellThrough&&r.ccd?.settled?.supported&&r.ccdTerrain?.supported&&r.floorSleepWake?.naturalSleep&&r.floorSleepWake?.awakeAfterImpulse&&r.twoChildInteraction?.allFinite)
  ?'PASS_CANDIDATE_REVIEW_REQUIRED':'HOLD';
await fs.writeFile(`${out}/dynamics.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({decision:report.decision,controls:report.controls.map(r=>({spacing:r.spacing,hold:r.hold,dynamic:r.dynamicAgainstStaticTrimesh,ccd:r.ccd,persistent:r.persistentRocks}))},null,2));
