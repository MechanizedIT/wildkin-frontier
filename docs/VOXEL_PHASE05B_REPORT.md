# Phase 0.5B — Dirt / soil second-material proof

**Result: PASS; stop for owner review.** The implementation, source and extracted-package browser evidence, full repository validation, and independent read-only review are complete. This is a bounded engineering experiment in the isolated voxel lab. It does not migrate the shipping game or authorize Phase 0.5C.

## Research result

Rock and dirt share the scalar/material store, Surface Nets, scalar surface targeting, fixed-quantity ownership ledger, support/connectivity infrastructure, world-to-actor transfer, approximate Rapier proxy lifecycle, prepared publication, save/reload, and failure rollback. A small material registry selects the existing hard-rock response or the new dirt response.

The behaviors are distinct. Rock takes a small irregular chip, records stress on stable rock bonds, weakens over repeated impacts, and can fracture mostly intact into persistent pieces. Dirt takes a broad rounded scoop, inspects a bounded local support window, consumes small unsupported remnants as dirt resource, and transfers one sufficiently large disconnected clod into a dynamic dirt actor. Dirt does not create a rock bond graph, crack overlay, or accumulated brittle stress.

## VERIFIED

### Material architecture and rock regression

- A.4 is retained as the hard-rock policy. The rock profile was not retuned for dirt. Its deterministic chip, persistent bond stress, large fracture, dynamic transfer, recursive child fracture, moved-pose targeting, material accounting and literal save/reload remain covered by the A.4 focused suite and source browser regression.
- `matter-material-policy.js` selects explicit `brittle-stress` and `local-cohesion` policies; unknown material identity fails closed.
- The shared bounded connectivity routine takes a material identity/contact rule. The rock adapter supplies rock-site identities and broken-bond checks. Dirt uses one local connectivity domain and has no rock-bond behavior.
- Dirt world edits and actor edits use the same scalar fields, ownership parcels, transactional preparation/publication, mesh workers, physics owner, persistence validation and material-aware reward ledger as rock.
- Rock legacy saves migrate to explicit rock material identity without changing their ownership; dirt uses its own isolated IndexedDB namespace.

### Dirt sequence

The deterministic bank has a diggable face, lower shelf, overhang and enough connected mass for a meaningful falling clod. It renders from the same 13³ scalar fixture at 0.5 m spacing through Surface Nets.

| Stage | Verified observation |
|---|---|
| First dig | One broad, deterministic scoop removes 80 dirt units; nearby support loss crumbles 41 more. The bank remains static. |
| Repeated dig | A second scoop leaves a readable cavity below the shelf; cumulative direct removal is 179 and crumble is 143. |
| Detachment | A third normal crosshair dig releases one 529-unit dirt clod. At transfer: 2,869 static + 529 actor + 501 consumed = 3,899 initial dirt units. Detachment itself awards nothing. |
| Motion | Across source/package receipts, the clod moves about 8.23–8.26 m and rotates about 3.06 rad before reaching a sleeping state on its four-sector approximate convex proxy. Peak body count is one; there are no persistent tiny actors or transient physics shards. |
| Recursive digging | At the moved pose, broad digs reduce the clod from 529 to 303 to 117 units; another shovel action consumes the remaining small clod instead of creating more persistent bodies. |
| Reload | Literal reload restores the live clod's dirt identity, quantity, pose and rotation. A later reload preserves the dug-out bank and retired clod ID. |

### Material accounting

At the end of the source and extracted-package browser sequences, the dirt ledger is:

```text
initial dirt   3,899
static dirt    2,869
live actors        0
consumed        1,030
balance         2,869 + 0 + 1,030 = 3,899
stone reward        0
```

The source receipt classifies the final consumption as 632 directly dug + 398 crumbled; the extracted-package receipt classifies it as 643 + 387. This 11-unit split variation comes from the crosshair hit on the moved clod; both runs preserve the same exact total, reward, static quantity, actor retirement and zero stone reward. Pure same-seed excavation tests remain deterministic. The intermediate detachment ledger is also balanced: 2,869 static + 529 actor + 501 consumed = 3,899. Focused tests exercise dirt and rock reward isolation, detachment without a reward, and one-time crumble accounting.

### Transaction, persistence and failure proof

Dirt proposal, support analysis, component extraction, mesh/proxy preparation, ownership validation, IndexedDB persistence and publication use the A.4 prepare-before-publication owner. Focused injected failures during detached-clod mesh preparation, proxy preparation, persistence, stale async publication and ownership validation leave the old dirt state, rewards, actor list and visible products authoritative. No rejected operation awards material.

Both source and extracted-package browser runs complete the full dirt sequence with zero page errors and zero external requests. The package was built from `tools/build-voxel-lab.mjs`; the extracted copy is served from its own output directory.

### Human-visible comparison

