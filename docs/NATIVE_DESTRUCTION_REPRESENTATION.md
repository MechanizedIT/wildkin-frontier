# Native destruction representation strategy

## September 29 representation direction — pristine mesh + dormant stamp + active matter

For asset-first loose/deposited environment objects, use **two visible representations with one destruction source of truth**.

### Pristine / dormant
- Render the reviewed high-quality source mesh or LODs.
- Use cheap placement/interaction/settling collision proxies.
- Keep a pre-baked local matter stamp available by stable asset ID, but do not require every untouched instance to own a dense mutable `MatterDomain`.
- The source mesh is a render representation, not mutable matter authority.

### Activation
On the first destructive interaction, instantiate/decompress the selected base stamp into a local `MatterDomain`, apply the accepted mutation, build the changed Surface Nets product, then hand visible rendering to the destructible representation. Dust/chips/impact feedback may hide bounded preparation latency, but the phase must measure the cost honestly.

### Active matter
After activation, mutable `MatterDomain` state is authoritative for shape/material destruction. The pristine source mesh must not continue to shadow changed geometry. Existing regional dirty remeshing, revision-gated publication and mutation/persistence rules continue to apply.

### Render mesh versus stamp-source mesh
A generative raw mesh is not automatically suitable for SDF sign tests. It is valid to retain:
- a higher-detail reviewed **render mesh**;
- a separate closed/watertight **stamp-source derivative** whose silhouette and macro forms are independently checked against the render source.

Do not voxelize a visibly generic repair merely because it is watertight.

### Physics representation
Physics collision is a third product:
- cheap convex/compound proxies for pristine placement and later settling;
- active matter/cavity proxies only where destruction requires them.

Do not use the detailed render mesh as the general runtime collider.

### Deposited objects versus native geology
Boulders, fallen slabs, logs/roots and similar discrete objects may use this stamp lifecycle. Cliffs, strata, bedrock, caves and mineral seams remain continuous world/local geological matter and should not be decomposed into thousands of decorative actors merely to reuse the stamp path.


> **September 28, 2026 update:** U4D qualifies the local-domain direction: ~0.50 m coarse world matter can coexist with independent 0.25 m and 0.125 m editable MatterDomains without adaptive terrain stitching. Treat 0.25 m as an ordinary-detail local tier and 0.125 m as the current high-detail candidate; 0.0625 m remains optional. Detailed domains should retain true-SDF surface information. Persistence/storage direction is documented in `NATIVE_WORLD_PERSISTENCE_AND_UPDATES.md`; procedural multi-domain formation planning is in `UNITY_U4E_FORMATION_PLAN.md`.

Wildkin's goal is that the world feels broadly destructible, not that every visible object must use the same volumetric data structure.

Use the cheapest representation that preserves the gameplay interaction.

## Tier A — volumetric authoritative matter

Best for:

- terrain
- cliffs
- caves
- large rocks
- large ruins
- ore/crystal masses
- trunks and large roots where freeform cuts matter
- very large alien flora

Capabilities:

- arbitrary excavation
- holes/tunnels
- material-specific damage
- support/collapse
- static→dynamic transfer
- recursively editable MatterActors

Likely production representation:

- sparse fixed-size matter bricks;
- density + material + structural metadata;
- selected surface mesher;
- local refinement where justified.

## Tier B — procedural structural geometry

Best for:

- smaller branches
- stems
- vines
- large grass blades
- reeds
- tentacles/organic stalks

Possible authority:

- spline/segment graph
- tapered capsules/frusta
- per-segment material/health/cut state

Example: an alien grass blade can be cut at the actual scythe intersection parameter. The lower spline remains; the upper section detaches. It does not need centimetre-scale 3D voxels to feel physically cut.

Tier B objects may convert a large remnant into Tier A matter when gameplay requires freeform follow-up destruction, but this should be evidence-driven rather than automatic.

## Tier C — lightweight destructible props/instances

Best for:

- leaves
- very small twigs
- pebbles
- small decorations
- flowers
- tiny mushrooms

Use:

- instanced meshes
- simple rigid bodies
- swap/remove/break states
- small procedural variation

These can still respond to damage without becoming volumetric matter.

## Tier D — ephemeral presentation

Best for:

- dust
- chips
- tiny fragments
- grass clippings
- splinters
- sparks

Use particles/pooled short-lived geometry.

Do not put authoritative resource ownership into purely cosmetic particles unless a gameplay system explicitly tracks it elsewhere.

## Core rule

**Destructible does not mean voxelized.**

The player-facing rule is:

> the cut/break should happen where the interaction suggests it happens, and substantial surviving matter should persist appropriately.

The implementation may differ by scale.

## Procedural uniqueness

The same hierarchy applies to procedural generation.

Large forms:
- SDF/procedural matter stamps.

Medium structural forms:
- seeded splines/branch graphs.

Small forms:
- seeded instancing/mesh variation.

This lets trees, rocks and flora be individually varied without requiring every leaf or blade to consume volumetric matter memory.


## Multi-resolution local matter domains

U4/U4B suggest that one global voxel spacing is likely the wrong abstraction for all large destructible objects. The active hypothesis is that **terrain and detailed objects may use separate matter domains with different sample spacing**.

Example:

- terrain domain: ~0.50 m;
- detailed rock domain: candidate 0.125 m or 0.0625 m, pending U4C;
- trunk/root domain: similar local spacing if later evidence supports it;
- detached MatterActor: retains the originating local domain spacing.

This can avoid forcing a high-detail rock to share a crack-free adaptive topology with coarse terrain. It does not eliminate the later need for explicit contact/support/ownership rules between domains. See [LOCAL_MATTER_DOMAINS.md](LOCAL_MATTER_DOMAINS.md).

The production decision is intentionally deferred until U4C establishes how much resolution and signed-distance fidelity a good source asset actually needs.

## Shared destruction contract

Different representation tiers should still expose compatible high-level concepts where practical:

- stable object/matter identity
- material identity
- hit query
- consume/remove quantity
- detach/split result
- persistence state
- resource/reward semantics
- debug/agent inspection

Do not force them into one low-level implementation merely to share an interface.
