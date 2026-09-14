# Wildkin Frontier — bounded overnight production

This document defines how one unattended Codex session can make useful progress without spending the whole night on one visual problem or allowing several agents to collide in the same codebase.

## Current product order

1. **Exploration and habitat quality**
2. **Collecting distinct Wildkin**
3. **Base building, crafting, care, breeding, and deeper production**

The first early alpha is one large finite continent. Other continents can be added later through boats or another deliberate transition; do not design the current runtime around an infinite-world promise.

## One root session, several lanes

Use one primary Codex session as the orchestrator for this repository/worktree. Let it spawn bounded subagents with explicit ownership.

Do not run two independent long-running root sessions that both write to `main` in the same worktree. The project currently commits directly to `main`, so two root writers would race on files, Git state, tests, browsers, and current-scope documents.

Project `.codex/config.toml` raises the spawned-thread ceiling to six. This excludes the primary thread, but available capacity may still depend on the client/account/session. The orchestrator must degrade gracefully.

Operating limit:

- maximum three write-capable agents at once;
- at least one independent reviewer;
- one writer per shared file/domain;
- one heavy TRELLIS/Blender/GPU job at a time;
- root owns integration, commits, aggregate gates, and authoritative docs.

## Overnight queue

An unattended run contains no more than three integrated batches.

### Batch A — primary habitat

Use the [habitat skill](../.agents/skills/habitat-development/SKILL.md) and one approved packet.

For the first trial:

- [Rootbound Wildwood packet](habitats/rootbound-wildwood/PACKET.md)
- one repeatable 3–5 minute circuit;
- one structural pass and one focused repair;
- matching overhead and portrait captures;
- one independent habitat scorecard;
- checkpoint even when the result remains HOLD.

The objective is not to finish the entire habitat. It is to prove that terrain, negative space, patch composition, landmarks, ecology, and mobile readability improve together.

### Batch B — one habitat-native Wildkin

Use the [species skill](../.agents/skills/wildkin-species-development/SKILL.md).

The batch may finish at one of these honest levels:

1. species card and selected concept;
2. approved reference;
3. TRELLIS/Blender GLB candidate;
4. behavior/taming/utility prototype using a placeholder;
5. integrated discover → bond → return → use → reload journey.

Do not force all five levels. A clear candidate plus review is useful progress.

For Rootbound, prefer a role that does not duplicate Mossling’s healing/grove use, Tidefin’s short protection, or Emberhorn’s breaking/combat role. The species should make dense exploration, ecological reading, or route discovery different.

### Batch C — optional enabling work

Start only after A or B reaches a coherent checkpoint.

Good choices:

- measured scenery/streaming improvement on the actual Rootbound route;
- a reusable habitat inspector or patch-composition diagnostic;
- one targeted flora/resource asset needed by the packet;
- a small gameplay contract needed for the chosen Wildkin;
- compact documentation/receipt closure.

Bad choices:

- a new headline system;
- another whole habitat;
- broad genetics, weather, caves, or factory systems;
- unmeasured architecture replacement;
- cosmetic loops on a held result.

## World-building program

Each of the ten habitat records should advance through these states:

1. **Allocated** — region exists on the continent.
2. **Packeted** — fantasy, terrain grammar, subzones, route, ecology, transition, budget, and target visuals exist.
3. **Structural blockout** — real terrain/routes/landmarks are walkable.
4. **Useful outing** — one normal-input reason to enter and return.
5. **Visual/ecological pass** — clustered composition and distinct signals.
6. **Persistence/performance proof** — save, streaming, package, and mobile checks.
7. **Owner review** — accepted, held, or redirected.

Do not treat all ten regions as one overnight queue. Finish representative quality and reusable tools first.

## Wildkin deck program

Maintain one card per species candidate:

- habitat niche;
- silhouette/body plan;
- temperament;
- bonding mechanic;
- exploration utility;
- Camp value;
- individual traits actually expressible;
- required model/rig/animation;
- implementation/admission status.

Species should be developed in families only when a shared body/rig actually saves work without making them feel like reskins. The roster target remains staged; early alpha quality matters more than hitting a count.

Suggested status labels:

- `concept`
- `reference-review`
- `model-candidate`
- `motion-candidate`
- `gameplay-prototype`
- `integrated-hold`
- `admitted`

## Asset production program

Trellis 2 and Blender should build reusable ingredients:

- Wildkin meshes;
- flora families;
- resource formations;
- hero trees, root arches, logs, ruins, and landmarks;
- animation/rig candidates.

They should not build the whole streamed continent as one Blender scene.

Keep raw generations and editable Blender sources outside shipping assets. Integrate only reviewed GLBs through `wildkin-asset-forge`. Serialize GPU work and check RAM/VRAM guards.

## Batch evidence

Each batch leaves:

- baseline and current visuals or behavior evidence;
- exact principal risk and review;
- PASS/HOLD/REJECT;
- focused tests;
- ordinary-input story when integrated;
- literal reload when persistence changed;
- one aggregate/package gate per integrated checkpoint;
- cohesive commit;
- compact owner-facing summary.

## Stop and handoff

Stop after three integrated batches, when a human design decision is required, when the same structural problem repeats, or when tool/resource instability threatens evidence.

The handoff should let Chris see progress quickly:

- illustrated overview;
- exact route/controls to try;
- strongest current images;
- admitted versus provisional work;
- next recommended production batch.

Do not automatically begin another unattended cycle.
