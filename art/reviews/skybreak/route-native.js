(async () => {
  const g=window.__game;
  const {SKYBREAK_ROUTE,SKYBREAK_ANCHORS}=await import('/src/world/frontierLandform.js');
  const crownIndex=SKYBREAK_ROUTE.findIndex(n=>n.x===SKYBREAK_ANCHORS.crown.x&&n.z===SKYBREAK_ANCHORS.crown.z);
  if(crownIndex<1)throw new Error('Exported route must include crown anchor');
  const phase=window.__skybreakPhase||'ascent';
  const nodes=phase==='ascent'?[{x:SKYBREAK_ANCHORS.base.x,z:SKYBREAK_ANCHORS.base.z+3},...SKYBREAK_ROUTE.slice(0,crownIndex+1)]:SKYBREAK_ROUTE.slice(crownIndex);
  const points=[];
  for(let i=1;i<nodes.length;i++){
    const a=nodes[i-1],b=nodes[i],count=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/1.2);
    for(let j=1;j<=count;j++)points.push([a.x+(b.x-a.x)*j/count,a.z+(b.z-a.z)*j/count]);
  }
  const keys=new Set();
  const key=(name,down)=>{if(keys.has(name)===down)return;window.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{key:name,bubbles:true}));if(down)keys.add(name);else keys.delete(name);};
  g.touchMovement.clear();g.playerController.resetJumpState();
  if(phase==='ascent'){
    const {x,z}=nodes[0];g.frontierChunks.update({x,z},{activeSectionId:'camp'});g.characterPhysics.setPosition({x,y:g.frontierChunks.getHeight(x,z)+.55,z});g.playerController.syncPosFromPhysics();g.playerController.snapRenderPose();
  }
  g.cameraFollow.orbitBy(-g.cameraFollow.getYaw(),42*Math.PI/180-g.cameraFollow.getPitch());g.cameraFollow.snap();
  const start=performance.now();
  const result=window.__skybreakRoute={done:false,phase,nodes,points,waypoint:0,samples:[],healthStart:g.playerCombat.getHealth(),fixture:phase==='ascent'?'Placed on ordinary ground south of exported base anchor, then ordinary keyboard listeners.':'Continuous keyboard descent from previously reached crown; no position fixture.'};
  let lastSample=0;
  const finish=reason=>{clearInterval(timer);for(const k of [...keys])key(k,false);result.done=true;result.reason=reason;result.elapsedMs=performance.now()-start;result.end={...g.playerController.getState().pos};result.healthEnd=g.playerCombat.getHealth();};
  const timer=setInterval(()=>{
    const elapsed=performance.now()-start,p=g.playerController.getState().pos;
    if(elapsed>55000)return finish('timeout');
    if(g.playerCombat.getHealth()<result.healthStart)return finish('health-loss');
    let [x,z]=points[result.waypoint],dx=x-p.x,dz=z-p.z,distance=Math.hypot(dx,dz);
    if(distance<.55){result.waypoint++;if(result.waypoint===points.length)return finish('complete');[x,z]=points[result.waypoint];dx=x-p.x;dz=z-p.z;distance=Math.hypot(dx,dz);}
    key('shift',true);key('a',dx/distance<-.3);key('d',dx/distance>.3);key('w',dz/distance<-.3);key('s',dz/distance>.3);
    if(elapsed-lastSample>900){lastSample=elapsed;result.samples.push({ms:elapsed,x:p.x,y:p.y,z:p.z,waypoint:result.waypoint,health:g.playerCombat.getHealth(),draws:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles});}
  },40);
  return {started:true,phase,nodeCount:nodes.length,densePoints:points.length,health:result.healthStart};
})()
