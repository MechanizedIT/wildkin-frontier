# Cinderjaw rotation 1 — independent anatomy-plan review

## Decision: HOLD before builder

The JSON hash matches the frozen input:
`00c2e817aa240f70d54dce0c67b186b29e0debdd045c94a8653f3f411cf3d692`.

The scope, native coordinate convention, four 24-vertex bent limb lofts, twelve six-vertex plates, baseline envelope, plate ray evidence, no-horn constraint, and closed-topology recipe are otherwise suitable. The plate plan is particularly concrete: each base has five torso probes and is set 0.035m inside those recorded skin heights, with restrained apex clearance. It can support the required seated-plate review.

The limb plan has a material attachment contradiction and therefore cannot proceed. Its literal upper rings are horizontal at Y=.51 for both front legs and Y=.44 for both rear legs. Yet the plan's own `upperSkin` measurements at the same centre X/Z positions are Y=.798–.803 (front) and Y=.648–.660 (rear). A horizontal upper ring at those lower values cannot enter the retained torso; it leaves about .29m/.21m of vertical separation at the stated centre probe before even considering the ring perimeter. The claimed upper-cap torso overlap is thus not supported by the frozen arrays. Closing an isolated limb is insufficient for a planted attached leg.

## Required focused correction

Revise and rehash the JSON before construction. Replace each upper-leg end ring with literal vertices derived from actual retained-torso ray hits over its complete attachment footprint, not just one centre value. Each vertex must be placed a declared small distance inside its local measured surface; store hit point, normal, and signed burial for all eight vertices. Recompute the intermediate ring/tangent and complete envelope from the corrected arrays. Preserve the proposed ankle/claw overlap and low bent limb silhouette. Add a pre-render assertion that every upper-ring vertex has a valid torso hit and negative signed exterior clearance, alongside closure, volume, two-face-edge, bounds, and unchanged-component checks.

No builder should consume V1 until this one attachment correction is independently re-reviewed. This does not change the authorized four-leg/twelve-plate visual lane, collider, rusher behavior, or species identity.

## Correction after full shell audit

This V1 HOLD remains valid, but its stated reason is corrected. Comparing the cap Y to the torso's **top** surface alone cannot establish an underside attachment gap: a valid buried cap needs `bottomY < capY < topY`. The preserved full-shell audit (`art/reviews/cinderjaw/rotation-1/v1-upper-ring-volume.json`) shows the V1 cap centres could overlap the torso volume. The real V1 failure was incomplete full-footprint attachment: outer vertices missed the torso or fell outside thin local shell intervals. V2 must be judged against that full-footprint criterion.
