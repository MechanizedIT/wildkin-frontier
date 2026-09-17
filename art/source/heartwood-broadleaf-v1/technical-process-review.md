# Heartwood broadleaf fresh-process staging — independent technical review

## Decision: HOLD before execution

The process boundary preserves the intended numerical route: it uses the recorded 512 configuration, explicit 12-step seed/step values, fixed CPU tensor-only handoffs, `weights_only=True` loads, coordinate and decoded-face caps, and no-remesh export. Children exit before the parent launches the next stage, and the parent owns only its own child process. The installed pipeline calls and `o_voxel.postprocess.to_glb` arguments remain compatible with the previously reviewed staged runner.

One material resource guard was lost at the decode/export seam. `trellis-staged.py` checks `ensure_free(RESERVE_GIB + WORKSPACE_GIB, 'Export workspace')` after moving decoded attributes/coordinates to CPU and before importing/running `o_voxel.postprocess.to_glb`. `trellis-process-staged.py` does not: its decode child can pass the 13.30 GiB pre-stage floor, consume memory during decode, remain just above the 6 GiB watchdog reserve, then begin the heavy CUDA clean/UV/bake export below the retained 8 GiB export-workspace floor. Restore that same explicit export check before `o_voxel` work. Do not lower any floor.

The process helper also uses a distinct named mutex (`Local\\WildkinTrellisProcessStagedJob`) from the existing staged helper. Its process-name scan generally refuses an already-running sibling, but a concurrent-launch race can pass both scans before either child exists. Use the existing shared TRELLIS mutex name, or another common cross-helper mutex, so serialization does not depend on timing.

After those two small corrections, the plan may be re-reviewed for one supervised run. Existing risks remain: metadata floor estimates do not prove peaks; the face cap follows decode; a guard stop, stage failure, or face refusal is an acceptable terminal result; and a raw GLB would still be unreviewed candidate evidence.

## Guard-repair recheck: PASS for one supervised run

The helper now uses the existing shared `Local\\WildkinTrellisStagedJob` mutex. In the decode child it moves attributes and coordinates to CPU, collects/empties cache, then restores the explicit `ensure_free(RESERVE_GIB + WORKSPACE_GIB, 'Export workspace')` check and event before importing `o_voxel`. Both prior blockers are resolved without lowering a threshold or changing the numerical route.

This approves one run only under the documented fresh RAM/VRAM and sole-job check. A pre-stage refusal, reserve breach, child failure, decoded-face refusal, or export-workspace refusal remains a valid terminal result that must preserve evidence rather than trigger a retry.

## Process trial 1 terminal evidence and import-order recheck

`process-trial-1` is correctly preserved as a terminal import failure, not a candidate mesh. Its events show background, conditioning, sparse, and shape stages completed; the sparse child fell to 12.16 GiB free and returned to 18.87 GiB after exit, while shape fell to 13.26 GiB and returned to 18.85 GiB. That is meaningful evidence that the child boundary releases retained stage memory. Texture then failed before inference because `SparseTensor` was imported before the fresh interpreter had installed the TRELLIS root on `sys.path`.

The repair calls `bootstrap_child_imports(install)` before every stage-specific import and before pipeline construction. The added isolated-child import smoke uses the same executable, working directory, and offline environment, and the documented resolved module is `trellis2.modules.sparse.basic`; it performs no model load or CUDA inference. The corrected import order is therefore **PASS for one fresh corrected supervised run**. Treat that run as the one permitted corrective helper experiment, with the prior guard/serialization restrictions unchanged.

## Process trial 2 — terminal outcome

**HOLD; generation study closed for this visit.** The corrected process run completed background, conditioning, sparse, shape-flow, texture-flow, and the decode numerical operation. The process boundary continued to return memory after each child. Decode produced 7,057,316 faces and 3,672,570 vertices, exceeding the retained 750,000-face limit; it correctly refused before export, produced no GLB, and returned to 17.79 GiB free after child exit. Do not lower the cap, simplify the refused mesh, or run TRELLIS again for this Heartwood visit. The broadleaf role remains deferred/HOLD pending a later changed construction method.
