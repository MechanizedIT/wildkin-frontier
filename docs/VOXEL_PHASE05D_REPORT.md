# Phase 0.5D — Multi-chunk terrain excavation

**Disposition: HOLD — stop for owner review.** This bounded experiment demonstrates several chunk-local terrain primitives, but it does not complete the required C.1R MatterActor extraction chain or all required scenario evidence. Phase 0.5E has not started and should not start until these D blockers are resolved.

## VERIFIED

- The source-browser lab builds a fixed 3×3 X/Z patch (9 chunks, one vertical layer), each with 16³ logical cells and 0.5 m scalar spacing. It is a finite experiment, not a streamer.
- Global samples use safe integer `(gx, gy, gz)` addresses. Sample ownership is half-open `[16c,16(c+1))`; the positive-side chunk owns a boundary sample. Cells/faces are meshed from the lower endpoint. Each 18³ chunk input copies one sample on each side as read-only halo; halos are neither edits nor persisted parcels.
- Dirt and rock sources resolve deterministically from global coordinates through the existing precedence compositor, with a shallow carved alcove and exposed/buried rock forms. A single global sparse edit map overrides the generated samples.
- Surface Nets consume independent chunk snapshots. Tests check the combined interior patch edge topology and absence of duplicate triangles, before and after edits. These are numerical mesh tests; no perceptual close-up material-seam evidence was captured.
- A changed sample invalidates chunks from its eight adjacent lower-endpoint cell dependencies, clipped to the fixed patch. Focused sets: interior `[4,4,4]` → `0,0,0`; seam `[16,4,4]` → `0,0,0` and `1,0,0`; XZ corner `[16,4,16]` → four chunks. Browser edits rebuilt 1, 2, and 2 chunks, respectively; the final labeled corner browser step did not actually reach the corner, so only the unit test proves four-chunk derivation.
- Each candidate dirty chunk prepares a mesh and static collider. Persistence precedes a synchronous candidate-install attempt, followed by retirement/replacement. Unchanged chunk product objects are reused. Injected mesh, collider, save, ownership and stale-revision failures retain the old installed set; the install-failure test throws before mutating products and verifies the old in-memory revision plus durable save rollback. Recovery from a failure after partial Rapier mutation is not proved. Rollback-store failure is exposed as `recoveryRequired` rather than represented as a successful transaction.
- Browser test receipt recorded zero page/console errors and zero external requests. For the interior edit it measured 19 changed samples, 1 rebuilt chunk, 8 reused, 26.7 ms mesh, 1.2 ms collider, 0.2 ms save and 29.3 ms transaction. A dirt seam edit measured 11 samples, 2 rebuilt / 7 reused, 20.2 and 20.7 ms mesh, 1.4 and 2.1 ms collider, 44.8 ms total. A later rock edit measured 42 samples, 2 rebuilt / 7 reused, 16.0 and 16.1 ms mesh, 1.3 and 3.6 ms collider, 37.8 ms total. These are headless SwiftShader observations, not a performance budget.
- Sparse overrides survive literal serialization/reconstruction in focused tests. Browser reload restored revision 3 and 72 sparse overrides; the lab resets last-edit diagnostics at reload, so it did not display a post-reload last edit.

## PROVISIONAL

- The terrain surface and material compositor are simple experiment profiles. Density conventions and precedence are reused from the prior lab, but the profile is not an admitted production generator.
- The publication attempt relies on one synchronous browser-thread install callback; it is not a worker scheduler or cross-thread swap protocol. Collider geometry is derived from the same candidate mesh, but no test proves recovery from a partially applied Rapier install or that a dynamic MatterActor remains stable over a replaced contact chunk.
- The browser terrain view has crosshair mining, orbit, zoom, ground-plane WASD, dirt/rock selectors, dirty/chunk diagnostics, save/reload, and a static Rapier ray comparison. The gold dynamic ball is a generic collision marker and has no matter identity.
- Patch memory was not measured. Mesh timings are local observations only. No mobile/device claim is made.

## FAILED / CORRECTED

