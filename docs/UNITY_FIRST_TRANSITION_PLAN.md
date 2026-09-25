# Wildkin Frontier — Unity-First Native Transition Plan

**Owner direction — September 25, 2026:** start with Unity. Spend the next Codex budget proving that Unity can support the target game and the desired agent-driven workflow before duplicating work in Unreal. Unreal remains a credible fallback/challenger, not an automatic parallel task.

## Target

Wildkin Frontier is now aimed at a **mid/upper-range Windows PC game** with:

- a stylized 3D world that reads like authored game art rather than a raw voxel demo;
- substantially destructible terrain and large world forms;
- procedural variation so rocks, trees and large flora are not a small repeated model library;
- material-specific destruction;
- unsupported matter becoming physical, recursively destructible actors;
- high use of Codex for implementation, testing, editor operation, evidence capture and maintenance.

The completed Three.js/Rapier matter lab through Phase 0.5E is retained as the behavioral reference. It is not the codebase to port line-for-line.

## Why Unity first

Unity 6.3 LTS is the first production candidate because the project needs unusually heavy custom matter algorithms and unusually heavy agent participation.

The working hypothesis to test is:

> Unity 6.3 LTS + HDRP + C# + Jobs/Burst + writable MeshData + official Unity Codex/CLI/MCP tooling can provide enough visual quality while giving Codex a simpler, more inspectable and faster iteration loop than a C++/binary-asset-heavy workflow.

This is a hypothesis, not a locked engine decision.

## Unreal decision trigger

Do **not** build a matched Unreal prototype merely for symmetry.

Re-open the Unreal comparison if one of these becomes true:

1. Unity agent/editor automation is unreliable enough that the owner must intervene often.
2. Runtime mesh/collider updates have a blocker with no plausible async/native path.
3. HDRP/dynamic matter cannot reach the desired stylized visual target.
4. Local-refinement or Dual Contouring integration fights Unity's runtime model excessively.
5. Procedural world authoring is materially weaker than needed.
6. A later owner decision requests an Unreal comparison after seeing the Unity result.

If Unity clears the qualification gates, continue into the native production kernel before spending equal time on Unreal.

## Repository layout

The native transition is isolated from the historical browser game.

```
native/
  README.md
  shared/
    reference/
      PHASE05E_REFERENCE.json
      README.md
    acceptance/
      README.md
  unity/
    README.md
    # WildkinUnity/ is created locally by Unity/Unity CLI.
  unreal/
    README.md
    # Deferred unless the Unreal trigger is reached.
```

The Unity project itself should live at:

`native/unity/WildkinUnity/`

Do not hand-author Unity's generated project metadata in GitHub before the Editor creates the project.

## Native source organization target

Once the Unity project exists, prefer this high-level organization:

```
Assets/Wildkin/
  Core/
  Matter/
    Data/
    Sampling/
    Meshing/
    Materials/
    Destruction/
    Physics/
    Persistence/
    Debug/
  Procedural/
    Stamps/
    Rocks/
    Flora/
  World/
  AgentTools/
  Tests/
    EditMode/
    PlayMode/
  Scenes/
    Tech/
```

Keep domain code in focused assemblies when it becomes useful. Avoid premature service frameworks or a giant manager object.

## Phase U0 — local toolchain/bootstrap

**Goal:** establish a reproducible Unity 6.3 LTS HDRP project and verify the official Codex/Unity tooling.

Local prerequisites:

- Windows x64;
- Unity 6.3 LTS installed;
- Windows build support;
- Git working tree clean/pulled;
- Codex CLI/app available;
- enough free disk for Unity Library/import cache.

Agent tooling to verify:

- official Unity plugin for Codex;
- Unity CLI;
- Unity pipeline package connected to the Editor;
- Unity CLI MCP configured for Codex;
- project-local agent instructions;
- screenshot/capture path;
- EditMode and PlayMode test execution;
- Windows build execution.

**U0 PASS:** Codex can create/open the project, inspect the Editor connection, change code, run tests, capture a view and produce a development build without the owner manually performing implementation steps.

## Phase U1 — agent autonomy smoke

Give Codex ordinary engine work before voxel work:

1. create a simple HDRP test scene;
2. create a scripted rotating/generated object;
3. expose one small Wildkin editor/agent command;
4. add EditMode test;
5. add PlayMode test;
6. intentionally cause one compile/test failure and repair it;
7. capture Game and Scene views;
8. make a Windows development build;
9. write a JSON receipt of commands, failures and owner interventions.

Measure:

- compile/reload turnaround;
- failed MCP/CLI commands;
- editor restarts;
- manual clicks;
- ability to inspect scene state;
- source-control diff quality.

**U1 HOLD:** Codex needs frequent manual editor rescue or cannot reliably validate its own work.

## Phase U2 — native matter skeleton

**Goal:** represent deterministic editable matter natively without yet porting collapse.

Implement:

- integer sample coordinates;
- fixed-size matter brick;
- density array;
- material array;
- deterministic SDF sampling;
- sparse edit/tombstone overlay;
- dirty revision;
- engine-neutral reference fixture reader.

Use data structures compatible with later Burst/Jobs work.

Do not build infinite streaming.

