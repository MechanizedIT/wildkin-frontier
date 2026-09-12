# Crash Camp composition target v1

Status: independently approved target8.3; see independent-reference-review.md. This image is not an implemented game screenshot, owner approval, asset admission or collision proof.

Author: independent `camp_reference_author` agent, September 11, 2026. The parent assigned only this target directory and `.dream-loop/overnight2-camp-reference/`; no production files were changed.

## Files and provenance

- `target.png`: 1536 × 1024 PNG; 2,198,722 bytes; SHA256 `3e142a8865cc36015acd04cc9e161f01acb719f0beeff639aa4c6523d682373f`.
- `prompt.txt`: exact prompt supplied to the built-in `image_gen.imagegen` tool. One call produced one target. Backend model/version: **undisclosed** (not returned by the tool).
- Generated original retained unchanged at `C:/Users/cwood/.codex/generated_images/01a09381-bdb7-7181-a8d9-9a3cbdee06d0/exec-d01291c7-b238-4764-a989-253e69f21037.png`.
- Image input 1, actual runtime baseline: `.dream-loop/overnight2-phone/reviewed-landscape.png`; SHA256 `3df7acb3bdab4a0070ad2d7c240e8088ba02c4fa62d81a128ea32587c056847f`. Preserved here as `baseline-camp.png`. This is a browser phone-view screenshot, not proof of physical-phone performance.
- Image input 2, owner-supplied style master: `art/style/explorer-master.png`; SHA256 `a5c6d707832bb3fd0b21289be540e3fd75970befca66a442b65ebf673543adff`. Source/creator beyond owner supply is not established; see `art/style/README.md`.
- Unmodified working mirror: `.dream-loop/overnight2-camp-reference/target.png`.

The built-in path was used; no API fallback, paid external service, local inference, Blender or additional browser session was used. The actual baseline and master were inspected before the call. Existing project Dream Loop Pro workflow was confirmed by the parent.

## Intended visual change

Retain the short ivory/blue faceted landing pod on the left, low mint sanctuary basin at back-left, teal-roof workshop at back-right, open north approach and blue-jacket Explorer for scale. Broad pale armor panels, charcoal base plates, blue-grey posts/caps and planted triangular braces make a small emergency enclosure. Orange markers and tiny cyan status patches are restrained accents. The central apron and service approaches remain open.

The foreground is the adjoining unbuilt southern yard, outside the current wall. Four orange-capped stakes suggest its expansion footprint without a second completed perimeter. Low clearing vegetation, a fallen growth and a few stones frame a broadly usable center. Clearing/paying should extend the enclosure to these outer bounds and open the former southern dividing boundary; the still itself cannot establish that behavior.

## Author observations and interpretation limits

These are source-author observations, not an independent PASS or score.

- The target keeps the actual pod/workshop/sanctuary silhouettes unusually well. Preserve those source-model carryovers; do not use this as justification for wholesale rebuilding of admitted service art.
- The broad armor family is repeatable and matte. Adjacent panels vary slightly in length, insert shape and small cyan patch position; choose a small consistent production family instead of reproducing every generated discrepancy.
- The central southern panel has an orange plate but no clearly resolved opening mechanism. Its compact marker is on the yard side. Runtime interaction must be visibly reachable from the starting apron, and an actual opening/removal transition must be implemented and verified. Do not copy inaccessible marker placement as a gameplay requirement.
- Southern yard overgrowth is relatively sparse, especially in the middle. Keep the readable building space, but use a deliberate small set of obvious removable growth/stone blockers so the uncleared state and later change are perceptible. The image alone could read as a surveyed nearly clear yard.
- The existing timber north gate and workshop supports remain as recognizable carryovers. The new perimeter is emergency steel; this target does not require replacing the north gate with a new machine or every brown support with metal.
- Several plants visually touch panel feet and the north-left tree sits close to the rear wall. Keep foliage dressing out of actual service approaches, gate clear width, pod ramp and collision hulls.
- The camera is deliberately elevated and pulled back to show the composition. It is an authoring/review survey view, not a mandate to replace the playable follow camera or its bounded zoom.
- Perspective compresses the southern yard. Image proportions do not replace the parent-supplied layout: initial apron x[-9,11], z[-4,11], north neck x[-3,3], z[-9,-4]; yard x[-13,13], z[11,31]. Preserve walk/build area and the actual service coordinates, then validate from ordinary play.
- No visible floating major structures, mirror reflections, garbled text, busy HUD, or dense light strips were observed. The still has no motion/state/traversal evidence.

## Likely implementation owners and families

- Camp layout/composition: `tools/author-beta-world.mjs`, `tools/compose-landscape-art.mjs`, and a focused Camp composer if the parent chooses one. Parent owns canonical `src/world/data/world.json` generation.
- Existing pod/workshop/sanctuary/gateway silhouettes: `src/world/frontierPropMeshKit.js` and `src/world/visualFactory.js`; retain their stable asset IDs and interactions.
- New emergency barricade family: straight panel, corner/end post, supported southern opening/removable divider and survey marker. These should share materials and construction language; no new farm-fence variant.
- Expansion authority/placement: `src/base/baseSystem.js`, `basePlacement.js`, `src/save/frontierProgress.js`, with Author/Play collision and export validation under existing world owners. A reference cannot decide that contract.
- Surrounding admitted ecology: faceted canopy variants, fern/groundcover, pebble/rock shelves and a bounded removable growth family. Use sparse silhouettes and curved route edges rather than multiplying decorative assets across the open yard.

Independent target review should inspect this PNG, the preserved baseline and the unchanged Explorer master. Implementation and native visual/physics/persistence checks belong to other roles.
