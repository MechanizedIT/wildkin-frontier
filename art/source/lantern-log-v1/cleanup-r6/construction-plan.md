# Lantern Log R6 — main-component voxel reconstruction

**Status:** Focused corrected plan for independent review. R5 remains the
immutable raw master. This authorizes no Blender run, TRELLIS rerun, GLB,
texture, collision, placement, harvest, or runtime admission.

## Evidence and the actual selection

- [R5 raw master](../geometry-ply-r5/raw-geometry.ply), SHA
  `e25bdd049cf9a7d8d4e1a7df9e4193e9840b0b550c6052b134d3d88cd6276120`,
  contains 1,077,634 vertices and 2,218,798 triangles.
- Its [topology audit](../geometry-ply-r5/topology-audit.md) measures 67,425
  boundary and 99,060 non-manifold edges **globally**. It does not allocate
  those defects to an individual vertex-edge component.
- The root-owned [exact-coordinate diagnostic](raw-coordinate-diagnostic.json)
  found zero duplicate exact positions and zero duplicate index triangles. A
  weld/dedup path therefore cannot repair this field.
- [R5 visual review](../geometry-ply-r5/visual-review.md) retains an organic
  long wood/cap source but holds the fragmented mobile silhouette. The
  [V2 reference](../../../targets/rootbound-wildwood/constituents/lantern-log/reference-v2.png)
  requires a broken long log with **six** ordinary violet caps.

`Lantern_R6_Work` contains only source component root `1579`: 2,169,924 faces,
1,052,031 vertices, raw bounds
`X[-.5003723,.4995916] Y[-.2924528,.1002825] Z[-.2969053,.2909446]`.
The 48,862-face root `844810`, both six-face fragments, and unused vertices
remain untouched in the hidden raw master and are explicitly excluded from the
work copy. No component moves, joins, crop probe, or manual cap replacement is
allowed.

Before applying the modifier, record boundary and non-manifold incidences for
root `1579` itself. That diagnostic distinguishes its defects from the global
R5 counts but cannot waive any post-reconstruction zero-edge gate.

## One reconstruction operation

Blender 4.5.3’s documented `RemeshModifier` fields are used on the duplicate
only:

```text
mode = 'VOXEL'
voxel_size = 0.006 raw units
use_smooth_shade = False
use_remove_disconnected = False
scale = 0.9
threshold = 1.0
octree_depth = 0
```

Apply exactly this one modifier after source selection. The main-only span is
`0.9999639 × 0.3927354 × 0.5878500`; with the two-cell margin it is
`169 × 68 × 100 = 1,149,200` bounded AABB cells. That is an allocation estimate,
not a memory guarantee. Require 8GiB free at start and terminate at the
existing 6GiB reserve. There is **no** coarser voxel fallback, alternate remesh,
decimate, boolean, smoothing pass, or follow-up geometry method. If any gate
fails, R6 holds.

The reconstruction is intentionally detail-first: `.006` is selected to keep
separate cap-like rises and broken wood facets where `.012` would be too coarse
to credibly carry the reference hierarchy. It must not be presented as proof
that R5’s open/non-manifold source will resolve before the actual audit.

## Surface/readability contract

Keep flat shading. For neutral inspection only, use the actual R5 saved
slot-0 neutral gray `(0.18, .18, .18, 1)`, roughness `.84`, metallic `0`, and
`-2 EV` exposure. Apply this exact presentation to both the retained raw master
and R6 derivative before comparing them; it corrects R5's washed review output
without manufacturing readability. It does not create a runtime material,
texture, luminous fungus, or shelf prop.

Render all seven fixed directions — `end-positive-y`, `end-negative-y`,
`side-positive-x`, `side-negative-x`, `top`, `underside`, and `three-quarter`
— at 512, 96, and 48px with the main-work bounds plus 5% margin. Hide the
review floor only for underside images.

At 512px, the R6 derivative must visibly retain one broken long wood body and
**six distinguishable source-derived rise/cap forms**. At 96px and 48px, it
must retain a readable clustered cap rhythm rather than one blob. These are
comparison gates against V2, not authority to fabricate caps. Failure to
retain all six caps holds R6 even if topology succeeds.

## Required post-apply evidence

| Gate | Required result | Stop condition |
| --- | --- | --- |
| Exact construction | One selected main-only work object and the literal `.006` modifier settings recorded before apply. | Any excluded source piece moved, joined, or reused. |
| Resource | 8GiB initial free; live reserve never below 6GiB. | Guard refusal or reserve breach. |
| Topology | One face-bearing component; zero boundary/non-manifold edges; zero unused vertices; finite, non-repeated, nonzero-area triangles. | Any residual structural defect. |
| Winding | Actual `mesh.calc_loop_triangles`, directed-edge consistency, positive signed volume, and outward cap coverage. | Aggregate volume alone or an untested cap. |
| Geometry | 35,000–600,000 triangles; no detached visible shell. | Too sparse/dense or a remaining floater. |
| Visual | Long broken body plus six rises at 512; clustered rhythm at 96/48; no capsule, rail, generic boulder, or flat cutout. | A topology-only pass that loses the target hierarchy. |

The raw PLY and its audit remain useful historical evidence whether R6 passes or
holds. No result from this plan admits a derivative to the game.
