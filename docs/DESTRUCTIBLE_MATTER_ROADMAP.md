# Destructible Matter R&D Roadmap

**Status:** Phase 0.5E PASS for the bounded browser R&D lab. Project direction has pivoted to a PC-first native production target. The next gate is **Unity-first Phase 0.5F qualification** using Unity 6.3 LTS + HDRP with Codex/agent workflow as a first-class criterion. Unreal Engine 5.8 remains a challenger only if Unity exposes a meaningful blocker or the owner later requests the comparison. The browser implementation remains the behavioral reference; do not begin a full production migration until Unity qualification is reviewed. See [Unity-first transition plan](UNITY_FIRST_TRANSITION_PLAN.md) and [PC engine bakeoff criteria](PC_ENGINE_BAKEOFF_PLAN.md).
**Scope:** the existing Three.js/Rapier matter lab remains an isolated executable specification. New implementation work after Phase E should target the native PC engine bakeoff rather than optimizing the browser/mobile stack for production.

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

**Disposition (2026-09-24): HOLD.** Explicit rock-over-dirt composition is deterministic and order independent; runtime state remains one resolved density/material field. The triangle-classified crisp mode preserves the shared Surface Nets triangles and positions (908 triangles; 22 extra render vertices in the captured mixed fixture). Extraction/reload tests confirm displaced dirt does not regenerate in the old rock volume. A separate fully buried fixture reveals rock progressively under dirt-only edits on the same mesher. Recommendation: HYBRID—compose only at generation boundaries, then persist resolved matter and edits. The full buried sequence has not yet gone through the persisted interactive transaction/ownership/detachment path, a meaningful chunk-edge seam probe is deferred to D, and the existing C Rapier rotation assertion currently fails at 0.153 rad vs >0.25 rad. See [C.1 report](VOXEL_PHASE05C1_REPORT.md) and [evidence board](evidence/voxel-phase05c1/material-composition.html).

**Original owner playtest disposition, before C.1R:** camera-relative WASD and long-range visible-surface mining had been added and verified. The remaining C.1 gate included four observed runtime/perceptual defects: (1) a mined rock could become visibly disconnected while remaining one physics actor/proxy, (2) dirt that lost support after rock extraction could remain floating because post-transfer dirt support was not re-resolved, (3) subsequent world dirt edits could visibly perturb a settled rock actor, and (4) triangle-majority crisp seams produced an unnatural sawtooth material boundary. The buried-rock proof also needed to move from a limited preview into the ordinary interactive/persisted edit path. These bounded issues are addressed in [C.1R](VOXEL_PHASE05C1R_REPORT.md); the chunk-edge and production gates remain open.

**C.1 remediation direction, now implemented:** classify every disconnected actor component immediately into retained actor / transient shard / debris even when no major brittle fracture fires; rerun local dirt support after cross-material extraction; avoid rebuilding unchanged dynamic actors during unrelated world edits; replace triangle-majority seam coloring with a shared-surface continuous material-boundary signal rendered with a hard/very narrow threshold; and exercise the buried fixture through the normal camera, mining, ownership, detachment and reload chain. Reproduce the Rapier rotation discrepancy and update the assertion from runtime evidence without changing physics tuning.

### Phase 0.5C.1R — Owner playtest remediation / C.1 completion

**Disposition (2026-09-24): PASS for this bounded remediation; stop for owner review.** Owner-observed actor connectivity, unsupported dirt after transfer, unrelated actor-body recreation, seam pattern and buried-preview integration findings have been addressed in the isolated lab. The buried fixture now uses the persisted mixed-world path; disconnected actor state is rejected and repaired on edit; support is recomputed after cleanup and transfer; unchanged actor products retain their Rapier bodies; and the visual comparison uses continuous material weight plus a threshold over the shared mesh. Repeated Rapier 0.20 runs established a stable 0.153238-rad turn at 300 steps with >6 m translation, followed by sleep and stable pose at 600; assertions now test those observed gameplay outcomes instead of the contradicted 0.25-rad cutoff. Browser receipt, unit/state/physics tests, independent review and full verification are recorded in [the C.1R report](VOXEL_PHASE05C1R_REPORT.md) and [source evidence](evidence/voxel-phase05c1r/source/). The 13³ scope, approximate proxies, provisional HYBRID composition recommendation, absent logical chunk-edge test and absent production/mobile claims remain. No Phase 0.5D work is admitted.

