# Wildkin Frontier — source geometry to matter fidelity route

**U4D local-domain qualification, September 28, 2026 — `LOCAL_DOMAIN_0_125_PASS` within documented scope after independent review:** a 0.50 m world coexists with separate 0.25 m and 0.125 m editable local domains. The 0.125 m domain supports local carving, transform-stable matter identity, moved-pose world-space editing, bounded regional remeshing, and source-free save/reload. Multi-domain/world isolation, approximately 2 cm initial mesh clearance, and zero positive-solid sample overlap are recorded separately from conservative padded AABB intersections; no terrain stitching/refinement was added. Focused EditMode is 11/11, full EditMode 153/153, PlayMode 2/2, and the Windows x64 Development Player builds with zero errors and exits 0. The 0.0625 m option was not tested. See [U4D evidence and receipt](../native/evidence/unity/u4d-local-matter-domain/README.md) and [independent review](../native/evidence/unity/u4d-local-matter-domain/review.md). Stop at the U4D owner gate; no U4E/U5/Unreal/production migration has begun.

**U4C3 topology checkpoint, September 28, 2026 — PASS within documented scope after independent review:** the two recorded U4C2 fine-tier nonmanifold edges are repaired by generic face-saddle-based crossing-patch identity. B/0.0625 and C/0.125 pass the genus-zero closed-manifold qualification; all 12 true-SDF matrix rows pass while source hashes and fidelity metrics remain unchanged. A named regression documents the unsupported interior class where opposite positive corners are connected along a positive trilinear body diagonal but remain separate under the face-only partition. Higher-genus surfaces and arbitrary trilinear topology are outside this evidence. See [U4C3 evidence and receipt](../native/evidence/unity/u4c3-topology-safe-surface-nets/). This topology scope carries into U4D unchanged.

**Historical U4C2 status, September 28, 2026:** source Gate A **PASS**, final **REPRESENTATION_HOLD**. The owner explicitly replaced the historical failed composite modeler with a single-shell sculpted cube-derived superquadric, macro asymmetry, shaped base and large subtractive face cuts. One bounded source adjustment passed independent review. The exact accepted meshes were converted into true-SDF local fields and the full four-spacing Surface Nets matrix; the fixed-exterior-air control loses fidelity. 0.25 m is the lowest common visual/topology baseline. C/0.125 and B/0.0625 each have a four-use nonmanifold edge even when combined by integer cell identity. Fine tiers preserve broad faces, so the feature-fidelity criterion for `REOPEN_MESHER` is not met. This was the U4C2 stop; U4C3 and later owner direction separately admitted U4D. U4E/U5/Unreal/adaptive stitching/production migration are not part of the current authorization. See [U4C2 evidence](../native/evidence/unity/u4c2-sculpted-source/), [fresh owner brief](prompts/UNITY_05C2_SCULPTED_STONE_SOURCE.md), and [preserved U4C failure evidence](../native/evidence/unity/u4c-source-matter-fidelity/).

## Why the direction is changing

U4 and U4B established several useful facts:

- Unity 6.3 LTS + HDRP and the Codex/Unity workflow are functioning.
- The U2 matter authority is deterministic and testable.
- Surface Nets is a reasonable default mesher for the current scalar fields.
- 0.25 m samples improve geometric fidelity over 0.50 m but do not, by themselves, turn the U4/U4B rock generator into authored-looking rock.
- Distinct-stone and selective-union layouts improve composition somewhat, but the individual stones still lack enough authored shape language.

The next question is therefore **not** "how do we randomize the current voxel rock generator more?"

It is:

> Can Wildkin create a genuinely good procedural source rock using ordinary geometry, convert that exact shape into a signed-distance matter volume, and recover enough of the source asset through the destructive matter renderer?

This separates **shape design** from **destructible storage**.

## Working architectural principle

**Voxels/matter are the destructible representation, not necessarily the shape-design language.**

Potential production flow:

```
procedural geometry recipe
        ↓
high-quality continuous/source mesh
        ↓
signed-distance sampling / local matter volume
        ↓
destructible authoritative matter
        ↓
Surface Nets (or later feature-aware mesher if evidence requires)
        ↓
stylized material
```

The source mesh is generation input. After conversion, runtime mining/destruction must target the matter volume, not the original source mesh.

## Important scalar-field concern from U4/U4B

