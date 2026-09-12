# Shatterfen redesign V2 — independent target review

September 12, 2026. **HOLD — 7.9/10.** The two essential dry crossings and low Observatory forecourt are now meaningfully clearer. The remaining material reference issue is the far-bank anchor/actor identity: a new green creature was added by the northwest wreck while the original southwest creature remains, and a separate Tideglass Beacon is still not confidently identifiable. Do not admit implementation from this image yet; preserve the improved composition and make only the remaining targeted corrections.

Only this review file was written. No production changes, browser/testing, reference generation or geometry work occurred; other agents' files were left alone.

## Evidence and score

Inspected full V2 and V1 images side by side, the V2 exact edit prompt and provenance, and the earlier independently inspected fresh baseline clean/planning/overview and approved Explorer reference. The fresh baseline anchor identities from the V1 review remain authoritative. The score below judges the actual V2 image, not the author's change claims.

| Category | Score | Visible assessment |
|---|---:|---|
| Composition / level reference | 2.2/3 | Essential routes now connect across clear pale dry ground, with water stopped at the edges. The receiver occupies a lower open forecourt with higher rear/right plates and a distinct cache alcove. However, the far-bank Beacon remains ambiguous and the newly added northwest creature coexists with the retained southwest one. Those are material reference conflicts for the protected layout. |
| Lighting / palette | 2.7/3 | The appealing cool wetland, pale silt and restrained ivory/orange wreck palette is preserved. Matte shading, local shadows and clear daylight fit the Explorer style. Some fine painterly variation remains aspirational. |
| Materials / style | 2.4/3 | Faceted peat/slate, reeds, lilies, ceramic wreckage and modest receiver remain coherent. No new broad style problem is introduced. Rendered water detail and hull geometry still require later runtime decisions rather than literal assumptions. |
| Details / practical readability | 0.6/1 | Two isolated bright cyan crystal nodes and the luminous northwest blossom are easier to distinguish from surrounding dressing. Reeds still leave the west snare crescent open. Actor/Beacon ambiguity and heavy fine flecking prevent higher clarity. |
| **Total** | **7.9/10** | **Target HOLD; no implementation, physics or phone admission.** |

## Prior concerns: what V2 actually resolves

**Dry crossings — resolved as a target read.** The link north of the southern fork is a continuous pale silt ribbon with clear banks. The central junction toward the Observatory is dry and continuous rather than washed across by teal/white water. The west/northwest shoulder also provides a readable dry approach. These now communicate ordinary ground travel; real widths, grades, support and companion passage remain to be authored and tested.

**Low receiver forecourt — resolved as a target read.** The receiver's working space is visibly lower than the raised plate carrying the isolated cyan crystal behind/right. Its broad approach and the small chest alcove on the eastern side are distinguishable. The image does not establish precise 0.7/1.2/2.2/3.3m heights or the protected waypoint's exact position, but it now communicates the intended height relationship. The existing receiver model and supported return pocket remain authoritative during implementation.

**Far-bank anchors and actor — not resolved.** A green quadruped is now visible beside the northwest hull approach. The V1 green creature remains at the bottom-left/southwest edge beside a tall crystal rock. A smaller green upright form near the central bank further complicates visual identity. At minimum, the two clear creature-like forms contradict the requested single far-bank Thornprowler and make the southwest arrival read unsafe. The image still does not let me identify a standalone low mechanical Tideglass extraction Beacon with confidence. Nearby chest/debris/plant shapes cannot be credited as the protected Beacon merely because the prompt requested one.

The two northwest chest-like forms are separated enough to distinguish an existing cache from a proposed wreck cache at the visual level. Their exact source-coordinate mapping must still be supplied by the planning view; the rendered image cannot decide which ID moves or which loot contract changes.

## Two bounded corrections before admission

