# Wildkin Frontier — Asset-First Voxel Environment Pipeline

## September 29 owner style-gate correction — reference must already look like Wildkin

The first U4F reference pass exposed an important workflow rule. A technically suitable single-rock silhouette is not enough. The target image must already look like a **finished stylized Wildkin Frontier 3D game model**, not a natural rock rendered attractively in a studio.

For native environment references, require:
- substantial chunky/faceted forms;
- broad intentional planes;
- rounded/chamfered readable bevels;
- strong thumbnail silhouette;
- simplified matte/game-art material treatment;
- broad value/color design rather than photographic grain;
- restrained shading and no scan/photogrammetry aesthetic;
- visible authored-game-asset character.

The rejected `u4f-rock-001` set remains useful negative evidence: prompts used the word "stylized" but also emphasized natural slate/stone treatment strongly enough that the actual images still read as realistic rocks. Future reference prompts must explicitly exclude photorealism, photographic geology, scans, micro-erosion and realistic surface noise.

For the first representative rock family, the independent reference reviewer may reject or shortlist candidates, but **owner visual selection is a hard gate before any TRELLIS computation**. This keeps the expensive 3D/source pipeline from optimizing toward an agent-approved but owner-rejected art target.

The bounded correction phase was `U4F-R`; see `docs/prompts/UNITY_U4FR_STYLIZED_REFERENCE_GATE.md`. That owner-selection gate is now satisfied for the first representative asset: Chris approved candidate-04 from `u4f-rock-002` for U4F source generation. Future assets still require their own reference review/owner gate when specified by their phase.

**U4F-R owner decision, September 29, 2026:** candidate-04 is approved as the representative first U4F source reference. Its SHA-256 is `6B0D4606568158DE586F488BB0CAFE7B17E04C26B6C47F5528CEE6209043B0BC`; provenance and the exact prompt are in [u4f-rock-002](../art/source/u4f-rock-002/reference/reference-manifest.md), with approval recorded in [owner status](../art/source/u4f-rock-002/reference/owner-review-status.md). All candidates 01–06 remain retained as future rock-family/reference material; candidate-06 is also a strong later candidate. Selection of candidate-04 does not reject any other reference or establish it as the only Wildkin rock style. Final stylization may also come from material, weathering, biome, and surface-treatment systems. The old `u4f-rock-001` set and review remain unchanged historical evidence.


**Status:** active architecture direction after U4E.2 HOLD, September 29, 2026.

**Immediate next implementation:** U4F — one asset-first voxel stamp admission.

**Not authorized by this document:** U4G+, U5, mass asset generation, production streaming, or a new engine.

**U4F checkpoint, September 29, 2026:** candidate-04 from `u4f-rock-002` is owner-approved as the representative first source. One guarded Small512 attempt completed sparse sampling, then the existing 6 GiB reserve guard stopped the process at 5.31 GiB before shape generation completed. No raw model or downstream source/stamp implementation was produced. Independent review confirms `U4F_SOURCE_GENERATOR_HOLD` and finds no policy-justified second attempt from this result. See the [continuation evidence](../native/evidence/unity/u4f-asset-first-stamp/continuation-2026-09-29/README.md), [initial historical U4F evidence](../native/evidence/unity/u4f-asset-first-stamp/README.md), and [owner status](../art/source/u4f-rock-002/reference/owner-review-status.md). This does not change the provider-agnostic architecture direction or qualify any source/stamp candidate.

## Owner-confirmed future environment direction — recorded, outside U4F scope

The eventual environment may include many distinct individual rock families, multi-rock/fractured formations, physics-settled loose formations, and continuous geology with strata, layers, cliffs, caves, faults, veins, and erosion. Later broad asset-family exploration may cover trees, shrubs, roots, fungi, crystals, plants, and other flora/fauna/environment assets. These remain future directions: U4F proves one rock end-to-end; do not widen into batch asset exploration, U4G formation settling, or U5 during this slice. The existing phase gates below govern when later work may begin.

## 1. Why the direction changed

The native Unity R&D proved useful matter technology but repeatedly failed the art/composition goal when asked to invent production source rocks procedurally.

The evidence now says:

