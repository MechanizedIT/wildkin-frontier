# Native destruction representation strategy

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
