# Meta Horizon Game Prototype — Game Design & Build Plan

## Purpose

This is the living planning document for the hackathon prototype. It defines the current game direction, hard competition constraints, agent workflow, and phased implementation plan. The repository should contain concise Markdown mirrors of the stable sections so coding agents never need the Google Doc open to work safely.

# 1\. Basic Game Design Document

## Working Concept

Working title: TBD  
Genre: Survival & Resource Management  
Format: Single-player, portrait mobile web game  
Presentation: 3D Three.js world with a fixed high third-person camera, close to top-down.

## High Concept

A run-based wilderness expedition game built around player agency. Before each run, the player prepares a loadout, chooses a companion, and chooses where to enter the frontier. During the run they explore, harvest resources, gain XP, fight wild creatures, capture new Wildkin, discover waystones, and decide when to secure their haul versus pushing deeper into increasing danger.

The player is expected to die sometimes. A run should create real tension without erasing all long-term progress.

## Player Fantasy

“I prepare for an expedition, enter a dangerous wild frontier, make my own route, find valuable resources and creatures, decide how far I dare to push, then return stronger and better prepared for the next run.”

## Design Pillars

\- Player agency over rails. The world presents opportunities and danger; it should rarely tell the player one mandatory next step.  
\- Satisfying moment-to-moment play. Movement, harvesting, combat, pickups, capture, and companion behavior must feel good before meta-progression is added.  
\- Meaningful persistent progression. The player sees the skill tree and deliberately spends earned points. Avoid random three-choice level-ups.  
\- Risk creates stories. Newly collected loot and newly captured Wildkin matter because pushing farther can put them at risk.  
\- Collection with utility. Wildkin are not just a checklist; different companions should meaningfully change a run or loadout.  
\- Compact depth. Prefer a small set of interacting systems over a large amount of shallow content.

## Core Loop

PREPARE  
Choose starting point / waystone, active Wildkin, equipment, consumables, and skill configuration.

EXPEDITION  
Explore → harvest → fight → gain XP → capture Wildkin → find better resources → discover landmarks and waystones.

RISK DECISION  
Secure what has been found or push farther for rarer rewards and greater danger.

OUTCOME  
Extract / return safely and bank the run’s gains, or die and lose the unsecured expedition cargo.

PROGRESS  
Spend skill points, invest banked resources in upgrades/base structures or Matter Resonator attempts, organize the Wildkin collection, adjust the loadout, and choose the next expedition.

## Persistent Progression

Permanent progress should include:  
\- Earned skill points and unlocked skill-tree nodes.  
\- Secured Wildkin.  
\- Discovered regions and activated waystones.  
\- Unlocked equipment / recipes / loadout options.  
\- Important permanent world discoveries.

## At-Risk Run Progress

Until secured, a run can put these at risk:  
\- Harvested resources.  
\- Rare materials.  
\- Newly captured Wildkin.  
\- Run consumables or special finds.

Default design rule: dying should hurt enough to create tension, but should not erase the player’s underlying character progression.

## Skill Tree

The player should be able to inspect the whole tree and spend points intentionally. Initial branches:  
\- Combat: damage, attack patterns, survivability, mobility.  
\- Harvesting: speed, yield, rare finds, tool capability.  
\- Survival: health, recovery, carrying capacity, extraction safety.  
\- Bonding: capture/bonding effectiveness, companion strength, companion utility.

The prototype only needs a small tree, but it should demonstrate branching and build choice rather than linear upgrades.

## Wildkin

Wildkin are wild creatures encountered during expeditions. The exact capture mechanic is still open, but it should be more interactive than simply reducing health and throwing a generic capture object.

Prototype Wildkin goals:  
\- Each Wildkin is readable at a glance.  
\- Each has a clear field behavior or combat role.  
\- The player chooses one active companion before a run.  
\- A newly captured Wildkin is unsecured until the player successfully banks/extracts it.  
\- Losing an unsecured Wildkin should not permanently delete a unique creature from the world; it can return to its habitat.

## Waystones

Waystones are discoverable progression anchors, not automatic linear checkpoints.

Activating a waystone can:  
\- Permanently unlock it as a future starting location.  
\- Provide a place to secure resources / newly captured Wildkin.  
\- Potentially heal or replenish a limited resource.  
\- Mark tangible penetration into a more dangerous part of the world.

Starting farther forward should have a tradeoff: the player reaches rare content sooner, but skips early gathering, XP, and preparation opportunities.

## Base, Resource Economy & Long-Term Home

The base is the player's persistent home between expeditions. Returning safely should not only preserve numbers; it should let the player visibly change the home, improve future runs, and see the Wildkin they have secured.

