# Copy-ready prompt — Unity U4 stylized materials + procedural rock stamp

Use only after the Unity mesher/resolution checkpoint is reviewed and a provisional surface direction is selected.

---

WILDKIN FRONTIER
UNITY NATIVE TRANSITION — U4
STYLIZED MATTER MATERIALS + PROCEDURAL ROCK STAMP

ROLE

Make the native matter specimen look like a plausible stylized PC game
asset while proving that procedural variation can replace a tiny repeated
rock-model library.

This phase is visual + procedural.

Do NOT port collapse yet.
Do NOT start Unreal.
Do NOT hide poor matter geometry behind extreme shader noise.

============================================================
0. BASELINE
============================================================

Read:

- docs/UNITY_FIRST_TRANSITION_PLAN.md
- docs/PC_ENGINE_BAKEOFF_PLAN.md
- selected U3 mesher/resolution report/evidence
- native/shared/reference/PHASE05E_REFERENCE.json

Verify tests/build/agent tooling are green.

Use the selected mesher and primary resolution from U3.

If U3 retained two candidates, keep both only where the visual comparison
requires it; do not duplicate all work.

============================================================
1. VISUAL TARGET
============================================================

Target art language:

- stylized mid/high-detail 3D
- not photorealistic
- not Minecraft/block cubes
- not extremely low-poly
- strong readable silhouette
- broad intentional planes
- rounded/beveled edges
- restrained faceting
- believable surface texture/detail

Hero rock formation should resemble an authored stacked-rock prop:

- several interlocking masses
- varied proportions
- large cap/side stones
- small filler stones
- broad planar-ish faces
- softened corners
- asymmetry
- compact coherent formation rather than a random noise blob

============================================================
2. MATTER SURFACE MATERIAL ARCHITECTURE
============================================================

Implement a stylized surface material system compatible with dynamic
runtime geometry.

At minimum support:

ROCK
DIRT

Geometry remains one matter surface where appropriate.

Material identity/weight comes from the authoritative matter mesh data.

Do not create overlapping coplanar rock/dirt meshes to fake the boundary.

============================================================
3. ROCK MATERIAL
============================================================

Create one production-direction rock material prototype with:

- projected/triplanar or stable rest/object-space mapping
- base color/albedo variation
- normal detail
- roughness variation
- low-frequency macro tint variation
- optional restrained curvature/slope accents
- no obvious UV stretching
- no texture scale changing unpredictably with mesh topology

The material should enhance the broad low-poly planes rather than cover
them with noisy photoreal detail.

Prefer parameterized material instances/presets over duplicated shaders.

============================================================
4. DIRT MATERIAL
============================================================

Create a clearly different dirt treatment:

- warmer/earthier base
- softer/smaller surface detail
- distinct roughness response
- macro color variation
- optional subtle tiny-stone detail

Do not make dirt look like brown-painted rock.

============================================================
5. MATERIAL BOUNDARY
============================================================

Use matter material weights/identity to produce a narrow stable rock↔dirt
transition.

Requirements:

- transition can cross a triangle interior
- no old triangle-majority sawtooth look
- no z-fighting
- no duplicate internal boundary mesh
- no broad muddy blend unless art direction explicitly benefits

Capture close-up evidence.

============================================================
6. STATIC VS DYNAMIC TEXTURE COORDINATES
============================================================

Test the future MatterActor requirement now.

STATIC TERRAIN:
world-space projection is acceptable.

MOVING TEST OBJECT:
material must move with the object.

Use:

- object/rest-space coordinates
- stored reference position
- or another stable approach

so a detached rock later will not show texture swimming as it moves and
rotates.

Create an automated moving/rotating rock test and capture before/after.

============================================================
7. PROCEDURAL ROCKFORMATIONSTAMP
============================================================

Create a deterministic seed-driven RockFormationStamp.

Inputs should include a bounded, understandable parameter set such as:

- seed
- overall dimensions
- primitive count range
- primitive family weights
- scale distribution
- rotation range
- vertical stacking bias
- flattening
- bevel/rounding radius
- overlap/union softness
- low-frequency warp/erosion strength

Possible source primitives:

- rounded boxes
- slabs
- ellipsoids
- wedges
- capsules only if useful

Do not use dozens of arbitrary noise octaves to create complexity.

The result should feel art-directed and explainable.

============================================================
8. SDF / MATTER STAMP CONTRACT
============================================================

The generator should produce an SDF/source function or equivalent matter
source.

Pipeline:

seed parameters
→ procedural rock source
→ resolved matter
→ selected mesher
→ render material

Once resolved into matter, later destruction must not require the
original primitive objects.

Do not build a GameObject hierarchy that becomes the authoritative rock.

The procedural source is generation input; resolved matter is runtime
authority.

============================================================
9. DIVERSITY TEST
============================================================

Generate at least 20 deterministic seeds.

Automatically arrange them in a contact-sheet/gallery scene.

The set should show meaningful variation in:

- silhouette
- major block count
- width/height ratio
- capstone placement
- asymmetry
- negative spaces/recesses

But all should look like the same art family.

Reject obvious bad cases:

- disconnected floating stones unless intentionally supported
- needle spikes
- spherical blobs
- extreme paper-thin slabs
- impossible self-overlap artifacts

Do not hand-tune each seed individually.

============================================================
10. QUALITY METRICS
============================================================

Record simple automatic descriptors for each seed:

- bounds
- occupied matter count/volume estimate
- vertex count
- triangle count
- number of connected source/resolved components
- width/height/depth ratio
- generation time
- mesh time

Optional:
simple silhouette occupancy/hash metrics.

These metrics are diagnostics, not aesthetic scores.

============================================================
11. OWNER-FACING GALLERY
============================================================

Produce a clean comparison board/gallery:

- at least 20 rock seeds
- same camera convention
- same lighting
- seed labels
- no debug wireframe in primary board

Also provide:

- 4–6 hero close-ups
- one wireframe comparison
- one dirt/rock boundary close-up
- moving-object texture-stability sequence

Write evidence under:

native/evidence/unity/u3-material-rock-stamp/

============================================================
12. AGENT TOOLING
============================================================

Extend Codex-operable tools with:

generate_rock_stamp(seed, profile)
generate_rock_gallery(seedStart, count)
capture_rock_gallery
inspect_rock_stamp(seed)
set_surface_material_debug(mode)

The agent should be able to:

- generate 20 variants
- render/capture them
- inspect outliers
- change one profile parameter
- regenerate the comparison

without manual Inspector clicking.

============================================================
13. MATERIAL SOURCE / ASSET POLICY
============================================================

Prefer:

- engine/project-generated procedural textures
- clearly licensed/free texture inputs
- simple internally generated noise

Record provenance for any external texture.

Do not introduce paid Asset Store dependencies for this qualification.

Do not lock the core matter renderer to one external shader package.

============================================================
14. PERFORMANCE
============================================================

Measure:

- stamp generation
- scalar resolution
- meshing
- mesh upload
- shader/frame GPU cost for gallery scene
- memory for hero rock matter + mesh

Compare at selected 0.50 / 0.25 / local-refinement modes where still
relevant from U3.

Use Windows player build for at least one visual/performance capture if
automation is healthy.

============================================================
15. TESTS
============================================================

Required:

STAMP
- same seed → same parameters/field
- different seeds produce measurable difference
- one connected intended formation
- bounds respected
- no NaN/invalid SDF values

MATTER
- stamp resolves through normal matter authority
- source order/precedence deterministic
- material IDs correct

MESH
- finite geometry
- no invalid indices
- chunk/brick seam remains valid where fixture crosses one

MATERIAL
- rock/dirt weights stable
- dynamic/rest-space projection test does not change reference mapping
  when object transform changes

AGENT
- gallery generation callable from supported agent tool path

============================================================
16. PASS / HOLD
============================================================

PASS if:

1. rock/dirt matter looks substantially beyond the raw debug lab;
2. material seam is visually acceptable;
3. moving rock does not visibly texture-swim;
4. one procedural generator produces at least 20 coherent but meaningfully
   different formations;
5. selected rock formation remains ordinary resolved matter;
6. performance is plausible enough to continue into destruction;
7. Codex can reproduce the gallery autonomously.

HOLD if:

- acceptable rock appearance requires conventional static mesh authority;
- projected material cannot remain stable on dynamic matter;
- procedural rock family remains mostly repeated blobs;
- selected mesher/resolution cannot approach the visual target.

Do not HOLD just because textures are not final production art.

============================================================
17. COMPLETION
============================================================

Independent visual/technical review.

Commit/push if authorized.

Final response:

PASS/HOLD
commit
material technique
material-boundary result
dynamic projection result
rock generator design
20-seed diversity result
performance
evidence path
agent workflow result
known limitations

If PASS recommend:

UNITY U5 — MINIMAL DESTRUCTION SLICE

DO NOT START U5.

STOP FOR OWNER REVIEW.
