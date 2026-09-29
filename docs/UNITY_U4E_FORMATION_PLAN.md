# Unity U4E — procedural multi-domain rock formation plan

## September 29 owner closure — no U4E.3

U4E.2 is the final experiment in this procedural source-rock/formation line unless the owner explicitly reopens it. Its E solver can find overlap-free machine-valid poses for all five fixtures, but independent visual review still sees conspicuous repositioning/reorientation and detached neighboring stones. That is sufficient evidence to stop increasing solver complexity.

Preserve U4E/U4E.1/U4E.2 code and evidence as useful diagnostics/tests. Do not promote `SculptedStoneRecipe` formations to the production art pipeline and do not add U4E.3.

The active successor is [Asset-First Voxel Pipeline](ASSET_FIRST_VOXEL_PIPELINE.md), beginning with [U4F Asset-First Voxel Stamp Admission](prompts/UNITY_U4F_ASSET_FIRST_VOXEL_STAMP_ADMISSION.md). Physics-settled formations are deliberately deferred to U4G after an individual generated/authored stamp passes.


## U4E.2 local interlock pose search — `U4E2_LOCAL_POSE_SEARCH_HOLD`

The bounded follow-up adds deterministic D three-axis translation and E local-frame orientation search around the frozen U4E.1 attempt-index-0 poses. Translation is constrained to U/V ±0.50 m, with bounded coarse/refinement sampling; orientation is a 5×5×3 lattice (U/V ±20°; N twist ±15°). The fixed directional patch metric, 12.5 mm penetration limit, terrain/sibling context, and bidirectional zero sampled-overlap rule remain gates. Source geometry and ordinary U4E defaults are untouched.

Five fixtures were replayed: frozen A accepts 5/5, D accepts 3/5 overall (2/4 core), and E accepts 5/5 (4/4 core plus stress). Accepted candidates preserve source/recipe/geometry/content/mesh/spacing and frozen siblings, and have zero sampled overlap. Focused EditMode 6/6, full EditMode 166/166, PlayMode 3/3. No Player build was requested.

Fresh independent visual review assigns HOLD. Some accepted poses need conspicuously large translation/rotation, contact footprints remain unclear in several cases, and other stones in context still appear detached. Machine-valid local poses do not resolve the formation's visual interlocking problem. Stop here; do not begin U5. See [U4E.2 evidence](../native/evidence/unity/u4e2-interlock-pose-search/README.md) and the [independent review](../native/evidence/unity/u4e2-interlock-pose-search/review.md).

## U4E.1 contact-patch follow-up — U4E1_CONTACT_METHOD_HOLD

A preserves the global-min +25 mm control and accepts all six fixed seeds with connected graphs and zero sampled-overlap pairs. B/0 mm and C/-5 mm each accept 0/6 complete formations. Failed candidates encounter sample-center overlap, penetration above the 12.5 mm limit, or no support-facing witness while moving only along the existing parent direction. All six source/domain comparisons match the frozen U4E rows, but regenerated graph/formation hashes and all eight exact reference capture comparisons differ. Current A captures are 640 × 360 versus the 1920 × 1080 U4E references; they are current visual evidence, not exact replay proof. No Player build was made because neither candidate was viable. The original U4E HOLD and evidence remain unchanged. The detailed result, reviewer findings, metrics and validation are in the [U4E.1 evidence folder](../native/evidence/unity/u4e1-directional-contact/README.md). The next bounded planning question is multi-axis/interlock composition; do not start U5.

**Status — implemented; HOLD after independent visual review, September 28, 2026.** U4E's deterministic multi-domain, contact, isolated-edit and pristine-regeneration technical gates pass. One bounded camera/framing remediation improved legibility, but the independent re-review still sees separated/floating stones in several heroes rather than the required believable interlocking formation. Stop at U4E; do not begin U5. Detailed implementation evidence and both review passes are in [the U4E evidence folder](../native/evidence/unity/u4e-multi-domain-formations/README.md) and [review record](../native/evidence/unity/u4e-multi-domain-formations/review.md).

## Primary question

Can Wildkin create visually varied, authored-looking rock formations by composing several individually high-quality destructible MatterDomains, while preserving independent matter authority and avoiding the fused-clast failure mode from U4/U4B?

The intended architecture is:

```
formation recipe
    ↓
several individually generated stones
    ↓
each stone → true-SDF MatterDomain
    ↓
deterministic placement/contact fit
    ↓
one visual formation made of many independent destructible domains
```

Do **not** melt the whole formation into one SDF by default.

