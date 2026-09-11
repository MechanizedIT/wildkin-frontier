# Independent Shatterfen bank reference review

**PREGEN PASS — target fitness 8.3/10, with the placement constraints below.** The focused bank composition is coherent and achievable with modest mobile geometry. This is admission of a generated target, not an implemented game result.

Personally inspected target.png (independently verified SHA256 `2743ce18201b2c9b3129947211ac4758b6fe5c90f4861db7a676ce660303b882`), the actual Fen runtime `03-tracking-positive.png`, and parent README. Also selected nearby canonical props/resources/waypoint fields from world.json to check the proposed route constraints. No source/model edits or browser run.

## What works

The gravel clearing establishes a legible destination around the waypoint rather than terminating a ruler-wide yellow path. Unequal rear-left and foreground-right slate masses frame the approach at different depths. Broad oblique faces and irregular top breaks can be built as two closed low-poly outcrops; they do not require impossible intersections, hovering layers or a dense rib wall. Sparse folded fronds and small shoulder stones soften the transition without obscuring the instrument. The shape palette is compatible with the existing matte, substantial faceted assets.

The image is more detailed and higher-resolution than the actual game. Its useful requirement is the broad route/rock arrangement and patchy ground transition; reproducing every tiny pebble is unnecessary. A reasonable initial budget is two closed masses totaling roughly 800–1,500 triangles, plus a small bounded set of instanced shoulder stones and 3–5 frond clumps. This is a provisional implementation budget, not an owner-approved new limit.

## Hard implementation constraints

1. **Keep the existing dry action apron and receiver support.** Preserve `wp_section_2` at (23,0.7,8), the receiver at (23,0.66,4.8), their shipped models, fixed collision and previously proved sweep. Do not bury the receiver base or lift the waypoint. Keep the central approach about 3.2 m wide, with a clear skirt around the waypoint and the established front-stop position. Do not put decorative stones in the interaction space.
2. **Protect the harvest rock on the right.** `rock_section_2_observatory` is at (27,0.4666,12); the generated right outcrop occupies its general screen area and does not clearly preserve it. Fit the outcrop farther outboard or split its visible shoulder away from that resource. Keep the resource visually separate from scenery with an ordinary dry approach of at least about 2.2 m and room for the Explorer's swing. Preserve the clear onward approach toward the crystal at (29,0,18). No deletion, merger into rock scenery, resource relocation or changed reward is implied by the reference.
3. **Keep native entry and the side return open.** Preserve run spawn (19,0.5819,11), the approach between existing monoliths at (18,0.477,10) and (28,0.5274,7), and the side route used to view/extract at the receiver. The rear-left mass must not dam the shoreline path into a new dead end or place a vertical face under the spawn.
4. **Make elevation and collision truthful.** Use shallow continuous ground blending into the unchanged supported anchors; no painted implied steps over a tall invisible box. Give each outcrop a closed irregular volume with a buried base and broad edge changes. If any low toe looks walkable, it must provide physical support or be shaped clearly as steep rock. Keep gaps too broad to trap feet; avoid thin fissures, open backs and repeated stair slabs.
5. **Keep gravel on the actual terrain.** Author ground color/mesh or sample the real tessellated support surface. Do not repeat the foundry's flat shoulder ribbon over analytic terrain, which z-fought. Scatter small nonblocking detail mainly on route edges; keep the center legible at 844×390. Fronds must read as folded alien growth, not opaque shrubs screening the Explorer or a new harvestable.

## Scope and acceptance

HUD, player, receiver and waypoint differences introduced by generation are excluded. The far bank, circular pond, other structures and uniform old background boundary are retained incidental context, **not endorsed** by this review. This target does not close the wider Shatterfen composition HOLD.

Implementation must later show the matched normal camera plus opposite/side approaches, visible harvest and crystal access, correct dry footing and foreground occlusion. Target approval is not collision proof. **Keep this accepted target unchanged if a model iteration fails**; revise the implementation against it and record the miss rather than lowering or replacing the target to match the result.
