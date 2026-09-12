# F5B — slow physical cliff climbing

September12,2026. Local main; provisional producer selection under continuous goal mode. Portrait/mobile first. No new dependency, model, network, stamina meter or save schema.

## Player result and visual judgment

A nearby eligible rock/terrain face offers CLIMB. Stick up/down ascends/descends slowly; neutral holds the current grip; LET GO drops into the shared falling/damage path. A clear walkable lip permits a collision-resolved pull-up. Ordinary Jump remains distinct. Trees, scenery, actors, sensors and boundaries do not offer climbing. Existing authored climbs share the physical exits/reset path.

Approach UI independently scored8.7/10 PASS. R2 removes the floating hand marker and unnecessary held tool/Jump/Dodge actions. R3 holds the climbing pose during the first55% vertical lift, then plays the existing mantle clip during the crossing. The judge found the early upright lift defect resolved in sampled frames. R3 is the strongest usable of three passes; **hand/boot contact and mantle art remain HOLD**. There is no convincing palm-on-lip/elbow/knee transfer; the generic rig can look suspended against the wall. Existing flat terrace terrain remains separate F5A/F2C visual debt.

Root authored the actual-baseline target and integrated controller/UI; Sol owned physics/probe and independent regression diagnosis, Terra owned playback/staging, and a separate Sol judge reviewed the imagery. `target.png` is a mockup. Other images are real gameplay or video frame extracts. Developer fixture:32,-123.2 at the three-metre terrace,412x915CSS/DPR1.25; ordinary42-degree camera, oblique yaw.9 only for grip inspection. Inventory/individuals are isolated diagnostic-save state, not earned progression proof.

## Physics and shared-contract closure

- Bounded face/top/exit queries use the same enabled solid/self/sensor/ignored-actor filters. Ray queries test the nearest solid before eligibility; they cannot reach through an ineligible obstruction. Explicit traversalSurface terrain/rock tags admit approved surfaces; scenery tags remain solid but unclimbable. Retirement invalidates the exact collider handle.
- Every attachment/up/down/mantle step uses Rapier movement. Exit occupancy is checked on entry and throughout the mantle. Blocked/retired/cancelled attachment releases into FALL. Landing requires actual walkable support. No mantle position teleport or timeout-created landing.
- Chris reported jumping up a wall repeatedly. Restoring legacy raw KCC grounding in an isolated diagnostic reproduced over5m of accumulated rise. The corrected real-Rapier regression performs720frames of repeated Jump against the terrace:12 genuine starts, ordinary1.43m maximum rise, no shelf arrival. Wall/rear-edge contact cannot recharge jumps.
- Central slope-aware sole support replaces raw computedGrounded acceptance. Flat support is within5cm; curvature accounts for inclines up to45degrees. Actual40degree regression, terrace ramp/full3.34m drop and blocked exits pass. An aggregate failure exposing a brief rear-shelf re-ground was fixed physically; its full-height fall assertion was preserved.
- Knockback now starts airborne tracking when pushing a grounded player off a ledge, preserves jump/climb-detach falls and creates one landing impact. Long jump timeouts transition to FALL, never grounded IDLE. Existing health/damage/save owners remain authoritative.

## Native proof and limits

- Native CLIMB plus real W/S listeners: ascent1.15m/s, descent.9m/s, exact held position/clip phase when input stops; camera orbit does not rotate the climbing direction. Native short LET GO and Atlas-open cancellation return to supported lower ground at health5.
- Real joystick input drove CLIMB -> staged MANTLE -> grounded IDLE, health5. `r3-native-touch-evidence.json` records30samples; selected endpoint32.0000,8.4231,-124.3929. The WebM records canvas only, excluding the HTML controls. Extracted1200/1400/1600/1800ms stills were inspected; **the recording was not watched continuously**, so it is not cadence/interpolation acceptance.
- Repeated actual keyboard Jump edges against the wall in two2.2second batches peaked at capsuleY6.752 both times; no ratcheting or shelf arrival. Real-input ramp travel from the lower approach reached the upper terrace with health5 unchanged;14 upper-ramp samples remained grounded.
- Package portrait/landscape/reload checks are recorded in package-evidence.json and package images. A landscape label-placement failure was corrected by pinning LET GO outside the cliff body envelope. The hidden ordinary-action container also had to release pointer hit-testing; a visible button alone was insufficient proof.

## Verification

`npm run verify`: **1,123/1,123**, world/generated consistency, legacy campaign checks, readable build and validation PASS. Final tiny landscape placement/hit-target fixes followed that aggregate; final build/validate/ZIP and native package proof were rerun without repeating the unchanged domain suite. Unpacked44.09MB; ZIP20.53MB. Logs remain in `.dream-loop/living-frontier-f5b/`; exact owned source/evidence/package hashes in hashes.json. No physical-phone comfort/performance claim. Legacy campaign checks do not establish frontier economy.

## Human check

Walk north from Camp past the two Mossling clearings to the rocky terrace. Face its tall front between the rock buttresses. Repeated Jump should rise to the same modest height and fall back; it must not climb the wall in stages. CLIMB should attach, upward stick should ascend slowly, neutral should hold and downward stick should descend. LET GO should drop naturally. Turn the phone sideways while holding: LET GO must stay visible and tappable. Continue upward to the lip: the player should pull onto supported ground only when the exit is clear. Use the broad left slope as the safe alternative. Floating above the floor, climbing tree trunks, passing through a blocked lip, renewed jumps from vertical wall contact, or a visible but untappable release control are failures.

Next parallel batch: F7B physical field research/optional tone-guided pairing, and F2D bounded habitat fullness. Further climb-contact animation polish is recorded debt. Keep the continuous goal active.
