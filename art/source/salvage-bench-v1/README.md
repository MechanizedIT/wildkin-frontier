# Salvage bench — articulated model candidate

September 11, 2026. `fabricator_model` built this from the left station of `stations-v1.png`, authored by `crafting_targets` and independently reviewed by root. Reference SHA-256: `8a187ac89e883938ff0b24d730b5d35c73ab6d3505a97ed815086e20d13d2062`. This is a bounded Blender hard-surface reconstruction, not image-to-3D output.

The bench uses a thick matte ivory tabletop, splayed slate frame/feet, functional lead-screw vise, supported amber fiber roll, empty component tray, cable loop and under-bench supply cases. The assembly pad stays clear. No reward/tool is fused into the output mounting point. The rear brace and shelf make the back structurally legible. No additional assembly robot arm was invented from the reference's manual vise/spool.

- GLB: `salvage-bench.glb`
- SHA-256: `a10713602f3ad98b0679e6f5a786d029ee5ee96081a21c94d37f6bb3575a9f54`
- 3,108 triangles, two runtime mesh nodes, one matte material and one embedded 256×256 base-color texture
- GLB size: 224,684 bytes
- Bounds: 1.970 m wide including vise crank; .9965 m deep; 1.277 m high; grounded at Y=0
- Editable source: `salvage-bench-editable.blend`, 84 named components
- Builder: `tools/art/build-salvage-bench.py`

## Exported motion contract

`SalvageBenchStructure` is static. `SalvageViseJaw` is the movable closed jaw/grip/slide assembly, rest translation `(-.397, .938, -.169)` in glTF. Its identity local axes align with the bench; translating local **X** by `[-.070, 0]` metres closes toward the fixed left jaw. At the closest pose the opposing grips remain about .0235 m apart. Keep all other axes and the screw/frame fixed. Do not extend beyond the declared negative range.

`CraftOutputAnchor` is a separate static empty above the clear front assembly pad at `(-.09, .875, .17)` in glTF. Root integration sizes and attaches the actual crafted item separately; the empty component tray is not a permanently fused output.

`review/front.png`, `review/three-quarter.png`, `review/rear.png`, `review/game-scale-844x390.png` and `review/operating-jaw-closed.png` render the actual fresh GLB. The scale view uses the shipping Explorer's evaluated Idle surface at 1.60 m, excluding Blender importer rig display shapes. The operating view moves the exported jaw to the maximum permitted closure.

`glb-check.json` passes the unchanged prop structural limits. Model-only evidence does not establish complete runtime-cycle readability, independent-instance behavior in the live game or physical-phone performance. Root independently judges the shape and later actual runtime motion. All owned four-thread Blender jobs finished; no shipping/world/base files, paid services, commits or aggregate test matrix were touched by this model subtask.

## Review and motion handoff

Root independently viewed the actual three-quarter, rear and game-scale closed-jaw images and admitted this exact hash for the runtime gate at **8.3/10**: coherent supported spool/vise/working pad, matching the left target, without floating hardware or crowding. This is root's shape review, not owner playtest acceptance.

The subsequent CPU-only extension to `src/base/stationMotion.js` adds kind `salvage`. Root maps saved record type `workbench` to that kind and owns asset registration/catalog/integration. The jaw makes one 2.2-second close → stationary hold → release cycle; local X delta remains within `[-.070, 0]`, reduced motion quarters travel, and completion/reset/disposal restores exact rest. `node --test tests/stationMotion.test.js` passes 16 tests across all three station kinds, including salvage instance isolation, safe full-cycle travel, pause, reduced motion and monotonic close/release with a non-vibrating hold. Actual game-camera operation remains the separate runtime review gate.
