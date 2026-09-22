# Infinite destructible voxel world — product and engineering plan

**Status:** approved product direction; implementation architecture is a reviewed recommendation until the spike gates below pass.
**Owner direction:** September 21, 2026.
**Scope of this document:** plan only. It does not admit a voxel runtime, change saves, or resume Blender world authoring.

**Phase 0 implementation and smooth refinement:** the fresh September 21 instruction authorizes the isolated lab only. Chris subsequently requested “voxels that are smooth, like space engineers, but maybe smaller voxels so that a minecraft size block can be smoothed.” Smooth destructible density terrain is now the target, superseding the provisional one-metre/block-only starting point below. The lab compares 0.5 m and 0.25 m sample spacing, 16³/32³ cubic chunks, Surface Nets and marching tetrahedra. The original block meshers remain measured baselines. These sample sizes and algorithms are provisional engineering choices; no shipping-world migration is authorized. [Evidence and gate](VOXEL_PHASE0_REPORT.md).

## 1. Locked direction

The following are owner decisions, not provisional agent recommendations:

- Wildkin Frontier is now **web/PC first**. Mobile remains supported in **landscape**, with adaptive quality and touch controls; portrait is no longer the primary composition target.
- The explorable world is **procedurally generated and effectively infinite**, with no authored horizontal edge and no fixed vertical build/depth layers.
- Environmental matter is voxel-based and destructible. Terrain, constructed matter, world props, and large harvestables must have an explicit destruction path rather than indestructible decorative exceptions.
- The vertical data model uses **cubic chunks**: independently addressable X/Y/Z chunk cells, streamed around the player rather than full-height columns.
- Existing preset-part harvestables remain useful. They will gain part/material-aware multi-drop tables, while large harvestables such as Avatar-scale trees may be voxel structures.
- Unsupported voxel components become physical. Material determines durability, eligible tools, yields, mass, fracture behavior, and feedback.
- Blender world-authoring production is paused. Blender may later make reusable source ingredients, but it does not own the runtime world.

“Infinite” is a world-generation and streaming promise, not a claim of infinite RAM or mathematical coordinates. The runtime will generate on demand, keep a bounded resident neighborhood, use a floating origin, and impose only a practically unreachable integer-coordinate safety limit. There is no designed surface ceiling, floor, or finite continent boundary.

## 2. Product promise

The target experience is an alien frontier that can surprise the player at every scale:

1. Travel from a recognizable home region into an unknown habitat whose silhouette, terrain, ecology, materials, hazards, and rewards form one coherent identity.
2. Read the land: ridges, strata, growth, color, weathering, and Wildkin behavior hint at what is above, below, and worth harvesting.
3. Alter the world permanently: cut a route, mine a cavern, fell a tree, undermine a formation, build shelter, or expose a buried ecology.
4. See matter respond: the correct tool works faster, each material yields its own products, separated masses fall or fracture, and the saved world remembers the change.
5. Return with resources and individual Wildkin that make later exploration, construction, care, and crafting more expressive.

The design pillars remain exploration first, individual Wildkin second, and building/crafting/care third. The voxel world strengthens those pillars; it must not turn the game into a featureless block sandbox or a procedural resource treadmill.

## 3. Core design rules

### 3.1 Coherence before randomness

A habitat is generated from a stable **habitat genome**, not a bag of independent noise values. Its landforms, strata, palette, plants, harvestables, wildlife, hazards, atmosphere, landmarks, and reward economy derive from the same causes.

### 3.2 Every visible environmental thing declares its destruction contract

Each environmental object is one of:

- voxel matter;
- a destructible preset assembled from parts/materials;
- a transient effect with no persistent physical matter, such as fog or a particle;
- an explicitly non-environmental entity, such as the player or a Wildkin, which uses health/behavior rather than voxel deletion.

There is no permanent decorative rock, tree, ruin, or fence that silently ignores the Field Tool. Far-detail impostors are presentation only and resolve to destructible source data before interaction range.

### 3.3 Generated base plus saved differences

The seed and generator version recreate untouched terrain. Saves store edits, persistent entities, and player-authored structures—not a copy of the whole generated world.

### 3.4 Local simulation, global illusion

Generation may be infinite, but expensive work is bounded around relevant players and edits. Meshing, lighting, physics, collapse solving, liquids, wildlife, and ecology have separate resident budgets.

