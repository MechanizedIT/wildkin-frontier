# Portrait exploration-view target fitness review

**Verdict: PASS — 8.7/10 target fitness.** The generated reference is feasible for the narrow camera/HUD production contract. It is closely derived from the actual native blockout, retains the existing player, companion, asset and control silhouettes, and asks for no new world art. This score admits the reference direction only; it does not admit Caldera visuals or change the prior R3 **3.8/10 HOLD**.

Evidence inspected at full resolution:

- Generated target: `target.png`, 841×1870, SHA-256 `c0ef59326c528c8d95672931ca9bf097239a26d71ab4b85e5f49d07ed3e573e7`.
- Actual feasible blockout: `native-blockout.png`, 309×686, SHA-256 `6e738d284af6d2f62cc9f4d20be020542ddedd2b222e285e0948ee820b6afa7c`.
- Grove baseline / wide siblings: 309×686, SHA-256 `b39b6a88efd8aedff5aaf64d47e2dae89d439dc75faafe34f637d9b187a8c6ba` / `ffb24908d40b82c8ccdf3cd606c901d86580c82473588d8122e8bd8388ae3ad1`.

| Criterion | Score | Judgment |
| --- | ---: | --- |
| Attainable framing | 3.0 / 3 | Major objects match the native blockout's screen regions: crystal left, iron right, Emberhorn ahead, both spire clusters, open route, explorer and companion. The 36° / 11.591m view is already demonstrated natively. |
| HUD and controls | 2.7 / 3 | Status, Field Plan, minimap, Pack, joystick, Dodge/Jump/Attack and five-slot hotbar keep their established silhouettes, scale and placement. The absent resource stack represents the intended expired portrait state, while current control density remains legible. |
| Existing-asset fidelity | 2.1 / 2.5 | The target preserves recognizable shipped silhouettes and does not introduce new content. Image-generation smoothing slightly reshapes facets, shadows and small details, so production should retain actual runtime assets rather than chase those pixels. |
| Cross-context scope fitness | 0.9 / 1.5 | Grove-wide shows the same view can reveal the grove gate/bench composition while keeping player and controls readable. Construction restoration, full-HUD pickup pulses, motion and physical-phone readability remain execution proof rather than target evidence. |
| **Total** | **8.7 / 10** | **PASS** (`fitness >= 8`). |

## Deviations and guardrails

- The target depicts the steady portrait state with resource/XP rows absent. Runtime pickup pulses must still appear for the contracted duration, preserve exact totals, and retain existing landscape positive-row behavior.
- The Field Plan still overlaps part of the distant left target band. The crystal remains substantially readable, but the target does not promise every distant object is continuously unobscured during motion.
- Emberhorn placement is a moving-actor snapshot, not a locked spawn pose or guarantee that warning/combat tells remain outside the HUD corridor.
- Generated lighting, edge smoothing, object scale nuances and faceting are illustrative artifacts. Existing runtime terrain, minerals, spires, creature, explorer and controls remain the implementation source of truth.
- Grove-wide confirms useful additional context, but the smaller on-screen explorer and interaction anchors still need native approach, gathering and readable prompt proof. The target does not authorize HUD resizing, world-art edits or a new camera mode.

The reference is suitably constrained for production: match its practical visibility and transient-HUD behavior using the existing presentation owners, then judge the actual runtime separately.
