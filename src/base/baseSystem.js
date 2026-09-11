import * as THREE from 'three';
import { BASE_CONFIG, BASE_EXPANSIONS, BASE_PIECES, BASE_PIECE_BY_ID, FIELD_RECIPES, canAfford, formatCost } from './baseCatalog.js';
import { getBuildBounds, getCampReserved, validatePlacement } from './basePlacement.js';
import { getSurfaceHeight } from '../world/terrainSurfaceModel.js';
import { createBasePieceVisual } from './basePieceVisual.js';

const REASONS={
  'outside-clearing':'Aim inside the marked clearing.', 'player-overlap':'Leave room around your feet.',
  'keep-path-clear':'Keep Camp objects and paths clear.', 'structure-overlap':'Another piece is in the way.',
  'uneven-ground':'Choose flatter ground.', 'wet-ground':'Choose dry ground.', 'structure-limit':'Your Camp has 64 pieces.',
  'unaffordable':'Gather and extract the materials shown.', 'workbench-required':'Place a field workbench first.',
  'remove-supported-first':'Remove the pieces on this foundation first.', 'storage-write-failed':'Could not save. Your materials were kept.',
  'supply-limit':'Your supply pouch is full.', 'max-tier':'Your clearing is fully expanded.',
};
export function createBaseSystem({app,scene,camera,progress,registry,physicsWorld,getPlayerState,isCamp,onBlockingChanged=()=>{},toast=()=>{},initialHidden=false}){
  const root=new THREE.Group();root.name='player-base';scene.add(root);
  const surface=registry.getSectionById('camp')?.surface??null,reserved=getCampReserved(registry);
  const instances=new Map(),world=physicsWorld?.world,RAPIER=physicsWorld?.RAPIER;
  let active=false,type='foundation',yaw=0,target={x:0,y:0,z:18},candidate=null,signature='',poll=0,lastCamp=null,suppressed=initialHidden;
  const campActive=()=>isCamp()&&!suppressed;
  const previewMaterial=new THREE.MeshStandardMaterial({color:0x87edbc,transparent:true,opacity:.5,depthWrite:false,roughness:1,metalness:0});
  const preview=new THREE.Group();preview.name='base-placement-preview';preview.visible=false;scene.add(preview);
  let previewModel=null;
  function clearPreviewModel(){
    if(!previewModel)return;
    if(previewModel.userData.ownsBaseResources)previewModel.traverse(n=>n.geometry?.dispose());
    previewModel.removeFromParent();previewModel=null;
  }
  function showPreviewModel(piece){
    clearPreviewModel();previewModel=createBasePieceVisual(piece,registry.data.visualAssets);
    const owned=previewModel.userData.ownsBaseResources;
    previewModel.traverse(n=>{if(!n.isMesh)return;if(owned)for(const m of [].concat(n.material??[]))m.dispose();n.material=previewMaterial;n.castShadow=false;n.receiveShadow=false;});
    preview.add(previewModel);
  }
  const edgeMaterial=new THREE.LineBasicMaterial({color:0xf3cd77,transparent:true,opacity:.85});
  const clearing=new THREE.LineLoop(new THREE.BufferGeometry(),edgeMaterial);scene.add(clearing);clearing.visible=false;
  const panel=document.createElement('div');panel.className='base-placement';panel.hidden=true;
  panel.innerHTML='<div class="base-aim" aria-label="Aim building on ground"></div><div class="base-caption"><strong></strong><span></span></div><div class="base-tools"><button data-base="cancel">✕ Cancel</button><button data-base="rotate">↻ Rotate</button><button data-base="place">✓ Place</button></div>';
  app.append(panel);const aim=panel.querySelector('.base-aim'),title=panel.querySelector('strong'),hint=panel.querySelector('.base-caption span'),confirm=panel.querySelector('[data-base="place"]');
  const raycaster=new THREE.Raycaster(),ndc=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),point=new THREE.Vector3();
  let pointer=null;
  function aimAt(event){
    const rect=app.getBoundingClientRect();ndc.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(ndc,camera);plane.constant=-target.y;
    for(let i=0;i<4;i++){if(!raycaster.ray.intersectPlane(plane,point))return;plane.constant=-getSurfaceHeight(surface,point.x,point.z);}
    target={x:Math.round(point.x*10)/10,y:point.y,z:Math.round(point.z*10)/10};refreshPreview();
  }
  aim.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();pointer=e.pointerId;aim.setPointerCapture(e.pointerId);aimAt(e);});
  aim.addEventListener('pointermove',e=>{if(pointer!==e.pointerId)return;e.preventDefault();e.stopPropagation();aimAt(e);});
  for(const event of ['pointerup','pointercancel'])aim.addEventListener(event,e=>{e.stopPropagation();pointer=null;});
  panel.addEventListener('pointerdown',e=>e.stopPropagation());panel.addEventListener('pointerup',e=>e.stopPropagation());
  panel.addEventListener('click',e=>{const action=e.target.closest('[data-base]')?.dataset.base;if(action==='cancel')close();if(action==='rotate'){yaw+=Math.PI/4;refreshPreview();}if(action==='place')place();});
  function keydown(e){if(!active)return;if(e.key==='Escape'){e.preventDefault();close();}if(e.key.toLowerCase()==='r'){e.preventDefault();yaw+=Math.PI/4;refreshPreview();}if(e.key==='Enter'){e.preventDefault();place();}}
  window.addEventListener('keydown',keydown);
  const loseFocus=()=>{if(document.hidden)close();};document.addEventListener('visibilitychange',loseFocus);window.addEventListener('blur',close);
  function createInstance(record){
    const piece=BASE_PIECE_BY_ID[record.type];
    const visual=createBasePieceVisual(piece,registry.data.visualAssets);
    visual.position.set(record.pos.x,record.pos.y,record.pos.z);visual.rotation.y=record.yaw;visual.name=record.id;root.add(visual);
    const colliders=[];
    // A real doorway has two posts and a lintel, never an invisible full wall.
    const boxes=record.type==='doorway'?[[.42,2.25,.3,-1.09,1.125,0],[.42,2.25,.3,1.09,1.125,0],[1.76,.3,.3,0,2.1,0]]:[[...piece.size,0,piece.size[1]/2,0]];
    if(world&&RAPIER)for(const [w,h,d,x,y,z]of boxes){const c=Math.cos(record.yaw),s=Math.sin(record.yaw),desc=RAPIER.ColliderDesc.cuboid(w/2,h/2,d/2).setTranslation(record.pos.x+x*c+z*s,record.pos.y+y,record.pos.z-x*s+z*c).setRotation({x:0,y:Math.sin(record.yaw/2),z:0,w:Math.cos(record.yaw/2)}).setFriction(.6).setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);const collider=world.createCollider(desc);collider.setEnabled(campActive());colliders.push(collider);}
    return {visual,colliders,record,ownsResources:visual.userData.ownsBaseResources};
  }
  function removeInstance(instance){root.remove(instance.visual);for(const collider of instance.colliders)world?.removeCollider(collider,true);if(instance.ownsResources)instance.visual.traverse(n=>{n.geometry?.dispose();if(n.material)for(const m of [].concat(n.material))m.dispose();});/* Library geometry/materials are shared factory caches. */}
  function sync(){
    const base=progress.getBaseState(),next=JSON.stringify(base);if(next===signature)return;signature=next;
    for(const instance of instances.values())removeInstance(instance);instances.clear();for(const record of base.structures)instances.set(record.id,createInstance(record));
    const b=getBuildBounds(base.tier),points=[[b.minX,b.minZ],[b.maxX,b.minZ],[b.maxX,b.maxZ],[b.minX,b.maxZ]].map(([x,z])=>new THREE.Vector3(x,getSurfaceHeight(surface,x,z)+.08,z));
    clearing.geometry.dispose();clearing.geometry=new THREE.BufferGeometry().setFromPoints(points);if(active)refreshPreview();
  }
  function refreshPreview(){
    if(!active)return;const piece=BASE_PIECE_BY_ID[type],base=progress.getBaseState();
    candidate=validatePlacement({type,pos:target,yaw},{...base,surface,reserved,playerPosition:getPlayerState().pos});
    if(candidate.ok&&!canAfford(progress.getBankedResources(),piece.cost))candidate={ok:false,reason:'unaffordable'};
    const y=candidate.pos?.y??getSurfaceHeight(surface,target.x,target.z);preview.position.set(target.x,y,target.z);preview.rotation.y=yaw;previewMaterial.color.setHex(candidate.ok?0x87edbc:0xff7365);
    title.textContent=`${piece.icon} ${piece.name} · ${formatCost(piece.cost)}`;hint.textContent=candidate.ok?'✓ Ready · drag the ground to position':`✕ ${REASONS[candidate.reason]??'Choose another spot.'}`;confirm.disabled=!candidate.ok;
  }
  function open(pieceType='foundation'){
    if(!campActive())return {ok:false,message:'Build at Camp after extracting.'};if(!BASE_PIECE_BY_ID[pieceType])return {ok:false,message:'Unknown building piece.'};
    const pos=getPlayerState().pos,b=getBuildBounds(progress.getBaseState().tier);
    if(pos.x<b.minX-3||pos.x>b.maxX+3||pos.z<b.minZ-3||pos.z>b.maxZ+3)return {ok:false,message:'Walk to the open clearing south of Camp, beyond the drop pod, then open Build.'};
    type=pieceType;yaw=0;showPreviewModel(BASE_PIECE_BY_ID[type]);target={x:pos.x+2.5,y:pos.y,z:pos.z};active=true;panel.hidden=false;preview.visible=true;clearing.visible=true;app.classList.add('base-building');onBlockingChanged();refreshPreview();return {ok:true};
  }
  function close(){if(!active)return;active=false;pointer=null;panel.hidden=true;preview.visible=false;app.classList.remove('base-building');onBlockingChanged();}
  function place(){
    if(!active||!isCamp())return;refreshPreview();if(!candidate?.ok)return;
    const id=`build_${globalThis.crypto?.randomUUID?.()??`${Date.now()}_${Math.random().toString(36).slice(2,8)}`}`;
    const result=progress.placeStructure({id,type,pos:target,yaw},{playerPosition:getPlayerState().pos});
    if(result.placed){sync();toast('Camp built',`${BASE_PIECE_BY_ID[type].name} placed.`);close();}else{toast('Camp',REASONS[result.reason]??result.reason);refreshPreview();}
  }
  function getModel(){
    const base=progress.getBaseState(),bank=progress.getBankedResources(),supplies=progress.getFieldSupplies(),hasWorkbench=base.structures.some(p=>p.type==='workbench');
    return {tier:base.tier,maxStructures:BASE_CONFIG.maxStructures,bounds:getBuildBounds(base.tier),structures:base.structures.map(p=>({...p,name:BASE_PIECE_BY_ID[p.type].name,icon:BASE_PIECE_BY_ID[p.type].icon})),fieldSupplies:supplies,hasWorkbench,
      pieces:BASE_PIECES.map(p=>({...p,costLabel:formatCost(p.cost),affordable:canAfford(bank,p.cost),action:'beginBuild'})),
      recipes:FIELD_RECIPES.map(r=>({...r,count:supplies[r.id],costLabel:formatCost(r.cost),affordable:canAfford(bank,r.cost),locked:r.workbench&&!hasWorkbench,action:'craftFieldSupply'})),
      nextExpansion:BASE_EXPANSIONS[base.tier]?{cost:BASE_EXPANSIONS[base.tier],costLabel:formatCost(BASE_EXPANSIONS[base.tier]),affordable:canAfford(bank,BASE_EXPANSIONS[base.tier])}:null};
  }
  function onAction(action,payload){
    if(!campActive())return {ok:false,message:'Return to Camp first.'};if(action==='beginBuild')return open(payload);
    let result,ok,message;
    if(action==='craftFieldSupply'){result=progress.craftFieldSupply(payload);ok=result.crafted;message='Field supply packed.';}
    else if(action==='expandBase'){result=progress.expandBase();ok=result.expanded;message='Your clearing is larger.';}
    else if(action==='removeStructure'){result=progress.removeStructure(payload);ok=result.removed;message='Piece removed. Materials returned.';}
    else return null;
    if(ok)sync();return {ok,message:ok?message:REASONS[result.reason]??'Unable to complete that action.'};
  }
  sync();return {open,close,isBlocking:()=>active,getModel,onAction,
    update(dt,{hidden=false}={}){suppressed=hidden;const camp=campActive();root.visible=camp;clearing.visible=camp;edgeMaterial.opacity=active?.85:.38;if(lastCamp!==camp){lastCamp=camp;for(const instance of instances.values())for(const collider of instance.colliders)collider.setEnabled(camp);if(!camp)close();}poll+=dt;if(poll>.3){poll=0;sync();if(active)refreshPreview();}},
    getNearbyInteraction(pos){if(!isCamp())return null;for(const instance of instances.values())if(instance.record.type==='workbench'&&Math.hypot(pos.x-instance.record.pos.x,pos.z-instance.record.pos.z)<2.4)return {type:'campWorkbench',id:instance.record.id,label:'Craft'};return null;},
    getRestPosition:()=>{const bed=progress.getBaseState().structures.find(p=>p.type==='bed');return bed?{...bed.pos}:null;},
    dispose(){close();window.removeEventListener('keydown',keydown);document.removeEventListener('visibilitychange',loseFocus);window.removeEventListener('blur',close);for(const instance of instances.values())removeInstance(instance);instances.clear();root.removeFromParent();clearPreviewModel();preview.removeFromParent();clearing.removeFromParent();previewMaterial.dispose();clearing.geometry.dispose();edgeMaterial.dispose();panel.remove();},
  };
}
