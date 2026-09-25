# Copy-ready prompt — Unity U3 mesher + resolution bakeoff

Use only after the Unity native matter-kernel checkpoint is reviewed and PASS.

---

WILDKIN FRONTIER
UNITY NATIVE TRANSITION — U3
SURFACE NETS vs DUAL CONTOURING + RESOLUTION BAKEOFF

ROLE

Determine how Wildkin's native Unity matter should become visible
geometry.

Compare real implementations, not paper arguments.

Use the same C# matter authority and deterministic scalar fields for every
candidate.

Do NOT add destruction/support/physics actors yet.
Do NOT build infinite streaming.
Do NOT start Unreal.

============================================================
0. BASELINE
============================================================

Read:

- docs/UNITY_FIRST_TRANSITION_PLAN.md
- docs/PC_ENGINE_BAKEOFF_PLAN.md
- native/shared/reference/PHASE05E_REFERENCE.json
- Unity U0/U1 evidence and source

Verify existing tests/build green.

============================================================
1. REQUIRED DATASETS
============================================================

Generate deterministic scalar fixtures:

A. smooth organic sphere/blob
B. layered/blocky stylized rock formation
C. cliff face with shallow cave/overhang
D. dirt/rock material boundary
E. mined spherical/irregular cavity
F. detached irregular chunk

Freeze seeds/parameters in source/test data.

Both meshers must consume exactly the same fields.

============================================================
2. SURFACE NETS BASELINE
============================================================

Implement a clean C# Surface Nets baseline derived from the algorithmic
contract, not a direct JS transliteration.

Requirements:

- deterministic vertices/indices
- normals suitable for stylized shading
- material weight/ID attributes
- chunk/brick boundary handling
- no managed allocation per cell
- compatible with later Jobs/Burst

Use writable Unity MeshData for publication where practical.

Record pure mesher time separately from Mesh upload.

============================================================
3. DUAL CONTOURING PROTOTYPE
============================================================

Implement a bounded Dual Contouring prototype sufficient for comparison.

Use:

- edge sign crossings
- intersection positions
- gradient/normal estimates
- QEF or equivalent least-squares placement
- clamping/fallback sufficient to prevent runaway vertices

The purpose is to test preservation of:

- broad planar rock faces
- sharper corners
- shelves/creases
- cliff cuts

Do not attempt a complete production adaptive-octree implementation.

Document numerical fallback behavior.

============================================================
4. CHUNK/BRICK SEAMS
============================================================

Test each mesher across at least 2×2 bricks.

Require:

- no visible crack
- no duplicate overlapping boundary surface
- deterministic shared sample usage
- stable normals/material weights

Capture seam close-ups with debug boundary overlay OFF and ON.

A mesher that only works as one monolithic volume is not a viable winner.

============================================================
5. RESOLUTION MATRIX
============================================================

Render the same rock/cliff target at:

1. 0.50 m uniform
2. 0.25 m uniform
3. local refinement:
   - 0.50 m base
   - 0.25 m target brick/region

Do not implement a giant octree.

For local refinement, create the smallest explicit transition experiment
needed to understand:

- data ownership
- mesher compatibility
- transition seam difficulty
- whether the visual improvement is worth complexity

If crack-free cross-resolution transition is not solved in this phase,
it may remain a documented HOLD subproblem while still producing useful
uniform-resolution evidence.

Optional:
0.125 m tiny crop only if 0.25 m clearly cannot represent the desired
rock details.

============================================================
6. STYLIZED ROCK TARGET
============================================================

The key perceptual target is not a sphere.

Create a deterministic procedural rock fixture with:

- stacked/layered masses
- broad planar-ish faces
- rounded/beveled corners
- controlled asymmetry
- strong silhouette

It should aim toward an authored stylized game-rock look.

Do not use a hand-authored mesh as the mesher input.

The source must remain scalar/SDF matter.

============================================================
7. MATERIAL ATTRIBUTE SUPPORT
============================================================

Both meshers must output enough per-vertex/per-surface data for later:

