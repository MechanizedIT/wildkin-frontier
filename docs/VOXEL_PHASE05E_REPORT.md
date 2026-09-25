# Phase 0.5E — Localized Terrain Collapse / Mixed-Material Slab

**Disposition: PASS for the bounded isolated lab; stop for owner review. Do not start Phase 0.5F.**

Starting baseline: Phase 0.5D.1 runtime integration commit `2beaecf9c0724ee63c56f5388f9f536956f2cbe1` and documentation closure `8c01779eef06835b55536144fa0d3b3a18a8eecc`. Phase D regression fixtures remain available and pass.

## VERIFIED

### Player-visible result and fixture

The cellular terrain lab now lets a player progressively scoop an ordinary generated mixed-material ledge, create an alcove below it, remove its last proven support, and watch one connected slab detach as a destructible `MatterActor`. There is no collapse button, hit counter, timer, or named-fixture trigger. The browser playtest uses ordinary dirt/rock tool selection and crosshair clicks; only camera framing is automated.

The ledge begins connected to the fixed bottom anchor. Its continuous generated matter contains dirt and rock, an excavatable underside, and samples in four source chunks: `-1,0,0`, `-1,0,1`, `0,0,0`, and `0,0,1`. Early excavation revisions 1–3 are completely analyzed and remain anchored. Revisions 4–5 are accepted digs whose support analysis reaches unknown resident boundaries; collapse is deferred. Revision 6 completes evidence and extracts a single mixed slab. Unknown support is not treated as air or as proof of unsupported matter.

The detached world-space cell bounds are `[-9,9,11]..[15,14,24]`, or 25×6×14 cells. The actor scalar snapshot derives its dimensions from that component and one-sample halo: 28×9×17 samples (27×8×16 intervals). It owns one connected authoritative component with 1,373 ROCK parcels and 3,126 DIRT parcels. A later dirt edit leaves 2,972 DIRT parcels in the actor; a rock edit leaves 1,373 ROCK parcels. No material boundary splits the physical actor.

### Local structural search and budgets

`terrain-collapse.js` derives seed cells from every changed global scalar sample by enumerating the eight adjacent lower-endpoint cells, de-duplicating and sorting them. The initial window is margin 4 around those seeds, clamped to the resident patch and bottom anchor plane. A component is a collapse candidate only when it is complete, unsupported, and touches the edit neighborhood.

If occupied evidence reaches an unknown boundary, the query grows only along the reported boundary axes, by two intervals, and retries. It stops on complete anchored/unsupported evidence, the resident patch boundary, or an explicit bound. Incomplete evidence returns `DEFERRED_UNKNOWN_SUPPORT`; the valid direct edit can still commit. Each edit has at most four stabilization passes after extraction.

The provisional `TERRAIN_COLLAPSE_POLICY` bounds are explicit: initial margin 4; expansion step 2; at most 10 expansions; query dimensions at most `[28,16,28]` intervals; 90,000 cumulative samples; 42,000 cells; 95,000 bonds; 160,000 query work units; 180,000 samples and 320,000 work units per edit; four stabilization passes; three generated actors per edit; four total actors in the resident world; four transient fragments per edit; actor dimensions at most `[28,20,28]` intervals; and 8,192 parcels per actor. Material thresholds are tiny dirt ≤15 parcels, transient dirt ≤127, tiny rock ≤23, and transient rock ≤95. These are experiment limits, not production budgets.

Typical ordinary edit: 5,079 work units, zero expansions, four chunks read, one chunk written/rebuilt. The collapse-triggering edit used 64,474 cumulative samples, 30,174 cells, 80,059 bonds and 110,233 work units across two complete queries. It expanded nine times for the initial query (99,269 work units) and used 10,964 more for post-transfer stabilization. It read six of nine resident chunks; support inspection did not dirty chunks.

For that collapse edit, the seed query began at `[-7,0,12]..[5,16,24]` and the post-transfer stabilization window ended at `[-10,0,10]..[16,15,25]`. The largest completed first-pass query reached `[-11,0,10]..[17,16,26]`, still within the provisional `[28,16,28]` interval cap.

