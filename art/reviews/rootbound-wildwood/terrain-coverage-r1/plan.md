# Rootbound terrain-and-coverage R1 — one continuous structural pass

**Current authority: Root candidate section at the end, with executable receipts. Earlier sections below are historical proposals; their6m/4m lane and Crown basin assertions are superseded. Current main lane4m, optional3m.**

## Historical initial intent

Replace the current “colored islands on a flat floor” read with continuous route-side shoulder coverage. The pass changes **one bounded Rootbound profile**, not individual prop layouts: Meadow stays open; paired Gallery shoulders accompany the northbound route; Lantern remains a concentrated low hollow; Verge is one-sided; Crown becomes a shallow basin/reveal with a continuous rear backdrop.

## Authoritative controls and protected result

The implementation owner is `src/world/frontierRootbound.js`: extend `RIDGES` with named route-side polylines and add a bounded coverage-band field beside `ROOTBOUND_FACET_FIELD`; `sampleFrontierRootboundProfile` remains the sole height/color output. `frontierTerrain.js`, `frontierRegion.js`, and `frontierChunkRuntime.js` consume that same profile, so terrain mesh, physics query, and render stay on one surface.

Do not add displacement within the 6m primary or 4m optional lane envelopes. `lifePreservation(x,z)` already fades the profile over all listed forage/home points and three broad protected plates. The pass must sample final—not authored—height at every changed two-metre vertex. Any proposed shoulder that lands in a preserved plate is expected to attenuate toward zero; move the outer band rather than weakening the mask.

## Continuous zone geometry

| band | centreline / footprint | height and coverage outcome |
|---|---|---|
| Meadow open field | x[-500,-455], z[570,615]; primary lane `(-475,590)→(-478,613)` | no added relief inside a 10m-wide visual opening. One faint 0.15–0.25m outer edge roll only beyond x<-487 or x>-463 so Arrival remains bright/open. |
| Gallery west shoulder | polyline `(-493,620)→(-493,650)→(-493,680)→(-490,700)`, 7–11m outer width | continuous 0.7–1.2m dry rib shoulder, feathered over 3m; coverage band at 35–55% of outer strip. |
| Gallery east shoulder | `(-462,625)→(-460,652)→(-460,678)→(-463,697)`, 7–10m outer width | alternating 0.55–0.95m shoulder; its gaps align with sightline openings, never the lane. |
| Lantern | ellipse centred `(-445,678)`, rx20/rz16 | retain existing hollow/low 0.3–1m coverage; no broad new wall. Feather bands stop at the 4–8m dry centre. |
| Verge seam | `(-427,680)→(-415,694)→(-430,711)`, 5–8m *east-side only* width | 0.35–0.7m broken mineral berm with 20–35% angular coverage; west side remains the branch escape view. |
| Crown basin/backdrop | rear arc `(-486,724)→(-468,733)→(-451,726)`, 10–14m deep; reveal bowl around `(-468,717)` | 1.0–1.6m outer backdrop and a shallow -0.35m inner basin, both feathered 4m. Existing deadwood group remains the foreground cue; new coverage is continuous rear/side mass. |

The 298m proposed primary and optional route point sequences in `SPATIAL_PLAN.md` are the lane source of truth. For every centreline segment, reject a terrain/coverage vertex whose distance is <3m primary or <2m optional; this preserves the requested 6m/4m widths before player-radius proof.

## Portrait coverage target

At Arrival `(-475,590, yaw -1.743)`, Meadow occupies the lower/centre screen with only a far departure shoulder. At Gallery `(-478,640, yaw 3.0)`, both side bands must occupy upper/mid frame with a vertical central opening. Lantern keeps low edge density. Verge `(-422,688, yaw -2.5)` shows a single receding seam. Crown `(-477,709, yaw -2.7)` shows one rear U/backdrop over several seconds, not a detached foreground log.

Use existing blockout leaf/root/thorn recipes only as low visual coverage instances along these bands, with shared group bounds assessed per pose. Counts are derived from band length and 3–5m group spacing, expected roughly 26–34 non-colliding visual instances across the whole pass; scaling never changes their triangle count, only their projected area and bounds.

## Required evidence before freeze

1. Final two-metre mesh vertex heights and triangle slopes across each band, primary/optional lane, all life points, and final props.
2. Whole group transformed bounds projected through five fixed native cameras, showing shoulder/backdrop coverage outside normal HUD and central lanes.
3. Curated/source/home ID and transform parity; coverage instances have stable keys and default-world-only gating.
4. One ordinary route/contact capture after the structural pass. No need for exhaustive walking per prop.

