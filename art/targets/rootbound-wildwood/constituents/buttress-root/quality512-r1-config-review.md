# Rootbound buttress TRELLIS quality512-r1 — independent configuration review

## Decision: GO for one supervised quality trial

The reviewed configuration is the highest quality setting exposed by the current constrained fresh-process runner: one selected opaque input, 512 resolution, 12 steps, requested 30,000 export faces, seed 1234, and fixed 1K texture. It is a meaningful quality trial, unlike the cancelled one-step diagnostic, while remaining materially below an unreviewed 1024/cascade path.

The existing helper and experiment ledger support this exact bounded trial. The runner uses one fresh child per stage, CPU-only handoffs and RNG state, offline cache, a shared mutex and competing-process refusal. It keeps the 6GiB reserve, stage/bootstrap free-memory floors, 32,768 coordinate ceiling, 750,000 decoded-before-export refusal, and the 8GiB pre-export condition (6GiB reserve plus 2GiB workspace). Requested 30k faces only constrain post-decode export; they do not make a decode-cap pass likely or guaranteed. The held 7,057,316-face Heartwood result is relevant evidence for that risk.

Run only with `target-v2.png` / selected hash `65D8F8C63BE4A3C98738AABE72CAD21CE9399F3950914B559F8D1DC80ABD457A`, in the new private directory `.dream-loop/rootbound-buttress-trellis/quality512-r1`. Do not reuse the cancelled minimum directory or a prepare-populated directory: this runner requires an empty output directory for `--run`. Capture current plan/headroom at launch, then preserve input hash, generated plan, events, successful handoffs, and any failure receipt. No guard, cap, offline setting, or decoder/export behavior may be loosened.

A completed raw GLB is an unadmitted master. It needs separate raw mesh/component, neutral multi-view, grounding/scale, and Blender-derivative review before any Rootbound placement or runtime integration.
