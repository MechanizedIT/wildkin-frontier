# G2i evaluation demo — five-minute Loom

Presentation only. Wildkin remains stopped at **U4FC1_RENDER_SOURCE_HOLD**. Existing PASS/HOLD outcomes and their evidence are unchanged.

## Setup

1. From the repository, run `powershell -ExecutionPolicy Bypass -File tools/demo/start-g2i-demo.ps1`. Keep the terminal open; Ctrl+C stops its owned server. An existing Wildkin server is reused and stopped in its original terminal. The helper also prints a fallback stop command.
2. Open `native/unity/WildkinUnity` (Unity 6000.3.25f1 / HDRP).
3. Open **Wildkin > G2i Demo Console**. Leave Play Mode off. Give the console about 1200 × 780 logical pixels on a 1080p desktop (also fits common 125% scaling), or maximize it. Previous/Next and left/right arrows change chapters.
4. If Windows shows Unity's Firewall dialog, click **Cancel**; this local demo does not require incoming public/private network access. Rehearse once. Choose Continue or start a local browser game; scout uses WASD, Space/C up/down, Shift faster, and right-side drag to look. Keep the browser and source editor ready beside Unity. Start Loom yourself when ready.

## Recording sequence

| Time | Show / action | One talking point |
| --- | --- | --- |
| 0:00–0:30 | **1 — Wildkin Frontier**: browser scout and README | “This is a real exploration, creature-life and building project. The playable browser reference informs a PC-native Unity qualification.” |
| 0:30–1:20 | **2 — Unity Native Matter**: Overview → Focus 0.125 m Domain → Carve Hero → Move Hero → Save + Reload Hero; briefly Open Relevant C# | “The rock owns its local matter. Editing is regional, movement preserves that state, and reconstruction uses saved samples rather than the source mesh.” |
| 1:20–2:00 | **3 — How I Direct AI Work**: Open Spec; show question/scope, isolation, tests and PASS/HOLD criteria | “I define the contract and quality bar; the agent implements substantial code. Acceptance still requires testing and review.” |
| 2:00–3:35 | **4 — Evaluation: Passing Tests Isn't Enough**: U4D PASS evidence → U4E hero 7004 → known weak 7019 → graph/bounds toggles | “These formations satisfy structural checks, but several still look floating or separated. That visual requirement remains HOLD.” |
| 3:35–4:15 | Stay in chapter 4: Open U4E Review; optionally return to chapter 3 Open Evidence | “The decision is reproducible: pinned seeds, captures, metrics, automated results, standalone evidence and an independent review, with limits documented.” |
| 4:15–4:40 | **5 — AI Asset Pipeline: Stop Bad Output Early**: target → raw neutral capture → post-repair working capture | “Closed topology is insufficient. Striping, underside artifacts and changed plane hierarchy stopped admission before the voxel pipeline.” |
| 4:40–5:00 | Previous back to chapter 2, or browser/game | “I use AI as an implementation collaborator while retaining responsibility for technical direction, evaluation and the decision to accept or stop.” |

## Rehearsal and visible failure signs

- Chapter 2 opens an immediate Edit Mode preview: brown coarse world and two separate rocks. Focus should fill the view with the right-hand high-detail rock. Bounds should enclose independent domains. Carve makes a visible cavity; Move keeps the cavity and turns/translates the rock; Save + Reload keeps that edited pose and shape. Reset restores both original rocks. Missing rocks, pink surfaces, a disappearing cavity or changed neighboring terrain are failure signs.
- Chapter 4 opens hero 7004. Both it and weakest 7019 are committed technically accepted examples with a visual HOLD; the hero button does **not** mean visual PASS. Toggle overlays off before judging the separation. The current replay is presentation only; use the original review/captures for the historical decision.
- Chapter 5 must show all three images. The third is the rejected working shell, not an admitted render derivative. Use the C1 review for its underside diagnosis.
- The console opens the canonical scene and operates on disposable `DontSave` copies of its view and camera, leaving the authored components unchanged. Existing owner scenes remain open. Closing the console, entering Play Mode, or recompiling removes demo objects/textures and closes any scene opened by the console; reopen the tech chapter to rebuild. Do not save demo state. Temporary snapshots and server logs live under `Library/WildkinG2IDemo/`; no demo output goes into canonical evidence.
- Lights in other loaded scenes are temporarily paused while the demo is active, then restored on cleanup, to avoid HDRP's competing directional-shadow error. A dirty scene is conservatively left open rather than discarding possible owner edits. Close extra untouched tech tabs before recording if necessary.
- Documents open in the configured external source editor. Increase that editor's text zoom before recording. Open Relevant C# opens the existing view at initialization and pings the core MatterDomain file for a second optional tab.

## Bounded validation

Run the `Wildkin.Tests.Editor.Demo.WildkinG2IDemoTests` EditMode fixture through the existing Unity Pipeline test command. It checks catalog paths/order, editor-only assembly, safe temporary output, image decode/disposal, repeatable U4D reset/edit/move/reload/isolation, and the two U4E fixtures against committed source/domain/mesh hashes and repeat regeneration. Graph/formation hashes may differ from historical U4E after later fitter diagnostics; source and matter parity are the meaningful frozen content checks. Demo tooling does not claim new R&D acceptance or production readiness.

Preparation check: 6/6 focused tests passed and Unity compilation produced zero errors. All five chapters and matter/formation controls were stepped through the console handlers; live previews and all three decoded images were inspected. The Windows Firewall modal prevented a complete physical button rehearsal and confirmation of external document/C# opening. Finish that short rehearsal after dismissing it; a bulk external-editor validation request exceeded the tooling's five-second deadline. Browser startup, reuse, scout gameplay and server stop were exercised. Canonical scene/evidence files were unchanged.