## Resource Spending

Banked resources should support multiple meaningful choices rather than existing only to sell for XP:  
\- Reliable progression: known player, tool, equipment, or Wildkin upgrades.  
\- Base development: structures, stations, storage, utility, and eventually decoration.  
\- Matter Resonator attempts: spend/deposit materials for a chance at a new discovery.  
The same resource being useful in more than one place is desirable because it creates real tradeoffs: build now, buy a known upgrade, or spend it on discovery.

## Base Building & Placeables

Long-term vision: Forager-like free placement of useful structures and crafting/processing stations, with a base that becomes more personal and capable over time.  
Prototype scope should stay small:  
\- Allow a few freely placeable structures on valid base ground.  
\- Placement should be fast and readable on mobile: preview, valid/invalid state, confirm/cancel.  
\- Structures should have obvious utility rather than existing only as decoration.  
\- Building consumes banked resources and permanently changes the base.  
The prototype does not need a large crafting tree or construction simulation; it only needs enough placeability to prove the fantasy.

## Base Wildkin

Secured Wildkin should exist physically at the base rather than only in a collection menu.  
\- Secured Wildkin can wander/idly inhabit the home area.  
\- The collection should become visually legible as the base gains more Wildkin.  
\- The active expedition companion is selected from secured Wildkin before a run.  
\- Future-state systems may allow Wildkin to work at structures, gather, craft, defend, or provide passive utility.  
For the prototype, simple roaming and selection are enough to make successful captures visibly meaningful.

## Matter Resonator

The Matter Resonator is a persistent base machine that turns expedition materials into discovery attempts. The player deposits a required amount or recipe of materials to earn one Resonance attempt.

A Resonance attempt should not be a pure button-press loot-box roll. The player performs a short, skill-influenced kickoff mechanic that changes the probability or path of the outcome while preserving surprise. The exact mechanic is deliberately open until prototyping. Good directions include aiming an energy pulse, choosing launch direction/power, timing a release, routing energy through targets, or another brief physics/arcade interaction.

Possible Resonator rewards should unlock possibilities rather than mostly provide tiny percentage increases:  
\- Equipment or tool blueprints.  
\- New structure blueprints.  
\- Relics/charms that noticeably alter play.  
\- Rare utility items or consumables.  
\- Base objects/cosmetics.  
\- Map or frontier discoveries.

Resonator guardrails:  
\- No real-money or premium-currency framing.  
\- Reliable progression must also exist outside the Resonator.  
\- Prefer a shuffled/non-repeating discovery pool or strong duplicate protection so attempts feel exciting rather than wasteful.  
\- Spending materials on the Resonator should compete with other useful resource sinks.  
\- The skill component should influence the result without making every outcome deterministic.

## 

## World & Difficulty

Danger should primarily be spatial rather than timer-driven. The farther the player pushes from safety:  
\- Enemies become stronger or more complex.  
\- Resources become more valuable.  
\- Rare Wildkin become possible.  
\- Environmental hazards increase.  
\- Extraction becomes more consequential.

This lets the player choose their own difficulty by choosing how far to push.

## Prototype Session Goal

The prototype should support both success and failure. A successful run is one where the player secures meaningful progress and returns/extracts; death is the failure state. Deeper waystones and rarer discoveries provide escalating objectives. A final prototype milestone may add one clear “deep frontier” objective if playtesting shows the session needs a stronger endpoint.

## Camera & Controls

\- Fixed high third-person / near top-down camera.  
\- Portrait-first composition.  
\- One-thumb movement should be possible.  
\- Avoid camera rotation during normal play.  
\- Keep interaction buttons large and contextual.  
\- Combat and harvesting should minimize tiny precision targets.

## Prototype Non-Goals

Do not build these unless the core loop is already strong:  
\- Large open world.  
\- Multiplayer.  
\- Large or complex base-building simulation before the core expedition loop is proven.  
\- Dozens of Wildkin.  
\- Complex crafting trees.  
\- Procedural world generation.  
\- Story campaign / quest chains.  
\- Monetization systems.  
\- Online accounts or backend services.  
\- Elaborate character customization.

## Open Design Questions

\- Exact combat input model: auto-target \+ attack, aim direction, tap-to-attack, or hybrid.  
\- Exact Wildkin capture/bonding mechanic.  
\- Whether XP earned during a failed run is fully retained, partially retained, or only converted to permanent skill points after extraction.  
\- Whether waystone banking is unlimited or has a cost/cooldown.  
\- Whether the prototype ends at a final objective or emphasizes score/depth plus extraction.  
\- Exact Matter Resonator kickoff/minigame: aiming, timing, trajectory, routing, physics, or another skill-influenced interaction.  
\- Exact resource costs and how strongly building, known upgrades, and Resonator attempts should compete.  
\- How much free-placement base building belongs in the competition prototype versus the future-state game.

