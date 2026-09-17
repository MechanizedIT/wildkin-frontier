# Trailgloam reference v1 — independent review

**Scope:** reference-production gate only. This is not a mesh, animation, runtime, or species-play admission.

**Reviewed file:** `art/source/trailgloam-v1/reference/reference-v1.png`
**SHA-256:** `5d5558ed311c631f8dd6609eed4bd56dfe965c64a27dbdd3541237b4c2cc68e3`
**Image facts:** 1536 × 1024, opaque 24-bit RGB PNG.

## Decision: HOLD — repair the reference before TRELLIS

The image has a clean white background, a strong dark low-poly carapace, warm amber contrast, and a readable beetle-like mass. It is a promising direction, but it does not yet prove the selected six-legged, two-dorsal-frond body plan well enough to make a mesh generation a responsible use of the single serialized GPU slot.

### What reads

- The subject is single, centered, opaque, and free of scenery, harnesses, riders, text, spores, roots, and background contamination.
- The low charcoal/teal shell and warm amber pieces make the creature distinct from the admitted companion palette at this large reference scale.
- The near-side feet that are visible contact the ground plane convincingly enough to establish a ground creature, and the faceted treatment fits the intended art direction.

### Blocking generation risks

1. **Leg count and topology are not recoverable from this view.** Four feet are unmistakably visible; additional dark shapes near the body are occluded or ambiguous. The source does not let a reviewer verify exactly three legs per side, their attachment points, or whether the far-side limbs are separate rather than fused. A single-view mesh generator is likely to invent, omit, or merge the hidden limbs.
2. **The two amber dorsal fronds do not read as rooted fronds.** They currently read more like a rear bow/petals, while the wide amber strip over the shell competes as a third amber dorsal element. The rear attachments are obscured by the shell and their functional join cannot be judged. This risks detached wings, extra petals, or a shell ornament in a generated mesh.
3. **The requested small-scale silhouette is unproven.** At 48–96 px, the wide dark shell will remain, but the separate frond count and six-leg stance will collapse or be hidden behind it. No actual downscaled/side/rear evidence is supplied.

### Focused repair brief (one reference repair only)

Create one clean opaque-white **three-quarter side** reference that deliberately exposes the full anatomy: three near-side grounded legs with three distinct joints, three far-side legs visible as separate offset silhouettes, and exactly two amber dorsal fronds rising from two clearly visible, spaced shell sockets. Remove the diagonal amber shell stripe; retain only a small, restrained amber lantern seam on the body. Separate the two fronds by a narrow white gap and give each a visibly thick base, so they cannot be read as floating petals or generic wings. Keep their material **opaque**: that is the safer choice for low-poly mobile rendering and early mesh-generation inspection; translucency remains deferred rather than an admission requirement.

Capture/retain a matching side or rear reference after the repair if the repaired three-quarter view still hides any foot or frond root. Downscale the repaired image to 96 px and 48 px before generation; the two fronds must remain distinguishable and the body must still read as a low beetle rather than a turtle with a bow.

## Score disclosure

No visual-admission score is issued: this is an unmodeled reference and no gameplay-sized runtime render, material, contact, deformation, motion, or mobile-cost evidence exists. The current gate is **HOLD**, not a rejection of Trailgloam's species concept.
