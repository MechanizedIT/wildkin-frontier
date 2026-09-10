# Wildkin Frontier 0.2 — local beta candidate

**Prepared September 9, 2026.** This delivers a playable candidate for Chris's testing. It is not a public launch or a claim that the full long-term design is finished.

## What changed

The initial repository contained a strong tested movement/combat/authoring framework, Camp and two proof sections, and one upgrade. It did not contain a companion system, crafting or a campaign. Development and packaged interfaces had drifted.

The candidate retains Three.js and Rapier and adds Frontier Haven plus five authored regions, 19 placed wildlife encounters, 15 loot caches, five Waypoints, five extraction Beacons and five optional parkour routes. There are 49 editable visual recipes, including redesigned low-poly fauna. Terrain palettes, exploration pockets, softened shadows, canopy visibility assistance, explorer gait, particles, hit feedback and original procedural audio give the campaign a common presentation.

Four Wildkin can be bonded through a timing interaction, secured by extraction and selected at Camp. Their abilities heal, shield, strike or leap, and open four matching secret caches. Fifteen upgrade tiers and field medicine give banked matter a purpose. Milestones, persistent levels and repaired gates guide the player toward the Heartwood Guardian. The Core must be extracted to secure the ending; a failed attempt remains recoverable.

Author Mode retains isolated drafts, the Asset Workbench, undo/redo and full-world export, and gains a Campaign Readiness report using the same route/economy checker as the CLI. Player saves remain separate from author drafts.

## Evidence

The final implementation suite passes **599 tests across 165 suites**. World source/generated synchronization, campaign consistency, readable local packaging and ZIP generation pass. The portable build is about **5.3 MB** uncompressed and **1.53 MB** zipped. Build artifacts are `dist/submission/` and `dist/submission.zip`.

| Check | Observed proof | Limit |
| --- | --- | --- |
| Fresh expedition | Keyboard travel from Camp, visible gate selection, normal harvesting, physical Waypoint approach, extraction and banked rewards | One first-loop route, not a complete unassisted campaign |
| Bonding | Actual timing-button input, pending bond, extraction securing and reload retention | Target position supplied diagnostically |
| Companion utility | Actual Q input for all four abilities; matching seal/cache access, cooldown, extraction | Roster and positions supplied diagnostically |
| Combat | Guardian defeated through real movement, Field Tool, dodge and shield input | Prepared endgame upgrades/medkits and Waypoint start; not a balance benchmark |
| Travel/finale | Four carried-material gate repairs, active-section transitions, Core defeat/loot/loss/recovery/extract/reload | Positions, supplies and some fight outcomes supplied diagnostically |
| Save resilience | Corrupt values normalize; invalid imports reject; confirmed file restore reloads; forced storage failure keeps the expedition/cargo active and allows a successful retry | No cloud sync; unfinished runs are not saved |
| Touch/UI | Browser-native touch joystick and menu interruption; sound/reduced-motion toggles; modal coordination; 320/390/430/1024 viewport bounds | Desktop browser emulation, not a physical phone |
| Author | Edit/Play, section selection, Workbench, full-world export, readiness report, undo/redo shortcuts, player-save isolation | Human authoring comfort still needs review |
| Local package | Only local HTML/Three/Rapier requests; already-loaded play and menus work with network offline; context-loss recovery message | Initial load/reload still needs the server |
| Visibility | Foreground canopy fades only its own instance; pause restores materials; shadows and final model screenshots inspected | Headless rendering is not sustained device performance proof |

Reports and screenshots live in `dist/qa/`. Browser tests collect uncaught page errors and passed with none. Test scripts state where diagnostic setup is used. The campaign checker verifies renewable material availability and estimated reachability; actual input navigation also reached later-region Waypoints, gates and the Core. These do not establish every possible route or optimal progression pace.

## Human acceptance and remaining work

Use `BETA_PLAYTEST_GUIDE.md` for recognizable setups, actions and failure signs. The next acceptance pass should emphasize first-session comprehension, enjoyable progression pace, combat/ability readability, touch feel, sound balance and a sustained physical-phone session. Safari and mobile GPU behavior have not been established in this development pass. The 60–90 minute campaign target remains unmeasured.

The candidate uses compact handcrafted spaces and editable geometric art. Mounts, swimming/gliding, player equipment/ranged loadouts, expanded Camp building, a larger narrative campaign, distribution and monetization are not implemented. Additional species can be authored, but bonded abilities currently require a catalog/runtime addition. These are future development, not hidden features claimed by this beta.

Local storage is tied to the browser and site address. Export a backup before switching addresses/browsers or clearing browser data. Startup errors and graphics context loss now display recovery instructions; a reload returns to secured Camp progress and discards an unfinished run.

## Shared contracts checked

Input and modal ownership across keyboard/touch/map/journal/bonding; cargo/XP/bonds/Core across portal travel, extraction, death and reload; every upgrade family's neutral/purchased modifier state; companion identity across wildlife, roster, ability and seal; all six regions across runtime activation, author draft validation and packaged data; shared asset transforms/materials across Author, runtime, shadows and occlusion.
