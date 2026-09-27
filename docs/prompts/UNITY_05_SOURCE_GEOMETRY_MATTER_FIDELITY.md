# Copy-ready prompt — Unity U4C source geometry → matter fidelity

Use this in a **fresh GPT-6 Luna session at MAX reasoning** after pulling current `main`.

---

WILDKIN FRONTIER
UNITY NATIVE TRANSITION — U4C
SOURCE GEOMETRY → SIGNED-DISTANCE MATTER FIDELITY

MODEL / ROLE

Use GPT-6 Luna with the MAXIMUM available reasoning level.

You are running a bounded representation experiment.

This phase asks:

> Can a genuinely good procedural source rock be converted into
> high-resolution destructible matter while preserving enough of its
> authored-looking shape?

This is NOT:

- another U4/U4B formation randomization pass;
- another smooth-SDF-clast generator;
- U5 destruction;
- an Unreal comparison;
- adaptive terrain;
- production streaming;
- runtime generative AI.

The key conceptual shift is:

> Voxels/matter are the destructible storage and simulation
> representation. They do not have to be the procedural shape-design
> language.

============================================================
0. OWNER AUTHORIZATION / STOP BOUNDARY
============================================================

The owner authorizes U4C only.

You may:

- modify the Unity native experiment;
- add bounded source-geometry generation;
- add mesh-to-SDF sampling;
- add an experimental local scalar/matter volume;
- generalize mesher input cleanly if required;
- add tests, agent commands and evidence;
- commit and push the completed bounded checkpoint to main.

Do NOT begin:

- U4D;
- U5;
- destruction/support;
- MatterActor physics;
- Unreal;
- adaptive world streaming;
- production migration.

Stop for owner review after U4C.

============================================================
1. SYNCHRONIZE / READ FIRST
============================================================

Repository:

MechanizedIT/wildkin-frontier

Work directly on main according to AGENTS.md.

Start:

git checkout main
git pull origin main
git status

Preserve unrelated local/untracked work.

Do NOT:

- git clean;
- hard reset;
- delete unrelated Builds/authoring/evidence;
- absorb unrelated modified HDRP/project files without evidence.

Read:

- AGENTS.md
- docs/CURRENT_SLICE.md
- docs/SESSION_START.md
- docs/UNITY_FIRST_TRANSITION_PLAN.md
- docs/SOURCE_GEOMETRY_MATTER_FIDELITY_PLAN.md
- docs/NATIVE_DESTRUCTION_REPRESENTATION.md
- native/shared/reference/ROCK_FORMATION_TARGET.md
- native/shared/reference/PHASE05E_REFERENCE.json
- native/evidence/unity/u3-mesher-resolution/README.md
- native/evidence/unity/u4-material-rock-stamp/README.md
- native/evidence/unity/u4b-rock-construction/README.md
- U4B receipt

Inspect actual implementation:

- MatterWorld.cs
- MatterSample.cs
- MatterRegionSnapshot.cs
- MatterSources.cs
- MatterMeshers.cs
- MatterMeshPublisher.cs
- RockFormationStamp.cs
- RockFormationConstruction.cs
- current material/projection code
- U4/U4B tests and agent commands

Inspect U4B images directly before coding.

Known current checkpoint before this plan:

4d3946f05f8a88f7bb09fc65af3b5995376b1207

Current origin/main after planning commits is authoritative.

============================================================
2. PRESERVE VERIFIED FOUNDATION
============================================================

Do not casually rewrite:

UNITY
- Unity 6000.3.25f1
- HDRP 17.3.0

U2
- integer-addressed matter authority
- one density + one resolved material
- deterministic behavior
- half-open brick/sample ownership
- sparse world edits

U3
- Surface Nets is the current default
- Dual Contouring remains available as prior evidence, not the default
- 0.50 m is the coarse-world baseline
- local refinement remains an unresolved direction

U4/U4B
- stable rest/source-space material projection
- shared rock/dirt surface approach
- agent/CLI/MCP workflows
- historical HOLD evidence

Do not rewrite historical evidence to make U4/U4B look successful.

============================================================
3. PRIMARY EXPERIMENT DESIGN
============================================================

The phase has two gates.

GATE A — SOURCE GEOMETRY QUALITY

Create three good procedural individual-rock source meshes.

Do not voxelize them yet.

The source meshes must themselves look plausibly like stylized game
assets.

GATE B — MATTER FIDELITY

Only after Gate A passes:

