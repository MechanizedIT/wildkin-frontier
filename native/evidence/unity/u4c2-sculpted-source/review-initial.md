# U4C2 initial independent visual review

**Verdict: HOLD — Gate A is not met.**

## Evidence reviewed

I reviewed the target in `native/shared/reference/ROCK_FORMATION_TARGET.md` and all nine supplied captures:

- `stone-A-beauty.png`, `stone-A-angle2.png`, `stone-A-wireframe.png`
- `stone-B-beauty.png`, `stone-B-angle2.png`, `stone-B-wireframe.png`
- `stone-C-beauty.png`, `stone-C-angle2.png`, `stone-C-wireframe.png`

The accompanying metrics establish that all three meshes are closed, one-component manifolds (98 vertices / 192 triangles each), so this HOLD is entirely an art-read finding rather than a topology failure.

## Visual judgment

The captures do demonstrate clean, broad low-poly planes and consistently rounded/beveled edges. There are no visible spikes, floating components, paper-thin fins, or noisy marching-surface artifacts.

However, the three pieces still read primarily as deformed rounded primitives rather than deliberately sculpted game rocks:

- **A** is a long, almost capsule-like rounded block. Its two angles retain a highly regular, level belt and top plane; the small end variation does not produce a distinctive stone silhouette.
- **B** reads as an upright softened cube/block. Its dominant front and side faces remain too even and architectural, with a centered, symmetric mass and no convincing fracture, break, or rock-specific landmark.
- **C** has the strongest directional asymmetry, but it reads as a leaning, rounded tombstone/slab. The two-view silhouette has one large continuous face and a uniform perimeter, with too little secondary shaping to escape the simple primitive read.

Across the set, major faces are still too uniform and continuous, silhouette variation is limited, and there is no visible shelf, recess, chipped plane transition, or other large/medium-scale hierarchy that gives a stone its authored identity. The wireframes reinforce this: each is a single smooth superquadric-style envelope with regular perimeter flow, rather than a controlled arrangement of unequal planes and transitions.

## Bounded repair guidance

Keep the successful low-poly density and manifold constraints, but revise the source family before re-review:

1. Break the dominant envelope of every archetype with two or three intentional, unequal large planes: for example a sloped shoulder, offset/broken crown, and a compressed or undercut base. Avoid merely adding small vertex jitter.
2. Add one readable medium-scale stone event per seed/archetype—an offset shelf, shallow recess, or a strongly angled plane transition—so the second camera view reveals real volume changes.
3. Specifically move A away from the level capsule/belt profile, B away from a softened cube, and C away from a monolithic leaning slab. Preserve compact, grounded one-piece silhouettes; formation composition is deferred to U4E.

Re-capture beauty, angle 2, and wireframe views for the same three seeds after that source-only revision. A re-review can PASS when each individual asset reads immediately as a plausible stylized rock from both views without relying on material detail or formation context.
