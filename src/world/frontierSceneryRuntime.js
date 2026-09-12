import { selectFrontierScenery, createFrontierGroundCoverFilter } from './frontierScenery.js';
import { createFrontierSceneryVisual } from './frontierSceneryVisual.js';

/** Scenery borrows terrain residency; it owns no loop, terrain height or save. */
export function createFrontierSceneryRuntime({
  parent, terrainRuntime, physicsWorld, visualAssets = [],
  onVisualAdded = () => {}, onVisualRemoving = () => {}, onGeometryChanged = () => {},
  createVisual = createFrontierSceneryVisual,
} = {}) {
  let lastResidency = null, visual = null, specs = [], disposed = false;

  function retireVisual() {
    if (!visual) return;
    // Restore any faded instance materials before releasing its model graph.
    for (const root of visual.canopyRoots ?? []) onVisualRemoving(root);
    parent?.remove(visual.group);
    visual.dispose();
    visual = null;
  }

  function update() {
    if (disposed) return;
    const residency = terrainRuntime?.getResidency?.();
    if (residency === lastResidency) return;
    const nextSpecs = residency?.center ? selectFrontierScenery(residency, {
      visualAssets, getHeight: terrainRuntime.getHeight, getTerrainSample: terrainRuntime.sample,
    }) : [];
    // Construct before retiring the previous resident, so a construction error
    // leaves the old scene coherent and the same residency retryable.
    const next = nextSpecs.length ? createVisual({ specs: nextSpecs, visualAssets, getHeight: terrainRuntime.getHeight,
      canPlaceGroundCover: createFrontierGroundCoverFilter({ getHeight: terrainRuntime.getHeight, getTerrainSample: terrainRuntime.sample }),
    }) : null;
    const remove = (visual?.terrainSurfaces ?? []).map(surface => surface.id);
    const add = next?.terrainSurfaces ?? [];
    if (remove.length || add.length) physicsWorld?.updateTerrainSurfaces({ remove, add });
    retireVisual();
    visual = next;
    specs = nextSpecs;
    if (visual) {
      // Reuse the interaction anchor's authored/batched scenery classification.
      // Individual trees register separately with the player's fade owner.
      visual.group.userData.propId = 'frontier-scenery';
      parent?.add(visual.group);
      for (const root of visual.canopyRoots ?? []) onVisualAdded(root);
    }
    lastResidency = residency;
    onGeometryChanged();
  }

  function getDebugState() {
    return {
      residentCount: specs.length,
      residentIds: specs.map(spec => spec.id),
      canopyCount: specs.filter(spec => spec.kind === 'canopy').length,
      colliderCount: visual?.terrainSurfaces?.length ?? 0,
      ...(visual?.stats ?? {}),
    };
  }

  function dispose() {
    if (disposed) return;
    const remove = (visual?.terrainSurfaces ?? []).map(surface => surface.id);
    if (remove.length) physicsWorld?.updateTerrainSurfaces({ remove });
    retireVisual();
    specs = []; lastResidency = null; disposed = true;
    onGeometryChanged();
  }
  return { update, getDebugState, dispose };
}
