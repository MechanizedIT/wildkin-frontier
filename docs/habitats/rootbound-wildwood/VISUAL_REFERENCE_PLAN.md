# Rootbound Wildwood — visual reference plan

**Status: first six-image reference set generated and independently reviewed.** See [scene references](SCENE_REFERENCES.md) and the image-folder reviews. The technical map has conditional concept-authoring approval; the illustrations are useful provisional scene/mood references with documented camera and identity weaknesses. They do not prove terrain, access, gameplay, persistence or current implementation. Exact submitted prompts, including generation-time additions, are preserved beside each output.

## Direction

Rootbound is a rain-fed, root-sculpted woodland that moves from a bright orientation floor through dry raised root ribs and a humid log-and-fungus pocket to a mineral side seam, ending on a warm sheltered old-root landmark. The visual rhythm is **reveal → enclosure → choice → reveal**. It uses four scale bands: leaf litter and sprouts; fungi/reeds/low cover; connected roots, logs, and thornstone clusters; then one low but memorable Crown silhouette. Keep open floor intentional: a substantial pale, dry walking lane stays readable through the center rather than becoming a hedge maze.

Use restrained low-poly mobile materials: faceted opaque rootwood in warm red-brown, dark teal-green shade masses, humus/leaf-litter floor, concentrated violet/magenta/pale-cyan fungal accents, and grey-green thornstone. Do not use photoreal bark, dense vine curtains, magical fog, emissive neon, water, buildings, bridges, or a copied generic fantasy forest.

## Grounding and calibration

Source references for the later target-author call:

| Need | Required evidence |
|---|---|
| Current player-scale portrait framing | `art/reviews/rootbound-wildwood/restart-baseline-{arrival,gallery,destination}.png` and matching `restart-r2-*` frames, all 412×915. Preserve the visible player in the lower central play band at the same approximate scale; reserve the upper-left objective/minimap and lower-corner control zones as negative space. Do not paint a replacement HUD. |
| Fixed comparison poses | Arrival player `(-475, 590)`, yaw `-1.743`; Gallery `(-480, 720)`, yaw `-1.36`; Destination `(-449, 675)`, yaw `-2.30`; pitch `0.6283185307`, effective distance `11.5910795442`. The 1100×900 overhead capture is a map/composition reference only, never a portrait acceptance frame. |
| Revised map sequence | `docs/habitats/rootbound-wildwood/SPATIAL_PLAN.md`: Meadow `x[-500,-455], z[570,615]`; proposed Galleries `x[-500,-455], z[615,705]`; Grove `x[-465,-430], z[660,690]`; proposed east Verge `x[-430,-405], z[675,710]`; proposed Crown `x[-485,-450], z[705,735]`. The map is overhead planning scale, not a gameplay-camera template. |
| Existing design direction | `docs/habitats/rootbound-wildwood/DOSSIER.md`, `PACKET.md`, `art/targets/rootbound-wildwood/{layout-target-v2.svg,composition-target-v2.svg,concepts/selected.png}`, and the reviewed buttress-root constituent target. |

The whole-map illustration is an overhead planning-scale view, explicitly different from gameplay; it may show labeled **art-direction zones** for discussion, but it must not expose route masks, source IDs, home disks, save IDs, coordinate grids, collision shapes, performance counts, or other player-irrelevant metadata. Keep that technical material in a separate planning overlay/manifest. Portrait prompts use player-facing place names only; their technical pose and scale constraints belong in the generation record, not painted labels.

## Six exact prompts

All prompt outputs are provisional reference candidates requiring independent visual selection and feasibility review. Supply the listed source images as visual references when the generator supports them. Do not merge source screenshots into a collage or treat a generated map as recovered geography.

### 1. Whole-map illustrated direction

**Sources:** revised spatial plan; 1100×900 `restart-baseline-overhead.png`; layout and composition SVGs.
**Format:** one clean wide illustrated map, about 16:9, no HUD and no gameplay camera claim.