voxelize/sample those exact source meshes into true signed-distance
matter at several resolutions and remesh through Surface Nets.

The core comparison is:

SOURCE
  |
  +-- 0.50 m true SDF → Surface Nets
  +-- 0.25 m true SDF → Surface Nets
  +-- 0.125 m true SDF → Surface Nets
  +-- 0.0625 m true SDF → Surface Nets

Also include one bounded historical/control scalar encoding comparison.

Do not conflate source-shape quality with voxel-resolution quality.

============================================================
4. GATE A — PROCEDURAL SOURCE ROCK MODELER
============================================================

Create a new procedural source-rock method.

Do NOT use the current U4/U4B rounded implicit construction as the source
for the main fidelity test.

Recommended method:

PLANE-SET / HALF-SPACE CONVEX ROCK

Concept:

1. establish overall oriented bounds;
2. define 6 broad extent planes;
3. vary plane normals/distances deterministically;
4. add several diagonal / corner-cut planes;
5. optionally add:
   - flattened base;
   - one shoulder cut;
   - one top cut;
   - limited chamfer-like extra planes;
6. compute the closed convex polyhedron;
7. triangulate polygonal faces deterministically.

A good implementation route:

- represent plane as normalized normal + signed distance;
- enumerate triple-plane intersections;
- retain finite intersections satisfying ALL half-spaces;
- deduplicate vertices with explicit epsilon;
- for each source plane, collect coplanar boundary vertices;
- compute a stable 2D basis on that plane;
- sort the face loop around centroid;
- triangulate consistently;
- validate winding/outward normals.

Do not use a general-purpose computational geometry dependency unless
absolutely necessary and explicitly justified.

============================================================
5. SOURCE ROCK SHAPE LANGUAGE
============================================================

Produce exactly THREE primary source archetypes for the experiment.

Suggested:

A. CAPSTONE / SLAB
- broad top/bottom
- low/wide
- asymmetric corner cuts
- one slightly sloped face

B. CHUNKY BOULDER
- more balanced dimensions
- 7–14 readable broad faces
- unequal corners
- clear top/side/front distinction

C. BUTTRESS / WEDGE STONE
- taller or directional
- one dominant diagonal/sloped face
- stable base
- useful side profile

Use deterministic fixed seeds/recipes.

Do not build a 20-seed family in this phase.

The point is to create THREE shapes that are good enough to serve as
known-good source geometry.

============================================================
6. SOURCE-GEOMETRY VISUAL GATE
============================================================

Render the source meshes DIRECTLY.

Use:

- neutral stylized rock material;
- same lighting;
- same camera convention;
- same physical scale;
- smooth-but-face-readable shading.

Capture for each:

- beauty angle;
- second angle;
- wireframe;
- optional face-normal debug.

The source mesh must show:

- broad faces;
- readable corners;
- asymmetry;
- intentional silhouette;
- no obvious cube;
- no sphere/metaball read;
- no accidental needle/sliver polygons;
- valid watertight manifold topology.

If the source meshes themselves do not look substantially closer to
ROCK_FORMATION_TARGET.md than U4B:

STOP AND REMEDIATE THE SOURCE MODELER.

Do not continue to voxelization merely because the mesh is technically
valid.

One focused source-modeler remediation pass is allowed.

If the source still fails after that bounded pass:

U4C = SOURCE_MODELER_HOLD

Do not voxelize poor source geometry.

============================================================
7. SOURCE MESH TO SIGNED DISTANCE
============================================================

Once Gate A passes, implement a bounded mesh-to-SDF sampler.

For any query point P:

DISTANCE
- compute nearest Euclidean distance to source triangles.

SIGN
- determine whether P is inside or outside the closed source mesh.

Use project convention:

density > 0  => solid Rock

density <= 0 => Air

Therefore:

signedDensity = +distance for inside
signedDensity = -distance for outside

At the exact surface, zero is acceptable.

============================================================
8. POINT-TO-TRIANGLE DISTANCE
============================================================

Implement a deterministic robust point-to-triangle closest-distance
routine.

Requirements:

- face region;
- edge regions;
- vertex regions;
- degenerate-triangle guard;
- finite result;
- unit tests against known triangles/points.

Source meshes should remain low enough triangle count that a brute-force
triangle scan may be acceptable for U4C.

Do not add a BVH unless measurements show 0.0625 m sampling is
impractically slow.

If a BVH is added:

- keep it small and deterministic;
- document it as experiment support, not final production spatial index.

============================================================
9. INSIDE / OUTSIDE
============================================================

