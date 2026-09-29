# WILDKIN FRONTIER
# UNITY U4E — PROCEDURAL MULTI-DOMAIN ROCK FORMATIONS

Use this prompt in a **fresh GPT-6 Luna Codex session with the MAXIMUM available reasoning level**.

This is one bounded architecture + visual qualification phase.

Do **not** continue automatically into U5, MatterActor physics, collapse, world streaming, adaptive terrain stitching, Unreal, or production migration.

---

## 0. OWNER AUTHORIZATION / EXPECTED STARTING POINT

The owner authorizes implementation of:

**U4E — PROCEDURAL MULTI-DOMAIN ROCK FORMATIONS**

Expected current `origin/main` when this prompt was written:

`f1b16f11dd15f1b7b502bfcc3385c581718b1f1c`

Current accepted U4D implementation checkpoint:

`f2fff9f445925712e461542efe1e176259310718`

Disposition:

`LOCAL_DOMAIN_0_125_PASS`

Before doing anything, independently verify current Git state. Do not blindly assume the expected SHA is still current.

If `origin/main` has advanced, inspect the intervening commits before implementation. Continue only if they do not materially supersede this U4E brief.

---

# 1. PRIMARY QUESTION

Can Wildkin create visually varied, authored-looking procedural rock formations by composing several individually high-quality destructible `MatterDomain`s while preserving:

- independent matter authority;
- deterministic child identity;
- true-SDF matter;
- bounded local remeshing;
- source-independent runtime authority;
- measured geometric contact;
- no substantial duplicate matter;
- recipe-based pristine regeneration?

The intended architecture is:

```text
FORMATION RECIPE
        ↓
semantic child slots
        ↓
deterministically varied high-quality single-stone sources
        ↓
each source → true-SDF MatterDomain
        ↓
deterministic geometry-based contact fitting
        ↓
several independent MatterDomains
        ↓
one coherent visual rock formation
```

The default representation is **NOT**:

```text
all stones
    ↓
union / smooth union
    ↓
one fused formation SDF
```

Do not return to U4/U4B fused-clast/metaball language merely to make contacts easy.

---

# 2. HARD STOP BOUNDARY

U4E includes:

- formation recipe generation;
- individual stone source variation;
- child MatterDomain creation;
- deterministic child identities;
- deterministic child placement;
- domain-domain contact fitting;
- domain-terrain contact;
- diagnostic contact graph;
- gallery/evidence generation;
- one-child local edit;
- bounded mesh/contact invalidation;
- pristine recipe regeneration;
- performance observations;
- tests;
- Windows Player proof;
- evidence;
- documentation;
- commit/push;
- STOP.

U4E explicitly does **NOT** include:

- Rigidbody simulation;
- MatterActor creation;
- static→dynamic transfer;
- collapse;
- structural failure;
- stress simulation;
- fracture;
- support propagation gameplay;
- resource drops;
- material accounting;
- adaptive terrain stitching;
- world streaming;
- Jobs/Burst migration;
- production save system;
- journal/checkpoint implementation;
- Unreal;
- 0.0625 m formation children;
- final production source-asset library.

Do not “helpfully” implement U5.

---

# 3. REPOSITORY START / LOCAL-WORK SAFETY

Work directly on `main` as required by `AGENTS.md`.

