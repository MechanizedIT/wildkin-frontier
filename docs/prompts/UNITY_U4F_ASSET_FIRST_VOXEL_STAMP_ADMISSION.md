
> **OWNER SUPERSESSION — DO NOT EXECUTE THIS PROMPT FROM THE CURRENT CHECKPOINT.**
>
> The first U4F run stopped at \`U4F_SOURCE_GENERATOR_HOLD\` before TRELLIS. The owner then rejected the generated \`u4f-rock-001\` reference set as insufficiently stylized/game-like. Candidate 04 is not an approved source target even though an independent reviewer previously selected it. Run \`docs/prompts/UNITY_U4FR_STYLIZED_REFERENCE_GATE.md\` first. Resume this full U4F pipeline only after Chris explicitly selects a new reference.
>
> When this full prompt is resumed later, continue in the **current root task**. Do not create or hand off to another durable Codex/ChatGPT task merely because this document says to use Luna/max reasoning.

# WILDKIN FRONTIER
# UNITY U4F — ASSET-FIRST VOXEL STAMP ADMISSION

Use a fresh **GPT-6 Luna Codex session with MAXIMUM available reasoning**.

This is the first implementation slice after the September 29 owner pivot away from fully procedural source-rock/formation generation.

Do **not** start U4E.3.
Do **not** start U4G.
Do **not** start U5.

The purpose is to take **one high-quality rock** through the entire new path:

`reviewed visual target
→ generated/authored 3D source
→ independent source review
→ cleanup
→ Unity pristine mesh
→ closed stamp-source mesh
→ true-SDF bake
→ multi-resolution voxel reconstruction
→ independent fidelity review
→ selected MatterDomain
→ one destructive edit / representation handoff
→ owner-visible Unity stamp lab`

This is a quality/architecture qualification, not a batch-production run.

---

## 0. EXPECTED REPOSITORY STATE

The last implementation checkpoint before the planning pivot is:

`b3affc06ffa53b5235162121ff8727572d2621a2`

One or more documentation-only planning commits containing `docs/ASSET_FIRST_VOXEL_PIPELINE.md` and this prompt may be ahead of that SHA.

At session start:

`git checkout main
git fetch origin
git status --short
git rev-parse HEAD
git rev-parse origin/main`

If HEAD/origin contain only the expected asset-first planning/docs changes after `b3affc06...`, continue.

If implementation code has advanced, inspect it before acting.

Preserve all unrelated local changes exactly as required by `AGENTS.md`.

Known pre-existing local dirt from prior sessions may include:
- HDRP settings changes;
- U3 readiness metrics;
- `Builds/`;
- `authoring/`;
- portable browser evidence.

Do not stage/reset/clean/stash them merely to simplify this phase.

---

## 1. REQUIRED READING

Read in this order:

1. `AGENTS.md`
2. `docs/CURRENT_SLICE.md`
3. `docs/SESSION_START.md`
4. `docs/ASSET_FIRST_VOXEL_PIPELINE.md`
5. `docs/UNITY_FIRST_TRANSITION_PLAN.md`
6. `docs/NATIVE_DESTRUCTION_REPRESENTATION.md`
7. `docs/SOURCE_GEOMETRY_MATTER_FIDELITY_PLAN.md`
8. `docs/LOCAL_MATTER_DOMAINS.md`
9. `docs/NATIVE_WORLD_PERSISTENCE_AND_UPDATES.md`
10. `.agents/skills/wildkin-asset-forge/SKILL.md`
11. `.agents/skills/wildkin-asset-forge/references/local-tools.md`
12. `.agents/skills/wildkin-asset-forge/references/dream-loop-production.md`
13. U4C2/U4C3/U4D evidence only as needed for source→SDF, topology and MatterDomain baselines
14. U4E/U4E.1/U4E.2 summaries only as context for why the procedural formation path stopped

Do not spend the session rereading all browser history.

---

## 2. OWNER INTENT

The target game is a high-fidelity PC-first alien-frontier game.

The environment should eventually contain many:
- rock families;
- rock formations;
- alien trees;
- roots;
- fungi;
- crystals;
- plants;
- geological features;
- ruins and other environment objects.

The owner does **not** want a world where every asset is obviously generated from the same procedural primitive formula.

The long-term intended workflow is an asset factory:

`concept/reference agent
→ reference reviewer
→ image-to-3D provider such as TRELLIS
→ raw-model audit
→ cleanup
→ model reviewer
→ voxel-stamp bake
→ voxel-fidelity reviewer
→ catalog admission
→ procedural composition/weathering/settling`

U4F proves only the representative one-rock path.

---

## 3. VISUAL TARGET FOR THE FIRST ROCK

Create a rock that belongs in the same broad shape language as the owner's September 29 reference formation:

- stylized but high quality;
- chunky, weighty boulder;
- broad planar faces;
- softened/beveled edges;
- asymmetric;
- compact;
- believable natural mass;
- several distinctive large face transitions;
- no primitive sphere/cube read;
- no soft metaball/clay read;
- no excessive tiny noise;
- no spikes or paper-thin features;
- no fused neighboring rocks;
- no obvious manufactured block;
- useful from multiple rotations in an alien biome.

This first object is an **individual rock**, not a pile/formation.

Material/color may be neutral stone for the technical comparison. The important U4F art gate is geometry and silhouette.

---

## 4. REFERENCE-AUTHOR LANE

Use a separate reference-author agent/tool where available.

Generate/select a small set of candidate single-rock images.

Preferred image-to-3D conditioning:

- single isolated rock;
- three-quarter view;
- simple white/neutral or transparent background;
- entire silhouette visible;
- no cast shadow merging into the rock;
- no grass, dirt, foliage or neighboring stones;
- no text;
- no UI;
- no dramatic depth-of-field;
- no tiny chips that only exist as texture;
- enough visible top/side volume that hidden geometry is plausible.

The reference author should target the shape language above, not recreate the entire owner formation.

Generate at most **4 initial reference candidates**.

---

## 5. INDEPENDENT REFERENCE REVIEW

A different agent reviews the actual image files.

Check:
- silhouette;
- mass hierarchy;
- planar/broad face language;
- edge treatment;
- accidental fused parts;
- impossible concavities;
- misleading shadow/background;
- whether image-to-3D can infer a closed solid;
- whether the design remains useful at game camera distance.

Select one reference.

If none is suitable, allow **one bounded reference regeneration/repair round**, then HOLD:

`U4F_REFERENCE_HOLD`

Do not waste TRELLIS runs on a bad reference.

Save:
- exact reference image;
- exact prompt;
- tool provenance;
- SHA-256;
- `reference-review.md`.

If the image tool does not expose a model version, record `undisclosed` exactly as the asset-forge skill requires.

---

## 6. SOURCE GENERATION PROVIDER

TRELLIS.2 is the first provider to try.

Important architectural rule:

**Do not make Wildkin code depend on TRELLIS.**

The final source boundary must accept ordinary triangle meshes.

Use existing guarded local tooling from `local-tools.md`.

Do not:
- install a new TRELLIS environment;
- update CUDA/Python/model packages;
- bypass memory reserve checks;
- disable face/export safety limits;
- launch concurrent TRELLIS jobs;
- close unrelated user work unless existing owner permission and tooling rules explicitly allow it.

Before generation:
- run the project TRELLIS status/headroom checks;
- record hardware/RAM/VRAM state;
- preserve current logs.

---

## 7. BOUNDED TRELLIS RUN

For the first attempt use the conservative proved local path.

Prefer:
- 512 generation resolution;
- at most 12 sampling steps;
- one job;
- one seed;
- conservative export;
- 1K texture if textured GLB is practical.

The rock's shape matters more than a 4K texture in U4F.

Preserve the raw result immediately.

If the first run is structurally bad, allow **one materially different seed/reference-conditioned retry**. If the first run is structurally good but visibly under-resolved, the second and final attempt may instead use 1024 generation resolution **only if the existing guarded tooling reports adequate headroom**. Do not lower any guard to make 1024 fit.

Maximum TRELLIS source attempts for U4F:

`2`

Do not repeat unchanged parameters because a reviewer disliked the result.

If local TRELLIS cannot complete safely, or both bounded outputs are unusable, return:

`U4F_SOURCE_GENERATOR_HOLD`

Record whether the blocker is:
- memory;
- export face ceiling;
- topology;
- source-image interpretation;
- tool/runtime failure.

Do not weaken guards.

---

## 8. RAW SOURCE AUDIT

Inspect each raw source in Blender/tooling.

Produce matched:
- front;
- rear;
- left;
- right;
- top;
- underside where useful;
- 3/4;
- wireframe;
- neutral material;
- optional generated-PBR beauty.

Record:
- path;
- hash;
- vertices;
- triangles;
- connected components;
- boundary edges;
- nonmanifold edges;
- degenerate triangles;
- bounds;
- scale;
- orientation;
- material/texture inventory.

A successful GLB export is not admission.

A good front view is not enough.

---

## 9. RAW SOURCE VISUAL GATE

An independent reviewer compares raw model renders to the selected reference.

Judge:
- silhouette;
- top/side form;
- distinctive face layout;
- overall weight;
- hidden-side plausibility;
- accidental holes/shells;
- whether cleanup can plausibly preserve the design.

If neither raw candidate is visually worth cleaning, return:

`U4F_SOURCE_VISUAL_HOLD`

Do not attempt heroic cleanup of a fundamentally wrong generation.

---

## 10. PRESERVE RAW MASTER

Never overwrite the chosen raw source.

Use a fresh source directory such as:

`art/source/u4f-rock-001/
  reference/
  raw/
  audit/
  cleanup/
  reviews/
  manifests/`

If a raw binary is too large for ordinary GitHub storage, do not force it into the commit. Keep it locally, record local path, SHA-256 and size, and commit receipts/review plus reasonably sized admitted derivatives. Do not introduce Git LFS without owner approval.

---

## 11. CREATE TWO CLEAN DERIVATIVES

### A. PRISTINE RENDER DERIVATIVE

Purpose:
- what an untouched rock can render as in the world.

Requirements:
- remove accidental detached junk;
- correct normals;
- normalize coordinate orientation;
- ground pivot sensibly;
- normalize to a documented world size;
- preserve broad shape;
- preserve generated PBR when useful;
- generate practical LODs if possible.

Do not blindly smooth away the planar/beveled language.

Provisional target size:
- roughly 2–4 m major dimension, suitable for a representative mineable boulder.

Provisional LOD guidance:
- LOD0: tens of thousands of triangles if needed;
- LOD1: materially reduced;
- LOD2: a few thousand or lower.

These are not hard budgets. Record actual numbers and visual effect.

### B. CLOSED STAMP-SOURCE DERIVATIVE

Purpose:
- deterministic signed-distance sampling.

Requirements:
- one coherent intended solid;
- closed/watertight enough for sign tests;
- no accidental internal/disconnected shells;
- nondegenerate;
- deterministic hash;
- same normalized coordinate frame as the render source;
- macro silhouette/forms visually matched to render source.

A voxel remesh, manual repair, shrinkwrap/remesh or equivalent cleanup is allowed.

Do not call it acceptable merely because it is watertight.

---

## 12. CLEANUP LIMIT

Allow:
- one primary cleanup pass;
- one focused repair if independent review finds a specific fixable defect.

If cleanup repeatedly destroys the target silhouette or cannot obtain a coherent closed stamp source, return:

`U4F_SOURCE_CLEANUP_HOLD`

Do not silently substitute a generic procedural stone.

---

## 13. CLEANUP REVIEW

Independent reviewer compares:

`reference
raw source
pristine render derivative
stamp-source derivative`

Require:
- pristine derivative preserves the selected source's identity;
- stamp-source derivative remains recognizably the same rock;
- no major face/silhouette collapse;
- no floating components.

Save matched views and review.

---

## 14. UNITY SOURCE IMPORT

Add the reviewed pristine derivative to the native Unity project under a clear asset-specific path, for example:

`native/unity/WildkinUnity/Assets/Wildkin/Art/Environment/Rocks/U4FRock001/`

Keep import code/data simple.

Create a neutral shared rock material for geometry comparison.

Generated PBR may be retained as an optional beauty material, but the fidelity matrix must include the shared neutral material.

Record Unity-imported:
- vertex/triangle counts;
- bounds;
- scale;
- orientation;
- material slots;
- source hash/receipt link.

---

## 15. FIX THE OWNER-VISIBLE UNITY WORKFLOW

The current U4E tech scene can look blank/white in Scene view because useful content is generated at runtime.

Do not repeat that.

Create an owner-facing U4F stamp lab, suggested path:

`Assets/Wildkin/Scenes/Tech/U4FAssetStampLab.unity`

When Chris opens the scene in Edit Mode he should immediately see a useful setup.

At minimum:
- dark/neutral background;
- readable key/fill light;
- imported pristine rock visibly present;
- scale reference or ground plane;
- camera/framing;
- clear hierarchy names.

Add explicit preview commands/menu items, such as:

- `Wildkin/U4F/Open Stamp Lab`
- `Wildkin/U4F/Generate Voxel Preview`
- `Wildkin/U4F/Show Source`
- `Wildkin/U4F/Show 0.25m`
- `Wildkin/U4F/Show 0.125m`
- `Wildkin/U4F/Show 0.0625m`
- `Wildkin/U4F/Apply First Damage`
- `Wildkin/U4F/Reset Pristine`
- `Wildkin/U4F/Capture Evidence`

Exact names may differ.

The owner must not need a hidden agent command or Play Mode just to see the asset.

---

## 16. GENERIC IMPORTED TRIANGLE-MESH BOUNDARY

Current `SourceMeshSignedDistance` / `MatterLocalVolume` is tied to `SculptedStoneMesh`.

Introduce the smallest clean provider-agnostic boundary needed for imported meshes.

Example concept:

`public interface IClosedTriangleMeshSource
{
    int VertexCount { get; }
    int TriangleCount { get; }
    MatterFloat3 GetVertex(int index);
    int GetIndex(int index);
    MatterFloat3 BoundsMin { get; }
    MatterFloat3 BoundsMax { get; }
    ulong DeterministicHash { get; }
}`

Names may differ.

Requirements:
- existing SculptedStone fixtures can adapt to it without regression;
- imported Unity mesh can be converted/copied at the Unity boundary;
- core matter/SDF code remains engine-light;
- no TRELLIS dependency in core.

Do not make `MatterDomain` store `UnityEngine.Mesh`.

---

## 17. OFFLINE SDF ACCELERATION

The existing exact sampler walks every source triangle per sample.

That is not acceptable as the long-term imported-mesh bake route.

For U4F, add a minimal deterministic offline spatial accelerator if required by the chosen mesh.

Recommended:
- triangle AABB/BVH;
- deterministic build order;
- nearest-distance traversal;
- ray-candidate traversal for parity/sign;
- existing winding fallback semantics where needed.

This is for **offline stamp baking**.

Do not turn it into a new runtime world BVH framework.

Provide focused correctness tests comparing accelerated samples against the old exact brute-force method on small fixtures.

For a small enough stamp-source mesh, retain the exact method as validation oracle.

---

## 18. STAMP BAKE ADAPTER

Bake the closed stamp source into the existing local matter model.

Preserve:
- positive inside density;
- negative outside density;
- material ID;
- bounded local sample coordinates;
- source-free MatterDomain initialization after bake.

Stable identifiers should include at least:
- asset ID;
- stamp schema/version;
- source/stamp-source hash;
- selected spacing.

Do not finalize a broad catalog schema.

---

## 19. RESOLUTION MATRIX

Attempt:

`0.25 m
0.125 m
0.0625 m`

Run 0.0625 only if:
- sample count stays under the existing/local bounded cap;
- memory is reasonable;
- bake completes without opening a broad optimization project.

For each row record:
- sample spacing;
- bounds;
- sample count;
- occupied count;
- raw payload bytes;
- source triangle count;
- SDF bake time;
- acceleration build time;
- Surface Nets time;
- region count;
- output vertices/triangles;
- topology diagnostics;
- source→reconstruction error metrics.

Do not assume 0.125 m is automatically the answer.

---

## 20. MATCHED VISUAL FIDELITY MATRIX

Produce 1920×1080 matched images using identical:
- camera;
- light;
- framing;
- neutral material.

Rows/columns should make it easy to compare:

`pristine render source
stamp-source mesh
0.25 reconstruction
0.125 reconstruction
0.0625 reconstruction (if run)`

Capture:
- primary 3/4;
- opposite/second angle;
- silhouette or overlay view;
- wireframe/debug as useful.

Also capture an optional PBR beauty view of the pristine asset.

---

## 21. FIDELITY REVIEW

Independent reviewer selects the **coarsest acceptable destruction resolution**.

Judge:
- silhouette;
- large faces;
- bevel/rounded edge character;
- distinctive cuts/notches;
- base shape;
- asymmetry;
- expected game-camera identity.

Quantitative error supports but does not replace visual review.

A finer row is not automatically selected if it adds little visible benefit.

If no tested resolution is visually close enough for a first-damage handoff, return:

`U4F_STAMP_FIDELITY_HOLD`

Do not hide a mismatch using a different camera/material.

---

## 22. PRISTINE / DORMANT REPRESENTATION

In the stamp lab:
- untouched object renders the pristine source mesh;
- selected stamp metadata/payload exists;
- no mutable MatterDomain is required for every pristine instance;
- source render mesh is clearly not the mutable matter authority.

This is a qualification path, not yet a world streaming system.

---

## 23. FIRST DESTRUCTIVE ACTIVATION

Create one explicit tech action.

Starting state:
- pristine render visible;
- dormant base stamp available.

On action:
1. create/restore selected `MatterDomain` from the base stamp;
2. apply one bounded subtractive sphere/mining edit;
3. rebuild only necessary Surface Nets regions;
4. publish current mesh revision;
5. hand visible rendering from pristine mesh to changed destructible mesh.

Use a visible impact point on the rock.

Record:
- initialization/decompression/copy time;
- edit time;
- changed samples;
- direct/rebuilt/reused regions;
- meshing time;
- total activation-to-visible time.

For U4F it may be synchronous if necessary, but record it honestly.

Do not claim production frame-time readiness from an Editor measurement.

---

## 24. HANDOFF VISUAL GATE

Capture:

`PRISTINE BEFORE
FIRST DAMAGE AFTER`

from at least two matched angles.

The damage should be visible, but the remaining rock must still read as the **same source asset**.

Reject if:
- silhouette globally changes unrelated to the hit;
- bevel/face language collapses;
- rock visibly shrinks/expands;
- reconstruction looks like a different generic stone;
- material jump makes comparison impossible.

If the handoff is visually unacceptable:

`U4F_HANDOFF_HOLD`

---

## 25. SOURCE-FREE ACTIVE STATE

After activation and first edit, prove the mutable state no longer needs the original source mesh to reconstruct destructible geometry.

At minimum:
- copy/save density/material state;
- release/ignore source geometry reference from the matter path;
- rebuild selected edited voxel mesh;
- content/mesh result deterministic for the same state.

Do not require production compression in U4F.

---

## 26. PERSISTENCE NOTE

Do not rewrite the production persistence system.

Record the intended identity:

Pristine untouched placement:
`asset/stamp ID + version + transform + variant metadata`

Edited:
`base stamp ID/version + accepted mutations`

Heavy edit:
`checkpoint + mutations`

This should align with `NATIVE_WORLD_PERSISTENCE_AND_UPDATES.md`.

---

## 27. MATERIAL SCOPE

Do not turn U4F into a texture-transfer research phase.

Required:
- neutral shared material comparison.

Optional:
- preserve generated PBR on pristine beauty source.

Active voxel mesh may use the existing projected/rest-space rock material.

If generated PBR cannot seamlessly survive topology changes, record that as later material work rather than blocking the geometry/stamp proof.

---

## 28. DO NOT START PHYSICS SETTLING

U4G will test:
- multiple admitted stamps;
- convex proxies;
- gravity settling;
- baked transforms;
- wake on support loss;
- sleep/freeze.

U4F may create a simple collider only for inspection.

Do not build the multi-rock physics system here.

---

## 29. AUTOMATED TESTS

Add focused tests for the new generic source/stamp path.

At minimum:

### Generic mesh adapter
- positions and indices preserved;
- bounds correct;
- deterministic hash stable;
- invalid/degenerate source rejected appropriately.

### Accelerated SDF
- accelerated nearest distance matches brute-force oracle on known fixtures within strict tolerance;
- inside/outside sign matches known closed-mesh cases;
- deterministic repeated builds/samples.

### Existing regression
- existing U4C2 sculpted-stone SDF tests stay green;
- U4C3 Surface Nets regressions stay green;
- MatterDomain tests stay green.

### Stamp determinism
Same stamp-source hash + spacing produces:
- identical sample bounds;
- identical density/material hash;
- identical reconstructed mesh hash.

### Activation
- pristine descriptor identifies selected stamp;
- activation creates MatterDomain;
- edit changes only intended domain;
- bounded regional remesh;
- source/stamp identity remains stable;
- source-free edited rebuild deterministic.

Run:
- focused U4F EditMode;
- full EditMode;
- full relevant PlayMode.

Current baseline before U4F:
- full EditMode: 166/166;
- PlayMode: 3/3.

Final counts must be >= baseline and all green.

---

## 30. PLAYER BUILD

A Windows x64 Development Player **is required if U4F reaches a candidate PASS**.

Use the U4F stamp lab or a thin runtime proof.

Player must:
- launch;
- show pristine source;
- trigger or automatically demonstrate first damage;
- show changed destructible mesh;
- exit cleanly;
- write a machine-readable receipt.

Record Editor and Player timings separately.

If U4F stops at an earlier generator/source/cleanup gate, a Player build is not required.

---

## 31. PERFORMANCE EVIDENCE

Record actual costs.

Source/model:
- raw triangles;
- cleaned render LOD triangles;
- stamp-source triangles;
- texture/file sizes where relevant.

Stamp:
- sample count;
- payload bytes;
- bake time;
- BVH build time;
- reconstruction time.

Activation:
- MatterDomain initialization;
- edit;
- remesh;
- total visible handoff.

Rendering:
- source LOD metrics;
- voxel mesh metrics.

Do not invent FPS claims.

The intended production direction is that pristine instances remain ordinary mesh/LOD renders and only interacted/dynamic objects pay mutable matter cost.

---

## 32. EVIDENCE DIRECTORY

Use:

`native/evidence/unity/u4f-asset-first-stamp/`

Suggested structure:

`README.md
receipt.json
review-reference.md
review-source.md
review-cleanup.md
review-fidelity.md
review-handoff.md
review-final.md

