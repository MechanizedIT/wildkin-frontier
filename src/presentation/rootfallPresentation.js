import {ROOTFALL_CONFIG as CONFIG} from '../world/rootfallConfig.js';

// Ordinary authored prop roots/colliders, with one derived visibility decision.
// The retained left/right geometry never changes when the middle is removed.
export function createRootfallPresentation({scene,registry,physicsWorld,onVisualAdded=()=>{},onVisualRemoving=()=>{}}){
  const props=registry.getSectionById(CONFIG.sectionId)?.props??[];
  const managed=[CONFIG.props.middle,CONFIG.props.braceLeft,CONFIG.props.braceRight].map(id=>({id,record:props.find(p=>p.id===id),root:scene.getObjectByName(id),shown:null}));
  let signature=null;
  return {
    update(state){
      if(!state.enabled)return;
      const next=`${state.hidden}|${state.repaired}`;if(next===signature)return;signature=next;
      for(const entry of managed){
        if(!entry.root||!entry.record)continue;
        const wanted=state.hidden?entry.record.visibleInPlay!==false:entry.id===CONFIG.props.middle?!state.repaired:state.repaired;
        // Author owns its separate preview. Release game-state collision while
        // editing; returning to Play reinstates the saved physical state.
        physicsWorld.setStaticObjectEnabled(entry.id,!state.hidden&&wanted);
        if(entry.shown!==wanted){
          if(wanted)onVisualAdded(entry.root);else onVisualRemoving(entry.root);
          entry.root.visible=wanted;entry.shown=wanted;
        }
      }
    },
  };
}
