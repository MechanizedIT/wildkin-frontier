# Destructible Matter R&D Roadmap

**Status:** Phase 0.5C.1 HOLD after bounded source-composition/seam proof; stop for owner review
**Scope:** isolated destructible-matter research until a later explicit production-migration gate.

## Vision

Wildkin Frontier should support a substantially destructible world without looking or behaving like uniform Minecraft cubes. Authoritative scalar/material matter is surfaced with low-poly Surface Nets. Materials share one ownership, targeting, persistence, connectivity and static-to-dynamic framework, but differ in how tools remove matter and how unsupported or stressed matter fails.

Examples:
- **Hard rock:** small irregular chips; impact stress; brittle structural fracture; large retained pieces remain recursively destructible.
- **Dirt/soil:** broad soft excavation; low cohesion; local crumble/slump; unsupported clods detach readily; little rock-like long-range stress.
- **Wood:** future directional grain, splitting and splintering.
- **Crystal/ice-like brittle matter:** future sharp/sudden fracture.
- Other materials should normally be profiles/strategies over the shared engine, not parallel destruction systems.

## Established foundation

Phase 0.5A.4 is the current architectural proof. It demonstrated:
- authoritative scalar/Surface Nets mining separated from approximate convex physics proxies;
- deterministic small hard-rock chips separated from structural damage;
- persistent bounded bond stress and weakness;
- static supported matter becoming a dynamic actor;
- a mostly intact rock fracturing at 2,151/2,164 units remaining (99.40%);
- recursively mineable/fracturable moved children;
- exact material accounting and transactional rollback;
- save/reload of actors, lineage, poses and structural state.

Preserve the A.1-A.3 collision studies as negative evidence. Do not resume exact arbitrary-concavity collider research unless new evidence materially changes the problem.

## Working invariants

1. Authoritative matter, visible/precision surface, and rigid-body physics proxy are separate concerns.
2. Precision mining targets authoritative visible matter, not coarse physics proxies.
3. Fracture/detachment never creates resources; only actual material consumption can.
4. Static-to-dynamic ownership transfer is atomic: no duplicate or lost matter.
5. Large detached pieces may remain persistent recursively destructible actors; small pieces use bounded transient/debris tiers.
6. Structural/destruction work must remain deterministic and bounded.
7. Material behavior belongs behind profiles/strategies. Avoid scattered material-name conditionals.
8. Every phase is an experiment with evidence, tests, PASS/HOLD criteria, and a stop for owner review.
9. Do not migrate the lab into shipping world code until the roadmap reaches the explicit production-integration gate.

## Phase roadmap

### Phase 0.5B — Dirt / second material profile

**Question:** Can the same engine produce a material that feels fundamentally unlike hard rock without becoming a second destruction system?

Build a dirt/soil profile in the isolated lab. Dirt should excavate a broader soft volume, have low cohesion, avoid rock-style long-distance crack accumulation, locally crumble/slump when unsupported, produce clods/debris under the existing tier policy, and allow a meaningful unsupported clod/overhang to detach and remain destructible.

**PASS gate:** rock still behaves as rock; dirt visibly and mechanically behaves differently; both use shared matter/ownership/targeting/persistence/static-to-dynamic infrastructure; no material-specific fork of the whole engine.

**Disposition (2026-09-24): PASS.** A central material strategy selects A.4's brittle-stress rock policy or a separate local-cohesion dirt policy. Both retain the shared scalar matter, Surface Nets, precision targeting, ownership/accounting, connectivity, actor/proxy lifecycle, transactional publication and persistence paths. The dirt bank visibly scoops broadly, forms a cavity, locally crumbles and releases a substantial clod that falls, rotates and remains targetable/destructible after movement and reload. The fixed support window visits a bounded 13³ fixture; crop this work spatially before applying it to streamed terrain. Exact final ledger: 3,899 dirt = 2,869 static + 0 live actor + 1,030 consumed, with zero stone. Source and built-lab sequences, matched rock comparison and receipts are in [the Phase 0.5B report](VOXEL_PHASE05B_REPORT.md) and the [evidence folder](evidence/voxel-phase05b/). Focused matter tests pass 49/49; full tests and verification pass 1,547/1,547. Independent read-only review passed. Dirt thresholds remain provisional, and mixed-material behavior was not tested.