Use a robust bounded method appropriate for closed low-poly source meshes.

Acceptable starting method:

deterministic ray parity.

Requirements:

- deterministic ray direction;
- triangle intersection epsilon;
- avoid double-counting shared edges/vertices;
- secondary-axis or perturbed-ray fallback for ambiguous cases;
- tests:
  - known inside point;
  - known outside point;
  - points near face;
  - near edge;
  - near vertex.

Do not use Unity physics collider queries as the authoritative SDF sign
oracle unless only as an independent debug comparison.

The engine-light source geometry/SDF path should be testable without
physics state.

============================================================
10. CRITICAL SCALAR ENCODING EXPERIMENT
============================================================

Do NOT reduce the result to binary occupied samples.

Store true signed distances around the surface.

This phase must compare:

A. TRUE SIGNED-DISTANCE FIELD

versus

B. HISTORICAL OCCUPANCY-LIKE / CLIPPED CONTROL

at at least one matched resolution.

The existing U4 path used an air-backed world and effectively preserved
much less exterior-distance information.

U4C must answer:

> How much of the visual loss came from resolution, and how much came from
> scalar-field quality?

Recommended matched control:

hero source rock at 0.25 m

TRUE SDF
vs
OCCUPANCY/CLIPPED CONTROL

Optionally repeat at 0.125 m if cheap.

============================================================
11. EXPERIMENTAL LOCAL MATTER VOLUME
============================================================

Do NOT write every exact negative SDF sample into the global U2
MatterWorld sparse edit dictionary.

That is the wrong storage shape for this experiment.

Create a bounded engine-light local sample container, for example:

MatterLocalVolume

or similarly clear name.

Minimum data:

- local integer dimensions;
- local sample origin / physical origin;
- sample spacing;
- contiguous float density[];
- contiguous byte material[];
- Rock for positive samples;
- Air for non-positive samples.

No GameObject per sample.

No Dictionary per sample.

No world-brick ownership semantics.

This is experimental local matter, not yet the final MatterDomain API.

============================================================
12. MESH INPUT GENERALIZATION
============================================================

Avoid copying Surface Nets.

Prefer introducing a small read-only sample-grid abstraction that both:

- existing world meshing regions/snapshots;
- U4C local volume

can provide.

Example conceptual contract:

IMatterScalarGrid / IReadOnlyMatterGrid

properties:
- dimensions
- spacing
- origin

method:
- GetSample(x,y,z)

Exact design is up to implementation.

Requirements:

- preserve existing U3 tests;
- Surface Nets core should remain one implementation;
- no virtual/object call per hot sample if that obviously harms the
  benchmark—an adapter/generic/static abstraction is acceptable;
- keep the change bounded.

If clean generalization becomes disproportionately invasive, create one
narrow adapter at the meshing boundary and document it.

Do not fork the mesher.

============================================================
13. LOCAL VOLUME BOUNDS
============================================================

For each source rock:

- compute source mesh AABB;
- add at least 2–3 sample widths of exterior padding on every side;
- align local sampling bounds deterministically;
- sample enough exterior negative SDF so Surface Nets sees a valid
  sign-crossing boundary.

Do not crop the rock at volume edges.

Record:

- physical bounds;
- sample dimensions;
- total sample count.

============================================================
14. RESOLUTION MATRIX
============================================================

For EACH of the three accepted source rocks:

sample and render:

- 0.50 m
- 0.25 m
- 0.125 m
- 0.0625 m

Use the EXACT SAME source mesh.

Do not regenerate the source recipe per resolution.

Use:

- same world/object scale;
- same camera;
- same lighting;
- same material.

Produce one horizontal/vertical comparison strip per rock:

SOURCE | .50 | .25 | .125 | .0625

Also produce:

- wireframe comparison for at least hero A;
- close-up of one important edge/corner;
- source silhouette overlay if useful.

============================================================
15. DO NOT OVER-OPTIMIZE THE 0.0625 CASE
============================================================

0.0625 m is diagnostic.

It is NOT a proposed terrain resolution.

If it takes noticeably longer but completes safely within a bounded
volume, that is acceptable.

Record cost honestly.

If brute-force mesh SDF sampling makes 0.0625 prohibitively slow:

first:
- measure where time goes;

then:
- add the smallest useful acceleration;

or:
- run it on a slightly smaller source rock while preserving the same
  physical detail scale.

Do not silently omit 0.0625.

============================================================
16. QUANTITATIVE FIDELITY
============================================================