The existing resolved-rock path uses an air-backed matter world. The U4 implementation writes occupied positive-density matter into that world while the untouched exterior comes from a fixed negative-air density. That is sufficient for occupancy/destruction experiments, but it may discard useful signed-distance information outside the surface and reduce edge-intersection fidelity.

U4C must explicitly distinguish:

1. **occupancy-like / clipped scalar encoding** — historical control;
2. **true signed-distance encoding** — preserve signed distance on both sides of the surface, at least through a bounded narrow band or dense local volume.

Do not assume smaller cell size is the only variable.

## Phase sequence

### U4C — source geometry → matter fidelity

Primary question:

> At what local matter resolution and scalar encoding does a good procedural rock remain visually close enough to its source geometry?

Build three good individual source rocks first. Do not begin voxelization until the direct meshes meet the visual gate.

Then compare the same source shapes through matter at:

- 0.50 m
- 0.25 m
- 0.125 m
- 0.0625 m

Use true signed-distance samples and Surface Nets. Keep one bounded occupancy-style control to measure the effect of the scalar encoding itself.

Required output:

```
SOURCE MESH | 0.50 | 0.25 | 0.125 | 0.0625
```

for the same camera, scale, lighting and material.

Decision:

- minimum acceptable matter resolution;
- whether true SDF materially improves reconstruction;
- whether Surface Nets remains sufficient at useful resolution;
- approximate memory/mesh/update cost.

### U4D — local matter domain proof

Only if U4C identifies a practical high-resolution representation.

**September 28, 2026 execution:** the owner authorized this bounded phase after accepting U4C3. Implementation and automated gates are complete; `LOCAL_DOMAIN_0_125_PASS` remains a candidate until independent read-only review. The local domain is an editable dense bounded sample authority initialized through a generic read-only matter-grid/SDF boundary, not a production-scale storage claim. It runs beside the unchanged 0.50 m world and a 0.25 m sibling domain. Detailed findings, Player/Editor measurements, tests, and the exact U4C3 topology limitation are recorded in the [U4D evidence report](../native/evidence/unity/u4d-local-matter-domain/README.md). U4E and all later work remain stopped for owner review.

Primary question:

> Can a 0.125 m or similar local matter object coexist with 0.50 m terrain without forcing the entire terrain grid to refine or requiring immediate coarse/fine topology stitching?

Prototype an object-local `MatterDomain`:

- local integer sample coordinates;
- local origin/transform;
- independent sample spacing;
- density + material;
- bounded sparse/dense brick storage;
- local edits;
- serialization;
- Surface Nets output;
- placement on coarse terrain.

The initial proof does **not** need adaptive terrain stitching. A detailed rock can remain its own matter domain, analogous to a destructible prop whose authority is volumetric.

### U4E — procedural formation from high-quality matter stones

Only after individual-rock fidelity and local-domain viability are known.

Compose several high-quality local matter stones into a procedural formation. The formation recipe controls:

- count;
- scale hierarchy;
- orientation;
- support/contact;
- archetype;
- gaps/recesses.

Do not melt the entire formation into one SDF unless an archetype explicitly requires it.

This is where 20-seed family diversity becomes useful again.

### U5 — minimal destruction vertical slice

Resume U5 after the representation is no longer ambiguous.

A useful U5 candidate should exercise both:

- coarse world terrain matter;
- one high-resolution local rock/matter domain.

Then prove:

edit → support loss → world/local ownership transfer as appropriate → physics → moved edit → save/reload.

## Source-rock modeling method for U4C

**Historical method below — negative evidence, not the active recommendation.** The owner rejected further tuning of the half-space component assembly. U4C2 instead models one connected manifold stone per recipe with welded subdivided cube topology, superquadric projection, anisotropic scale, lean/taper/skew/twist, asymmetric quadrants, contact-base shaping, and three subtractive cuts through that existing shell. Separate-stone formation composition belongs to U4E. The preserved plan below explains the original U4C experiment, not authorization to resume it.

The source shape should be generated using a **procedural modeling** algorithm rather than the current rounded implicit primitives.

Recommended bounded method:

### Half-space / plane-cut convex rock

Start with a bounded oriented volume and define a deterministic set of planes.

Typical recipe:

1. six broad extent planes establish size;
2. perturb plane normals/distances for asymmetry;
3. add 3–8 diagonal/corner-cut planes;
4. optionally add a flattened contact/base plane;
5. derive mesh vertices from triple-plane intersections inside every half-space;
6. construct each polygonal face from vertices lying on that plane;
7. triangulate faces deterministically;
8. optionally introduce limited chamfer-like extra planes around selected corners/edges;
9. apply only very low-amplitude large-scale deformation if needed.

