// Owns only the empty right-half drag gesture. Camera yaw remains owned by
// cameraFollow so input never changes player facing or camera follow state.
export function createGameCameraOrbit(appElement, cameraFollow, cfg = {}) {
  const sensitivity = cfg.yawSensitivity ?? 0.008;
  let enabled = true;
  let pointerId = null;
  let lastX = 0;
  let lastY = 0;
  const touches = new Map();
  let pinchDistance = null;

  function clear() {
    const ids = new Set(touches.keys());
    if (pointerId !== null) ids.add(pointerId);
    touches.clear(); pinchDistance = null;
    pointerId = null;
    for (const id of ids) { try { appElement.releasePointerCapture(id); } catch {} }
  }
  function setEnabled(value) { enabled = !!value; if (!enabled) clear(); }
  function isOrbitArea(event) {
    const rect = appElement.getBoundingClientRect();
    return event.clientX - rect.left >= rect.width * .5;
  }
  function isUiTarget(target) { return !!target?.closest?.("button,a,input,select,textarea,[data-ui-control]"); }
  function onDown(event) {
    if (!enabled || event.button !== undefined && event.button !== 0) return;
    if (isUiTarget(event.target) || !isOrbitArea(event)) return;
    // Only two touches that START on the open right half can pinch. A left
    // joystick or UI touch never becomes a zoom pointer, even after crossing.
    if (event.pointerType === 'touch') {
      if (touches.size >= 2 || pointerId !== null && !touches.has(pointerId)) return;
      touches.set(event.pointerId, {x:event.clientX,y:event.clientY});
      if (touches.size === 2) {
        const [a,b] = touches.values();
        pinchDistance = Math.hypot(a.x-b.x,a.y-b.y);
        try { appElement.setPointerCapture(event.pointerId); } catch {}
        if(event.cancelable)event.preventDefault();
        return;
      }
    } else if (pointerId !== null) return;
    pointerId = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    try { appElement.setPointerCapture(pointerId); } catch {}
    if (event.cancelable) event.preventDefault();
  }
  function onMove(event) {
    if (enabled && touches.has(event.pointerId)) {
      const point=touches.get(event.pointerId);point.x=event.clientX;point.y=event.clientY;
      if(touches.size===2){
        const [a,b]=touches.values(),distance=Math.hypot(a.x-b.x,a.y-b.y);
        if(pinchDistance>8 && distance>8)cameraFollow.zoomByFactor?.(pinchDistance/distance);
        pinchDistance=distance;
        if(event.cancelable)event.preventDefault();
        return;
      }
    }
    if (!enabled || event.pointerId !== pointerId) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    if (dx || dy) cameraFollow.orbitBy(-dx * sensitivity, -dy * (cfg.pitchSensitivity ?? sensitivity));
    if (event.cancelable) event.preventDefault();
  }
  function onEnd(event) {
    if(touches.has(event.pointerId)){
      touches.delete(event.pointerId);pinchDistance=null;
      const remaining=touches.entries().next().value;
      pointerId=remaining?.[0]??null;
      if(remaining){lastX=remaining[1].x;lastY=remaining[1].y;}
      try{appElement.releasePointerCapture(event.pointerId);}catch{}
    } else if(event.pointerId===pointerId)clear();
  }
  function onLostCapture(event) { onEnd(event); }
  function onWheel(event){
    if(!enabled||isUiTarget(event.target)||!isOrbitArea(event))return;
    const pixels=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?appElement.getBoundingClientRect().height:1);
    cameraFollow.zoomByFactor?.(Math.exp(Math.max(-.3,Math.min(.3,pixels*(cfg.wheelZoomSensitivity??.0015)))));
    if(event.cancelable)event.preventDefault();
  }
  function onVisibilityChange() { if (document.hidden) clear(); }
  appElement.addEventListener("pointerdown", onDown, { passive: false });
  appElement.addEventListener("pointermove", onMove, { passive: false });
  appElement.addEventListener("pointerup", onEnd, { passive: false });
  appElement.addEventListener("pointercancel", onEnd, { passive: false });
  appElement.addEventListener("lostpointercapture", onLostCapture);
  appElement.addEventListener("wheel", onWheel, {passive:false});
  window.addEventListener("blur", clear);
  window.addEventListener('resize',clear);
  window.visualViewport?.addEventListener('resize',clear);
  document.addEventListener("visibilitychange", onVisibilityChange);
  return { setEnabled, isEnabled: () => enabled, clear, _debug: () => ({ enabled, pointerId, pinch:touches.size===2, yaw: cameraFollow.getYaw(), pitch: cameraFollow.getPitch?.() }), destroy() {
    window.removeEventListener('resize',clear);window.visualViewport?.removeEventListener('resize',clear);
    clear(); appElement.removeEventListener("pointerdown", onDown); appElement.removeEventListener("pointermove", onMove); appElement.removeEventListener("pointerup", onEnd); appElement.removeEventListener("pointercancel", onEnd); appElement.removeEventListener("lostpointercapture", onLostCapture); appElement.removeEventListener("wheel",onWheel); window.removeEventListener("blur", clear); document.removeEventListener("visibilitychange", onVisibilityChange);
  } };
}