First record:

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git fetch origin
git rev-parse origin/main
```

Bring `main` to current `origin/main` only when it can be done without destroying unrelated work.

Preserve every unrelated pre-existing modification and untracked path.

Do NOT:

```text
git reset --hard
git clean
git clean -fd
git stash -u
```

Do not delete or absorb owner work.

Do not stage unrelated files.

In particular, preserve any pre-existing:

- `Builds/`
- `authoring/`
- historical browser evidence;
- generated readiness evidence;
- HDRP settings/assets not changed by U4E;
- owner-created files outside this task.

Record the initial status in the U4E evidence/report so the final commit can prove unrelated work was preserved.

Before commit, compare staged paths against this initial status.

---

# 4. REQUIRED READING

Read current Git versions, not cached assumptions.

Read in this order:

1. `AGENTS.md`
2. `docs/CURRENT_SLICE.md`
3. `docs/SESSION_START.md`
4. `docs/UNITY_NATIVE_HANDOFF_AFTER_U4D.md`
5. `docs/UNITY_FIRST_TRANSITION_PLAN.md`
6. `docs/LOCAL_MATTER_DOMAINS.md`
7. `docs/NATIVE_WORLD_PERSISTENCE_AND_UPDATES.md`
8. `docs/UNITY_U4E_FORMATION_PLAN.md`
9. `docs/NATIVE_DESTRUCTION_REPRESENTATION.md`
10. `docs/SOURCE_GEOMETRY_MATTER_FIDELITY_PLAN.md`
11. `native/evidence/unity/u4d-local-matter-domain/README.md`
12. `native/evidence/unity/u4d-local-matter-domain/review.md`
13. `native/evidence/unity/u4d-local-matter-domain/receipt.json`

Then inspect actual implementation, especially:

```text
native/unity/WildkinUnity/Assets/Wildkin/Matter/Core/MatterDomain.cs
native/unity/WildkinUnity/Assets/Wildkin/Matter/Core/MatterDomainMeshing.cs
native/unity/WildkinUnity/Assets/Wildkin/Matter/Core/MatterLocalVolume.cs
native/unity/WildkinUnity/Assets/Wildkin/Matter/Core/SculptedStone.cs
native/unity/WildkinUnity/Assets/Wildkin/Matter/Core/SculptedStoneCuts.cs
native/unity/WildkinUnity/Assets/Wildkin/Matter/Core/SourceMeshSignedDistance.cs
native/unity/WildkinUnity/Assets/Wildkin/Matter/Core/MatterMeshers.cs
native/unity/WildkinUnity/Assets/Wildkin/Matter/Core/MatterSurfaceNetsTopology.cs
native/unity/WildkinUnity/Assets/Wildkin/Matter/Unity/MatterDomainQualificationView.cs
native/unity/WildkinUnity/Assets/Wildkin/Tests/EditMode/MatterDomainTests.cs
native/unity/WildkinUnity/Assets/Wildkin/Tests/EditMode/MatterDomainSaveTests.cs
```

Also inspect the U4C2 accepted source evidence when necessary.

Do not begin by rereading every historical browser phase.

---

# 5. LOCKED BASELINE

Do not regress these accepted facts.

## Engine

- Unity `6000.3.25f1`
- HDRP `17.3.0`
- Windows x64
- Unity remains active production candidate.

## Matter representation

- approximately 0.50 m world matter;
- independent 0.25 m ordinary-detail domains;
- independent 0.125 m high-detail domains;
- true signed-distance local matter;
- source mesh is generation input, not runtime authority.

## Mesher

Surface Nets remains selected.

Preserve U4C3's exact qualification limit:

- recorded genus-zero source family is qualified;
- 256 sign masks/orientations are covered;
- face-saddle decisions are covered;
- deterministic stress is covered;
- arbitrary trilinear interior connectivity is NOT generally solved;
- higher-genus surfaces are NOT generally qualified.

Do not broaden U4E claims beyond this.

## Domain invariants

Preserve:

```text
integer local sample identity
!=
world transform
```

Transform-only movement must not alter matter identity.

Preserve:

```text
matter authority
!=
render mesh
!=
future physics proxy
```

---

# 6. IMPORTANT SOURCE-GENERATOR REGRESSION RULE

The existing accepted U4C2 stone generator is a regression baseline.

Do **NOT** globally change the output of:

```text
SculptedStoneGenerator.CreateRecipe(archetype, seed)
SculptedStoneGenerator.Generate(archetype, seed)
```

in a way that changes the accepted fixed-seed U4C2 source hashes.

Existing U4C2 tests and source hashes must stay green.

U4E needs stronger variation than the current base seed jitter alone.

Implement U4E-specific generation approximately like:

```text
baseRecipe =
    SculptedStoneGenerator.CreateRecipe(archetype, sourceSeed)

formationVariantRecipe =
    deterministic U4E variation(
        baseRecipe,
        formationSeed,
        semanticSlot,
        variationSeed
    )

sourceMesh =
    SculptedStoneGenerator.Build(formationVariantRecipe)
```

The U4E variant may deterministically alter bounded generation-time values such as:

- `radiusX`
- `radiusY`
- `radiusZ`
- exponent
- taper
- lean
- skew
- twist
- top tilt
- quadrant compression
- other already-supported macro parameters

while respecting `SculptedStoneGenerator.Build()`'s bounded modeler envelope.

The important requirement is:

**source geometry itself must meaningfully vary.**

Do not achieve “variation” only with:

- world translation;
- yaw;
- material color;
- uniform transform scale.

Do not add runtime transform scaling to `MatterDomainPose`.

Stone physical dimensions should be authored into source geometry before SDF bake.

---

# 7. FORMATION RECIPE

Add a small deterministic engine-light formation recipe layer.

Names may differ, but responsibilities should be equivalent to:

```text
RockFormationRecipe
RockFormationChildRecipe
RockFormationGenerator
```

A formation recipe should have:

- explicit recipe/version string;
- formation seed;
- formation archetype;
- deterministic semantic slots;
- deterministic source seed per child;
- source archetype/family;
- U4E source-variation parameters;
- desired spacing;
- intended relative placement/orientation;
- intended parent/contact relation;
- deterministic stable child ID inputs.

Use approximately **3–8 children**.

Use semantic slot identities rather than anonymous random array indices.

Example keys:

```text
foundation
shoulder-a
shoulder-b
support-a
cap
accent-a
accent-b
```

Slot names are examples, not mandatory class names.

If two similar roles exist, their keys must still be stable.

---

# 8. FORMATION ARCHETYPES

Implement a bounded number of strong formation families.

Target approximately **3 or 4**, not ten shallow families.

Useful families include:

- low stacked shelf;
- leaning cluster;
- buttressed outcrop;
- broken/stepped ridge.

The implementation does not have to use these exact names.

Each archetype should meaningfully affect:

- child count;
- dominant mass;
- size hierarchy;
- centroid layout;
- orientation relationships;
- negative-space opportunities;
- likely support/contact chain.

Do not simply change a label and reuse the same layout algorithm.

---

# 9. LARGE / MEDIUM / SMALL MASS HIERARCHY

Every accepted formation must have intentional hierarchy.

At minimum:

- one dominant/foundation mass;
- one or more secondary masses;
- at least one clearly smaller subordinate/accent mass when child count permits.

Avoid five stones of almost identical size.

Record per-child source bounds and volume proxy.

Record formation:

- width;
- height;
- depth;
- height/width ratio;
- child count;
- dominant child fraction;
- source archetype distribution.

These are diagnostic diversity metrics.

They do not replace visual review.

---

# 10. SAMPLE-SPACING POLICY

Do not bake every gallery child at 0.125 m.

Preferred U4E policy:

### Ordinary children

Use:

`0.25 m`

### Selected important/high-detail children

Use:

`0.125 m`

Examples:

- dominant hero stone;
- exposed capstone;
- characteristic buttress;
- selected visual focal child.

No 0.0625 m U4E children.

The 20-seed set must include actual mixed-resolution formations.

Require at least several formations where a:

`0.25 m child`

is in measured contact with a:

`0.125 m child`.

Record spacing per child and per contact edge.

Do not interpret separate local spacing as adaptive terrain refinement.

---

# 11. STABLE CHILD IDENTITY

A child domain ID must be deterministic from stable logical inputs.

Conceptually:

```text
formation recipe version
+
formation seed / formation ID
+
semantic slot key
+
identity schema version
        ↓
