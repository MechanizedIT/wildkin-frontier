# Rootbound TRELLIS2 low-resolution trial plan — independent technical review

## Decision: HOLD pending two operative-plan corrections; then GO for one supervised smoke trial

The runner supports the proposed minimum configuration: one image, pipeline `512`, `--steps 1`, `--faces 30000`, and fixed 1024 texture export. It restricts steps to 1–12 and export faces to 10k–30k. The process boundary, offline environment, socket/process/mutex exclusion, and hidden-child sequencing are appropriate. It refuses a competing job and only terminates the exact `Popen` child it created after a reserve breach; it does not kill unrelated processes.

The numerical safeguards remain required: a fresh empty output directory, pre-import whole-plan floor, every stage floor, 6 GiB reserve, 32,768 coordinate ceiling, and pre-export 750k decoded-face refusal. The pre-export check is **8 GiB total free RAM**: the 6 GiB reserve plus the 2 GiB workspace component. The plan must replace its contradictory “2 GiB export-workspace check” / “8 GiB export workspace” wording with that exact distinction. Current available-RAM values in a prior plan are historical; root must regenerate and satisfy the current preflight immediately before launch.

The input must also be corrected from “root-and-stone anchor” to the selected **canopy-free buttress-root / split-trunk anchor**. Stones are already an admitted Rootbound family, while adding one to the trial image would introduce a separate object and defeat the intended coarse connected occupancy test.

## Step policy

`--steps 1` is a valid minimum smoke/occupancy experiment, not a quality expectation. Run it once under the existing guard. If it refuses/fails, retain the failure evidence and stop. If it reaches raw GLB under all caps, inspect that raw master and use the authorized Blender cleanup derivative only if it has a coherent grounded root silhouette.

Do not automatically launch 4- or 8-step variants. A single 4-step retry could be proposed later only if the one-step result passes decode but visibly lacks enough shape quality to judge cleanup, with a fresh output directory and an independent decision that the changed sampling budget is worth another serialized run. Eight steps has no current evidence-based need.

No runtime, source, or asset admission follows from this trial gate.
