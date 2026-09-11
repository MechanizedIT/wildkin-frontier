# Sunlit Wilds redesign review

> Historical redesign review: the findings and evidence below describe their original pass, not the latest implementation status. For September 11 finite physical inventory, expedition resume and accepted bounded art/UI changes, read `CURRENT_SLICE.md` and `OVERNIGHT_HANDOFF.md`. New Tidefin V3 animation remains a non-shipping study; older scores do not transfer to it.

## Why this pass exists

The owner rejected the previous local candidate as pre-alpha quality. This pass redirects the project toward a readable, original mobile creature-exploration game: shaped terrain, coherent habitats, clear routes, recognizable resources, compact progression UI, and authored tools that can sustain further content. It does not claim beta quality, owner acceptance, physical-phone performance, publication, or release readiness.

## Reference evidence

Four owner-supplied recordings were reviewed as visual interaction references. They informed visual hierarchy and spatial readability only; Wildkin Frontier does not copy their characters, UI artwork, maps, or monetization.

| Reference | Reviewed moments | Applied lesson |
| --- | --- | --- |
| Dreamdale 220123 | 0:00–0:20 gathering and route; 0:24 backpack; 0:28 guide; 0:33 equipment; 0:41–1:18 bridges, fields, workshop | Continuous paths, water as negative space, grouped resources, large readable landmarks, inventory identity. |
| Dreamdale 220444 | 0:03–0:12 collection; 0:18 stone approach; 0:37 backpack; 0:41 guide; 0:47–0:56 equipment | A resource must retain its visual identity from world to HUD and inventory. Rewards need a clear collection moment. |
| Dreamdale 220721 | 0:04–0:30 dungeon bridges/stairs; 0:39 and 0:43 enemy warnings; 1:05 level-up | Elevation needs readable side faces and transitions; attacks and rewards need legible space. |
| Eternal Hero 221004 | 0:00–0:21 woodland, pond, cliffs, settlement; 0:26 gear; 0:36, 0:42, 0:47, 0:57 mastery/presets | Layered foliage, rock, water and paths; stronger light/dark contrast; connected progression choices. |

The design research also used the official [Dreamdale developer listing](https://play.google.com/store/apps/details?id=com.dream.dale) and [Eternal Hero developer listing](https://play.google.com/store/apps/details?id=games.rivvy.eternalherorpg&hl=en). Their current service features are not product requirements for this single-player local game.

## Implemented direction

- Original icon atlas and locally vendored rounded font; inventory and HUD now use consistent resource identity.
- A saved 12-node, three-branch skill tree with gameplay effects and old-save normalization.
- Original sculpted player, Wildkin, Guardian, and environment assets, including editable baked mesh recipes.
- Continuous authored terrain, paths, water masks, elevated landforms, grass detail, projected player shadow, and landscape editing with author preview.
- Camp structures, ecology kits, resource fields, and five campaign regions authored around distinct habitats.
- Visible thorn-crystal beds replace invisible parkour danger, with shared rotated bounds in Author and Play and safe takeoff/landing aprons.
- Frozen Author preview and performance-oriented asset/geometry work. Author remains able to export and edit canonical data.

## Evidence and current limits

- Automated aggregate: `npm run verify` passes 617 tests / 165 suites, canonical/generated world synchronization, campaign validation, readable build and package checks.
- At 390px and 320px UI widths, dialogs and Escape/Tab interaction checks pass.
- Author legacy flows pass. The landscape browser check changes a hill from 1.8 to 2.8, verifies that height in a native JSON export, undoes it, and verifies 1.8 in both the form and a second export. Player storage stays unchanged.
- Headless Edge cold navigation to a visible welcome state measured 7.34 seconds. This is desktop/headless evidence, not physical-phone FPS or startup proof.
- All five main routes, authored side routes, named Waypoints and start → launch → landing/checkpoint → finish sequences were traversed with keyboard input. The route sweep used QA-unlocked gates, invulnerability and 1.5× ground speed, with no player teleportation. This proves physical reachability, not campaign pacing or unaided difficulty. S1 additionally has airborne/support-shadow evidence.
- Fresh Camp departure, first harvest, physically approached Waypoint and extraction pass through keyboard/UI input. Bonding timing, securing and reload pass with explicitly labelled diagnostic positioning for the bonding setup.
- A real UI skill purchase raises maximum health from 5 to 6, spends the point, and persists after reload.
- The portable build loads both original art atlases and Nunito from local assets. Movement and Backpack/Skills/Wildkin/Settings remain usable offline after loading; no external requests or uncaught errors.
- Work remains local. Nothing has been published or submitted as a release.

## Human playtest tour

1. Start at Frontier Haven. Stand at the drop point and identify the gate, workshop, sanctuary and route without opening a menu. Walk toward the gate. Failure signs: structures are cropped, the route is unclear, or the player is stopped by hidden collision.
2. Enter Verdant Verge. Walk the safe first route, harvest a nearby wood/fiber/berry field, then look for the Mossling side grove and the lookout. Failure signs: resources are visually interchangeable, fields feel scattered, or the route lacks a destination.
3. Use the first launch route from its green start, over the thorn bed, to the blue checkpoint and cache. Walk into the thorns after starting to check safe recovery with cargo. Failure signs: the approach cannot be walked, the pad does not launch toward the landing, the shadow follows the player in the air, or the finish is hazardous.
4. Travel to Shatterfen, Emberfall, Windscar and Heartwood through normal gates. At each entry, walk toward its major landmark and extraction/forward route. Failure signs: water/terrain appears cosmetic but blocks or floats objects, a waypoint is unreachable, or a terrain step blocks ordinary movement.
5. Open Backpack and Skill Tree after collecting resources and XP. Confirm item icon, name and quantity agree with the pickup, then purchase an available node and confirm its described effect persists after returning to Camp.

## QA final summary

**Local alpha candidate 0.3.0-alpha.1 is ready for owner playtest.** The portable ZIP is 6.25 MB (about 20.8 MiB uncompressed). No game or editor blocker remains in the checks performed.

The route sweep completed 25 gameplay checks across all five regions. Its final unrelated Author step encountered an obsolete welcome-button selector after gameplay completed. The selector is fixed; the separate current Author check passes and confirms the gameplay shadow/shell are hidden in Edit. This is combined route and Author evidence, not a claim that the complete traversal command was rerun after that selector fix.

The fresh thorn-bed check uses a seeded S1 start and two carried wood, then keyboard movement around the pad into the visible bed: the player returns to the course start, the run remains active, and cargo remains intact. All five authored hazards also pass footprint/landing-clearance checks. Later courses' successful jumps are covered by the full route sweep; deliberate failure was physically exercised in S1.

Evidence lives in local `dist/qa/`: `sunlit-final-verify.log`, `sunlit-traversal-full-routes.json`, `sunlit-hazard.json`, `sunlit-author-shadow.json`, `browser-playtest.json`, `skill-purchase-playtest.json`, `author-landscape-playtest.json` and `package-playtest.json`. The final Camp, S1 arrival, S5 arrival and unobstructed airborne-course screenshots were inspected. Earlier failed/intermediate screenshots in that directory are retained as diagnostics.

Remaining acceptance is human: preferred art direction, intuitive course signals, touch comfort, sustained phone performance and campaign pacing. Mounts, equipment loadouts and expanded Camp building remain broader future development; this pass does not claim the entire long-term survival-RPG vision is finished.