### Phase 0.5C — Mixed-material interface

**Question:** Can two materials coexist in one authoritative volume and interact correctly?

Create a bounded dirt+stone fixture: soil around/over/under embedded rock. Excavate soil from beneath a rock until support changes and the rock can detach/fall. Verify boundary targeting, material-specific tool response, ownership, support transfer, no cross-material corruption, and reload.

**PASS gate:** the same world volume supports material boundaries and one material's removal can structurally affect another without converting, duplicating or deleting matter.

**Disposition (2026-09-24): PASS.** One 13³ authoritative volume contains 336 rock and 3,564 dirt units. Actual dirt occupancy removal changes shared support and transfers all rock into a dynamic ROCK actor without reward; the actor falls, remains targetable, and uses hard-rock chip/stress. Per-material and combined ledgers balance through literal reload. Dirt cohesion and rock stress remain separate registered strategies, while protected foreign samples prevent either dirt crumble path from clearing rock. Support work is 6,912–6,915 units, comparable to Phase 0.5B's 6,920–10,424. The fixture, shared contact semantics, and approximate proxy remain provisional; no production/mobile readiness is claimed. Browser captures, receipt, tests, independent review, and limitations are in [the Phase 0.5C report](VOXEL_PHASE05C_REPORT.md) and [visual sequence](evidence/voxel-phase05c/material-interaction.html).

**Important remaining boundary question:** C proves support, targeting, ownership and policy isolation, but its fixture resolves dirt and rock onto one shared scalar lattice with mutually exclusive material labels: rock samples overwrite dirt samples where the authored fields overlap. The current Surface Nets renderer then colors generated vertices from nearby material samples. This has not yet proved the long-term composition model for buried/overlapping procedural sources or a crisp exposed dirt↔rock seam without unintended interpolation. Resolve that explicitly before expanding to terrain chunks.

### Phase 0.5C.1 — Material composition and visual seam proof

**Question:** What is the simplest durable representation for multiple material sources on one shared lattice, and can an exposed dirt/rock boundary remain watertight and visually crisp through excavation?

Compare the current resolved single-density/material-label representation against a layered/composited-source prototype only as far as needed to answer the question. Prefer a shared sample lattice and one final meshing pass; do not render independent overlapping dirt and rock Surface Nets meshes. Test a buried rock inclusion revealed by dirt excavation, exposed material seams, repeated edits at the boundary, and extraction of the rock into its own actor-local matter volume.

The experiment must distinguish **source composition** from **final ownership**: physical matter is still mutually exclusive after composition, but procedural/source layers may overlap before a deterministic precedence/composition rule resolves the final sample. The renderer should support a crisp material boundary when desired, e.g. by triangle/material classification or seam-split vertices rather than relying on interpolated vertex color across rock/dirt transitions.

**PASS gate:** one watertight visible surface; no cracks, overlap, z-fighting or internal duplicate faces; deterministic material precedence; dirt excavation reveals rock without corrupting either material; boundary edits remain stable; actor extraction preserves the resolved rock material; a crisp exposed rock/dirt visual seam is demonstrated; the chosen representation is documented with costs and limitations.

