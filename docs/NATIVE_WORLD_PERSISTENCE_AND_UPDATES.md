# Native world persistence and matter-update architecture

**Status — September 28, 2026:** production-direction architecture after Unity U4D `LOCAL_DOMAIN_0_125_PASS`. This document records the preferred persistence and update model for future Unity phases. It is a design direction, not a claim that the production save/streaming system already exists.

The current U4D `MatterDomainSaveCodec` is a qualification snapshot: JSON plus Base64 containing every density/material sample in a bounded dense domain. It proves source-free reload and deterministic remeshing. It is **not** the recommended world-scale save format.

## Goals

Wildkin needs to support:

- a large deterministic procedural world;
- permanent terrain edits;
- 0.50 m coarse world matter;
- 0.25 m ordinary detailed local MatterDomains;
- 0.125 m high-detail local MatterDomains;
- potentially many procedural rocks, trees, ruins and other large destructibles;
- static matter becoming dynamic MatterActors;
- save files that grow with meaningful player changes rather than with every untouched voxel;
- bounded chunk/domain update work after edits;
- future async meshing/collider publication without stale results.

The central persistence principle is:

> **Do not save the entire generated world. Save the procedural identity plus the accepted mutations needed to reproduce the player's current world, and compact those mutations into checkpoints when replay becomes inefficient.**

The central update principle is:

> **An edit dirties only the matter samples/cells/products that depend on its bounded spatial footprint. Rebuild and publish only those products, guarded by content revisions.**

---

## 1. Three different kinds of state

Keep these concepts separate.

### Procedural base

Reproducible from stable generation inputs:

- world seed;
- generator version;
- chunk/domain generation recipe;
- source asset or procedural source identity;
- source seed/parameters.

Untouched procedural matter should normally require no dense save payload.

### Accepted matter mutations

The durable changes that actually happened to matter:

- subtract sphere;
- subtract capsule/swept tool cut;
- material replacement/deposition if later supported;
- explicit consume/remove operation;
- future structural ownership transitions where an operation representation remains appropriate.

These are **accepted matter operations**, not raw player input.

Do not persist:

`PLAYER_SWUNG_PICKAXE`

as the authoritative mutation.

Persist the resolved operation, for example:

```
SUBTRACT_SPHERE
operationId
targetOwnerId
center
radius
operationVersion
bounds
```

If pickaxe balance changes in a future build, an old save must still reconstruct the world exactly as it was when the operation was accepted.

### Current-state snapshots/checkpoints

A compact representation of current authoritative matter when replaying all prior operations is no longer efficient or when the object can no longer be safely regenerated from its original procedural source.

Examples:

- heavily edited terrain brick/chunk;
- heavily mined MatterDomain;
- detached/moved MatterActor;
- split child actor;
- domain whose source recipe has been retired or migrated.

---

## 2. Preferred persistence tiers

### Tier 0 — untouched procedural content

Save only the higher-level world identity needed to regenerate it.

For terrain:

- world seed;
- generator version.

For a placed procedural rock/formation:

- formation/stamp recipe version;
- deterministic seed;
- placement transform;
- stable object/domain ID if the object exists as persistent gameplay identity.

Do **not** write the dense 0.125 m matter array merely because the rock was visible.

### Tier 1 — lightly edited procedural content

Save:

- procedural identity;
- ordered mutation journal;
- transform/state metadata.

Example:

```
RockDomain 8f2...
sourceFamily = SculptedStoneV3
sourceSeed = 92731
spacing = 0.125
pose = ...
operations:
  1042 SUBTRACT_SPHERE (...)
  1043 SUBTRACT_SPHERE (...)
  1047 SUBTRACT_CAPSULE (...)
```

On load:

1. regenerate/bake the deterministic base;
2. replay operations in sequence;
3. remesh.

This can be dramatically smaller than storing thousands of changed density samples when only a few edits have occurred.

### Tier 2 — checkpoint + recent mutation journal

When an operation journal becomes expensive, compact it.

Save:

- compact current matter checkpoint;
- checkpoint revision / last included operation ID;
- recent operations after that checkpoint;
- transform and ownership metadata.

Load:

1. load checkpoint;
2. replay recent operations only;
3. remesh/rebuild products.

This should become the normal form for long-lived heavily edited matter.

### Tier 3 — dynamic/detached persistent state

Once matter has detached, moved, split or otherwise stopped being reproducible solely from its original procedural placement, save **current state**, not a replay of the complete physics history.

Persist:

- stable actor/domain ID;
- current MatterDomain checkpoint or suitable base+delta;
- transform;
- relevant physical state required by save semantics, e.g. sleeping state and optionally velocities;
- lineage/ownership if required;
- recent matter operations after checkpoint;
- material/resource accounting state where applicable.

