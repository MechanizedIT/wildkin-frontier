# Frontier — Meta Horizon Game Prototype (Phase 0)

Single-player, portrait-mobile, Three.js/HTML5 survival & resource management prototype. Phase 0 is a compliant foundation only: a minimal 3D scene with a fixed high third-person camera, placeholder island and player marker, and a reproducible offline submission build. No gameplay systems yet.

## Prerequisites

- Node.js 18+ (tested with 22.17.1) and npm
- A modern desktop browser and a phone on the same Wi-Fi for device testing
- No CDN or runtime network required — Three.js is vendored at `vendor/three.module.js`

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
4. Optional offline check: load once, then enable airplane mode and reload from the already-loaded tab — dev build should still have its assets if cached, submission build must be fully offline

To find your IP manually: `ipconfig` (Windows) / `ifconfig` or `ip addr` (macOS/Linux).

## Submission Build & Validation

```sh
npm run build      # creates dist/submission/ with index.html at root, inlined readable JS/CSS, vendor/
npm run validate   # checks offline/CDN/size/readability constraints
npm run zip        # creates dist/submission.zip (35 MB limit)

# Serve the submission output independently (must not rely on source files):
npm run serve:submission
# then open http://localhost:8081/
```

Validation fails clearly if: `index.html` not at root, `/vendor` missing, `http(s)://` CDN references found, source-maps/minified output replaced readable code, referenced local files missing, ZIP exceeds 35 MB, or localhost/dev paths remain.

## Project Structure

```
/
  index.html
  src/main.js
  src/game/createScene.js
  src/game/createCamera.js
  src/game/createRenderer.js
  styles/game.css
  vendor/three.module.js
  docs/GAME_DESIGN.md
  docs/HACKATHON_REQUIREMENTS.md
  docs/CURRENT_SLICE.md
  docs/BUILD_LOG.md
  docs/PLAYTEST_NOTES.md
  tools/build-submission.mjs
  tools/validate-submission.mjs
  tools/serve.mjs
  dist/submission/   # generated
```

## Agent Read Order

1. `AGENTS.md` — operating rules
2. `docs/CURRENT_SLICE.md` — only implementation scope for the session
3. `docs/GAME_DESIGN.md` — stable design decisions
4. `docs/HACKATHON_REQUIREMENTS.md` — non-negotiable submission constraints
5. Relevant source files only