- U4/U4B procedural formations became technically stronger but remained visually generic, fused or soft.
- U4C2 showed that a sufficiently good source shell can survive true-SDF sampling and Surface Nets reasonably well.
- U4D proved independent 0.25 m and 0.125 m local MatterDomains, source-free edits, transforms, bounded remeshing and persistence.
- U4E proved deterministic multi-domain composition and isolated edits but still read as separated/floating.
- U4E.1 proved that minimum-distance “contact” can be visually meaningless.
- U4E.2 proved that multi-axis translation/rotation can find overlap-free placements, yet valid placements can still read as repositioned rather than naturally authored.

The conclusion is not that voxels failed. The conclusion is that procedural matter code is the wrong place to manufacture all source art.

The active strategy is:

**high-quality source asset → reviewed cleanup → pristine render asset + closed stamp source → offline matter bake → runtime destructible activation**

Procedural systems should compose good assets; they do not need to sculpt every asset from primitives.

## 2. Durable principles

### 2.1 Generator-agnostic admission

TRELLIS.2 is the first provider to test because image-to-3D fits the target-first Dream Loop workflow, but no Wildkin runtime or matter API may depend on TRELLIS-specific latent formats, Python classes or services.

Canonical admission begins from ordinary reviewed triangle geometry such as GLB/glTF, OBJ, PLY, FBX or a Unity/Blender-imported equivalent.

A future TRELLIS/O-Voxel direct converter may be explored only after the generic mesh route works.

### 2.2 Three products, not one mesh doing every job

Each admitted destructible environment asset may have:

1. **Pristine render mesh**
   - highest-quality visible source;
   - practical LODs;
   - PBR/project material;
   - not required to be the physics collider;
   - not required to be the exact SDF source if topology repair would damage it.

2. **Stamp-source mesh**
   - closed/watertight enough for deterministic inside/outside sampling;
   - silhouette and macro-form matched to the pristine render mesh;
   - may be a cleaned/remeshed derivative;
   - source for the pre-baked local matter field.

3. **Physics proxy**
   - one or more cheap convex/compound shapes;
   - used for placement, settling and ordinary collision;
   - never infer production collision from a high-poly render mesh at runtime.

### 2.3 Matter authority begins when destruction begins

Untouched world assets should not all allocate dense mutable matter.

Recommended lifecycle:

**PRISTINE_DORMANT**
- render source mesh/LOD;
- lightweight collider;
- stable asset/stamp ID;
- dormant pre-baked stamp on disk/cache.

**ACTIVATING**
- instantiate/decompress base stamp;
- apply first accepted mutation;
- build changed Surface Nets product;
- show impact feedback while bounded work completes;
- record activation timing.

**ACTIVE_MATTER**
- MatterDomain is shape/material authority;
- source render no longer shadows modified geometry;
- local edits/remesh/persistence follow existing contracts.

Later phases may add dynamic/sleeping MatterActor states after support/physics transfer is qualified.

This preserves pristine fidelity and avoids treating every decorative rock as a continuously active voxel simulation.

## 3. Asset classes

### Loose/deposited stamp candidates

Good candidates include:
- boulders and slabs;
- scree stones and fallen chunks;
- logs and major roots;
- crystalline growths;
- large fungi/coral-like alien structures;
- ruins/debris where destruction rules fit.

### Hybrid assets

Trees should not become dense leaf voxels.

Likely split:
- destructible trunk / major branches / root buttresses;
- conventional or instanced foliage;
- optional breakable branch actors.

### Continuous native geology

Do not model the world as a giant pile of actors.

Keep continuous geology in terrain/world matter:
- bedrock;
- cliffs;
- strata;
- caves;
- veins;
- sediment layers;
- large continuous shelves.

Asset stamps may decorate or interrupt geology, but geological continuity belongs to terrain generation.

## 4. First-family visual language

The owner's September 29 rock-formation reference establishes the shape-language bar:

- chunky stylized stones;
- broad readable planes;
- rounded/beveled corners rather than razor edges;
- asymmetry without noisy micro-warp;
- believable mass and weight;
- compact silhouettes;
- no fused metaball/clay appearance;
- no obvious primitive cube/ellipsoid;
- enough face character that rotations/scales remain useful.

The game is an alien frontier, so this is a shape-language reference, not a requirement that every biome use gray Earth stone.

## 5. Reference-image workflow

Create a small design manifest before generating a family:
- family ID;
- habitat/biome;
- geological idea;
- size classes;
- shape language;
- formation roles;
- material/weathering palette;
- mining material;
- desired destruction behavior.

