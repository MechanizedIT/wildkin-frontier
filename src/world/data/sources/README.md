# World Sources (Step 5 — optional split)

`src/world/data/world.json` remains the **single authoritative export** checked into git.

If you want to split authoring for large world work, create JSON partials here:

```
src/world/data/sources/01_regions.json
src/world/data/sources/02_visualAssets.json
src/world/data/sources/03_resourceDrops.json
```

On `npm run world:generate`, when this directory contains `*.json` files, the tool merges them deterministically (sorted file order) into `world.json` before validation and `world.generated.js` generation.

- Arrays with `id` fields are deduped by `id` (existing entries win)
- Top-level objects are shallow-merged
- Empty directory → no effect (plain `world.json` flow)

Keep `world.json` as the final commit artifact; do not edit `world.generated.js` or `world.js` directly.
