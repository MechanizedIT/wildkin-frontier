# Admission, game integration and source retention

Run the read-only GLB checker on the exact reviewed export:

```powershell
C:/Python310/python.exe tools/art/check-game-glb.py --input <model.glb> --profile creature --required-clips Idle Walk Attack Hurt --output <new-report.json>
```

Profiles are `creature`, `player` and `prop`. The checker measures geometry, textures, embedded dependencies, skin influences and clips. It cannot judge style, anatomy, deformation or phone FPS. Inspect its exit code and report. Do not weaken limits merely to make it pass; justify a class budget against the total package and measured rendering cost.

## Package one reviewed asset

`tools/art/package-game-asset.py --manifest <request.json>` validates and copies a new package, refusing existing destinations. The JSON contains:

```json
{
  "assetId": "example-creature-v1",
  "profile": "creature",
  "model": "relative/path/to/reviewed/model.glb",
  "scale": 1,
  "pivot": {"x": 0, "y": 0, "z": 0},
  "clips": {"idle": "Idle", "walk": "Walk", "run": "Run", "attack": "Attack", "hurt": "Hurt"},
  "locomotion": {"walk": 0.98, "run": 4.0},
  "reviews": {
    "reference": {"status": "pass", "reviewer": "actual independent reviewer", "sha256": "exact reference PNG hash"},
    "model": {"status": "pass", "reviewer": "actual independent reviewer", "sha256": "exact reviewed GLB hash"},
    "motion": {"status": "pass", "reviewer": "actual independent reviewer", "sha256": "exact reviewed GLB hash"}
  },
  "sourceFiles": [
    {"role": "reference", "path": "reviewed-reference.png"},
    {"role": "raw", "path": "generation/raw.glb"},
    {"role": "generation", "path": "generation/trial.json"},
    {"role": "optimization", "path": "reduction/manifest.json"},
    {"role": "blend", "path": "rig/character.blend"},
    {"role": "rig-profile", "path": "tools/art/rigs/fitted-profile.json"},
    {"role": "rig-report", "path": "rig/rig-report.json"},
    {"role": "reference-review", "path": "reference-review.md"},
    {"role": "model-review", "path": "model-review.md"},
    {"role": "motion-review", "path": "motion-review.md"}
  ],
  "provenance": {"imageTool": "OpenAI built-in image_gen", "imageModel": "undisclosed", "prompt": "exact reference prompt", "sourceReferences": ["owner-approved reference identity"]}
}
```

Paths are relative to the repository or absolute explicit input paths. For a prop, omit clips and motion review; preserve an editable Blender source and builder when reconstruction was used. Rig-profile/rig-report/motion-review sources are character-only requirements. Record real reviewer findings in the corresponding source files; the JSON declaration does not replace them. Keep optional provenance factual, including owner acceptance versus provisional agent decisions.

The package writes `assets/models/<assetId>/model.glb` and retains immutable raw/reference/Blender/receipt sources under `art/source/<assetId>/`. The asset receipt records hashes, budgets and model descriptor. `assets/` is copied to the game ZIP; raw geometry, references, scripts and Blender projects must stay outside it.

## Integrate through the shared visual path

Use the existing `world.visualAssets` ID rather than scattering model paths through gameplay code. Its additive descriptor is `model: {path, scale, pivot, clips, locomotion}`; paths are local `assets/models/.../model.glb`. The shared visual resolver preloads templates and clones each skeleton. Check runtime Play and Author preview via this same resolver. Primitive-level edits are disabled for external meshes; placement, metadata, collision and export remain available.

If changing canonical world data, update its authoring source and generated world together. Verify the asset's sibling uses: wild creature, companion, Author preview, static placement or player as relevant. Collision stays descriptor/capsule based. Preserve gameplay parent transforms, picking IDs, save data and local offline behavior. Update animation from the existing authoritative frame loop, never another RAF.

Check independent moving instances and disposal of one instance while another remains visible, state-triggered actions, correct forward orientation, feet placement, held tool attachment when relevant, and no shared-material damage from tint/fade. Review in the actual landscape game at a phone viewport and check console/resource failures. Ensure model URLs and embedded dependencies remain local in the packaged offline game.

Check the asset's immediate play space as well as its own collider. The earned Mossling journey exposed a lure placed on the far side of an existing Sapwood root: the player could place it, but the creature could not reach it. Lure/snare/perch admission must preserve both player and creature access before consuming gear. A clear endpoint alone is insufficient. A scenery replacement also needs an actual foreground orbit with the Explorer visible and an unaffected neighboring copy; generic fade tests missed the rejected geology's opaque foreground mass.

Distinguish model defects from locomotion defects. The same earned journey later found a correctly oriented Mossling immobile beside a root: its steering sweeps used swapped X/Z angles and an unscaled radius, while its actual controller used a smaller scaled capsule. Reproduce the observed pose/obstacle with the real collision runtime and check several approach directions before changing the mesh or gait. Probe direction, actor dimensions and non-solid sensor filtering must agree with actual movement. A null-physics taming test cannot establish obstacle navigation; an ordinary-input earned attempt must still close the repair.

Run project-required `npm test`, `npm run verify` and `npm run zip` after integration, plus focused browser/Author checks appropriate to the shared path changed. Record counts and package size. Report real-device sustained performance and owner aesthetic acceptance as pending unless actually tested. Append the project build log and retain the exact evidence supporting each accepted package revision.

## Harvestable assemblies

The Sapwood pass established a separate resource contract. Generate full and depleted references together, then review whether the same attachment joints actually correspond; two attractive images can depict different roots. Author one permanent root and complete removable ribs/branches with attached foliage. The current runtime recognizes named `_chunk_N` / `_tuft_N` assemblies, and `TreeStump` as the exact matching remnant. Do not leave a full trunk behind and add a second generic stump. Check full, partial, last remaining, empty, rear and regrown views.

Keep existing resource IDs, hit/yield counts, respawn timing, reach and collision footprint. Named assemblies take priority over individual mesh details. Legacy ungrouped assets distribute their parts over the existing hit count. Every resource instance owns its feedback materials while borrowing shared textures/geometry; a hit must not flash every nearby copy. Preserve authored tint, opacity and emissive through regrowth. Verify natural regrowth, occupied-collider deferral, extraction/death/new-expedition reset and Author visibility: introducing a hidden ready root also requires restoring it in every reset path.

Builtin resources do not necessarily have a library ID. Sapwood's single descriptor lives in `src/resources/resourceConfig.js` and is preloaded at bootstrap even for an older saved Author world; Play and Author share `createTreeVisual`. Keep the procedural recipe fallback for standalone tooling, and prove the actual GLB path in the browser rather than using fallback-only unit renders as art evidence. A library resource's different hit count or collision is a separate authored contract, not permission to silently replace it with the builtin's settings.
