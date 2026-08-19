# Hackathon Requirements & Guardrails

> Hard constraints agents must not violate. Official source of truth: [Meta Horizon Creator Competition: Game Prototype on Devpost](https://mhcp-game-prototype.devpost.com/) — Devpost wins on conflicts.

## Hard Build Requirements

- Genuinely playable mobile game prototype created primarily with AI prompting
- Three.js / HTML5 web build
- Single-player only
- Portrait orientation and fixed phone viewport during play
- Self-contained and playable without external network requests (no CDN, no runtime fetch to external hosts)
- Submission package ≤ 35 MB, `index.html` at ZIP root
- All first-party game code readable and unminified in submitted `index.html`
- Third-party libraries (Three.js) in `/vendor` with relative paths
- All assets/audio/fonts/data shipped locally with relative paths
- Must have: primary repeatable action, real-time feedback, progression/escalation, clear success/failure/reset flow (future phases)
- Design Intent document required for final submission
- Markdown Build Log required, demonstrating AI did the heavy lifting — updated every AI session

## Chosen Genre

Survival & Resource Management

## Judging Priorities

- Player Engagement — 30%
- Playability — 25%
- Core Loop Design — 20%
- Focus — 15%
- Originality — 10%

Visual polish is *not* a scoring category — small, fun, reliable beats broad feature list.

## Implications

- Every phase must preserve a playable build
- Mobile testing begins in Phase 0, not near submission
- Build packaging/validation must exist from Phase 0
- Offline/no-CDN rule enforced by `npm run validate`
- Submission build must be servable independently of source (`npm run serve:submission`)

## Phase 0 Enforcement

- Three.js stored under `/vendor/three.module.js`, imported via relative importmap
- First-party JS/CSS inlined readable/unminified into submission `index.html`
- No React, game engine, ECS, physics engine, backend, database, cloud dependency
- No CDN imports, no runtime `https://`
- Portrait is primary target; landscape must not become a broken layout
