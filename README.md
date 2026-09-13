# Wildkin Frontier

Wildkin Frontier is an offline, single-player exploration and creature-life game in active local development. Portrait mobile is the primary play surface: five always-visible quick slots sit at the bottom, the movement stick sits above them on the left, and the selected-slot action with Jump and Dodge sits above the right side. Landscape and desktop remain supported.

Leave a physical Camp, make a short useful outing, study or bring home an individual Wildkin, and return to a world that remembers the result. The direction favors slow, dangerous exploration, recognizable regional geography, and care that happens in the world rather than through a separate creature inventory.

**Early alpha in progress.** Seeded Sunscar crystal blooms now form compact harvestable places with saved partial/depleted state. The selected Sunscar bloom R3 scored8.0/10 PASS after7.0/7.6. All 1,233 tests and verify/world/retained-campaign/build/validate/ZIP pass;44.20 MB unpacked/20.55 MB ZIP. Native ordinary harvest increased crystal10→12→14; partial depletion survived unloading and literal reload. Six owned Wildkin,12 iron,8 XP and health 5 were preserved. Exact portable continuation and limitations are recorded in the [bloom receipt](art/reviews/regional-blooms/receipt.md).

<img src="art/reviews/regional-blooms/r3-portrait.png" alt="Actual selected Sunscar bloom in portrait play" width="210"> <img src="art/reviews/regional-blooms/cleft-portrait.png" alt="Actual second seeded crystal arrangement" width="210">

The working release direction is one seeded continent with an ocean boundary and useful companion roles. Roughly10 habitats and30 species are a staged content target; the first alpha starts with a smaller finished set. Coastline/ocean, boats and the larger roster are not implemented. See the [early-alpha priorities](docs/EARLY_ALPHA_PLAN.md) and [illustrated progress supplement](docs/research/living-frontier/Early-Alpha-Progress.md).

<img src="art/reviews/frontier-discoveries/r2-near-portrait.png" alt="Actual portrait approach to the Signal Cache receiver and chest" width="210"> <img src="art/reviews/frontier-discoveries/native-opened.png" alt="Actual opened chest after collecting its one-time reward" width="210">

The Signal Cache is one validated authored location on seeded ground: open its chest to recover two iron ore and eight XP once. Distributed procedural secrets remain planned. The [discovery receipt](art/reviews/frontier-discoveries/receipt.md) includes native interaction and persistence proof. The latest [timing comparison](art/reviews/streaming-preparation/streaming-comparison.svg) shows measured desktop CPU pauses, not phone performance.

<img src="art/reviews/regional-provinces/r3-overhead.png" alt="Actual seeded Sunscar ridges and resource pockets in the selected diagnostic overhead" width="440"> <img src="art/reviews/regional-provinces/final-package-portrait.png" alt="Regional Emberhorn beside the tested resource pocket in the final portable build" width="210">

Actual prototype captures: selected regional overhead on the left; a regional encounter in the final portable build on the right. The [province receipt](art/reviews/regional-provinces/receipt.md) includes the revealed atlas and separates functional proof from the held visual target. The [visual fieldbook](docs/research/living-frontier/Living-Frontier-Visual-Fieldbook.pdf) also illustrates the proposed direction.

## Play locally

Recommended local runtime: Node.js 22 (the current development version):

```sh
npm install
npm run dev
```

Open http://localhost:8080/. Serve the project over HTTP rather than opening `index.html` directly. Saves are browser-local. Settings can export or restore a save backup.

Desktop controls: **WASD** move, **Shift** run, **C** sneak, **1–5** select a quick slot, **F** use the selected item, **Space** jump, **R** dodge, **E** interact, and **Q** use the companion ability. On touchscreens, use the left stick to move; tap the five bottom quick slots; use the selected action, Jump, and Dodge on the right. **Pack** opens the physical inventory and shortcut arrangement.

## Current playable foundation

