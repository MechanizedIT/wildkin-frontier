import { planRockColliders, planRockShardHull } from './matter-colliders.js';
import { actorToWorldPoint } from './matter-target.js';
import { ROCK_PROFILE } from './matter-rock-profile.js';
import * as THREE from '../../vendor/three.module.js';

const vec=p=>({x:p[0],y:p[1],z:p[2]});
const arr=p=>[p.x,p.y,p.z];
export function auditPreparedRockCollision(R,mesh,record,colliders,origin=[0,0,0]){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(mesh.positions,3));geometry.setIndex(new THREE.BufferAttribute(mesh.indices,1));
  const visible=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));visible.updateMatrixWorld();
  let compared=0,maxGap=0,worst=null;
  for(const axis of [0,2])for(const sign of [-1,1])for(const y of [2.75,3.5,4.25,5])for(const side of [-.5,0,.5]){
    const start=axis===0?[sign*5,y,side]:[side,y,sign*5],direction=axis===0?[-sign,0,0]:[0,0,-sign];
    const target=new THREE.Raycaster(new THREE.Vector3(...start),new THREE.Vector3(...direction),0,10).intersectObject(visible)[0];
    if(!target)continue;
    const worldStart=actorToWorldPoint(record,start).map((v,i)=>v-origin[i]),worldEnd=actorToWorldPoint(record,start.map((v,i)=>v+direction[i])).map((v,i)=>v-origin[i]);
    const ray=new R.Ray(vec(worldStart),vec(worldEnd.map((v,i)=>v-worldStart[i])));
    const proxy=Math.min(...colliders.map(c=>{const t=c.castRay(ray,10,true);return t!==null&&t!==undefined&&t>=0?t:Infinity;}));
    const gap=Math.abs(target.distance-proxy);compared++;
    if(gap>maxGap){maxGap=gap;worst={start,direction,visible:target.distance,proxy};}
  }
  geometry.dispose();visible.material.dispose();
  return {compared,maxGap,worst,passes:compared>=6&&maxGap<=.5};
}
export class CellularRockPhysics {
  constructor(R){
    this.R=R;this.world=new R.World({x:0,y:-20,z:0});this.world.timestep=1/60;
    this.floor=this.world.createCollider(R.ColliderDesc.cuboid(64,.5,64).setTranslation(0,-.5,0).setFriction(.9));
    this.worldProduct=null;this.actors=new Map();this.shards=new Map();this.origin=[0,0,0];
  }
  prepareWorld(mesh,revision){
    const collider=mesh.indices.length?this.world.createCollider(this.R.ColliderDesc.trimesh(mesh.positions,mesh.indices).setTranslation(...this.origin.map(v=>-v)).setEnabled(false)):null;
    return {collider,revision};
  }
  prepareActor(record,mesh){
    const hulls=planRockColliders(mesh,record.localCOM),p=record.position.map((v,i)=>v-this.origin[i]);
    const body=this.world.createRigidBody(this.R.RigidBodyDesc.dynamic().setTranslation(...p).setRotation(record.rotation).setLinearDamping(.7).setAngularDamping(.7).setCcdEnabled(true).setCanSleep(true));
    body.setEnabled(false);
    const colliders=[];
    try{
      for(const points of hulls){const descriptor=this.R.ColliderDesc.convexHull(points);
        if(!descriptor)throw new Error('Degenerate rock convex hull');
        colliders.push(this.world.createCollider(descriptor.setDensity(.6).setFriction(.85),body));
      }
      if(colliders.length>8)throw new Error('Eight collider limit');
      body.setLinvel(vec(record.linearVelocity),false);body.setAngvel(vec(record.angularVelocity),false);
      return {id:record.id,body,colliders,revision:record.contentRevision,hullCount:colliders.length,sleepState:record.sleepState,
        proxyPolicy:'bounded convex gameplay proxy; scalar surface remains mining authority'};
    }catch(error){this.world.removeRigidBody(body);throw error;}
  }
  prepareShard(id,record,mesh){
    if(this.shards.size>=ROCK_PROFILE.maxTransientShardBodies)throw new Error('Transient shard body budget');
    const points=planRockShardHull(mesh);if(!points)return null;
    const p=record.position.map((v,i)=>v-this.origin[i]),body=this.world.createRigidBody(this.R.RigidBodyDesc.dynamic().setTranslation(...p)
      .setRotation(record.rotation).setLinearDamping(.25).setAngularDamping(.4).setCcdEnabled(true));body.setEnabled(false);
    try{
      const descriptor=this.R.ColliderDesc.convexHull(points);if(!descriptor){this.world.removeRigidBody(body);return null;}
      const collider=this.world.createCollider(descriptor.setDensity(.35).setFriction(.65),body);
      const center=[0,0,0],n=mesh.positions.length/3;for(let i=0;i<mesh.positions.length;i+=3)for(let a=0;a<3;a++)center[a]+=mesh.positions[i+a]/n;
      const from=actorToWorldPoint(record,center),to=actorToWorldPoint(record,record.localHit),direction=to.map((v,i)=>v-from[i]);
      const length=Math.hypot(...direction)||1,impulse=direction.map(v=>v/length*ROCK_PROFILE.shardImpulse);
      body.setLinvel(vec(record.linearVelocity.map((v,i)=>v+impulse[i]+(i===1?.6:0))),false);
      body.setAngvel(vec(record.angularVelocity.map((v,i)=>v+(i===2?.9:0))),false);
      return {id,body,colliders:[collider],lifetime:ROCK_PROFILE.transientShardLifetimeSeconds,creditedQuantity:record.creditedQuantity,material:record.material};
    }catch(error){this.world.removeRigidBody(body);throw error;}
  }
  discard(product){if(!product)return;if(product.body)this.world.removeRigidBody(product.body);else if(product.collider)this.world.removeCollider(product.collider,true);}
  installWorld(product){const old=this.worldProduct;product.collider?.setEnabled(true);this.worldProduct=product;this.discard(old);this.world.propagateModifiedBodyPositionsToColliders();}
  installActors(products,retired=[]){
    const previous=new Map(this.actors);
    for(const product of products){product.body.setEnabled(true);if(product.sleepState==='SLEEPING')product.body.sleep();this.actors.set(product.id,product);}
    for(const id of retired)if(!products.some(p=>p.id===id))this.actors.delete(id);
    for(const [id,old] of previous)if(products.some(p=>p.id===id)||retired.includes(id))this.discard(old);
    this.world.propagateModifiedBodyPositionsToColliders();
  }
  installShard(product){if(!product)return;product.body.setEnabled(true);this.shards.set(product.id,product);}
  shardPose(id){const product=this.shards.get(id);if(!product)return null;const p=arr(product.body.translation());return {position:p.map((v,i)=>v+this.origin[i]),rotation:{...product.body.rotation()}};}
  pose(id){const product=this.actors.get(id);if(!product)return null;const body=product.body,p=arr(body.translation());
    return {position:p.map((v,i)=>v+this.origin[i]),rotation:{...body.rotation()},linearVelocity:arr(body.linvel()),angularVelocity:arr(body.angvel()),
      sleepState:body.isSleeping()?'SLEEPING':'ACTIVE'};
  }
  step(){this.world.step();const expired=[];for(const [id,shard] of this.shards){shard.lifetime-=this.world.timestep;if(shard.lifetime<=0){this.shards.delete(id);this.discard(shard);expired.push(id);}}
    return expired;}
  shiftOrigin(next){const delta=next.map((v,i)=>v-this.origin[i]);this.world.forEachRigidBody(body=>{
    const p=body.translation();body.setTranslation({x:p.x-delta[0],y:p.y-delta[1],z:p.z-delta[2]},false);
  });for(const collider of [this.floor,this.worldProduct?.collider])if(collider){const p=collider.translation();collider.setTranslation({x:p.x-delta[0],y:p.y-delta[1],z:p.z-delta[2]});}
    this.origin=[...next];this.world.propagateModifiedBodyPositionsToColliders();}
  dispose(){this.world.free();}
}
