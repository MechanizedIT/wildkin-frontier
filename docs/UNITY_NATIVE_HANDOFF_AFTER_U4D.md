# Wildkin Frontier native Unity handoff — after U4D

**Date:** September 28, 2026  
**Purpose:** fast context recovery for a fresh ChatGPT/Codex planning session after the long Unity transition discussion.

This document is the current high-level handoff. Detailed historical evidence remains in the phase reports/evidence folders.

---

## 1. Project direction

Wildkin Frontier is now a **PC-first native Unity game target**.

The previous Three.js/Rapier browser implementation remains valuable as an executable R&D reference through Phase 0.5E, but it is not the presumed production stack.

Current engine:

- Unity 6000.3.25f1 (Unity 6.3 LTS)
- HDRP 17.3.0
- Unity CLI 1.0.0-beta.11
- Unity Pipeline 0.8.0-exp.1
- official Unity Codex plugin 0.1.6-beta
- Windows x64
- RTX 3070 Laptop GPU / D3D12 qualification machine

Unreal 5.8 remains a fallback/challenger only if Unity exposes a real blocker or the owner explicitly requests a comparison.

---

## 2. Desired game/world target

The target is not Minecraft-style visible cubes.

The world should look like a stylized 3D game with authored-looking forms while substantial matter remains destructible.

Desired examples:

- terrain/cliffs/caves can be excavated;
- large rocks can be cut anywhere;
- large trunks/roots/ruins can use detailed local matter;
- procedural generation should avoid obvious repetition;
- detached substantial matter remains destructible;
- small vegetation/details may use cheaper specialized representations.

Core visual direction:

- stylized low-poly / mid-detail;
- broad readable faces;
- rounded/beveled edges;
- not extremely low poly;
- projected/rest-space materials;
- high-detail local objects without requiring the whole world to run at the same resolution.

See:

- `NATIVE_DESTRUCTION_REPRESENTATION.md`
- `ROCK_FORMATION_TARGET.md`
- `SOURCE_GEOMETRY_MATTER_FIDELITY_PLAN.md`

---

## 3. Core matter invariants

These are long-lived requirements from the browser R&D and native work:

1. **matter authority != render mesh != physics proxy**
2. precision destruction targets matter, not the approximate rigid-body proxy
3. spatial chunks/bricks are not physical ownership units
4. detachment itself does not create resource rewards
5. world→dynamic ownership transfer is atomic
6. removed matter cannot regenerate
7. detached matter remains recursively editable
8. structural work must be bounded/fail closed when evidence is incomplete
9. material behavior belongs behind explicit policies/profiles
10. generated source geometry is input; resolved matter becomes runtime authority

---

## 4. Current native representation

### Coarse world

Current architectural baseline:

- approximately 0.50 m world matter
- deterministic procedural base
- fixed-size local meshing/storage regions
- Surface Nets

### Detailed local MatterDomains

U4D now proves independent object-local matter:

- 0.25 m ordinary detailed domain
- 0.125 m high-detail domain
- 0.0625 m remains optional/hero evidence, not default

A MatterDomain owns:

- stable ID
- local integer sample coordinates
- independent spacing
- dense bounded density/material arrays in the qualification
- pose/transform
- content revision
- mesh revision
- local edits
- local regional meshing
- persistence snapshot

Transform does not change matter identity.

A domain can move without remeshing and world-space edits can be mapped back into local matter space.

---

## 5. Mesher decision

### Surface Nets retained

U3 compared Surface Nets and Dual Contouring.

Result:

- Dual Contouring was genuinely different
- it did not materially improve the target authored-rock look enough to justify replacing Surface Nets
- Surface Nets remained the preferred path

### U4C3 topology repair

U4C2 exposed two fine-resolution nonmanifold edges.

U4C3 repaired the recorded class by changing Surface Nets from:

`one vertex per active cell`

to:

`one vertex per connected surface patch within an active cell`

using:

- crossing-edge graph
- bilinear/asymptotic face decider
- deterministic component masks
- surface key = global cell + 12-bit crossing-edge component mask
- face emission routed through the patch containing the relevant primal crossing edge

Result:

- all 12 U4C2 true-SDF matrix rows pass the current manifold qualification
- known B/0.0625 and C/0.125 failures are repaired
- visual output remains effectively unchanged

### Important topology limit

Do **not** claim arbitrary trilinear topology is solved.

Known unsupported case:

- interior trilinear connectivity can differ from the face-only component graph
- higher-genus closed surfaces are not currently qualified by the validator

This is a later production-completeness gate, not a blocker for U4D/U4E.

---

## 6. Source geometry lesson

The first procedural rock approaches failed because they tried to build a rock from several simple convex/block-like pieces or fused SDF clasts.

The successful source direction became:

