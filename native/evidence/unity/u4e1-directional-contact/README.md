# U4E.1 — Directional contact-patch bakeoff

**Disposition: U4E1_CONTACT_METHOD_HOLD**

The directional measure distinguishes broad support-facing contact from corner proximity in deterministic fixtures and reports useful patch data on the frozen seeds. Neither single-axis experimental fitter produced a complete valid formation: B and C each accepted 0 of 6 seeds. The fixed parent directions and recipes cannot be seated across the full formations while preserving zero bidirectional positive-sample overlap and the 12.5 mm penetration limit. Independent review supports HOLD; the evidence does not support a visual-improvement claim for B or C because neither has a complete accepted scene.

The next bounded planning question is multi-axis/interlock composition. Do not start U5 from this HOLD.

## Scope

This was a bounded follow-up to U4E's visual HOLD. It kept the six frozen seeds, accepted attempt indices, parent graph, source shapes, spacing, yaw and initial placement. No source or matter-generation method, physics, support solver, lateral search, rotation optimization, U5 gameplay or full-gallery closure was added.

- A: existing global-min fitter targeting +25 mm.
- B: directional contact-patch fitter targeting 0 mm.
- C: directional contact-patch fitter targeting -5 mm.

The directional metric uses outward triangle normals with dot(direction-to-anchor) >= 0.35, actual triangle area weights, and a fixed 25 mm contact-band half-width. Contact-patch area ratio is accepted support-facing triangle area divided by all support-facing triangle area; witness spread is projected onto the two axes perpendicular to the fixed fit direction. B/C use deterministic bounded 1-D fitting and retain the existing sample-center overlap and penetration checks.

## Results

A rebuilt the six frozen control seeds successfully. All six passed their baseline source/domain checks (recipe, source geometry, content, mesh and spacing); each control graph connected to terrain and reported zero sampled-overlap pairs. The directional diagnostic often identifies why global minimum distance is weak evidence: for seed 7000's foundation, A has a 23.8 mm global minimum but a 276.8 mm area-weighted directional median, only 0.096% patch area, and one accepted witness with zero spread.

For the same seed and foundation, a B candidate reaches 6.12% patch area and a 1.19 m patch diagonal with zero sample-center overlap. The formation later fails at shoulder-right, where the selected fit has 23 / 177 positive sample centers across the two overlap directions. This is diagnostic evidence only; the candidate was rejected and no B formation screenshot exists.

| Seed | A control | B first rejected contact | C first rejected contact |
|---:|---|---|---|
| 7000 | Accepted; connected; zero overlap | shoulder-right — 23 / 177 positive centers | shoulder-right — 23 / 178 positive centers |
| 7004 | Accepted; connected; zero overlap | accent — no support-facing witness in the fixed band | cap — 0 / 7 positive centers |
| 7010 | Accepted; connected; zero overlap | buttress-left — 28 / 258 positive centers | core — 0 / 70 positive centers |
| 7015 | Accepted; connected; zero overlap | ridge-left — 44 / 35 positive centers | ridge-left — 132.1 mm penetration, above 12.5 mm |
| 7017 | Accepted; connected; zero overlap | leaning-mass — 51 / 375 positive centers | leaning-mass — 20 / 161 positive centers |
| 7019 | Accepted; connected; zero overlap | ridge-right — 0 / 23 positive centers | ridge-right — 0 / 23 positive centers |

These are the first failed intended-parent contacts in each seed. Rejected diagnostics may report overlap or excessive surface penetration; they are not accepted placements. Because B/C produced no complete formation, full candidate-pair overlap matrices and terrain connectivity are not evaluable. Partial children retain source/matter invariance to A.

## Independent visual review

The reviewer found A's flank stones visibly detached in seeds 7000 and 7004, and hovering or precariously seated stones in the stacked formations including 7010, 7015, 7017 and 7019. Alternate angles make occlusion an unlikely explanation. A's zero-overlap result does not establish convincing visual seating.

B/C did not produce complete scenes, so there is no valid visual method comparison or claim of improvement. Their broad-patch attempts conflict with overlap or penetration checks under the frozen one-axis directions. The result points toward a layout/interlock requirement, but this bakeoff cannot fully separate a fitter limitation from a layout limitation without the excluded lateral or rotation search. See [the independent review](review.md).

## Baseline parity limitations

All six seeds reproduce the committed source/domain checks, but none of the regenerated graph hashes or formation hashes matches the frozen U4E row. Exact image parity is 0 of 8 reference captures; new captures are 640 × 360 while the saved U4E references are 1920 × 1080. Treat the A captures as current visual evidence, not an exact baseline replay. These discrepancies remain explicit in [receipt.json](receipt.json).

## Validation and Player

- Focused directional EditMode: 4/4.
- Full EditMode: 160/160.
- Full relevant PlayMode: 3/3.
- No Windows Player was built: neither B nor C produced a technically viable complete formation, so the prompt's conditional Player proof did not apply.

Test summaries are in [tests/](tests/). Full per-contact data is in [metrics/contacts.json](metrics/contacts.json) and the six seed files. The raw control captures, two review boards and three required contact-debug views are in [captures/](captures/).

## Authority and stop

The original U4E evidence remains unchanged. This checkpoint does not replace the U4E HOLD with PASS, does not establish production readiness, and does not authorize U5. The owner may choose whether to plan the bounded multi-axis/interlock experiment.