This naturally creates:

- broad polygonal faces;
- irregular face sizes;
- real edges;
- blocky/slab-like rocks;
- no metaball/smooth-union language.

U4C needs only enough procedural control to create **three strong individual stones**, not a complete final rock generator.

Possible source archetypes:

- broad slab/capstone;
- chunky irregular boulder;
- tall/wedge/buttress stone.

## Source mesh acceptance gate

The direct source mesh must pass before conversion is judged.

PASS-quality source geometry should show:

- deliberate broad faces;
- readable asymmetry;
- unequal corners;
- convincing bevel/chamfer treatment;
- clear silhouette;
- no obvious cube;
- no sphere/metaball read;
- useful second angle.

If the source mesh itself is poor, repair the source modeler. Do not blame the matter converter.

## Mesh → signed-distance matter conversion

U4C should implement a bounded mesh-to-SDF sampler.

For each local sample point:

1. compute nearest distance to source triangles;
2. determine inside/outside robustly;
3. store signed distance with the project's convention (positive solid / non-positive air);
4. assign Rock material to positive samples and Air to non-positive samples;
5. retain signed values on both sides of the surface, not just binary occupancy.

For the experiment, a simple CPU implementation is acceptable if bounded.

Suggested inside/outside approach:

- deterministic ray parity with an epsilon/secondary-axis fallback around edge/vertex ambiguity;
- tests for points on/near faces, edges and corners.

Suggested distance:

- point-to-triangle closest distance;
- source meshes should stay low/moderate triangle count, so brute-force sampling may be acceptable for the first three rocks;
- add a simple triangle AABB/BVH only if 0.0625 m becomes impractically slow.

## Local signed-distance volume

Do not fill the global U2 `MatterWorld` dictionary with hundreds of thousands of exact air-distance overrides merely to preserve an SDF.

U4C may introduce an **experimental bounded local scalar field**, e.g. `MatterLocalVolume` or equivalent:

- local sample origin;
- dimensions;
- sample spacing;
- contiguous density array;
- contiguous material array;
- exact signed distances;
- no GameObject-per-sample;
- deterministic indexing.

This is an experiment toward the later MatterDomain abstraction.

Keep it isolated from global production ownership semantics until U4D.

Ideally generalize the mesher input behind a small read-only sample-grid contract so both:

- U2/U3 world snapshots;
- U4C local volumes

can use the same Surface Nets kernel without copying the algorithm.

## Fidelity metrics

Visual evidence is primary, but record quantitative reconstruction diagnostics.

At minimum:

- source vertex/triangle count;
- local volume dimensions;
- total samples;
- occupied samples;
- raw density/material bytes;
- voxelization/SDF sampling time;
- Surface Nets time;
- reconstructed vertex/triangle count.

Add bounded geometric error metrics if practical:

### reconstructed → source

Evaluate the exact source-mesh signed distance at every reconstructed Surface Nets vertex.

Record:

- median absolute distance;
- p95;
- max.

### source → sampled field

For each source vertex and a deterministic set of triangle surface samples, trilinearly sample the local matter SDF.

Record absolute field error from zero:

- median;
- p95;
- max.

These are more useful than comparing only triangle counts.

## Resolution matrix

For each accepted source rock:

- source mesh;
- 0.50 m true-SDF matter;
- 0.25 m true-SDF matter;
- 0.125 m true-SDF matter;
- 0.0625 m true-SDF matter.

For at least one hero rock additionally compare:

- historical occupancy/clipped-style encoding at 0.25 m or 0.125 m;
- true SDF at the same spacing.

This isolates resolution from scalar quality.

## Surface Nets decision gate

Do not reopen Dual Contouring automatically.

If source mesh is good and true-SDF reconstruction becomes acceptable at 0.125/0.0625 m, keep Surface Nets.

Reopen a feature-preserving mesher only if:

- source mesh is good;
- signed-distance sampling is good;
- fine enough resolution is practical;
- Surface Nets still visibly destroys important planar/corner structure.

If reopened, compare Surface Nets and DC **on the same source-derived true SDF**, not the older procedural fixture fields.

## Multi-resolution architecture hypothesis

There are two different problems and they should not be conflated.