### Phase 0.5D — Terrain excavation

**Original disposition (2026-09-24): HOLD; completion continuation (2026-09-25): PASS for bounded lab, stop for owner review.** The September 24 account below and the first HOLD in [the Phase 0.5D report](VOXEL_PHASE05D_REPORT.md) are historical evidence, not current implementation status. The continuation integrates the C.1R MatterActor/support/ownership/mining paths with bounded global terrain windows, full mixed-component parcel transfer, post-transfer dirt cleanup, shared Rapier products, actor reuse, and sparse terrain + ledger + actor persistence. The browser receipt now proves a real four-chunk corner edit, a player-created trench across two seams, material continuity, collision ray agreement, the supported-to-unsupported seam boulder sequence, actor fall/contact/settle/moved mining and reload. Focused failure tests include an injected partial install with real Rapier terrain and actor products, rollback to the durable old revision, and literal reload. Exact quantities, work/timing measurements, failure/correction notes and limitations are recorded in the completion appendix of `VOXEL_PHASE05D_REPORT.md` and `docs/evidence/voxel-phase05d/source/`. Phase 0.5E is recommended only after owner review and has not started.

**Question:** Does the architecture work on terrain-like chunks rather than a curated boulder fixture?

Use a bounded terrain patch with surface, wall/slope, shallow cave/overhang and embedded material. Demonstrate repeated excavation, chunk-boundary edits, remeshing, collision publication, and retained static matter.

**PASS gate:** natural holes/tunnels/cuts work across representative chunk boundaries without seams, stale collision, or ownership errors.

### Phase 0.5E — Localized collapse

**Question:** Can unsupported terrain fail locally without globally simulating the world?

Add bounded dirty-region support/connectivity invalidation around edits. Demonstrate an undermined ledge/slab becoming unsupported, extracting atomically, falling, and remaining destructible. Small unsupported matter should crumble/debris rather than proliferate permanent actors.

**PASS gate:** convincing local collapse with explicitly bounded search/work and no whole-world structural scan.

**Disposition (2026-09-25): PASS for bounded isolated lab; stop for owner review.** Changed global samples derive local support seeds; deterministic bounded windows expand only at unknown boundaries and fail closed while accepting safe direct digging. A generated dirt/rock ledge spans four source chunks, remains anchored through early edits, and becomes one complete unsupported component after ordinary excavation. The 25×6×14-cell mixed slab transfers as one 28×9×17-sample actor with 1,373 ROCK and 3,126 DIRT parcels. The actor falls 1.234 m, contacts three terrain chunks, settles, accepts dirt and hard-rock edits at its moved pose, and survives literal revision-8 reload with exact material ledgers. Collapse-trigger search uses 110,233 work units across 64,474 sampled cells, reads six chunks, and writes six; an ordinary edit uses 5,079 work units, zero expansions, reads four and writes one. The headless full collapse transaction measured 2,184 ms; this is observation, not a mobile budget. The report records the one scalar-label drift correction, material tier limits, no-reward detachment, rollback coverage, collision ray result, persistence and limitations. Independent read-only review: PASS. See `docs/evidence/voxel-phase05e/source/`; do not start Phase 0.5F.

### Phase 0.5F — PC engine + matter technology bakeoff

**Question:** Which native PC engine and surface technology best support Wildkin's combination of high-detail stylized destructible matter and Codex-heavy agent development?

Start with a bounded **Unity 6.3 LTS + HDRP** qualification prototype. Treat official Codex/Unity plugin/CLI/MCP/editor automation as part of the architecture, not an optional convenience. Exercise deterministic matter fixtures, a procedural rock stamp, runtime edit/static→dynamic proof, projected dirt/rock materials, automated tests/evidence and a performance specimen.

The Unity qualification must compare **Surface Nets vs Dual Contouring** and **uniform 0.50 m vs 0.25 m vs local brick refinement** sufficiently to select the likely production matter/surface direction. Do not port the browser implementation line-for-line; preserve its proven behavioral contracts. Activate an Unreal 5.8 challenger only if Unity fails a material gate or the owner requests it.

