# Skybreak crown cliff support findings

**Planning proof only.** The probe samples current `sampleFrontierHeight`, which
uses the live detailed Skybreak triangle sampler. It is not a camera, native
physics, or source-admission result.

The three original band-centre transforms fail: their full transformed hull
planforms cross current cliff faces, producing 0.609–17.905 m terrain spans.
Those positions must not be placed by merely sinking a model.

A bounded shelf scan finds three tentative current-terrain placements, each
using the supplied hull planform at 0.25 m samples and a base equal to its
minimum sample height:

| Role | Candidate | Base Y / terrain span | Route shoulder clearance | Result |
| --- | --- | ---: | ---: | --- |
| west rim toe | `(5,-227)`, yaw `-0.45`, scale `0.55` | 34.7056 / 0.3178 m | 4.1738 m | Conditional: inside the 0.32 m support threshold by 0.0022 m only. |
| north buttress | `(4,-236)`, yaw `0`, scale `0.50` | 33.9762 / 0.0384 m | 9.1843 m | Current-terrain support candidate; inside the north band’s west edge. |
| east outlet ledge | `(23,-225.5)`, yaw `0.80`, scale `0.45` | 34.5077 / 0.0426 m | 3.2676 m | Current-terrain support candidate. |

All three clear the current Mossling 3.1 m disk, flower envelopes, and crystal
footprint under the diagnostic’s conservative planform-radius check. The west
toe is deliberately not ready for source: any post-profile increase in its span
rejects it. The north and east placements still require full transformed model
bounds against the captured crown camera and the other fixed poses. The final
implementation must also check actual hull/terrain contact, resident lifecycle,
route traversal, and protected support after any terrain profile pass.

The complete candidates, rejects, sampled planform points, protected clearance
values, and method are in `cliff-support-probes.json`. No plan or runtime source
was changed.
## Projection-grid correction

Root’s native camera grid contains 112 medium-scale buttress/ledge transforms;
72 place more than 75% of the mesh in the useful crown frame. **Zero** also
meet the ordinary full-planform support and route/protection contract, so this
is not a free-standing prop admission.

The pre-source plan now tests only two embedded, Terrace-style buttresses:
`(20,-226)`, yaw `.40`, scale `.65`, base `32.9185` from min sample
`(19.3369,-224.9900)`; and `(28,-220)`, yaw `.40`, scale `.65`, base `28.0051`
from min sample `(29.1349,-220.1446)`. Their current planform spans are
1.8424 m and 2.0805 m respectively, deliberately documenting why they require
cliff attachment rather than an ordinary flat footing. Both retain positive
route and protected-footprint clearance and project fully into the crown’s
central window. Native model/hull contact and four-pose preview remain pending.
