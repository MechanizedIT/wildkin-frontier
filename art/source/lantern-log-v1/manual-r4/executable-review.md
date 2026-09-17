# Independent executable review — Lantern manual R4

**Verdict: HOLD for two narrow pre-execution corrections.** Reviewed builder SHA-256 `265f09906f7f971f323ed44ebca5bde101f16f8da095d43f5720f9f78bedc43a` and parameters SHA-256 `797d79dd9b4d407b9abaf48ba2fd1a88554c6a5d4a101bffc36be87bc5703952` against the frozen repair plan.

The literal body method matches the approved repair: it derives the 23 shared angular samples by piecewise interpolation from the original twelve-sided rings, applies the stated belly weights and four valley depths, retains the `.58` shallow closed recess, and creates the specified broken near/far rim treatment. It also clones the 12 R3 stem/cap meshes into separate data blocks, compares their vertex/index/matrix signatures before replacement materials, re-casts moss against the actual R4 surface, repeats bounded attachment/ground/topology checks, and renders matched R3/R4 views at all seven directions and three sizes with absolute output paths. The 8 GiB start and 6 GiB reserve gates remain present.

Correct these two implementation details before the one build:

1. **Bind the imported R3 blend by hash before loading it.** The source binds the frozen R3 parameters but only checks that `lantern-log-manual-r3.blend` exists. The plan requires a hash-bound preserved R3 baseline; record and enforce its expected SHA-256 before `bpy.data.libraries.load`, then include it in the receipt. Comparing a clone to whatever file was loaded cannot prove it was the reviewed R3 artifact.

2. **Assign groove material to actual wall spans and retain a dark wood tone.** The current `groove_angles` condition paints three faces per groove, including the face from the outer shoulder into the next unaffected sector, and uses `palette['recess']` for that material. This will recreate broad dark stripe bands, contrary to the plan's narrow inset fissures with darker wood walls. Mark only faces whose arc terminates or begins at each valley (the two wall spans), and use a deliberately darker existing wood tone or a restrained derived wood tone. Keep `recess` material reserved for the closed inset face.

No geometry, colony layout, or pipeline redesign is required. After those changes, rehash the builder and preserve the existing final triangle/contact/framing gates for the execution review.

## Final source recheck

**GO for one R4 execution.** Builder SHA-256 `c4ea96f365ff5659744a18a4fad71f5ce9dd1b4be3023580604d9a768777b777` now binds the exact preserved R3 blend SHA-256 `a6d465a87b80b43d3189dfac6126eaa7a45a186e9608677b2e440dc7d54a4ba8` before loading and uses the corrected sibling path. Its material logic confines the dark-wood groove material to complete 165–185, 215–235, 290–310, and 335–355 shoulder intervals; the closed recess alone retains the deep recess material. The final input remains parameters SHA-256 `797d79dd9b4d407b9abaf48ba2fd1a88554c6a5d4a101bffc36be87bc5703952`.

This clears one execution only. Actual geometry/audit and matched R3/R4 render evidence remain the next independent gate.