For image-to-3D inputs prefer:
- one isolated subject;
- clean simple background;
- strong three-quarter silhouette;
- no neighboring rocks;
- no labels/text;
- no tiny unsupported ornaments;
- no impossible intersections;
- enough visible top/side volume to imply a solid.

A formation beauty image is useful as a **composition target**. Individual stamp generation should usually use isolated objects.

A separate reference reviewer rejects contaminated silhouettes, impossible geometry, confusing perspective and designs that are mostly texture detail with weak shape.

## 6. 3D generation

Use the repository's guarded local TRELLIS workflow when its resource gates pass.

The architecture must remain provider-agnostic. The local TRELLIS installation is an experimental source generator, not a game dependency.

Follow `.agents/skills/wildkin-asset-forge/references/local-tools.md`:
- serialize heavy jobs;
- use existing guarded launchers;
- do not bypass memory reserve checks;
- do not install/upgrade dependencies inside a bounded qualification;
- preserve successful raw output before touching reporting/tooling.

For U4F, generate only enough candidates to evaluate one rock. Prefer conservative settings first and allow one materially different retry rather than repeated identical runs.

If local TRELLIS cannot safely produce an admissible source, return a generator/backend HOLD rather than lowering downstream quality.

## 7. Raw source audit and cleanup

Inspect generated sources from front/rear/sides/top/underside/three-quarter and wireframe.

Record:
- vertices/triangles;
- connected components;
- boundary edges;
- non-manifold edges;
- degenerate faces;
- bounds;
- scale/orientation;
- material/texture inventory;
- source hash.

A beautiful front view cannot waive catastrophic hidden-side topology.

Preserve the raw master.

### Pristine render derivative

Goals:
- preserve approved visual shape;
- remove accidental detached junk;
- correct normals;
- normalize orientation/scale/pivot;
- reduce unreasonable polygon count without collapsing silhouette;
- create practical LODs.

### Stamp-source derivative

Goals:
- one coherent intended solid;
- closed/watertight enough for sign tests;
- no accidental internal/disconnected shells;
- same normalized frame as render source;
- macro shape visibly matched to render source;
- practical triangle count for offline SDF baking.

A voxel remesh/repair derivative is acceptable only if independent review confirms it still looks like the same rock.

## 8. Generic mesh → signed distance

Current proof code is tied to `SculptedStoneMesh` and brute-force triangle traversal.

U4F may add a minimal engine-light generic triangle source such as `IClosedTriangleMeshSource` with:
- vertex/index access;
- bounds;
- validation;
- deterministic content hash.

Adapters may wrap sculpted-stone fixtures and imported Unity geometry.

Do not make core MatterDomain code depend on `UnityEngine.Mesh` or TRELLIS.

### Offline acceleration

High-quality imported meshes make O(samples × triangles) brute-force sampling unsuitable.

U4F may add a deterministic offline triangle BVH/AABB hierarchy for:
- nearest-triangle distance;
- ray-candidate pruning for parity/sign;
- bounded stamp baking.

Retain the exact brute-force path as a correctness oracle on small fixtures.

This is an offline bake structure, not a new runtime world spatial framework.

## 9. Stamp bake

A stamp contains enough information to initialize an independent MatterDomain without retaining source geometry at runtime.

Qualification data may remain simple:
- stamp schema/version;
- stable stamp ID;
- source/stamp-source hashes;
- spacing;
- local sample bounds;
- density values;
- material IDs;
- material/destruction profile.

Production compression is not a U4F requirement.

### Resolution

For U4F compare:
- 0.25 m;
- 0.125 m;
- 0.0625 m only when bounded by sample/time limits.

Measure:
- sample count;
- occupied count;
- raw bytes;
- acceleration/SDF time;
- meshing time;
- output vertices/triangles;
- source→reconstruction error;
- actual visual fidelity.

Select the coarsest resolution that survives the visual handoff gate.

## 10. Source-versus-voxel fidelity gate

Use one shared neutral material and matched camera/light.

Compare:
- pristine render source;
- stamp-source mesh;
- each voxel reconstruction;
- second angle;
- silhouette/overlay view where useful.

Evaluate:
- silhouette;
- broad planes;
- bevel/edge character;
- asymmetry;
- major cuts/notches;
- base shape;
- identity at expected game distance.

Quantitative distance metrics support but never replace independent image review.

## 11. Pristine-to-destruction handoff

U4F must show:

