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
- Third-party libraries in `/vendor` with relative paths
- All assets/audio/fonts/data shipped locally with relative paths
- Must have a primary repeatable action, real-time feedback, progression/escalation, and a clear success/failure/reset flow
- Design Intent document required for final submission
- Markdown Build Log required, demonstrating AI did the heavy lifting — updated every AI implementation session

## Chosen Genre

Survival & Resource Management

## Judging Priorities

- **Player Engagement — 30%**: is it compelling; would the player keep going and come back?
- **Playability — 25%**: does it work, respond cleanly to input, run reliably, and complete the core loop?
- **Core Loop Design — 20%**: is the loop clear, coherent, and well constructed?
- **Focus — 15%**: is it a tight, contained experience where everything built pulls in the same direction?
- **Originality — 10%**: is it a fresh take within the chosen genre?

Devpost's guidance is explicit: **one mechanic/loop done well beats several partial mechanics**. Focus is about finish/coherence, not simply having a tiny feature count.

Visual polish is not directly scored, but **visual clarity is critical**. A judge must be able to distinguish the player, resources, Wildkin, danger, pickups, POIs/anchors, and relevant game state at a glance.

## Project-Specific Interpretation

The competition prototype should be judged as one complete short survival expedition, not as a checklist of survival-game systems.

Target loop:

**Camp → directed expedition → acquire unsecured value → see temptation ahead → EXTRACT or KEEP GOING → bank or lose the run → visible progress → replay.**

The project should optimize for:

- short-session engagement,
- reliable portrait touch play,
- clear risk/reward,
- understandable success/failure,
- a coherent directed frontier rather than open-world sprawl,
- Wildkin as high-value utility/collection rather than just enemy reskins,
- strong replay motivation from major Waypoints, gated revisits, companions, and small deliberate progression.

## Scope Guardrails

Do not add breadth merely because the system could exist in a future survival game.

Before adding a feature, ask whether it improves one or more scored areas for the current short expedition.

Especially defer unless already proven useful:

- large seamless open world,
- procedural generation,
- complex crafting tree,
- large base simulation,
- many Wildkin species,
- broad skill/equipment systems,
- full Matter Resonator minigame,
- multiplayer/backend/accounts,
- elaborate cosmetics/customization.

## Continuous Enforcement

- Every phase preserves a playable build
- Mobile testing starts early and continues throughout
- Packaging/validation remains green throughout development
- Offline/no-CDN rule enforced by validation
- Submission build remains independently servable
- `CURRENT_SLICE.md` is the only implementation scope
- Human playtest results override speculative feature plans
- Build Log records AI implementation work as it happens

## Submission / Timing

Devpost reminder received August 2026 states submissions close **September 8, 2026 at 1:00 PM PT**. Submit early enough to leave room for final validation/refinement.

## Technical Enforcement

- Three.js stored under `/vendor/three.module.js`, imported locally
- Rapier stored locally under `/vendor`
- First-party JS/CSS assembled readable/unminified into submission `index.html`
- No runtime `https://` dependencies
- Portrait is the primary target; landscape must not become a broken layout
- One authoritative rAF/fixed-step game loop
- Performance work should bound active simulation rather than prematurely add heavyweight frameworks
