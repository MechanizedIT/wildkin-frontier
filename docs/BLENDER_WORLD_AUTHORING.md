# Blender world authoring for Wildkin Frontier

This is an experimental visual-authoring workflow. It does **not** replace the live runtime yet. The goal is to let a human visually sculpt habitats and place scenery/gameplay markers in Blender while preserving Wildkin Frontier's current Three.js/Rapier runtime, asset registry, and 50 m streaming grid.

## Why this workflow

Current habitat work is mostly code-authored: terrain profiles, route ribbons, scenery placement, resources and encounter anchors are numeric JavaScript data. That is efficient for agents, but poor for direct art direction. Blender becomes the visual source for authored habitat content; Three.js remains the game runtime.

Recommended split:

- **Blender source (`.blend`)**: terrain sculpting, composition, prop placement, landmark layout, gameplay marker placement.
- **Git repository**: exporter tools, authoring configs, exported GLBs/JSON, runtime code.
- **External backup (Google Drive or similar)**: `.blend` source files. The repository intentionally ignores all `.blend` files.

## Region/file strategy

Use **one editable `.blend` file per habitat**. Do not build the whole continent in one giant Blender file and do not export the whole continent as one GLB.

For Rootbound, a practical source file is:

`Wildkin-Rootbound-Wildwood.blend`

The exporter creates roughly:

```text
assets/world-authored/rootbound-wildwood/
  manifest.json             # repeated asset placements + gameplay markers
  terrain.glb               # one habitat terrain mesh at first
  always.glb                # optional hero/always-loaded unique art
  unique-chunks/            # only truly unique streamed geometry
    -11_11.glb
    -11_12.glb
    ...
```

Repeated trees, bushes, stones, logs and other registered Wildkin assets are **not baked into every chunk GLB**. Blender exports their `assetId`, transform and chunk into `manifest.json`, so the runtime can keep using its existing cached/instanced assets. This avoids duplicating the same tree geometry across many files and keeps mobile memory/download costs under control.

### Terrain loading recommendation

For the first implementation, load **one terrain mesh for the active habitat** rather than splitting terrain into many tiny GLBs. Rootbound's authored footprint is about 200 m × 200 m, so this is a reasonable first experiment and avoids sculpt seams.

If terrain later becomes too heavy, split it into larger tiles (for example 100 m), export an authored heightfield, or add LOD. Do not begin with that complexity.

### Scenery streaming recommendation

Reusable scenery follows the game's existing 50 m chunk coordinate through placement records. A tree/log/rock belongs to the chunk containing its object origin.

Only genuinely unique geometry that cannot be represented by a registered asset goes in `WK_UNIQUE`; that geometry is exported to chunk GLBs.

The current game already streams world chunks around the player, so a future runtime adapter can activate authored placements and unique geometry alongside the same resident chunks instead of replacing the whole streaming system.

## Blender coordinate convention

Wildkin/Three.js uses:

- X = horizontal world X
- Y = up
- Z = horizontal world Z

Blender uses X/Y as the ground plane and Z as up. The authoring convention is:

- Blender X = game X
- Blender Y = **negative game Z**
- Blender Z = game Y / elevation
- 1 Blender unit = 1 meter

The add-on converts placement/marker positions automatically. Blender's glTF exporter handles visual scene axis conversion for GLB output.

## Install the add-on

After pulling the `blender-world-authoring` branch:

1. Open Blender.
2. Go to **Edit → Preferences → Add-ons**.
3. Choose **Install from Disk**.
4. Select `tools/blender/wildkin_region_authoring.py` from the repository.
5. Enable **Wildkin Region Authoring**.
6. In the 3D View, open the right sidebar (`N`) and choose the **Wildkin** tab.

The add-on targets Blender 4.2+.

## Start Rootbound

1. Create a new Blender file and save it outside Git, preferably in your Google Drive backup folder.
2. In the Wildkin panel choose **Initialize Wildkin Collections**.
3. Choose **Load Region Config** and select `authoring/regions/rootbound-wildwood.json`.
4. Rootbound's bounds, five subregion anchors, current main/optional route and important gameplay seeds appear as non-rendered guides.
5. Set **Export Root** to the repository's `assets/world-authored` directory.

The standard collections are:

- `WK_GUIDES` — route/bounds/reference helpers; never exported.
- `WK_TERRAIN` — sculpted habitat terrain; exported as `terrain.glb`.
- `WK_STATIC` — reusable registered game assets. Geometry is only for Blender preview; export writes placement records. Give each object `wk_asset_id`.
- `WK_UNIQUE` — one-off meshes/curves that really need their geometry exported; streamed by 50 m chunk.
- `WK_GAMEPLAY` — Empty objects that export as gameplay metadata.
- `WK_ALWAYS` — optional unique hero art loaded with the habitat, such as a major landmark.

## Sculpting terrain

A simple first terrain workflow:

1. Add a Plane sized to cover Rootbound's bounds (about 200 × 200 m).
2. Subdivide it to a moderate working density. Start coarse; do not create millions of vertices.
3. Apply scale (`Ctrl+A → Scale`).
4. Move it into `WK_TERRAIN`.
5. Use Sculpt Mode for broad height changes first: Grab, Smooth, Flatten/Scrape and similar brushes.
6. Preserve deliberate route widths and camera-readable shelves instead of adding uniform noise.
7. Use Multires/Subdivision only if the exported browser mesh stays reasonable after final reduction.

For Wildkin's faceted style, large readable landforms matter more than tiny sculpt detail.

