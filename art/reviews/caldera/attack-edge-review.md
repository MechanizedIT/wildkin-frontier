# Fixed-step attack edge review

**Verdict: root diagnosis confirmed.** The 80 ms manual F tap can be delivered to `fieldTool.update` on every fixed substep in the same render frame. This is sufficient to explain the crystal changing from four chunks to two.

## Cause

`main.js` correctly promotes the merged keyboard/touch `intent.attackRequested` edge into `pendingAttackLatch`, which lets a quick tap survive a render frame with zero physics steps. The fixed loop then derives `effectiveAttackRequested` from that unchanged global latch on every substep. The latch and both input adapters are consumed only after the complete fixed-step loop.

On the first eligible substep, Field Tool starts the requested swing. On the second substep of the same rendered frame, the same still-true edge arrives while the tool is busy; `fieldTool.update` records its supported one-entry `pendingTap`. That queued tap later starts a second swing after recovery. More substeps do not make more than one queued tap, but one physical input still becomes two impacts. The observed `4 → 2` remaining count matches this path.

## Smallest repair

Keep the render-to-fixed latch, but create a render-tick-local edge before the loop and clear that local edge at the first fixed substep:

```text
let attackEdgeForFixedStep = pendingAttackLatch;
while (fixed work remains) {
  const stepAttackRequested = attackEdgeForFixedStep;
  attackEdgeForFixedStep = false;
  ...
  const effectiveAttackRequested = equipmentInput.toolAllowed && stepAttackRequested && !blocked;
  fieldTool.update(... attackRequested: effectiveAttackRequested ...);
}
```

Leave the existing post-loop `pendingAttackLatch` and adapter consumption in place. A zero-substep render frame therefore retains the edge, while any later render frame with one to four fixed substeps presents it to at most the first substep. This changes no Field Tool buffering or cadence rule and needs no new input abstraction.

Keyboard, mouse, the HUD Field Tool button, and touch intent all converge on the merged edge. The HUD button calls `keyboardInput.triggerAttack()` and uses held state separately; direct touch intent has its own pending edge. Both pending flags remain latched across zero-substep frames and are consumed after the first stepped render frame. `attackHeld` remains a level signal on every substep, so an intentional hold may continue cadence-based attacks; it must not be folded into the one-shot edge.

## Meaningful regression

Replace the existing one-substep latch simulation with a catch-up case:

1. Queue one keyboard edge, run a zero-substep render frame, then a four-substep render frame (the configured maximum). Assert the Field Tool sees `attackRequested` as `[true, false, false, false]` and the source edge is consumed afterward.
2. Repeat through the HUD/touch start-and-release path and assert the same sequence with `attackHeld === false` after release.
3. In a focused Field Tool/resource integration witness with Auto disabled, advance long enough to pass swing impact and recovery. Assert one input reduces one four-chunk node to three, produces exactly one impact, and leaves `fieldTool.pendingTap === false`. A separate held-input case should retain the existing cadence behavior.

No source, test, browser, or Git change was made for this review.

## Implemented gate review

**PASS.** Root's implemented condition adds `substeps === 0` to `effectiveAttackRequested`. This is equivalent to the recommended tick-local one-shot gate for the current loop: `substeps` starts at zero for each render tick, increments after every fixed iteration, and cannot return to zero during that tick. A pending edge therefore reaches at most the first eligible `fieldTool.update`, while the unchanged post-loop logic still retains it when there were no fixed steps and consumes both keyboard and touch pending flags after a stepped frame.

Blocked modal/Author and resolved-expedition iterations still do not deliver the edge and retain their prior post-step discard behavior. Swimming and equipment-handled input still clear the latch before the loop. Keyboard, mouse, HUD-button and direct-touch edges all share the gated merged path. `effectiveAttackHeld` is unchanged and remains a level input across substeps, so intentional hold cadence is preserved without recreating the duplicate one-shot buffer.

The existing simulated latch test does not exercise a multi-substep frame, so it would not prove this defect. The planned native forced-80 ms quick-tap witness is meaningful if it confirms one crystal decrement and no delayed second swing; the normal held control should still produce cadence-spaced repeated swings. No additional implementation-mirroring test is required for this bounded repair.