1. pristine mesh visible;
2. dormant stamp available;
3. one bounded mining/subtractive edit;
4. MatterDomain changes;
5. bounded remesh publishes;
6. rendering hands off to the changed voxel mesh;
7. the asset still reads as the same rock.

Record initialization, mutation, remesh and total visible handoff timing.

The intended slow traversal/mining pace permits bounded impact feedback while work completes, but does not justify an unreported main-thread stall.

If the voxel mesh visibly changes the object's identity on first damage, that stamp resolution/source is not admitted.

## 12. Materials

U4F is primarily a geometry/stamp proof.

Preserve generated PBR as provenance/optional beauty evidence, but compare source and voxel meshes using the same neutral/projected rock material.

Longer term, active voxel surfaces need destruction-stable projected/triplanar/material-ID treatment. Do not let texture transfer become the first U4F blocker.

## 13. Physics settling — later U4G

Do not continue manually fitting multi-rock contacts.

U4G should test:
1. select 6–10 admitted stamps;
2. spawn them in an approximate arrangement;
3. give them cheap convex/compound proxies;
4. simulate gravity/collisions;
5. wait for sleep/stability;
6. bake resulting transforms;
7. render them static during ordinary play;
8. remove/mine a support;
9. wake affected pieces;
10. settle and freeze again.

Physics is a composition/disturbance tool, not the source of rock shape.

## 14. Weathering and variation

After a family has several admitted sources, derive variety through bounded:
- uniform scale;
- rotation;
- approved mirror variants;
- tint/material palette;
- wet/dry/dust;
- moss/lichen/crystal overlays;
- partial burial;
- erosion/weathering masks;
- settled combinations.

A library of dozens of good source stones can create far more formations than dozens of primitive formulas.

## 15. Owner-facing Unity workflow

U4F must be directly inspectable by Chris.

The stamp lab should work in Edit Mode and provide:
- imported pristine rock visible immediately;
- readable camera/light/background;
- source/voxel side-by-side or easy toggles;
- asset ID/resolution labels;
- preview regeneration;
- first-damage preview;
- reset to pristine;
- normal Scene-view/orbit inspection.

The U4E runtime-only content/blank Scene-view workflow must not carry forward.

## 16. Performance direction

Target mid-range Windows PCs.

Priorities:
- pristine instances render as normal meshes with LODs/instancing where possible;
- dormant stamps do not allocate dense mutable state per untouched instance;
- activate matter only near interaction/destruction;
- pre-bake source→SDF work offline;
- keep mutation/remesh regional;
- sleep/freeze settled physics.

Measure Editor and Player separately.

## 17. Persistence direction

Untouched placed stamp:
- stable asset/stamp ID/version;
- transform;
- variant metadata;
- no dense mutable snapshot.

Light edit:
- base stamp ID/version;
- accepted mutation journal.

Heavy edit:
- checkpoint + recent mutations.

Detached/moved:
- matter checkpoint or stamp+mutations;
- pose/actor state as later required.

An admitted asset stamp is another deterministic base under the existing “base + mutations + checkpoint” persistence direction.

## 18. Phase gates

### U4F — Asset-First Voxel Stamp Admission

One rock only:
- reviewed reference;
- generated/authored source;
- cleanup;
- Unity pristine render;
- closed stamp source;
- generic/bounded SDF bake;
- resolution comparison;
- selected reconstruction;
- first destructive edit/handoff;
- owner-visible stamp lab;
- tests/evidence.

### U4G — Settled Formation Proof

Only after U4F PASS.

Use several admitted stamps and prove physics-authored natural settlement plus bounded wake/re-settle.

### U4H — Asset Factory Automation

Only after U4F/U4G establish the route.

Automate:
reference author → reference review → generator → raw audit → cleanup → model review → stamp bake → fidelity review → catalog admission.

Mass generation before representative admission is prohibited.

## 19. Stop conditions

Stop and report HOLD rather than lowering the bar if:
- image-to-3D source does not resemble the target;
- topology cannot be repaired without losing identity;
- stamp-source becomes visibly generic;
- SDF bake cannot be made bounded without broad architecture change;
- no tested voxel resolution is credible for first-damage handoff;
- first damage visibly changes rock identity;
- the owner cannot inspect the result directly in Unity;
- the phase starts expanding into multi-rock physics, vegetation, streaming or U5.

U4F answers one question:

> Can Wildkin take a genuinely good external source model and turn it into a visually credible destructible voxel stamp without giving up the source asset's identity?
