WILDKIN FRONTIER
UNITY U4C3 — TOPOLOGY-SAFE / MANIFOLD SURFACE NETS

MODEL

Use GPT-6 Luna with the MAXIMUM available reasoning.

This is a fresh bounded engineering phase.

Do not continue automatically into U4D, U4E, U5, Unreal, adaptive
terrain stitching, streaming, or production migration.

============================================================
0. OWNER AUTHORIZATION / STARTING POINT
============================================================

The owner authorizes a bounded continuation after U4C2 commit:

a082cba942a6e7e1f8949ff9d9a300af4a60b4bd

U4C2 result:

REPRESENTATION_HOLD

The hold is very narrow.

The new sculpted source stones passed their independent visual gate.

True signed-distance matter successfully preserved the authored source
shapes.

0.25 m true-SDF reconstruction passed both visual and topology gates for
all three stones.

Fine resolutions exposed two deterministic topology failures:

C / 0.125 m
    exactly one four-use nonmanifold edge

B / 0.0625 m
    exactly one four-use nonmanifold edge

Both have:

- zero skipped degenerate triangles;
- good visual fidelity;
- true SDF;
- integer-cell-keyed reconstruction;
- failures that survive replacing position-based weld identity.

The current evidence therefore indicates a Surface Nets topology
ambiguity, not:

- a bad source model;
- insufficient resolution;
- bad signed-distance sampling;
- positional welding;
- a Unity limitation;
- a visual-fidelity reason to reopen Dual Contouring.

The purpose of U4C3 is to determine whether the selected Surface Nets
path can be made TOPOLOGY SAFE for arbitrary destructive edits.

============================================================
1. REPOSITORY START
============================================================

Work directly on main according to AGENTS.md.

First:

git checkout main
git pull origin main
git status

Preserve unrelated/untracked work.

Do not reset, clean, delete, stage, or absorb unrelated:

- authoring/
- Builds/
- historical browser evidence
- existing owner work

Read at minimum:

AGENTS.md
docs/CURRENT_SLICE.md
docs/SESSION_START.md
docs/UNITY_FIRST_TRANSITION_PLAN.md
docs/SOURCE_GEOMETRY_MATTER_FIDELITY_PLAN.md
native/evidence/unity/u4c2-sculpted-source/README.md
native/evidence/unity/u4c2-sculpted-source/receipt.json
native/evidence/unity/u4c2-sculpted-source/fidelity-review.md
native/evidence/unity/u4c2-sculpted-source/technical-review.md

Inspect actual implementation:

Assets/Wildkin/Matter/Core/MatterMeshers.cs
Assets/Wildkin/Matter/Core/MatterLocalVolume.cs
Assets/Wildkin/Matter/Core/SourceMeshSignedDistance.cs
Assets/Wildkin/Tests/EditMode/SourceMeshFidelityTests.cs

Also inspect the existing U3 Surface Nets seam tests.

Verify existing Unity tests start green.

============================================================
2. PRIMARY QUESTION
============================================================

Can the existing Surface Nets renderer be changed from:

ONE ACTIVE CELL
    ↓
ONE SURFACE VERTEX

to:

ONE ACTIVE CELL
    ↓
ONE OR MORE CONNECTED SURFACE PATCHES
    ↓
ONE VERTEX PER PATCH

so ambiguous sampled cells remain manifold while preserving the visual
character and deterministic chunk behavior already selected in U3?

This phase is specifically about TOPOLOGY.

Do not redesign the rock generator.

Do not change the true-SDF sampler unless an independently demonstrated
SDF bug is discovered.

Do not make the grid finer to hide the defect.

Do not simply special-case B or C.

============================================================
3. REQUIRED FIRST STEP — REPRODUCE THE DEFECT
============================================================

Before modifying the mesher, reproduce both known failures from the
current main commit:

B / seed 4102 / 0.0625 m
C / seed 4103 / 0.125 m

Confirm:

- source mesh is valid;
- SDF is valid;
- skipped degenerate triangles = 0;
- exactly one four-use edge exists in each reconstruction;
- the current known-failure tests detect them.

