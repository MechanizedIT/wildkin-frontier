export const RUN_CHECKPOINT_SECONDS = 3;

// One coarse checkpoint in the existing loop, plus explicit background/pause
// boundaries. Inventory transactions call this same snapshot provider.
export function createExpeditionPersistence({progress,session,getPlayerState,getHealth,getXp,getSectionId,getExtras,validateFeet,capsuleExtent,initialFeet=null}) {
  let safe=initialFeet ? {sectionId:getSectionId(),feet:{...initialFeet}} : null, elapsed=0,wasBlocked=false,pendingResolution=null;
  function refreshSafe(){
    const state=getPlayerState();
    if(!session.isActive() || !state.grounded || ['CLIMB','MANTLE','JUMP'].includes(state.mode))return;
    const feet=validateFeet({x:state.pos.x,y:state.pos.y-capsuleExtent,z:state.pos.z});
    if(feet)safe={sectionId:getSectionId(),feet};
  }
  function snapshot(){
    if(pendingResolution)return progress.getActiveRun();
    if(!session.isActive() || session.isResolved() || getHealth()<=0)return null;
    if(!safe || safe.sectionId!==getSectionId())refreshSafe();
    if(!safe || safe.sectionId!==getSectionId())return progress.getActiveRun();
    const run=session.snapshotRun(),extras=getExtras();
    return {runId:run.runId,startAnchorId:run.startAnchorId,sectionId:getSectionId(),feet:{...safe.feet},facingYaw:getPlayerState().facing,health:getHealth(),xp:getXp(),companions:extras.companions,corePending:extras.coreSecured,kills:run.kills,maxDepth:run.maxDepth,newWaypoints:run.newWaypoints,newBeacons:run.newBeacons};
  }
  progress.setRunSnapshotProvider(snapshot);
  const checkpoint=()=>{if(pendingResolution)return pendingResolution();refreshSafe();return progress.checkpointRun();};
  const background=()=>{if(document.hidden)checkpoint();};
  document.addEventListener('visibilitychange',background);window.addEventListener('pagehide',checkpoint);
  return {
    checkpoint,
    setPendingResolution:callback=>{pendingResolution=callback;},
    update(dt,blocked){
      elapsed+=dt;
      if((blocked&&!wasBlocked)||elapsed>=RUN_CHECKPOINT_SECONDS){elapsed=0;if(session.isActive())checkpoint();}
      wasBlocked=blocked;
    },
    destroy(){document.removeEventListener('visibilitychange',background);window.removeEventListener('pagehide',checkpoint);progress.setRunSnapshotProvider(null);},
  };
}
