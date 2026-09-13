# Scenery visual preparation evidence

September 13, 2026 focused implementation receipt for `src/world/frontierSceneryVisual.js` and `tests/frontierSceneryVisual.test.js`.

## Runtime ownership and API

The frontier runtime owns one optional ground-patch cache for the lifetime of its stable terrain/clearance callback contract:

```js
const owner = stableRuntimeOwner;
const groundPatchCache = createFrontierGroundPatchCache({
  world,
  owner,
  maxEntries: 512,
});
```

The same strict-identity `owner` token and world are passed to each visual job as `groundPatchOwner` and `world`. A new cache is required when callback semantics, owner, or world change. The runtime may call `prune(retainedSpecIds)`, `clear()`, and `getDebugState()`. Cache records own no Three.js or GPU resources.

```js
const job = createFrontierSceneryVisualJob({
  specs,
  visualAssets,
  getHeight,
  canPlaceGroundCover,
  groundPatchCache,
  groundPatchOwner: owner,
  world,
});

job.step(maxWork);
job.getState(); // { status, workCompleted, hasResult }
const visual = job.takeResult();
job.cancel(); // harmless after transfer
```

Job states are `pending`, `complete`, `transferred`, `cancelled`, or `failed`. Work yields after each input spec, each uncached ground candidate or cached patch, and each low render-cell batch. `createFrontierSceneryVisual(options)` remains synchronous and drains the same internal generator, so custom synchronous visual factories retain their existing behavior.

## Bounds and exact behavior

- The cache holds at most **512 patch entries**.
- Each entry holds at most **28 accepted records**, stored as compact matrix and color arrays.
- A cache miss prepares and publishes one **complete successful patch before global truncation**. The visual then applies that patch in the existing sorted order until the unchanged **640-cluster global cap**.
- Cache keys include normalized world identity and the spec fields that affect deterministic placement, fallback height, density, tint, and patch count.
- Failed or cancelled partial patch preparation is never published.
- Stateless calls without a cache retain the existing callback and global-cap behavior.
- Physical terrain surfaces, low-prop batching, render-cell bounds, materials, shadows, colors, and external-canopy ownership are unchanged.

## Focused proof

Cold cached and stateless visuals produced identical capped ground matrices and colors. In the overlap fixture, **49 complete patches were reused** and only one new 13-record patch ran the terrain policy, reducing placement-policy calls from **650 to 13**.

Focused tests also cover the 512/28 bounds, FIFO eviction, explicit pruning and clearing, owner/world mismatch rejection, failure nonpublication, synchronous/incremental geometry and ground parity, one-unit progression, partial cancellation cleanup, repeated idempotent disposal, and result ownership transfer. Cancelling a job after `takeResult()` leaves the published visual alive; disposing that visual retires its ground instance buffers exactly once.

Focused command:

```text
node --test tests/frontierSceneryVisual.test.js
```

Result: **21/21 tests passed**.