- A persistent Camp, personal atlas/minimap, physical departure and return, locally saved progress, and one fixed deterministic world edition with shared terrain/ecology/scenery/wildlife descriptor inputs.
- Five persistent portrait quick slots, separated Pack access, held-input cancellation, and landscape/desktop support.
- Individual Wildkin records through capture, Camp banking, roster selection, reload, and care. Mossling body tone is visibly expressed; separate eyes, markings, size changes, and modular body parts are not shipped.
- One physical nursery and garden, active-play young/crop growth, ordinary compatible Mossling pairing, and earned optional parent body-tone guidance. The first current path is deliberately bounded.
- Bounded terrain residency, shared terrain/collision sampling, a personal atlas, generated forage/scenery and existing Mossling, Tidefin, and Emberhorn encounters. Terrain retains25 published pieces plus at most nine detached candidates, preparing one per moving tick and publishing a complete neighborhood after collider installation. A bounded climb and fall-risk foundation exists; broad climbing and swimming are later work.
- A generation inspector for current samplers, plus irregular roughly600m seeded provinces with smooth weighted ecotones, terrain targets up to84m, regional ground color, admitted flora/resources, and at most one additional high-draw signature encounter per live wildlife set. Existing resident/count bounds remain unchanged. Final visual admission is pending.

## Proposed direction

The next frontier is not a promise of a completed campaign. The active local foundation now gives three province grammars distinct landform, color, ordinary life/resource recipes and sparse signature encounters; deeper traversal, ecology and discoveries still need later slices. It does not add physical water, weather, caves/overhangs, infinite-distance simulation, DNA systems or trade. Evidence is tracked in [Current slice](docs/CURRENT_SLICE.md).

Later proposals include modular compatible Wildkin rigs and parts, broader field research and reproduction modes, habitat/food/camp systems, caves and overhang meshes, day/night and weather, DNA archives/cloning, community discoveries, and trusted online trade. These are not current gameplay systems. Mortality and elder rules remain undecided; current no-absence-penalty growth is provisional.

## Research and design references

- [Living Frontier visual fieldbook](docs/research/living-frontier/Living-Frontier-Visual-Fieldbook.pdf) — phone-friendly current evidence, proposed concepts, process diagrams, and clearly marked limitations.
- [Living Frontier research appendix](docs/research/living-frontier/Living-Frontier-Research-Appendix.pdf) · [editable Markdown](docs/research/living-frontier/Living-Frontier-Research-Appendix.md) — implementation reasoning, source ledger, and proposed regional/content workflow.
- [Research image manifest](docs/research/living-frontier/image-manifest.md) — actual versus proposed image provenance.
- [Living Frontier plan](docs/LIVING_FRONTIER_PLAN.md) · [current scope](docs/CURRENT_SLICE.md) · [regional diversity plan](docs/REGIONAL_DIVERSITY_PLAN.md) · [mobile identity](docs/MOBILE_IDENTITY.md).

Historical finite-campaign planning and review material remains available as source history; it is not the active product promise.

## Build and local checks

```sh
npm test
npm run verify
npm run build
npm run validate
npm run zip
npm run serve:submission
npm run test:browser
```

`npm run serve:submission` serves the packaged result at http://localhost:8081/. The build is written to `dist/submission/` and the ZIP to `dist/submission.zip`. `npm run test:browser` runs the local browser playtest harness. Focused checks are also available through the scripts in `package.json`; final validation status belongs in [Current slice](docs/CURRENT_SLICE.md).

## Development references

[Current objective](docs/CURRENT_SLICE.md) · [Game design](docs/GAME_DESIGN.md) · [Architecture](docs/ARCHITECTURE.md) · [Build log](docs/BUILD_LOG.md) · [Historical beta plan](docs/BETA_RELEASE_PLAN.md)

Runtime: Three.js 0.160.0, Rapier 0.20.0, vanilla HTML/CSS/JS, and one animation loop with fixed physics steps. Runtime dependencies are local; the game makes no external runtime requests; local assets load from the same server.
