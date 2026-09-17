# Independent raw-geometry visual review — Lantern Geometry PLY R5

**Decision: retain as a raw geometry master; HOLD for cleanup admission and runtime.**

I inspected all seven actual neutral 512px directions and the three-quarter 96px/48px images from the exact raw PLY inspection, against selected `reference-v2.png` and the retained manual R4 comparison. The raw-generation receipt is coherent for its narrow contract: the pinned V2 input decoded to 1,077,634 vertices / 2,218,798 triangles, produced the exact 41,776,379-byte float32 PLY, and the inspector verified counts, float32 XYZ, triangle index order, and identity transform. Those facts establish raw-file provenance only.

Visually, the raw mesh has a more varied, full, organic wood mass than manual R4's narrow rail. Several mushroom-like caps and clustered fractured forms create useful source material around the intended colony, and the long-axis side views suggest a rougher rootwood cadence that the manual method never achieved. At 96px and especially 48px, however, the silhouette collapses into pale, ambiguous fragments rather than a readable lantern-log colony.

The raw geometry scores about **4.4/10** as direct visual material: organic mass 6.2, reference family resemblance 5.0, readable colony at mobile sizes 3.5, coherent whole-object silhouette 3.0, and cleanup readiness 2.5. The 512px inspection visibly shows detached chunk(s), scattered fragment-like forms, and dark/open-looking underside regions. The view filenames use the inspector's axis labels; because the long axis is X, treat `end-±Y` as broad-side observations and `side-±X` as along-axis/end observations. This avoids assigning a false structural interpretation to the labels.

The neutral images do **not** prove a nonmanifold mesh, open boundaries, disconnected component count, normals, or self-intersection status. They do show enough visible fragmentation to reject a direct derivative or runtime path.

## Bounded next method

Preserve this PLY and inspection unchanged. Before any cleanup, run a read-only topology/component/boundary audit that reports face-bearing components, loose pieces, boundary/nonmanifold edges, normals, and any affordable narrow-phase result. If a cleanup is authorized after that evidence, make it a controlled derivative that first keeps the best connected wood-and-cap mass, explicitly removes only measured detached islands, and repairs only documented open boundaries. Re-render the same 512/96/48 views before any simplification, texture, collider, placement, or runtime decision. Do not use global smoothing or decimation to conceal the fragmented read.

## Measured topology follow-up

The completed read-only topology audit confirms the visual HOLD is structural, not merely a neutral-lighting artifact. The exact PLY has **67,425 boundary edges** and **99,060 non-manifold edges** (83,003 incidence-three and 16,057 incidence-four), with no zero-area or repeated-index faces. It has **four face-bearing components under vertex-edge adjacency**: the main component contains 2,169,924 faces; a detached substantial component contains 48,862 faces; and two six-face fragments remain. The separate count of 1,149 all-vertex components includes 1,145 unused vertices, so it must not be described as 1,149 mesh pieces. No normal-winding or self-intersection test was performed. These measurements mean merely removing visible floaters cannot establish a safe repair of the main raw component.

The gallery and related forage/composite dossiers correctly continue to label R5 as untextured held evidence with no runtime, collision, placement, harvesting, or regrowth implementation claim. Their future slow-regrowth and structure-suppression language remains proposal-only.
