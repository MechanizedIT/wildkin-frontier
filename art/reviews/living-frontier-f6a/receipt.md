# F6A — physical nursery and care

September 12, 2026. Producer-selected R3 under Chris's continuous Living Frontier mandate. Local only; no owner playtest acceptance implied.

## Player result

Build a Wildkin bed (3 wood, 5 fiber), select an owned Mossling at the Sanctuary, walk beside the bed and tap **Settle**. The same individual stands idle on a moss platform. **Feed** spends one backpack berry and fills one of three nourishment dots and one portion in the visible bowl. **Release bed** frees the assignment; the selected companion returns to following. An occupied bed cannot be removed. There is no absence timer, hunger decay or death system.

The selected Mossling follows when an outing starts, retaining its bed assignment and nourishment, then docks again after banking at Camp. An unselected assigned animal remains visible at Camp but is hidden outside. One follower owner and one individual ID prevent duplicates.

## Dream Loop

Baseline is an actual bed built through native Place after a disclosed material/position fixture on isolated localhost:8082. The old bed was a bench. Target is an imagegen edit of that screenshot, retaining Camp, camera, existing creature anatomy and Idle pose.

| Pass | Score | Finding |
| --- | --- | --- |
| R1 | 8.0 | Readable interaction; flat moss slab and embedded bowl |
| R2 | 8.4 | Overlapping pads and raised bowl improved depth; planted edges still weak |
| R3 | 8.7 PASS | Broad creased leaves and grouped plants make a coherent nursery |

Independent judge: frontier_integration_audit. R3 rubric: composition 2.6/3, lighting 2.6/3, materials 2.7/3, details .8/1. R3 is the strongest reviewed result. Full nourishment in R3 differs intentionally from the target's two portions. The truthful **Release bed** label replaces target **Call back**, because an unselected released animal returns to the roster. No fourth cosmetic pass.

Evidence: baseline.png, target.png, r1.png, r2.png, r3.png, r3-phone.png, r3-portrait.png, package.png. Desktop is1280×720; phone emulation915×412 and412×915 CSS at1.25DPR. Portrait uses an approach facing the bed; a bed outside the narrow camera view correctly hides its action. These are viewport checks, not physical-phone performance proof.

## Contract and cost

- `frontierProgress` owns nullable version1 `campCare {bedId,wildkinId,nourishment:0..3}`. Strict load/import validates a real bed and owned Mossling. Assignment/feed/release use the same rollback-safe commit path; feeding exchanges one raw pack berry atomically. Defensive copies cover state/export/rollback. Active selection is not changed by assignment/release.
- `campCareInteraction` rechecks Camp, bed membership,3.2m planar proximity and2.2m vertical range on activation. Stale buttons cannot feed remotely. `createBetaGame` also checks physical Camp bounds and section. No second inventory or health owner.
- `companionSystem` deduplicates active/pending/assigned individuals. Docking disables the existing follower physics body and uses the existing Idle; leaving/releasing restores formation through the same owner. This is not a new lying-down, eating or sleeping animation.
- `baseSystem` owns anchors, collision, instance lifecycle and .3s care-only bowl visibility updates. Geometry preserves1.90×1.25m footprint and.55m supporting height. Small decorative leaves/berries rise to.776m. Reuses the existing first-party mesh kit and bench palette; no model generation or runtime dependency added.
- Final bed:13 small mesh draws /880 triangles with all portions present, per-instance geometry/material ownership. No per-frame object spawning. This cost has not been proven across64 beds on a phone.
- Existing world action owns primary/secondary controls,48/56px primary and44px secondary targets, anchored placement and nourishment dots. All other interaction families retain their existing routing.

## Verification

Integrated behavior checkpoint: **1,064/1,064 tests**, world/campaign/build/validation/ZIP PASS. Final R3 changes only owned bed geometry; focused base runtime passed again, followed by build/validation/ZIP.43.98MB unpacked;20.49MB ZIP (20,986.2KB). The old finite campaign checker does not prove new frontier progression.

Native isolated play: Place → Settle → forced save-write failure → retry → Feed → literal reload; correct individual, berry count and nourishment persisted. Failed feed left6berries/0nourishment; retry changed to5/1. Native Release in phone layout restored physics and cleared assignment without charging; Settle and two feeds worked there. A final feed capped at3; native E spent nothing further. A diagnostic removal call returned bed-occupied.

Position fixtures crossed the Camp boundary and returned to the physical gate. The outing showed one undocked active follower with physics enabled, unchanged nourishment3 and hidden Camp bed; native return/banking restored the same ID docked with physics disabled. This is transition proof, not an earned whole expedition.

Portable localhost:8081 loaded an exported developer fixture through the normal import owner and literal reload. Native Release → Settle → Feed changed one berry tozero and care0→1, with exactly one bowl portion visible. No warning/error logs. Direct localStorage replacement while an older run was active was initially overwritten by its save lifecycle; the normal import owner resolved fixture setup. Do not use that failed setup as gameplay evidence.

Focused cases cover atomic failures/retry, invalid saves, occupied-bed removal, copy isolation, physical stale-action rejection, same-ID docking/undocking, care-only bowl updates and shared base lifecycle.

## Limits and next use

Only one assigned bed and Mossling are supported. Releasing clears its care meter; this is provisional. Nourishment currently provides visible care status only. It is not yet breeding readiness, habitat suitability, genetics research or passive production. F6B connects a physical food garden and nearby nourished-Mossling harvest benefit. Other saved genes, eye variations, new animation, life stages and reproduction remain future work.

Human check: build a bed on an open Camp patch, select a Mossling at the round Sanctuary, then approach the bed. Expect a visible animal and Settle/Feed controls with a clear berry cost. Feed three times and observe the bowl/dots fill. Release should free the bed and return the selected companion to your side. Failure signs: duplicate animals, hovering/sunken feet, a charge after Nourished, a disappearing paid berry after failed save, or an action covering the animal. Explore and bank back at Camp; the same animal should resume its assigned bed.
