# Independent U4F generation-gate review

**Disposition: `U4F_SOURCE_GENERATOR_HOLD`.** This is the earliest honest result.

I independently checked the approved-reference SHA, attempt directory, helper receipt, and the actual owned-server logs. Attempt 1 used the required Small512 profile with candidate-04, seed 1234, 12 steps, one job, a 60,000-face export target, and 1024 texture. The server completed sparse-structure sampling (14.53 seconds), then the unchanged launcher guard stopped the owned process before Shape SLat completed: only 5.31 GiB RAM remained, below the documented 6 GiB reserve. The client-side WinError 10054 is consistent with that guard-induced process exit. The attempt directory has no files, no raw GLB exists, and the client did not write its normal trial receipt.

Attempt 2 is **not materially justified by the written policy**. That retry is defined for a structurally poor raw result (different seed/reference conditioning) or a structurally good but under-resolved result (guarded 1024 with adequate headroom). Attempt 1 produced neither. Changing the seed does not address this measured shape-stage memory failure; lowering the reserve, disabling the guard, or repeating the same route is not permitted.

The blocker is **memory / guarded tool-runtime termination**, not topology, image interpretation, or export ceiling. The current evidence does not identify the full shape-stage peak and does not prove another authorized provider or a future safe profile could not work. It only establishes that this guarded Small512 route could not complete safely under this run's observed state.