Record the relevant:

- global/sample cell coordinates around the failure;
- corner densities/sign mask;
- crossing cube edges;
- neighboring-cell sign masks;
- emitted Surface Nets faces;
- current cell vertex identities.

Create a small machine-readable diagnostic if useful.

We want the exact topology pattern understood before repair.

============================================================
4. ROOT CAUSE TO INVESTIGATE
============================================================

The existing mesher creates one vertex for every active cell and maps:

cellAddress → vertex

This assumes that the zero surface inside an active cell has one
connected patch.

That is not always true.

A cube may contain multiple distinct surface patches depending on its
corner signs and scalar values.

Collapsing multiple patches to one vertex can pinch otherwise separate
surface sheets together and create a nonmanifold edge.

U4C3 should explicitly model this ambiguity.

Do not treat positional welding as the primary problem; U4C2 already
ruled that out.

============================================================
5. TARGET SURFACE-NETS REPRESENTATION
============================================================

Preferred design:

For each active cell:

1. find all sign-changing cube edges;
2. determine which crossing edges belong to the same continuous
   isosurface patch within that cell;
3. partition the crossings into deterministic connected components;
4. create one Surface Nets vertex PER COMPONENT;
5. during primal-edge face emission, choose the vertex component in each
   incident cell that actually contains that particular crossing edge.

Conceptually:

OLD:

Cell
 ├─ crossing edge A
 ├─ crossing edge B
 ├─ crossing edge C
 └─ crossing edge D
          ↓
      ONE vertex

NEW:

Cell
 ├─ surface patch 0
 │    ├─ crossing A
 │    └─ crossing B
 │          ↓
 │       vertex 0
 │
 └─ surface patch 1
      ├─ crossing C
      └─ crossing D
            ↓
         vertex 1

Do not produce extra vertices for ordinary unambiguous cells.

============================================================
6. CROSSING-EDGE COMPONENT GRAPH
============================================================

Recommended bounded approach:

Treat the 12 cube edges as possible graph nodes.

A node exists when that cube edge crosses the isosurface.

Build connectivity from the six cube faces.

For an ordinary face:

- 0 crossings → no connection;
- 2 crossings → connect those two crossings.

For an ambiguous checkerboard face with four crossings:

use a proper BILINEAR / ASYMPTOTIC DECIDER based on the actual scalar
values on that face.

Do NOT choose connectivity by:

- shortest diagonal;
- vertex position distance;
- arbitrary parity;
- rock-specific heuristics.

Use a mathematically documented face decision consistent with the
bilinear interpolation represented by the four face samples.

When the face saddle is numerically tied/near-zero, use an explicit,
deterministic, orientation-independent tie policy.

The same physical face evaluated from adjacent cells must produce the
same connectivity decision.

Connected components of this crossing-edge graph are candidate surface
patches for that cell.

============================================================
7. INTERIOR AMBIGUITY
============================================================

Do not assume face ambiguity is the only possible topology issue.

After implementing face-based crossing components, inspect whether any
cell can contain multiple boundary loops whose connection inside the
trilinear cell is ambiguous.

If the exact repro cases require an interior/trilinear decider, implement
the smallest mathematically defensible interior decision needed.

If they do NOT require one:

- document that fact;
- retain tests that expose the unsupported class if one is identified;
- do not implement a full MC33-style topology catalog unnecessarily.

The U4C3 goal is robust Surface Nets topology, not a general academic
isosurface library.

However:

DO NOT merge disconnected boundary loops merely to preserve the old
one-vertex behavior.

Prefer a topology-safe split over a nonmanifold pinch.

============================================================
8. DETERMINISTIC MULTI-VERTEX IDENTITY
============================================================

The current local-volume reconstruction uses global integer cell
addresses to combine duplicated brick/halo vertices.

That is no longer sufficient if one cell may own multiple vertices.

Introduce a deterministic surface-vertex identity.

Recommended conceptual form:

