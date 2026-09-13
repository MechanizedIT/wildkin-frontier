# Independent portrait HUD source review

## Verdict: PASS

The frozen HUD change implements the scoped transient portrait rows without changing inventory or XP ownership.

- Resource collection calls `refreshCarriedResourceHud(inv)` before `inventoryHud.pulse(resId)`, so a newly nonzero row is unhidden before the pulse marks it recent. XP follows the same safe order: `inventoryHud.update(..., xp)` precedes `pulseXp()` when XP increases.
- A pulse is ignored for absent or zero/hidden rows. Updating a value to zero immediately clears its recency timer and class. Refreshing the same row cancels the prior expiry and starts one new 2.2-second expiry.
- Resource and XP rows share the same path. Counts remain sourced from the pickup inventory and `getCarriedXpViewModel`; the new state is presentation-only.
- The CSS rule is inside the portrait orientation query. It hides positive rows lacking `is-recent` only in portrait; existing `beta.css` flex presentation and `[hidden]` behavior continue to govern landscape and zero rows. The selector's `!important` is appropriately scoped and does not override the `[hidden]` zero-row rule in a harmful way.
- Floating-gain animation frames and timers, plus every row-expiry timer, are tracked by the HUD timing owner. `destroy()` cancels them and removes gain nodes before removing the container. Repeated refresh and zeroing do not leave stale row callbacks.
- Expedition reset updates rows to zero and XP reset cannot pulse because it is not an increase. Active-run restore can briefly pulse restored positive XP through the pre-existing `onXpChanged` increase rule; this is consistent with reusing the existing XP pulse and introduces no new saved state or callback owner.

The focused test exercises refreshed expiry, zero-value clearing, XP parity, pending-frame cancellation, destruction cleanup, and the portrait-only CSS selector. No additional repair is needed. No tests were rerun for this read-only review.

