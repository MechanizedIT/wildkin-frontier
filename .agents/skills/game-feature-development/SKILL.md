---
name: game-feature-development
description: Design, implement, review, and hand off one bounded Wildkin Frontier gameplay feature or system change using a player-outcome contract, explicit state ownership, focused tests, normal-input play, persistence proof, and one repair cycle.
---

# Game feature development

**Focused Rootbound override (latest September 14 owner direction):** use [ROOTBOUND_FOCUSED_GOAL.md](../../../docs/ROOTBOUND_FOCUSED_GOAL.md). Work continuously within Rootbound and its constituents; up to six substantial attempts per constituent/composition experiment, independent review each time, method change after two repeated defects. After six unsuccessful attempts, work on another Rootbound constituent and revisit with a concrete new approach. Keep useful partial gains against the retained baseline; preserve held candidates and reusable parts. Earlier three-pass/rotate-away rules below are historical for this focused run.


Use this project-local skill for a nontrivial gameplay change whose principal risk is behavior, state, interaction, persistence, feel, or performance rather than habitat composition or 3D asset production. Examples include traversal, combat, harvesting, crafting, building interactions, care, UI behavior, save transactions, and companion abilities.

Read `AGENTS.md`, `docs/SESSION_START.md`, `docs/CURRENT_SLICE.md`, `docs/ALPHA_WORKFLOW.md`, and the relevant owners in `docs/CODE_MAP.md`. Use the habitat or species skill when those are the real center of the task.

## Feature contract

Before editing, state:

1. **Player outcome:** one sentence describing what the player can now do, understand, or decide.
2. **Entry point:** actual control, world interaction, or UI surface.
3. **Authoritative state owner:** the single module/data owner and affected callers.
4. **Success path:** input → validation → effect → feedback → persistence.
5. **Failure paths:** unavailable, invalid, interrupted, save failure, death/reload, or other relevant cases.
6. **Feel/readability target:** timing, feedback, telegraph, camera, sound, or UI expectations.
7. **Performance boundary:** relevant per-frame, resident, allocation, network/offline, or package limits.
8. **Sibling consistency:** other systems/object families that share the changed contract.
9. **Non-goals:** future systems and adjacent mechanics that must remain untouched.
10. **Exit evidence:** focused tests, one normal-input journey, persistence/package checks, and review.

Do not define a batch as “improve X.” Define the exact player-visible result and failure behavior.

## Choose the right baseline

- **Correctness:** begin from a failing test, reproduction, or explicit contract mismatch.
- **Feel/readability:** record actual normal-play video/screenshots and player observations.
- **Performance:** measure the same route/device/build before changing architecture.
- **Persistence:** preserve a known save fixture and record exact expected state transitions.
- **UI/input:** use the actual visible control and blocking/modal state, not debug invocation alone.

Generated concept art is unnecessary unless visual composition is the principal uncertainty.

## Bounded feature loop

### 1. Trace and plan

Follow the full chain:

`input/UI → authoritative state/data → validation → runtime effect → feedback → persistence/export → tests`

Name the writer for each touched file/domain. Root owns shared integration and schema.

### 2. Implement the smallest complete vertical slice

Make one representative case work end-to-end before generalizing. Prefer existing owners and helpers. Do not add a framework, parallel state copy, new loop, or generic abstraction unless the current contract genuinely requires it.

### 3. Focused review

Use one reviewer specialized in the principal risk:

- correctness/save/physics/determinism;
- mobile input/UI/accessibility;
- feel/telegraph/audio;
- performance/streaming;
- architecture/consistency.

The reviewer returns one consolidated repair packet. Do not duplicate the same investigation across several agents.

### 4. Up to two focused repair cycles

Fix consequential findings and rerun only invalidated proof. The [project loop policy](../../../docs/PRODUCTION_LOOP_POLICY.md) permits three substantial passes total: one implementation and up to two focused repairs. Stop early on PASS; when a gap repeats, change the method before using a remaining pass. At the cap, record HOLD/debt and checkpoint rather than growing scope.

### 5. Play and checkpoint

Complete one ordinary-input story from a recognizable setup. Include the main success path and the most important failure/retry path. Verify literal reload when persistent state changed. Run focused tests during work and one aggregate test/verify at the integrated checkpoint. Reserve shipping ZIP creation and package checks for deployment readiness.

## Review axes

Score or explicitly judge:

- player usefulness;
- discoverability and control clarity;
- feedback/telegraph/readability;
- failure/retry behavior;
- state ownership and sibling consistency;
- persistence/idempotence;
- performance/mobile suitability;
- offline/package behavior.

A passing test is not proof of good feel, and a good visual is not proof of a correct transaction.

## Shared-contract rules

- Preserve one requestAnimationFrame loop and one mutable owner per domain.
- Save coherent next state before irreversible effects when the existing transaction requires it.
- Keep IDs stable and preserve imported/legacy/sibling paths covered by the active slice.
- Verify hidden lifecycle cases: unload/reload, modal changes, held input, death, pagehide/import, Author isolation, and package origin where relevant.
- Do not patch one object family when the same transform, inventory, collision, or input contract is shared.
- Centralize tunables rather than scattering magic numbers.
- Remove temporary diagnostics after proving the cause.

## Feel work

When the task is movement, combat, camera, feedback, sound, or UI feel:

- use actual human-observable criteria;
- compare matching routes/captures;
- change one main feel dimension at a time;
- use Dream Loop only if composition/readability genuinely benefits from a visual target;
- let owner phone observations override numeric proxies.

## Overnight use

This skill normally supplies the optional third lane in an unattended run. Start it only after a habitat or species lane has a coherent checkpoint, unless the feature is a direct prerequisite.

Good overnight feature batches are small and measurable: one streaming hitch, one placement tool, one species ability transaction, one mobile input conflict, or one reusable diagnostic. Do not use idle agents to begin a new headline system.

## Required handoff

Leave:

- the feature contract;
- files/state owners touched;
- normal-input setup and expected behavior;
- focused review and repair;
- tests and package checks actually run;
- exact persistent-state proof when relevant;
- PASS/HOLD and the next meaningful change.