- Independent read-only review found the central integration gap: the new terrain lab does not call C.1R `matter-actor`, `matter-ownership`, `matter-connectivity`, support or actor-product-reuse paths. No cross-chunk rock transfer creates a real MatterActor; no exact world/actor/per-material ledger, once-only transfer, actor pose/retirement persistence or post-reload cavity guarantee is established by the browser chain. The existing single-volume C.1R tests remain the baseline but do not close this chunk integration gate.
- The detached-rock and dynamic contact requirements are therefore unproved. No bounded support query evidence or locality work ledger exists in the chunk lab.
- Browser screenshots do not demonstrate a continuous tunnel through two seams, rock excavation across an actual seam, four-chunk corner edit, boundary embedded-rock detachment, or reload of an extracted actor. Browser reload shows edited terrain only. The requested 15-stage evidence set is incomplete.
- The first headless capture mislabeled an interior edit as the boundary stage. The corrected browser run drove the hit to x=8.74 m and produced the real X-boundary dirty set `0,0,0` + `1,0,0`. The later rock hit remained near that X seam and did not reach the XZ corner. It is retained as boundary continuation evidence, not corner evidence.
- Fixed patch validation now rejects absent chunk ownership instead of silently growing residency. A multi-chunk install exception now rolls back candidate products and the previous saved revision. These corrections have focused failure tests.

## FUTURE

1. Integrate the existing C.1R matter ownership, bounded support and actor transfer contracts with globally addressed chunk matter, or record the exact architecture blocker if their current 13³ semantics cannot be cropped safely.
2. Add all-or-nothing world + actor + reward + sparse-edit transactions and literal reload after boundary rock extraction; prove old location remains air and actor products are chunk-independent/reused.
3. Add browser scenario and receipt assertions for an actual four-chunk corner edit, tunnel through multiple seams, rock mining on a seam, post-edit static collision and actor contact.
4. Produce the required close-up material proof, remaining human-visible captures, and a reviewed evidence board/receipt, then repeat independent review and full validation.
5. Only after D passes and the owner reviews it, consider Phase 0.5E localized terrain collapse. Do not start E now.

## Architecture and proof scope

| Concern | Phase D implementation / current limit |
| --- | --- |
| World lattice | Safe integer global sample coordinates; `floor(g/16)` chunk and remainder local address. |
| Ownership / halo | Half-open sample ownership; copied one-sample read-only halo; physical ownership still conceptually WORLD, but no integrated chunk ledger yet. |
| Sparse edits | One global `Map` keyed by integer coordinate string; override replaces procedural density/material. Save stores only edits and revision, no halos or derived products. |
| Dirty set | Changed sample → adjacent lower-endpoint cells on each axis → their chunks, clipped to nine resident IDs. |
| Publication | Prepare dirty chunk meshes/colliders, save candidate, attempt synchronous candidate installation, then swap revision/products; tested failures reject and discard candidates, while rollback after partial Rapier mutation is unproved. |
| Collision | One static Rapier trimesh per chunk; browser ray sees rendered and Rapier targets. No complete seam-gap/dynamic actor proof. |
| Support / extraction | Not implemented in this terrain world; C.1R remains a separate single-volume path. |
| Measured locality | Browser interior: 1/9 rebuilt; X boundary: 2/9 rebuilt; intended corner test: 4/9 by unit test only. |

## Evidence and validation

- [Compact evidence board](evidence/voxel-phase05d/board.html)
- [Browser receipt and captures](evidence/voxel-phase05d/source/)
- Browser URL used: `http://localhost:8099/lab/voxel/cellular-terrain.html`
- Focused Phase D tests: 16 passing.
- Baseline before implementation: `npm test` 1,567 passing across 175 suites.
- `npm test`: 1,583/1,583 across 175 suites. `npm run verify`: same tests pass, world/campaign checks pass, submission build completes, submission validation passes at 63.12 MB. This verifies the repository; it does not close the Phase D actor/collision/evidence HOLD gates.

## Phase 0.5D.1 integration attempt — September 24, 2026

**Disposition: HOLD — Phase D remains incomplete.** This section preserves the original D HOLD record above. The owner requested integration of C.1R's matter contracts into the multi-chunk world without redesigning the existing chunk primitives or starting collapse. This pass added only the first bounded adapters and exact global parcel-accounting experiment; it did not publish them through the terrain runtime.

### VERIFIED

