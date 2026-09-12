# Repeatable maps and model renders

## Original model reference images

Chris requested the images behind the models after viewing the atlas. [Private source-image folder](https://drive.google.com/drive/folders/1jmy1OJl_epxTnekod2kGzfPidM90bmoX) contains17 byte-identical originals, two phone contact sheets, a26.61MB ZIP, README and provenance manifest. All22 Drive items were read back as downloadable/private. [Tidefin original target](https://drive.google.com/file/d/18LCSMdG1yxnGZoRYHgPri9Ggh9T2sBCx/view?usp=drivesdk) remains a comparison reference, not approval of its resulting candidate.

Reproduce locally with `tools/review/package-source-images.py`. It maps all16 atlas families, distinguishes recorded image-to-3D inputs from visual targets used for scripted Blender work, and retains the approved Explorer master as style context. Mossling's input belongs to its geometry predecessor; the later rig revision did not generate a new image. Source ZIP SHA256:`275645402ac849a695af16cf682827695dd7ca283fb501243e5bcf2c75be8c14`. Some original studies live under ignored `.dream-loop`; the private ZIP preserves their selected exact bytes.

The atlas now serves as required before/after evidence for region planning, paired with native-pitch and elevation/traversal views. See REGION_REDESIGN_REVIEW.md for the independent critique and first Verdant proposal. Do not overwrite this dated before snapshot or call a generated target an implemented map.

[Proposed Forest Edge upland target](https://drive.google.com/file/d/1lQ69TewdoZi3-KzzR72Mj65ajBMThaIH/view?usp=drivesdk) is a generated design target, not an implemented map. V1 was rejected for course remnants/waterfalls; V2 removes those and passes independent visual-blockout fitness8.1. Numeric source anchors override small painted-location drift. Its native height/connectivity and no-bypass gate are still pending. Retained project source: `art/targets/verdant-upland-v2/`.

September12,2026. Chris requested top-down maps of each area/Camp for planning and potential later minimap use, plus generated-model renders delivered to his phone. The current snapshot is delivered; no minimap is implemented by this tooling.

- [Phone-friendly visual book](https://drive.google.com/file/d/1HWbqPEt39F4BTm6dgbxnsBnDK2JRqD0W/view?usp=drivesdk):12pages,6,487,784bytes, SHA256 `a514f5c7a38eea0917b427257a7651f814c2432b64818c370ef635c84e5d8c3d`.
- [Private owner Drive folder](https://drive.google.com/drive/folders/17egS7KkHvD5eZkJG8OCTxVjP7FuNcv9r):PDF,7cleanPNGmaps,2model overview sheets and42,144,494-byteZIP of all originals/metadata.11files were verified by direct folder readback, with no broad sharing.
- A link email was sent to the authenticated Gmail account itself, as requested. No outside recipient or public publication.

## Reproduce

Keep the ordinary dev server running. From the repository root:

```powershell
node tools/review/capture-visual-atlas.mjs --url http://localhost:8080/ --out .dream-loop/visual-atlas/2026-09-12
python tools/review/export-visual-book.py --manifest .dream-loop/visual-atlas/2026-09-12/manifest.json
python tools/review/package-visual-atlas.py
```

The two Python helpers require ReportLab/Pillow; the configured Codex bundled Python has them. The book uses local Segoe UI fonts. Capture uses the existing Playwright dependency, one isolated Edge browser, local Three.js/game constructors, no Blender or inference. Choose a new output directory to preserve an earlier snapshot; the current book/ZIP default names deliberately describe this dated delivery. PDF authoring follows the available PDF skill's operation marker and visual inspection workflow.

`capture-visual-atlas.mjs` and `visual-atlas.html` produce7clean2048×2048maps (Camp starter/expanded plusfive regions),7authored-anchor overlays,16actual768×768model/family renders and2labelled2048×1120overview sheets. Native ground/props/resources/creature constructors and admitted model files supply the images. Distance fog/shadows are disabled for whole-area inspection. This is the initial authored layout with no user save, live AI, player-built structures or player avatar; expanded Camp is an explicit alternate defense fixture. It is not a gameplay screenshot or a traversal/animation acceptance test.

## Source and mapping contract

The manifest records actual `src/world/data/world.json` SHA256 `6b038aee3550fa8ed29a458629fee2ed6f0dce425ff121b1383ceddec2ce46ec`, map bounds, authored bounds, metres/pixel, north orientation, anchor coordinates and exact output hashes. The initial tool accidentally hashed the tiny world import wrapper; this was corrected before final packaging. A fixture-relative ground texture404 was also fixed before the final zero-error capture. Re-run when world/assets change; these images are static snapshots.

North is image top/world−Z; east is image right/world+X. For a map of widthW/heightH:

`u = (x − minX) / (maxX − minX) × W`

`v = (z − minZ) / (maxZ − minZ) × H`

One orthographic render per area avoids stitching seams. A later minimap can reuse a reduced static background with separately projected player/discovered-landmark markers, updated by the existing frame/UI owner. Preserve marker coordinates independently of camera orbit. Do not add another live3Drenderer per frame merely to draw a small map; exact UI size/discovery behavior remains a proposal.

## Model/evidence boundaries

The16views use current ExplorerV2/MosslingV3 and generated environment, storage, station, defense and discovery families. Survey pieces are shown assembled. Superseded Explorer/Mossling versions are omitted. RootfallV1 and TidefinV3 are explicitly unadmitted candidates in this dated gallery; subsequent work must not relabel this snapshot as a newer version. Update the explicit gallery records when admitting new families/candidates.

The parent inspected actual map/overview/model images and rendered PDF pages1,2,9. PDF includes bookmarks and a linked area overview. Its embedded JPEG previews reduce58.5MB to6.5MB for phone use; ZIP/individualPNGs retain full lossless originals. Capture had zero browser errors/failed image requests; the ZIP rechecks every original SHA. Drive PDF/ZIP/image metadata and all11folder entries were read back. No game source, world layout or user save was changed by capture/packaging, so this read-only artifact boundary did not rerun the game aggregate suite.


### Oblique region companion view

`atlas.overview(regionId, {pitch:58, width:1564, height:1006})` renders the same region at an oblique orthographic angle to expose shelf faces. It does not exaggerate terrain height or add dressing. It retains the atlas's fog/shadow omission; native gameplay images supply those presentation checks. Its camera is recorded in the returned metadata. Use the ordinary top-down `map()` for coordinates/planning overlays; the oblique frame has a different projection. Returning to `map()` resets the camera orientation.