### 3.5 Determinism is a player-facing feature

The same world seed, generator version, coordinate, and edit log must produce the same world. Stable identity supports saves, screenshots, bug reproduction, shared seeds, and future co-op possibilities without promising multiplayer now.

## 4. Recommended technical shape

### 4.1 Keep the existing foundation

Retain:

- Three.js, the one authoritative `requestAnimationFrame` loop, and the existing fixed-update discipline;
- Rapier as the sole physics engine;
- the kinematic character controller, camera/input abstractions, inventory/equipment concepts, Wildkin state, audio/feedback systems, and offline package discipline;
- vanilla modules and readable source;
- local runtime assets with no required backend or CDN.

The voxel transition is a world-kernel replacement and integration, not a total rewrite of every game system.

### 4.2 Do not adopt a full server-centric voxel engine

Voxelize is a serious current Three.js/Rust/WASM voxel engine and an excellent reference. Its complete architecture assumes an authoritative Rust server, WebSockets, protocol packages, and a substantially larger framework. That conflicts with Wildkin Frontier’s offline, single-player, simple-client ownership model.

Use selected components only after an isolated license/API/performance spike:

| Candidate | Decision | Reason |
| --- | --- | --- |
| Three.js 0.160 | keep initially | Existing renderer and asset pipeline; avoid combining an engine rewrite with a renderer migration. |
| Rapier 0.20 | keep | Already owns movement/collision; supports static triangle meshes and compound shapes needed here. |
| `fastnoise-lite` | recommended | Small MIT JavaScript/TypeScript implementation with 2D/3D coherent noise, cellular noise, fractals, and domain warp. Vendor the exact reviewed source. |
| `@voxelize/wasm-mesher` | spike first | MIT, compact published WASM mesher. Adopt only if its block/material/light format, worker use, seams, and deterministic output fit without pulling in Voxelize core/server ownership. |
| `block-mesh-rs` via a tiny local WASM wrapper | fallback candidate | Focused MIT/Apache greedy meshing library with clear chunk padding. More build ownership, but less framework coupling. |
| `@voxelize/raycast` | optional comparison | Small MIT package, but a local grid DDA is simple, deterministic, and avoids mesh/BVH rebuild dependencies. |
| `three-mesh-bvh` | optional, non-core | Useful for complex non-voxel meshes and diagnostics; voxel selection should use grid DDA and near voxel collision should remain Rapier-owned. |
| Native IndexedDB + StorageManager | keep native | No backend; supports large asynchronous origin storage, quota estimates, and persistence requests. Wrap it behind one world-delta owner. |

Do not add the complete `@voxelize/core`, a second physics engine, React, an ECS, or a required runtime service. If neither tested mesher meets the contract, implement the smallest project-owned greedy mesher in a worker using the published algorithms, with the reason and benchmark recorded.

### 4.3 Cubic chunk model

Recommended starting candidate, subject to the Phase 0 benchmark:

- **Voxel size (superseded starting proposal):** 1 metre block cells. The active smooth spike compares persistent scalar samples at 0.5 m and 0.25 m instead; surface vertices interpolate between samples.
- **Storage chunk:** 32 × 32 × 32 voxels (32 m cube).
- **Mesh dirty region:** eight 16³ octants inside a storage chunk, so one edit need not rebuild the entire draw geometry.
- **Border data:** one-voxel padded neighbor shell for correct faces, ambient occlusion, lighting, and connectivity.
- **Persistence region:** 8 × 8 × 8 storage chunks, independently indexed; only changed chunks are written.
- **Global address:** signed integer chunk X/Y/Z plus local 0–31 voxel coordinates. No code may assume Y is non-negative or bounded to a surface column.
- **Floating origin:** render/physics coordinates are relative to the current origin anchor; global chunk coordinates remain stable across shifts.

The spike must compare 16³ and 32³ storage chunks before this becomes accepted. The decision should be based on edit latency, mesh/collider cost, draw count, memory, save overhead, and mobile landscape behavior—not tradition.

### 4.4 State ownership

Proposed module boundaries:

| Owner | Responsibility |
| --- | --- |
| `WorldCoordinates` | Negative-safe floor division, global chunk/voxel keys, floating-origin transforms. |
| `VoxelChunkStore` | Authoritative resident voxel/material/light arrays and revision numbers. |
| `WorldGenerator` | Pure seed + coordinate → untouched voxel data, structure plans, and semantic fields. |
| `HabitatGenerator` | Habitat genomes, ecotones, terrain grammars, ecology/resource recipes, landmark plans. |
| `ChunkStreamer` | Priority queues and bounded lifecycle for requested/generated/meshed/physical chunks. |
| `VoxelMesher` | Worker/WASM meshing, neighbor seams, AO/light/material vertex data, cancellation. |
| `VoxelPhysicsBridge` | Rapier static chunk colliders and dynamic detached-component bodies. |
| `VoxelEditService` | Validated, transactional edits; the only authority that changes persistent world matter. |
| `SupportSolver` | Local structural connectivity, anchored support, detached-component extraction, collapse budgets. |
| `HarvestResolver` | Material/tool/part → damage, yields, feedback, XP, and pickup batches for both voxels and presets. |
| `WorldDeltaStore` | IndexedDB journal, chunk compaction, save version, import/export, quota/error behavior. |
| `VoxelWorldRuntime` | Composition and scheduling only; exposes bounded queries to movement, camera, creatures, and UI. |

`src/main.js` wires these owners and advances their budgets through the existing loop. Generation, meshing, persistence, and support analysis run in workers; workers never mutate live gameplay state directly. Results include source revisions and are discarded if stale.

### 4.5 Transaction flow

Every edit follows one chain:

`input/tool → voxel/preset ray hit → tool/material validation → edit transaction → durable journal intent → authoritative voxel/part mutation → dirty mesh/light/collider/support queues → yield transaction → visible/audio feedback → compacted persistence`

An edit is never inferred from a disappearing mesh. The data change owns rendering, physics, drops, support, save state, and tests.

## 5. Infinite world generation

### 5.1 Coordinate-independent random streams

Every generation layer uses hashed integer coordinates and named seed salts. Never advance one global random number generator while visiting chunks; visit order, worker count, and reload timing must not change the world.

Recommended hierarchy:

1. **World seed** — immutable identity.
2. **Macro sector** — approximately 2–8 km, owns broad tectonic/climate direction and habitat candidate graph.
3. **Habitat cell** — approximately 300–1,500 m with irregular Voronoi-like boundaries and a stable genome.
4. **Landform district** — 64–300 m structures such as mesas, hollow trunks, chasms, terraces, cave mouths, reefs, and root fields.
5. **Chunk fields** — voxel density, material strata, caves, local water, and support tags.
6. **Micro placement** — harvestable presets, plants, debris, tracks, nests, caches, and encounters.

### 5.2 Habitat genome

Each habitat genome contains coupled traits:

- macro relief and vertical amplitude;
- erosion/weathering family;
- strata orientation, thickness, fracture, hardness, porosity, and ore families;
- heat, moisture, wind, light exposure, acidity/toxicity, and supernatural anomaly fields;
- cave density, cave topology, aquifer behavior, arches/overhangs, and sky exposure;
- two dominant, one supporting, and one rare material family;
- dominant vegetation architecture and four scale bands;
- harvest economy, tool pressure, Wildkin niches, hazards, traversal verbs, and landmark grammar;
- sky/fog/light/audio palette and weather tendencies;
- ecotone rules for each neighbor.

The generator creates several deterministic candidates per habitat cell, scores them against immediate neighbors, and selects the candidate with the greatest meaningful feature distance while respecting the macro climate. This strongly suppresses adjacent repeats without requiring an ever-growing global history database.

“No two habitats are the same” should mean no repeated full genome/composition, not that every material or plant is unique. Reusing readable ingredients in new geological and ecological relationships creates learnable diversity rather than random noise.

### 5.3 Terrain grammar library

Build terrain from composable signed-density operators and material rules:

- ridged uplifts, tilted plates, folded strata, terraced shelves, calderas, basins, dunes, drumlins, and needle fields;
- cellular fracture networks, columnar faults, polygonal crusts, honeycomb erosion, and ribbed mineral reefs;
- domain-warped tunnels, lava tubes, slot canyons, cavern chambers, sinkholes, arches, bridges, and undercuts;
- giant root lattices, petrified forests, fungal towers, coral-like stone, glass dunes, magnetic spires, and hollow megaflora;
- vertical sequences: surface, root/debris zone, sediment/strata, deep biomes, anomaly layers, and rare void/cavern ecologies—with no fixed bottom;
- rare authored-style landmark stamps built from the same voxel/material rules.

