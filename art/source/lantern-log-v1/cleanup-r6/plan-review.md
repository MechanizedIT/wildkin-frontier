# Independent R6 plan review — HOLD for one focused correction

**Reviewed inputs:** `construction-plan.md` (`eba3e35b08ed7e59239326390b88dd25aafeec9cac6f3b9014a250712fb1f364`), `parameters.json` (`49aee506ea28c44e6d2fa325d34a7f83482766d2d895f496233a03e7bf4f71b0`), and `feasibility.json` (`38d304d6fccfe5f29e11b9ff884709d37ecc682681644375f20e4cd63bcff9b5`) against the frozen R5 topology/visual receipts and Lantern V2 reference.

## Verdict

**HOLD.** Voxel reconstruction is a credible changed method for the genuinely open, non-manifold R5 raw field, and preserving the raw master while producing a separately audited derivative is appropriate. The current selection, attachment inference, and resolution/fallback policy are not yet a reliable single final reconstruction attempt.

## Required focused correction

Make one revised plan with these bounded changes, then return for source review before one full Blender job:

1. **Use the main component only for the derivative.** Preserve root `844810` untouched in the hidden raw master and explicitly exclude it from `Lantern_R6_Work`. A `0.0149379m` overlap of Y AABBs after an invented `-0.050m` translation does not establish local surface contact, intended attachment, or a cap relationship. It cannot justify moving the 48,862-face piece into a new silhouette. Remove the crop probe that depends on that translation; it would be an extra reconstruction experiment based on the same unsupported premise.
2. **Correct the topology attribution.** The recorded 67,425 boundary and 99,060 non-manifold edges are global R5 counts. The current evidence establishes component sizes under vertex-edge adjacency, but does not allocate those edge failures to the main component. State that distinction. Before modifier application, record per-selected-work-component boundary/non-manifold incidence as a diagnostic; it informs the reconstruction but cannot waive the post-apply zero-edge gates.
3. **Use one detail-preserving resolution: `0.006` raw units, with no automatic `0.014` fallback.** The main work AABB at that resolution is about `169 × 68 × 100` cells (roughly 1.15 million bounded AABB cells; exact values must be recomputed from the revised main-only bounds). This is an allocation estimate, not a memory promise; retain the 8 GiB preflight and 6 GiB live reserve. If it exceeds the fixed triangle/resource gates or fails visual/topology gates, stop R6. A coarser `.014` retry would be a second substantive reconstruction after the final attempt, and `.012` is too coarse to credibly retain the V2 cap-and-body hierarchy under the requested detail-first direction.
4. **Strengthen the visual gate without fabricating anatomy.** At 512px, require the derivative to retain a broken long body and six distinguishable source-derived rise/cap forms or HOLD; at 96/48px, require a readable clustered cap rhythm rather than a single blob. This is a comparison gate, not permission to manually add caps. If the raw main cannot supply that read through one reconstruction, record the target mismatch and hold it.

## Scope and limits retained

The derivative remains nonshipping: no GLB, texture, collision, placement, harvest, or runtime admission. Keep all post-apply topology, finite-area, winding, component, and same-frame multi-size render checks. Do not turn a failed voxel reconstruction into a remesh/decimate/boolean sequence or a new manual log pass.

---

## Re-review — corrected plan GO (pre-source only)

**Reviewed correction:** `construction-plan.md` `93dc0a1c46c32767a51c9bad45e8ecadef3958a2f52b7d2aa64148dd1097ab6c`, `parameters.json` `b3d4c5f3b44e0be11bb9c891468562b3b32d2452489215d8cb4aa6a60f5827fd`, and `feasibility.json` `3ee9921ba65d3a5f3a54fe4230be36bf799a92281065cd9a1ee2818a797b682c`.

**GO for executable-source preparation, not Blender execution.** The revision makes the required bounded changes: root `1579` alone enters the derivative; all other pieces remain raw-master-only; global topology counts are no longer falsely attributed to that component; the source diagnostic is required before the modifier; and one `.006` reconstruction replaces the former fallback/probe loop. The 1,149,200-cell AABB estimate is arithmetically consistent with the stated main-only span and remains explicitly non-guaranteeing. The six-form 512px gate now makes target fidelity a real admission condition without authorizing invented cap geometry.

The execution source must render **both raw and derivative against the same full-R5 raw AABB plus 5% margin**, as directed for the comparison; the current prose/JSON says main-work bounds, which would crop the excluded raw pieces and weaken the before/after evidence. Use the full raw AABB for the shared review frame, while retaining main-only bounds for the `.006` resource estimate and derivative construction. This is a framing clarification, not a new reconstruction method. Source review remains required before the one guarded Blender job.
