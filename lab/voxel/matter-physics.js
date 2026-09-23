import { planRockColliders } from './matter-colliders.js';

const vec=p=>({x:p[0],y:p[1],z:p[2]});
const arr=p=>[p.x,p.y,p.z];
export class CellularRockPhysics {
  constructor(R){
    this.R=R;this.world=new R.World({x:0,y:-20,z:0});this.world.timestep=1/60;
    this.floor=this.world.createCollider(R.ColliderDesc.cuboid(64,.5,64).setTranslation(0,-.5,0).setFriction(.9));
    this.worldProduct=null;this.actors=new Map();this.origin=[0,0,0];
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
      return {id:record.id,body,colliders,revision:record.contentRevision,hullCount:colliders.length,sleepState:record.sleepState};
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
  pose(id){const product=this.actors.get(id);if(!product)return null;const body=product.body,p=arr(body.translation());
    return {position:p.map((v,i)=>v+this.origin[i]),rotation:{...body.rotation()},linearVelocity:arr(body.linvel()),angularVelocity:arr(body.angvel()),
      sleepState:body.isSleeping()?'SLEEPING':'ACTIVE'};
  }
  step(){this.world.step();}
  shiftOrigin(next){const delta=next.map((v,i)=>v-this.origin[i]);this.world.forEachRigidBody(body=>{
    const p=body.translation();body.setTranslation({x:p.x-delta[0],y:p.y-delta[1],z:p.z-delta[2]},false);
  });for(const collider of [this.floor,this.worldProduct?.collider])if(collider){const p=collider.translation();collider.setTranslation({x:p.x-delta[0],y:p.y-delta[1],z:p.z-delta[2]});}
    this.origin=[...next];this.world.propagateModifiedBodyPositionsToColliders();}
  dispose(){this.world.free();}
}
