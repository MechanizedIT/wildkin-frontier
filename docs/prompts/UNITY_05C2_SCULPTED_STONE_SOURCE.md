WILDKIN FRONTIER
UNITY U4C2 — PROCEDURAL SCULPTED STONE SOURCE

This is a fresh owner-authorized continuation of U4C after
SOURCE_MODELER_HOLD at commit:

d629dc3c42d8459e125aa6d38a5ce3643a4dbccb

Pull current main first.

Read:

AGENTS.md
docs/CURRENT_SLICE.md
docs/SOURCE_GEOMETRY_MATTER_FIDELITY_PLAN.md
native/shared/reference/ROCK_FORMATION_TARGET.md
native/evidence/unity/u4c-source-matter-fidelity/README.md
native/evidence/unity/u4c-source-matter-fidelity/receipt.json

Inspect the three existing U4C source-rock captures and
ProceduralSourceRock.cs.

OWNER DECISION

Reopen U4C using a MATERIALLY DIFFERENT source-modeling method.

The previous half-space/beveled composite approach is now negative
evidence.

Do not perform another parameter-tuning pass on it.

Do not begin Unreal.

Do not begin U5.

The objective is still:

GOOD SOURCE GEOMETRY
→ TRUE SDF MATTER
→ SURFACE NETS
→ FIDELITY / RESOLUTION DECISION

But Gate A must first be solved with a new source modeler.

============================================================
1. WHY THE OLD METHOD FAILED
============================================================

The previous generator made each source archetype from multiple separate
convex plane-set components.

The resulting visual language was:

- block-like
- architectural
- attachments/caps
- visibly separate pieces
- insufficiently sculpted individual stones

Do not repair that architecture by adding more little convex pieces.

For this phase:

ONE INDIVIDUAL STONE = ONE CONNECTED MANIFOLD SOURCE MESH.

Rock formations made from several separate stones belong later in U4E.

============================================================
2. NEW SOURCE METHOD
============================================================

Implement a deterministic procedural SCULPTED STONE generator.

Recommended bounded method:

SUBDIVIDED CUBE TOPOLOGY
        ↓
SUPERELLIPSOID / SUPERQUADRIC PROJECTION
        ↓
ANISOTROPIC SCALE
        ↓
CONTROLLED MACRO ASYMMETRY
        ↓
OPTIONAL DELIBERATE FACE/CORNER CUTS
        ↓
FLATTEN / SHAPE CONTACT BASE
        ↓
LOW-POLY FACETED SOURCE MESH

Do not use:

- multiple disconnected components inside one stone
- metaball blending
- many soft-unioned clasts
- high-frequency noise
- a random lumpy sphere
- another beveled-box assembly

============================================================
3. SUPERELLIPSOID BASE
============================================================

Use a cube-derived topology rather than latitude/longitude sphere poles.

Create a low/moderately subdivided cube surface.

Project the surface directions onto an anisotropic superellipsoid.

The shape should have configurable:

- X/Y/Z radii
- squareness exponent
- directional skew
- taper
- lean

The exponent should allow variation from rounded boulder to squarer slab
without becoming an obvious cube.

Keep the source mesh modest in polygon count.

This is source modeling, not micro-tessellation.

============================================================
4. MACRO SHAPE VARIATION
============================================================

Use a SMALL number of large-scale controls.

Examples:

- one side fuller than the other
- top displaced off-center
- front/back asymmetry
- tapered end
- mild twist/skew
- one compressed quadrant
- broad flattened contact area

Seed variation should affect these meaningful shape parameters.

Do not primarily randomize every vertex independently.

The shape should look DESIGNED, not noisy.

============================================================
5. DELIBERATE FACETING
============================================================

Target:

- broad readable faces
- softened transitions
- rounded/beveled-looking corners
- low-poly character
- not extremely low-poly

Possible approaches include:

- low subdivision superquadric itself
- constrained vertex clustering/planarization
- selective large plane cuts
- normal clustering / flat or weighted-normal treatment
- bounded deterministic simplification

Choose the simplest robust method.

Do not implement a general production mesh decimator unless actually
needed.

============================================================
6. THREE SOURCE ARCHETYPES
============================================================

Create exactly three strong individual stones:

A. CAPSTONE / SLAB