Do not replay:

`support removed → fell 6 m → hit wall → rotated → settled`

to reconstruct a save.

The resulting pose/matter state is authoritative.

---

## 3. Why operation journals are useful for small voxels

A detailed 0.125 m domain contains 64 times as many spatial samples per equal physical volume as a 0.50 m field.

U4D's 0.125 m boulder contains:

- 12,650 samples;
- 63,250 raw density/material bytes at the current 4-byte float + 1-byte material layout;
- 84,900 bytes in the qualification JSON/Base64 save after edits.

A single local carve changed 291 samples.

Persisting one compact mathematical operation may be much smaller than persisting hundreds of individual changed samples.

But an operation journal should **not** grow forever. Replay cost and journal bytes eventually exceed a compact checkpoint.

Therefore the preferred model is not pure event sourcing. It is:

> **procedural base + mutation journal + periodic checkpoint/compaction.**

---

## 4. Compaction policy

Do not choose one magic operation count now.

Checkpoint based on measured cost.

Possible triggers:

- operation journal encoded bytes exceed checkpoint delta bytes;
- measured replay time exceeds a load budget;
- mutation count exceeds a bounded threshold;
- changed spatial volume becomes dense;
- a matter owner detaches/moves/splits;
- generator/source version migration requires freezing current authority;
- save/autosave wants a durable compaction point.

A production compactor should be deterministic and safe to interrupt.

Conceptually:

```
base/checkpoint revision N
+
operations N+1 ... M
        ↓
build current authoritative matter
        ↓
write checkpoint M atomically
        ↓
verify/hash
        ↓
publish checkpoint metadata
        ↓
retire operations <= M
```

Never delete the old durable state before the replacement checkpoint is valid.

---

## 5. Checkpoint representation

The current U4D dense 5-byte/sample payload is useful evidence but should not be assumed as the final format.

Preferred direction:

### Fixed-size internal bricks

Use dense fixed-size bricks internally for cache-friendly runtime work.

The current qualification architecture already uses 16-cell meshing regions. Final stream/storage brick size remains an evidence-driven decision.

### Sparse persisted bricks

A checkpoint should write only bricks that differ from the procedural base or that are required by a detached/local domain.

Per-brick representations may include:

- `SAME_AS_BASE` — no payload;
- `ALL_AIR`;
- `ALL_<MATERIAL>` where scalar semantics permit;
- compressed dense scalar/material payload;
- sparse delta payload;
- narrow-band surface payload if later validated.

Do not commit to one encoding until profiling compares real saves.

### True-SDF preservation

Detailed local domains should preserve useful signed-distance information near the surface.

Do not regress to fixed negative air around every cut merely to compress storage.

A likely later optimization is a **narrow-band SDF**:

- accurate density near zero crossings;
- compact/clamped representation deep inside solid;
- absent/constant far outside;
- material metadata stored only where needed.

This is a future optimization, not yet implemented.

### General compression

After structural encoding, a general-purpose compressor may be useful.

Do not add a compression dependency yet.

Candidates can be benchmarked later. The data model should not depend on a particular compressor.

---

## 6. Generator/version identity

Operation replay is only deterministic if the procedural base is stable.

Every procedural authority that may be reconstructed from a save needs a versioned identity:

- world generator version;
- source/stamp family version;
- material/composition version where it changes scalar results;
- operation schema/version.

A save must never silently replay old operations onto a materially different generator and call that the same world.

Possible future policies:

1. retain compatibility code for old generator versions;
2. migrate old procedural bases/checkpoints explicitly;
3. freeze edited areas into checkpoints during migration.

Do not solve migration now, but version fields are required from the beginning.

---

## 7. Spatial indexing of world operations

A world operation can cross chunk/brick boundaries.

Store the operation once with:

- globally unique operation ID;
- sequence/revision;
- world-space or global-matter-space bounds;
- operation payload.

Maintain a spatial index from affected stream chunks/bricks to operation IDs.

Do not independently duplicate the authoritative operation payload in every touched chunk if that can cause double application or divergent copies.

On chunk load:

1. identify procedural base revision;
2. load the most recent relevant checkpoint if one exists;
3. query operation IDs after that checkpoint intersecting the chunk/read window;
4. apply them deterministically in sequence;
5. build current products.

Operations must be idempotently identifiable so boundary chunks cannot accidentally apply the same mutation twice to the same owner.

Local MatterDomain journals are simpler: operations are keyed directly by stable domain ID and local bounds.

---