MatterSurfaceVertexKey
{
    globalCellAddress
    crossingEdgeComponentMask
}

The component mask may be a 12-bit mask describing which local cube
crossing edges belong to that surface patch.

This is preferable to a fragile ordinal alone because it is:

- deterministic;
- inspectable;
- independently reproducible across adjacent brick captures;
- naturally tied to topology.

An ordinal/component index may additionally exist for convenience, but
global stitching should not depend on incidental traversal order.

Preserve `VertexCellAddresses` if existing diagnostics/tests need it, but
do not use cell address alone where multiple patch vertices are legal.

============================================================
9. EDGE → VERTEX LOOKUP
============================================================

Face emission currently asks:

"what is the vertex for this incident cell?"

It must now ask:

"what is the vertex for the surface patch in this incident cell that
contains THIS PRIMAL CROSSING EDGE?"

Build an efficient deterministic mapping such as:

(cell, local cube-edge index) → surface vertex index

or equivalent.

Every sign-changing cube edge in an active cell must map to exactly one
surface component vertex.

No crossing edge may map to:

- zero components;
- multiple components.

Add invariants/tests for this.

============================================================
10. VERTEX PLACEMENT
============================================================

Preserve the selected Surface Nets visual behavior.

For each connected surface patch:

compute its Surface Nets vertex from ONLY the Hermite/crossing points
belonging to that patch.

Do not average crossings belonging to another disconnected patch.

For ordinary one-component cells, output should remain equivalent to the
existing implementation within normal floating-point determinism.

Preserve:

- normal generation;
- rock/dirt weights;
- SourcePositionMeters/rest-space data;
- deterministic ordering.

This phase is not an excuse to visually redesign Surface Nets.

============================================================
11. QUAD / FACE EMISSION
============================================================

For every sign-changing primal sample edge:

the four surrounding cells should contribute the specific component
vertex incident to that crossing edge.

Then emit the corresponding dual quad using the existing orientation
semantics.

Triangulation may retain the existing deterministic diagonal selection
unless evidence shows it participates in the topology defect.

Do not patch the known failure by changing a quad diagonal unless that
change is mathematically required.

The required repair should happen at SURFACE PATCH IDENTITY, not merely
triangle routing.

============================================================
12. CROSS-BRICK / HALO CONSISTENCY
============================================================

This is mandatory.

The same ambiguous cell may be seen through overlapping read-only
windows from adjacent brick meshing regions.

Its component decomposition and component keys must be IDENTICAL
regardless of which brick requested the halo data.

Add an explicit fixture where an ambiguous/multi-patch cell lies on or
near a brick seam.

Mesh neighboring bricks independently.

Combine them using the new surface-vertex key.

Prove:

- no crack;
- no duplicate overlapping face;
- no merged distinct patch;
- no nonmanifold seam;
- same component signatures from both captures.

Preserve U3's global edge ownership rules.

============================================================
13. EXACT REGRESSION CASES
============================================================

The following must become PASS cases:

B / 4102 / 0.0625

C / 4103 / 0.125

The old test:

Qualification_DetectsTheRecordedFourUseSurfaceNetsEdge

must not simply be deleted.

Convert/replace it with a regression proving:

- these exact source/spacing combinations reconstruct;
- skipped degenerate triangles remain controlled;
- mesh is closed;
- mesh is connected as appropriate;
- mesh is manifold;
- zero four-use edges remain.

Record how many multi-patch cells each case required.

============================================================
14. EXHAUSTIVE CELL-CLASSIFICATION TESTS
============================================================

Add a bounded exhaustive test over all 256 cube corner SIGN MASKS.

For every mask:

- identify its sign-changing edges;
- run the new component classifier;
- prove every crossing edge belongs to exactly one component;
- prove no component is empty;
- prove output is deterministic;
- prove equivalent rotations/orientations do not introduce arbitrary
  topology differences beyond the scalar-value decision.

A ±1 scalar assignment is sufficient for the baseline sign-mask sweep.