- `TerrainMatterWindow` reads the authoritative global `TerrainChunkWorld.read()` field, copies a requested inclusive sample range, retains global bounds and provides checked global/local conversion. Snapshot readers bind to their copied arrays. It allows the positive outer sample as a read-only cell corner while the parcel inventory excludes it; attempts to publish changes to patch halos reject. `analyzeTerrainMatterConnectivity` records query bounds/work and returns HOLD when occupied evidence touches the local window edge.
- Global C.1R-style probe identity is `gx,gy,gz:probe` for eight subcell probes per global lower-endpoint cell. Identity does not use chunk IDs, and no halo enters the patch ownership table.
- `TerrainMatterLedger` uses typed owner/material arrays for the fixed 48×16×48 owned cell patch × eight probes. The measured arrays occupy **589,824 bytes** total. Initial resolved ownership is **139,655 ROCK** and **9,215 DIRT** probes, all WORLD. Tests transfer one rock parcel to an actor owner, consume it once, and keep per-material balances exact.
- Focused D baseline: 16/16. Focused C.1R actor/connectivity/ownership/reuse/physics/persistence/mixed/publication baseline: 33/33. New adapter tests: 4/4. Final `npm test` and `npm run verify`: **1,587/1,587 across 175 suites**; verify also passes world/campaign checks, submission build, and submission validation at 63.12 MB.

### PROVISIONAL

- The global probe format and typed tables are a bounded experiment, not the production ownership schema. The ledger's standalone transfer methods and export/restore demonstrate arithmetic/persistence, but are not called by chunk edits and therefore are not yet the authoritative runtime owner.
- The adapter's sample copying has not yet been connected to the C.1R dirt/mixed support and extraction proposal. Support query bounds, visited cells/bonds and before/after component state are therefore **not measured** for this terrain.
- The current seed/profile resolves 139,655 rock probes over much of the patch. The existing seam-side rock overlay is continuous across the X seam but overlaps the broad bedrock field; it does not yet qualify as the required independently extractable, dirt-supported boulder.

### FAILED / NOT COMPLETED

- The new ledger is not integrated into `TerrainChunkWorld.prepareEdit/publishEdit`; sparse edits, ownership, actors, rewards and save data can still disagree because the new types do not join a shared proposal. No transfer/extraction or post-transfer dirt support pass was implemented.
- No real `MatterActor` is created in the terrain browser. Terrain and actor products are not staged/committed together, actor bodies do not share the terrain lab's Rapier world, actor products are not reused there, and no actor is mined at a moved pose.
- Save/reload remains terrain sparse edits only. No terrain ownership ledger, actor structure/pose, retirement or reward state is serialized by the chunk lab.
- The required human-visible sequence was not captured for this attempt. In particular: actual four-chunk corner browser edit, two-seam ordinary-input trench, static Rapier seam/cavity tests, dirt↔rock real chunk-boundary close-up, rock support/removal/transfer, dynamic actor contact/body reuse/mining/reload, and final evidence receipt assertions remain absent.
- Partial Rapier installation recovery for a combined terrain+actor transaction remains unproved. An independent read-only reviewer checked only the new adapter after implementation and confirmed its focused fixes; the reviewer did not assess the larger Phase D integration. No independent completion review is available, so this attempt makes no Phase D review/pass claim.

### FUTURE

1. Refactor the minimal C.1R state/frame/actor construction seams so a global-window snapshot can be processed without converting physical parcel identities into chunk ownership or maintaining two ownership authorities.
2. Compose dirt excavation, bounded mixed support, connected rock extraction, exact global parcel transfer, post-transfer dirt support, actor products, dirty chunk products and durable save into one prepare/validate/persist/publish transaction.
3. Put prepared terrain colliders and C.1R MatterActor bodies in one Rapier world; prove both product reuse and explicit fail-closed recovery after partial installation.
4. Repair the seam-side fixture so its resolved rock is actually supported by removable dirt rather than continuous bedrock. Prove component state from the resolved field, not an edit-count trigger.
5. Complete required browser sequence, persistence and cross-seam collision evidence; add focused transaction tests and obtain independent read-only review.
6. Run full validation after those changes. Do not begin Phase 0.5E until D passes and is reviewed.
