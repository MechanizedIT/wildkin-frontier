# Fen observatory receiver

Exact admitted GLB SHA256: `91b2e30d4813ee8b67f3a122f84e6641bdf99b4eead74e9c84835ddf0a32ccee`. Independent model PASS8.1 against target `0cd82420a80314a34ae6f56ff7fd9456c964a3930e38722f0589ef404ff41390`; see `independent-review.md`. Subsequent bounded actual-game art/pose review PASS8.0 and Author visibility addendum are retained in `runtime-independent-review.md`.

Created locally in Blender. The generated reference, provenance and independent pregen review are retained in `art/targets/fen-observatory-v1/`. This directory retains the exact GLB, editable and joined Blender source, frozen builder, palette, manifest, all six exact-export views, sweep audit and independent receipt. Runtime model bytes are identical at `assets/models/fen-observatory-v1/model.glb`. Production builder: `tools/art/build-fen-observatory.py`; reconstruction refuses to overwrite an existing candidate.

The common low plinth and two pylons support an octagonal concave receiver solely through aligned side bearings. The bowl, rim, spokes and seated core form a single rigid assembly. There is no central strut or azimuth axis. Geometry is intentionally simpler than the reference's stone wear; plain stone faces and applied-looking inlays remain documented limitations.

- `ReceiverStructure` is fixed.
- `ReceiverTiltPivot` is the moving bowl/rim/spoke/core mesh at glTF `(0,1.98,0)`, identity rest rotation/scale. Its neutral18° backward tilt is baked into its vertices. Only localX rotation is intended; planned runtime±8°, source/export proof±10°.
- `ReceiverAxles` contains only the two coaxial shafts and is an identity-transform child of that pivot. It follows the same motion, with no separate rotation owner.

Budget:1,616 triangles,3 mesh batches,1 material,1 embedded256×256 palette,111,120 bytes. Neutral bounds approximately3.6W×3.151H×2.217D metres; baseY0; glTFY-up/+Zfront.

`export-check.json` tests every non-axle vertex explicitly after a fresh GLB import. The shaft/bearing contact is the only named exclusion. Continuous±10° endpoint and exact critical-angle tests yield209.5mm minimum vertical clearance above fixed geometry in the moving body's X span and67.4mm lateral pylon clearance. All six current PNGs use the exact admitted GLB, Cycles CPU4threads,24samples,512×512. Neutral and both sweep extremes visibly differ; rear/underside expose the closed shell and clear air beneath it.

No geometry or palette was altered during packaging. Placement, collision, waypoint state, motion timing, pause/Author/reload and actual game lighting are owned and verified by runtime integration. No physical-phone performance claim.

Runtime evidence is retained at `.dream-loop/overnight-fen-observatory/runtime/`: matched normal and side camera motion phases, native discovery/Pack/reduced-motion/extraction checks, physical front stop, and Author neutral/scale/reload receipts. Native Author focus/zoom and isolated Edit views16–17 complete the visibility proof; earlier poorly framed11–13 remain excluded. The entry/position/restart fixtures are disclosed separately from earned campaign play. Source geometry and exported bytes remain unchanged throughout these reviews.

Focused packaged8081 and already-loaded offline replay: `.dream-loop/overnight-canopy-fen-package/README.md` and `proof.json`. Exact response hash verified, native discovery/motion and Pack pause repeated offline with zero page errors, failed/external/offline requests. The receipt transparently retains and corrects a harness-only local blob URL classification error. This is not a cold offline navigation or physical-phone test.