**Disposition (2026-09-24): HOLD.** Explicit rock-over-dirt composition is deterministic and order independent; runtime state remains one resolved density/material field. The triangle-classified crisp mode preserves the shared Surface Nets triangles and positions (908 triangles; 22 extra render vertices in the captured mixed fixture). Extraction/reload tests confirm displaced dirt does not regenerate in the old rock volume. A separate fully buried fixture reveals rock progressively under dirt-only edits on the same mesher. Recommendation: HYBRID—compose only at generation boundaries, then persist resolved matter and edits. The full buried sequence has not yet gone through the persisted interactive transaction/ownership/detachment path, a meaningful chunk-edge seam probe is deferred to D, and the existing C Rapier rotation assertion currently fails at 0.153 rad vs >0.25 rad. See [C.1 report](VOXEL_PHASE05C1_REPORT.md) and [evidence board](evidence/voxel-phase05c1/material-composition.html). Stop for owner review.

### Phase 0.5D — Terrain excavation

**Question:** Does the architecture work on terrain-like chunks rather than a curated boulder fixture?

Use a bounded terrain patch with surface, wall/slope, shallow cave/overhang and embedded material. Demonstrate repeated excavation, chunk-boundary edits, remeshing, collision publication, and retained static matter.

**PASS gate:** natural holes/tunnels/cuts work across representative chunk boundaries without seams, stale collision, or ownership errors.

### Phase 0.5E — Localized collapse

**Question:** Can unsupported terrain fail locally without globally simulating the world?

Add bounded dirty-region support/connectivity invalidation around edits. Demonstrate an undermined ledge/slab becoming unsupported, extracting atomically, falling, and remaining destructible. Small unsupported matter should crumble/debris rather than proliferate permanent actors.

**PASS gate:** convincing local collapse with explicitly bounded search/work and no whole-world structural scan.

### Phase 0.5F — Scale and performance

**Question:** Can the proven behavior fit a practical mobile-first budget?

Profile representative terrain edits and collapse scenarios. Investigate caching/persistent structural graphs, localized invalidation, asynchronous jobs, collider/mesh rebuild batching and actor/debris budgets only where measurements identify costs. Include real-device evidence before claiming a mobile budget.

**PASS gate:** define measured production-oriented budgets for edit latency, frame impact, memory, active actors/debris and dirty-region work, or HOLD with the dominant bottleneck identified.

### Phase 0.5G — Directional material proof (wood)

**Question:** Can the shared material architecture support anisotropic failure rather than only scalar cohesion changes?

Add a bounded wood fixture/profile with grain-biased damage, along-grain splitting/splintering and cross-grain resistance. Preserve shared ownership, targeting, persistence and actor machinery.

**PASS gate:** wood's directional failure is clearly different from both rock and dirt without replacing the core engine.

### Phase 0.5H — Production integration decision

**Question:** Is the R&D architecture mature enough to become Wildkin's actual terrain/matter system?

Review all evidence, simplify experimental code, define production data ownership/chunk streaming/save schema/tool APIs and migration path. Only after this review should isolated-lab concepts enter shipping systems.

**PASS gate:** explicit production architecture, budgets, migration plan and regression strategy. Implementation migration should be separately authorized.

## Optional later material work

After the general architecture is proven, crystal, ice, sand/gravel, metal/alien matter and layered/geological stone can be introduced as targeted material-profile experiments. They should not delay the core dirt -> mixed material -> composition/seam -> terrain -> collapse -> performance path unless a phase exposes a fundamental abstraction problem.

## Workflow for each phase

For every phase:
1. Review the previous committed result and negative evidence.
2. Write a detailed bounded implementation spec from the observed outcome.
3. Implement one uncertainty-reducing experiment.
4. Add focused deterministic tests and failure injection.
5. Produce human-visible browser evidence.
6. Run `npm test` and `npm run verify`; defer shipping ZIP creation and package checks until deployment readiness.
7. Record VERIFIED / PROVISIONAL / FAILED / FUTURE findings.
8. Commit/push only when authorized.
9. Stop for owner review.
10. Use the result to write the next phase's detailed spec rather than pre-committing to implementation details too far ahead.

This roadmap fixes the sequence and decision gates, not every future implementation detail.
