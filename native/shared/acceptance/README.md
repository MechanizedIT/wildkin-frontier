# Native prototype acceptance contract

Every native-engine checkpoint should leave reviewable evidence, not only an editor scene.

At minimum record:

- exact engine/editor version;
- project commit;
- target platform and build type;
- Codex model/reasoning level;
- agent/CLI/MCP setup used;
- commands/tests run;
- compile/test/build outcome;
- screenshots or captures from the actual running project;
- benchmark receipt when the phase measures performance;
- owner interventions required;
- known limitations;
- PASS / HOLD disposition.

## Visual comparisons

For mesher/material/stamp comparisons use matched:

- source SDF/seed;
- camera;
- light rig;
- object/world scale;
- output resolution.

Do not call an option better because it received a more flattering scene setup.

## Performance comparisons

Separate:

- generation/sampling;
- support/connectivity;
- meshing;
- mesh upload;
- collider creation/update;
- physics;
- persistence;
- end-to-end edit latency.

Record Editor and Windows player-build measurements separately.

## Agent workflow evidence

Record:

- failed tool calls;
- editor restarts;
- manual clicks/interventions;
- whether Codex could inspect its own result;
- whether Codex could run tests/build/capture without owner navigation;
- whether important state changes were visible/reviewable in Git.

Agent operability is a production requirement for Wildkin, not a convenience.
