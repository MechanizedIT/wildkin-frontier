# Finite habitat topology audit

## Result

The provisional ten-site allocation needs one small two-site adjustment before it is frozen:

- Move **Rootbound Wildwood** 25m east, from `(-450, 650)` to `(-425, 650)`.
- Move **Saltglass Headlands** 25m northwest, from `(1550, 1700)` to `(1525, 1675)`.

With the provisional coordinates, the nonconvex southeast gulf clips tiny detached pieces from otherwise convex nearest-site cells. Heartwood owns 0.003125–0.004375km² of detached land near `(600..688, 888..938)` across the three sampled coast seeds. Shatterfen owns one 625m² four-neighbor cell near `(388, 1663)` on the southern arm; it touches the main Shatterfen sample only diagonally. The two 25m moves transfer those pieces to the physically connected Rootbound and Saltglass regions. No polygon framework or warped sites are needed.

## Method

The audit sampled the full announced continent bounds, `x=-3700..2300m` and `z=-4400..2600m`, at 25m cell centers. Each land cell from `createFrontierContinentSampler` was assigned to the nearest unwarped habitat site by squared Euclidean distance with authored-order ties. A flood fill then counted both four-neighbor and eight-neighbor components per habitat.

Three coast worlds were sampled: default seed `1327115068` (`0x4f1a2b3c`), adjacent seed `1327115069`, and alternate seed `1831565729` (`0x6d2b79a1`). This is bounded topology evidence; it can miss a land or water feature narrower than 25m and is not a proof over every possible seed.

## Adjusted allocation evidence

Every site is on land in every sampled world. Every land cell has exactly one nearest owner, giving zero coverage gaps. After the two moves, all ten habitats have exactly one four-neighbor component and one eight-neighbor component in all three worlds.

| Habitat | Default km² | Adjacent-seed km² | Alternate-seed km² | 4/8 components in each world |
|---|---:|---:|---:|---:|
| Heartwood Basin | 0.647500 | 0.638750 | 0.638125 | 1 / 1 |
| Rootbound Wildwood | 1.835000 | 1.834375 | 1.837500 | 1 / 1 |
| Skybreak Tablelands | 1.631875 | 1.632500 | 1.630000 | 1 / 1 |
| Sunscar Desert | 3.917500 | 3.881250 | 3.907500 | 1 / 1 |
| Ironspine Range | 4.837500 | 4.869375 | 4.833125 | 1 / 1 |
| Shatterfen | 1.843125 | 1.848125 | 1.845625 | 1 / 1 |
| Fungal Hollow | 3.068750 | 3.081250 | 3.093750 | 1 / 1 |
| Emberglass Caldera | 5.750625 | 5.735000 | 5.730625 | 1 / 1 |
| Verdant Stair | 3.197500 | 3.197500 | 3.197500 | 1 / 1 |
| Saltglass Headlands | 2.228125 | 2.220625 | 2.188125 | 1 / 1 |

Total sampled land is 28.957500, 28.938750, and 28.901875km² respectively. The habitat rows sum to each world's total.

The compact protected witnesses remain stable in all three coast worlds: Camp `(0,0)` and Signal `(170,50)` belong to Heartwood Basin; the Skybreak crown `(12,-228)` belongs to Skybreak Tablelands; and the earned grove chest `(-221.593,480.733)` belongs to Rootbound Wildwood. The adjustments do not move or warp any witness.

Machine-readable measurements are in `topology-audit.json` beside this file.
