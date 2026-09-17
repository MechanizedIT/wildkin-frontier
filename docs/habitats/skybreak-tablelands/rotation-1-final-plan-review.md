# Skybreak Tablelands rotation 1 — final pre-source review

**Decision: PASS for one bounded source structural pass, with exactly one embedded cap-face buttress.** The revised plan correctly rejects free-standing use: the grid found no transform that both meets the ordinary full-planform support rule and contributes substantially to the useful crown frame. Reusing the accepted buttress as a shallow embedded face through the existing streamed landform seam is credible, provided it stays an attachment and does not weaken the free-standing rule.

## Actual preview judgment

`embedded-preview-crown.png` shows attachment A at `(20,-226)`, yaw `.40`, scale `.65` emerging as a useful left rock-face interruption. It improves the otherwise plain crown without blocking Mossling, flowers, crystal, or the visible open centre. It is a modest improvement, not a match for the selected target's richer irregular rim.

Attachment B at `(28,-220)` is heavily terrain-occluded in that same native preview despite its projected bounds. **Reject B from this pass.** Arrival, ascent, and return previews show no compensating useful read, so it cannot be retained as an offscreen count claim. Deferred terrain bands, broad outcrop assets, and any extra cliff instance remain outside this pass.

## Exact source boundary and proof still required

- Add only A in the dedicated Skybreak branch of `frontierLandformVisual.js`, resident chunk `(0,-5)` with origin `(0,-250)`. Preserve Terrace behavior and leave generic scenery, terrain-profile ownership, staged ecology identities/counts, and all caps unchanged.
- Use the approved model/hull transform verbatim: `x=20`, `z=-226`, `yaw=.40`, `scale=.65`, `baseX=19.3369`, `baseZ=-224.9900`, and `baseY=getHeight(baseX, baseZ)` (the captured baseline value was `32.9185`). Apply that exact transform/base once to both external model and convex hull; publish one stable resident surface ID and dispose/remove it with the resident.
- Treat this as an embedded rock face only. It is not an ordinary supported scenery placement and cannot establish a new standing surface, shortcut, or changed route clearance. The later runtime proof must check actual player contact, no unintended step/seam, chunk add/remove without leaked or duplicate hulls, and unchanged six Terrace instances.
- After the source pass, re-prove the complete route/home/resource/flower/return-stone protections and capture the four fixed poses. The current preview is diagnostic only; it does not prove physics, route, reload, performance, or visual admission.

The selected target still supplies direction for later iterations: its denser broken rim and geology are not silently satisfied by one embedded asset. This pass has one clearly bounded perceptual contribution and retains the target gap honestly.