Uncertainty: the existing resident plates cover broad northern/eastern territory and may erase portions of the planned Gallery/Crown relief. That is an implementation sampling result, not permission to change masks. If coverage cannot survive outside the lane after attenuation, hold this pass and revise the band geometry rather than adding more isolated props.

## Revised finite geometry and sampled evidence

The west Gallery strip is moved outside the return: `(-508,620)→(-508,646)→(-508,674)→(-506,698)`, with a 5–8m inward feather that stops before x=-500. Its final protected-profile sample deltas are all `0.000m`; lane distances are 12.75–15.64m. It is therefore a **coverage-only** west shoulder unless a future terrain field is authored there—this plan does not falsely claim current ridge height.

East Gallery remains `(-458,625)→(-457,652)→(-457,678)→(-459,697)`. Final deltas are `0,0,-.967,+.172m`; the hollow point is real existing depression, while the northern point is only 3.80m from the primary route and its new coverage feather must end before the 3m exclusion.

The Verge is a literal one-sided outward offset from the optional branch: `(-421,676)→(-408,688)→(-407,701)`, 7.16–10.63m from that branch. It is never centred on `(-427,680)→(-415,694)`. Current profile deltas are zero; use continuous low coverage/berm visual bands there first.

The planned Crown terrain arc is dropped: all original arc points are in the protected northern plate. The finite west flank `(-508,718)→(-510,728)→(-506,736)` is outside that plate, has zero current protected-profile delta, and remains 21.98–30.49m from the primary route. Crown R1 therefore uses a **continuous visual-only backdrop/coverage band** outside the plate; the inner basin terrain is deferred pending the full source/ecology/support proof required to alter protection behavior.

`revision-samples.json` is the executable receipt. It samples the final protected `sampleFrontierRootboundProfile`, not raw authored intention. Arrival camera yaw is corrected to `3.012`; Gallery `3.0`, Grove `-2.3`, Verge `-2.5`, Crown `-2.7`. Camera bounding-box projection remains an implementation gate, but the bands above are the only finite candidate geometry for the next review.

## Current status: HOLD pending executable candidate evidence

The present revision samples only the existing profile, so their zero west/Verge/Crown deltas cannot prove proposed relief. Do not implement terrain from this document yet. The next planning step must use a standalone evaluator with: (1) a literal capped signed-distance shoulder kernel for only the named strips, (2) smooth zero fade at primary 3m and optional 2m lane boundaries, (3) multiplication by the current life-preservation result, (4) every changed 2m vertex plus adjacent final-triangle slopes and all source positions, and (5) whole group bounds projected through the five recorded native camera matrices. If that evaluator finds the protected result neutral, this plan narrows to coverage-only and removes all terrain-shape claims.


## Root candidate — current executable proposal

The earlier abstract bands and zero-current-profile samples are superseded by `candidate-kernel.mjs` and `evaluate-candidate.mjs`. These evaluate the actual added shoulder formula through the native region/terrain/coast chain: six connected band polylines, smooth route falloff, unchanged broad northern life plates, four additional protected resource coordinates, and a coverage-only Crown backdrop. Maximum real added height0.85m;746 changed2m vertices;1849 affected triangles; maximum affected final slope0.48345. Main walking lane is4m, optional3m, within the packet ranges; triangle interpolation adds at most0.0411m within those lanes, so do not claim perfectly unchanged or flat ground. All298 source IDs and XYZ fingerprints match. Actual recorded camera projections show small but nonzero Gallery/Meadow/Verge edge contributions; Crown has coverage only and Lantern is retained.

A separate bounded filter correction keeps every old pocket and curated placement but allows already-admitted ordinary non-solid low scenery to survive in the continuous bands. It uses the existing footprint-radius function for main2m/branch1.5m half-width clearance. Current/candidate native selector counts are1079→1191 Meadow,456→730 Galleries,62→379 Grove/Verge,1106→1370 Crown. No prior selected ID disappears at these five windows. These are mathematical/selector previews, not actual rendering proof or a phone benchmark.

Implementation files: root owns `src/world/frontierRootbound.js` plus the minimal `src/world/frontierScenery.js` filter. No new runtime asset, shader, generic physics or generator. Retain existing northern terrain, add low vegetation coverage there, and compare actual five poses/overview after this one structural pass. Focused tests must cover full source and support preservation, actual terrain mesh/ray/movement and representative alternate-world behavior; then one independent visual review and one focused repair if necessary.
