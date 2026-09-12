// Player-controller helper: the supplied state is the sole traversal authority.
// Rapier resolves every movement, including attachment and mantle clearance.
export const CLIMBING_CONFIG = Object.freeze({
  upSpeed: 1.15, downSpeed: .9, anchorSpeed: 1.8, gripGap: .035,
  probeInterval: .1, inputDeadzone: .15, mantleReach: .32,
  mantleDuration: .65, mantleLiftFraction: .55, exitClearance: .04, blockedGrace: .3,
});

export function createClimbingController({ state, characterPhysics: physics, probe = null,
  playground, syncPosition, beginAirborneTracking, cancelAirborneTracking,
  resetTraversal, config = CLIMBING_CONFIG }) {
  const cfg = { ...CLIMBING_CONFIG, ...config };
  const half = physics.cfg.capsuleTotalHeight / 2;
  const radius = physics.cfg.capsuleRadius ?? .27;
  let probeTime = 0, nearby = null, blockedTime = 0;
  const active = () => state.mode === 'CLIMB' || state.mode === 'MANTLE';
  const direction = () => ({ x: Math.sin(state.facing), z: Math.cos(state.facing) });
  function reset() {
    state.climbable = null; state.mantleData = null; state.climbVelocity = 0;
    state.climbTime = 0; blockedTime = 0; probeTime = 0; nearby = null;
    resetTraversal();
  }
  function detach() {
    if (!active()) return false;
    const climb = state.climbable ?? state.mantleData?.climbable;
    const outward = climb?.normal ?? { x: -(climb?.approachDir.x ?? 0), z: -(climb?.approachDir.z ?? 0) };
    reset(); state.mode = 'FALL'; state.grounded = false;
    state.verticalVelocity = 0; state.vel.set(0, 0, 0); state.speed = 0;
    state.fallHVel = { x: outward.x * .65, z: outward.z * .65 };
    state.airCap = 3.3; state.jumpData = null;
    state.jumpBufferRemaining = 0; state.coyoteRemaining = 0;
    beginAirborneTracking();
    return true;
  }
  function valid(climb) {
    return climb.kind === 'natural' ? probe?.isCandidateValid(climb.probeCandidate)
      : (playground.climbables ?? []).includes(climb.authored);
  }
  function exitClear(climb) {
    return valid(climb) && (climb.kind === 'natural'
      ? probe.isExitClear(climb.probeCandidate)
      : physics.isCapsuleAtPositionClear(climb.exitCenter));
  }
  function enter(climb) {
    if (!climb || !exitClear(climb)) return false;
    reset(); state.mode = 'CLIMB'; state.climbable = climb;
    state.grounded = false; state.verticalVelocity = 0; state.speed = 0;
    state.vel.set(0, 0, 0); state.jumpData = null; state.fallHVel = null;
    state.jumpBufferRemaining = 0; state.coyoteRemaining = 0;
    state.facing = Math.atan2(climb.approachDir.x, climb.approachDir.z);
    cancelAirborneTracking();
    return true;
  }
  function naturalRecord(candidate) {
    if (!candidate) return null;
    const normal = candidate.normal;
    const gap = radius + (physics.cfg.controllerOffset ?? .02) + cfg.gripGap;
    return { ...candidate, kind: 'natural', probeCandidate: candidate,
      approachDir: { x: -normal.x, z: -normal.z },
      anchor: { x: candidate.contact.x + normal.x * gap, z: candidate.contact.z + normal.z * gap },
      bottomFeetY: state.pos.y - half };
  }
  function startNatural(expected) {
    if (!probe || !state.grounded || active() || ['JUMP','FALL','DODGE'].includes(state.mode)) return false;
    const fresh = probe.findCandidate({ position: state.pos, approach: direction() });
    if (!fresh || (expected && (fresh.surfaceId !== expected.surfaceId || fresh.colliderHandle !== expected.colliderHandle))) return false;
    return enter(naturalRecord(fresh));
  }
  function startAuthored(authored) {
    if (!authored) return false;
    const a = authored.approachDir;
    const anchor = { x: authored.x - a.x * .35, z: authored.z - a.z * .35 };
    const exit = authored.mantleExit ?? { x: anchor.x + a.x * .8, z: anchor.z + a.z * .8 };
    return enter({ kind: 'authored', authored, approachDir: a, normal: { x:-a.x,y:0,z:-a.z },
      anchor, topY: authored.topY, bottomFeetY: playground.getGroundHeight?.(anchor.x,anchor.z) ?? 0,
      exitCenter: { x: exit.x, y: authored.topY + half + cfg.exitClearance, z: exit.z } });
  }
  function interaction(dt, { allowed = true } = {}) {
    if (active()) {
      const climb = state.climbable ?? state.mantleData?.climbable;
      return { id:'climb-active', type:'cliffClimb', action:'drop', label:'LET GO',
        detail:'Let go of the rock face.', anchorPos:{x:state.pos.x,y:state.pos.y+.7,z:state.pos.z}, pinned:true,
        candidate:climb?.probeCandidate };
    }
    if (!allowed || !probe || !state.grounded || ['JUMP','FALL','DODGE'].includes(state.mode)) { nearby=null;probeTime=0;return null; }
    probeTime -= dt;
    if (probeTime <= 0) { nearby=probe.findCandidate({position:state.pos,approach:direction()});probeTime=cfg.probeInterval; }
    if (!nearby || !probe.isCandidateValid(nearby)) return null;
    return { id:`climb:${nearby.surfaceId}`, type:'cliffClimb', action:'climb', label:'CLIMB',
      detail:'Move the stick up or down to climb. Rest it to hold.', candidate:nearby,
      anchorPos:{ x:nearby.contact.x+nearby.normal.x*.1,y:state.pos.y+1,z:nearby.contact.z+nearby.normal.z*.1 } };
  }
  function moveTo(target, dt) {
    const dx=target.x-state.pos.x,dz=target.z-state.pos.z,len=Math.hypot(dx,dz);
    const factor=len>cfg.anchorSpeed*dt ? cfg.anchorSpeed*dt/len : 1;
    const result=physics.move({x:dx*factor,y:target.y-state.pos.y,z:dz*factor});
    syncPosition(); return result;
  }
  function update(dt, intent) {
    if (!active()) return false;
    if (intent?.jumpRequested || intent?.dodgeRequested) { detach();return true; }
    const climb=state.climbable ?? state.mantleData?.climbable;
    if (!climb || !valid(climb)) { detach();return true; }
    state.facing=Math.atan2(climb.approachDir.x,climb.approachDir.z);
    state.verticalVelocity=0;state.grounded=false;
    if (state.mode === 'MANTLE') {
      const md=state.mantleData;
      if (!exitClear(climb)) { detach();return true; }
      md.time+=dt;
      const t=Math.min(1,md.time/md.duration), lift=Math.min(1,t/cfg.mantleLiftFraction), across=Math.max(0,(t-cfg.mantleLiftFraction)/(1-cfg.mantleLiftFraction));
      const liftedY=Math.max(md.start.y,md.end.y+.07);
      const target={x:md.start.x+(md.end.x-md.start.x)*across,
        y:md.start.y+(liftedY-md.start.y)*lift-(liftedY-md.end.y)*across,z:md.start.z+(md.end.z-md.start.z)*across};
      physics.move({x:target.x-state.pos.x,y:target.y-state.pos.y,z:target.z-state.pos.z});syncPosition();
      state.speed=0;state.climbVelocity=0;
      if (t>=1) {
        if (Math.hypot(state.pos.x-md.end.x,state.pos.z-md.end.z)>.12 || Math.abs(state.pos.y-md.end.y)>.15) { detach();return true; }
        const supported=physics.move({x:0,y:-.12,z:0});syncPosition();
        if (!supported.grounded) { detach();return true; }
        reset();state.mode='IDLE';state.grounded=true;state.verticalVelocity=0;state.speed=0;
        cancelAirborneTracking();
      }
      return true;
    }
    if (climb.kind==='natural' && state.pos.y < climb.topY-cfg.mantleReach
      && !probe.hasRemainingFace(climb.probeCandidate,state.pos)) { detach();return true; }
    const input=Math.abs(intent?.moveY??0)>cfg.inputDeadzone ? Math.max(-1,Math.min(1,-intent.moveY)) : 0;
    const velocity=input*(input>=0?cfg.upSpeed:cfg.downSpeed);
    const beforeY=state.pos.y;
    const result=moveTo({x:climb.anchor.x,y:state.pos.y+velocity*dt,z:climb.anchor.z},dt);
    state.climbVelocity=(state.pos.y-beforeY)/dt;state.speed=Math.abs(state.climbVelocity);state.climbTime+=dt;
    if (velocity>0 && state.pos.y >= climb.topY-cfg.mantleReach) {
      if (!exitClear(climb)) { detach();return true; }
      state.mantleData={start:{x:state.pos.x,y:state.pos.y,z:state.pos.z},end:{...climb.exitCenter},time:0,duration:cfg.mantleDuration,climbable:climb};
      state.mode='MANTLE';state.climbable=null;state.climbVelocity=0;return true;
    }
    if (input<0 && result.grounded) {
      reset();state.mode='IDLE';state.grounded=true;state.speed=0;cancelAirborneTracking();return true;
    }
    blockedTime=Math.abs(velocity)>.1 && Math.abs(state.climbVelocity)<.05 ? blockedTime+dt : 0;
    if (blockedTime>cfg.blockedGrace) detach();
    return true;
  }
  return { update, startNatural, startAuthored, interaction, detach, reset, isActive:active };
}
