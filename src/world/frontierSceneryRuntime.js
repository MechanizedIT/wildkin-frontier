import { createFrontierSceneryBuild, createFrontierSceneryRecipeCache } from './frontierScenery.js';
import { createFrontierSceneryVisual } from './frontierSceneryVisual.js';
import { DEFAULT_FRONTIER_WORLD } from './frontierWorld.js';

/** Scenery borrows terrain residency; it owns no loop, terrain height or save. */
export function createFrontierSceneryRuntime({
  parent, terrainRuntime, physicsWorld, visualAssets = [],
  onVisualAdded = () => {}, onVisualRemoving = () => {}, onGeometryChanged = () => {},
  createVisual = createFrontierSceneryVisual,
} = {}) {
  const world = terrainRuntime?.getWorldDescriptor?.() ?? DEFAULT_FRONTIER_WORLD;
  const recipeCache = createFrontierSceneryRecipeCache();
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
    const build = residency?.center ? createFrontierSceneryBuild(residency, {
      visualAssets, getHeight: terrainRuntime.getHeight, getTerrainSample: terrainRuntime.sample, world,
      heightMatchesTerrainSample: terrainRuntime.heightMatchesSample === true,
    }, recipeCache) : null;
    if (!build) recipeCache.clear();
    const nextSpecs = build?.specs ?? [];
    // Construct before retiring the previous resident, so a construction error
    // leaves the old scene coherent and the same residency retryable.
    let next = null;
    try {
      next = nextSpecs.length ? createVisual({ specs: nextSpecs, visualAssets, getHeight: build.getHeight,
        canPlaceGroundCover: build.canPlaceGroundCover, world,
      }) : null;
    } finally {
      build?.releaseTerrainMemo();
    }
    const remove = (visual?.terrainSurfaces ?? []).map(surface => surface.id);
    const add = next?.terrainSurfaces ?? [];
    try {
      if (remove.length || add.length) physicsWorld?.updateTerrainSurfaces({ remove, add });
    } catch (error) {
      next?.dispose();
      throw error;
    }
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
      clearanceRecipeCache: recipeCache.getDebugState(),
      sceneryRecipeCache: recipeCache.getSceneryDebugState(),
      ...(visual?.stats ?? {}),
    };
  }

  function dispose() {
    if (disposed) return;
    const remove = (visual?.terrainSurfaces ?? []).map(surface => surface.id);
    if (remove.length) physicsWorld?.updateTerrainSurfaces({ remove });
    retireVisual();
    specs = []; lastResidency = null; recipeCache.clear(); disposed = true;
    onGeometryChanged();
  }
  return { update, getDebugState, dispose };
}
