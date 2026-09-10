# Beta 0.2 — player playtest

Start at the normal local game address, without `?author=1`. If you have older progress, export it from Journal → Settings before using a fresh browser profile. This guide describes things to see and do as a player. It is not necessary to open developer tools.

## First expedition

1. **Leave Camp.** Choose Enter Frontier. Beside the drop pod, walk toward the glowing gate a few steps ahead. Tap its travel prompt or press E, then choose Forest Edge. You should arrive outside the Verdant Verge gate. Failure signs: no travel prompt, trapped movement, duplicate menus, or a blank scene.
2. **Gather a reason to return.** Approach a tree, rock, or plant and stand still. Your Field Tool should visibly swing, matter should pop free and pull toward you, and carried resources should appear. Turn Auto Harvest off and try F or a right-side tap/hold; manual harvesting should still work. Swipes should dodge without producing an unwanted extra attack.
3. **Discover safety.** Follow the trail into the region until you find the blue Waypoint. Approach it and choose Extract. You should see a recovery card at Camp, with banked resources and XP. The Waypoint should now appear as a future start when you visit the Camp gate. An orange Beacon also extracts but never becomes a start location.
4. **Prepare a stronger run.** Open Journal → Workshop at Camp, or use the Matter Resonator beside the pod. Read each upgrade's missing materials and level requirement. Secure those supplies on another run, then synchronize an affordable upgrade or craft a medkit. Purchases must deduct the shown materials exactly once; unusable upgrades should explain why.

## Bonds, combat and consequences

5. **Meet a Mossling.** Look for the little green garden-antlered grazer in Verdant Verge. Approach without hitting it and choose Bond. Tap Resonance as the moving light reaches the gold band; three good echoes form a bond. Leave peacefully or miss three times to check that the game resumes cleanly. A successful bond follows you, but the Journal must label it unsecured until you extract.
6. **Use a companion.** Extract with the new bond, then select it in Journal → Wildkin at Camp. On your next expedition, lose some health to a threat and use Bloom (Q or its action button). Health should recover and the cooldown should begin. Find the matching root-sealed cache and use Bloom nearby to awaken it. Later Tidefin shields, Emberhorn sends a shockwave, and Skydancer launches you upward; their matching caches invite revisits.
7. **Check risk.** Carry fresh materials or a new bond, then deliberately let hostile wildlife defeat you. Camp should show a loss card. Previously secured upgrades, Wildkin, Waypoints and repaired gates should survive, while that run's cargo and new bonds should be gone. Export your save first if you want to preserve a particular test state.
8. **Try optional traversal.** Approach a marked Jump Pad with some running momentum, climb a ladder, or enter an optional parkour course. Check that the start/checkpoint/end cues are understandable. Falling inside an active protected course should return you to its checkpoint with cargo; leaving the course restores normal expedition risk.

## Deeper frontier and ending

9. **Repair, then push.** Find the ruined outbound gate in each region. The prompt shows a persistent player-level requirement and materials required from your current carried cargo. Bank XP to gain levels, then bring fresh materials to the gate. Repairing should spend cargo and persist even if that expedition later fails. Follow the connected regions, discovering each Waypoint so later runs can start deeper.
10. **Secure the Heartwood.** In Heartwood Vault, approach the Guardian before the ancient Core cache. Move outside its amber ground ring before impact, use your Field Tool and companion, and retreat or heal when needed. The Core remains sealed until the Guardian falls. Retrieving it is only half the job: extract to see the ending. Dying with the Core must leave it available on a future expedition. Reload after a successful return to confirm the ending stays secured.

## Phone and usability acceptance

- On a physical phone in portrait, play at least one full expedition. Try movement and attack simultaneously, abrupt direction changes, repeated swipes, opening/closing menus while holding a gesture, and switching away from the browser. Controls must resume without drifting or stuck attacks.
- At low health and with several carried resources, check that health, danger rings, action prompts and extraction choices remain readable without covering the character. Listen for distinguishable harvest, hit, pickup, discovery and bonding feedback. Sound off should remain off after reload.
- Open Journal → Settings and export a backup. Restore that file at Camp after confirming its name. Try an unrelated JSON file; it should be rejected without changing your progress.
- Play continuously for 15 minutes across several regions. Watch for heat, long pauses, growing stutter, flickering terrain, disappearing models or missed touch input. Automated browser tests do not establish physical-phone performance.

When reporting an issue, describe the region or recognizable landmark, what you did, what happened, and what you expected. Note the device/browser and whether you loaded an older save. Screenshots are especially useful for readability and visual problems.