**PASS gate:** Unity has enough evidence to be accepted provisionally as the production engine **or** a concrete blocker is documented that justifies an Unreal challenger. The result must include agent autonomy evidence, visual/mesher/resolution comparisons, runtime mesh/collision behavior, procedural-stamp results, build/test automation, performance measurements and a recommended matter representation. See [Unity-first transition plan](UNITY_FIRST_TRANSITION_PLAN.md).

### Phase 0.5G — Native production matter kernel

**Question:** Can the selected engine host a clean production-oriented version of the proven matter architecture?

Rebuild a deliberately small Phase D/E-style scenario in the selected engine using the winning mesher and resolution representation. Establish production module boundaries for sparse matter bricks, material data, edits, meshing, support/connectivity, MatterActors, physics products, persistence and agent-facing diagnostics. The browser code remains reference evidence rather than a codebase to mechanically port.

**PASS gate:** one native-engine slice reproduces terrain editing, local support, static→dynamic transfer, recursive actor editing and reload with automated tests/evidence and no dependency on the browser runtime.

### Phase 0.5H — Procedural stamps and living-world authoring

**Question:** Can large world forms be highly varied without relying on a small repeated model library?

Build seed-driven procedural/SDF stamp families for rocks/cliffs and at least one tree/large-flora family. Large forms should resolve into destructible matter while small leaves, twigs, grass and similar detail may use cheaper representation-specific destruction. Develop custom Wildkin agent tools so Codex can generate, inspect, render and compare procedural variants automatically.

**PASS gate:** many seeds produce visibly distinct but art-direction-consistent forms; selected large forms become normal destructible matter after placement; authored/procedural workflows are agent-operable and reviewable.

### Phase 0.5I — PC scale, streaming and performance

**Question:** Can the native matter architecture support a practical mid/upper-range PC world budget?

Profile and optimize only after the production representation is selected. Investigate sparse hierarchical bricks, local refinement/LOD transitions, async sampling/meshing, structural caches, collision batching, persistence compression, streaming/residency radii and actor/debris budgets. Use real Windows builds and target-PC profiling rather than browser/mobile budgets.

**PASS gate:** measured budgets exist for ordinary edits, large collapse, meshing, collision updates, memory/residency, active actors/debris and streaming; dominant bottlenecks have a plausible production path.

### Phase 0.5J — Material depth and directional destruction

**Question:** Can the shared native matter system support materially distinct failure beyond rock and dirt?

Add wood/grain as the first anisotropic proof, followed selectively by crystal/ice, layered geological stone, ore/alien matter and other materials justified by gameplay. Couple simulation behavior with the new stylized surface-material system rather than treating visuals and destruction as separate material taxonomies.

**PASS gate:** wood directional cutting/splitting is clearly distinct from rock and dirt while preserving the same ownership, targeting, actor, persistence and agent-test infrastructure.

### Phase 1.0 — Production architecture gate

**Question:** Is the native PC matter/world stack ready to become Wildkin's actual production foundation?

Review the engine bakeoff and native proofs; freeze engine version, module/data ownership, streaming model, save schema, matter/material APIs, procedural-stamp interfaces, agent/MCP toolset, test strategy and migration boundaries. Only after this review should the broader game be rebuilt around the new native world authority.

**PASS gate:** explicit production architecture, measured budgets, migration plan, regression/evidence strategy and owner approval.

## Optional later material work

After the native production representation is selected, crystal, ice, sand/gravel, metal/alien matter and layered/geological stone can be introduced as targeted material-profile experiments. They should not delay the engine/mesher decision, native kernel, procedural-stamp workflow or PC scale proof unless an earlier phase exposes a fundamental material abstraction problem.

## Workflow for each phase

For every phase:
1. Review the previous committed result and negative evidence.
2. Write a detailed bounded implementation spec from the observed outcome.
3. Implement one uncertainty-reducing experiment.
4. Add focused deterministic tests and failure injection.
5. Produce human-visible browser evidence.
6. Run the phase-appropriate automated test/build/evidence commands. For the historical browser lab this remains `npm test` / `npm run verify`; native-engine phases must record equivalent Unity/Unreal test and build commands.
7. Record VERIFIED / PROVISIONAL / FAILED / FUTURE findings.
8. Commit/push only when authorized.
9. Stop for owner review.
10. Use the result to write the next phase's detailed spec rather than pre-committing to implementation details too far ahead.

This roadmap fixes the sequence and decision gates, not every future implementation detail.