stable child-domain ID
```

Do not use random GUID generation.

Do not depend solely on child array order.

Regenerating the same recipe must yield exactly the same child IDs.

Changing a child's world pose must not change its identity.

Record stable IDs in evidence.

---

# 12. SOURCE-AGNOSTIC COMPOSITION BOUNDARY

Formation composition must not become tightly coupled to one future source technology.

Keep the logical boundary approximately:

```text
formation child descriptor
        ↓
current source resolver
        ↓
validated source geometry
        ↓
true-SDF local volume
        ↓
MatterDomain
```

For U4E the current resolver uses the accepted sculpted-stone source.

Do not build a large generic plugin framework.

Simply keep recipe/layout/contact code separate from the specific mesh-generation implementation so a later:

- Blender mesh;
- Geometry Nodes source;
- TRELLIS source;
- scan;
- artist-authored FBX/GLB

could replace the source resolver without rewriting formation semantics.

---

# 13. CHILD MATTERDOMAIN CREATION

For each child:

1. build validated source geometry;
2. true-SDF sample it with the existing path;
3. bake into a `MatterDomain`;
4. release source runtime authority;
5. build Surface Nets in child-local coordinates;
6. assign pose independently.

After bake:

- source mesh is not matter authority;
- source mesh is not required for edits;
- source mesh is not required for remeshing.

Do not union child sample arrays together.

---

# 14. FORMATION ROOT TRANSFORM

A formation may have one root/world transform for convenient placement.

Child domain matter remains local.

Conceptually:

```text
formation root pose
×
child local placement pose
=
MatterDomain world pose
```

No transform scale.

Translation/rotation only.

The same generated formation must be placeable at another root transform without regenerating matter.

Do not make root pose part of child content hash.

---

# 15. CONTACT FITTING — REQUIRED ARCHITECTURE

This is an important U4E uncertainty.

Do not use arbitrary hand-authored translation values and then merely label them “contact”.

Implement deterministic geometry-based fitting.

A useful decomposition is:

```text
MatterDomainContactProbe
RockFormationContactFitter
RockFormationContactGraph
```

Equivalent names are fine.

The fitter should start from a deterministic recipe-proposed pose and adjust a child along one constrained placement direction appropriate to its slot.

Examples:

- downward toward foundation;
- diagonal toward shoulder;
- inward/downward toward a buttress;
- downward toward terrain.

Use a deterministic fixed iteration count / deterministic search.

Quantize final fitted translation sufficiently to prevent meaningless floating-point drift in deterministic regeneration.

Do not use physics.

---

# 16. CONTACT MEASUREMENT

Contact must be based on actual generated matter/mesh geometry.

Do not derive graph edges solely from:

```text
recipe says cap rests on shoulder
```

Use measured geometry.

Implement a bounded symmetric diagnostic that can record at least:

- pair IDs;
- child spacings;
- minimum measured surface separation/gap;
- near-contact witness count and/or area proxy;
- fitting direction;
- translation adjustment;
- A→B positive-solid overlap sample count;
- B→A positive-solid overlap sample count;
- corresponding sampled overlap-volume estimates;
- contact accepted/rejected.

A strong approach is:

### Surface proximity

Use deterministic surface probes from the built Surface Nets mesh, such as:

- vertices;
- triangle centroids;
- or another bounded deterministic surface sample.

Transform probe positions into the other domain and trilinearly sample its signed density.

Probe symmetrically.

### Solid overlap

For broad-phase-overlapping domains, inspect positive authoritative sample centers from each domain against trilinear density in the other.

Report both directions.

Do not present this sampled check as an exact analytic CSG intersection volume.

It is U4E's deterministic double-ownership diagnostic.

---

# 17. CONTACT TOLERANCE

Put contact thresholds in one obvious U4E configuration owner.

Do not scatter magic numbers.

For ordinary accepted contacts, target a visibly closed small separation roughly on the order of a few centimetres.

A useful starting bound is:

```text
maximum accepted measured surface gap:
~0.06 m
```

Adjusting this once during initial qualification is allowed if actual Surface Nets/SDF evidence demonstrates a better value.

If changed:

- document the reason;
- keep it fixed thereafter;
- regenerate all evidence;
- do not loosen it per seed.

A visible floating gap is a failure even if a numerical threshold passes.

---

# 18. DOUBLE-OWNED SOLID GATE

For accepted final formations:

**target zero positive-solid sample-center overlap between independent child authorities in both probe directions.**

Also target zero positive-solid child/world overlap for terrain placement, following the U4D diagnostic model.

If achieving coherent contact genuinely requires a tiny sampled overlap, do not silently weaken this requirement.

Record the failure and classify U4E HOLD unless there is extremely strong evidence that the diagnostic itself is producing a false positive.

Do not hide overlap by unioning domains.

---

# 19. CONTACT GRAPH

After fitting, evaluate pairwise contacts from measured geometry.

Graph nodes:

```text
terrain
child domains
```

Graph edges are created from actual qualifying measured contacts.

Recipe intent may guide fitting but must not directly create the final edge.

Record unexpected measured edges too.

For each final accepted formation:

**every child must belong to one contact-connected component containing `terrain`.**

This is a diagnostic connectivity requirement, not a physics/support solver.

It prevents:

- floating capstones;
- isolated accents;
- disconnected sub-piles.

Do not calculate engineering stress or collapse.

---

# 20. TERRAIN CONTACT

Use the unchanged 0.50 m MatterWorld direction from U4D.

At least the foundation/anchor child must make measured terrain contact.

Use the U4D concepts:

- terrain surface estimate;
- positive-solid child/world overlap check;
- world hash/revision check.

Do not refine the world.

Do not stitch child mesh into terrain mesh.

Do not carve a socket into terrain merely to make the formation fit unless the recipe explicitly represents a later world operation—which U4E does not need.

Prefer fitting the foundation pose to existing terrain.

---

# 21. REJECTION / REGENERATION

Some deterministic candidate layouts may fail.

A candidate can be rejected for:

- unresolved solid overlap;
- insufficient contact;
- disconnected contact graph;
- clearly floating stone;
- impossible placement within bounded adjustment;
- degenerate hierarchy;
- unacceptable source shape.

Use deterministic bounded regeneration/subseed progression.

Do not loop indefinitely.

Record:

- attempted candidate count;
- rejection reason;
- final accepted child descriptors.

Put a hard attempt ceiling in configuration.

A seed that exhausts its bounded attempts is an honest formation-generation failure, not permission for an unbounded search.

---

# 22. 20-SEED GALLERY

Generate at least **20 deterministic final formation seeds**.

The gallery must demonstrate meaningful variation in:

- silhouette;
- width/height ratio;
- child count;
- dominant direction;
- mass hierarchy;
- cap/shoulder arrangement;
- negative space;
- source geometry;
- composition.

Do NOT count as meaningful diversity:

- rotating essentially the same formation;
- changing only tint;
- translating children slightly;
- changing only random source seed while all sources look nearly identical.

Record every gallery formation's:

- formation seed;
- archetype;
- child count;
- child IDs;
- child source archetypes/seeds;
- source geometry hashes;
- child spacings;
- dimensions;
- contact graph hash;
- formation bounds/aspect ratios.

---

# 23. SOURCE REUSE / SHAPE-VARIATION DIAGNOSTICS

Track across the gallery:

- total children;
- unique source geometry hashes;
- repeated source hashes;
- repeated source within one formation;
- source-archetype frequencies;
- recipe/proportion ranges.

No accepted formation should contain two exact same source geometry hashes unless an explicit test fixture intentionally does so.

Across the 20-seed gallery, exact source reuse should be rare.

However:

**hash uniqueness alone is NOT proof of visual variety.**

Independent visual review must still determine whether stones actually look meaningfully different.

---

# 24. VISUAL TARGET — LOCKED IN THIS PROMPT

`UNITY_U4E_FORMATION_PLAN.md` refers to `ROCK_FORMATION_TARGET.md`, but that referenced document is absent from current `main`.

Do not create a new target during implementation and then use it to move the goalposts.

Use this fixed visual target:

A successful formation should read like an authored stylized environment asset made from several individual stones.

It should show:

- strong overall silhouette;
- clear large / medium / small hierarchy;
- individual stones readable as stones;
- broad deliberate faces;
- rounded/beveled edges;
- controlled asymmetry;
- varied orientation;
- believable interlocking/stacking;
- occasional meaningful gaps/recesses;
- useful negative space;
- no floating pieces;
- no pile of identical copies;
- no fused metaball/clast language;
- no obvious uniform random scatter;
- no tiny-rock noise used to disguise weak large forms.

Individual stones should retain the accepted U4C2 single-shell sculpted quality.

The overall composition must improve on U4/U4B's repeated/fused formation language.

---

# 25. MATERIAL / PRESENTATION SCOPE

Do not make U4E another material phase.

Reuse the existing projected/rest-space rock-material direction.

Use consistent lighting/camera/material treatment across the gallery.

Subtle deterministic per-stone tint/roughness variation is acceptable.

Do not use dramatic material variation to disguise repeated geometry.

Include neutral/readable captures where silhouette and stone boundaries are easy to judge.

---

# 26. HERO EVIDENCE

From the 20-seed gallery, automatically/select deterministically 4–6 useful hero formations that show different structural families.

Capture:

- primary beauty angle;
- alternate angle.

For at least 3 heroes, capture clearly different second angles.

Do not select only the best-looking formation repeatedly.

Also identify and capture the **weakest / most questionable** accepted seeds so the review is not cherry-picked.

---

# 27. DOMAIN-BOUNDARY DEBUG EVIDENCE

Provide at least one formation debug capture showing:

- separate MatterDomain bounds;
- child IDs/slot labels if practical;
- 0.25 vs 0.125 children;
- separate domain meshes.

The image must make it obvious that the formation is not one fused matter volume.

---

# 28. CONTACT-GRAPH DEBUG EVIDENCE

Provide at least one readable graph/debug capture for a representative formation.

Show:

- terrain anchor;
- domain nodes;
- measured edges;
- optionally contact witness points.

The visual debug layer must be diagnostic only.

No physics behavior.

---

# 29. PRISTINE FORMATION PERSISTENCE PROOF

U4E does not implement the production journal/checkpoint system.

It **does** need to prove compact deterministic pristine regeneration.

Create a small pristine formation descriptor containing approximately:

- formation recipe/schema version;
- formation seed;
- formation archetype if not seed-derived;
- root pose;
- any truly necessary stable generator/version identifiers.

Do NOT store:

- density arrays;
- material arrays;
- Base64 matter payload;
- source vertices;
- source triangle indices;
- Surface Nets vertices;
- Unity Mesh data.

Destroy the runtime formation.

Regenerate from the serialized descriptor alone.

Verify exact equality for:

- child IDs;
- source-recipe identity/hash;
- source geometry hashes;
- MatterDomain content hashes;
- sample spacing;
- child poses after deterministic fitting;
- mesh hashes;
- contact graph;
- formation summary hash.

Record serialized descriptor bytes.

For the representative formation, descriptor size should be dramatically smaller than total raw matter data.

As a qualification guardrail:

```text
descriptor encoded bytes
<
10% of total child raw density/material bytes
```

If not, document why and HOLD the compact-regeneration claim.

---

# 30. FORMATION HASH / RECEIPT IDENTITY

Create deterministic summary hashes where useful.

A formation summary hash should cover stable logical state such as:

- recipe version;
- formation seed;
- child stable IDs;
- source recipe/hash;
- MatterDomain content hash;
- spacing;
- quantized local pose;
- measured accepted contact graph.

Do not include:

- transient GameObject instance IDs;
- timestamps;
- performance timings;
- file paths.

Regeneration should reproduce the same stable formation hash.

---

# 31. ONE-CHILD EDIT PROOF

Choose a representative formation containing at least 4 children.

Prefer editing a 0.125 m child that spans multiple meshing regions.

Record before edit:

- world content hash/revision;
- every child content hash/revision;
- every child mesh hash;
- every child's regional mesh hashes;
- contact graph/pair measurements.

Perform one bounded sphere subtraction on exactly one child.

Use the normal `MatterDomain` edit API.

Remesh using the returned changed sample list.

Require:

- edited child's content revision advances;
- changed samples > 0;
- only edited child MatterDomain changes;
- sibling content hashes unchanged;
- sibling mesh hashes unchanged;
- sibling mesh revisions unchanged;
- world content hash/revision unchanged;
- edited child uses bounded regional remeshing;
- if the chosen domain has unaffected regions, demonstrate region reuse.

Do not rebuild every formation child.

---

# 32. CONTACT DIRTY-SET PROOF AFTER EDIT

The edit may invalidate contacts involving the edited child.

Treat contact dependencies separately from mesh dependencies.

After the edit:

```text
dirty contact pairs =
    terrain ↔ edited child
    +
    edited child ↔ each sibling
