# Fungal Hollow — rotation 1 packet

**Status:** planning ahead only. No target, runtime revision, fresh native baseline, route capture, or implementation is authorized by this packet.

Fungal Hollow already has a useful but short local encounter: four finite luminous blossoms in a rooted bowl and one avoidable hostile Thornprowler. The accepted R2 source remains a visual **HOLD 6.5** because the ordinary portrait view reads as a flat clearing: it lacks an unequal near-bank silhouette, a broad teal travel floor against olive bank faces, and shelf-led density. R1/R2 both missed the same bank-read gap; another small prop or toe adjustment is not a method to restart.

## Evidence and ownership

`src/world/frontierFungalHollow.js` owns the bounded rootwash profile, the frozen branches, outing capsules, four blossom anchors, and Thorn home. `frontierRegion.js` and `frontierTerrain.js` own the shared height/color consumption; `frontierEcology.js`, `frontierWildlife.js`, and `frontierScenery.js` own finite resources, the encounter, and fixed dressing. The separately baked Thornprowler R1 changes its visual asset path only; its hostile rusher gameplay contract is unchanged.

The complete fixed local inventory that a future pass must preserve is:

| Content | Exact stable ID / position | Constraint |
| --- | --- | --- |
| safe blossom | `f1:r:-57:-25:400`, `(-2847,-1241)` | finite luminous blossom, radius .9 |
| west blossom | `f1:r:-58:-25:401`, `(-2855.8,-1240.5)` | finite luminous blossom, radius .9 |
| return-shelf blossom | `f1:r:-57:-26:402`, `(-2843.5,-1255)` | finite luminous blossom, radius .9 |
| risk blossom | `f1:r:-58:-26:403`, `(-2860,-1255)` | inside Thorn risk choice, radius .9 |
| Thorn home | `f1:w:-58:-26:450`, `(-2868,-1260)` | hostile rusher, home radius 10; no capture/bond/persistence |
| solid Fen stones | `f1:s:fungal-hollow:stone-{a,b,c}` | `(-2853,-1247.75)`, `(-2846.75,-1252)`, `(-2858.25,-1249)` remain fitted to routes, flowers, and full home |
| dressing | `f1:s:fungal-hollow:*` (23 fixed records) | admitted mushroom ring, fallen log, Fen stone, trail stones, pebble cluster only |

The source contract only certifies two 3 m-half-width supported capsules: approach `(-2848,-1216) → (-2850,-1232) → (-2849,-1248) → (-2854,-1258)` and return `(-2854,-1258) → (-2846,-1270) → (-2838,-1284) → (-2826,-1298)`. It does not certify arbitrary travel over the wider branch drawing.

## Circuit decision

The finite analytic candidate is now **HOLD**, not an admitted circuit. [`route-candidate.json`](../../../art/reviews/fungal-hollow/rotation-1/route-candidate.json) retains the 500.299 m / 3.887-minute centerline and the two failed original joins. The new [rendered-triangle route proof](../../../art/reviews/fungal-hollow/rotation-1/route-proof.json) checks all 27 legs between 28 compressed waypoints against the actual 2 m `createFrontierChunk` triangle topology, with the real player capsule radius `.32` sampled at center plus eight cardinal/diagonal footprint positions every `.5 m`.

The mesh proof rejects the candidate: **696 of 9,369 footprint samples** exceed the `.32` limit, with a maximum actual triangle slope of **`.457097`**. Failed legs are 8, 10, 12–18, and 22–25. It does preserve every fixed blossom, the full Thorn home, and all three solid Fen-stone footprints after expanding each by the `.32 m` player radius; collision clearance is therefore not the blocker.

One bounded correction was then run over the candidate bounds expanded 20 m (`x[-2948,-2768]`, `z[-1380,-1140]`): a 2 m grid, capped at 20,000 nodes, with each node and each .5 m edge sample required to pass the actual triangle plus full player-footprint predicate. It visited 311 nodes. The same safe start cannot connect to the safe western exit `(-2925,-1160)` (nor its `(-2924,-1160)` grid neighbor). The reachable component ends at z `-1300`; its longest bounded out-and-back to `(-2948,-1140)` is 300.617 m / 2.336 min and stops at the survey boundary. It is not a purposeful replacement circuit.

No broader search, terrain change, or physics exception is proposed. Root should capture fresh baselines for the existing certified pocket. A later route revision needs separate bounded planning and a fresh mesh-footprint proof before a 3–5 minute circuit claim.
## Provisional capture poses (not baseline evidence)

These poses are candidate framing anchors only. They use the project ground-plane convention `forwardXZ = [-sin(yaw), -cos(yaw)]`; for a point looking toward the next point, `yaw = atan2(-dx, -dz)`.

| Pose | position x,z | look-to x,z | yaw radians | intended question |
| --- | ---:| ---:| ---:| --- |
| arrival | `(-2848,-1216)` | `(-2850,-1232)` | `0.124355` | Does the first bowl entrance show a travel floor and a near-bank edge? |
| interior | `(-2849,-1248)` | `(-2854,-1258)` | `0.463648` | Are the raised blossom shelf, open retreat lane, and western risk choice legible together? |
| destination | `(-2826,-1298)` | `(-2838,-1284)` | `2.432966` | Does the return exit read without fabricating a wider branch route? |

Fresh actual portrait captures must use the native camera/player/HUD and record camera position/yaw before any image target. These numbers are not a substitute for those captures.

## Feasible kit and one new method

Use the existing admitted low-poly fungal kit only: whole mushroom rings, fallen logs, fitted Fen stones, trail stones, pebble clusters, and the existing vertex-color/material path. The next structural proposal, if fresh baseline evidence warrants one, should build a **single continuous near-to-rear bank read** around the already-certified pocket: a lower-side bank edge carried into one unequal shoulder, teal travel floor left open, and three asymmetric mushroom group roles (near edge, turn, rear). It must prove the existing routes, four sources, Thorn disk, solid stones, full support, and fixed sampler/cap order remain intact.

That is deliberately a structural-composition method, not another perimeter-density pass. It cannot be authorized from this packet because new baseline captures and a physically proved longer route remain missing.

## Next gate

1. Root captures fresh native arrival/interior/destination/return baselines with the actual player, HUD and the above yaw convention.
2. After those baselines, author 2–4 portrait targets for the already-certified pocket. The route HOLD must be stated in target selection and feasibility review; it does not block the required target stage.
3. Keep the longer-circuit claim closed unless a separately bounded route revision earns rendered-mesh and native ordinary-walk proof. A selected target may still enter independent feasibility review for a pocket-only structural pass.






