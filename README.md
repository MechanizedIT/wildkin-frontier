# Wildkin Frontier — Sunlit Wilds 0.3.0-alpha.1

A single-player expedition adventure for landscape mobile and desktop browsers, with a portrait fallback. Leave Frontier Haven, prepare a finite backpack, gather strange matter, face or befriend Wildkin, and decide when to bring discoveries home.

**Local alpha build; not a release.** Sunlit Wilds 0.3.0-alpha.1 is under active development. It has not received owner acceptance, has not been published, and has no physical-phone performance claim. The earlier Devpost work and the older beta report are historical context only.

## Play locally

Use Node.js 22 or newer:

```sh
npm install
npm run dev
```

Open http://localhost:8080/. Your browser stores progression, physical inventory and a small active-expedition snapshot locally. Reload resumes the saved expedition with ordinary world objects rebuilt; it does not preserve every creature or loose drop. From Settings, export or restore a save backup. Saves belong to that browser and site address.

Desktop controls: **WASD** move, **Shift** run, **C** sneak, **1–5** select a quick slot, **F** uses the selected item, **Space** dodges, **E** interacts and **Q** uses the companion ability. On touchscreens, nudge the lower-left stick to sneak or push farther to run. Drag open ground on the right to orbit; use the labeled action and Dodge buttons. Tap **Pack** for carried items and the nearby **Pod locker** world button for physical storage. **Pack → Journal** opens Gear assignment, Work, Wildkin, skills and Settings.

## Current playable frontier

- Frontier Haven and five connected regions: Verdant Verge, Shatterfen, Emberfall Ruins, Windscar Cliffs, and Heartwood Vault.
- Authored Sunlit Wilds terrain: curved routes, water, hills, grass detail, region palettes, landmark pockets, and editable landscape surfaces.
- Harvesting, renewable resource fields, extraction, Waypoints, Beacons, gates, hostile wildlife, optional traversal courses, caches, and a Guardian/Core finale.
- Four bondable Wildkin with distinct abilities, plus original sculpted player, creature, environmental, Camp, and resource models.
- A 12-node, three-branch **Skill paths** board, persistent levels, Workshop upgrades, field medicine, and locally saved progression.
- A landscape-first interface with a 16-slot backpack, nearby 24-slot pod/crate storage, drag/sort/split controls, tap/keyboard alternatives, compact Wildkin guidance and a five-slot toolbar.

The campaign and presentation are still being evaluated. The latest aggregate passes **810 tests**, world/campaign checks, build and ZIP at **42.53 MB unpacked / 20.25 MB ZIP**; successful final current-package native closure is recorded separately in [Current slice](docs/CURRENT_SLICE.md). This is not owner or physical-phone acceptance. The [Sunlit Wilds review](docs/SUNLIT_WILDS_REVIEW.md), [visual redesign plan](docs/VISUAL_REDESIGN_PLAN.md) and [prior beta report](docs/BETA_CANDIDATE_REPORT.md) preserve earlier evidence.

The crashland story, unique wreckage/natural route obstacles, defended Camp sectors, blueprints and backpack upgrades are planned beyond the current finite-inventory cutover. The new Tidefin V3 animation study is not shipping.

## A short first tour

Enter the Frontier from Camp. Approach the landing pod to open its locker, prepare supplies in your backpack, then tap Travel at the arch and choose Forest Edge. Gather the nearby Sapwood, stone, fiber and berries; discover the Lookout and Extract. Returning keeps carried items and secures XP and new bonds. Deposit items into the physical locker yourself. Crafting uses your pack plus one selected storage container while it remains within reach; equipment can use only packed supplies. Death provisionally keeps the backpack but loses carried XP and pending bonds.

Use the [current player spot checks](docs/OVERNIGHT_PLAYTEST.md) and [player playtest guide](docs/BETA_PLAYTEST_GUIDE.md) for recognizable routes and acceptance checks.

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