## Why this follows U4D

U4D established that:

- 0.50 m world terrain can coexist with local 0.25 m and 0.125 m domains;
- a 0.125 m domain can edit/remesh independently;
- moving a domain does not mutate its matter;
- source-free persistence works;
- no adaptive terrain stitching is required for detailed props.

That removes the main architectural reason U4E would need one giant shared high-resolution field.

## Formation visual target

A successful formation should read like a deliberate stylized environment asset composed from individual stones:

- strong overall silhouette;
- clear large / medium / small mass hierarchy;
- broad planar-ish faces;
- rounded/beveled stone edges;
- varied orientation;
- controlled asymmetry;
- occasional gaps/recesses;
- no floating capstones;
- no pile-of-identical-copies look;
- no soft fused metaball/clast language.

The existing `ROCK_FORMATION_TARGET.md` remains the visual reference.

## Individual stone source

Use the U4C2 sculpted single-stone generator as the initial source family.

Each formation child should have deterministic generation inputs:

- source archetype/family;
- source seed;
- generation-time proportions;
- generation-time rotation/shape parameters;
- desired matter spacing.

A child stone may be baked at:

- 0.25 m for ordinary detail;
- 0.125 m for important/hero geometry.

Do not use 0.0625 m by default.

## Formation recipe

A deterministic recipe should describe semantic slots rather than arbitrary random scatter.

Example slots:

- foundation / anchor stone;
- shoulder stone;
- secondary support;
- capstone;
- accent/filler stone.

A recipe may choose 3–8 stones depending on archetype.

The recipe controls:

- child count;
- size hierarchy;
- source family/seed;
- generation-time scale/proportion;
- orientation;
- placement relation;
- target contact;
- allowed gap;
- formation archetype.

Possible archetypes:

- low stacked shelf;
- leaning cluster;
- buttressed outcrop;
- broken ridge;
- stepped/cairn-like mass;
- cliff-edge cluster.

Do not require all archetypes in the first implementation. A few strong families are better than many weak ones.

## Stable identity

Use deterministic stable IDs.

Conceptually:

```
formationId
childSlot
generationVersion
        ↓
child MatterDomain ID
```

A child domain must keep the same ID across deterministic regeneration.

This matters for future persistence:

- pristine child can remain recipe-derived;
- edited child can add an operation journal/checkpoint;
- detached child can become independent actor state.

## Contact fitting

Do not solve this by allowing arbitrary volumetric overlap.

Preferred first approach:

1. place a candidate child;
2. query candidate/domain surfaces;
3. move along a constrained placement direction until surfaces are near contact;
4. enforce a small contact tolerance;
5. reject placements with substantial positive-solid overlap;
6. keep enough contact area to look supported.

Record:

- minimum surface gap;
- estimated contact area / contact sample count;
- solid-overlap count;
- placement adjustment.

The purpose is to establish a future support/contact graph without duplicating matter.

A tiny rendering tolerance may be acceptable if explicitly recorded, but two domains should not silently own the same meaningful volume.

## World contact

The full formation should sit on 0.50 m terrain without refining the terrain.

Use the U4D placement/contact diagnostics.

At least the foundation child should have clear terrain contact.

No adaptive terrain stitching.

## Formation support graph — diagnostic only

U4E does not implement collapse.

But create a deterministic contact graph:

```
terrain → foundation
foundation → shoulder
foundation/shoulder → cap
...
```

A graph edge should come from measured geometric/contact evidence, not simply the intended recipe label.

Record:

- node/domain IDs;
- contact pair;
- contact count/area proxy;
- whether terrain anchors the component.

This graph becomes useful input for U5 support experiments.

Do not make it a full engineering-stress solver.

## Diversity target

Generate at least 20 deterministic formation seeds.

Each formation should be reproducible.

The gallery should demonstrate meaningful differences in:

- silhouette;
- child count;
- size hierarchy;
- dominant direction;
- cap/shoulder arrangement;
- negative spaces;
- height/width ratio.

Do not count simple rotation of the same formation as meaningful diversity.

## Repetition control

Measure source reuse.

The goal is not necessarily zero reuse. It is avoiding obvious repetition.

Track for each gallery:

- unique child source seeds;
- reuse frequency;
- repeated source within one formation;
- source family distribution.

Prefer generating many unique individual source stones from deterministic seeds rather than selecting from only three fixed meshes.

This is where the current procedural stone generator should begin acting like a large virtual asset library.

## Future external source compatibility

Keep formation composition independent from how each child source mesh was created.

