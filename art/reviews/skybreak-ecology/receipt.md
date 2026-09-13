# Skybreak ecology — selected R3 visual receipt

Status: **HOLD, selected constrained candidate.** Independent R3 review scored
the pass **6.4/10**; the current visual admission threshold is 8.0. R3 is the
strongest of the three bounded passes, and no fourth aesthetic pass was started.
Its verdict and the preceding R1/R2 verdicts are preserved beside this receipt.

## Evidence

The copied files are the exact review inputs and outputs from
`.dream-loop/skybreak-ecology` at selection time:

- `baseline-overview.png`, `baseline-crown-portrait.png`, and
  `baseline-overhead.png` are the current-world baselines.
- `target.png` is the locked visual target used for all three comparisons.
- `r1-*`, `r2-*`, and `r3-*` preserve each round's overview and crown portrait;
  `r3-overhead.png` is the selected round's overhead proof.
- `r1-verdict.md`, `r2-verdict.md`, and `r3-verdict.md` are independent review
  records. R3 selected the candidate while retaining the HOLD and visual debt.

## Selected R3 layout

R3 reuses only admitted source asset families in the existing merged low-prop
presentation path. No model, terrain geometry, or collision model was added.

- The west mouth frames berry sources at `(-20,-166)` and `(-22.8,-167)` with
  broad leaves `(-26,-169)`, reeds `(-26,-170)`, and mushrooms `(-25,-170)`.
- The east mouth frames fiber at `(42,-166)` with broad leaves `(42,-170)`,
  reeds `(42,-162)`, and mushrooms `(44,-169)`.
- Three pale cloudflowers are placed on true cap support at `(13,-232)`,
  `(13.5,-231.5)`, and `(15,-231)`. They are non-colliding visual props and
  retain at least 3.1m center clearance from the corrected crown Mossling home
  `(9.5,-231.5)`.
- East-return trail-stone clusters use three larger supported beats: high
  `(32/34/36,-218)`, mid `(41,-187)`, `(41,-185)`, `(43,-185)`, and low
  `(24,-166)`, `(22,-164)`, `(24,-164)`.

There are 18 staged props: 3 in `-1,-4`, 6 in `0,-5`, and 9 in `0,-4`.
This is within the approved Skybreak per-chunk ceiling and retains the existing
18 near / 34 total scenery residency limits.

## Placement and rendering proof

Footprint support uses the larger of each category floor and scaled admitted
asset planform: cloudflower 0.75m, trail stones 1.4m, mushroom ring 1.05m, and
fen reeds 0.85m. Cliff/shoulder placements remain rejected.

The usual wildlife exclusion remains unchanged for every family except a
precise Skybreak-cap exception: non-colliding `asset_cloudflower` low props may
share ordinary Mossling roam ground but not approach the home closer than 3.1m.
Canopies, stone groups, and all non-cap or non-cloudflower placements retain
the ordinary `roamRadius + 2.5m` guard. All scenery also clears forage across
the local 3×3 chunk neighborhood.

Cloudflowers and trail stones use the existing authored-part low-prop batch:
one merged low-prop draw, no terrain surface or collision core. The three cap
flowers and nine stone props do not create hard objects in the Mossling home.

## Focused proof

`node --test tests/frontierScenery.test.js tests/frontierSceneryVisual.test.js tests/skybreakPlacement.test.js`
passed **18/18** after R3. The focused tests cover staged positions, resource
clearance using actual admitted assets, scaled footprints, three distinct stone
groups, cap-only soft-flower wildlife clearance, no collision surface for
cloudflowers/trail stones, and resident budgets.

## Remaining visual debt

R3 remains below admission. The reviewed overview still does not clearly
distinguish berry from fiber pockets; the summit does not compose Mossling,
flowers, and crystal in one portrait-readable frame; and the three return-stone
beats remain too weak to guide the route at ordinary distance. The inherited
terrain route remains readable and traversable in the supplied overview and
overhead evidence.

## Native correctness closure

The nine-point home ring did not reveal interior lips. Native approach exposed
a Mossling stuck in RETURN after fleeing onto a steeper part of the old cap.
The final same-ID source lives at `(9.5,-231.5)` with roam2.4m, flee2.2m and
leash2.8m. Its complete3.1m movement disk is checked at half-metre steps; the
worst admitted adjacent grade is0.246 against a0.32 limit. Ordinary wildlife
settings are unchanged. Two flowers moved to preserve the corrected home.
This is post-review correctness work; R3's6.4 score belongs to its original
composition. `final-package-crown-portrait.png` shows the final corrected view.

- Western berry100: ordinary approach/auto-harvest collected4 berries,
  remaining4→0, no pending drops, health5. Neighbor berry101 stayed untouched.
- East-cap crystal100: ordinary tool use from outside the enlarged collider
  depleted4; walking to its settled stack collected all4, backpack2→6,
  no pending yield, health5. Literal reopen and residency changes retained both
  depletions. Source positions and inventory preparation were disclosed fixtures.
- Final cap encounter: ordinary lure, retreat, feeding, approach and visible
  Bond completed in8.598s, health5. Exact individual `wildkin_1jun5ez`, origin
  `f1:w:0:-5:100`, became pending and the wild source disappeared.
- Continuous eastern descent took23.650s at health5. A direct southward route
  met the older terrace lip; walking around its west side then reached Camp
  in44.840s, health5. The visible Return to Camp flow secured the same individual.
  Literal Camp reopen retained all six owned individuals, the source capture,
  crystal6 and both depleted sources. See the named JSON records beside this file.
- The final portable build independently repeated the same capture in8.622s
  at health5 from an imported isolated pre-bond export and disclosed cap approach.
  Literal portable reopen retained the identical pending record and both depleted
  sources, with no wild duplicate. Only localhost:8081 resource origins were
  observed and the warning/error log was empty. This proves the actual packaged
  interaction, not a fresh-world economic run.

The fixture prepared lure supplies by the existing paid crafting transaction
outside its usual Camp UI. Earlier attempts exposed the unsafe home and an
impassable direct approach; the first paid attempt expired. Later fixed-camera
attempts also lost the animal from view. No UI-cache patch was retained: direct
debugger evidence showed the presentation gate correctly rejecting an offscreen
anchor. Final ordinary controls used the supported eastern approach and a
diagnostic camera aimed at the animal. Physical-phone comfort is unverified.

## Integrated verification

Final **1,168/1,168 tests**, verify/world/retained campaign/build/validate and ZIP
pass. Package **44.14MB unpacked /20.54MB ZIP**. No new dependency, terrain mesh,
save schema, branch, remote publication or extra frame loop. Source/package
SHA256 values are recorded in `source-hashes.json`. Runtime arrays retain their
existing bounds; these facts are not a measured physical-phone performance claim.

## Try it

Head north beyond the older low rocky terrace to the tall stone caps. The west
foot has berry bushes; the lower east side has fiber. Follow the main rise onto
the crown, inspect the Mossling from its gentler eastern side, place prepared
berries on level ground, step back while it feeds, then approach gently to Bond.
The separate eastern cap holds a large crystal deposit. Return down the eastern
buttresses, go around the older terrace, and use Camp's gate to secure the bond.
Correct behavior retains gathered materials and the same individual after
reopening. Stuck return movement, unexplained route damage, duplicate wildlife,
or restored depleted deposits are failures.