### Material policy, extraction and transaction

The component classifier uses immutable parcel materials from the ownership ledger. Tiny dirt is explicitly classified for crumble/consumption; small dirt for transient clod policy; larger dirt for persistent actors. Rock has separate debris, transient and persistent thresholds. Mixed components remain mixed persistent actors. Any component above actor dimensions or parcel limits is deferred as `COLLAPSE_DEFERRED_OVERSIZE`; actor-count and transient-count limits also defer creation. Collapse and detachment do not grant rewards.

Generic extraction computes exact global component bounds and a minimal scalar halo, snapshots resolved occupancy and material, maps global parcel IDs into actor-local parcel ownership, transfers each parcel WORLD→actor once, and writes sparse air/tombstone edits to the world. The derived write set drives chunk mesh/collider preparation. The 929 tombstone samples are air after extraction and remain air after reload. Read-only structural chunks are not rebuilt.

One terrain edit stages direct excavation and rewards, bounded support queries, classification, optional crumble/transfer, stabilization, terrain meshes/colliders, actor meshes/proxies, ownership validation, persistence, and synchronous coherent publication as one transaction. Failure after partial terrain/actor product installation rolls back both products and the saved revision. A failed rollback locks the world as recovery-required until literal reload.

Failure injection covers incomplete support (direct digging still commits), actor construction, parcel transfer, terrain mesh, static collider, actor mesh, actor collider, ownership, save, stale revision, partial multi-product installation and rollback/recovery-required. Rejected collapse transactions preserve revision, world/actor ownership, rewards and history. The stale proposal remains rejected after a newer valid edit.

### Physics, recursive edits, collision and persistence

The slab and static chunks use the same Rapier world. The actor COM falls 1.2344 m, rotates 0.15064 rad, contacts chunks `-1,0,0`, `-1,0,1`, and `0,0,1`, then settles at zero speed. No impulse blast is used. The post-collapse cavity's visible and Rapier static-ray distances differ by `1.25e-8 m`; the scene retains all nine static chunk collider products.

After movement, a dirt target uses dirt excavation/cohesion behavior and preserves rock; a rock target uses hard-rock chip/stress behavior and preserves dirt. The dirt edit consumes 154 dirt parcels. The rock edit changes one scalar sample and visits 24 stress nodes / 48 bonds, but consumes no rock parcel and creates no crack in this run. Actor parcel-map audits match immutable ledger ownership at extraction, after both edits, and after reload. The browser receipt records one scalar-label drift probe; that scalar-derived label is non-authoritative for parcel accounting and targeting. The independent reviewer accepted the ledger-backed identities and calls out the remaining scalar-label drift as a representation limitation.

Literal reload restores revision 8, the collapsed cavity, one mixed actor, its moved pose and material-specific actor parcels. Collapsed samples do not regenerate. Final exact accounting is:

| Material | Initial | World | Actors | Consumed / rewarded |
|---|---:|---:|---:|---:|
| ROCK | 140,018 | 138,645 | 1,373 | 0 |
| DIRT | 11,528 | 7,996 | 2,972 | 560 |

The 406 dirt parcels consumed before/at collapse were direct excavation; collapse consumed zero. After movement, actor mining consumed 154 dirt and zero rock. Reward totals match consumed quantities. All balances are exact.

### Browser evidence and measured work

The human-visible automated sequence captures 23 screenshots, including the pristine ledge, chunk overlay, undermining, support windows, collapse, fall/contact/settle, cavity rays, read/write sets, both moved-actor materials, save and reload. The durable receipt is `docs/evidence/voxel-phase05e/source/receipt.json`; screenshots are in the same directory. It reports zero page errors, console errors, and external requests. A mobile-landscape browser-emulated regression confirms one tap changes 16 samples in exactly one transaction and a swipe rotates the camera without editing terrain. This caught and corrected a double-activation path where both touch `pointerup` and the browser's synthesized `click` could excavate. Touch taps now excavate through the click path once; pointer events only track the orbit gesture. The touch receipt records initial/edited revisions and an exactly-one-transaction assertion. This is browser-emulated input evidence, not physical-phone validation or a mobile performance claim.

