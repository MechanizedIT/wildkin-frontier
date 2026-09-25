# Wildkin Frontier — PC Engine & Matter Technology Bakeoff

**Status:** planned after Phase 0.5E PASS. No production engine has been selected yet.

**Purpose:** choose the native PC production stack for Wildkin Frontier by building the same small, agent-driven vertical slice in **Unity 6.3 LTS** and **Unreal Engine 5.8**, then comparing the engines on the actual requirements that make Wildkin unusual: high-detail destructible matter, runtime meshing, procedural uniqueness, stylized materials, physics, persistence, and Codex/agent autonomy.

The current Three.js/Rapier implementation remains the behavioral reference and executable R&D specification. It is not assumed to be the shipping stack.

## Decision we are making

Select the engine and core surface technology that best support this target:

> A mid/upper-range PC game with a stylized 3D world that largely looks like authored game art, while terrain, rocks, trees, ruins, large flora and other substantial forms can be destructible matter underneath.

The bakeoff must answer five questions together:

1. **Engine:** Unity or Unreal?
2. **Agent workflow:** which one lets Codex inspect, modify, test, run and visually validate the project with the least manual editor intervention?
3. **Runtime matter rendering:** can a custom dynamically remeshed world look good enough for Wildkin?
4. **Mesher/resolution:** keep Surface Nets, adopt Dual Contouring, or use a hybrid; and does locally refined brick resolution materially improve the target look?
5. **Procedural stamps:** can one generator create many visibly unique rocks/large forms that become ordinary destructible matter after placement?

## Locked comparison versions

Use production-stable/current versions unless a documented blocker requires a patch change:

- **Unity:** Unity 6.3 LTS, HDRP, Windows x64.
- **Unreal:** Unreal Engine 5.8, Windows x64.

Pin exact editor/engine patch versions in each experiment receipt.

## Agent setup is part of the experiment

### Unity

Install and verify:

- Unity's official third-party agent plugin for Codex.
- Unity CLI.
- Unity CLI MCP configured project-locally for Codex.
- Editor connection and screenshot/capture tools.

Required agent proof before voxel work:

- Codex can inspect project/editor state.
- create/modify a GameObject or scene object;
- create/edit C#;
- run EditMode tests;
- enter/run Play Mode or an equivalent automated playtest;
- capture Game/Scene view evidence;
- produce a Windows build from CLI;
- return logs/test/build artifacts without the owner navigating editor dialogs.

### Unreal

Enable and verify:

- Unreal MCP;
- All Toolsets / Toolset Registry;
- MCP autostart;
- generated Codex client configuration.

Required agent proof before voxel work:

- Codex can inspect selected/world actors;
- create/modify an actor;
- create or configure a material instance;
- edit C++/Python project code;
- run Automation tests;
- launch/inspect a PIE or equivalent test;
- capture evidence;
- build/package or run an unattended test flow;
- return logs/test artifacts without the owner manually driving editor state.

Create a small custom **Wildkin toolset** in each engine by the end of the bakeoff so Codex is not dependent only on generic editor tools.

Initial custom commands/tools should expose equivalents of:

- inspect matter region
- generate procedural rock stamp
- remesh selected matter chunk
- apply matter edit
- inspect actor/material ledger
- capture benchmark scene
- run matter tests
- export benchmark receipt

## Fairness rules

The two prototypes must solve the same bounded problem.

Do not allow one engine to use a Marketplace/Fab voxel product while the other uses the custom kernel. Engine-native general rendering, physics, materials, testing and editor tooling are allowed.

Do not port the browser code line-for-line. Reimplement the proven behavior from its contracts/tests.

Use the same:

- world dimensions;
- SDF/stamp seeds;
- target rock formations;
- scalar sample datasets for matched mesher tests;
- cameras where practical;
- material palette/reference textures;
- benchmark operations;
- screenshot list;
- acceptance tests;
- target PC.

Record any unavoidable engine-specific difference.

## Shared vertical-slice target

Each engine must produce one small scene containing:

- a stylized dirt/rock terrain patch;
- one generated layered rock formation resembling an authored game asset rather than a blob;
- dirt and stone with proper projected materials;
- one shallow cave/overhang;
- one editable terrain section;
- one substantial rock/terrain component that can become dynamic;
- one small procedural vegetation example;
- free camera/player navigation sufficient to inspect the scene.

The scene is not a gameplay milestone. It is a technology specimen.

