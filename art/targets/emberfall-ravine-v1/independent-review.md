# Emberfall Ravine V1 — independent target review

September 12, 2026. Judge-only review by an independent Codex agent. No scene, camera, source, browser or asset generation changes performed.

**PASS 8.1/10 for target fitness together with the binding role contract and numeric plan.** This admits a useful visual direction for implementation. It does not admit terrain support, traversal, gameplay preservation, native camera readability, performance or a shipped scene. No owner acceptance of this unseen candidate is inferred.

## Evidence inspected

- Actual full `target.png`, SHA256 `afb81b7e8eace76974feac3ee15f22598991c05a5675fee89405a3cd6f796025`.
- Actual baseline `section_3.png` and `section_3-overview.png` under `.dream-loop/emberfall-ravine-v1/baseline/maps/`.
- Actual approved `art/style/explorer-master.png`, SHA256 `a5c6d707832bb3fd0b21289be540e3fd75970befca66a442b65ebf673543adff`.
- Current slice, local Wildkin development skill, Dream Loop rubric, target `role-contract.md`, and `.dream-loop/emberfall-ravine-v1/plan.md` / `role-audit.json`, including exact role lists, anchors, foundry structures and route heights.

## Scores

| Category | Score | Visible basis and remaining gap |
| --- | ---: | --- |
| Composition | 2.4/3 | Two substantial unequal landforms and a broad low valley are immediately legible. The low western foundry remains distinct. East has a convincing principal high destination. West still resembles a long ribbon with several switchbacks, and neither separate return is as clear as the numeric plan. |
| Lighting | 2.6/3 | Warm lit tops, darker cliff faces and restrained contact shadows explain relief without glare. The broad floor is readable. Stronger selective value grouping would keep native-scale creatures and ore from disappearing into similarly warm detail. |
| Materials | 2.5/3 | Substantial matte facets, subdued industrial blocks and warm mineral forms fit the Explorer's simplified solid construction. The ground has much finer mottled detail than the master, and the orange floral scatter becomes a nearly continuous edge trim. |
| Details | 0.6/1 | The image preserves a recognizable foundry cluster and legacy route accents. Tiny dark silhouettes, cyan clusters and a rectangular east-shoulder mark remain ambiguous; visual counts cannot establish the protected gameplay ledger. |
| **Total** | **8.1/10** | **PASS as image plus binding plan; all runtime gates remain open.** |

## Constructibility and role judgment

The principal composition is compatible with a 120×120m single-valued heightfield: a low central floor, raised flanks, broad tops and grades winding around their outer shoulders. I see no essential bridge, stacked route, traversable overhang, tunnel or physically impossible overlap that would require a different terrain system. Exact 12m west / 16m east / 12m cache heights cannot be measured from this image. The provided route anchors have enough length to make those proposed changes plausible; arithmetic and an image are not full-width surface proof.

The low foundry reads as a sheltered place on the valley side, rather than a structure suspended inside the new cliff. Its existing shelves and recess must retain their audited relationship. The image's raised north-west outer rim extends beyond the planned western ridge: keep that as background framing only, and blend new terrain down outside the protected foundry island. Do not raise the foundry to imitate that rim.

The valley visually supports a broad encounter corridor rather than a slot canyon. Preserve the planned 24–30m clear floor and all four actor envelopes, including lateral exits. The image does not establish exact X/Z, actor counts or reward identity. Its small green arches are already present in the baseline and audited scenic ruin family; they must not become new gates or course markers. Likewise, cyan accents and tiny dark marks cannot authorize added harvestables or beasts. The visible rectangular east mark is not evidence for a second cache; implement only the existing cache at its audited location and 12m shoulder support.

## Highest-impact implementation gaps

1. **Make the two return routes explicit in actual terrain.** The west image route tends to read as a single winding rim; the eastern top-to-north connection is partly hidden among face breaks. Follow the plan's separate inner foundry descent and north-east descent, with continuous 4–5m walking lanes and broad turns. Prove these before decorating. Do not copy ambiguous painted lines onto impassable faces.
2. **Keep each flank one landform.** Preserve the larger eastern summit/shoulder relationship. Reduce repeated west lobes where they would create another equal-shelf course. Large continuous terrain faces must supply the height; scattered rock assets cannot substitute for them.
3. **Reduce uniform trim and preserve gameplay contrast.** Group orange/cyan decoration at meaningful toes and turns, leave genuinely quiet stretches, and expose the real ore/actor silhouettes. The target's pervasive small detail should not become hundreds of independent roots or collision obstacles. The plan's existing-root reuse, at-most-16 additions and measured draw/triangle budget remain binding.
4. **Review the player-height view before propagation.** This overhead sells height effectively but cannot show whether a 16m face hides the next turn, whether the camera stays retracted, or whether the opposite ridge is within the actual view range. First prove the lower court → summit → existing cache → separate descent loop and west → low foundry return with a companion.

No further image generation is required to begin that bounded prototype. This is a usable V1 with explicit gaps, not a claim of pixel-perfect correspondence or complete aesthetic closure. If later scene variants stall, retain the honest scores and use Chris's delegated best-usable-candidate rule; do not use it to waive support, collision, save or resource-role failures.
