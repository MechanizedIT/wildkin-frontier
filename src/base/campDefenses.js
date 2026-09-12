import * as THREE from 'three';
import { createExternalModelVisual, disposeExternalModelInstance } from '../assets/modelAssetRuntime.js';
import { getSurfaceHeight } from '../world/terrainSurfaceModel.js';
import { CAMP_DEBRIS, getCampBuildAreas, getCampPerimeter, getCampYardConsole } from './campLayout.js';

export const CAMP_DEFENSE_CONFIG = Object.freeze({ panelAssetId: 'asset_emergency_barricade', pitch: 2.8, height: 1.7, groundInset: .015 });
const BRACE_YZ = [[0,-.13],[0,.62],[.13,.62],[.97,.22],[.97,.13]];
const inside = (areas,x,z) => areas.some(a => x > a.minX && x < a.maxX && z > a.minZ && z < a.maxZ);

// GLB axes: X along the panel, +Z toward the exterior buttresses, Y up.
// Straight panels already have end uprights: adding corner posts on top would
// stack three fittings at each turn. Butt adjacent complete modules instead.
export function getCampDefensePlacements(base,surface=null) {
  const areas=getCampBuildAreas(base), result=[];
  for(const segment of getCampPerimeter(base)) {
    const dx=segment.b.x-segment.a.x,dz=segment.b.z-segment.a.z,length=Math.hypot(dx,dz);
    const x=(segment.a.x+segment.b.x)/2,z=(segment.a.z+segment.b.z)/2;
    let yaw=Math.atan2(-dz,dx);
    if(inside(areas,x+Math.sin(yaw)*.1,z+Math.cos(yaw)*.1))yaw+=Math.PI;
    const count=Math.max(1,Math.round(length/CAMP_DEFENSE_CONFIG.pitch),Math.ceil(length/(CAMP_DEFENSE_CONFIG.pitch*1.12))),span=length/count;
    for(let i=0;i<count;i++) {
      const px=segment.a.x+dx*(i+.5)/count,pz=segment.a.z+dz*(i+.5)/count;
      const scaleX=span/CAMP_DEFENSE_CONFIG.pitch,c=Math.cos(yaw),s=Math.sin(yaw);
      // Seat every outboard shoe and both ends in the terrain. Sampling only
      // the center would leave a foot hanging above a berm's descending edge.
      let ground=Infinity;
      for(const lx of [-1.4,-1.22,0,1.22,1.4])for(const lz of [-.2,0,.37,.64])
        ground=Math.min(ground,getSurfaceHeight(surface,px+lx*scaleX*c+lz*s,pz-lx*scaleX*s+lz*c));
      result.push({id:`camp-defense-${segment.id}-${i}`,segmentId:segment.id,x:px,y:ground-CAMP_DEFENSE_CONFIG.groundInset,z:pz,yaw,scaleX,span});
    }
  }
  return result;
}

