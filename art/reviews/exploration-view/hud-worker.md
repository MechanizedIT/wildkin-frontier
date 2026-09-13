# Portrait carried-HUD worker receipt

September 13, 2026.

Portrait now shows a carried resource or unsecured-XP row only for 2.2 seconds after its existing pickup pulse. A second pulse refreshes that row's single expiry. A value becoming zero hides it and cancels its expiry immediately. Landscape keeps the established persistent positive rows because the visibility rule is scoped to `@media (orientation:portrait)`.

The pickup system and progression remain authoritative for exact counts. The existing callbacks update the resource/XP row before calling `pulse` (`refreshCarriedResourceHud` then resource pulse; XP update then XP pulse), so the first pickup into a formerly zero row is nonzero and reveals immediately. The Pack badge and Pack contents are unchanged. No atlas, health, objective, hotbar, action, construction or safe-area contract changed, and no animation loop was added.

`runInventoryHud` now owns and releases its short presentation callbacks. Gain expiry cancels a still-queued animation frame when a hidden page never presents it. Destroy cancels every pending row expiry, floating-gain removal timeout and queued gain animation frame, then removes any detached gain element and the HUD container.

Focused proof:

```powershell
node --test tests/runInventoryHud.test.js
```

Result: 1/1 pass. It covers initial positive counts without portrait recency, resource pulse/refresh/expiry, hidden-page gain-frame cancellation, immediate zero clearing, XP parity, callback cleanup on destroy, and the portrait-only CSS selector. The legacy one-shot frame check still sees exactly one `requestAnimationFrame` reference, and `git diff --check` reports no whitespace errors.

Native portrait visibility and landscape computed layout remain root-owned integration evidence.