```

Pairs involving two untouched siblings should remain reusable.

Prove/report:

- total possible pair measurements;
- contact pairs recomputed;
- untouched pair measurements reused;
- resulting graph.

It is acceptable if the edited child loses a contact edge.

Do NOT implement collapse based on that loss.

The point is bounded invalidation.

---

# 33. NO WHOLE-FORMATION AUTHORITY

The formation recipe/manager is composition metadata.

It must not become a second copy of authoritative stone matter.

Each child `MatterDomain` remains authoritative for its own matter.

Do not create a duplicate “formation voxel field”.

Do not make the combined render mesh authoritative.

---

# 34. PERFORMANCE / MEMORY EVIDENCE

For at least one representative formation record:

### Formation

- child count;
- number of 0.25 children;
- number of 0.125 children;
- total samples;
- total occupied samples;
- total raw density/material bytes;
- total mesh vertices;
- total mesh triangles.

### Generation

- recipe generation time;
- source-generation time;
- SDF bake time;
- domain-copy time;
- initial meshing time;
- contact-fitting time;
- total formation construction time.

### Contact

- pair candidates tested;
- fitting iterations;
- rejected candidates;
- contact-probe time;
- graph-build time.

### Edit

- changed samples;
- direct regions;
- rebuilt regions;
- reused regions;
- remesh CPU/wall;
- Unity mesh publication;
- edit-to-visible observation;
- contact pairs recomputed/reused.

### Persistence

- pristine descriptor bytes;
- total raw matter bytes represented;
- regeneration time.

Keep Editor observations separate from Player observations.

These are qualification measurements, not production budgets.

Do not invent a production FPS requirement.

---

# 35. EXPECTED COST / BOUNDEDNESS

Current U4D evidence shows that high-resolution true-SDF source baking is not free.

Therefore keep U4E bounded:

- use 0.25 m for ordinary children;
- reserve 0.125 m for selected important children;
- cache/reuse generated results during one evidence pass where doing so does not invalidate determinism tests;
- do not generate hundreds of unnecessary hero variants;
- do not run 0.0625 m.

Performance optimization itself is not this phase.

---

# 36. ENGINE-LIGHT TESTS

Add focused EditMode coverage for at least:

## Recipe determinism

Same version/seed:

- same formation archetype;
- same semantic slots;
- same source seeds;
- same U4E variant recipes;
- same spacings;
- same initial relation descriptors.

## Stable IDs

- regeneration gives identical IDs;
- IDs are slot-based, not random;
- changing pose does not alter ID.

## U4C2 regression

Existing fixed-seed `SculptedStoneGenerator.Generate()` outputs/hashes remain unchanged.

## Source variation

Different U4E seeds produce actual different source recipe/geometry hashes.

## Matter generation

Each child source can bake into an independent MatterDomain.

## Contact fitting

Known controlled fixtures:

- separated pair;
- near-contact pair;
- overlapping pair.

Probe/fitter must distinguish them correctly.

## Double ownership

The accepted test formation has zero positive-solid sampled sibling overlap.

## Contact graph

- edges derive from measured geometry;
- final accepted graph is connected to terrain.

## Mixed resolution

At least one 0.25↔0.125 contact fixture.

## Regeneration

Descriptor round trip reproduces the same stable formation result.

## Local edit

One-child carve changes only that child.

## Regional remesh

Changed child uses existing U4D bounded remesh behavior.

## Contact invalidation

Only incident pairs become dirty.

---

# 37. EXISTING REGRESSION SUITES

Before implementation, run enough existing Unity tests to prove the starting baseline is green.

After implementation:

### Focused U4E EditMode

All pass.

### Full EditMode

All pass.

The pre-U4E baseline is 153 passing EditMode tests.

The final total should therefore be at least that many and all passing.

### PlayMode

All existing + new relevant PlayMode tests pass.

Do not delete/disable tests to get green.

### Browser validation

Do not modify the browser implementation for U4E.

If no shared/browser production files changed, ordinary browser `npm test` / `npm run verify` are not required by this native phase.

If browser/shared files somehow become necessary, explain why and run their normal validation.

Prefer not touching them.

---

# 38. PLAYMODE / RUNTIME PROOF

Add at least one U4E PlayMode qualification proving the Unity runtime can:

- instantiate a deterministic formation;
- contain several distinct child MatterDomains;
- retain stable IDs;
- generate visible meshes;
- expose measured contact graph;
- destroy and regenerate a pristine formation descriptor or otherwise exercise the regeneration path.

Do not use EditMode-only proof for all runtime claims.

---

# 39. WINDOWS X64 DEVELOPMENT PLAYER

Create/use an isolated reproducible U4E tech scene.

Suggested:

```text
Assets/Wildkin/Scenes/Tech/U4EMultiDomainFormation.unity
```

Build a Windows x64 Development Player using the established agent-driven Unity workflow.

The standalone Player must:

- launch successfully;
- generate at least one representative multi-domain formation;
- clearly display its independent stone composition;
- preserve terrain contact;
- exit cleanly;
- write a machine-readable Player receipt;
- capture a screenshot.

Do not require manual Inspector configuration.

Record:

- Unity version;
- build errors;
- build warnings;
- output size;
- process exit code.

---

# 40. AGENT / EDITOR TOOLING

Provide reproducible bounded commands equivalent to:

```text
generate formation seed
inspect formation
generate 20-seed gallery
capture hero
inspect child domain
inspect contact graph
perform one-child edit
regenerate pristine descriptor
export final evidence
build/run Player
```

Follow the existing Unity CLI/Pipeline pattern already used by U4D.

Do not introduce another editor-control framework.

---

# 41. EVIDENCE DIRECTORY

Use:

```text
native/evidence/unity/u4e-multi-domain-formations/
```

Do not modify U4D/U4C evidence.

Recommended contents:

```text
README.md
receipt.json
review.md

