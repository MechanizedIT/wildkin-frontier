# Rootbound buttress anchor — source-visible curvature addendum

**Status:** binding review clarification for the existing construction plan. It
does not replace the plan, invent hidden orthographic geometry, authorize reuse
of Trial A or held candidate geometry, or begin another production pass.

## What the approved perspective target actually supports

The target gives a three-quarter, screen-space reading only. It visibly has
curvature and changing tangents; it does **not** disclose exact depth, the rear
root arrangement, a calibrated world-space spline, or a physical turn radius.
Use the checkpoints below in the declared matching source-facing review framing.
They are comparison landmarks, not an automatic contour score or a demand to
flatten a volumetric tree into the target plane.

| Form | Visible source-derived checkpoint | What must read in the source-facing massing render | Hidden-side limit |
| --- | --- | --- | --- |
| Lower trunk, outer left contour | The warm lower mass widens from roughly `x=.40–.63` at `y=.60`; its left outer contour turns outward into the left root/limb shoulder instead of continuing as one upright tube. | A planted lower trunk that first narrows above the root collar, then opens left into the limb shoulder. The transition needs a visible changing tangent, not a straight taper. | The rear left flare may differ; retain a closed, thick collar. |
| Lower trunk, outer right contour | The broad right buttress rolls from the root toe region around `x=.80` at `y≈.90` inward toward the shaft/fork band around `x=.58–.61` at `y=.42–.48`. | A long inward, upward sweep on the outer right side; it should read as load-bearing root becoming trunk, rather than a straight diagonal wedge meeting a vertical shaft. | Exact toe depth and amount of rear overlap are inferred. |
| Trunk run and inner contours | Between the continuous band at `y=.60` (`x=.402–.631`) and the fork bands around `y=.42–.48`, the visible core shifts and narrows unevenly. Above the fork, the leader is visually pulled back toward the high lobe rather than continuing the lower shaft as a rigid pole. | At least two visible tangent changes: a modest lower rightward sweep into the fork collar, then a return/leftward hook into the upper leader. The result is an asymmetric bowed trunk, not an exaggerated snake. | Exact centerline cannot be recovered from occluded bark and branches. |
| Left major limb | From the shared fork window region, the limb departs left and initially rises shallowly; near the left lobe it bends upward again. It is a broad arc with an elbow, not a line from trunk to leaf mass. | A shoulder leaving the trunk on a shallow up-left tangent, an elbow under the lobe, then a smaller upward terminal tangent. Keep a warm supporting run visible beneath the left canopy. | Depth may move rearward to keep the window and all-angle support. |
| Right major limb | The lower right limb leaves the trunk toward `x≈.62–.71` at `y≈.48`, reads nearly lateral under the right lobe, then turns upward into its support. | A lower, longer two-segment arc: near-horizontal/diagonal departure, then a visible upward elbow. It must counterbalance the left limb rather than mirror it. | Perspective foreshortening prevents an exact length or depth claim. |
| Upper leader | The warm bands near `y=.30` occupy two upper structural directions below the high lobe; the central leader terminates under the high canopy with a slight hook. | A narrower leader that bends back toward the high lobe after the main fork; it cannot be a straight continuation of the lower trunk or an unsupported spike. | Minor support-stub branching is inferred and must remain subordinate. |
| Root paths and valleys | At `y=.74` the collar splits asymmetrically; by `y=.82` it forms three broad sectors, and by `y=.90` separate toe bands remain while other toes are occluded. | Each visible root descends outward through a changing tangent and ends in an unequal toe. Between roots, show shallow descending valleys that stop at the closed collar/ground rather than cutting arches. | The fifth/rear toe is verified by rotating views, not manufactured in the source-facing frame. |

The cross-section data in Trial B's `target-contour-landmarks.json` corroborates
these readings: the lower trunk is one continuous warm band at `y=.60`; it
becomes separated left/central/right structural bands at `y=.48`; and its high
canopy support is split again by `y=.30`. The visible source character comes
from that **sequence of changing directions**, not merely from a nonzero X
offset.

## Original-plan coverage and the missing enforcement

The common plan already required a rightward S-lean, 8–15° loop rotation, broad
root descents through two or three plane changes, shallow elbows for the left
and right limbs, a non-straight upper leader, and all-angle untextured massing.
Those are correct construction instructions.

What it did **not** make explicit enough was the visual acceptance condition:
Gate A could pass a heavy trunk with small numerical offsets even if its front
outer contours still read as straight, if the upper leader never visibly turned
back, or if every root descended as a similar wedge. From now on, Gate A must
also reject a blockout unless the declared source-facing framing visibly shows:

1. the lower-to-fork trunk’s two changes of tangent (rightward sweep, then
   return/hook into leader);
2. a left limb with a shallow departure and second upward elbow;
3. a lower right limb with a lateral departure and upward elbow;
4. unequal outward-and-down root paths with shallow valleys; and
5. those curves supported by nonzero depth in side/rear views, rather than a
   front-only curve.

These checks are additive to the existing root continuity, fork attachment,
canopy-depth, source-window, and all-five-buttress rotating-view requirements.

## Trial B preflight assessment

Trial B's proposed lower-collar/mid/fork/leader X offsets of `0`, `+.10`,
`+.22`, and `+.28–.34 m` are a reasonable **starting inference** for the
lower rightward sweep: they are not arbitrary because the measured warm bands
show a restrained changing trunk direction. They are nevertheless **too weak as
an acceptance specification**. They encode only monotonically increasing X and
therefore do not require the target-visible hook/return of the upper leader, do
not establish the left/right outer contour arcs, and do not prevent roots or
limbs from remaining straight in the rendered view.

Relative to the common plan's shaft widths, `+.10 m` is only about 14% of the
`0.72 m` mid-shaft width, while `+.22 m` is about 38% of the `0.58 m` fork
width. Those offsets can support a restrained sweep, but their visual effect is
not guaranteed once the broad trunk planes and three-quarter perspective are in
play; the final `+.28–.34 m` continues the same direction and can disappear
under the high lobe. Treat visible outer-contour change and the leader's return
as the proof, not the coordinates themselves.

For Trial B, retain the approved envelope and use those values only through the
fork. Add an observed, source-facing leader return: the leader's final two
sections must visibly bend back toward the high-lobe support relative to the
fork direction. Do not prescribe its exact world X coordinate; the independent
review will compare the target-facing hook and branch window in screen space.
Likewise, specify each major limb with a departure tangent, an elbow, and a
terminal tangent, and each visible root with an outward descent plus toe turn.
The exact Y offsets and curve radii remain plausible-volume choices to prove in
side/rear views.

The intended result is not stronger curvature for its own sake. It is a broad,
rooted, asymmetric growth path that remains legible after faceting and at game
scale. A smooth straight bulky trunk, five evenly radiating wedges, or three
straight branch rods fails even if every numeric offset is present.