Open [the matched rock/dirt comparison board](evidence/voxel-phase05b/material-comparison.html). It pairs the A.4 small chip, stress/crack accumulation, brittle detachment and recursive fracture against the dirt scoop, cavity/support loss, clod detachment and recursive crumble. The deterministic live lab is `/lab/voxel/cellular-rock.html?material=dirt`; remove the query parameter for hard rock. Aim at visible matter and click the action button, then use **Follow clod** and **Save & reload** for the moved actor and persistence checks.

## Performance observations

Measurements are from headless Microsoft Edge with SwiftShader at 1280×720 on the bounded fixture. They are comparison evidence, not a mobile budget or a production-world prediction. Across the final source/package receipts:

| Operation | Observed |
|---|---:|
| Dirt scalar excavation update | 0.2–0.7 ms |
| Local support/cohesion analysis | 46.6–287.2 ms |
| Connectivity stage | 5.3–64.1 ms |
| Surface Nets mesh preparation | 9.8–146.2 ms |
| Convex proxy preparation | 1.5–51.4 ms |
| IndexedDB save | 43.7–184.1 ms |
| Whole accepted edit | 150–684 ms |
| Literal browser reload | 0.5–1.9 s |
| Support work units | 6,920–10,424 (12,288 cap) |

The A.4 report measured ordinary rock connectivity at 11.8–28.5 ms and full edits at 131–253 ms in its earlier fixture run. Dirt support/cohesion and complete dirt edits are visibly more expensive in this bounded experiment, especially during clod transfer. Headless timing includes browser scheduling and is not an apples-to-apples hardware benchmark. Frame-p95 telemetry reaches its 50 ms reporting clamp and is not a device performance result.

The fixture caps support analysis at 12 lattice intervals per axis and 12,288 work units; no unbounded world scan or granular simulation is introduced. Support currently visits the entire fixed 13³ fixture rather than dynamically cropping to each impact, a known limit before terrain streaming. Each observed dirt edit used at most one persistent body, four convex proxy sectors, and zero transient rigid bodies. Dirt support/ownership bookkeeping is heavier than rock's ordinary connectivity-only path; detached-clod preparation is the slowest dirt transaction observed.

## PROVISIONAL

- Dirt profile values and thresholds are experimental: base excavation radius 0.98 m with 0.09 m variation, ellipsoid proportions 1.15/0.86/0.92, softness 1.25, 1.9 m cohesion neighborhood, 0.24 support-loss threshold, 128-probe persistent-clod threshold, eight weak-sample edits, 12,288 local work units, and a two-clod ceiling. These are fixture tuning values, not production balance.
- The authored dirt bank and its dig sequence are a curated lab fixture. Scalar excavation for a fixed hit/sequence is deterministic; the final direct-dig versus crumble split varies slightly with the crosshair hit on the moved clod. Total material, reward and ownership remain exact in both source and extracted-package runs. The visual crumble markers are temporary presentation; authoritative quantity moves to the consumed/rewarded dirt ledger.
- Four convex sectors are intentionally approximate and do not reproduce an arbitrary concavity. The measured one-clod tumble is sufficient for this experiment, not a general stability guarantee.
- No real-phone or mobile-landscape performance admission is claimed.

## FAILED

No material strategy or architecture approach was rejected during this phase. No dirt particles, cubes, long-range brittle stress, or duplicate destruction engine were added. A bounded support analysis that exceeds its work budget returns HOLD before state publication.

## FUTURE

Stop after this review. If accepted, the next recommended bounded phase is Phase 0.5C mixed-material interaction. It is not started here. Production terrain, streamed/mixed chunks, a spatially cropped support window, wider collapse patterns, performance admission, mobile testing, wood and crystal remain future work; do not infer design or implementation approval from this single dirt fixture.

## Evidence and validation

- A.4 hard-rock browser receipt and regression screenshots: `evidence/voxel-phase05b/rock-regression/`.
- Dirt source receipt and ten screenshots: `evidence/voxel-phase05b/source/`.
- Dirt extracted-package receipt and ten screenshots: `evidence/voxel-phase05b/package/`.
- Side-by-side human-readable board: `evidence/voxel-phase05b/material-comparison.html`.
- Focused suite: 49/49 matter tests (13 new dirt tests plus the A.4 hard-rock and shared matter tests).
- Full repository `npm test` and `npm run verify`: 1,547/1,547 tests across 175 suites. Verify also passes world and campaign checks, submission build and submission validation (63.12 MB unpacked).
- `npm run zip` was run and passed at 24.79 MB under the original Phase 0.5B checklist, before the owner changed the standing policy. Shipping ZIP creation is now a deployment-readiness check and is not a future routine gate; it was not rerun after that direction.
- The isolated lab package is 5,023,185 bytes unpacked / 1,673,641 bytes ZIP. Source and extracted-package browser sequences each pass all 11 stages, with zero page errors and zero external requests. The A.4 hard-rock browser regression passes all 8 stages with zero page errors/external requests.
- Independent read-only review: PASS. The reviewer confirms shared matter infrastructure, material-specific behavior, accounting, rollback, reload, browser receipts and bounded work. The whole-fixture support window and unimplemented mixed-material validation remain explicit limits.
