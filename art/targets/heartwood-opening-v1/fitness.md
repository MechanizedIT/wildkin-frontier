# Heartwood target fitness

**Verdict: PASS — 8.3/10 target fitness.** This is a useful, attainable composition target for the authored north Camp clearing, not implementation admission.

The target's strongest usable idea is the portrait-depth rhythm: four asymmetrical canopy masses frame an open central walk, while reeds, lilies, cloudflowers, mushrooms, and pebbles form irregular side clusters rather than a decorated corridor. Native R2 already establishes that structure with the admitted four trees and 16 low props. The supplied footprint proof also supports a comfortable clear route, grounded placement, Camp containment, and honest trunk collision. Modest reuse, rotation, and scale variation of those same models can push the native scene toward the target without new assets.

Use the target for **grouping, negative space, depth layering, and canopy framing only**. The actual runtime remains authoritative for:

- HUD layout, typography, icons, minimap, joystick, buttons, and inventory bar; imagegen changed their proportions and detail.
- Avatar silhouette, clothing, backpack, axe, scale, pose, and shadow; imagegen altered the model geometry and rendering.
- Tree trunk, branch, crown, leaf, flower, reed, lily, mushroom, and pebble geometry. Do not reproduce invented broadleaf shrubs, extra ground sprigs, denser leaf counts, white flower forms, or trunk/branch shapes that are absent from the canonical kit.
- Terrain color/texture, lighting, shadows, camera, and atmospheric finish. The real default portrait camera is 36 degrees at 11.591 m, positioned at `(0, -32.857)`; do not redesign it to match generated perspective or coverage.

The main risk is reading the generated density literally. Its lushness depends partly on invented foliage and enlarged model detail. Preserve R2's 20 canonical instances as the honest base; any modest repeated low-prop dressing should remain visibly the existing kit, keep the central route open, stay within the north clearing, and be judged in native play for clutter, occlusion, and draw cost. The stated native R2 cost (~63 draws, 250,921 triangles) is plausible for this target, but the image itself does not prove performance or traversal.

Evidence reviewed at 450×900:

- `target-candidate.png` — SHA256 `C14222E25D301FBBE2C92567FB629EC02637B4D6E382231107817F69D7B721DC`
- `blockout-r2.png` — SHA256 `922461EDB4AC7EFF3FF287174D8E2AD0436D6A16267555367B1A085A8437BFC8`
- `hero-current-baseline.png` — SHA256 `627CDF9CAC331735FE03ABF57F7EA808C8B289628CA1CBF51955546D090CDB90`
- `blockout-support.md` and `blockout-specs.json` — 20-instance R2 fixture (4 trees + 16 low props)

Admission still requires a same-camera native implementation capture plus ordinary center-walk proof; this review approves only the target's fitness.
