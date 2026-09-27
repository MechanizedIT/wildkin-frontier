# Unity overnight qualification — September 27, 2026

Owner-authorized unattended progression is bounded to U2 through U5. Each later phase is admitted only after the orchestrator reviews committed code, tests, runtime evidence, visuals, benchmarks and repository state. U5 is the final boundary; no Unreal or production migration starts in this run.

## U2 — native matter reference kernel

- Start commit: `41aa97ccf44221b515d368a06f2effeada478f4c`
- Implementation/revalidation agent: fresh GPT-6 Luna, maximum reasoning
- Existing implementation commit: `721094c4681eeaf35344d52f479b5873746fca1a`
- Revalidation commits: `969b655b39787818175bb757f6718bffee9b0c59`, `adf5b00c156f4ba1ffe28d734b7af33f873615a2`
- Representation: 16³ unique half-open sample bricks; global integer sample identity; 17³ meshing windows must read neighboring owners rather than duplicate authority; one resolved density/material; global sparse edits; explicit revision; bounded snapshots; provisional JSON persistence.
- Validation: EditMode 43/43, PlayMode 1/1, live `inspect_matter_region` 2,601 samples / 1,297 solid / 17 rock / 1,280 dirt with matching source/resolved checksum. Existing Windows Development Build remains the gate build.
- Review finding: debug marker mesh had one self-crossing face order and one reversed face winding. Both were corrected and covered by an all-triangle regression. No matter-authority defect was found.
- Visual evidence: `native/evidence/unity/u2-matter-kernel/debug-screenshot.png`
- Final disposition: **PASS**. U3 admitted.

## U3 — mesher and resolution bakeoff

- Starting commit: `861a42b823c7c6d640dcf2be70fb5002e508c236` (reviewed U2 gate).
- Implementation commit: `96921a4a7f48ba9efd9e83dd2b01a8f4772f0dd1` by a fresh GPT-6 Luna agent at maximum reasoning.
- Status: **PASS after independent root review**. U4 admitted.
- Principal question: whether Dual Contouring provides enough authored planar/corner value over Surface Nets to justify its complexity, and whether 0.25 m or bounded local refinement is worth its cost over uniform 0.50 m.
- Runtime: `native/unity/WildkinUnity/Assets/Wildkin/Scenes/Tech/U3MesherResolution.unity` runs the same six seed-20260927 fixture fields through separate Surface Nets and bounded Dual Contouring implementations. Samples remain globally owned in half-open 16³ sample bricks; each 16³-cell region captures an 18³ window with required +1 planes and a negative edge-owner halo. The scene includes a matched six-row board, hero/cliff cases, overlay seam pair, material boundary, wireframe and local-refinement views. Agent commands select fixture/mesher/spacing, regenerate/report, capture, benchmark and build from the same matter source/runtime path.
- Algorithm: Surface Nets places the cell dual vertex at the Hermite intersection centroid. Dual Contouring separately performs edge intersections, finite-difference gradients and regularized least-squares QEF placement, clamps into the cell and records deterministic centroid fallback for numerical/rank failure. Both output positions/source positions, normals, rock/dirt weights and deterministic topology hashes through the writable MeshData publisher.
- Frozen fields: SmoothOrganic, LayeredRock, CliffCave, MaterialBoundary, MinedCavity and DetachedIrregular. Source version and exact seed/form parameters are frozen in `MatterFixtures.cs` and `native/evidence/unity/u3-mesher-resolution/receipt.json`.
- Tests: final EditMode `67/67` passed (`all-editmode.xml`), final PlayMode `1/1` (`all-playmode.xml`), including deterministic mesh/attribute checks, 2×2 seams for both meshers, edit/remesh revision behavior, QEF plane/clamp/fallback checks, and a test-only Burst active-cell parity probe. Dedicated U3 mesher coverage is `23/23` (`focused-editmode.xml`).
- Benchmarks: six datasets × two meshers × two spacings, one warm-up plus five measured fresh-world rebuilds per row over the same 16m³ physical domain; medians and nearest-rank p95 are in `benchmark-matrix-editor.json`. Across fixtures, uniform 0.50m total medians average 233–236ms; uniform 0.25m averages 1.30–1.32s, uses 8× samples/raw snapshot bytes, and yields ~3.5× vertices/~4× triangles. The aggregate p95 is reported as each row's maximum because there are five measured runs. Managed allocation bytes are unavailable; the counter failed a known 1KiB probe and `-1` is used as an unavailable sentinel, not zero.
- Jobs/Burst: installed Burst 1.8.30/Collections 2.6.8 support a test-only `IJobParallelFor` sign-classification probe; no manifest dependency or production core reference was added. On 314,432 cell candidates, the parity-matching classification median is 14.64ms scalar vs 0.94ms job schedule+complete (15.5× in this isolated loop). Snapshot generation, NativeArray allocation/copy and full mesh generation are outside this timing; this is not an end-to-end speedup claim.
- Windows: one Windows x64 Development Build succeeded (54.51s, 0 errors, 2 warning categories; provenance in `build-provenance.json`). The visible player produced a metrics report and matching screenshot; a prior hidden screenshot attempt failed and is retained only as a tool note, not evidence.
- Visual artifacts: see `comparison-board.png`, both 0.50m/0.25m hero pairs, `seam-overlay-off-on.png`, `material-boundary-closeup.png`, `wireframe-triangles.png`, `local-refinement-pair.png`, and `player-observation.png` under `native/evidence/unity/u3-mesher-resolution/`.
- Final recommendation: `SURFACE_NETS` and `LOCAL_REFINEMENT_DIRECTION`. Root inspected the original board, hero/cliff pairs, seam, material boundary, topology, bounded refinement and Windows player images plus the implementation. DC showed real but modest plane/corner/shelf placement differences without a clearer authored result or runtime advantage. Uniform 0.25m detail was not worth its whole-domain cost. The 0.25m local region is isolated, not stitched into the 0.50m base; crack-free mixed-resolution transitions remain an explicit risk.
- Tool notes: dedicated Unity MCP was not exposed; CLI/Pipeline was used without upgrading tools. Early HDRP/Lit captures washed out; an internal vertex-color light-ramp shader and explicit vertex layout corrected legibility. The first custom shader include and an initial channel order were wrong and the resulting renders were discarded. Pipeline test status briefly disconnected during Editor domain reload; final asynchronous status and current XML show green tests. See the evidence README for detailed failures/interventions and limits.

## U4 — stylized materials and procedural rock stamp

- Status: starting from the reviewed U3 Surface Nets + local-refinement-direction checkpoint.
- Principal question: whether resolved dynamic matter can read as deliberate Wildkin game art with stable object/rest-space projection, a clean rock/dirt seam, and one deterministic rock-stamp family that produces at least twenty genuinely varied authored-looking formations.