Visual evidence is primary.

Also compute bounded geometric fidelity metrics.

------------------------------------------------------------
A. RECONSTRUCTED VERTICES → SOURCE
------------------------------------------------------------

For every reconstructed Surface Nets vertex:

evaluate exact unsigned/signed distance to the source mesh.

Record absolute distance:

- median;
- p95;
- maximum;
- normalized p95 relative to sample spacing.

This is practical because source meshes are low/moderate triangle count.

------------------------------------------------------------
B. SOURCE SURFACE → SAMPLED FIELD
------------------------------------------------------------

Take:

- all source vertices;
- plus deterministic barycentric samples over source faces.

At each point:

trilinearly sample the local SDF.

Because the source point should lie at distance ~0, record absolute
sampled field value:

- median;
- p95;
- maximum.

This measures whether the sampled field itself preserves the source
surface before Surface Nets extraction.

Use a fixed deterministic surface-sample count per rock, e.g. 1024–4096,
appropriate to runtime cost.

============================================================
17. NORMAL / SHADING CONTROL
============================================================

Do not let shading hide geometry fidelity.

Primary comparison:

- neutral simple rock material;
- restrained normal detail or none;
- face-readable lighting.

Use the same normal-generation method across all matter resolutions.

Also show source mesh with a comparable shading treatment.

Do not give the source a polished production shader while the matter
versions use debug gray.

If needed, provide TWO boards:

GEOMETRY BOARD
- neutral material

PRESENTATION BOARD
- existing stylized rock material

Judge geometry from the neutral board first.

============================================================
18. SOURCE MESH NORMALS
============================================================

For the procedural source mesh, preserve broad face readability.

Use:

- face normals;
- angle/area weighted normals;
- or controlled smoothing across small angles

based on evidence.

Do not over-smooth the source into the same soft-clast look U4B had.

Do not make every triangulation edge visibly faceted either.

The polygonal face structure should remain perceptible.

============================================================
19. MATERIAL AUTHORITY
============================================================

U4C rock source is Rock.

At matter sampling:

positive distance:
- material Rock

zero/negative:
- Air

Do not introduce dirt into the core fidelity matrix.

The purpose is to isolate geometry representation.

One optional final presentation capture may place the rock near dirt
terrain, but dirt is not part of the fidelity acceptance gate.

============================================================
20. LOCAL-DOMAIN HYPOTHESIS — DO NOT FULLY IMPLEMENT
============================================================

Document, but do not productionize, this possible result:

terrain:
- 0.50 m world domain

detailed rock:
- e.g. 0.125 m local domain

tree:
- e.g. 0.125 m local domain

MatterActor:
- retains local domain spacing

U4C's MatterLocalVolume can inform this later.

Do not add:

- cross-domain support;
- physics ownership;
- domain streaming;
- overlap conflict resolution;
- save schema;
- world/local destruction integration.

Those belong to U4D/U5 after owner review.

============================================================
21. MEMORY / COST METRICS
============================================================

For every source × resolution record:

SOURCE
- source vertices
- source triangles
- source generation time

LOCAL VOLUME
- dimensions
- total samples
- occupied samples
- density bytes
- material bytes
- total raw field bytes

SDF
- sampling time
- inside/outside time if measured separately
- nearest-distance time if measured separately

SURFACE NETS
- generation time
- reconstructed vertices
- reconstructed triangles

UNITY
- mesh publication time if measured
- no mandatory GPU benchmark

Do not report one-off Editor numbers as production budgets.

============================================================
22. PRACTICAL RESOLUTION DECISION
============================================================

At review, choose the LOWEST resolution that visually preserves the
accepted source strongly enough for Wildkin.

Possible recommendation:

LOCAL_DOMAIN_0_25
LOCAL_DOMAIN_0_125
LOCAL_DOMAIN_0_0625

Do not automatically choose the finest.

Consider:

- visual difference;
- field memory;
- sampling cost;
- mesh complexity;
- likely runtime editing/remeshing cost.

A useful answer may be:

0.125 m default detailed-rock domain
0.0625 m reserved for smaller/hero assets

but the evidence must decide.

============================================================
23. SURFACE NETS FAILURE CONDITION
============================================================

Keep Surface Nets unless evidence specifically indicts it.

Reopen the mesher only if:

1. direct source mesh passes;
2. true signed-distance field itself tracks the source well;
3. resolution is sufficiently fine;
4. Surface Nets reconstruction still visibly destroys important planar
   edges/corners.

