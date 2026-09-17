# Independent Trailgloam standalone postprocess plan review

**Decision: HOLD for three focused contract corrections before implementation.** Reviewed `standalone-postprocess-plan.md` SHA-256 `a4e9e163d0b77c07d299563bbbd469507ef4eb882e679393af54105f6292a7f2`.

The design is appropriately narrow: it pins the archived successful PLY lineage, revalidates owned tensor handoffs, uses two serial children, does not repeat conditioning/flow inference, retains the raw PLY, and treats the model-free `o_voxel` route as a new textured derivative rather than a raw-master rewrite or generic checkpoint-resume facility.

Before source work, correct these specific items:

1. Set the stated derivative target to **60,000 faces** with a 1024 texture, matching the requested master-quality target. The current `decimation_target=30_000` contradicts that scope.
2. Make resource safety executable. Keep the existing 8 GiB host entry and 6 GiB host reserve, and add a numeric pre-CuMesh GPU-free threshold plus a documented low-free-GPU stop condition. Recording CUDA free/reserved values alone is observation, not a gate. Preserve the raw PLY and state receipts if the condition fails.
3. Give the private state handoff an exact typed schema, not names alone: tensor keys, required rank, dtype, contiguous/device-transfer rule, shape/cardinality relation, and scalar encoding for `voxel_size`; likewise specify the JSON layout schema accepted by the postprocess child. The child must reject extras or mismatches before CUDA allocation. Add CPU fixtures proving rejection of a wrong dtype, rank, tensor key, layout, hash, or PLY count.

The explicit raw-PLY SHA comparison is a prudent lineage gate, provided an exact mismatch remains terminal and does not trigger inference, a partial resume, or an automatic retry. The later current-runner keyword repair is correctly kept separate from the archived executed runner and has no bearing on this raw PLY result.

## V2 re-review — HOLD for one numerical safety correction

Reviewed `standalone-postprocess-plan.md` v2, SHA-256 `837f7d30839bfade497442eefeabb1ab5261703914040fc23f0e316dece5dbcf`. It resolves the earlier plan holds: the postprocessor now specifies a 60,000 target with a 1024 texture, six exact CPU tensor contracts and canonical layout JSON, terminal pre-CUDA rejection fixtures, pinned source lineage, and a model-free two-child continuation. The raw master is never overwritten or treated as a generic checkpoint.

One correction is needed before builder implementation: replace the **7.0 GiB** pre-CuMesh VRAM entry floor with **6.0 GiB free**, retaining the proposed **1.0 GiB** pre-next-phase stop guard and the existing host 8/6 GiB controls. The measured cold value is only 7.07 GiB, so a 7.0 GiB gate is overly brittle after harmless CUDA-context accounting while not providing a measured peak guarantee. Six GiB is a concrete entry reservation; the later phase guard still stops before a new allocation phase when less than one GiB is free.

Also label `decimation_target=60_000` accurately as the installed `to_glb` **decimation target parameter** (the installed API describes it as a target number of vertices), then record actual output triangle/vertex counts for review. Do not pre-claim a 60k-face derivative from that parameter alone.

With those two wording/value edits reflected in the frozen plan, it is GO for a separate implementation/source-test gate. No GPU postprocess is approved by this plan review alone.
