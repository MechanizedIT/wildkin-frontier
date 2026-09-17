# Blender world authoring for Wildkin Frontier

This is an experimental visual-authoring workflow. It does **not** replace the live runtime yet. The goal is to let a human visually sculpt habitats and place scenery/gameplay markers in Blender while preserving Wildkin Frontier's current Three.js/Rapier runtime and 50 m streaming grid.

## Why this workflow

Current habitat work is mostly code-authored: terrain profiles, route ribbons, scenery placement, resources and encounter anchors are numeric JavaScript data. That is efficient for agents, but poor for direct art direction. Blender becomes the visual source for authored habitat content; Three.js remains the game runtime.

Recommended split:

- **Blender source (`.blend`)**: terrain sculpting, composition, prop placement, landmark layout, gameplay marker placement.
- **Git repository**: exporter tools, authoring configs, exported GLBs/JSON, runtime code.
- **External backup (Google Drive or similar)**: `.blend` source files. The repository intentionally ignores all `.blend` files.

## Region/file strategy

Use **one editable `.blend` file per habitat**. Do not export the entire continent as one monolithic GLB.

For Rootbound, a practical source file is:

`Wildkin-Rootbound-Wildwood.blend`

The exporter creates:

```text
assets/world-authored/rootbound-wildwood/
  manifest.json
  terrain.glb
  always.glb                # optional hero/always-loaded art
  chunks/
    -11_11.glb
    -11_12.glb
    ...
```

The habitat source can stay visually unified inside Blender, while exported static scenery follows the game's existing 50 m chunk grid. This gives you one comfortable editing scene without forcing the browser to load every prop on the continent at once.

### Terrain loading recommendation

For the first implementation, load **one terrain mesh for the active habitat** rather than splitting the terrain mesh into many tiny GLBs. Rootbound is only about 200 m × 200 m. This avoids visible terrain seams and makes sculpting pleasant.

If terrain later becomes too heavy, split it into larger 100 m tiles or build an authored heightfield/LOD pipeline. Do not begin with that complexity.

### Scenery streaming recommendation

Scenery is exported by the existing 50 m world chunk coordinate. A tree/log/rock belongs to the chunk containing its object origin. Linked Blender duplicates are encouraged so repeated art can share source mesh data.

The current game already streams world chunks around the player, so a future runtime adapter can load/unload the matching authored GLB chunks alongside those residents instead of replacing the whole streaming system.

## Blender coordinate convention

Wildkin/Three.js uses:

- X = horizontal world X
- Y = up
- Z = horizontal world Z

Blender uses X/Y as the ground plane and Z as up. The authoring convention is therefore:

- Blender X = game X
- Blender Y = **negative game Z**
- Blender Z = game Y / elevation
- 1 Blender unit = 1 meter

The add-on handles marker conversion automatically. Blender's glTF exporter handles the visual scene axis conversion for GLB output.

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

1. Create a new Blender file and save it somewhere outside Git, preferably your Google Drive backup folder.
2. In the Wildkin panel choose **Initialize Wildkin Collections**.
3. Choose **Load Region Config** and select:
   `authoring/regions/rootbound-wildwood.json`
4. Rootbound's bounds, five subregion anchors, current main/optional route and important gameplay seeds appear as non-rendered guides.
5. Set **Export Root** to the repository's `assets/world-authored` directory.

The standard collections are:

- `WK_GUIDES` — route/bounds/reference helpers; never exported.
- `WK_TERRAIN` — sculpted habitat terrain; exported as `terrain.glb`.
- `WK_STATIC` — trees, logs, stones, ruins and other streamed environment art.
- `WK_GAMEPLAY` — Empty objects that export as gameplay metadata.
- `WK_ALWAYS` — optional hero art loaded with the habitat, such as a major landmark.

## Sculpting terrain

A simple first terrain workflow:

