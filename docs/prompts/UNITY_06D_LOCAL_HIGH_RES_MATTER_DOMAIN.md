# Copy-ready prompt — Unity U4D local high-resolution MatterDomain

Use this in a **fresh GPT-6 Luna session at the maximum available reasoning level** after pulling current `main`.

---

WILDKIN FRONTIER
UNITY U4D — LOCAL HIGH-RESOLUTION MATTER DOMAIN

MODEL

Use GPT-6 Luna with the MAXIMUM available reasoning.

This is a bounded architecture qualification.

Do NOT continue automatically into U4E, U5, Unreal, adaptive terrain
stitching, streaming, or production migration.

============================================================
0. OWNER AUTHORIZATION / STARTING POINT
============================================================

The owner authorizes U4D after U4C3 PASS at commit:

add897f1c3754bfe9b9884408023837c3bb12c7f

U4C3 established:

- topology-safe Surface Nets PASS within its documented genus-zero /
  face-topology qualification scope;
- all 12 U4C2 true-SDF rock rows reconstruct as closed connected
  manifolds;
- 0.25 m is already a visually credible ordinary detailed tier;
- 0.125 m is a credible preferred high-detail candidate;
- 0.0625 m is viable evidence for exceptional/hero detail but is not a
  default production spacing;
- true signed-distance preservation is materially better than the
  historical clipped/fixed-air representation;
- source geometry and true-SDF sampling are no longer the current
  blocker.

Known U4C3 scope limit:

- arbitrary trilinear interior topology is NOT fully solved;
- higher-genus closed surfaces are NOT yet qualified by the current
  validator.

Do not broaden U4D into solving those deferred topology classes unless
this phase produces a direct blocker.

============================================================
1. PRIMARY QUESTION
============================================================

Can Wildkin support a detailed object-local authoritative matter volume
at 0.125 m while the surrounding world remains 0.50 m, WITHOUT:

- refining the whole terrain;
- sharing one adaptive mesh grid;
- implementing coarse/fine terrain stitching;
- depending on the original source mesh at runtime;
- duplicating physical ownership into the world field?

The desired architecture is:

0.50 m WORLD TERRAIN
        +
independent 0.25 / 0.125 m LOCAL MATTER DOMAINS

A detailed rock should behave like a self-contained destructible
volumetric object placed in the world.

This phase proves the DOMAIN abstraction.

It does NOT yet prove collapse, rigid-body physics, support transfer, or
full gameplay destruction.

============================================================
2. REPOSITORY START
============================================================

Work directly on main according to AGENTS.md.

First:

git checkout main
git pull origin main
git status

Preserve unrelated/untracked work.

Do not reset, clean, delete, stage, or absorb unrelated:

- authoring/
- Builds/
- historical browser evidence
- owner work outside this task

Read at minimum:

AGENTS.md
docs/CURRENT_SLICE.md
docs/SESSION_START.md
docs/UNITY_FIRST_TRANSITION_PLAN.md
docs/SOURCE_GEOMETRY_MATTER_FIDELITY_PLAN.md
docs/NATIVE_DESTRUCTION_REPRESENTATION.md

native/evidence/unity/u4c2-sculpted-source/README.md
native/evidence/unity/u4c2-sculpted-source/receipt.json
native/evidence/unity/u4c3-topology-safe-surface-nets/README.md
native/evidence/unity/u4c3-topology-safe-surface-nets/receipt.json

Inspect relevant implementation:

Assets/Wildkin/Matter/Core/MatterWorld*
Assets/Wildkin/Matter/Core/MatterLocalVolume.cs
Assets/Wildkin/Matter/Core/MatterRegionSnapshot.cs
Assets/Wildkin/Matter/Core/MatterMeshers.cs
Assets/Wildkin/Matter/Core/MatterSurfaceNetsTopology.cs
Assets/Wildkin/Matter/Core/SourceMeshSignedDistance.cs
Assets/Wildkin/Matter/Core/SculptedStone*
Assets/Wildkin/Matter/Unity/*
Assets/Wildkin/AgentTools/Editor/*

Verify existing tests start green.

============================================================
3. ARCHITECTURAL TARGET
============================================================

Introduce a bounded production-direction abstraction named something
equivalent to:

MatterDomain

A MatterDomain is an authoritative local matter volume with:

- stable domain ID;
- local integer sample coordinates;
- independent sample spacing;
- local sample bounds;
- density;
- resolved material;
- local content revision;
- world transform;
- source-free runtime authority;
- deterministic Surface Nets reconstruction;
- local edits;
- save/reload.

Conceptually:

SOURCE MESH / PROCEDURAL STAMP
        ↓ one-time bake
TRUE SDF LOCAL MATTER
        ↓
MatterDomain authority
        ↓
Surface Nets
        ↓
Unity render object

After initialization:

THE SOURCE MESH IS NOT RUNTIME AUTHORITY.

The domain must remain reconstructable/editable after the source mesh or
procedural recipe is absent.

============================================================
4. DO NOT CONFLATE DOMAIN WITH MATTERACTOR
============================================================

MatterDomain is the volumetric authority.

MatterActor is a later gameplay/physics owner that may contain or point
to a MatterDomain.

For U4D:

MatterDomain:
- YES

Rigidbody / falling:
- NO

support/collapse:
- NO

world→actor ownership transfer:
- NO

fracture:
- NO

resource rewards:
- NO

U4D should make later MatterActor integration easier without prematurely
implementing it.

============================================================
5. LOCAL COORDINATE CONTRACT
============================================================

Define domain coordinates explicitly.

A domain needs:

DOMAIN SAMPLE SPACE
- integer local sample address

DOMAIN METRIC SPACE
- sample position in meters relative to domain origin

WORLD SPACE
- Unity/world position after domain transform

Required conversions:

local sample → local meters
local meters → world
world → local meters
world → nearest/floor sample coordinate as appropriate

Do not use transformed floating-point position as authoritative matter
identity.

Integer local sample address remains the identity inside a domain.

The same domain data must survive arbitrary world translation and
rotation without reindexing its samples.

============================================================
6. DOMAIN TRANSFORM
============================================================

A domain needs an explicit world transform independent of its matter
arrays.

At minimum support:

- position
- rotation

Uniform scale may remain 1.0 for U4D unless there is a compelling reason
to support it.

Do NOT bake arbitrary Unity Transform scale into matter identity.

If nonuniform scaling is desired later, treat it as a generation-time
operation unless a later phase proves a safe runtime contract.

Required proof:

1. create domain;
2. record matter hash;
3. translate + rotate domain;
4. matter hash remains unchanged;
5. rendered object moves correctly;
6. a world-space edit maps to the correct transformed local matter.

============================================================
7. SAMPLE SPACING
============================================================

MatterDomain must own its own spacing.

Required tiers in one scene:

WORLD:
0.50 m

LOCAL DOMAIN A:
0.25 m

LOCAL DOMAIN B:
0.125 m

Optional diagnostic:

LOCAL DOMAIN C:
0.0625 m

Do not introduce a global static "current voxel size".

Every algorithm operating on a domain must get spacing from that domain
or its read-only grid contract.

Add tests specifically designed to catch accidental 0.50 m assumptions.

============================================================
8. STORAGE MODEL
============================================================

U4D is a bounded local-domain proof.

Do NOT build a world-scale sparse octree.

Preferred starting storage:

- contiguous dense arrays for the bounded local domain;
- one density value per owned sample;
- one compact material value per owned sample;
- explicit dimensions / bounds;
- no GameObject per sample;
- no Dictionary per voxel.

If existing MatterLocalVolume can be generalized cleanly, evolve it
rather than duplicating the same concept under a second implementation.

However:

do not leave the result as a read-only "fidelity experiment" wrapper.

The U4D domain must be an EDITABLE authoritative runtime structure.

Record raw payload bytes.

Also estimate total practical domain memory where measurable, but label
raw payload vs managed/runtime overhead honestly.

============================================================
9. INITIALIZATION / BAKING
============================================================

Support at least one initialization path:

accepted SculptedStone source mesh
        ↓
SourceMeshSignedDistance
        ↓
MatterDomain

Use true signed distance.

Use positive-solid / non-positive-air convention consistently with the
existing matter code.

Material:
ROCK for positive samples
AIR for non-positive samples

The source object is only used to create the domain.

Required source-independence test:

- build a domain;
- serialize or clone/freeze its matter state;
- discard all references to the source mesh/generator;
- reconstruct/render the domain from matter alone;
- hash/topology match the expected domain result.

Do not regenerate from the source after accepted edits.

============================================================
10. LOCAL EDIT AUTHORITY
============================================================

Implement the smallest useful local edit API.

At minimum:

RemoveSphereLocal(center, radius)

or an equivalent material-aware carve operation.

Also provide a world-space wrapper:

RemoveSphereWorld(worldCenter, radius)

that transforms the query into domain local coordinates.

Required behavior:

- only domain matter changes;
- world MatterWorld remains byte/hash/revision unchanged;
- domain revision increments exactly once for accepted change;
- no-op edit does not increment revision;
- edited matter stays removed;
- remesh reflects the cavity;
- material remains consistent with density;
- source mesh is never consulted to "heal" the edit.

Use distance-aware editing where practical rather than binary occupancy
if that keeps a coherent SDF near the new cut.

Do not overbuild final material-specific mining behavior.

============================================================
11. SDF EDIT QUALITY
============================================================

Because detailed domains now rely on true SDF, avoid replacing the entire
field with binary occupancy after the first edit.

For a subtractive spherical edit, a standard SDF-style operation is
appropriate conceptually:

newDensity = min(existingDensity, negativeCutField)

adjusted for the project's positive-solid convention.

Use a mathematically consistent formulation.

The exact implementation may differ, but demonstrate:

- new cut surface has useful signed values on both sides;
- repeated nearby edits compose deterministically;
- Surface Nets does not receive a fixed-air cliff everywhere around the
  cut.

Add an analytic/simple-field test for the subtraction behavior.

============================================================
12. WORLD + LOCAL DOMAIN COEXISTENCE
============================================================

Create a tech scene with:

- coarse 0.50 m world terrain;
- one 0.25 m local rock;
- one 0.125 m local rock.

The domains must render independently over/near the terrain.

Do NOT stitch their meshes to the terrain.

Do NOT resample the terrain around them to the rock spacing.

Do NOT union them into one field.

For U4D, place them in physical contact or visually grounded with minimal
or no meaningful volumetric overlap.

Avoid creating an unresolved double-ownership volume inside terrain.

If a tiny contact/interpenetration is necessary for presentation, record
it explicitly and do not claim shared volumetric ownership.

============================================================
13. RENDERING / MESHING
============================================================

Use the U4C3-qualified topology-aware Surface Nets path.

A MatterDomain must expose the existing read-only grid contract or a
clean generalized equivalent.

Do not copy/paste another Surface Nets implementation.

Required:

- meshing respects domain spacing;
- topology-safe component keys survive multi-brick local domains;
- local mesh vertices are generated in domain-local metric coordinates;
- Unity object transform places them in world space;
- remeshing after edit uses current matter only.

Preserve source/rest coordinates needed by the stylized material system.

============================================================
14. LOCAL DOMAIN BRICKS / REGIONS
============================================================

A large local object may span multiple 16-cell meshing regions.

Prove at least one 0.125 m rock spans more than one logical meshing
region/brick in one axis.

Meshing must:

- use read-only halo samples;
- preserve unique sample authority;
- combine topology-safe vertex keys correctly;
- produce a crack-free manifold object;
- not duplicate halo matter.

Do not create duplicate physical ownership just because multiple mesh
regions read the same sample.

============================================================
15. DIRTY REGION / INCREMENTAL REMESH
============================================================

Do not blindly remesh every logical region in a domain after a tiny edit
if the affected set can be derived cheaply.

Implement a bounded dirty-region calculation:

changed local samples
        ↓
dependent cells
        ↓
affected meshing regions
        ↓
rebuild only those regions plus required seam neighbors

Record:

- total domain mesh regions;
- directly changed regions;
- final rebuilt regions;
- reused regions.

The first implementation may republish one combined Unity Mesh if that
is simpler, but CPU meshing work should still be instrumented by dirty
region.

If combined mesh publication forces a full mesh combine, distinguish:

- local scalar/edit work;
- regional remesh work;
- final publication/combine work.

Do not hide whole-domain work under a "local edit" label.

============================================================
16. DOMAIN REVISION / PRODUCT REVISION
============================================================

Track at least:

contentRevision
meshRevision

An accepted matter edit advances content revision.

A successfully published mesh corresponds to a specific content revision.

Do not publish stale mesh results over newer content.

You do not need a full async job scheduler yet.

But add a deterministic stale-result test or staging contract that makes
the later async path possible.

============================================================
17. SERIALIZATION
============================================================

Create a bounded U4D persistence format for MatterDomain.

Must preserve:

- stable domain ID;
- sample spacing;
- sample bounds/dimensions;
- density;
- material;
- content revision;
- world transform;
- enough metadata to remesh without source geometry.

Do NOT serialize:

- Unity Mesh;
- collider;
- source SculptedStoneMesh as required authority.

JSON plus binary/base64 is acceptable only if clearly labeled
qualification-only.

A compact binary payload is also acceptable if simple.

Required literal proof:

1. create 0.125 domain;
2. edit it;
3. rotate/translate it;
4. save;
5. destroy runtime instance;
6. load;
7. source geometry unavailable;
8. matter hash matches;
9. transform matches;
10. rendered/remeshed geometry matches;
11. removed cavity stays removed.

============================================================
18. DOMAIN HASH / IDENTITY
============================================================

Create deterministic diagnostics for:

MatterDomain content hash:
- density
- material
- dimensions
- spacing

Transform should NOT be part of matter-content hash.

Optionally create a separate full-state hash including transform.

This lets later MatterActor movement prove that:

same matter
+
different pose

does not mutate the matter itself.

============================================================
19. WORLD-SPACE TARGETING PROOF
============================================================

Do not implement full gameplay mining.

But prove the coordinate architecture needed by U5.

Add a deterministic query such as:

TrySampleWorldPoint
or
ApplyWorldEdit

For a translated + rotated 0.125 domain:

- choose a known local surface/cavity target;
- transform it into world space;
- issue a world-space edit;
- verify the expected local samples changed.

Then issue the same world-space coordinate against its OLD pose.

It must not modify the moved domain.

This is a manual-transform proof, not physics.

============================================================
20. MATERIAL / REST-SPACE PROJECTION
============================================================

Reuse the existing U4 material/rest-space work where appropriate.

The detailed rock should keep stable projected material coordinates when
its domain transform changes.

Required visual proof:

- rock at pose A;
- same rock translated/rotated to pose B;
- material detail moves with the rock rather than swimming through it.

Do not spend U4D rebuilding final rock textures.

The objective is transform correctness.

============================================================
21. DOMAIN CONTACT WITH WORLD
============================================================

No support/collapse system is required.

However, establish a minimal contact/placement diagnostic.

For each local rock record:

- world-space bounds;
- terrain contact point/height;
- whether its domain AABB overlaps occupied world matter beyond a small
  allowed presentation tolerance.

Preferred qualification:
no authoritative overlap.

If overlap is intentionally used, explicitly record:

- overlap sample/volume estimate;
- which authority wins a query;
- why this is temporary.

Do not silently create double matter.

============================================================
22. MULTIPLE DOMAINS
============================================================

The architecture must support more than one local domain.

In one scene instantiate at least:

- one 0.25 m rock;
- one 0.125 m rock.

Give each:

- distinct stable ID;
- separate revision;
- separate transform;
- separate content hash.

Edit only one.

Prove:

- other domain unchanged;
- world unchanged;
- only edited domain remeshes.

This guards against accidental singleton/global-domain design.

============================================================
23. OPTIONAL 0.0625 m HERO DIAGNOSTIC
============================================================

0.0625 m is NOT a mandatory runtime tier.

Use it only as a bounded optional comparison if time/performance is
reasonable.

If included, record:

- sample count;
- raw memory;
- meshing time;
- edit/remesh time.

Do not let 0.0625 m complexity block U4D if 0.125 m passes.

============================================================
24. PERFORMANCE MEASUREMENTS
============================================================

Measure at minimum for the hero 0.125 m domain:

INITIALIZATION
- source/SDF bake time
- allocation/raw payload bytes

INITIAL MESH
- regions
- Surface Nets CPU
- mesh combine/publication

LOCAL EDIT
- samples examined/changed
- dirty regions
- remeshed regions
- reused regions
- Surface Nets CPU
- publication
- total edit-to-visible latency

SAVE
- serialization time
- payload size

LOAD
- deserialize time
- remesh time

TRANSFORM
- verify transform itself does NOT trigger matter resampling/remeshing

Also record equivalent high-level numbers for the 0.25 m domain.

Use Editor values and one Windows Player observation where practical.

These are qualification measurements, not final production budgets.

============================================================
25. TESTS — DOMAIN CORE
============================================================

Add focused EditMode tests for:

IDENTITY
- stable domain ID
- independent IDs for multiple domains

SPACING
- 0.25 and 0.125 coexist
- no global spacing leakage

COORDINATES
- local sample → meters
- local → world
- world → local
- translated domain
- rotated domain
- negative local sample addresses if supported by bounds

SOURCE INDEPENDENCE
- domain can reconstruct after source reference is discarded

CONTENT HASH
- pose change does not change matter hash
- edit changes matter hash

REVISION
- accepted edit increments exactly once
- no-op edit does not increment

============================================================
26. TESTS — EDIT / SDF
============================================================

Required:

- spherical subtraction analytic/simple test;
- cut creates AIR where expected;
- unaffected samples remain identical;
- repeated same edit is deterministic/no-op when already empty;
- nearby edits compose;
- cut surface retains signed-distance character;
- material matches resulting occupancy;
- source cannot regenerate cavity;
- world-space edit maps correctly through rotation/translation.

============================================================
27. TESTS — MESH / REGION
============================================================

Required:

- 0.125 hero spans multiple meshing regions;
- combined mesh is closed/manifold within current U4C3 qualification;
- no crack at internal region boundaries;
- no duplicate topology-safe patch weld;
- edit dirties expected bounded region set;
- untouched regions retain prior mesh hashes;
- stale mesh publication cannot overwrite newer revision;
- moved transform does not remesh.

Preserve all U4C3 topology regressions.

============================================================
28. TESTS — SAVE / RELOAD
============================================================

Required:

- domain state round trip;
- spacing exact;
- dimensions exact;
- density/material hash exact;
- content revision exact;
- transform round trip;
- edited cavity remains;
- source geometry not needed;
- independently remeshed loaded geometry deterministic.

Add a corrupted/version-mismatch save failure test if easy and bounded.

Do not design final long-term save migration.

============================================================
29. TESTS — WORLD ISOLATION
============================================================

Create a known 0.50 m MatterWorld fixture.

Record its:

- content hash/revision;
- sample counts.

Create/edit/move/save/reload local domains.

Assert the world remains unchanged.

Likewise:

edit Domain A
→ Domain B unchanged.

This is a hard U4D invariant.

============================================================
30. AGENT TOOLS
============================================================

Extend the existing Wildkin Unity agent/editor command path.

Useful commands:

create_matter_domain
inspect_matter_domain
list_matter_domains
edit_matter_domain_local
edit_matter_domain_world
move_matter_domain
save_reload_matter_domain
capture_u4d_scene
export_u4d_receipt

Machine-readable inspection should include:

- ID
- spacing
- dimensions
- sample count
- occupied count
- content revision
- mesh revision
- transform
- matter hash
- mesh hash
- region count
- dirty/rebuilt/reused region stats

Do not create a parallel debug authority.

Commands must use the actual runtime/domain implementation.

============================================================
31. HUMAN-VISIBLE TECH SCENE
============================================================

Create a clean U4D tech scene.

Suggested layout:

LEFT:
0.50 m terrain + 0.25 m rock

RIGHT:
0.50 m terrain + 0.125 m hero rock

Show:

- neutral/stylized material;
- clear physical scale reference;
- domain bounds overlay toggle;
- meshing-region overlay toggle.

Capture:

01 overview
02 0.25 rock close-up
03 0.125 rock close-up
04 domain/world debug overlay
05 0.125 after local cavity edit
06 same edited domain translated/rotated
07 save/reload result

Primary beauty captures should have overlays off.

============================================================
32. EDIT / MOVE / RELOAD DEMONSTRATION
============================================================

The flagship sequence should be:

A. build accepted source rock into 0.125 MatterDomain
B. render beside/on 0.50 world
C. remove a visible chunk/cavity
D. remesh only affected local regions
E. record matter hash/revision
F. translate + rotate the domain manually
G. prove same matter hash
H. target/edit the moved domain in world space
I. save
J. destroy runtime object
K. reload WITHOUT source geometry
L. remesh
M. prove both edits and moved pose persist

This is the most important U4D proof.

============================================================
33. NO ADAPTIVE TERRAIN STITCHING
============================================================

Do not implement:

- Transvoxel;
- adaptive octree terrain;
- mixed-resolution terrain mesh transitions;
- 0.50↔0.125 shared iso-surface;
- dynamic terrain refinement.

The entire hypothesis being tested is that many important detailed
objects can avoid that complexity by owning independent local domains.

If U4D cannot succeed without cross-resolution stitching, that is a
meaningful architectural finding and should be reported rather than
hidden.

============================================================
34. NO PHYSICS / SUPPORT / FRACTURE
============================================================

Do not implement:

- Rigidbody;
- convex decomposition;
- support graph;
- world→actor detachment;
- gravity;
- fracture;
- actor splitting;
- resource accounting.

Those belong to U5 and later.

A manually moved transform is sufficient to prove domain-local matter
independence.

============================================================
35. GENERATED / SCANNED MODEL FUTURE COMPATIBILITY
============================================================

Review the domain initialization boundary with the future asset-library
workflow in mind.

A future source might be:

- procedural SculptedStone;
- Blender mesh;
- TRELLIS/AI-generated rock;
- photogrammetry/scanned mesh;
- artist-authored GLB/FBX.

U4D must NOT couple MatterDomain to SculptedStone-specific concepts.

The intended boundary is:

VALIDATED CLOSED SOURCE MESH
        ↓
mesh-to-SDF bake
        ↓
MatterDomain

Keep source admission/conversion separate from runtime domain authority.

Do not add import pipelines or AI generation in U4D.

Document whether the API remains compatible with arbitrary validated
closed source meshes.

============================================================
36. TOPOLOGY LIMIT CARRY-FORWARD
============================================================

Preserve the U4C3 limitation explicitly.

Do NOT claim:

"Surface Nets is topology-safe for arbitrary scalar fields."

The accepted claim remains bounded:

- qualified recorded genus-zero source family;
- 256 sign masks / orientations;
- face-saddle decider;
- deterministic stress evidence;
- known unsupported trilinear interior-connectivity class.

U4D should not widen that claim.

If a normal U4D edit unexpectedly triggers the known interior ambiguity,
freeze it as evidence and report whether it blocks the local-domain
architecture.

Do not silently alter the field to avoid it.

============================================================
37. EVIDENCE
============================================================

Create:

native/evidence/unity/u4d-local-matter-domain/

Include:

README.md
receipt.json

captures/
    01-overview.png
    02-025-domain.png
    03-0125-domain.png
    04-debug-domains.png
    05-edited-domain.png
    06-moved-domain.png
    07-reloaded-domain.png

tests/
    focused summary
    full EditMode summary
    PlayMode summary

metrics/
    domain-025.json
    domain-0125.json
    edit-0125.json
    persistence-0125.json

player/
    capture.png
    receipt.json

Receipt should explicitly distinguish:

WORLD SPACING:
0.50 m

DOMAIN A:
0.25 m

DOMAIN B:
0.125 m

and whether 0.0625 was tested optionally.

============================================================
38. VALIDATION SEQUENCE
============================================================

Recommended order:

A. existing baseline tests
B. MatterDomain pure-core tests
C. coordinate/transform tests
D. SDF edit tests
E. multi-spacing tests
F. multi-domain isolation tests
G. regional remesh tests
H. persistence/source-independence tests
I. flagship Editor sequence
J. focused visual review
K. full EditMode
L. full PlayMode
M. Windows x64 Development Build
N. standalone player flagship capture
O. independent read-only review

Do not run a Windows build after every edit.

Use focused tests during implementation.

============================================================
39. INDEPENDENT REVIEW
============================================================

Before final disposition, perform an independent read-only review.

Inspect:

- MatterDomain ownership/data model;
- spacing assumptions;
- local/world coordinate transforms;
- source independence;
- edit/SDF composition;
- dirty-region derivation;
- mesh revision/stale publication contract;
- persistence;
- multi-domain isolation;
- world isolation;
- visual captures;
- Player evidence;
- metrics;
- tests.

Look specifically for:

- hidden global 0.50 m assumptions;
- source mesh still being required after bake;
- transform accidentally changing matter identity;
- whole-world or whole-domain rebuild hidden behind local API;
- duplicate sample authority at local brick seams;
- domain/world physical overlap being ignored;
- domain singleton/global state;
- stale mesh publication;
- save file depending on generated Unity Mesh data.

============================================================
40. PASS / HOLD DECISION
============================================================

Allowed final dispositions:

LOCAL_DOMAIN_0_125_PASS

LOCAL_DOMAIN_0_25_ONLY

LOCAL_DOMAIN_HOLD

REPRESENTATION_HOLD

LOCAL_DOMAIN_0_125_PASS requires:

- 0.50 world and 0.125 local domain coexist independently;
- no adaptive stitching;
- no world refinement;
- source-independent runtime authority;
- local edit + remesh works;
- world-space moved-pose edit maps correctly;
- transform does not mutate matter hash;
- save/reload works without source geometry;
- multi-domain isolation works;
- bounded dirty-region remesh is demonstrated;
- topology remains valid within current qualification scope;
- tests/build/player evidence pass;
- independent review passes.

LOCAL_DOMAIN_0_25_ONLY if:

0.25 works cleanly but 0.125 exposes a practical architectural or
performance blocker.

LOCAL_DOMAIN_HOLD if:

the domain abstraction itself is incomplete but likely repairable.

REPRESENTATION_HOLD if:

independent-spacing local matter fundamentally conflicts with the current
authority/meshing/persistence model.

============================================================
41. IF PASS — NEXT RECOMMENDATION
============================================================

If result is LOCAL_DOMAIN_0_125_PASS:

recommend:

UNITY U4E — PROCEDURAL FORMATIONS FROM HIGH-QUALITY MATTER STONES

U4E should:

- create several individually generated stones;
- bake each into its own local MatterDomain;
- compose deterministic formations from multiple domains;
- test scale hierarchy / placement / contact / gaps;
- produce a 20-seed formation gallery;
- preserve individual-domain destructibility;
- avoid melting every formation into one SDF by default.

After U4E, proceed toward U5 destruction.

Do NOT start U4E automatically.

============================================================
42. DOCUMENTATION / GIT
============================================================

Update as appropriate:

docs/CURRENT_SLICE.md
docs/SESSION_START.md
docs/CODE_MAP.md
docs/BUILD_LOG.md
docs/SOURCE_GEOMETRY_MATTER_FIDELITY_PLAN.md
docs/UNITY_FIRST_TRANSITION_PLAN.md

Preserve U4/U4B/U4C/U4C2/U4C3 history.

Commit cohesive completed work directly to main.

Push to origin/main if authorized by project instructions.

Verify remote head.

============================================================
43. FINAL RESPONSE
============================================================

Report:

U4D RESULT:
<allowed disposition>

COMMIT:
<hash>

DOMAIN ARCHITECTURE:
- storage
- ID
- spacing
- coordinates
- transform
- revisions

WORLD / DOMAIN:
0.50 world + 0.25 + 0.125 result

SOURCE INDEPENDENCE:
result

LOCAL EDIT:
result

DIRTY REMESH:
changed / rebuilt / reused regions

MOVED-POSE WORLD EDIT:
result

PERSISTENCE:
result

MATTER HASH VS TRANSFORM:
result

TOPOLOGY:
result + carried scope limitation

PERFORMANCE:
0.25
0.125
optional 0.0625

TESTS:
focused
EditMode
PlayMode

WINDOWS BUILD / PLAYER:
result

EVIDENCE:
path

KNOWN LIMITATIONS:
...

NEXT RECOMMENDATION:
U4E / HOLD

STOP FOR OWNER REVIEW.

Do not begin U4E or U5.
