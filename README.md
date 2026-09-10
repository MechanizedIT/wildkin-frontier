# Wildkin Frontier

A single-player expedition adventure for portrait mobile and desktop browsers. Leave Camp, gather strange matter, fight or befriend wildlife, and decide when to bring your discoveries home.

**Local beta candidate 0.2.0.** This is now an independent game project. The earlier Devpost event and phase restrictions are historical. The candidate is for playtesting; it has not been publicly released or tested on a physical phone in this development pass.

## Play locally

Use Node.js 22 or newer, then:

```sh
npm install
npm run dev
```

Open http://localhost:8080/. A phone on the same Wi-Fi can use the LAN address printed by the server. Your browser stores secured progress locally. An unfinished expedition is lost on reload. Journal → Settings exports and restores save backups; saves are specific to the browser and site address.

Desktop: **WASD** move, **Shift** run, **C** sneak, **F / mouse hold** use the Field Tool, **Space** dodge, **E** interact, **Q** companion ability, **H** medkit, **J** journal, **M** map. On touchscreens, drag on the lower left to move; tap/hold on the right to swing and swipe to dodge. Jump Pads and ladders provide traversal. Auto Harvest swings near resources while you stand still.

## The playable campaign

- Frontier Haven plus five connected regions: Verdant Verge, Shatterfen, Emberfall Ruins, Windscar Cliffs, and Heartwood Vault.
- Harvesting, temperament-driven wildlife, melee/ranged threats, optional parkour, renewable supplies, caches, Waypoints and extraction Beacons.
- Four Wildkin to bond through a resonance timing interaction. New bonds remain at risk until extraction. Secured companions offer healing, shielding, a shockwave or an upward leap, and each awakens a secret cache.
- Fifteen permanent upgrade tiers across five families, persistent player levels, craftable field medicine, discovered travel starts, repaired gates and field milestones.
- A Guardian encounter and recoverable Heartwood Core finale. The frontier remains open after the Core is secured.
- Settings, pause, backup restoration, adaptive portrait UI, original procedural audio, pooled feedback, and editable low-poly asset recipes.

The design's larger ambitions—mounts, swimming/gliding, equipment loadouts and expanded Camp building—remain future development. No campaign-duration claim has been measured. Use [the player guide](docs/BETA_PLAYTEST_GUIDE.md) and [candidate evidence](docs/BETA_CANDIDATE_REPORT.md) for the precise scope and remaining checks.

## Create and edit

Open http://localhost:8080/?author=1 on desktop. **EDIT** opens the isolated world draft and Asset Workbench. Normal play uses the repository world. **Campaign Readiness** checks the current draft's route, renewable economy, companion rewards and finale alongside the normal schema validator. Export includes the complete world and its asset recipes.

See [the author guide](docs/BETA_AUTHOR_GUIDE.md). Replace `src/world/data/world.json` with a reviewed exported world and run `npm run world:generate`. The separate `tools/author-beta-world.mjs` reconstructs the authored beta baseline; rerunning it overwrites world data, so do not run it over your editor changes.

## Verify and package

```sh
npm run verify
npm run zip
npm run serve:submission
```

The portable build is `dist/submission/`, its ZIP is `dist/submission.zip`, and the packaged server runs at http://localhost:8081/. Historical script names remain for compatibility. Development and release use one HTML/UI shell. Three.js and Rapier stay local; the game has no external runtime service or CDN dependency. Serve the files over HTTP instead of opening `index.html` directly. Initial loading/reloading needs the local server; already loaded gameplay can continue offline.

Browser checks use Playwright with installed Microsoft Edge by default:

```sh
npm run test:browser
npm run test:systems
npm run test:boundaries
npm run test:combat
npm run test:author
```

Set `GAME_URL` to test another local server, including the packaged build. Reports and screenshots are written to `dist/qa/`. Diagnostic test setups are explicitly identified and do not claim unassisted campaign or physical-device acceptance.

## Development references

[Current objective](docs/CURRENT_SLICE.md) · [Beta plan](docs/BETA_RELEASE_PLAN.md) · [Game design](docs/GAME_DESIGN.md) · [Architecture](docs/ARCHITECTURE.md) · [World guide](docs/BETA_WORLD_GUIDE.md) · [Build log](docs/BUILD_LOG.md)

Runtime: Three.js 0.160.0, Rapier 0.20.0, vanilla HTML/CSS/JS, one animation loop with fixed physics steps. Build: esbuild. First-party code is readable. Third-party provenance is in `THIRD_PARTY_NOTICES.md` and `vendor/README.md`.