> Illustrated top-down art-direction map for **Rootbound Wildwood**, a compact rain-fed alien woodland, rendered as a clean low-poly game-world planning illustration. Show one coherent continuous landscape sequence from a bright open **Orientation Meadow** through a proposed southern extension of dry **Root Galleries**, a small shaded humid **Lantern Grove** hollow, an east-side grey-green **Thornstone Verge** seam, and a warm sheltered **Heartroot Crown** threshold. The central route reads as broad pale leaf-litter floor with irregular clearings; roots and logs form low connected edges, never a maze. Establish four scales: tiny ground growth, low fungi/reeds, connected rootwood/log anchors and thornstone groups, one restrained old-root Crown silhouette. Rootwood is warm red-brown, gallery shade dark teal-green, fungi are concentrated violet/magenta with sparse pale cyan, thornstone is desaturated grey-green. Five small readable illustrated zone labels only; no coordinates, grids, technical overlays, HUD, buildings, bridges, rivers, glowing magic, giant castle tree, or dense uniform scatter. This is an art-direction map, not a literal level layout.

### 2. Orientation Meadow portrait

**Sources:** restart baseline/R2 Arrival portrait; revised Meadow zone.
**Format:** portrait 412×915 native-gameplay composition: 36° downward pitch, 52° FOV, no cinematic horizon; player about 10% of image height centered near 56% image height. Retain the baseline camera/player scale.

> Portrait mobile gameplay art direction for **Orientation Meadow** in Rootbound Wildwood, matched exactly to the supplied 412×915 restart-r2 arrival frame: 36° downward view, 52° FOV, no horizon, player about 10% image height centered near 56% height; retain upper-left and lower-corner UI-safe negative space without drawing a fake HUD. A bright pale leaf-litter clearing has a broad quiet walking lane, short low grass and sparse puff plants, with clustered fungi only at the edges. Ahead, a dark low connected rootline forms a clear return cue and begins the transition into shade; one side opening hints at a denser route. Use low-poly faceted opaque materials, warm muted floor, teal-green shade, very limited violet accents. No giant tree proxy, wall of vegetation, water, buildings, floating roots, or uniform prop scatter.

### 3. Root Galleries portrait

**Sources:** restart baseline/R2 Gallery portrait; reviewed buttress-root target; Root Galleries card.
**Format:** portrait 412×915 native-gameplay composition: 36° downward pitch, 52° FOV, no cinematic horizon; player about 10% of image height centered near 56% image height. Retain the baseline camera/player scale.

> Portrait mobile gameplay art direction for the **proposed southern Root Galleries extension** in Rootbound Wildwood, matched to the supplied native 36° downward / 52° FOV portrait camera and player scale; do not imply that the current Gallery station at the Crown threshold is evidence of this proposed room. Frame a broad pale inner floor lane with one substantial side buttress-root architecture: several bent, tapered roots join into a thick trunk collar, then break into low irregular ribs along the edge. The route stays visibly open for player and companion; a lighter wide line reads safe while a tighter root-pocket opening suggests a richer side choice. Add a grounded fallen log and sparse dry leaf litter near the root edge, dark teal-green canopy masses beyond, and small fungi only in protected shaded contacts. Low-poly opaque faceted rootwood, warm red-brown against cool shade. No detached root arcs, floating trunk parts, symmetrical tunnel, dense vines, glowing mushrooms, or impassable maze.

### 4. Lantern Grove portrait

**Sources:** restart baseline/R2 Destination portrait; selected Lantern Hollow/Thornstone direction; Grove card.
**Format:** portrait 412×915 native-gameplay composition: 36° downward pitch, 52° FOV, no cinematic horizon; player about 10% of image height centered near 56% image height. Retain the baseline camera/player scale.

> Portrait mobile gameplay art direction for **Lantern Grove**, matched to the supplied native destination camera: 36° downward pitch, 52° FOV, no horizon, lower-center player about 10% of frame height near 56% height. Show a small shaded humid hollow with a dry pale central interaction lane. On one sheltered edge, a single grounded fallen root-log joins the soil and carries a clustered family of broad low fungi at log ends and root contact; the fungi create one restrained violet and pale-cyan focal contrast, never neon. The far and side edges use dark teal-green shade and low humus, while a visible gap gives a return direction. The center remains clear and level-looking, with no water mechanics implied. Low-poly opaque faceted forms, no floating mushroom caps, magic lights, dense curtain foliage, shrine, building, or invented Wildkin interaction.

### 5. Thornstone Verge portrait

**Sources:** destination and gallery portraits; revised Verge side branch; current fen-stone references.
**Format:** portrait 412×915 native-gameplay composition: 36° downward pitch, 52° FOV, no cinematic horizon; player about 10% of image height centered near 56% image height. Retain the baseline camera/player scale.

