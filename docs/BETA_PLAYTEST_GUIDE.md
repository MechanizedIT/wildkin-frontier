# Sunlit Wilds 0.3.0-alpha.1 — player playtest

This is a local alpha playtest, not a release or owner-accepted build. Start at the normal local address without `?author=1`. The guide describes recognizable player actions; it does not require developer tools. Physical-phone performance and full campaign acceptance remain unproven.

## Controls and shell

Desktop: **WASD** move, **Shift** run, **C** sneak, **F** or mouse hold use the Field Tool, **Space** dodge, **E** interact, **Q** companion ability, and **H** medkit. **B** or **J** opens **Backpack**, **K** opens **Skill paths**, and **M** opens the map. The main shell tabs are MAP, PACK, WORK, SKILLS, WILDKIN, and **···** settings.

On touch, drag lower-left to move, tap/hold right to use the tool, and swipe to dodge. Report any lost movement, accidental swings, or menu state that does not clear after closing it.

## First frontier loop

1. **Orient in Frontier Haven.** Choose **Enter Frontier**. From the landing pod, find the covered **Workshop** and the curved **Sanctuary**. Press **E** at the Workshop to open WORK and confirm it shows secured materials and upgrade costs. Press **E** at the Sanctuary to open WILDKIN. Failure signs include a missing prompt, blocked movement, an empty screen, or an interaction that opens the wrong panel.
2. **Travel through the Camp gate.** Walk to the gate and use its prompt to choose Forest Edge. You should arrive at the Verdant Verge entrance, with the route and nearby grove visible. Failure signs: no travel choice, an arrival inside scenery, or an unresponsive character.
3. **Gather and extract.** Approach a tree, rock, ore, crystal, flower, berry, or fiber field and stand still for Auto Harvest, then try **F** or a right-side hold. Matter should visibly release and reach your carried PACK. Find a blue Waypoint or orange Beacon and extract. At Camp, PACK’s **STORED** tab should show the returned resources; carried material is at risk until extraction.
4. **Spend and advance.** Return to WORK to synchronize an affordable upgrade or craft a medkit. Open **Skill paths** with **K** and inspect the 12 nodes across its three branches. If you have a point and meet a node’s requirement, select it and use **AWAKEN**. Costs and requirements should be readable, and a successful purchase should occur once.

## Bonds, risk, and deeper routes

5. **Meet a Mossling.** In Verdant Verge, approach the green garden-antlered grazer without attacking. Choose Bond, then time Resonance taps through its gold band. A successful new bond remains unsecured until extraction. After extracting, use WILDKIN at Camp to select the companion for a future run.
6. **Use the companion.** On an expedition, use **Q** or the ability button. The ability should have a readable effect and cooldown. Matching sealed caches are intended revisits once the appropriate Wildkin is secured.
7. **Check expedition risk.** Carry fresh materials or a new bond, then allow a hostile creature to defeat you. The Camp result should preserve previously secured upgrades, Waypoints, gates, and companions while clearing that run’s cargo and unsecured bond.
8. **Push farther only as route evidence allows.** Repair an outbound gate when its prompt’s level and carried-material requirements are met. Later zones contain landmarks, water and elevation, optional courses, more wildlife, and the Heartwood Guardian/Core finale. Record the exact landmark and action if a route, pad, collision, or interaction blocks progress; later course grading remains under active QA.

## Human-device checks still needed

- Play an expedition on a physical phone in portrait: move and attack together, change direction sharply, repeat swipes, open and close panels during a gesture, and background the browser. Controls should resume without drift or stuck attacks.
- At low health and with cargo, check that hazards, prompts, action buttons, and HUD remain readable. Listen for distinct harvest, hit, pickup, discovery, and bonding feedback.
- Use **···** settings to export a save, then restore it at Camp. An unrelated JSON file should be rejected without replacing progress.
- Play continuously across several regions and look for heat, long pauses, growing stutter, terrain flicker, missing models, or dropped touch input. Automated desktop results do not establish physical-phone performance.

When reporting an issue, include the region and landmark, the action, the observed result, the expected result, device/browser, and whether an older save was loaded. Screenshots help with readability and visual issues.

## Visible parkour danger

The dark thorn-crystal beds with amber rims are hazardous. Enter through the green course start, then walk onto the launch pad and clear the bed to the blue checkpoint. Both the takeoff and landing are safe. Deliberately step into the thorns after starting a course: you should return to its latest checkpoint with your cargo. Outside an active course, the same visible hazard carries normal expedition risk. Failure signs are an invisible hazard, a safe landing that resets you, or a failed course that loses your cargo.
