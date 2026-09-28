# Local matter domains — multi-resolution object hypothesis

**Status, September 28, 2026:** independent read-only review assigns `LOCAL_DOMAIN_0_125_PASS` within the documented U4D qualification scope. A bounded Unity prototype demonstrates separate editable 0.25 m and 0.125 m dense local domains beside unchanged 0.50 m world terrain, without adaptive terrain stitching. Focused EditMode passes 11/11, full EditMode 153/153, PlayMode 2/2, and the Windows x64 Development Player exits 0. This is qualification evidence, not production authority or a world-scale memory result. See the [U4D report and receipt](../native/evidence/unity/u4d-local-matter-domain/README.md) and [independent review](../native/evidence/unity/u4d-local-matter-domain/review.md).

## Problem

Wildkin needs very different spatial detail at different scales:

- broad terrain can tolerate coarse matter spacing;
- individual rocks need sharper faces/corners;
- tree trunks/roots may need significantly finer cuts;
- tiny vegetation often should not be volumetric at all.

A single global sample spacing forces a bad tradeoff:

- coarse enough for a large world → props look soft;
- fine enough for good rocks → world memory and edit cost explode.

The current U3 mixed-resolution brick experiment also leaves a real transition problem when 0.50 m and 0.25 m cells share one continuous terrain surface.

## Hypothesis

Use **multiple matter domains with independent sample spacing** rather than requiring every detailed object to be part of one adaptive world grid.

Example:

```
WorldTerrainDomain
  spacing = 0.50 m

RockDomain A
  spacing = 0.125 m

RockDomain B
  spacing = 0.125 m

TreeTrunkDomain
  spacing = 0.125 m

MatterActorDomain
  inherits the detached object's local spacing
```

Each domain owns its own scalar/material field and local coordinate frame.

## Why this is attractive

A high-resolution rock can sit on coarse terrain without requiring a 0.50→0.125 topological transition inside one mesh.

This resembles normal terrain + prop composition, except the prop remains authoritative destructible matter.

Potential benefits:

- much higher local fidelity;
- bounded memory per detailed object;
- no whole-world high-resolution grid;
- detached pieces naturally remain local volumes;
- object generation can begin from source meshes/SDFs;
- local destruction/remeshing touches only the object domain.

## Domain responsibilities

The U4D prototype `MatterDomain` owns:

- stable ID;
- local integer sample coordinates;
- sample spacing;
- local origin/transform;
- density;
- resolved material;
- bounded dense density/material arrays;
- edit revision;
- local Surface Nets products partitioned into logical regions;
- persistence record.

U4D keeps integer local sample addresses authoritative and stores spacing and a position/rotation transform per domain. The source mesh is used only by a generic read-only matter-grid bake boundary; the baked domain remains editable and source-independent. Collision products, sparse/world-scale residency, and production ownership are not part of this prototype.

A world-terrain domain may use global coordinates/identity while object domains use local coordinates. They should still expose compatible matter queries.

## Domain is not automatically one rigid body

A static detailed rock domain may be anchored to the world.

After structural separation:

- whole domain may become one MatterActor;
- or disconnected components may split into child domains/actors.

Domain ownership and physics-body ownership must remain distinct concepts.

## Contact/support between domains

Deferred.

Likely later requirements:

- terrain↔rock contact/support;
- rock↔rock support in formations;
- tree↔terrain support;
- domain component detachment.

Support/contact may operate on a separate graph or bounded contact samples rather than forcing all domains onto one scalar lattice.

U4C/U4D must not invent a full support solver merely to prove visual fidelity.

## Overlap/conflict policy

Also deferred.

Potential generation-time rules include:

- terrain is coarse background matter;
- placed local domains carve/claim a bounded occupancy region;
- or local domains remain independent contact bodies with intentional overlap tolerance.

The correct approach depends on visual seams, mining behavior and support evidence.

Do not silently permit two authoritative materials to occupy the same gameplay volume without an explicit ownership rule.

## Rendering

Each domain can produce its own Surface Nets mesh.

Static terrain:
- world/rest-space material projection.

Object domain:
- local/rest-space material projection.

Because domains are separate meshes, different resolutions do not need to share vertices at ordinary terrain/object contact.

## Physics

Static local domains can use static collision products.

Detached local domains become MatterActors with approximate collision proxies, preserving the established rule:

```
matter authority != render mesh != physics proxy
```

## Persistence

A later production save likely stores:

- domain generator/source identity where regeneration is safe;
- accepted edits;
- transformed/detached state;
- local matter snapshot when procedural regeneration is no longer authoritative;
- stable IDs.

Removed matter must not regenerate.

## Storage

Do not infer that every domain should be one giant dense array.

Likely direction if U4C validates 0.125/0.0625 matter:

- fixed-size dense bricks internally;
- sparse set of resident bricks;
- true signed-distance narrow band around surfaces;
- material/occupancy metadata;
- optional coarse/deep-interior representation later if profiling warrants it.

## Relationship to adaptive terrain

Local domains and adaptive terrain are separate problems.

### Local-domain problem

"Can this rock/tree/ruin have more detail than terrain?"

Potential answer: yes, independent domain.

### Adaptive-terrain problem

"Can one continuous terrain surface transition between 0.50 m and 0.25 m?"

Requires explicit transition topology/LOD work.

Do not solve the second before the first needs it.

## Experiment gates

### U4C

Determine whether good source geometry survives matter conversion and at what spacing.

### U4D

U4D has passed independent read-only review within its documented scope. The scene contains 0.50 m world terrain plus independent 0.25 m and 0.125 m domains. Initial mesh clearance is approximately 2 cm; direct positive-sample checks find zero solid overlap. The 0.125 m domain's 291-sample local carve changes 2 directly affected regions, rebuilds 4 including halo neighbors, and reuses 8 of 12. A transform-only move to 45° yaw preserves matter and mesh hashes. A moved-pose world-space edit changes 174 samples at the expected local address; the former pose target is a no-op. The saved density/material snapshot reloads without source geometry or saved mesh data and deterministically rebuilds the same mesh. Other domain and world hashes remain unchanged. The conservative AABB diagnostic contains occupied world sample centers, which is reported separately from zero positive-solid sample overlap. No cross-resolution stitching is attempted. See the [U4D report](../native/evidence/unity/u4d-local-matter-domain/README.md) and [independent review](../native/evidence/unity/u4d-local-matter-domain/review.md).

This pass qualifies only the bounded domain abstraction. It does not select production storage, solve broad cross-domain material ownership/contact, or prove world-scale residency, physics, support, or collapse.

Prove:

- transforms;
- independent spacing;
- rendering;
- targeting;
- edit;
- persistence;
- no accidental duplicate authority.

### U5

Use selected domain architecture in the minimal destruction chain.

## Non-goals

This document does not authorize:

- final class/API names;
- adaptive octrees;
- Transvoxel;
- OpenVDB dependency;
- GPU voxelization;
- world streaming;
- cross-domain structural solver;
- runtime text/image-to-3D generation.
