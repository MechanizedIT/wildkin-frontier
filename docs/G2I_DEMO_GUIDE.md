# G2i evaluation demo — browser-first five-minute Loom

Presentation only. Wildkin remains stopped at **U4FC1_RENDER_SOURCE_HOLD**. No gameplay balance, feature acceptance or R&D evidence changes.

## Setup

1. Run `powershell -ExecutionPolicy Bypass -File tools/demo/start-g2i-demo.ps1` from the repository. It starts the existing dev server and opens **http://127.0.0.1:8080/?g2i=1**. Keep the terminal open; Ctrl+C stops its owned server. A reused server must be stopped in its original terminal; the helper prints a fallback stop command when it owns the server.
2. Use a desktop browser at least 900 pixels wide, ideally 1600 × 900 or 1920 × 1080. The right panel is desktop-only; the disposable save isolation stays active even if you resize narrower. Scroll the panel for the full note. Prepare an ordinary tab at **http://127.0.0.1:8080/** for the introduction; choose Continue / Enter Frontier. Ordinary play uses your real save.
3. Keep `docs/PLAYTEST_NOTES.md` and `docs/FIRST_TAMING_REVIEW.md` ready in the source editor; enlarge its text. Optionally keep `docs/prompts/UNITY_06D_LOCAL_HIGH_RES_MATTER_DOMAIN.md` ready as a bounded implementation contract.
4. For the brief technical segment, open `native/unity/WildkinUnity`, then **Wildkin > G2i Demo Console**. Leave Play Mode off. Its five existing chapters remain available; chapters 2–5 are supporting evidence. If Unity's Firewall dialog appears, Cancel it for this local demonstration. Start Loom yourself after rehearsing.

## Exact scenario controls

The panel says **DEMO / EVALUATION SETUP — production mechanics**. Click a scenario or **Reset Scenario** for a fresh page with the same starting fixtures. Player placement, the extra encounter and one taming lure are disclosed presentation setup. Real AI, health, tool hits, inventory transactions and taming timing remain active. These are repeatable starts, not deterministic recordings of all later AI movement. Neither demo saves nor demo settings write to ordinary storage; save import/export is refused.

- **1 — Combat + Harvest:** immediately watch the gray rock in front of the player and the approaching red hostile. Auto Harvest starts ON; the real rock loses chunks while combat is engaged. Hold **F** for manual tool swings: valid resources and creatures in the swing arc can both be hit. **R** dodges; **WASD** moves. Click Reset before each take; the hostile can hurt/defeat you if you stand idle. The historical note describes the earlier suppressed-harvest rule; there is no simulated old build or fabricated before/after.
- **2 — Dodge Evaluation:** **WASD** moves, **Shift + WASD** runs, **Space** jumps, **R** dodges. Press R again during cooldown, then after cooldown; repeat in several directions. The panel shows the real controller state, dodge entries and cooldown. Separately ask whether the response, motion readability and usefulness feel right. Describe only what you actually observe; a technical check does not establish human acceptance. Reset after defeat or before a clean take.
- **3 — Starter Taming (optional):** reset, click bottom quick **slot 3 / Berry lure** (or press **3**), then **F / PLACE LURE**. Hold **S** to back away until **GIVE SPACE** becomes **LET IT APPROACH**, then stop. Wait for **LET IT FEED**, then **BOND**. Hold **C + W** briefly to approach gently, stop near Mossling, then click the world **BOND** button (or F). If the approach instruction still asks for space, back away farther; a short tap is insufficient. Do not rush, attack or claim the setup lure was earned. The result is a real unsecured expedition bond, not a Camp-secured companion. Reset discards it. Skip this segment if your rehearsal does not complete comfortably within its 40-second slot.

## Recording sequence

| Time | Show / action | One talking point |
| --- | --- | --- |
| 0:00–0:30 | Ordinary tab: move through Wildkin | “This is an actual game with exploration, gathering and creature interactions, so I evaluate how systems work together in play.” |
| 0:30–1:45 | Lab **1 — Combat + Harvest**; reset, watch auto hits, hold F | “An earlier implementation suppressed gathering during combat. Human playtesting exposed the interruption, so the requirement changed to keep harvesting available and use the physical swing arc.” |
| 1:45–2:45 | **2 — Dodge Evaluation**; run, jump, repeat R and change direction | “Input, state and cooldown can work correctly while player feel still needs review. I observe the current implementation before defining follow-up work.” |
| 2:45–3:30 | `PLAYTEST_NOTES.md`: find **do not suppress auto-harvest** in the August 21 Phase 3 correction; optionally show the U4D prompt | “I turn an observation into a bounded requirement, acceptance criteria and a reproducible check. The agent implements; I retain responsibility for acceptance.” |
| 3:30–4:10 | Optional **3 — Starter Taming**; lure → give space → feed → quiet bond | “The documented 6.8 m detection versus 6 m offer gap was a usability problem found in play. The starter offer moved to 7.5 m as provisional tuning, not a new acceptance claim.” |
| 4:10–4:35 | Unity console chapter **2 — Unity Native Matter**: Focus 0.125 m Domain → Carve Hero → Open Relevant C# | “I also work hands-on with Unity/C# and test engine systems; this is supporting technical evidence.” |
| 4:35–5:00 | Return to browser and the evaluation card | “I use AI for implementation, test the result as a player, explain failures precisely, and keep technical evidence separate from quality decisions.” |

Pause a beat after bonding so the live panel refreshes. If taming is slow, spend its slot showing the historical review and your specific follow-up format: **setup → action → observed result → intended result → bounded change → repeatable validation**. Do not invent a criticism of dodge to fill time.

## Supporting Unity material and validation limits

The preserved console sequence is **1 — Wildkin Frontier → 2 — Unity Native Matter → 3 — How I Direct AI Work → 4 — Evaluation: Passing Tests Isn't Enough → 5 — AI Asset Pipeline: Stop Bad Output Early**. Chapter 1 now opens the Gameplay Evaluation Lab. U4D remains a bounded PASS; U4E hero 7004 and weak 7019 remain technically valid formations with visual HOLD. G1/C1 images and reviews retain their original statuses. None is new acceptance from this presentation pass.

The original console's six focused EditMode tests and zero-error compilation were verified in commit `732b998`. Its five chapter handlers, transient matter/formation previews and three images were inspected then; physical native button/external-editor opening rehearsal remained manual because of the Firewall modal. This browser-focused pass does not claim a new Unity compilation when no connected Pipeline Editor is available. Do the short Focus/Carve/C# rehearsal before recording. Do not save transient demo scenes; console outputs remain in `Library/WildkinG2IDemo/`.

Browser validation uses six focused lab tests plus relevant combat, harvest, taming and scout regression tests. With the server running, `node tools/demo/rehearse-g2i-demo.mjs` drives actual browser buttons/keys in an isolated context and writes disposable screenshots/results under `native/unity/WildkinUnity/Library/WildkinG2IDemo/browser/`. It checks engaged harvesting, manual resource/creature hits, fresh reset, repeated dodge/run/jump, real taming, blocked demo export, unchanged ordinary saves/settings and ordinary play without the panel. Optional taming failures are recorded as SKIP, not acceptance. Automated native inputs verify mechanics; Chris must still review feel and rehearse the spoken take.