1. Add a Plane sized to cover Rootbound's bounds (about 200 × 200 m).
2. Subdivide it to a moderate working density. Start coarse; do not create millions of vertices.
3. Apply scale (`Ctrl+A → Scale`).
4. Move it into `WK_TERRAIN`.
5. Use Sculpt Mode for broad height changes first: Grab, Smooth, Flatten/Scrape and similar brushes.
6. Preserve deliberate route widths and camera-readable shelves instead of adding uniform noise.
7. Use a Multires/Subdivision workflow only if the resulting browser mesh remains appropriate after export/decimation.

For Wildkin's faceted style, the final runtime terrain can stay comparatively low-poly. Large readable landforms matter more than tiny sculpt detail.

## Painting terrain

Blender gives you several useful options:

- **Vertex/Color Attributes** for low-cost biome/material masks and stylized tinting.
- **Texture Paint** when you need actual image textures.
- **Weight Paint / vertex groups** for authoring masks such as grass density, wet soil, rock, no-spawn or foliage zones.

For the first Wildkin integration, prefer named Color Attributes or vertex groups over a complex splat-map shader. They are easier to inspect and can later be baked into the runtime's existing terrain/color logic.

Suggested attributes/groups:

- `ground_color`
- `foliage_density`
- `no_spawn`
- `wetness`
- `rockiness`

These are proposed authoring names; the live runtime does not consume them yet.

## Placing objects

Put visual environment objects under `WK_STATIC`.

Good candidates:

- trees
- bushes
- logs
- rocks
- fungal clusters
- ruins
- root arches
- small environmental set dressing

Use linked duplicates/collection instances when repeating the same asset. The exported chunk is selected by the object's world-space origin.

Put a unique landmark that you always want present while Rootbound is active under `WK_ALWAYS` instead.

## Gameplay markers

Press **Add Gameplay Marker** to create an Empty under `WK_GAMEPLAY`.

In **Object Properties → Custom Properties**, set at minimum:

- `wk_type`: semantic type, e.g. `resource`, `cache`, `wildkin-home`, `discovery`, `spawn`, `portal`.
- `wk_id`: stable game identifier.

Add additional primitive custom properties as needed, for example:

- `resource_type = "iron"`
- `species = "trailgloam"`
- `radius = 5.0`
- `quantity = 3`

The exporter writes these into `manifest.json`. Guides are not gameplay markers; copy/replace them with real markers when you decide their final locations.

## Export

Choose **Export Wildkin Region**.

The add-on exports:

- `WK_TERRAIN` → `terrain.glb`
- `WK_ALWAYS` → `always.glb` when present
- `WK_STATIC` → one GLB per 50 m chunk
- `WK_GAMEPLAY` → `manifest.json`

Custom properties on exported geometry are also included as glTF extras.

## What is not wired into the live game yet

The first branch deliberately stops before changing the game runtime. Existing Rootbound code remains authoritative until an authored-region adapter is implemented and verified.

The next integration step should be small and reversible:

1. load `rootbound-wildwood/manifest.json` locally;
2. stream `chunks/<cx>_<cz>.glb` with the existing frontier chunk residency;
3. load `terrain.glb` only while Rootbound is active;
4. initially use Blender only for visual scenery while existing procedural terrain/collision remains authoritative;
5. once visual placement is proven, switch Rootbound terrain/collision to authored terrain or an exported heightfield;
6. finally migrate resource/Wildkin/discovery markers from code to the manifest one owner at a time.

This avoids trying to rewrite terrain, physics, ecology, persistence and scenery in one change.

## Suggested first experiment

Do **not** rebuild all of Rootbound immediately.

Use a copy of the current region guides and visually author only the **Orientation Meadow → first Root Gallery** section:

- sculpt a readable rise;
- place 10–20 trees/logs/rocks;
- create one resource marker;
- export it;
- integrate that slice in the game;
- compare it against the current code-authored version on desktop and phone.

If that loop feels good to work in, expand to the rest of Rootbound.
