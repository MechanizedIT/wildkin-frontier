# AGENTS.md — Operating Rules

> **September 25 owner direction — active:** Wildkin Frontier is now targeting a higher-detail **PC-first native game**. The completed Three.js/Rapier destructible-matter lab through Phase 0.5E is an executable behavioral specification, not the presumed shipping stack. Begin the native transition **Unity-first** using Unity 6.3 LTS + HDRP and official Codex/Unity agent tooling. Qualify Unity before spending substantial Codex time on an Unreal duplicate; Unreal 5.8 is an optional challenger only if Unity exposes a material blocker or the owner later requests the comparison. The current plan is in `docs/UNITY_FIRST_TRANSITION_PLAN.md`, with broader comparison criteria in `docs/PC_ENGINE_BAKEOFF_PLAN.md`. Do not begin a full production migration until the Unity qualification gate is reviewed.

> **September 21 voxel direction — historical foundation, still technically relevant:** the browser R&D replaced the finite heightfield direction with procedurally generated destructible scalar matter, cubic chunks, material/tool/drop rules, and physical unsupported components. Preserve the verified matter invariants and Phase A–E evidence, but do not treat the browser/mobile implementation constraints as production requirements.

> **Historical September 14 owner goal (superseded September 21):** Chris authorized continuous goal-mode work through all ten finite habitats with Wildkin iterations in parallel. Preserve its evidence and review discipline, but do not resume that queue or its Blender guidance under the active voxel direction.

> **Historical product direction (September 14, 2026; superseded September 21):** Wildkin Frontier was portrait-mobile-first and used one large finite irregular continent with ten unique habitats. Preserve this as history only; do not use it to constrain the active voxel plan.

> **Workflow preparation checkpoint:** The September 13 game build remains stopped for owner review. The project now includes bounded habitat, species, game-feature, and overnight-orchestration skills plus a Rootbound Wildwood packet and kickoff prompt. Do not automatically resume production from an old continuous-development handoff. Begin only from fresh owner direction or an explicit kickoff.

1. Read `docs/CURRENT_SLICE.md` first. It is the authoritative implementation status for the active session.
   Then read `docs/SESSION_START.md`, `docs/INFINITE_VOXEL_WORLD_PLAN.md`, and the latest handoff. `docs/EARLY_ALPHA_PLAN.md`, `docs/CONTINENT_ALPHA_TARGET.md`, and `docs/CONTINUOUS_HABITAT_ROTATION.md` are historical unless a fresh owner instruction revives part of them. Use relevant `docs/CODE_MAP.md` entries for current implementation owners.
   Route work deliberately:
   - habitat/world composition: `.agents/skills/habitat-development/SKILL.md`;
   - new or substantially revised species: `.agents/skills/wildkin-species-development/SKILL.md`;
   - models, props, rigging, animation, TRELLIS, or Blender admission: `.agents/skills/wildkin-asset-forge/SKILL.md`;
   - bounded gameplay/system changes: `.agents/skills/game-feature-development/SKILL.md` plus `.agents/skills/wildkin-development/SKILL.md` and `docs/ALPHA_WORKFLOW.md`;
   - explicitly authorized unattended work: `.agents/skills/overnight-orchestrator/SKILL.md` plus `docs/OVERNIGHT_PRODUCTION.md`.
2. Read `docs/GAME_DESIGN.md`, `docs/BETA_RELEASE_PLAN.md`, and relevant parts of `docs/ARCHITECTURE.md` before changing architecture or gameplay. `HACKATHON_REQUIREMENTS.md` is an archive, not current scope.
3. Preserve existing working systems, but do not introduce **new features or future-phase behavior** outside the active slice. If a current slice requires touching an older system, make the smallest compatible change and preserve accepted behavior.
4. Preserve hard constraints for the **historical browser build** when touching it: single-player, offline-safe, local dependencies, readable first-party source, and its existing Three.js/Rapier behavior. For the **native transition**, the active target is Windows PC first, Unity 6.3 LTS + HDRP, and a custom matter kernel. Do not carry obsolete browser ZIP/mobile/package constraints into the Unity prototype unless a task explicitly concerns the old build.
5. New native work belongs under the prepared `native/` transition area and must follow `docs/UNITY_FIRST_TRANSITION_PLAN.md`. Do not add a second engine implementation until the Unity qualification gate says it is useful. Do not mechanically port browser JavaScript; port verified contracts, tests, fixtures and evidence.
6. Keep both tracks coherent: the browser build remains a known-good reference and should not be casually broken, while each native session must leave the Unity prototype compilable/testable at its own checkpoint. A native experiment may be incomplete visually, but it must clearly report PASS/HOLD evidence and must not silently replace the browser authority before the production architecture gate.
7. Keep architecture deliberately simple and explicit for repeated agent edits. Prefer focused modules with clear ownership over frameworks or generic abstractions.
8. Validate before stopping: run `npm test` and `npm run verify` unless the active slice explicitly states otherwise. Reserve shipping ZIP creation and package checks for deployment readiness. Manually confirm relevant dev/submission behavior when browser testing is required.
9. Append a `docs/BUILD_LOG.md` entry for every AI implementation session (date/time, tool/model, goal, decisions, files changed, tests, remaining issues).
10. Never silently change a locked design decision. Record a proposal in `docs/BUILD_LOG.md` or the relevant design doc and ask for owner confirmation.

