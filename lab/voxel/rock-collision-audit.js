// Shared opt-in study gates. Kept identical to the Phase 0.5A.2 probe.
import * as THREE from '../../vendor/three.module.js';
import { auditPreparedRockCollision } from './matter-physics.js';
const vec=p=>({x:p[0],y:p[1],z:p[2]});
export function auditCollisionCandidate(R,world,mesh,record,colliders) {
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
      const walk=predicate=>{
        pb.setTranslation(vec(player.worst.start),true);pb.setNextKinematicTranslation(vec(player.worst.start));world.step();
        for(let tick=0;tick<100;tick++){
          controller.computeColliderMovement(pc,vec(player.worst.direction.map(v=>v*.1)),undefined,undefined,predicate);
          const d=controller.computedMovement(),p=pb.translation();
          pb.setNextKinematicTranslation({x:p.x+d.x,y:p.y+d.y,z:p.z+d.z});world.step();
        }
        const end=pb.translation();return {ticks:100,travel:Math.hypot(...[end.x,end.y,end.z].map((v,i)=>v-player.worst.start[i])),end:{...end}};
      };
      player.steppedCharacterController={proxy:walk(c=>colliders.includes(c)),visible:walk(c=>c.handle===exact.handle)};
      world.removeCharacterController(controller);world.removeRigidBody(pb);
    }
    playerProfiles.push(player);
    }
    const player=playerProfiles[0];world.removeCollider(exact,false);

    // Keep the exact old 2.8555066 m witness separate from each new method's
    // worst ray. Otherwise an improving original ray could hide a new blocker.
    const namedStart=[0,3.5,-5],namedDirection=[0,0,1];
    const namedVisible=new THREE.Raycaster(new THREE.Vector3(...namedStart),new THREE.Vector3(...namedDirection),0,10).intersectObject(visible)[0]?.distance??Infinity;
    const namedProxy=Math.min(...colliders.map(c=>{const d=c.castRay(new R.Ray(vec(namedStart),vec(namedDirection)),10,true);return d!=null&&d>=0?d:Infinity;}));
    const namedRecessRay={start:namedStart,direction:namedDirection,visible:namedVisible,proxy:namedProxy,gap:Math.abs(namedVisible-namedProxy)};
    g.dispose();visible.material.dispose();
    const passes=legacy.passes && audit.maxEarly<=.5 && audit.maxLate<=.5 && !audit.falseSolidRays && !audit.missingSupportRays && playerProfiles.every(p=>p.maxEarly<=.5&&p.maxLate<=.5&&!p.falseSolid&&!p.missingSupport&&(!p.steppedCharacterController||Math.abs(p.steppedCharacterController.proxy.travel-p.steppedCharacterController.visible.travel)<=.5));
    return {legacy,audit,playerProfiles,namedRecessRay,passes};
}
