# Rootbound terrain-facet preview — visual placement

**Scope:** rendering-only A/B advice for a future private harness. No runtime,
terrain, collision, source, or browser change has been made. The harness path
`.dream-loop/rootbound-facets/index.html` remains untouched pending root
coordination.

## Fixed native destination frame

The authoritative checkpoint destination is player `(-449, 675)`, yaw `-2.3`,
portrait pitch `.62831853`, unit zoom, and a clear camera collision result;
see [checkpoint-captures.json](../checkpoint-captures.json). In
`createCameraFollow`, the horizontal viewing direction is the inverse of the
camera orbit offset:

```
forward = (-sin(yaw), -cos(yaw)) = (+.7457, +.6663)
screenRight = (forward.z, -forward.x) = (+.6663, -.7457)
```

That makes the visually useful floor a short forward/right band from the
explorer, rather than the rear `(-460,-450,682–690)` corner proposed earlier
for a physical terrain study. The retained
[final destination](../final-destination.png) makes the distinction clear:
the visible lower/midframe is the quiet floor leading from the explorer toward
the lantern objects; the rear corner is screened by the log, rings, thornstones,
and the portrait crop.

## Recommended preview patch

For a rendering-only A/B, use the **camera-right edge of the forward floor**,
not the player center and not a prop footprint. The compact trapezoid below is
expressed in world X/Z and lies two to roughly four-and-a-half metres forward
of the fixed player, one to two metres camera-right:

| Corner | Formula | World X/Z |
| --- | --- | --- |
| near-left | `P + 2F + 1R` | `(-446.84, 675.59)` |
| far-left | `P + 4.5F + 1R` | `(-444.98, 677.25)` |
| far-right | `P + 4.5F + 2R` | `(-444.31, 676.51)` |
| near-right | `P + 2F + 2R` | `(-446.18, 674.84)` |

It occupies a lower-to-midframe strip that can read as a gently crinkled
continuation of the open lane. It does not ask the preview to alter the player
standing point. The nearest curated forms are deliberately outside this small
preview field: log `(-444,678)`, rings `(-442,678)` and `(-444,681)`, and
thornstones `(-448,679)` and `(-446,679)` in
[src/world/frontierRootbound.js](../../../src/world/frontierRootbound.js).

The A/B should use the same existing 2m triangle cadence and flat-shaded
lighting. A useful test is a shallow, *coordinated* two-or-three-plane height
variation that fades at this trapezoid boundary, compared with the unmodified
floor. It should be visible as a low lighting change approaching the object
cluster, never as a new obstacle, pedestal, or noisy pixel-scale normal effect.

## Later implementation boundary

This is a screen-placement recommendation only. It does not prove the trapezoid
is physically safe for a real height change: the player corridor, full resource
and home support, curated hull contacts, and `sampleFrontierHeight`/render-mesh
agreement still need their own proof before any source edit. A normal-only A/B
would be presentation-only and cannot establish that contract. If a real
geometry pass uses a different bounded support-safe area, its native camera
projection must be rechecked rather than inheriting this preview patch.