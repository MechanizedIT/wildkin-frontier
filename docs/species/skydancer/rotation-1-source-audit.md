# Skydancer rotation 1 — source audit

**Status:** planning only. No target, mesh, baked recipe, gameplay, or habitat
change is authorized from this audit. Fresh native neutral images are required
before a target direction or a visual PASS/HOLD judgment.

## Measured current authoring and shipping paths

`asset_wildkin_skydancer` is a code-native kit in
`src/world/wildkinMeshKit.js` (`sky3()`), and it is included in
`CUSTOM_WILDKIN_ASSET_IDS`. The actual shipped path is its baked recipe:

`sky3()` → `tools/bake-visual-kits.mjs --asset asset_wildkin_skydancer` →
`src/world/data/world.json` → `npm run world:generate` →
`world.generated.js` → `createVisualAssetVisual(asset)`.

The current baked asset has 23 mesh parts and 1,327 triangles. The current
authoring-kit traversal also has 23 mesh parts and 1,327 triangles, but their
measured bounds differ: authoring is `2.2680 × 2.1313 × 2.8029m`; the baked
factory result is `2.0696 × 2.1312 × 2.8029m`. A later candidate must prove
source-to-baked parity rather than treating the mesh-kit preview as shipping
evidence.

The authoring composition is fixed evidence, not a visual verdict:

| Current component family | Count | Triangles each | What it establishes |
| --- | ---: | ---: | --- |
| torso and head lofts | 2 | 32 | narrow upright body and head are explicit geometry |
| beak and paired eye/glint parts | 5 | 15 / 6 | facial read is independently layered |
| `layered_wing_feather` leaves | 10 | 76 | each side is five discrete feather forms |
| `bent_avian_leg` and talons | 2 + 2 | 16 / 36 | lower anatomy is two slim, separate leg/foot assemblies |
| `split_ribbon_tail` tubes | 2 | 180 | tail is two narrow independent ribbons |

The shipping collision is a box, offset `(0, .45, 0)`, size
`1 × .9 × 1m`. It is substantially smaller than the measured baked visual
envelope. That is a frozen gameplay/contact contract for this audit, but it is
a required native close-pass check if the model lane is later opened.

## Existing field role and frozen contract

Skydancer is the Windscar cliff-dweller companion. Its authored Wildkin record
is `spitter` / `SKITTISH`, health `8`, move speed `3.2`, damage `1`, roam
radius `4.5m`, notice radius `7m`, personal space `2m`, and leash radius
`10m`. The two Windscar records are `wildkin_skydancer_1` at `(-38,2.5,14)`
and `wildkin_skydancer_2` at `(-30,2.5,6)`, using the same asset at scales
`1` and `.95`; the associated secret is `chest_skydancer_secret`.

Its companion role is already specific and must remain outside a visual trial:
calming chime → quiet call → follow two violet perches → bond. `Skybound` has
a 12-second cooldown and currently requests an `8.8` vertical launch; it also
opens its existing wind-seal path. Discovery/save identity, taming stage,
companion catalog entry, collision, archetype, placements, and all behavior
owners are frozen unless a separately reviewed gameplay slice says otherwise.

## Candidate-worthy questions for fresh neutral capture

These are hypotheses from the measured construction, not claims about the
current native appearance:

1. The ten separated leaf feathers may read as a thin fan from side or rear;
   fresh views must determine whether a connected wing mass or stronger
   layered silhouette is actually needed.
2. The two 16-triangle leg shafts and small talons need underside, side, and
   gameplay-size evidence for grounded contact, leg volume, and readable
   perch stance.
3. The pair of narrow ribbon-tail tubes needs rear and three-quarter evidence
   to establish whether it reads as a deliberate split tail or disappears
   against Windscar terrain.
4. The present upright torso/head and shallow collision box need close native
   evidence before any claim that proportions, reach, or contact are wrong.

Fresh capture should include front, rear, left/right, three-quarter, underside
or foot contact, and one ordinary Windscar gameplay-scale frame. It should
record the actual baked factory object and the authoring-kit object separately.

## If a future model lane is selected

Freeze the current source and all six sibling custom-kit outputs before editing
Skydancer. Keep the asset ID, catalog/species IDs, collision/gameplay metadata,
two Windscar records, save schema, and companion transactions unchanged. Use
the focused bake selector only after a neutral candidate passes independent
review, regenerate world data, and compare the actual factory mesh with the
reviewed candidate at serializer precision. The next decision belongs to an
independent target/model review after baseline capture.

### Audit inputs frozen at read time

- `src/world/wildkinMeshKit.js` —
  `B1B34688B902BAF7BB502EC9C6E190126BAD14AC9DDDEC081A85DFB0B301AC70`
- `src/world/data/world.json` —
  `A797EC7A593F69B5F400EE730B4EC2EDC02E37D4ACC67AAB09C45C66BAC9F796`
- `src/world/data/world.generated.js` —
  `479CF6FC5B4B8C394CAADC8D256ECE627012E7F117A7A50EB676A7C70161F57A`
- `src/companions/companionCatalog.js` —
  `8261178E52540232C279684C0108B8CF37A190DF1BA9F7E3C5E4A9A1AA0B964F`
