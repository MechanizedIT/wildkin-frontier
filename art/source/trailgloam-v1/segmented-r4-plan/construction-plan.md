# Trailgloam segmented R4 construction plan

**Status:** proposed changed method, awaiting independent review. No Blender build, render, rig, export, runtime asset, or gameplay work is authorized by this plan. It replaces the closed R3 shell-port route with separate closed solids and deliberately covered overlaps.

## Evidence and scale

The source is the conditionally passed six-view sheet `../multiview/trailgloam-orthographic-v1.png`, SHA-256 `ba0b19c941f58b2468fb9aed3d62a995acedeb431fedd3e5932e5f1668da24a8`. It establishes a low teal saucer, forward wedge head, six grounded articulated chains, two thick amber folded fronds on distinct dark sockets, and a small amber shell seam. Hidden depth and joint mechanics remain proposed choices.

`parameters.json` is the operative input. The executed CPU receipt gives the complete proposed envelope: **2.14 X x 2.08 Y x 1.8025 Z m**, bounds `[-1.07,-1.08,0]` to `[1.07,1.00,1.78]`. This intentionally replaces the contradictory earlier 1.45 x 1.55 x 1.70 headline; no silent axis conversion applies. Z is up, head is -Y, and every hoof sole is Z=0.

## Part method

- Build a separately closed faceted shell, belly, and five-section head wedge. The head overlaps the shell by 0.10 m.
- Build six named chains (`LF/LM/LR/RF/RM/RR`). Every chain has separate capped coxa, upper, lower, dark six-sided knee/ankle cuffs, and a closed flattened hoof wedge. The literal four anchors and radii are in `parameters.json`.
- Use intentional covered overlaps: shell-to-coxa 0.075 m, coxa-to-upper 0.065 m, upper-to-lower 0.060 m, lower-to-hoof 0.055 m. Cuffs are 0.025 m prouder than the adjoining limb. They cover the overlaps in neutral views; they are not fake bridges, Boolean unions, shell ports, welds, or disconnected open tubes.
- Build two separate closed folded amber blade prisms from their own dark collars. Collar overlaps shell 0.075 m; blade base sits 0.065 m inside its collar. Each blade has a thick base, asymmetric broad middle, and closed pointed tip. No alpha cards, tubes, or third frond.

The method accepts visible, intentional intersection under opaque cuffs. It must not leave a gap visible around any joint. Components remain separate for the initial candidate so actual overlap/clearance can be audited without pretending one manifold shell proves attachment.

## Executed CPU proof

`analysis.py` loads the frozen JSON and records six chains, planted sole Z values, all link lengths, full envelope, overlap contract, and orthographic anchor/centerline proxies for front, rear, both sides, top, underside, and three-quarter. The receipt has six nonzero projected anchor paths in each named projection. This only proves that the planned anchor paths do not collapse to points; it does not claim six visible legs in front/rear, where the reference itself has occlusion. Side views must establish three visible chains on their respective side. This is **not** a mesh rasterizer or occlusion proof; matching Blender renders remain the final proof of visible legs and cuff coverage.

## Builder order and gates

1. Load JSON directly with UTF-8. Construct closed shell/head/belly, then each separately capped chain and hoof. Assert six names, all Z=0 soles, closed primitive status, measured head/shell and shell/coxa penetrations, and the computed envelope before adding fronds.
2. Add the six coxa/knee/ankle cuffs and test each specified overlap against both adjoining solids. A covered overlap must penetrate by at least the frozen value; an exposed gap is a pre-render HOLD.
3. Add both collar/blade sets. Inspect blade base depth inside each collar and collar overlap into the shell. Preserve a visible socket separation.
4. Before studio rendering, audit every object is closed, finite, has outward normals, and has no unintended leg-to-leg or frond-to-frond contact. Intended cuff overlaps are recorded as exempt pairs, never hidden from the receipt.
5. Render front/rear/left/right/top/underside/three-quarter plus 96 and 48 px. The reviewer must see three chains per side, six grounded feet from underside, visible cuff coverage, a forward head, and two thick folded fronds. If a leg is only numerically present but hidden by shell/another leg in its matching view, HOLD.

## Limits

This plan does not recover exact back-side depth, authorize a one-piece shell, prove locomotion, collider fit, materials, export, or runtime admission. It preserves the R3 terminal HOLD as historical evidence; this is a new method needing independent plan review before any counted construction.