A later child source may come from:

- procedural sculpted stone;
- Blender;
- AI/text-to-3D;
- scan/photogrammetry;
- artist-authored FBX/GLB.

Formation logic should consume:

```
validated source geometry
→ MatterDomain
```

not a specific procedural-rock class.

## Materials

Use the existing projected/rest-space material direction.

Different stones may vary:

- stone tint;
- roughness;
- macro variation;
- moss/dirt mask later.

Do not make material variation do the job of shape variation.

## Persistence direction

U4E does not need the full production persistence system.

But prove that a pristine formation can be represented compactly by:

- formation recipe version;
- formation seed;
- root/world transform;
- deterministic child descriptors/IDs.

Do not serialize dense domain arrays for an untouched generated formation merely for the experiment.

Optionally prove regeneration produces the same child domain hashes.

The future production model is documented in `NATIVE_WORLD_PERSISTENCE_AND_UPDATES.md`.

## Editing

U4E does not need a complete destruction chain.

A useful bounded proof is to carve one child domain and demonstrate:

- formation siblings remain unchanged;
- contact graph can be recomputed or marked dirty for that child;
- deterministic child identity remains stable;
- only that child's mesh regions rebuild.

Do not implement support loss or rigidbody detachment yet.

## Performance evidence

Record for a representative formation:

- number of child domains;
- total samples;
- total raw matter bytes;
- total vertices/triangles;
- initial domain bake time;
- total meshing time;
- formation placement/contact-fit time;
- one-child edit/remesh time;
- number of child domains rebuilt (should normally be one).

This is qualification evidence, not a production world budget.

## Agent tooling

Codex should be able to:

- generate formation seed;
- inspect recipe;
- inspect child domains;
- regenerate gallery;
- capture contact sheet;
- inspect contact graph;
- edit one child;
- export receipt.

No manual Inspector tweaking should be required to reproduce evidence.

## Visual evidence

Required:

- 20-seed formation contact sheet;
- 4–6 hero formations;
- alternate angles for at least 3;
- one wireframe/domain-boundary view;
- one contact graph/debug view;
- one edited-child before/after.

Independent visual review is required.

## U4E PASS

A strong pass should establish:

1. multiple independent MatterDomains can read as one coherent formation;
2. the 20-seed gallery has meaningful silhouette diversity;
3. individual stones still look like U4C2-quality stones;
4. no fused-clast/metaball regression;
5. no substantial double-owned solid overlap;
6. deterministic stable child identities;
7. contact graph is derived from measured geometry;
8. one child can edit/remesh independently;
9. pristine formation regeneration is deterministic;
10. performance is plausible enough to proceed to U5.

## U4E HOLD reasons

Hold if:

- formations look like repeated copies with random transforms;
- physically believable composition requires large hidden solid overlap;
- child-domain count makes rendering/update architecture obviously impractical;
- contact fitting is unstable;
- separate domains cannot visually read as a coherent formation;
- a new representation blocker appears.

Do not union everything into one SDF merely to force a pass.

### September 28 result

The 20-seed gallery contains 20 accepted seeds across four families, with 101 unique child source-geometry hashes and one 0.125 m child plus four or five 0.25 m children per formation. Measured fitting yields 35 cross-tier contact edges; bidirectional sampled-overlap checks report zero overlap across all 306 possible domain/terrain pairs. The one-child carve and compact pristine recipe regeneration also pass. These results do not override the visual HOLD: the independent reviewer sees visibly separated/floating stones in hero seeds 7004, 7017, 7010, 7015 and weakest seed 7019. The initial gallery/player framing issue received one bounded camera repair; the same core formation-readability gap remains. See `review.md` and `README.md` in the evidence folder.

## After U4E

U4E has been reviewed and remains HOLD. U5 is not authorized by this checkpoint and must not begin until fresh owner direction resolves the formation-readability blocker.

U5 should be the native destruction integration proof:

```
coarse terrain
+
high-resolution rock/domain
        ↓
material-specific edit
        ↓
bounded support/contact update
        ↓
static → dynamic ownership transfer
        ↓
MatterActor using the same local MatterDomain
        ↓
approximate physics proxy
        ↓
fall / settle
        ↓
moved-pose edit
        ↓
save / reload
```

The child/local domain should preserve its 0.125 m spacing after becoming dynamic.

U5 should begin integrating the persistence strategy from `NATIVE_WORLD_PERSISTENCE_AND_UPDATES.md`, but a full world-scale journal/checkpoint system can remain a post-U5 benchmark.