tests/
  focused.json
  editmode.json
  playmode.json

metrics/
  gallery.json
  representative-formation.json
  edit.json
  persistence.json

contact/
  representative-graph.json
  edited-graph.json

persistence/
  pristine-descriptor.json
  regenerated-summary.json

captures/
  gallery-20.png
  heroes/
  alternate/
  weakest/
  domain-boundaries.png
  contact-graph.png
  edit-before.png
  edit-after.png
  regenerated.png

player/
  build-provenance.json
  receipt.json
  capture.png
```

Names may vary slightly, but evidence must remain easy to inspect.

---

# 42. 20-SEED CONTACT SHEET

Automatically produce one board containing all 20 final seeds.

Each tile should display enough metadata to identify:

- seed;
- archetype;
- child count.

Do not clutter it with paragraphs.

Use matched:

- camera;
- lighting;
- framing rules;
- material treatment.

Fit each formation to frame based on bounds rather than using fixed camera distance that makes large/small formations incomparable.

---

# 43. INDEPENDENT READ-ONLY REVIEW

After implementation/evidence capture, use an independent reviewer agent if available.

The reviewer must not have implemented the formation code.

Provide it:

- this fixed prompt;
- 20-seed gallery;
- hero/alternate views;
- weakest-seed views;
- domain-boundary debug;
- contact graph;
- receipt;
- relevant code/tests.

It should independently assess:

### Visual

- authored-looking formation?
- meaningful silhouette diversity?
- large/medium/small hierarchy?
- individual stones still good?
- repeated-copy look?
- fused-clast regression?
- floating or weakly supported children?
- useful negative space?

### Technical

- independent MatterDomains?
- deterministic IDs?
- geometry-derived contacts?
- overlap evidence credible?
- mixed spacing?
- one-child isolation?
- recipe-only regeneration?
- U4C3 scope correctly preserved?

Record the review verbatim or faithfully in:

`native/evidence/unity/u4e-multi-domain-formations/review.md`

The implementer must not silently rewrite a negative review into PASS.

The external owner/ChatGPT review after push remains the final admission gate.

---

# 44. BOUNDED SAME-PHASE REMEDIATION

One focused remediation pass is allowed if the independent review finds a clearly bounded U4E-specific issue such as:

- source variation too weak;
- hierarchy range too narrow;
- contact fitter leaving visible gaps;
- repeated composition relationship;
- debug/evidence deficiency.

A remediation may change U4E code/parameters.

It must not:

- replace Surface Nets;
- modify U4C3 topology;
- add physics;
- union the formation into one SDF;
- start U5;
- become an open-ended art loop.

After remediation, regenerate the complete relevant evidence and rerun tests.

If essentially the same visual/architectural blocker remains after that focused repair:

**HOLD. STOP.**

---

# 45. PASS CRITERIA

U4E is a candidate for PASS only if all of the following are true.

## Architecture

- formation contains several independent MatterDomains;
- no fused formation authority exists;
- source meshes are generation input only;
- U4C2 baseline generator outputs remain unchanged.

## Determinism

- recipe generation deterministic;
- stable child IDs deterministic;
- pristine descriptor regeneration deterministic;
- child matter/mesh/contact hashes reproduce.

## Source variation

- child source geometry genuinely varies;
- variation is not transforms/material alone;
- no obvious tiny fixed model library read.

## Composition

- at least 20 deterministic final formation seeds;
- meaningful overall silhouette diversity;
- large/medium/small hierarchy;
- multiple strong formation archetypes;
- no obvious floating pieces;
- no fused-clast regression.

## Contact

- fitting is geometry-derived;
- graph edges are measured, not recipe assertions;
- final graph for every accepted formation is connected to terrain;
- zero sampled positive-solid double ownership between sibling domains;
- zero sampled positive-solid foundation/world overlap;
- visible contacts do not show obvious floating gaps.

## Resolution

- ordinary 0.25 m children work;
- selected 0.125 m children work;
- actual 0.25↔0.125 sibling contact is demonstrated.

## Editing

- one child edits/remeshes;
- sibling/world authority remains unchanged;
- regional mesh reuse remains bounded;
- contact dirty set is limited to edited-child incident pairs.

## Persistence direction

- pristine formation descriptor contains no dense sample/mesh data;
- round-trip regeneration matches stable authority;
- descriptor is <10% of represented raw child matter bytes.

## Evidence

- gallery;
- heroes;
- alternate angles;
- weakest seeds;
- domain boundaries;
- contact graph;
- edit before/after;
- Player capture;
- machine receipts.

## Validation

- focused tests all pass;
- full EditMode all pass;
- PlayMode all pass;
- Windows x64 Development build passes;
- Player executes/exits successfully.

---

# 46. HOLD CONDITIONS

U4E is HOLD if any important condition remains, including:

- formations still look like random repeated copies;
- source hashes vary but stones still visually look essentially identical;
- formation silhouettes differ mainly by rotation;
- physically convincing composition requires meaningful hidden overlap;
- a child visibly floats while the graph calls it supported;
- contact fitting is unstable/non-deterministic;
- contact graph is recipe-authored rather than geometry-derived;
- some accepted formations are disconnected from terrain;
- independent domains cannot read visually as one formation;
- whole formation must be fused to look acceptable;
- child edits disturb sibling matter;
- regeneration does not reproduce stable results;
- U4C2 accepted source hashes regress;
- tests/build fail;
- topology claims exceed U4C3 evidence;
- runtime/domain architecture becomes obviously impractical.

A HOLD is a valid experimental result.

Do not force PASS.

---

# 47. ALLOWED FINAL DISPOSITIONS

Use one of:

```text
U4E_MULTI_DOMAIN_FORMATION_CANDIDATE
```

when all implementation gates appear satisfied and the checkpoint is ready for owner/ChatGPT independent review.

or:

```text
U4E_MULTI_DOMAIN_FORMATION_HOLD
```

when a material blocker remains.

Do not self-declare final production acceptance.

Do not change Unity's overall engine selection from provisional/candidate based solely on U4E.

---

# 48. DOCUMENTATION

Update relevant current-state documentation only after evidence is final.

Likely:

```text
docs/CURRENT_SLICE.md
docs/SESSION_START.md
docs/CODE_MAP.md
docs/BUILD_LOG.md
docs/UNITY_FIRST_TRANSITION_PLAN.md
docs/UNITY_U4E_FORMATION_PLAN.md
docs/LOCAL_MATTER_DOMAINS.md
docs/SOURCE_GEOMETRY_MATTER_FIDELITY_PLAN.md
```

Update only what U4E actually established.

Do not rewrite historical U4/U4B/U4C/U4C2/U4C3/U4D findings.

Carry the U4C3 topology limitation explicitly.

Do not document U5 as implemented.

Save a copy of this implementation brief under an appropriate new prompt path, for example:

```text
docs/prompts/UNITY_07E_PROCEDURAL_MULTI_DOMAIN_FORMATIONS.md
```

if the exact prompt does not already exist.

---

# 49. GIT CLOSURE

Before staging:

```bash
git status --short
```

Compare against the recorded initial working-tree state.

Stage only intended U4E:

- code;
- tests;
- scene/tooling;
- U4E evidence;
- prompt;
- documentation.

Do not stage unrelated pre-existing work.

Review:

```bash
git diff --cached --stat
git diff --cached
```

The checkpoint should be cohesive and reviewable.

Suggested commit message:

```text
Implement Unity U4E multi-domain formation qualification [skip ci]
```

A technically complete honest HOLD checkpoint may still be committed/pushed so the owner/ChatGPT reviewer can inspect the actual experiment and evidence.

Do **not** commit a broken/incomplete working tree merely to create a checkpoint.

Push directly to:

```text
origin/main
```

as required by the project's locked workflow.

Verify:

```bash
git rev-parse HEAD
git rev-parse origin/main
```

They must match after push.

Then STOP.

---

# 50. FINAL LUNA RESPONSE

Return a concise structured report containing:

```text
U4E RESULT:
U4E_MULTI_DOMAIN_FORMATION_CANDIDATE
or
U4E_MULTI_DOMAIN_FORMATION_HOLD

