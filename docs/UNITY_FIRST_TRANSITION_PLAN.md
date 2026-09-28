# Wildkin Frontier — Unity-First Native Transition Plan

**Owner direction — September 25, 2026:** start with Unity. Spend the next Codex budget proving that Unity can support the target game and the desired agent-driven workflow before duplicating work in Unreal. Unreal remains a credible fallback/challenger, not an automatic parallel task.

## Qualification status — September 28, 2026

**U0/U1, U2 and U3 PASS; U4/U4B/U4C HOLDs remain historical; U4C3 and U4D PASS within their documented scopes after independent review; U5 has not started.** U4C3 preserves the sculpted sources and true-SDF inputs, makes B/0.0625 and C/0.125 pass the genus-zero closed-manifold qualification, and passes the complete 12-row U4C2 true-SDF matrix. Its named regression preserves the unsupported face-only interior-connectivity case; arbitrary trilinear topology and higher-genus surfaces are not qualified. U4D proves the 0.50 m world coexisting with .25 m and .125 m local domains; local edits, moved-pose world editing, source-free save/reload, domain/world isolation, bounded remeshing, contact, and a standalone Windows Player run are recorded. Focused EditMode is 11/11, full EditMode 153/153, PlayMode 2/2, and the Player exits 0 after a successful build. Independent review assigns `LOCAL_DOMAIN_0_125_PASS` within the U4D scope. See [U4D evidence and review](../native/evidence/unity/u4d-local-matter-domain/README.md), [U4C3 evidence and receipt](../native/evidence/unity/u4c3-topology-safe-surface-nets/), [U4C2 evidence](../native/evidence/unity/u4c2-sculpted-source/), [SOURCE_GEOMETRY_MATTER_FIDELITY_PLAN.md](SOURCE_GEOMETRY_MATTER_FIDELITY_PLAN.md), and [LOCAL_MATTER_DOMAINS.md](LOCAL_MATTER_DOMAINS.md). Stop at the U4D owner gate; do not begin U4E, U5, Unreal, adaptive terrain stitching, or production migration.

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

**Status: PASS for the bounded reference kernel, September 27, 2026.** Independent read-only review passed. The exact layout, evidence, and unresolved limits are in [the U2 evidence README](../native/evidence/unity/u2-matter-kernel/README.md) and [receipt JSON](../native/evidence/unity/u2-matter-kernel/receipt.json).

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

**Implementation checkpoint, September 27, 2026: HOLD pending independent root review. Do not start U4 yet.** The six-fixture matched bakeoff, deterministic Surface Nets and bounded Dual Contouring, same-resolution seam tests, 0.50m/0.25m matrix, bounded local-detail sample, agent reproduction commands, evidence captures and Windows Development Player observation are recorded in [U3 evidence](../native/evidence/unity/u3-mesher-resolution/README.md) and [receipt](../native/evidence/unity/u3-mesher-resolution/receipt.json). Final Editor tests pass 67/67 and PlayMode 1/1; the Development Build succeeds. Current provisional recommendations are `SURFACE_NETS` and `LOCAL_REFINEMENT_DIRECTION`. The local finer region is not stitched into the coarse base, and managed-allocation bytes are unavailable rather than zero. Root must inspect images and implementation before PASS or admission.

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

### U4B follow-up — procedural rock formation construction

**Status: HOLD after independent review, September 27, 2026.** U4B is a new method test, not another tuning pass on `WildkinClast-v1`. It compares preserved U4Control, hard distinct stones, and `SelectiveFormation`, which blends only the central group. Six matched seed/layouts informed the provisional selection. The final selected-mode gallery has 20 seeds across four archetypes, four rejected attempts that regenerated successfully, and zero rejected final seeds. Multiple resolved matter components are allowed and evidenced.

The technical contracts pass: stone recipes resolve into ordinary U2 `MatterWorld` edits, Surface Nets and the 0.50m default remain unchanged, the one-surface seam and projection regression pass, the bounded 0.25m seed now validates in physical meters, and EditMode/PlayMode plus the Windows Development Build pass. Independent review still holds the visual target: silhouettes vary little within each family, the forms remain soft/fused clasts, and material separation is weak. U4 remains a valid failed experiment. **Do not start U5 or Unreal from this result; stop for owner review.** See the [U4B evidence and receipt](../native/evidence/unity/u4b-rock-construction/).

## Phase U4C — source geometry → signed-distance matter fidelity

