# F4 — body-tone foundation; eye overlays rejected

September 12, 2026. Root: Codex Astra; pure material work: Sol; isolated asset work: Terra; independent visual reviews: Sol and integration reviewer. Producer choice under Chris's continuous-development mandate, not owner art acceptance.

## Selected result

The original Mossling V3 GLB, texture, geometry, rig and clips remain unchanged. Generated individuals and owned followers apply the same restrained whole-body tone (strength .45). V3 has one material covering fur, foliage and flowers: this is **body tone**, not an isolated coat channel. Five palette genes are supported. Eye color, size, markings and crest/tail choices remain unexpressed data. Static species portraits remain catalog illustrations.

One material is cloned per V3 instance. Existing owned tint/opacity clones are reused; borrowed geometry/textures stay shared. Disposal releases each owned material once. Experimental named body/iris channel support is covered by fixtures but no eye-overlay asset ships.

## Visual outcome

The unchanged original eye target scored 8.1 for feasibility. Actual overlay v3 scored 4.0/HOLD: forehead pieces produced extra eyes. UV-correspondent v5 and v8 still put a teal piece beside the visible right iris. Eight local candidates did not produce a reliable bilateral fit. All were rejected; the material/coordinate failure and next UV-ID method are documented in `../../source/mossling-v4/eye-overlay-handoff.md`. The three decisive failed views are retained here.

`body-tone-r1.png` shows the selected reduced scope. Independent review found intact anatomy and distinguishable but subtle lichen/clay tones, usable provisionally. This does **not** pass or replace the original eye target. No additional model or triangle-budget exception was admitted.

## Proof

- Paired runtime fixture: lichen material `d2d8ce`, clay `ddd1cc`; two independent owned materials, neutral shared template `ffffff`. Removing left leaves right's color/animation intact. Draw calls fall 3→2 and triangles 40,000→20,001 including the floor. These are isolated renderer counts, not phone FPS.
- Existing Walk clip runs through the normal animation controller; this is an in-place material check, not new locomotion admission. Existing V3 motion/physical-phone caveats remain.
- Packaged generated sources `f1:w:0:-2:0`, `:1` and `f1:w:1:-1:0` express lichen `d2d8ce`, clay `ddd1cc`, dusk `cdcbd1` independently.
- Previously natively captured clay individual `wildkin_1b156h6` reloads as the selected follower with `ddd1cc`, owned material and unchanged genome/identity. Both owned records remain. The full lure/capture/bank transaction was proven in F2B and was not repeated here; this checks expression from that saved record against the same wild recipe.
- Focused appearance/external model tests: 12/12. Shared checkpoint with F5A: 1,057/1,057 tests, verify/world/campaign/build/validation/ZIP PASS; 43.95 MB unpacked / 20.49 MB ZIP. Campaign validation does not establish the new frontier economy.

Browser fixtures used isolated localhost:8082; packaged smoke used localhost:8081. No production save, model, external service or user-origin save was changed by diagnostics. The temporary appearance tab was closed. `tools/art/review-wildkin-appearance.html` remains a local review surface outside the portable build.
