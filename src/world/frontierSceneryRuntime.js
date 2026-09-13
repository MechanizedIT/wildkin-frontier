import { createFrontierSceneryBuild, createFrontierSceneryRecipeCache, createFrontierSceneryPrepareJob } from './frontierScenery.js';
import { createFrontierSceneryVisual, createFrontierSceneryVisualJob, createFrontierGroundPatchCache } from './frontierSceneryVisual.js';
import { DEFAULT_FRONTIER_WORLD } from './frontierWorld.js';

export const FRONTIER_SCENERY_STREAMING_CONFIG = Object.freeze({ frameBudgetMs: 3, maxWorkPerFrame: 256 });

function sameWindow(a, b) {
  return a?.center && b?.center && a.center.cx === b.center.cx && a.center.cz === b.center.cz
    && a.chunks.length === b.chunks.length
    && a.chunks.every((chunk, i) => chunk.id === b.chunks[i]?.id && chunk.cx === b.chunks[i]?.cx && chunk.cz === b.chunks[i]?.cz);
}

/** Scenery borrows terrain residency; it owns no loop, terrain height or save. */
export function createFrontierSceneryRuntime({
  parent, terrainRuntime, physicsWorld, visualAssets = [],
  onVisualAdded = () => {}, onVisualRemoving = () => {}, onGeometryChanged = () => {},
  createVisual = createFrontierSceneryVisual,
  createRecipeJob = createFrontierSceneryPrepareJob,
  createVisualJob = createVisual === createFrontierSceneryVisual ? createFrontierSceneryVisualJob : null,
  now = () => performance.now(),
} = {}) {
  const world = terrainRuntime?.getWorldDescriptor?.() ?? DEFAULT_FRONTIER_WORLD;
  const recipeCache = createFrontierSceneryRecipeCache();
  const groundPatchOwner = Object.freeze({});
  const groundPatchCache = createFrontierGroundPatchCache({ world, owner: groundPatchOwner });
  const buildOptions = { visualAssets, getHeight: terrainRuntime?.getHeight, getTerrainSample: terrainRuntime?.sample, world,
    heightMatchesTerrainSample: terrainRuntime?.heightMatchesSample === true };
  let lastResidency = null, visual = null, specs = [], disposed = false;
  let preparation = null, failedPrediction = null;
  const streaming = { preparedPublications: 0, unfinishedPublications: 0, synchronousPublications: 0,
    cancelled: 0, preparationFailures: 0, lastWorkMs: 0, maxWorkMs: 0 };

  function visualOptions(build) {
    return { specs: build.specs, visualAssets, getHeight: build.getHeight,
      canPlaceGroundCover: build.canPlaceGroundCover, world, groundPatchCache, groundPatchOwner };
  }

  function cancelPreparation() {
    if (!preparation) return;
    preparation.recipeJob?.cancel();
    preparation.visualJob?.cancel();
    preparation.visual?.dispose();
    releasePreparationMemo(preparation);
    preparation = null;
    groundPatchCache.prune(specs.map(spec => spec.id));
    streaming.cancelled++;
  }

  function releasePreparationMemo(pending) {
    if (pending?.build && !pending.memoReleased) {
      pending.build.releaseTerrainMemo();
      pending.memoReleased = true;
    }
  }

  function beginPreparation(residency) {
    preparation = { residency, phase: 'recipes', build: null, visual: null, visualJob: null,
      recipeJob: createRecipeJob(residency, buildOptions, recipeCache) };
  }

  function advancePreparation() {
    const pending = preparation;
    if (!pending || pending.phase === 'ready') return;
    if (pending.phase === 'recipes') {
      if (!pending.recipeJob.step(1).done) return;
      pending.recipeJob = null;
      pending.build = createFrontierSceneryBuild(pending.residency, buildOptions, recipeCache);
      groundPatchCache.prune([...specs, ...pending.build.specs].map(spec => spec.id));
      if (!pending.build.specs.length) {
        releasePreparationMemo(pending);
        pending.phase = 'ready';
        return;
      }
      pending.phase = 'visual';
      if (createVisualJob) pending.visualJob = createVisualJob(visualOptions(pending.build));
      return;
    }
    if (pending.visualJob) {
      pending.visualJob.step(1);
      if (pending.visualJob.getState().status !== 'complete') return;
      pending.visual = pending.visualJob.takeResult();
      pending.visualJob = null;
    } else {
      pending.visual = createVisual(visualOptions(pending.build));
    }
    releasePreparationMemo(pending);
    pending.phase = 'ready';
  }

  function prepareUpcoming() {
    const target = terrainRuntime?.getAnticipatedResidency?.();
    if (!target?.center) { cancelPreparation(); failedPrediction = null; return; }
    if (failedPrediction && sameWindow(failedPrediction, target)) return;
    if (preparation && !sameWindow(preparation.residency, target)) cancelPreparation();
    const started = now();
    try {
      if (!preparation) beginPreparation(target);
      for (let work = 0; work < FRONTIER_SCENERY_STREAMING_CONFIG.maxWorkPerFrame
        && preparation?.phase !== 'ready'; work++) {
        if (work && now() - started >= FRONTIER_SCENERY_STREAMING_CONFIG.frameBudgetMs) break;
        advancePreparation();
      }
    } catch {
      // Speculation cannot disturb the published scene. The ordinary boundary
      // path still retries failures; don't retry a broken prediction every frame.
      failedPrediction = target;
      streaming.preparationFailures++;
      cancelPreparation();
    } finally {
      streaming.lastWorkMs = Math.max(0, now() - started);
      streaming.maxWorkMs = Math.max(streaming.maxWorkMs, streaming.lastWorkMs);
    }
  }

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
    if (residency === lastResidency) {
      if (residency?.center) prepareUpcoming();
      return;
    }
    // Construct before retiring the previous resident, so a construction error
    // leaves the old scene coherent and the same residency retryable.
    let next = null, nextSpecs = [], publicationKind = 'synchronousPublications';
    try {
      if (preparation && sameWindow(preparation.residency, residency)) {
        const wasReady = preparation.phase === 'ready';
        while (preparation.phase !== 'ready') advancePreparation();
        next = preparation.visual;
        nextSpecs = preparation.build?.specs ?? [];
        preparation.visual = null;
        preparation = null;
        publicationKind = wasReady ? 'preparedPublications' : 'unfinishedPublications';
      } else {
        cancelPreparation();
        const build = residency?.center ? createFrontierSceneryBuild(residency, buildOptions, recipeCache) : null;
        if (!build) { recipeCache.clear(); groundPatchCache.clear(); }
        try {
          nextSpecs = build?.specs ?? [];
          next = nextSpecs.length ? createVisual(visualOptions(build)) : null;
        } finally { build?.releaseTerrainMemo(); }
      }
    } catch (error) {
      cancelPreparation();
      throw error;
    }
    const remove = (visual?.terrainSurfaces ?? []).map(surface => surface.id);
    const add = next?.terrainSurfaces ?? [];
    try {
      if (remove.length || add.length) physicsWorld?.updateTerrainSurfaces({ remove, add });
    } catch (error) {
      next?.dispose();
      groundPatchCache.prune(specs.map(spec => spec.id));
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
    streaming[publicationKind]++;
    failedPrediction = null;
    groundPatchCache.prune(specs.map(spec => spec.id));
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
      groundPatchCache: groundPatchCache.getDebugState(),
      streaming: { ...streaming, phase: preparation?.phase ?? null,
        target: preparation ? { ...preparation.residency.center } : null },
      ...(visual?.stats ?? {}),
    };
  }

  function dispose() {
    if (disposed) return;
    cancelPreparation();
    const remove = (visual?.terrainSurfaces ?? []).map(surface => surface.id);
    if (remove.length) physicsWorld?.updateTerrainSurfaces({ remove });
    retireVisual();
    specs = []; lastResidency = null; recipeCache.clear(); groundPatchCache.clear(); failedPrediction = null; disposed = true;
    onGeometryChanged();
  }
  return { update, getDebugState, dispose };
}