### A. Local object domains — preferred near-term path

Examples:

- individual rocks;
- trees/trunks;
- ruins;
- ore bodies;
- large alien flora.

Each can have:

- its own sample spacing;
- local transform;
- local matter authority.

A 0.125 m rock can sit on 0.50 m terrain without sharing one adaptive mesh grid.

### B. Adaptive terrain refinement — later problem

Examples:

- one terrain cliff transitioning from 0.50 m to 0.25 m;
- player-generated highly detailed terrain region.

This requires real cross-resolution topology/transition work and remains deferred until evidence says it is necessary.

Do not solve B just to prove A.

## Storage direction if 0.125/0.0625 is viable

A full dense world at these resolutions is not viable.

Likely production direction:

- fixed-size dense bricks internally;
- sparse residency around occupied/edited matter;
- object-local domains;
- optional narrow-band SDF storage where full interior distance is unnecessary;
- coarse representation for deep solid interiors if later profiling justifies it.

OpenVDB-like sparse level-set ideas are useful conceptual references, but no OpenVDB dependency is authorized by this plan.

## Generative-3D lesson

Runtime text/image-to-3D generation is **not** part of U4C.

The transferable architectural lesson is:

> use a rich shape-generation representation first, then convert/decode it into the runtime representation.

Potential later offline workflow:

```
AI-generated / artist-generated source assets
        ↓
offline analysis or mesh-to-matter conversion
        ↓
extract procedural shape statistics / recipes
        ↓
runtime deterministic generator
```

Possible later uses:

- generate reference rock families offline;
- analyze face-count, aspect-ratio, bevel, silhouette and mass-hierarchy distributions;
- seed or fit procedural generator parameters;
- precompute many source recipes at build time.

Do not add a generative model to the shipping runtime for this experiment.

## U4C decision table

### Outcome A — source good, 0.125 m good

Preferred result.

Proceed to U4D with ~0.125 m object-local matter as the initial candidate.

### Outcome B — source good, only 0.0625 m good

Measure memory/update cost carefully.

Proceed to U4D only if sparse/local storage makes it plausible.

Otherwise investigate whether feature-preserving extraction can reduce the resolution requirement.

### Outcome C — source good, even 0.0625 m poor

Do not shrink voxels further blindly.

Investigate:

- signed-distance implementation;
- Surface Nets feature loss;
- normals/shading;
- Dual Contouring or another feature-aware mesher on the same field.

### Outcome D — source mesh itself poor

Stop.

Improve the procedural modeler before drawing any matter-system conclusion.

### Outcome E — true SDF dramatically beats occupancy-like field at same spacing

Make signed-distance preservation a production requirement for detailed matter domains.

## Performance philosophy

U4C is a fidelity experiment, not a world-scale benchmark.

Still record enough cost to reject absurd choices.

Separate:

- source recipe generation;
- source mesh generation;
- SDF sampling;
- local volume allocation;
- Surface Nets generation;
- MeshData publication if rendered through Unity;
- memory.

Do not infer world-scale viability from one rock.

## Evidence

Use:

`native/evidence/unity/u4c-source-matter-fidelity/`

Required visual evidence:

- direct source mesh heroes;
- source mesh wireframes;
- resolution strip for all three rocks;
- one occupancy-vs-true-SDF matched comparison;
- close-up of planar face/corner preservation;
- simple material-neutral comparison;
- optional existing stylized material comparison after geometry is judged.

Required machine evidence:

- receipt.json;
- source recipes/seeds;
- per-resolution metrics;
- fidelity/error metrics;
- tests;
- Windows build only if the experiment reaches a meaningful final state.

## What U4C does not do

- no 20-seed formation gallery;
- no support/collapse;
- no MatterActor;
- no physics;
- no adaptive terrain stitching;
- no infinite streaming;
- no Unreal;
- no production migration;
- no runtime AI generation;
- no paid asset/package dependency.

## Owner gate

U4C ends with one recommendation:

- `LOCAL_DOMAIN_0_125`
- `LOCAL_DOMAIN_0_0625`
- `REOPEN_MESHER`
- `SOURCE_MODELER_HOLD`
- `REPRESENTATION_HOLD`

At the U4C checkpoint, do not begin U4D or U5 until the owner reviews the evidence. The owner later reviewed U4C3 and authorized U4D; the current bounded U4D status is recorded at the top of this plan. U4E/U5 remain stopped for owner review.
