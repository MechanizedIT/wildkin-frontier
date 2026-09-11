# Immersive crafting reference candidates — September 11, 2026

Reference-author output only. Neither candidate is self-accepted. Root must independently inspect the actual images before assigning implementation. No runtime/schema/model edits, Blender, GPU inference, new dependencies or publication were performed.

## Deliverables

- `current-camp-844x390.png`: fresh actual game capture from localhost:8080, 844 by 390 CSS/device pixels, touch/mobile browser context. New local browser storage and Camp spawn; entered Frontier with ordinary UI. Capture script is `capture.mjs`. Captured September 11 during this reference task, not reused historical telemetry.
- `target-v1.png`: actual built-in image-generation edit, 1844 by 853 pixels (same ~2.162 landscape ratio). Use displayed at 844 by 390 for judging intended layout. Baseline path, pond, trees, gate and central Explorer are recognizably retained; stall replaced with Matter fabricator. Five quick slots plus Pack, joystick left, separate Attack/Dodge right, compact station recipe picker, visible physical tray output.
- `stations-v1.png`: one additional actual built-in generation. Salvage bench, Matter fabricator and Resonance workbench have distinct mechanisms and outputs, sharing a cream/slate faceted field-equipment identity. This board improves cutter readability over UI target v1.
- `prompt-ui-v1.txt` and `prompt-stations-v1.txt`: exact full prompts.
- `reference-explorer.png` and `reference-woodland.png`: retained copies of approved Explorer/style and owner woodland input images, respectively.

## Provenance

Installed Dream Loop Pro workflow was used (account tool reports Pro), limited to the independent reference-author role assigned by root. Installed imagegen skill used its default built-in tool. Backend/model identity is undisclosed by that tool; do not claim a named image model. Calls were serialized. No CLI fallback or paid API call.

UI generation inputs, in order: fresh actual Camp capture; approved Explorer at `C:/Users/cwood/AppData/Local/Temp/codex-clipboard-b2af57e4-f649-4d09-a1bb-73aae2fe6ca7.png`; owner woodland at `C:/Users/cwood/AppData/Local/Temp/codex-clipboard-3bfc973b-83ac-4662-84cd-0d0771f8a138.png`. All inspected before generation. Board inputs: UI target v1 and approved Explorer, both already inspected.

Original generated files retained under `C:/Users/cwood/.codex/generated_images/01a08f87-4bef-7293-9b2a-49f52a94564c/`: UI `exec-7a19624b-745b-4490-bede-6cd79f947b3c.png`; board `exec-7a1eabd8-54a6-4ced-8451-db0cff920cfc.png`. Project copies above are review artifacts. This directory is scratch reference evidence inside the existing ignored `.dream-loop` area; parent owns durable build-log/project records.

## Practical fit and author-observed caveats

- Layout has enough room for six ~50–54px slots at 844px and generous primary actions. Implementation must measure real CSS target boxes >=48px; a generated image is no proof of touch geometry. Recipe cards in v1 appear closer to ~45px at intended display scale and should become at least 48px with slightly wider picker. Keep each slot in its own frame with no outer nested container.
- Recipe picker should be anchored to station with projected-position edge/control avoidance. In v1 its right edge enters part of the nominal orbit region. Implementation should place above/left as needed and preserve a substantial free right-middle drag area, rather than hard-code the generated coordinates.
- UI target selected recipe icon is an axe variant, and tray item looks like a cyan double-ended axe; do not copy either as final powered-cutter anatomy. The station board supplies the stronger single-grip powered saw silhouette. Its hand grip, guard and actual action animation still need implementation and play review.
- The generated UI shows stone and leaf ingredient counts for a powered machine. They are layout examples only; actual authoritative recipes own ingredient IDs/costs, and iron/crystal progression must remain meaningful. The battery icon is a provisional recipe suggestion, not proof of a shipped item.
- Board hardware mostly has visible supports and useful purposes. Several amber strips/latches on fabricator sides and gantry are still overly decorative; omit those without a functional attachment reason. Vise crank and spool mount are purposeful. Do not add generated fasteners individually or reproduce tiny seams on mobile models.
- Resonance crystal is physically seated, prongs attached to base, tether attached to side hook. Avoid interpreting crystal as floating magic, portal or general-purpose altar. Its violet indicators are brighter/more numerous than requested; reduce to quiet unlit color/status slots in runtime. Matter board similarly uses more than one cyan slit.
- Board uses soft studio contact shading and modest surface gradients. Runtime must honor stronger matte/minimal-shading direction; this is silhouette/material-color guidance, not authorization for reflective materials, expensive lighting or ambient-occlusion passes.
- Output items beneath stations are separate explanatory asset silhouettes, not loose objects that should automatically be added around every world station. The UI berry/rope icons are provisional; actual alien food/lure identities should win.
- Current game capture still has terrestrial-looking dense grass/trees and gate ornamental tips. Target preserves those baseline features because this task is crafting/HUD; it does not accept them as final alien ecology art.

No approval score or implementation-complete claim is made. Next step is independent image review, then a separate implementer using reviewed shape/layout requirements and current authoritative equipment/crafting owners.

## Root-requested v2 correction

Root independently viewed v1 and requested a larger title/costs, >=48px recipe/Craft targets, less ambiguous taming gear and an uncounted blueprint. `prompt-ui-v2.txt` is the exact edit prompt and `target-v2.png` the result, same 1844x853 canvas. Source is `exec-d2afecde-dad7-4325-85c0-1fc7510c6e4a.png` in the generated directory above; input was target-v1 only. Actual built-in edit, serialized after station board.

V2 visibly improves recipe icon/cutter silhouette, recipe-card size, title, snare and uncounted blueprint. It still FAILED the explicit Craft height request: rendered button is roughly 54 image pixels / 2.185 = 25 CSS pixels tall, versus 48 minimum. The widget itself remains ~207x118 CSS rather than the requested 275x164. Do not mistake a precise prompt for precise output. Title is larger but should still be measured at actual phone size during implementation. Root must decide whether to request another target correction or accept the visual direction with mandatory code-measured >=48px controls. The snare icon became a toothed metal trap; current actual taming mechanism/asset identity should own its eventual depiction. It is not self-accepted.
