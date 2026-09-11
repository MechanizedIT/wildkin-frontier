# Physical inventory target V3 — independent fitness

**PASS — 8.2/10 for composition direction, with the explicit 48 px implementation contract below.** No further generated target is needed for small button-border differences. This is reference admission, not a claim that the PNG proves DOM hit areas or that inventory runtime is converted.

Personally inspected target.png, prompt.txt and PROVENANCE against the actual current inventory baseline and held V1 reviewed earlier. Verified target SHA256 `5ed2a670fa732ba308f6fb394fe144af1c2157f86e68329db92c781bb62c9f5e`. V3's three visible rows materially free vertical room; this is a useful change rather than a rescaled copy of the four-row layout. Capacities and quantities remain provisional.

At approximately 1844×853 → 844×390 scaling, rows are roughly 64–66 CSS px tall, the fixed footer area approximately 54–55 px, and the close area approximately 48 px. Painted footer buttons are approximately 42–44 px high. Their containing band has room for real 48 px buttons without overlap; increase their painted/control height in implementation rather than reproducing the undersized painted inset exactly. The final layout must measure every actionable cell, Close, Transfer, Split and Sort at **at least 48 CSS px**, within the viewport/safe areas. A raster is not that measurement.

The two physical container names/capacities are clear, selected Wood has a readable count, “To Pod Locker” identifies the destination, and “Sort Pack” identifies scope. Eight occupied pack stacks agree with 8/16, and ten locker stacks agree with 10/24. Empty visible cells make capacity understandable; the remaining rows can scroll independently while selection/actions stay fixed. Shorter three-row grids are a sensible mobile tradeoff.

Implementation provisions:

- Use actual slot counts and scroll geometry. The drawn scrollbar thumb lengths are illustrative and do not accurately establish how many rows are hidden. Pack has four total rows and locker six at four columns; do not copy the tiny raster thumb proportions.
- Change destination/sort scope and selected quantity text with the actual selected container. Give each item a readable selected name and accessible label. Preserve mouse drag, tap-to-select/transfer and keyboard alternatives; split uses the planned quantity control.
- Use existing correct game item icons. The pictured hook on the berry lure is an image-generation artifact, **not** approved equipment or a fishing requirement. The food bag, flowers, purple crystal and container pictograms likewise receive no independent asset admission from this board.
- Empty slots should remain ordinary available destinations. Prefer blank cells or restrained feedback; the generated plus signs must not imply buying slots or invent another action. Locked upgrade capacity needs a separate truthful treatment if shown later.
- Portrait still needs its planned one-container-at-a-time fallback. This landscape image does not prove it, nor does it prove drag cancellation, scrolling, save ownership, pauses or failed transactions.

The navy/teal/ivory/amber family, large silhouettes, explicit container relationship and fixed selected-item actions are appropriate and achievable with the existing vanilla UI. Proceed to implementation/native proof using these proportions and corrected control heights; retain this target if the first implementation fails rather than changing the visual goal to match it.