**September 28 U4C3 continuation: PASS within documented qualification scope after independent review.** Face-based crossing-patch identity repairs both recorded four-use edges. The full U4C2 true-SDF matrix passes the genus-zero manifold qualification with exact source/SDF inputs and fidelity measurements unchanged. A named regression exposes the known unsupported interior-connectivity class; arbitrary trilinear topology and higher-genus surfaces are outside this qualification. The U4C2 source, fidelity and pre-repair results remain preserved. U4C3 evidence and reviewer findings are in [the U4C3 evidence folder](../native/evidence/unity/u4c3-topology-safe-surface-nets/). At the U4C3 checkpoint U4D was recommended but had not started; the owner later authorized the bounded U4D prompt recorded below.

**September 28 continuation U4C2: source Gate A PASS; final REPRESENTATION_HOLD.** The materially different single-shell sculpted superquadric method passes after one bounded large-cut adjustment. True signed-distance conversion and all requested resolution/encoding comparisons are recorded in [U4C2 evidence](../native/evidence/unity/u4c2-sculpted-source/README.md). Visual fidelity reaches a common acceptable baseline at 0.25 m; finer-tier topology fails for two rows. The existing mesher algorithm remains intact, and the ordinary MatterWorld default stays 0.50 m. At this checkpoint no local-domain phase was admitted; U4C3 and later owner direction superseded that pause.

**Historical U4C checkpoint: SOURCE_MODELER_HOLD after one bounded repair, September 27, 2026.** The direct source mesh gallery and independent review are in [U4C evidence](../native/evidence/unity/u4c-source-matter-fidelity/README.md). Gate A did not pass in that experiment; its conversion work was withheld. Preserve this negative evidence.

**Goal:** determine whether the visual problem is the source generator, scalar-field encoding, sample spacing, or Surface Nets itself.

Create three visually credible direct procedural source-rock meshes using a plane/half-space modeling method. Only after source quality passes, convert the same exact meshes into true signed-distance local matter at 0.50 / 0.25 / 0.125 / 0.0625 m and compare Surface Nets reconstruction with matched cameras/materials. Include one occupancy/clipped-scalar control at matched spacing. Record visual fidelity, signed-distance reconstruction error, field memory, SDF sampling time and mesh cost.

**PASS gate:** a good source rock survives conversion at a practical local spacing strongly enough to identify a credible object-matter representation, or the experiment isolates a specific representation/mesher blocker. See `SOURCE_GEOMETRY_MATTER_FIDELITY_PLAN.md`.

## Phase U4D — local matter domain coexistence proof

**September 28, 2026: `LOCAL_DOMAIN_0_125_PASS` within the documented U4D scope after independent read-only review.** The tech scene has a 0.50 m MatterWorld, a .25 m CapstoneSlab domain, and a .125 m ChunkyBoulder domain. Each local domain owns dense density/material arrays, a stable ID, local integer sample bounds, independent spacing, transform and content revision. Initial meshes have approximately 2 cm measured clearance; direct positive-sample checks find no solid overlap. The padded AABB diagnostic counts occupied world samples as a conservative placement measure and is recorded separately. Domain meshes are separate and no terrain stitching or refinement is present.

The .125 m sequence proves a 291-sample local carve (2 direct regions, 4 rebuilt, 8 reused of 12), a transform-only move to 45° yaw that preserves content and mesh hashes without remeshing, a 174-sample world-space edit mapped to `(4,2,4)`, and a no-op at the old world position. It saves and removes the runtime object, then loads and deterministically remeshes from a Base64 density/material snapshot without source geometry or saved Unity mesh data. The .25 m domain and .50 m world stay unchanged. Focused EditMode is 11/11, full EditMode is 153/153, PlayMode 2/2, and the Windows x64 Development Player builds with zero errors and exits 0. Editor and Player metrics/captures are in [U4D evidence](../native/evidence/unity/u4d-local-matter-domain/README.md); the detailed responsibilities are in `LOCAL_MATTER_DOMAINS.md`.

Independent review found no technical blocker; the standalone overview is softer than the Editor closeups, which provide the surface-detail evidence. The bounded dense prototype does not prove world-scale memory, physics, support, collapse or transfer. U4C3's arbitrary trilinear-interior and higher-genus limitations remain. U4E/U5, Unreal, adaptive terrain stitching, streaming and production migration remain stopped for owner review.

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