export function createCampDefenses({scene,registry,physicsWorld,onVisualAdded=()=>{},onVisualRemoving=()=>{}}) {
  const root=new THREE.Group();root.name='camp-defenses';root.visible=false;scene.add(root);
  const surface=registry.getSectionById('camp')?.surface??null;
  const world=physicsWorld?.world,RAPIER=physicsWorld?.RAPIER,instances=new Map();
  const geometry=new THREE.BoxGeometry(1,1,1);
  const materials=Object.fromEntries(Object.entries({dark:0x354b50,ivory:0xd6ceac,orange:0xe88a36,mint:0x77cbbb}).map(([key,color])=>[key,new THREE.MeshLambertMaterial({color,flatShading:true})]));
  let visible=false,disposed=false,pendingBase=null,consoleVisual=null,consoleAnchor=null;
  function box(parent,size,pos,color) {
    const mesh=new THREE.Mesh(geometry,materials[color]);mesh.scale.set(...size);mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function collider(instance,desc) {
    desc.setFriction(.6).setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
    const shape=world.createCollider(desc);shape.setEnabled(visible);physicsWorld?.registerCameraCollider?.(shape);instance.colliders.push(shape);
  }
  function panelColliders(instance,p) {
    if(!world||!RAPIER)return;
    const c=Math.cos(p.yaw),s=Math.sin(p.yaw),rotation={x:0,y:Math.sin(p.yaw/2),z:0,w:Math.cos(p.yaw/2)};
    const cuboid=(size,center)=>collider(instance,RAPIER.ColliderDesc.cuboid(size[0]*p.scaleX/2,size[1]/2,size[2]/2)
      .setTranslation(p.x+center[0]*p.scaleX*c+center[2]*s,p.y+center[1],p.z-center[0]*p.scaleX*s+center[2]*c).setRotation(rotation));
    cuboid([2.8,1.7,.4],[0,.85,0]);
    for(const x of [-1.22,1.22]) {
      cuboid([.3,.12,.54],[x,.06,.37]);
      const vertices=[];
      for(const xx of [x-.12,x+.12])for(const [y,z]of BRACE_YZ)vertices.push(xx*p.scaleX,y,z);
      const hull=RAPIER.ColliderDesc.convexHull(new Float32Array(vertices));
      if(!hull)throw Error('Invalid Camp barricade brace hull');
      collider(instance,hull.setTranslation(p.x,p.y,p.z).setRotation(rotation));
    }
  }
  function create(record) {
    let visual;
    if(record.kind==='panel') {
      const asset=registry.data.visualAssets.find(a=>a.id===CAMP_DEFENSE_CONFIG.panelAssetId);
      if(!asset?.model)throw Error('Camp emergency barricade model is not registered');
      visual=createExternalModelVisual(asset);visual.rotation.y=record.yaw;visual.scale.x=record.scaleX;
    } else {
      visual=new THREE.Group();
      if(record.kind==='console') {
        box(visual,[.62,.12,.55],[0,.06,0],'dark');
        box(visual,[.38,.76,.3],[0,.5,0],'ivory');
        box(visual,[.58,.35,.42],[0,.97,0],'dark');
        box(visual,[.64,.09,.46],[0,1.19,0],'orange');
        box(visual,[.39,.17,.018],[0,1,-.22],record.expanded?'mint':'orange');
        for(let i=0;i<3;i++)box(visual,[.07,.045,.02],[(i-1)*.13,.87,-.22],i<record.cleared?'mint':'ivory');
      } else {
        box(visual,[.09,.7,.09],[0,.35,0],'dark');
        box(visual,[.14,.25,.14],[0,.125,0],'ivory');
        box(visual,[.22,.2,.18],[0,.76,0],'orange');
      }
    }
    visual.name=record.id;visual.position.set(record.x,record.y,record.z);root.add(visual);
    const instance={visual,record,signature:JSON.stringify(record),colliders:[]};
    if(record.kind==='panel')panelColliders(instance,record);
    else if(record.kind==='console'&&world&&RAPIER)collider(instance,RAPIER.ColliderDesc.cuboid(.32,.64,.28).setTranslation(record.x,record.y+.64,record.z));
    onVisualAdded(visual);return instance;
  }
  function remove(instance) {
    onVisualRemoving(instance.visual);
    for(const shape of instance.colliders){physicsWorld?.unregisterCameraCollider?.(shape);world?.removeCollider(shape,true);}
    if(instance.record.kind==='panel')disposeExternalModelInstance(instance.visual);
    else instance.visual.removeFromParent();
  }
  function sync(base) {
    if(disposed)return;
    // Author worlds may lack this game-only model family. Defer construction
    // while suppressed, and retain a snapshot rather than mutable save state.
    pendingBase=structuredClone(base);
    if(!visible)return;
    const records=getCampDefensePlacements(base,surface).map(p=>({...p,kind:'panel'}));
    const anchor=getCampYardConsole(base),layout=base.layout;
    consoleAnchor=anchor?{...anchor,y:getSurfaceHeight(surface,anchor.x,anchor.z)}:null;
    if(consoleAnchor)records.push({id:'camp-yard-console',kind:'console',...consoleAnchor,expanded:!!layout?.yardExpanded,cleared:layout?.clearedDebrisIds.length??0});
    if(!layout?.yardExpanded)for(const debris of CAMP_DEBRIS)if(!layout?.clearedDebrisIds.includes(debris.id)) {
      const x=debris.pos.x-1.9,z=debris.pos.z+.7;
      records.push({id:`camp-stake-${debris.id}`,kind:'stake',x,z,y:getSurfaceHeight(surface,x,z)-.015});
    }
    const next=new Map(records.map(record=>[record.id,record]));let changed=false;
    for(const [id,instance]of instances)if(instance.signature!==JSON.stringify(next.get(id))){remove(instance);instances.delete(id);changed=true;}
    for(const record of records)if(!instances.has(record.id)){instances.set(record.id,create(record));changed=true;}
    consoleVisual=instances.get('camp-yard-console')?.visual??null;
    // Propagation alone does not refresh Rapier scene-query broadphase.
    if(changed)world?.step();
  }
  function setVisible(next) {
    if(disposed||visible===!!next)return;
    visible=!!next;root.visible=visible;
    for(const instance of instances.values())for(const shape of instance.colliders)shape.setEnabled(visible);
    // sync can add/remove colliders and owns that one broadphase refresh. If
    // only enable flags changed, a step is still necessary for immediate rays.
    if(visible&&pendingBase) {
      const before=[...instances.values()];sync(pendingBase);
      if(before.length===instances.size&&before.every(i=>instances.get(i.record.id)===i))world?.step();
    } else if(instances.size)world?.step();
  }
  return {sync,setVisible,
    getConsoleAnchor:()=>visible&&consoleAnchor?{...consoleAnchor}:null,
    getConsoleVisual:()=>visible?consoleVisual:null,
    dispose(){if(disposed)return;disposed=true;const hadColliders=[...instances.values()].some(i=>i.colliders.length);for(const instance of instances.values())remove(instance);instances.clear();root.removeFromParent();geometry.dispose();Object.values(materials).forEach(material=>material.dispose());consoleVisual=null;consoleAnchor=null;pendingBase=null;if(hadColliders)world?.step();},
  };
}
