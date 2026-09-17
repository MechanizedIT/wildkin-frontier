# Shatterfen rotation 1 — structural feasibility plan

**Status: PARTIAL HOLD for independent review; no source implementation authorized.** The selected target’s reflective-water appearance is deferred. This plan tests only existing terrain height and existing scenery language: a shallow dry-hummock edge cue, dry return opening, and later bounded reed/lily/stone clustering.

## Frozen inputs and protection contract

The ignored, read-only executable `.dream-loop/shatterfen-structural-plan.mjs` writes [structural-plan-proof.json](../../../art/reviews/shatterfen/rotation-1/structural-plan-proof.json). It reads the frozen route and native captures, queries all forage and wildlife records in chunks `-16..-14,37..39`, and records every queried source/home footprint. No source ID, position, type, movement disk, recipe, cap, or route point may change. The entire six-waypoint 353.15m circuit remains protected by a 1.2m route corridor. Source radii use the existing resource type/asset footprint and homes use the existing maximum movement radius plus the 4.9m home support radius.

The native camera is reconstructed as `forward=(-sin(yaw)*cos(pitch), -sin(pitch), -cos(yaw)*cos(pitch))` and `position=center-forward*effectiveDistance`; the proof stores the actual destination camera values and every 2m sampled before/final projection. All final terrain displacement uses the same 2m smoothstep clearance mask, so an overlap contributes zero instead of being raised through protected space.

## Two bounded layouts tested

| Layout | Forms | Result |
| --- | --- | --- |
| A — two edge cues | Two shallow outer ellipses around the return hummock, 0.42m and 0.34m unmasked peaks | Rejected. The full sampled envelope crosses protected space and includes invalid/off-camera projection values. |
| B — west return cue | Two shallow west-side ellipses, 0.42m and 0.30m unmasked peaks | Partial only. Smooth masking leaves a 0.288m maximum surviving cue, with route protection retained, but zero changed samples land in the destination central HUD-safe region. It cannot yet establish the target’s visible hummock/channel hierarchy. |

The proof records the negative clearances deliberately: they are the unmasked ellipse samples, not a permission to overlap. The final mask prevents displacement there. Its sampled mask contract is monotonic and bounded from zero to one.

## Feasible source scope if review permits a structural pass

A builder may use only the terrain owner’s existing local height/color path to make a **very shallow, dry** cue, and only after a reviewer accepts a revised camera-visible footprint. Existing `sampleFrontierSceneryChunk` recipes can later form three small edge clusters using existing reed, lily, low stone and low plant families. Any suppression must preserve the final selection/cap ordering and prove synchronous/incremental/alternate-world parity. No water plane, reflection, deep channel, bridge, swim/wade behavior, wildlife move, resource change, or new asset is part of this plan.

## Review decision needed

The present B layout protects the complete route and inventory but fails the matching-pose central visibility requirement; it is not implementation-ready. Independent review should either request one materially different camera-visible shallow footprint with the same protection contract, or close the terrain cue as HOLD and retain only the selected target as direction. Do not spend the structural pass on a hidden or masked-away bank.

## Existing scenery cluster check

This is a separate existing-kit check, not a third terrain layout. The executable `.dream-loop/shatterfen-scenery-cluster.mjs` re-queries the original post-allocation records in the destination chunk and writes their exact IDs, transforms, scaled hull radii, route/source/home clearance, and native-camera projection into the proof.

The only nearby admitted wetland candidates are four `asset_fen_lily` records and one `asset_fen_reed` record: `f2c:s:-14:39:seed-4`, `:7`, `:10`, `:16`, and `:18`. No transform or suppression is proposed. The first four are physically clear of the source/home/route inventory by 2.442m–3.824m after their own hulls, but all project outside the 412px portrait frame at x=449.8–828.2 or above the useful frame. The fifth projects in-frame but intersects a protected envelope (clearance -5.674m). Therefore an existing post-allocation reed/lily cluster cannot provide the selected destination edge without moving records or violating the route/home/source contract.

**Cluster result: measured HOLD.** Preserve all five original records and sampler ordering. No fixed record, relocation, replacement, suppression, cap change, or terrain retry is authorized. A later pass needs a materially different camera-visible existing allocation or an independently reviewed bounded recipe change; it must not claim the target’s edge cluster from these off-screen records.

### Superseding finite moved-record grid

The prior five-record observation is superseded only for the question of whether existing scenery *could* be moved. `.dream-loop/shatterfen-scenery-cluster-proposal.mjs` samples one finite 2m grid across x `[-801,-601]`, z `[1848,2128]`, projects each ground point through the frozen destination camera, then requires it to be inside the useful portrait rectangle and at least 2.2m beyond every full source/home hull and the route corridor. It finds **zero** qualifying points. The destination anchor itself projects centrally (`x=206`, `y=545.36`) but lies inside a protected envelope (`-14.173m` clearance), which explains why a screen-visible decoration cluster cannot be made around the selected room without moving a source/home or narrowing the route contract.

This is one bounded grid, not a claim about all Shatterfen. It completes the requested moved/added existing-kit test with a specific physical/camera blocker. Keep all original scenery records and both terrain layouts unchanged; do not enlarge the search, alter caps, or start a new layout.

### Final noncolliding cluster proposal (supersedes only the wildlife-disk predicate)

The final grid changes one predicate, with a source-backed reason: `frontierScenery.js` marks only canopies and `asset_fen_stone` as solid; `asset_fen_reed` and `asset_fen_lily` are existing low, non-solid presentation records. A Tidefin leash disk still prohibits terrain/support and solid-obstacle work, but does not prohibit those individual noncolliding visuals. Source harvest approaches and the full 1.2m route corridor remain hard exclusions; the central 3.2m radius around each Tidefin home remains open for the actor/view.

The same finite 2m grid now finds eight visible noncolliding cells and proposes one compact four-record right/rear edge group. Move only these existing post-allocation IDs after the original selection stage, with no additions/cap/order change: `seed-4` lily to `(-691,1980)` (screen 379.43,207.73; 2.918m source/route clearance), `seed-7` lily to `(-687,1982)` (386.86,289.84; 2.399m), `seed-16` lily to `(-693,1980)` (341.48,180.34; 2.237m), and `seed-10` reed to `(-689,1982)` (341.57,251.35; 1.718m). Preserve each record's existing asset, scale and yaw; do not use Fen stone. The four cells group at the far/right edge while the Tidefin center and player/return corridor stay unoccupied.

This is an implementation candidate only. Root must native-preview the exact post-allocation recipe and an independent reviewer must approve it before any source edit. Both terrain layouts remain HOLD; this visual-only cluster neither supplies terrain support nor changes wildlife, routes, sources, or water systems.
