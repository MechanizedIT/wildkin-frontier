# Copy-ready prompt — Unity U0/U1 bootstrap + agent autonomy smoke

Use this in a **fresh Codex session with Luna High** after pulling the latest `main` on the development PC.

---

WILDKIN FRONTIER
UNITY NATIVE TRANSITION — U0/U1
BOOTSTRAP + CODEX/UNITY AGENT AUTONOMY SMOKE

ROLE

Set up the first native Wildkin Frontier Unity project and prove that
Codex can operate it effectively before any voxel/matter implementation
begins.

This is a tooling/autonomy qualification, not a game port.

Do NOT port Three.js code.
Do NOT implement Surface Nets or Dual Contouring yet.
Do NOT start destruction.
Do NOT start Unreal.

The owner has chosen Unity as the first production candidate to conserve
Codex usage. Unreal is deferred unless Unity later exposes a material
blocker.

============================================================
0. REPOSITORY / AUTHORITY
============================================================

Work directly on main per AGENTS.md.

Read first:

- AGENTS.md
- docs/CURRENT_SLICE.md
- docs/SESSION_START.md
- docs/UNITY_FIRST_TRANSITION_PLAN.md
- docs/PC_ENGINE_BAKEOFF_PLAN.md
- native/README.md
- native/unity/README.md
- native/shared/reference/README.md
- native/shared/acceptance/README.md

Historical browser implementation is read-only reference for this task.

Do not change browser gameplay/lab code.

Expected Unity project path:

native/unity/WildkinUnity/

If it does not exist, create it through Unity/Unity CLI.
Do not fabricate ProjectSettings/Packages metadata manually.

============================================================
1. TOOLCHAIN TARGET
============================================================

Target:

- Unity 6.3 LTS
- latest installed 6.3 patch available on this machine
- HDRP 3D project
- Windows x64 development build capability
- C#
- Git source control

Record exact:

- Unity editor version
- Unity CLI version
- HDRP package version
- OS
- GPU adapter visible to Unity
- Git commit used as starting point

Do not silently upgrade to a different major/minor Unity line.

If Unity 6.3 LTS is absent:
- inspect available Unity CLI/Hub state;
- prefer Unity's official installation workflow;
- if account/license/authentication requires owner interaction, STOP only
  for that human-required authentication step and state exactly what is
  needed;
- do not request or handle account passwords/tokens in source files.

============================================================
2. OFFICIAL CODEX / UNITY INTEGRATION
============================================================

Verify/install Unity's official Codex plugin.

Current official Codex commands are expected to be equivalent to:

codex plugin marketplace add Unity-Technologies/unity-agent-plugin
codex plugin add unity@unity-agent-plugin

First inspect existing plugin state and avoid duplicate/broken installs.

Also verify Unity CLI.

Once the Unity project exists and can open:

- install/verify the Unity Pipeline package required for Editor control;
- configure Unity CLI MCP for Codex, preferably project-local;
- inspect `unity mcp configure --help` before writing config;
- use the official Codex configuration path rather than hand-inventing an
  MCP command.

The intended official flow supports commands equivalent to:

unity mcp configure codex --local --project-path <project>

but use the installed CLI's actual help/schema as authority.

Verify:

- `unity status`
- running Editor discovery
- available Editor commands/tool schema
- Codex can invoke a Unity Editor command through the supported
  integration.

Do not modify unrelated Codex configuration entries.

============================================================
3. CREATE THE UNITY PROJECT
============================================================

Create/open:

native/unity/WildkinUnity/

Use Unity 6.3 LTS.

Use an HDRP project/template appropriate for a high-fidelity Windows PC
game.

Project name:
WildkinUnity

Product/display name for the experiment:
Wildkin Frontier Native Lab

Company:
MechanizedIT

Set/verify:

- Asset Serialization = Force Text
- Version Control mode suitable for visible .meta files
- Linear color space if not already configured by HDRP
- Windows as the immediate build target
- no Unity cloud service dependency required for the prototype

Use Git/version control, not cloud-sync folders, as project authority.

Do not enable unrelated Unity services.

============================================================
4. SOURCE-CONTROL HYGIENE
============================================================

Confirm repository ignore rules exclude generated Unity state:

- Library/
- Temp/
- Obj/
- Logs/
- UserSettings/
- build output
- IDE caches

But DO track required Unity source state:

- Assets/
- .meta files
- Packages/manifest.json
- Packages/packages-lock.json where generated
- ProjectSettings/

Run git status after import.

There must not be thousands of generated Library/cache files staged.

============================================================
5. CREATE MINIMAL WILDKIN PROJECT STRUCTURE
============================================================

Inside the Unity project create only the structure needed for this smoke:

Assets/Wildkin/
  Core/
  AgentTools/
  Tests/EditMode/
  Tests/PlayMode/
  Scenes/Tech/

Prefer namespaces rooted at:

Wildkin

Do not pre-create the entire future engine architecture.

Create assembly definitions only if they materially improve test/code
separation for this smoke.

============================================================
6. AGENT SMOKE SCENE
============================================================

Create:

Assets/Wildkin/Scenes/Tech/AgentSmoke.unity

The scene should visibly demonstrate:

- HDRP is actually active;
- one camera;
- one directional/key light plus any minimal HDRP environment needed;
- a ground plane;
- one clearly visible generated/test object.

Create a simple C# component, e.g. an AgentSmokeMarker, that:

- is deterministic;
- changes something visible at runtime;
- exposes one or two serialized fields;
- does not depend on Update allocations.

The point is not visual polish.

The point is to prove Codex can edit code, scene state, compile and inspect
the result.