## 8. World chunk / matter edit update pipeline

The production update pipeline should generalize what already worked in U4D and browser Phase D/E.

### Step 1 — accepted operation

Gameplay produces one resolved mutation:

```
MatterOperation
target owner
shape/parameters
bounds
sequence
```

### Step 2 — map operation bounds to authoritative samples

Compute the bounded sample range that can change.

Apply the operation only to authoritative matter.

Record exact changed sample addresses.

A no-op creates no content revision.

### Step 3 — derive dirty cell/region set

Surface Nets cells depend on neighboring corner samples.

Changed samples therefore derive:

- directly changed storage/owner bricks;
- affected surface cells;
- meshing regions whose read halos touch those samples.

U4D proves this pattern:

- first 0.125 m carve: 291 changed samples;
- 2 directly changed regions;
- 4 rebuilt regions including dependencies;
- 8 of 12 regions reused.

Moved-pose carve:

- 174 changed samples;
- 1 directly changed region;
- 4 rebuilt;
- 8 reused.

This should remain the model: **derive dependency regions, do not rebuild the entire owner.**

### Step 4 — derive other product invalidation separately

The render-mesh dirty set is not automatically identical to:

- static collider dirty set;
- support/connectivity read set;
- navigation dirty set;
- vegetation-placement dirty set;
- persistence dirty set.

Each subsystem derives its bounded dependencies from the accepted matter change.

Keep explicit read/write/product sets rather than one vague `dirtyChunk` flag.

### Step 5 — prepare products

Prepare expensive products off the critical path where practical:

- Surface Nets regions;
- static collision;
- support/connectivity result;
- save delta/checkpoint payload;
- later navigation or other derived products.

The authoritative matter revision is known.

Prepared products are tagged with:

- owner identity;
- content revision;
- product kind/revision.

### Step 6 — revision-gated publication

Publish only if:

- target owner identity still matches;
- content revision still matches the revision that was prepared.

U4D already proves stale mesh publication rejection and same-ID/same-revision replacement rejection through instance publication identity.

Extend the same principle to colliders/support products later.

### Step 7 — persistence commit

The durable accepted mutation/checkpoint must follow a crash-safe ordering.

Preferred transaction concept:

```
proposal
→ apply to candidate authority
→ prepare required products
→ validate
→ persist durable mutation/checkpoint
→ publish authority/products
```

or another ordering with equivalent recovery guarantees.

Browser Phase D/E already provides useful failure/rollback evidence; port the invariant, not its JavaScript mechanics.

---

## 9. Storage brick vs meshing region vs stream chunk

Do not treat these as synonyms.

### Storage brick

Small fixed dense unit used for:

- scalar/material memory;
- sparse residency;
- persistence compression.

### Meshing region

Unit of Surface Nets work/cache.

Current native qualification uses 16-cell regions plus read-only halo dependencies.

### Stream chunk

Larger residency/I/O unit for world streaming.

A stream chunk may contain multiple storage bricks and multiple mesh products.

Keeping these layers separate allows:

- small local remeshes;
- efficient sequential disk I/O;
- fewer GameObjects / draw/collider owners;
- flexible LOD/residency.

Final sizes remain future performance work.

---

## 10. Local MatterDomain update strategy

For local domains:

- local integer sample identity is authoritative;
- domain transform does not mutate sample identity;
- edits convert world query → local matter query;
- changed local samples derive dirty local regions;
- unchanged regional mesh products are reused;
- transform-only motion reuses matter and mesh completely.

U4D proves:

- 0.125 m domain beside 0.50 m world;
- independent 0.25 m sibling;
- transform-only move preserves matter and mesh hashes;
- moved world-space edit maps to expected local address;
- old pose is a no-op;
- source-free reload reconstructs deterministic geometry.

Future MatterActors should preserve this behavior.

---

## 11. World terrain persistence

Preferred initial production direction:

### Untouched chunk

Persist no dense terrain matter.

Regenerate from:

- world seed;
- generator version;
- chunk identity.

### Lightly edited chunk

Persist operation references/journal only.

### Heavily edited chunk

Persist:

- compact checkpoint for changed bricks;
- recent operations;
- checkpoint/base revision.

### Terrain that becomes a detached actor

Remove transferred matter from world authority through the normal ownership transaction.

Persist the resulting actor/domain current state separately.

Do not keep the same matter alive both as world delta and actor payload.

---

## 12. Local rock / tree / ruin persistence

A pristine generated local domain may be reconstructed from:

- source family/asset identity;
- source version;
- seed/parameters;
- generation-time scale/shape parameters;
- placement pose.

After light editing:

- same base descriptor;
- mutation journal.