- broad
- horizontally dominant
- rounded rectangular silhouette
- slightly tilted/asymmetric top
- substantial thickness
- not a rectangular prism

B. CHUNKY BOULDER

- roughly equidimensional
- strong large/medium face hierarchy
- visibly asymmetric
- broad grounded base
- not sphere-like

C. BUTTRESS / WEDGE

- taller directional mass
- clear lean/rake
- broad support/base
- interesting side silhouette
- no detached capstone

Each must be ONE connected source mesh.

============================================================
7. DIRECT SOURCE VISUAL GATE
============================================================

Before ANY voxelization:

capture for each source:

- beauty angle
- second angle
- wireframe

Use matched neutral lighting/camera.

Compare against:

native/shared/reference/ROCK_FORMATION_TARGET.md

PASS requires the three source stones themselves to read as plausible
stylized game-rock assets.

Look specifically for:

- broad planar-ish faces
- rounded/beveled corners
- unequal major faces
- deliberate asymmetry
- convincing silhouette
- no obvious cube
- no house/building silhouette
- no floating component
- no metaball/blob language
- no needle/spire defects

Have an independent visual reviewer inspect the actual captures.

If Gate A still fails, allow ONE bounded adjustment of this NEW modeling
method.

Do not fall back to the old multi-component plane-box architecture.

If it remains poor after that bounded repair:

SOURCE_MODELER_HOLD

and stop.

============================================================
8. IF GATE A PASSES — RESUME ORIGINAL U4C
============================================================

Only after source geometry passes:

voxelize the SAME source meshes using true signed-distance sampling.

Compare:

SOURCE
0.50 m
0.25 m
0.125 m
0.0625 m

for all three.

At least one hero also compares occupancy/clipped scalar encoding against
true SDF at the same spacing.

Keep the existing Surface Nets implementation initially.

Record:

- source vertices / triangles
- local volume dimensions
- sample count
- occupied count
- memory
- SDF sampling time
- Surface Nets time
- reconstructed vertices / triangles

Also calculate the U4C geometric-error metrics from the existing plan
where practical.

============================================================
9. IMPORTANT ARCHITECTURAL HYPOTHESIS
============================================================

Do not assume a future rock FORMATION must be one matter domain.

A likely production structure is:

formation recipe
    ↓
several individually generated stones
    ↓
each resolves to its own detailed local matter domain
    ↓
placed in physical contact / partial embed
    ↓
support/contact system relates them

This is compatible with the owner's reference art, which visually reads
as a collection of individual interlocking rocks.

U4E owns formation composition.

U4C2 owns INDIVIDUAL STONE QUALITY + MATTER FIDELITY.

============================================================
10. SURFACE NETS DECISION
============================================================

Do not reopen Dual Contouring merely because U4C originally failed.

Only reconsider the mesher if ALL are true:

- source mesh passes visually
- true-SDF sampler is verified
- 0.125/0.0625 resolution is sufficiently fine
- reconstruction still loses important broad faces/corners

Then recommend REOPEN_MESHER.

Do not implement that comparison without reaching this evidence.

============================================================
11. TESTING
============================================================

Add tests for:

- deterministic same-seed mesh
- one connected manifold per archetype
- no invalid/NaN vertices
- valid winding
- bounds respected
- nonzero volume
- no disconnected components
- stable source hash
- source variation from different seeds

If voxelization gate is reached, also run the full U4C matter/SDF tests
required by the existing fidelity plan.

============================================================
12. EVIDENCE
============================================================

Preserve old U4C failure evidence.

Write new work under either:

native/evidence/unity/u4c2-sculpted-source/

or another clearly versioned sibling folder.

Do not overwrite the failed source captures.

Receipt must clearly distinguish:

OLD METHOD:
half-space composite — HOLD

NEW METHOD:
sculpted superquadric — PASS/HOLD

============================================================
13. COMPLETION
============================================================

If source Gate A PASSES and matter fidelity work completes, report one:

LOCAL_DOMAIN_0_125
LOCAL_DOMAIN_0_0625
REOPEN_MESHER
REPRESENTATION_HOLD

If source Gate A still fails:

SOURCE_MODELER_HOLD

If PASS through fidelity, do NOT start U4D automatically.

Commit and push the bounded checkpoint.

STOP FOR REVIEW.