## Phase F0 — Freeze the browser reference

Before native implementation:

1. Tag/document the Phase E known-good commit.
2. Preserve exact invariants to port:
   - scalar/material authority;
   - chunks are not physical owners;
   - static-to-dynamic transfer is atomic;
   - detachment does not grant resources;
   - actors own resolved local matter;
   - precision interaction targets matter, not coarse physics;
   - unsupported search is bounded/fail-closed;
   - material behavior dispatches from hit matter.
3. Export small deterministic reference fixtures as engine-neutral data where useful:
   - scalar grids;
   - materials;
   - SDF stamp parameters;
   - expected component counts;
   - edit sequences;
   - expected ledgers.

No more browser performance optimization is required for the production decision.

## Phase F1 — Agent autonomy smoke test

Time-box both engines to the same task set.

Give Codex equivalent prompts, such as:

1. create a project scene;
2. add a lit test floor and camera;
3. add a generated object through code;
4. expose one custom editor/MCP tool;
5. write and run a test;
6. intentionally introduce and repair one compile/test failure;
7. capture screenshot evidence;
8. make a Windows development build.

Record:

- owner/editor clicks required;
- failed tool calls;
- editor restarts;
- compile/reload duration;
- test turnaround;
- whether Codex can inspect the result directly;
- whether scene/asset changes are reviewable in source control;
- whether an agent can recover from its own failure.

**Gate:** do not spend days on voxel tech in an engine whose agent workflow is clearly impractical.

## Phase F2 — Matter kernel skeleton

Implement the same minimal native matter contracts in both engines.

Suggested core types:

- integer global sample address;
- fixed-size matter brick;
- density field;
- material field;
- sparse edit/tombstone layer;
- dirty-region/chunk revision;
- local MatterActor volume.

For the bakeoff use a simple fixed brick layout first. Do not build streaming yet.

### Unity implementation target

Use data-oriented arrays/NativeArray-compatible data and structure work so expensive sampling/meshing can later run through Jobs/Burst. Runtime mesh output should use Unity's writable MeshData path rather than per-vertex managed-object churn.

### Unreal implementation target

Use engine-native C++ containers/data structures for the hot matter kernel. Test runtime geometry using the most appropriate dynamic mesh path for the specimen, with the limitation that standard DynamicMeshComponent runtime topology is not a Nanite/Lumen path recorded explicitly in the result.

**Gate:** both engines can load/sample/edit the same deterministic matter fixture and produce matching material/occupancy checks.

## Phase F3 — Mesher bakeoff: Surface Nets vs Dual Contouring

Do this inside each engine against the **same scalar fields**.

Implement:

### A. Surface Nets baseline

Port only enough of the known mesher to create an honest baseline.

### B. Dual Contouring prototype

Use Hermite edge intersections / normals and QEF-style vertex placement sufficient to test:

- planar rock faces;
- corners;
- shelves;
- cliff cuts;
- caves;
- edit stability.

This is an R&D implementation, not a full production adaptive DC library.

### Test datasets

At minimum:

1. smooth sphere/blob;
2. layered/blocky procedural rock stamp;
3. cliff/cave SDF;
4. dirt/rock material interface;
5. post-mining cavity;
6. detached irregular chunk.

### Compare

- silhouette quality;
- preservation of intended planar/sharp features;
- triangle count;
- mesh generation time;
- allocations;
- normals/shading quality;
- cracks at chunk boundaries;
- stability after small edits;
- ease of supporting material attributes;
- ease of agent maintenance.

**Decision:** select Surface Nets, Dual Contouring, or a documented hybrid.

## Phase F4 — Resolution bakeoff

Do not immediately build a full sparse octree.

Compare three representations over the same visual target:

1. uniform **0.50 m**;
2. uniform **0.25 m**;
3. **brick-local refinement** where ordinary terrain remains 0.50 m and the target formation/exposed interactive region is 0.25 m.

Optional 0.125 m should only be tested in a tiny crop if 0.25 m still cannot represent the desired rock silhouette.

The long-term candidate is a **sparse hierarchical brick field**, not individual pointer-heavy octree nodes:

- fixed-size dense brick internally;
- power-of-two sample spacing per brick/region;
- explicit neighbor/transition rules;
- only refined where visual/gameplay benefit justifies cost.

### Required proof

Create matched screenshots of the procedural rock at each resolution and record:

- scalar memory;
- mesh time;
- vertex/triangle count;
- edit/remesh cost;
- seam difficulty;
- visual improvement.

