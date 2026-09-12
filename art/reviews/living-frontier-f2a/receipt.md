# Living Frontier F2A — persistent forage

2026-09-12 14:40 UTC. Selected **R2**, independently6.5/10. R1 scored5.4 and R3 scored6.2; the smaller third-pass berries were harder to distinguish at the gameplay camera. R2 is a provisional producer selection after three passes, not owner art acceptance. Target fitness9 was feasibility only. Coarse leaves, pink fruit, sparse layering and the prior terrain horizon/seam remain visual debt.

## What runs

Seeded forage groups use existing sapwood, rock, fiber and berry assets, with a staged north approach and habitat-dependent mixtures elsewhere. Resources occupy at most the terrain center3×3 chunks (72 nodes); terrain retains its5×5 window. An immutable residency snapshot avoids per-frame cloning/rebuilds. The original harvesting owner creates/removes residents, and the existing save owner commits each finite node's remaining yield before releasing a pickup. Camp's authored resources remain renewable.

Generated pending pickups key by stable source ID. Unloading retires the visual and heavy source object, retaining a lightweight pending record; returning rebinds the source. This is in-session retention, not persistence of uncollected ground pickups across page reload. Collected inventory and depletion records persist. No second inventory or save authority was created.

## Proof and limits

- Isolated developer origin8082 began with an empty pack and ecology ledger. A position fixture placed the player by generated berry node`f1:r:-1:-3:0`; native Auto Harvest was switched on. Ordinary harvesting/collection produced4berries and nearby2fiber; no inventory grant or scripted hit was used. The player remained stationary while the existing pickup logic collected the yield.
- Moving the test fixture to x320 unloaded the source. Returning recreated it with remaining0, ready visual hidden and remnant visible. Literal browser reload, Continue and a return position fixture preserved the same depleted ID plus4berries/2fiber.
- A second berry node`f1:r:0:-3:0` was used for scoped storage-failure injection. Native Auto Harvest attempted hits while only the game save key rejected writes. Remaining stayed4, no scar/pickup appeared, and the visible message said“Forage kept / Could not save. Please retry.” After restoring the storage method, normal harvesting/collection completed: remaining0,8totalberries,2fiber. The injection was removed and the player returned to Camp.
- Focused real-Rapier tests cover source unload/rebind, pending-yield aggregation, duplicate IDs, partial/depleted restore, bounded residents, immutable snapshots, berry recipe identity and authored resource behavior. Independent source audit found no remaining actionable correctness issue in the reviewed paths.
- Selected source aggregate`npm run verify`:1007/1007, world/campaign, build/validation PASS; ZIP PASS,43.88MB unpacked /20.47MB ZIP.
- Fresh packaged origin8081 renders the selectedR2 layout with9ecology chunks,66generated nodes at the fixture and the correct berry recipe. No warning/error logs. Full harvest/reload/fault-injection journey is developer-origin proof, not repeated packaged or physical-phone proof.

`baseline.png` and`actual-r*.png` use x0/z−114, yaw0,pitch25°,1280×720. Generated target is1672×941 at the same aspect. Native harvest/failure images use their interaction fixtures. Existing user save on8080 was not used for harvesting. Existing finite campaign/map/objective flow remains transitional; walking out must next start a real active outing and support outside-Camp resume before generated capture is integrated.

| Artifact | SHA256 |
| --- | --- |
| frontierEcology.js | dbe151c5386b07daca88df40b6567c1a74d449df5b6d030e312f8453cf013d7b |
| frontierEcologyRuntime.js | 13d7ce9e4de45d8244314f0dd7eba97bddae3ed98e743c0285c1a98050b05357 |
| pickupSystem.js | 437ec3dd6a809f342b0717703a6bc9d627007c624cadc9acec4458b67f47c24c |
| packaged index.html | 7c5716c57f5dbf560af101fb4700f1eed358ff301f95fde12d5ca944497ded29 |
| submission.zip | 5b5bc70c9cd39290bf6c107b832a3279578bc7be5d9c605393f49e382485c800 |

Lessons: normalize visual-asset resource recipes before instantiation; a berry-shaped fiber node is a gameplay defect. Test the full terrain window against the smaller ecology window, not only a one-chunk fixture. Streaming must include pending pickups as well as the source mesh/collider. Return only the image-generation artifact/hint from tools; never print an image's base64 payload as text.