============================================================
7. CODEX-OPERABLE CUSTOM COMMAND
============================================================

Create ONE tiny project-local Wildkin Editor/agent command using the
supported Unity command/Editor integration.

Desired behavior:

Wildkin / Agent Smoke / Inspect

or equivalent.

It should return machine-readable information such as:

- scene name
- test object name
- object world position
- component state
- project/Unity version

Prefer a JSON-like result/string rather than only logging prose.

If Unity CLI/Pipeline exposes a recommended command registration API,
follow that current API.

Do not build a large custom MCP server.

We are proving extensibility.

============================================================
8. AUTOMATED TESTS
============================================================

Create at least:

EDITMODE TESTS

- deterministic component/config behavior
- command/inspection serialization if practical

PLAYMODE TEST

- load/open the smoke scene or instantiate the smoke object;
- verify runtime state changes as intended;
- no exceptions.

Use Unity Test Framework.

Run tests through Unity CLI if supported by the installed toolchain.

Record exact commands and NUnit/test result paths.

============================================================
9. INTENTIONAL FAILURE / RECOVERY TEST
============================================================

This is important for agent development.

Create a temporary, harmless test/code failure intentionally.

Examples:

- invert one expected test assertion;
- introduce a small compile error in the smoke-only source.

Then:

1. run compile/test;
2. prove Codex receives usable error information;
3. diagnose it without owner help;
4. fix it;
5. rerun green.

Do not commit the broken intermediate state.

Record:

- failure type
- whether Codex could locate it
- commands/tool calls used
- recovery time if easy to measure

============================================================
10. EDITOR INSPECTION + CAPTURE
============================================================

Use the Unity-supported agent/CLI path to:

- inspect connected Editor;
- inspect the smoke scene/object;
- capture Scene view;
- capture Game view.

Do not count screenshots manually taken by the owner as agent success.

Write evidence to:

native/evidence/unity/u0-agent-smoke/

Required:

- scene-view image
- game-view image
- receipt.json
- README.md

The receipt should include:

{
  unityVersion,
  unityCliVersion,
  hdrpVersion,
  codexPluginInstalled,
  mcpConfigured,
  editorDetected,
  tests,
  build,
  failedToolCalls,
  editorRestarts,
  ownerInterventions,
  notes
}

Use actual measured values.

============================================================
11. WINDOWS DEVELOPMENT BUILD
============================================================

Produce one Windows x64 development build.

Use Unity CLI/build tooling where practical.

Build output itself may remain ignored/uncommitted.

Record:

- build command
- success/failure
- elapsed time
- output path
- player log status after launch if the agent can launch/inspect it safely

If launching the build is straightforward, launch it and capture evidence.

Do not package/distribute anything.

============================================================
12. AGENT AUTONOMY AUDIT
============================================================

At the end, explicitly count owner interventions.

Classify each as:

A. unavoidable account/license/security action
B. editor/tool limitation
C. agent failure
D. owner preference/manual review

The goal is NOT zero clicks at any cost.

The goal is to know whether Codex can realistically maintain this project.

Record:

- number of editor GUI actions the owner had to perform;
- number of times the agent needed the owner to locate something;
- tool/MCP failures;
- whether Codex could see enough of the scene to validate its own work;
- whether compile/test/build logs were machine-readable.

============================================================
13. DOCUMENTATION
============================================================

Create:

native/unity/WildkinUnity/README.md

Update as appropriate:

- docs/CURRENT_SLICE.md
- docs/BUILD_LOG.md
- native/unity/README.md

Create:

native/evidence/unity/u0-agent-smoke/README.md
native/evidence/unity/u0-agent-smoke/receipt.json

Do NOT rewrite Phase E historical evidence.

============================================================
14. VALIDATION
============================================================

Required before PASS:

- Unity project opens under exact 6.3 LTS patch
- HDRP active
- clean C# compile
- EditMode tests green
- PlayMode tests green
- custom Wildkin command callable through agent/editor integration
- Scene capture generated by agent tooling
- Game capture generated by agent tooling
- Windows x64 development build succeeds
- git status contains no generated Unity cache pollution

Also run browser npm tests only if this task touched shared/browser files.
It should not normally do so.

============================================================
15. PASS / HOLD
============================================================

PASS U0/U1 only if:

1. official Codex Unity plugin works;
2. Unity CLI/Editor connection works;
3. Codex can inspect and modify the Unity project;
4. Codex can run tests;
5. Codex can recover from an intentional failure;
6. Codex can capture visual evidence;
7. Windows build succeeds;
8. source control is clean/sensible;
9. no material manual-editor dependency is discovered.

HOLD if:

- Unity/Codex integration cannot reliably connect;
- Editor automation is too opaque for self-validation;
- project creation requires unresolved environment/license work;
- tests/builds cannot be run agentically;
- source control becomes dominated by generated/unreviewable state.

Do not HOLD merely because:

- first Unity import is slow;
- Library is large;
- visuals are plain;
- owner must complete normal Unity account/license authentication once.

============================================================
16. COMPLETION
============================================================

If PASS or meaningful HOLD:

- perform an independent read-only review of this bounded work;
- update docs/evidence;
- commit cohesive changes directly to main;
- push if existing project authorization permits.

Final response:

PASS or HOLD
commit hash
Unity version
HDRP version
Codex plugin result
Unity CLI/MCP result
tests
Windows build
screenshots/evidence path
owner interventions
tool failures
known limitations
recommended next session

If PASS recommend:

UNITY U2 — NATIVE MATTER REFERENCE KERNEL

DO NOT START U2.

STOP FOR OWNER REVIEW.