1. **Clean up the actor identities in place.** Remove the original southwest green creature beside the arrival-edge crystal. Keep exactly one unmistakable Thornprowler in the protected far-bank approach between the western hollow and northwest destination; do not move its source ID to the high wreck simply because the generated image placed it there. Remove or clarify the small central green form if it could read as another actor. Preserve both blue Tidefin silhouettes and their quiet dry-bank working space. This is a local cleanup of three small areas, not a new region composition.
2. **Make the Tideglass Beacon unmistakable.** Put a small distinct mechanical extraction marker in its own open low dry pocket on the western/far-bank branch, visually separated from the luminous blossom, Sunken Cache, new wreck cache and wreck panels. Use the known game Beacon vocabulary. Pair the clean target with a marked planning view identifying Beacon, existing Sunken Cache, proposed wreck cache and Thornprowler against their protected roles; labels are useful on the companion plan, not required in the clean image. Do not satisfy this by adding another chest or bright plant.

Preserve the new dry crossings, low forecourt, higher rear plates and useful broad layout during these corrections. No further broad image reroll or additional destination is indicated by this review.

## Retained direction and implementation constraints

North remains image top/world -Z: ruined Emberfall gate at the top, Verdant return at the bottom, Tidefin hollow west and Observatory east. The northwest wreck bank uses the additional rim as a destination; the image remains a plausible 100×100m wetland plan, not proof of dimensions or travel time. Low creek/silt/reedbank traversal and one higher wreck overlook keep it distinct from Verdant's wooded shelf composition.

Preserve all **seven ordinary resource IDs plus three harvestable props**: `prop_s2_causeway_crystal`, `prop_s2_observatory_crystal` and `prop_s2_farbank_blossom`. V2 improves their target silhouettes, but cannot prove their runtime identities, reward semantics or exact placement. Keep source X/Z positions, or use an explicit root-approved relocation table; rebase support Y through the existing landscape transaction. The baseline positions relevant to the remaining fix are Beacon (-28,-15), Sunken Cache (-29,-21), Thornprowler (-32,-7); the proposed new cache is (-44,-34). The generated perspective does not override them.

Keep the receiver modest and paired-pylon, the snare bank dry/open, and the existing Tidefin model separately governed by owner/art acceptance. Broad slopes and walking alternatives should carry companions and returns; do not infer swimming, bridges, extra enemies or a new traversal system from decorative water cuts or silhouettes.

The baseline reports 351 calls / 191,467 triangles. V2 is not a new measured budget. Its edge reeds and ground flecks should be implemented with bounded reuse/batches and surface variation where supported, not one object per speck. Material appearance, shell construction, actual grades, jump landings, snare placement, collision, reload, Author export, frame cost and physical-phone acceptance remain later gates. A target PASS would not substitute for any of those proofs.

## Exact provenance

- Reviewed V2 target: `art/targets/shatterfen-redesign-v2/target.png`, verified SHA256 `12b1c9e40ea9ed53d5b8210be43c4fcdb40aaaca97ab244103b6114b77a84897`.
- Exact edit prompt and provenance: `prompt.md` and `provenance.json` in this same directory. Provenance records one built-in image-generation edit on September 12, 2026 and lists three image references.
- Provenance SHA256: `f68f89a2c853d8db6c0093cf8f7e7d5601cf6bb5335609b599b95b330a64d6c8`; prompt SHA256: `a12eba7cd8d6199a2cbec07edd3dc4275741967f3f3eb18b61848d3f3b950372`.
- Preserved V1 input SHA256: `4df4bef3626062b2917d2f9fc2381b91cd2a678fb3030e386ce91f86a1198494`.
- Fresh before overview SHA256: `53c3cce6b434d08650ed4dd82053161abb5a3c00683f9ed1e4105af5146b2b52`, from `.dream-loop/shatterfen-redesign-v1/before/manifest.json`, world SHA256 `e0fcaa3dd1580fcf1cd5f4de2556dfc377bff03fa126f9ae0a59cacb8a6d6888`.
- Approved Explorer SHA256: `a5c6d707832bb3fd0b21289be540e3fd75970befca66a442b65ebf673543adff`.

Root owns the next target correction and scope decision. This review leaves V1 preserved and does not admit or modify implementation.
