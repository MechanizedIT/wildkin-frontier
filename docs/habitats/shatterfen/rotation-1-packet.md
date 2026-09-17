# Shatterfen — rotation 1 planning packet

**Status:** planning only. No target, terrain, scenery, source, or runtime change is authorized by this packet.

## Evidence and local circuit

The finite allocation is `shatterfen` at **(-750, 1900)**, chunk **(-15, 38)** in `src/world/frontierRegionCatalog.js`. The authoritative terrain/region chain is `frontierRegion.js` → `frontierTerrain.js`; ordinary forage and Wildkin placement are `frontierEcology.js` and `frontierWildlife.js`, while scenery is `frontierScenery.js`.

The read-only [numerical survey](../../../art/reviews/shatterfen/rotation-1/numerical-survey.json) covers chunks x=-18..-12 and z=35..41. The selected local circuit stays within x=-775..-675 and z=1878..1988. It is **353.15 m**, an ideal walking minimum of **164.64 s** at 2.145 m/s. Interactions, route finding and the planned deliberate branch should bring the ordinary outing into the requested 3–5 minute range; this remains an estimate until root records a normal-input trace.

The present allocation is gently rolling lush terrain with wetland weights, seeded reeds/lilies, and sparse canopy patches. It does **not** yet prove readable channels, dry hummock rooms, or water-based route choices. The old authored 100×100 m `section_2` Shatterfen composition is useful historic kit/constraint evidence, but it is not the streamed allocation and cannot be treated as a source identity here.

| Room | Current anchor and useful identity | Planned perceptual role |
| --- | --- | --- |
| Arrival hummock | (-775, 1878), beside `f1:w:-16:37:0` and its berry/tree cluster | Dry, open entry with one low edge and a clear first direction |
| East reach | (-675, 1905), beside `f1:w:-14:38:0` and berry cluster | Water-adjacent Tidefin viewing edge with a protected central approach |
| North return hummock | (-681, 1988), beside `f1:w:-14:39:0`, berries and trees | Higher quiet return room that turns back through a second dry opening |

The candidate route is [route-candidate.json](../../../art/reviews/shatterfen/rotation-1/route-candidate.json): arrival → south berry saddle (-732,1912) → east reach → north return hummock → west berry return (-739,1967) → arrival. It crosses five tested straight segments; sampled maximum slopes are 0.022–0.040, so no current steepness blocker was found. This is geometric sampling, not a physical traversal claim.

## Protection inventory

The route file records every deterministic source or wildlife home within 12 m of the candidate centerline. At minimum, a later structural pass must preserve exact ID/type/XZ, support, harvest approach and full movement disk for:

- Arrival: `f1:r:-16:37:0..2`, `f1:w:-16:37:0` (roam 4.5 m, leash 10 m).
- South saddle: `f1:r:-15:38:2..5`.
- East reach: `f1:r:-14:38:0,1,6`, `f1:w:-14:38:0` (roam 4.4 m, leash 8.5 m).
- North return: `f1:r:-14:39:0..2,6..8`, `f1:w:-14:39:0` (roam 4.5 m, leash 10 m).
- West return: `f1:r:-15:39:3..7`.

Full nearby grid inventory, including existing scenery transforms, stays in `numerical-survey.json`; the later source worker must regenerate and compare it before/after rather than copy these summaries into a new ownership layer.

## Capture candidates

These are source-derived staging candidates only. Y values and camera projection are from sampler output; root must freeze actual loaded-camera matrices and may move the pose if it conflicts with player/hud framing.

| Pose | Position / provisional yaw | Intended forward view |
| --- | --- | --- |
| Arrival | (-775, 11.52, 1878), yaw 0.90 | East-northeast along the first saddle leg |
| Interior | (-675, 11.39, 1905), yaw -2.17 | West-southwest across the future dry-channel edge |
| Destination | (-681, 11.83, 1988), yaw 2.15 | Southwest toward the return opening |
| Overhead | center (-725,1934), x[-795,-655], z[1858,2008] | Planning extent only |

Yaw and visible forward direction are provisional; no asset transform or target placement may be frozen before native full-mesh projection at the final portrait camera.

## Five implementation priorities after target selection

1. Form one shallow, connected channel cue between the three rooms using the existing terrain owner, with dry crossing/shoulder widths demonstrated around every protected source and home disk.
2. Give each room a distinct low-relief edge: entry bank, east viewing lip, and north return hummock. Preserve a central pedestrian negative-space lane rather than a continuous berm.
3. Replace uniform seeded low scatter locally with 3–4 grouped reed/lily/stone edge patches and visibly open resource approaches, within existing scenery caps and admitted assets.
4. Make the existing Tidefin homes legible from protected dry margins without moving, respawning, or adding Wildkin. Keep their full leash disks, not just center points, supported and reachable.
5. Keep the final return direction readable through a contrasting dry opening and retain all exact generated source IDs, transforms, depletion behavior, and alternate-world neutrality.

## Required intermediate step

After root captures the fresh baseline, create **two to four portrait targets** from the fixed poses. An independent director must select one and require a terrain/scenery feasibility plan that includes full asset bounds, native camera projection, source footprint and wildlife-disk checks. Only then may one structural pass begin. If a target requires a missing wetland form, use the bounded asset-gap review loop rather than silently substituting an unrelated prop or inventing a new water system.

## Boundaries and deferred work

This visit is limited to the circuit above. No second habitat, swimming/wading mechanic, wildlife behavior, spawn integration, save schema, camera change, or broad ecology-cap increase belongs to it. Existing Shatterfen legacy bank/outcrop materials may inform a future kit audit, but their streaming compatibility and visual fit are unproven here.