Also add targeted VALUE-SENSITIVE ambiguous-face tests using unequal
positive/negative magnitudes to prove the asymptotic decider actually
responds to scalar values rather than only corner signs.

Test exact/near saddle ties.

============================================================
15. RANDOM / PROPERTY-LIKE MANIFOLD STRESS
============================================================

Add a deterministic bounded stress suite.

Construct many small scalar volumes with:

- negative-air outer boundary;
- deterministic pseudorandom interior scalar values;
- a mixture of simple and ambiguous cells.

For example 50–200 fixed seeds at a small 4³–8³ cell scale, chosen so
the test remains fast.

Generate Surface Nets.

For every non-empty closed object assert:

- finite vertices;
- valid indices;
- no degenerate index topology;
- each undirected mesh edge has exactly two triangle uses;
- manifold/closed validation succeeds;
- deterministic repeated hash.

If some scalar field exposes a legitimate unsupported topology class,
freeze it as a named regression fixture rather than hiding/excluding it.

Do not make the stress test nondeterministic.

============================================================
16. MANIFOLD VALIDATION
============================================================

Review `SculptedStoneMesh.Validate`.

Ensure the validation used for U4C3 can detect at minimum:

- open edges;
- >2-use nonmanifold edges;
- inconsistent winding;
- disconnected shells when one shell is expected.

If practical, also validate the one-ring/fan around each vertex so
"all edges used twice" is not mistaken for complete manifold proof.

Do not add an enormous general-purpose mesh library for this.

============================================================
17. PRESERVE OLD GOOD CASES
============================================================

Retest the full U4C2 true-SDF matrix:

A:
0.50
0.25
0.125
0.0625

B:
0.50
0.25
0.125
0.0625

C:
0.50
0.25
0.125
0.0625

Every row must be topology-valid after U4C3.

Also preserve the B/0.125 clipped-control experiment.

Do not alter source geometry or scalar data merely to obtain a pass.

============================================================
18. VISUAL REGRESSION GATE
============================================================

Capture before/after matched views for:

B / 0.0625
C / 0.125

and at least one ordinary unaffected row such as:

A / 0.25

Use the same:

- source
- camera
- lighting
- scale
- material

The repair must NOT materially degrade:

- silhouette;
- broad planar faces;
- rounded edges;
- source fidelity.

The ideal repair should look nearly identical except around a tiny
formerly ambiguous topology region.

If topology is correct but the visual output becomes noticeably worse,
do not call the phase PASS without analyzing why.

============================================================
19. GEOMETRIC ERROR REGRESSION
============================================================

Recompute the existing U4C2 fidelity metrics.

At minimum:

reconstructed → source:
- median
- p95
- max

source → sampled field:
- median
- p95
- max

The SDF sampling metrics should remain unchanged.

The repaired mesher should not materially worsen reconstruction error.

Record before/after error and triangle/vertex counts for the two former
failures.

============================================================
20. PERFORMANCE / COMPLEXITY METRICS
============================================================

Record:

- active cells;
- ambiguous cells;
- multi-component cells;
- maximum components in one cell;
- additional vertices caused by topology splitting;
- vertex count;
- triangle count;
- Surface Nets CPU time;
- mesh publication time if relevant;
- allocations if available.

Compare to the old mesher on:

- an ordinary unambiguous fixture;
- B/0.0625;
- C/0.125.

This phase does not set a production performance budget.

But reject obviously pathological behavior such as converting most cells
into multi-vertex cells or introducing an order-of-magnitude slowdown
without justification.

============================================================
21. EXISTING WORLD REGRESSIONS
============================================================

The topology repair is part of the shared Surface Nets path, so existing
world functionality matters.

Run existing U3/U4-compatible tests including:

- positive and negative brick addressing;
- world capture;
- read-only grid adapter;
- chunk seams;
- material boundary;
- mined cavity;
- detached irregular fixture;
- deterministic mesh hashes where the fixture has no ambiguity;
- renderer compatibility.

Expected:

unambiguous historical fixtures should remain unchanged where reasonable.

