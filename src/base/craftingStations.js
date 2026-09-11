import * as THREE from 'three';
import { BASE_PIECE_BY_ID, canAfford } from './baseCatalog.js';
import { STATION_RECIPE_IDS, getStationRecipe } from './stationCatalog.js';
import { createStationMotion } from './stationMotion.js';
import { createStationPanel } from './stationPanel.js';
import { createCraftOutputVisual, disposeCraftOutput } from './craftOutputVisual.js';
import { projectInteractionPoint } from '../ui/worldInteractionAnchor.js';

const REACH=3.2;
// One presentation owner for nearby physical machines. Inventory stays in progress.
export function createCraftingStations({app,camera,progress,getPlayerState,isCamp,onBlockingChanged=()=>{},notify=()=>{}}){
  const stations=new Map(),point=new THREE.Vector3(),screenPoint={};
  let selectedId=null,paused=false;
  const distance=entry=>Math.hypot(getPlayerState().pos.x-entry.record.pos.x,getPlayerState().pos.z-entry.record.pos.z);
  const panel=createStationPanel({app,getModel:panelModel,onCraft:craft,onClose:()=>{selectedId=null;onBlockingChanged();}});
  function count(id,state){return id==='medkit'?state.craftedConsumables.medkit:state.fieldSupplies[id]??0;}
  function panelModel(){
    const entry=stations.get(selectedId);if(!entry||!isCamp()||distance(entry)>REACH+.7)return null;
    const state=progress.getState(),bank=state.bankedResources,motion=entry.motion?.getState(),piece=BASE_PIECE_BY_ID[entry.record.type];
    point.set(entry.record.pos.x,entry.record.pos.y+piece.size[1]+.18,entry.record.pos.z);
    const rect=app.getBoundingClientRect(),projected=projectInteractionPoint(point,camera,rect.width,rect.height,screenPoint);
    return {id:selectedId,name:piece.name,operating:entry.motion?.isOperating()??false,progress:motion?.progress??0,
      completedLabel:entry.completedLabel,screenPoint:projected??null,
      recipes:STATION_RECIPE_IDS[entry.record.type].map(id=>{const recipe=getStationRecipe(id);return {...recipe,count:count(id,state),available:!paused&&canAfford(bank,recipe.cost)&&!entry.motion?.isOperating(),reason:canAfford(bank,recipe.cost)?'':'Bring these materials in your pack or selected nearby storage.'};})};
  }
  function craft(id){
    const reject=message=>{notify(message);return {ok:false,message};};
    const entry=stations.get(selectedId);
    if(!entry||!isCamp()||paused||distance(entry)>REACH||!STATION_RECIPE_IDS[entry.record.type]?.includes(id))return reject('Stand beside the matching station.');
    if(entry.motion?.isOperating())return reject('This station is finishing its current item.');
    const result=id==='medkit'?progress.craftConsumable(id):progress.craftFieldSupply(id);
    if(!result.crafted)return reject(result.reason==='storage-write-failed'?'Could not save. Your materials were kept.':result.reason==='output-full'?'Make room in your backpack.':'Bring the materials in your pack or selected nearby storage.');
    disposeCraftOutput(entry.output);entry.output=createCraftOutputVisual(id);entry.output.visible=false;entry.completedLabel='';
    const anchor=entry.visual.getObjectByName('CraftOutputAnchor');
    if(anchor){
      anchor.add(entry.output);
      // The chime lies on the existing left deck annulus, clear of the central
      // reactor and front controls. It is a product, not a floating UI marker.
      if(entry.record.type==='resonance'){entry.output.scale.setScalar(.6);entry.output.rotation.x=-Math.PI/2;entry.output.position.set(-.55,-.58,.17);}
    }
    else {entry.visual.add(entry.output);entry.output.position.set(0,.78,0);}
    entry.outputId=id;
    if(!entry.motion?.play({outputId:id}))complete(entry);
    return {ok:true};
  }
  function complete(entry){
    if(entry.output)entry.output.visible=true;
    entry.completedLabel=`${getStationRecipe(entry.outputId)?.name??'Item'} packed`;
  }
  function remove(entry){entry.motion?.dispose();disposeCraftOutput(entry.output);}
  return {
    sync(instances){
      for(const [id,entry]of stations)if(instances.get(id)?.visual!==entry.visual){remove(entry);stations.delete(id);}
      for(const [id,instance]of instances)if(STATION_RECIPE_IDS[instance.record.type]&&!stations.has(id))stations.set(id,{...instance,motion:createStationMotion(instance.visual,instance.record.type==='workbench'?'salvage':instance.record.type),output:null,outputId:null,completedLabel:''});
      if(selectedId&&!stations.has(selectedId))panel.close();
    },
    open(id){const entry=stations.get(id);if(!entry||!isCamp()||distance(entry)>REACH)return false;selectedId=id;panel.open();onBlockingChanged();return true;},
    close(){panel.close();},isOpen:()=>panel.isOpen(),
    getNearbyInteraction(pos){
      let nearest=null,best=REACH;
      if(!isCamp())return null;
      for(const [id,entry]of stations){const d=Math.hypot(pos.x-entry.record.pos.x,pos.z-entry.record.pos.z);if(d<best){best=d;nearest={type:'campWorkbench',id,label:BASE_PIECE_BY_ID[entry.record.type].name};}}
      return nearest;
    },
    update(dt,{hidden=false,paused:pause=false,reducedMotion=false}={}){
      paused=pause;
      if(paused)panel.close();
      if(hidden||!isCamp()){panel.close();for(const entry of stations.values()){entry.motion?.reset();disposeCraftOutput(entry.output);entry.output=null;entry.completedLabel='';}return;}
      for(const entry of stations.values())if(entry.motion?.update(dt,{paused,reducedMotion}))complete(entry);
      panel.update();
    },
    dispose(){panel.dispose();for(const entry of stations.values())remove(entry);stations.clear();},
  };
}
