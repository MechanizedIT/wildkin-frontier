# Wildkin Frontier — Meta Horizon Game Prototype (Phase 0) (working title)

Single-player, portrait-mobile, Three.js/HTML5 survival & resource management prototype. Phase 0 is a compliant foundation only: a minimal 3D scene with a fixed high third-person camera, placeholder island and player marker, and a reproducible offline submission build. No gameplay systems yet.

## Prerequisites

- Node.js 18+ (tested with 22.17.1) and npm
- A modern desktop browser and a phone on the same Wi-Fi for device testing
- No CDN or runtime network required — Three.js 0.160.0 is vendored at `vendor/three.module.js` (see `THIRD_PARTY_NOTICES.md` and `vendor/README.md`)

## Install & Run (Development)

```sh
npm install
npm run dev
# or: npm run serve
```

Opens a static server bound to `0.0.0.0:8080`:

- Desktop: http://localhost:8080/
- Phone (same network): `http://<your-laptop-ip>:8080/` — the server logs LAN URLs on start

Source is modular (`src/main.js`, `src/game/*`, `styles/game.css`) and uses an importmap for `three` → `./vendor/three.module.js`. No bundler required for dev.

## Phone Testing on Same Network

1. `npm run dev` — note the `network: http://192.168.x.x:8080/` line
2. On your phone (same Wi-Fi), open that network URL
3. Confirm: portrait framing (centered, max 520px), high top-down camera, HUD not blocking canvas, no scroll/overscroll, resize/orientation stays framed

To find your IP manually: `ipconfig` (Windows) / `ifconfig` or `ip addr` (macOS/Linux).

## Offline / External-Request Check

The build must be playable without any external network requests (no CDN, no runtime `https://`).

- **Quick check (no disconnect needed):** Open DevTools → Network → refresh. Confirm every request is local (`./vendor/three.module.js`, local CSS/JS) and that no `https://` entries appear.
- **Automated gate:** `npm run validate` fails if `dist/submission/index.html` contains CDN/runtime `https://`, missing vendor, unreadable/minified code, missing locals, or exceeds 35 MB. Use `npm run verify` (build + validate) for the full gate.
- **True offline smoke (no reload after LAN disconnect):** With the submission build already loaded via `npm run build && npm run serve:submission` at `http://localhost:8081/`, briefly disable the device network/airplane mode and confirm the **already-open tab** remains fully interactive. Do **not** disconnect from the LAN dev server and then attempt to reload the dev server — the dev server naturally requires LAN to serve; the submission build at `dist/submission/` is the offline artifact.

## Submission Build & Validation

```sh
npm run build      # esbuild bundles src/main.js (graph-resolved, readable unminified, three external) + inlines into dist/submission/index.html
npm run validate   # checks offline/CDN/size/readability constraints
npm run verify     # build + validate — single command for CI and local gating
npm run zip        # creates dist/submission.zip (35 MB limit)

# Serve the submission output independently (must not rely on source files):
npm run serve:submission
# then open http://localhost:8081/
```

Validation fails clearly if: `index.html` not at root, `/vendor` missing, `http(s)://` CDN references found, source-maps/minified output replaced readable code, referenced local files missing, ZIP exceeds 35 MB, or localhost/dev paths remain.

## Three.js Provenance

- Version: **0.160.0** (`three@0.160.0`)
- Source: `npm install three@0.160.0` then copied `node_modules/three/build/three.module.js` → `vendor/three.module.js`
- License: **MIT** — see `THIRD_PARTY_NOTICES.md` and `vendor/README.md` (license text at `vendor/three.module.js` header and `node_modules/three/LICENSE`)
- Runtime path: always `./vendor/three.module.js` via `<script type="importmap">` (relative, no CDN)

## Project Structure

```
/  
  index.html
  src/main.js                 # thin bootstrap — single rAF loop, no gameplay logic
  src/game/createScene.js
  src/game/createCamera.js     # CAMERA_CONFIG centralized here
  src/game/createRenderer.js
  styles/game.css
  vendor/three.module.js       # Three.js 0.160.0 (MIT, vendored)
  vendor/README.md
  THIRD_PARTY_NOTICES.md
  docs/GAME_DESIGN.md
  docs/HACKATHON_REQUIREMENTS.md
  docs/ARCHITECTURE.md
  docs/CURRENT_SLICE.md
  docs/BUILD_LOG.md
  docs/PLAYTEST_NOTES.md
  tools/build-submission.mjs   # esbuild, bundle src/main.js, external three, inline readable bundle
  tools/validate-submission.mjs
  tools/serve.mjs
  dist/submission/   # generated
```

## Agent Read Order

1. `AGENTS.md` — operating rules + permanent engineering principles
2. `docs/CURRENT_SLICE.md` — only implementation scope for the session
3. `docs/GAME_DESIGN.md` — stable design decisions
4. `docs/HACKATHON_REQUIREMENTS.md` — non-negotiable submission constraints
5. `docs/ARCHITECTURE.md` — intended lightweight architecture and data flow
6. Relevant source files only
