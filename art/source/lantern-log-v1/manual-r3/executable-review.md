# Independent executable review — Lantern manual R3

**Verdict: HOLD before the counted manual build.**

Reviewed `build-manual-r3.py` SHA-256 `7379e9e2ed32d7ba35313588e0337ce95579f5820fdf34e0a65f0710a8a66bd2` against the frozen `parameters.json` SHA-256 `e65df488e76b4c6c4c47c134fcb123c6dfd8c6512c1f99471d8fe982b9486043`.

The source has several sound pieces: the list-based ring bridge is consistent; the log has a closed far end and a closed annulus/inset/recess face at the near end; bark strips follow the interpolated section surface; each stem and cap is independently closed; and the parameter hash, 8 GiB start gate, and 6 GiB watchdog are present. The cap loft assigns a distinct underside material and uses the reviewed tapered ring profile. These are source-method findings, not visual admission.

Three pre-render corrections are required:

1. **Fix the clipped near-end degeneracy before audit.** At the near end, the outer bottom point is source Z=0 and the inner bottom point is Z=0.0738. Both become Z=0.075 after the current independent per-vertex clamp. This collapses the corresponding annulus span and can create zero-area triangles after clipping; normals were also recalculated before that mutation. Construct the grounded end as a valid welded/retessellated planar patch, or make the reviewed inner geometry unambiguously non-coincident, then recalculate and audit the final mesh. Do not rely on the later generic minimum-area failure to discover this.

2. **Measure actual ground contact, not the complete-object convex hull.** `complete_footprint_area_xy` currently computes the XY convex hull of every component, including elevated caps and decorations. It cannot establish a positive-area log contact with Z=0. After final clipping, translation, and triangulation, record the area and bounds of triangles lying on the ground plane (within an explicit tolerance), require a positive threshold, and identify the log component. The existing per-object closure audit is useful but does not provide this proof.

3. **Make attachment and image framing tests match their claims.** `cap_embed` is only the overlap of global stem/cap Z ranges; it is not a cap-underside intersection or axis-contact test. Either perform an actual local stem-axis-to-cap-surface hit/embed check, or record this value explicitly as a limited interval check and add a contact test that rules out a floating cap. `render_views()` also uses fixed close perspective positions and no bounds-fit assertion. Compute a camera distance/lens fit from the completed bounds for every required view (while retaining the approved principal direction), then assert that all bounds project inside a stated image margin. This is needed especially for the hero cap and the near-end camera.

After those corrections, one execution may proceed as a manual candidate only. It remains contingent on the documented guarded-TRELLIS refusal and requires independent rendered visual review; it makes no runtime, collision, harvesting, or asset-admission claim.

## Focused end-correction plan review

**GO for the numerical correction.** The revised `innerRadiusRatio` of `.58` gives the near inner-bottom vertex source Z=.0861m, which remains .0111m above the .075m clip plane. It resolves the identified coincident outer/inner annulus point without changing the colony composition, recess depth, or grounding method. The final builder input must be the corrected parameter bytes with SHA-256 `7d04105d455170836a2d3056f654f03a4603b58af6ad818114852e452c06e7e3`; the currently inspected manual-R3 copy still hashes to the prior input and must not be executed as that prior copy.

## Revised executable recheck

**Superseded by the bounded-ray correction below; do not execute this SHA.** Reviewed revised executable SHA-256 `20db45932351f8746e8d18bd4297dd65df860c3faf1fa8184235975e32bc4e30` and corrected local parameters SHA-256 `7d04105d455170836a2d3056f654f03a4603b58af6ad818114852e452c06e7e3`.

The revision resolves all three pre-run blockers. It passes the corrected near-end ratio into the radial solid, translates and then recalculates normals on the final geometry, derives positive-area final log triangles at Z=0 with recorded area and XY bounds, and uses a downward ray against the cap's actual underside-material triangles at the local stem-top center. It now derives an orthographic scale from every completed-bounds projection and asserts at least a 5% margin in each required view. The input hash and existing 8 GiB start / 6 GiB watchdog gates remain bound.

One narrow blocker remains: both `intersect_ray_tri(..., False)` calls use `False` for the API's `clip` parameter. That permits intersections outside the actual triangle and can fabricate log or cap contact. Change both to `True` (or omit the argument, retaining the default), then recheck the exact source hash. No geometry or parameter change is needed.

## Final bounded-ray recheck

**GO for one execution.** Executable SHA-256 `9e5fb4ba82b86640188ef8679c09663591af74140008057a35744d835c42c94b` keeps the corrected parameters binding and changes both log-support and cap-underside calls to `intersect_ray_tri(..., True)`. The contact evidence is now bounded to actual triangle faces. The correction is narrow; all other conclusions of the revised recheck stand. This clears only the documented manual candidate run, with independent rendered review still required.