If a deterministic mesh hash changes because an old fixture actually
contains an ambiguity now handled more correctly:

do not blindly preserve the old hash.

Document the exact reason and review the resulting image/topology.

============================================================
22. DUAL CONTOURING
============================================================

Do not redesign or promote Dual Contouring in this phase.

U3 already found no material visual advantage for our target.

It may remain as the existing diagnostic/experimental implementation.

If refactoring shared infrastructure requires touching DC:

- preserve its current behavior;
- keep its tests green;
- do not claim DC topology safety unless separately demonstrated.

U4C3 is about the selected Surface Nets path.

============================================================
23. NO ROCK-SPECIFIC HACKS
============================================================

Forbidden fixes include:

- checking seed 4102 or 4103;
- checking spacing 0.125/0.0625;
- checking B/C archetype;
- moving one offending vertex;
- dropping one offending triangle;
- post-hoc deleting four-use edges;
- arbitrary mesh repair after generation without addressing cell
  topology;
- source-shape modification;
- SDF perturbation solely to avoid the ambiguity.

The fix must operate from scalar topology.

============================================================
24. EVIDENCE
============================================================

Create:

native/evidence/unity/u4c3-topology-safe-surface-nets/

Include at minimum:

README.md
receipt.json

before-after/
    B-0.0625-before.png
    B-0.0625-after.png
    C-0.125-before.png
    C-0.125-after.png
    A-0.25-after.png

diagnostics/
    B-0.0625-ambiguity.json
    C-0.125-ambiguity.json

matrix/
    updated full U4C2 topology/fidelity metrics

tests/
    focused test summary
    full EditMode summary
    PlayMode summary

Record:

- old vs new topology outcome;
- ambiguity masks;
- component counts;
- new surface vertex key design;
- changed mesh hashes;
- changed vertex/triangle counts;
- geometric error;
- timings.

Preserve all U4C2 evidence.

Do not overwrite historical failures.

============================================================
25. TEST SEQUENCE
============================================================

Recommended progression:

A. baseline reproduction
B. component-classifier unit tests
C. asymptotic face-decider tests
D. exact B/C regression tests
E. ambiguous seam test
F. 256-mask classifier test
G. deterministic random closed-field stress
H. full U4C2 matrix
I. existing mesher/world focused tests
J. full EditMode
K. full PlayMode
L. recompile
M. Windows x64 Development Build
N. player capture of one formerly failing case

Use focused tests while iterating.

Do not run a full Windows build after every source edit.

Use detached build tooling if the CLI dispatcher timeout is a concern;
U4C2 already established that path.

============================================================
26. WINDOWS PLAYER PROOF
============================================================

Build a Windows x64 Development Player after all tests are green.

Render at least one formerly failing case, preferably:

B / 0.0625

or

C / 0.125

Record:

- exact source hash;
- spacing;
- reconstructed hash;
- manifold result;
- ambiguous/multi-component-cell counts;
- player exit code.

Confirm no missing shader/pink presentation.

Do not make a leak-free claim unless independently established.

The previously observed eight shutdown persistent allocations remain a
separate known issue unless this phase materially changes them.

============================================================
27. INDEPENDENT REVIEW
============================================================

Before final disposition, perform an independent read-only review.

Reviewer should inspect:

1. actual topology implementation;
2. asymptotic-decider logic;
3. component identity/keying;
4. cross-brick behavior;
5. exact B/C regression outputs;
6. random stress results;
7. before/after visual captures;
8. full U4C2 matrix;
9. tests;
10. performance metrics.

Explicitly look for:

- seed-specific hacks;
- triangle deletion masquerading as repair;
- seam inconsistency;
- nondeterministic component ordering;
- one-cell/multi-vertex data being collapsed during brick combination;
- topology passing only because disconnected components disappeared;
- visual regressions hidden by camera changes.

============================================================
28. PASS / HOLD DECISION
============================================================

Allowed final recommendations:

TOPOLOGY_SAFE_SURFACE_NETS_PASS

