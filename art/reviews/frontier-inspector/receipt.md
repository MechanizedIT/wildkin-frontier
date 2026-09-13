# Frontier generator inspector

September12,2026. `tools/inspect-frontier.mjs` is an offline diagnostic CLI; it changes no runtime or save. Run `node tools/inspect-frontier.mjs`; bounded seed/center/extent/resolution options are documented by `--help`. It uses the normalized descriptor, current samplers/placement recipes and actual authored Camp source. No new dependency was added.

`frontier-inspector.svg`, `frontier-inspector.json` and `inspector.png` describe the same300×300m window x−150..150,z−250..50 at96×96 samples, edition1/seed0x4f1a2b3c. Panels show elevation/2m contours, current wetland habitat weight, slope and candidate placement. Habitat weight is not an implemented climate-moisture field. Placement totals are candidates throughout the window, not simultaneous live residents.

Baseline elevation−.28..9.538m; slope mean.061/p95.164; wetland mean.689. Candidate totals230forage,9wildlife,193scenery. Deterministic replay matched the measurement hash and SVG bytes; alternate seed/bounds changed the measurement hash. Resolution181 was rejected. Node syntax and XML validation passed; the default outputs were restored after option checks.

Root inspected the final1280×1490 PNG rendered with the existing bundled sharp runtime. A first browser capture had a duplicated compositor band and the initial SVG header also overlapped the panel. Panel origins/legends were corrected before final rendering. This is a quantitative chart, not a Dream Loop art target; no aesthetic score is assigned.

`docs/REGIONAL_DIVERSITY_PLAN.md` proposes six regional families, six Wildkin body families and twelve flora/decor building blocks. All regional families and their progression remain unshipped proposals. The next implementation is one25–40m plateau fixture with shared terrain/collision and meaningful access/return. Use the inspector alongside actual overhead and ordinary gameplay review; it cannot prove jumping, climbing, performance or a satisfying outing by itself.
