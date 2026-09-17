# Sunscar Desert — R2 destination pocket-lip plan

## Decision and scope

This is a **native-preview candidate only**, following the cleanup-only R1 HOLD. The held weathered-rib asset remains closed: no fourth asset, substitute boulder, new prop family, source edit, or new gameplay is proposed.

The selected destination camera looks northwest from the retained crystal. The only candidate is a compact terrain lip in that forward-left pocket. It is intended to give the crystal one readable outer edge and a return-side shadow line without filling the central lane. The plan contains no stone placement: an existing-stone foot is permitted only after full native mesh/support/projection proof, and none currently has that proof.

## Rejected numerical attempts

Two attempts are retained as evidence rather than silently overwritten:

- [Unmasked starting hypothesis](../../../art/reviews/sunscar-desert/rotation-1/pocket-lip-probes-hypothesis-held.json): center `(-1944,79)`, `rx=4`, `rz=6`, `h=1.35`; its body enters the `f1:r:-39:1:6` fiber’s full 0.55 m footprint plus 3.2 m approach disc.
- [Masked attempt](../../../art/reviews/sunscar-desert/rotation-1/pocket-lip-probes-masked-held.json): preserves that disc but introduces a narrow 1.0322 local slope at the mask transition. It is not an implementation candidate.

## Candidate profile

The candidate moves the raw footprint **1 m west** to clear the existing fiber approach without a notch:

```text
center = (-1945, 79)
rx = 4 m; rz = 6 m; full footprint = 8 × 12 m
q = ((x + 1945) / 4)^2 + ((z - 79) / 6)^2
delta = 1.35 × smoothstep(1 - q), for q < 1; otherwise 0
smoothstep(t) = clamp(t, 0, 1)^2 × (3 - 2 × clamp(t, 0, 1))
finalHeight = current sampleFrontierHeight(x, z) + delta
```

The candidate changes terrain Y only. It must not flatten terrain, recolor the basin, edit ecology/wildlife/scenery records, or create a new sampler recursion. Its 2 m source grid has 20 nonzero samples; peak sampled delta is 1.319 m and the peak 0.25 m differential planned slope is 0.7464. That steepest edge is outside the clear lane, but makes the candidate **HOLD pending native preview**: reject it if it reads as a berm or route obstruction rather than a shallow pocket lip. Do not enlarge it or restart the asset loop.

## Fixed preservation proof

The full final ordinary-route polyline is the 16-point route in [final-route-plan.json](../../../art/reviews/sunscar-desert/rotation-1/final-route-plan.json). The lip’s nearest nonzero 2 m grid sample is 3.4257 m from that route; the protected route corridor is 1.2 m. No 2 m corridor sample has nonzero delta.

The affected-sampler window is x `[-1960,-1924]`, z `[63,98]`. It contains 13 current forage records, zero wildlife homes, and 12 current scenery records. The complete audit records their existing IDs, coordinates, current asset IDs/scales, body/approach distances, and projected terrain delta:

- 7 source records are within 15 m of the lip; all seven retain a zero height delta across their full footprint-plus-3.2 m approach discs.
- The nearest source is fiber `f1:r:-39:1:6` at `(-1937.605,83.725)`. The west shift leaves it outside the lip and preserves its 3.75 m protected radius.
- The retained crystal `f1:r:-39:1:4` at `(-1934.068,87.216)` retains its 1.3 m footprint plus 3.2 m approach disc with zero delta.
- Three nearby scenery records remain at zero terrain delta; no scenery center lies in the candidate lip.
- The Emberhorn home at `(-1930.5,27.8)` remains far outside the affected window. Its current full movement disk must still be included in the future whole-route parity check; this numerical candidate does not approach or modify it.

See [pocket-lip-probes.json](../../../art/reviews/sunscar-desert/rotation-1/pocket-lip-probes.json) for every sampled grid point and audit record. The probe is read-only source analysis, not support, traversal, collision, or visual proof.

## Native-preview gate

Root may preview only this precise candidate from the frozen destination pose, then inspect matching arrival, interior, destination, and overhead views. Source work remains blocked until it demonstrates all of the following:

1. the lip reads in the destination portrait without moving the crystal or closing the center/return lane;
2. exact current source IDs/transforms, source approach discs, Emberhorn home disk, route corridor, and all affected scenery rows remain unchanged or deliberately parity-proven;
3. actual mesh support and ordinary movement hold through the full final route; and
4. a separate full transformed mesh projection approves any future existing-stone foot.

If the native frame is still vacant or the compact lip looks like a bump rather than a pocket edge, retain the R2 HOLD and close this Sunscar visit.