- rock vs dirt material weight
- normals
- optional source/rest position if useful

Do not spend this phase building final textures.

Use simple distinct diagnostic shading to inspect the material boundary.

The material boundary should not require separate overlapping meshes.

============================================================
8. PERFORMANCE / MEMORY
============================================================

For every dataset × mesher × resolution record:

- scalar sample count
- scalar memory
- vertex count
- triangle count
- pure mesher CPU time
- allocations/GC if any
- MeshData fill time
- Unity Mesh apply/upload time
- total rebuild time

Measure:

- Editor
- Windows development player if automation is practical

Do not compare only one warmed run.

Use several iterations and report median/p95 or a similarly honest small
summary.

No production budget is locked yet.

============================================================
9. JOBS/BURST EXPERIMENT
============================================================

Move at least one representative mesher hot loop to Jobs/Burst if the
design supports it cleanly.

Do not rewrite both entire meshers only to say Burst was used.

The goal is to learn:

- how well candidate data lays out for jobs
- speedup
- scheduling overhead
- complexity introduced

Record main-thread vs job/Burst measurements where meaningful.

============================================================
10. VISUAL EVIDENCE
============================================================

Create a matched comparison board.

For the hero rock use identical:

- world scale
- camera
- lighting
- background
- material colors

Show at minimum:

Surface Nets:
- 0.50
- 0.25

Dual Contouring:
- 0.50
- 0.25

and local-refinement candidate if valid.

Also capture:

- cliff/cave comparison
- chunk seam close-up
- material boundary close-up
- wireframe/triangle view for the hero rock

No option gets a more flattering camera.

============================================================
11. AGENT TOOLING
============================================================

Add/extend project tools so Codex can:

- regenerate fixture by seed
- choose mesher
- choose resolution
- remesh
- report mesh stats
- capture comparison

The agent should be able to reproduce the comparison without manual
Inspector clicking.

============================================================
12. TESTS
============================================================

Required:

- deterministic mesh hash/stat result
- finite vertices/normals
- valid indices
- no degenerate/out-of-range indices beyond documented tolerance
- chunk seam topology tests
- material attribute deterministic
- edit/remesh changes only expected fixture
- no stale mesh after revision change

Dual Contouring-specific:
- QEF fallback finite
- planar fixture retains expected feature behavior
- no runaway vertex outside allowed cell/clamp policy

============================================================
13. DECISION CRITERIA
============================================================

Do not choose a winner from triangle count alone.

Score:

VISUAL
- silhouette
- planar feature retention
- corner/crease quality
- cave quality
- edit stability

ENGINEERING
- complexity
- deterministic behavior
- seam reliability
- job/Burst fit
- material attributes
- maintenance cost for Codex

PERFORMANCE
- 0.50
- 0.25
- rebuild/upload cost

RESOLUTION
- visual benefit of 0.25 over 0.50
- cost multiplier
- feasibility/value of local refinement

Allowed decisions:

- SURFACE_NETS
- DUAL_CONTOURING
- HYBRID / KEEP BOTH FOR SPECIFIC CASES
- HOLD — insufficient evidence

============================================================
14. EVIDENCE
============================================================

Write:

native/evidence/unity/u2-mesher-resolution/

Include:

- README.md
- receipt.json
- matched comparison images
- benchmark data
- exact seeds
- selected recommendation

============================================================
15. VALIDATION
============================================================

- EditMode tests green
- PlayMode/scene smoke green
- agent can reproduce comparison
- Windows build succeeds
- no generated-cache pollution
- independent read-only review

============================================================
16. COMPLETION
============================================================

Commit/push if authorized.

Final response:

PASS/HOLD
commit
Surface Nets result
Dual Contouring result
selected mesher direction
0.50 vs 0.25 result
local-refinement result
performance
visual evidence
agent workflow notes
known limitations

If PASS recommend:

UNITY U4 — STYLIZED MATERIAL + PROCEDURAL ROCK STAMP

DO NOT START U4.

STOP FOR OWNER REVIEW.
