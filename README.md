# Wildkin Frontier — Sunlit Wilds 0.3.0-alpha.1

A single-player expedition adventure for portrait mobile and desktop browsers. Leave Frontier Haven, gather strange matter, face or befriend Wildkin, and decide when to bring discoveries home.

**Local alpha build; not a release.** Sunlit Wilds 0.3.0-alpha.1 is under active development. It has not received owner acceptance, has not been published, and has no physical-phone performance claim. The earlier Devpost work and the older beta report are historical context only.

## Play locally

Use Node.js 22 or newer:

```sh
npm install
npm run dev
```

Open http://localhost:8080/. Your browser stores secured progress locally; an unfinished expedition is lost on reload. From the shell’s **···** settings panel, export or restore a save backup. Saves belong to that browser and site address.

Desktop controls: **WASD** move, **Shift** run, **C** sneak, **F** or mouse hold use the Field Tool, **Space** dodge, **E** interact, **Q** companion ability, and **H** medkit. **B** or **J** opens **Backpack**, **K** opens **Skill paths**, and **M** opens the map. On touchscreens, drag the lower-left control to move; tap/hold the right side to use the tool and swipe to dodge.

## Current playable frontier

- Frontier Haven and five connected regions: Verdant Verge, Shatterfen, Emberfall Ruins, Windscar Cliffs, and Heartwood Vault.
- Authored Sunlit Wilds terrain: curved routes, water, hills, grass detail, region palettes, landmark pockets, and editable landscape surfaces.
- Harvesting, renewable resource fields, extraction, Waypoints, Beacons, gates, hostile wildlife, optional traversal courses, caches, and a Guardian/Core finale.
- Four bondable Wildkin with distinct abilities, plus original sculpted player, creature, environmental, Camp, and resource models.
- A 12-node, three-branch **Skill paths** board, persistent levels, Workshop upgrades, field medicine, and locally saved progression.
- A portrait-first icon shell with MAP, PACK, WORK, SKILLS, WILDKIN, and settings panels; local Nunito font and a first-party frontier icon atlas.

The campaign and presentation are still being evaluated. See the current [Sunlit Wilds review](docs/SUNLIT_WILDS_REVIEW.md) and [visual redesign plan](docs/VISUAL_REDESIGN_PLAN.md) for evidence, direction, and remaining work. The [prior beta candidate report](docs/BETA_CANDIDATE_REPORT.md) is historical.

## A short first tour

Enter the Frontier from Camp. The Sanctuary manages secured Wildkin, while the covered Workshop/Matter Resonator spends materials that have been extracted. Use the gate to reach Verdant Verge, gather a nearby resource field, discover a Waypoint or Beacon, and extract so the materials become secured. Return to Camp to use WORK and SKILLS, then select a bonded Wildkin from WILDKIN for a later expedition.

Use the [player playtest guide](docs/BETA_PLAYTEST_GUIDE.md) for recognizable routes and acceptance checks.

## Create and edit

Open http://localhost:8080/?author=1 on desktop. **EDIT** opens an isolated world draft and Asset Workbench; normal play uses the repository world. The authoring tools edit objects, visual-asset recipes, and region landscapes, then offer **Validate**, **Campaign Readiness**, and complete-world **Export**.

See the [author guide](docs/BETA_AUTHOR_GUIDE.md). Replace `src/world/data/world.json` only with a reviewed export, then run `npm run world:generate`. The baseline authoring script reconstructs the canonical authored world and can overwrite editor work.

## Verify and package

```sh
npm run verify
npm run zip
npm run serve:submission
```

The portable build is `dist/submission/`, its ZIP is `dist/submission.zip`, and the packaged server runs at http://localhost:8081/. Runtime dependencies are local and the game makes no network requests at play time. Serve over HTTP rather than opening `index.html` directly.

Browser checks use Playwright with installed Microsoft Edge by default:

```sh
npm run test:browser
npm run test:systems
npm run test:boundaries
npm run test:combat
npm run test:author
```

Diagnostic browser setups are not evidence of unassisted campaign completion or physical-device performance.

## Development references

[Current objective](docs/CURRENT_SLICE.md) · [Game design](docs/GAME_DESIGN.md) · [Architecture](docs/ARCHITECTURE.md) · [Sunlit Wilds review](docs/SUNLIT_WILDS_REVIEW.md) · [Visual redesign plan](docs/VISUAL_REDESIGN_PLAN.md) · [World guide](docs/BETA_WORLD_GUIDE.md) · [Build log](docs/BUILD_LOG.md)

Runtime: Three.js 0.160.0, Rapier 0.20.0, vanilla HTML/CSS/JS, and one animation loop with fixed physics steps. `assets/fonts/Nunito.ttf` is locally bundled; the frontier icon atlas and game models are first-party project assets. Dependency provenance and licenses are recorded in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [vendor/README.md](vendor/README.md).