STARTING ORIGIN/MAIN:
<sha>

COMMIT:
<sha>

FORMATION ARCHITECTURE:
- recipe/version
- archetypes
- child count range
- stable ID method
- source variation method

SOURCE REGRESSION:
- U4C2 fixed source hashes unchanged?
- result

GALLERY:
- seeds generated
- archetype distribution
- child-count distribution
- total/unique source geometry hashes
- visual-review result

RESOLUTION:
- 0.25 child count
- 0.125 child count
- mixed-resolution contact proof

CONTACT:
- fitting method
- tolerance
- overlap diagnostic
- rejected candidates
- connected-to-terrain result

REPRESENTATIVE FORMATION:
- children
- samples
- raw matter bytes
- vertices/triangles
- formation build time
- contact-fit time

EDIT PROOF:
- edited child ID
- changed samples
- direct regions
- rebuilt regions
- reused regions
- siblings/world unchanged?
- contact pairs recomputed/reused

PRISTINE REGENERATION:
- descriptor bytes
- represented raw matter bytes
- child IDs match?
- content hashes match?
- mesh hashes match?
- contact graph hash match?
- formation hash match?

TOPOLOGY:
- U4C3 scope retained
- any new topology issue

TESTS:
- focused
- full EditMode
- PlayMode

WINDOWS BUILD / PLAYER:
- build
- warnings/errors
- exit code
- receipt/capture

INDEPENDENT REVIEW:
- visual
- technical
- weakest formations
- any remediation used

EVIDENCE:
native/evidence/unity/u4e-multi-domain-formations/

UNRELATED LOCAL WORK:
- preserved status

KNOWN LIMITATIONS:
...

NEXT RECOMMENDATION:
U5 candidate
or
focused U4E remediation/HOLD

STOP FOR OWNER / CHATGPT REVIEW.
```

Do not begin U5 after writing the response.