SURFACE_NETS_TOPOLOGY_HOLD

REOPEN_MANIFOLD_MESHER

REPRESENTATION_HOLD

TOPOLOGY_SAFE_SURFACE_NETS_PASS requires ALL:

- B/0.0625 manifold;
- C/0.125 manifold;
- every U4C2 matrix row manifold;
- exact source/SDF inputs unchanged;
- no rock-specific hacks;
- multi-patch cell handling is generic;
- crossing edge belongs to exactly one surface component;
- cross-brick ambiguous-cell test passes;
- exhaustive classifier tests pass;
- deterministic stress suite passes;
- visual fidelity remains acceptable;
- no major performance regression;
- existing relevant world/renderer tests pass;
- Windows player proof passes;
- independent review passes.

SURFACE_NETS_TOPOLOGY_HOLD if:

the proposed multi-patch Surface Nets architecture is close but still has
bounded unresolved topology problems.

REOPEN_MANIFOLD_MESHER if:

evidence shows one-vertex/multi-patch Surface Nets becomes excessively
complex or unreliable and a topology-guaranteed extraction method should
replace it for detailed domains.

If this occurs, recommend a focused comparison such as:

- manifold / topology-aware dual contouring;
- MC33 / asymptotic-decider Marching Cubes;
- another explicitly topology-safe local-domain mesher.

Do NOT implement that replacement in U4C3.

REPRESENTATION_HOLD if:

the problem is found to be deeper than Surface Nets topology, such as an
invalid SDF/sample representation.

============================================================
29. IF PASS — RECOMMEND NEXT PHASE
============================================================

If U4C3 passes:

recommend:

UNITY U4D — LOCAL HIGH-RESOLUTION MATTER DOMAIN

Current likely candidate direction:

WORLD TERRAIN
    approximately 0.50 m baseline

ORDINARY DETAILED ROCK DOMAIN
    0.25 m valid tier

HIGH-DETAIL LOCAL MATTER DOMAIN
    investigate 0.125 m as preferred detailed tier

0.0625 m
    retain as optional hero/extreme-detail evidence,
    not automatic production default

U4D should prove that a local high-resolution matter object can:

- exist on coarse terrain;
- retain independent spacing;
- edit locally;
- serialize;
- remesh;
- move later as a MatterActor candidate;

without requiring adaptive terrain stitching.

Do NOT start U4D in this session.

============================================================
30. DOCUMENTATION / GIT
============================================================

Update as appropriate:

docs/CURRENT_SLICE.md
docs/SESSION_START.md
docs/CODE_MAP.md
docs/BUILD_LOG.md
docs/SOURCE_GEOMETRY_MATTER_FIDELITY_PLAN.md
docs/UNITY_FIRST_TRANSITION_PLAN.md

Do not rewrite historical U4/U4B/U4C/U4C2 results.

Commit cohesive work directly to main.

Push to origin/main if project authorization permits.

Verify remote head.

============================================================
31. FINAL RESPONSE
============================================================

Report:

U4C3 RESULT:
PASS / HOLD

FINAL RECOMMENDATION:
TOPOLOGY_SAFE_SURFACE_NETS_PASS
or other allowed disposition

Commit:
<hash>

ROOT CAUSE:
<concise technical explanation>

TOPOLOGY FIX:
<component/edge/key architecture>

KNOWN FAILURE B/0.0625:
before → after

KNOWN FAILURE C/0.125:
before → after

FULL MATRIX:
12/12 topology result

AMBIGUOUS CELL TESTING:
- 256 sign masks
- value-sensitive face cases
- deterministic stress fields

CROSS-BRICK:
result

VISUAL REGRESSION:
result

PERFORMANCE:
old/new representative values

TESTS:
focused
EditMode
PlayMode

WINDOWS BUILD / PLAYER:
result

EVIDENCE:
path

KNOWN LIMITATIONS:
...

NEXT RECOMMENDATION:
U4D / HOLD / reopen mesher

STOP FOR OWNER REVIEW.

Do not begin U4D.