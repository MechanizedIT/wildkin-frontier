// Bounded Parkour Course state and safe-failure interception.

function insideTrigger(pos, trigger) {
  if (!pos || !trigger?.pos) return false;
  if (trigger.size) {
    const dx = pos.x - trigger.pos.x, dz = pos.z - trigger.pos.z;
    const yaw = trigger.rotY ?? 0, c = Math.cos(yaw), s = Math.sin(yaw);
    return Math.abs(dx * c - dz * s) <= trigger.size.w / 2
      && Math.abs((pos.y ?? 0) - (trigger.pos.y ?? 0)) <= trigger.size.h / 2
      && Math.abs(dx * s + dz * c) <= trigger.size.d / 2;
  }
  return Math.hypot(pos.x - trigger.pos.x, pos.z - trigger.pos.z) <= (trigger.triggerRadius ?? 1.1);
}

export function createParkourSystem(worldRegistry, opts = {}) {
  const getActiveSectionId = opts.getActiveSectionId ?? (() => null);
  const onSafeFailure = opts.onSafeFailure ?? (() => {});
  const onNormalFatal = opts.onNormalFatal ?? (() => {});
  const onCourseStarted = opts.onCourseStarted ?? (() => {});
  const onCheckpointActivated = opts.onCheckpointActivated ?? (() => {});
  const onCourseEnded = opts.onCourseEnded ?? (() => {});
  const onCourseAbandoned = opts.onCourseAbandoned ?? (() => {});
  let activeCourseId = null;
  let latestCheckpoint = null;
  let courseStartState = null;
  const insideIds = new Set();

  function startCourse(start) {
    activeCourseId = start.courseId;
    courseStartState = {
      courseId: start.courseId,
      sectionId: start.sectionId,
      position: { ...(start.respawnPosition ?? start.pos) },
      facingYaw: start.respawnFacingYaw ?? start.rotY ?? 0,
    };
    latestCheckpoint = null;
    onCourseStarted({ courseId: start.courseId, start });
  }

  function getRespawnState() { return latestCheckpoint ?? courseStartState; }

  function handleFatalFailure(reason = "fatal") {
    if (!activeCourseId) return false;
    const respawn = getRespawnState();
    onSafeFailure({ courseId: activeCourseId, respawn, reason });
    return true;
  }

  function update(playerPos) {
    const sectionId = getActiveSectionId();
    if (courseStartState && courseStartState.sectionId !== sectionId) leaveCourse();
    for (const start of worldRegistry.getParkourStartsForSection?.(sectionId) ?? []) {
      const isInside = insideTrigger(playerPos, start);
      if (isInside && !insideIds.has(start.id)) startCourse(start);
      if (isInside) insideIds.add(start.id); else insideIds.delete(start.id);
    }
    if (activeCourseId) {
      for (const checkpoint of worldRegistry.getParkourCheckpointsForSection?.(sectionId) ?? []) {
        if (checkpoint.courseId !== activeCourseId) continue;
        const isInside = insideTrigger(playerPos, checkpoint);
        if (isInside && !insideIds.has(checkpoint.id)) {
          if (latestCheckpoint?.checkpointId !== checkpoint.id) {
            latestCheckpoint = {
              courseId: checkpoint.courseId,
              sectionId,
              checkpointId: checkpoint.id,
              position: { ...(checkpoint.respawnPosition ?? checkpoint.pos) },
              facingYaw: checkpoint.respawnFacingYaw ?? checkpoint.rotY ?? 0,
            };
            onCheckpointActivated({ courseId: activeCourseId, checkpoint, respawn: latestCheckpoint });
          }
        }
        if (isInside) insideIds.add(checkpoint.id); else insideIds.delete(checkpoint.id);
      }
    }
    if (activeCourseId) {
      const matchingZones = worldRegistry.getParkourCourseZonesForSection?.(sectionId)
        ?.filter((zone) => zone.courseId === activeCourseId) ?? [];
      if (matchingZones.length > 0 && !matchingZones.some((zone) => insideTrigger(playerPos, zone))) {
        leaveCourse("left-course", true);
      }
    }
    // End/Exit is an explicit course-owned trigger. It is intentionally
    // checked only against the active course so another course cannot clear
    // protection or checkpoint state.
    for (const end of worldRegistry.getParkourEndsForSection?.(sectionId) ?? []) {
      const isInside = insideTrigger(playerPos, end);
      if (isInside && !insideIds.has(end.id)) {
        if (activeCourseId && end.courseId === activeCourseId) {
          const courseId = activeCourseId;
          onCourseEnded({ courseId, end });
          leaveCourse("completed", false);
        }
      }
      if (isInside) insideIds.add(end.id); else insideIds.delete(end.id);
    }
    for (const volume of worldRegistry.getKillVolumesForSection?.(sectionId) ?? []) {
      const isInside = insideTrigger(playerPos, volume);
      if (isInside && !insideIds.has(volume.id)) {
        if (activeCourseId && volume.courseId === activeCourseId) handleFatalFailure("kill-volume");
        else onNormalFatal({ volume, reason: "fatal_hazard" });
      }
      if (isInside) insideIds.add(volume.id); else insideIds.delete(volume.id);
    }
  }

  function leaveCourse(reason = "left-course", notify = reason === "left-course") {
    const courseId = activeCourseId;
    activeCourseId = null;
    latestCheckpoint = null;
    courseStartState = null;
    insideIds.clear();
    if (notify && courseId) onCourseAbandoned({ courseId, reason });
  }

  return {
    update,
    handleFatalFailure,
    completeCourse: (courseId = null) => {
      if (courseId !== null && courseId !== activeCourseId) return false;
      leaveCourse();
      return true;
    },
    leaveCourse,
    reset: leaveCourse,
    isActive: () => !!activeCourseId,
    getState: () => ({ activeCourseId, latestCheckpoint: latestCheckpoint ? { ...latestCheckpoint, position: { ...latestCheckpoint.position } } : null }),
  };
}
