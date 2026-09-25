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