# 2\. Hackathon Requirements & Design Guardrails

## Official Source of Truth

[Meta Horizon Creator Competition: Game Prototype on Devpost.](https://mhcp-game-prototype.devpost.com/) If this document conflicts with the official rules, Devpost wins.

## Hard Build Requirements

\- Build must be a genuinely playable mobile game prototype created primarily with AI prompting.  
\- Three.js / HTML5 web build.  
\- Single-player only.  
\- Portrait orientation and fixed phone viewport during play.  
\- Self-contained and playable without external network requests.  
\- Submission package no larger than 35 MB.  
\- index.html at the root of the submission ZIP.  
\- All first-party game code must be readable and unminified in index.html for the submitted build.  
\- Third-party libraries such as Three.js belong in /vendor and use relative paths.  
\- Assets, audio, fonts, and data must ship locally and use relative paths.  
\- The game must have a primary repeatable action, real-time feedback, progression/escalation, and a clear success/failure/reset flow.  
\- A Design Intent document is required for submission.  
\- A Markdown Build Log is required and should demonstrate that AI did the heavy lifting.

## Chosen Competition Genre

Survival & Resource Management.

## Judging Priorities

\- Player Engagement — 30%.  
\- Playability — 25%.  
\- Core Loop Design — 20%.  
\- Focus — 15%.  
\- Originality — 10%.  
Visual polish is intentionally not a scoring category.

## Implications for This Project

\- A small game that is fun and reliable beats a broad feature list.  
\- The first milestone is not “systems complete”; it is “fun to move, harvest, fight, risk something, and restart.”  
\- Every phase must preserve a playable build.  
\- Mobile testing begins immediately, not near submission.  
\- Build packaging/validation should exist from the first phase so compliance cannot become an end-of-project surprise.  
\- The Build Log is part of normal agent work, not a document reconstructed at the end.

# 3\. Agent-Friendly Repository Structure

Recommended initial structure:

/  
  AGENTS.md  
  README.md  
  index.html  
  src/  
    main.js  
    game/  
    systems/  
    ui/  
  styles/  
    game.css  
  assets/  
  vendor/  
    three.module.js  
  docs/  
    GAME\_DESIGN.md  
    HACKATHON\_REQUIREMENTS.md  
    BUILD\_LOG.md  
    CURRENT\_SLICE.md  
    PLAYTEST\_NOTES.md  
  tools/  
    build-submission.mjs  
    validate-submission.mjs  
  dist/

Development may use modular source files. The submission build process should assemble all first-party JavaScript and CSS into a readable, unminified root index.html, keep Three.js in /vendor, copy local assets, and produce/validate the final ZIP layout.

## Agent Read Order

Every implementation agent should read, in order:  
1\. AGENTS.md — operating rules and guardrails.  
2\. docs/CURRENT\_SLICE.md — the only implementation scope for the current session.  
3\. docs/GAME\_DESIGN.md — stable design context relevant to gameplay decisions.  
4\. docs/HACKATHON\_REQUIREMENTS.md — non-negotiable technical/submission constraints.  
5\. Relevant source files only.

AGENTS.md should stay short. It should tell the agent:  
\- Preserve portrait/mobile/offline submission constraints.  
\- Do not expand scope beyond CURRENT\_SLICE.md.  
\- Keep the game playable at the end of the session.  
\- Prefer simple, explicit systems over framework-heavy architecture.  
\- Run validation/tests before stopping.  
\- Append a concise BUILD\_LOG entry describing prompt/tool/model, decisions, changes, testing, and remaining issues.  
\- Never silently change locked game-design decisions; record a proposed change instead.

README.md should answer only:  
\- What the project is.  
\- How to run it locally.  
\- How to test it on a phone.  
\- How to build and validate the submission package.  
\- Where agents should start reading.

# 4\. Recommended Build Workflow

Use a Human → Agent → Human loop, not long autonomous mega-sprints.

## A. Plan the Next Slice

We define one player-visible outcome and its acceptance criteria. CURRENT\_SLICE.md should normally fit on one screen.

## B. Agent Implementation

Give the agent the slice as a bounded goal. It may inspect relevant code, implement, self-test, update documentation, and stop when acceptance criteria are satisfied or it finds a real blocker.

## C. Automated Gate

Before the agent stops:  
\- Game launches.  
\- No console-breaking errors.  
\- Existing smoke tests / validation pass.  
\- Portrait viewport still works.  
\- Offline/no-CDN rule remains intact.  
\- Submission build can still be generated.

## D. Human Playtest

Play the slice on desktop briefly, then on an actual phone. Focus on feel and comprehension rather than code quality.

## E. Review

Record observations in PLAYTEST\_NOTES.md using:  
\- What felt good.  
\- What was confusing.  
\- What felt slow/repetitive.  
\- Bugs.  
\- One or two highest-value changes.

## F. Refinement Pass

Give a second agent session only the review items accepted for this slice. Do not mix the next feature into the refinement session.

## G. Lock & Move On

When the slice feels good enough:  
\- Commit/tag the working state.  
\- Update BUILD\_LOG.md.  
\- Mark CURRENT\_SLICE.md complete.  
\- Create the next slice spec.

## Recommended Model Usage

Use stronger models for architecture, difficult bugs, cross-system changes, or reviewing a slice. Use cheaper/free models for scoped implementation, tests, cleanup, data/config, and obvious fixes. The quality of CURRENT\_SLICE.md is what lets cheaper models remain useful.

# 5\. Phased Implementation Plan

## Phase 0 — Compliant Foundation

Player-visible goal: a portrait Three.js scene opens reliably on desktop and phone.

Agent deliverables:  
\- Initialize repository.  
\- Add AGENTS.md, README.md, GAME\_DESIGN.md, HACKATHON\_REQUIREMENTS.md, BUILD\_LOG.md, CURRENT\_SLICE.md, PLAYTEST\_NOTES.md.  
\- Vendor Three.js locally.  
\- Create minimal Three.js scene with fixed high-angle camera.  
\- Add simple responsive portrait HUD shell.  
\- Add local dev server command.  
\- Add submission build and validation scripts.  
\- Confirm no CDN/network dependency at runtime.

Acceptance gate:  
\- Opens from local server.  
\- Works in a phone browser.  
\- Submission build is self-contained and validation passes.  
\- Build Log contains the first session entry.

## Phase 1 — Movement & World Feel

Player-visible goal: controlling the character in a tiny 3D frontier already feels pleasant.

Build:  
\- Player representation.  
\- One-thumb movement.  
\- Fixed high-angle follow camera.  
\- Small handcrafted/procedural test environment.  
\- Collision/bounds.  
\- Basic animation/feedback using simple geometry.  
\- Mobile-safe pause/restart/debug controls.

Human test:  
Movement responsiveness, camera framing, thumb comfort, portrait readability, performance.

## Phase 2 — Harvesting Loop

Player-visible goal: the player can explore the test space, find resources, harvest them, and enjoy the feedback.

Build:  
\- 2–3 resource node types.  
\- Contextual/automatic harvest interaction.  
\- Harvest timing.  
\- Drops/pickups.  
\- Temporary run inventory.  
\- Respawn or finite placement appropriate to the test map.  
\- Sound/particles/screenspace feedback using local assets or procedural effects.

Human test:  
Is gathering satisfying by itself? Is it clear what can be harvested? Does resource collection invite movement/exploration?

## Phase 3 — Combat, Wild Creatures & Death

Player-visible goal: the frontier becomes dangerous and the player can fight, take damage, die, and restart.

Build:  
\- One simple combat input model.  
\- 1–2 wild hostile creature behaviors.  
\- Health/damage/knockback.  
\- Creature drops / XP.  
\- Death state.  
\- Fast restart.  
\- Spatial difficulty gradient in the small map.

Human test:  
Can combat be understood without instructions? Does danger feel fair? Is dying quick enough to make “one more run” appealing?

## Phase 4 — First Complete Expedition Loop

Player-visible goal: the game now has an ugly but complete run: prepare → enter → gather/fight → decide to return or push → extract or die → restart.

Build:  
\- Small base/safe area.  
\- Extraction/banking interaction.  
\- Secured versus unsecured inventory.  
\- Run summary.  
\- Death loses unsecured cargo.  
\- Successful extraction banks cargo.  
\- Banked resources have at least one reliable spend at base.  
\- The player can place at least one simple useful structure using resources.  
\- Returning home visibly changes something before the next run.  
\- Immediate next-run flow.

This is the first major milestone. Do not proceed until the loop is understandable and at least somewhat enjoyable.

## Phase 5 — Persistent Progression, Base & Loadout

Player-visible goal: each completed/failed expedition contributes to deliberate character building.

Build:  
\- Persistent save data stored locally.  
\- XP / skill point rules.  
\- Small visible skill tree with 3–4 branches.  
\- Intentional point spending.  
\- Base loadout screen.  
\- Expand to 2–4 useful placeable base structures if the Phase 4 placement test feels good.  
\- Known resource purchases/upgrades that compete with saving/building.  
\- Matter Resonator prototype: deposit materials to earn a Resonance attempt.  
\- Prototype one short skill-influenced Resonator activation mechanic and a small duplicate-protected discovery pool.  
\- At least a few upgrades that noticeably change play rather than only changing small percentages.  
\- Respec/tuning support during development if useful.

Human test:  
Can the player form a plan for the next run? Do skill choices create different play rather than just bigger numbers?

## Phase 6 — Wildkin Capture & Companion Loadout

Player-visible goal: encountering and securing a new Wildkin creates a memorable reason to survive the trip home.

Build:  
\- Finalize one simple original capture/bonding mechanic.  
\- 2–3 prototype Wildkin species.  
\- Newly captured Wildkin is unsecured until banked.  
\- Secured Wildkin collection at base.  
\- Secured Wildkin physically wander/idly inhabit the base so the collection is visible in-world.  
\- Choose one active Wildkin for a run.  
\- Each Wildkin has one clearly distinct useful behavior.  
\- Lost unsecured Wildkin return to their habitat.

Human test:  
Does capturing create emotional tension? Does changing active Wildkin meaningfully change a run? Is the capture mechanic readable on mobile?

## Phase 7 — Waystones & Player-Directed Depth

Player-visible goal: the player discovers a waystone, secures it permanently, and can choose to start future runs deeper in the frontier.

Build:  
\- 2 discoverable waystones.  
\- Activation as permanent progression.  
\- Banking/limited recovery behavior.  
\- Start-location selection before a run.  
\- Tradeoff for starting deeper: skip early resources/XP but reach rare content faster.  
\- Distinct danger/resource bands around deeper areas.

Human test:  
Does choosing a start point feel strategic rather than strictly better? Does the player naturally create their own short-term goals?

## Phase 8 — Competition Vertical Slice

Player-visible goal: one cohesive prototype demonstrates the complete intended fantasy without relying on future promises.

Target content, adjusted by playtesting:  
\- 1 compact connected world.  
\- 3 resource types.  
\- 3–4 wild creature/enemy types.  
\- 3 Wildkin with distinct utility and visible base presence.  
\- 2–4 useful placeable base structures.  
\- Matter Resonator with a small discovery pool and a brief skill-influenced activation mechanic.  
\- 2 waystones plus base.  
\- Small branching skill tree.  
\- Several equipment/loadout choices.  
\- Clear extraction success, death failure, restart, and depth/progression feedback.  
\- One deeper aspirational objective or rare discovery if needed to strengthen session direction.

Do not add content solely to hit counts. Remove anything that does not improve engagement, playability, core loop, focus, or originality.

## Phase 9 — Feel, Balance & Mobile Hardening

Focus only on:  
\- Input responsiveness.  
\- Combat/harvest timing.  
\- Camera readability.  
\- Run pacing.  
\- Reward frequency.  
\- Risk/reward clarity.  
\- Skill/Wildkin differentiation.  
\- Loading/performance.  
\- Phone aspect ratios.  
\- Audio/visual feedback.  
\- Tutorialization through environment/UI rather than long text.

Run repeated short playtests. Track only issues that materially affect the judging criteria.

## Phase 10 — Submission Hardening

\- Freeze feature scope.  
\- Run offline/network validation.  
\- Build final readable/unminified index.html.  
\- Verify /vendor and all relative asset references.  
\- Confirm ZIP structure and size.  
\- Fresh-device/browser playthrough from start to extraction and start to death.  
\- Clean Build Log.  
\- Prepare final Design Intent document from the proven game, not from aspirational features.  
\- Preserve a final tagged/committed submission state.

# 6\. Definition of Done for Every Slice

A slice is done only when:  
\- The player-visible outcome exists.  
\- It works on phone.  
\- Existing gameplay still works.  
\- No known game-breaking console/runtime errors remain.  
\- Hackathon packaging constraints are still satisfied.  
\- The agent updated BUILD\_LOG.md.  
\- The human playtested it.  
\- Accepted refinement notes were either completed or explicitly deferred.

# 7\. Immediate Next Actions

1\. Lock or revise the design decisions in Sections 1–2.  
2\. Create a new local repository.  
3\. Create the Phase 0 CURRENT\_SLICE.md.  
4\. Configure the chosen coding agent/model.  
5\. Run Phase 0 only.  
6\. Test the resulting scene on the target phone.  
7\. Review/refine Phase 0 before asking an agent for harvesting or combat.

The project should earn complexity. Every new system must justify itself by improving the playable loop.  
