# Scoped integration notes — only after model admission

Read-only source inspection, September 14. No runtime code was changed.

The existing Rootbound `lantern-log` uses shared `asset_fallen_log` at X=-444/Z=678, scale .95, yaw .45, kind `low`. Its streamed identity is `f1:s:rootbound-wildwood:lantern-log`. Never replace the shared fallen-log recipe globally: other habitats use it.

An admitted replacement would need a new model-only prop asset in canonical `src/world/data/world.json`, regenerated `world.generated.js`, a local revisioned GLB, and only this curated record's asset-ID change. Preserve the record key/streamed identity. Normalize the actual GLB to Y-up, ground at local Y=0, measured uniform scale and pivot; set its measured footprint radius in `frontierScenery.js`. Keep a decorative role and collision null unless a separately tested collision scope is approved.

**Current renderer gap:** `frontierSceneryVisual.js` handles model-only GLBs for canopy, while low-prop batching requires primitive parts and therefore skips a model-only low prop. A focused external-low branch must reuse `createExternalModelVisual` and its disposal owner, apply the ordinary placement position/yaw/uniform scale, and avoid terrain-surface/canopy registrations. Do not disguise a log as canopy: that introduces canopy semantics and its hardcoded trunk collider.

Existing model loader/validator and package copying already support local `assets/models/<revision>/model.glb`. No new backend, dependency, registry framework or save owner is needed. Deterministic scenery owns no saved harvest state; art replacement alone does not implement composite harvesting or regrowth.

Relevant focused proof: Rootbound record/source exclusions and footprint, low-model transform/render/disposal with no canopy collision/terrain surface, existing external-model descriptor/cache paths, ordinary local streaming/reentry and matched portrait screenshots. Then run the active slice's required integrated tests/verify/ZIP once on the frozen runtime checkpoint. Full gameplay proof is deferred until an asset is actually admitted.
