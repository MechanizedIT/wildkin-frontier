// Owns only the empty right-half drag gesture. Camera yaw remains owned by
// cameraFollow so input never changes player facing or camera follow state.
export function createGameCameraOrbit(appElement, cameraFollow, cfg = {}) {
  const sensitivity = cfg.yawSensitivity ?? 0.008;
  let enabled = true;
  let pointerId = null;
  let lastX = 0;

  function clear() {
    if (pointerId !== null) {
      try { appElement.releasePointerCapture(pointerId); } catch {}
    }
    pointerId = null;
  }
  function setEnabled(value) { enabled = !!value; if (!enabled) clear(); }
  function isOrbitArea(event) {
    const rect = appElement.getBoundingClientRect();
    return event.clientX - rect.left >= rect.width * .5;
  }
  function isUiTarget(target) { return !!target?.closest?.("button,a,input,select,textarea,[data-ui-control]"); }
  function onDown(event) {
    if (!enabled || pointerId !== null || event.button !== undefined && event.button !== 0) return;
    if (isUiTarget(event.target) || !isOrbitArea(event)) return;
    pointerId = event.pointerId;
    lastX = event.clientX;
    try { appElement.setPointerCapture(pointerId); } catch {}
    if (event.cancelable) event.preventDefault();
  }
  function onMove(event) {
    if (!enabled || event.pointerId !== pointerId) return;
    const dx = event.clientX - lastX;
    lastX = event.clientX;
    if (dx) cameraFollow.orbitBy(-dx * sensitivity);
    if (event.cancelable) event.preventDefault();
  }
  function onEnd(event) { if (event.pointerId === pointerId) clear(); }
  function onLostCapture(event) { if (event.pointerId === pointerId) clear(); }
  function onVisibilityChange() { if (document.hidden) clear(); }
  appElement.addEventListener("pointerdown", onDown, { passive: false });
  appElement.addEventListener("pointermove", onMove, { passive: false });
  appElement.addEventListener("pointerup", onEnd, { passive: false });
  appElement.addEventListener("pointercancel", onEnd, { passive: false });
  appElement.addEventListener("lostpointercapture", onLostCapture);
  window.addEventListener("blur", clear);
  document.addEventListener("visibilitychange", onVisibilityChange);
  return { setEnabled, isEnabled: () => enabled, clear, _debug: () => ({ enabled, pointerId, yaw: cameraFollow.getYaw() }), destroy() {
    clear(); appElement.removeEventListener("pointerdown", onDown); appElement.removeEventListener("pointermove", onMove); appElement.removeEventListener("pointerup", onEnd); appElement.removeEventListener("pointercancel", onEnd); appElement.removeEventListener("lostpointercapture", onLostCapture); window.removeEventListener("blur", clear); document.removeEventListener("visibilitychange", onVisibilityChange);
  } };
}