Use low-frequency structure before high-frequency detail. Each grammar declares traversal widths, safe-slope fields, landmark visibility, resource logic, collapse expectations, and LOD behavior. Noise supplies variation inside the grammar; it does not replace composition.

### 5.4 Ecotones

Transitions are places, not color lerps. A boundary receives its own deterministic grammar: one habitat may intrude along water, another along exposed ridges, roots may cross into mineral seams, wildlife may patrol a shared feeding corridor, and hybrid resources may appear only in the overlap. Ecotones should normally span 80–400 m depending on scale and contrast.

### 5.5 Route and landmark planning

Before chunk voxelization, each habitat cell plans:

- one distant silhouette/hero landmark;
- two or more meso landmark families;
- an accessible traversal network with open, medium, and dense rooms;
- at least one safer readable route and one richer/high-risk route;
- entrances to meaningful vertical play—caves, climbs, falls, canopy routes, or deep shafts;
- resource and Wildkin opportunities tied to visible causes;
- return cues and Camp/waypoint suitability.

Voxel generation then reserves these volumes while allowing local variation. This preserves designed exploration inside a procedural world.

## 6. Materials, tools, destruction, and drops

### 6.1 Material definition

Each voxel material declares at minimum:

```text
id, tags, renderLayer, texture/material set,
hardness, toughness, mass, cohesion, supportClass,
preferredToolTags, minimumToolTier, damageMultipliers,
yieldTableId, impactProfile, fractureProfile,
lightAbsorption, emission, permeability, regrowth/reaction rules
```

Tools declare action tags, tier, damage by material class, reach, area pattern, energy/cooldown, and feedback. An under-tier tool may fail, chip slowly, or yield inferior material as explicitly defined; failure is visible and audible.

### 6.2 Unified yield tables

One yield resolver serves voxel materials and preset parts. A table supports:

- guaranteed outputs;
- weighted or ranged secondary outputs;
- tool requirements and tool-quality modifiers;
- part/material conditions;
- habitat/season/maturity conditions when later approved;
- batch limits so destroying many voxels does not spawn hundreds of pickup bodies.

Example small fruit tree:

- trunk parts → logs, sometimes bark;
- branch parts → sticks, sometimes fiber;
- fruit sockets → the currently grown fruit;
- stump/root part → wood/root fiber and the regrowth owner;
- burning, crushing, or under-tier damage may change or reduce yields.

The existing `resourceId` single-drop field becomes a compatibility adapter during migration, not a second permanent loot system.

### 6.3 Preset harvestables

Keep preset-part nodes for small and medium authored silhouettes where mesh detail is valuable. Each part has a material, health/cohesion, drop table, optional child parts, and structural links. Removing a trunk can detach its canopy/branches using the same support concepts as voxels. Existing depletion/regrowth identity can be migrated to stable preset instance IDs.

### 6.4 Voxel mega-harvestables

Giant trees, mineral reefs, fossil skeletons, huge fungal towers, and ruins are structure plans stamped into voxel chunks. A structure manifest records:

- stable structure ID and seed;
- occupied chunk bounds;
- semantic material zones (heartwood, sapwood, bark, leaves, fruit, crystal core, etc.);
- explicit anchor/support zones;
- special sockets for non-voxel fruit, nests, doors, creatures, or VFX;
- optional growth/regrowth stages;
- landmark and map metadata.

The stamp is generated per chunk from the manifest; the whole tree is never required in memory at once.

### 6.5 Unsupported-matter solver

After a destructive edit, solve only the affected neighborhood:

1. Mark edited voxels and neighboring support nodes dirty.
2. Flood/union connected solid matter across resident chunk borders using material cohesion rules.
3. Treat components touching the boundary of the evaluated bulk as conservatively supported; schedule wider verification only when the cut could have closed every support path.
4. Treat explicit anchor materials/structure anchors as supported. This allows intentional alien levitation or deep-rooted landmarks without hidden indestructibility.
5. Extract newly unsupported components into physical actors under strict size and time budgets.

Recommended collapse tiers, tuned by measurement:

