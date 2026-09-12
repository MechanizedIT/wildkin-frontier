import {ROOTFALL_CONFIG as CONFIG,rootfallPoint} from './rootfallConfig.js';

// Coordination only. Resource nodes own hit/yield state; progress owns saved
// cuts and repair. Geometry/physics derive this state in the passage presenter.
export function createRootfallPassage({registry,progress,resources,getSectionId,getPlayerPosition,repairGate,notify=()=>{},initialHidden=false}){
  const gate=registry.getPortalGateById(CONFIG.gateId);
  const nodes=resources.getNodes().filter(node=>CONFIG.cutIds.includes(node.id));
  const leftRoot=registry.getSectionById?.(CONFIG.sectionId)?.props?.find(prop=>prop.id===CONFIG.props.left);
  const enabled=!!gate&&nodes.length===CONFIG.cutIds.length;
  let hidden=initialHidden,signature=null,warningCooldown=0;
  function getState(){
    if(!enabled)return {enabled:false,hidden,active:false,repaired:false,cutIds:[],ready:false,anchor:null};
    const repaired=gate.state==='active'||progress.isPortalGateRepaired(CONFIG.gateId);
    const cutIds=CONFIG.cutIds.filter(id=>repaired||progress.isPoiCompleted(id));
    return {enabled,hidden,active:enabled&&!hidden&&getSectionId()===CONFIG.sectionId,repaired,
      cutIds,ready:cutIds.length===CONFIG.cutIds.length,anchor:leftRoot?rootfallPoint(leftRoot,CONFIG.braceOnRoot):rootfallPoint(gate,CONFIG.braceAnchor)};
  }
  function sync(){
    const state=getState(),ids=state.enabled&&!hidden?state.cutIds:[],next=ids.join('|');
    if(next!==signature){signature=next;resources.setRemovedResourceIds(ids,'rootfall');}
    return state;
  }
  function access(action='repair',pos=getPlayerPosition()){
    const state=getState();
    if(!enabled)return {ok:true}; // Older/Author worlds without this assembly.
    if(!state.active)return {ok:false,reason:'inactive-passage'};
    const point=action==='travel'?gate.pos:state.anchor;
    const reach=action==='travel'?(gate.triggerRadius??1.85):CONFIG.braceReach;
    if(!pos||Math.hypot(pos.x-point.x,pos.z-point.z)>reach||Math.abs(pos.y-point.y)>CONFIG.verticalReach)return {ok:false,reason:'out-of-reach'};
    if(action==='travel')return state.repaired?{ok:true}:{ok:false,reason:'passage-blocked'};
    if(state.repaired)return {ok:false,reason:'already-active'};
    return state.ready?{ok:true}:{ok:false,reason:'cut-roots-first'};
  }
  sync();
  return {
    enabled,getState,access,
    handlesGate:id=>enabled&&id===CONFIG.gateId,
    beforeHit(node){
      if(!enabled||!CONFIG.cutIds.includes(node.id))return true;
      const state=getState();
      if(!state.active||state.cutIds.includes(node.id)||node.state.nodeState!=='READY'||node.state.remainingChunks<=0)return false;
      if(node.state.remainingChunks>1)return true;
      if(progress.completePoi(node.id))return true;
      if(warningCooldown<=0){notify('Could not save','This root remains. Try the final cut again.');warningCooldown=3;}
      return false;
    },
    afterHit(node){
      if(!enabled||!CONFIG.cutIds.includes(node.id)||node.state.remainingChunks>0)return;
      const state=sync();
      notify('Rootfall passage',state.ready?'Both roots cut. Brace the retained ends to clear the passage.':`${state.cutIds.length}/${CONFIG.cutIds.length} roots cut. Find the other stressed seam.`);
    },
    getNearbyInteraction(pos){
      if(!enabled||!access('repair',pos).ok)return null;
      return {type:'rootfall',id:CONFIG.gateId,label:'Brace passage',
        anchorPos:getState().anchor,cost:{...(gate.requirements?.resources??{})},
      };
    },
    activate(){
      const allowed=access();if(!allowed.ok)return allowed;
      const result=repairGate(CONFIG.gateId);
      if(result.ok){sync();notify('Rootfall cleared','The braced passage leads into Shatterfen.');}
      else notify('Rootfall passage',result.reason==='commit-failed'?'Could not save. Your materials were kept.':result.reason==='insufficient-level'?`This authored passage requires level ${result.status.minPlayerLevel}.`:`Bring ${Object.entries(gate.requirements?.resources??{}).map(([id,n])=>`${n} ${id.replaceAll('_',' ')}`).join(' and ')} to brace the passage.`);
      return result;
    },
    update(dt,{hidden:nextHidden=false}={}){hidden=nextHidden;warningCooldown=Math.max(0,warningCooldown-dt);return sync();},
  };
}