End-to-end transaction timing now includes preparation through publication. In this headless SwiftShader run, an ordinary edit took 564 ms; supported undermining edits took 472–564 ms; unknown-support edits took 701–905 ms; the collapse edit took 2,114 ms; moved-actor dirt and rock edits took 1,137 ms and 647 ms. The collapse receipt separately records 342 ms direct-edit accounting, 688 ms support-query time, 4.5 ms classification, 108 ms extraction and 395 ms publication. The selected phase timers do not add up to full transaction time: component partitioning, validation and orchestration are included in the end-to-end number but not each separately instrumented. These timings are observations from a bounded headless run, not a device budget.

Only chunks in the final write set rebuilt: direct edit chunks `-1,0,1` and `0,0,1`; collapse/final write chunks `-1,0,0`, `-1,0,1`, `0,0,0`, `0,0,1`, `1,0,0`, `1,0,1`. Three unrelated top-row chunks were reused. Ordinary edits did not scan or rebuild all nine chunks.

## PROVISIONAL

- The 3×3 patch, single chunk-height band, anchor plane, failure thresholds, support budgets and fixture layout are bounded experiment choices.
- Convex actor collision is the existing approximate gameplay proxy. The small observed rotation is finite but not an artistic target.
- This ledge's final collapse produces one large mixed actor, with zero transient fragments and zero crumble fragments. Tiny dirt/rock tiers and oversize deferral are verified by deterministic classifier tests; this browser chain did not happen to produce a separate tiny remnant.
- One probe has a resolved scalar material label that differs from immutable parcel material. The actor-local parcel map remains authoritative for transfer, ledger and hit-material dispatch. A future representation pass may remove that diagnostic drift.
- Headless transaction timings are not suitable for inferring phone frame time or mobile collapse budgets.

## FAILED / CORRECTED

- An initial classification/extraction version counted material from mutable scalar labels. Independent review found an actor parcel/material total mismatch. Classification and actor parcel maps now use immutable ledger material identity; `assertActorParcelMaps` runs on transfer/mining, and tests audit identities after collapse, dirt mining, rock mining and reload. The current browser harness fails if any actor map or material total diverges. Independent re-review: PASS.
- The first end-to-end receipt used `transactionMs` for publication only. It omitted support and extraction. The clock now starts at edit preparation and ends after coherent publication; `publicationMs` remains separately measured. A test asserts transaction time includes the measured preparation and publication phases, and the browser receipt was regenerated.
- The first mobile touch path excavated from both touch `pointerup` and its synthesized `click`, which could publish twice and made the exact-one-edit playtest time out. Excavation now runs once through the click event; the regression asserts a single revision per touch tap and no revision for orbit swipes.
- Unknown boundaries at revisions 4–5 defer structural action even though direct edits commit. This is expected fail-closed behavior, not a collapse failure.

## FUTURE

- Phase 0.5F is explicitly not started. Stop for owner review.
- Preserve this experiment's bounded locality/ownership path and measure real-device behavior only when separately authorized.
- No infinite terrain, streaming, structural caching, production migration, stress geology, granular soil, or broad optimization is claimed.

## Validation and review

Validation after the touch exactly-once correction: Phase E focused tests 36/36; `npm test` passes 1,603/1,603 across 175 suites; `npm run verify` passes the same suite plus world/campaign checks, submission build (30,479.8 KB), and submission validation (63.12 MB). The terrain-collapse and touch browser harnesses pass; independent read-only review: PASS. `git diff --check` is clean. Physical-phone retest remains unverified. Phase D.1 evidence and history remain in `VOXEL_PHASE05D_REPORT.md`; this report does not rewrite its earlier PASS evidence.