reference/
  selected.png
  prompt.txt
  manifest.json

source/
  generation-receipt.json
  raw-audit.json
  cleanup-manifest.json
  hashes.json

metrics/
  source.json
  stamp-025.json
  stamp-0125.json
  stamp-00625.json
  activation.json
  persistence.json

captures/
  raw-turntable.png
  clean-source-primary.png
  clean-source-opposite.png
  fidelity-primary.png
  fidelity-opposite.png
  silhouette-comparison.png
  pristine-before.png
  first-damage-after.png
  stamp-lab.png
  player-pristine.png
  player-damaged.png

tests/
  focused.json
  editmode.json
  playmode.json

player/
  build-receipt.json
  runtime-receipt.json`

Do not invent files that were not actually produced.

---

## 33. RESULT NAMES

Use the earliest honest terminal disposition.

Possible HOLDs:

`U4F_REFERENCE_HOLD
U4F_SOURCE_GENERATOR_HOLD
U4F_SOURCE_VISUAL_HOLD
U4F_SOURCE_CLEANUP_HOLD
U4F_STAMP_FIDELITY_HOLD
U4F_HANDOFF_HOLD
U4F_TECHNICAL_HOLD`

Candidate success:

`U4F_ASSET_FIRST_STAMP_CANDIDATE`

The implementer does not self-promote to final production architecture approval.

Independent reviewer gives the final bounded phase disposition.

---

## 34. PASS CRITERIA

A bounded U4F candidate requires all of the following:

### Reference
- mesh-ready individual rock reference independently accepted.

### Source generation
- one generated/authored 3D result visually worth keeping.

### Cleanup
- reviewed pristine render derivative;
- reviewed closed stamp-source derivative;
- no major silhouette/identity loss.

### Unity
- pristine mesh imports at correct scale/orientation;
- owner can see it in Edit Mode without entering Play mode.

### SDF/stamp
- generic imported source boundary;
- deterministic bounded SDF bake;
- no regression of accepted old fixtures;
- at least 0.25 and 0.125 tested;
- 0.0625 tested if bounded or explicit reason recorded.

### Fidelity
- one reconstruction resolution independently accepted as close enough for destruction handoff.

### Destruction
- one first edit changes matter;
- regional remesh works;
- source→voxel visual handoff retains rock identity.

### Persistence
- active edited state reconstructs without source mesh dependency.

### Validation
- focused tests green;
- full EditMode green;
- relevant PlayMode green;
- Windows Development Player proof if phase otherwise passes.

### Evidence
- actual source/review/metric/capture receipts saved.

---

## 35. HOLD INTERPRETATION

A HOLD is useful.

If source generation fails:
- do not blame MatterDomain.

If cleanup cannot produce a coherent closed source:
- generator/topology pipeline is the blocker.

If source is excellent but voxel reconstruction fails:
- stamp resolution/SDF/mesher path is the blocker.

If reconstruction is good but first hit looks wrong:
- dual-representation handoff/material/activation is the blocker.

Keep those conclusions separate.

---

## 36. INDEPENDENT FINAL REVIEW

Use a fresh reviewer that did not implement the pipeline.

Provide:
- this brief;
- selected reference;
- raw model views;
- cleaned render/stamp-source views;
- fidelity matrices;
- handoff captures;
- tests/metrics;
- actual implementation.

Reviewer questions:

1. Is the source rock actually closer to the desired art bar than the procedural U4/U4E rocks?
2. Did cleanup preserve its character?
3. Does the stamp-source still represent the same object?
4. Which voxel resolution is the lowest visually acceptable one?
5. Does first destruction preserve identity?
6. Is the Unity owner preview genuinely usable?
7. Is there a technical reason not to proceed to a later U4G settling proof?

Do not rewrite a negative review.

---

## 37. DOCUMENTATION

On completion update:
- `docs/CURRENT_SLICE.md`
- `docs/SESSION_START.md`
- `docs/ASSET_FIRST_VOXEL_PIPELINE.md`
- `docs/UNITY_FIRST_TRANSITION_PLAN.md`
- `docs/NATIVE_DESTRUCTION_REPRESENTATION.md`
- `docs/SOURCE_GEOMETRY_MATTER_FIDELITY_PLAN.md`
- `docs/CODE_MAP.md`
- `docs/BUILD_LOG.md`

Preserve historical U4/U4E evidence.

Do not rewrite old HOLDs as passes.

---

## 38. GIT CLOSURE

Work directly on `main` per `AGENTS.md`.

Before staging:

`git status --short`

Stage only U4F files.

Do not include unrelated HDRP/U3/build/authoring dirt.

Review:

`git diff --cached --stat
git diff --cached`

Suggested commit message:

`Implement Unity U4F asset-first voxel stamp qualification [skip ci]`

Push:

`git push origin main`

Verify:

`git rev-parse HEAD
git rev-parse origin/main`

Then STOP.

---

## 39. FINAL LUNA RESPONSE

Report:

`U4F RESULT:
<result name>

