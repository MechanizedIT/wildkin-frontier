# Portrait exploration HUD audit

Read-only source audit at `main e66c718`, September 13, 2026. Native rectangle and perceptual evidence remain root-owned.

## Proven current ownership

- `combatHud.js` owns health and secured-level progress. Portrait layout in `styles/portrait.css` makes it a permanent `154px` upper-left card.
- `frontierMap.js` owns the live personal-survey minimap/button and full atlas. Portrait CSS currently makes the button `92×92px`; opening it, fog state, player/Camp markers and survey data do not need to change for decluttering.
- `runInventoryHud.js` owns presentation of carried resource and unsecured-XP counts; `pickupSystem` / progress remain authoritative. Every positive row is persistent. Portrait clips the upper-right stack to `136px`, so a larger earned pack can occupy several rows while still omitting later rows from view. The Pack badge already exposes total carried item count and the Pack opens exact contents.
- `betaShell.js` owns the field-plan button, five-slot equipment belt, Pack button, companion ability and attack/dodge/jump controls. `contextualInteraction` replaces only the main field-tool button when a nearby primary action is actionable. These control/state contracts are already useful and should remain intact.
- `baseSystem.js` owns the `base-building` class and placement lifecycle. `styles/base.css` hides the beta HUD/touch movement during placement, but combat, minimap and carried-resource surfaces sit outside `.beta-hud` and remain visible behind the placement caption/tools.
- `contextualInteraction.js` and `frontierIndicators.js` derive safe areas from actual visible HUD rectangles. They already ignore hidden/display-none/near-transparent elements and invalidate on blocking/layout changes; no new safe-area registry is needed.
- Landscape is a real sibling: `styles/beta.css` and its landscape media rules own the wider layout. `styles/portrait.css` is loaded last and is entirely portrait-scoped.

## Smallest useful production slice

Use the existing surfaces and controls; reduce only persistent portrait chrome.

1. In `runInventoryHud.js`, mark a row temporarily recent from the existing `pulse(resourceId)` path, clear that marker after roughly two seconds, and clear its timer on destroy. In the portrait stylesheet, display only recent rows; in landscape keep the current persistent positive rows. The Pack badge remains the persistent cargo summary and Pack remains the exact inventory. Initial load, crafting/spending and extraction should not flash old counts. This adds presentation state only; resource and XP values remain owned by their current systems and no frame loop is added.
2. In `styles/portrait.css`, reduce the atlas button from `92px` to about `64–68px` while retaining at least a 48px touch target, reduce the combat card to about `132–138px`, and omit the nonurgent numeric XP fraction while retaining level, XP bar, full health text and danger color. Keep the field plan as the one readable two-line navigation cue. Do not move or shrink the bottom five-slot belt, nearby contextual action, attack, dodge, jump or ready companion ability in this pass.
3. In `styles/base.css`, extend the existing `.base-building` visibility rule to combat HUD, carried-resource stack, atlas button, fullscreen control and indicators. The placement caption, supported preview, PLACE/CANCEL controls and construction camera remain visible. Removing `base-building` restores the same HUD automatically. Apply this focused placement rule to both orientations; do not change the landscape field layout.

This scope removes the largest upper-right occlusion during ordinary travel, preserves health and direction, and gives Camp placement a clean construction view without changing gameplay state, input dispatch, atlas disclosure, objective priority, inventory capacity or construction rules.

## Exact files and proof

Production owners: `src/ui/runInventoryHud.js`, `styles/portrait.css`, and `styles/base.css`. No change is needed in `main.js`, `createBetaGame.js`, `betaShell.js`, `frontierMap.js`, combat, equipment, contextual selection, safe-area logic or persistence.

Focused proof should cover:

- Resource update alone retains correct hidden row counts; a pickup pulse reveals only that nonzero row, a second pulse refreshes its expiry, expiry hides it, and destroy clears pending timers. XP uses the same path. Landscape rows remain persistent through computed-style/native layout evidence.
- Portrait at the smallest supported width keeps the atlas target at least 48px, health fully readable, field plan unobscured, five hotbar slots visible, and all primary/dodge/jump/context buttons within safe-area insets.
- Entering placement hides nonconstruction chrome and indicators but retains caption, valid/invalid preview, PLACE and CANCEL. Cancel, successful placement and leaving Camp restore HUD visibility with no stuck `gameplay-blocked` or `base-building` state.
- Landscape before/after rectangles remain equal except for the intentional placement-only hiding rule. Existing purpose precedence, contextual replacement, inventory counts and construction activation tests stay unchanged.

## Regression risks

1. A row-expiry timer can hide a newer pulse if an older timer is not cancelled per row. Store one timer per row and cancel it before scheduling the next.
2. CSS cascade is unusually layered: `frontierMap.js` injects `!important` map/HUD rules at runtime. Keep portrait overrides under the existing `#app` portrait selectors and verify computed rectangles, not stylesheet text.
3. Hiding construction chrome changes the obstacle rectangles used by contextual indicators. Placement already blocks ordinary interaction; verify restoration after every placement exit so indicators do not retain stale bounds.
