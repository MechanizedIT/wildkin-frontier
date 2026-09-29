# U4F-G1 independent raw-source review

**Disposition: `U4FG1_RAW_SOURCE_CANDIDATE` — worth one bounded cleanup pass.** This is a source-worth-keeping judgment only. The raw mesh is not admitted as a pristine production asset or closed stamp source.

A fresh independent read-only reviewer compared the nine neutral Blender captures with `art/source/u4f-rock-002/reference/candidate-04.png` and answered the requested questions:

1. **Overall silhouette:** Partially preserved. The wide low base and raised rear cap survive, but the strong stepped front terraces are simplified into a rounder, squatter mass.
2. **Broad chunky planes:** Present in primary, front, left, and top views; the broad cap reads clearly.
3. **Stepped/offset masses:** Recognizable but reduced. The rear cap and a lower front mass remain distinguishable, with weaker layering than the reference.
4. **Stylized-rock read:** Yes. The neutral renders retain a faceted game-asset character rather than detailed natural geology.
5. **Hidden side:** Not plausible as a finished solid. Rear, right, and underside views expose a hollow skirt and open base.
6. **Large detached components:** None are visually apparent. The topology count of 54 vertex-connected components is one 796,029-vertex main component plus 53 loose vertices; the loose points are cleanup debris, not visible rock chunks.
7. **Catastrophic defects:** The underside has a large open black cavity bounded by a thin rim, which blocks direct stamp use. No equally severe external folded-sheet failure was observed.
8. **Worth cleaning:** Yes. The exterior macro mass retains enough of the approved reference's chunky stepped intent to justify one bounded cleanup pass.
9. **Pristine render recoverability:** Likely. Preserve the low base, rear cap, and broad exterior planes; remove loose debris and repair the visibly bad underside.
10. **Closed stamp-source recoverability:** Likely, conditionally. A deliberate closed reconstruction or remesh that preserves the macro silhouette is indicated; direct watertight repair is not credible from these raw topology facts alone.

The primary view is the strongest match. Opposite/front/left/right views show a serviceable stylized boulder through ordinary rotations, while the top confirms a broad offset cap. The underside is the clear failure. The dense wireframe is not visually useful for judging form.

The diagnostic topology supports cleanup planning but does not substitute for review: 6,356 boundary edges, 9,864 nonmanifold edges, 53 unused vertices, and no repeated-index faces, zero-area triangles, or nonfinite positions. The 54 connected-component count includes those loose points. No cleanup or repair was performed during this audit; the raw source remains unchanged.

**Gate:** retain the raw master and stop for owner review. If authorized later, make one bounded cleanup candidate while keeping this raw source immutable; review the render derivative and separately prove closure for any stamp-source derivative.
