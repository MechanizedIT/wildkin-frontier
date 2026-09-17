# Fungal Hollow rotation 1 — independent route review

## Decision: route HOLD is correctly bounded

The rendered proof supersedes the earlier centerline grid result in the relevant way: it reads the actual 2 m terrain triangles, samples the .32 m player footprint at center plus eight offsets every .5 m, and rejects the proposed 500.299 m candidate with 696 failing footprint samples and a .457097 maximum slope. It also expands the four blossom, Thorn-home, and three solid-stone footprints by the player radius, so those identities are not being weakened to make the route fit.

The capped 2 m graph is useful negative evidence, not a proof that no continuous route could exist anywhere in Fungal Hollow. The packet states that limit honestly: its 311-node reachable component does not connect to the chosen western exit, and its longest bounded out-and-back is 300.617 m / 2.336 minutes and terminates at the survey boundary. It must not be described as a 3–5 minute circuit.

One factual correction: the packet says the mesh proof checks “all 28 compressed legs,” while `route-proof.json` correctly reports 28 compressed waypoints and **27** legs. This is documentation-only; it does not alter the HOLD conclusion.

## Feasible pocket direction

Use the already certified two-capsule local pocket only. A future structural pass can make one continuous lower-side-to-rear bank read with an unequal shoulder, leave the teal travel floor and both capsule corridors open, and organize existing mushroom dressing into near-edge, turn, and rear roles. It must begin from the new native baseline/target gate and prove support, routes, four blossoms, Thorn disk, stones, and sampler/cap parity. No longer-route promise, terrain exception, or search extension follows from this review.
