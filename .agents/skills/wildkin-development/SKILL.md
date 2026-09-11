---
name: wildkin-development
description: Develop, integrate, review or hand off Wildkin Frontier changes using its current scope, existing asset workflows and offline gameplay contracts. Use for this repository's production work; do not start autonomous development from a status or playtest handoff alone.
---

# Wildkin development

Use this project-local skill to coordinate a small complete change. It composes existing workflows; it does not replace their technical procedures or grant new scope.

## Establish the current task

1. Read the current owner request, repository `AGENTS.md`, then [SESSION_START.md](../../../docs/SESSION_START.md) and the newest status in [CURRENT_SLICE.md](../../../docs/CURRENT_SLICE.md). Latest owner steering overrides historical overnight/phase instructions. A handoff for owner playtesting means stop production until a new task or feedback arrives.
2. Check `git status --short` and recent commits. Use [CODE_MAP.md](../../../docs/CODE_MAP.md) to locate the relevant state owner, callers and tests. Read design/architecture sections only for affected contracts. Repository evidence owns implementation truth; query the brain only for relevant owner intent/history.
3. State the player-visible result, bounded scope, current uncertainty and closure evidence. Keep completed, working-tree, packaged, reviewed and planned status distinct. Do not infer owner approval from an agent score.

## Compose the right workflow

- For references, GLBs, props, creatures, rigging or animation, load the available `wildkin-asset-forge` skill (on Chris's laptop: `C:/Users/cwood/.codex/skills/wildkin-asset-forge/SKILL.md`). Read only its relevant production, rigging, mechanical or admission reference.
- For a new visual target or a reference-driven scene/UI pass, load `dream-loop` (`C:/Users/cwood/.codex/skills/dream-loop/SKILL.md`) using the established project workflow. Start from the actual current view and approved Explorer style. An existing locked target is reused, not regenerated to excuse an implementation failure.
- For ordinary correctness fixes, use focused source/behavior evidence without inventing an image-generation gate. If a required skill is missing, locate it through the session catalog; report a real dependency gap rather than installing or copying it silently.

## Work ownership and review

- Keep one writer per shared production file. When independent work is useful and delegation is authorized, assign explicit bounded ownership and tell workers to preserve others' changes. Composer modules or evidence directories can be isolated; root integrates canonical world/export changes serially.
- Separate reference author, implementer and independent visual judge for art admission. An implementer may report defects or traversal results, but cannot independently PASS their own art. Give reviewers raw images and scope, not a score they must inherit.
- Integrate one representative vertical slice early: input → actual game effect → save/reload → relevant Author/package path. A polished isolated panel does not prove its physical access point is discoverable.
- After repeated failure with the same approach, stop that approach and diagnose the visible structure. Preserve the rejected version and target. Change topology, joint support, material treatment or composition as warranted; avoid endless bevel, color or profile tweaks and avoid score inflation from effort.

## Evidence that can support admission

- Identify exact source/model SHA256, capture revision, dimensions and relevant fixture. Inspect the actual full images. Separate target fitness, neutral model, deformation frames, continuous exported motion, native gameplay and physical-phone gates. A score of at least 8 is the current art threshold, not a waiver of a failed contract.
- Sampled stills cannot prove continuous cadence, transitions or sound. A saved video that the reviewer could not play remains unreviewed. Inspect motion at the actual species scale, authored speed and native camera; displacement/contact numbers support, rather than replace, perception.
- Label diagnostic grants, save seeds, teleports, camera overrides and read-only position navigation. Ordinary input after a fixture is native execution, not a fresh earned journey. Distinguish dev, packaged, already-loaded offline and literal reload evidence; do not claim one from another.
- Keep an honest compact receipt: actual actions, observed outcome, errors/requests, exact hashes, PASS/HOLD and remaining limitation. Retain failed evidence without presenting it as current proof.

## Cross-system contracts

- Keep stable asset/resource/spawn IDs. External GLBs remain read-only at primitive level; maintain deliberate collision descriptors. Check scale, yaw, grounded support, opacity/material isolation, runtime prefab factory and Author placement/export/reload parity. A visually walkable ledge must not hide a taller box wall. Use supported hulls only with validation and real physics evidence.
- Preserve raw source, original albedo and UVs before reduction or rig work. Judge the fresh exported GLB, not only Blender state. Fit anatomy and a proxy/deformation rig to the actual mesh; inspect local weight maps and loaded poses. Height masks or broad nearest-bone rules are not substitutes for joint-aware weighting.
- One frame loop and one mutable owner per domain. Do not remove a Rapier `world.step` merely because propagation moves a collider visually: the local study found stale broadphase queries after movement and enable/create changes. Establish query/lifecycle equivalence before batching simulation.
- For inventory, read [PHYSICAL_INVENTORY_PLAN.md](../../../docs/PHYSICAL_INVENTORY_PLAN.md). Preserve quantity across pack, selected nearby container, legacy withdrawal, crafting, partial rewards and refunds. Save the coherent next transaction before irreversible gameplay effects; failed writes retain prior ownership and retryable actions.
- For resume, preserve run identity, pack, supported position, health, XP, pending bonds and Core under existing owners. Rebuild ordinary actors and cancel unfinished tame effects without inventing a second inventory or full AI serializer. Verify import/pagehide, death retry, extraction idempotence and Author isolation where the changed contract touches them.

## Keep the laptop and context usable

- Serialize heavy Blender/TRELLIS work and coordinate native browser slots. Check actual RAM/VRAM against existing guards; never lower guards to force a job. Identify owned idle processes before closing anything; do not close the user's workbench. Prefer small CPU previews and bounded meshes. No paid fallback, upgrades or external publication from this skill.
- Search selected symbols and JSON fields; read small relevant ranges. Avoid entire logs/world files, repeated giant tool outputs and unchanged polling. Reuse a proof harness only after verifying its real action, timer and camera assumptions. Wall-clock tool delay can confound encounter difficulty.
- Run meaningful focused tests while developing. At a cohesive integrated checkpoint, the parent owns the required aggregate verification/build/ZIP and relevant native/package checks. Do not make every worker repeat that matrix; do not skip save/physics boundary checks because the UI looks correct.

## Close the requested work

Update current status, affected ownership/contracts and BUILD_LOG with actual evidence. Commit cohesive changes directly on `main` under repository rules, preserving unrelated work; do not publish without authorization. Keep source, generated data and packaged bytes consistent with the stated checkpoint.

Give Chris a short changelog, recognizable things to try, a few actual visuals and unfinished work. State what is still provisional or unshipped. Respect a request to wrap up: preserve candidates and useful next steps without launching another production cycle. See [WORKFLOW_RETROSPECTIVE.md](../../../docs/WORKFLOW_RETROSPECTIVE.md) for the session evidence behind these rules.