After heavy editing or detachment:

- compact MatterDomain checkpoint;
- recent operations;
- pose / actor metadata.

This allows a future library of AI-generated, scanned or artist-authored meshes without requiring the source mesh to remain runtime authority.

The runtime boundary remains:

```
validated source mesh / procedural geometry
        ↓
true-SDF matter bake
        ↓
MatterDomain
```

---

## 13. Procedural formations

U4E should treat a formation as a deterministic recipe that references multiple individually authoritative stone domains.

A pristine formation can be saved by:

- formation recipe version;
- seed;
- placement;
- deterministic child-domain IDs/seeds/transforms.

Do not save 20 dense rock arrays if they can be regenerated exactly.

Once one stone is edited, save only that child's journal/checkpoint plus any formation-state changes.

Once a stone detaches/moves, it becomes persistent current-state domain/actor data.

This gives procedural variety without making the save proportional to every visible high-resolution stone.

---

## 14. Dynamic MatterActor persistence

Do not store physics history.

Store current durable state.

Likely fields:

- actor ID;
- MatterDomain ID/content;
- transform;
- sleeping/active state;
- optional linear/angular velocity when save semantics require continuation;
- ownership/material ledger state;
- structural/fracture metadata;
- recent matter operations/checkpoint revision.

Save/reload should restore a physically coherent current state, then allow simulation to continue.

---

## 15. Transaction and ownership rules

Carry forward these verified invariants:

1. Matter authority, visible mesh and physics proxy are separate.
2. Spatial chunks/bricks are not physical owners.
3. Detachment does not grant resources.
4. World→actor/domain ownership transfer is atomic.
5. Removed matter does not regenerate.
6. A durable operation applies exactly once.
7. A checkpoint and journal have explicit sequence/revision boundaries.
8. Stale products cannot publish over newer content.
9. Failed persistence/publication leaves a recoverable old durable state or an explicit recovery-required state.
10. Cross-boundary operations are identified globally so they are not duplicated.

---

## 16. What not to do

Avoid production designs that:

- save every generated high-resolution sample everywhere;
- store one diff record per changed sample when one accepted geometric operation can describe the same edit;
- replay an unbounded lifetime of pickaxe operations on every load;
- store raw player input as world authority;
- replay physics history;
- make mesh/collider data authoritative save state;
- use a single global voxel spacing;
- rebuild every chunk/domain after a local edit;
- let read-only halo copies become duplicate matter owners;
- regenerate edited matter from updated procedural sources without migration.

---

## 17. Near-term experiments

### U4E — procedural multi-domain formations

Use independently generated high-quality stone MatterDomains.

Exercise:

- deterministic formation recipes;
- stable child IDs;
- contact fitting;
- no accidental double matter;
- many-seed visual diversity;
- pristine recipe-only persistence concept.

No full production journal/checkpoint system is required yet.

### U5 — native destruction vertical slice

Add:

- material-specific edits;
- bounded support;
- static→dynamic ownership transfer;
- approximate physics proxy;
- moved MatterActor editing;
- exact material accounting;
- save/reload.

U5 should preserve MatterDomain local spacing when a detailed object becomes dynamic.

### Post-U5 persistence/streaming spike

Before world-scale migration, implement a bounded persistence benchmark comparing:

1. full dense snapshot;
2. sparse changed samples;
3. operation journal;
4. checkpoint + recent operations;
5. per-brick structural compression.

Measure:

- save bytes;
- load/replay time;
- compaction time;
- edit density crossover.

Use real 0.50 m terrain and 0.125 m domains.

---

## 18. Current evidence summary

### Browser D/E

Proved:

- sparse edits;
- cross-chunk dirty/read/write sets;
- bounded support expansion;
- static→dynamic transfer;
- transactional persistence/rollback;
- moved actor edits.

### Unity U2/U3

Proved:

- deterministic native matter authority;
- 16-cell regional meshing;
- Surface Nets;
- local refinement is more promising than globally shrinking the world.

### Unity U4C2/U4C3

Proved:

- high-quality continuous source shapes can be baked into true SDF;
- 0.25/0.125 m detail is visually credible;
- topology-aware Surface Nets repairs recorded fine-tier nonmanifold defects within the documented scope.

### Unity U4D

Proved:

- 0.50 m world + independent 0.25/0.125 m MatterDomains;
- transform-stable matter identity;
- bounded dirty regional remeshing;
- stale publication rejection;
- moved-pose targeting;
- source-free snapshot reload.

These together are enough to adopt the architecture in this document as the preferred direction for the next experiments, while leaving final storage encoding and streaming sizes open to measurement.
