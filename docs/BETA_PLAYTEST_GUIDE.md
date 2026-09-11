# Sunlit Wilds 0.3.0-alpha.1 — player playtest

This is a local alpha playtest, not a release or owner-accepted build. Start at the normal local address without `?author=1`. The guide describes recognizable player actions; it does not require developer tools. Physical-phone performance and full campaign acceptance remain unproven.

Updated for September 11 physical inventory v3. Use `OVERNIGHT_PLAYTEST.md` for the current focused checks; old screenshots and beta reports describe earlier builds. Keep your save and export a backup through Settings before testing.

## Controls and shell

Desktop: **WASD** move, **Shift** run, **C** sneak, **1–5** select gear, **F** uses the selected item, **Space** dodges, **E** interacts and **Q** uses the companion ability. Tap Pack for carried items, then Journal to reach Gear, Work, Wildkin, skills and Settings. A nearby Pod locker or crate opens physical storage; Pack alone does not provide remote access.

On touch, nudge the lower-left stick to sneak or push farther to run. Drag open ground on the right to orbit, and use the labeled action and Dodge buttons. Report lost movement, accidental swings or menu state that does not clear after closing it.

## First frontier loop

1. **Orient in Frontier Haven.** Choose **Enter Frontier**. Approach the landing pod and tap Pod locker. Confirm separate Backpack and Pod locker grids, then transfer a small stack if available. Older saves may offer withdrawal-only Legacy supplies. Close and open Pack → Journal for Work/Wildkin/Gear. Failure signs include a missing reachable prompt, blocked movement after closing, an empty screen or the wrong panel.
2. **Travel through the Camp gate.** Walk to the gate and use its prompt to choose Forest Edge. You should arrive at the Verdant Verge entrance, with the route and nearby grove visible. Failure signs: no travel choice, an arrival inside scenery, or an unresponsive character.
3. **Gather and extract.** With the Omni-tool selected, approach Sapwood, rock, ore, crystal, flowers, berries or fiber. Try Auto Harvest and manual Attack. Accepted matter should reach your finite backpack. A full pack must not silently collect/discard it or let one source generate endless pending yields. Find the Lookout or another extraction waypoint and Extract. Items remain packed at Camp; deposit them into nearby storage yourself. XP and new bonds are secured by the return.
4. **Spend and advance.** Return to WORK to synchronize an affordable upgrade or craft a medkit. Open **Skill paths** with **K** and inspect the 12 nodes across its three branches. If you have a point and meet a node’s requirement, select it and use **AWAKEN**. Costs and requirements should be readable, and a successful purchase should occur once.

## Bonds, risk, and deeper routes

5. **Meet a Mossling.** Craft a berry lure in the Camp menu and assign it through Gear. Follow the Wildkin Journal: sneak toward the creek Mossling, place berries on dry open ground, retreat while it feeds, then approach gently and Bond. There is no universal resonance-timing modal. A new bond remains unsecured until extraction; then choose it in Wildkin at Camp. Tidefin uses a dry-bank woven snare and calm release instead.
6. **Use the companion.** On an expedition, use **Q** or the ability button. The ability should have a readable effect and cooldown. Matching sealed caches are intended revisits once the appropriate Wildkin is secured.
7. **Check expedition risk safely.** Do not sacrifice a valued bond merely to test. On an incidental defeat, the provisional rule keeps the backpack and permanent progress while losing carried XP and pending bonds. Reload is not defeat: it resumes the small saved expedition snapshot on supported ground, with ordinary world state rebuilt. Duplicate rewards or missing packed items are failures.
8. **Push farther only as route evidence allows.** Repair an outbound gate when its prompt’s level and carried-material requirements are met. Later zones contain landmarks, water and elevation, optional courses, more wildlife, and the Heartwood Guardian/Core finale. Record the exact landmark and action if a route, pad, collision, or interaction blocks progress; later course grading remains under active QA.

## Human-device checks still needed

- Play an expedition on a physical phone in landscape, then briefly check portrait fallback: move and attack together, change direction sharply, orbit, open/close panels during a gesture and background the browser. Controls should resume without drift or stuck attacks.
- At low health and with cargo, check that hazards, prompts, action buttons, and HUD remain readable. Listen for distinct harvest, hit, pickup, discovery, and bonding feedback.
- Use **···** settings to export a save, then restore it at Camp. An unrelated JSON file should be rejected without replacing progress.
- Play continuously across several regions and look for heat, long pauses, growing stutter, terrain flicker, missing models, or dropped touch input. Automated desktop results do not establish physical-phone performance.

When reporting an issue, include the region and landmark, the action, the observed result, the expected result, device/browser, and whether an older save was loaded. Screenshots help with readability and visual issues.

## Visible parkour danger

The dark thorn-crystal beds with amber rims are hazardous. Enter through the green course start, then walk onto the launch pad and clear the bed to the blue checkpoint. Both the takeoff and landing are safe. Deliberately step into the thorns after starting a course: you should return to its latest checkpoint with your cargo. Outside an active course, the same visible hazard carries normal expedition risk. Failure signs are an invisible hazard, a safe landing that resets you, or a failed course that loses your cargo.
