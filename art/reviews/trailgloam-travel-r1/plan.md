# Trailgloam translated-motion check

Use the retained fitted GLB `d3163edb5536dfd4d1fa39895f2a8e2bac71372d83cbe854913c667786f4dab7`. Do not regenerate, simplify, reweight or replace it for this check.

The previous diagnostic proved local deformation and a closed in-place cycle. This next check measures foot sliding during translated travel and exercises the existing game model factory, matte material normalization, independent animation controller and creature movement/Rapier path. It remains an isolated fixture, not species registration or an encounter. No production gameplay tuning changes.

1. A local fixture imports the actual `createWildCreature`, model preload/animation owners and vendored Rapier. Build a flat ground collider and a single retained Trailgloam descriptor using `idle:Loaded` and `walk:WalkDiagnostic` for this diagnostic only. A loaded still is not claimed as finished Idle.
2. Explicit fixture controls move it forward along game +Z through `creature.move`, with downward support, then call `updateVisual` so animation selection/playback uses actual displacement. Its ordinary pose/visual factory is retained. This is a scripted native-creature test, not a human gameplay input claim.
3. Test the authored 0.212121m/s for two or more cycles, then the current generic rusher roam speed 2.5×0.35=0.875m/s separately. Neither speed is an approved Trailgloam balance setting; the faster case reveals whether another locomotion clip is needed. Do not change gameplay speeds to hide cadence problems.
4. Capture matching side and three-quarter views, live position/clip/rate/frame traces, real grounded movement, and idle→walk→idle transitions. Compare the actual game materials with the earlier standalone PBR fixture. Verify two instances have independent skeletons and removing one preserves the other/template.
5. Use the exported 34-phase sole samples to measure contiguous stance drift over two translated cycles. Keep each stance window separate; a low sample is not necessarily a planted foot. Report absolute sole height, drift and direction along with visible motion.

Independent review should retain useful motion despite minor target differences, while identifying actual sliding, clipping, direction or transition faults. Any next clip/weight repair requires a concrete plan from the failed evidence. Broader species catalog/taming/ability/collision design remains a later cohesive boundary.
