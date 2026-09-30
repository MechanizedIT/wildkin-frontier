# U4F-C1 bounded dual-derivative construction plan

Status: reviewed plan, executed once, and ended at `U4FC1_RENDER_SOURCE_HOLD`. The high-resolution working shell closed numerically, but independent visual review rejected it for persistent striped surfaces and underside artifacts. See `native/evidence/unity/u4f-c1-cleanup/review-construction-plan.md` and `review-cleanup.md`.

## Immutable inputs and frame

- Reference: `reference/candidate-04.png`, SHA-256 `6b0d4606568158de586f488bb0cafe7b17e04c26b6c47f5528cee6209043b0bc`.
- Raw master: `raw/staged512-geometry-r1/raw-geometry.ply`, SHA-256 `4cc76dc0608ed0e3575e25718c3b606561aa7925c4cd5d46350c4576d5958c5d`.
- Blender: 4.5.3 LTS. Raw coordinate frame is retained exactly; G1 defines +Z as up and -Z as underside. Scale remains the source's approximately one-unit span; no final game scale is applied.

## Read-only defect findings

Edge height uses normalized Z of each indexed edge midpoint. Counts are in `native/evidence/unity/u4f-c1-cleanup/metrics/raw-defect-localization.json`.

- Boundary edges by 0–15 / 15–30 / 30–70 / 70–100% height: 1,123 / 1,084 / 3,184 / 965 (6,356 total).
- Nonmanifold edges in the same bands: 1,850 / 1,410 / 5,057 / 1,547 (9,864 total).
- The indexed boundary graph splits into 1,416 components: 823 simple loops and 593 branched/open fragments. The largest connected component is 16 edges; the largest simple loop is 10 edges. There is no single large indexed boundary loop suitable for a direct underside fill.
- Boundary/nonmanifold edges are distributed across primary and opposite visible surfaces as well as the lower skirt. The G1 underside capture shows a broad black opening. The three red/cyan defect-map captures make the edge distribution visible.
- A read-only Blender BVHTree probe of 839,428 triangles with centroid height at or below 35% reported 299 overlap pairs that share no triangle vertex indices. This is localized overlap evidence in the lower shell, not an all-mesh intersection claim.
- An 81 × 81 read-only vertical-ray probe from below hit 4,415 rays and missed 2,146 outside/open-footprint rays. Of the hits, 90% are at or below normalized height 0.00034; the highest sampled first-hit height is 0.286. This supports a shallow, measured lower closure rather than a tall internal pedestal.
- G1's actual neutral captures show the main exterior is mostly coherent: broad facets, low front mass and offset rear cap remain recognizable. The raw underside is not a plausible closed base.

## Primary construction

1. Re-read and hash-pin the raw PLY. Build a fresh working mesh from the one face-bearing component, remapping only referenced vertices so its 53 unused points disappear in the copy. Preserve exact coordinates and triangle order at this point; do not weld, smooth, normalize normals, or save back to raw.
2. Author one closed, irregular support-core under the lower skirt. Its radial outline is sampled deterministically from the raw shell's lower 0–25% Z vertices, centered on their median XY. A faceted multi-ring profile extends below the source and tapers into the existing mass, ending at normalized height 0.33 just above the highest sampled underside first hit (0.286). Ring height/radius variation is fixed-seed, shallow, and documented; it should read as an uneven stone continuation rather than a plate or separate prop.
3. Join the working exterior and support-core, then use Blender's voxel remesher once at the pinned fine spacing in `cleanup-config.json`. This is the selected cleanup because defects are spread over the surface, the large opening has no stable indexed fill loop, and lower-shell overlap is present. It is not a blind repair of individual raw boundaries.
4. Before reduction, compare the high-resolution closed working solid with the raw in the matched primary/opposite/front/back/left/right/top/underside views and measure silhouette/landmark drift. If the remesh rounds the front terrace breaks, low front mass, rear cap, or broad planar read, stop before decimation. If it passes, create the pristine render product from a copy using silhouette-preserving collapse decimation only as needed, capped initially at 80,000 triangles. Flat shading is retained. No global smooth modifier is used; if reduction harms the planes, retain a higher count or HOLD.
5. Create the separate stamp-source from the closed high-resolution working solid, voxel-remesh at its independently pinned spacing, then decimate only if needed. Recalculate derivative normals outward and validate closure/orientation/volume. The products remain aligned in the unchanged source frame.

## Stop / repair rules

- The primary construction is one bounded pass. If the global remesh materially rounds the rear cap, lower front mass, broad planes, or silhouette, stop with `U4FC1_RENDER_SOURCE_HOLD`; do not tune remesh spacing repeatedly.
- A fine voxel size is not proof of exterior preservation: the pre-reduction visual and silhouette gate is mandatory.
- One focused repair is available only if an independent reviewer identifies a localized, correctable artifact. Record the exact change and re-review the final hashes.
- No Unity import, voxelization, SDF/BVH work, U4G, or U5 is included.