```
subdivided cube topology
→ superquadric/superellipsoid-like shaping
→ anisotropic proportions
→ large macro asymmetry
→ shaped contact base
→ deliberate broad cuts
→ one connected manifold stone
```

U4C2's individual stones passed independent visual review.

Important lesson:

> **Make one good stone as one sculpted form. Build formations later from several good stones.**

Do not make one individual stone look like a formation by attaching little rock components.

---

## 7. True SDF decision

U4C2 compared a true signed-distance field with a clipped/fixed-air control.

True SDF materially preserved the source shape better.

Preferred direction:

> detailed local MatterDomains should preserve useful signed-distance values around the surface.

Do not regress detailed domains to simple binary occupancy/fixed negative air after edits.

U4D's spherical subtraction keeps SDF-style density behavior.

---

## 8. U4D result — current verified checkpoint

Commit:

`f2fff9f445925712e461542efe1e176259310718`

Disposition:

`LOCAL_DOMAIN_0_125_PASS`

U4D proves:

- 0.50 m world terrain
- independent 0.25 m MatterDomain
- independent 0.125 m MatterDomain
- no adaptive terrain stitching
- no shared sample ownership
- zero directly measured positive-solid world/domain overlap
- 0.125 domain local carve
- bounded regional remesh
- transform-only movement without matter or mesh hash changes
- moved-pose world-space edit
- old pose no-op
- sibling/world isolation
- source-free save/reload/remesh

Validation:

- focused EditMode 11/11
- full EditMode 153/153
- PlayMode 2/2
- Windows x64 Development Player passed

Useful U4D numbers:

0.125 domain:
- 12,650 samples
- 63,250 raw density/material bytes
- 12 meshing regions
- initial 1,492 vertices / 2,980 triangles after final edits in recorded receipt

First carve:
- 291 changed samples
- 2 directly changed regions
- 4 rebuilt
- 8 reused
- ~438 ms Editor edit-to-visible qualification observation

Moved-pose carve:
- 174 changed samples
- 1 direct region
- 4 rebuilt
- 8 reused
- ~466 ms Editor edit-to-visible qualification observation

Qualification save:
- JSON/Base64
- ~84.9 KB
- ~13 ms save
- ~23 ms load
- source-free remesh succeeds

These are evidence, not production budgets.

Read:

- `native/evidence/unity/u4d-local-matter-domain/README.md`
- `native/evidence/unity/u4d-local-matter-domain/review.md`
- `LOCAL_MATTER_DOMAINS.md`

---

## 9. Persistence direction

The U4D dense JSON/Base64 snapshot is a proof, not the planned production format.

Preferred production model:

> **procedural base + accepted mutation journal + periodic compact checkpoint**

### Untouched procedural content

Save no dense voxel payload.

Regenerate from:

- world/source generator version
- seed
- stable identity
- placement

### Lightly edited content

Save the accepted matter operations.

Example:

`SUBTRACT_SPHERE(center, radius, operationId, version)`

Save the resolved matter mutation, not `PICKAXE_HIT`.

### Heavily edited content

Compact:

`base/checkpoint + old operations → new checkpoint`

Then retain only recent operations after the checkpoint.

### Detached/moved objects

Save current MatterDomain/MatterActor state plus transform and recent operations.

Do not replay the full physics history.

### Why

At 0.125 m the same physical volume has 64× the sample count of a 0.50 m field.

A single mathematical edit can represent hundreds/thousands of changed samples compactly, but replaying an unbounded operation history is also bad.

The hybrid model gives both small saves and bounded load time.

Full design:

`NATIVE_WORLD_PERSISTENCE_AND_UPDATES.md`

---

## 10. Preferred chunk/domain update method

Do not use one broad "dirty chunk" switch.

Preferred edit pipeline:

```
accepted bounded matter operation
        ↓
changed authoritative samples
        ↓
direct storage/write regions
        ↓
derived dependent Surface Nets regions
        ↓
separate support/collider/persistence dirty sets
        ↓
prepare products
        ↓
revision check
        ↓
publish
```

Important:

- read set and write set are different
- render, collider and structural dependencies may be different
- read-only halos are not physical owners
- unchanged regional products should be reused
- stale products must not publish

U4D already demonstrates the regional version of this:
291 changed samples did not remesh all 12 regions.

Future world streaming should distinguish:

- storage brick
- meshing region
- stream chunk

They are not necessarily the same size.

---

## 11. Planned U4E

U4E has **not yet been implemented**.

Plan:

`UNITY_U4E_FORMATION_PLAN.md`

Primary idea:

```
formation recipe
    ↓
multiple good individual stones
    ↓
each becomes its own MatterDomain
    ↓
contact-fit them into a coherent formation
```

Default behavior should **not** union the whole formation into one SDF.

