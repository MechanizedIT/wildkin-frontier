# Lantern Grove R2 implementation receipt

**Status:** preview-ready; visual retention remains for root’s native portrait review.

Three reviewed canopies were added to the Rootbound curated list, all in default-world chunk `(-9,13)` and all selected exactly once by `sampleFrontierSceneryChunk`:

| key | asset | x,z | y from authoritative terrain sample | scale/yaw |
|---|---|---:|---:|---:|
| `lantern-margin-left-spread` | `asset_verge_canopy_spread` | -445,683 | 8.698443 | .52 / .20 |
| `lantern-margin-back-tall` | `asset_verge_canopy_tall` | -439,688 | 7.861609 | .48 / .12 |
| `lantern-margin-back-spread` | `asset_verge_canopy_spread` | -443,686 | 8.280977 | .50 / .10 |

The first two centers changed modestly from the reviewed drawing because the original left center failed the established support/admission route, while the final centers pass the existing selector. This was a one-step contact adjustment, not a new transform search. `r2-bearing-proof.json` samples the actual runtime trunk bearing: its existing `surfaceBox` is a rotated 1.1m-square trunk with height 2.45m, scaled per record. Final ground spans are .0718m, .0277m, and .0815m; lower geometry embeds .0375m, .0208m, and .0262m below the local maximum respectively. No canopy floats.

The three centers remain 8.94m, 16.40m, and 12.53m from the fixed destination player center, leaving the lower-centre opening untouched. Their nearest early source-center distances are 10.80m, 10.76m, and 11.08m; the existing admission path remains the authoritative full source/home clearance gate. The Rootbound source-preservation test remains green, and the focused circuit test now checks all three exact R2 records, alternate-world localization, and the intentional canopy/colony cluster rule.

No terrain, gameplay, save, global cap, asset geometry, or generic renderer contract changed. R1’s nine records are retained exactly. The current R2 total is twelve curated Rootbound records in the assembled Grove.