## Painting terrain

Blender supports several useful authoring channels:

- **Vertex/Color Attributes** for low-cost biome/material masks and stylized tinting.
- **Texture Paint** when you need actual image textures.
- **Weight Paint / vertex groups** for masks such as grass density, wet soil, rock or no-spawn areas.

For the first Wildkin integration, prefer named Color Attributes or vertex groups over a complex splat-map shader. They are easy to inspect and can later be baked into the runtime's existing terrain/color logic.

Suggested experimental attributes/groups: `ground_color`, `foliage_density`, `no_spawn`, `wetness`, `rockiness`. The live runtime does not consume these yet.

## Placing reusable objects

Put repeated environment assets under `WK_STATIC`: trees, bushes, logs, common rocks, fungal clusters and other art already represented by a Wildkin asset ID.

For each object, add an Object Custom Property:

`wk_asset_id = "asset_rootbound_oak"`

Optionally add `wk_id` when the placement needs a stable authored identity. Keep these props upright and use Blender Z rotation for yaw; the exporter records position, yaw and scale.

The object's preview geometry is **not** exported from `WK_STATIC`. That means you can use linked Blender copies or proxy meshes freely without multiplying runtime asset bytes.

## Placing unique geometry

Put true one-off environment geometry under `WK_UNIQUE`, such as a bespoke ruin or root arch that has no reusable Wildkin asset entry. The exporter groups these by 50 m chunk and creates `unique-chunks/<cx>_<cz>.glb`.

If a supposedly unique object starts appearing repeatedly, promote it to the asset registry and move instances to `WK_STATIC` instead.

## Gameplay markers

Press **Add Gameplay Marker** to create an Empty under `WK_GAMEPLAY`.

In **Object Properties → Custom Properties**, set at minimum:

- `wk_type`: `resource`, `cache`, `wildkin-home`, `discovery`, `spawn`, `portal`, etc.
- `wk_id`: stable game identifier.

Additional primitive custom properties are exported too, for example `resource_type = "iron"`, `species = "trailgloam"`, `radius = 5.0`, `quantity = 3`.

Guides are not gameplay markers; replace/copy a guide into a real marker only when you decide its final location.

## Export

Choose **Export Wildkin Region**.

The add-on writes:

- `WK_TERRAIN` → `terrain.glb`
- `WK_ALWAYS` → `always.glb` when present
- `WK_STATIC` → reusable placement entries in `manifest.json`
- `WK_UNIQUE` → per-50 m unique chunk GLBs
- `WK_GAMEPLAY` → marker entries in `manifest.json`

To sanity-check an exported Rootbound folder from the repository root:

`node tools/validate-authored-region.mjs rootbound-wildwood`

## What is not wired into the live game yet

This branch deliberately stops before changing gameplay. Existing Rootbound code remains authoritative until an authored-region adapter is implemented and verified.

The next integration should be small and reversible: read the Rootbound manifest, use only its `WK_STATIC` placements for a short Meadow → first Gallery test while existing procedural terrain/collision remains authoritative, then compare that slice in actual play. Once the placement loop is proven, integrate terrain/collision and gameplay markers one owner at a time.

## Suggested first experiment

Do **not** rebuild all of Rootbound immediately. Visually author only the **Orientation Meadow → first Root Gallery** section: sculpt a readable rise, place 10–20 registered trees/logs/rocks, add one gameplay marker, export, and compare it against the current code-authored version on desktop and phone.

If that loop feels good to work in, expand to the rest of Rootbound.


## Load the actual current terrain

The region config alone creates guides; it does not contain a terrain mesh. To generate a Blender reference from the current game terrain:

```bash
node tools/export-authoring-terrain-reference.mjs rootbound-wildwood
```

This writes:

```text
authoring/reference/rootbound-wildwood-terrain-reference.json
```

In Blender, use **Wildkin → Load Terrain Reference** and select that file.

The add-on creates:

- `GUIDE_CURRENT_TERRAIN` — the actual terrain sampled from the current game, including Rootbound's existing code-authored structural profile.
- `GUIDE_BASE_TERRAIN` — the same world with the Rootbound structural profile disabled; hidden by default.
- route curves, zone markers and gameplay seed markers are projected onto the current terrain surface.

Choose **Create Sculpt Terrain from Reference** to duplicate the current reference into `WK_TERRAIN` as an editable mesh. Keep the original guide mesh untouched so it remains a before/reference surface.

The sampler defaults to the game's standard 2 m terrain spacing plus 20 m of context outside the habitat bounds.

## Blending neighboring terrain

Do not stitch habitat meshes by hand at a single hard border. Treat authored habitat terrain as a deformation over the shared continent surface.

Rootbound currently uses an 18 m blend collar. The config draws two boundary guides:

- `GUIDE_REGION_BOUNDS` — the outer habitat ownership boundary.
- `GUIDE_TERRAIN_BLEND_INNER` — the inner edge of the blend collar.

Inside the inner guide, sculpt freely. Between the inner guide and outer boundary, taper authored changes back toward the shared/base terrain. At the outer boundary, the authored terrain must match the shared base terrain.

This is the same basic seam strategy already used by the code-authored Rootbound profile: local relief fades into the common world instead of two unrelated meshes being expected to meet perfectly.

When a neighboring habitat is authored later, load/export enough padded reference terrain to see both sides of the shared edge. Each habitat keeps its own editable file, but both use the same underlying continent surface and both return to that shared surface at their ownership edges.
