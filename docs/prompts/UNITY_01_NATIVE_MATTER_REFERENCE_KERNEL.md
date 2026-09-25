# Copy-ready prompt — Unity U2 native matter reference kernel

Use only after the Unity bootstrap/agent-smoke checkpoint is reviewed and PASS.

---

WILDKIN FRONTIER
UNITY NATIVE TRANSITION — U2
NATIVE MATTER REFERENCE KERNEL

ROLE

Build the smallest clean Unity-native matter core that can reproduce the
engine-independent contracts from the completed browser R&D.

This is NOT a JavaScript port.

This is NOT the final streaming world.

This is NOT the mesher bakeoff yet.

The purpose is to establish data representation, deterministic sampling,
tests and edit semantics in C# so later Surface Nets / Dual Contouring
experiments share one trustworthy authority.

============================================================
0. READ / BASELINE
============================================================

Read:

- AGENTS.md
- docs/UNITY_FIRST_TRANSITION_PLAN.md
- docs/PC_ENGINE_BAKEOFF_PLAN.md
- native/shared/reference/PHASE05E_REFERENCE.json
- docs/VOXEL_PHASE05E_REPORT.md
- native unity U0 evidence

Inspect browser source only to understand proven contracts.

Do not copy browser implementation patterns automatically.

Verify U0 Unity tests/build start green.

============================================================
1. DESIGN GOAL
============================================================

Create a Unity-native, engine-light matter core with:

- integer global sample coordinates
- fixed-size dense matter brick
- scalar density
- resolved material
- deterministic source composition
- sparse runtime override/tombstone layer
- dirty revision
- bounded region extraction
- serialization-independent pure tests

The core should be usable without a GameObject for most tests.

Keep UnityEngine dependencies out of pure data/math code where practical.

============================================================
2. COORDINATE CONTRACT
============================================================

Define explicit integer address types.

Examples:

Int3 / MatterSampleAddress
MatterBrickAddress
MatterLocalAddress

Do not use Vector3 float as matter identity.

Define:

- spacing in metres
- global sample → brick/local mapping
- half-open ownership convention
- negative coordinate behavior

Add exhaustive boundary tests around:

- -1 / 0
- brick edge
- negative brick edge

============================================================
3. MATTER SAMPLE
============================================================

A resolved sample minimally needs:

- density
- material ID

Use compact blittable/value types compatible with later Jobs/Burst.

Material enum/ID should at minimum include:

AIR
ROCK
DIRT

Do not encode behavior as scattered material-name branches.

Create a small material registry/profile seam for later policy work.

============================================================
4. BRICK REPRESENTATION
============================================================

Start with one fixed-size brick type.

Use a size consistent with future cache-friendly jobs, e.g. 16^3 logical
cells plus whichever sample halo the mesher will eventually require.

Do NOT implement multi-resolution yet.

Use contiguous arrays.

Avoid:

- object per voxel
- Dictionary per sample
- string keys in hot data

Record approximate bytes per brick.

============================================================
5. PROCEDURAL SOURCE COMPOSITION
============================================================

Implement a minimal deterministic source compositor equivalent in
principle to the browser HYBRID decision:

procedural sources
  ↓
explicit precedence/composition
  ↓
resolved density + one physical material

At minimum:

- terrain/dirt source
- rock inclusion source
- air/cut source

Source evaluation order must not change final result.

Do not retain overlapping physical ownership after composition.

============================================================
6. SPARSE RUNTIME EDITS
============================================================

Implement sparse overrides/tombstones over procedural base.

Requirements:

- accepted AIR removal remains AIR;
- procedural source does not regenerate removed matter;
- material edit remains deterministic;
- untouched sample still comes from procedural source;
- edit revision increments only on accepted change.

Use a representation suitable for the small qualification prototype.
Do not build final planet persistence.

============================================================
7. ENGINE-NEUTRAL PHASE E REFERENCE
============================================================

Load or reference:

native/shared/reference/PHASE05E_REFERENCE.json

Create a native reference test suite around its invariants.

Do not require exact browser performance or exact data layout.

Tests must explicitly preserve:

- render/physics/matter separation as architecture contract
- chunks/bricks are not physical owners
- detachment itself creates no reward
- runtime removal does not regenerate
- actor-local matter concept is independent of world brick identity
- unknown support is a future fail-closed state