- **1–256 voxels:** one dynamic body, one combined render mesh, greedy compound cuboid colliders.
- **257–4,096 voxels:** partition into a small number of coherent clusters along weak/fracture planes.
- **larger components:** staged collapse—freeze interaction briefly, create a bounded set of major pieces, convert excess mass to visual rubble/material drops, and persist the final removed/settled voxels.

Never create one rigid body per voxel. Cap active debris bodies, compound collider boxes, sleeping time, and pickup count separately for PC and mobile. Dynamic trimeshes are not the default; use compound cuboids or validated convex pieces.

If support evidence crosses an unloaded boundary, fail safely as supported until required neighbor summaries are available. A player should never lose a giant structure because a chunk happened to unload.

### 6.6 Landing and settlement

Detached components have stable actor IDs and a lifecycle:

`DETACHED → ACTIVE → SLEEPING → SETTLED or FRACTURED → PERSISTED`

Small settled components may voxelize back into empty grid cells if alignment and overlap rules pass. Otherwise they remain bounded persistent debris actors or convert to rubble/drop records. Save before deleting the last authoritative representation.

## 7. Rendering and lighting

### 7.1 Near field

- Generate exposed surfaces, never individual cube meshes.
- Use greedy meshing grouped by compatible material/light/AO state.
- Use texture arrays or atlases, triplanar/world-aligned detail, per-face variation, vertex ambient occlusion, and restrained bevel/normal treatment for polish.
- Keep transparent fluids/foliage in separate bounded passes.
- Rebuild only dirty mesh octants and their affected borders.
- Swap meshes atomically after a complete worker result; keep the previous mesh until replacement is ready.

### 7.2 Far field and LOD

Use a concentric 3D clipmap:

- full editable voxel meshes around the player;
- coarser voxel/surface meshes at 2×, 4×, and 8× sample scale;
- very distant horizon meshes generated from macro density/height summaries;
- structure impostors only outside interaction and destruction range.

LOD seams require skirts or transition meshes and matching density samples. Far meshes are disposable views of source data; an approaching player always resolves the full chunk before collision or edits.

### 7.3 Lighting

Stage lighting rather than blocking the project on a perfect Minecraft clone:

1. Directional sun, hemisphere/sky exposure, fog, material emission, and mesher AO.
2. Incremental skylight propagation inside resident cubic chunks, including caves and opened roofs.
3. Bounded colored block-light propagation for emissive flora/minerals.
4. Optional higher-end PC shadows and contact treatment; mobile uses fewer shadow casters and shorter distances.

Lighting revisions are separate from voxel revisions but use the same stale-result protection.

### 7.4 Fluids

Do not make full infinite fluid simulation a prerequisite for the voxel foundation. First ship stable water bodies and source surfaces that respond to terrain openings locally. Later add a bounded cellular flow simulation around edits, with inactive chunk summaries and hard update caps. Lava, gases, weather erosion, and large-scale hydrology remain later systems unless separately approved.

## 8. Physics, traversal, creatures, and camera

- Build one Rapier static collider per resident near mesh octant or chunk, replaced only when its mesh revision changes.
- Preserve the existing character controller and terrain slope/slide/fall ownership; validate it against vertical faces, stairs, rubble, caves, and moving debris.
- Use voxel DDA for Field Tool targeting, line-of-sight, placement previews, and block selection. Use Rapier for body motion/contact and broader entity collision.
- Creature navigation begins with local walkability grids built from voxel surfaces. Nav data is another cancellable chunk product; flying/climbing/burrowing species get focused mobility layers later.
- Camera collision queries the same current physical revisions and must cope with caves, low ceilings, falling components, and origin shifts.
- Floating-origin shifts occur only at a safe fixed-update boundary and translate Three/Rapier/entity locals together. Global save coordinates never change.

## 9. Persistence and offline ownership

### 9.1 Save separation

Use separate stores for:

- profile/campaign, inventory, Wildkin, equipment, and Camp progression;
- world manifest: seed, generator version, mods/content version, origin, timestamps;
- per-chunk voxel delta snapshots;
- append-only edit journal since the last compacted snapshot;
- persistent preset instances, detached components, structures, containers, discoveries, and ecology state.

### 9.2 Chunk delta format

An untouched chunk has no save record. A changed chunk stores:

- chunk coordinate and base-generation fingerprint;
- monotonic revision;
- palette-compressed sparse changes or a compact full snapshot when edit density crosses a measured threshold;
- light only if it cannot be regenerated cheaply;
- persistent entity references and structure metadata;
- checksum/version.