Do not pick smaller voxels merely because they look better. Record cost per useful improvement.

## Phase F5 — Stylized surface material bakeoff

The raw brown/gray lab appearance is no longer acceptable evidence.

Build a deliberately stylized material system in both engines.

### Stone

- triplanar/object/rest-space projected albedo;
- normal detail;
- roughness variation;
- broad macro color variation;
- optional curvature/slope accent;
- subtle detail that does not hide the faceted geometry.

### Dirt

- projected soil albedo;
- roughness/detail response distinct from stone;
- broad variation;
- optional tiny visual stones/noise.

### Material boundary

Use a narrow material-weight transition that can cross triangles without forcing geometry to follow the material seam.

### Dynamic actor projection

A detached MatterActor must not have obvious texture swimming. Test object/rest-space projection or stored reference coordinates so the material moves with the actor.

### Microdetail policy

Separate:

- **authoritative macro geometry:** silhouette, holes, ledges, big cracks;
- **render-only microdetail:** grain, tiny chips, scratches, small surface roughness.

Optional small displacement/parallax may be tested, but mining geometry must not visibly disagree with the rendered surface.

**Gate:** the dirt/rock scene looks like a plausible stylized PC game environment rather than a voxel-debug visualization.

## Phase F6 — Procedural SDF rock stamp

This is the main art-direction specimen.

Build a seeded **RockFormationStamp** generator.

Inputs may include:

- seed;
- overall bounds;
- primitive count;
- proportions;
- rotation distribution;
- flattening;
- layered/stacked tendency;
- corner softness;
- erosion/noise amount;
- material variant.

Use procedural primitives such as:

- rounded boxes;
- ellipsoids;
- wedges/slabs;
- soft unions/intersections;
- low-frequency warp/noise.

Target the visual language of stylized authored rock formations:

- strong silhouette;
- broad planar faces;
- rounded/beveled corners;
- varied block sizes;
- stacked/layered arrangement;
- controlled asymmetry.

Generate at least **20 seeds** automatically.

Create a contact sheet/grid.

Record simple diversity measurements if useful:

- bounding proportions;
- occupied volume;
- silhouette descriptor;
- major primitive count.

The owner should not feel like there are three repeated rock models with different rotations.

### Destruction proof

Choose one generated stamp, convert/resolve it into ordinary matter, then:

- chip it;
- dig/expose it;
- split or detach a component;
- move the component;
- edit it again.

After stamping, its simulation path must not depend on a static source mesh.

## Phase F7 — Tree/large-flora feasibility spike

Do not implement the complete wood system yet.

Create one seed-driven procedural tree skeleton and convert the trunk/large branches into an SDF/matter representation.

Vary:

- trunk lean/taper;
- branch count;
- branch angles;
- branch length;
- root flare.

Generate at least 8 visibly different trees.

Test only:

- generation;
- voxel/matter conversion;
- surface quality;
- one cut through trunk or branch.

Small leaves/twigs may remain ordinary instanced/model geometry. Record the intended multi-representation destruction hierarchy instead of forcing every leaf into volumetric matter.

## Phase F8 — Minimal destructible vertical slice

Port only the minimum behavior needed to prove that the native engine can host the browser architecture:

- terrain edit;
- material-specific dirt vs rock response;
- local support query;
- static-to-dynamic transfer;
- one MatterActor;
- dynamic collision;
- moved-pose editing;
- save/reload of one changed scene.

Do **not** port all Phase E systems before choosing an engine.

The objective is to expose integration pain in:

- job/thread scheduling;
- runtime mesh upload;
- physics collider replacement;
- editor/runtime separation;
- serialization;
- agent debugging.

## Phase F9 — Agent endurance trial

Give Codex the same larger task in each prototype from a fresh session.

Suggested task:

> Add a second procedural rock family, expose its parameters to the project data model, generate ten examples, add a regression test, run the scene, capture a comparison board, identify and fix one visual defect, and commit the result.

Do not guide the agent differently between engines unless blocked.

Record:

- elapsed wall time;
- user interventions;
- tool failures;
- build/compile failures;
- editor restarts;
- amount of work Codex could validate itself;
- quality/readability of code changes;
- source-control noise;
- whether editor-only binary state hid important changes;
- success of custom Wildkin agent tools.

This trial is a major part of the engine decision, not a side metric.

## Phase F10 — Performance specimen

Run on the same PC with equivalent scene/camera.

