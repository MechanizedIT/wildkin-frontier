# Emberhorn — rotation 1 audit

**Status:** planning audit only. Emberhorn remains an existing accepted gameplay species and code-native visual. This does not start an art pass, alter its current behavior, or reset the closed Trailgloam HOLD.

## Current contract, grounded in source/evidence

| Area | Current evidence | Status |
| --- | --- | --- |
| Field role | `src/companions/companionCatalog.js`: territorial Emberfall guardian; `Cragbreaker` strikes nearby threats and up to three mineral outcrops, with an 18s cooldown. | Existing role; no new headline utility is proposed. |
| Bond sequence | Existing `reinforced_tether`: dodge a committed charge, tether during recovery, then offer a berry lure. `tests/fieldTaming.test.js` specifically rejects generic recovery or a failed charge. | Existing behavior/transaction only. |
| Encounter behavior | `src/world/frontierWildlife.js`: `rusher`, `TERRITORIAL`, roam 4.5m, notice 7m, personal space 2m, leash 10m; health12, speed2.1, damage2, respawn28s. The Caldera anchor is stable `f1:w:17:-40:300`; regional encounters retain the species tag. | Existing encounter owner. |
| Mineral utility | `src/resources/mineralStrike.js` plus `companions/companionSystem.js` own selection/cooldown/interruption. [Cragbreaker receipt](../../../art/reviews/cragbreaker-mining/receipt.md) records actual partial/depleted mineral, reload, eviction/return, and portable no-duplicate proof. | Existing integration proof, not a new gameplay request. |
| Visual/anatomy | `src/world/wildkinMeshKit.js:emberhorn3()` builds a warm red heavy feline torso/head, ivory chest/muzzle and swept paired horns, four heavy legs/hooves, and a layered red/dark mane. It is a runtime mesh kit, not a separately admitted GLB/rig. | Existing implementation; no neutral asset review or motion admission located. |

## Actual Sunscar readability

`art/reviews/sunscar-desert/rotation-1/baseline-interior.png` is the useful close portrait evidence. Emberhorn reads at the lower-left as a large warm red, broad quadruped against pale sand, with the player, a companion, `Emberhorn · Observe 1/2`, a visible eye/attention marker, and the Challenge control. Its color/scale separates from teal crystals and ochre terrain.

The same fixture also shows its limitation: the animal is partly cropped at the left screen edge and shares lower-screen attention with the player/companion and controls. `baseline-route-walk-6.png` contains no Emberhorn, so the route captures do **not** establish an ordinary approach/reveal, charge tell, recovery readability, or HUD-safe visibility. Earlier exploration-view evidence separately warns that a moving Emberhorn can enter the upper HUD corridor; that is a camera/placement concern, not grounds to change behavior or retry habitat art.

## One bounded next candidate: reinforce the existing charge silhouette

**Candidate:** one visual-only Emberhorn R1 target/plan/review loop that retains the exact mesh-kit body plan and all current gameplay behavior, but gives the species a clearer **forward charge read**: a visibly broad ivory horn sweep on both sides of the brow and a compact raised, asymmetric ember mane crest behind the shoulders. The body remains a grounded, warm-red quadruped; legs/hooves, head direction, existing palette family, scale, asset ID, companion card, territorial rusher behavior, tame sequence, Cragbreaker, cooldown, save and spawn identities stay unchanged.

This is a single visual correction, not new horns-as-damage, a new telegraph state, a charge-timing change, combat rebalance, a mineral mechanic extension, or a new Sunscar/Emberfall encounter. It addresses the specific portrait issue: make the animal’s committed direction read before its large red body becomes edge-cropped or masked by surrounding terrain.

## Required separate lanes and gates

### Visual lane — pending authorization

1. A different target author prepares one isolated, single-subject Emberhorn neutral/charge-reference direction from the actual code-native mesh and `baseline-interior.png`; it must preserve the species’ red heavy quadruped, ivory horn/muzzle identity, four grounded feet, and no scenery/UI contamination.
2. An independent reference reviewer checks the target for two readable horn sweeps, asymmetric mane hierarchy, connected anatomy, foot grounding, no extra limbs/horns, and actual portrait-scale legibility.
3. A separate planner maps the target to the current `emberhorn3()` construction rather than silently converting it to a GLB/rig pipeline. Any material change from code-native mesh to GLB requires a new explicit integration plan.
4. A separate implementer performs one bounded visual candidate under the existing initial-plus-two-repair cap. An independent visual reviewer sees neutral front/rear/side/three-quarter, 48/96px views, and an actual portrait encounter frame before a visual pass.

### Gameplay lane — no implementation currently authorized

The current gameplay owner should only provide a **verification fixture**, never a new mechanic: record an ordinary observation → committed charge → dodge → recovery/tether window from an existing Emberhorn at normal portrait framing. The independent species-play reviewer checks that the target’s directional silhouette is visible before commitment and that charge/recovery/taming, Cragbreaker, cooldown, mineral selection, source IDs, reload and companion selection are unchanged. Existing behavior tests must remain authoritative.

### Missing evidence

- No located current neutral multi-view Emberhorn review, source hash/mesh budget receipt, or model-specific motion/charge-contact review.
- No current Sunscar route capture proves Emberhorn placement, discovery, full charge/recovery, or return; `baseline-route-walk-6.png` is explicitly empty of it.
- The actual interior still is a close diagnostic composition, not an earned Emberhorn journey or physical-phone proof.
- No visual target, independent selection, construction plan, target review, or visual-review score exists for the proposed narrow correction.

**Next gate:** wait for separate target authorization and independent selection. Trailgloam remains closed HOLD and supplies no retry allowance or shared claim for this Emberhorn candidate.