U4E should prove:

- deterministic 20-seed formation gallery
- strong silhouette variation
- large/medium/small stone hierarchy
- stable child IDs
- no obvious repeated-model look
- measured domain-domain contact
- no substantial double-owned solid overlap
- one child can be edited/remeshed without touching siblings
- compact pristine formation regeneration from recipe/seed

A small contact graph should be derived from measured geometry, but no collapse/physics yet.

---

## 12. Future source-asset library option

If the procedural source modeler ever becomes limiting, Wildkin can use a large offline source library.

Possible source meshes:

- procedurally generated
- Blender/Geometry Nodes
- AI/text-to-3D
- photogrammetry/scans
- artist-authored assets

Pipeline:

```
source mesh
→ validate/repair
→ mesh-to-SDF bake
→ MatterDomain
```

The game does not need the source mesh to remain the destruction authority.

A large library plus deterministic deformation/composition can create enormous apparent variety without requiring a perfect pure-math runtime rock generator.

This is a valid production option, not a failure mode.

---

## 13. Planned U5

After U4E review, U5 should become the native destruction integration proof.

Target chain:

```
0.50 m terrain
+
0.125 m detailed local rock/domain
        ↓
material-specific edit
        ↓
bounded support/contact invalidation
        ↓
static → dynamic ownership transfer
        ↓
MatterActor retains local MatterDomain spacing
        ↓
approximate physics proxy
        ↓
fall / rotate / settle
        ↓
moved-pose matter edit
        ↓
save / reload
```

Carry browser Phase E invariants forward, but implement them natively.

U5 is where:

- contact graph/support
- ownership transfer
- physics proxy
- exact accounting
- persistence
- local-domain dynamics

begin to meet.

---

## 14. Post-U5 direction

If U5 passes, the likely sequence is:

1. provisionally accept Unity as production engine
2. formalize native production matter kernel
3. persistence/streaming benchmark
4. procedural source/formation authoring
5. world-scale streaming/performance
6. wood/tree directional destruction
7. other materials
8. production architecture gate

Unreal should not be tested merely for symmetry.

Use it only if Unity exposes a specific blocker worth challenging.

---

## 15. AI / Codex workflow

The development workflow that has worked well is:

```
owner / ChatGPT planning conversation
        ↓
review current committed evidence
        ↓
write one very detailed bounded Luna spec
        ↓
fresh GPT-6 Luna, maximum reasoning
        ↓
implementation + tests + captures + receipt
        ↓
commit/push
        ↓
ChatGPT independently reviews actual GitHub work
        ↓
PASS / remediation / HOLD
        ↓
design next uncertainty
```

For overnight multi-phase work:

- GPT-6 Sol High can orchestrate
- one fresh Luna Max writer per phase
- phases remain serial
- Sol reviews real commits/evidence before admitting the next phase
- no writer agents concurrently modifying `main`

Prefer a fresh Luna context for every materially new phase.

Do not ask Luna to implement multiple uncertain architectural phases in one giant session.

---

## 16. Evidence philosophy

Every phase should produce:

- exact question
- explicit PASS/HOLD criteria
- deterministic focused tests
- full relevant test suite
- actual runtime/Player evidence where meaningful
- captures for visual claims
- performance measurements separated by subsystem
- known limitations
- independent read-only review
- cohesive commit
- stop gate

Do not turn provisional findings into production claims.

---

## 17. Important open questions

Still unresolved:

- arbitrary trilinear interior topology
- higher-genus surface validation
- production narrow-band/SDF compression
- checkpoint/journal crossover thresholds
- final storage-brick and stream-chunk sizes
- domain-domain contact/support semantics
- domain vs terrain contact authority at true zero-gap contact
- physics collider strategy for native MatterActors
- async Jobs/Burst meshing and collider preparation
- world-scale streaming
- material-specific destruction beyond rock/dirt
- tree/trunk representation details
- whether some pristine objects should render source meshes before damage

Do not solve all of these at once.

Each new phase should isolate the next important uncertainty.

---

## 18. Most relevant documents for a fresh session

Read in this order:

1. `AGENTS.md`
2. `CURRENT_SLICE.md`
3. this handoff
4. `UNITY_FIRST_TRANSITION_PLAN.md`
5. `LOCAL_MATTER_DOMAINS.md`
6. `NATIVE_WORLD_PERSISTENCE_AND_UPDATES.md`
7. `UNITY_U4E_FORMATION_PLAN.md`
8. U4D evidence README/review
9. U4C3 evidence README if topology details matter
10. browser Phase 0.5E report only when support/ownership history is needed

The next planning task should normally be:

> review U4D and the U4E plan, then write the detailed Luna-Max U4E implementation specification.

Do not start implementation from this handoff alone without reading current `origin/main`.