If all four are true:

U4C may conclude:

REOPEN_MESHER

Do NOT implement a new Dual Contouring phase in the same task.

Optionally render the already-existing DC implementation on one
source-derived field ONLY as a diagnostic if adapting it is trivial.

Do not let that expand scope.

============================================================
24. SOURCE QUALITY VS REPRESENTATION DECISION TREE
============================================================

At final review classify clearly.

CASE A

Source bad.

Result:
SOURCE_MODELER_HOLD

No matter conclusion.

CASE B

Source good.
True SDF 0.125 good.

Result:
LOCAL_DOMAIN_0_125

CASE C

Source good.
Only 0.0625 acceptable.

Result:
LOCAL_DOMAIN_0_0625

with explicit cost/risk.

CASE D

Source good.
True SDF good.
Surface Nets still loses important shape.

Result:
REOPEN_MESHER

CASE E

No tested representation is plausible.

Result:
REPRESENTATION_HOLD

============================================================
25. AGENT TOOLING
============================================================

Extend existing Wildkin commands cleanly.

Desired operations:

generate_source_rock
- source archetype
- seed/recipe

inspect_source_rock

capture_source_rock

voxelize_source_rock
- source id
- spacing
- scalar encoding

inspect_matter_fidelity

capture_fidelity_strip

run_fidelity_matrix

Return machine-readable output.

Codex should reproduce the experiment without manual Inspector edits.

Use direct Unity MCP if available.

Otherwise use the verified CLI/Pipeline bridge.

============================================================
26. TESTS — SOURCE GEOMETRY
============================================================

Add focused tests.

PLANES / POLYHEDRON

- plane normals finite/nonzero;
- triple-plane solve finite;
- retained points satisfy all half-spaces;
- duplicate vertices merged deterministically;
- every face has >= 3 unique vertices;
- face loops deterministic;
- triangle winding outward;
- no degenerate triangles beyond documented epsilon;
- source mesh closed/manifold where expected.

DETERMINISM

- same source recipe → same mesh hash;
- fixed three rocks reproduce exactly.

BOUNDS

- source geometry stays inside configured physical bounds.

============================================================
27. TESTS — MESH SDF
============================================================

DISTANCE

- point over triangle face;
- edge region;
- vertex region;
- degenerate triangle guard.

SIGN

Use a known closed test mesh:

- inside positive;
- outside negative;
- face/edge/vertex ambiguity finite/deterministic.

SOURCE ROCK

- center/interior sample positive;
- padded exterior negative;
- no NaN/Inf;
- expected material IDs.

============================================================
28. TESTS — LOCAL VOLUME
============================================================

- deterministic dimensions/indexing;
- x/y/z boundaries;
- spacing preserved;
- physical origin round trip;
- contiguous array sizes exact;
- Rock iff positive;
- Air iff non-positive;
- trilinear density sample finite;
- no GameObject/editor dependency in core storage.

============================================================
29. TESTS — MESHER REGRESSION
============================================================

All existing U2/U3/U4/U4B tests should remain green unless a test is
explicitly superseded and documented.

New local-volume mesher path:

- produces finite vertices;
- valid indices;
- deterministic topology/hash;
- no duplicated Surface Nets implementation;
- padding prevents edge clipping;
- same source field at repeated run matches.

============================================================
30. OCCUPANCY VS TRUE-SDF CONTROL
============================================================

Add one explicit regression/experiment proving the encodings are
different.

For the hero rock at matched spacing:

CURRENT-LIKE CONTROL:
- binary/clipped/air-default scalar behavior representative of prior U4
  resolved storage

TRUE SDF:
- exact signed distance on both sides.

Capture side by side.

Record:

- visual result;
- Surface Nets vertex count;
- fidelity metrics.

Do not rig the control to look intentionally bad.

It should fairly represent the prior scalar-information loss.

============================================================
31. EVIDENCE FOLDER
============================================================

Write:

native/evidence/unity/u4c-source-matter-fidelity/

Required:

README.md
receipt.json

SOURCE
- source-rock-A-beauty.png
- source-rock-A-angle2.png
- source-rock-A-wireframe.png
- equivalent B/C

FIDELITY
- rock-A-fidelity-strip.png
- rock-B-fidelity-strip.png
- rock-C-fidelity-strip.png

CONTROL
- occupancy-vs-true-sdf.png

DETAIL
- edge-corner-closeup.png
- optional neutral/presentation boards

METRICS
- source recipes
- per-resolution JSON
- fidelity error JSON