## Engineering Principles — Permanent

11. `src/main.js` remains a thin composition/bootstrap layer: initialize modules, wire dependencies, own the single authoritative loop, and render. Do not keep adding domain gameplay rules to it.
12. Exactly one `requestAnimationFrame` loop drives all per-frame updates and rendering. No parallel or duplicate loops.
13. Modules split by responsibility as complexity grows. Avoid god objects and duplicate parallel systems; see `docs/ARCHITECTURE.md` for current and planned boundaries.
14. Mutable state has one explicit owner. Avoid hidden cross-module mutation and shadow copies of authoritative state.
15. Dependencies are injected via imports or constructor arguments, not ambient globals.
16. Globals are debug-only: `window.__game` may expose inspection helpers, but gameplay code must not rely on it.
17. Centralize feel/balance/presentation tuning in a findable config location (`src/game/config.js` or focused colocated `*_CONFIG` exports). Avoid scattered magic numbers.
18. Gameplay rules should be testable independently of rendering where practical. Prefer pure helpers for targeting, state transitions, timing, input classification, etc.
19. PC performance and desktop controls are primary. Mobile-landscape compatibility is no longer a production gate for the native PC transition. Keep the historical browser/mobile evidence intact, but optimize new Unity work for a defined mid/upper-range Windows PC target and measure editor vs player-build performance separately.
20. No new dependencies without justification. Record any approved new dependency in `docs/BUILD_LOG.md`. `esbuild` is approved build-time-only; Rapier is the approved runtime collision/physics dependency.
21. Manual testing instructions must be written for the human player, not the implementer. For every manual test, explain the recognizable setup/location, exact action, expected correct behavior, and visible/audible failure signs. Coordinates/internal IDs may supplement but never replace player-facing descriptions.
22. Human playtest observations override implementation claims for perceptual requirements. “A yaw value changed,” “a sound function exists,” or “a test passes” is not proof that a swing, trail, audio cue, telegraph, habitat, route, or UI element is actually readable in play.
23. Preserve accepted movement, harvesting, collision, performance, and submission behavior unless the active slice explicitly changes it.

## Change Closure / Consistency Sweep — Permanent

24. When changing a **shared behavior, schema, transform, lifecycle, input path, persistence rule, or other cross-system contract**, do not patch only the reported example. Identify the sibling systems/object families that use the same path and verify the change end-to-end across the relevant chain: **input/UI → authoritative state/data → validation → runtime representation → physics/gameplay → persistence/export → tests**. A fix is incomplete if the same underlying inconsistency remains in another sibling path covered by the active slice.
25. Be proactive **horizontally across consistency, not vertically into future scope**. If fixing a fence transform reveals the same transform bug in boxes and boundaries, fix/verify those sibling cases. Do not use that as permission to invent a construction system, new gameplay feature, or future-phase behavior. In the final response, briefly name the sibling paths checked whenever a shared contract changed materially.

## Git Workflow — Owner Locked

26. Work directly on `main`. Do not create or use task or feature branches for this project, locally or remotely, unless Chris explicitly reverses this rule. Commit cohesive work directly to `main`.

## Communication — Default Style

27. Default to plain, human language. Lead with the big idea, what changed for the player/builder, and why it matters. Keep file paths, technical jargon, and implementation details out of the default response; include them only when the user explicitly asks for "tech detail," "dev detail," or "show files."

## Multi-Agent and Overnight Work — Permanent

28. Use **one root session per worktree**. Do not run multiple independent long-running root sessions that edit the same `main` working tree. Use the root session's subagents as lanes; root alone integrates canonical data, shared files, Git, and checkpoint documentation.
29. Project `.codex/config.toml` permits up to six spawned-agent threads when the client supports them. This is a ceiling, not a quota. Use at most three write-capable agents concurrently, one writer per shared file/domain, and reserve at least one independent reviewer.
30. Serialize TRELLIS, Blender render/bake, and other heavy GPU jobs. Coordinate native browser ownership; do not let several agents drive the same browser or Blender instance at once.
31. Dream Loop and specialized loops are bounded: normally one structural pass and one focused repair. A third pass requires a designated hero surface and a structural method change. If the same gap repeats twice, record HOLD and move on or stop.
32. An unattended session may complete at most three integrated batches before leaving a handoff. It may not silently renew its queue, enlarge scope because agents are idle, or spend the entire session micro-tuning one held result.
33. Implementers cannot independently PASS their own perceptual work. When reviewer capacity is unavailable, preserve the candidate as unreviewed/HOLD rather than inventing approval.
