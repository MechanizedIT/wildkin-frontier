# Rootbound buttress-canopy anchor v1 — builder record

**Status:** reference PASS; candidates v1 and v2 HOLD; final candidate v3 is independently HOLD at 6.0/10. Nothing in this folder is admitted to runtime, the asset registry, or collision data.

## Binding contract

- Static Rootbound Wildwood anchor: 5–6 m total exported height, no more than 7 m lateral extent.
- Three to five grounded, closed buttress roots, a compact lower-mass collider only, and no canopy walkability, arch, bridge, or gameplay function.
- Matte base-color palette, one material, and at most 5,000 triangles. Keep raw/reference, editable Blend, GLB, renders, hashes, and review receipts outside shipping assets.

The reviewed source target is `reference/target-v1.png`; its independent reference PASS receipt is `reference/review-v1.md` (target SHA-256 begins `0e8dc741`).

## Candidate history and guard record

| Candidate | Status | Method and evidence |
| --- | --- | --- |
| v1 | HOLD (2.7/10) | Initial manual Blender construction. The receipt is `candidate-v1/model-review-v1.md`; it found a flat stump/starburst silhouette rather than joined buttresses, branches, and canopy. |
| v2 | HOLD (4.1/10) | Manual rebuild. The receipt is `candidate-v2/model-review-v2.md`; it remained a capped-cone/icosphere construction rather than a continuous, hand-shaped silhouette. |
| v3 | HOLD (6.0/10) | Final, changed-method Blender build: continuous faceted trunk/root mesh with buttress wedges, three joined unequal forks, and three irregular canopy shells with purposeful windows. Evidence is in `candidate-v3/output/`. |

TRELLIS was never used to generate a candidate. The first owned Small512 cold start reached `Loading TRELLIS 2 pipeline` and was conservatively stopped after about 52 seconds before readiness. Its 13.10 GiB free-RAM observation was **above** the 6 GiB post-launch reserve, so this was neither a reserve breach nor proof of service failure. For v2, the fresh pre-import check was 17.82 GiB, below the documented 18 GiB Small512 launch guard; no process was started. v3 was explicitly manual Blender only, with no further TRELLIS start.

## Final candidate v3 metadata

- Editable source: `candidate-v3/output/rootbound-buttress-v3.blend`; export: `candidate-v3/output/rootbound-buttress-v3.glb`.
- GLB SHA-256: `5e68d51e8b9b983dc16784b4ceecd24515afcbaa8d95a2d58b8cdc77e7c609e6` (37,264 bytes).
- 433 triangles, one material, grounded. Measured Blender Z-up extent: **6.002 × 4.780 × 5.730 m**.
- The compact lower-core collider is a proposal only: Blender source dimensions `[2.9, 2.3, 2.7]`, center `[0, 0, 1.35]`. `candidate-v3/output/collider.json` states the GLB Y-up mapping and excludes outer buttress tips and all canopy. Runtime must refit it after placement.
- Exact candidate inspection renders are `candidate-v3/output/renders/front.png`, `rear.png`, `left.png`, `right.png`, `three_quarter.png`, `game_48.png`, and `game_96.png`; machine-readable provenance is `candidate-v3/output/candidate-manifest.json`.

The heavy-GPU slot is released. The final independent review at `candidate-v3/model-review-v3.md` holds the flat canopy platters, thin pointed roots and narrow generic trunk. The three-pass loop is exhausted; no runtime admission or fourth candidate was made. The exact GLB also passes the structural prop checker (`candidate-v3/output/glb-check.json`); that result does not waive the visual hold.
