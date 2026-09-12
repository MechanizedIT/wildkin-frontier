# Verdant cliff kit V3 — independent exact-export model review

**Verdict: HOLD — 6.4/10.** V3 is a substantive visual improvement over the V2 ring-wall prototypes: its rear faces remain legible, the three roles are distinct at a glance, and the geometry no longer relies on the old dark-green bar treatment. It nevertheless does **not** yet match the locked target's three chunky, interlocked scenic rocks closely enough for the 8/10 art gate. The dominant read is still a collection of tall, cleanly separated low-poly blocks (especially the buttress and ledge), rather than broken geologic masses with a low toe, broad stepped buttress, and rock-supported ledge.

## Evidence inspected

- Locked target: `art/targets/verdant-cliff-kit-v1/target.png` (SHA-256 `61a2f2b624fe34c465b047c427a6aec4ed90b21f1ae1574c8b59e1da5c94f114`).
- Fresh V3 exact-export re-import renders: `family-front3q.png`, `family-back3q.png`, and the six individual front/back views in this directory.
- The V3 render receipt: `render-evidence.json`. It identifies the inspected toe, buttress, and ledge GLBs by SHA-256 and states a neutral key/fill/backfill setup. The producer's structural export receipt records 1,110 triangles total, a grounded opaque single-material GLB per asset, and valid supplied hulls. Those facts support the scope of this review but do not establish target fitness.
- V2 comparison render: `.dream-loop/verdant-cliff-kit-v1/render-v2/family-front3q.png` and its prior independent 5.2 HOLD review.

## Score

| Area | Score | Judgment |
|---|---:|---|
| Composition | 1.8/3 | The three size roles read clearly and V3's toe is appropriately low. But the toe resolves as a cluster of four separate boulders, not the target's broad asymmetric toe mass. The buttress becomes two upright standing-stone towers with a foreground slab, losing the target's wide stepped, interlocked ridge. The ledge is most divergent: its large flat cantilever and narrow central support create a table/mushroom silhouette rather than a squat root-catching shelf carried by rock. |
| Lighting | 2.5/3 | The neutral render is a real V2 improvement: both three-quarter directions retain readable facet separation, including backs and undersides, without black-face concealment or reflections. The pale studio values still flatten some of the large vertical pieces, so the lighting does not recover the target's stronger charcoal recess hierarchy by itself. |
| Materials | 1.6/3 | The result is matte and safely avoids blue ore, glow, gold, and conspicuous seams. However, it is nearly one beige-gray family under the reviewed light. The target depends on controlled warm-gray/charcoal plane grouping and a few subdued olive lichen/recess patches; V3 shows no comparable dark hierarchy or restrained embedded growth, leaving its long triangular planes visually uniform. |
| Details | 0.5/1 | No prohibited ornament or loose pebble clutter appears, and the surfaces use intentionally low-poly scale. Repeated long fan-like triangles and sharply cut vertical joins read as construction facets/individual blocks, rather than the target's few broad chipped planes, deep geological break, and supported undercut. |
| **Total** | **6.4/10** | **HOLD** |

## Concrete remaining corrections

1. **Rebuild the buttress around one broad, stepped cliff silhouette.** Widen and lower the present tall towers; use a thick rear crown, a shorter offset shoulder, and a foreground mass that overlaps through a deep irregular vertical break. From the rear it must still read as a single blunt ridge with steps, not two near-parallel monoliths divided by a clean vertical seam. Remove the repeated long triangular fan topology on its faces in favor of a few large diagonal/chamfer planes that change the outer silhouette.
2. **Rebuild the ledge's support, not only its shelf.** Keep an overhang, but replace the narrow center pedestal and two upright posts with an offset, broad supporting mass that reaches underneath and outward at the base. Reduce the perfectly planar, thin rectangular cantilever and make its underside heavy, sloped, and asymmetric. Both inspected sides need to show stone carrying the shelf; it cannot read as a tabletop balanced on a leg.
3. **Unify the toe into a low asymmetric cliff foot.** Retain its varied shoulder and one offset foot, but merge the current front small block, main block, and round right block into a more continuous grounded mass. The target can have a recess; it should not look like a separate rock pile. A low chipped shoulder and one diagonal side plane will preserve the role while giving its rear a distinct geological contour.
4. **Restore restrained rock value hierarchy.** Assign broad warm-gray and charcoal planes based on mass/plane orientation, then add at most a few terminating olive recess patches in the buttress split and ledge support. They must follow the rock break and stop within it, never form a straight strip. This is needed to make the interlock and underside readable without reflections or decorative resource-seam language.

V3's structural export is outside the target art gate and has not been admitted to runtime. This review makes no claim about collision behavior, placement, native rendering, phone performance, or gameplay affordances.
