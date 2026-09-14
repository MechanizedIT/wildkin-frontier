---
name: habitat-development
description: Design, implement, review, and hand off one Wildkin Frontier habitat or regional improvement using actual gameplay baselines, a habitat packet, bounded Dream Loop rounds, ecological placement rules, mobile readability, and measured performance.
---

# Habitat development

Use this project-local skill when a task changes the terrain, composition, flora, resources, landmarks, routes, encounters, lighting, or recognizable identity of one Wildkin Frontier habitat. It specializes the general Dream Loop. It is not permission to expand every region, add unrelated systems, or spend an entire unattended session polishing one place.

Read `AGENTS.md`, `docs/SESSION_START.md`, `docs/CURRENT_SLICE.md`, the latest handoff, and the habitat packet before production. For Rootbound Wildwood, read `docs/habitats/rootbound-wildwood/PACKET.md`.

## The habitat contract

Before editing, state these in one compact packet or confirm the existing packet:

1. **Fantasy:** one sentence describing what the place should feel like.
2. **Player purpose:** why an explorer enters, what decision or risk occurs, and what can be brought home.
3. **Macro identity:** the distant silhouette, major landform, and hero landmark.
4. **Meso structure:** at least three local terrain forms and three spatial subzones with different density, visibility, and traversal.
5. **Micro ecology:** clustered flora/resource/creature rules tied to terrain, moisture, shelter, exposure, deadwood, stone, or another readable cause.
6. **Route logic:** a safe/readable path, a richer or riskier alternative, and at least one return cue or persistent shortcut when the slice calls for it.
7. **Transition:** how the habitat begins and ends without becoming a uniform color blend.
8. **Mobile composition:** what remains readable in the central play area under the portrait HUD.
9. **Budget:** existing resident, mesh, collider, streaming, save-ID, and phone-performance ceilings.
10. **Non-goals:** systems and neighboring regions that must remain untouched.

A habitat is not finished because it has a name, palette, or uniformly scattered prop set. It should remain recognizable with the UI hidden and should support one useful normal-input outing.

## Baseline first

Capture the actual current game before making a target:

- one repeatable overhead or inspector view covering the selected bounds;
- three ordinary portrait views: arrival, interior traversal, and destination/landmark;
- one short route with travel time, visible blockers, resource/creature interactions, and the worst observed streaming hitch;
- current terrain, scenery, forage, wildlife, collision, and save owners from `docs/CODE_MAP.md`.

Use the same locations, camera class, weather/lighting state, and seed for comparisons. A generated concept image cannot prove that the real camera, collision, or asset kit can achieve it.

## Build the target

Use Dream Loop only when appearance, composition, silhouette, or normal-play readability is the principal uncertainty.

The target must show or specify:

- terrain massing before decorative density;
- open, medium, and dense patches rather than even scatter;
- foreground, midground, and background scale bands;
- one large landmark, two medium landmark families, and smaller ecological details;
- readable negative space and sightline corridors;
- a plausible implementation with the admitted kit or a short explicit asset list;
- the normal portrait camera, not only a cinematic overview.

Check physical feasibility before production: climb limits, support samples, player clearance, companion access, collider cost, camera far plane, and loaded-neighborhood bounds.

## Bounded habitat loop

Default to **two implementation rounds**. A third round is allowed only for a hero surface when the repair changes structure rather than merely color, scale, or density.

### Round 0 — contract and structural plan

- Freeze bounds and protected content.
- Identify one primary risk: terrain topology, composition, ecology, readability, or performance.
- Assign one writer per file/domain.
- Lock the baseline and scorecard.
- Prefer one representative route over whole-region coverage.

### Round 1 — structural implementation

Prioritize in this order:

1. terrain shape and navigable negative space;
2. landmark placement and route hierarchy;
3. clustered ecological recipes;
4. resources/creatures tied to readable causes;
5. lighting, palette, and small decoration.

Integrate early enough to walk the route before multiplying variants.

### Review 1 — independent habitat judge

A reviewer who did not implement the pass receives raw baseline/current images, the packet, normal-play route, and exact bounds. Return:

- the three most consequential gaps;
- scores for the habitat axes below;
- PASS, HOLD, or REJECT;
- one consolidated repair packet.

Do not reward effort, test count, or generated target beauty. Judge the actual game.

### Round 2 — focused repair

Repair the three consequential gaps only. Rerun invalidated proof, not every prior check. If the same structural gap remains after two rounds, stop that method. Preserve an honest HOLD and move to another batch or redesign the terrain/asset approach.

### Play and checkpoint

Complete one ordinary-input story: enter, choose a route, interact with the habitat's useful content, return or reach a clear stopping point, and literal-reload the changed persistent state. Run focused tests during work and the repository aggregate/package gate once at the integrated checkpoint.

## Habitat scorecard

Score each axis from 0–10 and include a short reason:

1. **Silhouette identity** — recognizable at distance and distinct from neighboring habitats.
2. **Terrain and vertical shape** — local relief creates rooms, routes, exposure, shelter, or traversal choices.
3. **Patch composition** — convincing clusters, gaps, gradients, and co-occurrence instead of even scatter.
4. **Landmark and navigation readability** — destinations and return cues are visible at portrait scale.
5. **Ecological logic** — plants, resources, and Wildkin appear for readable environmental reasons.
6. **Traversal and danger** — movement choices, clearance, risk, and reward form a useful outing.
7. **Mobile visual hierarchy** — the player, interactables, threats, and route remain legible under the HUD.
8. **Performance and lifecycle** — bounded residents, stable IDs, streaming, collision, save/reload, and package behavior.

Project visual admission normally requires **8/10 overall**, no critical axis below **6.5**, and no correctness blocker. A lower-scoring result may remain a documented HOLD or a provisional owner-delegated candidate; do not relabel it as accepted.

## World-building rules

- Use terrain and negative space to create structure before adding more instances.
- Prefer clustered distributions, exclusion zones, edge rules, and co-occurrence recipes over uniform random placement.
- Use at least four scale bands: ground detail, low/mid vegetation, large anchors, and rare hero forms.
- Let one asset family dominate a patch; do not mix every species everywhere.
- Keep open spaces intentional. Density contrast makes dense areas feel dense.
- Tie valuable resources and Wildkin to readable habitat signals.
- Preserve sightlines through dense zones; a player should usually see either a landmark, a route cue, or a meaningful nearby interaction.
- Distinguish a habitat through terrain, silhouette, traversal, ecology, and play—not only hue.
- Prefer replacement and composition improvements over simply raising global caps.
- Check the route from the actual phone framing. Avoid placing critical cues permanently under the upper-left objective card, lower-left joystick, or lower-right actions.
- Use authored hero landforms and landmarks where composition matters; use seeded recipes for local natural variation.

## Trellis and Blender

Trellis/Blender are useful for **ingredients**, not for replacing the runtime world system.

Use them for:

- hero trees, root arches, fallen trunks, fungal clusters, mineral formations, and other reusable landmark/prop kits;
- silhouette studies and low-poly source assets;
- terrain stamps or control meshes only when the runtime can consume them without breaking shared height/collision ownership.

Do not build the complete streamed continent as a monolithic Blender scene. Runtime terrain, placement semantics, collision, ecology, streaming, and traversal stay in the game. Route any generated asset through `.agents/skills/wildkin-asset-forge/SKILL.md`. Serialize heavy GPU work and never run two TRELLIS jobs concurrently on the laptop.

## Overnight use

A long-running orchestrator may work on this habitat for at most:

- one structural pass;
- one focused repair pass;
- one independent review after each meaningful pass.

Then it must checkpoint and move to another authorized lane or stop. It may not spend the whole unattended session nudging one habitat toward a score. See `.agents/skills/overnight-orchestrator/SKILL.md`.

## Required handoff

Leave:

- exact bounds/seed and protected content;
- baseline and current captures from matching views;
- scorecard and reviewer findings;
- ordinary-input route and persistence result;
- focused and aggregate checks actually run;
- current PASS/HOLD status;
- the next structural change, not a generic “add polish” note.
