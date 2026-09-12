# Physical hotbar V1 reference

`target.png` is a single image-generation target for the existing mobile Backpack. It is an implementation board, not an admitted gameplay change or proof of DOM hit areas.

## Grounded baseline

`capture-current.mjs` used an isolated Playwright/Edge context at `http://localhost:8080`; it cannot read or write the user's save. It seeds the established V2 physical-inventory fixture, adds mixed carried items through `frontierProgress.collectResources`, and opens the actual Backpack panel. `capture-receipt.json` records the source fixture and final runtime state.

| Capture | SHA-256 | Observed contract |
| --- | --- | --- |
| `current-backpack-844x390-landscape.png` | `182869f1b4086e1147f71731f6d2db5b559c8ba9cbab3eb26eace8ddb1c8987` | 828×378 panel, 100×100 square cells, footer controls at least48px, no horizontal overflow. |
| `current-backpack-390x844-portrait.png` | `ff4b1b96af50ceb9eb7e293df5594407befbe673caa194293d7df8dee1df82da` | 374×828 panel, 77×77 square cells, one container, 48px footer controls, no horizontal overflow. |

`capture-current.mjs` SHA-256: `fc256533f693cc12b1371b40c65f963fa8b14ef3deec572baca58082551bf617`.

## Target provenance

- Generated once with the built-in OpenAI image generator from the landscape runtime capture on September 12, 2026. No reroll or image edit followed.
- Original generated file: `C:\Users\cwood\.codex\generated_images\01a09538-5ba8-74f3-95f8-cb40855dc616\exec-a96f6d45-47ab-410f-8236-b94260d54e00.png`.
- `target.png` SHA-256: `9dee5b0f24025e838478cdcef6d4687a98b7aa2d5554e411a0789dae0ae4233c`.
- Prompt: `prompt.txt`.

## Role and layout contract

1. Keep exactly five existing quick-slot references, rendered in one horizontal square strip in landscape. They do not hold stacks, consume no extra capacity, and do not create a second inventory.
2. Assignment is intentionally legible: select an actual carried stack, then tap a quick slot. The selected stack and selected quick slot use the current amber focus treatment.
3. Omni-tool and Construction tool are permanent availability references. They never become backpack stacks. Medicine, food and taming equipment retain their real carried-stack count and read zero when stored or spent.
4. Preserve the existing square four-column pack grid, tap/drag/split/sort behavior, bottom selected-item/actions band, and portrait one-container fallback. The target is a landscape composition; it does not replace the established portrait layout.
5. All actionable DOM controls, including quick slots and Close, must measure at least48 CSS pixels. The PNG cannot prove this.

| Targeted quick slot | Existing ID | Ownership |
| --- | --- | --- |
| 1 | `omni_tool` | Permanent rescue equipment; never an inventory stack. |
| 2 | `medkit` | Physical carried consumable; its badge reads the pack count. |
| 3 | `berry_lure` | Physical carried taming supply; the generated berry silhouette is not a different item. |
| 4 | `woven_snare` | Physical carried taming supply. |
| 5 | `build_tool` | Existing permanent Camp construction action; never an inventory stack. |

## Generated-image exclusions

- The orange plier-like object in slot1 is not an Omni-tool replacement. Use the current Omni icon.
- The hammer in slot5 is not a new weapon or construction item. Use the current Construction tool icon.
- The small gear/suit badges, simplified berry artwork, and any painted inventory icon treatment are visual shorthand only; they do not add items, recipes, equipment slots, crafting, or mechanics.
- The compact target grid depicts only occupied stacks and does not visibly show every empty/scrollable pack cell. Runtime must retain all16/20 actual slots, truthful count/capacity, scroll cues and empty destinations.
- Generated text is a layout cue. Preserve the exact current item names, accessibility labels and live count/destination copy in implementation; do not treat a raster typo or spacing as product copy.