STARTING SHA:
<sha>

COMMIT:
<sha if committed>

REFERENCE:
candidate count
selected reference
reference review

TRELLIS / SOURCE GENERATION:
provider
settings
attempt count
raw output
resource behavior
source review

CLEANUP:
pristine render derivative
stamp-source derivative
topology
triangle counts
review

UNITY OWNER PREVIEW:
scene
Edit-Mode visibility
controls
known usability limitations

STAMP BAKE:
generic source adapter
SDF acceleration
0.25 metrics
0.125 metrics
0.0625 metrics / explicit skip reason

SELECTED RESOLUTION:
<spacing>
why

FIDELITY REVIEW:
source vs voxel
primary/opposite findings

FIRST DAMAGE HANDOFF:
activation
changed samples
regional remesh
timings
visual result

SOURCE-FREE ACTIVE STATE:
result

TESTS:
focused
full EditMode
PlayMode

WINDOWS PLAYER:
result / not required due earlier HOLD

INDEPENDENT FINAL REVIEW:
disposition
key finding

EVIDENCE:
native/evidence/unity/u4f-asset-first-stamp/

UNRELATED LOCAL WORK:
preserved list

NEXT RECOMMENDATION:
U4G settled formation proof
OR exact blocker to solve first

STOP FOR OWNER / CHATGPT REVIEW.

DO NOT START U4G OR U5.`
