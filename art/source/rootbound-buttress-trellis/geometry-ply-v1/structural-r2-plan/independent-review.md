# Independent review — structural R2 plan

**Verdict: HOLD for the proposed lobe masks; one focused projection-aware revision can resolve it.**

The plan is technically disciplined: it is Z-up, pins the raw source and uniform transform, preserves faces and Z values, confines edits to literal coordinate fields, and makes appropriately limited claims. The measured five-lobe finding is useful and the plan correctly does not claim a four-root consolidation.

The perceptual selection is wrong for the stated principal inspection camera. With the three-quarter camera at horizontal direction `(1, -1, .38)` looking toward the asset, the most camera-facing/near root bearings are approximately 270° and 320–350°. The proposed 20–50° and 90–120° web broadenings lie predominantly on the far/opposite side. They can change many vertices while making little improvement to the target's near-root foreground cadence. The restrained trunk S-bend may remain in the next revision, but its maximum 0.098 m displacement does not compensate for both root changes being poorly projected.

Replace the two broadening masks with measured near-facing lobes—prioritize 260–280° and 320–350°—using the same bounded lateral-only falloffs and literal-coordinate method. Before Blender execution, add a CPU projection receipt for the fixed three-quarter camera that records selected-vertex count and projected screen bounds for each changed web. The receipt must show the changed root surfaces are visible and non-HUD/non-background dominated in the principal view; angles alone are insufficient.

Keep the declared limits: five retained low lobes may remain, no topology claim, no Z movement, and no manual root deletion, remesh, or invented fourth root. This is a mask/displacement revision, not a plan restart.

## Revision re-review

The revised masks now correctly select the camera-near 260–280° and 320–350° webs. Their continuous `tanh` lateral response removes the former ridge discontinuity. The fixed-camera proxy records substantial selected regions (26,329 and 50,761 vertices) in the near low-surface depth range, and labels itself only a point/depth proxy. The upper trunk restriction to Z ≤ 3.2 m is appropriate: it preserves the held fork rather than repeating the earlier normal failure. The frozen CPU receipt reports finite coordinates, bitwise-unchanged Z, no indexed degenerates, and no nonpositive raw-to-candidate triangle-normal dot.

**Builder verdict: HOLD for one small gate correction.** `build-rootbound-structural-r2.py` checks source, parameter, envelope, movement, and index preservation, but it does not enforce the frozen `triangle_normal_audit` result or pin the reviewed `analysis.json` receipt. Its `--analysis-sha` argument hashes `analysis.py`, not the reviewed receipt. Before Blender, add a required receipt SHA check and fail unless the copied receipt reports zero proposed degenerate triangles and zero nonpositive raw-to-candidate normal dots. This is a narrow proof-binding correction, not a geometry or mask change. Once present, the method is GO for one high-detail derivative and comparison render pass only.

### Final builder re-review

**GO for one Blender R2 derivative/render pass.** The builder now requires and checks the reviewed CPU receipt SHA in addition to the parameter and analysis-code SHAs. It refuses a frozen receipt with a proposed degenerate triangle or nonpositive raw-to-candidate normal-dot count, then repeats the area/normal-dot audit using the actual float32 coordinate arrays that will be stored in Blender, in bounded index chunks, before any render. It preserves the fixed input, face indices, Z values, fresh output rule, 8 GiB start floor, and 6 GiB watchdog. The reviewed builder SHA-256 is `60faae3f1cc31bf463fe6b292a43bace451a956684d38565f79087bc2148a6bf`.

The construction-plan prose still says a 0.42 m full trunk core with a 0.12 m edge. The frozen parameters and executable instead use the governing 0.30 m full core plus 0.12 m edge, reaching 0.42 m. Correct that prose before the resulting receipt is presented as a final plan; it does not require a recipe change or delay this already pinned derivative run.
