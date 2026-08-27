// Explicit owner of the one active Camp/expedition section.

export function createSectionRuntime({ worldRegistry, playground, physicsWorld, onChange } = {}) {
  if (!worldRegistry) throw new Error("SectionRuntime requires worldRegistry");
  let activeSectionId = null;

  function activate(sectionId, entryId = null) {
    const section = worldRegistry.getSectionById?.(sectionId) ?? worldRegistry.getRegionById?.(sectionId);
    if (!section) return { ok: false, reason: "missing-section", sectionId };
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
    return { ok: true, sectionId, previousSectionId, entryId, activeIds };
  }

  function transitionThroughPortal(portalId, handlers = {}) {
    const gate = worldRegistry.getPortalGateById?.(portalId);
    if (!gate) return { ok: false, reason: "missing-portal", portalId };
    if (gate.sectionId !== activeSectionId) return { ok: false, reason: "inactive-source", portalId };
    const entry = worldRegistry.getEntryPoint?.(gate.targetSectionId, gate.targetEntryId);
    if (!entry) return { ok: false, reason: "missing-target-entry", portalId };
    handlers.beforeTransition?.({ gate, entry });
    const activated = activate(gate.targetSectionId, gate.targetEntryId);
    if (!activated.ok) return activated;
    handlers.onArrive?.({ gate, entry, sectionId: gate.targetSectionId });
    handlers.afterTransition?.({ gate, entry, sectionId: gate.targetSectionId });
    return { ok: true, gate, entry, sectionId: gate.targetSectionId };
  }

  return {
    activate,
    transitionThroughPortal,
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