> Portrait mobile gameplay art direction for **Thornstone Verge**, an east-side lateral choice off Rootbound’s gallery. Match the supplied native 36° downward / 52° FOV mobile camera, with no horizon and the player at the restart-r2 scale. A broad clearing-facing escape lane runs through the lower-middle frame; on one side, a broken low seam of grouped grey-green thornstone shards rises from shallow dry soil beside exposed warm roots. Keep the stone cluster irregular and readable as a geological family, with short hardy scrub and sparse leaf litter, while the opposite side opens back toward darker roots and a recognizable return cue. The composition should say optional mineral edge, never blockage. Restrained low-poly materials; no giant crystalline spires, cave, bridge, lava, water, aggressive creature, HUD, or evenly scattered spikes.

### 6. Heartroot Crown portrait

**Sources:** restart baseline/R2 Gallery portrait; Heartroot Crown card; reviewed root architecture reference.
**Format:** portrait 412×915 native-gameplay composition: 36° downward pitch, 52° FOV, no cinematic horizon; player about 10% of image height centered near 56% image height. Retain the baseline camera/player scale.

> Portrait mobile gameplay art direction for **Heartroot Crown**, the proposed warm sheltered threshold beyond the galleries, matched to the supplied native 36° downward / 52° FOV gallery portrait camera and restart-r2 player scale. The current Gallery station is at its threshold, not proof of a completed Crown room. A low memorable ancient root collar sits beyond an open leaf-litter floor: bent tapering buttresses merge continuously into a broad trunk base and sparse overhead wood silhouette, with warm filtered light on settled litter. Mossling-friendly open margins and a clear look-back gap preserve orientation; fungi stay subtle near damp root contacts and thornstone is largely absent. Keep the Crown impressive through connected silhouette and value contrast, not extreme height. Low-poly opaque faceted rootwood, no floating roots, hollow walk-under arch, giant canopy wall, magical altar, quest icon, HUD, or claim that this is the existing earned grove.

## Constituent map and known gaps

| Zone | Visual role | Existing evidence / usable family | Proposed reference priority or gap |
|---|---|---|---|
| Orientation Meadow | bright reset and rootline return cue | retained clearing palette, ordinary low ecology, Mossling/Bloom relationship | composition reference; no new mechanics or asset implied |
| Root Galleries | proposed southern medium-density transition, connected low wall and route frame | curated canopy/log roles, existing low kit, bounded relief language | **connected root/buttress architecture** is the consequential silhouette gap; buttress target is reference only and current TRELLIS quality run held before raw export |
| Lantern Grove | sheltered log/fungus destination | admitted fallen log, mushroom rings, pale floor direction | existing kit can express a small cluster; broad Lanterncap family remains a proposed later reference, not a glowing system |
| Thornstone Verge | proposed east-side mineral choice and counterweight | existing fen-stone/thornstone family | composition needs grouped seam and full clearance/projection proof; no new mineral economy |
| Heartroot Crown | warm root landmark and orientation cue | source Crown proxy/ridge area and existing roots/wood references | old-root collar/landmark is still a proposed separate constituent; it is not the earned grove |

## Feasibility gate before any reference can become a build brief

1. A root/trunk must be one connected opaque mass: each buttress joins a thick collar or trunk through full faces, with no intersecting closed solids, free-floating roots, paper-thin ribbons, or hollow walk-through arches.
2. Bend/taper geometry must be legible: use sectioned tapered volumes with irregular but continuous centerlines, thicker base/root junctions, and a visibly grounded lower footprint. A broad canopy must not substitute for missing root structure.
3. Every normal portrait candidate preserves the player, central lane, companion clearance, a return cue, and the UI-safe bands. Map beauty or overhead readability is insufficient.
4. Runtime feasibility later requires real transformed bounds, support, collision hulls, source/home/route protection, terrain-footprint samples, camera projection, resident/streaming cost, and ordinary route/reload proof. These constraints must not be painted as player-facing labels.
5. The target author, spatial planner, mesh builder, and independent reviewer retain separate roles. A generated reference cannot self-select or admit an asset.

## Next gate

The first whole-map and five scene references are complete. Next use the independent implementation brief to produce targeted constituent assets and improve actual composition. Preserve useful V1 art direction, correct camera framing before selecting matching-pose targets, and freeze native positions for the new Galleries/Verge. Latest exploration direction allows intentional eligible climb/harvest-clear pockets; do not interpret every steep edge as a failed ordinary route. Broader composite harvesting, long regrowth and building suppression remain documented future implementation directions.
