# Independent Trailgloam geometry-only PLY source review

**Decision: GO for one fresh serialized Trailgloam PLY run.** Reviewed `tools/art/trellis-process-staged.py` SHA-256 `62a0a119267a8c17a48daf51f5894302adce856851d1c89883a700a02d07fbfa` and `geometry-ply-source-test-receipt.md`.

The added `trailgloam-geometry-ply-v1` profile is isolated and correctly binds all consequential values to immutable source constants: input SHA `417daef7277d21dd3c5f53abc92fe4e63f11f575cf04a7e9cca7bae3d2afc2ff`, PLY-only mode, output `raw-geometry.ply`, and the 1,900,000 decoded-face ceiling. The plan contract is re-derived and revalidated before every child import; post-plan input tampering is rejected.

The PLY branch occurs before `o_voxel` import and records/re-reads the direct CPU float32 coordinate and uint32-index serialization. It retains the shared no-heavy-export path and records the operations it did not invoke. The ordinary full-export 750k ceiling and 8 GiB export condition, Rootbound PLY 1.1M ceiling, Lantern PLY 2.3M ceiling, and shared offline/mutex/floor/6 GiB reserve controls remain intact.

I independently ran `py_compile` and the focused self-test suite: **20 tests passed**. The suite includes the Trailgloam exact-input/tamper/contract-mutation cases, exact 1.9M boundary acceptance plus 1,900,001 refusal, PLY round-trip validation, and profile isolation.

Use a new empty preflight directory and a distinct new empty run directory. This is one raw, untextured geometry observation only. If the count exceeds the new cap or any guard/serialization check fails, preserve the receipt and stop. A successful PLY still requires the separately reviewed raw inspector and later visual/topology judgment before any cleanup, export, animation, or runtime claim.
