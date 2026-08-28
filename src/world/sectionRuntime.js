// Explicit owner of the one active Camp/expedition section.

export function createSectionRuntime({ worldRegistry, playground, physicsWorld, onChange } = {}) {
  if (!worldRegistry) throw new Error("SectionRuntime requires worldRegistry");
  let activeSectionId = null;

  function resolvePortalDestination(gate) {
    if (gate?.targetGateId) {
      const targetGate = worldRegistry.getPortalGateById?.(gate.targetGateId);
      if (!targetGate) return null;
      const radius = targetGate.triggerRadius ?? 1.85;
      const yaw = targetGate.rotY ?? 0;
      const forward = { x: Math.sin(yaw), z: Math.cos(yaw) };
      return {
        // Preserve the legacy entry-shaped identity for callers while exposing
        // the physical receiving gate separately on `gate`.
        id: gate.targetEntryId ?? targetGate.id,
        pos: {
          x: targetGate.pos.x + forward.x * (radius + 0.65),
          y: targetGate.pos.y ?? 0,
          z: targetGate.pos.z + forward.z * (radius + 0.65),
        },
        facingYaw: yaw,
        gate: targetGate,
      };
    }
    const entry = worldRegistry.getEntryPoint?.(gate.targetSectionId, gate.targetEntryId);
    return entry ? { ...entry, gate: null } : null;
  }

  function activate(sectionId, entryId = null) {
    const section = worldRegistry.getSectionById?.(sectionId) ?? worldRegistry.getRegionById?.(sectionId);
    if (!section) return { ok: false, reason: "missing-section", sectionId };
    if (activeSectionId === sectionId) {
      return { ok: true, sectionId, previousSectionId: sectionId, entryId, activeIds: [sectionId], changed: false };
    }
    const previousSectionId = activeSectionId;
    activeSectionId = sectionId;
    const sectionGroups = playground?.sectionGroups;
    if (sectionGroups) {
      const entries = sectionGroups instanceof Map ? sectionGroups.entries() : Object.entries(sectionGroups);
      for (const [id, group] of entries) group.visible = id === sectionId;
    }
    playground?.setActiveSection?.(sectionId);
    physicsWorld?.setActiveSection?.(sectionId);
    const activeIds = [sectionId];
    if (onChange && previousSectionId !== sectionId) {
      onChange({ sectionId, previousSectionId, entryId, activeIds, prevActiveIds: previousSectionId ? [previousSectionId] : [] });
    }
    return { ok: true, sectionId, previousSectionId, entryId, activeIds, changed: true };
  }

  function transitionThroughPortal(portalId, handlers = {}) {
    const gate = worldRegistry.getPortalGateById?.(portalId);
    if (!gate) return { ok: false, reason: "missing-portal", portalId };
    if (gate.sectionId !== activeSectionId) return { ok: false, reason: "inactive-source", portalId };
    const entry = resolvePortalDestination(gate);
    if (!entry) return { ok: false, reason: "missing-target-entry", portalId };
    handlers.beforeTransition?.({ gate, entry });
    const destinationSectionId = entry.gate?.sectionId ?? gate.targetSectionId;
    const activated = activate(destinationSectionId, entry.id ?? gate.targetEntryId);
    if (!activated.ok) return activated;
    handlers.onArrive?.({ gate, entry, receivingGate: entry.gate ?? null, sectionId: destinationSectionId });
    handlers.afterTransition?.({ gate, entry, receivingGate: entry.gate ?? null, sectionId: destinationSectionId });
    return { ok: true, gate, entry, receivingGate: entry.gate ?? null, sectionId: destinationSectionId };
  }

  return {
    activate,
    transitionThroughPortal,
    resolvePortalDestination,
    getActiveSectionId: () => activeSectionId,
    getCurrentRegionId: () => activeSectionId,
    getCurrentPocketId: () => null,
    getActiveIds: () => activeSectionId ? [activeSectionId] : [],
    getActiveSet: () => new Set(activeSectionId ? [activeSectionId] : []),
    isSectionActive: (sectionId) => activeSectionId === sectionId,
    isActive: (sectionId) => activeSectionId === sectionId,
    update: () => ({
      changed: false,
      currentRegionId: activeSectionId,
      currentPocketId: null,
      activeIds: activeSectionId ? [activeSectionId] : [],
    }),
  };
}