Compact journals asynchronously. Never block the frame loop on IndexedDB. A failed write leaves the prior durable revision authoritative and presents a retryable warning before irreversible reward/removal effects.

### 9.3 Browser storage realities

- Request persistent storage where supported and show actual usage/quota diagnostics.
- Define soft save budgets and warn before quota exhaustion.
- Provide explicit world export/import as a portable archive.
- Test eviction, denied persistence, private browsing, partial transactions, tab close, and corrupt records.
- A packaged/local build must remain playable offline after initial load.

### 9.4 Existing saves

The terrain model is not compatible with the finite continent. Use a new world namespace and generator version. Preserve the old save as an importable/read-only legacy snapshot during the transition; migrate durable player inventory/Wildkin only through an explicit, tested conversion after the new item catalog stabilizes. Do not silently project old coordinates into the voxel world.

## 10. Web/PC-first and mobile-landscape profiles

### Desktop target

- keyboard/mouse and controller are first-class;
- 1080p, 60 fps target on a defined midrange test machine;
- larger view/physics radii, colored voxel lights, longer shadows, and more debris;
- resizable window and common ultrawide/16:10 layouts.

### Mobile landscape compatibility

- landscape touch layout with left movement and right camera/action regions;
- 30 fps floor on the chosen supported reference phone, adaptive resolution/DPR, smaller residency and debris budgets;
- no tiny desktop UI or hover-only action;
- pause generation/meshing priorities on thermal pressure, backgrounding, or severe frame debt;
- test 16:9, 19.5:9, notches/safe areas, controller-on-mobile, and touch conflicts.

Portrait may remain a graceful “rotate device” or low-priority fallback, but new habitat composition and HUD acceptance use desktop and mobile landscape views.

### Initial performance budgets

These are engineering targets to validate, not already-proven claims:

| Budget | PC target | Mobile landscape target |
| --- | ---: | ---: |
| Steady frame | p95 ≤ 16.7 ms | p95 ≤ 33.3 ms |
| Main-thread streaming hitch | p99 ≤ 8 ms incremental work | p99 ≤ 12 ms |
| Resident voxel-world memory | ≤ 750 MB | ≤ 300 MB |
| Active dynamic debris bodies | 64 | 20 |
| Physical pickup actors | 96 | 32 |
| Full-resolution chunk radius | benchmark-selected, initial 6–8 horizontal / 4 vertical | initial 3–4 horizontal / 2–3 vertical |
| New/edited chunk visible | < 150 ms typical | < 350 ms typical |

Worker throughput is measured separately; asynchronous work may exceed a frame but must be cancellable, prioritized, and unable to stall input/render.

## 11. Migration from the current game

### Reuse directly

- Three/Rapier boot, fixed loop, core movement states, combat timing, feedback/audio, inventory concepts, Wildkin identity/care, UI state blocking, and offline build tooling.
- Current harvest visuals and resources as compatibility fixtures.
- Existing habitat art/dossiers as grammar inspiration and benchmark scenes.

### Adapt behind new interfaces

- Field Tool targeting and impact;
- resource drops and inventory catalog;
- camera terrain collision;
- creature support/navigation/home logic;
- Camp/base placement;
- atlas/discovery and resume position;
- save lifecycle and world identity.

### Replace as world authority

- finite continent/coast boundary;
- heightfield-only `frontierTerrain` authority;
- 2D chunk coordinates and surface-only streaming;
- fixed ten-site habitat allocation;
- static world JSON as the complete terrain/content instance list;
- indestructible scenery and single-resource harvest node assumptions.

Current authored region code remains a regression reference until the voxel vertical slice proves a complete playable outing. Do not delete it during the lab phase.

## 12. Delivery sequence and gates

### Phase 0 — Voxel lab and library decision

Build an isolated developer lab, not yet the shipping world:

- negative X/Y/Z cubic addressing and floating origin;
- deterministic seed generation with FastNoise Lite;
- compare 16³ and 32³ chunks;
- compare `@voxelize/wasm-mesher`, a `block-mesh-rs` wrapper, and only if necessary a minimal JS worker mesher;
- under the owner's smooth refinement, retain those block baselines and compare Surface Nets/marching tetrahedra at 0.5 m and 0.25 m; scalar DDA selection must resolve a real surface hit and matching material sample;
- material faces/AO, border seams, one edit, worker cancellation, and stale revision rejection;
- Rapier collider replace, character walk, voxel DDA selection;
- IndexedDB edit/reload;
- cut a bridge and make the detached piece a bounded physical actor;
- desktop and real mobile-landscape benchmark.

**Exit:** one evidence report chooses chunk size and mesher; no visible seams, no stale mesh/collider after rapid edits, deterministic hashes across worker counts, literal reload retains edits, and performance/memory fall within an agreed budget. No production migration before this passes.

### Phase 1 — World kernel

Implement coordinates, chunk store, worker protocol, streamer, mesh/collider lifecycle, origin shifting, delta store, diagnostics, and pure tests. Render one endless neutral material world with caves and vertical travel.

**Exit:** travel across multiple origin shifts and at least ±1 km vertically; edit and reload boundary voxels; no chunk leaks; single loop preserved; offline package works.

### Phase 2 — Alien terrain and habitat vertical slice

Implement the habitat genome, two sharply different terrain grammars, one meaningful ecotone, strata/material assignment, one cave/deep layer, a route/landmark planner, and the developer habitat inspector.

**Exit:** three seeds × multiple cells show coherent non-repeating landform identities, a normal-input route, visible verticality, stable seams/LOD, and reproducible capture coordinates.

### Phase 3 — Destruction, tools, and persistence

Implement material/tool rules, transactional voxel edits, multi-drop yield tables, pickup batching, support solving, collapse tiers, and crash/quota behavior.

**Exit:** mine, cut, undermine, collapse, collect, leave/reload/return; no duplicates or lost durable edits; cross-chunk support and unloaded-boundary cases pass.

### Phase 4 — Harvestable bridge

Migrate one current small tree into part/material/yield definitions and create one voxel giant tree with trunk/sapwood/bark/leaves/fruit zones.

**Exit:** small tree yields distinct sticks/logs/fruit from readable parts; giant tree can be cut, partially mined, detached, physically fall/fracture, yield material-appropriate items, and reload exactly.

### Phase 5 — Gameplay integration

Reconnect inventory, equipment, Camp construction, Wildkin navigation/abilities, atlas/discovery, combat, death/resume, and progression to the voxel world. Establish a new save namespace.

**Exit:** one complete desktop journey—spawn, explore a generated habitat, harvest preset and voxel matter, encounter a Wildkin, build/place something, return/reload—plus the important failure/retry path.

### Phase 6 — Habitat production kit

Create data-driven grammar authoring tools, seed search, habitat comparison gallery, route/readability diagnostics, material economy audits, and repeatability/novelty scoring. Convert the strongest current habitat concepts into genome/grammar families.

**Exit:** at least six high-quality habitat families can recombine into many coherent genomes without palette-only repetition; independent design review approves terrain, traversal, ecology, resource logic, and landmark readability.

### Phase 7 — Polish and release candidate

Add staged voxel lighting, better materials, weather/atmosphere, audio zones, debris polish, accessibility, controller/touch refinements, robust world export/import, and long-session soak tests.

**Exit:** defined PC target meets 60 fps and reference mobile landscape meets 30 fps on representative routes; long travel/destruction/save soak is stable; package is offline; owner playtest accepts feel and diversity.

## 13. Verification strategy

### Pure/deterministic tests

- negative coordinate conversion and exact chunk-border ownership;
- seed/hash stability independent of visit order and worker count;
- identical border samples and meshes from adjacent chunks;
- material/tool/yield tables and multi-drop conservation;
- support graphs within and across chunks, anchors, unloaded boundaries, size tiers;
- journal idempotence, compaction equivalence, checksums, interrupted writes, import validation;
- habitat candidate selection, neighbor-distance rules, and forbidden repetition fixtures.

### Runtime tests

- rapid edit while generation/meshing is in flight;
- collider revision exactly matches visible revision;
- walk/jump/slide/fall/camera contact over edits, rubble, caves, and moving components;
- origin shift with player, Wildkin, pickups, debris, particles, camera, and audio together;
- load/unload/reload with edits on all six chunk faces;
- death, resume, storage failure, page hide, and export/import.

### Perceptual/design proof

