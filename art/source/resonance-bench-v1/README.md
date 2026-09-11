# Resonance bench — refined articulated candidate

September 11, 2026. Built by `fabricator_model` with the installed Wildkin Asset Forge workflow and mechanical-props reference. The reviewed target is the right-hand station in `stations-v1.png`, authored by `crafting_targets` and independently reviewed by root. Source image SHA-256: `8a187ac89e883938ff0b24d730b5d35c73ab6d3505a97ed815086e20d13d2062`.

The reconstructed bench preserves the fitted seated violet crystal, paired inward resonator prongs, thick faceted ivory deck, slate feet/frame, control panel and practical stowed service cable. Cyan status/rotor indices unify it with the other stations. Rear access is an agent-designed compatible completion of the single-view reference. Exact design remains provisional until root's independent review and owner playtest.

- GLB: `resonance-bench.glb`
- SHA-256: `b778a84417ee76f83cf19df43848a5bc22468a86a06f8a1ba0fc32f7c95296e5`
- 4,486 triangles, 8,908 vertices; 317,580 bytes
- Three runtime mesh nodes, one material, one embedded 256×256 base-color PNG
- Texture SHA-256: `f0b544f1527b207ef6d5adac78cce88bef65ea06439427ca06f7968ffd70ecb2`
- 1.2995 m height; 1.4008 m width; 1.4845 m depth including cable and rear plate; grounded at Y=0; +Z front in glTF
- Editable source: `resonance-bench-editable.blend`, 125 named source components
- Reproducible builder: `tools/art/build-resonance-bench.py`

## Motion contract (actual exported glTF nodes verified)

`ResonanceBenchStructure` is static. Preserve its exported transform when cloning; its geometry remains in the reviewed world orientation.

`ResonanceRotor`: independent mesh, rest position `(0, 0.559, 0)`, identity rotation. Rotate local Y through any full circle. Its cyan phase indices make the purpose legible. No vertical translation is intended.

`ResonanceCrystal`: independent mesh, rest position `(0, 0.647, 0)`, identity rotation. Rotate local Y through any full circle, optionally lift by `0..0.055` metres relative to rest. This is the machine's seated reactor crystal, not a permanently fused crafted reward. Do not translate sideways into its retaining clamps or the prongs.

`CraftOutputAnchor`: static empty at `(0, 1.10, 0)`, above the seated reactor, for a separately removable crafted item. Runtime must size the output to clear the prongs and the lifted crystal; output appears on completion with crystal returned to rest.

The fresh GLB was rendered from front, three-quarter and rear. `review/game-scale-844x390.png` includes the actual Explorer surface staged at 1.60 m using evaluated Idle bounds. `review/operating-rotated-lifted.png` shows the rotor turned and crystal at its maximum allowed lift. The actual imported mesh node is selected for Explorer staging; importer bone display shapes are excluded.

`glb-check.json` passes the unchanged prop structural budget. All owned Blender jobs finished. Runs were bounded to four threads and small renders. This is model/staging evidence only: independent shape admission, a complete actual runtime operating cycle, two-instance isolation, pause/travel/reset and phone interaction remain root integration/review work. No shipping files, runtime changes, commits, paid services or full game test matrix belong to this subtask.