At this phase actor/physics implementation may remain a data contract only.

============================================================
8. BOUNDED REGION SNAPSHOT
============================================================

Implement a bounded MatterRegionSnapshot / window concept.

Given integer bounds:

- copy/read resolved matter
- retain global origin
- local↔global conversion
- reject out-of-bounds writeback
- expose contiguous density/material arrays

This is the native bridge for later:

- meshing
- support/connectivity
- actor extraction

Add tests crossing brick boundaries.

============================================================
9. SERIALIZATION PROOF
============================================================

Create a simple qualification save format for:

- procedural seed/version
- sparse edits
- world revision

JSON is acceptable for the qualification if clearly marked provisional.

Reload must prove removed/generated matter does not reappear.

Do not design the final production save schema.

============================================================
10. BURST/JOBS READINESS
============================================================

Do not prematurely Burst everything.

But review hot structures for compatibility:

- unmanaged/blittable structs where practical
- contiguous NativeArray-compatible layouts
- no hidden managed references in future meshing inputs

Add a small benchmark comparing deterministic sample reads over a fixed
region.

If useful, implement one read/sample job as a proof, but only if it keeps
the design simpler or provides meaningful evidence.

============================================================
11. UNITY DEBUG VISUALIZATION
============================================================

Add a minimal Tech scene or debug component that displays sample
occupancy/material for one brick/region.

This is NOT the production renderer.

Allowed:

- point markers
- instanced cubes
- debug gizmos

The purpose is to visually verify coordinates/material regions before
mesher work.

Capture one screenshot through the established agent tooling.

============================================================
12. CUSTOM AGENT INSPECTION
============================================================

Extend the U0 Wildkin command/tool with:

inspect_matter_region

Input:
- integer min/max or center/radius

Output machine-readable:
- bounds
- sample count
- solid count
- rock count
- dirt count
- edit count
- revision

This tool should call the same matter authority used by tests/runtime.

Do not create a parallel debug data model.

============================================================
13. TESTS
============================================================

Required EditMode tests:

COORDINATES
- positive/negative brick mapping
- boundary ownership
- round trip

COMPOSITION
- deterministic source result
- order independence
- rock/dirt precedence
- one resolved material

EDITS
- remove generated matter
- no regeneration
- material preservation
- no-op edit does not revise

REGION
- cross-brick snapshot
- local/global mapping
- bounds checks

SAVE
- sparse edits round trip
- revision round trip
- removed matter remains removed

REFERENCE
- Phase E architectural invariants represented/documented

PERFORMANCE SANITY
- record sample-loop measurement; no pass threshold yet

============================================================
14. EVIDENCE
============================================================

Write:

native/evidence/unity/u1-matter-kernel/

Include:

- README.md
- receipt.json
- debug screenshot
- test result path/copy or summary
- memory/layout summary

Receipt:

{
  unityVersion,
  commit,
  brickCellSize,
  sampleSpacing,
  bytesPerBrick,
  sourceSeed,
  testCounts,
  sampleBenchmark,
  ownerInterventions,
  notes
}

============================================================
15. VALIDATION
============================================================

- clean compile
- all EditMode tests green
- relevant PlayMode smoke remains green
- inspect_matter_region works through agent tooling
- Windows development build still succeeds
- no browser code changed
- no generated-cache pollution

Independent read-only review before PASS.

============================================================
16. PASS / HOLD
============================================================

PASS if:

- deterministic matter authority is clean in C#
- brick addressing works across boundaries
- sparse edits prevent regeneration
- bounded snapshots cross bricks correctly
- data layout is plausible for Jobs/Burst
- tests and agent inspection use the same authority
- Unity build stays healthy

HOLD if:

- matter data requires GameObject-per-voxel architecture
- negative/boundary mapping remains ambiguous
- sparse edits and procedural authority conflict
- core data cannot be made reasonably job-friendly

Do not HOLD because there is no nice mesh yet.

============================================================
17. COMPLETION
============================================================

Commit/push the bounded checkpoint if authorized.

Final response:

PASS/HOLD
commit
brick layout
memory
tests
benchmark
agent-tool result
evidence
limitations

If PASS recommend:

UNITY U3 — MESHER + RESOLUTION BAKEOFF

DO NOT START U3.

STOP FOR OWNER REVIEW.