- matching seed/camera captures at arrival, traversal, landmark, cave/depth, and ecotone;
- desktop and mobile-landscape HUD/action readability;
- human-observable tool mismatch, fracture, collapse, pickup, and save feedback;
- habitat scorecard for silhouette, terrain/verticality, routes, ecology, material economy, diversity, and performance.

### Performance proof

- generation, mesh, light, collider, save, support, and origin-shift timings separately;
- p50/p95/p99 frame times, not average FPS alone;
- cold start, sprint/fly streaming, mass edit, giant collapse, and 60-minute soak;
- heap/GPU/IndexedDB growth and eviction behavior;
- real phone landscape test, not only emulated viewport.

## 14. Principal risks and controls

| Risk | Control |
| --- | --- |
| Scope becomes an endless engine project | Phase gates produce a playable vertical slice early; defer fluids, WebGPU, smooth dual contouring, and global simulation. |
| Procedural world feels like noise | Habitat genomes, route/landmark planning, constrained grammars, ecotones, and independent normal-camera review. |
| “Everything destructible” destroys performance | Mesh surfaces rather than cubes; worker budgets; support analysis only after relevant edits; collapse tiers and actor caps. |
| Infinite saves exhaust browser quota | Generated base + sparse deltas, compaction, quota UI, persistent-storage request, export/import, soft caps. |
| Giant collapse explodes physics | Clustered compounds, staged fracture, strict collider/body caps, settle/rubble conversion. |
| Mobile landscape falls too far behind | Same authoritative data with smaller radii/lighting/debris budgets; required real-device gate in every core phase. |
| Floating origin breaks saved/entity state | Integer global coordinates stay authoritative; origin changes are atomic fixed-step presentation/physics transforms. |
| Library lock-in or abandoned package | Small vendored components behind project interfaces; record exact version/license/hash; keep a measured fallback. |
| Old systems create parallel authorities | Compatibility adapters expire by phase; each contract has one new owner and explicit removal gate. |
| Perfect visuals delay core proof | Start with polished block rendering and authored grammar; consider smooth Surface Nets/dual contouring only as a later separately benchmarked profile. |

## 15. Decisions still intentionally provisional

The owner has chosen the destination, but these engineering choices require Phase 0 evidence:

- 16³ versus 32³ storage chunks and exact voxel size;
- Voxelize WASM mesher versus block-mesh wrapper versus minimal owned fallback;
- smooth-terrain algorithm and scalar resolution (smooth shape is now owner-directed; block-only rendering is no longer a candidate destination);
- exact PC/mobile resident radii and memory limits;
- colored voxel-light scope;
- water simulation depth;
- detached-component voxel re-settlement rules;
- whether the first new world preserves transferable inventory/Wildkin from the finite-continent save.

No one should present these as owner-accepted until the spike evidence or a later explicit decision settles them.

## 16. First executable batch

The next implementation session should do only Phase 0. Its player-visible proof is:

> In a standalone voxel lab, walk through an endless cave-bearing cubic world, remove blocks across a chunk boundary, cut a supported bridge until one section falls as a physical body, collect two material-specific drops, reload the page, and see the edited world restored—at a measured 60 fps PC target and usable mobile-landscape profile.

That batch owns no migration of the shipping world, no Blender work, no new habitat production, and no deletion of the current finite build.

## 17. Research basis

- [OpenCubicChunks / CubicChunks2](https://github.com/OpenCubicChunks/CubicChunks2) — demonstrates the independently stacked cubic-chunk model; the repository is archived in favor of a successor and is design evidence, not a dependency.
- [Voxelize](https://github.com/voxelize/voxelize) — current MIT Three.js/Rust/WASM full-stack voxel engine; useful mesher/generation reference, but its server architecture is not adopted wholesale.
- [block-mesh-rs](https://github.com/bonsairobo/block-mesh-rs) — focused MIT/Apache visible-face and greedy-quad meshing candidate.
- [FastNoise Lite](https://github.com/Auburn/FastNoiseLite) — MIT coherent noise and domain-warp implementation with JavaScript/TypeScript support.
- [Rapier JavaScript documentation](https://rapier.rs/docs/user_guides/javascript/getting_started_js/) — existing collision/rigid-body authority.
- [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) — optional accelerated mesh query tool, not voxel truth.
- [StorageManager](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager) and [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) — browser persistence/quota foundations.
