# Independent source review — Lantern Geometry PLY R5

**Current verdict: GO for one fresh, serialized GPU run.** Reviewed final runner SHA-256 `a9554323a4c5444f9023472634a1358fb3f4c4a4b851360b589221accf5c4178`; the focused CPU suite passed **17/17**. This clears only the input-pinned, geometry-only Lantern run. Any PLY remains an untextured, non-admitted raw master requiring separate inspection and visual/topology review.

## Historical initial review — superseded

Reviewed `tools/art/trellis-process-staged.py` SHA-256 `b1fbd10cdf9aba9b2a18552d011731a6b8db9097fe7c8e60882d3b37f2f6e691` against the approved Lantern proposal and conditional review. Ran the focused CPU suite: `python tools/art/trellis-process-staged.py --self-test` — **15 tests passed**.

The implementation preserves the full-export 750,000-face profile and buttress-only 1,100,000-face profile/input pin. It adds a distinct `lantern-geometry-ply-v1` contract fixed at 2,300,000 decoded faces and exact Lantern V2 SHA-256 `85bd175a6b102cf183b50ff5ca45a1afd6847a6920a28b0039bd8e1e98d6b2ac`. The immutable profile contract rejects mutated mode/cap/output fields, verifies the bound input from the plan before parent work and again at the start of every child stage, and retains the fresh-output, mutex, offline, stage-floor, coordinate-limit, and 6 GiB reserve controls.

The geometry-only branch covers both reviewed PLY modes before importing the full export path. It records the operation exclusion list, tensor dtypes/devices, exact PLY payload/hash/count/index evidence, and uses the existing binary re-read validator. The focused tests cover unchanged profile caps, exact pin/rejection of another image, mutable-cap rejection, geometry branch ordering, and PLY round-trip/nonfinite/index failures.

Run exactly one fresh output directory under the existing exclusive GPU ownership. A face count above 2,300,000 must remain terminal before serialization. Any resulting PLY is raw untextured geometry that requires separate neutral visual and topology review; it is not a model, collider, placement, harvest, or runtime admission.

## Historical evidence-completeness HOLD — resolved

**HOLD for four small source/test corrections before GPU use.** The contract code itself rejects `mode`, `max_decoded_faces`, and `output_name` mutations and rechecks the image at every child stage, but the new Lantern test changes only the configured cap. Add focused tests that reject Lantern plan mutations to mode, output name, and profile identity, plus a tampered-after-plan input path. Add a pure face-limit helper or equivalent CPU-only seam and test that `2,300,000` is accepted while `2,300,001` refuses before any PLY write; checking only a changed plan field is not the promised decoded-face boundary proof.

The decode receipt also needs the actual bound/reverified input SHA, source vertex dtype **and device** before the CPU copy, and vertex/index copy byte counts (with their dtype) before serialization. The current receipt records source index device/dtype and PLY vertex bytes, but not the full requested provenance. These additions are evidence and test repairs only; retain the profile constants, guards, geometry-only branch, and all existing behavior unchanged. Rehash and rerun the focused suite after the repair.

## Final source recheck

**GO for one fresh, serialized GPU run.** Reviewed repaired runner SHA-256 `a9554323a4c5444f9023472634a1358fb3f4c4a4b851360b589221accf5c4178` and reran `python tools/art/trellis-process-staged.py --self-test`: **17 tests passed**. The new pure boundary helper accepts exactly 2,300,000 and refuses 2,300,001 before PLY serialization. Lantern tests now reject mutable cap, mode, output-name, and profile changes, plus a file tampered after a valid plan was formed. The receipt records the reverified input hash, source vertex/index dtype/device/byte counts before copy, and copied dtype/byte counts before serialization. Existing guards and profile constants are unchanged.

One fresh exclusive run may proceed. Its PLY remains an untextured raw master requiring a separate inspector and visual/topology gate.
