---
name: overnight-orchestrator
description: Run a bounded unattended Wildkin Frontier production session as one root orchestrator coordinating habitat, Wildkin, asset, gameplay, review, and validation agents without allowing endless loops or conflicting writers.
---

# Overnight orchestrator

Use only when Chris explicitly authorizes a long-running or unattended session and supplies or approves a production plan. This skill does not turn an old handoff into permission to resume. It coordinates several bounded batches and then stops.

The safest pattern for this repository is **one root Codex session per worktree**. Do not run two independent root sessions that both edit `main` in the same working tree. Use the root session's subagents as lanes with explicit file ownership. A separate asset-only process is acceptable only when it writes to an isolated candidate directory and root alone integrates it.

Read `AGENTS.md`, `docs/SESSION_START.md`, `docs/CURRENT_SLICE.md`, `docs/OVERNIGHT_PRODUCTION.md`, the latest handoff, and the relevant skills/packets.

## Session objective

Translate the owner request into a queue of no more than **three integrated batches**. Each batch must have:

- one player-visible or production-visible outcome;
- explicit files/domain owners;
- one principal uncertainty;
- a loop/review budget;
- a checkpoint/exit condition;
- a list of protected systems and non-goals.

Do not treat “keep improving the game” as a valid batch.

## Agent capacity and concurrency

Project config may allow up to six spawned-agent threads in addition to the primary. Capacity is a ceiling, not a quota.

Use these operating limits:

- at most **three write-capable agents** concurrently;
- one writer per shared file or authoritative domain;
- reserve at least one thread for independent review;
- use read-only research/judging agents where possible;
- run only **one TRELLIS, Blender render/bake, or other heavy GPU job at a time**;
- avoid simultaneous native-browser control from multiple agents;
- root alone owns canonical integration, shared data/schema, final documentation, commits, and aggregate gates.

When agent capacity is lower than requested, reduce concurrency rather than dropping review or file ownership.

## Recommended lanes

### Lane A — world/habitat

Use `habitat-development`. Work on one habitat or one cross-habitat tool that directly enables the selected habitat. Default maximum: one structural pass, one focused repair, one independent judge.

### Lane B — Wildkin/species

Use `wildkin-species-development`. It may produce a species card, reference, model candidate, animation candidate, behavior prototype, or integrated encounter depending on readiness. Do not force all stages in one batch.

### Lane C — feature/performance/support

Use the general `wildkin-development` plus `docs/ALPHA_WORKFLOW.md`. This lane is optional and begins only after Lane A or B has reached a useful checkpoint. Prefer a measured streaming/mobile issue, a reusable placement/debug tool, or a small gameplay contract. Do not invent a headline system merely to keep agents busy.

## Batch cycle

1. **Orient**
   - confirm Git status, current commit, active servers/processes, and protected work;
   - read only relevant files and current evidence;
   - update `CURRENT_SLICE.md` with the bounded queue and owners.

2. **Baseline**
   - use a real journey for gameplay;
   - matching screenshots/overhead for appearance;
   - a failing contract for correctness;
   - measurements for performance;
   - preserve valid fixtures/evidence from prior batches.

3. **Produce**
   - delegate disjoint tasks;
   - integrate one representative effect early;
   - keep loops within the skill's budget;
   - serialize GPU and browser-heavy work.

4. **Review**
   - use an independent reviewer focused on the principal risk;
   - return one consolidated repair packet;
   - do not let implementers PASS their own work.

5. **Repair**
   - fix only consequential gaps;
   - repeat only invalidated proof;
   - if the same structural failure appears twice, stop that method and record HOLD.

6. **Checkpoint**
   - ordinary-input play;
   - literal reload/persistence when changed;
   - focused tests, then one aggregate verify/build/ZIP at the integrated checkpoint;
   - commit cohesive work directly to `main`;
   - update compact status and evidence.

7. **Advance or stop**
   - start the next authorized batch only after the current batch is coherent;
   - do not keep one lane alive through cosmetic micro-iterations.

## Loop and time discipline

Outcome limits matter more than guessed wall-clock estimates:

- two substantial implementation rounds per habitat or species by default;
- three only for an explicitly designated hero surface and only with a structural method change;
- one consolidated review/repair for ordinary feature batches;
- no more than three integrated batches in one unattended session;
- no repeated aggregate suite after every visual round or documentation-only change.

If a lane finishes early, it may prepare a packet/reference/tool for the next batch, but it must not silently enlarge scope.

## Stop conditions

Stop production and leave a handoff when any occurs:

- a consequential owner design choice is unresolved;
- the same structural failure repeats after the allowed repair;
- save, physics, collision, offline packaging, or data ownership becomes uncertain;
- GPU/RAM guards, tool instability, or repeated browser harness errors threaten the machine or evidence;
- independent review cannot be obtained and the work requires perceptual admission;
- all authorized batches are complete;
- there is no unblocked work that fits the current plan.

Do not lower guards, install paid services, publish externally, or invent approval to avoid stopping.

## Morning handoff

Create one concise owner-facing checkpoint containing:

- what changed for the player;
- actual current visuals and how to open them;
- PASS/HOLD per lane;
- tests/package status and exact commit(s);
- known defects and honest untested claims;
- three recognizable things Chris can try;
- the next recommended batch.

Link detailed receipts rather than copying history. Do not auto-start another overnight cycle.

## Git and publication

Follow the repository rule to work directly on `main` and preserve unrelated changes. Commit each cohesive integrated batch. Push only when the current owner prompt explicitly authorizes it; a historical push authorization does not automatically carry forward.