Measure separately:

- scalar sampling/generation;
- 0.5 m meshing;
- 0.25 m meshing;
- local-refinement meshing;
- runtime mesh upload;
- static collision creation/update;
- dynamic actor collider creation;
- one small edit;
- one medium edit;
- one support query;
- one static→dynamic transfer;
- frame CPU/GPU timing in the rendered scene;
- peak/steady memory for the specimen.

Use release/development builds appropriate for performance comparisons, not only editor timing.

Do not overfit microbenchmarks. Also record visible hitch duration during an actual edit.

## Common evidence package

Each engine prototype must produce:

- README/setup;
- pinned engine version;
- exact agent/MCP configuration;
- automated setup notes;
- test commands;
- build command;
- benchmark command;
- screenshot/capture command;
- source stamp seeds;
- screenshot board;
- JSON benchmark receipt;
- compile/test/build logs;
- list of required manual interventions;
- known limitations.

Keep prototype code isolated from current shipping/browser project until a winner is selected.

Suggested repository layout if kept in this repository:

```
native-bakeoff/
  shared/
    reference-data/
    acceptance/
  unity/
  unreal/
  evidence/
    unity/
    unreal/
```

If engine-generated repositories become too large/noisy, use sibling repositories but retain the shared reference/evidence contract here.

## Evaluation rubric

Do not pick a winner from rendering alone.

Score each engine on evidence in these categories.

### 1. Codex/agent workflow — 25%

- official first-party agent/MCP support;
- editor inspection;
- ability to make scene/material changes;
- test/build automation;
- screenshot evidence;
- custom Wildkin tools;
- recovery from errors;
- manual intervention burden.

### 2. Matter-kernel engineering — 20%

- data-oriented CPU work;
- multithreading;
- runtime mesh update ergonomics;
- deterministic tests;
- profiler clarity;
- debugging.

### 3. Runtime rendering / visual ceiling — 20%

- stylized material quality;
- dynamic mesh lighting/shadow quality;
- ability to preserve target rock shape;
- material transitions;
- dynamic-actor texture stability.

### 4. Procedural world authoring — 15%

- stamp workflow;
- tree/rock procedural tools;
- editor visualization;
- parameter authoring;
- broader PCG ecosystem.

### 5. Runtime physics & destruction integration — 10%

- static collision replacement;
- dynamic actor collision;
- async preparation;
- hitching;
- debugging contacts.

### 6. Production workflow / maintainability — 10%

- source-control clarity;
- build pipeline;
- iteration time;
- asset/project stability;
- ease of agent-generated code review.

Record raw measurements alongside the score so the final decision is not just subjective arithmetic.

## Decision rules

A candidate should not win if it has a severe blocker in any of these:

- Codex cannot reliably inspect/operate the project;
- dynamic matter geometry cannot reach the visual target;
- runtime meshing/collision produces unacceptable hitches with no plausible async path;
- procedural stamp workflow is unmaintainable;
- project state important to gameplay is opaque to automation/review;
- custom matter behavior requires fighting the engine's core assumptions at every edit.

If both engines pass, prefer the one that makes the complete **human + Codex** development loop faster and safer, not the one with the flashiest untouched-engine demo.

## Working hypotheses to test, not assume

### Unity hypothesis

Unity 6.3 LTS + HDRP + C# Jobs/Burst + writable MeshData is likely to make the custom matter kernel and Codex code loop straightforward. Its official Unity agent plugin and CLI/MCP provide a strong direct Codex path. The bakeoff must prove the visual ceiling and tooling for large procedural worlds rather than assume them.

### Unreal hypothesis

Unreal 5.8 offers stronger built-in high-end world/PCG tooling and an official experimental MCP that explicitly supports Codex and extensible Python/C++ toolsets. The bakeoff must test whether runtime destructible dynamic meshes integrate cleanly enough, especially because standard UDynamicMeshComponent runtime topology does not use Nanite or Lumen.

## Output of the bakeoff

Create:

`docs/PC_ENGINE_BAKEOFF_REPORT.md`

It must include:

- exact engine versions;
- agent setup;
- source repositories/commits;
- matched screenshots;
- mesher decision;
- resolution decision;
- procedural stamp results;
- agent endurance results;
- runtime benchmarks;
- limitations;
- rubric evidence;
- recommended production engine;
- recommended production matter representation;
- recommended next implementation phase.

Do not begin full migration until the owner reviews this report.
