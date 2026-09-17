# Independent review — Trailgloam segmented R4 plan

**Verdict: HOLD. The changed method is promising, but this plan is not yet executable evidence for a counted model pass.**

Replacing the failed R3 perforated-shell route with separately closed articulated solids and deliberately covered dark cuffs is a feasible direction for this beetle-like candidate. It can preserve intentional segmentation without pretending an open-tube overlap is a manifold connection. The stated all-angle render gate is also appropriate: front/rear reference occlusion cannot waive six grounded leg-chain proof, and the two frond roots require actual rendered contact coverage.

The current CPU receipt copies requirements instead of measuring a concrete construction. It hardcodes every `sole_z_m` as zero rather than deriving it from planned hoof geometry; its envelope omits limb radii, cuff dimensions, and end/hoof extensions; and its covered-overlap rows merely repeat target values rather than calculate solid-surface penetration. The body-point bounds also duplicate one corner, so they cannot establish the declared shell envelope. Its three-quarter projection is the same axis pair as front, which is not a three-quarter proxy. None of those proxies proves surface visibility or occlusion in any event.

The frond language is contradictory: parts are described as separately closed while the blade construction base is also described as uncapped and bridged to a collar. Choose one coherent construction: either each closed blade overlaps a separately closed collar, or the blade and collar are a single closed connected part. The head likewise needs a literal volume/contact test against the shell, rather than an asserted 0.10 m overlap.

Before any Blender build, revise the CPU plan to construct the actual prism/ellipsoid/wedge/cuff geometry once from literal parameters and derive: complete bounds; each hoof's actual minimum Z; closed-part status; measured shell/head, shell/coxa, link/cuff, and collar/frond overlap or clearance; and a true rotated three-quarter projection. Add a conservative surface-visibility proxy only as an aid, labelled non-rasterized; Blender all-angle/underside renders still decide the six-chain and cuff/frond contact gates. Preserve the proposed part count, six named chains, two fronds, and no-runtime boundary while making this one proof revision.

## R4-v2 re-review

**Verdict: HOLD; stop this plan loop and carry the changed-method insight forward.** V2 usefully fixes the prior false sole/bounds/projection claims: it reports a 2.14 × 2.08 × 1.8025 m envelope, 49 named planned solids (3 body + 42 leg/link/hoof/cuff + 4 collar/frond), and a genuinely rotated three-quarter anchor proxy. The separate closed collar/blade wording is now coherent.

It still does not construct or prove the claimed solids. `closed_parts` are names, not closed mesh audits; capsules and boxes are conservative proxy bounds, not the planned six-sided limbs, folded blades, or five-section head wedge. The reported head/shell penetration is 0.05067 m rather than the plan's 0.10 m, and the minimum shell/coxa penetration is 0.04946 m rather than the stated 0.075 m. Link/cuff and collar/frond penetrations remain requirement values rather than measured surfaces. Positive support-function overlap is not proof that opaque surfaces cover the joints from the intended views.

This is enough to preserve the segmented-cuff direction, but not enough to launch a counted model. Do not revise the same plan again. A later changed-method builder must author actual closed primitives first and audit their generated topology and surface contacts before it can claim six grounded chains or visible cuff/frond coverage.