**U2 PASS:** Unity loads a deterministic fixture, edits it, reconstructs it, and automated tests agree with the reference contract.

## Phase U3 — visual/mesher technology bakeoff

Run the same fields through:

- Surface Nets baseline;
- Dual Contouring prototype.

Test:

- smooth organic field;
- blocky/layered rock stamp;
- cave/cliff;
- mixed material interface;
- mined cavity.

Compare:

- silhouette;
- planar/sharp feature retention;
- triangle count;
- mesh time;
- allocations;
- chunk seams;
- edit stability;
- material attributes.

Test resolution at:

- 0.50 m uniform;
- 0.25 m uniform;
- 0.50 m base with a 0.25 m locally refined brick/region.

Only test 0.125 m in a tiny crop if 0.25 m is visibly insufficient.

**U3 decision:** Surface Nets, Dual Contouring or hybrid; and uniform vs local refinement direction.

## Phase U4 — stylized material + procedural rock proof

Build the first scene that should actually look like Wildkin.

Stone material:

- projected/triplanar or rest-space texturing;
- albedo;
- normal detail;
- roughness variation;
- macro color variation;
- restrained low-poly/faceted shading.

Dirt material:

- distinct projected albedo/normal/roughness;
- macro variation;
- narrow material-weight transition.

Dynamic actor test:

- projection must move with the actor; no obvious texture swimming.

Procedural `RockFormationStamp`:

- deterministic seed;
- rounded boxes/slabs/ellipsoids/wedges;
- scale/rotation variation;
- soft unions;
- flattening;
- optional low-frequency warp/erosion;
- at least 20 generated seeds;
- automatic contact sheet/evidence.

One selected stamp must become ordinary matter after placement.

**U4 PASS:** the result resembles a stylized game asset family rather than a raw voxel blob, and seeds show meaningful silhouette diversity.

## Phase U5 — minimal destruction slice

Port only enough proven behavior to expose engine integration costs:

- terrain/rock edit;
- dirt vs rock response;
- bounded local support query;
- static → dynamic transfer;
- one MatterActor;
- approximate physics proxy;
- moved-pose matter targeting;
- one save/reload.

Do not port every browser subsystem.

Use the Phase E reference invariants:

- chunks/bricks are not physical owners;
- detachment does not create resources;
- actor owns resolved local matter;
- matter surface is authoritative for precision editing;
- physics proxy may remain approximate;
- unsupported search fails closed if evidence is incomplete.

**U5 PASS:** one small native scene demonstrates edit → support loss → detached matter → physics → moved edit → reload with automated evidence.

## Unity qualification gate

After U0–U5, answer:

### Agent workflow
- Can Codex operate Unity reliably?
- How many manual interventions were required?
- Are tests/builds/captures automatable?

### Visual target
- Does HDRP + selected mesher + selected resolution + projected material system reach the desired stylized quality?

### Matter engineering
- Is runtime meshing practical?
- Can heavy work move off the main thread through Jobs/Burst?
- Can collider updates be staged without unacceptable hitches?

### Procedural authoring
- Can seeded SDF stamps generate high-quality variation?
- Can Codex generate/inspect/compare those variants effectively?

### Maintainability
- Is the project understandable in source control?
- Are runtime data contracts easy to test without the Editor?

If the answers are positive, **Unity becomes the selected production engine provisionally** and the next phase is the native production matter kernel.

If a material blocker remains, prepare a narrowly scoped Unreal challenger around the blocker rather than recreating every Unity experiment.

## Performance philosophy

Do not optimize for the old browser/mobile target.

For the Unity qualification:

- record Editor timings;
- also record Windows player-build timings;
- distinguish CPU sampling, meshing, mesh upload, collider cooking, physics and persistence;
- use Burst/Jobs only where a measured or obvious hot loop justifies it;
- avoid allocating per sample/per cell objects;
- prefer contiguous arrays and fixed-size bricks.

The later PC-scale phase owns streaming, LOD, large-world persistence and serious optimization.

## Agent-facing Wildkin tools

Begin with a tiny toolset and grow it as the system earns complexity.

Desired commands eventually include:

- inspect matter region;
- generate rock stamp;
- render stamp contact sheet;
- apply matter edit;
- remesh brick;
- inspect MatterActor;
- inspect material/ownership ledger;
- capture benchmark scene;
- run matter tests;
- export benchmark receipt.

Tools should expose meaningful game concepts rather than forcing Codex to infer everything from editor hierarchy state.

## What remains reference-only

Do not port merely because it exists:

- browser input/UI;
- mobile touch handling;
- old submission ZIP system;
- DOM debug panels;
- Three.js renderer code;
- Rapier-specific proxy construction code;
- old performance assumptions;
- fixed 3×3 lab storage implementation.

Port the **behavioral contract**, not incidental implementation.

## First local session

When the owner reaches the PC:

1. pull `main`;
2. read `AGENTS.md`, `docs/CURRENT_SLICE.md`, this file and the U0 prompt;
3. run `docs/prompts/UNITY_00_BOOTSTRAP_AGENT_SMOKE.md` in a fresh Codex/Luna High session;
4. stop at its review gate;
5. do not start meshing until U0/U1 agent operation is proven.