VALIDATION
- focused test XML
- full EditMode XML
- PlayMode if runtime view uses it

BUILD
- one final Windows Development Build if the phase reaches a meaningful
  complete checkpoint.

============================================================
32. VISUAL REVIEW REQUIREMENTS
============================================================

Independent review must inspect images, not just receipts.

FIRST REVIEW:

Direct source meshes.

Question:

"Do these look substantially more like deliberately modeled stylized
rocks than U4B?"

If NO:
repair source method or HOLD.

SECOND REVIEW:

Fidelity strips.

For each spacing ask:

- silhouette retention?
- broad plane retention?
- corner/bevel retention?
- major face orientation?
- obvious voxel swelling/shrinkage?
- visible stair/rounding artifacts?

THIRD REVIEW:

Occupancy vs true SDF.

Question:

"Did scalar quality materially improve reconstruction independent of
resolution?"

============================================================
33. PASS CRITERIA
============================================================

U4C PASS requires:

1. direct source mesh visual gate passes;
2. mesh→SDF sampler is deterministic and tested;
3. true signed-distance local volume works;
4. same source rendered at all four spacings;
5. at least one practical spacing is a credible visual approximation of
   the source;
6. Surface Nets result is honestly assessed;
7. fidelity/cost metrics are recorded;
8. no production ownership semantics are accidentally claimed;
9. agent commands reproduce the experiment;
10. full regression remains green;
11. independent review passes the stated conclusion.

PASS does NOT require:

- 20 procedural rocks;
- final materials;
- terrain integration;
- support;
- physics;
- production optimization.

============================================================
34. HOLD CRITERIA
============================================================

SOURCE_MODELER_HOLD if:
- source geometry itself misses target after one bounded repair.

REOPEN_MESHER if:
- source and SDF pass but Surface Nets remains the visible limiting
  factor at practical fine resolution.

LOCAL_DOMAIN_0_0625_WITH_RISK is allowed if:
- 0.0625 looks right but cost is substantial and needs U4D analysis.

REPRESENTATION_HOLD if:
- none of the bounded approaches gives a plausible runtime path.

Do not call Unity itself a failure unless the evidence identifies an
actual engine limitation.

============================================================
35. DOCUMENTATION
============================================================

Update as appropriate:

- docs/CURRENT_SLICE.md
- docs/SESSION_START.md
- docs/CODE_MAP.md
- docs/BUILD_LOG.md
- docs/UNITY_FIRST_TRANSITION_PLAN.md
- docs/SOURCE_GEOMETRY_MATTER_FIDELITY_PLAN.md

Do not rewrite U4/U4B HOLD history.

Add clearly separated U4C results.

============================================================
36. GIT / REVIEW
============================================================

Work directly on main.

Preserve unrelated changes.

At meaningful completion:

- run focused tests;
- run full EditMode;
- run relevant PlayMode;
- run final Windows build if applicable;
- inspect Git status;
- independent read-only review;
- cohesive commit(s);
- push according to existing repo authorization.

Do not leave generated Unity cache/build noise staged.

============================================================
37. COMPLETION RESPONSE
============================================================

Return:

U4C: PASS / HOLD

final commit

SOURCE GEOMETRY
- method
- source rock archetypes
- visual gate result
- vertices/triangles

SCALAR REPRESENTATION
- occupancy/control finding
- true-SDF finding

RESOLUTION
- 0.50 result
- 0.25 result
- 0.125 result
- 0.0625 result
- lowest acceptable spacing

FIDELITY
- reconstructed→source median/p95/max
- source→sampled-field median/p95/max

COST
- sample counts
- raw field memory
- SDF times
- mesh times
- mesh counts

MESHER
- Surface Nets sufficient?
- if not, exact reason to reopen mesher

ARCHITECTURE RECOMMENDATION
choose one:

LOCAL_DOMAIN_0_25
LOCAL_DOMAIN_0_125
LOCAL_DOMAIN_0_0625
REOPEN_MESHER
SOURCE_MODELER_HOLD
REPRESENTATION_HOLD

AGENT / VALIDATION
- MCP or CLI path
- focused tests
- full tests
- PlayMode
- Windows build
- owner interventions

EVIDENCE PATH

KNOWN LIMITATIONS

If a local-domain recommendation is reached:

recommend next:

U4D — LOCAL MATTER DOMAIN COEXISTENCE PROOF

DO NOT START IT.

STOP FOR OWNER REVIEW.
