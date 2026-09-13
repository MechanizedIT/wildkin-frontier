# Portrait exploration-view blockout audit

**Feasibility verdict: advance the wide `36° / 1.25` view for a separately scoped native camera/HUD trial.** It is the only supplied Caldera blockout that puts the crystal, iron and Emberhorn in view together while keeping the explorer, companion, joystick and action controls recognizable. This is a view-feasibility result only; it gives no credit for terrain quality and does not alter the R3 visual HOLD.

All five 309×686 source blockouts were inspected at full resolution. Baseline is `42° / userZoom 1`, the middle candidate is `38° / 1`, and wide is `36° / 1.25`; all retain FOV 52 and portrait zoom 1.2.

| View | Exploration visibility | Player and controls | Judgment |
| --- | --- | --- | --- |
| Camp baseline | The gate and workbench edge are visible, but the view spends more height on near ground and crops more of Camp. | Explorer and controls are largest and clearest. | Readability baseline. |
| Camp wide | Shows the full gate, more of the workbench, both path edges and more surrounding Camp context. | Explorer is materially smaller but still identifiable; fixed touch controls remain unchanged and clear. | Supports feasibility, with native interaction testing required. |
| Caldera baseline | Crystal, iron and Emberhorn are outside the useful frame; only the cropped left cluster hints at a destination. | Best explorer scale. | Fails the exploration-target goal. |
| Caldera 38 | Begins to reveal the crystal, Emberhorn and right cluster, but important forms remain clipped against the top/UI band and iron is not readable. | Explorer remains comfortably readable. | Better compromise, still insufficient target disclosure. |
| Caldera wide | Crystal, iron, Emberhorn and both edge clusters are simultaneously recognizable, with open route space retained. | Explorer and companion remain readable; controls keep their baseline size and placement. | Strongest candidate for the stated goal. |

## Concrete hazards to resolve in a native trial

- Caldera-wide alone hides the right resource stack with diagnostic CSS. Restoring the real stack will cover part of the right-side target band, especially the right spire/approach, so this screenshot overstates usable visibility on that side. Pack count correctness does not remove the occlusion risk.
- The wide view reduces the explorer and nearby build/interact anchors by roughly a fifth to a quarter on screen. Character identity survives in these stills, but tap targeting, pickup prompts, construction placement and readable creature tells need device-scale proof.
- The Emberhorn sits close to the top HUD corridor. Forward movement could send it behind the Field Plan or minimap before the encounter is comfortably read; HUD-safe target placement or responsive HUD behavior needs checking in motion.
- The lower pitch and wider world coverage expose more distant content while giving less screen area to near-ground slope/contact cues. Traversal footing, resource approach distance and companion overlap cannot be established from these stills.
- Fixed controls remain legible, but they occupy the same large lower-screen footprint while the world shrinks. The resulting mismatch may make combat spacing feel farther away or less precise even though the buttons themselves are unchanged.

The structural opportunity is credible: the current portrait camera, more than missing target content, prevents an outing from advertising its next goals. The wide candidate is the right blockout to test next, provided the trial restores the complete HUD and checks Camp building, grove collection, combat telegraphs and target approach in motion before any camera decision is accepted.
